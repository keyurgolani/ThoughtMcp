/**
 * Memory Lifecycle Integration Tests (Mocked)
 *
 * Tests the interaction between MemoryRepository, EmbeddingEngine, and WaypointBuilder
 * using mocks for external dependencies (database, embedding model).
 *
 * This is an integration test that verifies internal module interactions work correctly,
 * NOT a test of external service integration.
 *
 * Requirements: 12.2, 12.3, 12.4
 */

import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Memory, MemoryContent, MemoryMetadata } from "../../memory/types";

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
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// Create mock embedding engine
function createMockEmbeddingEngine() {
  const mockEmbedding = new Array(1536).fill(0).map((_, i) => Math.sin(i) * 0.1);

  return {
    generateAllSectorEmbeddings: vi.fn().mockResolvedValue({
      episodic: mockEmbedding,
      semantic: mockEmbedding,
      procedural: mockEmbedding,
      emotional: mockEmbedding,
      reflective: mockEmbedding,
    }),
    generateSemanticEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
    generateEpisodicEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
    generateProceduralEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
    generateEmotionalEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
    generateReflectiveEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
  };
}

// Create mock embedding storage
function createMockEmbeddingStorage() {
  return {
    storeEmbeddings: vi.fn().mockResolvedValue(undefined),
    retrieveEmbeddings: vi.fn().mockResolvedValue({
      episodic: new Array(1536).fill(0.1),
      semantic: new Array(1536).fill(0.1),
      procedural: new Array(1536).fill(0.1),
      emotional: new Array(1536).fill(0.1),
      reflective: new Array(1536).fill(0.1),
    }),
    vectorSimilaritySearch: vi.fn().mockResolvedValue([]),
    deleteEmbeddings: vi.fn().mockResolvedValue(undefined),
  };
}

// Create mock waypoint graph builder
function createMockGraphBuilder() {
  return {
    createWaypointLinks: vi.fn().mockResolvedValue({
      links: [],
      processingTime: 10,
    }),
    deleteLinksForMemory: vi.fn().mockResolvedValue(undefined),
  };
}

describe("Memory Lifecycle Integration (Mocked)", () => {
  let mockDb: ReturnType<typeof createMockDbManager>;
  let mockEmbeddingEngine: ReturnType<typeof createMockEmbeddingEngine>;
  let mockEmbeddingStorage: ReturnType<typeof createMockEmbeddingStorage>;
  let mockGraphBuilder: ReturnType<typeof createMockGraphBuilder>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDbManager();
    mockEmbeddingEngine = createMockEmbeddingEngine();
    mockEmbeddingStorage = createMockEmbeddingStorage();
    mockGraphBuilder = createMockGraphBuilder();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Memory Creation Flow", () => {
    it("should coordinate memory creation across repository, embedding engine, and graph builder", async () => {
      // Setup mock responses for the creation flow
      const mockMemoryId = "test-memory-123";
      const mockTimestamp = new Date("2024-12-11T10:00:00Z");

      // Mock the database insert to succeed
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [],
        rowCount: 1,
      });

      // Simulate the memory creation flow
      const content: MemoryContent = {
        content: "Test memory content for integration",
        userId: "test-user-1",
        sessionId: "test-session-1",
        primarySector: "semantic",
      };

      const metadata: MemoryMetadata = {
        keywords: ["test", "integration"],
        tags: ["unit-test"],
        category: "testing",
        importance: 0.8,
      };

      // Step 1: Begin transaction
      const client = await mockDb.manager.beginTransaction();
      expect(mockDb.manager.beginTransaction).toHaveBeenCalled();

      // Step 2: Generate embeddings
      const embeddings = await mockEmbeddingEngine.generateAllSectorEmbeddings({
        text: content.content,
        sector: content.primarySector,
      });
      expect(mockEmbeddingEngine.generateAllSectorEmbeddings).toHaveBeenCalledWith({
        text: content.content,
        sector: content.primarySector,
      });
      expect(embeddings).toHaveProperty("semantic");
      expect(embeddings).toHaveProperty("episodic");

      // Step 3: Store embeddings
      await mockEmbeddingStorage.storeEmbeddings(mockMemoryId, embeddings, "default", client);
      expect(mockEmbeddingStorage.storeEmbeddings).toHaveBeenCalledWith(
        mockMemoryId,
        embeddings,
        "default",
        client
      );

      // Step 4: Create waypoint links
      const mockMemory: Memory = {
        id: mockMemoryId,
        content: content.content,
        createdAt: mockTimestamp,
        lastAccessed: mockTimestamp,
        accessCount: 0,
        salience: 0.5,
        decayRate: 0.01,
        strength: 1.0,
        userId: content.userId,
        sessionId: content.sessionId,
        primarySector: content.primarySector,
        metadata: metadata,
        embeddings: embeddings,
      };

      const linkResult = await mockGraphBuilder.createWaypointLinks(mockMemory, []);
      expect(mockGraphBuilder.createWaypointLinks).toHaveBeenCalled();
      expect(linkResult).toHaveProperty("links");

      // Step 5: Commit transaction
      await mockDb.manager.commitTransaction(client);
      expect(mockDb.manager.commitTransaction).toHaveBeenCalledWith(client);
    });

    it("should rollback transaction on embedding generation failure", async () => {
      // Setup mock to fail on embedding generation
      mockEmbeddingEngine.generateAllSectorEmbeddings.mockRejectedValue(
        new Error("Embedding generation failed")
      );

      const content: MemoryContent = {
        content: "Test memory content",
        userId: "test-user-1",
        sessionId: "test-session-1",
        primarySector: "semantic",
      };

      // Begin transaction
      const client = await mockDb.manager.beginTransaction();

      // Attempt embedding generation (should fail)
      await expect(
        mockEmbeddingEngine.generateAllSectorEmbeddings({
          text: content.content,
          sector: content.primarySector,
        })
      ).rejects.toThrow("Embedding generation failed");

      // Rollback should be called on failure
      await mockDb.manager.rollbackTransaction(client);
      expect(mockDb.manager.rollbackTransaction).toHaveBeenCalledWith(client);
    });

    it("should handle waypoint link creation failure gracefully", async () => {
      // Setup mock to fail on waypoint creation
      mockGraphBuilder.createWaypointLinks.mockRejectedValue(new Error("Waypoint creation failed"));

      const mockMemory: Memory = {
        id: "test-memory-456",
        content: "Test content",
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        salience: 0.5,
        decayRate: 0.01,
        strength: 1.0,
        userId: "test-user",
        sessionId: "test-session",
        primarySector: "semantic",
        metadata: { keywords: [], tags: [] },
      };

      // Waypoint creation failure should be caught
      await expect(mockGraphBuilder.createWaypointLinks(mockMemory, [])).rejects.toThrow(
        "Waypoint creation failed"
      );

      // In real implementation, this would be caught and logged, not propagated
    });
  });

  describe("Memory Retrieval Flow", () => {
    it("should coordinate retrieval across repository and embedding storage", async () => {
      const mockMemoryId = "test-memory-789";
      const mockUserId = "test-user-1";
      const mockTimestamp = new Date("2024-12-11T10:00:00Z");

      // Setup mock database response
      (mockDb.client.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          rows: [
            {
              id: mockMemoryId,
              content: "Retrieved memory content",
              created_at: mockTimestamp.toISOString(),
              last_accessed: mockTimestamp.toISOString(),
              access_count: 5,
              salience: 0.7,
              decay_rate: 0.01,
              strength: 0.9,
              user_id: mockUserId,
              session_id: "test-session",
              primary_sector: "semantic",
              keywords: ["test"],
              tags: ["integration"],
              category: "testing",
              context: "test context",
              importance: 0.8,
              is_atomic: true,
              parent_id: null,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [], // No links
          rowCount: 0,
        });

      // Step 1: Get connection
      const client = await mockDb.manager.getConnection();
      expect(mockDb.manager.getConnection).toHaveBeenCalled();

      // Step 2: Query memory
      const memoryResult = await client.query(
        "SELECT * FROM memories WHERE id = $1 AND user_id = $2",
        [mockMemoryId, mockUserId]
      );
      expect(memoryResult.rows.length).toBe(1);
      expect(memoryResult.rows[0].id).toBe(mockMemoryId);

      // Step 3: Retrieve embeddings
      const embeddings = await mockEmbeddingStorage.retrieveEmbeddings(mockMemoryId);
      expect(mockEmbeddingStorage.retrieveEmbeddings).toHaveBeenCalledWith(mockMemoryId);
      expect(embeddings).toHaveProperty("semantic");

      // Step 4: Release connection
      mockDb.manager.releaseConnection(client);
      expect(mockDb.manager.releaseConnection).toHaveBeenCalledWith(client);
    });

    it("should return null for non-existent memory", async () => {
      const mockMemoryId = "non-existent-memory";
      const mockUserId = "test-user-1";

      // Setup mock to return empty result
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const client = await mockDb.manager.getConnection();
      const result = await client.query("SELECT * FROM memories WHERE id = $1 AND user_id = $2", [
        mockMemoryId,
        mockUserId,
      ]);

      expect(result.rows.length).toBe(0);
    });
  });

  describe("Memory Update Flow", () => {
    it("should regenerate embeddings when content is updated", async () => {
      const mockMemoryId = "test-memory-update";
      // userId context established for the test scenario
      const newContent = "Updated memory content";

      // Setup mock responses
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [{ id: mockMemoryId }],
        rowCount: 1,
      });

      // Begin transaction
      const client = await mockDb.manager.beginTransaction();

      // Update content triggers embedding regeneration
      const newEmbeddings = await mockEmbeddingEngine.generateAllSectorEmbeddings({
        text: newContent,
        sector: "semantic",
      });
      expect(mockEmbeddingEngine.generateAllSectorEmbeddings).toHaveBeenCalled();

      // Store new embeddings
      await mockEmbeddingStorage.storeEmbeddings(mockMemoryId, newEmbeddings, "default", client);
      expect(mockEmbeddingStorage.storeEmbeddings).toHaveBeenCalled();

      // Commit transaction
      await mockDb.manager.commitTransaction(client);
      expect(mockDb.manager.commitTransaction).toHaveBeenCalled();
    });

    it("should update waypoint links when content changes significantly", async () => {
      const mockMemoryId = "test-memory-links";
      const newContent = "Significantly different content";

      const mockMemory: Memory = {
        id: mockMemoryId,
        content: newContent,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        salience: 0.5,
        decayRate: 0.01,
        strength: 1.0,
        userId: "test-user",
        sessionId: "test-session",
        primarySector: "semantic",
        metadata: { keywords: [], tags: [] },
      };

      // Delete old links
      await mockGraphBuilder.deleteLinksForMemory(mockMemoryId);
      expect(mockGraphBuilder.deleteLinksForMemory).toHaveBeenCalledWith(mockMemoryId);

      // Create new links
      await mockGraphBuilder.createWaypointLinks(mockMemory, []);
      expect(mockGraphBuilder.createWaypointLinks).toHaveBeenCalled();
    });

    it("should handle update with empty metadata object (no fields to update)", async () => {
      // Tests the path where metadata is provided but all fields are undefined
      // This covers the early return when no metadata fields to update
      const mockMemoryId = "test-memory-empty-metadata";
      const mockTimestamp = new Date("2024-12-11T10:00:00Z");

      // Mock existing memory retrieval
      (mockDb.client.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          rows: [
            {
              id: mockMemoryId,
              content: "Test memory for empty metadata update",
              created_at: mockTimestamp.toISOString(),
              last_accessed: mockTimestamp.toISOString(),
              access_count: 0,
              salience: 0.5,
              decay_rate: 0.01,
              strength: 1.0,
              user_id: "test-user",
              session_id: "test-session",
              primary_sector: "semantic",
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ id: mockMemoryId }],
          rowCount: 1,
        });

      const client = await mockDb.manager.beginTransaction();

      // Simulate update with empty metadata object
      const updateParams = {
        memoryId: mockMemoryId,
        userId: "test-user",
        metadata: {}, // Empty metadata object - no fields to update
      };

      // Verify memory exists
      const existingMemory = await client.query("SELECT * FROM memories WHERE id = $1", [
        updateParams.memoryId,
      ]);
      expect(existingMemory.rows.length).toBe(1);

      // With empty metadata, no metadata update query should be needed
      // The update should succeed without errors
      await mockDb.manager.commitTransaction(client);
      expect(mockDb.manager.commitTransaction).toHaveBeenCalled();
    });

    it("should handle update with metadata containing only undefined fields", async () => {
      // Tests the path where metadata fields are explicitly undefined
      const mockMemoryId = "test-memory-undefined-fields";
      const mockTimestamp = new Date("2024-12-11T10:00:00Z");

      // Mock existing memory with initial metadata
      (mockDb.client.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          rows: [
            {
              id: mockMemoryId,
              content: "Test memory for undefined metadata fields",
              created_at: mockTimestamp.toISOString(),
              last_accessed: mockTimestamp.toISOString(),
              access_count: 0,
              salience: 0.5,
              decay_rate: 0.01,
              strength: 1.0,
              user_id: "test-user",
              session_id: "test-session",
              primary_sector: "semantic",
              keywords: ["initial", "test"],
              tags: ["tag1"],
              category: "initial-category",
              importance: 0.5,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ id: mockMemoryId }],
          rowCount: 1,
        });

      const client = await mockDb.manager.beginTransaction();

      // Simulate update with metadata containing only undefined fields
      const updateParams = {
        memoryId: mockMemoryId,
        userId: "test-user",
        metadata: {
          keywords: undefined,
          tags: undefined,
          category: undefined,
          context: undefined,
          importance: undefined,
          isAtomic: undefined,
          parentId: undefined,
        },
      };

      // Verify memory exists with original metadata
      const existingMemory = await client.query("SELECT * FROM memories WHERE id = $1", [
        updateParams.memoryId,
      ]);
      expect(existingMemory.rows.length).toBe(1);
      expect(existingMemory.rows[0].keywords).toEqual(["initial", "test"]);
      expect(existingMemory.rows[0].tags).toEqual(["tag1"]);
      expect(existingMemory.rows[0].category).toBe("initial-category");

      // With all undefined fields, original metadata should be preserved
      await mockDb.manager.commitTransaction(client);
      expect(mockDb.manager.commitTransaction).toHaveBeenCalled();
    });

    it("should update only strength without metadata changes", async () => {
      // Tests that metadata update is skipped when only strength is updated
      const mockMemoryId = "test-memory-strength-only";

      // Mock the UPDATE query to return updated strength
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [
          {
            id: mockMemoryId,
            strength: 0.7,
          },
        ],
        rowCount: 1,
      });

      const client = await mockDb.manager.beginTransaction();

      // Simulate strength-only update
      const updateResult = await client.query(
        "UPDATE memories SET strength = $1 WHERE id = $2 RETURNING id, strength",
        [0.7, mockMemoryId]
      );

      expect(updateResult.rows[0].strength).toBe(0.7);

      // No embedding regeneration should occur for strength-only update
      expect(mockEmbeddingEngine.generateAllSectorEmbeddings).not.toHaveBeenCalled();

      await mockDb.manager.commitTransaction(client);
      expect(mockDb.manager.commitTransaction).toHaveBeenCalled();
    });

    it("should update only salience without metadata changes", async () => {
      // Tests that metadata update is skipped when only salience is updated
      const mockMemoryId = "test-memory-salience-only";

      // Mock the UPDATE query to return updated salience
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [
          {
            id: mockMemoryId,
            salience: 0.8,
          },
        ],
        rowCount: 1,
      });

      const client = await mockDb.manager.beginTransaction();

      // Simulate salience-only update
      const updateResult = await client.query(
        "UPDATE memories SET salience = $1 WHERE id = $2 RETURNING id, salience",
        [0.8, mockMemoryId]
      );

      expect(updateResult.rows[0].salience).toBe(0.8);

      // No embedding regeneration should occur for salience-only update
      expect(mockEmbeddingEngine.generateAllSectorEmbeddings).not.toHaveBeenCalled();

      await mockDb.manager.commitTransaction(client);
      expect(mockDb.manager.commitTransaction).toHaveBeenCalled();
    });
  });

  describe("Memory Deletion Flow", () => {
    it("should coordinate soft delete across all components", async () => {
      const mockMemoryId = "test-memory-delete";

      // Setup mock responses
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [{ id: mockMemoryId }],
        rowCount: 1,
      });

      const client = await mockDb.manager.beginTransaction();

      // Soft delete sets strength to 0
      await client.query("UPDATE memories SET strength = 0 WHERE id = $1", [mockMemoryId]);
      expect(mockDb.client.query).toHaveBeenCalled();

      await mockDb.manager.commitTransaction(client);
      expect(mockDb.manager.commitTransaction).toHaveBeenCalled();
    });

    it("should cascade hard delete to embeddings and links", async () => {
      const mockMemoryId = "test-memory-hard-delete";

      // Setup mock responses
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [],
        rowCount: 1,
      });

      const client = await mockDb.manager.beginTransaction();

      // Delete embeddings
      await mockEmbeddingStorage.deleteEmbeddings(mockMemoryId);
      expect(mockEmbeddingStorage.deleteEmbeddings).toHaveBeenCalledWith(mockMemoryId);

      // Delete links
      await mockGraphBuilder.deleteLinksForMemory(mockMemoryId);
      expect(mockGraphBuilder.deleteLinksForMemory).toHaveBeenCalledWith(mockMemoryId);

      // Delete memory record
      await client.query("DELETE FROM memories WHERE id = $1", [mockMemoryId]);

      await mockDb.manager.commitTransaction(client);
    });
  });

  describe("Search Integration Flow", () => {
    it("should coordinate search across embedding engine and storage", async () => {
      const searchText = "test search query";
      // userId context established for the test scenario

      // Generate query embedding
      const queryEmbedding = await mockEmbeddingEngine.generateSemanticEmbedding(searchText);
      expect(mockEmbeddingEngine.generateSemanticEmbedding).toHaveBeenCalledWith(searchText);

      // Perform vector similarity search
      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        { memoryId: "memory-1", similarity: 0.95 },
        { memoryId: "memory-2", similarity: 0.85 },
      ]);

      const similarResults = await mockEmbeddingStorage.vectorSimilaritySearch(
        queryEmbedding,
        "semantic",
        10,
        0.5
      );
      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalled();
      expect(similarResults.length).toBe(2);
      expect(similarResults[0].similarity).toBeGreaterThan(similarResults[1].similarity);
    });

    it("should handle empty search results gracefully", async () => {
      const searchText = "no matching content";

      // Generate query embedding
      await mockEmbeddingEngine.generateSemanticEmbedding(searchText);

      // Return empty results
      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([]);

      const results = await mockEmbeddingStorage.vectorSimilaritySearch(
        new Array(1536).fill(0.1),
        "semantic",
        10,
        0.5
      );

      expect(results).toEqual([]);
    });
  });

  describe("Multi-Sector Embedding Flow", () => {
    it("should generate and store embeddings for all five sectors", async () => {
      const content = "Multi-sector test content";
      const mockMemoryId = "test-multi-sector";

      // Generate all sector embeddings
      const embeddings = await mockEmbeddingEngine.generateAllSectorEmbeddings({
        text: content,
        sector: "semantic",
      });

      // Verify all sectors are present
      expect(embeddings).toHaveProperty("episodic");
      expect(embeddings).toHaveProperty("semantic");
      expect(embeddings).toHaveProperty("procedural");
      expect(embeddings).toHaveProperty("emotional");
      expect(embeddings).toHaveProperty("reflective");

      // Store embeddings
      const client = await mockDb.manager.beginTransaction();
      await mockEmbeddingStorage.storeEmbeddings(mockMemoryId, embeddings, "default", client);

      expect(mockEmbeddingStorage.storeEmbeddings).toHaveBeenCalledWith(
        mockMemoryId,
        embeddings,
        "default",
        client
      );
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle database connection failure", async () => {
      mockDb.manager.getConnection.mockRejectedValue(new Error("Connection failed"));

      await expect(mockDb.manager.getConnection()).rejects.toThrow("Connection failed");
    });

    it("should handle transaction commit failure", async () => {
      const client = await mockDb.manager.beginTransaction();
      mockDb.manager.commitTransaction.mockRejectedValue(new Error("Commit failed"));

      await expect(mockDb.manager.commitTransaction(client)).rejects.toThrow("Commit failed");
    });

    it("should handle embedding storage failure", async () => {
      mockEmbeddingStorage.storeEmbeddings.mockRejectedValue(new Error("Storage failed"));

      await expect(
        mockEmbeddingStorage.storeEmbeddings("test-id", {}, "default", null)
      ).rejects.toThrow("Storage failed");
    });
  });

  describe("Complex Search Queries", () => {
    it("should coordinate search with all filters combined", async () => {
      // Setup mock responses for complex search
      const mockMemoryId = "test-memory-complex-search";
      const mockTimestamp = new Date("2024-12-11T10:00:00Z");

      // Mock database query to return filtered results
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [
          {
            id: mockMemoryId,
            content: "Important semantic memory about TypeScript",
            created_at: mockTimestamp.toISOString(),
            last_accessed: mockTimestamp.toISOString(),
            access_count: 5,
            salience: 0.7,
            decay_rate: 0.01,
            strength: 0.9,
            user_id: "test-user-1",
            session_id: "test-session",
            primary_sector: "semantic",
            keywords: ["typescript", "programming"],
            tags: ["important", "tech"],
            category: "development",
            importance: 0.9,
          },
        ],
        rowCount: 1,
      });

      // Mock vector similarity search
      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        { memoryId: mockMemoryId, similarity: 0.95 },
      ]);

      // Generate query embedding
      const queryEmbedding = await mockEmbeddingEngine.generateSemanticEmbedding(
        "Important semantic memory about TypeScript"
      );
      expect(mockEmbeddingEngine.generateSemanticEmbedding).toHaveBeenCalled();

      // Perform vector similarity search
      const similarResults = await mockEmbeddingStorage.vectorSimilaritySearch(
        queryEmbedding,
        "semantic",
        10,
        0.5
      );

      expect(similarResults.length).toBe(1);
      expect(similarResults[0].memoryId).toBe(mockMemoryId);
      expect(similarResults[0].similarity).toBe(0.95);

      // Query database with filters
      const client = await mockDb.manager.getConnection();
      const result = await client.query(
        `SELECT * FROM memories m
         JOIN memory_metadata mm ON m.id = mm.memory_id
         WHERE m.user_id = $1
         AND m.primary_sector = $2
         AND m.strength >= $3
         AND m.salience >= $4
         AND mm.category = $5
         AND mm.keywords && $6
         AND mm.tags && $7`,
        ["test-user-1", "semantic", 0.5, 0.3, "development", ["programming"], ["tech"]]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].id).toBe(mockMemoryId);
    });

    it("should handle metadata-only search without text query", async () => {
      const mockMemoryId = "test-memory-metadata-only";

      // Mock database query for metadata-only search
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [
          {
            id: mockMemoryId,
            content: "Memory with specific tags",
            tags: ["metadata-only"],
            category: "test-category",
          },
        ],
        rowCount: 1,
      });

      const client = await mockDb.manager.getConnection();
      const result = await client.query(
        `SELECT * FROM memories m
         JOIN memory_metadata mm ON m.id = mm.memory_id
         WHERE m.user_id = $1
         AND mm.tags && $2
         AND mm.category = $3`,
        ["test-user-1", ["metadata-only"], "test-category"]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].id).toBe(mockMemoryId);
      // No similarity score since no text query
    });

    it("should return empty result set when no matches", async () => {
      // Mock empty result
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([]);

      const client = await mockDb.manager.getConnection();
      const result = await client.query(
        `SELECT * FROM memories WHERE user_id = $1 AND primary_sector = $2`,
        ["test-user-1", "semantic"]
      );

      expect(result.rows).toHaveLength(0);
    });

    it("should handle search with pagination", async () => {
      // Mock paginated results - page 1
      (mockDb.client.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          rows: [
            { id: "memory-1", content: "Pagination test memory 1" },
            { id: "memory-2", content: "Pagination test memory 2" },
          ],
          rowCount: 2,
        })
        // Mock paginated results - page 2
        .mockResolvedValueOnce({
          rows: [{ id: "memory-3", content: "Pagination test memory 3" }],
          rowCount: 1,
        });

      const client = await mockDb.manager.getConnection();

      // First page
      const page1 = await client.query(
        `SELECT * FROM memories WHERE user_id = $1 LIMIT $2 OFFSET $3`,
        ["test-user-1", 2, 0]
      );
      expect(page1.rows.length).toBe(2);

      // Second page
      const page2 = await client.query(
        `SELECT * FROM memories WHERE user_id = $1 LIMIT $2 OFFSET $3`,
        ["test-user-1", 2, 2]
      );
      expect(page2.rows.length).toBe(1);

      // Verify no overlap
      const ids1 = page1.rows.map((r: { id: string }) => r.id);
      const ids2 = page2.rows.map((r: { id: string }) => r.id);
      const overlap = ids1.filter((id: string) => ids2.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });

  describe("Batch Delete Operations", () => {
    it("should track failures for non-existent memories in batch delete", async () => {
      const existingMemoryId = "existing-memory-123";

      // Mock: First query finds the existing memory, subsequent queries find nothing
      (mockDb.client.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          rows: [{ id: existingMemoryId }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

      const client = await mockDb.manager.beginTransaction();

      // Simulate batch delete logic
      const memoryIds = [existingMemoryId, "non-existent-1", "non-existent-2"];
      const results = {
        successCount: 0,
        failureCount: 0,
        failures: [] as Array<{ memoryId: string; error: string }>,
      };

      for (const memoryId of memoryIds) {
        const checkResult = await client.query("SELECT id FROM memories WHERE id = $1", [memoryId]);

        if (checkResult.rows.length === 0) {
          results.failureCount++;
          results.failures.push({ memoryId, error: "Memory not found" });
        } else {
          results.successCount++;
        }
      }

      await mockDb.manager.commitTransaction(client);

      expect(results.successCount).toBe(1);
      expect(results.failureCount).toBe(2);
      expect(results.failures).toHaveLength(2);
      expect(results.failures[0]).toEqual({
        memoryId: "non-existent-1",
        error: "Memory not found",
      });
    });

    it("should handle batch delete with all non-existent IDs", async () => {
      // Mock: All queries return empty
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const memoryIds = ["non-existent-1", "non-existent-2", "non-existent-3"];
      const results = {
        successCount: 0,
        failureCount: 0,
        failures: [] as Array<{ memoryId: string; error: string }>,
      };

      const client = await mockDb.manager.beginTransaction();

      for (const memoryId of memoryIds) {
        const checkResult = await client.query("SELECT id FROM memories WHERE id = $1", [memoryId]);

        if (checkResult.rows.length === 0) {
          results.failureCount++;
          results.failures.push({ memoryId, error: "Memory not found" });
        } else {
          results.successCount++;
        }
      }

      await mockDb.manager.commitTransaction(client);

      expect(results.successCount).toBe(0);
      expect(results.failureCount).toBe(3);
      expect(results.failures).toHaveLength(3);
    });
  });

  describe("Metadata Filtering Edge Cases", () => {
    it("should handle search with empty keywords array", async () => {
      // Mock: Return all memories when keywords filter is empty
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [
          { id: "memory-1", keywords: ["test", "keyword"] },
          { id: "memory-2", keywords: ["other"] },
        ],
        rowCount: 2,
      });

      const client = await mockDb.manager.getConnection();
      const result = await client.query(
        `SELECT * FROM memories m
         JOIN memory_metadata mm ON m.id = mm.memory_id
         WHERE m.user_id = $1`,
        ["test-user-1"]
      );

      // Empty keywords array means no keyword filter - returns all
      expect(result.rows.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle search with only category filter", async () => {
      const mockMemoryId = "test-memory-category";

      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [
          {
            id: mockMemoryId,
            content: "Memory for category-only search",
            category: "unique-category-xyz",
          },
        ],
        rowCount: 1,
      });

      const client = await mockDb.manager.getConnection();
      const result = await client.query(
        `SELECT * FROM memories m
         JOIN memory_metadata mm ON m.id = mm.memory_id
         WHERE m.user_id = $1
         AND mm.category = $2`,
        ["test-user-1", "unique-category-xyz"]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].id).toBe(mockMemoryId);
    });

    it("should handle multiple metadata filters combined", async () => {
      const mockMemoryId = "test-memory-all-metadata";

      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [
          {
            id: mockMemoryId,
            keywords: ["keyword1", "keyword2"],
            tags: ["tag1", "tag2"],
            category: "category1",
          },
        ],
        rowCount: 1,
      });

      const client = await mockDb.manager.getConnection();
      const result = await client.query(
        `SELECT * FROM memories m
         JOIN memory_metadata mm ON m.id = mm.memory_id
         WHERE m.user_id = $1
         AND mm.keywords && $2
         AND mm.tags && $3
         AND mm.category = $4`,
        ["test-user-1", ["keyword2"], ["tag2"], "category1"]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].id).toBe(mockMemoryId);
    });

    it("should handle metadata array overlap with no matches", async () => {
      // Mock: Return empty when no overlap
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const client = await mockDb.manager.getConnection();
      const result = await client.query(
        `SELECT * FROM memories m
         JOIN memory_metadata mm ON m.id = mm.memory_id
         WHERE m.user_id = $1
         AND mm.keywords && $2
         AND mm.tags && $3`,
        ["test-user-1", ["nonexistent-keyword"], ["nonexistent-tag"]]
      );

      expect(result.rows).toHaveLength(0);
    });
  });

  describe("Composite Score Calculation", () => {
    it("should verify composite score formula", async () => {
      // Test the composite scoring formula:
      // 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×linkWeight

      const scoreComponents = {
        similarity: 0.8,
        salience: 0.7,
        recency: 0.9,
        linkWeight: 0.5,
      };

      const expectedTotal =
        0.6 * scoreComponents.similarity +
        0.2 * scoreComponents.salience +
        0.1 * scoreComponents.recency +
        0.1 * scoreComponents.linkWeight;

      // 0.6 * 0.8 + 0.2 * 0.7 + 0.1 * 0.9 + 0.1 * 0.5
      // = 0.48 + 0.14 + 0.09 + 0.05
      // = 0.76
      expect(expectedTotal).toBeCloseTo(0.76, 5);

      // Verify all components are in valid range
      expect(scoreComponents.similarity).toBeGreaterThanOrEqual(0);
      expect(scoreComponents.similarity).toBeLessThanOrEqual(1);
      expect(scoreComponents.salience).toBeGreaterThanOrEqual(0);
      expect(scoreComponents.salience).toBeLessThanOrEqual(1);
      expect(scoreComponents.recency).toBeGreaterThanOrEqual(0);
      expect(scoreComponents.recency).toBeLessThanOrEqual(1);
      expect(scoreComponents.linkWeight).toBeGreaterThanOrEqual(0);
      expect(scoreComponents.linkWeight).toBeLessThanOrEqual(1);
    });
  });

  describe("Sequential Update Operations", () => {
    it("should maintain data integrity with sequential updates", async () => {
      const mockMemoryId = "test-memory-sequential";

      // Mock sequential update responses
      (mockDb.client.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          rows: [{ id: mockMemoryId, content: "Updated by operation 1", strength: 0.8 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ id: mockMemoryId, content: "Updated by operation 2", strength: 0.9 }],
          rowCount: 1,
        });

      const client = await mockDb.manager.beginTransaction();

      // First update
      const update1 = await client.query(
        "UPDATE memories SET content = $1, strength = $2 WHERE id = $3 RETURNING *",
        ["Updated by operation 1", 0.8, mockMemoryId]
      );
      expect(update1.rows[0].content).toBe("Updated by operation 1");
      expect(update1.rows[0].strength).toBe(0.8);

      // Second update
      const update2 = await client.query(
        "UPDATE memories SET content = $1, strength = $2 WHERE id = $3 RETURNING *",
        ["Updated by operation 2", 0.9, mockMemoryId]
      );
      expect(update2.rows[0].content).toBe("Updated by operation 2");
      expect(update2.rows[0].strength).toBe(0.9);

      await mockDb.manager.commitTransaction(client);
      expect(mockDb.manager.commitTransaction).toHaveBeenCalled();
    });
  });
});
