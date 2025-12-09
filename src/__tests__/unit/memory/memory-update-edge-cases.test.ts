/**
 * Memory Repository - Memory Update Edge Cases Tests
 *
 * Additional tests to cover uncovered branches in update() method.
 * Target: Improve branch coverage to 90%+
 *
 * Uncovered line: 1581 - early return when no metadata fields to update
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../../database/connection-manager";
import { EmbeddingEngine } from "../../../embeddings/embedding-engine";
import { EmbeddingStorage } from "../../../embeddings/embedding-storage";
import { WaypointGraphBuilder } from "../../../graph/waypoint-builder";
import { MemoryRepository } from "../../../memory/memory-repository";
import type { MemoryContent } from "../../../memory/types";

describe("MemoryRepository - Update Edge Cases", () => {
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
      dimension: parseInt(process.env.EMBEDDING_DIMENSION || "1536"),
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
    await dbManager.pool!.query(
      "DELETE FROM memory_links WHERE source_id LIKE 'test-update-edge-%'"
    );
    await dbManager.pool!.query(
      "DELETE FROM memory_metadata WHERE memory_id LIKE 'test-update-edge-%'"
    );
    await dbManager.pool!.query(
      "DELETE FROM memory_embeddings WHERE memory_id LIKE 'test-update-edge-%'"
    );
    await dbManager.pool!.query("DELETE FROM memories WHERE id LIKE 'test-update-edge-%'");
  });

  afterEach(async () => {
    // Clean up test data
    await dbManager.pool!.query(
      "DELETE FROM memory_links WHERE source_id LIKE 'test-update-edge-%'"
    );
    await dbManager.pool!.query(
      "DELETE FROM memory_metadata WHERE memory_id LIKE 'test-update-edge-%'"
    );
    await dbManager.pool!.query(
      "DELETE FROM memory_embeddings WHERE memory_id LIKE 'test-update-edge-%'"
    );
    await dbManager.pool!.query("DELETE FROM memories WHERE id LIKE 'test-update-edge-%'");

    await dbManager.disconnect();
  });

  describe("Metadata Update Edge Cases", () => {
    it("should handle update with empty metadata object (no fields to update)", async () => {
      // Target: Line 1581 - early return when no metadata fields to update
      // This tests the path where metadata is provided but all fields are undefined

      // Create a memory
      const content: MemoryContent = {
        content: "Test memory for empty metadata update",
        userId: "test-user",
        sessionId: "test-session",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      // Update with empty metadata object (all fields undefined)
      const result = await repository.update({
        memoryId: memory.id,
        userId: "test-user",
        metadata: {}, // Empty metadata object - no fields to update
      });

      // Verify update succeeded without errors
      expect(result.memory.id).toBe(memory.id);
      expect(result.embeddingsRegenerated).toBe(false);
      expect(result.connectionsUpdated).toBe(false);

      // Verify metadata was not changed
      const updatedMemory = await repository.retrieve(memory.id, "test-user");
      expect(updatedMemory).not.toBeNull();
      expect(updatedMemory!.metadata).toBeDefined();
    });

    it("should handle update with metadata containing only undefined fields", async () => {
      // Target: Line 1581 - early return when no metadata fields to update
      // This tests the path where metadata fields are explicitly undefined

      // Create a memory with initial metadata
      const content: MemoryContent = {
        content: "Test memory for undefined metadata fields",
        userId: "test-user",
        sessionId: "test-session",
        primarySector: "semantic",
      };

      const initialMetadata = {
        keywords: ["initial", "test"],
        tags: ["tag1"],
        category: "initial-category",
        importance: 0.5,
      };

      const memory = await repository.create(content, initialMetadata);

      // Update with metadata containing only undefined fields
      const result = await repository.update({
        memoryId: memory.id,
        userId: "test-user",
        metadata: {
          keywords: undefined,
          tags: undefined,
          category: undefined,
          context: undefined,
          importance: undefined,
          isAtomic: undefined,
          parentId: undefined,
        },
      });

      // Verify update succeeded
      expect(result.memory.id).toBe(memory.id);

      // Verify original metadata was preserved
      const updatedMemory = await repository.retrieve(memory.id, "test-user");
      expect(updatedMemory).not.toBeNull();
      expect(updatedMemory!.metadata.keywords).toEqual(initialMetadata.keywords);
      expect(updatedMemory!.metadata.tags).toEqual(initialMetadata.tags);
      expect(updatedMemory!.metadata.category).toBe(initialMetadata.category);
    });

    it("should update only strength without metadata changes", async () => {
      // This tests that metadata update is skipped when only strength is updated

      // Create a memory
      const content: MemoryContent = {
        content: "Test memory for strength-only update",
        userId: "test-user",
        sessionId: "test-session",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      // Update only strength (no metadata)
      const result = await repository.update({
        memoryId: memory.id,
        userId: "test-user",
        strength: 0.7,
      });

      // Verify update succeeded
      expect(result.memory.id).toBe(memory.id);
      expect(result.memory.strength).toBe(0.7);
      expect(result.embeddingsRegenerated).toBe(false);
      expect(result.connectionsUpdated).toBe(false);
    });

    it("should update only salience without metadata changes", async () => {
      // This tests that metadata update is skipped when only salience is updated

      // Create a memory
      const content: MemoryContent = {
        content: "Test memory for salience-only update",
        userId: "test-user",
        sessionId: "test-session",
        primarySector: "semantic",
      };

      const memory = await repository.create(content);

      // Update only salience (no metadata)
      const result = await repository.update({
        memoryId: memory.id,
        userId: "test-user",
        salience: 0.8,
      });

      // Verify update succeeded
      expect(result.memory.id).toBe(memory.id);
      expect(result.memory.salience).toBe(0.8);
      expect(result.embeddingsRegenerated).toBe(false);
      expect(result.connectionsUpdated).toBe(false);
    });
  });
});
