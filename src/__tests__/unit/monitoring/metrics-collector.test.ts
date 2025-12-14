/**
 * Tests for Metrics Collector
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { beforeEach, describe, expect, it } from "vitest";
import { MetricsCollector } from "../../../monitoring/metrics-collector.js";

describe("MetricsCollector", () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector({ maxHistory: 100 });
  });

  describe("Counter", () => {
    it("should increment counter", () => {
      collector.incrementCounter("requests_total");
      expect(collector.getCounter("requests_total")).toBe(1);

      collector.incrementCounter("requests_total", 5);
      expect(collector.getCounter("requests_total")).toBe(6);
    });

    it("should support labels", () => {
      collector.incrementCounter("requests_total", 1, { labels: { method: "GET" } });
      collector.incrementCounter("requests_total", 1, { labels: { method: "POST" } });

      expect(collector.getCounter("requests_total", { method: "GET" })).toBe(1);
      expect(collector.getCounter("requests_total", { method: "POST" })).toBe(1);
    });

    it("should return 0 for non-existent counter", () => {
      expect(collector.getCounter("non_existent")).toBe(0);
    });
  });

  describe("Gauge", () => {
    it("should set gauge value", () => {
      collector.setGauge("temperature", 25.5);
      expect(collector.getGauge("temperature")).toBe(25.5);

      collector.setGauge("temperature", 30.0);
      expect(collector.getGauge("temperature")).toBe(30.0);
    });

    it("should increment gauge", () => {
      collector.setGauge("connections", 10);
      collector.incrementGauge("connections", 5);
      expect(collector.getGauge("connections")).toBe(15);
    });

    it("should decrement gauge", () => {
      collector.setGauge("connections", 10);
      collector.decrementGauge("connections", 3);
      expect(collector.getGauge("connections")).toBe(7);
    });

    it("should support labels", () => {
      collector.setGauge("cpu_usage", 50, { labels: { core: "0" } });
      collector.setGauge("cpu_usage", 60, { labels: { core: "1" } });

      expect(collector.getGauge("cpu_usage", { core: "0" })).toBe(50);
      expect(collector.getGauge("cpu_usage", { core: "1" })).toBe(60);
    });
  });

  describe("Histogram", () => {
    it("should observe histogram values", () => {
      collector.observeHistogram("request_duration_ms", 50);
      collector.observeHistogram("request_duration_ms", 100);
      collector.observeHistogram("request_duration_ms", 200);

      const stats = collector.getHistogramStats("request_duration_ms");
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(3);
      expect(stats!.sum).toBe(350);
      expect(stats!.mean).toBeCloseTo(116.67, 1);
    });

    it("should track bucket counts", () => {
      collector.observeHistogram("latency", 5, { buckets: [10, 50, 100, 500] });
      collector.observeHistogram("latency", 25, { buckets: [10, 50, 100, 500] });
      collector.observeHistogram("latency", 75, { buckets: [10, 50, 100, 500] });
      collector.observeHistogram("latency", 200, { buckets: [10, 50, 100, 500] });

      const stats = collector.getHistogramStats("latency");
      expect(stats).not.toBeNull();
      expect(stats!.buckets[0]).toEqual({ le: 10, count: 1 }); // 5 <= 10
      expect(stats!.buckets[1]).toEqual({ le: 50, count: 2 }); // 5, 25 <= 50
      expect(stats!.buckets[2]).toEqual({ le: 100, count: 3 }); // 5, 25, 75 <= 100
      expect(stats!.buckets[3]).toEqual({ le: 500, count: 4 }); // all <= 500
    });

    it("should return null for non-existent histogram", () => {
      expect(collector.getHistogramStats("non_existent")).toBeNull();
    });
  });

  describe("Summary", () => {
    it("should observe summary values", () => {
      for (let i = 1; i <= 100; i++) {
        collector.observeSummary("response_time", i);
      }

      const percentiles = collector.getSummaryPercentiles("response_time");
      expect(percentiles).not.toBeNull();
      // Percentile calculation uses floor index, so p50 of 1-100 is at index 50 = value 51
      expect(percentiles!.p50).toBeGreaterThanOrEqual(50);
      expect(percentiles!.p50).toBeLessThanOrEqual(51);
      expect(percentiles!.p90).toBeGreaterThanOrEqual(90);
      expect(percentiles!.p95).toBeGreaterThanOrEqual(95);
      expect(percentiles!.p99).toBeGreaterThanOrEqual(99);
    });

    it("should limit sample size", () => {
      for (let i = 0; i < 2000; i++) {
        collector.observeSummary("test", i, { maxSamples: 100 });
      }

      const metric = collector.getMetric("test");
      expect(metric?.summary?.length).toBe(100);
    });

    it("should return null for non-existent summary", () => {
      expect(collector.getSummaryPercentiles("non_existent")).toBeNull();
    });
  });

  describe("History", () => {
    it("should record metric history", () => {
      collector.incrementCounter("test", 1);
      collector.incrementCounter("test", 2);

      const history = collector.getHistory({ name: "test" });
      expect(history.length).toBe(2);
    });

    it("should filter history by type", () => {
      collector.incrementCounter("counter", 1);
      collector.setGauge("gauge", 10);

      const counterHistory = collector.getHistory({ type: "counter" });
      const gaugeHistory = collector.getHistory({ type: "gauge" });

      expect(counterHistory.length).toBe(1);
      expect(gaugeHistory.length).toBe(1);
    });

    it("should filter history by time", async () => {
      collector.incrementCounter("test", 1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const since = new Date();
      await new Promise((resolve) => setTimeout(resolve, 10));
      collector.incrementCounter("test", 2);

      const history = collector.getHistory({ since });
      expect(history.length).toBe(1);
    });

    it("should limit history size", () => {
      const smallCollector = new MetricsCollector({ maxHistory: 5 });
      for (let i = 0; i < 10; i++) {
        smallCollector.incrementCounter("test", 1);
      }

      const history = smallCollector.getHistory();
      expect(history.length).toBe(5);
    });
  });

  describe("Prometheus Export", () => {
    it("should export counter in Prometheus format", () => {
      collector.incrementCounter("http_requests_total", 100);
      const output = collector.exportPrometheus();

      expect(output).toContain("# TYPE http_requests_total counter");
      expect(output).toContain("http_requests_total 100");
    });

    it("should export gauge in Prometheus format", () => {
      collector.setGauge("temperature_celsius", 25.5);
      const output = collector.exportPrometheus();

      expect(output).toContain("# TYPE temperature_celsius gauge");
      expect(output).toContain("temperature_celsius 25.5");
    });

    it("should export histogram in Prometheus format", () => {
      collector.observeHistogram("request_duration", 50, { buckets: [10, 50, 100] });
      collector.observeHistogram("request_duration", 75, { buckets: [10, 50, 100] });
      const output = collector.exportPrometheus();

      expect(output).toContain("# TYPE request_duration histogram");
      expect(output).toContain("request_duration_bucket");
      expect(output).toContain("request_duration_sum");
      expect(output).toContain("request_duration_count");
    });

    it("should include labels in Prometheus format", () => {
      collector.incrementCounter("requests", 10, { labels: { method: "GET", path: "/api" } });
      const output = collector.exportPrometheus();

      expect(output).toContain('method="GET"');
      expect(output).toContain('path="/api"');
    });
  });

  describe("Reset", () => {
    it("should reset individual metric", () => {
      collector.incrementCounter("test", 10);
      collector.resetMetric("test");
      expect(collector.getCounter("test")).toBe(0);
    });

    it("should reset all metrics", () => {
      collector.incrementCounter("counter1", 10);
      collector.setGauge("gauge1", 20);
      collector.resetAll();

      expect(collector.getCounter("counter1")).toBe(0);
      expect(collector.getGauge("gauge1")).toBe(0);
      expect(collector.getHistory().length).toBe(0);
    });
  });

  describe("Metric Retrieval", () => {
    it("should get all metrics", () => {
      collector.incrementCounter("counter1", 1);
      collector.setGauge("gauge1", 10);

      const allMetrics = collector.getAllMetrics();
      expect(allMetrics.size).toBe(2);
    });

    it("should get metric by name and labels", () => {
      collector.setGauge("test", 10, { labels: { env: "prod" } });
      const metric = collector.getMetric("test", { env: "prod" });

      expect(metric).not.toBeUndefined();
      expect(metric!.value).toBe(10);
      expect(metric!.type).toBe("gauge");
    });
  });
});
