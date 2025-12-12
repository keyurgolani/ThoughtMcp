/**
 * Memory Routes
 *
 * REST API endpoints for memory CRUD operations.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1, 11.2, 11.3
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  MemoryTransactionError,
  MemoryUpdateError,
  MemoryValidationError,
  VALID_SECTORS,
  type ActivityItem,
  type BatchCreateInput,
  type CompositeScore,
  type EmotionalTrend,
  type GraphCluster,
  type GraphEdge,
  type GraphNode,
  type GraphQuery,
  type Memory,
  type MemoryContent,
  type MemoryMetadata,
  type MemorySectorType,
  type MemoryStats,
  type RankingMethod,
  type SearchQuery,
  type TimelineEvent,
  type TimelineQuery,
  type UpdateMemoryInput,
} from "../../memory/types.js";
import { QueryParser } from "../../search/query-parser.js";
import type { CognitiveCore } from "../cognitive-core.js";
import {
  asyncHandler,
  ForbiddenError,
  NotFoundError,
  ValidationApiError,
} from "../middleware/error-handler.js";
import { buildSuccessResponse } from "../types/api-response.js";

/**
 * Zod schema for memory store request validation
 * Requirements: 1.1
 */
const memoryStoreRequestSchema = z.object({
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(100000, "Content must be at most 100,000 characters"),
  userId: z.string().min(1, "userId is required"),
  sessionId: z.string().min(1, "sessionId is required"),
  primarySector: z.enum(["episodic", "semantic", "procedural", "emotional", "reflective"], {
    errorMap: () => ({
      message: `primarySector must be one of: ${VALID_SECTORS.join(", ")}`,
    }),
  }),
  metadata: z
    .object({
      keywords: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      category: z.string().optional(),
      context: z.string().optional(),
      importance: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

/**
 * Response type for memory store endpoint
 * Requirements: 1.1
 */
interface MemoryStoreResponse {
  memoryId: string;
  embeddingsGenerated: number;
  linksCreated: number;
  salience: number;
  strength: number;
}

/**
 * Zod schema for memory recall request validation
 * Requirements: 1.2
 */
const memoryRecallRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  text: z.string().optional(),
  sectors: z
    .array(z.enum(["episodic", "semantic", "procedural", "emotional", "reflective"]))
    .optional(),
  primarySector: z
    .enum(["episodic", "semantic", "procedural", "emotional", "reflective"])
    .optional(),
  minStrength: z.number().min(0).max(1).optional(),
  minSalience: z.number().min(0).max(1).optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
  dateRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
  metadata: z
    .object({
      keywords: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      category: z.string().optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * Memory item in recall response
 * Requirements: 1.2
 */
interface MemoryItem {
  id: string;
  content: string;
  createdAt: string;
  lastAccessed: string;
  accessCount: number;
  salience: number;
  strength: number;
  userId: string;
  sessionId: string;
  primarySector: MemorySectorType;
  metadata: {
    keywords?: string[];
    tags?: string[];
    category?: string;
    context?: string;
    importance?: number;
  };
}

/**
 * Score breakdown for a memory
 * Requirements: 1.2
 */
interface MemoryScore {
  total: number;
  similarity: number;
  salience: number;
  recency: number;
  linkWeight: number;
}

/**
 * Response type for memory recall endpoint
 * Requirements: 1.2
 */
interface MemoryRecallResponse {
  memories: MemoryItem[];
  totalCount: number;
  scores: Record<string, MemoryScore>;
  rankingMethod: RankingMethod;
}

/**
 * Zod schema for memory update request validation
 * Requirements: 1.3
 */
const memoryUpdateRequestSchema = z
  .object({
    memoryId: z.string().min(1, "memoryId is required"),
    userId: z.string().min(1, "userId is required"),
    content: z
      .string()
      .min(10, "Content must be at least 10 characters")
      .max(100000, "Content must be at most 100,000 characters")
      .optional(),
    strength: z.number().min(0).max(1).optional(),
    salience: z.number().min(0).max(1).optional(),
    metadata: z
      .object({
        keywords: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        category: z.string().optional(),
        context: z.string().optional(),
        importance: z.number().min(0).max(1).optional(),
      })
      .optional(),
  })
  .refine(
    (data) =>
      data.content !== undefined ||
      data.strength !== undefined ||
      data.salience !== undefined ||
      data.metadata !== undefined,
    {
      message:
        "At least one field to update must be provided (content, strength, salience, or metadata)",
      path: ["updates"],
    }
  );

/**
 * Response type for memory update endpoint
 * Requirements: 1.3
 */
interface MemoryUpdateResponse {
  memoryId: string;
  embeddingsRegenerated: boolean;
  connectionsUpdated: boolean;
  processingTimeMs: number;
}

/**
 * Response type for memory delete endpoint
 * Requirements: 1.4
 */
interface MemoryDeleteResponse {
  memoryId: string;
  deleted: boolean;
  soft: boolean;
}

/**
 * Activity item in stats response
 * Requirements: 1.5
 */
interface ActivityItemResponse {
  type: "create" | "update" | "delete" | "access";
  memoryId: string;
  timestamp: string;
  sector: MemorySectorType;
}

/**
 * Response type for memory stats endpoint
 * Requirements: 1.5
 */
interface MemoryStatsResponse {
  episodicCount: number;
  semanticCount: number;
  proceduralCount: number;
  emotionalCount: number;
  reflectiveCount: number;
  totalCapacity: number;
  consolidationPending: number;
  recentActivity: ActivityItemResponse[];
}

/**
 * Response type for memory graph endpoint
 * Requirements: 2.1, 2.3
 */
interface MemoryGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
}

/**
 * Response type for memory timeline endpoint
 * Requirements: 2.2
 */
interface MemoryTimelineResponse {
  timeline: TimelineEvent[];
  emotionalTrends: EmotionalTrend[];
  totalCount: number;
}

/**
 * Zod schema for batch store request validation
 * Requirements: 11.1
 */
const batchStoreRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  sessionId: z.string().min(1, "sessionId is required"),
  memories: z
    .array(
      z.object({
        content: z
          .string()
          .min(10, "Content must be at least 10 characters")
          .max(100000, "Content must be at most 100,000 characters"),
        primarySector: z.enum(["episodic", "semantic", "procedural", "emotional", "reflective"], {
          errorMap: () => ({
            message: `primarySector must be one of: ${VALID_SECTORS.join(", ")}`,
          }),
        }),
        metadata: z
          .object({
            keywords: z.array(z.string()).optional(),
            tags: z.array(z.string()).optional(),
            category: z.string().optional(),
            context: z.string().optional(),
            importance: z.number().min(0).max(1).optional(),
          })
          .optional(),
      })
    )
    .min(1, "At least one memory is required")
    .max(100, "Maximum 100 memories per batch"),
});

/**
 * Individual result for a memory in batch store response
 * Requirements: 11.1
 */
interface BatchStoreItemResult {
  memoryId?: string;
  content: string;
  success: boolean;
  error?: string;
}

/**
 * Response type for batch store endpoint
 * Requirements: 11.1
 */
interface BatchStoreResponse {
  successCount: number;
  failureCount: number;
  results: BatchStoreItemResult[];
  processingTimeMs: number;
}

/**
 * Zod schema for batch recall request validation
 * Requirements: 11.2
 */
const batchRecallRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  memoryIds: z
    .array(z.string().min(1, "memoryId cannot be empty"))
    .min(1, "At least one memoryId is required")
    .max(100, "Maximum 100 memory IDs per batch"),
  includeDeleted: z.boolean().optional(),
});

/**
 * Response type for batch recall endpoint
 * Requirements: 11.2
 */
interface BatchRecallResponse {
  memories: MemoryItem[];
  notFound: string[];
  processingTimeMs: number;
}

/**
 * Zod schema for batch delete request validation
 * Requirements: 11.3
 */
const batchDeleteRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  memoryIds: z
    .array(z.string().min(1, "memoryId cannot be empty"))
    .min(1, "At least one memoryId is required")
    .max(100, "Maximum 100 memory IDs per batch"),
  soft: z.boolean().optional(),
});

/**
 * Individual result for a memory in batch delete response
 * Requirements: 11.3
 */
interface BatchDeleteItemResult {
  memoryId: string;
  success: boolean;
  error?: string;
}

/**
 * Response type for batch delete endpoint
 * Requirements: 11.3
 */
interface BatchDeleteResponse {
  successCount: number;
  failureCount: number;
  results: BatchDeleteItemResult[];
  soft: boolean;
  processingTimeMs: number;
}

/**
 * Zod schema for advanced search request validation
 * Requirements: 12.1, 12.2, 12.3
 *
 * Supports boolean operators (AND, OR, NOT) in text queries,
 * metadata filters, and date range filtering.
 */
const advancedSearchRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  text: z.string().max(1000, "text query must be at most 1000 characters").optional(),
  sectors: z
    .array(z.enum(["episodic", "semantic", "procedural", "emotional", "reflective"]))
    .optional(),
  primarySector: z
    .enum(["episodic", "semantic", "procedural", "emotional", "reflective"])
    .optional(),
  minStrength: z.number().min(0).max(1).optional(),
  minSalience: z.number().min(0).max(1).optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
  dateRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
  metadata: z
    .object({
      keywords: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      category: z.string().optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * Search result item in advanced search response
 * Requirements: 12.1
 */
interface AdvancedSearchItem {
  id: string;
  content: string;
  createdAt: string;
  lastAccessed: string;
  accessCount: number;
  salience: number;
  strength: number;
  userId: string;
  sessionId: string;
  primarySector: MemorySectorType;
  metadata: {
    keywords?: string[];
    tags?: string[];
    category?: string;
    context?: string;
    importance?: number;
  };
  score: {
    total: number;
    similarity: number;
    salience: number;
    recency: number;
    linkWeight: number;
  };
  rank: number;
}

/**
 * Response type for advanced search endpoint
 * Requirements: 12.1, 12.2, 12.3
 */
interface AdvancedSearchResponse {
  results: AdvancedSearchItem[];
  totalCount: number;
  rankingMethod: RankingMethod;
  query: {
    text?: string;
    parsedQuery?: string;
    includeTerms?: string[];
    excludeTerms?: string[];
  };
  processingTimeMs: number;
}

/**
 * Helper to extract request ID from request
 */
function getRequestId(req: Request): string | undefined {
  return (req as Request & { requestId?: string }).requestId;
}

/**
 * Helper to parse Zod validation errors into field errors
 */
function parseZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "request";
    fieldErrors[path] = issue.message;
  }
  return fieldErrors;
}

/**
 * Handler for POST /api/v1/memory/store
 * Requirements: 1.1
 */
function createStoreHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = memoryStoreRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { content, userId, sessionId, primarySector, metadata } = parseResult.data;

    const memoryContent: MemoryContent = {
      content,
      userId,
      sessionId,
      primarySector: primarySector as MemorySectorType,
    };

    const memoryMetadata: MemoryMetadata | undefined = metadata
      ? {
          keywords: metadata.keywords,
          tags: metadata.tags,
          category: metadata.category,
          context: metadata.context,
          importance: metadata.importance,
        }
      : undefined;

    const memory = await cognitiveCore.memoryRepository.create(memoryContent, memoryMetadata);

    const responseData: MemoryStoreResponse = {
      memoryId: memory.id,
      embeddingsGenerated: memory.embeddings ? Object.keys(memory.embeddings).length : 0,
      linksCreated: memory.links?.length ?? 0,
      salience: memory.salience,
      strength: memory.strength,
    };

    res.status(201).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Handler for POST /api/v1/memory/recall
 * Requirements: 1.2
 */
function createRecallHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = memoryRecallRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const {
      userId,
      text,
      sectors,
      primarySector,
      minStrength,
      minSalience,
      minSimilarity,
      dateRange,
      metadata,
      limit,
      offset,
    } = parseResult.data;

    const searchQuery: SearchQuery = {
      userId,
      text,
      sectors: sectors as MemorySectorType[] | undefined,
      primarySector: primarySector as MemorySectorType | undefined,
      minStrength,
      minSalience,
      minSimilarity,
      dateRange: dateRange
        ? {
            start: dateRange.start ? new Date(dateRange.start) : undefined,
            end: dateRange.end ? new Date(dateRange.end) : undefined,
          }
        : undefined,
      metadata,
      limit: limit ?? 10,
      offset: offset ?? 0,
    };

    const searchResult = await cognitiveCore.memoryRepository.search(searchQuery);

    const memoryItems: MemoryItem[] = searchResult.memories.map((memory: Memory) => ({
      id: memory.id,
      content: memory.content,
      createdAt: memory.createdAt.toISOString(),
      lastAccessed: memory.lastAccessed.toISOString(),
      accessCount: memory.accessCount,
      salience: memory.salience,
      strength: memory.strength,
      userId: memory.userId,
      sessionId: memory.sessionId,
      primarySector: memory.primarySector,
      metadata: {
        keywords: memory.metadata.keywords,
        tags: memory.metadata.tags,
        category: memory.metadata.category,
        context: memory.metadata.context,
        importance: memory.metadata.importance,
      },
    }));

    const scoresRecord: Record<string, MemoryScore> = {};
    searchResult.scores.forEach((score: CompositeScore, memoryId: string) => {
      scoresRecord[memoryId] = {
        total: score.total,
        similarity: score.similarity,
        salience: score.salience,
        recency: score.recency,
        linkWeight: score.linkWeight,
      };
    });

    const responseData: MemoryRecallResponse = {
      memories: memoryItems,
      totalCount: searchResult.totalCount,
      scores: scoresRecord,
      rankingMethod: searchResult.rankingMethod,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Handler for PUT /api/v1/memory/update
 * Requirements: 1.3
 */
function createUpdateHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = memoryUpdateRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { memoryId, userId, content, strength, salience, metadata } = parseResult.data;

    const updateInput: UpdateMemoryInput = {
      memoryId,
      userId,
      content,
      strength,
      salience,
      metadata,
    };

    try {
      const updateResult = await cognitiveCore.memoryRepository.update(updateInput);

      const responseData: MemoryUpdateResponse = {
        memoryId: updateResult.memory.id,
        embeddingsRegenerated: updateResult.embeddingsRegenerated,
        connectionsUpdated: updateResult.connectionsUpdated,
        processingTimeMs: updateResult.processingTime,
      };

      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof MemoryUpdateError) {
        if (error.message.includes("does not belong to user")) {
          throw new ForbiddenError("Memory does not belong to user");
        }
        throw error;
      }

      if (error instanceof MemoryValidationError) {
        if (error.message.includes("not found")) {
          throw new NotFoundError("Memory", memoryId);
        }
        throw error;
      }

      throw error;
    }
  });
}

/**
 * Handler for DELETE /api/v1/memory/:memoryId
 * Requirements: 1.4
 *
 * Supports soft and hard deletion via query parameter.
 * Validates ownership before deletion.
 */
function createDeleteHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Extract memoryId from path parameter
    const { memoryId } = req.params;
    if (!memoryId || memoryId.trim().length === 0) {
      throw new ValidationApiError({ memoryId: "memoryId is required" });
    }

    // Extract userId from query parameter (required for ownership validation)
    const userId = req.query.userId as string | undefined;
    if (!userId || userId.trim().length === 0) {
      throw new ValidationApiError({ userId: "userId query parameter is required" });
    }

    // Extract soft delete flag from query parameter (default: false for hard delete)
    const softParam = req.query.soft as string | undefined;
    const soft = softParam === "true";

    // Validate ownership by retrieving the memory first
    const existingMemory = await cognitiveCore.memoryRepository.retrieve(memoryId, userId);

    if (!existingMemory) {
      // Memory not found or doesn't belong to user
      // Check if memory exists at all by trying to retrieve without user filter
      // For security, we return NotFoundError in both cases to avoid leaking info
      throw new NotFoundError("Memory", memoryId);
    }

    // Ownership is validated by retrieve() - it only returns memories belonging to the user
    // Now perform the deletion
    try {
      await cognitiveCore.memoryRepository.delete(memoryId, soft);

      const responseData: MemoryDeleteResponse = {
        memoryId,
        deleted: true,
        soft,
      };

      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof MemoryValidationError) {
        if (error.message.includes("not found")) {
          throw new NotFoundError("Memory", memoryId);
        }
        throw error;
      }

      if (error instanceof MemoryTransactionError) {
        throw error;
      }

      throw error;
    }
  });
}

/**
 * Handler for GET /api/v1/memory/stats
 * Requirements: 1.5
 *
 * Returns memory statistics including counts per sector, total capacity,
 * consolidation status, and recent activity.
 */
function createStatsHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Extract userId from query parameter (required)
    const userId = req.query.userId as string | undefined;
    if (!userId || userId.trim().length === 0) {
      throw new ValidationApiError({ userId: "userId query parameter is required" });
    }

    const stats: MemoryStats = await cognitiveCore.memoryRepository.getStats(userId);

    // Convert ActivityItem dates to ISO strings for response
    const recentActivity: ActivityItemResponse[] = stats.recentActivity.map(
      (item: ActivityItem) => ({
        type: item.type,
        memoryId: item.memoryId,
        timestamp: item.timestamp.toISOString(),
        sector: item.sector,
      })
    );

    const responseData: MemoryStatsResponse = {
      episodicCount: stats.episodicCount,
      semanticCount: stats.semanticCount,
      proceduralCount: stats.proceduralCount,
      emotionalCount: stats.emotionalCount,
      reflectiveCount: stats.reflectiveCount,
      totalCapacity: stats.totalCapacity,
      consolidationPending: stats.consolidationPending,
      recentActivity,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Handler for GET /api/v1/memory/graph
 * Requirements: 2.1, 2.3
 *
 * Returns memory graph data including nodes, edges, and clusters.
 * Supports filtering by center memory, depth, and sector type.
 */
function createGraphHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Extract userId from query parameter (required)
    const userId = req.query.userId as string | undefined;
    if (!userId || userId.trim().length === 0) {
      throw new ValidationApiError({ userId: "userId query parameter is required" });
    }

    // Extract optional center_memory_id parameter
    const centerMemoryId = req.query.center_memory_id as string | undefined;

    // Extract optional depth parameter (default: 3, max: 5)
    const depthParam = req.query.depth as string | undefined;
    let depth = 3;
    if (depthParam) {
      const parsedDepth = parseInt(depthParam, 10);
      if (isNaN(parsedDepth) || parsedDepth < 1 || parsedDepth > 5) {
        throw new ValidationApiError({ depth: "depth must be an integer between 1 and 5" });
      }
      depth = parsedDepth;
    }

    // Extract optional type filter parameter
    const typeFilter = req.query.type as string | undefined;
    if (typeFilter && !VALID_SECTORS.includes(typeFilter as MemorySectorType)) {
      throw new ValidationApiError({
        type: `type must be one of: ${VALID_SECTORS.join(", ")}`,
      });
    }

    // Build graph query
    const graphQuery: GraphQuery = {
      userId,
      centerMemoryId: centerMemoryId ?? undefined,
      depth,
      typeFilter: typeFilter as MemorySectorType | undefined,
    };

    // If center memory specified, validate it exists and belongs to user
    if (centerMemoryId) {
      const centerMemory = await cognitiveCore.memoryRepository.retrieve(centerMemoryId, userId);
      if (!centerMemory) {
        throw new NotFoundError("Memory", centerMemoryId);
      }
    }

    // Get graph data
    const graphResult = await cognitiveCore.memoryRepository.getGraph(graphQuery);

    const responseData: MemoryGraphResponse = {
      nodes: graphResult.nodes,
      edges: graphResult.edges,
      clusters: graphResult.clusters,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/** Parse and validate a date parameter */
function parseDateParam(param: string | undefined, fieldName: string): Date | undefined {
  if (!param) return undefined;
  const date = new Date(param);
  if (isNaN(date.getTime())) {
    throw new ValidationApiError({ [fieldName]: `${fieldName} must be a valid ISO 8601 date` });
  }
  return date;
}

/** Parse and validate a valence parameter (-1 to 1) */
function parseValenceParam(param: string | undefined, fieldName: string): number | undefined {
  if (!param) return undefined;
  const value = parseFloat(param);
  if (isNaN(value) || value < -1 || value > 1) {
    throw new ValidationApiError({ [fieldName]: `${fieldName} must be a number between -1 and 1` });
  }
  return value;
}

/** Parse and validate an arousal parameter (0 to 1) */
function parseArousalParam(param: string | undefined, fieldName: string): number | undefined {
  if (!param) return undefined;
  const value = parseFloat(param);
  if (isNaN(value) || value < 0 || value > 1) {
    throw new ValidationApiError({ [fieldName]: `${fieldName} must be a number between 0 and 1` });
  }
  return value;
}

/** Parse and validate pagination limit parameter */
function parseLimitParam(param: string | undefined, defaultVal: number, max: number): number {
  if (!param) return defaultVal;
  const value = parseInt(param, 10);
  if (isNaN(value) || value < 1 || value > max) {
    throw new ValidationApiError({ limit: `limit must be an integer between 1 and ${max}` });
  }
  return value;
}

/** Parse and validate pagination offset parameter */
function parseOffsetParam(param: string | undefined): number {
  if (!param) return 0;
  const value = parseInt(param, 10);
  if (isNaN(value) || value < 0) {
    throw new ValidationApiError({ offset: "offset must be a non-negative integer" });
  }
  return value;
}

/** Parse timeline query parameters from request */
function parseTimelineQueryParams(req: Request): TimelineQuery {
  const userId = req.query.userId as string | undefined;
  if (!userId || userId.trim().length === 0) {
    throw new ValidationApiError({ userId: "userId query parameter is required" });
  }

  const startDate = parseDateParam(req.query.start_date as string | undefined, "start_date");
  const endDate = parseDateParam(req.query.end_date as string | undefined, "end_date");
  const dateRange = (startDate ?? endDate) ? { start: startDate, end: endDate } : undefined;

  const minValence = parseValenceParam(req.query.min_valence as string | undefined, "min_valence");
  const maxValence = parseValenceParam(req.query.max_valence as string | undefined, "max_valence");
  const minArousal = parseArousalParam(req.query.min_arousal as string | undefined, "min_arousal");
  const maxArousal = parseArousalParam(req.query.max_arousal as string | undefined, "max_arousal");
  const hasEmotionalFilter =
    minValence !== undefined ||
    maxValence !== undefined ||
    minArousal !== undefined ||
    maxArousal !== undefined;
  const emotionalFilter = hasEmotionalFilter
    ? { minValence, maxValence, minArousal, maxArousal }
    : undefined;

  const limit = parseLimitParam(req.query.limit as string | undefined, 100, 500);
  const offset = parseOffsetParam(req.query.offset as string | undefined);

  return { userId, dateRange, emotionalFilter, limit, offset };
}

/**
 * Handler for GET /api/v1/memory/timeline
 * Requirements: 2.2
 */
function createTimelineHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);
    const timelineQuery = parseTimelineQueryParams(req);
    const timelineResult = await cognitiveCore.memoryRepository.getTimeline(timelineQuery);

    const responseData: MemoryTimelineResponse = {
      timeline: timelineResult.timeline,
      emotionalTrends: timelineResult.emotionalTrends,
      totalCount: timelineResult.totalCount,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Handler for POST /api/v1/memory/batch/store
 * Requirements: 11.1
 *
 * Processes an array of memories with individual success/failure tracking.
 * Each memory is processed independently, so failures don't affect other memories.
 */
function createBatchStoreHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Validate request body
    const parseResult = batchStoreRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId, sessionId, memories } = parseResult.data;

    // Build batch create input
    const batchInput: BatchCreateInput = {
      userId,
      sessionId,
      memories: memories.map((m) => ({
        content: m.content,
        primarySector: m.primarySector as MemorySectorType,
        metadata: m.metadata,
      })),
    };

    // Execute batch creation
    const batchResult = await cognitiveCore.memoryRepository.batchCreate(batchInput);

    // Build response with individual results
    const results: BatchStoreItemResult[] = [
      ...batchResult.created.map((item) => ({
        memoryId: item.memoryId,
        content: item.content,
        success: true,
      })),
      ...batchResult.failures.map((item) => ({
        content: item.content,
        success: false,
        error: item.error,
      })),
    ];

    const responseData: BatchStoreResponse = {
      successCount: batchResult.successCount,
      failureCount: batchResult.failureCount,
      results,
      processingTimeMs: batchResult.processingTime,
    };

    res.status(201).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Handler for POST /api/v1/memory/batch/recall
 * Requirements: 11.2
 *
 * Retrieves multiple memories by their IDs in a single request.
 * Returns all requested memories along with a list of IDs that were not found.
 */
function createBatchRecallHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Validate request body
    const parseResult = batchRecallRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId, memoryIds, includeDeleted } = parseResult.data;

    // Execute batch retrieval
    const batchResult = await cognitiveCore.memoryRepository.batchRetrieve({
      userId,
      memoryIds,
      includeDeleted: includeDeleted ?? false,
    });

    // Convert memories to response format
    const memoryItems: MemoryItem[] = batchResult.memories.map((memory: Memory) => ({
      id: memory.id,
      content: memory.content,
      createdAt: memory.createdAt.toISOString(),
      lastAccessed: memory.lastAccessed.toISOString(),
      accessCount: memory.accessCount,
      salience: memory.salience,
      strength: memory.strength,
      userId: memory.userId,
      sessionId: memory.sessionId,
      primarySector: memory.primarySector,
      metadata: {
        keywords: memory.metadata.keywords,
        tags: memory.metadata.tags,
        category: memory.metadata.category,
        context: memory.metadata.context,
        importance: memory.metadata.importance,
      },
    }));

    const responseData: BatchRecallResponse = {
      memories: memoryItems,
      notFound: batchResult.notFound,
      processingTimeMs: batchResult.processingTime,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Handler for DELETE /api/v1/memory/batch
 * Requirements: 11.3
 *
 * Deletes multiple memories by their IDs in a single request.
 * Supports both soft and hard deletion for all specified memories.
 * Validates ownership before deletion - only memories belonging to the user are deleted.
 */
function createBatchDeleteHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Validate request body
    const parseResult = batchDeleteRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId, memoryIds, soft } = parseResult.data;
    const isSoftDelete = soft ?? false;

    // First, validate ownership by retrieving all memories
    // Only memories belonging to the user will be deleted
    const batchRetrieveResult = await cognitiveCore.memoryRepository.batchRetrieve({
      userId,
      memoryIds,
      includeDeleted: false,
    });

    // Get the IDs of memories that belong to the user
    const ownedMemoryIds = batchRetrieveResult.memories.map((m: Memory) => m.id);

    // Track memories that don't belong to the user or don't exist
    const unauthorizedOrNotFound = memoryIds.filter((id) => !ownedMemoryIds.includes(id));

    // If no memories belong to the user, return early with all failures
    if (ownedMemoryIds.length === 0) {
      const results: BatchDeleteItemResult[] = memoryIds.map((memoryId) => ({
        memoryId,
        success: false,
        error: "Memory not found or does not belong to user",
      }));

      const responseData: BatchDeleteResponse = {
        successCount: 0,
        failureCount: memoryIds.length,
        results,
        soft: isSoftDelete,
        processingTimeMs: Date.now() - startTime,
      };

      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
      return;
    }

    // Execute batch deletion for owned memories
    const batchResult = await cognitiveCore.memoryRepository.batchDelete(
      ownedMemoryIds,
      isSoftDelete
    );

    // Build results array combining successful deletions and failures
    const results: BatchDeleteItemResult[] = [
      // Successfully deleted memories
      ...ownedMemoryIds
        .filter((id) => !batchResult.failures.some((f) => f.memoryId === id))
        .map((memoryId) => ({
          memoryId,
          success: true,
        })),
      // Failures from batch delete operation
      ...batchResult.failures.map((f) => ({
        memoryId: f.memoryId,
        success: false,
        error: f.error,
      })),
      // Memories that don't belong to user or don't exist
      ...unauthorizedOrNotFound.map((memoryId) => ({
        memoryId,
        success: false,
        error: "Memory not found or does not belong to user",
      })),
    ];

    const responseData: BatchDeleteResponse = {
      successCount: batchResult.successCount,
      failureCount: batchResult.failureCount + unauthorizedOrNotFound.length,
      results,
      soft: isSoftDelete,
      processingTimeMs: batchResult.processingTime,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Handler for POST /api/v1/memory/search
 * Requirements: 12.1, 12.2, 12.3
 *
 * Advanced search endpoint supporting boolean operators (AND, OR, NOT) in text queries,
 * metadata filters (tags, keywords, category), and date range filtering.
 * Returns ranked results combining full-text search, vector similarity, and metadata filtering.
 */
function createAdvancedSearchHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Validate request body
    const parseResult = advancedSearchRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const {
      userId,
      text,
      sectors,
      primarySector,
      minStrength,
      minSalience,
      minSimilarity,
      dateRange,
      metadata,
      limit,
      offset,
    } = parseResult.data;

    // Parse the text query if provided to extract boolean operators
    let parsedQuery: string | undefined;
    let includeTerms: string[] | undefined;
    let excludeTerms: string[] | undefined;

    if (text) {
      const queryParser = new QueryParser(1000);
      const parsed = queryParser.parseQuery(text);
      parsedQuery = parsed.tsQuery;
      includeTerms = parsed.includeTerms;
      excludeTerms = parsed.excludeTerms;
    }

    // Build search query for memory repository
    const searchQuery: SearchQuery = {
      userId,
      text, // Pass original text - repository handles parsing
      sectors: sectors as MemorySectorType[] | undefined,
      primarySector: primarySector as MemorySectorType | undefined,
      minStrength,
      minSalience,
      minSimilarity,
      dateRange: dateRange
        ? {
            start: dateRange.start ? new Date(dateRange.start) : undefined,
            end: dateRange.end ? new Date(dateRange.end) : undefined,
          }
        : undefined,
      metadata,
      limit: limit ?? 10,
      offset: offset ?? 0,
    };

    // Execute search
    const searchResult = await cognitiveCore.memoryRepository.search(searchQuery);

    // Build response with ranked results
    const results: AdvancedSearchItem[] = searchResult.memories.map(
      (memory: Memory, index: number) => {
        const score = searchResult.scores.get(memory.id);
        return {
          id: memory.id,
          content: memory.content,
          createdAt: memory.createdAt.toISOString(),
          lastAccessed: memory.lastAccessed.toISOString(),
          accessCount: memory.accessCount,
          salience: memory.salience,
          strength: memory.strength,
          userId: memory.userId,
          sessionId: memory.sessionId,
          primarySector: memory.primarySector,
          metadata: {
            keywords: memory.metadata.keywords,
            tags: memory.metadata.tags,
            category: memory.metadata.category,
            context: memory.metadata.context,
            importance: memory.metadata.importance,
          },
          score: {
            total: score?.total ?? 0,
            similarity: score?.similarity ?? 0,
            salience: score?.salience ?? 0,
            recency: score?.recency ?? 0,
            linkWeight: score?.linkWeight ?? 0,
          },
          rank: index + 1,
        };
      }
    );

    const responseData: AdvancedSearchResponse = {
      results,
      totalCount: searchResult.totalCount,
      rankingMethod: searchResult.rankingMethod,
      query: {
        text,
        parsedQuery,
        includeTerms,
        excludeTerms,
      },
      processingTimeMs: searchResult.processingTime,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Creates memory routes with the provided cognitive core
 *
 * @param cognitiveCore - The shared cognitive core instance
 * @returns Express router with memory endpoints
 */
export function createMemoryRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // POST /api/v1/memory/store - Store a new memory (Requirements: 1.1)
  router.post("/store", createStoreHandler(cognitiveCore));

  // POST /api/v1/memory/recall - Retrieve memories (Requirements: 1.2)
  router.post("/recall", createRecallHandler(cognitiveCore));

  // PUT /api/v1/memory/update - Update an existing memory (Requirements: 1.3)
  router.put("/update", createUpdateHandler(cognitiveCore));

  // DELETE /api/v1/memory/:memoryId - Delete a memory (Requirements: 1.4)
  router.delete("/:memoryId", createDeleteHandler(cognitiveCore));

  // GET /api/v1/memory/stats - Get memory statistics (Requirements: 1.5)
  router.get("/stats", createStatsHandler(cognitiveCore));

  // GET /api/v1/memory/graph - Get memory graph data (Requirements: 2.1, 2.3)
  router.get("/graph", createGraphHandler(cognitiveCore));

  // GET /api/v1/memory/timeline - Get memory timeline data (Requirements: 2.2)
  router.get("/timeline", createTimelineHandler(cognitiveCore));

  // POST /api/v1/memory/batch/store - Batch store memories (Requirements: 11.1)
  router.post("/batch/store", createBatchStoreHandler(cognitiveCore));

  // POST /api/v1/memory/batch/recall - Batch recall memories (Requirements: 11.2)
  router.post("/batch/recall", createBatchRecallHandler(cognitiveCore));

  // DELETE /api/v1/memory/batch - Batch delete memories (Requirements: 11.3)
  router.delete("/batch", createBatchDeleteHandler(cognitiveCore));

  // POST /api/v1/memory/search - Advanced search with boolean operators (Requirements: 12.1, 12.2, 12.3)
  router.post("/search", createAdvancedSearchHandler(cognitiveCore));

  return router;
}

/**
 * Default export for the memory routes module
 */
export default createMemoryRoutes;
