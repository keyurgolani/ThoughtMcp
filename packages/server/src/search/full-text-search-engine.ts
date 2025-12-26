/**
 * Full-Text Search Engine
 *
 * PostgreSQL ts_vector-based full-text search with query parsing,
 * result ranking, highlighting, and caching.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { DatabaseConnectionManager } from "../database/connection-manager";
import { MemoryValidationError } from "../memory/types";
import { QueryParser } from "./query-parser";
import { ResultCache } from "./result-cache";
import {
  DEFAULT_SEARCH_CONFIG,
  SearchQueryError,
  SearchValidationError,
  type FullTextSearchQuery,
  type FullTextSearchResponse,
  type FullTextSearchResult,
  type SearchConfig,
  type SearchStatistics,
} from "./types";

/**
 * Full-text search engine using PostgreSQL ts_vector
 */
export class FullTextSearchEngine {
  private readonly db: DatabaseConnectionManager;
  private readonly config: SearchConfig;
  private readonly queryParser: QueryParser;
  private readonly cache: ResultCache;

  constructor(db: DatabaseConnectionManager, config?: Partial<SearchConfig>) {
    this.db = db;
    this.config = { ...DEFAULT_SEARCH_CONFIG, ...config };
    this.queryParser = new QueryParser(this.config.maxQueryLength);
    this.cache = new ResultCache({
      maxSize: 1000, // Cache up to 1000 unique queries
      ttl: this.config.cacheTTL,
    });
  }

  /**
   * Execute full-text search
   *
   * @param query - Search query parameters
   * @returns Search results with statistics
   * @throws SearchValidationError if query is invalid
   * @throws SearchQueryError if database query fails
   */
  async search(query: FullTextSearchQuery): Promise<FullTextSearchResponse> {
    // Validate query
    this.validateQuery(query);

    // Check cache if enabled
    if (this.config.enableCache) {
      const cacheKey = this.cache.generateKey(query);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        // Apply pagination to cached results
        const start = query.offset ?? 0;
        const end = start + (query.maxResults ?? this.config.defaultMaxResults);
        const paginatedResults = cached.results.slice(start, end);

        return {
          results: paginatedResults,
          statistics: {
            ...cached.statistics,
            searchTime: 0, // Cached result, no search time
          },
        };
      }
    }

    const startTime = Date.now();

    try {
      // Parse query
      const language = query.language ?? this.config.defaultLanguage;
      const parsedQuery = this.queryParser.parse(query.query, language);

      // Build and execute search SQL
      const { sql, params } = this.buildSearchSQL(query, parsedQuery, language);
      // Pass original query for proper matchedTerms extraction (excludes NOT terms)
      const results = await this.executeSearch(sql, params, query.query);

      // Get total count
      const totalResults = await this.getTotalCount(query, parsedQuery, language);

      // Verify index usage
      const indexUsed = await this.verifyIndexUsage(query, parsedQuery, language);

      const searchTime = Date.now() - startTime;

      const statistics: SearchStatistics = {
        totalResults,
        searchTime,
        indexUsed,
      };

      const response: FullTextSearchResponse = {
        results,
        statistics,
      };

      // Cache result if enabled (cache full result set, not paginated)
      if (this.config.enableCache) {
        const cacheKey = this.cache.generateKey(query);
        // Cache the full result set for pagination
        const fullResponse: FullTextSearchResponse = {
          results: await this.executeSearch(
            this.buildSearchSQL(
              { ...query, maxResults: totalResults, offset: 0 },
              parsedQuery,
              language
            ).sql,
            this.buildSearchSQL(
              { ...query, maxResults: totalResults, offset: 0 },
              parsedQuery,
              language
            ).params,
            query.query
          ),
          statistics,
        };
        this.cache.set(cacheKey, fullResponse);
      }

      return response;
    } catch (err) {
      if (err instanceof SearchValidationError) {
        throw err;
      }

      // Re-throw MemoryValidationError as-is
      if (err instanceof MemoryValidationError) {
        throw err;
      }

      throw new SearchQueryError(
        `Failed to execute search: ${err instanceof Error ? err.message : String(err)}`,
        query.query,
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Validate query parameters
   *
   * @param query - Query to validate
   * @throws SearchValidationError if query is invalid
   */
  private validateQuery(query: FullTextSearchQuery): void {
    // Query parser will validate the query string itself
    this.queryParser.validate(query.query);

    // Validate maxResults
    if (query.maxResults !== undefined) {
      if (query.maxResults < 1) {
        throw new SearchValidationError(
          "maxResults must be at least 1",
          "maxResults",
          query.maxResults
        );
      }

      if (query.maxResults > this.config.maxAllowedResults) {
        throw new SearchValidationError(
          `maxResults cannot exceed ${this.config.maxAllowedResults}`,
          "maxResults",
          query.maxResults
        );
      }
    }

    // Validate offset
    if (query.offset !== undefined && query.offset < 0) {
      throw new SearchValidationError("offset must be non-negative", "offset", query.offset);
    }

    // Validate strength threshold
    if (query.minStrength !== undefined) {
      if (query.minStrength < 0 || query.minStrength > 1) {
        throw new SearchValidationError(
          "minStrength must be between 0 and 1",
          "minStrength",
          query.minStrength
        );
      }
    }

    // Validate salience threshold
    if (query.minSalience !== undefined) {
      if (query.minSalience < 0 || query.minSalience > 1) {
        throw new SearchValidationError(
          "minSalience must be between 0 and 1",
          "minSalience",
          query.minSalience
        );
      }
    }
  }

  /**
   * Build SQL query for full-text search
   *
   * @param query - Search query parameters
   * @param parsedQuery - Parsed ts_query string
   * @param language - Text search language
   * @returns SQL query and parameters
   */
  private buildSearchSQL(
    query: FullTextSearchQuery,
    parsedQuery: string,
    language: string
  ): { sql: string; params: (string | number)[] } {
    const rankingMode = query.rankingMode ?? this.config.defaultRankingMode;
    const maxResults = Math.min(
      query.maxResults ?? this.config.defaultMaxResults,
      this.config.maxAllowedResults
    );
    const offset = query.offset ?? 0;

    // Use ts_rank or ts_rank_cd based on ranking mode
    const rankFunction = rankingMode === "rank_cd" ? "ts_rank_cd" : "ts_rank";

    let sql = `
      SELECT
        id as "memoryId",
        content,
        ts_headline($1, content, to_tsquery($1, $2),
          'MaxWords=50, MinWords=25, MaxFragments=1') as headline,
        ${rankFunction}(search_vector, to_tsquery($1, $2)) as rank,
        created_at as "createdAt",
        salience,
        strength
      FROM memories
      WHERE search_vector @@ to_tsquery($1, $2)
    `;

    const params: (string | number)[] = [language, parsedQuery];

    // Add filters
    if (query.userId) {
      params.push(query.userId);
      sql += ` AND user_id = $${params.length}`;
    }

    if (query.minStrength !== undefined) {
      params.push(query.minStrength);
      sql += ` AND strength >= $${params.length}`;
    }

    if (query.minSalience !== undefined) {
      params.push(query.minSalience);
      sql += ` AND salience >= $${params.length}`;
    }

    // Add ordering and pagination
    params.push(maxResults, offset);
    sql += ` ORDER BY rank DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    return { sql, params };
  }

  /**
   * Execute search query and return results
   *
   * @param sql - SQL query string
   * @param params - Query parameters
   * @param originalQuery - Original user query for term extraction
   * @returns Array of search results
   */
  private async executeSearch(
    sql: string,
    params: (string | number)[],
    originalQuery?: string
  ): Promise<FullTextSearchResult[]> {
    const client = await this.db.getConnection();

    try {
      const result = await client.query(sql, params);

      // Extract matched terms from the original query (excludes NOT terms)
      // If originalQuery provided, use it; otherwise fall back to extractAllTerms from tsQuery
      const matchedTerms = originalQuery
        ? this.queryParser.extractTerms(originalQuery)
        : this.queryParser.extractAllTerms(params[1] as string);

      return result.rows.map((row) => ({
        memoryId: row.memoryId,
        content: row.content,
        headline: row.headline,
        rank: parseFloat(row.rank),
        matchedTerms,
        createdAt: row.createdAt,
        salience: row.salience,
        strength: row.strength,
      }));
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Get total count of matching results
   *
   * @param query - Search query parameters
   * @param parsedQuery - Parsed ts_query string
   * @param language - Text search language
   * @returns Total number of matching results
   */
  private async getTotalCount(
    query: FullTextSearchQuery,
    parsedQuery: string,
    language: string
  ): Promise<number> {
    const client = await this.db.getConnection();

    try {
      let sql = `
        SELECT COUNT(*) as total
        FROM memories
        WHERE search_vector @@ to_tsquery($1, $2)
      `;

      const params: (string | number)[] = [language, parsedQuery];

      // Add same filters as main query
      if (query.userId) {
        params.push(query.userId);
        sql += ` AND user_id = $${params.length}`;
      }

      if (query.minStrength !== undefined) {
        params.push(query.minStrength);
        sql += ` AND strength >= $${params.length}`;
      }

      if (query.minSalience !== undefined) {
        params.push(query.minSalience);
        sql += ` AND salience >= $${params.length}`;
      }

      const result = await client.query(sql, params);
      return parseInt(result.rows[0].total);
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Verify that GIN index is used for the search
   *
   * @param _query - Search query parameters (unused, for future filtering)
   * @param parsedQuery - Parsed ts_query string
   * @param language - Text search language
   * @returns True if GIN index is used
   */
  private async verifyIndexUsage(
    _query: FullTextSearchQuery,
    parsedQuery: string,
    language: string
  ): Promise<boolean> {
    const client = await this.db.getConnection();

    try {
      const explainSQL = `
        EXPLAIN (FORMAT JSON)
        SELECT * FROM memories
        WHERE search_vector @@ to_tsquery($1, $2)
      `;

      const result = await client.query(explainSQL, [language, parsedQuery]);
      const plan = JSON.stringify(result.rows[0]);

      // Check if plan includes index scan on our GIN index
      return plan.includes("Index") && plan.includes("idx_memories_search_vector");
    } catch {
      // If EXPLAIN fails, assume index is not used
      return false;
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Cache performance statistics
   */
  getCacheStats(): ReturnType<ResultCache["getStats"]> {
    return this.cache.getStats();
  }

  /**
   * Clear search result cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
