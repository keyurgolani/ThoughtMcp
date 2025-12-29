/**
 * Tests for BiasCorrector
 *
 * Tests correction suggestion generation for all nine bias types,
 * ensuring each bias type has appropriate suggestions, techniques,
 * and challenge questions.
 *
 * Validates Requirements 10.6, 10.7, 10.8, 10.9, 10.10
 */

import { beforeEach, describe, expect, it } from "vitest";
import { BiasCorrector } from "../../../bias/bias-corrector";
import { BiasType, type DetectedBias } from "../../../bias/types";

describe("BiasCorrector", () => {
  let corrector: BiasCorrector;

  beforeEach(() => {
    corrector = new BiasCorrector();
  });

  // Helper function to create test detected bias
  const createTestBias = (type: BiasType, severity: number = 0.7): DetectedBias => {
    return {
      type,
      severity,
      confidence: 0.85,
      evidence: ["Evidence of bias"],
      location: {
        stepIndex: 0,
        reasoning: "Biased reasoning step",
      },
      explanation: "Test bias explanation",
      detectedAt: new Date(),
    };
  };

  describe("getSuggestion", () => {
    it("should return suggestion for confirmation bias (Requirement 10.8)", () => {
      const suggestion = corrector.getSuggestion(BiasType.CONFIRMATION);

      expect(suggestion.biasType).toBe(BiasType.CONFIRMATION);
      expect(suggestion.suggestion).toBeTruthy();
      expect(suggestion.suggestion.toLowerCase()).toContain("disconfirming");
      expect(suggestion.techniques.length).toBeGreaterThan(0);
      expect(suggestion.challengeQuestions.length).toBeGreaterThan(0);
    });

    it("should return suggestion for framing bias (Requirement 10.7)", () => {
      const suggestion = corrector.getSuggestion(BiasType.FRAMING);

      expect(suggestion.biasType).toBe(BiasType.FRAMING);
      expect(suggestion.suggestion).toBeTruthy();
      expect(suggestion.suggestion.toLowerCase()).toContain("reframe");
      expect(suggestion.techniques.length).toBeGreaterThan(0);
      expect(suggestion.challengeQuestions.length).toBeGreaterThan(0);
    });

    it("should return suggestion for sunk cost fallacy (Requirement 10.9)", () => {
      const suggestion = corrector.getSuggestion(BiasType.SUNK_COST);

      expect(suggestion.biasType).toBe(BiasType.SUNK_COST);
      expect(suggestion.suggestion).toBeTruthy();
      expect(suggestion.suggestion.toLowerCase()).toContain("future");
      expect(suggestion.techniques.length).toBeGreaterThan(0);
      expect(suggestion.challengeQuestions.length).toBeGreaterThan(0);
    });

    it("should return suggestion for anchoring bias", () => {
      const suggestion = corrector.getSuggestion(BiasType.ANCHORING);

      expect(suggestion.biasType).toBe(BiasType.ANCHORING);
      expect(suggestion.suggestion).toBeTruthy();
      expect(suggestion.techniques.length).toBeGreaterThan(0);
      expect(suggestion.challengeQuestions.length).toBeGreaterThan(0);
    });

    it("should return suggestion for availability bias", () => {
      const suggestion = corrector.getSuggestion(BiasType.AVAILABILITY);

      expect(suggestion.biasType).toBe(BiasType.AVAILABILITY);
      expect(suggestion.suggestion).toBeTruthy();
      expect(suggestion.techniques.length).toBeGreaterThan(0);
      expect(suggestion.challengeQuestions.length).toBeGreaterThan(0);
    });

    it("should return suggestion for recency bias", () => {
      const suggestion = corrector.getSuggestion(BiasType.RECENCY);

      expect(suggestion.biasType).toBe(BiasType.RECENCY);
      expect(suggestion.suggestion).toBeTruthy();
      expect(suggestion.techniques.length).toBeGreaterThan(0);
      expect(suggestion.challengeQuestions.length).toBeGreaterThan(0);
    });

    it("should return suggestion for representativeness bias", () => {
      const suggestion = corrector.getSuggestion(BiasType.REPRESENTATIVENESS);

      expect(suggestion.biasType).toBe(BiasType.REPRESENTATIVENESS);
      expect(suggestion.suggestion).toBeTruthy();
      expect(suggestion.techniques.length).toBeGreaterThan(0);
      expect(suggestion.challengeQuestions.length).toBeGreaterThan(0);
    });

    it("should return suggestion for attribution bias", () => {
      const suggestion = corrector.getSuggestion(BiasType.ATTRIBUTION);

      expect(suggestion.biasType).toBe(BiasType.ATTRIBUTION);
      expect(suggestion.suggestion).toBeTruthy();
      expect(suggestion.techniques.length).toBeGreaterThan(0);
      expect(suggestion.challengeQuestions.length).toBeGreaterThan(0);
    });

    it("should return all suggestions with at least 3 techniques", () => {
      for (const biasType of Object.values(BiasType)) {
        const suggestion = corrector.getSuggestion(biasType);
        expect(suggestion.techniques.length).toBeGreaterThanOrEqual(3);
      }
    });

    it("should return all suggestions with at least 3 challenge questions", () => {
      for (const biasType of Object.values(BiasType)) {
        const suggestion = corrector.getSuggestion(biasType);
        expect(suggestion.challengeQuestions.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe("addCorrections (Requirement 10.10)", () => {
    it("should add correction to single bias", () => {
      const biases = [createTestBias(BiasType.CONFIRMATION)];
      const result = corrector.addCorrections(biases);

      expect(result.length).toBe(1);
      expect(result[0].bias).toBe(biases[0]);
      expect(result[0].correction).toBeTruthy();
      expect(result[0].correction.biasType).toBe(BiasType.CONFIRMATION);
    });

    it("should add corrections to multiple biases (Requirement 10.10)", () => {
      const biases = [
        createTestBias(BiasType.CONFIRMATION),
        createTestBias(BiasType.ANCHORING),
        createTestBias(BiasType.SUNK_COST),
      ];
      const result = corrector.addCorrections(biases);

      expect(result.length).toBe(3);

      // Each bias should have its own correction
      expect(result[0].correction.biasType).toBe(BiasType.CONFIRMATION);
      expect(result[1].correction.biasType).toBe(BiasType.ANCHORING);
      expect(result[2].correction.biasType).toBe(BiasType.SUNK_COST);

      // Each correction should be unique
      expect(result[0].correction.suggestion).not.toBe(result[1].correction.suggestion);
      expect(result[1].correction.suggestion).not.toBe(result[2].correction.suggestion);
    });

    it("should handle empty bias array", () => {
      const result = corrector.addCorrections([]);
      expect(result).toEqual([]);
    });

    it("should preserve original bias data", () => {
      const bias = createTestBias(BiasType.FRAMING, 0.85);
      const result = corrector.addCorrections([bias]);

      expect(result[0].bias.type).toBe(BiasType.FRAMING);
      expect(result[0].bias.severity).toBe(0.85);
      expect(result[0].bias.confidence).toBe(0.85);
    });
  });

  describe("getConciseSuggestion", () => {
    it("should return concise suggestion for each bias type", () => {
      for (const biasType of Object.values(BiasType)) {
        const suggestion = corrector.getConciseSuggestion(biasType);
        expect(suggestion).toBeTruthy();
        expect(typeof suggestion).toBe("string");
        expect(suggestion.length).toBeGreaterThan(10);
      }
    });

    it("should return same suggestion as full getSuggestion", () => {
      for (const biasType of Object.values(BiasType)) {
        const concise = corrector.getConciseSuggestion(biasType);
        const full = corrector.getSuggestion(biasType);
        expect(concise).toBe(full.suggestion);
      }
    });
  });

  describe("getAllTemplates", () => {
    it("should return templates for all bias types", () => {
      const templates = corrector.getAllTemplates();

      expect(templates.size).toBe(Object.values(BiasType).length);

      for (const biasType of Object.values(BiasType)) {
        expect(templates.has(biasType)).toBe(true);
        const template = templates.get(biasType);
        expect(template).toBeTruthy();
        expect(template?.suggestion).toBeTruthy();
        expect(template?.techniques.length).toBeGreaterThan(0);
        expect(template?.challengeQuestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe("formatCorrection", () => {
    it("should format correction with all sections", () => {
      const suggestion = corrector.getSuggestion(BiasType.CONFIRMATION);
      const formatted = corrector.formatCorrection(suggestion);

      expect(formatted).toContain("Suggestion:");
      expect(formatted).toContain("Techniques:");
      expect(formatted).toContain("Challenge Questions:");
      expect(formatted).toContain("•");
    });

    it("should include all techniques in formatted output", () => {
      const suggestion = corrector.getSuggestion(BiasType.ANCHORING);
      const formatted = corrector.formatCorrection(suggestion);

      for (const technique of suggestion.techniques) {
        expect(formatted).toContain(technique);
      }
    });

    it("should include all challenge questions in formatted output", () => {
      const suggestion = corrector.getSuggestion(BiasType.AVAILABILITY);
      const formatted = corrector.formatCorrection(suggestion);

      for (const question of suggestion.challengeQuestions) {
        expect(formatted).toContain(question);
      }
    });
  });

  describe("Specific Bias Correction Content", () => {
    it("confirmation bias suggestion should mention seeking disconfirming evidence", () => {
      const suggestion = corrector.getSuggestion(BiasType.CONFIRMATION);

      const hasDisconfirming =
        suggestion.suggestion.toLowerCase().includes("disconfirm") ||
        suggestion.techniques.some((t) => t.toLowerCase().includes("contradict")) ||
        suggestion.challengeQuestions.some((q) => q.toLowerCase().includes("wrong"));

      expect(hasDisconfirming).toBe(true);
    });

    it("framing bias suggestion should mention reframing", () => {
      const suggestion = corrector.getSuggestion(BiasType.FRAMING);

      const hasReframe =
        suggestion.suggestion.toLowerCase().includes("reframe") ||
        suggestion.techniques.some((t) => t.toLowerCase().includes("frame")) ||
        suggestion.challengeQuestions.some((q) => q.toLowerCase().includes("frame"));

      expect(hasReframe).toBe(true);
    });

    it("sunk cost suggestion should mention future value", () => {
      const suggestion = corrector.getSuggestion(BiasType.SUNK_COST);

      const hasFutureValue =
        suggestion.suggestion.toLowerCase().includes("future") ||
        suggestion.techniques.some((t) => t.toLowerCase().includes("future")) ||
        suggestion.challengeQuestions.some((q) => q.toLowerCase().includes("future"));

      expect(hasFutureValue).toBe(true);
    });

    it("anchoring bias suggestion should mention alternative starting points", () => {
      const suggestion = corrector.getSuggestion(BiasType.ANCHORING);

      const hasAlternatives =
        suggestion.suggestion.toLowerCase().includes("multiple") ||
        suggestion.suggestion.toLowerCase().includes("alternative") ||
        suggestion.techniques.some((t) => t.toLowerCase().includes("alternative"));

      expect(hasAlternatives).toBe(true);
    });

    it("availability bias suggestion should mention statistics or base rates", () => {
      const suggestion = corrector.getSuggestion(BiasType.AVAILABILITY);

      const hasStatistics =
        suggestion.suggestion.toLowerCase().includes("statistic") ||
        suggestion.suggestion.toLowerCase().includes("base rate") ||
        suggestion.techniques.some((t) => t.toLowerCase().includes("statistic"));

      expect(hasStatistics).toBe(true);
    });

    it("attribution bias suggestion should mention situational factors", () => {
      const suggestion = corrector.getSuggestion(BiasType.ATTRIBUTION);

      const hasSituational =
        suggestion.suggestion.toLowerCase().includes("situational") ||
        suggestion.techniques.some((t) => t.toLowerCase().includes("situational")) ||
        suggestion.challengeQuestions.some((q) => q.toLowerCase().includes("situational"));

      expect(hasSituational).toBe(true);
    });

    it("bandwagon bias suggestion should mention evaluating on merit", () => {
      const suggestion = corrector.getSuggestion(BiasType.BANDWAGON);

      const hasMerit =
        suggestion.suggestion.toLowerCase().includes("merit") ||
        suggestion.suggestion.toLowerCase().includes("needs") ||
        suggestion.techniques.some((t) => t.toLowerCase().includes("requirements")) ||
        suggestion.challengeQuestions.some((q) => q.toLowerCase().includes("popular"));

      expect(hasMerit).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle all bias types without throwing", () => {
      for (const biasType of Object.values(BiasType)) {
        expect(() => corrector.getSuggestion(biasType)).not.toThrow();
        expect(() => corrector.getConciseSuggestion(biasType)).not.toThrow();
      }
    });

    it("should return valid structure for all bias types", () => {
      for (const biasType of Object.values(BiasType)) {
        const suggestion = corrector.getSuggestion(biasType);

        expect(suggestion).toHaveProperty("biasType");
        expect(suggestion).toHaveProperty("suggestion");
        expect(suggestion).toHaveProperty("techniques");
        expect(suggestion).toHaveProperty("challengeQuestions");

        expect(typeof suggestion.biasType).toBe("string");
        expect(typeof suggestion.suggestion).toBe("string");
        expect(Array.isArray(suggestion.techniques)).toBe(true);
        expect(Array.isArray(suggestion.challengeQuestions)).toBe(true);
      }
    });
  });
});
