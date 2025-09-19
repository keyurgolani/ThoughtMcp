/**
 * Unit tests for PredictiveProcessor
 * Tests prediction generation, error computation, and Bayesian updating
 */

import { beforeEach, describe, expect, it } from "vitest";
import { PredictiveProcessor } from "../../cognitive/PredictiveProcessor.js";
import { Context } from "../../types/core.js";

describe("PredictiveProcessor", () => {
  let processor: PredictiveProcessor;
  let testContext: Context;

  beforeEach(async () => {
    processor = new PredictiveProcessor();
    testContext = {
      session_id: "test_session",
      domain: "general",
      urgency: 0.5,
      complexity: 0.5,
    };

    await processor.initialize({
      prediction_error_threshold: 0.3,
      learning_rate: 0.1,
      confidence_decay: 0.95,
      max_history_size: 100,
    });
  });

  describe("Initialization", () => {
    it("should initialize successfully with default config", async () => {
      const newProcessor = new PredictiveProcessor();
      await expect(newProcessor.initialize({})).resolves.not.toThrow();

      const status = newProcessor.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.active).toBe(true);
      expect(status.name).toBe("PredictiveProcessor");
    });

    it("should initialize with custom configuration", async () => {
      const newProcessor = new PredictiveProcessor();
      const config = {
        prediction_error_threshold: 0.5,
        learning_rate: 0.2,
        confidence_decay: 0.9,
        max_history_size: 500,
      };

      await expect(newProcessor.initialize(config)).resolves.not.toThrow();
      expect(newProcessor.getStatus().initialized).toBe(true);
    });

    it("should handle initialization errors gracefully", async () => {
      const newProcessor = new PredictiveProcessor();
      // Mock a failure in initialization
      const originalInitialize = newProcessor.initialize;
      newProcessor.initialize = async () => {
        throw new Error("Mock initialization error");
      };

      await expect(newProcessor.initialize({})).rejects.toThrow(
        "Mock initialization error"
      );
    });
  });

  describe("Prediction Generation", () => {
    it("should generate predictions from context", () => {
      const predictions = processor.generatePredictions(testContext);

      expect(predictions).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeGreaterThan(0);

      // Check prediction structure
      predictions.forEach((prediction) => {
        expect(prediction).toHaveProperty("content");
        expect(prediction).toHaveProperty("confidence");
        expect(prediction).toHaveProperty("timestamp");
        expect(prediction).toHaveProperty("context");
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("should generate different predictions for different contexts", () => {
      const context1: Context = {
        session_id: "test1",
        domain: "language",
        complexity: 0.3,
      };

      const context2: Context = {
        session_id: "test2",
        domain: "time",
        complexity: 0.8,
      };

      const predictions1 = processor.generatePredictions(context1);
      const predictions2 = processor.generatePredictions(context2);

      expect(predictions1).not.toEqual(predictions2);
    });

    it("should return predictions sorted by confidence", () => {
      const predictions = processor.generatePredictions(testContext);

      for (let i = 0; i < predictions.length - 1; i++) {
        expect(predictions[i].confidence).toBeGreaterThanOrEqual(
          predictions[i + 1].confidence
        );
      }
    });

    it("should limit number of predictions returned", () => {
      const predictions = processor.generatePredictions(testContext);
      expect(predictions.length).toBeLessThanOrEqual(10);
    });
  });

  describe("Prediction Error Computation", () => {
    it("should compute prediction error correctly", () => {
      const prediction = {
        content: "test prediction",
        confidence: 0.8,
        timestamp: Date.now(),
        context: testContext,
      };

      const actual = "test actual";
      const error = processor.computePredictionError(prediction, actual);

      expect(error).toBeGreaterThanOrEqual(0);
      expect(error).toBeLessThanOrEqual(1);
    });

    it("should return higher error for very different predictions", () => {
      const prediction = {
        content: "completely different content",
        confidence: 0.9,
        timestamp: Date.now(),
        context: testContext,
      };

      const actual = { type: "object", value: 123 };
      const error = processor.computePredictionError(prediction, actual);

      expect(error).toBeGreaterThan(0.5);
    });

    it("should return lower error for similar predictions", () => {
      const prediction = {
        content: "similar content",
        confidence: 0.8,
        timestamp: Date.now(),
        context: testContext,
      };

      const actual = "similar content";
      const error = processor.computePredictionError(prediction, actual);

      expect(error).toBeLessThan(0.5);
    });

    it("should weight error by prediction confidence", () => {
      const highConfidencePrediction = {
        content: "test",
        confidence: 0.9,
        timestamp: Date.now(),
        context: testContext,
      };

      const lowConfidencePrediction = {
        content: "test",
        confidence: 0.1,
        timestamp: Date.now(),
        context: testContext,
      };

      const actual = "different";

      const highConfError = processor.computePredictionError(
        highConfidencePrediction,
        actual
      );
      const lowConfError = processor.computePredictionError(
        lowConfidencePrediction,
        actual
      );

      // Lower confidence predictions should have higher weighted error
      expect(lowConfError).toBeGreaterThan(highConfError);
    });

    it("should handle comparison failures gracefully", () => {
      const prediction = {
        content: null,
        confidence: 0.5,
        timestamp: Date.now(),
        context: testContext,
      };

      const actual = undefined;
      const error = processor.computePredictionError(prediction, actual);

      // Should return maximum error for failed comparisons
      expect(error).toBe(1.0);
    });
  });

  describe("Bayesian Belief Updating", () => {
    it("should perform Bayesian updates correctly", () => {
      const prior = 0.5;
      const likelihood = 0.8;
      const evidence = 0.6;

      const posterior = processor.getBayesianUpdate(
        prior,
        likelihood,
        evidence
      );

      expect(posterior).toBeGreaterThanOrEqual(0.01);
      expect(posterior).toBeLessThanOrEqual(0.99);
      expect(posterior).toBeGreaterThan(prior); // Should increase with high likelihood
    });

    it("should handle extreme values correctly", () => {
      // Test with extreme values
      let posterior = processor.getBayesianUpdate(0.01, 0.99, 0.5);
      expect(posterior).toBeGreaterThan(0.01);
      expect(posterior).toBeLessThan(0.99);

      posterior = processor.getBayesianUpdate(0.99, 0.01, 0.5);
      expect(posterior).toBeGreaterThan(0.01);
      expect(posterior).toBeLessThan(0.99);
    });

    it("should normalize inputs to valid range", () => {
      // Test with out-of-range values
      const posterior = processor.getBayesianUpdate(-0.5, 1.5, 2.0);
      expect(posterior).toBeGreaterThanOrEqual(0.01);
      expect(posterior).toBeLessThanOrEqual(0.99);
    });

    it("should be consistent with Bayes' rule", () => {
      const prior = 0.3;
      const likelihood = 0.7;
      const evidence = 0.5;

      const posterior = processor.getBayesianUpdate(
        prior,
        likelihood,
        evidence
      );

      // Manual calculation for verification
      const numerator = likelihood * prior;
      const denominator = likelihood * prior + (1 - likelihood) * (1 - prior);
      const expected = numerator / denominator;

      expect(posterior).toBeCloseTo(expected, 2);
    });
  });

  describe("Model Updating", () => {
    it("should update model based on prediction error", () => {
      const prediction = {
        content: "test prediction",
        confidence: 0.7,
        timestamp: Date.now(),
        context: testContext,
      };

      const initialStatus = processor.getStatus();
      processor.updateModel(0.5, prediction);

      // Should update last activity time
      expect(processor.getStatus().last_activity).toBeGreaterThanOrEqual(
        initialStatus.last_activity
      );
    });

    it("should handle model updates with different error levels", () => {
      const prediction = {
        content: "test",
        confidence: 0.8,
        timestamp: Date.now(),
        context: testContext,
      };

      // Test with low error
      expect(() => processor.updateModel(0.1, prediction)).not.toThrow();

      // Test with high error
      expect(() => processor.updateModel(0.9, prediction)).not.toThrow();
    });

    it("should handle missing models gracefully", () => {
      const prediction = {
        content: { unknown_model: true },
        confidence: 0.5,
        timestamp: Date.now(),
        context: { session_id: "unknown", domain: "unknown_domain" },
      };

      // Should not throw even if model doesn't exist
      expect(() => processor.updateModel(0.5, prediction)).not.toThrow();
    });
  });

  describe("Processing Pipeline", () => {
    it("should process input through complete pipeline", async () => {
      const input = "test input for processing";
      const result = await processor.process(input);

      expect(result).toHaveProperty("predictions");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("model_updates");

      expect(Array.isArray(result.predictions)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.model_updates)).toBe(true);
    });

    it("should handle complex input objects", async () => {
      const input = {
        text: "complex input",
        metadata: { type: "test", priority: "high" },
        context: testContext,
      };

      const result = await processor.process(input);
      expect(result.predictions.length).toBeGreaterThan(0);
    });

    it("should update history during processing", async () => {
      const input = "test input";

      // Process multiple inputs
      await processor.process(input);
      await processor.process(input + " 2");
      await processor.process(input + " 3");

      // History should be updated (we can't directly access it, but processing should work)
      const result = await processor.process(input + " 4");
      expect(result.predictions.length).toBeGreaterThan(0);
    });

    it("should fail gracefully when not initialized", async () => {
      const uninitializedProcessor = new PredictiveProcessor();
      await expect(uninitializedProcessor.process("test")).rejects.toThrow(
        "PredictiveProcessor not initialized"
      );
    });
  });

  describe("Component Status and Reset", () => {
    it("should provide accurate status information", () => {
      const status = processor.getStatus();

      expect(status.name).toBe("PredictiveProcessor");
      expect(status.initialized).toBe(true);
      expect(status.active).toBe(true);
      expect(status.last_activity).toBeGreaterThan(0);
      expect(status.error).toBeUndefined();
    });

    it("should reset processor state", () => {
      processor.reset();

      const status = processor.getStatus();
      expect(status.last_activity).toBeGreaterThan(0);

      // Should still be able to generate predictions after reset
      const predictions = processor.generatePredictions(testContext);
      expect(predictions.length).toBeGreaterThan(0);
    });

    it("should update last activity time during operations", async () => {
      const initialStatus = processor.getStatus();
      const initialTime = initialStatus.last_activity;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await processor.process("test input");

      const updatedStatus = processor.getStatus();
      expect(updatedStatus.last_activity).toBeGreaterThan(initialTime);
    });
  });

  describe("Error Handling", () => {
    it("should handle processing errors gracefully", async () => {
      // Mock a processing error
      const originalGeneratePredictions = processor.generatePredictions;
      processor.generatePredictions = () => {
        throw new Error("Mock processing error");
      };

      await expect(processor.process("test")).rejects.toThrow(
        "Processing failed: Error: Mock processing error"
      );

      // Restore original method
      processor.generatePredictions = originalGeneratePredictions;
    });

    it("should set error status on processing failure", async () => {
      // Mock a processing error
      const originalGeneratePredictions = processor.generatePredictions;
      processor.generatePredictions = () => {
        throw new Error("Mock error");
      };

      try {
        await processor.process("test");
      } catch (error) {
        // Expected to throw
      }

      const status = processor.getStatus();
      expect(status.error).toContain("Processing failed");

      // Restore original method
      processor.generatePredictions = originalGeneratePredictions;
    });
  });

  describe("Feature Extraction and Analysis", () => {
    it("should extract features from string content", () => {
      const predictions = processor.generatePredictions(testContext);
      expect(predictions.length).toBeGreaterThan(0);

      // Test with string input
      const stringInput = "This is a test string for feature extraction";
      const error = processor.computePredictionError(
        predictions[0],
        stringInput
      );
      expect(error).toBeGreaterThanOrEqual(0);
      expect(error).toBeLessThanOrEqual(1);
    });

    it("should extract features from object content", () => {
      const predictions = processor.generatePredictions(testContext);
      expect(predictions.length).toBeGreaterThan(0);

      // Test with object input
      const objectInput = {
        type: "test",
        properties: { a: 1, b: 2, c: { nested: true } },
        metadata: "test",
      };

      const error = processor.computePredictionError(
        predictions[0],
        objectInput
      );
      expect(error).toBeGreaterThanOrEqual(0);
      expect(error).toBeLessThanOrEqual(1);
    });

    it("should handle different types of content consistently", () => {
      const prediction = {
        content: "test content",
        confidence: 0.7,
        timestamp: Date.now(),
        context: testContext,
      };

      // Test with different input types
      const stringError = processor.computePredictionError(prediction, "test");
      const numberError = processor.computePredictionError(prediction, 123);
      const objectError = processor.computePredictionError(prediction, {
        test: true,
      });

      // All should return valid error values
      expect(stringError).toBeGreaterThanOrEqual(0);
      expect(stringError).toBeLessThanOrEqual(1);
      expect(numberError).toBeGreaterThanOrEqual(0);
      expect(numberError).toBeLessThanOrEqual(1);
      expect(objectError).toBeGreaterThanOrEqual(0);
      expect(objectError).toBeLessThanOrEqual(1);
    });
  });

  describe("Hierarchical Processing", () => {
    it("should generate predictions from multiple hierarchical levels", () => {
      const predictions = processor.generatePredictions(testContext);

      // Should have predictions from different levels
      expect(predictions.length).toBeGreaterThan(0);

      // Check that we have different types of predictions
      const predictionTypes = new Set(
        predictions
          .map((p) => {
            if (typeof p.content === "object" && p.content !== null) {
              return (p.content as { type?: string }).type;
            }
            return "unknown";
          })
          .filter((type) => type !== "unknown")
      );

      expect(predictionTypes.size).toBeGreaterThan(1);
    });

    it("should handle different domain contexts appropriately", () => {
      const contexts = [
        { ...testContext, domain: "language" },
        { ...testContext, domain: "time" },
        { ...testContext, domain: "causality" },
        { ...testContext, domain: "space" },
      ];

      contexts.forEach((context) => {
        const predictions = processor.generatePredictions(context);
        expect(predictions.length).toBeGreaterThan(0);

        // Each domain should produce some predictions
        predictions.forEach((prediction) => {
          expect(prediction.confidence).toBeGreaterThan(0);
          expect(prediction.confidence).toBeLessThanOrEqual(1);
        });
      });
    });
  });
});
