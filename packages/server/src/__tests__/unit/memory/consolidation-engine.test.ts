/**
 * Consolidation Engine Unit Tests
 *
 * Tests for the ConsolidationEngine class that identifies clusters of related
 * episodic memories based on semantic similarity.
 *
 * Requirements: 1.1, 1.2, 1.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConsolidationEngine,
  ConsolidationEngineError,
  DEFAULT_CONSOLIDATION_CONFIG,
  MIN_CLUSTER_SIZE_FOR_SUMMARY,
  type ConsolidationConfig,
  type MemoryCluster,
} from "../../../memory/consolidation-engine";

// Mock dependencies
const mockQuery = vi.fn();
const mockGetConnection = vi.fn();
const mockReleaseConnection = vi.fn();

const mockDb = {
  getConnection: mockGetConnection,
  releaseConnection: mockReleaseConnection,
  pool: { query: mockQuery },
};

const mockRetrieveEmbeddings = vi.fn();
const mockEmbeddingStorage = {
  retrieveEmbeddings: mockRetrieveEmbeddings,
};

const mockGenerate = vi.fn();
const mockLLMClient = {
  generate: mockGenerate,
};

describe("ConsolidationEngine", () => {
  let engine: ConsolidationEngine;
  let mockClient: { query: typeof mockQuery };

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = { query: mockQuery };
    mockGetConnection.mockResolvedValue(mockClient);

    engine = new ConsolidationEngine(mockDb as never, mockEmbeddingStorage as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("DEFAULT_CONSOLIDATION_CONFIG", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_CONSOLIDATION_CONFIG.similarityThreshold).toBe(0.75);
      expect(DEFAULT_CONSOLIDATION_CONFIG.minClusterSize).toBe(5);
      expect(DEFAULT_CONSOLIDATION_CONFIG.batchSize).toBe(100);
      expect(DEFAULT_CONSOLIDATION_CONFIG.strengthReductionFactor).toBe(0.5);
    });
  });

  describe("identifyClusters", () => {
    it("should throw er when userId is empty", async () => {
      await expect(engine.identifyClusters("", DEFAULT_CONSOLIDATION_CONFIG)).rejects.toThrow(
        ConsolidationEngineError
      );

      await expect(engine.identifyClusters("", DEFAULT_CONSOLIDATION_CONFIG)).rejects.toMatchObject(
        {
          code: "INVALID_INPUT",
        }
      );
    });

    it("should throw error when similarityThreshold is out of range", async () => {
      const invalidConfig: ConsolidationConfig = {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        similarityThreshold: 1.5,
      };

      await expect(engine.identifyClusters("user1", invalidConfig)).rejects.toThrow(
        ConsolidationEngineError
      );

      await expect(engine.identifyClusters("user1", invalidConfig)).rejects.toMatchObject({
        code: "INVALID_CONFIG",
      });
    });

    it("should throw error when similarityThreshold is negative", async () => {
      const invalidConfig: ConsolidationConfig = {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        similarityThreshold: -0.1,
      };

      await expect(engine.identifyClusters("user1", invalidConfig)).rejects.toThrow(
        ConsolidationEngineError
      );
    });

    it("should throw error when minClusterSize is less than 2", async () => {
      const invalidConfig: ConsolidationConfig = {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        minClusterSize: 1,
      };

      await expect(engine.identifyClusters("user1", invalidConfig)).rejects.toThrow(
        ConsolidationEngineError
      );

      await expect(engine.identifyClusters("user1", invalidConfig)).rejects.toMatchObject({
        code: "INVALID_CONFIG",
      });
    });

    it("should throw error when batchSize is less than 1", async () => {
      const invalidConfig: ConsolidationConfig = {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        batchSize: 0,
      };

      await expect(engine.identifyClusters("user1", invalidConfig)).rejects.toThrow(
        ConsolidationEngineError
      );
    });

    it("should throw error when strengthReductionFactor is out of range", async () => {
      const invalidConfig: ConsolidationConfig = {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        strengthReductionFactor: 1.5,
      };

      await expect(engine.identifyClusters("user1", invalidConfig)).rejects.toThrow(
        ConsolidationEngineError
      );
    });

    it("should return empty array when not enough memories", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: "mem1",
            content: "Test memory 1",
            created_at: new Date().toISOString(),
            last_accessed: new Date().toISOString(),
            access_count: 1,
            salience: 0.5,
            decay_rate: 0.03,
            strength: 1.0,
            user_id: "user1",
            session_id: "session1",
            primary_sector: "episodic",
            embedding_status: "complete",
          },
        ],
      });

      const clusters = await engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG);

      expect(clusters).toEqual([]);
    });

    it("should return empty array when no memories have embeddings", async () => {
      const memories = Array.from({ length: 10 }, (_, i) => ({
        id: `mem${i}`,
        content: `Test memory ${i}`,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        access_count: 1,
        salience: 0.5,
        decay_rate: 0.03,
        strength: 1.0,
        user_id: "user1",
        session_id: "session1",
        primary_sector: "episodic",
        embedding_status: "complete",
      }));

      mockQuery.mockResolvedValueOnce({ rows: memories });

      // All embeddings fail to load
      mockRetrieveEmbeddings.mockRejectedValue(new Error("No embeddings"));

      const clusters = await engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG);

      expect(clusters).toEqual([]);
    });

    it("should identify clusters of similar memories", async () => {
      // Create 6 memories that should form a cluster
      const memories = Array.from({ length: 6 }, (_, i) => ({
        id: `mem${i}`,
        content: `Similar topic about programming ${i}`,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        access_count: 1,
        salience: 0.5,
        decay_rate: 0.03,
        strength: 1.0,
        user_id: "user1",
        session_id: "session1",
        primary_sector: "episodic",
        embedding_status: "complete",
      }));

      mockQuery.mockResolvedValueOnce({ rows: memories });

      // Create identical embeddings for guaranteed clustering
      // Using identical embeddings ensures similarity = 1.0 which is > 0.9 threshold
      const baseEmbedding = Array.from({ length: 768 }, () => Math.random());
      const normalizedBase = normalizeVector(baseEmbedding);

      mockRetrieveEmbeddings.mockResolvedValue({
        semantic: normalizedBase,
        episodic: [],
        procedural: [],
        emotional: [],
        reflective: [],
      });

      const clusters = await engine.identifyClusters("user1", {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        similarityThreshold: 0.9, // High threshold
        minClusterSize: 5,
      });

      expect(clusters.length).toBeGreaterThanOrEqual(1);
      if (clusters.length > 0) {
        expect(clusters[0].memberIds.length).toBeGreaterThanOrEqual(5);
        expect(clusters[0].avgSimilarity).toBeGreaterThanOrEqual(0.9);
        expect(clusters[0].centroidId).toBeDefined();
        expect(clusters[0].topic).toBeDefined();
      }
    });

    it("should not cluster dissimilar memories", async () => {
      // Create 6 memories with very different content
      const memories = Array.from({ length: 6 }, (_, i) => ({
        id: `mem${i}`,
        content: `Completely different topic ${i}`,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        access_count: 1,
        salience: 0.5,
        decay_rate: 0.03,
        strength: 1.0,
        user_id: "user1",
        session_id: "session1",
        primary_sector: "episodic",
        embedding_status: "complete",
      }));

      mockQuery.mockResolvedValueOnce({ rows: memories });

      // Create very different embeddings (low cosine similarity)
      mockRetrieveEmbeddings.mockImplementation(() => {
        // Random orthogonal-ish embeddings
        const embedding = Array.from({ length: 768 }, () => Math.random() - 0.5);
        return Promise.resolve({
          semantic: normalizeVector(embedding),
          episodic: [],
          procedural: [],
          emotional: [],
          reflective: [],
        });
      });

      const clusters = await engine.identifyClusters("user1", {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        similarityThreshold: 0.9, // High threshold
        minClusterSize: 5,
      });

      // Should not form any clusters due to low similarity
      expect(clusters.length).toBe(0);
    });

    it("should respect minClusterSize configuration", async () => {
      // Create 4 similar memories (below default minClusterSize of 5)
      const memories = Array.from({ length: 4 }, (_, i) => ({
        id: `mem${i}`,
        content: `Similar topic ${i}`,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        access_count: 1,
        salience: 0.5,
        decay_rate: 0.03,
        strength: 1.0,
        user_id: "user1",
        session_id: "session1",
        primary_sector: "episodic",
        embedding_status: "complete",
      }));

      mockQuery.mockResolvedValueOnce({ rows: memories });

      // Create identical embeddings
      const embedding = normalizeVector(Array.from({ length: 768 }, () => Math.random()));
      mockRetrieveEmbeddings.mockResolvedValue({
        semantic: embedding,
        episodic: [],
        procedural: [],
        emotional: [],
        reflective: [],
      });

      // With minClusterSize = 5, should return no clusters
      const clustersDefault = await engine.identifyClusters("user1", {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        similarityThreshold: 0.99,
        minClusterSize: 5,
      });
      expect(clustersDefault.length).toBe(0);

      // Reset mock for second call
      mockQuery.mockResolvedValueOnce({ rows: memories });

      // With minClusterSize = 3, should return a cluster
      const clustersSmaller = await engine.identifyClusters("user1", {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        similarityThreshold: 0.99,
        minClusterSize: 3,
      });
      expect(clustersSmaller.length).toBe(1);
      expect(clustersSmaller[0].memberIds.length).toBe(4);
    });

    it("should respect similarityThreshold configuration", async () => {
      // Create 6 memories
      const memories = Array.from({ length: 6 }, (_, i) => ({
        id: `mem${i}`,
        content: `Topic ${i}`,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        access_count: 1,
        salience: 0.5,
        decay_rate: 0.03,
        strength: 1.0,
        user_id: "user1",
        session_id: "session1",
        primary_sector: "episodic",
        embedding_status: "complete",
      }));

      mockQuery.mockResolvedValueOnce({ rows: memories });

      // Create embeddings with moderate similarity (~0.8)
      const baseEmbedding = normalizeVector(Array.from({ length: 768 }, () => Math.random()));
      mockRetrieveEmbeddings.mockImplementation(() => {
        const noise = Array.from({ length: 768 }, () => (Math.random() - 0.5) * 0.3);
        const embedding = baseEmbedding.map((v, i) => v + noise[i]);
        return Promise.resolve({
          semantic: normalizeVector(embedding),
          episodic: [],
          procedural: [],
          emotional: [],
          reflective: [],
        });
      });

      // With high threshold (0.95), should not cluster
      const clustersHighThreshold = await engine.identifyClusters("user1", {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        similarityThreshold: 0.95,
        minClusterSize: 5,
      });
      expect(clustersHighThreshold.length).toBe(0);
    });

    it("should handle database errors gracefully", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database connection failed"));

      await expect(engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG)).rejects.toThrow(
        ConsolidationEngineError
      );

      await expect(
        engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG)
      ).rejects.toMatchObject({
        code: "CLUSTERING_ERROR",
      });
    });

    it("should release database connection on success", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG);

      expect(mockReleaseConnection).toHaveBeenCalledWith(mockClient);
    });

    it("should release database connection on error", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      await expect(
        engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG)
      ).rejects.toThrow();

      expect(mockReleaseConnection).toHaveBeenCalledWith(mockClient);
    });

    it("should only process episodic memories", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("primary_sector = 'episodic'"),
        expect.any(Array)
      );
    });

    it("should only process unconsolidated memories", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("consolidated_into IS NULL"),
        expect.any(Array)
      );
    });

    it("should only process memories with complete embeddings", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("embedding_status = 'complete'"),
        expect.any(Array)
      );
    });

    it("should extract topic from centroid content", async () => {
      const memories = Array.from({ length: 5 }, (_, i) => ({
        id: `mem${i}`,
        content: `This is a very long content about machine learning and artificial intelligence that should be truncated ${i}`,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        access_count: 1,
        salience: 0.5,
        decay_rate: 0.03,
        strength: 1.0,
        user_id: "user1",
        session_id: "session1",
        primary_sector: "episodic",
        embedding_status: "complete",
      }));

      mockQuery.mockResolvedValueOnce({ rows: memories });

      // Create identical embeddings for guaranteed clustering
      const embedding = normalizeVector(Array.from({ length: 768 }, () => Math.random()));
      mockRetrieveEmbeddings.mockResolvedValue({
        semantic: embedding,
        episodic: [],
        procedural: [],
        emotional: [],
        reflective: [],
      });

      const clusters = await engine.identifyClusters("user1", {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        similarityThreshold: 0.99,
        minClusterSize: 5,
      });

      expect(clusters.length).toBe(1);
      expect(clusters[0].topic).toBeDefined();
      expect(clusters[0].topic.length).toBeLessThanOrEqual(53); // 50 chars + "..."
    });
  });

  describe("generateSummary", () => {
    let engineWithLLM: ConsolidationEngine;

    beforeEach(() => {
      engineWithLLM = new ConsolidationEngine(
        mockDb as never,
        mockEmbeddingStorage as never,
        mockLLMClient as never
      );
    });

    it("should have correct MIN_CLUSTER_SIZE_FOR_SUMMARY constant", () => {
      expect(MIN_CLUSTER_SIZE_FOR_SUMMARY).toBe(5);
    });

    it("should throw error when cluster has fewer than 5 memories", async () => {
      const smallCluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4"], // Only 4 members
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      await expect(engineWithLLM.generateSummary(smallCluster)).rejects.toThrow(
        ConsolidationEngineError
      );

      await expect(engineWithLLM.generateSummary(smallCluster)).rejects.toMatchObject({
        code: "CLUSTER_TOO_SMALL",
        context: {
          clusterSize: 4,
          minRequired: 5,
        },
      });
    });

    it("should throw error when LLM client is not configured", async () => {
      const engineWithoutLLM = new ConsolidationEngine(
        mockDb as never,
        mockEmbeddingStorage as never
      );

      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      await expect(engineWithoutLLM.generateSummary(cluster)).rejects.toThrow(
        ConsolidationEngineError
      );

      await expect(engineWithoutLLM.generateSummary(cluster)).rejects.toMatchObject({
        code: "LLM_NOT_CONFIGURED",
      });
    });

    it("should generate summary for cluster with 5+ memories", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Machine learning concepts",
      };

      // Mock database query to return memory contents
      mockQuery.mockResolvedValueOnce({
        rows: [
          { content: "Memory about neural networks" },
          { content: "Memory about deep learning" },
          { content: "Memory about backpropagation" },
          { content: "Memory about gradient descent" },
          { content: "Memory about activation functions" },
        ],
      });

      // Mock LLM response
      mockGenerate.mockResolvedValueOnce(
        "This is a consolidated summary about machine learning concepts including neural networks, deep learning, and optimization techniques."
      );

      const summary = await engineWithLLM.generateSummary(cluster);

      expect(summary).toBe(
        "This is a consolidated summary about machine learning concepts including neural networks, deep learning, and optimization techniques."
      );
      expect(mockGenerate).toHaveBeenCalledTimes(1);
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.stringContaining("Machine learning concepts"),
        expect.stringContaining("memory consolidation assistant")
      );
    });

    it("should throw error when no memory contents found", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      // Mock database query to return empty results
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(engineWithLLM.generateSummary(cluster)).rejects.toThrow(
        ConsolidationEngineError
      );

      // Reset mock for second assertion
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(engineWithLLM.generateSummary(cluster)).rejects.toMatchObject({
        code: "NO_MEMORY_CONTENTS",
      });
    });

    it("should throw error when LLM generation fails", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      // Mock database query to return memory contents
      mockQuery.mockResolvedValueOnce({
        rows: [
          { content: "Memory 1" },
          { content: "Memory 2" },
          { content: "Memory 3" },
          { content: "Memory 4" },
          { content: "Memory 5" },
        ],
      });

      // Mock LLM failure
      mockGenerate.mockRejectedValueOnce(new Error("LLM service unavailable"));

      await expect(engineWithLLM.generateSummary(cluster)).rejects.toThrow(
        ConsolidationEngineError
      );

      // Reset mocks for second assertion
      mockQuery.mockResolvedValueOnce({
        rows: [
          { content: "Memory 1" },
          { content: "Memory 2" },
          { content: "Memory 3" },
          { content: "Memory 4" },
          { content: "Memory 5" },
        ],
      });
      mockGenerate.mockRejectedValueOnce(new Error("LLM service unavailable"));

      await expect(engineWithLLM.generateSummary(cluster)).rejects.toMatchObject({
        code: "LLM_GENERATION_ERROR",
      });
    });

    it("should release database connection on success", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          { content: "Memory 1" },
          { content: "Memory 2" },
          { content: "Memory 3" },
          { content: "Memory 4" },
          { content: "Memory 5" },
        ],
      });

      mockGenerate.mockResolvedValueOnce("Generated summary");

      await engineWithLLM.generateSummary(cluster);

      expect(mockReleaseConnection).toHaveBeenCalledWith(mockClient);
    });

    it("should release database connection on error", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      await expect(engineWithLLM.generateSummary(cluster)).rejects.toThrow();

      expect(mockReleaseConnection).toHaveBeenCalledWith(mockClient);
    });

    it("should trim whitespace from generated summary", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          { content: "Memory 1" },
          { content: "Memory 2" },
          { content: "Memory 3" },
          { content: "Memory 4" },
          { content: "Memory 5" },
        ],
      });

      mockGenerate.mockResolvedValueOnce("  Summary with whitespace  \n\n");

      const summary = await engineWithLLM.generateSummary(cluster);

      expect(summary).toBe("Summary with whitespace");
    });

    it("should allow setting LLM client after construction", async () => {
      const engineWithoutLLM = new ConsolidationEngine(
        mockDb as never,
        mockEmbeddingStorage as never
      );

      // Initially should fail
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      await expect(engineWithoutLLM.generateSummary(cluster)).rejects.toMatchObject({
        code: "LLM_NOT_CONFIGURED",
      });

      // Set LLM client
      engineWithoutLLM.setLLMClient(mockLLMClient as never);

      // Now should work
      mockQuery.mockResolvedValueOnce({
        rows: [
          { content: "Memory 1" },
          { content: "Memory 2" },
          { content: "Memory 3" },
          { content: "Memory 4" },
          { content: "Memory 5" },
        ],
      });

      mockGenerate.mockResolvedValueOnce("Generated summary");

      const summary = await engineWithoutLLM.generateSummary(cluster);
      expect(summary).toBe("Generated summary");
    });

    it("should include all memory contents in LLM prompt", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          { content: "First memory content" },
          { content: "Second memory content" },
          { content: "Third memory content" },
          { content: "Fourth memory content" },
          { content: "Fifth memory content" },
        ],
      });

      mockGenerate.mockResolvedValueOnce("Generated summary");

      await engineWithLLM.generateSummary(cluster);

      // Verify all memory contents are included in the prompt
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.stringContaining("First memory content"),
        expect.any(String)
      );
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.stringContaining("Fifth memory content"),
        expect.any(String)
      );
    });
  });

  describe("consolidate", () => {
    let engineWithLLM: ConsolidationEngine;
    let mockBeginTransaction: ReturnType<typeof vi.fn>;
    let mockCommitTransaction: ReturnType<typeof vi.fn>;
    let mockRollbackTransaction: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockBeginTransaction = vi.fn();
      mockCommitTransaction = vi.fn();
      mockRollbackTransaction = vi.fn();

      const mockDbWithTransactions = {
        ...mockDb,
        beginTransaction: mockBeginTransaction,
        commitTransaction: mockCommitTransaction,
        rollbackTransaction: mockRollbackTransaction,
      };

      mockBeginTransaction.mockResolvedValue(mockClient);
      mockCommitTransaction.mockResolvedValue(undefined);
      mockRollbackTransaction.mockResolvedValue(undefined);

      engineWithLLM = new ConsolidationEngine(
        mockDbWithTransactions as never,
        mockEmbeddingStorage as never,
        mockLLMClient as never
      );
    });

    it("should throw error when cluster has fewer than 5 memories", async () => {
      const smallCluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4"], // Only 4 members
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      await expect(engineWithLLM.consolidate(smallCluster)).rejects.toThrow(
        ConsolidationEngineError
      );

      await expect(engineWithLLM.consolidate(smallCluster)).rejects.toMatchObject({
        code: "CLUSTER_TOO_SMALL",
      });
    });

    it("should create summary memory with correct properties", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Machine learning",
      };

      // Mock generateSummary dependencies (memory contents query)
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { content: "Memory 1" },
            { content: "Memory 2" },
            { content: "Memory 3" },
            { content: "Memory 4" },
            { content: "Memory 5" },
          ],
        })
        // Mock user_id query
        .mockResolvedValueOnce({
          rows: [{ user_id: "user1", session_id: "session1" }],
        })
        // Mock INSERT for summary memory
        .mockResolvedValueOnce({ rowCount: 1 })
        // Mock INSERT for metadata
        .mockResolvedValueOnce({ rowCount: 1 })
        // Mock INSERT for links (10 links: 5 forward + 5 reverse)
        .mockResolvedValue({ rowCount: 1 });

      mockGenerate.mockResolvedValueOnce("Consolidated summary about machine learning");

      const result = await engineWithLLM.consolidate(cluster);

      expect(result.summaryId).toBeDefined();
      expect(result.consolidatedIds).toEqual(cluster.memberIds);
      expect(result.summaryContent).toBe("Consolidated summary about machine learning");
      expect(result.consolidatedAt).toBeInstanceOf(Date);

      // Verify summary memory was inserted with correct sector
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO memories"),
        expect.arrayContaining(["semantic"]) // Summary should be semantic type
      );
    });

    it("should create graph links from summary to all original memories", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      // Setup mocks
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { content: "Memory 1" },
            { content: "Memory 2" },
            { content: "Memory 3" },
            { content: "Memory 4" },
            { content: "Memory 5" },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: "user1", session_id: "session1" }],
        })
        .mockResolvedValue({ rowCount: 1 });

      mockGenerate.mockResolvedValueOnce("Generated summary");

      await engineWithLLM.consolidate(cluster);

      // Verify links were created (should have INSERT INTO memory_links calls)
      const linkInsertCalls = mockQuery.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("INSERT INTO memory_links")
      );

      // Should have 10 link inserts (5 forward + 5 reverse for bidirectional)
      expect(linkInsertCalls.length).toBe(10);
    });

    it("should reduce strength of original memories", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      // Setup mocks
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { content: "Memory 1" },
            { content: "Memory 2" },
            { content: "Memory 3" },
            { content: "Memory 4" },
            { content: "Memory 5" },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: "user1", session_id: "session1" }],
        })
        .mockResolvedValue({ rowCount: 1 });

      mockGenerate.mockResolvedValueOnce("Generated summary");

      await engineWithLLM.consolidate(cluster);

      // Verify UPDATE was called to reduce strength
      const updateCalls = mockQuery.mock.calls.filter(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("UPDATE memories") &&
          call[0].includes("strength = strength *")
      );

      expect(updateCalls.length).toBe(1);
      // Default strength reduction factor is 0.5
      expect(updateCalls[0][1]).toContain(0.5);
    });

    it("should record consolidation in history table", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      // Setup mocks
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { content: "Memory 1" },
            { content: "Memory 2" },
            { content: "Memory 3" },
            { content: "Memory 4" },
            { content: "Memory 5" },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: "user1", session_id: "session1" }],
        })
        .mockResolvedValue({ rowCount: 1 });

      mockGenerate.mockResolvedValueOnce("Generated summary");

      await engineWithLLM.consolidate(cluster);

      // Verify consolidation history was recorded
      const historyCalls = mockQuery.mock.calls.filter(
        (call) =>
          typeof call[0] === "string" && call[0].includes("INSERT INTO consolidation_history")
      );

      expect(historyCalls.length).toBe(1);
      expect(historyCalls[0][1]).toContain("user1");
      expect(historyCalls[0][1]).toContain(cluster.memberIds);
    });

    it("should commit transaction on success", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      // Setup mocks
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { content: "Memory 1" },
            { content: "Memory 2" },
            { content: "Memory 3" },
            { content: "Memory 4" },
            { content: "Memory 5" },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: "user1", session_id: "session1" }],
        })
        .mockResolvedValue({ rowCount: 1 });

      mockGenerate.mockResolvedValueOnce("Generated summary");

      await engineWithLLM.consolidate(cluster);

      expect(mockBeginTransaction).toHaveBeenCalled();
      expect(mockCommitTransaction).toHaveBeenCalled();
      expect(mockRollbackTransaction).not.toHaveBeenCalled();
    });

    it("should rollback transaction on error", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      // Setup mocks - generateSummary succeeds but user query fails
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { content: "Memory 1" },
            { content: "Memory 2" },
            { content: "Memory 3" },
            { content: "Memory 4" },
            { content: "Memory 5" },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // No user found - will cause error

      mockGenerate.mockResolvedValueOnce("Generated summary");

      await expect(engineWithLLM.consolidate(cluster)).rejects.toThrow(ConsolidationEngineError);

      expect(mockBeginTransaction).toHaveBeenCalled();
      expect(mockRollbackTransaction).toHaveBeenCalled();
      expect(mockCommitTransaction).not.toHaveBeenCalled();
    });

    it("should throw error when centroid memory not found", async () => {
      const cluster: MemoryCluster = {
        centroidId: "nonexistent",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      // Setup mocks
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { content: "Memory 1" },
            { content: "Memory 2" },
            { content: "Memory 3" },
            { content: "Memory 4" },
            { content: "Memory 5" },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // Centroid not found

      mockGenerate.mockResolvedValueOnce("Generated summary");

      await expect(engineWithLLM.consolidate(cluster)).rejects.toMatchObject({
        code: "CENTROID_NOT_FOUND",
      });
    });

    it("should use custom config for strength reduction", async () => {
      const cluster: MemoryCluster = {
        centroidId: "mem1",
        memberIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
        avgSimilarity: 0.85,
        topic: "Test topic",
      };

      const customConfig = {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        strengthReductionFactor: 0.3, // Custom reduction factor
      };

      // Setup mocks
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { content: "Memory 1" },
            { content: "Memory 2" },
            { content: "Memory 3" },
            { content: "Memory 4" },
            { content: "Memory 5" },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: "user1", session_id: "session1" }],
        })
        .mockResolvedValue({ rowCount: 1 });

      mockGenerate.mockResolvedValueOnce("Generated summary");

      await engineWithLLM.consolidate(cluster, customConfig);

      // Verify UPDATE was called with custom strength reduction factor
      const updateCalls = mockQuery.mock.calls.filter(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("UPDATE memories") &&
          call[0].includes("strength = strength *")
      );

      expect(updateCalls.length).toBe(1);
      expect(updateCalls[0][1]).toContain(0.3); // Custom factor
    });
  });

  describe("runConsolidation", () => {
    let engineWithLLM: ConsolidationEngine;
    let mockBeginTransaction: ReturnType<typeof vi.fn>;
    let mockCommitTransaction: ReturnType<typeof vi.fn>;
    let mockRollbackTransaction: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockBeginTransaction = vi.fn();
      mockCommitTransaction = vi.fn();
      mockRollbackTransaction = vi.fn();

      const mockDbWithTransactions = {
        ...mockDb,
        beginTransaction: mockBeginTransaction,
        commitTransaction: mockCommitTransaction,
        rollbackTransaction: mockRollbackTransaction,
      };

      mockBeginTransaction.mockResolvedValue(mockClient);
      mockCommitTransaction.mockResolvedValue(undefined);
      mockRollbackTransaction.mockResolvedValue(undefined);

      engineWithLLM = new ConsolidationEngine(
        mockDbWithTransactions as never,
        mockEmbeddingStorage as never,
        mockLLMClient as never
      );
    });

    it("should throw error when userId is empty", async () => {
      await expect(engineWithLLM.runConsolidation("")).rejects.toThrow(ConsolidationEngineError);

      await expect(engineWithLLM.runConsolidation("")).rejects.toMatchObject({
        code: "INVALID_INPUT",
      });
    });

    it("should return empty array when no clusters found", async () => {
      // Mock identifyClusters to return no clusters
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await engineWithLLM.runConsolidation("user1");

      expect(results).toEqual([]);
    });

    it("should consolidate all identified clusters", async () => {
      // Create 6 memories that should form a cluster
      const memories = Array.from({ length: 6 }, (_, i) => ({
        id: `mem${i}`,
        content: `Similar topic ${i}`,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        access_count: 1,
        salience: 0.5,
        decay_rate: 0.03,
        strength: 1.0,
        user_id: "user1",
        session_id: "session1",
        primary_sector: "episodic",
        embedding_status: "complete",
      }));

      // Mock identifyClusters query
      mockQuery.mockResolvedValueOnce({ rows: memories });

      // Create identical embeddings for guaranteed clustering
      const embedding = normalizeVector(Array.from({ length: 768 }, () => Math.random()));
      mockRetrieveEmbeddings.mockResolvedValue({
        semantic: embedding,
        episodic: [],
        procedural: [],
        emotional: [],
        reflective: [],
      });

      // Mock consolidate dependencies
      mockQuery
        // generateSummary memory contents
        .mockResolvedValueOnce({
          rows: memories.map((m) => ({ content: m.content })),
        })
        // user_id query
        .mockResolvedValueOnce({
          rows: [{ user_id: "user1", session_id: "session1" }],
        })
        // All other queries succeed
        .mockResolvedValue({ rowCount: 1 });

      mockGenerate.mockResolvedValueOnce("Consolidated summary");

      const results = await engineWithLLM.runConsolidation("user1", {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        similarityThreshold: 0.99,
        minClusterSize: 5,
      });

      expect(results.length).toBe(1);
      expect(results[0].summaryContent).toBe("Consolidated summary");
    });

    it("should continue with other clusters if one fails", async () => {
      // This test verifies that runConsolidation continues processing
      // even if one cluster fails to consolidate

      // Mock identifyClusters to return empty (no clusters)
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await engineWithLLM.runConsolidation("user1");

      // Should return empty array without throwing
      expect(results).toEqual([]);
    });
  });

  describe("Database Schema Edge Cases", () => {
    it("should handle missing consolidated_into column gracefully", async () => {
      // First query fails due to missing column
      const schemaError = new Error('column "consolidated_into" does not exist');
      mockQuery
        .mockRejectedValueOnce(schemaError)
        // Fallback query succeeds with no memories
        .mockResolvedValueOnce({ rows: [] });

      const clusters = await engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG);

      // Should return empty array instead of throwing
      expect(clusters).toEqual([]);
      // Should have attempted fallback query
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it("should handle missing embedding_status column gracefully", async () => {
      // First query fails due to missing column
      const schemaError = new Error('column "embedding_status" does not exist');
      mockQuery
        .mockRejectedValueOnce(schemaError)
        // Fallback query succeeds with no memories
        .mockResolvedValueOnce({ rows: [] });

      const clusters = await engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG);

      // Should return empty array instead of throwing
      expect(clusters).toEqual([]);
    });

    it("should use fallback query when schema columns are missing", async () => {
      // First query fails due to missing column
      const schemaError = new Error('column "consolidated_into" does not exist');

      // Create memories for fallback query
      const memories = Array.from({ length: 6 }, (_, i) => ({
        id: `mem${i}`,
        content: `Test memory ${i}`,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        access_count: 1,
        salience: 0.5,
        decay_rate: 0.03,
        strength: 1.0,
        user_id: "user1",
        session_id: "session1",
        primary_sector: "episodic",
        // Note: no embedding_status in fallback
      }));

      mockQuery
        .mockRejectedValueOnce(schemaError)
        // Fallback query succeeds with memories
        .mockResolvedValueOnce({ rows: memories });

      // Create identical embeddings for guaranteed clustering
      const embedding = normalizeVector(Array.from({ length: 768 }, () => Math.random()));
      mockRetrieveEmbeddings.mockResolvedValue({
        semantic: embedding,
        episodic: [],
        procedural: [],
        emotional: [],
        reflective: [],
      });

      const clusters = await engine.identifyClusters("user1", {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        similarityThreshold: 0.99,
        minClusterSize: 5,
      });

      // Should successfully identify clusters using fallback query
      expect(clusters.length).toBe(1);
      expect(clusters[0].memberIds.length).toBe(6);
    });

    it("should return empty array when both queries fail", async () => {
      // First query fails due to missing column
      const schemaError = new Error('column "consolidated_into" does not exist');
      // Fallback query also fails
      const fallbackError = new Error("Database connection lost");

      mockQuery.mockRejectedValueOnce(schemaError).mockRejectedValueOnce(fallbackError);

      const clusters = await engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG);

      // Should return empty array instead of throwing
      expect(clusters).toEqual([]);
    });

    it("should re-throw non-schema related database errors", async () => {
      // Query fails due to non-schema error
      const dbError = new Error("Connection refused");
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG)).rejects.toThrow(
        ConsolidationEngineError
      );

      await expect(
        engine.identifyClusters("user1", DEFAULT_CONSOLIDATION_CONFIG)
      ).rejects.toMatchObject({
        code: "CLUSTERING_ERROR",
      });
    });
  });
});

/**
 * Helper function to normalize a vector to unit length
 */
function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vec;
  return vec.map((v) => v / magnitude);
}
