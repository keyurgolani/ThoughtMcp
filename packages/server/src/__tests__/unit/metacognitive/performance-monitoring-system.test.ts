/**
 * Tests for Performance Monitoring System
 *
 * Tests the metacognitive performance tracking system that monitors
 * reasoning quality, confidence calibration, bias detection effectiveness,
 * framework selection accuracy, and user satisfaction.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { BiasType, type DetectedBias } from "../../../bias/types";
import type { FrameworkSelection } from "../../../framework/types";
import { PerformanceMonitoringSystem } from "../../../metacognitive/performance-monitoring-system";
import type {
  ActualBias,
  Outcome,
  PerformanceTrend,
  UserFeedback,
} from "../../../metacognitive/types";

// Define ReasoningResult type for testing
interface ReasoningResult {
  conclusion: string;
  reasoning: string[];
  insights: any[];
  confidence: number;
  quality: number;
}

describe("PerformanceMonitoringSystem", () => {
  let monitor: PerformanceMonitoringSystem;

  beforeEach(() => {
    monitor = new PerformanceMonitoringSystem();
  });

  describe("Reasoning Quality Tracking", () => {
    it("should track reasoning result with quality metrics", () => {
      const result = createMockReasoningResult({
        confidence: 0.85,
        quality: 0.9,
      });

      expect(() => monitor.trackReasoningQuality(result)).not.toThrow();
    });

    it("should calculate quality score from reasoning result", () => {
      const result = createMockReasoningResult({
        confidence: 0.8,
        quality: 0.85,
      });

      monitor.trackReasoningQuality(result);
      const metrics = monitor.calculateQualityMetrics();

      expect(metrics.average).toBeGreaterThan(0);
      expect(metrics.average).toBeLessThanOrEqual(1);
    });

    it("should track multiple reasoning results", () => {
      const results = [
        createMockReasoningResult({ quality: 0.7 }),
        createMockReasoningResult({ quality: 0.8 }),
        createMockReasoningResult({ quality: 0.9 }),
      ];

      results.forEach((result) => monitor.trackReasoningQuality(result));
      const metrics = monitor.calculateQualityMetrics();

      expect(metrics.sampleSize).toBe(3);
      expect(metrics.average).toBeCloseTo(0.8, 1);
    });

    it("should analyze quality trends over time", () => {
      // Track improving quality
      const improvingResults = [
        createMockReasoningResult({ quality: 0.6 }),
        createMockReasoningResult({ quality: 0.7 }),
        createMockReasoningResult({ quality: 0.8 }),
        createMockReasoningResult({ quality: 0.9 }),
      ];

      improvingResults.forEach((result) => monitor.trackReasoningQuality(result));
      const metrics = monitor.calculateQualityMetrics();

      expect(metrics.trend).toBe("improving");
    });

    it("should detect declining quality trends", () => {
      const decliningResults = [
        createMockReasoningResult({ quality: 0.9 }),
        createMockReasoningResult({ quality: 0.8 }),
        createMockReasoningResult({ quality: 0.7 }),
        createMockReasoningResult({ quality: 0.6 }),
      ];

      decliningResults.forEach((result) => monitor.trackReasoningQuality(result));
      const metrics = monitor.calculateQualityMetrics();

      expect(metrics.trend).toBe("declining");
    });

    it("should detect stable quality trends", () => {
      const stableResults = [
        createMockReasoningResult({ quality: 0.8 }),
        createMockReasoningResult({ quality: 0.81 }),
        createMockReasoningResult({ quality: 0.79 }),
        createMockReasoningResult({ quality: 0.8 }),
      ];

      stableResults.forEach((result) => monitor.trackReasoningQuality(result));
      const metrics = monitor.calculateQualityMetrics();

      expect(metrics.trend).toBe("stable");
    });
  });

  describe("Confidence Calibration Monitoring", () => {
    it("should track prediction-outcome pairs", () => {
      expect(() => monitor.trackConfidenceCalibration(0.8, 1.0)).not.toThrow();
    });

    it("should calculate calibration error", () => {
      monitor.trackConfidenceCalibration(0.8, 1.0); // Underconfident
      monitor.trackConfidenceCalibration(0.9, 0.5); // Overconfident
      monitor.trackConfidenceCalibration(0.7, 0.7); // Perfect

      const report = monitor.generatePerformanceReport("day");

      expect(report.confidenceCalibration.calibrationError).toBeGreaterThan(0);
    });

    it("should track calibration trend over time", () => {
      // Improving calibration (errors decreasing)
      monitor.trackConfidenceCalibration(0.5, 0.7); // Error: 0.2
      monitor.trackConfidenceCalibration(0.6, 0.7); // Error: 0.1
      monitor.trackConfidenceCalibration(0.7, 0.75); // Error: 0.05
      monitor.trackConfidenceCalibration(0.8, 0.82); // Error: 0.02

      const report = monitor.generatePerformanceReport("day");

      expect(report.confidenceCalibration.trend).toBe("improving");
    });

    it("should calculate percentage within tolerance", () => {
      monitor.trackConfidenceCalibration(0.8, 0.85); // Within ±10%
      monitor.trackConfidenceCalibration(0.7, 0.75); // Within ±10%
      monitor.trackConfidenceCalibration(0.6, 0.9); // Outside ±10%

      const report = monitor.generatePerformanceReport("day");

      expect(report.confidenceCalibration.withinTolerance).toBeCloseTo(0.67, 1);
    });
  });

  describe("Bias Detection Effectiveness Tracking", () => {
    it("should track detected vs actual biases", () => {
      const detected: DetectedBias[] = [createMockDetectedBias()];
      const actual: ActualBias[] = [createMockActualBias()];

      expect(() => monitor.trackBiasDetectionEffectiveness(detected, actual)).not.toThrow();
    });

    it("should calculate detection rate", () => {
      const detected: DetectedBias[] = [
        createMockDetectedBias({ type: BiasType.CONFIRMATION }),
        createMockDetectedBias({ type: BiasType.ANCHORING }),
      ];
      const actual: ActualBias[] = [
        createMockActualBias({ type: "confirmation" }),
        createMockActualBias({ type: "anchoring" }),
        createMockActualBias({ type: "availability" }),
      ];

      monitor.trackBiasDetectionEffectiveness(detected, actual);
      const report = monitor.generatePerformanceReport("day");

      // Detection rate = true positives / total actual = 2/3
      expect(report.biasDetection.detectionRate).toBeCloseTo(0.67, 1);
    });

    it("should calculate false positive rate", () => {
      const detected: DetectedBias[] = [
        createMockDetectedBias({ type: BiasType.CONFIRMATION }),
        createMockDetectedBias({ type: BiasType.ANCHORING }),
        createMockDetectedBias({ type: BiasType.AVAILABILITY }),
      ];
      const actual: ActualBias[] = [createMockActualBias({ type: "confirmation" })];

      monitor.trackBiasDetectionEffectiveness(detected, actual);
      const report = monitor.generatePerformanceReport("day");

      // False positive rate = false positives / total detected = 2/3
      expect(report.biasDetection.falsePositiveRate).toBeCloseTo(0.67, 1);
    });

    it("should calculate precision and recall", () => {
      const detected: DetectedBias[] = [
        createMockDetectedBias({ type: BiasType.CONFIRMATION }),
        createMockDetectedBias({ type: BiasType.ANCHORING }),
      ];
      const actual: ActualBias[] = [
        createMockActualBias({ type: "confirmation" }),
        createMockActualBias({ type: "availability" }),
      ];

      monitor.trackBiasDetectionEffectiveness(detected, actual);
      const report = monitor.generatePerformanceReport("day");

      // Precision = TP / (TP + FP) = 1/2 = 0.5
      // Recall = TP / (TP + FN) = 1/2 = 0.5
      expect(report.biasDetection.precision).toBeCloseTo(0.5, 1);
      expect(report.biasDetection.recall).toBeCloseTo(0.5, 1);
    });

    it("should calculate F1 score", () => {
      const detected: DetectedBias[] = [createMockDetectedBias({ type: BiasType.CONFIRMATION })];
      const actual: ActualBias[] = [createMockActualBias({ type: "confirmation" })];

      monitor.trackBiasDetectionEffectiveness(detected, actual);
      const report = monitor.generatePerformanceReport("day");

      // F1 = 2 * (precision * recall) / (precision + recall)
      expect(report.biasDetection.f1Score).toBeGreaterThan(0);
      expect(report.biasDetection.f1Score).toBeLessThanOrEqual(1);
    });
  });

  describe("Framework Selection Monitoring", () => {
    it("should track framework selection and outcome", () => {
      const selection = createMockFrameworkSelection();
      const outcome = createMockOutcome({ success: true });

      expect(() => monitor.trackFrameworkSelection(selection, outcome)).not.toThrow();
    });

    it("should calculate selection accuracy", () => {
      const selections = [
        {
          selection: createMockFrameworkSelection(),
          outcome: createMockOutcome({ success: true }),
        },
        {
          selection: createMockFrameworkSelection(),
          outcome: createMockOutcome({ success: true }),
        },
        {
          selection: createMockFrameworkSelection(),
          outcome: createMockOutcome({ success: false }),
        },
      ];

      selections.forEach(({ selection, outcome }) =>
        monitor.trackFrameworkSelection(selection, outcome)
      );
      const report = monitor.generatePerformanceReport("day");

      // Accuracy = 2/3
      expect(report.frameworkSelection.accuracy).toBeCloseTo(0.67, 1);
    });

    it("should calculate average outcome quality", () => {
      const selections = [
        { selection: createMockFrameworkSelection(), outcome: createMockOutcome({ quality: 0.8 }) },
        { selection: createMockFrameworkSelection(), outcome: createMockOutcome({ quality: 0.9 }) },
        { selection: createMockFrameworkSelection(), outcome: createMockOutcome({ quality: 0.7 }) },
      ];

      selections.forEach(({ selection, outcome }) =>
        monitor.trackFrameworkSelection(selection, outcome)
      );
      const report = monitor.generatePerformanceReport("day");

      expect(report.frameworkSelection.averageOutcomeQuality).toBeCloseTo(0.8, 1);
    });

    it("should track selection improvement over time", () => {
      // Improving selections (quality increasing)
      const selections = [
        {
          selection: createMockFrameworkSelection(),
          outcome: createMockOutcome({ success: false, quality: 0.5 }),
        },
        {
          selection: createMockFrameworkSelection(),
          outcome: createMockOutcome({ success: true, quality: 0.6 }),
        },
        {
          selection: createMockFrameworkSelection(),
          outcome: createMockOutcome({ success: true, quality: 0.7 }),
        },
        {
          selection: createMockFrameworkSelection(),
          outcome: createMockOutcome({ success: true, quality: 0.8 }),
        },
      ];

      selections.forEach(({ selection, outcome }) =>
        monitor.trackFrameworkSelection(selection, outcome)
      );
      const report = monitor.generatePerformanceReport("day");

      expect(report.frameworkSelection.trend).toBe("improving");
    });
  });

  describe("User Satisfaction Measurement", () => {
    it("should track user feedback", () => {
      const feedback = createMockUserFeedback({ rating: 0.8 });

      expect(() => monitor.trackUserSatisfaction(feedback)).not.toThrow();
    });

    it("should calculate average satisfaction", () => {
      const feedbacks = [
        createMockUserFeedback({ rating: 0.7 }),
        createMockUserFeedback({ rating: 0.8 }),
        createMockUserFeedback({ rating: 0.9 }),
      ];

      feedbacks.forEach((feedback) => monitor.trackUserSatisfaction(feedback));
      const report = monitor.generatePerformanceReport("day");

      expect(report.userSatisfaction.average).toBeCloseTo(0.8, 1);
    });

    it("should calculate satisfied percentage", () => {
      const feedbacks = [
        createMockUserFeedback({ rating: 0.8 }), // Satisfied
        createMockUserFeedback({ rating: 0.9 }), // Satisfied
        createMockUserFeedback({ rating: 0.5 }), // Not satisfied
      ];

      feedbacks.forEach((feedback) => monitor.trackUserSatisfaction(feedback));
      const report = monitor.generatePerformanceReport("day");

      // 2/3 satisfied (rating > 0.7)
      expect(report.userSatisfaction.satisfiedPercentage).toBeCloseTo(0.67, 1);
    });

    it("should track satisfaction trends", () => {
      const feedbacks = [
        createMockUserFeedback({ rating: 0.6 }),
        createMockUserFeedback({ rating: 0.7 }),
        createMockUserFeedback({ rating: 0.8 }),
        createMockUserFeedback({ rating: 0.9 }),
      ];

      feedbacks.forEach((feedback) => monitor.trackUserSatisfaction(feedback));
      const report = monitor.generatePerformanceReport("day");

      expect(report.userSatisfaction.trend).toBe("improving");
    });
  });

  describe("Performance Report Generation", () => {
    it("should generate report for day period", () => {
      const report = monitor.generatePerformanceReport("day");

      expect(report.period).toBe("day");
      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it("should generate report for week period", () => {
      const report = monitor.generatePerformanceReport("week");

      expect(report.period).toBe("week");
    });

    it("should generate report for month period", () => {
      const report = monitor.generatePerformanceReport("month");

      expect(report.period).toBe("month");
    });

    it("should include all metric categories in report", () => {
      const report = monitor.generatePerformanceReport("day");

      expect(report.reasoningQuality).toBeDefined();
      expect(report.confidenceCalibration).toBeDefined();
      expect(report.biasDetection).toBeDefined();
      expect(report.frameworkSelection).toBeDefined();
      expect(report.userSatisfaction).toBeDefined();
    });

    it("should calculate overall performance score", () => {
      // Add some metrics
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.8 }));
      monitor.trackConfidenceCalibration(0.8, 0.8);
      monitor.trackUserSatisfaction(createMockUserFeedback({ rating: 0.8 }));

      const report = monitor.generatePerformanceReport("day");

      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.overallScore).toBeLessThanOrEqual(1);
    });

    it("should include identified trends in report", () => {
      // Add improving metrics
      for (let i = 0; i < 5; i++) {
        monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.6 + i * 0.1 }));
      }

      const report = monitor.generatePerformanceReport("day");

      expect(report.trends).toBeDefined();
      expect(Array.isArray(report.trends)).toBe(true);
    });

    it("should complete report generation within 1 second", () => {
      // Add many metrics with deterministic values
      for (let i = 0; i < 100; i++) {
        monitor.trackReasoningQuality(
          createMockReasoningResult({ quality: 0.5 + (i % 50) * 0.01 })
        );
        monitor.trackConfidenceCalibration(0.5 + (i % 50) * 0.01, 0.5 + ((i + 10) % 50) * 0.01);
        monitor.trackUserSatisfaction(createMockUserFeedback({ rating: 0.5 + (i % 50) * 0.01 }));
      }

      const startTime = Date.now();
      monitor.generatePerformanceReport("day");
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("Performance Trend Identification", () => {
    it("should identify improving trends", () => {
      for (let i = 0; i < 5; i++) {
        monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.5 + i * 0.1 }));
      }

      const trends = monitor.identifyPerformanceTrends();

      const reasoningTrend = trends.find((t: PerformanceTrend) => t.metric === "reasoning_quality");
      expect(reasoningTrend?.direction).toBe("improving");
    });

    it("should identify declining trends", () => {
      for (let i = 0; i < 5; i++) {
        monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.9 - i * 0.1 }));
      }

      const trends = monitor.identifyPerformanceTrends();

      const reasoningTrend = trends.find((t: PerformanceTrend) => t.metric === "reasoning_quality");
      expect(reasoningTrend?.direction).toBe("declining");
    });

    it("should identify stable trends", () => {
      // Use fixed values that are truly stable (small variations around 0.8)
      const stableValues = [0.8, 0.81, 0.79, 0.8, 0.8];
      for (const quality of stableValues) {
        monitor.trackReasoningQuality(createMockReasoningResult({ quality }));
      }

      const trends = monitor.identifyPerformanceTrends();

      const reasoningTrend = trends.find((t: PerformanceTrend) => t.metric === "reasoning_quality");
      expect(reasoningTrend?.direction).toBe("stable");
    });

    it("should calculate trend magnitude", () => {
      for (let i = 0; i < 5; i++) {
        monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.5 + i * 0.1 }));
      }

      const trends = monitor.identifyPerformanceTrends();

      const reasoningTrend = trends.find((t: PerformanceTrend) => t.metric === "reasoning_quality");
      expect(reasoningTrend?.magnitude).toBeGreaterThan(0);
    });

    it("should include confidence in trend assessment", () => {
      for (let i = 0; i < 10; i++) {
        monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.5 + i * 0.05 }));
      }

      const trends = monitor.identifyPerformanceTrends();

      const reasoningTrend = trends.find((t: PerformanceTrend) => t.metric === "reasoning_quality");
      expect(reasoningTrend?.confidence).toBeGreaterThan(0);
      expect(reasoningTrend?.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("Quality Metrics Calculation", () => {
    it("should calculate average quality", () => {
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.7 }));
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.8 }));
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.9 }));

      const metrics = monitor.calculateQualityMetrics();

      expect(metrics.average).toBeCloseTo(0.8, 1);
    });

    it("should calculate min and max quality", () => {
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.5 }));
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.9 }));
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.7 }));

      const metrics = monitor.calculateQualityMetrics();

      expect(metrics.min).toBe(0.5);
      expect(metrics.max).toBe(0.9);
    });

    it("should calculate standard deviation", () => {
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.5 }));
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.7 }));
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.9 }));

      const metrics = monitor.calculateQualityMetrics();

      expect(metrics.standardDeviation).toBeGreaterThan(0);
    });

    it("should include sample size", () => {
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.8 }));
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.8 }));

      const metrics = monitor.calculateQualityMetrics();

      expect(metrics.sampleSize).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty metrics gracefully", () => {
      const report = monitor.generatePerformanceReport("day");

      expect(report.reasoningQuality.sampleSize).toBe(0);
      expect(report.overallScore).toBe(0);
    });

    it("should handle single data point", () => {
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.8 }));

      const metrics = monitor.calculateQualityMetrics();

      expect(metrics.average).toBe(0.8);
      expect(metrics.trend).toBe("stable");
    });

    it("should handle outliers in metrics", () => {
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.8 }));
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.8 }));
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.1 })); // Outlier

      const metrics = monitor.calculateQualityMetrics();

      expect(metrics.average).toBeGreaterThan(0);
      expect(metrics.standardDeviation).toBeGreaterThan(0);
    });

    it("should handle missing data in report generation", () => {
      // Only track some metrics
      monitor.trackReasoningQuality(createMockReasoningResult({ quality: 0.8 }));

      const report = monitor.generatePerformanceReport("day");

      expect(report.reasoningQuality.sampleSize).toBeGreaterThan(0);
      expect(report.confidenceCalibration.sampleSize).toBe(0);
    });

    it("should handle time period with no activity", () => {
      const report = monitor.generatePerformanceReport("week");

      expect(report.reasoningQuality.sampleSize).toBe(0);
      expect(report.trends).toHaveLength(0);
    });
  });

  describe("Performance Sanity Checks", () => {
    it("should complete tracking operations in reasonable time", () => {
      const result = createMockReasoningResult({ quality: 0.8 });

      const startTime = Date.now();
      monitor.trackReasoningQuality(result);
      const endTime = Date.now();

      // Sanity check: tracking should not hang or take unreasonably long
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it("should handle batch tracking without hanging", () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        monitor.trackReasoningQuality(
          createMockReasoningResult({ quality: 0.5 + (i % 50) * 0.01 })
        );
      }

      const endTime = Date.now();

      // Sanity check: batch operations should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});

// Helper functions to create mock objects

function createMockReasoningResult(overrides?: Partial<ReasoningResult>): ReasoningResult {
  return {
    conclusion: "Test conclusion",
    reasoning: ["Step 1", "Step 2"],
    insights: [],
    confidence: 0.8,
    quality: 0.8,
    ...overrides,
  } as ReasoningResult;
}

function createMockDetectedBias(overrides?: Partial<DetectedBias>): DetectedBias {
  return {
    type: BiasType.CONFIRMATION,
    severity: 0.5,
    confidence: 0.8,
    evidence: ["Evidence 1"],
    location: { stepIndex: 0, reasoning: "Test reasoning" },
    explanation: "Test explanation",
    detectedAt: new Date(),
    ...overrides,
  } as DetectedBias;
}

function createMockActualBias(overrides?: Partial<ActualBias>): ActualBias {
  return {
    type: "confirmation",
    severity: 0.5,
    location: "Step 0",
    evidence: ["Evidence 1"],
    ...overrides,
  };
}

function createMockFrameworkSelection(overrides?: Partial<FrameworkSelection>): FrameworkSelection {
  return {
    primaryFramework: "scientific-method",
    confidence: 0.8,
    reason: "Test rationale",
    alternatives: [],
    isHybrid: false,
    timestamp: new Date(),
    ...overrides,
  } as FrameworkSelection;
}

// Counters for deterministic ID generation
let outcomeIdCounter = 0;
let feedbackIdCounter = 0;

function createMockOutcome(overrides?: Partial<Outcome>): Outcome {
  return {
    id: `outcome-${outcomeIdCounter++}`,
    success: true,
    quality: 0.8,
    description: "Test outcome",
    timestamp: new Date(),
    ...overrides,
  };
}

function createMockUserFeedback(overrides?: Partial<UserFeedback>): UserFeedback {
  return {
    id: `feedback-${feedbackIdCounter++}`,
    userId: "test-user",
    rating: 0.8,
    context: "Test context",
    timestamp: new Date(),
    ...overrides,
  };
}
