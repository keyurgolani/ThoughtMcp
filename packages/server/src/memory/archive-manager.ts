/**
 * Archive Manager
 *
 * Manages archiving of memories to cold storage and restoration.
 * Supports archiving by age threshold and specific memory IDs.
 *
 * Requirements: 4.1 (archive by age threshold), 4.2 (retain metadata and embeddings)
 */

import type { PoolClient } from "pg";
import { DatabaseConnectionManager } from "../database/connection-manager";
import { Logger } from "../utils/logger";
import type { MemorySectorType } from "./types";

/**
 * Configuration for archive operations
 */
export interface ArchiveConfig {
  /** Age threshold in days for archiving (default: 180 days / 6 months) */
  ageThresholdDays: number;
  /** Whether to retain embeddings in archive (default: true) */
  retainEmbeddings: boolean;
}

/**
 * Archived memory record
 */
export interface ArchivedMemory {
  id: string;
  userId: string;
  content: string;
  metadata: {
    keywords?: string[];
    tags?: string[];
    category?: string;
    context?: string;
    importance?: number;
  };
  embeddings: Record<string, number[]> | null;
  archivedAt: Date;
  originalCreatedAt: Date;
  tags: string[];
  primarySector: MemorySectorType;
  sessionId?: string;
  salience: number;
  strength: number;
  accessCount: number;
  lastAccessed?: Date;
}

/**
 * Result of an archive operation
 */
export interface ArchiveResult {
  archivedCount: number;
  freedBytes: number;
  timestamp: Date;
}

/**
 * Result of a restore operation
 */
export interface RestoreResult {
  restoredCount: number;
  timestamp: Date;
}

/**
 * Archive statistics
 */
export interface ArchiveStats {
  count: number;
  bytesUsed: number;
}

/**
 * Error class for archive manager operations
 */
export class ArchiveManagerError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ArchiveManagerError";
  }
}

/**
 * Default archive configuration
 */
export const DEFAULT_ARCHIVE_CONFIG: ArchiveConfig = {
  ageThresholdDays: 180, // 6 months
  retainEmbeddings: true,
};

/**
 * Archive Manager
 *
 * Manages archiving of memories to cold storage and restoration.
 */
export class ArchiveManager {
  constructor(private db: DatabaseConnectionManager) {}

  /**
   * Archive memories older than the specified age threshold
   *
   * Requirements: 4.1
   * - Support archiving memories older than a configurable threshold (default: 6 months)
   *
   * Requirements: 4.2
   * - Retain metadata and embeddings but move content to cold storage
   *
   * @param userId - User ID for filtering
   * @param config - Archive configuration (defaults to DEFAULT_ARCHIVE_CONFIG)
   * @returns Result of archive operation
   */
  async archiveOld(
    userId: string,
    config: ArchiveConfig = DEFAULT_ARCHIVE_CONFIG
  ): Promise<ArchiveResult> {
    if (!userId) {
      throw new ArchiveManagerError("userId is required", "INVALID_INPUT");
    }

    this.validateConfig(config);

    let client: PoolClient | null = null;

    try {
      client = await this.db.beginTransaction();

      // Find memories older than the threshold that are not already archived
      const findQuery = `
        SELECT id
        FROM memories
        WHERE user_id = $1
          AND created_at < NOW() - INTERVAL '1 day' * $2
          AND (is_archived IS NULL OR is_archived = FALSE)
      `;

      const findResult = await client.query(findQuery, [userId, config.ageThresholdDays]);
      const memoryIds = findResult.rows.map((row) => row.id as string);

      if (memoryIds.length === 0) {
        await this.db.commitTransaction(client);
        return { archivedCount: 0, freedBytes: 0, timestamp: new Date() };
      }

      // Archive the memories
      const result = await this.archiveMemoriesInternal(client, userId, memoryIds, config);

      await this.db.commitTransaction(client);
      client = null;

      Logger.info("Archive old memories completed", {
        userId,
        archivedCount: result.archivedCount,
        freedBytes: result.freedBytes,
        ageThresholdDays: config.ageThresholdDays,
      });

      return result;
    } catch (error) {
      await this.handleArchiveError(client, error, userId);
      throw error; // This line is never reached but satisfies TypeScript
    }
  }

  /**
   * Archive specific memories by ID
   *
   * Requirements: 4.1, 4.2
   * - Archive specific memories while retaining metadata and embeddings
   *
   * @param userId - User ID for ownership verification
   * @param memoryIds - Array of memory IDs to archive
   * @param config - Archive configuration (defaults to DEFAULT_ARCHIVE_CONFIG)
   * @returns Result of archive operation
   */
  async archiveMemories(
    userId: string,
    memoryIds: string[],
    config: ArchiveConfig = DEFAULT_ARCHIVE_CONFIG
  ): Promise<ArchiveResult> {
    if (!userId) {
      throw new ArchiveManagerError("userId is required", "INVALID_INPUT");
    }

    if (!memoryIds || memoryIds.length === 0) {
      return { archivedCount: 0, freedBytes: 0, timestamp: new Date() };
    }

    this.validateConfig(config);

    let client: PoolClient | null = null;

    try {
      client = await this.db.beginTransaction();

      const result = await this.archiveMemoriesInternal(client, userId, memoryIds, config);

      await this.db.commitTransaction(client);
      client = null;

      Logger.info("Archive memories completed", {
        userId,
        archivedCount: result.archivedCount,
        freedBytes: result.freedBytes,
        requestedCount: memoryIds.length,
      });

      return result;
    } catch (error) {
      await this.handleArchiveError(client, error, userId);
      throw error; // This line is never reached but satisfies TypeScript
    }
  }

  /**
   * Internal method to archive memories within a transaction
   */
  private async archiveMemoriesInternal(
    client: PoolClient,
    userId: string,
    memoryIds: string[],
    config: ArchiveConfig
  ): Promise<ArchiveResult> {
    // Calculate bytes that will be freed (content size)
    const freedBytes = await this.calculateFreedBytes(client, userId, memoryIds);

    // Copy memories to archived_memories table with all data
    const insertQuery = `
      INSERT INTO archived_memories (
        id, user_id, content, metadata, embeddings,
        original_created_at, archived_at, tags,
        session_id, primary_sector, salience, decay_rate,
        strength, access_count, last_accessed
      )
      SELECT
        m.id,
        m.user_id,
        m.content,
        COALESCE(
          (SELECT jsonb_build_object(
            'keywords', md.keywords,
            'tags', md.tags,
            'category', md.category,
            'context', md.context,
            'importance', md.importance
          )
          FROM memory_metadata md WHERE md.memory_id = m.id),
          '{}'::jsonb
        ),
        ${config.retainEmbeddings ? this.buildEmbeddingsSubquery() : "NULL"},
        m.created_at,
        NOW(),
        COALESCE(m.tags, '{}'),
        m.session_id,
        m.primary_sector,
        m.salience,
        m.decay_rate,
        m.strength,
        m.access_count,
        m.last_accessed
      FROM memories m
      WHERE m.user_id = $1
        AND m.id = ANY($2)
        AND (m.is_archived IS NULL OR m.is_archived = FALSE)
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;

    const insertResult = await client.query(insertQuery, [userId, memoryIds]);
    const archivedCount = insertResult.rowCount ?? 0;

    if (archivedCount > 0) {
      // Mark memories as archived in the main table
      await client.query(
        `UPDATE memories SET is_archived = TRUE WHERE user_id = $1 AND id = ANY($2)`,
        [userId, memoryIds]
      );
    }

    return {
      archivedCount,
      freedBytes,
      timestamp: new Date(),
    };
  }

  /**
   * Build subquery for embeddings aggregation
   */
  private buildEmbeddingsSubquery(): string {
    return `(
      SELECT jsonb_object_agg(e.sector, e.embedding)
      FROM memory_embeddings e
      WHERE e.memory_id = m.id
    )`;
  }

  /**
   * Calculate bytes that will be freed by archiving
   */
  private async calculateFreedBytes(
    client: PoolClient,
    userId: string,
    memoryIds: string[]
  ): Promise<number> {
    const sizeQuery = `
      SELECT COALESCE(SUM(LENGTH(content)), 0) as content_bytes
      FROM memories
      WHERE user_id = $1
        AND id = ANY($2)
        AND (is_archived IS NULL OR is_archived = FALSE)
    `;

    const sizeResult = await client.query(sizeQuery, [userId, memoryIds]);
    return parseInt(sizeResult.rows[0]?.content_bytes ?? "0", 10);
  }

  /**
   * Handle archive errors with rollback
   */
  private async handleArchiveError(
    client: PoolClient | null,
    error: unknown,
    userId: string
  ): Promise<never> {
    if (client) {
      try {
        await this.db.rollbackTransaction(client);
      } catch (rollbackError) {
        Logger.error("Failed to rollback archive transaction:", rollbackError);
      }
    }

    if (error instanceof ArchiveManagerError) {
      throw error;
    }

    Logger.error("Failed to archive memories:", error);
    throw new ArchiveManagerError("Failed to archive memories", "ARCHIVE_ERROR", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  /**
   * Validate archive configuration
   */
  private validateConfig(config: ArchiveConfig): void {
    if (config.ageThresholdDays < 0) {
      throw new ArchiveManagerError("ageThresholdDays must be non-negative", "INVALID_CONFIG", {
        field: "ageThresholdDays",
        value: config.ageThresholdDays,
      });
    }
  }

  /**
   * Search archived memories by query string
   *
   * Requirements: 4.3
   * - Return metadata with an archived flag when searching archived memories
   *
   * @param userId - User ID for filtering
   * @param query - Search query string (searches content and metadata)
   * @returns Array of archived memories matching the query
   */
  async searchArchive(userId: string, query: string): Promise<ArchivedMemory[]> {
    if (!userId) {
      throw new ArchiveManagerError("userId is required", "INVALID_INPUT");
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      const searchQuery = `
        SELECT
          id,
          user_id,
          content,
          metadata,
          embeddings,
          archived_at,
          original_created_at,
          tags,
          primary_sector,
          session_id,
          salience,
          strength,
          access_count,
          last_accessed
        FROM archived_memories
        WHERE user_id = $1
          AND (
            content ILIKE $2
            OR metadata::text ILIKE $2
            OR $3 = ANY(tags)
          )
        ORDER BY archived_at DESC
        LIMIT 100
      `;

      const searchPattern = `%${query.trim()}%`;
      const result = await client.query(searchQuery, [userId, searchPattern, query.trim()]);

      return result.rows.map((row) => this.mapRowToArchivedMemory(row));
    } catch (error) {
      if (error instanceof ArchiveManagerError) {
        throw error;
      }

      Logger.error("Failed to search archive:", error);
      throw new ArchiveManagerError("Failed to search archive", "SEARCH_ERROR", {
        userId,
        query,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Restore an archived memory to active storage
   *
   * Requirements: 4.4
   * - Automatically restore archived memory to active storage when accessed
   *
   * @param userId - User ID for ownership verification
   * @param memoryId - Memory ID to restore
   * @returns Result of restore operation
   */
  async restore(userId: string, memoryId: string): Promise<RestoreResult> {
    if (!userId) {
      throw new ArchiveManagerError("userId is required", "INVALID_INPUT");
    }

    if (!memoryId) {
      throw new ArchiveManagerError("memoryId is required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.beginTransaction();

      // Check if the memory exists in archive
      const checkQuery = `
        SELECT id FROM archived_memories
        WHERE id = $1 AND user_id = $2
      `;
      const checkResult = await client.query(checkQuery, [memoryId, userId]);

      if (checkResult.rows.length === 0) {
        await this.db.commitTransaction(client);
        return { restoredCount: 0, timestamp: new Date() };
      }

      // Mark the memory as not archived in the main memories table
      const updateQuery = `
        UPDATE memories
        SET is_archived = FALSE,
            last_accessed = NOW(),
            access_count = access_count + 1
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
      const updateResult = await client.query(updateQuery, [memoryId, userId]);

      // Remove from archived_memories table
      const deleteQuery = `
        DELETE FROM archived_memories
        WHERE id = $1 AND user_id = $2
      `;
      await client.query(deleteQuery, [memoryId, userId]);

      await this.db.commitTransaction(client);
      client = null;

      const restoredCount = updateResult.rowCount ?? 0;

      Logger.info("Restore memory completed", {
        userId,
        memoryId,
        restoredCount,
      });

      return {
        restoredCount,
        timestamp: new Date(),
      };
    } catch (error) {
      if (client) {
        try {
          await this.db.rollbackTransaction(client);
        } catch (rollbackError) {
          Logger.error("Failed to rollback restore transaction:", rollbackError);
        }
      }

      if (error instanceof ArchiveManagerError) {
        throw error;
      }

      Logger.error("Failed to restore memory:", error);
      throw new ArchiveManagerError("Failed to restore memory", "RESTORE_ERROR", {
        userId,
        memoryId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Map a database row to an ArchivedMemory object
   */
  private mapRowToArchivedMemory(row: Record<string, unknown>): ArchivedMemory {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      content: row.content as string,
      metadata: (row.metadata as ArchivedMemory["metadata"]) ?? {},
      embeddings: (row.embeddings as Record<string, number[]>) ?? null,
      archivedAt: new Date(row.archived_at as string),
      originalCreatedAt: new Date(row.original_created_at as string),
      tags: (row.tags as string[]) ?? [],
      primarySector: (row.primary_sector as MemorySectorType) ?? "episodic",
      sessionId: row.session_id as string | undefined,
      salience: (row.salience as number) ?? 0.5,
      strength: (row.strength as number) ?? 1.0,
      accessCount: (row.access_count as number) ?? 0,
      lastAccessed: row.last_accessed ? new Date(row.last_accessed as string) : undefined,
    };
  }

  /**
   * Get archive statistics for a user
   *
   * @param userId - User ID for filtering
   * @returns Archive statistics
   */
  async getArchiveStats(userId: string): Promise<ArchiveStats> {
    if (!userId) {
      throw new ArchiveManagerError("userId is required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      const query = `
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(LENGTH(content)), 0) as bytes_used
        FROM archived_memories
        WHERE user_id = $1
      `;

      const result = await client.query(query, [userId]);

      return {
        count: parseInt(result.rows[0]?.count ?? "0", 10),
        bytesUsed: parseInt(result.rows[0]?.bytes_used ?? "0", 10),
      };
    } catch (error) {
      if (error instanceof ArchiveManagerError) {
        throw error;
      }

      Logger.error("Failed to get archive stats:", error);
      throw new ArchiveManagerError("Failed to get archive stats", "GET_STATS_ERROR", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }
}

/**
 * Factory function to create ArchiveManager
 */
export function createArchiveManager(db: DatabaseConnectionManager): ArchiveManager {
  return new ArchiveManager(db);
}
