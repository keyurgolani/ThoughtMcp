/**
 * Brain Directory Configuration Tests
 *
 * Tests for brain directory path resolution, environment variable handling,
 * and integration with the cognitive configuration system.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CognitiveConfig, ProcessingMode } from "../../types/core.js";
import { ConfigManager } from "../../utils/config.js";

describe("Brain Directory Configuration", () => {
  let configManager: ConfigManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear brain directory related env vars
    delete process.env.COGNITIVE_BRAIN_DIR;
    delete process.env.HOME;

    configManager = new ConfigManager();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("default brain directory configuration", () => {
    it("should use default brain directory when no environment variable is set", () => {
      const config = configManager.getConfig();
      expect(config.brain_dir).toBe("~/.brain");
    });

    it("should include brain_dir in default configuration", () => {
      const config = configManager.getConfig();
      expect(config).toHaveProperty("brain_dir");
      expect(typeof config.brain_dir).toBe("string");
      expect(config.brain_dir).toBeDefined();
      expect(config.brain_dir!.length).toBeGreaterThan(0);
    });
  });

  describe("environment variable configuration", () => {
    it("should use COGNITIVE_BRAIN_DIR environment variable when set", () => {
      process.env.COGNITIVE_BRAIN_DIR = "/custom/brain/path";

      const newConfigManager = new ConfigManager();
      const config = newConfigManager.getConfig();

      expect(config.brain_dir).toBe("/custom/brain/path");
    });

    it("should handle relative paths in environment variable", () => {
      process.env.COGNITIVE_BRAIN_DIR = "./project-brain";

      const newConfigManager = new ConfigManager();
      const config = newConfigManager.getConfig();

      expect(config.brain_dir).toBe("./project-brain");
    });

    it("should handle home directory expansion in environment variable", () => {
      process.env.COGNITIVE_BRAIN_DIR = "~/custom-brain";

      const newConfigManager = new ConfigManager();
      const config = newConfigManager.getConfig();

      expect(config.brain_dir).toBe("~/custom-brain");
    });

    it("should handle domain-specific brain directories", () => {
      process.env.COGNITIVE_BRAIN_DIR = "~/.brain/web-development";

      const newConfigManager = new ConfigManager();
      const config = newConfigManager.getConfig();

      expect(config.brain_dir).toBe("~/.brain/web-development");
    });
  });

  describe("brain directory path resolution", () => {
    it("should resolve home directory path correctly", () => {
      process.env.HOME = "/Users/testuser";
      process.env.COGNITIVE_BRAIN_DIR = "~/.brain";

      const newConfigManager = new ConfigManager();
      const resolvedPath = newConfigManager.getBrainDirectoryPath();

      expect(resolvedPath).toBe("/Users/testuser/.brain");
    });

    it("should handle missing HOME environment variable", () => {
      delete process.env.HOME;
      process.env.COGNITIVE_BRAIN_DIR = "~/.brain";

      const newConfigManager = new ConfigManager();
      const resolvedPath = newConfigManager.getBrainDirectoryPath();

      // Should fallback to empty string when HOME is not set
      expect(resolvedPath).toBe("/.brain");
    });

    it("should return absolute paths unchanged", () => {
      process.env.COGNITIVE_BRAIN_DIR = "/absolute/path/to/brain";

      const newConfigManager = new ConfigManager();
      const resolvedPath = newConfigManager.getBrainDirectoryPath();

      expect(resolvedPath).toBe("/absolute/path/to/brain");
    });

    it("should return relative paths unchanged", () => {
      process.env.COGNITIVE_BRAIN_DIR = "./relative/brain";

      const newConfigManager = new ConfigManager();
      const resolvedPath = newConfigManager.getBrainDirectoryPath();

      expect(resolvedPath).toBe("./relative/brain");
    });
  });

  describe("memory file path generation", () => {
    it("should generate correct memory file path with default brain directory", () => {
      process.env.HOME = "/Users/testuser";
      process.env.COGNITIVE_BRAIN_DIR = "~/.brain";

      const newConfigManager = new ConfigManager();
      const memoryFilePath = newConfigManager.getMemoryFilePath();

      expect(memoryFilePath).toBe("/Users/testuser/.brain/memory.json");
    });

    it("should generate correct memory file path with custom brain directory", () => {
      process.env.COGNITIVE_BRAIN_DIR = "/custom/brain/location";

      const newConfigManager = new ConfigManager();
      const memoryFilePath = newConfigManager.getMemoryFilePath();

      expect(memoryFilePath).toBe("/custom/brain/location/memory.json");
    });

    it("should generate correct memory file path with relative brain directory", () => {
      process.env.COGNITIVE_BRAIN_DIR = "./project-brain";

      const newConfigManager = new ConfigManager();
      const memoryFilePath = newConfigManager.getMemoryFilePath();

      expect(memoryFilePath).toBe("project-brain/memory.json");
    });

    it("should generate correct memory file path with domain-specific brain", () => {
      process.env.HOME = "/Users/testuser";
      process.env.COGNITIVE_BRAIN_DIR = "~/.brain/data-science";

      const newConfigManager = new ConfigManager();
      const memoryFilePath = newConfigManager.getMemoryFilePath();

      expect(memoryFilePath).toBe(
        "/Users/testuser/.brain/data-science/memory.json"
      );
    });
  });

  describe("configuration validation", () => {
    it("should validate brain_dir as required field", () => {
      const config: CognitiveConfig = {
        default_mode: ProcessingMode.BALANCED,
        enable_emotion: true,
        enable_metacognition: true,
        enable_prediction: true,
        working_memory_capacity: 7,
        episodic_memory_size: 1000,
        semantic_memory_size: 5000,
        consolidation_interval: 300000,
        noise_level: 0.1,
        temperature: 0.7,
        attention_threshold: 0.3,
        max_reasoning_depth: 10,
        timeout_ms: 30000,
        max_concurrent_sessions: 100,
        confidence_threshold: 0.6,
        system2_activation_threshold: 0.4,
        memory_retrieval_threshold: 0.3,
        brain_dir: "~/.brain",
      };

      expect(() => {
        // This should not throw since brain_dir is present
        expect(config.brain_dir).toBeDefined();
        expect(typeof config.brain_dir).toBe("string");
      }).not.toThrow();
    });
  });

  describe("configuration updates", () => {
    it("should allow updating brain directory configuration", () => {
      const initialConfig = configManager.getConfig();
      expect(initialConfig.brain_dir).toBe("~/.brain");

      configManager.updateConfig({ brain_dir: "/new/brain/path" });

      const updatedConfig = configManager.getConfig();
      expect(updatedConfig.brain_dir).toBe("/new/brain/path");
    });

    it("should maintain other configuration when updating brain directory", () => {
      const initialConfig = configManager.getConfig();
      const initialMode = initialConfig.default_mode;
      const initialEmotion = initialConfig.enable_emotion;

      configManager.updateConfig({ brain_dir: "/new/brain/path" });

      const updatedConfig = configManager.getConfig();
      expect(updatedConfig.brain_dir).toBe("/new/brain/path");
      expect(updatedConfig.default_mode).toBe(initialMode);
      expect(updatedConfig.enable_emotion).toBe(initialEmotion);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string brain directory", () => {
      process.env.COGNITIVE_BRAIN_DIR = "";

      const newConfigManager = new ConfigManager();
      const config = newConfigManager.getConfig();

      // Should fall back to default when empty string is provided
      expect(config.brain_dir).toBe("~/.brain");
    });

    it("should handle whitespace-only brain directory", () => {
      process.env.COGNITIVE_BRAIN_DIR = "   ";

      const newConfigManager = new ConfigManager();
      const config = newConfigManager.getConfig();

      // Should fall back to default when whitespace-only string is provided
      expect(config.brain_dir).toBe("~/.brain");
    });

    it("should handle very long brain directory paths", () => {
      const longPath =
        "/very/long/path/to/brain/directory/that/exceeds/normal/length/expectations/and/continues/for/a/while/longer";
      process.env.COGNITIVE_BRAIN_DIR = longPath;

      const newConfigManager = new ConfigManager();
      const config = newConfigManager.getConfig();

      expect(config.brain_dir).toBe(longPath);
    });

    it("should handle paths with special characters", () => {
      const specialPath = "~/brain-dir_with.special@chars#and$symbols";
      process.env.COGNITIVE_BRAIN_DIR = specialPath;

      const newConfigManager = new ConfigManager();
      const config = newConfigManager.getConfig();

      expect(config.brain_dir).toBe(specialPath);
    });
  });
});
