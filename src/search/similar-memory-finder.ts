/**
 * Similar Memory Finder
 *
 * Multi-factor similarity calculation for finding similar memories.
 * Implements weighted composite scoring using:
 * - Keyword overlap (30% weight) - Jaccard similarity
 * - Tag similarity (25% weight) - Jaccard similarity
 * - Content similarity (20% weight) - Cosine similarity on embeddings
 * - Category matching (15% weight) - Binary match
 * - Temporal proximity (10% weight) - Exponential decay
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { DatabaseConnectionManager } from "../database/connection-manager";
import {
  DEFAULT_SIMILARITY_CONFIG,
  SimilarityCalculationError,
  type SimilarityConfig,
  type SimilarMemory,
} from "./types";

/**
 * Options for finding similar memories
 */
export interface FindSimilarOptions {
  /** Maximum number of results to return */
  limit?: number;

  /** Minimum similarity threshold (0-1) */
  minSimilarity?: number;

  /** Include detailed explanation for each result */
  includeExplanation?: boolean;
}

/**
 * Breakdown of similarity calculation for debugging
 */
export interface SimilarityBreakdown {
  keywordSimilarity: number;
  tagSimilarity: number;
  contentSimilarity: number;
  categorySimilarity: number;
  temporalProximity: number;
  keywordWeight: number;
  tagWeight: number;
  contentWeight: number;
  categoryWeight: number;
  temporalWeight: number;
  compositeSimilarity: number;
}

/**
 * Similar Memory Finder
 *
 * Calculates multi-factor similarity between memories and finds similar memories.
 */
export class SimilarMemoryFinder {
  private readonly db: DatabaseConnectionManager;
  private readonly config: SimilarityConfig;
  private readonly cache: Map<string, number>;

  constructor(db: DatabaseConnectionManager, config?: Partial<SimilarityConfig>) {
    this.db = db;
    this.config = { ...DEFAULT_SIMILARITY_CONFIG, ...config };
    this.cache = new Map();
  }

  /**
   * Calculate keyword overlap using Jaccard similarity
   * Jaccard = |A ∩ B| / |A ∪ B|
   */
  async calculateKeywordSimilarity(memoryId1: string, memoryId2: string): Promise<number> {
    const client = await this.db.getConnection();
    try {
      const result = await client.query(
        `SELECT
          m1.keywords as keywords1,
          m2.keywords as keywords2
         FROM memory_metadata m1
         CROSS JOIN memory_metadata m2
         WHERE m1.memory_id = $1 AND m2.memory_id = $2`,
        [memoryId1, memoryId2]
      );

      if (result.rows.length === 0) {
        return 0;
      }

      const keywords1 = result.rows[0].keywords1 ?? [];
      const keywords2 = result.rows[0].keywords2 ?? [];

      return this.calculateJaccardSimilarity(keywords1, keywords2);
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Calculate tag similarity using Jaccard similarity
   */
  async calculateTagSimilarity(memoryId1: string, memoryId2: string): Promise<number> {
    const client = await this.db.getConnection();
    try {
      const result = await client.query(
        `SELECT
          m1.tags as tags1,
          m2.tags as tags2
         FROM memory_metadata m1
         CROSS JOIN memory_metadata m2
         WHERE m1.memory_id = $1 AND m2.memory_id = $2`,
        [memoryId1, memoryId2]
      );

      if (result.rows.length === 0) {
        return 0;
      }

      const tags1 = result.rows[0].tags1 ?? [];
      const tags2 = result.rows[0].tags2 ?? [];

      return this.calculateJaccardSimilarity(tags1, tags2);
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Calculate content similarity using cosine similarity on embeddings
   */
  async calculateContentSimilarity(
    memoryId1: string,
    memoryId2: string,
    sector: string = "semantic"
  ): Promise<number> {
    const client = await this.db.getConnection();
    try {
      const result = await client.query(
        `SELECT
          e1.embedding as embedding1,
          e2.embedding as embedding2
         FROM memory_embeddings e1
         CROSS JOIN memory_embeddings e2
         WHERE e1.memory_id = $1 AND e1.sector = $3
           AND e2.memory_id = $2 AND e2.sector = $3`,
        [memoryId1, memoryId2, sector]
      );

      if (result.rows.length === 0) {
        // No embeddings available
        return 0;
      }

      const embedding1 = result.rows[0].embedding1;
      const embedding2 = result.rows[0].embedding2;

      // Handle null embeddings
      if (!embedding1 || !embedding2) {
        return 0;
      }

      return this.calculateCosineSimilarity(embedding1, embedding2);
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Calculate category match (binary: 1.0 if same, 0.0 if different)
   */
  async calculateCategoryMatch(memoryId1: string, memoryId2: string): Promise<number> {
    const client = await this.db.getConnection();
    try {
      const result = await client.query(
        `SELECT
          m1.category as category1,
          m2.category as category2
         FROM memory_metadata m1
         CROSS JOIN memory_metadata m2
         WHERE m1.memory_id = $1 AND m2.memory_id = $2`,
        [memoryId1, memoryId2]
      );

      if (result.rows.length === 0) {
        return 0;
      }

      const category1 = result.rows[0].category1;
      const category2 = result.rows[0].category2;

      // Handle empty/null categories
      if (!category1 || !category2 || category1.trim() === "" || category2.trim() === "") {
        return 0;
      }

      // Case-insensitive comparison
      return category1.toLowerCase() === category2.toLowerCase() ? 1.0 : 0.0;
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Alias for calculateCategoryMatch (for backward compatibility)
   */
  async calculateCategorySimilarity(memoryId1: string, memoryId2: string): Promise<number> {
    return this.calculateCategoryMatch(memoryId1, memoryId2);
  }

  /**
   * Calculate temporal proximity using exponential decay
   * proximity = exp(-λ × |t1 - t2|)
   */
  async calculateTemporalProximity(memoryId1: string, memoryId2: string): Promise<number> {
    const client = await this.db.getConnection();
    try {
      const result = await client.query(
        `SELECT
          m1.created_at as created_at1,
          m2.created_at as created_at2
         FROM memories m1
         CROSS JOIN memories m2
         WHERE m1.id = $1 AND m2.id = $2`,
        [memoryId1, memoryId2]
      );

      if (result.rows.length === 0) {
        return 0;
      }

      const timestamp1 = result.rows[0].created_at1;
      const timestamp2 = result.rows[0].created_at2;

      // Handle null timestamps
      if (!timestamp1 || !timestamp2) {
        return 0;
      }

      const time1 = new Date(timestamp1).getTime();
      const time2 = new Date(timestamp2).getTime();

      // Handle invalid dates
      if (isNaN(time1) || isNaN(time2)) {
        return 0;
      }

      const timeDiffMs = Math.abs(time1 - time2);
      const timeDiffSeconds = timeDiffMs / 1000;

      // Exponential decay: exp(-λ × time_diff)
      // λ = 0.001 means half-life of ~693 seconds (~11.5 minutes)
      const proximity = Math.exp(-this.config.temporalDecayRate * timeDiffSeconds);

      return proximity;
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Calculate composite similarity score with all factors
   */
  async calculateCompositeSimilarity(memoryId1: string, memoryId2: string): Promise<number> {
    // Check cache
    const cacheKey = `${memoryId1}:${memoryId2}`;
    if (this.config.enableCache && this.cache.has(cacheKey)) {
      const cachedValue = this.cache.get(cacheKey);
      if (cachedValue !== undefined) {
        return cachedValue;
      }
    }

    try {
      // Validate memory IDs exist
      await this.validateMemoryIds(memoryId1, memoryId2);

      // Calculate all factors in parallel
      const [keyword, tag, content, category, temporal] = await Promise.all([
        this.calculateKeywordSimilarity(memoryId1, memoryId2),
        this.calculateTagSimilarity(memoryId1, memoryId2),
        this.calculateContentSimilarity(memoryId1, memoryId2),
        this.calculateCategoryMatch(memoryId1, memoryId2),
        this.calculateTemporalProximity(memoryId1, memoryId2),
      ]);

      // Apply weights: 30%, 25%, 20%, 15%, 10%
      const composite =
        keyword * this.config.keywordWeight +
        tag * this.config.tagWeight +
        content * this.config.contentWeight +
        category * this.config.categoryWeight +
        temporal * this.config.temporalWeight;

      // Cache result
      if (this.config.enableCache) {
        this.cache.set(cacheKey, composite);
      }

      return composite;
    } catch (error) {
      throw new SimilarityCalculationError(
        `Failed to calculate composite similarity between ${memoryId1} and ${memoryId2}`,
        memoryId1,
        memoryId2,
        error as Error
      );
    }
  }

  /**
   * Validate memory IDs exist
   */
  private async validateMemoryIds(memoryId1: string, memoryId2: string): Promise<void> {
    const client = await this.db.getConnection();
    try {
      const result = await client.query(
        `SELECT COUNT(*) as count FROM memories WHERE id IN ($1, $2)`,
        [memoryId1, memoryId2]
      );

      const count = parseInt(result.rows[0].count);
      if (count !== 2) {
        throw new Error(`One or both memory IDs not found: ${memoryId1}, ${memoryId2}`);
      }
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Get detailed breakdown of similarity calculation
   */
  async getSimilarityBreakdown(memoryId1: string, memoryId2: string): Promise<SimilarityBreakdown> {
    const [keyword, tag, content, category, temporal] = await Promise.all([
      this.calculateKeywordSimilarity(memoryId1, memoryId2),
      this.calculateTagSimilarity(memoryId1, memoryId2),
      this.calculateContentSimilarity(memoryId1, memoryId2),
      this.calculateCategoryMatch(memoryId1, memoryId2),
      this.calculateTemporalProximity(memoryId1, memoryId2),
    ]);

    const composite =
      keyword * this.config.keywordWeight +
      tag * this.config.tagWeight +
      content * this.config.contentWeight +
      category * this.config.categoryWeight +
      temporal * this.config.temporalWeight;

    return {
      keywordSimilarity: keyword,
      tagSimilarity: tag,
      contentSimilarity: content,
      categorySimilarity: category,
      temporalProximity: temporal,
      keywordWeight: this.config.keywordWeight,
      tagWeight: this.config.tagWeight,
      contentWeight: this.config.contentWeight,
      categoryWeight: this.config.categoryWeight,
      temporalWeight: this.config.temporalWeight,
      compositeSimilarity: composite,
    };
  }

  /**
   * Find similar memories ranked by composite similarity score
   */
  async findSimilar(queryMemoryId: string, options?: FindSimilarOptions): Promise<SimilarMemory[]> {
    const limit = options?.limit ?? this.config.defaultMaxResults;
    const minSimilarity = options?.minSimilarity ?? this.config.defaultThreshold;
    const includeExplanation = options?.includeExplanation ?? false;

    const client = await this.db.getConnection();
    try {
      // Get all candidate memories (excluding query memory)
      const candidatesResult = await client.query(
        `SELECT m.id, m.content, m.created_at, m.salience, m.strength
         FROM memories m
         WHERE m.id != $1
         LIMIT 1000`,
        [queryMemoryId]
      );

      const candidates = candidatesResult.rows;

      // Calculate similarity for each candidate
      const similarityPromises = candidates.map(async (candidate) => {
        const similarity = await this.calculateCompositeSimilarity(queryMemoryId, candidate.id);

        if (similarity < minSimilarity) {
          return null;
        }

        let explanation = "";
        if (includeExplanation) {
          const breakdown = await this.getSimilarityBreakdown(queryMemoryId, candidate.id);
          explanation = this.generateExplanation(breakdown);
        }

        return {
          memoryId: candidate.id,
          content: candidate.content,
          similarity: {
            overall: similarity,
            factors: {
              keywordOverlap: 0, // Will be filled if needed
              tagSimilarity: 0,
              contentSimilarity: 0,
              categoryMatch: 0,
              temporalProximity: 0,
            },
          },
          explanation,
          createdAt: candidate.created_at,
          salience: candidate.salience,
          strength: candidate.strength,
        } as SimilarMemory;
      });

      const results = (await Promise.all(similarityPromises)).filter(
        (result): result is SimilarMemory => result !== null
      );

      // Sort by similarity descending
      results.sort((a, b) => b.similarity.overall - a.similarity.overall);

      // Apply limit
      return results.slice(0, limit);
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Generate human-readable explanation of similarity
   */
  private generateExplanation(breakdown: SimilarityBreakdown): string {
    const parts: string[] = [];

    // Always include all factors for transparency
    parts.push(`keyword: ${(breakdown.keywordSimilarity * 100).toFixed(1)}%`);
    parts.push(`tag: ${(breakdown.tagSimilarity * 100).toFixed(1)}%`);
    parts.push(`content: ${(breakdown.contentSimilarity * 100).toFixed(1)}%`);
    parts.push(`category: ${(breakdown.categorySimilarity * 100).toFixed(1)}%`);
    parts.push(`temporal: ${(breakdown.temporalProximity * 100).toFixed(1)}%`);

    const overall = (breakdown.compositeSimilarity * 100).toFixed(1);
    return `Overall similarity: ${overall}% (${parts.join(", ")})`;
  }

  /**
   * Calculate Jaccard similarity between two arrays
   * Jaccard = |A ∩ B| / |A ∪ B|
   */
  private calculateJaccardSimilarity(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) {
      return 0;
    }

    if (arr1.length === 0 || arr2.length === 0) {
      return 0;
    }

    // Convert to lowercase sets for case-insensitive comparison
    const set1 = new Set(arr1.map((s) => s.toLowerCase()));
    const set2 = new Set(arr2.map((s) => s.toLowerCase()));

    // Calculate intersection
    const intersection = new Set([...set1].filter((x) => set2.has(x)));

    // Calculate union
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * cosine = (A · B) / (||A|| × ||B||)
   */
  private calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }

    // Calculate dot product
    let dotProduct = 0;
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
    }

    // Calculate magnitudes
    let magnitude1 = 0;
    let magnitude2 = 0;
    for (let i = 0; i < embedding1.length; i++) {
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    // Avoid division by zero
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }
}
