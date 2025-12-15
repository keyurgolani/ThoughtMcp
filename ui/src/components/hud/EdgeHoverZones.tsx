/**
 * EdgeHoverZones Component
 *
 * Detects when the user hovers near screen edges and shows panels accordingly.
 * In clean mode, panels are hidden by default and only appear when the user
 * hovers near the corresponding screen edge.
 *
 * Requirements: 46.2
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';

// ============================================================================
// Types
// ============================================================================

/** Edge zone identifiers */
export type EdgeZone = 'top' | 'right' | 'bottom' | 'left';

/** Panel position mapping to edge zones */
export interface EdgePanelMapping {
  /** Panel ID */
  panelId: string;
  /** Which edge zone triggers this panel */
  edge: EdgeZone;
  /** Optional secondary edge (for corner panels) */
  secondaryEdge?: EdgeZone;
}

export interface EdgeHoverZonesProps {
  /** Mapping of panels to their edge zones */
  panelMappings: EdgePanelMapping[];
  /** Width of the edge detection zone in pixels */
  edgeWidth?: number;
  /** Delay before showing panel (ms) */
  showDelay?: number;
  /** Delay before hiding panel after leaving edge (ms) */
  hideDelay?: number;
  /** Whether edge hover is enabled (only active in clean mode) */
  enabled?: boolean;
  /** Optional className for the container */
  className?: string;
  /** Children to render (the actual panels) */
  children?: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_EDGE_WIDTH = 40; // pixels from screen edge
const DEFAULT_SHOW_DELAY = 150; // ms before showing panel
const DEFAULT_HIDE_DELAY = 300; // ms before hiding panel after leaving

// ============================================================================
// Component
// ============================================================================

/**
 * EdgeHoverZones - Detects mouse position near screen edges and shows panels
 *
 * Features:
 * - Detects hover near top, right, bottom, left edges
 * - Shows corresponding panels with configurable delay
 * - Hides panels after mouse leaves edge zone
 * - Only active when clean mode is enabled
 */
export function EdgeHoverZones({
  panelMappings,
  edgeWidth = DEFAULT_EDGE_WIDTH,
  showDelay = DEFAULT_SHOW_DELAY,
  hideDelay = DEFAULT_HIDE_DELAY,
  enabled = true,
  className = '',
  children,
}: EdgeHoverZonesProps): React.ReactElement {
  const isCleanMode = useUIStore((state) => state.isCleanMode);
  const showPanel = useUIStore((state) => state.showPanel);
  const hidePanel = useUIStore((state) => state.hidePanel);
  const setHoveredPanel = useUIStore((state) => state.setHoveredPanel);

  // Track which edge zones are currently hovered
  const [hoveredEdges, setHoveredEdges] = useState<Set<EdgeZone>>(new Set());

  // Refs for timeout management
  const showTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const hideTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Determine which edge zone the mouse is in based on position
  const getEdgeZone = useCallback(
    (x: number, y: number): EdgeZone | null => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Check each edge
      if (y <= edgeWidth) return 'top';
      if (x >= windowWidth - edgeWidth) return 'right';
      if (y >= windowHeight - edgeWidth) return 'bottom';
      if (x <= edgeWidth) return 'left';

      return null;
    },
    [edgeWidth]
  );

  // Get panels that should be shown for a given edge zone
  const getPanelsForEdge = useCallback(
    (edge: EdgeZone): string[] => {
      return panelMappings
        .filter((mapping) => mapping.edge === edge || mapping.secondaryEdge === edge)
        .map((mapping) => mapping.panelId);
    },
    [panelMappings]
  );

  // Handle showing a panel with delay
  const scheduleShowPanel = useCallback(
    (panelId: string): void => {
      // Clear any pending hide timeout
      const existingHideTimeout = hideTimeoutRef.current.get(panelId);
      if (existingHideTimeout) {
        clearTimeout(existingHideTimeout);
        hideTimeoutRef.current.delete(panelId);
      }

      // Don't schedule if already scheduled
      if (showTimeoutRef.current.has(panelId)) return;

      const timeout = setTimeout(() => {
        showPanel(panelId);
        setHoveredPanel(panelId);
        showTimeoutRef.current.delete(panelId);
      }, showDelay);

      showTimeoutRef.current.set(panelId, timeout);
    },
    [showPanel, setHoveredPanel, showDelay]
  );

  // Handle hiding a panel with delay
  const scheduleHidePanel = useCallback(
    (panelId: string): void => {
      // Clear any pending show timeout
      const existingShowTimeout = showTimeoutRef.current.get(panelId);
      if (existingShowTimeout) {
        clearTimeout(existingShowTimeout);
        showTimeoutRef.current.delete(panelId);
      }

      // Don't schedule if already scheduled
      if (hideTimeoutRef.current.has(panelId)) return;

      const timeout = setTimeout(() => {
        hidePanel(panelId);
        setHoveredPanel(null);
        hideTimeoutRef.current.delete(panelId);
      }, hideDelay);

      hideTimeoutRef.current.set(panelId, timeout);
    },
    [hidePanel, setHoveredPanel, hideDelay]
  );

  // Handle mouse movement
  const handleMouseMove = useCallback(
    (e: MouseEvent): void => {
      // Only process if clean mode is enabled and edge hover is enabled
      if (!isCleanMode || !enabled) return;

      const currentEdge = getEdgeZone(e.clientX, e.clientY);
      const newHoveredEdges = new Set<EdgeZone>();

      if (currentEdge !== null) {
        newHoveredEdges.add(currentEdge);
      }

      // Determine which panels to show/hide based on edge changes
      const previousEdges = hoveredEdges;

      // Find edges that were entered
      for (const edge of newHoveredEdges) {
        if (!previousEdges.has(edge)) {
          // Entered a new edge zone - schedule showing panels
          const panels = getPanelsForEdge(edge);
          for (const panelId of panels) {
            scheduleShowPanel(panelId);
          }
        }
      }

      // Find edges that were left
      for (const edge of previousEdges) {
        if (!newHoveredEdges.has(edge)) {
          // Left an edge zone - schedule hiding panels
          const panels = getPanelsForEdge(edge);
          for (const panelId of panels) {
            scheduleHidePanel(panelId);
          }
        }
      }

      setHoveredEdges(newHoveredEdges);
    },
    [
      isCleanMode,
      enabled,
      getEdgeZone,
      hoveredEdges,
      getPanelsForEdge,
      scheduleShowPanel,
      scheduleHidePanel,
    ]
  );

  // Set up mouse move listener
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return (): void => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  // Clean up timeouts on unmount
  useEffect(() => {
    // Capture refs at effect setup time
    const showTimeouts = showTimeoutRef.current;
    const hideTimeouts = hideTimeoutRef.current;

    return (): void => {
      // Clear all show timeouts
      for (const timeout of showTimeouts.values()) {
        clearTimeout(timeout);
      }
      showTimeouts.clear();

      // Clear all hide timeouts
      for (const timeout of hideTimeouts.values()) {
        clearTimeout(timeout);
      }
      hideTimeouts.clear();
    };
  }, []);

  // Reset panel visibility when clean mode is toggled off
  useEffect(() => {
    if (!isCleanMode) {
      // Clear all timeouts
      for (const timeout of showTimeoutRef.current.values()) {
        clearTimeout(timeout);
      }
      showTimeoutRef.current.clear();

      for (const timeout of hideTimeoutRef.current.values()) {
        clearTimeout(timeout);
      }
      hideTimeoutRef.current.clear();

      // Reset hovered edges
      setHoveredEdges(new Set());
    }
  }, [isCleanMode]);

  return (
    <div className={`edge-hover-zones ${className}`} data-clean-mode={isCleanMode}>
      {children}
    </div>
  );
}

export default EdgeHoverZones;
