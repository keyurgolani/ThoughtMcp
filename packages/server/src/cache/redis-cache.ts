/**
 * Redis Cache Backend
 *
 * Implements CacheBackend interface using ioredis for distributed caching.
 * Provides TTL support and pattern-based invalidation.
 * Falls back to in-memory cache when Redis is unavailable.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4
 * - Support Redis as optional distributed cache layer
 * - Use Redis instead of in-memory cache when configured
 * - Support TTL-based expiration matching in-memory behavior
 * - Fall back to in-memory caching when Redis unavailable
 */

import Redis, { type RedisOptions } from "ioredis";
import { Logger } from "../utils/logger";
import { type CacheBackend, InMemoryCache } from "./cache-manager";

/**
 * Redis cache configuration
 */
export interface RedisCacheConfig {
  /** Redis host (default: localhost) */
  host?: string;
  /** Redis port (default: 6379) */
  port?: number;
  /** Redis password (optional) */
  password?: string;
  /** Redis database number (default: 0) */
  db?: number;
  /** Connection timeout in milliseconds (default: 5000) */
  connectTimeout?: number;
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Key prefix for namespacing (default: 'thought') */
  keyPrefix?: string;
  /** Enable TLS (default: false) */
  tls?: boolean;
  /** Fallback cache size when Redis unavailable (default: 10000) */
  fallbackCacheSize?: number;
}

/**
 * Default Redis cache configuration
 */
const DEFAULT_CONFIG: Required<RedisCacheConfig> = {
  host: "localhost",
  port: 6379,
  password: "",
  db: 0,
  connectTimeout: 5000,
  maxRetries: 3,
  keyPrefix: "thought",
  tls: false,
  fallbackCacheSize: 10000,
};

/**
 * Redis cache backend implementation
 *
 * Provides distributed caching with automatic fallback to in-memory
 * cache when Redis is unavailable.
 */
export class RedisCache implements CacheBackend {
  private client: Redis | null = null;
  private fallbackCache: InMemoryCache;
  private readonly config: Required<RedisCacheConfig>;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(config: RedisCacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fallbackCache = new InMemoryCache(this.config.fallbackCacheSize);
  }

  /**
   * Initialize Redis connection
   *
   * Creates a new Redis client and attempts to connect.
   * If connection fails, falls back to in-memory cache.
   */
  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.initializeConnection();
    return this.connectionPromise;
  }

  private async initializeConnection(): Promise<void> {
    try {
      const redisOptions: RedisOptions = {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db,
        connectTimeout: this.config.connectTimeout,
        maxRetriesPerRequest: this.config.maxRetries,
        retryStrategy: (times: number) => {
          if (times > this.config.maxRetries) {
            // Stop retrying after max retries
            return null;
          }
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          return Math.min(times * 100, 3000);
        },
        lazyConnect: true,
      };

      if (this.config.password) {
        redisOptions.password = this.config.password;
      }

      if (this.config.tls) {
        redisOptions.tls = {};
      }

      this.client = new Redis(redisOptions);

      // Set up event handlers
      this.client.on("connect", () => {
        this.isConnected = true;
      });

      this.client.on("error", (error: Error) => {
        // Log error but don't throw - we'll fall back to in-memory cache
        Logger.warn(`[RedisCache] Redis error: ${error.message}`);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        this.isConnected = false;
      });

      // Attempt to connect
      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.warn(
        `[RedisCache] Failed to connect to Redis: ${errorMessage}. Using in-memory fallback.`
      );
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    // Ensure connection is initialized
    if (!this.connectionPromise) {
      await this.connect();
    }

    if (!this.isAvailable() || !this.client) {
      return this.fallbackCache.get<T>(key);
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const value = await this.client.get(prefixedKey);

      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.warn(`[RedisCache] Get error: ${errorMessage}. Falling back to in-memory cache.`);
      return this.fallbackCache.get<T>(key);
    }
  }

  /**
   * Set cached value with TTL in milliseconds
   */
  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    // Ensure connection is initialized
    if (!this.connectionPromise) {
      await this.connect();
    }

    // Always set in fallback cache for redundancy
    await this.fallbackCache.set(key, value, ttlMs);

    if (!this.isAvailable() || !this.client) {
      return;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const serialized = JSON.stringify(value);

      // Redis PSETEX uses milliseconds for TTL
      await this.client.psetex(prefixedKey, ttlMs, serialized);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.warn(`[RedisCache] Set error: ${errorMessage}. Value stored in fallback cache only.`);
    }
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<void> {
    // Always delete from fallback cache
    await this.fallbackCache.delete(key);

    if (!this.isAvailable() || !this.client) {
      return;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      await this.client.del(prefixedKey);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.warn(`[RedisCache] Delete error: ${errorMessage}`);
    }
  }

  /**
   * Delete all keys matching a pattern (glob-style)
   *
   * Uses Redis SCAN for efficient pattern matching without blocking.
   */
  async deletePattern(pattern: string): Promise<number> {
    // Always delete from fallback cache
    const fallbackDeleted = await this.fallbackCache.deletePattern(pattern);

    if (!this.isAvailable() || !this.client) {
      return fallbackDeleted;
    }

    try {
      const prefixedPattern = this.getPrefixedKey(pattern);
      let deletedCount = 0;
      let cursor = "0";

      // Use SCAN to iterate through keys matching pattern
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          "MATCH",
          prefixedPattern,
          "COUNT",
          100
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.client.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== "0");

      return Math.max(deletedCount, fallbackDeleted);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.warn(`[RedisCache] DeletePattern error: ${errorMessage}`);
      return fallbackDeleted;
    }
  }

  /**
   * Clear all cache entries
   *
   * Only clears keys with the configured prefix to avoid
   * affecting other applications sharing the Redis instance.
   */
  async clear(): Promise<void> {
    // Always clear fallback cache
    await this.fallbackCache.clear();

    if (!this.isAvailable()) {
      return;
    }

    try {
      // Delete all keys with our prefix
      await this.deletePattern("*");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.warn(`[RedisCache] Clear error: ${errorMessage}`);
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }

  /**
   * Get prefixed key for Redis storage
   */
  private getPrefixedKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }

  /**
   * Get the underlying Redis client (for testing/advanced use)
   */
  getClient(): Redis | null {
    return this.client;
  }

  /**
   * Get the fallback cache (for testing)
   */
  getFallbackCache(): InMemoryCache {
    return this.fallbackCache;
  }
}

/**
 * Create a Redis cache instance from environment variables
 *
 * Environment variables:
 * - REDIS_HOST: Redis host (default: localhost)
 * - REDIS_PORT: Redis port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 * - REDIS_DB: Redis database number (default: 0)
 * - REDIS_TLS: Enable TLS (default: false)
 * - REDIS_KEY_PREFIX: Key prefix (default: thought)
 */
export function createRedisCacheFromEnv(): RedisCache {
  const config: RedisCacheConfig = {
    host: process.env.REDIS_HOST ?? DEFAULT_CONFIG.host,
    port: parseInt(process.env.REDIS_PORT ?? String(DEFAULT_CONFIG.port), 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
    db: parseInt(process.env.REDIS_DB ?? String(DEFAULT_CONFIG.db), 10),
    tls: process.env.REDIS_TLS === "true",
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? DEFAULT_CONFIG.keyPrefix,
  };

  return new RedisCache(config);
}
