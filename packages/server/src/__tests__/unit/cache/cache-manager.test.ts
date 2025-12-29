/**
 * Cache Manager Unit Tests
 *
 * Tests for CacheManager with strategy pattern, InMemoryCache backend,
 * user-scoped key namespacing, and pattern-based invalidation.
 *
 * Requirements: 2.5, 9.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CacheBackend,
  CacheManager,
  generateCacheKey,
  InMemoryCache,
  parseCacheKey,
} from "../../../cache";

describe("InMemoryCache", () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache(100);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("get/set operations", () => {
    it("should store and retrieve values", async () => {
      await cache.set("key1", { data: "test" }, 60000);
      const result = await cache.get<{ data: string }>("key1");
      expect(result).toEqual({ data: "test" });
    });

    it("should return null for non-existent keys", async () => {
      const result = await cache.get("nonexistent");
      expect(result).toBeNull();
    });

    it("should return null for expired entries", async () => {
      vi.useFakeTimers();
      await cache.set("key1", "value", 1000);

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      const result = await cache.get("key1");
      expect(result).toBeNull();
    });

    it("should update existing keys", async () => {
      await cache.set("key1", "value1", 60000);
      await cache.set("key1", "value2", 60000);

      const result = await cache.get("key1");
      expect(result).toBe("value2");
    });

    it("should evict oldest entry when at capacity", async () => {
      const smallCache = new InMemoryCache(3);

      await smallCache.set("key1", "value1", 60000);
      await smallCache.set("key2", "value2", 60000);
      await smallCache.set("key3", "value3", 60000);
      await smallCache.set("key4", "value4", 60000);

      // key1 should be evicted (oldest)
      const result1 = await smallCache.get("key1");
      expect(result1).toBeNull();

      // key4 should exist
      const result4 = await smallCache.get("key4");
      expect(result4).toBe("value4");
    });
  });

  describe("delete operations", () => {
    it("should delete a specific key", async () => {
      await cache.set("key1", "value1", 60000);
      await cache.delete("key1");

      const result = await cache.get("key1");
      expect(result).toBeNull();
    });

    it("should handle deleting non-existent keys", async () => {
      await expect(cache.delete("nonexistent")).resolves.not.toThrow();
    });
  });

  describe("deletePattern operations", () => {
    it("should delete keys matching wildcard pattern", async () => {
      await cache.set("cache:user1:memory:abc", "value1", 60000);
      await cache.set("cache:user1:memory:def", "value2", 60000);
      await cache.set("cache:user2:memory:ghi", "value3", 60000);

      const deleted = await cache.deletePattern("cache:user1:*");

      expect(deleted).toBe(2);
      expect(await cache.get("cache:user1:memory:abc")).toBeNull();
      expect(await cache.get("cache:user1:memory:def")).toBeNull();
      expect(await cache.get("cache:user2:memory:ghi")).toBe("value3");
    });

    it("should support single character wildcard", async () => {
      await cache.set("key1", "value1", 60000);
      await cache.set("key2", "value2", 60000);
      await cache.set("key10", "value10", 60000);

      const deleted = await cache.deletePattern("key?");

      expect(deleted).toBe(2);
      expect(await cache.get("key1")).toBeNull();
      expect(await cache.get("key2")).toBeNull();
      expect(await cache.get("key10")).toBe("value10");
    });

    it("should return 0 when no keys match pattern", async () => {
      await cache.set("key1", "value1", 60000);

      const deleted = await cache.deletePattern("nonexistent:*");

      expect(deleted).toBe(0);
    });
  });

  describe("clear operation", () => {
    it("should clear all entries", async () => {
      await cache.set("key1", "value1", 60000);
      await cache.set("key2", "value2", 60000);

      await cache.clear();

      expect(await cache.get("key1")).toBeNull();
      expect(await cache.get("key2")).toBeNull();
      expect(cache.getSize()).toBe(0);
    });
  });

  describe("LRU behavior", () => {
    it("should move accessed items to end", async () => {
      const smallCache = new InMemoryCache(3);

      await smallCache.set("key1", "value1", 60000);
      await smallCache.set("key2", "value2", 60000);
      await smallCache.set("key3", "value3", 60000);

      // Access key1 to move it to end
      await smallCache.get("key1");

      // Add new key, should evict key2 (now oldest)
      await smallCache.set("key4", "value4", 60000);

      expect(await smallCache.get("key1")).toBe("value1");
      expect(await smallCache.get("key2")).toBeNull();
      expect(await smallCache.get("key3")).toBe("value3");
      expect(await smallCache.get("key4")).toBe("value4");
    });
  });
});

describe("CacheManager", () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager({
      prefix: "test",
      defaultTTL: 60000,
      maxSize: 100,
    });
  });

  afterEach(async () => {
    await cacheManager.clear();
    vi.useRealTimers();
  });

  describe("get/set operations", () => {
    it("should store and retrieve values", async () => {
      await cacheManager.set("key1", { data: "test" });
      const result = await cacheManager.get<{ data: string }>("key1");
      expect(result).toEqual({ data: "test" });
    });

    it("should use custom TTL when provided", async () => {
      vi.useFakeTimers();
      await cacheManager.set("key1", "value", 1000);

      // Value should exist before TTL
      expect(await cacheManager.get("key1")).toBe("value");

      // Advance past TTL
      vi.advanceTimersByTime(1001);

      // Value should be expired
      expect(await cacheManager.get("key1")).toBeNull();
    });

    it("should use default TTL when not provided", async () => {
      vi.useFakeTimers();
      await cacheManager.set("key1", "value");

      // Value should exist before default TTL (60000ms)
      vi.advanceTimersByTime(59999);
      expect(await cacheManager.get("key1")).toBe("value");

      // Advance past default TTL
      vi.advanceTimersByTime(2);
      expect(await cacheManager.get("key1")).toBeNull();
    });
  });

  describe("invalidate operations", () => {
    it("should invalidate specific key", async () => {
      await cacheManager.set("key1", "value1");
      await cacheManager.invalidate("key1");

      expect(await cacheManager.get("key1")).toBeNull();
    });

    it("should invalidate keys by pattern", async () => {
      await cacheManager.set("test:user1:memory:abc", "value1");
      await cacheManager.set("test:user1:search:def", "value2");
      await cacheManager.set("test:user2:memory:ghi", "value3");

      const deleted = await cacheManager.invalidatePattern("test:user1:*");

      expect(deleted).toBe(2);
      expect(await cacheManager.get("test:user1:memory:abc")).toBeNull();
      expect(await cacheManager.get("test:user1:search:def")).toBeNull();
      expect(await cacheManager.get("test:user2:memory:ghi")).toBe("value3");
    });

    it("should invalidate all entries for a user", async () => {
      await cacheManager.set("test:user1:memory:abc", "value1");
      await cacheManager.set("test:user1:search:def", "value2");
      await cacheManager.set("test:user2:memory:ghi", "value3");

      const deleted = await cacheManager.invalidateUser("user1");

      expect(deleted).toBe(2);
      expect(await cacheManager.get("test:user1:memory:abc")).toBeNull();
      expect(await cacheManager.get("test:user1:search:def")).toBeNull();
      expect(await cacheManager.get("test:user2:memory:ghi")).toBe("value3");
    });
  });

  describe("metrics", () => {
    it("should track hits and misses", async () => {
      await cacheManager.set("key1", "value1");

      // Hit
      await cacheManager.get("key1");
      // Miss
      await cacheManager.get("nonexistent");

      const metrics = cacheManager.getMetrics();

      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBe(0.5);
    });

    it("should report backend type", async () => {
      const metrics = cacheManager.getMetrics();
      expect(metrics.backend).toBe("memory");
    });

    it("should report cache size", async () => {
      await cacheManager.set("key1", "value1");
      await cacheManager.set("key2", "value2");

      const metrics = cacheManager.getMetrics();
      expect(metrics.size).toBe(2);
    });

    it("should reset metrics on clear", async () => {
      await cacheManager.set("key1", "value1");
      await cacheManager.get("key1");
      await cacheManager.get("nonexistent");

      await cacheManager.clear();

      const metrics = cacheManager.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.hitRate).toBe(0);
      expect(metrics.size).toBe(0);
    });
  });

  describe("custom backend", () => {
    it("should use provided backend", async () => {
      const mockBackend: CacheBackend = {
        get: vi.fn().mockResolvedValue("mock-value"),
        set: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        deletePattern: vi.fn().mockResolvedValue(5),
        clear: vi.fn().mockResolvedValue(undefined),
      };

      const manager = new CacheManager({ backend: mockBackend });

      await manager.set("key", "value");
      expect(mockBackend.set).toHaveBeenCalledWith("key", "value", 300000);

      const result = await manager.get("key");
      expect(mockBackend.get).toHaveBeenCalledWith("key");
      expect(result).toBe("mock-value");
    });
  });

  describe("prefix", () => {
    it("should return configured prefix", () => {
      expect(cacheManager.getPrefix()).toBe("test");
    });

    it("should use default prefix when not configured", () => {
      const defaultManager = new CacheManager();
      expect(defaultManager.getPrefix()).toBe("cache");
    });
  });
});

describe("generateCacheKey", () => {
  it("should generate key with correct format", () => {
    const key = generateCacheKey("cache", "user123", "memory", { id: "abc" });

    expect(key).toMatch(/^cache:user123:memory:[a-f0-9]{16}$/);
  });

  it("should generate consistent keys for same params", () => {
    const key1 = generateCacheKey("cache", "user1", "memory", { a: 1, b: 2 });
    const key2 = generateCacheKey("cache", "user1", "memory", { a: 1, b: 2 });

    expect(key1).toBe(key2);
  });

  it("should generate consistent keys regardless of param order", () => {
    const key1 = generateCacheKey("cache", "user1", "memory", { a: 1, b: 2 });
    const key2 = generateCacheKey("cache", "user1", "memory", { b: 2, a: 1 });

    expect(key1).toBe(key2);
  });

  it("should generate different keys for different params", () => {
    const key1 = generateCacheKey("cache", "user1", "memory", { a: 1 });
    const key2 = generateCacheKey("cache", "user1", "memory", { a: 2 });

    expect(key1).not.toBe(key2);
  });

  it("should generate different keys for different users", () => {
    const key1 = generateCacheKey("cache", "user1", "memory", { a: 1 });
    const key2 = generateCacheKey("cache", "user2", "memory", { a: 1 });

    expect(key1).not.toBe(key2);
  });

  it("should generate different keys for different resources", () => {
    const key1 = generateCacheKey("cache", "user1", "memory", { a: 1 });
    const key2 = generateCacheKey("cache", "user1", "search", { a: 1 });

    expect(key1).not.toBe(key2);
  });
});

describe("parseCacheKey", () => {
  it("should parse valid cache key", () => {
    const result = parseCacheKey("cache:user123:memory:abc123def456");

    expect(result).toEqual({
      prefix: "cache",
      userId: "user123",
      resource: "memory",
      hash: "abc123def456",
    });
  });

  it("should return null for invalid key format", () => {
    expect(parseCacheKey("invalid")).toBeNull();
    expect(parseCacheKey("only:two:parts")).toBeNull();
    expect(parseCacheKey("too:many:parts:here:extra")).toBeNull();
  });

  it("should handle empty parts", () => {
    const result = parseCacheKey(":::hash");

    expect(result).toEqual({
      prefix: "",
      userId: "",
      resource: "",
      hash: "hash",
    });
  });
});
