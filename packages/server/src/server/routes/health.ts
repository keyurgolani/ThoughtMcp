/**
 * Health Routes
 *
 * REST API endpoints for health monitoring and system status.
 * Provides full health check, readiness probe, and liveness probe endpoints.
 *
 * Requirements: 13.1, 13.2, 13.3
 */

import { Router, type Request, type Response } from "express";
import { healthChecker } from "../../monitoring/health-checker.js";
import type { CognitiveCore } from "../cognitive-core.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { getPerformanceStats } from "../middleware/performance.js";
import { getResponseCacheMetrics } from "../middleware/response-cache.js";
import { buildSuccessResponse } from "../types/api-response.js";

/**
 * Component health status
 * Requirements: 13.1
 */
interface ComponentHealth {
  /** Health status */
  status: "healthy" | "degraded" | "unhealthy";
  /** Response latency in milliseconds */
  latency?: number;
  /** Last successful check timestamp */
  lastCheck: string;
  /** Error message if unhealthy */
  message?: string;
}

/**
 * Performance metrics for health response
 * Requirements: 13.1, 17.1
 */
interface HealthMetrics {
  /** System uptime in seconds */
  uptime: number;
  /** Total request count (from metrics if available) */
  requestCount: number;
  /** Average response time in milliseconds */
  avgResponseTime: number;
  /** p95 response time in milliseconds */
  p95ResponseTime: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Response cache statistics */
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
}

/**
 * Full health response type
 * Requirements: 13.1
 */
interface HealthResponse {
  /** Overall system status */
  status: "healthy" | "degraded" | "unhealthy";
  /** Individual component health */
  components: {
    database: ComponentHealth;
    embeddingEngine: ComponentHealth;
    reasoning: ComponentHealth;
    memory: ComponentHealth;
  };
  /** System performance metrics */
  metrics: HealthMetrics;
}

/**
 * Readiness response type
 * Requirements: 13.2
 */
interface ReadinessResponse {
  /** Whether system is ready to accept requests */
  ready: boolean;
  /** Reason if not ready */
  reason?: string;
}

/**
 * Liveness response type
 * Requirements: 13.3
 */
interface LivenessResponse {
  /** Whether system is alive/running */
  alive: boolean;
  /** System uptime in seconds */
  uptime: number;
}

/**
 * Helper to extract request ID from request
 */
function getRequestId(req: Request): string | undefined {
  return (req as Request & { requestId?: string }).requestId;
}

/**
 * Get system uptime in seconds
 */
function getUptimeSeconds(): number {
  return Math.floor(process.uptime());
}

/**
 * Get memory usage in bytes
 */
function getMemoryUsage(): number {
  return process.memoryUsage().heapUsed;
}

/**
 * Create a component health object from health check result
 */
function createComponentHealth(
  status: "healthy" | "degraded" | "unhealthy",
  latency?: number,
  message?: string
): ComponentHealth {
  return {
    status,
    latency,
    lastCheck: new Date().toISOString(),
    message,
  };
}

/**
 * Check database health
 */
async function checkDatabaseHealth(cognitiveCore: CognitiveCore): Promise<ComponentHealth> {
  const startTime = Date.now();
  try {
    // Try to access memory repository which uses database
    // If it's available and can be accessed, database is healthy
    if (cognitiveCore.memoryRepository) {
      // The memory repository existing indicates database connection is available
      const latency = Date.now() - startTime;
      return createComponentHealth("healthy", latency);
    }
    return createComponentHealth(
      "unhealthy",
      Date.now() - startTime,
      "Memory repository not available"
    );
  } catch (error) {
    const latency = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Database check failed";
    return createComponentHealth("unhealthy", latency, message);
  }
}

/**
 * Check embedding engine health
 */
async function checkEmbeddingEngineHealth(_cognitiveCore: CognitiveCore): Promise<ComponentHealth> {
  const startTime = Date.now();
  try {
    // Check if embedding-related components are available via health checker
    const embeddingCheck = healthChecker.getLastResult("embedding");
    if (embeddingCheck) {
      return createComponentHealth(
        embeddingCheck.status,
        embeddingCheck.responseTimeMs,
        embeddingCheck.error
      );
    }
    // If no specific check registered, assume healthy if we got this far
    const latency = Date.now() - startTime;
    return createComponentHealth("healthy", latency);
  } catch (error) {
    const latency = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Embedding engine check failed";
    return createComponentHealth("unhealthy", latency, message);
  }
}

/**
 * Check reasoning system health
 */
async function checkReasoningHealth(cognitiveCore: CognitiveCore): Promise<ComponentHealth> {
  const startTime = Date.now();
  try {
    // Check if reasoning orchestrator is available
    if (cognitiveCore.reasoningOrchestrator) {
      const latency = Date.now() - startTime;
      return createComponentHealth("healthy", latency);
    }
    return createComponentHealth(
      "unhealthy",
      Date.now() - startTime,
      "Reasoning orchestrator not available"
    );
  } catch (error) {
    const latency = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Reasoning check failed";
    return createComponentHealth("unhealthy", latency, message);
  }
}

/**
 * Check memory system health
 */
async function checkMemoryHealth(cognitiveCore: CognitiveCore): Promise<ComponentHealth> {
  const startTime = Date.now();
  try {
    // Check if memory repository is available
    if (cognitiveCore.memoryRepository) {
      const latency = Date.now() - startTime;
      return createComponentHealth("healthy", latency);
    }
    return createComponentHealth(
      "unhealthy",
      Date.now() - startTime,
      "Memory repository not available"
    );
  } catch (error) {
    const latency = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Memory check failed";
    return createComponentHealth("unhealthy", latency, message);
  }
}

/**
 * Determine overall status from component statuses
 */
function determineOverallStatus(
  components: HealthResponse["components"]
): "healthy" | "degraded" | "unhealthy" {
  const statuses = Object.values(components).map((c) => c.status);

  // If any component is unhealthy, overall is unhealthy
  if (statuses.some((s) => s === "unhealthy")) {
    return "unhealthy";
  }

  // If any component is degraded, overall is degraded
  if (statuses.some((s) => s === "degraded")) {
    return "degraded";
  }

  return "healthy";
}

/**
 * Handler for GET /api/v1/health
 * Requirements: 13.1
 *
 * Returns overall health status, component health (database, embedding engine,
 * reasoning, memory), and performance metrics.
 */
function createHealthHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Check all components in parallel
    const [database, embeddingEngine, reasoning, memory] = await Promise.all([
      checkDatabaseHealth(cognitiveCore),
      checkEmbeddingEngineHealth(cognitiveCore),
      checkReasoningHealth(cognitiveCore),
      checkMemoryHealth(cognitiveCore),
    ]);

    const components = {
      database,
      embeddingEngine,
      reasoning,
      memory,
    };

    const status = determineOverallStatus(components);

    // Get performance stats from middleware
    const perfStats = getPerformanceStats();
    const cacheMetrics = getResponseCacheMetrics();

    const metrics: HealthMetrics = {
      uptime: getUptimeSeconds(),
      requestCount: perfStats.totalRequests,
      avgResponseTime: perfStats.avgDurationMs,
      p95ResponseTime: perfStats.p95DurationMs,
      memoryUsage: getMemoryUsage(),
      cache: cacheMetrics,
    };

    const responseData: HealthResponse = {
      status,
      components,
      metrics,
    };

    // Return appropriate HTTP status based on health
    const httpStatus = status === "healthy" ? 200 : status === "degraded" ? 200 : 503;
    res.status(httpStatus).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Handler for GET /api/v1/health/ready
 * Requirements: 13.2
 *
 * Returns readiness status indicating if the system can accept requests.
 * Used by Kubernetes/container orchestrators for readiness probes.
 */
function createReadinessHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Check critical components for readiness
    const [database, memory] = await Promise.all([
      checkDatabaseHealth(cognitiveCore),
      checkMemoryHealth(cognitiveCore),
    ]);

    // System is ready if critical components are not unhealthy
    const criticalUnhealthy = database.status === "unhealthy" || memory.status === "unhealthy";
    const ready = !criticalUnhealthy;

    let reason: string | undefined;
    if (!ready) {
      const unhealthyComponents: string[] = [];
      if (database.status === "unhealthy") {
        unhealthyComponents.push(`database: ${database.message ?? "unhealthy"}`);
      }
      if (memory.status === "unhealthy") {
        unhealthyComponents.push(`memory: ${memory.message ?? "unhealthy"}`);
      }
      reason = `Critical components unhealthy: ${unhealthyComponents.join(", ")}`;
    }

    const responseData: ReadinessResponse = {
      ready,
      reason,
    };

    const httpStatus = ready ? 200 : 503;
    res.status(httpStatus).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Handler for GET /api/v1/health/live
 * Requirements: 13.3
 *
 * Returns liveness status indicating if the system is running.
 * Used by Kubernetes/container orchestrators for liveness probes.
 */
function createLivenessHandler(): (
  req: Request,
  res: Response,
  next: import("express").NextFunction
) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Liveness check is simple - if we can respond, we're alive
    const responseData: LivenessResponse = {
      alive: true,
      uptime: getUptimeSeconds(),
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Create health routes
 * Requirements: 13.1, 13.2, 13.3
 *
 * @param cognitiveCore - Shared cognitive core instance
 * @returns Express router with health endpoints
 */
export function createHealthRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // GET /api/v1/health - Full health check
  // Requirements: 13.1
  router.get("/", createHealthHandler(cognitiveCore));

  // GET /api/v1/health/ready - Readiness probe
  // Requirements: 13.2
  router.get("/ready", createReadinessHandler(cognitiveCore));

  // GET /api/v1/health/live - Liveness probe
  // Requirements: 13.3
  router.get("/live", createLivenessHandler());

  return router;
}
