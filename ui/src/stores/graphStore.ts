/**
 * GraphStore - Zustand store for memory graph data
 *
 * Manages the state of the memory graph including current node,
 * neighbors, visible nodes, and edges.
 *
 * Requirements: 1.1, 4.4, 10.1-10.4
 */

import { create } from 'zustand';
import { getDefaultClient } from '../api/client';
import type { GraphEdge, GraphNode, Memory, MemorySectorType } from '../types/api';

// ============================================================================
// Types
// ============================================================================

export interface NeighborNode extends GraphNode {
  /** The edge connecting this neighbor to the current node */
  edge: GraphEdge;
  /** 3D position for rendering */
  position?: [number, number, number];
}

export interface GraphState {
  /** ID of the currently focused memory node */
  currentNodeId: string | null;
  /** Current node's full memory data */
  currentNode: Memory | null;
  /** Neighbor nodes connected to the current node */
  neighbors: NeighborNode[];
  /** All visible nodes in the graph (keyed by ID) */
  visibleNodes: Map<string, GraphNode>;
  /** All edges in the visible graph */
  edges: GraphEdge[];
  /** Loading state for graph operations */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

export interface GraphActions {
  /** Set the current node and fetch its neighbors */
  setCurrentNode: (nodeId: string) => Promise<void>;
  /** Fetch neighbors for a specific node */
  fetchNeighbors: (nodeId: string, depth?: number) => Promise<void>;
  /** Update a node's data (from real-time updates) */
  updateNode: (nodeId: string, updates: Partial<GraphNode>) => void;
  /** Remove a node from the graph (from real-time updates) */
  removeNode: (nodeId: string) => void;
  /** Add a new node to the graph (from real-time updates) */
  addNode: (node: GraphNode) => void;
  /** Add an edge to the graph */
  addEdge: (edge: GraphEdge) => void;
  /** Remove an edge from the graph */
  removeEdge: (sourceId: string, targetId: string) => void;
  /** Clear the graph state */
  clearGraph: () => void;
  /** Set error state */
  setError: (error: string | null) => void;
}

export type GraphStore = GraphState & GraphActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: GraphState = {
  currentNodeId: null,
  currentNode: null,
  neighbors: [],
  visibleNodes: new Map(),
  edges: [],
  isLoading: false,
  error: null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useGraphStore = create<GraphStore>((set, get) => ({
  ...initialState,

  setCurrentNode: async (nodeId: string): Promise<void> => {
    const state = get();

    // Don't refetch if already current
    if (state.currentNodeId === nodeId && state.currentNode !== null) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const client = getDefaultClient();

      // Fetch the memory details for the current node
      // We use recallMemories with the specific ID to get full memory data
      const recallResponse = await client.recallMemories({
        userId: 'current-user', // TODO: Get from auth context
        text: nodeId,
        limit: 1,
      });

      const currentMemory = recallResponse.memories.find((m) => m.id === nodeId);

      if (!currentMemory) {
        throw new Error(`Memory not found: ${nodeId}`);
      }

      // Fetch the graph data centered on this node
      const graphResponse = await client.getMemoryGraph('current-user', {
        centerMemoryId: nodeId,
        depth: 1,
      });

      // Build neighbors from graph response
      const neighbors: NeighborNode[] = [];
      const visibleNodes = new Map<string, GraphNode>();

      // Add current node to visible nodes
      const currentGraphNode: GraphNode = {
        id: currentMemory.id,
        content: currentMemory.content,
        primarySector: currentMemory.primarySector,
        salience: currentMemory.salience,
        strength: currentMemory.strength,
        createdAt: currentMemory.createdAt,
        metadata: currentMemory.metadata,
      };
      visibleNodes.set(nodeId, currentGraphNode);

      // Process graph nodes and edges
      for (const node of graphResponse.nodes) {
        visibleNodes.set(node.id, node);

        // Find edge connecting this node to current
        const edge = graphResponse.edges.find(
          (e) =>
            (e.source === nodeId && e.target === node.id) ||
            (e.target === nodeId && e.source === node.id)
        );

        if (edge && node.id !== nodeId) {
          neighbors.push({
            ...node,
            edge,
          });
        }
      }

      set({
        currentNodeId: nodeId,
        currentNode: currentMemory,
        neighbors,
        visibleNodes,
        edges: graphResponse.edges,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load node';
      set({ isLoading: false, error: message });
    }
  },

  fetchNeighbors: async (nodeId: string, depth: number = 1): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      const client = getDefaultClient();
      const graphResponse = await client.getMemoryGraph('current-user', {
        centerMemoryId: nodeId,
        depth,
      });

      const state = get();
      const visibleNodes = new Map(state.visibleNodes);
      const neighbors: NeighborNode[] = [];

      // Add new nodes to visible nodes
      for (const node of graphResponse.nodes) {
        visibleNodes.set(node.id, node);

        // Find edge connecting this node to the specified node
        const edge = graphResponse.edges.find(
          (e) =>
            (e.source === nodeId && e.target === node.id) ||
            (e.target === nodeId && e.source === node.id)
        );

        if (edge && node.id !== nodeId) {
          neighbors.push({
            ...node,
            edge,
          });
        }
      }

      // Merge edges (avoid duplicates)
      const existingEdgeKeys = new Set(state.edges.map((e) => `${e.source}-${e.target}`));
      const newEdges = graphResponse.edges.filter(
        (e) => !existingEdgeKeys.has(`${e.source}-${e.target}`)
      );

      set({
        neighbors: state.currentNodeId === nodeId ? neighbors : state.neighbors,
        visibleNodes,
        edges: [...state.edges, ...newEdges],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch neighbors';
      set({ isLoading: false, error: message });
    }
  },

  updateNode: (nodeId: string, updates: Partial<GraphNode>): void => {
    const state = get();
    const visibleNodes = new Map(state.visibleNodes);
    const existingNode = visibleNodes.get(nodeId);

    if (existingNode) {
      visibleNodes.set(nodeId, { ...existingNode, ...updates });

      // Update neighbors if the updated node is a neighbor
      const neighbors = state.neighbors.map((neighbor) =>
        neighbor.id === nodeId ? { ...neighbor, ...updates } : neighbor
      );

      // Update current node if it's the one being updated
      let currentNode = state.currentNode;
      if (state.currentNodeId === nodeId && currentNode) {
        currentNode = {
          ...currentNode,
          ...updates,
        } as Memory;
      }

      set({ visibleNodes, neighbors, currentNode });
    }
  },

  removeNode: (nodeId: string): void => {
    const state = get();

    // Remove from visible nodes
    const visibleNodes = new Map(state.visibleNodes);
    visibleNodes.delete(nodeId);

    // Remove from neighbors
    const neighbors = state.neighbors.filter((n) => n.id !== nodeId);

    // Remove edges connected to this node
    const edges = state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);

    // If current node is removed, clear it
    const currentNodeId = state.currentNodeId === nodeId ? null : state.currentNodeId;
    const currentNode = state.currentNodeId === nodeId ? null : state.currentNode;

    set({ visibleNodes, neighbors, edges, currentNodeId, currentNode });
  },

  addNode: (node: GraphNode): void => {
    const state = get();
    const visibleNodes = new Map(state.visibleNodes);
    visibleNodes.set(node.id, node);
    set({ visibleNodes });
  },

  addEdge: (edge: GraphEdge): void => {
    const state = get();

    // Check if edge already exists
    const exists = state.edges.some(
      (e) =>
        (e.source === edge.source && e.target === edge.target) ||
        (e.source === edge.target && e.target === edge.source)
    );

    if (!exists) {
      const edges = [...state.edges, edge];

      // If edge connects to current node, add the other node as neighbor
      if (state.currentNodeId !== null) {
        const otherNodeId =
          edge.source === state.currentNodeId
            ? edge.target
            : edge.target === state.currentNodeId
              ? edge.source
              : null;

        if (otherNodeId !== null) {
          const otherNode = state.visibleNodes.get(otherNodeId);
          if (otherNode) {
            const neighbors = [
              ...state.neighbors,
              {
                ...otherNode,
                edge,
              },
            ];
            set({ edges, neighbors });
            return;
          }
        }
      }

      set({ edges });
    }
  },

  removeEdge: (sourceId: string, targetId: string): void => {
    const state = get();
    const edges = state.edges.filter(
      (e) =>
        !(
          (e.source === sourceId && e.target === targetId) ||
          (e.source === targetId && e.target === sourceId)
        )
    );

    // Remove from neighbors if edge was connecting to current node
    let neighbors = state.neighbors;
    if (state.currentNodeId === sourceId || state.currentNodeId === targetId) {
      const otherNodeId = state.currentNodeId === sourceId ? targetId : sourceId;
      neighbors = state.neighbors.filter((n) => n.id !== otherNodeId);
    }

    set({ edges, neighbors });
  },

  clearGraph: (): void => {
    set(initialState);
  },

  setError: (error: string | null): void => {
    set({ error });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get visible nodes as an array
 */
export const selectVisibleNodesArray = (state: GraphStore): GraphNode[] =>
  Array.from(state.visibleNodes.values());

/**
 * Get neighbors filtered by sector
 */
export const selectNeighborsBySector = (
  state: GraphStore,
  sector: MemorySectorType
): NeighborNode[] => state.neighbors.filter((n) => n.primarySector === sector);

/**
 * Get edges for a specific node
 */
export const selectEdgesForNode = (state: GraphStore, nodeId: string): GraphEdge[] =>
  state.edges.filter((e) => e.source === nodeId || e.target === nodeId);

/**
 * Check if a node is visible
 */
export const selectIsNodeVisible = (state: GraphStore, nodeId: string): boolean =>
  state.visibleNodes.has(nodeId);
