/**
 * CleanModePanel Component
 *
 * A wrapper component that transforms persistent panels into floating tooltips
 * when clean mode is enabled. In normal mode, panels are always visible.
 * In clean mode, panels appear as floating tooltips on hover.
 *
 * Requirements: 46.3, 46.4
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';

// ============================================================================
// Types
// ============================================================================

export interface CleanModePanelProps {
  /** Unique identifier for this panel */
  panelId: string;
  /** The panel content to render */
  children: React.ReactNode;
  /** Position of the panel in normal mode */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'left' | 'right';
  /** Whether the panel should be visible in clean mode (default: false - hidden) */
  visibleInCleanMode?: boolean;
  /** Whether to show as floating tooltip on hover in clean mode */
  showAsTooltipInCleanMode?: boolean;
  /** Hover trigger element (if different from panel) */
  hoverTrigger?: React.ReactNode;
  /** Delay before showing tooltip (ms) */
  showDelay?: number;
  /** Delay before hiding tooltip (ms) */
  hideDelay?: number;
  /** Additional CSS classes */
  className?: string;
  /** Additional CSS classes for the tooltip wrapper */
  tooltipClassName?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SHOW_DELAY = 150;
const DEFAULT_HIDE_DELAY = 300;

// ============================================================================
// Component
// ============================================================================

/**
 * CleanModePanel - Transforms panels into floating tooltips in clean mode
 *
 * Features:
 * - In normal mode: renders panel as-is
 * - In clean mode with visibleInCleanMode=false: hides panel completely
 * - In clean mode with showAsTooltipInCleanMode=true: shows as floating tooltip on hover
 *
 * Requirements: 46.3, 46.4
 */
export function CleanModePanel({
  panelId,
  children,
  position = 'right',
  visibleInCleanMode = false,
  showAsTooltipInCleanMode = false,
  hoverTrigger,
  showDelay = DEFAULT_SHOW_DELAY,
  hideDelay = DEFAULT_HIDE_DELAY,
  className = '',
  tooltipClassName = '',
}: CleanModePanelProps): React.ReactElement | null {
  const isCleanMode = useUIStore((state) => state.isCleanMode);
  const showPanel = useUIStore((state) => state.showPanel);
  const hidePanel = useUIStore((state) => state.hidePanel);
  const isPanelVisible = useUIStore((state) => state.isPanelVisible);

  const [, setIsHovered] = useState(false);
  const [shouldShowTooltip, setShouldShowTooltip] = useState(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeouts on unmount
  useEffect(() => {
    return (): void => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Handle hover enter
  const handleMouseEnter = useCallback((): void => {
    if (!isCleanMode || !showAsTooltipInCleanMode) return;

    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Schedule showing the tooltip
    showTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
      setShouldShowTooltip(true);
      showPanel(panelId);
    }, showDelay);
  }, [isCleanMode, showAsTooltipInCleanMode, showDelay, showPanel, panelId]);

  // Handle hover leave
  const handleMouseLeave = useCallback((): void => {
    if (!isCleanMode || !showAsTooltipInCleanMode) return;

    // Clear any pending show timeout
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    // Schedule hiding the tooltip
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setShouldShowTooltip(false);
      hidePanel(panelId);
    }, hideDelay);
  }, [isCleanMode, showAsTooltipInCleanMode, hideDelay, hidePanel, panelId]);

  // Reset state when clean mode changes
  useEffect(() => {
    if (!isCleanMode) {
      setIsHovered(false);
      setShouldShowTooltip(false);
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    }
  }, [isCleanMode]);

  // In normal mode, always show the panel
  if (!isCleanMode) {
    return <div className={className}>{children}</div>;
  }

  // In clean mode, check visibility settings
  if (!visibleInCleanMode && !showAsTooltipInCleanMode) {
    // Panel is completely hidden in clean mode
    return null;
  }

  // If visible in clean mode but not as tooltip, just render normally
  if (visibleInCleanMode && !showAsTooltipInCleanMode) {
    return <div className={className}>{children}</div>;
  }

  // Show as floating tooltip in clean mode
  const isVisible = shouldShowTooltip || isPanelVisible(panelId);

  // Get position classes for tooltip
  const getTooltipPositionClasses = (): string => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'left':
        return 'top-1/2 left-4 -translate-y-1/2';
      case 'right':
        return 'top-1/2 right-4 -translate-y-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <>
      {/* Hover trigger area */}
      {hoverTrigger !== undefined && hoverTrigger !== null && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="cursor-pointer"
        >
          {hoverTrigger}
        </div>
      )}

      {/* Floating tooltip panel */}
      <div
        className={`
          fixed z-50 transition-all duration-200 ease-out
          ${getTooltipPositionClasses()}
          ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
          ${tooltipClassName}
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </>
  );
}

export default CleanModePanel;
