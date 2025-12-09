/**
 * Memory Repository - Error Branch Coverage Tests
 *
 * Tests specifically targeting uncovered error handling branches
 * to achieve 90%+ branch coverage.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "../../../memory/memory-repository";
import type { MemoryContent } from "../../../memory/types";
import { MemoryValidationError } from "../../../memory/types";
import { createTestSectorEmbeddings } from "../../utils/test-fixtures";

describe("MemoryRepository - Error Branch Coverage", () => {
  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockGraphBuilder: any;
  let mockEmbeddingStorage: any;

  beforeEach(() => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    mockDb = {
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({ rows: [] }),
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn().mockResolvedValue(undefined),
    };

    mockEmbeddingEngine = {
      generateAllSectorEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
    };

    mockGraphBuilder = {
      createWaypointLinks: vi.fn().mockResolvedValue({
        links: [],
        skippedCount: 0,
      }),
    };

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

  describe("Non-Error Object Handling", () => {
    it("should handle non-Error objects in create method", async () => {
      // Test the String(error) branch when error is not an Error instance
      mockDb.beginTransaction.mockRejectedValue("string error");

      const content: MemoryContent = {
        content: "Test content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      await expect(repository.create(content, {})).rejects.toThrow();
    });

    it("should handle non-Error objects in retrieve method", async () => {
      // Mock getConnection to throw non-Error object
      mockDb.getConnection = vi.fn().mockRejectedValue("string error");

      await expect(repository.retrieve("memory-id", "user-123")).rejects.toThrow();
    });

    it("should handle non-Error objects in search method", async () => {
      mockDb.query.mockRejectedValue({ code: "CUSTOM_ERROR" });

      await expect(repository.search({ text: "test", userId: "user-123" })).rejects.toThrow();
    });

    it("should handle non-Error objects in searchFullText method", async () => {
      mockDb.query.mockRejectedValue(null);

      await expect(
        repository.searchFullText({ query: "test", userId: "user-123" })
      ).rejects.toThrow();
    });
  });

  describe("MemoryValidationError Re-throw", () => {
    it("should re-throw MemoryValidationError wrapped in MemoryCreationError", async () => {
      const validationError = new MemoryValidationError("Invalid content", "content", "");
      mockEmbeddingEngine.generateAllSectorEmbeddings.mockRejectedValue(validationError);

      const content: MemoryContent = {
        content: "Test content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      // The validation error gets wrapped in MemoryCreationError
      await expect(repository.create(content, {})).rejects.toThrow("Embedding generation failed");
    });

    it("should re-throw MemoryValidationError in update method", async () => {
      const validationError = new MemoryValidationError("Invalid update", "content", "");

      // Create a mock client
      const mockClient: any = {
        query: vi.fn(),
        release: vi.fn(),
      };

      // Mock getConnection to return our client
      mockDb.getConnection = vi.fn().mockResolvedValue(mockClient);

      // Mock successful retrieve - first query for SELECT
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: "memory-id",
              content: "Original content",
              created_at: new Date(),
              last_accessed: new Date(),
              access_count: 0,
              salience: 0.5,
              decay_rate: 0.02,
              strength: 1.0,
              user_id: "user-123",
              session_id: "session-456",
              primary_sector: "semantic",
            },
          ],
        })
        // Mock metadata query
        .mockResolvedValueOnce({
          rows: [
            {
              keywords: [],
              tags: [],
              category: null,
              context: null,
              importance: 0.5,
              is_atomic: true,
              parent_id: null,
            },
          ],
        })
        // Mock embeddings query
        .mockResolvedValueOnce({
          rows: [],
        })
        // Mock links query
        .mockResolvedValueOnce({
          rows: [],
        });

      // Mock validation error on embedding generation
      mockEmbeddingEngine.generateAllSectorEmbeddings.mockRejectedValue(validationError);

      await expect(
        repository.update({ memoryId: "memory-id", userId: "user-123", content: "updated" })
      ).rejects.toThrow("Invalid update");
    });

    it("should re-throw MemoryValidationError in searchFullText method", async () => {
      const validationError = new MemoryValidationError("Invalid search query", "query", "");
      const mockClient = {
        query: vi.fn().mockRejectedValue(validationError),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await expect(
        repository.searchFullText({ query: "test", userId: "user-123" })
      ).rejects.toThrow(MemoryValidationError);
    });
  });

  describe("Empty WHERE Clause Branch", () => {
    it("should handle search with no filters (empty WHERE clause)", async () => {
      // Mock successful query with no filters
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          rows: [
            {
              id: "memory-1",
              content: "Test content",
              created_at: new Date(),
              last_accessed: new Date(),
              access_count: 0,
              salience: 0.5,
              decay_rate: 0.02,
              strength: 1.0,
              user_id: "user-123",
              session_id: "session-456",
              primary_sector: "semantic",
              keywords: ["test"],
              tags: ["tag1"],
              category: "general",
              context: "test context",
              importance: 0.5,
              is_atomic: true,
              parent_id: null,
            },
          ],
        }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      // Search with only userId (no other filters) should generate minimal WHERE clause
      const result = await repository.search({ userId: "user-123" });

      expect(result.memories).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalled();
    });

    it("should handle search with only limit and userId", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      const result = await repository.search({ userId: "user-123", limit: 10 });

      expect(result.memories).toHaveLength(0);
      expect(mockClient.query).toHaveBeenCalled();
    });
  });

  describe("Connection Error Branches", () => {
    it("should handle connection errors with 'Connection failed' message in create", async () => {
      const connectionError = new Error("Connection failed to database");
      mockDb.beginTransaction.mockRejectedValue(connectionError);

      const content: MemoryContent = {
        content: "Test content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      await expect(repository.create(content, {})).rejects.toThrow("Database connection failed");
    });

    it("should handle connection errors in retrieve method", async () => {
      const connectionError = new Error("Connection timeout");

      // Mock getConnection to throw error
      mockDb.getConnection = vi.fn().mockRejectedValue(connectionError);

      await expect(repository.retrieve("memory-id", "user-123")).rejects.toThrow(
        "Database connection failed"
      );
    });
  });
});
