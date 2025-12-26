/**
 * ResponsivePanelContainer Component
 *
 * Container for managing multiple responsive panels with z-index management,
 * stacking behavior, and swipe navigation on mobile.
 *
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5, 36.6
 */

import { useCallback, useMemo, useState } from "react";
import { useResponsive, useSwipeGesture } from "../../hooks";
import type { PanelContextValue, ResponsivePanelContainerProps } from "../../types/panel";
import { PanelContext } from "./PanelContext";

// ============================================================================
// Component
// ============================================================================

// ============================================================================
// Component
// ============================================================================

/**
 * ResponsivePanelContainer - Manages multiple responsive panels
 *
 * Features:
 * - Z-index management for overlapping panels (Requirement 36.3)
 * - Mobile stacked view with swipe navigation (Requirement 36.2)
 * - Panel expansion state management
 * - Smooth transitions between states (Requirement 36.5)
 *
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5, 36.6
 */
export function ResponsivePanelContainer({
  panels,
  children,
  className = "",
}: ResponsivePanelContainerProps): React.ReactElement {
  const { shouldStackPanels, isTouchDevice } = useResponsive();

  // Panel state management
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    panels.forEach((p) => {
      if (p.defaultExpanded === true) {
        initial.add(p.id);
      }
    });
    return initial;
  });
  const [panelOrder, setPanelOrder] = useState<string[]>(() => panels.map((p) => p.id));

  // Toggle panel expansion
  const togglePanel = useCallback((id: string) => {
    setExpandedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Get z-index for a panel (Requirement 36.3)
  const getZIndex = useCallback(
    (id: string): number => {
      const baseZ = 40;
      const index = panelOrder.indexOf(id);
      return baseZ + (index >= 0 ? index : 0);
    },
    [panelOrder]
  );

  // Bring panel to front (Requirement 36.3)
  const bringToFront = useCallback((id: string) => {
    setPanelOrder((prev) => {
      const filtered = prev.filter((p) => p !== id);
      return [...filtered, id];
    });
  }, []);

  // Mobile swipe navigation (Requirement 36.2)
  const panelIds = useMemo(() => panels.map((p) => p.id), [panels]);
  const currentPanelIndex = activePanelId != null ? panelIds.indexOf(activePanelId) : -1;

  const handleSwipeLeft = useCallback(() => {
    if (!shouldStackPanels) return;
    const nextIndex = currentPanelIndex + 1;
    if (nextIndex < panelIds.length) {
      setActivePanelId(panelIds[nextIndex] ?? null);
    }
  }, [shouldStackPanels, currentPanelIndex, panelIds]);

  const handleSwipeRight = useCallback(() => {
    if (!shouldStackPanels) return;
    const prevIndex = currentPanelIndex - 1;
    if (prevIndex >= 0) {
      setActivePanelId(panelIds[prevIndex] ?? null);
    } else {
      setActivePanelId(null);
    }
  }, [shouldStackPanels, currentPanelIndex, panelIds]);

  const { handlers: swipeHandlers } = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 50,
  });

  // Context value
  const contextValue = useMemo<PanelContextValue>(
    () => ({
      activePanelId,
      setActivePanelId,
      expandedPanels,
      togglePanel,
      getZIndex,
      bringToFront,
    }),
    [activePanelId, expandedPanels, togglePanel, getZIndex, bringToFront]
  );

  // Mobile stacked view (Requirement 36.2)
  if (shouldStackPanels) {
    return (
      <PanelContext.Provider value={contextValue}>
        <div className={`relative h-full ${className}`} {...(isTouchDevice ? swipeHandlers : {})}>
          {/* Main content */}
          <div className="h-full">{children}</div>

          {/* Mobile panel tabs */}
          <div className="fixed bottom-0 left-0 right-0 z-50 glass-panel-glow">
            <div className="flex items-center justify-around p-2">
              {panels.map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => {
                    setActivePanelId(activePanelId === panel.id ? null : panel.id);
                  }}
                  className={`
                    flex flex-col items-center gap-1 p-2 rounded-lg
                    min-w-[44px] min-h-[44px]
                    transition-all duration-normal
                    ${
                      activePanelId === panel.id
                        ? "text-ui-accent-primary bg-ui-accent-primary/20"
                        : "text-ui-text-secondary hover:text-ui-text-primary"
                    }
                  `}
                  aria-label={panel.label}
                  aria-pressed={activePanelId === panel.id}
                >
                  {panel.icon}
                  <span className="text-xs">{panel.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active panel overlay */}
          {activePanelId != null && (
            <div className="fixed inset-0 z-45 flex flex-col">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-ui-background/80 backdrop-blur-glass"
                onClick={() => {
                  setActivePanelId(null);
                }}
              />

              {/* Panel content */}
              <div className="relative flex-1 overflow-auto p-4 pb-20 animate-slide-up">
                {panels.find((p) => p.id === activePanelId)?.content}
              </div>

              {/* Swipe indicator */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-ui-border rounded-full" />
            </div>
          )}
        </div>
      </PanelContext.Provider>
    );
  }

  // Desktop view - render panels in their positions
  return (
    <PanelContext.Provider value={contextValue}>
      <div className={`relative h-full ${className}`}>{children}</div>
    </PanelContext.Provider>
  );
}

export default ResponsivePanelContainer;
