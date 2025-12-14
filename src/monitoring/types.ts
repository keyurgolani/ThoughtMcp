/**
 * Monitoring Types
 *
 * Type definitions for production monitoring and observability.
 */

/**
 * Log levels for structured logging
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Structured log entry
 */
export interface LogEntry {
  /** Log level */
  level: LogLevel;

  /** Log message */
  message: string;

  /** Timestamp */
  timestamp: Date;

  /** Component that generated the log */
  component?: string;

  /** Operation being performed */
  operation?: string;

  /** Request/trace ID for correlation */
  traceId?: string;

  /** Additional context data */
  context?: Record<string, unknown>;

  /** Error details (if applicable) */
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };

  /** Duration in milliseconds (for operations) */
  durationMs?: number;
}

/**
 * Metric types
 */
export type MetricType = "counter" | "gauge" | "histogram" | "summary";

/**
 * Metric entry
 */
export interface MetricEntry {
  /** Metric name */
  name: string;

  /** Metric type */
  type: MetricType;

  /** Metric value */
  value: number;

  /** Timestamp */
  timestamp: Date;

  /** Labels for metric dimensions */
  labels?: Record<string, string>;

  /** Unit of measurement */
  unit?: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  /** Component name */
  component: string;

  /** Health status */
  status: "healthy" | "unhealthy" | "degraded";

  /** Response time in milliseconds */
  responseTimeMs: number;

  /** Additional details */
  details?: Record<string, unknown>;

  /** Error message (if unhealthy) */
  error?: string;

  /** Last successful check */
  lastSuccess?: Date;
}

/**
 * System health report
 */
export interface SystemHealthReport {
  /** Overall status */
  status: "healthy" | "unhealthy" | "degraded";

  /** Timestamp of report */
  timestamp: Date;

  /** Individual component health */
  components: HealthCheckResult[];

  /** System metrics */
  metrics: SystemMetrics;

  /** Uptime in milliseconds */
  uptimeMs: number;

  /** Version information */
  version?: string;
}

/**
 * System metrics
 */
export interface SystemMetrics {
  /** CPU usage percentage (0-100) */
  cpuUsage?: number;

  /** Memory usage in bytes */
  memoryUsed: number;

  /** Memory available in bytes */
  memoryTotal: number;

  /** Memory usage percentage (0-100) */
  memoryUsagePercent: number;

  /** Heap used in bytes */
  heapUsed: number;

  /** Heap total in bytes */
  heapTotal: number;

  /** Active database connections */
  dbConnectionsActive?: number;

  /** Idle database connections */
  dbConnectionsIdle?: number;

  /** Event loop lag in milliseconds */
  eventLoopLag?: number;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  /** Alert name */
  name: string;

  /** Metric to monitor */
  metric: string;

  /** Threshold value */
  threshold: number;

  /** Comparison operator */
  operator: "gt" | "gte" | "lt" | "lte" | "eq";

  /** Duration before alerting (in seconds) */
  duration: number;

  /** Alert severity */
  severity: "warning" | "critical";

  /** Whether alert is enabled */
  enabled: boolean;
}

/**
 * Alert event
 */
export interface AlertEvent {
  /** Alert configuration that triggered */
  alert: AlertConfig;

  /** Current metric value */
  currentValue: number;

  /** Timestamp when alert triggered */
  triggeredAt: Date;

  /** Whether alert is resolved */
  resolved: boolean;

  /** Timestamp when resolved (if applicable) */
  resolvedAt?: Date;
}

/**
 * Error tracking entry
 */
export interface ErrorTrackingEntry {
  /** Error ID */
  id: string;

  /** Error name/type */
  name: string;

  /** Error message */
  message: string;

  /** Stack trace */
  stack?: string;

  /** Error code */
  code?: string;

  /** Component where error occurred */
  component: string;

  /** Operation being performed */
  operation?: string;

  /** Timestamp */
  timestamp: Date;

  /** Request/trace ID */
  traceId?: string;

  /** Additional context */
  context?: Record<string, unknown>;

  /** Number of occurrences */
  count: number;

  /** First occurrence */
  firstSeen: Date;

  /** Last occurrence */
  lastSeen: Date;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  /** Log level threshold */
  logLevel: LogLevel;

  /** Enable structured JSON logging */
  structuredLogging: boolean;

  /** Health check interval in milliseconds */
  healthCheckInterval: number;

  /** Metrics collection interval in milliseconds */
  metricsInterval: number;

  /** Maximum metrics history to retain */
  maxMetricsHistory: number;

  /** Maximum error history to retain */
  maxErrorHistory: number;

  /** Alert configurations */
  alerts: AlertConfig[];

  /** Enable resource monitoring */
  enableResourceMonitoring: boolean;
}

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  logLevel: "info",
  structuredLogging: true,
  healthCheckInterval: 30000, // 30 seconds
  metricsInterval: 10000, // 10 seconds
  maxMetricsHistory: 1000,
  maxErrorHistory: 100,
  alerts: [],
  enableResourceMonitoring: true,
};
