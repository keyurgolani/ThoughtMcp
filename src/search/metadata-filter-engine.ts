/**
 * Metadata Filter Engine
 *
 * PostgreSQL GIN index-based metadata filtering for memories.
 * Supports keyword/tag array filtering, category filtering,
 * importance range filtering, and date range filtering.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { DatabaseConnectionManager } from "../database/connection-manager";
import {
  DEFAULT_FILTER_CONFIG,
  FilterValidationError,
  type FilterConfig,
  type FilterResult,
  type MetadataFilters,
} from "./types";

/**
 * Metadata filter engine using PostgreSQL GIN indexes
 */
export class MetadataFilterEngine {
  private readonly db: DatabaseConnectionManager;
  private readonly config: FilterConfig;

  constructor(db: DatabaseConnectionManager, config?: Partial<FilterConfig>) {
    this.db = db;
    this.config = { ...DEFAULT_FILTER_CONFIG, ...config };
  }

  /**
   * Filter memories by metadata
   *
   * @param filters - Metadata filter parameters
   * @returns Filter result with memory IDs and statistics
   * @throws FilterValidationError if filters are invalid
   */
  async filter(filters: MetadataFilters): Promise<FilterResult> {
    // Validate filters
    this.validateFilters(filters);

    const startTime = Date.now();

    try {
      // Build SQL query
      const { sql, params } = this.buildFilterQuery(filters);

      // Execute query with timeout
      const client = await this.db.getConnection();
      try {
        // Set statement timeout
        await client.query(`SET statement_timeout = ${this.config.queryTimeout}`);

        // Enable parallel query execution for better performance
        await client.query("SET max_parallel_workers_per_gather = 4");

        // Execute filter query
        const result = await client.query(sql, params);

        const executionTimeMs = Date.now() - startTime;

        return {
          memoryIds: result.rows.map((row) => row.memory_id),
          count: result.rows.length,
          executionTimeMs,
        };
      } finally {
        this.db.releaseConnection(client);
      }
    } catch (err) {
      throw new Error(
        `Failed to execute metadata filter: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Validate filter parameters
   *
   * @param filters - Filters to validate
   * @throws FilterValidationError if filters are invalid
   */
  private validateFilters(filters: MetadataFilters): void {
    this.validateImportanceRange(filters);
    this.validateDateRanges(filters);
    this.validatePaginationParams(filters);
  }

  /**
   * Validate importance range parameters
   *
   * @param filters - Filters to validate
   * @throws FilterValidationError if importance values are invalid
   */
  private validateImportanceRange(filters: MetadataFilters): void {
    if (filters.importanceMin !== undefined) {
      if (filters.importanceMin < 0 || filters.importanceMin > 1) {
        throw new FilterValidationError(
          "importanceMin must be between 0 and 1",
          "importanceMin",
          filters.importanceMin
        );
      }
    }

    if (filters.importanceMax !== undefined) {
      if (filters.importanceMax < 0 || filters.importanceMax > 1) {
        throw new FilterValidationError(
          "importanceMax must be between 0 and 1",
          "importanceMax",
          filters.importanceMax
        );
      }
    }

    if (
      filters.importanceMin !== undefined &&
      filters.importanceMax !== undefined &&
      filters.importanceMin > filters.importanceMax
    ) {
      throw new FilterValidationError(
        "importanceMin cannot be greater than importanceMax",
        "importanceMin",
        filters.importanceMin
      );
    }
  }

  /**
   * Validate date range parameters
   *
   * @param filters - Filters to validate
   * @throws FilterValidationError if date ranges are invalid
   */
  private validateDateRanges(filters: MetadataFilters): void {
    if (
      filters.createdAfter !== undefined &&
      filters.createdBefore !== undefined &&
      filters.createdAfter > filters.createdBefore
    ) {
      throw new FilterValidationError(
        "createdAfter cannot be after createdBefore",
        "createdAfter",
        filters.createdAfter
      );
    }

    if (
      filters.accessedAfter !== undefined &&
      filters.accessedBefore !== undefined &&
      filters.accessedAfter > filters.accessedBefore
    ) {
      throw new FilterValidationError(
        "accessedAfter cannot be after accessedBefore",
        "accessedAfter",
        filters.accessedAfter
      );
    }
  }

  /**
   * Validate pagination parameters
   *
   * @param filters - Filters to validate
   * @throws FilterValidationError if pagination params are invalid
   */
  private validatePaginationParams(filters: MetadataFilters): void {
    if (filters.limit !== undefined && filters.limit <= 0) {
      throw new FilterValidationError("limit must be greater than 0", "limit", filters.limit);
    }

    if (filters.offset !== undefined && filters.offset < 0) {
      throw new FilterValidationError("offset must be non-negative", "offset", filters.offset);
    }
  }

  /**
   * Build SQL query for metadata filtering
   *
   * @param filters - Metadata filters
   * @returns SQL query and parameters
   */
  private buildFilterQuery(filters: MetadataFilters): { sql: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build filter conditions using helper methods
    paramIndex = this.buildKeywordFilter(filters, conditions, params, paramIndex);
    paramIndex = this.buildTagFilter(filters, conditions, params, paramIndex);
    paramIndex = this.buildCategoryFilter(filters, conditions, params, paramIndex);
    paramIndex = this.buildImportanceRangeFilter(filters, conditions, params, paramIndex);
    paramIndex = this.buildDateRangeFilters(filters, conditions, params, paramIndex);
    paramIndex = this.buildUserIdFilter(filters, conditions, params, paramIndex);

    // Build WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Build LIMIT and OFFSET
    const limit = filters.limit ?? this.config.defaultMaxResults;
    const offset = filters.offset ?? 0;

    // Build complete SQL query
    const sql = `
      SELECT mm.memory_id
      FROM memory_metadata mm
      INNER JOIN memories m ON mm.memory_id = m.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${paramIndex}
      OFFSET $${paramIndex + 1}
    `.trim();

    params.push(limit, offset);

    return { sql, params };
  }

  /**
   * Build keyword filter condition
   *
   * @param filters - Metadata filters
   * @param conditions - Array to append conditions to
   * @param params - Array to append parameters to
   * @param paramIndex - Current parameter index
   * @returns Updated parameter index
   */
  private buildKeywordFilter(
    filters: MetadataFilters,
    conditions: string[],
    params: unknown[],
    paramIndex: number
  ): number {
    if (filters.keywords && filters.keywords.length > 0) {
      const keywordOperator = filters.keywordOperator ?? this.config.defaultOperator;
      if (keywordOperator === "AND") {
        // All keywords must be present
        conditions.push(`mm.keywords @> $${paramIndex}`);
      } else {
        // Any keyword must be present
        conditions.push(`mm.keywords && $${paramIndex}`);
      }
      params.push(filters.keywords);
      paramIndex++;
    }
    return paramIndex;
  }

  /**
   * Build tag filter condition
   *
   * @param filters - Metadata filters
   * @param conditions - Array to append conditions to
   * @param params - Array to append parameters to
   * @param paramIndex - Current parameter index
   * @returns Updated parameter index
   */
  private buildTagFilter(
    filters: MetadataFilters,
    conditions: string[],
    params: unknown[],
    paramIndex: number
  ): number {
    if (filters.tags && filters.tags.length > 0) {
      const tagOperator = filters.tagOperator ?? this.config.defaultOperator;
      if (tagOperator === "AND") {
        // All tags must be present
        conditions.push(`mm.tags @> $${paramIndex}`);
      } else {
        // Any tag must be present
        conditions.push(`mm.tags && $${paramIndex}`);
      }
      params.push(filters.tags);
      paramIndex++;
    }
    return paramIndex;
  }

  /**
   * Build category filter condition
   *
   * @param filters - Metadata filters
   * @param conditions - Array to append conditions to
   * @param params - Array to append parameters to
   * @param paramIndex - Current parameter index
   * @returns Updated parameter index
   */
  private buildCategoryFilter(
    filters: MetadataFilters,
    conditions: string[],
    params: unknown[],
    paramIndex: number
  ): number {
    if (filters.categories && filters.categories.length > 0) {
      conditions.push(`mm.category = ANY($${paramIndex})`);
      params.push(filters.categories);
      paramIndex++;
    }
    return paramIndex;
  }

  /**
   * Build importance range filter conditions
   *
   * @param filters - Metadata filters
   * @param conditions - Array to append conditions to
   * @param params - Array to append parameters to
   * @param paramIndex - Current parameter index
   * @returns Updated parameter index
   */
  private buildImportanceRangeFilter(
    filters: MetadataFilters,
    conditions: string[],
    params: unknown[],
    paramIndex: number
  ): number {
    if (filters.importanceMin !== undefined) {
      conditions.push(`mm.importance >= $${paramIndex}`);
      params.push(filters.importanceMin);
      paramIndex++;
    }

    if (filters.importanceMax !== undefined) {
      conditions.push(`mm.importance <= $${paramIndex}`);
      params.push(filters.importanceMax);
      paramIndex++;
    }

    return paramIndex;
  }

  /**
   * Build date range filter conditions
   *
   * @param filters - Metadata filters
   * @param conditions - Array to append conditions to
   * @param params - Array to append parameters to
   * @param paramIndex - Current parameter index
   * @returns Updated parameter index
   */
  private buildDateRangeFilters(
    filters: MetadataFilters,
    conditions: string[],
    params: unknown[],
    paramIndex: number
  ): number {
    // Filter by created date range
    if (filters.createdAfter !== undefined) {
      conditions.push(`m.created_at >= $${paramIndex}`);
      params.push(filters.createdAfter);
      paramIndex++;
    }

    if (filters.createdBefore !== undefined) {
      conditions.push(`m.created_at <= $${paramIndex}`);
      params.push(filters.createdBefore);
      paramIndex++;
    }

    // Filter by accessed date range
    if (filters.accessedAfter !== undefined) {
      conditions.push(`m.last_accessed >= $${paramIndex}`);
      params.push(filters.accessedAfter);
      paramIndex++;
    }

    if (filters.accessedBefore !== undefined) {
      conditions.push(`m.last_accessed <= $${paramIndex}`);
      params.push(filters.accessedBefore);
      paramIndex++;
    }

    return paramIndex;
  }

  /**
   * Build user ID filter condition
   *
   * @param filters - Metadata filters
   * @param conditions - Array to append conditions to
   * @param params - Array to append parameters to
   * @param paramIndex - Current parameter index
   * @returns Updated parameter index
   */
  private buildUserIdFilter(
    filters: MetadataFilters,
    conditions: string[],
    params: unknown[],
    paramIndex: number
  ): number {
    if (filters.userId !== undefined) {
      conditions.push(`m.user_id = $${paramIndex}`);
      params.push(filters.userId);
      paramIndex++;
    }
    return paramIndex;
  }
}
