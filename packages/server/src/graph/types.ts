/**
 * Waypoint Graph Type Definitions
 *
 * Core types and interfaces for the waypoint graph system.
 * Supports sparse graph structure where each memory links to 1-3 most similar memories.
 *
 * Requirements: 2.3, 2.4, 2.5
 */

/**
 * Link types for waypoint graph connections
 * Must match database constraint in scripts/db/init.sql
 */
export enum LinkType {
  Causal = "causal", // Cause-effect relationships
  Semantic = "semantic", // Semantic similarity (formerly "associative")
  Temporal = "temporal", // Time-based relationships
  Analogical = "analogical", // Analogical relationships (formerly "hierarchical")
}

/**
 * Link between two memories in the waypoint graph
 */
export interface Link {
  sourceId: string;
  targetId: string;
  linkType: LinkType;
  weight: number; // 0-1, normalized similarity/strength
  createdAt: Date;
  traversalCount: number;
}

/**
 * Memory interface for graph operations
 */
export interface Memory {
  id: string;
  content: string;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  salience: number;
  strength: number;
  userId: string;
  sessionId: string;
  primarySector: string;
  metadata: MemoryMetadata;
  embeddings?: import("../embeddings/types").SectorEmbeddings;
}

/**
 * Memory metadata for link classification
 */
export interface MemoryMetadata {
  keywords: string[];
  tags: string[];
  category: string;
  context: string;
  importance: number;
  isAtomic: boolean;
  parentId?: string;
}

/**
 * Configuration for waypoint graph builder
 */
export interface WaypointGraphConfig {
  similarityThreshold: number; // Minimum similarity for link creation (default 0.7)
  maxLinksPerNode: number; // Maximum links per memory (default 3)
  minLinksPerNode: number; // Minimum links per memory (default 1)
  enableBidirectional: boolean; // Create bidirectional links (default true)
}

/**
 * Result of link creation operation
 */
export interface LinkCreationResult {
  links: Link[];
  skippedCount: number;
  reason?: string;
}

/**
 * Candidate memory for link creation
 */
export interface LinkCandidate {
  memory: Memory;
  similarity: number;
  linkType: LinkType;
  weight: number;
}

/**
 * Error types for graph operations
 */
export class GraphError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "GraphError";
  }
}

export class SelfLinkError extends GraphError {
  constructor(memoryId: string) {
    super(`Cannot create self-link for memory ${memoryId}`, "SELF_LINK_ERROR", { memoryId });
    this.name = "SelfLinkError";
  }
}

export class InvalidLinkError extends GraphError {
  constructor(
    message: string,
    public sourceId: string,
    public targetId: string
  ) {
    super(message, "INVALID_LINK_ERROR", { sourceId, targetId });
    this.name = "InvalidLinkError";
  }
}

/**
 * Path through the waypoint graph
 */
export interface Path {
  memories: Memory[];
  links: Link[];
  totalWeight: number;
  explanation: string;
}

/**
 * Options for graph traversal
 */
export interface TraversalOptions {
  maxDepth: number;
  minWeight?: number;
  traversalType?: "breadth-first" | "depth-first";
  includePaths?: boolean;
}

/**
 * Result of graph traversal operation
 */
export interface TraversalResult {
  memories: Memory[];
  paths?: Path[];
  visitedCount: number;
}
