/**
 * Response Cache Middleware
 *
 * HTTP-level caching for read-heavy endpoints to improve performance.
 * Uses in-memory LRU cache with configurable TTL per endpoint.
 *
 * Requirements: 17.1 - Memory retrieval response within 200ms at p95
 */

import type { NextFunction, Request, Response } from "express";
import { createHash } from "node:crypto";

/**
 * Cache entry structure
 */
interface CacheEntry {
  body: unknown;
  statusCode: number;
  headers: Record<string, string>;
  timestamp: number;
  ttl: number;
}

/**
 * Response cache configuration
 */
export interface ResponseCacheConfig {
  /** Maximum number of cached responses */
  maxSize: number;
  /** Default TTL in milliseconds */
  defaultTTL: number;
  /** TTL overrides per path pattern */
  pathTTL?: Record<string, number>;
  /** Paths to exclude from caching */
  excludePaths?: string[];
  /** POST paths to include in caching (read-only POST endpoints) */
  includePOSTPaths?: string[];
  /** Whether to cache based on query parameters */
  includeQuery?: boolean;
  /** Whether to cache based on userId header/param */
  includeUserId?: boolean;
  /** Whether to include request body in cache key for POST requests */
  includeBody?: boolean;
}

/**
 * Default response cache configuration
 *
 * Requirements: 17.1 - Memory retrieval response within 200ms at p95
 */
export const DEFAULT_RESPONSE_CACHE_CONFIG: ResponseCacheConfig = {
  maxSize: 2000, // Increased for better hit rate
  defaultTTL: 30000, // 30 seconds
  pathTTL: {
    "/api/v1/health": 5000, // 5 seconds for health checks
    "/api/v1/health/live": 1000, // 1 second for liveness
    "/api/v1/health/ready": 1000, // 1 second for readiness
    "/api/v1/docs": 3600000, // 1 hour for docs (static)
    "/api/v1/config": 60000, // 1 minute for config
    "/api/v1/metacognition/biases": 300000, // 5 minutes for bias library (static)
    "/api/v1/memory/stats": 10000, // 10 seconds for memory stats
    "/api/v1/memory/graph": 15000, // 15 seconds for graph data
    "/api/v1/memory/timeline": 15000, // 15 seconds for timeline data
    "/api/v1/memory/recall": 5000, // 5 seconds for recall (short TTL for freshness)
    "/api/v1/memory/search": 5000, // 5 seconds for search
    "/api/v1/memory/batch/recall": 5000, // 5 seconds for batch recall
  },
  excludePaths: [
    "/api/v1/memory/store",
    "/api/v1/memory/update",
    "/api/v1/memory/batch/store",
    "/api/v1/session/create",
    "/api/v1/think",
    "/api/v1/reasoning/parallel",
    "/api/v1/problem/decompose",
    "/api/v1/emotion/detect",
  ],
  // POST endpoints that are read-only and can be cached
  includePOSTPaths: [
    "/api/v1/memory/recall",
    "/api/v1/memory/search",
    "/api/v1/memory/batch/recall",
  ],
  includeQuery: true,
  includeUserId: true,
  includeBody: true,
};

/**
 * In-memory LRU cache for responses
 */
class ResponseLRUCache {
  private cache: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Generate cache key from request
   * Includes method, path, query params, userId, and body hash for POST requests
   */
  generateKey(req: Request, config: ResponseCacheConfig): string {
    const parts: string[] = [req.method, req.path];

    if (config.includeQuery && Object.keys(req.query).length > 0) {
      const sortedQuery = Object.keys(req.query)
        .sort()
        .map((k) => `${k}=${req.query[k]}`)
        .join("&");
      parts.push(sortedQuery);
    }

    if (config.includeUserId) {
      const userId =
        (req.query.userId as string) ||
        (req.body?.userId as string) ||
        (req.headers["x-user-id"] as string);
      if (userId) {
        parts.push(`user:${userId}`);
      }
    }

    // Include body hash for POST requests (for read-only POST endpoints)
    if (config.includeBody && req.method === "POST" && req.body) {
      const bodyStr = JSON.stringify(req.body);
      const bodyHash = createHash("sha256").update(bodyStr).digest("hex").substring(0, 16);
      parts.push(`body:${bodyHash}`);
    }

    const keyStr = parts.join("|");
    return createHash("sha256").update(keyStr).digest("hex").substring(0, 32);
  }

  /**
   * Get cached response
   */
  get(key: string): CacheEntry | null {
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

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;

    return entry;
  }

  /**
   * Store response in cache
   */
  set(key: string, entry: CacheEntry): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size,
    };
  }
}

/**
 * Global response cache instance
 */
let globalCache: ResponseLRUCache | null = null;

/**
 * Get or create the global response cache
 */
function getCache(maxSize: number): ResponseLRUCache {
  globalCache ??= new ResponseLRUCache(maxSize);
  return globalCache;
}

/**
 * Clear the global response cache
 */
export function clearResponseCache(): void {
  if (globalCache) {
    globalCache.clear();
  }
}

/**
 * Get response cache metrics
 */
export function getResponseCacheMetrics(): {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
} {
  if (!globalCache) {
    return { hits: 0, misses: 0, hitRate: 0, size: 0 };
  }
  return globalCache.getMetrics();
}

/**
 * Determine TTL for a given path
 */
function getTTLForPath(path: string, config: ResponseCacheConfig): number {
  if (config.pathTTL) {
    // Check for exact match first
    if (config.pathTTL[path] !== undefined) {
      return config.pathTTL[path];
    }

    // Check for prefix match
    for (const [pattern, ttl] of Object.entries(config.pathTTL)) {
      if (path.startsWith(pattern)) {
        return ttl;
      }
    }
  }

  return config.defaultTTL;
}

/**
 * Check if path should be excluded from caching
 *
 * Requirements: 17.1 - Support caching for read-only POST endpoints
 */
function shouldExclude(path: string, method: string, config: ResponseCacheConfig): boolean {
  // Check exclude paths first (applies to all methods)
  if (config.excludePaths) {
    for (const excludePath of config.excludePaths) {
      if (path.startsWith(excludePath)) {
        return true;
      }
    }
  }

  // Cache GET requests by default
  if (method === "GET") {
    return false;
  }

  // For POST requests, only cache if explicitly included
  if (method === "POST" && config.includePOSTPaths) {
    for (const includePath of config.includePOSTPaths) {
      if (path.startsWith(includePath)) {
        return false;
      }
    }
  }

  // Exclude all other methods
  return true;
}

/**
 * Create response cache middleware
 *
 * @param config - Cache configuration
 * @returns Express middleware function
 */
export function createResponseCacheMiddleware(
  config: Partial<ResponseCacheConfig> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const finalConfig = { ...DEFAULT_RESPONSE_CACHE_CONFIG, ...config };
  const cache = getCache(finalConfig.maxSize);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip caching for excluded paths/methods
    if (shouldExclude(req.path, req.method, finalConfig)) {
      next();
      return;
    }

    const cacheKey = cache.generateKey(req, finalConfig);
    const cached = cache.get(cacheKey);

    // Return cached response if available
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Cache-Key", cacheKey.substring(0, 8));

      // Restore cached headers
      for (const [key, value] of Object.entries(cached.headers)) {
        if (!["content-length", "transfer-encoding"].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      }

      res.status(cached.statusCode).json(cached.body);
      return;
    }

    // Intercept response to cache it
    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const ttl = getTTLForPath(req.path, finalConfig);
        const headers: Record<string, string> = {};

        // Capture relevant headers
        const headersToCache = ["content-type", "x-request-id"];
        for (const header of headersToCache) {
          const value = res.getHeader(header);
          if (value) {
            headers[header] = String(value);
          }
        }

        cache.set(cacheKey, {
          body,
          statusCode: res.statusCode,
          headers,
          timestamp: Date.now(),
          ttl,
        });
      }

      res.setHeader("X-Cache", "MISS");
      res.setHeader("X-Cache-Key", cacheKey.substring(0, 8));

      return originalJson(body);
    };

    next();
  };
}

export default createResponseCacheMiddleware;
