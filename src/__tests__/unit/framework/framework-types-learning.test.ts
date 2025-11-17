/**
 * Tests for learning-related types in framework types
 *
 * Validates that learning system types are properly defined and can be used
 * to track framework selection outcomes, user feedback, and learning metrics.
 */

import { describe, expect, it } from "vitest";
import type {
  DomainPattern,
  LearningMetrics,
  ScoringWeights,
  SelectionOutcome,
  UserFeedback,
} from "../../../framework/types.js";

describe("Learning-related types", () => {
  describe("SelectionOutcome", () => {
    it("should allow creating a selection outcome with all required fields", () => {
      const outcome: SelectionOutcome = {
        selectionId: "sel-123",
        frameworkId: "scientific-method",
        problemClassification: {
          complexity: "complex",
          uncertainty: "high",
          stakes: "critical",
          timePressure: "moderate",
        },
        wasSuccessful: true,
        userSatisfaction: 0.9,
        timestamp: new Date(),
      };

      expect(outcome.selectionId).toBe("sel-123");
      expect(outcome.frameworkId).toBe("scientific-method");
      expect(outcome.wasSuccessful).toBe(true);
      expect(outcome.userSatisfaction).toBe(0.9);
    });

    it("should allow optional fields", () => {
      const outcome: SelectionOutcome = {
        selectionId: "sel-124",
        frameworkId: "design-thinking",
        problemClassification: {
          complexity: "moderate",
          uncertainty: "medium",
          stakes: "important",
          timePressure: "none",
        },
        wasSuccessful: false,
        userSatisfaction: 0.4,
        timestamp: new Date(),
        executionTime: 15000,
        adaptationCount: 2,
        obstacleCount: 3,
        notes: "User switched to different framework mid-execution",
      };

      expect(outcome.executionTime).toBe(15000);
      expect(outcome.adaptationCount).toBe(2);
      expect(outcome.obstacleCount).toBe(3);
      expect(outcome.notes).toBeDefined();
    });
  });

  describe("UserFeedback", () => {
    it("should allow creating user feedback with required fields", () => {
      const feedback: UserFeedback = {
        feedbackId: "fb-456",
        selectionId: "sel-123",
        rating: 5,
        timestamp: new Date(),
      };

      expect(feedback.feedbackId).toBe("fb-456");
      expect(feedback.selectionId).toBe("sel-123");
      expect(feedback.rating).toBe(5);
    });

    it("should allow optional feedback fields", () => {
      const feedback: UserFeedback = {
        feedbackId: "fb-457",
        selectionId: "sel-124",
        rating: 2,
        timestamp: new Date(),
        comment: "Framework was too slow for urgent problem",
        suggestedFramework: "first-principles",
        wasFrameworkAppropriate: false,
      };

      expect(feedback.comment).toBeDefined();
      expect(feedback.suggestedFramework).toBe("first-principles");
      expect(feedback.wasFrameworkAppropriate).toBe(false);
    });
  });

  describe("LearningMetrics", () => {
    it("should track learning metrics over time", () => {
      const metrics: LearningMetrics = {
        totalSelections: 100,
        successfulSelections: 85,
        averageUserSatisfaction: 0.82,
        accuracyRate: 0.85,
        improvementRate: 0.05,
        lastUpdated: new Date(),
      };

      expect(metrics.totalSelections).toBe(100);
      expect(metrics.successfulSelections).toBe(85);
      expect(metrics.accuracyRate).toBe(0.85);
      expect(metrics.improvementRate).toBe(0.05);
    });

    it("should allow domain-specific metrics", () => {
      const metrics: LearningMetrics = {
        totalSelections: 50,
        successfulSelections: 42,
        averageUserSatisfaction: 0.88,
        accuracyRate: 0.84,
        improvementRate: 0.08,
        lastUpdated: new Date(),
        domainMetrics: {
          "technical-problems": { accuracy: 0.92, count: 30 },
          "creative-problems": { accuracy: 0.75, count: 20 },
        },
      };

      expect(metrics.domainMetrics).toBeDefined();
      expect(metrics.domainMetrics?.["technical-problems"].accuracy).toBe(0.92);
    });
  });

  describe("DomainPattern", () => {
    it("should capture patterns for specific problem domains", () => {
      const pattern: DomainPattern = {
        domain: "technical-debugging",
        characteristics: {
          complexity: "complex",
          uncertainty: "high",
          stakes: "critical",
          timePressure: "high",
        },
        preferredFrameworks: ["root-cause-analysis", "scientific-method"],
        successRate: 0.91,
        sampleSize: 45,
      };

      expect(pattern.domain).toBe("technical-debugging");
      expect(pattern.preferredFrameworks).toHaveLength(2);
      expect(pattern.successRate).toBe(0.91);
      expect(pattern.sampleSize).toBe(45);
    });

    it("should allow optional pattern metadata", () => {
      const pattern: DomainPattern = {
        domain: "creative-design",
        characteristics: {
          complexity: "moderate",
          uncertainty: "medium",
          stakes: "important",
          timePressure: "none",
        },
        preferredFrameworks: ["design-thinking", "creative-problem-solving"],
        successRate: 0.87,
        sampleSize: 32,
        lastUpdated: new Date(),
        notes: "Users prefer design thinking for UI/UX problems",
      };

      expect(pattern.lastUpdated).toBeDefined();
      expect(pattern.notes).toBeDefined();
    });
  });

  describe("ScoringWeights", () => {
    it("should define weights for framework scoring dimensions", () => {
      const weights: ScoringWeights = {
        complexity: 0.3,
        uncertainty: 0.25,
        stakes: 0.25,
        timePressure: 0.2,
      };

      expect(weights.complexity).toBe(0.3);
      expect(weights.uncertainty).toBe(0.25);
      expect(weights.stakes).toBe(0.25);
      expect(weights.timePressure).toBe(0.2);
    });

    it("should allow weights that sum to 1.0", () => {
      const weights: ScoringWeights = {
        complexity: 0.3,
        uncertainty: 0.25,
        stakes: 0.25,
        timePressure: 0.2,
      };

      const sum = weights.complexity + weights.uncertainty + weights.stakes + weights.timePressure;
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it("should allow optional domain-specific weights", () => {
      const weights: ScoringWeights = {
        complexity: 0.3,
        uncertainty: 0.25,
        stakes: 0.25,
        timePressure: 0.2,
        domain: "technical-problems",
        lastUpdated: new Date(),
      };

      expect(weights.domain).toBe("technical-problems");
      expect(weights.lastUpdated).toBeDefined();
    });
  });

  describe("Type integration", () => {
    it("should allow linking outcomes with feedback", () => {
      const outcome: SelectionOutcome = {
        selectionId: "sel-789",
        frameworkId: "systems-thinking",
        problemClassification: {
          complexity: "complex",
          uncertainty: "high",
          stakes: "critical",
          timePressure: "moderate",
        },
        wasSuccessful: true,
        userSatisfaction: 0.95,
        timestamp: new Date(),
      };

      const feedback: UserFeedback = {
        feedbackId: "fb-789",
        selectionId: outcome.selectionId,
        rating: 5,
        timestamp: new Date(),
        comment: "Perfect framework for this complex system problem",
        wasFrameworkAppropriate: true,
      };

      expect(feedback.selectionId).toBe(outcome.selectionId);
    });

    it("should allow using patterns to inform scoring weights", () => {
      const pattern: DomainPattern = {
        domain: "urgent-technical",
        characteristics: {
          complexity: "complex",
          uncertainty: "high",
          stakes: "critical",
          timePressure: "high",
        },
        preferredFrameworks: ["first-principles", "root-cause-analysis"],
        successRate: 0.89,
        sampleSize: 67,
      };

      const weights: ScoringWeights = {
        complexity: 0.25,
        uncertainty: 0.2,
        stakes: 0.3,
        timePressure: 0.25, // Higher weight for time pressure in urgent domain
        domain: pattern.domain,
        lastUpdated: new Date(),
      };

      expect(weights.domain).toBe(pattern.domain);
      expect(weights.timePressure).toBeGreaterThan(0.2); // Emphasizes urgency
    });
  });
});
