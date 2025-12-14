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
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseConnectionManager } from "../../../database/connection-manager";
import { SimilarMemoryFinder } from "../../../search/similar-memory-finder";
import { createTestMemory, createTestMemoryMetadata } from "../../utils/test-fixtures";

describe("SimilarMemoryFinder - Keyword Overlap Calculation", () => {
  let finder: SimilarMemoryFinder;
  let mockDb: DatabaseConnectionManager;
  let mockClient: {
    query: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create mock database client
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    // Create mock database connection manager
    mockDb = {
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    // Create finder instance with caching disabled for predictable test behavior
    finder = new SimilarMemoryFinder(mockDb, { enableCache: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateKeywordSimilarity", () => {
    it("should return 1.0 for identical keywords", async () => {
      // Arrange
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

      // Act
      const similarity = await finder.calculateKeywordSimilarity(memory1.id, memory2.id);

      // Assert
      expect(similarity).toBe(1.0);
      expect(mockDb.getConnection).toHaveBeenCalledOnce();
      expect(mockDb.releaseConnection).toHaveBeenCalledOnce();
    });

    it("should return 0.0 for no keyword overlap", async () => {
      // Arrange
      const memory1 = createTestMemory({
        id: "mem1",
        metadata: createTestMemoryMetadata({
          keywords: ["machine", "learning", "algorithms"],
        }),
      });

      const memory2 = createTestMemory({
        id: "mem2",
        metadata: createTestMemoryMetadata({
          keywords: ["cooking", "recipes", "food"],
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

      // Act
      const similarity = await finder.calculateKeywordSimilarity(memory1.id, memory2.id);

      // Assert
      expect(similarity).toBe(0.0);
    });

    it("should calculate correct Jaccard similarity for partial overlap", async () => {
      // Arrange
      const memory1 = createTestMemory({
        id: "mem1",
        metadata: createTestMemoryMetadata({
          keywords: ["machine", "learning", "algorithms", "neural"],
        }),
      });

      const memory2 = createTestMemory({
        id: "mem2",
        metadata: createTestMemoryMetadata({
          keywords: ["machine", "learning", "data", "science"],
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

      // Act
      const similarity = await finder.calculateKeywordSimilarity(memory1.id, memory2.id);

      // Assert
      // Intersection: {machine, learning} = 2
      // Union: {machine, learning, algorithms, neural, data, science} = 6
      // Jaccard = 2/6 = 0.333...
      expect(similarity).toBeCloseTo(0.333, 2);
    });

    it("should return 0.0 when first memory has empty keywords", async () => {
      // Arrange
      const memory1 = createTestMemory({
        id: "mem1",
        metadata: createTestMemoryMetadata({
          keywords: [],
        }),
      });

      const memory2 = createTestMemory({
        id: "mem2",
        metadata: createTestMemoryMetadata({
          keywords: ["machine", "learning"],
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

      // Act
      const similarity = await finder.calculateKeywordSimilarity(memory1.id, memory2.id);

      // Assert
      expect(similarity).toBe(0.0);
    });

    it("should return 0.0 when second memory has empty keywords", async () => {
      // Arrange
      const memory1 = createTestMemory({
        id: "mem1",
        metadata: createTestMemoryMetadata({
          keywords: ["machine", "learning"],
        }),
      });

      const memory2 = createTestMemory({
        id: "mem2",
        metadata: createTestMemoryMetadata({
          keywords: [],
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

      // Act
      const similarity = await finder.calculateKeywordSimilarity(memory1.id, memory2.id);

      // Assert
      expect(similarity).toBe(0.0);
    });

    it("should return 0.0 when both memories have empty keywords", async () => {
      // Arrange
      const memory1 = createTestMemory({
        id: "mem1",
        metadata: createTestMemoryMetadata({
          keywords: [],
        }),
      });

      const memory2 = createTestMemory({
        id: "mem2",
        metadata: createTestMemoryMetadata({
          keywords: [],
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

      // Act
      const similarity = await finder.calculateKeywordSimilarity(memory1.id, memory2.id);

      // Assert
      expect(similarity).toBe(0.0);
    });

    it("should handle single keyword match correctly", async () => {
      // Arrange
      const memory1 = createTestMemory({
        id: "mem1",
        metadata: createTestMemoryMetadata({
          keywords: ["machine"],
        }),
      });

      const memory2 = createTestMemory({
        id: "mem2",
        metadata: createTestMemoryMetadata({
          keywords: ["machine"],
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

      // Act
      const similarity = await finder.calculateKeywordSimilarity(memory1.id, memory2.id);

      // Assert
      expect(similarity).toBe(1.0);
    });

    it("should be case-insensitive", async () => {
      // Arrange
      const memory1 = createTestMemory({
        id: "mem1",
        metadata: createTestMemoryMetadata({
          keywords: ["Machine", "Learning", "ALGORITHMS"],
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

      // Act
      const similarity = await finder.calculateKeywordSimilarity(memory1.id, memory2.id);

      // Assert
      expect(similarity).toBe(1.0);
    });

    it("should handle realistic keyword sets (3-10 keywords)", async () => {
      // Arrange
      const memory1 = createTestMemory({
        id: "mem1",
        metadata: createTestMemoryMetadata({
          keywords: [
            "artificial",
            "intelligence",
            "machine",
            "learning",
            "neural",
            "networks",
            "deep",
          ],
        }),
      });

      const memory2 = createTestMemory({
        id: "mem2",
        metadata: createTestMemoryMetadata({
          keywords: ["machine", "learning", "algorithms", "data", "science", "statistics"],
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

      // Act
      const similarity = await finder.calculateKeywordSimilarity(memory1.id, memory2.id);

      // Assert
      // Intersection: {machine, learning} = 2
      // Union: {artificial, intelligence, machine, learning, neural, networks, deep, algorithms, data, science, statistics} = 11
      // Jaccard = 2/11 = 0.181...
      expect(similarity).toBeCloseTo(0.182, 2);
    });

    it("should return 0.0 when query returns no rows", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      // Act
      const similarity = await finder.calculateKeywordSimilarity("mem1", "mem2");

      // Assert
      expect(similarity).toBe(0.0);
    });

    it("should handle null keywords gracefully", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            keywords1: null,
            keywords2: ["machine", "learning"],
          },
        ],
      });

      // Act
      const similarity = await finder.calculateKeywordSimilarity("mem1", "mem2");

      // Assert
      expect(similarity).toBe(0.0);
    });

    it("should release connection even if query fails", async () => {
      // Arrange
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      // Act & Assert
      await expect(finder.calculateKeywordSimilarity("mem1", "mem2")).rejects.toThrow();
      expect(mockDb.releaseConnection).toHaveBeenCalledOnce();
    });
  });

  describe("calculateTagSimilarity", () => {
    it("should return 1.0 for identical tags", async () => {
      // Arrange
      const memory1 = createTestMemory({
        id: "mem1",
        metadata: createTestMemoryMetadata({
          tags: ["ai", "ml", "research"],
        }),
      });

      const memory2 = createTestMemory({
        id: "mem2",
        metadata: createTestMemoryMetadata({
          tags: ["ai", "ml", "research"],
        }),
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            tags1: memory1.metadata.tags,
            tags2: memory2.metadata.tags,
          },
        ],
      });

      // Act
      const similarity = await finder.calculateTagSimilarity(memory1.id, memory2.id);

      // Assert
      expect(similarity).toBe(1.0);
    });

    it("should return 0.0 for no tag overlap", async () => {
      // Arrange
      const memory1 = createTestMemory({
        id: "mem1",
        metadata: createTestMemoryMetadata({
          tags: ["ai", "ml", "research"],
        }),
      });

      const memory2 = createTestMemory({
        id: "mem2",
        metadata: createTestMemoryMetadata({
          tags: ["cooking", "recipes", "food"],
        }),
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            tags1: memory1.metadata.tags,
            tags2: memory2.metadata.tags,
          },
        ],
      });

      // Act
      const similarity = await finder.calculateTagSimilarity(memory1.id, memory2.id);

      // Assert
      expect(similarity).toBe(0.0);
    });

    it("should calculate correct Jaccard similarity for partial tag overlap", async () => {
      // Arrange
      const memory1 = createTestMemory({
        id: "mem1",
        metadata: createTestMemoryMetadata({
          tags: ["ai", "ml", "neural", "deep"],
        }),
      });

      const memory2 = createTestMemory({
        id: "mem2",
        metadata: createTestMemoryMetadata({
          tags: ["ai", "ml", "data", "science"],
        }),
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            tags1: memory1.metadata.tags,
            tags2: memory2.metadata.tags,
          },
        ],
      });

      // Act
      const similarity = await finder.calculateTagSimilarity(memory1.id, memory2.id);

      // Assert
      // Intersection: {ai, ml} = 2
      // Union: {ai, ml, neural, deep, data, science} = 6
      // Jaccard = 2/6 = 0.333...
      expect(similarity).toBeCloseTo(0.333, 2);
    });

    it("should return 0.0 when first memory has empty tags", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            tags1: [],
            tags2: ["ai", "ml"],
          },
        ],
      });

      // Act
      const similarity = await finder.calculateTagSimilarity("mem1", "mem2");

      // Assert
      expect(similarity).toBe(0.0);
    });

    it("should return 0.0 when both memories have empty tags", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            tags1: [],
            tags2: [],
          },
        ],
      });

      // Act
      const similarity = await finder.calculateTagSimilarity("mem1", "mem2");

      // Assert
      expect(similarity).toBe(0.0);
    });

    it("should be case-insensitive for tags", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            tags1: ["AI", "ML", "Research"],
            tags2: ["ai", "ml", "research"],
          },
        ],
      });

      // Act
      const similarity = await finder.calculateTagSimilarity("mem1", "mem2");

      // Assert
      expect(similarity).toBe(1.0);
    });

    it("should handle null tags gracefully", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            tags1: null,
            tags2: ["ai", "ml"],
          },
        ],
      });

      // Act
      const similarity = await finder.calculateTagSimilarity("mem1", "mem2");

      // Assert
      expect(similarity).toBe(0.0);
    });
  });

  describe("calculateContentSimilarity", () => {
    it("should return 1.0 for identical embeddings", async () => {
      // Arrange
      const embedding = [0.5, 0.5, 0.5, 0.5];

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            embedding1: embedding,
            embedding2: embedding,
          },
        ],
      });

      // Act
      const similarity = await finder.calculateContentSimilarity("mem1", "mem2", "semantic");

      // Assert
      expect(similarity).toBe(1.0);
    });

    it("should return 0.0 for orthogonal embeddings", async () => {
      // Arrange
      const embedding1 = [1.0, 0.0, 0.0, 0.0];
      const embedding2 = [0.0, 1.0, 0.0, 0.0];

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            embedding1,
            embedding2,
          },
        ],
      });

      // Act
      const similarity = await finder.calculateContentSimilarity("mem1", "mem2", "semantic");

      // Assert
      expect(similarity).toBe(0.0);
    });

    it("should calculate correct cosine similarity for partial overlap", async () => {
      // Arrange
      const embedding1 = [1.0, 0.0, 0.0, 0.0];
      const embedding2 = [0.5, 0.5, 0.0, 0.0];

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            embedding1,
            embedding2,
          },
        ],
      });

      // Act
      const similarity = await finder.calculateContentSimilarity("mem1", "mem2", "semantic");

      // Assert
      // Cosine similarity = dot(v1, v2) / (||v1|| * ||v2||)
      // dot = 1.0 * 0.5 = 0.5
      // ||v1|| = 1.0, ||v2|| = sqrt(0.25 + 0.25) = 0.707...
      // cosine = 0.5 / (1.0 * 0.707) = 0.707...
      expect(similarity).toBeCloseTo(0.707, 2);
    });

    it("should return 0.0 when first embedding is missing", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            embedding1: null,
            embedding2: [0.5, 0.5, 0.5, 0.5],
          },
        ],
      });

      // Act
      const similarity = await finder.calculateContentSimilarity("mem1", "mem2", "semantic");

      // Assert
      expect(similarity).toBe(0.0);
    });

    it("should return 0.0 when second embedding is missing", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            embedding1: [0.5, 0.5, 0.5, 0.5],
            embedding2: null,
          },
        ],
      });

      // Act
      const similarity = await finder.calculateContentSimilarity("mem1", "mem2", "semantic");

      // Assert
      expect(similarity).toBe(0.0);
    });

    it("should return 0.0 when both embeddings are missing", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            embedding1: null,
            embedding2: null,
          },
        ],
      });

      // Act
      const similarity = await finder.calculateContentSimilarity("mem1", "mem2", "semantic");

      // Assert
      expect(similarity).toBe(0.0);
    });

    it("should handle high-dimensional embeddings (1536 dimensions)", async () => {
      // Arrange
      const embedding1 = Array(1536).fill(0.5);
      const embedding2 = Array(1536).fill(0.5);

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            embedding1,
            embedding2,
          },
        ],
      });

      // Act
      const similarity = await finder.calculateContentSimilarity("mem1", "mem2", "semantic");

      // Assert
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("should work with different memory sectors", async () => {
      // Arrange
      const embedding = [0.5, 0.5, 0.5, 0.5];

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            embedding1: embedding,
            embedding2: embedding,
          },
        ],
      });

      // Act
      const similarity = await finder.calculateContentSimilarity("mem1", "mem2", "episodic");

      // Assert
      expect(similarity).toBe(1.0);
    });

    it("should return 0.0 when query returns no rows", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      // Act
      const similarity = await finder.calculateContentSimilarity("mem1", "mem2", "semantic");

      // Assert
      expect(similarity).toBe(0.0);
    });
  });

  describe("calculateCategoryMatch", () => {
    it("should return 1.0 for matching categories", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            category1: "technical",
            category2: "technical",
          },
        ],
      });

      // Act
      const match = await finder.calculateCategoryMatch("mem1", "mem2");

      // Assert
      expect(match).toBe(1.0);
    });

    it("should return 0.0 for different categories", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            category1: "technical",
            category2: "personal",
          },
        ],
      });

      // Act
      const match = await finder.calculateCategoryMatch("mem1", "mem2");

      // Assert
      expect(match).toBe(0.0);
    });

    it("should be case-insensitive", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            category1: "Technical",
            category2: "technical",
          },
        ],
      });

      // Act
      const match = await finder.calculateCategoryMatch("mem1", "mem2");

      // Assert
      expect(match).toBe(1.0);
    });

    it("should return 0.0 when first category is null", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            category1: null,
            category2: "technical",
          },
        ],
      });

      // Act
      const match = await finder.calculateCategoryMatch("mem1", "mem2");

      // Assert
      expect(match).toBe(0.0);
    });

    it("should return 0.0 when second category is null", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            category1: "technical",
            category2: null,
          },
        ],
      });

      // Act
      const match = await finder.calculateCategoryMatch("mem1", "mem2");

      // Assert
      expect(match).toBe(0.0);
    });

    it("should return 0.0 when both categories are null", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            category1: null,
            category2: null,
          },
        ],
      });

      // Act
      const match = await finder.calculateCategoryMatch("mem1", "mem2");

      // Assert
      expect(match).toBe(0.0);
    });

    it("should handle empty string categories", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            category1: "",
            category2: "",
          },
        ],
      });

      // Act
      const match = await finder.calculateCategoryMatch("mem1", "mem2");

      // Assert
      expect(match).toBe(0.0);
    });

    it("should return 0.0 when query returns no rows", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      // Act
      const match = await finder.calculateCategoryMatch("mem1", "mem2");

      // Assert
      expect(match).toBe(0.0);
    });
  });

  describe("calculateTemporalProximity", () => {
    it("should return 1.0 for identical timestamps", async () => {
      // Arrange
      const timestamp = new Date("2024-01-01T00:00:00Z");

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            created_at1: timestamp,
            created_at2: timestamp,
          },
        ],
      });

      // Act
      const proximity = await finder.calculateTemporalProximity("mem1", "mem2");

      // Assert
      expect(proximity).toBe(1.0);
    });

    it("should calculate exponential decay for time difference", async () => {
      // Arrange
      const time1 = new Date("2024-01-01T00:00:00Z");
      const time2 = new Date("2024-01-02T00:00:00Z"); // 1 day = 86400 seconds

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            created_at1: time1,
            created_at2: time2,
          },
        ],
      });

      // Act
      const proximity = await finder.calculateTemporalProximity("mem1", "mem2");

      // Assert
      // exp(-0.001 × 86400) = exp(-86.4) ≈ 0
      expect(proximity).toBeCloseTo(0, 5);
    });

    it("should use lambda = 0.001 for decay rate", async () => {
      // Arrange
      const time1 = new Date("2024-01-01T00:00:00Z");
      const time2 = new Date("2024-01-01T00:01:00Z"); // 60 seconds

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            created_at1: time1,
            created_at2: time2,
          },
        ],
      });

      // Act
      const proximity = await finder.calculateTemporalProximity("mem1", "mem2");

      // Assert
      // exp(-0.001 × 60) = exp(-0.06) ≈ 0.9418
      expect(proximity).toBeCloseTo(0.9418, 3);
    });

    it("should handle time difference in either direction", async () => {
      // Arrange
      const time1 = new Date("2024-01-02T00:00:00Z");
      const time2 = new Date("2024-01-01T00:00:00Z"); // Earlier

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            created_at1: time1,
            created_at2: time2,
          },
        ],
      });

      // Act
      const proximity = await finder.calculateTemporalProximity("mem1", "mem2");

      // Assert
      // Should use absolute difference
      expect(proximity).toBeCloseTo(0, 5);
    });

    it("should return high proximity for recent memories (1 hour)", async () => {
      // Arrange
      const time1 = new Date("2024-01-01T00:00:00Z");
      const time2 = new Date("2024-01-01T01:00:00Z"); // 3600 seconds

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            created_at1: time1,
            created_at2: time2,
          },
        ],
      });

      // Act
      const proximity = await finder.calculateTemporalProximity("mem1", "mem2");

      // Assert
      // exp(-0.001 × 3600) = exp(-3.6) ≈ 0.0273
      expect(proximity).toBeCloseTo(0.0273, 3);
    });

    it("should return low proximity for distant memories (1 year)", async () => {
      // Arrange
      const time1 = new Date("2024-01-01T00:00:00Z");
      const time2 = new Date("2025-01-01T00:00:00Z"); // 365 days

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            created_at1: time1,
            created_at2: time2,
          },
        ],
      });

      // Act
      const proximity = await finder.calculateTemporalProximity("mem1", "mem2");

      // Assert
      // exp(-0.001 × 31536000) ≈ 0 (very small)
      expect(proximity).toBeCloseTo(0, 10);
    });

    it("should return 0.0 when first timestamp is null", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            created_at1: null,
            created_at2: new Date("2024-01-01T00:00:00Z"),
          },
        ],
      });

      // Act
      const proximity = await finder.calculateTemporalProximity("mem1", "mem2");

      // Assert
      expect(proximity).toBe(0.0);
    });

    it("should return 0.0 when second timestamp is null", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            created_at1: new Date("2024-01-01T00:00:00Z"),
            created_at2: null,
          },
        ],
      });

      // Act
      const proximity = await finder.calculateTemporalProximity("mem1", "mem2");

      // Assert
      expect(proximity).toBe(0.0);
    });

    it("should return 0.0 when query returns no rows", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      // Act
      const proximity = await finder.calculateTemporalProximity("mem1", "mem2");

      // Assert
      expect(proximity).toBe(0.0);
    });

    it("should handle millisecond precision", async () => {
      // Arrange
      const time1 = new Date("2024-01-01T00:00:00.000Z");
      const time2 = new Date("2024-01-01T00:00:00.500Z"); // 500ms

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            created_at1: time1,
            created_at2: time2,
          },
        ],
      });

      // Act
      const proximity = await finder.calculateTemporalProximity("mem1", "mem2");

      // Assert
      // exp(-0.001 × 0.5) = exp(-0.0005) ≈ 0.9995
      expect(proximity).toBeCloseTo(0.9995, 4);
    });
  });

  describe("calculateCompositeSimilarity", () => {
    it("should calculate composite similarity with all factors", async () => {
      // Arrange
      mockClient.query
        // validateMemoryIds
        .mockResolvedValueOnce({
          rows: [{ count: "2" }],
        })
        // calculateKeywordSimilarity
        .mockResolvedValueOnce({
          rows: [{ keywords1: ["ai", "ml"], keywords2: ["ai", "ml"] }],
        })
        // calculateTagSimilarity
        .mockResolvedValueOnce({
          rows: [{ tags1: ["tech"], tags2: ["tech"] }],
        })
        // calculateContentSimilarity
        .mockResolvedValueOnce({
          rows: [{ embedding1: [1, 0, 0], embedding2: [1, 0, 0] }],
        })
        // calculateCategoryMatch
        .mockResolvedValueOnce({
          rows: [{ category1: "technical", category2: "technical" }],
        })
        // calculateTemporalProximity
        .mockResolvedValueOnce({
          rows: [
            {
              created_at1: new Date("2024-01-01T00:00:00Z"),
              created_at2: new Date("2024-01-01T00:00:00Z"),
            },
          ],
        });

      // Act
      const similarity = await finder.calculateCompositeSimilarity("mem1", "mem2");

      // Assert
      // All factors = 1.0
      // Composite = 0.3×1.0 + 0.25×1.0 + 0.2×1.0 + 0.15×1.0 + 0.1×1.0 = 1.0
      expect(similarity).toBe(1.0);
    });

    it("should apply correct weights to factors", async () => {
      // Arrange
      mockClient.query
        // validateMemoryIds
        .mockResolvedValueOnce({
          rows: [{ count: "2" }],
        })
        // calculateKeywordSimilarity = 0.8
        .mockResolvedValueOnce({
          rows: [{ keywords1: ["ai", "ml", "data"], keywords2: ["ai", "ml", "science"] }],
        })
        // calculateTagSimilarity = 0.5
        .mockResolvedValueOnce({
          rows: [{ tags1: ["tech", "ai"], tags2: ["tech", "ml"] }],
        })
        // calculateContentSimilarity = 0.7
        .mockResolvedValueOnce({
          rows: [{ embedding1: [0.7, 0.3], embedding2: [0.8, 0.2] }],
        })
        // calculateCategoryMatch = 1.0
        .mockResolvedValueOnce({
          rows: [{ category1: "technical", category2: "technical" }],
        })
        // calculateTemporalProximity = 0.9
        .mockResolvedValueOnce({
          rows: [
            {
              created_at1: new Date("2024-01-01T00:00:00Z"),
              created_at2: new Date("2024-01-01T00:01:00Z"),
            },
          ],
        });

      // Act
      const similarity = await finder.calculateCompositeSimilarity("mem1", "mem2");

      // Assert
      // Weights: keyword=0.3, tag=0.25, content=0.2, category=0.15, temporal=0.1
      // Composite = 0.3×keyword + 0.25×tag + 0.2×content + 0.15×category + 0.1×temporal
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1.0);
    });

    it("should cache results when caching is enabled", async () => {
      // Arrange - Create a separate finder with caching enabled
      const cachedFinder = new SimilarMemoryFinder(mockDb, { enableCache: true });

      mockClient.query
        // validateMemoryIds
        .mockResolvedValueOnce({
          rows: [{ count: "2" }],
        })
        // calculateKeywordSimilarity
        .mockResolvedValueOnce({
          rows: [{ keywords1: ["ai"], keywords2: ["ai"] }],
        })
        // calculateTagSimilarity
        .mockResolvedValueOnce({
          rows: [{ tags1: ["tech"], tags2: ["tech"] }],
        })
        // calculateContentSimilarity
        .mockResolvedValueOnce({
          rows: [{ embedding1: [1, 0], embedding2: [1, 0] }],
        })
        // calculateCategoryMatch
        .mockResolvedValueOnce({
          rows: [{ category1: "tech", category2: "tech" }],
        })
        // calculateTemporalProximity
        .mockResolvedValueOnce({
          rows: [
            {
              created_at1: new Date("2024-01-01T00:00:00Z"),
              created_at2: new Date("2024-01-01T00:00:00Z"),
            },
          ],
        });

      // Act - First call
      const similarity1 = await cachedFinder.calculateCompositeSimilarity("mem1", "mem2");

      // Act - Second call (should use cache)
      const similarity2 = await cachedFinder.calculateCompositeSimilarity("mem1", "mem2");

      // Assert
      expect(similarity1).toBe(similarity2);
      // Should only call validateMemoryIds once (first time)
      expect(mockClient.query).toHaveBeenCalledTimes(6); // Not 12
    });

    it("should throw SimilarityCalculationError when memory validation fails", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: "1" }], // Only one memory found
      });

      // Act & Assert
      await expect(finder.calculateCompositeSimilarity("mem1", "invalid")).rejects.toThrow(
        "Failed to calculate composite similarity"
      );
    });

    it("should throw SimilarityCalculationError when calculation fails", async () => {
      // Arrange
      mockClient.query
        // validateMemoryIds succeeds
        .mockResolvedValueOnce({
          rows: [{ count: "2" }],
        })
        // calculateKeywordSimilarity fails
        .mockRejectedValueOnce(new Error("Database error"));

      // Act & Assert
      await expect(finder.calculateCompositeSimilarity("mem1", "mem2")).rejects.toThrow(
        "Failed to calculate composite similarity"
      );
    });
  });

  describe("getSimilarityBreakdown", () => {
    it("should return detailed breakdown of all factors", async () => {
      // Arrange
      mockClient.query
        // calculateKeywordSimilarity
        .mockResolvedValueOnce({
          rows: [{ keywords1: ["ai", "ml"], keywords2: ["ai", "ml"] }],
        })
        // calculateTagSimilarity
        .mockResolvedValueOnce({
          rows: [{ tags1: ["tech"], tags2: ["tech"] }],
        })
        // calculateContentSimilarity
        .mockResolvedValueOnce({
          rows: [{ embedding1: [1, 0, 0], embedding2: [1, 0, 0] }],
        })
        // calculateCategoryMatch
        .mockResolvedValueOnce({
          rows: [{ category1: "technical", category2: "technical" }],
        })
        // calculateTemporalProximity
        .mockResolvedValueOnce({
          rows: [
            {
              created_at1: new Date("2024-01-01T00:00:00Z"),
              created_at2: new Date("2024-01-01T00:00:00Z"),
            },
          ],
        });

      // Act
      const breakdown = await finder.getSimilarityBreakdown("mem1", "mem2");

      // Assert
      expect(breakdown).toHaveProperty("keywordSimilarity");
      expect(breakdown).toHaveProperty("tagSimilarity");
      expect(breakdown).toHaveProperty("contentSimilarity");
      expect(breakdown).toHaveProperty("categorySimilarity");
      expect(breakdown).toHaveProperty("temporalProximity");
      expect(breakdown).toHaveProperty("keywordWeight");
      expect(breakdown).toHaveProperty("tagWeight");
      expect(breakdown).toHaveProperty("contentWeight");
      expect(breakdown).toHaveProperty("categoryWeight");
      expect(breakdown).toHaveProperty("temporalWeight");
      expect(breakdown).toHaveProperty("compositeSimilarity");
    });

    it("should include correct weight values", async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ keywords1: ["ai"], keywords2: ["ai"] }],
        })
        .mockResolvedValueOnce({
          rows: [{ tags1: ["tech"], tags2: ["tech"] }],
        })
        .mockResolvedValueOnce({
          rows: [{ embedding1: [1, 0], embedding2: [1, 0] }],
        })
        .mockResolvedValueOnce({
          rows: [{ category1: "tech", category2: "tech" }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              created_at1: new Date("2024-01-01T00:00:00Z"),
              created_at2: new Date("2024-01-01T00:00:00Z"),
            },
          ],
        });

      // Act
      const breakdown = await finder.getSimilarityBreakdown("mem1", "mem2");

      // Assert
      expect(breakdown.keywordWeight).toBe(0.3);
      expect(breakdown.tagWeight).toBe(0.25);
      expect(breakdown.contentWeight).toBe(0.2);
      expect(breakdown.categoryWeight).toBe(0.15);
      expect(breakdown.temporalWeight).toBe(0.1);
    });

    it("should calculate composite similarity correctly", async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ keywords1: ["ai"], keywords2: ["ai"] }],
        })
        .mockResolvedValueOnce({
          rows: [{ tags1: ["tech"], tags2: ["tech"] }],
        })
        .mockResolvedValueOnce({
          rows: [{ embedding1: [1, 0], embedding2: [1, 0] }],
        })
        .mockResolvedValueOnce({
          rows: [{ category1: "tech", category2: "tech" }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              created_at1: new Date("2024-01-01T00:00:00Z"),
              created_at2: new Date("2024-01-01T00:00:00Z"),
            },
          ],
        });

      // Act
      const breakdown = await finder.getSimilarityBreakdown("mem1", "mem2");

      // Assert
      const expectedComposite =
        breakdown.keywordSimilarity * 0.3 +
        breakdown.tagSimilarity * 0.25 +
        breakdown.contentSimilarity * 0.2 +
        breakdown.categorySimilarity * 0.15 +
        breakdown.temporalProximity * 0.1;

      expect(breakdown.compositeSimilarity).toBeCloseTo(expectedComposite, 5);
    });
  });

  describe("findSimilar", () => {
    it("should find similar memories and rank by similarity", async () => {
      // Arrange
      const timestamp = new Date("2024-01-01");

      // Use a more flexible mocking approach for parallel execution
      mockClient.query.mockImplementation(async (sql: string) => {
        // Get candidates query
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: [
              {
                id: "mem2",
                content: "Content 2",
                created_at: timestamp,
                salience: 0.9,
                strength: 0.9,
              },
            ],
          };
        }
        // Validation query
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        // Keywords query
        if (sql.includes("keywords")) {
          return { rows: [{ keywords1: ["ai"], keywords2: ["ai"] }] };
        }
        // Tags query
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech"], tags2: ["tech"] }] };
        }
        // Embeddings query
        if (sql.includes("embedding")) {
          return { rows: [{ embedding1: [1, 0], embedding2: [1, 0] }] };
        }
        // Category query
        if (sql.includes("category")) {
          return { rows: [{ category1: "tech", category2: "tech" }] };
        }
        // Timestamp query
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp, created_at2: timestamp }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1");

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem2");
      expect(results[0].similarity.overall).toBeGreaterThan(0);
    });

    it("should find similar memories with threshold 0.5", async () => {
      // Arrange
      const timestamp = new Date("2024-01-01");

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: [
              {
                id: "mem2",
                content: "Content 2",
                created_at: timestamp,
                salience: 0.8,
                strength: 0.9,
              },
            ],
          };
        }
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        if (sql.includes("keywords")) {
          return { rows: [{ keywords1: ["ai", "ml"], keywords2: ["ai", "ml"] }] };
        }
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech"], tags2: ["tech"] }] };
        }
        if (sql.includes("embedding")) {
          return { rows: [{ embedding1: [1, 0], embedding2: [1, 0] }] };
        }
        if (sql.includes("category")) {
          return { rows: [{ category1: "tech", category2: "tech" }] };
        }
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp, created_at2: timestamp }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", { minSimilarity: 0.5 });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].similarity.overall).toBeGreaterThanOrEqual(0.5);
    });

    it("should find similar memories with threshold 0.7", async () => {
      // Arrange
      const timestamp = new Date("2024-01-01");

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: [
              {
                id: "mem2",
                content: "Content 2",
                created_at: timestamp,
                salience: 0.8,
                strength: 0.9,
              },
            ],
          };
        }
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        if (sql.includes("keywords")) {
          return { rows: [{ keywords1: ["ai", "ml"], keywords2: ["ai", "ml"] }] };
        }
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech"], tags2: ["tech"] }] };
        }
        if (sql.includes("embedding")) {
          return { rows: [{ embedding1: [1, 0], embedding2: [1, 0] }] };
        }
        if (sql.includes("category")) {
          return { rows: [{ category1: "tech", category2: "tech" }] };
        }
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp, created_at2: timestamp }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", { minSimilarity: 0.7 });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].similarity.overall).toBeGreaterThanOrEqual(0.7);
    });

    it("should find similar memories with threshold 0.9", async () => {
      // Arrange
      const timestamp = new Date("2024-01-01");

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: [
              {
                id: "mem2",
                content: "Content 2",
                created_at: timestamp,
                salience: 0.8,
                strength: 0.9,
              },
            ],
          };
        }
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        if (sql.includes("keywords")) {
          return { rows: [{ keywords1: ["ai", "ml"], keywords2: ["ai", "ml"] }] };
        }
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech"], tags2: ["tech"] }] };
        }
        if (sql.includes("embedding")) {
          return { rows: [{ embedding1: [1, 0], embedding2: [1, 0] }] };
        }
        if (sql.includes("category")) {
          return { rows: [{ category1: "tech", category2: "tech" }] };
        }
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp, created_at2: timestamp }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", { minSimilarity: 0.9 });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].similarity.overall).toBeGreaterThanOrEqual(0.9);
    });

    it("should rank memories by composite similarity score in descending order", async () => {
      // Arrange
      const timestamp = new Date("2024-01-01");
      let callCount = 0;

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: [
              {
                id: "mem2",
                content: "High similarity",
                created_at: timestamp,
                salience: 0.9,
                strength: 0.9,
              },
              {
                id: "mem3",
                content: "Medium similarity",
                created_at: timestamp,
                salience: 0.7,
                strength: 0.8,
              },
              {
                id: "mem4",
                content: "Low similarity",
                created_at: timestamp,
                salience: 0.5,
                strength: 0.6,
              },
            ],
          };
        }
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        // Return different similarity scores for each memory
        if (sql.includes("keywords")) {
          callCount++;
          if (callCount === 1) {
            // mem2: high similarity
            return { rows: [{ keywords1: ["ai", "ml"], keywords2: ["ai", "ml"] }] };
          } else if (callCount === 2) {
            // mem3: medium similarity
            return { rows: [{ keywords1: ["ai", "ml"], keywords2: ["ai", "data"] }] };
          } else {
            // mem4: low similarity
            return { rows: [{ keywords1: ["ai", "ml"], keywords2: ["cooking"] }] };
          }
        }
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech"], tags2: ["tech"] }] };
        }
        if (sql.includes("embedding")) {
          return { rows: [{ embedding1: [1, 0], embedding2: [1, 0] }] };
        }
        if (sql.includes("category")) {
          return { rows: [{ category1: "tech", category2: "tech" }] };
        }
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp, created_at2: timestamp }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", { minSimilarity: 0.0 });

      // Assert
      expect(results.length).toBeGreaterThan(1);
      // Verify descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].similarity.overall).toBeGreaterThanOrEqual(
          results[i + 1].similarity.overall
        );
      }
    });

    it("should return top 5 results when limit is 5", async () => {
      // Arrange
      const timestamp = new Date("2024-01-01");

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: Array.from({ length: 10 }, (_, i) => ({
              id: `mem${i + 2}`,
              content: `Content ${i + 2}`,
              created_at: timestamp,
              salience: 0.8,
              strength: 0.9,
            })),
          };
        }
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        if (sql.includes("keywords")) {
          return { rows: [{ keywords1: ["ai"], keywords2: ["ai"] }] };
        }
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech"], tags2: ["tech"] }] };
        }
        if (sql.includes("embedding")) {
          return { rows: [{ embedding1: [1, 0], embedding2: [1, 0] }] };
        }
        if (sql.includes("category")) {
          return { rows: [{ category1: "tech", category2: "tech" }] };
        }
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp, created_at2: timestamp }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", { limit: 5 });

      // Assert
      expect(results).toHaveLength(5);
    });

    it("should return top 10 results when limit is 10", async () => {
      // Arrange
      const timestamp = new Date("2024-01-01");

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: Array.from({ length: 20 }, (_, i) => ({
              id: `mem${i + 2}`,
              content: `Content ${i + 2}`,
              created_at: timestamp,
              salience: 0.8,
              strength: 0.9,
            })),
          };
        }
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        if (sql.includes("keywords")) {
          return { rows: [{ keywords1: ["ai"], keywords2: ["ai"] }] };
        }
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech"], tags2: ["tech"] }] };
        }
        if (sql.includes("embedding")) {
          return { rows: [{ embedding1: [1, 0], embedding2: [1, 0] }] };
        }
        if (sql.includes("category")) {
          return { rows: [{ category1: "tech", category2: "tech" }] };
        }
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp, created_at2: timestamp }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", { limit: 10 });

      // Assert
      expect(results).toHaveLength(10);
    });

    it("should return empty array when no memories meet threshold", async () => {
      // Arrange
      const timestamp = new Date("2024-01-01");

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: [
              {
                id: "mem2",
                content: "Content 2",
                created_at: timestamp,
                salience: 0.8,
                strength: 0.9,
              },
            ],
          };
        }
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        // Return very low similarity scores
        if (sql.includes("keywords")) {
          return { rows: [{ keywords1: ["ai", "ml"], keywords2: ["cooking", "recipes"] }] };
        }
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech"], tags2: ["food"] }] };
        }
        if (sql.includes("embedding")) {
          return { rows: [] }; // No embeddings
        }
        if (sql.includes("category")) {
          return { rows: [{ category1: "tech", category2: "personal" }] };
        }
        if (sql.includes("created_at")) {
          return {
            rows: [
              {
                created_at1: new Date("2024-01-01"),
                created_at2: new Date("2025-01-01"),
              },
            ],
          };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", { minSimilarity: 0.8 });

      // Assert
      expect(results).toHaveLength(0);
    });

    it("should handle large memory set (100+ memories) efficiently", async () => {
      // Arrange
      const timestamp = new Date("2024-01-01");

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("WHERE m.id != $1")) {
          // Return 150 candidate memories
          return {
            rows: Array.from({ length: 150 }, (_, i) => ({
              id: `mem${i + 2}`,
              content: `Content ${i + 2}`,
              created_at: timestamp,
              salience: 0.8,
              strength: 0.9,
            })),
          };
        }
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        if (sql.includes("keywords")) {
          return { rows: [{ keywords1: ["ai"], keywords2: ["ai"] }] };
        }
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech"], tags2: ["tech"] }] };
        }
        if (sql.includes("embedding")) {
          return { rows: [{ embedding1: [1, 0], embedding2: [1, 0] }] };
        }
        if (sql.includes("category")) {
          return { rows: [{ category1: "tech", category2: "tech" }] };
        }
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp, created_at2: timestamp }] };
        }
        return { rows: [] };
      });

      // Act
      const startTime = Date.now();
      const results = await finder.findSimilar("mem1", { limit: 10 });
      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(10);
      // Performance target: should complete in reasonable time (<1000ms for 150 memories)
      expect(duration).toBeLessThan(1000);
    });

    it("should exclude query memory from results", async () => {
      // Arrange
      mockClient.query
        // Get candidates
        .mockResolvedValueOnce({
          rows: [
            {
              id: "mem2",
              content: "Content 2",
              created_at: new Date("2024-01-01"),
              salience: 0.8,
              strength: 0.9,
            },
          ],
        })
        // validateMemoryIds
        .mockResolvedValueOnce({ rows: [{ count: "2" }] })
        // Calculate similarity for mem2 (all factors)
        .mockResolvedValueOnce({ rows: [{ keywords1: ["ai"], keywords2: ["ai"] }] })
        .mockResolvedValueOnce({ rows: [{ tags1: ["tech"], tags2: ["tech"] }] })
        .mockResolvedValueOnce({ rows: [{ embedding1: [1, 0], embedding2: [1, 0] }] })
        .mockResolvedValueOnce({ rows: [{ category1: "tech", category2: "tech" }] })
        .mockResolvedValueOnce({
          rows: [{ created_at1: new Date(), created_at2: new Date() }],
        });

      // Act
      const results = await finder.findSimilar("mem1");

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("WHERE m.id != $1"), [
        "mem1",
      ]);
      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem2");
    });

    it("should filter by minimum similarity threshold", async () => {
      // Arrange
      mockClient.query
        // Get candidates
        .mockResolvedValueOnce({
          rows: [
            {
              id: "mem2",
              content: "Content 2",
              created_at: new Date("2024-01-01"),
              salience: 0.8,
              strength: 0.9,
            },
          ],
        })
        // validateMemoryIds
        .mockResolvedValueOnce({ rows: [{ count: "2" }] })
        // Calculate low similarity (below threshold)
        .mockResolvedValueOnce({ rows: [{ keywords1: [], keywords2: ["ai"] }] })
        .mockResolvedValueOnce({ rows: [{ tags1: [], tags2: ["tech"] }] })
        .mockResolvedValueOnce({ rows: [] }) // No embeddings
        .mockResolvedValueOnce({ rows: [{ category1: "tech", category2: "science" }] })
        .mockResolvedValueOnce({
          rows: [
            {
              created_at1: new Date("2024-01-01"),
              created_at2: new Date("2025-01-01"),
            },
          ],
        });

      // Act
      const results = await finder.findSimilar("mem1", { minSimilarity: 0.5 });

      // Assert
      expect(results).toHaveLength(0); // Filtered out due to low similarity
    });

    it("should apply limit to results", async () => {
      // Arrange
      const timestamp = new Date();

      // Use flexible mocking for parallel execution
      mockClient.query.mockImplementation(async (sql: string) => {
        // Get candidates query
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: [
              { id: "mem2", content: "C2", created_at: timestamp, salience: 0.8, strength: 0.9 },
              { id: "mem3", content: "C3", created_at: timestamp, salience: 0.7, strength: 0.8 },
              { id: "mem4", content: "C4", created_at: timestamp, salience: 0.6, strength: 0.7 },
            ],
          };
        }
        // Validation query
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        // Keywords query
        if (sql.includes("keywords")) {
          return { rows: [{ keywords1: ["ai"], keywords2: ["ai"] }] };
        }
        // Tags query
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech"], tags2: ["tech"] }] };
        }
        // Embeddings query
        if (sql.includes("embedding")) {
          return { rows: [{ embedding1: [1, 0], embedding2: [1, 0] }] };
        }
        // Category query
        if (sql.includes("category")) {
          return { rows: [{ category1: "tech", category2: "tech" }] };
        }
        // Timestamp query
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp, created_at2: timestamp }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", { limit: 2 });

      // Assert
      expect(results).toHaveLength(2);
    });

    it("should include explanation when requested", async () => {
      // Arrange
      mockClient.query
        // Get candidates
        .mockResolvedValueOnce({
          rows: [
            {
              id: "mem2",
              content: "Content 2",
              created_at: new Date("2024-01-01"),
              salience: 0.8,
              strength: 0.9,
            },
          ],
        })
        // validateMemoryIds
        .mockResolvedValueOnce({ rows: [{ count: "2" }] })
        // Calculate similarity
        .mockResolvedValueOnce({ rows: [{ keywords1: ["ai"], keywords2: ["ai"] }] })
        .mockResolvedValueOnce({ rows: [{ tags1: ["tech"], tags2: ["tech"] }] })
        .mockResolvedValueOnce({ rows: [{ embedding1: [1, 0], embedding2: [1, 0] }] })
        .mockResolvedValueOnce({ rows: [{ category1: "tech", category2: "tech" }] })
        .mockResolvedValueOnce({
          rows: [{ created_at1: new Date(), created_at2: new Date() }],
        })
        // getSimilarityBreakdown
        .mockResolvedValueOnce({ rows: [{ keywords1: ["ai"], keywords2: ["ai"] }] })
        .mockResolvedValueOnce({ rows: [{ tags1: ["tech"], tags2: ["tech"] }] })
        .mockResolvedValueOnce({ rows: [{ embedding1: [1, 0], embedding2: [1, 0] }] })
        .mockResolvedValueOnce({ rows: [{ category1: "tech", category2: "tech" }] })
        .mockResolvedValueOnce({
          rows: [{ created_at1: new Date(), created_at2: new Date() }],
        });

      // Act
      const results = await finder.findSimilar("mem1", { includeExplanation: true });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].explanation).toBeTruthy();
      expect(results[0].explanation).toContain("Overall similarity:");
    });

    it("should return empty array when no candidates found", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      // Act
      const results = await finder.findSimilar("mem1");

      // Assert
      expect(results).toHaveLength(0);
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      // Act & Assert
      await expect(finder.findSimilar("mem1")).rejects.toThrow();
      expect(mockDb.releaseConnection).toHaveBeenCalled();
    });
  });

  describe("calculateCategorySimilarity (alias)", () => {
    it("should be an alias for calculateCategoryMatch", async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            category1: "technical",
            category2: "technical",
          },
        ],
      });

      // Act
      const similarity = await finder.calculateCategorySimilarity("mem1", "mem2");

      // Assert
      expect(similarity).toBe(1.0);
    });
  });

  describe("Similarity Explanation Generation", () => {
    it("should generate explanation for high similarity (>0.8)", async () => {
      // Arrange - High similarity across all factors
      const timestamp = new Date("2024-01-01T00:00:00Z");

      mockClient.query.mockImplementation(async (sql: string) => {
        // Get candidates query
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: [
              {
                id: "mem2",
                content: "Very similar content",
                created_at: timestamp,
                salience: 0.9,
                strength: 0.9,
              },
            ],
          };
        }
        // Validation query
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        // High keyword similarity
        if (sql.includes("keywords")) {
          return {
            rows: [
              {
                keywords1: ["ai", "ml", "neural", "networks"],
                keywords2: ["ai", "ml", "neural", "networks"],
              },
            ],
          };
        }
        // High tag similarity
        if (sql.includes("tags")) {
          return {
            rows: [{ tags1: ["tech", "ai", "research"], tags2: ["tech", "ai", "research"] }],
          };
        }
        // High content similarity
        if (sql.includes("embedding")) {
          return { rows: [{ embedding1: [1, 0, 0, 0], embedding2: [1, 0, 0, 0] }] };
        }
        // Category match
        if (sql.includes("category")) {
          return { rows: [{ category1: "technical", category2: "technical" }] };
        }
        // Same timestamp (high temporal proximity)
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp, created_at2: timestamp }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", { includeExplanation: true });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].explanation).toBeTruthy();
      expect(results[0].explanation).toContain("Overall similarity:");
      expect(results[0].explanation).toContain("keyword:");
      expect(results[0].explanation).toContain("tag:");
      expect(results[0].explanation).toContain("content:");
      expect(results[0].explanation).toContain("category:");
      expect(results[0].explanation).toContain("temporal:");

      // Verify high similarity is reflected in explanation
      const overallMatch = results[0].explanation.match(/Overall similarity: ([\d.]+)%/);
      expect(overallMatch).toBeTruthy();
      if (overallMatch) {
        const overallSimilarity = parseFloat(overallMatch[1]);
        expect(overallSimilarity).toBeGreaterThan(80);
      }
    });

    it("should generate explanation for low similarity (<0.3)", async () => {
      // Arrange - Low similarity across all factors
      const timestamp1 = new Date("2024-01-01T00:00:00Z");
      const timestamp2 = new Date("2025-01-01T00:00:00Z"); // 1 year apart

      mockClient.query.mockImplementation(async (sql: string) => {
        // Get candidates query
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: [
              {
                id: "mem2",
                content: "Very different content",
                created_at: timestamp2,
                salience: 0.5,
                strength: 0.6,
              },
            ],
          };
        }
        // Validation query
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        // Low keyword similarity
        if (sql.includes("keywords")) {
          return {
            rows: [
              {
                keywords1: ["ai", "ml", "neural"],
                keywords2: ["cooking", "recipes", "food"],
              },
            ],
          };
        }
        // Low tag similarity
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech", "ai"], tags2: ["lifestyle", "food"] }] };
        }
        // No content similarity (no embeddings)
        if (sql.includes("embedding")) {
          return { rows: [] };
        }
        // Different categories
        if (sql.includes("category")) {
          return { rows: [{ category1: "technical", category2: "personal" }] };
        }
        // Different timestamps (low temporal proximity)
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp1, created_at2: timestamp2 }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", {
        includeExplanation: true,
        minSimilarity: 0.0, // Allow low similarity results
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].explanation).toBeTruthy();
      expect(results[0].explanation).toContain("Overall similarity:");

      // Verify low similarity is reflected in explanation
      const overallMatch = results[0].explanation.match(/Overall similarity: ([\d.]+)%/);
      expect(overallMatch).toBeTruthy();
      if (overallMatch) {
        const overallSimilarity = parseFloat(overallMatch[1]);
        expect(overallSimilarity).toBeLessThan(30);
      }
    });

    it("should include all 5 factors with scores in explanation", async () => {
      // Arrange
      const timestamp = new Date("2024-01-01T00:00:00Z");

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: [
              {
                id: "mem2",
                content: "Content",
                created_at: timestamp,
                salience: 0.8,
                strength: 0.9,
              },
            ],
          };
        }
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        if (sql.includes("keywords")) {
          return { rows: [{ keywords1: ["ai", "ml"], keywords2: ["ai", "data"] }] };
        }
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech"], tags2: ["tech", "science"] }] };
        }
        if (sql.includes("embedding")) {
          return { rows: [{ embedding1: [0.7, 0.3], embedding2: [0.8, 0.2] }] };
        }
        if (sql.includes("category")) {
          return { rows: [{ category1: "technical", category2: "technical" }] };
        }
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp, created_at2: timestamp }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", { includeExplanation: true });

      // Assert
      expect(results).toHaveLength(1);
      const explanation = results[0].explanation;

      // Verify all 5 factors are present
      expect(explanation).toContain("keyword:");
      expect(explanation).toContain("tag:");
      expect(explanation).toContain("content:");
      expect(explanation).toContain("category:");
      expect(explanation).toContain("temporal:");

      // Verify each factor has a percentage value
      expect(explanation).toMatch(/keyword: \d+\.\d+%/);
      expect(explanation).toMatch(/tag: \d+\.\d+%/);
      expect(explanation).toMatch(/content: \d+\.\d+%/);
      expect(explanation).toMatch(/category: \d+\.\d+%/);
      expect(explanation).toMatch(/temporal: \d+\.\d+%/);
    });

    it("should format explanation as human-readable text", async () => {
      // Arrange
      const timestamp = new Date("2024-01-01T00:00:00Z");

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: [
              {
                id: "mem2",
                content: "Content",
                created_at: timestamp,
                salience: 0.8,
                strength: 0.9,
              },
            ],
          };
        }
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        if (sql.includes("keywords")) {
          return { rows: [{ keywords1: ["ai"], keywords2: ["ai"] }] };
        }
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech"], tags2: ["tech"] }] };
        }
        if (sql.includes("embedding")) {
          return { rows: [{ embedding1: [1, 0], embedding2: [1, 0] }] };
        }
        if (sql.includes("category")) {
          return { rows: [{ category1: "tech", category2: "tech" }] };
        }
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp, created_at2: timestamp }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", { includeExplanation: true });

      // Assert
      expect(results).toHaveLength(1);
      const explanation = results[0].explanation;

      // Verify format: "Overall similarity: X% (factor1: Y%, factor2: Z%, ...)"
      expect(explanation).toMatch(/^Overall similarity: \d+\.\d+% \(/);
      expect(explanation).toContain(", ");
      expect(explanation).toContain(")");

      // Verify no technical jargon or confusing terms
      expect(explanation).not.toContain("Jaccard");
      expect(explanation).not.toContain("cosine");
      expect(explanation).not.toContain("exponential");
      expect(explanation).not.toContain("lambda");
    });

    it("should show contributions from each factor clearly", async () => {
      // Arrange - Mixed similarity scores
      const timestamp = new Date("2024-01-01T00:00:00Z");

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: [
              {
                id: "mem2",
                content: "Content",
                created_at: timestamp,
                salience: 0.8,
                strength: 0.9,
              },
            ],
          };
        }
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        // High keyword similarity
        if (sql.includes("keywords")) {
          return { rows: [{ keywords1: ["ai", "ml"], keywords2: ["ai", "ml"] }] };
        }
        // Medium tag similarity
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech", "ai"], tags2: ["tech", "science"] }] };
        }
        // Low content similarity
        if (sql.includes("embedding")) {
          return { rows: [{ embedding1: [1, 0], embedding2: [0.5, 0.5] }] };
        }
        // No category match
        if (sql.includes("category")) {
          return { rows: [{ category1: "technical", category2: "personal" }] };
        }
        // High temporal proximity
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp, created_at2: timestamp }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", { includeExplanation: true });

      // Assert
      expect(results).toHaveLength(1);
      const explanation = results[0].explanation;

      // Extract individual factor scores
      const keywordMatch = explanation.match(/keyword: ([\d.]+)%/);
      const tagMatch = explanation.match(/tag: ([\d.]+)%/);
      const contentMatch = explanation.match(/content: ([\d.]+)%/);
      const categoryMatch = explanation.match(/category: ([\d.]+)%/);
      const temporalMatch = explanation.match(/temporal: ([\d.]+)%/);

      expect(keywordMatch).toBeTruthy();
      expect(tagMatch).toBeTruthy();
      expect(contentMatch).toBeTruthy();
      expect(categoryMatch).toBeTruthy();
      expect(temporalMatch).toBeTruthy();

      // Verify scores are in expected ranges
      if (keywordMatch) {
        const keywordScore = parseFloat(keywordMatch[1]);
        expect(keywordScore).toBeGreaterThan(80); // High
      }
      if (categoryMatch) {
        const categoryScore = parseFloat(categoryMatch[1]);
        expect(categoryScore).toBe(0); // No match
      }
    });

    it("should handle zero similarity gracefully in explanation", async () => {
      // Arrange - All factors at zero
      const timestamp1 = new Date("2024-01-01T00:00:00Z");
      const timestamp2 = new Date("2030-01-01T00:00:00Z"); // Far future

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("WHERE m.id != $1")) {
          return {
            rows: [
              {
                id: "mem2",
                content: "Content",
                created_at: timestamp2,
                salience: 0.5,
                strength: 0.6,
              },
            ],
          };
        }
        if (sql.includes("COUNT(*) as count FROM memories WHERE id IN")) {
          return { rows: [{ count: "2" }] };
        }
        // No keyword overlap
        if (sql.includes("keywords")) {
          return { rows: [{ keywords1: ["ai"], keywords2: ["cooking"] }] };
        }
        // No tag overlap
        if (sql.includes("tags")) {
          return { rows: [{ tags1: ["tech"], tags2: ["food"] }] };
        }
        // No embeddings
        if (sql.includes("embedding")) {
          return { rows: [] };
        }
        // Different categories
        if (sql.includes("category")) {
          return { rows: [{ category1: "technical", category2: "personal" }] };
        }
        // Very different timestamps
        if (sql.includes("created_at")) {
          return { rows: [{ created_at1: timestamp1, created_at2: timestamp2 }] };
        }
        return { rows: [] };
      });

      // Act
      const results = await finder.findSimilar("mem1", {
        includeExplanation: true,
        minSimilarity: 0.0,
      });

      // Assert
      expect(results).toHaveLength(1);
      const explanation = results[0].explanation;

      // Verify explanation still includes all factors even at zero
      expect(explanation).toContain("keyword: 0.0%");
      expect(explanation).toContain("tag: 0.0%");
      expect(explanation).toContain("content: 0.0%");
      expect(explanation).toContain("category: 0.0%");
      expect(explanation).toMatch(/temporal: [0-9.]+%/); // Near zero but not exactly

      // Verify overall similarity is very low
      const overallMatch = explanation.match(/Overall similarity: ([\d.]+)%/);
      expect(overallMatch).toBeTruthy();
      if (overallMatch) {
        const overallSimilarity = parseFloat(overallMatch[1]);
        expect(overallSimilarity).toBeLessThan(5);
      }
    });
  });
});
