/**
 * Consolidation Engine
 *
 * Identifies clusters of related episodic memories based on semantic similarity
 * and consolidates them into semantic summaries.
 *
 * Requirements:
 * - 1.1: Identify clusters of related episodic memories based on semantic similarity
 * - 1.2: Generate semantic summary when cluster has 5+ memories
 * - 1.3: Link summary to original episodic memories via Waypoint_Graph
 * - 1.4: Reduce strength of original memories but not delete them
 * - 1.5: Configurable similarity threshold (default: 0.75) for clustering
 */

import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import type { LLMClient } from "../ai/llm-client";
import type { DatabaseConnectionManager } from "../database/connection-manager";
import type { EmbeddingStorage } from "../embeddings/embedding-storage";
import { MemorySector } from "../embeddings/types";
import { LinkType } from "../graph/types";
import { Logger } from "../utils/logger";
import type { Memory, MemorySectorType } from "./types";

/**
 * Configuration for consolidation operations
 */
export interface ConsolidationConfig {
  /** Minimum similarity threshold for clustering (0.0-1.0) */
  similarityThreshold: number;
  /** Minimum cluster size to trigger consolidation */
  minClusterSize: number;
  /** Maximum memories to process per batch */
  batchSize: number;
  /** Strength reduction factor for consolidated memories (0.0-1.0) */
  strengthReductionFactor: number;
}

/**
 * Default consolidation configuration
 * Requirements: 1.5 - default similarity threshold of 0.75
 */
export const DEFAULT_CONSOLIDATION_CONFIG: ConsolidationConfig = {
  similarityThreshold: 0.75,
  minClusterSize: 5,
  batchSize: 100,
  strengthReductionFactor: 0.5,
};

/**
 * Minimum cluster size required for summary generation
 * Requirements: 1.2 - cluster must have 5+ memories for summary
 */
export const MIN_CLUSTER_SIZE_FOR_SUMMARY = 5;

/**
 * Represents a cluster of related memories
 */
export interface MemoryCluster {
  /** Cluster centroid memory ID */
  centroidId: string;
  /** Memory IDs in this cluster */
  memberIds: string[];
  /** Average similarity within cluster */
  avgSimilarity: number;
  /** Cluster topic/theme */
  topic: string;
}

/**
 * Result of a consolidation operation
 */
export interface ConsolidationResult {
  /** Generated summary memory ID */
  summaryId: string;
  /** Original memory IDs that were consolidated */
  consolidatedIds: string[];
  /** Summary content */
  summaryContent: string;
  /** Consolidation timestamp */
  consolidatedAt: Date;
}

/**
 * Error class for consolidation operations
 */
export class ConsolidationEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ConsolidationEngineError";
  }
}

/**
 * Internal representation of a memory with its embedding
 */
interface MemoryWithEmbedding {
  id: string;
  content: string;
  primarySector: MemorySectorType;
  createdAt: Date;
  embedding: number[];
}

/**
 * Consolidation Engine
 *
 * Identifies clusters of related episodic memories and consolidates them
 * into semantic summaries.
 *
 * Requirements:
 * - 1.1: Identify clusters of related episodic memories based on semantic similarity
 * - 1.2: Generate semantic summary when cluster has 5+ memories
 * - 1.5: Configurable similarity threshold (default: 0.75) for clustering
 */
export class ConsolidationEngine {
  private llmClient: LLMClient | null = null;

  constructor(
    private db: DatabaseConnectionManager,
    private embeddingStorage: EmbeddingStorage,
    llmClient?: LLMClient
  ) {
    this.llmClient = llmClient ?? null;
  }

  /**
   * Set the LLM client for summary generation
   * Allows lazy initialization of the LLM client
   */
  setLLMClient(llmClient: LLMClient): void {
    this.llmClient = llmClient;
  }

  /**
   * Generate a semantic summary for a cluster of memories
   *
   * Requirements:
   * - 1.2: Generate semantic summary when cluster has 5+ memories
   *
   * @param cluster - The memory cluster to summarize
   * @returns Generated summary content
   * @throws ConsolidationEngineError if cluster is too small or LLM fails
   */
  async generateSummary(cluster: MemoryCluster): Promise<string> {
    // Validate minimum cluster size
    if (cluster.memberIds.length < MIN_CLUSTER_SIZE_FOR_SUMMARY) {
      throw new ConsolidationEngineError(
        `Cluster must have at least ${MIN_CLUSTER_SIZE_FOR_SUMMARY} memories for summary generation`,
        "CLUSTER_TOO_SMALL",
        {
          clusterSize: cluster.memberIds.length,
          minRequired: MIN_CLUSTER_SIZE_FOR_SUMMARY,
        }
      );
    }

    if (!this.llmClient) {
      throw new ConsolidationEngineError(
        "LLM client is required for summary generation",
        "LLM_NOT_CONFIGURED"
      );
    }

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Load memory contents for the cluster
      const memoryContents = await this.loadMemoryContents(client, cluster.memberIds);

      if (memoryContents.length === 0) {
        throw new ConsolidationEngineError(
          "No memory contents found for cluster",
          "NO_MEMORY_CONTENTS",
          { clusterMemberIds: cluster.memberIds }
        );
      }

      // Generate summary using LLM
      const summary = await this.generateSummaryWithLLM(memoryContents, cluster.topic);

      Logger.info(`Generated summary for cluster with ${cluster.memberIds.length} memories`, {
        centroidId: cluster.centroidId,
        topic: cluster.topic,
        summaryLength: summary.length,
      });

      return summary;
    } catch (error) {
      if (error instanceof ConsolidationEngineError) {
        throw error;
      }

      Logger.error("Failed to generate summary:", error);
      throw new ConsolidationEngineError("Failed to generate summary", "SUMMARY_GENERATION_ERROR", {
        clusterCentroidId: cluster.centroidId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Load memory contents for given memory IDs
   */
  private async loadMemoryContents(client: PoolClient, memoryIds: string[]): Promise<string[]> {
    if (memoryIds.length === 0) {
      return [];
    }

    const placeholders = memoryIds.map((_, i) => `$${i + 1}`).join(", ");
    const result = await client.query(
      `SELECT content FROM memories WHERE id IN (${placeholders}) ORDER BY created_at ASC`,
      memoryIds
    );

    return result.rows.map((row) => row.content as string);
  }

  /**
   * Generate summary using LLM
   *
   * Creates a semantic summary that captures the key insights and themes
   * from the cluster of related memories.
   */
  private async generateSummaryWithLLM(memoryContents: string[], topic: string): Promise<string> {
    const systemPrompt = `You are a memory consolidation assistant. Your task is to create a concise semantic summary that captures the key insights, patterns, and knowledge from a collection of related episodic memories.

Guidelines:
- Focus on extracting the essential knowledge and insights
- Identify common themes and patterns across the memories
- Create a coherent summary that preserves important details
- Write in a clear, factual style suitable for long-term knowledge storage
- Keep the summary concise but comprehensive (aim for 2-4 paragraphs)
- Do not include meta-commentary about the summarization process`;

    const memoriesText = memoryContents
      .map((content, i) => `Memory ${i + 1}:\n${content}`)
      .join("\n\n---\n\n");

    const userPrompt = `Please create a semantic summary of the following ${memoryContents.length} related memories about "${topic}":

${memoriesText}

Create a consolidated summary that captures the key knowledge and insights from these memories.`;

    try {
      // llmClient is guaranteed to be non-null here because generateSummary checks it
      if (!this.llmClient) {
        throw new ConsolidationEngineError(
          "LLM client is required for summary generation",
          "LLM_NOT_CONFIGURED"
        );
      }
      const summary = await this.llmClient.generate(userPrompt, systemPrompt);
      return summary.trim();
    } catch (error) {
      Logger.error("LLM summary generation failed:", error);
      throw new ConsolidationEngineError("LLM failed to generate summary", "LLM_GENERATION_ERROR", {
        error: error instanceof Error ? error.message : String(error),
        memoryCount: memoryContents.length,
        topic,
      });
    }
  }

  /**
   * Identify clusters of related memories
   *
   * Requirements:
   * - 1.1: Identify clusters of related episodic memories based on semantic similarity
   * - 1.5: Configurable similarity threshold for clustering
   *
   * Uses a greedy clustering algorithm:
   * 1. Load all unconsolidated episodic memories for the user
   * 2. For each memory, find all similar memories above threshold
   * 3. Group memories into clusters where all pairs have similarity >= threshold
   * 4. Return clusters with at least minClusterSize members
   *
   * @param userId - User ID for filtering memories
   * @param config - Consolidation configuration
   * @returns Array of memory clusters
   */
  async identifyClusters(userId: string, config: ConsolidationConfig): Promise<MemoryCluster[]> {
    if (!userId) {
      throw new ConsolidationEngineError("userId is required", "INVALID_INPUT");
    }

    this.validateConfig(config);

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Load unconsolidated episodic memories
      const memories = await this.loadUnconsolidatedMemories(client, userId, config.batchSize);

      if (memories.length < config.minClusterSize) {
        Logger.debug(
          `Not enough memories for clustering: ${memories.length} < ${config.minClusterSize}`
        );
        return [];
      }

      // Load embeddings for all memories
      const memoriesWithEmbeddings = await this.loadEmbeddingsForMemories(memories);

      if (memoriesWithEmbeddings.length < config.minClusterSize) {
        Logger.debug(
          `Not enough memories with embeddings: ${memoriesWithEmbeddings.length} < ${config.minClusterSize}`
        );
        return [];
      }

      // Build similarity matrix
      const similarityMatrix = this.buildSimilarityMatrix(memoriesWithEmbeddings);

      // Identify clusters using greedy algorithm
      const clusters = this.greedyClustering(
        memoriesWithEmbeddings,
        similarityMatrix,
        config.similarityThreshold,
        config.minClusterSize
      );

      Logger.info(`Identified ${clusters.length} clusters for user ${userId}`);

      return clusters;
    } catch (error) {
      if (error instanceof ConsolidationEngineError) {
        throw error;
      }

      Logger.error("Failed to identify clusters:", error);
      throw new ConsolidationEngineError("Failed to identify clusters", "CLUSTERING_ERROR", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Validate consolidation configuration
   */
  private validateConfig(config: ConsolidationConfig): void {
    if (config.similarityThreshold < 0 || config.similarityThreshold > 1) {
      throw new ConsolidationEngineError(
        "similarityThreshold must be between 0 and 1",
        "INVALID_CONFIG",
        { similarityThreshold: config.similarityThreshold }
      );
    }

    if (config.minClusterSize < 2) {
      throw new ConsolidationEngineError("minClusterSize must be at least 2", "INVALID_CONFIG", {
        minClusterSize: config.minClusterSize,
      });
    }

    if (config.batchSize < 1) {
      throw new ConsolidationEngineError("batchSize must be at least 1", "INVALID_CONFIG", {
        batchSize: config.batchSize,
      });
    }

    if (config.strengthReductionFactor < 0 || config.strengthReductionFactor > 1) {
      throw new ConsolidationEngineError(
        "strengthReductionFactor must be between 0 and 1",
        "INVALID_CONFIG",
        { strengthReductionFactor: config.strengthReductionFactor }
      );
    }
  }

  /**
   * Load unconsolidated episodic memories for a user
   *
   * Handles database schema variations gracefully:
   * - If consolidated_into or embedding_status columns don't exist, falls back to simpler query
   * - Returns empty array if no memories found or query fails due to schema issues
   */
  private async loadUnconsolidatedMemories(
    client: PoolClient,
    userId: string,
    limit: number
  ): Promise<Memory[]> {
    try {
      // Try the full query with all columns
      const result = await client.query(
        `SELECT
           m.id,
           m.content,
           m.created_at,
           m.last_accessed,
           m.access_count,
           m.salience,
           m.decay_rate,
           m.strength,
           m.user_id,
           m.session_id,
           m.primary_sector,
           m.embedding_status
         FROM memories m
         WHERE m.user_id = $1
           AND m.primary_sector = 'episodic'
           AND m.consolidated_into IS NULL
           AND m.embedding_status = 'complete'
         ORDER BY m.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map((row) => this.rowToMemory(row));
    } catch (error) {
      // Check if the error is due to missing columns (schema issue)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("column") &&
        (errorMessage.includes("consolidated_into") || errorMessage.includes("embedding_status"))
      ) {
        Logger.warn(
          "Database schema may be outdated. Falling back to simpler query without consolidation tracking columns.",
          { error: errorMessage }
        );

        // Fall back to simpler query without the missing columns
        try {
          const fallbackResult = await client.query(
            `SELECT
               m.id,
               m.content,
               m.created_at,
               m.last_accessed,
               m.access_count,
               m.salience,
               m.decay_rate,
               m.strength,
               m.user_id,
               m.session_id,
               m.primary_sector
             FROM memories m
             WHERE m.user_id = $1
               AND m.primary_sector = 'episodic'
             ORDER BY m.created_at DESC
             LIMIT $2`,
            [userId, limit]
          );

          return fallbackResult.rows.map((row) => this.rowToMemoryWithDefaults(row));
        } catch (fallbackError) {
          Logger.error("Fallback query also failed:", fallbackError);
          // Return empty array instead of throwing - no memories to consolidate
          return [];
        }
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Convert database row to Memory object with default values for missing columns
   */
  private rowToMemoryWithDefaults(row: Record<string, unknown>): Memory {
    return {
      id: row.id as string,
      content: row.content as string,
      createdAt: new Date(row.created_at as string),
      lastAccessed: new Date(row.last_accessed as string),
      accessCount: row.access_count as number,
      salience: row.salience as number,
      decayRate: row.decay_rate as number,
      strength: row.strength as number,
      userId: row.user_id as string,
      sessionId: row.session_id as string,
      primarySector: row.primary_sector as MemorySectorType,
      metadata: {},
      embeddingStatus: "complete" as const, // Assume complete for fallback
    };
  }

  /**
   * Convert database row to Memory object
   */
  private rowToMemory(row: Record<string, unknown>): Memory {
    return {
      id: row.id as string,
      content: row.content as string,
      createdAt: new Date(row.created_at as string),
      lastAccessed: new Date(row.last_accessed as string),
      accessCount: row.access_count as number,
      salience: row.salience as number,
      decayRate: row.decay_rate as number,
      strength: row.strength as number,
      userId: row.user_id as string,
      sessionId: row.session_id as string,
      primarySector: row.primary_sector as MemorySectorType,
      metadata: {},
      embeddingStatus: row.embedding_status as "pending" | "complete" | "failed",
    };
  }

  /**
   * Load embeddings for memories and filter out those without embeddings
   */
  private async loadEmbeddingsForMemories(memories: Memory[]): Promise<MemoryWithEmbedding[]> {
    const result: MemoryWithEmbedding[] = [];

    for (const memory of memories) {
      try {
        const embeddings = await this.embeddingStorage.retrieveEmbeddings(memory.id, [
          MemorySector.Semantic,
        ]);

        // Use semantic embedding for similarity comparison
        const semanticEmbedding = embeddings.semantic;

        if (semanticEmbedding && semanticEmbedding.length > 0) {
          result.push({
            id: memory.id,
            content: memory.content,
            primarySector: memory.primarySector,
            createdAt: memory.createdAt,
            embedding: semanticEmbedding,
          });
        }
      } catch (error) {
        Logger.debug(`Could not load embeddings for memory ${memory.id}:`, error);
        // Skip memories without embeddings
      }
    }

    return result;
  }

  /**
   * Build similarity matrix for all memory pairs
   *
   * Returns a Map where key is "id1:id2" (sorted) and value is similarity score
   */
  private buildSimilarityMatrix(memories: MemoryWithEmbedding[]): Map<string, number> {
    const matrix = new Map<string, number>();

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const similarity = this.cosineSimilarity(memories[i].embedding, memories[j].embedding);

        // Store with sorted key to ensure consistent lookup
        const key = this.getSimilarityKey(memories[i].id, memories[j].id);
        matrix.set(key, similarity);
      }
    }

    return matrix;
  }

  /**
   * Get consistent key for similarity lookup
   */
  private getSimilarityKey(id1: string, id2: string): string {
    return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
  }

  /**
   * Get similarity between two memories from the matrix
   */
  private getSimilarity(matrix: Map<string, number>, id1: string, id2: string): number {
    if (id1 === id2) return 1.0;
    const key = this.getSimilarityKey(id1, id2);
    return matrix.get(key) ?? 0;
  }

  /**
   * Greedy clustering algorithm
   *
   * Requirements:
   * - 1.1: Group memories where all pairs have similarity >= threshold
   *
   * Algorithm:
   * 1. Start with the memory that has the most similar neighbors
   * 2. Add all memories that are similar to ALL current cluster members
   * 3. Mark clustered memories as used
   * 4. Repeat until no more clusters can be formed
   */
  private greedyClustering(
    memories: MemoryWithEmbedding[],
    similarityMatrix: Map<string, number>,
    threshold: number,
    minSize: number
  ): MemoryCluster[] {
    const clusters: MemoryCluster[] = [];
    const used = new Set<string>();

    // Sort memories by number of similar neighbors (descending)
    const memoriesByNeighborCount = [...memories].sort((a, b) => {
      const aNeighbors = this.countSimilarNeighbors(a.id, memories, similarityMatrix, threshold);
      const bNeighbors = this.countSimilarNeighbors(b.id, memories, similarityMatrix, threshold);
      return bNeighbors - aNeighbors;
    });

    for (const seed of memoriesByNeighborCount) {
      if (used.has(seed.id)) continue;

      // Try to build a cluster starting from this seed
      const cluster = this.buildCluster(seed, memories, similarityMatrix, threshold, used);

      if (cluster.memberIds.length >= minSize) {
        clusters.push(cluster);
        // Mark all cluster members as used
        for (const id of cluster.memberIds) {
          used.add(id);
        }
      }
    }

    return clusters;
  }

  /**
   * Count similar neighbors for a memory
   */
  private countSimilarNeighbors(
    memoryId: string,
    memories: MemoryWithEmbedding[],
    similarityMatrix: Map<string, number>,
    threshold: number
  ): number {
    let count = 0;
    for (const other of memories) {
      if (other.id !== memoryId) {
        const similarity = this.getSimilarity(similarityMatrix, memoryId, other.id);
        if (similarity >= threshold) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Build a cluster starting from a seed memory
   *
   * Requirements:
   * - 1.1: All pairs within a cluster have similarity >= threshold
   */
  private buildCluster(
    seed: MemoryWithEmbedding,
    memories: MemoryWithEmbedding[],
    similarityMatrix: Map<string, number>,
    threshold: number,
    used: Set<string>
  ): MemoryCluster {
    const clusterMembers: MemoryWithEmbedding[] = [seed];
    const clusterIds = new Set<string>([seed.id]);

    // Find all memories that are similar to ALL current cluster members
    for (const candidate of memories) {
      if (used.has(candidate.id) || clusterIds.has(candidate.id)) continue;

      // Check if candidate is similar to ALL current cluster members
      let isSimilarToAll = true;
      for (const member of clusterMembers) {
        const similarity = this.getSimilarity(similarityMatrix, candidate.id, member.id);
        if (similarity < threshold) {
          isSimilarToAll = false;
          break;
        }
      }

      if (isSimilarToAll) {
        clusterMembers.push(candidate);
        clusterIds.add(candidate.id);
      }
    }

    // Calculate average similarity within cluster
    const avgSimilarity = this.calculateAverageSimilarity(clusterMembers, similarityMatrix);

    // Find centroid (memory with highest average similarity to others)
    const centroidId = this.findCentroid(clusterMembers, similarityMatrix);

    // Extract topic from centroid content (first 50 chars)
    const centroid = clusterMembers.find((m) => m.id === centroidId);
    const topic = centroid ? this.extractTopic(centroid.content) : "Unknown";

    return {
      centroidId,
      memberIds: clusterMembers.map((m) => m.id),
      avgSimilarity,
      topic,
    };
  }

  /**
   * Calculate average similarity within a cluster
   */
  private calculateAverageSimilarity(
    members: MemoryWithEmbedding[],
    similarityMatrix: Map<string, number>
  ): number {
    if (members.length < 2) return 1.0;

    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        totalSimilarity += this.getSimilarity(similarityMatrix, members[i].id, members[j].id);
        pairCount++;
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 1.0;
  }

  /**
   * Find the centroid memory (highest average similarity to others)
   */
  private findCentroid(
    members: MemoryWithEmbedding[],
    similarityMatrix: Map<string, number>
  ): string {
    if (members.length === 1) return members[0].id;

    let bestId = members[0].id;
    let bestAvgSimilarity = 0;

    for (const member of members) {
      let totalSimilarity = 0;
      for (const other of members) {
        if (other.id !== member.id) {
          totalSimilarity += this.getSimilarity(similarityMatrix, member.id, other.id);
        }
      }
      const avgSimilarity = totalSimilarity / (members.length - 1);

      if (avgSimilarity > bestAvgSimilarity) {
        bestAvgSimilarity = avgSimilarity;
        bestId = member.id;
      }
    }

    return bestId;
  }

  /**
   * Extract topic from content (first meaningful words)
   */
  private extractTopic(content: string): string {
    // Remove extra whitespace and take first 50 chars
    const cleaned = content.replace(/\s+/g, " ").trim();
    if (cleaned.length <= 50) return cleaned;

    // Try to break at word boundary
    const truncated = cleaned.substring(0, 50);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 30) {
      return `${truncated.substring(0, lastSpace)}...`;
    }
    return `${truncated}...`;
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   *
   * cosine = (A · B) / (||A|| × ||B||)
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length || vec1.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Execute consolidation for a cluster
   *
   * Requirements:
   * - 1.2: Generate semantic summary when cluster has 5+ memories
   * - 1.3: Link summary to original episodic memories via Waypoint_Graph
   * - 1.4: Reduce strength of original memories but not delete them
   *
   * This method:
   * 1. Generates a semantic summary for the cluster using LLM
   * 2. Creates a new summary memory in the database
   * 3. Creates graph links from the summary to all original memories
   * 4. Reduces the strength of original memories by the configured factor
   * 5. Updates original memories to reference the summary (consolidated_into)
   * 6. Records the consolidation in consolidation_history
   *
   * @param cluster - The memory cluster to consolidate
   * @param config - Consolidation configuration (optional, uses defaults)
   * @returns ConsolidationResult with summary details
   * @throws ConsolidationEngineError if consolidation fails
   */
  async consolidate(
    cluster: MemoryCluster,
    config: ConsolidationConfig = DEFAULT_CONSOLIDATION_CONFIG
  ): Promise<ConsolidationResult> {
    // Validate cluster size
    if (cluster.memberIds.length < MIN_CLUSTER_SIZE_FOR_SUMMARY) {
      throw new ConsolidationEngineError(
        `Cluster must have at least ${MIN_CLUSTER_SIZE_FOR_SUMMARY} memories for consolidation`,
        "CLUSTER_TOO_SMALL",
        {
          clusterSize: cluster.memberIds.length,
          minRequired: MIN_CLUSTER_SIZE_FOR_SUMMARY,
        }
      );
    }

    // Generate summary content using LLM
    const summaryContent = await this.generateSummary(cluster);

    let client: PoolClient | null = null;

    try {
      // Begin transaction for atomic consolidation
      client = await this.db.beginTransaction();

      // Get user ID from one of the original memories
      const userIdResult = await client.query(
        `SELECT user_id, session_id FROM memories WHERE id = $1`,
        [cluster.centroidId]
      );

      if (userIdResult.rows.length === 0) {
        throw new ConsolidationEngineError("Could not find centroid memory", "CENTROID_NOT_FOUND", {
          centroidId: cluster.centroidId,
        });
      }

      const userId = userIdResult.rows[0].user_id as string;
      const sessionId = userIdResult.rows[0].session_id as string;

      // Create summary memory
      const summaryId = randomUUID();
      const now = new Date();

      await this.createSummaryMemory(client, {
        id: summaryId,
        content: summaryContent,
        userId,
        sessionId,
        consolidatedFrom: cluster.memberIds,
        createdAt: now,
      });

      // Create graph links from summary to all original memories
      // Requirements: 1.3 - Link summary to originals via Waypoint_Graph
      await this.createConsolidationLinks(client, summaryId, cluster.memberIds);

      // Reduce strength of original memories and mark as consolidated
      // Requirements: 1.4 - Reduce strength but not delete
      await this.reduceOriginalMemoriesStrength(
        client,
        cluster.memberIds,
        summaryId,
        config.strengthReductionFactor
      );

      // Record consolidation in history
      await this.recordConsolidationHistory(client, {
        userId,
        summaryId,
        consolidatedIds: cluster.memberIds,
        similarityThreshold: config.similarityThreshold,
        clusterSize: cluster.memberIds.length,
      });

      // Commit transaction
      await this.db.commitTransaction(client);
      client = null;

      Logger.info(`Consolidation completed for cluster with ${cluster.memberIds.length} memories`, {
        summaryId,
        consolidatedCount: cluster.memberIds.length,
        topic: cluster.topic,
      });

      return {
        summaryId,
        consolidatedIds: cluster.memberIds,
        summaryContent,
        consolidatedAt: now,
      };
    } catch (error) {
      // Rollback transaction on error
      if (client) {
        try {
          await this.db.rollbackTransaction(client);
        } catch (rollbackError) {
          Logger.error("Failed to rollback consolidation transaction:", rollbackError);
        }
      }

      if (error instanceof ConsolidationEngineError) {
        throw error;
      }

      Logger.error("Consolidation failed:", error);
      throw new ConsolidationEngineError("Consolidation failed", "CONSOLIDATION_ERROR", {
        clusterCentroidId: cluster.centroidId,
        memberCount: cluster.memberIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create a summary memory in the database
   *
   * Creates a new semantic memory that represents the consolidated summary
   * of the original episodic memories.
   */
  private async createSummaryMemory(
    client: PoolClient,
    params: {
      id: string;
      content: string;
      userId: string;
      sessionId: string;
      consolidatedFrom: string[];
      createdAt: Date;
    }
  ): Promise<void> {
    const query = `
      INSERT INTO memories (
        id, content, created_at, last_accessed, access_count,
        salience, decay_rate, strength, user_id, session_id,
        primary_sector, embedding_status, consolidated_from
      ) VALUES ($1, $2, $3, $3, 0, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    // Summary memories are semantic (derived knowledge)
    // They have high salience and strength since they represent consolidated knowledge
    const values = [
      params.id,
      params.content,
      params.createdAt,
      0.8, // High salience for consolidated summaries
      0.01, // Low decay rate (semantic memories decay slowly)
      1.0, // Full strength initially
      params.userId,
      params.sessionId,
      "semantic", // Summary memories are semantic type
      "pending", // Embeddings will be generated separately
      params.consolidatedFrom,
    ];

    await client.query(query, values);

    // Also insert metadata for the summary memory
    await client.query(
      `INSERT INTO memory_metadata (
        memory_id, keywords, tags, category, context, importance, is_atomic, parent_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.id,
        [], // Keywords will be extracted later
        ["consolidated", "summary"],
        "consolidated_summary",
        `Consolidated from ${params.consolidatedFrom.length} memories`,
        0.8, // High importance
        false, // Not atomic - it's a composite
        null,
      ]
    );
  }

  /**
   * Create graph links from summary to all original memories
   *
   * Requirements: 1.3 - Link summary to original episodic memories via Waypoint_Graph
   *
   * Creates semantic links from the summary memory to each of the original
   * memories that were consolidated. This maintains the relationship between
   * the summary and its source memories.
   */
  private async createConsolidationLinks(
    client: PoolClient,
    summaryId: string,
    originalMemoryIds: string[]
  ): Promise<void> {
    for (const originalId of originalMemoryIds) {
      // Create link from summary to original
      await client.query(
        `INSERT INTO memory_links (source_id, target_id, link_type, weight, created_at, traversal_count)
         VALUES ($1, $2, $3, $4, NOW(), 0)
         ON CONFLICT (source_id, target_id) DO UPDATE SET
           weight = $4,
           link_type = $3`,
        [summaryId, originalId, LinkType.Semantic, 0.9] // High weight for consolidation links
      );

      // Create reverse link from original to summary
      await client.query(
        `INSERT INTO memory_links (source_id, target_id, link_type, weight, created_at, traversal_count)
         VALUES ($1, $2, $3, $4, NOW(), 0)
         ON CONFLICT (source_id, target_id) DO UPDATE SET
           weight = $4,
           link_type = $3`,
        [originalId, summaryId, LinkType.Semantic, 0.9]
      );
    }

    Logger.debug(
      `Created ${originalMemoryIds.length * 2} consolidation links for summary ${summaryId}`
    );
  }

  /**
   * Reduce strength of original memories and mark them as consolidated
   *
   * Requirements: 1.4 - Reduce strength of original memories but not delete them
   *
   * Updates the original memories to:
   * 1. Reduce their strength by the configured factor
   * 2. Set consolidated_into to reference the summary memory
   *
   * This preserves the original memories while indicating they have been
   * consolidated into a summary.
   */
  private async reduceOriginalMemoriesStrength(
    client: PoolClient,
    memoryIds: string[],
    summaryId: string,
    strengthReductionFactor: number
  ): Promise<void> {
    // Update all original memories in a single query
    const query = `
      UPDATE memories
      SET
        strength = strength * $1,
        consolidated_into = $2
      WHERE id = ANY($3)
    `;

    await client.query(query, [strengthReductionFactor, summaryId, memoryIds]);

    Logger.debug(
      `Reduced strength of ${memoryIds.length} memories by factor ${strengthReductionFactor}`
    );
  }

  /**
   * Record consolidation in history table
   *
   * Creates an audit record of the consolidation operation for tracking
   * and potential rollback purposes.
   */
  private async recordConsolidationHistory(
    client: PoolClient,
    options: {
      userId: string;
      summaryId: string;
      consolidatedIds: string[];
      similarityThreshold: number;
      clusterSize: number;
    }
  ): Promise<void> {
    await client.query(
      `INSERT INTO consolidation_history (
        user_id, summary_memory_id, consolidated_memory_ids,
        similarity_threshold, cluster_size, consolidated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        options.userId,
        options.summaryId,
        options.consolidatedIds,
        options.similarityThreshold,
        options.clusterSize,
      ]
    );
  }

  /**
   * Run full consolidation cycle for a user
   *
   * This is a convenience method that:
   * 1. Identifies all clusters for the user
   * 2. Consolidates each cluster
   * 3. Returns all consolidation results
   *
   * @param userId - User ID to run consolidation for
   * @param config - Consolidation configuration (optional)
   * @returns Array of consolidation results
   */
  async runConsolidation(
    userId: string,
    config: ConsolidationConfig = DEFAULT_CONSOLIDATION_CONFIG
  ): Promise<ConsolidationResult[]> {
    if (!userId) {
      throw new ConsolidationEngineError("userId is required", "INVALID_INPUT");
    }

    // Identify clusters
    const clusters = await this.identifyClusters(userId, config);

    if (clusters.length === 0) {
      Logger.info(`No clusters found for consolidation for user ${userId}`);
      return [];
    }

    Logger.info(`Found ${clusters.length} clusters for consolidation for user ${userId}`);

    // Consolidate each cluster
    const results: ConsolidationResult[] = [];

    for (const cluster of clusters) {
      try {
        const result = await this.consolidate(cluster, config);
        results.push(result);
      } catch (error) {
        // Log error but continue with other clusters
        Logger.error(`Failed to consolidate cluster ${cluster.centroidId}:`, error);
      }
    }

    Logger.info(`Completed ${results.length} consolidations for user ${userId}`);

    return results;
  }
}

/**
 * Factory function to create ConsolidationEngine
 */
export function createConsolidationEngine(
  db: DatabaseConnectionManager,
  embeddingStorage: EmbeddingStorage,
  llmClient?: LLMClient
): ConsolidationEngine {
  return new ConsolidationEngine(db, embeddingStorage, llmClient);
}
