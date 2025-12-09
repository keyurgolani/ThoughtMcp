/**
 * Memory Repository - Memory Update Tests
 *
 * Tests for MemoryRepository.update() method following TDD principles.
 * These tests define expected behavior BEFORE implementation.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "../../../memory/memory-repository";
import type { Memory } from "../../../memory/types";
import { createTestSectorEmbeddings } from "../../utils/test-fixtures";

describe("MemoryRepository - Memory Updates", () => {
  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockGraphBuilder: any;
  let mockEmbeddingStorage: any;

  // Test memory for updates
  const testMemory: Memory = {
    id: "test-memory-1",
    content: "Original content about machine learning",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    lastAccessed: new Date("2024-01-01T00:00:00Z"),
    accessCount: 5,
    salience: 0.7,
    decayRate: 0.01,
    strength: 0.85,
    userId: "user-123",
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
    // Mock database client with query method
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        // Return test memory for SELECT queries
        if (query.includes("SELECT") && query.includes("memories")) {
          return Promise.resolve({
            rows: [
              {
                id: testMemory.id,
                content: testMemory.content,
                created_at: testMemory.createdAt,
                last_accessed: testMemory.lastAccessed,
                access_count: testMemory.accessCount,
                salience: testMemory.salience,
                decay_rate: testMemory.decayRate,
                strength: testMemory.strength,
                user_id: testMemory.userId,
                session_id: testMemory.sessionId,
                primary_sector: testMemory.primarySector,
                keywords: testMemory.metadata.keywords,
                tags: testMemory.metadata.tags,
                category: testMemory.metadata.category,
                context: testMemory.metadata.context,
                importance: testMemory.metadata.importance,
                is_atomic: testMemory.metadata.isAtomic,
              },
            ],
          });
        }
        // Return success for UPDATE queries
        if (query.includes("UPDATE")) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      }),
    };

    // Mock database connection manager
    mockDb = {
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
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
            sourceId: testMemory.id,
            targetId: "related-memory-1",
            linkType: "semantic",
            weight: 0.82,
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

  describe("Content Update and Embedding Regeneration", () => {
    it("should update memory content successfully", async () => {
      // Requirement 2.1: Update memory content
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content about deep learning",
      };

      const result = await repository.update(updates);

      expect(result.memory.content).toBe("Updated content about deep learning");
      expect(result.memory.id).toBe(testMemory.id);
      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.commitTransaction).toHaveBeenCalled();
    });

    it("should regenerate all five sector embeddings when content changes", async () => {
      // Requirement 2.2: Regenerate embeddings on content change
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content about deep learning",
      };

      const result = await repository.update(updates);

      expect(mockEmbeddingEngine.generateAllSectorEmbeddings).toHaveBeenCalledWith({
        text: "Updated content about deep learning",
        sector: testMemory.primarySector,
      });

      expect(result.embeddingsRegenerated).toBe(true);
      expect(result.memory.embeddings).toBeDefined();
      expect(result.memory.embeddings?.episodic).toHaveLength(1536);
      expect(result.memory.embeddings?.semantic).toHaveLength(1536);
      expect(result.memory.embeddings?.procedural).toHaveLength(1536);
      expect(result.memory.embeddings?.emotional).toHaveLength(1536);
      expect(result.memory.embeddings?.reflective).toHaveLength(1536);
    });

    it("should store updated embeddings in database", async () => {
      // Requirement 2.2: Store regenerated embeddings
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
      };

      await repository.update(updates);

      expect(mockEmbeddingStorage.storeEmbeddings).toHaveBeenCalledWith(
        testMemory.id,
        expect.any(Object),
        "default"
      );
    });

    it("should preserve memory ID and createdAt timestamp", async () => {
      // Requirement 2.1: Preserve immutable fields
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
      };

      const result = await repository.update(updates);

      expect(result.memory.id).toBe(testMemory.id);
      expect(result.memory.createdAt).toEqual(testMemory.createdAt);
      expect(result.memory.userId).toBe(testMemory.userId);
    });

    it("should update lastAccessed timestamp", async () => {
      // Requirement 2.1: Update access timestamp
      const beforeUpdate = new Date();

      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
      };

      const result = await repository.update(updates);
      const afterUpdate = new Date();

      expect(result.memory.lastAccessed.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(result.memory.lastAccessed.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
      expect(result.memory.lastAccessed.getTime()).toBeGreaterThan(
        testMemory.lastAccessed.getTime()
      );
    });

    it("should reject empty content", async () => {
      // Requirement 2.1: Content validation
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "",
      };

      await expect(repository.update(updates)).rejects.toThrow("Content cannot be empty");
    });

    it("should handle very long content", async () => {
      // Edge case: Large content update
      const longContent = "a".repeat(50000); // 50KB

      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: longContent,
      };

      const result = await repository.update(updates);

      expect(result.memory.content).toBe(longContent);
      expect(result.embeddingsRegenerated).toBe(true);
    });

    it("should handle special characters and emojis", async () => {
      // Edge case: Special characters
      const specialContent = "Updated with émojis 🎉 and spëcial çharacters!";

      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: specialContent,
      };

      const result = await repository.update(updates);

      expect(result.memory.content).toBe(specialContent);
    });

    it("should complete content update within 500ms", async () => {
      // Requirement 2.2: Performance target with embedding regeneration
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
      };

      const startTime = Date.now();
      const result = await repository.update(updates);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
      expect(result.processingTime).toBeLessThan(500);
    });
  });

  describe("Strength, Salience, and Importance Updates", () => {
    it("should update strength value", async () => {
      // Requirement 2.5: Update strength
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        strength: 0.95,
      };

      const result = await repository.update(updates);

      expect(result.memory.strength).toBe(0.95);
      expect(result.embeddingsRegenerated).toBe(false); // No content change
    });

    it("should update salience value", async () => {
      // Requirement 2.5: Update salience
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        salience: 0.9,
      };

      const result = await repository.update(updates);

      expect(result.memory.salience).toBe(0.9);
      expect(result.embeddingsRegenerated).toBe(false);
    });

    it("should update importance value", async () => {
      // Requirement 2.4: Update metadata importance
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          importance: 0.95,
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.metadata.importance).toBe(0.95);
      expect(result.embeddingsRegenerated).toBe(false);
    });

    it("should update multiple values simultaneously", async () => {
      // Requirement 2.5: Combined updates
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        strength: 0.92,
        salience: 0.88,
        metadata: {
          importance: 0.9,
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.strength).toBe(0.92);
      expect(result.memory.salience).toBe(0.88);
      expect(result.memory.metadata.importance).toBe(0.9);
    });

    it("should reject strength < 0", async () => {
      // Requirement 2.5: Validation
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        strength: -0.1,
      };

      await expect(repository.update(updates)).rejects.toThrow("Strength must be between 0 and 1");
    });

    it("should reject strength > 1", async () => {
      // Requirement 2.5: Validation
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        strength: 1.5,
      };

      await expect(repository.update(updates)).rejects.toThrow("Strength must be between 0 and 1");
    });

    it("should reject salience < 0", async () => {
      // Requirement 2.5: Validation
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        salience: -0.1,
      };

      await expect(repository.update(updates)).rejects.toThrow("Salience must be between 0 and 1");
    });

    it("should reject salience > 1", async () => {
      // Requirement 2.5: Validation
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        salience: 1.5,
      };

      await expect(repository.update(updates)).rejects.toThrow("Salience must be between 0 and 1");
    });

    it("should reject importance < 0", async () => {
      // Requirement 2.4: Validation
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          importance: -0.1,
        },
      };

      await expect(repository.update(updates)).rejects.toThrow(
        "Importance must be between 0 and 1"
      );
    });

    it("should reject importance > 1", async () => {
      // Requirement 2.4: Validation
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          importance: 1.5,
        },
      };

      await expect(repository.update(updates)).rejects.toThrow(
        "Importance must be between 0 and 1"
      );
    });

    it("should preserve other fields when updating specific values", async () => {
      // Requirement 2.1: Selective updates
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        strength: 0.9,
      };

      const result = await repository.update(updates);

      expect(result.memory.strength).toBe(0.9);
      expect(result.memory.content).toBe(testMemory.content);
      expect(result.memory.salience).toBe(testMemory.salience);
      expect(result.memory.metadata.keywords).toEqual(testMemory.metadata.keywords);
    });

    it("should complete simple update within 50ms", async () => {
      // Requirement 2.5: Performance for simple updates
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        strength: 0.9,
      };

      const startTime = Date.now();
      const result = await repository.update(updates);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
      expect(result.processingTime).toBeLessThan(50);
    });
  });

  describe("Metadata Updates", () => {
    it("should update keywords array", async () => {
      // Requirement 2.4: Metadata updates
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          keywords: ["deep", "learning", "neural", "networks"],
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.metadata.keywords).toEqual(["deep", "learning", "neural", "networks"]);
    });

    it("should update tags array", async () => {
      // Requirement 2.4: Metadata updates
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          tags: ["deep-learning", "neural-nets", "ai"],
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.metadata.tags).toEqual(["deep-learning", "neural-nets", "ai"]);
    });

    it("should update category string", async () => {
      // Requirement 2.4: Metadata updates
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          category: "research",
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.metadata.category).toBe("research");
    });

    it("should update context string", async () => {
      // Requirement 2.4: Metadata updates
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          context: "PhD dissertation work",
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.metadata.context).toBe("PhD dissertation work");
    });

    it("should update multiple metadata fields simultaneously", async () => {
      // Requirement 2.4: Combined metadata updates
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          keywords: ["new", "keywords"],
          tags: ["new-tag"],
          category: "new-category",
          context: "new context",
          importance: 0.95,
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.metadata.keywords).toEqual(["new", "keywords"]);
      expect(result.memory.metadata.tags).toEqual(["new-tag"]);
      expect(result.memory.metadata.category).toBe("new-category");
      expect(result.memory.metadata.context).toBe("new context");
      expect(result.memory.metadata.importance).toBe(0.95);
    });

    it("should add new keywords to existing array", async () => {
      // Requirement 2.4: Array manipulation
      const existingKeywords = testMemory.metadata.keywords ?? [];
      const newKeywords = [...existingKeywords, "additional", "keyword"];

      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          keywords: newKeywords,
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.metadata.keywords).toContain("additional");
      expect(result.memory.metadata.keywords).toContain("keyword");
      expect(result.memory.metadata.keywords!.length).toBeGreaterThan(existingKeywords.length);
    });

    it("should remove keywords from array", async () => {
      // Requirement 2.4: Array manipulation
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          keywords: ["machine"], // Remove "learning" and "original"
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.metadata.keywords).toEqual(["machine"]);
      expect(result.memory.metadata.keywords).not.toContain("learning");
    });

    it("should preserve other metadata fields when updating specific fields", async () => {
      // Requirement 2.4: Selective metadata updates
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          category: "updated-category",
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.metadata.category).toBe("updated-category");
      expect(result.memory.metadata.keywords).toEqual(testMemory.metadata.keywords);
      expect(result.memory.metadata.tags).toEqual(testMemory.metadata.tags);
      expect(result.memory.metadata.importance).toBe(testMemory.metadata.importance);
    });

    it("should complete metadata update within 50ms", async () => {
      // Requirement 2.4: Performance
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          category: "updated",
        },
      };

      const startTime = Date.now();
      const result = await repository.update(updates);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
      expect(result.processingTime).toBeLessThan(50);
    });
  });

  describe("Waypoint Connection Updates", () => {
    it("should recalculate waypoint connections when content changes significantly", async () => {
      // Requirement 2.3: Update connections on content change
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Completely different content about quantum computing",
      };

      const result = await repository.update(updates);

      expect(mockGraphBuilder.createWaypointLinks).toHaveBeenCalled();
      expect(result.connectionsUpdated).toBe(true);
    });

    it("should maintain 1-3 connection limit after update", async () => {
      // Requirement 2.3: Connection limit
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
      };

      const result = await repository.update(updates);

      if (result.memory.links) {
        expect(result.memory.links.length).toBeGreaterThanOrEqual(0);
        expect(result.memory.links.length).toBeLessThanOrEqual(3);
      }
    });

    it("should preserve bidirectional connections", async () => {
      // Requirement 2.3: Bidirectional consistency
      mockGraphBuilder.createWaypointLinks.mockResolvedValue({
        links: [
          {
            sourceId: testMemory.id,
            targetId: "related-memory-1",
            linkType: "semantic",
            weight: 0.82,
            createdAt: new Date(),
            traversalCount: 0,
          },
          {
            sourceId: "related-memory-1",
            targetId: testMemory.id,
            linkType: "semantic",
            weight: 0.82,
            createdAt: new Date(),
            traversalCount: 0,
          },
        ],
        skippedCount: 0,
      });

      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
      };

      const result = await repository.update(updates);

      if (result.memory.links && result.memory.links.length > 1) {
        const forward = result.memory.links.find(
          (l: any) => l.sourceId === testMemory.id && l.targetId === "related-memory-1"
        );
        const backward = result.memory.links.find(
          (l: any) => l.sourceId === "related-memory-1" && l.targetId === testMemory.id
        );

        expect(forward).toBeDefined();
        expect(backward).toBeDefined();
        expect(forward?.weight).toBe(backward?.weight);
      }
    });

    it("should prevent self-connections", async () => {
      // Requirement 2.3: No self-connections
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
      };

      const result = await repository.update(updates);

      if (result.memory.links) {
        result.memory.links.forEach((link: any) => {
          expect(link.sourceId).not.toBe(link.targetId);
        });
      }
    });

    it("should not update connections when only strength/salience changes", async () => {
      // Requirement 2.3: Connections only updated when needed
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        strength: 0.9,
        salience: 0.8,
      };

      const result = await repository.update(updates);

      expect(mockGraphBuilder.createWaypointLinks).not.toHaveBeenCalled();
      expect(result.connectionsUpdated).toBe(false);
    });

    it("should not update connections when only metadata changes", async () => {
      // Requirement 2.3: Connections only updated when needed
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          category: "updated",
        },
      };

      const result = await repository.update(updates);

      expect(mockGraphBuilder.createWaypointLinks).not.toHaveBeenCalled();
      expect(result.connectionsUpdated).toBe(false);
    });

    it("should complete connection update within 200ms", async () => {
      // Requirement 2.3: Performance with connection recalculation
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content requiring connection recalculation",
      };

      const startTime = Date.now();
      const result = await repository.update(updates);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
      expect(result.processingTime).toBeLessThan(200);
    });
  });

  describe("Combined Updates", () => {
    it("should update content and metadata together", async () => {
      // Requirement 2.1, 2.2, 2.4: Combined updates
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content about deep learning",
        metadata: {
          keywords: ["deep", "learning"],
          category: "research",
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.content).toBe("Updated content about deep learning");
      expect(result.memory.metadata.keywords).toEqual(["deep", "learning"]);
      expect(result.memory.metadata.category).toBe("research");
      expect(result.embeddingsRegenerated).toBe(true);
    });

    it("should update content, strength, and salience together", async () => {
      // Requirement 2.1, 2.2, 2.5: Combined updates
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
        strength: 0.95,
        salience: 0.9,
      };

      const result = await repository.update(updates);

      expect(result.memory.content).toBe("Updated content");
      expect(result.memory.strength).toBe(0.95);
      expect(result.memory.salience).toBe(0.9);
      expect(result.embeddingsRegenerated).toBe(true);
    });

    it("should update metadata and waypoint connections together", async () => {
      // Requirement 2.3, 2.4: Combined updates
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Significantly different content",
        metadata: {
          category: "updated",
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.metadata.category).toBe("updated");
      expect(result.connectionsUpdated).toBe(true);
    });

    it("should update all fields simultaneously", async () => {
      // Requirement 2.1, 2.2, 2.3, 2.4, 2.5: Full update
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Completely new content",
        strength: 0.98,
        salience: 0.95,
        metadata: {
          keywords: ["new", "keywords"],
          tags: ["new-tags"],
          category: "new-category",
          context: "new context",
          importance: 0.9,
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.content).toBe("Completely new content");
      expect(result.memory.strength).toBe(0.98);
      expect(result.memory.salience).toBe(0.95);
      expect(result.memory.metadata.keywords).toEqual(["new", "keywords"]);
      expect(result.memory.metadata.tags).toEqual(["new-tags"]);
      expect(result.memory.metadata.category).toBe("new-category");
      expect(result.embeddingsRegenerated).toBe(true);
      expect(result.connectionsUpdated).toBe(true);
    });

    it("should ensure atomic transaction for all updates", async () => {
      // Requirement 2.1: Atomic updates
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
        strength: 0.9,
        metadata: {
          category: "updated",
        },
      };

      await repository.update(updates);

      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.commitTransaction).toHaveBeenCalled();
    });

    it("should rollback transaction on partial failure", async () => {
      // Requirement 2.1: Rollback on error
      mockEmbeddingStorage.storeEmbeddings.mockRejectedValue(new Error("Storage failed"));

      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
      };

      await expect(repository.update(updates)).rejects.toThrow();
      expect(mockDb.rollbackTransaction).toHaveBeenCalled();
    });

    it("should complete full update within 1 second", async () => {
      // Requirement 2.1: Performance for full update
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
        strength: 0.9,
        salience: 0.85,
        metadata: {
          keywords: ["new"],
          category: "updated",
        },
      };

      const startTime = Date.now();
      const result = await repository.update(updates);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
      expect(result.processingTime).toBeLessThan(1000);
    });
  });

  describe("Validation and Error Handling", () => {
    it("should reject update to non-existent memory", async () => {
      // Requirement 2.1: Validation
      mockDb.getConnection.mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [] }), // No memory found
      });

      const updates = {
        memoryId: "non-existent-id",
        userId: testMemory.userId,
        content: "Updated content",
      };

      await expect(repository.update(updates)).rejects.toThrow("Memory not found");
    });

    it("should reject update without memory ID", async () => {
      // Requirement 2.1: Validation
      const updates: any = {
        userId: testMemory.userId,
        content: "Updated content",
      };

      await expect(repository.update(updates)).rejects.toThrow("memoryId is required");
    });

    it("should reject update with invalid userId", async () => {
      // Requirement 2.1: Security validation
      const updates = {
        memoryId: testMemory.id,
        userId: "different-user-456", // Wrong user
        content: "Updated content",
      };

      await expect(repository.update(updates)).rejects.toThrow("Memory does not belong to user");
    });

    it("should reject update without userId", async () => {
      // Requirement 2.1: Security validation
      const updates: any = {
        memoryId: testMemory.id,
        content: "Updated content",
      };

      await expect(repository.update(updates)).rejects.toThrow("userId is required");
    });

    it("should reject update with no fields to update", async () => {
      // Edge case: Empty update
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
      };

      await expect(repository.update(updates)).rejects.toThrow("No fields to update");
    });

    it("should handle database connection failure", async () => {
      // Requirement 2.1: Error handling
      mockDb.beginTransaction.mockRejectedValue(new Error("Connection failed"));

      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
      };

      await expect(repository.update(updates)).rejects.toThrow("Database connection failed");
    });

    it("should handle embedding generation failure", async () => {
      // Requirement 2.2: Error handling
      mockEmbeddingEngine.generateAllSectorEmbeddings.mockRejectedValue(
        new Error("Embedding service unavailable")
      );

      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
      };

      await expect(repository.update(updates)).rejects.toThrow("Embedding generation failed");
      expect(mockDb.rollbackTransaction).toHaveBeenCalled();
    });

    it("should handle transaction failure", async () => {
      // Requirement 2.1: Error handling
      mockDb.commitTransaction.mockRejectedValue(new Error("Transaction commit failed"));

      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        strength: 0.9,
      };

      await expect(repository.update(updates)).rejects.toThrow();
      expect(mockDb.rollbackTransaction).toHaveBeenCalled();
    });

    it("should provide clear error messages", async () => {
      // Requirement 2.1: User-friendly errors
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        strength: 1.5,
      };

      try {
        await repository.update(updates);
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.message).toContain("Strength must be between 0 and 1");
        expect(error.name).toBe("MemoryValidationError");
      }
    });

    it("should not persist partial updates on error", async () => {
      // Requirement 2.1: Transaction integrity
      mockEmbeddingStorage.storeEmbeddings.mockRejectedValue(new Error("Storage failed"));

      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Updated content",
        strength: 0.9,
      };

      await expect(repository.update(updates)).rejects.toThrow();

      // Verify rollback was called
      expect(mockDb.rollbackTransaction).toHaveBeenCalled();
      // Verify commit was not called
      expect(mockDb.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe("Performance Requirements", () => {
    it("should handle concurrent updates correctly", async () => {
      // Requirement 2.5: Concurrency
      const updates1 = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        strength: 0.9,
      };

      const updates2 = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        salience: 0.85,
      };

      // Execute concurrent updates
      const [result1, result2] = await Promise.all([
        repository.update(updates1),
        repository.update(updates2),
      ]);

      // Both should complete successfully
      expect(result1.memory).toBeDefined();
      expect(result2.memory).toBeDefined();
    });

    it("should track processing time in result", async () => {
      // Requirement 2.5: Performance monitoring
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        strength: 0.9,
      };

      const result = await repository.update(updates);

      expect(result.processingTime).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThan(1000);
    });

    it("should handle updates to memories with large content efficiently", async () => {
      // Performance: Large content
      const largeContent = "a".repeat(100000); // 100KB

      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: largeContent,
      };

      const startTime = Date.now();
      const result = await repository.update(updates);
      const duration = Date.now() - startTime;

      expect(result.memory.content).toBe(largeContent);
      expect(duration).toBeLessThan(1000); // Should still be fast
    });
  });

  describe("Edge Cases", () => {
    it("should handle update with whitespace-only content", async () => {
      // Edge case: Whitespace content
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "   \n\t  ",
      };

      await expect(repository.update(updates)).rejects.toThrow("Content cannot be empty");
    });

    it("should handle update with null metadata fields", async () => {
      // Edge case: Null values
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          category: null as any,
          context: null as any,
        },
      };

      const result = await repository.update(updates);

      // Should handle null gracefully (convert to empty string or reject)
      expect(result.memory.metadata).toBeDefined();
    });

    it("should handle update with empty arrays", async () => {
      // Edge case: Empty arrays
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          keywords: [],
          tags: [],
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.metadata.keywords).toEqual([]);
      expect(result.memory.metadata.tags).toEqual([]);
    });

    it("should handle update with very long keyword arrays", async () => {
      // Edge case: Large arrays
      const manyKeywords = Array(1000)
        .fill(null)
        .map((_, i) => `keyword${i}`);

      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        metadata: {
          keywords: manyKeywords,
        },
      };

      const result = await repository.update(updates);

      expect(result.memory.metadata.keywords).toHaveLength(1000);
    });

    it("should handle update with boundary strength values", async () => {
      // Edge case: Boundary values
      const updates1 = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        strength: 0.0,
      };

      const result1 = await repository.update(updates1);
      expect(result1.memory.strength).toBe(0.0);

      const updates2 = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        strength: 1.0,
      };

      const result2 = await repository.update(updates2);
      expect(result2.memory.strength).toBe(1.0);
    });

    it("should handle update with boundary salience values", async () => {
      // Edge case: Boundary values
      const updates1 = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        salience: 0.0,
      };

      const result1 = await repository.update(updates1);
      expect(result1.memory.salience).toBe(0.0);

      const updates2 = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        salience: 1.0,
      };

      const result2 = await repository.update(updates2);
      expect(result2.memory.salience).toBe(1.0);
    });

    it("should handle update with Unicode characters", async () => {
      // Edge case: Unicode
      const updates = {
        memoryId: testMemory.id,
        userId: testMemory.userId,
        content: "Content with 中文, العربية, עברית, and 🎉🚀✨",
      };

      const result = await repository.update(updates);

      expect(result.memory.content).toBe("Content with 中文, العربية, עברית, and 🎉🚀✨");
    });

    it("should handle rapid successive updates", async () => {
      // Edge case: Rapid updates
      const updates = [
        { memoryId: testMemory.id, userId: testMemory.userId, strength: 0.8 },
        { memoryId: testMemory.id, userId: testMemory.userId, strength: 0.85 },
        { memoryId: testMemory.id, userId: testMemory.userId, strength: 0.9 },
      ];

      const results = await Promise.all(updates.map((u) => repository.update(u)));

      expect(results).toHaveLength(3);
      results.forEach((result: any) => {
        expect(result.memory).toBeDefined();
      });
    });
  });
});
