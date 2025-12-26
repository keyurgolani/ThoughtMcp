/**
 * Unit Tests for ResultCache
 *
 * Tests LRU cache with TTL for search results.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResultCache } from "../../../search/result-cache";
import type { FullTextSearchQuery, FullTextSearchResponse } from "../../../search/types";

describe("ResultCache", () => {
  let cache: ResultCache;

  const mockSearchResponse: FullTextSearchResponse = {
    results: [
      {
        memoryId: "mem-001",
        content: "Test content",
        headline: "Test <b>content</b>",
        rank: 0.95,
        matchedTerms: ["test"],
        createdAt: new Date(),
        salience: 0.8,
        strength: 0.9,
      },
    ],
    statistics: {
      totalResults: 1,
      searchTime: 50,
      indexUsed: true,
    },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new ResultCache({ maxSize: 3, ttl: 60 }); // 60 seconds TTL
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Basic Operations", () => {
    it("should store and retrieve cached results", () => {
      const key = "test-key";
      cache.set(key, mockSearchResponse);

      const result = cache.get(key);
      expect(result).toEqual(mockSearchResponse);
    });

    it("should return null for non-existent keys", () => {
      const result = cache.get("non-existent");
      expect(result).toBeNull();
    });

    it("should track cache misses for non-existent keys", () => {
      cache.get("non-existent");
      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });

    it("should track cache hits for existing keys", () => {
      cache.set("key1", mockSearchResponse);
      cache.get("key1");
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    it("should clear all cached entries", () => {
      cache.set("key1", mockSearchResponse);
      cache.set("key2", mockSearchResponse);
      cache.clear();

      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBeNull();
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });

    it("should reset statistics on clear", () => {
      cache.set("key1", mockSearchResponse);
      cache.get("key1");
      cache.get("non-existent");

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict oldest entry when cache is full", () => {
      cache.set("key1", mockSearchResponse);
      cache.set("key2", mockSearchResponse);
      cache.set("key3", mockSearchResponse);
      cache.set("key4", mockSearchResponse); // Should evict key1

      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).not.toBeNull();
      expect(cache.get("key3")).not.toBeNull();
      expect(cache.get("key4")).not.toBeNull();
    });

    it("should not evict when updating existing key", () => {
      cache.set("key1", mockSearchResponse);
      cache.set("key2", mockSearchResponse);
      cache.set("key3", mockSearchResponse);

      // Update existing key
      const updatedResponse = { ...mockSearchResponse };
      cache.set("key1", updatedResponse);

      const stats = cache.getStats();
      expect(stats.size).toBe(3);
      expect(cache.get("key1")).toEqual(updatedResponse);
    });

    it("should move accessed entries to end (LRU)", () => {
      cache.set("key1", mockSearchResponse);
      cache.set("key2", mockSearchResponse);
      cache.set("key3", mockSearchResponse);

      // Access key1 to move it to end
      cache.get("key1");

      // Add key4, should evict key2 (oldest)
      cache.set("key4", mockSearchResponse);

      expect(cache.get("key1")).not.toBeNull();
      expect(cache.get("key2")).toBeNull();
      expect(cache.get("key3")).not.toBeNull();
      expect(cache.get("key4")).not.toBeNull();
    });
  });

  describe("TTL Expiration", () => {
    it("should return null for expired entries", () => {
      cache.set("key1", mockSearchResponse);

      // Advance time beyond TTL (60 seconds)
      vi.advanceTimersByTime(61 * 1000);

      const result = cache.get("key1");
      expect(result).toBeNull();
    });

    it("should track misses for expired entries", () => {
      cache.set("key1", mockSearchResponse);
      vi.advanceTimersByTime(61 * 1000);

      cache.get("key1");
      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
    });

    it("should delete expired entries on access", () => {
      cache.set("key1", mockSearchResponse);
      vi.advanceTimersByTime(61 * 1000);

      cache.get("key1");
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });

    it("should return valid entries before expiration", () => {
      cache.set("key1", mockSearchResponse);

      // Advance time but not beyond TTL
      vi.advanceTimersByTime(30 * 1000);

      const result = cache.get("key1");
      expect(result).toEqual(mockSearchResponse);
    });

    it("should handle entries at exact TTL boundary", () => {
      cache.set("key1", mockSearchResponse);

      // Advance time to exactly TTL
      vi.advanceTimersByTime(60 * 1000);

      const result = cache.get("key1");
      expect(result).toEqual(mockSearchResponse);
    });

    it("should handle entries just past TTL boundary", () => {
      cache.set("key1", mockSearchResponse);

      // Advance time just past TTL
      vi.advanceTimersByTime(60 * 1000 + 1);

      const result = cache.get("key1");
      expect(result).toBeNull();
    });
  });

  describe("Cache Key Generation", () => {
    it("should generate consistent keys for same query", () => {
      const query: FullTextSearchQuery = {
        query: "test query",
        language: "english",
        rankingMode: "rank",
        userId: "user-123",
      };

      const key1 = cache.generateKey(query);
      const key2 = cache.generateKey(query);

      expect(key1).toBe(key2);
    });

    it("should generate different keys for different queries", () => {
      const query1: FullTextSearchQuery = {
        query: "test query 1",
      };

      const query2: FullTextSearchQuery = {
        query: "test query 2",
      };

      const key1 = cache.generateKey(query1);
      const key2 = cache.generateKey(query2);

      expect(key1).not.toBe(key2);
    });

    it("should exclude pagination parameters from key", () => {
      const query1: FullTextSearchQuery = {
        query: "test query",
        maxResults: 10,
        offset: 0,
      };

      const query2: FullTextSearchQuery = {
        query: "test query",
        maxResults: 20,
        offset: 10,
      };

      const key1 = cache.generateKey(query1);
      const key2 = cache.generateKey(query2);

      expect(key1).toBe(key2);
    });

    it("should include language in key", () => {
      const query1: FullTextSearchQuery = {
        query: "test query",
        language: "english",
      };

      const query2: FullTextSearchQuery = {
        query: "test query",
        language: "spanish",
      };

      const key1 = cache.generateKey(query1);
      const key2 = cache.generateKey(query2);

      expect(key1).not.toBe(key2);
    });

    it("should include ranking mode in key", () => {
      const query1: FullTextSearchQuery = {
        query: "test query",
        rankingMode: "rank",
      };

      const query2: FullTextSearchQuery = {
        query: "test query",
        rankingMode: "rank_cd",
      };

      const key1 = cache.generateKey(query1);
      const key2 = cache.generateKey(query2);

      expect(key1).not.toBe(key2);
    });

    it("should include userId in key", () => {
      const query1: FullTextSearchQuery = {
        query: "test query",
        userId: "user-123",
      };

      const query2: FullTextSearchQuery = {
        query: "test query",
        userId: "user-456",
      };

      const key1 = cache.generateKey(query1);
      const key2 = cache.generateKey(query2);

      expect(key1).not.toBe(key2);
    });

    it("should include minStrength in key", () => {
      const query1: FullTextSearchQuery = {
        query: "test query",
        minStrength: 0.5,
      };

      const query2: FullTextSearchQuery = {
        query: "test query",
        minStrength: 0.7,
      };

      const key1 = cache.generateKey(query1);
      const key2 = cache.generateKey(query2);

      expect(key1).not.toBe(key2);
    });

    it("should include minSalience in key", () => {
      const query1: FullTextSearchQuery = {
        query: "test query",
        minSalience: 0.5,
      };

      const query2: FullTextSearchQuery = {
        query: "test query",
        minSalience: 0.7,
      };

      const key1 = cache.generateKey(query1);
      const key2 = cache.generateKey(query2);

      expect(key1).not.toBe(key2);
    });

    it("should use default values for optional parameters", () => {
      const query: FullTextSearchQuery = {
        query: "test query",
      };

      const key = cache.generateKey(query);
      expect(key).toContain("test query");
      expect(key).toContain("english"); // default language
      expect(key).toContain("rank"); // default ranking mode
    });
  });

  describe("Cache Statistics", () => {
    it("should return correct statistics", () => {
      cache.set("key1", mockSearchResponse);
      cache.get("key1"); // hit
      cache.get("non-existent"); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(3);
      expect(stats.hitRate).toBeCloseTo(0.5);
    });

    it("should calculate hit rate correctly", () => {
      cache.set("key1", mockSearchResponse);
      cache.get("key1"); // hit
      cache.get("key1"); // hit
      cache.get("non-existent"); // miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    it("should return 0 hit rate when no operations", () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it("should track size correctly", () => {
      expect(cache.getStats().size).toBe(0);

      cache.set("key1", mockSearchResponse);
      expect(cache.getStats().size).toBe(1);

      cache.set("key2", mockSearchResponse);
      expect(cache.getStats().size).toBe(2);

      cache.clear();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe("Cleanup", () => {
    it("should remove expired entries during cleanup", () => {
      cache.set("key1", mockSearchResponse);
      cache.set("key2", mockSearchResponse);

      // Advance time to expire both key1 and key2
      vi.advanceTimersByTime(61 * 1000);

      // Add key3 after expiration
      cache.set("key3", mockSearchResponse);

      // Run cleanup
      cache.cleanup();

      const stats = cache.getStats();
      expect(stats.size).toBe(1); // only key3 remains (key1 and key2 expired)
    });

    it("should not remove valid entries during cleanup", () => {
      cache.set("key1", mockSearchResponse);
      cache.set("key2", mockSearchResponse);

      // Advance time but not beyond TTL
      vi.advanceTimersByTime(30 * 1000);

      cache.cleanup();

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(cache.get("key1")).not.toBeNull();
      expect(cache.get("key2")).not.toBeNull();
    });

    it("should handle cleanup with no entries", () => {
      cache.cleanup();
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });

    it("should handle cleanup with all expired entries", () => {
      cache.set("key1", mockSearchResponse);
      cache.set("key2", mockSearchResponse);

      vi.advanceTimersByTime(61 * 1000);

      cache.cleanup();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });

    it("should handle cleanup with mixed expired and valid entries", () => {
      cache.set("key1", mockSearchResponse);

      // Advance time to expire key1
      vi.advanceTimersByTime(61 * 1000);

      // Add key2 after expiration
      cache.set("key2", mockSearchResponse);

      cache.cleanup();

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).not.toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle cache with maxSize of 1", () => {
      const smallCache = new ResultCache({ maxSize: 1, ttl: 60 });
      smallCache.set("key1", mockSearchResponse);
      smallCache.set("key2", mockSearchResponse);

      expect(smallCache.get("key1")).toBeNull();
      expect(smallCache.get("key2")).not.toBeNull();
    });

    it("should handle very short TTL", () => {
      const shortTTLCache = new ResultCache({ maxSize: 3, ttl: 1 }); // 1 second
      shortTTLCache.set("key1", mockSearchResponse);

      vi.advanceTimersByTime(1001);

      expect(shortTTLCache.get("key1")).toBeNull();
    });

    it("should handle very long TTL", () => {
      const longTTLCache = new ResultCache({ maxSize: 3, ttl: 3600 }); // 1 hour
      longTTLCache.set("key1", mockSearchResponse);

      vi.advanceTimersByTime(1800 * 1000); // 30 minutes

      expect(longTTLCache.get("key1")).not.toBeNull();
    });

    it("should handle empty search results", () => {
      const emptyResponse: FullTextSearchResponse = {
        results: [],
        statistics: {
          totalResults: 0,
          searchTime: 10,
          indexUsed: true,
        },
      };

      cache.set("key1", emptyResponse);
      const result = cache.get("key1");
      expect(result).toEqual(emptyResponse);
    });

    it("should handle large search results", () => {
      const largeResponse: FullTextSearchResponse = {
        results: Array.from({ length: 1000 }, (_, i) => ({
          memoryId: `mem-${i}`,
          content: `Content ${i}`,
          headline: `Headline ${i}`,
          rank: 0.5,
          matchedTerms: ["test"],
          createdAt: new Date(),
          salience: 0.5,
          strength: 0.5,
        })),
        statistics: {
          totalResults: 1000,
          searchTime: 100,
          indexUsed: true,
        },
      };

      cache.set("key1", largeResponse);
      const result = cache.get("key1");
      expect(result).toEqual(largeResponse);
    });
  });
});
