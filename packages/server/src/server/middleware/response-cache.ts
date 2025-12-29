/**
 * Response Cache Middleware
 *
 * HTTP-level caching for read-heavy endpoints to improve performance.
 * Uses CacheManager with pluggable backends (in-memory or Redis).
 *
 * Requirements:
 * - 17.1: Memory retrieval response within 200ms at p95
 * - 2.1: Cache invalidation when memory is created
 * - 2.2: Cache invalidation when memory is updated
 * - 2.3: Cache invalidation when memory is deleted
 */

import type { NextFunction, Request, Response } from "express";
import { createHash } from "node:crypto";
import { CacheManager, generateCacheKey } from "../../cache/cache-manager.js";

/**
 * Cache entry structure
 */
interface CacheEntry {
  body: unknown;
  statusCode: number;
  headers: Record<string, string>;
  timestamp: number;
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

/** Cache key prefix for response cache */
const RESPONSE_CACHE_PREFIX = "response";

/** Resource type for memory-related endpoints */
const MEMORY_RESOURCE = "memory";

/** Resource type for general endpoints */
const GENERAL_RESOURCE = "general";

/**
 * Global CacheManager instance for response caching
 */
let globalCacheManager: CacheManager | null = null;

/**
 * Get or create the global CacheManager
 */
function getCacheManager(maxSize: number, defaultTTL: number): CacheManager {
  globalCacheManager ??= new CacheManager({
    maxSize,
    defaultTTL,
    prefix: RESPONSE_CACHE_PREFIX,
  });
  return globalCacheManager;
}

/**
 * Extract userId from request
 */
function extractUserId(req: Request): string {
  return (
    (req.query.userId as string) ||
    (req.body?.userId as string) ||
    (req.headers["x-user-id"] as string) ||
    "anonymous"
  );
}

/**
 * Determine resource type from path
 */
function getResourceType(path: string): string {
  if (path.includes("/memory")) {
    return MEMORY_RESOURCE;
  }
  return GENERAL_RESOURCE;
}

/**
 * Generate cache key from request using user-scoped namespacing
 *
 * Format: {prefix}:{userId}:{resource}:{hash}
 *
 * Requirements: 2.5 - Pattern-based invalidation for user-scoped cache entries
 */
function generateResponseCacheKey(req: Request, config: ResponseCacheConfig): string {
  const userId = config.includeUserId ? extractUserId(req) : "global";
  const resource = getResourceType(req.path);

  // Build params object for hashing
  const params: Record<string, unknown> = {
    method: req.method,
    path: req.path,
  };

  if (config.includeQuery && Object.keys(req.query).length > 0) {
    params.query = req.query;
  }

  // Include body hash for POST requests (for read-only POST endpoints)
  if (config.includeBody && req.method === "POST" && req.body) {
    const bodyStr = JSON.stringify(req.body);
    params.bodyHash = createHash("sha256").update(bodyStr).digest("hex").substring(0, 16);
  }

  return generateCacheKey(RESPONSE_CACHE_PREFIX, userId, resource, params);
}

/**
 * Clear the global response cache
 */
export function clearResponseCache(): void {
  if (globalCacheManager) {
    // Use void to handle the promise without awaiting
    void globalCacheManager.clear();
  }
}

/**
 * Invalidate all cache entries for a specific user
 *
 * Requirements:
 * - 2.1: Cache invalidation when memory is created
 * - 2.2: Cache invalidation when memory is updated
 * - 2.3: Cache invalidation when memory is deleted
 *
 * @param userId - User ID to invalidate cache for
 * @returns Number of invalidated entries
 */
export async function invalidateUserCache(userId: string): Promise<number> {
  if (!globalCacheManager) {
    return 0;
  }
  return globalCacheManager.invalidateUser(userId);
}

/**
 * Invalidate memory-related cache entries for a specific user
 *
 * More targeted invalidation that only clears memory-related cache entries.
 *
 * @param userId - User ID to invalidate cache for
 * @returns Number of invalidated entries
 */
export async function invalidateMemoryCache(userId: string): Promise<number> {
  if (!globalCacheManager) {
    return 0;
  }
  const pattern = `${RESPONSE_CACHE_PREFIX}:${userId}:${MEMORY_RESOURCE}:*`;
  return globalCacheManager.invalidatePattern(pattern);
}

/**
 * Invalidate all memory-related cache entries (for batch operations)
 *
 * Requirements: 2.6 - Bulk invalidation for batch operations
 *
 * @returns Number of invalidated entries
 */
export async function invalidateAllMemoryCache(): Promise<number> {
  if (!globalCacheManager) {
    return 0;
  }
  const pattern = `${RESPONSE_CACHE_PREFIX}:*:${MEMORY_RESOURCE}:*`;
  return globalCacheManager.invalidatePattern(pattern);
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
  if (!globalCacheManager) {
    return { hits: 0, misses: 0, hitRate: 0, size: 0 };
  }

  const metrics = globalCacheManager.getMetrics();
  return {
    hits: metrics.hits,
    misses: metrics.misses,
    hitRate: metrics.hitRate,
    size: metrics.size,
  };
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
 * Uses CacheManager for caching with user-scoped key namespacing.
 * Supports both synchronous cache hits and async cache storage.
 *
 * @param config - Cache configuration
 * @returns Express middleware function
 */
export function createResponseCacheMiddleware(
  config: Partial<ResponseCacheConfig> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const finalConfig = { ...DEFAULT_RESPONSE_CACHE_CONFIG, ...config };
  const cacheManager = getCacheManager(finalConfig.maxSize, finalConfig.defaultTTL);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip caching for excluded paths/methods
    if (shouldExclude(req.path, req.method, finalConfig)) {
      next();
      return;
    }

    const cacheKey = generateResponseCacheKey(req, finalConfig);

    // Try to get cached response (async operation)
    cacheManager
      .get<CacheEntry>(cacheKey)
      .then((cached) => {
        if (cached) {
          // Cache hit - return cached response
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

        // Cache miss - intercept response to cache it
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

            const entry: CacheEntry = {
              body,
              statusCode: res.statusCode,
              headers,
              timestamp: Date.now(),
            };

            // Store in cache (async, don't await)
            void cacheManager.set(cacheKey, entry, ttl);
          }

          res.setHeader("X-Cache", "MISS");
          res.setHeader("X-Cache-Key", cacheKey.substring(0, 8));

          return originalJson(body);
        };

        next();
      })
      .catch(() => {
        // On cache error, proceed without caching
        next();
      });
  };
}

export default createResponseCacheMiddleware;
