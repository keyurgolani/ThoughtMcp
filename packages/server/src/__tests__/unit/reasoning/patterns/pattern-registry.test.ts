/**
 * Unit Tests for PatternRegistry
 *
 * Tests pattern loading, validation, domain retrieval, and config merging.
 *
 * Requirements: 1.1, 1.2, 1.6
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPatternRegistry,
  PatternRegistry,
} from "../../../../reasoning/patterns/pattern-registry.js";
import type { PatternConfigFile } from "../../../../reasoning/patterns/types.js";

// ============================================================================
// Test Fixtures
// ==========================================================================

const validDatabaseConfig: PatternConfigFile = {
  version: "1.0.0",
  domain: "database",
  description: "Patterns for database performance issues",
  patterns: [
    {
      id: "db-slow-query",
      name: "Slow Query Detection",
      description: "Detects database performance issues related to slow queries",
      indicators: [
        { type: "exact", value: "slow query", weight: 0.9 },
        { type: "fuzzy", value: "database performance", weight: 0.7 },
      ],
      hypotheses: [
        {
          id: "missing-index",
          statement: "The {{primarySubject}} may be slow due to missing indexes",
          investigationSteps: ["Run EXPLAIN ANALYZE"],
          expectedFindings: ["Sequential scans"],
          relatedHypotheses: [],
          estimatedTime: "15-30 minutes",
          likelihood: 0.7,
        },
      ],
      recommendations: [
        {
          id: "add-index",
          type: "remedial",
          action: "Create indexes on columns",
          tools: ["CREATE INDEX"],
          expectedOutcome: "Improved query performance",
          prerequisites: [],
          priority: 8,
        },
      ],
      severity: "high",
    },
  ],
  testCases: [
    {
      id: "test-slow-query",
      input: "Our database queries are running slow",
      expectedDomain: "database",
      expectedPatternIds: ["db-slow-query"],
      minConfidence: 0.7,
    },
  ],
};

const validApiConfig: PatternConfigFile = {
  version: "1.0.0",
  domain: "api",
  description: "Patterns for API issues",
  patterns: [
    {
      id: "api-rate-limit",
      name: "Rate Limiting Issues",
      description: "Detects API rate limiting problems",
      indicators: [{ type: "exact", value: "rate limit", weight: 0.9 }],
      hypotheses: [
        {
          id: "too-many-requests",
          statement: "The API is being rate limited",
          investigationSteps: ["Check request logs"],
          expectedFindings: ["429 responses"],
          relatedHypotheses: [],
          estimatedTime: "10-20 minutes",
          likelihood: 0.8,
        },
      ],
      recommendations: [
        {
          id: "implement-backoff",
          type: "remedial",
          action: "Implement exponential backoff",
          tools: ["retry library"],
          expectedOutcome: "Reduced rate limit errors",
          prerequisites: [],
          priority: 7,
        },
      ],
      severity: "medium",
    },
  ],
};

const invalidConfig = {
  version: "invalid",
  domain: "",
  description: "",
  patterns: [],
};

// ============================================================================
// Test Setup
// ============================================================================

const TEST_CONFIG_DIR = join(process.cwd(), "tmp", "test-patterns");

function cleanupTestDir(): void {
  if (existsSync(TEST_CONFIG_DIR)) {
    rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
  }
}

function createTestDir(): void {
  cleanupTestDir();
  mkdirSync(TEST_CONFIG_DIR, { recursive: true });
}

function writeTestConfig(filename: string, config: unknown, subdir?: string): void {
  const dir = subdir ? join(TEST_CONFIG_DIR, subdir) : TEST_CONFIG_DIR;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(join(dir, filename), JSON.stringify(config, null, 2), "utf-8");
}

// ============================================================================
// Tests
// ============================================================================

describe("PatternRegistry", () => {
  beforeEach(() => {
    createTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
    vi.restoreAllMocks();
  });

  describe("createPatternRegistry", () => {
    it("should create a new PatternRegistry instance", () => {
      const registry = createPatternRegistry();
      expect(registry).toBeInstanceOf(PatternRegistry);
    });
  });

  describe("loadPatterns", () => {
    it("should load patterns from JSON files in directory", async () => {
      writeTestConfig("database.json", validDatabaseConfig);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      expect(registry.hasPatterns()).toBe(true);
      expect(registry.getDomains()).toContain("database");
    });

    it("should load patterns from subdirectories", async () => {
      writeTestConfig("database.json", validDatabaseConfig, "technical");
      writeTestConfig("api.json", validApiConfig, "technical");

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      expect(registry.getDomains()).toContain("database");
      expect(registry.getDomains()).toContain("api");
      expect(registry.getAllPatterns()).toHaveLength(2);
    });

    it("should skip invalid JSON files with syntax errors", async () => {
      writeTestConfig("database.json", validDatabaseConfig);
      writeFileSync(join(TEST_CONFIG_DIR, "invalid.json"), "{ invalid json }", "utf-8");

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      // Should still load valid config
      expect(registry.hasPatterns()).toBe(true);
      expect(registry.getDomains()).toContain("database");
    });

    it("should skip files that fail schema validation", async () => {
      writeTestConfig("database.json", validDatabaseConfig);
      writeTestConfig("invalid.json", invalidConfig);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      // Should only load valid config
      expect(registry.getDomains()).toContain("database");
      expect(registry.getAllPatterns()).toHaveLength(1);
    });

    it("should bootstrap empty config when directory does not exist", async () => {
      const nonExistentDir = join(TEST_CONFIG_DIR, "non-existent");

      const registry = new PatternRegistry();
      await registry.loadPatterns(nonExistentDir);

      // Directory should be created with example config
      expect(existsSync(nonExistentDir)).toBe(true);
      expect(existsSync(join(nonExistentDir, "example.json"))).toBe(true);
    });

    it("should handle empty directory gracefully", async () => {
      // Directory exists but is empty
      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      expect(registry.hasPatterns()).toBe(false);
      expect(registry.getDomains()).toHaveLength(0);
    });

    it("should clear existing patterns on reload", async () => {
      writeTestConfig("database.json", validDatabaseConfig);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);
      expect(registry.getDomains()).toContain("database");

      // Remove the file and reload
      rmSync(join(TEST_CONFIG_DIR, "database.json"));
      await registry.loadPatterns(TEST_CONFIG_DIR);

      expect(registry.hasPatterns()).toBe(false);
    });
  });

  describe("getPatternsByDomain", () => {
    it("should return patterns for a specific domain", async () => {
      writeTestConfig("database.json", validDatabaseConfig);
      writeTestConfig("api.json", validApiConfig);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      const dbPatterns = registry.getPatternsByDomain("database");
      expect(dbPatterns).toHaveLength(1);
      expect(dbPatterns[0].id).toBe("db-slow-query");

      const apiPatterns = registry.getPatternsByDomain("api");
      expect(apiPatterns).toHaveLength(1);
      expect(apiPatterns[0].id).toBe("api-rate-limit");
    });

    it("should return empty array for unknown domain", async () => {
      writeTestConfig("database.json", validDatabaseConfig);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      const patterns = registry.getPatternsByDomain("unknown");
      expect(patterns).toEqual([]);
    });
  });

  describe("getDomains", () => {
    it("should return all registered domains", async () => {
      writeTestConfig("database.json", validDatabaseConfig);
      writeTestConfig("api.json", validApiConfig);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      const domains = registry.getDomains();
      expect(domains).toHaveLength(2);
      expect(domains).toContain("database");
      expect(domains).toContain("api");
    });

    it("should return empty array when no patterns loaded", () => {
      const registry = new PatternRegistry();
      expect(registry.getDomains()).toEqual([]);
    });
  });

  describe("getPatternById", () => {
    it("should return pattern by ID", async () => {
      writeTestConfig("database.json", validDatabaseConfig);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      const pattern = registry.getPatternById("db-slow-query");
      expect(pattern).toBeDefined();
      expect(pattern?.name).toBe("Slow Query Detection");
    });

    it("should return undefined for unknown pattern ID", async () => {
      writeTestConfig("database.json", validDatabaseConfig);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      const pattern = registry.getPatternById("unknown-pattern");
      expect(pattern).toBeUndefined();
    });
  });

  describe("validateConfig", () => {
    it("should return valid result for valid config", () => {
      const registry = new PatternRegistry();
      const result = registry.validateConfig(validDatabaseConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return errors for invalid config", () => {
      const registry = new PatternRegistry();
      const result = registry.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return warnings for config without test cases", () => {
      const configWithoutTests = { ...validDatabaseConfig };
      delete (configWithoutTests as Record<string, unknown>).testCases;

      const registry = new PatternRegistry();
      const result = registry.validateConfig(configWithoutTests);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.code === "NO_TEST_CASES")).toBe(true);
    });

    it("should return warnings for patterns with single indicator", () => {
      const configWithSingleIndicator: PatternConfigFile = {
        ...validDatabaseConfig,
        patterns: [
          {
            ...validDatabaseConfig.patterns[0],
            indicators: [{ type: "exact", value: "test", weight: 0.5 }],
          },
        ],
      };

      const registry = new PatternRegistry();
      const result = registry.validateConfig(configWithSingleIndicator);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.code === "FEW_INDICATORS")).toBe(true);
    });
  });

  describe("config merge behavior", () => {
    it("should override patterns with duplicate IDs from later files", async () => {
      // First config with pattern
      const config1: PatternConfigFile = {
        ...validDatabaseConfig,
        patterns: [
          {
            ...validDatabaseConfig.patterns[0],
            name: "Original Name",
          },
        ],
      };

      // Second config with same pattern ID but different name
      const config2: PatternConfigFile = {
        ...validDatabaseConfig,
        patterns: [
          {
            ...validDatabaseConfig.patterns[0],
            name: "Override Name",
          },
        ],
      };

      // Write files - alphabetically, a.json loads before b.json
      writeTestConfig("a-database.json", config1);
      writeTestConfig("b-database.json", config2);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      const pattern = registry.getPatternById("db-slow-query");
      expect(pattern?.name).toBe("Override Name");
    });

    it("should log warning when pattern is overridden", async () => {
      // Import Logger to spy on it
      const { Logger } = await import("../../../../utils/logger.js");
      const warnSpy = vi.spyOn(Logger, "warn");

      // First config with pattern
      const config1: PatternConfigFile = {
        ...validDatabaseConfig,
        patterns: [
          {
            ...validDatabaseConfig.patterns[0],
            name: "Original Name",
          },
        ],
      };

      // Second config with same pattern ID
      const config2: PatternConfigFile = {
        ...validDatabaseConfig,
        patterns: [
          {
            ...validDatabaseConfig.patterns[0],
            name: "Override Name",
          },
        ],
      };

      writeTestConfig("a-database.json", config1);
      writeTestConfig("b-database.json", config2);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      // Verify warning was logged about override
      expect(warnSpy).toHaveBeenCalled();
      const warnCalls = warnSpy.mock.calls.map((call) => String(call[0]));
      expect(warnCalls.some((msg) => msg.includes("overrides existing pattern"))).toBe(true);

      warnSpy.mockRestore();
    });

    it("should handle pattern moving between domains", async () => {
      // First config in database domain
      const config1: PatternConfigFile = {
        ...validDatabaseConfig,
        domain: "database",
        patterns: [
          {
            ...validDatabaseConfig.patterns[0],
            id: "shared-pattern",
            name: "Original in Database",
          },
        ],
      };

      // Second config moves same pattern ID to api domain
      const config2: PatternConfigFile = {
        ...validApiConfig,
        domain: "api",
        patterns: [
          {
            ...validApiConfig.patterns[0],
            id: "shared-pattern",
            name: "Moved to API",
          },
        ],
      };

      writeTestConfig("a-database.json", config1);
      writeTestConfig("b-api.json", config2);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      // Pattern should be in api domain, not database
      const apiPatterns = registry.getPatternsByDomain("api");
      const dbPatterns = registry.getPatternsByDomain("database");

      expect(apiPatterns.some((p) => p.id === "shared-pattern")).toBe(true);
      expect(dbPatterns.some((p) => p.id === "shared-pattern")).toBe(false);

      // Pattern should have the new name
      const pattern = registry.getPatternById("shared-pattern");
      expect(pattern?.name).toBe("Moved to API");
    });

    it("should maintain correct pattern count after merges", async () => {
      // Config with 2 patterns
      const config1: PatternConfigFile = {
        ...validDatabaseConfig,
        patterns: [
          {
            ...validDatabaseConfig.patterns[0],
            id: "pattern-1",
            name: "Pattern 1",
          },
          {
            ...validDatabaseConfig.patterns[0],
            id: "pattern-2",
            name: "Pattern 2",
          },
        ],
      };

      // Config that overrides one pattern
      const config2: PatternConfigFile = {
        ...validDatabaseConfig,
        patterns: [
          {
            ...validDatabaseConfig.patterns[0],
            id: "pattern-1",
            name: "Pattern 1 Override",
          },
        ],
      };

      writeTestConfig("a-database.json", config1);
      writeTestConfig("b-database.json", config2);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      // Should have 2 patterns total (not 3)
      expect(registry.getAllPatterns()).toHaveLength(2);

      // Domain should have 2 patterns
      const dbPatterns = registry.getPatternsByDomain("database");
      expect(dbPatterns).toHaveLength(2);

      // Verify the override happened
      const pattern1 = registry.getPatternById("pattern-1");
      expect(pattern1?.name).toBe("Pattern 1 Override");
    });

    it("should handle multiple files overriding same pattern", async () => {
      // Three configs all with same pattern ID
      const config1: PatternConfigFile = {
        ...validDatabaseConfig,
        patterns: [
          {
            ...validDatabaseConfig.patterns[0],
            id: "common-pattern",
            name: "First Version",
          },
        ],
      };

      const config2: PatternConfigFile = {
        ...validDatabaseConfig,
        patterns: [
          {
            ...validDatabaseConfig.patterns[0],
            id: "common-pattern",
            name: "Second Version",
          },
        ],
      };

      const config3: PatternConfigFile = {
        ...validDatabaseConfig,
        patterns: [
          {
            ...validDatabaseConfig.patterns[0],
            id: "common-pattern",
            name: "Third Version",
          },
        ],
      };

      writeTestConfig("a-first.json", config1);
      writeTestConfig("b-second.json", config2);
      writeTestConfig("c-third.json", config3);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      // Should have only 1 pattern (the last one)
      expect(registry.getAllPatterns()).toHaveLength(1);

      const pattern = registry.getPatternById("common-pattern");
      expect(pattern?.name).toBe("Third Version");
    });
  });

  describe("getStats", () => {
    it("should return correct statistics", async () => {
      writeTestConfig("database.json", validDatabaseConfig);
      writeTestConfig("api.json", validApiConfig);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);

      const stats = registry.getStats();
      expect(stats.totalPatterns).toBe(2);
      expect(stats.totalDomains).toBe(2);
      expect(stats.patternsPerDomain["database"]).toBe(1);
      expect(stats.patternsPerDomain["api"]).toBe(1);
      expect(stats.lastReloadAt).toBeInstanceOf(Date);
    });

    it("should return zero stats when no patterns loaded", () => {
      const registry = new PatternRegistry();
      const stats = registry.getStats();

      expect(stats.totalPatterns).toBe(0);
      expect(stats.totalDomains).toBe(0);
      expect(stats.lastReloadAt).toBeNull();
    });
  });

  describe("reload", () => {
    it("should reload patterns from config directory", async () => {
      writeTestConfig("database.json", validDatabaseConfig);

      const registry = new PatternRegistry();
      await registry.loadPatterns(TEST_CONFIG_DIR);
      expect(registry.getAllPatterns()).toHaveLength(1);

      // Add another config file
      writeTestConfig("api.json", validApiConfig);
      await registry.reload();

      expect(registry.getAllPatterns()).toHaveLength(2);
    });

    it("should throw error if no config directory set", async () => {
      const registry = new PatternRegistry();
      await expect(registry.reload()).rejects.toThrow("Cannot reload: no config directory");
    });
  });

  describe("bootstrapEmptyConfig", () => {
    it("should create directory and example config", async () => {
      const newDir = join(TEST_CONFIG_DIR, "new-config");

      const registry = new PatternRegistry();
      await registry.bootstrapEmptyConfig(newDir);

      expect(existsSync(newDir)).toBe(true);
      expect(existsSync(join(newDir, "example.json"))).toBe(true);
    });

    it("should create README.md with schema documentation", async () => {
      const newDir = join(TEST_CONFIG_DIR, "new-config-readme");

      const registry = new PatternRegistry();
      await registry.bootstrapEmptyConfig(newDir);

      const readmePath = join(newDir, "README.md");
      expect(existsSync(readmePath)).toBe(true);

      // Verify README contains schema documentation
      const { readFileSync } = await import("fs");
      const readmeContent = readFileSync(readmePath, "utf-8");
      expect(readmeContent).toContain("# Reasoning Pattern Configuration Schema");
      expect(readmeContent).toContain("## File Structure");
      expect(readmeContent).toContain("## Pattern Definition");
      expect(readmeContent).toContain("## Indicator Definition");
      expect(readmeContent).toContain("## Hypothesis Template");
      expect(readmeContent).toContain("## Recommendation Template");
      expect(readmeContent).toContain("## Test Cases");
    });

    it("should log warning about empty pattern configuration", async () => {
      const { Logger } = await import("../../../../utils/logger.js");
      const warnSpy = vi.spyOn(Logger, "warn");

      const newDir = join(TEST_CONFIG_DIR, "new-config-warn");

      const registry = new PatternRegistry();
      await registry.bootstrapEmptyConfig(newDir);

      // Verify warning was logged (Requirement 8.6)
      expect(warnSpy).toHaveBeenCalled();
      const warnCalls = warnSpy.mock.calls.map((call) => String(call[0]));
      expect(
        warnCalls.some((msg) => msg.includes("Operating with empty pattern configuration"))
      ).toBe(true);

      warnSpy.mockRestore();
    });
  });
});
