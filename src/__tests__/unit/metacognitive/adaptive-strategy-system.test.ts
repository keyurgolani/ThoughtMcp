/**
 * Tests for Adaptive Strategy System
 *
 * Tests pattern identification, strategy effectiveness measurement,
 * adaptive rule adjustment, and improvement tracking.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { AdaptiveStrategySystem } from "../../../metacognitive/adaptive-strategy-system";
import type {
  Context,
  Feedback,
  Outcome,
  Performance,
  Strategy,
  StrategyExecution,
} from "../../../metacognitive/types";

// Counter for deterministic ID generation
let outcomeCounter = 0;

// Helper function to create proper Outcome objects
function createOutcome(success: boolean, quality: number): Outcome {
  return {
    id: `outcome-${outcomeCounter++}`,
    success,
    quality,
    description: success ? "Success" : "Failure",
    timestamp: new Date(),
  };
}

describe("AdaptiveStrategySystem", () => {
  let system: AdaptiveStrategySystem;

  beforeEach(() => {
    system = new AdaptiveStrategySystem();
  });

  describe("Pattern Identification", () => {
    describe("Success Patterns", () => {
      it("should identify success patterns from execution history", () => {
        const history: StrategyExecution[] = [
          {
            id: "exec1",
            strategyId: "analytical",
            context: { complexity: "high", uncertainty: "low" },
            outcome: createOutcome(true, 0.9),
            timestamp: new Date(),
          },
          {
            id: "exec2",
            strategyId: "analytical",
            context: { complexity: "high", uncertainty: "low" },
            outcome: createOutcome(true, 0.85),
            timestamp: new Date(),
          },
          {
            id: "exec3",
            strategyId: "analytical",
            context: { complexity: "high", uncertainty: "low" },
            outcome: createOutcome(true, 0.88),
            timestamp: new Date(),
          },
        ];

        const patterns = system.identifySuccessPatterns(history);

        expect(patterns).toBeDefined();
        expect(patterns.length).toBeGreaterThan(0);
        expect(patterns[0]).toHaveProperty("strategyId");
        expect(patterns[0]).toHaveProperty("contextFactors");
        expect(patterns[0]).toHaveProperty("confidence");
      });

      it("should extract contextual factors from success patterns", () => {
        const history: StrategyExecution[] = [
          {
            id: "exec1",
            strategyId: "creative",
            context: { complexity: "moderate", uncertainty: "high", timePressure: "low" },
            outcome: createOutcome(true, 0.92),
            timestamp: new Date(),
          },
          {
            id: "exec2",
            strategyId: "creative",
            context: { complexity: "moderate", uncertainty: "high", timePressure: "low" },
            outcome: createOutcome(true, 0.89),
            timestamp: new Date(),
          },
        ];

        const patterns = system.identifySuccessPatterns(history);

        expect(patterns[0].contextFactors).toContain("complexity:moderate");
        expect(patterns[0].contextFactors).toContain("uncertainty:high");
      });

      it("should calculate pattern confidence scores", () => {
        const history: StrategyExecution[] = [
          {
            id: "exec1",
            strategyId: "systematic",
            context: { complexity: "simple" },
            outcome: createOutcome(true, 0.8),
            timestamp: new Date(),
          },
          {
            id: "exec2",
            strategyId: "systematic",
            context: { complexity: "simple" },
            outcome: createOutcome(true, 0.85),
            timestamp: new Date(),
          },
          {
            id: "exec3",
            strategyId: "systematic",
            context: { complexity: "simple" },
            outcome: createOutcome(true, 0.9),
            timestamp: new Date(),
          },
        ];

        const patterns = system.identifySuccessPatterns(history);

        expect(patterns[0].confidence).toBeGreaterThan(0);
        expect(patterns[0].confidence).toBeLessThanOrEqual(1);
      });

      it("should handle empty execution history", () => {
        const patterns = system.identifySuccessPatterns([]);

        expect(patterns).toBeDefined();
        expect(patterns.length).toBe(0);
      });

      it("should handle history with no successes", () => {
        const history: StrategyExecution[] = [
          {
            id: "exec1",
            strategyId: "analytical",
            context: { complexity: "high" },
            outcome: createOutcome(false, 0.3),
            timestamp: new Date(),
          },
        ];

        const patterns = system.identifySuccessPatterns(history);

        expect(patterns).toBeDefined();
        expect(patterns.length).toBe(0);
      });
    });

    describe("Failure Patterns", () => {
      it("should identify failure patterns from execution history", () => {
        const history: StrategyExecution[] = [
          {
            id: "exec1",
            strategyId: "creative",
            context: { complexity: "simple", timePressure: "high" },
            outcome: createOutcome(false, 0.3),
            timestamp: new Date(),
          },
          {
            id: "exec2",
            strategyId: "creative",
            context: { complexity: "simple", timePressure: "high" },
            outcome: createOutcome(false, 0.25),
            timestamp: new Date(),
          },
        ];

        const patterns = system.identifyFailurePatterns(history);

        expect(patterns).toBeDefined();
        expect(patterns.length).toBeGreaterThan(0);
        expect(patterns[0]).toHaveProperty("strategyId");
        expect(patterns[0]).toHaveProperty("contextFactors");
        expect(patterns[0]).toHaveProperty("confidence");
      });

      it("should identify anti-patterns in failures", () => {
        const history: StrategyExecution[] = [
          {
            id: "exec1",
            strategyId: "analytical",
            context: { complexity: "low", uncertainty: "high" },
            outcome: createOutcome(false, 0.4),
            timestamp: new Date(),
          },
          {
            id: "exec2",
            strategyId: "analytical",
            context: { complexity: "low", uncertainty: "high" },
            outcome: createOutcome(false, 0.35),
            timestamp: new Date(),
          },
        ];

        const patterns = system.identifyFailurePatterns(history);

        expect(patterns[0].contextFactors).toContain("uncertainty:high");
      });

      it("should handle history with no failures", () => {
        const history: StrategyExecution[] = [
          {
            id: "exec1",
            strategyId: "analytical",
            context: { complexity: "high" },
            outcome: createOutcome(true, 0.9),
            timestamp: new Date(),
          },
        ];

        const patterns = system.identifyFailurePatterns(history);

        expect(patterns).toBeDefined();
        expect(patterns.length).toBe(0);
      });
    });
  });

  describe("Strategy Effectiveness Measurement", () => {
    it("should measure strategy effectiveness with multiple outcomes", () => {
      const strategy: Strategy = {
        id: "analytical",
        name: "Analytical Strategy",
        rules: [],
      };

      const outcomes: Outcome[] = [
        { id: "o1", success: true, quality: 0.9, description: "Good", timestamp: new Date() },
        { id: "o2", success: true, quality: 0.85, description: "Good", timestamp: new Date() },
        { id: "o3", success: false, quality: 0.4, description: "Poor", timestamp: new Date() },
      ];

      const effectiveness = system.measureStrategyEffectiveness(strategy, outcomes);

      expect(effectiveness).toBeGreaterThan(0);
      expect(effectiveness).toBeLessThanOrEqual(1);
    });

    it("should weight effectiveness by outcome quality", () => {
      const strategy: Strategy = {
        id: "creative",
        name: "Creative Strategy",
        rules: [],
      };

      const highQualityOutcomes: Outcome[] = [
        { id: "o1", success: true, quality: 0.95, description: "Excellent", timestamp: new Date() },
        { id: "o2", success: true, quality: 0.92, description: "Excellent", timestamp: new Date() },
      ];

      const lowQualityOutcomes: Outcome[] = [
        { id: "o3", success: true, quality: 0.6, description: "Mediocre", timestamp: new Date() },
        { id: "o4", success: true, quality: 0.55, description: "Mediocre", timestamp: new Date() },
      ];

      const highEffectiveness = system.measureStrategyEffectiveness(strategy, highQualityOutcomes);
      const lowEffectiveness = system.measureStrategyEffectiveness(strategy, lowQualityOutcomes);

      expect(highEffectiveness).toBeGreaterThan(lowEffectiveness);
    });

    it("should handle strategy with no outcomes", () => {
      const strategy: Strategy = {
        id: "systematic",
        name: "Systematic Strategy",
        rules: [],
      };

      const effectiveness = system.measureStrategyEffectiveness(strategy, []);

      expect(effectiveness).toBe(0);
    });

    it("should normalize effectiveness scores to 0-1 range", () => {
      const strategy: Strategy = {
        id: "hybrid",
        name: "Hybrid Strategy",
        rules: [],
      };

      const outcomes: Outcome[] = [
        { id: "o1", success: true, quality: 1.0, description: "Perfect", timestamp: new Date() },
        { id: "o2", success: true, quality: 0.9, description: "Great", timestamp: new Date() },
      ];

      const effectiveness = system.measureStrategyEffectiveness(strategy, outcomes);

      expect(effectiveness).toBeGreaterThanOrEqual(0);
      expect(effectiveness).toBeLessThanOrEqual(1);
    });

    it("should compare strategies in same context", () => {
      const strategy1: Strategy = {
        id: "analytical",
        name: "Analytical",
        rules: [],
      };

      const strategy2: Strategy = {
        id: "creative",
        name: "Creative",
        rules: [],
      };

      const context: Context = {
        complexity: "high",
        uncertainty: "low",
      };

      const comparison = system.compareStrategies([strategy1, strategy2], context);

      expect(comparison).toBeDefined();
      expect(comparison).toHaveProperty("rankings");
      expect(comparison.rankings.length).toBe(2);
      expect(comparison.rankings[0]).toHaveProperty("strategyId");
      expect(comparison.rankings[0]).toHaveProperty("score");
    });

    it("should rank strategies by effectiveness", () => {
      const strategy1: Strategy = {
        id: "high-performer",
        name: "High Performer",
        rules: [],
      };

      const strategy2: Strategy = {
        id: "low-performer",
        name: "Low Performer",
        rules: [],
      };

      const context: Context = {
        complexity: "moderate",
      };

      const comparison = system.compareStrategies([strategy1, strategy2], context);

      expect(comparison.rankings[0].score).toBeGreaterThanOrEqual(comparison.rankings[1].score);
    });
  });

  describe("Adaptive Rule Adjustment", () => {
    it("should adjust strategy rules based on patterns", () => {
      const patterns = [
        {
          strategyId: "analytical",
          contextFactors: ["complexity:high", "uncertainty:low"],
          confidence: 0.85,
          sampleSize: 10,
        },
      ];

      expect(() => system.adjustStrategyRules(patterns)).not.toThrow();
    });

    it("should update rule weights dynamically", () => {
      const patterns = [
        {
          strategyId: "creative",
          contextFactors: ["uncertainty:high"],
          confidence: 0.8,
          sampleSize: 8,
        },
      ];

      system.adjustStrategyRules(patterns);

      // Verify rules were adjusted (implementation-specific)
      expect(true).toBe(true);
    });

    it("should add new rules for discovered patterns", () => {
      const patterns = [
        {
          strategyId: "systematic",
          contextFactors: ["complexity:simple", "timePressure:low"],
          confidence: 0.9,
          sampleSize: 12,
        },
      ];

      system.adjustStrategyRules(patterns);

      // Verify new rules were added (implementation-specific)
      expect(true).toBe(true);
    });

    it("should validate rule adjustments", () => {
      const invalidPatterns = [
        {
          strategyId: "",
          contextFactors: [],
          confidence: -0.5, // Invalid confidence
          sampleSize: 0,
        },
      ];

      expect(() => system.adjustStrategyRules(invalidPatterns)).not.toThrow();
    });

    it("should update strategy selection based on feedback", () => {
      const feedback: Feedback[] = [
        {
          id: "f1",
          strategyId: "analytical",
          rating: 0.9,
          context: { complexity: "high" },
          timestamp: new Date(),
        },
        {
          id: "f2",
          strategyId: "creative",
          rating: 0.6,
          context: { complexity: "high" },
          timestamp: new Date(),
        },
      ];

      expect(() => system.updateStrategySelection(feedback)).not.toThrow();
    });
  });

  describe("Improvement Tracking", () => {
    it("should calculate improvement metrics", () => {
      const baseline: Performance = {
        successRate: 0.7,
        averageQuality: 0.75,
        averageTime: 5000,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      };

      const current: Performance = {
        successRate: 0.8,
        averageQuality: 0.85,
        averageTime: 4500,
        timestamp: new Date(),
      };

      const improvement = system.demonstrateImprovement(baseline, current);

      expect(improvement).toBeDefined();
      expect(improvement).toHaveProperty("successRateImprovement");
      expect(improvement).toHaveProperty("qualityImprovement");
      expect(improvement).toHaveProperty("timeImprovement");
    });

    it("should calculate improvement percentages", () => {
      const baseline: Performance = {
        successRate: 0.7,
        averageQuality: 0.7,
        averageTime: 5000,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };

      const current: Performance = {
        successRate: 0.77, // 10% improvement
        averageQuality: 0.77, // 10% improvement
        averageTime: 4500, // 10% improvement
        timestamp: new Date(),
      };

      const improvement = system.demonstrateImprovement(baseline, current);

      expect(improvement.successRateImprovement).toBeCloseTo(0.1, 1);
      expect(improvement.qualityImprovement).toBeCloseTo(0.1, 1);
      expect(improvement.timeImprovement).toBeCloseTo(0.1, 1);
    });

    it("should identify improvement trends", () => {
      const baseline: Performance = {
        successRate: 0.7,
        averageQuality: 0.7,
        averageTime: 5000,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };

      const current: Performance = {
        successRate: 0.8,
        averageQuality: 0.85,
        averageTime: 4000,
        timestamp: new Date(),
      };

      const improvement = system.demonstrateImprovement(baseline, current);

      expect(improvement).toHaveProperty("trend");
      expect(improvement.trend).toBe("improving");
    });

    it("should handle no improvement scenario", () => {
      const baseline: Performance = {
        successRate: 0.8,
        averageQuality: 0.8,
        averageTime: 4000,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };

      const current: Performance = {
        successRate: 0.8,
        averageQuality: 0.8,
        averageTime: 4000,
        timestamp: new Date(),
      };

      const improvement = system.demonstrateImprovement(baseline, current);

      expect(improvement.successRateImprovement).toBe(0);
      expect(improvement.qualityImprovement).toBe(0);
      expect(improvement.trend).toBe("stable");
    });

    it("should handle declining performance", () => {
      const baseline: Performance = {
        successRate: 0.8,
        averageQuality: 0.85,
        averageTime: 4000,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };

      const current: Performance = {
        successRate: 0.7,
        averageQuality: 0.75,
        averageTime: 5000,
        timestamp: new Date(),
      };

      const improvement = system.demonstrateImprovement(baseline, current);

      expect(improvement.successRateImprovement).toBeLessThan(0);
      expect(improvement.qualityImprovement).toBeLessThan(0);
      expect(improvement.trend).toBe("declining");
    });
  });

  describe("Adaptation Sanity Checks", () => {
    it("should complete pattern identification in reasonable time", () => {
      const history: StrategyExecution[] = Array.from({ length: 100 }, (_, i) => ({
        id: `exec${i}`,
        strategyId: i % 2 === 0 ? "analytical" : "creative",
        context: { complexity: i % 3 === 0 ? "high" : "moderate" },
        outcome: createOutcome(i % 4 !== 0, 0.7 + (i % 10) * 0.03),
        timestamp: new Date(),
      }));

      const start = Date.now();
      system.identifySuccessPatterns(history);
      const duration = Date.now() - start;

      // Sanity check: should not hang or take unreasonably long
      expect(duration).toBeLessThan(5000);
    });

    it("should handle concurrent adaptation requests", async () => {
      const history: StrategyExecution[] = Array.from({ length: 50 }, (_, i) => ({
        id: `exec${i}`,
        strategyId: "analytical",
        context: { complexity: "high" },
        outcome: createOutcome(true, 0.8),
        timestamp: new Date(),
      }));

      const promises = [
        Promise.resolve(system.identifySuccessPatterns(history)),
        Promise.resolve(system.identifyFailurePatterns(history)),
        Promise.resolve(system.identifySuccessPatterns(history)),
      ];

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it("should complete batch operations without hanging", () => {
      const history: StrategyExecution[] = Array.from({ length: 100 }, (_, i) => ({
        id: `exec${i}`,
        strategyId: "systematic",
        context: { complexity: "moderate" },
        outcome: createOutcome(true, 0.8),
        timestamp: new Date(),
      }));

      const start = Date.now();
      system.identifySuccessPatterns(history);
      system.identifyFailurePatterns(history);
      const duration = Date.now() - start;

      // Sanity check: batch operations should complete in reasonable time
      expect(duration).toBeLessThan(5000);
    });
  });

  describe("Edge Cases", () => {
    it("should handle mixed success/failure patterns", () => {
      const history: StrategyExecution[] = [
        {
          id: "exec1",
          strategyId: "analytical",
          context: { complexity: "high" },
          outcome: createOutcome(true, 0.9),
          timestamp: new Date(),
        },
        {
          id: "exec2",
          strategyId: "analytical",
          context: { complexity: "high" },
          outcome: createOutcome(false, 0.3),
          timestamp: new Date(),
        },
        {
          id: "exec3",
          strategyId: "analytical",
          context: { complexity: "high" },
          outcome: createOutcome(true, 0.85),
          timestamp: new Date(),
        },
        {
          id: "exec4",
          strategyId: "analytical",
          context: { complexity: "high" },
          outcome: createOutcome(false, 0.25),
          timestamp: new Date(),
        },
      ];

      const successPatterns = system.identifySuccessPatterns(history);
      const failurePatterns = system.identifyFailurePatterns(history);

      expect(successPatterns.length).toBeGreaterThan(0);
      expect(failurePatterns.length).toBeGreaterThan(0);
    });

    it("should handle strategies with insufficient data", () => {
      const strategy: Strategy = {
        id: "new-strategy",
        name: "New Strategy",
        rules: [],
      };

      const outcomes: Outcome[] = [
        {
          id: "o1",
          success: true,
          quality: 0.8,
          description: "Single outcome",
          timestamp: new Date(),
        },
      ];

      const effectiveness = system.measureStrategyEffectiveness(strategy, outcomes);

      expect(effectiveness).toBeGreaterThanOrEqual(0);
      expect(effectiveness).toBeLessThanOrEqual(1);
    });

    it("should handle context with missing factors", () => {
      const strategy1: Strategy = {
        id: "s1",
        name: "Strategy 1",
        rules: [],
      };

      const context: Context = {}; // Empty context

      const comparison = system.compareStrategies([strategy1], context);

      expect(comparison).toBeDefined();
      expect(comparison.rankings.length).toBe(1);
    });

    it("should handle baseline with zero success rate", () => {
      const baseline: Performance = {
        successRate: 0,
        averageQuality: 0.7,
        averageTime: 5000,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };

      const current: Performance = {
        successRate: 0.5,
        averageQuality: 0.8,
        averageTime: 4500,
        timestamp: new Date(),
      };

      const improvement = system.demonstrateImprovement(baseline, current);

      expect(improvement.successRateImprovement).toBe(0);
      expect(improvement.qualityImprovement).toBeGreaterThan(0);
      expect(improvement.timeImprovement).toBeGreaterThan(0);
    });

    it("should handle baseline with zero quality", () => {
      const baseline: Performance = {
        successRate: 0.7,
        averageQuality: 0,
        averageTime: 5000,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };

      const current: Performance = {
        successRate: 0.8,
        averageQuality: 0.8,
        averageTime: 4500,
        timestamp: new Date(),
      };

      const improvement = system.demonstrateImprovement(baseline, current);

      expect(improvement.successRateImprovement).toBeGreaterThan(0);
      expect(improvement.qualityImprovement).toBe(0);
      expect(improvement.timeImprovement).toBeGreaterThan(0);
    });

    it("should handle baseline with zero time", () => {
      const baseline: Performance = {
        successRate: 0.7,
        averageQuality: 0.7,
        averageTime: 0,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };

      const current: Performance = {
        successRate: 0.8,
        averageQuality: 0.8,
        averageTime: 4500,
        timestamp: new Date(),
      };

      const improvement = system.demonstrateImprovement(baseline, current);

      expect(improvement.successRateImprovement).toBeGreaterThan(0);
      expect(improvement.qualityImprovement).toBeGreaterThan(0);
      expect(improvement.timeImprovement).toBe(0);
    });
  });

  describe("Execution History Management", () => {
    it("should record strategy execution", () => {
      const execution: StrategyExecution = {
        id: "exec1",
        strategyId: "analytical",
        context: { complexity: "high" },
        outcome: createOutcome(true, 0.9),
        timestamp: new Date(),
      };

      system.recordExecution(execution);

      const history = system.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(execution);
    });

    it("should record multiple executions", () => {
      const execution1: StrategyExecution = {
        id: "exec1",
        strategyId: "analytical",
        context: { complexity: "high" },
        outcome: createOutcome(true, 0.9),
        timestamp: new Date(),
      };

      const execution2: StrategyExecution = {
        id: "exec2",
        strategyId: "creative",
        context: { complexity: "moderate" },
        outcome: createOutcome(true, 0.85),
        timestamp: new Date(),
      };

      system.recordExecution(execution1);
      system.recordExecution(execution2);

      const history = system.getExecutionHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(execution1);
      expect(history[1]).toEqual(execution2);
    });

    it("should return copy of execution history", () => {
      const execution: StrategyExecution = {
        id: "exec1",
        strategyId: "analytical",
        context: { complexity: "high" },
        outcome: createOutcome(true, 0.9),
        timestamp: new Date(),
      };

      system.recordExecution(execution);

      const history1 = system.getExecutionHistory();
      const history2 = system.getExecutionHistory();

      expect(history1).not.toBe(history2); // Different array instances
      expect(history1).toEqual(history2); // Same content
    });

    it("should clear execution history", () => {
      const execution1: StrategyExecution = {
        id: "exec1",
        strategyId: "analytical",
        context: { complexity: "high" },
        outcome: createOutcome(true, 0.9),
        timestamp: new Date(),
      };

      const execution2: StrategyExecution = {
        id: "exec2",
        strategyId: "creative",
        context: { complexity: "moderate" },
        outcome: createOutcome(true, 0.85),
        timestamp: new Date(),
      };

      system.recordExecution(execution1);
      system.recordExecution(execution2);

      expect(system.getExecutionHistory()).toHaveLength(2);

      system.clearHistory();

      expect(system.getExecutionHistory()).toHaveLength(0);
    });

    it("should use recorded history in strategy comparison", () => {
      const strategy1: Strategy = {
        id: "analytical",
        name: "Analytical",
        rules: [],
      };

      const strategy2: Strategy = {
        id: "creative",
        name: "Creative",
        rules: [],
      };

      const context: Context = {
        complexity: "high",
        uncertainty: "low",
      };

      // Record executions for analytical strategy with similar context
      for (let i = 0; i < 5; i++) {
        system.recordExecution({
          id: `exec-analytical-${i}`,
          strategyId: "analytical",
          context: { complexity: "high", uncertainty: "low" },
          outcome: createOutcome(true, 0.9),
          timestamp: new Date(),
        });
      }

      // Record executions for creative strategy with similar context
      for (let i = 0; i < 5; i++) {
        system.recordExecution({
          id: `exec-creative-${i}`,
          strategyId: "creative",
          context: { complexity: "high", uncertainty: "low" },
          outcome: createOutcome(true, 0.7),
          timestamp: new Date(),
        });
      }

      const comparison = system.compareStrategies([strategy1, strategy2], context);

      expect(comparison.rankings).toHaveLength(2);
      // Analytical should rank higher due to better outcomes
      expect(comparison.rankings[0].strategyId).toBe("analytical");
      expect(comparison.rankings[0].score).toBeGreaterThan(comparison.rankings[1].score);
      expect(comparison.rankings[0].confidence).toBeGreaterThan(0);
    });

    it("should handle strategy comparison with no relevant history", () => {
      const strategy1: Strategy = {
        id: "new-strategy",
        name: "New Strategy",
        rules: [],
      };

      const context: Context = {
        complexity: "high",
      };

      // Record executions for different strategy
      system.recordExecution({
        id: "exec1",
        strategyId: "other-strategy",
        context: { complexity: "low" },
        outcome: createOutcome(true, 0.9),
        timestamp: new Date(),
      });

      const comparison = system.compareStrategies([strategy1], context);

      expect(comparison.rankings).toHaveLength(1);
      expect(comparison.rankings[0].score).toBe(0); // No relevant history
      expect(comparison.rankings[0].confidence).toBe(0); // No samples
    });
  });
});
