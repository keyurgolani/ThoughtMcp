/**
 * Brain Directory Validation Tests
 *
 * Tests for validation of brain directory configuration in CognitiveConfig
 * and related validation functions.
 */

import { describe, expect, it } from "vitest";
import { ProcessingMode } from "../../types/core.js";
import {
  createDefaultCognitiveConfig,
  createMinimalCognitiveConfig,
} from "../../utils/factories.js";
import { validateCognitiveConfig } from "../../utils/validation.js";

describe("Brain Directory Validation", () => {
  describe("validateCognitiveConfig brain_dir validation", () => {
    it("should validate valid brain directory paths", () => {
      const validPaths = [
        "~/.brain",
        "./brain",
        "/absolute/path/to/brain",
        "~/custom-brain",
        "~/.brain/web-dev",
        "../relative/brain",
        "brain-dir",
        "/tmp/test-brain",
        "C:\\Windows\\Brain", // Windows path
        "~/brain_with_underscores",
        "~/brain-with-hyphens",
        "~/brain.with.dots",
      ];

      for (const brainDir of validPaths) {
        const config = createDefaultCognitiveConfig({ brain_dir: brainDir });

        expect(() => validateCognitiveConfig(config)).not.toThrow();
      }
    });

    it("should reject empty brain directory", () => {
      const config = createDefaultCognitiveConfig({ brain_dir: "" });

      expect(() => validateCognitiveConfig(config)).toThrow(
        "CognitiveConfig brain_dir must be a non-empty string"
      );
    });

    it("should reject whitespace-only brain directory", () => {
      const config = createDefaultCognitiveConfig({ brain_dir: "   " });

      expect(() => validateCognitiveConfig(config)).toThrow(
        "CognitiveConfig brain_dir must be a non-empty string"
      );
    });

    it("should reject null brain directory", () => {
      const config = createDefaultCognitiveConfig({ brain_dir: null as any });

      expect(() => validateCognitiveConfig(config)).toThrow(
        "CognitiveConfig brain_dir must be a non-empty string"
      );
    });

    it("should reject undefined brain directory", () => {
      const config = createDefaultCognitiveConfig({
        brain_dir: undefined as any,
      });

      expect(() => validateCognitiveConfig(config)).toThrow(
        "CognitiveConfig brain_dir must be a non-empty string"
      );
    });

    it("should reject non-string brain directory", () => {
      const invalidValues = [123, true, false, {}, [], Symbol("brain")];

      for (const invalidValue of invalidValues) {
        const config = createDefaultCognitiveConfig({
          brain_dir: invalidValue as any,
        });

        expect(() => validateCognitiveConfig(config)).toThrow(
          "CognitiveConfig brain_dir must be a non-empty string"
        );
      }
    });

    it("should validate brain_dir in complete configuration object", () => {
      const config = {
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

      expect(() => validateCognitiveConfig(config)).not.toThrow();
    });

    it("should fail validation when brain_dir is missing from configuration", () => {
      const configWithoutBrainDir = {
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
        // brain_dir is missing
      };

      expect(() =>
        validateCognitiveConfig(configWithoutBrainDir as any)
      ).toThrow();
    });
  });

  describe("factory function validation", () => {
    it("should create default config with valid brain_dir", () => {
      const config = createDefaultCognitiveConfig();

      expect(config.brain_dir).toBeDefined();
      expect(typeof config.brain_dir).toBe("string");
      expect(config.brain_dir.length).toBeGreaterThan(0);
      expect(() => validateCognitiveConfig(config)).not.toThrow();
    });

    it("should create minimal config with valid brain_dir", () => {
      const config = createMinimalCognitiveConfig();

      expect(config.brain_dir).toBeDefined();
      expect(typeof config.brain_dir).toBe("string");
      expect(config.brain_dir.length).toBeGreaterThan(0);
      expect(() => validateCognitiveConfig(config)).not.toThrow();
    });

    it("should allow overriding brain_dir in factory functions", () => {
      const customBrainDir = "/custom/brain/path";
      const config = createDefaultCognitiveConfig({
        brain_dir: customBrainDir,
      });

      expect(config.brain_dir).toBe(customBrainDir);
      expect(() => validateCognitiveConfig(config)).not.toThrow();
    });

    it("should validate overridden brain_dir in factory functions", () => {
      expect(() => {
        createDefaultCognitiveConfig({ brain_dir: "" });
      }).not.toThrow(); // Factory doesn't validate, but validation function should catch it

      const config = createDefaultCognitiveConfig({ brain_dir: "" });
      expect(() => validateCognitiveConfig(config)).toThrow();
    });
  });

  describe("edge cases and special characters", () => {
    it("should validate paths with special characters", () => {
      const specialPaths = [
        "~/brain@domain.com",
        "~/brain#hashtag",
        "~/brain$variable",
        "~/brain%encoded",
        "~/brain&ampersand",
        "~/brain+plus",
        "~/brain=equals",
        "~/brain[brackets]",
        "~/brain{braces}",
        "~/brain(parentheses)",
      ];

      for (const brainDir of specialPaths) {
        const config = createDefaultCognitiveConfig({ brain_dir: brainDir });
        expect(() => validateCognitiveConfig(config)).not.toThrow();
      }
    });

    it("should validate very long paths", () => {
      const longPath =
        "~/" + "very-long-brain-directory-name-".repeat(10) + "brain";
      const config = createDefaultCognitiveConfig({ brain_dir: longPath });

      expect(() => validateCognitiveConfig(config)).not.toThrow();
    });

    it("should validate paths with unicode characters", () => {
      const unicodePaths = [
        "~/brain-🧠",
        "~/мозг", // Russian
        "~/脳", // Japanese
        "~/cérebro", // Portuguese with accent
        "~/gehirn-ß", // German with ß
      ];

      for (const brainDir of unicodePaths) {
        const config = createDefaultCognitiveConfig({ brain_dir: brainDir });
        expect(() => validateCognitiveConfig(config)).not.toThrow();
      }
    });

    it("should validate network paths", () => {
      const networkPaths = [
        "//server/share/brain",
        "\\\\server\\share\\brain", // Windows UNC
        "smb://server/share/brain",
        "nfs://server/path/brain",
      ];

      for (const brainDir of networkPaths) {
        const config = createDefaultCognitiveConfig({ brain_dir: brainDir });
        expect(() => validateCognitiveConfig(config)).not.toThrow();
      }
    });
  });

  describe("validation error messages", () => {
    it("should provide specific error message for empty brain_dir", () => {
      const config = createDefaultCognitiveConfig({ brain_dir: "" });

      expect(() => validateCognitiveConfig(config)).toThrow(
        "CognitiveConfig brain_dir must be a non-empty string"
      );
    });

    it("should provide specific error message for non-string brain_dir", () => {
      const config = createDefaultCognitiveConfig({ brain_dir: 123 as any });

      expect(() => validateCognitiveConfig(config)).toThrow(
        "CognitiveConfig brain_dir must be a non-empty string"
      );
    });

    it("should include field path in error message", () => {
      const config = createDefaultCognitiveConfig({ brain_dir: null as any });

      try {
        validateCognitiveConfig(config);
        expect.fail("Should have thrown validation error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("brain_dir");
      }
    });
  });
});
