/**
 * Types and interfaces for metacognitive monitoring and self-improvement
 *
 * This module defines types for performance tracking, adaptive strategy
 * selection, and self-improvement mechanisms that enable the system to
 * monitor and improve its own reasoning capabilities.
 */

/**
 * Metric type enumeration
 *
 * Defines the different categories of metrics tracked by the
 * performance monitoring system.
 */
export enum MetricType {
  /** Reasoning quality metrics */
  REASONING_QUALITY = "reasoning_quality",
  /** Confidence calibration metrics */
  CONFIDENCE_CALIBRATION = "confidence_calibration",
  /** Bias detection effectiveness metrics */
  BIAS_DETECTION = "bias_detection",
  /** Framework selection accuracy metrics */
  FRAMEWORK_SELECTION = "framework_selection",
  /** User satisfaction metrics */
  USER_SATISFACTION = "user_satisfaction",
}

/**
 * Time period for metrics aggregation
 *
 * Defines standard time periods for generating performance reports
 * and analyzing trends.
 */
export type TimePeriod = "day" | "week" | "month" | "year" | "custom";

/**
 * Trend direction enumeration
 *
 * Indicates whether a metric is improving, declining, or stable
 * over time.
 */
export type TrendDirection = "improving" | "declining" | "stable";

/**
 * Metric entry
 *
 * Represents a single metric data point with timestamp, type,
 * value, and optional metadata.
 */
export interface MetricEntry {
  /** Unique entry identifier */
  id: string;
  /** When the metric was recorded */
  timestamp: Date;
  /** Type of metric */
  type: MetricType;
  /** Metric value (0-1 for normalized metrics) */
  value: number;
  /** Additional context and metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Metrics collector interface
 *
 * Manages collection and retrieval of performance metrics.
 */
export interface MetricsCollector {
  /** All collected metric entries */
  entries: MetricEntry[];
  /** Add a new metric entry */
  add(entry: MetricEntry): void;
  /** Get entries by metric type */
  getByType(type: MetricType): MetricEntry[];
  /** Get entries within a time period */
  getByPeriod(start: Date, end: Date): MetricEntry[];
  /** Clear all entries */
  clear(): void;
}

/**
 * Quality metrics
 *
 * Statistical summary of quality scores including average, range,
 * variability, and trend direction.
 */
export interface QualityMetrics {
  /** Average quality score (0-1) */
  average: number;
  /** Minimum quality score (0-1) */
  min: number;
  /** Maximum quality score (0-1) */
  max: number;
  /** Standard deviation of scores */
  standardDeviation: number;
  /** Trend direction over time */
  trend: TrendDirection;
  /** Number of data points */
  sampleSize: number;
}

/**
 * Calibration metrics
 *
 * Tracks confidence calibration accuracy including calibration error,
 * overconfidence/underconfidence bias, and improvement trends.
 */
export interface CalibrationMetrics {
  /** Mean absolute calibration error */
  calibrationError: number;
  /** Overconfidence bias (positive) or underconfidence bias (negative) */
  bias: number;
  /** Percentage of predictions within ±10% of actual */
  withinTolerance: number;
  /** Trend in calibration accuracy */
  trend: TrendDirection;
  /** Number of prediction-outcome pairs */
  sampleSize: number;
}

/**
 * Detection metrics
 *
 * Tracks bias detection effectiveness including detection rate,
 * false positive rate, and accuracy metrics.
 */
export interface DetectionMetrics {
  /** Detection rate (true positives / total actual) */
  detectionRate: number;
  /** False positive rate (false positives / total detected) */
  falsePositiveRate: number;
  /** Precision (true positives / total detected) */
  precision: number;
  /** Recall (true positives / total actual) */
  recall: number;
  /** F1 score (harmonic mean of precision and recall) */
  f1Score: number;
  /** Trend in detection effectiveness */
  trend: TrendDirection;
  /** Number of detection attempts */
  sampleSize: number;
}

/**
 * Selection metrics
 *
 * Tracks framework selection accuracy and effectiveness including
 * selection accuracy, outcome quality, and improvement trends.
 */
export interface SelectionMetrics {
  /** Selection accuracy (correct selections / total selections) */
  accuracy: number;
  /** Average outcome quality for selections (0-1) */
  averageOutcomeQuality: number;
  /** Percentage of selections leading to successful outcomes */
  successRate: number;
  /** Trend in selection accuracy */
  trend: TrendDirection;
  /** Number of selections made */
  sampleSize: number;
}

/**
 * Satisfaction metrics
 *
 * Tracks user satisfaction including average rating, distribution,
 * and trends over time.
 */
export interface SatisfactionMetrics {
  /** Average satisfaction rating (0-1) */
  average: number;
  /** Minimum satisfaction rating (0-1) */
  min: number;
  /** Maximum satisfaction rating (0-1) */
  max: number;
  /** Standard deviation of ratings */
  standardDeviation: number;
  /** Percentage of ratings above 0.7 (satisfied users) */
  satisfiedPercentage: number;
  /** Trend in satisfaction */
  trend: TrendDirection;
  /** Number of feedback items */
  sampleSize: number;
}

/**
 * Performance trend
 *
 * Represents a trend in a specific metric over time with direction,
 * magnitude, confidence, and supporting data points.
 */
export interface PerformanceTrend {
  /** Metric name */
  metric: string;
  /** Trend direction */
  direction: TrendDirection;
  /** Magnitude of change (percentage) */
  magnitude: number;
  /** Confidence in trend assessment (0-1) */
  confidence: number;
  /** Number of data points used */
  dataPoints: number;
  /** Time period analyzed */
  period: TimePeriod;
}

/**
 * Performance report
 *
 * Comprehensive performance report aggregating all tracked metrics
 * for a specific time period with overall score and identified trends.
 */
export interface PerformanceReport {
  /** Time period covered by report */
  period: TimePeriod;
  /** Start of reporting period */
  startDate: Date;
  /** End of reporting period */
  endDate: Date;
  /** When report was generated */
  generatedAt: Date;
  /** Reasoning quality metrics */
  reasoningQuality: QualityMetrics;
  /** Confidence calibration metrics */
  confidenceCalibration: CalibrationMetrics;
  /** Bias detection metrics */
  biasDetection: DetectionMetrics;
  /** Framework selection metrics */
  frameworkSelection: SelectionMetrics;
  /** User satisfaction metrics */
  userSatisfaction: SatisfactionMetrics;
  /** Overall performance score (0-1) */
  overallScore: number;
  /** Identified performance trends */
  trends: PerformanceTrend[];
}

/**
 * User feedback
 *
 * Represents user feedback on system performance including rating,
 * comments, and context.
 */
export interface UserFeedback {
  /** Unique feedback identifier */
  id: string;
  /** User identifier */
  userId: string;
  /** Satisfaction rating (0-1) */
  rating: number;
  /** Optional feedback comments */
  comments?: string;
  /** Context of feedback (what was being evaluated) */
  context: string;
  /** When feedback was provided */
  timestamp: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Outcome
 *
 * Represents the outcome of a reasoning operation or decision
 * for tracking effectiveness and learning.
 */
export interface Outcome {
  /** Unique outcome identifier */
  id: string;
  /** Whether outcome was successful */
  success: boolean;
  /** Quality score of outcome (0-1) */
  quality: number;
  /** Description of outcome */
  description: string;
  /** When outcome occurred */
  timestamp: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Actual bias (ground truth)
 *
 * Represents a bias that actually existed in reasoning, used for
 * evaluating detection effectiveness.
 */
export interface ActualBias {
  /** Type of bias */
  type: string;
  /** Severity of bias (0-1) */
  severity: number;
  /** Location in reasoning */
  location: string;
  /** Evidence of bias */
  evidence: string[];
}

/**
 * Custom time range
 *
 * Defines a custom time period for metrics analysis.
 */
export interface CustomTimeRange {
  /** Start of time range */
  start: Date;
  /** End of time range */
  end: Date;
}

/**
 * Performance monitoring configuration
 *
 * Configuration options for the performance monitoring system.
 */
export interface PerformanceMonitoringConfig {
  /** Maximum number of metric entries to store in memory */
  maxEntries?: number;
  /** Whether to automatically clean old entries */
  autoCleanup?: boolean;
  /** Age threshold for cleanup (days) */
  cleanupThresholdDays?: number;
  /** Minimum sample size for trend analysis */
  minSampleSizeForTrends?: number;
}

/**
 * Strategy execution record
 *
 * Records a single execution of a strategy with context and outcome
 * for learning and adaptation.
 */
export interface StrategyExecution {
  /** Unique execution identifier */
  id: string;
  /** Strategy that was executed */
  strategyId: string;
  /** Context in which strategy was executed */
  context: Context;
  /** Outcome of the execution */
  outcome: Outcome;
  /** When execution occurred */
  timestamp: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Success pattern
 *
 * Identifies a pattern of successful strategy execution with
 * associated context factors and confidence.
 */
export interface SuccessPattern {
  /** Strategy associated with pattern */
  strategyId: string;
  /** Context factors that contribute to success */
  contextFactors: string[];
  /** Confidence in pattern (0-1) */
  confidence: number;
  /** Success rate for this pattern */
  successRate: number;
  /** Number of executions supporting pattern */
  sampleSize: number;
}

/**
 * Failure pattern
 *
 * Identifies a pattern of failed strategy execution (anti-pattern)
 * with associated context factors and confidence.
 */
export interface FailurePattern {
  /** Strategy associated with pattern */
  strategyId: string;
  /** Context factors that contribute to failure */
  contextFactors: string[];
  /** Confidence in pattern (0-1) */
  confidence: number;
  /** Failure rate for this pattern */
  failureRate: number;
  /** Number of executions supporting pattern */
  sampleSize: number;
}

/**
 * Strategy definition
 *
 * Defines a reasoning strategy with selection rules.
 */
export interface Strategy {
  /** Unique strategy identifier */
  id: string;
  /** Human-readable strategy name */
  name: string;
  /** Selection rules for this strategy */
  rules: StrategyRule[];
  /** Optional description */
  description?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Strategy rule
 *
 * Defines when a strategy should be selected based on context.
 */
export interface StrategyRule {
  /** Rule identifier */
  id: string;
  /** Context conditions that trigger this rule */
  conditions: Record<string, unknown>;
  /** Weight of this rule (0-1) */
  weight: number;
  /** Confidence in this rule (0-1) */
  confidence: number;
}

/**
 * Context for strategy selection
 *
 * Describes the problem context used for strategy selection.
 */
export interface Context {
  /** Problem complexity level */
  complexity?: string;
  /** Uncertainty level */
  uncertainty?: string;
  /** Time pressure level */
  timePressure?: string;
  /** Additional context factors */
  [key: string]: unknown;
}

/**
 * Strategy comparison result
 *
 * Results of comparing multiple strategies in a given context.
 */
export interface StrategyComparison {
  /** Context used for comparison */
  context: Context;
  /** Ranked strategies with scores */
  rankings: StrategyRanking[];
  /** When comparison was performed */
  timestamp: Date;
}

/**
 * Strategy ranking
 *
 * Ranking of a single strategy with effectiveness score.
 */
export interface StrategyRanking {
  /** Strategy identifier */
  strategyId: string;
  /** Effectiveness score (0-1) */
  score: number;
  /** Confidence in ranking (0-1) */
  confidence: number;
}

/**
 * Pattern (base interface)
 *
 * Base interface for success and failure patterns.
 */
export interface Pattern {
  /** Strategy associated with pattern */
  strategyId: string;
  /** Context factors */
  contextFactors: string[];
  /** Confidence in pattern (0-1) */
  confidence: number;
  /** Sample size supporting pattern */
  sampleSize: number;
}

/**
 * Feedback on strategy execution
 *
 * User feedback on how well a strategy performed.
 */
export interface Feedback {
  /** Unique feedback identifier */
  id: string;
  /** Strategy being evaluated */
  strategyId: string;
  /** User rating (0-1) */
  rating: number;
  /** Context of execution */
  context: Context;
  /** When feedback was provided */
  timestamp: Date;
  /** Optional comments */
  comments?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Performance metrics
 *
 * Snapshot of system performance at a point in time.
 */
export interface Performance {
  /** Success rate (0-1) */
  successRate: number;
  /** Average quality score (0-1) */
  averageQuality: number;
  /** Average processing time (ms) */
  averageTime: number;
  /** When metrics were captured */
  timestamp: Date;
  /** Additional metrics */
  [key: string]: unknown;
}

/**
 * Improvement metrics
 *
 * Measures improvement between baseline and current performance.
 */
export interface ImprovementMetrics {
  /** Improvement in success rate (percentage) */
  successRateImprovement: number;
  /** Improvement in quality (percentage) */
  qualityImprovement: number;
  /** Improvement in time (percentage, negative = faster) */
  timeImprovement: number;
  /** Overall trend direction */
  trend: "improving" | "stable" | "declining";
  /** Time period measured */
  periodDays: number;
  /** Confidence in improvement measurement (0-1) */
  confidence: number;
}

/**
 * Strategy learning engine interface
 *
 * Manages learning and adaptation of strategy selection.
 */
export interface StrategyLearningEngine {
  /** Learn from execution history */
  learn(history: StrategyExecution[]): void;
  /** Get recommended strategy for context */
  recommend(context: Context): string;
  /** Update based on feedback */
  updateFromFeedback(feedback: Feedback[]): void;
}

/**
 * Correction
 *
 * Represents a correction made to system behavior or reasoning,
 * used for learning and improvement.
 */
export interface Correction {
  /** Unique correction identifier */
  id: string;
  /** What was corrected */
  subject: string;
  /** Original (incorrect) value or behavior */
  original: string;
  /** Corrected value or behavior */
  corrected: string;
  /** Reason for correction */
  reason: string;
  /** User who made the correction */
  userId: string;
  /** When correction was made */
  timestamp: Date;
  /** Severity of the error (0-1) */
  severity: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Interaction
 *
 * Represents a user interaction with the system for tracking
 * patterns and learning preferences.
 */
export interface Interaction {
  /** Unique interaction identifier */
  id: string;
  /** User identifier */
  userId: string;
  /** Type of interaction (query, feedback, selection, etc.) */
  type: string;
  /** Interaction content or data */
  content: Record<string, unknown>;
  /** Context of interaction */
  context: Context;
  /** When interaction occurred */
  timestamp: Date;
  /** Duration of interaction (ms) */
  duration?: number;
  /** Outcome of interaction */
  outcome?: Outcome;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * User preferences
 *
 * Stores learned user preferences with confidence scores.
 */
export interface UserPreferences {
  /** User identifier */
  userId: string;
  /** Preference key-value pairs with confidence scores */
  preferences: Map<string, PreferenceValue>;
  /** When preferences were last updated */
  lastUpdated: Date;
  /** Number of interactions used to learn preferences */
  sampleSize: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Preference value
 *
 * A single preference value with confidence score.
 */
export interface PreferenceValue {
  /** Preference value */
  value: unknown;
  /** Confidence in this preference (0-1) */
  confidence: number;
  /** When this preference was learned */
  learnedAt: Date;
  /** Number of interactions supporting this preference */
  supportingInteractions: number;
}

/**
 * Decision
 *
 * Represents a decision made by the system for outcome tracking.
 */
export interface Decision {
  /** Unique decision identifier */
  id: string;
  /** Type of decision */
  type: string;
  /** Decision content or choice made */
  choice: string;
  /** Context in which decision was made */
  context: Context;
  /** Reasoning behind decision */
  reasoning?: string;
  /** Confidence in decision (0-1) */
  confidence: number;
  /** When decision was made */
  timestamp: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Outcome pattern
 *
 * Identifies a pattern in decision outcomes for learning.
 */
export interface OutcomePattern {
  /** Pattern identifier */
  id: string;
  /** Type of pattern (success, failure, mixed) */
  type: "success" | "failure" | "mixed";
  /** Context factors associated with pattern */
  contextFactors: string[];
  /** Decision factors associated with pattern */
  decisionFactors: string[];
  /** Success rate for this pattern (0-1) */
  successRate: number;
  /** Confidence in pattern (0-1) */
  confidence: number;
  /** Number of outcomes supporting pattern */
  sampleSize: number;
  /** Average quality of outcomes (0-1) */
  averageQuality: number;
  /** Recommendations based on pattern */
  recommendations: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Improvement report
 *
 * Comprehensive report on system improvement over time.
 */
export interface ImprovementReport {
  /** Time period covered by report */
  period: TimePeriod;
  /** Start of reporting period */
  startDate: Date;
  /** End of reporting period */
  endDate: Date;
  /** When report was generated */
  generatedAt: Date;
  /** Baseline performance at start of period */
  baseline: Performance;
  /** Current performance at end of period */
  current: Performance;
  /** Improvement metrics */
  improvement: ImprovementMetrics;
  /** Key improvements identified */
  keyImprovements: string[];
  /** Areas needing improvement */
  areasForImprovement: string[];
  /** Feedback summary */
  feedbackSummary: {
    /** Total feedback items received */
    totalFeedback: number;
    /** Average feedback rating (0-1) */
    averageRating: number;
    /** Common themes in feedback */
    commonThemes: string[];
  };
  /** Preference learning summary */
  preferenceSummary: {
    /** Number of preferences learned */
    preferencesLearned: number;
    /** Confidence in preferences (0-1) */
    averageConfidence: number;
    /** Top preferences identified */
    topPreferences: string[];
  };
  /** Outcome tracking summary */
  outcomeSummary: {
    /** Total outcomes tracked */
    totalOutcomes: number;
    /** Success rate (0-1) */
    successRate: number;
    /** Patterns identified */
    patternsIdentified: number;
  };
  /** Overall assessment */
  overallAssessment: string;
  /** Recommendations for continued improvement */
  recommendations: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
