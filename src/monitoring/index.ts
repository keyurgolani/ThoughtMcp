/**
 * Monitoring Module
 *
 * Production monitoring and observability for ThoughtMCP.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

// Types
export type {
  AlertConfig,
  AlertEvent,
  ErrorTrackingEntry,
  HealthCheckResult,
  LogEntry,
  LogLevel,
  MetricEntry,
  MetricType,
  MonitoringConfig,
  SystemHealthReport,
  SystemMetrics,
} from "./types.js";

export { DEFAULT_MONITORING_CONFIG } from "./types.js";

// Structured Logger
export { StructuredLogger, logger } from "./structured-logger.js";

// Metrics Collector
export { MetricsCollector, metrics } from "./metrics-collector.js";

// Health Checker
export { HealthChecker, healthChecker } from "./health-checker.js";
export type { HealthCheckFn } from "./health-checker.js";

// Error Tracker
export { ErrorTracker, errorTracker } from "./error-tracker.js";

// Resource Monitor
export { ResourceMonitor, resourceMonitor } from "./resource-monitor.js";
export type { ResourceSnapshot } from "./resource-monitor.js";

// Production Monitor (main facade)
export { ProductionMonitor, productionMonitor } from "./production-monitor.js";
