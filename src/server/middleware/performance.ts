/**
 * Performance Monitoring Middleware
 *
 * Tracks request latency and logs slow requests for profiling.
 * Helps identify performance bottlenecks in the REST API.
 *
 * Requirements: 17.1 - Memory retrieval response within 200ms at p95
 */

import type { NextFunction, Request, Response } from "express";
import { Logger } from "../../utils/logger.js";

/**
 * Performance metrics for a single request
 */
export interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: Date;
  requestId?: string;
}

/**
 * Aggregated performance statistics
 */
export interface PerformanceStats {
  totalRequests: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  maxDurationMs: number;
  slowRequests: number;
  byPath: Record<string, PathStats>;
}

/**
 * Per-path statistics
 */
export interface PathStats {
  count: number;
  avgDurationMs: number;
  maxDurationMs: number;
  slowCount: number;
}

/**
 * Performance middleware configuration
 */
export interface PerformanceConfig {
  /** Threshold in ms for logging slow requests */
  slowThresholdMs: number;
  /** Maximum number of metrics to retain */
  maxMetrics: number;
  /** Whether to log all requests */
  logAllRequests: boolean;
  /** Paths to exclude from tracking */
  excludePaths?: string[];
}

/**
 * Default performance configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  slowThresholdMs: 200, // 200ms threshold per requirement 17.1
  maxMetrics: 10000,
  logAllRequests: false,
  excludePaths: ["/api/v1/health/live", "/api/v1/health/ready"],
};

/**
 * Performance metrics collector
 */
class PerformanceCollector {
  private metrics: RequestMetrics[] = [];
  private config: PerformanceConfig;

  constructor(config: PerformanceConfig) {
    this.config = config;
  }

  /**
   * Record a request metric
   */
  record(metric: RequestMetrics): void {
    // Evict oldest if at capacity
    if (this.metrics.length >= this.config.maxMetrics) {
      this.metrics.shift();
    }

    this.metrics.push(metric);

    // Log slow requests
    if (metric.durationMs > this.config.slowThresholdMs) {
      Logger.warn(
        `Slow request: ${metric.method} ${metric.path} took ${metric.durationMs}ms (threshold: ${this.config.slowThresholdMs}ms)`
      );
    } else if (this.config.logAllRequests) {
      Logger.debug(`Request: ${metric.method} ${metric.path} completed in ${metric.durationMs}ms`);
    }
  }

  /**
   * Get aggregated statistics
   */
  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        avgDurationMs: 0,
        p50DurationMs: 0,
        p95DurationMs: 0,
        p99DurationMs: 0,
        maxDurationMs: 0,
        slowRequests: 0,
        byPath: {},
      };
    }

    const durations = this.metrics.map((m) => m.durationMs).sort((a, b) => a - b);
    const total = durations.reduce((sum, d) => sum + d, 0);

    // Calculate percentiles
    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    // Aggregate by path
    const byPath: Record<string, PathStats> = {};
    for (const metric of this.metrics) {
      if (!byPath[metric.path]) {
        byPath[metric.path] = {
          count: 0,
          avgDurationMs: 0,
          maxDurationMs: 0,
          slowCount: 0,
        };
      }

      const pathStats = byPath[metric.path];
      pathStats.count++;
      pathStats.avgDurationMs =
        (pathStats.avgDurationMs * (pathStats.count - 1) + metric.durationMs) / pathStats.count;
      pathStats.maxDurationMs = Math.max(pathStats.maxDurationMs, metric.durationMs);
      if (metric.durationMs > this.config.slowThresholdMs) {
        pathStats.slowCount++;
      }
    }

    return {
      totalRequests: this.metrics.length,
      avgDurationMs: Math.round(total / durations.length),
      p50DurationMs: durations[p50Index] ?? 0,
      p95DurationMs: durations[p95Index] ?? 0,
      p99DurationMs: durations[p99Index] ?? 0,
      maxDurationMs: durations[durations.length - 1] ?? 0,
      slowRequests: this.metrics.filter((m) => m.durationMs > this.config.slowThresholdMs).length,
      byPath,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 100): RequestMetrics[] {
    return this.metrics.slice(-count);
  }
}

/**
 * Global performance collector instance
 */
let globalCollector: PerformanceCollector | null = null;

/**
 * Get or create the global performance collector
 */
function getCollector(config: PerformanceConfig): PerformanceCollector {
  globalCollector ??= new PerformanceCollector(config);
  return globalCollector;
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(): PerformanceStats {
  if (!globalCollector) {
    return {
      totalRequests: 0,
      avgDurationMs: 0,
      p50DurationMs: 0,
      p95DurationMs: 0,
      p99DurationMs: 0,
      maxDurationMs: 0,
      slowRequests: 0,
      byPath: {},
    };
  }
  return globalCollector.getStats();
}

/**
 * Get recent request metrics
 */
export function getRecentMetrics(count: number = 100): RequestMetrics[] {
  if (!globalCollector) {
    return [];
  }
  return globalCollector.getRecentMetrics(count);
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics(): void {
  if (globalCollector) {
    globalCollector.clear();
  }
}

/**
 * Check if path should be excluded from tracking
 */
function shouldExclude(path: string, config: PerformanceConfig): boolean {
  if (config.excludePaths) {
    for (const excludePath of config.excludePaths) {
      if (path.startsWith(excludePath)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Create performance monitoring middleware
 *
 * @param config - Performance configuration
 * @returns Express middleware function
 */
export function createPerformanceMiddleware(
  config: Partial<PerformanceConfig> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const finalConfig = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  const collector = getCollector(finalConfig);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip excluded paths
    if (shouldExclude(req.path, finalConfig)) {
      next();
      return;
    }

    const startTime = process.hrtime.bigint();

    // Track response timing using 'close' event for metrics collection
    // Note: We cannot set headers in 'finish' or 'close' events as response is already sent
    // The X-Response-Time header must be set before res.send() in the route handler
    res.on("close", () => {
      const endTime = process.hrtime.bigint();
      const durationNs = Number(endTime - startTime);
      const durationMs = Math.round(durationNs / 1_000_000);

      const requestId = (req as Request & { requestId?: string }).requestId;

      collector.record({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
        timestamp: new Date(),
        requestId,
      });
    });

    // Set response time header before response is sent (if json method exists)
    if (typeof res.json === "function") {
      const originalJson = res.json.bind(res);
      res.json = function (body: unknown) {
        const endTime = process.hrtime.bigint();
        const durationNs = Number(endTime - startTime);
        const durationMs = Math.round(durationNs / 1_000_000);
        if (!res.headersSent) {
          res.setHeader("X-Response-Time", `${durationMs}ms`);
        }
        return originalJson(body);
      };
    }

    next();
  };
}

export default createPerformanceMiddleware;
