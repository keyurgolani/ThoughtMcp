/**
 * Tests for BiasCorrectionEngine
 *
 * Tests bias correction strategies for all eight bias types,
 * devil's advocate process, evidence reweighting, and effectiveness measurement.
 * Target: 40%+ bias impact reduction with <15% overhead.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { BiasCorrectionEngine } from "../../../bias/bias-correction-engine";
import {
  BiasType,
  type Argument,
  type DetectedBias,
  type Evidence,
  type ReasoningChain,
} from "../../../bias/types";

describe("BiasCorrectionEngine", () => {
  let engine: BiasCorrectionEngine;

  beforeEach(() => {
    engine = new BiasCorrectionEngine();
  });

  // Helper function to create test reasoning chain
  const createTestReasoningChain = (
    steps: string[],
    evidence: Evidence[] = [],
    conclusion: string = "Test conclusion"
  ): ReasoningChain => {
    return {
      id: "test-chain",
      steps: steps.map((content, index) => ({
        id: `step-${index}`,
        content,
        type: "inference" as const,
        confidence: 0.8,
      })),
      branches: [],
      assumptions: [],
      inferences: [],
      evidence,
      conclusion,
    };
  };

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

  describe("Confirmation Bias Correction", () => {
    it("should add contradictory evidence to reasoning chain", () => {
      const reasoning = createTestReasoningChain(
        ["Hypothesis: X is true", "Evidence supports X", "Therefore X is true"],
        [
          {
            id: "e1",
            content: "Supporting evidence for X",
            source: "test",
            reliability: 0.8,
            relevance: 0.9,
          },
        ]
      );

      const bias = createTestBias(BiasType.CONFIRMATION, 0.8);
      const corrected = engine.correctBias(bias, reasoning);

      // Should add contradictory evidence
      expect(corrected.corrected.evidence.length).toBeGreaterThan(reasoning.evidence.length);
      const hasContradictory = corrected.corrected.evidence.some((e) =>
        e.content.toLowerCase().includes("contradict")
      );
      expect(hasContradictory).toBe(true);
    });

    it("should reweight supporting evidence to reduce dominance", () => {
      const evidence: Evidence[] = [
        {
          id: "e1",
          content: "Strong support for hypothesis",
          source: "test",
          reliability: 0.9,
          relevance: 0.95,
        },
        {
          id: "e2",
          content: "More support",
          source: "test",
          reliability: 0.85,
          relevance: 0.9,
        },
      ];

      const reasoning = createTestReasoningChain(
        ["Hypothesis", "All evidence supports it"],
        evidence
      );

      const bias = createTestBias(BiasType.CONFIRMATION, 0.75);
      const corrected = engine.correctBias(bias, reasoning);

      // Should reweight evidence
      const reweighted = corrected.correctionsApplied.some((c) =>
        c.changes.some((ch) => ch.type === "evidence_reweight")
      );
      expect(reweighted).toBe(true);
    });

    it("should challenge assumptions that favor hypothesis", () => {
      const reasoning = createTestReasoningChain([
        "Assuming X is always true",
        "Based on this assumption, Y follows",
      ]);
      reasoning.assumptions = [
        {
          id: "a1",
          content: "X is always true",
          explicit: true,
          confidence: 0.9,
        },
      ];

      const bias = createTestBias(BiasType.CONFIRMATION, 0.7);
      const corrected = engine.correctBias(bias, reasoning);

      // Should challenge assumptions
      const challenged = corrected.correctionsApplied.some((c) =>
        c.changes.some((ch) => ch.type === "assumption_challenged")
      );
      expect(challenged).toBe(true);
    });

    it("should generate alternative hypotheses", () => {
      const reasoning = createTestReasoningChain([
        "Hypothesis: Only X explains the data",
        "Therefore X must be true",
      ]);

      const bias = createTestBias(BiasType.CONFIRMATION, 0.8);
      const corrected = engine.correctBias(bias, reasoning);

      // Should add alternatives
      const hasAlternatives = corrected.correctionsApplied.some((c) =>
        c.changes.some((ch) => ch.type === "alternative_added")
      );
      expect(hasAlternatives).toBe(true);
    });

    it("should reduce bias impact by at least 40%", () => {
      const reasoning = createTestReasoningChain([
        "Only considering supporting evidence",
        "Ignoring contradictory data",
      ]);

      const bias = createTestBias(BiasType.CONFIRMATION, 0.8);
      const corrected = engine.correctBias(bias, reasoning);

      // Should achieve 40%+ reduction
      const reduction = corrected.correctionsApplied.reduce((sum, c) => sum + c.impactReduction, 0);
      expect(reduction).toBeGreaterThanOrEqual(0.4);
    });

    it("should handle edge case with no evidence", () => {
      const reasoning = createTestReasoningChain(["Hypothesis without evidence"]);

      const bias = createTestBias(BiasType.CONFIRMATION, 0.6);
      const corrected = engine.correctBias(bias, reasoning);

      // Should still apply corrections
      expect(corrected.correctionsApplied.length).toBeGreaterThan(0);
      expect(corrected.effectivenessScore).toBeGreaterThan(0);
    });
  });

  describe("Anchoring Bias Correction", () => {
    it("should introduce alternative anchors", () => {
      const reasoning = createTestReasoningChain([
        "Starting with initial value of 100",
        "Adjusting from this anchor",
        "Final estimate near 100",
      ]);

      const bias = createTestBias(BiasType.ANCHORING, 0.75);
      const corrected = engine.correctBias(bias, reasoning);

      // Should introduce alternative anchors
      const hasAlternatives = corrected.corrected.steps.some((s) =>
        s.content.toLowerCase().includes("alternative")
      );
      expect(hasAlternatives).toBe(true);
    });

    it("should reframe the problem to reduce anchor influence", () => {
      const reasoning = createTestReasoningChain([
        "Given initial estimate of X",
        "Adjusting slightly from X",
      ]);

      const bias = createTestBias(BiasType.ANCHORING, 0.7);
      const corrected = engine.correctBias(bias, reasoning);

      // Should reframe
      expect(corrected.correctionsApplied.length).toBeGreaterThan(0);
      expect(corrected.effectivenessScore).toBeGreaterThan(0);
    });

    it("should reduce bias impact by at least 40%", () => {
      const reasoning = createTestReasoningChain([
        "Anchored on initial value",
        "Insufficient adjustment",
      ]);

      const bias = createTestBias(BiasType.ANCHORING, 0.8);
      const corrected = engine.correctBias(bias, reasoning);

      const reduction = corrected.correctionsApplied.reduce((sum, c) => sum + c.impactReduction, 0);
      expect(reduction).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe("Availability Bias Correction", () => {
    it("should seek less available evidence", () => {
      const reasoning = createTestReasoningChain([
        "Recent events suggest X",
        "Memorable cases support X",
      ]);

      const bias = createTestBias(BiasType.AVAILABILITY, 0.7);
      const corrected = engine.correctBias(bias, reasoning);

      // Should seek broader evidence
      const seeksBroader = corrected.correctionsApplied.some((c) =>
        c.changes.some((ch) => ch.type === "evidence_reweight")
      );
      expect(seeksBroader).toBe(true);
    });

    it("should apply statistical reasoning", () => {
      const reasoning = createTestReasoningChain([
        "Vivid examples suggest high probability",
        "Therefore it's very likely",
      ]);

      const bias = createTestBias(BiasType.AVAILABILITY, 0.75);
      const corrected = engine.correctBias(bias, reasoning);

      expect(corrected.correctionsApplied.length).toBeGreaterThan(0);
    });

    it("should reduce bias impact by at least 40%", () => {
      const reasoning = createTestReasoningChain([
        "Only considering memorable cases",
        "Ignoring base rates",
      ]);

      const bias = createTestBias(BiasType.AVAILABILITY, 0.8);
      const corrected = engine.correctBias(bias, reasoning);

      const reduction = corrected.correctionsApplied.reduce((sum, c) => sum + c.impactReduction, 0);
      expect(reduction).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe("Recency Bias Correction", () => {
    it("should weight historical evidence equally", () => {
      const reasoning = createTestReasoningChain([
        "Recent data shows trend X",
        "Older data is less relevant",
      ]);

      const bias = createTestBias(BiasType.RECENCY, 0.7);
      const corrected = engine.correctBias(bias, reasoning);

      expect(corrected.correctionsApplied.length).toBeGreaterThan(0);
      const reduction = corrected.correctionsApplied.reduce((sum, c) => sum + c.impactReduction, 0);
      expect(reduction).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe("Representativeness Bias Correction", () => {
    it("should apply base rate reasoning", () => {
      const reasoning = createTestReasoningChain([
        "This case looks typical of X",
        "Therefore it's probably X",
      ]);

      const bias = createTestBias(BiasType.REPRESENTATIVENESS, 0.75);
      const corrected = engine.correctBias(bias, reasoning);

      expect(corrected.correctionsApplied.length).toBeGreaterThan(0);
      const reduction = corrected.correctionsApplied.reduce((sum, c) => sum + c.impactReduction, 0);
      expect(reduction).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe("Framing Bias Correction", () => {
    it("should present multiple frames", () => {
      const reasoning = createTestReasoningChain([
        "Framed as a gain, this looks good",
        "Therefore we should proceed",
      ]);

      const bias = createTestBias(BiasType.FRAMING, 0.7);
      const corrected = engine.correctBias(bias, reasoning);

      expect(corrected.correctionsApplied.length).toBeGreaterThan(0);
      const reduction = corrected.correctionsApplied.reduce((sum, c) => sum + c.impactReduction, 0);
      expect(reduction).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe("Sunk Cost Fallacy Correction", () => {
    it("should focus on future value and ignore past costs", () => {
      const reasoning = createTestReasoningChain([
        "We've already invested so much",
        "We can't stop now",
      ]);

      const bias = createTestBias(BiasType.SUNK_COST, 0.8);
      const corrected = engine.correctBias(bias, reasoning);

      expect(corrected.correctionsApplied.length).toBeGreaterThan(0);
      const reduction = corrected.correctionsApplied.reduce((sum, c) => sum + c.impactReduction, 0);
      expect(reduction).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe("Attribution Bias Correction", () => {
    it("should consider situational factors", () => {
      const reasoning = createTestReasoningChain([
        "They failed because of their character",
        "I succeeded because of circumstances",
      ]);

      const bias = createTestBias(BiasType.ATTRIBUTION, 0.75);
      const corrected = engine.correctBias(bias, reasoning);

      expect(corrected.correctionsApplied.length).toBeGreaterThan(0);
      const reduction = corrected.correctionsApplied.reduce((sum, c) => sum + c.impactReduction, 0);
      expect(reduction).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe("Devil's Advocate Process", () => {
    it("should generate counter-arguments for conclusions", () => {
      const reasoning = createTestReasoningChain([
        "Conclusion: X is the best option",
        "All evidence supports X",
      ]);

      const alternatives = engine.applyDevilsAdvocate(reasoning);

      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives[0].counterArguments.length).toBeGreaterThan(0);
    });

    it("should identify weaknesses in reasoning", () => {
      const reasoning = createTestReasoningChain([
        "Weak premise leads to conclusion",
        "Therefore conclusion is certain",
      ]);

      const alternatives = engine.applyDevilsAdvocate(reasoning);

      expect(alternatives.length).toBeGreaterThan(0);
      const hasWeaknessIdentification = alternatives.some((alt) =>
        alt.perspective.toLowerCase().includes("weak")
      );
      expect(hasWeaknessIdentification).toBe(true);
    });

    it("should identify insufficient reasoning steps", () => {
      const reasoning = createTestReasoningChain(["Single step"]);

      const alternatives = engine.applyDevilsAdvocate(reasoning);

      expect(alternatives.length).toBeGreaterThan(0);
      const hasWeaknessIdentification = alternatives.some((alt) =>
        alt.perspective.toLowerCase().includes("weakness")
      );
      expect(hasWeaknessIdentification).toBe(true);
    });

    it("should identify low confidence steps", () => {
      const reasoning = createTestReasoningChain(["Step 1", "Step 2"]);
      reasoning.steps[0].confidence = 0.3; // Low confidence
      reasoning.steps[1].confidence = 0.4; // Low confidence

      const alternatives = engine.applyDevilsAdvocate(reasoning);

      expect(alternatives.length).toBeGreaterThan(0);
      const hasWeaknessIdentification = alternatives.some((alt) =>
        alt.perspective.toLowerCase().includes("weakness")
      );
      expect(hasWeaknessIdentification).toBe(true);
    });

    it("should propose alternative interpretations", () => {
      const reasoning = createTestReasoningChain([
        "Data can only mean X",
        "No other explanation possible",
      ]);

      const alternatives = engine.applyDevilsAdvocate(reasoning);

      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives[0].alternativeEvidence.length).toBeGreaterThan(0);
    });

    it("should challenge key assumptions", () => {
      const reasoning = createTestReasoningChain(["Based on assumption A", "Conclusion follows"]);
      reasoning.assumptions = [
        {
          id: "a1",
          content: "Key assumption A",
          explicit: true,
          confidence: 0.9,
        },
      ];

      const alternatives = engine.applyDevilsAdvocate(reasoning);

      expect(alternatives.length).toBeGreaterThan(0);
      const challengesAssumptions = alternatives.some((alt) =>
        alt.perspective.toLowerCase().includes("assumption")
      );
      expect(challengesAssumptions).toBe(true);
    });

    it("should maintain logical coherence", () => {
      const reasoning = createTestReasoningChain(["Premise 1", "Premise 2", "Logical conclusion"]);

      const alternatives = engine.applyDevilsAdvocate(reasoning);

      expect(alternatives.length).toBeGreaterThan(0);
      alternatives.forEach((alt) => {
        expect(alt.confidence).toBeGreaterThan(0);
        expect(alt.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("should provide contradictory evidence", () => {
      const evidence: Evidence[] = [
        {
          id: "e1",
          content: "All data points support hypothesis X",
          source: "study",
          reliability: 0.9,
          relevance: 0.95,
        },
      ];
      const reasoning = createTestReasoningChain(
        ["Evidence strongly supports X", "Therefore X is true"],
        evidence
      );

      const alternatives = engine.applyDevilsAdvocate(reasoning);

      expect(alternatives.length).toBeGreaterThan(0);
      const hasContradictoryEvidence = alternatives.some(
        (alt) => alt.alternativeEvidence && alt.alternativeEvidence.length > 0
      );
      expect(hasContradictoryEvidence).toBe(true);

      // Verify alternative evidence contradicts original
      const altEvidence = alternatives.find((alt) => alt.alternativeEvidence.length > 0);
      if (altEvidence) {
        expect(altEvidence.alternativeEvidence[0].content).toBeTruthy();
        expect(altEvidence.alternativeEvidence[0].content).not.toBe(evidence[0].content);
      }
    });

    it("should integrate with reasoning chain structure", () => {
      const reasoning = createTestReasoningChain([
        "Step 1: Initial observation",
        "Step 2: Analysis",
        "Step 3: Conclusion",
      ]);
      reasoning.assumptions = [
        {
          id: "a1",
          content: "Assumption about context",
          explicit: true,
          confidence: 0.8,
        },
      ];

      const alternatives = engine.applyDevilsAdvocate(reasoning);

      // Should integrate with all parts of reasoning chain
      expect(alternatives.length).toBeGreaterThan(0);

      // Should reference the conclusion
      const referencesConclusion = alternatives.some((alt) =>
        alt.perspective.toLowerCase().includes("opposite")
      );
      expect(referencesConclusion).toBe(true);

      // Should challenge assumptions
      const challengesAssumptions = alternatives.some((alt) =>
        alt.perspective.toLowerCase().includes("assumption")
      );
      expect(challengesAssumptions).toBe(true);

      // Should identify weaknesses in steps
      const identifiesWeaknesses = alternatives.some((alt) =>
        alt.perspective.toLowerCase().includes("weakness")
      );
      expect(identifiesWeaknesses).toBe(true);

      // All alternatives should have valid structure
      alternatives.forEach((alt) => {
        expect(alt.perspective).toBeTruthy();
        expect(alt.confidence).toBeGreaterThan(0);
        expect(alt.confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(alt.counterArguments)).toBe(true);
        expect(Array.isArray(alt.alternativeEvidence)).toBe(true);
      });
    });
  });

  describe("Evidence Reweighting", () => {
    it("should reweight evidence to reduce bias", () => {
      const evidence: Evidence[] = [
        {
          id: "e1",
          content: "Strong supporting evidence",
          source: "test",
          reliability: 0.9,
          relevance: 0.95,
        },
        {
          id: "e2",
          content: "Weak contradictory evidence",
          source: "test",
          reliability: 0.3,
          relevance: 0.4,
        },
      ];

      const bias = createTestBias(BiasType.CONFIRMATION, 0.8);
      const reweighted = engine.reweightEvidence(evidence, bias);

      // Should adjust weights
      expect(reweighted.length).toBe(evidence.length);
      // Contradictory evidence should be weighted higher
      const contradictory = reweighted.find((e) => e.id === "e2");
      expect(contradictory?.relevance).toBeGreaterThan(0.4);
    });
  });

  describe("Counter-Argument Generation", () => {
    it("should generate counter-arguments", () => {
      const argument: Argument = {
        id: "arg1",
        content: "X is the best solution",
        premises: ["Premise 1", "Premise 2"],
        conclusion: "Therefore X",
        strength: 0.8,
      };

      const counterArgs = engine.generateCounterArguments(argument);

      expect(counterArgs.length).toBeGreaterThan(0);
      counterArgs.forEach((arg) => {
        expect(arg.content).toBeTruthy();
        expect(arg.premises.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Effectiveness Measurement", () => {
    it("should calculate impact reduction percentage", () => {
      const reasoning = createTestReasoningChain(["Biased reasoning", "Ignoring alternatives"]);

      const bias = createTestBias(BiasType.CONFIRMATION, 0.8);
      const corrected = engine.correctBias(bias, reasoning);

      // Should calculate reduction
      expect(corrected.effectivenessScore).toBeGreaterThan(0);
      expect(corrected.effectivenessScore).toBeLessThanOrEqual(1);
    });

    it("should compare before/after bias severity", () => {
      const reasoning = createTestReasoningChain(["Severely biased reasoning"]);

      const bias = createTestBias(BiasType.CONFIRMATION, 0.9);
      const corrected = engine.correctBias(bias, reasoning);

      // Should show improvement
      const totalReduction = corrected.correctionsApplied.reduce(
        (sum, c) => sum + c.impactReduction,
        0
      );
      expect(totalReduction).toBeGreaterThan(0);
    });

    it("should measure effectiveness for each correction", () => {
      const reasoning = createTestReasoningChain([
        "Multiple biased steps",
        "Each needs correction",
      ]);

      const bias = createTestBias(BiasType.CONFIRMATION, 0.8);
      const corrected = engine.correctBias(bias, reasoning);

      // Each correction should have effectiveness measure
      corrected.correctionsApplied.forEach((correction) => {
        expect(correction.impactReduction).toBeGreaterThanOrEqual(0);
        expect(correction.impactReduction).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Validation", () => {
    it("should validate corrected reasoning quality", () => {
      const reasoning = createTestReasoningChain(["Original reasoning"]);

      const bias = createTestBias(BiasType.CONFIRMATION, 0.7);
      const corrected = engine.correctBias(bias, reasoning);

      const validation = engine.validateCorrection(corrected);

      expect(validation.valid).toBe(true);
      expect(validation.overallQuality).toBeGreaterThan(0);
      expect(validation.overallQuality).toBeLessThanOrEqual(1);
    });

    it("should identify issues in corrections", () => {
      const reasoning = createTestReasoningChain(["Minimal reasoning"]);

      const bias = createTestBias(BiasType.CONFIRMATION, 0.5);
      const corrected = engine.correctBias(bias, reasoning);

      const validation = engine.validateCorrection(corrected);

      expect(Array.isArray(validation.issues)).toBe(true);
      expect(Array.isArray(validation.improvements)).toBe(true);
    });

    it("should detect when reasoning chain appears unchanged", () => {
      const reasoning = createTestReasoningChain(["Step 1", "Step 2"]);

      // Create a corrected reasoning that has same number of steps and evidence
      const corrected = {
        original: reasoning,
        corrected: {
          ...reasoning,
          steps: [...reasoning.steps],
          evidence: [...reasoning.evidence],
        },
        biasesCorrected: [createTestBias(BiasType.CONFIRMATION, 0.5)],
        correctionsApplied: [],
        effectivenessScore: 0.3,
        timestamp: new Date(),
      };

      const validation = engine.validateCorrection(corrected);

      // Should identify that chain appears unchanged
      expect(validation.issues).toContain("Reasoning chain appears unchanged");
      expect(validation.valid).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle multiple biases in same reasoning chain", () => {
      const reasoning = createTestReasoningChain([
        "Anchored on initial value",
        "Only considering recent evidence",
        "Confirming pre-existing belief",
      ]);

      const bias1 = createTestBias(BiasType.ANCHORING, 0.7);
      const corrected1 = engine.correctBias(bias1, reasoning);

      const bias2 = createTestBias(BiasType.RECENCY, 0.6);
      const corrected2 = engine.correctBias(bias2, corrected1.corrected);

      expect(corrected2.correctionsApplied.length).toBeGreaterThan(0);
    });

    it("should handle low severity biases", () => {
      const reasoning = createTestReasoningChain(["Slightly biased reasoning"]);

      const bias = createTestBias(BiasType.CONFIRMATION, 0.3);
      const corrected = engine.correctBias(bias, reasoning);

      // Should still apply corrections but with lower impact
      expect(corrected.correctionsApplied.length).toBeGreaterThan(0);
    });

    it("should handle high severity biases", () => {
      const reasoning = createTestReasoningChain(["Extremely biased reasoning"]);

      const bias = createTestBias(BiasType.CONFIRMATION, 0.95);
      const corrected = engine.correctBias(bias, reasoning);

      // Should apply strong corrections
      expect(corrected.correctionsApplied.length).toBeGreaterThan(0);
      const totalReduction = corrected.correctionsApplied.reduce(
        (sum, c) => sum + c.impactReduction,
        0
      );
      expect(totalReduction).toBeGreaterThanOrEqual(0.4);
    });
  });
});
