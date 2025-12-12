/**
 * Unit Tests for FullTextSearchEngine
 *
 * Tests PostgreSQL ts_vector-based full-text search with query parsing,
 * result ranking, highlighting, and caching.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseConnectionManager } from "../../../database/connection-manager";
import { FullTextSearchEngine } from "../../../search/full-text-search-engine";
import { SearchValidationError } from "../../../search/types";

describe("FullTextSearchEngine", () => {
  let engine: FullTextSearchEngine;
  let mockDb: DatabaseConnectionManager;

  // Helper to create mock clients for each database operation
  const createMockClient = (queryResult: unknown) => ({
    query: vi.fn().mockResolvedValue(queryResult),
  });

  beforeEach(() => {
    mockDb = {
      getConnection: vi.fn(),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    engine = new FullTextSearchEngine(mockDb, { enableCache: false });
  });

  describe("constructor", () => {
    it("should create engine with default config", () => {
      const defaultEngine = new FullTextSearchEngine(mockDb);
      expect(defaultEngine).toBeDefined();
    });

    it("should create engine with custom config", () => {
      const customEngine = new FullTextSearchEngine(mockDb, {
        defaultMaxResults: 50,
        maxAllowedResults: 500,
        defaultLanguage: "spanish",
        enableCache: false,
      });
      expect(customEngine).toBeDefined();
    });
  });

  describe("search", () => {
    it("should execute full-text search and return results", async () => {
      const searchClient = createMockClient({
        rows: [
          {
            memoryId: "mem1",
            content: "Test content about machine learning",
            headline: "<b>machine</b> <b>learning</b> is great",
            rank: 0.95,
            createdAt: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });
      const countClient = createMockClient({ rows: [{ total: "1" }] });
      const explainClient = createMockClient({
        rows: [
          {
            "QUERY PLAN":
              '[{"Plan": {"Node Type": "Index Scan", "Index Name": "idx_memories_search_vector"}}]',
          },
        ],
      });

      (mockDb.getConnection as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(searchClient)
        .mockResolvedValueOnce(countClient)
        .mockResolvedValueOnce(explainClient);

      const result = await engine.search({ query: "machine learning" });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].memoryId).toBe("mem1");
      expect(result.results[0].rank).toBe(0.95);
      expect(result.statistics.totalResults).toBe(1);
      expect(mockDb.getConnection).toHaveBeenCalled();
      expect(mockDb.releaseConnection).toHaveBeenCalled();
    });

    it("should apply userId filter when provided", async () => {
      const searchClient = createMockClient({ rows: [] });
      const countClient = createMockClient({ rows: [{ total: "0" }] });
      const explainClient = createMockClient({ rows: [{}] });

      (mockDb.getConnection as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(searchClient)
        .mockResolvedValueOnce(countClient)
        .mockResolvedValueOnce(explainClient);

      await engine.search({ query: "test", userId: "user123" });

      expect(searchClient.query).toHaveBeenCalledWith(
        expect.stringContaining("user_id"),
        expect.arrayContaining(["user123"])
      );
    });

    it("should apply minStrength filter when provided", async () => {
      const searchClient = createMockClient({ rows: [] });
      const countClient = createMockClient({ rows: [{ total: "0" }] });
      const explainClient = createMockClient({ rows: [{}] });

      (mockDb.getConnection as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(searchClient)
        .mockResolvedValueOnce(countClient)
        .mockResolvedValueOnce(explainClient);

      await engine.search({ query: "test", minStrength: 0.5 });

      expect(searchClient.query).toHaveBeenCalledWith(
        expect.stringContaining("strength >="),
        expect.arrayContaining([0.5])
      );
    });

    it("should apply minSalience filter when provided", async () => {
      const searchClient = createMockClient({ rows: [] });
      const countClient = createMockClient({ rows: [{ total: "0" }] });
      const explainClient = createMockClient({ rows: [{}] });

      (mockDb.getConnection as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(searchClient)
        .mockResolvedValueOnce(countClient)
        .mockResolvedValueOnce(explainClient);

      await engine.search({ query: "test", minSalience: 0.6 });

      expect(searchClient.query).toHaveBeenCalledWith(
        expect.stringContaining("salience >="),
        expect.arrayContaining([0.6])
      );
    });

    it("should use ts_rank_cd when rankingMode is rank_cd", async () => {
      const searchClient = createMockClient({ rows: [] });
      const countClient = createMockClient({ rows: [{ total: "0" }] });
      const explainClient = createMockClient({ rows: [{}] });

      (mockDb.getConnection as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(searchClient)
        .mockResolvedValueOnce(countClient)
        .mockResolvedValueOnce(explainClient);

      await engine.search({ query: "test", rankingMode: "rank_cd" });

      expect(searchClient.query).toHaveBeenCalledWith(
        expect.stringContaining("ts_rank_cd"),
        expect.any(Array)
      );
    });

    it("should use custom language when provided", async () => {
      const searchClient = createMockClient({ rows: [] });
      const countClient = createMockClient({ rows: [{ total: "0" }] });
      const explainClient = createMockClient({ rows: [{}] });

      (mockDb.getConnection as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(searchClient)
        .mockResolvedValueOnce(countClient)
        .mockResolvedValueOnce(explainClient);

      await engine.search({ query: "prueba", language: "spanish" });

      expect(searchClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(["spanish"])
      );
    });

    it("should apply pagination with offset", async () => {
      const searchClient = createMockClient({ rows: [] });
      const countClient = createMockClient({ rows: [{ total: "0" }] });
      const explainClient = createMockClient({ rows: [{}] });

      (mockDb.getConnection as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(searchClient)
        .mockResolvedValueOnce(countClient)
        .mockResolvedValueOnce(explainClient);

      await engine.search({ query: "test", maxResults: 10, offset: 20 });

      expect(searchClient.query).toHaveBeenCalledWith(
        expect.stringContaining("OFFSET"),
        expect.arrayContaining([10, 20])
      );
    });

    it("should return empty results when no matches", async () => {
      const searchClient = createMockClient({ rows: [] });
      const countClient = createMockClient({ rows: [{ total: "0" }] });
      const explainClient = createMockClient({ rows: [{}] });

      (mockDb.getConnection as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(searchClient)
        .mockResolvedValueOnce(countClient)
        .mockResolvedValueOnce(explainClient);

      const result = await engine.search({ query: "nonexistent" });

      expect(result.results).toHaveLength(0);
      expect(result.statistics.totalResults).toBe(0);
    });
  });

  describe("validation", () => {
    it("should throw SearchValidationError for empty query", async () => {
      await expect(engine.search({ query: "" })).rejects.toThrow(SearchValidationError);
    });

    it("should throw SearchValidationError for maxResults less than 1", async () => {
      await expect(engine.search({ query: "test", maxResults: 0 })).rejects.toThrow(
        SearchValidationError
      );
    });

    it("should throw SearchValidationError for maxResults exceeding limit", async () => {
      await expect(engine.search({ query: "test", maxResults: 10001 })).rejects.toThrow(
        SearchValidationError
      );
    });

    it("should throw SearchValidationError for negative offset", async () => {
      await expect(engine.search({ query: "test", offset: -1 })).rejects.toThrow(
        SearchValidationError
      );
    });

    it("should throw SearchValidationError for minStrength out of range", async () => {
      await expect(engine.search({ query: "test", minStrength: -0.1 })).rejects.toThrow(
        SearchValidationError
      );
      await expect(engine.search({ query: "test", minStrength: 1.1 })).rejects.toThrow(
        SearchValidationError
      );
    });

    it("should throw SearchValidationError for minSalience out of range", async () => {
      await expect(engine.search({ query: "test", minSalience: -0.1 })).rejects.toThrow(
        SearchValidationError
      );
      await expect(engine.search({ query: "test", minSalience: 1.1 })).rejects.toThrow(
        SearchValidationError
      );
    });
  });

  describe("caching", () => {
    it("should return cached results on subsequent searches", async () => {
      const cachedEngine = new FullTextSearchEngine(mockDb, { enableCache: true });

      const searchClient = createMockClient({
        rows: [
          {
            memoryId: "mem1",
            content: "Test content",
            headline: "<b>Test</b> content",
            rank: 0.9,
            createdAt: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });
      const countClient = createMockClient({ rows: [{ total: "1" }] });
      const explainClient = createMockClient({ rows: [{}] });
      // For caching full result set
      const cacheSearchClient = createMockClient({
        rows: [
          {
            memoryId: "mem1",
            content: "Test content",
            headline: "<b>Test</b> content",
            rank: 0.9,
            createdAt: new Date(),
            salience: 0.8,
            strength: 0.9,
          },
        ],
      });

      (mockDb.getConnection as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(searchClient)
        .mockResolvedValueOnce(countClient)
        .mockResolvedValueOnce(explainClient)
        .mockResolvedValueOnce(cacheSearchClient);

      // First search
      await cachedEngine.search({ query: "test" });

      // Second search should use cache
      const result = await cachedEngine.search({ query: "test" });

      expect(result.results).toHaveLength(1);
      expect(result.statistics.searchTime).toBe(0); // Cached result
    });

    it("should return cache statistics", () => {
      const stats = engine.getCacheStats();
      expect(stats).toHaveProperty("hits");
      expect(stats).toHaveProperty("misses");
      expect(stats).toHaveProperty("size");
    });

    it("should clear cache", () => {
      engine.clearCache();
      const stats = engine.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe("error handling", () => {
    it("should throw SearchQueryError on database failure", async () => {
      const failingClient = {
        query: vi.fn().mockRejectedValue(new Error("Database connection failed")),
      };

      (mockDb.getConnection as ReturnType<typeof vi.fn>).mockResolvedValue(failingClient);

      await expect(engine.search({ query: "test" })).rejects.toThrow("Failed to execute search");
    });

    it("should re-throw SearchValidationError as-is", async () => {
      await expect(engine.search({ query: "" })).rejects.toThrow(SearchValidationError);
    });
  });

  describe("index verification", () => {
    it("should detect when GIN index is used", async () => {
      const searchClient = createMockClient({ rows: [] });
      const countClient = createMockClient({ rows: [{ total: "0" }] });
      const explainClient = createMockClient({
        rows: [
          {
            "QUERY PLAN":
              '[{"Plan": {"Node Type": "Index Scan", "Index Name": "idx_memories_search_vector"}}]',
          },
        ],
      });

      (mockDb.getConnection as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(searchClient)
        .mockResolvedValueOnce(countClient)
        .mockResolvedValueOnce(explainClient);

      const result = await engine.search({ query: "test" });

      expect(result.statistics.indexUsed).toBe(true);
    });

    it("should detect when GIN index is not used", async () => {
      const searchClient = createMockClient({ rows: [] });
      const countClient = createMockClient({ rows: [{ total: "0" }] });
      const explainClient = createMockClient({
        rows: [{ "QUERY PLAN": '[{"Plan": {"Node Type": "Seq Scan"}}]' }],
      });

      (mockDb.getConnection as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(searchClient)
        .mockResolvedValueOnce(countClient)
        .mockResolvedValueOnce(explainClient);

      const result = await engine.search({ query: "test" });

      expect(result.statistics.indexUsed).toBe(false);
    });

    it("should handle EXPLAIN query failure gracefully", async () => {
      const searchClient = createMockClient({ rows: [] });
      const countClient = createMockClient({ rows: [{ total: "0" }] });
      const explainClient = { query: vi.fn().mockRejectedValue(new Error("EXPLAIN failed")) };

      (mockDb.getConnection as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(searchClient)
        .mockResolvedValueOnce(countClient)
        .mockResolvedValueOnce(explainClient);

      const result = await engine.search({ query: "test" });

      expect(result.statistics.indexUsed).toBe(false);
    });
  });
});
