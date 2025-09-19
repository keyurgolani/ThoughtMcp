/**
 * Unit tests for MetacognitionModule
 * Tests confidence assessment, bias detection, coherence evaluation, and suggestion generation
 */

import { beforeEach, describe, expect, it } from "vitest";
import { MetacognitionModule } from "../../cognitive/MetacognitionModule.js";
import { ReasoningStep, ReasoningType } from "../../types/core.js";

describe("MetacognitionModule", () => {
  let metacognition: MetacognitionModule;

  beforeEach(async () => {
    metacognition = new MetacognitionModule();
    await metacognition.initialize({
      confidence_threshold: 0.6,
      coherence_threshold: 0.7,
      bias_detection_sensitivity: 0.5,
      max_suggestions: 5,
    });
  });

  describe("Initialization", () => {
    it("should initialize successfully with default config", async () => {
      const module = new MetacognitionModule();
      await module.initialize({});

      const status = module.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.name).toBe("MetacognitionModule");
    });

    it("should initialize with custom config", async () => {
      const module = new MetacognitionModule();
      await module.initialize({
        confidence_threshold: 0.8,
        coherence_threshold: 0.9,
        bias_detection_sensitivity: 0.3,
      });

      expect(module.getStatus().initialized).toBe(true);
    });
  });

  describe("Confidence Monitoring", () => {
    it("should return low confidence for empty reasoning", () => {
      const confidence = metacognition.monitorConfidence([]);
      expect(confidence).toBe(0.1);
    });

    it("should calculate confidence based on reasoning quality", () => {
      const highQualityReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content:
            "Based on evidence and research, this conclusion follows logically",
          confidence: 0.8,
          alternatives: [
            {
              content: "Alternative explanation",
              confidence: 0.6,
              reasoning: "Different perspective",
            },
          ],
        },
        {
          type: ReasoningType.CAUSAL,
          content:
            "The causal relationship is supported by data and demonstrates clear mechanisms",
          confidence: 0.85,
          alternatives: [],
        },
      ];

      const confidence = metacognition.monitorConfidence(highQualityReasoning);
      expect(confidence).toBeGreaterThan(0.6);
    });

    it("should penalize inconsistent confidence levels", () => {
      const inconsistentReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "This seems right",
          confidence: 0.9,
          alternatives: [],
        },
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "Actually, I'm not sure about this",
          confidence: 0.3,
          alternatives: [],
        },
      ];

      const confidence = metacognition.monitorConfidence(inconsistentReasoning);
      expect(confidence).toBeLessThan(0.7);
    });

    it("should reward evidence-based reasoning", () => {
      const evidenceBasedReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content:
            "Research shows and data demonstrates that this conclusion is supported by evidence",
          confidence: 0.8,
          alternatives: [],
        },
      ];

      const confidence = metacognition.monitorConfidence(
        evidenceBasedReasoning
      );
      expect(confidence).toBeGreaterThan(0.5);
    });

    it("should reward alternative consideration", () => {
      const reasoningWithAlternatives: ReasoningStep[] = [
        {
          type: ReasoningType.ANALOGICAL,
          content: "However, we should consider alternative explanations",
          confidence: 0.7,
          alternatives: [
            {
              content: "Alternative 1",
              confidence: 0.6,
              reasoning: "Different approach",
            },
            {
              content: "Alternative 2",
              confidence: 0.5,
              reasoning: "Another perspective",
            },
          ],
        },
      ];

      const confidence = metacognition.monitorConfidence(
        reasoningWithAlternatives
      );
      expect(confidence).toBeGreaterThan(0.4);
    });
  });

  describe("Bias Detection", () => {
    it("should detect confirmation bias", () => {
      const biasedReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.PATTERN_MATCH,
          content:
            "This confirms my view and supports what I obviously expected as clearly predicted",
          confidence: 0.9,
          alternatives: [],
        },
      ];

      const biases = metacognition.detectBiases(biasedReasoning);
      expect(biases).toContain("confirmation_bias");
    });

    it("should detect overconfidence bias", () => {
      const overconfidentReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "This is definitely correct without doubt",
          confidence: 0.95,
          alternatives: [],
        },
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "Clearly this is the only possible answer",
          confidence: 0.98,
          alternatives: [],
        },
        {
          type: ReasoningType.CAUSAL,
          content: "Obviously this is the right conclusion",
          confidence: 0.97,
          alternatives: [],
        },
      ];

      const biases = metacognition.detectBiases(overconfidentReasoning);
      expect(biases).toContain("overconfidence_bias");
    });

    it("should detect anchoring bias", () => {
      const anchoredReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "Based on my initial impression and first starting point",
          confidence: 0.8,
          alternatives: [],
        },
      ];

      const biases = metacognition.detectBiases(anchoredReasoning);
      expect(biases).toContain("anchoring_bias");
    });

    it("should detect availability heuristic", () => {
      const availabilityReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "I remember a recent example that comes to mind",
          confidence: 0.7,
          alternatives: [],
        },
      ];

      const biases = metacognition.detectBiases(availabilityReasoning);
      expect(biases).toContain("availability_heuristic");
    });

    it("should detect structural biases", () => {
      const tunnelVisionReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "This is the answer",
          confidence: 0.8,
          alternatives: [], // No alternatives considered
        },
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "This confirms it",
          confidence: 0.9,
          alternatives: [], // No alternatives considered
        },
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "Definitely correct",
          confidence: 0.85,
          alternatives: [], // No alternatives considered
        },
      ];

      const biases = metacognition.detectBiases(tunnelVisionReasoning);
      expect(biases).toContain("tunnel_vision");
    });

    it("should detect single mode thinking", () => {
      const singleModeReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "Pattern suggests this",
          confidence: 0.7,
          alternatives: [],
        },
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "Another pattern confirms",
          confidence: 0.8,
          alternatives: [],
        },
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "Pattern matching shows",
          confidence: 0.75,
          alternatives: [],
        },
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "Final pattern indicates",
          confidence: 0.8,
          alternatives: [],
        },
      ];

      const biases = metacognition.detectBiases(singleModeReasoning);
      expect(biases).toContain("single_mode_thinking");
    });

    it("should not detect biases in balanced reasoning", () => {
      const balancedReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content:
            "The evidence suggests this conclusion, though uncertainty remains",
          confidence: 0.7,
          alternatives: [
            {
              content: "Alternative view",
              confidence: 0.5,
              reasoning: "Different interpretation",
            },
          ],
        },
        {
          type: ReasoningType.CAUSAL,
          content: "However, we should consider other causal factors",
          confidence: 0.6,
          alternatives: [],
        },
      ];

      const biases = metacognition.detectBiases(balancedReasoning);
      expect(biases.length).toBeLessThan(2);
    });
  });

  describe("Coherence Assessment", () => {
    it("should return low coherence for empty reasoning", () => {
      const coherence = metacognition.assessCoherence([]);
      expect(coherence).toBe(0.1);
    });

    it("should assess logical consistency", () => {
      const consistentReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "Therefore, this follows logically",
          confidence: 0.8,
          alternatives: [],
        },
        {
          type: ReasoningType.CAUSAL,
          content: "Consequently, we can conclude",
          confidence: 0.85,
          alternatives: [],
        },
      ];

      const coherence = metacognition.assessCoherence(consistentReasoning);
      expect(coherence).toBeGreaterThan(0.7);
    });

    it("should penalize contradictory reasoning", () => {
      const contradictoryReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "This is true and correct",
          confidence: 0.8,
          alternatives: [],
        },
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "Actually, this is false and incorrect",
          confidence: 0.7,
          alternatives: [],
        },
      ];

      const coherence = metacognition.assessCoherence(contradictoryReasoning);
      expect(coherence).toBeLessThan(0.8);
    });

    it("should reward good narrative flow", () => {
      const flowingReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "First, we establish the premise",
          confidence: 0.8,
          alternatives: [],
        },
        {
          type: ReasoningType.CAUSAL,
          content: "Therefore, this leads to the conclusion",
          confidence: 0.8,
          alternatives: [],
        },
        {
          type: ReasoningType.METACOGNITIVE,
          content: "Furthermore, this analysis is comprehensive",
          confidence: 0.7,
          alternatives: [],
        },
      ];

      const coherence = metacognition.assessCoherence(flowingReasoning);
      expect(coherence).toBeGreaterThan(0.6);
    });
  });

  describe("Improvement Suggestions", () => {
    it("should suggest improvements for low confidence reasoning", () => {
      const lowConfidenceReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "I'm not sure about this",
          confidence: 0.3,
          alternatives: [],
        },
      ];

      const suggestions = metacognition.suggestImprovements(
        lowConfidenceReasoning
      );
      expect(suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.some(
          (s) => s.includes("evidence") || s.includes("information")
        )
      ).toBe(true);
    });

    it("should suggest improvements for biased reasoning", () => {
      const biasedReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "This obviously confirms my view as expected",
          confidence: 0.9,
          alternatives: [],
        },
      ];

      const suggestions = metacognition.suggestImprovements(biasedReasoning);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.includes("confirmation_bias"))).toBe(
        true
      );
    });

    it("should suggest improvements for incoherent reasoning", async () => {
      // Use a lower coherence threshold for this test
      const testMetacognition = new MetacognitionModule();
      await testMetacognition.initialize({
        coherence_threshold: 0.8,
      });

      const incoherentReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "This is true and correct",
          confidence: 0.9,
          alternatives: [],
        },
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "This is false and incorrect",
          confidence: 0.8,
          alternatives: [],
        },
      ];

      const suggestions =
        testMetacognition.suggestImprovements(incoherentReasoning);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.some(
          (s) =>
            s.includes("consistency") ||
            s.includes("coherence") ||
            s.includes("logical") ||
            s.includes("flow")
        )
      ).toBe(true);
    });

    it("should suggest strategy improvements", async () => {
      // Use a higher max_suggestions to ensure strategy suggestions are included
      const testMetacognition = new MetacognitionModule();
      await testMetacognition.initialize({
        max_suggestions: 10,
      });

      const basicReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "This seems right",
          confidence: 0.7,
          alternatives: [],
        },
      ];

      const suggestions = testMetacognition.suggestImprovements(basicReasoning);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.some(
          (s) => s.includes("devil's_advocate") || s.includes("pre_mortem")
        )
      ).toBe(true);
    });

    it("should limit suggestions to max_suggestions", async () => {
      await metacognition.initialize({ max_suggestions: 2 });

      const poorReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "This obviously confirms my initial view as expected",
          confidence: 0.3,
          alternatives: [],
        },
      ];

      const suggestions = metacognition.suggestImprovements(poorReasoning);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe("Comprehensive Assessment", () => {
    it("should provide complete metacognitive assessment", () => {
      const reasoning: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "Based on evidence, this conclusion follows",
          confidence: 0.8,
          alternatives: [
            {
              content: "Alternative",
              confidence: 0.6,
              reasoning: "Different view",
            },
          ],
        },
        {
          type: ReasoningType.CAUSAL,
          content: "Therefore, the causal relationship is established",
          confidence: 0.75,
          alternatives: [],
        },
      ];

      const assessment = metacognition.assessReasoning(reasoning);

      expect(assessment).toHaveProperty("confidence");
      expect(assessment).toHaveProperty("coherence");
      expect(assessment).toHaveProperty("biases_detected");
      expect(assessment).toHaveProperty("completeness");
      expect(assessment).toHaveProperty("quality_score");
      expect(assessment).toHaveProperty("suggestions");
      expect(assessment).toHaveProperty("should_reconsider");
      expect(assessment).toHaveProperty("reasoning");

      expect(typeof assessment.confidence).toBe("number");
      expect(typeof assessment.coherence).toBe("number");
      expect(Array.isArray(assessment.biases_detected)).toBe(true);
      expect(typeof assessment.completeness).toBe("number");
      expect(typeof assessment.quality_score).toBe("number");
      expect(Array.isArray(assessment.suggestions)).toBe(true);
      expect(typeof assessment.should_reconsider).toBe("boolean");
      expect(typeof assessment.reasoning).toBe("string");
    });

    it("should recommend reconsideration for poor quality reasoning", () => {
      const poorReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "This obviously confirms my view",
          confidence: 0.4,
          alternatives: [],
        },
      ];

      const assessment = metacognition.assessReasoning(poorReasoning);
      expect(assessment.should_reconsider).toBe(true);
    });

    it("should not recommend reconsideration for high quality reasoning", () => {
      const goodReasoning: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content:
            "Based on evidence and research data, this conclusion follows logically, though some uncertainty remains",
          confidence: 0.85,
          alternatives: [
            {
              content: "Alternative explanation based on different evidence",
              confidence: 0.6,
              reasoning: "Different perspective with supporting data",
            },
          ],
        },
        {
          type: ReasoningType.CAUSAL,
          content:
            "However, we should consider additional causal factors supported by studies",
          confidence: 0.8,
          alternatives: [
            {
              content: "Alternative causal pathway",
              confidence: 0.5,
              reasoning: "Different causal mechanism",
            },
          ],
        },
        {
          type: ReasoningType.METACOGNITIVE,
          content:
            "This analysis considers multiple perspectives and acknowledges uncertainty appropriately",
          confidence: 0.75,
          alternatives: [],
        },
        {
          type: ReasoningType.ANALOGICAL,
          content:
            "Similar patterns in comparable situations support this reasoning",
          confidence: 0.7,
          alternatives: [],
        },
        {
          type: ReasoningType.PROBABILISTIC,
          content: "Statistical analysis suggests this outcome is likely",
          confidence: 0.8,
          alternatives: [],
        },
      ];

      const assessment = metacognition.assessReasoning(goodReasoning);
      expect(assessment.should_reconsider).toBe(false);
      expect(assessment.quality_score).toBeGreaterThan(0.6);
    });
  });

  describe("Process Method", () => {
    it("should process reasoning steps through process method", async () => {
      const reasoning: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "This follows logically",
          confidence: 0.8,
          alternatives: [],
        },
      ];

      const result = await metacognition.process(reasoning);
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("coherence");
      expect(result).toHaveProperty("biases_detected");
    });

    it("should throw error for invalid input", async () => {
      await expect(metacognition.process("invalid input")).rejects.toThrow(
        "MetacognitionModule expects array of ReasoningStep as input"
      );
    });
  });

  describe("Component Lifecycle", () => {
    it("should reset properly", () => {
      metacognition.monitorConfidence([
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "Test",
          confidence: 0.8,
          alternatives: [],
        },
      ]);

      let status = metacognition.getStatus();
      expect(status.active).toBe(true);

      metacognition.reset();
      status = metacognition.getStatus();
      expect(status.last_activity).toBe(0);
    });

    it("should track activity status", () => {
      const initialStatus = metacognition.getStatus();
      expect(initialStatus.active).toBe(false);

      metacognition.monitorConfidence([
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "Test",
          confidence: 0.8,
          alternatives: [],
        },
      ]);

      const activeStatus = metacognition.getStatus();
      expect(activeStatus.active).toBe(true);
      expect(activeStatus.last_activity).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle reasoning with no alternatives gracefully", () => {
      const reasoning: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "Simple reasoning",
          confidence: 0.7,
          alternatives: [],
        },
      ];

      const confidence = metacognition.monitorConfidence(reasoning);
      const coherence = metacognition.assessCoherence(reasoning);
      const biases = metacognition.detectBiases(reasoning);

      expect(confidence).toBeGreaterThan(0);
      expect(coherence).toBeGreaterThan(0);
      expect(Array.isArray(biases)).toBe(true);
    });

    it("should handle single step reasoning", () => {
      const reasoning: ReasoningStep[] = [
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "Single step",
          confidence: 0.6,
          alternatives: [],
        },
      ];

      const assessment = metacognition.assessReasoning(reasoning);
      expect(assessment.confidence).toBeGreaterThan(0);
      expect(assessment.coherence).toBeGreaterThan(0);
      expect(assessment.completeness).toBeGreaterThan(0);
    });

    it("should handle very long reasoning chains", () => {
      const longReasoning: ReasoningStep[] = Array.from(
        { length: 20 },
        (_, i) => ({
          type:
            i % 2 === 0
              ? ReasoningType.LOGICAL_INFERENCE
              : ReasoningType.CAUSAL,
          content: `Step ${i + 1} in the reasoning process`,
          confidence: 0.7 + Math.random() * 0.2,
          alternatives:
            i % 3 === 0
              ? [
                  {
                    content: `Alternative for step ${i + 1}`,
                    confidence: 0.6,
                    reasoning: "Different approach",
                  },
                ]
              : [],
        })
      );

      const assessment = metacognition.assessReasoning(longReasoning);
      expect(assessment.confidence).toBeGreaterThan(0);
      expect(assessment.coherence).toBeGreaterThan(0);
      expect(assessment.completeness).toBeGreaterThan(0);
      expect(assessment.quality_score).toBeGreaterThan(0);
    });
  });
});
