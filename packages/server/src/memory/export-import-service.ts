/**
 * Export/Import Service
 *
 * Manages exporting memories to JSON format and importing from JSON.
 * Supports filtering by date range, sector, and tags.
 *
 * Requirements: 6.1 (export to JSON with metadata and embeddings)
 *               6.2 (filter exports by date range, sector, tags)
 */

import type { PoolClient } from "pg";
import { DatabaseConnectionManager } from "../database/connection-manager";
import { EmbeddingStorage } from "../embeddings/embedding-storage";
import type { SectorEmbeddings } from "../embeddings/types";
import { Logger } from "../utils/logger";
import type { MemoryMetadata, MemorySectorType } from "./types";

/**
 * Filter options for memory export
 */
export interface ExportFilter {
  /** Date range filter */
  dateRange?: { start: Date; end: Date };
  /** Filter by memory sectors */
  sectors?: MemorySectorType[];
  /** Filter by tags */
  tags?: string[];
  /** Minimum strength threshold */
  minStrength?: number;
}

/**
 * Exported memory format with all data
 */
export interface ExportedMemory {
  id: string;
  content: string;
  primarySector: MemorySectorType;
  metadata: MemoryMetadata;
  embeddings: SectorEmbeddings | null;
  tags: string[];
  createdAt: string;
  lastAccessed: string;
  strength: number;
  salience: number;
  accessCount: number;
  links: Array<{ targetId: string; weight: number; linkType: string }>;
}

/**
 * Result of export operation
 */
export interface ExportResult {
  memories: ExportedMemory[];
  exportedAt: string;
  version: string;
  userId: string;
  filter: ExportFilter;
  count: number;
}

/**
 * Options for import operation
 */
export interface ImportOptions {
  /** Import mode: merge (update existing) or replace (overwrite) */
  mode: "merge" | "replace";
  /** Whether to regenerate embeddings on import */
  regenerateEmbeddings: boolean;
}

/**
 * Result of import operation
 */
export interface ImportResult {
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{ memoryId: string; error: string }>;
  timestamp: Date;
}

/**
 * Validation result for import data
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Error class for export/import operations
 */
export class ExportImportError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ExportImportError";
  }
}

/** Current export format version */
const EXPORT_VERSION = "1.0.0";

/**
 * Export/Import Service
 *
 * Manages exporting and importing memories with full data preservation.
 */
export class ExportImportService {
  constructor(
    private db: DatabaseConnectionManager,
    private embeddingStorage: EmbeddingStorage
  ) {}

  /**
   * Export memories to JSON format
   *
   * Requirements: 6.1, 6.2
   * - Export memories to JSON format with all metadata and embeddings
   * - Support filtering by date range, sector, and tags
   *
   * @param userId - User ID for filtering
   * @param filter - Optional filter criteria
   * @returns Export result with memories and metadata
   */
  async exportMemories(userId: string, filter: ExportFilter = {}): Promise<ExportResult> {
    if (!userId) {
      throw new ExportImportError("userId is required", "INVALID_INPUT");
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Build query with filters
      const { sql, params } = this.buildExportQuery(userId, filter);

      const result = await client.query(sql, params);

      // Process each memory and load embeddings
      const exportedMemories: ExportedMemory[] = [];

      for (const row of result.rows) {
        const memory = await this.processMemoryRow(row, client);
        exportedMemories.push(memory);
      }

      const exportResult: ExportResult = {
        memories: exportedMemories,
        exportedAt: new Date().toISOString(),
        version: EXPORT_VERSION,
        userId,
        filter,
        count: exportedMemories.length,
      };

      Logger.info("Export memories completed", {
        userId,
        count: exportedMemories.length,
        filter,
      });

      return exportResult;
    } catch (error) {
      if (error instanceof ExportImportError) {
        throw error;
      }

      Logger.error("Failed to export memories:", error);
      throw new ExportImportError("Failed to export memories", "EXPORT_ERROR", {
        userId,
        filter,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Build SQL query for export with filters
   */
  private buildExportQuery(
    userId: string,
    filter: ExportFilter
  ): { sql: string; params: unknown[] } {
    const conditions: string[] = ["m.user_id = $1"];
    const params: unknown[] = [userId];
    let paramIndex = 2;

    // Date range filter
    if (filter.dateRange?.start) {
      conditions.push(`m.created_at >= $${paramIndex}`);
      params.push(filter.dateRange.start);
      paramIndex++;
    }

    if (filter.dateRange?.end) {
      conditions.push(`m.created_at <= $${paramIndex}`);
      params.push(filter.dateRange.end);
      paramIndex++;
    }

    // Sector filter
    if (filter.sectors && filter.sectors.length > 0) {
      conditions.push(`m.primary_sector = ANY($${paramIndex})`);
      params.push(filter.sectors);
      paramIndex++;
    }

    // Tags filter
    if (filter.tags && filter.tags.length > 0) {
      conditions.push(`m.tags && $${paramIndex}`);
      params.push(filter.tags);
      paramIndex++;
    }

    // Minimum strength filter
    if (filter.minStrength !== undefined) {
      conditions.push(`m.strength >= $${paramIndex}`);
      params.push(filter.minStrength);
      paramIndex++;
    }

    // Exclude archived memories from export
    conditions.push("(m.is_archived IS NULL OR m.is_archived = FALSE)");

    const sql = `
      SELECT
        m.id,
        m.content,
        m.primary_sector,
        m.created_at,
        m.last_accessed,
        m.strength,
        m.salience,
        m.access_count,
        m.tags,
        md.keywords,
        md.tags as metadata_tags,
        md.category,
        md.context,
        md.importance,
        md.is_atomic,
        md.parent_id
      FROM memories m
      LEFT JOIN memory_metadata md ON m.id = md.memory_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY m.created_at DESC
    `;

    return { sql, params };
  }

  /**
   * Process a memory row and load related data
   */
  private async processMemoryRow(
    row: Record<string, unknown>,
    client: PoolClient
  ): Promise<ExportedMemory> {
    const memoryId = row.id as string;

    // Load embeddings
    let embeddings: SectorEmbeddings | null = null;
    try {
      embeddings = await this.embeddingStorage.retrieveEmbeddings(memoryId);
      // Check if embeddings are empty (all sectors have empty arrays)
      const hasEmbeddings = Object.values(embeddings).some(
        (arr) => Array.isArray(arr) && arr.length > 0
      );
      if (!hasEmbeddings) {
        embeddings = null;
      }
    } catch (error) {
      Logger.warn(`Failed to load embeddings for memory ${memoryId}:`, error);
    }

    // Load links
    const linksResult = await client.query(
      `SELECT target_id, weight, link_type
       FROM memory_links
       WHERE source_id = $1`,
      [memoryId]
    );

    const links = linksResult.rows.map((linkRow) => ({
      targetId: linkRow.target_id as string,
      weight: linkRow.weight as number,
      linkType: linkRow.link_type as string,
    }));

    // Build metadata
    const metadata: MemoryMetadata = {
      keywords: (row.keywords as string[]) ?? [],
      tags: (row.metadata_tags as string[]) ?? [],
      category: (row.category as string) ?? undefined,
      context: (row.context as string) ?? undefined,
      importance: (row.importance as number) ?? undefined,
      isAtomic: (row.is_atomic as boolean) ?? undefined,
      parentId: (row.parent_id as string) ?? undefined,
    };

    return {
      id: memoryId,
      content: row.content as string,
      primarySector: row.primary_sector as MemorySectorType,
      metadata,
      embeddings,
      tags: (row.tags as string[]) ?? [],
      createdAt: new Date(row.created_at as string).toISOString(),
      lastAccessed: new Date(row.last_accessed as string).toISOString(),
      strength: row.strength as number,
      salience: row.salience as number,
      accessCount: row.access_count as number,
      links,
    };
  }

  /**
   * Validate import data against schema
   *
   * Requirements: 6.3
   * - Validate imported data against the memory schema before insertion
   *
   * @param data - Data to validate
   * @returns Validation result with errors if any
   */
  async validateImport(data: unknown): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check if data is an object
    if (!data || typeof data !== "object") {
      return { valid: false, errors: ["Import data must be an object"] };
    }

    const exportData = data as Record<string, unknown>;

    // Check required fields
    if (!exportData.version) {
      errors.push("Missing required field: version");
    }

    if (!exportData.userId) {
      errors.push("Missing required field: userId");
    }

    if (!Array.isArray(exportData.memories)) {
      errors.push("Missing or invalid field: memories (must be an array)");
      return { valid: false, errors };
    }

    // Validate each memory
    const memories = exportData.memories as unknown[];
    for (let i = 0; i < memories.length; i++) {
      const memoryErrors = this.validateMemory(memories[i], i);
      errors.push(...memoryErrors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a single memory object
   */
  private validateMemory(memory: unknown, index: number): string[] {
    const errors: string[] = [];
    const prefix = `memories[${index}]`;

    if (!memory || typeof memory !== "object") {
      return [`${prefix}: must be an object`];
    }

    const mem = memory as Record<string, unknown>;

    // Validate required fields
    this.validateRequiredFields(mem, prefix, errors);

    // Validate optional fields
    this.validateOptionalFields(mem, prefix, errors);

    return errors;
  }

  /**
   * Validate required memory fields
   */
  private validateRequiredFields(
    mem: Record<string, unknown>,
    prefix: string,
    errors: string[]
  ): void {
    if (!mem.id || typeof mem.id !== "string") {
      errors.push(`${prefix}.id: required and must be a string`);
    }

    if (!mem.content || typeof mem.content !== "string") {
      errors.push(`${prefix}.content: required and must be a string`);
    }

    this.validatePrimarySector(mem, prefix, errors);
  }

  /**
   * Validate primarySector field
   */
  private validatePrimarySector(
    mem: Record<string, unknown>,
    prefix: string,
    errors: string[]
  ): void {
    if (!mem.primarySector || typeof mem.primarySector !== "string") {
      errors.push(`${prefix}.primarySector: required and must be a string`);
      return;
    }

    const validSectors = ["episodic", "semantic", "procedural", "emotional", "reflective"];
    if (!validSectors.includes(mem.primarySector)) {
      errors.push(`${prefix}.primarySector: must be one of ${validSectors.join(", ")}`);
    }
  }

  /**
   * Validate optional memory fields
   */
  private validateOptionalFields(
    mem: Record<string, unknown>,
    prefix: string,
    errors: string[]
  ): void {
    if (mem.strength !== undefined && typeof mem.strength !== "number") {
      errors.push(`${prefix}.strength: must be a number`);
    }

    if (mem.salience !== undefined && typeof mem.salience !== "number") {
      errors.push(`${prefix}.salience: must be a number`);
    }

    if (mem.tags !== undefined && !Array.isArray(mem.tags)) {
      errors.push(`${prefix}.tags: must be an array`);
    }
  }

  /**
   * Import memories from JSON data
   *
   * Requirements: 6.4, 6.5, 6.6
   * - Detect and handle duplicate memories by ID
   * - Support merge mode (update existing) and replace mode (overwrite)
   * - Return a summary with counts and any errors
   *
   * @param userId - User ID for ownership
   * @param data - Export data to import
   * @param options - Import options
   * @returns Import result with counts and errors
   */
  async importMemories(
    userId: string,
    data: ExportResult,
    options: ImportOptions
  ): Promise<ImportResult> {
    if (!userId) {
      throw new ExportImportError("userId is required", "INVALID_INPUT");
    }

    // Validate data first
    const validation = await this.validateImport(data);
    if (!validation.valid) {
      throw new ExportImportError("Invalid import data", "VALIDATION_ERROR", {
        errors: validation.errors,
      });
    }

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ memoryId: string; error: string }> = [];

    let client: PoolClient | null = null;

    try {
      client = await this.db.beginTransaction();

      for (const memory of data.memories) {
        try {
          const result = await this.importSingleMemory(client, userId, memory, options);
          if (result.imported) {
            importedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          errorCount++;
          errors.push({
            memoryId: memory.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      await this.db.commitTransaction(client);
      client = null;

      Logger.info("Import memories completed", {
        userId,
        importedCount,
        skippedCount,
        errorCount,
      });

      return {
        importedCount,
        skippedCount,
        errorCount,
        errors,
        timestamp: new Date(),
      };
    } catch (error) {
      if (client) {
        try {
          await this.db.rollbackTransaction(client);
        } catch (rollbackError) {
          Logger.error("Failed to rollback import transaction:", rollbackError);
        }
      }

      if (error instanceof ExportImportError) {
        throw error;
      }

      Logger.error("Failed to import memories:", error);
      throw new ExportImportError("Failed to import memories", "IMPORT_ERROR", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Import a single memory
   */
  private async importSingleMemory(
    client: PoolClient,
    userId: string,
    memory: ExportedMemory,
    options: ImportOptions
  ): Promise<{ imported: boolean }> {
    // Check if memory already exists
    const existsResult = await client.query("SELECT id FROM memories WHERE id = $1", [memory.id]);

    const exists = existsResult.rows.length > 0;

    if (exists) {
      if (options.mode === "merge") {
        // Update existing memory
        await this.updateExistingMemory(client, userId, memory);
        return { imported: true };
      } else {
        // Replace mode - delete and re-insert
        await client.query("DELETE FROM memories WHERE id = $1 AND user_id = $2", [
          memory.id,
          userId,
        ]);
      }
    }

    // Insert new memory
    await this.insertImportedMemory(client, userId, memory);

    // Store embeddings if available and not regenerating
    if (memory.embeddings && !options.regenerateEmbeddings) {
      await this.embeddingStorage.storeEmbeddings(memory.id, memory.embeddings, "imported", client);
    }

    return { imported: true };
  }

  /**
   * Update an existing memory during merge import
   */
  private async updateExistingMemory(
    client: PoolClient,
    userId: string,
    memory: ExportedMemory
  ): Promise<void> {
    await client.query(
      `UPDATE memories
       SET content = $1,
           primary_sector = $2,
           strength = $3,
           salience = $4,
           tags = $5
       WHERE id = $6 AND user_id = $7`,
      [
        memory.content,
        memory.primarySector,
        memory.strength,
        memory.salience,
        memory.tags,
        memory.id,
        userId,
      ]
    );

    // Update metadata
    await client.query(
      `UPDATE memory_metadata
       SET keywords = $1,
           tags = $2,
           category = $3,
           context = $4,
           importance = $5
       WHERE memory_id = $6`,
      [
        memory.metadata.keywords ?? [],
        memory.metadata.tags ?? [],
        memory.metadata.category ?? null,
        memory.metadata.context ?? null,
        memory.metadata.importance ?? 0.5,
        memory.id,
      ]
    );
  }

  /**
   * Insert a new memory during import
   */
  private async insertImportedMemory(
    client: PoolClient,
    userId: string,
    memory: ExportedMemory
  ): Promise<void> {
    const createdAt = new Date(memory.createdAt);
    const lastAccessed = new Date(memory.lastAccessed);

    // Insert memory record
    await client.query(
      `INSERT INTO memories (
        id, content, created_at, last_accessed, access_count,
        salience, decay_rate, strength, user_id, session_id,
        primary_sector, embedding_status, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        memory.id,
        memory.content,
        createdAt,
        lastAccessed,
        memory.accessCount,
        memory.salience,
        0.02, // Default decay rate
        memory.strength,
        userId,
        "imported", // Session ID for imported memories
        memory.primarySector,
        memory.embeddings ? "complete" : "pending",
        memory.tags,
      ]
    );

    // Insert metadata
    await client.query(
      `INSERT INTO memory_metadata (
        memory_id, keywords, tags, category, context, importance, is_atomic, parent_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        memory.id,
        memory.metadata.keywords ?? [],
        memory.metadata.tags ?? [],
        memory.metadata.category ?? null,
        memory.metadata.context ?? null,
        memory.metadata.importance ?? 0.5,
        memory.metadata.isAtomic ?? true,
        memory.metadata.parentId ?? null,
      ]
    );

    // Insert links
    for (const link of memory.links) {
      await client.query(
        `INSERT INTO memory_links (source_id, target_id, link_type, weight)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (source_id, target_id) DO NOTHING`,
        [memory.id, link.targetId, link.linkType, link.weight]
      );
    }
  }
}

/**
 * Factory function to create ExportImportService
 */
export function createExportImportService(
  db: DatabaseConnectionManager,
  embeddingStorage: EmbeddingStorage
): ExportImportService {
  return new ExportImportService(db, embeddingStorage);
}
