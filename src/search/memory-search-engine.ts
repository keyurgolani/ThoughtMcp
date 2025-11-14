/**
 * Memory Search Engine - Integrated Search Orchestrator
 *
 * Phase 3 Task 3.4.2: Implement integrated search system
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 *
 * Orchestrates all search strategies (full-text, vector, metadata, similarity)
 * with composite ranking, query caching, and search analytics.
 *
 * Features:
 * - Multi-strategy parallel execution
 * - Composite scoring with configurable weights
 * - Query result caching with TTL
 * - Search analytics tracking
 * - Pagination and result limiting
 * - Performance optimization
 */

import type { DatabaseConnectionManager } from "../database/connection-manager";
import type { EmbeddingStorage } from "../embeddings/embedding-storage";
import { MemorySector } from "../embeddings/types";
import { FullTextSearchEngine } from "./full-text-search-engine";
import { MetadataFilterEngine } from "./metadata-filter-engine";
import { SimilarMemoryFinder } from "./similar-memory-finder";
import {
  DEFAULT_INTEGRATED_SEARCH_CONFIG,
  type AnalyticsSummary,
  type IntegratedSearchConfig,
  type IntegratedSearchQuery,
  type IntegratedSearchResult,
  type IntegratedSearchTimeoutError,
  type IntegratedSearchValidationError,
  type SearchAnalytics,
  type SearchStrategy,
  type StrategyResult,
} from "./types";

/**
 * Integrated search engine orchestrating all search strategies
 */
export class MemorySearchEngine {
  private db: DatabaseConnectionManager;
  private fullTextSearch: FullTextSearchEngine;
  private metadataFilter: MetadataFilterEngine;
  private similarityFinder: SimilarMemoryFinder;
  private embeddingStorage: EmbeddingStorage;
  private resultCache: Map<string, { value: IntegratedSearchResult[]; expiresAt: number }>;
  private config: IntegratedSearchConfig;
  private analytics: SearchAnalytics[] = [];
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor(
    db: DatabaseConnectionManager,
    embeddingStorage: EmbeddingStorage,
    config: Partial<IntegratedSearchConfig> = {}
  ) {
    this.db = db;
    this.embeddingStorage = embeddingStorage;
    this.config = { ...DEFAULT_INTEGRATED_SEARCH_CONFIG, ...config };

    // Initialize search components
    this.fullTextSearch = new FullTextSearchEngine(db, {
      enableCache: this.config.enableCache,
      cacheTTL: this.config.cacheTTL,
    });

    this.metadataFilter = new MetadataFilterEngine(db);
    this.similarityFinder = new SimilarMemoryFinder(db);

    this.resultCache = new Map();
  }

  /**
   * Execute integrated search across all applicable strategies
   */
  async search(query: IntegratedSearchQuery): Promise<IntegratedSearchResult[]> {
    const startTime = Date.now();

    // Validate query
    this.validateQuery(query);

    // Check cache first
    const cacheKey = this.generateCacheKey(query);
    if (this.config.enableCache) {
      const entry = this.resultCache.get(cacheKey);
      if (entry && Date.now() < entry.expiresAt) {
        this.cacheHits++;
        // Track cache hit
        if (this.config.enableAnalytics) {
          this.trackAnalytics(query, entry.value, 0, true);
        }
        return entry.value;
      } else if (entry) {
        // Expired entry
        this.resultCache.delete(cacheKey);
        this.cacheMisses++;
      } else {
        this.cacheMisses++;
      }
    }

    // Determine which strategies to execute
    const strategies = this.determineStrategies(query);

    // Execute strategies
    let strategyResults: Map<SearchStrategy, StrategyResult[]>;
    try {
      if (this.config.parallelExecution) {
        strategyResults = await this.executeStrategiesParallel(query, strategies);
      } else {
        strategyResults = await this.executeStrategiesSequential(query, strategies);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("timeout")) {
        const timeoutError: IntegratedSearchTimeoutError = {
          name: "IntegratedSearchTimeoutError",
          message: `Search exceeded maximum execution time of ${this.config.maxExecutionTimeMs}ms`,
          code: "TIMEOUT_ERROR",
          duration: Date.now() - startTime,
        } as IntegratedSearchTimeoutError;
        throw timeoutError;
      }
      throw error;
    }

    // Combine and rank results
    const results = await this.combineResults(strategyResults, query);

    // Apply pagination
    const paginatedResults = this.applyPagination(results, query);

    // Cache results
    if (this.config.enableCache) {
      const expiresAt = Date.now() + this.config.cacheTTL * 1000;
      this.resultCache.set(cacheKey, { value: paginatedResults, expiresAt });

      // Enforce cache size limit (simple LRU)
      if (this.resultCache.size > 1000) {
        const firstKey = this.resultCache.keys().next().value;
        if (firstKey) {
          this.resultCache.delete(firstKey);
        }
      }
    }

    // Track analytics
    const executionTime = Date.now() - startTime;
    if (this.config.enableAnalytics) {
      this.trackAnalytics(query, paginatedResults, executionTime, false);
    }

    return paginatedResults;
  }

  /**
   * Validate search query parameters
   */
  private validateQuery(query: IntegratedSearchQuery): void {
    this.validateLimit(query.limit);
    this.validateOffset(query.offset);
    this.validateThreshold(query.minStrength, "minStrength");
    this.validateThreshold(query.minSalience, "minSalience");
    this.validateSearchCriteria(query);
  }

  /**
   * Validate limit parameter
   */
  private validateLimit(limit: number | undefined): void {
    if (limit === undefined) return;

    if (limit < 0) {
      throw {
        name: "IntegratedSearchValidationError",
        message: "Limit must be non-negative",
        code: "VALIDATION_ERROR",
        field: "limit",
        value: limit,
      } as IntegratedSearchValidationError;
    }

    if (limit > this.config.maxLimit) {
      throw {
        name: "IntegratedSearchValidationError",
        message: `Limit cannot exceed ${this.config.maxLimit}`,
        code: "VALIDATION_ERROR",
        field: "limit",
        value: limit,
      } as IntegratedSearchValidationError;
    }
  }

  /**
   * Validate offset parameter
   */
  private validateOffset(offset: number | undefined): void {
    if (offset !== undefined && offset < 0) {
      throw {
        name: "IntegratedSearchValidationError",
        message: "Offset must be non-negative",
        code: "VALIDATION_ERROR",
        field: "offset",
        value: offset,
      } as IntegratedSearchValidationError;
    }
  }

  /**
   * Validate threshold parameter (0-1 range)
   */
  private validateThreshold(value: number | undefined, field: string): void {
    if (value !== undefined && (value < 0 || value > 1)) {
      throw {
        name: "IntegratedSearchValidationError",
        message: `${field} must be between 0 and 1`,
        code: "VALIDATION_ERROR",
        field,
        value,
      } as IntegratedSearchValidationError;
    }
  }

  /**
   * Validate at least one search criterion is provided
   */
  private validateSearchCriteria(query: IntegratedSearchQuery): void {
    if (!query.text && !query.embedding && !query.metadata && !query.similarTo) {
      throw {
        name: "IntegratedSearchValidationError",
        message: "At least one search criterion must be provided",
        code: "VALIDATION_ERROR",
        field: "query",
        value: query,
      } as IntegratedSearchValidationError;
    }
  }

  /**
   * Determine which strategies to execute based on query
   */
  private determineStrategies(query: IntegratedSearchQuery): SearchStrategy[] {
    const strategies: SearchStrategy[] = [];

    if (query.text) {
      strategies.push("full-text");
    }

    if (query.embedding) {
      strategies.push("vector");
    }

    if (query.metadata) {
      strategies.push("metadata");
    }

    if (query.similarTo) {
      strategies.push("similarity");
    }

    return strategies;
  }

  /**
   * Execute strategies in parallel
   */
  private async executeStrategiesParallel(
    query: IntegratedSearchQuery,
    strategies: SearchStrategy[]
  ): Promise<Map<SearchStrategy, StrategyResult[]>> {
    const promises: Promise<[SearchStrategy, StrategyResult[]]>[] = [];

    for (const strategy of strategies) {
      promises.push(this.executeStrategy(query, strategy));
    }

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Search timeout")), this.config.maxExecutionTimeMs);
    });

    const results = await Promise.race([Promise.all(promises), timeoutPromise]);

    return new Map(results);
  }

  /**
   * Execute strategies sequentially
   */
  private async executeStrategiesSequential(
    query: IntegratedSearchQuery,
    strategies: SearchStrategy[]
  ): Promise<Map<SearchStrategy, StrategyResult[]>> {
    const results = new Map<SearchStrategy, StrategyResult[]>();
    const startTime = Date.now();

    for (const strategy of strategies) {
      // Check timeout
      if (Date.now() - startTime > this.config.maxExecutionTimeMs) {
        throw new Error("Search timeout");
      }

      const [strategyName, strategyResults] = await this.executeStrategy(query, strategy);
      results.set(strategyName, strategyResults);
    }

    return results;
  }

  /**
   * Execute a single search strategy
   */
  private async executeStrategy(
    query: IntegratedSearchQuery,
    strategy: SearchStrategy
  ): Promise<[SearchStrategy, StrategyResult[]]> {
    try {
      switch (strategy) {
        case "full-text":
          return ["full-text", await this.executeFullTextSearch(query)];
        case "vector":
          return ["vector", await this.executeVectorSearch(query)];
        case "metadata":
          return ["metadata", await this.executeMetadataFilter(query)];
        case "similarity":
          return ["similarity", await this.executeSimilaritySearch(query)];
        default:
          return [strategy, []];
      }
    } catch {
      // Log error but don't fail entire search
      // Strategy failure is tracked but doesn't block other strategies
      return [strategy, []];
    }
  }

  /**
   * Execute full-text search strategy
   */
  private async executeFullTextSearch(query: IntegratedSearchQuery): Promise<StrategyResult[]> {
    if (!query.text) {
      return [];
    }

    const results = await this.fullTextSearch.search({
      query: query.text,
      userId: query.userId,
      maxResults: query.limit ?? this.config.defaultLimit,
      offset: 0, // Don't apply offset at strategy level
      minStrength: query.minStrength,
      minSalience: query.minSalience,
    });

    return results.results.map((result) => ({
      strategy: "full-text" as SearchStrategy,
      memoryId: result.memoryId,
      score: result.rank,
      metadata: {
        headline: result.headline,
        matchedTerms: result.matchedTerms,
      },
    }));
  }

  /**
   * Execute vector similarity search strategy
   */
  private async executeVectorSearch(query: IntegratedSearchQuery): Promise<StrategyResult[]> {
    if (!query.embedding) {
      return [];
    }

    const sector = (query.sector as MemorySector) ?? MemorySector.Semantic;
    const limit = query.limit ?? this.config.defaultLimit;

    const results = await this.embeddingStorage.vectorSimilaritySearch(
      query.embedding,
      sector,
      limit,
      0.0 // No threshold, we'll filter later
    );

    return results.map((result) => ({
      strategy: "vector" as SearchStrategy,
      memoryId: result.memoryId,
      score: result.similarity,
      metadata: {
        sector: result.sector,
      },
    }));
  }

  /**
   * Execute metadata filtering strategy
   */
  private async executeMetadataFilter(query: IntegratedSearchQuery): Promise<StrategyResult[]> {
    if (!query.metadata) {
      return [];
    }

    const results = await this.metadataFilter.filter({
      ...query.metadata,
      userId: query.userId,
      limit: query.limit ?? this.config.defaultLimit,
      offset: 0, // Don't apply offset at strategy level
    });

    // Metadata filter returns IDs only, assign uniform score
    return results.memoryIds.map((memoryId) => ({
      strategy: "metadata" as SearchStrategy,
      memoryId,
      score: 1.0, // Uniform score for metadata matches
      metadata: {},
    }));
  }

  /**
   * Execute similarity discovery strategy
   */
  private async executeSimilaritySearch(query: IntegratedSearchQuery): Promise<StrategyResult[]> {
    if (!query.similarTo) {
      return [];
    }

    const results = await this.similarityFinder.findSimilar(query.similarTo, {
      limit: query.limit ?? this.config.defaultLimit,
      minSimilarity: 0.0, // No threshold, we'll filter later
      includeExplanation: true,
    });

    return results.map((result) => ({
      strategy: "similarity" as SearchStrategy,
      memoryId: result.memoryId,
      score: result.similarity.overall,
      metadata: {
        explanation: result.explanation,
        factors: result.similarity.factors,
      },
    }));
  }

  /**
   * Combine results from all strategies with composite scoring
   */
  private async combineResults(
    strategyResults: Map<SearchStrategy, StrategyResult[]>,
    query: IntegratedSearchQuery
  ): Promise<IntegratedSearchResult[]> {
    // Collect all unique memory IDs
    const memoryScores = new Map<
      string,
      {
        scores: Map<SearchStrategy, number>;
        metadata: Map<SearchStrategy, Record<string, unknown>>;
      }
    >();

    for (const [strategy, results] of strategyResults) {
      for (const result of results) {
        if (!memoryScores.has(result.memoryId)) {
          memoryScores.set(result.memoryId, {
            scores: new Map(),
            metadata: new Map(),
          });
        }

        const memoryData = memoryScores.get(result.memoryId);
        if (memoryData) {
          memoryData.scores.set(strategy, result.score);
          if (result.metadata) {
            memoryData.metadata.set(strategy, result.metadata);
          }
        }
      }
    }

    // Calculate composite scores and fetch memory data
    const results: IntegratedSearchResult[] = [];

    for (const [memoryId, data] of memoryScores) {
      const compositeScore = this.calculateCompositeScore(data.scores);

      // Fetch full memory data
      const memoryData = await this.fetchMemoryData(memoryId);
      if (!memoryData) {
        continue; // Skip if memory not found
      }

      // Apply strength and salience filters
      if (query.minStrength && memoryData.strength < query.minStrength) {
        continue;
      }
      if (query.minSalience && memoryData.salience < query.minSalience) {
        continue;
      }

      results.push({
        memoryId,
        content: memoryData.content,
        compositeScore,
        strategyScores: {
          fullText: data.scores.get("full-text"),
          vector: data.scores.get("vector"),
          metadata: data.scores.get("metadata"),
          similarity: data.scores.get("similarity"),
        },
        rank: 0, // Will be set after sorting
        createdAt: memoryData.createdAt,
        salience: memoryData.salience,
        strength: memoryData.strength,
        explanation: this.generateExplanation(data.scores, data.metadata),
      });
    }

    // Sort by composite score and assign ranks
    results.sort((a, b) => b.compositeScore - a.compositeScore);
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    return results;
  }

  /**
   * Calculate composite score from strategy scores
   */
  private calculateCompositeScore(strategyScores: Map<SearchStrategy, number>): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const [strategy, score] of strategyScores) {
      let weight = 0;
      switch (strategy) {
        case "full-text":
          weight = this.config.weights.fullText;
          break;
        case "vector":
          weight = this.config.weights.vector;
          break;
        case "metadata":
          weight = this.config.weights.metadata;
          break;
        case "similarity":
          weight = this.config.weights.similarity;
          break;
      }

      totalScore += score * weight;
      totalWeight += weight;
    }

    // Normalize by total weight
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Fetch full memory data from database
   */
  private async fetchMemoryData(memoryId: string): Promise<{
    content: string;
    createdAt: Date;
    salience: number;
    strength: number;
  } | null> {
    if (!this.db.pool) {
      throw new Error("Database not connected");
    }

    const result = await this.db.pool.query(
      `SELECT content, created_at, salience, strength
       FROM memories
       WHERE id = $1`,
      [memoryId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      content: row.content,
      createdAt: row.created_at,
      salience: parseFloat(row.salience),
      strength: parseFloat(row.strength),
    };
  }

  /**
   * Generate explanation for why memory matched
   */
  private generateExplanation(
    scores: Map<SearchStrategy, number>,
    metadata: Map<SearchStrategy, Record<string, unknown>>
  ): string {
    const parts: string[] = [];

    const fullTextScore = scores.get("full-text");
    if (fullTextScore !== undefined) {
      const meta = metadata.get("full-text");
      const terms = meta?.matchedTerms as string[] | undefined;
      parts.push(
        `Full-text match (${(fullTextScore * 100).toFixed(0)}%)${terms ? ` for terms: ${terms.join(", ")}` : ""}`
      );
    }

    const vectorScore = scores.get("vector");
    if (vectorScore !== undefined) {
      parts.push(`Vector similarity (${(vectorScore * 100).toFixed(0)}%)`);
    }

    if (scores.has("metadata")) {
      parts.push("Metadata match");
    }

    const similarityScore = scores.get("similarity");
    if (similarityScore !== undefined) {
      parts.push(`Similar memory (${(similarityScore * 100).toFixed(0)}%)`);
    }

    return parts.join("; ");
  }

  /**
   * Apply pagination to results
   */
  private applyPagination(
    results: IntegratedSearchResult[],
    query: IntegratedSearchQuery
  ): IntegratedSearchResult[] {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? this.config.defaultLimit;

    return results.slice(offset, offset + limit);
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: IntegratedSearchQuery): string {
    // Exclude pagination parameters from cache key
    const cacheQuery = {
      text: query.text,
      embedding: query.embedding ? "present" : undefined,
      sector: query.sector,
      metadata: query.metadata,
      similarTo: query.similarTo,
      userId: query.userId,
      minStrength: query.minStrength,
      minSalience: query.minSalience,
    };

    return JSON.stringify(cacheQuery);
  }

  /**
   * Track search analytics
   */
  private trackAnalytics(
    query: IntegratedSearchQuery,
    results: IntegratedSearchResult[],
    executionTimeMs: number,
    cacheHit: boolean
  ): void {
    const strategies = this.determineStrategies(query);

    const analytics: SearchAnalytics = {
      queryId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query,
      strategiesUsed: strategies,
      executionTimeMs,
      resultsCount: results.length,
      cacheHit,
      timestamp: new Date(),
    };

    this.analytics.push(analytics);

    // Cleanup old analytics based on retention
    const retentionMs = this.config.analyticsRetentionDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - retentionMs);
    this.analytics = this.analytics.filter((a) => a.timestamp >= cutoffDate);
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary(startDate?: Date, endDate?: Date): AnalyticsSummary {
    let filteredAnalytics = this.analytics;

    if (startDate) {
      filteredAnalytics = filteredAnalytics.filter((a) => a.timestamp >= startDate);
    }

    if (endDate) {
      filteredAnalytics = filteredAnalytics.filter((a) => a.timestamp <= endDate);
    }

    if (filteredAnalytics.length === 0) {
      return {
        totalSearches: 0,
        avgExecutionTimeMs: 0,
        cacheHitRate: 0,
        strategiesUsed: {
          "full-text": 0,
          vector: 0,
          metadata: 0,
          similarity: 0,
          hybrid: 0,
        },
        avgResultsCount: 0,
        topQueries: [],
      };
    }

    // Calculate statistics
    const totalSearches = filteredAnalytics.length;
    const avgExecutionTimeMs =
      filteredAnalytics.reduce((sum, a) => sum + a.executionTimeMs, 0) / totalSearches;
    const cacheHits = filteredAnalytics.filter((a) => a.cacheHit).length;
    const cacheHitRate = cacheHits / totalSearches;

    // Count strategy usage
    const strategiesUsed: Record<SearchStrategy, number> = {
      "full-text": 0,
      vector: 0,
      metadata: 0,
      similarity: 0,
      hybrid: 0,
    };

    for (const analytics of filteredAnalytics) {
      for (const strategy of analytics.strategiesUsed) {
        strategiesUsed[strategy]++;
      }
    }

    const avgResultsCount =
      filteredAnalytics.reduce((sum, a) => sum + a.resultsCount, 0) / totalSearches;

    // Find top queries
    const queryFrequency = new Map<string, number>();
    for (const analytics of filteredAnalytics) {
      const queryKey = analytics.query.text ?? JSON.stringify(analytics.query);
      queryFrequency.set(queryKey, (queryFrequency.get(queryKey) ?? 0) + 1);
    }

    const topQueries = Array.from(queryFrequency.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalSearches,
      avgExecutionTimeMs,
      cacheHitRate,
      strategiesUsed,
      avgResultsCount,
      topQueries,
    };
  }

  /**
   * Clear result cache
   */
  clearCache(): void {
    this.resultCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.fullTextSearch.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    hits: number;
    misses: number;
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: this.resultCache.size,
      maxSize: 1000,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    };
  }
}
