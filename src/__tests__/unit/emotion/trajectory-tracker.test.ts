/**
 * Tests for EmotionalTrajectoryTracker
 */

import { beforeEach, describe, expect, it } from "vitest";
import { EmotionalTrajectoryTracker } from "../../../emotion/trajectory-tracker";
import type { CircumplexState } from "../../../emotion/types";

describe("EmotionalTrajectoryTracker", () => {
  let tracker: EmotionalTrajectoryTracker;

  beforeEach(() => {
    tracker = new EmotionalTrajectoryTracker();
  });

  const createState = (
    valence: number,
    arousal: number,
    dominance: number,
    timestamp?: Date
  ): CircumplexState => ({
    valence,
    arousal,
    dominance,
    confidence: 0.8,
    timestamp: timestamp || new Date(),
  });

  describe("trackEmotionalState", () => {
    it("should track a new emotional state", () => {
      const state = createState(0.5, 0.6, 0.3);
      tracker.trackEmotionalState(state);

      const history = tracker.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(state);
    });

    it("should track multiple states", () => {
      tracker.trackEmotionalState(createState(0.5, 0.6, 0.3));
      tracker.trackEmotionalState(createState(0.3, 0.4, 0.2));
      tracker.trackEmotionalState(createState(0.7, 0.8, 0.5));

      expect(tracker.getHistory()).toHaveLength(3);
    });

    it("should track trigger when significant shift occurs", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.8, 0.9, 0.7), "good_news");

      const triggers = tracker.identifyTriggers();
      expect(triggers).toHaveLength(1);
      expect(triggers[0].trigger).toBe("good_news");
    });

    it("should not track trigger when shift is below threshold", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.1, 0.1, 0.1), "minor_event");

      const triggers = tracker.identifyTriggers();
      expect(triggers).toHaveLength(0);
    });

    it("should validate state values", () => {
      expect(() => {
        tracker.trackEmotionalState(createState(2.0, 0.5, 0.0));
      }).toThrow("Valence must be between -1 and 1");

      expect(() => {
        tracker.trackEmotionalState(createState(0.0, 2.0, 0.0));
      }).toThrow("Arousal must be between 0 and 1");

      expect(() => {
        tracker.trackEmotionalState(createState(0.0, 0.5, 2.0));
      }).toThrow("Dominance must be between -1 and 1");
    });

    it("should reject NaN values", () => {
      expect(() => {
        tracker.trackEmotionalState(createState(NaN, 0.5, 0.0));
      }).toThrow("State values cannot be NaN");
    });
  });

  describe("getHistory", () => {
    it("should return empty array when no states tracked", () => {
      expect(tracker.getHistory()).toEqual([]);
    });

    it("should return all states when no limit specified", () => {
      tracker.trackEmotionalState(createState(0.5, 0.6, 0.3));
      tracker.trackEmotionalState(createState(0.3, 0.4, 0.2));
      tracker.trackEmotionalState(createState(0.7, 0.8, 0.5));

      expect(tracker.getHistory()).toHaveLength(3);
    });

    it("should return limited states when limit specified", () => {
      tracker.trackEmotionalState(createState(0.5, 0.6, 0.3));
      tracker.trackEmotionalState(createState(0.3, 0.4, 0.2));
      tracker.trackEmotionalState(createState(0.7, 0.8, 0.5));

      const limited = tracker.getHistory(2);
      expect(limited).toHaveLength(2);
      expect(limited[0].valence).toBe(0.3);
      expect(limited[1].valence).toBe(0.7);
    });
  });

  describe("clearHistory", () => {
    it("should clear all tracked states", () => {
      tracker.trackEmotionalState(createState(0.5, 0.6, 0.3));
      tracker.trackEmotionalState(createState(0.3, 0.4, 0.2));

      tracker.clearHistory();

      expect(tracker.getHistory()).toHaveLength(0);
    });

    it("should clear all triggers", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.8, 0.9, 0.7), "trigger1");

      tracker.clearHistory();

      expect(tracker.identifyTriggers()).toHaveLength(0);
    });
  });

  describe("getStatistics", () => {
    it("should return zero statistics for empty history", () => {
      const stats = tracker.getStatistics();

      expect(stats.totalStates).toBe(0);
      expect(stats.averageValence).toBe(0);
      expect(stats.averageArousal).toBe(0);
      expect(stats.averageDominance).toBe(0);
      expect(stats.volatility).toBe(0);
      expect(stats.timeSpan).toBe(0);
    });

    it("should calculate correct averages", () => {
      tracker.trackEmotionalState(createState(0.5, 0.6, 0.3));
      tracker.trackEmotionalState(createState(0.3, 0.4, 0.2));
      tracker.trackEmotionalState(createState(0.7, 0.8, 0.5));

      const stats = tracker.getStatistics();

      expect(stats.totalStates).toBe(3);
      expect(stats.averageValence).toBeCloseTo(0.5, 1);
      expect(stats.averageArousal).toBeCloseTo(0.6, 1);
      expect(stats.averageDominance).toBeCloseTo(0.333, 1);
    });

    it("should calculate volatility", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(1.0, 1.0, 1.0));
      tracker.trackEmotionalState(createState(-1.0, 0.0, -1.0));

      const stats = tracker.getStatistics();

      expect(stats.volatility).toBeGreaterThan(0);
    });

    it("should calculate time span", () => {
      const now = new Date();
      const later = new Date(now.getTime() + 5000);

      tracker.trackEmotionalState(createState(0.5, 0.6, 0.3, now));
      tracker.trackEmotionalState(createState(0.3, 0.4, 0.2, later));

      const stats = tracker.getStatistics();

      expect(stats.timeSpan).toBe(5000);
    });
  });

  describe("detectEmotionalShift", () => {
    it("should detect shift above threshold", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.8, 0.9, 0.7));

      const shift = tracker.detectEmotionalShift(0.3);

      expect(shift).not.toBeNull();
      expect(shift?.magnitude).toBeGreaterThan(0.3);
    });

    it("should not detect shift below threshold", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.1, 0.1, 0.1));

      const shift = tracker.detectEmotionalShift(0.5);

      expect(shift).toBeNull();
    });

    it("should return null with insufficient history", () => {
      tracker.trackEmotionalState(createState(0.5, 0.6, 0.3));

      const shift = tracker.detectEmotionalShift(0.3);

      expect(shift).toBeNull();
    });

    it("should validate threshold", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.8, 0.9, 0.7));

      expect(() => {
        tracker.detectEmotionalShift(-0.1);
      }).toThrow("Threshold must be between 0 and 1");

      expect(() => {
        tracker.detectEmotionalShift(1.5);
      }).toThrow("Threshold must be between 0 and 1");
    });
  });

  describe("recognizePatterns", () => {
    it("should return empty array with insufficient history", () => {
      tracker.trackEmotionalState(createState(0.5, 0.6, 0.3));
      tracker.trackEmotionalState(createState(0.3, 0.4, 0.2));

      const patterns = tracker.recognizePatterns();

      expect(patterns).toEqual([]);
    });

    it("should detect recurring pattern", () => {
      // Create similar states multiple times
      tracker.trackEmotionalState(createState(0.5, 0.6, 0.3));
      tracker.trackEmotionalState(createState(0.52, 0.58, 0.32));
      tracker.trackEmotionalState(createState(0.48, 0.62, 0.28));

      const patterns = tracker.recognizePatterns();

      const recurring = patterns.find((p) => p.type === "recurring");
      expect(recurring).toBeDefined();
      expect(recurring?.frequency).toBeGreaterThanOrEqual(3);
    });

    it("should detect progressive pattern", () => {
      // Create gradually improving states
      tracker.trackEmotionalState(createState(-0.5, 0.3, -0.2));
      tracker.trackEmotionalState(createState(0.0, 0.5, 0.1));
      tracker.trackEmotionalState(createState(0.5, 0.7, 0.4));

      const patterns = tracker.recognizePatterns();

      const progressive = patterns.find((p) => p.type === "progressive");
      expect(progressive).toBeDefined();
      expect(progressive?.description).toContain("improving");
    });

    it("should detect declining progressive pattern", () => {
      // Create gradually declining states
      tracker.trackEmotionalState(createState(0.5, 0.7, 0.4));
      tracker.trackEmotionalState(createState(0.0, 0.5, 0.1));
      tracker.trackEmotionalState(createState(-0.5, 0.3, -0.2));

      const patterns = tracker.recognizePatterns();

      const progressive = patterns.find((p) => p.type === "progressive");
      expect(progressive).toBeDefined();
      expect(progressive?.description).toContain("declining");
    });

    it("should detect reactive pattern", () => {
      // Create rapid changes
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(1.0, 1.0, 1.0));
      tracker.trackEmotionalState(createState(-1.0, 0.0, -1.0));

      const patterns = tracker.recognizePatterns();

      const reactive = patterns.find((p) => p.type === "reactive");
      expect(reactive).toBeDefined();
      expect(reactive?.description).toContain("rapid changes");
    });
  });

  describe("identifyTriggers", () => {
    it("should return empty array when no triggers tracked", () => {
      tracker.trackEmotionalState(createState(0.5, 0.6, 0.3));

      const triggers = tracker.identifyTriggers();

      expect(triggers).toEqual([]);
    });

    it("should identify trigger with correct properties", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.8, 0.9, 0.7), "good_news");

      const triggers = tracker.identifyTriggers();

      expect(triggers).toHaveLength(1);
      expect(triggers[0].trigger).toBe("good_news");
      expect(triggers[0].frequency).toBe(1);
      expect(triggers[0].averageIntensity).toBeGreaterThan(0);
      expect(triggers[0].lastOccurrence).toBeInstanceOf(Date);
    });

    it("should track multiple occurrences of same trigger", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.8, 0.9, 0.7), "trigger1");
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.7, 0.8, 0.6), "trigger1");

      const triggers = tracker.identifyTriggers();

      expect(triggers).toHaveLength(1);
      expect(triggers[0].frequency).toBe(2);
    });

    it("should track different emotion types for different triggers", () => {
      // Joy trigger (high valence, high arousal)
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.8, 0.9, 0.5), "joy_trigger");

      // Anger trigger (low valence, high arousal)
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(-0.8, 0.9, 0.5), "anger_trigger");

      const triggers = tracker.identifyTriggers();

      expect(triggers).toHaveLength(2);
      expect(triggers.find((t) => t.trigger === "joy_trigger")?.emotionType).toBe("joy");
      expect(triggers.find((t) => t.trigger === "anger_trigger")?.emotionType).toBe("anger");
    });
  });

  describe("generateTrajectoryInsights", () => {
    it("should return empty array with insufficient history", () => {
      tracker.trackEmotionalState(createState(0.5, 0.6, 0.3));
      tracker.trackEmotionalState(createState(0.3, 0.4, 0.2));

      const insights = tracker.generateTrajectoryInsights();

      expect(insights).toEqual([]);
    });

    it("should generate trend insight for improving emotions", () => {
      tracker.trackEmotionalState(createState(-0.5, 0.3, -0.2));
      tracker.trackEmotionalState(createState(0.0, 0.5, 0.1));
      tracker.trackEmotionalState(createState(0.5, 0.7, 0.4));

      const insights = tracker.generateTrajectoryInsights();

      const trendInsight = insights.find((i) => i.type === "trend");
      expect(trendInsight).toBeDefined();
      expect(trendInsight?.description).toContain("improving");
    });

    it("should generate trend insight for declining emotions with recommendation", () => {
      tracker.trackEmotionalState(createState(0.5, 0.7, 0.4));
      tracker.trackEmotionalState(createState(0.0, 0.5, 0.1));
      tracker.trackEmotionalState(createState(-0.5, 0.3, -0.2));

      const insights = tracker.generateTrajectoryInsights();

      const trendInsight = insights.find((i) => i.type === "trend");
      expect(trendInsight).toBeDefined();
      expect(trendInsight?.description).toContain("declining");
      expect(trendInsight?.recommendation).toBeDefined();
    });

    it("should generate volatility insight", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(1.0, 1.0, 1.0));
      tracker.trackEmotionalState(createState(-1.0, 0.0, -1.0));

      const insights = tracker.generateTrajectoryInsights();

      const volatilityInsight = insights.find((i) => i.type === "volatility");
      expect(volatilityInsight).toBeDefined();
      expect(volatilityInsight?.description).toContain("volatile");
    });

    it("should generate stability insight", () => {
      tracker.trackEmotionalState(createState(0.5, 0.6, 0.3));
      tracker.trackEmotionalState(createState(0.52, 0.58, 0.32));
      tracker.trackEmotionalState(createState(0.48, 0.62, 0.28));

      const insights = tracker.generateTrajectoryInsights();

      const stabilityInsight = insights.find((i) => i.type === "stability");
      expect(stabilityInsight).toBeDefined();
      expect(stabilityInsight?.description).toContain("stable");
    });

    it("should generate recovery insight", () => {
      tracker.trackEmotionalState(createState(-0.5, 0.3, -0.2));
      tracker.trackEmotionalState(createState(-0.2, 0.4, 0.0));
      tracker.trackEmotionalState(createState(0.2, 0.6, 0.3));
      tracker.trackEmotionalState(createState(0.5, 0.7, 0.5));

      const insights = tracker.generateTrajectoryInsights();

      const recoveryInsight = insights.find((i) => i.type === "recovery");
      expect(recoveryInsight).toBeDefined();
      expect(recoveryInsight?.description).toContain("recovering");
      expect(recoveryInsight?.recommendation).toBeDefined();
    });

    it("should not generate recovery insight for inconsistent recovery", () => {
      tracker.trackEmotionalState(createState(-0.5, 0.3, -0.2));
      tracker.trackEmotionalState(createState(0.0, 0.4, 0.0));
      tracker.trackEmotionalState(createState(-0.3, 0.5, -0.1)); // Dip
      tracker.trackEmotionalState(createState(0.5, 0.7, 0.5));

      const insights = tracker.generateTrajectoryInsights();

      const recoveryInsight = insights.find((i) => i.type === "recovery");
      expect(recoveryInsight).toBeUndefined();
    });
  });

  describe("predictEmotionalTrend", () => {
    it("should throw error with empty history", () => {
      expect(() => {
        tracker.predictEmotionalTrend();
      }).toThrow("Cannot predict trend with empty history");
    });

    it("should return same state with single state history", () => {
      const state = createState(0.5, 0.6, 0.3);
      tracker.trackEmotionalState(state);

      const prediction = tracker.predictEmotionalTrend();

      expect(prediction.valence).toBe(state.valence);
      expect(prediction.arousal).toBe(state.arousal);
      expect(prediction.dominance).toBe(state.dominance);
    });

    it("should predict upward trend", () => {
      tracker.trackEmotionalState(createState(-0.5, 0.3, -0.2));
      tracker.trackEmotionalState(createState(0.0, 0.5, 0.1));
      tracker.trackEmotionalState(createState(0.5, 0.7, 0.4));

      const prediction = tracker.predictEmotionalTrend();

      expect(prediction.valence).toBeGreaterThan(0.5);
    });

    it("should predict downward trend", () => {
      tracker.trackEmotionalState(createState(0.5, 0.7, 0.4));
      tracker.trackEmotionalState(createState(0.0, 0.5, 0.1));
      tracker.trackEmotionalState(createState(-0.5, 0.3, -0.2));

      const prediction = tracker.predictEmotionalTrend();

      expect(prediction.valence).toBeLessThan(-0.5);
    });

    it("should clamp predictions to valid ranges", () => {
      // Create extreme upward trend
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.5, 0.5, 0.5));
      tracker.trackEmotionalState(createState(1.0, 1.0, 1.0));

      const prediction = tracker.predictEmotionalTrend();

      expect(prediction.valence).toBeLessThanOrEqual(1.0);
      expect(prediction.arousal).toBeLessThanOrEqual(1.0);
      expect(prediction.dominance).toBeLessThanOrEqual(1.0);
    });

    it("should calculate confidence based on volatility", () => {
      // Stable trend
      tracker.trackEmotionalState(createState(0.0, 0.5, 0.0));
      tracker.trackEmotionalState(createState(0.1, 0.5, 0.1));
      tracker.trackEmotionalState(createState(0.2, 0.5, 0.2));

      const prediction = tracker.predictEmotionalTrend();

      expect(prediction.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("inferEmotionType", () => {
    it("should infer joy for high valence and high arousal", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.8, 0.9, 0.5), "joy_trigger");

      const triggers = tracker.identifyTriggers();
      expect(triggers[0].emotionType).toBe("joy");
    });

    it("should infer anger for low valence and high arousal", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(-0.8, 0.9, 0.5), "anger_trigger");

      const triggers = tracker.identifyTriggers();
      expect(triggers[0].emotionType).toBe("anger");
    });

    it("should infer sadness for low valence and low arousal", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(-0.8, 0.3, -0.5), "sadness_trigger");

      const triggers = tracker.identifyTriggers();
      expect(triggers[0].emotionType).toBe("sadness");
    });

    it("should infer gratitude for high valence and low arousal", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.8, 0.3, 0.5), "gratitude_trigger");

      const triggers = tracker.identifyTriggers();
      expect(triggers[0].emotionType).toBe("gratitude");
    });

    it("should infer surprise for very high arousal", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.0, 0.9, 0.0), "surprise_trigger");

      const triggers = tracker.identifyTriggers();
      expect(triggers[0].emotionType).toBe("surprise");
    });

    it("should infer fear as default for neutral states", () => {
      tracker.trackEmotionalState(createState(0.0, 0.0, 0.0));
      tracker.trackEmotionalState(createState(0.1, 0.4, 0.1), "fear_trigger");

      const triggers = tracker.identifyTriggers();
      expect(triggers[0].emotionType).toBe("fear");
    });
  });
});
