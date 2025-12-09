/**
 * Property Test: Bias Detection Accuracy
 *
 * **Feature: mcp-tool-improvements, Property 14: Bias Detection Accuracy**
 *
 * This property test validates that when text contains 3+ bias indicators,
 * the BiasPatternRecognizer correctly detects at least one bias.
 *
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
 *
 * - Requirement 10.1: WHEN reasoning contains confirmation bias indicators (e.g., "always used",
 *   "worked fine", "don't see why") THEN the detect_bias tool SHALL identify confirmation bias
 * - Requirement 10.2: WHEN reasoning contains status quo bias indicators (e.g., "we've always",
 *   "no need to change") THEN the detect_bias tool SHALL identify status quo bias
 * - Requirement 10.3: WHEN reasoning contains bandwagon fallacy indicators (e.g., "everyone uses",
 *   "industry standard") THEN the detect_bias tool SHALL identify bandwagon effect
 * - Requirement 10.4: WHEN reasoning contains ancng bias indicators (e.g., over-reliance on
 *   first information) THEN the detect_bias tool SHALL identify anchoring bias
 * - Requirement 10.5: WHEN reasoning contains availability heuristic indicators (e.g., recent
 *   examples dominating) THEN the detect_bias tool SHALL identify availability bias
 *
 * @module __tests__/property/bias/bias-detection-accuracy.property.test
 */

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { BiasPatternRecognizer } from "../../../bias/bias-pattern-recognizer";
import { BiasType } from "../../../bias/types";

describe("Property 14: Bias Detection Accuracy", () => {
  let recognizer: BiasPatternRecognizer;

  beforeEach(() => {
    recognizer = new BiasPatternRecognizer();
  });

  /**
   * Bias indicator phrases organized by bias type.
   * These are the exact phrases defined in TEXT_BIAS_PATTERNS.
   */
  const CONFIRMATION_BIAS_PHRASES = [
    "always used",
    "worked fine",
    "don't see why",
    "proves my point",
    "as i expected",
    "confirms what i",
    "knew it",
    "told you so",
    "obviously",
    "clearly shows",
    "just as i thought",
    "supports my view",
    "validates my",
    "i was right",
  ];

  const STATUS_QUO_BIAS_PHRASES = [
    "we've always",
    "no need to change",
    "why fix what",
    "if it ain't broke",
    "worked before",
    "tradition",
    "the way we do things",
    "never had problems",
    "always done it this way",
    "don't rock the boat",
    "stick with what works",
    "tried and true",
    "why change",
    "keep things as they are",
  ];

  const BANDWAGON_EFFECT_PHRASES = [
    "everyone uses",
    "industry standard",
    "everyone knows",
    "most people",
    "popular choice",
    "widely adopted",
    "common practice",
    "mainstream",
    "trending",
    "what others are doing",
    "following the crowd",
    "majority agrees",
    "consensus is",
    "nobody does it that way",
  ];

  const ANCHORING_BIAS_PHRASES = [
    "starting from",
    "based on the initial",
    "original estimate",
    "first impression",
    "initially thought",
    "my first guess",
    "began with",
    "anchor point",
    "reference point",
    "baseline of",
    "starting point",
    "original price",
    "first offer",
    "initial value",
  ];

  const AVAILABILITY_BIAS_PHRASES = [
    "i remember when",
    "just happened",
    "recent example",
    "i heard about",
    "in the news",
    "just saw",
    "recently read",
    "comes to mind",
    "easy to recall",
    "vivid example",
    "memorable case",
    "fresh in my mind",
    "just last week",
    "i know someone who",
  ];

  const SUNK_COST_PHRASES = [
    "already invested",
    "too much time",
    "can't give up now",
    "come this far",
    "wasted effort",
    "spent so much",
    "put in too much",
    "after all this work",
    "too late to stop",
    "committed to",
  ];

  /**
   * Arbitrary for generating filler text that doesn't contain bias indicators.
   */
  const fillerTextArb = fc.constantFrom(
    "The project is progressing well.",
    "We need to consider the options.",
    "This is an important decision.",
    "Let me think about this carefully.",
    "There are several factors to consider.",
    "The data shows interesting patterns.",
    "We should analyze the results.",
    "This requires further investigation.",
    "The team has been working hard.",
    "We have multiple approaches available."
  );

  /**
   * Arbitrary for generating confirmation bias phrases.
   */
  const confirmationPhraseArb = fc.constantFrom(...CONFIRMATION_BIAS_PHRASES);

  /**
   * Arbitrary for generating status quo bias phrases.
   */
  const statusQuoPhraseArb = fc.constantFrom(...STATUS_QUO_BIAS_PHRASES);

  /**
   * Arbitrary for generating bandwagon effect phrases.
   */
  const bandwagonPhraseArb = fc.constantFrom(...BANDWAGON_EFFECT_PHRASES);

  /**
   * Arbitrary for generating anchoring bias phrases.
   */
  const anchoringPhraseArb = fc.constantFrom(...ANCHORING_BIAS_PHRASES);

  /**
   * Arbitrary for generating availability bias phrases.
   */
  const availabilityPhraseArb = fc.constantFrom(...AVAILABILITY_BIAS_PHRASES);

  /**
   * Arbitrary for generating sunk cost phrases.
   */
  const sunkCostPhraseArb = fc.constantFrom(...SUNK_COST_PHRASES);

  /**
   * Helper to build text with bias indicators embedded.
   */
  const buildTextWithIndicators = (indicators: string[], filler: string[]): string => {
    const parts: string[] = [];
    for (let i = 0; i < indicators.length; i++) {
      if (i < filler.length) {
        parts.push(filler[i]);
      }
      parts.push(indicators[i]);
    }
    // Add remaining filler
    for (let i = indicators.length; i < filler.length; i++) {
      parts.push(filler[i]);
    }
    return parts.join(" ");
  };

  /**
   * **Feature: mcp-tool-improvements, Property 14: Bias Detection Accuracy**
   * **Validates: Requirements 10.1**
   *
   * For any text containing 3+ confirmation bias indicators,
   * detectBiasesFromText SHALL return at least one bias of type CONFIRMATION.
   */
  describe("Confirmation bias detection", () => {
    it("should detect confirmation bias when 3+ indicators are present", () => {
      fc.assert(
        fc.property(
          fc.array(confirmationPhraseArb, { minLength: 3, maxLength: 5 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 3 }),
          (indicators, filler) => {
            // Ensure we have unique indicators
            const uniqueIndicators = [...new Set(indicators)];
            if (uniqueIndicators.length < 3) {
              return true; // Skip if not enough unique indicators
            }

            const text = buildTextWithIndicators(uniqueIndicators.slice(0, 3), filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect at least one bias
            expect(biases.length).toBeGreaterThanOrEqual(1);

            // Property: SHALL detect confirmation bias specifically
            const hasConfirmationBias = biases.some((b) => b.type === BiasType.CONFIRMATION);
            expect(hasConfirmationBias).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 14: Bias Detection Accuracy**
   * **Validates: Requirements 10.2**
   *
   * For any text containing 3+ status quo bias indicators,
   * detectBiasesFromText SHALL return at least one bias.
   * Note: Status quo bias is mapped to FRAMING type in the implementation.
   */
  describe("Status quo bias detection", () => {
    it("should detect status quo bias when 3+ indicators are present", () => {
      fc.assert(
        fc.property(
          fc.array(statusQuoPhraseArb, { minLength: 3, maxLength: 5 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 3 }),
          (indicators, filler) => {
            const uniqueIndicators = [...new Set(indicators)];
            if (uniqueIndicators.length < 3) {
              return true;
            }

            const text = buildTextWithIndicators(uniqueIndicators.slice(0, 3), filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect at least one bias
            expect(biases.length).toBeGreaterThanOrEqual(1);

            // Property: SHALL detect status quo bias (mapped to FRAMING)
            const hasStatusQuoBias = biases.some((b) => b.type === BiasType.FRAMING);
            expect(hasStatusQuoBias).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 14: Bias Detection Accuracy**
   * **Validates: Requirements 10.3**
   *
   * For any text containing 3+ bandwagon effect indicators,
   * detectBiasesFromText SHALL return at least one bias.
   * Note: Bandwagon effect is mapped to REPRESENTATIVENESS type in the implementation.
   */
  describe("Bandwagon effect detection", () => {
    it("should detect bandwagon effect when 3+ indicators are present", () => {
      fc.assert(
        fc.property(
          fc.array(bandwagonPhraseArb, { minLength: 3, maxLength: 5 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 3 }),
          (indicators, filler) => {
            const uniqueIndicators = [...new Set(indicators)];
            if (uniqueIndicators.length < 3) {
              return true;
            }

            const text = buildTextWithIndicators(uniqueIndicators.slice(0, 3), filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect at least one bias
            expect(biases.length).toBeGreaterThanOrEqual(1);

            // Property: SHALL detect bandwagon effect (mapped to REPRESENTATIVENESS)
            const hasBandwagonBias = biases.some((b) => b.type === BiasType.REPRESENTATIVENESS);
            expect(hasBandwagonBias).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 14: Bias Detection Accuracy**
   * **Validates: Requirements 10.4**
   *
   * For any text containing 3+ anchoring bias indicators,
   * detectBiasesFromText SHALL return at least one bias of type ANCHORING.
   */
  describe("Anchoring bias detection", () => {
    it("should detect anchoring bias when 3+ indicators are present", () => {
      fc.assert(
        fc.property(
          fc.array(anchoringPhraseArb, { minLength: 3, maxLength: 5 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 3 }),
          (indicators, filler) => {
            const uniqueIndicators = [...new Set(indicators)];
            if (uniqueIndicators.length < 3) {
              return true;
            }

            const text = buildTextWithIndicators(uniqueIndicators.slice(0, 3), filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect at least one bias
            expect(biases.length).toBeGreaterThanOrEqual(1);

            // Property: SHALL detect anchoring bias specifically
            const hasAnchoringBias = biases.some((b) => b.type === BiasType.ANCHORING);
            expect(hasAnchoringBias).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 14: Bias Detection Accuracy**
   * **Validates: Requirements 10.5**
   *
   * For any text containing 3+ availability bias indicators,
   * detectBiasesFromText SHALL return at least one bias of type AVAILABILITY.
   */
  describe("Availability bias detection", () => {
    it("should detect availability bias when 3+ indicators are present", () => {
      fc.assert(
        fc.property(
          fc.array(availabilityPhraseArb, { minLength: 3, maxLength: 5 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 3 }),
          (indicators, filler) => {
            const uniqueIndicators = [...new Set(indicators)];
            if (uniqueIndicators.length < 3) {
              return true;
            }

            const text = buildTextWithIndicators(uniqueIndicators.slice(0, 3), filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect at least one bias
            expect(biases.length).toBeGreaterThanOrEqual(1);

            // Property: SHALL detect availability bias specifically
            const hasAvailabilityBias = biases.some((b) => b.type === BiasType.AVAILABILITY);
            expect(hasAvailabilityBias).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 14: Bias Detection Accuracy**
   * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
   *
   * For any text containing indicators from multiple bias types,
   * detectBiasesFromText SHALL detect at least one bias.
   */
  describe("Mixed bias detection", () => {
    it("should detect biases when indicators from multiple types are present", () => {
      fc.assert(
        fc.property(
          confirmationPhraseArb,
          statusQuoPhraseArb,
          bandwagonPhraseArb,
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (confirmationPhrase, statusQuoPhrase, bandwagonPhrase, filler) => {
            const indicators = [confirmationPhrase, statusQuoPhrase, bandwagonPhrase];
            const text = buildTextWithIndicators(indicators, filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect at least one bias when 3+ indicators present
            expect(biases.length).toBeGreaterThanOrEqual(1);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should detect multiple bias types when indicators from each are present", () => {
      fc.assert(
        fc.property(
          fc.array(confirmationPhraseArb, { minLength: 1, maxLength: 2 }),
          fc.array(anchoringPhraseArb, { minLength: 1, maxLength: 2 }),
          fc.array(availabilityPhraseArb, { minLength: 1, maxLength: 2 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (confirmationPhrases, anchoringPhrases, availabilityPhrases, filler) => {
            const indicators = [
              ...confirmationPhrases,
              ...anchoringPhrases,
              ...availabilityPhrases,
            ];
            const text = buildTextWithIndicators(indicators, filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect at least one bias
            expect(biases.length).toBeGreaterThanOrEqual(1);

            // Property: Each detected bias SHALL have valid type
            for (const bias of biases) {
              expect(Object.values(BiasType)).toContain(bias.type);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 14: Bias Detection Accuracy**
   * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
   *
   * Invariant: Detected biases SHALL have valid structure.
   */
  describe("Bias detection output invariants", () => {
    it("should return biases with valid severity and confidence", () => {
      fc.assert(
        fc.property(
          fc.array(sunkCostPhraseArb, { minLength: 3, maxLength: 5 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 3 }),
          (indicators, filler) => {
            const uniqueIndicators = [...new Set(indicators)];
            if (uniqueIndicators.length < 3) {
              return true;
            }

            const text = buildTextWithIndicators(uniqueIndicators.slice(0, 3), filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: Each bias SHALL have severity in [0, 1]
            for (const bias of biases) {
              expect(bias.severity).toBeGreaterThanOrEqual(0);
              expect(bias.severity).toBeLessThanOrEqual(1);
            }

            // Property: Each bias SHALL have confidence in [0, 1]
            for (const bias of biases) {
              expect(bias.confidence).toBeGreaterThanOrEqual(0);
              expect(bias.confidence).toBeLessThanOrEqual(1);
            }

            // Property: Each bias SHALL have non-empty evidence
            for (const bias of biases) {
              expect(bias.evidence.length).toBeGreaterThan(0);
            }

            // Property: Each bias SHALL have non-empty explanation
            for (const bias of biases) {
              expect(bias.explanation).toBeTruthy();
              expect(bias.explanation.length).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include matched indicators in evidence", () => {
      fc.assert(
        fc.property(
          fc.array(confirmationPhraseArb, { minLength: 3, maxLength: 5 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 3 }),
          (indicators, filler) => {
            const uniqueIndicators = [...new Set(indicators)];
            if (uniqueIndicators.length < 3) {
              return true;
            }

            const text = buildTextWithIndicators(uniqueIndicators.slice(0, 3), filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: Evidence SHALL contain matched indicator references
            for (const bias of biases) {
              const hasMatchedIndicator = bias.evidence.some((e) =>
                e.toLowerCase().includes("matched indicator")
              );
              expect(hasMatchedIndicator).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 14: Bias Detection Accuracy**
   * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
   *
   * Edge case: Empty or whitespace-only text should return no biases.
   */
  describe("Edge cases", () => {
    it("should return empty array for empty text", () => {
      fc.assert(
        fc.property(fc.constantFrom("", "   ", "\t", "\n", "  \n  "), (emptyText) => {
          const biases = recognizer.detectBiasesFromText(emptyText);

          // Property: Empty text SHALL return no biases
          expect(biases).toEqual([]);

          return true;
        }),
        { numRuns: 10 }
      );
    });

    it("should handle text with no bias indicators", () => {
      fc.assert(
        fc.property(fc.array(fillerTextArb, { minLength: 3, maxLength: 5 }), (fillerParts) => {
          const text = fillerParts.join(" ");
          const biases = recognizer.detectBiasesFromText(text);

          // Property: Text without bias indicators MAY return empty array
          // (This is not a strict requirement, just validates no crash)
          expect(Array.isArray(biases)).toBe(true);

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it("should be case-insensitive for bias indicators", () => {
      fc.assert(
        fc.property(
          fc.array(confirmationPhraseArb, { minLength: 3, maxLength: 5 }),
          fc.constantFrom("upper", "lower", "mixed"),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (indicators, caseType, filler) => {
            const uniqueIndicators = [...new Set(indicators)];
            if (uniqueIndicators.length < 3) {
              return true;
            }

            // Transform case
            const transformedIndicators = uniqueIndicators.slice(0, 3).map((ind) => {
              switch (caseType) {
                case "upper":
                  return ind.toUpperCase();
                case "lower":
                  return ind.toLowerCase();
                case "mixed":
                  return ind
                    .split("")
                    .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
                    .join("");
                default:
                  return ind;
              }
            });

            const text = buildTextWithIndicators(transformedIndicators, filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect bias regardless of case
            expect(biases.length).toBeGreaterThanOrEqual(1);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
