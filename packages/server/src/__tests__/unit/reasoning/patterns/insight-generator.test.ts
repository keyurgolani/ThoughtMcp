/**
 * Unit Tests for InsightGenerator
 *
 * Tests insight generation, template substitution, hypothesis ordering,
 * recommendation ordering, and fallback generation.
 *
 * Requirements: 4.1, 5.1, 6.3
 */

import { describe, expect, it } from "vitest";

import type { KeyTerms } from "../../../../reasoning/key-term-extractor.js";
import {
  createInsightGenerator,
  InsightGenerator,
} from "../../../../reasoning/patterns/insight-generator.js";
import type {
  GeneratedHypothesis,
  GeneratedRecommendation,
  PatternMatchResult,
} from "../../../../reasoning/patterns/types.js";

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

const createMockHypothesis = (
  overrides: Partial<GeneratedHypothesis> = {}
): GeneratedHypothesis => ({
  id: "test-hypothesis",
  statement: "Test hypothesis for {{primarySubject}}",
  investigationSteps: ["Step 1: Check {{primarySubject}}"],
  expectedFindings: ["Finding 1"],
  relatedHypotheses: [],
  estimatedTime: "10 minutes",
  likelihood: 0.7,
  sourcePatternId: "test-pattern",
  ...overrides,
});

const createMockRecommendation = (
  overrides: Partial<GeneratedRecommendation> = {}
): GeneratedRecommendation => ({
  id: "test-recommendation",
  type: "diagnostic",
  action: "Test action for {{primarySubject}}",
  tools: ["tool1"],
  expectedOutcome: "Expected outcome for {{primarySubject}}",
  prerequisites: [],
  priority: 5,
  sourcePatternId: "test-pattern",
  ...overrides,
});

const createMockPatternMatch = (
  overrides: Partial<PatternMatchResult> = {}
): PatternMatchResult => ({
  patternId: "test-pattern",
  domain: "test-domain",
  confidence: 0.8,
  matchedIndicators: [],
  hypotheses: [createMockHypothesis()],
  recommendations: [createMockRecommendation()],
  severity: "medium",
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe("InsightGenerator", () => {
  describe("createInsightGenerator", () => {
    it("should create a new InsightGenerator instance", () => {
      const generator = createInsightGenerator();
      expect(generator).toBeInstanceOf(InsightGenerator);
    });

    it("should accept custom options", () => {
      const generator = createInsightGenerator({
        maxHypotheses: 5,
        maxRecommendations: 3,
        includeFallback: false,
      });
      expect(generator).toBeInstanceOf(InsightGenerator);
    });
  });

  describe("generateInsights", () => {
    it("should return insights from pattern matches", () => {
      const generator = new InsightGenerator();
      const matches = [createMockPatternMatch()];
      const keyTerms = createMockKeyTerms({ primarySubject: "database" });

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      // With minHypothesesOnMatch=2, we get at least 2 hypotheses (1 from pattern + 1 supplemental)
      expect(insights.hypotheses.length).toBeGreaterThanOrEqual(2);
      expect(insights.recommendations).toHaveLength(1);
      expect(insights.matchedDomains).toContain("test-domain");
      expect(insights.usedFallback).toBe(false);
      expect(insights.confidence).toBeGreaterThan(0);
    });

    it("should generate fallback insights when no patterns match", () => {
      const generator = new InsightGenerator({ includeFallback: true });
      const keyTerms = createMockKeyTerms({ primarySubject: "api service" });

      const insights = generator.generateInsights([], keyTerms, "test problem");

      expect(insights.usedFallback).toBe(true);
      expect(insights.hypotheses.length).toBeGreaterThan(0);
      expect(insights.recommendations.length).toBeGreaterThan(0);
      expect(insights.matchedDomains).toHaveLength(0);
    });

    it("should return empty insights when fallback is disabled and no matches", () => {
      const generator = new InsightGenerator({ includeFallback: false });
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights([], keyTerms, "test problem");

      expect(insights.usedFallback).toBe(false);
      expect(insights.hypotheses).toHaveLength(0);
      expect(insights.recommendations).toHaveLength(0);
      expect(insights.confidence).toBe(0);
    });

    it("should filter matches below minimum confidence", () => {
      const generator = new InsightGenerator({ minConfidence: 0.5 });
      const matches = [
        createMockPatternMatch({ confidence: 0.3, patternId: "low-confidence" }),
        createMockPatternMatch({ confidence: 0.7, patternId: "high-confidence" }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      // Only high-confidence match should be included (low-confidence filtered out)
      // Pattern-derived hypotheses should all be from high-confidence pattern
      // Supplemental hypotheses (if any) have sourcePatternId "supplemental"
      const patternHypotheses = insights.hypotheses.filter(
        (h) => h.sourcePatternId !== "supplemental"
      );
      expect(patternHypotheses.every((h) => h.sourcePatternId === "high-confidence")).toBe(true);
    });

    it("should combine insights from multiple pattern matches", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          patternId: "pattern-1",
          domain: "database",
          hypotheses: [createMockHypothesis({ id: "h1", sourcePatternId: "pattern-1" })],
        }),
        createMockPatternMatch({
          patternId: "pattern-2",
          domain: "api",
          hypotheses: [createMockHypothesis({ id: "h2", sourcePatternId: "pattern-2" })],
        }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.hypotheses).toHaveLength(2);
      expect(insights.matchedDomains).toContain("database");
      expect(insights.matchedDomains).toContain("api");
    });

    it("should limit hypotheses to maxHypotheses", () => {
      const generator = new InsightGenerator({ maxHypotheses: 2 });
      const matches = [
        createMockPatternMatch({
          hypotheses: [
            createMockHypothesis({ id: "h1", likelihood: 0.9 }),
            createMockHypothesis({ id: "h2", likelihood: 0.8 }),
            createMockHypothesis({ id: "h3", likelihood: 0.7 }),
            createMockHypothesis({ id: "h4", likelihood: 0.6 }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.hypotheses).toHaveLength(2);
    });

    it("should limit recommendations to maxRecommendations", () => {
      const generator = new InsightGenerator({ maxRecommendations: 2 });
      const matches = [
        createMockPatternMatch({
          recommendations: [
            createMockRecommendation({ id: "r1", priority: 9 }),
            createMockRecommendation({ id: "r2", priority: 8 }),
            createMockRecommendation({ id: "r3", priority: 7 }),
            createMockRecommendation({ id: "r4", priority: 6 }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.recommendations).toHaveLength(2);
    });
  });

  describe("template substitution", () => {
    it("should substitute {{primarySubject}} with key term", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          hypotheses: [
            createMockHypothesis({
              statement: "The {{primarySubject}} may have issues",
            }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms({ primarySubject: "authentication service" });

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.hypotheses[0].statement).toBe("The authentication service may have issues");
    });

    it("should substitute {{primarySubject}} with default when missing", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          hypotheses: [
            createMockHypothesis({
              statement: "The {{primarySubject}} may have issues",
            }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms({ primarySubject: null });

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.hypotheses[0].statement).toBe("The the system may have issues");
    });

    it("should substitute {{domainTerms}} with key terms", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          hypotheses: [
            createMockHypothesis({
              statement: "Check {{domainTerms}} for issues",
            }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms({ domainTerms: ["database", "cache", "api"] });

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.hypotheses[0].statement).toBe("Check database, cache, api for issues");
    });

    it("should substitute {{actionVerbs}} with key terms", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          hypotheses: [
            createMockHypothesis({
              statement: "The system should {{actionVerbs}}",
            }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms({ actionVerbs: ["optimize", "scale"] });

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.hypotheses[0].statement).toBe("The system should optimize, scale");
    });

    it("should substitute placeholders in investigation steps", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          hypotheses: [
            createMockHypothesis({
              investigationSteps: ["Check {{primarySubject}} logs", "Review {{domainTerms}}"],
            }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms({
        primarySubject: "api gateway",
        domainTerms: ["routing", "load balancing"],
      });

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.hypotheses[0].investigationSteps[0]).toBe("Check api gateway logs");
      expect(insights.hypotheses[0].investigationSteps[1]).toBe("Review routing, load balancing");
    });

    it("should substitute placeholders in recommendations", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          recommendations: [
            createMockRecommendation({
              action: "Optimize {{primarySubject}}",
              expectedOutcome: "Improved {{primarySubject}} performance",
            }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms({ primarySubject: "query execution" });

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.recommendations[0].action).toBe("Optimize query execution");
      expect(insights.recommendations[0].expectedOutcome).toBe(
        "Improved query execution performance"
      );
    });
  });

  describe("hypothesis ordering", () => {
    it("should order hypotheses by likelihood (highest first)", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          hypotheses: [
            createMockHypothesis({ id: "low", likelihood: 0.3 }),
            createMockHypothesis({ id: "high", likelihood: 0.9 }),
            createMockHypothesis({ id: "medium", likelihood: 0.6 }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.hypotheses[0].id).toBe("high");
      expect(insights.hypotheses[1].id).toBe("medium");
      expect(insights.hypotheses[2].id).toBe("low");
    });

    it("should maintain order for equal likelihood", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          hypotheses: [
            createMockHypothesis({ id: "first", likelihood: 0.5 }),
            createMockHypothesis({ id: "second", likelihood: 0.5 }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      // Both have same likelihood, order should be stable
      expect(insights.hypotheses).toHaveLength(2);
      expect(insights.hypotheses.map((h) => h.id)).toContain("first");
      expect(insights.hypotheses.map((h) => h.id)).toContain("second");
    });

    it("should ensure minimum 2 hypotheses when domain matches (Requirement 4.7)", () => {
      const generator = new InsightGenerator({ minHypothesesOnMatch: 2 });
      const matches = [
        createMockPatternMatch({
          hypotheses: [createMockHypothesis({ id: "single", likelihood: 0.8 })],
        }),
      ];
      const keyTerms = createMockKeyTerms({ primarySubject: "database" });

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      // Should have at least 2 hypotheses (1 from pattern + 1 supplemental)
      expect(insights.hypotheses.length).toBeGreaterThanOrEqual(2);
      // First hypothesis should be the pattern-derived one (higher likelihood)
      expect(insights.hypotheses[0].id).toBe("single");
      // Second should be supplemental
      expect(insights.hypotheses[1].sourcePatternId).toBe("supplemental");
    });

    it("should not add supplemental hypotheses when pattern provides enough", () => {
      const generator = new InsightGenerator({ minHypothesesOnMatch: 2 });
      const matches = [
        createMockPatternMatch({
          hypotheses: [
            createMockHypothesis({ id: "h1", likelihood: 0.9 }),
            createMockHypothesis({ id: "h2", likelihood: 0.7 }),
            createMockHypothesis({ id: "h3", likelihood: 0.5 }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      // Should have exactly 3 hypotheses (all from pattern, no supplemental needed)
      expect(insights.hypotheses).toHaveLength(3);
      expect(insights.hypotheses.every((h) => h.sourcePatternId === "test-pattern")).toBe(true);
    });

    it("should order supplemental hypotheses after pattern hypotheses by likelihood", () => {
      const generator = new InsightGenerator({ minHypothesesOnMatch: 3 });
      const matches = [
        createMockPatternMatch({
          hypotheses: [createMockHypothesis({ id: "pattern-h", likelihood: 0.8 })],
        }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      // Should have at least 3 hypotheses
      expect(insights.hypotheses.length).toBeGreaterThanOrEqual(3);
      // Pattern hypothesis should be first (highest likelihood)
      expect(insights.hypotheses[0].id).toBe("pattern-h");
      expect(insights.hypotheses[0].likelihood).toBe(0.8);
      // Supplemental hypotheses should have lower likelihood
      expect(insights.hypotheses[1].likelihood).toBeLessThan(0.8);
      expect(insights.hypotheses[2].likelihood).toBeLessThan(0.8);
    });

    it("should include domain context in supplemental hypotheses", () => {
      const generator = new InsightGenerator({ minHypothesesOnMatch: 2 });
      const matches = [
        createMockPatternMatch({
          domain: "database",
          hypotheses: [createMockHypothesis({ id: "single", likelihood: 0.8 })],
        }),
      ];
      const keyTerms = createMockKeyTerms({ primarySubject: "query optimizer" });

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      // Supplemental hypothesis should include domain context
      const supplemental = insights.hypotheses.find((h) => h.sourcePatternId === "supplemental");
      expect(supplemental).toBeDefined();
      expect(supplemental!.statement).toContain("query optimizer");
      expect(supplemental!.statement).toContain("database");
    });

    it("should respect custom minHypothesesOnMatch option", () => {
      const generator = new InsightGenerator({ minHypothesesOnMatch: 4 });
      const matches = [
        createMockPatternMatch({
          hypotheses: [createMockHypothesis({ id: "single", likelihood: 0.8 })],
        }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      // Should have at least 4 hypotheses
      expect(insights.hypotheses.length).toBeGreaterThanOrEqual(4);
    });

    it("should handle minHypothesesOnMatch of 0 (no minimum)", () => {
      const generator = new InsightGenerator({ minHypothesesOnMatch: 0 });
      const matches = [
        createMockPatternMatch({
          hypotheses: [createMockHypothesis({ id: "single", likelihood: 0.8 })],
        }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      // Should have exactly 1 hypothesis (no supplemental added)
      expect(insights.hypotheses).toHaveLength(1);
      expect(insights.hypotheses[0].id).toBe("single");
    });
  });

  describe("recommendation ordering", () => {
    it("should order recommendations by priority (highest first)", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          recommendations: [
            createMockRecommendation({ id: "low", priority: 3 }),
            createMockRecommendation({ id: "high", priority: 9 }),
            createMockRecommendation({ id: "medium", priority: 6 }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.recommendations[0].id).toBe("high");
      expect(insights.recommendations[1].id).toBe("medium");
      expect(insights.recommendations[2].id).toBe("low");
    });

    it("should place prerequisites before dependents", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          recommendations: [
            createMockRecommendation({
              id: "dependent",
              priority: 9,
              prerequisites: ["prereq"],
            }),
            createMockRecommendation({
              id: "prereq",
              priority: 5,
              prerequisites: [],
            }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      const prereqIndex = insights.recommendations.findIndex((r) => r.id === "prereq");
      const dependentIndex = insights.recommendations.findIndex((r) => r.id === "dependent");

      expect(prereqIndex).toBeLessThan(dependentIndex);
    });

    it("should handle chain of prerequisites", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          recommendations: [
            createMockRecommendation({
              id: "step3",
              priority: 9,
              prerequisites: ["step2"],
            }),
            createMockRecommendation({
              id: "step1",
              priority: 3,
              prerequisites: [],
            }),
            createMockRecommendation({
              id: "step2",
              priority: 6,
              prerequisites: ["step1"],
            }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      const step1Index = insights.recommendations.findIndex((r) => r.id === "step1");
      const step2Index = insights.recommendations.findIndex((r) => r.id === "step2");
      const step3Index = insights.recommendations.findIndex((r) => r.id === "step3");

      expect(step1Index).toBeLessThan(step2Index);
      expect(step2Index).toBeLessThan(step3Index);
    });

    it("should handle missing prerequisites gracefully", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          recommendations: [
            createMockRecommendation({
              id: "dependent",
              priority: 9,
              prerequisites: ["nonexistent"],
            }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms();

      // Should not throw
      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.recommendations).toHaveLength(1);
      expect(insights.recommendations[0].id).toBe("dependent");
    });
  });

  describe("fallback insights", () => {
    it("should generate fallback hypotheses with subject", () => {
      const generator = new InsightGenerator({ includeFallback: true });
      const keyTerms = createMockKeyTerms({ primarySubject: "payment service" });

      const insights = generator.generateInsights([], keyTerms, "test problem");

      expect(insights.usedFallback).toBe(true);
      expect(insights.hypotheses.length).toBeGreaterThanOrEqual(2);
      expect(insights.hypotheses[0].statement).toContain("payment service");
    });

    it("should generate fallback recommendations", () => {
      const generator = new InsightGenerator({ includeFallback: true });
      const keyTerms = createMockKeyTerms({ primarySubject: "cache layer" });

      const insights = generator.generateInsights([], keyTerms, "test problem");

      expect(insights.recommendations.length).toBeGreaterThanOrEqual(2);
      expect(insights.recommendations[0].action).toContain("cache layer");
    });

    it("should use default subject when primarySubject is null", () => {
      const generator = new InsightGenerator({ includeFallback: true });
      const keyTerms = createMockKeyTerms({ primarySubject: null });

      const insights = generator.generateInsights([], keyTerms, "test problem");

      expect(insights.hypotheses[0].statement).toContain("the system");
    });

    it("should include domain terms in fallback when available", () => {
      const generator = new InsightGenerator({ includeFallback: true });
      const keyTerms = createMockKeyTerms({
        primarySubject: null,
        domainTerms: ["database", "indexing"],
      });

      const insights = generator.generateInsights([], keyTerms, "test problem");

      expect(insights.rootCauseAnalysis).toContain("database, indexing");
    });
  });

  describe("root cause analysis and conclusion", () => {
    it("should generate root cause analysis with top hypothesis", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({
          domain: "database",
          hypotheses: [
            createMockHypothesis({
              statement: "Missing index on query column",
              likelihood: 0.8,
            }),
          ],
        }),
      ];
      const keyTerms = createMockKeyTerms({ primarySubject: "user lookup" });

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.rootCauseAnalysis).toContain("user lookup");
      expect(insights.rootCauseAnalysis).toContain("database");
      expect(insights.rootCauseAnalysis).toContain("Missing index");
    });

    it("should generate conclusion with confidence level", () => {
      const generator = new InsightGenerator();
      const matches = [createMockPatternMatch({ confidence: 0.9 })];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.conclusion).toContain("high confidence");
    });

    it("should indicate moderate confidence for mid-range scores", () => {
      const generator = new InsightGenerator();
      const matches = [createMockPatternMatch({ confidence: 0.5 })];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.conclusion).toContain("moderate confidence");
    });

    it("should indicate preliminary confidence for low scores", () => {
      const generator = new InsightGenerator();
      const matches = [createMockPatternMatch({ confidence: 0.2 })];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.conclusion).toContain("preliminary confidence");
    });
  });

  describe("confidence calculation", () => {
    it("should use highest match confidence as base", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({ confidence: 0.5 }),
        createMockPatternMatch({ confidence: 0.9 }),
        createMockPatternMatch({ confidence: 0.3 }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should boost confidence slightly for multiple domains", () => {
      const generator = new InsightGenerator();
      const singleDomainMatches = [createMockPatternMatch({ confidence: 0.8, domain: "database" })];
      const multiDomainMatches = [
        createMockPatternMatch({ confidence: 0.8, domain: "database" }),
        createMockPatternMatch({ confidence: 0.7, domain: "api" }),
      ];
      const keyTerms = createMockKeyTerms();

      const singleInsights = generator.generateInsights(
        singleDomainMatches,
        keyTerms,
        "test problem"
      );
      const multiInsights = generator.generateInsights(
        multiDomainMatches,
        keyTerms,
        "test problem"
      );

      expect(multiInsights.confidence).toBeGreaterThan(singleInsights.confidence);
    });

    it("should cap confidence at 1.0", () => {
      const generator = new InsightGenerator();
      const matches = [
        createMockPatternMatch({ confidence: 0.99, domain: "d1" }),
        createMockPatternMatch({ confidence: 0.98, domain: "d2" }),
        createMockPatternMatch({ confidence: 0.97, domain: "d3" }),
      ];
      const keyTerms = createMockKeyTerms();

      const insights = generator.generateInsights(matches, keyTerms, "test problem");

      expect(insights.confidence).toBeLessThanOrEqual(1.0);
    });
  });
});
