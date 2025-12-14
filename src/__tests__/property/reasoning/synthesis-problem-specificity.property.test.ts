/**
 * Property Test: Synthesis Preserves Problem Specificity
 *
 * **Feature: reasoning-quality-improvements, Property 2: Synthesis preserves problem specificity**
 *
 * This property test validates that when the ponder tool synthesizes insights
 * from multiple streams, the synthesized output contains terms from the original
 * problem description.
 *
 * **Validates: Requirements 1.5**
 *
 * - Requirement 1.5: WHEN the ponder tool synthesizes insights THEN the Synthesis Engine
 *   SHALL combine perspectives while preserving problem-specific details
 *
 * @module __tests__/property/reasoning/synthesis-problem-specificity.property.test
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { KeyTermExtractor } from "../../../reasoning/key-term-extractor";
import { AnalyticalStreamProcessor } from "../../../reasoning/streams/analytical-stream";
import { CreativeStreamProcessor } from "../../../reasoning/streams/creative-stream";
import { CriticalStreamProcessor } from "../../../reasoning/streams/critical-stream";
import { SyntheticStreamProcessor } from "../../../reasoning/streams/synthetic-stream";
import { ResultSynthesisEngine } from "../../../reasoning/synthesis-engine";
import type { Problem, StreamResult } from "../../../reasoning/types";

describe("Property 2: Synthesis preserves problem specificity", () => {
  const keyTermExtractor = new KeyTermExtractor();
  const analyticalProcessor = new AnalyticalStreamProcessor();
  const creativeProcessor = new CreativeStreamProcessor();
  const criticalProcessor = new CriticalStreamProcessor();
  const syntheticProcessor = new SyntheticStreamProcessor();
  const synthesisEngine = new ResultSynthesisEngine();

  /**
   * Helper to create a problem with extractable key terms
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
   * Arbitrary for generating problems with extractable key terms
   */
  const problemWithKeyTermsArb = fc.constantFrom<Problem>(
    createProblem(
      "db-1",
      "Optimize database query performance for user search",
      "Current queries take 2.5 seconds. Index analysis shows missing composite indexes on user_name and email columns.",
      ["Cannot modify schema structure"],
      ["Reduce query time to under 500ms"],
      "moderate",
      "high"
    ),
    createProblem(
      "api-1",
      "Implement rate limiting for API authentication endpoints",
      "Security audit identified brute force vulnerability. Current system allows unlimited login attempts.",
      ["Must not impact legitimate users"],
      ["Block brute force attacks"],
      "moderate",
      "high"
    ),
    createProblem(
      "scale-1",
      "Scale notification service to handle increased traffic",
      "Current system handles 100K notifications/hour. Marketing campaign will require 1M/hour.",
      ["Zero downtime during migration"],
      ["Handle 1M notifications/hour"],
      "complex",
      "high"
    ),
    createProblem(
      "ux-1",
      "Improve checkout conversion rate for e-commerce platform",
      "Checkout abandonment rate is 68%. Analytics show 40% drop at payment step.",
      ["Must support existing payment providers"],
      ["Reduce abandonment to 45%"],
      "moderate",
      "high"
    ),
    createProblem(
      "cache-1",
      "Design caching strategy for product catalog service",
      "Product catalogms. Current response time is 800ms average. Cache hit rate is only 30%.",
      ["Limited memory budget of 2GB"],
      ["Achieve 95% cache hit rate"],
      "moderate",
      "medium"
    ),
    createProblem(
      "ml-1",
      "Build recommendation engine for content personalization",
      "User engagement is declining. Current recommendations are based on simple popularity metrics.",
      ["Must process in real-time"],
      ["Increase user engagement by 25%"],
      "complex",
      "medium"
    )
  );

  /**
   * Helper to check if text contains at least one key term from the extracted terms
   */
  function containsKeyTerm(text: string, problem: Problem): boolean {
    const keyTerms = keyTermExtractor.extract(problem.description, problem.context);
    return keyTermExtractor.validateTermReference(text, keyTerms);
  }

  /**
   * Helper to check if text contains problem-specific content
   */
  function containsSpecificContent(text: string, problem: Problem): boolean {
    const problemTerms = problem.description.toLowerCase().split(/\s+/);
    const contextTerms = problem.context.toLowerCase().split(/\s+/);
    const allTerms = [...problemTerms, ...contextTerms];

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
    return meaningfulTerms.some((term) => textLower.includes(term));
  }

  /**
   * Helper to run all streams and synthesize results
   */
  async function runParallelReasoningAndSynthesize(problem: Problem): Promise<{
    streamResults: StreamResult[];
    synthesizedResult: ReturnType<typeof synthesisEngine.synthesizeResults>;
  }> {
    const [analytical, creative, critical, synthetic] = await Promise.all([
      analyticalProcessor.process(problem),
      creativeProcessor.process(problem),
      criticalProcessor.process(problem),
      syntheticProcessor.process(problem),
    ]);

    const streamResults = [analytical, creative, critical, synthetic];
    const synthesizedResult = synthesisEngine.synthesizeResults(streamResults);

    return { streamResults, synthesizedResult };
  }

  /**
   * **Feature: reasoning-quality-improvements, Property 2: Synthesis preserves problem specificity**
   * **Validates: Requirements 1.5**
   *
   * Synthesized conclusion SHALL contain terms from the original problem description
   */
  describe("Synthesized conclusion problem specificity", () => {
    it("synthesized conclusion should contain problem-specific content", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const { synthesizedResult } = await runParallelReasoningAndSynthesize(problem);

          // The synthesized conclusion should contain problem-specific content
          const hasSpecificContent = containsSpecificContent(synthesizedResult.conclusion, problem);
          expect(hasSpecificContent).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("synthesized conclusion should reference at least one key term", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const { synthesizedResult } = await runParallelReasoningAndSynthesize(problem);

          // The synthesized conclusion should contain at least one key term
          const hasKeyTerm = containsKeyTerm(synthesizedResult.conclusion, problem);
          expect(hasKeyTerm).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 2: Synthesis preserves problem specificity**
   * **Validates: Requirements 1.5**
   *
   * Synthesized insights SHALL preserve problem-specific details from source streams
   */
  describe("Synthesized insights problem specificity", () => {
    it("at least some synthesized insights should contain problem-specific content", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const { synthesizedResult } = await runParallelReasoningAndSynthesize(problem);

          // At least some insights should contain problem-specific content
          const specificInsights = synthesizedResult.insights.filter((insight) =>
            containsSpecificContent(insight.content, problem)
          );

          // At least 30% of insights should be problem-specific
          const ratio = specificInsights.length / Math.max(synthesizedResult.insights.length, 1);
          expect(ratio).toBeGreaterThanOrEqual(0.3);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("synthesized insights should preserve terms from source stream insights", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const { streamResults, synthesizedResult } =
            await runParallelReasoningAndSynthesize(problem);

          // Collect all terms from source stream insights
          const sourceInsightTerms = new Set<string>();
          for (const result of streamResults) {
            for (const insight of result.insights) {
              if (insight.referencedTerms) {
                for (const term of insight.referencedTerms) {
                  sourceInsightTerms.add(term.toLowerCase());
                }
              }
            }
          }

          // If source streams had referenced terms, synthesized insights should preserve some
          if (sourceInsightTerms.size > 0) {
            const synthesizedContent = synthesizedResult.insights
              .map((i) => i.content.toLowerCase())
              .join(" ");

            // At least one source term should appear in synthesized content
            const hasPreservedTerm = Array.from(sourceInsightTerms).some((term) =>
              synthesizedContent.includes(term)
            );
            expect(hasPreservedTerm).toBe(true);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 2: Synthesis preserves problem specificity**
   * **Validates: Requirements 1.5**
   *
   * Synthesized recommendations SHALL be relevant to the problem domain
   */
  describe("Synthesized recommendations problem specificity", () => {
    it("recommendations should reference problem-specific content when present", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const { synthesizedResult } = await runParallelReasoningAndSynthesize(problem);

          // If there are recommendations, at least some should be problem-specific
          if (synthesizedResult.recommendations.length > 0) {
            const specificRecommendations = synthesizedResult.recommendations.filter((rec) =>
              containsSpecificContent(rec.description, problem)
            );

            // At least one recommendation should be problem-specific
            expect(specificRecommendations.length).toBeGreaterThan(0);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 2: Synthesis preserves problem specificity**
   * **Validates: Requirements 1.5**
   *
   * Synthesis SHALL combine perspectives while maintaining problem context
   */
  describe("Multi-stream synthesis preserves context", () => {
    it("synthesis should combine all stream conclusions with problem context", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const { streamResults, synthesizedResult } =
            await runParallelReasoningAndSynthesize(problem);

          // All streams should have completed
          expect(streamResults.every((r) => r.status === "completed")).toBe(true);

          // Synthesized result should use all streams
          expect(synthesizedResult.metadata.streamsUsed.length).toBe(4);

          // Synthesized conclusion should be longer than any individual conclusion
          // (indicating combination of perspectives)
          const maxIndividualLength = Math.max(...streamResults.map((r) => r.conclusion.length));
          expect(synthesizedResult.conclusion.length).toBeGreaterThanOrEqual(maxIndividualLength);

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it("synthesis quality should reflect problem-specific analysis", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const { synthesizedResult } = await runParallelReasoningAndSynthesize(problem);

          // Quality assessment should be reasonable (not zero)
          expect(synthesizedResult.quality.overallScore).toBeGreaterThan(0);
          expect(synthesizedResult.quality.coherence).toBeGreaterThan(0);
          expect(synthesizedResult.quality.completeness).toBeGreaterThan(0);

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });
});
