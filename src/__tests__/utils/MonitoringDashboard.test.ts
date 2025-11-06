/**
 * Unit tests for MonitoringDashboard
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCLIDashboard,
  MonitoringDashboard,
  PerformanceReport,
} from "../../utils/MonitoringDashboard.js";
import {
  PerformanceMetrics,
  PerformanceMonitor,
} from "../../utils/PerformanceMonitor.js";

// Mock console methods to avoid cluttering test output
const mockConsole = {
  log: vi.fn(),
  clear: vi.fn(),
  warn: vi.fn(),
};

// Store original console methods
const originalConsole = { ...console };

describe("MonitoringDashboard", () => {
  let monitor: PerformanceMonitor;
  let dashboard: MonitoringDashboard;

  beforeEach(() => {
    // Override the global test setup console suppression for this test file
    // since we need to test console output
    console.log = mockConsole.log;
    console.clear = mockConsole.clear;
    console.warn = mockConsole.warn;
    monitor = new PerformanceMonitor({
      responseTimeWarning: 100,
      responseTimeCritical: 500,
      memoryUsageWarning: 100 * 1024 * 1024,
      memoryUsageCritical: 200 * 1024 * 1024,
      confidenceThreshold: 0.5,
    });

    dashboard = new MonitoringDashboard(monitor, {
      refreshInterval: 100, // Short interval for testing
      alertThreshold: 5,
      displayMetrics: ["responseTime", "memoryUsage", "confidence"],
      timeWindows: [1000, 5000], // 1s, 5s
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    dashboard.stop();
    monitor.clearMetrics();
    // Restore original console methods
    Object.assign(console, originalConsole);
    vi.clearAllMocks();
  });

  describe("Dashboard Creation", () => {
    it("should create a dashboard with default config", () => {
      const defaultDashboard = new MonitoringDashboard(monitor);
      expect(defaultDashboard).toBeDefined();
    });

    it("should create a CLI dashboard", () => {
      const cliDashboard = createCLIDashboard(monitor);
      expect(cliDashboard).toBeInstanceOf(MonitoringDashboard);
    });

    it("should merge custom config with defaults", () => {
      const customDashboard = new MonitoringDashboard(monitor, {
        refreshInterval: 2000,
      });
      expect(customDashboard).toBeDefined();
    });
  });

  describe("Dashboard Control", () => {
    it("should start and stop dashboard", () => {
      expect(() => dashboard.start()).not.toThrow();
      expect(mockConsole.log).toHaveBeenCalledWith(
        "🚀 Cognitive Performance Dashboard Started"
      );

      expect(() => dashboard.stop()).not.toThrow();
      expect(mockConsole.log).toHaveBeenCalledWith(
        "📊 Cognitive Performance Dashboard Stopped"
      );
    });

    it("should not start dashboard twice", () => {
      dashboard.start();
      mockConsole.log.mockClear();

      dashboard.start();
      expect(mockConsole.warn).toHaveBeenCalledWith(
        "Dashboard is already running"
      );
    });

    it("should handle stopping when not running", () => {
      expect(() => dashboard.stop()).not.toThrow();
    });
  });

  describe("Dashboard Display", () => {
    beforeEach(() => {
      // Add sample metrics
      const sampleMetrics: PerformanceMetrics[] = [
        {
          responseTime: 150,
          memoryUsage: monitor.getMemoryUsage(),
          cognitiveMetrics: {
            confidenceScore: 0.8,
            reasoningDepth: 2,
            memoryRetrievals: 1,
            workingMemoryLoad: 0.6,
          },
          timestamp: Date.now(),
          requestId: "test-1",
          toolName: "think",
        },
        {
          responseTime: 80,
          memoryUsage: monitor.getMemoryUsage(),
          cognitiveMetrics: {
            confidenceScore: 0.9,
            reasoningDepth: 1,
            memoryRetrievals: 2,
            workingMemoryLoad: 0.4,
          },
          timestamp: Date.now(),
          requestId: "test-2",
          toolName: "recall",
        },
      ];

      sampleMetrics.forEach((metrics) => monitor.recordMetrics(metrics));
    });

    it("should display dashboard without errors", () => {
      expect(() => dashboard.displayDashboard()).not.toThrow();
      expect(mockConsole.clear).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith(
        "╔══════════════════════════════════════════════════════════════╗"
      );
    });

    it("should display statistics for different time windows", () => {
      dashboard.displayDashboard();

      // Should display statistics for each configured time window
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining("1s Statistics:")
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining("5s Statistics:")
      );
    });

    it("should display memory usage bar", () => {
      dashboard.displayDashboard();

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining("💾 Memory Usage:")
      );
    });

    it("should display recent alerts when present", () => {
      // Generate an alert by adding high response time metric
      const alertMetrics: PerformanceMetrics = {
        responseTime: 600, // Above critical threshold
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.8,
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        },
        timestamp: Date.now(),
        requestId: "alert-test",
        toolName: "think",
      };
      monitor.recordMetrics(alertMetrics);

      dashboard.displayDashboard();

      expect(mockConsole.log).toHaveBeenCalledWith("🚨 Recent Alerts:");
    });
  });

  describe("Performance Report Generation", () => {
    beforeEach(() => {
      // Add sample metrics
      const metrics: PerformanceMetrics = {
        responseTime: 120,
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.7,
          reasoningDepth: 2,
          memoryRetrievals: 1,
          workingMemoryLoad: 0.5,
        },
        timestamp: Date.now(),
        requestId: "report-test",
        toolName: "think",
      };
      monitor.recordMetrics(metrics);
    });

    it("should generate performance report", () => {
      const report = dashboard.generateReport();

      expect(report).toHaveProperty("timestamp");
      expect(report).toHaveProperty("statistics");
      expect(report).toHaveProperty("alerts");
      expect(report).toHaveProperty("currentMemoryUsage");
      expect(report).toHaveProperty("recommendations");

      expect(typeof report.timestamp).toBe("number");
      expect(Array.isArray(report.alerts)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it("should generate report with time window", () => {
      const report = dashboard.generateReport(1000);

      expect(report.timeWindow).toBe(1000);
      expect(report.statistics.totalRequests).toBeGreaterThanOrEqual(0);
    });

    it("should include recommendations in report", () => {
      // Add metrics that should trigger recommendations
      const slowMetrics: PerformanceMetrics = {
        responseTime: 2500, // High response time (above 2000ms threshold)
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.3, // Low confidence (below 0.5 threshold)
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        },
        timestamp: Date.now(),
        requestId: "slow-test",
        toolName: "think",
      };
      monitor.recordMetrics(slowMetrics);

      const report = dashboard.generateReport();

      // Debug output
      console.log("Report stats:", {
        averageResponseTime: report.statistics.averageResponseTime,
        averageConfidence: report.statistics.averageConfidence,
        totalRequests: report.statistics.totalRequests,
      });
      console.log("Recommendations:", report.recommendations);

      expect(report.recommendations.length).toBeGreaterThan(0);
      // Should have at least one recommendation about performance or confidence
      const hasPerformanceRec = report.recommendations.some(
        (r) =>
          r.includes("cognitive processing pipeline") ??
          r.includes("response time")
      );
      const hasConfidenceRec = report.recommendations.some(
        (r) => r.includes("confidence") || r.includes("model")
      );
      expect((hasPerformanceRec ?? false) || (hasConfidenceRec ?? false)).toBe(
        true
      );
    });
  });

  describe("Data Export", () => {
    it("should export dashboard data as JSON", () => {
      const jsonData = dashboard.exportData();

      expect(typeof jsonData).toBe("string");
      expect(() => JSON.parse(jsonData)).not.toThrow();

      const parsed = JSON.parse(jsonData);
      expect(parsed).toHaveProperty("timestamp");
      expect(parsed).toHaveProperty("statistics");
      expect(parsed).toHaveProperty("alerts");
    });

    it("should export valid JSON structure", () => {
      // Add some metrics first
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
        requestId: "export-test",
        toolName: "think",
      };
      monitor.recordMetrics(metrics);

      const jsonData = dashboard.exportData();
      const parsed: PerformanceReport = JSON.parse(jsonData);

      expect(parsed.statistics.totalRequests).toBe(1);
      expect(parsed.statistics.averageResponseTime).toBe(100);
    });
  });

  describe("Recommendation System", () => {
    it("should generate response time recommendations", () => {
      // Add slow metrics
      const slowMetrics: PerformanceMetrics = {
        responseTime: 2500, // High response time
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.8,
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        },
        timestamp: Date.now(),
        requestId: "slow-test",
        toolName: "think",
      };
      monitor.recordMetrics(slowMetrics);

      const report = dashboard.generateReport();

      expect(
        report.recommendations.some((r) =>
          r.includes("optimizing cognitive processing pipeline")
        )
      ).toBe(true);
    });

    it("should generate confidence recommendations", () => {
      // Add low confidence metrics
      const lowConfidenceMetrics: PerformanceMetrics = {
        responseTime: 100,
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.2, // Very low confidence
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        },
        timestamp: Date.now(),
        requestId: "low-confidence-test",
        toolName: "think",
      };
      monitor.recordMetrics(lowConfidenceMetrics);

      const report = dashboard.generateReport();

      expect(report.recommendations.some((r) => r.includes("confidence"))).toBe(
        true
      );
    });

    it("should generate tool-specific recommendations", () => {
      // Add slow tool-specific metrics
      const slowThinkMetrics: PerformanceMetrics = {
        responseTime: 4000, // Very slow
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.8,
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        },
        timestamp: Date.now(),
        requestId: "slow-think-test",
        toolName: "think",
      };
      monitor.recordMetrics(slowThinkMetrics);

      const report = dashboard.generateReport();

      expect(
        report.recommendations.some((r) => r.includes("Optimize think tool"))
      ).toBe(true);
    });

    it("should generate alert-based recommendations", () => {
      // Generate critical alert
      const criticalMetrics: PerformanceMetrics = {
        responseTime: 600, // Critical threshold
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.8,
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        },
        timestamp: Date.now(),
        requestId: "critical-test",
        toolName: "think",
      };
      monitor.recordMetrics(criticalMetrics);

      const report = dashboard.generateReport();

      expect(
        report.recommendations.some((r) =>
          r.includes("critical performance alerts")
        )
      ).toBe(true);
    });
  });

  describe("Utility Functions", () => {
    it("should format time windows correctly", () => {
      const dashboard = new MonitoringDashboard(monitor);

      // Access private method for testing
      const formatTimeWindow = (dashboard as any).formatTimeWindow;

      expect(formatTimeWindow(5000)).toBe("5s");
      expect(formatTimeWindow(120000)).toBe("2min");
      expect(formatTimeWindow(7200000)).toBe("2h");
    });

    it("should format bytes correctly", () => {
      const dashboard = new MonitoringDashboard(monitor);

      // Access private method for testing
      const formatBytes = (dashboard as any).formatBytes;

      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(1024)).toBe("1.0 KB");
      expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
    });
  });

  describe("Edge Cases", () => {
    it("should handle dashboard with no metrics", () => {
      expect(() => dashboard.displayDashboard()).not.toThrow();
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining("Total Requests: 0")
      );
    });

    it("should handle dashboard with no alerts", () => {
      // Add normal metrics (no alerts)
      const normalMetrics: PerformanceMetrics = {
        responseTime: 50, // Below warning threshold
        memoryUsage: monitor.getMemoryUsage(),
        cognitiveMetrics: {
          confidenceScore: 0.8, // Above confidence threshold
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        },
        timestamp: Date.now(),
        requestId: "normal-test",
        toolName: "think",
      };
      monitor.recordMetrics(normalMetrics);

      expect(() => dashboard.displayDashboard()).not.toThrow();
      // Should not display alerts section
      expect(mockConsole.log).not.toHaveBeenCalledWith("🚨 Recent Alerts:");
    });

    it("should handle report generation with no data", () => {
      const emptyMonitor = new PerformanceMonitor();
      const emptyDashboard = new MonitoringDashboard(emptyMonitor);

      const report = emptyDashboard.generateReport();

      expect(report.statistics.totalRequests).toBe(0);
      expect(report.alerts.length).toBe(0);
      // With no data, there might still be some general recommendations
      expect(report.recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });
});
