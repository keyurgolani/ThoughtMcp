/**
 * Unit tests for CognitiveCore module
 *
 * Tests the singleton pattern and shared cognitive core functionality.
 * Requirements: 16.2, 16.4
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BiasPatternRecognizer } from "../../../bias/bias-pattern-recognizer.js";
import type { MultiDimensionalConfidenceAssessor } from "../../../confidence/multi-dimensional-assessor.js";
import type { CircumplexEmotionAnalyzer } from "../../../emotion/circumplex-analyzer.js";
import type { FrameworkSelector } from "../../../framework/framework-selector.js";
import type { MemoryRepository } from "../../../memory/memory-repository.js";
import type { MemoryAugmentedReasoning } from "../../../reasoning/memory-augmented-reasoning.js";
import type { ParallelReasoningOrchestrator } from "../../../reasoning/orchestrator.js";
import type { ProblemDecomposer } from "../../../reasoning/problem-decomposer.js";
import {
  type CognitiveCore,
  getSharedCore,
  initializeSharedCore,
  isSharedCoreInitialized,
  resetSharedCore,
} from "../../../server/cognitive-core.js";

describe("CognitiveCore", () => {
  // Mock cognitive core for testing
  let mockCognitiveCore: CognitiveCore;

  beforeEach(() => {
    // Reset singleton state before each test
    resetSharedCore();

    // Create mock cognitive core with all required components
    mockCognitiveCore = {
      memoryRepository: {} as MemoryRepository,
      reasoningOrchestrator: {} as ParallelReasoningOrchestrator,
      frameworkSelector: {} as FrameworkSelector,
      confidenceAssessor: {} as MultiDimensionalConfidenceAssessor,
      biasDetector: {} as BiasPatternRecognizer,
      emotionAnalyzer: {} as CircumplexEmotionAnalyzer,
      problemDecomposer: {} as ProblemDecomposer,
      memoryAugmentedReasoning: {} as MemoryAugmentedReasoning,
    };
  });

  afterEach(() => {
    // Clean up singleton state after each test
    resetSharedCore();
    vi.restoreAllMocks();
  });

  describe("isSharedCoreInitialized", () => {
    it("should return false when core is not initialized", () => {
      expect(isSharedCoreInitialized()).toBe(false);
    });

    it("should return true after core is initialized", () => {
      initializeSharedCore(mockCognitiveCore);
      expect(isSharedCoreInitialized()).toBe(true);
    });

    it("should return false after core is reset", () => {
      initializeSharedCore(mockCognitiveCore);
      resetSharedCore();
      expect(isSharedCoreInitialized()).toBe(false);
    });
  });

  describe("initializeSharedCore", () => {
    it("should initialize the shared core successfully", () => {
      expect(() => initializeSharedCore(mockCognitiveCore)).not.toThrow();
      expect(isSharedCoreInitialized()).toBe(true);
    });

    it("should throw error when initializing twice", () => {
      initializeSharedCore(mockCognitiveCore);
      expect(() => initializeSharedCore(mockCognitiveCore)).toThrow(
        "Cognitive core already initialized"
      );
    });

    it("should store the exact core instance provided", () => {
      initializeSharedCore(mockCognitiveCore);
      const retrievedCore = getSharedCore();
      expect(retrievedCore).toBe(mockCognitiveCore);
    });
  });

  describe("getSharedCore", () => {
    it("should throw error when core is not initialized", () => {
      expect(() => getSharedCore()).toThrow(
        "Cognitive core not initialized. Call initializeSharedCore() first."
      );
    });

    it("should return the initialized core", () => {
      initializeSharedCore(mockCognitiveCore);
      const core = getSharedCore();
      expect(core).toBe(mockCognitiveCore);
    });

    it("should return the same instance on multiple calls (singleton pattern)", () => {
      initializeSharedCore(mockCognitiveCore);
      const core1 = getSharedCore();
      const core2 = getSharedCore();
      expect(core1).toBe(core2);
    });

    it("should provide access to all cognitive components", () => {
      initializeSharedCore(mockCognitiveCore);
      const core = getSharedCore();

      expect(core.memoryRepository).toBeDefined();
      expect(core.reasoningOrchestrator).toBeDefined();
      expect(core.frameworkSelector).toBeDefined();
      expect(core.confidenceAssessor).toBeDefined();
      expect(core.biasDetector).toBeDefined();
      expect(core.emotionAnalyzer).toBeDefined();
      expect(core.problemDecomposer).toBeDefined();
      expect(core.memoryAugmentedReasoning).toBeDefined();
    });
  });

  describe("resetSharedCore", () => {
    it("should reset the shared core to null", () => {
      initializeSharedCore(mockCognitiveCore);
      expect(isSharedCoreInitialized()).toBe(true);

      resetSharedCore();
      expect(isSharedCoreInitialized()).toBe(false);
    });

    it("should allow re-initialization after reset", () => {
      initializeSharedCore(mockCognitiveCore);
      resetSharedCore();

      const newCore: CognitiveCore = {
        memoryRepository: {} as MemoryRepository,
        reasoningOrchestrator: {} as ParallelReasoningOrchestrator,
        frameworkSelector: {} as FrameworkSelector,
        confidenceAssessor: {} as MultiDimensionalConfidenceAssessor,
        biasDetector: {} as BiasPatternRecognizer,
        emotionAnalyzer: {} as CircumplexEmotionAnalyzer,
        problemDecomposer: {} as ProblemDecomposer,
        memoryAugmentedReasoning: {} as MemoryAugmentedReasoning,
      };

      expect(() => initializeSharedCore(newCore)).not.toThrow();
      expect(getSharedCore()).toBe(newCore);
    });

    it("should not throw when resetting uninitialized core", () => {
      expect(() => resetSharedCore()).not.toThrow();
    });
  });

  describe("Singleton Pattern - Requirement 16.2, 16.4", () => {
    it("should ensure MCP server and REST API share same instances", () => {
      // Simulate MCP server initializing the core
      initializeSharedCore(mockCognitiveCore);

      // Simulate REST API getting the core
      const restApiCore = getSharedCore();

      // Simulate MCP server getting the core
      const mcpServerCore = getSharedCore();

      // Both should reference the exact same instance
      expect(restApiCore).toBe(mcpServerCore);
      expect(restApiCore.memoryRepository).toBe(mcpServerCore.memoryRepository);
      expect(restApiCore.reasoningOrchestrator).toBe(mcpServerCore.reasoningOrchestrator);
    });

    it("should share database connection pool via memoryRepository", () => {
      // Create a mock with a specific memoryRepository instance
      const sharedMemoryRepo = { query: vi.fn() } as unknown as MemoryRepository;
      const coreWithSharedRepo: CognitiveCore = {
        ...mockCognitiveCore,
        memoryRepository: sharedMemoryRepo,
      };

      initializeSharedCore(coreWithSharedRepo);

      // Both servers should get the same memoryRepository
      const core1 = getSharedCore();
      const core2 = getSharedCore();

      expect(core1.memoryRepository).toBe(sharedMemoryRepo);
      expect(core2.memoryRepository).toBe(sharedMemoryRepo);
    });
  });
});
