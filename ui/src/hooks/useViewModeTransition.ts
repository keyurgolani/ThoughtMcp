/**
 * useViewModeTransition Hook
 *
 * Manages view mode transitions with smooth 500ms animations.
 * Handles position interpolation when switching between view modes.
 *
 * Requirements: 12.5, 43.1, 43.2
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GraphEdge, GraphNode } from '../types/api';
import type { ViewMode } from '../types/scene';
import { prefersReducedMotion } from '../utils/accessibility';
import {
  calculateClusterPositions,
  calculateConnectionCounts,
  calculateFibonacciSpherePositions,
  calculateHubAndSpokePositions,
  calculateTimelinePositions,
  isHubNode,
  type Position3D,
} from '../utils/visualization';

// ============================================================================
// Types
// ============================================================================

export interface ViewModeTransitionConfig {
  /** Transition duration in milliseconds (default: 500) */
  duration?: number;
  /** Easing function (default: 'easeInOut') */
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  /** Current node ID for hub-centric positioning (Requirements: 43.1, 43.2) */
  currentNodeId?: string;
  /** Edges for calculating connection counts (Requirements: 43.1, 43.2) */
  edges?: GraphEdge[];
  /** Whether to enable hub-aware positioning (default: true) */
  enableHubPositioning?: boolean;
}

export interface ViewModeTransitionState {
  /** Current view mode */
  currentMode: ViewMode;
  /** Whether a transition is in progress */
  isTransitioning: boolean;
  /** Progress of the current transition (0-1) */
  transitionProgress: number;
  /** Node positions for the current state (interpolated during transition) */
  nodePositions: Map<string, Position3D>;
}

export interface ViewModeTransitionActions {
  /** Transition to a new view mode */
  transitionTo: (mode: ViewMode) => void;
  /** Update node positions for the current mode */
  updatePositions: (nodes: GraphNode[]) => void;
  /** Cancel any ongoing transition */
  cancelTransition: () => void;
}

export type UseViewModeTransitionReturn = ViewModeTransitionState & ViewModeTransitionActions;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DURATION = 500;
const DEFAULT_EASING = 'easeInOut';

// ============================================================================
// Easing Functions
// ============================================================================

type EasingFunction = (t: number) => number;

const easingFunctions = {
  linear: (t: number): number => t,
  easeIn: (t: number): number => t * t,
  easeOut: (t: number): number => t * (2 - t),
  easeInOut: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
} as const satisfies Record<string, EasingFunction>;

// Default easing function
const defaultEasing: EasingFunction = easingFunctions.easeInOut;

// ============================================================================
// Position Calculation Helpers
// ============================================================================

export interface HubAwarePositionConfig {
  /** Current node ID for hub-centric positioning */
  currentNodeId?: string | undefined;
  /** Edges for calculating connection counts */
  edges?: GraphEdge[] | undefined;
  /** Whether to enable hub-aware positioning (default: true) */
  enableHubPositioning?: boolean | undefined;
}

/**
 * Calculate positions for nodes based on view mode.
 * Supports hub-aware positioning for fly/orbit modes when edges are provided.
 *
 * Requirements: 12.5, 43.1, 43.2
 */
function calculatePositionsForMode(
  nodes: GraphNode[],
  mode: ViewMode,
  hubConfig?: HubAwarePositionConfig
): Map<string, Position3D> {
  const { currentNodeId, edges = [], enableHubPositioning = true } = hubConfig ?? {};

  switch (mode) {
    case 'fly':
    case 'orbit': {
      // Check if we should use hub-aware positioning
      if (
        enableHubPositioning &&
        currentNodeId != null &&
        currentNodeId !== '' &&
        edges.length > 0
      ) {
        // Calculate connection counts for all nodes
        const nodeIds = nodes.map((n) => n.id);
        const connectionCounts = calculateConnectionCounts(nodeIds, edges);

        // Get current node's connection count
        const currentNodeConnectionCount = connectionCounts.get(currentNodeId) ?? 0;

        // If current node is a hub, use hub-and-spoke layout
        if (isHubNode(currentNodeConnectionCount)) {
          const neighborIds = nodes.filter((n) => n.id !== currentNodeId).map((n) => n.id);
          return calculateHubAndSpokePositions(
            currentNodeId,
            currentNodeConnectionCount,
            neighborIds,
            { radius: 6 }
          );
        }
      }

      // Fall back to Fibonacci sphere for non-hub nodes or when hub positioning is disabled
      const spherePositions = calculateFibonacciSpherePositions(nodes.length, 5);
      const flyPositions = new Map<string, Position3D>();
      nodes.forEach((node, index) => {
        flyPositions.set(node.id, spherePositions[index] ?? [0, 0, 0]);
      });
      return flyPositions;
    }

    case 'timeline':
      return calculateTimelinePositions(nodes.map((n) => ({ id: n.id, createdAt: n.createdAt })));

    case 'cluster':
      return calculateClusterPositions(
        nodes.map((n) => ({ id: n.id, primarySector: n.primarySector }))
      );

    default:
      return new Map();
  }
}

/**
 * Interpolate between two positions
 */
function interpolatePosition(from: Position3D, to: Position3D, t: number): Position3D {
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ];
}

/**
 * Interpolate between two position maps
 */
function interpolatePositions(
  from: Map<string, Position3D>,
  to: Map<string, Position3D>,
  t: number
): Map<string, Position3D> {
  const result = new Map<string, Position3D>();

  // Get all unique node IDs
  const allIds = new Set([...from.keys(), ...to.keys()]);

  for (const id of allIds) {
    const fromPos = from.get(id) ?? [0, 0, 0];
    const toPos = to.get(id) ?? fromPos;
    result.set(id, interpolatePosition(fromPos, toPos, t));
  }

  return result;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing view mode transitions with smooth animations.
 * Supports hub-aware positioning for fly/orbit modes when edges are provided.
 *
 * @param initialMode - Initial view mode (default: 'fly')
 * @param nodes - Array of graph nodes to position
 * @param config - Transition configuration including hub positioning options
 * @returns State and actions for view mode transitions
 *
 * Requirements: 12.5, 43.1, 43.2
 */
export function useViewModeTransition(
  initialMode: ViewMode = 'fly',
  nodes: GraphNode[] = [],
  config: ViewModeTransitionConfig = {}
): UseViewModeTransitionReturn {
  const {
    duration = DEFAULT_DURATION,
    easing = DEFAULT_EASING,
    currentNodeId,
    edges = [],
    enableHubPositioning = true,
  } = config;

  // Hub configuration for position calculations - memoized to prevent unnecessary re-renders
  const hubConfig: HubAwarePositionConfig = useMemo(
    () => ({
      currentNodeId,
      edges,
      enableHubPositioning,
    }),
    [currentNodeId, edges, enableHubPositioning]
  );

  // State
  const [currentMode, setCurrentMode] = useState<ViewMode>(initialMode);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [nodePositions, setNodePositions] = useState<Map<string, Position3D>>(() =>
    calculatePositionsForMode(nodes, initialMode, hubConfig)
  );

  // Refs for animation
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const fromPositionsRef = useRef<Map<string, Position3D>>(new Map());
  const toPositionsRef = useRef<Map<string, Position3D>>(new Map());
  const targetModeRef = useRef<ViewMode>(initialMode);
  const nodesRef = useRef<GraphNode[]>(nodes);
  const hubConfigRef = useRef<HubAwarePositionConfig>(hubConfig);

  // Update hub config ref when it changes
  useEffect(() => {
    hubConfigRef.current = hubConfig;
  }, [hubConfig]);

  // Update nodes ref when nodes change
  useEffect(() => {
    nodesRef.current = nodes;
    // Recalculate positions if not transitioning
    if (!isTransitioning) {
      setNodePositions(calculatePositionsForMode(nodes, currentMode, hubConfigRef.current));
    }
  }, [nodes, currentMode, isTransitioning, currentNodeId, edges, enableHubPositioning]);

  // Cancel transition
  const cancelTransition = useCallback((): void => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsTransitioning(false);
    setTransitionProgress(0);
  }, []);

  // Transition to new mode
  const transitionTo = useCallback(
    (mode: ViewMode): void => {
      if (mode === currentMode || isTransitioning) {
        return;
      }

      const reducedMotion = prefersReducedMotion();

      // If reduced motion is preferred, skip animation
      if (reducedMotion) {
        const newPositions = calculatePositionsForMode(
          nodesRef.current,
          mode,
          hubConfigRef.current
        );
        setNodePositions(newPositions);
        setCurrentMode(mode);
        return;
      }

      // Start transition
      setIsTransitioning(true);
      setTransitionProgress(0);

      // Store from and to positions
      fromPositionsRef.current = new Map(nodePositions);
      toPositionsRef.current = calculatePositionsForMode(
        nodesRef.current,
        mode,
        hubConfigRef.current
      );
      targetModeRef.current = mode;
      startTimeRef.current = performance.now();

      // Get easing function
      const easingFn: EasingFunction = Object.prototype.hasOwnProperty.call(easingFunctions, easing)
        ? easingFunctions[easing]
        : defaultEasing;

      // Animation loop
      const animate = (currentTime: number): void => {
        const elapsed = currentTime - startTimeRef.current;
        const rawProgress = Math.min(elapsed / duration, 1);
        const easedProgress = easingFn(rawProgress);

        // Update progress
        setTransitionProgress(rawProgress);

        // Interpolate positions
        const interpolated = interpolatePositions(
          fromPositionsRef.current,
          toPositionsRef.current,
          easedProgress
        );
        setNodePositions(interpolated);

        // Continue or complete
        if (rawProgress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Transition complete
          setCurrentMode(targetModeRef.current);
          setIsTransitioning(false);
          setTransitionProgress(0);
          animationFrameRef.current = null;
        }
      };

      // Start animation
      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [currentMode, isTransitioning, nodePositions, duration, easing]
  );

  // Update positions for current mode
  const updatePositions = useCallback(
    (newNodes: GraphNode[]): void => {
      nodesRef.current = newNodes;
      if (!isTransitioning) {
        setNodePositions(calculatePositionsForMode(newNodes, currentMode, hubConfigRef.current));
      }
    },
    [currentMode, isTransitioning]
  );

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    currentMode,
    isTransitioning,
    transitionProgress,
    nodePositions,
    transitionTo,
    updatePositions,
    cancelTransition,
  };
}

export default useViewModeTransition;
