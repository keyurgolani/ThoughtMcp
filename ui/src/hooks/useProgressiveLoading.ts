/**
 * useProgressiveLoading Hook
 *
 * Implements progressive loading of memory nodes, prioritizing
 * nearby nodes for faster initial render and better UX.
 *
 * Requirements: 11.5
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  calculateDistance,
  calculateLoadingPriority,
  sortByLoadingPriority,
} from '../utils/performance';

// ============================================================================
// Types
// ============================================================================

export interface LoadableNode {
  /** Node ID */
  id: string;
  /** Node position */
  position: [number, number, number];
  /** Whether node is loaded */
  isLoaded?: boolean;
}

export interface ProgressiveLoadingConfig {
  /** Number of nodes to load per batch */
  batchSize: number;
  /** Delay between batches in ms */
  batchDelay: number;
  /** Maximum distance to consider for loading */
  maxDistance: number;
  /** Whether to enable progressive loading */
  enabled: boolean;
}

export interface ProgressiveLoadingState {
  /** Currently loaded node IDs */
  loadedNodeIds: Set<string>;
  /** Nodes pending load */
  pendingNodes: LoadableNode[];
  /** Whether loading is in progress */
  isLoading: boolean;
  /** Loading progress (0-1) */
  progress: number;
  /** Total nodes to load */
  totalNodes: number;
}

export interface ProgressiveLoadingResult {
  /** Current loading state */
  state: ProgressiveLoadingState;
  /** Check if a node is loaded */
  isNodeLoaded: (nodeId: string) => boolean;
  /** Start loading nodes */
  startLoading: (nodes: LoadableNode[], centerPosition: [number, number, number]) => void;
  /** Reset loading state */
  reset: () => void;
  /** Pause loading */
  pause: () => void;
  /** Resume loading */
  resume: () => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_PROGRESSIVE_LOADING_CONFIG: ProgressiveLoadingConfig = {
  batchSize: 50,
  batchDelay: 16, // ~60fps
  maxDistance: 100,
  enabled: true,
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useProgressiveLoading(
  config: Partial<ProgressiveLoadingConfig> = {}
): ProgressiveLoadingResult {
  const mergedConfig: ProgressiveLoadingConfig = {
    ...DEFAULT_PROGRESSIVE_LOADING_CONFIG,
    ...config,
  };

  // State
  const [state, setState] = useState<ProgressiveLoadingState>({
    loadedNodeIds: new Set(),
    pendingNodes: [],
    isLoading: false,
    progress: 0,
    totalNodes: 0,
  });

  // Refs for managing loading
  const isPausedRef = useRef(false);
  const loadingQueueRef = useRef<LoadableNode[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Process the next batch of nodes
   */
  const processNextBatch = useCallback(() => {
    if (isPausedRef.current || !mergedConfig.enabled) {
      return;
    }

    const queue = loadingQueueRef.current;
    if (queue.length === 0) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        progress: 1,
        pendingNodes: [],
      }));
      return;
    }

    // Get next batch
    const batch = queue.splice(0, mergedConfig.batchSize);
    const batchIds = new Set(batch.map((n) => n.id));

    setState((prev) => {
      const newLoadedIds = new Set(prev.loadedNodeIds);
      for (const id of batchIds) {
        newLoadedIds.add(id);
      }

      const loadedCount = newLoadedIds.size;
      const progress = prev.totalNodes > 0 ? loadedCount / prev.totalNodes : 1;

      return {
        ...prev,
        loadedNodeIds: newLoadedIds,
        pendingNodes: [...queue],
        progress,
      };
    });

    // Schedule next batch
    if (queue.length > 0) {
      timeoutRef.current = setTimeout(processNextBatch, mergedConfig.batchDelay);
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        progress: 1,
      }));
    }
  }, [mergedConfig.batchSize, mergedConfig.batchDelay, mergedConfig.enabled]);

  /**
   * Start loading nodes from a center position
   */
  const startLoading = useCallback(
    (nodes: LoadableNode[], centerPosition: [number, number, number]) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!mergedConfig.enabled || nodes.length === 0) {
        setState({
          loadedNodeIds: new Set(nodes.map((n) => n.id)),
          pendingNodes: [],
          isLoading: false,
          progress: 1,
          totalNodes: nodes.length,
        });
        return;
      }

      // Calculate distances and sort by priority
      const nodesWithDistance = nodes.map((node) => ({
        ...node,
        distance: calculateDistance(node.position, centerPosition),
        priority: calculateLoadingPriority(
          calculateDistance(node.position, centerPosition),
          mergedConfig.maxDistance
        ),
      }));

      // Sort by distance (closest first)
      const sortedNodes = sortByLoadingPriority(nodesWithDistance);

      // Set up loading queue
      loadingQueueRef.current = sortedNodes;
      isPausedRef.current = false;

      setState({
        loadedNodeIds: new Set(),
        pendingNodes: sortedNodes,
        isLoading: true,
        progress: 0,
        totalNodes: nodes.length,
      });

      // Start processing
      processNextBatch();
    },
    [mergedConfig.enabled, mergedConfig.maxDistance, processNextBatch]
  );

  /**
   * Check if a specific node is loaded
   */
  const isNodeLoaded = useCallback(
    (nodeId: string): boolean => {
      return state.loadedNodeIds.has(nodeId);
    },
    [state.loadedNodeIds]
  );

  /**
   * Reset loading state
   */
  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    loadingQueueRef.current = [];
    isPausedRef.current = false;

    setState({
      loadedNodeIds: new Set(),
      pendingNodes: [],
      isLoading: false,
      progress: 0,
      totalNodes: 0,
    });
  }, []);

  /**
   * Pause loading
   */
  const pause = useCallback(() => {
    isPausedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Resume loading
   */
  const resume = useCallback(() => {
    if (isPausedRef.current && loadingQueueRef.current.length > 0) {
      isPausedRef.current = false;
      processNextBatch();
    }
  }, [processNextBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    isNodeLoaded,
    startLoading,
    reset,
    pause,
    resume,
  };
}

export default useProgressiveLoading;
