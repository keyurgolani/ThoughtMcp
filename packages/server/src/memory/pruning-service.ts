/**
 * Pruning Service
 *
 * Provides tools to identify and remove low-value memories to optimize storage
 * and improve retrieval relevance.
 *
 * Requirements: 3.1 (identify candidates), 3.2 (list with reasons), 3.3 (bulk delete),
 * 3.4 (graph cleanup), 3.5 (dry-run mode)
 */

import type { PoolClient } from "pg";
import { DatabaseConnectionManager } from "../database/connection-manager";
import { Logger } from "../utils/logger";

/**
 * Criteria for identifying forgetting candidates
 */
export interface PruningCriteria {
  /** Minimum strength threshold (memories below this are candidates) */
  minStrength: number;
  /** Maximum age in days (memories older than this are candidates) */
  maxAgeDays: number;
  /** Minimum access count (memories with fewer accesses are candidates) */
  minAccessCount: number;
}

/**
 * Reason why a memory is a forgetting candidate
 */
export type ForgettingReason = "low_strength" | "old_age" | "low_access";

/**
 * A memory identified as a candidate for pruning
 */
export interface ForgettingCandidate {
  memoryId: string;
  content: string;
  strength: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  reason: ForgettingReason;
}

/**
 * Result of a pruning operation
 */
export interface PruningResult {
  deletedCount: number;
  freedBytes: number;
  orphanedLinksRemoved: number;
  timestamp: Date;
}

/**
 * Error class for pruning service operations
 */
export class PruningServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PruningServiceError";
  }
}

/**
 * Default pruning criteria
 */
export const DEFAULT_PRUNING_CRITERIA: PruningCriteria = {
  minStrength: 0.1,
  maxAgeDays: 180,
  minAccessCount: 0,
};

/**
 * Pruning Service
 *
 * Identifies and removes low-value memories based on configurable criteria.
 */
export class PruningService {
  constructor(private db: DatabaseConnectionManager) {}

  /**
   * List forgetting candidates based on configurable criteria
   *
   * Requirements: 3.1, 3.2
   * - Identify candidates based on strength < minStrength, age > maxAgeDays, accessCount <= minAccessCount
   * - Return memory summaries with reason for candidacy
   *
   * @param userId - User ID for filtering
   * @param criteria - Pruning criteria (defaults to DEFAULT_PRUNING_CRITERIA)
   * @returns Array of forgetting candidates with reasons
   */
  async listCandidates(
    userId: string,
    criteria: PruningCriteria = DEFAULT_PRUNING_CRITERIA
  ): Promise<ForgettingCandidate[]> {
    if (!userId) {
      throw new PruningServiceError("userId is required", "INVALID_INPUT");
    }

    this.validateCriteria(criteria);

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Query memories matching any of the criteria
      // We need to determine the primary reason for each candidate
      const query = `
        SELECT
          id,
          content,
          strength,
          created_at,
          last_accessed,
          access_count,
          CASE
            WHEN strength < $2 THEN 'low_strength'
            WHEN created_at < NOW() - INTERVAL '1 day' * $3 THEN 'old_age'
            WHEN access_count <= $4 THEN 'low_access'
          END as reason
        FROM memories
        WHERE user_id = $1
          AND (
            strength < $2
            OR created_at < NOW() - INTERVAL '1 day' * $3
            OR access_count <= $4
          )
        ORDER BY
          CASE
            WHEN strength < $2 THEN 1
            WHEN created_at < NOW() - INTERVAL '1 day' * $3 THEN 2
            ELSE 3
          END,
          strength ASC,
          created_at ASC
      `;

      const result = await client.query(query, [
        userId,
        criteria.minStrength,
        criteria.maxAgeDays,
        criteria.minAccessCount,
      ]);

      return result.rows.map((row) => ({
        memoryId: row.id as string,
        content: row.content as string,
        strength: row.strength as number,
        createdAt: new Date(row.created_at as string),
        lastAccessed: new Date(row.last_accessed as string),
        accessCount: row.access_count as number,
        reason: row.reason as ForgettingReason,
      }));
    } catch (error) {
      if (error instanceof PruningServiceError) {
        throw error;
      }

      Logger.error("Failed to list pruning candidates:", error);
      throw new PruningServiceError("Failed to list pruning candidates", "LIST_CANDIDATES_ERROR", {
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
   * Execute pruning for specific memory IDs with transaction support
   *
   * Requirements: 3.3, 3.4
   * - Support bulk deletion of forgetting candidates with confirmation
   * - Update the Waypoint_Graph to remove orphaned links
   *
   * @param userId - User ID for filtering
   * @param memoryIds - Array of memory IDs to prune
   * @returns Result of pruning operation
   */
  async prune(userId: string, memoryIds: string[]): Promise<PruningResult> {
    if (!userId) {
      throw new PruningServiceError("userId is required", "INVALID_INPUT");
    }

    if (!memoryIds || memoryIds.length === 0) {
      return this.createEmptyPruningResult();
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.beginTransaction();
      const result = await this.executePruning(client, userId, memoryIds);
      await this.db.commitTransaction(client);
      client = null;
      return result;
    } catch (error) {
      await this.handlePruneError(client, error, userId, memoryIds);
      throw error; // This line is never reached but satisfies TypeScript
    }
  }

  /**
   * Execute the actual pruning operations within a transaction
   */
  private async executePruning(
    client: PoolClient,
    userId: string,
    memoryIds: string[]
  ): Promise<PruningResult> {
    const freedBytes = await this.calculateFreedBytes(client, userId, memoryIds);
    const orphanedLinksRemoved = await this.deleteOrphanedLinks(client, memoryIds);
    await this.deleteRelatedData(client, memoryIds);
    const deletedCount = await this.deleteMemories(client, userId, memoryIds);

    Logger.info("Pruning completed", { userId, deletedCount, freedBytes, orphanedLinksRemoved });

    return { deletedCount, freedBytes, orphanedLinksRemoved, timestamp: new Date() };
  }

  /**
   * Calculate bytes that will be freed by pruning
   */
  private async calculateFreedBytes(
    client: PoolClient,
    userId: string,
    memoryIds: string[]
  ): Promise<number> {
    const sizeQuery = `
      SELECT
        COALESCE(SUM(LENGTH(m.content)), 0) as content_bytes,
        COALESCE(
          (SELECT SUM(e.dimension * 4)
           FROM memory_embeddings e
           WHERE e.memory_id = ANY($2)),
          0
        ) as embedding_bytes
      FROM memories m
      WHERE m.user_id = $1
        AND m.id = ANY($2)
    `;

    const sizeResult = await client.query(sizeQuery, [userId, memoryIds]);
    const contentBytes = parseInt(sizeResult.rows[0]?.content_bytes ?? "0", 10);
    const embeddingBytes = parseInt(sizeResult.rows[0]?.embedding_bytes ?? "0", 10);
    return contentBytes + embeddingBytes;
  }

  /**
   * Delete orphaned links from Waypoint_Graph and return count
   */
  private async deleteOrphanedLinks(client: PoolClient, memoryIds: string[]): Promise<number> {
    const countLinksQuery = `
      SELECT COUNT(*) as link_count
      FROM memory_links
      WHERE source_id = ANY($1) OR target_id = ANY($1)
    `;

    const linksCountResult = await client.query(countLinksQuery, [memoryIds]);
    const orphanedLinksRemoved = parseInt(linksCountResult.rows[0]?.link_count ?? "0", 10);

    await client.query(
      `DELETE FROM memory_links WHERE source_id = ANY($1) OR target_id = ANY($1)`,
      [memoryIds]
    );

    return orphanedLinksRemoved;
  }

  /**
   * Delete related data (embeddings, metadata, tag associations)
   */
  private async deleteRelatedData(client: PoolClient, memoryIds: string[]): Promise<void> {
    await client.query(`DELETE FROM memory_embeddings WHERE memory_id = ANY($1)`, [memoryIds]);
    await client.query(`DELETE FROM memory_metadata WHERE memory_id = ANY($1)`, [memoryIds]);

    try {
      await client.query(`DELETE FROM memory_tag_associations WHERE memory_id = ANY($1)`, [
        memoryIds,
      ]);
    } catch {
      // Table may not exist yet, ignore
    }
  }

  /**
   * Delete memories and return count
   */
  private async deleteMemories(
    client: PoolClient,
    userId: string,
    memoryIds: string[]
  ): Promise<number> {
    const deleteQuery = `
      DELETE FROM memories
      WHERE user_id = $1
        AND id = ANY($2)
      RETURNING id
    `;

    const deleteResult = await client.query(deleteQuery, [userId, memoryIds]);
    return deleteResult.rowCount ?? 0;
  }

  /**
   * Handle prune errors with rollback
   */
  private async handlePruneError(
    client: PoolClient | null,
    error: unknown,
    userId: string,
    memoryIds: string[]
  ): Promise<never> {
    if (client) {
      try {
        await this.db.rollbackTransaction(client);
      } catch (rollbackError) {
        Logger.error("Failed to rollback pruning transaction:", rollbackError);
      }
    }

    if (error instanceof PruningServiceError) {
      throw error;
    }

    Logger.error("Failed to prune memories:", error);
    throw new PruningServiceError("Failed to prune memories", "PRUNE_ERROR", {
      userId,
      memoryIds,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  /**
   * Create an empty pruning result
   */
  private createEmptyPruningResult(): PruningResult {
    return { deletedCount: 0, freedBytes: 0, orphanedLinksRemoved: 0, timestamp: new Date() };
  }

  /**
   * Bulk prune all candidates matching the criteria
   *
   * Requirements: 3.3, 3.4
   * - Support bulk deletion of forgetting candidates
   * - Update the Waypoint_Graph to remove orphaned links
   *
   * @param userId - User ID for filtering
   * @param criteria - Pruning criteria (defaults to DEFAULT_PRUNING_CRITERIA)
   * @returns Result of pruning operation
   */
  async pruneAllCandidates(
    userId: string,
    criteria: PruningCriteria = DEFAULT_PRUNING_CRITERIA
  ): Promise<PruningResult> {
    if (!userId) {
      throw new PruningServiceError("userId is required", "INVALID_INPUT");
    }

    this.validateCriteria(criteria);

    // First, get all candidates
    const candidates = await this.listCandidates(userId, criteria);

    if (candidates.length === 0) {
      return {
        deletedCount: 0,
        freedBytes: 0,
        orphanedLinksRemoved: 0,
        timestamp: new Date(),
      };
    }

    // Extract memory IDs and prune them
    const memoryIds = candidates.map((c) => c.memoryId);
    return this.prune(userId, memoryIds);
  }

  /**
   * Preview pruning effects without actually deleting (dry-run mode)
   *
   * Requirements: 3.5
   * - Support dry-run mode to preview pruning effects without deletion
   * - Return what would be deleted and freed
   *
   * @param userId - User ID for filtering
   * @param memoryIds - Array of memory IDs to preview pruning
   * @returns Preview of pruning effects
   */
  async previewPruning(userId: string, memoryIds: string[]): Promise<PruningResult> {
    if (!userId) {
      throw new PruningServiceError("userId is required", "INVALID_INPUT");
    }

    if (!memoryIds || memoryIds.length === 0) {
      return this.createEmptyPruningResult();
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();
      const result = await this.calculatePreviewMetrics(client, userId, memoryIds);
      return result;
    } catch (error) {
      if (error instanceof PruningServiceError) {
        throw error;
      }

      Logger.error("Failed to preview pruning:", error);
      throw new PruningServiceError("Failed to preview pruning", "PREVIEW_PRUNING_ERROR", {
        userId,
        memoryIds,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Calculate preview metrics for pruning
   */
  private async calculatePreviewMetrics(
    client: PoolClient,
    userId: string,
    memoryIds: string[]
  ): Promise<PruningResult> {
    const sizeQuery = `
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(LENGTH(m.content)), 0) as content_bytes,
        COALESCE(
          (SELECT SUM(e.dimension * 4)
           FROM memory_embeddings e
           WHERE e.memory_id = ANY($2)),
          0
        ) as embedding_bytes
      FROM memories m
      WHERE m.user_id = $1
        AND m.id = ANY($2)
    `;

    const sizeResult = await client.query(sizeQuery, [userId, memoryIds]);

    const count = parseInt(sizeResult.rows[0]?.count ?? "0", 10);
    const contentBytes = parseInt(sizeResult.rows[0]?.content_bytes ?? "0", 10);
    const embeddingBytes = parseInt(sizeResult.rows[0]?.embedding_bytes ?? "0", 10);

    const linksQuery = `
      SELECT COUNT(*) as link_count
      FROM memory_links
      WHERE source_id = ANY($1) OR target_id = ANY($1)
    `;

    const linksResult = await client.query(linksQuery, [memoryIds]);
    const orphanedLinksRemoved = parseInt(linksResult.rows[0]?.link_count ?? "0", 10);

    return {
      deletedCount: count,
      freedBytes: contentBytes + embeddingBytes,
      orphanedLinksRemoved,
      timestamp: new Date(),
    };
  }

  /**
   * Validate pruning criteria
   */
  private validateCriteria(criteria: PruningCriteria): void {
    if (criteria.minStrength < 0 || criteria.minStrength > 1) {
      throw new PruningServiceError("minStrength must be between 0 and 1", "INVALID_CRITERIA", {
        field: "minStrength",
        value: criteria.minStrength,
      });
    }

    if (criteria.maxAgeDays < 0) {
      throw new PruningServiceError("maxAgeDays must be non-negative", "INVALID_CRITERIA", {
        field: "maxAgeDays",
        value: criteria.maxAgeDays,
      });
    }

    if (criteria.minAccessCount < 0) {
      throw new PruningServiceError("minAccessCount must be non-negative", "INVALID_CRITERIA", {
        field: "minAccessCount",
        value: criteria.minAccessCount,
      });
    }
  }
}

/**
 * Factory function to create PruningService
 */
export function createPruningService(db: DatabaseConnectionManager): PruningService {
  return new PruningService(db);
}
