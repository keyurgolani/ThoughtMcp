/**
 * Embedding Cache Implementation
 *
 * LRU (Least Recently Used) cache for embedding vectors with TTL support.
 * Optimizes performance by caching generated embeddings to avoid redundant
 * model calls.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { createHash } from "node:crypto";
import type { EmbeddingCache as IEmbeddingCache, MemorySector } from "./types";

interface CacheEntry {
  value: number[];
  timestamp: number;
  ttl: number;
}

/**
 * LRU cache for embedding vectors
 */
export class EmbeddingCache implements IEmbeddingCache {
  private cache: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(maxSize: number = 10000, defaultTTL: number = 3600000) {
    // defaultTTL in milliseconds (1 hour = 3600000ms)
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Store embedding in cache with optional TTL
   */
  set(key: string, value: number[], ttl?: number): void {
    // If cache is full, remove oldest entry (LRU)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const entry: CacheEntry = {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    };

    // Delete and re-add to move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
  }

  /**
   * Retrieve embedding from cache
   * Returns null if not found or expired
   */
  get(key: string): number[] | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Check if key exists and is valid (not expired)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Generate cache key from sector, content, and optional context
 */
export function generateCacheKey(sector: MemorySector, content: string, context?: unknown): string {
  const contentHash = createHash("sha256").update(content).digest("hex").substring(0, 16);

  let contextHash = "";
  if (context) {
    const contextStr = JSON.stringify(context);
    contextHash = createHash("sha256").update(contextStr).digest("hex").substring(0, 16);
  }

  return contextHash ? `${sector}:${contentHash}:${contextHash}` : `${sector}:${contentHash}`;
}

/**
 * Generic cache entry for any value type
 */
interface GenericCacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

/**
 * Generic LRU cache for any value type with TTL support
 */
export class GenericLRUCache<T> {
  private cache: Map<string, GenericCacheEntry<T>>;
  public readonly maxSize: number;
  public readonly defaultTTL: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 10000, defaultTTL: number = 300000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Store value in cache with optional TTL
   */
  set(key: string, value: T, ttl?: number): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const entry: GenericCacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    };

    this.cache.delete(key);
    this.cache.set(key, entry);
  }

  /**
   * Retrieve value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;

    return entry.value;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
      size: this.cache.size,
    };
  }
}
