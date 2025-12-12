/**
 * Tests for DiscreteEmotionClassifier
 *
 * Tests the discrete emotion classification system with 11 emotion types,
 * multi-label classification, intensity scoring, and evidence extraction.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { beforeEach, describe, expect, it } from "vitest";
import { DiscreteEmotionClassifier } from "../../../emotion/discrete-emotion-classifier";
import type { EmotionModel } from "../../../emotion/types";

describe("DiscreteEmotionClassifier", () => {
  let classifier: DiscreteEmotionClassifier;
  let model: EmotionModel;

  beforeEach(() => {
    model = {
      name: "lexicon-based",
      version: "1.0.0",
    };
    classifier = new DiscreteEmotionClassifier(model);
  });

  describe("Joy Detection", () => {
    it("should detect joy in happy text", () => {
      const text = "I am so happy and excited about this wonderful news!";
      const result = classifier.classify(text);

      const joyEmotion = result.find((e) => e.emotion === "joy");
      expect(joyEmotion).toBeDefined();
      expect(joyEmotion!.intensity).toBeGreaterThan(0.5);
      expect(joyEmotion!.confidence).toBeGreaterThan(0.6);
    });

    it("should detect strong joy with high intensity", () => {
      const text = "This is absolutely amazing! I'm thrilled and delighted!";
      const result = classifier.classify(text);

      const joyEmotion = result.find((e) => e.emotion === "joy");
      expect(joyEmotion).toBeDefined();
      expect(joyEmotion!.intensity).toBeGreaterThan(0.7);
    });

    it("should detect mild joy with lower intensity", () => {
      const text = "I'm pleased with the outcome.";
      const result = classifier.classify(text);

      const joyEmotion = result.find((e) => e.emotion === "joy");
      expect(joyEmotion).toBeDefined();
      expect(joyEmotion!.intensity).toBeLessThan(0.6);
      expect(joyEmotion!.intensity).toBeGreaterThan(0.2);
    });
  });

  describe("Sadness Detection", () => {
    it("should detect sadness in sad text", () => {
      const text = "I feel so sad and disappointed about what happened.";
      const result = classifier.classify(text);

      const sadnessEmotion = result.find((e) => e.emotion === "sadness");
      expect(sadnessEmotion).toBeDefined();
      expect(sadnessEmotion!.intensity).toBeGreaterThan(0.5);
      expect(sadnessEmotion!.confidence).toBeGreaterThan(0.6);
    });

    it("should detect strong sadness", () => {
      const text = "I'm devastated and heartbroken. This is terrible.";
      const result = classifier.classify(text);

      const sadnessEmotion = result.find((e) => e.emotion === "sadness");
      expect(sadnessEmotion).toBeDefined();
      expect(sadnessEmotion!.intensity).toBeGreaterThan(0.7);
    });

    it("should detect mild sadness", () => {
      const text = "I'm a bit unhappy about this.";
      const result = classifier.classify(text);

      const sadnessEmotion = result.find((e) => e.emotion === "sadness");
      expect(sadnessEmotion).toBeDefined();
      expect(sadnessEmotion!.intensity).toBeLessThan(0.6);
    });
  });

  describe("Anger Detection", () => {
    it("should detect anger in angry text", () => {
      const text = "I'm so angry and frustrated with this situation!";
      const result = classifier.classify(text);

      const angerEmotion = result.find((e) => e.emotion === "anger");
      expect(angerEmotion).toBeDefined();
      expect(angerEmotion!.intensity).toBeGreaterThan(0.5);
      expect(angerEmotion!.confidence).toBeGreaterThan(0.6);
    });

    it("should detect strong anger", () => {
      const text = "I'm furious and outraged! This is unacceptable!";
      const result = classifier.classify(text);

      const angerEmotion = result.find((e) => e.emotion === "anger");
      expect(angerEmotion).toBeDefined();
      expect(angerEmotion!.intensity).toBeGreaterThan(0.7);
    });

    it("should detect mild anger", () => {
      const text = "I'm a bit annoyed by this.";
      const result = classifier.classify(text);

      const angerEmotion = result.find((e) => e.emotion === "anger");
      expect(angerEmotion).toBeDefined();
      expect(angerEmotion!.intensity).toBeLessThan(0.6);
    });
  });

  describe("Fear Detection", () => {
    it("should detect fear in fearful text", () => {
      const text = "I'm scared and worried about what might happen.";
      const result = classifier.classify(text);

      const fearEmotion = result.find((e) => e.emotion === "fear");
      expect(fearEmotion).toBeDefined();
      expect(fearEmotion!.intensity).toBeGreaterThan(0.5);
      expect(fearEmotion!.confidence).toBeGreaterThan(0.6);
    });

    it("should detect strong fear", () => {
      const text = "I'm terrified and panicking! This is frightening!";
      const result = classifier.classify(text);

      const fearEmotion = result.find((e) => e.emotion === "fear");
      expect(fearEmotion).toBeDefined();
      expect(fearEmotion!.intensity).toBeGreaterThan(0.7);
    });

    it("should detect mild fear", () => {
      const text = "I'm a bit nervous about this.";
      const result = classifier.classify(text);

      const fearEmotion = result.find((e) => e.emotion === "fear");
      expect(fearEmotion).toBeDefined();
      expect(fearEmotion!.intensity).toBeLessThan(0.6);
    });
  });

  describe("Disgust Detection", () => {
    it("should detect disgust in disgusted text", () => {
      const text = "This is disgusting and repulsive. I can't stand it.";
      const result = classifier.classify(text);

      const disgustEmotion = result.find((e) => e.emotion === "disgust");
      expect(disgustEmotion).toBeDefined();
      expect(disgustEmotion!.intensity).toBeGreaterThan(0.5);
      expect(disgustEmotion!.confidence).toBeGreaterThan(0.6);
    });

    it("should detect strong disgust", () => {
      const text = "This is absolutely revolting and nauseating!";
      const result = classifier.classify(text);

      const disgustEmotion = result.find((e) => e.emotion === "disgust");
      expect(disgustEmotion).toBeDefined();
      expect(disgustEmotion!.intensity).toBeGreaterThan(0.7);
    });
  });

  describe("Surprise Detection", () => {
    it("should detect surprise in surprised text", () => {
      const text = "Wow! I'm so surprised and amazed by this!";
      const result = classifier.classify(text);

      const surpriseEmotion = result.find((e) => e.emotion === "surprise");
      expect(surpriseEmotion).toBeDefined();
      expect(surpriseEmotion!.intensity).toBeGreaterThan(0.5);
      expect(surpriseEmotion!.confidence).toBeGreaterThan(0.6);
    });

    it("should detect strong surprise", () => {
      const text = "I'm absolutely shocked and astonished!";
      const result = classifier.classify(text);

      const surpriseEmotion = result.find((e) => e.emotion === "surprise");
      expect(surpriseEmotion).toBeDefined();
      expect(surpriseEmotion!.intensity).toBeGreaterThan(0.7);
    });
  });

  describe("Pride Detection", () => {
    it("should detect pride in proud text", () => {
      const text = "I'm so proud of what I've accomplished!";
      const result = classifier.classify(text);

      const prideEmotion = result.find((e) => e.emotion === "pride");
      expect(prideEmotion).toBeDefined();
      expect(prideEmotion!.intensity).toBeGreaterThan(0.5);
      expect(prideEmotion!.confidence).toBeGreaterThan(0.6);
    });

    it("should detect strong pride", () => {
      const text = "I'm incredibly proud and honored by this achievement!";
      const result = classifier.classify(text);

      const prideEmotion = result.find((e) => e.emotion === "pride");
      expect(prideEmotion).toBeDefined();
      expect(prideEmotion!.intensity).toBeGreaterThan(0.7);
    });
  });

  describe("Shame Detection", () => {
    it("should detect shame in ashamed text", () => {
      const text = "I'm so ashamed and embarrassed by what I did.";
      const result = classifier.classify(text);

      const shameEmotion = result.find((e) => e.emotion === "shame");
      expect(shameEmotion).toBeDefined();
      expect(shameEmotion!.intensity).toBeGreaterThan(0.5);
      expect(shameEmotion!.confidence).toBeGreaterThan(0.6);
    });

    it("should detect strong shame", () => {
      const text = "I'm deeply ashamed and humiliated.";
      const result = classifier.classify(text);

      const shameEmotion = result.find((e) => e.emotion === "shame");
      expect(shameEmotion).toBeDefined();
      expect(shameEmotion!.intensity).toBeGreaterThan(0.7);
    });
  });

  describe("Guilt Detection", () => {
    it("should detect guilt in guilty text", () => {
      const text = "I feel so guilty and regretful about what happened.";
      const result = classifier.classify(text);

      const guiltEmotion = result.find((e) => e.emotion === "guilt");
      expect(guiltEmotion).toBeDefined();
      expect(guiltEmotion!.intensity).toBeGreaterThan(0.5);
      expect(guiltEmotion!.confidence).toBeGreaterThan(0.6);
    });

    it("should detect strong guilt", () => {
      const text = "I'm consumed by guilt and remorse.";
      const result = classifier.classify(text);

      const guiltEmotion = result.find((e) => e.emotion === "guilt");
      expect(guiltEmotion).toBeDefined();
      expect(guiltEmotion!.intensity).toBeGreaterThan(0.7);
    });
  });

  describe("Gratitude Detection", () => {
    it("should detect gratitude in thankful text", () => {
      const text = "I'm so grateful and thankful for your help!";
      const result = classifier.classify(text);

      const gratitudeEmotion = result.find((e) => e.emotion === "gratitude");
      expect(gratitudeEmotion).toBeDefined();
      expect(gratitudeEmotion!.intensity).toBeGreaterThan(0.5);
      expect(gratitudeEmotion!.confidence).toBeGreaterThan(0.6);
    });

    it("should detect strong gratitude", () => {
      const text = "I'm deeply grateful and appreciative of everything you've done!";
      const result = classifier.classify(text);

      const gratitudeEmotion = result.find((e) => e.emotion === "gratitude");
      expect(gratitudeEmotion).toBeDefined();
      expect(gratitudeEmotion!.intensity).toBeGreaterThan(0.7);
    });
  });

  describe("Awe Detection", () => {
    it("should detect awe in awestruck text", () => {
      const text = "This is absolutely breathtaking and awe-inspiring!";
      const result = classifier.classify(text);

      const aweEmotion = result.find((e) => e.emotion === "awe");
      expect(aweEmotion).toBeDefined();
      expect(aweEmotion!.intensity).toBeGreaterThan(0.5);
      expect(aweEmotion!.confidence).toBeGreaterThan(0.6);
    });

    it("should detect strong awe", () => {
      const text = "I'm in complete awe of this magnificent sight!";
      const result = classifier.classify(text);

      const aweEmotion = result.find((e) => e.emotion === "awe");
      expect(aweEmotion).toBeDefined();
      expect(aweEmotion!.intensity).toBeGreaterThan(0.7);
    });
  });

  describe("Multi-Label Classification", () => {
    it("should detect multiple emotions in mixed emotional text", () => {
      const text = "I'm happy about the success but sad that it's over.";
      const result = classifier.classify(text);

      expect(result.length).toBeGreaterThanOrEqual(2);
      const joyEmotion = result.find((e) => e.emotion === "joy");
      const sadnessEmotion = result.find((e) => e.emotion === "sadness");

      expect(joyEmotion).toBeDefined();
      expect(sadnessEmotion).toBeDefined();
    });

    it("should detect joy and gratitude together", () => {
      const text = "I'm so happy and grateful for this wonderful opportunity!";
      const result = classifier.classify(text);

      const joyEmotion = result.find((e) => e.emotion === "joy");
      const gratitudeEmotion = result.find((e) => e.emotion === "gratitude");

      expect(joyEmotion).toBeDefined();
      expect(gratitudeEmotion).toBeDefined();
    });

    it("should detect fear and anger together", () => {
      const text = "I'm scared and angry about this threatening situation!";
      const result = classifier.classify(text);

      const fearEmotion = result.find((e) => e.emotion === "fear");
      const angerEmotion = result.find((e) => e.emotion === "anger");

      expect(fearEmotion).toBeDefined();
      expect(angerEmotion).toBeDefined();
    });

    it("should detect surprise and joy together", () => {
      const text = "Wow! I'm so surprised and delighted by this unexpected gift!";
      const result = classifier.classify(text);

      const surpriseEmotion = result.find((e) => e.emotion === "surprise");
      const joyEmotion = result.find((e) => e.emotion === "joy");

      expect(surpriseEmotion).toBeDefined();
      expect(joyEmotion).toBeDefined();
    });
  });

  describe("Confidence Scoring", () => {
    it("should return confidence scores between 0 and 1", () => {
      const text = "I'm happy and excited!";
      const result = classifier.classify(text);

      result.forEach((emotion) => {
        expect(emotion.confidence).toBeGreaterThanOrEqual(0);
        expect(emotion.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("should have higher confidence for clear emotional signals", () => {
      const clearText = "I'm absolutely furious and enraged!";
      const ambiguousText = "I feel something about this.";

      const clearResult = classifier.classify(clearText);
      const ambiguousResult = classifier.classify(ambiguousText);

      const clearAnger = clearResult.find((e) => e.emotion === "anger");
      const avgAmbiguousConfidence =
        ambiguousResult.reduce((sum, e) => sum + e.confidence, 0) / ambiguousResult.length;

      if (clearAnger) {
        expect(clearAnger.confidence).toBeGreaterThan(avgAmbiguousConfidence);
      }
    });

    it("should have lower confidence for weak emotional signals", () => {
      const text = "This is okay, I guess.";
      const result = classifier.classify(text);

      result.forEach((emotion) => {
        expect(emotion.confidence).toBeLessThan(0.7);
      });
    });
  });

  describe("Intensity Scoring", () => {
    it("should return intensity scores between 0 and 1", () => {
      const text = "I'm happy and excited!";
      const result = classifier.classify(text);

      result.forEach((emotion) => {
        expect(emotion.intensity).toBeGreaterThanOrEqual(0);
        expect(emotion.intensity).toBeLessThanOrEqual(1);
      });
    });

    it("should have higher intensity for amplified emotions", () => {
      const normalText = "I'm happy.";
      const amplifiedText = "I'm extremely happy!";

      const normalResult = classifier.classify(normalText);
      const amplifiedResult = classifier.classify(amplifiedText);

      const normalJoy = normalResult.find((e) => e.emotion === "joy");
      const amplifiedJoy = amplifiedResult.find((e) => e.emotion === "joy");

      if (normalJoy && amplifiedJoy) {
        expect(amplifiedJoy.intensity).toBeGreaterThan(normalJoy.intensity);
      }
    });
  });

  describe("Evidence Extraction", () => {
    it("should extract evidence words for detected emotions", () => {
      const text = "I'm happy and joyful!";
      const result = classifier.classifyWithEvidence(text);

      const joyEmotion = result.find((e) => e.emotion === "joy");
      expect(joyEmotion).toBeDefined();
      expect(joyEmotion!.evidence).toBeDefined();
      expect(joyEmotion!.evidence!.length).toBeGreaterThan(0);
      expect(joyEmotion!.evidence).toContain("happy");
    });

    it("should extract multiple evidence words", () => {
      const text = "I'm angry, furious, and outraged!";
      const result = classifier.classifyWithEvidence(text);

      const angerEmotion = result.find((e) => e.emotion === "anger");
      expect(angerEmotion).toBeDefined();
      expect(angerEmotion!.evidence).toBeDefined();
      expect(angerEmotion!.evidence!.length).toBeGreaterThanOrEqual(2);
    });

    it("should extract evidence for multiple emotions", () => {
      const text = "I'm happy but also worried.";
      const result = classifier.classifyWithEvidence(text);

      const joyEmotion = result.find((e) => e.emotion === "joy");
      const fearEmotion = result.find((e) => e.emotion === "fear");

      expect(joyEmotion?.evidence).toBeDefined();
      expect(fearEmotion?.evidence).toBeDefined();
    });
  });

  describe("Detection Accuracy", () => {
    it("should achieve >75% accuracy on test cases", () => {
      const testCases = [
        { text: "I'm so happy!", expected: "joy" },
        { text: "I'm very sad.", expected: "sadness" },
        { text: "I'm angry!", expected: "anger" },
        { text: "I'm scared.", expected: "fear" },
        { text: "This is disgusting.", expected: "disgust" },
        { text: "Wow! Amazing!", expected: "surprise" },
        { text: "I'm proud of myself.", expected: "pride" },
        { text: "I'm ashamed.", expected: "shame" },
        { text: "I feel guilty.", expected: "guilt" },
        { text: "Thank you so much!", expected: "gratitude" },
        { text: "This is breathtaking!", expected: "awe" },
      ];

      let correct = 0;
      testCases.forEach((testCase) => {
        const result = classifier.classify(testCase.text);
        const detected = result.find((e) => e.emotion === testCase.expected);
        if (detected && detected.intensity > 0.3) {
          correct++;
        }
      });

      const accuracy = correct / testCases.length;
      expect(accuracy).toBeGreaterThan(0.75);
    });
  });

  describe("Performance", () => {
    it("should classify text in less than 200ms", () => {
      const text = "I'm happy and excited about this wonderful news!";
      const startTime = performance.now();
      classifier.classify(text);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200);
    });

    it("should handle long text efficiently", () => {
      const longText = "I'm happy. ".repeat(100);
      const startTime = performance.now();
      classifier.classify(longText);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string", () => {
      const result = classifier.classify("");
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle whitespace-only string", () => {
      const result = classifier.classify("   ");
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle text with special characters", () => {
      const text = "I'm happy!!! @#$%^&*()";
      const result = classifier.classify(text);
      expect(result).toBeDefined();
      const joyEmotion = result.find((e) => e.emotion === "joy");
      expect(joyEmotion).toBeDefined();
    });

    it("should handle text with numbers", () => {
      const text = "I'm happy 123 times!";
      const result = classifier.classify(text);
      expect(result).toBeDefined();
      const joyEmotion = result.find((e) => e.emotion === "joy");
      expect(joyEmotion).toBeDefined();
    });

    it("should handle ambiguous emotional text", () => {
      const text = "I don't know how I feel about this.";
      const result = classifier.classify(text);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle neutral text", () => {
      const text = "The sky is blue.";
      const result = classifier.classify(text);
      expect(result).toBeDefined();
      // Neutral text should return empty array or very low intensity emotions
      if (result.length > 0) {
        result.forEach((emotion) => {
          expect(emotion.intensity).toBeLessThan(0.3);
        });
      }
    });
  });
});
