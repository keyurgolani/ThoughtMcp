/**
 * Stochastic Neural Processing Implementation
 *
 * Implements biological-like neural variability and probabilistic processing:
 * - Gaussian noise addition to simulate neural variability
 * - Stochastic resonance for weak signal enhancement
 * - Probabilistic decision sampling mechanisms
 * - Temperature-controlled randomness
 */

import {
  ComponentStatus,
  IStochasticNeuralProcessor,
} from "../interfaces/cognitive.js";

// Input structures for stochastic processing
export interface NeuralSignal {
  values: number[];
  strength: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface EnhancedSignal {
  original: number[];
  enhanced: number[];
  noise_added: number[];
  enhancement_factor: number;
  signal_to_noise_ratio: number;
}

export interface StochasticOutput {
  processed_signal: number[];
  noise_level: number;
  enhancement_applied: boolean;
  sampling_temperature: number;
  processing_metadata: {
    original_strength: number;
    final_strength: number;
    noise_contribution: number;
    resonance_detected: boolean;
  };
}

export interface ProbabilisticSample {
  value: number;
  probability: number;
  temperature: number;
  distribution_type: string;
}

/**
 * StochasticNeuralProcessor implements biological-like neural processing
 * with noise, variability, and probabilistic decision making
 */
export class StochasticNeuralProcessor implements IStochasticNeuralProcessor {
  private noise_level: number = 0.1; // Default biological noise level
  private temperature: number = 1.0; // Controls randomness in sampling
  private resonance_threshold: number = 0.3; // Threshold for stochastic resonance
  private max_noise_level: number = 0.5; // Maximum allowed noise

  private status: ComponentStatus = {
    name: "StochasticNeuralProcessor",
    initialized: false,
    active: false,
    last_activity: 0,
  };

  // Random number generator for reproducible results in tests
  private rng: () => number = Math.random;

  /**
   * Initialize the stochastic neural processor with configuration
   */
  async initialize(config: Record<string, unknown>): Promise<void> {
    try {
      this.noise_level = Math.min(
        this.max_noise_level,
        (config?.noise_level as number) ?? 0.1
      );
      this.temperature = (config?.temperature as number) ?? 1.0;
      this.resonance_threshold = (config?.resonance_threshold as number) ?? 0.3;

      // Set up random number generator if provided (for testing)
      if (config?.rng && typeof config.rng === "function") {
        this.rng = config.rng as () => number;
      }

      this.status.initialized = true;
      this.status.active = true;
      this.status.last_activity = Date.now();
    } catch (error) {
      this.status.error = `Initialization failed: ${error}`;
      throw error;
    }
  }

  /**
   * Main processing method - applies stochastic neural processing
   */
  async process(input: NeuralSignal): Promise<StochasticOutput> {
    if (!this.status.initialized) {
      throw new Error("StochasticNeuralProcessor not initialized");
    }

    this.status.last_activity = Date.now();

    try {
      const original_strength = input.strength;

      // Phase 1: Add biological noise
      const noisy_signal = this.addNoise(input.values, this.noise_level);

      // Phase 2: Apply stochastic resonance if signal is weak
      let enhanced_signal = noisy_signal;
      let enhancement_applied = false;
      let resonance_detected = false;

      if (input.strength < this.resonance_threshold) {
        enhanced_signal = this.applyStochasticResonance(
          input.values,
          this.noise_level
        );
        enhancement_applied = true;
        resonance_detected = this.detectResonance(
          input.values,
          enhanced_signal
        );
      }

      // Phase 3: Compute final signal strength
      const final_strength = this.computeSignalStrength(enhanced_signal);

      // Phase 4: Apply probabilistic sampling if needed
      const sampled_signal = this.applySampling(enhanced_signal);

      return {
        processed_signal: sampled_signal,
        noise_level: this.noise_level,
        enhancement_applied,
        sampling_temperature: this.temperature,
        processing_metadata: {
          original_strength,
          final_strength,
          noise_contribution: this.computeNoiseContribution(
            input.values,
            enhanced_signal
          ),
          resonance_detected,
        },
      };
    } catch (error) {
      this.status.error = `Processing failed: ${error}`;
      throw new Error(`Processing failed: ${error}`);
    }
  }

  /**
   * Add Gaussian noise to signal - simulates biological neural variability
   */
  addNoise(signal: number[], noiseLevel: number): number[] {
    if (noiseLevel <= 0) return [...signal];

    return signal.map((value) => {
      const noise = this.generateGaussianNoise(0, noiseLevel);
      return value + noise;
    });
  }

  /**
   * Apply stochastic resonance - noise can enhance weak signal detection
   */
  applyStochasticResonance(signal: number[], noiseLevel: number): number[] {
    // Stochastic resonance works by adding optimal noise to weak signals
    const optimal_noise = this.computeOptimalNoise(signal, noiseLevel);
    const noisy_signal = this.addNoise(signal, optimal_noise);

    // Apply threshold detection with noise
    return this.thresholdDetection(noisy_signal, signal);
  }

  /**
   * Sample from probability distribution - implements probabilistic decisions
   */
  sampleFromDistribution(distribution: number[]): number {
    if (distribution.length === 0) {
      throw new Error("Cannot sample from empty distribution");
    }

    // Normalize distribution
    const sum = distribution.reduce((acc, val) => acc + Math.abs(val), 0);
    if (sum === 0) {
      // Uniform sampling if all values are zero
      return Math.floor(this.rng() * distribution.length);
    }

    const normalized = distribution.map((val) => Math.abs(val) / sum);

    // Apply temperature scaling for controlled randomness
    const temperature_scaled = this.applyTemperatureScaling(
      normalized,
      this.temperature
    );

    // Sample using cumulative distribution
    const random_value = this.rng();
    let cumulative = 0;

    for (let i = 0; i < temperature_scaled.length; i++) {
      cumulative += temperature_scaled[i];
      if (random_value <= cumulative) {
        return i;
      }
    }

    // Fallback to last index
    return distribution.length - 1;
  }

  /**
   * Adjust temperature parameter for randomness control
   */
  adjustTemperature(temperature: number): void {
    this.temperature = Math.max(0.1, Math.min(10.0, temperature));
    this.status.last_activity = Date.now();
  }

  /**
   * Reset processor state
   */
  reset(): void {
    this.noise_level = 0.1;
    this.temperature = 1.0;
    this.status.last_activity = Date.now();
  }

  /**
   * Get current component status
   */
  getStatus(): ComponentStatus {
    return { ...this.status };
  }

  // Private helper methods

  /**
   * Generate Gaussian noise using Box-Muller transform
   */
  private generateGaussianNoise(mean: number = 0, stddev: number = 1): number {
    // Box-Muller transform for Gaussian distribution
    let u1 = this.rng();
    const u2 = this.rng();

    // Ensure u1 is not zero to avoid log(0)
    while (u1 === 0) {
      u1 = this.rng();
    }

    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stddev * z0;
  }

  /**
   * Compute optimal noise level for stochastic resonance
   */
  private computeOptimalNoise(signal: number[], baseNoise: number): number {
    const signal_strength = this.computeSignalStrength(signal);

    // Optimal noise is typically proportional to signal strength
    // but with a minimum level for very weak signals
    const optimal_ratio = 0.3; // Empirically determined
    const min_noise = 0.05;

    return Math.max(min_noise, signal_strength * optimal_ratio, baseNoise);
  }

  /**
   * Apply threshold detection with noise enhancement
   */
  private thresholdDetection(
    noisy_signal: number[],
    original_signal: number[]
  ): number[] {
    const threshold = this.computeAdaptiveThreshold(original_signal);

    return noisy_signal.map((value, index) => {
      // If noisy signal crosses threshold but original didn't,
      // this represents stochastic resonance enhancement
      const original_value = original_signal[index];
      const crosses_threshold = Math.abs(value) > threshold;
      const original_crosses = Math.abs(original_value) > threshold;

      if (crosses_threshold && !original_crosses) {
        // Stochastic resonance detected - enhance the signal
        return original_value + Math.sign(value) * (threshold * 0.5);
      }

      return value;
    });
  }

  /**
   * Compute adaptive threshold based on signal characteristics
   */
  private computeAdaptiveThreshold(signal: number[]): number {
    if (signal.length === 0) return 0.1;

    const mean =
      signal.reduce((sum, val) => sum + Math.abs(val), 0) / signal.length;
    const variance =
      signal.reduce((sum, val) => sum + Math.pow(Math.abs(val) - mean, 2), 0) /
      signal.length;
    const stddev = Math.sqrt(variance);

    // Threshold is typically 2-3 standard deviations above mean
    return mean + 2.5 * stddev;
  }

  /**
   * Detect if stochastic resonance occurred
   */
  private detectResonance(original: number[], enhanced: number[]): boolean {
    const original_strength = this.computeSignalStrength(original);
    const enhanced_strength = this.computeSignalStrength(enhanced);

    // Resonance detected if enhanced signal is significantly stronger
    const enhancement_ratio = enhanced_strength / (original_strength + 1e-10);
    return enhancement_ratio > 1.2; // 20% improvement threshold
  }

  /**
   * Compute signal strength (RMS)
   */
  private computeSignalStrength(signal: number[]): number {
    if (signal.length === 0) return 0;

    const sum_squares = signal.reduce((sum, val) => sum + val * val, 0);
    return Math.sqrt(sum_squares / signal.length);
  }

  /**
   * Compute noise contribution to signal
   */
  private computeNoiseContribution(
    original: number[],
    processed: number[]
  ): number {
    if (original.length !== processed.length) return 0;

    const noise_signal = processed.map((val, i) => val - original[i]);
    return this.computeSignalStrength(noise_signal);
  }

  /**
   * Apply temperature scaling to probability distribution
   */
  private applyTemperatureScaling(
    probabilities: number[],
    temperature: number
  ): number[] {
    if (temperature === 1.0) return probabilities;

    // Apply temperature scaling: p_i = exp(log(p_i) / T)
    const scaled = probabilities.map((p) => {
      if (p <= 0) return 1e-10; // Avoid log(0)
      return Math.exp(Math.log(p) / temperature);
    });

    // Renormalize
    const sum = scaled.reduce((acc, val) => acc + val, 0);
    return scaled.map((val) => val / sum);
  }

  /**
   * Apply probabilistic sampling to signal values
   */
  private applySampling(signal: number[]): number[] {
    if (this.temperature === 1.0) return signal;

    // For each signal value, add temperature-controlled randomness
    return signal.map((value) => {
      const noise_scale = this.temperature * 0.1;
      const sampling_noise = this.generateGaussianNoise(0, noise_scale);
      return value + sampling_noise;
    });
  }

  /**
   * Set random number generator (for testing)
   */
  setRandomNumberGenerator(rng: () => number): void {
    this.rng = rng;
  }

  /**
   * Get current noise level
   */
  getNoiseLevel(): number {
    return this.noise_level;
  }

  /**
   * Get current temperature
   */
  getTemperature(): number {
    return this.temperature;
  }

  /**
   * Set noise level with bounds checking
   */
  setNoiseLevel(level: number): void {
    this.noise_level = Math.max(0, Math.min(this.max_noise_level, level));
    this.status.last_activity = Date.now();
  }
}
