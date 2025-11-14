/**
 * Search Module Exports
 *
 * Full-text search and metadata filtering functionality using PostgreSQL.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

export { FullTextSearchEngine } from "./full-text-search-engine";
export { MemorySearchEngine } from "./memory-search-engine";
export { MetadataFilterEngine } from "./metadata-filter-engine";
export { QueryParser } from "./query-parser";
export { ResultCache } from "./result-cache";
export type { CacheStatistics } from "./result-cache";
export { SimilarMemoryFinder } from "./similar-memory-finder";
export type { FindSimilarOptions, SimilarityBreakdown } from "./similar-memory-finder";
export * from "./types";
