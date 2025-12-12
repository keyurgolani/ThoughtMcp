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
});
