/**
 * Graph Edge Generation Utilities
 *
 * Provides utility functions for generating edges between memory nodes
 * based on shared tags and explicit mentions (wiki-links).
 *
 * Requirements: 6.3, 6.4
 * - Edges are created based on tags, embedding similarity, and explicit mentions
 * - Edges are NOT created based solely on memory type
 */

import type { Memory } from "../types/api";

// ============================================================================
// Types
// ============================================================================

/**
 * Edge type for the memory graph.
 * - 'tag': Edge created from shared tags between memories
 * - 'similarity': Edge created from embedding similarity (server-provided)
 * - 'mention': Edge created from explicit wiki-link mentions in content
 */
export type GraphEdgeType = "tag" | "similarity" | "mention";

/**
 * Graph edge representing a connection between two memories.
 */
export interface GraphEdge2D {
  /** Source memory ID */
  source: string;
  /** Target memory ID */
  target: string;
  /** Type of connection */
  type: GraphEdgeType;
  /** Edge weight (0-1) */
  weight: number;
}

/**
 * Options for edge generation.
 */
export interface GenerateEdgesOptions {
  /** Include tag-based edges (default: true) */
  includeTags?: boolean;
  /** Include mention-based edges (default: true) */
  includeMentions?: boolean;
  /** Minimum tag overlap ratio to create an edge (default: 0) */
  minTagOverlapRatio?: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default minimum tag overlap ratio */
const DEFAULT_MIN_TAG_OVERLAP_RATIO = 0;

/** Wiki-link pattern: [[memory-id]] or [[memory-id|display text]] */
const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generates edges between memories based on shared tags and explicit mentions.
 * Does NOT generate edges based on memory type (Requirements: 6.4).
 *
 * @param memories - Array of memories to generate edges for
 * @param options - Configuration options
 * @returns Array of graph edges
 *
 * Requirements: 6.3, 6.4
 */
export function generateEdges(
  memories: Memory[],
  options: GenerateEdgesOptions = {}
): GraphEdge2D[] {
  const {
    includeTags = true,
    includeMentions = true,
    minTagOverlapRatio = DEFAULT_MIN_TAG_OVERLAP_RATIO,
  } = options;

  const edges: GraphEdge2D[] = [];
  const edgeSet = new Set<string>();

  // Create a map for quick memory lookup by ID
  const memoryMap = new Map<string, Memory>();
  for (const memory of memories) {
    memoryMap.set(memory.id, memory);
  }

  // Generate edges between all pairs of memories
  for (let i = 0; i < memories.length; i++) {
    const memA = memories[i];
    if (!memA) continue;

    for (let j = i + 1; j < memories.length; j++) {
      const memB = memories[j];
      if (!memB) continue;

      // Generate tag-based edges
      if (includeTags) {
        const tagEdge = generateTagEdge(memA, memB, minTagOverlapRatio);
        if (tagEdge && !edgeSet.has(getEdgeKey(tagEdge))) {
          edges.push(tagEdge);
          edgeSet.add(getEdgeKey(tagEdge));
        }
      }

      // Generate mention-based edges
      if (includeMentions) {
        const mentionEdge = generateMentionEdge(memA, memB);
        if (mentionEdge && !edgeSet.has(getEdgeKey(mentionEdge))) {
          edges.push(mentionEdge);
          edgeSet.add(getEdgeKey(mentionEdge));
        }
      }
    }
  }

  return edges;
}

/**
 * Generates a tag-based edge between two memories if they share tags.
 *
 * @param memA - First memory
 * @param memB - Second memory
 * @param minOverlapRatio - Minimum overlap ratio to create an edge
 * @returns Graph edge if memories share tags, null otherwise
 *
 * Requirements: 6.3
 */
export function generateTagEdge(
  memA: Memory,
  memB: Memory,
  minOverlapRatio: number = DEFAULT_MIN_TAG_OVERLAP_RATIO
): GraphEdge2D | null {
  const sharedTags = getSharedTags(memA, memB);

  if (sharedTags.length === 0) {
    return null;
  }

  const tagsA = getMemoryTags(memA);
  const tagsB = getMemoryTags(memB);
  const maxTags = Math.max(tagsA.length, tagsB.length);

  // Avoid division by zero
  if (maxTags === 0) {
    return null;
  }

  const overlapRatio = sharedTags.length / maxTags;

  if (overlapRatio < minOverlapRatio) {
    return null;
  }

  return {
    source: memA.id,
    target: memB.id,
    type: "tag",
    weight: overlapRatio,
  };
}

/**
 * Generates a mention-based edge between two memories if one mentions the other.
 *
 * @param memA - First memory
 * @param memB - Second memory
 * @returns Graph edge if one memory mentions the other, null otherwise
 *
 * Requirements: 6.3
 */
export function generateMentionEdge(memA: Memory, memB: Memory): GraphEdge2D | null {
  const aMentionsB = hasMention(memA, memB.id);
  const bMentionsA = hasMention(memB, memA.id);

  if (!aMentionsB && !bMentionsA) {
    return null;
  }

  return {
    source: memA.id,
    target: memB.id,
    type: "mention",
    weight: 1.0, // Explicit mentions have full weight
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the tags from a memory's metadata.
 *
 * @param memory - The memory to get tags from
 * @returns Array of tags (lowercase, trimmed)
 */
export function getMemoryTags(memory: Memory): string[] {
  const tags = memory.metadata.tags ?? [];
  return tags.map((tag) => tag.toLowerCase().trim()).filter((tag) => tag.length > 0);
}

/**
 * Gets the shared tags between two memories.
 *
 * @param memA - First memory
 * @param memB - Second memory
 * @returns Array of shared tags
 */
export function getSharedTags(memA: Memory, memB: Memory): string[] {
  const tagsA = new Set(getMemoryTags(memA));
  const tagsB = getMemoryTags(memB);

  return tagsB.filter((tag) => tagsA.has(tag));
}

/**
 * Checks if a memory's content contains a wiki-link mention of another memory.
 * Wiki-links are in the format [[memory-id]] or [[memory-id|display text]].
 *
 * @param memory - The memory to check for mentions
 * @param targetId - The ID of the memory being mentioned
 * @returns True if the memory mentions the target
 */
export function hasMention(memory: Memory, targetId: string): boolean {
  const mentions = extractMentions(memory.content);
  return mentions.includes(targetId);
}

/**
 * Extracts all wiki-link mentions from memory content.
 * Wiki-links are in the format [[memory-id]] or [[memory-id|display text]].
 *
 * @param content - The memory content to extract mentions from
 * @returns Array of mentioned memory IDs
 */
export function extractMentions(content: string): string[] {
  const mentions: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  WIKI_LINK_PATTERN.lastIndex = 0;

  while ((match = WIKI_LINK_PATTERN.exec(content)) !== null) {
    const mentionId = match[1];
    if (mentionId !== undefined && mentionId.trim().length > 0) {
      mentions.push(mentionId.trim());
    }
  }

  return mentions;
}

/**
 * Creates a unique key for an edge to prevent duplicates.
 * The key is order-independent (A-B === B-A).
 *
 * @param edge - The edge to create a key for
 * @returns Unique edge key
 */
export function getEdgeKey(edge: GraphEdge2D): string {
  const [first, second] = [edge.source, edge.target].sort();
  return `${first ?? ""}-${second ?? ""}-${edge.type}`;
}

/**
 * Filters edges to remove any that are based solely on memory type.
 * This ensures compliance with Requirement 6.4.
 *
 * @param edges - Array of edges to filter
 * @returns Filtered array of edges
 *
 * Requirements: 6.4
 */
export function filterTypeBasedEdges(edges: GraphEdge2D[]): GraphEdge2D[] {
  // Our edge generation never creates type-based edges,
  // but this function can be used to filter external edges
  const validTypes: GraphEdgeType[] = ["tag", "similarity", "mention"];
  return edges.filter((edge) => validTypes.includes(edge.type));
}

/**
 * Merges edges from multiple sources, deduplicating by edge key.
 * When duplicates exist, keeps the edge with the higher weight.
 *
 * @param edgeArrays - Arrays of edges to merge
 * @returns Merged and deduplicated array of edges
 */
export function mergeEdges(...edgeArrays: GraphEdge2D[][]): GraphEdge2D[] {
  const edgeMap = new Map<string, GraphEdge2D>();

  for (const edges of edgeArrays) {
    for (const edge of edges) {
      const key = getEdgeKey(edge);
      const existing = edgeMap.get(key);

      if (!existing || edge.weight > existing.weight) {
        edgeMap.set(key, edge);
      }
    }
  }

  return Array.from(edgeMap.values());
}
