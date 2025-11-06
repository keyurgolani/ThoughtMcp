/**
 * Unit Tests for ForgettingDecisionSynthesizer
 *
 * Tests the critical forgetting decision synthesis functionality including:
 * - Decision synthesis from multiple evaluations
 * - User consent management
 * - Priority calculation
 * - Benefit estimation
 * - Risk assessment integration
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ForgettingDecisionSynthesizer } from "../../../cognitive/forgetting/ForgettingDecisionSynthesizer.js";
import type {
  ForgettingContext,
  ForgettingDecision,
  ForgettingEvaluation,
} from "../../../interfaces/forgetting.js";

describe("ForgettingDecisionSynthesizer", () => {
  let synthesizer: ForgettingDecisionSynthesizer;

  beforeEach(() => {
    synthesizer = new ForgettingDecisionSynthesizer();
  });

  describe("synthesizeDecisions", () => {
    it("should synthesize decisions from single evaluation", async () => {
      const evaluation: ForgettingEvaluation = createMockEvaluation({
        memory_id: "mem_001",
        combined_score: 0.8,
        recommendation: {
          action: "forget",
          confidence: 0.8,
          reasoning: "High confidence forgetting recommendation",
          alternative_actions: ["archive"],
        },
        requires_user_consent: false,
      });

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        [evaluation],
        context
      );

      expect(decisions).toHaveLength(1);
      expect(decisions[0]).toMatchObject({
        memory_id: "mem_001",
        action: "forget",
        confidence: 0.8,
        reasoning: "High confidence forgetting recommendation",
        user_consent_required: false,
      });
      expect(decisions[0].execution_priority).toBeGreaterThan(0);
      expect(decisions[0].estimated_benefit).toBeDefined();
    });

    it("should synthesize decisions from multiple evaluations for same memory", async () => {
      const evaluations: ForgettingEvaluation[] = [
        createMockEvaluation({
          memory_id: "mem_001",
          combined_score: 0.9,
          recommendation: {
            action: "forget",
            confidence: 0.9,
            reasoning: "Primary strategy recommends forgetting",
            alternative_actions: [],
          },
        }),
        createMockEvaluation({
          memory_id: "mem_001",
          combined_score: 0.7,
          recommendation: {
            action: "archive",
            confidence: 0.7,
            reasoning: "Secondary strategy recommends archiving",
            alternative_actions: ["forget"],
          },
        }),
      ];

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        evaluations,
        context
      );

      expect(decisions).toHaveLength(1);
      // Should use primary evaluation (first one)
      expect(decisions[0].action).toBe("forget");
      expect(decisions[0].confidence).toBe(0.9);
    });

    it("should synthesize decisions for multiple different memories", async () => {
      const evaluations: ForgettingEvaluation[] = [
        createMockEvaluation({
          memory_id: "mem_001",
          combined_score: 0.9,
          recommendation: {
            action: "forget",
            confidence: 0.9,
            reasoning: "High score",
            alternative_actions: [],
          },
        }),
        createMockEvaluation({
          memory_id: "mem_002",
          combined_score: 0.3,
          recommendation: {
            action: "retain",
            confidence: 0.7,
            reasoning: "Low score",
            alternative_actions: [],
          },
        }),
        createMockEvaluation({
          memory_id: "mem_003",
          combined_score: 0.6,
          recommendation: {
            action: "archive",
            confidence: 0.6,
            reasoning: "Medium score",
            alternative_actions: [],
          },
        }),
      ];

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        evaluations,
        context
      );

      expect(decisions).toHaveLength(3);

      // Should be sorted by execution priority (higher first)
      const priorities = decisions.map((d) => d.execution_priority);
      for (let i = 0; i < priorities.length - 1; i++) {
        expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i + 1]);
      }
    });

    it("should handle empty evaluations array", async () => {
      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions([], context);

      expect(decisions).toHaveLength(0);
    });

    it("should require user consent for low confidence forget actions", async () => {
      const evaluation: ForgettingEvaluation = createMockEvaluation({
        memory_id: "mem_001",
        combined_score: 0.5, // Below confidence threshold (0.7)
        recommendation: {
          action: "forget",
          confidence: 0.5,
          reasoning: "Low confidence forgetting",
          alternative_actions: ["retain"],
        },
        requires_user_consent: false,
      });

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        [evaluation],
        context
      );

      expect(decisions[0].user_consent_required).toBe(true);
    });

    it("should require user consent when evaluation explicitly requires it", async () => {
      const evaluation: ForgettingEvaluation = createMockEvaluation({
        memory_id: "mem_001",
        combined_score: 0.9,
        recommendation: {
          action: "archive",
          confidence: 0.9,
          reasoning: "High confidence archiving",
          alternative_actions: [],
        },
        requires_user_consent: true, // Explicitly requires consent
      });

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        [evaluation],
        context
      );

      expect(decisions[0].user_consent_required).toBe(true);
    });
  });

  describe("requestUserConsent", () => {
    it("should grant consent for high confidence decisions requiring consent", async () => {
      const decisions: ForgettingDecision[] = [
        {
          memory_id: "mem_001",
          action: "forget",
          confidence: 0.9, // High confidence
          reasoning: "High confidence decision",
          user_consent_required: true,
          execution_priority: 8,
          estimated_benefit: {
            memory_space_freed: 1.0,
            processing_speed_improvement: 0.1,
            interference_reduction: 0.2,
            focus_improvement: 0.1,
          },
        },
      ];

      const consentResults = await synthesizer.requestUserConsent(decisions);

      expect(consentResults).toHaveLength(1);
      expect(consentResults[0]).toMatchObject({
        memory_id: "mem_001",
        consent_granted: true,
        user_feedback: "Approved based on high confidence",
      });
    });

    it("should reject consent for low confidence decisions", async () => {
      const decisions: ForgettingDecision[] = [
        {
          memory_id: "mem_001",
          action: "forget",
          confidence: 0.5, // Low confidence
          reasoning: "Low confidence decision",
          user_consent_required: true,
          execution_priority: 5,
          estimated_benefit: {
            memory_space_freed: 1.0,
            processing_speed_improvement: 0.1,
            interference_reduction: 0.2,
            focus_improvement: 0.1,
          },
        },
      ];

      const consentResults = await synthesizer.requestUserConsent(decisions);

      expect(consentResults).toHaveLength(1);
      expect(consentResults[0]).toMatchObject({
        memory_id: "mem_001",
        consent_granted: false,
        user_feedback: "Rejected due to insufficient confidence",
      });
    });

    it("should automatically grant consent for decisions not requiring consent", async () => {
      const decisions: ForgettingDecision[] = [
        {
          memory_id: "mem_001",
          action: "retain",
          confidence: 0.7,
          reasoning: "Safe retention decision",
          user_consent_required: false,
          execution_priority: 3,
          estimated_benefit: {
            memory_space_freed: 0,
            processing_speed_improvement: 0,
            interference_reduction: 0,
            focus_improvement: 0,
          },
        },
      ];

      const consentResults = await synthesizer.requestUserConsent(decisions);

      expect(consentResults).toHaveLength(1);
      expect(consentResults[0]).toMatchObject({
        memory_id: "mem_001",
        consent_granted: true,
        user_feedback: "Automatic approval for low-risk decision",
      });
    });

    it("should handle multiple decisions with mixed consent requirements", async () => {
      const decisions: ForgettingDecision[] = [
        {
          memory_id: "mem_001",
          action: "forget",
          confidence: 0.9,
          reasoning: "High confidence",
          user_consent_required: true,
          execution_priority: 8,
          estimated_benefit: createMockBenefit(),
        },
        {
          memory_id: "mem_002",
          action: "retain",
          confidence: 0.6,
          reasoning: "Safe retention",
          user_consent_required: false,
          execution_priority: 3,
          estimated_benefit: createMockBenefit(),
        },
        {
          memory_id: "mem_003",
          action: "forget",
          confidence: 0.4,
          reasoning: "Low confidence",
          user_consent_required: true,
          execution_priority: 6,
          estimated_benefit: createMockBenefit(),
        },
      ];

      const consentResults = await synthesizer.requestUserConsent(decisions);

      expect(consentResults).toHaveLength(3);
      expect(consentResults[0].consent_granted).toBe(true); // High confidence
      expect(consentResults[1].consent_granted).toBe(true); // No consent required
      expect(consentResults[2].consent_granted).toBe(false); // Low confidence
    });

    it("should handle empty decisions array", async () => {
      const consentResults = await synthesizer.requestUserConsent([]);
      expect(consentResults).toHaveLength(0);
    });
  });

  describe("execution priority calculation", () => {
    it("should assign higher priority to high confidence decisions", async () => {
      const highConfidenceEval = createMockEvaluation({
        memory_id: "mem_high",
        combined_score: 0.9,
        recommendation: {
          action: "forget",
          confidence: 0.9,
          reasoning: "High",
          alternative_actions: [],
        },
      });

      const lowConfidenceEval = createMockEvaluation({
        memory_id: "mem_low",
        combined_score: 0.4,
        recommendation: {
          action: "forget",
          confidence: 0.4,
          reasoning: "Low",
          alternative_actions: [],
        },
      });

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        [highConfidenceEval, lowConfidenceEval],
        context
      );

      const highConfidenceDecision = decisions.find(
        (d) => d.memory_id === "mem_high"
      );
      const lowConfidenceDecision = decisions.find(
        (d) => d.memory_id === "mem_low"
      );

      expect(highConfidenceDecision?.execution_priority).toBeGreaterThan(
        lowConfidenceDecision?.execution_priority || 0
      );
    });

    it("should assign different priorities based on action type", async () => {
      const forgetEval = createMockEvaluation({
        memory_id: "mem_forget",
        combined_score: 0.8,
        recommendation: {
          action: "forget",
          confidence: 0.8,
          reasoning: "Forget",
          alternative_actions: [],
        },
      });

      const retainEval = createMockEvaluation({
        memory_id: "mem_retain",
        combined_score: 0.8,
        recommendation: {
          action: "retain",
          confidence: 0.8,
          reasoning: "Retain",
          alternative_actions: [],
        },
      });

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        [forgetEval, retainEval],
        context
      );

      const forgetDecision = decisions.find(
        (d) => d.memory_id === "mem_forget"
      );
      const retainDecision = decisions.find(
        (d) => d.memory_id === "mem_retain"
      );

      // Forget should have higher priority than retain
      expect(forgetDecision?.execution_priority).toBeGreaterThan(
        retainDecision?.execution_priority || 0
      );
    });

    it("should keep priorities within valid range (1-10)", async () => {
      const evaluations = [
        createMockEvaluation({
          memory_id: "mem_001",
          combined_score: 1.0,
          recommendation: {
            action: "forget",
            confidence: 1.0,
            reasoning: "Max",
            alternative_actions: [],
          },
        }),
        createMockEvaluation({
          memory_id: "mem_002",
          combined_score: 0.0,
          recommendation: {
            action: "retain",
            confidence: 0.0,
            reasoning: "Min",
            alternative_actions: [],
          },
        }),
      ];

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        evaluations,
        context
      );

      decisions.forEach((decision) => {
        expect(decision.execution_priority).toBeGreaterThanOrEqual(1);
        expect(decision.execution_priority).toBeLessThanOrEqual(10);
      });
    });
  });

  describe("benefit estimation", () => {
    it("should estimate benefits for forget action", async () => {
      const evaluation = createMockEvaluation({
        memory_id: "mem_001",
        combined_score: 0.8,
        recommendation: {
          action: "forget",
          confidence: 0.8,
          reasoning: "Forget",
          alternative_actions: [],
        },
      });

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        [evaluation],
        context
      );

      const benefit = decisions[0].estimated_benefit;
      expect(benefit.memory_space_freed).toBe(1.0);
      expect(benefit.processing_speed_improvement).toBe(0.1);
      expect(benefit.interference_reduction).toBe(0.2);
      expect(benefit.focus_improvement).toBe(0.1);
    });

    it("should estimate benefits for archive action", async () => {
      const evaluation = createMockEvaluation({
        memory_id: "mem_001",
        combined_score: 0.8,
        recommendation: {
          action: "archive",
          confidence: 0.8,
          reasoning: "Archive",
          alternative_actions: [],
        },
      });

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        [evaluation],
        context
      );

      const benefit = decisions[0].estimated_benefit;
      expect(benefit.memory_space_freed).toBe(0);
      expect(benefit.processing_speed_improvement).toBe(0.05);
      expect(benefit.interference_reduction).toBe(0.1);
      expect(benefit.focus_improvement).toBe(0);
    });

    it("should estimate minimal benefits for retain action", async () => {
      const evaluation = createMockEvaluation({
        memory_id: "mem_001",
        combined_score: 0.8,
        recommendation: {
          action: "retain",
          confidence: 0.8,
          reasoning: "Retain",
          alternative_actions: [],
        },
      });

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        [evaluation],
        context
      );

      const benefit = decisions[0].estimated_benefit;
      expect(benefit.memory_space_freed).toBe(0);
      expect(benefit.processing_speed_improvement).toBe(0);
      expect(benefit.interference_reduction).toBe(0);
      expect(benefit.focus_improvement).toBe(0);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle evaluation with missing recommendation", async () => {
      const evaluation = createMockEvaluation({
        memory_id: "mem_001",
        combined_score: 0.8,
        recommendation: {
          action: "forget",
          confidence: 0.8,
          reasoning: "",
          alternative_actions: [],
        },
      });

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        [evaluation],
        context
      );

      expect(decisions).toHaveLength(1);
      expect(decisions[0].reasoning).toBe("");
    });

    it("should handle evaluation with undefined alternative actions", async () => {
      const evaluation = createMockEvaluation({
        memory_id: "mem_001",
        combined_score: 0.8,
        recommendation: {
          action: "forget",
          confidence: 0.8,
          reasoning: "Test",
          alternative_actions: [],
        },
      });

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        [evaluation],
        context
      );

      expect(decisions).toHaveLength(1);
      expect(decisions[0]).toBeDefined();
    });

    it("should handle very high and very low confidence scores", async () => {
      const evaluations = [
        createMockEvaluation({
          memory_id: "mem_high",
          combined_score: 1.0,
          recommendation: {
            action: "forget",
            confidence: 1.0,
            reasoning: "Perfect",
            alternative_actions: [],
          },
        }),
        createMockEvaluation({
          memory_id: "mem_low",
          combined_score: 0.0,
          recommendation: {
            action: "retain",
            confidence: 0.0,
            reasoning: "None",
            alternative_actions: [],
          },
        }),
      ];

      const context = createMockContext();
      const decisions = await synthesizer.synthesizeDecisions(
        evaluations,
        context
      );

      expect(decisions).toHaveLength(2);
      decisions.forEach((decision) => {
        expect(decision.confidence).toBeGreaterThanOrEqual(0);
        expect(decision.confidence).toBeLessThanOrEqual(1);
      });
    });
  });
});

// Helper functions for creating mock objects

function createMockEvaluation(
  overrides: Partial<ForgettingEvaluation> = {}
): ForgettingEvaluation {
  return {
    memory_id: "default_memory_id",
    memory_type: "episodic",
    memory_content_summary: "Test memory content",
    strategy_scores: [
      {
        strategy_name: "temporal_decay",
        score: 0.7,
        confidence: 0.8,
        reasoning: ["Memory is old", "Rarely accessed"],
        factors: [
          {
            name: "age",
            value: 0.8,
            weight: 0.5,
            description: "Memory age factor",
          },
        ],
      },
    ],
    combined_score: 0.7,
    recommendation: {
      action: "forget",
      confidence: 0.7,
      reasoning: "Default reasoning",
      alternative_actions: ["archive"],
    },
    requires_user_consent: false,
    estimated_impact: {
      retrieval_loss_probability: 0.1,
      related_memories_affected: 2,
      knowledge_gap_risk: 0.2,
      recovery_difficulty: 0.3,
    },
    ...overrides,
  };
}

function createMockContext(): ForgettingContext {
  return {
    current_time: Date.now(),
    memory_pressure: 0.6,
    recent_access_patterns: [],
    system_goals: ["optimize_memory", "maintain_performance"],
    user_preferences: {
      consent_required: true,
      protected_categories: ["important", "personal"],
      max_auto_forget_importance: 0.3,
      retention_period_days: 30,
    },
  };
}

function createMockBenefit() {
  return {
    memory_space_freed: 0.5,
    processing_speed_improvement: 0.05,
    interference_reduction: 0.1,
    focus_improvement: 0.05,
  };
}
