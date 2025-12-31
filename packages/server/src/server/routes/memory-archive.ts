/**
 * Memory Archive Routes
 *
 * REST API endpoints for memory archiving, searching archived memories,
 * and restoring archived memories to active storage.
 *
 * Requirements: 4.1-4.6 (Memory Archiving)
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { DatabaseConnectionManager } from "../../database/connection-manager.js";
import {
  ArchiveManagerError,
  createArchiveManager,
  DEFAULT_ARCHIVE_CONFIG,
  type ArchivedMemory,
  type ArchiveResult,
  type ArchiveStats,
  type RestoreResult,
} from "../../memory/archive-manager.js";
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

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Zod schema for archive request validation
 * Requirements: 4.1, 4.2
 */
const archiveRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  memoryIds: z.array(z.string().min(1, "memoryId cannot be empty")).optional(),
  ageThresholdDays: z.coerce.number().int().min(1).optional(),
  retainEmbeddings: z.boolean().optional(),
});

/**
 * Zod schema for archive search request validation
 * Requirements: 4.3
 */
const archiveSearchRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  query: z.string().min(1, "query is required"),
});

/**
 * Zod schema for restore request validation
 * Requirements: 4.4
 */
const restoreRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  memoryId: z.string().min(1, "memoryId is required"),
});

// ============================================================================
// Response Types
// ============================================================================

/**
 * Response type for archive endpoint
 * Requirements: 4.1, 4.2, 4.5
 */
interface ArchiveApiResponse {
  archivedCount: number;
  freedBytes: number;
  timestamp: string;
}

/**
 * Archived memory item in search response
 * Requirements: 4.3
 */
interface ArchivedMemoryItem {
  id: string;
  userId: string;
  content: string;
  metadata: {
    keywords?: string[];
    tags?: string[];
    category?: string;
    context?: string;
    importance?: number;
  };
  embeddings: Record<string, number[]> | null;
  archivedAt: string;
  originalCreatedAt: string;
  tags: string[];
  primarySector: string;
  sessionId?: string;
  salience: number;
  strength: number;
  accessCount: number;
  lastAccessed?: string;
  isArchived: true;
}

/**
 * Response type for archive search endpoint
 * Requirements: 4.3
 */
interface ArchiveSearchApiResponse {
  memories: ArchivedMemoryItem[];
  count: number;
  query: string;
}

/**
 * Response type for restore endpoint
 * Requirements: 4.4
 */
interface RestoreApiResponse {
  restoredCount: number;
  timestamp: string;
  memoryId: string;
}

/**
 * Response type for archive stats endpoint
 * Requirements: 4.6
 */
interface ArchiveStatsApiResponse {
  count: number;
  bytesUsed: number;
}

// ============================================================================
// Response Converters
// ============================================================================

/** Convert ArchiveResult to API response format */
function toArchiveApiResponse(result: ArchiveResult): ArchiveApiResponse {
  return {
    archivedCount: result.archivedCount,
    freedBytes: result.freedBytes,
    timestamp: result.timestamp.toISOString(),
  };
}

/** Convert ArchivedMemory to API response format */
function toArchivedMemoryItem(memory: ArchivedMemory): ArchivedMemoryItem {
  return {
    id: memory.id,
    userId: memory.userId,
    content: memory.content,
    metadata: memory.metadata,
    embeddings: memory.embeddings,
    archivedAt: memory.archivedAt.toISOString(),
    originalCreatedAt: memory.originalCreatedAt.toISOString(),
    tags: memory.tags,
    primarySector: memory.primarySector,
    sessionId: memory.sessionId,
    salience: memory.salience,
    strength: memory.strength,
    accessCount: memory.accessCount,
    lastAccessed: memory.lastAccessed?.toISOString(),
    isArchived: true,
  };
}

/** Convert RestoreResult to API response format */
function toRestoreApiResponse(result: RestoreResult, memoryId: string): RestoreApiResponse {
  return {
    restoredCount: result.restoredCount,
    timestamp: result.timestamp.toISOString(),
    memoryId,
  };
}

/** Convert ArchiveStats to API response format */
function toArchiveStatsApiResponse(stats: ArchiveStats): ArchiveStatsApiResponse {
  return {
    count: stats.count,
    bytesUsed: stats.bytesUsed,
  };
}

// ============================================================================
// Archive Handlers
// ============================================================================

/**
 * Handler for POST /api/v1/memory/archive
 * Requirements: 4.1, 4.2, 4.5
 *
 * Archives memories either by specific IDs or by age threshold.
 * If memoryIds is provided, archives those specific memories.
 * If ageThresholdDays is provided (without memoryIds), archives memories older than threshold.
 * Supports bulk archiving with progress reporting.
 */
function createArchiveHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = archiveRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId, memoryIds, ageThresholdDays, retainEmbeddings } = parseResult.data;
    const db = getDbConnection(cognitiveCore);
    const archiveManager = createArchiveManager(db);

    // Build archive config
    const config = {
      ageThresholdDays: ageThresholdDays ?? DEFAULT_ARCHIVE_CONFIG.ageThresholdDays,
      retainEmbeddings: retainEmbeddings ?? DEFAULT_ARCHIVE_CONFIG.retainEmbeddings,
    };

    try {
      let result: ArchiveResult;

      if (memoryIds && memoryIds.length > 0) {
        // Archive specific memories
        result = await archiveManager.archiveMemories(userId, memoryIds, config);
      } else {
        // Archive by age threshold
        result = await archiveManager.archiveOld(userId, config);
      }

      const responseData = toArchiveApiResponse(result);
      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof ArchiveManagerError) {
        throw new ValidationApiError({ userId: error.message });
      }
      throw error;
    }
  });
}

/**
 * Handler for GET /api/v1/memory/archive/search
 * Requirements: 4.3
 *
 * Searches archived memories by query string.
 * Returns metadata with an archived flag.
 */
function createArchiveSearchHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = archiveSearchRequestSchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId, query } = parseResult.data;
    const db = getDbConnection(cognitiveCore);
    const archiveManager = createArchiveManager(db);

    try {
      const archivedMemories = await archiveManager.searchArchive(userId, query);

      const responseData: ArchiveSearchApiResponse = {
        memories: archivedMemories.map(toArchivedMemoryItem),
        count: archivedMemories.length,
        query,
      };

      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof ArchiveManagerError) {
        throw new ValidationApiError({ userId: error.message });
      }
      throw error;
    }
  });
}

/**
 * Handler for POST /api/v1/memory/archive/restore
 * Requirements: 4.4
 *
 * Restores an archived memory to active storage.
 * The memory is automatically restored when accessed.
 */
function createRestoreHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = restoreRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId, memoryId } = parseResult.data;
    const db = getDbConnection(cognitiveCore);
    const archiveManager = createArchiveManager(db);

    try {
      const result = await archiveManager.restore(userId, memoryId);
      const responseData = toRestoreApiResponse(result, memoryId);
      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof ArchiveManagerError) {
        throw new ValidationApiError({ memoryId: error.message });
      }
      throw error;
    }
  });
}

/**
 * Handler for GET /api/v1/memory/archive/stats
 * Requirements: 4.6
 *
 * Returns archive statistics for a user.
 */
function createArchiveStatsHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const userId = req.query.userId as string | undefined;
    if (!userId || userId.trim().length === 0) {
      throw new ValidationApiError({ userId: "userId query parameter is required" });
    }

    const db = getDbConnection(cognitiveCore);
    const archiveManager = createArchiveManager(db);

    try {
      const stats = await archiveManager.getArchiveStats(userId);
      const responseData = toArchiveStatsApiResponse(stats);
      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof ArchiveManagerError) {
        throw new ValidationApiError({ userId: error.message });
      }
      throw error;
    }
  });
}

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Create memory archive routes
 * Requirements: 4.1-4.6
 *
 * @param cognitiveCore - Shared cognitive core instance
 * @returns Express router with memory archive endpoints
 */
export function createMemoryArchiveRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // POST /api/v1/memory/archive - Archive memories
  // Requirements: 4.1, 4.2, 4.5
  router.post("/archive", createArchiveHandler(cognitiveCore));

  // GET /api/v1/memory/archive/search - Search archived memories
  // Requirements: 4.3
  router.get("/archive/search", createArchiveSearchHandler(cognitiveCore));

  // POST /api/v1/memory/archive/restore - Restore archived memory
  // Requirements: 4.4
  router.post("/archive/restore", createRestoreHandler(cognitiveCore));

  // GET /api/v1/memory/archive/stats - Get archive statistics
  // Requirements: 4.6
  router.get("/archive/stats", createArchiveStatsHandler(cognitiveCore));

  return router;
}
