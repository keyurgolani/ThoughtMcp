/**
 * Types and interfaces for confidence calibration system
 *
 * This module defines the types for multi-dimensional confidence assessment,
 * calibration learning, and confidence communication.
 */

/**
 * Uncertainty type classification
 *
 * Classifies the type of uncertainty present in reasoning to enable
 * appropriate confidence assessment and communication strategies.
 */
export enum UncertaintyType {
  /** Lack of knowledge or information (reducible through learning) */
  EPISTEMIC = "epistemic",
  /** Inherent randomness or variability (irreducible) */
  ALEATORY = "aleatory",
  /** Multiple valid interpretations or ambiguous information */
  AMBIGUITY = "ambiguity",
}

/**
 * Confidence factor
 *
 * Represents a single dimension of confidence assessment with its
 * score, weight, and explanation.
 */
export interface ConfidenceFactor {
  /** Dimension name (e.g., 'evidence', 'coherence', 'completeness') */
  dimension: string;
  /** Score for this dimension (0-1) */
  score: number;
  /** Weight of this dimension in overall confidence (0-1) */
  weight: number;
  /** Human-readable explanation of the score */
  explanation: string;
}

/**
 * Confidence assessment result
 *
 * Complete multi-dimensional confidence assessment including overall
 * confidence, individual dimension scores, uncertainty classification,
 * and detailed factor breakdown.
 */
export interface ConfidenceAssessment {
  /** Overall confidence score (0-1) */
  overallConfidence: number;
  /** Evidence quality score (0-1) */
  evidenceQuality: number;
  /** Reasoning coherence score (0-1) */
  reasoningCoherence: number;
  /** Completeness score (0-1) */
  completeness: number;
  /** Uncertainty level (0-1, higher means more uncertain) */
  uncertaintyLevel: number;
  /** Type of uncertainty present */
  uncertaintyType: UncertaintyType;
  /** Detailed breakdown of confidence factors */
  factors: ConfidenceFactor[];
  /** When assessment was performed */
  timestamp: Date;
  /** Time taken to perform assessment (milliseconds) */
  processingTime: number;
}

/**
 * Calibration model
 *
 * Stores calibration parameters for adjusting raw confidence scores
 * based on historical performance data.
 */
export interface CalibrationModel {
  /** Domain or context this model applies to */
  domain: string;
  /** Number of prediction-outcome pairs used for training */
  sampleSize: number;
  /** Calibration slope (how much to adjust confidence) */
  slope: number;
  /** Calibration intercept (baseline adjustment) */
  intercept: number;
  /** Mean absolute calibration error */
  calibrationError: number;
  /** When model was last updated */
  lastUpdated: Date;
}

/**
 * Prediction-outcome pair
 *
 * Records a predicted confidence and actual outcome for calibration
 * learning and model training.
 */
export interface PredictionOutcomePair {
  /** Predicted confidence (0-1) */
  predictedConfidence: number;
  /** Actual outcome (0=failure, 1=success) */
  actualOutcome: number;
  /** Context or domain */
  domain: string;
  /** When prediction was made */
  timestamp: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Calibration bias
 *
 * Identifies systematic biases in confidence calibration that need
 * correction (e.g., overconfidence, underconfidence).
 */
export interface CalibrationBias {
  /** Type of bias (e.g., 'overconfidence', 'underconfidence') */
  type: string;
  /** Magnitude of bias (-1 to +1) */
  magnitude: number;
  /** Confidence range where bias occurs */
  confidenceRange: [number, number];
  /** Suggested correction factor */
  correctionFactor: number;
}

/**
 * Factor breakdown for communication
 *
 * Detailed breakdown of confidence factors for user communication,
 * including visual representation hints.
 */
export interface FactorBreakdown {
  /** Overall confidence */
  overall: number;
  /** Individual factors with scores and explanations */
  factors: ConfidenceFactor[];
  /** Strengths (high-scoring factors) */
  strengths: string[];
  /** Weaknesses (low-scoring factors) */
  weaknesses: string[];
  /** Recommended actions to improve confidence */
  recommendations: string[];
}
