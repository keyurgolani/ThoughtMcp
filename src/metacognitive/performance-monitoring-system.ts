/**
 * Performance Monitoring System
 *
 * Tracks reasoning quality, confidence calibration, bias detection effectiveness,
 * framework selection accuracy, and user satisfaction for metacognitive self-improvement.
 */

import type { DetectedBias } from "../bias/types";
import type { FrameworkSelection } from "../framework/types";
import {
  MetricType as MetricTypeEnum,
  type ActualBias,
  type CalibrationMetrics,
  type DetectionMetrics,
  type MetricEntry,
  type MetricType,
  type MetricsCollector,
  type Outcome,
  type PerformanceReport,
  type PerformanceTrend,
  type QualityMetrics,
  type SatisfactionMetrics,
  type SelectionMetrics,
  type TimePeriod,
  type TrendDirection,
  type UserFeedback,
} from "./types";

/**
 * Reasoning result interface for tracking
 */
interface ReasoningResult {
  conclusion: string;
  reasoning: string[];
  insights: unknown[];
  confidence: number;
  quality: number;
}

/**
 * Simple in-memory metrics collector
 */
class SimpleMetricsCollector implements MetricsCollector {
  entries: MetricEntry[] = [];

  add(entry: MetricEntry): void {
    this.entries.push(entry);
  }

  getByType(type: MetricType): MetricEntry[] {
    return this.entries.filter((e) => e.type === type);
  }

  getByPeriod(start: Date, end: Date): MetricEntry[] {
    return this.entries.filter((e) => e.timestamp >= start && e.timestamp <= end);
  }

  clear(): void {
    this.entries = [];
  }
}

/**
 * Performance Monitoring System
 *
 * Tracks and analyzes system performance across multiple dimensions
 * to enable metacognitive self-improvement.
 */
export class PerformanceMonitoringSystem {
  private readonly collector: MetricsCollector;

  constructor() {
    this.collector = new SimpleMetricsCollector();
  }

  /**
   * Track reasoning quality from a reasoning result
   */
  trackReasoningQuality(result: ReasoningResult): void {
    const entry: MetricEntry = {
      id: `reasoning-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type: MetricTypeEnum.REASONING_QUALITY,
      value: result.quality,
      metadata: {
        confidence: result.confidence,
        insightCount: result.insights.length,
        reasoningSteps: result.reasoning.length,
      },
    };
    this.collector.add(entry);
  }

  /**
   * Track confidence calibration with prediction-outcome pair
   */
  trackConfidenceCalibration(predicted: number, actual: number): void {
    const entry: MetricEntry = {
      id: `calibration-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type: MetricTypeEnum.CONFIDENCE_CALIBRATION,
      value: Math.abs(predicted - actual),
      metadata: {
        predicted,
        actual,
        error: predicted - actual,
      },
    };
    this.collector.add(entry);
  }

  /**
   * Track bias detection effectiveness
   */
  trackBiasDetectionEffectiveness(detected: DetectedBias[], actual: ActualBias[]): void {
    const detectedTypes = new Set(detected.map((d) => d.type.toLowerCase()));
    const actualTypes = new Set(actual.map((a) => a.type.toLowerCase()));

    const truePositives = detected.filter((d) => actualTypes.has(d.type.toLowerCase())).length;
    const falsePositives = detected.filter((d) => !actualTypes.has(d.type.toLowerCase())).length;
    const falseNegatives = actual.filter((a) => !detectedTypes.has(a.type.toLowerCase())).length;

    const entry: MetricEntry = {
      id: `bias-detection-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type: MetricTypeEnum.BIAS_DETECTION,
      value: truePositives / (truePositives + falseNegatives || 1),
      metadata: {
        truePositives,
        falsePositives,
        falseNegatives,
        detectedCount: detected.length,
        actualCount: actual.length,
      },
    };
    this.collector.add(entry);
  }

  /**
   * Track framework selection and outcome
   */
  trackFrameworkSelection(selection: FrameworkSelection, outcome: Outcome): void {
    const entry: MetricEntry = {
      id: `framework-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type: MetricTypeEnum.FRAMEWORK_SELECTION,
      value: outcome.quality,
      metadata: {
        framework: selection.primaryFramework,
        confidence: selection.confidence,
        success: outcome.success,
        quality: outcome.quality,
      },
    };
    this.collector.add(entry);
  }

  /**
   * Track user satisfaction feedback
   */
  trackUserSatisfaction(feedback: UserFeedback): void {
    const entry: MetricEntry = {
      id: `satisfaction-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type: MetricTypeEnum.USER_SATISFACTION,
      value: feedback.rating,
      metadata: {
        userId: feedback.userId,
        context: feedback.context,
        comments: feedback.comments,
      },
    };
    this.collector.add(entry);
  }

  /**
   * Generate comprehensive performance report for a time period
   */
  generatePerformanceReport(period: TimePeriod): PerformanceReport {
    const { startDate, endDate } = this.getPeriodDates(period);
    const entries = this.collector.getByPeriod(startDate, endDate);

    const reasoningQuality = this.calculateReasoningQualityMetrics(entries);
    const confidenceCalibration = this.calculateCalibrationMetrics(entries);
    const biasDetection = this.calculateDetectionMetrics(entries);
    const frameworkSelection = this.calculateSelectionMetrics(entries);
    const userSatisfaction = this.calculateSatisfactionMetrics(entries);

    const overallScore = this.calculateOverallScore({
      reasoningQuality,
      confidenceCalibration,
      biasDetection,
      frameworkSelection,
      userSatisfaction,
    });

    const trends = this.identifyPerformanceTrends();

    return {
      period,
      startDate,
      endDate,
      generatedAt: new Date(),
      reasoningQuality,
      confidenceCalibration,
      biasDetection,
      frameworkSelection,
      userSatisfaction,
      overallScore,
      trends,
    };
  }

  /**
   * Identify performance trends across all metrics
   */
  identifyPerformanceTrends(): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];

    const reasoningEntries = this.collector.getByType(MetricTypeEnum.REASONING_QUALITY);
    if (reasoningEntries.length > 0) {
      trends.push(this.calculateTrendForMetric("reasoning_quality", reasoningEntries, "day"));
    }

    const calibrationEntries = this.collector.getByType(MetricTypeEnum.CONFIDENCE_CALIBRATION);
    if (calibrationEntries.length > 0) {
      trends.push(
        this.calculateTrendForMetric("confidence_calibration", calibrationEntries, "day")
      );
    }

    const biasEntries = this.collector.getByType(MetricTypeEnum.BIAS_DETECTION);
    if (biasEntries.length > 0) {
      trends.push(this.calculateTrendForMetric("bias_detection", biasEntries, "day"));
    }

    const frameworkEntries = this.collector.getByType(MetricTypeEnum.FRAMEWORK_SELECTION);
    if (frameworkEntries.length > 0) {
      trends.push(this.calculateTrendForMetric("framework_selection", frameworkEntries, "day"));
    }

    const satisfactionEntries = this.collector.getByType(MetricTypeEnum.USER_SATISFACTION);
    if (satisfactionEntries.length > 0) {
      trends.push(this.calculateTrendForMetric("user_satisfaction", satisfactionEntries, "day"));
    }

    return trends;
  }

  /**
   * Calculate quality metrics for reasoning
   */
  calculateQualityMetrics(): QualityMetrics {
    const entries = this.collector.getByType(MetricTypeEnum.REASONING_QUALITY);
    return this.calculateBasicQualityMetrics(entries);
  }

  /**
   * Calculate basic quality metrics from entries
   */
  private calculateBasicQualityMetrics(entries: MetricEntry[]): QualityMetrics {
    if (entries.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        standardDeviation: 0,
        trend: "stable",
        sampleSize: 0,
      };
    }

    const values = entries.map((e) => e.value);
    const average = this.calculateAverage(values);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const standardDeviation = this.calculateStandardDeviation(values);
    const trend = this.calculateTrend(values);

    return {
      average,
      min,
      max,
      standardDeviation,
      trend,
      sampleSize: entries.length,
    };
  }

  /**
   * Calculate reasoning quality metrics
   */
  private calculateReasoningQualityMetrics(entries: MetricEntry[]): QualityMetrics {
    const reasoningEntries = entries.filter((e) => e.type === MetricTypeEnum.REASONING_QUALITY);
    return this.calculateBasicQualityMetrics(reasoningEntries);
  }

  /**
   * Calculate calibration metrics
   */
  private calculateCalibrationMetrics(entries: MetricEntry[]): CalibrationMetrics {
    const calibrationEntries = entries.filter(
      (e) => e.type === MetricTypeEnum.CONFIDENCE_CALIBRATION
    );

    if (calibrationEntries.length === 0) {
      return {
        calibrationError: 0,
        bias: 0,
        withinTolerance: 0,
        trend: "stable",
        sampleSize: 0,
      };
    }

    const errors = calibrationEntries.map((e) => e.value);
    const calibrationError = this.calculateAverage(errors);

    const signedErrors = calibrationEntries.map((e) => (e.metadata?.error as number) || 0);
    const bias = this.calculateAverage(signedErrors);

    const withinTolerance =
      calibrationEntries.filter((e) => Math.abs((e.metadata?.error as number) || 0) <= 0.1).length /
      calibrationEntries.length;

    const trend = this.calculateTrend(errors.map((e) => 1 - e));

    return {
      calibrationError,
      bias,
      withinTolerance,
      trend,
      sampleSize: calibrationEntries.length,
    };
  }

  /**
   * Calculate detection metrics
   */
  private calculateDetectionMetrics(entries: MetricEntry[]): DetectionMetrics {
    const detectionEntries = entries.filter((e) => e.type === MetricTypeEnum.BIAS_DETECTION);

    if (detectionEntries.length === 0) {
      return {
        detectionRate: 0,
        falsePositiveRate: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        trend: "stable",
        sampleSize: 0,
      };
    }

    let totalTP = 0;
    let totalFP = 0;
    let totalFN = 0;

    for (const entry of detectionEntries) {
      totalTP += (entry.metadata?.truePositives as number) || 0;
      totalFP += (entry.metadata?.falsePositives as number) || 0;
      totalFN += (entry.metadata?.falseNegatives as number) || 0;
    }

    const detectionRate = totalTP / (totalTP + totalFN || 1);
    const falsePositiveRate = totalFP / (totalTP + totalFP || 1);
    const precision = totalTP / (totalTP + totalFP || 1);
    const recall = totalTP / (totalTP + totalFN || 1);
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const trend = this.calculateTrend(detectionEntries.map((e) => e.value));

    return {
      detectionRate,
      falsePositiveRate,
      precision,
      recall,
      f1Score,
      trend,
      sampleSize: detectionEntries.length,
    };
  }

  /**
   * Calculate selection metrics
   */
  private calculateSelectionMetrics(entries: MetricEntry[]): SelectionMetrics {
    const selectionEntries = entries.filter((e) => e.type === MetricTypeEnum.FRAMEWORK_SELECTION);

    if (selectionEntries.length === 0) {
      return {
        accuracy: 0,
        averageOutcomeQuality: 0,
        successRate: 0,
        trend: "stable",
        sampleSize: 0,
      };
    }

    const successCount = selectionEntries.filter((e) => e.metadata?.success === true).length;
    const accuracy = successCount / selectionEntries.length;

    const qualities = selectionEntries.map((e) => (e.metadata?.quality as number) || 0);
    const averageOutcomeQuality = this.calculateAverage(qualities);

    const successRate = accuracy;

    const trend = this.calculateTrend(qualities);

    return {
      accuracy,
      averageOutcomeQuality,
      successRate,
      trend,
      sampleSize: selectionEntries.length,
    };
  }

  /**
   * Calculate satisfaction metrics
   */
  private calculateSatisfactionMetrics(entries: MetricEntry[]): SatisfactionMetrics {
    const satisfactionEntries = entries.filter((e) => e.type === MetricTypeEnum.USER_SATISFACTION);

    if (satisfactionEntries.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        standardDeviation: 0,
        satisfiedPercentage: 0,
        trend: "stable",
        sampleSize: 0,
      };
    }

    const ratings = satisfactionEntries.map((e) => e.value);
    const average = this.calculateAverage(ratings);
    const min = Math.min(...ratings);
    const max = Math.max(...ratings);
    const standardDeviation = this.calculateStandardDeviation(ratings);

    const satisfiedPercentage =
      satisfactionEntries.filter((e) => e.value > 0.7).length / satisfactionEntries.length;

    const trend = this.calculateTrend(ratings);

    return {
      average,
      min,
      max,
      standardDeviation,
      satisfiedPercentage,
      trend,
      sampleSize: satisfactionEntries.length,
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(metrics: {
    reasoningQuality: QualityMetrics;
    confidenceCalibration: CalibrationMetrics;
    biasDetection: DetectionMetrics;
    frameworkSelection: SelectionMetrics;
    userSatisfaction: SatisfactionMetrics;
  }): number {
    const scores: number[] = [];
    let totalWeight = 0;

    if (metrics.reasoningQuality.sampleSize > 0) {
      scores.push(metrics.reasoningQuality.average * 0.25);
      totalWeight += 0.25;
    }

    if (metrics.confidenceCalibration.sampleSize > 0) {
      scores.push((1 - metrics.confidenceCalibration.calibrationError) * 0.2);
      totalWeight += 0.2;
    }

    if (metrics.biasDetection.sampleSize > 0) {
      scores.push(metrics.biasDetection.f1Score * 0.2);
      totalWeight += 0.2;
    }

    if (metrics.frameworkSelection.sampleSize > 0) {
      scores.push(metrics.frameworkSelection.accuracy * 0.2);
      totalWeight += 0.2;
    }

    if (metrics.userSatisfaction.sampleSize > 0) {
      scores.push(metrics.userSatisfaction.average * 0.15);
      totalWeight += 0.15;
    }

    if (totalWeight === 0) {
      return 0;
    }

    return scores.reduce((sum, score) => sum + score, 0) / totalWeight;
  }

  /**
   * Calculate trend for a specific metric
   */
  private calculateTrendForMetric(
    metric: string,
    entries: MetricEntry[],
    period: TimePeriod
  ): PerformanceTrend {
    const values = entries.map((e) => e.value);
    const direction = this.calculateTrend(values);
    const magnitude = this.calculateTrendMagnitude(values);
    const confidence = this.calculateTrendConfidence(values);

    return {
      metric,
      direction,
      magnitude,
      confidence,
      dataPoints: entries.length,
      period,
    };
  }

  /**
   * Calculate trend direction from values
   */
  private calculateTrend(values: number[]): TrendDirection {
    if (values.length < 2) {
      return "stable";
    }

    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    const sumX = indices.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    const threshold = 0.01;

    if (slope > threshold) {
      return "improving";
    } else if (slope < -threshold) {
      return "declining";
    } else {
      return "stable";
    }
  }

  /**
   * Calculate trend magnitude
   */
  private calculateTrendMagnitude(values: number[]): number {
    if (values.length < 2) {
      return 0;
    }

    const first = values[0];
    const last = values[values.length - 1];

    if (first === 0) {
      return 0;
    }

    return Math.abs((last - first) / first);
  }

  /**
   * Calculate confidence in trend assessment
   */
  private calculateTrendConfidence(values: number[]): number {
    if (values.length < 2) {
      return 0;
    }

    const sampleSizeConfidence = Math.min(values.length / 10, 1);
    const stdDev = this.calculateStandardDeviation(values);
    const mean = this.calculateAverage(values);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
    const consistencyConfidence = Math.max(0, 1 - coefficientOfVariation);

    return (sampleSizeConfidence + consistencyConfidence) / 2;
  }

  /**
   * Calculate average of values
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate standard deviation of values
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const mean = this.calculateAverage(values);
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = this.calculateAverage(squaredDiffs);

    return Math.sqrt(variance);
  }

  /**
   * Get start and end dates for a time period
   */
  private getPeriodDates(period: TimePeriod): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "day":
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "custom":
        startDate.setFullYear(2000);
        break;
    }

    return { startDate, endDate };
  }
}
