/**
 * Cache Module
 *
 * Provides caching infrastructure with pluggable backends.
 *
 * Requirements: 2.5, 9.1, 9.2, 9.3, 9.4, 9.5
 */

export type { CacheBackend, CacheManagerConfig, CacheMetrics } from "./cache-manager";
export type { RedisCacheConfig } from "./redis-cache";

export { CacheManager, InMemoryCache, generateCacheKey, parseCacheKey } from "./cache-manager";
export { RedisCache, createRedisCacheFromEnv } from "./redis-cache";
