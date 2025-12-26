/**
 * Tooltip Component
 *
 * A polished tooltip component with smooth animations and theme-aware styling.
 * Supports multiple positions and custom content.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ============================================================================
// Types
// ============================================================================

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /** Content to display in the tooltip */
  content: React.ReactNode;
  /** Position of the tooltip relative to the trigger */
  position?: TooltipPosition;
  /** Delay before showing tooltip (ms) */
  delay?: number;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
  /** Additional CSS classes for the tooltip */
  className?: string;
  /** Children that trigger the tooltip */
  children: React.ReactElement;
}

// ============================================================================
// Constants
// ============================================================================

const OFFSET = 8; // Distance from trigger element

// ============================================================================
// Component
// ============================================================================

export function Tooltip({
  content,
  position = 'top',
  delay = 200,
  disabled = false,
  className = '',
  children,
}: TooltipProps): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate tooltip position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - OFFSET;
        break;
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + OFFSET;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - OFFSET;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        x = triggerRect.right + OFFSET;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    // Keep tooltip within viewport
    const padding = 8;
    x = Math.max(padding, Math.min(x, window.innerWidth - tooltipRect.width - padding));
    y = Math.max(padding, Math.min(y, window.innerHeight - tooltipRect.height - padding));

    setCoords({ x, y });
  }, [position]);

  // Show tooltip with delay
  const handleMouseEnter = useCallback(() => {
    if (disabled) return;

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay, disabled]);

  // Hide tooltip
  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  // Update position when visible
  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return (): void => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, updatePosition]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return (): void => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Get arrow position classes - defined inside component to access position prop
  function getArrowClasses(): string {
    switch (position) {
      case 'top':
        return 'tooltip-arrow tooltip-arrow-top';
      case 'bottom':
        return 'tooltip-arrow tooltip-arrow-bottom';
      case 'left':
        return 'absolute right-[-5px] top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-[var(--theme-surface-overlay)] border-r border-t border-[var(--theme-border)]';
      case 'right':
        return 'absolute left-[-5px] top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-[var(--theme-surface-overlay)] border-l border-b border-[var(--theme-border)]';
      default:
        return '';
    }
  }

  // Clone children with ref and event handlers
  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleMouseEnter,
    onBlur: handleMouseLeave,
  });

  return (
    <>
      {trigger}
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className={`
              fixed z-tooltip
              px-3 py-2 rounded-lg
              text-sm text-white
              backdrop-blur-glass-heavy
              border border-[var(--theme-border)]
              shadow-panel-floating
              animate-fade-in
              pointer-events-none
              ${className}
            `}
            style={{
              left: coords.x,
              top: coords.y,
              background: 'var(--theme-surface-overlay)',
            }}
          >
            {content}
            <span className={getArrowClasses()} />
          </div>,
          document.body
        )}
    </>
  );
}

// ============================================================================
// Import React for cloneElement
// ============================================================================

import React from 'react';

export default Tooltip;
