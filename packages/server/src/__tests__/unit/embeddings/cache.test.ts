/**
 * Tests for EmbeddingCache
 *
 * Tests for embedding cache operations including storage, retrieval,
 * invalidation, and memory management.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmbeddingCache, generateCacheKey, GenericLRUCache } from "../../../embeddings/cache";
import { MemorySector } from "../../../embeddings/types";

describe("EmbeddingCache", () => {
  let cache: EmbeddingCache;

  beforeEach(() => {
    cache = new EmbeddingCache(3, 1000); // Small size for testing, 1s TTL
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Basic Operations", () => {
    it("should store and retrieve embeddings", () => {
      const embedding = [1, 2, 3];
      cache.set("key1", embedding);

      const retrieved = cache.get("key1");
      expect(retrieved).toEqual(embedding);
    });

    it("should return null for non-existent keys", () => {
      const retrieved = cache.get("nonexistent");
      expect(retrieved).toBeNull();
    });

    it("should check if key exists", () => {
      cache.set("key1", [1, 2, 3]);
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should return correct cache size", () => {
      expect(cache.size()).toBe(0);
      cache.set("key1", [1, 2, 3]);
      expect(cache.size()).toBe(1);
      cache.set("key2", [4, 5, 6]);
      expect(cache.size()).toBe(2);
    });

    it("should clear all entries", () => {
      cache.set("key1", [1, 2, 3]);
      cache.set("key2", [4, 5, 6]);
      expect(cache.size()).toBe(2);

      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(false);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict oldest entry when cache is full", () => {
      // Fill cache to max size (3)
      cache.set("key1", [1, 2, 3]);
      cache.set("key2", [4, 5, 6]);
      cache.set("key3", [7, 8, 9]);
      expect(cache.size()).toBe(3);

      // Add one more - should evict key1 (oldest)
      cache.set("key4", [10, 11, 12]);
      expect(cache.size()).toBe(3);
      expect(cache.has("key1")).toBe(false); // Evicted
      expect(cache.has("key2")).toBe(true);
      expect(cache.has("key3")).toBe(true);
      expect(cache.has("key4")).toBe(true);
    });

    it("should not evict when updating existing key", () => {
      cache.set("key1", [1, 2, 3]);
      cache.set("key2", [4, 5, 6]);
      cache.set("key3", [7, 8, 9]);
      expect(cache.size()).toBe(3);

      // Update existing key - should not evict
      cache.set("key2", [10, 11, 12]);
      expect(cache.size()).toBe(3);
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(true);
      expect(cache.has("key3")).toBe(true);
    });

    it("should move accessed entries to end (LRU)", () => {
      cache.set("key1", [1, 2, 3]);
      cache.set("key2", [4, 5, 6]);
      cache.set("key3", [7, 8, 9]);

      // Access key1 - moves it to end
      cache.get("key1");

      // Add new entry - should evict key2 (now oldest)
      cache.set("key4", [10, 11, 12]);
      expect(cache.has("key1")).toBe(true); // Still there
      expect(cache.has("key2")).toBe(false); // Evicted
      expect(cache.has("key3")).toBe(true);
      expect(cache.has("key4")).toBe(true);
    });
  });

  describe("TTL Expiration", () => {
    it("should return null for expired entries in get()", () => {
      cache.set("key1", [1, 2, 3], 1000); // 1s TTL

      // Before expiration
      expect(cache.get("key1")).toEqual([1, 2, 3]);

      // After expiration
      vi.advanceTimersByTime(1001);
      expect(cache.get("key1")).toBeNull();
      expect(cache.size()).toBe(0); // Should be removed
    });

    it("should return false for expired entries in has()", () => {
      cache.set("key1", [1, 2, 3], 1000); // 1s TTL

      // Before expiration
      expect(cache.has("key1")).toBe(true);

      // After expiration
      vi.advanceTimersByTime(1001);
      expect(cache.has("key1")).toBe(false);
      expect(cache.size()).toBe(0); // Should be removed
    });

    it("should handle TTL expiration at exact boundary", () => {
      cache.set("key1", [1, 2, 3], 1000); // 1s TTL

      // Exactly at TTL boundary
      vi.advanceTimersByTime(1000);
      expect(cache.get("key1")).toEqual([1, 2, 3]); // Still valid

      // Just after TTL
      vi.advanceTimersByTime(1);
      expect(cache.get("key1")).toBeNull(); // Expired
    });

    it("should handle custom TTL per entry", () => {
      cache.set("key1", [1, 2, 3], 500); // 0.5s TTL
      cache.set("key2", [4, 5, 6], 2000); // 2s TTL

      // After 0.6s - key1 expired, key2 still valid
      vi.advanceTimersByTime(600);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toEqual([4, 5, 6]);

      // After 2.1s total - both expired
      vi.advanceTimersByTime(1500);
      expect(cache.get("key2")).toBeNull();
    });

    it("should use default TTL when not specified", () => {
      cache.set("key1", [1, 2, 3]); // Uses default 1s TTL

      // Before default TTL
      vi.advanceTimersByTime(999);
      expect(cache.get("key1")).toEqual([1, 2, 3]);

      // After default TTL
      vi.advanceTimersByTime(2);
      expect(cache.get("key1")).toBeNull();
    });

    it("should handle TTL=0 (immediate expiration)", () => {
      cache.set("key1", [1, 2, 3], 0);

      // Should expire immediately
      vi.advanceTimersByTime(1);
      expect(cache.get("key1")).toBeNull();
    });

    it("should handle very large TTL", () => {
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      cache.set("key1", [1, 2, 3], oneYear);

      // After 1 day - still valid
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
      expect(cache.get("key1")).toEqual([1, 2, 3]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle cache at exactly max size", () => {
      cache.set("key1", [1, 2, 3]);
      cache.set("key2", [4, 5, 6]);
      cache.set("key3", [7, 8, 9]);
      expect(cache.size()).toBe(3); // Exactly at max

      // All entries should be accessible
      expect(cache.get("key1")).toEqual([1, 2, 3]);
      expect(cache.get("key2")).toEqual([4, 5, 6]);
      expect(cache.get("key3")).toEqual([7, 8, 9]);
    });

    it("should handle empty cache operations", () => {
      expect(cache.size()).toBe(0);
      expect(cache.get("key1")).toBeNull();
      expect(cache.has("key1")).toBe(false);
      cache.clear(); // Should not throw
      expect(cache.size()).toBe(0);
    });

    it("should handle same key set multiple times", () => {
      cache.set("key1", [1, 2, 3]);
      cache.set("key1", [4, 5, 6]);
      cache.set("key1", [7, 8, 9]);

      expect(cache.size()).toBe(1);
      expect(cache.get("key1")).toEqual([7, 8, 9]);
    });

    it("should handle large embeddings", () => {
      const largeEmbedding = new Array(1536).fill(0).map((_, i) => i);
      cache.set("key1", largeEmbedding);

      const retrieved = cache.get("key1");
      expect(retrieved).toEqual(largeEmbedding);
      expect(retrieved?.length).toBe(1536);
    });
  });

  describe("Concurrent Access Patterns", () => {
    it("should handle rapid sequential access", () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, [i, i + 1, i + 2]);
      }

      // Cache should only have last 3 entries (max size = 3)
      expect(cache.size()).toBe(3);
      expect(cache.has("key7")).toBe(true);
      expect(cache.has("key8")).toBe(true);
      expect(cache.has("key9")).toBe(true);
    });

    it("should handle interleaved set and get operations", () => {
      cache.set("key1", [1, 2, 3]);
      expect(cache.get("key1")).toEqual([1, 2, 3]);

      cache.set("key2", [4, 5, 6]);
      expect(cache.get("key1")).toEqual([1, 2, 3]);
      expect(cache.get("key2")).toEqual([4, 5, 6]);

      cache.set("key3", [7, 8, 9]);
      expect(cache.get("key2")).toEqual([4, 5, 6]);
    });
  });
});

describe("generateCacheKey", () => {
  it("should generate consistent keys for same inputs", () => {
    const key1 = generateCacheKey(MemorySector.Semantic, "test content");
    const key2 = generateCacheKey(MemorySector.Semantic, "test content");
    expect(key1).toBe(key2);
  });

  it("should generate different keys for different sectors", () => {
    const key1 = generateCacheKey(MemorySector.Semantic, "test content");
    const key2 = generateCacheKey(MemorySector.Episodic, "test content");
    expect(key1).not.toBe(key2);
  });

  it("should generate different keys for different content", () => {
    const key1 = generateCacheKey(MemorySector.Semantic, "content 1");
    const key2 = generateCacheKey(MemorySector.Semantic, "content 2");
    expect(key1).not.toBe(key2);
  });

  it("should include context in key when provided", () => {
    const context = { timestamp: "2024-01-01", location: "test" };
    const key1 = generateCacheKey(MemorySector.Episodic, "test", context);
    const key2 = generateCacheKey(MemorySector.Episodic, "test");
    expect(key1).not.toBe(key2);
    expect(key1).toContain(":");
  });

  it("should generate different keys for different contexts", () => {
    const context1 = { timestamp: "2024-01-01" };
    const context2 = { timestamp: "2024-01-02" };
    const key1 = generateCacheKey(MemorySector.Episodic, "test", context1);
    const key2 = generateCacheKey(MemorySector.Episodic, "test", context2);
    expect(key1).not.toBe(key2);
  });

  it("should handle complex context objects", () => {
    const context = {
      nested: { deep: { value: 123 } },
      array: [1, 2, 3],
      string: "test",
    };
    const key = generateCacheKey(MemorySector.Reflective, "content", context);
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
  });
});

describe("GenericLRUCache", () => {
  let cache: GenericLRUCache<string>;

  beforeEach(() => {
    cache = new GenericLRUCache<string>(3, 1000); // Small size for testing, 1s TTL
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Basic Operations", () => {
    it("should store and retrieve values", () => {
      cache.set("key1", "value1");
      const retrieved = cache.get("key1");
      expect(retrieved).toBe("value1");
    });

    it("should return null for non-existent keys", () => {
      const retrieved = cache.get("nonexistent");
      expect(retrieved).toBeNull();
    });

    it("should check if key exists", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should return correct cache size", () => {
      expect(cache.size()).toBe(0);
      cache.set("key1", "value1");
      expect(cache.size()).toBe(1);
      cache.set("key2", "value2");
      expect(cache.size()).toBe(2);
    });

    it("should clear all entries and reset metrics", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.get("key1"); // Hit
      cache.get("nonexistent"); // Miss

      expect(cache.size()).toBe(2);
      const metricsBefore = cache.getMetrics();
      expect(metricsBefore.hits).toBe(1);
      expect(metricsBefore.misses).toBe(1);

      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(false);

      const metricsAfter = cache.getMetrics();
      expect(metricsAfter.hits).toBe(0);
      expect(metricsAfter.misses).toBe(0);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict oldest entry when cache is full", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      expect(cache.size()).toBe(3);

      cache.set("key4", "value4");
      expect(cache.size()).toBe(3);
      expect(cache.has("key1")).toBe(false); // Evicted
      expect(cache.has("key2")).toBe(true);
      expect(cache.has("key3")).toBe(true);
      expect(cache.has("key4")).toBe(true);
    });

    it("should not evict when updating existing key", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      expect(cache.size()).toBe(3);

      cache.set("key2", "updated");
      expect(cache.size()).toBe(3);
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(true);
      expect(cache.has("key3")).toBe(true);
      expect(cache.get("key2")).toBe("updated");
    });

    it("should move accessed entries to end (LRU)", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      cache.get("key1"); // Move key1 to end

      cache.set("key4", "value4");
      expect(cache.has("key1")).toBe(true); // Still there
      expect(cache.has("key2")).toBe(false); // Evicted
      expect(cache.has("key3")).toBe(true);
      expect(cache.has("key4")).toBe(true);
    });
  });

  describe("TTL Expiration", () => {
    it("should return null for expired entries in get()", () => {
      cache.set("key1", "value1", 1000);

      expect(cache.get("key1")).toBe("value1");

      vi.advanceTimersByTime(1001);
      expect(cache.get("key1")).toBeNull();
      expect(cache.size()).toBe(0);
    });

    it("should return false for expired entries in has()", () => {
      cache.set("key1", "value1", 1000);

      expect(cache.has("key1")).toBe(true);

      vi.advanceTimersByTime(1001);
      expect(cache.has("key1")).toBe(false);
      expect(cache.size()).toBe(0);
    });

    it("should use default TTL when not specified", () => {
      cache.set("key1", "value1");

      vi.advanceTimersByTime(999);
      expect(cache.get("key1")).toBe("value1");

      vi.advanceTimersByTime(2);
      expect(cache.get("key1")).toBeNull();
    });
  });

  describe("Metrics Tracking", () => {
    it("should track cache hits", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      cache.get("key1"); // Hit
      cache.get("key2"); // Hit
      cache.get("key1"); // Hit

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(3);
      expect(metrics.misses).toBe(0);
      expect(metrics.hitRate).toBe(1.0);
      expect(metrics.size).toBe(2);
    });

    it("should track cache misses", () => {
      cache.get("nonexistent1"); // Miss
      cache.get("nonexistent2"); // Miss

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(2);
      expect(metrics.hitRate).toBe(0);
      expect(metrics.size).toBe(0);
    });

    it("should track expired entries as misses", () => {
      cache.set("key1", "value1", 500);

      cache.get("key1"); // Hit

      vi.advanceTimersByTime(501);
      cache.get("key1"); // Miss (expired)

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBe(0.5);
    });

    it("should calculate hit rate correctly", () => {
      cache.set("key1", "value1");

      cache.get("key1"); // Hit
      cache.get("key1"); // Hit
      cache.get("nonexistent"); // Miss

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBeCloseTo(2 / 3, 2);
    });

    it("should return 0 hit rate when no accesses", () => {
      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.hitRate).toBe(0);
    });

    it("should track metrics across multiple operations", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      cache.get("key1"); // Hit
      cache.get("key2"); // Hit
      cache.get("key3"); // Miss
      cache.get("key1"); // Hit

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(3);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBe(0.75);
      expect(metrics.size).toBe(2);
    });
  });

  describe("Generic Type Support", () => {
    it("should work with number values", () => {
      const numCache = new GenericLRUCache<number>(10, 1000);
      numCache.set("key1", 42);
      expect(numCache.get("key1")).toBe(42);
    });

    it("should work with object values", () => {
      interface TestObject {
        id: number;
        name: string;
      }
      const objCache = new GenericLRUCache<TestObject>(10, 1000);
      const obj = { id: 1, name: "test" };
      objCache.set("key1", obj);
      expect(objCache.get("key1")).toEqual(obj);
    });

    it("should work with array values", () => {
      const arrCache = new GenericLRUCache<number[]>(10, 1000);
      const arr = [1, 2, 3, 4, 5];
      arrCache.set("key1", arr);
      expect(arrCache.get("key1")).toEqual(arr);
    });
  });

  describe("Configuration", () => {
    it("should expose maxSize property", () => {
      const customCache = new GenericLRUCache<string>(100, 5000);
      expect(customCache.maxSize).toBe(100);
    });

    it("should expose defaultTTL property", () => {
      const customCache = new GenericLRUCache<string>(100, 5000);
      expect(customCache.defaultTTL).toBe(5000);
    });
  });
});
