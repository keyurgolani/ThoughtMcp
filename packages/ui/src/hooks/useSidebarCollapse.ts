/**
 * useSidebarCollapse Hook
 *
 * Custom hook for managing sidebar collapse state with session persistence.
 * Handles auto-collapse on small viewports and persists user preference.
 *
 * Requirements: 36.1 - Collapse to icons on small viewports, persist state in session
 */

import { useCallback, useEffect, useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';

// ============================================================================
// Constants
// ============================================================================

/** Breakpoint for auto-collapse on smaller screens (Requirements: 36.1) */
const AUTO_COLLAPSE_BREAKPOINT = 1024;

/** Breakpoint for hiding sidebar completely on very small screens */
const HIDE_SIDEBAR_BREAKPOINT = 640;

// ============================================================================
// Types
// ============================================================================

export interface UseSidebarCollapseResult {
  /** Whether the sidebar is collapsed */
  isCollapsed: boolean;
  /** Whether the sidebar should be shown at all */
  showSidebar: boolean;
  /** Whether the collapse was triggered by viewport size */
  isAutoCollapsed: boolean;
  /** Toggle the sidebar collapse state */
  toggleCollapse: () => void;
  /** Set the sidebar collapse state explicitly */
  setCollapsed: (collapsed: boolean) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing sidebar collapse state with session persistence.
 *
 * Features:
 * - Persists collapse state to session storage
 * - Auto-collapses on viewports < 1024px
 * - Hides sidebar completely on viewports < 640px
 * - Smooth transitions via CSS (handled by AppShell)
 *
 * @returns Sidebar collapse state and control functions
 */
export function useSidebarCollapse(): UseSidebarCollapseResult {
  // Get persisted state from session store
  const persistedCollapsed = useSessionStore((state) => state.uiPreferences.sidebarCollapsed);
  const setSidebarCollapsed = useSessionStore((state) => state.setSidebarCollapsed);
  const toggleSidebarCollapsed = useSessionStore((state) => state.toggleSidebarCollapsed);

  // Local state for viewport-based behavior
  const [showSidebar, setShowSidebar] = useState(true);
  const [isAutoCollapsed, setIsAutoCollapsed] = useState(false);
  const [viewportCollapsed, setViewportCollapsed] = useState(false);

  // Determine effective collapsed state
  // If auto-collapsed due to viewport, use that; otherwise use persisted preference
  const isCollapsed = isAutoCollapsed ? viewportCollapsed : persistedCollapsed;

  // Handle viewport resize
  useEffect(() => {
    const handleResize = (): void => {
      const width = window.innerWidth;

      // Hide sidebar completely on very small screens
      setShowSidebar(width >= HIDE_SIDEBAR_BREAKPOINT);

      // Auto-collapse on tablets and smaller (Requirements: 36.1)
      if (width < AUTO_COLLAPSE_BREAKPOINT) {
        if (!isAutoCollapsed) {
          setIsAutoCollapsed(true);
          setViewportCollapsed(true);
        }
      } else {
        if (isAutoCollapsed) {
          setIsAutoCollapsed(false);
          // Restore to persisted preference when viewport is large enough
        }
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return (): void => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isAutoCollapsed]);

  // Toggle collapse state
  const toggleCollapse = useCallback((): void => {
    if (isAutoCollapsed) {
      // When auto-collapsed, toggle the viewport-based state
      setViewportCollapsed((prev) => !prev);
    } else {
      // When not auto-collapsed, toggle and persist the preference
      toggleSidebarCollapsed();
    }
  }, [isAutoCollapsed, toggleSidebarCollapsed]);

  // Set collapse state explicitly
  const setCollapsed = useCallback(
    (collapsed: boolean): void => {
      if (isAutoCollapsed) {
        setViewportCollapsed(collapsed);
      } else {
        setSidebarCollapsed(collapsed);
      }
    },
    [isAutoCollapsed, setSidebarCollapsed]
  );

  return {
    isCollapsed,
    showSidebar,
    isAutoCollapsed,
    toggleCollapse,
    setCollapsed,
  };
}

export default useSidebarCollapse;
