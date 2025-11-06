/**
 * Tests for ForgettingEvaluationEngine
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ForgettingEvaluationEngine } from "../../../cognitive/forgetting/ForgettingEvaluationEngine.js";
import {
  ForgettingContext,
  ForgettingStrategy,
} from "../../../interfaces/forgetting.js";
import { Concept, Episode } from "../../../types/core.js";

describe("ForgettingEvaluationEngine", () => {
  let engine: ForgettingEvaluationEngine;
  let mockContext: ForgettingContext;

  beforeEach(() => {
    engine = new ForgettingEvaluationEngine({
      enable_temporal_decay: true,
      enable_interference_based: false, // Disable for simpler testing
      enable_importance_based: true,
      strategy_weights: {
        temporal_decay: 0.5,
        importance_based: 0.5,
      },
      recommendation_threshold: 0.6,
      high_confidence_threshold: 0.8,
    });

    mockContext = {
      current_time: Date.now(),
      memory_pressure: 0.5,
      recent_access_patterns: [],
      system_goals: ["learning", "productivity"],
      user_preferences: {
        consent_required: false,
        protected_categories: [],
        max_auto_forget_importance: 0.3,
        retention_period_days: 30,
      },
    };
  });

  describe("evaluateMemories", () => {
    it("should evaluate multiple memories and return sorted results", async () => {
      const memories = [
        {
          content: "High importance memory",
          context: { session_id: "test-session", domain: "important" },
          timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
          emotional_tags: [],
          importance: 0.9,
          decay_factor: 1.0,
        } as Episode,
        {
          content: "Low importance memory",
          context: { session_id: "test-session", domain: "unimportant" },
          timestamp: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
          emotional_tags: [],
          importance: 0.1,
          decay_factor: 0.5,
        } as Episode,
        {
          id: "concept_1",
          content: "Medium importance concept",
          relations: [],
          activation: 0.5,
          last_accessed: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
        } as Concept,
      ];

      const evaluations = await engine.evaluateMemories(memories, mockContext);

      expect(evaluations).toHaveLength(3);

      // Results should be sorted by combined score (highest forgetting score first)
      expect(evaluations[0].combined_score).toBeGreaterThanOrEqual(
        evaluations[1].combined_score
      );
      expect(evaluations[1].combined_score).toBeGreaterThanOrEqual(
        evaluations[2].combined_score
      );

      // Low importance, old memory should have highest forgetting score
      expect(evaluations[0].memory_content_summary).toContain("Low importance");
    });

    it("should include strategy scores for each memory", async () => {
      const memory: Episode = {
        content: "Test memory",
        context: { session_id: "test-session", domain: "test" },
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
        emotional_tags: [],
        importance: 0.5,
        decay_factor: 1.0,
      };

      const evaluations = await engine.evaluateMemories([memory], mockContext);
      const evaluation = evaluations[0];

      expect(evaluation.strategy_scores.length).toBeGreaterThan(0);

      const strategyNames = evaluation.strategy_scores.map(
        (s) => s.strategy_name
      );
      expect(strategyNames).toContain("temporal_decay");
      expect(strategyNames).toContain("importance_based");
    });

    it("should generate appropriate recommendations", async () => {
      const highForgettingMemory: Episode = {
        content: "Should be forgotten",
        context: { session_id: "test-session", domain: "unimportant" },
        timestamp: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
        emotional_tags: [],
        importance: 0.1,
        decay_factor: 0.2,
      };

      const lowForgettingMemory: Episode = {
        content: "Should be retained",
        context: { session_id: "test-session", domain: "important" },
        timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
        emotional_tags: ["important"],
        importance: 0.9,
        decay_factor: 1.0,
      };

      const evaluations = await engine.evaluateMemories(
        [highForgettingMemory, lowForgettingMemory],
        mockContext
      );

      const highForgettingEval = evaluations.find((e) =>
        e.memory_content_summary.includes("Should be forgotten")
      )!;
      const lowForgettingEval = evaluations.find((e) =>
        e.memory_content_summary.includes("Should be retained")
      )!;

      expect(highForgettingEval.recommendation.action).toMatch(
        /forget|degrade|archive/
      );
      expect(lowForgettingEval.recommendation.action).toMatch(/retain|archive/);
    });

    it("should assess forgetting impact", async () => {
      const memory: Episode = {
        content: "Test memory with impact",
        context: { session_id: "test-session", domain: "test" },
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
        emotional_tags: [],
        importance: 0.8,
        decay_factor: 1.0,
      };

      const evaluations = await engine.evaluateMemories([memory], mockContext);
      const evaluation = evaluations[0];

      expect(evaluation.estimated_impact).toBeDefined();
      expect(
        evaluation.estimated_impact.retrieval_loss_probability
      ).toBeGreaterThanOrEqual(0);
      expect(
        evaluation.estimated_impact.retrieval_loss_probability
      ).toBeLessThanOrEqual(1);
      expect(
        evaluation.estimated_impact.related_memories_affected
      ).toBeGreaterThanOrEqual(0);
      expect(
        evaluation.estimated_impact.knowledge_gap_risk
      ).toBeGreaterThanOrEqual(0);
      expect(
        evaluation.estimated_impact.recovery_difficulty
      ).toBeGreaterThanOrEqual(0);
    });

    it("should determine user consent requirements", async () => {
      // High importance memory should require consent
      const highImportanceMemory: Episode = {
        content: "Very important memory",
        context: { session_id: "test-session", domain: "critical" },
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
        emotional_tags: [],
        importance: 0.95,
        decay_factor: 1.0,
      };

      // Protected category memory should require consent
      mockContext.user_preferences.protected_categories = ["critical"];

      const evaluations = await engine.evaluateMemories(
        [highImportanceMemory],
        mockContext
      );
      const evaluation = evaluations[0];

      expect(evaluation.requires_user_consent).toBe(true);
    });
  });

  describe("strategy management", () => {
    it("should allow adding custom strategies", async () => {
      const customStrategy: ForgettingStrategy = {
        name: "custom_test",
        description: "Custom test strategy",
        evaluateForForgetting: async () => ({
          strategy_name: "custom_test",
          score: 0.5,
          confidence: 0.8,
          reasoning: ["Custom reasoning"],
          factors: [],
        }),
      };

      engine.addStrategy(customStrategy);
      const strategies = engine.getStrategies();

      expect(strategies.some((s) => s.name === "custom_test")).toBe(true);
    });

    it("should allow removing strategies", () => {
      const initialStrategies = engine.getStrategies();
      const strategyToRemove = initialStrategies[0];

      engine.removeStrategy(strategyToRemove.name);
      const remainingStrategies = engine.getStrategies();

      expect(remainingStrategies).toHaveLength(initialStrategies.length - 1);
      expect(
        remainingStrategies.some((s) => s.name === strategyToRemove.name)
      ).toBe(false);
    });

    it("should handle strategy failures gracefully", async () => {
      const failingStrategy: ForgettingStrategy = {
        name: "failing_strategy",
        description: "Strategy that always fails",
        evaluateForForgetting: async () => {
          throw new Error("Strategy failure");
        },
      };

      engine.addStrategy(failingStrategy);

      const memory: Episode = {
        content: "Test memory",
        context: { session_id: "test-session", domain: "test" },
        timestamp: Date.now(),
        emotional_tags: [],
        importance: 0.5,
        decay_factor: 1.0,
      };

      // Should not throw, but continue with other strategies
      const evaluations = await engine.evaluateMemories([memory], mockContext);
      expect(evaluations).toHaveLength(1);

      // Should still have scores from working strategies
      expect(evaluations[0].strategy_scores.length).toBeGreaterThan(0);
    });
  });

  describe("configuration", () => {
    it("should respect strategy weights in combined score calculation", async () => {
      const engineWithDifferentWeights = new ForgettingEvaluationEngine({
        enable_temporal_decay: true,
        enable_interference_based: false,
        enable_importance_based: true,
        strategy_weights: {
          temporal_decay: 0.9, // Much higher weight
          importance_based: 0.1,
        },
      });

      const memory: Episode = {
        content: "Test memory",
        context: { session_id: "test-session", domain: "test" },
        timestamp: Date.now() - 365 * 24 * 60 * 60 * 1000, // Old memory (high temporal decay)
        emotional_tags: [],
        importance: 0.9, // High importance (low importance-based forgetting)
        decay_factor: 0.3,
      };

      const defaultEvaluations = await engine.evaluateMemories(
        [memory],
        mockContext
      );
      const weightedEvaluations =
        await engineWithDifferentWeights.evaluateMemories(
          [memory],
          mockContext
        );

      // Different weights should produce different combined scores
      expect(defaultEvaluations[0].combined_score).not.toBe(
        weightedEvaluations[0].combined_score
      );
    });

    it("should use recommendation thresholds correctly", async () => {
      const strictEngine = new ForgettingEvaluationEngine({
        recommendation_threshold: 0.9, // Very high threshold
        high_confidence_threshold: 0.95,
      });

      const memory: Episode = {
        content: "Moderate forgetting candidate",
        context: { session_id: "test-session", domain: "test" },
        timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
        emotional_tags: [],
        importance: 0.4,
        decay_factor: 0.7,
      };

      const defaultEvaluations = await engine.evaluateMemories(
        [memory],
        mockContext
      );
      const strictEvaluations = await strictEngine.evaluateMemories(
        [memory],
        mockContext
      );

      // Strict engine should be more conservative in recommendations
      if (defaultEvaluations[0].recommendation.action === "forget") {
        expect(strictEvaluations[0].recommendation.action).toMatch(
          /retain|archive|degrade/
        );
      }
    });
  });
});
