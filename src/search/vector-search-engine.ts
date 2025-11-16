/**
 * Vector Search Engine
 *
 * Provides vector similarity search using pgvector with sector-specific embeddings.
 * Supports cosine similarity search with IVFFlat indexes for fast approximate nearest neighbor search.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { DatabaseConnectionManager } from "../database/connection-manager";
import { MemorySector, type SimilarityResult } from "../embeddings/types";

/**
 * Error class for vector search operations
 */
export class VectorSearchError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = "VectorSearchError";
  }
}

/**
 * Vector search engine using pgvector
 */
export class VectorSearchEngine {
  private readonly db: DatabaseConnectionManager;

  constructor(db: DatabaseConnectionManager) {
    this.db = db;
  }

  /**
   * Search by embedding vector in a specific sector
   *
   * @param queryEmbedding - Query embedding vector
   * @param sector - Memory sector to search in
   * @param limit - Maximum number of results
   * @param threshold - Minimum similarity threshold (0-1, default 0.0)
   * @returns Array of similarity results ordered by similarity (descending)
   * @throws VectorSearchError if search fails
   */
  async searchByEmbedding(
    queryEmbedding: number[],
    sector: MemorySector,
    limit: number,
    threshold = 0.0
  ): Promise<SimilarityResult[]> {
    // Validate inputs
    this.validateEmbedding(queryEmbedding);
    this.validateLimit(limit);
    this.validateThreshold(threshold);

    if (!this.db.pool) {
      throw new VectorSearchError("Database not connected");
    }

    try {
      // Use pgvector's cosine similarity operator (<=>)
      // Lower distance = higher similarity, so we convert: similarity = 1 - distance
      const result = await this.db.pool.query(
        `SELECT
           memory_id,
           sector,
           1 - (embedding <=> $1::vector) as similarity
         FROM memory_embeddings
         WHERE sector = $2
           AND 1 - (embedding <=> $1::vector) >= $3
         ORDER BY embedding <=> $1::vector
         LIMIT $4`,
        [JSON.stringify(queryEmbedding), sector, threshold, limit]
      );

      return result.rows.map((row) => ({
        memoryId: row.memory_id,
        sector: row.sector as MemorySector,
        similarity: parseFloat(row.similarity),
      }));
    } catch (err) {
      throw new VectorSearchError(
        `Vector search failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Search using a memory's embedding to find similar memories
   *
   * @param memoryId - Source memory ID
   * @param sector - Memory sector to search in
   * @param limit - Maximum number of results
   * @param threshold - Minimum similarity threshold (0-1, default 0.0)
   * @returns Array of similarity results (excluding source memory)
   * @throws VectorSearchError if search fails or memory has no embedding
   */
  async searchByMemoryId(
    memoryId: string,
    sector: MemorySector,
    limit: number,
    threshold = 0.0
  ): Promise<SimilarityResult[]> {
    // Validate inputs
    this.validateMemoryId(memoryId);
    this.validateLimit(limit);
    this.validateThreshold(threshold);

    if (!this.db.pool) {
      throw new VectorSearchError("Database not connected");
    }

    try {
      // First, retrieve the memory's embedding
      const embeddingResult = await this.db.pool.query(
        `SELECT embedding FROM memory_embeddings
         WHERE memory_id = $1 AND sector = $2`,
        [memoryId, sector]
      );

      if (embeddingResult.rows.length === 0) {
        throw new VectorSearchError(
          `No embedding found for memory ${memoryId} in sector ${sector}`
        );
      }

      const embedding = this.parseEmbedding(embeddingResult.rows[0].embedding);

      // Search for similar memories, excluding the source memory
      const result = await this.db.pool.query(
        `SELECT
           memory_id,
           sector,
           1 - (embedding <=> $1::vector) as similarity
         FROM memory_embeddings
         WHERE sector = $2
           AND 1 - (embedding <=> $1::vector) >= $3
           AND memory_id != $5
         ORDER BY embedding <=> $1::vector
         LIMIT $4`,
        [JSON.stringify(embedding), sector, threshold, limit, memoryId]
      );

      return result.rows.map((row) => ({
        memoryId: row.memory_id,
        sector: row.sector as MemorySector,
        similarity: parseFloat(row.similarity),
      }));
    } catch (err) {
      if (err instanceof VectorSearchError) {
        throw err;
      }

      throw new VectorSearchError(
        `Vector search by memory ID failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Validate embedding vector
   */
  private validateEmbedding(embedding: number[]): void {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new VectorSearchError("Embedding must be a non-empty array");
    }
  }

  /**
   * Validate memory ID
   */
  private validateMemoryId(memoryId: string): void {
    if (!memoryId || typeof memoryId !== "string") {
      throw new VectorSearchError("Memory ID must be a non-empty string");
    }
  }

  /**
   * Validate result limit
   */
  private validateLimit(limit: number): void {
    if (limit < 1) {
      throw new VectorSearchError("Limit must be at least 1");
    }
  }

  /**
   * Validate similarity threshold
   */
  private validateThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new VectorSearchError("Threshold must be between 0 and 1");
    }
  }

  /**
   * Parse embedding from database format
   */
  private parseEmbedding(embeddingData: unknown): number[] {
    if (typeof embeddingData === "string") {
      return JSON.parse(embeddingData);
    } else if (Array.isArray(embeddingData)) {
      return embeddingData;
    } else {
      throw new VectorSearchError("Invalid embedding format");
    }
  }
}
