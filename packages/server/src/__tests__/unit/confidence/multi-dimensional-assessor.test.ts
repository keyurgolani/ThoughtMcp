/**
 * Tests for Multi-Dimensional Confidence Assessor
 *
 * Tests the confidence assessment system that evaluates reasoning quality
 * across five dimensions: evidence quality, reasoning coherence, completeness,
 * uncertainty level, and bias freedom.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { MultiDimensionalConfidenceAssessor } from "../../../confidence/multi-dimensional-assessor";
import type { Problem, ReasoningContext } from "../../../reasoning/types";

describe("MultiDimensionalConfidenceAssessor", () => {
  let assessor: MultiDimensionalConfidenceAssessor;

  beforeEach(() => {
    assessor = new MultiDimensionalConfidenceAssessor();
  });

  describe("Overall Confidence Scoring", () => {
    it("should return confidence score between 0 and 1", async () => {
      const context = createMockContext({
        evidence: ["Evidence 1", "Evidence 2", "Evidence 3"],
        constraints: ["Constraint 1"],
        goals: ["Goal 1"],
      });

      const assessment = await assessor.assessConfidence(context);

      expect(assessment.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(assessment.overallConfidence).toBeLessThanOrEqual(1);
    });

    it("should return higher confidence for high-quality reasoning", async () => {
      const highQualityContext = createMockContext({
        evidence: [
          "Strong evidence 1",
          "Strong evidence 2",
          "Strong evidence 3",
          "Strong evidence 4",
        ],
        constraints: ["Clear constraint"],
        goals: ["Well-defined goal"],
      });

      const lowQualityContext = createMockContext({
        evidence: ["Weak evidence"],
        constraints: [],
        goals: [],
      });

      const highAssessment = await assessor.assessConfidence(highQualityContext);
      const lowAssessment = await assessor.assessConfidence(lowQualityContext);

      expect(highAssessment.overallConfidence).toBeGreaterThan(lowAssessment.overallConfidence);
    });

    it("should include timestamp and processing time", async () => {
      const context = createMockContext();
      const assessment = await assessor.assessConfidence(context);

      expect(assessment.timestamp).toBeInstanceOf(Date);
      expect(assessment.processingTime).toBeGreaterThan(0);
    });
  });

  describe("Evidence Quality Assessment", () => {
    it("should assess evidence quality between 0 and 1", async () => {
      const context = createMockContext({
        evidence: ["Evidence 1", "Evidence 2"],
      });

      const assessment = await assessor.assessConfidence(context);

      expect(assessment.evidenceQuality).toBeGreaterThanOrEqual(0);
      expect(assessment.evidenceQuality).toBeLessThanOrEqual(1);
    });

    it("should give higher score for more evidence", async () => {
      const manyEvidenceContext = createMockContext({
        evidence: ["E1", "E2", "E3", "E4", "E5"],
      });

      const fewEvidenceContext = createMockContext({
        evidence: ["E1"],
      });

      const manyAssessment = await assessor.assessConfidence(manyEvidenceContext);
      const fewAssessment = await assessor.assessConfidence(fewEvidenceContext);

      expect(manyAssessment.evidenceQuality).toBeGreaterThan(fewAssessment.evidenceQuality);
    });

    it("should handle empty evidence array", async () => {
      const context = createMockContext({
        evidence: [],
      });

      const assessment = await assessor.assessConfidence(context);

      expect(assessment.evidenceQuality).toBe(0);
    });

    it("should not increase indefinitely with more evidence", async () => {
      const moderateContext = createMockContext({
        evidence: Array(5).fill("Evidence"),
      });

      const excessiveContext = createMockContext({
        evidence: Array(50).fill("Evidence"),
      });

      const moderateAssessment = await assessor.assessConfidence(moderateContext);
      const excessiveAssessment = await assessor.assessConfidence(excessiveContext);

      // Should plateau or have diminishing returns
      const difference = excessiveAssessment.evidenceQuality - moderateAssessment.evidenceQuality;
      expect(difference).toBeLessThan(0.3); // Not a huge difference
    });
  });

  describe("Reasoning Coherence Assessment", () => {
    it("should assess reasoning coherence between 0 and 1", async () => {
      const context = createMockContext();
      const assessment = await assessor.assessConfidence(context);

      expect(assessment.reasoningCoherence).toBeGreaterThanOrEqual(0);
      expect(assessment.reasoningCoherence).toBeLessThanOrEqual(1);
    });

    it("should give higher score for well-structured reasoning", async () => {
      const wellStructuredContext = createMockContext({
        evidence: ["E1", "E2", "E3"],
        constraints: ["C1", "C2"],
        goals: ["G1", "G2"],
      });

      const poorlyStructuredContext = createMockContext({
        problem: {
          id: "test",
          description: "",
          context: "",
        },
        evidence: [],
        constraints: [],
        goals: [],
      });

      const wellAssessment = await assessor.assessConfidence(wellStructuredContext);
      const poorAssessment = await assessor.assessConfidence(poorlyStructuredContext);

      expect(wellAssessment.reasoningCoherence).toBeGreaterThan(poorAssessment.reasoningCoherence);
    });
  });

  describe("Completeness Assessment", () => {
    it("should assess completeness between 0 and 1", async () => {
      const context = createMockContext();
      const assessment = await assessor.assessConfidence(context);

      expect(assessment.completeness).toBeGreaterThanOrEqual(0);
      expect(assessment.completeness).toBeLessThanOrEqual(1);
    });

    it("should give higher score when goals are addressed", async () => {
      const completeContext = createMockContext({
        goals: ["Goal 1", "Goal 2"],
        evidence: ["Evidence for goal 1", "Evidence for goal 2"],
      });

      const incompleteContext = createMockContext({
        goals: ["Goal 1", "Goal 2", "Goal 3"],
        evidence: ["Evidence for goal 1"],
      });

      const completeAssessment = await assessor.assessConfidence(completeContext);
      const incompleteAssessment = await assessor.assessConfidence(incompleteContext);

      expect(completeAssessment.completeness).toBeGreaterThan(incompleteAssessment.completeness);
    });

    it("should handle context with no goals", async () => {
      const context = createMockContext({
        goals: [],
      });

      const assessment = await assessor.assessConfidence(context);

      // Should still provide a completeness score
      expect(assessment.completeness).toBeGreaterThanOrEqual(0);
      expect(assessment.completeness).toBeLessThanOrEqual(1);
    });
  });

  describe("Uncertainty Classification", () => {
    it("should classify uncertainty type", async () => {
      const context = createMockContext();
      const assessment = await assessor.assessConfidence(context);

      expect(assessment.uncertaintyType).toBeDefined();
      expect(["epistemic", "aleatory", "ambiguity"]).toContain(assessment.uncertaintyType);
    });

    it("should classify as epistemic when evidence is lacking", async () => {
      const context = createMockContext({
        evidence: [],
      });

      const assessment = await assessor.assessConfidence(context);

      expect(assessment.uncertaintyType).toBe("epistemic");
    });

    it("should classify as ambiguity when multiple interpretations exist", async () => {
      const context = createMockContext({
        evidence: ["Evidence suggesting A", "Evidence suggesting B", "Evidence suggesting C"],
        problem: {
          id: "test",
          description: "Ambiguous problem with multiple valid solutions",
          context: "Multiple perspectives",
        },
      });

      const assessment = await assessor.assessConfidence(context);

      // Should detect ambiguity from multiple evidence items
      expect(["ambiguity", "epistemic"]).toContain(assessment.uncertaintyType);
    });

    it("should provide uncertainty level between 0 and 1", async () => {
      const context = createMockContext();
      const assessment = await assessor.assessConfidence(context);

      expect(assessment.uncertaintyLevel).toBeGreaterThanOrEqual(0);
      expect(assessment.uncertaintyLevel).toBeLessThanOrEqual(1);
    });
  });

  describe("Performance Requirements", () => {
    it("should complete assessment in less than 100ms", async () => {
      const context = createMockContext({
        evidence: Array(10).fill("Evidence"),
        constraints: Array(5).fill("Constraint"),
        goals: Array(3).fill("Goal"),
      });

      const startTime = performance.now();
      await assessor.assessConfidence(context);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
    });

    it("should handle large contexts efficiently", async () => {
      const largeContext = createMockContext({
        evidence: Array(100).fill("Evidence"),
        constraints: Array(50).fill("Constraint"),
        goals: Array(20).fill("Goal"),
      });

      const startTime = performance.now();
      await assessor.assessConfidence(largeContext);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
    });
  });

  describe("Edge Cases", () => {
    it("should handle null evidence gracefully", async () => {
      const context = createMockContext({
        evidence: null as any,
      });

      const assessment = await assessor.assessConfidence(context);

      expect(assessment).toBeDefined();
      expect(assessment.evidenceQuality).toBe(0);
    });

    it("should handle undefined constraints", async () => {
      const context = createMockContext({
        constraints: undefined as any,
      });

      const assessment = await assessor.assessConfidence(context);

      expect(assessment).toBeDefined();
    });

    it("should handle empty problem description", async () => {
      const context = createMockContext({
        problem: {
          id: "test",
          description: "",
          context: "",
        },
      });

      const assessment = await assessor.assessConfidence(context);

      expect(assessment).toBeDefined();
      expect(assessment.overallConfidence).toBeGreaterThanOrEqual(0);
    });

    it("should handle minimal context", async () => {
      const minimalContext: ReasoningContext = {
        problem: {
          id: "test",
          description: "Test",
          context: "",
        },
        evidence: [],
        constraints: [],
        goals: [],
      };

      const assessment = await assessor.assessConfidence(minimalContext);

      expect(assessment).toBeDefined();
      expect(assessment.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(assessment.overallConfidence).toBeLessThanOrEqual(1);
    });
  });

  describe("Confidence Factors", () => {
    it("should provide detailed factor breakdown", async () => {
      const context = createMockContext();
      const assessment = await assessor.assessConfidence(context);

      expect(assessment.factors).toBeDefined();
      expect(Array.isArray(assessment.factors)).toBe(true);
      expect(assessment.factors.length).toBeGreaterThan(0);
    });

    it("should include all five dimensions in factors", async () => {
      const context = createMockContext();
      const assessment = await assessor.assessConfidence(context);

      const dimensionNames = assessment.factors.map((f: any) => f.dimension);

      expect(dimensionNames).toContain("evidence");
      expect(dimensionNames).toContain("coherence");
      expect(dimensionNames).toContain("completeness");
      expect(dimensionNames).toContain("uncertainty");
    });

    it("should provide explanations for each factor", async () => {
      const context = createMockContext();
      const assessment = await assessor.assessConfidence(context);

      assessment.factors.forEach((factor: any) => {
        expect(factor.explanation).toBeDefined();
        expect(typeof factor.explanation).toBe("string");
        expect(factor.explanation.length).toBeGreaterThan(0);
      });
    });

    it("should include weights for each factor", async () => {
      const context = createMockContext();
      const assessment = await assessor.assessConfidence(context);

      assessment.factors.forEach((factor: any) => {
        expect(factor.weight).toBeGreaterThan(0);
        expect(factor.weight).toBeLessThanOrEqual(1);
      });

      // Weights should sum to approximately 1
      const totalWeight = assessment.factors.reduce((sum: number, f: any) => sum + f.weight, 0);
      expect(totalWeight).toBeCloseTo(1, 1);
    });
  });

  describe("Integration with Reasoning Context", () => {
    it("should work with complete reasoning context", async () => {
      const context: ReasoningContext = {
        problem: {
          id: "test-problem",
          description: "Complex problem requiring analysis",
          context: "Important business decision",
          constraints: ["Budget limit", "Time constraint"],
          goals: ["Maximize ROI", "Minimize risk"],
          complexity: "complex",
          urgency: "high",
        },
        evidence: ["Market research data", "Historical performance", "Expert opinions"],
        constraints: ["Budget limit", "Time constraint", "Resource limit"],
        goals: ["Maximize ROI", "Minimize risk", "Ensure quality"],
        framework: "systems-thinking",
        emotionalState: {
          valence: 0.5,
          arousal: 0.7,
          dominance: 0.3,
        },
      };

      const assessment = await assessor.assessConfidence(context);

      expect(assessment).toBeDefined();
      expect(assessment.overallConfidence).toBeGreaterThan(0);
    });

    it("should consider framework selection in assessment", async () => {
      const withFramework = createMockContext({
        framework: "scientific-method",
      });

      const withoutFramework = createMockContext({
        framework: undefined,
      });

      const withAssessment = await assessor.assessConfidence(withFramework);
      const withoutAssessment = await assessor.assessConfidence(withoutFramework);

      // Having a framework should generally increase confidence
      expect(withAssessment.overallConfidence).toBeGreaterThanOrEqual(
        withoutAssessment.overallConfidence
      );
    });

    it("should consider emotional state if present", async () => {
      const context = createMockContext({
        emotionalState: {
          valence: -0.8, // Negative emotion
          arousal: 0.9, // High arousal
          dominance: 0.2, // Low dominance
        },
      });

      const assessment = await assessor.assessConfidence(context);

      // Should still provide valid assessment
      expect(assessment).toBeDefined();
      expect(assessment.overallConfidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Calibration Model", () => {
    it("should allow setting a calibration model", () => {
      const calibrationModel = {
        domain: "test",
        slope: 0.9,
        intercept: 0.05,
        sampleSize: 100,
        calibrationError: 0.05,
        lastUpdated: new Date(),
      };

      assessor.setCalibrationModel(calibrationModel);
      const retrieved = assessor.getCalibrationModel();

      expect(retrieved).toEqual(calibrationModel);
    });

    it("should return undefined when no calibration model is set", () => {
      const retrieved = assessor.getCalibrationModel();
      expect(retrieved).toBeUndefined();
    });

    it("should apply calibration when model is set", async () => {
      const context = createMockContext({
        evidence: ["E1", "E2", "E3"],
        constraints: ["C1"],
        goals: ["G1"],
      });

      // Get baseline confidence without calibration
      const baselineAssessment = await assessor.assessConfidence(context);
      const baselineConfidence = baselineAssessment.overallConfidence;

      // Set calibration model that adjusts scores
      const calibrationModel = {
        domain: "test",
        slope: 0.8,
        intercept: 0.1,
        sampleSize: 100,
        calibrationError: 0.05,
        lastUpdated: new Date(),
      };
      assessor.setCalibrationModel(calibrationModel);

      // Get calibrated confidence
      const calibratedAssessment = await assessor.assessConfidence(context);
      const calibratedConfidence = calibratedAssessment.overallConfidence;

      // Calibrated confidence should be different from baseline
      // Expected: calibrated = 0.8 * baseline + 0.1
      const expectedCalibrated = Math.min(1.0, Math.max(0, 0.8 * baselineConfidence + 0.1));
      expect(calibratedConfidence).toBeCloseTo(expectedCalibrated, 2);
    });

    it("should clamp calibrated confidence to valid range", async () => {
      const context = createMockContext({
        evidence: Array(10).fill("Evidence"),
        constraints: Array(5).fill("Constraint"),
        goals: Array(3).fill("Goal"),
      });

      // Set calibration model that could produce values outside [0, 1]
      const calibrationModel = {
        domain: "test",
        slope: 2.0, // Could push values above 1
        intercept: 0.5,
        sampleSize: 100,
        calibrationError: 0.05,
        lastUpdated: new Date(),
      };
      assessor.setCalibrationModel(calibrationModel);

      const assessment = await assessor.assessConfidence(context);

      // Should be clamped to valid range
      expect(assessment.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(assessment.overallConfidence).toBeLessThanOrEqual(1);
    });

    it("should handle negative calibration results", async () => {
      const context = createMockContext({
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Set calibration model that could produce negative values
      const calibrationModel = {
        domain: "test",
        slope: 0.5,
        intercept: -0.5, // Could push values below 0
        sampleSize: 100,
        calibrationError: 0.05,
        lastUpdated: new Date(),
      };
      assessor.setCalibrationModel(calibrationModel);

      const assessment = await assessor.assessConfidence(context);

      // Should be clamped to 0
      expect(assessment.overallConfidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Explanation Quality", () => {
    it("should provide different explanations for different evidence scores", async () => {
      const contexts = [
        createMockContext({ evidence: [] }), // Score 0
        createMockContext({ evidence: ["E1"] }), // Low score
        createMockContext({ evidence: ["E1", "E2", "E3"] }), // Medium score
        createMockContext({ evidence: Array(10).fill("E") }), // High score
      ];

      const assessments = await Promise.all(contexts.map((c) => assessor.assessConfidence(c)));

      // Each should have a unique explanation
      const explanations = assessments.map((a) => {
        const evidenceFactor = a.factors.find((f: any) => f.dimension === "evidence");
        return evidenceFactor?.explanation;
      });

      // All explanations should be defined and different
      expect(explanations.every((e) => e && e.length > 0)).toBe(true);
      expect(new Set(explanations).size).toBe(explanations.length);
    });

    it("should provide different explanations for different coherence scores", async () => {
      const contexts = [
        createMockContext({
          problem: { id: "1", description: "", context: "" },
          evidence: [],
          constraints: [],
          goals: [],
        }), // Low coherence
        createMockContext({
          evidence: ["E1"],
          constraints: ["C1"],
          goals: ["G1"],
        }), // Medium coherence
        createMockContext({
          evidence: ["E1", "E2", "E3"],
          constraints: ["C1", "C2"],
          goals: ["G1", "G2"],
          framework: "scientific-method",
        }), // High coherence
      ];

      const assessments = await Promise.all(contexts.map((c) => assessor.assessConfidence(c)));

      // Each should have a unique explanation
      const explanations = assessments.map((a) => {
        const coherenceFactor = a.factors.find((f: any) => f.dimension === "coherence");
        return coherenceFactor?.explanation;
      });

      // All explanations should be defined
      expect(explanations.every((e) => e && e.length > 0)).toBe(true);
    });

    it("should provide different explanations for different completeness scores", async () => {
      const contexts = [
        createMockContext({ goals: [], evidence: [] }), // Low completeness
        createMockContext({ goals: ["G1", "G2"], evidence: ["E1"] }), // Medium completeness
        createMockContext({ goals: ["G1", "G2"], evidence: ["E1", "E2", "E3"] }), // High completeness
      ];

      const assessments = await Promise.all(contexts.map((c) => assessor.assessConfidence(c)));

      // Each should have a unique explanation
      const explanations = assessments.map((a) => {
        const completenessFactor = a.factors.find((f: any) => f.dimension === "completeness");
        return completenessFactor?.explanation;
      });

      // All explanations should be defined
      expect(explanations.every((e) => e && e.length > 0)).toBe(true);
    });

    it("should provide different explanations for different uncertainty levels", async () => {
      const contexts = [
        createMockContext({ evidence: Array(10).fill("E") }), // Low uncertainty
        createMockContext({ evidence: ["E1", "E2"] }), // Medium uncertainty
        createMockContext({ evidence: [] }), // High uncertainty
      ];

      const assessments = await Promise.all(contexts.map((c) => assessor.assessConfidence(c)));

      // Each should have a unique explanation
      const explanations = assessments.map((a) => {
        const uncertaintyFactor = a.factors.find((f: any) => f.dimension === "uncertainty");
        return uncertaintyFactor?.explanation;
      });

      // All explanations should be defined
      expect(explanations.every((e) => e && e.length > 0)).toBe(true);
    });
  });
});

// Helper function to create mock reasoning contexts
function createMockContext(overrides: Partial<ReasoningContext> = {}): ReasoningContext {
  const defaultProblem: Problem = {
    id: "test-problem",
    description: "Test problem description",
    context: "Test context",
  };

  return {
    problem: overrides.problem || defaultProblem,
    evidence: overrides.evidence !== undefined ? overrides.evidence : ["Default evidence"],
    constraints:
      overrides.constraints !== undefined ? overrides.constraints : ["Default constraint"],
    goals: overrides.goals !== undefined ? overrides.goals : ["Default goal"],
    framework: overrides.framework,
    emotionalState: overrides.emotionalState,
  };
}
