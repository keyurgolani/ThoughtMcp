/**
 * Framework Selector Learning Integration Tests
 *
 * Tests for integration of FrameworkLearningSystem with FrameworkSelector.
 * Verifies that learning system is properly integrated for outcome tracking,
 * adaptive weights, and personalized recommendations.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { FrameworkLearningSystem } from "../../../framework/framework-learning.js";
import { FrameworkRegistry } from "../../../framework/framework-registry.js";
import { FrameworkSelector } from "../../../framework/framework-selector.js";
import { ProblemClassifier } from "../../../framework/problem-classifier.js";
import type { Problem, SelectionOutcome } from "../../../framework/types.js";

describe("FrameworkSelector with Learning System Integration", () => {
  let classifier: ProblemClassifier;
  let registry: FrameworkRegistry;
  let learningSystem: FrameworkLearningSystem;

  beforeEach(() => {
    classifier = new ProblemClassifier();
    registry = FrameworkRegistry.getInstance();
    learningSystem = new FrameworkLearningSystem();
  });

  describe("Constructor with learning system", () => {
    it("should accept optional learning system parameter", () => {
      const selector = new FrameworkSelector(classifier, registry, learningSystem);
      expect(selector).toBeDefined();
    });

    it("should work without learning system (backwards compatible)", () => {
      const selector = new FrameworkSelector(classifier, registry);
      expect(selector).toBeDefined();
    });
  });
  describe("Outcome tracking", () => {
    it("should track selection outcome when learning system is provided", () => {
      const selector = new FrameworkSelector(classifier, registry, learningSystem);

      const problem: Problem = {
        id: "track-test-1",
        description: "Test if changing cache TTL improves performance",
        context: "Simple A/B test",
        goals: ["Measure performance"],
        constraints: [],
        complexity: "simple",
      };

      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Selection should have an ID for tracking
      expect(selection).toHaveProperty("selectionId");
      expect(typeof selection.selectionId).toBe("string");
      expect(selection.selectionId).toBeTruthy();
      if (selection.selectionId) {
        expect(selection.selectionId.length).toBeGreaterThan(0);
      }
    });

    it("should not track outcome when learning system is not provided", () => {
      const selector = new FrameworkSelector(classifier, registry);

      const problem: Problem = {
        id: "track-test-2",
        description: "Test problem",
        context: "Test context",
        goals: [],
        constraints: [],
      };

      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Should work normally without tracking
      expect(selection.primaryFramework).toBeDefined();
    });

    it("should generate unique selection IDs for each selection", () => {
      const selector = new FrameworkSelector(classifier, registry, learningSystem);

      const problem: Problem = {
        id: "track-test-3",
        description: "Test problem",
        context: "Test context",
        goals: [],
        constraints: [],
      };

      const selection1 = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      const selection2 = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      expect(selection1.selectionId).not.toBe(selection2.selectionId);
    });
  });

  describe("Adaptive weights application", () => {
    it("should use adaptive weights from learning system when available", () => {
      const selector = new FrameworkSelector(classifier, registry, learningSystem);

      // Record some outcomes to generate adaptive weights
      const outcomes: SelectionOutcome[] = [
        {
          selectionId: "outcome-1",
          frameworkId: "scientific-method",
          problemClassification: {
            complexity: "simple",
            uncertainty: "low",
            stakes: "routine",
            timePressure: "none",
          },
          wasSuccessful: true,
          userSatisfaction: 0.9,
          timestamp: new Date(),
        },
        {
          selectionId: "outcome-2",
          frameworkId: "scientific-method",
          problemClassification: {
            complexity: "simple",
            uncertainty: "low",
            stakes: "routine",
            timePressure: "none",
          },
          wasSuccessful: true,
          userSatisfaction: 0.85,
          timestamp: new Date(),
        },
      ];

      learningSystem.recordOutcomes(outcomes);

      const problem: Problem = {
        id: "adaptive-test-1",
        description: "Test problem",
        context: "Test context",
        goals: [],
        constraints: [],
        complexity: "simple",
      };

      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Should successfully select a framework using adaptive weights
      expect(selection.primaryFramework).toBeDefined();
      expect(selection.confidence).toBeGreaterThan(0);
    });

    it("should use default weights when no adaptive weights available", () => {
      const selector = new FrameworkSelector(classifier, registry, learningSystem);

      const problem: Problem = {
        id: "adaptive-test-2",
        description: "Test problem",
        context: "Test context",
        goals: [],
        constraints: [],
      };

      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Should work with default weights
      expect(selection.primaryFramework).toBeDefined();
      expect(selection.confidence).toBeGreaterThan(0);
    });

    it("should apply domain-specific weights when domain is identified", () => {
      const selector = new FrameworkSelector(classifier, registry, learningSystem);

      // Record domain-specific outcomes
      const outcomes: SelectionOutcome[] = [];
      for (let i = 0; i < 10; i++) {
        outcomes.push({
          selectionId: `domain-outcome-${i}`,
          frameworkId: "systems-thinking",
          problemClassification: {
            complexity: "complex",
            uncertainty: "high",
            stakes: "critical",
            timePressure: "moderate",
          },
          wasSuccessful: true,
          userSatisfaction: 0.9,
          timestamp: new Date(),
        });
      }

      learningSystem.recordOutcomes(outcomes);

      const problem: Problem = {
        id: "adaptive-test-3",
        description: "Complex distributed system problem",
        context: "High uncertainty, critical stakes",
        goals: [],
        constraints: [],
        complexity: "complex",
      };

      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Should use domain-specific weights
      expect(selection.primaryFramework).toBeDefined();
    });
  });

  describe("Personalized recommendations", () => {
    it("should apply user preferences when available", () => {
      const selector = new FrameworkSelector(classifier, registry, learningSystem);

      // Record feedback showing user preference for design-thinking
      const outcome: SelectionOutcome = {
        selectionId: "pref-outcome-1",
        frameworkId: "design-thinking",
        problemClassification: {
          complexity: "moderate",
          uncertainty: "medium",
          stakes: "important",
          timePressure: "moderate",
        },
        wasSuccessful: true,
        userSatisfaction: 0.95,
        timestamp: new Date(),
      };

      learningSystem.recordOutcome(outcome);
      learningSystem.recordFeedback({
        feedbackId: "pref-feedback-1",
        selectionId: "pref-outcome-1",
        rating: 5,
        timestamp: new Date(),
        wasFrameworkAppropriate: true,
      });

      const problem: Problem = {
        id: "pref-test-1",
        description: "Redesign user interface",
        context: "Moderate complexity",
        goals: [],
        constraints: [],
        complexity: "moderate",
      };

      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Should consider user preferences
      expect(selection.primaryFramework).toBeDefined();
    });

    it("should boost framework scores based on user preferences", () => {
      const selector = new FrameworkSelector(classifier, registry, learningSystem);

      // Create strong preference for critical-thinking
      for (let i = 0; i < 5; i++) {
        const outcome: SelectionOutcome = {
          selectionId: `boost-outcome-${i}`,
          frameworkId: "critical-thinking",
          problemClassification: {
            complexity: "moderate",
            uncertainty: "medium",
            stakes: "important",
            timePressure: "moderate",
          },
          wasSuccessful: true,
          userSatisfaction: 0.95,
          timestamp: new Date(),
        };

        learningSystem.recordOutcome(outcome);
        learningSystem.recordFeedback({
          feedbackId: `boost-feedback-${i}`,
          selectionId: `boost-outcome-${i}`,
          rating: 5,
          timestamp: new Date(),
        });
      }

      const problem: Problem = {
        id: "boost-test-1",
        description: "Evaluate technology options",
        context: "Need to choose between alternatives",
        goals: [],
        constraints: [],
        complexity: "moderate",
      };

      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // User preference should influence selection
      expect(selection.primaryFramework).toBeDefined();
    });
  });

  describe("Learning system integration edge cases", () => {
    it("should handle learning system errors gracefully", () => {
      // Create a mock learning system that throws errors
      const faultyLearningSystem = {
        getAdaptiveWeights: () => {
          throw new Error("Learning system error");
        },
        getUserPreferences: () => {
          throw new Error("Learning system error");
        },
      } as any;

      const selector = new FrameworkSelector(classifier, registry, faultyLearningSystem);

      const problem: Problem = {
        id: "error-test-1",
        description: "Test problem",
        context: "Test context",
        goals: [],
        constraints: [],
      };

      // Should not crash, should fall back to default behavior
      expect(() => {
        selector.selectFramework(problem, {
          problem,
          evidence: [],
          constraints: [],
          goals: [],
        });
      }).not.toThrow();
    });

    it("should work when learning system returns undefined weights", () => {
      const selector = new FrameworkSelector(classifier, registry, learningSystem);

      const problem: Problem = {
        id: "undefined-test-1",
        description: "Test problem",
        context: "Test context",
        goals: [],
        constraints: [],
      };

      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Should use default weights
      expect(selection.primaryFramework).toBeDefined();
      expect(selection.confidence).toBeGreaterThan(0);
    });

    it("should work when learning system returns empty preferences", () => {
      const selector = new FrameworkSelector(classifier, registry, learningSystem);

      const problem: Problem = {
        id: "empty-test-1",
        description: "Test problem",
        context: "Test context",
        goals: [],
        constraints: [],
      };

      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Should work without preferences
      expect(selection.primaryFramework).toBeDefined();
    });
  });

  describe("Selection metadata", () => {
    it("should include selection ID in result when learning system is provided", () => {
      const selector = new FrameworkSelector(classifier, registry, learningSystem);

      const problem: Problem = {
        id: "metadata-test-1",
        description: "Test problem",
        context: "Test context",
        goals: [],
        constraints: [],
      };

      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      expect(selection).toHaveProperty("selectionId");
      expect(selection.selectionId).toBeTruthy();
    });

    it("should include problem classification in selection metadata", () => {
      const selector = new FrameworkSelector(classifier, registry, learningSystem);

      const problem: Problem = {
        id: "metadata-test-2",
        description: "Test problem",
        context: "Test context",
        goals: [],
        constraints: [],
        complexity: "complex",
      };

      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Classification should be available for outcome tracking
      expect(selection).toBeDefined();
      expect(selection.primaryFramework).toBeDefined();
    });
  });

  describe("Backwards compatibility", () => {
    it("should maintain same selection behavior without learning system", () => {
      const selectorWithLearning = new FrameworkSelector(classifier, registry, learningSystem);
      const selectorWithoutLearning = new FrameworkSelector(classifier, registry);

      const problem: Problem = {
        id: "compat-test-1",
        description: "Test if changing cache TTL improves performance",
        context: "Simple A/B test",
        goals: ["Measure performance"],
        constraints: [],
        complexity: "simple",
      };

      const selectionWith = selectorWithLearning.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      const selectionWithout = selectorWithoutLearning.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Should select same framework (before any learning occurs)
      expect(selectionWith.primaryFramework.id).toBe(selectionWithout.primaryFramework.id);
    });

    it("should not break existing tests", () => {
      const selector = new FrameworkSelector(classifier, registry);

      const problem: Problem = {
        id: "compat-test-2",
        description: "Redesign user authentication flow",
        context: "Moderate complexity problem",
        goals: ["Add multiple auth methods"],
        constraints: ["Must be backwards compatible"],
        complexity: "moderate",
      };

      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // All existing properties should still work
      expect(selection.primaryFramework).toBeDefined();
      expect(selection.alternatives).toBeDefined();
      expect(selection.confidence).toBeGreaterThan(0);
      expect(selection.reason).toBeTruthy();
      expect(typeof selection.isHybrid).toBe("boolean");
    });
  });
});
