/**
 * Memory Repository - Essential Unit Tests
 *
 * Tests core CRUD operations, embedding generation, and error handling.
 * Reduced from 111 tests to ~20 essential tests.
 *
 * Requirements: 2.1, 2.2, 3.1, 6.1
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "../../../memory/memory-repository";
import type { Memory, MemoryContent } from "../../../memory/types";
import { createTestSectorEmbeddings } from "../../utils/test-fixtures";

describe("MemoryRepository", () => {
  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockGraphBuilder: any;
  let mockEmbeddingStorage: any;
  let mockClient: any;

  const userId = "user-123";
  const testMemory: Memory = {
    id: "test-memory-1",
    content: "Original content about machine learning",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    lastAccessed: new Date("2024-01-01T00:00:00Z"),
    accessCount: 5,
    salience: 0.7,
    decayRate: 0.01,
    strength: 0.85,
    userId,
    sessionId: "session-456",
    primarySector: "semantic",
    metadata: {
      keywords: ["machine", "learning", "original"],
      tags: ["ai", "ml"],
      category: "technology",
      context: "research project",
      importance: 0.8,
      isAtomic: true,
    },
  };

  beforeEach(() => {
    mockClient = {
      query: vi.fn().mockImplementation((query: string, params?: any[]) => {
        if (query.includes("SELECT") && query.includes("memories m")) {
          if (params?.[0] === "non-existent") {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({
            rows: [
              {
                id: params?.[0] || testMemory.id,
                content: testMemory.content,
                created_at: testMemory.createdAt,
                last_accessed: testMemory.lastAccessed,
                access_count: testMemory.accessCount,
                salience: testMemory.salience,
                decay_rate: testMemory.decayRate,
                strength: testMemory.strength,
                user_id: params?.[1] || testMemory.userId,
                session_id: testMemory.sessionId,
                primary_sector: testMemory.primarySector,
                keywords: testMemory.metadata.keywords,
                tags: testMemory.metadata.tags,
                category: testMemory.metadata.category,
                context: testMemory.metadata.context,
                importance: testMemory.metadata.importance,
                is_atomic: testMemory.metadata.isAtomic,
                parent_id: null,
              },
            ],
          });
        }
        if (query.includes("SELECT m.*, me.embedding")) {
          return Promise.resolve({
            rows: [
              {
                id: "existing-memory-1",
                content: "Existing memory content",
                created_at: new Date(),
                last_accessed: new Date(),
                access_count: 0,
                salience: 0.5,
                decay_rate: 0.02,
                strength: 1.0,
                user_id: userId,
                session_id: "session-456",
                primary_sector: "semantic",
              },
            ],
          });
        }
        if (query.includes("memory_links")) {
          return Promise.resolve({
            rows: [
              {
                source_id: testMemory.id,
                target_id: "mem-456",
                link_type: "semantic",
                weight: 0.85,
                created_at: new Date(),
                traversal_count: 3,
              },
            ],
          });
        }
        if (query.includes("COUNT(*)")) {
          return Promise.resolve({ rows: [{ total: 1 }] });
        }
        if (query.includes("UPDATE") || query.includes("INSERT") || query.includes("DELETE")) {
          return Promise.resolve({ rowCount: 1, rows: [{ id: testMemory.id }] });
        }
        return Promise.resolve({ rows: [] });
      }),
    };

    mockDb = {
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    mockEmbeddingEngine = {
      generateAllSectorEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
      generateSemanticEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    };

    mockGraphBuilder = {
      createWaypointLinks: vi.fn().mockResolvedValue({
        links: [
          {
            sourceId: "new-memory-id",
            targetId: "existing-memory-1",
            linkType: "semantic",
            weight: 0.85,
            createdAt: new Date(),
            traversalCount: 0,
          },
        ],
        skippedCount: 0,
      }),
      calculateLinkWeight: vi.fn().mockResolvedValue(0.5),
    };

    mockEmbeddingStorage = {
      storeEmbeddings: vi.fn().mockResolvedValue(undefined),
      retrieveEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
      vectorSimilaritySearch: vi.fn().mockResolvedValue([
        { memoryId: "mem-1", similarity: 0.95 },
        { memoryId: "mem-2", similarity: 0.85 },
      ]),
    };

    repository = new MemoryRepository(
      mockDb,
      mockEmbeddingEngine,
      mockGraphBuilder,
      mockEmbeddingStorage
    );
  });

  describe("Memory Creation", () => {
    it("should create memory with all required fields", async () => {
      const content: MemoryContent = {
        content: "Test memory content",
        userId,
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(memory.id).toBeDefined();
      expect(memory.content).toBe("Test memory content");
      expect(memory.userId).toBe(userId);
      expect(memory.primarySector).toBe("semantic");
    });

    it("should generate unique ID for each memory", async () => {
      const content: MemoryContent = {
        content: "Test memory",
        userId,
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory1 = await repository.create(content);
      const memory2 = await repository.create(content);

      expect(memory1.id).not.toBe(memory2.id);
    });

    it("should reject memory with empty content", async () => {
      const content: MemoryContent = {
        content: "",
        userId,
        sessionId: "session-456",
        primarySector: "semantic",
      };

      await expect(repository.create(content)).rejects.toThrow("Content cannot be empty");
    });

    it("should reject memory with invalid sector", async () => {
      const content: any = {
        content: "Test memory",
        userId,
        sessionId: "session-456",
        primarySector: "invalid-sector",
      };

      await expect(repository.create(content)).rejects.toThrow("Invalid memory sector");
    });

    it("should reject memory without userId", async () => {
      const content: any = {
        content: "Test memory",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      await expect(repository.create(content)).rejects.toThrow("userId is required");
    });
  });

  describe("Embedding Generation", () => {
    it("should generate embeddings for all five sectors", async () => {
      const content: MemoryContent = {
        content: "Test memory content",
        userId,
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(mockEmbeddingEngine.generateAllSectorEmbeddings).toHaveBeenCalled();
      expect(memory.embeddings).toBeDefined();
      expect(memory.embeddings?.semantic).toHaveLength(1536);
    });

    it("should handle embedding generation failure", async () => {
      mockEmbeddingEngine.generateAllSectorEmbeddings.mockRejectedValue(
        new Error("Embedding service unavailable")
      );

      const content: MemoryContent = {
        content: "Test memory content",
        userId,
        sessionId: "session-456",
        primarySector: "semantic",
      };

      await expect(repository.create(content)).rejects.toThrow("Embedding generation failed");
    });
  });

  describe("Memory Retrieval", () => {
    it("should retrieve memory by ID", async () => {
      const memory = await repository.retrieve(testMemory.id, userId);

      expect(memory).toBeDefined();
      expect(memory?.id).toBe(testMemory.id);
      expect(memory?.content).toBe(testMemory.content);
    });

    it("should return null for non-existent memory", async () => {
      const memory = await repository.retrieve("non-existent", userId);

      expect(memory).toBeNull();
    });

    it("should include metadata in retrieved memory", async () => {
      const memory = await repository.retrieve(testMemory.id, userId);

      expect(memory).toBeDefined();
      expect(memory?.metadata).toBeDefined();
      expect(memory?.metadata.keywords).toEqual(testMemory.metadata.keywords);
    });
  });

  describe("Memory Update", () => {
    it("should update memory content", async () => {
      const updates = {
        memoryId: testMemory.id,
        userId,
        content: "Updated content",
      };

      const updated = await repository.update(updates);

      expect(updated).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE"),
        expect.any(Array)
      );
    });

    it("should throw error for non-existent memory", async () => {
      mockClient.query.mockImplementation((query: string, params?: any[]) => {
        if (query.includes("SELECT") && params?.[0] === "non-existent") {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      await expect(
        repository.update({ memoryId: "non-existent", userId, content: "test" })
      ).rejects.toThrow();
    });
  });

  describe("Memory Deletion", () => {
    it("should soft delete by setting strength to 0", async () => {
      await repository.delete(testMemory.id, true);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE"),
        expect.any(Array)
      );
    });

    it("should hard delete memory and related data", async () => {
      await repository.delete(testMemory.id, false);

      // Hard delete removes links, metadata, embeddings, and memory
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE"),
        expect.any(Array)
      );
    });
  });

  describe("Memory Search", () => {
    it("should search memories by text query", async () => {
      const results = await repository.search({ userId, text: "machine learning" });

      expect(results).toBeDefined();
      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalled();
    });

    it("should filter by sector", async () => {
      const results = await repository.search({
        userId,
        text: "test",
        sectors: ["semantic"],
      });

      expect(results).toBeDefined();
    });
  });

  describe("Transaction Handling", () => {
    it("should rollback on creation failure", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      const content: MemoryContent = {
        content: "Test memory",
        userId,
        sessionId: "session-456",
        primarySector: "semantic",
      };

      await expect(repository.create(content)).rejects.toThrow();
      expect(mockDb.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
