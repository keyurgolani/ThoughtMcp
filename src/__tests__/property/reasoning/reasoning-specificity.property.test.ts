/**
 * Property Test: Reasoning Specificity
 *
 * **Feature: mcp-tool-improvements, Property 5: Reasoning Specificity**
 *
 * This property test validates that reasoning streams produce problem-specific
 * insights rather than generic recommendations.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 *
 * - Requirement 4.1: WHEN analytical mode analyzes a well-defined problem THEN
 *   the output SHALL provide specific analysis rather than recommending "additional data collection"
 * - Requirement 4.2: WHEN creative mode generates ideas THEN the ideas SHALL be
 *   specific to the problem domain rather than generic suggestions
 * - Requirement 4.3: WHEN critical mode identifies weaknesses THEN the weaknesses
 *   SHALL reference specific aspects of the problem
 * - Requirement 4.4: WHEN synthetic mode finds patterns THEN the patterns SHALL
 *   connect specific elements from the problem context
 *
 * @module __tests__/property/reasoning/reasoning-specificity.property.test
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { AnalyticalStreamProcessor } from "../../../reasoning/streams/analytical-stream";
import { CreativeStreamProcessor } from "../../../reasoning/streams/creative-stream";
import { CriticalStreamProcessor } from "../../../reasoning/streams/critical-stream";
import { SyntheticStreamProcessor } from "../../../reasoning/streams/synthetic-stream";
import type { Problem } from "../../../reasoning/types";

describe("Property 5: Reasoning Specificity", () => {
  /**
   * Helper to create a well-defined problem
   */
  const createProblem = (
    id: string,
    description: string,
    context: string,
    constraints: string[],
    goals: string[],
    complexity: "simple" | "moderate" | "complex",
    urgency: "low" | "medium" | "high"
  ): Problem => ({ id, description, context, constraints, goals, complexity, urgency });

  /**
   * Arbitrary for generating well-defined problems with specific domain terms
   * These problems have clear context and should NOT trigger generic responses
   */
  const wellDefinedProblemArb = fc.constantFrom<Problem>(
    // Performance domain
    createProblem(
      "perf-1",
      "Optimize database query performance for user search functionality",
      "Current search queries take 2.5 seconds average. Index analysis shows missing composite indexes on user_name and email columns. Query plans show full table scans.",
      ["Cannot modify schema structure", "Must maintain backward compatibility"],
      ["Reduce query time to under 500ms", "Improve index utilization"],
      "moderate",
      "high"
    ),
    // User experience domain
    createProblem(
      "ux-1",
      "Improve checkout conversion rate for e-commerce platform",
      "Checkout abandonment rate is 68%. Analytics show 40% drop at payment step, 28% at shipping address. User feedback mentions confusing form layout.",
      ["Must support existing payment providers", "Mobile-first design required"],
      ["Reduce abandonment to 45%", "Simplify payment flow"],
      "moderate",
      "high"
    ),
    // Security domain
    createProblem(
      "sec-1",
      "Implement rate limiting for API authentication endpoints",
      "Security audit identified brute force vulnerability. Current system allows unlimited login attempts. Logs show 10,000+ failed attempts from single IPs.",
      ["Must not impact legitimate users", "Redis available for state storage"],
      ["Block brute force attacks", "Implement progressive delays"],
      "moderate",
      "high"
    ),
    // Data pipeline domain
    createProblem(
      "data-1",
      "Design ETL pipeline for real-time analytics dashboard",
      "Business needs real-time sales metrics. Current batch processing has 4-hour delay. Data sources include PostgreSQL, MongoDB, and external APIs.",
      ["Budget limited to $500/month cloud costs", "Must handle 1M events/day"],
      ["Achieve sub-minute data freshness", "Support historical queries"],
      "complex",
      "medium"
    ),
    // Scalability domain
    createProblem(
      "scale-1",
      "Scale notification service to handle 10x traffic increase",
      "Current system handles 100K notifications/hour. Marketing campaign will require 1M/hour. Bottleneck identified in message queue processing.",
      ["Zero downtime during migration", "Maintain delivery guarantees"],
      ["Handle 1M notifications/hour", "Keep latency under 5 seconds"],
      "complex",
      "high"
    ),
    // Testing domain
    createProblem(
      "test-1",
      "Implement integration testing strategy for microservices",
      "12 microservices with complex dependencies. Current unit test coverage is 85% but integration failures occur in production. Services communicate via REST and message queues.",
      ["CI pipeline must complete in under 15 minutes", "Limited test environment budget"],
      ["Catch integration issues before production", "Automate regression testing"],
      "complex",
      "medium"
    )
  );

  /**
   * Generic phrases that should NOT appear in well-defined problem analysis
   * These indicate the reasoning is not problem-specific
   */
  const GENERIC_PHRASES = [
    /additional data collection/i,
    /gather more information/i,
    /need more data/i,
    /collect additional data/i,
    /further investigation needed/i,
    /more research required/i,
    /generic solution/i,
    /standard approach/i,
    /typical solution/i,
    /common practice/i,
  ];

  const analyticalProcessor = new AnalyticalStreamProcessor();
  const creativeProcessor = new CreativeStreamProcessor();
  const criticalProcessor = new CriticalStreamProcessor();
  const syntheticProcessor = new SyntheticStreamProcessor();

  /**
   * Helper to check if text contains generic phrases
   */
  function containsGenericPhrase(text: string): boolean {
    return GENERIC_PHRASES.some((pattern) => pattern.test(text));
  }

  /**
   * Helper to check if text contains problem-specific content
   */
  function containsSpecificContent(text: string, problem: Problem): boolean {
    // Check for domain-specific terms from the problem
    const problemTerms = problem.description.toLowerCase().split(/\s+/);
    const contextTerms = problem.context.toLowerCase().split(/\s+/);
    const allTerms = [...problemTerms, ...contextTerms];

    // Filter to meaningful terms (length > 4, not common words)
    const commonWords = new Set([
      "the",
      "and",
      "for",
      "with",
      "that",
      "this",
      "from",
      "have",
      "been",
      "will",
      "must",
      "should",
      "could",
      "would",
      "about",
      "which",
      "their",
      "there",
      "where",
      "when",
      "what",
      "current",
      "system",
    ]);
    const meaningfulTerms = allTerms.filter(
      (term) => term.length > 4 && !commonWords.has(term) && /^[a-z]+$/.test(term)
    );

    const textLower = text.toLowerCase();

    // Check if any meaningful term appears in the text
    return meaningfulTerms.some((term) => textLower.includes(term));
  }

  /**
   * **Feature: mcp-tool-improvements, Property 5: Reasoning Specificity**
   * **Validates: Requirement 4.1**
   *
   * Analytical mode SHALL provide specific analysis rather than generic recommendations
   */
  describe("Analytical mode specificity", () => {
    it("should not recommend 'additional data collection' for well-defined problems", async () => {
      await fc.assert(
        fc.asyncProperty(wellDefinedProblemArb, async (problem) => {
          const result = await analyticalProcessor.process(problem);

          // Check conclusion does not contain generic phrases
          expect(containsGenericPhrase(result.conclusion)).toBe(false);

          // Check reasoning steps do not contain generic phrases
          for (const step of result.reasoning) {
            // Allow generic phrases only if they're followed by specific details
            if (containsGenericPhrase(step)) {
              // If generic phrase exists, it should be accompanied by specifics
              expect(containsSpecificContent(step, problem)).toBe(true);
            }
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it("should reference problem-specific terms in insights", async () => {
      await fc.assert(
        fc.asyncProperty(wellDefinedProblemArb, async (problem) => {
          const result = await analyticalProcessor.process(problem);

          // At least some insights should contain problem-specific content
          const specificInsights = result.insights.filter((insight) =>
            containsSpecificContent(insight.content, problem)
          );

          // At least 50% of insights should be problem-specific
          const specificRatio = specificInsights.length / Math.max(result.insights.length, 1);
          expect(specificRatio).toBeGreaterThanOrEqual(0.5);

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 5: Reasoning Specificity**
   * **Validates: Requirement 4.2**
   *
   * Creative mode SHALL generate ideas specific to the problem domain
   */
  describe("Creative mode specificity", () => {
    it("should generate domain-specific ideas", async () => {
      await fc.assert(
        fc.asyncProperty(wellDefinedProblemArb, async (problem) => {
          const result = await creativeProcessor.process(problem);

          // Check that insights reference problem domain
          const domainSpecificInsights = result.insights.filter((insight) =>
            containsSpecificContent(insight.content, problem)
          );

          // At least 40% of creative insights should be domain-specific
          const specificRatio = domainSpecificInsights.length / Math.max(result.insights.length, 1);
          expect(specificRatio).toBeGreaterThanOrEqual(0.4);

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it("should not produce purely generic suggestions", async () => {
      await fc.assert(
        fc.asyncProperty(wellDefinedProblemArb, async (problem) => {
          const result = await creativeProcessor.process(problem);

          // Conclusion should not be purely generic
          expect(containsSpecificContent(result.conclusion, problem)).toBe(true);

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 5: Reasoning Specificity**
   * **Validates: Requirement 4.3**
   *
   * Critical mode SHALL reference specific aspects of the problem
   */
  describe("Critical mode specificity", () => {
    it("should identify weaknesses referencing problem aspects", async () => {
      await fc.assert(
        fc.asyncProperty(wellDefinedProblemArb, async (problem) => {
          const result = await criticalProcessor.process(problem);

          // Reasoning should reference specific problem aspects
          const specificReasoningSteps = result.reasoning.filter((step) =>
            containsSpecificContent(step, problem)
          );

          // At least 30% of reasoning should be problem-specific
          const specificRatio =
            specificReasoningSteps.length / Math.max(result.reasoning.length, 1);
          expect(specificRatio).toBeGreaterThanOrEqual(0.3);

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it("should produce insights that reference problem context", async () => {
      await fc.assert(
        fc.asyncProperty(wellDefinedProblemArb, async (problem) => {
          const result = await criticalProcessor.process(problem);

          // At least some insights should reference problem context
          const contextualInsights = result.insights.filter((insight) =>
            containsSpecificContent(insight.content, problem)
          );

          expect(contextualInsights.length).toBeGreaterThan(0);

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 5: Reasoning Specificity**
   * **Validates: Requirement 4.4**
   *
   * Synthetic mode SHALL connect specific elements from problem context
   */
  describe("Synthetic mode specificity", () => {
    it("should connect patterns to problem elements", async () => {
      await fc.assert(
        fc.asyncProperty(wellDefinedProblemArb, async (problem) => {
          const result = await syntheticProcessor.process(problem);

          // Conclusion should reference problem-specific elements
          expect(containsSpecificContent(result.conclusion, problem)).toBe(true);

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it("should produce holistic insights referencing problem context", async () => {
      await fc.assert(
        fc.asyncProperty(wellDefinedProblemArb, async (problem) => {
          const result = await syntheticProcessor.process(problem);

          // At least some insights should synthesize problem-specific elements
          const syntheticInsights = result.insights.filter((insight) =>
            containsSpecificContent(insight.content, problem)
          );

          // At least 40% of synthetic insights should reference problem context
          const specificRatio = syntheticInsights.length / Math.max(result.insights.length, 1);
          expect(specificRatio).toBeGreaterThanOrEqual(0.4);

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 5: Reasoning Specificity**
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
   *
   * All streams SHALL avoid purely generic output
   */
  describe("Cross-stream specificity", () => {
    it("all streams should produce problem-specific conclusions", async () => {
      await fc.assert(
        fc.asyncProperty(wellDefinedProblemArb, async (problem) => {
          const [analytical, creative, critical, synthetic] = await Promise.all([
            analyticalProcessor.process(problem),
            creativeProcessor.process(problem),
            criticalProcessor.process(problem),
            syntheticProcessor.process(problem),
          ]);

          // All conclusions should contain problem-specific content
          expect(containsSpecificContent(analytical.conclusion, problem)).toBe(true);
          expect(containsSpecificContent(creative.conclusion, problem)).toBe(true);
          expect(containsSpecificContent(critical.conclusion, problem)).toBe(true);
          expect(containsSpecificContent(synthetic.conclusion, problem)).toBe(true);

          return true;
        }),
        { numRuns: 30 }
      );
    });

    it("all streams should have at least one problem-specific insight", async () => {
      await fc.assert(
        fc.asyncProperty(wellDefinedProblemArb, async (problem) => {
          const [analytical, creative, critical, synthetic] = await Promise.all([
            analyticalProcessor.process(problem),
            creativeProcessor.process(problem),
            criticalProcessor.process(problem),
            syntheticProcessor.process(problem),
          ]);

          // Each stream should have at least one specific insight
          const hasSpecificAnalytical = analytical.insights.some((i) =>
            containsSpecificContent(i.content, problem)
          );
          const hasSpecificCreative = creative.insights.some((i) =>
            containsSpecificContent(i.content, problem)
          );
          const hasSpecificCritical = critical.insights.some((i) =>
            containsSpecificContent(i.content, problem)
          );
          const hasSpecificSynthetic = synthetic.insights.some((i) =>
            containsSpecificContent(i.content, problem)
          );

          expect(hasSpecificAnalytical).toBe(true);
          expect(hasSpecificCreative).toBe(true);
          expect(hasSpecificCritical).toBe(true);
          expect(hasSpecificSynthetic).toBe(true);

          return true;
        }),
        { numRuns: 30 }
      );
    });
  });
});
