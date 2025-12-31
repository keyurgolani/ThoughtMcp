/**
 * Memory Tagging Service
 *
 * Manages memory tags with CRUD operations, hierarchical path support,
 * and search functionality with AND/OR operators.
 *
 * Requirements: 5.1 (tag CRUD), 5.2 (search with operators), 5.5 (hierarchical tags)
 */

import type { PoolClient } from "pg";
import { DatabaseConnectionManager } from "../database/connection-manager";
import { Logger } from "../utils/logger";
import type { Memory, MemorySectorType } from "./types";

/**
 * Memory tag entity
 */
export interface MemoryTag {
  id: string;
  name: string;
  /** Hierarchical path (e.g., "work/projects/alpha") */
  path: string;
  color?: string;
  createdAt: Date;
}

/**
 * Tag suggestion based on content analysis
 */
export interface TagSuggestion {
  tag: string;
  confidence: number;
  reason: string;
}

/**
 * Tag usage statistics
 */
export interface TagStatistics {
  tag: string;
  memoryCount: number;
  lastUsed: Date;
}

/**
 * Search operator for tag-based queries
 */
export type TagSearchOperator = "AND" | "OR";

/**
 * Error class for tagging operations
 */
export class TaggingError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "TaggingError";
  }
}

/**
 * Tagging Service for memory organization
 *
 * Provides tag management with hierarchical path support and search capabilities.
 */
export class TaggingService {
  constructor(private db: DatabaseConnectionManager) {}

  /**
   * Add tags to a memory
   *
   * Requirements: 5.1 - Tag CRUD operations
   *
   * @param memoryId - ID of the memory to tag
   * @param userId - User ID for ownership verification
   * @param tags - Array of tag paths to add (e.g., ["work/projects", "important"])
   */
  async addTags(memoryId: string, userId: string, tags: string[]): Promise<void> {
    if (!memoryId || !userId) {
      throw new TaggingError("memoryId and userId are required", "INVALID_INPUT");
    }

    if (!tags || tags.length === 0) {
      return; // Nothing to add
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.beginTransaction();

      // Verify memory exists and belongs to user
      const memoryCheck = await client.query(
        "SELECT id FROM memories WHERE id = $1 AND user_id = $2",
        [memoryId, userId]
      );

      if (memoryCheck.rows.length === 0) {
        throw new TaggingError("Memory not found or access denied", "NOT_FOUND", {
          memoryId,
          userId,
        });
      }

      // Process each tag
      for (const tagPath of tags) {
        const normalizedPath = this.normalizePath(tagPath);
        if (!normalizedPath) {
          continue; // Skip empty paths
        }

        // Get or create the tag
        const tagId = await this.getOrCreateTag(client, userId, normalizedPath);

        // Create association if it doesn't exist
        await client.query(
          `INSERT INTO memory_tag_associations (memory_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT (memory_id, tag_id) DO NOTHING`,
          [memoryId, tagId]
        );
      }

      await this.db.commitTransaction(client);
    } catch (error) {
      if (client) {
        await this.db.rollbackTransaction(client);
      }

      if (error instanceof TaggingError) {
        throw error;
      }

      Logger.error("Failed to add tags:", error);
      throw new TaggingError("Failed to add tags", "ADD_TAGS_ERROR", {
        memoryId,
        tags,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Remove tags from a memory
   *
   * Requirements: 5.1 - Tag CRUD operations
   *
   * @param memoryId - ID of the memory
   * @param userId - User ID for ownership verification
   * @param tags - Array of tag paths to remove
   */
  async removeTags(memoryId: string, userId: string, tags: string[]): Promise<void> {
    if (!memoryId || !userId) {
      throw new TaggingError("memoryId and userId are required", "INVALID_INPUT");
    }

    if (!tags || tags.length === 0) {
      return; // Nothing to remove
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.beginTransaction();

      // Verify memory exists and belongs to user
      const memoryCheck = await client.query(
        "SELECT id FROM memories WHERE id = $1 AND user_id = $2",
        [memoryId, userId]
      );

      if (memoryCheck.rows.length === 0) {
        throw new TaggingError("Memory not found or access denied", "NOT_FOUND", {
          memoryId,
          userId,
        });
      }

      // Remove associations for each tag
      for (const tagPath of tags) {
        const normalizedPath = this.normalizePath(tagPath);
        if (!normalizedPath) {
          continue;
        }

        // Find the tag by path
        const tagResult = await client.query(
          "SELECT id FROM memory_tags WHERE user_id = $1 AND path = $2",
          [userId, normalizedPath]
        );

        if (tagResult.rows.length > 0) {
          const tagId = tagResult.rows[0].id;
          await client.query(
            "DELETE FROM memory_tag_associations WHERE memory_id = $1 AND tag_id = $2",
            [memoryId, tagId]
          );
        }
      }

      await this.db.commitTransaction(client);
    } catch (error) {
      if (client) {
        await this.db.rollbackTransaction(client);
      }

      if (error instanceof TaggingError) {
        throw error;
      }

      Logger.error("Failed to remove tags:", error);
      throw new TaggingError("Failed to remove tags", "REMOVE_TAGS_ERROR", {
        memoryId,
        tags,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get all tags for a memory
   *
   * Requirements: 5.1 - Tag CRUD operations
   *
   * @param memoryId - ID of the memory
   * @param userId - User ID for ownership verification
   * @returns Array of tags associated with the memory
   */
  async getTags(memoryId: string, userId: string): Promise<MemoryTag[]> {
    if (!memoryId || !userId) {
      throw new TaggingError("memoryId and userId are required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Verify memory exists and belongs to user
      const memoryCheck = await client.query(
        "SELECT id FROM memories WHERE id = $1 AND user_id = $2",
        [memoryId, userId]
      );

      if (memoryCheck.rows.length === 0) {
        throw new TaggingError("Memory not found or access denied", "NOT_FOUND", {
          memoryId,
          userId,
        });
      }

      // Get all tags for the memory
      const result = await client.query(
        `SELECT t.id, t.name, t.path, t.color, t.created_at
         FROM memory_tags t
         INNER JOIN memory_tag_associations mta ON t.id = mta.tag_id
         WHERE mta.memory_id = $1 AND t.user_id = $2
         ORDER BY t.path`,
        [memoryId, userId]
      );

      return result.rows.map((row) => this.rowToTag(row));
    } catch (error) {
      if (error instanceof TaggingError) {
        throw error;
      }

      Logger.error("Failed to get tags:", error);
      throw new TaggingError("Failed to get tags", "GET_TAGS_ERROR", {
        memoryId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Search memories by tags with AND/OR operators
   *
   * Requirements: 5.2 - Search with AND/OR operators
   *
   * @param userId - User ID for filtering
   * @param tags - Array of tag paths to search for
   * @param operator - "AND" (all tags) or "OR" (any tag)
   * @returns Array of memories matching the tag criteria
   */
  async searchByTags(
    userId: string,
    tags: string[],
    operator: TagSearchOperator = "OR"
  ): Promise<Memory[]> {
    if (!userId) {
      throw new TaggingError("userId is required", "INVALID_INPUT");
    }

    if (!tags || tags.length === 0) {
      return []; // No tags to search
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Normalize tag paths
      const normalizedTags = tags
        .map((t) => this.normalizePath(t))
        .filter((t): t is string => t !== null && t.length > 0);

      if (normalizedTags.length === 0) {
        return [];
      }

      let query: string;
      let params: (string | number | string[])[];

      if (operator === "AND") {
        // AND: Memory must have ALL specified tags
        query = `
          SELECT DISTINCT m.*, md.keywords, md.tags, md.category, md.context,
                 md.importance, md.is_atomic, md.parent_id
          FROM memories m
          LEFT JOIN memory_metadata md ON m.id = md.memory_id
          INNER JOIN memory_tag_associations mta ON m.id = mta.memory_id
          INNER JOIN memory_tags t ON mta.tag_id = t.id
          WHERE m.user_id = $1 AND t.path = ANY($2::text[])
          GROUP BY m.id, md.memory_id, md.keywords, md.tags, md.category,
                   md.context, md.importance, md.is_atomic, md.parent_id
          HAVING COUNT(DISTINCT t.path) = $3
          ORDER BY m.created_at DESC
        `;
        params = [userId, normalizedTags, normalizedTags.length];
      } else {
        // OR: Memory must have ANY of the specified tags
        query = `
          SELECT DISTINCT m.*, md.keywords, md.tags, md.category, md.context,
                 md.importance, md.is_atomic, md.parent_id
          FROM memories m
          LEFT JOIN memory_metadata md ON m.id = md.memory_id
          INNER JOIN memory_tag_associations mta ON m.id = mta.memory_id
          INNER JOIN memory_tags t ON mta.tag_id = t.id
          WHERE m.user_id = $1 AND t.path = ANY($2::text[])
          ORDER BY m.created_at DESC
        `;
        params = [userId, normalizedTags];
      }

      const result = await client.query(query, params);

      return result.rows.map((row) => this.rowToMemory(row));
    } catch (error) {
      if (error instanceof TaggingError) {
        throw error;
      }

      Logger.error("Failed to search by tags:", error);
      throw new TaggingError("Failed to search by tags", "SEARCH_TAGS_ERROR", {
        userId,
        tags,
        operator,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Search memories by tag path prefix (hierarchical search)
   *
   * Requirements: 5.5 - Hierarchical tag support
   *
   * @param userId - User ID for filtering
   * @param pathPrefix - Tag path prefix to search (e.g., "work" matches "work/projects/alpha")
   * @returns Array of memories with tags matching the prefix
   */
  async searchByTagPrefix(userId: string, pathPrefix: string): Promise<Memory[]> {
    if (!userId) {
      throw new TaggingError("userId is required", "INVALID_INPUT");
    }

    const normalizedPrefix = this.normalizePath(pathPrefix);
    if (!normalizedPrefix) {
      return [];
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Search for tags that start with the prefix
      const query = `
        SELECT DISTINCT m.*, md.keywords, md.tags, md.category, md.context,
               md.importance, md.is_atomic, md.parent_id
        FROM memories m
        LEFT JOIN memory_metadata md ON m.id = md.memory_id
        INNER JOIN memory_tag_associations mta ON m.id = mta.memory_id
        INNER JOIN memory_tags t ON mta.tag_id = t.id
        WHERE m.user_id = $1 AND (t.path = $2 OR t.path LIKE $3)
        ORDER BY m.created_at DESC
      `;

      const result = await client.query(query, [userId, normalizedPrefix, `${normalizedPrefix}/%`]);

      return result.rows.map((row) => this.rowToMemory(row));
    } catch (error) {
      Logger.error("Failed to search by tag prefix:", error);
      throw new TaggingError("Failed to search by tag prefix", "SEARCH_PREFIX_ERROR", {
        userId,
        pathPrefix,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Get all tags for a user
   *
   * @param userId - User ID
   * @returns Array of all tags belonging to the user
   */
  async getAllTags(userId: string): Promise<MemoryTag[]> {
    if (!userId) {
      throw new TaggingError("userId is required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      const result = await client.query(
        `SELECT id, name, path, color, created_at
         FROM memory_tags
         WHERE user_id = $1
         ORDER BY path`,
        [userId]
      );

      return result.rows.map((row) => this.rowToTag(row));
    } catch (error) {
      Logger.error("Failed to get all tags:", error);
      throw new TaggingError("Failed to get all tags", "GET_ALL_TAGS_ERROR", {
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
   * Get tag usage statistics
   *
   * Requirements: 5.6 - Tag usage statistics (count of memories per tag)
   *
   * @param userId - User ID
   * @returns Array of tag statistics with memory counts
   */
  async getTagStats(userId: string): Promise<TagStatistics[]> {
    if (!userId) {
      throw new TaggingError("userId is required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      const result = await client.query(
        `SELECT
           t.path as tag,
           COUNT(mta.memory_id) as memory_count,
           COALESCE(MAX(mta.created_at), t.created_at) as last_used
         FROM memory_tags t
         LEFT JOIN memory_tag_associations mta ON t.id = mta.tag_id
         WHERE t.user_id = $1
         GROUP BY t.id, t.path, t.created_at
         ORDER BY memory_count DESC, t.path`,
        [userId]
      );

      return result.rows.map((row) => ({
        tag: row.tag as string,
        memoryCount: parseInt(row.memory_count as string, 10),
        lastUsed: new Date(row.last_used as string),
      }));
    } catch (error) {
      Logger.error("Failed to get tag stats:", error);
      throw new TaggingError("Failed to get tag stats", "GET_TAG_STATS_ERROR", {
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
   * Delete a tag with cascade removal from all memories
   *
   * Requirements: 5.4 - When a tag is deleted, remove it from all associated memories
   *
   * @param userId - User ID for ownership verification
   * @param tagId - ID of the tag to delete
   */
  async deleteTag(userId: string, tagId: string): Promise<void> {
    if (!userId) {
      throw new TaggingError("userId is required", "INVALID_INPUT");
    }

    if (!tagId) {
      throw new TaggingError("tagId is required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.beginTransaction();

      // Verify tag exists and belongs to user
      const tagCheck = await client.query(
        "SELECT id FROM memory_tags WHERE id = $1 AND user_id = $2",
        [tagId, userId]
      );

      if (tagCheck.rows.length === 0) {
        throw new TaggingError("Tag not found or access denied", "NOT_FOUND", {
          tagId,
          userId,
        });
      }

      // Delete all associations first (cascade)
      // This removes the tag from all memories
      await client.query("DELETE FROM memory_tag_associations WHERE tag_id = $1", [tagId]);

      // Delete the tag itself
      await client.query("DELETE FROM memory_tags WHERE id = $1 AND user_id = $2", [tagId, userId]);

      await this.db.commitTransaction(client);

      Logger.info(`Tag ${tagId} deleted with cascade removal for user ${userId}`);
    } catch (error) {
      if (client) {
        await this.db.rollbackTransaction(client);
      }

      if (error instanceof TaggingError) {
        throw error;
      }

      Logger.error("Failed to delete tag:", error);
      throw new TaggingError("Failed to delete tag", "DELETE_TAG_ERROR", {
        tagId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get or create a tag by path
   *
   * @param client - Database client (for transaction support)
   * @param userId - User ID
   * @param path - Tag path
   * @returns Tag ID
   */
  private async getOrCreateTag(client: PoolClient, userId: string, path: string): Promise<string> {
    // Try to find existing tag
    const existing = await client.query(
      "SELECT id FROM memory_tags WHERE user_id = $1 AND path = $2",
      [userId, path]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    // Extract name from path (last segment)
    const name = this.extractNameFromPath(path);

    // Create new tag
    const result = await client.query(
      `INSERT INTO memory_tags (user_id, name, path)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, name, path]
    );

    return result.rows[0].id;
  }

  /**
   * Normalize a tag path
   *
   * - Trims whitespace
   * - Converts to lowercase
   * - Removes leading/trailing slashes
   * - Collapses multiple slashes
   *
   * @param path - Raw tag path
   * @returns Normalized path or null if invalid
   */
  private normalizePath(path: string): string | null {
    if (!path || typeof path !== "string") {
      return null;
    }

    const normalized = path
      .trim()
      .toLowerCase()
      .replace(/\/+/g, "/") // Collapse multiple slashes
      .replace(/^\/|\/$/g, ""); // Remove leading/trailing slashes

    if (normalized.length === 0) {
      return null;
    }

    return normalized;
  }

  /**
   * Extract the tag name from a hierarchical path
   *
   * @param path - Tag path (e.g., "work/projects/alpha")
   * @returns Tag name (e.g., "alpha")
   */
  private extractNameFromPath(path: string): string {
    const segments = path.split("/");
    return segments[segments.length - 1];
  }

  /**
   * Convert database row to MemoryTag
   */
  private rowToTag(row: Record<string, unknown>): MemoryTag {
    return {
      id: row.id as string,
      name: row.name as string,
      path: row.path as string,
      color: row.color as string | undefined,
      createdAt: new Date(row.created_at as string),
    };
  }

  /**
   * Convert database row to Memory
   */
  private rowToMemory(row: Record<string, unknown>): Memory {
    return {
      id: row.id as string,
      content: row.content as string,
      createdAt: new Date(row.created_at as string),
      lastAccessed: new Date(row.last_accessed as string),
      accessCount: row.access_count as number,
      salience: parseFloat(row.salience as string),
      decayRate: parseFloat(row.decay_rate as string),
      strength: parseFloat(row.strength as string),
      userId: row.user_id as string,
      sessionId: row.session_id as string,
      primarySector: row.primary_sector as MemorySectorType,
      metadata: {
        keywords: (row.keywords as string[]) ?? [],
        tags: (row.tags as string[]) ?? [],
        category: row.category as string | undefined,
        context: row.context as string | undefined,
        importance: row.importance !== null ? parseFloat(row.importance as string) : undefined,
        isAtomic: row.is_atomic as boolean | undefined,
        parentId: row.parent_id as string | undefined,
      },
      embeddingStatus: row.embedding_status as "pending" | "complete" | "failed" | undefined,
    };
  }
}

/**
 * Factory function to create TaggingService
 */
export function createTaggingService(db: DatabaseConnectionManager): TaggingService {
  return new TaggingService(db);
}
