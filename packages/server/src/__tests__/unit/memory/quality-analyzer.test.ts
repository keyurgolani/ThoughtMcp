/**
 * Quality Analyzer Unit Tests
 *
 * Tests for memory quality analysis functionality.
 * Requirements: 8.1 (average strength by sector), 8.2 (access patterns),
 *               8.3 (embedding quality metrics), 8.4 (duplicate detection),
 *               8.5 (merge suggestions), 8.6 (quality trends)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseConnectionManager } from "../../../database/connection-manager";
import {
  QualityAnalyzer,
  QualityAnalyzerError,
  createQualityAnalyzer,
} from "../../../memory/quality-analyzer";

describe("QualityAnalyzer", () => {
  let mockDb: {
    getConnection: ReturnType<typeof vi.fn>;
    releaseConnection: ReturnType<typeof vi.fn>;
    beginTransaction: ReturnType<typeof vi.fn>;
    commitTransaction: ReturnType<typeof vi.fn>;
    rollbackTransaction: ReturnType<typeof vi.fn>;
  };
  let mockClient: {
    query: ReturnType<typeof vi.fn>;
  };
  let qualityAnalyzer: QualityAnalyzer;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };

    mockDb = {
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
    };

    qualityAnalyzer = new QualityAnalyzer(mockDb as unknown as DatabaseConnectionManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getMetrics", () => {
    it("should return quality metrics for a user", async () => {
      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("AVG(strength)")) {
          // Average strength by sector query
          return {
            rows: [
              { primary_sector: "episodic", avg_strength: "0.8" },
              { primary_sector: "semantic", avg_strength: "0.9" },
              { primary_sector: "procedural", avg_strength: "0.7" },
              { primary_sector: "emotional", avg_strength: "0.6" },
              { primary_sector: "reflective", avg_strength: "0.75" },
            ],
          };
        }
        if (sql.includes("memory_embeddings")) {
          // Embedding coverage query
          return {
            rows: [{ total_memories: "100", memories_with_embeddings: "95" }],
          };
        }
        if (sql.includes("memory_links")) {
          // Clustering coefficient query
          return {
            rows: [{ total_memories: "100", total_links: "200" }],
          };
        }
        return { rows: [] };
      });

      const result = await qualityAnalyzer.getMetrics("user-123");

      expect(result.averageStrengthBySector.episodic).toBeCloseTo(0.8, 2);
      expect(result.averageStrengthBySector.semantic).toBeCloseTo(0.9, 2);
      expect(result.averageStrengthBySector.procedural).toBeCloseTo(0.7, 2);
      expect(result.averageStrengthBySector.emotional).toBeCloseTo(0.6, 2);
      expect(result.averageStrengthBySector.reflective).toBeCloseTo(0.75, 2);
      expect(result.embeddingCoverage).toBe(95);
      expect(result.clusteringCoefficient).toBeGreaterThan(0);
    });

    it("should return zero for missing sectors", async () => {
      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("AVG(strength)")) {
          return {
            rows: [{ primary_sector: "episodic", avg_strength: "0.5" }],
          };
        }
        if (sql.includes("memory_embeddings")) {
          return {
            rows: [{ total_memories: "10", memories_with_embeddings: "10" }],
          };
        }
        if (sql.includes("memory_links")) {
          return {
            rows: [{ total_memories: "10", total_links: "5" }],
          };
        }
        return { rows: [] };
      });

      const result = await qualityAnalyzer.getMetrics("user-123");

      expect(result.averageStrengthBySector.episodic).toBeCloseTo(0.5, 2);
      expect(result.averageStrengthBySector.semantic).toBe(0);
      expect(result.averageStrengthBySector.procedural).toBe(0);
      expect(result.averageStrengthBySector.emotional).toBe(0);
      expect(result.averageStrengthBySector.reflective).toBe(0);
    });

    it("should handle zero memories", async () => {
      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("AVG(strength)")) {
          return { rows: [] };
        }
        if (sql.includes("memory_embeddings")) {
          return {
            rows: [{ total_memories: "0", memories_with_embeddings: "0" }],
          };
        }
        if (sql.includes("memory_links")) {
          return {
            rows: [{ total_memories: "0", total_links: "0" }],
          };
        }
        return { rows: [] };
      });

      const result = await qualityAnalyzer.getMetrics("user-123");

      expect(result.averageStrengthBySector.episodic).toBe(0);
      expect(result.embeddingCoverage).toBe(0);
      expect(result.clusteringCoefficient).toBe(0);
    });

    it("should throw error for missing userId", async () => {
      await expect(qualityAnalyzer.getMetrics("")).rejects.toThrow(QualityAnalyzerError);
      await expect(qualityAnalyzer.getMetrics("")).rejects.toThrow("userId is required");
    });

    it("should handle database errors", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(qualityAnalyzer.getMetrics("user-123")).rejects.toThrow(QualityAnalyzerError);
    });

    it("should release connection after successful query", async () => {
      mockClient.query.mockImplementation(async () => ({ rows: [] }));

      await qualityAnalyzer.getMetrics("user-123");

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });

    it("should release connection after error", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Query failed"));

      await expect(qualityAnalyzer.getMetrics("user-123")).rejects.toThrow();

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });
  });

  describe("getAccessPatterns", () => {
    describe("most accessed", () => {
      it("should return most accessed memories", async () => {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id: "mem-1",
              content: "Most accessed memory",
              access_count: "100",
              last_accessed: "2024-01-15T10:00:00Z",
            },
            {
              id: "mem-2",
              content: "Second most accessed",
              access_count: "50",
              last_accessed: "2024-01-14T10:00:00Z",
            },
          ],
        });

        const result = await qualityAnalyzer.getAccessPatterns("user-123", "most");

        expect(result).toHaveLength(2);
        expect(result[0].memoryId).toBe("mem-1");
        expect(result[0].accessCount).toBe(100);
        expect(result[1].memoryId).toBe("mem-2");
        expect(result[1].accessCount).toBe(50);
      });

      it("should order by access count descending", async () => {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id: "mem-1",
              content: "A",
              access_count: "100",
              last_accessed: "2024-01-15T10:00:00Z",
            },
            {
              id: "mem-2",
              content: "B",
              access_count: "50",
              last_accessed: "2024-01-14T10:00:00Z",
            },
          ],
        });

        const result = await qualityAnalyzer.getAccessPatterns("user-123", "most");

        expect(result[0].accessCount).toBeGreaterThan(result[1].accessCount);
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining("ORDER BY access_count DESC"),
          ["user-123", 10]
        );
      });
    });

    describe("least accessed", () => {
      it("should return least accessed memories", async () => {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id: "mem-1",
              content: "Least accessed memory",
              access_count: "1",
              last_accessed: "2024-01-01T10:00:00Z",
            },
            {
              id: "mem-2",
              content: "Second least accessed",
              access_count: "2",
              last_accessed: "2024-01-02T10:00:00Z",
            },
          ],
        });

        const result = await qualityAnalyzer.getAccessPatterns("user-123", "least");

        expect(result).toHaveLength(2);
        expect(result[0].memoryId).toBe("mem-1");
        expect(result[0].accessCount).toBe(1);
      });

      it("should order by access count ascending", async () => {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            { id: "mem-1", content: "A", access_count: "1", last_accessed: "2024-01-01T10:00:00Z" },
            { id: "mem-2", content: "B", access_count: "2", last_accessed: "2024-01-02T10:00:00Z" },
          ],
        });

        const result = await qualityAnalyzer.getAccessPatterns("user-123", "least");

        expect(result[0].accessCount).toBeLessThan(result[1].accessCount);
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining("ORDER BY access_count ASC"),
          ["user-123", 10]
        );
      });
    });

    describe("never accessed", () => {
      it("should return never accessed memories", async () => {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id: "mem-1",
              content: "Never accessed memory",
              access_count: "0",
              last_accessed: "2024-01-15T10:00:00Z",
            },
          ],
        });

        const result = await qualityAnalyzer.getAccessPatterns("user-123", "never");

        expect(result).toHaveLength(1);
        expect(result[0].memoryId).toBe("mem-1");
        expect(result[0].accessCount).toBe(0);
      });

      it("should filter for access_count = 0", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        await qualityAnalyzer.getAccessPatterns("user-123", "never");

        expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("access_count = 0"), [
          "user-123",
          10,
        ]);
      });
    });

    describe("content truncation", () => {
      it("should truncate long content", async () => {
        const longContent = "A".repeat(200);
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id: "mem-1",
              content: longContent,
              access_count: "10",
              last_accessed: "2024-01-15T10:00:00Z",
            },
          ],
        });

        const result = await qualityAnalyzer.getAccessPatterns("user-123", "most");

        expect(result[0].content.length).toBeLessThan(longContent.length);
        expect(result[0].content.endsWith("...")).toBe(true);
      });

      it("should not truncate short content", async () => {
        const shortContent = "Short content";
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id: "mem-1",
              content: shortContent,
              access_count: "10",
              last_accessed: "2024-01-15T10:00:00Z",
            },
          ],
        });

        const result = await qualityAnalyzer.getAccessPatterns("user-123", "most");

        expect(result[0].content).toBe(shortContent);
      });
    });

    describe("limit parameter", () => {
      it("should use default limit of 10", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        await qualityAnalyzer.getAccessPatterns("user-123", "most");

        expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), ["user-123", 10]);
      });

      it("should use custom limit", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        await qualityAnalyzer.getAccessPatterns("user-123", "most", 5);

        expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), ["user-123", 5]);
      });

      it("should reject limit less than 1", async () => {
        await expect(qualityAnalyzer.getAccessPatterns("user-123", "most", 0)).rejects.toThrow(
          QualityAnalyzerError
        );
        await expect(qualityAnalyzer.getAccessPatterns("user-123", "most", 0)).rejects.toThrow(
          "limit must be between 1 and 100"
        );
      });

      it("should reject limit greater than 100", async () => {
        await expect(qualityAnalyzer.getAccessPatterns("user-123", "most", 101)).rejects.toThrow(
          QualityAnalyzerError
        );
      });
    });

    describe("validation", () => {
      it("should throw error for missing userId", async () => {
        await expect(qualityAnalyzer.getAccessPatterns("", "most")).rejects.toThrow(
          QualityAnalyzerError
        );
        await expect(qualityAnalyzer.getAccessPatterns("", "most")).rejects.toThrow(
          "userId is required"
        );
      });

      it("should throw error for invalid type", async () => {
        await expect(
          qualityAnalyzer.getAccessPatterns("user-123", "invalid" as "most")
        ).rejects.toThrow(QualityAnalyzerError);
        await expect(
          qualityAnalyzer.getAccessPatterns("user-123", "invalid" as "most")
        ).rejects.toThrow("type must be 'most', 'least', or 'never'");
      });
    });

    describe("error handling", () => {
      it("should handle database errors", async () => {
        mockClient.query.mockRejectedValueOnce(new Error("Database error"));

        await expect(qualityAnalyzer.getAccessPatterns("user-123", "most")).rejects.toThrow(
          QualityAnalyzerError
        );
      });

      it("should release connection after successful query", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        await qualityAnalyzer.getAccessPatterns("user-123", "most");

        expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
      });

      it("should release connection after error", async () => {
        mockClient.query.mockRejectedValueOnce(new Error("Query failed"));

        await expect(qualityAnalyzer.getAccessPatterns("user-123", "most")).rejects.toThrow();

        expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
      });
    });
  });

  describe("findDuplicates", () => {
    describe("successful duplicate detection", () => {
      it("should return duplicate candidates above threshold", async () => {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id1: "mem-1",
              id2: "mem-2",
              similarity: "0.95",
              strength1: "0.8",
              strength2: "0.7",
              access_count1: "10",
              access_count2: "5",
            },
            {
              id1: "mem-3",
              id2: "mem-4",
              similarity: "0.92",
              strength1: "0.5",
              strength2: "0.5",
              access_count1: "3",
              access_count2: "3",
            },
          ],
        });

        const result = await qualityAnalyzer.findDuplicates("user-123", 0.9);

        expect(result).toHaveLength(2);
        expect(result[0].memoryId1).toBe("mem-1");
        expect(result[0].memoryId2).toBe("mem-2");
        expect(result[0].similarity).toBeCloseTo(0.95, 2);
        expect(result[1].memoryId1).toBe("mem-3");
        expect(result[1].memoryId2).toBe("mem-4");
      });

      it("should use default threshold of 0.9", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        await qualityAnalyzer.findDuplicates("user-123");

        expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining(">="), [
          "user-123",
          0.9,
          50,
        ]);
      });

      it("should return empty array when no duplicates found", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        const result = await qualityAnalyzer.findDuplicates("user-123", 0.9);

        expect(result).toEqual([]);
      });
    });

    describe("suggested actions", () => {
      it("should suggest merge for very high similarity (>= 0.95)", async () => {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id1: "mem-1",
              id2: "mem-2",
              similarity: "0.98",
              strength1: "0.5",
              strength2: "0.5",
              access_count1: "5",
              access_count2: "5",
            },
          ],
        });

        const result = await qualityAnalyzer.findDuplicates("user-123", 0.9);

        expect(result[0].suggestedAction).toBe("merge");
      });

      it("should suggest delete_one when strength differs significantly", async () => {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id1: "mem-1",
              id2: "mem-2",
              similarity: "0.92",
              strength1: "0.9",
              strength2: "0.3",
              access_count1: "5",
              access_count2: "5",
            },
          ],
        });

        const result = await qualityAnalyzer.findDuplicates("user-123", 0.9);

        expect(result[0].suggestedAction).toBe("delete_one");
      });

      it("should suggest delete_one when access count differs significantly", async () => {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id1: "mem-1",
              id2: "mem-2",
              similarity: "0.92",
              strength1: "0.5",
              strength2: "0.5",
              access_count1: "50",
              access_count2: "5",
            },
          ],
        });

        const result = await qualityAnalyzer.findDuplicates("user-123", 0.9);

        expect(result[0].suggestedAction).toBe("delete_one");
      });

      it("should suggest keep_both for moderate similarity with similar metrics", async () => {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              id1: "mem-1",
              id2: "mem-2",
              similarity: "0.91",
              strength1: "0.5",
              strength2: "0.6",
              access_count1: "5",
              access_count2: "8",
            },
          ],
        });

        const result = await qualityAnalyzer.findDuplicates("user-123", 0.9);

        expect(result[0].suggestedAction).toBe("keep_both");
      });
    });

    describe("validation", () => {
      it("should throw error for missing userId", async () => {
        await expect(qualityAnalyzer.findDuplicates("")).rejects.toThrow(QualityAnalyzerError);
        await expect(qualityAnalyzer.findDuplicates("")).rejects.toThrow("userId is required");
      });

      it("should throw error for threshold below 0", async () => {
        await expect(qualityAnalyzer.findDuplicates("user-123", -0.1)).rejects.toThrow(
          QualityAnalyzerError
        );
        await expect(qualityAnalyzer.findDuplicates("user-123", -0.1)).rejects.toThrow(
          "threshold must be between 0 and 1"
        );
      });

      it("should throw error for threshold above 1", async () => {
        await expect(qualityAnalyzer.findDuplicates("user-123", 1.1)).rejects.toThrow(
          QualityAnalyzerError
        );
      });

      it("should accept threshold of 0", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        await expect(qualityAnalyzer.findDuplicates("user-123", 0)).resolves.toEqual([]);
      });

      it("should accept threshold of 1", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        await expect(qualityAnalyzer.findDuplicates("user-123", 1)).resolves.toEqual([]);
      });
    });

    describe("error handling", () => {
      it("should handle database errors", async () => {
        mockClient.query.mockRejectedValueOnce(new Error("Database error"));

        await expect(qualityAnalyzer.findDuplicates("user-123")).rejects.toThrow(
          QualityAnalyzerError
        );
      });

      it("should release connection after successful query", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        await qualityAnalyzer.findDuplicates("user-123");

        expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
      });

      it("should release connection after error", async () => {
        mockClient.query.mockRejectedValueOnce(new Error("Query failed"));

        await expect(qualityAnalyzer.findDuplicates("user-123")).rejects.toThrow();

        expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
      });
    });
  });

  describe("getTrends", () => {
    describe("successful trend retrieval", () => {
      it("should return quality trends for specified days", async () => {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              date: "2024-01-13",
              average_strength: "0.75",
              total_memories: "100",
              consolidated_count: "5",
            },
            {
              date: "2024-01-14",
              average_strength: "0.78",
              total_memories: "110",
              consolidated_count: "3",
            },
            {
              date: "2024-01-15",
              average_strength: "0.80",
              total_memories: "120",
              consolidated_count: "0",
            },
          ],
        });

        const result = await qualityAnalyzer.getTrends("user-123", 3);

        expect(result).toHaveLength(3);
        expect(result[0].averageStrength).toBeCloseTo(0.75, 2);
        expect(result[0].totalMemories).toBe(100);
        expect(result[0].consolidatedCount).toBe(5);
        expect(result[1].averageStrength).toBeCloseTo(0.78, 2);
        expect(result[2].totalMemories).toBe(120);
      });

      it("should use default of 30 days", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        await qualityAnalyzer.getTrends("user-123");

        expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), ["user-123", 30]);
      });

      it("should return empty array when no data", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        const result = await qualityAnalyzer.getTrends("user-123", 7);

        expect(result).toEqual([]);
      });

      it("should handle days with no memories (zero values)", async () => {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              date: "2024-01-15",
              average_strength: null,
              total_memories: "0",
              consolidated_count: "0",
            },
          ],
        });

        const result = await qualityAnalyzer.getTrends("user-123", 1);

        expect(result[0].averageStrength).toBe(0);
        expect(result[0].totalMemories).toBe(0);
        expect(result[0].consolidatedCount).toBe(0);
      });

      it("should return Date objects for date field", async () => {
        mockClient.query.mockResolvedValueOnce({
          rows: [
            {
              date: "2024-01-15",
              average_strength: "0.5",
              total_memories: "10",
              consolidated_count: "1",
            },
          ],
        });

        const result = await qualityAnalyzer.getTrends("user-123", 1);

        expect(result[0].date).toBeInstanceOf(Date);
      });
    });

    describe("validation", () => {
      it("should throw error for missing userId", async () => {
        await expect(qualityAnalyzer.getTrends("")).rejects.toThrow(QualityAnalyzerError);
        await expect(qualityAnalyzer.getTrends("")).rejects.toThrow("userId is required");
      });

      it("should throw error for days less than 1", async () => {
        await expect(qualityAnalyzer.getTrends("user-123", 0)).rejects.toThrow(
          QualityAnalyzerError
        );
        await expect(qualityAnalyzer.getTrends("user-123", 0)).rejects.toThrow(
          "days must be between 1 and 365"
        );
      });

      it("should throw error for days greater than 365", async () => {
        await expect(qualityAnalyzer.getTrends("user-123", 366)).rejects.toThrow(
          QualityAnalyzerError
        );
      });

      it("should accept days of 1", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        await expect(qualityAnalyzer.getTrends("user-123", 1)).resolves.toEqual([]);
      });

      it("should accept days of 365", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        await expect(qualityAnalyzer.getTrends("user-123", 365)).resolves.toEqual([]);
      });
    });

    describe("error handling", () => {
      it("should handle database errors", async () => {
        mockClient.query.mockRejectedValueOnce(new Error("Database error"));

        await expect(qualityAnalyzer.getTrends("user-123")).rejects.toThrow(QualityAnalyzerError);
      });

      it("should release connection after successful query", async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        await qualityAnalyzer.getTrends("user-123");

        expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
      });

      it("should release connection after error", async () => {
        mockClient.query.mockRejectedValueOnce(new Error("Query failed"));

        await expect(qualityAnalyzer.getTrends("user-123")).rejects.toThrow();

        expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
      });
    });
  });

  describe("createQualityAnalyzer factory", () => {
    it("should create a QualityAnalyzer instance", () => {
      const analyzer = createQualityAnalyzer(mockDb as unknown as DatabaseConnectionManager);
      expect(analyzer).toBeInstanceOf(QualityAnalyzer);
    });
  });

  describe("QualityAnalyzerError", () => {
    it("should have correct properties", () => {
      const error = new QualityAnalyzerError("Test error", "TEST_CODE", { key: "value" });

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_CODE");
      expect(error.context).toEqual({ key: "value" });
      expect(error.name).toBe("QualityAnalyzerError");
    });
  });
});
