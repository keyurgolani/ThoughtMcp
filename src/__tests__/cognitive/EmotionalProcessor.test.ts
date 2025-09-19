/**
 * Unit tests for EmotionalProcessor
 * Tests emotional assessment, state tracking, somatic markers, and reasoning modulation
 */

import { beforeEach, describe, expect, it } from "vitest";
import { EmotionalProcessor } from "../../cognitive/EmotionalProcessor.js";
import {
  EmotionalState,
  ReasoningStep,
  ReasoningType,
} from "../../types/core.js";

describe("EmotionalProcessor", () => {
  let processor: EmotionalProcessor;

  beforeEach(async () => {
    processor = new EmotionalProcessor();
    await processor.initialize({});
  });

  describe("Initialization", () => {
    it("should initialize with neutral emotional state", () => {
      const state = processor.getCurrentEmotionalState();
      expect(state.valence).toBe(0.0);
      expect(state.arousal).toBe(0.5);
      expect(state.dominance).toBe(0.5);
      expect(state.specific_emotions.size).toBe(0);
    });

    it("should initialize with correct status", () => {
      const status = processor.getStatus();
      expect(status.name).toBe("EmotionalProcessor");
      expect(status.initialized).toBe(true);
      expect(status.active).toBe(true);
    });

    it("should accept configuration parameters", async () => {
      const newProcessor = new EmotionalProcessor();
      await newProcessor.initialize({
        decay_rate: 0.1,
        history_size: 100,
        modulation_strength: 0.5,
      });

      const status = newProcessor.getStatus();
      expect(status.initialized).toBe(true);
    });
  });

  describe("Emotional Assessment", () => {
    it("shouldsitive emotions correctly", () => {
      const result = processor.assessEmotion(
        "I am very happy and excited today!"
      );

      expect(result.valence).toBeGreaterThan(0.5);
      expect(result.arousal).toBeGreaterThan(0.6);
      expect(result.specific_emotions.has("joy")).toBe(true);
      expect(result.specific_emotions.has("excitement")).toBe(true);
    });

    it("should assess negative emotions correctly", () => {
      const result = processor.assessEmotion(
        "I feel sad and worried about this situation"
      );

      expect(result.valence).toBeLessThan(-0.3);
      expect(result.specific_emotions.has("sadness")).toBe(true);
      expect(result.specific_emotions.has("worry")).toBe(true);
    });

    it("should handle neutral content", () => {
      const result = processor.assessEmotion("The weather is cloudy today");

      expect(result.valence).toBeCloseTo(0, 1);
      expect(result.arousal).toBeCloseTo(0.5, 1);
      expect(result.dominance).toBeCloseTo(0.5, 1);
    });

    it("should detect negation and adjust valence", () => {
      const positive = processor.assessEmotion("I am happy");
      const negated = processor.assessEmotion("I am not happy");

      expect(negated.valence).toBeLessThan(positive.valence);
    });

    it("should detect intensifiers and increase arousal", () => {
      const normal = processor.assessEmotion("I am happy");
      const intensified = processor.assessEmotion("I am very extremely happy");

      expect(intensified.arousal).toBeGreaterThan(normal.arousal);
    });

    it("should handle punctuation effects", () => {
      const question = processor.assessEmotion("Are you happy?");
      const exclamation = processor.assessEmotion("I am happy!");
      const normal = processor.assessEmotion("I am happy");

      expect(question.dominance).toBeLessThan(normal.dominance);
      expect(exclamation.arousal).toBeGreaterThan(normal.arousal);
      expect(exclamation.dominance).toBeGreaterThan(normal.dominance);
    });
  });

  describe("Emotional State Management", () => {
    it("should update emotional state correctly", () => {
      const newState: Partial<EmotionalState> = {
        valence: 0.8,
        arousal: 0.7,
        specific_emotions: new Map([["joy", 0.9]]),
      };

      processor.updateEmotionalState(newState);
      const currentState = processor.getCurrentEmotionalState();

      expect(currentState.valence).toBeCloseTo(0.24, 1); // 0 * 0.7 + 0.8 * 0.3
      expect(currentState.arousal).toBeCloseTo(0.56, 1); // 0.5 * 0.7 + 0.7 * 0.3
      expect(currentState.specific_emotions.has("joy")).toBe(true);
    });

    it("should maintain emotional history", () => {
      const initialState = processor.getCurrentEmotionalState();

      processor.updateEmotionalState({ valence: 0.5 });
      processor.updateEmotionalState({ valence: -0.3 });

      const trajectory = processor.getEmotionalTrajectory();
      expect(trajectory.valence_trend).toBeDefined();
      expect(trajectory.stability).toBeDefined();
    });

    it("should apply emotional decay over time", async () => {
      processor.updateEmotionalState({
        valence: 0.8,
        specific_emotions: new Map([["joy", 0.9]]),
      });

      // Process neutral input to trigger decay
      await processor.process("neutral text");

      const state = processor.getCurrentEmotionalState();
      expect(state.valence).toBeLessThan(0.24); // Should decay from integrated value
    });

    it("should limit history size", () => {
      // Add many state updates
      for (let i = 0; i < 60; i++) {
        processor.updateEmotionalState({ valence: i * 0.01 });
      }

      const trajectory = processor.getEmotionalTrajectory();
      expect(trajectory).toBeDefined(); // Should not crash with large history
    });
  });

  describe("Somatic Marker System", () => {
    it("should apply somatic markers to decision options", () => {
      const options = [
        "take a safe approach",
        "try a risky strategy",
        "use a creative solution",
      ];

      const markers = processor.applySomaticMarkers(options);

      expect(markers).toHaveLength(3);
      expect(markers[0].option).toBe(options[0]);
      expect(markers[0].emotional_value).toBeDefined();
      expect(markers[0].confidence).toBeGreaterThan(0);
      expect(markers[0].source).toBeDefined();
    });

    it("should provide different emotional values for different patterns", () => {
      const safeOption = ["choose the safe option"];
      const riskyOption = ["take a big risk"];

      const safeMarkers = processor.applySomaticMarkers(safeOption);
      const riskyMarkers = processor.applySomaticMarkers(riskyOption);

      // Safe options should generally have more positive emotional value
      expect(safeMarkers[0].emotional_value).toBeGreaterThan(
        riskyMarkers[0].emotional_value
      );
    });

    it("should use current emotional state when no memory exists", () => {
      // Set positive emotional state
      processor.updateEmotionalState({ valence: 0.8 });

      const unknownOptions = ["some unknown option"];
      const markers = processor.applySomaticMarkers(unknownOptions);

      expect(markers[0].source).toBe("current_state");
      expect(markers[0].confidence).toBeLessThan(0.5); // Lower confidence for unknown
    });

    it("should store and retrieve emotional outcomes", () => {
      const pattern = "test_decision";
      const outcome: EmotionalState = {
        valence: 0.7,
        arousal: 0.5,
        dominance: 0.6,
        specific_emotions: new Map([["satisfaction", 0.8]]),
      };

      processor.storeEmotionalOutcome(pattern, outcome, 0.8);

      // Test that the pattern is now recognized
      const options = [pattern];
      const markers = processor.applySomaticMarkers(options);

      expect(markers[0].source).toBe("memory");
      expect(markers[0].confidence).toBeGreaterThan(0.2);
    });
  });

  describe("Reasoning Modulation", () => {
    it("should modulate reasoning steps based on emotion", () => {
      const reasoningSteps: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "This is a good approach",
          confidence: 0.7,
          alternatives: [
            {
              content: "Alternative approach",
              confidence: 0.5,
              reasoning: "test",
            },
          ],
        },
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "This involves risk",
          confidence: 0.6,
          alternatives: [],
        },
      ];

      const positiveEmotion: EmotionalState = {
        valence: 0.8,
        arousal: 0.6,
        dominance: 0.7,
        specific_emotions: new Map([["joy", 0.8]]),
      };

      const modulated = processor.modulateReasoning(
        reasoningSteps,
        positiveEmotion
      );

      expect(modulated).toHaveLength(2);
      expect(modulated[0].metadata?.emotional_bias).toBeDefined();
      expect(modulated[0].metadata?.modulation_applied).toBe(true);

      // Positive emotion should boost confidence in "good" reasoning
      expect(modulated[0].confidence).toBeGreaterThan(
        reasoningSteps[0].confidence
      );
    });

    it("should handle negative emotional modulation", () => {
      const reasoningSteps: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "This involves significant risk",
          confidence: 0.7,
          alternatives: [],
        },
      ];

      const negativeEmotion: EmotionalState = {
        valence: -0.6,
        arousal: 0.8,
        dominance: 0.3,
        specific_emotions: new Map([["anxiety", 0.7]]),
      };

      const modulated = processor.modulateReasoning(
        reasoningSteps,
        negativeEmotion
      );

      // Negative emotion should reduce confidence in risky reasoning
      expect(modulated[0].confidence).toBeLessThan(
        reasoningSteps[0].confidence
      );
    });

    it("should modulate alternatives correctly", () => {
      const reasoningSteps: ReasoningStep[] = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "Main reasoning",
          confidence: 0.7,
          alternatives: [
            { content: "Alt 1", confidence: 0.6, reasoning: "test" },
            { content: "Alt 2", confidence: 0.5, reasoning: "test" },
          ],
        },
      ];

      const emotion: EmotionalState = {
        valence: 0.5,
        arousal: 0.6,
        dominance: 0.7,
        specific_emotions: new Map(),
      };

      const modulated = processor.modulateReasoning(reasoningSteps, emotion);

      expect(modulated[0].alternatives).toHaveLength(2);
      expect(modulated[0].alternatives![0].confidence).toBeDefined();

      // Alternatives should be sorted by modulated confidence
      expect(modulated[0].alternatives![0].confidence).toBeGreaterThanOrEqual(
        modulated[0].alternatives![1].confidence
      );
    });

    it("should handle high arousal effects on different reasoning types", () => {
      const intuitiveStep: ReasoningStep = {
        type: ReasoningType.PATTERN_MATCH, // More intive
        content: "Pattern-based reasoning",
        confidence: 0.6,
        alternatives: [],
      };

      const deliberativeStep: ReasoningStep = {
        type: ReasoningType.LOGICAL_INFERENCE, // More deliberative
        content: "Logical reasoning",
        confidence: 0.6,
        alternatives: [],
      };

      const highArousalEmotion: EmotionalState = {
        valence: 0.0,
        arousal: 0.9, // High arousal
        dominance: 0.5,
        specific_emotions: new Map(),
      };

      const modulatedIntuitive = processor.modulateReasoning(
        [intuitiveStep],
        highArousalEmotion
      );
      const modulatedDeliberative = processor.modulateReasoning(
        [deliberativeStep],
        highArousalEmotion
      );

      // High arousal should help intuitive reasoning more than deliberative
      const intuitiveBoost =
        modulatedIntuitive[0].confidence - intuitiveStep.confidence;
      const deliberativeBoost =
        modulatedDeliberative[0].confidence - deliberativeStep.confidence;

      expect(intuitiveBoost).toBeGreaterThan(deliberativeBoost);
    });
  });

  describe("Processing Integration", () => {
    it("should process input and return emotional assessment", async () => {
      const result = await processor.process(
        "I am feeling quite anxious about this decision"
      );

      expect(result.valence).toBeLessThan(0);
      expect(result.arousal).toBeGreaterThan(0.5);
      expect(result.specific_emotions.has("anxiety")).toBe(true);
    });

    it("should update internal state during processing", async () => {
      const initialState = processor.getCurrentEmotionalState();

      await processor.process("I am extremely happy and excited!");

      const newState = processor.getCurrentEmotionalState();
      expect(newState.valence).toBeGreaterThan(initialState.valence);
      expect(newState.arousal).toBeGreaterThan(initialState.arousal);
    });

    it("should handle processing errors gracefully", async () => {
      // Test with uninitialized processor
      const uninitializedProcessor = new EmotionalProcessor();

      await expect(uninitializedProcessor.process("test")).rejects.toThrow(
        "EmotionalProcessor not initialized"
      );
    });
  });

  describe("Emotional Trajectory Analysis", () => {
    it("should compute emotional trajectory correctly", async () => {
      // Create a sequence of emotional states with small delays
      processor.updateEmotionalState({ valence: 0.2 });
      await new Promise((resolve) => setTimeout(resolve, 1)); // 1ms delay
      processor.updateEmotionalState({ valence: 0.4 });
      await new Promise((resolve) => setTimeout(resolve, 1)); // 1ms delay
      processor.updateEmotionalState({ valence: 0.6 });

      const trajectory = processor.getEmotionalTrajectory();

      expect(trajectory.valence_trend).toBeGreaterThan(0); // Increasing valence
      expect(trajectory.stability).toBeDefined();
      expect(trajectory.duration_ms).toBeGreaterThan(0);
    });

    it("should handle empty history gracefully", () => {
      const newProcessor = new EmotionalProcessor();
      const trajectory = newProcessor.getEmotionalTrajectory();

      expect(trajectory.valence_trend).toBe(0);
      expect(trajectory.arousal_trend).toBe(0);
      expect(trajectory.stability).toBe(1);
      expect(trajectory.duration_ms).toBe(0);
    });

    it("should compute stability correctly", () => {
      // Create stable emotional states
      for (let i = 0; i < 5; i++) {
        processor.updateEmotionalState({
          valence: 0.5,
          arousal: 0.6,
          dominance: 0.7,
        });
      }

      const stableTrajectory = processor.getEmotionalTrajectory();

      // Reset and create unstable states
      processor.reset();
      const values = [0.1, 0.9, 0.2, 0.8, 0.3];
      values.forEach((val) => {
        processor.updateEmotionalState({
          valence: val,
          arousal: val,
          dominance: val,
        });
      });

      const unstableTrajectory = processor.getEmotionalTrajectory();

      expect(stableTrajectory.stability).toBeGreaterThan(
        unstableTrajectory.stability
      );
    });
  });

  describe("Reset and State Management", () => {
    it("should reset to neutral state", () => {
      // Set some emotional state
      processor.updateEmotionalState({
        valence: 0.8,
        arousal: 0.9,
        specific_emotions: new Map([["joy", 0.8]]),
      });

      processor.reset();

      const state = processor.getCurrentEmotionalState();
      expect(state.valence).toBe(0.0);
      expect(state.arousal).toBe(0.5);
      expect(state.dominance).toBe(0.5);
      expect(state.specific_emotions.size).toBe(0);
    });

    it("should clear emotional history on reset", () => {
      // Build up some history
      for (let i = 0; i < 10; i++) {
        processor.updateEmotionalState({ valence: i * 0.1 });
      }

      processor.reset();

      const trajectory = processor.getEmotionalTrajectory();
      expect(trajectory.duration_ms).toBe(0);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty input", async () => {
      const result = await processor.process("");

      expect(result.valence).toBeCloseTo(0, 1);
      expect(result.arousal).toBeCloseTo(0.5, 1);
      expect(result.dominance).toBeCloseTo(0.5, 1);
    });

    it("should handle very long input", async () => {
      const longInput = "happy ".repeat(1000);
      const result = await processor.process(longInput);

      expect(result.valence).toBeGreaterThan(0);
      expect(result.specific_emotions.has("joy")).toBe(true);
    });

    it("should clamp emotional values within bounds", () => {
      // Test extreme values
      processor.updateEmotionalState({
        valence: 10, // Should be clamped to 1
        arousal: -5, // Should be clamped to 0
        dominance: 2, // Should be clamped to 1
      });

      const state = processor.getCurrentEmotionalState();
      expect(state.valence).toBeLessThanOrEqual(1);
      expect(state.valence).toBeGreaterThanOrEqual(-1);
      expect(state.arousal).toBeLessThanOrEqual(1);
      expect(state.arousal).toBeGreaterThanOrEqual(0);
      expect(state.dominance).toBeLessThanOrEqual(1);
      expect(state.dominance).toBeGreaterThanOrEqual(0);
    });

    it("should handle mixed emotional content", async () => {
      const mixedInput = "I am happy but also worried about the future";
      const result = await processor.process(mixedInput);

      // Should detect both positive and negative emotions
      expect(result.specific_emotions.has("joy")).toBe(true);
      expect(result.specific_emotions.has("worry")).toBe(true);

      // Valence should be somewhere in between
      expect(result.valence).toBeGreaterThan(-0.5);
      expect(result.valence).toBeLessThan(0.5);
    });
  });
});
