/**
 * useEdgeHover Hook
 *
 * Hook for detecting when the mouse is near screen edges.
 * Used to show panels on hover in clean mode.
 *
 * Requirements: 46.2
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../stores/uiStore';

// ============================================================================
// Types
// ============================================================================

/** Edge zone identifiers */
export type EdgeZone =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface UseEdgeHoverOptions {
  /** Width of the edge detection zone in pixels */
  edgeWidth?: number;
  /** Delay before triggering hover state (ms) */
  hoverDelay?: number;
  /** Whether edge hover detection is enabled */
  enabled?: boolean;
}

export interface UseEdgeHoverResult {
  /** Currently hovered edge zone (null if not near any edge) */
  hoveredEdge: EdgeZone | null;
  /** Whether the mouse is near any edge */
  isNearEdge: boolean;
  /** Whether the mouse is near the top edge */
  isNearTop: boolean;
  /** Whether the mouse is near the right edge */
  isNearRight: boolean;
  /** Whether the mouse is near the bottom edge */
  isNearBottom: boolean;
  /** Whether the mouse is near the left edge */
  isNearLeft: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_EDGE_WIDTH = 40; // pixels from screen edge
const DEFAULT_HOVER_DELAY = 100; // ms before triggering hover

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to detect when mouse is near screen edges
 *
 * @param options - Configuration options
 * @returns Edge hover state
 */
export function useEdgeHover(options: UseEdgeHoverOptions = {}): UseEdgeHoverResult {
  const {
    edgeWidth = DEFAULT_EDGE_WIDTH,
    hoverDelay = DEFAULT_HOVER_DELAY,
    enabled = true,
  } = options;

  const isCleanMode = useUIStore((state) => state.isCleanMode);
  const [hoveredEdge, setHoveredEdge] = useState<EdgeZone | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine which edge zone the mouse is in
  const getEdgeZone = useCallback(
    (x: number, y: number): EdgeZone | null => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      const nearTop = y <= edgeWidth;
      const nearRight = x >= windowWidth - edgeWidth;
      const nearBottom = y >= windowHeight - edgeWidth;
      const nearLeft = x <= edgeWidth;

      // Check corners first
      if (nearTop && nearLeft) return 'top-left';
      if (nearTop && nearRight) return 'top-right';
      if (nearBottom && nearLeft) return 'bottom-left';
      if (nearBottom && nearRight) return 'bottom-right';

      // Then check edges
      if (nearTop) return 'top';
      if (nearRight) return 'right';
      if (nearBottom) return 'bottom';
      if (nearLeft) return 'left';

      return null;
    },
    [edgeWidth]
  );

  // Handle mouse movement
  const handleMouseMove = useCallback(
    (e: MouseEvent): void => {
      // Only process if clean mode is enabled and edge hover is enabled
      if (!isCleanMode || !enabled) {
        if (hoveredEdge !== null) {
          setHoveredEdge(null);
        }
        return;
      }

      const currentEdge = getEdgeZone(e.clientX, e.clientY);

      // Clear existing timeout
      if (hoverTimeoutRef.current !== null) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      if (currentEdge !== hoveredEdge) {
        if (currentEdge !== null) {
          // Entering an edge zone - apply delay
          hoverTimeoutRef.current = setTimeout(() => {
            setHoveredEdge(currentEdge);
            hoverTimeoutRef.current = null;
          }, hoverDelay);
        } else {
          // Leaving edge zone - immediate update
          setHoveredEdge(null);
        }
      }
    },
    [isCleanMode, enabled, getEdgeZone, hoveredEdge, hoverDelay]
  );

  // Set up mouse move listener
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return (): void => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  // Clean up timeout on unmount
  useEffect(() => {
    return (): void => {
      if (hoverTimeoutRef.current !== null) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Reset when clean mode is toggled off
  useEffect(() => {
    if (!isCleanMode) {
      setHoveredEdge(null);
      if (hoverTimeoutRef.current !== null) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    }
  }, [isCleanMode]);

  // Compute derived state
  const isNearEdge = hoveredEdge !== null;
  const isNearTop =
    hoveredEdge === 'top' || hoveredEdge === 'top-left' || hoveredEdge === 'top-right';
  const isNearRight =
    hoveredEdge === 'right' || hoveredEdge === 'top-right' || hoveredEdge === 'bottom-right';
  const isNearBottom =
    hoveredEdge === 'bottom' || hoveredEdge === 'bottom-left' || hoveredEdge === 'bottom-right';
  const isNearLeft =
    hoveredEdge === 'left' || hoveredEdge === 'top-left' || hoveredEdge === 'bottom-left';

  return {
    hoveredEdge,
    isNearEdge,
    isNearTop,
    isNearRight,
    isNearBottom,
    isNearLeft,
  };
}

/**
 * Hook to check if a specific panel should be visible based on edge hover
 *
 * @param panelId - The ID of the panel
 * @param edge - The edge zone that triggers this panel
 * @returns Whether the panel should be visible
 */
export function useEdgePanelVisibility(panelId: string, edge: EdgeZone): boolean {
  const isCleanMode = useUIStore((state) => state.isCleanMode);
  const isPanelVisible = useUIStore((state) => state.isPanelVisible);
  const { hoveredEdge } = useEdgeHover();

  // In normal mode, all panels are visible
  if (!isCleanMode) return true;

  // In clean mode, check if this panel should be visible
  // Either because it's in the visible panels set or because the edge is hovered
  const isEdgeHovered =
    hoveredEdge === edge ||
    (edge === 'top' && (hoveredEdge === 'top-left' || hoveredEdge === 'top-right')) ||
    (edge === 'right' && (hoveredEdge === 'top-right' || hoveredEdge === 'bottom-right')) ||
    (edge === 'bottom' && (hoveredEdge === 'bottom-left' || hoveredEdge === 'bottom-right')) ||
    (edge === 'left' && (hoveredEdge === 'top-left' || hoveredEdge === 'bottom-left'));

  return isPanelVisible(panelId) || isEdgeHovered;
}
