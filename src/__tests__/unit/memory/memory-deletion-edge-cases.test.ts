/**
 * Memory Repository - Memory Deletion Edge Cases Tests
 *
 * Additional tests to cover uncovered branches in delete() method.
 * Target: Improve branch coverage from 86.96% to 90%+
 *
 * Uncovered lines: 1788, 1828-1833
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseConnectionManager } from "../../../database/connection-manager";
import { EmbeddingEngine } from "../../../embeddings/embedding-engine";
import { EmbeddingStorage } from "../../../embeddings/embedding-storage";
import { WaypointGraphBuilder } from "../../../graph/waypoint-builder";
import { MemoryRepository } from "../../../memory/memory-repository";
import { MemoryTransactionError, MemoryValidationError } from "../../../memory/types";

describe("MemoryRepository - Deletion Edge Cases", () => {
  let dbManager: DatabaseConnectionManager;
  let embeddingEngine: EmbeddingEngine;
  let embeddingStorage: EmbeddingStorage;
  let graphBuilder: WaypointGraphBuilder;
  let repository: MemoryRepository;

  beforeEach(async () => {
    // Initialize real database connection for integration testing
    dbManager = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      poolSize: 5,
      connectionTimeout: 5000,
      idleTimeout: 30000,
    });

    await dbManager.connect();

    // Initialize components with mock embedding model
    const { EmbeddingCache } = await import("../../../embeddings/cache");
    const { MockOllamaEmbeddingModel } = await import("../../utils/mock-embeddings");

    const cache = new EmbeddingCache(1000, 300000);
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
      timeout: 30000,
      maxRetries: 3,
    });
    embeddingEngine = new EmbeddingEngine(model, cache);

    embeddingStorage = new EmbeddingStorage(dbManager);
    graphBuilder = new WaypointGraphBuilder(dbManager, embeddingStorage, {
      similarityThreshold: 0.1,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    });
    repository = new MemoryRepository(dbManager, embeddingEngine, graphBuilder, embeddingStorage);

    // Clean up test data
    await dbManager.pool!.query("DELETE FROM memory_links WHERE source_id LIKE 'test-edge-%'");
    await dbManager.pool!.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-edge-%'");
    await dbManager.pool!.query("DELETE FROM memory_embeddings WHERE memory_id LIKE 'test-edge-%'");
    await dbManager.pool!.query("DELETE FROM memories WHERE id LIKE 'test-edge-%'");
  });

  afterEach(async () => {
    // Clean up test data
    await dbManager.pool!.query("DELETE FROM memory_links WHERE source_id LIKE 'test-edge-%'");
    await dbManager.pool!.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-edge-%'");
    await dbManager.pool!.query("DELETE FROM memory_embeddings WHERE memory_id LIKE 'test-edge-%'");
    await dbManager.pool!.query("DELETE FROM memories WHERE id LIKE 'test-edge-%'");

    await dbManager.disconnect();
  });

  describe("Soft Delete Error Handling", () => {
    it("should throw MemoryValidationError when soft deleting non-existent memory", async () => {
      // Target: Line 1788 - throw new MemoryValidationError("Memory not found", "memoryId", memoryId);
      // This tests the soft delete path when memory doesn't exist

      const nonExistentId = "test-edge-nonexistent-soft-delete";

      // Attempt soft delete on non-existent memory
      await expect(repository.delete(nonExistentId, true)).rejects.toThrow(MemoryValidationError);
      await expect(repository.delete(nonExistentId, true)).rejects.toThrow("Memory not found");
    });

    it("should throw MemoryValidationError when hard deleting non-existent memory", async () => {
      // This also tests the hard delete path for completeness
      const nonExistentId = "test-edge-nonexistent-hard-delete";

      // Attempt hard delete on non-existent memory
      await expect(repository.delete(nonExistentId, false)).rejects.toThrow(MemoryValidationError);
      await expect(repository.delete(nonExistentId, false)).rejects.toThrow("Memory not found");
    });
  });

  describe("Transaction Error Handling", () => {
    it("should wrap non-validation errors in MemoryTransactionError", async () => {
      // Target: Lines 1828-1833 - catch block error handling
      // Create a scenario where a non-validation error occurs during deletion

      // Create a mock repository with a failing database connection
      const failingDbManager = {
        ...dbManager,
        beginTransaction: vi.fn().mockRejectedValue(new Error("Database connection failed")),
        commitTransaction: vi.fn(),
        rollbackTransaction: vi.fn(),
        getConnection: vi.fn(),
        releaseConnection: vi.fn(),
      } as unknown as DatabaseConnectionManager;

      const failingRepository = new MemoryRepository(
        failingDbManager,
        embeddingEngine,
        graphBuilder,
        embeddingStorage
      );

      const memoryId = "test-edge-transaction-error";

      // Attempt delete with failing database
      await expect(failingRepository.delete(memoryId, false)).rejects.toThrow(
        MemoryTransactionError
      );
      await expect(failingRepository.delete(memoryId, false)).rejects.toThrow(
        "Failed to delete memory"
      );
    });

    it("should rollback transaction on error", async () => {
      // Target: Lines 1828-1833 - rollback on error
      // Verify that rollback is called when an error occurs

      const rollbackSpy = vi.spyOn(dbManager, "rollbackTransaction");

      // Create a mock repository that fails during query execution
      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error("Query execution failed")),
      };

      const beginTransactionSpy = vi
        .spyOn(dbManager, "beginTransaction")
        .mockResolvedValue(mockClient as any);

      const memoryId = "test-edge-rollback-test";

      // Attempt delete with failing query
      try {
        await repository.delete(memoryId, false);
      } catch (error) {
        // Expected to throw
      }

      // Verify rollback was called
      expect(rollbackSpy).toHaveBeenCalled();

      // Cleanup spies
      beginTransactionSpy.mockRestore();
      rollbackSpy.mockRestore();
    });

    it("should handle empty memoryId validation", async () => {
      // Test validation error path
      await expect(repository.delete("", false)).rejects.toThrow(MemoryValidationError);
      await expect(repository.delete("", false)).rejects.toThrow("Memory ID cannot be empty");
    });

    it("should handle whitespace-only memoryId validation", async () => {
      // Test validation error path
      await expect(repository.delete("   ", false)).rejects.toThrow(MemoryValidationError);
      await expect(repository.delete("   ", false)).rejects.toThrow("Memory ID cannot be empty");
    });
  });

  describe("Error Type Preservation", () => {
    it("should re-throw MemoryValidationError without wrapping", async () => {
      // Target: Lines 1828-1833 - validation error re-throw path
      // Verify that validation errors are re-thrown as-is, not wrapped

      const nonExistentId = "test-edge-validation-preservation";

      try {
        await repository.delete(nonExistentId, true);
        expect.fail("Should have thrown MemoryValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(MemoryValidationError);
        expect(error).not.toBeInstanceOf(MemoryTransactionError);
      }
    });

    it("should wrap generic errors in MemoryTransactionError", async () => {
      // Target: Lines 1828-1833 - generic error wrapping path
      // Verify that non-validation errors are wrapped in MemoryTransactionError

      // Create a scenario where a generic error occurs
      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error("Unexpected database error")),
      };

      const beginTransactionSpy = vi
        .spyOn(dbManager, "beginTransaction")
        .mockResolvedValue(mockClient as any);

      const rollbackSpy = vi.spyOn(dbManager, "rollbackTransaction").mockResolvedValue();

      const memoryId = "test-edge-generic-error";

      try {
        await repository.delete(memoryId, false);
        expect.fail("Should have thrown MemoryTransactionError");
      } catch (error) {
        expect(error).toBeInstanceOf(MemoryTransactionError);
        expect((error as MemoryTransactionError).message).toContain("Failed to delete memory");
      }

      // Cleanup spies
      beginTransactionSpy.mockRestore();
      rollbackSpy.mockRestore();
    });
  });

  describe("Batch Delete Error Handling", () => {
    it("should wrap non-validation errors in MemoryTransactionError for batch delete", async () => {
      // Target: Lines 1730-1745 - batch delete catch block error handling

      // Create a mock repository with a failing database connection
      const failingDbManager = {
        ...dbManager,
        beginTransaction: vi.fn().mockRejectedValue(new Error("Database connection failed")),
        commitTransaction: vi.fn(),
        rollbackTransaction: vi.fn(),
        getConnection: vi.fn(),
        releaseConnection: vi.fn(),
      } as unknown as DatabaseConnectionManager;

      const failingRepository = new MemoryRepository(
        failingDbManager,
        embeddingEngine,
        graphBuilder,
        embeddingStorage
      );

      const memoryIds = ["test-edge-batch-1", "test-edge-batch-2"];

      // Attempt batch delete with failing database
      await expect(failingRepository.batchDelete(memoryIds, false)).rejects.toThrow(
        MemoryTransactionError
      );
      await expect(failingRepository.batchDelete(memoryIds, false)).rejects.toThrow(
        "Failed to batch delete memories"
      );
    });

    it("should rollback transaction on batch delete error", async () => {
      // Target: Lines 1730-1745 - rollback on batch delete error

      const rollbackSpy = vi.spyOn(dbManager, "rollbackTransaction");

      // Create a mock repository that fails during query execution
      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error("Query execution failed")),
      };

      const beginTransactionSpy = vi
        .spyOn(dbManager, "beginTransaction")
        .mockResolvedValue(mockClient as any);

      const memoryIds = ["test-edge-batch-rollback-1", "test-edge-batch-rollback-2"];

      // Attempt batch delete with failing query
      try {
        await repository.batchDelete(memoryIds, false);
      } catch (error) {
        // Expected to throw
      }

      // Verify rollback was called
      expect(rollbackSpy).toHaveBeenCalled();

      // Cleanup spies
      beginTransactionSpy.mockRestore();
      rollbackSpy.mockRestore();
    });

    it("should re-throw MemoryValidationError without wrapping in batch delete", async () => {
      // Target: Lines 1730-1745 - validation error re-throw path in batch delete

      const emptyIds: string[] = [];

      try {
        await repository.batchDelete(emptyIds, false);
        expect.fail("Should have thrown MemoryValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(MemoryValidationError);
        expect(error).not.toBeInstanceOf(MemoryTransactionError);
      }
    });
  });
});
