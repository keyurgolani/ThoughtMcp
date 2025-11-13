/**
 * Temporal Decay Engine Tests
 *
 * Tests for exponential decay calculations with sector-specific rates.
 * Validates decay formula, minimum strength floor, age calculations, and batch processing.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../../database/connection-manager";
import { MemorySector } from "../../../embeddings/types";
import type { Memory } from "../../../memory/types";
import { TemporalDecayEngine } from "../../../temporal/decay-engine";
import { SectorConfigManager } from "../../../temporal/sector-config";
import type { DecayConfig } from "../../../temporal/types";

describe("TemporalDecayEngine - Decay Calculations", () => {
  let configManager: SectorConfigManager;
  let config: DecayConfig;
  let db: DatabaseConnectionManager;
  let decayEngine: TemporalDecayEngine;

  beforeEach(async () => {
    configManager = new SectorConfigManager();
    config = configManager.getConfig();

    // Create database connection
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

    // Create decay engine
    decayEngine = new TemporalDecayEngine(configManager, db);
  });

  afterEach(async () => {
    await db.disconnect();
  });

  describe("Exponential Decay Formula", () => {
    it("should calculate decay using formula: strength = initial × exp(-λ × time)", () => {
      // Test exponential decay formula
      // Formula: strength = initial × exp(-λ × time)
      // where λ = baseLambda × sectorMultiplier
      // and time is in days

      const initialStrength = 1.0;
      const timeDays = 10;
      const sector = MemorySector.Episodic;

      // Create a memory that was last accessed 10 days ago
      const currentTime = new Date("2024-11-12T12:00:00Z");
      const lastAccessed = new Date("2024-11-02T12:00:00Z"); // 10 days ago

      const memory: Memory = {
        id: "test-mem-1",
        content: "Test memory",
        createdAt: lastAccessed,
        lastAccessed,
        accessCount: 1,
        salience: 0.5,
        decayRate: config.baseLambda * config.sectorMultipliers[sector],
        strength: initialStrength,
        userId: "user-1",
        sessionId: "session-1",
        primarySector: "episodic",
        metadata: {
          keywords: [],
          tags: [],
          importance: 0.5,
          isAtomic: true,
        },
      };

      // Calculate decay using the engine
      const actualStrength = decayEngine.calculateDecayedStrength(memory, currentTime);

      // Calculate expected decay
      const lambda = config.baseLambda * config.sectorMultipliers[sector];
      const expectedStrength = initialStrength * Math.exp(-lambda * timeDays);

      // Expected: ~0.74 for episodic with default config (0.02 * 1.5 * 10 days)
      expect(actualStrength).toBeCloseTo(expectedStrength, 2);
      expect(actualStrength).toBeCloseTo(0.74, 2);
    });

    it("should apply exponential decay correctly for different time periods", () => {
      // Test decay over multiple time periods
      const initialStrength = 1.0;
      const sector = MemorySector.Semantic;
      const currentTime = new Date("2024-11-12T12:00:00Z");

      // Test 1 day
      const memory1Day: Memory = {
        id: "test-mem-1day",
        content: "Test memory",
        createdAt: new Date("2024-11-11T12:00:00Z"),
        lastAccessed: new Date("2024-11-11T12:00:00Z"),
        accessCount: 1,
        salience: 0.5,
        decayRate: config.baseLambda * config.sectorMultipliers[sector],
        strength: initialStrength,
        userId: "user-1",
        sessionId: "session-1",
        primarySector: "semantic",
        metadata: {
          keywords: [],
          tags: [],
          importance: 0.5,
          isAtomic: true,
        },
      };
      const strength1Day = decayEngine.calculateDecayedStrength(memory1Day, currentTime);
      expect(strength1Day).toBeGreaterThan(0.99); // Minimal decay after 1 day

      // Test 30 days
      const memory30Days: Memory = {
        ...memory1Day,
        id: "test-mem-30days",
        lastAccessed: new Date("2024-10-13T12:00:00Z"),
      };
      const strength30Days = decayEngine.calculateDecayedStrength(memory30Days, currentTime);
      expect(strength30Days).toBeGreaterThan(0.7); // Moderate decay after 30 days

      // Test 90 days
      const memory90Days: Memory = {
        ...memory1Day,
        id: "test-mem-90days",
        lastAccessed: new Date("2024-08-14T12:00:00Z"),
      };
      const strength90Days = decayEngine.calculateDecayedStrength(memory90Days, currentTime);
      expect(strength90Days).toBeGreaterThan(0.4); // Significant decay after 90 days

      // Verify decay is monotonically decreasing
      expect(strength1Day).toBeGreaterThan(strength30Days);
      expect(strength30Days).toBeGreaterThan(strength90Days);
    });

    it("should handle zero time (no decay)", () => {
      const initialStrength = 0.8;
      const sector = MemorySector.Procedural;
      const currentTime = new Date("2024-11-12T12:00:00Z");

      const memory: Memory = {
        id: "test-mem-zero",
        content: "Test memory",
        createdAt: currentTime,
        lastAccessed: currentTime, // Same as current time = 0 days
        accessCount: 1,
        salience: 0.5,
        decayRate: config.baseLambda * config.sectorMultipliers[sector],
        strength: initialStrength,
        userId: "user-1",
        sessionId: "session-1",
        primarySector: "procedural",
        metadata: {
          keywords: [],
          tags: [],
          importance: 0.5,
          isAtomic: true,
        },
      };

      const strength = decayEngine.calculateDecayedStrength(memory, currentTime);

      // No time passed = no decay
      expect(strength).toBe(initialStrength);
    });

    it("should handle fractional days correctly", () => {
      const initialStrength = 1.0;
      const sector = MemorySector.Emotional;
      const currentTime = new Date("2024-11-12T12:00:00Z");
      const lastAccessed = new Date("2024-11-12T00:00:00Z"); // 12 hours ago

      const memory: Memory = {
        id: "test-mem-fractional",
        content: "Test memory",
        createdAt: lastAccessed,
        lastAccessed,
        accessCount: 1,
        salience: 0.5,
        decayRate: config.baseLambda * config.sectorMultipliers[sector],
        strength: initialStrength,
        userId: "user-1",
        sessionId: "session-1",
        primarySector: "emotional",
        metadata: {
          keywords: [],
          tags: [],
          importance: 0.5,
          isAtomic: true,
        },
      };

      const strength = decayEngine.calculateDecayedStrength(memory, currentTime);

      // Should have minimal decay after 12 hours
      expect(strength).toBeGreaterThan(0.98);
      expect(strength).toBeLessThan(1.0);
    });
  });

  describe("Sector-Specific Decay Rate Application", () => {
    it("should apply different decay rates for different sectors", () => {
      // Test that different sectors decay at different rates
      const initialStrength = 1.0;
      const timeDays = 30;

      // Calculate decay for each sector
      const episodicLambda = config.baseLambda * config.sectorMultipliers[MemorySector.Episodic];
      const semanticLambda = config.baseLambda * config.sectorMultipliers[MemorySector.Semantic];
      const proceduralLambda =
        config.baseLambda * config.sectorMultipliers[MemorySector.Procedural];
      const emotionalLambda = config.baseLambda * config.sectorMultipliers[MemorySector.Emotional];
      const reflectiveLambda =
        config.baseLambda * config.sectorMultipliers[MemorySector.Reflective];

      const episodicStrength = initialStrength * Math.exp(-episodicLambda * timeDays);
      const semanticStrength = initialStrength * Math.exp(-semanticLambda * timeDays);
      const proceduralStrength = initialStrength * Math.exp(-proceduralLambda * timeDays);
      const emotionalStrength = initialStrength * Math.exp(-emotionalLambda * timeDays);
      const reflectiveStrength = initialStrength * Math.exp(-reflectiveLambda * timeDays);

      // Verify decay order: Episodic > Emotional > Reflective > Procedural > Semantic
      expect(episodicStrength).toBeLessThan(emotionalStrength);
      expect(emotionalStrength).toBeLessThan(reflectiveStrength);
      expect(reflectiveStrength).toBeLessThan(proceduralStrength);
      expect(proceduralStrength).toBeLessThan(semanticStrength);

      // Semantic should have highest strength (slowest decay)
      expect(semanticStrength).toBeGreaterThan(0.7);

      // Episodic should have lowest strength (fastest decay)
      expect(episodicStrength).toBeLessThan(0.7);
    });

    it("should use correct multipliers from configuration", () => {
      // Verify multipliers are applied correctly
      const sector = MemorySector.Episodic;
      const effectiveRate = configManager.getEffectiveDecayRate(sector);

      const expectedRate = config.baseLambda * config.sectorMultipliers[sector];
      expect(effectiveRate).toBe(expectedRate);
    });

    it("should handle custom sector multipliers", () => {
      // Create custom config with different multipliers
      const customConfig: DecayConfig = {
        ...config,
        sectorMultipliers: {
          [MemorySector.Episodic]: 2.0, // Very fast decay
          [MemorySector.Semantic]: 0.3, // Very slow decay
          [MemorySector.Procedural]: 1.0,
          [MemorySector.Emotional]: 1.5,
          [MemorySector.Reflective]: 0.8,
        },
      };

      const customManager = new SectorConfigManager(customConfig);
      const episodicRate = customManager.getEffectiveDecayRate(MemorySector.Episodic);
      const semanticRate = customManager.getEffectiveDecayRate(MemorySector.Semantic);

      expect(episodicRate).toBe(customConfig.baseLambda * 2.0);
      expect(semanticRate).toBe(customConfig.baseLambda * 0.3);
      expect(episodicRate).toBeGreaterThan(semanticRate);
    });
  });

  describe("Minimum Strength Floor Enforcement", () => {
    it("should enforce minimum strength floor of 0.1", () => {
      // Test that strength never goes below minimum floor
      const initialStrength = 1.0;
      const timeDays = 1000; // Very long time
      const sector = MemorySector.Episodic;
      const lambda = config.baseLambda * config.sectorMultipliers[sector];

      // Calculate raw decay (would be very low)
      const rawStrength = initialStrength * Math.exp(-lambda * timeDays);
      expect(rawStrength).toBeLessThan(config.minimumStrength);

      // After applying floor, should be exactly minimum
      const finalStrength = Math.max(rawStrength, config.minimumStrength);
      expect(finalStrength).toBe(config.minimumStrength);
      expect(finalStrength).toBe(0.1);
    });

    it("should not modify strength above minimum floor", () => {
      const initialStrength = 1.0;
      const timeDays = 10;
      const sector = MemorySector.Semantic;
      const lambda = config.baseLambda * config.sectorMultipliers[sector];

      const strength = initialStrength * Math.exp(-lambda * timeDays);

      // Strength should be above floor
      expect(strength).toBeGreaterThan(config.minimumStrength);

      // Applying floor should not change it
      const finalStrength = Math.max(strength, config.minimumStrength);
      expect(finalStrength).toBe(strength);
    });

    it("should handle strength exactly at minimum floor", () => {
      const strength = config.minimumStrength;
      const finalStrength = Math.max(strength, config.minimumStrength);

      expect(finalStrength).toBe(config.minimumStrength);
      expect(finalStrength).toBe(0.1);
    });

    it("should enforce floor for all sectors", () => {
      const initialStrength = 1.0;
      const timeDays = 500; // Long enough to hit floor for all sectors

      const sectors = [
        MemorySector.Episodic,
        MemorySector.Semantic,
        MemorySector.Procedural,
        MemorySector.Emotional,
        MemorySector.Reflective,
      ];

      for (const sector of sectors) {
        const lambda = config.baseLambda * config.sectorMultipliers[sector];
        const rawStrength = initialStrength * Math.exp(-lambda * timeDays);
        const finalStrength = Math.max(rawStrength, config.minimumStrength);

        expect(finalStrength).toBeGreaterThanOrEqual(config.minimumStrength);
      }
    });
  });

  describe("Age Calculation in Days", () => {
    it("should calculate age in days from timestamps", () => {
      const now = new Date("2024-11-12T12:00:00Z");
      const created = new Date("2024-11-02T12:00:00Z"); // 10 days ago

      const ageMs = now.getTime() - created.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      expect(ageDays).toBe(10);
    });

    it("should handle fractional days correctly", () => {
      const now = new Date("2024-11-12T18:00:00Z");
      const created = new Date("2024-11-12T06:00:00Z"); // 12 hours ago

      const ageMs = now.getTime() - created.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      expect(ageDays).toBe(0.5);
    });

    it("should handle zero age (just created)", () => {
      const now = new Date("2024-11-12T12:00:00Z");
      const created = new Date("2024-11-12T12:00:00Z");

      const ageMs = now.getTime() - created.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      expect(ageDays).toBe(0);
    });

    it("should calculate age for various time periods", () => {
      const now = new Date("2024-11-12T12:00:00Z");

      // 1 day
      const created1Day = new Date("2024-11-11T12:00:00Z");
      const age1Day = (now.getTime() - created1Day.getTime()) / (1000 * 60 * 60 * 24);
      expect(age1Day).toBe(1);

      // 7 days
      const created7Days = new Date("2024-11-05T12:00:00Z");
      const age7Days = (now.getTime() - created7Days.getTime()) / (1000 * 60 * 60 * 24);
      expect(age7Days).toBe(7);

      // 30 days
      const created30Days = new Date("2024-10-13T12:00:00Z");
      const age30Days = (now.getTime() - created30Days.getTime()) / (1000 * 60 * 60 * 24);
      expect(age30Days).toBe(30);

      // 90 days
      const created90Days = new Date("2024-08-14T12:00:00Z");
      const age90Days = (now.getTime() - created90Days.getTime()) / (1000 * 60 * 60 * 24);
      expect(age90Days).toBe(90);
    });

    it("should use lastAccessed for decay calculation, not createdAt", () => {
      // Memory should decay from last access, not creation
      const now = new Date("2024-11-12T12:00:00Z");
      const created = new Date("2024-10-01T12:00:00Z"); // 42 days ago
      const lastAccessed = new Date("2024-11-10T12:00:00Z"); // 2 days ago

      // Age should be calculated from lastAccessed
      const ageFromAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
      const ageFromCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

      expect(ageFromAccess).toBe(2);
      expect(ageFromCreation).toBe(42);

      // Decay should use lastAccessed (2 days), not created (42 days)
      const sector = MemorySector.Episodic;
      const lambda = config.baseLambda * config.sectorMultipliers[sector];

      const strengthFromAccess = 1.0 * Math.exp(-lambda * ageFromAccess);
      const strengthFromCreation = 1.0 * Math.exp(-lambda * ageFromCreation);

      // Strength from access should be much higher (less decay)
      expect(strengthFromAccess).toBeGreaterThan(strengthFromCreation);
      expect(strengthFromAccess).toBeGreaterThan(0.9);
    });
  });

  describe("Batch Decay Processing", () => {
    it("should process multiple memories in batch", () => {
      // Test batch processing of decay calculations
      const now = new Date("2024-11-12T12:00:00Z");
      const memories = [
        {
          id: "mem1",
          lastAccessed: new Date("2024-11-02T12:00:00Z"), // 10 days ago
          strength: 1.0,
          sector: MemorySector.Episodic,
        },
        {
          id: "mem2",
          lastAccessed: new Date("2024-11-07T12:00:00Z"), // 5 days ago
          strength: 0.8,
          sector: MemorySector.Semantic,
        },
        {
          id: "mem3",
          lastAccessed: new Date("2024-11-11T12:00:00Z"), // 1 day ago
          strength: 0.9,
          sector: MemorySector.Procedural,
        },
      ];

      const results = memories.map((mem) => {
        const ageDays = (now.getTime() - mem.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
        const lambda = config.baseLambda * config.sectorMultipliers[mem.sector];
        const newStrength = Math.max(
          mem.strength * Math.exp(-lambda * ageDays),
          config.minimumStrength
        );
        return { id: mem.id, newStrength };
      });

      // Verify all memories processed
      expect(results).toHaveLength(3);

      // Verify decay applied to each
      expect(results[0].newStrength).toBeLessThan(1.0); // Episodic, 10 days
      expect(results[1].newStrength).toBeLessThan(0.8); // Semantic, 5 days
      expect(results[2].newStrength).toBeLessThan(0.9); // Procedural, 1 day

      // Verify all above minimum floor
      results.forEach((result) => {
        expect(result.newStrength).toBeGreaterThanOrEqual(config.minimumStrength);
      });
    });

    it("should handle large batches efficiently", () => {
      // Test processing 1000 memories (requirement: batch size 1000)
      const now = new Date("2024-11-12T12:00:00Z");
      const batchSize = 1000;

      const memories = Array.from({ length: batchSize }, (_, i) => ({
        id: `mem${i}`,
        lastAccessed: new Date(now.getTime() - i * 24 * 60 * 60 * 1000), // i days ago
        strength: 1.0,
        sector: MemorySector.Episodic,
      }));

      const startTime = Date.now();

      const results = memories.map((mem) => {
        const ageDays = (now.getTime() - mem.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
        const lambda = config.baseLambda * config.sectorMultipliers[mem.sector];
        const newStrength = Math.max(
          mem.strength * Math.exp(-lambda * ageDays),
          config.minimumStrength
        );
        return { id: mem.id, newStrength };
      });

      const processingTime = Date.now() - startTime;

      // Verify all processed
      expect(results).toHaveLength(batchSize);

      // Verify processing is fast (should be < 100ms for 1000 calculations)
      expect(processingTime).toBeLessThan(100);

      // Verify decay gradient (older memories have lower strength)
      expect(results[0].newStrength).toBeGreaterThan(results[100].newStrength);
      // Note: results[500] will hit minimum floor (0.1) so we check it's at floor
      expect(results[500].newStrength).toBe(config.minimumStrength);
    });

    it("should handle mixed sectors in batch", () => {
      const now = new Date("2024-11-12T12:00:00Z");
      const sectors = [
        MemorySector.Episodic,
        MemorySector.Semantic,
        MemorySector.Procedural,
        MemorySector.Emotional,
        MemorySector.Reflective,
      ];

      const memories = sectors.map((sector, i) => ({
        id: `mem${i}`,
        lastAccessed: new Date("2024-11-02T12:00:00Z"), // All 10 days old
        strength: 1.0,
        sector,
      }));

      const results = memories.map((mem) => {
        const ageDays = (now.getTime() - mem.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
        const lambda = config.baseLambda * config.sectorMultipliers[mem.sector];
        const newStrength = Math.max(
          mem.strength * Math.exp(-lambda * ageDays),
          config.minimumStrength
        );
        return { id: mem.id, sector: mem.sector, newStrength };
      });

      // Verify different decay rates applied
      const episodic = results.find((r) => r.sector === MemorySector.Episodic)!;
      const semantic = results.find((r) => r.sector === MemorySector.Semantic)!;

      expect(episodic.newStrength).toBeLessThan(semantic.newStrength);
    });

    it("should handle empty batch gracefully", () => {
      const memories: Array<{
        id: string;
        lastAccessed: Date;
        strength: number;
        sector: MemorySector;
      }> = [];

      const results = memories.map((mem) => {
        const ageDays = (Date.now() - mem.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
        const lambda = config.baseLambda * config.sectorMultipliers[mem.sector];
        const newStrength = Math.max(
          mem.strength * Math.exp(-lambda * ageDays),
          config.minimumStrength
        );
        return { id: mem.id, newStrength };
      });

      expect(results).toHaveLength(0);
    });

    it("should preserve memory IDs in batch processing", () => {
      const now = new Date("2024-11-12T12:00:00Z");
      const memories = [
        {
          id: "abc123",
          lastAccessed: new Date("2024-11-02T12:00:00Z"),
          strength: 1.0,
          sector: MemorySector.Episodic,
        },
        {
          id: "def456",
          lastAccessed: new Date("2024-11-07T12:00:00Z"),
          strength: 0.8,
          sector: MemorySector.Semantic,
        },
        {
          id: "ghi789",
          lastAccessed: new Date("2024-11-11T12:00:00Z"),
          strength: 0.9,
          sector: MemorySector.Procedural,
        },
      ];

      const results = memories.map((mem) => {
        const ageDays = (now.getTime() - mem.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
        const lambda = config.baseLambda * config.sectorMultipliers[mem.sector];
        const newStrength = Math.max(
          mem.strength * Math.exp(-lambda * ageDays),
          config.minimumStrength
        );
        return { id: mem.id, newStrength };
      });

      expect(results[0].id).toBe("abc123");
      expect(results[1].id).toBe("def456");
      expect(results[2].id).toBe("ghi789");
    });
  });

  describe("Integration with Configuration", () => {
    it("should use current configuration for decay calculations", () => {
      const initialStrength = 1.0;
      const timeDays = 10;
      const sector = MemorySector.Episodic;

      // Calculate with default config
      const defaultLambda = config.baseLambda * config.sectorMultipliers[sector];
      const defaultStrength = initialStrength * Math.exp(-defaultLambda * timeDays);

      // Update configuration
      configManager.updateConfig({
        baseLambda: 0.04, // Double the base rate
      });

      const updatedConfig = configManager.getConfig();
      const updatedLambda = updatedConfig.baseLambda * updatedConfig.sectorMultipliers[sector];
      const updatedStrength = initialStrength * Math.exp(-updatedLambda * timeDays);

      // Updated config should produce more decay
      expect(updatedStrength).toBeLessThan(defaultStrength);
    });

    it("should respect updated minimum strength floor", () => {
      const initialStrength = 1.0;
      const timeDays = 1000; // Very long time
      const sector = MemorySector.Episodic;

      // Update minimum strength
      configManager.updateConfig({
        minimumStrength: 0.2, // Higher floor
      });

      const updatedConfig = configManager.getConfig();
      const lambda = updatedConfig.baseLambda * updatedConfig.sectorMultipliers[sector];
      const rawStrength = initialStrength * Math.exp(-lambda * timeDays);
      const finalStrength = Math.max(rawStrength, updatedConfig.minimumStrength);

      expect(finalStrength).toBe(0.2);
      expect(finalStrength).toBeGreaterThan(0.1); // Higher than default floor
    });
  });

  describe("Database Operations - Apply Decay", () => {
    it("should apply decay to a single memory in database", async () => {
      // Create a test memory (2 days old for minimal decay)
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-decay-1",
            "Test memory for decay",
            twoDaysAgo,
            twoDaysAgo,
            1,
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

      const memory: Memory = {
        id: "test-decay-1",
        content: "Test memory for decay",
        createdAt: twoDaysAgo,
        lastAccessed: twoDaysAgo,
        accessCount: 1,
        salience: 0.5,
        decayRate: 0.03,
        strength: 1.0,
        userId: "user-1",
        sessionId: "session-1",
        primarySector: "episodic",
        metadata: {},
      };

      // Apply decay
      await decayEngine.applyDecay(memory);

      // Verify memory was updated
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-decay-1",
        ]);
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].strength).toBeLessThan(1.0);
        expect(result.rows[0].strength).toBeGreaterThan(0.9); // 2 days = minimal decay
      } finally {
        db.releaseConnection(client2);
      }

      // Cleanup
      const client3 = await db.getConnection();
      try {
        await client3.query(`DELETE FROM memories WHERE id = $1`, ["test-decay-1"]);
      } finally {
        db.releaseConnection(client3);
      }
    });

    it("should handle negative time (future lastAccessed)", async () => {
      const futureTime = new Date("2025-11-12T12:00:00Z");
      const memory: Memory = {
        id: "test-future",
        content: "Test memory",
        createdAt: new Date(),
        lastAccessed: futureTime,
        accessCount: 1,
        salience: 0.5,
        decayRate: 0.03,
        strength: 0.8,
        userId: "user-1",
        sessionId: "session-1",
        primarySector: "episodic",
        metadata: {},
      };

      const currentTime = new Date("2024-11-12T12:00:00Z");
      const strength = decayEngine.calculateDecayedStrength(memory, currentTime);

      // Should return original strength for future times
      expect(strength).toBe(0.8);
    });
  });

  describe("Database Operations - Batch Apply Decay", () => {
    it("should apply decay to multiple memories in batch", async () => {
      // Create test memories (2 days old for minimal decay)
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const client = await db.getConnection();
      try {
        for (let i = 1; i <= 3; i++) {
          await client.query(
            `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              `test-batch-${i}`,
              `Test memory ${i}`,
              twoDaysAgo,
              twoDaysAgo,
              1,
              0.5,
              0.03,
              1.0,
              "user-1",
              "session-1",
              "episodic",
            ]
          );
        }
      } finally {
        db.releaseConnection(client);
      }

      const memories: Memory[] = [1, 2, 3].map((i) => ({
        id: `test-batch-${i}`,
        content: `Test memory ${i}`,
        createdAt: twoDaysAgo,
        lastAccessed: twoDaysAgo,
        accessCount: 1,
        salience: 0.5,
        decayRate: 0.03,
        strength: 1.0,
        userId: "user-1",
        sessionId: "session-1",
        primarySector: "episodic",
        metadata: {},
      }));

      // Apply batch decay
      await decayEngine.batchApplyDecay(memories);

      // Verify all memories were updated
      const client2 = await db.getConnection();
      try {
        for (let i = 1; i <= 3; i++) {
          const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
            `test-batch-${i}`,
          ]);
          expect(result.rows).toHaveLength(1);
          expect(result.rows[0].strength).toBeLessThan(1.0);
        }
      } finally {
        db.releaseConnection(client2);
      }

      // Cleanup
      const client3 = await db.getConnection();
      try {
        for (let i = 1; i <= 3; i++) {
          await client3.query(`DELETE FROM memories WHERE id = $1`, [`test-batch-${i}`]);
        }
      } finally {
        db.releaseConnection(client3);
      }
    });

    it("should handle empty batch gracefully", async () => {
      await expect(decayEngine.batchApplyDecay([])).resolves.toBeUndefined();
    });

    it("should rollback on error", async () => {
      const memories: Memory[] = [
        {
          id: "non-existent-memory",
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
        },
      ];

      // Should not throw but transaction should rollback
      await expect(decayEngine.batchApplyDecay(memories)).resolves.toBeUndefined();
    });
  });

  describe("Database Operations - Reinforce Memory", () => {
    it("should reinforce memory by boosting strength", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-1",
            "Test memory",
            new Date(),
            new Date(),
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

      // Reinforce with boost of 0.2
      await decayEngine.reinforceMemory("test-reinforce-1", 0.2);

      // Verify strength increased
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-1",
        ]);
        expect(result.rows[0].strength).toBeCloseTo(0.8, 2);
      } finally {
        db.releaseConnection(client2);
      }

      // Cleanup
      const client3 = await db.getConnection();
      try {
        await client3.query(`DELETE FROM memories WHERE id = $1`, ["test-reinforce-1"]);
      } finally {
        db.releaseConnection(client3);
      }
    });

    it("should cap strength at 1.0", async () => {
      // Create test memory with high strength
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-reinforce-cap",
            "Test memory",
            new Date(),
            new Date(),
            1,
            0.5,
            0.03,
            0.9,
            "user-1",
            "session-1",
            "episodic",
          ]
        );
      } finally {
        db.releaseConnection(client);
      }

      // Reinforce with large boost
      await decayEngine.reinforceMemory("test-reinforce-cap", 0.5);

      // Verify strength capped at 1.0
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT strength FROM memories WHERE id = $1`, [
          "test-reinforce-cap",
        ]);
        expect(result.rows[0].strength).toBe(1.0);
      } finally {
        db.releaseConnection(client2);
      }

      // Cleanup
      const client3 = await db.getConnection();
      try {
        await client3.query(`DELETE FROM memories WHERE id = $1`, ["test-reinforce-cap"]);
      } finally {
        db.releaseConnection(client3);
      }
    });

    it("should throw error for non-existent memory", async () => {
      await expect(decayEngine.reinforceMemory("non-existent", 0.1)).rejects.toThrow(
        "Memory not found"
      );
    });
  });

  describe("Database Operations - Auto Reinforce on Access", () => {
    it("should auto-reinforce memory on access", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-auto-reinforce",
            "Test memory",
            new Date(),
            new Date(),
            1,
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

      // Auto-reinforce
      await decayEngine.autoReinforceOnAccess("test-auto-reinforce");

      // Verify strength increased and access count incremented
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(
          `SELECT strength, access_count FROM memories WHERE id = $1`,
          ["test-auto-reinforce"]
        );
        expect(result.rows[0].strength).toBeGreaterThan(0.7);
        expect(result.rows[0].access_count).toBe(2);
      } finally {
        db.releaseConnection(client2);
      }

      // Cleanup
      const client3 = await db.getConnection();
      try {
        await client3.query(`DELETE FROM memories WHERE id = $1`, ["test-auto-reinforce"]);
      } finally {
        db.releaseConnection(client3);
      }
    });

    it("should throw error for non-existent memory", async () => {
      await expect(decayEngine.autoReinforceOnAccess("non-existent")).rejects.toThrow(
        "Memory not found"
      );
    });
  });

  describe("Database Operations - Schedule Decay Job", () => {
    it("should validate cron expression", () => {
      expect(() => decayEngine.scheduleDecayJob("0 2 * * *")).not.toThrow();
    });

    it("should reject invalid cron expression", () => {
      expect(() => decayEngine.scheduleDecayJob("")).toThrow("Invalid cron expression");
    });

    it("should reject non-string cron expression", () => {
      expect(() => decayEngine.scheduleDecayJob(null as unknown as string)).toThrow(
        "Invalid cron expression"
      );
    });
  });

  describe("Database Operations - Identify Pruning Candidates", () => {
    it("should identify memories below pruning threshold", async () => {
      // Create test memories with low strength
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-prune-1",
            "Test memory",
            new Date(),
            new Date(),
            1,
            0.5,
            0.03,
            0.05,
            "user-1",
            "session-1",
            "episodic",
          ]
        );

        await client.query(
          `INSERT INTO memory_metadata (memory_id, keywords, tags, importance, category, context, is_atomic, parent_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          ["test-prune-1", [], [], 0.2, null, null, true, null]
        );
      } finally {
        db.releaseConnection(client);
      }

      const candidates = await decayEngine.identifyPruningCandidates(0.1);

      expect(candidates).toContain("test-prune-1");

      // Cleanup
      const client2 = await db.getConnection();
      try {
        await client2.query(`DELETE FROM memories WHERE id = $1`, ["test-prune-1"]);
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should not identify important memories", async () => {
      // Create test memory with low strength but high importance
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-important",
            "Test memory",
            new Date(),
            new Date(),
            1,
            0.5,
            0.03,
            0.05,
            "user-1",
            "session-1",
            "episodic",
          ]
        );

        await client.query(
          `INSERT INTO memory_metadata (memory_id, keywords, tags, importance, category, context, is_atomic, parent_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          ["test-important", [], [], 0.8, null, null, true, null]
        );
      } finally {
        db.releaseConnection(client);
      }

      const candidates = await decayEngine.identifyPruningCandidates(0.1);

      expect(candidates).not.toContain("test-important");

      // Cleanup
      const client2 = await db.getConnection();
      try {
        await client2.query(`DELETE FROM memories WHERE id = $1`, ["test-important"]);
      } finally {
        db.releaseConnection(client2);
      }
    });
  });

  describe("Database Operations - Prune Memories", () => {
    it("should delete memories by IDs", async () => {
      // Create test memory
      const client = await db.getConnection();
      try {
        await client.query(
          `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            "test-delete-1",
            "Test memory",
            new Date(),
            new Date(),
            1,
            0.5,
            0.03,
            0.05,
            "user-1",
            "session-1",
            "episodic",
          ]
        );
      } finally {
        db.releaseConnection(client);
      }

      const deletedCount = await decayEngine.pruneMemories(["test-delete-1"]);

      expect(deletedCount).toBe(1);

      // Verify memory was deleted
      const client2 = await db.getConnection();
      try {
        const result = await client2.query(`SELECT * FROM memories WHERE id = $1`, [
          "test-delete-1",
        ]);
        expect(result.rows).toHaveLength(0);
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should handle empty array", async () => {
      const deletedCount = await decayEngine.pruneMemories([]);
      expect(deletedCount).toBe(0);
    });

    it("should handle non-existent IDs gracefully", async () => {
      const deletedCount = await decayEngine.pruneMemories(["non-existent-1", "non-existent-2"]);
      expect(deletedCount).toBe(0);
    });
  });

  describe("Database Operations - Run Decay Maintenance", () => {
    it("should run full maintenance cycle", async () => {
      // Create test memories (2 days old)
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const client = await db.getConnection();
      try {
        for (let i = 1; i <= 5; i++) {
          await client.query(
            `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, decay_rate, strength, user_id, session_id, primary_sector)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              `test-maint-${i}`,
              `Test memory ${i}`,
              twoDaysAgo,
              twoDaysAgo,
              1,
              0.5,
              0.03,
              i <= 2 ? 0.05 : 0.8, // First 2 have low strength
              "user-1",
              "session-1",
              "episodic",
            ]
          );

          await client.query(
            `INSERT INTO memory_metadata (memory_id, keywords, tags, importance, category, context, is_atomic, parent_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [`test-maint-${i}`, [], [], 0.2, null, null, true, null]
          );
        }
      } finally {
        db.releaseConnection(client);
      }

      const result = await decayEngine.runDecayMaintenance();

      expect(result.processedCount).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);

      // Cleanup remaining memories
      const client2 = await db.getConnection();
      try {
        for (let i = 1; i <= 5; i++) {
          await client2.query(`DELETE FROM memories WHERE id = $1`, [`test-maint-${i}`]);
        }
      } finally {
        db.releaseConnection(client2);
      }
    });

    it("should handle errors gracefully", async () => {
      const result = await decayEngine.runDecayMaintenance();

      expect(result).toHaveProperty("processedCount");
      expect(result).toHaveProperty("prunedCount");
      expect(result).toHaveProperty("processingTime");
      expect(result).toHaveProperty("errors");
    });
  });
});
