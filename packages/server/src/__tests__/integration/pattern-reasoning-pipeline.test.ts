/**
 * Pattern Reasoning Pipeline Integration Tests (Mocked)
 *
 * Tests the integration between PatternRegistry, PatternMatcher, InsightGenerator,
 * and AnalyticalStreamProcessor for the full reasoning pipeline.
 *
 * This test verifies that the externalized pattern system integrates correctly
 * with the analytical reasoning engine.
 *
 * Requirements: 8.3, 8.4
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeyTermExtractor } from "../../reasoning/key-term-extractor.js";
import { createInsightGenerator } from "../../reasoning/patterns/insight-generator.js";
import { createPatternMatcher } from "../../reasoning/patterns/pattern-matcher.js";
import { createPatternRegistry } from "../../reasoning/patterns/pattern-registry.js";
import { AnalyticalStreamProcessor } from "../../reasoning/streams/analytical-stream-processor.js";
import { StreamStatus, StreamType, type Problem } from "../../reasoning/types.js";

// Mock fetch to prevent LLM availability checks from hitting real endpoints
const mockFetch = vi.fn();

describe("Pattern Reasoning Pipeline Integration (Mocked)", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();

    // Save original fetch and replace with mock
    originalFetch = global.fetch;
    global.fetch = mockFetch;

    // Mock fetch to return no LLM models available (forces rule-based fallback)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    });
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("PatternRegistry + PatternMatcher + InsightGenerator Integration", () => {
    it("should load patterns and match against problem text", async () => {
      // Initialize components
      const registry = createPatternRegistry();
      await registry.loadPatterns("config/reasoning-patterns");

      const matcher = createPatternMatcher(registry);
      const keyTermExtractor = new KeyTermExtractor();

      // Test problem - using exact phrases that match database pattern indicators
      const problemText = "We have a slow query causing query timeout issues in our database";
      const context = "Production database with high load";

      // Extract key terms
      const keyTerms = keyTermExtractor.extract(problemText, context);

      // Match patterns
      const matches = matcher.matchPatterns(problemText, context, keyTerms);

      // Should find database-related patterns
      expect(matches.length).toBeGreaterThan(0);

      // At least one match should be from database domain
      const databaseMatches = matches.filter((m) => m.domain === "database");
      expect(databaseMatches.length).toBeGreaterThan(0);

      // Matches should have confidence scores
      for (const match of matches) {
        expect(match.confidence).toBeGreaterThan(0);
        expect(match.confidence).toBeLessThanOrEqual(1);
        expect(match.patternId).toBeDefined();
        expect(match.domain).toBeDefined();
      }
    });

    it("should generate insights from pattern matches", async () => {
      // Initialize components
      const registry = createPatternRegistry();
      await registry.loadPatterns("config/reasoning-patterns");

      const matcher = createPatternMatcher(registry);
      const insightGenerator = createInsightGenerator({
        maxHypotheses: 10,
        maxRecommendations: 10,
        includeFallback: true,
        minConfidence: 0.1,
        minHypothesesOnMatch: 2,
      });
      const keyTermExtractor = new KeyTermExtractor();

      // Test problem
      const problemText = "API rate limiting is causing service degradation";
      const context = "High traffic web application";

      // Extract key terms and match patterns
      const keyTerms = keyTermExtractor.extract(problemText, context);
      const matches = matcher.matchPatterns(problemText, context, keyTerms);

      // Generate insights
      const insights = insightGenerator.generateInsights(matches, keyTerms, problemText);

      // Should generate hypotheses
      expect(insights.hypotheses.length).toBeGreaterThan(0);

      // Should generate recommendations
      expect(insights.recommendations.length).toBeGreaterThan(0);

      // Should have confidence score
      expect(insights.confidence).toBeGreaterThan(0);
      expect(insights.confidence).toBeLessThanOrEqual(1);

      // Hypotheses should have required fields
      for (const hypothesis of insights.hypotheses) {
        expect(hypothesis.id).toBeDefined();
        expect(hypothesis.statement).toBeDefined();
        expect(hypothesis.likelihood).toBeGreaterThan(0);
      }

      // Recommendations should have required fields
      for (const recommendation of insights.recommendations) {
        expect(recommendation.id).toBeDefined();
        expect(recommendation.action).toBeDefined();
        expect(recommendation.type).toMatch(/diagnostic|remedial/);
      }
    });

    it("should handle problems with no pattern matches gracefully", async () => {
      // Initialize components
      const registry = createPatternRegistry();
      await registry.loadPatterns("config/reasoning-patterns");

      const matcher = createPatternMatcher(registry);
      const insightGenerator = createInsightGenerator({
        maxHypotheses: 10,
        maxRecommendations: 10,
        includeFallback: true,
        minConfidence: 0.1,
        minHypothesesOnMatch: 2,
      });
      const keyTermExtractor = new KeyTermExtractor();

      // Test problem with no matching patterns
      const problemText = "Random unrelated text that should not match any patterns";
      const context = undefined;

      // Extract key terms and match patterns
      const keyTerms = keyTermExtractor.extract(problemText, context);
      const matches = matcher.matchPatterns(problemText, context, keyTerms);

      // Generate insights (should use fallback)
      const insights = insightGenerator.generateInsights(matches, keyTerms, problemText);

      // Should still generate some output (fallback)
      expect(insights).toBeDefined();
      expect(insights.confidence).toBeGreaterThanOrEqual(0);

      // Should indicate fallback was used
      expect(insights.usedFallback).toBe(true);
    });
  });

  describe("AnalyticalStreamProcessor Integration with Pattern System", () => {
    it("should use pattern system for rule-based reasoning", async () => {
      // Create processor with pattern registry
      const registry = createPatternRegistry();
      const processor = new AnalyticalStreamProcessor({
        patternRegistry: registry,
        deterministicMode: true,
      });

      // Test problem
      const problem: Problem = {
        id: "test-pattern-integration",
        description: "Database performance is degraded with slow queries",
        context: "Production environment with high load",
        constraints: ["Cannot change schema"],
        goals: ["Improve query performance"],
      };

      // Process problem (will use rule-based fallback since LLM is mocked as unavailable)
      const result = await processor.process(problem);

      // Should complete successfully
      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.streamType).toBe(StreamType.ANALYTICAL);

      // Should have reasoning steps
      expect(result.reasoning.length).toBeGreaterThan(0);

      // Should have insights
      expect(result.insights.length).toBeGreaterThan(0);

      // Should have conclusion
      expect(result.conclusion).toBeDefined();
      expect(result.conclusion.length).toBeGreaterThan(0);

      // Should have confidence score
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Processing time should be recorded
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it("should produce domain-specific insights for database problems", async () => {
      const registry = createPatternRegistry();
      const processor = new AnalyticalStreamProcessor({
        patternRegistry: registry,
        deterministicMode: true,
      });

      const problem: Problem = {
        id: "test-database-domain",
        description: "Slow query performance with missing indexes causing timeouts",
        context: "PostgreSQL database with large tables",
        constraints: [],
        goals: ["Reduce query latency"],
      };

      const result = await processor.process(problem);

      // Should complete successfully
      expect(result.status).toBe(StreamStatus.COMPLETED);

      // Reasoning should mention database-related concepts
      const reasoningText = result.reasoning.join(" ").toLowerCase();
      const hasDbConcepts =
        reasoningText.includes("database") ||
        reasoningText.includes("query") ||
        reasoningText.includes("index") ||
        reasoningText.includes("pattern");
      expect(hasDbConcepts).toBe(true);
    });

    it("should produce domain-specific insights for API problems", async () => {
      const registry = createPatternRegistry();
      const processor = new AnalyticalStreamProcessor({
        patternRegistry: registry,
        deterministicMode: true,
      });

      const problem: Problem = {
        id: "test-api-domain",
        description: "API rate limiting causing 429 errors for users",
        context: "REST API with high traffic",
        constraints: [],
        goals: ["Handle rate limits gracefully"],
      };

      const result = await processor.process(problem);

      // Should complete successfully
      expect(result.status).toBe(StreamStatus.COMPLETED);

      // Reasoning should mention API-related concepts
      const reasoningText = result.reasoning.join(" ").toLowerCase();
      const hasApiConcepts =
        reasoningText.includes("api") ||
        reasoningText.includes("rate") ||
        reasoningText.includes("limit") ||
        reasoningText.includes("pattern");
      expect(hasApiConcepts).toBe(true);
    });

    it("should produce domain-specific insights for security problems", async () => {
      const registry = createPatternRegistry();
      const processor = new AnalyticalStreamProcessor({
        patternRegistry: registry,
        deterministicMode: true,
      });

      const problem: Problem = {
        id: "test-security-domain",
        description: "Security vulnerability detected in authentication system",
        context: "Web application with user authentication",
        constraints: [],
        goals: ["Fix security vulnerability"],
      };

      const result = await processor.process(problem);

      // Should complete successfully
      expect(result.status).toBe(StreamStatus.COMPLETED);

      // Reasoning should mention security-related concepts
      const reasoningText = result.reasoning.join(" ").toLowerCase();
      const hasSecurityConcepts =
        reasoningText.includes("security") ||
        reasoningText.includes("vulnerability") ||
        reasoningText.includes("authentication") ||
        reasoningText.includes("pattern");
      expect(hasSecurityConcepts).toBe(true);
    });

    it("should maintain StreamResult interface compatibility - Requirement 8.3, 8.4", async () => {
      const registry = createPatternRegistry();
      const processor = new AnalyticalStreamProcessor({
        patternRegistry: registry,
        deterministicMode: true,
      });

      const problem: Problem = {
        id: "test-interface-compat",
        description: "Test problem for interface compatibility",
        context: "Testing context",
        constraints: ["Test constraint"],
        goals: ["Test goal"],
      };

      const result = await processor.process(problem);

      // Verify StreamResult interface fields
      expect(result).toHaveProperty("streamId");
      expect(result).toHaveProperty("streamType");
      expect(result).toHaveProperty("conclusion");
      expect(result).toHaveProperty("reasoning");
      expect(result).toHaveProperty("insights");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("processingTime");
      expect(result).toHaveProperty("status");

      // Verify types
      expect(typeof result.streamId).toBe("string");
      expect(result.streamType).toBe(StreamType.ANALYTICAL);
      expect(typeof result.conclusion).toBe("string");
      expect(Array.isArray(result.reasoning)).toBe(true);
      expect(Array.isArray(result.insights)).toBe(true);
      expect(typeof result.confidence).toBe("number");
      expect(typeof result.processingTime).toBe("number");
      expect(Object.values(StreamStatus)).toContain(result.status);

      // Verify insight structure
      for (const insight of result.insights) {
        expect(insight).toHaveProperty("content");
        expect(insight).toHaveProperty("source");
        expect(insight).toHaveProperty("confidence");
        expect(insight).toHaveProperty("importance");
        expect(typeof insight.content).toBe("string");
        expect(typeof insight.confidence).toBe("number");
        expect(typeof insight.importance).toBe("number");
      }
    });

    it("should produce deterministic results in deterministic mode - Requirement 10.3", async () => {
      const registry = createPatternRegistry();

      // Create two processors with deterministic mode
      const processor1 = new AnalyticalStreamProcessor({
        patternRegistry: registry,
        deterministicMode: true,
      });

      const processor2 = new AnalyticalStreamProcessor({
        patternRegistry: registry,
        deterministicMode: true,
      });

      const problem: Problem = {
        id: "test-deterministic",
        description: "Database queries are slow",
        context: "Production environment",
        constraints: [],
        goals: ["Improve performance"],
      };

      // Reset counters for deterministic IDs
      processor1.resetDeterministicCounter();
      processor2.resetDeterministicCounter();

      // Process same problem twice
      const result1 = await processor1.process(problem);
      const result2 = await processor2.process(problem);

      // Results should be identical (except for processing time)
      expect(result1.streamType).toBe(result2.streamType);
      expect(result1.status).toBe(result2.status);
      expect(result1.conclusion).toBe(result2.conclusion);
      expect(result1.reasoning).toEqual(result2.reasoning);
      expect(result1.insights.length).toBe(result2.insights.length);
      expect(result1.confidence).toBe(result2.confidence);

      // Stream IDs should follow deterministic pattern
      expect(result1.streamId).toContain("deterministic");
      expect(result2.streamId).toContain("deterministic");
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle invalid problem gracefully", async () => {
      const registry = createPatternRegistry();
      const processor = new AnalyticalStreamProcessor({
        patternRegistry: registry,
        deterministicMode: true,
      });

      const invalidProblem: Problem = {
        id: "test-invalid",
        description: "", // Empty description should cause validation error
        context: "",
        constraints: [],
        goals: [],
      };

      await expect(processor.process(invalidProblem)).rejects.toThrow();
    });

    it("should handle empty pattern registry gracefully", async () => {
      // Create processor with empty registry (no patterns loaded)
      const emptyRegistry = createPatternRegistry();
      const processor = new AnalyticalStreamProcessor({
        patternRegistry: emptyRegistry,
        deterministicMode: true,
      });

      const problem: Problem = {
        id: "test-empty-registry",
        description: "Test problem with empty registry",
        context: "Testing context",
        constraints: [],
        goals: [],
      };

      // Should still complete (using fallback reasoning)
      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe("Performance Integration", () => {
    it("should complete pattern-based reasoning within reasonable time", async () => {
      const registry = createPatternRegistry();
      await registry.loadPatterns("config/reasoning-patterns");

      const processor = new AnalyticalStreamProcessor({
        patternRegistry: registry,
        deterministicMode: true,
      });

      const problem: Problem = {
        id: "test-performance",
        description: "Complex problem requiring pattern matching across multiple domains",
        context: "Large scale production environment with database, API, and security concerns",
        constraints: ["Time sensitive", "Resource constrained"],
        goals: ["Identify root cause", "Propose solutions"],
      };

      const startTime = Date.now();
      const result = await processor.process(problem);
      const duration = Date.now() - startTime;

      // Should complete within 5 seconds (sanity check)
      expect(duration).toBeLessThan(5000);

      // Should have valid result
      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.processingTime).toBeLessThan(5000);
    });
  });
});
