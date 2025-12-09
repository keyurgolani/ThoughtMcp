/**
 * Memory Repository - Caching Tests
 *
 * Tests for memory retrieval caching to meet performance targets:
 * - p50 < 100ms
 * - p95 < 200ms
 *
 * Following TDD: These tests define expected behavior BEFORE implementation.
 *
 * Requirements: Performance optimization for memory retrieval
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "../../../memory/memory-repository";
import type { SearchQuery } from "../../../memory/types";
import { createTestSectorEmbeddings } from "../../utils/test-fixtures";

describe("MemoryRepository - Caching", () => {
  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockGraphBuilder: any;
  let mockEmbeddingStorage: any;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        if (query.includes("SELECT") && query.includes("memories m")) {
          return Promise.resolve({
            rows: [
              {
                id: "memory-123",
                content: "Test memory content",
                created_at: new Date("2024-01-01"),
                last_accessed: new Date("2024-01-01"),
                access_count: 0,
                salience: 0.7,
                decay_rate: 0.02,
                strength: 1.0,
                user_id: "user-123",
                session_id: "session-456",
                primary_sector: "semantic",
                keywords: ["test", "memory"],
                tags: ["important"],
                category: "general",
                context: "test context",
                importance: 0.8,
                is_atomic: true,
                parent_id: null,
              },
            ],
          });
        }
        if (query.includes("memory_links")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      }),
    };

    mockDb = {
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn().mockResolvedValue(undefined),
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
    };

    mockEmbeddingEngine = {
      generateAllSectorEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
      generateSemanticEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    };

    mockGraphBuilder = {
      createWaypointLinks: vi.fn().mockResolvedValue({ links: [], skippedCount: 0 }),
    };

    mockEmbeddingStorage = {
      storeEmbeddings: vi.fn().mockResolvedValue(undefined),
      retrieveEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
      vectorSimilaritySearch: vi.fn().mockResolvedValue([]),
    };

    repository = new MemoryRepository(
      mockDb,
      mockEmbeddingEngine,
      mockGraphBuilder,
      mockEmbeddingStorage
    );
  });

  describe("Cache Implementation", () => {
    it("should have LRU cache with 10,000 entries capacity", async () => {
      const cache = (repository as any).searchCache;
      expect(cache).toBeDefined();
      expect(cache.maxSize).toBe(10000);
    });

    it("should have 5 minute TTL for cached entries", async () => {
      const cache = (repository as any).searchCache;
      expect(cache).toBeDefined();
      expect(cache.defaultTTL).toBe(300000);
    });
  });

  describe("Cache Key Generation", () => {
    it("should generate consistent cache keys for identical queries", async () => {
      const query1: SearchQuery = {
        userId: "user-123",
        text: "test query",
        limit: 10,
      };

      const query2: SearchQuery = {
        userId: "user-123",
        text: "test query",
        limit: 10,
      };

      const key1 = (repository as any).generateSearchCacheKey(query1);
      const key2 = (repository as any).generateSearchCacheKey(query2);

      expect(key1).toBe(key2);
    });

    it("should generate different cache keys for different queries", async () => {
      const query1: SearchQuery = {
        userId: "user-123",
        text: "test query",
        limit: 10,
      };

      const query2: SearchQuery = {
        userId: "user-123",
        text: "different query",
        limit: 10,
      };

      const key1 = (repository as any).generateSearchCacheKey(query1);
      const key2 = (repository as any).generateSearchCacheKey(query2);

      expect(key1).not.toBe(key2);
    });

    it("should include userId in cache key", async () => {
      const query1: SearchQuery = {
        userId: "user-123",
        text: "test query",
        limit: 10,
      };

      const query2: SearchQuery = {
        userId: "user-456",
        text: "test query",
        limit: 10,
      };

      const key1 = (repository as any).generateSearchCacheKey(query1);
      const key2 = (repository as any).generateSearchCacheKey(query2);

      expect(key1).not.toBe(key2);
    });
  });

  describe("Cache Hit Behavior", () => {
    it("should return cached results on second identical search", async () => {
      const query: SearchQuery = {
        userId: "user-123",
        text: "test query",
        limit: 10,
      };

      await repository.search(query);
      const firstCallCount = mockClient.query.mock.calls.length;

      await repository.search(query);
      const secondCallCount = mockClient.query.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });

    it("should track cache hit metrics", async () => {
      const query: SearchQuery = {
        userId: "user-123",
        text: "test query",
        limit: 10,
      };

      await repository.search(query);
      await repository.search(query);

      const metrics = (repository as any).getCacheMetrics();

      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBeCloseTo(0.5, 2);
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate cache when memory is created", async () => {
      const query: SearchQuery = {
        userId: "user-123",
        text: "test query",
        limit: 10,
      };

      await repository.search(query);
      const firstCallCount = mockClient.query.mock.calls.length;

      await repository.create({
        content: "New memory",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      });

      await repository.search(query);
      const secondCallCount = mockClient.query.mock.calls.length;

      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });

    it("should invalidate cache when memory is updated", async () => {
      const query: SearchQuery = {
        userId: "user-123",
        text: "test query",
        limit: 10,
      };

      await repository.search(query);
      const firstCallCount = mockClient.query.mock.calls.length;

      await repository.update({
        memoryId: "memory-123",
        userId: "user-123",
        content: "Updated content",
      });

      await repository.search(query);
      const secondCallCount = mockClient.query.mock.calls.length;

      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });

    it("should invalidate cache when memory is deleted", async () => {
      // Update mock to return a memory for deletion
      mockClient.query.mockImplementation((query: string) => {
        if (
          query.includes("DELETE FROM memories") ||
          query.includes("UPDATE memories SET strength = 0")
        ) {
          return Promise.resolve({ rows: [{ id: "memory-123" }] });
        }
        if (query.includes("SELECT") && query.includes("memories m")) {
          return Promise.resolve({
            rows: [
              {
                id: "memory-123",
                content: "Test memory content",
                created_at: new Date("2024-01-01"),
                last_accessed: new Date("2024-01-01"),
                access_count: 0,
                salience: 0.7,
                decay_rate: 0.02,
                strength: 1.0,
                user_id: "user-123",
                session_id: "session-456",
                primary_sector: "semantic",
                keywords: ["test", "memory"],
                tags: ["important"],
                category: "general",
                context: "test context",
                importance: 0.8,
                is_atomic: true,
                parent_id: null,
              },
            ],
          });
        }
        if (query.includes("memory_links")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const query: SearchQuery = {
        userId: "user-123",
        text: "test query",
        limit: 10,
      };

      await repository.search(query);
      const firstCallCount = mockClient.query.mock.calls.length;

      await repository.delete("memory-123", false);

      await repository.search(query);
      const secondCallCount = mockClient.query.mock.calls.length;

      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });
  });

  describe("Cache Statistics", () => {
    it("should track total cache operations", async () => {
      const query: SearchQuery = {
        userId: "user-123",
        text: "test query",
        limit: 10,
      };

      await repository.search(query);
      await repository.search(query);
      await repository.search(query);

      const metrics = (repository as any).getCacheMetrics();

      expect(metrics.hits + metrics.misses).toBe(3);
    });

    it("should calculate hit rate correctly", async () => {
      const query: SearchQuery = {
        userId: "user-123",
        text: "test query",
        limit: 10,
      };

      await repository.search(query);
      await repository.search(query);
      await repository.search(query);
      await repository.search(query);

      const metrics = (repository as any).getCacheMetrics();

      expect(metrics.hitRate).toBeCloseTo(0.75, 2);
    });
  });
});
