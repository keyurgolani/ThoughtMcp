/**
 * Types and interfaces for bias detection and mitigation system
 *
 * This module defines types for detecting and analyzing eight types of
 * cognitive biases in reasoning chains, including confirmation bias,
 * anchoring bias, availability bias, and others.
 */

import type { ReasoningContext } from "../reasoning/types";

/**
 * Types of cognitive biases that can be detected
 *
 * Represents the eight primary cognitive biases monitored by the system.
 */
export enum BiasType {
  /** Tendency to search for, interpret, favor, and recall information that confirms pre-existing beliefs */
  CONFIRMATION = "confirmation",
  /** Over-reliance on the first piece of information encountered (the "anchor") */
  ANCHORING = "anchoring",
  /** Tendency to overestimate the likelihood of events based on their availability in memory */
  AVAILABILITY = "availability",
  /** Tendency to weigh recent information more heavily than older information */
  RECENCY = "recency",
  /** Judging probability based on how much something resembles a typical case */
  REPRESENTATIVENESS = "representativeness",
  /** Drawing different conclusions from the same information depending on how it's presented */
  FRAMING = "framing",
  /** Continuing a behavior or endeavor due to previously invested resources */
  SUNK_COST = "sunk_cost",
  /** Tendency to attribute others' behavior to internal characteristics while attributing own behavior to external factors */
  ATTRIBUTION = "attribution",
}

/**
 * Location of a bias within a reasoning chain
 *
 * Identifies where in the reasoning process a bias was detected.
 */
export interface BiasLocation {
  /** Index of the reasoning step where bias was detected */
  stepIndex: number;
  /** The specific reasoning text that exhibits the bias */
  reasoning: string;
  /** Additional context around the bias */
  context?: string;
}

/**
 * Detected cognitive bias
 *
 * Represents a bias that has been identified in a reasoning chain
 * with severity assessment, confidence, and supporting evidence.
 */
export interface DetectedBias {
  /** Type of bias detected */
  type: BiasType;
  /** Severity of the bias (0-1, where 1 is most severe) */
  severity: number;
  /** Confidence in the detection (0-1) */
  confidence: number;
  /** Evidence supporting the bias detection */
  evidence: string[];
  /** Location(s) where bias was detected */
  location: BiasLocation;
  /** Human-readable explanation of the bias */
  explanation: string;
  /** When the bias was detected */
  detectedAt: Date;
}

/**
 * Reasoning step in a chain
 *
 * Represents a single step in a reasoning process.
 */
export interface ReasoningStep {
  /** Step identifier */
  id: string;
  /** Step description or content */
  content: string;
  /** Type of reasoning step */
  type: "hypothesis" | "evidence" | "inference" | "conclusion" | "assumption";
  /** Confidence in this step (0-1) */
  confidence?: number;
  /** Supporting evidence for this step */
  evidence?: string[];
  /** Timestamp of step */
  timestamp?: Date;
}

/**
 * Branch in reasoning (alternative path)
 *
 * Represents an alternative reasoning path that was considered.
 */
export interface ReasoningBranch {
  /** Branch identifier */
  id: string;
  /** Branch description */
  description: string;
  /** Steps in this branch */
  steps: ReasoningStep[];
  /** Whether this branch was selected */
  selected: boolean;
  /** Reason for selection/rejection */
  rationale?: string;
}

/**
 * Assumption made during reasoning
 *
 * Represents an assumption that underlies the reasoning process.
 */
export interface Assumption {
  /** Assumption identifier */
  id: string;
  /** Assumption content */
  content: string;
  /** Whether assumption is explicit or implicit */
  explicit: boolean;
  /** Confidence in assumption (0-1) */
  confidence?: number;
  /** Supporting evidence */
  evidence?: string[];
}

/**
 * Inference made during reasoning
 *
 * Represents a logical inference drawn from evidence.
 */
export interface Inference {
  /** Inference identifier */
  id: string;
  /** Inference content */
  content: string;
  /** Premises supporting this inference */
  premises: string[];
  /** Confidence in inference (0-1) */
  confidence?: number;
  /** Type of inference */
  type: "deductive" | "inductive" | "abductive";
}

/**
 * Evidence used in reasoning
 *
 * Represents a piece of evidence considered during reasoning.
 */
export interface Evidence {
  /** Evidence identifier */
  id: string;
  /** Evidence content */
  content: string;
  /** Source of evidence */
  source: string;
  /** Reliability of source (0-1) */
  reliability?: number;
  /** Relevance to problem (0-1) */
  relevance?: number;
  /** When evidence was introduced */
  timestamp?: Date;
}

/**
 * Complete reasoning chain
 *
 * Represents the full reasoning process including steps, branches,
 * assumptions, inferences, and evidence.
 */
export interface ReasoningChain {
  /** Chain identifier */
  id: string;
  /** Sequential reasoning steps */
  steps: ReasoningStep[];
  /** Alternative reasoning branches */
  branches: ReasoningBranch[];
  /** Assumptions made */
  assumptions: Assumption[];
  /** Inferences drawn */
  inferences: Inference[];
  /** Evidence considered */
  evidence: Evidence[];
  /** Final conclusion */
  conclusion: string;
  /** Overall confidence (0-1) */
  confidence?: number;
  /** Reasoning context */
  context?: ReasoningContext;
}

/**
 * Pattern of biases over time
 *
 * Tracks recurring bias patterns to enable learning and improved
 * bias detection.
 */
export interface BiasPattern {
  /** Types of biases in this pattern */
  biasTypes: BiasType[];
  /** How often this pattern occurs */
  frequency: number;
  /** Contexts where pattern commonly appears */
  commonContexts: string[];
  /** Average severity of biases in pattern (0-1) */
  averageSeverity: number;
  /** Success rate of corrections (0-1) */
  correctionSuccess?: number;
}

/**
 * Bias detector interface
 *
 * Defines the contract for individual bias detection implementations.
 */
export interface BiasDetector {
  /** Type of bias this detector identifies */
  biasType: BiasType;
  /** Detect bias in a reasoning chain */
  detect(reasoning: ReasoningChain): DetectedBias | null;
  /** Assess severity of a detected bias */
  assessSeverity(bias: DetectedBias): number;
}

/**
 * Bias detection configuration
 *
 * Configuration options for bias detection system.
 */
export interface BiasDetectionConfig {
  /** Minimum confidence threshold for reporting biases (0-1) */
  minConfidence?: number;
  /** Minimum severity threshold for reporting biases (0-1) */
  minSeverity?: number;
  /** Maximum processing time in milliseconds */
  maxProcessingTime?: number;
  /** Whether to collect detailed evidence */
  collectEvidence?: boolean;
  /** Whether to generate explanations */
  generateExplanations?: boolean;
}

/**
 * Bias detection result
 *
 * Complete result from bias detection analysis including all
 * detected biases, patterns, and performance metrics.
 */
export interface BiasDetectionResult {
  /** All biases detected */
  detectedBiases: DetectedBias[];
  /** Patterns identified across biases */
  patterns: BiasPattern[];
  /** Overall bias score (0-1, higher means more biased) */
  overallBiasScore: number;
  /** Detection confidence (0-1) */
  confidence: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Timestamp of detection */
  timestamp: Date;
}

/**
 * Alert priority levels
 *
 * Defines the urgency level of a bias alert based on severity.
 */
export type AlertPriority = "low" | "medium" | "high" | "critical";

/**
 * Real-time bias alert
 *
 * Represents an alert generated when a bias is detected during
 * continuous monitoring of reasoning chains.
 */
export interface BiasAlert {
  /** Unique alert identifier */
  id: string;
  /** The detected bias that triggered this alert */
  bias: DetectedBias;
  /** Assessed severity of the bias (0-1) */
  severity: number;
  /** Priority level for handling this alert */
  priority: AlertPriority;
  /** When the alert was generated */
  timestamp: Date;
  /** Human-readable alert message */
  message: string;
  /** Whether this alert requires action */
  actionable: boolean;
  /** Recommended actions to address the bias */
  recommendations?: string[];
}

/**
 * Monitoring configuration
 *
 * Configuration options for the BiasMonitoringSystem.
 */
export interface MonitoringConfig {
  /** Minimum severity threshold for generating alerts (0-1, default 0.5) */
  alertThreshold?: number;
  /** Maximum processing time per chain in milliseconds (default 3000) */
  maxProcessingTime?: number;
  /** Whether to cache recent analyses for performance (default true) */
  enableCaching?: boolean;
  /** Debounce interval for rapid updates in milliseconds (default 100) */
  debounceMs?: number;
}

/**
 * Monitoring metrics
 *
 * Performance and activity metrics for the BiasMonitoringSystem.
 */
export interface MonitoringMetrics {
  /** Total number of reasoning chains monitored */
  totalChains: number;
  /** Total number of biases detected */
  totalBiases: number;
  /** Total number of alerts generated */
  totalAlerts: number;
  /** Average processing time per chain in milliseconds */
  averageProcessingTime: number;
  /** Performance overhead as percentage of reasoning time */
  overheadPercentage: number;
  /** Count of alerts by bias type */
  alertsByType: Map<BiasType, number>;
  /** Count of alerts by severity level */
  alertsBySeverity: Map<AlertPriority, number>;
}

/**
 * Argument in reasoning
 *
 * Represents a logical argument with premises and conclusion.
 */
export interface Argument {
  /** Unique argument identifier */
  id: string;
  /** Argument content */
  content: string;
  /** Premises supporting this argument */
  premises: string[];
  /** Conclusion drawn from premises */
  conclusion: string;
  /** Strength of the argument (0-1) */
  strength: number;
}

/**
 * Alternative perspective from devil's advocate
 *
 * Represents an alternative viewpoint that challenges the main reasoning.
 */
export interface AlternativePerspective {
  /** Alternative perspective description */
  perspective: string;
  /** Counter-arguments to main reasoning */
  counterArguments: Argument[];
  /** Alternative evidence to consider */
  alternativeEvidence: Evidence[];
  /** Confidence in this perspective (0-1) */
  confidence: number;
}

/**
 * Type of change made to reasoning during correction
 */
export type ReasoningChangeType =
  | "evidence_reweight"
  | "alternative_added"
  | "counter_argument"
  | "assumption_challenged";

/**
 * Change made to reasoning during bias correction
 *
 * Records a specific modification made to address a detected bias.
 */
export interface ReasoningChange {
  /** Type of change applied */
  type: ReasoningChangeType;
  /** Location where change was applied */
  location: BiasLocation;
  /** Content before correction */
  before: string;
  /** Content after correction */
  after: string;
  /** Rationale for this change */
  rationale: string;
}

/**
 * Record of a correction application
 *
 * Documents how a specific bias was corrected and the impact.
 */
export interface CorrectionApplication {
  /** The bias that was corrected */
  bias: DetectedBias;
  /** Name of the correction strategy used */
  strategy: string;
  /** Changes made to the reasoning */
  changes: ReasoningChange[];
  /** Percentage reduction in bias impact (0-1) */
  impactReduction: number;
}

/**
 * Corrected reasoning result
 *
 * Contains the original reasoning, corrected version, and metadata
 * about the corrections applied.
 */
export interface CorrectedReasoning {
  /** Original reasoning chain before correction */
  original: ReasoningChain;
  /** Corrected reasoning chain */
  corrected: ReasoningChain;
  /** Biases that were corrected */
  biasesCorrected: DetectedBias[];
  /** Details of corrections applied */
  correctionsApplied: CorrectionApplication[];
  /** Overall effectiveness score (0-1) */
  effectivenessScore: number;
  /** When correction was performed */
  timestamp: Date;
}

/**
 * Correction strategy for a specific bias type
 *
 * Defines how to correct a particular type of cognitive bias.
 */
export interface CorrectionStrategy {
  /** Type of bias this strategy addresses */
  biasType: BiasType;
  /** Apply correction to reasoning chain */
  apply(bias: DetectedBias, reasoning: ReasoningChain): CorrectedReasoning;
  /** Historical effectiveness of this strategy (0-1) */
  effectiveness: number;
}

/**
 * Validation result for corrected reasoning
 *
 * Assesses the quality and validity of a correction.
 */
export interface ValidationResult {
  /** Whether the correction is valid */
  valid: boolean;
  /** Issues found in the correction */
  issues: string[];
  /** Improvements made by the correction */
  improvements: string[];
  /** Overall quality score (0-1) */
  overallQuality: number;
}

/**
 * User feedback on a bias detection
 *
 * Records whether a detected bias was correctly identified,
 * enabling the learning system to improve detection accuracy.
 */
export interface BiasFeedback {
  /** The bias detection that received feedback */
  detectedBias: DetectedBias;
  /** Whether the detection was correct */
  correct: boolean;
  /** User who provided the feedback */
  userId: string;
  /** When the feedback was provided */
  timestamp: Date;
  /** Optional notes from the user */
  notes?: string;
}

/**
 * Accuracy metrics for bias detection
 *
 * Tracks detection performance using standard classification metrics.
 */
export interface AccuracyMetrics {
  /** True positives: correctly detected biases */
  truePositives: number;
  /** False positives: incorrectly detected biases */
  falsePositives: number;
  /** True negatives: correctly identified non-biases */
  trueNegatives: number;
  /** False negatives: missed biases */
  falseNegatives: number;
  /** Precision: TP / (TP + FP) */
  precision: number;
  /** Recall: TP / (TP + FN) */
  recall: number;
  /** F1 score: harmonic mean of precision and recall */
  f1Score: number;
}

/**
 * User-specific sensitivity profile
 *
 * Stores personalized sensitivity thresholds for each bias type.
 */
export interface UserSensitivityProfile {
  /** User identifier */
  userId: string;
  /** Sensitivity threshold per bias type (0-1) */
  sensitivityByType: Map<BiasType, number>;
  /** When the profile was last updated */
  lastUpdated: Date;
}

/**
 * Learning system metrics
 *
 * Tracks overall learning system performance and improvement.
 */
export interface LearningMetrics {
  /** Total feedback items received */
  totalFeedback: number;
  /** Improvement in accuracy since baseline */
  accuracyImprovement: number;
  /** Number of learned patterns */
  patternCount: number;
  /** Number of users with profiles */
  userCount: number;
}

/**
 * Time period for metrics calculation
 */
export type TimePeriod = "day" | "week" | "month" | "all";
