/**
 * Memory Export/Import Routes
 *
 * REST API endpoints for exporting memories to JSON format and importing
 * memories from JSON with validation support.
 *
 * Requirements: 6.1-6.6 (Memory Export/Import)
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { DatabaseConnectionManager } from "../../database/connection-manager.js";
import { EmbeddingStorage } from "../../embeddings/embedding-storage.js";
import {
  createExportImportService,
  ExportImportError,
  type ExportedMemory,
  type ExportFilter,
  type ExportResult,
  type ImportOptions,
  type ImportResult,
  type ValidationResult,
} from "../../memory/export-import-service.js";
import type { MemorySectorType } from "../../memory/types.js";
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

/** Valid memory sector types */
const validSectors = ["episodic", "semantic", "procedural", "emotional", "reflective"] as const;

/**
 * Zod schema for export request validation
 * Requirements: 6.1, 6.2
 */
const exportRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sectors: z
    .array(z.enum(validSectors, { errorMap: () => ({ message: "Invalid sector type" }) }))
    .optional(),
  tags: z.array(z.string().min(1, "tag cannot be empty")).optional(),
  minStrength: z.coerce.number().min(0).max(1).optional(),
});

/**
 * Zod schema for import request validation
 * Requirements: 6.3, 6.4, 6.5
 */
const importRequestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  mode: z.enum(["merge", "replace"], {
    errorMap: () => ({ message: "mode must be 'merge' or 'replace'" }),
  }),
  regenerateEmbeddings: z.boolean().optional(),
  data: z.object({
    version: z.string(),
    userId: z.string(),
    exportedAt: z.string(),
    filter: z.record(z.unknown()).optional(),
    count: z.number(),
    memories: z.array(z.record(z.unknown())),
  }),
});

/**
 * Zod schema for import validation request
 * Requirements: 6.3
 */
const importValidateRequestSchema = z.object({
  data: z.record(z.unknown()),
});

// ============================================================================
// Response Types
// ============================================================================

/**
 * Exported memory item in response
 * Requirements: 6.1
 */
interface ExportedMemoryItem {
  id: string;
  content: string;
  primarySector: string;
  metadata: {
    keywords?: string[];
    tags?: string[];
    category?: string;
    context?: string;
    importance?: number;
    isAtomic?: boolean;
    parentId?: string;
  };
  embeddings: Record<string, number[]> | null;
  tags: string[];
  createdAt: string;
  lastAccessed: string;
  strength: number;
  salience: number;
  accessCount: number;
  links: Array<{ targetId: string; weight: number; linkType: string }>;
}

/**
 * Response type for export endpoint
 * Requirements: 6.1, 6.2
 */
interface ExportApiResponse {
  memories: ExportedMemoryItem[];
  exportedAt: string;
  version: string;
  userId: string;
  filter: {
    dateRange?: { start: string; end: string };
    sectors?: string[];
    tags?: string[];
    minStrength?: number;
  };
  count: number;
}

/**
 * Response type for import endpoint
 * Requirements: 6.4, 6.5, 6.6
 */
interface ImportApiResponse {
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{ memoryId: string; error: string }>;
  timestamp: string;
}

/**
 * Response type for import validation endpoint
 * Requirements: 6.3
 */
interface ImportValidateApiResponse {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Response Converters
// ============================================================================

/** Convert ExportResult to API response format */
function toExportApiResponse(result: ExportResult): ExportApiResponse {
  return {
    memories: result.memories.map((m: ExportedMemory) => ({
      id: m.id,
      content: m.content,
      primarySector: m.primarySector,
      metadata: m.metadata,
      embeddings: m.embeddings as Record<string, number[]> | null,
      tags: m.tags,
      createdAt: m.createdAt,
      lastAccessed: m.lastAccessed,
      strength: m.strength,
      salience: m.salience,
      accessCount: m.accessCount,
      links: m.links,
    })),
    exportedAt: result.exportedAt,
    version: result.version,
    userId: result.userId,
    filter: {
      dateRange: result.filter.dateRange
        ? {
            start: result.filter.dateRange.start.toISOString(),
            end: result.filter.dateRange.end.toISOString(),
          }
        : undefined,
      sectors: result.filter.sectors,
      tags: result.filter.tags,
      minStrength: result.filter.minStrength,
    },
    count: result.count,
  };
}

/** Convert ImportResult to API response format */
function toImportApiResponse(result: ImportResult): ImportApiResponse {
  return {
    importedCount: result.importedCount,
    skippedCount: result.skippedCount,
    errorCount: result.errorCount,
    errors: result.errors,
    timestamp: result.timestamp.toISOString(),
  };
}

/** Convert ValidationResult to API response format */
function toValidateApiResponse(result: ValidationResult): ImportValidateApiResponse {
  return {
    valid: result.valid,
    errors: result.errors,
  };
}

// ============================================================================
// Export Handler
// ============================================================================

/**
 * Handler for GET /api/v1/memory/export
 * Requirements: 6.1, 6.2
 *
 * Exports memories to JSON format with all metadata and embeddings.
 * Supports filtering by date range, sector, and tags.
 */
function createExportHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = exportRequestSchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId, startDate, endDate, sectors, tags, minStrength } = parseResult.data;
    const db = getDbConnection(cognitiveCore);
    const embeddingStorage = getEmbeddingStorage(cognitiveCore);
    const exportImportService = createExportImportService(db, embeddingStorage);

    // Build filter from query parameters
    const filter: ExportFilter = {};

    if (startDate || endDate) {
      filter.dateRange = {
        start: startDate ? new Date(startDate) : new Date(0),
        end: endDate ? new Date(endDate) : new Date(),
      };
    }

    if (sectors && sectors.length > 0) {
      filter.sectors = sectors as MemorySectorType[];
    }

    if (tags && tags.length > 0) {
      filter.tags = tags;
    }

    if (minStrength !== undefined) {
      filter.minStrength = minStrength;
    }

    try {
      const result = await exportImportService.exportMemories(userId, filter);
      const responseData = toExportApiResponse(result);
      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof ExportImportError) {
        throw new ValidationApiError({ userId: error.message });
      }
      throw error;
    }
  });
}

// ============================================================================
// Import Handler
// ============================================================================

/**
 * Handler for POST /api/v1/memory/import
 * Requirements: 6.3, 6.4, 6.5, 6.6
 *
 * Imports memories from JSON data with validation.
 * Supports merge mode (update existing) and replace mode (overwrite).
 * Handles duplicate detection by ID.
 */
function createImportHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = importRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId, mode, regenerateEmbeddings, data } = parseResult.data;
    const db = getDbConnection(cognitiveCore);
    const embeddingStorage = getEmbeddingStorage(cognitiveCore);
    const exportImportService = createExportImportService(db, embeddingStorage);

    // Build import options
    const options: ImportOptions = {
      mode,
      regenerateEmbeddings: regenerateEmbeddings ?? false,
    };

    // Convert data to ExportResult format
    const exportData: ExportResult = {
      version: data.version,
      userId: data.userId,
      exportedAt: data.exportedAt,
      filter: (data.filter as ExportFilter) ?? {},
      count: data.count,
      memories: data.memories as unknown as ExportResult["memories"],
    };

    try {
      const result = await exportImportService.importMemories(userId, exportData, options);
      const responseData = toImportApiResponse(result);
      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof ExportImportError) {
        if (error.code === "VALIDATION_ERROR") {
          throw new ValidationApiError({
            data: error.message,
            details: JSON.stringify(error.context?.errors ?? []),
          });
        }
        throw new ValidationApiError({ userId: error.message });
      }
      throw error;
    }
  });
}

// ============================================================================
// Import Validation Handler
// ============================================================================

/**
 * Handler for POST /api/v1/memory/import/validate
 * Requirements: 6.3
 *
 * Validates import data against the memory schema before insertion.
 * Returns validation result with any errors found.
 */
function createImportValidateHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = importValidateRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { data } = parseResult.data;
    const db = getDbConnection(cognitiveCore);
    const embeddingStorage = getEmbeddingStorage(cognitiveCore);
    const exportImportService = createExportImportService(db, embeddingStorage);

    try {
      const result = await exportImportService.validateImport(data);
      const responseData = toValidateApiResponse(result);
      res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
    } catch (error) {
      if (error instanceof ExportImportError) {
        throw new ValidationApiError({ data: error.message });
      }
      throw error;
    }
  });
}

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Create memory export/import routes
 * Requirements: 6.1-6.6
 *
 * @param cognitiveCore - Shared cognitive core instance
 * @returns Express router with memory export/import endpoints
 */
export function createMemoryExportImportRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // GET /api/v1/memory/export - Export memories to JSON
  // Requirements: 6.1, 6.2
  router.get("/export", createExportHandler(cognitiveCore));

  // POST /api/v1/memory/import - Import memories from JSON
  // Requirements: 6.3, 6.4, 6.5, 6.6
  router.post("/import", createImportHandler(cognitiveCore));

  // POST /api/v1/memory/import/validate - Validate import data
  // Requirements: 6.3
  router.post("/import/validate", createImportValidateHandler(cognitiveCore));

  return router;
}
