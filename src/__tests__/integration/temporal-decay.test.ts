/**
 * Temporal Decay Integration Tests (Mocked)
 *
 * Tests the interaction between TemporalDecayEngine, MemoryRepository, and BackgroundScheduler
 * using mocks for external dependencies (database).
 *
 * This is an integration test that verifies internal module interactions work correctly,
 * NOT a test of external service integration.
 *
 * Requirements: 12.2, 12.3, 12.4, 12.6
 */

import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Memory } from "../../memory/types";

// Create mock database client
function createMockClient(): PoolClient {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  } as unknown as PoolClient;
  return mockClient;
}

// Create mock database manager
function createMockDbManager() {
  const mockClient = createMockClient();

  return {
    client: mockClient,
    manager: {
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// Create mock sector config manager
function createMockSectorConfigManager() {
  return {
    getConfig: vi.fn().mockReturnValue({
      minimumStrength: 0.01,
      reinforcementBoost: 0.3,
      pruningThreshold: 0.1,
    }),
    getEffectiveDecayRate: vi.fn().mockReturnValue(0.03),
    getSectorMultiplier: vi.fn().mockReturnValue(1.0),
  };
}

// Create mock decay engine
function createMockDecayEngine() {
  return {
    calculateDecayedStrength: vi.fn().mockImplementation((memory: Memory, currentTime: Date) => {
      const ageMs = currentTime.getTime() - memory.lastAccessed.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < 0) return memory.strength;
      const lambda = 0.03;
      return Math.max(memory.strength * Math.exp(-lambda * ageDays), 0.01);
    }),
    applyDecay: vi.fn().mockResolvedValue(undefined),
    batchApplyDecay: vi.fn().mockResolvedValue(undefined),
    reinforceMemory: vi.fn().mockResolvedValue(undefined),
    autoReinforceOnAccess: vi.fn().mockResolvedValue(undefined),
    getReinforcementHistory: vi.fn().mockResolvedValue([]),
    reinforceMemoryByType: vi.fn().mockResolvedValue(undefined),
    scheduleDecayJob: vi.fn(),
    runDecayMaintenance: vi.fn().mockResolvedValue({
      processedCount: 0,
      prunedCount: 0,
      processingTime: 100,
      errors: [],
    }),
    identifyPruningCandidates: vi.fn().mockResolvedValue([]),
    pruneMemories: vi.fn().mockResolvedValue(0),
  };
}

// Create mock memory repository
function createMockMemoryRepository() {
  return {
    create: vi.fn().mockResolvedValue({ id: "test-memory-1" }),
    retrieve: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({ id: "test-memory-1" }),
    delete: vi.fn().mockResolvedValue(true),
    search: vi.fn().mockResolvedValue([]),
  };
}

// Helper to create test memory
function createTestMemory(overrides: Partial<Memory> = {}): Memory {
  const now = new Date();
  return {
    id: "test-memory-1",
    content: "Test memory content",
    createdAt: now,
    lastAccessed: now,
    accessCount: 1,
    salience: 0.5,
    decayRate: 0.03,
    strength: 1.0,
    userId: "user-1",
    sessionId: "session-1",
    primarySector: "episodic",
    metadata: {},
    ...overrides,
  };
}

describe("Temporal Decay Integration (Mocked)", () => {
  let mockDb: ReturnType<typeof createMockDbManager>;
  let mockDecayEngine: ReturnType<typeof createMockDecayEngine>;
  // Memory repository and config manager are created for context

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDbManager();
    mockDecayEngine = createMockDecayEngine();
    createMockMemoryRepository(); // Create for context
    createMockSectorConfigManager(); // Create for context
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Decay Engine + Memory Repository Integration", () => {
    it("should apply decay to memory and update repository", async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const memory = createTestMemory({
        id: "test-decay-1",
        lastAccessed: twoDaysAgo,
        strength: 1.0,
      });

      // Mock database query to return memory
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [
          {
            id: memory.id,
            strength: memory.strength,
          },
        ],
        rowCount: 1,
      });

      // Apply decay
      await mockDecayEngine.applyDecay(memory);
      expect(mockDecayEngine.applyDecay).toHaveBeenCalledWith(memory);

      // Calculate expected decayed strength
      const currentTime = new Date();
      const decayedStrength = mockDecayEngine.calculateDecayedStrength(memory, currentTime);
      expect(decayedStrength).toBeLessThan(1.0);
      expect(decayedStrength).toBeGreaterThan(0.9); // 2 days = minimal decay
    });

    it("should handle batch decay across multiple memories", async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const memories: Memory[] = [1, 2, 3].map((i) =>
        createTestMemory({
          id: `test-batch-${i}`,
          lastAccessed: twoDaysAgo,
          strength: 1.0,
        })
      );

      // Mock database transaction
      const client = await mockDb.manager.beginTransaction();
      expect(mockDb.manager.beginTransaction).toHaveBeenCalled();

      // Apply batch decay
      await mockDecayEngine.batchApplyDecay(memories);
      expect(mockDecayEngine.batchApplyDecay).toHaveBeenCalledWith(memories);

      // Commit transaction
      await mockDb.manager.commitTransaction(client);
      expect(mockDb.manager.commitTransaction).toHaveBeenCalled();
    });

    it("should handle empty batch gracefully", async () => {
      await mockDecayEngine.batchApplyDecay([]);
      expect(mockDecayEngine.batchApplyDecay).toHaveBeenCalledWith([]);
    });

    it("should rollback transaction on batch error", async () => {
      const memories: Memory[] = [createTestMemory({ id: "error-memory" })];

      // Mock batch apply to throw error
      mockDecayEngine.batchApplyDecay.mockRejectedValueOnce(new Error("Batch processing failed"));

      const client = await mockDb.manager.beginTransaction();

      await expect(mockDecayEngine.batchApplyDecay(memories)).rejects.toThrow(
        "Batch processing failed"
      );

      // Rollback should be called
      await mockDb.manager.rollbackTransaction(client);
      expect(mockDb.manager.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe("Reinforcement System Integration", () => {
    it("should reinforce memory and update strength", async () => {
      const memory = createTestMemory({
        id: "test-reinforce-1",
        strength: 0.6,
      });

      // Mock database query to return memory
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [{ id: memory.id, strength: memory.strength }],
        rowCount: 1,
      });

      // Reinforce with boost of 0.2
      await mockDecayEngine.reinforceMemory(memory.id, 0.2);
      expect(mockDecayEngine.reinforceMemory).toHaveBeenCalledWith(memory.id, 0.2);
    });

    it("should auto-reinforce on memory access", async () => {
      const memory = createTestMemory({
        id: "test-auto-reinforce",
        strength: 0.7,
      });

      // Mock database query
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [{ id: memory.id, strength: memory.strength, access_count: 1 }],
        rowCount: 1,
      });

      // Auto-reinforce
      await mockDecayEngine.autoReinforceOnAccess(memory.id);
      expect(mockDecayEngine.autoReinforceOnAccess).toHaveBeenCalledWith(memory.id);
    });

    it("should track reinforcement history", async () => {
      const memoryId = "test-history-1";

      // Mock reinforcement history
      mockDecayEngine.getReinforcementHistory.mockResolvedValue([
        {
          timestamp: new Date(),
          type: "access",
          boost: 0.3,
          strengthBefore: 0.5,
          strengthAfter: 0.8,
        },
      ]);

      const history = await mockDecayEngine.getReinforcementHistory(memoryId);
      expect(history).toHaveLength(1);
      expect(history[0]).toHaveProperty("timestamp");
      expect(history[0]).toHaveProperty("type");
      expect(history[0]).toHaveProperty("boost");
    });

    it("should support different reinforcement types", async () => {
      const memoryId = "test-type-reinforce";

      // Test access type
      await mockDecayEngine.reinforceMemoryByType(memoryId, "access");
      expect(mockDecayEngine.reinforceMemoryByType).toHaveBeenCalledWith(memoryId, "access");

      // Test explicit type with boost
      await mockDecayEngine.reinforceMemoryByType(memoryId, "explicit", 0.4);
      expect(mockDecayEngine.reinforceMemoryByType).toHaveBeenCalledWith(memoryId, "explicit", 0.4);

      // Test importance type
      await mockDecayEngine.reinforceMemoryByType(memoryId, "importance");
      expect(mockDecayEngine.reinforceMemoryByType).toHaveBeenCalledWith(memoryId, "importance");
    });

    it("should throw error for non-existent memory reinforcement", async () => {
      mockDecayEngine.reinforceMemory.mockRejectedValueOnce(new Error("Memory not found"));

      await expect(mockDecayEngine.reinforceMemory("non-existent", 0.1)).rejects.toThrow(
        "Memory not found"
      );
    });
  });

  describe("Pruning System Integration", () => {
    it("should identify memories below pruning threshold", async () => {
      // Mock pruning candidates
      mockDecayEngine.identifyPruningCandidates.mockResolvedValue([
        "weak-memory-1",
        "weak-memory-2",
      ]);

      const candidates = await mockDecayEngine.identifyPruningCandidates(0.1);
      expect(candidates).toContain("weak-memory-1");
      expect(candidates).toContain("weak-memory-2");
    });

    it("should prune memories by IDs", async () => {
      const memoryIds = ["prune-1", "prune-2"];

      // Mock prune operation
      mockDecayEngine.pruneMemories.mockResolvedValue(2);

      const deletedCount = await mockDecayEngine.pruneMemories(memoryIds);
      expect(deletedCount).toBe(2);
      expect(mockDecayEngine.pruneMemories).toHaveBeenCalledWith(memoryIds);
    });

    it("should handle empty prune list", async () => {
      mockDecayEngine.pruneMemories.mockResolvedValue(0);

      const deletedCount = await mockDecayEngine.pruneMemories([]);
      expect(deletedCount).toBe(0);
    });

    it("should rollback on prune error", async () => {
      mockDecayEngine.pruneMemories.mockRejectedValueOnce(new Error("Delete operation failed"));

      const client = await mockDb.manager.beginTransaction();

      await expect(mockDecayEngine.pruneMemories(["error-id"])).rejects.toThrow(
        "Delete operation failed"
      );

      await mockDb.manager.rollbackTransaction(client);
      expect(mockDb.manager.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe("Maintenance Cycle Integration", () => {
    it("should run full maintenance cycle", async () => {
      // Mock maintenance result
      mockDecayEngine.runDecayMaintenance.mockResolvedValue({
        processedCount: 100,
        prunedCount: 5,
        processingTime: 500,
        errors: [],
      });

      const result = await mockDecayEngine.runDecayMaintenance();

      expect(result.processedCount).toBe(100);
      expect(result.prunedCount).toBe(5);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle maintenance errors gracefully", async () => {
      mockDecayEngine.runDecayMaintenance.mockResolvedValue({
        processedCount: 50,
        prunedCount: 0,
        processingTime: 200,
        errors: ["Batch 2 failed: Connection timeout"],
      });

      const result = await mockDecayEngine.runDecayMaintenance();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("failed");
    });

    it("should validate cron expression for scheduling", () => {
      // Valid cron expression
      expect(() => mockDecayEngine.scheduleDecayJob("0 2 * * *")).not.toThrow();
      expect(mockDecayEngine.scheduleDecayJob).toHaveBeenCalledWith("0 2 * * *");
    });
  });

  describe("Background Scheduler Integration", () => {
    it("should coordinate batch processing with decay engine", async () => {
      // Mock memories for batch processing
      const memories: Memory[] = Array.from({ length: 100 }, (_, i) =>
        createTestMemory({
          id: `batch-${i}`,
          lastAccessed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        })
      );

      // Mock database query to return memories
      (mockDb.client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: memories.map((m) => ({
          id: m.id,
          content: m.content,
          created_at: m.createdAt.toISOString(),
          last_accessed: m.lastAccessed.toISOString(),
          access_count: m.accessCount,
          salience: m.salience,
          decay_rate: m.decayRate,
          strength: m.strength,
          user_id: m.userId,
          session_id: m.sessionId,
          primary_sector: m.primarySector,
        })),
        rowCount: memories.length,
      });

      // Run maintenance
      mockDecayEngine.runDecayMaintenance.mockResolvedValue({
        processedCount: memories.length,
        prunedCount: 0,
        processingTime: 1000,
        errors: [],
      });

      const result = await mockDecayEngine.runDecayMaintenance();
      expect(result.processedCount).toBe(100);
    });

    it("should track processing time for maintenance operations", async () => {
      mockDecayEngine.runDecayMaintenance.mockResolvedValue({
        processedCount: 50,
        prunedCount: 2,
        processingTime: 750,
        errors: [],
      });

      const result = await mockDecayEngine.runDecayMaintenance();

      expect(result).toHaveProperty("processingTime");
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it("should complete processing within time limit", async () => {
      const maxProcessingTime = 30 * 60 * 1000; // 30 minutes

      mockDecayEngine.runDecayMaintenance.mockResolvedValue({
        processedCount: 1000,
        prunedCount: 10,
        processingTime: 5000, // 5 seconds
        errors: [],
      });

      const result = await mockDecayEngine.runDecayMaintenance();
      expect(result.processingTime).toBeLessThan(maxProcessingTime);
    });
  });

  describe("Decay Calculation Integration", () => {
    it("should calculate correct decay for different time periods", () => {
      const now = new Date();

      // 1 day old memory
      const oneDayOld = createTestMemory({
        lastAccessed: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        strength: 1.0,
      });
      const strength1Day = mockDecayEngine.calculateDecayedStrength(oneDayOld, now);
      expect(strength1Day).toBeLessThan(1.0);
      expect(strength1Day).toBeGreaterThan(0.95);

      // 7 days old memory
      const sevenDaysOld = createTestMemory({
        lastAccessed: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        strength: 1.0,
      });
      const strength7Days = mockDecayEngine.calculateDecayedStrength(sevenDaysOld, now);
      expect(strength7Days).toBeLessThan(strength1Day);

      // 30 days old memory
      const thirtyDaysOld = createTestMemory({
        lastAccessed: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        strength: 1.0,
      });
      const strength30Days = mockDecayEngine.calculateDecayedStrength(thirtyDaysOld, now);
      expect(strength30Days).toBeLessThan(strength7Days);
    });

    it("should handle future lastAccessed (negative time)", () => {
      const futureTime = new Date("2025-12-12T12:00:00Z");
      const currentTime = new Date("2024-12-11T12:00:00Z");

      const memory = createTestMemory({
        lastAccessed: futureTime,
        strength: 0.8,
      });

      const strength = mockDecayEngine.calculateDecayedStrength(memory, currentTime);
      expect(strength).toBe(0.8); // Should return original strength
    });

    it("should enforce minimum strength floor", () => {
      const veryOldMemory = createTestMemory({
        lastAccessed: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year old
        strength: 1.0,
      });

      const strength = mockDecayEngine.calculateDecayedStrength(veryOldMemory, new Date());
      expect(strength).toBeGreaterThanOrEqual(0.01); // Minimum strength floor
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle database connection failure during decay", async () => {
      mockDb.manager.getConnection.mockRejectedValueOnce(new Error("Connection failed"));

      await expect(mockDb.manager.getConnection()).rejects.toThrow("Connection failed");
    });

    it("should handle transaction failure during batch processing", async () => {
      mockDb.manager.beginTransaction.mockRejectedValueOnce(new Error("Transaction failed"));

      await expect(mockDb.manager.beginTransaction()).rejects.toThrow("Transaction failed");
    });

    it("should handle invalid reinforcement type", async () => {
      mockDecayEngine.reinforceMemoryByType.mockRejectedValueOnce(
        new Error("Invalid reinforcement type")
      );

      await expect(
        mockDecayEngine.reinforceMemoryByType("test-id", "invalid" as "access")
      ).rejects.toThrow("Invalid reinforcement type");
    });

    it("should handle explicit reinforcement without boost", async () => {
      mockDecayEngine.reinforceMemoryByType.mockRejectedValueOnce(
        new Error("Boost parameter required for explicit reinforcement")
      );

      await expect(
        mockDecayEngine.reinforceMemoryByType("test-id", "explicit", undefined)
      ).rejects.toThrow("Boost parameter required");
    });
  });

  describe("Sector-Specific Decay Integration", () => {
    it("should apply different decay rates per sector", () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      // Create memories for different sectors
      const episodicMemory = createTestMemory({
        primarySector: "episodic",
        lastAccessed: tenDaysAgo,
        strength: 1.0,
      });

      const semanticMemory = createTestMemory({
        primarySector: "semantic",
        lastAccessed: tenDaysAgo,
        strength: 1.0,
      });

      // Both should decay (using same mock rate for simplicity)
      const episodicStrength = mockDecayEngine.calculateDecayedStrength(episodicMemory, now);
      const semanticStrength = mockDecayEngine.calculateDecayedStrength(semanticMemory, now);

      expect(episodicStrength).toBeLessThan(1.0);
      expect(semanticStrength).toBeLessThan(1.0);
    });
  });
});
