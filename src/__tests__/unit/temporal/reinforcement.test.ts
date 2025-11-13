/**
 * Reinforcement System Tests
 *
 * Tests for memory reinforcement mechanisms including:
 * - Automatic reinforcement on access (+0.3 boost)
 * - Diminishing returns for recent reinforcement
 * - Strength capping at 1.0
 * - Reinforcement history tracking
 * - Different reinforcement types (access, explicit, importance)
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../../database/connection-manager";
import { TemporalDecayEngine } from "../../../temporal/decay-engine";
import { SectorConfigManager } from "../../../temporal/sector-config";

describe("Reinforcement System", () => {
  let db: DatabaseConnectionManager;
  let configManager: SectorConfigManager;
  let decayEngine: TemporalDecayEngine;

  beforeAll(async () => {
    // Initialize config manager
    configManager = new SectorConfigManager();

    // Initialize database connection
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

    // Initialize decay engine (note: configManager first, then db)
    decayEngine = new TemporalDecayEngine(configManager, db);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    const client = await db.getConnection();
    try {
      await client.query(`DELETE FROM memories WHERE id LIKE 'test-reinforce-%'`);
    } finally {
      db.releaseConnection(client);
    }
  });

  describe("Automatic Reinforcement on Access", () => {
    it("should apply +0.3 boost on memory access", async () => {
      // Create test memory with initial strength 0.5
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-auto-1",
            "Test memory for auto reinforcement",
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

      // Apply auto-reinforcement
      await decayEngine.autoReinforceOnAccess("test-reinforce-auto-1");

      // Verify strength increased by 0.3 (0.5 + 0.3 = 0.8)
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(
          `SELECT strength, access_count FROM memories WHERE id = $1`,
          ["test-reinforce-auto-1"]
        );
        expect(result.rows[0].strength).toBeCloseTo(0.8, 2);
        expect(result.rows[0].access_count).toBe(1);
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should update last_accessed timestamp on reinforcement", async () => {
      const pastTime = new Date(Date.now() - 60000); // 1 minute ago

      // Create test memory with past timestamp
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-timestamp",
            "Test memory",
            pastTime,
            pastTime,
            0,
            0.5,
            0.03,
            0.6,
            "user-1",
            "session-1",
            "episodic",
          ]
        );
      } finally {
        db.releaseConnection(client);
      }

      const beforeTime = new Date();
      await decayEngine.autoReinforceOnAccess("test-reinforce-timestamp");
      const afterTime = new Date();

      // Verify last_accessed was updated to current time
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT last_accessed FROM memories WHERE id = $1`, [
          "test-reinforce-timestamp",
        ]);
        const lastAccessed = new Date(result.rows[0].last_accessed);
        expect(lastAccessed.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(lastAccessed.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      } finally {
        db.releaseConnection(client2);
      }
    });
  });

  describe("Strength Capping", () => {
    it("should cap strength at 1.0 when reinforcement would exceed", async () => {
      // Create test memory with strength 0.85
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-cap-1",
            "Test memory",
            new Date(),
            new Date(),
            0,
            0.5,
            0.03,
            0.85,
            "user-1",
            "session-1",
            "episodic",
          ]
        );
      } finally {
        db.releaseConnection(client);
      }

      // Apply reinforcement (0.85 + 0.3 = 1.15, should cap at 1.0)
      await decayEngine.autoReinforceOnAccess("test-reinforce-cap-1");

      // Verify strength capped at 1.0
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-cap-1",
        ]);
        expect(result.rows[0].strength).toBe(1.0);
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should maintain strength at 1.0 when already at maximum", async () => {
      // Create test memory with strength 1.0
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-max",
            "Test memory",
            new Date(),
            new Date(),
            0,
            0.5,
            0.03,
            1.0,
            "user-1",
            "session-1",
            "episodic",
          ]
        );
      } finally {
        db.releaseConnection(client);
      }

      // Apply reinforcement
      await decayEngine.autoReinforceOnAccess("test-reinforce-max");

      // Verify strength remains at 1.0
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-max",
        ]);
        expect(result.rows[0].strength).toBe(1.0);
      } finally {
        db.releaseConnection(client2);
      }
    });
  });

  describe("Explicit Reinforcement", () => {
    it("should allow custom boost values for explicit reinforcement", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-explicit-1",
            "Test memory",
            new Date(),
            new Date(),
            0,
            0.5,
            0.03,
            0.4,
            "user-1",
            "session-1",
            "episodic",
          ]
        );
      } finally {
        db.releaseConnection(client);
      }

      // Apply explicit reinforcement with custom boost of 0.5
      await decayEngine.reinforceMemory("test-reinforce-explicit-1", 0.5);

      // Verify strength increased by 0.5 (0.4 + 0.5 = 0.9)
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-explicit-1",
        ]);
        expect(result.rows[0].strength).toBeCloseTo(0.9, 2);
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should allow small boost values", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-small",
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

      // Apply small boost of 0.05
      await decayEngine.reinforceMemory("test-reinforce-small", 0.05);

      // Verify strength increased by 0.05
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-small",
        ]);
        expect(result.rows[0].strength).toBeCloseTo(0.55, 2);
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should cap explicit reinforcement at 1.0", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-explicit-cap",
            "Test memory",
            new Date(),
            new Date(),
            0,
            0.5,
            0.03,
            0.7,
            "user-1",
            "session-1",
            "episodic",
          ]
        );
      } finally {
        db.releaseConnection(client);
      }

      // Apply large boost that would exceed 1.0
      await decayEngine.reinforceMemory("test-reinforce-explicit-cap", 0.8);

      // Verify strength capped at 1.0
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-explicit-cap",
        ]);
        expect(result.rows[0].strength).toBe(1.0);
      } finally {
        db.releaseConnection(client2);
      }
    });
  });

  describe("Diminishing Returns for Recent Reinforcement", () => {
    it("should apply full boost for first reinforcement", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-diminish-1",
            "Test memory",
            new Date(Date.now() - 86400000), // 1 day ago
            new Date(Date.now() - 86400000),
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

      // First reinforcement should apply full 0.3 boost
      await decayEngine.autoReinforceOnAccess("test-reinforce-diminish-1");

      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-diminish-1",
        ]);
        expect(result.rows[0].strength).toBeCloseTo(0.8, 2);
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should apply reduced boost for immediate subsequent reinforcement", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-diminish-2",
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

      // First reinforcement
      await decayEngine.autoReinforceOnAccess("test-reinforce-diminish-2");

      // Immediate second reinforcement (within 1 hour)
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
      await decayEngine.autoReinforceOnAccess("test-reinforce-diminish-2");

      // Second reinforcement should apply reduced boost (e.g., 0.15 instead of 0.3)
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-diminish-2",
        ]);
        // First: 0.5 + 0.3 = 0.8, Second: 0.8 + 0.15 = 0.95
        expect(result.rows[0].strength).toBeLessThan(1.0);
        expect(result.rows[0].strength).toBeGreaterThan(0.8);
        expect(result.rows[0].strength).toBeLessThanOrEqual(0.95);
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should restore full boost after sufficient time has passed", async () => {
      // Create test memory with last_accessed 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 7200000);
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-diminish-3",
            "Test memory",
            twoHoursAgo,
            twoHoursAgo,
            1,
            0.5,
            0.03,
            0.6,
            "user-1",
            "session-1",
            "episodic",
          ]
        );
      } finally {
        db.releaseConnection(client);
      }

      // Reinforcement after 2 hours should apply full boost
      await decayEngine.autoReinforceOnAccess("test-reinforce-diminish-3");

      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-diminish-3",
        ]);
        expect(result.rows[0].strength).toBeCloseTo(0.9, 2);
      } finally {
        db.releaseConnection(client2);
      }
    });
  });

  describe("Reinforcement History Tracking", () => {
    it("should track reinforcement events in history", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-history-1",
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

      // Apply reinforcement
      await decayEngine.autoReinforceOnAccess("test-reinforce-history-1");

      // Verify history was recorded
      const history = await decayEngine.getReinforcementHistory("test-reinforce-history-1");
      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty("timestamp");
      expect(history[0]).toHaveProperty("type");
      expect(history[0]).toHaveProperty("boost");
      expect(history[0]).toHaveProperty("strengthBefore");
      expect(history[0]).toHaveProperty("strengthAfter");
    });

    it("should track multiple reinforcement events", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-history-2",
            "Test memory",
            new Date(),
            new Date(),
            0,
            0.5,
            0.03,
            0.3,
            "user-1",
            "session-1",
            "episodic",
          ]
        );
      } finally {
        db.releaseConnection(client);
      }

      // Apply multiple reinforcements
      await decayEngine.autoReinforceOnAccess("test-reinforce-history-2");
      await new Promise((resolve) => setTimeout(resolve, 100));
      await decayEngine.reinforceMemory("test-reinforce-history-2", 0.2);

      // Verify both events were recorded
      const history = await decayEngine.getReinforcementHistory("test-reinforce-history-2");
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it("should include reinforcement type in history", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-history-3",
            "Test memory",
            new Date(),
            new Date(),
            0,
            0.5,
            0.03,
            0.4,
            "user-1",
            "session-1",
            "episodic",
          ]
        );
      } finally {
        db.releaseConnection(client);
      }

      // Apply auto reinforcement
      await decayEngine.autoReinforceOnAccess("test-reinforce-history-3");

      // Verify type is recorded as "access"
      const history = await decayEngine.getReinforcementHistory("test-reinforce-history-3");
      expect(history[0].type).toBe("access");
    });
  });

  describe("Different Reinforcement Types", () => {
    it("should support 'access' reinforcement type", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-type-access",
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

      // Apply access reinforcement
      await decayEngine.reinforceMemoryByType("test-reinforce-type-access", "access");

      // Verify reinforcement applied with default boost (0.3)
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-type-access",
        ]);
        expect(result.rows[0].strength).toBeCloseTo(0.8, 2);
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should support 'explicit' reinforcement type with custom boost", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-type-explicit",
            "Test memory",
            new Date(),
            new Date(),
            0,
            0.5,
            0.03,
            0.4,
            "user-1",
            "session-1",
            "episodic",
          ]
        );
      } finally {
        db.releaseConnection(client);
      }

      // Apply explicit reinforcement with custom boost
      await decayEngine.reinforceMemoryByType("test-reinforce-type-explicit", "explicit", 0.4);

      // Verify custom boost applied
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-type-explicit",
        ]);
        expect(result.rows[0].strength).toBeCloseTo(0.8, 2);
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should support 'importance' reinforcement type based on memory importance", async () => {
      // Create test memory with high importance
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-type-importance",
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

        await client.query(
          `INSERT INTO memory_metadata (memory_id, keywords, tags, importance, category, context, is_atomic, parent_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          ["test-reinforce-type-importance", [], [], 0.9, null, null, true, null]
        );
      } finally {
        db.releaseConnection(client);
      }

      // Apply importance-based reinforcement
      await decayEngine.reinforceMemoryByType("test-reinforce-type-importance", "importance");

      // Verify boost proportional to importance (0.9 * 0.5 = 0.45)
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-type-importance",
        ]);
        // 0.5 + 0.45 = 0.95
        expect(result.rows[0].strength).toBeCloseTo(0.95, 2);
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should apply smaller boost for low importance memories", async () => {
      // Create test memory with low importance
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-type-low-importance",
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

        await client.query(
          `INSERT INTO memory_metadata (memory_id, keywords, tags, importance, category, context, is_atomic, parent_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          ["test-reinforce-type-low-importance", [], [], 0.2, null, null, true, null]
        );
      } finally {
        db.releaseConnection(client);
      }

      // Apply importance-based reinforcement
      await decayEngine.reinforceMemoryByType("test-reinforce-type-low-importance", "importance");

      // Verify smaller boost (0.2 * 0.5 = 0.1)
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-type-low-importance",
        ]);
        // 0.5 + 0.1 = 0.6
        expect(result.rows[0].strength).toBeCloseTo(0.6, 2);
      } finally {
        db.releaseConnection(client2);
      }
    });
  });

  describe("Error Handling", () => {
    it("should throw error for non-existent memory", async () => {
      await expect(decayEngine.autoReinforceOnAccess("non-existent-memory")).rejects.toThrow(
        "Memory not found"
      );
    });

    it("should throw error for invalid reinforcement type", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-error",
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

      await expect(
        decayEngine.reinforceMemoryByType("test-reinforce-error", "invalid-type" as any)
      ).rejects.toThrow("Invalid reinforcement type");
    });
  });
});
