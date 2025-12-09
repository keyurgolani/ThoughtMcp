/**
 * Property Test: Reasoning Outputs Reference Problem Terms
 *
 * **Feature: reasoning-quality-improvements, Property 1: Reasoning outputs reference problem terms**
 *
 * This property test validates that reasoning streams produce outputs that
 * reference specific elements from the problem statement.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 *
 * - Requirement 1.1: WHEN the think tool analyzes a problem THEN the Reasoning Stream
 *   SHALL generate insights that reference specific elements from the problem statement
 * - Requirement 1.2: WHEN the analyze tool applies a framework THEN the Framework Selector
 *   SHALL produce step outputs that incorporate problem-specific terminology and concepts
 * - Requirement 1.3: WHEN reasoning generates hypotheses THEN the Reasoning Stream
 *   SHALL formulate testable predictions based on the actual problem domain
 * - Requirement 1.4: WHEN reasoning identifies solutions THEN the Reasoning Stream
 *   SHALL propose concrete actions relevant to the stated problem context
 *
 * @module __tests__/property/reasoning/reasoning-term-references.property.test
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { KeyTermExtractor } from "../../../reasoning/key-term-extractor";
import { AnalyticalStreamProcessor } from "../../../reasoning/streams/analytical-stream";
import { CreativeStreamProcessor } from "../../../reasoning/streams/creative-stream";
import { CriticalStreamProcessor } from "../../../reasoning/streams/critical-stream";
import { SyntheticStreamProcessor } from "../../../reasoning/streams/synthetic-stream";
import type { Problem } from "../../../reasoning/types";

describe("Property 1: Reasoning outputs reference problem terms", () => {
  const keyTermExtractor = new KeyTermExtractor();
  const analyticalProcessor = new AnalyticalStreamProcessor();
  const creativeProcessor = new CreativeStreamProcessor();
  const criticalProcessor = new CriticalStreamProcessor();
  const syntheticProcessor = new SyntheticStreamProcessor();

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
      "Product catalog has 50K items. Current response time is 800ms average. Cache hit rate is only 30%.",
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
   * **Feature: reasoning-quality-improvements, Property 1: Reasoning outputs reference problem terms**
   * **Validates: Requirements 1.1, 1.3, 1.4**
   *
   * Analytical stream conclusions SHALL contain at least one extracted key term
   */
  describe("Analytical stream term references", () => {
    it("conclusions should contain at least one key term from the problem", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const result = await analyticalProcessor.process(problem);

          // Conclusion should contain at least one key term
          const hasKeyTerm = containsKeyTerm(result.conclusion, problem);
          expect(hasKeyTerm).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("insights should track referenced terms", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const result = await analyticalProcessor.process(problem);

          // At least some insights should have referencedTerms populated
          const insightsWithTerms = result.insights.filter(
            (i) => i.referencedTerms && i.referencedTerms.length > 0
          );

          // At least 50% of insights should track referenced terms
          const ratio = insightsWithTerms.length / Math.max(result.insights.length, 1);
          expect(ratio).toBeGreaterThanOrEqual(0.5);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 1: Reasoning outputs reference problem terms**
   * **Validates: Requirements 1.1, 1.4**
   *
   * Creative stream conclusions SHALL contain at least one extracted key term
   */
  describe("Creative stream term references", () => {
    it("conclusions should contain at least one key term from the problem", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const result = await creativeProcessor.process(problem);

          // Conclusion should contain at least one key term
          const hasKeyTerm = containsKeyTerm(result.conclusion, problem);
          expect(hasKeyTerm).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("insights should track referenced terms", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const result = await creativeProcessor.process(problem);

          // At least some insights should have referencedTerms populated
          const insightsWithTerms = result.insights.filter(
            (i) => i.referencedTerms && i.referencedTerms.length > 0
          );

          // At least 40% of insights should track referenced terms
          const ratio = insightsWithTerms.length / Math.max(result.insights.length, 1);
          expect(ratio).toBeGreaterThanOrEqual(0.4);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 1: Reasoning outputs reference problem terms**
   * **Validates: Requirements 1.1, 1.3**
   *
   * Critical stream conclusions SHALL contain at least one extracted key term
   */
  describe("Critical stream term references", () => {
    it("conclusions should contain at least one key term from the problem", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const result = await criticalProcessor.process(problem);

          // Conclusion should contain at least one key term
          const hasKeyTerm = containsKeyTerm(result.conclusion, problem);
          expect(hasKeyTerm).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("insights should track referenced terms", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const result = await criticalProcessor.process(problem);

          // At least some insights should have referencedTerms populated
          const insightsWithTerms = result.insights.filter(
            (i) => i.referencedTerms && i.referencedTerms.length > 0
          );

          // At least 40% of insights should track referenced terms
          const ratio = insightsWithTerms.length / Math.max(result.insights.length, 1);
          expect(ratio).toBeGreaterThanOrEqual(0.4);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 1: Reasoning outputs reference problem terms**
   * **Validates: Requirements 1.1**
   *
   * Synthetic stream conclusions SHALL contain at least one extracted key term
   */
  describe("Synthetic stream term references", () => {
    it("conclusions should contain at least one key term from the problem", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const result = await syntheticProcessor.process(problem);

          // Conclusion should contain at least one key term
          const hasKeyTerm = containsKeyTerm(result.conclusion, problem);
          expect(hasKeyTerm).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("insights should track referenced terms", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const result = await syntheticProcessor.process(problem);

          // At least some insights should have referencedTerms populated
          const insightsWithTerms = result.insights.filter(
            (i) => i.referencedTerms && i.referencedTerms.length > 0
          );

          // At least 40% of insights should track referenced terms
          const ratio = insightsWithTerms.length / Math.max(result.insights.length, 1);
          expect(ratio).toBeGreaterThanOrEqual(0.4);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 1: Reasoning outputs reference problem terms**
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
   *
   * All streams SHALL produce conclusions with key term references
   */
  describe("Cross-stream term reference validation", () => {
    it("all stream conclusions should reference problem terms", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const [analytical, creative, critical, synthetic] = await Promise.all([
            analyticalProcessor.process(problem),
            creativeProcessor.process(problem),
            criticalProcessor.process(problem),
            syntheticProcessor.process(problem),
          ]);

          // All conclusions should contain at least one key term
          expect(containsKeyTerm(analytical.conclusion, problem)).toBe(true);
          expect(containsKeyTerm(creative.conclusion, problem)).toBe(true);
          expect(containsKeyTerm(critical.conclusion, problem)).toBe(true);
          expect(containsKeyTerm(synthetic.conclusion, problem)).toBe(true);

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it("referenced terms should be from the problem domain", async () => {
      await fc.assert(
        fc.asyncProperty(problemWithKeyTermsArb, async (problem) => {
          const result = await analyticalProcessor.process(problem);
          const keyTerms = keyTermExtractor.extract(problem.description, problem.context);

          // Get all referenced terms from insights
          const allReferencedTerms = result.insights
            .filter((i) => i.referencedTerms)
            .flatMap((i) => i.referencedTerms || []);

          // All referenced terms should be from the extracted key terms
          const validTerms = [
            ...keyTerms.terms,
            ...keyTerms.domainTerms,
            ...keyTerms.nounPhrases,
            keyTerms.primarySubject,
          ].filter(Boolean) as string[];

          for (const term of allReferencedTerms) {
            const isValid = validTerms.some(
              (validTerm) =>
                validTerm.toLowerCase().includes(term.toLowerCase()) ||
                term.toLowerCase().includes(validTerm.toLowerCase())
            );
            expect(isValid).toBe(true);
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });
});
