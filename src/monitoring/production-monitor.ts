/**
 * Production Monitor
 *
 * Main monitoring facade that integrates all monitoring components.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { ErrorTracker, errorTracker } from "./error-tracker.js";
import { HealthChecker, healthChecker, type HealthCheckFn } from "./health-checker.js";
import { MetricsCollector, metrics } from "./metrics-collector.js";
import { ResourceMonitor, resourceMonitor } from "./resource-monitor.js";
import { StructuredLogger, logger } from "./structured-logger.js";
import type { AlertConfig, AlertEvent, MonitoringConfig, SystemHealthReport } from "./types.js";

/**
 * Production Monitor class
 *
 * Provides a unified interface for all monitoring capabilities.
 */
export class ProductionMonitor {
  readonly logger: StructuredLogger;
  readonly metrics: MetricsCollector;
  readonly healthChecker: HealthChecker;
  readonly errorTracker: ErrorTracker;
  readonly resourceMonitor: ResourceMonitor;

  private config: MonitoringConfig;
  private alerts: AlertConfig[] = [];
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private alertCallbacks: ((event: AlertEvent) => void)[] = [];
  private healthCheckIntervalId?: ReturnType<typeof setInterval>;
  private started: boolean = false;

  constructor(
    config?: Partial<MonitoringConfig>,
    options?: {
      logger?: StructuredLogger;
      metrics?: MetricsCollector;
      healthChecker?: HealthChecker;
      errorTracker?: ErrorTracker;
      resourceMonitor?: ResourceMonitor;
    }
  ) {
    this.config = this.buildConfig(config);
    this.logger = options?.logger ?? logger;
    this.metrics = options?.metrics ?? metrics;
    this.healthChecker = options?.healthChecker ?? healthChecker;
    this.errorTracker = options?.errorTracker ?? errorTracker;
    this.resourceMonitor = options?.resourceMonitor ?? resourceMonitor;

    this.configureComponents();
  }

  /**
   * Build configuration with defaults
   */
  private buildConfig(config?: Partial<MonitoringConfig>): MonitoringConfig {
    const defaults: MonitoringConfig = {
      logLevel: "info",
      structuredLogging: true,
      healthCheckInterval: 30000,
      metricsInterval: 10000,
      maxMetricsHistory: 1000,
      maxErrorHistory: 100,
      alerts: [],
      enableResourceMonitoring: true,
    };
    return { ...defaults, ...config };
  }

  /**
   * Configure monitoring components
   */
  private configureComponents(): void {
    this.logger.setLevel(this.config.logLevel);
    this.logger.setStructuredOutput(this.config.structuredLogging);
    this.alerts = this.config.alerts;

    this.errorTracker.onError((entry) => {
      this.metrics.incrementCounter("errors_total", 1, {
        labels: { component: entry.component, name: entry.name },
      });
    });
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.started) {
      return;
    }

    this.logger.info("Starting production monitoring", {
      operation: "monitor.start",
      context: {
        healthCheckInterval: this.config.healthCheckInterval,
        metricsInterval: this.config.metricsInterval,
        resourceMonitoring: this.config.enableResourceMonitoring,
      },
    });

    // Start resource monitoring
    if (this.config.enableResourceMonitoring) {
      this.resourceMonitor.start(this.config.metricsInterval);
    }

    // Start periodic health checks
    this.healthCheckIntervalId = setInterval(() => {
      void this.runHealthChecks();
    }, this.config.healthCheckInterval);

    this.started = true;
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.started) {
      return;
    }

    this.logger.info("Stopping production monitoring", {
      operation: "monitor.stop",
    });

    // Stop resource monitoring
    this.resourceMonitor.stop();

    // Stop health check interval
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = undefined;
    }

    this.started = false;
  }

  /**
   * Check if monitoring is running
   */
  isRunning(): boolean {
    return this.started;
  }

  /**
   * Register a health check
   */
  registerHealthCheck(name: string, check: HealthCheckFn): void {
    this.healthChecker.registerCheck(name, check);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<SystemHealthReport> {
    const report = await this.healthChecker.generateReport();

    // Record health metrics
    this.metrics.setGauge(
      "health_status",
      report.status === "healthy" ? 1 : report.status === "degraded" ? 0.5 : 0
    );

    for (const component of report.components) {
      this.metrics.setGauge(
        "component_health",
        component.status === "healthy" ? 1 : component.status === "degraded" ? 0.5 : 0,
        { labels: { component: component.component } }
      );
      this.metrics.observeHistogram("health_check_duration_ms", component.responseTimeMs, {
        labels: { component: component.component },
      });
    }

    // Check alerts
    this.checkAlerts();

    return report;
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<SystemHealthReport> {
    return this.healthChecker.generateReport();
  }

  /**
   * Track an error
   */
  trackError(
    error: Error,
    options: {
      component: string;
      operation?: string;
      traceId?: string;
      context?: Record<string, unknown>;
    }
  ): void {
    this.errorTracker.trackError(error, options);

    this.logger.error(error.message, {
      operation: options.operation,
      traceId: options.traceId,
      context: options.context,
      error,
    });
  }

  /**
   * Record a metric
   */
  recordMetric(
    name: string,
    value: number,
    options?: {
      type?: "counter" | "gauge" | "histogram" | "summary";
      labels?: Record<string, string>;
      unit?: string;
    }
  ): void {
    const type = options?.type ?? "gauge";

    switch (type) {
      case "counter":
        this.metrics.incrementCounter(name, value, options);
        break;
      case "gauge":
        this.metrics.setGauge(name, value, options);
        break;
      case "histogram":
        this.metrics.observeHistogram(name, value, options);
        break;
      case "summary":
        this.metrics.observeSummary(name, value, options);
        break;
    }
  }

  /**
   * Add an alert configuration
   */
  addAlert(alert: AlertConfig): void {
    this.alerts.push(alert);
  }

  /**
   * Remove an alert configuration
   */
  removeAlert(name: string): void {
    this.alerts = this.alerts.filter((a) => a.name !== name);
    this.activeAlerts.delete(name);
  }

  /**
   * Register an alert callback
   */
  onAlert(callback: (event: AlertEvent) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Check all alerts
   */
  private checkAlerts(): void {
    for (const alert of this.alerts) {
      if (!alert.enabled) {
        continue;
      }

      const metric = this.metrics.getMetric(alert.metric);
      if (!metric) {
        continue;
      }

      const value = metric.value;
      const triggered = this.evaluateAlertCondition(alert, value);

      if (triggered) {
        this.triggerAlert(alert, value);
      } else {
        this.resolveAlert(alert);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(alert: AlertConfig, value: number): boolean {
    switch (alert.operator) {
      case "gt":
        return value > alert.threshold;
      case "gte":
        return value >= alert.threshold;
      case "lt":
        return value < alert.threshold;
      case "lte":
        return value <= alert.threshold;
      case "eq":
        return value === alert.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(alert: AlertConfig, value: number): void {
    const existing = this.activeAlerts.get(alert.name);
    if (existing && !existing.resolved) {
      return; // Already active
    }

    const event: AlertEvent = {
      alert,
      currentValue: value,
      triggeredAt: new Date(),
      resolved: false,
    };

    this.activeAlerts.set(alert.name, event);

    this.logger.warn(`Alert triggered: ${alert.name}`, {
      operation: "alert.trigger",
      context: {
        metric: alert.metric,
        threshold: alert.threshold,
        currentValue: value,
        severity: alert.severity,
      },
    });

    // Notify callbacks
    for (const callback of this.alertCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  /**
   * Resolve an alert
   */
  private resolveAlert(alert: AlertConfig): void {
    const existing = this.activeAlerts.get(alert.name);
    if (!existing || existing.resolved) {
      return; // Not active or already resolved
    }

    existing.resolved = true;
    existing.resolvedAt = new Date();

    this.logger.info(`Alert resolved: ${alert.name}`, {
      operation: "alert.resolve",
      context: {
        metric: alert.metric,
        duration: existing.resolvedAt.getTime() - existing.triggeredAt.getTime(),
      },
    });

    // Notify callbacks
    for (const callback of this.alertCallbacks) {
      try {
        callback(existing);
      } catch {
        // Ignore callback errors
      }
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values()).filter((a) => !a.resolved);
  }

  /**
   * Get monitoring summary
   */
  async getSummary(): Promise<{
    health: SystemHealthReport;
    errors: ReturnType<ErrorTracker["exportSummary"]>;
    resources: ReturnType<ResourceMonitor["getCurrentMetrics"]>;
    activeAlerts: AlertEvent[];
  }> {
    return {
      health: await this.healthChecker.generateReport(),
      errors: this.errorTracker.exportSummary(),
      resources: this.resourceMonitor.getCurrentMetrics(),
      activeAlerts: this.getActiveAlerts(),
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    return this.metrics.exportPrometheus();
  }

  /**
   * Reset all monitoring data
   */
  reset(): void {
    this.metrics.resetAll();
    this.errorTracker.clear();
    this.resourceMonitor.clear();
    this.activeAlerts.clear();
  }
}

/**
 * Global production monitor instance
 */
export const productionMonitor = new ProductionMonitor();
