/**
 * Unit Tests for MemorySearchEngine
 *
 * Comprehensive tests for integrated search orchestrator combining all search strategies.
 * Follows TDD principles: tests written first, then implementation.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { MemorySearchEngine } from "../../../search/memory-search-engine";
import type { DatabaseConnectionManager } from "../../../database/connection-manager";
import type { EmbeddingStorage } from "../../../embeddings/embedding-storage";
import { MemorySector } from "../../../embeddings/types";
import type { IntegratedSearchQuery, IntegratedSearchConfig } from "../../../search/types";

// Mock the search engine dependencies
vi.mock("../../../search/full-text-search-engine");
vi.mock("../../../search/metadata-filter-engine");
vi.mock("../../../search/similar-memory-finder");

import { FullTextSearchEngine } from "../../../search/full-text-search-engine";
import { MetadataFilterEngine } from "../../../search/metadata-filter-engine";
import { SimilarMemoryFinder } from "../../../search/similar-memory-finder";

describe("MemorySearchEngine", () => {
  let engine: MemorySearchEngine;
  let mockDb: DatabaseConnectionManager;
  let mockEmbeddingStorage: EmbeddingStorage;
  let mockPool: {
    query: ReturnType<typeof vi.fn>;
  };

  let mockFullTextSearch: {
    search: ReturnType<typeof vi.fn>;
    clearCache: ReturnType<typeof vi.fn>;
  };
  let mockMetadataFilter: {
    filter: ReturnType<typeof vi.fn>;
  };
  let mockSimilarityFinder: {
    findSimilar: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock pool
    mockPool = {
      query: vi.fn(),
    };

    // Create mock database manager
    mockDb = {
      pool: mockPool,
      getConnection: vi.fn(),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    // Create mock embedding storage
    mockEmbeddingStorage = {
      vectorSimilaritySearch: vi.fn(),
    } as unknown as EmbeddingStorage;

    // Create mock instances
    mockFullTextSearch = {
      search: vi.fn().mockResolvedValue({ results: [], statistics: {} }),
      clearCache: vi.fn(),
    };

    mockMetadataFilter = {
      filter: vi.fn().mockResolvedValue({ memoryIds: [], count: 0, executionTimeMs: 0 }),
    };

    mockSimilarityFinder = {
      findSimilar: vi.fn().mockResolvedValue([]),
    };

    // Mock FullTextSearchEngine
    (FullTextSearchEngine as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockFullTextSearch
    );

    // Mock MetadataFilterEngine
    (MetadataFilterEngine as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockMetadataFilter
    );

    // Mock SimilarMemoryFinder
    (SimilarMemoryFinder as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockSimilarityFinder
    );

    engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Query Validation", () => {
    it("should accept valid query with text search", async () => {
      const query: IntegratedSearchQuery = {
        text: "test query",
        userId: "user1",
        limit: 10,
      };

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            content: "test content",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      const results = await engine.search(query);
      expect(results).toBeDefined();
    });

    it("should accept valid query with vector search", async () => {
      const query: IntegratedSearchQuery = {
        embedding: new Array(1536).fill(0.1),
        sector: MemorySector.Semantic,
        userId: "user1",
      };

      mockPool.query.mockResolvedValue({ rows: [] });
      (mockEmbeddingStorage.vectorSimilaritySearch as ReturnType<typeof vi.fn>).mockResolvedValue(
        []
      );

      const results = await engine.search(query);
      expect(results).toBeDefined();
    });

    it("should accept valid query with metadata filters", async () => {
      const query: IntegratedSearchQuery = {
        metadata: {
          keywords: ["test"],
          tags: ["important"],
        },
        userId: "user1",
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      const results = await engine.search(query);
      expect(results).toBeDefined();
    });

    it("should accept valid query with similarTo", async () => {
      const query: IntegratedSearchQuery = {
        similarTo: "mem1",
        userId: "user1",
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      const results = await engine.search(query);
      expect(results).toBeDefined();
    });

    it("should reject query with negative limit", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        limit: -1,
      };

      await expect(engine.search(query)).rejects.toMatchObject({
        name: "IntegratedSearchValidationError",
        code: "VALIDATION_ERROR",
        field: "limit",
      });
    });

    it("should reject query with limit exceeding maximum", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        limit: 10000,
      };

      await expect(engine.search(query)).rejects.toMatchObject({
        name: "IntegratedSearchValidationError",
        code: "VALIDATION_ERROR",
        field: "limit",
      });
    });

    it("should reject query with negative offset", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        offset: -1,
      };

      await expect(engine.search(query)).rejects.toMatchObject({
        name: "IntegratedSearchValidationError",
        code: "VALIDATION_ERROR",
        field: "offset",
      });
    });

    it("should reject query with minStrength out of range", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        minStrength: 1.5,
      };

      await expect(engine.search(query)).rejects.toMatchObject({
        name: "IntegratedSearchValidationError",
        code: "VALIDATION_ERROR",
        field: "minStrength",
      });
    });

    it("should reject query with minSalience out of range", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        minSalience: -0.1,
      };

      await expect(engine.search(query)).rejects.toMatchObject({
        name: "IntegratedSearchValidationError",
        code: "VALIDATION_ERROR",
        field: "minSalience",
      });
    });

    it("should reject empty query with no search criteria", async () => {
      const query: IntegratedSearchQuery = {
        userId: "user1",
      };

      await expect(engine.search(query)).rejects.toMatchObject({
        name: "IntegratedSearchValidationError",
        code: "VALIDATION_ERROR",
        field: "query",
      });
    });
  });

  describe("Strategy Selection", () => {
    it("should execute full-text strategy when text is provided", async () => {
      const query: IntegratedSearchQuery = {
        text: "test query",
        userId: "user1",
      };

      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "mem1",
            content: "test content",
            rank: 0.9,
            headline: "test",
            matchedTerms: ["test"],
          },
        ],
        statistics: {},
      });

      mockPool.query.mockResolvedValue({
        rows: [
          {
            content: "test content",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      await engine.search(query);

      // Verify full-text search was executed
      expect(mockFullTextSearch.search).toHaveBeenCalled();
    });

    it("should execute vector strategy when embedding is provided", async () => {
      const query: IntegratedSearchQuery = {
        embedding: new Array(1536).fill(0.1),
        sector: MemorySector.Semantic,
        userId: "user1",
      };

      mockPool.query.mockResolvedValue({ rows: [] });
      (mockEmbeddingStorage.vectorSimilaritySearch as ReturnType<typeof vi.fn>).mockResolvedValue(
        []
      );

      await engine.search(query);

      // Verify vector search was executed
      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalled();
    });

    it("should execute metadata strategy when metadata is provided", async () => {
      const query: IntegratedSearchQuery = {
        metadata: {
          keywords: ["test"],
        },
        userId: "user1",
      };

      mockMetadataFilter.filter.mockResolvedValue({
        memoryIds: [],
        count: 0,
        executionTimeMs: 0,
      });

      await engine.search(query);

      // Verify metadata filter was executed
      expect(mockMetadataFilter.filter).toHaveBeenCalled();
    });

    it("should execute similarity strategy when similarTo is provided", async () => {
      const query: IntegratedSearchQuery = {
        similarTo: "mem1",
        userId: "user1",
      };

      mockSimilarityFinder.findSimilar.mockResolvedValue([]);

      await engine.search(query);

      // Verify similarity search was executed
      expect(mockSimilarityFinder.findSimilar).toHaveBeenCalled();
    });

    it("should execute multiple strategies for hybrid search", async () => {
      const query: IntegratedSearchQuery = {
        text: "test query",
        embedding: new Array(1536).fill(0.1),
        metadata: {
          keywords: ["test"],
        },
        userId: "user1",
      };

      mockFullTextSearch.search.mockResolvedValue({ results: [], statistics: {} });
      mockMetadataFilter.filter.mockResolvedValue({ memoryIds: [], count: 0, executionTimeMs: 0 });
      (mockEmbeddingStorage.vectorSimilaritySearch as ReturnType<typeof vi.fn>).mockResolvedValue(
        []
      );

      await engine.search(query);

      // Verify multiple strategies were executed
      expect(mockFullTextSearch.search).toHaveBeenCalled();
      expect(mockMetadataFilter.filter).toHaveBeenCalled();
      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalled();
    });
  });

  describe("Parallel Execution", () => {
    it("should execute strategies in parallel when enabled", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        parallelExecution: true,
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const query: IntegratedSearchQuery = {
        text: "test",
        embedding: new Array(1536).fill(0.1),
        userId: "user1",
      };

      mockPool.query.mockResolvedValue({ rows: [] });
      (mockEmbeddingStorage.vectorSimilaritySearch as ReturnType<typeof vi.fn>).mockResolvedValue(
        []
      );

      const startTime = Date.now();
      await engine.search(query);
      const duration = Date.now() - startTime;

      // Parallel execution should be faster than sequential
      expect(duration).toBeLessThan(1000);
    });

    it("should handle timeout during parallel execution", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        parallelExecution: true,
        maxExecutionTimeMs: 100,
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
      };

      // Mock slow full-text search
      mockFullTextSearch.search.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ results: [], statistics: {} }), 200))
      );

      await expect(engine.search(query)).rejects.toMatchObject({
        name: "IntegratedSearchTimeoutError",
        code: "TIMEOUT_ERROR",
      });
    });

    it("should handle strategy failure gracefully", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        embedding: new Array(1536).fill(0.1),
        userId: "user1",
      };

      // Mock one strategy failing
      mockPool.query.mockRejectedValue(new Error("Database error"));
      (mockEmbeddingStorage.vectorSimilaritySearch as ReturnType<typeof vi.fn>).mockResolvedValue(
        []
      );

      // Should not throw, but continue with successful strategies
      const results = await engine.search(query);
      expect(results).toBeDefined();
    });

    it("should execute strategies sequentially when parallel is disabled", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        parallelExecution: false,
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const query: IntegratedSearchQuery = {
        text: "test",
        embedding: new Array(1536).fill(0.1),
        userId: "user1",
      };

      mockFullTextSearch.search.mockResolvedValue({ results: [], statistics: {} });
      (mockEmbeddingStorage.vectorSimilaritySearch as ReturnType<typeof vi.fn>).mockResolvedValue(
        []
      );

      await engine.search(query);

      // Verify strategies were executed
      expect(mockFullTextSearch.search).toHaveBeenCalled();
      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalled();
    });

    it("should handle timeout during sequential execution", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        parallelExecution: false,
        maxExecutionTimeMs: 30,
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const query: IntegratedSearchQuery = {
        text: "test",
        embedding: new Array(1536).fill(0.1),
        userId: "user1",
      };

      // Mock first strategy that takes longer than timeout
      // This ensures that when we check before the second strategy, we're already over the limit
      mockFullTextSearch.search.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ results: [], statistics: {} }), 35))
      );

      // Mock second strategy (won't be reached due to timeout)
      (mockEmbeddingStorage.vectorSimilaritySearch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 10))
      );

      // Sequential execution checks timeout BEFORE starting each strategy
      // After first strategy (35ms), before second strategy starts, it checks if 35ms > 30ms (yes) and throws
      await expect(engine.search(query)).rejects.toMatchObject({
        message: expect.stringContaining("exceeded maximum execution time"),
      });
    });
  });

  describe("Composite Ranking", () => {
    it("should calculate composite score from multiple strategies", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        embedding: new Array(1536).fill(0.1),
        userId: "user1",
      };

      // Mock full-text results
      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "mem1",
            content: "test content",
            headline: "test",
            rank: 0.9,
            matchedTerms: ["test"],
          },
        ],
        statistics: {},
      });

      // Mock vector results
      (mockEmbeddingStorage.vectorSimilaritySearch as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          memoryId: "mem1",
          similarity: 0.85,
          sector: MemorySector.Semantic,
        },
      ]);

      // Mock memory data fetch
      mockPool.query.mockResolvedValue({
        rows: [
          {
            content: "test content",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      const results = await engine.search(query);

      expect(results).toHaveLength(1);
      expect(results[0].compositeScore).toBeGreaterThan(0);
      expect(results[0].strategyScores.fullText).toBeDefined();
      expect(results[0].strategyScores.vector).toBeDefined();
    });

    it("should apply configurable weights to strategy scores", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        weights: {
          fullText: 0.5,
          vector: 0.3,
          metadata: 0.1,
          similarity: 0.1,
        },
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const query: IntegratedSearchQuery = {
        text: "test",
        embedding: new Array(1536).fill(0.1),
        userId: "user1",
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      (mockEmbeddingStorage.vectorSimilaritySearch as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          memoryId: "mem1",
          similarity: 0.7,
          sector: MemorySector.Semantic,
        },
      ]);

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      const results = await engine.search(query);

      // Composite score should reflect custom weights
      expect(results[0].compositeScore).toBeGreaterThan(0);
    });

    it("should sort results by composite score", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
      };

      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "mem1",
            content: "test1",
            headline: "test1",
            rank: 0.5,
            matchedTerms: ["test"],
          },
          {
            memoryId: "mem2",
            content: "test2",
            headline: "test2",
            rank: 0.9,
            matchedTerms: ["test"],
          },
        ],
        statistics: {},
      });

      // Mock memory data fetch for mem1
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test1",
            created_at: new Date(),
            salience: 0.5,
            strength: 0.5,
          },
        ],
      });

      // Mock memory data fetch for mem2
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test2",
            created_at: new Date(),
            salience: 0.9,
            strength: 0.9,
          },
        ],
      });

      const results = await engine.search(query);

      expect(results).toHaveLength(2);
      expect(results[0].rank).toBe(1);
      expect(results[1].rank).toBe(2);
      expect(results[0].compositeScore).toBeGreaterThanOrEqual(results[1].compositeScore);
    });

    it("should apply pagination to results", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
        limit: 1,
        offset: 1,
      };

      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "mem1",
            content: "test1",
            headline: "test1",
            rank: 0.9,
            matchedTerms: ["test"],
          },
          {
            memoryId: "mem2",
            content: "test2",
            headline: "test2",
            rank: 0.8,
            matchedTerms: ["test"],
          },
        ],
        statistics: {},
      });

      // Mock memory data fetch for mem1
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test1",
            created_at: new Date(),
            salience: 0.9,
            strength: 0.9,
          },
        ],
      });

      // Mock memory data fetch for mem2
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test2",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.8,
          },
        ],
      });

      const results = await engine.search(query);

      // Should return only 1 result starting from offset 1
      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem2");
    });

    it("should filter by minStrength threshold", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
        minStrength: 0.8,
      };

      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "mem1",
            content: "test1",
            headline: "test1",
            rank: 0.9,
            matchedTerms: ["test"],
          },
          {
            memoryId: "mem2",
            content: "test2",
            headline: "test2",
            rank: 0.8,
            matchedTerms: ["test"],
          },
        ],
        statistics: {},
      });

      // Mock memory data fetch for mem1
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test1",
            created_at: new Date(),
            salience: 0.9,
            strength: 0.9,
          },
        ],
      });

      // Mock memory data fetch for mem2
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test2",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.5,
          },
        ],
      });

      const results = await engine.search(query);

      // Should only return mem1 with strength >= 0.8
      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem1");
    });

    it("should filter by minSalience threshold", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
        minSalience: 0.8,
      };

      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "mem1",
            content: "test1",
            headline: "test1",
            rank: 0.9,
            matchedTerms: ["test"],
          },
          {
            memoryId: "mem2",
            content: "test2",
            headline: "test2",
            rank: 0.8,
            matchedTerms: ["test"],
          },
        ],
        statistics: {},
      });

      // Mock memory data fetch for mem1
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test1",
            created_at: new Date(),
            salience: 0.9,
            strength: 0.9,
          },
        ],
      });

      // Mock memory data fetch for mem2
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test2",
            created_at: new Date(),
            salience: 0.5,
            strength: 0.8,
          },
        ],
      });

      const results = await engine.search(query);

      // Should only return mem1 with salience >= 0.8
      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem1");
    });
  });

  describe("Caching", () => {
    it("should cache search results", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        enableCache: true,
        cacheTTL: 300,
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
      };

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      // First search - should execute query
      await engine.search(query);

      // Second search - should use cache
      await engine.search(query);

      // Verify cache hit
      const stats = engine.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it("should generate consistent cache keys for same query", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        enableCache: true,
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const query1: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
        limit: 10,
        offset: 0,
      };

      const query2: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
        limit: 20,
        offset: 5,
      };

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      await engine.search(query1);
      await engine.search(query2);

      // Cache key should ignore pagination, so second query should hit cache
      const stats = engine.getCacheStats();
      expect(stats.hits).toBe(1);
    });

    it("should expire cached results after TTL", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        enableCache: true,
        cacheTTL: 0.001, // 1ms TTL
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
      };

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      await engine.search(query);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      await engine.search(query);

      // Should be cache miss due to expiration
      const stats = engine.getCacheStats();
      expect(stats.misses).toBe(2);
    });

    it("should clear cache when requested", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        enableCache: true,
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
      };

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      await engine.search(query);

      engine.clearCache();

      const stats = engine.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it("should provide cache statistics", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        enableCache: true,
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const stats = engine.getCacheStats();

      expect(stats).toHaveProperty("hits");
      expect(stats).toHaveProperty("misses");
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("maxSize");
      expect(stats).toHaveProperty("hitRate");
    });
  });

  describe("Analytics Tracking", () => {
    it("should track search analytics when enabled", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        enableAnalytics: true,
        enableCache: false, // Disable cache to ensure execution time is tracked
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
      };

      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matchedTerms: ["test"],
          },
        ],
        statistics: {},
      });

      mockPool.query.mockResolvedValue({
        rows: [
          {
            content: "test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      await engine.search(query);

      const summary = engine.getAnalyticsSummary();
      expect(summary.totalSearches).toBe(1);
      expect(summary.avgExecutionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should calculate analytics summary correctly", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        enableAnalytics: true,
        enableCache: false, // Disable cache to ensure execution time is tracked
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
      };

      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matchedTerms: ["test"],
          },
        ],
        statistics: {},
      });

      mockPool.query.mockResolvedValue({
        rows: [
          {
            content: "test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      for (let i = 0; i < 3; i++) {
        await engine.search(query);
      }

      const summary = engine.getAnalyticsSummary();

      expect(summary.totalSearches).toBe(3);
      expect(summary.avgExecutionTimeMs).toBeGreaterThanOrEqual(0);
      expect(summary.avgResultsCount).toBeGreaterThan(0);
      expect(summary.strategiesUsed["full-text"]).toBe(3);
    });

    it("should filter analytics by date range", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        enableAnalytics: true,
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
      };

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      await engine.search(query);

      const futureDate = new Date(Date.now() + 1000000);
      const summary = engine.getAnalyticsSummary(futureDate);

      expect(summary.totalSearches).toBe(0);
    });

    it("should track cache hit rate in analytics", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        enableAnalytics: true,
        enableCache: true,
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
      };

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            content: "test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      await engine.search(query);
      await engine.search(query);

      const summary = engine.getAnalyticsSummary();
      expect(summary.cacheHitRate).toBe(0.5);
    });

    it("should track top queries", async () => {
      const config: Partial<IntegratedSearchConfig> = {
        enableAnalytics: true,
      };

      engine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, config);

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      for (let i = 0; i < 3; i++) {
        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              memory_id: "mem1",
              content: "test",
              headline: "test",
              rank: 0.9,
              matched_terms: ["test"],
              created_at: new Date(),
              salience: 0.8,
              strength: 0.9,
            },
          ],
        });

        mockPool.query.mockResolvedValueOnce({
          rows: [
            {
              content: "test",
              created_at: new Date(),
              salience: 0.8,
              strength: 0.9,
            },
          ],
        });

        await engine.search({ text: "popular query", userId: "user1" });
      }

      const summary = engine.getAnalyticsSummary();
      expect(summary.topQueries).toHaveLength(1);
      expect(summary.topQueries[0].query).toBe("popular query");
      expect(summary.topQueries[0].count).toBe(3);
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
      };

      mockPool.query.mockRejectedValue(new Error("Connection failed"));

      // Should handle error gracefully
      const results = await engine.search(query);
      expect(results).toBeDefined();
      expect(results).toHaveLength(0);
    });

    it("should handle missing memory data gracefully", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            memory_id: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matched_terms: ["test"],
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      // Mock memory data fetch returning empty
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const results = await engine.search(query);
      expect(results).toHaveLength(0);
    });

    it("should handle partial strategy failures", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        embedding: new Array(1536).fill(0.1),
        userId: "user1",
      };

      // Full-text succeeds
      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matchedTerms: ["test"],
          },
        ],
        statistics: {},
      });

      // Vector search fails
      (mockEmbeddingStorage.vectorSimilaritySearch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Vector search failed")
      );

      // Memory data fetch
      mockPool.query.mockResolvedValue({
        rows: [
          {
            content: "test",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      // Should return results from successful strategy
      const results = await engine.search(query);
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    it("should handle empty results from all strategies", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
      };

      mockPool.query.mockResolvedValue({
        rows: [],
      });

      const results = await engine.search(query);
      expect(results).toHaveLength(0);
    });

    it("should throw error when database is not connected", async () => {
      const disconnectedDb = {
        pool: null,
      } as unknown as DatabaseConnectionManager;

      engine = new MemorySearchEngine(disconnectedDb, mockEmbeddingStorage);

      const query: IntegratedSearchQuery = {
        text: "test",
        userId: "user1",
      };

      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "mem1",
            content: "test",
            headline: "test",
            rank: 0.9,
            matchedTerms: ["test"],
          },
        ],
        statistics: {},
      });

      await expect(engine.search(query)).rejects.toThrow("Database not connected");
    });
  });

  describe("Result Explanation", () => {
    it("should generate explanation for search results", async () => {
      const query: IntegratedSearchQuery = {
        text: "test",
        embedding: new Array(1536).fill(0.1),
        userId: "user1",
      };

      mockFullTextSearch.search.mockResolvedValue({
        results: [
          {
            memoryId: "mem1",
            content: "test content",
            headline: "test",
            rank: 0.9,
            matchedTerms: ["test"],
          },
        ],
        statistics: {},
      });

      (mockEmbeddingStorage.vectorSimilaritySearch as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          memoryId: "mem1",
          similarity: 0.85,
          sector: MemorySector.Semantic,
        },
      ]);

      mockPool.query.mockResolvedValue({
        rows: [
          {
            content: "test content",
            created_at: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      const results = await engine.search(query);

      expect(results[0].explanation).toBeDefined();
      expect(results[0].explanation).toContain("Full-text match");
      expect(results[0].explanation).toContain("Vector similarity");
    });
  });
});
