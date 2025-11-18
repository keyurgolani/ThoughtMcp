/**
 * Tests for MemorySearchEngine - Integrated Search Orchestrator
 *
 * Tests the orchestration of all search strategies with composite ranking,
 * caching, and analytics tracking.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemorySector } from "../../../embeddings/types";
import { MemorySearchEngine } from "../../../search/memory-search-engine";

describe("MemorySearchEngine", () => {
  let mockDb: any;
  let mockEmbeddingStorage: any;
  let searchEngine: MemorySearchEngine;

  beforeEach(() => {
    // Mock database connection manager
    mockDb = {
      pool: {
        query: vi.fn(),
      },
    };

    // Mock embedding storage
    mockEmbeddingStorage = {
      vectorSimilaritySearch: vi.fn(),
    };

    // Create search engine instance
    searchEngine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, {
      enableCache: true,
      enableAnalytics: true,
      parallelExecution: true,
      maxExecutionTimeMs: 5000,
      defaultLimit: 10,
      maxLimit: 100,
    });
  });

  describe("Validation", () => {
    it("should throw error when no search criteria provided", async () => {
      await expect(
        searchEngine.search({
          userId: "user-1",
        })
      ).rejects.toMatchObject({
        name: "IntegratedSearchValidationError",
        message: "At least one search criterion must be provided",
      });
    });

    it("should throw error for negative limit", async () => {
      await expect(
        searchEngine.search({
          userId: "user-1",
          text: "test",
          limit: -1,
        })
      ).rejects.toMatchObject({
        name: "IntegratedSearchValidationError",
        message: "Limit must be non-negative",
      });
    });

    it("should throw error for limit exceeding max", async () => {
      await expect(
        searchEngine.search({
          userId: "user-1",
          text: "test",
          limit: 200,
        })
      ).rejects.toMatchObject({
        name: "IntegratedSearchValidationError",
        message: "Limit cannot exceed 100",
      });
    });

    it("should throw error for negative offset", async () => {
      await expect(
        searchEngine.search({
          userId: "user-1",
          text: "test",
          offset: -1,
        })
      ).rejects.toMatchObject({
        name: "IntegratedSearchValidationError",
        message: "Offset must be non-negative",
      });
    });

    it("should throw error for invalid minStrength", async () => {
      await expect(
        searchEngine.search({
          userId: "user-1",
          text: "test",
          minStrength: 1.5,
        })
      ).rejects.toMatchObject({
        name: "IntegratedSearchValidationError",
        message: "minStrength must be between 0 and 1",
      });
    });

    it("should throw error for invalid minSalience", async () => {
      await expect(
        searchEngine.search({
          userId: "user-1",
          text: "test",
          minSalience: -0.1,
        })
      ).rejects.toMatchObject({
        name: "IntegratedSearchValidationError",
        message: "minSalience must be between 0 and 1",
      });
    });
  });

  describe("Strategy Execution", () => {
    beforeEach(() => {
      // Mock full-text search results
      vi.spyOn(searchEngine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: { headline: "Test", matchedTerms: ["test"] },
        },
      ]);

      // Mock database query for memory data
      mockDb.pool.query.mockResolvedValue({
        rows: [
          {
            content: "Test content",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });
    });

    it("should execute full-text search strategy", async () => {
      const results = await searchEngine.search({
        userId: "user-1",
        text: "test query",
      });

      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem-1");
      expect(results[0].content).toBe("Test content");
    });

    it("should execute vector search strategy", async () => {
      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        {
          memoryId: "mem-2",
          similarity: 0.85,
          sector: MemorySector.Semantic,
        },
      ]);

      const results = await searchEngine.search({
        userId: "user-1",
        embedding: new Array(1536).fill(0.1),
        sector: MemorySector.Semantic,
      });

      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem-2");
      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalled();
    });

    it("should execute metadata filter strategy", async () => {
      vi.spyOn(searchEngine as any, "executeMetadataFilter").mockResolvedValue([
        {
          strategy: "metadata",
          memoryId: "mem-3",
          score: 1.0,
          metadata: {},
        },
      ]);

      const results = await searchEngine.search({
        userId: "user-1",
        metadata: {
          keywords: ["test"],
        },
      });

      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem-3");
    });

    it("should execute similarity search strategy", async () => {
      vi.spyOn(searchEngine as any, "executeSimilaritySearch").mockResolvedValue([
        {
          strategy: "similarity",
          memoryId: "mem-4",
          score: 0.75,
          metadata: { explanation: "Similar content" },
        },
      ]);

      const results = await searchEngine.search({
        userId: "user-1",
        similarTo: "mem-source",
      });

      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem-4");
    });
  });

  describe("Parallel vs Sequential Execution", () => {
    beforeEach(() => {
      vi.spyOn(searchEngine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: {},
        },
      ]);

      mockDb.pool.query.mockResolvedValue({
        rows: [
          {
            content: "Test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });
    });

    it("should execute strategies in parallel when enabled", async () => {
      const engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, {
        parallelExecution: true,
      });

      vi.spyOn(engine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: {},
        },
      ]);

      mockDb.pool.query.mockResolvedValue({
        rows: [
          {
            content: "Test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      const results = await engine.search({
        userId: "user-1",
        text: "test",
      });

      expect(results).toHaveLength(1);
    });

    it("should execute strategies sequentially when parallel disabled", async () => {
      const engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, {
        parallelExecution: false,
      });

      vi.spyOn(engine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: {},
        },
      ]);

      mockDb.pool.query.mockResolvedValue({
        rows: [
          {
            content: "Test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      const results = await engine.search({
        userId: "user-1",
        text: "test",
      });

      expect(results).toHaveLength(1);
    });
  });

  describe("Timeout Handling", () => {
    it("should throw timeout error when search exceeds max execution time", async () => {
      const engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, {
        parallelExecution: true,
        maxExecutionTimeMs: 100,
      });

      vi.spyOn(engine as any, "executeFullTextSearch").mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      );

      await expect(
        engine.search({
          userId: "user-1",
          text: "test",
        })
      ).rejects.toMatchObject({
        name: "IntegratedSearchTimeoutError",
        message: "Search exceeded maximum execution time of 100ms",
      });
    });
  });

  describe("Result Filtering", () => {
    beforeEach(() => {
      vi.spyOn(searchEngine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: {},
        },
        {
          strategy: "full-text",
          memoryId: "mem-2",
          score: 0.8,
          metadata: {},
        },
      ]);
    });

    it("should filter results by minStrength", async () => {
      mockDb.pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              content: "High strength",
              created_at: new Date(),
              salience: 0.8,
              strength: 0.9,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              content: "Low strength",
              created_at: new Date(),
              salience: 0.8,
              strength: 0.3,
            },
          ],
        });

      const results = await searchEngine.search({
        userId: "user-1",
        text: "test",
        minStrength: 0.5,
      });

      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem-1");
      expect(results[0].strength).toBe(0.9);
    });

    it("should filter results by minSalience", async () => {
      mockDb.pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              content: "High salience",
              created_at: new Date(),
              salience: 0.9,
              strength: 0.8,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              content: "Low salience",
              created_at: new Date(),
              salience: 0.2,
              strength: 0.8,
            },
          ],
        });

      const results = await searchEngine.search({
        userId: "user-1",
        text: "test",
        minSalience: 0.5,
      });

      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem-1");
      expect(results[0].salience).toBe(0.9);
    });

    it("should skip memories not found in database", async () => {
      mockDb.pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              content: "Found",
              created_at: new Date(),
              salience: 0.8,
              strength: 0.9,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [], // Memory not found
        });

      const results = await searchEngine.search({
        userId: "user-1",
        text: "test",
      });

      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem-1");
    });
  });

  describe("Composite Scoring", () => {
    it("should calculate composite score from multiple strategies", async () => {
      vi.spyOn(searchEngine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: {},
        },
      ]);

      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        {
          memoryId: "mem-1",
          similarity: 0.8,
          sector: MemorySector.Semantic,
        },
      ]);

      mockDb.pool.query.mockResolvedValue({
        rows: [
          {
            content: "Test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      const results = await searchEngine.search({
        userId: "user-1",
        text: "test",
        embedding: new Array(1536).fill(0.1),
      });

      expect(results).toHaveLength(1);
      expect(results[0].compositeScore).toBeGreaterThan(0);
      expect(results[0].strategyScores.fullText).toBe(0.9);
      expect(results[0].strategyScores.vector).toBe(0.8);
    });

    it("should rank results by composite score", async () => {
      vi.spyOn(searchEngine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: {},
        },
        {
          strategy: "full-text",
          memoryId: "mem-2",
          score: 0.7,
          metadata: {},
        },
      ]);

      mockDb.pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              content: "High score",
              created_at: new Date(),
              salience: 0.8,
              strength: 0.9,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              content: "Low score",
              created_at: new Date(),
              salience: 0.8,
              strength: 0.9,
            },
          ],
        });

      const results = await searchEngine.search({
        userId: "user-1",
        text: "test",
      });

      expect(results).toHaveLength(2);
      expect(results[0].rank).toBe(1);
      expect(results[1].rank).toBe(2);
      expect(results[0].compositeScore).toBeGreaterThan(results[1].compositeScore);
    });
  });

  describe("Pagination", () => {
    beforeEach(() => {
      vi.spyOn(searchEngine as any, "executeFullTextSearch").mockResolvedValue([
        { strategy: "full-text", memoryId: "mem-1", score: 0.9, metadata: {} },
        { strategy: "full-text", memoryId: "mem-2", score: 0.8, metadata: {} },
        { strategy: "full-text", memoryId: "mem-3", score: 0.7, metadata: {} },
      ]);

      mockDb.pool.query.mockImplementation((_sql: string, params: any[]) => {
        const memoryId = params[0];
        return Promise.resolve({
          rows: [
            {
              content: `Content ${memoryId}`,
              created_at: new Date(),
              salience: 0.8,
              strength: 0.9,
            },
          ],
        });
      });
    });

    it("should apply limit to results", async () => {
      const results = await searchEngine.search({
        userId: "user-1",
        text: "test",
        limit: 2,
      });

      expect(results).toHaveLength(2);
    });

    it("should apply offset to results", async () => {
      const results = await searchEngine.search({
        userId: "user-1",
        text: "test",
        offset: 1,
        limit: 2,
      });

      expect(results).toHaveLength(2);
      expect(results[0].memoryId).toBe("mem-2");
    });

    it("should use default limit when not specified", async () => {
      const results = await searchEngine.search({
        userId: "user-1",
        text: "test",
      });

      expect(results.length).toBeLessThanOrEqual(10); // Default limit
    });
  });

  describe("Caching", () => {
    beforeEach(() => {
      vi.spyOn(searchEngine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: {},
        },
      ]);

      mockDb.pool.query.mockResolvedValue({
        rows: [
          {
            content: "Test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });
    });

    it("should cache search results", async () => {
      const query = {
        userId: "user-1",
        text: "test query",
      };

      // First search - cache miss
      await searchEngine.search(query);

      // Second search - cache hit
      const results = await searchEngine.search(query);

      expect(results).toHaveLength(1);

      const stats = searchEngine.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it("should not cache when caching is disabled", async () => {
      const engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, {
        enableCache: false,
      });

      vi.spyOn(engine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: {},
        },
      ]);

      mockDb.pool.query.mockResolvedValue({
        rows: [
          {
            content: "Test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      await engine.search({ userId: "user-1", text: "test" });
      await engine.search({ userId: "user-1", text: "test" });

      const stats = engine.getCacheStats();
      expect(stats.hits).toBe(0);
    });

    it("should clear cache", async () => {
      await searchEngine.search({ userId: "user-1", text: "test" });

      searchEngine.clearCache();

      const stats = searchEngine.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it("should expire cached entries after TTL", async () => {
      const engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, {
        enableCache: true,
        cacheTTL: 1, // 1 second TTL
      });

      vi.spyOn(engine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: {},
        },
      ]);

      mockDb.pool.query.mockResolvedValue({
        rows: [
          {
            content: "Test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      const query = { userId: "user-1", text: "test" };

      // First search
      await engine.search(query);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Second search - should be cache miss due to expiration
      await engine.search(query);

      const stats = engine.getCacheStats();
      expect(stats.misses).toBe(2);
    });

    it("should exclude pagination from cache key", async () => {
      const query1 = { userId: "user-1", text: "test", limit: 5, offset: 0 };
      const query2 = { userId: "user-1", text: "test", limit: 10, offset: 5 };

      await searchEngine.search(query1);
      await searchEngine.search(query2);

      const stats = searchEngine.getCacheStats();
      expect(stats.hits).toBe(1); // Second query should hit cache
    });
  });

  describe("Analytics", () => {
    beforeEach(() => {
      vi.spyOn(searchEngine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: {},
        },
      ]);

      mockDb.pool.query.mockResolvedValue({
        rows: [
          {
            content: "Test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });
    });

    it("should track search analytics", async () => {
      await searchEngine.search({ userId: "user-1", text: "test" });

      const summary = searchEngine.getAnalyticsSummary();

      expect(summary.totalSearches).toBe(1);
      expect(summary.avgExecutionTimeMs).toBeGreaterThanOrEqual(0);
      expect(summary.strategiesUsed["full-text"]).toBe(1);
    });

    it("should not track analytics when disabled", async () => {
      const engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, {
        enableAnalytics: false,
      });

      vi.spyOn(engine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: {},
        },
      ]);

      mockDb.pool.query.mockResolvedValue({
        rows: [
          {
            content: "Test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      await engine.search({ userId: "user-1", text: "test" });

      const summary = engine.getAnalyticsSummary();
      expect(summary.totalSearches).toBe(0);
    });

    it("should filter analytics by date range", async () => {
      await searchEngine.search({ userId: "user-1", text: "test1" });

      const futureDate = new Date(Date.now() + 1000000);
      const summary = searchEngine.getAnalyticsSummary(futureDate);

      expect(summary.totalSearches).toBe(0);
    });

    it("should track top queries", async () => {
      await searchEngine.search({ userId: "user-1", text: "popular query" });
      await searchEngine.search({ userId: "user-1", text: "popular query" });
      await searchEngine.search({ userId: "user-1", text: "rare query" });

      const summary = searchEngine.getAnalyticsSummary();

      expect(summary.topQueries).toHaveLength(2);
      expect(summary.topQueries[0].query).toBe("popular query");
      expect(summary.topQueries[0].count).toBe(2);
    });

    it("should calculate cache hit rate", async () => {
      const query = { userId: "user-1", text: "test" };

      await searchEngine.search(query); // Miss
      await searchEngine.search(query); // Hit

      const summary = searchEngine.getAnalyticsSummary();
      expect(summary.cacheHitRate).toBe(0.5);
    });
  });

  describe("Error Handling", () => {
    it("should handle strategy execution errors gracefully", async () => {
      vi.spyOn(searchEngine as any, "executeFullTextSearch").mockRejectedValue(
        new Error("Strategy failed")
      );

      mockDb.pool.query.mockResolvedValue({ rows: [] });

      // Should not throw, just return empty results
      const results = await searchEngine.search({
        userId: "user-1",
        text: "test",
      });

      expect(results).toHaveLength(0);
    });

    it("should throw error when database not connected", async () => {
      const disconnectedDb = { pool: null };
      const engine = new MemorySearchEngine(disconnectedDb as any, mockEmbeddingStorage);

      vi.spyOn(engine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: {},
        },
      ]);

      await expect(engine.search({ userId: "user-1", text: "test" })).rejects.toThrow(
        "Database not connected"
      );
    });
  });

  describe("Explanation Generation", () => {
    it("should generate explanation with full-text match", async () => {
      vi.spyOn(searchEngine as any, "executeFullTextSearch").mockResolvedValue([
        {
          strategy: "full-text",
          memoryId: "mem-1",
          score: 0.9,
          metadata: { matchedTerms: ["test", "query"] },
        },
      ]);

      mockDb.pool.query.mockResolvedValue({
        rows: [
          {
            content: "Test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      const results = await searchEngine.search({
        userId: "user-1",
        text: "test query",
      });

      expect(results[0].explanation).toContain("Full-text match");
      expect(results[0].explanation).toContain("test, query");
    });

    it("should generate explanation with vector similarity", async () => {
      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        {
          memoryId: "mem-1",
          similarity: 0.85,
          sector: MemorySector.Semantic,
        },
      ]);

      mockDb.pool.query.mockResolvedValue({
        rows: [
          {
            content: "Test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      const results = await searchEngine.search({
        userId: "user-1",
        embedding: new Array(1536).fill(0.1),
      });

      expect(results[0].explanation).toContain("Vector similarity");
    });
  });
});
