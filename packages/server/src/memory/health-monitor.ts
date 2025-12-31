/**
 * Memory Health Monitor
 *
 * Provides health metrics, storage usage, and recommendations for memory management.
 *
 * Requirements: 2.1 (storage metrics), 2.2 (counts by sector), 2.3 (counts by age),
 *               2.5 (forgetting candidates), 2.6 (recommendations), 2.7 (80% threshold)
 *               7.3 (progress reporting via Health API)
 */

import type { PoolClient } from "pg";
import { DatabaseConnectionManager } from "../database/connection-manager";
import { Logger } from "../utils/logger";
import type { ConsolidationScheduler } from "./consolidation-scheduler";
import type { MemorySectorType } from "./types";

/**
 * Storage metrics for a user's memories
 */
export interface StorageMetrics {
  /** Total bytes used by memories */
  bytesUsed: number;
  /** Storage quota in bytes (default 1GB) */
  quotaBytes: number;
  /** Usage percentage (0-100) */
  usagePercent: number;
}

/**
 * Memory counts by age bucket
 */
export interface MemoryCountsByAge {
  last24h: number;
  lastWeek: number;
  lastMonth: number;
  older: number;
}

/**
 * Memory counts by sector
 */
export interface MemoryCountsBySector {
  episodic: number;
  semantic: number;
  procedural: number;
  emotional: number;
  reflective: number;
}

/**
 * Forgetting candidates breakdown
 */
export interface ForgettingCandidates {
  lowStrength: number;
  oldAge: number;
  lowAccess: number;
  total: number;
}

/**
 * Health recommendation
 */
export interface HealthRecommendation {
  type: "consolidation" | "pruning" | "archiving" | "optimization";
  priority: "low" | "medium" | "high";
  message: string;
  action: string;
}

/**
 * Active consolidation progress information
 */
export interface ActiveConsolidationProgress {
  /** Whether consolidation is currently running */
  isRunning: boolean;
  /** Current phase of consolidation */
  phase: "identifying_clusters" | "generating_summaries" | "consolidating" | "complete" | null;
  /** Number of clusters identified */
  clustersIdentified: number;
  /** Number of clusters consolidated */
  clustersConsolidated: number;
  /** Number of memories processed */
  memoriesProcessed: number;
  /** Total memories in batch */
  memoriesTotal: number;
  /** Percentage complete (0-100) */
  percentComplete: number;
  /** Estimated time remaining in milliseconds */
  estimatedRemainingMs: number;
  /** Start time of current consolidation */
  startedAt: Date | null;
}

/**
 * Complete health response
 */
export interface MemoryHealthResponse {
  storage: StorageMetrics;
  countsBySector: MemoryCountsBySector;
  countsByAge: MemoryCountsByAge;
  consolidationQueue: {
    size: number;
    estimatedTimeMs: number;
  };
  /** Active consolidation progress (if running) */
  activeConsolidation: ActiveConsolidationProgress;
  forgettingCandidates: ForgettingCandidates;
  recommendations: HealthRecommendation[];
  timestamp: Date;
}

/**
 * Error class for health monitor operations
 */
export class HealthMonitorError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "HealthMonitorError";
  }
}

/**
 * Default configuration values
 */
const DEFAULT_QUOTA_BYTES = 1024 * 1024 * 1024; // 1GB
const LOW_STRENGTH_THRESHOLD = 0.1;
const OLD_AGE_DAYS = 180; // 6 months
const LOW_ACCESS_THRESHOLD = 0;
const STORAGE_WARNING_THRESHOLD = 80; // 80% usage triggers recommendations

/**
 * Memory Health Monitor
 *
 * Provides comprehensive health metrics and recommendations for memory management.
 */
export class HealthMonitor {
  private quotaBytes: number;
  private scheduler: ConsolidationScheduler | null = null;

  constructor(
    private db: DatabaseConnectionManager,
    options?: { quotaBytes?: number; scheduler?: ConsolidationScheduler }
  ) {
    this.quotaBytes = options?.quotaBytes ?? DEFAULT_QUOTA_BYTES;
    this.scheduler = options?.scheduler ?? null;
  }

  /**
   * Set the consolidation scheduler for progress reporting
   *
   * Requirements: 7.3 - Progress reporting via Health API
   *
   * @param scheduler - ConsolidationScheduler instance
   */
  setScheduler(scheduler: ConsolidationScheduler): void {
    this.scheduler = scheduler;
  }

  /**
   * Get comprehensive health metrics
   *
   * Requirements: 2.1-2.7, 7.3
   *
   * @param userId - User ID for filtering
   * @returns Complete health response with all metrics
   */
  async getHealth(userId: string): Promise<MemoryHealthResponse> {
    if (!userId) {
      throw new HealthMonitorError("userId is required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Gather all metrics in parallel for efficiency
      const [storage, countsBySector, countsByAge, forgettingCandidates, consolidationQueue] =
        await Promise.all([
          this.getStorageMetricsInternal(client, userId),
          this.getCountsBySectorInternal(client, userId),
          this.getCountsByAgeInternal(client, userId),
          this.getForgettingCandidatesInternal(client, userId),
          this.getConsolidationQueueInternal(client, userId),
        ]);

      // Generate recommendations based on metrics
      const recommendations = this.generateRecommendations(
        storage,
        countsBySector,
        countsByAge,
        forgettingCandidates
      );

      // Get active consolidation progress from scheduler
      const activeConsolidation = this.getActiveConsolidationProgress();

      return {
        storage,
        countsBySector,
        countsByAge,
        consolidationQueue,
        activeConsolidation,
        forgettingCandidates,
        recommendations,
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof HealthMonitorError) {
        throw error;
      }

      // Check for specific database errors and provide better messages
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if the error is due to missing table
      if (
        errorMessage.includes('relation "memories" does not exist') ||
        errorMessage.includes('relation "memory_embeddings" does not exist')
      ) {
        Logger.error("Database schema not initialized:", error);
        throw new HealthMonitorError(
          "Database schema not initialized. Run migrations first.",
          "SCHEMA_NOT_INITIALIZED",
          { userId, error: errorMessage }
        );
      }

      // Check if the error is due to missing column
      if (errorMessage.includes("column") && errorMessage.includes("does not exist")) {
        Logger.error("Database schema outdated:", error);
        throw new HealthMonitorError(
          "Database schema outdated. Run migrations to update.",
          "SCHEMA_OUTDATED",
          { userId, error: errorMessage }
        );
      }

      // Check if the error is due to connection issues
      if (
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("timeout")
      ) {
        Logger.error("Database connection error:", error);
        throw new HealthMonitorError(
          "Database connection failed. Check database availability.",
          "CONNECTION_ERROR",
          { userId, error: errorMessage }
        );
      }

      Logger.error("Failed to get health metrics:", error);
      throw new HealthMonitorError("Failed to get health metrics", "GET_HEALTH_ERROR", {
        userId,
        error: errorMessage,
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Get active consolidation progress from scheduler
   *
   * Requirements: 7.3 - Progress reporting via Health API
   *
   * @returns Active consolidation progress
   */
  private getActiveConsolidationProgress(): ActiveConsolidationProgress {
    if (!this.scheduler) {
      return {
        isRunning: false,
        phase: null,
        clustersIdentified: 0,
        clustersConsolidated: 0,
        memoriesProcessed: 0,
        memoriesTotal: 0,
        percentComplete: 0,
        estimatedRemainingMs: 0,
        startedAt: null,
      };
    }

    const detailedProgress = this.scheduler.getDetailedProgress();

    if (!detailedProgress) {
      return {
        isRunning: false,
        phase: null,
        clustersIdentified: 0,
        clustersConsolidated: 0,
        memoriesProcessed: 0,
        memoriesTotal: 0,
        percentComplete: 0,
        estimatedRemainingMs: 0,
        startedAt: null,
      };
    }

    return {
      isRunning: true,
      phase: detailedProgress.phase,
      clustersIdentified: detailedProgress.clustersIdentified,
      clustersConsolidated: detailedProgress.clustersConsolidated,
      memoriesProcessed: detailedProgress.memoriesProcessed,
      memoriesTotal: detailedProgress.memoriesTotal,
      percentComplete: detailedProgress.percentComplete,
      estimatedRemainingMs: detailedProgress.estimatedRemainingMs,
      startedAt: detailedProgress.startedAt,
    };
  }

  /**
   * Get storage metrics only
   *
   * Requirements: 2.1
   *
   * @param userId - User ID for filtering
   * @returns Storage metrics
   */
  async getStorageMetrics(userId: string): Promise<StorageMetrics> {
    if (!userId) {
      throw new HealthMonitorError("userId is required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();
      return await this.getStorageMetricsInternal(client, userId);
    } catch (error) {
      if (error instanceof HealthMonitorError) {
        throw error;
      }

      Logger.error("Failed to get storage metrics:", error);
      throw new HealthMonitorError("Failed to get storage metrics", "GET_STORAGE_ERROR", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Get memory counts by sector
   *
   * Requirements: 2.2
   *
   * @param userId - User ID for filtering
   * @returns Counts by sector
   */
  async getCountsBySector(userId: string): Promise<MemoryCountsBySector> {
    if (!userId) {
      throw new HealthMonitorError("userId is required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();
      return await this.getCountsBySectorInternal(client, userId);
    } catch (error) {
      if (error instanceof HealthMonitorError) {
        throw error;
      }

      Logger.error("Failed to get counts by sector:", error);
      throw new HealthMonitorError("Failed to get counts by sector", "GET_COUNTS_SECTOR_ERROR", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Get memory counts by age
   *
   * Requirements: 2.3
   *
   * @param userId - User ID for filtering
   * @returns Counts by age bucket
   */
  async getCountsByAge(userId: string): Promise<MemoryCountsByAge> {
    if (!userId) {
      throw new HealthMonitorError("userId is required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();
      return await this.getCountsByAgeInternal(client, userId);
    } catch (error) {
      if (error instanceof HealthMonitorError) {
        throw error;
      }

      Logger.error("Failed to get counts by age:", error);
      throw new HealthMonitorError("Failed to get counts by age", "GET_COUNTS_AGE_ERROR", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Get forgetting candidates
   *
   * Requirements: 2.5
   *
   * @param userId - User ID for filtering
   * @returns Forgetting candidates breakdown
   */
  async getForgettingCandidates(userId: string): Promise<ForgettingCandidates> {
    if (!userId) {
      throw new HealthMonitorError("userId is required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();
      return await this.getForgettingCandidatesInternal(client, userId);
    } catch (error) {
      if (error instanceof HealthMonitorError) {
        throw error;
      }

      Logger.error("Failed to get forgetting candidates:", error);
      throw new HealthMonitorError("Failed to get forgetting candidates", "GET_FORGETTING_ERROR", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Get recommendations based on current state
   *
   * Requirements: 2.6, 2.7
   *
   * @param userId - User ID for filtering
   * @returns Array of recommendations
   */
  async getRecommendations(userId: string): Promise<HealthRecommendation[]> {
    if (!userId) {
      throw new HealthMonitorError("userId is required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      const [storage, countsBySector, countsByAge, forgettingCandidates] = await Promise.all([
        this.getStorageMetricsInternal(client, userId),
        this.getCountsBySectorInternal(client, userId),
        this.getCountsByAgeInternal(client, userId),
        this.getForgettingCandidatesInternal(client, userId),
      ]);

      return this.generateRecommendations(
        storage,
        countsBySector,
        countsByAge,
        forgettingCandidates
      );
    } catch (error) {
      if (error instanceof HealthMonitorError) {
        throw error;
      }

      Logger.error("Failed to get recommendations:", error);
      throw new HealthMonitorError("Failed to get recommendations", "GET_RECOMMENDATIONS_ERROR", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  // ============================================================================
  // Internal methods
  // ============================================================================

  /**
   * Get storage metrics (internal)
   */
  private async getStorageMetricsInternal(
    client: PoolClient,
    userId: string
  ): Promise<StorageMetrics> {
    // Calculate total bytes used by content and embeddings
    const result = await client.query(
      `SELECT
         COALESCE(SUM(LENGTH(m.content)), 0) as content_bytes,
         COALESCE(
           (SELECT SUM(e.dimension * 4)
            FROM memory_embeddings e
            INNER JOIN memories m2 ON e.memory_id = m2.id
            WHERE m2.user_id = $1),
           0
         ) as embedding_bytes
       FROM memories m
       WHERE m.user_id = $1`,
      [userId]
    );

    const contentBytes = parseInt(result.rows[0]?.content_bytes ?? "0", 10);
    const embeddingBytes = parseInt(result.rows[0]?.embedding_bytes ?? "0", 10);
    const bytesUsed = contentBytes + embeddingBytes;
    const usagePercent = (bytesUsed / this.quotaBytes) * 100;

    return {
      bytesUsed,
      quotaBytes: this.quotaBytes,
      usagePercent: Math.min(100, Math.round(usagePercent * 100) / 100),
    };
  }

  /**
   * Get counts by sector (internal)
   */
  private async getCountsBySectorInternal(
    client: PoolClient,
    userId: string
  ): Promise<MemoryCountsBySector> {
    const result = await client.query(
      `SELECT primary_sector, COUNT(*) as count
       FROM memories
       WHERE user_id = $1
       GROUP BY primary_sector`,
      [userId]
    );

    const counts: MemoryCountsBySector = {
      episodic: 0,
      semantic: 0,
      procedural: 0,
      emotional: 0,
      reflective: 0,
    };

    for (const row of result.rows) {
      const sector = row.primary_sector as MemorySectorType;
      if (sector in counts) {
        counts[sector] = parseInt(row.count as string, 10);
      }
    }

    return counts;
  }

  /**
   * Get counts by age (internal)
   */
  private async getCountsByAgeInternal(
    client: PoolClient,
    userId: string
  ): Promise<MemoryCountsByAge> {
    const result = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days' AND created_at <= NOW() - INTERVAL '24 hours') as last_week,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND created_at <= NOW() - INTERVAL '7 days') as last_month,
         COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '30 days') as older
       FROM memories
       WHERE user_id = $1`,
      [userId]
    );

    return {
      last24h: parseInt(result.rows[0]?.last_24h ?? "0", 10),
      lastWeek: parseInt(result.rows[0]?.last_week ?? "0", 10),
      lastMonth: parseInt(result.rows[0]?.last_month ?? "0", 10),
      older: parseInt(result.rows[0]?.older ?? "0", 10),
    };
  }

  /**
   * Get forgetting candidates (internal)
   */
  private async getForgettingCandidatesInternal(
    client: PoolClient,
    userId: string
  ): Promise<ForgettingCandidates> {
    const result = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE strength < $2) as low_strength,
         COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '${OLD_AGE_DAYS} days') as old_age,
         COUNT(*) FILTER (WHERE access_count <= $3) as low_access
       FROM memories
       WHERE user_id = $1`,
      [userId, LOW_STRENGTH_THRESHOLD, LOW_ACCESS_THRESHOLD]
    );

    const lowStrength = parseInt(result.rows[0]?.low_strength ?? "0", 10);
    const oldAge = parseInt(result.rows[0]?.old_age ?? "0", 10);
    const lowAccess = parseInt(result.rows[0]?.low_access ?? "0", 10);

    // Total is unique memories matching any criteria (not sum of all)
    const totalResult = await client.query(
      `SELECT COUNT(*) as total
       FROM memories
       WHERE user_id = $1
         AND (strength < $2 OR created_at < NOW() - INTERVAL '${OLD_AGE_DAYS} days' OR access_count <= $3)`,
      [userId, LOW_STRENGTH_THRESHOLD, LOW_ACCESS_THRESHOLD]
    );

    return {
      lowStrength,
      oldAge,
      lowAccess,
      total: parseInt(totalResult.rows[0]?.total ?? "0", 10),
    };
  }

  /**
   * Get consolidation queue status (internal)
   */
  private async getConsolidationQueueInternal(
    client: PoolClient,
    userId: string
  ): Promise<{ size: number; estimatedTimeMs: number }> {
    // Count episodic memories that could be consolidated
    // (memories not yet consolidated and with enough similar memories)
    // First check if consolidated_into column exists (added in migration 008)
    try {
      const columnCheck = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'memories' AND column_name = 'consolidated_into'`
      );

      let result;
      if (columnCheck.rows.length > 0) {
        // Column exists, use full query
        result = await client.query(
          `SELECT COUNT(*) as count
           FROM memories
           WHERE user_id = $1
             AND primary_sector = 'episodic'
             AND consolidated_into IS NULL`,
          [userId]
        );
      } else {
        // Column doesn't exist (migration not run), count all episodic memories
        result = await client.query(
          `SELECT COUNT(*) as count
           FROM memories
           WHERE user_id = $1
             AND primary_sector = 'episodic'`,
          [userId]
        );
      }

      const size = parseInt(result.rows[0]?.count ?? "0", 10);
      // Estimate 100ms per memory for consolidation
      const estimatedTimeMs = size * 100;

      return { size, estimatedTimeMs };
    } catch (error) {
      // If there's any error checking the schema, fall back to counting all episodic memories
      Logger.warn("Error checking consolidated_into column, falling back to basic count:", error);
      const result = await client.query(
        `SELECT COUNT(*) as count
         FROM memories
         WHERE user_id = $1
           AND primary_sector = 'episodic'`,
        [userId]
      );

      const size = parseInt(result.rows[0]?.count ?? "0", 10);
      const estimatedTimeMs = size * 100;

      return { size, estimatedTimeMs };
    }
  }

  /**
   * Generate recommendations based on metrics
   *
   * Requirements: 2.6, 2.7
   */
  private generateRecommendations(
    storage: StorageMetrics,
    countsBySector: MemoryCountsBySector,
    countsByAge: MemoryCountsByAge,
    forgettingCandidates: ForgettingCandidates
  ): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = [];

    // Requirement 2.7: Storage optimization when usage exceeds 80%
    if (storage.usagePercent >= STORAGE_WARNING_THRESHOLD) {
      recommendations.push({
        type: "optimization",
        priority: storage.usagePercent >= 90 ? "high" : "medium",
        message: `Storage usage is at ${storage.usagePercent.toFixed(1)}%. Consider pruning or archiving old memories.`,
        action: "prune_or_archive",
      });
    }

    // Recommend pruning if there are many forgetting candidates
    if (forgettingCandidates.total > 100) {
      recommendations.push({
        type: "pruning",
        priority: forgettingCandidates.total > 500 ? "high" : "medium",
        message: `${forgettingCandidates.total} memories are candidates for pruning (low strength, old, or never accessed).`,
        action: "review_pruning_candidates",
      });
    }

    // Recommend archiving if there are many old memories
    if (countsByAge.older > 100) {
      recommendations.push({
        type: "archiving",
        priority: countsByAge.older > 500 ? "medium" : "low",
        message: `${countsByAge.older} memories are older than 30 days. Consider archiving to optimize active storage.`,
        action: "archive_old_memories",
      });
    }

    // Recommend consolidation if there are many episodic memories
    if (countsBySector.episodic > 50) {
      recommendations.push({
        type: "consolidation",
        priority: countsBySector.episodic > 200 ? "medium" : "low",
        message: `${countsBySector.episodic} episodic memories could be consolidated into semantic summaries.`,
        action: "run_consolidation",
      });
    }

    return recommendations;
  }
}

/**
 * Factory function to create HealthMonitor
 */
export function createHealthMonitor(
  db: DatabaseConnectionManager,
  options?: { quotaBytes?: number; scheduler?: ConsolidationScheduler }
): HealthMonitor {
  return new HealthMonitor(db, options);
}
