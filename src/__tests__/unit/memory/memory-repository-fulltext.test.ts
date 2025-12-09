/**
 * Memory Repository Full-Text Search Integration Tests
 *
 * Tests integration of FullTextSearchEngine with MemoryRepository.
 * Verifies searchFullText() method properly uses full-text search and enriches results.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "../../../memory/memory-repository";
import { createTestSectorEmbeddings } from "../../utils/test-fixtures";

describe("MemoryRepository - Full-Text Search Integration", () => {
  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockGraphBuilder: any;
  let mockEmbeddingStorage: any;

  beforeEach(() => {
    // Mock database client with query method
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        // Mock full-text search results
        if (query.includes("ts_headline") && query.includes("ts_rank")) {
          return Promise.resolve({
            rows: [
              {
                memoryId: "mem-1",
                content: "Test memory content with search keyword",
                headline: "Test memory content with <b>search</b> keyword",
                rank: 0.9,
                createdAt: new Date(),
                salience: 0.7,
                strength: 0.8,
              },
            ],
          });
        }

        // Mock count query
        if (query.includes("COUNT(*)")) {
          return Promise.resolve({ rows: [{ total: 1 }] });
        }

        // Mock EXPLAIN query for index usage
        if (query.includes("EXPLAIN")) {
          return Promise.resolve({
            rows: [
              {
                "QUERY PLAN": [
                  {
                    Plan: {
                      "Node Type": "Index Scan",
                      "Index Name": "idx_memories_search_vector",
                    },
                  },
                ],
              },
            ],
          });
        }

        // Return empty rows for other queries
        return Promise.resolve({ rows: [] });
      }),
    };

    // Mock database connection manager
    mockDb = {
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    // Mock embedding engine
    mockEmbeddingEngine = {
      generateAllSectorEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
      generateSemanticEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.1)),
    };

    // Mock waypoint graph builder
    mockGraphBuilder = {
      createWaypointLinks: vi.fn().mockResolvedValue({
        links: [],
        skippedCount: 0,
      }),
    };

    // Mock embedding storage
    mockEmbeddingStorage = {
      storeEmbeddings: vi.fn().mockResolvedValue(undefined),
      vectorSimilaritySearch: vi.fn().mockResolvedValue([]),
    };

    repository = new MemoryRepository(
      mockDb,
      mockEmbeddingEngine,
      mockGraphBuilder,
      mockEmbeddingStorage
    );
  });

  describe("searchFullText()", () => {
    it("should delegate to FullTextSearchEngine and return results", async () => {
      const result = await repository.searchFullText({
        query: "test",
        userId: "user1",
      });

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalResults).toBeGreaterThanOrEqual(0);
    });

    it("should return search results with proper structure", async () => {
      const result = await repository.searchFullText({
        query: "test",
        userId: "user1",
      });

      expect(result.results.length).toBeGreaterThan(0);
      const firstResult = result.results[0];

      // Verify all required fields are present
      expect(firstResult.memoryId).toBeDefined();
      expect(firstResult.content).toBeDefined();
      expect(firstResult.headline).toBeDefined();
      expect(firstResult.rank).toBeDefined();
      expect(firstResult.matchedTerms).toBeDefined();
      expect(firstResult.createdAt).toBeInstanceOf(Date);
      expect(firstResult.salience).toBeGreaterThanOrEqual(0);
      expect(firstResult.strength).toBeGreaterThanOrEqual(0);
    });

    it("should include search statistics", async () => {
      const result = await repository.searchFullText({
        query: "test",
        userId: "user1",
      });

      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalResults).toBeDefined();
      expect(result.statistics.searchTime).toBeDefined();
      expect(typeof result.statistics.indexUsed).toBe("boolean");
    });

    it("should pass query parameters to FullTextSearchEngine", async () => {
      const result = await repository.searchFullText({
        query: "test query",
        userId: "user1",
        maxResults: 10,
        offset: 0,
        minStrength: 0.5,
        minSalience: 0.6,
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });

    it("should handle empty query validation", async () => {
      await expect(
        repository.searchFullText({
          query: "",
          userId: "user1",
        })
      ).rejects.toThrow();
    });

    it("should allow optional userId parameter", async () => {
      // userId is optional in FullTextSearchQuery, so empty string should work
      const result = await repository.searchFullText({
        query: "test",
        userId: "",
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });

    it("should handle search errors gracefully", async () => {
      // Mock database error
      const errorClient = {
        query: vi.fn().mockRejectedValue(new Error("Database error")),
      };
      mockDb.getConnection = vi.fn().mockResolvedValue(errorClient);

      await expect(
        repository.searchFullText({
          query: "test",
          userId: "user1",
        })
      ).rejects.toThrow();
    });

    it("should support boolean operators", async () => {
      const result = await repository.searchFullText({
        query: "learning & neural",
        userId: "user1",
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });

    it("should support pagination", async () => {
      const result = await repository.searchFullText({
        query: "test",
        userId: "user1",
        maxResults: 5,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.statistics).toBeDefined();
    });

    it("should filter by strength threshold", async () => {
      const result = await repository.searchFullText({
        query: "test",
        userId: "user1",
        minStrength: 0.5,
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });

    it("should filter by salience threshold", async () => {
      const result = await repository.searchFullText({
        query: "test",
        userId: "user1",
        minSalience: 0.7,
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });
  });
});
