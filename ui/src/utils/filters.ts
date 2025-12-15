/**
 * Filter Utility Functions
 *
 * Provides utility functions for filtering memory nodes by various criteria.
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import type { GraphNode, MemorySectorType } from '@types';

// ============================================================================
// Text Search Filter (Requirements: 7.1)
// ============================================================================

/**
 * Filters nodes by text search query.
 * Matches against content and metadata (keywords, tags, category).
 * Search is case-insensitive.
 *
 * @param nodes - Array of graph nodes to filter
 * @param query - Search query text
 * @returns Filtered array of nodes matching the query
 *
 * Requirements: 7.1
 */
export function filterNodesByText(nodes: GraphNode[], query: string): GraphNode[] {
  // Return all nodes if query is empty or whitespace
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) {
    return nodes;
  }

  return nodes.filter((node) => {
    // Check content
    if (node.content.toLowerCase().includes(trimmedQuery)) {
      return true;
    }

    // Check metadata keywords
    if (
      node.metadata.keywords !== undefined &&
      node.metadata.keywords.length > 0 &&
      node.metadata.keywords.some((kw: string) => kw.toLowerCase().includes(trimmedQuery))
    ) {
      return true;
    }

    // Check metadata tags
    if (
      node.metadata.tags !== undefined &&
      node.metadata.tags.length > 0 &&
      node.metadata.tags.some((tag: string) => tag.toLowerCase().includes(trimmedQuery))
    ) {
      return true;
    }

    // Check metadata category
    if (
      node.metadata.category !== undefined &&
      node.metadata.category.length > 0 &&
      node.metadata.category.toLowerCase().includes(trimmedQuery)
    ) {
      return true;
    }

    return false;
  });
}

// ============================================================================
// Sector Filter (Requirements: 7.2)
// ============================================================================

/**
 * Filters nodes by selected sector types.
 * Returns only nodes whose primarySector matches one of the selected sectors.
 *
 * @param nodes - Array of graph nodes to filter
 * @param selectedSectors - Array of sector types to include
 * @returns Filtered array of nodes matching the selected sectors
 *
 * Requirements: 7.2
 */
export function filterNodesBySector(
  nodes: GraphNode[],
  selectedSectors: MemorySectorType[] | null | undefined
): GraphNode[] {
  // Return all nodes if no sectors selected (show all)
  if (selectedSectors === undefined || selectedSectors === null || selectedSectors.length === 0) {
    return nodes;
  }

  const sectorSet = new Set(selectedSectors);
  return nodes.filter((node) => sectorSet.has(node.primarySector));
}

// ============================================================================
// Strength Threshold Filter (Requirements: 7.3)
// ============================================================================

/**
 * Filters nodes by minimum strength threshold.
 * Returns only nodes with strength >= minStrength.
 *
 * @param nodes - Array of graph nodes to filter
 * @param minStrength - Minimum strength threshold (0-1)
 * @returns Filtered array of nodes meeting the strength threshold
 *
 * Requirements: 7.3
 */
export function filterNodesByStrength(nodes: GraphNode[], minStrength: number): GraphNode[] {
  // Clamp threshold to valid range
  const threshold = Math.max(0, Math.min(1, minStrength));

  // Return all nodes if threshold is 0
  if (threshold === 0) {
    return nodes;
  }

  return nodes.filter((node) => node.strength >= threshold);
}

// ============================================================================
// Salience Threshold Filter (Requirements: 7.4)
// ============================================================================

/**
 * Filters nodes by minimum salience threshold.
 * Returns only nodes with salience >= minSalience.
 *
 * @param nodes - Array of graph nodes to filter
 * @param minSalience - Minimum salience threshold (0-1)
 * @returns Filtered array of nodes meeting the salience threshold
 *
 * Requirements: 7.4
 */
export function filterNodesBySalience(nodes: GraphNode[], minSalience: number): GraphNode[] {
  // Clamp threshold to valid range
  const threshold = Math.max(0, Math.min(1, minSalience));

  // Return all nodes if threshold is 0
  if (threshold === 0) {
    return nodes;
  }

  return nodes.filter((node) => node.salience >= threshold);
}

// ============================================================================
// Tag Filter (Requirements: 42.3, 42.4)
// ============================================================================

/**
 * Filters nodes by selected tags using intersection (AND) logic.
 * Returns only nodes that have ALL of the selected tags.
 * This implements multi-tag intersection filtering as per Requirement 42.4.
 *
 * @param nodes - Array of graph nodes to filter
 * @param selectedTags - Array of tag names to filter by (intersection/AND logic)
 * @returns Filtered array of nodes that have ALL selected tags
 *
 * Requirements: 42.3, 42.4
 */
export function filterNodesByTags(
  nodes: GraphNode[],
  selectedTags: string[] | null | undefined
): GraphNode[] {
  // Return all nodes if no tags selected
  if (selectedTags === undefined || selectedTags === null || selectedTags.length === 0) {
    return nodes;
  }

  // Normalize selected tags to lowercase for case-insensitive matching
  const normalizedSelectedTags = selectedTags.map((tag) => tag.toLowerCase());

  return nodes.filter((node) => {
    // Get node's tags, defaulting to empty array if not present
    const nodeTags = node.metadata.tags ?? [];

    // If node has no tags, it cannot match any selected tags
    if (nodeTags.length === 0) {
      return false;
    }

    // Normalize node tags to lowercase for case-insensitive matching
    const normalizedNodeTags = new Set(nodeTags.map((tag: string) => tag.toLowerCase()));

    // Check if node has ALL selected tags (intersection/AND logic)
    // Requirement 42.4: multi-tag intersection filtering
    return normalizedSelectedTags.every((selectedTag) => normalizedNodeTags.has(selectedTag));
  });
}

// ============================================================================
// Combined Filter (Convenience Function)
// ============================================================================

/**
 * Filter options for combined filtering.
 */
export interface FilterOptions {
  /** Text search query */
  query?: string;
  /** Selected sector types to include */
  sectors?: MemorySectorType[];
  /** Minimum strength threshold (0-1) */
  minStrength?: number;
  /** Minimum salience threshold (0-1) */
  minSalience?: number;
  /** Selected tags for intersection filtering (Requirements: 42.3, 42.4) */
  tags?: string[];
}

/**
 * Applies multiple filters to nodes in sequence.
 * Combines text search, sector filter, threshold filters, and tag filters.
 *
 * @param nodes - Array of graph nodes to filter
 * @param options - Filter options
 * @returns Filtered array of nodes matching all criteria
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 42.3, 42.4
 */
export function filterNodes(nodes: GraphNode[], options: FilterOptions): GraphNode[] {
  let result = nodes;

  // Apply text search filter
  if (options.query !== undefined && options.query.length > 0) {
    result = filterNodesByText(result, options.query);
  }

  // Apply sector filter
  if (options.sectors && options.sectors.length > 0) {
    result = filterNodesBySector(result, options.sectors);
  }

  // Apply strength threshold filter
  if (options.minStrength !== undefined && options.minStrength > 0) {
    result = filterNodesByStrength(result, options.minStrength);
  }

  // Apply salience threshold filter
  if (options.minSalience !== undefined && options.minSalience > 0) {
    result = filterNodesBySalience(result, options.minSalience);
  }

  // Apply tag filter (Requirements: 42.3, 42.4)
  if (options.tags && options.tags.length > 0) {
    result = filterNodesByTags(result, options.tags);
  }

  return result;
}
