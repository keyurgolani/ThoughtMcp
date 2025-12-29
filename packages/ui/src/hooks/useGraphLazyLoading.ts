/**
 * useGraphLazyLoading - Hook for lazy loading graph nodes
 *
 * Provides lazy loading functionality for the memory graph:
 * - Fetches only root node and immediate neighbors initially
 * - Fetches neighbors on node expansion
 * - Caches fetched nodes to avoid redundant requests
 *
 * Requirements: 11.1, 11.2, 11.3
 */

import { useCallback, useRef, useState } from "react";
import { getDefaultClient } from "../api/client";
import type { GraphEdge, GraphNode } from "../types/api";

// ============================================================================
// Types
// ============================================================================

export interface LazyGraphNode extends GraphNode {
  /** Whether this node's neighbors have been fetched */
  neighborsLoaded: boolean;
  /** Whether this node is currently loading neighbors */
  isLoadingNeighbors: boolean;
  /** IDs of known neighbor nodes */
  neighborIds: string[];
}

export interface LazyGraphEdge {
  source: string;
  target: string;
  type: "tag" | "similarity" | "mention";
  weight: number;
}

export interface GraphLazyLoadingState {
  /** All loaded nodes (cached) */
  nodes: Map<string, LazyGraphNode>;
  /** All loaded edges */
  edges: LazyGraphEdge[];
  /** Currently selected/focused node ID */
  rootNodeId: string | null;
  /** Whether initial load is in progress */
  isInitialLoading: boolean;
  /** Set of node IDs currently being expanded */
  expandingNodeIds: Set<string>;
  /** Error message if any */
  error: string | null;
  /** Initial depth for loading (default: 1) */
  initialDepth: number;
  /** Maximum depth for graph traversal (default: 3) - Requirements: 11.5 */
  maxDepth: number;
}

export interface GraphLazyLoadingActions {
  /** Initialize graph with a root node */
  initializeGraph: (userId: string, rootMemoryId?: string) => Promise<void>;
  /** Expand a node to fetch its neighbors */
  expandNode: (nodeId: string) => Promise<void>;
  /** Check if a node can be expanded (has unfetched neighbors) */
  canExpandNode: (nodeId: string) => boolean;
  /** Check if a node is currently being expanded */
  isNodeExpanding: (nodeId: string) => boolean;
  /** Get all nodes as array */
  getNodesArray: () => LazyGraphNode[];
  /** Get all edges as array */
  getEdgesArray: () => LazyGraphEdge[];
  /** Clear all cached data */
  clearCache: () => void;
  /** Set the initial depth for loading */
  setInitialDepth: (depth: number) => void;
  /** Set the maximum depth for graph traversal - Requirements: 11.5 */
  setMaxDepth: (depth: number) => void;
}

export type UseGraphLazyLoadingReturn = GraphLazyLoadingState & GraphLazyLoadingActions;

// ============================================================================
// Constants
// ============================================================================

/** Default initial depth for graph loading */
const DEFAULT_INITIAL_DEPTH = 1;

/** Default maximum depth for graph traversal - Requirements: 11.5 */
const DEFAULT_MAX_DEPTH = 3;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert GraphNode to LazyGraphNode
 */
function graphNodeToLazyNode(node: GraphNode, neighborsLoaded: boolean = false): LazyGraphNode {
  return {
    ...node,
    neighborsLoaded,
    isLoadingNeighbors: false,
    neighborIds: [],
  };
}

/**
 * Convert GraphEdge to LazyGraphEdge
 */
function graphEdgeToLazyEdge(edge: GraphEdge): LazyGraphEdge {
  return {
    source: edge.source,
    target: edge.target,
    type: mapLinkTypeToEdgeType(edge.linkType),
    weight: edge.weight,
  };
}

/**
 * Map server LinkType to client edge type
 */
function mapLinkTypeToEdgeType(linkType: string): "tag" | "similarity" | "mention" {
  switch (linkType) {
    case "semantic":
    case "similarity":
      return "similarity";
    case "tag":
    case "shared_tag":
      return "tag";
    case "mention":
    case "reference":
      return "mention";
    default:
      return "similarity";
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for lazy loading graph nodes
 *
 * Requirements: 11.1, 11.2, 11.3
 */
export function useGraphLazyLoading(): UseGraphLazyLoadingReturn {
  // State
  const [nodes, setNodes] = useState<Map<string, LazyGraphNode>>(new Map());
  const [edges, setEdges] = useState<LazyGraphEdge[]>([]);
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [expandingNodeIds, setExpandingNodeIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [initialDepth, setInitialDepth] = useState(DEFAULT_INITIAL_DEPTH);
  const [maxDepth, setMaxDepth] = useState(DEFAULT_MAX_DEPTH);

  // Refs for tracking in-flight requests (Requirements: 11.3 - caching)
  const pendingRequests = useRef<Map<string, Promise<void>>>(new Map());
  const userIdRef = useRef<string | null>(null);

  /**
   * Initialize graph with root node and immediate neighbors
   * Requirements: 11.1
   */
  const initializeGraph = useCallback(
    async (userId: string, rootMemoryId?: string): Promise<void> => {
      setIsInitialLoading(true);
      setError(null);
      userIdRef.current = userId;

      try {
        const client = getDefaultClient();

        // Fetch graph data from server with specified depth
        // Build options object conditionally to satisfy exactOptionalPropertyTypes
        const graphOptions: { centerMemoryId?: string; depth?: number } = {
          depth: initialDepth,
        };
        if (rootMemoryId !== undefined) {
          graphOptions.centerMemoryId = rootMemoryId;
        }
        const response = await client.getMemoryGraph(userId, graphOptions);

        // Convert nodes to lazy nodes
        const newNodes = new Map<string, LazyGraphNode>();
        for (const node of response.nodes) {
          const lazyNode = graphNodeToLazyNode(node, false);
          newNodes.set(node.id, lazyNode);
        }

        // Convert edges and track neighbor relationships
        const newEdges: LazyGraphEdge[] = [];
        const neighborMap = new Map<string, Set<string>>();

        for (const edge of response.edges) {
          newEdges.push(graphEdgeToLazyEdge(edge));

          // Track neighbors for each node
          if (!neighborMap.has(edge.source)) {
            neighborMap.set(edge.source, new Set());
          }
          if (!neighborMap.has(edge.target)) {
            neighborMap.set(edge.target, new Set());
          }
          neighborMap.get(edge.source)?.add(edge.target);
          neighborMap.get(edge.target)?.add(edge.source);
        }

        // Update neighbor IDs for each node
        for (const [nodeId, neighbors] of neighborMap) {
          const node = newNodes.get(nodeId);
          if (node) {
            node.neighborIds = Array.from(neighbors);
          }
        }

        // Mark root node's neighbors as loaded if we have a root
        if (rootMemoryId !== undefined && rootMemoryId !== "" && newNodes.has(rootMemoryId)) {
          const rootNode = newNodes.get(rootMemoryId);
          if (rootNode) {
            rootNode.neighborsLoaded = true;
          }
        } else if (newNodes.size > 0) {
          // If no root specified, mark the first node as root
          const firstNode = newNodes.values().next().value;
          if (firstNode) {
            firstNode.neighborsLoaded = true;
            setRootNodeId(firstNode.id);
          }
        }

        setNodes(newNodes);
        setEdges(newEdges);
        if (rootMemoryId !== undefined && rootMemoryId !== "") {
          setRootNodeId(rootMemoryId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load graph";
        setError(message);
        console.error("Failed to initialize graph:", err);
      } finally {
        setIsInitialLoading(false);
      }
    },
    [initialDepth]
  );

  /**
   * Expand a node to fetch its neighbors
   * Requirements: 11.2, 11.3
   */
  const expandNode = useCallback(
    async (nodeId: string): Promise<void> => {
      const currentNodes = nodes;
      const node = currentNodes.get(nodeId);

      // Skip if node doesn't exist or neighbors already loaded
      if (!node || node.neighborsLoaded) {
        return;
      }

      // Skip if already expanding this node (Requirements: 11.3 - caching)
      if (pendingRequests.current.has(nodeId)) {
        return pendingRequests.current.get(nodeId);
      }

      const userId = userIdRef.current;
      if (userId === null || userId === "") {
        return;
      }

      // Mark node as loading
      setExpandingNodeIds((prev) => new Set([...prev, nodeId]));
      setNodes((prev) => {
        const updated = new Map(prev);
        const existingNode = updated.get(nodeId);
        if (existingNode) {
          updated.set(nodeId, { ...existingNode, isLoadingNeighbors: true });
        }
        return updated;
      });

      // Create the expansion promise
      const expansionPromise = (async (): Promise<void> => {
        try {
          const client = getDefaultClient();

          // Fetch neighbors for this specific node
          const response = await client.getMemoryGraph(userId, {
            centerMemoryId: nodeId,
            depth: 1,
          });

          setNodes((prev) => {
            const updated = new Map(prev);

            // Add new nodes (Requirements: 11.3 - cache fetched nodes)
            for (const graphNode of response.nodes) {
              if (!updated.has(graphNode.id)) {
                updated.set(graphNode.id, graphNodeToLazyNode(graphNode, false));
              }
            }

            // Mark the expanded node as having neighbors loaded
            const expandedNode = updated.get(nodeId);
            if (expandedNode) {
              updated.set(nodeId, {
                ...expandedNode,
                neighborsLoaded: true,
                isLoadingNeighbors: false,
              });
            }

            // Update neighbor IDs
            const neighborIds = new Set<string>();
            for (const edge of response.edges) {
              if (edge.source === nodeId) {
                neighborIds.add(edge.target);
              } else if (edge.target === nodeId) {
                neighborIds.add(edge.source);
              }
            }

            const nodeToUpdate = updated.get(nodeId);
            if (nodeToUpdate) {
              updated.set(nodeId, {
                ...nodeToUpdate,
                neighborIds: Array.from(neighborIds),
              });
            }

            return updated;
          });

          // Add new edges (deduplicated)
          setEdges((prev) => {
            const edgeSet = new Set(prev.map((e) => `${e.source}-${e.target}`));
            const newEdges = [...prev];

            for (const edge of response.edges) {
              const key = `${edge.source}-${edge.target}`;
              const reverseKey = `${edge.target}-${edge.source}`;
              if (!edgeSet.has(key) && !edgeSet.has(reverseKey)) {
                newEdges.push(graphEdgeToLazyEdge(edge));
                edgeSet.add(key);
              }
            }

            return newEdges;
          });
        } catch (err) {
          console.error(`Failed to expand node ${nodeId}:`, err);
          // Reset loading state on error
          setNodes((prev) => {
            const updated = new Map(prev);
            const existingNode = updated.get(nodeId);
            if (existingNode) {
              updated.set(nodeId, { ...existingNode, isLoadingNeighbors: false });
            }
            return updated;
          });
        } finally {
          // Remove from expanding set
          setExpandingNodeIds((prev) => {
            const updated = new Set(prev);
            updated.delete(nodeId);
            return updated;
          });
          // Remove from pending requests
          pendingRequests.current.delete(nodeId);
        }
      })();

      // Store the promise for deduplication
      pendingRequests.current.set(nodeId, expansionPromise);

      return expansionPromise;
    },
    [nodes]
  );

  /**
   * Check if a node can be expanded (has unfetched neighbors)
   */
  const canExpandNode = useCallback(
    (nodeId: string): boolean => {
      const node = nodes.get(nodeId);
      return node !== undefined && !node.neighborsLoaded && !node.isLoadingNeighbors;
    },
    [nodes]
  );

  /**
   * Check if a node is currently being expanded
   */
  const isNodeExpanding = useCallback(
    (nodeId: string): boolean => {
      return expandingNodeIds.has(nodeId);
    },
    [expandingNodeIds]
  );

  /**
   * Get all nodes as array
   */
  const getNodesArray = useCallback((): LazyGraphNode[] => {
    return Array.from(nodes.values());
  }, [nodes]);

  /**
   * Get all edges as array
   */
  const getEdgesArray = useCallback((): LazyGraphEdge[] => {
    return edges;
  }, [edges]);

  /**
   * Clear all cached data
   */
  const clearCache = useCallback((): void => {
    setNodes(new Map());
    setEdges([]);
    setRootNodeId(null);
    setExpandingNodeIds(new Set());
    setError(null);
    pendingRequests.current.clear();
    userIdRef.current = null;
  }, []);

  /**
   * Set the initial depth for loading
   */
  const setInitialDepthValue = useCallback((depth: number): void => {
    setInitialDepth(Math.max(1, Math.min(depth, 5))); // Clamp between 1 and 5
  }, []);

  /**
   * Set the maximum depth for graph traversal
   * Requirements: 11.5 - Configurable maximum depth
   */
  const setMaxDepthValue = useCallback((depth: number): void => {
    setMaxDepth(Math.max(1, Math.min(depth, 10))); // Clamp between 1 and 10
  }, []);

  return {
    // State
    nodes,
    edges,
    rootNodeId,
    isInitialLoading,
    expandingNodeIds,
    error,
    initialDepth,
    maxDepth,
    // Actions
    initializeGraph,
    expandNode,
    canExpandNode,
    isNodeExpanding,
    getNodesArray,
    getEdgesArray,
    clearCache,
    setInitialDepth: setInitialDepthValue,
    setMaxDepth: setMaxDepthValue,
  };
}

export default useGraphLazyLoading;
