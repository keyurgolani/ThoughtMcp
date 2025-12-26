/**
 * useNavigationTransition Hook
 *
 * Integrates warp transitions with navigation and graph state management.
 * Handles the complete navigation flow including:
 * - Locking navigation during transition
 * - Updating current node on completion
 * - Positioning previous node behind user
 *
 * Requirements: 4.4, 4.5, 4.8
 */

import { useThree } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useGraphStore } from '../stores/graphStore';
import { useNavigationStore } from '../stores/navigationStore';
import type { WarpTransitionConfig } from './useWarpTransition';
import { useWarpTransition } from './useWarpTransition';

// ============================================================================
// Types
// ============================================================================

export interface NavigationTransitionState {
  /** Whether a navigation transition is in progress */
  isNavigating: boolean;
  /** Progress of current navigation (0-1) */
  progress: number;
  /** Current motion blur intensity */
  blurIntensity: number;
  /** ID of the node being navigated to */
  targetNodeId: string | null;
  /** ID of the previous node (for positioning behind user) */
  previousNodeId: string | null;
}

export interface NavigationTransitionActions {
  /** Navigate to a node with warp animation */
  navigateToNode: (
    nodeId: string,
    targetPosition: [number, number, number],
    label?: string
  ) => boolean;
  /** Cancel current navigation */
  cancelNavigation: () => void;
  /** Go back to previous node */
  goBack: () => boolean;
  /** Go forward in history */
  goForward: () => boolean;
  /** Calculate position behind user for previous node */
  calculatePreviousNodePosition: () => [number, number, number];
}

export type UseNavigationTransitionReturn = NavigationTransitionState & NavigationTransitionActions;

// ============================================================================
// Constants
// ============================================================================

/** Distance to place previous node behind user */
const PREVIOUS_NODE_DISTANCE = 5;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useNavigationTransition(
  config?: Partial<WarpTransitionConfig>
): UseNavigationTransitionReturn {
  const { camera } = useThree();

  // Stores
  const {
    navigateTo,
    goBack: navGoBack,
    goForward: navGoForward,
    isTransitioning,
    getCurrentNodeId,
    getPreviousNodeId,
    canGoBack,
    canGoForward,
  } = useNavigationStore();

  const { setCurrentNode } = useGraphStore();

  // Warp transition hook
  const { isWarping, progress, currentBlurIntensity, startWarp, cancelWarp } =
    useWarpTransition(config);

  // Track target node during navigation
  const targetNodeIdRef = useRef<string | null>(null);
  const targetLabelRef = useRef<string | undefined>(undefined);

  /**
   * Calculate position behind user for previous node (Requirement 4.5)
   * Places the previous node at a fixed distance behind the camera's current direction
   */
  const calculatePreviousNodePosition = useCallback((): [number, number, number] => {
    // Get camera direction
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    // Calculate position behind camera
    const behindPosition = camera.position.clone();
    behindPosition.addScaledVector(direction, -PREVIOUS_NODE_DISTANCE);

    return [behindPosition.x, behindPosition.y, behindPosition.z];
  }, [camera]);

  /**
   * Handle warp completion - update stores and state
   */
  const handleWarpComplete = useCallback(() => {
    const nodeId = targetNodeIdRef.current;
    const label = targetLabelRef.current;

    if (nodeId !== null && nodeId !== '') {
      // Update navigation history (Requirement 4.4)
      navigateTo(nodeId, label);

      // Update graph store with new current node
      setCurrentNode(nodeId).catch((error: unknown) => {
        console.error('Failed to set current node:', error);
      });
    }

    // Clear refs
    targetNodeIdRef.current = null;
    targetLabelRef.current = undefined;
  }, [navigateTo, setCurrentNode]);

  /**
   * Navigate to a node with warp animation
   */
  const navigateToNode = useCallback(
    (nodeId: string, targetPosition: [number, number, number], label?: string): boolean => {
      // Check if navigation is locked (Requirement 4.8)
      if (isTransitioning || isWarping) {
        return false;
      }

      // Don't navigate to current node
      const currentNodeId = getCurrentNodeId();
      if (currentNodeId === nodeId) {
        return false;
      }

      // Store target info for completion handler
      targetNodeIdRef.current = nodeId;
      targetLabelRef.current = label;

      // Start warp transition
      startWarp(targetPosition, nodeId, handleWarpComplete);

      return true;
    },
    [isTransitioning, isWarping, getCurrentNodeId, startWarp, handleWarpComplete]
  );

  /**
   * Cancel current navigation
   */
  const cancelNavigation = useCallback(() => {
    cancelWarp();
    targetNodeIdRef.current = null;
    targetLabelRef.current = undefined;
  }, [cancelWarp]);

  /**
   * Go back to previous node
   * Note: This requires knowing the position of the previous node,
   * which should be stored in the graph store or calculated
   */
  const goBack = useCallback((): boolean => {
    // Check if we can go back
    if (!canGoBack() || isTransitioning || isWarping) {
      return false;
    }

    // Get previous node ID
    const previousNodeId = navGoBack();
    if (previousNodeId === null || previousNodeId === '') {
      return false;
    }

    // The position for back navigation is the "previous node position"
    // which was placed behind the user after the last navigation
    const backPosition = calculatePreviousNodePosition();

    // Store target info
    targetNodeIdRef.current = previousNodeId;

    // Start warp to previous position
    startWarp(backPosition, previousNodeId, () => {
      // On back navigation, we don't call navigateTo since navGoBack already updated history
      setCurrentNode(previousNodeId).catch((error: unknown) => {
        console.error('Failed to set current node on back:', error);
      });
      targetNodeIdRef.current = null;
    });

    return true;
  }, [
    canGoBack,
    isTransitioning,
    isWarping,
    navGoBack,
    calculatePreviousNodePosition,
    startWarp,
    setCurrentNode,
  ]);

  /**
   * Go forward in history
   */
  const goForward = useCallback((): boolean => {
    // Check if we can go forward
    if (!canGoForward() || isTransitioning || isWarping) {
      return false;
    }

    // Get next node ID
    const nextNodeId = navGoForward();
    if (nextNodeId === null || nextNodeId === '') {
      return false;
    }

    // For forward navigation, we need to calculate a position in front
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const forwardPosition = camera.position.clone();
    forwardPosition.addScaledVector(direction, PREVIOUS_NODE_DISTANCE);

    // Store target info
    targetNodeIdRef.current = nextNodeId;

    // Start warp to forward position
    startWarp([forwardPosition.x, forwardPosition.y, forwardPosition.z], nextNodeId, () => {
      // On forward navigation, we don't call navigateTo since navGoForward already updated history
      setCurrentNode(nextNodeId).catch((error: unknown) => {
        console.error('Failed to set current node on forward:', error);
      });
      targetNodeIdRef.current = null;
    });

    return true;
  }, [canGoForward, isTransitioning, isWarping, navGoForward, camera, startWarp, setCurrentNode]);

  return {
    // State
    isNavigating: isWarping,
    progress,
    blurIntensity: currentBlurIntensity,
    targetNodeId: targetNodeIdRef.current,
    previousNodeId: getPreviousNodeId(),

    // Actions
    navigateToNode,
    cancelNavigation,
    goBack,
    goForward,
    calculatePreviousNodePosition,
  };
}

export default useNavigationTransition;
