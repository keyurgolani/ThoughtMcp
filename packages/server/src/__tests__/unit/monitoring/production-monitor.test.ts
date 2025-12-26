/**
 * Tests for Production Monitor
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorTracker } from "../../../monitoring/error-tracker.js";
import { HealthChecker } from "../../../monitoring/health-checker.js";
import { MetricsCollector } from "../../../monitoring/metrics-collector.js";
import { ProductionMonitor } from "../../../monitoring/production-monitor.js";
import { ResourceMonitor } from "../../../monitoring/resource-monitor.js";
import { StructuredLogger } from "../../../monitoring/structured-logger.js";

describe("ProductionMonitor", () => {
  let monitor: ProductionMonitor;
  let logger: StructuredLogger;
  let metrics: MetricsCollector;
  let healthChecker: HealthChecker;
  let errorTracker: ErrorTracker;
  let resourceMonitor: ResourceMonitor;

  beforeEach(() => {
    // Create fresh instances for each test
    logger = new StructuredLogger({ minLevel: "debug", structuredOutput: false });
    metrics = new MetricsCollector();
    healthChecker = new HealthChecker();
    errorTracker = new ErrorTracker();
    resourceMonitor = new ResourceMonitor();

    // Suppress logger output in tests
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    monitor = new ProductionMonitor(
      {
        logLevel: "debug",
        structuredLogging: false,
        healthCheckInterval: 1000,
        metricsInterval: 500,
        enableResourceMonitoring: true,
      },
      {
        logger,
        metrics,
        healthChecker,
        errorTracker,
        resourceMonitor,
      }
    );
  });

  afterEach(() => {
    monitor.stop();
    vi.restoreAllMocks();
  });

  describe("Lifecycle", () => {
    it("should start monitoring", () => {
      monitor.start();
      expect(monitor.isRunning()).toBe(true);
    });

    it("should stop monitoring", () => {
      monitor.start();
      monitor.stop();
      expect(monitor.isRunning()).toBe(false);
    });

    it("should not start twice", () => {
      monitor.start();
      monitor.start(); // Should be ignored
      expect(monitor.isRunning()).toBe(true);
    });

    it("should not stop if not running", () => {
      monitor.stop(); // Should not throw
      expect(monitor.isRunning()).toBe(false);
    });
  });

  describe("Health Checks", () => {
    it("should register health check", async () => {
      monitor.registerHealthCheck("test", async () => ({
        component: "test",
        status: "healthy",
        responseTimeMs: 0,
      }));

      const report = await monitor.runHealthChecks();
      expect(report.components.length).toBe(1);
      expect(report.components[0].component).toBe("test");
    });

    it("should run health checks and record metrics", async () => {
      monitor.registerHealthCheck("db", async () => ({
        component: "db",
        status: "healthy",
        responseTimeMs: 5,
      }));

      await monitor.runHealthChecks();

      const healthMetric = metrics.getGauge("health_status");
      expect(healthMetric).toBe(1); // healthy = 1
    });

    it("should get health status", async () => {
      monitor.registerHealthCheck("test", async () => ({
        component: "test",
        status: "healthy",
        responseTimeMs: 0,
      }));

      const status = await monitor.getHealthStatus();
      expect(status.status).toBe("healthy");
    });
  });

  describe("Error Tracking", () => {
    it("should track errors", () => {
      const error = new Error("Test error");
      monitor.trackError(error, { component: "test" });

      const errors = errorTracker.getAllErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe("Test error");
    });

    it("should increment error counter metric", () => {
      const error = new Error("Test error");
      monitor.trackError(error, { component: "test" });

      const counter = metrics.getCounter("errors_total", { component: "test", name: "Error" });
      expect(counter).toBe(1);
    });
  });

  describe("Metrics Recording", () => {
    it("should record counter metric", () => {
      monitor.recordMetric("requests", 1, { type: "counter" });
      expect(metrics.getCounter("requests")).toBe(1);
    });

    it("should record gauge metric", () => {
      monitor.recordMetric("temperature", 25.5, { type: "gauge" });
      expect(metrics.getGauge("temperature")).toBe(25.5);
    });

    it("should record histogram metric", () => {
      monitor.recordMetric("latency", 100, { type: "histogram" });
      const stats = metrics.getHistogramStats("latency");
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });

    it("should record summary metric", () => {
      monitor.recordMetric("response_time", 50, { type: "summary" });
      const percentiles = metrics.getSummaryPercentiles("response_time");
      expect(percentiles).not.toBeNull();
    });

    it("should default to gauge type", () => {
      monitor.recordMetric("value", 42);
      expect(metrics.getGauge("value")).toBe(42);
    });
  });

  describe("Alerts", () => {
    it("should add alert configuration", () => {
      monitor.addAlert({
        name: "high_cpu",
        metric: "cpu_usage",
        threshold: 90,
        operator: "gt",
        duration: 60,
        severity: "critical",
        enabled: true,
      });

      // Alert should be registered (no direct way to verify, but shouldn't throw)
    });

    it("should remove alert configuration", () => {
      monitor.addAlert({
        name: "high_cpu",
        metric: "cpu_usage",
        threshold: 90,
        operator: "gt",
        duration: 60,
        severity: "critical",
        enabled: true,
      });

      monitor.removeAlert("high_cpu");
      // Should not throw
    });

    it("should trigger alert when threshold exceeded", async () => {
      const alertCallback = vi.fn();
      monitor.onAlert(alertCallback);

      monitor.addAlert({
        name: "high_value",
        metric: "test_metric",
        threshold: 50,
        operator: "gt",
        duration: 0,
        severity: "warning",
        enabled: true,
      });

      // Set metric above threshold
      metrics.setGauge("test_metric", 100);

      // Run health checks to trigger alert evaluation
      await monitor.runHealthChecks();

      expect(alertCallback).toHaveBeenCalled();
      expect(alertCallback.mock.calls[0][0].alert.name).toBe("high_value");
    });

    it("should resolve alert when threshold no longer exceeded", async () => {
      const alertCallback = vi.fn();
      monitor.onAlert(alertCallback);

      monitor.addAlert({
        name: "high_value",
        metric: "test_metric",
        threshold: 50,
        operator: "gt",
        duration: 0,
        severity: "warning",
        enabled: true,
      });

      // Trigger alert
      metrics.setGauge("test_metric", 100);
      await monitor.runHealthChecks();

      // Resolve alert
      metrics.setGauge("test_metric", 30);
      await monitor.runHealthChecks();

      // Should have been called twice (trigger + resolve)
      expect(alertCallback).toHaveBeenCalledTimes(2);
      expect(alertCallback.mock.calls[1][0].resolved).toBe(true);
    });

    it("should get active alerts", async () => {
      monitor.addAlert({
        name: "high_value",
        metric: "test_metric",
        threshold: 50,
        operator: "gt",
        duration: 0,
        severity: "warning",
        enabled: true,
      });

      metrics.setGauge("test_metric", 100);
      await monitor.runHealthChecks();

      const activeAlerts = monitor.getActiveAlerts();
      expect(activeAlerts.length).toBe(1);
      expect(activeAlerts[0].alert.name).toBe("high_value");
    });

    it("should support different comparison operators", async () => {
      const alertCallback = vi.fn();
      monitor.onAlert(alertCallback);

      // Test 'lt' operator
      monitor.addAlert({
        name: "low_value",
        metric: "test_lt",
        threshold: 10,
        operator: "lt",
        duration: 0,
        severity: "warning",
        enabled: true,
      });

      metrics.setGauge("test_lt", 5);
      await monitor.runHealthChecks();
      expect(alertCallback).toHaveBeenCalled();
    });
  });

  describe("Summary", () => {
    it("should get monitoring summary", async () => {
      monitor.registerHealthCheck("test", async () => ({
        component: "test",
        status: "healthy",
        responseTimeMs: 0,
      }));

      const summary = await monitor.getSummary();

      expect(summary.health).toBeDefined();
      expect(summary.errors).toBeDefined();
      expect(summary.resources).toBeDefined();
      expect(summary.activeAlerts).toBeDefined();
    });
  });

  describe("Prometheus Export", () => {
    it("should export metrics in Prometheus format", () => {
      metrics.incrementCounter("requests_total", 100);
      metrics.setGauge("temperature", 25.5);

      const output = monitor.exportPrometheusMetrics();

      expect(output).toContain("requests_total");
      expect(output).toContain("temperature");
    });
  });

  describe("Reset", () => {
    it("should reset all monitoring data", () => {
      metrics.incrementCounter("test", 10);
      errorTracker.trackError(new Error("Test"), { component: "test" });

      monitor.reset();

      expect(metrics.getCounter("test")).toBe(0);
      expect(errorTracker.getAllErrors().length).toBe(0);
    });
  });
});
