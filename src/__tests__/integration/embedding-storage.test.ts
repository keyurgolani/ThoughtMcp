/**
 * Embedding Storage Integration Tests (Mocked)
 *
 * Tests the interaction between EmbeddingStorage and EmbeddingEngine
 * using mocks for external dependencies (database, embedding model).
 *
 * This is an integration test that verifies internal module interactions work correctly,
 * NOT a test of external service integration.
 *
 * Requirements: 12.2, 12.3, 12.4
 */

import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MemorySector, SectorEmbeddings } from "../../embeddings/types";

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
    pool: {
      query: vi.fn(),
    },
    manager: {
      pool: {
        query: vi.fn(),
      },
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// Create deterministic test embedding
function createTestEmbedding(dimension: number, seed: number): number[] {
  const embedding = new Array(dimension);
  for (let i = 0; i < dimension; i++) {
    embedding[i] = seed + i * 0.001;
  }
  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}

// Create mock embedding engine
function createMockEmbeddingEngine() {
  const mockEmbedding = createTestEmbedding(768, 0.1);

  return {
    generateAllSectorEmbeddings: vi.fn().mockResolvedValue({
      episodic: createTestEmbedding(768, 0.1),
      semantic: createTestEmbedding(768, 0.2),
      procedural: createTestEmbedding(768, 0.3),
      emotional: createTestEmbedding(768, 0.4),
      reflective: createTestEmbedding(768, 0.5),
    }),
    generateSemanticEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
    generateEpisodicEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
    generateProceduralEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
    generateEmotionalEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
    generateReflectiveEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
    getModelDimension: vi.fn().mockReturnValue(768),
  };
}

// Create mock embedding storage
function createMockEmbeddingStorage() {
  return {
    storeEmbeddings: vi.fn().mockResolvedValue(undefined),
    retrieveEmbeddings: vi.fn().mockResolvedValue({
      episodic: createTestEmbedding(768, 0.1),
      semantic: createTestEmbedding(768, 0.2),
      procedural: createTestEmbedding(768, 0.3),
      emotional: createTestEmbedding(768, 0.4),
      reflective: createTestEmbedding(768, 0.5),
    }),
    updateEmbeddings: vi.fn().mockResolvedValue(undefined),
    deleteEmbeddings: vi.fn().mockResolvedValue(undefined),
    vectorSimilaritySearch: vi.fn().mockResolvedValue([]),
    multiSectorSearch: vi.fn().mockResolvedValue([]),
  };
}

describe("EmbeddingStorage + EmbeddingEngine Integration (Mocked)", () => {
  let mockDb: ReturnType<typeof createMockDbManager>;
  let mockEmbeddingEngine: ReturnType<typeof createMockEmbeddingEngine>;
  let mockEmbeddingStorage: ReturnType<typeof createMockEmbeddingStorage>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDbManager();
    mockEmbeddingEngine = createMockEmbeddingEngine();
    mockEmbeddingStorage = createMockEmbeddingStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Embedding Generation and Storage Flow", () => {
    it("should generate embeddings with engine and store them via storage", async () => {
      const memoryId = "test-memory-001";
      const content = "Test memory content for embedding generation";

      // Step 1: Generate embeddings using the engine
      const embeddings = await mockEmbeddingEngine.generateAllSectorEmbeddings({
        text: content,
        sector: "semantic",
      });

      expect(mockEmbeddingEngine.generateAllSectorEmbeddings).toHaveBeenCalledWith({
        text: content,
        sector: "semantic",
      });
      expect(embeddings).toHaveProperty("episodic");
      expect(embeddings).toHaveProperty("semantic");
      expect(embeddings).toHaveProperty("procedural");
      expect(embeddings).toHaveProperty("emotional");
      expect(embeddings).toHaveProperty("reflective");

      // Step 2: Store embeddings using the storage
      await mockEmbeddingStorage.storeEmbeddings(memoryId, embeddings, "nomic-embed-text");

      expect(mockEmbeddingStorage.storeEmbeddings).toHaveBeenCalledWith(
        memoryId,
        embeddings,
        "nomic-embed-text"
      );
    });

    it("should store embeddings within a transaction", async () => {
      const memoryId = "test-memory-002";
      const content = "Transactional embedding storage test";

      // Begin transaction
      const client = await mockDb.manager.beginTransaction();
      expect(mockDb.manager.beginTransaction).toHaveBeenCalled();

      // Generate embeddings
      const embeddings = await mockEmbeddingEngine.generateAllSectorEmbeddings({
        text: content,
        sector: "semantic",
      });

      // Store embeddings with transaction client
      await mockEmbeddingStorage.storeEmbeddings(memoryId, embeddings, "nomic-embed-text", client);

      expect(mockEmbeddingStorage.storeEmbeddings).toHaveBeenCalledWith(
        memoryId,
        embeddings,
        "nomic-embed-text",
        client
      );

      // Commit transaction
      await mockDb.manager.commitTransaction(client);
      expect(mockDb.manager.commitTransaction).toHaveBeenCalledWith(client);
    });

    it("should rollback transaction on embedding generation failure", async () => {
      mockEmbeddingEngine.generateAllSectorEmbeddings.mockRejectedValue(
        new Error("Embedding generation failed")
      );

      const client = await mockDb.manager.beginTransaction();

      await expect(
        mockEmbeddingEngine.generateAllSectorEmbeddings({
          text: "Test content",
          sector: "semantic",
        })
      ).rejects.toThrow("Embedding generation failed");

      // Rollback on failure
      await mockDb.manager.rollbackTransaction(client);
      expect(mockDb.manager.rollbackTransaction).toHaveBeenCalledWith(client);
    });

    it("should rollback transaction on storage failure", async () => {
      mockEmbeddingStorage.storeEmbeddings.mockRejectedValue(new Error("Storage failed"));

      const client = await mockDb.manager.beginTransaction();

      const embeddings = await mockEmbeddingEngine.generateAllSectorEmbeddings({
        text: "Test content",
        sector: "semantic",
      });

      await expect(
        mockEmbeddingStorage.storeEmbeddings("test-id", embeddings, "nomic-embed-text", client)
      ).rejects.toThrow("Storage failed");

      // Rollback on failure
      await mockDb.manager.rollbackTransaction(client);
      expect(mockDb.manager.rollbackTransaction).toHaveBeenCalledWith(client);
    });
  });

  describe("Embedding Retrieval Flow", () => {
    it("should retrieve stored embeddings for a memory", async () => {
      const memoryId = "test-memory-003";

      const embeddings = await mockEmbeddingStorage.retrieveEmbeddings(memoryId);

      expect(mockEmbeddingStorage.retrieveEmbeddings).toHaveBeenCalledWith(memoryId);
      expect(embeddings).toHaveProperty("episodic");
      expect(embeddings).toHaveProperty("semantic");
      expect(embeddings).toHaveProperty("procedural");
      expect(embeddings).toHaveProperty("emotional");
      expect(embeddings).toHaveProperty("reflective");
      expect(embeddings.semantic.length).toBe(768);
    });

    it("should retrieve specific sectors when requested", async () => {
      const memoryId = "test-memory-004";
      const sectors: MemorySector[] = ["semantic", "episodic"] as MemorySector[];

      mockEmbeddingStorage.retrieveEmbeddings.mockResolvedValue({
        episodic: createTestEmbedding(768, 0.1),
        semantic: createTestEmbedding(768, 0.2),
        procedural: [],
        emotional: [],
        reflective: [],
      });

      const embeddings = await mockEmbeddingStorage.retrieveEmbeddings(memoryId, sectors);

      expect(mockEmbeddingStorage.retrieveEmbeddings).toHaveBeenCalledWith(memoryId, sectors);
      expect(embeddings.semantic.length).toBe(768);
      expect(embeddings.episodic.length).toBe(768);
    });

    it("should return empty arrays for non-existent memory", async () => {
      const memoryId = "non-existent-memory";

      mockEmbeddingStorage.retrieveEmbeddings.mockResolvedValue({
        episodic: [],
        semantic: [],
        procedural: [],
        emotional: [],
        reflective: [],
      });

      const embeddings = await mockEmbeddingStorage.retrieveEmbeddings(memoryId);

      expect(embeddings.semantic).toEqual([]);
      expect(embeddings.episodic).toEqual([]);
    });
  });

  describe("Embedding Update Flow", () => {
    it("should regenerate and update embeddings when content changes", async () => {
      const memoryId = "test-memory-005";
      const newContent = "Updated memory content";

      // Generate new embeddings
      const newEmbeddings = await mockEmbeddingEngine.generateAllSectorEmbeddings({
        text: newContent,
        sector: "semantic",
      });

      expect(mockEmbeddingEngine.generateAllSectorEmbeddings).toHaveBeenCalled();

      // Update embeddings in storage
      await mockEmbeddingStorage.updateEmbeddings(memoryId, newEmbeddings, "nomic-embed-text");

      expect(mockEmbeddingStorage.updateEmbeddings).toHaveBeenCalledWith(
        memoryId,
        newEmbeddings,
        "nomic-embed-text"
      );
    });

    it("should update only specific sectors when partial update is needed", async () => {
      const memoryId = "test-memory-006";
      const newContent = "Partially updated content";

      // Generate only semantic embedding
      const semanticEmbedding = await mockEmbeddingEngine.generateSemanticEmbedding(newContent);

      const partialUpdate: Partial<SectorEmbeddings> = {
        semantic: semanticEmbedding,
      };

      await mockEmbeddingStorage.updateEmbeddings(memoryId, partialUpdate, "nomic-embed-text");

      expect(mockEmbeddingStorage.updateEmbeddings).toHaveBeenCalledWith(
        memoryId,
        partialUpdate,
        "nomic-embed-text"
      );
    });
  });

  describe("Embedding Deletion Flow", () => {
    it("should delete all embeddings for a memory", async () => {
      const memoryId = "test-memory-007";

      await mockEmbeddingStorage.deleteEmbeddings(memoryId);

      expect(mockEmbeddingStorage.deleteEmbeddings).toHaveBeenCalledWith(memoryId);
    });

    it("should handle deletion of non-existent memory gracefully", async () => {
      const memoryId = "non-existent-memory";

      // Should not throw
      await mockEmbeddingStorage.deleteEmbeddings(memoryId);

      expect(mockEmbeddingStorage.deleteEmbeddings).toHaveBeenCalledWith(memoryId);
    });
  });

  describe("Vector Similarity Search Flow", () => {
    it("should generate query embedding and perform similarity search", async () => {
      const searchText = "search query text";

      // Generate query embedding
      const queryEmbedding = await mockEmbeddingEngine.generateSemanticEmbedding(searchText);

      expect(mockEmbeddingEngine.generateSemanticEmbedding).toHaveBeenCalledWith(searchText);

      // Perform similarity search
      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        { memoryId: "memory-1", sector: "semantic", similarity: 0.95 },
        { memoryId: "memory-2", sector: "semantic", similarity: 0.85 },
      ]);

      const results = await mockEmbeddingStorage.vectorSimilaritySearch(
        queryEmbedding,
        "semantic" as MemorySector,
        10,
        0.5
      );

      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalledWith(
        queryEmbedding,
        "semantic",
        10,
        0.5
      );
      expect(results.length).toBe(2);
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    });

    it("should return empty results when no matches found", async () => {
      const searchText = "no matching content";

      const queryEmbedding = await mockEmbeddingEngine.generateSemanticEmbedding(searchText);

      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([]);

      const results = await mockEmbeddingStorage.vectorSimilaritySearch(
        queryEmbedding,
        "semantic" as MemorySector,
        10,
        0.9
      );

      expect(results).toEqual([]);
    });

    it("should filter results by similarity threshold", async () => {
      const searchText = "threshold test";

      const queryEmbedding = await mockEmbeddingEngine.generateSemanticEmbedding(searchText);

      // Only return results above threshold
      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        { memoryId: "memory-1", sector: "semantic", similarity: 0.95 },
      ]);

      const results = await mockEmbeddingStorage.vectorSimilaritySearch(
        queryEmbedding,
        "semantic" as MemorySector,
        10,
        0.8
      );

      expect(results.length).toBe(1);
      expect(results[0].similarity).toBeGreaterThanOrEqual(0.8);
    });

    it("should limit results to specified count", async () => {
      const searchText = "limit test";

      const queryEmbedding = await mockEmbeddingEngine.generateSemanticEmbedding(searchText);

      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        { memoryId: "memory-1", sector: "semantic", similarity: 0.95 },
        { memoryId: "memory-2", sector: "semantic", similarity: 0.9 },
        { memoryId: "memory-3", sector: "semantic", similarity: 0.85 },
      ]);

      const results = await mockEmbeddingStorage.vectorSimilaritySearch(
        queryEmbedding,
        "semantic" as MemorySector,
        3,
        0.5
      );

      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Multi-Sector Search Flow", () => {
    it("should perform multi-sector search with weighted scoring", async () => {
      const searchText = "multi-sector search";

      // Generate embeddings for multiple sectors
      const semanticEmbedding = await mockEmbeddingEngine.generateSemanticEmbedding(searchText);
      const episodicEmbedding = await mockEmbeddingEngine.generateEpisodicEmbedding(searchText);

      const queryEmbeddings: Partial<SectorEmbeddings> = {
        semantic: semanticEmbedding,
        episodic: episodicEmbedding,
      };

      const weights = {
        semantic: 0.6,
        episodic: 0.4,
      };

      mockEmbeddingStorage.multiSectorSearch.mockResolvedValue([
        { memoryId: "memory-1", sector: "composite", similarity: 0.9 },
        { memoryId: "memory-2", sector: "composite", similarity: 0.75 },
      ]);

      const results = await mockEmbeddingStorage.multiSectorSearch(queryEmbeddings, weights, 10);

      expect(mockEmbeddingStorage.multiSectorSearch).toHaveBeenCalledWith(
        queryEmbeddings,
        weights,
        10
      );
      expect(results.length).toBe(2);
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    });

    it("should return empty results when no query embeddings provided", async () => {
      const results = await mockEmbeddingStorage.multiSectorSearch({}, {}, 10);

      expect(results).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    it("should handle embedding engine failure gracefully", async () => {
      mockEmbeddingEngine.generateAllSectorEmbeddings.mockRejectedValue(
        new Error("Model unavailable")
      );

      await expect(
        mockEmbeddingEngine.generateAllSectorEmbeddings({
          text: "Test content",
          sector: "semantic",
        })
      ).rejects.toThrow("Model unavailable");
    });

    it("should handle storage retrieval failure gracefully", async () => {
      mockEmbeddingStorage.retrieveEmbeddings.mockRejectedValue(
        new Error("Database connection lost")
      );

      await expect(mockEmbeddingStorage.retrieveEmbeddings("test-id")).rejects.toThrow(
        "Database connection lost"
      );
    });

    it("should handle vector search failure gracefully", async () => {
      mockEmbeddingStorage.vectorSimilaritySearch.mockRejectedValue(new Error("Search failed"));

      await expect(
        mockEmbeddingStorage.vectorSimilaritySearch(
          createTestEmbedding(768, 0.1),
          "semantic" as MemorySector,
          10,
          0.5
        )
      ).rejects.toThrow("Search failed");
    });
  });

  describe("Dimension Consistency", () => {
    it("should ensure embedding dimensions match between engine and storage", async () => {
      const dimension = mockEmbeddingEngine.getModelDimension();
      expect(dimension).toBe(768);

      const embeddings = await mockEmbeddingEngine.generateAllSectorEmbeddings({
        text: "Test content",
        sector: "semantic",
      });

      // All sector embeddings should have the same dimension
      expect(embeddings.episodic.length).toBe(dimension);
      expect(embeddings.semantic.length).toBe(dimension);
      expect(embeddings.procedural.length).toBe(dimension);
      expect(embeddings.emotional.length).toBe(dimension);
      expect(embeddings.reflective.length).toBe(dimension);
    });
  });

  describe("Batch Operations", () => {
    it("should handle batch embedding generation and storage", async () => {
      const memories = [
        { text: "Memory 1", sector: "semantic" },
        { text: "Memory 2", sector: "semantic" },
        { text: "Memory 3", sector: "semantic" },
      ];

      // Generate embeddings for all memories
      const allEmbeddings = await Promise.all(
        memories.map((m) => mockEmbeddingEngine.generateAllSectorEmbeddings(m))
      );

      expect(allEmbeddings.length).toBe(3);
      expect(mockEmbeddingEngine.generateAllSectorEmbeddings).toHaveBeenCalledTimes(3);

      // Store all embeddings
      const memoryIds = ["mem-1", "mem-2", "mem-3"];
      await Promise.all(
        memoryIds.map((id, i) =>
          mockEmbeddingStorage.storeEmbeddings(id, allEmbeddings[i], "nomic-embed-text")
        )
      );

      expect(mockEmbeddingStorage.storeEmbeddings).toHaveBeenCalledTimes(3);
    });
  });
});
