/**
 * Quality Analyzer
 *
 * Provides quality metrics, access patterns, and analysis for memory management.
 *
 * Requirements: 8.1 (average strength by sector), 8.2 (access patterns),
 *               8.3 (embedding quality metrics), 8.4 (duplicate detection),
 *               8.5 (merge suggestions), 8.6 (quality trends)
 */

import type { PoolClient } from "pg";
import { DatabaseConnectionManager } from "../database/connection-manager";
import { Logger } from "../utils/logger";
import type { MemorySectorType } from "./types";

/**
 * Quality metrics for a user's memories
 */
export interface QualityMetrics {
  /** Average strength by sector */
  averageStrengthBySector: Record<MemorySectorType, number>;
  /** Percentage of memories with complete embeddings (0-100) */
  embeddingCoverage: number;
  /** Clustering coefficient (0-1) - measures how connected memories are */
  clusteringCoefficient: number;
}

/**
 * Access pattern for a memory
 */
export interface AccessPattern {
  /** Memory ID */
  memoryId: string;
  /** Memory content (truncated) */
  content: string;
  /** Number of times accessed */
  accessCount: number;
  /** Last access timestamp */
  lastAccessed: Date;
}

/**
 * Type of access pattern to retrieve
 */
export type AccessPatternType = "most" | "least" | "never";

/**
 * Duplicate candidate pair
 * Requirements: 8.4, 8.5
 */
export interface DuplicateCandidate {
  /** First memory ID */
  memoryId1: string;
  /** Second memory ID */
  memoryId2: string;
  /** Similarity score between the two memories (0-1) */
  similarity: number;
  /** Suggested action for handling the duplicate */
  suggestedAction: "merge" | "keep_both" | "delete_one";
}

/**
 * Quality trend data point
 * Requirements: 8.6
 */
export interface QualityTrend {
  /** Date for this data point */
  date: Date;
  /** Average strength of memories on this date */
  averageStrength: number;
  /** Total number of memories on this date */
  totalMemories: number;
  /** Number of memories consolidated on this date */
  consolidatedCount: number;
}

/**
 * Error class for quality analyzer operations
 */
export class QualityAnalyzerError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "QualityAnalyzerError";
  }
}

/**
 * Default configuration values
 */
const DEFAULT_ACCESS_PATTERN_LIMIT = 10;
const CONTENT_TRUNCATE_LENGTH = 100;
const DEFAULT_DUPLICATE_THRESHOLD = 0.9;
const DEFAULT_DUPLICATE_LIMIT = 50;
const DEFAULT_TREND_DAYS = 30;
const MAX_TREND_DAYS = 365;

/**
 * Quality Analyzer
 *
 * Provides quality metrics and access pattern analysis for memory management.
 */
export class QualityAnalyzer {
  constructor(private db: DatabaseConnectionManager) {}

  /**
   * Get quality metrics for a user's memories
   *
   * Requirements: 8.1 (average strength by sector), 8.3 (embedding quality metrics)
   *
   * @param userId - User ID for filtering
   * @returns Quality metrics including strength averages and embedding coverage
   */
  async getMetrics(userId: string): Promise<QualityMetrics> {
    if (!userId) {
      throw new QualityAnalyzerError("userId is required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Gather all metrics in parallel for efficiency
      const [averageStrengthBySector, embeddingCoverage, clusteringCoefficient] = await Promise.all(
        [
          this.getAverageStrengthBySectorInternal(client, userId),
          this.getEmbeddingCoverageInternal(client, userId),
          this.getClusteringCoefficientInternal(client, userId),
        ]
      );

      return {
        averageStrengthBySector,
        embeddingCoverage,
        clusteringCoefficient,
      };
    } catch (error) {
      if (error instanceof QualityAnalyzerError) {
        throw error;
      }

      Logger.error("Failed to get quality metrics:", error);
      throw new QualityAnalyzerError("Failed to get quality metrics", "GET_METRICS_ERROR", {
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
   * Get access patterns for memories
   *
   * Requirements: 8.2 (access patterns - most accessed, least accessed, never accessed)
   *
   * @param userId - User ID for filtering
   * @param type - Type of access pattern: 'most', 'least', or 'never'
   * @param limit - Maximum number of results (default 10)
   * @returns Array of access patterns
   */
  async getAccessPatterns(
    userId: string,
    type: AccessPatternType,
    limit: number = DEFAULT_ACCESS_PATTERN_LIMIT
  ): Promise<AccessPattern[]> {
    if (!userId) {
      throw new QualityAnalyzerError("userId is required", "INVALID_INPUT");
    }

    if (!["most", "least", "never"].includes(type)) {
      throw new QualityAnalyzerError("type must be 'most', 'least', or 'never'", "INVALID_INPUT", {
        type,
      });
    }

    if (limit < 1 || limit > 100) {
      throw new QualityAnalyzerError("limit must be between 1 and 100", "INVALID_INPUT", { limit });
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();
      return await this.getAccessPatternsInternal(client, userId, type, limit);
    } catch (error) {
      if (error instanceof QualityAnalyzerError) {
        throw error;
      }

      Logger.error("Failed to get access patterns:", error);
      throw new QualityAnalyzerError("Failed to get access patterns", "GET_ACCESS_PATTERNS_ERROR", {
        userId,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Find duplicate memories based on content similarity
   *
   * Requirements: 8.4 (identify potential duplicate memories),
   *               8.5 (suggest merge candidates)
   *
   * @param userId - User ID for filtering
   * @param threshold - Similarity threshold (0-1), default 0.9
   * @returns Array of duplicate candidates with merge suggestions
   */
  async findDuplicates(
    userId: string,
    threshold: number = DEFAULT_DUPLICATE_THRESHOLD
  ): Promise<DuplicateCandidate[]> {
    if (!userId) {
      throw new QualityAnalyzerError("userId is required", "INVALID_INPUT");
    }

    if (threshold < 0 || threshold > 1) {
      throw new QualityAnalyzerError("threshold must be between 0 and 1", "INVALID_INPUT", {
        threshold,
      });
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();
      return await this.findDuplicatesInternal(client, userId, threshold);
    } catch (error) {
      if (error instanceof QualityAnalyzerError) {
        throw error;
      }

      Logger.error("Failed to find duplicates:", error);
      throw new QualityAnalyzerError("Failed to find duplicates", "FIND_DUPLICATES_ERROR", {
        userId,
        threshold,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Get quality trends over time
   *
   * Requirements: 8.6 (trend data showing memory quality over time)
   *
   * @param userId - User ID for filtering
   * @param days - Number of days to look back (default 30, max 365)
   * @returns Array of quality trend data points
   */
  async getTrends(userId: string, days: number = DEFAULT_TREND_DAYS): Promise<QualityTrend[]> {
    if (!userId) {
      throw new QualityAnalyzerError("userId is required", "INVALID_INPUT");
    }

    if (days < 1 || days > MAX_TREND_DAYS) {
      throw new QualityAnalyzerError(
        `days must be between 1 and ${MAX_TREND_DAYS}`,
        "INVALID_INPUT",
        {
          days,
        }
      );
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();
      return await this.getTrendsInternal(client, userId, days);
    } catch (error) {
      if (error instanceof QualityAnalyzerError) {
        throw error;
      }

      Logger.error("Failed to get trends:", error);
      throw new QualityAnalyzerError("Failed to get trends", "GET_TRENDS_ERROR", {
        userId,
        days,
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
   * Get average strength by sector (internal)
   *
   * Requirements: 8.1
   */
  private async getAverageStrengthBySectorInternal(
    client: PoolClient,
    userId: string
  ): Promise<Record<MemorySectorType, number>> {
    const result = await client.query(
      `SELECT primary_sector, AVG(strength) as avg_strength
       FROM memories
       WHERE user_id = $1
       GROUP BY primary_sector`,
      [userId]
    );

    const averages: Record<MemorySectorType, number> = {
      episodic: 0,
      semantic: 0,
      procedural: 0,
      emotional: 0,
      reflective: 0,
    };

    for (const row of result.rows) {
      const sector = row.primary_sector as MemorySectorType;
      if (sector in averages) {
        averages[sector] = parseFloat(row.avg_strength as string) || 0;
      }
    }

    return averages;
  }

  /**
   * Get embedding coverage (internal)
   *
   * Requirements: 8.3
   */
  private async getEmbeddingCoverageInternal(client: PoolClient, userId: string): Promise<number> {
    const result = await client.query(
      `SELECT
         COUNT(*) as total_memories,
         COUNT(DISTINCT me.memory_id) as memories_with_embeddings
       FROM memories m
       LEFT JOIN memory_embeddings me ON m.id = me.memory_id
       WHERE m.user_id = $1`,
      [userId]
    );

    const totalMemories = parseInt(result.rows[0]?.total_memories ?? "0", 10);
    const memoriesWithEmbeddings = parseInt(result.rows[0]?.memories_with_embeddings ?? "0", 10);

    if (totalMemories === 0) {
      return 0;
    }

    return Math.round((memoriesWithEmbeddings / totalMemories) * 100 * 100) / 100;
  }

  /**
   * Get clustering coefficient (internal)
   *
   * Requirements: 8.3
   *
   * The clustering coefficient measures how connected memories are in the graph.
   * It's calculated as the ratio of actual links to possible links.
   */
  private async getClusteringCoefficientInternal(
    client: PoolClient,
    userId: string
  ): Promise<number> {
    // Get total memories and total links for the user
    const result = await client.query(
      `SELECT
         (SELECT COUNT(*) FROM memories WHERE user_id = $1) as total_memories,
         (SELECT COUNT(*) FROM memory_links ml
          INNER JOIN memories m ON ml.source_id = m.id
          WHERE m.user_id = $1) as total_links`,
      [userId]
    );

    const totalMemories = parseInt(result.rows[0]?.total_memories ?? "0", 10);
    const totalLinks = parseInt(result.rows[0]?.total_links ?? "0", 10);

    if (totalMemories < 2) {
      return 0;
    }

    // Maximum possible links in a fully connected graph: n * (n-1) / 2
    // But we use directed links, so it's n * (n-1)
    const maxPossibleLinks = totalMemories * (totalMemories - 1);

    if (maxPossibleLinks === 0) {
      return 0;
    }

    // Clustering coefficient is the ratio of actual to possible links
    const coefficient = totalLinks / maxPossibleLinks;

    // Clamp to 0-1 range and round to 4 decimal places
    return Math.round(Math.min(1, Math.max(0, coefficient)) * 10000) / 10000;
  }

  /**
   * Get access patterns (internal)
   *
   * Requirements: 8.2
   */
  private async getAccessPatternsInternal(
    client: PoolClient,
    userId: string,
    type: AccessPatternType,
    limit: number
  ): Promise<AccessPattern[]> {
    let query: string;

    switch (type) {
      case "most":
        // Most accessed memories (highest access count)
        query = `
          SELECT id, content, access_count, last_accessed
          FROM memories
          WHERE user_id = $1 AND access_count > 0
          ORDER BY access_count DESC, last_accessed DESC
          LIMIT $2
        `;
        break;

      case "least":
        // Least accessed memories (lowest non-zero access count)
        query = `
          SELECT id, content, access_count, last_accessed
          FROM memories
          WHERE user_id = $1 AND access_count > 0
          ORDER BY access_count ASC, last_accessed ASC
          LIMIT $2
        `;
        break;

      case "never":
        // Never accessed memories (access count = 0)
        query = `
          SELECT id, content, access_count, last_accessed
          FROM memories
          WHERE user_id = $1 AND access_count = 0
          ORDER BY created_at DESC
          LIMIT $2
        `;
        break;
    }

    const result = await client.query(query, [userId, limit]);

    return result.rows.map((row: Record<string, unknown>) => ({
      memoryId: row.id as string,
      content: this.truncateContent(row.content as string),
      accessCount: parseInt(row.access_count as string, 10),
      lastAccessed: new Date(row.last_accessed as string),
    }));
  }

  /**
   * Truncate content for display
   */
  private truncateContent(content: string): string {
    if (content.length <= CONTENT_TRUNCATE_LENGTH) {
      return content;
    }
    return `${content.substring(0, CONTENT_TRUNCATE_LENGTH)}...`;
  }

  /**
   * Find duplicates (internal)
   *
   * Requirements: 8.4, 8.5
   *
   * Uses cosine similarity on embeddings to find similar memories.
   */
  private async findDuplicatesInternal(
    client: PoolClient,
    userId: string,
    threshold: number
  ): Promise<DuplicateCandidate[]> {
    // Query to find similar memories using embedding cosine similarity
    // Uses pgvector's <=> operator for cosine distance (1 - similarity)
    const result = await client.query(
      `WITH memory_pairs AS (
        SELECT
          m1.id as id1,
          m2.id as id2,
          m1.strength as strength1,
          m2.strength as strength2,
          m1.access_count as access_count1,
          m2.access_count as access_count2,
          1 - (me1.embedding <=> me2.embedding) as similarity
        FROM memories m1
        INNER JOIN memories m2 ON m1.id < m2.id AND m1.user_id = m2.user_id
        INNER JOIN memory_embeddings me1 ON m1.id = me1.memory_id AND me1.sector = 'semantic'
        INNER JOIN memory_embeddings me2 ON m2.id = me2.memory_id AND me2.sector = 'semantic'
        WHERE m1.user_id = $1
          AND 1 - (me1.embedding <=> me2.embedding) >= $2
      )
      SELECT id1, id2, similarity, strength1, strength2, access_count1, access_count2
      FROM memory_pairs
      ORDER BY similarity DESC
      LIMIT $3`,
      [userId, threshold, DEFAULT_DUPLICATE_LIMIT]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      memoryId1: row.id1 as string,
      memoryId2: row.id2 as string,
      similarity: parseFloat(row.similarity as string),
      suggestedAction: this.determineSuggestedAction(
        parseFloat(row.similarity as string),
        parseFloat(row.strength1 as string),
        parseFloat(row.strength2 as string),
        parseInt(row.access_count1 as string, 10),
        parseInt(row.access_count2 as string, 10)
      ),
    }));
  }

  /**
   * Determine suggested action for duplicate memories
   *
   * Requirements: 8.5
   */
  private determineSuggestedAction(
    similarity: number,
    strength1: number,
    strength2: number,
    accessCount1: number,
    accessCount2: number
  ): "merge" | "keep_both" | "delete_one" {
    // Very high similarity (>= 0.95) suggests merge
    if (similarity >= 0.95) {
      return "merge";
    }

    // If one memory is significantly stronger or more accessed, suggest deleting the weaker one
    const strengthDiff = Math.abs(strength1 - strength2);
    const accessDiff = Math.abs(accessCount1 - accessCount2);

    if (strengthDiff > 0.3 || accessDiff > 10) {
      return "delete_one";
    }

    // Otherwise, keep both as they may have different contexts
    return "keep_both";
  }

  /**
   * Get trends (internal)
   *
   * Requirements: 8.6
   */
  private async getTrendsInternal(
    client: PoolClient,
    userId: string,
    days: number
  ): Promise<QualityTrend[]> {
    // Query to get daily aggregates for the specified period
    const result = await client.query(
      `WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '1 day' * ($2 - 1),
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date as date
      ),
      daily_stats AS (
        SELECT
          DATE(created_at) as date,
          AVG(strength) as avg_strength,
          COUNT(*) as total_memories
        FROM memories
        WHERE user_id = $1
          AND created_at >= CURRENT_DATE - INTERVAL '1 day' * $2
        GROUP BY DATE(created_at)
      ),
      daily_consolidations AS (
        SELECT
          DATE(consolidated_at) as date,
          COUNT(*) as consolidated_count
        FROM consolidation_history
        WHERE user_id = $1
          AND consolidated_at >= CURRENT_DATE - INTERVAL '1 day' * $2
        GROUP BY DATE(consolidated_at)
      )
      SELECT
        ds.date,
        COALESCE(st.avg_strength, 0) as average_strength,
        COALESCE(st.total_memories, 0) as total_memories,
        COALESCE(dc.consolidated_count, 0) as consolidated_count
      FROM date_series ds
      LEFT JOIN daily_stats st ON ds.date = st.date
      LEFT JOIN daily_consolidations dc ON ds.date = dc.date
      ORDER BY ds.date ASC`,
      [userId, days]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      date: new Date(row.date as string),
      averageStrength: parseFloat(row.average_strength as string) || 0,
      totalMemories: parseInt(row.total_memories as string, 10) || 0,
      consolidatedCount: parseInt(row.consolidated_count as string, 10) || 0,
    }));
  }
}

/**
 * Factory function to create QualityAnalyzer
 */
export function createQualityAnalyzer(db: DatabaseConnectionManager): QualityAnalyzer {
  return new QualityAnalyzer(db);
}
