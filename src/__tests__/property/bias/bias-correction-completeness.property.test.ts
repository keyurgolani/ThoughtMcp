/**
 * Property Test: Bias Correction Completeness
 *
 * **Feature: mcp-tool-improvements, Property 11: Bias Correction Completeness**
 *
 * This property test validates that for any detected bias, the BiasCorrector
 * provides a complete correction suggestion with all required fields.
 *
 * **Validates: Requirements 10.6, 10.10**
 *
 * - Requirement 10.6: WHEN a bias is detected THEN the response SHALL include a correction suggestion
 * - Requirement 10.10: WHEN multiple biases are detected THEN each bias SHALL have its own correction suggestion
 *
 * @module __tests__/property/bias/bias-correction-completeness.property.test
 */

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { BiasCorrector, type BiasCorrectionSuggestion } from "../../../bias/bias-corrector";
import { BiasPatternRecognizer } from "../../../bias/bias-pattern-recognizer";
import { BiasType, type DetectedBias } from "../../../bias/types";

describe("Property 11: Bias Correction Completeness", () => {
  let corrector: BiasCorrector;
  let recognizer: BiasPatternRecognizer;

  beforeEach(() => {
    corrector = new BiasCorrector();
    recognizer = new BiasPatternRecognizer();
  });

  /**
   * All valid bias types that can be detected.
   */
  const ALL_BIAS_TYPES = Object.values(BiasType);

  /**
   * Bias indicator phrases organized by bias type for generating test text.
   */
  const BIAS_PHRASES: Record<BiasType, string[]> = {
    [BiasType.CONFIRMATION]: [
      "always used",
      "worked fine",
      "don't see why",
      "proves my point",
      "as i expected",
    ],
    [BiasType.ANCHORING]: [
      "starting from",
      "based on the initial",
      "original estimate",
      "first impression",
      "initially thought",
    ],
    [BiasType.AVAILABILITY]: [
      "i remember when",
      "just happened",
      "recent example",
      "i heard about",
      "in the news",
    ],
    [BiasType.RECENCY]: [
      "just last week",
      "recently read",
      "fresh in my mind",
      "just saw",
      "comes to mind",
    ],
    [BiasType.REPRESENTATIVENESS]: [
      "everyone uses",
      "industry standard",
      "everyone knows",
      "most people",
      "popular choice",
    ],
    [BiasType.FRAMING]: [
      "we've always",
      "no need to change",
      "why fix what",
      "if it ain't broke",
      "worked before",
    ],
    [BiasType.SUNK_COST]: [
      "already invested",
      "too much time",
      "can't give up now",
      "come this far",
      "wasted effort",
    ],
    [BiasType.ATTRIBUTION]: [
      "they're just",
      "it's their fault",
      "they should have",
      "incompetent",
      "lazy",
    ],
  };

  /**
   * Arbitrary for generating a valid bias type.
   */
  const biasTypeArb = fc.constantFrom(...ALL_BIAS_TYPES);

  /**
   * Arbitrary for generating a detected bias with valid structure.
   */
  const detectedBiasArb = (biasType: BiasType): fc.Arbitrary<DetectedBias> =>
    fc.record({
      type: fc.constant(biasType),
      severity: fc.double({ min: 0, max: 1, noNaN: true }),
      confidence: fc.double({ min: 0, max: 1, noNaN: true }),
      evidence: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
        minLength: 1,
        maxLength: 5,
      }),
      location: fc.record({
        stepIndex: fc.nat({ max: 10 }),
        reasoning: fc.string({ minLength: 1, maxLength: 200 }),
        context: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
      }),
      explanation: fc.string({ minLength: 1, maxLength: 200 }),
      detectedAt: fc.date(),
    });

  /**
   * Arbitrary for generating an array of detected biases with different types.
   */
  const multipleBiasesArb = fc
    .shuffledSubarray(ALL_BIAS_TYPES, { minLength: 1, maxLength: ALL_BIAS_TYPES.length })
    .chain((types) => fc.tuple(...types.map((t) => detectedBiasArb(t))));

  /**
   * Helper to validate correction suggestion structure.
   */
  const validateCorrectionSuggestion = (
    correction: BiasCorrectionSuggestion,
    expectedBiasType: BiasType
  ): void => {
    // Property: Correction SHALL have the correct bias type
    expect(correction.biasType).toBe(expectedBiasType);

    // Property: Correction SHALL have a non-empty suggestion string
    expect(correction.suggestion).toBeTruthy();
    expect(typeof correction.suggestion).toBe("string");
    expect(correction.suggestion.length).toBeGreaterThan(0);

    // Property: Correction SHALL have non-empty techniques array
    expect(Array.isArray(correction.techniques)).toBe(true);
    expect(correction.techniques.length).toBeGreaterThan(0);
    for (const technique of correction.techniques) {
      expect(typeof technique).toBe("string");
      expect(technique.length).toBeGreaterThan(0);
    }

    // Property: Correction SHALL have non-empty challenge questions array
    expect(Array.isArray(correction.challengeQuestions)).toBe(true);
    expect(correction.challengeQuestions.length).toBeGreaterThan(0);
    for (const question of correction.challengeQuestions) {
      expect(typeof question).toBe("string");
      expect(question.length).toBeGreaterThan(0);
    }
  };

  /**
   * **Feature: mcp-tool-improvements, Property 11: Bias Correction Completeness**
   * **Validates: Requirements 10.6**
   *
   * For any bias type, getSuggestion SHALL return a complete correction suggestion.
   */
  describe("Single bias correction completeness", () => {
    it("should provide complete correction for any bias type", () => {
      fc.assert(
        fc.property(biasTypeArb, (biasType) => {
          const correction = corrector.getSuggestion(biasType);

          // Property: SHALL return a correction suggestion (Requirement 10.6)
          expect(correction).toBeDefined();
          expect(correction).not.toBeNull();

          // Validate complete structure
          validateCorrectionSuggestion(correction, biasType);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should provide unique corrections for each bias type", () => {
      fc.assert(
        fc.property(
          fc.tuple(biasTypeArb, biasTypeArb).filter(([a, b]) => a !== b),
          ([biasType1, biasType2]) => {
            const correction1 = corrector.getSuggestion(biasType1);
            const correction2 = corrector.getSuggestion(biasType2);

            // Property: Different bias types SHALL have different suggestions
            expect(correction1.suggestion).not.toBe(correction2.suggestion);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 11: Bias Correction Completeness**
   * **Validates: Requirements 10.10**
   *
   * For any array of detected biases, addCorrections SHALL provide
   * a correction for each bias.
   */
  describe("Multiple bias correction completeness", () => {
    it("should provide correction for each detected bias", () => {
      fc.assert(
        fc.property(multipleBiasesArb, (biases) => {
          const biasesWithCorrections = corrector.addCorrections(biases);

          // Property: SHALL return same number of results as input (Requirement 10.10)
          expect(biasesWithCorrections.length).toBe(biases.length);

          // Property: Each bias SHALL have its own correction
          for (let i = 0; i < biases.length; i++) {
            const result = biasesWithCorrections[i];

            // Property: Result SHALL contain the original bias
            expect(result.bias).toBeDefined();
            expect(result.bias.type).toBe(biases[i].type);

            // Property: Result SHALL contain a correction
            expect(result.correction).toBeDefined();
            validateCorrectionSuggestion(result.correction, biases[i].type);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should preserve bias order when adding corrections", () => {
      fc.assert(
        fc.property(multipleBiasesArb, (biases) => {
          const biasesWithCorrections = corrector.addCorrections(biases);

          // Property: Order SHALL be preserved
          for (let i = 0; i < biases.length; i++) {
            expect(biasesWithCorrections[i].bias.type).toBe(biases[i].type);
            expect(biasesWithCorrections[i].bias.severity).toBe(biases[i].severity);
            expect(biasesWithCorrections[i].bias.confidence).toBe(biases[i].confidence);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 11: Bias Correction Completeness**
   * **Validates: Requirements 10.6, 10.10**
   *
   * Integration test: When biases are detected from text, each SHALL have
   * a correction suggestion when processed through BiasCorrector.
   */
  describe("End-to-end bias detection and correction", () => {
    /**
     * Arbitrary for generating text with bias indicators.
     */
    const biasTextArb = fc.constantFrom(...ALL_BIAS_TYPES).chain((biasType) => {
      const phrases = BIAS_PHRASES[biasType];
      return fc
        .shuffledSubarray(phrases, { minLength: 2, maxLength: phrases.length })
        .map((selectedPhrases) => ({
          biasType,
          text: `This is my reasoning: ${selectedPhrases.join(". ")}. That's why I think this way.`,
        }));
    });

    it("should provide corrections for all biases detected from text", () => {
      fc.assert(
        fc.property(biasTextArb, ({ text }) => {
          // Detect biases from text
          const detectedBiases = recognizer.detectBiasesFromText(text);

          // Skip if no biases detected (some phrases may not trigger detection)
          if (detectedBiases.length === 0) {
            return true;
          }

          // Add corrections
          const biasesWithCorrections = corrector.addCorrections(detectedBiases);

          // Property: Each detected bias SHALL have a correction (Requirement 10.6)
          expect(biasesWithCorrections.length).toBe(detectedBiases.length);

          for (const result of biasesWithCorrections) {
            // Property: Correction SHALL be present
            expect(result.correction).toBeDefined();

            // Property: Correction SHALL be complete
            validateCorrectionSuggestion(result.correction, result.bias.type);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should provide meaningful corrections that reference the bias type", () => {
      fc.assert(
        fc.property(biasTypeArb, (biasType) => {
          const correction = corrector.getSuggestion(biasType);

          // Property: Suggestion SHALL be meaningful (not generic placeholder)
          expect(correction.suggestion.length).toBeGreaterThan(20);

          // Property: Techniques SHALL be actionable
          for (const technique of correction.techniques) {
            expect(technique.length).toBeGreaterThan(10);
          }

          // Property: Challenge questions SHALL be questions (end with ?)
          for (const question of correction.challengeQuestions) {
            expect(question.endsWith("?")).toBe(true);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 11: Bias Correction Completeness**
   * **Validates: Requirements 10.6**
   *
   * Edge cases for bias correction.
   */
  describe("Edge cases", () => {
    it("should handle empty bias array", () => {
      const biasesWithCorrections = corrector.addCorrections([]);

      // Property: Empty input SHALL return empty output
      expect(biasesWithCorrections).toEqual([]);
    });

    it("should handle duplicate bias types", () => {
      fc.assert(
        fc.property(biasTypeArb, fc.nat({ max: 5 }), (biasType, count) => {
          // Create multiple biases of the same type
          const biases: DetectedBias[] = Array.from({ length: count + 1 }, (_, i) => ({
            type: biasType,
            severity: 0.5 + i * 0.1,
            confidence: 0.7,
            evidence: [`Evidence ${i}`],
            location: { stepIndex: i, reasoning: `Reasoning ${i}` },
            explanation: `Explanation ${i}`,
            detectedAt: new Date(),
          }));

          const biasesWithCorrections = corrector.addCorrections(biases);

          // Property: Each duplicate SHALL get its own correction
          expect(biasesWithCorrections.length).toBe(biases.length);

          // Property: All corrections for same type SHALL be identical
          const firstCorrection = biasesWithCorrections[0].correction;
          for (const result of biasesWithCorrections) {
            expect(result.correction.suggestion).toBe(firstCorrection.suggestion);
            expect(result.correction.techniques).toEqual(firstCorrection.techniques);
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it("should provide consistent corrections for same bias type", () => {
      fc.assert(
        fc.property(biasTypeArb, fc.nat({ max: 10 }), (biasType, iterations) => {
          const corrections: BiasCorrectionSuggestion[] = [];

          // Get correction multiple times
          for (let i = 0; i <= iterations; i++) {
            corrections.push(corrector.getSuggestion(biasType));
          }

          // Property: All corrections for same type SHALL be identical
          const first = corrections[0];
          for (const correction of corrections) {
            expect(correction.suggestion).toBe(first.suggestion);
            expect(correction.techniques).toEqual(first.techniques);
            expect(correction.challengeQuestions).toEqual(first.challengeQuestions);
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 11: Bias Correction Completeness**
   * **Validates: Requirements 10.6**
   *
   * Invariants for correction suggestions.
   */
  describe("Correction suggestion invariants", () => {
    it("should have at least 3 techniques for each bias type", () => {
      fc.assert(
        fc.property(biasTypeArb, (biasType) => {
          const correction = corrector.getSuggestion(biasType);

          // Property: SHALL have at least 3 techniques
          expect(correction.techniques.length).toBeGreaterThanOrEqual(3);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should have at least 3 challenge questions for each bias type", () => {
      fc.assert(
        fc.property(biasTypeArb, (biasType) => {
          const correction = corrector.getSuggestion(biasType);

          // Property: SHALL have at least 3 challenge questions
          expect(correction.challengeQuestions.length).toBeGreaterThanOrEqual(3);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should format corrections correctly", () => {
      fc.assert(
        fc.property(biasTypeArb, (biasType) => {
          const correction = corrector.getSuggestion(biasType);
          const formatted = corrector.formatCorrection(correction);

          // Property: Formatted output SHALL contain suggestion
          expect(formatted).toContain("Suggestion:");
          expect(formatted).toContain(correction.suggestion);

          // Property: Formatted output SHALL contain techniques section
          expect(formatted).toContain("Techniques:");

          // Property: Formatted output SHALL contain challenge questions section
          expect(formatted).toContain("Challenge Questions:");

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should return all templates via getAllTemplates", () => {
      const templates = corrector.getAllTemplates();

      // Property: SHALL return templates for all bias types
      expect(templates.size).toBe(ALL_BIAS_TYPES.length);

      // Property: Each template SHALL be complete
      for (const [biasType, template] of templates) {
        validateCorrectionSuggestion(template, biasType);
      }
    });

    it("should return concise suggestions via getConciseSuggestion", () => {
      fc.assert(
        fc.property(biasTypeArb, (biasType) => {
          const concise = corrector.getConciseSuggestion(biasType);
          const full = corrector.getSuggestion(biasType);

          // Property: Concise suggestion SHALL match full suggestion
          expect(concise).toBe(full.suggestion);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
