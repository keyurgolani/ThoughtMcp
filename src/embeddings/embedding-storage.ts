/**
 * Embedding Storage
 *
 * Manages storage and retrieval of five-sector embeddings using PostgreSQL with pgvector.
 * Provides vector similarity search with IVFFlat indexes for fast approximate nearest neighbor search.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import type { Pool, PoolClient } from "pg";
import type { DatabaseConnectionManager } from "../database/connection-manager";
import {
  MemorySector,
  type SectorEmbeddings,
  type SectorWeights,
  type SimilarityResult,
} from "./types";

/**
 * Embedding storage and retrieval system
 */
export class EmbeddingStorage {
  private dbManager: DatabaseConnectionManager;

  constructor(dbManager: DatabaseConnectionManager) {
    this.dbManager = dbManager;
  }

  /**
   * Store all five sector embeddings for a memory
   */
  async storeEmbeddings(
    memoryId: string,
    embeddings: SectorEmbeddings,
    modelName: string,
    client?: PoolClient | Pool
  ): Promise<void> {
    const queryClient = client ?? this.dbManager.pool;

    if (!queryClient) {
      throw new Error("Database not connected");
    }

    const sectors: MemorySector[] = [
      MemorySector.Episodic,
      MemorySector.Semantic,
      MemorySector.Procedural,
      MemorySector.Emotional,
      MemorySector.Reflective,
    ];

    // Validate all embeddings have same dimension
    const dimensions = new Set([
      embeddings.episodic.length,
      embeddings.semantic.length,
      embeddings.procedural.length,
      embeddings.emotional.length,
      embeddings.reflective.length,
    ]);

    if (dimensions.size !== 1) {
      throw new Error("All embeddings must have the same dimension");
    }

    const dimension = embeddings.episodic.length;

    // Store each sector embedding
    for (const sector of sectors) {
      const embedding = embeddings[sector];

      await queryClient.query(
        `INSERT INTO memory_embeddings (memory_id, sector, embedding, dimension, model)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (memory_id, sector)
         DO UPDATE SET embedding = $3, dimension = $4, model = $5, created_at = CURRENT_TIMESTAMP`,
        [memoryId, sector, JSON.stringify(embedding), dimension, modelName]
      );
    }
  }

  /**
   * Retrieve embeddings for a memory (all sectors or specific sectors)
   */
  async retrieveEmbeddings(memoryId: string, sectors?: MemorySector[]): Promise<SectorEmbeddings> {
    if (!this.dbManager.pool) {
      throw new Error("Database not connected");
    }

    const sectorsToRetrieve = sectors ?? [
      MemorySector.Episodic,
      MemorySector.Semantic,
      MemorySector.Procedural,
      MemorySector.Emotional,
      MemorySector.Reflective,
    ];

    const result = await this.dbManager.pool.query(
      `SELECT sector, embedding FROM memory_embeddings
       WHERE memory_id = $1 AND sector = ANY($2)`,
      [memoryId, sectorsToRetrieve]
    );

    const embeddings: Partial<SectorEmbeddings> = {};

    for (const row of result.rows) {
      const sector = row.sector as MemorySector;
      embeddings[sector] = this.parseEmbedding(row.embedding);
    }

    // Fill in missing sectors with empty arrays
    for (const sector of sectorsToRetrieve) {
      embeddings[sector] ??= [];
    }

    return embeddings as SectorEmbeddings;
  }

  /**
   * Update specific sector embeddings for a memory
   */
  async updateEmbeddings(
    memoryId: string,
    embeddings: Partial<SectorEmbeddings>,
    modelName: string
  ): Promise<void> {
    if (!this.dbManager.pool) {
      throw new Error("Database not connected");
    }

    for (const [sector, embedding] of Object.entries(embeddings)) {
      if (embedding && embedding.length > 0) {
        await this.dbManager.pool.query(
          `UPDATE memory_embeddings
           SET embedding = $1, dimension = $2, model = $3, created_at = CURRENT_TIMESTAMP
           WHERE memory_id = $4 AND sector = $5`,
          [JSON.stringify(embedding), embedding.length, modelName, memoryId, sector]
        );
      }
    }
  }

  /**
   * Delete all embeddings for a memory
   */
  async deleteEmbeddings(memoryId: string): Promise<void> {
    if (!this.dbManager.pool) {
      throw new Error("Database not connected");
    }

    await this.dbManager.pool.query("DELETE FROM memory_embeddings WHERE memory_id = $1", [
      memoryId,
    ]);
  }

  /**
   * Perform vector similarity search in a specific sector
   */
  async vectorSimilaritySearch(
    queryEmbedding: number[],
    sector: MemorySector,
    limit: number,
    threshold = 0.0
  ): Promise<SimilarityResult[]> {
    if (!this.dbManager.pool) {
      throw new Error("Database not connected");
    }

    // Use pgvector's cosine similarity operator (<=>)
    // Lower distance = higher similarity, so we convert: similarity = 1 - distance
    // Note: This searches across all users - filtering by userId should be done at a higher level
    const result = await this.dbManager.pool.query(
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
  }

  /**
   * Perform multi-sector search with weighted composite scoring
   */
  async multiSectorSearch(
    queryEmbeddings: Partial<SectorEmbeddings>,
    weights: SectorWeights,
    limit: number
  ): Promise<SimilarityResult[]> {
    if (!this.dbManager.pool) {
      throw new Error("Database not connected");
    }

    // Build query for each sector
    const sectorQueries: string[] = [];
    const queryParams: string[] = [];
    let paramIndex = 1;

    for (const [sector, embedding] of Object.entries(queryEmbeddings)) {
      if (embedding && embedding.length > 0) {
        const weight = weights[sector as MemorySector] ?? 0;
        if (weight > 0) {
          sectorQueries.push(`
            SELECT
              memory_id,
              '${sector}' as sector,
              ${weight} * (1 - (embedding <=> $${paramIndex}::vector)) as weighted_similarity
            FROM memory_embeddings
            WHERE sector = '${sector}'
          `);
          queryParams.push(JSON.stringify(embedding));
          paramIndex++;
        }
      }
    }

    if (sectorQueries.length === 0) {
      return [];
    }

    // Combine all sector queries and aggregate by memory_id
    const combinedQuery = `
      WITH sector_similarities AS (
        ${sectorQueries.join(" UNION ALL ")}
      )
      SELECT
        memory_id,
        SUM(weighted_similarity) as similarity
      FROM sector_similarities
      GROUP BY memory_id
      ORDER BY similarity DESC
      LIMIT $${paramIndex}
    `;

    queryParams.push(String(limit));

    const result = await this.dbManager.pool.query(combinedQuery, queryParams);

    return result.rows.map((row) => ({
      memoryId: row.memory_id,
      sector: "composite" as MemorySector,
      similarity: parseFloat(row.similarity),
    }));
  }

  /**
   * Parse embedding from database format
   */
  private parseEmbedding(embeddingData: unknown): number[] {
    if (typeof embeddingData === "string") {
      // JSON string format
      return JSON.parse(embeddingData);
    } else if (Array.isArray(embeddingData)) {
      // Already an array
      return embeddingData;
    } else {
      throw new Error("Invalid embedding format");
    }
  }
}
