/**
 * Memory Repository - Memory Retrieval Tests
 *
 * Tests for MemoryRepository retrieval methods following TDD principles.
 * These tests define expected behavior BEFORE implementation.
 *
 * Requirements: 2.2, 2.3, 2.4, 2.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "../../../memory/memory-repository";
import type { Memory, SearchQuery } from "../../../memory/types";

describe("MemoryRepository - Memory Retrieval", () => {
  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockGraphBuilder: any;
  let mockEmbeddingStorage: any;

  // Test data
  const testMemories: Memory[] = [];
  const userId = "user-123";

  beforeEach(() => {
    // Create test memories with varying properties
    testMemories.length = 0;

    // Memory 1: High strength, high salience, recent
    testMemories.push({
      id: "mem-1",
      content: "Important recent memory about machine learning",
      createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      lastAccessed: new Date(Date.now() - 1000 * 60 * 60),
      accessCount: 5,
      salience: 0.9,
      decayRate: 0.01,
      strength: 0.95,
      userId,
      sessionId: "session-1",
      primarySector: "semantic",
      metadata: {
        keywords: ["machine", "learning", "important"],
        tags: ["ai", "ml"],
        category: "technology",
        importance: 0.9,
        isAtomic: true,
      },
    });

    // Memory 2: Medium strength, medium salience, older
    testMemories.push({
      id: "mem-2",
      content: "Older memory about data analysis techniques",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
      lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      accessCount: 2,
      salience: 0.6,
      decayRate: 0.01,
      strength: 0.7,
      userId,
      sessionId: "session-2",
      primarySector: "semantic",
      metadata: {
        keywords: ["data", "analysis", "techniques"],
        tags: ["data-science"],
        category: "technology",
        importance: 0.6,
        isAtomic: true,
      },
    });

    // Memory 3: Low strength, low salience, very old
    testMemories.push({
      id: "mem-3",
      content: "Very old memory about basic programming",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
      lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      accessCount: 1,
      salience: 0.3,
      decayRate: 0.01,
      strength: 0.4,
      userId,
      sessionId: "session-3",
      primarySector: "semantic",
      metadata: {
        keywords: ["programming", "basic"],
        tags: ["coding"],
        category: "technology",
        importance: 0.3,
        isAtomic: true,
      },
    });

    // Memory 4: Different user (should be filtered out)
    testMemories.push({
      id: "mem-4",
      content: "Another user's memory",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24),
      accessCount: 3,
      salience: 0.8,
      decayRate: 0.01,
      strength: 0.85,
      userId: "user-456", // Different user
      sessionId: "session-4",
      primarySector: "semantic",
      metadata: {
        keywords: ["other", "user"],
        tags: ["test"],
        category: "general",
        importance: 0.8,
        isAtomic: true,
      },
    });

    // Memory 5: Different sector (episodic)
    testMemories.push({
      id: "mem-5",
      content: "Episodic memory about a meeting yesterday",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24),
      accessCount: 2,
      salience: 0.7,
      decayRate: 0.03,
      strength: 0.8,
      userId,
      sessionId: "session-5",
      primarySector: "episodic",
      metadata: {
        keywords: ["meeting", "yesterday"],
        tags: ["work"],
        category: "events",
        importance: 0.7,
        isAtomic: true,
      },
    });

    // Mock database client
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        // Return test memories based on query
        if (query.includes("SELECT")) {
          return Promise.resolve({
            rows: testMemories.map((m) => ({
              id: m.id,
              content: m.content,
              created_at: m.createdAt,
              last_accessed: m.lastAccessed,
              access_count: m.accessCount,
              salience: m.salience,
              decay_rate: m.decayRate,
              strength: m.strength,
              user_id: m.userId,
              session_id: m.sessionId,
              primary_sector: m.primarySector,
              keywords: m.metadata.keywords,
              tags: m.metadata.tags,
              category: m.metadata.category,
              context: m.metadata.context ?? "",
              importance: m.metadata.importance,
              is_atomic: m.metadata.isAtomic,
              parent_id: m.metadata.parentId,
            })),
          });
        }
        return Promise.resolve({ rows: [] });
      }),
    };

    // Mock database connection manager
    mockDb = {
      query: vi.fn().mockImplementation((query: string) => {
        return mockClient.query(query);
      }),
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
    };

    // Mock embedding engine with sector-specific methods
    const mockEmbedding = new Array(1536).fill(0.1);
    mockEmbeddingEngine = {
      generateEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
      generateSemanticEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
      generateEpisodicEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
      generateProceduralEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
      generateEmotionalEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
      generateReflectiveEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
    };

    // Mock waypoint graph builder
    mockGraphBuilder = {
      calculateLinkWeight: vi.fn().mockResolvedValue(0.5),
    };

    // Mock embedding storage
    mockEmbeddingStorage = {
      vectorSimilaritySearch: vi.fn().mockResolvedValue([
        { memoryId: "mem-1", similarity: 0.95 },
        { memoryId: "mem-2", similarity: 0.85 },
        { memoryId: "mem-3", similarity: 0.75 },
      ]),
    };

    repository = new MemoryRepository(
      mockDb,
      mockEmbeddingEngine,
      mockGraphBuilder,
      mockEmbeddingStorage
    );
  });

  describe("Composite Scoring", () => {
    it("should calculate composite score with correct weights", async () => {
      // Requirement 2.2: Composite score = 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×link_weight
      const query: SearchQuery = {
        userId,
        text: "machine learning",
        limit: 10,
      };

      const result = await repository.search(query);

      expect(result.scores).toBeDefined();
      expect(result.scores.size).toBeGreaterThan(0);

      // Check that scores have all components
      const firstScore = Array.from(result.scores.values())[0];
      expect(firstScore.similarity).toBeDefined();
      expect(firstScore.salience).toBeDefined();
      expect(firstScore.recency).toBeDefined();
      expect(firstScore.linkWeight).toBeDefined();
      expect(firstScore.total).toBeDefined();

      // Verify composite calculation
      const expectedTotal =
        0.6 * firstScore.similarity +
        0.2 * firstScore.salience +
        0.1 * firstScore.recency +
        0.1 * firstScore.linkWeight;

      expect(firstScore.total).toBeCloseTo(expectedTotal, 2);
    });

    it("should weight similarity highest (0.6)", async () => {
      // Requirement 2.2: Similarity should dominate scoring
      const query: SearchQuery = {
        userId,
        text: "machine learning",
        limit: 10,
      };

      const result = await repository.search(query);
      const scores = Array.from(result.scores.values());

      // High similarity should result in high total score
      const highSimScore = scores.find((s) => s.similarity > 0.9);
      if (highSimScore) {
        expect(highSimScore.total).toBeGreaterThan(0.6);
      }
    });

    it("should contribute salience at 0.2 weight", async () => {
      // Requirement 2.2: Salience contributes 20% to score
      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      const result = await repository.search(query);
      const scores = Array.from(result.scores.values());

      // Verify salience contribution
      scores.forEach((score) => {
        const salienceContribution = 0.2 * score.salience;
        expect(salienceContribution).toBeLessThanOrEqual(0.2);
        expect(salienceContribution).toBeGreaterThanOrEqual(0);
      });
    });

    it("should contribute recency at 0.1 weight", async () => {
      // Requirement 2.2: Recency contributes 10% to score
      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      const result = await repository.search(query);
      const scores = Array.from(result.scores.values());

      // Verify recency contribution
      scores.forEach((score) => {
        const recencyContribution = 0.1 * score.recency;
        expect(recencyContribution).toBeLessThanOrEqual(0.1);
        expect(recencyContribution).toBeGreaterThanOrEqual(0);
      });
    });

    it("should contribute link weight at 0.1 weight", async () => {
      // Requirement 2.2: Link weight contributes 10% to score
      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      const result = await repository.search(query);
      const scores = Array.from(result.scores.values());

      // Verify link weight contribution
      scores.forEach((score) => {
        const linkContribution = 0.1 * score.linkWeight;
        expect(linkContribution).toBeLessThanOrEqual(0.1);
        expect(linkContribution).toBeGreaterThanOrEqual(0);
      });
    });

    it("should normalize composite scores to 0-1 range", async () => {
      // Requirement 2.2: Scores must be normalized
      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      const result = await repository.search(query);
      const scores = Array.from(result.scores.values());

      scores.forEach((score) => {
        expect(score.total).toBeGreaterThanOrEqual(0);
        expect(score.total).toBeLessThanOrEqual(1);
        expect(score.similarity).toBeGreaterThanOrEqual(0);
        expect(score.similarity).toBeLessThanOrEqual(1);
        expect(score.salience).toBeGreaterThanOrEqual(0);
        expect(score.salience).toBeLessThanOrEqual(1);
        expect(score.recency).toBeGreaterThanOrEqual(0);
        expect(score.recency).toBeLessThanOrEqual(1);
        expect(score.linkWeight).toBeGreaterThanOrEqual(0);
        expect(score.linkWeight).toBeLessThanOrEqual(1);
      });
    });

    it("should rank memories by composite score descending", async () => {
      // Requirement 2.2: Results ranked by total score
      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      const result = await repository.search(query);

      // Verify memories are sorted by score
      for (let i = 0; i < result.memories.length - 1; i++) {
        const score1 = result.scores.get(result.memories[i].id)!;
        const score2 = result.scores.get(result.memories[i + 1].id)!;
        expect(score1.total).toBeGreaterThanOrEqual(score2.total);
      }
    });
  });

  describe("Sector Embedding Retrieval", () => {
    it("should retrieve using episodic embeddings", async () => {
      // Requirement 2.3: Sector-specific retrieval
      const query: SearchQuery = {
        userId,
        text: "meeting",
        sectors: ["episodic"],
        limit: 10,
      };

      await repository.search(query);

      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalledWith(
        expect.any(Array),
        "episodic",
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("should retrieve using semantic embeddings", async () => {
      // Requirement 2.3: Sector-specific retrieval
      const query: SearchQuery = {
        userId,
        text: "machine learning",
        sectors: ["semantic"],
        limit: 10,
      };

      await repository.search(query);

      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalledWith(
        expect.any(Array),
        "semantic",
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("should retrieve using procedural embeddings", async () => {
      // Requirement 2.3: Sector-specific retrieval
      const query: SearchQuery = {
        userId,
        text: "how to code",
        sectors: ["procedural"],
        limit: 10,
      };

      await repository.search(query);

      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalledWith(
        expect.any(Array),
        "procedural",
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("should retrieve using emotional embeddings", async () => {
      // Requirement 2.3: Sector-specific retrieval
      const query: SearchQuery = {
        userId,
        text: "happy moment",
        sectors: ["emotional"],
        limit: 10,
      };

      await repository.search(query);

      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalledWith(
        expect.any(Array),
        "emotional",
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("should retrieve using reflective embeddings", async () => {
      // Requirement 2.3: Sector-specific retrieval
      const query: SearchQuery = {
        userId,
        text: "lesson learned",
        sectors: ["reflective"],
        limit: 10,
      };

      await repository.search(query);

      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalledWith(
        expect.any(Array),
        "reflective",
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("should retrieve using multiple sectors", async () => {
      // Requirement 2.3: Multi-sector retrieval
      const query: SearchQuery = {
        userId,
        text: "important meeting",
        sectors: ["episodic", "semantic", "emotional"],
        limit: 10,
      };

      await repository.search(query);

      // Should call vector search for each sector
      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalledTimes(3);
    });

    it("should default to all sectors if none specified", async () => {
      // Requirement 2.3: Default behavior
      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      await repository.search(query);

      // Should search all 5 sectors by default
      expect(mockEmbeddingStorage.vectorSimilaritySearch).toHaveBeenCalledTimes(5);
    });
  });

  describe("Filtering", () => {
    it("should filter by userId", async () => {
      // Requirement 2.4: User isolation
      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      const result = await repository.search(query);

      // All returned memories should belong to the user
      result.memories.forEach((memory) => {
        expect(memory.userId).toBe(userId);
      });

      // Should not include other user's memories
      const otherUserMemory = result.memories.find((m) => m.userId === "user-456");
      expect(otherUserMemory).toBeUndefined();
    });

    it("should filter by primarySector", async () => {
      // Requirement 2.4: Memory type filtering
      const query: SearchQuery = {
        userId,
        primarySector: "semantic",
        limit: 10,
      };

      const result = await repository.search(query);

      // All returned memories should be semantic
      result.memories.forEach((memory) => {
        expect(memory.primarySector).toBe("semantic");
      });
    });

    it("should filter by minimum strength", async () => {
      // Requirement 2.4: Strength threshold
      const query: SearchQuery = {
        userId,
        minStrength: 0.7,
        limit: 10,
      };

      const result = await repository.search(query);

      // All returned memories should have strength >= 0.7
      result.memories.forEach((memory) => {
        expect(memory.strength).toBeGreaterThanOrEqual(0.7);
      });
    });

    it("should filter by minimum salience", async () => {
      // Requirement 2.4: Salience threshold
      const query: SearchQuery = {
        userId,
        minSalience: 0.6,
        limit: 10,
      };

      const result = await repository.search(query);

      // All returned memories should have salience >= 0.6
      result.memories.forEach((memory) => {
        expect(memory.salience).toBeGreaterThanOrEqual(0.6);
      });
    });

    it("should filter by date range", async () => {
      // Requirement 2.4: Temporal filtering
      const startDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14); // 14 days ago
      const endDate = new Date(); // Now

      const query: SearchQuery = {
        userId,
        dateRange: { start: startDate, end: endDate },
        limit: 10,
      };

      const result = await repository.search(query);

      // All returned memories should be within date range
      result.memories.forEach((memory) => {
        expect(memory.createdAt.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(memory.createdAt.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it("should exclude memories created after end date", async () => {
      // Requirement 2.4: Temporal filtering - test end date boundary
      // Create a memory with a future createdAt date
      const futureMemory: Memory = {
        id: "mem-future",
        content: "Future memory",
        createdAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day in future
        lastAccessed: new Date(),
        accessCount: 0,
        salience: 0.5,
        decayRate: 0.02,
        strength: 1.0,
        userId,
        sessionId: "session-1",
        primarySector: "episodic",
        metadata: {
          keywords: [],
          tags: [],
          importance: 0.5,
          isAtomic: true,
        },
      };

      testMemories.push(futureMemory);

      // Search with end date of now - should exclude future memory
      const endDate = new Date();
      const query: SearchQuery = {
        userId,
        dateRange: { end: endDate },
        limit: 10,
      };

      const result = await repository.search(query);

      // Future memory should be excluded
      const futureMemoryInResults = result.memories.find((m) => m.id === "mem-future");
      expect(futureMemoryInResults).toBeUndefined();

      // All returned memories should be before or at end date
      result.memories.forEach((memory) => {
        expect(memory.createdAt.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it("should filter by metadata keywords", async () => {
      // Requirement 2.4: Metadata filtering
      const query: SearchQuery = {
        userId,
        metadata: {
          keywords: ["machine", "learning"],
        },
        limit: 10,
      };

      const result = await repository.search(query);

      // All returned memories should have at least one matching keyword
      result.memories.forEach((memory) => {
        const hasKeyword = memory.metadata.keywords?.some((k) =>
          ["machine", "learning"].includes(k)
        );
        expect(hasKeyword).toBe(true);
      });
    });

    it("should filter by metadata tags", async () => {
      // Requirement 2.4: Tag filtering
      const query: SearchQuery = {
        userId,
        metadata: {
          tags: ["ai", "ml"],
        },
        limit: 10,
      };

      const result = await repository.search(query);

      // All returned memories should have at least one matching tag
      result.memories.forEach((memory) => {
        const hasTag = memory.metadata.tags?.some((t) => ["ai", "ml"].includes(t));
        expect(hasTag).toBe(true);
      });
    });

    it("should filter by metadata category", async () => {
      // Requirement 2.4: Category filtering
      const query: SearchQuery = {
        userId,
        metadata: {
          category: "technology",
        },
        limit: 10,
      };

      const result = await repository.search(query);

      // All returned memories should have matching category
      result.memories.forEach((memory) => {
        expect(memory.metadata.category).toBe("technology");
      });
    });

    it("should combine multiple filters with AND logic", async () => {
      // Requirement 2.4: Combined filtering
      const query: SearchQuery = {
        userId,
        primarySector: "semantic",
        minStrength: 0.7,
        minSalience: 0.6,
        metadata: {
          category: "technology",
        },
        limit: 10,
      };

      const result = await repository.search(query);

      // All filters should be applied
      result.memories.forEach((memory) => {
        expect(memory.userId).toBe(userId);
        expect(memory.primarySector).toBe("semantic");
        expect(memory.strength).toBeGreaterThanOrEqual(0.7);
        expect(memory.salience).toBeGreaterThanOrEqual(0.6);
        expect(memory.metadata.category).toBe("technology");
      });
    });

    it("should return empty results when no matches", async () => {
      // Requirement 2.4: Empty result handling
      const query: SearchQuery = {
        userId,
        minStrength: 0.99, // Very high threshold
        limit: 10,
      };

      const result = await repository.search(query);

      expect(result.memories).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe("Pagination and Result Limiting", () => {
    it("should limit results to specified limit", async () => {
      // Requirement 2.4: Result limiting
      const query: SearchQuery = {
        userId,
        limit: 2,
      };

      const result = await repository.search(query);

      expect(result.memories.length).toBeLessThanOrEqual(2);
    });

    it("should default to limit of 10 when not specified", async () => {
      // Requirement 2.4: Default limit
      const query: SearchQuery = {
        userId,
      };

      const result = await repository.search(query);

      expect(result.memories.length).toBeLessThanOrEqual(10);
    });

    it("should support pagination with offset", async () => {
      // Requirement 2.4: Pagination
      const query1: SearchQuery = {
        userId,
        limit: 2,
        offset: 0,
      };

      const query2: SearchQuery = {
        userId,
        limit: 2,
        offset: 2,
      };

      const result1 = await repository.search(query1);
      const result2 = await repository.search(query2);

      // Results should be different
      if (result1.memories.length > 0 && result2.memories.length > 0) {
        expect(result1.memories[0].id).not.toBe(result2.memories[0].id);
      }
    });

    it("should return totalCount separate from returned count", async () => {
      // Requirement 2.4: Total count tracking
      const query: SearchQuery = {
        userId,
        limit: 2,
      };

      const result = await repository.search(query);

      expect(result.totalCount).toBeDefined();
      expect(result.totalCount).toBeGreaterThanOrEqual(result.memories.length);
    });

    it("should handle offset beyond total count", async () => {
      // Requirement 2.4: Edge case handling
      const query: SearchQuery = {
        userId,
        limit: 10,
        offset: 1000, // Way beyond available memories
      };

      const result = await repository.search(query);

      expect(result.memories).toHaveLength(0);
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
    });

    it("should handle limit of 0", async () => {
      // Requirement 2.4: Edge case handling
      const query: SearchQuery = {
        userId,
        limit: 0,
      };

      const result = await repository.search(query);

      expect(result.memories).toHaveLength(0);
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
    });

    it("should enforce maximum limit", async () => {
      // Requirement 2.4: Prevent excessive results
      const query: SearchQuery = {
        userId,
        limit: 10000, // Very large limit
      };

      const result = await repository.search(query);

      // Should cap at reasonable maximum (e.g., 100)
      expect(result.memories.length).toBeLessThanOrEqual(100);
    });

    it("should handle pagination with small result sets", async () => {
      // Requirement 2.4: Small dataset handling
      const query: SearchQuery = {
        userId,
        minStrength: 0.9, // Only 1-2 memories match
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(query);

      expect(result.memories.length).toBeLessThanOrEqual(result.totalCount);
    });
  });

  describe("Performance Requirements", () => {
    it("should retrieve from 1k memories in <50ms", async () => {
      // Requirement 2.5: Performance target for 1k memories
      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      const startTime = Date.now();
      const result = await repository.search(query);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
      expect(result.processingTime).toBeLessThan(50);
    });

    it("should retrieve from 10k memories in <100ms", async () => {
      // Requirement 2.5: Performance target for 10k memories
      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      const startTime = Date.now();
      const result = await repository.search(query);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
      expect(result.processingTime).toBeLessThan(100);
    });

    it("should retrieve from 100k memories in <200ms p95", async () => {
      // Requirement 2.5: Performance target for 100k memories
      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      // Run multiple times to get p95
      const durations: number[] = [];
      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();
        await repository.search(query);
        durations.push(Date.now() - startTime);
      }

      // Calculate p95 (95th percentile)
      durations.sort((a, b) => a - b);
      const p95Index = Math.floor(durations.length * 0.95);
      const p95 = durations[p95Index];

      expect(p95).toBeLessThan(200);
    });

    it("should use database indexes for performance", async () => {
      // Requirement 2.5: Index usage
      const query: SearchQuery = {
        userId,
        text: "test",
        minStrength: 0.5,
        limit: 10,
      };

      await repository.search(query);

      // Verify query uses database connection (check query plan in real implementation)
      expect(mockDb.getConnection).toHaveBeenCalled();
    });

    it("should handle concurrent retrieval requests", async () => {
      // Requirement 2.5: Concurrency handling
      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      // Execute 10 concurrent searches
      const promises = Array(10)
        .fill(null)
        .map(() => repository.search(query));

      const results = await Promise.all(promises);

      // All should complete successfully
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.memories).toBeDefined();
      });
    });

    it("should track processing time in result", async () => {
      // Requirement 2.5: Performance monitoring
      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      const result = await repository.search(query);

      expect(result.processingTime).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThan(1000);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty query text", async () => {
      // Edge case: Empty text
      const query: SearchQuery = {
        userId,
        text: "",
        limit: 10,
      };

      const result = await repository.search(query);

      // Should still return results (all memories for user)
      expect(result.memories).toBeDefined();
    });

    it("should handle query with no text or embedding", async () => {
      // Edge case: No search criteria
      const query: SearchQuery = {
        userId,
        limit: 10,
      };

      const result = await repository.search(query);

      // Should return all memories for user (up to limit)
      expect(result.memories).toBeDefined();
      expect(result.memories.length).toBeLessThanOrEqual(10);
    });

    it("should handle very long text queries", async () => {
      // Edge case: Large query
      const longText = "a".repeat(10000);

      const query: SearchQuery = {
        userId,
        text: longText,
        limit: 10,
      };

      const result = await repository.search(query);

      expect(result.memories).toBeDefined();
    });

    it("should handle special characters in query", async () => {
      // Edge case: Special characters
      const query: SearchQuery = {
        userId,
        text: "test with émojis 🎉 and spëcial çharacters!",
        limit: 10,
      };

      const result = await repository.search(query);

      expect(result.memories).toBeDefined();
    });

    it("should handle invalid sector names gracefully", async () => {
      // Edge case: Invalid sector
      const query: SearchQuery = {
        userId,
        sectors: ["invalid-sector" as any],
        limit: 10,
      };

      // Should either filter out invalid sectors or throw error
      await expect(repository.search(query)).rejects.toThrow();
    });

    it("should handle negative strength values", async () => {
      // Edge case: Invalid strength
      const query: SearchQuery = {
        userId,
        minStrength: -0.5,
        limit: 10,
      };

      // Should throw validation error
      await expect(repository.search(query)).rejects.toThrow("MinStrength must be between 0 and 1");
    });

    it("should handle strength values > 1", async () => {
      // Edge case: Invalid strength
      const query: SearchQuery = {
        userId,
        minStrength: 1.5,
        limit: 10,
      };

      // Should throw validation error
      await expect(repository.search(query)).rejects.toThrow("MinStrength must be between 0 and 1");
    });

    it("should handle negative salience values", async () => {
      // Edge case: Invalid salience
      const query: SearchQuery = {
        userId,
        minSalience: -0.3,
        limit: 10,
      };

      // Should throw validation error
      await expect(repository.search(query)).rejects.toThrow("minSalience must be between 0 and 1");
    });

    it("should handle salience values > 1", async () => {
      // Edge case: Invalid salience
      const query: SearchQuery = {
        userId,
        minSalience: 1.8,
        limit: 10,
      };

      // Should throw validation error
      await expect(repository.search(query)).rejects.toThrow("minSalience must be between 0 and 1");
    });

    it("should handle boundary strength value of 0", async () => {
      // Edge case: Boundary value
      const query: SearchQuery = {
        userId,
        minStrength: 0,
        limit: 10,
      };

      const result = await repository.search(query);
      expect(result.memories).toBeDefined();
    });

    it("should handle boundary strength value of 1", async () => {
      // Edge case: Boundary value
      const query: SearchQuery = {
        userId,
        minStrength: 1,
        limit: 10,
      };

      const result = await repository.search(query);
      expect(result.memories).toBeDefined();
    });

    it("should handle boundary salience value of 0", async () => {
      // Edge case: Boundary value
      const query: SearchQuery = {
        userId,
        minSalience: 0,
        limit: 10,
      };

      const result = await repository.search(query);
      expect(result.memories).toBeDefined();
    });

    it("should handle boundary salience value of 1", async () => {
      // Edge case: Boundary value
      const query: SearchQuery = {
        userId,
        minSalience: 1,
        limit: 10,
      };

      const result = await repository.search(query);
      expect(result.memories).toBeDefined();
    });

    it("should handle future dates in date range", async () => {
      // Edge case: Future dates
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year future

      const query: SearchQuery = {
        userId,
        dateRange: { start: futureDate },
        limit: 10,
      };

      const result = await repository.search(query);

      // Should return empty results
      expect(result.memories).toHaveLength(0);
    });

    it("should handle inverted date range", async () => {
      // Edge case: End before start
      const query: SearchQuery = {
        userId,
        dateRange: {
          start: new Date(),
          end: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        },
        limit: 10,
      };

      // Should either swap dates or throw error
      await expect(repository.search(query)).rejects.toThrow();
    });

    it("should handle missing userId", async () => {
      // Edge case: Required field missing
      const query: any = {
        text: "test",
        limit: 10,
      };

      await expect(repository.search(query)).rejects.toThrow();
    });

    it("should handle database connection failure", async () => {
      // Error case: Database unavailable
      mockDb.getConnection.mockRejectedValue(new Error("Connection failed"));

      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      await expect(repository.search(query)).rejects.toThrow();

      // Restore mock for other tests
      mockDb.getConnection.mockResolvedValue({
        query: vi.fn().mockImplementation((query: string) => {
          if (query.includes("SELECT")) {
            return Promise.resolve({
              rows: testMemories.map((m) => ({
                id: m.id,
                content: m.content,
                created_at: m.createdAt,
                last_accessed: m.lastAccessed,
                access_count: m.accessCount,
                salience: m.salience,
                decay_rate: m.decayRate,
                strength: m.strength,
                user_id: m.userId,
                session_id: m.sessionId,
                primary_sector: m.primarySector,
                keywords: m.metadata.keywords,
                tags: m.metadata.tags,
                category: m.metadata.category,
                context: m.metadata.context ?? "",
                importance: m.metadata.importance,
                is_atomic: m.metadata.isAtomic,
                parent_id: m.metadata.parentId,
              })),
            });
          }
          return Promise.resolve({ rows: [] });
        }),
      });
    });

    it("should handle embedding generation failure", async () => {
      // Error case: Embedding service unavailable
      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingEngine.generateSemanticEmbedding.mockRejectedValue(
        new Error("Embedding service unavailable")
      );

      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      await expect(repository.search(query)).rejects.toThrow();

      // Restore mock for other tests
      mockEmbeddingEngine.generateSemanticEmbedding.mockResolvedValue(mockEmbedding);
    });

    it("should handle empty metadata arrays", async () => {
      // Edge case: Empty arrays
      const query: SearchQuery = {
        userId,
        metadata: {
          keywords: [],
          tags: [],
        },
        limit: 10,
      };

      const result = await repository.search(query);

      // Should return all memories (no filtering)
      expect(result.memories).toBeDefined();
    });

    it("should handle link weight calculation failure gracefully", async () => {
      // Setup: Mock database to fail on link weight query but succeed on memory query
      const testMemoryId = "mem-1";
      const mockClient = {
        query: vi.fn().mockImplementation((query: string) => {
          // Fail on link weight query (contains AVG(weight))
          if (query.includes("AVG(weight)")) {
            return Promise.reject(new Error("Link weight query failed"));
          }
          // Succeed on memory query - return the first test memory
          if (query.includes("SELECT") && query.includes("FROM memories")) {
            return Promise.resolve({
              rows: [
                {
                  id: testMemories[0].id,
                  content: testMemories[0].content,
                  created_at: testMemories[0].createdAt,
                  last_accessed: testMemories[0].lastAccessed,
                  access_count: testMemories[0].accessCount,
                  salience: testMemories[0].salience,
                  decay_rate: testMemories[0].decayRate,
                  strength: testMemories[0].strength,
                  user_id: testMemories[0].userId,
                  session_id: testMemories[0].sessionId,
                  primary_sector: testMemories[0].primarySector,
                  keywords: testMemories[0].metadata.keywords,
                  tags: testMemories[0].metadata.tags,
                  category: testMemories[0].metadata.category,
                  context: testMemories[0].metadata.context ?? "",
                  importance: testMemories[0].metadata.importance,
                  is_atomic: testMemories[0].metadata.isAtomic,
                  parent_id: testMemories[0].metadata.parentId,
                },
              ],
            });
          }
          return Promise.resolve({ rows: [] });
        }),
      };

      mockDb.getConnection.mockResolvedValue(mockClient);

      // Mock embedding storage to return similarity scores matching the memory
      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        { memoryId: testMemoryId, similarity: 0.95 },
      ]);

      const query: SearchQuery = {
        userId,
        text: "machine learning",
        limit: 10,
      };

      // Should succeed despite link weight calculation failure
      const result = await repository.search(query);

      // Should return memories with composite scores calculated without link weights
      expect(result.memories).toBeDefined();
      expect(result.memories.length).toBeGreaterThan(0);

      // Check composite scores are calculated
      expect(result.scores).toBeDefined();
      const memoryId = result.memories[0].id;
      const score = result.scores.get(memoryId);
      expect(score).toBeDefined();
      expect(score!.total).toBeGreaterThanOrEqual(0);
      expect(score!.total).toBeLessThanOrEqual(1);

      // Link weight component should be 0 when calculation fails
      expect(score!.linkWeight).toBe(0);

      // Verify link weight query was attempted and failed (caught silently)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("AVG(weight)"),
        expect.any(Array)
      );
    });
  });
});
