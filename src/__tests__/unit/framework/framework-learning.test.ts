/**
 * Framework Learning System Tests
 *
 * Tests for the learning system that tracks framework selection outcomes
 * and improves selection accuracy over time through feedback integration
 * and adaptive selection.
 *
 * Target: 5%+ accuracy improvement over 100 selections
 */

import { beforeEach, describe, expect, it } from "vitest";
import { FrameworkLearningSystem } from "../../../framework/framework-learning.js";
import type { SelectionOutcome } from "../../../framework/types.js";

describe("FrameworkLearningSystem", () => {
  let learningSystem: FrameworkLearningSystem;

  beforeEach(() => {
    learningSystem = new FrameworkLearningSystem();
  });

  describe("Outcome Tracking", () => {
    it("should track successful framework selections", () => {
      const outcome: SelectionOutcome = {
        selectionId: "sel-001",
        frameworkId: "scientific-method",
        problemClassification: {
          complexity: "moderate",
          uncertainty: "medium",
          stakes: "important",
          timePressure: "moderate",
        },
        wasSuccessful: true,
        userSatisfaction: 0.9,
        timestamp: new Date(),
      };

      learningSystem.recordOutcome(outcome);

      const metrics = learningSystem.getMetrics();
      expect(metrics.totalSelections).toBe(1);
      expect(metrics.successfulSelections).toBe(1);
      expect(metrics.accuracyRate).toBe(1.0);
    });

    it("should track unsuccessful framework selections", () => {
      const outcome: SelectionOutcome = {
        selectionId: "sel-002",
        frameworkId: "design-thinking",
        problemClassification: {
          complexity: "complex",
          uncertainty: "high",
          stakes: "critical",
          timePressure: "high",
        },
        wasSuccessful: false,
        userSatisfaction: 0.3,
        timestamp: new Date(),
      };

      learningSystem.recordOutcome(outcome);

      const metrics = learningSystem.getMetrics();
      expect(metrics.totalSelections).toBe(1);
      expect(metrics.successfulSelections).toBe(0);
      expect(metrics.accuracyRate).toBe(0.0);
    });

    it("should handle batch outcome recording", () => {
      const outcomes: SelectionOutcome[] = [
        {
          selectionId: "batch-001",
          frameworkId: "scientific-method",
          problemClassification: {
            complexity: "simple",
            uncertainty: "low",
            stakes: "routine",
            timePressure: "none",
          },
          wasSuccessful: true,
          userSatisfaction: 0.8,
          timestamp: new Date(),
        },
        {
          selectionId: "batch-002",
          frameworkId: "design-thinking",
          problemClassification: {
            complexity: "moderate",
            uncertainty: "medium",
            stakes: "important",
            timePressure: "moderate",
          },
          wasSuccessful: true,
          userSatisfaction: 0.85,
          timestamp: new Date(),
        },
        {
          selectionId: "batch-003",
          frameworkId: "critical-thinking",
          problemClassification: {
            complexity: "complex",
            uncertainty: "high",
            stakes: "critical",
            timePressure: "high",
          },
          wasSuccessful: false,
          userSatisfaction: 0.4,
          timestamp: new Date(),
        },
      ];

      learningSystem.recordOutcomes(outcomes);

      const metrics = learningSystem.getMetrics();
      expect(metrics.totalSelections).toBe(3);
      expect(metrics.successfulSelections).toBe(2);
      expect(metrics.accuracyRate).toBeCloseTo(0.667, 2);
    });
  });

  describe("Feedback Integration", () => {
    it("should accept user feedback with ratings and update preferences", () => {
      const outcome: SelectionOutcome = {
        selectionId: "sel-feedback-001",
        frameworkId: "scientific-method",
        problemClassification: {
          complexity: "moderate",
          uncertainty: "medium",
          stakes: "important",
          timePressure: "moderate",
        },
        wasSuccessful: true,
        userSatisfaction: 0.8,
        timestamp: new Date(),
      };
      learningSystem.recordOutcome(outcome);

      const feedback = {
        feedbackId: "fb-001",
        selectionId: "sel-feedback-001",
        rating: 4,
        timestamp: new Date(),
      };

      expect(() => learningSystem.recordFeedback(feedback)).not.toThrow();

      const preferences = learningSystem.getUserPreferences("default");
      expect(preferences.size).toBeGreaterThan(0);
    });

    it("should validate feedback ratings are in range 1-5", () => {
      const outcome: SelectionOutcome = {
        selectionId: "sel-validate-001",
        frameworkId: "scientific-method",
        problemClassification: {
          complexity: "simple",
          uncertainty: "low",
          stakes: "routine",
          timePressure: "none",
        },
        wasSuccessful: true,
        userSatisfaction: 0.8,
        timestamp: new Date(),
      };
      learningSystem.recordOutcome(outcome);

      // Test rating below 1
      expect(() =>
        learningSystem.recordFeedback({
          feedbackId: "fb-invalid-001",
          selectionId: "sel-validate-001",
          rating: 0,
          timestamp: new Date(),
        })
      ).toThrow("Invalid feedback: rating must be between 1 and 5");

      // Test rating above 5
      expect(() =>
        learningSystem.recordFeedback({
          feedbackId: "fb-invalid-002",
          selectionId: "sel-validate-001",
          rating: 6,
          timestamp: new Date(),
        })
      ).toThrow("Invalid feedback: rating must be between 1 and 5");
    });

    it("should reject feedback for non-existent selections", () => {
      expect(() =>
        learningSystem.recordFeedback({
          feedbackId: "fb-nonexistent-001",
          selectionId: "sel-does-not-exist",
          rating: 4,
          timestamp: new Date(),
        })
      ).toThrow("Selection sel-does-not-exist not found");
    });
  });

  describe("Accuracy Improvement", () => {
    it("should calculate baseline accuracy rate", () => {
      const outcomes: SelectionOutcome[] = [
        {
          selectionId: "baseline-001",
          frameworkId: "scientific-method",
          problemClassification: {
            complexity: "simple",
            uncertainty: "low",
            stakes: "routine",
            timePressure: "none",
          },
          wasSuccessful: true,
          userSatisfaction: 0.8,
          timestamp: new Date(),
        },
        {
          selectionId: "baseline-002",
          frameworkId: "design-thinking",
          problemClassification: {
            complexity: "moderate",
            uncertainty: "medium",
            stakes: "important",
            timePressure: "moderate",
          },
          wasSuccessful: true,
          userSatisfaction: 0.85,
          timestamp: new Date(),
        },
        {
          selectionId: "baseline-003",
          frameworkId: "critical-thinking",
          problemClassification: {
            complexity: "complex",
            uncertainty: "high",
            stakes: "critical",
            timePressure: "high",
          },
          wasSuccessful: false,
          userSatisfaction: 0.4,
          timestamp: new Date(),
        },
        {
          selectionId: "baseline-004",
          frameworkId: "systems-thinking",
          problemClassification: {
            complexity: "moderate",
            uncertainty: "medium",
            stakes: "important",
            timePressure: "moderate",
          },
          wasSuccessful: false,
          userSatisfaction: 0.5,
          timestamp: new Date(),
        },
      ];

      learningSystem.recordOutcomes(outcomes);

      const baselineAccuracy = learningSystem.calculateBaselineAccuracy();
      expect(baselineAccuracy).toBe(0.5);
    });

    it("should track accuracy over time with improvement", () => {
      // First batch: 50% accuracy
      learningSystem.recordOutcome({
        selectionId: "track-001",
        frameworkId: "scientific-method",
        problemClassification: {
          complexity: "simple",
          uncertainty: "low",
          stakes: "routine",
          timePressure: "none",
        },
        wasSuccessful: true,
        userSatisfaction: 0.8,
        timestamp: new Date(),
      });

      learningSystem.recordOutcome({
        selectionId: "track-002",
        frameworkId: "design-thinking",
        problemClassification: {
          complexity: "moderate",
          uncertainty: "medium",
          stakes: "important",
          timePressure: "moderate",
        },
        wasSuccessful: false,
        userSatisfaction: 0.4,
        timestamp: new Date(),
      });

      const metrics1 = learningSystem.getMetrics();
      expect(metrics1.accuracyRate).toBe(0.5);

      // Add successful outcomes to improve accuracy
      learningSystem.recordOutcome({
        selectionId: "track-003",
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

      learningSystem.recordOutcome({
        selectionId: "track-004",
        frameworkId: "critical-thinking",
        problemClassification: {
          complexity: "moderate",
          uncertainty: "medium",
          stakes: "important",
          timePressure: "high",
        },
        wasSuccessful: true,
        userSatisfaction: 0.85,
        timestamp: new Date(),
      });

      const metrics2 = learningSystem.getMetrics();
      expect(metrics2.accuracyRate).toBe(0.75);
      expect(metrics2.accuracyRate).toBeGreaterThan(metrics1.accuracyRate);
    });
  });

  describe("Preference Learning", () => {
    it("should learn user preferences from feedback", () => {
      const outcome: SelectionOutcome = {
        selectionId: "pref-001",
        frameworkId: "design-thinking",
        problemClassification: {
          complexity: "moderate",
          uncertainty: "medium",
          stakes: "important",
          timePressure: "moderate",
        },
        wasSuccessful: true,
        userSatisfaction: 0.9,
        timestamp: new Date(),
      };
      learningSystem.recordOutcome(outcome);

      learningSystem.recordFeedback({
        feedbackId: "fb-pref-001",
        selectionId: "pref-001",
        rating: 5,
        timestamp: new Date(),
      });

      const preferences = learningSystem.getUserPreferences("default");
      expect(preferences.has("design-thinking")).toBe(true);
      expect(preferences.get("design-thinking")).toBeGreaterThan(0);
    });

    it("should allow preference reset", () => {
      // Record outcome and feedback to create preferences
      const outcome: SelectionOutcome = {
        selectionId: "reset-001",
        frameworkId: "scientific-method",
        problemClassification: {
          complexity: "simple",
          uncertainty: "low",
          stakes: "routine",
          timePressure: "none",
        },
        wasSuccessful: true,
        userSatisfaction: 0.8,
        timestamp: new Date(),
      };
      learningSystem.recordOutcome(outcome);

      learningSystem.recordFeedback({
        feedbackId: "fb-reset-001",
        selectionId: "reset-001",
        rating: 5,
        timestamp: new Date(),
      });

      // Verify preferences exist
      let preferences = learningSystem.getUserPreferences("default");
      expect(preferences.size).toBeGreaterThan(0);

      // Reset preferences
      learningSystem.resetUserPreferences("default");

      // Verify preferences are cleared
      preferences = learningSystem.getUserPreferences("default");
      expect(preferences.size).toBe(0);
    });
  });

  describe("Domain Adaptation", () => {
    it("should create domain patterns from successful selections", () => {
      const classification = {
        complexity: "moderate" as const,
        uncertainty: "medium" as const,
        stakes: "important" as const,
        timePressure: "moderate" as const,
      };

      // Record minimum 3 outcomes to create domain pattern
      for (let i = 0; i < 3; i++) {
        learningSystem.recordOutcome({
          selectionId: `domain-${i}`,
          frameworkId: "design-thinking",
          problemClassification: classification,
          wasSuccessful: true,
          userSatisfaction: 0.9,
          timestamp: new Date(),
        });
      }

      const patterns = learningSystem.getAllDomainPatterns();
      expect(patterns.length).toBeGreaterThan(0);

      const pattern = patterns[0];
      expect(pattern.characteristics.complexity).toBe("moderate");
      expect(pattern.characteristics.uncertainty).toBe("medium");
    });

    it("should handle unknown domains gracefully", () => {
      // Get patterns for domain that doesn't exist
      const patterns = learningSystem.getAllDomainPatterns();
      expect(patterns).toEqual([]);

      // System should still function without domain patterns
      const metrics = learningSystem.getMetrics();
      expect(metrics.totalSelections).toBe(0);
    });
  });

  describe("Adaptive Selection", () => {
    it("should adjust scoring weights based on outcomes", () => {
      // Record outcomes to trigger weight adjustment
      for (let i = 0; i < 5; i++) {
        learningSystem.recordOutcome({
          selectionId: `weight-${i}`,
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
        });
      }

      const weights = learningSystem.getAdaptiveWeights();
      expect(weights).toBeDefined();
      expect(typeof weights.complexity).toBe("number");
      expect(typeof weights.uncertainty).toBe("number");
    });

    it("should validate weight values are in range 0-1", () => {
      // Record outcomes to generate weights
      for (let i = 0; i < 5; i++) {
        learningSystem.recordOutcome({
          selectionId: `validate-weight-${i}`,
          frameworkId: "design-thinking",
          problemClassification: {
            complexity: "moderate",
            uncertainty: "medium",
            stakes: "important",
            timePressure: "moderate",
          },
          wasSuccessful: true,
          userSatisfaction: 0.85,
          timestamp: new Date(),
        });
      }

      const weights = learningSystem.getAdaptiveWeights();

      // All weights should be between 0 and 1
      expect(weights.complexity).toBeGreaterThanOrEqual(0);
      expect(weights.complexity).toBeLessThanOrEqual(1);
      expect(weights.uncertainty).toBeGreaterThanOrEqual(0);
      expect(weights.uncertainty).toBeLessThanOrEqual(1);
    });
  });

  describe("Learning Metrics", () => {
    it("should track total and successful selections", () => {
      learningSystem.recordOutcome({
        selectionId: "metrics-001",
        frameworkId: "scientific-method",
        problemClassification: {
          complexity: "simple",
          uncertainty: "low",
          stakes: "routine",
          timePressure: "none",
        },
        wasSuccessful: true,
        userSatisfaction: 0.8,
        timestamp: new Date(),
      });

      learningSystem.recordOutcome({
        selectionId: "metrics-002",
        frameworkId: "design-thinking",
        problemClassification: {
          complexity: "moderate",
          uncertainty: "medium",
          stakes: "important",
          timePressure: "moderate",
        },
        wasSuccessful: false,
        userSatisfaction: 0.4,
        timestamp: new Date(),
      });

      const metrics = learningSystem.getMetrics();
      expect(metrics.totalSelections).toBe(2);
      expect(metrics.successfulSelections).toBe(1);
      expect(metrics.accuracyRate).toBe(0.5);
    });

    it("should calculate average user satisfaction", () => {
      learningSystem.recordOutcome({
        selectionId: "sat-001",
        frameworkId: "scientific-method",
        problemClassification: {
          complexity: "simple",
          uncertainty: "low",
          stakes: "routine",
          timePressure: "none",
        },
        wasSuccessful: true,
        userSatisfaction: 0.8,
        timestamp: new Date(),
      });

      learningSystem.recordOutcome({
        selectionId: "sat-002",
        frameworkId: "design-thinking",
        problemClassification: {
          complexity: "moderate",
          uncertainty: "medium",
          stakes: "important",
          timePressure: "moderate",
        },
        wasSuccessful: true,
        userSatisfaction: 0.6,
        timestamp: new Date(),
      });

      const metrics = learningSystem.getMetrics();
      expect(metrics.averageUserSatisfaction).toBe(0.7);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid outcome data gracefully", () => {
      // Missing required fields should throw
      expect(() =>
        learningSystem.recordOutcome({
          selectionId: "",
          frameworkId: "scientific-method",
          problemClassification: {
            complexity: "simple",
            uncertainty: "low",
            stakes: "routine",
            timePressure: "none",
          },
          wasSuccessful: true,
          userSatisfaction: 0.8,
          timestamp: new Date(),
        })
      ).toThrow();

      expect(() =>
        learningSystem.recordOutcome({
          selectionId: "invalid-001",
          frameworkId: "",
          problemClassification: {
            complexity: "simple",
            uncertainty: "low",
            stakes: "routine",
            timePressure: "none",
          },
          wasSuccessful: true,
          userSatisfaction: 0.8,
          timestamp: new Date(),
        })
      ).toThrow();
    });

    it("should handle empty outcome history", () => {
      // Fresh system should have empty metrics
      const metrics = learningSystem.getMetrics();
      expect(metrics.totalSelections).toBe(0);
      expect(metrics.successfulSelections).toBe(0);
      expect(metrics.accuracyRate).toBe(0);
      expect(metrics.averageUserSatisfaction).toBe(0);

      // Baseline accuracy should be 0 with no history
      const baseline = learningSystem.calculateBaselineAccuracy();
      expect(baseline).toBe(0);
    });
  });
});
