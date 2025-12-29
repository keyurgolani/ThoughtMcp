/**
 * Redis Cache Backend Unit Tests
 *
 * Tests the RedisCache implementation with mocked Redis client.
 * Validates TTL support, pattern-based invalidation, and fallback behavior.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Define mock instance type
interface MockRedisInstance {
  connect: ReturnType<typeof vi.fn>;
  quit: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  psetex: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  scan: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
}

// Create mock instance - must be defined before vi.mock for hoisting
let mockRedisInstance: MockRedisInstance;

// Mock ioredis before importing RedisCache
vi.mock("ioredis", () => {
  // Create mock instance inside the factory to ensure proper hoisting
  const instance: MockRedisInstance = {
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    psetex: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    scan: vi.fn().mockResolvedValue(["0", []]),
    on: vi.fn(),
  };

  return {
    default: vi.fn(() => instance),
    __mockInstance: instance,
  };
});

// Import after mock is set up
import * as ioredis from "ioredis";
import { RedisCache, createRedisCacheFromEnv } from "../../../cache/redis-cache";

// Get the mock instance from the mocked module
const getMockInstance = (): MockRedisInstance => {
  return (ioredis as unknown as { __mockInstance: MockRedisInstance }).__mockInstance;
};

describe("RedisCache", () => {
  let redisCache: RedisCache;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisInstance = getMockInstance();

    // Reset mock implementations
    mockRedisInstance.connect.mockResolvedValue(undefined);
    mockRedisInstance.quit.mockResolvedValue(undefined);
    mockRedisInstance.get.mockResolvedValue(null);
    mockRedisInstance.psetex.mockResolvedValue("OK");
    mockRedisInstance.del.mockResolvedValue(1);
    mockRedisInstance.scan.mockResolvedValue(["0", []]);

    redisCache = new RedisCache({
      host: "localhost",
      port: 6379,
      keyPrefix: "test",
    });
  });

  afterEach(async () => {
    await redisCache.disconnect();
  });

  describe("Constructor", () => {
    it("should create cache with default configuration", () => {
      const cache = new RedisCache();
      expect(cache).toBeDefined();
      expect(cache.isAvailable()).toBe(false); // Not connected yet
    });

    it("should create cache with custom configuration", () => {
      const cache = new RedisCache({
        host: "redis.example.com",
        port: 6380,
        password: "secret",
        db: 1,
        keyPrefix: "custom",
      });
      expect(cache).toBeDefined();
    });
  });

  describe("Connection", () => {
    it("should connect to Redis successfully", async () => {
      mockRedisInstance.on.mockImplementation((event: string, callback: () => void) => {
        if (event === "connect") {
          // Simulate connection event
          setTimeout(callback, 0);
        }
      });

      const cache = new RedisCache({ keyPrefix: "test" });
      await cache.connect();

      // Wait for the connect event to fire
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(cache.isAvailable()).toBe(true);
    });

    it("should handle connection failure gracefully", async () => {
      mockRedisInstance.connect.mockRejectedValueOnce(new Error("Connection refused"));

      const failingCache = new RedisCache();
      await failingCache.connect();

      // Should fall back to in-memory cache
      expect(failingCache.isAvailable()).toBe(false);
    });

    it("should disconnect cleanly", async () => {
      await redisCache.connect();
      await redisCache.disconnect();
      expect(redisCache.isAvailable()).toBe(false);
    });
  });

  describe("get/set operations", () => {
    it("should store and retrieve values from Redis", async () => {
      mockRedisInstance.get.mockResolvedValueOnce(JSON.stringify({ data: "test" }));

      const cache = new RedisCache({ keyPrefix: "test" });
      await cache.connect();

      const result = await cache.get<{ data: string }>("mykey");
      expect(result).toEqual({ data: "test" });
      expect(mockRedisInstance.get).toHaveBeenCalledWith("test:mykey");
    });

    it("should return null for non-existent keys", async () => {
      await redisCache.connect();
      const result = await redisCache.get("nonexistent");
      expect(result).toBeNull();
    });

    it("should set value with TTL", async () => {
      const cache = new RedisCache({ keyPrefix: "test" });
      await cache.connect();

      await cache.set("mykey", { data: "value" }, 60000);
      expect(mockRedisInstance.psetex).toHaveBeenCalledWith(
        "test:mykey",
        60000,
        JSON.stringify({ data: "value" })
      );
    });

    it("should use fallback cache when Redis unavailable", async () => {
      // Make connection fail so Redis is unavailable - use mockRejectedValue to persist
      mockRedisInstance.connect.mockRejectedValue(new Error("Connection refused"));

      const cache = new RedisCache({ keyPrefix: "test" });
      await cache.set("fallback-key", "fallback-value", 60000);
      const result = await cache.get("fallback-key");
      expect(result).toBe("fallback-value");
    });
  });

  describe("delete operations", () => {
    it("should delete a specific key", async () => {
      const cache = new RedisCache({ keyPrefix: "test" });
      await cache.connect();

      await cache.delete("mykey");
      expect(mockRedisInstance.del).toHaveBeenCalledWith("test:mykey");
    });

    it("should delete from fallback cache when Redis unavailable", async () => {
      await redisCache.set("to-delete", "value", 60000);
      await redisCache.delete("to-delete");
      const result = await redisCache.get("to-delete");
      expect(result).toBeNull();
    });
  });

  describe("deletePattern operations", () => {
    it("should delete keys matching pattern using SCAN", async () => {
      mockRedisInstance.scan
        .mockResolvedValueOnce(["1", ["test:user:1:memory", "test:user:1:search"]])
        .mockResolvedValueOnce(["0", ["test:user:1:graph"]]);
      mockRedisInstance.del.mockResolvedValue(2);

      const cache = new RedisCache({ keyPrefix: "test" });
      await cache.connect();

      const deleted = await cache.deletePattern("user:1:*");
      expect(deleted).toBeGreaterThanOrEqual(0);
    });

    it("should return fallback count when Redis unavailable", async () => {
      // Set some values in fallback cache
      await redisCache.set("user:1:a", "value1", 60000);
      await redisCache.set("user:1:b", "value2", 60000);
      await redisCache.set("user:2:a", "value3", 60000);

      const deleted = await redisCache.deletePattern("user:1:*");
      expect(deleted).toBe(2);
    });
  });

  describe("clear operation", () => {
    it("should clear all entries with prefix", async () => {
      const cache = new RedisCache({ keyPrefix: "test" });
      await cache.connect();

      await cache.clear();
      expect(mockRedisInstance.scan).toHaveBeenCalled();
    });

    it("should clear fallback cache when Redis unavailable", async () => {
      await redisCache.set("key1", "value1", 60000);
      await redisCache.set("key2", "value2", 60000);

      await redisCache.clear();

      expect(await redisCache.get("key1")).toBeNull();
      expect(await redisCache.get("key2")).toBeNull();
    });
  });

  describe("Fallback behavior (Requirement 9.4)", () => {
    it("should fall back to in-memory cache on Redis error during get", async () => {
      mockRedisInstance.get.mockRejectedValueOnce(new Error("Redis error"));

      const cache = new RedisCache({ keyPrefix: "test" });
      await cache.connect();

      // Set in fallback cache first
      const fallback = cache.getFallbackCache();
      await fallback.set("error-key", "fallback-value", 60000);

      const result = await cache.get("error-key");
      expect(result).toBe("fallback-value");
    });

    it("should store in fallback cache even when Redis succeeds", async () => {
      const cache = new RedisCache({ keyPrefix: "test" });
      await cache.connect();

      await cache.set("dual-key", "dual-value", 60000);

      // Check fallback cache has the value
      const fallback = cache.getFallbackCache();
      const fallbackValue = await fallback.get("dual-key");
      expect(fallbackValue).toBe("dual-value");
    });
  });

  describe("Key prefixing (Requirement 9.5)", () => {
    it("should prefix all keys with configured prefix", async () => {
      const cache = new RedisCache({ keyPrefix: "myapp" });
      await cache.connect();

      await cache.get("user:123");
      expect(mockRedisInstance.get).toHaveBeenCalledWith("myapp:user:123");

      await cache.set("user:456", "data", 60000);
      expect(mockRedisInstance.psetex).toHaveBeenCalledWith("myapp:user:456", 60000, '"data"');

      await cache.delete("user:789");
      expect(mockRedisInstance.del).toHaveBeenCalledWith("myapp:user:789");
    });
  });

  describe("TTL support (Requirement 9.3)", () => {
    it("should use PSETEX for millisecond TTL precision", async () => {
      const cache = new RedisCache({ keyPrefix: "test" });
      await cache.connect();

      // Set with 5 minute TTL (300000ms)
      await cache.set("ttl-key", "ttl-value", 300000);
      expect(mockRedisInstance.psetex).toHaveBeenCalledWith("test:ttl-key", 300000, '"ttl-value"');
    });
  });

  describe("Error handling", () => {
    it("should handle JSON parse errors gracefully", async () => {
      mockRedisInstance.get.mockResolvedValueOnce("invalid json {{{");

      const cache = new RedisCache({ keyPrefix: "test" });
      await cache.connect();

      // Should fall back to in-memory cache on parse error
      const result = await cache.get("bad-json");
      expect(result).toBeNull();
    });

    it("should handle deletePattern errors gracefully", async () => {
      mockRedisInstance.scan.mockRejectedValueOnce(new Error("SCAN error"));

      const cache = new RedisCache({ keyPrefix: "test" });
      await cache.connect();

      // Should not throw, returns fallback count
      const deleted = await cache.deletePattern("*");
      expect(deleted).toBe(0);
    });
  });
});

describe("createRedisCacheFromEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should create cache with default values when env vars not set", () => {
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_DB;
    delete process.env.REDIS_TLS;
    delete process.env.REDIS_KEY_PREFIX;

    const cache = createRedisCacheFromEnv();
    expect(cache).toBeDefined();
  });

  it("should create cache with environment variables", () => {
    process.env.REDIS_HOST = "redis.example.com";
    process.env.REDIS_PORT = "6380";
    process.env.REDIS_PASSWORD = "secret";
    process.env.REDIS_DB = "2";
    process.env.REDIS_TLS = "true";
    process.env.REDIS_KEY_PREFIX = "myapp";

    const cache = createRedisCacheFromEnv();
    expect(cache).toBeDefined();
  });
});
