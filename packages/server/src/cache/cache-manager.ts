/**
 * Cache Manager with Strategy Pattern
 *
 * Provides a unified caching interface with pluggable backends.
 * Supports in-memory caching by default with optional Redis backend.
 *
 * Requirements: 2.5, 9.5
 * - Pattern-based invalidation for user-scoped cache entries
 * - Cache key namespacing by user ID for efficient invalidation
 */

import { createHash } from "node:crypto";

/**
 * Cache backend interface for strategy pattern
 */
export interface CacheBackend {
  /** Get cached value by key */
  get<T>(key: string): Promise<T | null>;

  /** Set cached value with TTL in milliseconds */
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;

  /** Delete a specific key */
  delete(key: string): Promise<void>;

  /** Delete all keys matching a pattern (glob-style) */
  deletePattern(pattern: string): Promise<number>;

  /** Clear all cache entries */
  clear(): Promise<void>;
}

/**
 * Cache metrics for monitoring
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  backend: "memory" | "redis";
}

/**
 * Cache entry with TTL tracking
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory LRU cache backend implementation
 */
export class InMemoryCache implements CacheBackend {
  private cache: Map<string, CacheEntry<unknown>>;
  private readonly maxSize: number;

  constructor(maxSize: number = 10000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used) for LRU behavior
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
    };

    // Delete and re-add to move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async deletePattern(pattern: string): Promise<number> {
    // Convert glob pattern to regex
    const regexPattern = this.globToRegex(pattern);
    const regex = new RegExp(regexPattern);

    let deletedCount = 0;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      deletedCount++;
    }

    return deletedCount;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get current cache size (for metrics)
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Convert glob pattern to regex
   * Supports * (any characters) and ? (single character)
   */
  private globToRegex(pattern: string): string {
    return `^${
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
        .replace(/\*/g, ".*") // * matches any characters
        .replace(/\?/g, ".") // ? matches single character
    }$`;
  }
}

/**
 * Cache manager configuration
 */
export interface CacheManagerConfig {
  /** Cache backend to use */
  backend?: CacheBackend;
  /** Default TTL in milliseconds (default: 5 minutes) */
  defaultTTL?: number;
  /** Maximum cache size for in-memory backend */
  maxSize?: number;
  /** Cache key prefix */
  prefix?: string;
}

/**
 * Default cache manager configuration
 */
const DEFAULT_CONFIG: Required<Omit<CacheManagerConfig, "backend">> = {
  defaultTTL: 300000, // 5 minutes
  maxSize: 10000,
  prefix: "cache",
};

/**
 * Cache Manager with strategy pattern
 *
 * Provides a unified interface for caching with pluggable backends.
 * Supports user-scoped key namespacing and pattern-based invalidation.
 *
 * Key format: {prefix}:{userId}:{resource}:{hash}
 */
export class CacheManager {
  private readonly backend: CacheBackend;
  private readonly defaultTTL: number;
  private readonly prefix: string;
  private hits: number = 0;
  private misses: number = 0;

  constructor(config: CacheManagerConfig = {}) {
    this.backend = config.backend ?? new InMemoryCache(config.maxSize ?? DEFAULT_CONFIG.maxSize);
    this.defaultTTL = config.defaultTTL ?? DEFAULT_CONFIG.defaultTTL;
    this.prefix = config.prefix ?? DEFAULT_CONFIG.prefix;
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const result = await this.backend.get<T>(key);

    if (result === null) {
      this.misses++;
    } else {
      this.hits++;
    }

    return result;
  }

  /**
   * Set cached value with optional TTL
   */
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.backend.set(key, value, ttlMs ?? this.defaultTTL);
  }

  /**
   * Invalidate specific key
   */
  async invalidate(key: string): Promise<void> {
    await this.backend.delete(key);
  }

  /**
   * Invalidate all keys matching pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    return this.backend.deletePattern(pattern);
  }

  /**
   * Invalidate all cache entries for a user
   *
   * Uses pattern matching to clear all keys with the user's namespace prefix.
   */
  async invalidateUser(userId: string): Promise<number> {
    const pattern = `${this.prefix}:${userId}:*`;
    return this.backend.deletePattern(pattern);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    await this.backend.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    // Determine backend type
    const backendType: "memory" | "redis" =
      this.backend instanceof InMemoryCache ? "memory" : "redis";

    // Get size from backend if available
    const size = this.backend instanceof InMemoryCache ? this.backend.getSize() : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
      size,
      backend: backendType,
    };
  }

  /**
   * Get the cache key prefix
   */
  getPrefix(): string {
    return this.prefix;
  }
}

/**
 * Generate cache key with user-scoped namespacing
 *
 * Format: {prefix}:{userId}:{resource}:{hash}
 *
 * @param prefix - Cache key prefix
 * @param userId - User ID for scoping
 * @param resource - Resource type (e.g., 'memory', 'search')
 * @param params - Parameters to hash for uniqueness
 * @returns Formatted cache key
 */
export function generateCacheKey(
  prefix: string,
  userId: string,
  resource: string,
  params: Record<string, unknown>
): string {
  const paramsStr = JSON.stringify(params, Object.keys(params).sort());
  const hash = createHash("sha256").update(paramsStr).digest("hex").substring(0, 16);

  return `${prefix}:${userId}:${resource}:${hash}`;
}

/**
 * Parse a cache key to extract its components
 *
 * @param key - Cache key to parse
 * @returns Parsed key components or null if invalid format
 */
export function parseCacheKey(
  key: string
): { prefix: string; userId: string; resource: string; hash: string } | null {
  const parts = key.split(":");

  if (parts.length !== 4) {
    return null;
  }

  const [prefix, userId, resource, hash] = parts;
  return { prefix, userId, resource, hash };
}
