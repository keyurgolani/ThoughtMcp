/**
 * Unit Tests for VectorSearchEngine
 *
 * Tests vector similarity search using pgvector with sector-specific embeddings.
 * Follows TDD principles: tests written first, then implementation.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseConnectionManager } from "../../../database/connection-manager";
import { MemorySector } from "../../../embeddings/types";
import { VectorSearchEngine } from "../../../search/vector-search-engine";

describe("VectorSearchEngine", () => {
  let engine: VectorSearchEngine;
  let mockDb: DatabaseConnectionManager;
  let mockPool: {
    query: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create mock pool
    mockPool = {
      query: vi.fn(),
    };

    // Create mock database manager
    mockDb = {
      pool: mockPool,
      getConnection: vi.fn(),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    engine = new VectorSearchEngine(mockDb);
  });

  describe("searchByEmbedding", () => {
    it("should search by embedding in specific sector", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);
      const sector = MemorySector.Semantic;

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            sector: "semantic",
            similarity: 0.95,
          },
          {
            memory_id: "mem2",
            sector: "semantic",
            similarity: 0.85,
          },
        ],
      });

      const results = await engine.searchByEmbedding(queryEmbedding, sector, 10);

      expect(results).toHaveLength(2);
      expect(results[0].memoryId).toBe("mem1");
      expect(results[0].similarity).toBe(0.95);
      expect(results[1].memoryId).toBe("mem2");
      expect(results[1].similarity).toBe(0.85);

      // Verify query uses pgvector cosine similarity operator
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("<=>"),
        expect.arrayContaining([JSON.stringify(queryEmbedding), sector, 10])
      );
    });

    it("should apply minimum similarity threshold", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);
      const sector = MemorySector.Episodic;
      const threshold = 0.7;

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            sector: "episodic",
            similarity: 0.85,
          },
        ],
      });

      await engine.searchByEmbedding(queryEmbedding, sector, 10, threshold);

      // Verify threshold is applied in query
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("1 - (embedding <=> $1::vector) >= $3"),
        expect.arrayContaining([JSON.stringify(queryEmbedding), sector, threshold, 10])
      );
    });

    it("should respect result limit", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);
      const sector = MemorySector.Procedural;
      const limit = 5;

      mockPool.query.mockResolvedValue({
        rows: [],
      });

      await engine.searchByEmbedding(queryEmbedding, sector, limit);

      // Verify LIMIT clause
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("LIMIT $4"),
        expect.arrayContaining([JSON.stringify(queryEmbedding), sector, 0.0, limit])
      );
    });

    it("should return empty array when no results", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);
      const sector = MemorySector.Emotional;

      mockPool.query.mockResolvedValue({
        rows: [],
      });

      const results = await engine.searchByEmbedding(queryEmbedding, sector, 10);

      expect(results).toEqual([]);
    });

    it("should throw error for invalid embedding", async () => {
      const invalidEmbedding: number[] = [];
      const sector = MemorySector.Semantic;

      await expect(engine.searchByEmbedding(invalidEmbedding, sector, 10)).rejects.toThrow(
        "Embedding must be a non-empty array"
      );
    });

    it("should throw error for invalid limit", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);
      const sector = MemorySector.Semantic;

      await expect(engine.searchByEmbedding(queryEmbedding, sector, 0)).rejects.toThrow(
        "Limit must be at least 1"
      );

      await expect(engine.searchByEmbedding(queryEmbedding, sector, -5)).rejects.toThrow(
        "Limit must be at least 1"
      );
    });

    it("should throw error for invalid threshold", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);
      const sector = MemorySector.Semantic;

      await expect(engine.searchByEmbedding(queryEmbedding, sector, 10, -0.1)).rejects.toThrow(
        "Threshold must be between 0 and 1"
      );

      await expect(engine.searchByEmbedding(queryEmbedding, sector, 10, 1.5)).rejects.toThrow(
        "Threshold must be between 0 and 1"
      );
    });

    it("should handle database errors gracefully", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);
      const sector = MemorySector.Semantic;

      mockPool.query.mockRejectedValue(new Error("Database connection failed"));

      await expect(engine.searchByEmbedding(queryEmbedding, sector, 10)).rejects.toThrow(
        "Vector search failed"
      );
    });
  });

  describe("searchByMemoryId", () => {
    it("should search using a memory's embedding", async () => {
      const memoryId = "mem123";
      const sector = MemorySector.Semantic;

      // Mock retrieving the memory's embedding
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            embedding: JSON.stringify(new Array(1536).fill(0.2)),
          },
        ],
      });

      // Mock similarity search results
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            memory_id: "mem456",
            sector: "semantic",
            similarity: 0.92,
          },
        ],
      });

      const results = await engine.searchByMemoryId(memoryId, sector, 10);

      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem456");
      expect(results[0].similarity).toBe(0.92);

      // Verify two queries: one to get embedding, one to search
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it("should throw error when memory has no embedding", async () => {
      const memoryId = "mem123";
      const sector = MemorySector.Semantic;

      mockPool.query.mockResolvedValue({
        rows: [],
      });

      await expect(engine.searchByMemoryId(memoryId, sector, 10)).rejects.toThrow(
        "No embedding found for memory"
      );
    });

    it("should throw error for invalid memory ID", async () => {
      const sector = MemorySector.Semantic;

      await expect(engine.searchByMemoryId("", sector, 10)).rejects.toThrow(
        "Memory ID must be a non-empty string"
      );
    });

    it("should exclude the source memory from results", async () => {
      const memoryId = "mem123";
      const sector = MemorySector.Semantic;

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            embedding: JSON.stringify(new Array(1536).fill(0.2)),
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            memory_id: "mem456",
            sector: "semantic",
            similarity: 0.92,
          },
        ],
      });

      await engine.searchByMemoryId(memoryId, sector, 10);

      // Verify query excludes source memory
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("memory_id != $5"),
        expect.arrayContaining([memoryId])
      );
    });
  });

  describe("sector-specific search", () => {
    it("should search in episodic sector", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            sector: "episodic",
            similarity: 0.88,
          },
        ],
      });

      const results = await engine.searchByEmbedding(queryEmbedding, MemorySector.Episodic, 10);

      expect(results[0].sector).toBe(MemorySector.Episodic);
    });

    it("should search in procedural sector", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            sector: "procedural",
            similarity: 0.82,
          },
        ],
      });

      const results = await engine.searchByEmbedding(queryEmbedding, MemorySector.Procedural, 10);

      expect(results[0].sector).toBe(MemorySector.Procedural);
    });

    it("should search in emotional sector", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            sector: "emotional",
            similarity: 0.79,
          },
        ],
      });

      const results = await engine.searchByEmbedding(queryEmbedding, MemorySector.Emotional, 10);

      expect(results[0].sector).toBe(MemorySector.Emotional);
    });

    it("should search in reflective sector", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);

      mockPool.query.mockResolvedValue({
        rows: [
          {
            memory_id: "mem1",
            sector: "reflective",
            similarity: 0.91,
          },
        ],
      });

      const results = await engine.searchByEmbedding(queryEmbedding, MemorySector.Reflective, 10);

      expect(results[0].sector).toBe(MemorySector.Reflective);
    });
  });

  describe("performance and optimization", () => {
    it("should use IVFFlat index for vector search", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);
      const sector = MemorySector.Semantic;

      mockPool.query.mockResolvedValue({
        rows: [],
      });

      await engine.searchByEmbedding(queryEmbedding, sector, 10);

      // Verify query structure supports index usage
      const call = mockPool.query.mock.calls[0];
      const sql = call[0] as string;

      // Should use cosine distance operator which uses IVFFlat index
      expect(sql).toContain("<=> $1::vector");
      // Should order by distance (which uses index)
      expect(sql).toContain("ORDER BY embedding <=> $1::vector");
    });

    it("should handle large result sets efficiently", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);
      const sector = MemorySector.Semantic;
      const limit = 1000;

      const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
        memory_id: `mem${i}`,
        sector: "semantic",
        similarity: 0.9 - i * 0.0001,
      }));

      mockPool.query.mockResolvedValue({
        rows: largeResultSet,
      });

      const results = await engine.searchByEmbedding(queryEmbedding, sector, limit);

      expect(results).toHaveLength(1000);
      // Results should be ordered by similarity (descending)
      expect(results[0].similarity).toBeGreaterThan(results[999].similarity);
    });
  });

  describe("error handling", () => {
    it("should throw error when database is not connected", async () => {
      const disconnectedDb = {
        pool: null,
      } as unknown as DatabaseConnectionManager;

      const disconnectedEngine = new VectorSearchEngine(disconnectedDb);
      const queryEmbedding = new Array(1536).fill(0.1);

      await expect(
        disconnectedEngine.searchByEmbedding(queryEmbedding, MemorySector.Semantic, 10)
      ).rejects.toThrow("Database not connected");
    });

    it("should provide helpful error messages", async () => {
      const queryEmbedding = new Array(1536).fill(0.1);
      const sector = MemorySector.Semantic;

      mockPool.query.mockRejectedValue(new Error("Connection timeout"));

      await expect(engine.searchByEmbedding(queryEmbedding, sector, 10)).rejects.toThrow(
        "Vector search failed: Connection timeout"
      );
    });

    it("should handle non-Error objects in searchByMemoryId", async () => {
      const memoryId = "mem123";
      const sector = MemorySector.Semantic;

      // Mock retrieving the memory's embedding
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            embedding: JSON.stringify(new Array(1536).fill(0.2)),
          },
        ],
      });

      // Mock non-Error rejection
      mockPool.query.mockRejectedValueOnce("string error");

      await expect(engine.searchByMemoryId(memoryId, sector, 10)).rejects.toThrow(
        "Vector search by memory ID failed: string error"
      );
    });
  });

  describe("parseEmbedding", () => {
    it("should parse embedding from array format", async () => {
      const memoryId = "mem123";
      const sector = MemorySector.Semantic;
      const embeddingArray = new Array(1536).fill(0.3);

      // Mock retrieving the memory's embedding as array (not stringified)
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            embedding: embeddingArray, // Array format, not string
          },
        ],
      });

      // Mock similarity search results
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            memory_id: "mem456",
            sector: "semantic",
            similarity: 0.88,
          },
        ],
      });

      const results = await engine.searchByMemoryId(memoryId, sector, 10);

      expect(results).toHaveLength(1);
      expect(results[0].memoryId).toBe("mem456");
    });

    it("should throw error for invalid embedding format", async () => {
      const memoryId = "mem123";
      const sector = MemorySector.Semantic;

      // Mock retrieving the memory's embedding with invalid format
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            embedding: { invalid: "format" }, // Object format (invalid)
          },
        ],
      });

      await expect(engine.searchByMemoryId(memoryId, sector, 10)).rejects.toThrow(
        "Invalid embedding format"
      );
    });

    it("should throw error for null embedding", async () => {
      const memoryId = "mem123";
      const sector = MemorySector.Semantic;

      // Mock retrieving the memory's embedding as null
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            embedding: null, // Null format (invalid)
          },
        ],
      });

      await expect(engine.searchByMemoryId(memoryId, sector, 10)).rejects.toThrow(
        "Invalid embedding format"
      );
    });

    it("should throw error for number embedding", async () => {
      const memoryId = "mem123";
      const sector = MemorySector.Semantic;

      // Mock retrieving the memory's embedding as number
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            embedding: 12345, // Number format (invalid)
          },
        ],
      });

      await expect(engine.searchByMemoryId(memoryId, sector, 10)).rejects.toThrow(
        "Invalid embedding format"
      );
    });
  });
});
