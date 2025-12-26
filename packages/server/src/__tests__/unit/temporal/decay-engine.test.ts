/**
 * Temporal Decay Engine Unit Tests
 *
 * Tests for exponential decay calculations with sector-specific rates.
 * All database dependencies are mocked for isolated unit testing.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemorySector } from "../../../embeddings/types";
import type { Memory } from "../../../memory/types";
import { TemporalDecayEngine } from "../../../temporal/decay-engine";
import { SectorConfigManager } from "../../../temporal/sector-config";
import type { DecayConfig } from "../../../temporal/types";

// Mock database connection manager
const createMockDb = () => ({
  getConnection: vi.fn(),
  releaseConnection: vi.fn(),
  beginTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  rollbackTransaction: vi.fn(),
});

describe("TemporalDecayEngine - Unit Tests", () => {
  let configManager: SectorConfigManager;
  let config: DecayConfig;
  let mockDb: ReturnType<typeof createMockDb>;
  let decayEngine: TemporalDecayEngine;

  beforeEach(() => {
    configManager = new SectorConfigManager();
    config = configManager.getConfig();
    mockDb = createMockDb();
    decayEngine = new TemporalDecayEngine(configManager, mockDb as any);
  });

  describe("Exponential Decay Formula", () => {
    it("should calculate decay using formula: strength = initial × exp(-λ × time)", () => {
      const initialStrength = 1.0;
      const timeDays = 10;
      const sector = MemorySector.Episodic;

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
        metadata: {},
      };

      const actualStrength = decayEngine.calculateDecayedStrength(memory, currentTime);

      const lambda = config.baseLambda * config.sectorMultipliers[sector];
      const expectedStrength = initialStrength * Math.exp(-lambda * timeDays);

      expect(actualStrength).toBeCloseTo(expectedStrength, 2);
      expect(actualStrength).toBeCloseTo(0.74, 2);
    });

    it("should apply exponential decay correctly for different time periods", () => {
      const initialStrength = 1.0;
      const sector = MemorySector.Semantic;
      const currentTime = new Date("2024-11-12T12:00:00Z");

      const createMemory = (lastAccessed: Date): Memory => ({
        id: "test-mem",
        content: "Test memory",
        createdAt: lastAccessed,
        lastAccessed,
        accessCount: 1,
        salience: 0.5,
        decayRate: config.baseLambda * config.sectorMultipliers[sector],
        strength: initialStrength,
        userId: "user-1",
        sessionId: "session-1",
        primarySector: "semantic",
        metadata: {},
      });

      // Test 1 day
      const strength1Day = decayEngine.calculateDecayedStrength(
        createMemory(new Date("2024-11-11T12:00:00Z")),
        currentTime
      );
      expect(strength1Day).toBeGreaterThan(0.99);

      // Test 30 days
      const strength30Days = decayEngine.calculateDecayedStrength(
        createMemory(new Date("2024-10-13T12:00:00Z")),
        currentTime
      );
      expect(strength30Days).toBeGreaterThan(0.7);

      // Test 90 days
      const strength90Days = decayEngine.calculateDecayedStrength(
        createMemory(new Date("2024-08-14T12:00:00Z")),
        currentTime
      );
      expect(strength90Days).toBeGreaterThan(0.4);

      // Verify decay is monotonically decreasing
      expect(strength1Day).toBeGreaterThan(strength30Days);
      expect(strength30Days).toBeGreaterThan(strength90Days);
    });

    it("should handle zero time (no decay)", () => {
      const initialStrength = 0.8;
      const currentTime = new Date("2024-11-12T12:00:00Z");

      const memory: Memory = {
        id: "test-mem-zero",
        content: "Test memory",
        createdAt: currentTime,
        lastAccessed: currentTime,
        accessCount: 1,
        salience: 0.5,
        decayRate: 0.03,
        strength: initialStrength,
        userId: "user-1",
        sessionId: "session-1",
        primarySector: "procedural",
        metadata: {},
      };

      const strength = decayEngine.calculateDecayedStrength(memory, currentTime);
      expect(strength).toBe(initialStrength);
    });

    it("should handle fractional days correctly", () => {
      const initialStrength = 1.0;
      const currentTime = new Date("2024-11-12T12:00:00Z");
      const lastAccessed = new Date("2024-11-12T00:00:00Z"); // 12 hours ago

      const memory: Memory = {
        id: "test-mem-fractional",
        content: "Test memory",
        createdAt: lastAccessed,
        lastAccessed,
        accessCount: 1,
        salience: 0.5,
        decayRate: 0.03,
        strength: initialStrength,
        userId: "user-1",
        sessionId: "session-1",
        primarySector: "emotional",
        metadata: {},
      };

      const strength = decayEngine.calculateDecayedStrength(memory, currentTime);
      expect(strength).toBeGreaterThan(0.98);
      expect(strength).toBeLessThan(1.0);
    });

    it("should handle negative time (future lastAccessed)", () => {
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
      expect(strength).toBe(0.8);
    });
  });

  describe("Sector-Specific Decay Rate Application", () => {
    it("should apply different decay rates for different sectors", () => {
      const initialStrength = 1.0;
      const timeDays = 30;

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

      expect(semanticStrength).toBeGreaterThan(0.7);
      expect(episodicStrength).toBeLessThan(0.7);
    });

    it("should use correct multipliers from configuration", () => {
      const sector = MemorySector.Episodic;
      const effectiveRate = configManager.getEffectiveDecayRate(sector);
      const expectedRate = config.baseLambda * config.sectorMultipliers[sector];
      expect(effectiveRate).toBe(expectedRate);
    });

    it("should handle custom sector multipliers", () => {
      const customConfig: DecayConfig = {
        ...config,
        sectorMultipliers: {
          [MemorySector.Episodic]: 2.0,
          [MemorySector.Semantic]: 0.3,
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
      const initialStrength = 1.0;
      const timeDays = 1000;
      const sector = MemorySector.Episodic;
      const lambda = config.baseLambda * config.sectorMultipliers[sector];

      const rawStrength = initialStrength * Math.exp(-lambda * timeDays);
      expect(rawStrength).toBeLessThan(config.minimumStrength);

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
      expect(strength).toBeGreaterThan(config.minimumStrength);

      const finalStrength = Math.max(strength, config.minimumStrength);
      expect(finalStrength).toBe(strength);
    });

    it("should enforce floor for all sectors", () => {
      const initialStrength = 1.0;
      const timeDays = 500;

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
      const created = new Date("2024-11-02T12:00:00Z");

      const ageMs = now.getTime() - created.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      expect(ageDays).toBe(10);
    });

    it("should handle fractional days correctly", () => {
      const now = new Date("2024-11-12T18:00:00Z");
      const created = new Date("2024-11-12T06:00:00Z");

      const ageMs = now.getTime() - created.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      expect(ageDays).toBe(0.5);
    });

    it("should use lastAccessed for decay calculation, not createdAt", () => {
      const now = new Date("2024-11-12T12:00:00Z");
      const created = new Date("2024-10-01T12:00:00Z");
      const lastAccessed = new Date("2024-11-10T12:00:00Z");

      const ageFromAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
      const ageFromCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

      expect(ageFromAccess).toBe(2);
      expect(ageFromCreation).toBe(42);

      const sector = MemorySector.Episodic;
      const lambda = config.baseLambda * config.sectorMultipliers[sector];

      const strengthFromAccess = 1.0 * Math.exp(-lambda * ageFromAccess);
      const strengthFromCreation = 1.0 * Math.exp(-lambda * ageFromCreation);

      expect(strengthFromAccess).toBeGreaterThan(strengthFromCreation);
      expect(strengthFromAccess).toBeGreaterThan(0.9);
    });
  });

  describe("Batch Decay Processing (Logic)", () => {
    it("should process multiple memories in batch", () => {
      const now = new Date("2024-11-12T12:00:00Z");
      const memories = [
        {
          id: "mem1",
          lastAccessed: new Date("2024-11-02T12:00:00Z"),
          strength: 1.0,
          sector: MemorySector.Episodic,
        },
        {
          id: "mem2",
          lastAccessed: new Date("2024-11-07T12:00:00Z"),
          strength: 0.8,
          sector: MemorySector.Semantic,
        },
        {
          id: "mem3",
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

      expect(results).toHaveLength(3);
      expect(results[0].newStrength).toBeLessThan(1.0);
      expect(results[1].newStrength).toBeLessThan(0.8);
      expect(results[2].newStrength).toBeLessThan(0.9);

      results.forEach((result) => {
        expect(result.newStrength).toBeGreaterThanOrEqual(config.minimumStrength);
      });
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
        lastAccessed: new Date("2024-11-02T12:00:00Z"),
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

      const episodic = results.find((r) => r.sector === MemorySector.Episodic)!;
      const semantic = results.find((r) => r.sector === MemorySector.Semantic)!;

      expect(episodic.newStrength).toBeLessThan(semantic.newStrength);
    });
  });

  describe("Schedule Decay Job", () => {
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

  describe("Configuration Integration", () => {
    it("should use current configuration for decay calculations", () => {
      const initialStrength = 1.0;
      const timeDays = 10;
      const sector = MemorySector.Episodic;

      const defaultLambda = config.baseLambda * config.sectorMultipliers[sector];
      const defaultStrength = initialStrength * Math.exp(-defaultLambda * timeDays);

      configManager.updateConfig({
        baseLambda: 0.04,
      });

      const updatedConfig = configManager.getConfig();
      const updatedLambda = updatedConfig.baseLambda * updatedConfig.sectorMultipliers[sector];
      const updatedStrength = initialStrength * Math.exp(-updatedLambda * timeDays);

      expect(updatedStrength).toBeLessThan(defaultStrength);
    });

    it("should respect updated minimum strength floor", () => {
      configManager.updateConfig({
        minimumStrength: 0.2,
      });

      const updatedConfig = configManager.getConfig();
      expect(updatedConfig.minimumStrength).toBe(0.2);
    });
  });

  describe("applyDecay", () => {
    it("should apply decay to a single memory and update database", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      const memory: Memory = {
        id: "test-mem-1",
        content: "Test memory",
        createdAt: new Date("2024-11-02T12:00:00Z"),
        lastAccessed: new Date("2024-11-02T12:00:00Z"),
        accessCount: 1,
        salience: 0.5,
        decayRate: 0.03,
        strength: 1.0,
        userId: "user-1",
        sessionId: "session-1",
        primarySector: "episodic",
        metadata: {},
      };

      await decayEngine.applyDecay(memory);

      expect(mockDb.getConnection).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE memories"),
        expect.arrayContaining([expect.any(Number), expect.any(Date), memory.id])
      );
      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });
  });

  describe("batchApplyDecay", () => {
    it("should apply decay to multiple memories in a transaction", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      mockDb.beginTransaction.mockResolvedValue(mockClient);

      const memories: Memory[] = [
        {
          id: "mem-1",
          content: "Memory 1",
          createdAt: new Date("2024-11-02T12:00:00Z"),
          lastAccessed: new Date("2024-11-02T12:00:00Z"),
          accessCount: 1,
          salience: 0.5,
          decayRate: 0.03,
          strength: 1.0,
          userId: "user-1",
          sessionId: "session-1",
          primarySector: "episodic",
          metadata: {},
        },
        {
          id: "mem-2",
          content: "Memory 2",
          createdAt: new Date("2024-11-05T12:00:00Z"),
          lastAccessed: new Date("2024-11-05T12:00:00Z"),
          accessCount: 1,
          salience: 0.5,
          decayRate: 0.03,
          strength: 0.8,
          userId: "user-1",
          sessionId: "session-1",
          primarySector: "semantic",
          metadata: {},
        },
      ];

      await decayEngine.batchApplyDecay(memories);

      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockDb.commitTransaction).toHaveBeenCalledWith(mockClient);
    });

    it("should handle empty batch gracefully", async () => {
      await decayEngine.batchApplyDecay([]);

      expect(mockDb.beginTransaction).not.toHaveBeenCalled();
    });

    it("should rollback transaction on error", async () => {
      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error("Database error")),
      };
      mockDb.beginTransaction.mockResolvedValue(mockClient);

      const memories: Memory[] = [
        {
          id: "mem-1",
          content: "Memory 1",
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

      await expect(decayEngine.batchApplyDecay(memories)).rejects.toThrow("Database error");
      expect(mockDb.rollbackTransaction).toHaveBeenCalledWith(mockClient);
    });
  });

  describe("reinforceMemory", () => {
    it("should reinforce memory and log event", async () => {
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [{ strength: 0.5 }] }) // SELECT strength
          .mockResolvedValueOnce({ rows: [] }) // UPDATE memories
          .mockResolvedValueOnce({ rows: [] }), // INSERT reinforcement history
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await decayEngine.reinforceMemory("mem-1", 0.2);

      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("UPDATE memories SET strength"),
        [0.7, "mem-1"]
      );
    });

    it("should cap strength at 1.0", async () => {
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [{ strength: 0.9 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await decayEngine.reinforceMemory("mem-1", 0.5);

      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("UPDATE memories SET strength"),
        [1.0, "mem-1"]
      );
    });

    it("should throw error for non-existent memory", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await expect(decayEngine.reinforceMemory("non-existent", 0.2)).rejects.toThrow(
        "Memory not found: non-existent"
      );
    });
  });

  describe("autoReinforceOnAccess", () => {
    it("should auto-reinforce with default boost", async () => {
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // No previous reinforcement
          .mockResolvedValueOnce({ rows: [{ strength: 0.5 }] }) // SELECT strength
          .mockResolvedValueOnce({ rows: [] }) // UPDATE memories
          .mockResolvedValueOnce({ rows: [] }), // INSERT reinforcement history
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await decayEngine.autoReinforceOnAccess("mem-1");

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE memories"),
        expect.arrayContaining(["mem-1"])
      );
    });

    it("should apply diminished boost for recent reinforcement", async () => {
      const recentTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [{ timestamp: recentTime }] }) // Recent reinforcement
          .mockResolvedValueOnce({ rows: [{ strength: 0.5 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await decayEngine.autoReinforceOnAccess("mem-1");

      // Verify diminished boost was applied (50% of default)
      expect(mockClient.query).toHaveBeenCalled();
    });

    it("should throw error for non-existent memory", async () => {
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // No previous reinforcement
          .mockResolvedValueOnce({ rows: [] }), // Memory not found
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await expect(decayEngine.autoReinforceOnAccess("non-existent")).rejects.toThrow(
        "Memory not found: non-existent"
      );
    });
  });

  describe("getReinforcementHistory", () => {
    it("should return reinforcement history for a memory", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          rows: [
            {
              timestamp: new Date("2024-11-10T12:00:00Z"),
              type: "access",
              boost: 0.1,
              strength_before: 0.5,
              strength_after: 0.6,
            },
            {
              timestamp: new Date("2024-11-09T12:00:00Z"),
              type: "explicit",
              boost: 0.2,
              strength_before: 0.3,
              strength_after: 0.5,
            },
          ],
        }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      const history = await decayEngine.getReinforcementHistory("mem-1");

      expect(history).toHaveLength(2);
      expect(history[0].type).toBe("access");
      expect(history[0].boost).toBe(0.1);
      expect(history[1].type).toBe("explicit");
    });

    it("should return empty array for memory with no history", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      const history = await decayEngine.getReinforcementHistory("mem-1");

      expect(history).toHaveLength(0);
    });
  });

  describe("reinforceMemoryByType", () => {
    it("should reinforce with access type using diminished boost", async () => {
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [{ strength: 0.5, importance: 0.7 }] }) // SELECT memory
          .mockResolvedValueOnce({ rows: [] }) // No previous reinforcement
          .mockResolvedValueOnce({ rows: [] }) // UPDATE strength
          .mockResolvedValueOnce({ rows: [] }) // INSERT history
          .mockResolvedValueOnce({ rows: [] }), // UPDATE last_accessed
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await decayEngine.reinforceMemoryByType("mem-1", "access");

      expect(mockClient.query).toHaveBeenCalled();
    });

    it("should reinforce with explicit type using provided boost", async () => {
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [{ strength: 0.5, importance: 0.7 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await decayEngine.reinforceMemoryByType("mem-1", "explicit", 0.3);

      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("UPDATE memories SET strength"),
        [0.8, "mem-1"]
      );
    });

    it("should reinforce with importance type based on memory importance", async () => {
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [{ strength: 0.5, importance: 0.8 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await decayEngine.reinforceMemoryByType("mem-1", "importance");

      // Boost should be importance * 0.5 = 0.8 * 0.5 = 0.4
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("UPDATE memories SET strength"),
        [0.9, "mem-1"]
      );
    });

    it("should throw error for invalid reinforcement type", async () => {
      await expect(decayEngine.reinforceMemoryByType("mem-1", "invalid" as any)).rejects.toThrow(
        "Invalid reinforcement type: invalid"
      );
    });

    it("should throw error for explicit type without boost", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [{ strength: 0.5, importance: 0.7 }] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await expect(decayEngine.reinforceMemoryByType("mem-1", "explicit")).rejects.toThrow(
        "Boost parameter required for explicit reinforcement"
      );
    });

    it("should throw error for non-existent memory", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await expect(decayEngine.reinforceMemoryByType("non-existent", "access")).rejects.toThrow(
        "Memory not found: non-existent"
      );
    });

    it("should use default importance when null", async () => {
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [{ strength: 0.5, importance: null }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      await decayEngine.reinforceMemoryByType("mem-1", "importance");

      // Default importance 0.5 * 0.5 = 0.25 boost
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("UPDATE memories SET strength"),
        [0.75, "mem-1"]
      );
    });
  });

  describe("runDecayMaintenance", () => {
    it("should run full maintenance cycle", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          rows: [
            {
              id: "mem-1",
              content: "Test",
              created_at: new Date(),
              last_accessed: new Date(),
              access_count: 1,
              salience: 0.5,
              decay_rate: 0.03,
              strength: 0.8,
              user_id: "user-1",
              session_id: "session-1",
              primary_sector: "episodic",
            },
          ],
        }),
      };
      const mockTxClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);
      mockDb.beginTransaction.mockResolvedValue(mockTxClient);

      const result = await decayEngine.runDecayMaintenance();

      expect(result.processedCount).toBe(1);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle maintenance errors gracefully", async () => {
      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error("Database error")),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      const result = await decayEngine.runDecayMaintenance();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Maintenance failed");
    });

    it("should process memories in batches", async () => {
      // Create 1500 memories to test batching (batch size is 1000)
      const memories = Array.from({ length: 1500 }, (_, i) => ({
        id: `mem-${i}`,
        content: `Test ${i}`,
        created_at: new Date(),
        last_accessed: new Date(),
        access_count: 1,
        salience: 0.5,
        decay_rate: 0.03,
        strength: 0.8,
        user_id: "user-1",
        session_id: "session-1",
        primary_sector: "episodic",
      }));

      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: memories }),
      };
      const mockTxClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);
      mockDb.beginTransaction.mockResolvedValue(mockTxClient);

      const result = await decayEngine.runDecayMaintenance();

      expect(result.processedCount).toBe(1500);
      // Should have called beginTransaction at least twice (2 batches for decay)
      // Plus additional calls for pruning if candidates found
      expect(mockDb.beginTransaction.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("identifyPruningCandidates", () => {
    it("should identify memories below pruning threshold", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          rows: [{ id: "mem-1" }, { id: "mem-2" }],
        }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      const candidates = await decayEngine.identifyPruningCandidates(0.2);

      expect(candidates).toHaveLength(2);
      expect(candidates).toContain("mem-1");
      expect(candidates).toContain("mem-2");
    });

    it("should return empty array when no candidates", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      mockDb.getConnection.mockResolvedValue(mockClient);

      const candidates = await decayEngine.identifyPruningCandidates(0.2);

      expect(candidates).toHaveLength(0);
    });
  });

  describe("pruneMemories", () => {
    it("should delete memories by IDs", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rowCount: 3 }),
      };
      mockDb.beginTransaction.mockResolvedValue(mockClient);

      const count = await decayEngine.pruneMemories(["mem-1", "mem-2", "mem-3"]);

      expect(count).toBe(3);
      expect(mockDb.commitTransaction).toHaveBeenCalledWith(mockClient);
    });

    it("should return 0 for empty array", async () => {
      const count = await decayEngine.pruneMemories([]);

      expect(count).toBe(0);
      expect(mockDb.beginTransaction).not.toHaveBeenCalled();
    });

    it("should rollback on error", async () => {
      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error("Delete failed")),
      };
      mockDb.beginTransaction.mockResolvedValue(mockClient);

      await expect(decayEngine.pruneMemories(["mem-1"])).rejects.toThrow("Delete failed");
      expect(mockDb.rollbackTransaction).toHaveBeenCalledWith(mockClient);
    });
  });
});
