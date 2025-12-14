/**
 * Property Test: Bias Detection Pattern Coverage
 *
 * **Feature: mcp-tool-fixes-phase2, Property 2: Bias Detection Pattern Coverage**
 *
 * This property test validates that when text contains specific test case phrases
 * ("clearly supports", "invested significant", "everyone else is doing"), the
 * detectBiasesFromText() method returns at least one bias of the expected type.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 *
 * - Requirement 2.1: WHEN reasoning contains "clearly supports" THEN the detect_bias tool
 *   SHALL identify confirmation bias
 * - Requirement 2.2: WHEN reasoning contains "all data supports" or "data confirms" THEN
 *   the detect_bias tool SHALL identify confirmation bias
 * - Requirement 2.3: WHEN reasoning contains "invested significant" or "invested resources"
 *   THEN the detect_bias tool SHALL identify sunk cost fallacy
 * - Requirement 2.4: WHEN reasoning contains "spent significant" or "put significant" THEN
 *   the detect_bias tool SHALL identify sunk cost fallacy
 * - Requirement 2.5: WHEN reasoning contains "everyone else is doing" or "everyone is doing"
 *   THEN the detect_bias tool SHALL identify bandwagon effect
 * - Requirement 2.6: WHEN reasoning contains "others are doing" or "they all do" THEN
 *   the detect_bias tool SHALL identify bandwagon effect
 * - Requirement 2.7: WHEN the comprehensive test case is analyzed THEN the detect_bias tool
 *   SHALL identify at least confirmation bias, sunk cost fallacy, and bandwagon effect
 *
 * @module __tests__/property/bias/bias-pattern-coverage.property.test
 */

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { BiasPatternRecognizer } from "../../../bias/bias-pattern-recognizer";
import { BiasType } from "../../../bias/types";

describe("Property 2: Bias Detection Pattern Coverage", () => {
  let recognizer: BiasPatternRecognizer;

  beforeEach(() => {
    recognizer = new BiasPatternRecognizer();
  });

  /**
   * New confirmation bias phrases added in Phase 2
   */
  const NEW_CONFIRMATION_BIAS_PHRASES = [
    "clearly supports",
    "all data supports",
    "data confirms",
    "evidence shows",
  ];

  /**
   * New sunk cost fallacy phrases added in Phase 2
   */
  const NEW_SUNK_COST_PHRASES = [
    "invested significant",
    "invested resources",
    "invested time",
    "invested money",
    "spent significant",
    "put significant",
  ];

  /**
   * New bandwagon effect phrases added in Phase 2
   */
  const NEW_BANDWAGON_PHRASES = [
    "everyone else is doing",
    "everyone is doing",
    "everyone does it",
    "others are doing",
    "they all do",
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
   * Helper to build text with a bias phrase embedded in context.
   */
  const buildTextWithPhrase = (phrase: string, filler: string[]): string => {
    const parts = [...filler];
    // Insert the phrase in the middle
    const insertIndex = Math.floor(parts.length / 2);
    parts.splice(insertIndex, 0, phrase);
    return parts.join(" ");
  };

  /**
   * **Feature: mcp-tool-fixes-phase2, Property 2: Bias Detection Pattern Coverage**
   * **Validates: Requirements 2.1, 2.2**
   *
   * For any text containing new confirmation bias phrases ("clearly supports",
   * "all data supports", "data confirms", "evidence shows"), detectBiasesFromText
   * SHALL return at least one bias of type CONFIRMATION.
   */
  describe("New confirmation bias phrase detection", () => {
    it("should detect confirmation bias for new phrases", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...NEW_CONFIRMATION_BIAS_PHRASES),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 3 }),
          (phrase, filler) => {
            const text = buildTextWithPhrase(phrase, filler);
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

    it("should detect confirmation bias regardless of case", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...NEW_CONFIRMATION_BIAS_PHRASES),
          fc.constantFrom("upper", "lower", "mixed"),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (phrase, caseType, filler) => {
            // Transform case
            let transformedPhrase: string;
            switch (caseType) {
              case "upper":
                transformedPhrase = phrase.toUpperCase();
                break;
              case "lower":
                transformedPhrase = phrase.toLowerCase();
                break;
              case "mixed":
                transformedPhrase = phrase
                  .split("")
                  .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
                  .join("");
                break;
              default:
                transformedPhrase = phrase;
            }

            const text = buildTextWithPhrase(transformedPhrase, filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect confirmation bias regardless of case
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
   * **Feature: mcp-tool-fixes-phase2, Property 2: Bias Detection Pattern Coverage**
   * **Validates: Requirements 2.3, 2.4**
   *
   * For any text containing new sunk cost phrases ("invested significant",
   * "invested resources", "spent significant", "put significant"),
   * detectBiasesFromText SHALL return at least one bias of type SUNK_COST.
   */
  describe("New sunk cost fallacy phrase detection", () => {
    it("should detect sunk cost fallacy for new phrases", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...NEW_SUNK_COST_PHRASES),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 3 }),
          (phrase, filler) => {
            const text = buildTextWithPhrase(phrase, filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect at least one bias
            expect(biases.length).toBeGreaterThanOrEqual(1);

            // Property: SHALL detect sunk cost fallacy specifically
            const hasSunkCostBias = biases.some((b) => b.type === BiasType.SUNK_COST);
            expect(hasSunkCostBias).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should detect sunk cost fallacy regardless of case", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...NEW_SUNK_COST_PHRASES),
          fc.constantFrom("upper", "lower", "mixed"),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (phrase, caseType, filler) => {
            // Transform case
            let transformedPhrase: string;
            switch (caseType) {
              case "upper":
                transformedPhrase = phrase.toUpperCase();
                break;
              case "lower":
                transformedPhrase = phrase.toLowerCase();
                break;
              case "mixed":
                transformedPhrase = phrase
                  .split("")
                  .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
                  .join("");
                break;
              default:
                transformedPhrase = phrase;
            }

            const text = buildTextWithPhrase(transformedPhrase, filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect sunk cost fallacy regardless of case
            const hasSunkCostBias = biases.some((b) => b.type === BiasType.SUNK_COST);
            expect(hasSunkCostBias).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-fixes-phase2, Property 2: Bias Detection Pattern Coverage**
   * **Validates: Requirements 2.5, 2.6**
   *
   * For any text containing new bandwagon effect phrases ("everyone else is doing",
   * "everyone is doing", "others are doing", "they all do"),
   * detectBiasesFromText SHALL return at least one bias of type REPRESENTATIVENESS.
   * Note: Bandwagon effect is mapped to REPRESENTATIVENESS type in the implementation.
   */
  describe("New bandwagon effect phrase detection", () => {
    it("should detect bandwagon effect for new phrases", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...NEW_BANDWAGON_PHRASES),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 3 }),
          (phrase, filler) => {
            const text = buildTextWithPhrase(phrase, filler);
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

    it("should detect bandwagon effect regardless of case", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...NEW_BANDWAGON_PHRASES),
          fc.constantFrom("upper", "lower", "mixed"),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (phrase, caseType, filler) => {
            // Transform case
            let transformedPhrase: string;
            switch (caseType) {
              case "upper":
                transformedPhrase = phrase.toUpperCase();
                break;
              case "lower":
                transformedPhrase = phrase.toLowerCase();
                break;
              case "mixed":
                transformedPhrase = phrase
                  .split("")
                  .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
                  .join("");
                break;
              default:
                transformedPhrase = phrase;
            }

            const text = buildTextWithPhrase(transformedPhrase, filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect bandwagon effect regardless of case
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
   * **Feature: mcp-tool-fixes-phase2, Property 2: Bias Detection Pattern Coverage**
   * **Validates: Requirements 2.7**
   *
   * For any combination of phrases from each bias type, detectBiasesFromText
   * SHALL detect all three bias types (confirmation, sunk cost, bandwagon).
   */
  describe("Comprehensive multi-bias detection", () => {
    it("should detect all three bias types when phrases from each are present", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...NEW_CONFIRMATION_BIAS_PHRASES),
          fc.constantFrom(...NEW_SUNK_COST_PHRASES),
          fc.constantFrom(...NEW_BANDWAGON_PHRASES),
          fc.array(fillerTextArb, { minLength: 0, maxLength: 2 }),
          (confirmationPhrase, sunkCostPhrase, bandwagonPhrase, filler) => {
            // Build text with all three bias phrases
            const text = [
              ...filler.slice(0, 1),
              confirmationPhrase,
              ...filler.slice(1, 2),
              sunkCostPhrase,
              bandwagonPhrase,
            ].join(" ");

            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect at least 3 biases (one of each type)
            expect(biases.length).toBeGreaterThanOrEqual(3);

            // Property: SHALL detect confirmation bias
            const hasConfirmationBias = biases.some((b) => b.type === BiasType.CONFIRMATION);
            expect(hasConfirmationBias).toBe(true);

            // Property: SHALL detect sunk cost fallacy
            const hasSunkCostBias = biases.some((b) => b.type === BiasType.SUNK_COST);
            expect(hasSunkCostBias).toBe(true);

            // Property: SHALL detect bandwagon effect (REPRESENTATIVENESS)
            const hasBandwagonBias = biases.some((b) => b.type === BiasType.REPRESENTATIVENESS);
            expect(hasBandwagonBias).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test the specific case from the report (Requirement 2.7)
     */
    it("should detect all biases in the comprehensive test case from the report", () => {
      const testCase =
        "All the data clearly supports my hypothesis. I've been working on this for 6 months " +
        "and invested significant resources, so we should definitely continue. Everyone else " +
        "is doing it this way.";

      const biases = recognizer.detectBiasesFromText(testCase);

      // Property: SHALL detect at least 3 biases
      expect(biases.length).toBeGreaterThanOrEqual(3);

      // Property: SHALL detect confirmation bias
      const hasConfirmationBias = biases.some((b) => b.type === BiasType.CONFIRMATION);
      expect(hasConfirmationBias).toBe(true);

      // Property: SHALL detect sunk cost fallacy
      const hasSunkCostBias = biases.some((b) => b.type === BiasType.SUNK_COST);
      expect(hasSunkCostBias).toBe(true);

      // Property: SHALL detect bandwagon effect (REPRESENTATIVENESS)
      const hasBandwagonBias = biases.some((b) => b.type === BiasType.REPRESENTATIVENESS);
      expect(hasBandwagonBias).toBe(true);
    });
  });

  /**
   * **Feature: mcp-tool-fixes-phase2, Property 2: Bias Detection Pattern Coverage**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**
   *
   * Invariant: Detected biases SHALL have valid structure with evidence
   * containing matched indicator references.
   */
  describe("Bias detection output invariants", () => {
    it("should include matched indicators in evidence for new phrases", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constantFrom(...NEW_CONFIRMATION_BIAS_PHRASES),
            fc.constantFrom(...NEW_SUNK_COST_PHRASES),
            fc.constantFrom(...NEW_BANDWAGON_PHRASES)
          ),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 3 }),
          (phrase, filler) => {
            const text = buildTextWithPhrase(phrase, filler);
            const biases = recognizer.detectBiasesFromText(text);

            // Property: SHALL detect at least one bias
            expect(biases.length).toBeGreaterThanOrEqual(1);

            // Property: Evidence SHALL contain matched indicator references
            for (const bias of biases) {
              const hasMatchedIndicator = bias.evidence.some((e) =>
                e.toLowerCase().includes("matched indicator")
              );
              expect(hasMatchedIndicator).toBe(true);
            }

            // Property: Each bias SHALL have valid severity in [0, 1]
            for (const bias of biases) {
              expect(bias.severity).toBeGreaterThanOrEqual(0);
              expect(bias.severity).toBeLessThanOrEqual(1);
            }

            // Property: Each bias SHALL have valid confidence in [0, 1]
            for (const bias of biases) {
              expect(bias.confidence).toBeGreaterThanOrEqual(0);
              expect(bias.confidence).toBeLessThanOrEqual(1);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
