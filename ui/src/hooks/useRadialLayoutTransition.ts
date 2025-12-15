/**
 * useRadialLayoutTransition Hook
 *
 * Manages smooth transitions to radial layout when navigating to hub nodes.
 * When the user navigates to a node with >5 connections (hub), neighbors
 * smoothly transition from their current positions to a radial arrangement.
 *
 * Requirements: 43.4
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../utils/accessibility';
import {
  calculateFibonacciSpherePositions,
  calculateRadialNeighborPositions,
  isHubNode,
  type Position3D,
} from '../utils/visualization';

// ============================================================================
// Types
// ============================================================================

export interface RadialLayoutTransitionConfig {
  /** Transition duration in milliseconds (default: 600) */
  duration?: number;
  /** Easing function (default: 'easeInOut') */
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  /** Radius for radial layout (default: 6) */
  radialRadius?: number;
  /** Radius for Fibonacci sphere layout (default: 8) */
  sphereRadius?: number;
  /** Whether to add Y variation in radial layout (default: true) */
  addYVariation?: boolean;
}

export interface RadialLayoutTransitionState {
  /** Whether a layout transition is in progress */
  isTransitioning: boolean;
  /** Progress of the current transition (0-1) */
  transitionProgress: number;
  /** Current node positions (interpolated during transition) */
  nodePositions: Map<string, Position3D>;
  /** Whether the current layout is radial (hub-centric) */
  isRadialLayout: boolean;
}

export interface RadialLayoutTransitionActions {
  /** Trigger transition to new layout based on current node */
  transitionToNode: (currentNodeId: string, neighborIds: string[], connectionCount: number) => void;
  /** Update positions without animation (for initial load) */
  setPositionsImmediate: (
    currentNodeId: string,
    neighborIds: string[],
    connectionCount: number
  ) => void;
  /** Cancel any ongoing transition */
  cancelTransition: () => void;
  /** Get position for a specific node */
  getNodePosition: (nodeId: string) => Position3D;
}

export type UseRadialLayoutTransitionReturn = RadialLayoutTransitionState &
  RadialLayoutTransitionActions;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DURATION = 600;
const DEFAULT_RADIAL_RADIUS = 6;
const DEFAULT_SPHERE_RADIUS = 8;

// ============================================================================
// Easing Functions
// ============================================================================

type EasingFunction = (t: number) => number;

const easingFunctions: Record<string, EasingFunction> = {
  linear: (t: number): number => t,
  easeIn: (t: number): number => t * t,
  easeOut: (t: number): number => t * (2 - t),
  easeInOut: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

// ============================================================================
// Position Calculation Helpers
// ============================================================================

/**
 * Calculate positions based on whether the current node is a hub.
 * Hub nodes get radial layout, non-hub nodes get Fibonacci sphere.
 */
function calculateLayoutPositions(
  currentNodeId: string,
  neighborIds: string[],
  isHub: boolean,
  config: {
    radialRadius: number;
    sphereRadius: number;
    addYVariation: boolean;
  }
): Map<string, Position3D> {
  if (isHub) {
    // Use radial layout for hub nodes
    return calculateRadialNeighborPositions(currentNodeId, neighborIds, {
      radius: config.radialRadius,
      yOffset: 0,
      startAngle: 0,
      addYVariation: config.addYVariation,
    });
  } else {
    // Use Fibonacci sphere for non-hub nodes
    const positions = new Map<string, Position3D>();
    positions.set(currentNodeId, [0, 0, 0]);

    if (neighborIds.length > 0) {
      const spherePositions = calculateFibonacciSpherePositions(
        neighborIds.length,
        config.sphereRadius
      );
      neighborIds.forEach((id, index) => {
        positions.set(id, spherePositions[index] ?? [0, 0, 0]);
      });
    }

    return positions;
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
 * Hook for managing smooth transitions to radial layout when navigating to hub nodes.
 *
 * @param config - Transition configuration
 * @returns State and actions for radial layout transitions
 *
 * Requirements: 43.4
 */
export function useRadialLayoutTransition(
  config: RadialLayoutTransitionConfig = {}
): UseRadialLayoutTransitionReturn {
  const {
    duration = DEFAULT_DURATION,
    easing = 'easeInOut',
    radialRadius = DEFAULT_RADIAL_RADIUS,
    sphereRadius = DEFAULT_SPHERE_RADIUS,
    addYVariation = true,
  } = config;

  // State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [nodePositions, setNodePositions] = useState<Map<string, Position3D>>(new Map());
  const [isRadialLayout, setIsRadialLayout] = useState(false);

  // Refs for animation
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const fromPositionsRef = useRef<Map<string, Position3D>>(new Map());
  const toPositionsRef = useRef<Map<string, Position3D>>(new Map());
  const targetIsRadialRef = useRef<boolean>(false);

  // Layout config ref
  const layoutConfigRef = useRef({ radialRadius, sphereRadius, addYVariation });
  useEffect(() => {
    layoutConfigRef.current = { radialRadius, sphereRadius, addYVariation };
  }, [radialRadius, sphereRadius, addYVariation]);

  // Cancel transition
  const cancelTransition = useCallback((): void => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsTransitioning(false);
    setTransitionProgress(0);
  }, []);

  // Set positions immediately without animation
  const setPositionsImmediate = useCallback(
    (currentNodeId: string, neighborIds: string[], connectionCount: number): void => {
      const isHub = isHubNode(connectionCount);
      const positions = calculateLayoutPositions(
        currentNodeId,
        neighborIds,
        isHub,
        layoutConfigRef.current
      );
      setNodePositions(positions);
      setIsRadialLayout(isHub);
    },
    []
  );

  // Transition to new layout
  const transitionToNode = useCallback(
    (currentNodeId: string, neighborIds: string[], connectionCount: number): void => {
      const isHub = isHubNode(connectionCount);
      const reducedMotion = prefersReducedMotion();

      // Calculate target positions
      const targetPositions = calculateLayoutPositions(
        currentNodeId,
        neighborIds,
        isHub,
        layoutConfigRef.current
      );

      // If reduced motion is preferred or no current positions, skip animation
      if (reducedMotion || nodePositions.size === 0) {
        setNodePositions(targetPositions);
        setIsRadialLayout(isHub);
        return;
      }

      // Cancel any ongoing transition
      cancelTransition();

      // Start transition
      setIsTransitioning(true);
      setTransitionProgress(0);

      // Store from and to positions
      fromPositionsRef.current = new Map(nodePositions);
      toPositionsRef.current = targetPositions;
      targetIsRadialRef.current = isHub;
      startTimeRef.current = performance.now();

      // Get easing function
      const easingFn: EasingFunction =
        easingFunctions[easing] ?? (easingFunctions.easeInOut as EasingFunction);

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
          setIsRadialLayout(targetIsRadialRef.current);
          setIsTransitioning(false);
          setTransitionProgress(0);
          animationFrameRef.current = null;
        }
      };

      // Start animation
      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [nodePositions, duration, easing, cancelTransition]
  );

  // Get position for a specific node
  const getNodePosition = useCallback(
    (nodeId: string): Position3D => {
      return nodePositions.get(nodeId) ?? [0, 0, 0];
    },
    [nodePositions]
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
    isTransitioning,
    transitionProgress,
    nodePositions,
    isRadialLayout,
    transitionToNode,
    setPositionsImmediate,
    cancelTransition,
    getNodePosition,
  };
}

export default useRadialLayoutTransition;
