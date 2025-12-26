/**
 * Calibration Learning Engine
 *
 * Tracks prediction-outcome pairs, calculates calibration error, trains
 * domain-specific calibration models, and improves confidence accuracy over time.
 */

import type { CalibrationBias, CalibrationModel, PredictionOutcomePair } from "./types";

/**
 * Improvement metrics for tracking calibration learning progress
 */
export interface ImprovementMetrics {
  /** Total number of prediction-outcome pairs */
  sampleCount: number;
  /** Current calibration error */
  currentError: number;
  /** Rate of improvement (error reduction per 100 samples) */
  improvementRate: number;
  /** Initial error when tracking started */
  initialError?: number;
}

/**
 * Calibration error by confidence range
 */
export interface CalibrationErrorByRange {
  /** Error in low confidence range (0-0.3) */
  low: number;
  /** Error in medium confidence range (0.3-0.7) */
  medium: number;
  /** Error in high confidence range (0.7-1.0) */
  high: number;
}

/**
 * Calibration Learning Engine
 *
 * Implements prediction-outcome tracking, calibration error calculation,
 * domain-specific model training, and adaptive learning to improve
 * confidence calibration accuracy over time.
 */
export class CalibrationLearningEngine {
  /** Storage for prediction-outcome pairs by domain */
  private predictionOutcomes: Map<string, PredictionOutcomePair[]>;

  /** Trained calibration models by domain */
  private calibrationModels: Map<string, CalibrationModel>;

  /** Minimum samples required for model training */
  private readonly MIN_TRAINING_SAMPLES = 1000;

  constructor() {
    this.predictionOutcomes = new Map();
    this.calibrationModels = new Map();
  }

  /**
   * Track a prediction-outcome pair
   *
   * Stores a predicted confidence and actual outcome for later calibration
   * learning and model training.
   *
   * @param predictedConfidence - Predicted confidence (0-1)
   * @param actualOutcome - Actual outcome (0-1, where 1=success, 0=failure)
   * @param domain - Domain or context for this prediction
   * @param metadata - Optional additional metadata
   * @throws Error if confidence or outcome is out of valid range
   */
  trackPredictionOutcome(
    predictedConfidence: number,
    actualOutcome: number,
    domain: string,
    metadata?: Record<string, unknown>
  ): void {
    // Validate inputs
    if (predictedConfidence < 0 || predictedConfidence > 1) {
      throw new Error("Confidence must be between 0 and 1");
    }
    if (actualOutcome < 0 || actualOutcome > 1) {
      throw new Error("Outcome must be between 0 and 1");
    }

    // Create prediction-outcome pair
    const pair: PredictionOutcomePair = {
      predictedConfidence,
      actualOutcome,
      domain,
      timestamp: new Date(),
      metadata,
    };

    // Store in domain-specific collection
    if (!this.predictionOutcomes.has(domain)) {
      this.predictionOutcomes.set(domain, []);
    }
    const domainPairs = this.predictionOutcomes.get(domain);
    if (domainPairs) {
      domainPairs.push(pair);
    }
  }

  /**
   * Get all prediction-outcome pairs for a domain
   *
   * @param domain - Domain to retrieve pairs for
   * @returns Array of prediction-outcome pairs
   */
  getPredictionOutcomes(domain: string): PredictionOutcomePair[] {
    return this.predictionOutcomes.get(domain) ?? [];
  }

  /**
   * Get prediction-outcome pairs within a time range
   *
   * @param domain - Domain to retrieve pairs for
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @returns Array of prediction-outcome pairs within time range
   */
  getPredictionOutcomesByTimeRange(
    domain: string,
    startTime: Date,
    endTime: Date
  ): PredictionOutcomePair[] {
    const pairs = this.getPredictionOutcomes(domain);
    return pairs.filter((pair) => pair.timestamp >= startTime && pair.timestamp <= endTime);
  }

  /**
   * Calculate calibration error for a domain
   *
   * Computes mean absolute error between predicted confidence and
   * actual outcomes.
   *
   * @param domain - Domain to calculate error for
   * @returns Mean absolute calibration error (0-1)
   */
  calculateCalibrationError(domain: string): number {
    const pairs = this.getPredictionOutcomes(domain);

    if (pairs.length === 0) {
      return 0;
    }

    // Calculate mean absolute error
    const totalError = pairs.reduce(
      (sum, pair) => sum + Math.abs(pair.predictedConfidence - pair.actualOutcome),
      0
    );

    return totalError / pairs.length;
  }

  /**
   * Calculate calibration error by confidence range
   *
   * Computes error separately for low (0-0.3), medium (0.3-0.7),
   * and high (0.7-1.0) confidence ranges.
   *
   * @param domain - Domain to calculate error for
   * @returns Error by confidence range
   */
  calculateCalibrationErrorByRange(domain: string): CalibrationErrorByRange {
    const pairs = this.getPredictionOutcomes(domain);

    const ranges = {
      low: pairs.filter((p) => p.predictedConfidence < 0.3),
      medium: pairs.filter((p) => p.predictedConfidence >= 0.3 && p.predictedConfidence < 0.7),
      high: pairs.filter((p) => p.predictedConfidence >= 0.7),
    };

    const calculateError = (rangePairs: PredictionOutcomePair[]): number => {
      if (rangePairs.length === 0) return 0;
      const totalError = rangePairs.reduce(
        (sum, pair) => sum + Math.abs(pair.predictedConfidence - pair.actualOutcome),
        0
      );
      return totalError / rangePairs.length;
    };

    return {
      low: calculateError(ranges.low),
      medium: calculateError(ranges.medium),
      high: calculateError(ranges.high),
    };
  }

  /**
   * Train calibration model for a domain
   *
   * Uses linear regression to learn calibration parameters (slope and
   * intercept) that adjust raw confidence scores based on historical
   * performance data.
   *
   * Requires at least 1000 prediction-outcome pairs for training.
   *
   * @param domain - Domain to train model for
   * @returns Trained calibration model
   * @throws Error if insufficient data for training
   */
  trainCalibrationModel(domain: string): CalibrationModel {
    const pairs = this.getPredictionOutcomes(domain);

    if (pairs.length < this.MIN_TRAINING_SAMPLES) {
      throw new Error(
        `Insufficient data for training. Need ${this.MIN_TRAINING_SAMPLES} samples, have ${pairs.length}`
      );
    }

    // Extract x (predicted) and y (actual) values
    const x = pairs.map((p) => p.predictedConfidence);
    const y = pairs.map((p) => p.actualOutcome);

    // Calculate means
    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;

    // Calculate slope using least squares
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < x.length; i++) {
      numerator += (x[i] - meanX) * (y[i] - meanY);
      denominator += (x[i] - meanX) * (x[i] - meanX);
    }

    const slope = denominator !== 0 ? numerator / denominator : 1.0;
    const intercept = meanY - slope * meanX;

    // Calculate calibration error with this model
    let totalCalibratedError = 0;
    for (let i = 0; i < x.length; i++) {
      const calibrated = Math.max(0, Math.min(1, slope * x[i] + intercept));
      totalCalibratedError += Math.abs(calibrated - y[i]);
    }
    const calibrationError = totalCalibratedError / x.length;

    // Create and store model
    const model: CalibrationModel = {
      domain,
      sampleSize: pairs.length,
      slope,
      intercept,
      calibrationError,
      lastUpdated: new Date(),
    };

    this.calibrationModels.set(domain, model);

    return model;
  }

  /**
   * Get calibration model for a domain
   *
   * @param domain - Domain to get model for
   * @returns Calibration model or undefined if not trained
   */
  getCalibrationModel(domain: string): CalibrationModel | undefined {
    return this.calibrationModels.get(domain);
  }

  /**
   * Get improvement metrics for a domain
   *
   * Tracks calibration error reduction and learning progress over time.
   *
   * @param domain - Domain to get metrics for
   * @returns Improvement metrics
   */
  getImprovementMetrics(domain: string): ImprovementMetrics {
    const pairs = this.getPredictionOutcomes(domain);
    const currentError = this.calculateCalibrationError(domain);

    // Calculate initial error (first 100 samples)
    let initialError: number | undefined;
    if (pairs.length >= 100) {
      const initialPairs = pairs.slice(0, 100);
      const initialTotalError = initialPairs.reduce(
        (sum, pair) => sum + Math.abs(pair.predictedConfidence - pair.actualOutcome),
        0
      );
      initialError = initialTotalError / initialPairs.length;
    }

    // Calculate improvement rate
    let improvementRate = 0;
    if (initialError !== undefined && pairs.length > 100) {
      const errorReduction = initialError - currentError;
      const sampleIncrease = pairs.length - 100;
      improvementRate = (errorReduction / sampleIncrease) * 100; // Per 100 samples
    }

    return {
      sampleCount: pairs.length,
      currentError,
      improvementRate,
      initialError,
    };
  }

  /**
   * Identify calibration biases
   *
   * Detects systematic biases in confidence calibration such as
   * overconfidence, underconfidence, or range-specific errors.
   *
   * @param domain - Domain to analyze for biases
   * @returns Array of identified calibration biases
   */
  identifyCalibrationBiases(domain: string): CalibrationBias[] {
    const pairs = this.getPredictionOutcomes(domain);
    const biases: CalibrationBias[] = [];

    if (pairs.length < 100) {
      return biases; // Need sufficient data
    }

    // Calculate overall bias (predicted - actual)
    const totalBias = pairs.reduce(
      (sum, pair) => sum + (pair.predictedConfidence - pair.actualOutcome),
      0
    );
    const avgBias = totalBias / pairs.length;

    // Detect overconfidence
    if (avgBias > 0.1) {
      biases.push({
        type: "overconfidence",
        magnitude: avgBias,
        confidenceRange: [0, 1],
        correctionFactor: 1.0 - avgBias * 0.5, // Reduce confidence
      });
    }

    // Detect underconfidence
    if (avgBias < -0.1) {
      biases.push({
        type: "underconfidence",
        magnitude: Math.abs(avgBias),
        confidenceRange: [0, 1],
        correctionFactor: 1.0 + Math.abs(avgBias) * 0.5, // Increase confidence
      });
    }

    // Check for range-specific biases
    const errorByRange = this.calculateCalibrationErrorByRange(domain);

    if (errorByRange.low > 0.15) {
      biases.push({
        type: "low-range-error",
        magnitude: errorByRange.low,
        confidenceRange: [0, 0.3],
        correctionFactor: 1.0 - errorByRange.low * 0.3,
      });
    }

    if (errorByRange.medium > 0.15) {
      biases.push({
        type: "medium-range-error",
        magnitude: errorByRange.medium,
        confidenceRange: [0.3, 0.7],
        correctionFactor: 1.0 - errorByRange.medium * 0.3,
      });
    }

    if (errorByRange.high > 0.15) {
      biases.push({
        type: "high-range-error",
        magnitude: errorByRange.high,
        confidenceRange: [0.7, 1.0],
        correctionFactor: 1.0 - errorByRange.high * 0.3,
      });
    }

    return biases;
  }

  /**
   * Adjust factor weights based on identified biases
   *
   * Modifies dimension weights in confidence assessment to correct
   * for systematic biases.
   *
   * @param biases - Array of calibration biases to correct
   * @returns Adjusted factor weights
   */
  adjustFactorWeights(biases: CalibrationBias[]): Record<string, number> {
    // Default weights
    const weights = {
      evidence: 0.3,
      coherence: 0.3,
      completeness: 0.25,
      uncertainty: 0.15,
    };

    // Adjust based on biases
    for (const bias of biases) {
      if (bias.type === "overconfidence") {
        // Increase weight of uncertainty dimension
        weights.uncertainty = Math.min(0.25, weights.uncertainty * 1.2);
        weights.evidence = Math.max(0.2, weights.evidence * 0.95);
      } else if (bias.type === "underconfidence") {
        // Decrease weight of uncertainty dimension
        weights.uncertainty = Math.max(0.1, weights.uncertainty * 0.8);
        weights.evidence = Math.min(0.4, weights.evidence * 1.05);
      }
    }

    // Normalize weights to sum to 1.0
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    for (const key in weights) {
      weights[key as keyof typeof weights] /= total;
    }

    return weights;
  }
}
