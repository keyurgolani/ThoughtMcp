/**
 * Unit Tests for PatternMatcher
 *
 * Tests pattern matching, scoring, and indicator handling.
 *
 * Requirements: 3.1, 3.6
 */

import { describe, expect, it, vi } from "vitest";

import type { KeyTerms } from "../../../../reasoning/key-term-extractor.js";
import {
  createPatternMatcher,
  PatternMatcher,
} from "../../../../reasoning/patterns/pattern-matcher.js";
import type { PatternRegistry } from "../../../../reasoning/patterns/pattern-registry.js";
import type { DomainPattern } from "../../../../reasoning/patterns/types.js";

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockKeyTerms = (overrides: Partial<KeyTerms> = {}): KeyTerms => ({
  terms: [],
  domainTerms: [],
  actionVerbs: [],
  nounPhrases: [],
  primarySubject: null,
  ...overrides,
});

const createMockPattern = (overrides: Partial<DomainPattern> = {}): DomainPattern => ({
  id: "test-pattern",
  name: "Test Pattern",
  description: "A test pattern",
  indicators: [{ type: "exact", value: "test phrase", weight: 0.8 }],
  hypotheses: [
    {
      id: "test-hypothesis",
      statement: "Test hypothesis for {{primarySubject}}",
      investigationSteps: ["Step 1"],
      expectedFindings: ["Finding 1"],
      relatedHypotheses: [],
      estimatedTime: "10 minutes",
      likelihood: 0.7,
    },
  ],
  recommendations: [
    {
      id: "test-recommendation",
      type: "diagnostic",
      action: "Test action for {{primarySubject}}",
      tools: ["tool1"],
      expectedOutcome: "Expected outcome",
      prerequisites: [],
      priority: 5,
    },
  ],
  severity: "medium",
  ...overrides,
});

const createMockRegistry = (patterns: Map<string, DomainPattern[]>): PatternRegistry => {
  return {
    getDomains: vi.fn(() => Array.from(patterns.keys())),
    getPatternsByDomain: vi.fn((domain: string) => patterns.get(domain) ?? []),
    getPatternById: vi.fn((id: string) => {
      for (const domainPatterns of patterns.values()) {
        const found = domainPatterns.find((p) => p.id === id);
        if (found) return found;
      }
      return undefined;
    }),
    getAllPatterns: vi.fn(() => Array.from(patterns.values()).flat()),
    hasPatterns: vi.fn(() => patterns.size > 0),
  } as unknown as PatternRegistry;
};

// ============================================================================
// Tests
// ============================================================================

describe("PatternMatcher", () => {
  describe("createPatternMatcher", () => {
    it("should create a new PatternMatcher instance", () => {
      const registry = createMockRegistry(new Map());
      const matcher = createPatternMatcher(registry);
      expect(matcher).toBeInstanceOf(PatternMatcher);
    });
  });

  describe("matchPatterns", () => {
    it("should return empty array when no patterns match", () => {
      const patterns = new Map([["database", [createMockPattern()]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns("unrelated text", undefined, createMockKeyTerms());

      expect(results).toHaveLength(0);
    });

    it("should return matching patterns with confidence scores", () => {
      const pattern = createMockPattern({
        id: "db-slow-query",
        indicators: [{ type: "exact", value: "slow query", weight: 0.9 }],
      });
      const patterns = new Map([["database", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns(
        "Our database has a slow query issue",
        undefined,
        createMockKeyTerms()
      );

      expect(results).toHaveLength(1);
      expect(results[0].patternId).toBe("db-slow-query");
      expect(results[0].confidence).toBeGreaterThan(0);
      expect(results[0].domain).toBe("database");
    });

    it("should sort results by confidence (highest first)", () => {
      // Pattern 1: only matches "slow" (0.5 weight out of 0.5 total = 1.0 confidence)
      const pattern1 = createMockPattern({
        id: "pattern-1",
        indicators: [{ type: "exact", value: "slow", weight: 0.5 }],
      });
      // Pattern 2: matches both "slow" and "query" (1.7 weight out of 1.7 total = 1.0 confidence)
      // Both patterns will have 1.0 confidence since all indicators match
      // To test sorting, we need one pattern to have a lower match rate
      const pattern2 = createMockPattern({
        id: "pattern-2",
        indicators: [
          { type: "exact", value: "slow", weight: 0.9 },
          { type: "exact", value: "query", weight: 0.8 },
          { type: "exact", value: "timeout", weight: 0.5 }, // This won't match
        ],
      });
      const patterns = new Map([["database", [pattern1, pattern2]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns(
        "slow query performance",
        undefined,
        createMockKeyTerms()
      );

      expect(results).toHaveLength(2);
      // Pattern 1 has 100% match (1.0), Pattern 2 has 1.7/2.2 = ~0.77
      expect(results[0].patternId).toBe("pattern-1");
      expect(results[1].patternId).toBe("pattern-2");
      expect(results[0].confidence).toBeGreaterThan(results[1].confidence);
    });

    it("should include context in matching when provided", () => {
      const pattern = createMockPattern({
        id: "context-pattern",
        indicators: [{ type: "exact", value: "production environment", weight: 0.9 }],
      });
      const patterns = new Map([["ops", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      // Without context - no match
      const resultsNoContext = matcher.matchPatterns(
        "system is slow",
        undefined,
        createMockKeyTerms()
      );
      expect(resultsNoContext).toHaveLength(0);

      // With context - should match
      const resultsWithContext = matcher.matchPatterns(
        "system is slow",
        "This is happening in production environment",
        createMockKeyTerms()
      );
      expect(resultsWithContext).toHaveLength(1);
      expect(resultsWithContext[0].patternId).toBe("context-pattern");
    });

    it("should match patterns from multiple domains", () => {
      const dbPattern = createMockPattern({
        id: "db-pattern",
        indicators: [{ type: "exact", value: "database", weight: 0.8 }],
      });
      const apiPattern = createMockPattern({
        id: "api-pattern",
        indicators: [{ type: "exact", value: "api", weight: 0.8 }],
      });
      const patterns = new Map([
        ["database", [dbPattern]],
        ["api", [apiPattern]],
      ]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns(
        "database and api issues",
        undefined,
        createMockKeyTerms()
      );

      expect(results).toHaveLength(2);
      const domains = results.map((r) => r.domain);
      expect(domains).toContain("database");
      expect(domains).toContain("api");
    });

    it("should include matched indicators in results", () => {
      const pattern = createMockPattern({
        id: "multi-indicator",
        indicators: [
          { type: "exact", value: "slow", weight: 0.7 },
          { type: "exact", value: "query", weight: 0.8 },
          { type: "exact", value: "timeout", weight: 0.9 },
        ],
      });
      const patterns = new Map([["database", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns(
        "slow query causing issues",
        undefined,
        createMockKeyTerms()
      );

      expect(results).toHaveLength(1);
      expect(results[0].matchedIndicators).toHaveLength(2); // slow and query matched
      expect(results[0].matchedIndicators.map((m) => m.indicator.value)).toContain("slow");
      expect(results[0].matchedIndicators.map((m) => m.indicator.value)).toContain("query");
    });

    it("should generate hypotheses with adjusted likelihood", () => {
      const pattern = createMockPattern({
        id: "hypothesis-test",
        indicators: [{ type: "exact", value: "test", weight: 1.0 }],
        hypotheses: [
          {
            id: "h1",
            statement: "Hypothesis 1",
            investigationSteps: ["Step 1"],
            expectedFindings: ["Finding 1"],
            relatedHypotheses: [],
            estimatedTime: "10 min",
            likelihood: 0.8,
          },
        ],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns("test problem", undefined, createMockKeyTerms());

      expect(results).toHaveLength(1);
      expect(results[0].hypotheses).toHaveLength(1);
      // Likelihood should be adjusted by confidence (0.8 * 1.0 = 0.8)
      expect(results[0].hypotheses[0].likelihood).toBe(0.8);
    });

    it("should generate recommendations from pattern templates", () => {
      const pattern = createMockPattern({
        id: "rec-test",
        indicators: [{ type: "exact", value: "test", weight: 1.0 }],
        recommendations: [
          {
            id: "r1",
            type: "diagnostic",
            action: "Diagnose the issue",
            tools: ["tool1", "tool2"],
            expectedOutcome: "Issue identified",
            prerequisites: ["prereq1"],
            priority: 8,
          },
        ],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns("test problem", undefined, createMockKeyTerms());

      expect(results).toHaveLength(1);
      expect(results[0].recommendations).toHaveLength(1);
      expect(results[0].recommendations[0].type).toBe("diagnostic");
      expect(results[0].recommendations[0].priority).toBe(8);
    });
  });

  describe("scoreMatch", () => {
    it("should return 0 for no matching indicators", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "exact", value: "specific phrase", weight: 0.9 }],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const score = matcher.scoreMatch(pattern, "unrelated text", createMockKeyTerms());

      expect(score).toBe(0);
    });

    it("should return score based on matched indicator weights", () => {
      const pattern = createMockPattern({
        indicators: [
          { type: "exact", value: "slow", weight: 0.5 },
          { type: "exact", value: "query", weight: 0.5 },
        ],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      // Match one indicator
      const scoreOne = matcher.scoreMatch(pattern, "slow performance", createMockKeyTerms());
      expect(scoreOne).toBe(0.5); // 0.5 / 1.0 total weight

      // Match both indicators
      const scoreBoth = matcher.scoreMatch(pattern, "slow query issue", createMockKeyTerms());
      expect(scoreBoth).toBe(1.0); // 1.0 / 1.0 total weight
    });

    it("should clamp score to [0, 1] range", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "exact", value: "test", weight: 0.8, keyTermCategory: "domainTerms" }],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      // With many domain terms, boost could exceed 1.0
      const keyTerms = createMockKeyTerms({
        domainTerms: ["term1", "term2", "term3", "term4", "term5", "term6"],
      });

      const score = matcher.scoreMatch(pattern, "test text", keyTerms);

      expect(score).toBeLessThanOrEqual(1);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it("should reduce score with negative indicators", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "exact", value: "latency", weight: 0.9 }],
        negativeIndicators: [{ type: "exact", value: "network", weight: 0.3 }],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      // Without negative indicator
      const scoreWithout = matcher.scoreMatch(pattern, "high latency issue", createMockKeyTerms());

      // With negative indicator
      const scoreWith = matcher.scoreMatch(
        pattern,
        "high latency due to network",
        createMockKeyTerms()
      );

      expect(scoreWith).toBeLessThan(scoreWithout);
    });

    it("should not go below 0 with negative indicators", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "exact", value: "issue", weight: 0.2 }],
        negativeIndicators: [{ type: "exact", value: "resolved", weight: 1.5 }], // Higher than positive score
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const score = matcher.scoreMatch(pattern, "issue has been resolved", createMockKeyTerms());

      // Positive score: 0.2/0.2 = 1.0, Negative: 1.5, Final: max(0, 1.0 - 1.5) = 0
      expect(score).toBe(0);
    });
  });

  describe("exact phrase matching", () => {
    it("should match exact phrases case-insensitively", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "exact", value: "Slow Query", weight: 0.9 }],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns(
        "We have a SLOW QUERY problem",
        undefined,
        createMockKeyTerms()
      );

      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBeGreaterThan(0);
    });

    it("should not match partial phrases", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "exact", value: "slow query", weight: 0.9 }],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns("the query is slow", undefined, createMockKeyTerms());

      // "slow query" as exact phrase is not in "the query is slow"
      expect(results).toHaveLength(0);
    });
  });

  describe("fuzzy keyword matching", () => {
    it("should match when all keywords are present in any order", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "fuzzy", value: "database performance slow", weight: 0.8 }],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns(
        "slow response from the database affecting performance",
        undefined,
        createMockKeyTerms()
      );

      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBeGreaterThan(0);
    });

    it("should not match when some keywords are missing", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "fuzzy", value: "database performance slow", weight: 0.8 }],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns(
        "database is having issues",
        undefined,
        createMockKeyTerms()
      );

      // Missing "performance" and "slow"
      expect(results).toHaveLength(0);
    });

    it("should handle empty keyword string", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "fuzzy", value: "", weight: 0.8 }],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns("any text", undefined, createMockKeyTerms());

      expect(results).toHaveLength(0);
    });

    it("should apply weight-based scoring for fuzzy keyword sets", () => {
      // Pattern with two fuzzy indicators of different weights
      const pattern = createMockPattern({
        indicators: [
          { type: "fuzzy", value: "database slow", weight: 0.6 },
          { type: "fuzzy", value: "query timeout", weight: 0.4 },
        ],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      // Match only the first fuzzy indicator (weight 0.6)
      const resultsPartial = matcher.matchPatterns(
        "the database is running slow",
        undefined,
        createMockKeyTerms()
      );

      expect(resultsPartial).toHaveLength(1);
      // Score should be 0.6 / 1.0 = 0.6 (only first indicator matched)
      expect(resultsPartial[0].confidence).toBeCloseTo(0.6, 1);

      // Match both fuzzy indicators (weight 0.6 + 0.4 = 1.0)
      const resultsFull = matcher.matchPatterns(
        "the database is running slow and query timeout occurred",
        undefined,
        createMockKeyTerms()
      );

      expect(resultsFull).toHaveLength(1);
      // Score should be 1.0 / 1.0 = 1.0 (both indicators matched)
      expect(resultsFull[0].confidence).toBeCloseTo(1.0, 1);
    });

    it("should match fuzzy keywords case-insensitively", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "fuzzy", value: "Database Performance", weight: 0.8 }],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns(
        "DATABASE issues affecting PERFORMANCE",
        undefined,
        createMockKeyTerms()
      );

      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBeGreaterThan(0);
    });
  });

  describe("regex pattern matching", () => {
    it("should match valid regex patterns", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "regex", value: "\\b(select|join|where).*slow\\b", weight: 0.7 }],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns(
        "the SELECT query is running slow",
        undefined,
        createMockKeyTerms()
      );

      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBeGreaterThan(0);
    });

    it("should handle invalid regex gracefully", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "regex", value: "[invalid(regex", weight: 0.7 }],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      // Should not throw, just return no match
      const results = matcher.matchPatterns("any text", undefined, createMockKeyTerms());

      expect(results).toHaveLength(0);
    });

    it("should cache compiled regex patterns", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "regex", value: "test\\d+", weight: 0.7 }],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      // Match multiple times
      matcher.matchPatterns("test123", undefined, createMockKeyTerms());
      matcher.matchPatterns("test456", undefined, createMockKeyTerms());
      matcher.matchPatterns("test789", undefined, createMockKeyTerms());

      // All should work (regex is cached)
      const results = matcher.matchPatterns("test000", undefined, createMockKeyTerms());
      expect(results).toHaveLength(1);
    });
  });

  describe("key term integration", () => {
    it("should boost score when key term category matches", () => {
      const pattern = createMockPattern({
        indicators: [
          { type: "exact", value: "database", weight: 0.4, keyTermCategory: "domainTerms" },
          { type: "exact", value: "performance", weight: 0.6 }, // This won't match
        ],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      // Without domain terms - only "database" matches (0.4/1.0 = 0.4)
      const scoreWithout = matcher.scoreMatch(pattern, "database issue", createMockKeyTerms());

      // With domain terms - "database" matches with boost (0.4 * 1.2 / 1.0 = 0.48)
      const scoreWith = matcher.scoreMatch(
        pattern,
        "database issue",
        createMockKeyTerms({ domainTerms: ["postgresql", "index"] })
      );

      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });

    it("should substitute primarySubject in templates", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "exact", value: "test", weight: 1.0 }],
        hypotheses: [
          {
            id: "h1",
            statement: "The {{primarySubject}} may have issues",
            investigationSteps: ["Check {{primarySubject}}"],
            expectedFindings: ["Finding"],
            relatedHypotheses: [],
            estimatedTime: "10 min",
            likelihood: 0.8,
          },
        ],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns(
        "test problem",
        undefined,
        createMockKeyTerms({ primarySubject: "user authentication" })
      );

      expect(results[0].hypotheses[0].statement).toBe("The user authentication may have issues");
      expect(results[0].hypotheses[0].investigationSteps[0]).toBe("Check user authentication");
    });

    it("should use default values when key terms are missing", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "exact", value: "test", weight: 1.0 }],
        hypotheses: [
          {
            id: "h1",
            statement: "The {{primarySubject}} with {{domainTerms}} and {{actionVerbs}}",
            investigationSteps: ["Step"],
            expectedFindings: ["Finding"],
            relatedHypotheses: [],
            estimatedTime: "10 min",
            likelihood: 0.8,
          },
        ],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      const results = matcher.matchPatterns("test problem", undefined, createMockKeyTerms());

      expect(results[0].hypotheses[0].statement).toBe(
        "The the system with relevant components and operations"
      );
    });
  });

  describe("clearCache", () => {
    it("should clear the regex cache", () => {
      const pattern = createMockPattern({
        indicators: [{ type: "regex", value: "test\\d+", weight: 0.7 }],
      });
      const patterns = new Map([["test", [pattern]]]);
      const registry = createMockRegistry(patterns);
      const matcher = new PatternMatcher(registry);

      // Populate cache
      matcher.matchPatterns("test123", undefined, createMockKeyTerms());

      // Clear cache
      matcher.clearCache();

      // Should still work after clearing
      const results = matcher.matchPatterns("test456", undefined, createMockKeyTerms());
      expect(results).toHaveLength(1);
    });
  });
});
