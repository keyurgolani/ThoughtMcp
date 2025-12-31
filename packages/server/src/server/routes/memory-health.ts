/**
 * Memory Health Routes
 *
 * REST API endpoints for memory health monitoring and quality analysis.
 * Provides health metrics, storage usage, recommendations, and quality analysis.
 *
 * Requirements: 2.1-2.7 (Memory Health Dashboard API), 8.1-8.6 (Memory Quality Metrics)
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { DatabaseConnectionManager } from "../../database/connection-manager.js";
import {
  createHealthMonitor,
  HealthMonitorError,
  type MemoryHealthResponse,
} from "../../memory/health-monitor.js";
import {
  createQualityAnalyzer,
  QualityAnalyzerError,
  type AccessPattern,
  type AccessPatternType,
  type DuplicateCandidate,
  type QualityMetrics,
  type QualityTrend,
} from "../../memory/quality-analyzer.js";
import type { CognitiveCore } from "../cognitive-core.js";
import { asyncHandler, ValidationApiError } from "../middleware/error-handler.js";
import { buildSuccessResponse } from "../types/api-response.js";

function getRequestId(req: Request): string | undefined {
  return (req as Request & { requestId?: string }).requestId;
}

function parseZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "request";
    fieldErrors[path] = issue.message;
  }
  return fieldErrors;
}

const healthRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

const qualityRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

const accessPatternsRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  type: z.enum(["most", "least", "never"], {
    errorMap: () => ({ message: "type must be one of: most, least, never" }),
  }),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const duplicatesRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  threshold: z.coerce.number().min(0).max(1).optional(),
});

const trendsRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

interface MemoryHealthApiResponse {
  storage: { bytesUsed: number; quotaBytes: number; usagePercent: number };
  countsBySector: {
    episodic: number;
    semantic: number;
    procedural: number;
    emotional: number;
    reflective: number;
  };
  countsByAge: { last24h: number; lastWeek: number; lastMonth: number; older: number };
  consolidationQueue: { size: number; estimatedTimeMs: number };
  activeConsolidation: {
    isRunning: boolean;
    phase: string | null;
    clustersIdentified: number;
    clustersConsolidated: number;
    memoriesProcessed: number;
    memoriesTotal: number;
    percentComplete: number;
    estimatedRemainingMs: number;
    startedAt: string | null;
  };
  forgettingCandidates: { lowStrength: number; oldAge: number; lowAccess: number; total: number };
  recommendations: Array<{ type: string; priority: string; message: string; action: string }>;
  timestamp: string;
}

interface QualityMetricsApiResponse {
  averageStrengthBySector: {
    episodic: number;
    semantic: number;
    procedural: number;
    emotional: number;
    reflective: number;
  };
  embeddingCoverage: number;
  clusteringCoefficient: number;
}

interface AccessPatternsApiResponse {
  patterns: Array<{ memoryId: string; content: string; accessCount: number; lastAccessed: string }>;
  type: string;
  count: number;
}

interface DuplicatesApiResponse {
  duplicates: Array<{
    memoryId1: string;
    memoryId2: string;
    similarity: number;
    suggestedAction: string;
  }>;
  count: number;
  threshold: number;
}

interface TrendsApiResponse {
  trends: Array<{
    date: string;
    averageStrength: number;
    totalMemories: number;
    consolidatedCount: number;
  }>;
  days: number;
}

function toHealthApiResponse(health: MemoryHealthResponse): MemoryHealthApiResponse {
  return {
    storage: health.storage,
    countsBySector: health.countsBySector,
    countsByAge: health.countsByAge,
    consolidationQueue: health.consolidationQueue,
    activeConsolidation: {
      isRunning: health.activeConsolidation.isRunning,
      phase: health.activeConsolidation.phase,
      clustersIdentified: health.activeConsolidation.clustersIdentified,
      clustersConsolidated: health.activeConsolidation.clustersConsolidated,
      memoriesProcessed: health.activeConsolidation.memoriesProcessed,
      memoriesTotal: health.activeConsolidation.memoriesTotal,
      percentComplete: health.activeConsolidation.percentComplete,
      estimatedRemainingMs: health.activeConsolidation.estimatedRemainingMs,
      startedAt: health.activeConsolidation.startedAt?.toISOString() ?? null,
    },
    forgettingCandidates: health.forgettingCandidates,
    recommendations: health.recommendations,
    timestamp: health.timestamp.toISOString(),
  };
}

function toQualityApiResponse(metrics: QualityMetrics): QualityMetricsApiResponse {
  return {
    averageStrengthBySector: metrics.averageStrengthBySector,
    embeddingCoverage: metrics.embeddingCoverage,
    clusteringCoefficient: metrics.clusteringCoefficient,
  };
}

function createHealthHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = healthRequestSchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId } = parseResult.data;

    const db = (cognitiveCore.memoryRepository as unknown as { db: DatabaseConnectionManager }).db;
    if (!db) {
      throw new Error("Database connection manager not available");
    }

    const healthMonitor = createHealthMonitor(db);

    try {
      const health = await healthMonitor.getHealth(userId);
      const responseData = toHealthApiResponse(health);
      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof HealthMonitorError) {
        throw new ValidationApiError({ userId: error.message });
      }
      throw error;
    }
  });
}

function createQualityHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = qualityRequestSchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId } = parseResult.data;

    const db = (cognitiveCore.memoryRepository as unknown as { db: DatabaseConnectionManager }).db;
    if (!db) {
      throw new Error("Database connection manager not available");
    }

    const qualityAnalyzer = createQualityAnalyzer(db);

    try {
      const metrics = await qualityAnalyzer.getMetrics(userId);
      const responseData = toQualityApiResponse(metrics);
      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof QualityAnalyzerError) {
        throw new ValidationApiError({ userId: error.message });
      }
      throw error;
    }
  });
}

function createAccessPatternsHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = accessPatternsRequestSchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId, type, limit } = parseResult.data;

    const db = (cognitiveCore.memoryRepository as unknown as { db: DatabaseConnectionManager }).db;
    if (!db) {
      throw new Error("Database connection manager not available");
    }

    const qualityAnalyzer = createQualityAnalyzer(db);

    try {
      const patterns = await qualityAnalyzer.getAccessPatterns(
        userId,
        type as AccessPatternType,
        limit
      );

      const responseData: AccessPatternsApiResponse = {
        patterns: patterns.map((p: AccessPattern) => ({
          memoryId: p.memoryId,
          content: p.content,
          accessCount: p.accessCount,
          lastAccessed: p.lastAccessed.toISOString(),
        })),
        type,
        count: patterns.length,
      };

      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof QualityAnalyzerError) {
        throw new ValidationApiError({ userId: error.message });
      }
      throw error;
    }
  });
}

function createDuplicatesHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = duplicatesRequestSchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId, threshold } = parseResult.data;

    const db = (cognitiveCore.memoryRepository as unknown as { db: DatabaseConnectionManager }).db;
    if (!db) {
      throw new Error("Database connection manager not available");
    }

    const qualityAnalyzer = createQualityAnalyzer(db);

    try {
      const duplicates = await qualityAnalyzer.findDuplicates(userId, threshold);
      const effectiveThreshold = threshold ?? 0.9;

      const responseData: DuplicatesApiResponse = {
        duplicates: duplicates.map((d: DuplicateCandidate) => ({
          memoryId1: d.memoryId1,
          memoryId2: d.memoryId2,
          similarity: d.similarity,
          suggestedAction: d.suggestedAction,
        })),
        count: duplicates.length,
        threshold: effectiveThreshold,
      };

      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof QualityAnalyzerError) {
        throw new ValidationApiError({ userId: error.message });
      }
      throw error;
    }
  });
}

function createTrendsHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = trendsRequestSchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId, days } = parseResult.data;

    const db = (cognitiveCore.memoryRepository as unknown as { db: DatabaseConnectionManager }).db;
    if (!db) {
      throw new Error("Database connection manager not available");
    }

    const qualityAnalyzer = createQualityAnalyzer(db);

    try {
      const trends = await qualityAnalyzer.getTrends(userId, days);
      const effectiveDays = days ?? 30;

      const responseData: TrendsApiResponse = {
        trends: trends.map((t: QualityTrend) => ({
          date: t.date.toISOString().split("T")[0],
          averageStrength: t.averageStrength,
          totalMemories: t.totalMemories,
          consolidatedCount: t.consolidatedCount,
        })),
        days: effectiveDays,
      };

      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof QualityAnalyzerError) {
        throw new ValidationApiError({ userId: error.message });
      }
      throw error;
    }
  });
}

export function createMemoryHealthRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  router.get("/health", createHealthHandler(cognitiveCore));
  router.get("/quality", createQualityHandler(cognitiveCore));
  router.get("/quality/access-patterns", createAccessPatternsHandler(cognitiveCore));
  router.get("/quality/duplicates", createDuplicatesHandler(cognitiveCore));
  router.get("/quality/trends", createTrendsHandler(cognitiveCore));

  return router;
}
