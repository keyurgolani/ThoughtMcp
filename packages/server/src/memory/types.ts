/**
 * Memory System Type Definitions
 *
 * Core types and interfaces for memory creation, storage, and retrieval.
 * Supports Hierarchical Memory Decomposition (HMD) with five-sector embeddings.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { SectorEmbeddings } from "../embeddings/types";
import { Link } from "../graph/types";

/**
 * Memory sector types
 */
export type MemorySectorType = "episodic" | "semantic" | "procedural" | "emotional" | "reflective";

/**
 * Valid memory sectors for validation
 */
export const VALID_SECTORS: MemorySectorType[] = [
  "episodic",
  "semantic",
  "procedural",
  "emotional",
  "reflective",
];

/**
 * Sector-specific decay rate multipliers
 * Based on Ebbinghaus forgetting curve principles
 */
export const SECTOR_DECAY_RATES: Record<MemorySectorType, number> = {
  episodic: 0.03, // Fastest decay - temporal/contextual memories
  semantic: 0.01, // Slowest decay - factual knowledge
  procedural: 0.015, // Moderate decay - skills/procedures
  emotional: 0.025, // Fast decay - emotional associations
  reflective: 0.02, // Moderate-fast decay - meta-insights
};

/**
 * Memory content input for creation
 */
export interface MemoryContent {
  content: string;
  userId: string;
  sessionId: string;
  primarySector: MemorySectorType;
}

/**
 * Memory metadata for search and classification
 */
export interface MemoryMetadata {
  keywords?: string[];
  tags?: string[];
  category?: string;
  context?: string;
  importance?: number; // 0-1
  isAtomic?: boolean;
  parentId?: string;
}

/**
 * Complete memory object
 */
export interface Memory {
  id: string;
  content: string;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  salience: number; // 0-1
  decayRate: number;
  strength: number; // 0-1
  userId: string;
  sessionId: string;
  primarySector: MemorySectorType;
  metadata: MemoryMetadata;
  embeddings?: SectorEmbeddings;
  links?: Link[];
}

/**
 * Options for memory creation
 */
export interface CreateMemoryOptions {
  skipEmbeddings?: boolean; // For testing
  skipLinks?: boolean; // For testing
  customSalience?: number; // Override calculated salience
}

/**
 * Result of memory creation operation
 */
export interface CreateMemoryResult {
  memory: Memory;
  embeddingsGenerated: boolean;
  linksCreated: number;
  processingTime: number;
}

/**
 * Search query for memory retrieval
 */
export interface SearchQuery {
  text?: string; // Full-text search
  embedding?: number[]; // Vector similarity
  sectors?: MemorySectorType[]; // Which sectors to search
  userId: string; // Required: user isolation
  primarySector?: MemorySectorType; // Filter by memory type
  minStrength?: number; // Strength threshold
  minSalience?: number; // Salience threshold
  minSimilarity?: number; // Vector similarity threshold (0-1, default 0.5)
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  metadata?: {
    keywords?: string[];
    tags?: string[];
    category?: string;
  };
  limit?: number; // Result limit (default 10)
  offset?: number; // Pagination offset (default 0)
}

/**
 * Ranking method used for composite scoring
 * - 'similarity': Uses 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×linkWeight (when text query provided)
 * - 'salience': Uses 0.4×salience + 0.3×recency + 0.3×linkWeight (when no text query)
 */
export type RankingMethod = "similarity" | "salience";

/**
 * Composite score breakdown for retrieval ranking
 */
export interface CompositeScore {
  total: number; // 0-1 (formula depends on ranking method)
  similarity: number; // 0-1
  salience: number; // 0-1
  recency: number; // 0-1
  linkWeight: number; // 0-1
}

/**
 * Search result with ranked memories
 */
export interface SearchResult {
  memories: Memory[];
  totalCount: number;
  scores: Map<string, CompositeScore>;
  processingTime: number;
  /**
   * Indicates which ranking method was used:
   * - 'similarity': Text query provided, uses similarity-weighted scoring
   * - 'salience': No text query, uses salience-weighted scoring
   */
  rankingMethod: RankingMethod;
}

/**
 * Error types for memory operations
 */
export class MemoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "MemoryError";
  }
}

export class MemoryValidationError extends MemoryError {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message, "VALIDATION_ERROR", { field, value });
    this.name = "MemoryValidationError";
  }
}

export class MemoryCreationError extends MemoryError {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message, "CREATION_ERROR", { cause: cause?.message });
    this.name = "MemoryCreationError";
  }
}

export class MemoryTransactionError extends MemoryError {
  constructor(
    message: string,
    public operation: string,
    public cause?: Error
  ) {
    super(message, "TRANSACTION_ERROR", { operation, cause: cause?.message });
    this.name = "MemoryTransactionError";
  }
}

/**
 * Input for updating an existing memory
 */
export interface UpdateMemoryInput {
  memoryId: string;
  userId: string; // Required for security validation
  content?: string; // Triggers embedding regeneration
  strength?: number; // 0-1
  salience?: number; // 0-1
  metadata?: Partial<MemoryMetadata>;
  // Waypoint connections updated automatically based on content changes
}

/**
 * Result of memory update operation
 */
export interface UpdateMemoryResult {
  memory: Memory;
  embeddingsRegenerated: boolean;
  connectionsUpdated: boolean;
  processingTime: number;
}

export class MemoryUpdateError extends MemoryError {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message, "UPDATE_ERROR", { cause: cause?.message });
    this.name = "MemoryUpdateError";
  }
}

/**
 * Result of batch deletion operation
 */
export interface BatchDeleteResult {
  successCount: number;
  failureCount: number;
  failures: Array<{ memoryId: string; error: string }>;
  processingTime: number;
}

/**
 * Input for batch memory creation
 */
export interface BatchCreateInput {
  memories: Array<{
    content: string;
    primarySector: MemorySectorType;
    metadata?: MemoryMetadata;
  }>;
  userId: string;
  sessionId: string;
}

/**
 * Result of batch memory creation
 */
export interface BatchCreateResult {
  successCount: number;
  failureCount: number;
  created: Array<{ memoryId: string; content: string }>;
  failures: Array<{ content: string; error: string }>;
  processingTime: number;
}

/**
 * Input for batch memory retrieval
 */
export interface BatchRetrieveInput {
  memoryIds: string[];
  userId: string;
  /**
   * Include soft-deleted memories (strength=0) in results.
   * Default: false - excludes soft-deleted memories
   */
  includeDeleted?: boolean;
}

/**
 * Result of batch memory retrieval
 */
export interface BatchRetrieveResult {
  memories: Memory[];
  notFound: string[];
  processingTime: number;
}

/**
 * Result of content truncation operation
 *
 * Requirements: 4.1
 */
export interface TruncationResult {
  /** The content, possibly truncated with "[truncated]" suffix */
  content: string;
  /** Whether the content was truncated */
  isTruncated: boolean;
  /** Original content length before truncation */
  originalLength: number;
}

/**
 * Activity item for recent memory operations
 * Requirements: 1.5
 */
export interface ActivityItem {
  type: "create" | "update" | "delete" | "access";
  memoryId: string;
  timestamp: Date;
  sector: MemorySectorType;
}

/**
 * Memory statistics for a user
 * Requirements: 1.5
 */
export interface MemoryStats {
  episodicCount: number;
  semanticCount: number;
  proceduralCount: number;
  emotionalCount: number;
  reflectiveCount: number;
  totalCapacity: number;
  consolidationPending: number;
  recentActivity: ActivityItem[];
}

/**
 * Graph node representing a memory in the waypoint graph
 * Requirements: 2.1
 */
export interface GraphNode {
  id: string;
  content: string;
  primarySector: MemorySectorType;
  salience: number;
  strength: number;
  createdAt: string;
  metadata: {
    keywords?: string[];
    tags?: string[];
    category?: string;
  };
}

/**
 * Graph edge representing a connection between memories
 * Requirements: 2.1
 */
export interface GraphEdge {
  source: string;
  target: string;
  linkType: string;
  weight: number;
}

/**
 * Graph cluster representing a group of related memories
 * Requirements: 2.1
 */
export interface GraphCluster {
  id: string;
  name: string;
  nodeIds: string[];
  centroidId?: string;
}

/**
 * Query parameters for graph retrieval
 * Requirements: 2.1, 2.3
 */
export interface GraphQuery {
  userId: string;
  centerMemoryId?: string;
  depth?: number;
  typeFilter?: MemorySectorType;
}

/**
 * Result of graph retrieval operation
 * Requirements: 2.1, 2.3
 */
export interface GraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
}

/**
 * Timeline event representing a memory with temporal context
 * Requirements: 2.2
 */
export interface TimelineEvent {
  id: string;
  content: string;
  timestamp: string;
  primarySector: MemorySectorType;
  salience: number;
  strength: number;
  emotionalState?: {
    valence: number;
    arousal: number;
    dominance: number;
  };
  metadata: {
    keywords?: string[];
    tags?: string[];
    category?: string;
  };
}

/**
 * Emotional trend over a time period
 * Requirements: 2.2
 */
export interface EmotionalTrend {
  period: string;
  startDate: string;
  endDate: string;
  averageValence: number;
  averageArousal: number;
  averageDominance: number;
  trend: "improving" | "declining" | "stable";
  memoryCount: number;
}

/**
 * Query parameters for timeline retrieval
 * Requirements: 2.2
 */
export interface TimelineQuery {
  userId: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  emotionalFilter?: {
    minValence?: number;
    maxValence?: number;
    minArousal?: number;
    maxArousal?: number;
  };
  limit?: number;
  offset?: number;
}

/**
 * Result of timeline retrieval operation
 * Requirements: 2.2
 */
export interface TimelineResult {
  timeline: TimelineEvent[];
  emotionalTrends: EmotionalTrend[];
  totalCount: number;
}
