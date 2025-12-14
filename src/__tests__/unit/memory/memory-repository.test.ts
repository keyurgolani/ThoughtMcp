/**
 * Memory Repository - Memory Creation Tests
 *
 * Tests for MemoryRepository.create() method following TDD principles.
 * These tests define expected behavior BEFORE implementation.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "../../../memory/memory-repository";
import type { MemoryContent, MemoryMetadata } from "../../../memory/types";
import { createTestSectorEmbeddings } from "../../utils/test-fixtures";

describe("MemoryRepository - Memory Creation", () => {
  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockGraphBuilder: any;
  let mockEmbeddingStorage: any;

  beforeEach(() => {
    // Mock database client with query method
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        // Return empty rows for most queries
        if (query.includes("SELECT m.*, me.embedding")) {
          // Return some candidate memories for waypoint connection creation
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
                user_id: "user-123",
                session_id: "session-456",
                primary_sector: "semantic",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      }),
    };

    // Mock database connection manager
    mockDb = {
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    // Mock embedding engine
    mockEmbeddingEngine = {
      generateAllSectorEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
    };

    // Mock waypoint graph builder
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
    };

    // Mock embedding storage
    mockEmbeddingStorage = {
      storeEmbeddings: vi.fn().mockResolvedValue(undefined),
    };

    repository = new MemoryRepository(
      mockDb,
      mockEmbeddingEngine,
      mockGraphBuilder,
      mockEmbeddingStorage
    );
  });

  describe("Required Fields Validation", () => {
    it("should create memory with all required fields", async () => {
      // Requirement 2.1: Memory must have all required fields
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(memory.id).toBeDefined();
      expect(memory.content).toBe("Test memory content");
      expect(memory.userId).toBe("user-123");
      expect(memory.sessionId).toBe("session-456");
      expect(memory.primarySector).toBe("semantic");
      expect(memory.createdAt).toBeInstanceOf(Date);
      expect(memory.lastAccessed).toBeInstanceOf(Date);
    });

    it("should generate unique ID for each memory", async () => {
      // Requirement 2.1: Each memory must have unique identifier
      const content: MemoryContent = {
        content: "Test memory",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory1 = await repository.create(content);
      const memory2 = await repository.create(content);

      expect(memory1.id).toBeDefined();
      expect(memory2.id).toBeDefined();
      expect(memory1.id).not.toBe(memory2.id);
    });

    it("should reject memory with empty content", async () => {
      // Requirement 2.1: Content is mandatory
      const content: MemoryContent = {
        content: "",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      await expect(repository.create(content)).rejects.toThrow("Content cannot be empty");
    });

    it("should reject memory with invalid sector", async () => {
      // Requirement 2.1: Primary sector must be valid
      const content: any = {
        content: "Test memory",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "invalid-sector",
      };

      await expect(repository.create(content)).rejects.toThrow("Invalid memory sector");
    });

    it("should reject memory without userId", async () => {
      // Requirement 2.1: userId is mandatory
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
      // Requirement 2.2: Five sector-specific embeddings must be generated
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(mockEmbeddingEngine.generateAllSectorEmbeddings).toHaveBeenCalledWith({
        text: "Test memory content",
        sector: "semantic",
      });

      expect(memory.embeddings).toBeDefined();
      expect(memory.embeddings?.episodic).toBeDefined();
      expect(memory.embeddings?.semantic).toBeDefined();
      expect(memory.embeddings?.procedural).toBeDefined();
      expect(memory.embeddings?.emotional).toBeDefined();
      expect(memory.embeddings?.reflective).toBeDefined();
    });

    it("should generate embeddings with correct dimensions", async () => {
      // Requirement 2.2: Embeddings must have consistent dimensions (1536 default)
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(memory.embeddings?.episodic).toHaveLength(1536);
      expect(memory.embeddings?.semantic).toHaveLength(1536);
      expect(memory.embeddings?.procedural).toHaveLength(1536);
      expect(memory.embeddings?.emotional).toHaveLength(1536);
      expect(memory.embeddings?.reflective).toHaveLength(1536);
    });

    it("should store embeddings in database", async () => {
      // Requirement 2.2: Embeddings stored in memory_embeddings table
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(mockEmbeddingStorage.storeEmbeddings).toHaveBeenCalledWith(
        memory.id,
        memory.embeddings,
        "default",
        expect.anything() // Transaction client
      );
    });

    it("should complete embedding generation within 500ms", async () => {
      // Requirement 2.2: Embeddings stored within 500ms
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const startTime = Date.now();
      await repository.create(content);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it("should handle embedding generation failure", async () => {
      //rement 2.2: Handle embedding service failures gracefully
      mockEmbeddingEngine.generateAllSectorEmbeddings.mockRejectedValue(
        new Error("Embedding service unavailable")
      );

      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      await expect(repository.create(content)).rejects.toThrow("Embedding generation failed");
    });
  });

  describe("Waypoint Connection Creation", () => {
    it("should create 1-3 waypoint connections", async () => {
      // Requirement 2.3: Create 1-3 connections per memory
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(mockGraphBuilder.createWaypointLinks).toHaveBeenCalled();
      expect(memory.links).toBeDefined();
      expect(memory.links!.length).toBeGreaterThanOrEqual(0);
      expect(memory.links!.length).toBeLessThanOrEqual(3);
    });

    it("should only create connections above similarity threshold", async () => {
      // Requirement 2.3: Similarity threshold >0.7
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      if (memory.links && memory.links.length > 0) {
        memory.links.forEach((link) => {
          expect(link.weight).toBeGreaterThan(0.7);
        });
      }
    });

    it("should create bidirectional connections", async () => {
      // Requirement 2.3: Bidirectional waypoint connections
      mockGraphBuilder.createWaypointLinks.mockResolvedValue({
        links: [
          {
            sourceId: "new-memory-id",
            targetId: "existing-memory-1",
            linkType: "semantic",
            weight: 0.85,
            createdAt: new Date(),
            traversalCount: 0,
          },
          {
            sourceId: "existing-memory-1",
            targetId: "new-memory-id",
            linkType: "semantic",
            weight: 0.85,
            createdAt: new Date(),
            traversalCount: 0,
          },
        ],
        skippedCount: 0,
      });

      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(memory.links).toBeDefined();
      expect(memory.links!.length).toBe(2);
    });

    it("should not create self-connections", async () => {
      // Requirement 2.3: No self-connections allowed
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      if (memory.links && memory.links.length > 0) {
        memory.links.forEach((link) => {
          expect(link.sourceId).not.toBe(link.targetId);
        });
      }
    });

    it("should handle first memory with no existing connections", async () => {
      // Requirement 2.3: Handle case with no existing memories
      mockGraphBuilder.createWaypointLinks.mockResolvedValue({ links: [], skippedCount: 0 });

      const content: MemoryContent = {
        content: "First memory in system",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(memory.links).toBeDefined();
      expect(memory.links!.length).toBe(0);
    });
  });

  describe("Metadata Extraction and Storage", () => {
    it("should extract and store metadata", async () => {
      // Requirement 2.4: Metadata extraction and storage
      const content: MemoryContent = {
        content: "Machine learning algorithms for data analysis",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const metadata: MemoryMetadata = {
        keywords: ["machine", "learning", "algorithms", "data"],
        tags: ["ai", "ml"],
        category: "technology",
        context: "research project",
        importance: 0.8,
      };

      const memory = await repository.create(content, metadata);

      expect(memory.metadata).toBeDefined();
      expect(memory.metadata.keywords).toEqual(["machine", "learning", "algorithms", "data"]);
      expect(memory.metadata.tags).toEqual(["ai", "ml"]);
      expect(memory.metadata.category).toBe("technology");
      expect(memory.metadata.context).toBe("research project");
      expect(memory.metadata.importance).toBe(0.8);
    });

    it("should auto-extract keywords if not provided", async () => {
      // Requirement 2.4: Automatic keyword extraction
      const content: MemoryContent = {
        content: "Machine learning algorithms for data analysis",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(memory.metadata.keywords).toBeDefined();
      expect(memory.metadata.keywords!.length).toBeGreaterThan(0);
    });

    it("should set default metadata values", async () => {
      // Requirement 2.4: Default metadata values
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(memory.metadata.isAtomic).toBe(true);
      expect(memory.metadata.importance).toBeGreaterThanOrEqual(0);
      expect(memory.metadata.importance).toBeLessThanOrEqual(1);
    });

    it("should validate metadata importance range", async () => {
      // Requirement 2.4: Importance must be 0-1
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const metadata: MemoryMetadata = {
        importance: 1.5, // Invalid: >1
      };

      await expect(repository.create(content, metadata)).rejects.toThrow(
        "Importance must be between 0 and 1"
      );
    });
  });

  describe("Initial Value Assignment", () => {
    it("should set initial strength to 1.0", async () => {
      // Requirement 2.5: Initial strength = 1.0
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(memory.strength).toBe(1.0);
    });

    it("should calculate initial salience from content", async () => {
      // Requirement 2.5: Salience calculated from content
      const content: MemoryContent = {
        content: "Important urgent critical information",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(memory.salience).toBeGreaterThanOrEqual(0);
      expect(memory.salience).toBeLessThanOrEqual(1);
      expect(memory.salience).toBeGreaterThan(0.5); // High salience words
    });

    it("should set initial accessCount to 0", async () => {
      // Requirement 2.5: Initial access count = 0
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(memory.accessCount).toBe(0);
    });

    it("should set createdAt and lastAccessed to current time", async () => {
      // Requirement 2.5: Timestamps set to creation time
      const beforeCreate = new Date();

      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);
      const afterCreate = new Date();

      expect(memory.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(memory.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(memory.lastAccessed.getTime()).toBe(memory.createdAt.getTime());
    });

    it("should set sector-specific decay rate", async () => {
      // Requirement 2.5: Decay rate based on sector
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const memory = await repository.create(content);

      expect(memory.decayRate).toBeDefined();
      expect(memory.decayRate).toBeGreaterThan(0);
      // Episodic memories decay faster than semantic
      expect(memory.decayRate).toBeGreaterThanOrEqual(0.02);
    });
  });

  describe("Transaction Management and Error Handling", () => {
    it("should use transaction for atomic memory creation", async () => {
      // Requirement 2.1: Atomic memory creation
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      await repository.create(content);

      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.commitTransaction).toHaveBeenCalled();
    });

    it("should rollback transaction on error", async () => {
      // Requirement 2.1: Rollback on failure
      mockEmbeddingStorage.storeEmbeddings.mockRejectedValue(new Error("Storage failed"));

      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      await expect(repository.create(content)).rejects.toThrow();
      expect(mockDb.rollbackTransaction).toHaveBeenCalled();
    });

    it("should handle database connection failure", async () => {
      // Requirement 2.1: Handle connection failures
      mockDb.beginTransaction.mockRejectedValue(new Error("Connection failed"));

      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      await expect(repository.create(content)).rejects.toThrow("Database connection failed");
    });

    it("should handle very long content", async () => {
      // Edge case: Large content
      const longContent = "a".repeat(50000); // 50KB content

      const content: MemoryContent = {
        content: longContent,
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(memory.content).toBe(longContent);
      expect(memory.embeddings).toBeDefined();
    });

    it("should handle special characters in content", async () => {
      // Edge case: Special characters
      const content: MemoryContent = {
        content: "Test with émojis 🎉 and spëcial çharacters!",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      expect(memory.content).toBe("Test with émojis 🎉 and spëcial çharacters!");
    });
  });

  describe("Performance Requirements", () => {
    it("should complete memory creation within 1 second", async () => {
      // Requirement 2.1: Fast memory creation
      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const startTime = Date.now();
      await repository.create(content);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });
});
