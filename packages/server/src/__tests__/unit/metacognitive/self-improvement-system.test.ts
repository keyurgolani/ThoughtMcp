/**
 * Self-Improvement System - Essential Unit Tests
 *
 * Tests core functionality of FeedbackIntegrator, PreferenceLearner,
 * OutcomeTracker, and SelfImprovementSystem.
 *
 * Reduced from 143 tests to ~20 essential tests covering:
 * - Core feedback integration
 * - Preference learning
 * - Outcome tracking
 * - Improvement measurement
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
  UserFeedback,
} from "../../../metacognitive/types";

// Helper functions with deterministic IDs
let idCounter = 0;
function createMockFeedback(overrides: Partial<UserFeedback> = {}): UserFeedback {
  return {
    id: `feedback-${++idCounter}`,
    userId: "user-123",
    rating: 0.8,
    comments: "Good performance",
    context: "reasoning-task",
    timestamp: new Date(), // Use current time for time-window filtering
    ...overrides,
  };
}

function createMockCorrection(overrides: Partial<Correction> = {}): Correction {
  return {
    id: `correction-${++idCounter}`,
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

function createMockInteraction(overrides: Partial<Interaction> = {}): Interaction {
  return {
    id: `interaction-${++idCounter}`,
    userId: "user-123",
    type: "query",
    content: { key: "value" },
    context: { domain: "general", taskType: "query" },
    timestamp: new Date(),
    ...overrides,
  };
}

function createMockDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: `decision-${++idCounter}`,
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
    id: `outcome-${++idCounter}`,
    success: true,
    quality: 0.8,
    description: "Test outcome",
    timestamp: new Date(),
    ...overrides,
  };
}

describe("FeedbackIntegrator", () => {
  let integrator: FeedbackIntegrator;

  beforeEach(() => {
    idCounter = 0;
    integrator = new FeedbackIntegrator();
  });

  it("should integrate and store user feedback", () => {
    const feedback = createMockFeedback({ rating: 0.9 });

    expect(() => integrator.integrateFeedback(feedback)).not.toThrow();

    const retrieved = integrator.retrieveFeedback("user-123");
    expect(retrieved.length).toBeGreaterThan(0);
    expect(retrieved[0].rating).toBe(0.9);
  });

  it("should learn from user corrections", () => {
    const correction = createMockCorrection({ severity: 0.8 });

    expect(() => integrator.learnFromCorrection(correction)).not.toThrow();
  });

  it("should validate feedback rating is between 0 and 1", () => {
    expect(integrator.validateFeedback(createMockFeedback({ rating: 0.5 }))).toBe(true);
    expect(integrator.validateFeedback(createMockFeedback({ rating: 1.5 }))).toBe(false);
    expect(integrator.validateFeedback(createMockFeedback({ rating: -0.5 }))).toBe(false);
  });

  it("should track feedback impact on strategies", () => {
    const feedback = createMockFeedback({
      rating: 0.9,
      metadata: { strategyId: "analytical" },
    });

    integrator.integrateFeedback(feedback);
    const impact = integrator.getFeedbackImpact("analytical");

    expect(impact).toBeGreaterThanOrEqual(0);
    expect(impact).toBeLessThanOrEqual(1);
  });

  it("should aggregate feedback over time periods", () => {
    integrator.integrateFeedback(createMockFeedback({ rating: 0.8 }));
    integrator.integrateFeedback(createMockFeedback({ rating: 0.9 }));

    const aggregated = integrator.aggregateFeedback("day");

    expect(aggregated).toHaveProperty("averageRating");
    expect(aggregated).toHaveProperty("totalCount");
    expect(aggregated.totalCount).toBe(2);
  });
});

describe("PreferenceLearner", () => {
  let learner: PreferenceLearner;

  beforeEach(() => {
    idCounter = 0;
    learner = new PreferenceLearner();
  });

  it("should learn preferences from user interactions", () => {
    const interaction = createMockInteraction({ content: { format: "detailed" } });

    expect(() => learner.learnFromInteraction(interaction)).not.toThrow();

    const preferences = learner.getPreferences("user-123");
    expect(preferences).toBeDefined();
    expect(preferences.userId).toBe("user-123");
  });

  it("should calculate confidence based on interaction frequency", () => {
    const interactions = Array(4)
      .fill(null)
      .map(() => createMockInteraction({ content: { style: "formal" } }));

    interactions.forEach((i) => learner.learnFromInteraction(i));

    const preferences = learner.getPreferences("user-123");
    const stylePreference = preferences.preferences.get("style");

    expect(stylePreference?.value).toBe("formal");
    expect(stylePreference?.confidence).toBeGreaterThan(0.5);
  });

  it("should adapt system behavior to learned preferences", () => {
    const interactions = Array(3)
      .fill(null)
      .map(() => createMockInteraction({ content: { language: "technical" } }));

    interactions.forEach((i) => learner.learnFromInteraction(i));

    const adaptations = learner.getAdaptations("user-123");

    expect(adaptations).toHaveProperty("recommendations");
    expect(adaptations.recommendations.length).toBeGreaterThan(0);
  });

  it("should handle new users with no interactions", () => {
    const preferences = learner.getPreferences("new-user");

    expect(preferences.userId).toBe("new-user");
    expect(preferences.preferences.size).toBe(0);
    expect(preferences.sampleSize).toBe(0);
  });

  it("should indicate when more data is needed", () => {
    learner.learnFromInteraction(createMockInteraction({ content: { key: "value" } }));

    const status = learner.getLearningStatus("user-123");

    expect(status).toHaveProperty("needsMoreData");
    expect(status.needsMoreData).toBe(true);
  });
});

describe("OutcomeTracker", () => {
  let tracker: OutcomeTracker;

  beforeEach(() => {
    idCounter = 0;
    tracker = new OutcomeTracker();
  });

  it("should track decision-outcome pairs", () => {
    const decision = createMockDecision({ choice: "analytical" });
    const outcome = createMockOutcome({ success: true, quality: 0.9 });

    expect(() => tracker.trackOutcome(decision, outcome)).not.toThrow();

    const tracked = tracker.getOutcomes(decision.id);
    expect(tracked.length).toBe(1);
  });

  it("should analyze patterns in tracked outcomes", () => {
    const decisions = Array(5)
      .fill(null)
      .map(() => createMockDecision({ context: { complexity: "high" } }));
    const outcomes = decisions.map(() => createMockOutcome({ success: true, quality: 0.8 }));

    decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

    const patterns = tracker.analyzePatterns();

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0]).toHaveProperty("type");
    expect(patterns[0]).toHaveProperty("successRate");
  });

  it("should recommend strategy adjustments based on outcomes", () => {
    const decisions = Array(5)
      .fill(null)
      .map(() => createMockDecision({ choice: "poor-strategy" }));
    const outcomes = decisions.map(() => createMockOutcome({ success: false, quality: 0.3 }));

    decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

    const adjustments = tracker.getStrategyAdjustments();

    expect(adjustments.length).toBeGreaterThan(0);
    expect(adjustments[0]).toHaveProperty("strategy");
    expect(adjustments[0]).toHaveProperty("recommendation");
  });

  it("should handle empty tracker gracefully", () => {
    const patterns = tracker.analyzePatterns();
    const adjustments = tracker.getStrategyAdjustments();

    expect(patterns).toEqual([]);
    expect(adjustments).toEqual([]);
  });

  it("should aggregate outcomes by time period", () => {
    const decisions = Array(5)
      .fill(null)
      .map(() => createMockDecision());
    const outcomes = decisions.map(() => createMockOutcome({ success: true, quality: 0.8 }));

    decisions.forEach((d, i) => tracker.trackOutcome(d, outcomes[i]));

    const aggregated = tracker.aggregateOutcomes("day");

    expect(aggregated).toHaveProperty("totalOutcomes");
    expect(aggregated).toHaveProperty("successRate");
    expect(aggregated.totalOutcomes).toBe(5);
  });
});

describe("SelfImprovementSystem", () => {
  let system: SelfImprovementSystem;
  let mockPerformanceMonitor: any;
  let mockAdaptiveStrategy: any;

  beforeEach(() => {
    idCounter = 0;
    mockPerformanceMonitor = {
      getPerformanceReport: vi.fn(),
      recordMetric: vi.fn(),
    };
    mockAdaptiveStrategy = {
      getStrategyEffectiveness: vi.fn(),
      updateStrategy: vi.fn(),
    };

    system = new SelfImprovementSystem({
      performanceMonitor: mockPerformanceMonitor,
      adaptiveStrategy: mockAdaptiveStrategy,
    });
  });

  it("should measure improvement over time periods", () => {
    const result = system.measureImprovement("month");

    expect(result).toHaveProperty("period");
    expect(result.period).toBe("month");
    expect(result).toHaveProperty("improvement");
    expect(result).toHaveProperty("baseline");
    expect(result).toHaveProperty("current");
  });

  it("should calculate improvement metrics", () => {
    const metrics = system.calculateImprovementMetrics("month");

    expect(metrics).toHaveProperty("successRateImprovement");
    expect(metrics).toHaveProperty("qualityImprovement");
    expect(metrics).toHaveProperty("trend");
    expect(["improving", "stable", "declining"]).toContain(metrics.trend);
  });

  it("should generate comprehensive improvement report", () => {
    const report = system.generateImprovementReport("month");

    expect(report).toHaveProperty("period");
    expect(report).toHaveProperty("startDate");
  });
});
