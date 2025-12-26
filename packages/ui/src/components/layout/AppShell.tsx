/**
 * AppShell Component
 *
 * Main application container with sidebar navigation and content area.
 * Implements glassmorphism styling consistent with the dark cosmic theme.
 * Supports collapsed/expanded sidebar states with smooth animations.
 *
 * Requirements: 23.1, 23.5, 36.1
 */

import { useCallback, useEffect, useState } from "react";
import { SidebarContext } from "../../contexts/SidebarContext";

// ============================================================================
// Types
// ============================================================================

export interface AppShellProps {
  /** Main content to render in the content area */
  children: React.ReactNode;
  /** Current active route/screen identifier */
  currentRoute: string;
  /** Callback when navigation occurs */
  onNavigate: (route: string) => void;
  /** Whether the sidebar is collapsed */
  sidebarCollapsed: boolean;
  /** Callback to toggle sidebar collapse state */
  onToggleSidebar: () => void;
  /** Optional header content (e.g., MainNavigation) */
  header?: React.ReactNode;
  /** Optional sidebar content (e.g., Sidebar component) */
  sidebar?: React.ReactNode;
  /** Additional CSS classes for the shell container */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Sidebar width when expanded */
const SIDEBAR_WIDTH_EXPANDED = 256; // 16rem = 256px

/** Sidebar width when collapsed (icon-only mode) */
const SIDEBAR_WIDTH_COLLAPSED = 64; // 4rem = 64px

/** Breakpoint for auto-collapse on smaller screens (Requirements: 36.1) */
const AUTO_COLLAPSE_BREAKPOINT = 1024;

/** Animation duration for sidebar transitions */
const TRANSITION_DURATION = 200;

// ============================================================================
// Sub-Components
// ============================================================================

interface SidebarToggleButtonProps {
  isCollapsed: boolean;
  onClick: () => void;
}

/**
 * Toggle button for sidebar collapse/expand
 * Positioned at the edge of the sidebar with glassmorphism styling
 */
function SidebarToggleButton({
  isCollapsed,
  onClick,
}: SidebarToggleButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!isCollapsed}
      className={`
        absolute -right-3 top-1/2 -translate-y-1/2
        w-6 h-12
        flex items-center justify-center
        rounded-r-md
        bg-ui-surface/90
        border border-l-0 border-ui-border
        text-ui-text-secondary
        hover:text-ui-accent-primary
        hover:border-ui-accent-primary/30
        transition-all duration-normal
        z-10
        backdrop-blur-glass
        group
      `}
      style={{
        boxShadow: "2px 0 10px rgba(0, 0, 0, 0.3)",
      }}
    >
      <svg
        className={`
          w-4 h-4
          transition-transform duration-normal
          ${isCollapsed ? "" : "rotate-180"}
          group-hover:scale-110
        `}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AppShell - Main application container with sidebar and content area
 *
 * Features:
 * - Glassmorphism styling with dark cosmic theme (Requirement 23.5)
 * - Collapsible sidebar with smooth animations
 * - Responsive behavior - auto-collapse on smaller viewports (Requirement 36.1)
 * - Keyboard accessible toggle
 * - Proper ARIA attributes for accessibility
 *
 * Layout Structure:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                        Header                                │
 * ├──────────┬──────────────────────────────────────────────────┤
 * │          │                                                   │
 * │ Sidebar  │                  Content Area                     │
 * │          │                                                   │
 * │          │                                                   │
 * └──────────┴──────────────────────────────────────────────────┘
 *
 * Requirements: 23.1, 23.5, 36.1
 */
export function AppShell({
  children,
  currentRoute,
  onNavigate,
  sidebarCollapsed,
  onToggleSidebar,
  header,
  sidebar,
  className = "",
}: AppShellProps): React.ReactElement {
  // Track if we should show the sidebar at all (for very small screens)
  const [showSidebar, setShowSidebar] = useState(true);
  const [isAutoCollapsed, setIsAutoCollapsed] = useState(false);

  // Handle responsive behavior - auto-collapse on smaller viewports
  useEffect(() => {
    const handleResize = (): void => {
      const width = window.innerWidth;

      // Auto-collapse on tablets and smaller (Requirements: 36.1)
      if (width < AUTO_COLLAPSE_BREAKPOINT && !isAutoCollapsed) {
        setIsAutoCollapsed(true);
        if (!sidebarCollapsed) {
          onToggleSidebar();
        }
      } else if (width >= AUTO_COLLAPSE_BREAKPOINT && isAutoCollapsed) {
        setIsAutoCollapsed(false);
      }

      // Hide sidebar completely on very small screens
      setShowSidebar(width >= 640);
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return (): void => {
      window.removeEventListener("resize", handleResize);
    };
  }, [sidebarCollapsed, onToggleSidebar, isAutoCollapsed]);

  // Handle keyboard shortcut for sidebar toggle (Cmd/Ctrl + B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        onToggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return (): void => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onToggleSidebar]);

  // Calculate sidebar width based on collapsed state
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  // Handle sidebar item click - also used for navigation context
  const handleSidebarNavigate = useCallback(
    (route: string): void => {
      onNavigate(route);
      // Auto-collapse sidebar on mobile after navigation
      if (window.innerWidth < AUTO_COLLAPSE_BREAKPOINT && !sidebarCollapsed) {
        onToggleSidebar();
      }
    },
    [onNavigate, sidebarCollapsed, onToggleSidebar]
  );

  return (
    <div
      className={`
        min-h-screen
        bg-ui-background
        flex flex-col
        ${className}
      `}
    >
      {/* Header Area */}
      {header !== undefined && header !== null && (
        <header className="fixed top-0 left-0 right-0 z-50">{header}</header>
      )}

      {/* Main Layout Container */}
      <div
        className={`
          flex flex-1
          ${header !== undefined && header !== null ? "pt-14" : ""}
        `}
      >
        {/* Sidebar */}
        {showSidebar && (
          <aside
            className={`
              fixed
              ${header !== undefined && header !== null ? "top-14" : "top-0"}
              left-0
              bottom-0
              z-40
              flex flex-col
              bg-ui-surface/90
              backdrop-blur-glass-medium
              border-r border-ui-border
              transition-all ease-out
            `}
            style={{
              width: sidebarWidth,
              transitionDuration: `${String(TRANSITION_DURATION)}ms`,
              boxShadow: `
                4px 0 20px rgba(0, 0, 0, 0.3),
                0 0 30px rgba(0, 255, 255, 0.03),
                inset -1px 0 0 rgba(0, 255, 255, 0.05)
              `,
            }}
            aria-label="Sidebar navigation"
          >
            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {sidebar !== undefined && sidebar !== null ? (
                // Render custom sidebar content with context
                <SidebarContext.Provider
                  value={{
                    collapsed: sidebarCollapsed,
                    currentRoute,
                    onNavigate: handleSidebarNavigate,
                  }}
                >
                  {sidebar}
                </SidebarContext.Provider>
              ) : (
                // Default empty state
                <div className="p-4 text-ui-text-muted text-sm">No sidebar content</div>
              )}
            </div>

            {/* Sidebar Toggle Button */}
            <SidebarToggleButton isCollapsed={sidebarCollapsed} onClick={onToggleSidebar} />

            {/* Keyboard shortcut hint */}
            <div
              className={`
                p-3
                border-t border-ui-border
                text-ui-text-muted
                text-xs
                text-center
                transition-opacity duration-normal
                ${sidebarCollapsed ? "opacity-0" : "opacity-100"}
              `}
            >
              <kbd className="px-1.5 py-0.5 rounded bg-ui-surface-sunken text-ui-text-tertiary">
                ⌘B
              </kbd>
              <span className="ml-1.5">to toggle</span>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main
          className={`
            flex-1
            min-h-0
            transition-all ease-out
          `}
          style={{
            marginLeft: showSidebar ? sidebarWidth : 0,
            transitionDuration: `${String(TRANSITION_DURATION)}ms`,
          }}
        >
          {/* Content wrapper with proper padding */}
          <div className="h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// Context for Sidebar
// ============================================================================
