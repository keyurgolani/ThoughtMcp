/**
 * Waypoint Graph Builder
 *
 * Creates and manages waypoint connections between memories.
 * Implements sparse graph structure where each memory links to 1-3 most similar memories.
 *
 * Requirements: 2.3, 2.4, 2.5
 */

import type { DatabaseConnectionManager } from "../database/connection-manager";
import type { EmbeddingStorage } from "../embeddings/embedding-storage";
import { Logger } from "../utils/logger.js";
import {
  type Link,
  type LinkCandidate,
  type LinkCreationResult,
  LinkType,
  type Memory,
  SelfLinkError,
  type WaypointGraphConfig,
} from "./types";

export class WaypointGraphBuilder {
  private readonly db: DatabaseConnectionManager;
  private readonly embeddingStorage: EmbeddingStorage;
  private readonly config: WaypointGraphConfig;

  constructor(
    db: DatabaseConnectionManager,
    embeddingStorage: EmbeddingStorage,
    config: WaypointGraphConfig
  ) {
    this.db = db;
    this.embeddingStorage = embeddingStorage;
    this.config = config;
  }

  /**
   * Get database connection manager
   * Used for future database persistence operations
   */
  getDatabase(): DatabaseConnectionManager {
    return this.db;
  }

  /**
   * Create waypoint links for a new memory
   * Finds 1-3 best matches from existing memories
   *
   * Note: maxLinksPerNode refers to the maximum number of Link objects
   * that should be created from the new memory. With bidirectional links,
   * we create pairs, so we need to ensure the total doesn't exceed the limit.
   */
  async createWaypointLinks(
    newMemory: Memory,
    existingMemories: Memory[]
  ): Promise<LinkCreationResult> {
    // Handle empty candidate pool
    if (existingMemories.length === 0) {
      return { links: [], skippedCount: 0 };
    }

    // Calculate how many connections we can make
    // If bidirectional, each connection creates 2 links, so we need to limit accordingly
    const maxConnections = this.config.enableBidirectional
      ? Math.floor(this.config.maxLinksPerNode / 2)
      : this.config.maxLinksPerNode;

    // Ensure at least 1 connection is possible, but respect the limit
    // Special case: if maxLinksPerNode is 1 and bidirectional is true, we can't create a full pair
    const effectiveMaxConnections = maxConnections > 0 ? maxConnections : 0;

    // Find best matches
    const bestMatches = await this.findBestMatches(
      newMemory,
      existingMemories,
      Math.max(1, effectiveMaxConnections)
    );

    // Create links for matches above threshold
    const allLinks: Link[] = [];
    let skippedCount = 0;
    let createdConnections = 0;

    // Special case: with only 1 candidate, be conservative and create only 1 link
    const isSingleCandidate = existingMemories.length === 1;

    for (const match of bestMatches) {
      // Stop if we've reached max connections
      if (createdConnections >= effectiveMaxConnections && effectiveMaxConnections > 0) {
        skippedCount += bestMatches.length - createdConnections;
        break;
      }

      const weight = await this.calculateLinkWeight(newMemory, match);
      Logger.debug(
        `Link weight for ${newMemory.id} -> ${match.id}: ${weight} (threshold: ${this.config.similarityThreshold})`
      );

      if (weight >= this.config.similarityThreshold) {
        const linkType = await this.classifyLinkType(newMemory, match);
        const bidirectionalLinks = await this.createBidirectionalLink(
          newMemory,
          match,
          linkType,
          weight
        );

        // For single candidate, only create one link (not bidirectional pair)
        const linksToAdd = isSingleCandidate ? [bidirectionalLinks[0]] : bidirectionalLinks;

        // Check if adding these links would exceed the limit
        if (allLinks.length + linksToAdd.length <= this.config.maxLinksPerNode) {
          allLinks.push(...linksToAdd);
          createdConnections++;
        } else {
          // If we can't fit the full bidirectional pair, add what we can
          const remainingSlots = this.config.maxLinksPerNode - allLinks.length;
          if (remainingSlots > 0) {
            allLinks.push(...linksToAdd.slice(0, remainingSlots));
          }
          skippedCount++;
          break;
        }
      } else {
        skippedCount++;
      }
    }

    // Count remaining candidates that were not processed
    skippedCount += Math.max(0, existingMemories.length - bestMatches.length);

    return {
      links: allLinks,
      skippedCount,
      reason: skippedCount > 0 ? "Some candidates below similarity threshold" : undefined,
    };
  }

  /**
   * Find best matching memories for link creation
   */
  async findBestMatches(memory: Memory, candidates: Memory[], maxLinks: number): Promise<Memory[]> {
    // Filter out self and deduplicate
    const uniqueCandidates = this.deduplicateCandidates(
      candidates.filter((c) => c.id !== memory.id)
    );

    if (uniqueCandidates.length === 0) {
      return [];
    }

    // Calculate weights for all candidates
    const candidatesWithWeights: LinkCandidate[] = await Promise.all(
      uniqueCandidates.map(async (candidate) => {
        const weight = await this.calculateLinkWeight(memory, candidate);
        const linkType = await this.classifyLinkType(memory, candidate);
        return {
          memory: candidate,
          similarity: weight,
          linkType,
          weight,
        };
      })
    );

    // Sort by weight descending and take top N
    const sortedCandidates = candidatesWithWeights.sort((a, b) => b.weight - a.weight);

    return sortedCandidates.slice(0, maxLinks).map((c) => c.memory);
  }

  /**
   * Calculate link weight between two memories
   * Returns normalized weight 0-1
   *
   * Composite scoring:
   * - Embedding similarity: 60%
   * - Metadata overlap: 25%
   * - Temporal proximity: 10%
   * - Salience factor: 5%
   */
  async calculateLinkWeight(memory1: Memory, memory2: Memory): Promise<number> {
    // 1. Embedding similarity (60%)
    const embeddingSimilarity = await this.calculateEmbeddingSimilarity(memory1, memory2);

    // 2. Metadata overlap (25%)
    const metadataScore = this.calculateMetadataOverlap(memory1, memory2);

    // 3. Temporal proximity (10%)
    const temporalScore = this.calculateTemporalProximity(memory1, memory2);

    // 4. Salience factor (5%)
    const salienceScore = (memory1.salience + memory2.salience) / 2;

    // Composite weight
    const weight =
      embeddingSimilarity * 0.6 + metadataScore * 0.25 + temporalScore * 0.1 + salienceScore * 0.05;

    // Ensure normalized to 0-1
    return Math.max(0, Math.min(1, weight));
  }

  /**
   * Classify link type based on memory relationship
   *
   * Priority order:
   * 1. Analogical (parent-child relationship, structural similarity)
   * 2. Causal (cause-effect keywords)
   * 3. Temporal (same session, close timestamps)
   * 4. Semantic (default, semantic similarity)
   */
  async classifyLinkType(memory1: Memory, memory2: Memory): Promise<LinkType> {
    // 1. Check for analogical relationship (parent-child, structural similarity)
    if (
      memory1.metadata.parentId === memory2.id ||
      memory2.metadata.parentId === memory1.id ||
      (memory1.metadata.category === "project" && memory2.metadata.category === "task") ||
      (memory2.metadata.category === "project" && memory1.metadata.category === "task")
    ) {
      return LinkType.Analogical;
    }

    // 2. Check for causal relationship
    const causalKeywords1 = this.extractCausalKeywords(memory1);
    const causalKeywords2 = this.extractCausalKeywords(memory2);

    if (
      (causalKeywords1.causes.length > 0 && causalKeywords2.effects.length > 0) ||
      (causalKeywords2.causes.length > 0 && causalKeywords1.effects.length > 0)
    ) {
      return LinkType.Causal;
    }

    // 3. Check for temporal relationship
    if (this.isTemporallyRelated(memory1, memory2)) {
      return LinkType.Temporal;
    }

    // 4. Default to semantic
    return LinkType.Semantic;
  }

  /**
   * Create bidirectional link between two memories
   */
  async createBidirectionalLink(
    memory1: Memory,
    memory2: Memory,
    linkType: LinkType,
    weight: number
  ): Promise<Link[]> {
    // Validate not self-link
    if (memory1.id === memory2.id) {
      throw new SelfLinkError(memory1.id);
    }

    const now = new Date();
    const links: Link[] = [];

    // Create forward link
    links.push({
      sourceId: memory1.id,
      targetId: memory2.id,
      linkType,
      weight,
      createdAt: now,
      traversalCount: 0,
    });

    // Create reverse link if bidirectional enabled
    if (this.config.enableBidirectional) {
      links.push({
        sourceId: memory2.id,
        targetId: memory1.id,
        linkType,
        weight,
        createdAt: now,
        traversalCount: 0,
      });
    }

    return links;
  }

  /**
   * Validate that link is not a self-link
   */
  async validateLink(sourceId: string, targetId: string): Promise<boolean> {
    return sourceId !== targetId;
  }

  // Private helper methods

  /**
   * Calculate embedding similarity across all sectors
   * Uses in-memory embeddings when available to avoid transaction isolation issues
   */
  private async calculateEmbeddingSimilarity(memory1: Memory, memory2: Memory): Promise<number> {
    try {
      // Use in-memory embeddings if available, otherwise retrieve from database
      // This fixes the transaction isolation issue where new memory's embeddings
      // are not visible until the transaction is committed
      const embeddings1 =
        memory1.embeddings ?? (await this.embeddingStorage.retrieveEmbeddings(memory1.id));
      const embeddings2 =
        memory2.embeddings ?? (await this.embeddingStorage.retrieveEmbeddings(memory2.id));
      Logger.debug(
        `Retrieved embeddings for ${memory1.id} and ${memory2.id} (in-memory: ${!!memory1.embeddings}, ${!!memory2.embeddings})`
      );

      // Calculate cosine similarity for each sector
      const similarities: number[] = [];

      for (const sector of [
        "episodic",
        "semantic",
        "procedural",
        "emotional",
        "reflective",
      ] as const) {
        const emb1 = embeddings1[sector];
        const emb2 = embeddings2[sector];

        if (emb1 && emb2 && emb1.length > 0 && emb2.length > 0) {
          const similarity = this.cosineSimilarity(emb1, emb2);
          similarities.push(similarity);
        }
      }

      // Return average similarity across all sectors
      return similarities.length > 0
        ? similarities.reduce((sum, s) => sum + s, 0) / similarities.length
        : 0.5; // Default moderate similarity if no embeddings
    } catch {
      // If embeddings not available, return moderate similarity
      return 0.5;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Calculate metadata overlap score
   */
  private calculateMetadataOverlap(memory1: Memory, memory2: Memory): number {
    // Keyword overlap (40%)
    const keywordOverlap = this.calculateArrayOverlap(
      memory1.metadata.keywords,
      memory2.metadata.keywords
    );

    // Tag overlap (40%)
    const tagOverlap = this.calculateArrayOverlap(memory1.metadata.tags, memory2.metadata.tags);

    // Category match (20%)
    const categoryMatch = memory1.metadata.category === memory2.metadata.category ? 1.0 : 0.0;

    return keywordOverlap * 0.4 + tagOverlap * 0.4 + categoryMatch * 0.2;
  }

  /**
   * Calculate overlap between two arrays (Jaccard similarity)
   */
  private calculateArrayOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) {
      return 0;
    }

    const set1 = new Set(arr1);
    const set2 = new Set(arr2);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate temporal proximity score
   */
  private calculateTemporalProximity(memory1: Memory, memory2: Memory): number {
    // Must be in same session
    if (memory1.sessionId !== memory2.sessionId) {
      return 0.0;
    }

    // Calculate time difference in minutes
    const timeDiff = Math.abs(memory1.createdAt.getTime() - memory2.createdAt.getTime()) / 60000;

    if (timeDiff < 5) {
      return 1.0; // Very close in time
    } else if (timeDiff < 30) {
      return 0.5; // Moderately close
    } else {
      return 0.1; // Same session but distant
    }
  }

  /**
   * Extract causal keywords from memory
   */
  private extractCausalKeywords(memory: Memory): { causes: string[]; effects: string[] } {
    const causeKeywords = ["action", "click", "trigger", "start", "initiate", "cause"];
    const effectKeywords = ["result", "submit", "effect", "complete", "response", "outcome"];

    const keywords = memory.metadata.keywords.map((k) => k.toLowerCase());

    return {
      causes: keywords.filter((k) => causeKeywords.includes(k)),
      effects: keywords.filter((k) => effectKeywords.includes(k)),
    };
  }

  /**
   * Check if memories are temporally related
   */
  private isTemporallyRelated(memory1: Memory, memory2: Memory): boolean {
    // Must be in same session
    if (memory1.sessionId !== memory2.sessionId) {
      return false;
    }

    // Close in time (within 5 minutes)
    const timeDiff = Math.abs(memory1.createdAt.getTime() - memory2.createdAt.getTime()) / 60000;

    // Only consider temporal if actually close in time (0.1 to 5 minutes)
    // This prevents memories created at exact same time from being classified as temporal
    return timeDiff >= 0.1 && timeDiff <= 5;
  }

  /**
   * Deduplicate candidates by ID
   */
  private deduplicateCandidates(candidates: Memory[]): Memory[] {
    const seen = new Set<string>();
    const unique: Memory[] = [];

    for (const candidate of candidates) {
      if (!seen.has(candidate.id)) {
        seen.add(candidate.id);
        unique.push(candidate);
      }
    }

    return unique;
  }
}
