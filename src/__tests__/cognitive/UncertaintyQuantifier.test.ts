/**
 * Unit tests for UncertaintyQuantifier
 */

import { beforeEach, describe, expect, it } from "vitest";
import { UncertaintyQuantifier } from "../../cognitive/UncertaintyQuantifier.js";
import {
  DataPoint,
  KnowledgeState,
  ReasoningStep,
} from "../../interfaces/probabilistic-reasoning.js";

describe("UncertaintyQuantifier", () => {
  let quantifier: UncertaintyQuantifier;

  beforeEach(() => {
    quantifier = new UncertaintyQuantifier();
  });

  describe("assessEpistemicUncertainty", () => {
    it("should assess epistemic uncertainty for complete knowledge", () => {
      const knowledge: KnowledgeState = {
        known_facts: ["fact1", "fact2", "fact3"],
        uncertain_beliefs: new Map([["belief1", 0.8]]),
        knowledge_gaps: [],
        confidence_in_knowledge: 0.9,
        last_updated: Date.now(),
      };

      const uncertainty = quantifier.assessEpistemicUncertainty(knowledge);

      expect(uncertainty).toBeGreaterThan(0);
      expect(uncertainty).toBeLessThan(1);
      expect(uncertainty).toBeLessThan(0.5); // Should be low for complete knowledge
    });

    it("should assess high epistemic uncertainty for incomplete knowledge", () => {
      const knowledge: KnowledgeState = {
        known_facts: ["fact1"],
        uncertain_beliefs: new Map([
          ["belief1", 0.3],
          ["belief2", 0.4],
        ]),
        knowledge_gaps: ["gap1", "gap2", "gap3"],
        confidence_in_knowledge: 0.3,
        last_updated: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
      };

      const uncertainty = quantifier.assessEpistemicUncertainty(knowledge);

      expect(uncertainty).toBeGreaterThan(0.5); // Should be high for incomplete knowledge
      expect(uncertainty).toBeLessThan(1);
    });

    it("should handle empty knowledge state", () => {
      const knowledge: KnowledgeState = {
        known_facts: [],
        uncertain_beliefs: new Map(),
        knowledge_gaps: [],
        confidence_in_knowledge: 0.1,
        last_updated: Date.now(),
      };

      const uncertainty = quantifier.assessEpistemicUncertainty(knowledge);

      expect(uncertainty).toBeGreaterThan(0.5); // Should be high for empty knowledge
      expect(uncertainty).toBeLessThan(1);
    });
  });

  describe("assessAleatoricUncertainty", () => {
    it("should assess aleatoric uncertainty for consistent data", () => {
      const data: DataPoint[] = [
        {
          value: 0.8,
          uncertainty: 0.1,
          source: "source1",
          timestamp: Date.now(),
          reliability: 0.9,
        },
        {
          value: 0.82,
          uncertainty: 0.12,
          source: "source2",
          timestamp: Date.now(),
          reliability: 0.85,
        },
        {
          value: 0.78,
          uncertainty: 0.08,
          source: "source3",
          timestamp: Date.now(),
          reliability: 0.95,
        },
      ];

      const uncertainty = quantifier.assessAleatoricUncertainty(data);

      expect(uncertainty).toBeGreaterThan(0);
      expect(uncertainty).toBeLessThan(1);
      expect(uncertainty).toBeLessThan(0.5); // Should be low for consistent data
    });

    it("should assess high aleatoric uncertainty for variable data", () => {
      const data: DataPoint[] = [
        {
          value: 0.1,
          uncertainty: 0.4,
          source: "source1",
          timestamp: Date.now(),
          reliability: 0.3,
        },
        {
          value: 0.9,
          uncertainty: 0.6,
          source: "source2",
          timestamp: Date.now(),
          reliability: 0.4,
        },
        {
          value: 0.5,
          uncertainty: 0.8,
          source: "source3",
          timestamp: Date.now(),
          reliability: 0.2,
        },
      ];

      const uncertainty = quantifier.assessAleatoricUncertainty(data);

      expect(uncertainty).toBeGreaterThan(0.3); // Should be higher for variable data
      expect(uncertainty).toBeLessThan(1);
    });

    it("should handle empty data array", () => {
      const uncertainty = quantifier.assessAleatoricUncertainty([]);

      expect(uncertainty).toBe(0.5); // Default uncertainty for no data
    });

    it("should handle single data point", () => {
      const data: DataPoint[] = [
        {
          value: 0.7,
          uncertainty: 0.2,
          source: "source1",
          timestamp: Date.now(),
          reliability: 0.8,
        },
      ];

      const uncertainty = quantifier.assessAleatoricUncertainty(data);

      expect(uncertainty).toBeGreaterThan(0);
      expect(uncertainty).toBeLessThan(1);
    });
  });

  describe("combineUncertainties", () => {
    it("should combine epistemic and aleatoric uncertainties", () => {
      const epistemic = 0.3;
      const aleatoric = 0.4;

      const combined = quantifier.combineUncertainties(epistemic, aleatoric);

      expect(combined).toBeDefined();
      expect(combined.total_uncertainty).toBeGreaterThan(0);
      expect(combined.total_uncertainty).toBeLessThan(1);
      expect(combined.epistemic_component).toBe(epistemic);
      expect(combined.aleatoric_component).toBe(aleatoric);
      expect(combined.interaction_effects).toBeGreaterThanOrEqual(0);
      expect(combined.confidence_bounds).toHaveLength(2);
      expect(combined.confidence_bounds[0]).toBeLessThan(
        combined.confidence_bounds[1]
      );
    });

    it("should handle zero uncertainties", () => {
      const combined = quantifier.combineUncertainties(0, 0);

      expect(combined.total_uncertainty).toBeGreaterThanOrEqual(0); // Should have minimum uncertainty
      expect(combined.interaction_effects).toBe(0);
    });

    it("should handle maximum uncertainties", () => {
      const combined = quantifier.combineUncertainties(0.95, 0.95);

      expect(combined.total_uncertainty).toBeLessThan(1); // Should not exceed 1
      expect(combined.interaction_effects).toBeGreaterThan(0);
    });
  });

  describe("trackConfidenceEvolution", () => {
    it("should track confidence evolution through reasoning steps", () => {
      const reasoning: ReasoningStep[] = [
        {
          id: "step1",
          type: "premise",
          content: "Initial premise",
          confidence: 0.8,
          uncertainty: 0.2,
          evidence_basis: [],
          logical_form: "premise",
          alternatives: [],
        },
        {
          id: "step2",
          type: "inference",
          content: "First inference",
          confidence: 0.7,
          uncertainty: 0.3,
          evidence_basis: [],
          logical_form: "inference",
          alternatives: [],
        },
        {
          id: "step3",
          type: "inference",
          content: "Second inference",
          confidence: 0.6,
          uncertainty: 0.4,
          evidence_basis: [],
          logical_form: "inference",
          alternatives: [],
        },
        {
          id: "step4",
          type: "conclusion",
          content: "Final conclusion",
          confidence: 0.65,
          uncertainty: 0.35,
          evidence_basis: [],
          logical_form: "conclusion",
          alternatives: [],
        },
      ];

      const evolution = quantifier.trackConfidenceEvolution(reasoning);

      expect(evolution).toBeDefined();
      expect(evolution.initial_confidence).toBe(0.8);
      expect(evolution.final_confidence).toBe(0.65);
      expect(evolution.confidence_trajectory).toHaveLength(4);
      expect(evolution.confidence_trajectory).toEqual([0.8, 0.7, 0.6, 0.65]);
      expect(evolution.confidence_changes).toBeDefined();
      expect(Array.isArray(evolution.confidence_changes)).toBe(true);
      expect(evolution.stability_measure).toBeGreaterThan(0);
      expect(evolution.stability_measure).toBeLessThanOrEqual(1);
    });

    it("should handle empty reasoning steps", () => {
      const evolution = quantifier.trackConfidenceEvolution([]);

      expect(evolution.initial_confidence).toBe(0.5);
      expect(evolution.final_confidence).toBe(0.5);
      expect(evolution.confidence_trajectory).toEqual([0.5]);
      expect(evolution.confidence_changes).toHaveLength(0);
      expect(evolution.stability_measure).toBe(1.0);
    });

    it("should identify significant confidence changes", () => {
      const reasoning: ReasoningStep[] = [
        {
          id: "step1",
          type: "premise",
          content: "Initial premise",
          confidence: 0.5,
          uncertainty: 0.5,
          evidence_basis: [],
          logical_form: "premise",
          alternatives: [],
        },
        {
          id: "step2",
          type: "inference",
          content: "Strong evidence found",
          confidence: 0.9, // Significant increase
          uncertainty: 0.1,
          evidence_basis: [
            {
              id: "e1",
              content: "Strong evidence",
              type: "observational",
              reliability: 0.9,
              relevance: 0.9,
              timestamp: Date.now(),
              source: "test",
              weight: 1.0,
            },
          ],
          logical_form: "inference",
          alternatives: [],
        },
      ];

      const evolution = quantifier.trackConfidenceEvolution(reasoning);

      expect(evolution.confidence_changes.length).toBeGreaterThan(0);
      const change = evolution.confidence_changes[0];
      expect(change.old_confidence).toBe(0.5);
      expect(change.new_confidence).toBe(0.9);
      expect(change.reason).toContain("evidence");
    });

    it("should calculate stability measure correctly", () => {
      // Stable confidence trajectory
      const stableReasoning: ReasoningStep[] = Array.from(
        { length: 10 },
        (_, i) => ({
          id: `step${i + 1}`,
          type: "inference" as const,
          content: `Step ${i + 1}`,
          confidence: 0.8 + (Math.random() - 0.5) * 0.02, // Small variations around 0.8
          uncertainty: 0.2,
          evidence_basis: [],
          logical_form: "inference",
          alternatives: [],
        })
      );

      const stableEvolution =
        quantifier.trackConfidenceEvolution(stableReasoning);
      expect(stableEvolution.stability_measure).toBeGreaterThan(0.8);

      // Unstable confidence trajectory
      const unstableReasoning: ReasoningStep[] = Array.from(
        { length: 10 },
        (_, i) => ({
          id: `step${i + 1}`,
          type: "inference" as const,
          content: `Step ${i + 1}`,
          confidence: Math.random(), // Random variations
          uncertainty: 0.2,
          evidence_basis: [],
          logical_form: "inference",
          alternatives: [],
        })
      );

      const unstableEvolution =
        quantifier.trackConfidenceEvolution(unstableReasoning);
      expect(unstableEvolution.stability_measure).toBeLessThan(0.9);
    });
  });

  describe("edge cases", () => {
    it("should handle extreme values gracefully", () => {
      const extremeKnowledge: KnowledgeState = {
        known_facts: Array.from({ length: 1000 }, (_, i) => `fact${i}`),
        uncertain_beliefs: new Map(),
        knowledge_gaps: Array.from({ length: 1000 }, (_, i) => `gap${i}`),
        confidence_in_knowledge: 0,
        last_updated: 0,
      };

      const uncertainty =
        quantifier.assessEpistemicUncertainty(extremeKnowledge);
      expect(uncertainty).toBeGreaterThan(0);
      expect(uncertainty).toBeLessThan(1);
    });

    it("should handle very recent knowledge updates", () => {
      const recentKnowledge: KnowledgeState = {
        known_facts: ["fact1"],
        uncertain_beliefs: new Map(),
        knowledge_gaps: [],
        confidence_in_knowledge: 0.9,
        last_updated: Date.now(), // Very recent
      };

      const uncertainty =
        quantifier.assessEpistemicUncertainty(recentKnowledge);
      expect(uncertainty).toBeLessThan(0.5); // Should be lower for recent knowledge
    });

    it("should handle very old knowledge updates", () => {
      const oldKnowledge: KnowledgeState = {
        known_facts: ["fact1"],
        uncertain_beliefs: new Map(),
        knowledge_gaps: [],
        confidence_in_knowledge: 0.9,
        last_updated: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
      };

      const uncertainty = quantifier.assessEpistemicUncertainty(oldKnowledge);
      expect(uncertainty).toBeGreaterThan(0.2); // Should be higher for old knowledge
    });
  });
});
