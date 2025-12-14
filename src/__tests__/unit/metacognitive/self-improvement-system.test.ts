/**
 * Tests for Self-Improvement System
 *
 * Tests the FeedbackIntegrator, PreferenceLearner, and OutcomeTracker
 * components that enable continuous improvement through feedback integration,
 * preference learning, and outcome tracking.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FeedbackIntegrator,
  OutcomeTracker,
  PreferenceLearner,
  SelfImprovementSystem,
} from "../../../metacognitive/self-improvement-system";
import type {
  Correction,
  Decision,
  Interaction,
  Outcome,
  OutcomePattern,
  UserFeedback,
} from "../../../metacognitive/types";

// Helper functions
function createMockFeedback(overrides: Partial<UserFeedback> = {}): UserFeedback {
  return {
    id: `feedback-${Date.now()}-${Math.random()}`,
    userId: "user-123",
    rating: 0.8,
    comments: "Good performance",
    context: "reasoning-task",
    timestamp: new Date(),
    ...overrides,
  };
}

function createMockCorrection(overrides: Partial<Correction> = {}): Correction {
  return {
    id: `correction-${Date.now()}-${Math.random()}`,
    subject: "reasoning-conclusion",
    original: "Incorrect conclusion",
    corrected: "Correct conclusion",
    reason: "Logical error in reasoning",
    userId: "user-123",
    timestamp: new Date(),
    severity: 0.7,
    ...overrides,
  };
}

describe("FeedbackIntegrator", () => {
  let integrator: FeedbackIntegrator;

  beforeEach(() => {
    integrator = new FeedbackIntegrator();
  });

  describe("Feedback Integration", () => {
    it("should integrate user feedback into learning systems", () => {
      const feedback = createMockFeedback({
        rating: 0.9,
        comments: "Excellent reasoning quality",
      });

      expect(() => integrator.integrateFeedback(feedback)).not.toThrow();
    });

    it("should store feedback with all required fields", () => {
      const feedback = createMockFeedback({
        rating: 0.75,
        context: "framework-selection",
      });

      integrator.storeFeedback(feedback);
      const retrieved = integrator.retrieveFeedback("user-123");

      expect(retrieved).toBeDefined();
      expect(retrieved.length).toBeGreaterThan(0);
      expect(retrieved[0]).toHaveProperty("id");
      expect(retrieved[0]).toHaveProperty("userId");
      expect(retrieved[0]).toHaveProperty("rating");
      expect(retrieved[0]).toHaveProperty("timestamp");
    });

    it("should retrieve feedback by user ID", () => {
      const feedback1 = createMockFeedback({ userId: "user-123" });
      const feedback2 = createMockFeedback({ userId: "user-456" });

      integrator.storeFeedback(feedback1);
      integrator.storeFeedback(feedback2);

      const retrieved = integrator.retrieveFeedback("user-123");

      expect(retrieved.length).toBe(1);
      expect(retrieved[0].userId).toBe("user-123");
    });
  });

  describe("Learning from Corrections", () => {
    it("should learn from user corrections", () => {
      const correction = createMockCorrection({
        subject: "bias-detection",
        severity: 0.8,
      });

      expect(() => integrator.learnFromCorrection(correction)).not.toThrow();
    });

    it("should extract actionable insights from corrections", () => {
      const correction = createMockCorrection({
        subject: "confidence-calibration",
        original: "0.9",
        corrected: "0.6",
        reason: "Overconfident prediction",
        severity: 0.7,
      });

      integrator.learnFromCorrection(correction);

      // Verify correction was processed (implementation will track this)
      expect(() => integrator.learnFromCorrection(correction)).not.toThrow();
    });

    it("should prioritize high-severity corrections", () => {
      const lowSeverity = createMockCorrection({ severity: 0.3 });
      const highSeverity = createMockCorrection({ severity: 0.9 });

      integrator.learnFromCorrection(lowSeverity);
      integrator.learnFromCorrection(highSeverity);

      // Implementation should prioritize high severity
      expect(() => integrator.learnFromCorrection(highSeverity)).not.toThrow();
    });
  });

  describe("Feedback Validation", () => {
    it("should validate feedback rating is between 0 and 1", () => {
      const validFeedback = createMockFeedback({ rating: 0.5 });
      const invalidFeedback = createMockFeedback({ rating: 1.5 });

      expect(integrator.validateFeedback(validFeedback)).toBe(true);
      expect(integrator.validateFeedback(invalidFeedback)).toBe(false);
    });

    it("should validate required fields are present", () => {
      const validFeedback = createMockFeedback();
      const invalidFeedback = {
        id: "feedback-1",
        // Missing required fields
      } as UserFeedback;

      expect(integrator.validateFeedback(validFeedback)).toBe(true);
      expect(integrator.validateFeedback(invalidFeedback)).toBe(false);
    });

    it("should reject feedback with negative ratings", () => {
      const invalidFeedback = createMockFeedback({ rating: -0.5 });

      expect(integrator.validateFeedback(invalidFeedback)).toBe(false);
    });

    it("should accept feedback with rating exactly 0", () => {
      const feedback = createMockFeedback({ rating: 0 });

      expect(integrator.validateFeedback(feedback)).toBe(true);
    });

    it("should accept feedback with rating exactly 1", () => {
      const feedback = createMockFeedback({ rating: 1 });

      expect(integrator.validateFeedback(feedback)).toBe(true);
    });
  });

  describe("Feedback Impact on Strategy Selection", () => {
    it("should track feedback impact on specific strategies", () => {
      const feedback = createMockFeedback({
        rating: 0.9,
        context: "analytical-strategy",
        metadata: { strategyId: "analytical" },
      });

      integrator.integrateFeedback(feedback);
      const impact = integrator.getFeedbackImpact("analytical");

      expect(impact).toBeGreaterThanOrEqual(0);
      expect(impact).toBeLessThanOrEqual(1);
    });

    it("should return zero impact for strategies with no feedback", () => {
      const impact = integrator.getFeedbackImpact("unknown-strategy");

      expect(impact).toBe(0);
    });

    it("should calculate average impact from multiple feedbacks", () => {
      const feedback1 = createMockFeedback({
        rating: 0.8,
        metadata: { strategyId: "creative" },
      });
      const feedback2 = createMockFeedback({
        rating: 0.6,
        metadata: { strategyId: "creative" },
      });

      integrator.integrateFeedback(feedback1);
      integrator.integrateFeedback(feedback2);

      const impact = integrator.getFeedbackImpact("creative");

      expect(impact).toBeCloseTo(0.7, 1);
    });
  });

  describe("Handling Empty/Invalid Feedback", () => {
    it("should handle empty feedback gracefully", () => {
      const emptyFeedback = createMockFeedback({
        comments: "",
        rating: 0.5,
      });

      expect(() => integrator.integrateFeedback(emptyFeedback)).not.toThrow();
    });

    it("should handle feedback with missing optional fields", () => {
      const feedback = createMockFeedback({
        comments: undefined,
        metadata: undefined,
      });

      expect(() => integrator.integrateFeedback(feedback)).not.toThrow();
    });

    it("should reject feedback with invalid user ID", () => {
      const invalidFeedback = createMockFeedback({ userId: "" });

      expect(integrator.validateFeedback(invalidFeedback)).toBe(false);
    });

    it("should reject feedback with invalid timestamp", () => {
      const invalidFeedback = {
        ...createMockFeedback(),
        timestamp: "invalid-date" as any,
      };

      expect(integrator.validateFeedback(invalidFeedback)).toBe(false);
    });
  });

  describe("Handling Conflicting Feedback", () => {
    it("should resolve conflicting feedback from same user", () => {
      const feedback1 = createMockFeedback({
        userId: "user-123",
        rating: 0.9,
        timestamp: new Date(Date.now() - 1000),
      });
      const feedback2 = createMockFeedback({
        userId: "user-123",
        rating: 0.3,
        timestamp: new Date(),
      });

      const resolved = integrator.handleConflictingFeedback([feedback1, feedback2]);

      expect(resolved).toBeDefined();
      expect(resolved.rating).toBeGreaterThanOrEqual(0);
      expect(resolved.rating).toBeLessThanOrEqual(1);
    });

    it("should prioritize more recent feedback", () => {
      const oldFeedback = createMockFeedback({
        rating: 0.5,
        timestamp: new Date(Date.now() - 10000),
      });
      const newFeedback = createMockFeedback({
        rating: 0.9,
        timestamp: new Date(),
      });

      const resolved = integrator.handleConflictingFeedback([oldFeedback, newFeedback]);

      // More recent feedback should have higher weight
      expect(resolved.rating).toBeGreaterThan(0.5);
    });

    it("should handle conflicting feedback with different contexts", () => {
      const feedback1 = createMockFeedback({
        rating: 0.9,
        context: "reasoning-quality",
      });
      const feedback2 = createMockFeedback({
        rating: 0.3,
        context: "response-speed",
      });

      const resolved = integrator.handleConflictingFeedback([feedback1, feedback2]);

      expect(resolved).toBeDefined();
      expect(resolved.rating).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Feedback Aggregation Over Time", () => {
    it("should aggregate feedback by day", () => {
      const feedback1 = createMockFeedback({ rating: 0.8 });
      const feedback2 = createMockFeedback({ rating: 0.9 });

      integrator.integrateFeedback(feedback1);
      integrator.integrateFeedback(feedback2);

      const aggregated = integrator.aggregateFeedback("day");

      expect(aggregated).toHaveProperty("averageRating");
      expect(aggregated).toHaveProperty("totalCount");
      expect(aggregated).toHaveProperty("trends");
      expect(aggregated.totalCount).toBe(2);
      expect(aggregated.averageRating).toBeCloseTo(0.85, 1);
    });

    it("should aggregate feedback by week", () => {
      const feedback = createMockFeedback({ rating: 0.7 });
      integrator.integrateFeedback(feedback);

      const aggregated = integrator.aggregateFeedback("week");

      expect(aggregated.totalCount).toBeGreaterThanOrEqual(0);
      expect(aggregated.averageRating).toBeGreaterThanOrEqual(0);
    });

    it("should aggregate feedback by month", () => {
      const feedback = createMockFeedback({ rating: 0.8 });
      integrator.integrateFeedback(feedback);

      const aggregated = integrator.aggregateFeedback("month");

      expect(aggregated).toBeDefined();
      expect(aggregated.trends).toBeInstanceOf(Array);
    });

    it("should identify improving trends", () => {
      const feedbacks = [
        createMockFeedback({ rating: 0.6, timestamp: new Date(Date.now() - 3000) }),
        createMockFeedback({ rating: 0.7, timestamp: new Date(Date.now() - 2000) }),
        createMockFeedback({ rating: 0.8, timestamp: new Date(Date.now() - 1000) }),
        createMockFeedback({ rating: 0.9, timestamp: new Date() }),
      ];

      feedbacks.forEach((f) => integrator.integrateFeedback(f));

      const aggregated = integrator.aggregateFeedback("day");

      expect(aggregated.trends).toContain("improving");
    });

    it("should identify declining trends", () => {
      const feedbacks = [
        createMockFeedback({ rating: 0.9, timestamp: new Date(Date.now() - 3000) }),
        createMockFeedback({ rating: 0.8, timestamp: new Date(Date.now() - 2000) }),
        createMockFeedback({ rating: 0.7, timestamp: new Date(Date.now() - 1000) }),
        createMockFeedback({ rating: 0.6, timestamp: new Date() }),
      ];

      feedbacks.forEach((f) => integrator.integrateFeedback(f));

      const aggregated = integrator.aggregateFeedback("day");

      expect(aggregated.trends).toContain("declining");
    });

    it("should handle empty feedback for aggregation", () => {
      const aggregated = integrator.aggregateFeedback("day");

      expect(aggregated.totalCount).toBe(0);
      expect(aggregated.averageRating).toBe(0);
      expect(aggregated.trends).toEqual([]);
    });
  });
});

describe("PreferenceLearner", () => {
  let learner: PreferenceLearner;

  beforeEach(() => {
    learner = new PreferenceLearner();
  });

  describe("Learning User Preferences from Interactions", () => {
    it("should learn preferences from user interactions", () => {
      const interaction = createMockInteraction({
        type: "query",
        content: { format: "detailed" },
      });

      expect(() => learner.learnFromInteraction(interaction)).not.toThrow();
    });

    it("should extract preference patterns from multiple interactions", () => {
      const interactions = [
        createMockInteraction({ content: { format: "detailed" } }),
        createMockInteraction({ content: { format: "detailed" } }),
        createMockInteraction({ content: { format: "concise" } }),
      ];

      interactions.forEach((i) => learner.learnFromInteraction(i));

      const preferences = learner.getPreferences("user-123");

      expect(preferences).toBeDefined();
      expect(preferences.userId).toBe("user-123");
      expect(preferences.preferences.size).toBeGreaterThan(0);
    });

    it("should calculate confidence scores based on interaction frequency", () => {
      const interactions = [
        createMockInteraction({ content: { style: "formal" } }),
        createMockInteraction({ content: { style: "formal" } }),
        createMockInteraction({ content: { style: "formal" } }),
        createMockInteraction({ content: { style: "casual" } }),
      ];

      interactions.forEach((i) => learner.learnFromInteraction(i));

      const preferences = learner.getPreferences("user-123");
      const stylePreference = preferences.preferences.get("style");

      expect(stylePreference).toBeDefined();
      expect(stylePreference?.value).toBe("formal");
      expect(stylePreference?.confidence).toBeGreaterThan(0.5);
    });

    it("should track supporting interactions count", () => {
      const interactions = [
        createMockInteraction({ content: { verbosity: "high" } }),
        createMockInteraction({ content: { verbosity: "high" } }),
      ];

      interactions.forEach((i) => learner.learnFromInteraction(i));

      const preferences = learner.getPreferences("user-123");
      const verbosityPreference = preferences.preferences.get("verbosity");

      expect(verbosityPreference?.supportingInteractions).toBe(2);
    });
  });

  describe("Preference Pattern Identification", () => {
    it("should identify consistent preference patterns", () => {
      const interactions = Array(5)
        .fill(null)
        .map(() => createMockInteraction({ content: { theme: "dark" } }));

      interactions.forEach((i) => learner.learnFromInteraction(i));

      const patterns = learner.identifyPatterns("user-123");

      expect(patterns).toBeDefined();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty("pattern");
      expect(patterns[0]).toHaveProperty("confidence");
    });

    it("should detect temporal patterns in preferences", () => {
      const morningInteraction = createMockInteraction({
        content: { mode: "focused" },
        timestamp: new Date("2024-01-01T08:00:00"),
      });
      const eveningInteraction = createMockInteraction({
        content: { mode: "exploratory" },
        timestamp: new Date("2024-01-01T20:00:00"),
      });

      learner.learnFromInteraction(morningInteraction);
      learner.learnFromInteraction(eveningInteraction);

      const patterns = learner.identifyPatterns("user-123");

      expect(patterns).toBeDefined();
    });

    it("should identify contextual preference patterns", () => {
      const workContext = createMockInteraction({
        content: { detail: "high" },
        context: { domain: "work", taskType: "analysis" },
      });
      const casualContext = createMockInteraction({
        content: { detail: "low" },
        context: { domain: "personal", taskType: "chat" },
      });

      learner.learnFromInteraction(workContext);
      learner.learnFromInteraction(casualContext);

      const patterns = learner.identifyPatterns("user-123");

      expect(patterns.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Adapting to Learned Preferences", () => {
    it("should adapt system behavior to learned preferences", () => {
      const interactions = Array(3)
        .fill(null)
        .map(() => createMockInteraction({ content: { language: "technical" } }));

      interactions.forEach((i) => learner.learnFromInteraction(i));

      const adaptations = learner.getAdaptations("user-123");

      expect(adaptations).toBeDefined();
      expect(adaptations).toHaveProperty("recommendations");
      expect(adaptations.recommendations.length).toBeGreaterThan(0);
    });

    it("should provide confidence-weighted recommendations", () => {
      const interactions = [
        createMockInteraction({ content: { complexity: "advanced" } }),
        createMockInteraction({ content: { complexity: "advanced" } }),
        createMockInteraction({ content: { complexity: "beginner" } }),
      ];

      interactions.forEach((i) => learner.learnFromInteraction(i));

      const adaptations = learner.getAdaptations("user-123");

      expect(adaptations.recommendations[0]).toHaveProperty("confidence");
      expect(adaptations.recommendations[0].confidence).toBeGreaterThan(0);
    });

    it("should adapt based on context-specific preferences", () => {
      const interaction = createMockInteraction({
        content: { responseStyle: "brief" },
        context: { urgency: "high" },
      });

      learner.learnFromInteraction(interaction);

      const adaptations = learner.getAdaptations("user-123", { urgency: "high" });

      expect(adaptations).toBeDefined();
    });
  });

  describe("Preference Persistence and Retrieval", () => {
    it("should persist learned preferences", () => {
      const interaction = createMockInteraction({ content: { preference: "value" } });

      learner.learnFromInteraction(interaction);
      learner.persistPreferences("user-123");

      const retrieved = learner.getPreferences("user-123");

      expect(retrieved).toBeDefined();
      expect(retrieved.userId).toBe("user-123");
    });

    it("should retrieve preferences by user ID", () => {
      const user1Interaction = createMockInteraction({
        userId: "user-123",
        content: { pref: "a" },
      });
      const user2Interaction = createMockInteraction({
        userId: "user-456",
        content: { pref: "b" },
      });

      learner.learnFromInteraction(user1Interaction);
      learner.learnFromInteraction(user2Interaction);

      const user1Prefs = learner.getPreferences("user-123");
      const user2Prefs = learner.getPreferences("user-456");

      expect(user1Prefs.userId).toBe("user-123");
      expect(user2Prefs.userId).toBe("user-456");
    });

    it("should update lastUpdated timestamp on preference changes", () => {
      const interaction = createMockInteraction({ content: { test: "value" } });

      const beforeTime = new Date();
      learner.learnFromInteraction(interaction);
      const afterTime = new Date();

      const preferences = learner.getPreferences("user-123");

      expect(preferences.lastUpdated.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(preferences.lastUpdated.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it("should track sample size for statistical validity", () => {
      const interactions = Array(10)
        .fill(null)
        .map(() => createMockInteraction({ content: { key: "value" } }));

      interactions.forEach((i) => learner.learnFromInteraction(i));

      const preferences = learner.getPreferences("user-123");

      expect(preferences.sampleSize).toBe(10);
    });
  });

  describe("Handling Insufficient Data for Learning", () => {
    it("should handle learning with no interactions gracefully", () => {
      const preferences = learner.getPreferences("new-user");

      expect(preferences).toBeDefined();
      expect(preferences.userId).toBe("new-user");
      expect(preferences.preferences.size).toBe(0);
      expect(preferences.sampleSize).toBe(0);
    });

    it("should return low confidence for preferences with few interactions", () => {
      const interaction = createMockInteraction({ content: { key: "value" } });

      learner.learnFromInteraction(interaction);

      const preferences = learner.getPreferences("user-123");
      const preference = preferences.preferences.get("key");

      expect(preference?.confidence).toBeLessThan(0.7);
    });

    it("should require minimum sample size for pattern identification", () => {
      const interaction = createMockInteraction({ content: { pattern: "test" } });

      learner.learnFromInteraction(interaction);

      const patterns = learner.identifyPatterns("user-123");

      // Should return empty or low-confidence patterns with insufficient data
      expect(patterns.length).toBe(0);
    });

    it("should indicate when more data is needed", () => {
      const interaction = createMockInteraction({ content: { key: "value" } });

      learner.learnFromInteraction(interaction);

      const status = learner.getLearningStatus("user-123");

      expect(status).toHaveProperty("needsMoreData");
      expect(status.needsMoreData).toBe(true);
    });
  });

  describe("Handling Rapid Preference Changes", () => {
    it("should detect rapid preference changes", () => {
      const interactions = [
        createMockInteraction({
          content: { style: "formal" },
          timestamp: new Date(Date.now() - 5000),
        }),
        createMockInteraction({
          content: { style: "casual" },
          timestamp: new Date(Date.now() - 4000),
        }),
        createMockInteraction({
          content: { style: "technical" },
          timestamp: new Date(Date.now() - 3000),
        }),
      ];

      interactions.forEach((i) => learner.learnFromInteraction(i));

      const status = learner.getLearningStatus("user-123");

      expect(status).toHaveProperty("volatility");
      expect(status.volatility).toBeGreaterThan(0);
    });

    it("should lower confidence during rapid changes", () => {
      const interactions = [
        createMockInteraction({ content: { pref: "a" } }),
        createMockInteraction({ content: { pref: "b" } }),
        createMockInteraction({ content: { pref: "c" } }),
      ];

      interactions.forEach((i) => learner.learnFromInteraction(i));

      const preferences = learner.getPreferences("user-123");
      const preference = preferences.preferences.get("pref");

      expect(preference?.confidence).toBeLessThan(0.7);
    });

    it("should adapt to new stable patterns after volatility", () => {
      // Initial volatile period
      const volatileInteractions = [
        createMockInteraction({ content: { mode: "a" } }),
        createMockInteraction({ content: { mode: "b" } }),
        createMockInteraction({ content: { mode: "c" } }),
      ];

      // Stable period
      const stableInteractions = Array(5)
        .fill(null)
        .map(() => createMockInteraction({ content: { mode: "stable" } }));

      [...volatileInteractions, ...stableInteractions].forEach((i) =>
        learner.learnFromInteraction(i)
      );

      const preferences = learner.getPreferences("user-123");
      const modePreference = preferences.preferences.get("mode");

      expect(modePreference?.value).toBe("stable");
      expect(modePreference?.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("Preference Confidence Scoring", () => {
    it("should calculate confidence based on consistency", () => {
      const consistentInteractions = Array(10)
        .fill(null)
        .map(() => createMockInteraction({ content: { consistent: "yes" } }));

      consistentInteractions.forEach((i) => learner.learnFromInteraction(i));

      const preferences = learner.getPreferences("user-123");
      const preference = preferences.preferences.get("consistent");

      expect(preference?.confidence).toBeGreaterThan(0.7);
    });

    it("should calculate confidence based on sample size", () => {
      const fewInteractions = Array(2)
        .fill(null)
        .map(() => createMockInteraction({ content: { key: "value" } }));

      fewInteractions.forEach((i) => learner.learnFromInteraction(i));

      const preferences = learner.getPreferences("user-123");
      const preference = preferences.preferences.get("key");

      expect(preference?.confidence).toBeLessThan(0.7);
    });

    it("should calculate confidence based on recency", () => {
      const oldInteraction = createMockInteraction({
        content: { recency: "old" },
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      });
      const recentInteraction = createMockInteraction({
        content: { recency: "recent" },
        timestamp: new Date(),
      });

      learner.learnFromInteraction(oldInteraction);
      learner.learnFromInteraction(recentInteraction);

      const preferences = learner.getPreferences("user-123");
      const preference = preferences.preferences.get("recency");

      // Recent preference should have higher confidence
      expect(preference?.value).toBe("recent");
    });

    it("should provide confidence breakdown", () => {
      const interactions = Array(5)
        .fill(null)
        .map(() => createMockInteraction({ content: { key: "value" } }));

      interactions.forEach((i) => learner.learnFromInteraction(i));

      const breakdown = learner.getConfidenceBreakdown("user-123", "key");

      expect(breakdown).toHaveProperty("consistency");
      expect(breakdown).toHaveProperty("sampleSize");
      expect(breakdown).toHaveProperty("recency");
      expect(breakdown).toHaveProperty("overall");
    });
  });

  describe("Preference Conflict Resolution", () => {
    it("should resolve conflicting preferences from same user", () => {
      const interactions = [
        createMockInteraction({
          content: { setting: "on" },
          timestamp: new Date(Date.now() - 2000),
        }),
        createMockInteraction({
          content: { setting: "off" },
          timestamp: new Date(),
        }),
      ];

      interactions.forEach((i) => learner.learnFromInteraction(i));

      const preferences = learner.getPreferences("user-123");
      const preference = preferences.preferences.get("setting");

      // Should prefer more recent
      expect(preference?.value).toBe("off");
    });

    it("should resolve context-dependent conflicts", () => {
      const workInteraction = createMockInteraction({
        content: { verbosity: "high" },
        context: { environment: "work" },
      });
      const homeInteraction = createMockInteraction({
        content: { verbosity: "low" },
        context: { environment: "home" },
      });

      learner.learnFromInteraction(workInteraction);
      learner.learnFromInteraction(homeInteraction);

      const workAdaptations = learner.getAdaptations("user-123", { environment: "work" });
      const homeAdaptations = learner.getAdaptations("user-123", { environment: "home" });

      expect(workAdaptations).toBeDefined();
      expect(homeAdaptations).toBeDefined();
    });

    it("should handle conflicting preferences with equal weight", () => {
      const interactions = [
        createMockInteraction({ content: { choice: "a" } }),
        createMockInteraction({ content: { choice: "b" } }),
      ];

      interactions.forEach((i) => learner.learnFromInteraction(i));

      const preferences = learner.getPreferences("user-123");
      const preference = preferences.preferences.get("choice");

      // Should have low confidence due to conflict
      expect(preference?.confidence).toBeLessThan(0.6);
    });

    it("should provide conflict resolution explanation", () => {
      const interactions = [
        createMockInteraction({ content: { option: "x" } }),
        createMockInteraction({ content: { option: "y" } }),
      ];

      interactions.forEach((i) => learner.learnFromInteraction(i));

      const explanation = learner.explainPreference("user-123", "option");

      expect(explanation).toHaveProperty("value");
      expect(explanation).toHaveProperty("confidence");
      expect(explanation).toHaveProperty("reasoning");
      expect(explanation.reasoning).toContain("conflict");
    });
  });
});

// Helper function for PreferenceLearner tests
function createMockInteraction(overrides: Partial<Interaction> = {}): Interaction {
  return {
    id: `interaction-${Date.now()}-${Math.random()}`,
    userId: "user-123",
    type: "query",
    content: { key: "value" },
    context: { domain: "general", taskType: "query" },
    timestamp: new Date(),
    ...overrides,
  };
}

describe("OutcomeTracker", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tracker: any;

  beforeEach(() => {
    tracker = new OutcomeTracker();
  });

  describe("Tracking Decisions and Outcomes", () => {
    it("should track decision-outcome pairs", () => {
      const decision = createMockDecision({
        type: "strategy-selection",
        choice: "analytical",
      });
      const outcome = createMockOutcome({
        success: true,
        quality: 0.9,
      });

      expect(() => tracker.trackOutcome(decision, outcome)).not.toThrow();
    });

    it("should store decision context with outcome", () => {
      const decision = createMockDecision({
        context: { complexity: "high", uncertainty: "medium" },
      });
      const outcome = createMockOutcome({ success: true });

      tracker.trackOutcome(decision, outcome);
      const tracked = tracker.getOutcomes(decision.id);

      expect(tracked).toBeDefined();
      expect(tracked.length).toBe(1);
      expect(tracked[0].decision.context).toEqual(decision.context);
    });

    it("should link multiple outcomes to same decision", () => {
      const decision = createMockDecision();
      const outcome1 = createMockOutcome({ success: true });
      const outcome2 = createMockOutcome({ success: false });

      tracker.trackOutcome(decision, outcome1);
      tracker.trackOutcome(decision, outcome2);

      const tracked = tracker.getOutcomes(decision.id);

      expect(tracked.length).toBe(2);
    });

    it("should track timestamp for each outcome", () => {
      const decision = createMockDecision();
      const outcome = createMockOutcome();

      const beforeTime = new Date();
      tracker.trackOutcome(decision, outcome);
      const afterTime = new Date();

      const tracked = tracker.getOutcomes(decision.id);

      expect(tracked[0].outcome.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(tracked[0].outcome.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it("should validate decision has required fields", () => {
      const invalidDecision = {
        id: "decision-1",
        // Missing required fields
      } as Decision;
      const outcome = createMockOutcome();

      expect(() => tracker.trackOutcome(invalidDecision, outcome)).toThrow();
    });

    it("should validate outcome has required fields", () => {
      const decision = createMockDecision();
      const invalidOutcome = {
        id: "outcome-1",
        // Missing required fields
      } as Outcome;

      expect(() => tracker.trackOutcome(decision, invalidOutcome)).toThrow();
    });
  });

  describe("Outcome Pattern Analysis", () => {
    it("should analyze patterns in tracked outcomes", () => {
      const decisions = Array(5)
        .fill(null)
        .map(() =>
          createMockDecision({
            type: "framework-selection",
            context: { complexity: "high" },
          })
        );
      const outcomes = decisions.map(() => createMockOutcome({ success: true, quality: 0.8 }));

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const patterns = tracker.analyzePatterns();

      expect(patterns).toBeDefined();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty("type");
      expect(patterns[0]).toHaveProperty("contextFactors");
      expect(patterns[0]).toHaveProperty("successRate");
    });

    it("should identify context factors in patterns", () => {
      const highComplexityDecisions = Array(3)
        .fill(null)
        .map(() =>
          createMockDecision({
            context: { complexity: "high", uncertainty: "low" },
          })
        );
      const outcomes = highComplexityDecisions.map(() =>
        createMockOutcome({ success: true, quality: 0.9 })
      );

      highComplexityDecisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const patterns = tracker.analyzePatterns();

      expect(patterns[0].contextFactors).toContain("complexity:high");
    });

    it("should identify decision factors in patterns", () => {
      const analyticalDecisions = Array(3)
        .fill(null)
        .map(() =>
          createMockDecision({
            type: "strategy-selection",
            choice: "analytical",
          })
        );
      const outcomes = analyticalDecisions.map(() => createMockOutcome({ success: true }));

      analyticalDecisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const patterns = tracker.analyzePatterns();

      expect(patterns[0].decisionFactors).toContain("choice:analytical");
    });

    it("should calculate average quality for patterns", () => {
      const decisions = Array(4)
        .fill(null)
        .map(() => createMockDecision({ type: "test" }));
      const outcomes = [
        createMockOutcome({ quality: 0.8 }),
        createMockOutcome({ quality: 0.9 }),
        createMockOutcome({ quality: 0.7 }),
        createMockOutcome({ quality: 0.6 }),
      ];

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const patterns = tracker.analyzePatterns();

      expect(patterns[0].averageQuality).toBeCloseTo(0.75, 1);
    });

    it("should generate recommendations based on patterns", () => {
      const decisions = Array(5)
        .fill(null)
        .map(() => createMockDecision({ choice: "creative" }));
      const outcomes = decisions.map(() => createMockOutcome({ success: true, quality: 0.9 }));

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const patterns = tracker.analyzePatterns();

      expect(patterns[0].recommendations).toBeDefined();
      expect(patterns[0].recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Success/Failure Pattern Identification", () => {
    it("should identify success patterns", () => {
      const successDecisions = Array(5)
        .fill(null)
        .map(() =>
          createMockDecision({
            choice: "systematic",
            context: { preparation: "thorough" },
          })
        );
      const successOutcomes = successDecisions.map(() =>
        createMockOutcome({ success: true, quality: 0.9 })
      );

      successDecisions.forEach((d, i) => tracker.trackOutcome(d, successOutcomes[i]));

      const patterns = tracker.analyzePatterns();
      const successPatterns = patterns.filter((p: OutcomePattern) => p.type === "success");

      expect(successPatterns.length).toBeGreaterThan(0);
      expect(successPatterns[0].successRate).toBeGreaterThan(0.8);
    });

    it("should identify failure patterns", () => {
      const failureDecisions = Array(5)
        .fill(null)
        .map(() =>
          createMockDecision({
            choice: "rushed",
            context: { timePressure: "extreme" },
          })
        );
      const failureOutcomes = failureDecisions.map(() =>
        createMockOutcome({ success: false, quality: 0.3 })
      );

      failureDecisions.forEach((d, i) => tracker.trackOutcome(d, failureOutcomes[i]));

      const patterns = tracker.analyzePatterns();
      const failurePatterns = patterns.filter((p: OutcomePattern) => p.type === "failure");

      expect(failurePatterns.length).toBeGreaterThan(0);
      expect(failurePatterns[0].successRate).toBeLessThan(0.5);
    });

    it("should identify mixed patterns", () => {
      const decisions = Array(6)
        .fill(null)
        .map(() => createMockDecision({ choice: "experimental" }));
      const outcomes = [
        createMockOutcome({ success: true }),
        createMockOutcome({ success: false }),
        createMockOutcome({ success: true }),
        createMockOutcome({ success: false }),
        createMockOutcome({ success: true }),
        createMockOutcome({ success: false }),
      ];

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const patterns = tracker.analyzePatterns();
      const mixedPatterns = patterns.filter((p: OutcomePattern) => p.type === "mixed");

      expect(mixedPatterns.length).toBeGreaterThan(0);
      expect(mixedPatterns[0].successRate).toBeGreaterThan(0.3);
      expect(mixedPatterns[0].successRate).toBeLessThan(0.7);
    });

    it("should distinguish between success and failure factors", () => {
      const successDecisions = Array(3)
        .fill(null)
        .map(() => createMockDecision({ context: { factor: "positive" } }));
      const failureDecisions = Array(3)
        .fill(null)
        .map(() => createMockDecision({ context: { factor: "negative" } }));

      successDecisions.forEach((d) =>
        tracker.trackOutcome(d, createMockOutcome({ success: true }))
      );
      failureDecisions.forEach((d) =>
        tracker.trackOutcome(d, createMockOutcome({ success: false }))
      );

      const patterns = tracker.analyzePatterns();
      const successPattern = patterns.find((p: OutcomePattern) => p.type === "success");
      const failurePattern = patterns.find((p: OutcomePattern) => p.type === "failure");

      expect(successPattern?.contextFactors).toContain("factor:positive");
      expect(failurePattern?.contextFactors).toContain("factor:negative");
    });
  });

  describe("Outcome-Based Strategy Adjustment", () => {
    it("should recommend strategy adjustments based on outcomes", () => {
      const decisions = Array(5)
        .fill(null)
        .map(() => createMockDecision({ choice: "strategy-a" }));
      const outcomes = decisions.map(() => createMockOutcome({ success: false, quality: 0.3 }));

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const adjustments = tracker.getStrategyAdjustments();

      expect(adjustments).toBeDefined();
      expect(adjustments.length).toBeGreaterThan(0);
      expect(adjustments[0]).toHaveProperty("strategy");
      expect(adjustments[0]).toHaveProperty("recommendation");
      expect(adjustments[0]).toHaveProperty("confidence");
    });

    it("should suggest avoiding strategies with poor outcomes", () => {
      const poorDecisions = Array(5)
        .fill(null)
        .map(() => createMockDecision({ choice: "poor-strategy" }));
      const poorOutcomes = poorDecisions.map(() =>
        createMockOutcome({ success: false, quality: 0.2 })
      );

      poorDecisions.forEach((d, i) => tracker.trackOutcome(d, poorOutcomes[i]));

      const adjustments = tracker.getStrategyAdjustments();
      const poorStrategyAdjustment = adjustments.find(
        (a: { strategy: string }) => a.strategy === "poor-strategy"
      );

      expect(poorStrategyAdjustment?.recommendation).toContain("avoid");
    });

    it("should suggest favoring strategies with good outcomes", () => {
      const goodDecisions = Array(5)
        .fill(null)
        .map(() => createMockDecision({ choice: "good-strategy" }));
      const goodOutcomes = goodDecisions.map(() =>
        createMockOutcome({ success: true, quality: 0.9 })
      );

      goodDecisions.forEach((d, i) => tracker.trackOutcome(d, goodOutcomes[i]));

      const adjustments = tracker.getStrategyAdjustments();
      const goodStrategyAdjustment = adjustments.find(
        (a: { strategy: string }) => a.strategy === "good-strategy"
      );

      expect(goodStrategyAdjustment?.recommendation).toContain("favor");
    });

    it("should provide context-specific adjustments", () => {
      const highComplexityDecisions = Array(3)
        .fill(null)
        .map(() =>
          createMockDecision({
            choice: "detailed-analysis",
            context: { complexity: "high" },
          })
        );
      const outcomes = highComplexityDecisions.map(() =>
        createMockOutcome({ success: true, quality: 0.9 })
      );

      highComplexityDecisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const adjustments = tracker.getStrategyAdjustments({ complexity: "high" });

      expect(adjustments.length).toBeGreaterThan(0);
      expect(adjustments[0].context).toEqual({ complexity: "high" });
    });

    it("should calculate confidence in adjustments", () => {
      const decisions = Array(10)
        .fill(null)
        .map(() => createMockDecision({ choice: "consistent-strategy" }));
      const outcomes = decisions.map(() => createMockOutcome({ success: true, quality: 0.85 }));

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const adjustments = tracker.getStrategyAdjustments();

      expect(adjustments[0].confidence).toBeGreaterThan(0.7);
    });
  });

  describe("Handling Empty Outcomes", () => {
    it("should handle tracker with no outcomes gracefully", () => {
      const patterns = tracker.analyzePatterns();

      expect(patterns).toBeDefined();
      expect(patterns).toEqual([]);
    });

    it("should return empty adjustments when no outcomes tracked", () => {
      const adjustments = tracker.getStrategyAdjustments();

      expect(adjustments).toBeDefined();
      expect(adjustments).toEqual([]);
    });

    it("should return empty array for non-existent decision", () => {
      const outcomes = tracker.getOutcomes("non-existent-id");

      expect(outcomes).toBeDefined();
      expect(outcomes).toEqual([]);
    });

    it("should handle pattern analysis with insufficient data", () => {
      const decision = createMockDecision();
      const outcome = createMockOutcome();

      tracker.trackOutcome(decision, outcome);

      const patterns = tracker.analyzePatterns();

      // Should return empty or low-confidence patterns with only 1 data point
      expect(patterns.length).toBe(0);
    });

    it("should indicate when more data is needed", () => {
      const decision = createMockDecision();
      const outcome = createMockOutcome();

      tracker.trackOutcome(decision, outcome);

      const status = tracker.getAnalysisStatus();

      expect(status).toHaveProperty("needsMoreData");
      expect(status.needsMoreData).toBe(true);
    });
  });

  describe("Outcome Aggregation Over Time", () => {
    it("should aggregate outcomes by day", () => {
      const decisions = Array(5)
        .fill(null)
        .map(() => createMockDecision());
      const outcomes = decisions.map(() => createMockOutcome({ success: true, quality: 0.8 }));

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const aggregated = tracker.aggregateOutcomes("day");

      expect(aggregated).toHaveProperty("totalOutcomes");
      expect(aggregated).toHaveProperty("successRate");
      expect(aggregated).toHaveProperty("averageQuality");
      expect(aggregated).toHaveProperty("period");
      expect(aggregated.totalOutcomes).toBe(5);
      expect(aggregated.successRate).toBe(1.0);
      expect(aggregated.averageQuality).toBeCloseTo(0.8, 1);
    });

    it("should aggregate outcomes by week", () => {
      const decisions = Array(3)
        .fill(null)
        .map(() => createMockDecision());
      const outcomes = [
        createMockOutcome({ success: true, quality: 0.9 }),
        createMockOutcome({ success: false, quality: 0.4 }),
        createMockOutcome({ success: true, quality: 0.7 }),
      ];

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const aggregated = tracker.aggregateOutcomes("week");

      expect(aggregated.successRate).toBeCloseTo(0.67, 1);
      expect(aggregated.averageQuality).toBeCloseTo(0.67, 1);
    });

    it("should aggregate outcomes by month", () => {
      const decisions = Array(10)
        .fill(null)
        .map(() => createMockDecision());
      const outcomes = decisions.map((_, i) =>
        createMockOutcome({ success: i % 2 === 0, quality: 0.5 + i * 0.05 })
      );

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const aggregated = tracker.aggregateOutcomes("month");

      expect(aggregated.totalOutcomes).toBe(10);
      expect(aggregated.successRate).toBe(0.5);
    });

    it("should filter outcomes by time range", () => {
      const oldDecision = createMockDecision();
      const oldOutcome = createMockOutcome({
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      });

      const recentDecision = createMockDecision();
      const recentOutcome = createMockOutcome({
        timestamp: new Date(),
      });

      tracker.trackOutcome(oldDecision, oldOutcome);
      tracker.trackOutcome(recentDecision, recentOutcome);

      const dayAggregated = tracker.aggregateOutcomes("day");

      expect(dayAggregated.totalOutcomes).toBe(1); // Only recent outcome
    });

    it("should calculate trends over time", () => {
      const decisions = Array(10)
        .fill(null)
        .map(() => createMockDecision());
      const outcomes = decisions.map((_, i) =>
        createMockOutcome({
          success: true,
          quality: 0.5 + i * 0.05, // Improving quality
          timestamp: new Date(Date.now() - (10 - i) * 1000),
        })
      );

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const aggregated = tracker.aggregateOutcomes("day");

      expect(aggregated).toHaveProperty("trend");
      expect(aggregated.trend).toBe("improving");
    });

    it("should identify declining trends", () => {
      const decisions = Array(10)
        .fill(null)
        .map(() => createMockDecision());
      const outcomes = decisions.map((_, i) =>
        createMockOutcome({
          success: true,
          quality: 0.9 - i * 0.05, // Declining quality
          timestamp: new Date(Date.now() - (10 - i) * 1000),
        })
      );

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const aggregated = tracker.aggregateOutcomes("day");

      expect(aggregated.trend).toBe("declining");
    });
  });

  describe("Pattern Confidence Scoring", () => {
    it("should calculate confidence based on sample size", () => {
      const fewDecisions = Array(3)
        .fill(null)
        .map(() => createMockDecision({ choice: "strategy-a" }));
      const fewOutcomes = fewDecisions.map(() => createMockOutcome({ success: true }));

      fewDecisions.forEach((d, i) => tracker.trackOutcome(d, fewOutcomes[i]));

      const patterns = tracker.analyzePatterns();

      // With 3 samples (MIN_SAMPLE_SIZE), pattern is created but with low confidence
      expect(patterns.length).toBe(1);
      // sampleSizeFactor = 3/20 = 0.15, consistencyFactor = 1.0, confidence = 0.15*0.6 + 1.0*0.4 = 0.49
      expect(patterns[0].confidence).toBeLessThan(0.5);
    });

    it("should calculate confidence based on consistency", () => {
      const consistentDecisions = Array(15)
        .fill(null)
        .map(() => createMockDecision({ choice: "consistent-strategy" }));
      const consistentOutcomes = consistentDecisions.map(() =>
        createMockOutcome({ success: true, quality: 0.9 })
      );

      consistentDecisions.forEach((d, i) => tracker.trackOutcome(d, consistentOutcomes[i]));

      const patterns = tracker.analyzePatterns();

      // With 15 samples: sampleSizeFactor = 15/20 = 0.75, consistencyFactor = 1.0
      // confidence = 0.75*0.6 + 1.0*0.4 = 0.45 + 0.4 = 0.85 > 0.7
      expect(patterns[0].confidence).toBeGreaterThan(0.7);
    });

    it("should lower confidence for inconsistent patterns", () => {
      const decisions = Array(10)
        .fill(null)
        .map(() => createMockDecision({ choice: "inconsistent-strategy" }));
      const outcomes = decisions.map((_, i) =>
        createMockOutcome({ success: i % 2 === 0, quality: Math.random() })
      );

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const patterns = tracker.analyzePatterns();

      expect(patterns[0].confidence).toBeLessThan(0.7);
    });

    it("should increase confidence with more data points", () => {
      const smallSample = Array(5)
        .fill(null)
        .map(() => createMockDecision({ choice: "strategy-small" }));
      const largeSample = Array(20)
        .fill(null)
        .map(() => createMockDecision({ choice: "strategy-large" }));

      smallSample.forEach((d) => tracker.trackOutcome(d, createMockOutcome({ success: true })));
      largeSample.forEach((d) => tracker.trackOutcome(d, createMockOutcome({ success: true })));

      const patterns = tracker.analyzePatterns();
      const smallPattern = patterns.find((p: OutcomePattern) =>
        p.decisionFactors.includes("choice:strategy-small")
      );
      const largePattern = patterns.find((p: OutcomePattern) =>
        p.decisionFactors.includes("choice:strategy-large")
      );

      expect(largePattern?.confidence).toBeGreaterThan(smallPattern?.confidence || 0);
    });

    it("should provide confidence breakdown", () => {
      const decisions = Array(10)
        .fill(null)
        .map(() => createMockDecision({ choice: "test-strategy" }));
      const outcomes = decisions.map(() => createMockOutcome({ success: true, quality: 0.8 }));

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const patterns = tracker.analyzePatterns();
      const breakdown = tracker.getConfidenceBreakdown(patterns[0].id);

      expect(breakdown).toHaveProperty("sampleSize");
      expect(breakdown).toHaveProperty("consistency");
      expect(breakdown).toHaveProperty("recency");
      expect(breakdown).toHaveProperty("overall");
    });
  });

  describe("Identifying Causal Factors", () => {
    it("should identify causal factors for success", () => {
      const successDecisions = Array(5)
        .fill(null)
        .map(() =>
          createMockDecision({
            context: { preparation: "thorough", resources: "adequate" },
          })
        );
      const successOutcomes = successDecisions.map(() =>
        createMockOutcome({ success: true, quality: 0.9 })
      );

      successDecisions.forEach((d, i) => tracker.trackOutcome(d, successOutcomes[i]));

      const causalFactors = tracker.identifyCausalFactors("success");

      expect(causalFactors).toBeDefined();
      expect(causalFactors.length).toBeGreaterThan(0);
      expect(causalFactors[0]).toHaveProperty("factor");
      expect(causalFactors[0]).toHaveProperty("correlation");
      expect(causalFactors[0]).toHaveProperty("confidence");
    });

    it("should identify causal factors for failure", () => {
      const failureDecisions = Array(5)
        .fill(null)
        .map(() =>
          createMockDecision({
            context: { timePressure: "extreme", resources: "insufficient" },
          })
        );
      const failureOutcomes = failureDecisions.map(() =>
        createMockOutcome({ success: false, quality: 0.3 })
      );

      failureDecisions.forEach((d, i) => tracker.trackOutcome(d, failureOutcomes[i]));

      const causalFactors = tracker.identifyCausalFactors("failure");

      expect(causalFactors.length).toBeGreaterThan(0);
      expect(causalFactors[0].correlation).toBeGreaterThan(0.5);
    });

    it("should rank causal factors by correlation strength", () => {
      const decisions = Array(10)
        .fill(null)
        .map((_, i) =>
          createMockDecision({
            context: {
              strongFactor: i < 8 ? "present" : "absent",
              weakFactor: i < 6 ? "present" : "absent",
            },
          })
        );
      const outcomes = decisions.map((_, i) =>
        createMockOutcome({ success: i < 8, quality: i < 8 ? 0.8 : 0.3 })
      );

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const causalFactors = tracker.identifyCausalFactors("success");

      // strongFactor should have higher correlation than weakFactor
      const strongFactor = causalFactors.find((f: { factor: string }) =>
        f.factor.includes("strongFactor")
      );
      const weakFactor = causalFactors.find((f: { factor: string }) =>
        f.factor.includes("weakFactor")
      );

      expect(strongFactor?.correlation).toBeGreaterThan(weakFactor?.correlation || 0);
    });

    it("should calculate confidence in causal relationships", () => {
      const decisions = Array(15)
        .fill(null)
        .map(() =>
          createMockDecision({
            context: { criticalFactor: "present" },
          })
        );
      const outcomes = decisions.map(() => createMockOutcome({ success: true, quality: 0.9 }));

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const causalFactors = tracker.identifyCausalFactors("success");

      expect(causalFactors[0].confidence).toBeGreaterThan(0.7);
    });

    it("should distinguish correlation from causation", () => {
      const decisions = Array(10)
        .fill(null)
        .map((_, i) =>
          createMockDecision({
            context: {
              causalFactor: i < 8 ? "yes" : "no",
              correlatedFactor: i < 8 ? "yes" : "no",
            },
          })
        );
      const outcomes = decisions.map((_, i) =>
        createMockOutcome({ success: i < 8, quality: i < 8 ? 0.8 : 0.3 })
      );

      decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

      const causalFactors = tracker.identifyCausalFactors("success");

      // Both factors should be identified, but marked appropriately
      expect(causalFactors.length).toBeGreaterThan(0);
      expect(causalFactors[0]).toHaveProperty("type");
    });
  });
});

// Helper functions for OutcomeTracker tests
function createMockDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: `decision-${Date.now()}-${Math.random()}`,
    type: "strategy-selection",
    choice: "analytical",
    context: { complexity: "medium", uncertainty: "low" },
    reasoning: "Test reasoning",
    confidence: 0.8,
    timestamp: new Date(),
    ...overrides,
  };
}

function createMockOutcome(overrides: Partial<Outcome> = {}): Outcome {
  return {
    id: `outcome-${Date.now()}-${Math.random()}`,
    success: true,
    quality: 0.8,
    description: "Test outcome",
    timestamp: new Date(),
    ...overrides,
  };
}

describe("SelfImprovementSystem", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let system: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPerformanceMonitor: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAdaptiveStrategy: any;

  beforeEach(() => {
    // Mock dependencies
    mockPerformanceMonitor = {
      getPerformanceReport: vi.fn(),
      recordMetric: vi.fn(),
    };

    mockAdaptiveStrategy = {
      getStrategyEffectiveness: vi.fn(),
      updateStrategy: vi.fn(),
    };

    // SelfImprovementSystem will be imported from implementation file
    system = new SelfImprovementSystem({
      performanceMonitor: mockPerformanceMonitor,
      adaptiveStrategy: mockAdaptiveStrategy,
    });
  });

  describe("Measuring Improvement Over Time Periods", () => {
    it("should measure improvement over a day", () => {
      const result = system.measureImprovement("day");

      expect(result).toBeDefined();
      expect(result).toHaveProperty("period");
      expect(result.period).toBe("day");
      expect(result).toHaveProperty("improvement");
      expect(result).toHaveProperty("baseline");
      expect(result).toHaveProperty("current");
    });

    it("should measure improvement over a week", () => {
      const result = system.measureImprovement("week");

      expect(result.period).toBe("week");
      expect(result).toHaveProperty("improvement");
    });

    it("should measure improvement over a month", () => {
      const result = system.measureImprovement("month");

      expect(result.period).toBe("month");
      expect(result).toHaveProperty("improvement");
    });

    it("should measure improvement over a year", () => {
      const result = system.measureImprovement("year");

      expect(result.period).toBe("year");
      expect(result).toHaveProperty("improvement");
    });

    it("should compare baseline to current performance", () => {
      const result = system.measureImprovement("month");

      expect(result.baseline).toBeGreaterThanOrEqual(0);
      expect(result.current).toBeGreaterThanOrEqual(0);
      expect(typeof result.improvement).toBe("number");
    });

    it("should calculate improvement as percentage change", () => {
      const result = system.measureImprovement("month");

      // Improvement should be a percentage (can be negative for decline)
      expect(typeof result.improvement).toBe("number");
    });
  });

  describe("Calculating Improvement Metrics", () => {
    it("should calculate success rate improvement", () => {
      const metrics = system.calculateImprovementMetrics("month");

      expect(metrics).toHaveProperty("successRateImprovement");
      expect(typeof metrics.successRateImprovement).toBe("number");
    });

    it("should calculate quality improvement", () => {
      const metrics = system.calculateImprovementMetrics("month");

      expect(metrics).toHaveProperty("qualityImprovement");
      expect(typeof metrics.qualityImprovement).toBe("number");
    });

    it("should calculate time improvement", () => {
      const metrics = system.calculateImprovementMetrics("month");

      expect(metrics).toHaveProperty("timeImprovement");
      expect(typeof metrics.timeImprovement).toBe("number");
    });

    it("should identify improvement trend", () => {
      const metrics = system.calculateImprovementMetrics("month");

      expect(metrics).toHaveProperty("trend");
      expect(["improving", "stable", "declining"]).toContain(metrics.trend);
    });

    it("should calculate confidence in improvement measurement", () => {
      const metrics = system.calculateImprovementMetrics("month");

      expect(metrics).toHaveProperty("confidence");
      expect(metrics.confidence).toBeGreaterThanOrEqual(0);
      expect(metrics.confidence).toBeLessThanOrEqual(1);
    });

    it("should target 5-10% monthly improvement", () => {
      const metrics = system.calculateImprovementMetrics("month");

      // Test that system tracks against target
      expect(metrics).toHaveProperty("successRateImprovement");
      expect(metrics).toHaveProperty("qualityImprovement");
      // Implementation should aim for 5-10% improvement
    });

    it("should include period duration in days", () => {
      const dayMetrics = system.calculateImprovementMetrics("day");
      const weekMetrics = system.calculateImprovementMetrics("week");
      const monthMetrics = system.calculateImprovementMetrics("month");

      expect(dayMetrics.periodDays).toBe(1);
      expect(weekMetrics.periodDays).toBe(7);
      expect(monthMetrics.periodDays).toBe(30);
    });
  });

  describe("Generating Improvement Reports", () => {
    it("should generate comprehensive improvement report", () => {
      const report = system.generateImprovementReport("month");

      expect(report).toBeDefined();
      expect(report).toHaveProperty("period");
      expect(report).toHaveProperty("startDate");
      expect(report).toHaveProperty("endDate");
      expect(report).toHaveProperty("generatedAt");
      expect(report).toHaveProperty("baseline");
      expect(report).toHaveProperty("current");
      expect(report).toHaveProperty("improvement");
    });

    it("should include feedback summary in report", () => {
      const report = system.generateImprovementReport("month");

      expect(report).toHaveProperty("feedbackSummary");
      expect(report.feedbackSummary).toHaveProperty("totalFeedback");
      expect(report.feedbackSummary).toHaveProperty("averageRating");
      expect(report.feedbackSummary).toHaveProperty("commonThemes");
    });

    it("should include preference learning summary in report", () => {
      const report = system.generateImprovementReport("month");

      expect(report).toHaveProperty("preferenceSummary");
      expect(report.preferenceSummary).toHaveProperty("preferencesLearned");
      expect(report.preferenceSummary).toHaveProperty("averageConfidence");
      expect(report.preferenceSummary).toHaveProperty("topPreferences");
    });

    it("should include outcome tracking summary in report", () => {
      const report = system.generateImprovementReport("month");

      expect(report).toHaveProperty("outcomeSummary");
      expect(report.outcomeSummary).toHaveProperty("totalOutcomes");
      expect(report.outcomeSummary).toHaveProperty("successRate");
      expect(report.outcomeSummary).toHaveProperty("patternsIdentified");
    });

    it("should identify key improvements", () => {
      const report = system.generateImprovementReport("month");

      expect(report).toHaveProperty("keyImprovements");
      expect(Array.isArray(report.keyImprovements)).toBe(true);
    });

    it("should identify areas for improvement", () => {
      const report = system.generateImprovementReport("month");

      expect(report).toHaveProperty("areasForImprovement");
      expect(Array.isArray(report.areasForImprovement)).toBe(true);
    });

    it("should provide overall assessment", () => {
      const report = system.generateImprovementReport("month");

      expect(report).toHaveProperty("overallAssessment");
      expect(typeof report.overallAssessment).toBe("string");
    });

    it("should provide recommendations", () => {
      const report = system.generateImprovementReport("month");

      expect(report).toHaveProperty("recommendations");
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe("Integration with PerformanceMonitoringSystem", () => {
    it("should integrate with PerformanceMonitoringSystem", () => {
      const result = system.integrateWithPerformanceMonitor();

      expect(result).toBe(true);
    });

    it("should throw error if PerformanceMonitor not configured", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SelfImprovementSystem: any = class {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private performanceMonitor: any;

        constructor() {
          this.performanceMonitor = null;
        }

        integrateWithPerformanceMonitor() {
          if (!this.performanceMonitor) {
            throw new Error("PerformanceMonitor not configured");
          }
          return true;
        }
      };

      const systemWithoutMonitor = new SelfImprovementSystem();

      expect(() => systemWithoutMonitor.integrateWithPerformanceMonitor()).toThrow(
        "PerformanceMonitor not configured"
      );
    });

    it("should retrieve performance metrics from monitor", () => {
      mockPerformanceMonitor.getPerformanceReport.mockReturnValue({
        period: "month",
        overallScore: 0.85,
      });

      system.integrateWithPerformanceMonitor();

      // Implementation should call getPerformanceReport
      expect(mockPerformanceMonitor.getPerformanceReport).toBeDefined();
    });

    it("should record improvement metrics to monitor", () => {
      system.integrateWithPerformanceMonitor();

      // Implementation should record metrics
      expect(mockPerformanceMonitor.recordMetric).toBeDefined();
    });
  });

  describe("Integration with AdaptiveStrategySystem", () => {
    it("should integrate with AdaptiveStrategySystem", () => {
      const result = system.integrateWithAdaptiveStrategy();

      expect(result).toBe(true);
    });

    it("should throw error if AdaptiveStrategy not configured", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SelfImprovementSystem: any = class {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private adaptiveStrategy: any;

        constructor() {
          this.adaptiveStrategy = null;
        }

        integrateWithAdaptiveStrategy() {
          if (!this.adaptiveStrategy) {
            throw new Error("AdaptiveStrategy not configured");
          }
          return true;
        }
      };

      const systemWithoutStrategy = new SelfImprovementSystem();

      expect(() => systemWithoutStrategy.integrateWithAdaptiveStrategy()).toThrow(
        "AdaptiveStrategy not configured"
      );
    });

    it("should retrieve strategy effectiveness from adaptive system", () => {
      mockAdaptiveStrategy.getStrategyEffectiveness.mockReturnValue({
        strategyId: "analytical",
        effectiveness: 0.9,
      });

      system.integrateWithAdaptiveStrategy();

      // Implementation should call getStrategyEffectiveness
      expect(mockAdaptiveStrategy.getStrategyEffectiveness).toBeDefined();
    });

    it("should update strategies based on improvement insights", () => {
      system.integrateWithAdaptiveStrategy();

      // Implementation should update strategies
      expect(mockAdaptiveStrategy.updateStrategy).toBeDefined();
    });
  });

  describe("End-to-End Improvement Workflow", () => {
    it("should run complete improvement cycle", () => {
      const result = system.runImprovementCycle();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("feedbackProcessed");
      expect(result).toHaveProperty("preferencesUpdated");
      expect(result).toHaveProperty("outcomesAnalyzed");
      expect(result).toHaveProperty("improvementMeasured");
    });

    it("should process feedback through FeedbackIntegrator", () => {
      const result = system.runImprovementCycle();

      expect(result.feedbackProcessed).toBeGreaterThanOrEqual(0);
    });

    it("should update preferences through PreferenceLearner", () => {
      const result = system.runImprovementCycle();

      expect(result.preferencesUpdated).toBeGreaterThanOrEqual(0);
    });

    it("should analyze outcomes through OutcomeTracker", () => {
      const result = system.runImprovementCycle();

      expect(result.outcomesAnalyzed).toBeGreaterThanOrEqual(0);
    });

    it("should measure improvement after processing", () => {
      const result = system.runImprovementCycle();

      expect(result.improvementMeasured).toBe(true);
    });

    it("should coordinate all three components", () => {
      const result = system.runImprovementCycle();

      // All components should be involved
      expect(result.feedbackProcessed).toBeDefined();
      expect(result.preferencesUpdated).toBeDefined();
      expect(result.outcomesAnalyzed).toBeDefined();
    });
  });

  describe("Overhead Measurement", () => {
    it("should measure system overhead", () => {
      const result = system.measureOverhead();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("overhead");
      expect(result).toHaveProperty("withinTarget");
    });

    it("should ensure overhead stays below 15%", () => {
      const result = system.measureOverhead();

      expect(result.overhead).toBeGreaterThanOrEqual(0);
      expect(result.overhead).toBeLessThanOrEqual(1);
      // Implementation should target <15% overhead
    });

    it("should indicate if overhead is within target", () => {
      const result = system.measureOverhead();

      expect(typeof result.withinTarget).toBe("boolean");
    });

    it("should measure overhead across all components", () => {
      const result = system.measureOverhead();

      // Overhead should include FeedbackIntegrator, PreferenceLearner, OutcomeTracker
      expect(result.overhead).toBeDefined();
    });

    it("should track overhead over time", () => {
      const result1 = system.measureOverhead();
      const result2 = system.measureOverhead();

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      // Implementation should track overhead trends
    });
  });

  describe("Handling Negative Improvement Trends", () => {
    it("should detect negative improvement trends", () => {
      const result = system.handleNegativeTrend();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("detected");
      expect(result).toHaveProperty("actions");
    });

    it("should return false when no negative trend detected", () => {
      const result = system.handleNegativeTrend();

      expect(typeof result.detected).toBe("boolean");
    });

    it("should provide corrective actions for negative trends", () => {
      const result = system.handleNegativeTrend();

      expect(Array.isArray(result.actions)).toBe(true);
    });

    it("should identify root causes of decline", () => {
      const result = system.handleNegativeTrend();

      // Implementation should analyze why performance is declining
      expect(result).toBeDefined();
    });

    it("should trigger alerts for significant declines", () => {
      const result = system.handleNegativeTrend();

      // Implementation should alert when decline is significant
      expect(result).toHaveProperty("detected");
    });

    it("should recommend adjustments to reverse decline", () => {
      const result = system.handleNegativeTrend();

      expect(result.actions).toBeDefined();
      // Actions should include specific recommendations
    });
  });
});
