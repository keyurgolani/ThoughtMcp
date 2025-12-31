/**
 * Pruning Service Unit Tests
 *
 * Tests for memory pruning functionality.
 * Requirements: 3.1 (identify candidates), 3.2 (list with reasons), 3.5 (dry-run mode)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseConnectionManager } from "../../../database/connection-manager";
import {
  DEFAULT_PRUNING_CRITERIA,
  PruningService,
  PruningServiceError,
  createPruningService,
} from "../../../memory/pruning-service";

describe("PruningService", () => {
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
  let pruningService: PruningService;

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

    pruningService = new PruningService(mockDb as unknown as DatabaseConnectionManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("listCandidates", () => {
    it("should return forgetting candidates with reasons", async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000); // 200 days ago

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: "mem-1",
            content: "Low strength memory",
            strength: 0.05,
            created_at: now.toISOString(),
            last_accessed: now.toISOString(),
            access_count: 5,
            reason: "low_strength",
          },
          {
            id: "mem-2",
            content: "Old memory",
            strength: 0.5,
            created_at: oldDate.toISOString(),
            last_accessed: oldDate.toISOString(),
            access_count: 10,
            reason: "old_age",
          },
          {
            id: "mem-3",
            content: "Never accessed memory",
            strength: 0.5,
            created_at: now.toISOString(),
            last_accessed: now.toISOString(),
            access_count: 0,
            reason: "low_access",
          },
        ],
      });

      const result = await pruningService.listCandidates("user-123");

      expect(result).toHaveLength(3);
      expect(result[0].memoryId).toBe("mem-1");
      expect(result[0].reason).toBe("low_strength");
      expect(result[1].memoryId).toBe("mem-2");
      expect(result[1].reason).toBe("old_age");
      expect(result[2].memoryId).toBe("mem-3");
      expect(result[2].reason).toBe("low_access");
    });

    it("should use default criteria when not provided", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await pruningService.listCandidates("user-123");

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        expect.arrayContaining([
          "user-123",
          DEFAULT_PRUNING_CRITERIA.minStrength,
          DEFAULT_PRUNING_CRITERIA.maxAgeDays,
          DEFAULT_PRUNING_CRITERIA.minAccessCount,
        ])
      );
    });

    it("should use custom criteria when provided", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const customCriteria = {
        minStrength: 0.2,
        maxAgeDays: 90,
        minAccessCount: 5,
      };

      await pruningService.listCandidates("user-123", customCriteria);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        expect.arrayContaining(["user-123", 0.2, 90, 5])
      );
    });

    it("should return empty array when no candidates found", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await pruningService.listCandidates("user-123");

      expect(result).toHaveLength(0);
    });

    it("should throw error for missing userId", async () => {
      await expect(pruningService.listCandidates("")).rejects.toThrow(PruningServiceError);
      await expect(pruningService.listCandidates("")).rejects.toThrow("userId is required");
    });

    it("should throw error for invalid minStrength", async () => {
      await expect(
        pruningService.listCandidates("user-123", {
          minStrength: 1.5,
          maxAgeDays: 180,
          minAccessCount: 0,
        })
      ).rejects.toThrow(PruningServiceError);
      await expect(
        pruningService.listCandidates("user-123", {
          minStrength: 1.5,
          maxAgeDays: 180,
          minAccessCount: 0,
        })
      ).rejects.toThrow("minStrength must be between 0 and 1");
    });

    it("should throw error for negative maxAgeDays", async () => {
      await expect(
        pruningService.listCandidates("user-123", {
          minStrength: 0.1,
          maxAgeDays: -10,
          minAccessCount: 0,
        })
      ).rejects.toThrow(PruningServiceError);
      await expect(
        pruningService.listCandidates("user-123", {
          minStrength: 0.1,
          maxAgeDays: -10,
          minAccessCount: 0,
        })
      ).rejects.toThrow("maxAgeDays must be non-negative");
    });

    it("should throw error for negative minAccessCount", async () => {
      await expect(
        pruningService.listCandidates("user-123", {
          minStrength: 0.1,
          maxAgeDays: 180,
          minAccessCount: -1,
        })
      ).rejects.toThrow(PruningServiceError);
      await expect(
        pruningService.listCandidates("user-123", {
          minStrength: 0.1,
          maxAgeDays: 180,
          minAccessCount: -1,
        })
      ).rejects.toThrow("minAccessCount must be non-negative");
    });

    it("should handle database errors", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(pruningService.listCandidates("user-123")).rejects.toThrow(PruningServiceError);
      await expect(pruningService.listCandidates("user-123")).rejects.toThrow(
        "Failed to list pruning candidates"
      );
    });

    it("should release connection after successful query", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await pruningService.listCandidates("user-123");

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });

    it("should release connection after error", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(pruningService.listCandidates("user-123")).rejects.toThrow();

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });
  });

  describe("previewPruning", () => {
    it("should return preview of pruning effects", async () => {
      // Mock size query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: "3", content_bytes: "1500", embedding_bytes: "3000" }],
      });

      // Mock links query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ link_count: "5" }],
      });

      const result = await pruningService.previewPruning("user-123", ["mem-1", "mem-2", "mem-3"]);

      expect(result.deletedCount).toBe(3);
      expect(result.freedBytes).toBe(4500);
      expect(result.orphanedLinksRemoved).toBe(5);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should return zero counts for empty memoryIds array", async () => {
      const result = await pruningService.previewPruning("user-123", []);

      expect(result.deletedCount).toBe(0);
      expect(result.freedBytes).toBe(0);
      expect(result.orphanedLinksRemoved).toBe(0);
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it("should handle memories with no embeddings", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: "2", content_bytes: "1000", embedding_bytes: "0" }],
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [{ link_count: "0" }],
      });

      const result = await pruningService.previewPruning("user-123", ["mem-1", "mem-2"]);

      expect(result.deletedCount).toBe(2);
      expect(result.freedBytes).toBe(1000);
      expect(result.orphanedLinksRemoved).toBe(0);
    });

    it("should throw error for missing userId", async () => {
      await expect(pruningService.previewPruning("", ["mem-1"])).rejects.toThrow(
        PruningServiceError
      );
      await expect(pruningService.previewPruning("", ["mem-1"])).rejects.toThrow(
        "userId is required"
      );
    });

    it("should handle database errors", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(pruningService.previewPruning("user-123", ["mem-1"])).rejects.toThrow(
        PruningServiceError
      );
      await expect(pruningService.previewPruning("user-123", ["mem-1"])).rejects.toThrow(
        "Failed to preview pruning"
      );
    });

    it("should release connection after successful query", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: "1", content_bytes: "100", embedding_bytes: "200" }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ link_count: "1" }],
      });

      await pruningService.previewPruning("user-123", ["mem-1"]);

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });

    it("should release connection after error", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(pruningService.previewPruning("user-123", ["mem-1"])).rejects.toThrow();

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });
  });

  describe("createPruningService", () => {
    it("should create a PruningService instance", () => {
      const service = createPruningService(mockDb as unknown as DatabaseConnectionManager);

      expect(service).toBeInstanceOf(PruningService);
    });
  });

  describe("prune", () => {
    it("should delete memories and return pruning result", async () => {
      // Mock size query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ content_bytes: "1500", embedding_bytes: "3000" }],
      });

      // Mock links count query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ link_count: "5" }],
      });

      // Mock delete links query
      mockClient.query.mockResolvedValueOnce({ rowCount: 5 });

      // Mock delete embeddings query
      mockClient.query.mockResolvedValueOnce({ rowCount: 3 });

      // Mock delete metadata query
      mockClient.query.mockResolvedValueOnce({ rowCount: 3 });

      // Mock delete tag associations query
      mockClient.query.mockResolvedValueOnce({ rowCount: 2 });

      // Mock delete memories query
      mockClient.query.mockResolvedValueOnce({
        rowCount: 3,
        rows: [{ id: "mem-1" }, { id: "mem-2" }, { id: "mem-3" }],
      });

      const result = await pruningService.prune("user-123", ["mem-1", "mem-2", "mem-3"]);

      expect(result.deletedCount).toBe(3);
      expect(result.freedBytes).toBe(4500);
      expect(result.orphanedLinksRemoved).toBe(5);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.commitTransaction).toHaveBeenCalledWith(mockClient);
    });

    it("should return zero counts for empty memoryIds array", async () => {
      const result = await pruningService.prune("user-123", []);

      expect(result.deletedCount).toBe(0);
      expect(result.freedBytes).toBe(0);
      expect(result.orphanedLinksRemoved).toBe(0);
      expect(mockDb.beginTransaction).not.toHaveBeenCalled();
    });

    it("should throw error for missing userId", async () => {
      await expect(pruningService.prune("", ["mem-1"])).rejects.toThrow(PruningServiceError);
      await expect(pruningService.prune("", ["mem-1"])).rejects.toThrow("userId is required");
    });

    it("should rollback transaction on error", async () => {
      // Mock size query to fail
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(pruningService.prune("user-123", ["mem-1"])).rejects.toThrow(
        PruningServiceError
      );
      await expect(pruningService.prune("user-123", ["mem-1"])).rejects.toThrow(
        "Failed to prune memories"
      );

      expect(mockDb.rollbackTransaction).toHaveBeenCalledWith(mockClient);
    });

    it("should handle tag associations table not existing", async () => {
      // Mock size query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ content_bytes: "100", embedding_bytes: "200" }],
      });

      // Mock links count query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ link_count: "1" }],
      });

      // Mock delete links query
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      // Mock delete embeddings query
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      // Mock delete metadata query
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      // Mock delete tag associations query - table doesn't exist
      mockClient.query.mockRejectedValueOnce(new Error("relation does not exist"));

      // Mock delete memories query
      mockClient.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "mem-1" }],
      });

      const result = await pruningService.prune("user-123", ["mem-1"]);

      expect(result.deletedCount).toBe(1);
      expect(mockDb.commitTransaction).toHaveBeenCalledWith(mockClient);
    });

    it("should remove orphaned links from Waypoint_Graph", async () => {
      // Mock size query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ content_bytes: "100", embedding_bytes: "200" }],
      });

      // Mock links count query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ link_count: "10" }],
      });

      // Mock delete links query
      mockClient.query.mockResolvedValueOnce({ rowCount: 10 });

      // Mock delete embeddings query
      mockClient.query.mockResolvedValueOnce({ rowCount: 2 });

      // Mock delete metadata query
      mockClient.query.mockResolvedValueOnce({ rowCount: 2 });

      // Mock delete tag associations query
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });

      // Mock delete memories query
      mockClient.query.mockResolvedValueOnce({
        rowCount: 2,
        rows: [{ id: "mem-1" }, { id: "mem-2" }],
      });

      const result = await pruningService.prune("user-123", ["mem-1", "mem-2"]);

      expect(result.orphanedLinksRemoved).toBe(10);

      // Verify the delete links query was called
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM memory_links"),
        expect.arrayContaining([["mem-1", "mem-2"]])
      );
    });
  });

  describe("pruneAllCandidates", () => {
    it("should prune all candidates matching criteria", async () => {
      // Mock listCandidates query
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: "mem-1",
            content: "Low strength memory",
            strength: 0.05,
            created_at: new Date().toISOString(),
            last_accessed: new Date().toISOString(),
            access_count: 5,
            reason: "low_strength",
          },
          {
            id: "mem-2",
            content: "Old memory",
            strength: 0.5,
            created_at: new Date().toISOString(),
            last_accessed: new Date().toISOString(),
            access_count: 10,
            reason: "old_age",
          },
        ],
      });

      // Mock prune queries
      // Size query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ content_bytes: "1000", embedding_bytes: "2000" }],
      });

      // Links count query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ link_count: "3" }],
      });

      // Delete links
      mockClient.query.mockResolvedValueOnce({ rowCount: 3 });

      // Delete embeddings
      mockClient.query.mockResolvedValueOnce({ rowCount: 2 });

      // Delete metadata
      mockClient.query.mockResolvedValueOnce({ rowCount: 2 });

      // Delete tag associations
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });

      // Delete memories
      mockClient.query.mockResolvedValueOnce({
        rowCount: 2,
        rows: [{ id: "mem-1" }, { id: "mem-2" }],
      });

      const result = await pruningService.pruneAllCandidates("user-123");

      expect(result.deletedCount).toBe(2);
      expect(result.freedBytes).toBe(3000);
      expect(result.orphanedLinksRemoved).toBe(3);
    });

    it("should return zero counts when no candidates found", async () => {
      // Mock listCandidates query - no candidates
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await pruningService.pruneAllCandidates("user-123");

      expect(result.deletedCount).toBe(0);
      expect(result.freedBytes).toBe(0);
      expect(result.orphanedLinksRemoved).toBe(0);
      expect(mockDb.beginTransaction).not.toHaveBeenCalled();
    });

    it("should throw error for missing userId", async () => {
      await expect(pruningService.pruneAllCandidates("")).rejects.toThrow(PruningServiceError);
      await expect(pruningService.pruneAllCandidates("")).rejects.toThrow("userId is required");
    });

    it("should use custom criteria when provided", async () => {
      // Mock listCandidates query - no candidates with custom criteria
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const customCriteria = {
        minStrength: 0.2,
        maxAgeDays: 90,
        minAccessCount: 5,
      };

      await pruningService.pruneAllCandidates("user-123", customCriteria);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        expect.arrayContaining(["user-123", 0.2, 90, 5])
      );
    });

    it("should throw error for invalid criteria", async () => {
      await expect(
        pruningService.pruneAllCandidates("user-123", {
          minStrength: 1.5,
          maxAgeDays: 180,
          minAccessCount: 0,
        })
      ).rejects.toThrow(PruningServiceError);
      await expect(
        pruningService.pruneAllCandidates("user-123", {
          minStrength: 1.5,
          maxAgeDays: 180,
          minAccessCount: 0,
        })
      ).rejects.toThrow("minStrength must be between 0 and 1");
    });
  });

  describe("DEFAULT_PRUNING_CRITERIA", () => {
    it("should have expected default values", () => {
      expect(DEFAULT_PRUNING_CRITERIA.minStrength).toBe(0.1);
      expect(DEFAULT_PRUNING_CRITERIA.maxAgeDays).toBe(180);
      expect(DEFAULT_PRUNING_CRITERIA.minAccessCount).toBe(0);
    });
  });
});
