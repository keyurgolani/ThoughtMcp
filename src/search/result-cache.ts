/**
 * Result Cache for Full-Text Search
 *
 * LRU cache with TTL for search results to improve performance.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { FullTextSearchQuery, FullTextSearchResponse } from "./types";

/**
 * Cache entry with TTL
 */
interface CacheEntry {
  value: FullTextSearchResponse;
  expiresAt: number;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

/**
 * LRU cache with TTL for search results
 */
export class ResultCache {
  private readonly cache: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private readonly ttl: number; // TTL in milliseconds
  private hits: number = 0;
  private misses: number = 0;

  constructor(config: { maxSize: number; ttl: number }) {
    this.cache = new Map();
    this.maxSize = config.maxSize;
    this.ttl = config.ttl * 1000; // Convert seconds to milliseconds
  }

  /**
   * Get cached search result
   *
   * @param key - Cache key
   * @returns Cached result or null if not found/expired
   */
  get(key: string): FullTextSearchResponse | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.value;
  }

  /**
   * Cache search result
   *
   * @param key - Cache key
   * @param value - Search result to cache
   */
  set(key: string, value: FullTextSearchResponse): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // Add new entry with expiration time
    const entry: CacheEntry = {
      value,
      expiresAt: Date.now() + this.ttl,
    };

    this.cache.set(key, entry);
  }

  /**
   * Generate cache key from query parameters
   *
   * Excludes pagination parameters (maxResults, offset) so paginated
   * queries can share the same cached result set.
   *
   * @param query - Search query
   * @returns Cache key string
   */
  generateKey(query: FullTextSearchQuery): string {
    const keyParts = [
      query.query,
      query.language ?? "english",
      query.rankingMode ?? "rank",
      query.userId ?? "",
      query.minStrength?.toString() ?? "",
      query.minSalience?.toString() ?? "",
    ];

    return keyParts.join("|");
  }

  /**
   * Clear all cached results
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   *
   * @returns Cache performance statistics
   */
  getStats(): CacheStatistics {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
    };
  }

  /**
   * Remove expired entries
   *
   * Called periodically to clean up expired cache entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }
}
