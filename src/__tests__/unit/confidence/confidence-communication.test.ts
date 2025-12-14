/**
 * Tests for ConfidenceCommunicationModule
 *
 * Tests the confidence communication module that provides clear confidence
 * presentation, interpretation guidance, uncertainty explanations, action
 * recommendations, and factor breakdown displays.
 *
 * Following TDD: These tests are written FIRST and should FAIL initially.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ConfidenceCommunicationModule } from "../../../confidence/confidence-communication";
import type { ConfidenceAssessment } from "../../../confidence/types";
import { UncertaintyType as UncertaintyTypeEnum } from "../../../confidence/types";

describe("ConfidenceCommunicationModule", () => {
  let module: ConfidenceCommunicationModule;

  beforeEach(() => {
    module = new ConfidenceCommunicationModule();
  });

  describe("formatConfidence", () => {
    it("should format high confidence (0.8-1.0) with percentage and label", () => {
      const result = module.formatConfidence(0.9);
      expect(result).toContain("90%");
      expect(result.toLowerCase()).toMatch(/high|strong|very confident/);
    });

    it("should format medium confidence (0.5-0.8) with percentage and label", () => {
      const result = module.formatConfidence(0.65);
      expect(result).toContain("65%");
      expect(result.toLowerCase()).toMatch(/medium|moderate|fairly confident/);
    });

    it("should format fairly confident range (0.65-0.8)", () => {
      const result = module.formatConfidence(0.7);
      expect(result).toContain("70%");
      expect(result).toContain("Fairly Confident");
    });

    it("should format very low confidence (0-0.3)", () => {
      const result = module.formatConfidence(0.15);
      expect(result).toContain("15%");
      expect(result).toContain("Very Low");
    });

    it("should format low confidence (0-0.5) with percentage and label", () => {
      const result = module.formatConfidence(0.3);
      expect(result).toContain("30%");
      expect(result.toLowerCase()).toMatch(/low|weak|uncertain/);
    });

    it("should handle edge case: confidence = 0", () => {
      const result = module.formatConfidence(0);
      expect(result).toContain("0%");
      expect(result.toLowerCase()).toMatch(/very low|no confidence|highly uncertain/);
    });

    it("should handle edge case: confidence = 1", () => {
      const result = module.formatConfidence(1);
      expect(result).toContain("100%");
      expect(result.toLowerCase()).toMatch(/very high|complete|certain/);
    });

    it("should handle edge case: confidence = 0.5 (boundary)", () => {
      const result = module.formatConfidence(0.5);
      expect(result).toContain("50%");
      expect(result).toBeTruthy();
    });

    it("should throw error for invalid confidence < 0", () => {
      expect(() => module.formatConfidence(-0.1)).toThrow();
    });

    it("should throw error for invalid confidence > 1", () => {
      expect(() => module.formatConfidence(1.1)).toThrow();
    });
  });

  describe("provideInterpretation", () => {
    const createMockContext = (domain: string = "general") => ({
      domain,
      problemType: "analysis",
    });

    it("should provide interpretation for high confidence", () => {
      const interpretation = module.provideInterpretation(0.9, createMockContext());
      expect(interpretation).toBeTruthy();
      expect(interpretation.length).toBeGreaterThan(20);
      expect(interpretation.toLowerCase()).toMatch(/reliable|trust|confident|strong/);
    });

    it("should provide interpretation for medium confidence", () => {
      const interpretation = module.provideInterpretation(0.6, createMockContext());
      expect(interpretation).toBeTruthy();
      expect(interpretation.length).toBeGreaterThan(20);
      expect(interpretation.toLowerCase()).toMatch(/moderate|reasonable|consider|verify/);
    });

    it("should provide interpretation for low confidence", () => {
      const interpretation = module.provideInterpretation(0.3, createMockContext());
      expect(interpretation).toBeTruthy();
      expect(interpretation.length).toBeGreaterThan(20);
      expect(interpretation.toLowerCase()).toMatch(/uncertain|caution|more information|verify/);
    });

    it("should provide interpretation for moderate confidence (0.4-0.6)", () => {
      const interpretation = module.provideInterpretation(0.5, createMockContext());
      expect(interpretation).toBeTruthy();
      expect(interpretation.length).toBeGreaterThan(20);
      expect(interpretation.toLowerCase()).toMatch(/moderate|uncertainty|gaps|information/);
    });

    it("should provide context-specific interpretation for different domains", () => {
      const medicalContext = createMockContext("medical");
      const financialContext = createMockContext("financial");

      const medicalInterpretation = module.provideInterpretation(0.6, medicalContext);
      const financialInterpretation = module.provideInterpretation(0.6, financialContext);

      expect(medicalInterpretation).toBeTruthy();
      expect(financialInterpretation).toBeTruthy();
      // Interpretations should be meaningful for their context
      expect(medicalInterpretation.length).toBeGreaterThan(20);
      expect(financialInterpretation.length).toBeGreaterThan(20);
    });

    it("should handle edge case: confidence = 0", () => {
      const interpretation = module.provideInterpretation(0, createMockContext());
      expect(interpretation).toBeTruthy();
      expect(interpretation.toLowerCase()).toMatch(/no confidence|highly uncertain|not reliable/);
    });

    it("should handle edge case: confidence = 1", () => {
      const interpretation = module.provideInterpretation(1, createMockContext());
      expect(interpretation).toBeTruthy();
      expect(interpretation.toLowerCase()).toMatch(/very confident|highly reliable|certain/);
    });
  });

  describe("explainUncertainty", () => {
    it("should explain epistemic uncertainty clearly", () => {
      const explanation = module.explainUncertainty(UncertaintyTypeEnum.EPISTEMIC);
      expect(explanation).toBeTruthy();
      expect(explanation.length).toBeGreaterThan(30);
      expect(explanation.toLowerCase()).toMatch(/knowledge|information|learn|reduce/);
      expect(explanation).not.toMatch(/technical jargon|complex terms/);
    });

    it("should explain aleatory uncertainty clearly", () => {
      const explanation = module.explainUncertainty(UncertaintyTypeEnum.ALEATORY);
      expect(explanation).toBeTruthy();
      expect(explanation.length).toBeGreaterThan(30);
      expect(explanation.toLowerCase()).toMatch(/random|variability|inherent|cannot be reduced/);
      expect(explanation).not.toMatch(/technical jargon|complex terms/);
    });

    it("should explain ambiguity uncertainty clearly", () => {
      const explanation = module.explainUncertainty(UncertaintyTypeEnum.AMBIGUITY);
      expect(explanation).toBeTruthy();
      expect(explanation.length).toBeGreaterThan(30);
      expect(explanation.toLowerCase()).toMatch(/multiple|interpretation|ambiguous|clarify/);
      expect(explanation).not.toMatch(/technical jargon|complex terms/);
    });

    it("should provide different explanations for different uncertainty types", () => {
      const epistemicExplanation = module.explainUncertainty(UncertaintyTypeEnum.EPISTEMIC);
      const aleatoryExplanation = module.explainUncertainty(UncertaintyTypeEnum.ALEATORY);
      const ambiguityExplanation = module.explainUncertainty(UncertaintyTypeEnum.AMBIGUITY);

      expect(epistemicExplanation).not.toBe(aleatoryExplanation);
      expect(epistemicExplanation).not.toBe(ambiguityExplanation);
      expect(aleatoryExplanation).not.toBe(ambiguityExplanation);
    });
  });

  describe("recommendActions", () => {
    it("should recommend actions for high confidence", () => {
      const actions = module.recommendActions(0.9);
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.length).toBeLessThanOrEqual(5);
      expect(actions.some((a: string) => a.toLowerCase().includes("proceed"))).toBe(true);
    });

    it("should recommend actions for medium confidence", () => {
      const actions = module.recommendActions(0.6);
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.length).toBeLessThanOrEqual(5);
      expect(
        actions.some((a: string) => a.toLowerCase().match(/verify|validate|review|consider/))
      ).toBe(true);
    });

    it("should recommend actions for low confidence", () => {
      const actions = module.recommendActions(0.3);
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.length).toBeLessThanOrEqual(5);
      expect(
        actions.some((a: string) =>
          a.toLowerCase().match(/more information|gather|investigate|caution/)
        )
      ).toBe(true);
    });

    it("should recommend actions for very low confidence", () => {
      const actions = module.recommendActions(0.1);
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      expect(
        actions.some((a: string) => a.toLowerCase().match(/do not proceed|seek expert|more data/))
      ).toBe(true);
    });

    it("should recommend actions for confidence in 0.2-0.3 range", () => {
      const actions = module.recommendActions(0.25);
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      expect(
        actions.some((a: string) =>
          a.toLowerCase().match(/do not proceed|substantial|research|expert/)
        )
      ).toBe(true);
    });

    it("should provide actionable recommendations (not vague)", () => {
      const actions = module.recommendActions(0.5);
      actions.forEach((action: string) => {
        expect(action.length).toBeGreaterThan(10);
        expect(action).toMatch(/[A-Z]/); // Should start with capital letter
      });
    });

    it("should handle edge case: confidence = 0", () => {
      const actions = module.recommendActions(0);
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });

    it("should handle edge case: confidence = 1", () => {
      const actions = module.recommendActions(1);
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe("generateFactorBreakdown", () => {
    const createMockAssessment = (overallConfidence: number): ConfidenceAssessment => ({
      overallConfidence,
      evidenceQuality: 0.8,
      reasoningCoherence: 0.7,
      completeness: 0.6,
      uncertaintyLevel: 0.3,
      uncertaintyType: UncertaintyTypeEnum.EPISTEMIC,
      factors: [
        {
          dimension: "evidence",
          score: 0.8,
          weight: 0.3,
          explanation: "Strong evidence available",
        },
        {
          dimension: "coherence",
          score: 0.7,
          weight: 0.3,
          explanation: "Reasoning is mostly coherent",
        },
        {
          dimension: "completeness",
          score: 0.6,
          weight: 0.25,
          explanation: "Some gaps in analysis",
        },
        {
          dimension: "uncertainty",
          score: 0.7,
          weight: 0.15,
          explanation: "Moderate uncertainty present",
        },
      ],
      timestamp: new Date(),
      processingTime: 50,
    });

    it("should generate factor breakdown with overall confidence", () => {
      const assessment = createMockAssessment(0.7);
      const breakdown = module.generateFactorBreakdown(assessment);

      expect(breakdown).toBeDefined();
      expect(breakdown.overall).toBe(0.7);
    });

    it("should include all confidence factors", () => {
      const assessment = createMockAssessment(0.7);
      const breakdown = module.generateFactorBreakdown(assessment);

      expect(breakdown.factors).toBeDefined();
      expect(Array.isArray(breakdown.factors)).toBe(true);
      expect(breakdown.factors.length).toBeGreaterThan(0);
      expect(breakdown.factors.length).toBe(assessment.factors.length);
    });

    it("should identify strengths (high-scoring factors)", () => {
      const assessment = createMockAssessment(0.7);
      const breakdown = module.generateFactorBreakdown(assessment);

      expect(breakdown.strengths).toBeDefined();
      expect(Array.isArray(breakdown.strengths)).toBe(true);
      expect(breakdown.strengths.length).toBeGreaterThan(0);
      expect(breakdown.strengths.some((s: string) => s.toLowerCase().includes("evidence"))).toBe(
        true
      );
    });

    it("should identify weaknesses (low-scoring factors)", () => {
      const assessment = createMockAssessment(0.7);
      const breakdown = module.generateFactorBreakdown(assessment);

      expect(breakdown.weaknesses).toBeDefined();
      expect(Array.isArray(breakdown.weaknesses)).toBe(true);
      expect(breakdown.weaknesses.length).toBeGreaterThan(0);
      expect(
        breakdown.weaknesses.some((w: string) => w.toLowerCase().includes("completeness"))
      ).toBe(true);
    });

    it("should provide recommendations to improve confidence", () => {
      const assessment = createMockAssessment(0.7);
      const breakdown = module.generateFactorBreakdown(assessment);

      expect(breakdown.recommendations).toBeDefined();
      expect(Array.isArray(breakdown.recommendations)).toBe(true);
      expect(breakdown.recommendations.length).toBeGreaterThan(0);
      expect(breakdown.recommendations.length).toBeLessThanOrEqual(5);
    });

    it("should handle assessment with all high scores", () => {
      const assessment: ConfidenceAssessment = {
        overallConfidence: 0.95,
        evidenceQuality: 0.95,
        reasoningCoherence: 0.95,
        completeness: 0.95,
        uncertaintyLevel: 0.05,
        uncertaintyType: UncertaintyTypeEnum.EPISTEMIC,
        factors: [
          {
            dimension: "evidence",
            score: 0.95,
            weight: 0.3,
            explanation: "Excellent evidence",
          },
          {
            dimension: "coherence",
            score: 0.95,
            weight: 0.3,
            explanation: "Highly coherent",
          },
          {
            dimension: "completeness",
            score: 0.95,
            weight: 0.25,
            explanation: "Very complete",
          },
          {
            dimension: "uncertainty",
            score: 0.95,
            weight: 0.15,
            explanation: "Very low uncertainty",
          },
        ],
        timestamp: new Date(),
        processingTime: 50,
      };

      const breakdown = module.generateFactorBreakdown(assessment);
      expect(breakdown.strengths.length).toBeGreaterThan(0);
      expect(breakdown.weaknesses.length).toBe(0);
    });

    it("should handle assessment with all low scores", () => {
      const assessment: ConfidenceAssessment = {
        overallConfidence: 0.2,
        evidenceQuality: 0.2,
        reasoningCoherence: 0.2,
        completeness: 0.2,
        uncertaintyLevel: 0.8,
        uncertaintyType: UncertaintyTypeEnum.EPISTEMIC,
        factors: [
          {
            dimension: "evidence",
            score: 0.2,
            weight: 0.3,
            explanation: "Weak evidence",
          },
          {
            dimension: "coherence",
            score: 0.2,
            weight: 0.3,
            explanation: "Incoherent reasoning",
          },
          {
            dimension: "completeness",
            score: 0.2,
            weight: 0.25,
            explanation: "Incomplete analysis",
          },
          {
            dimension: "uncertainty",
            score: 0.2,
            weight: 0.15,
            explanation: "High uncertainty",
          },
        ],
        timestamp: new Date(),
        processingTime: 50,
      };

      const breakdown = module.generateFactorBreakdown(assessment);
      expect(breakdown.weaknesses.length).toBeGreaterThan(0);
      expect(breakdown.strengths.length).toBe(0);
    });

    it("should handle edge case: empty factors array", () => {
      const assessment: ConfidenceAssessment = {
        overallConfidence: 0.5,
        evidenceQuality: 0.5,
        reasoningCoherence: 0.5,
        completeness: 0.5,
        uncertaintyLevel: 0.5,
        uncertaintyType: UncertaintyTypeEnum.EPISTEMIC,
        factors: [],
        timestamp: new Date(),
        processingTime: 50,
      };

      const breakdown = module.generateFactorBreakdown(assessment);
      expect(breakdown).toBeDefined();
      expect(breakdown.overall).toBe(0.5);
      expect(breakdown.factors).toEqual([]);
    });

    it("should recommend gathering evidence when evidenceQuality < 0.6", () => {
      const assessment: ConfidenceAssessment = {
        overallConfidence: 0.5,
        evidenceQuality: 0.4,
        reasoningCoherence: 0.7,
        completeness: 0.7,
        uncertaintyLevel: 0.3,
        uncertaintyType: UncertaintyTypeEnum.EPISTEMIC,
        factors: [],
        timestamp: new Date(),
        processingTime: 50,
      };

      const breakdown = module.generateFactorBreakdown(assessment);
      expect(
        breakdown.recommendations.some((r: string) => r.toLowerCase().includes("evidence"))
      ).toBe(true);
    });

    it("should recommend reviewing reasoning when reasoningCoherence < 0.6", () => {
      const assessment: ConfidenceAssessment = {
        overallConfidence: 0.5,
        evidenceQuality: 0.7,
        reasoningCoherence: 0.4,
        completeness: 0.7,
        uncertaintyLevel: 0.3,
        uncertaintyType: UncertaintyTypeEnum.EPISTEMIC,
        factors: [],
        timestamp: new Date(),
        processingTime: 50,
      };

      const breakdown = module.generateFactorBreakdown(assessment);
      expect(
        breakdown.recommendations.some((r: string) => r.toLowerCase().includes("reasoning"))
      ).toBe(true);
    });

    it("should recommend addressing gaps when completeness < 0.6", () => {
      const assessment: ConfidenceAssessment = {
        overallConfidence: 0.5,
        evidenceQuality: 0.7,
        reasoningCoherence: 0.7,
        completeness: 0.4,
        uncertaintyLevel: 0.3,
        uncertaintyType: UncertaintyTypeEnum.EPISTEMIC,
        factors: [],
        timestamp: new Date(),
        processingTime: 50,
      };

      const breakdown = module.generateFactorBreakdown(assessment);
      expect(
        breakdown.recommendations.some((r: string) => r.toLowerCase().match(/gaps|completeness/))
      ).toBe(true);
    });

    it("should recommend reducing uncertainty when uncertaintyLevel > 0.5", () => {
      const assessment: ConfidenceAssessment = {
        overallConfidence: 0.5,
        evidenceQuality: 0.7,
        reasoningCoherence: 0.7,
        completeness: 0.7,
        uncertaintyLevel: 0.7,
        uncertaintyType: UncertaintyTypeEnum.EPISTEMIC,
        factors: [],
        timestamp: new Date(),
        processingTime: 50,
      };

      const breakdown = module.generateFactorBreakdown(assessment);
      expect(
        breakdown.recommendations.some((r: string) => r.toLowerCase().includes("uncertainty"))
      ).toBe(true);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle null confidence gracefully", () => {
      expect(() => module.formatConfidence(null as unknown as number)).toThrow();
    });

    it("should handle undefined confidence gracefully", () => {
      expect(() => module.formatConfidence(undefined as unknown as number)).toThrow();
    });

    it("should handle NaN confidence gracefully", () => {
      expect(() => module.formatConfidence(NaN)).toThrow();
    });

    it("should handle Infinity confidence gracefully", () => {
      expect(() => module.formatConfidence(Infinity)).toThrow();
    });

    it("should handle negative Infinity confidence gracefully", () => {
      expect(() => module.formatConfidence(-Infinity)).toThrow();
    });
  });
});
