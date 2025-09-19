/**
 * Unit tests for ConfigManager
 */

import { existsSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProcessingMode } from "../../types/core.js";
import { ConfigManager, DEFAULT_CONFIG } from "../../utils/config.js";

describe("ConfigManager", () => {
  let configManager: ConfigManager;
  const test_config_file = "./test-config.json";
  const test_config_dir = "./test-config";

  beforeEach(() => {
    // Clear environment variables
    delete process.env.COGNITIVE_DEFAULT_MODE;
    delete process.env.COGNITIVE_ENABLE_EMOTION;
    delete process.env.COGNITIVE_TEMPERATURE;
    delete process.env.COGNITIVE_WORKING_MEMORY_CAPACITY;
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(test_config_file)) {
      unlinkSync(test_config_file);
    }
    if (existsSync(test_config_dir)) {
      if (existsSync(join(test_config_dir, "cognitive.json"))) {
        unlinkSync(join(test_config_dir, "cognitive.json"));
      }
      try {
        unlinkSync(test_config_dir);
      } catch {
        // Directory might not be empty, ignore
      }
    }
  });

  describe("Default Configuration", () => {
    it("should load default configuration", () => {
      configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.default_mode).toBe(ProcessingMode.BALANCED);
      expect(config.enable_emotion).toBe(true);
      expect(config.enable_metacognition).toBe(true);
      expect(config.working_memory_capacity).toBe(7);
      expect(config.temperature).toBe(0.7);
      expect(config.timeout_ms).toBe(30000);
    });

    it("should apply constructor overrides", () => {
      const overrides = {
        temperature: 0.9,
        enable_emotion: false,
        max_reasoning_depth: 15,
      };

      configManager = new ConfigManager(overrides);
      const config = configManager.getConfig();

      expect(config.temperature).toBe(0.9);
      expect(config.enable_emotion).toBe(false);
      expect(config.max_reasoning_depth).toBe(15);
      // Other values should remain default
      expect(config.working_memory_capacity).toBe(7);
    });
  });

  describe("Environment Variable Configuration", () => {
    it("should load configuration from environment variables", () => {
      process.env.COGNITIVE_DEFAULT_MODE = "creative";
      process.env.COGNITIVE_ENABLE_EMOTION = "false";
      process.env.COGNITIVE_TEMPERATURE = "0.8";
      process.env.COGNITIVE_WORKING_MEMORY_CAPACITY = "5";
      process.env.COGNITIVE_TIMEOUT_MS = "45000";

      configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.default_mode).toBe(ProcessingMode.CREATIVE);
      expect(config.enable_emotion).toBe(false);
      expect(config.temperature).toBe(0.8);
      expect(config.working_memory_capacity).toBe(5);
      expect(config.timeout_ms).toBe(45000);
    });

    it("should handle boolean environment variables correctly", () => {
      process.env.COGNITIVE_ENABLE_EMOTION = "true";
      process.env.COGNITIVE_ENABLE_METACOGNITION = "false";
      process.env.COGNITIVE_ENABLE_PREDICTION = "true";

      configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.enable_emotion).toBe(true);
      expect(config.enable_metacognition).toBe(false);
      expect(config.enable_prediction).toBe(true);
    });

    it("should handle numeric environment variables correctly", () => {
      process.env.COGNITIVE_NOISE_LEVEL = "0.2";
      process.env.COGNITIVE_ATTENTION_THRESHOLD = "0.4";
      process.env.COGNITIVE_CONFIDENCE_THRESHOLD = "0.8";

      configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.noise_level).toBe(0.2);
      expect(config.attention_threshold).toBe(0.4);
      expect(config.confidence_threshold).toBe(0.8);
    });
  });

  describe("File-based Configuration", () => {
    it("should load configuration from JSON file", () => {
      const file_config = {
        temperature: 0.5,
        enable_emotion: false,
        working_memory_capacity: 10,
        max_reasoning_depth: 20,
      };

      writeFileSync(test_config_file, JSON.stringify(file_config));

      configManager = new ConfigManager();
      configManager.addConfigFilePath(test_config_file);
      configManager.reloadConfig();

      const config = configManager.getConfig();

      expect(config.temperature).toBe(0.5);
      expect(config.enable_emotion).toBe(false);
      expect(config.working_memory_capacity).toBe(10);
      expect(config.max_reasoning_depth).toBe(20);
    });

    it("should handle invalid JSON files gracefully", () => {
      writeFileSync(test_config_file, "invalid json content");

      configManager = new ConfigManager();
      configManager.addConfigFilePath(test_config_file);

      // Should not throw, should use defaults
      expect(() => configManager.reloadConfig()).not.toThrow();

      const config = configManager.getConfig();
      expect(config.temperature).toBe(DEFAULT_CONFIG.temperature);
    });

    it("should handle non-existent files gracefully", () => {
      configManager = new ConfigManager();
      configManager.addConfigFilePath("./non-existent-config.json");

      expect(() => configManager.reloadConfig()).not.toThrow();

      const config = configManager.getConfig();
      expect(config.temperature).toBe(DEFAULT_CONFIG.temperature);
    });
  });

  describe("Configuration Priority", () => {
    it("should apply configurations in correct priority order", () => {
      // Create file config
      const file_config = {
        temperature: 0.5,
        enable_emotion: false,
      };
      writeFileSync(test_config_file, JSON.stringify(file_config));

      // Set environment variable
      process.env.COGNITIVE_TEMPERATURE = "0.8";

      // Constructor override
      const constructor_override = {
        temperature: 0.9,
      };

      configManager = new ConfigManager(constructor_override);

      const config = configManager.getConfig();

      // Constructor override should have highest priority
      expect(config.temperature).toBe(0.9);
      // Default values should be used for properties not in constructor override
      expect(config.enable_emotion).toBe(true); // Default value
    });
  });

  describe("Configuration Validation", () => {
    it("should validate configuration ranges", () => {
      expect(() => {
        new ConfigManager({
          working_memory_capacity: 25, // Invalid: > 20
        });
      }).toThrow("Working memory capacity must be between 1 and 20");

      expect(() => {
        new ConfigManager({
          temperature: 3.0, // Invalid: > 2
        });
      }).toThrow("Temperature must be between 0 and 2");

      expect(() => {
        new ConfigManager({
          noise_level: 1.5, // Invalid: > 1
        });
      }).toThrow("Noise level must be between 0 and 1");
    });

    it("should return validation results", () => {
      configManager = new ConfigManager();
      const result = configManager.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("should detect configuration warnings", () => {
      configManager = new ConfigManager({
        episodic_memory_size: 50, // Very small
        max_concurrent_sessions: 2000, // Very large
      });

      const result = configManager.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) => w.includes("Episodic memory size"))
      ).toBe(true);
      expect(
        result.warnings.some((w) => w.includes("concurrent session limit"))
      ).toBe(true);
    });
  });

  describe("Configuration Management", () => {
    beforeEach(() => {
      configManager = new ConfigManager();
    });

    it("should get and set individual configuration values", () => {
      expect(configManager.get("temperature")).toBe(0.7);

      configManager.set("temperature", 0.9);
      expect(configManager.get("temperature")).toBe(0.9);
    });

    it("should update configuration with partial values", () => {
      const updates = {
        temperature: 0.8,
        enable_emotion: false,
        max_reasoning_depth: 15,
      };

      configManager.updateConfig(updates);
      const config = configManager.getConfig();

      expect(config.temperature).toBe(0.8);
      expect(config.enable_emotion).toBe(false);
      expect(config.max_reasoning_depth).toBe(15);
      // Other values should remain unchanged
      expect(config.working_memory_capacity).toBe(7);
    });

    it("should get configuration sources", () => {
      const sources = configManager.getConfigSources();
      expect(Array.isArray(sources)).toBe(true);
      expect(sources.some((s) => s.name === "environment")).toBe(true);
    });

    it("should reload configuration", () => {
      configManager.set("temperature", 0.9);
      expect(configManager.get("temperature")).toBe(0.9);

      configManager.reloadConfig();
      expect(configManager.get("temperature")).toBe(DEFAULT_CONFIG.temperature);
    });
  });

  describe("Mode-specific Configuration", () => {
    beforeEach(() => {
      configManager = new ConfigManager();
    });

    it("should provide intuitive mode configuration", () => {
      const mode_config = configManager.getModeConfig(ProcessingMode.INTUITIVE);

      expect(mode_config.system2_activation_threshold).toBe(0.8); // Higher threshold
      expect(mode_config.temperature).toBeGreaterThan(
        DEFAULT_CONFIG.temperature
      );
      expect(mode_config.max_reasoning_depth).toBeLessThan(
        DEFAULT_CONFIG.max_reasoning_depth
      );
    });

    it("should provide deliberative mode configuration", () => {
      const mode_config = configManager.getModeConfig(
        ProcessingMode.DELIBERATIVE
      );

      expect(mode_config.system2_activation_threshold).toBe(0.2); // Lower threshold
      expect(mode_config.temperature).toBeLessThan(DEFAULT_CONFIG.temperature);
      expect(mode_config.max_reasoning_depth).toBeGreaterThan(
        DEFAULT_CONFIG.max_reasoning_depth
      );
    });

    it("should provide creative mode configuration", () => {
      const mode_config = configManager.getModeConfig(ProcessingMode.CREATIVE);

      expect(mode_config.temperature).toBeGreaterThan(
        DEFAULT_CONFIG.temperature
      );
      expect(mode_config.noise_level).toBeGreaterThan(
        DEFAULT_CONFIG.noise_level
      );
    });

    it("should provide analytical mode configuration", () => {
      const fresh_config_manager = new ConfigManager();
      const base_config = fresh_config_manager.getConfig();
      const mode_config = fresh_config_manager.getModeConfig(
        ProcessingMode.ANALYTICAL
      );

      expect(mode_config.temperature).toBeLessThan(base_config.temperature);
      expect(mode_config.noise_level).toBeLessThan(base_config.noise_level);
      expect(mode_config.system2_activation_threshold).toBe(0.3);
    });

    it("should return base config for balanced mode", () => {
      const fresh_config_manager = new ConfigManager();
      const base_config = fresh_config_manager.getConfig();
      const mode_config = fresh_config_manager.getModeConfig(
        ProcessingMode.BALANCED
      );

      expect(mode_config.temperature).toBe(base_config.temperature);
      expect(mode_config.noise_level).toBe(base_config.noise_level);
    });
  });

  describe("Configuration Import/Export", () => {
    beforeEach(() => {
      configManager = new ConfigManager();
    });

    it("should export configuration to JSON", () => {
      const exported = configManager.exportConfig();
      const parsed = JSON.parse(exported);

      expect(parsed.temperature).toBe(DEFAULT_CONFIG.temperature);
      expect(parsed.enable_emotion).toBe(DEFAULT_CONFIG.enable_emotion);
      expect(parsed.working_memory_capacity).toBe(
        DEFAULT_CONFIG.working_memory_capacity
      );
    });

    it("should import configuration from JSON", () => {
      const import_config = {
        temperature: 0.6,
        enable_emotion: false,
        max_reasoning_depth: 12,
      };

      configManager.importConfig(JSON.stringify(import_config));
      const config = configManager.getConfig();

      expect(config.temperature).toBe(0.6);
      expect(config.enable_emotion).toBe(false);
      expect(config.max_reasoning_depth).toBe(12);
    });

    it("should handle invalid JSON import", () => {
      expect(() => {
        configManager.importConfig("invalid json");
      }).toThrow("Failed to import configuration");
    });
  });

  describe("Configuration Presets", () => {
    beforeEach(() => {
      configManager = new ConfigManager();
    });

    it("should create configuration presets", () => {
      const preset_config = {
        temperature: 0.5,
        enable_emotion: false,
      };

      // Should not throw
      expect(() => {
        configManager.createPreset("test-preset", preset_config);
      }).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty configuration updates", () => {
      configManager = new ConfigManager();

      expect(() => {
        configManager.updateConfig({});
      }).not.toThrow();

      const config = configManager.getConfig();
      expect(config.temperature).toBe(DEFAULT_CONFIG.temperature);
    });

    it("should handle null and undefined values gracefully", () => {
      configManager = new ConfigManager();

      // These should not cause issues
      configManager.addConfigFilePath("");

      expect(() => {
        configManager.reloadConfig();
      }).not.toThrow();
    });

    it("should handle configuration with extra properties", () => {
      const config_with_extra = {
        temperature: 0.8,
        extra_property: "should be ignored",
        another_extra: 123,
      };

      configManager = new ConfigManager(config_with_extra as any);
      const config = configManager.getConfig();

      expect(config.temperature).toBe(0.8);
      // TypeScript allows extra properties, so we just check the valid ones are set
      expect(config.working_memory_capacity).toBe(
        DEFAULT_CONFIG.working_memory_capacity
      );
    });
  });
});
