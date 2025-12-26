import { describe, expect, it } from "vitest";
import { BiasPatternRecognizer } from "../../../bias/bias-pattern-recognizer.js";
import { GOLDEN_QUESTIONS } from "../../corpus/bias-golden-set.js";

describe("Metacognition Regression Suite - Bias Detection", () => {
  const recognizer = new BiasPatternRecognizer();

  describe("Golden Questions Corpus", () => {
    GOLDEN_QUESTIONS.forEach((testCase) => {
      it(`should detect correct biases for: ${testCase.name}`, () => {
        const detected = recognizer.detectBiasesFromText(testCase.text);
        const detectedTypes = detected.map((b) => b.type);

        // Check that all expected biases are present
        testCase.expectedBiases.forEach((expected) => {
          expect(detectedTypes).toContain(expected);
        });

        // If we expect no biases, ensure detected is empty
        if (testCase.expectedBiases.length === 0) {
          expect(detected.length).toBe(0);
        }
      });
    });
  });

  describe("Ad-hoc Integrity Checks", () => {
    it("should handle empty input gracefully", () => {
      const detected = recognizer.detectBiasesFromText("");
      expect(detected).toEqual([]);
    });

    it("should provide evidence for detected biases", () => {
      const text = "We have always done it this way";
      const detected = recognizer.detectBiasesFromText(text);
      expect(detected.length).toBeGreaterThan(0);
      expect(detected[0].evidence.length).toBeGreaterThan(0);
      expect(detected[0].evidence[0]).toContain("Matched indicator");
    });
  });
});
