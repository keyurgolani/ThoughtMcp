/**
 * Activity Routes
 *
 * REST API endpoints for real-time cognitive activity monitoring.
 * Requirements: 7.2
 */

import { Router, type Request, type Response } from "express";
import { healthChecker } from "../../monitoring/health-checker.js";
import { metrics } from "../../monitoring/metrics-collector.js";
import type { HealthCheckResult, SystemHealthReport } from "../../monitoring/types.js";
import type { CognitiveCore } from "../cognitive-core.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { buildSuccessResponse } from "../types/api-response.js";

/**
 * Memory usage metrics for dashboard
 * Requirements: 7.2
 */
interface MemoryUsageMetrics {
  /** Heap memory used in bytes */
  heapUsed: number;
  /** Total heap memory in bytes */
  heapTotal: number;
  /** RSS memory in bytes */
  rss: number;
  /** External memory in bytes */
  external: number;
  /** Heap usage percentage */
  heapUsagePercent: number;
}

/**
 * Recent operation entry for dashboard
 * Requirements: 7.2
 */
interface RecentOperation {
  /** Operation type */
  type: string;
  /** Operation timestamp */
  timestamp: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Operation status */
  status: "success" | "failure";
}

/**
 * Component health status for dashboard
 * Requirements: 7.2
 */
interface ComponentHealth {
  /** Component name */
  name: string;
  /** Health status */
  status: "healthy" | "unhealthy" | "degraded";
  /** Response time in milliseconds */
  responseTimeMs?: number;
  /** Last check timestamp */
  lastCheck?: string;
  /** Error message if unhealthy */
  error?: string;
}

/**
 * System health status for dashboard
 * Requirements: 7.2
 */
interface SystemHealth {
  /** Overall system status */
  status: "healthy" | "unhealthy" | "degraded";
  /** Individual component health */
  components: ComponentHealth[];
  /** System uptime in milliseconds */
  uptimeMs: number;
  /** System version */
  version?: string;
}

/**
 * Dashboard response type
 * Requirements: 7.2
 */
interface DashboardResponse {
  /** Number of active sessions */
  activeSessions: number;
  /** Number of items in processing queue */
  processingQueue: number;
  /** Memory usage metrics */
  memoryUsage: MemoryUsageMetrics;
  /** Recent operations list */
  recentOperations: RecentOperation[];
  /** System health status */
  health: SystemHealth;
}

/**
 * Helper to extract request ID from request
 */
function getRequestId(req: Request): string | undefined {
  return (req as Request & { requestId?: string }).requestId;
}

/**
 * Get memory usage metrics
 */
function getMemoryUsageMetrics(): MemoryUsageMetrics {
  const memUsage = process.memoryUsage();
  const heapUsagePercent =
    memUsage.heapTotal > 0 ? Math.round((memUsage.heapUsed / memUsage.heapTotal) * 10000) / 100 : 0;

  return {
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    rss: memUsage.rss,
    external: memUsage.external,
    heapUsagePercent,
  };
}

/**
 * Get recent operations from metrics history
 */
function getRecentOperations(limit: number = 10): RecentOperation[] {
  const history = metrics.getHistory({ limit: limit * 2 });

  // Filter for operation-related metrics and convert to RecentOperation format
  const operations: RecentOperation[] = [];

  for (const entry of history) {
    // Look for operation metrics (counters with operation-related names)
    if (
      entry.name.includes("operation") ||
      entry.name.includes("request") ||
      entry.name.includes("memory_") ||
      entry.name.includes("reasoning_")
    ) {
      operations.push({
        type: entry.name,
        timestamp: entry.timestamp.toISOString(),
        durationMs: entry.type === "histogram" ? entry.value : undefined,
        status: "success", // Metrics are typically recorded for successful operations
      });
    }
  }

  // Return most recent operations up to limit
  return operations.slice(-limit).reverse();
}

/**
 * Convert health check results to component health format
 */
function convertToComponentHealth(results: HealthCheckResult[]): ComponentHealth[] {
  return results.map((result) => ({
    name: result.component,
    status: result.status,
    responseTimeMs: result.responseTimeMs,
    lastCheck: result.lastSuccess?.toISOString(),
    error: result.error,
  }));
}

/**
 * Get system health status
 */
async function getSystemHealth(): Promise<SystemHealth> {
  const report: SystemHealthReport = await healthChecker.generateReport();

  return {
    status: report.status,
    components: convertToComponentHealth(report.components),
    uptimeMs: report.uptimeMs,
    version: report.version,
  };
}

/**
 * Get active sessions count from metrics
 */
function getActiveSessions(): number {
  // Try to get active sessions from gauge metric
  const sessionsGauge = metrics.getGauge("active_sessions");
  if (sessionsGauge > 0) {
    return sessionsGauge;
  }

  // Fallback: estimate from recent session-related metrics
  const sessionHistory = metrics.getHistory({
    name: "session_created",
    limit: 100,
  });

  // Count unique sessions in recent history (simplified estimation)
  return Math.max(0, sessionHistory.length);
}

/**
 * Get processing queue depth from metrics
 */
function getProcessingQueueDepth(): number {
  // Try to get queue depth from gauge metric
  const queueGauge = metrics.getGauge("processing_queue_depth");
  if (queueGauge > 0) {
    return queueGauge;
  }

  // Try alternative metric names
  const reasoningQueue = metrics.getGauge("reasoning_queue_depth");
  if (reasoningQueue > 0) {
    return reasoningQueue;
  }

  // Default to 0 if no queue metrics available
  return 0;
}

/**
 * Handler for GET /api/v1/activity/dashboard
 * Requirements: 7.2
 *
 * Returns active sessions count, processing queue depth, memory usage metrics,
 * recent operations, and system health status.
 */
function createDashboardHandler(
  _cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Gather all dashboard metrics
    const activeSessions = getActiveSessions();
    const processingQueue = getProcessingQueueDepth();
    const memoryUsage = getMemoryUsageMetrics();
    const recentOperations = getRecentOperations(10);
    const health = await getSystemHealth();

    const responseData: DashboardResponse = {
      activeSessions,
      processingQueue,
      memoryUsage,
      recentOperations,
      health,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Create activity routes
 * Requirements: 7.2
 *
 * @param cognitiveCore - Shared cognitive core instance
 * @returns Express router with activity endpoints
 */
export function createActivityRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // GET /api/v1/activity/dashboard - Get dashboard metrics
  // Requirements: 7.2
  router.get("/dashboard", createDashboardHandler(cognitiveCore));

  return router;
}
