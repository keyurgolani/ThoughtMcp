/**
 * Unit tests for StochasticNeuralProcessor
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  NeuralSignal,
  StochasticNeuralProcessor,
} from "../../cognitive/StochasticNeuralProcessor.js";

describe("StochasticNeuralProcessor", () => {
  let processor: StochasticNeuralProcessor;

  beforeEach(async () => {
    processor = new StochasticNeuralProcessor();
    await processor.initialize({});
  });

  describe("Initialization", () => {
    it("should initialize with default parameters", async () => {
      const newProcessor = new StochasticNeuralProcessor();
      await newProcessor.initialize({});

      const status = newProcessor.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.active).toBe(true);
      expect(status.name).toBe("StochasticNeuralProcessor");
    });

    it("should initialize with custom parameters", async () => {
      const newProcessor = new StochasticNeuralProcessor();
      await newProcessor.initialize({
        noise_level: 0.2,
        temperature: 2.0,
        resonance_threshold: 0.5,
      });

      expect(newProcessor.getNoiseLevel()).toBe(0.2);
      expect(newProcessor.getTemperature()).toBe(2.0);
    });

    it("should limit noise level to maximum allowed", async () => {
      const newProcessor = new StochasticNeuralProcessor();
      await newProcessor.initialize({
        noise_level: 1.0, // Above max of 0.5
      });

      expect(newProcessor.getNoiseLevel()).toBe(0.5);
    });
  });

  describe("Gaussian Noise Addition", () => {
    it("should add noise to signal values", () => {
      const signal = [1.0, 2.0, 3.0, 4.0, 5.0];
      const noisy_signal = processor.addNoise(signal, 0.1);

      expect(noisy_signal).toHaveLength(signal.length);

      // Values should be different due to noise (with high probability)
      const differences = signal.map((val, i) =>
        Math.abs(val - noisy_signal[i])
      );
      const has_noise = differences.some((diff) => diff > 0.01);
      expect(has_noise).toBe(true);
    });

    it("should return original signal when noise level is zero", () => {
      const signal = [1.0, 2.0, 3.0];
      const noisy_signal = processor.addNoise(signal, 0);

      expect(noisy_signal).toEqual(signal);
    });

    it("should handle empty signal", () => {
      const signal: number[] = [];
      const noisy_signal = processor.addNoise(signal, 0.1);

      expect(noisy_signal).toEqual([]);
    });

    it("should produce reproducible results with fixed RNG", async () => {
      // Create processor with fixed random number generator
      const fixedProcessor = new StochasticNeuralProcessor();
      let counter = 0;
      const fixedRng = () => {
        // Simple deterministic sequence
        counter++;
        return (counter * 0.1) % 1.0;
      };

      await fixedProcessor.initialize({ rng: fixedRng });
      fixedProcessor.setRandomNumberGenerator(fixedRng);

      const signal = [1.0, 2.0, 3.0];
      const result1 = fixedProcessor.addNoise(signal, 0.1);

      // Reset counter and test again
      counter = 0;
      const result2 = fixedProcessor.addNoise(signal, 0.1);

      expect(result1).toEqual(result2);
    });
  });

  describe("Stochastic Resonance", () => {
    it("should enhance weak signals", () => {
      const weak_signal = [0.1, 0.05, 0.08, 0.03, 0.06];
      const enhanced = processor.applyStochasticResonance(weak_signal, 0.1);

      expect(enhanced).toHaveLength(weak_signal.length);

      // Enhanced signal should have some differences from original
      const has_enhancement = enhanced.some(
        (val, i) => Math.abs(val - weak_signal[i]) > 0.01
      );
      expect(has_enhancement).toBe(true);
    });

    it("should handle strong signals appropriately", () => {
      const strong_signal = [1.0, 0.8, 0.9, 0.7, 0.85];
      const enhanced = processor.applyStochasticResonance(strong_signal, 0.1);

      expect(enhanced).toHaveLength(strong_signal.length);
      // Should still process the signal
      expect(enhanced).toBeDefined();
    });

    it("should handle zero signal", () => {
      const zero_signal = [0, 0, 0, 0, 0];
      const enhanced = processor.applyStochasticResonance(zero_signal, 0.1);

      expect(enhanced).toHaveLength(zero_signal.length);
      expect(enhanced).toBeDefined();
    });
  });

  describe("Probabilistic Sampling", () => {
    it("should sample from uniform distribution", () => {
      const uniform_dist = [0.25, 0.25, 0.25, 0.25];
      const sample = processor.sampleFromDistribution(uniform_dist);

      expect(sample).toBeGreaterThanOrEqual(0);
      expect(sample).toBeLessThan(uniform_dist.length);
      expect(Number.isInteger(sample)).toBe(true);
    });

    it("should sample from skewed distribution", () => {
      const skewed_dist = [0.8, 0.1, 0.05, 0.05];
      const samples: number[] = [];

      // Take multiple samples to test distribution
      for (let i = 0; i < 100; i++) {
        samples.push(processor.sampleFromDistribution(skewed_dist));
      }

      // First element should be sampled most frequently
      const counts = [0, 0, 0, 0];
      samples.forEach((sample) => counts[sample]++);

      expect(counts[0]).toBeGreaterThan(counts[1]);
      expect(counts[0]).toBeGreaterThan(counts[2]);
      expect(counts[0]).toBeGreaterThan(counts[3]);
    });

    it("should handle zero distribution by uniform sampling", () => {
      const zero_dist = [0, 0, 0, 0];
      const sample = processor.sampleFromDistribution(zero_dist);

      expect(sample).toBeGreaterThanOrEqual(0);
      expect(sample).toBeLessThan(zero_dist.length);
    });

    it("should handle negative values by taking absolute values", () => {
      const negative_dist = [-0.5, -0.3, -0.1, -0.1];
      const sample = processor.sampleFromDistribution(negative_dist);

      expect(sample).toBeGreaterThanOrEqual(0);
      expect(sample).toBeLessThan(negative_dist.length);
    });

    it("should throw error for empty distribution", () => {
      const empty_dist: number[] = [];

      expect(() => {
        processor.sampleFromDistribution(empty_dist);
      }).toThrow("Cannot sample from empty distribution");
    });
  });

  describe("Temperature Control", () => {
    it("should adjust temperature within bounds", () => {
      processor.adjustTemperature(2.5);
      expect(processor.getTemperature()).toBe(2.5);

      processor.adjustTemperature(0.05); // Below minimum
      expect(processor.getTemperature()).toBe(0.1);

      processor.adjustTemperature(15.0); // Above maximum
      expect(processor.getTemperature()).toBe(10.0);
    });

    it("should affect sampling behavior", () => {
      const dist = [0.9, 0.1];

      // Low temperature should be more deterministic
      processor.adjustTemperature(0.1);
      const low_temp_samples: number[] = [];
      for (let i = 0; i < 50; i++) {
        low_temp_samples.push(processor.sampleFromDistribution(dist));
      }

      // High temperature should be more random
      processor.adjustTemperature(5.0);
      const high_temp_samples: number[] = [];
      for (let i = 0; i < 50; i++) {
        high_temp_samples.push(processor.sampleFromDistribution(dist));
      }

      // Low temperature should favor the high probability option more
      const low_temp_zeros = low_temp_samples.filter((s) => s === 0).length;
      const high_temp_zeros = high_temp_samples.filter((s) => s === 0).length;

      expect(low_temp_zeros).toBeGreaterThanOrEqual(high_temp_zeros);
    });
  });

  describe("Full Processing Pipeline", () => {
    it("should process neural signal through complete pipeline", async () => {
      const input_signal: NeuralSignal = {
        values: [0.5, 0.3, 0.8, 0.2, 0.6],
        strength: 0.48, // Calculated as RMS
        timestamp: Date.now(),
      };

      const result = await processor.process(input_signal);

      expect(result.processed_signal).toHaveLength(input_signal.values.length);
      expect(result.noise_level).toBe(processor.getNoiseLevel());
      expect(result.sampling_temperature).toBe(processor.getTemperature());
      expect(result.processing_metadata).toBeDefined();
      expect(result.processing_metadata.original_strength).toBeCloseTo(0.48, 1);
      expect(result.processing_metadata.final_strength).toBeGreaterThan(0);
      expect(
        result.processing_metadata.noise_contribution
      ).toBeGreaterThanOrEqual(0);
    });

    it("should apply stochastic resonance for weak signals", async () => {
      const weak_signal: NeuralSignal = {
        values: [0.1, 0.05, 0.08, 0.03],
        strength: 0.065, // Below resonance threshold
        timestamp: Date.now(),
      };

      const result = await processor.process(weak_signal);

      expect(result.enhancement_applied).toBe(true);
      expect(result.processing_metadata.resonance_detected).toBeDefined();
    });

    it("should not apply resonance for strong signals", async () => {
      const strong_signal: NeuralSignal = {
        values: [0.8, 0.9, 0.7, 0.85],
        strength: 0.825, // Above resonance threshold
        timestamp: Date.now(),
      };

      const result = await processor.process(strong_signal);

      expect(result.enhancement_applied).toBe(false);
    });

    it("should handle empty signal", async () => {
      const empty_signal: NeuralSignal = {
        values: [],
        strength: 0,
        timestamp: Date.now(),
      };

      const result = await processor.process(empty_signal);

      expect(result.processed_signal).toEqual([]);
      expect(result.processing_metadata.original_strength).toBe(0);
      expect(result.processing_metadata.final_strength).toBe(0);
    });

    it("should fail if not initialized", async () => {
      const uninitializedProcessor = new StochasticNeuralProcessor();
      const signal: NeuralSignal = {
        values: [1, 2, 3],
        strength: 1.0,
        timestamp: Date.now(),
      };

      await expect(uninitializedProcessor.process(signal)).rejects.toThrow(
        "StochasticNeuralProcessor not initialized"
      );
    });
  });

  describe("Signal Enhancement Effects", () => {
    it("should demonstrate noise improving weak signal detection", async () => {
      // Create a very weak signal that's hard to detect
      const very_weak_signal: NeuralSignal = {
        values: [0.02, 0.01, 0.015, 0.008, 0.012],
        strength: 0.013,
        timestamp: Date.now(),
      };

      // Process with higher noise level to trigger stochastic resonance
      await processor.initialize({ noise_level: 0.3 });
      const result = await processor.process(very_weak_signal);

      // Should show enhancement
      expect(result.enhancement_applied).toBe(true);
      expect(result.processing_metadata.noise_contribution).toBeGreaterThan(0);

      // Final strength should be different from original
      expect(result.processing_metadata.final_strength).not.toBe(
        result.processing_metadata.original_strength
      );
    });

    it("should maintain signal characteristics while adding variability", async () => {
      const test_signal: NeuralSignal = {
        values: [1.0, -0.5, 0.8, -0.3, 0.6],
        strength: 0.7,
        timestamp: Date.now(),
      };

      const result = await processor.process(test_signal);

      // Should preserve general signal structure
      expect(result.processed_signal).toHaveLength(test_signal.values.length);

      // Should add some variability
      const differences = test_signal.values.map((val, i) =>
        Math.abs(val - result.processed_signal[i])
      );
      const has_variability = differences.some((diff) => diff > 0.01);
      expect(has_variability).toBe(true);
    });
  });

  describe("Component Interface Compliance", () => {
    it("should implement CognitiveComponent interface", () => {
      expect(typeof processor.initialize).toBe("function");
      expect(typeof processor.process).toBe("function");
      expect(typeof processor.reset).toBe("function");
      expect(typeof processor.getStatus).toBe("function");
    });

    it("should implement IStochasticNeuralProcessor interface", () => {
      expect(typeof processor.addNoise).toBe("function");
      expect(typeof processor.applyStochasticResonance).toBe("function");
      expect(typeof processor.sampleFromDistribution).toBe("function");
      expect(typeof processor.adjustTemperature).toBe("function");
    });

    it("should update status correctly", async () => {
      const status_before = processor.getStatus();
      const initial_activity = status_before.last_activity;

      // Wait a bit and perform an operation
      await new Promise((resolve) => setTimeout(resolve, 10));
      processor.adjustTemperature(1.5);

      const status_after = processor.getStatus();
      expect(status_after.last_activity).toBeGreaterThan(initial_activity);
    });

    it("should reset to default state", () => {
      processor.adjustTemperature(3.0);
      processor.setNoiseLevel(0.3);

      processor.reset();

      expect(processor.getTemperature()).toBe(1.0);
      expect(processor.getNoiseLevel()).toBe(0.1);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle extreme noise levels", () => {
      processor.setNoiseLevel(-1.0); // Negative
      expect(processor.getNoiseLevel()).toBe(0);

      processor.setNoiseLevel(2.0); // Too high
      expect(processor.getNoiseLevel()).toBe(0.5); // Max allowed
    });

    it("should handle NaN and Infinity in signals", () => {
      const problematic_signal = [1.0, NaN, Infinity, -Infinity, 0];

      // Should not crash
      expect(() => {
        processor.addNoise(problematic_signal, 0.1);
      }).not.toThrow();
    });

    it("should handle very large signals", () => {
      const large_signal = Array(1000)
        .fill(0)
        .map((_, i) => i * 0.001);
      const noisy = processor.addNoise(large_signal, 0.1);

      expect(noisy).toHaveLength(1000);
    });
  });
});
