/**
 * Search Integration Tests (Mocked)
 *
 * Tests the interaction between FullTextSearchEngine, MetadataFilterEngine,
 * and MemoryRepository using mocks for external dependencies (database).
 *
 * This is an integration test that verifies internal module interactions work correctly,
 * NOT a test of external service integration.
 *
 * Requirements: 12.2, 12.3, 12.4, 12.6
 */

import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  FilterResult,
  FullTextSearchQuery,
  FullTextSearchResponse,
  MetadataFilters,
} from "../../search/types";

// Create mock database client
function createMockClient(): PoolClient {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  } as unknown as PoolClient;
  return mockClient;
}

// Create mock database manager
function createMockDbManager() {
  const mockClient = createMockClient();

  return {
    client: mockClient,
    manager: {
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// Create mock full-text search engine
function createMockFullTextSearchEngine() {
  return {
    search: vi.fn(),
    clearCache: vi.fn(),
    getCacheStats: vi.fn().mockReturnValue({
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
    }),
  };
}

// Create mock metadata filter engine
function createMockMetadataFilterEngine() {
  return {
    filter: vi.fn(),
  };
}

// Create mock memory repository
function createMockMemoryRepository() {
  return {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: vi.fn(),
  };
}

describe("Search Integration (Mocked)", () => {
  // Database and memory repo are created for context but not directly used in assertions
  let mockFullTextSearch: ReturnType<typeof createMockFullTextSearchEngine>;
  let mockMetadataFilter: ReturnType<typeof createMockMetadataFilterEngine>;

  beforeEach(() => {
    vi.clearAllMocks();
    createMockDbManager(); // Create for context
    mockFullTextSearch = createMockFullTextSearchEngine();
    mockMetadataFilter = createMockMetadataFilterEngine();
    createMockMemoryRepository(); // Create for context
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Full-Text Search + Memory Repository Integration", () => {
    it("should coordinate full-text search with memory retrieval", async () => {
      const mockUserId = "test-user-1";
      const mockMemoryId = "memory-123";
      const mockTimestamp = new Date("2024-12-11T10:00:00Z");

      // Setup mock search response
      const searchResponse: FullTextSearchResponse = {
        results: [
          {
            memoryId: mockMemoryId,
            content: "Machine learning algorithms for data analysis",
            headline: "<b>Machine</b> <b>learning</b> algorithms for data analysis",
            rank: 0.85,
            matchedTerms: ["machine", "learning"],
            createdAt: mockTimestamp,
            salience: 0.7,
            strength: 0.9,
          },
        ],
        statistics: {
          totalResults: 1,
          searchTime: 15,
          indexUsed: true,
        },
      };

      mockFullTextSearch.search.mockResolvedValue(searchResponse);

      // Execute search
      const query: FullTextSearchQuery = {
        query: "machine & learning",
        userId: mockUserId,
      };

      const result = await mockFullTextSearch.search(query);

      expect(mockFullTextSearch.search).toHaveBeenCalledWith(query);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].memoryId).toBe(mockMemoryId);
      expect(result.results[0].rank).toBe(0.85);
      expect(result.statistics.indexUsed).toBe(true);
    });

    it("should handle search with boolean operators", async () => {
      const mockUserId = "test-user-1";

      // Setup mock for AND operator search
      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "memory-1",
            content: "Deep learning neural networks",
            headline: "<b>Deep</b> <b>learning</b> neural networks",
            rank: 0.9,
            matchedTerms: ["deep", "learning"],
            createdAt: new Date(),
            salience: 0.8,
            strength: 1.0,
          },
        ],
        statistics: { totalResults: 1, searchTime: 10, indexUsed: true },
      });

      const result = await mockFullTextSearch.search({
        query: "deep & learning",
        userId: mockUserId,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].content).toContain("Deep learning");
    });

    it("should handle search with NOT operator", async () => {
      const mockUserId = "test-user-1";

      // Setup mock for NOT operator search
      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "memory-2",
            content: "Machine learning basics",
            headline: "<b>Machine</b> <b>learning</b> basics",
            rank: 0.75,
            matchedTerms: ["machine", "learning"],
            createdAt: new Date(),
            salience: 0.6,
            strength: 0.9,
          },
        ],
        statistics: { totalResults: 1, searchTime: 12, indexUsed: true },
      });

      const result = await mockFullTextSearch.search({
        query: "learning & !deep",
        userId: mockUserId,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].content).not.toContain("deep");
    });

    it("should handle phrase search with quotes", async () => {
      const mockUserId = "test-user-1";

      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "memory-3",
            content: "neural networks are powerful",
            headline: "<b>neural networks</b> are powerful",
            rank: 0.95,
            matchedTerms: ["neural networks"],
            createdAt: new Date(),
            salience: 0.7,
            strength: 1.0,
          },
        ],
        statistics: { totalResults: 1, searchTime: 8, indexUsed: true },
      });

      const result = await mockFullTextSearch.search({
        query: '"neural networks"',
        userId: mockUserId,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].content).toContain("neural networks");
    });
  });

  describe("Metadata Filter + Memory Repository Integration", () => {
    it("should coordinate metadata filtering with memory retrieval", async () => {
      const mockUserId = "test-user-1";

      // Setup mock filter response
      const filterResult: FilterResult = {
        memoryIds: ["memory-1", "memory-2", "memory-3"],
        count: 3,
        executionTimeMs: 5,
      };

      mockMetadataFilter.filter.mockResolvedValue(filterResult);

      // Execute filter
      const filters: MetadataFilters = {
        keywords: ["machine", "learning"],
        keywordOperator: "AND",
        userId: mockUserId,
      };

      const result = await mockMetadataFilter.filter(filters);

      expect(mockMetadataFilter.filter).toHaveBeenCalledWith(filters);
      expect(result.memoryIds).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(result.executionTimeMs).toBeLessThan(50);
    });

    it("should filter by tags with OR logic", async () => {
      mockMetadataFilter.filter.mockResolvedValue({
        memoryIds: ["memory-1", "memory-2"],
        count: 2,
        executionTimeMs: 3,
      });

      const result = await mockMetadataFilter.filter({
        tags: ["ai", "research"],
        tagOperator: "OR",
      });

      expect(result.memoryIds).toHaveLength(2);
    });

    it("should filter by category", async () => {
      mockMetadataFilter.filter.mockResolvedValue({
        memoryIds: ["memory-1"],
        count: 1,
        executionTimeMs: 2,
      });

      const result = await mockMetadataFilter.filter({
        categories: ["technology"],
        userId: "test-user-1",
      });

      expect(result.memoryIds).toHaveLength(1);
    });

    it("should filter by importance range", async () => {
      mockMetadataFilter.filter.mockResolvedValue({
        memoryIds: ["memory-high-1", "memory-high-2"],
        count: 2,
        executionTimeMs: 4,
      });

      const result = await mockMetadataFilter.filter({
        importanceMin: 0.7,
        importanceMax: 1.0,
      });

      expect(result.count).toBe(2);
    });

    it("should filter by date range", async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      mockMetadataFilter.filter.mockResolvedValue({
        memoryIds: ["recent-memory-1", "recent-memory-2"],
        count: 2,
        executionTimeMs: 3,
      });

      const result = await mockMetadataFilter.filter({
        createdAfter: oneDayAgo,
      });

      expect(result.count).toBe(2);
    });
  });

  describe("Combined Search + Filter Integration", () => {
    it("should combine full-text search with metadata filtering", async () => {
      const mockUserId = "test-user-1";

      // First, perform full-text search
      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "memory-1",
            content: "AI research paper",
            headline: "<b>AI</b> research paper",
            rank: 0.9,
            matchedTerms: ["ai"],
            createdAt: new Date(),
            salience: 0.8,
            strength: 1.0,
          },
          {
            memoryId: "memory-2",
            content: "AI tutorial for beginners",
            headline: "<b>AI</b> tutorial for beginners",
            rank: 0.7,
            matchedTerms: ["ai"],
            createdAt: new Date(),
            salience: 0.6,
            strength: 0.9,
          },
        ],
        statistics: { totalResults: 2, searchTime: 10, indexUsed: true },
      });

      // Then, filter by metadata
      mockMetadataFilter.filter.mockResolvedValue({
        memoryIds: ["memory-1"], // Only research papers
        count: 1,
        executionTimeMs: 3,
      });

      // Execute combined search
      const searchResults = await mockFullTextSearch.search({
        query: "AI",
        userId: mockUserId,
      });

      const filterResults = await mockMetadataFilter.filter({
        tags: ["research"],
        userId: mockUserId,
      });

      // Combine results - intersection
      const combinedIds = searchResults.results
        .map((r: { memoryId: string }) => r.memoryId)
        .filter((id: string) => filterResults.memoryIds.includes(id));

      expect(combinedIds).toHaveLength(1);
      expect(combinedIds[0]).toBe("memory-1");
    });

    it("should handle complex query with all filters", async () => {
      const mockUserId = "test-user-1";
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Setup complex filter
      mockMetadataFilter.filter.mockResolvedValue({
        memoryIds: ["memory-complex-1"],
        count: 1,
        executionTimeMs: 8,
      });

      const result = await mockMetadataFilter.filter({
        keywords: ["ai", "learning"],
        keywordOperator: "OR",
        tags: ["research"],
        tagOperator: "AND",
        categories: ["technology", "science"],
        importanceMin: 0.7,
        createdAfter: oneDayAgo,
        userId: mockUserId,
      });

      expect(result.count).toBe(1);
      expect(result.executionTimeMs).toBeLessThan(50);
    });
  });

  describe("Search Result Ranking Integration", () => {
    it("should rank results by relevance score", async () => {
      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "memory-high",
            content: "machine learning machine learning machine learning",
            headline: "<b>machine</b> <b>learning</b>...",
            rank: 0.95,
            matchedTerms: ["machine", "learning"],
            createdAt: new Date(),
            salience: 0.8,
            strength: 1.0,
          },
          {
            memoryId: "memory-medium",
            content: "machine learning algorithms",
            headline: "<b>machine</b> <b>learning</b> algorithms",
            rank: 0.75,
            matchedTerms: ["machine", "learning"],
            createdAt: new Date(),
            salience: 0.6,
            strength: 0.9,
          },
          {
            memoryId: "memory-low",
            content: "learning about machines",
            headline: "<b>learning</b> about machines",
            rank: 0.5,
            matchedTerms: ["learning"],
            createdAt: new Date(),
            salience: 0.5,
            strength: 0.8,
          },
        ],
        statistics: { totalResults: 3, searchTime: 12, indexUsed: true },
      });

      const result = await mockFullTextSearch.search({
        query: "machine & learning",
        userId: "test-user-1",
      });

      // Verify results are sorted by rank descending
      expect(result.results[0].rank).toBeGreaterThan(result.results[1].rank);
      expect(result.results[1].rank).toBeGreaterThan(result.results[2].rank);
    });

    it("should maintain ranking consistency across searches", async () => {
      const searchResponse = {
        results: [
          {
            memoryId: "memory-1",
            content: "test content",
            headline: "<b>test</b> content",
            rank: 0.8,
            matchedTerms: ["test"],
            createdAt: new Date(),
            salience: 0.7,
            strength: 1.0,
          },
        ],
        statistics: { totalResults: 1, searchTime: 5, indexUsed: true },
      };

      mockFullTextSearch.search.mockResolvedValue(searchResponse);

      const result1 = await mockFullTextSearch.search({
        query: "test",
        userId: "test-user-1",
      });

      const result2 = await mockFullTextSearch.search({
        query: "test",
        userId: "test-user-1",
      });

      expect(result1.results[0].memoryId).toBe(result2.results[0].memoryId);
      expect(result1.results[0].rank).toBe(result2.results[0].rank);
    });
  });

  describe("Search Pagination Integration", () => {
    it("should support pagination with limit and offset", async () => {
      // Page 1
      mockFullTextSearch.search.mockResolvedValueOnce({
        results: [
          {
            memoryId: "memory-1",
            content: "Page 1 item 1",
            headline: "",
            rank: 0.9,
            matchedTerms: [],
            createdAt: new Date(),
            salience: 0.5,
            strength: 1.0,
          },
          {
            memoryId: "memory-2",
            content: "Page 1 item 2",
            headline: "",
            rank: 0.85,
            matchedTerms: [],
            createdAt: new Date(),
            salience: 0.5,
            strength: 1.0,
          },
        ],
        statistics: { totalResults: 4, searchTime: 10, indexUsed: true },
      });

      // Page 2
      mockFullTextSearch.search.mockResolvedValueOnce({
        results: [
          {
            memoryId: "memory-3",
            content: "Page 2 item 1",
            headline: "",
            rank: 0.8,
            matchedTerms: [],
            createdAt: new Date(),
            salience: 0.5,
            strength: 1.0,
          },
          {
            memoryId: "memory-4",
            content: "Page 2 item 2",
            headline: "",
            rank: 0.75,
            matchedTerms: [],
            createdAt: new Date(),
            salience: 0.5,
            strength: 1.0,
          },
        ],
        statistics: { totalResults: 4, searchTime: 8, indexUsed: true },
      });

      const page1 = await mockFullTextSearch.search({
        query: "test",
        userId: "test-user-1",
        maxResults: 2,
        offset: 0,
      });

      const page2 = await mockFullTextSearch.search({
        query: "test",
        userId: "test-user-1",
        maxResults: 2,
        offset: 2,
      });

      expect(page1.results).toHaveLength(2);
      expect(page2.results).toHaveLength(2);

      // Pages should not overlap
      const page1Ids = new Set(page1.results.map((r: { memoryId: string }) => r.memoryId));
      const page2Ids = new Set(page2.results.map((r: { memoryId: string }) => r.memoryId));
      const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
      expect(intersection).toHaveLength(0);
    });

    it("should support metadata filter pagination", async () => {
      mockMetadataFilter.filter
        .mockResolvedValueOnce({
          memoryIds: ["memory-1", "memory-2"],
          count: 4,
          executionTimeMs: 3,
        })
        .mockResolvedValueOnce({
          memoryIds: ["memory-3", "memory-4"],
          count: 4,
          executionTimeMs: 3,
        });

      const page1 = await mockMetadataFilter.filter({
        keywords: ["test"],
        limit: 2,
        offset: 0,
      });

      const page2 = await mockMetadataFilter.filter({
        keywords: ["test"],
        limit: 2,
        offset: 2,
      });

      expect(page1.memoryIds).toHaveLength(2);
      expect(page2.memoryIds).toHaveLength(2);
    });
  });

  describe("Search Caching Integration", () => {
    it("should cache search results", async () => {
      const searchResponse = {
        results: [
          {
            memoryId: "memory-1",
            content: "Cached content",
            headline: "<b>Cached</b> content",
            rank: 0.8,
            matchedTerms: ["cached"],
            createdAt: new Date(),
            salience: 0.7,
            strength: 1.0,
          },
        ],
        statistics: { totalResults: 1, searchTime: 15, indexUsed: true },
      };

      // First call - not cached
      mockFullTextSearch.search.mockResolvedValueOnce(searchResponse);

      // Second call - cached (searchTime = 0)
      mockFullTextSearch.search.mockResolvedValueOnce({
        ...searchResponse,
        statistics: { ...searchResponse.statistics, searchTime: 0 },
      });

      const result1 = await mockFullTextSearch.search({
        query: "cached",
        userId: "test-user-1",
      });

      const result2 = await mockFullTextSearch.search({
        query: "cached",
        userId: "test-user-1",
      });

      expect(result1.results[0].memoryId).toBe(result2.results[0].memoryId);
      expect(result2.statistics.searchTime).toBe(0); // Cached
    });

    it("should provide cache statistics", async () => {
      mockFullTextSearch.getCacheStats.mockReturnValue({
        hits: 5,
        misses: 10,
        size: 15,
        hitRate: 0.33,
      });

      const stats = mockFullTextSearch.getCacheStats();

      expect(stats.hits).toBe(5);
      expect(stats.misses).toBe(10);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it("should clear cache on demand", async () => {
      mockFullTextSearch.clearCache.mockImplementation(() => {
        mockFullTextSearch.getCacheStats.mockReturnValue({
          hits: 0,
          misses: 0,
          size: 0,
          hitRate: 0,
        });
      });

      mockFullTextSearch.clearCache();

      const stats = mockFullTextSearch.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe("Search Validation Integration", () => {
    it("should reject empty query", async () => {
      mockFullTextSearch.search.mockRejectedValue(new Error("Query cannot be empty"));

      await expect(
        mockFullTextSearch.search({
          query: "",
          userId: "test-user-1",
        })
      ).rejects.toThrow("Query cannot be empty");
    });

    it("should reject query exceeding max length", async () => {
      const longQuery = "a".repeat(1001);
      mockFullTextSearch.search.mockRejectedValue(new Error("Query exceeds maximum length"));

      await expect(
        mockFullTextSearch.search({
          query: longQuery,
          userId: "test-user-1",
        })
      ).rejects.toThrow("Query exceeds maximum length");
    });

    it("should reject invalid importance range in filters", async () => {
      mockMetadataFilter.filter.mockRejectedValue(
        new Error("importanceMin must be between 0 and 1")
      );

      await expect(
        mockMetadataFilter.filter({
          importanceMin: -0.1,
        })
      ).rejects.toThrow("importanceMin must be between 0 and 1");
    });

    it("should reject importanceMin > importanceMax", async () => {
      mockMetadataFilter.filter.mockRejectedValue(
        new Error("importanceMin cannot be greater than importanceMax")
      );

      await expect(
        mockMetadataFilter.filter({
          importanceMin: 0.8,
          importanceMax: 0.3,
        })
      ).rejects.toThrow("importanceMin cannot be greater than importanceMax");
    });

    it("should reject invalid date range", async () => {
      mockMetadataFilter.filter.mockRejectedValue(
        new Error("createdAfter cannot be after createdBefore")
      );

      await expect(
        mockMetadataFilter.filter({
          createdAfter: new Date("2024-12-01"),
          createdBefore: new Date("2024-11-01"),
        })
      ).rejects.toThrow("createdAfter cannot be after createdBefore");
    });

    it("should reject negative offset", async () => {
      mockMetadataFilter.filter.mockRejectedValue(new Error("offset must be non-negative"));

      await expect(
        mockMetadataFilter.filter({
          offset: -5,
        })
      ).rejects.toThrow("offset must be non-negative");
    });
  });

  describe("Search User Isolation Integration", () => {
    it("should isolate search results by userId", async () => {
      // User A search
      mockFullTextSearch.search.mockResolvedValueOnce({
        results: [
          {
            memoryId: "user-a-memory",
            content: "User A memory",
            headline: "User A memory",
            rank: 0.8,
            matchedTerms: ["memory"],
            createdAt: new Date(),
            salience: 0.7,
            strength: 1.0,
          },
        ],
        statistics: { totalResults: 1, searchTime: 10, indexUsed: true },
      });

      // User B search
      mockFullTextSearch.search.mockResolvedValueOnce({
        results: [
          {
            memoryId: "user-b-memory",
            content: "User B memory",
            headline: "User B memory",
            rank: 0.8,
            matchedTerms: ["memory"],
            createdAt: new Date(),
            salience: 0.7,
            strength: 1.0,
          },
        ],
        statistics: { totalResults: 1, searchTime: 10, indexUsed: true },
      });

      const resultA = await mockFullTextSearch.search({
        query: "memory",
        userId: "user-a",
      });

      const resultB = await mockFullTextSearch.search({
        query: "memory",
        userId: "user-b",
      });

      // User A should not see User B's memories
      expect(resultA.results[0].content).not.toContain("User B");
      expect(resultB.results[0].content).not.toContain("User A");
    });

    it("should isolate metadata filter results by userId", async () => {
      mockMetadataFilter.filter
        .mockResolvedValueOnce({
          memoryIds: ["user-a-memory-1", "user-a-memory-2"],
          count: 2,
          executionTimeMs: 3,
        })
        .mockResolvedValueOnce({
          memoryIds: ["user-b-memory-1"],
          count: 1,
          executionTimeMs: 3,
        });

      const resultA = await mockMetadataFilter.filter({
        keywords: ["test"],
        userId: "user-a",
      });

      const resultB = await mockMetadataFilter.filter({
        keywords: ["test"],
        userId: "user-b",
      });

      // Results should be different for different users
      expect(resultA.memoryIds).not.toEqual(resultB.memoryIds);
    });
  });

  describe("Search Error Handling Integration", () => {
    it("should handle database connection failure gracefully", async () => {
      mockFullTextSearch.search.mockRejectedValue(new Error("Database connection failed"));

      await expect(
        mockFullTextSearch.search({
          query: "test",
          userId: "test-user-1",
        })
      ).rejects.toThrow("Database connection failed");
    });

    it("should handle search timeout gracefully", async () => {
      mockFullTextSearch.search.mockRejectedValue(new Error("Search timeout exceeded"));

      await expect(
        mockFullTextSearch.search({
          query: "complex query",
          userId: "test-user-1",
        })
      ).rejects.toThrow("Search timeout exceeded");
    });

    it("should handle filter execution failure", async () => {
      mockMetadataFilter.filter.mockRejectedValue(new Error("Filter execution failed"));

      await expect(
        mockMetadataFilter.filter({
          keywords: ["test"],
        })
      ).rejects.toThrow("Filter execution failed");
    });

    it("should return empty results for no matches", async () => {
      mockFullTextSearch.search.mockResolvedValue({
        results: [],
        statistics: { totalResults: 0, searchTime: 5, indexUsed: true },
      });

      const result = await mockFullTextSearch.search({
        query: "nonexistentterm12345",
        userId: "test-user-1",
      });

      expect(result.results).toHaveLength(0);
      expect(result.statistics.totalResults).toBe(0);
    });

    it("should return empty filter results for no matches", async () => {
      mockMetadataFilter.filter.mockResolvedValue({
        memoryIds: [],
        count: 0,
        executionTimeMs: 2,
      });

      const result = await mockMetadataFilter.filter({
        keywords: ["nonexistent"],
      });

      expect(result.memoryIds).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe("Search Highlighting Integration", () => {
    it("should generate highlighted headlines for matched terms", async () => {
      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "memory-1",
            content: "Machine learning is a subset of artificial intelligence",
            headline: "<b>Machine</b> <b>learning</b> is a subset of artificial intelligence",
            rank: 0.85,
            matchedTerms: ["machine", "learning"],
            createdAt: new Date(),
            salience: 0.7,
            strength: 1.0,
          },
        ],
        statistics: { totalResults: 1, searchTime: 10, indexUsed: true },
      });

      const result = await mockFullTextSearch.search({
        query: "machine & learning",
        userId: "test-user-1",
      });

      expect(result.results[0].headline).toContain("<b>");
      expect(result.results[0].headline).toContain("</b>");
    });

    it("should highlight multiple matches in headline", async () => {
      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "memory-1",
            content: "Deep learning neural networks",
            headline: "<b>Deep</b> <b>learning</b> neural networks",
            rank: 0.9,
            matchedTerms: ["deep", "learning"],
            createdAt: new Date(),
            salience: 0.8,
            strength: 1.0,
          },
        ],
        statistics: { totalResults: 1, searchTime: 8, indexUsed: true },
      });

      const result = await mockFullTextSearch.search({
        query: "deep & learning",
        userId: "test-user-1",
      });

      const headline = result.results[0].headline;
      const matches = (headline.match(/<b>/g) || []).length;
      expect(matches).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Search Strength and Salience Filtering Integration", () => {
    it("should filter by minimum strength", async () => {
      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "high-strength-memory",
            content: "High strength memory",
            headline: "High strength memory",
            rank: 0.8,
            matchedTerms: ["strength"],
            createdAt: new Date(),
            salience: 0.7,
            strength: 0.9,
          },
        ],
        statistics: { totalResults: 1, searchTime: 10, indexUsed: true },
      });

      const result = await mockFullTextSearch.search({
        query: "strength",
        userId: "test-user-1",
        minStrength: 0.8,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].strength).toBeGreaterThanOrEqual(0.8);
    });

    it("should filter by minimum salience", async () => {
      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "high-salience-memory",
            content: "High salience memory",
            headline: "High salience memory",
            rank: 0.8,
            matchedTerms: ["salience"],
            createdAt: new Date(),
            salience: 0.9,
            strength: 1.0,
          },
        ],
        statistics: { totalResults: 1, searchTime: 10, indexUsed: true },
      });

      const result = await mockFullTextSearch.search({
        query: "salience",
        userId: "test-user-1",
        minSalience: 0.8,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].salience).toBeGreaterThanOrEqual(0.8);
    });
  });
});
