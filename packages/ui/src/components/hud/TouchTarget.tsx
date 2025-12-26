/**
 * TouchTarget Component
 *
 * A wrapper component that ensures minimum touch target sizes for accessibility.
 * Provides touch-friendly hover alternatives for mobile devices.
 *
 * Requirements: 36.2
 */

import { forwardRef, useCallback, useState } from 'react';
import { MIN_TOUCH_TARGET, useIsTouchDevice } from '../../hooks';

// ============================================================================
// Types
// ============================================================================

export interface TouchTargetProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Child elements */
  children: React.ReactNode;
  /** Minimum size in pixels (default: 44px) */
  minSize?: number;
  /** Whether to show touch feedback */
  showFeedback?: boolean;
  /** Whether the element is interactive */
  interactive?: boolean;
  /** Callback for long press (touch-friendly hover alternative) */
  onLongPress?: () => void;
  /** Long press duration in ms (default: 500) */
  longPressDuration?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to center content */
  centerContent?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * TouchTarget - Ensures minimum touch target sizes
 *
 * Features:
 * - Minimum 44px touch target size (Requirement 36.2)
 * - Touch feedback on press
 * - Long press as hover alternative
 * - Automatic sizing based on device type
 *
 * Requirements: 36.2
 */
export const TouchTarget = forwardRef<HTMLDivElement, TouchTargetProps>(
  (
    {
      children,
      minSize = MIN_TOUCH_TARGET,
      showFeedback = true,
      interactive = true,
      onLongPress,
      longPressDuration = 500,
      className = '',
      centerContent = true,
      onClick,
      ...props
    },
    ref
  ) => {
    const isTouchDevice = useIsTouchDevice();
    const [isPressed, setIsPressed] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

    // Handle touch start
    const handleTouchStart = useCallback(() => {
      setIsPressed(true);

      // Start long press timer
      if (onLongPress) {
        const timer = setTimeout(() => {
          onLongPress();
          setIsPressed(false);
        }, longPressDuration);
        setLongPressTimer(timer);
      }
    }, [onLongPress, longPressDuration]);

    // Handle touch end
    const handleTouchEnd = useCallback(() => {
      setIsPressed(false);

      // Clear long press timer
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }, [longPressTimer]);

    // Handle touch cancel
    const handleTouchCancel = useCallback(() => {
      setIsPressed(false);

      // Clear long press timer
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }, [longPressTimer]);

    // Build style for minimum size
    const sizeStyle: React.CSSProperties = isTouchDevice
      ? {
          minWidth: `${String(minSize)}px`,
          minHeight: `${String(minSize)}px`,
        }
      : {};

    return (
      <div
        ref={ref}
        className={`
          ${centerContent ? 'flex items-center justify-center' : ''}
          ${interactive ? 'cursor-pointer' : ''}
          ${showFeedback && isPressed ? 'scale-95 opacity-80' : ''}
          transition-all duration-fast
          ${className}
        `}
        style={sizeStyle}
        onClick={onClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TouchTarget.displayName = 'TouchTarget';

// ============================================================================
// TouchButton Component
// ============================================================================

export interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Child elements */
  children: React.ReactNode;
  /** Minimum size in pixels (default: 44px) */
  minSize?: number;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Whether to show touch feedback */
  showFeedback?: boolean;
  /** Callback for long press */
  onLongPress?: () => void;
  /** Long press duration in ms */
  longPressDuration?: number;
}

/**
 * TouchButton - Button with minimum touch target size
 *
 * Requirements: 36.2
 */
export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  (
    {
      children,
      minSize = MIN_TOUCH_TARGET,
      variant = 'ghost',
      showFeedback = true,
      onLongPress,
      longPressDuration = 500,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const isTouchDevice = useIsTouchDevice();
    const [isPressed, setIsPressed] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

    // Handle touch start
    const handleTouchStart = useCallback(() => {
      if (disabled === true) return;
      setIsPressed(true);

      if (onLongPress != null) {
        const timer = setTimeout(() => {
          onLongPress();
          setIsPressed(false);
        }, longPressDuration);
        setLongPressTimer(timer);
      }
    }, [disabled, onLongPress, longPressDuration]);

    // Handle touch end
    const handleTouchEnd = useCallback(() => {
      setIsPressed(false);
      if (longPressTimer != null) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }, [longPressTimer]);

    // Variant styles
    const variantStyles = {
      primary: `
        bg-ui-accent-primary/20 text-ui-accent-primary
        hover:bg-ui-accent-primary/30
        border border-ui-accent-primary/50
      `,
      secondary: `
        bg-ui-accent-secondary/20 text-ui-accent-secondary
        hover:bg-ui-accent-secondary/30
        border border-ui-accent-secondary/50
      `,
      ghost: `
        bg-transparent text-ui-text-secondary
        hover:bg-ui-border/50 hover:text-ui-text-primary
      `,
    };

    // Size style for touch devices
    const sizeStyle: React.CSSProperties = isTouchDevice
      ? {
          minWidth: `${String(minSize)}px`,
          minHeight: `${String(minSize)}px`,
        }
      : {};

    return (
      <button
        ref={ref}
        className={`
          flex items-center justify-center
          rounded-lg px-3 py-2
          transition-all duration-fast
          ${variantStyles[variant]}
          ${showFeedback && isPressed ? 'scale-95' : ''}
          ${disabled === true ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
        style={sizeStyle}
        disabled={disabled}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        {...props}
      >
        {children}
      </button>
    );
  }
);

TouchButton.displayName = 'TouchButton';

export default TouchTarget;
