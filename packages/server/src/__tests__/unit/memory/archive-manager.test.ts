/**
 * Archive Manager Unit Tests
 *
 * Tests for memory archiving functionality.
 * Requirements: 4.1 (archive by age threshold), 4.2 (retain metadata and embeddings)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseConnectionManager } from "../../../database/connection-manager";
import {
  ArchiveManager,
  ArchiveManagerError,
  createArchiveManager,
  DEFAULT_ARCHIVE_CONFIG,
} from "../../../memory/archive-manager";

describe("ArchiveManager", () => {
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
  let archiveManager: ArchiveManager;

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

    archiveManager = new ArchiveManager(mockDb as unknown as DatabaseConnectionManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("archiveOld", () => {
    it("should archive memories older than threshold", async () => {
      // Mock find old memories query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: "mem-1" }, { id: "mem-2" }],
      });

      // Mock calculate freed bytes query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ content_bytes: "1500" }],
      });

      // Mock insert into archived_memories query
      mockClient.query.mockResolvedValueOnce({
        rowCount: 2,
        rows: [{ id: "mem-1" }, { id: "mem-2" }],
      });

      // Mock update is_archived query
      mockClient.query.mockResolvedValueOnce({ rowCount: 2 });

      const result = await archiveManager.archiveOld("user-123");

      expect(result.archivedCount).toBe(2);
      expect(result.freedBytes).toBe(1500);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.commitTransaction).toHaveBeenCalledWith(mockClient);
    });

    it("should use default config when not provided", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await archiveManager.archiveOld("user-123");

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '1 day' * $2"),
        expect.arrayContaining(["user-123", DEFAULT_ARCHIVE_CONFIG.ageThresholdDays])
      );
    });

    it("should use custom config when provided", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const customConfig = {
        ageThresholdDays: 90,
        retainEmbeddings: false,
      };

      await archiveManager.archiveOld("user-123", customConfig);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '1 day' * $2"),
        expect.arrayContaining(["user-123", 90])
      );
    });

    it("should return zero counts when no old memories found", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await archiveManager.archiveOld("user-123");

      expect(result.archivedCount).toBe(0);
      expect(result.freedBytes).toBe(0);
      expect(mockDb.commitTransaction).toHaveBeenCalled();
    });

    it("should throw error for missing userId", async () => {
      await expect(archiveManager.archiveOld("")).rejects.toThrow(ArchiveManagerError);
      await expect(archiveManager.archiveOld("")).rejects.toThrow("userId is required");
    });

    it("should throw error for negative ageThresholdDays", async () => {
      await expect(
        archiveManager.archiveOld("user-123", {
          ageThresholdDays: -10,
          retainEmbeddings: true,
        })
      ).rejects.toThrow(ArchiveManagerError);
      await expect(
        archiveManager.archiveOld("user-123", {
          ageThresholdDays: -10,
          retainEmbeddings: true,
        })
      ).rejects.toThrow("ageThresholdDays must be non-negative");
    });

    it("should rollback transaction on error", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(archiveManager.archiveOld("user-123")).rejects.toThrow(ArchiveManagerError);

      expect(mockDb.rollbackTransaction).toHaveBeenCalledWith(mockClient);
    });
  });

  describe("archiveMemories", () => {
    it("should archive specific memories by ID", async () => {
      // Mock calculate freed bytes query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ content_bytes: "2000" }],
      });

      // Mock insert into archived_memories query
      mockClient.query.mockResolvedValueOnce({
        rowCount: 3,
        rows: [{ id: "mem-1" }, { id: "mem-2" }, { id: "mem-3" }],
      });

      // Mock update is_archived query
      mockClient.query.mockResolvedValueOnce({ rowCount: 3 });

      const result = await archiveManager.archiveMemories("user-123", ["mem-1", "mem-2", "mem-3"]);

      expect(result.archivedCount).toBe(3);
      expect(result.freedBytes).toBe(2000);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.commitTransaction).toHaveBeenCalledWith(mockClient);
    });

    it("should return zero counts for empty memoryIds array", async () => {
      const result = await archiveManager.archiveMemories("user-123", []);

      expect(result.archivedCount).toBe(0);
      expect(result.freedBytes).toBe(0);
      expect(mockDb.beginTransaction).not.toHaveBeenCalled();
    });

    it("should throw error for missing userId", async () => {
      await expect(archiveManager.archiveMemories("", ["mem-1"])).rejects.toThrow(
        ArchiveManagerError
      );
      await expect(archiveManager.archiveMemories("", ["mem-1"])).rejects.toThrow(
        "userId is required"
      );
    });

    it("should rollback transaction on error", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(archiveManager.archiveMemories("user-123", ["mem-1"])).rejects.toThrow(
        ArchiveManagerError
      );

      expect(mockDb.rollbackTransaction).toHaveBeenCalledWith(mockClient);
    });

    it("should retain embeddings when configured", async () => {
      // Mock calculate freed bytes query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ content_bytes: "500" }],
      });

      // Mock insert into archived_memories query
      mockClient.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "mem-1" }],
      });

      // Mock update is_archived query
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await archiveManager.archiveMemories("user-123", ["mem-1"], {
        ageThresholdDays: 180,
        retainEmbeddings: true,
      });

      // Verify the insert query includes embeddings subquery
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("jsonb_object_agg"),
        expect.any(Array)
      );
    });

    it("should not retain embeddings when configured", async () => {
      // Mock calculate freed bytes query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ content_bytes: "500" }],
      });

      // Mock insert into archived_memories query
      mockClient.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "mem-1" }],
      });

      // Mock update is_archived query
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await archiveManager.archiveMemories("user-123", ["mem-1"], {
        ageThresholdDays: 180,
        retainEmbeddings: false,
      });

      // Verify the insert query uses NULL for embeddings
      const insertCall = mockClient.query.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes("INSERT INTO archived_memories")
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![0]).toContain("NULL");
    });

    it("should mark memories as archived in main table", async () => {
      // Mock calculate freed bytes query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ content_bytes: "500" }],
      });

      // Mock insert into archived_memories query
      mockClient.query.mockResolvedValueOnce({
        rowCount: 2,
        rows: [{ id: "mem-1" }, { id: "mem-2" }],
      });

      // Mock update is_archived query
      mockClient.query.mockResolvedValueOnce({ rowCount: 2 });

      await archiveManager.archiveMemories("user-123", ["mem-1", "mem-2"]);

      // Verify the update query was called
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE memories SET is_archived = TRUE"),
        expect.arrayContaining(["user-123", ["mem-1", "mem-2"]])
      );
    });
  });

  describe("getArchiveStats", () => {
    it("should return archive statistics", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: "10", bytes_used: "50000" }],
      });

      const result = await archiveManager.getArchiveStats("user-123");

      expect(result.count).toBe(10);
      expect(result.bytesUsed).toBe(50000);
    });

    it("should return zero counts when no archived memories", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: "0", bytes_used: "0" }],
      });

      const result = await archiveManager.getArchiveStats("user-123");

      expect(result.count).toBe(0);
      expect(result.bytesUsed).toBe(0);
    });

    it("should throw error for missing userId", async () => {
      await expect(archiveManager.getArchiveStats("")).rejects.toThrow(ArchiveManagerError);
      await expect(archiveManager.getArchiveStats("")).rejects.toThrow("userId is required");
    });

    it("should handle database errors", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(archiveManager.getArchiveStats("user-123")).rejects.toThrow(ArchiveManagerError);
      await expect(archiveManager.getArchiveStats("user-123")).rejects.toThrow(
        "Failed to get archive stats"
      );
    });

    it("should release connection after successful query", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: "5", bytes_used: "25000" }],
      });

      await archiveManager.getArchiveStats("user-123");

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });

    it("should release connection after error", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(archiveManager.getArchiveStats("user-123")).rejects.toThrow();

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });
  });

  describe("createArchiveManager", () => {
    it("should create an ArchiveManager instance", () => {
      const manager = createArchiveManager(mockDb as unknown as DatabaseConnectionManager);

      expect(manager).toBeInstanceOf(ArchiveManager);
    });
  });

  describe("searchArchive (Requirement 4.3)", () => {
    it("should search archived memories by query", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: "mem-1",
            user_id: "user-123",
            content: "Test memory content",
            metadata: { keywords: ["test"] },
            embeddings: { episodic: [0.1, 0.2] },
            archived_at: "2024-01-01T00:00:00Z",
            original_created_at: "2023-06-01T00:00:00Z",
            tags: ["work"],
            primary_sector: "episodic",
            session_id: "session-1",
            salience: 0.5,
            strength: 0.8,
            access_count: 5,
            last_accessed: "2023-12-01T00:00:00Z",
          },
        ],
      });

      const results = await archiveManager.searchArchive("user-123", "test");

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("mem-1");
      expect(results[0].content).toBe("Test memory content");
      expect(results[0].archivedAt).toBeInstanceOf(Date);
      expect(results[0].originalCreatedAt).toBeInstanceOf(Date);
    });

    it("should return empty array for empty query", async () => {
      const results = await archiveManager.searchArchive("user-123", "");

      expect(results).toHaveLength(0);
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it("should return empty array for whitespace-only query", async () => {
      const results = await archiveManager.searchArchive("user-123", "   ");

      expect(results).toHaveLength(0);
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it("should throw error for missing userId", async () => {
      await expect(archiveManager.searchArchive("", "test")).rejects.toThrow(ArchiveManagerError);
      await expect(archiveManager.searchArchive("", "test")).rejects.toThrow("userId is required");
    });

    it("should handle database errors", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(archiveManager.searchArchive("user-123", "test")).rejects.toThrow(
        ArchiveManagerError
      );
      await expect(archiveManager.searchArchive("user-123", "test")).rejects.toThrow(
        "Failed to search archive"
      );
    });

    it("should release connection after successful search", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await archiveManager.searchArchive("user-123", "test");

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });

    it("should release connection after error", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(archiveManager.searchArchive("user-123", "test")).rejects.toThrow();

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });

    it("should handle null metadata and embeddings", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: "mem-1",
            user_id: "user-123",
            content: "Test content",
            metadata: null,
            embeddings: null,
            archived_at: "2024-01-01T00:00:00Z",
            original_created_at: "2023-06-01T00:00:00Z",
            tags: null,
            primary_sector: null,
            session_id: null,
            salience: null,
            strength: null,
            access_count: null,
            last_accessed: null,
          },
        ],
      });

      const results = await archiveManager.searchArchive("user-123", "test");

      expect(results).toHaveLength(1);
      expect(results[0].metadata).toEqual({});
      expect(results[0].embeddings).toBeNull();
      expect(results[0].tags).toEqual([]);
      expect(results[0].primarySector).toBe("episodic");
      expect(results[0].salience).toBe(0.5);
      expect(results[0].strength).toBe(1.0);
      expect(results[0].accessCount).toBe(0);
      expect(results[0].lastAccessed).toBeUndefined();
    });
  });

  describe("restore (Requirement 4.4)", () => {
    it("should restore an archived memory to active storage", async () => {
      // Mock check query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: "mem-1" }],
      });

      // Mock update query
      mockClient.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "mem-1" }],
      });

      // Mock delete query
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await archiveManager.restore("user-123", "mem-1");

      expect(result.restoredCount).toBe(1);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.commitTransaction).toHaveBeenCalledWith(mockClient);
    });

    it("should return zero count when memory not found in archive", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await archiveManager.restore("user-123", "non-existent");

      expect(result.restoredCount).toBe(0);
      expect(mockDb.commitTransaction).toHaveBeenCalled();
    });

    it("should throw error for missing userId", async () => {
      await expect(archiveManager.restore("", "mem-1")).rejects.toThrow(ArchiveManagerError);
      await expect(archiveManager.restore("", "mem-1")).rejects.toThrow("userId is required");
    });

    it("should throw error for missing memoryId", async () => {
      await expect(archiveManager.restore("user-123", "")).rejects.toThrow(ArchiveManagerError);
      await expect(archiveManager.restore("user-123", "")).rejects.toThrow("memoryId is required");
    });

    it("should rollback transaction on error", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: "mem-1" }] });
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(archiveManager.restore("user-123", "mem-1")).rejects.toThrow(
        ArchiveManagerError
      );

      expect(mockDb.rollbackTransaction).toHaveBeenCalledWith(mockClient);
    });

    it("should update access count and last_accessed when restoring", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: "mem-1" }] });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "mem-1" }] });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await archiveManager.restore("user-123", "mem-1");

      // Verify the update query includes access_count increment
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("access_count = access_count + 1"),
        expect.arrayContaining(["mem-1", "user-123"])
      );
    });

    it("should delete from archived_memories after restoring", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: "mem-1" }] });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "mem-1" }] });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await archiveManager.restore("user-123", "mem-1");

      // Verify the delete query was called
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM archived_memories"),
        expect.arrayContaining(["mem-1", "user-123"])
      );
    });
  });

  describe("DEFAULT_ARCHIVE_CONFIG", () => {
    it("should have expected default values", () => {
      expect(DEFAULT_ARCHIVE_CONFIG.ageThresholdDays).toBe(180);
      expect(DEFAULT_ARCHIVE_CONFIG.retainEmbeddings).toBe(true);
    });
  });
});
