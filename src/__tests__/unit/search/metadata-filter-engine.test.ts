/**
 * Unit tests for MetadataFilterEngine
 *
 * Tests PostgreSQL GIN index-based metadata filtering for memories.
 * Covers keyword/tag array filtering, category filtering,
 * importance range filtering, and date range filtering.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetadataFilterEngine } from "../../../search/metadata-filter-engine";
import { FilterValidationError } from "../../../search/types";

// Mock database connection manager
const createMockDb = () => {
  const mockClient = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  };

  return {
    getConnection: vi.fn().mockResolvedValue(mockClient),
    releaseConnection: vi.fn(),
    mockClient,
  };
};

describe("MetadataFilterEngine", () => {
  let engine: MetadataFilterEngine;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    engine = new MetadataFilterEngine(mockDb as any);
  });

  describe("constructor", () => {
    it("should create engine with default config", () => {
      const eng = new MetadataFilterEngine(mockDb as any);
      expect(eng).toBeInstanceOf(MetadataFilterEngine);
    });

    it("should create engine with custom config", () => {
      const customConfig = {
        defaultOperator: "OR" as const,
        defaultMaxResults: 500,
        queryTimeout: 10000,
      };
      const eng = new MetadataFilterEngine(mockDb as any, customConfig);
      expect(eng).toBeInstanceOf(MetadataFilterEngine);
    });
  });

  describe("filter - validation", () => {
    describe("importance range validation", () => {
      it("should throw FilterValidationError when importanceMin is less than 0", async () => {
        await expect(engine.filter({ importanceMin: -0.1 })).rejects.toThrow(FilterValidationError);
        await expect(engine.filter({ importanceMin: -0.1 })).rejects.toThrow(
          "importanceMin must be between 0 and 1"
        );
      });

      it("should throw FilterValidationError when importanceMin is greater than 1", async () => {
        await expect(engine.filter({ importanceMin: 1.1 })).rejects.toThrow(FilterValidationError);
        await expect(engine.filter({ importanceMin: 1.1 })).rejects.toThrow(
          "importanceMin must be between 0 and 1"
        );
      });

      it("should throw FilterValidationError when importanceMax is less than 0", async () => {
        await expect(engine.filter({ importanceMax: -0.1 })).rejects.toThrow(FilterValidationError);
        await expect(engine.filter({ importanceMax: -0.1 })).rejects.toThrow(
          "importanceMax must be between 0 and 1"
        );
      });

      it("should throw FilterValidationError when importanceMax is greater than 1", async () => {
        await expect(engine.filter({ importanceMax: 1.1 })).rejects.toThrow(FilterValidationError);
        await expect(engine.filter({ importanceMax: 1.1 })).rejects.toThrow(
          "importanceMax must be between 0 and 1"
        );
      });

      it("should throw FilterValidationError when importanceMin is greater than importanceMax", async () => {
        await expect(engine.filter({ importanceMin: 0.8, importanceMax: 0.2 })).rejects.toThrow(
          FilterValidationError
        );
        await expect(engine.filter({ importanceMin: 0.8, importanceMax: 0.2 })).rejects.toThrow(
          "importanceMin cannot be greater than importanceMax"
        );
      });

      it("should accept valid importance range", async () => {
        mockDb.mockClient.query.mockResolvedValue({ rows: [{ memory_id: "mem-1" }] });
        const result = await engine.filter({ importanceMin: 0.2, importanceMax: 0.8 });
        expect(result.memoryIds).toEqual(["mem-1"]);
      });

      it("should accept importanceMin at boundary 0", async () => {
        mockDb.mockClient.query.mockResolvedValue({ rows: [] });
        const result = await engine.filter({ importanceMin: 0 });
        expect(result).toBeDefined();
      });

      it("should accept importanceMax at boundary 1", async () => {
        mockDb.mockClient.query.mockResolvedValue({ rows: [] });
        const result = await engine.filter({ importanceMax: 1 });
        expect(result).toBeDefined();
      });
    });

    describe("date range validation", () => {
      it("should throw FilterValidationError when createdAfter is after createdBefore", async () => {
        const createdAfter = new Date("2024-12-01");
        const createdBefore = new Date("2024-01-01");
        await expect(engine.filter({ createdAfter, createdBefore })).rejects.toThrow(
          FilterValidationError
        );
        await expect(engine.filter({ createdAfter, createdBefore })).rejects.toThrow(
          "createdAfter cannot be after createdBefore"
        );
      });

      it("should throw FilterValidationError when accessedAfter is after accessedBefore", async () => {
        const accessedAfter = new Date("2024-12-01");
        const accessedBefore = new Date("2024-01-01");
        await expect(engine.filter({ accessedAfter, accessedBefore })).rejects.toThrow(
          FilterValidationError
        );
        await expect(engine.filter({ accessedAfter, accessedBefore })).rejects.toThrow(
          "accessedAfter cannot be after accessedBefore"
        );
      });

      it("should accept valid created date range", async () => {
        mockDb.mockClient.query.mockResolvedValue({ rows: [] });
        const createdAfter = new Date("2024-01-01");
        const createdBefore = new Date("2024-12-01");
        const result = await engine.filter({ createdAfter, createdBefore });
        expect(result).toBeDefined();
      });

      it("should accept valid accessed date range", async () => {
        mockDb.mockClient.query.mockResolvedValue({ rows: [] });
        const accessedAfter = new Date("2024-01-01");
        const accessedBefore = new Date("2024-12-01");
        const result = await engine.filter({ accessedAfter, accessedBefore });
        expect(result).toBeDefined();
      });
    });

    describe("pagination validation", () => {
      it("should throw FilterValidationError when limit is 0", async () => {
        await expect(engine.filter({ limit: 0 })).rejects.toThrow(FilterValidationError);
        await expect(engine.filter({ limit: 0 })).rejects.toThrow("limit must be greater than 0");
      });

      it("should throw FilterValidationError when limit is negative", async () => {
        await expect(engine.filter({ limit: -1 })).rejects.toThrow(FilterValidationError);
        await expect(engine.filter({ limit: -1 })).rejects.toThrow("limit must be greater than 0");
      });

      it("should throw FilterValidationError when offset is negative", async () => {
        await expect(engine.filter({ offset: -1 })).rejects.toThrow(FilterValidationError);
        await expect(engine.filter({ offset: -1 })).rejects.toThrow("offset must be non-negative");
      });

      it("should accept valid pagination params", async () => {
        mockDb.mockClient.query.mockResolvedValue({ rows: [] });
        const result = await engine.filter({ limit: 10, offset: 0 });
        expect(result).toBeDefined();
      });

      it("should accept offset of 0", async () => {
        mockDb.mockClient.query.mockResolvedValue({ rows: [] });
        const result = await engine.filter({ offset: 0 });
        expect(result).toBeDefined();
      });
    });
  });

  describe("filter - query building", () => {
    beforeEach(() => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });
    });

    it("should build query with keyword filter using AND operator", async () => {
      await engine.filter({ keywords: ["test", "memory"], keywordOperator: "AND" });

      // Check that query was called with keyword filter
      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery).toBeDefined();
      expect(filterQuery?.[0]).toContain("@>");
    });

    it("should build query with keyword filter using OR operator", async () => {
      await engine.filter({ keywords: ["test", "memory"], keywordOperator: "OR" });

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery).toBeDefined();
      expect(filterQuery?.[0]).toContain("&&");
    });

    it("should build query with tag filter using AND operator", async () => {
      await engine.filter({ tags: ["important", "work"], tagOperator: "AND" });

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery).toBeDefined();
      expect(filterQuery?.[0]).toContain("@>");
    });

    it("should build query with tag filter using OR operator", async () => {
      await engine.filter({ tags: ["important", "work"], tagOperator: "OR" });

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery).toBeDefined();
      expect(filterQuery?.[0]).toContain("&&");
    });

    it("should build query with category filter", async () => {
      await engine.filter({ categories: ["work", "personal"] });

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery).toBeDefined();
      expect(filterQuery?.[0]).toContain("ANY");
    });

    it("should build query with importance range filter", async () => {
      await engine.filter({ importanceMin: 0.5, importanceMax: 0.9 });

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery).toBeDefined();
      expect(filterQuery?.[0]).toContain("importance >=");
      expect(filterQuery?.[0]).toContain("importance <=");
    });

    it("should build query with created date range filter", async () => {
      const createdAfter = new Date("2024-01-01");
      const createdBefore = new Date("2024-12-01");
      await engine.filter({ createdAfter, createdBefore });

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery).toBeDefined();
      expect(filterQuery?.[0]).toContain("created_at >=");
      expect(filterQuery?.[0]).toContain("created_at <=");
    });

    it("should build query with accessed date range filter", async () => {
      const accessedAfter = new Date("2024-01-01");
      const accessedBefore = new Date("2024-12-01");
      await engine.filter({ accessedAfter, accessedBefore });

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery).toBeDefined();
      expect(filterQuery?.[0]).toContain("last_accessed >=");
      expect(filterQuery?.[0]).toContain("last_accessed <=");
    });

    it("should build query with userId filter", async () => {
      await engine.filter({ userId: "user-123" });

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery).toBeDefined();
      expect(filterQuery?.[0]).toContain("user_id =");
    });

    it("should build query with no filters (empty WHERE clause)", async () => {
      await engine.filter({});

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery).toBeDefined();
      // Should not have WHERE clause when no filters
      expect(filterQuery?.[0]).not.toContain("WHERE");
    });

    it("should build query with multiple filters combined", async () => {
      await engine.filter({
        keywords: ["test"],
        tags: ["important"],
        categories: ["work"],
        importanceMin: 0.5,
        userId: "user-123",
      });

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery).toBeDefined();
      expect(filterQuery?.[0]).toContain("WHERE");
      expect(filterQuery?.[0]).toContain("AND");
    });
  });

  describe("filter - execution", () => {
    it("should return filter result with memory IDs", async () => {
      mockDb.mockClient.query.mockResolvedValue({
        rows: [{ memory_id: "mem-1" }, { memory_id: "mem-2" }, { memory_id: "mem-3" }],
      });

      const result = await engine.filter({ keywords: ["test"] });

      expect(result.memoryIds).toEqual(["mem-1", "mem-2", "mem-3"]);
      expect(result.count).toBe(3);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should return empty result when no matches", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      const result = await engine.filter({ keywords: ["nonexistent"] });

      expect(result.memoryIds).toEqual([]);
      expect(result.count).toBe(0);
    });

    it("should set statement timeout", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      await engine.filter({});

      const calls = mockDb.mockClient.query.mock.calls;
      const timeoutCall = calls.find((call) => call[0].includes("statement_timeout"));
      expect(timeoutCall).toBeDefined();
    });

    it("should enable parallel query execution", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      await engine.filter({});

      const calls = mockDb.mockClient.query.mock.calls;
      const parallelCall = calls.find((call) =>
        call[0].includes("max_parallel_workers_per_gather")
      );
      expect(parallelCall).toBeDefined();
    });

    it("should release connection after successful query", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      await engine.filter({});

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockDb.mockClient);
    });

    it("should release connection after failed query", async () => {
      mockDb.mockClient.query.mockRejectedValue(new Error("Database error"));

      await expect(engine.filter({})).rejects.toThrow();

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockDb.mockClient);
    });

    it("should throw error with message when query fails", async () => {
      mockDb.mockClient.query.mockRejectedValue(new Error("Connection timeout"));

      await expect(engine.filter({})).rejects.toThrow(
        "Failed to execute metadata filter: Connection timeout"
      );
    });

    it("should handle non-Error rejection", async () => {
      mockDb.mockClient.query.mockRejectedValue("String error");

      await expect(engine.filter({})).rejects.toThrow(
        "Failed to execute metadata filter: String error"
      );
    });
  });

  describe("filter - default config behavior", () => {
    it("should use default AND operator for keywords when not specified", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      await engine.filter({ keywords: ["test", "memory"] });

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery?.[0]).toContain("@>");
    });

    it("should use default AND operator for tags when not specified", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      await engine.filter({ tags: ["important", "work"] });

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery?.[0]).toContain("@>");
    });

    it("should use default max results when limit not specified", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      await engine.filter({});

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery).toBeDefined();
      expect(filterQuery?.[0]).toContain("LIMIT");
    });

    it("should use offset 0 when not specified", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      await engine.filter({});

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery).toBeDefined();
      expect(filterQuery?.[0]).toContain("OFFSET");
    });
  });

  describe("filter - custom config behavior", () => {
    it("should use custom default operator from config", async () => {
      const customEngine = new MetadataFilterEngine(mockDb as any, {
        defaultOperator: "OR",
      });
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      await customEngine.filter({ keywords: ["test", "memory"] });

      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery?.[0]).toContain("&&");
    });

    it("should use custom query timeout from config", async () => {
      const customEngine = new MetadataFilterEngine(mockDb as any, {
        queryTimeout: 10000,
      });
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      await customEngine.filter({});

      const calls = mockDb.mockClient.query.mock.calls;
      const timeoutCall = calls.find((call) => call[0].includes("statement_timeout"));
      expect(timeoutCall?.[0]).toContain("10000");
    });
  });

  describe("filter - edge cases", () => {
    it("should handle empty keywords array", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      const result = await engine.filter({ keywords: [] });

      expect(result).toBeDefined();
      // Empty array should not add keyword filter
      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery?.[0]).not.toContain("keywords");
    });

    it("should handle empty tags array", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      const result = await engine.filter({ tags: [] });

      expect(result).toBeDefined();
      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery?.[0]).not.toContain("tags");
    });

    it("should handle empty categories array", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      const result = await engine.filter({ categories: [] });

      expect(result).toBeDefined();
      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery?.[0]).not.toContain("category");
    });

    it("should handle only importanceMin filter", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      const result = await engine.filter({ importanceMin: 0.5 });

      expect(result).toBeDefined();
      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery?.[0]).toContain("importance >=");
      expect(filterQuery?.[0]).not.toContain("importance <=");
    });

    it("should handle only importanceMax filter", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      const result = await engine.filter({ importanceMax: 0.8 });

      expect(result).toBeDefined();
      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery?.[0]).toContain("importance <=");
      expect(filterQuery?.[0]).not.toContain("importance >=");
    });

    it("should handle only createdAfter filter", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      const result = await engine.filter({ createdAfter: new Date("2024-01-01") });

      expect(result).toBeDefined();
      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery?.[0]).toContain("created_at >=");
      expect(filterQuery?.[0]).not.toContain("created_at <=");
    });

    it("should handle only createdBefore filter", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      const result = await engine.filter({ createdBefore: new Date("2024-12-01") });

      expect(result).toBeDefined();
      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery?.[0]).toContain("created_at <=");
      expect(filterQuery?.[0]).not.toContain("created_at >=");
    });

    it("should handle only accessedAfter filter", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      const result = await engine.filter({ accessedAfter: new Date("2024-01-01") });

      expect(result).toBeDefined();
      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery?.[0]).toContain("last_accessed >=");
    });

    it("should handle only accessedBefore filter", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [] });

      const result = await engine.filter({ accessedBefore: new Date("2024-12-01") });

      expect(result).toBeDefined();
      const calls = mockDb.mockClient.query.mock.calls;
      const filterQuery = calls.find((call) => call[0].includes("memory_metadata"));
      expect(filterQuery?.[0]).toContain("last_accessed <=");
    });

    it("should handle single keyword", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [{ memory_id: "mem-1" }] });

      const result = await engine.filter({ keywords: ["single"] });

      expect(result.memoryIds).toEqual(["mem-1"]);
    });

    it("should handle single tag", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [{ memory_id: "mem-1" }] });

      const result = await engine.filter({ tags: ["single"] });

      expect(result.memoryIds).toEqual(["mem-1"]);
    });

    it("should handle single category", async () => {
      mockDb.mockClient.query.mockResolvedValue({ rows: [{ memory_id: "mem-1" }] });

      const result = await engine.filter({ categories: ["single"] });

      expect(result.memoryIds).toEqual(["mem-1"]);
    });
  });
});
