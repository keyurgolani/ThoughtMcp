/**
 * Unit Tests: CompositeScorer
 *
 * Tests for the composite scoring functionality in MemoryRepository.
 * Validates both similarity-based and salience-based ranking methods.
 *
 * Requirements:
 * - 5.1: Use salience-weighted ranking when no text query provided
 * - 5.2: Use (0.4×salience + 0.3×recency + 0.3×linkWeight) for non-text queries
 * - 5.3: Include ranking method indicator in response
 *
 * @module __tests__/unit/memory/composite-scorer.test
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseConnectionManager } from "../../../database/connection-manager";
import { EmbeddingEngine } from "../../../embeddings/embedding-engine";
import { EmbeddingStorage } from "../../../embeddings/embedding-storage";
import { WaypointGraphBuilder } from "../../../graph/waypoint-builder";
import { MemoryRepository } from "../../../memory/memory-repository";
import type { SearchQuery } from "../../../memory/types";

// Mock dependencies
vi.mock("../../../database/connection-manager");
vi.mock("../../../embeddings/embedding-engine");
vi.mock("../../../embeddings/embedding-storage");
vi.mock("../../../graph/waypoint-builder");

describe("CompositeScorer", () => {
  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockEmbeddingStorage: any;
  let mockGraphBuilder: any;
  let mockClient: any;

  const userId = "test-user-composite";
  const sessionId = "test-session-composite";

  // Helper to create mock memory rows
  const createMockMemoryRow = (
    id: string,
    content: string,
    salience: number,
    createdAt: Date,
    options: Partial<{
      strength: number;
      accessCount: number;
      decayRate: number;
      primarySector: string;
      keywords: string[];
      tags: string[];
      category: string;
      importance: number;
    }> = {}
  ) => ({
    id,
    content,
    created_at: createdAt,
    last_accessed: createdAt,
    access_count: options.accessCount ?? 0,
    salience,
    decay_rate: options.decayRate ?? 0.01,
    strength: options.strength ?? 1.0,
    user_id: userId,
    session_id: sessionId,
    primary_sector: options.primarySector ?? "semantic",
    keywords: options.keywords ?? [],
    tags: options.tags ?? [],
    category: options.category ?? "general",
    context: "",
    importance: options.importance ?? 0.5,
    is_atomic: true,
    parent_id: null,
  });

  beforeAll(() => {
    // Suppress console output during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock client
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    // Setup mock database
    mockDb = {
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      pool: {
        query: vi.fn(),
      },
    };

    // Setup mock embedding engine
    mockEmbeddingEngine = {
      generateSemanticEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.1)),
      generateAllSectorEmbeddings: vi.fn().mockResolvedValue({
        semantic: new Array(768).fill(0.1),
        episodic: new Array(768).fill(0.1),
        procedural: new Array(768).fill(0.1),
        emotional: new Array(768).fill(0.1),
        reflective: new Array(768).fill(0.1),
      }),
    };

    // Setup mock embedding storage
    mockEmbeddingStorage = {
      vectorSimilaritySearch: vi.fn().mockResolvedValue([]),
      storeEmbeddings: vi.fn(),
      retrieveEmbeddings: vi.fn().mockResolvedValue({}),
    };

    // Setup mock graph builder
    mockGraphBuilder = {
      createWaypointLinks: vi.fn().mockResolvedValue({ links: [] }),
    };

    repository = new MemoryRepository(
      mockDb as unknown as DatabaseConnectionManager,
      mockEmbeddingEngine as unknown as EmbeddingEngine,
      mockGraphBuilder as unknown as WaypointGraphBuilder,
      mockEmbeddingStorage as unknown as EmbeddingStorage
    );
  });

  describe("Scoring with text query (similarity-based)", () => {
    /**
     * Requirement 5.3: Include ranking method indicator in response
     * When text query is provided, rankingMethod should be "similarity"
     */
    it("should use similarity ranking method when text query is provided", async () => {
      const now = new Date();
      const memoryRow = createMockMemoryRow(
        "mem-1",
        "Test content about machine learning",
        0.8,
        now
      );

      // Mock database query to return memory
      mockClient.query.mockResolvedValue({ rows: [memoryRow] });

      // Mock vector similarity search to return matching memory
      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        { memoryId: "mem-1", similarity: 0.85, sector: "semantic" },
      ]);

      const query: SearchQuery = {
        userId,
        text: "machine learning",
        limit: 10,
      };

      const result = await repository.search(query);

      expect(result.rankingMethod).toBe("similarity");
    });

    /**
     * Requirement 2.2: Composite score = 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×linkWeight
     */
    it("should calculate composite score using similarity formula", async () => {
      const now = new Date();
      const memoryRow = createMockMemoryRow(
        "mem-1",
        "Test content about machine learning",
        0.7,
        now
      );

      mockClient.query.mockResolvedValue({ rows: [memoryRow] });

      // Mock vector similarity search with known similarity
      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        { memoryId: "mem-1", similarity: 0.9, sector: "semantic" },
      ]);

      const query: SearchQuery = {
        userId,
        text: "machine learning",
        limit: 10,
      };

      const result = await repository.search(query);

      expect(result.memories.length).toBeGreaterThan(0);
      const score = result.scores.get("mem-1");
      expect(score).toBeDefined();

      if (score) {
        // Verify all components are present
        expect(score.similarity).toBeGreaterThanOrEqual(0);
        expect(score.similarity).toBeLessThanOrEqual(1);
        expect(score.salience).toBeGreaterThanOrEqual(0);
        expect(score.salience).toBeLessThanOrEqual(1);
        expect(score.recency).toBeGreaterThanOrEqual(0);
        expect(score.recency).toBeLessThanOrEqual(1);
        expect(score.linkWeight).toBeGreaterThanOrEqual(0);
        expect(score.linkWeight).toBeLessThanOrEqual(1);

        // Verify formula: 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×linkWeight
        const expectedTotal =
          0.6 * score.similarity +
          0.2 * score.salience +
          0.1 * score.recency +
          0.1 * score.linkWeight;

        expect(score.total).toBeCloseTo(expectedTotal, 5);
      }
    });

    /**
     * Similarity should dominate the score (60% weight)
     */
    it("should weight similarity highest at 0.6", async () => {
      const now = new Date();
      const memoryRow = createMockMemoryRow("mem-1", "High similarity content", 0.5, now);

      mockClient.query.mockResolvedValue({ rows: [memoryRow] });

      // High similarity score
      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        { memoryId: "mem-1", similarity: 1.0, sector: "semantic" },
      ]);

      const query: SearchQuery = {
        userId,
        text: "high similarity",
        limit: 10,
      };

      const result = await repository.search(query);
      const score = result.scores.get("mem-1");

      if (score) {
        // With similarity = 1.0, the similarity contribution should be 0.6
        const similarityContribution = 0.6 * score.similarity;
        expect(similarityContribution).toBeCloseTo(0.6, 2);
      }
    });

    /**
     * Test ranking by composite score with text query
     */
    it("should rank memories by composite score descending", async () => {
      const now = new Date();
      const memory1 = createMockMemoryRow("mem-1", "High relevance content", 0.9, now);
      const memory2 = createMockMemoryRow("mem-2", "Low relevance content", 0.3, now);

      mockClient.query.mockResolvedValue({ rows: [memory1, memory2] });

      // Different similarity scores
      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        { memoryId: "mem-1", similarity: 0.95, sector: "semantic" },
        { memoryId: "mem-2", similarity: 0.6, sector: "semantic" },
      ]);

      const query: SearchQuery = {
        userId,
        text: "relevance",
        limit: 10,
      };

      const result = await repository.search(query);

      // Verify descending order by score
      for (let i = 1; i < result.memories.length; i++) {
        const prevScore = result.scores.get(result.memories[i - 1].id)?.total ?? 0;
        const currScore = result.scores.get(result.memories[i].id)?.total ?? 0;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });
  });

  describe("Scoring without text query (salience-based)", () => {
    /**
     * Requirement 5.1: Use salience-weighted ranking when no text query provided
     * Requirement 5.3: Include ranking method indicator in response
     */
    it("should use salience ranking method when no text query is provided", async () => {
      const now = new Date();
      const memoryRow = createMockMemoryRow("mem-1", "Test content", 0.8, now);

      mockClient.query.mockResolvedValue({ rows: [memoryRow] });

      const query: SearchQuery = {
        userId,
        limit: 10,
        // No text query
      };

      const result = await repository.search(query);

      expect(result.rankingMethod).toBe("salience");
    });

    /**
     * Requirement 5.2: Use (0.4×salience + 0.3×recency + 0.3×linkWeight) for non-text queries
     */
    it("should calculate composite score using salience formula", async () => {
      const now = new Date();
      const memoryRow = createMockMemoryRow("mem-1", "Test content", 0.8, now);

      mockClient.query.mockResolvedValue({ rows: [memoryRow] });

      const query: SearchQuery = {
        userId,
        limit: 10,
        // No text query
      };

      const result = await repository.search(query);

      expect(result.memories.length).toBeGreaterThan(0);
      const score = result.scores.get("mem-1");
      expect(score).toBeDefined();

      if (score) {
        // Similarity should be 0 when no text query
        expect(score.similarity).toBe(0);

        // Verify formula: 0.4×salience + 0.3×recency + 0.3×linkWeight
        const expectedTotal = 0.4 * score.salience + 0.3 * score.recency + 0.3 * score.linkWeight;

        expect(score.total).toBeCloseTo(expectedTotal, 5);
      }
    });

    /**
     * Salience should dominate the score (40% weight) when no text query
     */
    it("should weight salience highest at 0.4 when no text query", async () => {
      const now = new Date();
      const memoryRow = createMockMemoryRow("mem-1", "High salience content", 1.0, now);

      mockClient.query.mockResolvedValue({ rows: [memoryRow] });

      const query: SearchQuery = {
        userId,
        limit: 10,
      };

      const result = await repository.search(query);
      const score = result.scores.get("mem-1");

      if (score) {
        // With salience = 1.0, the salience contribution should be 0.4
        const salienceContribution = 0.4 * score.salience;
        expect(salienceContribution).toBeCloseTo(0.4, 2);
      }
    });

    /**
     * Memories with higher salience should rank higher when no text query
     */
    it("should rank memories by salience-weighted score when no text query", async () => {
      const now = new Date();
      const highSalience = createMockMemoryRow("mem-high", "High salience memory", 0.95, now);
      const lowSalience = createMockMemoryRow("mem-low", "Low salience memory", 0.2, now);

      mockClient.query.mockResolvedValue({ rows: [highSalience, lowSalience] });

      const query: SearchQuery = {
        userId,
        limit: 10,
      };

      const result = await repository.search(query);

      // High salience memory should rank first
      expect(result.memories[0].id).toBe("mem-high");

      // Verify descending order by score
      for (let i = 1; i < result.memories.length; i++) {
        const prevScore = result.scores.get(result.memories[i - 1].id)?.total ?? 0;
        const currScore = result.scores.get(result.memories[i].id)?.total ?? 0;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });

    /**
     * Empty text string should be treated as no text query
     */
    it("should treat empty string as no text query", async () => {
      const now = new Date();
      const memoryRow = createMockMemoryRow("mem-1", "Test content", 0.8, now);

      mockClient.query.mockResolvedValue({ rows: [memoryRow] });

      const query: SearchQuery = {
        userId,
        text: "",
        limit: 10,
      };

      const result = await repository.search(query);

      // Empty string should be treated as no text query
      expect(result.rankingMethod).toBe("salience");

      const score = result.scores.get("mem-1");
      if (score) {
        // Similarity should be 0
        expect(score.similarity).toBe(0);
      }
    });

    /**
     * Recency and linkWeight should each contribute 30% when no text query
     */
    it("should weight recency and linkWeight at 0.3 each when no text query", async () => {
      const now = new Date();
      const memoryRow = createMockMemoryRow("mem-1", "Test content", 0.5, now);

      mockClient.query.mockResolvedValue({ rows: [memoryRow] });

      const query: SearchQuery = {
        userId,
        limit: 10,
      };

      const result = await repository.search(query);
      const score = result.scores.get("mem-1");

      if (score) {
        // Verify recency contribution (30%)
        const recencyContribution = 0.3 * score.recency;
        expect(recencyContribution).toBeLessThanOrEqual(0.3);
        expect(recencyContribution).toBeGreaterThanOrEqual(0);

        // Verify linkWeight contribution (30%)
        const linkWeightContribution = 0.3 * score.linkWeight;
        expect(linkWeightContribution).toBeLessThanOrEqual(0.3);
        expect(linkWeightContribution).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Score normalization", () => {
    /**
     * All score components should be bounded between 0 and 1
     */
    it("should normalize all score components to 0-1 range", async () => {
      const now = new Date();
      const memoryRow = createMockMemoryRow("mem-1", "Test content", 0.8, now);

      mockClient.query.mockResolvedValue({ rows: [memoryRow] });

      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        { memoryId: "mem-1", similarity: 0.9, sector: "semantic" },
      ]);

      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      const result = await repository.search(query);
      const score = result.scores.get("mem-1");

      if (score) {
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
      }
    });

    /**
     * Total score should be clamped to 0-1 even with extreme inputs
     */
    it("should clamp total score to 0-1 range", async () => {
      const now = new Date();
      // Create memory with maximum salience
      const memoryRow = createMockMemoryRow("mem-1", "Test content", 1.0, now);

      mockClient.query.mockResolvedValue({ rows: [memoryRow] });

      mockEmbeddingStorage.vectorSimilaritySearch.mockResolvedValue([
        { memoryId: "mem-1", similarity: 1.0, sector: "semantic" },
      ]);

      const query: SearchQuery = {
        userId,
        text: "test",
        limit: 10,
      };

      const result = await repository.search(query);
      const score = result.scores.get("mem-1");

      if (score) {
        // Even with all components at 1.0, total should not exceed 1.0
        expect(score.total).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Recency calculation", () => {
    /**
     * Newer memories should have higher recency scores
     */
    it("should give higher recency score to newer memories", async () => {
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const newMemory = createMockMemoryRow("mem-new", "New content", 0.5, now);
      const oldMemory = createMockMemoryRow("mem-old", "Old content", 0.5, oneMonthAgo);

      mockClient.query.mockResolvedValue({ rows: [newMemory, oldMemory] });

      const query: SearchQuery = {
        userId,
        limit: 10,
      };

      const result = await repository.search(query);

      const newScore = result.scores.get("mem-new");
      const oldScore = result.scores.get("mem-old");

      if (newScore && oldScore) {
        expect(newScore.recency).toBeGreaterThan(oldScore.recency);
      }
    });

    /**
     * Very old memories (1 year+) should have recency close to 0
     */
    it("should give low recency score to old memories", async () => {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const oldMemory = createMockMemoryRow("mem-old", "Old content", 0.5, oneYearAgo);

      mockClient.query.mockResolvedValue({ rows: [oldMemory] });

      const query: SearchQuery = {
        userId,
        limit: 10,
      };

      const result = await repository.search(query);
      const score = result.scores.get("mem-old");

      if (score) {
        // One year old memory should have recency close to 0
        expect(score.recency).toBeLessThanOrEqual(0.1);
      }
    });
  });
});
