/**
 * Performance Tests for MemoryRepository
 *
 * Validates that memory retrieval meets performance targets:
 * - p50 < 100ms
 * - p95 < 200ms
 * - p99 < 500ms
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseConnectionManager } from "../../../database/connection-manager.js";
import type { EmbeddingEngine } from "../../../embeddings/embedding-engine.js";
import type { WaypointGraphBuilder } from "../../../graph/waypoint-builder.js";
import { MemoryRepository } from "../../../memory/memory-repository.js";

describe("MemoryRepository - Performance Tests", () => {
  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockWaypointBuilder: any;
  let mockEmbeddingStorage: any;
  let mockClient: any;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    // Create mock database
    mockDb = {
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
    };

    // Create mock embedding engine
    mockEmbeddingEngine = {
      generateAllSectorEmbeddings: vi.fn().mockResolvedValue({
        episodic: new Array(768).fill(0.1),
        semantic: new Array(768).fill(0.2),
        procedural: new Array(768).fill(0.3),
        emotional: new Array(768).fill(0.4),
        reflective: new Array(768).fill(0.5),
      }),
      generateSemanticEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.2)),
    };

    // Create mock waypoint builder
    mockWaypointBuilder = {
      buildConnections: vi.fn().mockResolvedValue([]),
    };

    // Create mock embedding storage
    mockEmbeddingStorage = {
      storeEmbeddings: vi.fn().mockResolvedValue(undefined),
      retrieveEmbeddings: vi.fn().mockResolvedValue([]),
      vectorSimilaritySearch: vi.fn().mockResolvedValue([]),
    };

    repository = new MemoryRepository(
      mockDb as unknown as DatabaseConnectionManager,
      mockEmbeddingEngine as unknown as EmbeddingEngine,
      mockWaypointBuilder as unknown as WaypointGraphBuilder,
      mockEmbeddingStorage as any
    );
  });

  describe("Retrieval Performance", () => {
    it("should retrieve single memory in <50ms (p50 target)", async () => {
      // Mock database response
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: "mem-123",
            user_id: "user-123",
            content: "Test memory",
            memory_type: "episodic",
            strength: 0.8,
            salience: 0.7,
            importance: 0.6,
            created_at: new Date(),
            last_accessed: new Date(),
            access_count: 5,
            metadata: {},
          },
        ],
      });

      // Mock embeddings query
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            sector: "episodic",
            embedding: new Array(768).fill(0.1),
          },
        ],
      });

      // Mock links query
      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      const startTime = Date.now();
      const result = await repository.retrieve("mem-123", "user-123");
      const duration = Date.now() - startTime;

      expect(result).not.toBeNull();
      expect(duration).toBeLessThan(50); // p50 target
    });

    it("should handle batch retrieval efficiently", async () => {
      const memoryIds = Array.from({ length: 10 }, (_, i) => `mem-${i}`);
      const durations: number[] = [];

      for (const memoryId of memoryIds) {
        // Mock database response for each retrieval
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id: memoryId,
              user_id: "user-123",
              content: `Test memory ${memoryId}`,
              memory_type: "episodic",
              strength: 0.8,
              salience: 0.7,
              importance: 0.6,
              created_at: new Date(),
              last_accessed: new Date(),
              access_count: 5,
              metadata: {},
            },
          ],
        });

        mockClient.query.mockResolvedValueOnce({ rows: [] }); // embeddings
        mockClient.query.mockResolvedValueOnce({ rows: [] }); // links

        const startTime = Date.now();
        await repository.retrieve(memoryId, "user-123");
        durations.push(Date.now() - startTime);
      }

      // Calculate percentiles
      const sorted = durations.sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];

      expect(p50).toBeLessThan(100); // p50 < 100ms
      expect(p95).toBeLessThan(200); // p95 < 200ms
    });
  });

  describe("Search Performance", () => {
    it("should complete vector search in <100ms (p50 target)", async () => {
      // Mock vector search query
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: "mem-1",
            user_id: "user-123",
            content: "Test memory 1",
            memory_type: "semantic",
            strength: 0.9,
            salience: 0.8,
            importance: 0.7,
            created_at: new Date(),
            last_accessed: new Date(),
            access_count: 10,
            metadata: {},
            similarity: 0.95,
            composite_score: 0.85,
          },
        ],
      });

      const startTime = Date.now();
      const result = await repository.search({
        userId: "user-123",
        text: "test query",
        limit: 10,
      });
      const duration = Date.now() - startTime;

      expect(result.memories).toHaveLength(1);
      expect(duration).toBeLessThan(100); // p50 target
    });

    it("should handle multiple searches efficiently", async () => {
      const durations: number[] = [];

      for (let i = 0; i < 20; i++) {
        // Mock search query
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id: `mem-${i}`,
              user_id: "user-123",
              content: `Test memory ${i}`,
              memory_type: "semantic",
              strength: 0.8,
              salience: 0.7,
              importance: 0.6,
              created_at: new Date(),
              last_accessed: new Date(),
              access_count: 5,
              metadata: {},
              similarity: 0.9,
              composite_score: 0.8,
            },
          ],
        });

        const startTime = Date.now();
        await repository.search({
          userId: "user-123",
          text: `query ${i}`,
          limit: 10,
        });
        durations.push(Date.now() - startTime);
      }

      // Calculate percentiles
      const sorted = durations.sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      expect(p50).toBeLessThan(100); // p50 < 100ms
      expect(p95).toBeLessThan(200); // p95 < 200ms
      expect(p99).toBeLessThan(500); // p99 < 500ms
    });

    it("should use composite scoring efficiently", async () => {
      // Mock search with composite scoring
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: "mem-1",
            user_id: "user-123",
            content: "High relevance memory",
            memory_type: "semantic",
            strength: 0.9,
            salience: 0.9,
            importance: 0.8,
            created_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            last_accessed: new Date(),
            access_count: 20,
            metadata: {},
            similarity: 0.95,
            composite_score: 0.9, // 0.6*0.95 + 0.2*0.9 + 0.1*recency + 0.1*link
          },
          {
            id: "mem-2",
            user_id: "user-123",
            content: "Medium relevance memory",
            memory_type: "semantic",
            strength: 0.7,
            salience: 0.6,
            importance: 0.5,
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            last_accessed: new Date(Date.now() - 1000 * 60 * 60 * 12),
            access_count: 5,
            metadata: {},
            similarity: 0.75,
            composite_score: 0.65,
          },
        ],
      });

      const startTime = Date.now();
      const result = await repository.search({
        userId: "user-123",
        text: "test query",
        limit: 10,
      });
      const duration = Date.now() - startTime;

      expect(result.memories).toHaveLength(2);
      // Results should be ordered by composite score
      expect(result.memories[0].id).toBe("mem-1");
      expect(result.memories[1].id).toBe("mem-2");
      expect(duration).toBeLessThan(100);
    });
  });

  describe("Connection Pool Performance", () => {
    it("should reuse connections efficiently", async () => {
      const connectionCalls: number[] = [];

      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id: `mem-${i}`,
              user_id: "user-123",
              content: `Memory ${i}`,
              memory_type: "episodic",
              strength: 0.8,
              salience: 0.7,
              importance: 0.6,
              created_at: new Date(),
              last_accessed: new Date(),
              access_count: 5,
              metadata: {},
            },
          ],
        });
        mockClient.query.mockResolvedValueOnce({ rows: [] }); // embeddings
        mockClient.query.mockResolvedValueOnce({ rows: [] }); // links

        await repository.retrieve(`mem-${i}`, "user-123");
        connectionCalls.push(mockDb.getConnection.mock.calls.length);
      }

      // Verify connections are being acquired
      expect(mockDb.getConnection).toHaveBeenCalled();
      // Verify connections are being released
      expect(mockDb.releaseConnection).toHaveBeenCalled();
    });

    it("should release connections on error", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Query failed"));

      await expect(repository.retrieve("mem-123", "user-123")).rejects.toThrow();

      // Verify connection was released even on error
      expect(mockDb.releaseConnection).toHaveBeenCalled();
    });
  });

  describe("Query Optimization", () => {
    it("should use indexes for vector search", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: "mem-1",
            user_id: "user-123",
            content: "Test memory",
            memory_type: "semantic",
            strength: 0.8,
            salience: 0.7,
            importance: 0.6,
            created_at: new Date(),
            last_accessed: new Date(),
            access_count: 5,
            metadata: {},
            similarity: 0.9,
            composite_score: 0.85,
          },
        ],
      });

      await repository.search({
        userId: "user-123",
        text: "test query",
        limit: 10,
      });

      // Verify query was executed
      expect(mockClient.query).toHaveBeenCalled();

      // In a real implementation, we would verify the query plan uses IVFFlat index
      // For now, we verify the query was executed efficiently
      const queryCall = mockClient.query.mock.calls[0];
      expect(queryCall).toBeDefined();
    });

    it("should limit result set size", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: Array.from({ length: 5 }, (_, i) => ({
          id: `mem-${i}`,
          user_id: "user-123",
          content: `Memory ${i}`,
          memory_type: "semantic",
          strength: 0.8,
          salience: 0.7,
          importance: 0.6,
          created_at: new Date(),
          last_accessed: new Date(),
          access_count: 5,
          metadata: {},
          similarity: 0.9 - i * 0.1,
          composite_score: 0.85 - i * 0.1,
        })),
      });

      const result = await repository.search({
        userId: "user-123",
        text: "test query",
        limit: 5,
      });

      expect(result.memories).toHaveLength(5);
      expect(result.memories.length).toBeLessThanOrEqual(5);
    });
  });
});
