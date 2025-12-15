/**
 * FloatingTooltipTrigger Component
 *
 * A small icon button that triggers a floating tooltip panel on hover.
 * Used in clean mode to provide access to panels without persistent UI.
 *
 * Requirements: 46.4
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface FloatingTooltipTriggerProps {
  /** Icon to display in the trigger button */
  icon: React.ReactNode;
  /** Label for accessibility */
  label: string;
  /** The tooltip content to show on hover */
  children: React.ReactNode;
  /** Position of the tooltip relative to trigger */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing tooltip (ms) */
  showDelay?: number;
  /** Delay before hiding tooltip (ms) */
  hideDelay?: number;
  /** Additional CSS classes for the trigger button */
  triggerClassName?: string;
  /** Additional CSS classes for the tooltip */
  tooltipClassName?: string;
  /** Whether the trigger is disabled */
  disabled?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SHOW_DELAY = 100;
const DEFAULT_HIDE_DELAY = 300;

// ============================================================================
// Component
// ============================================================================

/**
 * FloatingTooltipTrigger - Icon button that shows floating tooltip on hover
 *
 * Features:
 * - Small icon button trigger
 * - Floating tooltip appears on hover with configurable delay
 * - Tooltip stays visible while hovering over it
 * - Smooth fade in/out animations
 *
 * Requirements: 46.4
 */
export function FloatingTooltipTrigger({
  icon,
  label,
  children,
  tooltipPosition = 'left',
  showDelay = DEFAULT_SHOW_DELAY,
  hideDelay = DEFAULT_HIDE_DELAY,
  triggerClassName = '',
  tooltipClassName = '',
  disabled = false,
}: FloatingTooltipTriggerProps): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const [isHoveringTrigger, setIsHoveringTrigger] = useState(false);
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeouts on unmount
  useEffect(() => {
    return (): void => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Update visibility based on hover state
  useEffect(() => {
    const shouldBeVisible = isHoveringTrigger || isHoveringTooltip;

    if (shouldBeVisible && !isVisible) {
      // Clear any pending hide timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      // Schedule showing
      showTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, showDelay);
    } else if (!shouldBeVisible && isVisible) {
      // Clear any pending show timeout
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }

      // Schedule hiding
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, hideDelay);
    }
  }, [isHoveringTrigger, isHoveringTooltip, isVisible, showDelay, hideDelay]);

  // Handle trigger hover
  const handleTriggerEnter = useCallback((): void => {
    if (disabled) return;
    setIsHoveringTrigger(true);
  }, [disabled]);

  const handleTriggerLeave = useCallback((): void => {
    setIsHoveringTrigger(false);
  }, []);

  // Handle tooltip hover
  const handleTooltipEnter = useCallback((): void => {
    setIsHoveringTooltip(true);
  }, []);

  const handleTooltipLeave = useCallback((): void => {
    setIsHoveringTooltip(false);
  }, []);

  // Get tooltip position classes
  const getTooltipPositionClasses = (): string => {
    switch (tooltipPosition) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      default:
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
    }
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        className={`
          glass-panel-glow p-2 rounded-lg transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-ui-accent-primary/10 hover:text-ui-accent-primary'}
          text-ui-text-secondary
          ${triggerClassName}
        `}
        aria-label={label}
        title={label}
        disabled={disabled}
      >
        {icon}
      </button>

      {/* Floating tooltip */}
      <div
        className={`
          absolute z-50 transition-all duration-200 ease-out
          ${getTooltipPositionClasses()}
          ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
          ${tooltipClassName}
        `}
        onMouseEnter={handleTooltipEnter}
        onMouseLeave={handleTooltipLeave}
      >
        {children}
      </div>
    </div>
  );
}

export default FloatingTooltipTrigger;
