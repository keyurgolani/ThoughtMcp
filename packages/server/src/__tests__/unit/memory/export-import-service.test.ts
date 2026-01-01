/**
 * Export/Import Service Unit Tests
 *
 * Tests for memory export and import functionality.
 * Requirements: 6.1 (export to JSON), 6.2 (filter exports)
 *               6.3 (validate import), 6.4 (duplicate detection)
 *               6.5 (merge/replace modes), 6.6 (return summary)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseConnectionManager } from "../../../database/connection-manager";
import type { EmbeddingStorage } from "../../../embeddings/embedding-storage";
import {
  createExportImportService,
  ExportImportError,
  ExportImportService,
  type ExportedMemory,
  type ExportResult,
  type ImportOptions,
} from "../../../memory/export-import-service";

describe("ExportImportService", () => {
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
  let mockEmbeddingStorage: {
    storeEmbeddings: ReturnType<typeof vi.fn>;
    retrieveEmbeddings: ReturnType<typeof vi.fn>;
  };
  let service: ExportImportService;

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

    mockEmbeddingStorage = {
      storeEmbeddings: vi.fn().mockResolvedValue(undefined),
      retrieveEmbeddings: vi.fn().mockResolvedValue({
        episodic: [],
        semantic: [],
        procedural: [],
        emotional: [],
        reflective: [],
      }),
    };

    service = new ExportImportService(
      mockDb as unknown as DatabaseConnectionManager,
      mockEmbeddingStorage as unknown as EmbeddingStorage
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("validateImport (Requirement 6.3)", () => {
    it("should return valid for correct export data", async () => {
      const validData: ExportResult = {
        memories: [
          {
            id: "mem-1",
            content: "Test content",
            primarySector: "episodic",
            metadata: { keywords: [], tags: [] },
            embeddings: null,
            tags: [],
            createdAt: "2024-01-01T00:00:00Z",
            lastAccessed: "2024-01-000:00:00Z",
            strength: 0.8,
            salience: 0.5,
            accessCount: 1,
            links: [],
          },
        ],
        exportedAt: "2024-01-01T00:00:00Z",
        version: "1.0.0",
        userId: "user-123",
        filter: {},
        count: 1,
      };

      const result = await service.validateImport(validData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return invalid for non-object data", async () => {
      const result = await service.validateImport(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Import data must be an object");
    });

    it("should return invalid for missing version", async () => {
      const invalidData = {
        memories: [],
        userId: "user-123",
      };

      const result = await service.validateImport(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field: version");
    });

    it("should return invalid for missing userId", async () => {
      const invalidData = {
        memories: [],
        version: "1.0.0",
      };

      const result = await service.validateImport(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field: userId");
    });

    it("should return invalid for non-array memories", async () => {
      const invalidData = {
        memories: "not-an-array",
        version: "1.0.0",
        userId: "user-123",
      };

      const result = await service.validateImport(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing or invalid field: memories (must be an array)");
    });

    it("should validate memory id field", async () => {
      const invalidData = {
        memories: [{ content: "test", primarySector: "episodic" }],
        version: "1.0.0",
        userId: "user-123",
      };

      const result = await service.validateImport(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("memories[0].id: required and must be a string");
    });

    it("should validate memory content field", async () => {
      const invalidData = {
        memories: [{ id: "mem-1", primarySector: "episodic" }],
        version: "1.0.0",
        userId: "user-123",
      };

      const result = await service.validateImport(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("memories[0].content: required and must be a string");
    });

    it("should validate memory primarySector field", async () => {
      const invalidData = {
        memories: [{ id: "mem-1", content: "test" }],
        version: "1.0.0",
        userId: "user-123",
      };

      const result = await service.validateImport(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("memories[0].primarySector: required and must be a string");
    });

    it("should validate primarySector is a valid sector type", async () => {
      const invalidData = {
        memories: [{ id: "mem-1", content: "test", primarySector: "invalid-sector" }],
        version: "1.0.0",
        userId: "user-123",
      };

      const result = await service.validateImport(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "memories[0].primarySector: must be one of episodic, semantic, procedural, emotional, reflective"
      );
    });

    it("should validate strength is a number", async () => {
      const invalidData = {
        memories: [
          { id: "mem-1", content: "test", primarySector: "episodic", strength: "not-a-number" },
        ],
        version: "1.0.0",
        userId: "user-123",
      };

      const result = await service.validateImport(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("memories[0].strength: must be a number");
    });

    it("should validate salience is a number", async () => {
      const invalidData = {
        memories: [
          { id: "mem-1", content: "test", primarySector: "episodic", salience: "not-a-number" },
        ],
        version: "1.0.0",
        userId: "user-123",
      };

      const result = await service.validateImport(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("memories[0].salience: must be a number");
    });

    it("should validate tags is an array", async () => {
      const invalidData = {
        memories: [
          { id: "mem-1", content: "test", primarySector: "episodic", tags: "not-an-array" },
        ],
        version: "1.0.0",
        userId: "user-123",
      };

      const result = await service.validateImport(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("memories[0].tags: must be an array");
    });

    it("should validate multiple memories and collect all errors", async () => {
      const invalidData = {
        memories: [
          { id: "mem-1", primarySector: "episodic" }, // missing content
          { content: "test", primarySector: "semantic" }, // missing id
        ],
        version: "1.0.0",
        userId: "user-123",
      };

      const result = await service.validateImport(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("memories[0].content: required and must be a string");
      expect(result.errors).toContain("memories[1].id: required and must be a string");
    });

    it("should return invalid for non-object memory entries", async () => {
      const invalidData = {
        memories: ["not-an-object"],
        version: "1.0.0",
        userId: "user-123",
      };

      const result = await service.validateImport(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("memories[0]: must be an object");
    });
  });

  describe("importMemories (Requirements 6.4, 6.5, 6.6)", () => {
    const createValidExportData = (memories: ExportedMemory[]): ExportResult => ({
      memories,
      exportedAt: "2024-01-01T00:00:00Z",
      version: "1.0.0",
      userId: "user-123",
      filter: {},
      count: memories.length,
    });

    const createValidMemory = (id: string, content: string): ExportedMemory => ({
      id,
      content,
      primarySector: "episodic",
      metadata: { keywords: [], tags: [] },
      embeddings: null,
      tags: [],
      createdAt: "2024-01-01T00:00:00Z",
      lastAccessed: "2024-01-01T00:00:00Z",
      strength: 0.8,
      salience: 0.5,
      accessCount: 1,
      links: [],
    });

    it("should throw error for missing userId", async () => {
      const data = createValidExportData([]);
      const options: ImportOptions = { mode: "merge", regenerateEmbeddings: false };

      await expect(service.importMemories("", data, options)).rejects.toThrow(ExportImportError);
      await expect(service.importMemories("", data, options)).rejects.toThrow("userId is required");
    });

    it("should throw error for invalid import data", async () => {
      const invalidData = { memories: "not-an-array" } as unknown as ExportResult;
      const options: ImportOptions = { mode: "merge", regenerateEmbeddings: false };

      await expect(service.importMemories("user-123", invalidData, options)).rejects.toThrow(
        ExportImportError
      );
      await expect(service.importMemories("user-123", invalidData, options)).rejects.toThrow(
        "Invalid import data"
      );
    });

    it("should import new memories successfully", async () => {
      const memory = createValidMemory("mem-1", "Test content");
      const data = createValidExportData([memory]);
      const options: ImportOptions = { mode: "merge", regenerateEmbeddings: false };

      // Mock: memory does not exist
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Mock: insert memory
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Mock: insert metadata
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.importMemories("user-123", data, options);

      expect(result.importedCount).toBe(1);
      expect(result.skippedCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.commitTransaction).toHaveBeenCalledWith(mockClient);
    });

    it("should detect and update existing memories in merge mode (Requirement 6.4, 6.5)", async () => {
      const memory = createValidMemory("mem-1", "Updated content");
      const data = createValidExportData([memory]);
      const options: ImportOptions = { mode: "merge", regenerateEmbeddings: false };

      // Mock: memory exists
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: "mem-1" }] });
      // Mock: update memory
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Mock: update metadata
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.importMemories("user-123", data, options);

      expect(result.importedCount).toBe(1);
      expect(result.skippedCount).toBe(0);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE memories"),
        expect.any(Array)
      );
    });

    it("should delete and re-insert in replace mode (Requirement 6.5)", async () => {
      const memory = createValidMemory("mem-1", "Replaced content");
      const data = createValidExportData([memory]);
      const options: ImportOptions = { mode: "replace", regenerateEmbeddings: false };

      // Mock: memory exists
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: "mem-1" }] });
      // Mock: delete existing
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Mock: insert memory
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Mock: insert metadata
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.importMemories("user-123", data, options);

      expect(result.importedCount).toBe(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM memories"),
        expect.arrayContaining(["mem-1", "user-123"])
      );
    });

    it("should return summary with counts and errors (Requirement 6.6)", async () => {
      const memory1 = createValidMemory("mem-1", "Content 1");
      const memory2 = createValidMemory("mem-2", "Content 2");
      const data = createValidExportData([memory1, memory2]);
      const options: ImportOptions = { mode: "merge", regenerateEmbeddings: false };

      // First memory: success
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      // Second memory: error
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      const result = await service.importMemories("user-123", data, options);

      expect(result.importedCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].memoryId).toBe("mem-2");
      expect(result.errors[0].error).toBe("Database error");
    });

    it("should store embeddings when available and not regenerating", async () => {
      const memory = createValidMemory("mem-1", "Test content");
      memory.embeddings = {
        episodic: [0.1, 0.2],
        semantic: [0.3, 0.4],
        procedural: [0.5, 0.6],
        emotional: [0.7, 0.8],
        reflective: [0.9, 1.0],
      };
      const data = createValidExportData([memory]);
      const options: ImportOptions = { mode: "merge", regenerateEmbeddings: false };

      // Mock: memory does not exist
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Mock: insert memory
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Mock: insert metadata
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await service.importMemories("user-123", data, options);

      expect(mockEmbeddingStorage.storeEmbeddings).toHaveBeenCalledWith(
        "mem-1",
        memory.embeddings,
        "imported",
        mockClient
      );
    });

    it("should not store embeddings when regenerateEmbeddings is true", async () => {
      const memory = createValidMemory("mem-1", "Test content");
      memory.embeddings = {
        episodic: [0.1, 0.2],
        semantic: [0.3, 0.4],
        procedural: [0.5, 0.6],
        emotional: [0.7, 0.8],
        reflective: [0.9, 1.0],
      };
      const data = createValidExportData([memory]);
      const options: ImportOptions = { mode: "merge", regenerateEmbeddings: true };

      // Mock: memory does not exist
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Mock: insert memory
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Mock: insert metadata
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await service.importMemories("user-123", data, options);

      expect(mockEmbeddingStorage.storeEmbeddings).not.toHaveBeenCalled();
    });

    it("should import memory links", async () => {
      const memory = createValidMemory("mem-1", "Test content");
      memory.links = [
        { targetId: "mem-2", weight: 0.8, linkType: "related" },
        { targetId: "mem-3", weight: 0.6, linkType: "similar" },
      ];
      const data = createValidExportData([memory]);
      const options: ImportOptions = { mode: "merge", regenerateEmbeddings: false };

      // Mock: memory does not exist
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Mock: insert memory
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Mock: insert metadata
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Mock: insert links (2 links)
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await service.importMemories("user-123", data, options);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO memory_links"),
        expect.arrayContaining(["mem-1", "mem-2", "related", 0.8])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO memory_links"),
        expect.arrayContaining(["mem-1", "mem-3", "similar", 0.6])
      );
    });

    it("should rollback transaction on fatal error", async () => {
      const memory = createValidMemory("mem-1", "Test content");
      const data = createValidExportData([memory]);
      const options: ImportOptions = { mode: "merge", regenerateEmbeddings: false };

      mockDb.beginTransaction.mockRejectedValueOnce(new Error("Connection failed"));

      await expect(service.importMemories("user-123", data, options)).rejects.toThrow(
        ExportImportError
      );
    });

    it("should handle empty memories array", async () => {
      const data = createValidExportData([]);
      const options: ImportOptions = { mode: "merge", regenerateEmbeddings: false };

      const result = await service.importMemories("user-123", data, options);

      expect(result.importedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(mockDb.commitTransaction).toHaveBeenCalled();
    });

    it("should preserve original timestamps during import", async () => {
      const memory = createValidMemory("mem-1", "Test content");
      memory.createdAt = "2023-06-15T10:30:00Z";
      memory.lastAccessed = "2023-12-20T15:45:00Z";
      const data = createValidExportData([memory]);
      const options: ImportOptions = { mode: "merge", regenerateEmbeddings: false };

      // Mock: memory does not exist
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Mock: insert memory
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Mock: insert metadata
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await service.importMemories("user-123", data, options);

      // Verify the insert query includes the original timestamps
      const insertCall = mockClient.query.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes("INSERT INTO memories")
      );
      expect(insertCall).toBeDefined();
      // Check that the params array contains Date objects with the correct values
      const params = insertCall![1] as unknown[];
      const createdAtParam = params.find(
        (p) => p instanceof Date && p.toISOString() === "2023-06-15T10:30:00.000Z"
      );
      const lastAccessedParam = params.find(
        (p) => p instanceof Date && p.toISOString() === "2023-12-20T15:45:00.000Z"
      );
      expect(createdAtParam).toBeDefined();
      expect(lastAccessedParam).toBeDefined();
    });
  });

  describe("exportMemories (Requirements 6.1, 6.2)", () => {
    it("should throw error for missing userId", async () => {
      await expect(service.exportMemories("")).rejects.toThrow(ExportImportError);
      await expect(service.exportMemories("")).rejects.toThrow("userId is required");
    });

    it("should export memories with all metadata", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: "mem-1",
            content: "Test content",
            primary_sector: "episodic",
            created_at: "2024-01-01T00:00:00Z",
            last_accessed: "2024-01-02T00:00:00Z",
            strength: 0.8,
            salience: 0.5,
            access_count: 5,
            tags: ["work"],
            keywords: ["test"],
            metadata_tags: ["important"],
            category: "notes",
            context: "work context",
            importance: 0.7,
            is_atomic: true,
            parent_id: null,
          },
        ],
      });

      // Mock links query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ target_id: "mem-2", weight: 0.6, link_type: "related" }],
      });

      const result = await service.exportMemories("user-123");

      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].id).toBe("mem-1");
      expect(result.memories[0].content).toBe("Test content");
      expect(result.memories[0].primarySector).toBe("episodic");
      expect(result.memories[0].tags).toEqual(["work"]);
      expect(result.memories[0].links).toHaveLength(1);
      expect(result.version).toBe("1.0.0");
      expect(result.userId).toBe("user-123");
      expect(result.count).toBe(1);
    });

    it("should apply date range filter", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const filter = {
        dateRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
      };

      await service.exportMemories("user-123", filter);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("m.created_at >="),
        expect.any(Array)
      );
    });

    it("should apply sector filter", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const filter = {
        sectors: ["episodic", "semantic"] as (
          | "episodic"
          | "semantic"
          | "procedural"
          | "emotional"
          | "reflective"
        )[],
      };

      await service.exportMemories("user-123", filter);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("m.primary_sector = ANY"),
        expect.any(Array)
      );
    });

    it("should apply tags filter", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const filter = {
        tags: ["work", "important"],
      };

      await service.exportMemories("user-123", filter);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("md.tags &&"),
        expect.any(Array)
      );
    });

    it("should apply minStrength filter", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const filter = {
        minStrength: 0.5,
      };

      await service.exportMemories("user-123", filter);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("m.strength >="),
        expect.any(Array)
      );
    });

    it("should release connection after export", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await service.exportMemories("user-123");

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });

    it("should release connection on error", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(service.exportMemories("user-123")).rejects.toThrow(ExportImportError);

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });

    it("should generate correct SQL parameter placeholders with $ prefix", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const filter = {
        dateRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
        sectors: ["episodic", "semantic"] as (
          | "episodic"
          | "semantic"
          | "procedural"
          | "emotional"
          | "reflective"
        )[],
        tags: ["work", "important"],
        minStrength: 0.5,
      };

      await service.exportMemories("user-123", filter);

      // Verify the SQL query has correct parameter placeholders
      const queryCall = mockClient.query.mock.calls[0];
      const sql = queryCall[0] as string;
      const params = queryCall[1] as unknown[];

      // Should have $1 for userId, $2 for dateRange.start, $3 for dateRange.end,
      // $4 for sectors, $5 for tags, $6 for minStrength
      expect(sql).toContain("m.user_id = $1");
      expect(sql).toContain("m.created_at >= $2");
      expect(sql).toContain("m.created_at <= $3");
      expect(sql).toContain("m.primary_sector = ANY($4)");
      expect(sql).toContain("md.tags && $5");
      expect(sql).toContain("m.strength >= $6");

      // Verify params array has correct values
      expect(params).toHaveLength(6);
      expect(params[0]).toBe("user-123");
      expect(params[1]).toEqual(filter.dateRange.start);
      expect(params[2]).toEqual(filter.dateRange.end);
      expect(params[3]).toEqual(filter.sectors);
      expect(params[4]).toEqual(filter.tags);
      expect(params[5]).toBe(0.5);
    });

    it("should handle empty filter without errors", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.exportMemories("user-123", {});

      expect(result.count).toBe(0);
      expect(result.memories).toHaveLength(0);
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("m.user_id = $1"), [
        "user-123",
      ]);
    });
  });

  describe("createExportImportService", () => {
    it("should create an ExportImportService instance", () => {
      const instance = createExportImportService(
        mockDb as unknown as DatabaseConnectionManager,
        mockEmbeddingStorage as unknown as EmbeddingStorage
      );

      expect(instance).toBeInstanceOf(ExportImportService);
    });
  });
});
