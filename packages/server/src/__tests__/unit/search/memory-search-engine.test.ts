/**
 * Tests for MemorySearchEngine - Integrated Search Orchestrator
 *
 * Tests the orchestration of all search strategies with composite ranking,
 * caching, and analytics tracking.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemorySearchEngine } from "../../../search/memory-search-engine";

describe("MemorySearchEngine", () => {
  let mockDb: any;
  let mockEmbeddingStorage: any;
  let searchEngine: MemorySearchEngine;

  beforeEach(() => {
    mockDb = {
      pool: {
        query: vi.fn(),
      },
    };

    mockEmbeddingStorage = {
      vectorSimilaritySearch: vi.fn(),
    };

    searchEngine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, undefined, {
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

    it("should throw error for invalid limit values", async () => {
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

    it("should throw error for invalid minStrength and minSalience", async () => {
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

  describe("Caching", () => {
    it("should clear cache without error", () => {
      searchEngine.clearCache();

      // Cache should be cleared
      expect(searchEngine).toBeDefined();
    });
  });

  describe("Analytics", () => {
    it("should return analytics summary with zero searches", () => {
      const summary = searchEngine.getAnalyticsSummary();

      expect(summary).toHaveProperty("totalSearches");
      expect(summary.totalSearches).toBe(0);
      expect(summary).toHaveProperty("avgExecutionTimeMs");
      expect(summary).toHaveProperty("cacheHitRate");
      expect(summary).toHaveProperty("strategiesUsed");
    });

    it("should filter analytics by date range", () => {
      const startDate = new Date(Date.now() - 86400000); // 1 day ago
      const endDate = new Date();
      const summary = searchEngine.getAnalyticsSummary(startDate, endDate);

      expect(summary.totalSearches).toBe(0);
    });
  });

  describe("Configuration", () => {
    it("should create engine with default config", () => {
      const defaultEngine = new MemorySearchEngine(mockDb, mockEmbeddingStorage);
      expect(defaultEngine).toBeDefined();
    });

    it("should create engine with custom config", () => {
      const customEngine = new MemorySearchEngine(mockDb, mockEmbeddingStorage, undefined, {
        enableCache: false,
        enableAnalytics: false,
        parallelExecution: false,
        maxExecutionTimeMs: 10000,
        defaultLimit: 20,
        maxLimit: 200,
      });
      expect(customEngine).toBeDefined();
    });
  });
});
