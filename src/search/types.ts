/**
 * Full-Text Search Type Definitions
 *
 * Core types and interfaces for PostgreSQL full-text search using ts_vector.
 * Supports boolean operators, phrase matching, and relevance ranking.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

/**
 * Parsed query result from QueryParser
 *
 * Contains the PostgreSQL ts_query string along with separated
 * include and exclude terms for proper matchedTerms handling.
 */
export interface ParsedQuery {
  /** PostgreSQL ts_query formatted string */
  tsQuery: string;

  /** Terms to include in search (positive terms) */
  includeTerms: string[];

  /** Terms to exclude from search (NOT/! terms) */
  excludeTerms: string[];
}

/**
 * Ranking mode for search results
 */
export type RankingMode = "rank" | "rank_cd";

/**
 * Full-text search query parameters
 */
export interface FullTextSearchQuery {
  /** Search query string (supports boolean operators: AND, OR, NOT, phrases) */
  query: string;

  /** Language for text search configuration (default: 'english') */
  language?: string;

  /** Ranking algorithm to use (default: 'rank') */
  rankingMode?: RankingMode;

  /** Maximum number of results to return (default: 100, max: 1000) */
  maxResults?: number;

  /** Pagination offset (default: 0) */
  offset?: number;

  /** Filter by user ID for security isolation */
  userId?: string;

  /** Minimum memory strength threshold (0-1) */
  minStrength?: number;

  /** Minimum salience threshold (0-1) */
  minSalience?: number;
}

/**
 * Full-text search result with highlighted content
 */
export interface FullTextSearchResult {
  /** Memory ID */
  memoryId: string;

  /** Full memory content */
  content: string;

  /** Highlighted snippet with matched terms */
  headline: string;

  /** Relevance rank score (0-1) */
  rank: number;

  /** Terms that matched in the query */
  matchedTerms: string[];

  /** Memory creation timestamp */
  createdAt: Date;

  /** Memory salience score (0-1) */
  salience: number;

  /** Memory strength score (0-1) */
  strength: number;
}

/**
 * Search statistics and performance metrics
 */
export interface SearchStatistics {
  /** Total number of results found */
  totalResults: number;

  /** Search execution time in milliseconds */
  searchTime: number;

  /** Whether GIN index was used for the search */
  indexUsed: boolean;
}

/**
 * Complete search response with results and statistics
 */
export interface FullTextSearchResponse {
  /** Array of search results */
  results: FullTextSearchResult[];

  /** Search statistics */
  statistics: SearchStatistics;
}

/**
 * Configuration for full-text search engine
 */
export interface SearchConfig {
  /** Default language for text search (default: 'english') */
  defaultLanguage: string;

  /** Default ranking mode (default: 'rank') */
  defaultRankingMode: RankingMode;

  /** Default maximum results (default: 100) */
  defaultMaxResults: number;

  /** Maximum allowed results (default: 1000) */
  maxAllowedResults: number;

  /** Cache TTL in seconds (default: 300 = 5 minutes) */
  cacheTTL: number;

  /** Enable query result caching (default: true) */
  enableCache: boolean;

  /** Headline snippet length (default: 150 characters) */
  headlineLength: number;

  /** Maximum query length (default: 1000 characters) */
  maxQueryLength: number;
}

/**
 * Default search configuration
 */
export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  defaultLanguage: "english",
  defaultRankingMode: "rank",
  defaultMaxResults: 100,
  maxAllowedResults: 1000,
  cacheTTL: 300,
  enableCache: true,
  headlineLength: 150,
  maxQueryLength: 1000,
};

/**
 * Error types for search operations
 */
export class SearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SearchError";
  }
}

export class SearchValidationError extends SearchError {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message, "VALIDATION_ERROR", { field, value });
    this.name = "SearchValidationError";
  }
}

export class SearchQueryError extends SearchError {
  constructor(
    message: string,
    public query: string,
    public cause?: Error
  ) {
    super(message, "QUERY_ERROR", { query, cause: cause?.message });
    this.name = "SearchQueryError";
  }
}

export class SearchTimeoutError extends SearchError {
  constructor(
    message: string,
    public duration: number
  ) {
    super(message, "TIMEOUT_ERROR", { duration });
    this.name = "SearchTimeoutError";
  }
}

/**
 * Metadata Filtering Type Definitions
 *
 * Types and interfaces for filtering memories by metadata using PostgreSQL GIN indexes.
 * Supports keyword/tag array filtering, category filtering, importance ranges, and date ranges.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

/**
 * Operator for combining multiple keywords or tags
 */
export type FilterOperator = "AND" | "OR";

/**
 * Metadata filter parameters
 */
export interface MetadataFilters {
  /** Keywords to filter by (uses GIN index) */
  keywords?: string[];

  /** Operator for combining keywords (default: 'AND') */
  keywordOperator?: FilterOperator;

  /** Tags to filter by (uses GIN index) */
  tags?: string[];

  /** Operator for combining tags (default: 'AND') */
  tagOperator?: FilterOperator;

  /** Categories to filter by (OR logic) */
  categories?: string[];

  /** Minimum importance threshold (0-1) */
  importanceMin?: number;

  /** Maximum importance threshold (0-1) */
  importanceMax?: number;

  /** Filter memories created after this date */
  createdAfter?: Date;

  /** Filter memories created before this date */
  createdBefore?: Date;

  /** Filter memories accessed after this date */
  accessedAfter?: Date;

  /** Filter memories accessed before this date */
  accessedBefore?: Date;

  /** Filter by user ID for security isolation */
  userId?: string;

  /** Maximum number of results to return */
  limit?: number;

  /** Pagination offset */
  offset?: number;
}

/**
 * Result of metadata filtering operation
 */
export interface FilterResult {
  /** Array of memory IDs that match the filters */
  memoryIds: string[];

  /** Total count of matching memories */
  count: number;

  /** Execution time in milliseconds */
  executionTimeMs: number;
}

/**
 * Configuration for metadata filter engine
 */
export interface FilterConfig {
  /** Default filter operator (default: 'AND') */
  defaultOperator: FilterOperator;

  /** Default maximum results (default: 1000) */
  defaultMaxResults: number;

  /** Query timeout in milliseconds (default: 5000) */
  queryTimeout: number;

  /** Enable query result caching (default: false) */
  enableCache: boolean;

  /** Cache TTL in seconds (default: 300 = 5 minutes) */
  cacheTTL: number;
}

/**
 * Default filter configuration
 */
export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  defaultOperator: "AND",
  defaultMaxResults: 1000,
  queryTimeout: 5000,
  enableCache: false,
  cacheTTL: 300,
};

/**
 * Error types for metadata filtering operations
 */
export class FilterError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "FilterError";
  }
}

export class FilterValidationError extends FilterError {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message, "VALIDATION_ERROR", { field, value });
    this.name = "FilterValidationError";
  }
}

/**
 * Similarity Discovery Type Definitions
 *
 * Types and interfaces for multi-factor similarity calculation between memories.
 * Supports keyword overlap, tag similarity, content similarity, category matching,
 * and temporal proximity with weighted composite scoring.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

/**
 * Individual similarity factors with their scores
 */
export interface SimilarityFactors {
  /** Keyword overlap using Jaccard similarity (0-1) */
  keywordOverlap: number;

  /** Tag similarity using Jaccard similarity (0-1) */
  tagSimilarity: number;

  /** Content similarity using cosine similarity on embeddings (0-1) */
  contentSimilarity: number;

  /** Category match (1.0 if same, 0.0 if different) */
  categoryMatch: number;

  /** Temporal proximity using exponential decay (0-1) */
  temporalProximity: number;
}

/**
 * Composite similarity score with factor breakdown
 */
export interface SimilarityScore {
  /** Overall composite similarity score (0-1) */
  overall: number;

  /** Individual factor scores */
  factors: SimilarityFactors;
}

/**
 * Memory with similarity score and explanation
 */
export interface SimilarMemory {
  /** Memory ID */
  memoryId: string;

  /** Full memory content */
  content: string;

  /** Similarity score with factor breakdown */
  similarity: SimilarityScore;

  /** Human-readable explanation of similarity */
  explanation: string;

  /** Memory creation timestamp */
  createdAt: Date;

  /** Memory salience score (0-1) */
  salience: number;

  /** Memory strength score (0-1) */
  strength: number;
}

/**
 * Detailed explanation of similarity calculation
 */
export interface SimilarityExplanation {
  /** Summary statement (e.g., "Memories are 78% similar") */
  summary: string;

  /** Detailed breakdown of each factor */
  factors: {
    /** Factor name (e.g., "Keyword Overlap") */
    name: string;

    /** Factor score (0-1) */
    score: number;

    /** Factor weight in composite score (0-1) */
    weight: number;

    /** Factor contribution to overall score (score × weight) */
    contribution: number;

    /** Human-readable details about this factor */
    details: string;
  }[];
}

/**
 * Configuration for similarity calculation
 */
export interface SimilarityConfig {
  /** Weight for keyword overlap factor (default: 0.30) */
  keywordWeight: number;

  /** Weight for tag similarity factor (default: 0.25) */
  tagWeight: number;

  /** Weight for content similarity factor (default: 0.20) */
  contentWeight: number;

  /** Weight for category match factor (default: 0.15) */
  categoryWeight: number;

  /** Weight for temporal proximity factor (default: 0.10) */
  temporalWeight: number;

  /** Decay rate for temporal proximity (default: 0.001) */
  temporalDecayRate: number;

  /** Default similarity threshold (default: 0.5) */
  defaultThreshold: number;

  /** Default maximum results (default: 10) */
  defaultMaxResults: number;

  /** Enable similarity caching (default: true) */
  enableCache: boolean;

  /** Cache TTL in seconds (default: 300 = 5 minutes) */
  cacheTTL: number;
}

/**
 * Default similarity configuration
 */
export const DEFAULT_SIMILARITY_CONFIG: SimilarityConfig = {
  keywordWeight: 0.3,
  tagWeight: 0.25,
  contentWeight: 0.2,
  categoryWeight: 0.15,
  temporalWeight: 0.1,
  temporalDecayRate: 0.001,
  defaultThreshold: 0.5,
  defaultMaxResults: 10,
  enableCache: true,
  cacheTTL: 300,
};

/**
 * Error types for similarity operations
 */
export class SimilarityError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SimilarityError";
  }
}

export class SimilarityValidationError extends SimilarityError {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message, "VALIDATION_ERROR", { field, value });
    this.name = "SimilarityValidationError";
  }
}

export class SimilarityCalculationError extends SimilarityError {
  constructor(
    message: string,
    public memoryId1: string,
    public memoryId2: string,
    public cause?: Error
  ) {
    super(message, "CALCULATION_ERROR", {
      memoryId1,
      memoryId2,
      cause: cause?.message,
    });
    this.name = "SimilarityCalculationError";
  }
}

/**
 * Integrated Search Type Definitions
 *
 * Types and interfaces for the MemorySearchEngine orchestrator that integrates
 * all search strategies (full-text, vector, metadata, similarity) with composite
 * ranking, query caching, and search analytics.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

/**
 * Search strategy type
 */
export type SearchStrategy = "full-text" | "vector" | "metadata" | "similarity" | "hybrid";

/**
 * Integrated search query combining all strategies
 */
export interface IntegratedSearchQuery {
  /** Full-text search query */
  text?: string;

  /** Vector similarity search embedding */
  embedding?: number[];

  /** Which embedding sector to search (default: 'semantic') */
  sector?: string;

  /** Metadata filters */
  metadata?: MetadataFilters;

  /** Memory ID to find similar memories */
  similarTo?: string;

  /** Common parameters */
  userId?: string;
  limit?: number;
  offset?: number;
  minStrength?: number;
  minSalience?: number;
}

/**
 * Result from a single search strategy
 */
export interface StrategyResult {
  /** Strategy that produced this result */
  strategy: SearchStrategy;

  /** Memory ID */
  memoryId: string;

  /** Strategy-specific score (0-1) */
  score: number;

  /** Optional strategy-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Integrated search result with composite ranking
 */
export interface IntegratedSearchResult {
  /** Memory ID */
  memoryId: string;

  /** Full memory content */
  content: string;

  /** Composite score from all strategies (0-1) */
  compositeScore: number;

  /** Individual strategy scores */
  strategyScores: {
    fullText?: number;
    vector?: number;
    metadata?: number;
    similarity?: number;
  };

  /** Result rank (1-based) */
  rank: number;

  /** Memory creation timestamp */
  createdAt: Date;

  /** Memory salience score (0-1) */
  salience: number;

  /** Memory strength score (0-1) */
  strength: number;

  /** Optional explanation of why this memory matched */
  explanation?: string;
}

/**
 * Search analytics data
 */
export interface SearchAnalytics {
  /** Unique query ID */
  queryId: string;

  /** The search query */
  query: IntegratedSearchQuery;

  /** Strategies used in this search */
  strategiesUsed: SearchStrategy[];

  /** Execution time in milliseconds */
  executionTimeMs: number;

  /** Number of results returned */
  resultsCount: number;

  /** Whether result was from cache */
  cacheHit: boolean;

  /** Timestamp of search execution */
  timestamp: Date;
}

/**
 * Summary statistics for search analytics
 */
export interface AnalyticsSummary {
  /** Total number of searches */
  totalSearches: number;

  /** Average execution time in milliseconds */
  avgExecutionTimeMs: number;

  /** Cache hit rate (0-1) */
  cacheHitRate: number;

  /** Count of each strategy used */
  strategiesUsed: Record<SearchStrategy, number>;

  /** Average number of results per search */
  avgResultsCount: number;

  /** Top queries by frequency */
  topQueries: Array<{ query: string; count: number }>;
}

/**
 * Configuration for integrated search engine
 */
export interface IntegratedSearchConfig {
  /** Strategy weights for composite scoring */
  weights: {
    /** Full-text search weight (default: 0.35) */
    fullText: number;

    /** Vector similarity weight (default: 0.35) */
    vector: number;

    /** Metadata filtering weight (default: 0.15) */
    metadata: number;

    /** Similarity discovery weight (default: 0.15) */
    similarity: number;
  };

  /** Performance settings */
  /** Enable parallel strategy execution (default: true) */
  parallelExecution: boolean;

  /** Maximum execution time in milliseconds (default: 5000) */
  maxExecutionTimeMs: number;

  /** Caching settings */
  /** Enable query result caching (default: true) */
  enableCache: boolean;

  /** Cache TTL in seconds (default: 300) */
  cacheTTL: number;

  /** Analytics settings */
  /** Enable search analytics tracking (default: true) */
  enableAnalytics: boolean;

  /** Analytics retention in days (default: 30) */
  analyticsRetentionDays: number;

  /** Default limits */
  /** Default result limit (default: 20) */
  defaultLimit: number;

  /** Maximum result limit (default: 1000) */
  maxLimit: number;
}

/**
 * Default integrated search configuration
 */
export const DEFAULT_INTEGRATED_SEARCH_CONFIG: IntegratedSearchConfig = {
  weights: {
    fullText: 0.35,
    vector: 0.35,
    metadata: 0.15,
    similarity: 0.15,
  },
  parallelExecution: true,
  maxExecutionTimeMs: 5000,
  enableCache: true,
  cacheTTL: 300,
  enableAnalytics: true,
  analyticsRetentionDays: 30,
  defaultLimit: 20,
  maxLimit: 1000,
};

/**
 * Error types for integrated search operations
 */
export class IntegratedSearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "IntegratedSearchError";
  }
}

export class IntegratedSearchValidationError extends IntegratedSearchError {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message, "VALIDATION_ERROR", { field, value });
    this.name = "IntegratedSearchValidationError";
  }
}

export class IntegratedSearchTimeoutError extends IntegratedSearchError {
  constructor(
    message: string,
    public duration: number
  ) {
    super(message, "TIMEOUT_ERROR", { duration });
    this.name = "IntegratedSearchTimeoutError";
  }
}
