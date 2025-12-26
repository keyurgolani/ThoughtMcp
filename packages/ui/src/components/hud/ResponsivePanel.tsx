/**
 * ResponsivePanel Component
 *
 * A wrapper component that provides responsive behavior for HUD panels.
 * Handles collapsing to icons on smaller viewports and stacking on mobile.
 *
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5, 36.6
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getPanelZIndex,
  useOverlapDetection,
  usePanelPositioning,
  useResponsive,
  useSwipeGesture,
} from '../../hooks';
import { GlassPanel, type GlassPanelVariant } from './GlassPanel';

// ============================================================================
// Types
// ============================================================================

export type PanelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface ResponsivePanelProps {
  /** Unique panel ID for z-index management */
  panelId: string;
  /** Panel content when expanded */
  children: React.ReactNode;
  /** Icon to show when collapsed */
  icon: React.ReactNode;
  /** Label for the collapsed state */
  label: string;
  /** Panel position on desktop */
  position?: PanelPosition;
  /** Whether the panel is expanded */
  isExpanded?: boolean;
  /** Callback when expansion state changes */
  onToggleExpand?: (expanded: boolean) => void;
  /** Base z-index for panel layering */
  baseZIndex?: number;
  /** Glass panel variant */
  variant?: GlassPanelVariant;
  /** Additional CSS classes */
  className?: string;
  /** Whether to enable swipe gestures */
  enableSwipe?: boolean;
  /** Callback for swipe left */
  onSwipeLeft?: () => void;
  /** Callback for swipe right */
  onSwipeRight?: () => void;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Callback when panel is clicked (for z-index management) */
  onFocus?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const POSITION_CLASSES: Record<PanelPosition, string> = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
};

// Mobile stacked positions (Requirements: 36.2)
const MOBILE_POSITION_CLASSES: Record<PanelPosition, string> = {
  'top-left': 'top-0 left-0 right-0',
  'top-right': 'top-0 left-0 right-0',
  'bottom-left': 'bottom-0 left-0 right-0',
  'bottom-right': 'bottom-0 left-0 right-0',
  center: 'top-1/2 left-0 right-0 -translate-y-1/2',
};

// ============================================================================
// Component
// ============================================================================

/**
 * ResponsivePanel - Wrapper for responsive panel behavior
 *
 * Features:
 * - Collapses to icon on viewport < 1024px (Requirement 36.1)
 * - Stacks vertically on viewport < 768px (Requirement 36.2)
 * - Swipe gestures for mobile navigation (Requirement 36.2)
 * - Z-index management (Requirement 36.3)
 * - Viewport boundary detection (Requirement 36.4)
 * - Smooth repositioning animations (Requirement 36.5)
 * - Increased blur when overlapping 3D content (Requirement 36.6)
 *
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5, 36.6
 */
export function ResponsivePanel({
  panelId,
  children,
  icon,
  label,
  position = 'top-right',
  isExpanded = false,
  onToggleExpand,
  baseZIndex = 40,
  variant = 'default',
  className = '',
  enableSwipe = true,
  onSwipeLeft,
  onSwipeRight,
  ariaLabel,
  onFocus,
}: ResponsivePanelProps): React.ReactElement {
  const { shouldCollapsePanels, shouldStackPanels, isTouchDevice } = useResponsive();
  const [currentZIndex, setCurrentZIndex] = useState(baseZIndex);

  // Panel positioning with viewport boundary detection (Requirements 36.4, 36.5)
  const { panelRef, positionStyle } = usePanelPositioning({
    viewportPadding: 16,
    animate: true,
    animationDuration: 200,
    isVisible: isExpanded,
  });

  // Overlap detection for increased blur (Requirement 36.6)
  const { isOverlapping, overlapPercentage } = useOverlapDetection({
    panelRef,
    enabled: isExpanded,
  });

  // Swipe gesture handling (Requirement 36.2)
  const { handlers: swipeHandlers } = useSwipeGesture({
    onSwipeLeft: enableSwipe ? onSwipeLeft : undefined,
    onSwipeRight: enableSwipe ? onSwipeRight : undefined,
    threshold: 50,
  });

  // Handle toggle
  const handleToggle = useCallback(() => {
    onToggleExpand?.(!isExpanded);
  }, [isExpanded, onToggleExpand]);

  // Handle panel focus for z-index management (Requirement 36.3)
  const handlePanelClick = useCallback(() => {
    const newZIndex = getPanelZIndex(panelId, true);
    setCurrentZIndex(newZIndex);
    onFocus?.();
  }, [panelId, onFocus]);

  // Update z-index when panel becomes visible
  useEffect(() => {
    if (isExpanded) {
      const newZIndex = getPanelZIndex(panelId, false);
      setCurrentZIndex(newZIndex);
    }
  }, [isExpanded, panelId]);

  // Determine blur intensity based on overlap (Requirement 36.6)
  const blurClass = isOverlapping
    ? overlapPercentage > 0.5
      ? 'backdrop-blur-[20px]'
      : 'backdrop-blur-[16px]'
    : 'backdrop-blur-[12px]';

  // Determine position classes based on responsive state
  const positionClass = shouldStackPanels
    ? MOBILE_POSITION_CLASSES[position]
    : POSITION_CLASSES[position];

  // Collapsed state - show icon button (Requirement 36.1)
  if (shouldCollapsePanels && !isExpanded) {
    return (
      <div className={`absolute ${positionClass}`} style={{ zIndex: currentZIndex }}>
        <button
          onClick={handleToggle}
          className={`
            glass-panel-glow p-3 rounded-lg
            flex items-center justify-center
            text-ui-text-secondary hover:text-ui-accent-primary
            transition-all duration-normal
            ${isTouchDevice ? 'min-w-[44px] min-h-[44px]' : ''}
          `}
          aria-label={`Expand ${label}`}
          aria-expanded={false}
        >
          {icon}
        </button>
      </div>
    );
  }

  // Expanded state
  return (
    <div
      ref={panelRef}
      onClick={handlePanelClick}
      className={`
        absolute ${positionClass}
        transition-all duration-slow ease-out-expo
        ${shouldStackPanels ? 'w-full px-4' : ''}
      `}
      style={{ zIndex: currentZIndex, ...positionStyle }}
      {...(enableSwipe && isTouchDevice ? swipeHandlers : {})}
      role="region"
      aria-label={ariaLabel ?? label}
    >
      <GlassPanel
        variant={isOverlapping ? 'heavy' : variant}
        className={`
          ${className}
          ${shouldStackPanels ? 'w-full' : ''}
          ${blurClass}
        `}
      >
        {/* Header with collapse button */}
        {shouldCollapsePanels && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-ui-text-secondary">
              {icon}
              <span className="text-xs font-medium">{label}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              className={`
                p-1.5 rounded-md
                text-ui-text-muted hover:text-ui-text-primary
                hover:bg-ui-border/50
                transition-colors
                ${isTouchDevice ? 'min-w-[44px] min-h-[44px] flex items-center justify-center' : ''}
              `}
              aria-label={`Collapse ${label}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Panel content */}
        {children}
      </GlassPanel>
    </div>
  );
}

export default ResponsivePanel;
