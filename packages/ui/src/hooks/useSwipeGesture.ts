/**
 * useSwipeGesture Hook
 *
 * Provides swipe gesture detection for mobile panel navigation.
 * Supports horizontal and vertical swipe detection with configurable thresholds.
 *
 * Requirements: 36.1, 36.2
 */

import { useCallback, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

export interface SwipeState {
  /** Current swipe direction */
  direction: SwipeDirection;
  /** Whether a swipe is in progress */
  isSwiping: boolean;
  /** Current swipe distance in pixels */
  distance: number;
  /** Swipe velocity (pixels per ms) */
  velocity: number;
}

export interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export interface UseSwipeGestureOptions {
  /** Minimum distance to trigger a swipe (default: 50px) */
  threshold?: number | undefined;
  /** Minimum velocity to trigger a swipe (default: 0.3 px/ms) */
  velocityThreshold?: number | undefined;
  /** Callback when swipe left is detected */
  onSwipeLeft?: (() => void) | undefined;
  /** Callback when swipe right is detected */
  onSwipeRight?: (() => void) | undefined;
  /** Callback when swipe up is detected */
  onSwipeUp?: (() => void) | undefined;
  /** Callback when swipe down is detected */
  onSwipeDown?: (() => void) | undefined;
  /** Whether to prevent default touch behavior */
  preventDefault?: boolean | undefined;
}

export interface UseSwipeGestureReturn {
  /** Current swipe state */
  state: SwipeState;
  /** Touch event handlers to attach to element */
  handlers: SwipeHandlers;
  /** Reset swipe state */
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_THRESHOLD = 50;
const DEFAULT_VELOCITY_THRESHOLD = 0.3;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for swipe gesture detection
 *
 * Features:
 * - Horizontal and vertical swipe detection
 * - Configurable distance and velocity thresholds
 * - Callbacks for each swipe direction
 * - Touch event handlers for easy attachment
 *
 * Requirements: 36.1, 36.2
 */
export function useSwipeGesture(options: UseSwipeGestureOptions = {}): UseSwipeGestureReturn {
  const {
    threshold = DEFAULT_THRESHOLD,
    velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    preventDefault = false,
  } = options;

  const [state, setState] = useState<SwipeState>({
    direction: null,
    isSwiping: false,
    distance: 0,
    velocity: 0,
  });

  // Track touch start position and time
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const reset = useCallback(() => {
    setState({
      direction: null,
      isSwiping: false,
      distance: 0,
      velocity: 0,
    });
    touchStartRef.current = null;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (preventDefault) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      if (!touch) return;

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        isSwiping: true,
        direction: null,
        distance: 0,
      }));
    },
    [preventDefault]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      if (preventDefault) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Determine direction based on larger delta
      let direction: SwipeDirection = null;
      let distance = 0;

      if (absX > absY) {
        // Horizontal swipe
        direction = deltaX > 0 ? 'right' : 'left';
        distance = absX;
      } else {
        // Vertical swipe
        direction = deltaY > 0 ? 'down' : 'up';
        distance = absY;
      }

      setState((prev) => ({
        ...prev,
        direction,
        distance,
      }));
    },
    [preventDefault]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      if (preventDefault) {
        e.preventDefault();
      }

      const touch = e.changedTouches[0];
      if (!touch) {
        reset();
        return;
      }

      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const elapsed = Date.now() - touchStartRef.current.time;

      // Calculate velocity
      const distance = Math.max(absX, absY);
      const velocity = elapsed > 0 ? distance / elapsed : 0;

      // Determine if swipe meets threshold
      const meetsThreshold = distance >= threshold || velocity >= velocityThreshold;

      if (meetsThreshold) {
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }

      setState({
        direction: null,
        isSwiping: false,
        distance: 0,
        velocity,
      });

      touchStartRef.current = null;
    },
    [
      threshold,
      velocityThreshold,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      reset,
      preventDefault,
    ]
  );

  return {
    state,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    reset,
  };
}

export default useSwipeGesture;
