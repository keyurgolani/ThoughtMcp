/**
 * Memory Repository - Single Memory Retrieval Tests
 *
 * Tests for MemoryRepository.retrieve() method following TDD principles.
 * Tests the single memory retrieval by ID (not search).
 *
 * Requirements: 2.2, 2.3, 2.4, 2.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "../../../memory/memory-repository";

describe("MemoryRepository - Single Memory Retrieval", () => {
  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockGraphBuilder: any;
  let mockEmbeddingStorage: any;

  const userId = "user-123";
  const memoryId = "mem-123";

  beforeEach(() => {
    // Mock database client
    const mockClient = {
      query: vi.fn().mockImplementation((query: string, params: any[]) => {
        if (query.includes("SELECT") && query.includes("memories m")) {
          // Return memory with metadata
          return Promise.resolve({
            rows: [
              {
                id: params[0],
                content: "Test memory content",
                created_at: new Date(),
                last_accessed: new Date(),
                access_count: 5,
                salience: 0.8,
                decay_rate: 0.01,
                strength: 0.9,
                user_id: params[1],
                session_id: "session-123",
                primary_sector: "semantic",
                keywords: ["test", "memory"],
                tags: ["test"],
                category: "general",
                context: "test context",
                importance: 0.7,
                is_atomic: true,
                parent_id: null,
              },
            ],
          });
        }
        if (query.includes("memory_links")) {
          // Return waypoint links
          return Promise.resolve({
            rows: [
              {
                source_id: memoryId,
                target_id: "mem-456",
                link_type: "semantic",
                weight: 0.85,
                created_at: new Date(),
                traversal_count: 3,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      }),
    };

    // Mock database connection manager
    mockDb = {
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
    };

    // Mock embedding engine
    mockEmbeddingEngine = {
      generateSemanticEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    };

    // Mock waypoint graph builder
    mockGraphBuilder = {
      calculateLinkWeight: vi.fn().mockResolvedValue(0.5),
    };

    // Mock embedding storage
    mockEmbeddingStorage = {
      retrieveEmbeddings: vi.fn().mockResolvedValue({
        episodic: new Array(1536).fill(0.1),
        semantic: new Array(1536).fill(0.2),
        procedural: new Array(1536).fill(0.3),
        emotional: new Array(1536).fill(0.4),
        reflective: new Array(1536).fill(0.5),
      }),
    };

    repository = new MemoryRepository(
      mockDb,
      mockEmbeddingEngine,
      mockGraphBuilder,
      mockEmbeddingStorage
    );
  });

  describe("Basic Retrieval", () => {
    it("should retrieve memory by ID", async () => {
      const memory = await repository.retrieve(memoryId, userId);

      expect(memory).toBeDefined();
      expect(memory!.id).toBe(memoryId);
      expect(memory!.content).toBe("Test memory content");
      expect(memory!.userId).toBe(userId);
    });

    it("should return null for non-existent memory", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      const memory = await repository.retrieve("non-existent", userId);

      expect(memory).toBeNull();
    });

    it("should return null for memory belonging to different user", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      const memory = await repository.retrieve(memoryId, "different-user");

      expect(memory).toBeNull();
    });

    it("should include metadata in retrieved memory", async () => {
      const memory = await repository.retrieve(memoryId, userId);

      expect(memory!.metadata).toBeDefined();
      expect(memory!.metadata.keywords).toEqual(["test", "memory"]);
      expect(memory!.metadata.tags).toEqual(["test"]);
      expect(memory!.metadata.category).toBe("general");
      expect(memory!.metadata.importance).toBe(0.7);
    });
  });

  describe("Embedding Retrieval", () => {
    it("should retrieve embeddings for memory", async () => {
      const memory = await repository.retrieve(memoryId, userId);

      expect(memory!.embeddings).toBeDefined();
      expect(memory!.embeddings!.episodic).toBeDefined();
      expect(memory!.embeddings!.semantic).toBeDefined();
      expect(memory!.embeddings!.procedural).toBeDefined();
      expect(memory!.embeddings!.emotional).toBeDefined();
      expect(memory!.embeddings!.reflective).toBeDefined();
    });

    it("should handle missing embeddings gracefully", async () => {
      mockEmbeddingStorage.retrieveEmbeddings.mockRejectedValue(new Error("Embeddings not found"));

      const memory = await repository.retrieve(memoryId, userId);

      expect(memory).toBeDefined();
      expect(memory!.embeddings).toBeUndefined();
    });
  });

  describe("Waypoint Links Retrieval", () => {
    it("should retrieve waypoint links for memory", async () => {
      const memory = await repository.retrieve(memoryId, userId);

      expect(memory!.links).toBeDefined();
      expect(memory!.links!.length).toBeGreaterThan(0);
      expect(memory!.links![0].sourceId).toBe(memoryId);
      expect(memory!.links![0].targetId).toBe("mem-456");
      expect(memory!.links![0].weight).toBe(0.85);
    });

    it("should handle missing links gracefully", async () => {
      const mockClient = {
        query: vi.fn().mockImplementation((query: string) => {
          if (query.includes("memory_links")) {
            throw new Error("Links query failed");
          }
          return Promise.resolve({
            rows: [
              {
                id: memoryId,
                content: "Test",
                created_at: new Date(),
                last_accessed: new Date(),
                access_count: 0,
                salience: 0.5,
                decay_rate: 0.01,
                strength: 1.0,
                user_id: userId,
                session_id: "session-123",
                primary_sector: "semantic",
                keywords: [],
                tags: [],
                category: "",
                context: "",
                importance: 0.5,
                is_atomic: true,
                parent_id: null,
              },
            ],
          });
        }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      const memory = await repository.retrieve(memoryId, userId);

      expect(memory).toBeDefined();
      expect(memory!.links).toEqual([]);
    });
  });

  describe("Validation", () => {
    it("should validate memoryId", async () => {
      await expect(repository.retrieve("", userId)).rejects.toThrow("memoryId is required");
    });

    it("should validate userId", async () => {
      await expect(repository.retrieve(memoryId, "")).rejects.toThrow("userId is required");
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection failure", async () => {
      mockDb.getConnection.mockRejectedValue(new Error("Connection failed"));

      await expect(repository.retrieve(memoryId, userId)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle database query failure", async () => {
      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error("Query failed")),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await expect(repository.retrieve(memoryId, userId)).rejects.toThrow(
        "Memory retrieval failed"
      );
    });

    it("should release connection on success", async () => {
      await repository.retrieve(memoryId, userId);

      expect(mockDb.releaseConnection).toHaveBeenCalled();
    });

    it("should release connection on error", async () => {
      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error("Query failed")),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await expect(repository.retrieve(memoryId, userId)).rejects.toThrow();
      expect(mockDb.releaseConnection).toHaveBeenCalled();
    });
  });

  describe("Performance", () => {
    it("should retrieve memory in <50ms", async () => {
      const startTime = Date.now();
      await repository.retrieve(memoryId, userId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });
  });
});
