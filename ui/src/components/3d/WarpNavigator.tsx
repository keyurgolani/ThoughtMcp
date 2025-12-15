/**
 * WarpNavigator Component
 *
 * Handles warp transition animations when navigating between memory nodes.
 * This component must be placed inside the R3F Canvas to access the camera.
 *
 * Requirements: 4.1-4.5
 */

import { useEffect, useRef } from 'react';
import { useWarpTransition } from '../../hooks/useWarpTransition';
import { useGraphStore } from '../../stores/graphStore';

// ============================================================================
// Types
// ============================================================================

export interface WarpNavigatorProps {
  /** Callback when warp transition starts */
  onWarpStart?: ((targetNodeId: string) => void) | undefined;
  /** Callback when warp transition completes */
  onWarpComplete?: ((targetNodeId: string) => void) | undefined;
  /** Target position to warp to (set externally when node is clicked) */
  targetPosition?: [number, number, number] | null | undefined;
  /** Target node ID to warp to */
  targetNodeId?: string | null | undefined;
  /** Trigger to start the warp (increment to trigger) */
  warpTrigger?: number | undefined;
}

// ============================================================================
// Component
// ============================================================================

export function WarpNavigator({
  onWarpStart,
  onWarpComplete,
  targetPosition,
  targetNodeId,
  warpTrigger = 0,
}: WarpNavigatorProps): null {
  const { startWarp, isWarping, cancelWarp } = useWarpTransition();
  const lastTriggerRef = useRef(0);
  const currentNodeId = useGraphStore((state) => state.currentNodeId);

  // Handle warp trigger changes
  useEffect(() => {
    // Only trigger if warpTrigger changed and we have valid target data
    const validTargetPosition = targetPosition;
    const validTargetNodeId = targetNodeId;

    if (
      warpTrigger > lastTriggerRef.current &&
      validTargetPosition !== null &&
      validTargetPosition !== undefined &&
      validTargetNodeId !== null &&
      validTargetNodeId !== undefined &&
      validTargetNodeId !== '' &&
      !isWarping &&
      validTargetNodeId !== currentNodeId
    ) {
      lastTriggerRef.current = warpTrigger;

      // Notify warp start
      onWarpStart?.(validTargetNodeId);

      // Start the warp transition
      startWarp(validTargetPosition, validTargetNodeId, () => {
        // Warp complete callback
        onWarpComplete?.(validTargetNodeId);
      });
    }
  }, [
    warpTrigger,
    targetPosition,
    targetNodeId,
    isWarping,
    currentNodeId,
    startWarp,
    onWarpStart,
    onWarpComplete,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      if (isWarping) {
        cancelWarp();
      }
    };
  }, [isWarping, cancelWarp]);

  // This component doesn't render anything - it just manages the warp transition
  return null;
}

export default WarpNavigator;
