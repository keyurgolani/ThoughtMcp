/**
 * Related Memories Utilities
 *
 * Provides utility functions for computing related memories with
 * connection type distinction (direct links vs semantic similarity).
 *
 * Requirements: 45.1, 45.2, 45.4
 */

import type { ConnectionType, RelatedMemory } from '../components/hud/RelatedMemoriesSidebar';
import type { GraphEdge, Memory } from '../types/api';
import { calculateMemoryRelevance, extractKeywords } from './autoSuggest';

// ============================================================================
// Types
// ============================================================================

export interface ComputeRelatedMemoriesOptions {
  /** Maximum number of related memories to return */
  maxResults?: number;
  /** Minimum relevance score for semantic matches (0-1) */
  minSemanticScore?: number;
  /** Whether to include inferred connections */
  includeInferred?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_RESULTS = 10;
const DEFAULT_MIN_SEMANTIC_SCORE = 0.15;

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Computes related memories for a given memory, distinguishing between
 * direct waypoint links and semantic similarity.
 *
 * Connection types:
 * - 'direct': Memory has an actual waypoint link in the graph
 * - 'semantic': Memory is related by content/keyword similarity
 * - 'inferred': Memory is connected through shared neighbors (optional)
 *
 * @param currentMemory - The memory to find related memories for
 * @param allMemories - All available memories to search through
 * @param edges - Graph edges representing waypoint links
 * @param options - Configuration options
 * @returns Array of related memories with connection types and relevance scores
 *
 * Requirements: 45.1, 45.2, 45.4
 */
export function computeRelatedMemories(
  currentMemory: Memory | null | undefined,
  allMemories: Memory[],
  edges: GraphEdge[],
  options: ComputeRelatedMemoriesOptions = {}
): RelatedMemory[] {
  const {
    maxResults = DEFAULT_MAX_RESULTS,
    minSemanticScore = DEFAULT_MIN_SEMANTIC_SCORE,
    includeInferred = false,
  } = options;

  if (currentMemory === null || currentMemory === undefined || allMemories.length === 0) {
    return [];
  }

  const currentId = currentMemory.id;
  const relatedMemories: RelatedMemory[] = [];

  // Step 1: Find directly linked memories (waypoint links)
  const directlyLinkedIds = findDirectlyLinkedIds(currentId, edges);

  // Step 2: Find inferred connections (shared neighbors) if enabled
  const inferredIds = includeInferred
    ? findInferredConnectionIds(currentId, edges, directlyLinkedIds)
    : new Set<string>();

  // Step 3: Extract keywords from current memory for semantic matching
  const currentKeywords = extractKeywords(currentMemory.content);
  const currentMetadataKeywords = currentMemory.metadata.keywords ?? [];
  const allCurrentKeywords = [
    ...new Set([...currentKeywords, ...currentMetadataKeywords.map((k) => k.toLowerCase())]),
  ];

  // Step 4: Process each memory
  for (const memory of allMemories) {
    // Skip the current memory itself
    if (memory.id === currentId) {
      continue;
    }

    // Determine connection type and compute relevance
    const connectionType = determineConnectionType(memory.id, directlyLinkedIds, inferredIds);

    // For direct links, compute relevance based on edge weight and content similarity
    if (connectionType === 'direct') {
      const edge = findEdge(currentId, memory.id, edges);
      const edgeWeight = edge?.weight ?? 0.5;
      const { score: contentScore, matchedKeywords } = calculateMemoryRelevance(
        allCurrentKeywords,
        memory
      );

      // Combine edge weight and content similarity for direct links
      // Direct links get a boost to ensure they appear first
      const relevanceScore = Math.min(1, edgeWeight * 0.6 + contentScore * 0.4 + 0.3);

      relatedMemories.push({
        memory,
        relevanceScore,
        sharedKeywords: matchedKeywords,
        connectionType: 'direct',
      });
    }
    // For inferred connections
    else if (connectionType === 'inferred') {
      const { score, matchedKeywords } = calculateMemoryRelevance(allCurrentKeywords, memory);

      // Inferred connections get a moderate boost
      const relevanceScore = Math.min(1, score + 0.15);

      if (relevanceScore >= minSemanticScore) {
        relatedMemories.push({
          memory,
          relevanceScore,
          sharedKeywords: matchedKeywords,
          connectionType: 'inferred',
        });
      }
    }
    // For semantic similarity (no direct or inferred link)
    else {
      const { score, matchedKeywords } = calculateMemoryRelevance(allCurrentKeywords, memory);

      // Only include if above minimum threshold
      if (score >= minSemanticScore) {
        relatedMemories.push({
          memory,
          relevanceScore: score,
          sharedKeywords: matchedKeywords,
          connectionType: 'semantic',
        });
      }
    }
  }

  // Step 5: Sort by relevance score (descending) and limit results
  // Direct links should appear first, then inferred, then semantic
  relatedMemories.sort((a, b) => {
    // Primary sort: connection type priority
    const typePriority: Record<ConnectionType, number> = {
      direct: 3,
      inferred: 2,
      semantic: 1,
    };
    const typeDiff = typePriority[b.connectionType] - typePriority[a.connectionType];
    if (typeDiff !== 0) return typeDiff;

    // Secondary sort: relevance score
    return b.relevanceScore - a.relevanceScore;
  });

  return relatedMemories.slice(0, maxResults);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Finds all memory IDs that are directly linked to the given memory via waypoint links.
 *
 * @param memoryId - The memory ID to find links for
 * @param edges - Graph edges representing waypoint links
 * @returns Set of directly linked memory IDs
 */
export function findDirectlyLinkedIds(memoryId: string, edges: GraphEdge[]): Set<string> {
  const linkedIds = new Set<string>();

  for (const edge of edges) {
    if (edge.source === memoryId) {
      linkedIds.add(edge.target);
    } else if (edge.target === memoryId) {
      linkedIds.add(edge.source);
    }
  }

  return linkedIds;
}

/**
 * Finds memory IDs that are connected through shared neighbors (inferred connections).
 * These are memories that share a common neighbor with the current memory but
 * don't have a direct link.
 *
 * @param memoryId - The memory ID to find inferred connections for
 * @param edges - Graph edges representing waypoint links
 * @param directlyLinkedIds - Set of directly linked memory IDs to exclude
 * @returns Set of inferred connection memory IDs
 */
export function findInferredConnectionIds(
  memoryId: string,
  edges: GraphEdge[],
  directlyLinkedIds: Set<string>
): Set<string> {
  const inferredIds = new Set<string>();

  // For each directly linked neighbor, find their neighbors
  for (const neighborId of directlyLinkedIds) {
    for (const edge of edges) {
      let connectedId: string | null = null;

      if (edge.source === neighborId && edge.target !== memoryId) {
        connectedId = edge.target;
      } else if (edge.target === neighborId && edge.source !== memoryId) {
        connectedId = edge.source;
      }

      // Add if not directly linked and not the current memory
      if (
        connectedId !== null &&
        connectedId.length > 0 &&
        !directlyLinkedIds.has(connectedId) &&
        connectedId !== memoryId
      ) {
        inferredIds.add(connectedId);
      }
    }
  }

  return inferredIds;
}

/**
 * Determines the connection type for a memory based on its relationship to the current memory.
 *
 * @param memoryId - The memory ID to check
 * @param directlyLinkedIds - Set of directly linked memory IDs
 * @param inferredIds - Set of inferred connection memory IDs
 * @returns The connection type
 */
export function determineConnectionType(
  memoryId: string,
  directlyLinkedIds: Set<string>,
  inferredIds: Set<string>
): ConnectionType {
  if (directlyLinkedIds.has(memoryId)) {
    return 'direct';
  }
  if (inferredIds.has(memoryId)) {
    return 'inferred';
  }
  return 'semantic';
}

/**
 * Finds the edge between two memories if it exists.
 *
 * @param sourceId - First memory ID
 * @param targetId - Second memory ID
 * @param edges - Graph edges to search
 * @returns The edge if found, undefined otherwise
 */
export function findEdge(
  sourceId: string,
  targetId: string,
  edges: GraphEdge[]
): GraphEdge | undefined {
  return edges.find(
    (edge) =>
      (edge.source === sourceId && edge.target === targetId) ||
      (edge.target === sourceId && edge.source === targetId)
  );
}

/**
 * Extracts shared keywords between two memories.
 *
 * @param memory1 - First memory
 * @param memory2 - Second memory
 * @returns Array of shared keywords
 */
export function findSharedKeywords(memory1: Memory, memory2: Memory): string[] {
  const keywords1 = new Set([
    ...extractKeywords(memory1.content),
    ...(memory1.metadata.keywords ?? []).map((k: string) => k.toLowerCase()),
  ]);

  const keywords2 = new Set([
    ...extractKeywords(memory2.content),
    ...(memory2.metadata.keywords ?? []).map((k: string) => k.toLowerCase()),
  ]);

  const shared: string[] = [];
  for (const keyword of keywords1) {
    if (keywords2.has(keyword)) {
      shared.push(keyword);
    }
  }

  return shared;
}
