/**
 * Memory Repository
 *
 * Manages memory creation, storage, and retrieval with transaction support.
 * Integrates embedding generation, waypoint graph building, and metadata extraction.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { randomUUID } from "crypto";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { DatabaseConnectionManager } from "../database/connection-manager";
import { GenericLRUCache } from "../embeddings/cache";
import { EmbeddingEngine } from "../embeddings/embedding-engine";
import { EmbeddingStorage } from "../embeddings/embedding-storage";
import { Link, LinkType } from "../graph/types";
import { WaypointGraphBuilder } from "../graph/waypoint-builder";
import { FullTextSearchEngine } from "../search/full-text-search-engine";
import type { FullTextSearchQuery, FullTextSearchResponse } from "../search/types";
import { Logger } from "../utils/logger.js";
import { MetadataMerger, type MetadataUpdate } from "./metadata-merger.js";
import {
  Memory,
  MemoryContent,
  MemoryCreationError,
  MemoryMetadata,
  MemorySectorType,
  MemoryTransactionError,
  MemoryUpdateError,
  MemoryValidationError,
  SECTOR_DECAY_RATES,
  VALID_SECTORS,
} from "./types";

/**
 * Repository for memory operations
 */
export class MemoryRepository {
  private fullTextSearchEngine: FullTextSearchEngine;
  private searchCache: GenericLRUCache<import("./types").SearchResult>;
  private metadataMerger: MetadataMerger;

  constructor(
    private db: DatabaseConnectionManager,
    private embeddingEngine: EmbeddingEngine,
    private graphBuilder: WaypointGraphBuilder,
    private embeddingStorage: EmbeddingStorage
  ) {
    this.fullTextSearchEngine = new FullTextSearchEngine(db);
    this.searchCache = new GenericLRUCache(10000, 300000); // 10k entries, 5 min TTL
    this.metadataMerger = new MetadataMerger();
  }

  /**
   * Create a new memory with embeddings, metadata, and waypoint connections
   *
   * Requirements:
   * - 2.1: Memory creation with all required fields
   * - 2.2: Automatic embedding generation
   * - 2.3: Waypoint connection creation
   * - 2.4: Metadata extraction and storage
   * - 2.5: Initial strength, salience, importance values
   *
   * @param content - Memory content and user context
   * @param metadata - Optional metadata (auto-extracted if not provided)
   * @returns Complete memory object with embeddings and links
   */
  async create(content: MemoryContent, metadata?: MemoryMetadata): Promise<Memory> {
    // Validate input
    this.validateContent(content);
    if (metadata) {
      this.validateMetadata(metadata);
    }

    let client: PoolClient | undefined;

    try {
      // Begin transaction for atomic memory creation
      client = await this.db.beginTransaction();

      // Generate unique memory ID
      const memoryId = randomUUID();
      const now = new Date();

      // Calculate initial values
      const salience = this.calculateSalience(content.content, metadata);
      const decayRate = SECTOR_DECAY_RATES[content.primarySector];
      const strength = 1.0; // Initial strength always 1.0
      const accessCount = 0; // Initial access count always 0

      // Extract or use provided metadata
      const finalMetadata = this.extractMetadata(content.content, metadata);

      // Create memory record in database
      const memory: Memory = {
        id: memoryId,
        content: content.content,
        createdAt: now,
        lastAccessed: now,
        accessCount,
        salience,
        decayRate,
        strength,
        userId: content.userId,
        sessionId: content.sessionId,
        primarySector: content.primarySector,
        metadata: finalMetadata,
      };

      // Insert into memories table
      await this.insertMemoryRecord(client, memory);

      // Generate and store embeddings
      try {
        const embeddings = await this.embeddingEngine.generateAllSectorEmbeddings({
          text: content.content,
          sector: content.primarySector as unknown as import("../embeddings/types").MemorySector,
        });
        memory.embeddings = embeddings;

        // Store embeddings in memory_embeddings table (using transaction client)
        await this.embeddingStorage.storeEmbeddings(memoryId, embeddings, "default", client);
      } catch (error) {
        throw new MemoryCreationError("Embedding generation failed", error as Error);
      }

      // Store metadata in memory_metadata table
      await this.insertMetadataRecord(client, memoryId, finalMetadata);

      // Create waypoint connections
      const links = await this.createWaypointConnections(client, memory);

      // Store waypoint connections in database
      if (links.length > 0) {
        await this.storeWaypointLinks(client, links);
      }
      memory.links = links;

      // Commit transaction
      await this.db.commitTransaction(client);

      // Invalidate search cache after successful creation
      this.invalidateSearchCache();

      return memory;
    } catch (error) {
      // Rollback transaction on any error
      if (client) {
        await this.db.rollbackTransaction(client);
      }

      // Re-throw with context
      if (error instanceof MemoryValidationError || error instanceof MemoryCreationError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Connection failed")) {
        throw new MemoryTransactionError(
          "Database connection failed",
          "begin_transaction",
          error as Error
        );
      }

      throw new MemoryCreationError("Memory creation failed", error as Error);
    }
  }

  /**
   * Validate memory content
   */
  private validateContent(content: MemoryContent): void {
    if (!content.content || content.content.trim().length === 0) {
      throw new MemoryValidationError("Content cannot be empty", "content", content.content);
    }

    if (!content.userId || content.userId.trim().length === 0) {
      throw new MemoryValidationError("userId is required", "userId", content.userId);
    }

    if (!VALID_SECTORS.includes(content.primarySector)) {
      throw new MemoryValidationError(
        "Invalid memory sector",
        "primarySector",
        content.primarySector
      );
    }
  }

  /**
   * Validate metadata
   */
  private validateMetadata(metadata: MemoryMetadata): void {
    if (metadata.importance !== undefined) {
      if (metadata.importance < 0 || metadata.importance > 1) {
        throw new MemoryValidationError(
          "Importance must be between 0 and 1",
          "importance",
          metadata.importance
        );
      }
    }
  }

  /**
   * Calculate salience from content and metadata
   * Salience indicates how attention-grabbing or significant the memory is
   */
  private calculateSalience(content: string, metadata?: MemoryMetadata): number {
    let salience = 0.5; // Default baseline

    // High-salience keywords boost salience
    const highSalienceWords = [
      "important",
      "urgent",
      "critical",
      "essential",
      "vital",
      "crucial",
      "emergency",
      "priority",
      "significant",
      "major",
    ];

    const contentLower = content.toLowerCase();
    const matchCount = highSalienceWords.filter((word) => contentLower.includes(word)).length;

    // Each match adds 0.1, capped at 1.0
    salience = Math.min(1.0, salience + matchCount * 0.1);

    // Metadata importance influences salience
    if (metadata?.importance !== undefined) {
      salience = (salience + metadata.importance) / 2;
    }

    return Math.max(0, Math.min(1.0, salience));
  }

  /**
   * Extract metadata from content or use provided metadata
   */
  private extractMetadata(content: string, provided?: MemoryMetadata): MemoryMetadata {
    const metadata: MemoryMetadata = {
      keywords: provided?.keywords ?? this.extractKeywords(content),
      tags: provided?.tags ?? [],
      category: provided?.category ?? "general",
      context: provided?.context ?? "",
      importance: provided?.importance ?? 0.5,
      isAtomic: provided?.isAtomic ?? true,
      parentId: provided?.parentId,
    };

    return metadata;
  }

  /**
   * Extract keywords from content
   * Simple extraction based on word frequency and length
   */
  private extractKeywords(content: string): string[] {
    // Remove punctuation and split into words
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3); // Only words longer than 3 chars

    // Common stop words to filter out
    const stopWords = new Set([
      "this",
      "that",
      "with",
      "from",
      "have",
      "been",
      "were",
      "will",
      "would",
      "could",
      "should",
      "about",
      "which",
      "their",
      "there",
      "these",
      "those",
    ]);

    // Count word frequency
    const wordFreq = new Map<string, number>();
    words.forEach((word) => {
      if (!stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
      }
    });

    // Get top keywords by frequency
    const keywords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return keywords;
  }

  /**
   * Insert memory record into database
   */
  private async insertMemoryRecord(client: PoolClient, memory: Memory): Promise<void> {
    const query = `
      INSERT INTO memories (
        id, content, created_at, last_accessed, access_count,
        salience, decay_rate, strength, user_id, session_id, primary_sector
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      memory.id,
      memory.content,
      memory.createdAt,
      memory.lastAccessed,
      memory.accessCount,
      memory.salience,
      memory.decayRate,
      memory.strength,
      memory.userId,
      memory.sessionId,
      memory.primarySector,
    ];

    await client.query(query, values);
  }

  /**
   * Insert metadata record into database
   */
  private async insertMetadataRecord(
    client: PoolClient,
    memoryId: string,
    metadata: MemoryMetadata
  ): Promise<void> {
    const query = `
      INSERT INTO memory_metadata (
        memory_id, keywords, tags, category, context, importance, is_atomic, parent_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const values = [
      memoryId,
      metadata.keywords ?? [],
      metadata.tags ?? [],
      metadata.category ?? null,
      metadata.context ?? null,
      metadata.importance ?? 0.5,
      metadata.isAtomic ?? true,
      metadata.parentId ?? null,
    ];

    await client.query(query, values);
  }

  /**
   * Create waypoint connections to similar memories
   *
   * This method finds existing memories for the same user and creates
   * waypoint links to the most similar ones. It pre-loads embeddings
   * for candidate memories to ensure accurate similarity calculation.
   */
  private async createWaypointConnections(client: PoolClient, memory: Memory): Promise<Link[]> {
    try {
      // Find existing memories for the same user with metadata
      // Join with memory_metadata to get keywords, tags, category for accurate similarity calculation
      const candidatesQuery = `
        SELECT m.*,
               md.keywords,
               md.tags,
               md.category,
               md.context,
               md.importance,
               md.is_atomic,
               md.parent_id
        FROM memories m
        LEFT JOIN memory_metadata md ON m.id = md.memory_id
        WHERE m.user_id = $1 AND m.id != $2
        ORDER BY m.created_at DESC
        LIMIT 100
      `;

      const result = await client.query(candidatesQuery, [memory.userId, memory.id]);

      if (result.rows.length === 0) {
        // First memory for this user, no connections to create
        return [];
      }

      // Convert rows to Memory objects with metadata
      const candidates = result.rows.map((row: Record<string, unknown>) =>
        this.rowToMemoryWithMetadata(row)
      );
      Logger.debug(`Found ${candidates.length} candidates for waypoint connections`);

      // Pre-load embeddings for all candidates to ensure accurate similarity calculation
      // This is done outside the transaction to avoid isolation issues
      const candidatesWithEmbeddings = await this.loadEmbeddingsForCandidates(candidates);

      // Create waypoint links using graph builder
      const result2 = await this.graphBuilder.createWaypointLinks(
        this.convertToGraphMemory(memory),
        candidatesWithEmbeddings.map((c: Memory) => this.convertToGraphMemory(c))
      );

      Logger.debug(`Created ${result2.links.length} waypoint links`);
      return result2.links;
    } catch (error) {
      // Waypoint connection creation is non-critical, log error and continue
      Logger.error("Error creating waypoint connections:", error);
      return [];
    }
  }

  /**
   * Load embeddings for candidate memories
   *
   * Pre-loads all sector embeddings for candidate memories to ensure
   * accurate similarity calculation in the waypoint graph builder.
   */
  private async loadEmbeddingsForCandidates(candidates: Memory[]): Promise<Memory[]> {
    const candidatesWithEmbeddings: Memory[] = [];

    for (const candidate of candidates) {
      try {
        const embeddings = await this.embeddingStorage.retrieveEmbeddings(candidate.id);
        candidatesWithEmbeddings.push({
          ...candidate,
          embeddings,
        });
      } catch (error) {
        // If embeddings can't be loaded, include candidate without embeddings
        // The waypoint builder will use fallback similarity calculation
        Logger.debug(`Could not load embeddings for candidate ${candidate.id}:`, error);
        candidatesWithEmbeddings.push(candidate);
      }
    }

    return candidatesWithEmbeddings;
  }

  /**
   * Store waypoint links in the database
   * Creates bidirectional connections in memory_links table
   */
  private async storeWaypointLinks(client: PoolClient, links: Link[]): Promise<void> {
    for (const link of links) {
      // Validate no self-links before storing
      if (link.sourceId === link.targetId) {
        Logger.warn(`Skipping self-link for memory ${link.sourceId}`);
        continue;
      }

      // Store connection using the link's sourceId and targetId
      // (links already contain both forward and reverse connections if bidirectional)
      await client.query(
        `INSERT INTO memory_links (source_id, target_id, link_type, weight)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (source_id, target_id) DO UPDATE SET
           link_type = $3,
           weight = $4,
           traversal_count = memory_links.traversal_count + 1`,
        [link.sourceId, link.targetId, link.linkType, link.weight]
      );
    }
  }

  /**
   * Convert our Memory type to graph Memory type
   * Includes embeddings when available to avoid transaction isolation issues
   */
  private convertToGraphMemory(memory: Memory): import("../graph/types").Memory {
    return {
      id: memory.id,
      content: memory.content,
      createdAt: memory.createdAt,
      lastAccessed: memory.lastAccessed,
      accessCount: memory.accessCount,
      salience: memory.salience,
      strength: memory.strength,
      userId: memory.userId,
      sessionId: memory.sessionId,
      primarySector: memory.primarySector,
      metadata: {
        keywords: memory.metadata.keywords ?? [],
        tags: memory.metadata.tags ?? [],
        category: memory.metadata.category ?? "",
        context: memory.metadata.context ?? "",
        importance: memory.metadata.importance ?? 0.5,
        isAtomic: memory.metadata.isAtomic ?? true,
        parentId: memory.metadata.parentId,
      },
      embeddings: memory.embeddings,
    };
  }

  /**
   * Retrieve a single memory by ID
   *
   * Requirements:
   * - 2.1: Single memory retrieval
   * - 2.2: Include embeddings and metadata
   * - 2.3: Include waypoint connections
   * - 2.4: User isolation (verify ownership)
   * - 2.5: Fast retrieval (<50ms)
   *
   * @param memoryId - ID of memory to retrieve
   * @param userId - User ID for ownership verification
   * @returns Memory object with embeddings and links, or null if not found
   */
  async retrieve(memoryId: string, userId: string): Promise<Memory | null> {
    // Validate input
    this.validateMemoryId(memoryId);
    this.validateUserId(userId);

    let client: PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Query memory with metadata
      const query = `
        SELECT
          m.*,
          md.keywords,
          md.tags,
          md.category,
          md.context,
          md.importance,
          md.is_atomic,
          md.parent_id
        FROM memories m
        LEFT JOIN memory_metadata md ON m.id = md.memory_id
        WHERE m.id = $1 AND m.user_id = $2
      `;

      const result = await client.query(query, [memoryId, userId]);

      if (result.rows.length === 0) {
        return null; // Memory not found or doesn't belong to user
      }

      const memory = this.rowToMemoryWithMetadata(result.rows[0]);

      // Retrieve embeddings
      try {
        const embeddings = await this.embeddingStorage.retrieveEmbeddings(memoryId);
        memory.embeddings = embeddings;
      } catch (error) {
        // Embeddings are optional, continue without them
        Logger.warn(`Failed to retrieve embeddings for memory ${memoryId}:`, error);
      }

      // Retrieve waypoint links
      try {
        const linksQuery = `
          SELECT source_id, target_id, link_type, weight, created_at, traversal_count
          FROM memory_links
          WHERE source_id = $1 OR target_id = $1
        `;

        const linksResult = await client.query(linksQuery, [memoryId]);
        memory.links = linksResult.rows.map((row: Record<string, unknown>) => ({
          sourceId: row.source_id as string,
          targetId: row.target_id as string,
          linkType: row.link_type as LinkType,
          weight: row.weight as number,
          createdAt: new Date(row.created_at as string),
          traversalCount: row.traversal_count as number,
        }));
      } catch (error) {
        // Links are optional, continue without them
        Logger.warn(`Failed to retrieve links for memory ${memoryId}:`, error);
        memory.links = [];
      }

      return memory;
    } catch (error) {
      Logger.error("Memory retrieval failed:", error);

      if (error instanceof MemoryValidationError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes("Connection")) {
        throw new MemoryTransactionError("Database connection failed", "retrieve", error);
      }

      throw new Error(
        `Memory retrieval failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Generate cache key for search query
   */
  private generateSearchCacheKey(query: import("./types").SearchQuery): string {
    const queryStr = JSON.stringify({
      userId: query.userId,
      text: query.text,
      sectors: query.sectors,
      primarySector: query.primarySector,
      minStrength: query.minStrength,
      minSalience: query.minSalience,
      dateRange: query.dateRange,
      metadata: query.metadata,
      limit: query.limit,
      offset: query.offset,
    });

    return createHash("sha256").update(queryStr).digest("hex");
  }

  /**
   * Get cache metrics (exposed for testing and monitoring)
   */
  getCacheMetrics(): { hits: number; misses: number; hitRate: number; size: number } {
    return this.searchCache.getMetrics();
  }

  /**
   * Invalidate search cache
   * Clears both vector search cache and full-text search cache
   */
  private invalidateSearchCache(): void {
    this.searchCache.clear();
    // Also clear full-text search cache to ensure deleted memories don't appear in search results
    this.fullTextSearchEngine.clearCache();
  }

  /**
   * Search for memories with composite scoring and filtering
   *
   * Requirements:
   * - 2.2: Composite scoring (0.6×similarity + 0.2×salience + 0.1×recency + 0.1×link_weight)
   * - 2.3: Multi-sector similarity search
   * - 2.4: Filtering and pagination
   * - 2.5: Performance (<200ms p95 for 100k memories)
   * - 5.1: Use salience-weighted ranking when no text query provided
   * - 5.2: Use (0.4×salience + 0.3×recency + 0.3×linkWeight) for non-text queries
   * - 5.3: Include ranking method indicator in response
   *
   * @param query - Search query with filters and pagination
   * @returns Search results with ranked memories and scores
   */
  async search(query: import("./types").SearchQuery): Promise<import("./types").SearchResult> {
    const startTime = Date.now();

    // Determine ranking method based on whether text query is provided
    const hasTextQuery = !!query.text;
    const rankingMethod: import("./types").RankingMethod = hasTextQuery ? "similarity" : "salience";

    // Check cache first
    const cacheKey = this.generateSearchCacheKey(query);
    const cachedResult = this.searchCache.get(cacheKey);

    if (cachedResult) {
      // Return cached result with updated processing time
      return {
        ...cachedResult,
        processingTime: Math.max(1, Date.now() - startTime),
      };
    }

    let client: PoolClient | null = null;

    try {
      this.validateSearchQuery(query);

      const similarityScores = hasTextQuery
        ? await this.performVectorSearch(query)
        : new Map<string, number>();

      const { sql, params } = this.buildFilterQuery(query, similarityScores);

      client = await this.db.getConnection();
      const result = await client.query(sql, params);
      const rows = result.rows;

      const { memories, scores } = await this.processSearchResults(
        rows,
        query,
        similarityScores,
        hasTextQuery
      );

      const paginatedMemories = this.applyPagination(memories, scores, query);

      const processingTime = Math.max(1, Date.now() - startTime);

      const searchResult: import("./types").SearchResult = {
        memories: paginatedMemories,
        totalCount: memories.length,
        scores,
        processingTime,
        rankingMethod,
      };

      // Cache the result
      this.searchCache.set(cacheKey, searchResult);

      return searchResult;
    } catch (error) {
      return this.handleSearchError(error);
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Process search results by calculating scores and filtering
   *
   * Requirements:
   * - 5.1: Use salience-weighted ranking when no text query provided
   * - 5.2: Use appropriate scoring formula based on query type
   */
  private async processSearchResults(
    rows: Record<string, unknown>[],
    query: import("./types").SearchQuery,
    similarityScores: Map<string, number>,
    hasTextQuery: boolean
  ): Promise<{ memories: Memory[]; scores: Map<string, import("./types").CompositeScore> }> {
    const scores = new Map<string, import("./types").CompositeScore>();
    const memories: Memory[] = [];

    const memoryIds = rows.map((row) => row.id as string);
    const linkWeights = await this.calculateLinkWeights(memoryIds);

    for (const row of rows) {
      const memory = this.rowToMemoryWithMetadata(row);

      if (!this.matchesFilters(memory, query, similarityScores)) {
        continue;
      }

      const similarity = similarityScores.get(memory.id) ?? 0;
      const recency = this.calculateRecencyScore(memory.createdAt);
      const linkWeight = linkWeights.get(memory.id) ?? 0;

      const compositeScore = this.calculateCompositeScore(
        similarity,
        memory.salience,
        recency,
        linkWeight,
        hasTextQuery
      );

      scores.set(memory.id, compositeScore);
      memories.push(memory);
    }

    return { memories, scores };
  }

  /**
   * Apply pagination to sorted memories
   */
  private applyPagination(
    memories: Memory[],
    scores: Map<string, import("./types").CompositeScore>,
    query: import("./types").SearchQuery
  ): Memory[] {
    memories.sort((a, b) => {
      const scoreA = scores.get(a.id)?.total ?? 0;
      const scoreB = scores.get(b.id)?.total ?? 0;
      return scoreB - scoreA;
    });

    const limit = Math.min(query.limit ?? 10, 100);
    const offset = query.offset ?? 0;
    return memories.slice(offset, offset + limit);
  }

  /**
   * Handle search errors with appropriate error types
   */
  private handleSearchError(error: unknown): never {
    Logger.error("Memory search failed:", error);

    if (error instanceof MemoryValidationError) {
      throw error;
    }

    if (error instanceof Error && error.message.includes("Embedding")) {
      throw new MemoryCreationError("Embedding generation failed", error);
    }

    if (error instanceof Error && error.message.includes("Connection")) {
      throw new MemoryTransactionError("Database connection failed", "search", error);
    }

    throw new Error(
      `Memory search failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  /**
   * Perform vector similarity search across sectors
   *
   * @param query - Search query with optional minSimilarity threshold
   * @returns Map of memory IDs to similarity scores
   *
   * The minSimilarity parameter controls how strict the relevance matching is:
   * - 0.7+ : High relevance - only very similar memories (recommended for focused queries)
   * - 0.5 (default): Moderate relevance - balanced results
   * - 0.3 : Low relevance - broader results, may include tangentially related memories
   */
  private async performVectorSearch(
    query: import("./types").SearchQuery
  ): Promise<Map<string, number>> {
    if (!query.text) {
      return new Map();
    }

    // Generate query embedding (use semantic for general queries)
    // Let embedding errors propagate - don't catch them here
    const queryEmbedding = await this.embeddingEngine.generateSemanticEmbedding(query.text);

    // Determine sectors to search
    const sectors = query.sectors ?? [
      "episodic",
      "semantic",
      "procedural",
      "emotional",
      "reflective",
    ];

    // Search each sector with configurable similarity threshold
    const similarityMap = new Map<string, number>();
    const limit = (query.limit ?? 10) * 2; // Get more candidates for filtering
    const minSimilarity = query.minSimilarity ?? 0.5; // Default threshold

    for (const sector of sectors) {
      const results = await this.embeddingStorage.vectorSimilaritySearch(
        queryEmbedding,
        sector as import("../embeddings/types").MemorySector,
        limit,
        minSimilarity
      );

      // Merge results, keeping highest similarity per memory
      for (const result of results) {
        const existing = similarityMap.get(result.memoryId);
        if (!existing || result.similarity > existing) {
          similarityMap.set(result.memoryId, result.similarity);
        }
      }
    }

    return similarityMap;
  }

  /**
   * Build dynamic filter query
   * Properly combines similarity search results with other filters using AND logic
   */
  private buildFilterQuery(
    query: import("./types").SearchQuery,
    similarityScores: Map<string, number>
  ): { sql: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Add all filter conditions using helper methods
    // userId filter is always required for security
    paramIndex = this.addUserIdFilter(conditions, params, paramIndex, query);

    // If we have similarity scores from vector search, filter to those IDs
    // This is combined with other filters using AND logic
    if (similarityScores.size > 0) {
      paramIndex = this.addSimilarityFilter(conditions, params, paramIndex, similarityScores);
    }

    // Add all other filters - these will be combined with AND logic
    paramIndex = this.addSectorFilter(conditions, params, paramIndex, query);
    paramIndex = this.addStrengthFilter(conditions, params, paramIndex, query);
    paramIndex = this.addSalienceFilter(conditions, params, paramIndex, query);
    paramIndex = this.addDateRangeFilter(conditions, params, paramIndex, query);
    this.addMetadataFilters(conditions, params, paramIndex, query);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        m.*,
        md.keywords,
        md.tags,
        md.category,
        md.context,
        md.importance,
        md.is_atomic,
        md.parent_id
      FROM memories m
      LEFT JOIN memory_metadata md ON m.id = md.memory_id
      ${whereClause}
      ORDER BY m.created_at DESC
    `;

    return { sql, params };
  }

  /**
   * Add userId filter (always required for security)
   */
  private addUserIdFilter(
    conditions: string[],
    params: unknown[],
    paramIndex: number,
    query: import("./types").SearchQuery
  ): number {
    conditions.push(`m.user_id = $${paramIndex}`);
    params.push(query.userId);
    return paramIndex + 1;
  }

  /**
   * Add similarity filter if similarity scores available
   */
  private addSimilarityFilter(
    conditions: string[],
    params: unknown[],
    paramIndex: number,
    similarityScores: Map<string, number>
  ): number {
    if (similarityScores.size > 0) {
      const memoryIds = Array.from(similarityScores.keys());
      conditions.push(`m.id = ANY($${paramIndex})`);
      params.push(memoryIds);
      return paramIndex + 1;
    }
    return paramIndex;
  }

  /**
   * Add primary sector filter
   */
  private addSectorFilter(
    conditions: string[],
    params: unknown[],
    paramIndex: number,
    query: import("./types").SearchQuery
  ): number {
    if (query.primarySector) {
      conditions.push(`m.primary_sector = $${paramIndex}`);
      params.push(query.primarySector);
      return paramIndex + 1;
    }
    return paramIndex;
  }

  /**
   * Add minimum strength filter
   */
  private addStrengthFilter(
    conditions: string[],
    params: unknown[],
    paramIndex: number,
    query: import("./types").SearchQuery
  ): number {
    // Always filter out soft-deleted memories (strength=0) unless explicitly requesting them
    // Use provided minStrength or default to 0.01 to exclude strength=0
    const effectiveMinStrength = query.minStrength ?? 0.01;
    conditions.push(`m.strength >= $${paramIndex}`);
    params.push(effectiveMinStrength);
    return paramIndex + 1;
  }

  /**
   * Add minimum salience filter
   */
  private addSalienceFilter(
    conditions: string[],
    params: unknown[],
    paramIndex: number,
    query: import("./types").SearchQuery
  ): number {
    if (query.minSalience !== undefined) {
      conditions.push(`m.salience >= $${paramIndex}`);
      params.push(query.minSalience);
      return paramIndex + 1;
    }
    return paramIndex;
  }

  /**
   * Add date range filter
   */
  private addDateRangeFilter(
    conditions: string[],
    params: unknown[],
    paramIndex: number,
    query: import("./types").SearchQuery
  ): number {
    if (query.dateRange) {
      if (query.dateRange.start) {
        conditions.push(`m.created_at >= $${paramIndex}`);
        params.push(query.dateRange.start);
        paramIndex++;
      }
      if (query.dateRange.end) {
        conditions.push(`m.created_at <= $${paramIndex}`);
        params.push(query.dateRange.end);
        paramIndex++;
      }
    }
    return paramIndex;
  }

  /**
   * Add metadata filters (keywords, tags, category)
   */
  private addMetadataFilters(
    conditions: string[],
    params: unknown[],
    paramIndex: number,
    query: import("./types").SearchQuery
  ): number {
    // Filter by metadata keywords (array overlap)
    if (query.metadata?.keywords && query.metadata.keywords.length > 0) {
      conditions.push(`md.keywords && $${paramIndex}`);
      params.push(query.metadata.keywords);
      paramIndex++;
    }

    // Filter by metadata tags (array overlap)
    if (query.metadata?.tags && query.metadata.tags.length > 0) {
      conditions.push(`md.tags && $${paramIndex}`);
      params.push(query.metadata.tags);
      paramIndex++;
    }

    // Filter by metadata category
    if (query.metadata?.category) {
      conditions.push(`md.category = $${paramIndex}`);
      params.push(query.metadata.category);
      paramIndex++;
    }

    return paramIndex;
  }

  /**
   * Check if memory matches all filters (client-side validation)
   * This provides a safety net for mock databases and ensures correctness
   */
  private matchesFilters(
    memory: Memory,
    query: import("./types").SearchQuery,
    similarityScores: Map<string, number>
  ): boolean {
    if (memory.userId !== query.userId) {
      return false;
    }

    if (similarityScores.size > 0 && !similarityScores.has(memory.id)) {
      return false;
    }

    if (query.primarySector && memory.primarySector !== query.primarySector) {
      return false;
    }

    if (!this.matchesStrengthSalience(memory, query)) {
      return false;
    }

    if (!this.matchesDateRange(memory, query)) {
      return false;
    }

    if (!this.matchesMetadataFilters(memory, query)) {
      return false;
    }

    return true;
  }

  /**
   * Check if memory matches strength and salience filters
   * By default, excludes soft-deleted memories (strength=0)
   */
  private matchesStrengthSalience(memory: Memory, query: import("./types").SearchQuery): boolean {
    // Always exclude soft-deleted memories (strength=0) unless explicitly requested
    // This ensures soft-deleted memories don't appear in normal retrieval
    const effectiveMinStrength = query.minStrength ?? 0.01; // Default: exclude strength=0
    if (memory.strength < effectiveMinStrength) {
      return false;
    }

    if (query.minSalience !== undefined && memory.salience < query.minSalience) {
      return false;
    }

    return true;
  }

  /**
   * Check if memory matches date range filter
   */
  private matchesDateRange(memory: Memory, query: import("./types").SearchQuery): boolean {
    if (!query.dateRange) {
      return true;
    }

    if (query.dateRange.start && memory.createdAt < query.dateRange.start) {
      return false;
    }

    if (query.dateRange.end && memory.createdAt > query.dateRange.end) {
      return false;
    }

    return true;
  }

  /**
   * Check if memory matches metadata filters
   */
  private matchesMetadataFilters(memory: Memory, query: import("./types").SearchQuery): boolean {
    if (!query.metadata) {
      return true;
    }

    if (query.metadata.keywords && query.metadata.keywords.length > 0) {
      const hasKeyword = memory.metadata.keywords?.some(
        (k) => query.metadata?.keywords?.includes(k) ?? false
      );
      if (!hasKeyword) {
        return false;
      }
    }

    if (query.metadata.tags && query.metadata.tags.length > 0) {
      const hasTag = memory.metadata.tags?.some((t) => query.metadata?.tags?.includes(t) ?? false);
      if (!hasTag) {
        return false;
      }
    }

    if (query.metadata.category && memory.metadata.category !== query.metadata.category) {
      return false;
    }

    return true;
  }

  /**
   * Calculate recency score (0-1, newer = higher)
   * 1 year old = 0.0, brand new = 1.0
   */
  private calculateRecencyScore(createdAt: Date): number {
    const ageMs = Date.now() - createdAt.getTime();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    const recency = Math.max(0, 1.0 - ageMs / oneYearMs);
    return Math.min(1.0, recency);
  }

  /**
   * Calculate link weights for memories
   *
   * Considers both source and target links since waypoint connections are bidirectional.
   * A memory can be connected as either source_id or target_id in the memory_links table.
   *
   * Requirements: 14.4 - linkWeight SHALL reflect actual link connections
   */
  private async calculateLinkWeights(memoryIds: string[]): Promise<Map<string, number>> {
    if (memoryIds.length === 0) {
      return new Map();
    }

    const client = await this.db.getConnection();
    try {
      // Query both source and target links since connections are bidirectional
      // This ensures linkWeight reflects all actual connections for each memory
      const query = `
        SELECT
          memory_id,
          AVG(weight) as avg_weight
        FROM (
          SELECT source_id as memory_id, weight FROM memory_links WHERE source_id = ANY($1)
          UNION ALL
          SELECT target_id as memory_id, weight FROM memory_links WHERE target_id = ANY($1)
        ) combined
        GROUP BY memory_id
      `;

      const result = await client.query(query, [memoryIds]);
      const linkWeights = new Map<string, number>();

      for (const row of result.rows) {
        linkWeights.set(row.memory_id as string, (row.avg_weight as number) ?? 0);
      }

      return linkWeights;
    } catch {
      // Link weight calculation is non-critical
      return new Map();
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Calculate composite score with weights
   *
   * When hasTextQuery is true (similarity-based ranking):
   *   Formula: 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×linkWeight
   *
   * When hasTextQuery is false (salience-based ranking):
   *   Formula: 0.4×salience + 0.3×recency + 0.3×linkWeight
   *
   * Requirements:
   * - 5.1: Use salience-weighted ranking when no text query provided
   * - 5.2: Use (0.4×salience + 0.3×recency + 0.3×linkWeight) for non-text queries
   */
  private calculateCompositeScore(
    similarity: number,
    salience: number,
    recency: number,
    linkWeight: number,
    hasTextQuery: boolean = true
  ): import("./types").CompositeScore {
    let total: number;

    if (hasTextQuery) {
      // Similarity-based scoring: 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×linkWeight
      total = 0.6 * similarity + 0.2 * salience + 0.1 * recency + 0.1 * linkWeight;
    } else {
      // Salience-based scoring: 0.4×salience + 0.3×recency + 0.3×linkWeight
      total = 0.4 * salience + 0.3 * recency + 0.3 * linkWeight;
    }

    return {
      total: Math.max(0, Math.min(1.0, total)),
      similarity: Math.max(0, Math.min(1.0, similarity)),
      salience: Math.max(0, Math.min(1.0, salience)),
      recency: Math.max(0, Math.min(1.0, recency)),
      linkWeight: Math.max(0, Math.min(1.0, linkWeight)),
    };
  }

  /**
   * Convert database row to Memory object with metadata
   */
  private rowToMemoryWithMetadata(row: Record<string, unknown>): Memory {
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
      metadata: {
        keywords: (row.keywords as string[]) ?? [],
        tags: (row.tags as string[]) ?? [],
        category: (row.category as string) ?? "",
        context: (row.context as string) ?? "",
        importance: (row.importance as number) ?? 0.5,
        isAtomic: (row.is_atomic as boolean) ?? true,
        parentId: (row.parent_id as string) ?? undefined,
      },
    };
  }

  /**
   * Validate userId is provided
   */
  private validateUserId(userId: string | undefined): void {
    if (!userId || userId.trim().length === 0) {
      throw new MemoryValidationError("userId is required", "userId", userId);
    }
  }

  /**
   * Validate strength range (0-1)
   */
  private validateStrengthRange(strength: number | undefined, fieldName: string): void {
    if (strength !== undefined) {
      if (strength < 0 || strength > 1) {
        // Capitalize first letter for error message
        const displayName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
        throw new MemoryValidationError(
          `${displayName} must be between 0 and 1`,
          fieldName,
          strength
        );
      }
    }
  }

  /**
   * Validate salience range (0-1)
   */
  private validateSalienceRange(salience: number | undefined): void {
    if (salience !== undefined) {
      if (salience < 0 || salience > 1) {
        throw new MemoryValidationError(
          "minSalience must be between 0 and 1",
          "minSalience",
          salience
        );
      }
    }
  }

  /**
   * Validate date range
   */
  private validateDateRange(dateRange: { start?: Date; end?: Date } | undefined): void {
    if (dateRange) {
      if (dateRange.start && dateRange.end) {
        if (dateRange.end < dateRange.start) {
          throw new MemoryValidationError(
            "dateRange.end must be >= dateRange.start",
            "dateRange",
            dateRange
          );
        }
      }
    }
  }

  /**
   * Validate sectors array
   */
  private validateSectors(sectors: string[] | undefined): void {
    if (sectors) {
      for (const sector of sectors) {
        if (!VALID_SECTORS.includes(sector as MemorySectorType)) {
          throw new MemoryValidationError("Invalid memory sector", "sectors", sector);
        }
      }
    }
  }

  /**
   * Validate search query parameters
   */
  private validateSearchQuery(query: import("./types").SearchQuery): void {
    this.validateUserId(query.userId);
    this.validateStrengthRange(query.minStrength, "minStrength");
    this.validateSalienceRange(query.minSalience);
    this.validateDateRange(query.dateRange);
    this.validateSectors(query.sectors);
  }

  /**
   * Update an existing memory with selective field updates
   *
   * Requirements:
   * - 2.1: Update memory content and fields
   * - 2.2: Automatic embedding regeneration on content change
   * - 2.3: Waypoint connection updates
   * - 2.4: Metadata updates
   * - 2.5: Strength, salience, importance updates
   *
   * @param updates - Fields to update
   * @returns Updated memory with metadata about what changed
   */
  async update(
    updates: import("./types").UpdateMemoryInput
  ): Promise<import("./types").UpdateMemoryResult> {
    const startTime = Date.now();

    // Validate input
    this.validateUpdateInput(updates);

    let client: PoolClient | undefined;

    try {
      // Retrieve existing memory first (before transaction)
      const retrievalClient = await this.db.getConnection();
      let existingMemory: Memory;
      try {
        existingMemory = await this.retrieveExistingMemory(retrievalClient, updates.memoryId);
      } finally {
        this.db.releaseConnection(retrievalClient);
      }

      // Begin transaction
      client = await this.db.beginTransaction();

      // Verify ownership
      if (existingMemory.userId !== updates.userId) {
        throw new MemoryUpdateError("Memory does not belong to user");
      }

      // Track what changed
      let embeddingsRegenerated = false;
      let connectionsUpdated = false;

      // Update memory record
      const updatedMemory = await this.updateMemoryRecord(client, existingMemory, updates);

      // Update metadata if provided
      if (updates.metadata) {
        const mergedMetadata = await this.updateMetadataRecord(
          client,
          updates.memoryId,
          existingMemory,
          updates.metadata
        );
        // Assign merged metadata to the updated memory object
        updatedMemory.metadata = mergedMetadata;
      }

      // Regenerate embeddings if content changed
      if (updates.content !== undefined) {
        const embeddings = await this.embeddingEngine.generateAllSectorEmbeddings({
          text: updates.content,
          sector:
            existingMemory.primarySector as unknown as import("../embeddings/types").MemorySector,
        });
        updatedMemory.embeddings = embeddings;

        await this.embeddingStorage.storeEmbeddings(updates.memoryId, embeddings, "default");
        embeddingsRegenerated = true;

        // Update waypoint connections if content changed
        await this.deleteOldConnections(client, updates.memoryId);
        const links = await this.createWaypointConnections(client, updatedMemory);

        // Store updated waypoint connections in database
        if (links.length > 0) {
          await this.storeWaypointLinks(client, links);
        }
        updatedMemory.links = links;
        connectionsUpdated = true;
      }

      // Commit transaction
      await this.db.commitTransaction(client);

      // Invalidate search cache after successful update
      this.invalidateSearchCache();

      const processingTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms

      return {
        memory: updatedMemory,
        embeddingsRegenerated,
        connectionsUpdated,
        processingTime,
      };
    } catch (error) {
      // Rollback on error
      if (client) {
        await this.db.rollbackTransaction(client);
      }

      // Re-throw with context
      if (error instanceof MemoryValidationError || error instanceof MemoryUpdateError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Connection failed")) {
        throw new MemoryTransactionError(
          "Database connection failed",
          "begin_transaction",
          error as Error
        );
      }

      if (errorMessage.includes("Embedding")) {
        throw new MemoryCreationError("Embedding generation failed", error as Error);
      }

      throw new MemoryUpdateError("Memory update failed", error as Error);
    }
  }

  /**
   * Validate memoryId is provided
   */
  private validateMemoryId(memoryId: string | undefined): void {
    if (!memoryId || memoryId.trim().length === 0) {
      throw new MemoryValidationError("memoryId is required", "memoryId", memoryId);
    }
  }

  /**
   * Validate at least one update field is provided
   */
  private validateHasUpdates(updates: import("./types").UpdateMemoryInput): void {
    const hasUpdates =
      updates.content !== undefined ||
      updates.strength !== undefined ||
      updates.salience !== undefined ||
      updates.metadata !== undefined;

    if (!hasUpdates) {
      throw new MemoryValidationError("No fields to update", "updates", updates);
    }
  }

  /**
   * Validate content field
   */
  private validateContentField(content: string | undefined): void {
    if (content !== undefined) {
      if (content.trim().length === 0) {
        throw new MemoryValidationError("Content cannot be empty", "content", content);
      }
    }
  }

  /**
   * Validate metadata importance field
   */
  private validateMetadataImportance(metadata: { importance?: number } | undefined): void {
    if (metadata?.importance !== undefined) {
      if (metadata.importance < 0 || metadata.importance > 1) {
        throw new MemoryValidationError(
          "Importance must be between 0 and 1",
          "importance",
          metadata.importance
        );
      }
    }
  }

  /**
   * Validate update input
   */
  private validateUpdateInput(updates: import("./types").UpdateMemoryInput): void {
    this.validateMemoryId(updates.memoryId);
    this.validateUserId(updates.userId);
    this.validateHasUpdates(updates);
    this.validateContentField(updates.content);
    this.validateStrengthRange(updates.strength, "strength");
    this.validateStrengthRange(updates.salience, "salience");
    this.validateMetadataImportance(updates.metadata);
  }

  /**
   * Retrieve existing memory from database
   */
  private async retrieveExistingMemory(client: PoolClient, memoryId: string): Promise<Memory> {
    const query = `
      SELECT
        m.*,
        md.keywords,
        md.tags,
        md.category,
        md.context,
        md.importance,
        md.is_atomic,
        md.parent_id
      FROM memories m
      LEFT JOIN memory_metadata md ON m.id = md.memory_id
      WHERE m.id = $1
    `;

    const result = await client.query(query, [memoryId]);

    if (result.rows.length === 0) {
      throw new MemoryUpdateError("Memory not found");
    }

    return this.rowToMemoryWithMetadata(result.rows[0]);
  }

  /**
   * Update memory record in database
   */
  private async updateMemoryRecord(
    client: PoolClient,
    existingMemory: Memory,
    updates: import("./types").UpdateMemoryInput
  ): Promise<Memory> {
    const now = new Date();

    // Build update fields
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Always update lastAccessed
    fields.push(`last_accessed = $${paramIndex++}`);
    values.push(now);

    // Update content if provided
    if (updates.content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      values.push(updates.content);
    }

    // Update strength if provided
    if (updates.strength !== undefined) {
      fields.push(`strength = $${paramIndex++}`);
      values.push(updates.strength);
    }

    // Update salience if provided
    if (updates.salience !== undefined) {
      fields.push(`salience = $${paramIndex++}`);
      values.push(updates.salience);
    }

    // Add memoryId as last parameter
    values.push(existingMemory.id);

    const query = `
      UPDATE memories
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    await client.query(query, values);

    // Build updated memory object
    const updatedMemory: Memory = {
      ...existingMemory,
      content: updates.content ?? existingMemory.content,
      strength: updates.strength ?? existingMemory.strength,
      salience: updates.salience ?? existingMemory.salience,
      lastAccessed: now,
    };

    return updatedMemory;
  }

  /**
   * Update metadata record in database using MetadataMerger
   *
   * Requirements:
   * - 9.1: Partial update merges with existing metadata
   * - 9.2: Existing fields are replaced with new values
   * - 9.3: New fields are added to existing metadata
   * - 9.4: Fields set to null are removed
   * - 9.5: Empty update preserves existing metadata
   *
   * @returns The merged metadata object to be assigned to the updated memory
   */
  private async updateMetadataRecord(
    client: PoolClient,
    memoryId: string,
    existingMemory: Memory,
    metadata: MetadataUpdate
  ): Promise<MemoryMetadata> {
    // Use MetadataMerger to merge update with existing metadata
    const mergeResult = this.metadataMerger.merge(existingMemory.metadata, metadata);

    // Check if there are any changes
    if (
      mergeResult.updatedFields.length === 0 &&
      mergeResult.removedFields.length === 0 &&
      mergeResult.addedFields.length === 0
    ) {
      return existingMemory.metadata; // No changes to apply (Requirement 9.5)
    }

    // Build the update query with all merged fields
    // We need to update all fields to ensure removed fields are set to NULL
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Add all metadata fields from merged result
    // For removed fields, we explicitly set them to NULL
    // Create query parts object for cleaner parameter passing
    const queryParts = { fields, values, paramIndex };

    paramIndex = this.addMetadataFieldUpdateWithNull(queryParts, {
      dbColumnName: "keywords",
      value: mergeResult.merged.keywords,
      isRemoved: mergeResult.removedFields.includes("keywords"),
    });
    queryParts.paramIndex = paramIndex;

    paramIndex = this.addMetadataFieldUpdateWithNull(queryParts, {
      dbColumnName: "tags",
      value: mergeResult.merged.tags,
      isRemoved: mergeResult.removedFields.includes("tags"),
    });
    queryParts.paramIndex = paramIndex;

    paramIndex = this.addMetadataFieldUpdateWithNull(queryParts, {
      dbColumnName: "category",
      value: mergeResult.merged.category,
      isRemoved: mergeResult.removedFields.includes("category"),
    });
    queryParts.paramIndex = paramIndex;

    paramIndex = this.addMetadataFieldUpdateWithNull(queryParts, {
      dbColumnName: "context",
      value: mergeResult.merged.context,
      isRemoved: mergeResult.removedFields.includes("context"),
    });
    queryParts.paramIndex = paramIndex;

    paramIndex = this.addMetadataFieldUpdateWithNull(queryParts, {
      dbColumnName: "importance",
      value: mergeResult.merged.importance,
      isRemoved: mergeResult.removedFields.includes("importance"),
    });
    queryParts.paramIndex = paramIndex;

    paramIndex = this.addMetadataFieldUpdateWithNull(queryParts, {
      dbColumnName: "is_atomic",
      value: mergeResult.merged.isAtomic,
      isRemoved: mergeResult.removedFields.includes("isAtomic"),
    });
    queryParts.paramIndex = paramIndex;

    paramIndex = this.addMetadataFieldUpdateWithNull(queryParts, {
      dbColumnName: "parent_id",
      value: mergeResult.merged.parentId,
      isRemoved: mergeResult.removedFields.includes("parentId"),
    });

    if (fields.length === 0) {
      return mergeResult.merged; // No database update needed, but return merged metadata
    }

    // Add memoryId as last parameter
    values.push(memoryId);

    const query = `
      UPDATE memory_metadata
      SET ${fields.join(", ")}
      WHERE memory_id = $${paramIndex}
    `;

    await client.query(query, values);

    // Return merged metadata to be assigned to the updated memory
    return mergeResult.merged;
  }

  /**
   * Add metadata field to update query, handling null values for removal
   *
   * @param queryParts - Object containing fields array, values array, and current paramIndex
   * @param fieldInfo - Object containing dbColumnName, value, and isRemoved flag
   * @returns Next parameter index
   */
  private addMetadataFieldUpdateWithNull(
    queryParts: { fields: string[]; values: unknown[]; paramIndex: number },
    fieldInfo: { dbColumnName: string; value: unknown; isRemoved: boolean }
  ): number {
    const { fields, values, paramIndex } = queryParts;
    const { dbColumnName, value, isRemoved } = fieldInfo;

    // If field was explicitly removed, set to NULL
    if (isRemoved) {
      fields.push(`${dbColumnName} = $${paramIndex}`);
      values.push(null);
      return paramIndex + 1;
    }
    // If field has a value, update it
    if (value !== undefined) {
      fields.push(`${dbColumnName} = $${paramIndex}`);
      values.push(value);
      return paramIndex + 1;
    }
    return paramIndex;
  }

  /**
   * Delete old waypoint connections
   */
  private async deleteOldConnections(client: PoolClient, memoryId: string): Promise<void> {
    const query = `
      DELETE FROM memory_links
      WHERE source_id = $1 OR target_id = $1
    `;

    await client.query(query, [memoryId]);
  }

  /**
   * Validate batch delete input
   */
  private validateBatchDeleteInput(memoryIds: string[]): void {
    if (!memoryIds || memoryIds.length === 0) {
      throw new MemoryValidationError("Memory IDs array cannot be empty", "memoryIds", memoryIds);
    }

    for (const memoryId of memoryIds) {
      if (!memoryId || memoryId.trim().length === 0) {
        throw new MemoryValidationError("Memory ID cannot be empty", "memoryId", memoryId);
      }
    }
  }

  /**
   * Perform soft delete (set strength to 0)
   */
  private async performSoftDelete(
    client: PoolClient,
    memoryIds: string[]
  ): Promise<{ successCount: number; failures: Array<{ memoryId: string; error: string }> }> {
    const checkQuery = `SELECT id FROM memories WHERE id = ANY($1)`;
    const checkResult = await client.query(checkQuery, [memoryIds]);
    const existingIds = checkResult.rows.map((row: Record<string, unknown>) => row.id as string);

    const failures: Array<{ memoryId: string; error: string }> = [];
    for (const memoryId of memoryIds) {
      if (!existingIds.includes(memoryId)) {
        failures.push({ memoryId, error: "Memory not found" });
      }
    }

    let successCount = 0;
    if (existingIds.length > 0) {
      const updateQuery = `UPDATE memories SET strength = 0 WHERE id = ANY($1)`;
      await client.query(updateQuery, [existingIds]);
      successCount = existingIds.length;
    }

    return { successCount, failures };
  }

  /**
   * Perform hard delete (remove records with cascade)
   */
  private async performHardDelete(
    client: PoolClient,
    memoryIds: string[]
  ): Promise<{ successCount: number; failures: Array<{ memoryId: string; error: string }> }> {
    const checkQuery = `SELECT id FROM memories WHERE id = ANY($1)`;
    const checkResult = await client.query(checkQuery, [memoryIds]);
    const existingIds = checkResult.rows.map((row: Record<string, unknown>) => row.id as string);

    const failures: Array<{ memoryId: string; error: string }> = [];
    for (const memoryId of memoryIds) {
      if (!existingIds.includes(memoryId)) {
        failures.push({ memoryId, error: "Memory not found" });
      }
    }

    let successCount = 0;
    if (existingIds.length > 0) {
      // Explicitly delete related data to ensure proper cleanup
      // regardless of CASCADE constraint state in the database
      await client.query(`DELETE FROM memory_links WHERE source_id = ANY($1)`, [existingIds]);
      await client.query(`DELETE FROM memory_links WHERE target_id = ANY($1)`, [existingIds]);
      await client.query(`DELETE FROM memory_metadata WHERE memory_id = ANY($1)`, [existingIds]);
      await client.query(`DELETE FROM memory_embeddings WHERE memory_id = ANY($1)`, [existingIds]);

      const deleteQuery = `DELETE FROM memories WHERE id = ANY($1)`;
      await client.query(deleteQuery, [existingIds]);
      successCount = existingIds.length;
    }

    return { successCount, failures };
  }

  /**
   * Batch delete multiple memories with cascade deletion or soft delete
   *
   * Requirements:
   * - 2.1: Batch memory deletion with proper error handling
   * - 2.2: Cascade deletion of embeddings (hard delete)
   * - 2.3: Cascade deletion of waypoint connections (hard delete)
   * - 2.4: Cascade deletion of metadata (hard delete)
   * - 2.5: Soft delete option (set strength to 0, preserve data)
   *
   * @param memoryIds - Array of memory IDs to delete
   * @param soft - If true, perform soft delete (set strength=0); if false, hard delete (remove records)
   * @returns BatchDeleteResult with success/failure counts and details
   * @throws MemoryValidationError if input is invalid
   * @throws MemoryTransactionError if deletion fails
   */
  async batchDelete(
    memoryIds: string[],
    soft: boolean
  ): Promise<import("./types").BatchDeleteResult> {
    const startTime = Date.now();

    // Validate input
    this.validateBatchDeleteInput(memoryIds);

    let client: PoolClient | undefined;

    try {
      // Begin transaction for atomic batch deletion
      client = await this.db.beginTransaction();

      // Perform soft or hard delete
      const result = soft
        ? await this.performSoftDelete(client, memoryIds)
        : await this.performHardDelete(client, memoryIds);

      // Commit transaction
      await this.db.commitTransaction(client);

      // Invalidate search cache after successful batch deletion
      this.invalidateSearchCache();

      const processingTime = Date.now() - startTime;

      return {
        successCount: result.successCount,
        failureCount: result.failures.length,
        failures: result.failures,
        processingTime,
      };
    } catch (error) {
      // Rollback transaction on error
      if (client) {
        await this.db.rollbackTransaction(client);
      }

      // Re-throw validation errors as-is
      if (error instanceof MemoryValidationError) {
        throw error;
      }

      // Wrap other errors in transaction error
      throw new MemoryTransactionError(
        `Failed to batch delete memories`,
        "batch_delete",
        error as Error
      );
    }
  }

  /**
   * Delete a memory with cascade deletion or soft delete
   *
   * Requirements:
   * - 2.1: Memory deletion with proper error handling
   * - 2.2: Cascade deletion of embeddings (hard delete)
   * - 2.3: Cascade deletion of waypoint connections (hard delete)
   * - 2.4: Cascade deletion of metadata (hard delete)
   * - 2.5: Soft delete option (set strength to 0, preserve data)
   *
   * @param memoryId - ID of memory to delete
   * @param soft - If true, perform soft delete (set strength=0); if false, hard delete (remove record)
   * @throws MemoryValidationError if memoryId is invalid
   * @throws MemoryTransactionError if deletion fails
   */
  async delete(memoryId: string, soft: boolean): Promise<void> {
    // Validate input
    if (!memoryId || memoryId.trim().length === 0) {
      throw new MemoryValidationError("Memory ID cannot be empty", "memoryId", memoryId);
    }

    let client: PoolClient | undefined;

    try {
      // Begin transaction for atomic deletion
      client = await this.db.beginTransaction();

      if (soft) {
        // Soft delete: Set strength to 0 but keep all data
        const updateQuery = `
          UPDATE memories
          SET strength = 0
          WHERE id = $1
          RETURNING id
        `;

        const result = await client.query(updateQuery, [memoryId]);

        if (result.rows.length === 0) {
          throw new MemoryValidationError("Memory not found", "memoryId", memoryId);
        }

        // Soft delete does NOT cascade delete related data
        // Embeddings, connections, and metadata are preserved
      } else {
        // Hard delete: Remove memory record
        // First, explicitly delete related data to ensure proper cleanup
        // regardless of CASCADE constraint state in the database

        // Delete links where this memory is the source (forward links)
        await client.query(`DELETE FROM memory_links WHERE source_id = $1`, [memoryId]);

        // Delete links where this memory is the target (reverse links)
        await client.query(`DELETE FROM memory_links WHERE target_id = $1`, [memoryId]);

        // Explicitly delete metadata (don't rely on CASCADE)
        await client.query(`DELETE FROM memory_metadata WHERE memory_id = $1`, [memoryId]);

        // Explicitly delete embeddings (don't rely on CASCADE)
        await client.query(`DELETE FROM memory_embeddings WHERE memory_id = $1`, [memoryId]);

        // Now delete the memory record
        const deleteQuery = `
          DELETE FROM memories
          WHERE id = $1
          RETURNING id
        `;

        const result = await client.query(deleteQuery, [memoryId]);

        if (result.rows.length === 0) {
          throw new MemoryValidationError("Memory not found", "memoryId", memoryId);
        }
      }

      // Commit transaction
      await this.db.commitTransaction(client);

      // Invalidate search cache after successful deletion
      this.invalidateSearchCache();
    } catch (error) {
      // Rollback transaction on error
      if (client) {
        await this.db.rollbackTransaction(client);
      }

      // Re-throw validation errors as-is
      if (error instanceof MemoryValidationError) {
        throw error;
      }

      // Wrap other errors in transaction error
      throw new MemoryTransactionError(
        `Failed to delete memory: ${memoryId}`,
        "delete",
        error as Error
      );
    }
  }

  /**
   * Search memories using full-text search
   *
   * Integrates FullTextSearchEngine with MemoryRepository to provide
   * full-text search capabilities with proper error handling and result enrichment.
   *
   * Requirements:
   * - 4.1: Full-text search using PostgreSQL ts_vector
   * - 4.2: Boolean operators and phrase matching
   * - 4.3: Result ranking and highlighting
   * - 4.4: Filtering by userId, strength, salience
   * - 4.5: Performance (<200ms p95 for 100k memories)
   *
   * @param query - Full-text search query parameters
   * @returns Search results with statistics
   * @throws MemoryValidationError if query parameters are invalid
   */
  async searchFullText(query: FullTextSearchQuery): Promise<FullTextSearchResponse> {
    try {
      // Delegate to FullTextSearchEngine
      const result = await this.fullTextSearchEngine.search(query);

      // Results are already enriched with memory metadata by the search engine
      // No additional enrichment needed

      return result;
    } catch (error) {
      // Re-throw validation errors as-is
      if (error instanceof MemoryValidationError) {
        throw error;
      }

      // Wrap other errors for consistency
      Logger.error("Full-text search failed:", error);
      throw new Error(
        `Full-text search failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create multiple memories in a batch operation
   *
   * Processes memories sequentially to ensure proper embedding generation
   * and waypoint connections. Returns results for all memories, including
   * any that failed.
   *
   * @param input - Batch creation input with memories array
   * @returns Batch creation result with success/failure counts
   */
  async batchCreate(
    input: import("./types").BatchCreateInput
  ): Promise<import("./types").BatchCreateResult> {
    const startTime = Date.now();

    // Process all memories in parallel for better performance
    const results = await Promise.all(
      input.memories.map(async (memoryInput) => {
        try {
          const memory = await this.create(
            {
              content: memoryInput.content,
              userId: input.userId,
              sessionId: input.sessionId,
              primarySector: memoryInput.primarySector,
            },
            memoryInput.metadata
          );

          return {
            success: true as const,
            memoryId: memory.id,
            content: memoryInput.content.substring(0, 100),
          };
        } catch (error) {
          return {
            success: false as const,
            content: memoryInput.content.substring(0, 100),
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    // Separate successes and failures
    const created: Array<{ memoryId: string; content: string }> = [];
    const failures: Array<{ content: string; error: string }> = [];

    for (const result of results) {
      if (result.success) {
        created.push({
          memoryId: result.memoryId,
          content: result.content,
        });
      } else {
        failures.push({
          content: result.content,
          error: result.error,
        });
      }
    }

    return {
      successCount: created.length,
      failureCount: failures.length,
      created,
      failures,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Retrieve multiple memories by IDs in a batch operation
   *
   * Efficiently retrieves multiple memories in a single database query.
   * Returns found memories and lists IDs that were not found.
   * By default, excludes soft-deleted memories (strength=0).
   *
   * Requirements:
   * - 2.1: Return current strength value for each memory
   * - 2.3: Exclude soft-deleted memories by default
   * - 2.4: Include soft-deleted memories when includeDeleted=true
   *
   * @param input - Batch retrieval input with memory IDs and optional includeDeleted flag
   * @returns Batch retrieval result with memories and not found IDs
   */
  async batchRetrieve(
    input: import("./types").BatchRetrieveInput
  ): Promise<import("./types").BatchRetrieveResult> {
    const startTime = Date.now();
    let client: import("pg").PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Build query with optional soft-delete filter
      // By default (includeDeleted=false/undefined), exclude soft-deleted memories (strength=0)
      const includeDeleted = input.includeDeleted ?? false;
      const strengthFilter = includeDeleted ? "" : "AND m.strength > 0";

      const query = `
        SELECT
          m.*,
          md.keywords,
          md.tags,
          md.category,
          md.context,
          md.importance,
          md.is_atomic,
          md.parent_id
        FROM memories m
        LEFT JOIN memory_metadata md ON m.id = md.memory_id
        WHERE m.id = ANY($1) AND m.user_id = $2 ${strengthFilter}
      `;

      const result = await client.query(query, [input.memoryIds, input.userId]);

      const memories: Memory[] = result.rows.map((row: Record<string, unknown>) =>
        this.rowToMemoryWithMetadata(row)
      );

      // Find IDs that were not found
      const foundIds = new Set(memories.map((m) => m.id));
      const notFound = input.memoryIds.filter((id) => !foundIds.has(id));

      return {
        memories,
        notFound,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      Logger.error("Batch retrieval failed:", error);
      throw new Error(
        `Batch retrieval failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Get memory statistics for a user
   *
   * Returns counts per sector, total capacity, consolidation status,
   * and recent activity.
   *
   * Requirements: 1.5
   *
   * @param userId - User ID to get stats for
   * @returns Memory statistics
   */
  async getStats(userId: string): Promise<import("./types").MemoryStats> {
    this.validateUserId(userId);

    let client: import("pg").PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Get counts per sector (excluding soft-deleted memories with strength=0)
      const countsQuery = `
        SELECT primary_sector, COUNT(*) as count
        FROM memories
        WHERE user_id = $1 AND strength > 0
        GROUP BY primary_sector
      `;
      const countsResult = await client.query(countsQuery, [userId]);

      // Initialize counts
      const counts: Record<MemorySectorType, number> = {
        episodic: 0,
        semantic: 0,
        procedural: 0,
        emotional: 0,
        reflective: 0,
      };

      // Populate counts from query result
      for (const row of countsResult.rows) {
        const sector = row.primary_sector as MemorySectorType;
        counts[sector] = parseInt(row.count as string, 10);
      }

      // Get consolidation pending count (memories with low strength that need consolidation)
      const consolidationQuery = `
        SELECT COUNT(*) as count
        FROM memories
        WHERE user_id = $1 AND strength > 0 AND strength < 0.3
      `;
      const consolidationResult = await client.query(consolidationQuery, [userId]);
      const consolidationPending = parseInt(consolidationResult.rows[0]?.count as string, 10) || 0;

      // Get recent activity (last 10 operations based on last_accessed)
      const activityQuery = `
        SELECT id, primary_sector, last_accessed, created_at
        FROM memories
        WHERE user_id = $1 AND strength > 0
        ORDER BY last_accessed DESC
        LIMIT 10
      `;
      const activityResult = await client.query(activityQuery, [userId]);

      const recentActivity: import("./types").ActivityItem[] = activityResult.rows.map(
        (row: Record<string, unknown>) => {
          const createdAt = new Date(row.created_at as string);
          const lastAccessed = new Date(row.last_accessed as string);
          // Determine activity type based on timestamps
          const type =
            createdAt.getTime() === lastAccessed.getTime()
              ? ("create" as const)
              : ("access" as const);

          return {
            type,
            memoryId: row.id as string,
            timestamp: lastAccessed,
            sector: row.primary_sector as MemorySectorType,
          };
        }
      );

      // Calculate total capacity (configurable, default 100k memories per user)
      const totalCapacity = 100000;

      return {
        episodicCount: counts.episodic,
        semanticCount: counts.semantic,
        proceduralCount: counts.procedural,
        emotionalCount: counts.emotional,
        reflectiveCount: counts.reflective,
        totalCapacity,
        consolidationPending,
        recentActivity,
      };
    } catch (error) {
      Logger.error("Get stats failed:", error);

      if (error instanceof MemoryValidationError) {
        throw error;
      }

      throw new Error(
        `Get stats failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Get memory graph data for visualization
   *
   * Returns nodes, edges, and clusters representing the waypoint graph.
   * Supports filtering by center memory, depth, and sector type.
   *
   * Requirements: 2.1, 2.3
   *
   * @param query - Graph query parameters
   * @returns Graph data with nodes, edges, and clusters
   */
  async getGraph(query: import("./types").GraphQuery): Promise<import("./types").GraphResult> {
    this.validateUserId(query.userId);

    const depth = query.depth ?? 3;
    const maxDepth = Math.min(depth, 5); // Cap at 5 to prevent excessive traversal

    let client: import("pg").PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Build base query for nodes
      let nodesQuery: string;
      const nodesParams: unknown[] = [query.userId];
      let paramIndex = 2;

      if (query.centerMemoryId) {
        // If center memory specified, get connected memories via graph traversal
        nodesQuery = `
          WITH RECURSIVE connected AS (
            -- Start with center memory
            SELECT m.id, m.content, m.primary_sector, m.salience, m.strength, m.created_at,
                   md.keywords, md.tags, md.category, 0 as depth
            FROM memories m
            LEFT JOIN memory_metadata md ON m.id = md.memory_id
            WHERE m.id = $${paramIndex} AND m.user_id = $1 AND m.strength > 0

            UNION

            -- Get connected memories via links
            SELECT m.id, m.content, m.primary_sector, m.salience, m.strength, m.created_at,
                   md.keywords, md.tags, md.category, c.depth + 1
            FROM connected c
            JOIN memory_links ml ON (ml.source_id = c.id OR ml.target_id = c.id)
            JOIN memories m ON m.id = CASE WHEN ml.source_id = c.id THEN ml.target_id ELSE ml.source_id END
            LEFT JOIN memory_metadata md ON m.id = md.memory_id
            WHERE m.user_id = $1 AND m.strength > 0 AND c.depth < $${paramIndex + 1}
              AND m.id NOT IN (SELECT id FROM connected)
          )
          SELECT DISTINCT id, content, primary_sector, salience, strength, created_at,
                 keywords, tags, category
          FROM connected
        `;
        nodesParams.push(query.centerMemoryId, maxDepth);
        paramIndex += 2;
      } else {
        // No center memory, get all memories for user
        nodesQuery = `
          SELECT m.id, m.content, m.primary_sector, m.salience, m.strength, m.created_at,
                 md.keywords, md.tags, md.category
          FROM memories m
          LEFT JOIN memory_metadata md ON m.id = md.memory_id
          WHERE m.user_id = $1 AND m.strength > 0
        `;
      }

      // Add type filter if specified
      if (query.typeFilter) {
        nodesQuery += ` AND m.primary_sector = $${paramIndex}`;
        nodesParams.push(query.typeFilter);
        paramIndex++;
      }

      // Add ordering and limit
      nodesQuery += ` ORDER BY created_at DESC LIMIT 500`;

      const nodesResult = await client.query(nodesQuery, nodesParams);

      // Convert rows to GraphNode objects
      const nodes: import("./types").GraphNode[] = nodesResult.rows.map(
        (row: Record<string, unknown>) => ({
          id: row.id as string,
          content:
            (row.content as string).length > 200
              ? `${(row.content as string).substring(0, 197)}...`
              : (row.content as string),
          primarySector: row.primary_sector as MemorySectorType,
          salience: row.salience as number,
          strength: row.strength as number,
          createdAt: new Date(row.created_at as string).toISOString(),
          metadata: {
            keywords: (row.keywords as string[]) ?? [],
            tags: (row.tags as string[]) ?? [],
            category: (row.category as string) ?? undefined,
          },
        })
      );

      // Get node IDs for edge query
      const nodeIds = nodes.map((n) => n.id);

      // Get edges between the nodes
      let edges: import("./types").GraphEdge[] = [];
      if (nodeIds.length > 0) {
        const edgesQuery = `
          SELECT source_id, target_id, link_type, weight
          FROM memory_links
          WHERE source_id = ANY($1) AND target_id = ANY($1)
        `;
        const edgesResult = await client.query(edgesQuery, [nodeIds]);

        edges = edgesResult.rows.map((row: Record<string, unknown>) => ({
          source: row.source_id as string,
          target: row.target_id as string,
          linkType: row.link_type as string,
          weight: row.weight as number,
        }));
      }

      // Generate clusters based on sector grouping
      const clusters = this.generateClusters(nodes);

      return {
        nodes,
        edges,
        clusters,
      };
    } catch (error) {
      Logger.error("Get graph failed:", error);

      if (error instanceof MemoryValidationError) {
        throw error;
      }

      throw new Error(
        `Get graph failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Generate clusters from nodes based on sector grouping
   * @param nodes - Array of graph nodes
   * @returns Array of clusters
   */
  private generateClusters(nodes: import("./types").GraphNode[]): import("./types").GraphCluster[] {
    // Group nodes by sector
    const sectorGroups = new Map<string, import("./types").GraphNode[]>();

    for (const node of nodes) {
      const sector = node.primarySector;
      if (!sectorGroups.has(sector)) {
        sectorGroups.set(sector, []);
      }
      const sectorGroup = sectorGroups.get(sector);
      if (sectorGroup) {
        sectorGroup.push(node);
      }
    }

    // Create clusters for each sector with at least 2 nodes
    const clusters: import("./types").GraphCluster[] = [];

    for (const [sector, sectorNodes] of sectorGroups) {
      if (sectorNodes.length >= 2) {
        // Find centroid (node with highest salience)
        const centroid = sectorNodes.reduce((max, node) =>
          node.salience > max.salience ? node : max
        );

        clusters.push({
          id: `cluster-${sector}`,
          name: `${sector.charAt(0).toUpperCase() + sector.slice(1)} Memories`,
          nodeIds: sectorNodes.map((n) => n.id),
          centroidId: centroid.id,
        });
      }
    }

    return clusters;
  }

  /**
   * Get memory timeline data for visualization
   *
   * Returns chronologically ordered timeline events with emotional trends.
   * Supports filtering by date range and emotional parameters.
   *
   * Requirements: 2.2
   *
   * @param query - Timeline query parameters
   * @returns Timeline data with events and emotional trends
   */
  async getTimeline(
    query: import("./types").TimelineQuery
  ): Promise<import("./types").TimelineResult> {
    this.validateUserId(query.userId);

    let client: import("pg").PoolClient | null = null;

    try {
      client = await this.db.getConnection();

      // Build query for timeline events
      const conditions: string[] = ["m.user_id = $1", "m.strength > 0"];
      const params: unknown[] = [query.userId];
      let paramIndex = 2;

      // Add date range filter
      if (query.dateRange?.start) {
        conditions.push(`m.created_at >= $${paramIndex}`);
        params.push(query.dateRange.start);
        paramIndex++;
      }
      if (query.dateRange?.end) {
        conditions.push(`m.created_at <= $${paramIndex}`);
        params.push(query.dateRange.end);
        paramIndex++;
      }

      // Build the main query
      const whereClause = conditions.join(" AND ");
      const limit = Math.min(query.limit ?? 100, 500);
      const offset = query.offset ?? 0;

      // Query memories with metadata, ordered chronologically
      const timelineQuery = `
        SELECT m.id, m.content, m.created_at, m.primary_sector, m.salience, m.strength,
               md.keywords, md.tags, md.category
        FROM memories m
        LEFT JOIN memory_metadata md ON m.id = md.memory_id
        WHERE ${whereClause}
        ORDER BY m.created_at ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const timelineResult = await client.query(timelineQuery, params);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as count
        FROM memories m
        WHERE ${whereClause}
      `;
      const countResult = await client.query(countQuery, params.slice(0, paramIndex - 1));
      const totalCount = parseInt(countResult.rows[0]?.count as string, 10) || 0;

      // Convert rows to TimelineEvent objects
      // For emotional memories, extract emotional state from content analysis
      const timeline: import("./types").TimelineEvent[] = [];

      for (const row of timelineResult.rows) {
        const event: import("./types").TimelineEvent = {
          id: row.id as string,
          content:
            (row.content as string).length > 300
              ? `${(row.content as string).substring(0, 297)}...`
              : (row.content as string),
          timestamp: new Date(row.created_at as string).toISOString(),
          primarySector: row.primary_sector as MemorySectorType,
          salience: row.salience as number,
          strength: row.strength as number,
          metadata: {
            keywords: (row.keywords as string[]) ?? [],
            tags: (row.tags as string[]) ?? [],
            category: (row.category as string) ?? undefined,
          },
        };

        // For emotional sector memories, estimate emotional state from salience
        // In a full implementation, this would come from stored emotional analysis
        if (row.primary_sector === "emotional") {
          event.emotionalState = {
            valence: (row.salience as number) * 2 - 1, // Map 0-1 to -1 to 1
            arousal: Math.min(1, (row.salience as number) * 1.5), // Higher salience = higher arousal
            dominance: 0, // Neutral dominance without more context
          };
        }

        // Apply emotional filter if specified
        if (query.emotionalFilter && event.emotionalState) {
          const { minValence, maxValence, minArousal, maxArousal } = query.emotionalFilter;
          const { valence, arousal } = event.emotionalState;

          if (minValence !== undefined && valence < minValence) continue;
          if (maxValence !== undefined && valence > maxValence) continue;
          if (minArousal !== undefined && arousal < minArousal) continue;
          if (maxArousal !== undefined && arousal > maxArousal) continue;
        }

        timeline.push(event);
      }

      // Calculate emotional trends by grouping events into time periods
      const emotionalTrends = this.calculateEmotionalTrends(timeline, query.dateRange);

      return {
        timeline,
        emotionalTrends,
        totalCount,
      };
    } catch (error) {
      Logger.error("Get timeline failed:", error);

      if (error instanceof MemoryValidationError) {
        throw error;
      }

      throw new Error(
        `Get timeline failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (client) {
        this.db.releaseConnection(client);
      }
    }
  }

  /**
   * Calculate emotional trends from timeline events
   * Groups events into time periods and calculates average emotional values
   *
   * @param timeline - Array of timeline events
   * @param dateRange - Optional date range for context
   * @returns Array of emotional trends
   */
  private calculateEmotionalTrends(
    timeline: import("./types").TimelineEvent[],
    _dateRange?: { start?: Date; end?: Date }
  ): import("./types").EmotionalTrend[] {
    if (timeline.length === 0) {
      return [];
    }

    // Filter events with emotional state
    const emotionalEvents = timeline.filter((e) => e.emotionalState);

    if (emotionalEvents.length === 0) {
      return [];
    }

    // Determine time span and period size
    const timestamps = timeline.map((e) => new Date(e.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeSpan = maxTime - minTime;

    // Determine period granularity based on time span
    let periodMs: number;
    let periodLabel: string;

    if (timeSpan <= 24 * 60 * 60 * 1000) {
      // Less than 1 day: hourly periods
      periodMs = 60 * 60 * 1000;
      periodLabel = "hour";
    } else if (timeSpan <= 7 * 24 * 60 * 60 * 1000) {
      // Less than 1 week: daily periods
      periodMs = 24 * 60 * 60 * 1000;
      periodLabel = "day";
    } else if (timeSpan <= 30 * 24 * 60 * 60 * 1000) {
      // Less than 1 month: weekly periods
      periodMs = 7 * 24 * 60 * 60 * 1000;
      periodLabel = "week";
    } else {
      // More than 1 month: monthly periods
      periodMs = 30 * 24 * 60 * 60 * 1000;
      periodLabel = "month";
    }

    // Group events by period
    const periodGroups = new Map<
      number,
      { events: import("./types").TimelineEvent[]; startTime: number }
    >();

    for (const event of emotionalEvents) {
      const eventTime = new Date(event.timestamp).getTime();
      const periodStart = Math.floor((eventTime - minTime) / periodMs) * periodMs + minTime;

      if (!periodGroups.has(periodStart)) {
        periodGroups.set(periodStart, { events: [], startTime: periodStart });
      }
      const periodGroup = periodGroups.get(periodStart);
      if (periodGroup) {
        periodGroup.events.push(event);
      }
    }

    // Calculate trends for each period
    const trends: import("./types").EmotionalTrend[] = [];
    const sortedPeriods = Array.from(periodGroups.entries()).sort((a, b) => a[0] - b[0]);

    let previousValence: number | null = null;

    for (const [periodStart, { events }] of sortedPeriods) {
      const periodEnd = periodStart + periodMs;

      // Calculate averages
      let totalValence = 0;
      let totalArousal = 0;
      let totalDominance = 0;

      for (const event of events) {
        if (event.emotionalState) {
          totalValence += event.emotionalState.valence;
          totalArousal += event.emotionalState.arousal;
          totalDominance += event.emotionalState.dominance;
        }
      }

      const count = events.length;
      const avgValence = totalValence / count;
      const avgArousal = totalArousal / count;
      const avgDominance = totalDominance / count;

      // Determine trend direction
      let trend: "improving" | "declining" | "stable" = "stable";
      if (previousValence !== null) {
        const valenceDelta = avgValence - previousValence;
        if (valenceDelta > 0.1) {
          trend = "improving";
        } else if (valenceDelta < -0.1) {
          trend = "declining";
        }
      }
      previousValence = avgValence;

      trends.push({
        period: periodLabel,
        startDate: new Date(periodStart).toISOString(),
        endDate: new Date(periodEnd).toISOString(),
        averageValence: Math.round(avgValence * 1000) / 1000,
        averageArousal: Math.round(avgArousal * 1000) / 1000,
        averageDominance: Math.round(avgDominance * 1000) / 1000,
        trend,
        memoryCount: count,
      });
    }

    return trends;
  }
}
