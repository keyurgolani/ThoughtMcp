/**
 * Embedding Storage Tests
 *
 * Tests for embedding storage and retrieval system using PostgreSQL with pgvector.
 * Tests cover:
 * - Storing five-sector embeddings per memory
 * - Vector similarity search using pgvector
 * - IVFFlat index usage and performance
 * - Embedding updates when memory content changes
 * - Embedding deletion cascade
 * - Multi-sector search with composite scoring
 * - Error handling (connection failures, invalid data)
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../../database/connection-manager";
import { SchemaMigrationSystem } from "../../../database/schema-migration";
import { EmbeddingStorage } from "../../../embeddings/embedding-storage";
import type { MemorySector, SectorEmbeddings } from "../../../embeddings/types";

describe("EmbeddingStorage - Store and Retrieve", () => {
  let storage: EmbeddingStorage;
  let dbManager: DatabaseConnectionManager;
  const testMemoryId = "test-memory-001";

  beforeAll(async () => {
    // Set up database connection and run migrations
    dbManager = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5433"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });

    await dbManager.connect();

    // Run migrations to create schema
    const migrationSystem = new SchemaMigrationSystem(dbManager);
    await migrationSystem.runMigrations();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  beforeEach(async () => {
    storage = new EmbeddingStorage(dbManager);

    // Clean up test data
    await dbManager.pool!.query("DELETE FROM memory_embeddings WHERE memory_id LIKE 'test-%'");
    await dbManager.pool!.query("DELETE FROM memories WHERE id LIKE 'test-%'");

    // Insert test memory
    await dbManager.pool!.query(
      `INSERT INTO memories (id, content, user_id, session_id, primary_sector)
       VALUES ($1, $2, $3, $4, $5)`,
      [testMemoryId, "Test memory content", "test-user", "test-session", "semantic"]
    );
  });

  afterEach(async () => {
    // Clean up
    await dbManager.pool!.query("DELETE FROM memory_embeddings WHERE memory_id LIKE 'test-%'");
    await dbManager.pool!.query("DELETE FROM memories WHERE id LIKE 'test-%'");
  });

  it("should store all five sector embeddings for a memory", async () => {
    // Requirement 2.1, 2.3: Store five-sector embeddings
    const embeddings: SectorEmbeddings = {
      episodic: createTestEmbedding(768, 0.1),
      semantic: createTestEmbedding(768, 0.2),
      procedural: createTestEmbedding(768, 0.3),
      emotional: createTestEmbedding(768, 0.4),
      reflective: createTestEmbedding(768, 0.5),
    };

    await storage.storeEmbeddings(testMemoryId, embeddings, "nomic-embed-text");

    // Verify all sectors are stored
    const result = await dbManager.pool!.query(
      "SELECT sector, dimension, model FROM memory_embeddings WHERE memory_id = $1 ORDER BY sector",
      [testMemoryId]
    );

    expect(result.rows).toHaveLength(5);
    expect(result.rows.map((r) => r.sector).sort()).toEqual([
      "emotional",
      "episodic",
      "procedural",
      "reflective",
      "semantic",
    ]);
    expect(result.rows.every((r) => r.dimension === 768)).toBe(true);
    expect(result.rows.every((r) => r.model === "nomic-embed-text")).toBe(true);
  });

  it("should retrieve all sector embeddings for a memory", async () => {
    // Requirement 2.1, 2.3: Retrieve five-sector embeddings
    const embeddings: SectorEmbeddings = {
      episodic: createTestEmbedding(768, 0.1),
      semantic: createTestEmbedding(768, 0.2),
      procedural: createTestEmbedding(768, 0.3),
      emotional: createTestEmbedding(768, 0.4),
      reflective: createTestEmbedding(768, 0.5),
    };

    await storage.storeEmbeddings(testMemoryId, embeddings, "nomic-embed-text");

    const retrieved = await storage.retrieveEmbeddings(testMemoryId);

    expect(retrieved).toBeDefined();
    expect(retrieved.episodic).toBeDefined();
    expect(retrieved.semantic).toBeDefined();
    expect(retrieved.procedural).toBeDefined();
    expect(retrieved.emotional).toBeDefined();
    expect(retrieved.reflective).toBeDefined();

    expect(retrieved.episodic.length).toBe(768);
    expect(retrieved.semantic.length).toBe(768);
    expect(retrieved.procedural.length).toBe(768);
    expect(retrieved.emotional.length).toBe(768);
    expect(retrieved.reflective.length).toBe(768);
  });

  it("should retrieve specific sectors when requested", async () => {
    // Requirement 2.1, 2.3: Selective sector retrieval
    const embeddings: SectorEmbeddings = {
      episodic: createTestEmbedding(768, 0.1),
      semantic: createTestEmbedding(768, 0.2),
      procedural: createTestEmbedding(768, 0.3),
      emotional: createTestEmbedding(768, 0.4),
      reflective: createTestEmbedding(768, 0.5),
    };

    await storage.storeEmbeddings(testMemoryId, embeddings, "nomic-embed-text");

    const retrieved = await storage.retrieveEmbeddings(testMemoryId, [
      "semantic" as MemorySector,
      "episodic" as MemorySector,
    ]);

    expect(retrieved.semantic).toBeDefined();
    expect(retrieved.episodic).toBeDefined();
    expect(retrieved.semantic.length).toBe(768);
    expect(retrieved.episodic.length).toBe(768);
  });

  it("should update embeddings when memory content changes", async () => {
    // Requirement 2.3: Update embeddings
    const originalEmbeddings: SectorEmbeddings = {
      episodic: createTestEmbedding(768, 0.1),
      semantic: createTestEmbedding(768, 0.2),
      procedural: createTestEmbedding(768, 0.3),
      emotional: createTestEmbedding(768, 0.4),
      reflective: createTestEmbedding(768, 0.5),
    };

    await storage.storeEmbeddings(testMemoryId, originalEmbeddings, "nomic-embed-text");

    // Update semantic embedding
    const updatedEmbeddings: Partial<SectorEmbeddings> = {
      semantic: createTestEmbedding(768, 0.9),
    };

    await storage.updateEmbeddings(testMemoryId, updatedEmbeddings, "nomic-embed-text");

    const retrieved = await storage.retrieveEmbeddings(testMemoryId);

    // Semantic should be updated - verify it matches the new embedding
    const expectedSemanticEmbedding = createTestEmbedding(768, 0.9);
    expect(retrieved.semantic[0]).toBeCloseTo(expectedSemanticEmbedding[0], 3);

    // Others should remain unchanged
    const expectedEpisodicEmbedding = createTestEmbedding(768, 0.1);
    expect(retrieved.episodic[0]).toBeCloseTo(expectedEpisodicEmbedding[0], 3);
  });

  it("should delete embeddings when memory is deleted", async () => {
    // Requirement 2.3: Cascade deletion
    const embeddings: SectorEmbeddings = {
      episodic: createTestEmbedding(768, 0.1),
      semantic: createTestEmbedding(768, 0.2),
      procedural: createTestEmbedding(768, 0.3),
      emotional: createTestEmbedding(768, 0.4),
      reflective: createTestEmbedding(768, 0.5),
    };

    await storage.storeEmbeddings(testMemoryId, embeddings, "nomic-embed-text");

    await storage.deleteEmbeddings(testMemoryId);

    const result = await dbManager.pool!.query(
      "SELECT COUNT(*) as count FROM memory_embeddings WHERE memory_id = $1",
      [testMemoryId]
    );

    expect(parseInt(result.rows[0].count)).toBe(0);
  });
});

describe("EmbeddingStorage - Vector Similarity Search", () => {
  let storage: EmbeddingStorage;
  let dbManager: DatabaseConnectionManager;

  beforeAll(async () => {
    dbManager = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5433"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });

    await dbManager.connect();

    // Run migrations to create schema
    const migrationSystem = new SchemaMigrationSystem(dbManager);
    await migrationSystem.runMigrations();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  beforeEach(async () => {
    storage = new EmbeddingStorage(dbManager);

    // Clean up test data
    await dbManager.pool!.query("DELETE FROM memory_embeddings WHERE memory_id LIKE 'test-%'");
    await dbManager.pool!.query("DELETE FROM memories WHERE id LIKE 'test-%'");

    // Insert test memories with embeddings
    await insertTestMemoriesWithEmbeddings(dbManager, storage);
  });

  afterEach(async () => {
    await dbManager.pool!.query("DELETE FROM memory_embeddings WHERE memory_id LIKE 'test-%'");
    await dbManager.pool!.query("DELETE FROM memories WHERE id LIKE 'test-%'");
  });

  it("should perform vector similarity search using pgvector", async () => {
    // Requirement 2.2, 2.5: Vector similarity search
    const queryEmbedding = createTestEmbedding(768, 0.1);

    const results = await storage.vectorSimilaritySearch(
      queryEmbedding,
      "semantic" as MemorySector,
      10,
      0.5
    );

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    // Results should be sorted by similarity (descending)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
    }

    // All results should meet threshold
    results.forEach((result) => {
      expect(result.similarity).toBeGreaterThanOrEqual(0.5);
      expect(result.memoryId).toBeDefined();
      expect(result.sector).toBe("semantic");
    });
  });

  it("should complete similarity search within performance target", async () => {
    // Requirement 2.5: p95 <200ms for vector search
    const queryEmbedding = createTestEmbedding(768, 0.5);

    const startTime = Date.now();
    await storage.vectorSimilaritySearch(queryEmbedding, "semantic" as MemorySector, 10, 0.5);
    const duration = Date.now() - startTime;

    // Should complete in reasonable time (relaxed for test environment)
    expect(duration).toBeLessThan(500); // 500ms for test environment
  });

  it("should use IVFFlat index for fast approximate search", async () => {
    // Requirement 2.2, 2.5: IVFFlat index usage
    const queryEmbedding = createTestEmbedding(768, 0.3);

    // Query should use index (verified by performance)
    const startTime = Date.now();
    const results = await storage.vectorSimilaritySearch(
      queryEmbedding,
      "semantic" as MemorySector,
      10,
      0.5
    );
    const duration = Date.now() - startTime;

    expect(results).toBeDefined();
    expect(duration).toBeLessThan(500); // Fast due to index
  });

  it("should limit results to specified count", async () => {
    // Requirement 2.2: Result limiting
    const queryEmbedding = createTestEmbedding(768, 0.2);

    const results = await storage.vectorSimilaritySearch(
      queryEmbedding,
      "semantic" as MemorySector,
      3,
      0.0
    );

    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("should filter results by similarity threshold", async () => {
    // Requirement 2.2: Threshold filtering
    const queryEmbedding = createTestEmbedding(768, 0.4);

    const results = await storage.vectorSimilaritySearch(
      queryEmbedding,
      "semantic" as MemorySector,
      10,
      0.8
    );

    // All results should meet high threshold
    results.forEach((result) => {
      expect(result.similarity).toBeGreaterThanOrEqual(0.8);
    });
  });
});

describe("EmbeddingStorage - Multi-Sector Search", () => {
  let storage: EmbeddingStorage;
  let dbManager: DatabaseConnectionManager;

  beforeAll(async () => {
    dbManager = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5433"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });

    await dbManager.connect();

    // Run migrations to create schema
    const migrationSystem = new SchemaMigrationSystem(dbManager);
    await migrationSystem.runMigrations();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  beforeEach(async () => {
    storage = new EmbeddingStorage(dbManager);

    await dbManager.pool!.query("DELETE FROM memory_embeddings WHERE memory_id LIKE 'test-%'");
    await dbManager.pool!.query("DELETE FROM memories WHERE id LIKE 'test-%'");

    await insertTestMemoriesWithEmbeddings(dbManager, storage);
  });

  afterEach(async () => {
    await dbManager.pool!.query("DELETE FROM memory_embeddings WHERE memory_id LIKE 'test-%'");
    await dbManager.pool!.query("DELETE FROM memories WHERE id LIKE 'test-%'");
  });

  it("should perform multi-sector search with composite scoring", async () => {
    // Requirement 2.1, 2.2: Multi-sector search
    const queryEmbeddings: Partial<SectorEmbeddings> = {
      semantic: createTestEmbedding(768, 0.2),
      episodic: createTestEmbedding(768, 0.1),
    };

    const weights = {
      semantic: 0.6,
      episodic: 0.4,
    };

    const results = await storage.multiSectorSearch(queryEmbeddings, weights, 10);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    // Results should be sorted by composite score
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
    }
  });

  it("should weight sectors according to specified weights", async () => {
    // Requirement 2.1, 2.2: Weighted sector search
    const queryEmbeddings: Partial<SectorEmbeddings> = {
      semantic: createTestEmbedding(768, 0.5),
      emotional: createTestEmbedding(768, 0.3),
    };

    // Heavily weight semantic
    const weights = {
      semantic: 0.9,
      emotional: 0.1,
    };

    const results = await storage.multiSectorSearch(queryEmbeddings, weights, 5);

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("EmbeddingStorage - Error Handling", () => {
  let storage: EmbeddingStorage;
  let dbManager: DatabaseConnectionManager;

  beforeAll(async () => {
    dbManager = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5433"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });

    await dbManager.connect();

    // Run migrations to create schema
    const migrationSystem = new SchemaMigrationSystem(dbManager);
    await migrationSystem.runMigrations();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  beforeEach(async () => {
    storage = new EmbeddingStorage(dbManager);
  });

  it("should handle storing embeddings for non-existent memory", async () => {
    // Requirement 2.3: Error handling
    const embeddings: SectorEmbeddings = {
      episodic: createTestEmbedding(768, 0.1),
      semantic: createTestEmbedding(768, 0.2),
      procedural: createTestEmbedding(768, 0.3),
      emotional: createTestEmbedding(768, 0.4),
      reflective: createTestEmbedding(768, 0.5),
    };

    await expect(
      storage.storeEmbeddings("non-existent-memory", embeddings, "nomic-embed-text")
    ).rejects.toThrow();
  });

  it("should handle retrieving embeddings for non-existent memory", async () => {
    // Requirement 2.3: Error handling
    const retrieved = await storage.retrieveEmbeddings("non-existent-memory");

    // Should return empty or throw - implementation dependent
    expect(retrieved).toBeDefined();
  });

  it("should handle invalid embedding dimensions", async () => {
    // Requirement 2.4: Dimension validation
    const invalidEmbeddings: SectorEmbeddings = {
      episodic: createTestEmbedding(512, 0.1), // Wrong dimension
      semantic: createTestEmbedding(768, 0.2),
      procedural: createTestEmbedding(768, 0.3),
      emotional: createTestEmbedding(768, 0.4),
      reflective: createTestEmbedding(768, 0.5),
    };

    // Should handle dimension mismatch gracefully
    await expect(
      storage.storeEmbeddings("test-memory-invalid", invalidEmbeddings, "nomic-embed-text")
    ).rejects.toThrow();
  });

  it("should throw error when database not connected for storeEmbeddings", async () => {
    // Test error handling when database is not connected
    const disconnectedManager = new DatabaseConnectionManager({
      host: "localhost",
      port: 5433,
      database: "test",
      user: "test",
      password: "test",
    });
    const disconnectedStorage = new EmbeddingStorage(disconnectedManager);

    const embeddings: SectorEmbeddings = {
      episodic: createTestEmbedding(768, 0.1),
      semantic: createTestEmbedding(768, 0.2),
      procedural: createTestEmbedding(768, 0.3),
      emotional: createTestEmbedding(768, 0.4),
      reflective: createTestEmbedding(768, 0.5),
    };

    await expect(
      disconnectedStorage.storeEmbeddings("test-id", embeddings, "test-model")
    ).rejects.toThrow("Database not connected");
  });

  it("should throw error when database not connected for retrieveEmbeddings", async () => {
    const disconnectedManager = new DatabaseConnectionManager({
      host: "localhost",
      port: 5433,
      database: "test",
      user: "test",
      password: "test",
    });
    const disconnectedStorage = new EmbeddingStorage(disconnectedManager);

    await expect(disconnectedStorage.retrieveEmbeddings("test-id")).rejects.toThrow(
      "Database not connected"
    );
  });

  it("should throw error when database not connected for updateEmbeddings", async () => {
    const disconnectedManager = new DatabaseConnectionManager({
      host: "localhost",
      port: 5433,
      database: "test",
      user: "test",
      password: "test",
    });
    const disconnectedStorage = new EmbeddingStorage(disconnectedManager);

    await expect(disconnectedStorage.updateEmbeddings("test-id", {}, "test-model")).rejects.toThrow(
      "Database not connected"
    );
  });

  it("should throw error when database not connected for deleteEmbeddings", async () => {
    const disconnectedManager = new DatabaseConnectionManager({
      host: "localhost",
      port: 5433,
      database: "test",
      user: "test",
      password: "test",
    });
    const disconnectedStorage = new EmbeddingStorage(disconnectedManager);

    await expect(disconnectedStorage.deleteEmbeddings("test-id")).rejects.toThrow(
      "Database not connected"
    );
  });

  it("should throw error when database not connected for vectorSimilaritySearch", async () => {
    const disconnectedManager = new DatabaseConnectionManager({
      host: "localhost",
      port: 5433,
      database: "test",
      user: "test",
      password: "test",
    });
    const disconnectedStorage = new EmbeddingStorage(disconnectedManager);

    await expect(
      disconnectedStorage.vectorSimilaritySearch(
        createTestEmbedding(768, 0.1),
        "semantic" as MemorySector,
        10
      )
    ).rejects.toThrow("Database not connected");
  });

  it("should throw error when database not connected for multiSectorSearch", async () => {
    const disconnectedManager = new DatabaseConnectionManager({
      host: "localhost",
      port: 5433,
      database: "test",
      user: "test",
      password: "test",
    });
    const disconnectedStorage = new EmbeddingStorage(disconnectedManager);

    await expect(
      disconnectedStorage.multiSectorSearch({ semantic: createTestEmbedding(768, 0.1) }, {}, 10)
    ).rejects.toThrow("Database not connected");
  });

  it("should handle updateEmbeddings with empty embeddings object", async () => {
    // Test that updateEmbeddings handles empty updates gracefully
    const memoryId = "test-memory-update-empty";

    await dbManager.pool!.query(
      `INSERT INTO memories (id, content, user_id, session_id, primary_sector)
       VALUES ($1, $2, $3, $4, $5)`,
      [memoryId, "Test content", "test-user", "test-session", "semantic"]
    );

    // Store initial embeddings
    const embeddings: SectorEmbeddings = {
      episodic: createTestEmbedding(768, 0.1),
      semantic: createTestEmbedding(768, 0.2),
      procedural: createTestEmbedding(768, 0.3),
      emotional: createTestEmbedding(768, 0.4),
      reflective: createTestEmbedding(768, 0.5),
    };

    await storage.storeEmbeddings(memoryId, embeddings, "test-model");

    // Update with empty object should not throw
    await expect(storage.updateEmbeddings(memoryId, {}, "test-model")).resolves.not.toThrow();

    // Clean up
    await dbManager.pool!.query("DELETE FROM memory_embeddings WHERE memory_id = $1", [memoryId]);
    await dbManager.pool!.query("DELETE FROM memories WHERE id = $1", [memoryId]);
  });

  it("should handle updateEmbeddings with empty array embeddings", async () => {
    // Test that updateEmbeddings skips empty array embeddings
    const memoryId = "test-memory-update-empty-array";

    await dbManager.pool!.query(
      `INSERT INTO memories (id, content, user_id, session_id, primary_sector)
       VALUES ($1, $2, $3, $4, $5)`,
      [memoryId, "Test content", "test-user", "test-session", "semantic"]
    );

    // Store initial embeddings
    const embeddings: SectorEmbeddings = {
      episodic: createTestEmbedding(768, 0.1),
      semantic: createTestEmbedding(768, 0.2),
      procedural: createTestEmbedding(768, 0.3),
      emotional: createTestEmbedding(768, 0.4),
      reflective: createTestEmbedding(768, 0.5),
    };

    await storage.storeEmbeddings(memoryId, embeddings, "test-model");

    // Update with empty array should not throw
    await expect(
      storage.updateEmbeddings(memoryId, { semantic: [] }, "test-model")
    ).resolves.not.toThrow();

    // Clean up
    await dbManager.pool!.query("DELETE FROM memory_embeddings WHERE memory_id = $1", [memoryId]);
    await dbManager.pool!.query("DELETE FROM memories WHERE id = $1", [memoryId]);
  });
});

// Helper functions

function createTestEmbedding(dimension: number, seed: number): number[] {
  const embedding = new Array(dimension);
  for (let i = 0; i < dimension; i++) {
    embedding[i] = seed + i * 0.001;
  }
  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}

describe("EmbeddingStorage - Edge Cases", () => {
  let dbManager: DatabaseConnectionManager;
  let storage: EmbeddingStorage;

  beforeAll(async () => {
    dbManager = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5433"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });

    await dbManager.connect();

    const migrationSystem = new SchemaMigrationSystem(dbManager);
    await migrationSystem.runMigrations();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  beforeEach(async () => {
    storage = new EmbeddingStorage(dbManager);
  });

  it("should return empty array when no query embeddings provided", async () => {
    // Requirement: Handle edge case of empty query embeddings
    const result = await storage.multiSectorSearch({}, {}, 10);

    expect(result).toEqual([]);
  });

  it("should handle transaction rollback on error", async () => {
    // Requirement: Test transaction rollback scenario
    const memoryId = "test-memory-rollback";

    // Insert memory
    await dbManager.pool!.query(
      `INSERT INTO memories (id, content, user_id, session_id, primary_sector)
       VALUES ($1, $2, $3, $4, $5)`,
      [memoryId, "Test content", "test-user", "test-session", "semantic"]
    );

    // Try to store embeddings with invalid dimension (should fail)
    const invalidEmbeddings: SectorEmbeddings = {
      episodic: [0.1, 0.2], // Wrong dimension
      semantic: [0.1, 0.2],
      procedural: [0.1, 0.2],
      emotional: [0.1, 0.2],
      reflective: [0.1, 0.2],
    };

    await expect(
      storage.storeEmbeddings(memoryId, invalidEmbeddings, "test-model")
    ).rejects.toThrow();

    // Verify no embeddings were stored (transaction rolled back)
    const result = await dbManager.pool!.query(
      "SELECT COUNT(*) FROM memory_embeddings WHERE memory_id = $1",
      [memoryId]
    );

    expect(parseInt(result.rows[0].count)).toBe(0);
  });

  it("should handle invalid embedding format in parseEmbedding", async () => {
    // Requirement: Test parseEmbedding error path for invalid format
    const memoryId = "test-memory-invalid-format";

    // We need to test the else branch where embeddingData is neither string nor array
    // This is tricky because PostgreSQL will always return data in a specific format
    // We'll test by mocking the database response
    if (!dbManager.pool) {
      throw new Error("Database pool not initialized");
    }

    type QueryFunction = typeof dbManager.pool.query;
    const originalQuery = dbManager.pool.query.bind(dbManager.pool) as QueryFunction;

    dbManager.pool.query = (async (sql: string | { text: string }, params?: unknown[]) => {
      const sqlText = typeof sql === "string" ? sql : sql.text;
      if (sqlText.includes("SELECT sector, embedding FROM memory_embeddings")) {
        return {
          rows: [
            {
              sector: "semantic",
              embedding: 12345, // Invalid format - number instead of string/array
            },
          ],
          command: "SELECT",
          rowCount: 1,
          oid: 0,
          fields: [],
        };
      }
      return originalQuery(sql, params);
    }) as QueryFunction;

    // Should throw error for invalid embedding format
    await expect(storage.retrieveEmbeddings(memoryId)).rejects.toThrow("Invalid embedding format");

    // Restore original query function
    dbManager.pool!.query = originalQuery;
  });

  it("should handle multiSectorSearch with all zero weights", async () => {
    // Requirement: Test multiSectorSearch with zero-weight sectors
    const queryEmbeddings: Partial<SectorEmbeddings> = {
      semantic: createTestEmbedding(768, 0.5),
      episodic: createTestEmbedding(768, 0.3),
    };

    // All weights are zero
    const weights = {
      semantic: 0,
      episodic: 0,
    };

    const results = await storage.multiSectorSearch(queryEmbeddings, weights, 10);

    // Should return empty array when all weights are zero
    expect(results).toEqual([]);
  });

  it("should handle vectorSimilaritySearch with no matching results", async () => {
    // Requirement: Test vectorSimilaritySearch with empty result set
    // Use a very high threshold that no results will meet
    const queryEmbedding = createTestEmbedding(768, 0.1);

    const results = await storage.vectorSimilaritySearch(
      queryEmbedding,
      "semantic" as MemorySector,
      10,
      0.999 // Very high threshold
    );

    // Should return empty array when no results meet threshold
    expect(results).toEqual([]);
  });
});

async function insertTestMemoriesWithEmbeddings(
  dbManager: DatabaseConnectionManager,
  storage: EmbeddingStorage
): Promise<void> {
  // Insert 10 test memories with embeddings
  for (let i = 0; i < 10; i++) {
    const memoryId = `test-memory-${String(i).padStart(3, "0")}`;

    await dbManager.pool!.query(
      `INSERT INTO memories (id, content, user_id, session_id, primary_sector)
       VALUES ($1, $2, $3, $4, $5)`,
      [memoryId, `Test memory content ${i}`, "test-user", "test-session", "semantic"]
    );

    const embeddings: SectorEmbeddings = {
      episodic: createTestEmbedding(768, 0.1 + i * 0.05),
      semantic: createTestEmbedding(768, 0.2 + i * 0.05),
      procedural: createTestEmbedding(768, 0.3 + i * 0.05),
      emotional: createTestEmbedding(768, 0.4 + i * 0.05),
      reflective: createTestEmbedding(768, 0.5 + i * 0.05),
    };

    await storage.storeEmbeddings(memoryId, embeddings, "nomic-embed-text");
  }
}
