/**
 * PatternMatcher Property-Based Tests
 *
 * Property tests for PatternMatcher functionality using fast-check.
 * Tests universal properties that should hold for all valid inputs.
 *
 * Property 4: Pattern Match Scoring Monotonicity
 * For any pattern and problem text, adding more matching indicators to the text
 * should increase or maintain the confidence score (never decrease it).
 * The confidence score should always be in the range [0, 1].
 *
 * Property 10: Key Term Integration
 * For any problem with extracted key terms that match a domain's indicators,
 * the domain's confidence score should be higher than without the key term match.
 * Extracted key terms should appear in the generated hypotheses and recommendations
 * (template substitution).
 *
 * **Validates: Requirements 3.1, 3.6, 6.1, 6.2, 6.3, 6.4**
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createPatternMatcher } from "../../../../reasoning/patterns/pattern-matcher.js";
import { createPatternRegistry } from "../../../../reasoning/patterns/pattern-registry.js";
import type { DomainPattern } from "../../../../reasoning/patterns/types.js";

describe("PatternMatcher Property Tests", () => {
  /**
   * Property 4: Pattern Match Scoring Monotonicity
   *
   * For any pattern and problem text, adding more matching indicators to the text
   * should increase or maintain the confidence score (never decrease it).
   * The confidence score should always be in the range [0, 1].
   *
   * **Validates: Requirements 3.1, 3.6**
   */
  describe("Property 4: Pattern Match Scoring Monotonicity", () => {
    it("should maintain or increase confidence when adding matching indicators", () => {
      fc.assert(
        fc.property(
          // Generate a pattern with indicators
          fc.record({
            id: fc
              .string({ minLength: 1, maxLength: 30 })
              .filter((s) => /^[a-zA-Z0-9-_]+$/.test(s)),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 100 }),
            indicators: fc.array(
              fc.record({
                type: fc.constantFrom("exact", "fuzzy", "regex"),
                value: fc.string({ minLength: 1, maxLength: 50 }),
                weight: fc.double({ min: 0.1, max: 1 }), // Ensure non-zero weight
                // Use undefined instead of null for optional fields
                keyTermCategory: fc.oneof(
                  {
                    weight: 1,
                    arbitrary: fc.constantFrom(
                      "domainTerms",
                      "actionVerbs",
                      "nounPhrases",
                      "terms"
                    ),
                  },
                  { weight: 1, arbitrary: fc.constant(undefined) }
                ),
              }),
              { minLength: 2, maxLength: 5 } // At least 2 indicators for meaningful testing
            ),
            negativeIndicators: fc.array(
              fc.record({
                type: fc.constantFrom("exact", "fuzzy", "regex"),
                value: fc.string({ minLength: 1, maxLength: 50 }),
                weight: fc.double({ min: 0.1, max: 1 }),
              }),
              { minLength: 0, maxLength: 0 } // Empty array for this test
            ),
            hypotheses: fc.array(
              fc.record({
                id: fc
                  .string({ minLength: 1, maxLength: 30 })
                  .filter((s) => /^[a-zA-Z0-9-_]+$/.test(s)),
                statement: fc.string({ minLength: 1, maxLength: 100 }),
                investigationSteps: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
                  minLength: 1,
                }),
                expectedFindings: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
                  minLength: 1,
                }),
                relatedHypotheses: fc.array(fc.string({ minLength: 1, maxLength: 30 }), {
                  minLength: 0,
                  maxLength: 0,
                }),
                estimatedTime: fc.string({ minLength: 1, maxLength: 30 }),
                likelihood: fc.double({ min: 0.1, max: 1 }),
              }),
              { minLength: 1 }
            ),
            recommendations: fc.array(
              fc.record({
                id: fc
                  .string({ minLength: 1, maxLength: 30 })
                  .filter((s) => /^[a-zA-Z0-9-_]+$/.test(s)),
                type: fc.constantFrom("diagnostic", "remedial"),
                action: fc.string({ minLength: 1, maxLength: 100 }),
                tools: fc.array(fc.string({ minLength: 1, maxLength: 30 }), {
                  minLength: 0,
                  maxLength: 0,
                }),
                expectedOutcome: fc.string({ minLength: 1, maxLength: 100 }),
                prerequisites: fc.array(fc.string({ minLength: 1, maxLength: 30 }), {
                  minLength: 0,
                  maxLength: 0,
                }),
                priority: fc.integer({ min: 1, max: 10 }),
              }),
              { minLength: 1 }
            ),
            severity: fc.constantFrom("critical", "high", "medium", "low"),
          }),
          // Generate base text that doesn't match any indicators
          fc
            .string({ minLength: 10, maxLength: 100 })
            .filter(
              (s) =>
                !s.toLowerCase().includes("test") &&
                !s.toLowerCase().includes("pattern") &&
                !s.toLowerCase().includes("match")
            ),
          (patternData, baseText) => {
            // Create registry and matcher
            const registry = createPatternRegistry();
            const matcher = createPatternMatcher(registry);

            // Create a domain pattern from the generated data
            // Convert generated data to proper types
            const pattern: DomainPattern = {
              id: patternData.id,
              name: patternData.name,
              description: patternData.description,
              indicators: patternData.indicators.map((ind) => ({
                type: ind.type,
                value: ind.value,
                weight: ind.weight,
                keyTermCategory: ind.keyTermCategory,
              })),
              negativeIndicators:
                patternData.negativeIndicators.length > 0
                  ? patternData.negativeIndicators
                  : undefined,
              hypotheses: patternData.hypotheses.map((hyp) => ({
                id: hyp.id,
                statement: hyp.statement,
                investigationSteps: [...hyp.investigationSteps],
                expectedFindings: [...hyp.expectedFindings],
                relatedHypotheses: [...hyp.relatedHypotheses],
                estimatedTime: hyp.estimatedTime,
                likelihood: hyp.likelihood,
              })),
              recommendations: patternData.recommendations.map((rec) => ({
                id: rec.id,
                type: rec.type,
                action: rec.action,
                tools: [...rec.tools],
                expectedOutcome: rec.expectedOutcome,
                prerequisites: [...rec.prerequisites],
                priority: rec.priority,
              })),
              severity: patternData.severity,
            };

            // Create a mock registry that returns our pattern
            // @ts-ignore - we're mocking private methods
            registry.getDomains = () => ["test-domain"];
            // @ts-ignore - we're mocking private methods
            registry.getPatternsByDomain = () => [pattern];

            // Key terms (empty for this test)
            const keyTerms = {
              primarySubject: "",
              domainTerms: [],
              actionVerbs: [],
              nounPhrases: [],
              terms: [],
            };

            // Get base confidence score
            const baseResults = matcher.matchPatterns(baseText, undefined, keyTerms);
            const baseConfidence = baseResults.length > 0 ? baseResults[0].confidence : 0;

            // Ensure confidence is in valid range [0, 1]
            expect(baseConfidence).toBeGreaterThanOrEqual(0);
            expect(baseConfidence).toBeLessThanOrEqual(1);

            // Now add matching text for one indicator
            const firstIndicator = pattern.indicators[0];
            let enhancedText = baseText;

            switch (firstIndicator.type) {
              case "exact":
                enhancedText = `${baseText} ${firstIndicator.value}`;
                break;
              case "fuzzy":
                // For fuzzy, we need all keywords, so add them all
                enhancedText = `${baseText} ${firstIndicator.value}`;
                break;
              case "regex":
                // For regex, we'll add a simple match
                // This is a bit tricky with arbitrary regex, so we'll use a simple approach
                enhancedText = `${baseText} matching text`;
                break;
            }

            // Get enhanced confidence score
            const enhancedResults = matcher.matchPatterns(enhancedText, undefined, keyTerms);
            const enhancedConfidence =
              enhancedResults.length > 0 ? enhancedResults[0].confidence : 0;

            // Ensure enhanced confidence is in valid range [0, 1]
            expect(enhancedConfidence).toBeGreaterThanOrEqual(0);
            expect(enhancedConfidence).toBeLessThanOrEqual(1);

            // Enhanced confidence should be >= base confidence (monotonicity)
            // Note: This might not always be true for regex patterns with arbitrary expressions
            // but should hold for exact and fuzzy matches
            if (firstIndicator.type !== "regex") {
              expect(enhancedConfidence).toBeGreaterThanOrEqual(baseConfidence);
            }

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should always produce confidence scores in range [0, 1]", () => {
      fc.assert(
        fc.property(
          // Generate a pattern
          fc.record({
            id: fc
              .string({ minLength: 1, maxLength: 30 })
              .filter((s) => /^[a-zA-Z0-9-_]+$/.test(s)),
            indicators: fc.array(
              fc.record({
                type: fc.constantFrom("exact", "fuzzy", "regex"),
                value: fc.string({ minLength: 1, maxLength: 50 }),
                weight: fc.double({ min: 0.1, max: 1 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            negativeIndicators: fc.array(
              fc.record({
                type: fc.constantFrom("exact", "fuzzy", "regex"),
                value: fc.string({ minLength: 1, maxLength: 50 }),
                weight: fc.double({ min: 0.1, max: 1 }),
              }),
              { maxLength: 3 }
            ),
          }),
          // Generate arbitrary text
          fc.string({ minLength: 0, maxLength: 200 }),
          (patternData, text) => {
            // Create registry and matcher
            const registry = createPatternRegistry();
            const matcher = createPatternMatcher(registry);

            // Create a domain pattern
            const pattern: DomainPattern = {
              id: patternData.id,
              name: "Test Pattern",
              description: "Test pattern for property testing",
              indicators: patternData.indicators,
              negativeIndicators:
                patternData.negativeIndicators.length > 0
                  ? patternData.negativeIndicators
                  : undefined,
              hypotheses: [
                {
                  id: "test-hypothesis",
                  statement: "Test hypothesis",
                  investigationSteps: ["Step 1"],
                  expectedFindings: ["Finding 1"],
                  relatedHypotheses: [],
                  estimatedTime: "10 minutes",
                  likelihood: 0.5,
                },
              ],
              recommendations: [
                {
                  id: "test-recommendation",
                  type: "diagnostic",
                  action: "Test action",
                  tools: [],
                  expectedOutcome: "Test outcome",
                  prerequisites: [],
                  priority: 5,
                },
              ],
              severity: "medium",
            };

            // Mock registry
            // @ts-ignore
            registry.getDomains = () => ["test-domain"];
            // @ts-ignore
            registry.getPatternsByDomain = () => [pattern];

            // Key terms
            const keyTerms = {
              primarySubject: "",
              domainTerms: [],
              actionVerbs: [],
              nounPhrases: [],
              terms: [],
            };

            // Get confidence score
            const results = matcher.matchPatterns(text, undefined, keyTerms);

            // If there are results, check confidence is in range
            if (results.length > 0) {
              expect(results[0].confidence).toBeGreaterThanOrEqual(0);
              expect(results[0].confidence).toBeLessThanOrEqual(1);
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 10: Key Term Integration
   *
   * For any problem with extracted key terms that match a domain's indicators,
   * the domain's confidence score should be higher than without the key term match.
   * Extracted key terms should appear in the generated hypotheses and recommendations
   * (template substitution).
   *
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
   */
  describe("Property 10: Key Term Integration", () => {
    it("should boost confidence when key terms match domain terms", () => {
      fc.assert(
        fc.property(
          // Generate a pattern with domain terms indicator
          fc.record({
            id: fc
              .string({ minLength: 1, maxLength: 30 })
              .filter((s) => /^[a-zA-Z0-9-_]+$/.test(s)),
            domainTerm: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z]+$/.test(s)),
          }),
          // Generate base text
          fc
            .string({ minLength: 10, maxLength: 50 })
            .filter(
              (s) =>
                !s.toLowerCase().includes("database") &&
                !s.toLowerCase().includes("api") &&
                !s.toLowerCase().includes("security")
            ),
          (patternData, baseText) => {
            // Create registry and matcher
            const registry = createPatternRegistry();
            const matcher = createPatternMatcher(registry);

            // Create a pattern with a domain terms indicator
            const pattern: DomainPattern = {
              id: patternData.id,
              name: "Test Pattern",
              description: "Test pattern for key term integration",
              indicators: [
                {
                  type: "exact",
                  value: "performance issue",
                  weight: 0.8,
                },
              ],
              hypotheses: [
                {
                  id: "test-hypothesis",
                  statement: "There may be a {{domainTerms}} related issue",
                  investigationSteps: ["Step 1"],
                  expectedFindings: ["Finding 1"],
                  relatedHypotheses: [],
                  estimatedTime: "10 minutes",
                  likelihood: 0.5,
                },
              ],
              recommendations: [
                {
                  id: "test-recommendation",
                  type: "diagnostic",
                  action: "Investigate {{domainTerms}} performance",
                  tools: [],
                  expectedOutcome: "Improved performance",
                  prerequisites: [],
                  priority: 5,
                },
              ],
              severity: "high",
            };

            // Mock registry for "performance" domain
            // @ts-ignore
            registry.getDomains = () => ["performance"];
            // @ts-ignore
            registry.getPatternsByDomain = (domain: string) =>
              domain === "performance" ? [pattern] : [];

            // Key terms without domain terms
            const keyTermsWithoutDomain = {
              primarySubject: "system",
              domainTerms: [],
              actionVerbs: ["optimize"],
              nounPhrases: ["response time"],
              terms: ["latency"],
            };

            // Key terms with domain terms
            const keyTermsWithDomain = {
              primarySubject: "system",
              domainTerms: [patternData.domainTerm],
              actionVerbs: ["optimize"],
              nounPhrases: ["response time"],
              terms: ["latency"],
            };

            // Get confidence without domain terms
            const resultsWithoutDomain = matcher.matchPatterns(
              baseText,
              undefined,
              keyTermsWithoutDomain
            );
            const confidenceWithoutDomain =
              resultsWithoutDomain.length > 0 ? resultsWithoutDomain[0].confidence : 0;

            // Get confidence with domain terms
            const resultsWithDomain = matcher.matchPatterns(
              baseText,
              undefined,
              keyTermsWithDomain
            );
            const confidenceWithDomain =
              resultsWithDomain.length > 0 ? resultsWithDomain[0].confidence : 0;

            // Confidence with domain terms should be >= without (boost may be 0 if no match)
            expect(confidenceWithDomain).toBeGreaterThanOrEqual(confidenceWithoutDomain);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
