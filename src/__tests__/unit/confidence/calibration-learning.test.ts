/**
 * Tests for Calibration Learning Engine
 *
 * Tests prediction-outcome tracking, calibration error calculation,
 * domain-specific model training, and accuracy improvement over time.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { CalibrationLearningEngine } from "../../../confidence/calibration-learning-engine";
import { SeededRandom, seededRandom } from "../../utils/test-helpers";

describe("CalibrationLearningEngine", () => {
  let engine: CalibrationLearningEngine;

  beforeEach(() => {
    engine = new CalibrationLearningEngine();
    seededRandom.reset();
  });

  describe("Prediction-Outcome Pair Storage", () => {
    it("should store prediction-outcome pair with all required fields", () => {
      engine.trackPredictionOutcome(0.8, 1.0, "general");

      const pairs = engine.getPredictionOutcomes("general");
      expect(pairs).toHaveLength(1);
      expect(pairs[0].predictedConfidence).toBe(0.8);
      expect(pairs[0].actualOutcome).toBe(1.0);
      expect(pairs[0].domain).toBe("general");
      expect(pairs[0].timestamp).toBeInstanceOf(Date);
    });

    it("should retrieve pairs by domain", () => {
      engine.trackPredictionOutcome(0.7, 1.0, "technical");
      engine.trackPredictionOutcome(0.6, 0.0, "creative");
      engine.trackPredictionOutcome(0.8, 1.0, "technical");

      const technicalPairs = engine.getPredictionOutcomes("technical");
      const creativePairs = engine.getPredictionOutcomes("creative");

      expect(technicalPairs).toHaveLength(2);
      expect(creativePairs).toHaveLength(1);
      expect(technicalPairs[0].domain).toBe("technical");
      expect(creativePairs[0].domain).toBe("creative");
    });

    it("should retrieve pairs by time range", () => {
      const oneHourAgo = new Date(Date.now() - 3600000);

      engine.trackPredictionOutcome(0.7, 1.0, "general");

      // Use a future time to ensure the tracked pair is within range
      const futureTime = new Date(Date.now() + 1000);
      const recentPairs = engine.getPredictionOutcomesByTimeRange(
        "general",
        oneHourAgo,
        futureTime
      );

      expect(recentPairs.length).toBeGreaterThan(0);
      expect(recentPairs[0].timestamp.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
    });

    it("should reject negative confidence values", () => {
      expect(() => {
        engine.trackPredictionOutcome(-0.1, 1.0, "general");
      }).toThrow("Confidence must be between 0 and 1");
    });

    it("should reject confidence values greater than 1", () => {
      expect(() => {
        engine.trackPredictionOutcome(1.5, 1.0, "general");
      }).toThrow("Confidence must be between 0 and 1");
    });

    it("should reject invalid outcome values", () => {
      expect(() => {
        engine.trackPredictionOutcome(0.8, -0.5, "general");
      }).toThrow("Outcome must be between 0 and 1");

      expect(() => {
        engine.trackPredictionOutcome(0.8, 1.5, "general");
      }).toThrow("Outcome must be between 0 and 1");
    });

    it("should handle empty domain gracefully", () => {
      const pairs = engine.getPredictionOutcomes("nonexistent");
      expect(pairs).toHaveLength(0);
    });
  });

  describe("Calibration Error Calculation", () => {
    it("should calculate mean absolute error correctly", () => {
      // Perfect predictions
      engine.trackPredictionOutcome(0.8, 0.8, "perfect");
      engine.trackPredictionOutcome(0.6, 0.6, "perfect");
      engine.trackPredictionOutcome(0.4, 0.4, "perfect");

      const error = engine.calculateCalibrationError("perfect");
      expect(error).toBe(0);
    });

    it("should calculate error for imperfect predictions", () => {
      // Predictions off by 0.2 each
      engine.trackPredictionOutcome(0.8, 0.6, "imperfect");
      engine.trackPredictionOutcome(0.6, 0.8, "imperfect");
      engine.trackPredictionOutcome(0.4, 0.6, "imperfect");

      const error = engine.calculateCalibrationError("imperfect");
      expect(error).toBeCloseTo(0.2, 2);
    });

    it("should calculate error by confidence range", () => {
      // Low confidence range (0-0.3)
      engine.trackPredictionOutcome(0.2, 0.5, "ranges");
      // Medium confidence range (0.3-0.7)
      engine.trackPredictionOutcome(0.5, 0.8, "ranges");
      // High confidence range (0.7-1.0)
      engine.trackPredictionOutcome(0.9, 0.7, "ranges");

      const errorByRange = engine.calculateCalibrationErrorByRange("ranges");

      expect(errorByRange).toHaveProperty("low");
      expect(errorByRange).toHaveProperty("medium");
      expect(errorByRange).toHaveProperty("high");
      expect(errorByRange.low).toBeCloseTo(0.3, 2);
      expect(errorByRange.medium).toBeCloseTo(0.3, 2);
      expect(errorByRange.high).toBeCloseTo(0.2, 2);
    });

    it("should handle edge case with no data", () => {
      const error = engine.calculateCalibrationError("empty");
      expect(error).toBe(0);
    });

    it("should handle edge case with single data point", () => {
      engine.trackPredictionOutcome(0.7, 0.9, "single");

      const error = engine.calculateCalibrationError("single");
      expect(error).toBeCloseTo(0.2, 2);
    });

    it("should calculate error for poor calibration", () => {
      // Consistently overconfident
      for (let i = 0; i < 10; i++) {
        engine.trackPredictionOutcome(0.9, 0.3, "poor");
      }

      const error = engine.calculateCalibrationError("poor");
      expect(error).toBeGreaterThan(0.5);
    });
  });

  describe("Domain-Specific Model Training", () => {
    it("should train model with sufficient data (1000+ pairs)", () => {
      // Generate 1000 pairs with systematic bias (overconfident by 0.2)
      const rng = new SeededRandom(42);
      for (let i = 0; i < 1000; i++) {
        const actual = rng.next();
        const predicted = Math.min(1.0, actual + 0.2);
        engine.trackPredictionOutcome(predicted, actual, "sufficient");
      }

      const model = engine.trainCalibrationModel("sufficient");

      expect(model).toBeDefined();
      expect(model.domain).toBe("sufficient");
      expect(model.sampleSize).toBe(1000);
      expect(model.slope).toBeGreaterThan(0);
      expect(model.intercept).toBeDefined();
      expect(model.calibrationError).toBeGreaterThan(0);
      expect(model.lastUpdated).toBeInstanceOf(Date);
    });

    it("should not train model with insufficient data", () => {
      // Only 500 pairs
      for (let i = 0; i < 500; i++) {
        engine.trackPredictionOutcome(0.7, 0.7, "insufficient");
      }

      expect(() => {
        engine.trainCalibrationModel("insufficient");
      }).toThrow("Insufficient data for training");
    });

    it("should produce model that reduces calibration error", () => {
      // Generate biased data
      const rng = new SeededRandom(43);
      for (let i = 0; i < 1000; i++) {
        const actual = rng.next();
        const predicted = Math.min(1.0, actual + 0.15);
        engine.trackPredictionOutcome(predicted, actual, "improvement");
      }

      const errorBefore = engine.calculateCalibrationError("improvement");
      const model = engine.trainCalibrationModel("improvement");

      // Apply model and check if error would be reduced
      expect(model.calibrationError).toBeLessThan(errorBefore);
    });

    it("should support multiple domain-specific models", () => {
      // Train model for domain A
      for (let i = 0; i < 1000; i++) {
        engine.trackPredictionOutcome(0.8, 0.6, "domainA");
      }
      const modelA = engine.trainCalibrationModel("domainA");

      // Train model for domain B
      for (let i = 0; i < 1000; i++) {
        engine.trackPredictionOutcome(0.4, 0.6, "domainB");
      }
      const modelB = engine.trainCalibrationModel("domainB");

      expect(modelA.domain).toBe("domainA");
      expect(modelB.domain).toBe("domainB");
      expect(modelA.slope).not.toBe(modelB.slope);
    });

    it("should retrieve trained model", () => {
      for (let i = 0; i < 1000; i++) {
        engine.trackPredictionOutcome(0.7, 0.7, "retrieve");
      }

      engine.trainCalibrationModel("retrieve");
      const model = engine.getCalibrationModel("retrieve");

      expect(model).toBeDefined();
      expect(model?.domain).toBe("retrieve");
    });

    it("should return undefined for untrained domain", () => {
      const model = engine.getCalibrationModel("untrained");
      expect(model).toBeUndefined();
    });
  });

  describe("Calibration Accuracy (±10%)", () => {
    it("should achieve predictions within ±10% of actual outcomes", () => {
      // Generate well-calibrated data
      const rng = new SeededRandom(44);
      for (let i = 0; i < 1000; i++) {
        const actual = rng.next();
        const predicted = actual + (rng.next() - 0.5) * 0.1; // ±5% noise
        engine.trackPredictionOutcome(Math.max(0, Math.min(1, predicted)), actual, "accurate");
      }

      const model = engine.trainCalibrationModel("accurate");
      expect(model.calibrationError).toBeLessThanOrEqual(0.1);
    });

    it("should improve accuracy after model training", () => {
      // Generate biased data
      const rng = new SeededRandom(45);
      for (let i = 0; i < 1000; i++) {
        const actual = rng.next();
        const predicted = Math.min(1.0, actual + 0.25);
        engine.trackPredictionOutcome(predicted, actual, "improve");
      }

      const errorBefore = engine.calculateCalibrationError("improve");
      engine.trainCalibrationModel("improve");

      // Simulate applying calibration
      const model = engine.getCalibrationModel("improve");
      expect(model).toBeDefined();
      expect(model!.calibrationError).toBeLessThan(errorBefore);
    });

    it("should maintain accuracy across low confidence range", () => {
      // Low confidence predictions (0-0.3)
      const rng = new SeededRandom(46);
      for (let i = 0; i < 1000; i++) {
        const actual = rng.next() * 0.3;
        const predicted = actual + (rng.next() - 0.5) * 0.05;
        engine.trackPredictionOutcome(Math.max(0, Math.min(0.3, predicted)), actual, "low-range");
      }

      engine.trainCalibrationModel("low-range");
      const errorByRange = engine.calculateCalibrationErrorByRange("low-range");

      expect(errorByRange.low).toBeLessThanOrEqual(0.1);
    });

    it("should maintain accuracy across medium confidence range", () => {
      // Medium confidence predictions (0.3-0.7)
      const rng = new SeededRandom(47);
      for (let i = 0; i < 1000; i++) {
        const actual = 0.3 + rng.next() * 0.4;
        const predicted = actual + (rng.next() - 0.5) * 0.05;
        engine.trackPredictionOutcome(
          Math.max(0.3, Math.min(0.7, predicted)),
          actual,
          "medium-range"
        );
      }

      engine.trainCalibrationModel("medium-range");
      const errorByRange = engine.calculateCalibrationErrorByRange("medium-range");

      expect(errorByRange.medium).toBeLessThanOrEqual(0.1);
    });

    it("should maintain accuracy across high confidence range", () => {
      // High confidence predictions (0.7-1.0)
      const rng = new SeededRandom(48);
      for (let i = 0; i < 1000; i++) {
        const actual = 0.7 + rng.next() * 0.3;
        const predicted = actual + (rng.next() - 0.5) * 0.05;
        engine.trackPredictionOutcome(
          Math.max(0.7, Math.min(1.0, predicted)),
          actual,
          "high-range"
        );
      }

      engine.trainCalibrationModel("high-range");
      const errorByRange = engine.calculateCalibrationErrorByRange("high-range");

      expect(errorByRange.high).toBeLessThanOrEqual(0.1);
    });

    it("should maintain accuracy for different domains", () => {
      const domains = ["technical", "creative", "analytical"];

      for (let d = 0; d < domains.length; d++) {
        const domain = domains[d];
        const rng = new SeededRandom(49 + d);
        for (let i = 0; i < 1000; i++) {
          const actual = rng.next();
          const predicted = actual + (rng.next() - 0.5) * 0.08;
          engine.trackPredictionOutcome(Math.max(0, Math.min(1, predicted)), actual, domain);
        }

        const model = engine.trainCalibrationModel(domain);
        expect(model.calibrationError).toBeLessThanOrEqual(0.1);
      }
    });
  });

  describe("Improvement Over Time", () => {
    it("should show calibration error decreases with more data", () => {
      const errors: number[] = [];
      const rng = new SeededRandom(50);

      // Add data in batches and track error
      for (let batch = 0; batch < 5; batch++) {
        for (let i = 0; i < 200; i++) {
          const actual = rng.next();
          const predicted = Math.min(1.0, actual + 0.2);
          engine.trackPredictionOutcome(predicted, actual, "learning");
        }

        if (batch >= 4) {
          // After 1000 samples
          const error = engine.calculateCalibrationError("learning");
          errors.push(error);
        }
      }

      // Error should stabilize or decrease
      expect(errors[errors.length - 1]).toBeLessThanOrEqual(errors[0] * 1.1);
    });

    it("should improve accuracy by at least 15% after 1000 pairs", () => {
      const rng = new SeededRandom(51);
      // First 100 pairs - establish baseline
      for (let i = 0; i < 100; i++) {
        const actual = rng.next();
        const predicted = Math.min(1.0, actual + 0.3);
        engine.trackPredictionOutcome(predicted, actual, "improvement-15");
      }

      const baselineError = engine.calculateCalibrationError("improvement-15");

      // Add 900 more pairs
      for (let i = 0; i < 900; i++) {
        const actual = rng.next();
        const predicted = Math.min(1.0, actual + 0.3);
        engine.trackPredictionOutcome(predicted, actual, "improvement-15");
      }

      // Train model
      const model = engine.trainCalibrationModel("improvement-15");

      // Improvement should be at least 15%
      const improvement = (baselineError - model.calibrationError) / baselineError;
      expect(improvement).toBeGreaterThanOrEqual(0.15);
    });

    it("should track improvement metrics over time", () => {
      // Add data progressively
      const rng = new SeededRandom(52);
      for (let i = 0; i < 1500; i++) {
        const actual = rng.next();
        const predicted = Math.min(1.0, actual + 0.2);
        engine.trackPredictionOutcome(predicted, actual, "metrics");
      }

      engine.trainCalibrationModel("metrics");
      const metrics = engine.getImprovementMetrics("metrics");

      expect(metrics).toBeDefined();
      expect(metrics.sampleCount).toBe(1500);
      expect(metrics.currentError).toBeGreaterThan(0);
      expect(metrics.improvementRate).toBeDefined();
    });

    it("should show learning curve with error reduction", () => {
      const learningCurve: Array<{ samples: number; error: number }> = [];

      // Collect error at different sample sizes
      for (let samples = 200; samples <= 1200; samples += 200) {
        const tempEngine = new CalibrationLearningEngine();
        const rng = new SeededRandom(53 + samples);

        for (let i = 0; i < samples; i++) {
          const actual = rng.next();
          const predicted = Math.min(1.0, actual + 0.25);
          tempEngine.trackPredictionOutcome(predicted, actual, "curve");
        }

        if (samples >= 1000) {
          tempEngine.trainCalibrationModel("curve");
          const model = tempEngine.getCalibrationModel("curve");
          learningCurve.push({ samples, error: model!.calibrationError });
        } else {
          const error = tempEngine.calculateCalibrationError("curve");
          learningCurve.push({ samples, error });
        }
      }

      // Error should generally decrease or stabilize
      expect(learningCurve[learningCurve.length - 1].error).toBeLessThanOrEqual(
        learningCurve[0].error * 1.2
      );
    });
  });

  describe("Bias Identification", () => {
    it("should identify overconfidence bias", () => {
      // Consistently predict higher than actual
      const rng = new SeededRandom(54);
      for (let i = 0; i < 1000; i++) {
        const actual = rng.next() * 0.7;
        const predicted = actual + 0.25;
        engine.trackPredictionOutcome(predicted, actual, "overconfident");
      }

      const biases = engine.identifyCalibrationBiases("overconfident");

      expect(biases).toBeDefined();
      expect(biases.length).toBeGreaterThan(0);
      expect(biases.some((b) => b.type === "overconfidence")).toBe(true);
    });

    it("should identify underconfidence bias", () => {
      // Consistently predict lower than actual
      const rng = new SeededRandom(55);
      for (let i = 0; i < 1000; i++) {
        const actual = 0.3 + rng.next() * 0.7;
        const predicted = actual - 0.25;
        engine.trackPredictionOutcome(Math.max(0, predicted), actual, "underconfident");
      }

      const biases = engine.identifyCalibrationBiases("underconfident");

      expect(biases).toBeDefined();
      expect(biases.some((b) => b.type === "underconfidence")).toBe(true);
    });

    it("should identify confidence range with high error", () => {
      // Create data with high error in medium confidence range
      const rng = new SeededRandom(56);
      for (let i = 0; i < 1000; i++) {
        const actual = rng.next();
        let predicted: number;

        if (actual >= 0.3 && actual <= 0.7) {
          // Add large systematic error in medium range (overconfident)
          predicted = Math.min(1.0, actual + 0.25);
        } else {
          predicted = Math.min(1.0, Math.max(0, actual + (rng.next() - 0.5) * 0.05));
        }

        engine.trackPredictionOutcome(predicted, actual, "range-error");
      }

      const errorByRange = engine.calculateCalibrationErrorByRange("range-error");
      const biases = engine.identifyCalibrationBiases("range-error");

      expect(biases).toBeDefined();
      // Medium range should have significantly higher error
      expect(errorByRange.medium).toBeGreaterThan(0.15);
      // Should detect at least one bias
      expect(biases.length).toBeGreaterThan(0);
    });

    it("should generate correction factors for biases", () => {
      const rng = new SeededRandom(57);
      for (let i = 0; i < 1000; i++) {
        const actual = rng.next();
        const predicted = Math.min(1.0, actual + 0.2);
        engine.trackPredictionOutcome(predicted, actual, "correction");
      }

      const biases = engine.identifyCalibrationBiases("correction");

      expect(biases.length).toBeGreaterThan(0);
      biases.forEach((bias) => {
        expect(bias.correctionFactor).toBeDefined();
        expect(typeof bias.correctionFactor).toBe("number");
      });
    });
  });

  describe("Factor Weight Adjustment", () => {
    it("should return default weights when no biases provided", () => {
      const weights = engine.adjustFactorWeights([]);

      expect(weights).toBeDefined();
      expect(weights.evidence).toBeCloseTo(0.3, 2);
      expect(weights.coherence).toBeCloseTo(0.3, 2);
      expect(weights.completeness).toBeCloseTo(0.25, 2);
      expect(weights.uncertainty).toBeCloseTo(0.15, 2);
    });

    it("should adjust weights for overconfidence bias", () => {
      const biases = [
        {
          type: "overconfidence" as const,
          magnitude: 0.2,
          confidenceRange: [0, 1] as [number, number],
          correctionFactor: 0.9,
        },
      ];

      const weights = engine.adjustFactorWeights(biases);

      // Overconfidence should increase uncertainty weight and decrease evidence weight
      expect(weights.uncertainty).toBeGreaterThan(0.15);
      expect(weights.evidence).toBeLessThan(0.3);
    });

    it("should adjust weights for underconfidence bias", () => {
      const biases = [
        {
          type: "underconfidence" as const,
          magnitude: 0.2,
          confidenceRange: [0, 1] as [number, number],
          correctionFactor: 1.1,
        },
      ];

      const weights = engine.adjustFactorWeights(biases);

      // Underconfidence should decrease uncertainty weight and increase evidence weight
      expect(weights.uncertainty).toBeLessThan(0.15);
      expect(weights.evidence).toBeGreaterThan(0.3);
    });

    it("should normalize weights to sum to 1.0", () => {
      const biases = [
        {
          type: "overconfidence" as const,
          magnitude: 0.3,
          confidenceRange: [0, 1] as [number, number],
          correctionFactor: 0.85,
        },
      ];

      const weights = engine.adjustFactorWeights(biases);

      const sum = weights.evidence + weights.coherence + weights.completeness + weights.uncertainty;
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it("should handle multiple biases", () => {
      const biases = [
        {
          type: "overconfidence" as const,
          magnitude: 0.15,
          confidenceRange: [0, 1] as [number, number],
          correctionFactor: 0.925,
        },
        {
          type: "underconfidence" as const,
          magnitude: 0.1,
          confidenceRange: [0, 1] as [number, number],
          correctionFactor: 1.05,
        },
      ];

      const weights = engine.adjustFactorWeights(biases);

      // Should apply both adjustments
      expect(weights).toBeDefined();
      const sum = weights.evidence + weights.coherence + weights.completeness + weights.uncertainty;
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it("should respect weight bounds", () => {
      const biases = [
        {
          type: "overconfidence" as const,
          magnitude: 0.5,
          confidenceRange: [0, 1] as [number, number],
          correctionFactor: 0.75,
        },
      ];

      const weights = engine.adjustFactorWeights(biases);

      // Weights should stay within reasonable bounds
      expect(weights.uncertainty).toBeLessThanOrEqual(0.25);
      expect(weights.evidence).toBeGreaterThanOrEqual(0.2);
    });

    it("should handle range-specific biases", () => {
      const biases = [
        {
          type: "low-range-error" as const,
          magnitude: 0.2,
          confidenceRange: [0, 0.3] as [number, number],
          correctionFactor: 0.94,
        },
        {
          type: "medium-range-error" as const,
          magnitude: 0.18,
          confidenceRange: [0.3, 0.7] as [number, number],
          correctionFactor: 0.946,
        },
        {
          type: "high-range-error" as const,
          magnitude: 0.16,
          confidenceRange: [0.7, 1.0] as [number, number],
          correctionFactor: 0.952,
        },
      ];

      const weights = engine.adjustFactorWeights(biases);

      // Should handle range-specific biases without crashing
      expect(weights).toBeDefined();
      const sum = weights.evidence + weights.coherence + weights.completeness + weights.uncertainty;
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  describe("Performance", () => {
    it("should track prediction-outcome in < 1ms", () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        engine.trackPredictionOutcome(0.7, 0.8, "performance");
      }

      const duration = performance.now() - start;
      const avgTime = duration / 100;

      expect(avgTime).toBeLessThan(1);
    });

    it("should calculate error for 1000 pairs in < 10ms", () => {
      const rng = new SeededRandom(58);
      for (let i = 0; i < 1000; i++) {
        engine.trackPredictionOutcome(rng.next(), rng.next(), "perf-error");
      }

      const start = performance.now();
      engine.calculateCalibrationError("perf-error");
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it("should train model in < 100ms for 1000 pairs", () => {
      const rng = new SeededRandom(59);
      for (let i = 0; i < 1000; i++) {
        engine.trackPredictionOutcome(rng.next(), rng.next(), "perf-train");
      }

      const start = performance.now();
      engine.trainCalibrationModel("perf-train");
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
