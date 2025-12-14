/**
 * Sector Configuration Tests
 *
 * Tests for sector-specific decay configuration management.
 * Validates loading, updating, and validating decay multipliers for all memory sectors.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { beforeEach, describe, expect, it } from "vitest";
import { MemorySector } from "../../../embeddings/types";
import { SectorConfigManager } from "../../../temporal/sector-config";
import type { DecayConfig } from "../../../temporal/types";

describe("SectorConfigManager", () => {
  let configManager: SectorConfigManager;

  beforeEach(() => {
    configManager = new SectorConfigManager();
  });

  describe("Default Configuration", () => {
    it("should load default configurations for all sectors", () => {
      const config = configManager.getConfig();

      // Verify all sectors have multipliers
      expect(config.sectorMultipliers[MemorySector.Episodic]).toBe(1.5);
      expect(config.sectorMultipliers[MemorySector.Semantic]).toBe(0.5);
      expect(config.sectorMultipliers[MemorySector.Procedural]).toBe(0.7);
      expect(config.sectorMultipliers[MemorySector.Emotional]).toBe(1.2);
      expect(config.sectorMultipliers[MemorySector.Reflective]).toBe(0.8);

      // Verify base configuration values
      expect(config.baseLambda).toBe(0.02);
      expect(config.reinforcementBoost).toBe(0.3);
      expect(config.minimumStrength).toBe(0.1);
      expect(config.pruningThreshold).toBe(0.2);
    });

    it("should have valid multiplier ranges for all sectors", () => {
      const config = configManager.getConfig();

      // All multipliers should be positive
      Object.values(config.sectorMultipliers).forEach((multiplier) => {
        expect(multiplier).toBeGreaterThan(0);
        expect(multiplier).toBeLessThanOrEqual(2.0); // Reasonable upper bound
      });
    });

    it("should reflect sector decay characteristics", () => {
      // Episodic memories decay faster (higher multiplier)
      // Semantic memories decay slower (lower multiplier)
      const config = configManager.getConfig();

      expect(config.sectorMultipliers[MemorySector.Episodic]).toBeGreaterThan(
        config.sectorMultipliers[MemorySector.Semantic]
      );
      expect(config.sectorMultipliers[MemorySector.Emotional]).toBeGreaterThan(
        config.sectorMultipliers[MemorySector.Semantic]
      );
    });
  });

  describe("Loading Sector-Specific Decay Multipliers", () => {
    it("should load sector multipliers from configuration", () => {
      const config = configManager.getConfig();

      // Should be able to retrieve multiplier for each sector
      expect(config.sectorMultipliers[MemorySector.Episodic]).toBeDefined();
      expect(config.sectorMultipliers[MemorySector.Semantic]).toBeDefined();
      expect(config.sectorMultipliers[MemorySector.Procedural]).toBeDefined();
      expect(config.sectorMultipliers[MemorySector.Emotional]).toBeDefined();
      expect(config.sectorMultipliers[MemorySector.Reflective]).toBeDefined();
    });

    it("should calculate effective decay rate for each sector", () => {
      // Effective decay rate = baseLambda * sectorMultiplier
      const episodicRate = configManager.getEffectiveDecayRate(MemorySector.Episodic);
      const semanticRate = configManager.getEffectiveDecayRate(MemorySector.Semantic);

      expect(episodicRate).toBe(0.03); // 0.02 * 1.5
      expect(semanticRate).toBe(0.01); // 0.02 * 0.5
      expect(episodicRate).toBeGreaterThan(semanticRate);
    });

    it("should support custom multipliers per sector", () => {
      const customConfig: DecayConfig = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 2.0, // Custom faster decay
          [MemorySector.Semantic]: 0.3, // Custom slower decay
          [MemorySector.Procedural]: 0.9,
          [MemorySector.Emotional]: 1.8,
          [MemorySector.Reflective]: 0.6,
        },
        reinforcementBoost: 0.3,
        minimumStrength: 0.1,
        pruningThreshold: 0.2,
      };

      const customManager = new SectorConfigManager(customConfig);
      const config = customManager.getConfig();

      expect(config.sectorMultipliers[MemorySector.Episodic]).toBe(2.0);
      expect(config.sectorMultipliers[MemorySector.Semantic]).toBe(0.3);
    });
  });

  describe("Updating Sector Configurations", () => {
    it("should update individual sector multipliers", () => {
      // Update episodic multiplier
      configManager.updateConfig({
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.8,
        },
      });

      const config = configManager.getConfig();
      expect(config.sectorMultipliers[MemorySector.Episodic]).toBe(1.8);

      // Other sectors should remain unchanged
      expect(config.sectorMultipliers[MemorySector.Semantic]).toBe(0.5);
      expect(config.sectorMultipliers[MemorySector.Procedural]).toBe(0.7);
    });

    it("should update base lambda", () => {
      configManager.updateConfig({ baseLambda: 0.03 });
      const config = configManager.getConfig();
      expect(config.baseLambda).toBe(0.03);
    });

    it("should update reinforcement boost", () => {
      configManager.updateConfig({ reinforcementBoost: 0.4 });
      const config = configManager.getConfig();
      expect(config.reinforcementBoost).toBe(0.4);
    });

    it("should update minimum strength floor", () => {
      configManager.updateConfig({ minimumStrength: 0.15, pruningThreshold: 0.25 });
      const config = configManager.getConfig();
      expect(config.minimumStrength).toBe(0.15);
    });

    it("should update pruning threshold", () => {
      configManager.updateConfig({ pruningThreshold: 0.25 });
      const config = configManager.getConfig();
      expect(config.pruningThreshold).toBe(0.25);
    });

    it("should update multiple sectors at once", () => {
      // Update multiple sectors
      configManager.updateConfig({
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.6,
          [MemorySector.Emotional]: 1.3,
        },
      });

      const config = configManager.getConfig();
      expect(config.sectorMultipliers[MemorySector.Episodic]).toBe(1.6);
      expect(config.sectorMultipliers[MemorySector.Emotional]).toBe(1.3);
      expect(config.sectorMultipliers[MemorySector.Semantic]).toBe(0.5); // Unchanged
    });

    it("should reject invalid updates", () => {
      // Try to update with negative base lambda
      expect(() => {
        configManager.updateConfig({ baseLambda: -0.01 });
      }).toThrow("Invalid configuration update");

      // Try to update with invalid sector multiplier
      expect(() => {
        configManager.updateConfig({
          sectorMultipliers: {
            [MemorySector.Episodic]: -1.0,
          },
        });
      }).toThrow("Invalid configuration update");

      // Try to update with pruning threshold less than minimum strength
      expect(() => {
        configManager.updateConfig({
          minimumStrength: 0.3,
          pruningThreshold: 0.1,
        });
      }).toThrow("Invalid configuration update");
    });
  });

  describe("Configuration Validation", () => {
    it("should reject negative base lambda", () => {
      const invalidConfig = {
        baseLambda: -0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.5,
          [MemorySector.Semantic]: 0.5,
          [MemorySector.Procedural]: 0.7,
          [MemorySector.Emotional]: 1.2,
          [MemorySector.Reflective]: 0.8,
        },
        reinforcementBoost: 0.3,
        minimumStrength: 0.1,
        pruningThreshold: 0.2,
      };

      expect(() => new SectorConfigManager(invalidConfig)).toThrow();
      expect(configManager.validateConfig(invalidConfig)).toBe(false);
    });

    it("should reject negative sector multipliers", () => {
      const invalidConfig = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: -1.5,
          [MemorySector.Semantic]: 0.5,
          [MemorySector.Procedural]: 0.7,
          [MemorySector.Emotional]: 1.2,
          [MemorySector.Reflective]: 0.8,
        },
        reinforcementBoost: 0.3,
        minimumStrength: 0.1,
        pruningThreshold: 0.2,
      };

      expect(() => new SectorConfigManager(invalidConfig)).toThrow();
      expect(configManager.validateConfig(invalidConfig)).toBe(false);
    });

    it("should reject negative reinforcement boost", () => {
      const invalidConfig = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.5,
          [MemorySector.Semantic]: 0.5,
          [MemorySector.Procedural]: 0.7,
          [MemorySector.Emotional]: 1.2,
          [MemorySector.Reflective]: 0.8,
        },
        reinforcementBoost: -0.3,
        minimumStrength: 0.1,
        pruningThreshold: 0.2,
      };

      expect(() => new SectorConfigManager(invalidConfig)).toThrow();
      expect(configManager.validateConfig(invalidConfig)).toBe(false);
    });

    it("should reject invalid minimum strength (outside 0-1 range)", () => {
      const invalidConfig1 = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.5,
          [MemorySector.Semantic]: 0.5,
          [MemorySector.Procedural]: 0.7,
          [MemorySector.Emotional]: 1.2,
          [MemorySector.Reflective]: 0.8,
        },
        reinforcementBoost: 0.3,
        minimumStrength: -0.1,
        pruningThreshold: 0.2,
      };

      const invalidConfig2 = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.5,
          [MemorySector.Semantic]: 0.5,
          [MemorySector.Procedural]: 0.7,
          [MemorySector.Emotional]: 1.2,
          [MemorySector.Reflective]: 0.8,
        },
        reinforcementBoost: 0.3,
        minimumStrength: 1.5,
        pruningThreshold: 0.2,
      };

      expect(() => new SectorConfigManager(invalidConfig1)).toThrow();
      expect(() => new SectorConfigManager(invalidConfig2)).toThrow();
      expect(configManager.validateConfig(invalidConfig1)).toBe(false);
      expect(configManager.validateConfig(invalidConfig2)).toBe(false);
    });

    it("should reject invalid pruning threshold (outside 0-1 range)", () => {
      const invalidConfig1 = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.5,
          [MemorySector.Semantic]: 0.5,
          [MemorySector.Procedural]: 0.7,
          [MemorySector.Emotional]: 1.2,
          [MemorySector.Reflective]: 0.8,
        },
        reinforcementBoost: 0.3,
        minimumStrength: 0.1,
        pruningThreshold: -0.2,
      };

      const invalidConfig2 = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.5,
          [MemorySector.Semantic]: 0.5,
          [MemorySector.Procedural]: 0.7,
          [MemorySector.Emotional]: 1.2,
          [MemorySector.Reflective]: 0.8,
        },
        reinforcementBoost: 0.3,
        minimumStrength: 0.1,
        pruningThreshold: 1.5,
      };

      expect(() => new SectorConfigManager(invalidConfig1)).toThrow();
      expect(() => new SectorConfigManager(invalidConfig2)).toThrow();
      expect(configManager.validateConfig(invalidConfig1)).toBe(false);
      expect(configManager.validateConfig(invalidConfig2)).toBe(false);
    });

    it("should reject missing sector multipliers", () => {
      const incompleteConfig = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.5,
          [MemorySector.Semantic]: 0.5,
          // Missing Procedural, Emotional, Reflective
        } as Record<MemorySector, number>,
        reinforcementBoost: 0.3,
        minimumStrength: 0.1,
        pruningThreshold: 0.2,
      };

      expect(() => new SectorConfigManager(incompleteConfig)).toThrow();
      expect(configManager.validateConfig(incompleteConfig)).toBe(false);
    });

    it("should reject pruning threshold less than minimum strength", () => {
      const invalidConfig = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.5,
          [MemorySector.Semantic]: 0.5,
          [MemorySector.Procedural]: 0.7,
          [MemorySector.Emotional]: 1.2,
          [MemorySector.Reflective]: 0.8,
        },
        reinforcementBoost: 0.3,
        minimumStrength: 0.3,
        pruningThreshold: 0.1, // Less than minimumStrength
      };

      expect(() => new SectorConfigManager(invalidConfig)).toThrow();
      expect(configManager.validateConfig(invalidConfig)).toBe(false);
    });

    it("should accept valid configuration", () => {
      const validConfig: DecayConfig = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.5,
          [MemorySector.Semantic]: 0.5,
          [MemorySector.Procedural]: 0.7,
          [MemorySector.Emotional]: 1.2,
          [MemorySector.Reflective]: 0.8,
        },
        reinforcementBoost: 0.3,
        minimumStrength: 0.1,
        pruningThreshold: 0.2,
      };

      expect(() => new SectorConfigManager(validConfig)).not.toThrow();
      expect(configManager.validateConfig(validConfig)).toBe(true);
    });
  });

  describe("Reset to Defaults", () => {
    it("should reset configuration to defaults", () => {
      // Update configuration
      configManager.updateConfig({
        baseLambda: 0.05,
        reinforcementBoost: 0.5,
      });

      // Verify it changed
      let config = configManager.getConfig();
      expect(config.baseLambda).toBe(0.05);
      expect(config.reinforcementBoost).toBe(0.5);

      // Reset to defaults
      configManager.resetToDefaults();

      // Verify it's back to defaults
      config = configManager.getConfig();
      expect(config.baseLambda).toBe(0.02);
      expect(config.reinforcementBoost).toBe(0.3);
      expect(config.minimumStrength).toBe(0.1);
      expect(config.pruningThreshold).toBe(0.2);
    });
  });

  describe("Configuration Persistence", () => {
    it("should serialize configuration to JSON", () => {
      const config: DecayConfig = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.5,
          [MemorySector.Semantic]: 0.5,
          [MemorySector.Procedural]: 0.7,
          [MemorySector.Emotional]: 1.2,
          [MemorySector.Reflective]: 0.8,
        },
        reinforcementBoost: 0.3,
        minimumStrength: 0.1,
        pruningThreshold: 0.2,
      };

      const json = JSON.stringify(config);
      expect(json).toBeDefined();
      expect(json.length).toBeGreaterThan(0);

      const parsed = JSON.parse(json);
      expect(parsed.baseLambda).toBe(config.baseLambda);
      expect(parsed.sectorMultipliers[MemorySector.Episodic]).toBe(1.5);
    });

    it("should deserialize configuration from JSON", () => {
      const json = JSON.stringify({
        baseLambda: 0.02,
        sectorMultipliers: {
          episodic: 1.5,
          semantic: 0.5,
          procedural: 0.7,
          emotional: 1.2,
          reflective: 0.8,
        },
        reinforcementBoost: 0.3,
        minimumStrength: 0.1,
        pruningThreshold: 0.2,
      });

      const config: DecayConfig = JSON.parse(json);
      expect(config.baseLambda).toBe(0.02);
      expect(config.sectorMultipliers[MemorySector.Episodic]).toBe(1.5);
      expect(config.reinforcementBoost).toBe(0.3);
    });
  });

  describe("Edge Cases", () => {
    it("should throw error when getting effective decay rate for unconfigured sector", () => {
      // Create a valid config first
      const validConfig = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.5,
          [MemorySector.Semantic]: 0.5,
          [MemorySector.Procedural]: 0.7,
          [MemorySector.Emotional]: 1.2,
          [MemorySector.Reflective]: 0.8,
        },
        reinforcementBoost: 0.3,
        minimumStrength: 0.1,
        pruningThreshold: 0.2,
      };

      const manager = new SectorConfigManager(validConfig);

      // Directly manipulate internal state to simulate corrupted configuration
      // This bypasses validation to test the runtime error path
      (manager as any).config.sectorMultipliers[MemorySector.Episodic] = undefined;

      // Should throw error when trying to get effective decay rate for undefined multiplier
      expect(() => manager.getEffectiveDecayRate(MemorySector.Episodic)).toThrow(
        "No multiplier configured for sector: episodic"
      );
    });

    it("should detect missing sector multipliers during validation", () => {
      // Create config with one sector having undefined multiplier
      const configWithUndefined = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 1.5,
          [MemorySector.Semantic]: 0.5,
          [MemorySector.Procedural]: 0.7,
          [MemorySector.Emotional]: 1.2,
          [MemorySector.Reflective]: undefined as any,
        },
        reinforcementBoost: 0.3,
        minimumStrength: 0.1,
        pruningThreshold: 0.2,
      };

      expect(configManager.validateConfig(configWithUndefined)).toBe(false);
    });

    it("should handle zero multiplier as invalid", () => {
      // Zero multiplier should be rejected (must be positive)
      const configWithZero = {
        baseLambda: 0.02,
        sectorMultipliers: {
          [MemorySector.Episodic]: 0, // Zero is invalid
          [MemorySector.Semantic]: 0.5,
          [MemorySector.Procedural]: 0.7,
          [MemorySector.Emotional]: 1.2,
          [MemorySector.Reflective]: 0.8,
        },
        reinforcementBoost: 0.3,
        minimumStrength: 0.1,
        pruningThreshold: 0.2,
      };

      expect(configManager.validateConfig(configWithZero)).toBe(false);
    });
  });
});
