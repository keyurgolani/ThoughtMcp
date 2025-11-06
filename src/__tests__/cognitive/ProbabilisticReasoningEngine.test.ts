/**
 * Unit tests for ProbabilisticReasoningEngine
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ProbabilisticReasoningEngine } from "../../cognitive/ProbabilisticReasoningEngine.js";
import { Context } from "../../types/core.js";

describe("ProbabilisticReasoningEngine", () => {
  let engine: ProbabilisticReasoningEngine;

  beforeEach(() => {
    engine = new ProbabilisticReasoningEngine();
  });

  describe("processWithUncertainty", () => {
    it("should process simple input and return probabilistic result", async () => {
      const input = "The weather is cloudy today";
      const result = await engine.processWithUncertainty(input);

      expect(result).toBeDefined();
      expect(result.conclusion).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.uncertainty_assessment).toBeDefined();
      expect(result.belief_network).toBeDefined();
      expect(result.evidence_integration).toBeDefined();
      expect(result.reasoning_chain).toBeDefined();
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle complex input with context", async () => {
      const input =
        "Given the economic indicators, what is the likelihood of a recession?";
      const context: Context = {
        domain: "economics",
        urgency: 0.8,
        complexity: 0.9,
        session_id: "test-session",
      };

      const result = await engine.processWithUncertainty(input, context);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(
        result.uncertainty_assessment.epistemic_uncertainty
      ).toBeGreaterThan(0);
      expect(
        result.uncertainty_assessment.aleatoric_uncertainty
      ).toBeGreaterThan(0);
      expect(result.alternative_hypotheses).toBeDefined();
      expect(Array.isArray(result.alternative_hypotheses)).toBe(true);
    });

    it("should generate multiple hypotheses", async () => {
      const input = "The stock market is volatile";
      const result = await engine.processWithUncertainty(input);

      expect(result.alternative_hypotheses).toBeDefined();
      expect(result.alternative_hypotheses.length).toBeGreaterThan(0);
      expect(result.belief_network.nodes.size).toBeGreaterThan(0);
    });

    it("should handle error gracefully", async () => {
      // Test with empty input
      const result = await engine.processWithUncertainty("");

      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(0.8); // Adjusted expectation
      expect(
        result.uncertainty_assessment.combined_uncertainty
      ).toBeGreaterThan(0.1);
    });
  });

  describe("updateBeliefs", () => {
    it("should update belief network with new evidence", async () => {
      const evidence = {
        id: "test_evidence",
        content: "Strong supporting evidence",
        type: "observational" as const,
        reliability: 0.9,
        relevance: 0.8,
        timestamp: Date.now(),
        source: "test",
        weight: 1.0,
      };

      const beliefNetwork = {
        nodes: new Map([
          [
            "h1",
            {
              id: "h1",
              name: "Test hypothesis",
              type: "hypothesis" as const,
              probability: 0.5,
              uncertainty: 0.3,
              dependencies: [],
              evidence_support: [],
            },
          ],
        ]),
        edges: new Map(),
        prior_probabilities: new Map([["h1", 0.5]]),
        conditional_probabilities: new Map(),
        evidence_nodes: [],
      };

      const updatedNetwork = await engine.updateBeliefs(
        evidence,
        beliefNetwork
      );

      expect(updatedNetwork).toBeDefined();
      expect(updatedNetwork.nodes.size).toBeGreaterThan(0);

      const updatedNode = updatedNetwork.nodes.get("h1");
      expect(updatedNode).toBeDefined();
      expect(updatedNode?.evidence_support.length).toBeGreaterThan(0);
    });
  });

  describe("quantifyUncertainty", () => {
    it("should quantify uncertainty in reasoning chain", () => {
      const reasoningChain = {
        steps: [
          {
            id: "step1",
            type: "premise" as const,
            content: "Initial premise",
            confidence: 0.8,
            uncertainty: 0.2,
            evidence_basis: [],
            logical_form: "premise",
            alternatives: [],
          },
          {
            id: "step2",
            type: "inference" as const,
            content: "Logical inference",
            confidence: 0.7,
            uncertainty: 0.3,
            evidence_basis: [],
            logical_form: "inference",
            alternatives: [],
          },
        ],
        logical_structure: "premise -> inference",
        confidence_propagation: [0.8, 0.7],
        uncertainty_propagation: [0.2, 0.3],
        branch_points: [],
      };

      const uncertainty = engine.quantifyUncertainty(reasoningChain);

      expect(uncertainty).toBeDefined();
      expect(uncertainty.epistemic_uncertainty).toBeGreaterThan(0);
      expect(uncertainty.aleatoric_uncertainty).toBeGreaterThan(0);
      expect(uncertainty.combined_uncertainty).toBeGreaterThan(0);
      expect(uncertainty.confidence_interval).toHaveLength(2);
      expect(uncertainty.confidence_interval[0]).toBeLessThan(
        uncertainty.confidence_interval[1]
      );
      expect(uncertainty.uncertainty_sources).toBeDefined();
      expect(Array.isArray(uncertainty.uncertainty_sources)).toBe(true);
    });
  });

  describe("propagateUncertainty", () => {
    it("should propagate uncertainty through belief network", () => {
      const beliefNetwork = {
        nodes: new Map([
          [
            "h1",
            {
              id: "h1",
              name: "Hypothesis 1",
              type: "hypothesis" as const,
              probability: 0.6,
              uncertainty: 0.2,
              dependencies: [],
              evidence_support: [],
            },
          ],
          [
            "e1",
            {
              id: "e1",
              name: "Evidence 1",
              type: "evidence" as const,
              probability: 0.8,
              uncertainty: 0.1,
              dependencies: [],
              evidence_support: [],
            },
          ],
        ]),
        edges: new Map(),
        prior_probabilities: new Map(),
        conditional_probabilities: new Map(),
        evidence_nodes: ["e1"],
      };

      const evidence = [
        {
          id: "e1",
          content: "Test evidence",
          type: "observational" as const,
          reliability: 0.8,
          relevance: 0.9,
          timestamp: Date.now(),
          source: "test",
          weight: 1.0,
        },
      ];

      const propagation = engine.propagateUncertainty(beliefNetwork, evidence);

      expect(propagation).toBeDefined();
      expect(propagation.initial_uncertainty).toBeDefined();
      expect(propagation.final_uncertainty).toBeDefined();
      expect(propagation.propagation_path).toBeDefined();
      expect(Array.isArray(propagation.propagation_path)).toBe(true);
      expect(propagation.uncertainty_amplification).toBeGreaterThan(0);
      expect(propagation.critical_nodes).toBeDefined();
      expect(Array.isArray(propagation.critical_nodes)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle very short input", async () => {
      const result = await engine.processWithUncertainty("Yes");

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(
        result.uncertainty_assessment.combined_uncertainty
      ).toBeGreaterThan(0);
    });

    it("should handle very long input", async () => {
      const longInput =
        "This is a very long input that contains many words and concepts that should be processed by the probabilistic reasoning engine to test its ability to handle complex and lengthy inputs with multiple concepts and ideas that need to be analyzed and processed through the belief network and uncertainty quantification systems.";

      const result = await engine.processWithUncertainty(longInput);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle input with special characters", async () => {
      const specialInput =
        "What about 50% chance of rain? $100 investment @ 5% return!";

      const result = await engine.processWithUncertainty(specialInput);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("performance", () => {
    it("should complete processing within reasonable time", async () => {
      const startTime = Date.now();
      const input =
        "Analyze the probability of success for this new product launch";

      const result = await engine.processWithUncertainty(input);
      const processingTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.processing_time_ms).toBeLessThan(5000);
    });
  });
});
