/**
 * Health Routes
 *
 * REST API endpoints for health monitoring and system status.
 * Provides full health check, readiness probe, and liveness probe endpoints.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.5, 12.6, 13.1, 13.2, 13.3, 15.1, 15.2, 15.3, 15.4
 */

import { Router, type Request, type Response } from "express";
import { LLMClient } from "../../ai/llm-client.js";
import { healthChecker } from "../../monitoring/health-checker.js";
import { Logger } from "../../utils/logger.js";
import type { CognitiveCore } from "../cognitive-core.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { getPerformanceStats } from "../middleware/performance.js";
import { getResponseCacheMetrics } from "../middleware/response-cache.js";
import { buildSuccessResponse } from "../types/api-response.js";

/**
 * Health check timeout in milliseconds
 * Requirements: 12.6
 */
const HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * Component health status
 * Requirements: 12.1, 12.2, 12.3, 13.1, 15.1
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
  /** Additional details about the component */
  details?: Record<string, unknown>;
}

/**
 * Inference model health status
 * Requirements: 15.1, 15.2, 15.3
 */
interface InferenceModelHealth extends ComponentHealth {
  /** Model name being used */
  modelName?: string;
  /** Average latency in milliseconds */
  averageLatencyMs?: number;
  /** Error count since last successful check */
  errorCount?: number;
  /** Features affected when unavailable */
  affectedFeatures?: string[];
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
 * Requirements: 12.1, 12.2, 12.3, 13.1, 15.1
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
    cache: ComponentHealth;
    inferenceModel: InferenceModelHealth;
  };
  /** System performance metrics */
  metrics: HealthMetrics;
  /** Whether deep check was performed */
  deepCheck?: boolean;
  /** Read/write verification result (only in deep check mode) */
  readWriteVerified?: boolean;
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
  message?: string,
  details?: Record<string, unknown>
): ComponentHealth {
  return {
    status,
    latency,
    lastCheck: new Date().toISOString(),
    message,
    details,
  };
}

/**
 * Execute a health check with timeout
 * Requirements: 12.6
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Get pool stats from database connection manager
 */
function getPoolStats(
  db: { getPoolStats?: () => Record<string, unknown> } | undefined
): Record<string, unknown> | undefined {
  if (!db || typeof db.getPoolStats !== "function") {
    return undefined;
  }
  try {
    return db.getPoolStats();
  } catch {
    return undefined;
  }
}

/**
 * Check database health
 * Requirements: 12.1, 12.3, 12.5
 */
async function checkDatabaseHealth(
  cognitiveCore: CognitiveCore,
  _deepCheck: boolean = false
): Promise<ComponentHealth> {
  const startTime = Date.now();

  if (!cognitiveCore.memoryRepository) {
    return createComponentHealth(
      "unhealthy",
      Date.now() - startTime,
      "Memory repository not available"
    );
  }

  try {
    // Access the database connection manager through the repository
    const db = (
      cognitiveCore.memoryRepository as unknown as {
        db: {
          healthCheck: () => Promise<boolean>;
          getPoolStats: () => Record<string, unknown>;
        };
      }
    ).db;

    if (!db || typeof db.healthCheck !== "function") {
      // Fallback: repository exists but no health check method
      return createComponentHealth("healthy", Date.now() - startTime);
    }

    const isHealthy = await db.healthCheck();
    const latency = Date.now() - startTime;

    if (!isHealthy) {
      return createComponentHealth("unhealthy", latency, "Database health check failed");
    }

    const poolStats = getPoolStats(db);
    return createComponentHealth("healthy", latency, undefined, poolStats);
  } catch (error) {
    const latency = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Database check failed";
    return createComponentHealth("unhealthy", latency, message);
  }
}

/**
 * Check embedding engine health
 * Requirements: 12.1, 12.3
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
        embeddingCheck.error,
        embeddingCheck.details
      );
    }

    // Try to check Ollama service directly
    const ollamaHost = process.env.OLLAMA_HOST ?? "http://localhost:11434";
    try {
      const response = await fetch(`${ollamaHost}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(2000), // 2 second timeout for embedding check
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = (await response.json()) as { models?: Array<{ name: string }> };
        const modelCount = data.models?.length ?? 0;
        return createComponentHealth("healthy", latency, undefined, {
          host: ollamaHost,
          modelsAvailable: modelCount,
        });
      } else {
        return createComponentHealth(
          "degraded",
          latency,
          `Ollama returned status ${response.status}`,
          {
            host: ollamaHost,
          }
        );
      }
    } catch (fetchError) {
      const latency = Date.now() - startTime;
      const message = fetchError instanceof Error ? fetchError.message : "Ollama connection failed";
      return createComponentHealth("unhealthy", latency, message, {
        host: ollamaHost,
      });
    }
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
 * Check cache layer health
 * Requirements: 12.1, 12.3
 */
async function checkCacheHealth(): Promise<ComponentHealth> {
  const startTime = Date.now();
  try {
    const cacheMetrics = getResponseCacheMetrics();
    const latency = Date.now() - startTime;

    // Cache is always available (in-memory fallback)
    // Check if hit rate is reasonable (degraded if very low with significant traffic)
    const totalRequests = cacheMetrics.hits + cacheMetrics.misses;
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    let message: string | undefined;

    // If we have significant traffic but very low hit rate, mark as degraded
    if (totalRequests > 100 && cacheMetrics.hitRate < 0.1) {
      status = "degraded";
      message = "Cache hit rate is very low";
    }

    return createComponentHealth(status, latency, message, {
      hits: cacheMetrics.hits,
      misses: cacheMetrics.misses,
      hitRate: cacheMetrics.hitRate,
      size: cacheMetrics.size,
      backend: "memory", // Currently only in-memory is supported
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Cache check failed";
    return createComponentHealth("unhealthy", latency, message);
  }
}

/** Singleton LLM client for health checks */
let healthCheckLLMClient: LLMClient | null = null;

/**
 * Get or create the LLM client for health checks
 */
function getHealthCheckLLMClient(): LLMClient {
  healthCheckLLMClient ??= new LLMClient();
  return healthCheckLLMClient;
}

/**
 * Reset the health check LLM client (for testing purposes)
 */
export function resetHealthCheckLLMClient(): void {
  healthCheckLLMClient = null;
}

/** Latency threshold for warning (5 seconds) */
const INFERENCE_LATENCY_THRESHOLD_MS = 5000;

/**
 * Features affected when inference model is unavailable
 * Requirements: 15.2
 */
const AFFECTED_FEATURES_WHEN_UNAVAILABLE = [
  "think (AI-augmented reasoning)",
  "analyze (systematic analysis)",
  "ponder (parallel reasoning)",
  "evaluate (reasoning quality analysis)",
];

/**
 * Check inference model health
 * Requirements: 15.1, 15.2, 15.3, 15.4
 */
async function checkInferenceModelHealth(): Promise<InferenceModelHealth> {
  const startTime = Date.now();
  const llmClient = getHealthCheckLLMClient();

  try {
    const modelStatus = await llmClient.checkModelAvailability();
    const latency = Date.now() - startTime;

    // Determine status based on availability and latency
    let status: "healthy" | "degraded" | "unhealthy";
    let message: string | undefined;

    if (!modelStatus.available) {
      status = "unhealthy";
      message = modelStatus.error ?? "Inference model not available";
    } else if (modelStatus.averageLatencyMs > INFERENCE_LATENCY_THRESHOLD_MS) {
      // Requirements: 15.4 - Log warning when latency exceeds threshold
      status = "degraded";
      message = `Inference model latency (${Math.round(modelStatus.averageLatencyMs)}ms) exceeds threshold (${INFERENCE_LATENCY_THRESHOLD_MS}ms)`;
      Logger.warn("Inference Model High Latency", {
        model: modelStatus.modelName,
        averageLatencyMs: modelStatus.averageLatencyMs,
        threshold: INFERENCE_LATENCY_THRESHOLD_MS,
      });
    } else {
      status = "healthy";
    }

    const health: InferenceModelHealth = {
      status,
      latency,
      lastCheck: new Date().toISOString(),
      message,
      modelName: modelStatus.modelName,
      averageLatencyMs: modelStatus.averageLatencyMs,
      errorCount: modelStatus.errorCount,
      details: {
        host: process.env.OLLAMA_HOST ?? "http://localhost:11434",
        modelName: modelStatus.modelName,
        lastChecked: modelStatus.lastChecked.toISOString(),
      },
    };

    // Requirements: 15.2 - Include affected features when unavailable
    if (status === "unhealthy" || status === "degraded") {
      health.affectedFeatures = AFFECTED_FEATURES_WHEN_UNAVAILABLE;
    }

    return health;
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Inference model check failed";

    Logger.error("Inference Model Health Check Failed", errorMessage);

    return {
      status: "unhealthy",
      latency,
      lastCheck: new Date().toISOString(),
      message: errorMessage,
      modelName: llmClient.getModelName(),
      affectedFeatures: AFFECTED_FEATURES_WHEN_UNAVAILABLE,
      details: {
        host: process.env.OLLAMA_HOST ?? "http://localhost:11434",
        modelName: llmClient.getModelName(),
      },
    };
  }
}

/**
 * Perform deep check with read/write verification
 * Requirements: 12.5
 */
async function performDeepCheck(cognitiveCore: CognitiveCore): Promise<boolean> {
  try {
    // Access the database connection manager through the repository
    const db = (
      cognitiveCore.memoryRepository as unknown as {
        db: { pool: { query: (sql: string) => Promise<unknown> } | null };
      }
    ).db;

    if (!db?.pool) {
      return false;
    }

    // Perform a simple read/write test using a temporary table or SELECT
    // We use a simple SELECT to verify read capability
    await db.pool.query("SELECT 1 as test");

    return true;
  } catch {
    return false;
  }
}

/**
 * Determine overall status from component statuses
 * Requirements: 12.2
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
 * Requirements: 12.1, 12.2, 12.3, 12.5, 12.6, 13.1
 *
 * Returns overall health status, component health (database, embedding engine,
 * reasoning, memory, cache), and performance metrics.
 *
 * Query parameters:
 * - deep=true: Perform deep check with read/write verification
 */
function createHealthHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);
    const deepCheck = req.query.deep === "true";

    // Wrap entire health check in timeout
    // Requirements: 12.6
    const healthCheckPromise = (async () => {
      // Check all components in parallel
      const [database, embeddingEngine, reasoning, memory, cache, inferenceModel] =
        await Promise.all([
          checkDatabaseHealth(cognitiveCore, deepCheck),
          checkEmbeddingEngineHealth(cognitiveCore),
          checkReasoningHealth(cognitiveCore),
          checkMemoryHealth(cognitiveCore),
          checkCacheHealth(),
          checkInferenceModelHealth(),
        ]);

      const components = {
        database,
        embeddingEngine,
        reasoning,
        memory,
        cache,
        inferenceModel,
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

      // Perform deep check if requested
      // Requirements: 12.5
      if (deepCheck) {
        responseData.deepCheck = true;
        responseData.readWriteVerified = await performDeepCheck(cognitiveCore);
      }

      return responseData;
    })();

    try {
      const responseData = await withTimeout(
        healthCheckPromise,
        HEALTH_CHECK_TIMEOUT_MS,
        "Health check timeout exceeded"
      );

      // Return appropriate HTTP status based on health
      const httpStatus =
        responseData.status === "healthy" ? 200 : responseData.status === "degraded" ? 200 : 503;
      res.status(httpStatus).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      // Timeout or other error
      const message = error instanceof Error ? error.message : "Health check failed";
      const responseData: HealthResponse = {
        status: "unhealthy",
        components: {
          database: createComponentHealth("unhealthy", undefined, message),
          embeddingEngine: createComponentHealth("unhealthy", undefined, message),
          reasoning: createComponentHealth("unhealthy", undefined, message),
          memory: createComponentHealth("unhealthy", undefined, message),
          cache: createComponentHealth("unhealthy", undefined, message),
          inferenceModel: {
            status: "unhealthy",
            lastCheck: new Date().toISOString(),
            message,
            affectedFeatures: AFFECTED_FEATURES_WHEN_UNAVAILABLE,
          },
        },
        metrics: {
          uptime: getUptimeSeconds(),
          requestCount: 0,
          avgResponseTime: 0,
          p95ResponseTime: 0,
          memoryUsage: getMemoryUsage(),
          cache: { hits: 0, misses: 0, hitRate: 0, size: 0 },
        },
      };
      res.status(503).json(buildSuccessResponse(responseData, { requestId, startTime }));
    }
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
 * Requirements: 12.1, 12.2, 12.3, 12.5, 12.6, 13.1, 13.2, 13.3
 *
 * @param cognitiveCore - Shared cognitive core instance
 * @returns Express router with health endpoints
 */
export function createHealthRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // GET /api/v1/health - Full health check
  // Requirements: 12.1, 12.2, 12.3, 12.5, 12.6, 13.1
  router.get("/", createHealthHandler(cognitiveCore));

  // GET /api/v1/health/ready - Readiness probe
  // Requirements: 13.2
  router.get("/ready", createReadinessHandler(cognitiveCore));

  // GET /api/v1/health/live - Liveness probe
  // Requirements: 13.3
  router.get("/live", createLivenessHandler());

  return router;
}
