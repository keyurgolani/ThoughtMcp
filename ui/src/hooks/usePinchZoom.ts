/**
 * usePinchZoom Hook
 *
 * Provides pinch-to-zoom gesture detection for touch devices.
 * Used for zooming in/out of the 3D view on mobile.
 *
 * Requirements: 36.2
 */

import { useCallback, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface PinchState {
  /** Current scale factor (1 = no zoom) */
  scale: number;
  /** Whether a pinch gesture is in progress */
  isPinching: boolean;
  /** Center point of the pinch gesture */
  center: { x: number; y: number };
}

export interface PinchHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export interface UsePinchZoomOptions {
  /** Minimum scale factor (default: 0.5) */
  minScale?: number;
  /** Maximum scale factor (default: 3) */
  maxScale?: number;
  /** Initial scale factor (default: 1) */
  initialScale?: number;
  /** Callback when scale changes */
  onScaleChange?: (scale: number) => void;
  /** Callback when pinch starts */
  onPinchStart?: () => void;
  /** Callback when pinch ends */
  onPinchEnd?: (finalScale: number) => void;
  /** Whether to prevent default touch behavior */
  preventDefault?: boolean;
}

export interface UsePinchZoomReturn {
  /** Current pinch state */
  state: PinchState;
  /** Touch event handlers to attach to element */
  handlers: PinchHandlers;
  /** Reset scale to initial value */
  resetScale: () => void;
  /** Set scale programmatically */
  setScale: (scale: number) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MIN_SCALE = 0.5;
const DEFAULT_MAX_SCALE = 3;
const DEFAULT_INITIAL_SCALE = 1;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate distance between two touch points
 */
function getDistance(touch1: React.Touch, touch2: React.Touch): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate center point between two touch points
 */
function getCenter(touch1: React.Touch, touch2: React.Touch): { x: number; y: number } {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for pinch-to-zoom gesture detection
 *
 * Features:
 * - Two-finger pinch detection
 * - Scale factor calculation
 * - Min/max scale limits
 * - Center point tracking
 *
 * Requirements: 36.2
 */
export function usePinchZoom(options: UsePinchZoomOptions = {}): UsePinchZoomReturn {
  const {
    minScale = DEFAULT_MIN_SCALE,
    maxScale = DEFAULT_MAX_SCALE,
    initialScale = DEFAULT_INITIAL_SCALE,
    onScaleChange,
    onPinchStart,
    onPinchEnd,
    preventDefault = true,
  } = options;

  const [state, setState] = useState<PinchState>({
    scale: initialScale,
    isPinching: false,
    center: { x: 0, y: 0 },
  });

  // Track initial distance and scale when pinch starts
  const initialDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(initialScale);

  const resetScale = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: initialScale,
    }));
    onScaleChange?.(initialScale);
  }, [initialScale, onScaleChange]);

  const setScale = useCallback(
    (scale: number) => {
      const clampedScale = Math.min(maxScale, Math.max(minScale, scale));
      setState((prev) => ({
        ...prev,
        scale: clampedScale,
      }));
      onScaleChange?.(clampedScale);
    },
    [minScale, maxScale, onScaleChange]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 2) return;

      if (preventDefault) {
        e.preventDefault();
      }

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      if (!touch1 || !touch2) return;

      initialDistanceRef.current = getDistance(touch1, touch2);
      initialScaleRef.current = state.scale;

      const center = getCenter(touch1, touch2);

      setState((prev) => ({
        ...prev,
        isPinching: true,
        center,
      }));

      onPinchStart?.();
    },
    [state.scale, preventDefault, onPinchStart]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 2 || !state.isPinching) return;

      if (preventDefault) {
        e.preventDefault();
      }

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      if (!touch1 || !touch2) return;

      const currentDistance = getDistance(touch1, touch2);
      const center = getCenter(touch1, touch2);

      // Calculate new scale based on distance change
      const scaleChange = currentDistance / initialDistanceRef.current;
      const newScale = initialScaleRef.current * scaleChange;

      // Clamp scale to min/max
      const clampedScale = Math.min(maxScale, Math.max(minScale, newScale));

      setState((prev) => ({
        ...prev,
        scale: clampedScale,
        center,
      }));

      onScaleChange?.(clampedScale);
    },
    [state.isPinching, minScale, maxScale, preventDefault, onScaleChange]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!state.isPinching) return;

      if (preventDefault) {
        e.preventDefault();
      }

      setState((prev) => ({
        ...prev,
        isPinching: false,
      }));

      onPinchEnd?.(state.scale);
    },
    [state.isPinching, state.scale, preventDefault, onPinchEnd]
  );

  return {
    state,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    resetScale,
    setScale,
  };
}

export default usePinchZoom;
