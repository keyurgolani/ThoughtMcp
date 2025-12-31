/**
 * Memory Consolidation Routes
 *
 * REST API endpoints for memory consolidation operations including
 * manual trigger and status reporting.
 *
 * Requirements: 7.2, 7.3 (Consolidation Scheduling)
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { DatabaseConnectionManager } from "../../database/connection-manager.js";
import { EmbeddingStorage } from "../../embeddings/embedding-storage.js";
import {
  ConsolidationEngineError,
  createConsolidationEngine,
  DEFAULT_CONSOLIDATION_CONFIG,
  type ConsolidationResult,
} from "../../memory/consolidation-engine.js";
import {
  ConsolidationSchedulerError,
  createConsolidationScheduler,
  type SchedulerStatus,
} from "../../memory/consolidation-scheduler.js";
import type { CognitiveCore } from "../cognitive-core.js";
import { asyncHandler, ValidationApiError } from "../middleware/error-handler.js";
import { buildSuccessResponse } from "../types/api-response.js";

/** Helper to extract request ID from request */
function getRequestId(req: Request): string | undefined {
  return (req as Request & { requestId?: string }).requestId;
}

/** Helper to parse Zod validation errors into field errors */
function parseZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "request";
    fieldErrors[path] = issue.message;
  }
  return fieldErrors;
}

/** Helper to get database connection from cognitive core */
function getDbConnection(cognitiveCore: CognitiveCore): DatabaseConnectionManager {
  const db = (cognitiveCore.memoryRepository as unknown as { db: DatabaseConnectionManager }).db;
  if (!db) {
    throw new Error("Database connection manager not available");
  }
  return db;
}

/** Helper to get embedding storage from cognitive core */
function getEmbeddingStorage(cognitiveCore: CognitiveCore): EmbeddingStorage {
  const embeddingStorage = (
    cognitiveCore.memoryRepository as unknown as { embeddingStorage: EmbeddingStorage }
  ).embeddingStorage;
  if (!embeddingStorage) {
    throw new Error("Embedding storage not available");
  }
  return embeddingStorage;
}

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Zod schema for consolidate request validation
 * Requirements: 7.2
 */
const consolidateRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  similarityThreshold: z.coerce.number().min(0).max(1).optional(),
  minClusterSize: z.coerce.number().int().min(2).optional(),
  batchSize: z.coerce.number().int().min(1).max(1000).optional(),
  strengthReductionFactor: z.coerce.number().min(0).max(1).optional(),
});

/**
 * Zod schema for status request validation
 * Requirements: 7.3
 */
const statusRequestSchema = z.object({
  userId: z.string().min(1, "userId is required").optional(),
});

// ============================================================================
// Response Types
// ============================================================================

/**
 * Consolidation result item in response
 * Requirements: 7.2
 */
interface ConsolidationResultItem {
  summaryId: string;
  consolidatedIds: string[];
  summaryContent: string;
  consolidatedAt: string;
}

/**
 * Response type for consolidate endpoint
 * Requirements: 7.2
 */
interface ConsolidateApiResponse {
  results: ConsolidationResultItem[];
  totalConsolidated: number;
  clustersProcessed: number;
  timestamp: string;
}

/**
 * Response type for status endpoint
 * Requirements: 7.3
 */
interface ConsolidationStatusApiResponse {
  isRunning: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  currentProgress: {
    processed: number;
    total: number;
    percentComplete: number;
  } | null;
  detailedProgress: {
    phase: string;
    clustersIdentified: number;
    clustersConsolidated: number;
    memoriesProcessed: number;
    memoriesTotal: number;
    percentComplete: number;
    estimatedRemainingMs: number;
    startedAt: string | null;
  } | null;
  lastError: string | null;
  retryAttempts: number;
  batchSize: number;
}

// ============================================================================
// Response Converters
// ============================================================================

/** Convert ConsolidationResult array to API response format */
function toConsolidateApiResponse(results: ConsolidationResult[]): ConsolidateApiResponse {
  const totalConsolidated = results.reduce((sum, r) => sum + r.consolidatedIds.length, 0);

  return {
    results: results.map((r) => ({
      summaryId: r.summaryId,
      consolidatedIds: r.consolidatedIds,
      summaryContent: r.summaryContent,
      consolidatedAt: r.consolidatedAt.toISOString(),
    })),
    totalConsolidated,
    clustersProcessed: results.length,
    timestamp: new Date().toISOString(),
  };
}

/** Convert SchedulerStatus to API response format */
function toStatusApiResponse(status: SchedulerStatus): ConsolidationStatusApiResponse {
  return {
    isRunning: status.isRunning,
    lastRunAt: status.lastRunAt?.toISOString() ?? null,
    nextRunAt: status.nextRunAt?.toISOString() ?? null,
    currentProgress: status.currentProgress,
    detailedProgress: status.detailedProgress
      ? {
          phase: status.detailedProgress.phase,
          clustersIdentified: status.detailedProgress.clustersIdentified,
          clustersConsolidated: status.detailedProgress.clustersConsolidated,
          memoriesProcessed: status.detailedProgress.memoriesProcessed,
          memoriesTotal: status.detailedProgress.memoriesTotal,
          percentComplete: status.detailedProgress.percentComplete,
          estimatedRemainingMs: status.detailedProgress.estimatedRemainingMs,
          startedAt: status.detailedProgress.startedAt?.toISOString() ?? null,
        }
      : null,
    lastError: status.lastError,
    retryAttempts: status.retryAttempts,
    batchSize: status.batchSize,
  };
}

// ============================================================================
// Singleton Scheduler Instance
// ============================================================================

/** Singleton scheduler instance for status tracking */
let schedulerInstance: ReturnType<typeof createConsolidationScheduler> | null = null;

/**
 * Get or create the consolidation scheduler instance
 */
function getScheduler(
  cognitiveCore: CognitiveCore
): ReturnType<typeof createConsolidationScheduler> {
  if (!schedulerInstance) {
    const db = getDbConnection(cognitiveCore);
    const embeddingStorage = getEmbeddingStorage(cognitiveCore);
    const consolidationEngine = createConsolidationEngine(db, embeddingStorage);
    schedulerInstance = createConsolidationScheduler(consolidationEngine);
  }
  return schedulerInstance;
}

// ============================================================================
// Consolidation Handlers
// ============================================================================

/**
 * Handler for POST /api/v1/memory/consolidate
 * Requirements: 7.2 - Manual trigger via API
 *
 * Triggers manual consolidation for a specific user.
 * Identifies clusters of related episodic memories and consolidates them
 * into semantic summaries.
 */
function createConsolidateHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = consolidateRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId, similarityThreshold, minClusterSize, batchSize, strengthReductionFactor } =
      parseResult.data;

    const scheduler = getScheduler(cognitiveCore);

    // Update config if custom parameters provided
    if (
      similarityThreshold !== undefined ||
      minClusterSize !== undefined ||
      batchSize !== undefined ||
      strengthReductionFactor !== undefined
    ) {
      scheduler.updateConfig({
        consolidationConfig: {
          similarityThreshold:
            similarityThreshold ?? DEFAULT_CONSOLIDATION_CONFIG.similarityThreshold,
          minClusterSize: minClusterSize ?? DEFAULT_CONSOLIDATION_CONFIG.minClusterSize,
          batchSize: batchSize ?? DEFAULT_CONSOLIDATION_CONFIG.batchSize,
          strengthReductionFactor:
            strengthReductionFactor ?? DEFAULT_CONSOLIDATION_CONFIG.strengthReductionFactor,
        },
      });
    }

    try {
      const results = await scheduler.triggerNow(userId);
      const responseData = toConsolidateApiResponse(results);
      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof ConsolidationSchedulerError) {
        if (error.code === "JOB_IN_PROGRESS") {
          throw new ValidationApiError({
            consolidation:
              "A consolidation job is already running. Please wait for it to complete.",
          });
        }
        if (error.code === "LOAD_THRESHOLD_EXCEEDED") {
          throw new ValidationApiError({
            consolidation: "System load is too high. Please try again later.",
          });
        }
        throw new ValidationApiError({ userId: error.message });
      }
      if (error instanceof ConsolidationEngineError) {
        throw new ValidationApiError({ userId: error.message });
      }
      throw error;
    }
  });
}

/**
 * Handler for GET /api/v1/memory/consolidate/status
 * Requirements: 7.3 - Progress reporting via Health API
 *
 * Returns the current status of the consolidation scheduler including
 * progress information if a job is running.
 */
function createStatusHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = statusRequestSchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const scheduler = getScheduler(cognitiveCore);

    try {
      const status = scheduler.getStatus();
      const responseData = toStatusApiResponse(status);
      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof ConsolidationSchedulerError) {
        throw new ValidationApiError({ status: error.message });
      }
      throw error;
    }
  });
}

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Create memory consolidation routes
 * Requirements: 7.2, 7.3
 *
 * @param cognitiveCore - Shared cognitive core instance
 * @returns Express router with memory consolidation endpoints
 */
export function createMemoryConsolidationRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // POST /api/v1/memory/consolidate - Manual trigger consolidation
  // Requirements: 7.2
  router.post("/consolidate", createConsolidateHandler(cognitiveCore));

  // GET /api/v1/memory/consolidate/status - Get consolidation status
  // Requirements: 7.3
  router.get("/consolidate/status", createStatusHandler(cognitiveCore));

  return router;
}
