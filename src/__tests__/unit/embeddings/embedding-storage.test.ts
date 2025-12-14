/**
 * Embedding Storage Unit Tests
 *
 * Unit tests for EmbeddingStorage class with mocked database dependencies.
 * Tests cover:
 * - Storing five-sector embeddings
 * - Retrieving embeddings
 * - Updating embeddings
 * - Deleting embeddings
 * - Vector similarity search
 * - Multi-sector search
 * - Error handling (connection failures, invalid data)
 *
 * Requirements: 2.1, 3.1
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmbeddingStorage } from "../../../embeddings/embedding-storage";
import type { MemorySector, SectorEmbeddings } from "../../../embeddings/types";

// Mock DatabaseConnectionManager
vi.mock("../../../database/connection-manager");

describe("EmbeddingStorage - Unit Tests", () => {
  let storage: EmbeddingStorage;
  let mockDbManager: {
    pool: {
      query: ReturnType<typeof vi.fn>;
    } | null;
  };

  beforeEach(() => {
    mockDbManager = {
      pool: {
        query: vi.fn(),
      },
    };
    storage = new EmbeddingStorage(mockDbManager as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("storeEmbeddings", () => {
    it("should store all five sector embeddings for a memory", async () => {
      const memoryId = "test-memory-001";
      const embeddings: SectorEmbeddings = {
        episodic: createTestEmbedding(768, 0.1),
        semantic: createTestEmbedding(768, 0.2),
        procedural: createTestEmbedding(768, 0.3),
        emotional: createTestEmbedding(768, 0.4),
        reflective: createTestEmbedding(768, 0.5),
      };

      mockDbManager.pool!.query.mockResolvedValue({ rows: [] });

      await storage.storeEmbeddings(memoryId, embeddings, "nomic-embed-text");

      // Should call query 5 times (once per sector)
      expect(mockDbManager.pool!.query).toHaveBeenCalledTimes(5);

      // Verify each sector was stored
      const calls = mockDbManager.pool!.query.mock.calls;
      const sectors = calls.map((call: unknown[]) => (call[1] as unknown[])[1]);
      expect(sectors).toContain("episodic");
      expect(sectors).toContain("semantic");
      expect(sectors).toContain("procedural");
      expect(sectors).toContain("emotional");
      expect(sectors).toContain("reflective");
    });

    it("should throw error when storing embeddings without database connection", async () => {
      const disconnectedStorage = new EmbeddingStorage({ pool: null } as any);
      const embeddings: SectorEmbeddings = {
        episodic: createTestEmbedding(768, 0.1),
        semantic: createTestEmbedding(768, 0.2),
        procedural: createTestEmbedding(768, 0.3),
        emotional: createTestEmbedding(768, 0.4),
        reflective: createTestEmbedding(768, 0.5),
      };

      await expect(
        disconnectedStorage.storeEmbeddings("test-id", embeddings, "test-model")
      ).rejects.toThrow("Database not connected");
    });

    it("should throw error when embeddings have different dimensions", async () => {
      const memoryId = "test-memory-001";
      const invalidEmbeddings: SectorEmbeddings = {
        episodic: createTestEmbedding(512, 0.1), // Different dimension
        semantic: createTestEmbedding(768, 0.2),
        procedural: createTestEmbedding(768, 0.3),
        emotional: createTestEmbedding(768, 0.4),
        reflective: createTestEmbedding(768, 0.5),
      };

      await expect(
        storage.storeEmbeddings(memoryId, invalidEmbeddings, "nomic-embed-text")
      ).rejects.toThrow("All embeddings must have the same dimension");
    });

    it("should use provided client when passed", async () => {
      const memoryId = "test-memory-001";
      const embeddings: SectorEmbeddings = {
        episodic: createTestEmbedding(768, 0.1),
        semantic: createTestEmbedding(768, 0.2),
        procedural: createTestEmbedding(768, 0.3),
        emotional: createTestEmbedding(768, 0.4),
        reflective: createTestEmbedding(768, 0.5),
      };

      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };

      await storage.storeEmbeddings(memoryId, embeddings, "nomic-embed-text", mockClient as any);

      // Should use provided client, not pool
      expect(mockClient.query).toHaveBeenCalledTimes(5);
      expect(mockDbManager.pool!.query).not.toHaveBeenCalled();
    });
  });

  describe("retrieveEmbeddings", () => {
    it("should retrieve all sector embeddings for a memory", async () => {
      const memoryId = "test-memory-001";
      mockDbManager.pool!.query.mockResolvedValue({
        rows: [
          { sector: "episodic", embedding: JSON.stringify(createTestEmbedding(768, 0.1)) },
          { sector: "semantic", embedding: JSON.stringify(createTestEmbedding(768, 0.2)) },
          { sector: "procedural", embedding: JSON.stringify(createTestEmbedding(768, 0.3)) },
          { sector: "emotional", embedding: JSON.stringify(createTestEmbedding(768, 0.4)) },
          { sector: "reflective", embedding: JSON.stringify(createTestEmbedding(768, 0.5)) },
        ],
      });

      const result = await storage.retrieveEmbeddings(memoryId);

      expect(result.episodic).toBeDefined();
      expect(result.semantic).toBeDefined();
      expect(result.procedural).toBeDefined();
      expect(result.emotional).toBeDefined();
      expect(result.reflective).toBeDefined();
      expect(result.episodic.length).toBe(768);
    });

    it("should retrieve specific sectors when requested", async () => {
      const memoryId = "test-memory-001";
      mockDbManager.pool!.query.mockResolvedValue({
        rows: [
          { sector: "semantic", embedding: JSON.stringify(createTestEmbedding(768, 0.2)) },
          { sector: "episodic", embedding: JSON.stringify(createTestEmbedding(768, 0.1)) },
        ],
      });

      const result = await storage.retrieveEmbeddings(memoryId, [
        "semantic" as MemorySector,
        "episodic" as MemorySector,
      ]);

      expect(result.semantic).toBeDefined();
      expect(result.episodic).toBeDefined();
      expect(result.semantic.length).toBe(768);
    });

    it("should return empty arrays for missing sectors", async () => {
      const memoryId = "test-memory-001";
      mockDbManager.pool!.query.mockResolvedValue({
        rows: [{ sector: "semantic", embedding: JSON.stringify(createTestEmbedding(768, 0.2)) }],
      });

      const result = await storage.retrieveEmbeddings(memoryId);

      expect(result.semantic.length).toBe(768);
      expect(result.episodic).toEqual([]);
      expect(result.procedural).toEqual([]);
      expect(result.emotional).toEqual([]);
      expect(result.reflective).toEqual([]);
    });

    it("should throw error when retrieving embeddings without database connection", async () => {
      const disconnectedStorage = new EmbeddingStorage({ pool: null } as any);

      await expect(disconnectedStorage.retrieveEmbeddings("test-id")).rejects.toThrow(
        "Database not connected"
      );
    });

    it("should parse embedding from array format", async () => {
      const memoryId = "test-memory-001";
      const embedding = createTestEmbedding(768, 0.1);
      mockDbManager.pool!.query.mockResolvedValue({
        rows: [{ sector: "semantic", embedding: embedding }], // Array format
      });

      const result = await storage.retrieveEmbeddings(memoryId, ["semantic" as MemorySector]);

      expect(result.semantic).toEqual(embedding);
    });

    it("should throw error for invalid embedding format", async () => {
      const memoryId = "test-memory-001";
      mockDbManager.pool!.query.mockResolvedValue({
        rows: [{ sector: "semantic", embedding: 12345 }], // Invalid format
      });

      await expect(storage.retrieveEmbeddings(memoryId)).rejects.toThrow(
        "Invalid embedding format"
      );
    });
  });

  describe("updateEmbeddings", () => {
    it("should update specific sector embeddings", async () => {
      const memoryId = "test-memory-001";
      const updatedEmbeddings: Partial<SectorEmbeddings> = {
        semantic: createTestEmbedding(768, 0.9),
      };

      mockDbManager.pool!.query.mockResolvedValue({ rows: [] });

      await storage.updateEmbeddings(memoryId, updatedEmbeddings, "nomic-embed-text");

      expect(mockDbManager.pool!.query).toHaveBeenCalledTimes(1);
      expect(mockDbManager.pool!.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE memory_embeddings"),
        expect.arrayContaining([memoryId, "semantic"])
      );
    });

    it("should skip empty embeddings", async () => {
      const memoryId = "test-memory-001";
      const updatedEmbeddings: Partial<SectorEmbeddings> = {
        semantic: [],
      };

      await storage.updateEmbeddings(memoryId, updatedEmbeddings, "nomic-embed-text");

      expect(mockDbManager.pool!.query).not.toHaveBeenCalled();
    });

    it("should handle empty embeddings object", async () => {
      const memoryId = "test-memory-001";

      await storage.updateEmbeddings(memoryId, {}, "nomic-embed-text");

      expect(mockDbManager.pool!.query).not.toHaveBeenCalled();
    });

    it("should throw error when updating embeddings without database connection", async () => {
      const disconnectedStorage = new EmbeddingStorage({ pool: null } as any);

      await expect(
        disconnectedStorage.updateEmbeddings("test-id", {}, "test-model")
      ).rejects.toThrow("Database not connected");
    });
  });

  describe("deleteEmbeddings", () => {
    it("should delete all embeddings for a memory", async () => {
      const memoryId = "test-memory-001";
      mockDbManager.pool!.query.mockResolvedValue({ rows: [] });

      await storage.deleteEmbeddings(memoryId);

      expect(mockDbManager.pool!.query).toHaveBeenCalledWith(
        "DELETE FROM memory_embeddings WHERE memory_id = $1",
        [memoryId]
      );
    });

    it("should throw error when deleting embeddings without database connection", async () => {
      const disconnectedStorage = new EmbeddingStorage({ pool: null } as any);

      await expect(disconnectedStorage.deleteEmbeddings("test-id")).rejects.toThrow(
        "Database not connected"
      );
    });
  });

  describe("vectorSimilaritySearch", () => {
    it("should perform vector similarity search", async () => {
      const queryEmbedding = createTestEmbedding(768, 0.1);
      mockDbManager.pool!.query.mockResolvedValue({
        rows: [
          { memory_id: "mem-1", sector: "semantic", similarity: "0.95" },
          { memory_id: "mem-2", sector: "semantic", similarity: "0.85" },
        ],
      });

      const results = await storage.vectorSimilaritySearch(
        queryEmbedding,
        "semantic" as MemorySector,
        10,
        0.5
      );

      expect(results).toHaveLength(2);
      expect(results[0].memoryId).toBe("mem-1");
      expect(results[0].similarity).toBe(0.95);
      expect(results[0].sector).toBe("semantic");
    });

    it("should throw error when searching vectors without database connection", async () => {
      const disconnectedStorage = new EmbeddingStorage({ pool: null } as any);

      await expect(
        disconnectedStorage.vectorSimilaritySearch(
          createTestEmbedding(768, 0.1),
          "semantic" as MemorySector,
          10
        )
      ).rejects.toThrow("Database not connected");
    });
  });

  describe("multiSectorSearch", () => {
    it("should perform multi-sector search with weighted scoring", async () => {
      const queryEmbeddings: Partial<SectorEmbeddings> = {
        semantic: createTestEmbedding(768, 0.2),
        episodic: createTestEmbedding(768, 0.1),
      };
      const weights = {
        semantic: 0.6,
        episodic: 0.4,
      };

      mockDbManager.pool!.query.mockResolvedValue({
        rows: [
          { memory_id: "mem-1", similarity: "0.85" },
          { memory_id: "mem-2", similarity: "0.75" },
        ],
      });

      const results = await storage.multiSectorSearch(queryEmbeddings, weights, 10);

      expect(results).toHaveLength(2);
      expect(results[0].memoryId).toBe("mem-1");
      expect(results[0].similarity).toBe(0.85);
    });

    it("should return empty array when no query embeddings provided", async () => {
      const results = await storage.multiSectorSearch({}, {}, 10);

      expect(results).toEqual([]);
      expect(mockDbManager.pool!.query).not.toHaveBeenCalled();
    });

    it("should return empty array when all weights are zero", async () => {
      const queryEmbeddings: Partial<SectorEmbeddings> = {
        semantic: createTestEmbedding(768, 0.5),
        episodic: createTestEmbedding(768, 0.3),
      };
      const weights = {
        semantic: 0,
        episodic: 0,
      };

      const results = await storage.multiSectorSearch(queryEmbeddings, weights, 10);

      expect(results).toEqual([]);
    });

    it("should throw error when multi-sector searching without database connection", async () => {
      const disconnectedStorage = new EmbeddingStorage({ pool: null } as any);

      await expect(
        disconnectedStorage.multiSectorSearch(
          { semantic: createTestEmbedding(768, 0.1) },
          { semantic: 0.5 },
          10
        )
      ).rejects.toThrow("Database not connected");
    });
  });
});

// Helper function
function createTestEmbedding(dimension: number, seed: number): number[] {
  const embedding = new Array(dimension);
  for (let i = 0; i < dimension; i++) {
    embedding[i] = seed + i * 0.001;
  }
  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}
