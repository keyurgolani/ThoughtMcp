import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export type TransitionState = "idle" | "exiting" | "entering" | "complete";

export type TransitionDirection = "forward" | "backward";

export interface UsePageTransitionOptions {
  /** Transition duration in milliseconds */
  duration?: number;
  /** Callback when transition starts */
  onTransitionStart?: () => void;
  /** Callback when transition completes */
  onTransitionComplete?: () => void;
}

export interface UsePageTransitionResult {
  /** Current transition state */
  state: TransitionState;
  /** Whether a transition is in progress */
  isTransitioning: boolean;
  /** Trigger a transition */
  triggerTransition: (direction?: TransitionDirection) => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Default transition duration in milliseconds */
const DEFAULT_DURATION = 300;

// ============================================================================
// Hook: usePageTransition
// ============================================================================

/**
 * Hook for managing page transition state
 */
export function usePageTransition(options: UsePageTransitionOptions = {}): UsePageTransitionResult {
  const { duration = DEFAULT_DURATION, onTransitionStart, onTransitionComplete } = options;

  const [state, setState] = useState<TransitionState>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerTransition = useCallback(
    (_dir?: TransitionDirection) => {
      if (state !== "idle") return;

      setState("exiting");
      onTransitionStart?.();

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // After exit animation, switch to entering
      timeoutRef.current = setTimeout(() => {
        setState("entering");

        // After enter animation, complete
        timeoutRef.current = setTimeout(() => {
          setState("complete");
          onTransitionComplete?.();

          // Reset to idle after a brief delay
          timeoutRef.current = setTimeout(() => {
            setState("idle");
          }, 50);
        }, duration);
      }, duration);
    },
    [state, duration, onTransitionStart, onTransitionComplete]
  );

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    isTransitioning: state !== "idle",
    triggerTransition,
  };
}
