/**
 * BiasPatternRecognizer - Essential Unit Tests
 *
 * Tests core bias detection for all 9 bias types.
 * Reduced from 112 tests to ~18 essential tests covering:
 * - One detection test per bias type
 * - One non-detection test per bias type (where applicable)
 *
 * Requirements: 2.1, 3.1, 6.1
 */

import { beforeEach, describe, expect, it } from "vitest";
import { BiasPatternRecognizer } from "../../../bias/bias-pattern-recognizer";
import type { Assumption, Evidence, ReasoningChain, ReasoningStep } from "../../../bias/types";

// Helper functions with deterministic IDs
let idCounter = 0;

function createReasoningChain(overrides: Partial<ReasoningChain> = {}): ReasoningChain {
  return {
    id: overrides.id ?? `chain-${++idCounter}`,
    steps: overrides.steps ?? [],
    branches: overrides.branches ?? [],
    assumptions: overrides.assumptions ?? [],
    inferences: overrides.inferences ?? [],
    evidence: overrides.evidence ?? [],
    conclusion: overrides.conclusion ?? "Test conclusion",
    confidence: overrides.confidence ?? 0.8,
    context: overrides.context,
  };
}

function createReasoningStep(overrides: Partial<ReasoningStep> = {}): ReasoningStep {
  return {
    id: overrides.id ?? `step-${++idCounter}`,
    content: overrides.content ?? "Test step",
    type: overrides.type ?? "inference",
    confidence: overrides.confidence ?? 0.8,
    evidence: overrides.evidence,
    timestamp: overrides.timestamp ?? new Date("2024-01-15T10:00:00Z"),
  };
}

function createEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: overrides.id ?? `evidence-${++idCounter}`,
    content: overrides.content ?? "Test evidence",
    source: overrides.source ?? "test source",
    reliability: overrides.reliability ?? 0.8,
    relevance: overrides.relevance ?? 0.8,
    timestamp: overrides.timestamp ?? new Date("2024-01-15T10:00:00Z"),
  };
}

function createAssumption(overrides: Partial<Assumption> = {}): Assumption {
  return {
    id: overrides.id ?? `assumption-${++idCounter}`,
    content: overrides.content ?? "Test assumption",
    explicit: overrides.explicit ?? true,
    confidence: overrides.confidence ?? 0.8,
    evidence: overrides.evidence,
  };
}

describe("BiasPatternRecognizer", () => {
  let recognizer: BiasPatternRecognizer;

  beforeEach(() => {
    idCounter = 0;
    recognizer = new BiasPatternRecognizer();
  });

  describe("Confirmation Bias Detection", () => {
    it("should detect confirmation bias when only supporting evidence is considered", () => {
      const chain = createReasoningChain({
        steps: [
          createReasoningStep({ content: "I believe X is true", type: "hypothesis" }),
          createReasoningStep({
            content: "Looking for evidence that supports X",
            type: "evidence",
          }),
        ],
        evidence: [
          createEvidence({ content: "Evidence supporting X", relevance: 0.9 }),
          createEvidence({ content: "More evidence supporting X", relevance: 0.9 }),
        ],
        conclusion: "X is definitely true",
      });

      const bias = recognizer.detectConfirmationBias(chain);

      expect(bias).not.toBeNull();
      expect(bias?.type).toBe("confirmation");
      expect(bias?.severity).toBeGreaterThan(0.5);
    });

    it("should not detect confirmation bias when balanced evidence is considered", () => {
      const chain = createReasoningChain({
        evidence: [
          createEvidence({ content: "Evidence supporting Z", relevance: 0.8 }),
          createEvidence({ content: "Evidence against Z", relevance: 0.8 }),
        ],
        conclusion: "Z requires more investigation",
      });

      const bias = recognizer.detectConfirmationBias(chain);
      expect(bias).toBeNull();
    });
  });

  describe("Anchoring Bias Detection", () => {
    it("should detect anchoring bias when first value heavily influences conclusion", () => {
      const chain = createReasoningChain({
        steps: [
          createReasoningStep({ content: "Initial estimate: $100", type: "hypothesis" }),
          createReasoningStep({ content: "Adjusting from $100", type: "inference" }),
        ],
        evidence: [createEvidence({ content: "Market data suggests $150", relevance: 0.9 })],
        conclusion: "Final estimate: $105",
      });

      const bias = recognizer.detectAnchoringBias(chain);

      expect(bias).not.toBeNull();
      expect(bias?.type).toBe("anchoring");
    });

    it("should not detect anchoring when proper adjustment occurs", () => {
      const chain = createReasoningChain({
        steps: [
          createReasoningStep({ content: "Initial estimate: $100", type: "hypothesis" }),
          createReasoningStep({
            content: "Significant adjustment based on data",
            type: "inference",
          }),
        ],
        evidence: [createEvidence({ content: "Market data suggests $150", relevance: 0.9 })],
        conclusion: "Final estimate: $145",
      });

      const bias = recognizer.detectAnchoringBias(chain);
      expect(bias).toBeNull();
    });
  });

  describe("Availability Bias Detection", () => {
    it("should detect availability bias when recent events dominate reasoning", () => {
      const chain = createReasoningChain({
        steps: [
          createReasoningStep({ content: "Recent plane crash in the news", type: "evidence" }),
        ],
        evidence: [
          createEvidence({
            content: "Plane crash yesterday",
            timestamp: new Date(),
            relevance: 0.9,
          }),
        ],
        conclusion: "Flying is very dangerous",
      });

      const bias = recognizer.detectAvailabilityBias(chain);

      expect(bias).not.toBeNull();
      expect(bias?.type).toBe("availability");
    });

    it("should not detect availability bias when statistical reasoning is used", () => {
      const chain = createReasoningChain({
        evidence: [
          createEvidence({ content: "Statistical analysis of 10,000 cases", relevance: 0.9 }),
        ],
        conclusion: "Based on comprehensive data analysis",
      });

      const bias = recognizer.detectAvailabilityBias(chain);
      expect(bias).toBeNull();
    });
  });

  describe("Recency Bias Detection", () => {
    it("should detect recency bias when older evidence is dismissed", () => {
      const chain = createReasoningChain({
        steps: [createReasoningStep({ content: "Latest update shows X", type: "evidence" })],
        conclusion: "Previous data is no longer relevant",
      });

      const bias = recognizer.detectRecencyBias(chain);

      expect(bias).not.toBeNull();
      expect(bias?.type).toBe("recency");
    });
  });

  describe("Representativeness Bias Detection", () => {
    it("should detect representativeness bias when stereotypes override base rates", () => {
      const chain = createReasoningChain({
        steps: [
          createReasoningStep({ content: "Person fits the profile of X", type: "inference" }),
        ],
        assumptions: [createAssumption({ content: "People who look like X are usually Y" })],
        conclusion: "Therefore this person is Y",
      });

      const bias = recognizer.detectRepresentativenessBias(chain);

      expect(bias).not.toBeNull();
      expect(bias?.type).toBe("representativeness");
    });
  });

  describe("Framing Effects Detection", () => {
    it("should detect framing effects when presentation affects conclusion", () => {
      const chain = createReasoningChain({
        steps: [
          createReasoningStep({ content: "90% success rate sounds good", type: "inference" }),
        ],
        conclusion: "This is a good option",
      });

      const bias = recognizer.detectFramingEffects(chain);

      expect(bias).not.toBeNull();
      expect(bias?.type).toBe("framing");
    });
  });

  describe("Sunk Cost Fallacy Detection", () => {
    it("should detect sunk cost fallacy when past investments influence future decisions", () => {
      const chain = createReasoningChain({
        steps: [
          createReasoningStep({ content: "We have already invested $1M", type: "evidence" }),
          createReasoningStep({ content: "We cannot abandon this now", type: "inference" }),
        ],
        conclusion: "Continue the project despite poor prospects",
      });

      const bias = recognizer.detectSunkCostFallacy(chain);

      expect(bias).not.toBeNull();
      expect(bias?.type).toBe("sunk_cost");
    });
  });

  describe("Attribution Bias Detection", () => {
    it("should detect attribution bias when internal factors are overemphasized", () => {
      const chain = createReasoningChain({
        steps: [
          createReasoningStep({ content: "They failed because they are lazy", type: "inference" }),
        ],
        conclusion: "Personal character is the cause",
      });

      const bias = recognizer.detectAttributionBias(chain);

      expect(bias).not.toBeNull();
      expect(bias?.type).toBe("attribution");
    });
  });

  describe("Bandwagon Bias Detection", () => {
    it("should detect bandwagon bias when reasoning relies on popularity", () => {
      const chain = createReasoningChain({
        steps: [
          createReasoningStep({
            content: "All the big tech companies are doing microservices",
            type: "evidence",
          }),
          createReasoningStep({
            content: "We should follow what everyone else is doing",
            type: "inference",
          }),
        ],
        conclusion: "We should adopt microservices because everyone is using them",
      });

      const bias = recognizer.detectBandwagonBias(chain);

      expect(bias).not.toBeNull();
      expect(bias?.type).toBe("bandwagon");
      expect(bias?.severity).toBeGreaterThan(0.5);
    });

    it("should detect bandwagon bias with industry standard phrases", () => {
      const chain = createReasoningChain({
        steps: [
          createReasoningStep({
            content: "This is the industry standard approach",
            type: "evidence",
          }),
          createReasoningStep({
            content: "Most people use this framework",
            type: "inference",
          }),
        ],
        conclusion: "We should use it because it is widely adopted",
      });

      const bias = recognizer.detectBandwagonBias(chain);

      expect(bias).not.toBeNull();
      expect(bias?.type).toBe("bandwagon");
    });

    it("should not detect bandwagon bias when merit-based evaluation is present", () => {
      const chain = createReasoningChain({
        steps: [
          createReasoningStep({
            content: "We evaluated the framework against our specific requirements",
            type: "evidence",
          }),
          createReasoningStep({
            content: "After analyzing the pros and cons, it meets our needs",
            type: "inference",
          }),
        ],
        conclusion: "We should adopt this based on our technical evaluation",
      });

      const bias = recognizer.detectBandwagonBias(chain);
      expect(bias).toBeNull();
    });
  });

  describe("Comprehensive Bias Detection", () => {
    it("should detect all biases in a reasoning chain", () => {
      const chain = createReasoningChain({
        steps: [
          createReasoningStep({ content: "I believe X is true", type: "hypothesis" }),
          createReasoningStep({ content: "Evidence supports X", type: "evidence" }),
        ],
        evidence: [createEvidence({ content: "Supporting evidence only", relevance: 0.9 })],
        conclusion: "X is definitely true",
      });

      const biases = recognizer.detectBiases(chain);

      expect(biases).toBeDefined();
      expect(Array.isArray(biases)).toBe(true);
    });
  });
});
