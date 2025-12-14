/**
 * Tests for Circumplex Emotion Analyzer
 *
 * Tests the circumplex model emotion detection system that analyzes text
 * across three dimensions: valence (-1 to +1), arousal (0 to 1), and
 * dominance (-1 to +1).
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { beforeEach, describe, expect, it } from "vitest";
import { CircumplexEmotionAnalyzer } from "../../../emotion/circumplex-analyzer";
import type { CircumplexState, EmotionModel } from "../../../emotion/types";

describe("CircumplexEmotionAnalyzer", () => {
  let analyzer: CircumplexEmotionAnalyzer;
  let mockModel: EmotionModel;

  beforeEach(() => {
    mockModel = {
      name: "lexicon-based",
      version: "1.0.0",
    };
    analyzer = new CircumplexEmotionAnalyzer(mockModel);
  });

  describe("Valence Detection", () => {
    it("should detect positive valence for happy text", () => {
      const text = "I'm so happy and excited about this wonderful opportunity!";
      const valence = analyzer.detectValence(text);

      expect(valence).toBeGreaterThan(0.5);
      expect(valence).toBeLessThanOrEqual(1);
    });

    it("should detect negative valence for sad text", () => {
      const text = "I'm so sad and disappointed about this terrible situation.";
      const valence = analyzer.detectValence(text);

      expect(valence).toBeLessThan(-0.5);
      expect(valence).toBeGreaterThanOrEqual(-1);
    });

    it("should detect neutral valence for factual text", () => {
      const text = "The meeting is scheduled for 3pm in conference room B.";
      const valence = analyzer.detectValence(text);

      expect(valence).toBeGreaterThanOrEqual(-0.3);
      expect(valence).toBeLessThanOrEqual(0.3);
    });

    it("should detect strong positive valence for very positive text", () => {
      const text = "I absolutely love this! It's amazing, wonderful, and fantastic!";
      const valence = analyzer.detectValence(text);

      expect(valence).toBeGreaterThan(0.7);
    });

    it("should detect strong negative valence for very negative text", () => {
      const text = "I hate this terrible, awful, horrible situation!";
      const valence = analyzer.detectValence(text);

      expect(valence).toBeLessThan(-0.7);
    });

    it("should handle empty string", () => {
      const valence = analyzer.detectValence("");

      expect(valence).toBe(0);
    });

    it("should handle text with special characters", () => {
      const text = "I'm happy!!! 😊 This is great!!!";
      const valence = analyzer.detectValence(text);

      expect(valence).toBeGreaterThan(0);
    });

    it("should handle very long text", () => {
      const longText = "I'm happy. ".repeat(100);
      const valence = analyzer.detectValence(longText);

      expect(valence).toBeGreaterThan(0);
      expect(valence).toBeLessThanOrEqual(1);
    });

    it("should return values within valid range", () => {
      const texts = ["I love this!", "I hate this!", "This is okay.", "Neutral statement."];

      texts.forEach((text) => {
        const valence = analyzer.detectValence(text);
        expect(valence).toBeGreaterThanOrEqual(-1);
        expect(valence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Arousal Detection", () => {
    it("should detect high arousal for intense emotions", () => {
      const text = "I'm absolutely furious and can't believe this is happening!";
      const arousal = analyzer.detectArousal(text);

      expect(arousal).toBeGreaterThan(0.7);
      expect(arousal).toBeLessThanOrEqual(1);
    });

    it("should detect low arousal for calm emotions", () => {
      const text = "I feel calm, relaxed, and peaceful about this.";
      const arousal = analyzer.detectArousal(text);

      expect(arousal).toBeLessThan(0.3);
      expect(arousal).toBeGreaterThanOrEqual(0);
    });

    it("should detect medium arousal for moderate emotions", () => {
      const text = "I'm somewhat concerned about this situation.";
      const arousal = analyzer.detectArousal(text);

      expect(arousal).toBeGreaterThanOrEqual(0.3);
      expect(arousal).toBeLessThanOrEqual(0.7);
    });

    it("should detect high arousal for excited text", () => {
      const text = "I'm so excited and thrilled! This is amazing!";
      const arousal = analyzer.detectArousal(text);

      expect(arousal).toBeGreaterThan(0.7);
    });

    it("should detect high arousal for angry text", () => {
      const text = "I'm extremely angry and outraged by this!";
      const arousal = analyzer.detectArousal(text);

      expect(arousal).toBeGreaterThan(0.7);
    });

    it("should detect low arousal for bored text", () => {
      const text = "I'm bored and uninterested in this.";
      const arousal = analyzer.detectArousal(text);

      expect(arousal).toBeLessThan(0.4);
    });

    it("should handle empty string", () => {
      const arousal = analyzer.detectArousal("");

      expect(arousal).toBe(0);
    });

    it("should handle monotone text", () => {
      const text = "The data shows a 5% increase in the quarterly report.";
      const arousal = analyzer.detectArousal(text);

      expect(arousal).toBeLessThan(0.3);
    });

    it("should detect arousal from intensity markers", () => {
      const text = "This is VERY IMPORTANT!!!";
      const arousal = analyzer.detectArousal(text);

      expect(arousal).toBeGreaterThan(0.5);
    });

    it("should return values within valid range", () => {
      const texts = ["I'm furious!", "I'm calm.", "I'm excited!", "I'm bored."];

      texts.forEach((text) => {
        const arousal = analyzer.detectArousal(text);
        expect(arousal).toBeGreaterThanOrEqual(0);
        expect(arousal).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Dominance Detection", () => {
    it("should detect high dominance for control statements", () => {
      const text = "I'm in complete control and confident about this decision.";
      const dominance = analyzer.detectDominance(text);

      expect(dominance).toBeGreaterThan(0.5);
      expect(dominance).toBeLessThanOrEqual(1);
    });

    it("should detect low dominance for helpless statements", () => {
      const text = "I feel helpless and powerless in this situation.";
      const dominance = analyzer.detectDominance(text);

      expect(dominance).toBeLessThan(-0.5);
      expect(dominance).toBeGreaterThanOrEqual(-1);
    });

    it("should detect neutral dominance for neutral statements", () => {
      const text = "Things are happening as expected.";
      const dominance = analyzer.detectDominance(text);

      expect(dominance).toBeGreaterThanOrEqual(-0.3);
      expect(dominance).toBeLessThanOrEqual(0.3);
    });

    it("should detect high dominance for powerful text", () => {
      const text = "I command this situation and have full authority.";
      const dominance = analyzer.detectDominance(text);

      expect(dominance).toBeGreaterThan(0.6);
    });

    it("should detect low dominance for submissive text", () => {
      const text = "I'm weak and unable to influence anything.";
      const dominance = analyzer.detectDominance(text);

      expect(dominance).toBeLessThan(-0.5);
    });

    it("should handle empty string", () => {
      const dominance = analyzer.detectDominance("");

      expect(dominance).toBe(0);
    });

    it("should handle ambiguous control statements", () => {
      const text = "I might be able to do something about this.";
      const dominance = analyzer.detectDominance(text);

      expect(dominance).toBeGreaterThanOrEqual(-0.5);
      expect(dominance).toBeLessThanOrEqual(0.5);
    });

    it("should return values within valid range", () => {
      const texts = ["I'm in control!", "I'm powerless.", "I can handle this.", "I'm helpless."];

      texts.forEach((text) => {
        const dominance = analyzer.detectDominance(text);
        expect(dominance).toBeGreaterThanOrEqual(-1);
        expect(dominance).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Combined Circumplex Analysis", () => {
    it("should return all three dimensions", () => {
      const text = "I'm excited and confident about taking control of this!";
      const state = analyzer.analyzeCircumplex(text);

      expect(state).toHaveProperty("valence");
      expect(state).toHaveProperty("arousal");
      expect(state).toHaveProperty("dominance");
      expect(state).toHaveProperty("confidence");
      expect(state).toHaveProperty("timestamp");
    });

    it("should return consistent dimensions with individual methods", () => {
      const text = "I'm happy and excited!";
      const state = analyzer.analyzeCircumplex(text);
      const valence = analyzer.detectValence(text);
      const arousal = analyzer.detectArousal(text);
      const dominance = analyzer.detectDominance(text);

      expect(state.valence).toBe(valence);
      expect(state.arousal).toBe(arousal);
      expect(state.dominance).toBe(dominance);
    });

    it("should calculate confidence score", () => {
      const text = "I'm very happy and excited!";
      const state = analyzer.analyzeCircumplex(text);

      expect(state.confidence).toBeGreaterThanOrEqual(0);
      expect(state.confidence).toBeLessThanOrEqual(1);
    });

    it("should return higher confidence for clear emotional text", () => {
      const clearText = "I'm absolutely thrilled and ecstatic!";
      const ambiguousText = "I guess this is okay maybe.";

      const clearState = analyzer.analyzeCircumplex(clearText);
      const ambiguousState = analyzer.analyzeCircumplex(ambiguousText);

      expect(clearState.confidence).toBeGreaterThan(ambiguousState.confidence);
    });

    it("should include timestamp", () => {
      const text = "I'm happy!";
      const state = analyzer.analyzeCircumplex(text);

      expect(state.timestamp).toBeInstanceOf(Date);
    });

    it("should be consistent across multiple calls with same input", () => {
      const text = "I'm happy and excited!";
      const state1 = analyzer.analyzeCircumplex(text);
      const state2 = analyzer.analyzeCircumplex(text);

      expect(state1.valence).toBe(state2.valence);
      expect(state1.arousal).toBe(state2.arousal);
      expect(state1.dominance).toBe(state2.dominance);
    });

    it("should handle complex emotional text", () => {
      const text = "I'm frustrated but determined to overcome this challenge with confidence.";
      const state = analyzer.analyzeCircumplex(text);

      expect(state.valence).toBeGreaterThanOrEqual(-1);
      expect(state.valence).toBeLessThanOrEqual(1);
      expect(state.arousal).toBeGreaterThanOrEqual(0);
      expect(state.arousal).toBeLessThanOrEqual(1);
      expect(state.dominance).toBeGreaterThanOrEqual(-1);
      expect(state.dominance).toBeLessThanOrEqual(1);
    });
  });

  describe("Confidence Scoring", () => {
    it("should calculate confidence based on emotional clarity", () => {
      const clearState: CircumplexState = {
        valence: 0.9,
        arousal: 0.8,
        dominance: 0.7,
        confidence: 0,
        timestamp: new Date(),
      };

      const confidence = analyzer.calculateConfidence(clearState);

      expect(confidence).toBeGreaterThan(0.5);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it("should return lower confidence for neutral emotions", () => {
      const neutralState: CircumplexState = {
        valence: 0.1,
        arousal: 0.1,
        dominance: 0.1,
        confidence: 0,
        timestamp: new Date(),
      };

      const confidence = analyzer.calculateConfidence(neutralState);

      expect(confidence).toBeLessThan(0.5);
    });

    it("should return confidence between 0 and 1", () => {
      const states: CircumplexState[] = [
        {
          valence: 0.9,
          arousal: 0.8,
          dominance: 0.7,
          confidence: 0,
          timestamp: new Date(),
        },
        {
          valence: -0.9,
          arousal: 0.8,
          dominance: -0.7,
          confidence: 0,
          timestamp: new Date(),
        },
        {
          valence: 0.1,
          arousal: 0.1,
          dominance: 0.1,
          confidence: 0,
          timestamp: new Date(),
        },
      ];

      states.forEach((state) => {
        const confidence = analyzer.calculateConfidence(state);
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Performance", () => {
    it("should complete analysis within 200ms for typical text", () => {
      const text = "I'm happy and excited about this wonderful opportunity!";
      const startTime = Date.now();

      analyzer.analyzeCircumplex(text);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200);
    });

    it("should complete analysis within 200ms for long text", () => {
      const longText = "I'm happy and excited! ".repeat(50);
      const startTime = Date.now();

      analyzer.analyzeCircumplex(longText);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200);
    });

    it("should handle multiple analyses efficiently", () => {
      const texts = ["I'm happy!", "I'm sad.", "I'm excited!", "I'm calm.", "I'm confident!"];

      const startTime = Date.now();

      texts.forEach((text) => {
        analyzer.analyzeCircumplex(text);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 5 analyses in under 1 second
      expect(duration).toBeLessThan(1000);
    });
  });

  describe("Caching", () => {
    it("should cache results for repeated text", () => {
      const text = "I'm happy and excited!";

      // First call
      const state1 = analyzer.analyzeCircumplex(text);

      // Second call should use cache
      const startTime = Date.now();
      const state2 = analyzer.analyzeCircumplex(text);
      const duration = Date.now() - startTime;

      expect(state1.valence).toBe(state2.valence);
      expect(state1.arousal).toBe(state2.arousal);
      expect(state1.dominance).toBe(state2.dominance);
      // Cached call should be very fast
      expect(duration).toBeLessThan(10);
    });

    it("should return different results for different text", () => {
      const text1 = "I'm happy!";
      const text2 = "I'm sad.";

      const state1 = analyzer.analyzeCircumplex(text1);
      const state2 = analyzer.analyzeCircumplex(text2);

      expect(state1.valence).not.toBe(state2.valence);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string gracefully", () => {
      const state = analyzer.analyzeCircumplex("");

      expect(state.valence).toBe(0);
      expect(state.arousal).toBe(0);
      expect(state.dominance).toBe(0);
      expect(state.confidence).toBeGreaterThanOrEqual(0);
    });

    it("should handle whitespace-only string", () => {
      const state = analyzer.analyzeCircumplex("   \n\t  ");

      expect(state.valence).toBe(0);
      expect(state.arousal).toBe(0);
      expect(state.dominance).toBe(0);
    });

    it("should handle text with only punctuation", () => {
      const state = analyzer.analyzeCircumplex("!!! ??? ...");

      expect(state.valence).toBeGreaterThanOrEqual(-1);
      expect(state.valence).toBeLessThanOrEqual(1);
      expect(state.arousal).toBeGreaterThanOrEqual(0);
      expect(state.arousal).toBeLessThanOrEqual(1);
    });

    it("should handle text with numbers", () => {
      const text = "I'm 100% happy about this 5-star experience!";
      const state = analyzer.analyzeCircumplex(text);

      expect(state.valence).toBeGreaterThan(0);
    });

    it("should handle mixed case text", () => {
      const text = "I'm VERY HaPpY aBouT ThIs!";
      const state = analyzer.analyzeCircumplex(text);

      expect(state.valence).toBeGreaterThan(0);
      expect(state.arousal).toBeGreaterThan(0);
    });

    it("should handle text with URLs and emails", () => {
      const text = "Contact me at test@example.com or visit https://example.com";
      const state = analyzer.analyzeCircumplex(text);

      expect(state).toHaveProperty("valence");
      expect(state).toHaveProperty("arousal");
      expect(state).toHaveProperty("dominance");
    });
  });
});
