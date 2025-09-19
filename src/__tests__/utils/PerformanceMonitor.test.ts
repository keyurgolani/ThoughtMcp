/**
 * Unit tests for PerformanceMonitor
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  PerformanceMeasurement,
  PerformanceMetrics,
  PerformanceMonitor,
} from "../../utils/PerformanceMonitor.js";

describe("PerformanceMonitor", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      responseTimeWarning: 100,
      responseTimeCritical: 500,
      memoryUsageWarning: 100 * 1024 * 1024, // 100MB
      memoryUsageCritical: 200 * 1024 * 1024, // 200MB
      confidenceThreshold: 0.5,
    });
  });

  afterEach(() => {
    monitor.clearMetrics();
  });

  describe("Basic Functionality", () => {
    it("should create a performance monitor with default thresholds", () => {
      const defaultMonitor = new PerformanceMonitor();
      expect(defaultMonitor).toBeDefined();
    });

    it("should start a performance measurement", () => {
      const measurement = monitor.startMeasurement("test-request", "think");
      expect(measurement).toBeInstanceOf(PerformanceMeasurement);
    });

    it("should get current memory usage", () => {
      const memoryUsage = monitor.getMemoryUsage();
      expect(memoryUsage).toHaveProperty("heapUsed");
      expect(memoryUsage).toHaveProperty("heapTotal");
      expect(memoryUsage).toHaveProperty("external");
      expect(memoryUsage).toHaveProperty("rss");
      expect(typeof memoryUsage.heapUsed).toBe("number");
    });
  });

  describe("Metrics Recording", () => {
    it("should record performance metrics", () => {
      const metrics: PerformanceMetrics = {
        responseTime: 150,
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.8,
          reasoningDepth: 3,
          memoryRetrievals: 2,
          workingMemoryLoad: 0.6,
        },
        timestamp: Date.now(),
        requestId: "test-request",
        toolName: "think",
      };

      monitor.recordMetrics(metrics);
      const stats = monitor.getStatistics();
      expect(stats.totalRequests).toBe(1);
      expect(stats.averageResponseTime).toBe(150);
    });

    it("should maintain metrics history limit", () => {
      // Create a monitor with small history limit for testing
      const smallMonitor = new PerformanceMonitor();
      (smallMonitor as any).maxMetricsHistory = 3;

      // Add more metrics than the limit
      for (let i = 0; i < 5; i++) {
        const metrics: PerformanceMetrics = {
          responseTime: 100 + i,
          memoryUsage: smallMonitor.getMemoryUsage(),
          cognitiveMetrics: {
            confidenceScore: 0.8,
            reasoningDepth: 1,
            memoryRetrievals: 0,
            workingMemoryLoad: 0.5,
          },
          timestamp: Date.now(),
          requestId: `test-request-${i}`,
          toolName: "think",
        };
        smallMonitor.recordMetrics(metrics);
      }

      const exportedMetrics = smallMonitor.exportMetrics();
      expect(exportedMetrics.length).toBe(3);
    });
  });

  describe("Performance Measurement", () => {
    it("should complete a measurement and record metrics", async () => {
      const measurement = monitor.startMeasurement("test-request", "think");

      // Simulate some processing time
      await new Promise((resolve) => setTimeout(resolve, 10));

      measurement.recordCognitiveMetrics({
        confidenceScore: 0.9,
        reasoningDepth: 2,
        memoryRetrievals: 1,
        workingMemoryLoad: 0.7,
      });

      const metrics = measurement.complete();

      expect(metrics.responseTime).toBeGreaterThan(0);
      expect(metrics.cognitiveMetrics.confidenceScore).toBe(0.9);
      expect(metrics.cognitiveMetrics.reasoningDepth).toBe(2);
      expect(metrics.requestId).toBe("test-request");
      expect(metrics.toolName).toBe("think");

      const stats = monitor.getStatistics();
      expect(stats.totalRequests).toBe(1);
    });

    it("should record partial cognitive metrics", () => {
      const measurement = monitor.startMeasurement("test-request", "recall");

      measurement.recordCognitiveMetrics({
        confidenceScore: 0.6,
        memoryRetrievals: 5,
      });

      const metrics = measurement.complete();

      expect(metrics.cognitiveMetrics.confidenceScore).toBe(0.6);
      expect(metrics.cognitiveMetrics.memoryRetrievals).toBe(5);
      expect(metrics.cognitiveMetrics.reasoningDepth).toBe(0); // Default value
    });
  });

  describe("Statistics Calculation", () => {
    beforeEach(() => {
      // Add sample metrics
      const sampleMetrics = [
        { responseTime: 100, confidence: 0.8 },
        { responseTime: 200, confidence: 0.6 },
        { responseTime: 150, confidence: 0.9 },
        { responseTime: 300, confidence: 0.4 },
        { responseTime: 120, confidence: 0.7 },
      ];

      sampleMetrics.forEach((sample, index) => {
        const metrics: PerformanceMetrics = {
          responseTime: sample.responseTime,
          memoryUsage: monitor.getMemoryUsage(),
          cognitiveMetrics: {
            confidenceScore: sample.confidence,
            reasoningDepth: 2,
            memoryRetrievals: 1,
            workingMemoryLoad: 0.5,
          },
          timestamp: Date.now() - (sampleMetrics.length - index) * 1000,
          requestId: `test-request-${index}`,
          toolName: index % 2 === 0 ? "think" : "recall",
        };
        monitor.recordMetrics(metrics);
      });
    });

    it("should calculate correct statistics", () => {
      const stats = monitor.getStatistics();

      expect(stats.totalRequests).toBe(5);
      expect(stats.averageResponseTime).toBe(174); // (100+200+150+300+120)/5
      expect(stats.medianResponseTime).toBe(150);
      expect(stats.averageConfidence).toBeCloseTo(0.68, 2); // (0.8+0.6+0.9+0.4+0.7)/5
      expect(stats.lowConfidenceRequests).toBe(1); // Only 0.4 is below 0.5 threshold
    });

    it("should calculate percentiles correctly", () => {
      const stats = monitor.getStatistics();

      // For [100, 120, 150, 200, 300] sorted
      expect(stats.p95ResponseTime).toBe(300); // 95th percentile
      expect(stats.p99ResponseTime).toBe(300); // 99th percentile
    });

    it("should calculate tool usage statistics", () => {
      const stats = monitor.getStatistics();

      expect(stats.toolUsageStats).toHaveProperty("think");
      expect(stats.toolUsageStats).toHaveProperty("recall");

      expect(stats.toolUsageStats.think.count).toBe(3);
      expect(stats.toolUsageStats.recall.count).toBe(2);
    });

    it("should filter statistics by time window", () => {
      const recentStats = monitor.getStatistics(2000); // Last 2 seconds
      const allStats = monitor.getStatistics();

      expect(recentStats.totalRequests).toBeLessThanOrEqual(
        allStats.totalRequests
      );
    });

    it("should return empty statistics when no metrics exist", () => {
      const emptyMonitor = new PerformanceMonitor();
      const stats = emptyMonitor.getStatistics();

      expect(stats.totalRequests).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.averageConfidence).toBe(0);
    });
  });

  describe("Alert System", () => {
    it("should generate response time warning alert", () => {
      const metrics: PerformanceMetrics = {
        responseTime: 150, // Above warning threshold of 100
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.8,
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        },
        timestamp: Date.now(),
        requestId: "test-request",
        toolName: "think",
      };

      monitor.recordMetrics(metrics);
      const alerts = monitor.getAlerts();

      expect(alerts.length).toBe(1);
      expect(alerts[0].type).toBe("warning");
      expect(alerts[0].metric).toBe("responseTime");
      expect(alerts[0].value).toBe(150);
    });

    it("should generate response time critical alert", () => {
      const metrics: PerformanceMetrics = {
        responseTime: 600, // Above critical threshold of 500
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.8,
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        },
        timestamp: Date.now(),
        requestId: "test-request",
        toolName: "think",
      };

      monitor.recordMetrics(metrics);
      const alerts = monitor.getAlerts();

      expect(alerts.length).toBe(1);
      expect(alerts[0].type).toBe("critical");
      expect(alerts[0].metric).toBe("responseTime");
    });

    it("should generate low confidence alert", () => {
      const metrics: PerformanceMetrics = {
        responseTime: 50, // Below warning threshold
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.3, // Below confidence threshold of 0.5
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        },
        timestamp: Date.now(),
        requestId: "test-request",
        toolName: "think",
      };

      monitor.recordMetrics(metrics);
      const alerts = monitor.getAlerts();

      expect(alerts.length).toBe(1);
      expect(alerts[0].type).toBe("warning");
      expect(alerts[0].metric).toBe("confidence");
      expect(alerts[0].value).toBe(0.3);
    });

    it("should maintain alerts history limit", () => {
      // Create a monitor with low thresholds to generate alerts
      const smallMonitor = new PerformanceMonitor({
        responseTimeWarning: 1,
        responseTimeCritical: 10,
        memoryUsageWarning: 1,
        memoryUsageCritical: 10,
        confidenceThreshold: 0.9,
      });

      // Generate multiple alerts by exceeding thresholds
      for (let i = 0; i < 10; i++) {
        const metrics: PerformanceMetrics = {
          responseTime: 600, // Will trigger critical alert
          memoryUsage: smallMonitor.getMemoryUsage(),
          cognitiveMetrics: {
            confidenceScore: 0.1, // Will trigger confidence alert
            reasoningDepth: 1,
            memoryRetrievals: 0,
            workingMemoryLoad: 0.5,
          },
          timestamp: Date.now(),
          requestId: `test-request-${i}`,
          toolName: "think",
        };
        smallMonitor.recordMetrics(metrics);
      }

      const alerts = smallMonitor.getAlerts();
      // Should have generated alerts but be limited by maxAlertsHistory (100 by default)
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.length).toBeLessThanOrEqual(100);
    });
  });

  describe("Data Export and Management", () => {
    it("should export metrics correctly", () => {
      const metrics: PerformanceMetrics = {
        responseTime: 100,
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.8,
          reasoningDepth: 2,
          memoryRetrievals: 1,
          workingMemoryLoad: 0.6,
        },
        timestamp: Date.now(),
        requestId: "test-request",
        toolName: "think",
      };

      monitor.recordMetrics(metrics);
      const exported = monitor.exportMetrics();

      expect(exported.length).toBe(1);
      expect(exported[0]).toEqual(metrics);
    });

    it("should clear metrics and alerts", () => {
      // Add some metrics and generate alerts
      const metrics: PerformanceMetrics = {
        responseTime: 600, // Will generate alert
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.8,
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        },
        timestamp: Date.now(),
        requestId: "test-request",
        toolName: "think",
      };

      monitor.recordMetrics(metrics);
      expect(monitor.getStatistics().totalRequests).toBe(1);
      expect(monitor.getAlerts().length).toBe(1);

      monitor.clearMetrics();
      expect(monitor.getStatistics().totalRequests).toBe(0);
      expect(monitor.getAlerts().length).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty metrics gracefully", () => {
      const stats = monitor.getStatistics();
      expect(stats.totalRequests).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
    });

    it("should handle single metric correctly", () => {
      const metrics: PerformanceMetrics = {
        responseTime: 100,
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.8,
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        },
        timestamp: Date.now(),
        requestId: "test-request",
        toolName: "think",
      };

      monitor.recordMetrics(metrics);
      const stats = monitor.getStatistics();

      expect(stats.totalRequests).toBe(1);
      expect(stats.averageResponseTime).toBe(100);
      expect(stats.medianResponseTime).toBe(100);
      expect(stats.p95ResponseTime).toBe(100);
    });

    it("should handle metrics with missing optional fields", () => {
      const measurement = monitor.startMeasurement("test-request", "think");

      // Don't record any cognitive metrics
      const metrics = measurement.complete();

      expect(metrics.cognitiveMetrics.confidenceScore).toBe(0);
      expect(metrics.cognitiveMetrics.reasoningDepth).toBe(0);
      expect(metrics.cognitiveMetrics.memoryRetrievals).toBe(0);
      expect(metrics.cognitiveMetrics.workingMemoryLoad).toBe(0);
    });
  });
});
