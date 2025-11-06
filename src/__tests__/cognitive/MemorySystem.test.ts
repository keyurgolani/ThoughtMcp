/**
 * Unit tests for MemorySystem
 * Tests the core memory management functionality including episodic and semantic memory coordination
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MemorySystem,
  MemorySystemConfig,
} from "../../cognitive/MemorySystem.js";

// Mock the dependencies
vi.mock("../../cognitive/EpisodicMemory.js", () => ({
  EpisodicMemory: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    store: vi.fn().mockReturnValue("episode-123"),
    retrieve: vi.fn().mockResolvedValue([]),
    consolidate: vi.fn().mockReturnValue([]),
    getStatus: vi.fn().mockReturnValue({
      name: "EpisodicMemory",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
    reset: vi.fn(),
  })),
}));

vi.mock("../../cognitive/SemanticMemory.js", () => ({
  SemanticMemory: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    store: vi.fn().mockReturnValue("concept-456"),
    retrieve: vi.fn().mockResolvedValue([]),
    addRelation: vi.fn(),
    getStatus: vi.fn().mockReturnValue({
      name: "SemanticMemory",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
    reset: vi.fn(),
  })),
}));

vi.mock("../../cognitive/ConsolidationEngine.js", () => ({
  ConsolidationEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    consolidate: vi.fn().mockResolvedValue({
      episodes_processed: 0,
      concepts_created: 0,
      consolidation_time_ms: 100,
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "ConsolidationEngine",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
    reset: vi.fn(),
  })),
}));

vi.mock("../../utils/persistence/index.js", () => ({
  PersistenceManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    startAutoSave: vi.fn(),
    loadMemorySystem: vi.fn().mockResolvedValue(null),
  })),
}));

describe("MemorySystem", () => {
  let memorySystem: MemorySystem;
  let config: Partial<MemorySystemConfig>;

  beforeEach(() => {
    config = {
      episodic: {},
      semantic: {},
      consolidation: {},
      persistence: {},
      consolidation_interval_ms: 1000,
      auto_consolidation: false, // Disable for testing
      memory_decay_interval_ms: 2000,
      auto_decay: false, // Disable for testing
      persistence_enabled: true,
      auto_save_enabled: false, // Disable for testing
      auto_recovery_enabled: false, // Disable for testing
    };
    memorySystem = new MemorySystem(config);
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize successfully with default config", async () => {
      const system = new MemorySystem();
      await expect(system.initialize()).resolves.not.toThrow();
    });

    it("should initialize successfully with custom config", async () => {
      await expect(memorySystem.initialize(config)).resolves.not.toThrow();
    });

    it("should initialize all memory components", async () => {
      await memorySystem.initialize();

      // Verify that all components were initialized
      const status = memorySystem.getStatus();
      expect(status.name).toBe("MemorySystem");
      expect(status.initialized).toBe(true);
    });

    it("should handle initialization errors gracefully", async () => {
      // Mock initialization failure
      const failingSystem = new MemorySystem();
      vi.mocked(failingSystem["episodicMemory"].initialize).mockRejectedValue(
        new Error("Initialization failed")
      );

      await expect(failingSystem.initialize()).rejects.toThrow(
        "Initialization failed"
      );
    });
  });

  describe("Memory Storage", () => {
    beforeEach(async () => {
      await memorySystem.initialize();
    });

    it("should store experiences successfully", async () => {
      const experience = {
        content: "Test memory content",
        context: {
          session_id: "test-session",
          location: "test",
          mood: "neutral",
        },
        importance: 0.7,
        emotional_tags: ["neutral"],
      };

      const result = await memorySystem.storeExperience(experience);

      expect(result.success).toBe(true);
      expect(result.episodic_id).toBe("episode-123");
      expect(result.storage_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle storage errors gracefully", async () => {
      // Mock storage failure
      vi.mocked(memorySystem["episodicMemory"].store).mockImplementation(() => {
        throw new Error("Storage failed");
      });

      const experience = {
        content: "This should fail",
        context: { session_id: "test-session" },
        importance: 0.5,
        emotional_tags: [],
      };

      const result = await memorySystem.storeExperience(experience);
      expect(result.success).toBe(false);
    });
  });

  describe("Memory Retrieval", () => {
    beforeEach(async () => {
      await memorySystem.initialize();
    });

    it("should retrieve memories by cue", async () => {
      const cue = "test query";
      const threshold = 0.3;

      const result = await memorySystem.retrieveMemories(cue, threshold);

      expect(result.episodic_memories).toEqual([]);
      expect(result.semantic_concepts).toEqual([]);
      expect(result.combined_relevance).toBeGreaterThanOrEqual(0);
      expect(result.retrieval_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle retrieval errors gracefully", async () => {
      // Mock retrieval failure
      vi.mocked(memorySystem["episodicMemory"].retrieve).mockRejectedValue(
        new Error("Retrieval failed")
      );

      await expect(memorySystem.retrieveMemories("test")).rejects.toThrow(
        "Retrieval failed"
      );
    });
  });

  describe("Memory Consolidation", () => {
    beforeEach(async () => {
      await memorySystem.initialize();
    });

    it("should perform manual consolidation", async () => {
      const result = await memorySystem.runConsolidation();

      expect(result.patterns_extracted).toBeGreaterThanOrEqual(0);
      expect(result.patterns_extracted).toBeGreaterThanOrEqual(0);
    });

    it("should handle consolidation errors gracefully", async () => {
      // Mock episodic memory to return some episodes
      vi.mocked(memorySystem["episodicMemory"].consolidate).mockReturnValue([
        {
          content: "test episode",
          context: { session_id: "test" },
          timestamp: Date.now(),
          emotional_tags: [],
          importance: 0.5,
          decay_factor: 1.0,
        },
      ]);

      // Mock consolidation failure
      vi.mocked(
        memorySystem["consolidationEngine"].consolidate
      ).mockImplementation(() => {
        throw new Error("Consolidation failed");
      });

      await expect(memorySystem.runConsolidation()).rejects.toThrow(
        "Consolidation failed"
      );
    });
  });

  describe("Component Status", () => {
    beforeEach(async () => {
      await memorySystem.initialize();
    });

    it("should return component status", () => {
      const status = memorySystem.getStatus();

      expect(status.name).toBe("MemorySystem");
      expect(status.initialized).toBe(true);
      expect(status.last_activity).toBeGreaterThan(0);
    });

    it("should reflect component health in overall status", () => {
      // Mock unhealthy component
      vi.mocked(memorySystem["episodicMemory"].getStatus).mockReturnValue({
        name: "EpisodicMemory",
        initialized: false,
        active: false,
        last_activity: 0,
      });

      const status = memorySystem.getStatus();
      expect(status.initialized).toBe(false);
    });
  });

  describe("Configuration", () => {
    it("should use default configuration when none provided", () => {
      const defaultSystem = new MemorySystem();
      const status = defaultSystem.getStatus();
      expect(status).toBeDefined();
    });

    it("should merge provided configuration with defaults", () => {
      const customConfig: Partial<MemorySystemConfig> = {
        consolidation_interval_ms: 5000,
        auto_consolidation: true,
      };

      const customSystem = new MemorySystem(customConfig);
      expect(customSystem).toBeDefined();
    });
  });

  describe("Reset Functionality", () => {
    beforeEach(async () => {
      await memorySystem.initialize();
    });

    it("should reset all components", () => {
      memorySystem.reset();

      expect(memorySystem["episodicMemory"].reset).toHaveBeenCalled();
      expect(memorySystem["semanticMemory"].reset).toHaveBeenCalled();
      expect(memorySystem["consolidationEngine"].reset).toHaveBeenCalled();
    });
  });
});
