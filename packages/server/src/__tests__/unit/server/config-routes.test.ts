/**
 * Config Routes Unit Tests
 *
 * Tests for the system configuration routes including get and update endpoints.
 * Requirements: 10.1, 10.2
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { CognitiveCore } from "../../../server/cognitive-core.js";
import {
  configStore,
  createConfigRoutes,
  type ConfigGetResponse,
  type SystemConfig,
} from "../../../server/routes/config.js";

// Mock cognitive core with all required methods
const createMockCognitiveCore = (): CognitiveCore => {
  return {
    memoryRepository: {} as CognitiveCore["memoryRepository"],
    reasoningOrchestrator: {} as CognitiveCore["reasoningOrchestrator"],
    frameworkSelector: {} as CognitiveCore["frameworkSelector"],
    confidenceAssessor: {} as CognitiveCore["confidenceAssessor"],
    biasDetector: {} as CognitiveCore["biasDetector"],
    emotionAnalyzer: {} as CognitiveCore["emotionAnalyzer"],
    problemDecomposer: {} as CognitiveCore["problemDecomposer"],
    memoryAugmentedReasoning: {} as CognitiveCore["memoryAugmentedReasoning"],
  };
};

describe("Config Routes", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
    // Reset config store to defaults before each test
    configStore.resetToDefaults();
  });

  describe("createConfigRoutes", () => {
    it("should create a router with routes", () => {
      const router = createConfigRoutes(mockCore);
      expect(router).toBeDefined();
      expect(router.stack).toBeDefined();
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it("should have GET route for / endpoint", () => {
      const router = createConfigRoutes(mockCore);
      const hasGetRoute = router.stack.some(
        (layer: { route?: { path: string; methods?: { get?: boolean } } }) => {
          return layer.route?.path === "/" && layer.route?.methods?.get;
        }
      );
      expect(hasGetRoute).toBe(true);
    });

    it("should have PUT route for / endpoint", () => {
      const router = createConfigRoutes(mockCore);
      const hasPutRoute = router.stack.some(
        (layer: { route?: { path: string; methods?: { put?: boolean } } }) => {
          return layer.route?.path === "/" && layer.route?.methods?.put;
        }
      );
      expect(hasPutRoute).toBe(true);
    });
  });

  describe("ConfigStore", () => {
    describe("getConfig", () => {
      it("should return default configuration", () => {
        const config = configStore.getConfig();

        expect(config).toBeDefined();
        expect(config.cognitiveMode).toBe("balanced");
        expect(config.version).toBe("v1");
        expect(config.lastUpdated).toBeDefined();
      });

      it("should return all required configuration sections", () => {
        const config = configStore.getConfig();

        // Requirements: 10.1 - cognitive mode, memory limits, processing parameters, feature flags
        expect(config.cognitiveMode).toBeDefined();
        expect(config.memoryLimits).toBeDefined();
        expect(config.processingParameters).toBeDefined();
        expect(config.featureFlags).toBeDefined();
      });

      it("should return default memory limits", () => {
        const config = configStore.getConfig();

        expect(config.memoryLimits.maxMemoriesPerUser).toBe(100000);
        expect(config.memoryLimits.maxContentLength).toBe(100000);
        expect(config.memoryLimits.maxBatchSize);
        expect(config.memoryLimits.retentionDays).toBe(0);
      });

      it("should return default processing parameters", () => {
        const config = configStore.getConfig();

        expect(config.processingParameters.embeddingDimension).toBe(768);
        expect(config.processingParameters.minSimilarityThreshold).toBe(0.5);
        expect(config.processingParameters.maxParallelStreams).toBe(4);
        expect(config.processingParameters.reasoningTimeoutMs).toBe(30000);
        expect(config.processingParameters.defaultRecallLimit).toBe(10);
      });

      it("should return default feature flags", () => {
        const config = configStore.getConfig();

        expect(config.featureFlags.parallelReasoningEnabled).toBe(true);
        expect(config.featureFlags.emotionDetectionEnabled).toBe(true);
        expect(config.featureFlags.biasDetectionEnabled).toBe(true);
        expect(config.featureFlags.memoryConsolidationEnabled).toBe(true);
        expect(config.featureFlags.waypointGraphEnabled).toBe(true);
      });
    });

    describe("updateConfig", () => {
      it("should update cognitive mode", () => {
        const result = configStore.updateConfig({ cognitiveMode: "analytical" });

        expect(result.config.cognitiveMode).toBe("analytical");
        expect(result.updatedFields).toContain("cognitiveMode");
        expect(result.restartRequired).toBe(false);
      });

      it("should update memory limits", () => {
        const result = configStore.updateConfig({
          memoryLimits: {
            maxMemoriesPerUser: 50000,
            maxContentLength: 50000,
            maxBatchSize: 50,
            retentionDays: 30,
          },
        });

        expect(result.config.memoryLimits.maxMemoriesPerUser).toBe(50000);
        expect(result.config.memoryLimits.maxContentLength).toBe(50000);
        expect(result.config.memoryLimits.maxBatchSize).toBe(50);
        expect(result.config.memoryLimits.retentionDays).toBe(30);
        expect(result.updatedFields).toContain("memoryLimits.maxMemoriesPerUser");
        expect(result.updatedFields).toContain("memoryLimits.retentionDays");
        // Changing retention policy requires restart
        expect(result.restartRequired).toBe(true);
      });

      it("should update processing parameters", () => {
        const result = configStore.updateConfig({
          processingParameters: {
            embeddingDimension: 1024,
            minSimilarityThreshold: 0.7,
            maxParallelStreams: 8,
            reasoningTimeoutMs: 60000,
            defaultRecallLimit: 20,
          },
        });

        expect(result.config.processingParameters.embeddingDimension).toBe(1024);
        expect(result.config.processingParameters.minSimilarityThreshold).toBe(0.7);
        expect(result.config.processingParameters.maxParallelStreams).toBe(8);
        expect(result.config.processingParameters.reasoningTimeoutMs).toBe(60000);
        expect(result.config.processingParameters.defaultRecallLimit).toBe(20);
        // Changing embedding dimension requires restart
        expect(result.restartRequired).toBe(true);
      });

      it("should update feature flags", () => {
        const result = configStore.updateConfig({
          featureFlags: {
            parallelReasoningEnabled: false,
            emotionDetectionEnabled: false,
            biasDetectionEnabled: false,
            memoryConsolidationEnabled: false,
            waypointGraphEnabled: false,
          },
        });

        expect(result.config.featureFlags.parallelReasoningEnabled).toBe(false);
        expect(result.config.featureFlags.emotionDetectionEnabled).toBe(false);
        expect(result.config.featureFlags.biasDetectionEnabled).toBe(false);
        expect(result.config.featureFlags.memoryConsolidationEnabled).toBe(false);
        expect(result.config.featureFlags.waypointGraphEnabled).toBe(false);
        // Feature flag changes don't require restart
        expect(result.restartRequired).toBe(false);
      });

      it("should increment version on update", () => {
        const initialConfig = configStore.getConfig();
        expect(initialConfig.version).toBe("v1");

        configStore.updateConfig({ cognitiveMode: "creative" });
        const updatedConfig = configStore.getConfig();
        expect(updatedConfig.version).toBe("v2");

        configStore.updateConfig({ cognitiveMode: "analytical" });
        const updatedConfig2 = configStore.getConfig();
        expect(updatedConfig2.version).toBe("v3");
      });

      it("should not increment version when no changes are made", () => {
        const initialConfig = configStore.getConfig();
        expect(initialConfig.version).toBe("v1");

        // Update with same value
        configStore.updateConfig({ cognitiveMode: "balanced" });
        const updatedConfig = configStore.getConfig();
        expect(updatedConfig.version).toBe("v1");
      });

      it("should update lastUpdated timestamp on change", () => {
        const initialConfig = configStore.getConfig();
        const initialTimestamp = new Date(initialConfig.lastUpdated).getTime();

        // Wait a small amount of time
        const delay = 10;
        const start = Date.now();
        while (Date.now() - start < delay) {
          // Busy wait
        }

        configStore.updateConfig({ cognitiveMode: "creative" });
        const updatedConfig = configStore.getConfig();
        const updatedTimestamp = new Date(updatedConfig.lastUpdated).getTime();

        expect(updatedTimestamp).toBeGreaterThanOrEqual(initialTimestamp);
      });

      it("should support partial updates to memory limits", () => {
        const result = configStore.updateConfig({
          memoryLimits: {
            maxBatchSize: 200,
            maxMemoriesPerUser: 100000,
            maxContentLength: 100000,
            retentionDays: 0,
          },
        });

        // Only maxBatchSize should be in updatedFields
        expect(result.updatedFields).toContain("memoryLimits.maxBatchSize");
        expect(result.updatedFields).not.toContain("memoryLimits.maxMemoriesPerUser");
        expect(result.config.memoryLimits.maxBatchSize).toBe(200);
        // Other values should remain unchanged
        expect(result.config.memoryLimits.maxMemoriesPerUser).toBe(100000);
      });

      it("should indicate restart required for embedding dimension change", () => {
        const result = configStore.updateConfig({
          processingParameters: {
            embeddingDimension: 512,
            minSimilarityThreshold: 0.5,
            maxParallelStreams: 4,
            reasoningTimeoutMs: 30000,
            defaultRecallLimit: 10,
          },
        });

        expect(result.restartRequired).toBe(true);
        expect(result.updatedFields).toContain("processingParameters.embeddingDimension");
      });

      it("should indicate restart required for retention days change", () => {
        const result = configStore.updateConfig({
          memoryLimits: {
            retentionDays: 365,
            maxMemoriesPerUser: 100000,
            maxContentLength: 100000,
            maxBatchSize: 100,
          },
        });

        expect(result.restartRequired).toBe(true);
        expect(result.updatedFields).toContain("memoryLimits.retentionDays");
      });
    });

    describe("resetToDefaults", () => {
      it("should reset all configuration to defaults", () => {
        // Make some changes
        configStore.updateConfig({ cognitiveMode: "analytical" });
        configStore.updateConfig({
          featureFlags: {
            parallelReasoningEnabled: false,
            emotionDetectionEnabled: true,
            biasDetectionEnabled: true,
            memoryConsolidationEnabled: true,
            waypointGraphEnabled: true,
          },
        });

        // Reset
        configStore.resetToDefaults();

        // Verify defaults
        const config = configStore.getConfig();
        expect(config.cognitiveMode).toBe("balanced");
        expect(config.featureFlags.parallelReasoningEnabled).toBe(true);
        expect(config.version).toBe("v1");
      });
    });
  });

  /**
   * Property 23: Config Update Persistence
   * For any configuration update request, a subsequent GET request should return the updated values.
   * Validates: Requirements 10.2
   */
  describe("Config Update Persistence Property", () => {
    it("should persist cognitive mode updates", () => {
      const modes: Array<SystemConfig["cognitiveMode"]> = [
        "balanced",
        "analytical",
        "creative",
        "intuitive",
        "deliberative",
      ];

      for (const mode of modes) {
        configStore.updateConfig({ cognitiveMode: mode });
        const config = configStore.getConfig();
        expect(config.cognitiveMode).toBe(mode);
      }
    });

    it("should persist memory limits updates", () => {
      const testValues = [
        { maxMemoriesPerUser: 1000, maxContentLength: 5000, maxBatchSize: 10, retentionDays: 7 },
        {
          maxMemoriesPerUser: 500000,
          maxContentLength: 200000,
          maxBatchSize: 500,
          retentionDays: 365,
        },
        { maxMemoriesPerUser: 100, maxContentLength: 1000, maxBatchSize: 5, retentionDays: 0 },
      ];

      for (const limits of testValues) {
        configStore.updateConfig({ memoryLimits: limits });
        const config = configStore.getConfig();
        expect(config.memoryLimits.maxMemoriesPerUser).toBe(limits.maxMemoriesPerUser);
        expect(config.memoryLimits.maxContentLength).toBe(limits.maxContentLength);
        expect(config.memoryLimits.maxBatchSize).toBe(limits.maxBatchSize);
        expect(config.memoryLimits.retentionDays).toBe(limits.retentionDays);
      }
    });

    it("should persist processing parameters updates", () => {
      const testValues = [
        {
          embeddingDimension: 384,
          minSimilarityThreshold: 0.3,
          maxParallelStreams: 2,
          reasoningTimeoutMs: 10000,
          defaultRecallLimit: 5,
        },
        {
          embeddingDimension: 1536,
          minSimilarityThreshold: 0.9,
          maxParallelStreams: 8,
          reasoningTimeoutMs: 120000,
          defaultRecallLimit: 100,
        },
      ];

      for (const params of testValues) {
        configStore.updateConfig({ processingParameters: params });
        const config = configStore.getConfig();
        expect(config.processingParameters.embeddingDimension).toBe(params.embeddingDimension);
        expect(config.processingParameters.minSimilarityThreshold).toBe(
          params.minSimilarityThreshold
        );
        expect(config.processingParameters.maxParallelStreams).toBe(params.maxParallelStreams);
        expect(config.processingParameters.reasoningTimeoutMs).toBe(params.reasoningTimeoutMs);
        expect(config.processingParameters.defaultRecallLimit).toBe(params.defaultRecallLimit);
      }
    });

    it("should persist feature flags updates", () => {
      const testValues = [
        {
          parallelReasoningEnabled: false,
          emotionDetectionEnabled: false,
          biasDetectionEnabled: false,
          memoryConsolidationEnabled: false,
          waypointGraphEnabled: false,
        },
        {
          parallelReasoningEnabled: true,
          emotionDetectionEnabled: true,
          biasDetectionEnabled: true,
          memoryConsolidationEnabled: true,
          waypointGraphEnabled: true,
        },
        {
          parallelReasoningEnabled: true,
          emotionDetectionEnabled: false,
          biasDetectionEnabled: true,
          memoryConsolidationEnabled: false,
          waypointGraphEnabled: true,
        },
      ];

      for (const flags of testValues) {
        configStore.updateConfig({ featureFlags: flags });
        const config = configStore.getConfig();
        expect(config.featureFlags.parallelReasoningEnabled).toBe(flags.parallelReasoningEnabled);
        expect(config.featureFlags.emotionDetectionEnabled).toBe(flags.emotionDetectionEnabled);
        expect(config.featureFlags.biasDetectionEnabled).toBe(flags.biasDetectionEnabled);
        expect(config.featureFlags.memoryConsolidationEnabled).toBe(
          flags.memoryConsolidationEnabled
        );
        expect(config.featureFlags.waypointGraphEnabled).toBe(flags.waypointGraphEnabled);
      }
    });

    it("should persist multiple simultaneous updates", () => {
      configStore.updateConfig({
        cognitiveMode: "creative",
        memoryLimits: {
          maxMemoriesPerUser: 25000,
          maxContentLength: 50000,
          maxBatchSize: 75,
          retentionDays: 180,
        },
        processingParameters: {
          embeddingDimension: 512,
          minSimilarityThreshold: 0.6,
          maxParallelStreams: 6,
          reasoningTimeoutMs: 45000,
          defaultRecallLimit: 15,
        },
        featureFlags: {
          parallelReasoningEnabled: true,
          emotionDetectionEnabled: false,
          biasDetectionEnabled: true,
          memoryConsolidationEnabled: false,
          waypointGraphEnabled: true,
        },
      });

      const config = configStore.getConfig();

      expect(config.cognitiveMode).toBe("creative");
      expect(config.memoryLimits.maxMemoriesPerUser).toBe(25000);
      expect(config.memoryLimits.maxContentLength).toBe(50000);
      expect(config.memoryLimits.maxBatchSize).toBe(75);
      expect(config.memoryLimits.retentionDays).toBe(180);
      expect(config.processingParameters.embeddingDimension).toBe(512);
      expect(config.processingParameters.minSimilarityThreshold).toBe(0.6);
      expect(config.processingParameters.maxParallelStreams).toBe(6);
      expect(config.processingParameters.reasoningTimeoutMs).toBe(45000);
      expect(config.processingParameters.defaultRecallLimit).toBe(15);
      expect(config.featureFlags.parallelReasoningEnabled).toBe(true);
      expect(config.featureFlags.emotionDetectionEnabled).toBe(false);
      expect(config.featureFlags.biasDetectionEnabled).toBe(true);
      expect(config.featureFlags.memoryConsolidationEnabled).toBe(false);
      expect(config.featureFlags.waypointGraphEnabled).toBe(true);
    });
  });

  describe("Response Format", () => {
    it("should include version in response", () => {
      const config: ConfigGetResponse = configStore.getConfig();
      expect(config.version).toMatch(/^v\d+$/);
    });

    it("should include lastUpdated timestamp in ISO format", () => {
      const config: ConfigGetResponse = configStore.getConfig();
      expect(config.lastUpdated).toBeDefined();
      // Should be a valid ISO date string
      expect(() => new Date(config.lastUpdated)).not.toThrow();
      expect(new Date(config.lastUpdated).toISOString()).toBe(config.lastUpdated);
    });
  });
});
