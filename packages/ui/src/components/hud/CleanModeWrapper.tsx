/**
 * CleanModeWrapper Component
 *
 * Wrapper component that combines CleanModeController with EdgeHoverZones
 * to provide a complete clean mode experience with edge hover panels.
 *
 * Requirements: 46.1, 46.2, 46.5
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { CleanModeController } from './CleanModeController';
import type { EdgeZone } from './EdgeHoverZones';

// ============================================================================
// Types
// ============================================================================

/** Panel configuration for edge hover */
export interface EdgePanelConfig {
  /** Unique panel identifier */
  id: string;
  /** Which edge triggers this panel */
  edge: EdgeZone;
  /** The panel content to render */
  content: React.ReactNode;
  /** Optional className for the panel container */
  className?: string;
}

export interface CleanModeWrapperProps {
  /** Panel configurations for edge hover */
  panels: EdgePanelConfig[];
  /** Width of the edge detection zone in pixels */
  edgeWidth?: number;
  /** Delay before showing panel (ms) */
  showDelay?: number;
  /** Delay before hiding panel after leaving edge (ms) */
  hideDelay?: number;
  /** Optional callback when clean mode changes */
  onCleanModeChange?: (isCleanMode: boolean) => void;
  /** Optional children to render in the minimal toolbar */
  toolbarContent?: React.ReactNode;
  /** Optional className for the wrapper */
  className?: string;
  /** Main content (the 3D scene, etc.) */
  children?: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_EDGE_WIDTH = 50; // pixels from screen edge
const DEFAULT_SHOW_DELAY = 100; // ms before showing panel
const DEFAULT_HIDE_DELAY = 400; // ms before hiding panel after leaving

// ============================================================================
// Component
// ============================================================================

/**
 * CleanModeWrapper - Complete clean mode experience with edge hover panels
 *
 * Features:
 * - Integrates CleanModeController for toggle functionality
 * - Detects hover near screen edges and shows corresponding panels
 * - Smooth show/hide animations with configurable delays
 * - Only active when clean mode is enabled
 */
export function CleanModeWrapper({
  panels,
  edgeWidth = DEFAULT_EDGE_WIDTH,
  showDelay = DEFAULT_SHOW_DELAY,
  hideDelay = DEFAULT_HIDE_DELAY,
  onCleanModeChange,
  toolbarContent,
  className = '',
  children,
}: CleanModeWrapperProps): React.ReactElement {
  const isCleanMode = useUIStore((state) => state.isCleanMode);
  const showPanel = useUIStore((state) => state.showPanel);
  const hidePanel = useUIStore((state) => state.hidePanel);
  const visiblePanels = useUIStore((state) => state.visiblePanels);

  // Track which edges are currently hovered
  const [hoveredEdges, setHoveredEdges] = useState<Set<EdgeZone>>(new Set());

  // Refs for timeout management
  const showTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const hideTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Determine which edge zone the mouse is in
  const getEdgeZone = useCallback(
    (x: number, y: number): EdgeZone | null => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Check each edge (priority: corners handled by checking both edges)
      if (y <= edgeWidth) return 'top';
      if (x >= windowWidth - edgeWidth) return 'right';
      if (y >= windowHeight - edgeWidth) return 'bottom';
      if (x <= edgeWidth) return 'left';

      return null;
    },
    [edgeWidth]
  );

  // Get panels for a specific edge
  const getPanelsForEdge = useCallback(
    (edge: EdgeZone): EdgePanelConfig[] => {
      return panels.filter((panel) => panel.edge === edge);
    },
    [panels]
  );

  // Schedule showing a panel
  const scheduleShowPanel = useCallback(
    (panelId: string): void => {
      // Clear any pending hide timeout
      const existingHideTimeout = hideTimeoutsRef.current.get(panelId);
      if (existingHideTimeout) {
        clearTimeout(existingHideTimeout);
        hideTimeoutsRef.current.delete(panelId);
      }

      // Don't schedule if already scheduled or already visible
      if (showTimeoutsRef.current.has(panelId) || visiblePanels.has(panelId)) return;

      const timeout = setTimeout(() => {
        showPanel(panelId);
        showTimeoutsRef.current.delete(panelId);
      }, showDelay);

      showTimeoutsRef.current.set(panelId, timeout);
    },
    [showPanel, showDelay, visiblePanels]
  );

  // Schedule hiding a panel
  const scheduleHidePanel = useCallback(
    (panelId: string): void => {
      // Clear any pending show timeout
      const existingShowTimeout = showTimeoutsRef.current.get(panelId);
      if (existingShowTimeout) {
        clearTimeout(existingShowTimeout);
        showTimeoutsRef.current.delete(panelId);
      }

      // Don't schedule if already scheduled
      if (hideTimeoutsRef.current.has(panelId)) return;

      const timeout = setTimeout(() => {
        hidePanel(panelId);
        hideTimeoutsRef.current.delete(panelId);
      }, hideDelay);

      hideTimeoutsRef.current.set(panelId, timeout);
    },
    [hidePanel, hideDelay]
  );

  // Handle mouse movement
  const handleMouseMove = useCallback(
    (e: MouseEvent): void => {
      // Only process if clean mode is enabled
      if (!isCleanMode) return;

      const currentEdge = getEdgeZone(e.clientX, e.clientY);
      const newHoveredEdges = new Set<EdgeZone>();

      if (currentEdge !== null) {
        newHoveredEdges.add(currentEdge);
      }

      // Find edges that were entered
      for (const edge of newHoveredEdges) {
        if (!hoveredEdges.has(edge)) {
          const edgePanels = getPanelsForEdge(edge);
          for (const panel of edgePanels) {
            scheduleShowPanel(panel.id);
          }
        }
      }

      // Find edges that were left
      for (const edge of hoveredEdges) {
        if (!newHoveredEdges.has(edge)) {
          const edgePanels = getPanelsForEdge(edge);
          for (const panel of edgePanels) {
            scheduleHidePanel(panel.id);
          }
        }
      }

      setHoveredEdges(newHoveredEdges);
    },
    [isCleanMode, getEdgeZone, hoveredEdges, getPanelsForEdge, scheduleShowPanel, scheduleHidePanel]
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
    const showTimeouts = showTimeoutsRef.current;
    const hideTimeouts = hideTimeoutsRef.current;

    return (): void => {
      for (const timeout of showTimeouts.values()) {
        clearTimeout(timeout);
      }
      showTimeouts.clear();

      for (const timeout of hideTimeouts.values()) {
        clearTimeout(timeout);
      }
      hideTimeouts.clear();
    };
  }, []);

  // Reset when clean mode is toggled off
  useEffect(() => {
    if (!isCleanMode) {
      // Clear all timeouts
      for (const timeout of showTimeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      showTimeoutsRef.current.clear();

      for (const timeout of hideTimeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      hideTimeoutsRef.current.clear();

      setHoveredEdges(new Set());
    }
  }, [isCleanMode]);

  // Check if a panel should be visible
  const isPanelVisible = useCallback(
    (panelId: string): boolean => {
      if (!isCleanMode) return true;
      return visiblePanels.has(panelId);
    },
    [isCleanMode, visiblePanels]
  );

  return (
    <div
      className={`clean-mode-wrapper relative w-full h-full ${className}`}
      data-clean-mode={isCleanMode}
    >
      {/* Main content */}
      {children}

      {/* Edge hover panels - only render in clean mode */}
      {isCleanMode && (
        <>
          {panels.map((panel) => (
            <div
              key={panel.id}
              className={`
                absolute transition-all duration-300 ease-out z-50
                ${isPanelVisible(panel.id) ? 'opacity-100 translate-x-0 translate-y-0' : 'opacity-0 pointer-events-none'}
                ${panel.edge === 'top' ? 'top-0 left-1/2 -translate-x-1/2' : ''}
                ${panel.edge === 'right' ? 'right-0 top-1/2 -translate-y-1/2' : ''}
                ${panel.edge === 'bottom' ? 'bottom-0 left-1/2 -translate-x-1/2' : ''}
                ${panel.edge === 'left' ? 'left-0 top-1/2 -translate-y-1/2' : ''}
                ${!isPanelVisible(panel.id) && panel.edge === 'top' ? '-translate-y-full' : ''}
                ${!isPanelVisible(panel.id) && panel.edge === 'right' ? 'translate-x-full' : ''}
                ${!isPanelVisible(panel.id) && panel.edge === 'bottom' ? 'translate-y-full' : ''}
                ${!isPanelVisible(panel.id) && panel.edge === 'left' ? '-translate-x-full' : ''}
                ${panel.className ?? ''}
              `}
              data-panel-id={panel.id}
              data-edge={panel.edge}
              onMouseEnter={(): void => {
                // Keep panel visible while hovering over it
                const existingHideTimeout = hideTimeoutsRef.current.get(panel.id);
                if (existingHideTimeout) {
                  clearTimeout(existingHideTimeout);
                  hideTimeoutsRef.current.delete(panel.id);
                }
              }}
              onMouseLeave={(): void => {
                // Schedule hide when leaving the panel
                scheduleHidePanel(panel.id);
              }}
            >
              {panel.content}
            </div>
          ))}
        </>
      )}

      {/* Clean mode controller - minimal toolbar */}
      <div className="absolute bottom-4 right-4 z-50">
        <CleanModeController {...(onCleanModeChange !== undefined ? { onCleanModeChange } : {})}>
          {toolbarContent}
        </CleanModeController>
      </div>
    </div>
  );
}

export default CleanModeWrapper;
