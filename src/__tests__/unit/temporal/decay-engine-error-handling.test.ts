/**
 * Temporal Decay Engine Error Handling Tests
 *
 * Tests for error handling and edge cases in the decay engine.
 * Covers uncovered error paths and exception scenarios.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseConnectionManager } from "../../../database/connection-manager";
import type { Memory } from "../../../memory/types";
import { TemporalDecayEngine } from "../../../temporal/decay-engine";
import { SectorConfigManager } from "../../../temporal/sector-config";

describe("TemporalDecayEngine - Error Handling", () => {
  let configManager: SectorConfigManager;
  let db: DatabaseConnectionManager;
  let decayEngine: TemporalDecayEngine;

  beforeEach(async () => {
    configManager = new SectorConfigManager();

    db = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5433"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      poolSize: 5,
      connectionTimeout: 5000,
      idleTimeout: 30000,
    });

    await db.connect();
    decayEngine = new TemporalDecayEngine(configManager, db);

    // Clean up test data
    const client = await db.getConnection();
    try {
      await client.query(`DELETE FROM memory_reinforcement_history WHERE memory_id LIKE 'test-%'`);
      await client.query(`DELETE FROM memories WHERE id LIKE 'test-%'`);
    } finally {
      db.releaseConnection(client);
    }
  });

  afterEach(async () => {
    await db.disconnect();
  });

  describe("batchApplyDecay Error Handling", () => {
    it("should rollback transaction on error during batch processing", async () => {
      // Create a memory with invalid data that will cause an error
      const invalidMemory: Memory = {
        id: "invalid-memory-id-that-does-not-exist",
        content: "Test",
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
        salience: 0.5,
        decayRate: 0.03,
        strength: 1.0,
        userId: "user-1",
        sessionId: "session-1",
        primarySector: "episodic",
        metadata: {},
      };

      // Mock the database to throw an error during update
      const originalQuery = db.getConnection;
      vi.spyOn(db, "getConnection").mockImplementation(async () => {
        const client = await originalQuery.call(db);
        const originalClientQuery = client.query.bind(client);
        client.query = vi.fn(async (sql: any, params?: any) => {
          if (typeof sql === "string" && sql.includes("UPDATE memories")) {
            throw new Error("Database update failed");
          }
          return originalClientQuery(sql, params);
        }) as any;
        return client;
      });

      // Should handle error gracefully and rollback
      await expect(decayEngine.batchApplyDecay([invalidMemory])).rejects.toThrow(
        "Database update failed"
      );

      vi.restoreAllMocks();
    });
  });

  describe("reinforceMemoryByType Error Handling", () => {
    it("should throw error when memory not found", async () => {
      await expect(
        decayEngine.reinforceMemoryByType("non-existent-memory-id", "access")
      ).rejects.toThrow("Memory not found");
    });

    it("should throw error when boost is undefined for explicit reinforcement", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-explicit-no-boost",
            "Test memory",
            new Date(),
            new Date(),
            0,
            0.5,
            0.03,
            0.5,
            "user-1",
            "session-1",
            "episodic",
          ]
        );

        // Insert metadata to avoid join issues
        await client.query(
          `INSERT INTO memory_metadata (memory_id, keywords, tags, importance, category, context, is_atomic, parent_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          ["test-explicit-no-boost", [], [], 0.5, null, null, true, null]
        );
      } finally {
        db.releaseConnection(client);
      }

      // Should throw error when boost is not provided for explicit type
      await expect(
        decayEngine.reinforceMemoryByType("test-explicit-no-boost", "explicit", undefined)
      ).rejects.toThrow("Boost parameter required for explicit reinforcement");

      // Cleanup
      const client2 = await db.getConnection();
      try {
        await client2.query(`DELETE FROM memories WHERE id = $1`, ["test-explicit-no-boost"]);
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should throw error for invalid reinforcement type in default case", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-invalid-type",
            "Test memory",
            new Date(),
            new Date(),
            0,
            0.5,
            0.03,
            0.5,
            "user-1",
            "session-1",
            "episodic",
          ]
        );
      } finally {
        db.releaseConnection(client);
      }

      // Should throw error for invalid type
      await expect(
        decayEngine.reinforceMemoryByType("test-invalid-type", "invalid" as any)
      ).rejects.toThrow("Invalid reinforcement type");

      // Cleanup
      const client2 = await db.getConnection();
      try {
        await client2.query(`DELETE FROM memories WHERE id = $1`, ["test-invalid-type"]);
      } finally {
        db.releaseConnection(client2);
      }
    });
  });

  describe("runDecayMaintenance Error Handling", () => {
    it("should handle batch processing errors and continue", async () => {
      // Create test memories
      const client = await db.getConnection();
      try {
        for (let i = 1; i <= 5; i++) {
          await client.query(
            `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              `test-maint-error-${i}`,
              `Test memory ${i}`,
              new Date(),
              new Date(),
              1,
              0.5,
              0.03,
              0.8,
              "user-1",
              "session-1",
              "episodic",
            ]
          );
        }
      } finally {
        db.releaseConnection(client);
      }

      // Mock batchApplyDecay to throw error on first batch
      const originalBatchApplyDecay = decayEngine.batchApplyDecay.bind(decayEngine);
      let callCount = 0;
      vi.spyOn(decayEngine, "batchApplyDecay").mockImplementation(async (memories: Memory[]) => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Batch processing failed");
        }
        return originalBatchApplyDecay(memories);
      });

      const result = await decayEngine.runDecayMaintenance();

      // Should have errors but still complete
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Batch");
      expect(result.errors[0]).toContain("failed");

      vi.restoreAllMocks();

      // Cleanup
      const client2 = await db.getConnection();
      try {
        for (let i = 1; i <= 5; i++) {
          await client2.query(`DELETE FROM memories WHERE id = $1`, [`test-maint-error-${i}`]);
        }
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should handle main maintenance errors gracefully", async () => {
      // Mock getConnection to throw error
      vi.spyOn(db, "getConnection").mockRejectedValueOnce(new Error("Database connection failed"));

      const result = await decayEngine.runDecayMaintenance();

      // Should capture error in errors array
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Maintenance failed");
      expect(result.processedCount).toBe(0);
      expect(result.prunedCount).toBe(0);

      vi.restoreAllMocks();
    });
  });

  describe("pruneMemories Error Handling", () => {
    it("should rollback transaction on error during pruning", async () => {
      // Mock beginTransaction to return a client that throws on DELETE
      const originalBeginTransaction = db.beginTransaction.bind(db);
      const spy = vi.spyOn(db, "beginTransaction").mockImplementation(async () => {
        const client = await originalBeginTransaction();
        const originalQuery = client.query.bind(client);
        client.query = vi.fn(async (sql: any, params?: any) => {
          if (typeof sql === "string" && sql.includes("DELETE FROM memories")) {
            throw new Error("Delete operation failed");
          }
          return originalQuery(sql, params);
        }) as any;
        return client;
      });

      // Should throw error and rollback
      await expect(decayEngine.pruneMemories(["test-prune-error-id"])).rejects.toThrow(
        "Delete operation failed"
      );

      spy.mockRestore();
    });
  });

  describe("calculateDiminishedBoost Edge Cases", () => {
    it("should handle memory with no reinforcement history", async () => {
      // Create test memory without any reinforcement history
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-no-history",
            "Test memory",
            new Date(),
            new Date(),
            0,
            0.5,
            0.03,
            0.5,
            "user-1",
            "session-1",
            "episodic",
          ]
        );
      } finally {
        db.releaseConnection(client);
      }

      // First reinforcement should apply full boost
      await decayEngine.autoReinforceOnAccess("test-no-history");

      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-no-history",
        ]);
        // Should get full 0.3 boost: 0.5 + 0.3 = 0.8
        expect(result.rows[0].strength).toBeCloseTo(0.8, 2);
      } finally {
        db.releaseConnection(client2);
      }

      // Cleanup
      const client3 = await db.getConnection();
      try {
        await client3.query(`DELETE FROM memories WHERE id = $1`, ["test-no-history"]);
      } finally {
        db.releaseConnection(client3);
      }
    });
  });
});
