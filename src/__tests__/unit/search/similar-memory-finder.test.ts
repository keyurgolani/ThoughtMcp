/**
 * Similar Memory Finder Tests
 *
 * Tests for multi-factor similarity calculation including:
 * - Keyword overlap (Jaccard similarity)
 * - Tag similarity
 * - Content similarity (cosine)
 * - Category matching
 * - Temporal proximity
 * - Composite scoring
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseConnectionManager } from "../../../database/connection-manager";
import { SimilarMemoryFinder } from "../../../search/similar-memory-finder";
import { createTestMemory, createTestMemoryMetadata } from "../../utils/test-fixtures";

describe("SimilarMemoryFinder", () => {
  let finder: SimilarMemoryFinder;
  let mockDb: DatabaseConnectionManager;
  let mockClient: {
    query: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    mockDb = {
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    finder = new SimilarMemoryFinder(mockDb, { enableCache: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateKeywordSimilarity", () => {
    it("should return 1.0 for identical keywords", async () => {
      const memory1 = createTestMemory({
        id: "mem1",
        metadata: createTestMemoryMetadata({
          keywords: ["machine", "learning", "algorithms"],
        }),
      });

      const memory2 = createTestMemory({
        id: "mem2",
        metadata: createTestMemoryMetadata({
          keywords: ["machine", "learning", "algorithms"],
        }),
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            keywords1: memory1.metadata.keywords,
            keywords2: memory2.metadata.keywords,
          },
        ],
      });

      const similarity = await finder.calculateKeywordSimilarity(memory1.id, memory2.id);

      expect(similarity).toBe(1.0);
    });

    it("should return 0.0 for no keyword overlap", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            keywords1: ["machine", "learning"],
            keywords2: ["cooking", "recipes"],
          },
        ],
      });

      const similarity = await finder.calculateKeywordSimilarity("mem1", "mem2");

      expect(similarity).toBe(0.0);
    });

    it("should calculate correct Jaccard similarity for partial overlap", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            keywords1: ["machine", "learning", "algorithms"],
            keywords2: ["machine", "learning", "data"],
          },
        ],
      });

      const similarity = await finder.calculateKeywordSimilarity("mem1", "mem2");

      // Jaccard: intersection(2) / union(4) = 0.5
      expect(similarity).toBe(0.5);
    });

    it("should handle empty keywords gracefully", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ keywords1: [], keywords2: [] }],
      });

      const similarity = await finder.calculateKeywordSimilarity("mem1", "mem2");

      expect(similarity).toBe(0.0);
    });
  });

  describe("calculateTagSimilarity", () => {
    it("should return 1.0 for identical tags", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            tags1: ["important", "work"],
            tags2: ["important", "work"],
          },
        ],
      });

      const similarity = await finder.calculateTagSimilarity("mem1", "mem2");

      expect(similarity).toBe(1.0);
    });

    it("should return 0.0 for no tag overlap", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            tags1: ["important", "work"],
            tags2: ["personal", "hobby"],
          },
        ],
      });

      const similarity = await finder.calculateTagSimilarity("mem1", "mem2");

      expect(similarity).toBe(0.0);
    });
  });

  describe("calculateContentSimilarity", () => {
    it("should return 1.0 for identical embeddings", async () => {
      const embedding = [0.5, 0.5, 0.5, 0.5];
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            embedding1: embedding,
            embedding2: embedding,
          },
        ],
      });

      const similarity = await finder.calculateContentSimilarity("mem1", "mem2");

      expect(similarity).toBe(1.0);
    });

    it("should return 0.0 for orthogonal embeddings", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            embedding1: [1, 0, 0, 0],
            embedding2: [0, 1, 0, 0],
          },
        ],
      });

      const similarity = await finder.calculateContentSimilarity("mem1", "mem2");

      expect(similarity).toBe(0.0);
    });

    it("should handle missing embeddings gracefully", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ embedding1: null, embedding2: null }],
      });

      const similarity = await finder.calculateContentSimilarity("mem1", "mem2");

      expect(similarity).toBe(0.0);
    });
  });

  describe("calculateCategoryMatch", () => {
    it("should return 1.0 for matching categories", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ category1: "work", category2: "work" }],
      });

      const match = await finder.calculateCategoryMatch("mem1", "mem2");

      expect(match).toBe(1.0);
    });

    it("should return 0.0 for different categories", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ category1: "work", category2: "personal" }],
      });

      const match = await finder.calculateCategoryMatch("mem1", "mem2");

      expect(match).toBe(0.0);
    });
  });

  describe("calculateTemporalProximity", () => {
    it("should return 1.0 for identical timestamps", async () => {
      const timestamp = new Date();
      mockClient.query.mockResolvedValueOnce({
        rows: [{ created_at1: timestamp, created_at2: timestamp }],
      });

      const proximity = await finder.calculateTemporalProximity("mem1", "mem2");

      expect(proximity).toBe(1.0);
    });

    it("should return lower proximity for distant timestamps", async () => {
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      mockClient.query.mockResolvedValueOnce({
        rows: [{ created_at1: now, created_at2: oneYearAgo }],
      });

      const proximity = await finder.calculateTemporalProximity("mem1", "mem2");

      expect(proximity).toBeLessThan(0.5);
    });
  });

  describe("Configuration", () => {
    it("should create finder with default config", () => {
      const defaultFinder = new SimilarMemoryFinder(mockDb);
      expect(defaultFinder).toBeDefined();
    });

    it("should create finder with custom config", () => {
      const customFinder = new SimilarMemoryFinder(mockDb, {
        enableCache: true,
        cacheTTL: 60000,
      });
      expect(customFinder).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors in keyword similarity", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(finder.calculateKeywordSimilarity("mem1", "mem2")).rejects.toThrow();
    });

    it("should handle database errors in tag similarity", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(finder.calculateTagSimilarity("mem1", "mem2")).rejects.toThrow();
    });

    it("should handle database errors in content similarity", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(finder.calculateContentSimilarity("mem1", "mem2")).rejects.toThrow();
    });

    it("should handle database errors in category match", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(finder.calculateCategoryMatch("mem1", "mem2")).rejects.toThrow();
    });

    it("should handle database errors in temporal proximity", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(finder.calculateTemporalProximity("mem1", "mem2")).rejects.toThrow();
    });
  });
});
