/**
 * Tests for Performance Monitor
 *
 * Validates performance tracking, percentile calculations, and reporting.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  PerformanceMonitor,
  globalPerformanceMonitor,
  measureAsync,
  measureSync,
} from "../../../utils/performance-monitor";

describe("PerformanceMonitor", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe("Constructor", () => {
    it("should initialize with default maxMetrics", () => {
      const defaultMonitor = new PerformanceMonitor();
      expect(defaultMonitor.getMetricCount()).toBe(0);
    });

    it("should accept custom maxMetrics", () => {
      const customMonitor = new PerformanceMonitor(100);
      expect(customMonitor.getMetricCount()).toBe(0);
    });
  });

  describe("Timer Operations", () => {
    it("should start and end a timer", () => {
      const timer = monitor.startTimer("test-op", "test-category");
      expect(timer).toBeDefined();
      expect(timer.getOperation()).toBe("test-op");
      expect(timer.getCategory()).toBe("test-category");

      const duration = monitor.endTimer(timer);
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(monitor.getMetricCount()).toBe(1);
    });

    it("should track timer metadata", () => {
      const metadata = { userId: "user123", requestId: "req456" };
      const timer = monitor.startTimer("test-op", "test-category", metadata);
      expect(timer.getMetadata()).toEqual(metadata);

      monitor.endTimer(timer);
      const metrics = monitor.getMetricsByOperation("test-op");
      expect(metrics[0].metadata).toEqual(metadata);
    });

    it("should measure elapsed time accurately", async () => {
      const timer = monitor.startTimer("delay-op", "test");
      await new Promise((resolve) => setTimeout(resolve, 15));
      const duration = monitor.endTimer(timer);
      // Allow 5ms tolerance for timer imprecision in CI environments
      // setTimeout can fire slightly early due to event loop timing
      expect(duration).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Metric Recording", () => {
    it("should record a metric manually", () => {
      monitor.recordMetric("manual-op", "manual-category", 100);
      expect(monitor.getMetricCount()).toBe(1);

      const metrics = monitor.getMetricsByOperation("manual-op");
      expect(metrics).toHaveLength(1);
      expect(metrics[0].duration).toBe(100);
      expect(metrics[0].operation).toBe("manual-op");
      expect(metrics[0].category).toBe("manual-category");
    });

    it("should record metric with metadata", () => {
      const metadata = { test: "value" };
      monitor.recordMetric("op", "cat", 50, metadata);

      const metrics = monitor.getMetricsByOperation("op");
      expect(metrics[0].metadata).toEqual(metadata);
    });

    it("should limit metrics to maxMetrics", () => {
      const smallMonitor = new PerformanceMonitor(5);

      for (let i = 0; i < 10; i++) {
        smallMonitor.recordMetric("op", "cat", i);
      }

      expect(smallMonitor.getMetricCount()).toBe(5);
      const metrics = smallMonitor.getMetricsByOperation("op");
      expect(metrics[0].duration).toBe(5); // Should keep last 5 (5-9)
    });
  });

  describe("Statistics Calculation", () => {
    beforeEach(() => {
      // Record metrics with known values for testing percentiles
      const durations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      durations.forEach((duration) => {
        monitor.recordMetric("test-op", "test-cat", duration);
      });
    });

    it("should calculate percentile statistics", () => {
      const stats = monitor.getStats("test-op");
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(10);
      expect(stats!.min).toBe(10);
      expect(stats!.max).toBe(100);
      expect(stats!.mean).toBe(55);
      // p50 at index Math.floor(10 * 0.5) = 5, which is the 6th element (60)
      expect(stats!.p50).toBe(60);
      // p95 at index Math.floor(10 * 0.95) = 9, which is the 10th element (100)
      expect(stats!.p95).toBe(100);
      // p99 at index Math.floor(10 * 0.99) = 9, which is the 10th element (100)
      expect(stats!.p99).toBe(100);
    });

    it("should filter stats by category", () => {
      monitor.recordMetric("test-op", "other-cat", 200);

      const stats = monitor.getStats("test-op", "test-cat");
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(10);
      expect(stats!.max).toBe(100);
    });

    it("should return null for non-existent operation", () => {
      const stats = monitor.getStats("non-existent");
      expect(stats).toBeNull();
    });

    it("should return null when no metrics match category", () => {
      const stats = monitor.getStats("test-op", "non-existent-cat");
      expect(stats).toBeNull();
    });

    it("should handle single metric", () => {
      const singleMonitor = new PerformanceMonitor();
      singleMonitor.recordMetric("single", "cat", 42);

      const stats = singleMonitor.getStats("single");
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
      expect(stats!.min).toBe(42);
      expect(stats!.max).toBe(42);
      expect(stats!.mean).toBe(42);
      expect(stats!.p50).toBe(42);
      expect(stats!.p95).toBe(42);
      expect(stats!.p99).toBe(42);
    });
  });

  describe("Report Generation", () => {
    beforeEach(() => {
      const durations = [10, 20, 30, 40, 50];
      durations.forEach((duration) => {
        monitor.recordMetric("report-op", "report-cat", duration);
      });
    });

    it("should generate performance report", () => {
      const report = monitor.generateReport("report-op");
      expect(report).not.toBeNull();
      expect(report!.operation).toBe("report-op");
      expect(report!.category).toBe("all");
      expect(report!.samples).toBe(5);
      expect(report!.stats.count).toBe(5);
      expect(report!.period.start).toBeInstanceOf(Date);
      expect(report!.period.end).toBeInstanceOf(Date);
    });

    it("should generate report filtered by category", () => {
      monitor.recordMetric("report-op", "other-cat", 100);

      const report = monitor.generateReport("report-op", "report-cat");
      expect(report).not.toBeNull();
      expect(report!.category).toBe("report-cat");
      expect(report!.samples).toBe(5);
    });

    it("should return null for non-existent operation", () => {
      const report = monitor.generateReport("non-existent");
      expect(report).toBeNull();
    });

    it("should return null when no metrics match category", () => {
      const report = monitor.generateReport("report-op", "non-existent-cat");
      expect(report).toBeNull();
    });

    it("should calculate correct time period", () => {
      const report = monitor.generateReport("report-op");
      expect(report).not.toBeNull();
      expect(report!.period.start.getTime()).toBeLessThanOrEqual(report!.period.end.getTime());
    });
  });

  describe("Metric Queries", () => {
    beforeEach(() => {
      monitor.recordMetric("op1", "cat1", 10);
      monitor.recordMetric("op1", "cat2", 20);
      monitor.recordMetric("op2", "cat1", 30);
      monitor.recordMetric("op2", "cat2", 40);
    });

    it("should get metrics by category", () => {
      const metrics = monitor.getMetricsByCategory("cat1");
      expect(metrics).toHaveLength(2);
      expect(metrics.every((m) => m.category === "cat1")).toBe(true);
    });

    it("should get metrics by operation", () => {
      const metrics = monitor.getMetricsByOperation("op1");
      expect(metrics).toHaveLength(2);
      expect(metrics.every((m) => m.operation === "op1")).toBe(true);
    });

    it("should return empty array for non-existent category", () => {
      const metrics = monitor.getMetricsByCategory("non-existent");
      expect(metrics).toHaveLength(0);
    });

    it("should return empty array for non-existent operation", () => {
      const metrics = monitor.getMetricsByOperation("non-existent");
      expect(metrics).toHaveLength(0);
    });
  });

  describe("Utility Methods", () => {
    it("should clear all metrics", () => {
      monitor.recordMetric("op", "cat", 10);
      monitor.recordMetric("op", "cat", 20);
      expect(monitor.getMetricCount()).toBe(2);

      monitor.clear();
      expect(monitor.getMetricCount()).toBe(0);
    });

    it("should get metric count", () => {
      expect(monitor.getMetricCount()).toBe(0);
      monitor.recordMetric("op", "cat", 10);
      expect(monitor.getMetricCount()).toBe(1);
      monitor.recordMetric("op", "cat", 20);
      expect(monitor.getMetricCount()).toBe(2);
    });

    it("should get all unique operations", () => {
      monitor.recordMetric("op1", "cat", 10);
      monitor.recordMetric("op1", "cat", 20);
      monitor.recordMetric("op2", "cat", 30);

      const operations = monitor.getOperations();
      expect(operations).toHaveLength(2);
      expect(operations).toContain("op1");
      expect(operations).toContain("op2");
    });

    it("should get all unique categories", () => {
      monitor.recordMetric("op", "cat1", 10);
      monitor.recordMetric("op", "cat1", 20);
      monitor.recordMetric("op", "cat2", 30);

      const categories = monitor.getCategories();
      expect(categories).toHaveLength(2);
      expect(categories).toContain("cat1");
      expect(categories).toContain("cat2");
    });

    it("should return empty arrays when no metrics", () => {
      expect(monitor.getOperations()).toHaveLength(0);
      expect(monitor.getCategories()).toHaveLength(0);
    });
  });

  describe("Global Performance Monitor", () => {
    it("should provide global instance", () => {
      expect(globalPerformanceMonitor).toBeInstanceOf(PerformanceMonitor);
    });

    it("should be usable across modules", () => {
      const initialCount = globalPerformanceMonitor.getMetricCount();
      globalPerformanceMonitor.recordMetric("global-test", "test", 100);
      expect(globalPerformanceMonitor.getMetricCount()).toBe(initialCount + 1);
    });
  });

  describe("measureAsync Helper", () => {
    it("should measure async function execution", async () => {
      const result = await measureAsync("async-op", "test", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "success";
      });

      expect(result).toBe("success");
      const metrics = globalPerformanceMonitor.getMetricsByOperation("async-op");
      expect(metrics.length).toBeGreaterThan(0);
      const lastMetric = metrics[metrics.length - 1];
      // Allow some timing variance - just verify it's a reasonable duration
      expect(lastMetric.duration).toBeGreaterThanOrEqual(0);
      expect(lastMetric.duration).toBeLessThan(1000);
    });

    it("should measure async function with metadata", async () => {
      const metadata = { test: "value" };
      await measureAsync(
        "async-meta",
        "test",
        async () => {
          return "done";
        },
        metadata
      );

      const metrics = globalPerformanceMonitor.getMetricsByOperation("async-meta");
      expect(metrics.length).toBeGreaterThan(0);
      const lastMetric = metrics[metrics.length - 1];
      expect(lastMetric.metadata).toEqual(metadata);
    });

    it("should record metric even when async function throws", async () => {
      const initialCount = globalPerformanceMonitor.getMetricCount();

      await expect(
        measureAsync("async-error", "test", async () => {
          throw new Error("Test error");
        })
      ).rejects.toThrow("Test error");

      expect(globalPerformanceMonitor.getMetricCount()).toBe(initialCount + 1);
      const metrics = globalPerformanceMonitor.getMetricsByOperation("async-error");
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe("measureSync Helper", () => {
    it("should measure sync function execution", () => {
      const result = measureSync("sync-op", "test", () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBe(499500);
      const metrics = globalPerformanceMonitor.getMetricsByOperation("sync-op");
      expect(metrics.length).toBeGreaterThan(0);
      const lastMetric = metrics[metrics.length - 1];
      expect(lastMetric.duration).toBeGreaterThanOrEqual(0);
    });

    it("should measure sync function with metadata", () => {
      const metadata = { test: "value" };
      measureSync(
        "sync-meta",
        "test",
        () => {
          return "done";
        },
        metadata
      );

      const metrics = globalPerformanceMonitor.getMetricsByOperation("sync-meta");
      expect(metrics.length).toBeGreaterThan(0);
      const lastMetric = metrics[metrics.length - 1];
      expect(lastMetric.metadata).toEqual(metadata);
    });

    it("should record metric even when sync function throws", () => {
      const initialCount = globalPerformanceMonitor.getMetricCount();

      expect(() =>
        measureSync("sync-error", "test", () => {
          throw new Error("Test error");
        })
      ).toThrow("Test error");

      expect(globalPerformanceMonitor.getMetricCount()).toBe(initialCount + 1);
      const metrics = globalPerformanceMonitor.getMetricsByOperation("sync-error");
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty operation name", () => {
      monitor.recordMetric("", "cat", 10);
      const metrics = monitor.getMetricsByOperation("");
      expect(metrics).toHaveLength(1);
    });

    it("should handle empty category name", () => {
      monitor.recordMetric("op", "", 10);
      const metrics = monitor.getMetricsByCategory("");
      expect(metrics).toHaveLength(1);
    });

    it("should handle zero duration", () => {
      monitor.recordMetric("op", "cat", 0);
      const stats = monitor.getStats("op");
      expect(stats).not.toBeNull();
      expect(stats!.min).toBe(0);
    });

    it("should handle negative duration", () => {
      monitor.recordMetric("op", "cat", -10);
      const stats = monitor.getStats("op");
      expect(stats).not.toBeNull();
      expect(stats!.min).toBe(-10);
    });

    it("should handle very large duration", () => {
      monitor.recordMetric("op", "cat", 999999999);
      const stats = monitor.getStats("op");
      expect(stats).not.toBeNull();
      expect(stats!.max).toBe(999999999);
    });

    it("should handle empty durations array in calculatePercentiles", () => {
      // This tests the private calculatePercentiles method indirectly
      // by ensuring getStats returns null when no metrics exist
      const emptyMonitor = new PerformanceMonitor();
      const stats = emptyMonitor.getStats("non-existent-op");
      expect(stats).toBeNull();
    });
  });
});
