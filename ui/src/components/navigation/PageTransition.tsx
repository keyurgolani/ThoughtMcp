/**
 * PageTransition Component
 *
 * Provides smooth page transitions consistent with the warp animation style.
 * Uses CSS animations for performance and accessibility support.
 *
 * Requirements: 23.2
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export type TransitionState = 'idle' | 'exiting' | 'entering' | 'complete';

export type TransitionDirection = 'forward' | 'backward';

export interface PageTransitionProps {
  /** Unique key to trigger transition on change */
  pageKey: string;
  /** Children to render */
  children: React.ReactNode;
  /** Transition duration in milliseconds */
  duration?: number;
  /** Direction of transition (affects animation direction) */
  direction?: TransitionDirection;
  /** Callback when transition starts */
  onTransitionStart?: () => void;
  /** Callback when transition completes */
  onTransitionComplete?: () => void;
  /** Whether to disable animations (for reduced motion preference) */
  disableAnimation?: boolean;
  /** Additional CSS classes */
  className?: string;
}

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

/** CSS keyframes for warp-style transitions */
const TRANSITION_STYLES = `
  @keyframes page-exit-forward {
    0% {
      opacity: 1;
      transform: scale(1) translateZ(0);
    }
    100% {
      opacity: 0;
      transform: scale(0.95) translateZ(-50px);
    }
  }

  @keyframes page-enter-forward {
    0% {
      opacity: 0;
      transform: scale(1.05) translateZ(50px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateZ(0);
    }
  }

  @keyframes page-exit-backward {
    0% {
      opacity: 1;
      transform: scale(1) translateZ(0);
    }
    100% {
      opacity: 0;
      transform: scale(1.05) translateZ(50px);
    }
  }

  @keyframes page-enter-backward {
    0% {
      opacity: 0;
      transform: scale(0.95) translateZ(-50px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateZ(0);
    }
  }
`;

// ============================================================================
// Hook: usePageTransition
// ============================================================================

/**
 * Hook for managing page transition state
 */
export function usePageTransition(options: UsePageTransitionOptions = {}): UsePageTransitionResult {
  const { duration = DEFAULT_DURATION, onTransitionStart, onTransitionComplete } = options;

  const [state, setState] = useState<TransitionState>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerTransition = useCallback(
    (_dir: TransitionDirection = 'forward') => {
      if (state !== 'idle') return;

      setState('exiting');
      onTransitionStart?.();

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // After exit animation, switch to entering
      timeoutRef.current = setTimeout(() => {
        setState('entering');

        // After enter animation, complete
        timeoutRef.current = setTimeout(() => {
          setState('complete');
          onTransitionComplete?.();

          // Reset to idle after a brief delay
          timeoutRef.current = setTimeout(() => {
            setState('idle');
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
    isTransitioning: state !== 'idle',
    triggerTransition,
  };
}

// ============================================================================
// Style Injection
// ============================================================================

let stylesInjected = false;

function injectStyles(): void {
  if (stylesInjected || typeof document === 'undefined') return;

  const styleElement = document.createElement('style');
  styleElement.textContent = TRANSITION_STYLES;
  document.head.appendChild(styleElement);
  stylesInjected = true;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PageTransition - Smooth page transitions consistent with warp style
 *
 * Features:
 * - Warp-style scale and depth transitions (Requirement 23.2)
 * - Forward and backward direction support
 * - Reduced motion support
 * - Callback hooks for transition events
 *
 * Requirements: 23.2
 */
export function PageTransition({
  pageKey,
  children,
  duration = DEFAULT_DURATION,
  direction = 'forward',
  onTransitionStart,
  onTransitionComplete,
  disableAnimation = false,
  className = '',
}: PageTransitionProps): React.ReactElement {
  const [transitionState, setTransitionState] = useState<TransitionState>('idle');
  const [currentDirection, setCurrentDirection] = useState<TransitionDirection>(direction);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousKeyRef = useRef(pageKey);

  // Inject styles on mount
  useEffect(() => {
    injectStyles();
  }, []);

  // Handle page key changes
  useEffect(() => {
    // Skip if same key or already transitioning
    if (pageKey === previousKeyRef.current) return;

    // Update the previous key immediately
    previousKeyRef.current = pageKey;

    if (disableAnimation) {
      // Skip animation, content already updated via children prop
      return;
    }

    // Start exit transition
    setCurrentDirection(direction);
    setTransitionState('exiting');
    onTransitionStart?.();

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // After exit, start enter animation
    timeoutRef.current = setTimeout(() => {
      setTransitionState('entering');

      // After enter, complete
      timeoutRef.current = setTimeout(() => {
        setTransitionState('idle');
        onTransitionComplete?.();
      }, duration);
    }, duration);

    return (): void => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pageKey, duration, direction, disableAnimation, onTransitionStart, onTransitionComplete]);

  // Determine animation style
  const getAnimationStyle = (): React.CSSProperties => {
    if (disableAnimation || transitionState === 'idle') {
      return {};
    }

    const animationName =
      transitionState === 'exiting'
        ? `page-exit-${currentDirection}`
        : `page-enter-${currentDirection}`;

    return {
      animation: `${animationName} ${String(duration)}ms ease-out forwards`,
      transformStyle: 'preserve-3d',
      perspective: '1000px',
    };
  };

  return (
    <div
      ref={contentRef}
      className={`page-transition ${className}`}
      style={getAnimationStyle()}
      data-transition-state={transitionState}
      data-transition-direction={currentDirection}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Utility Components
// ============================================================================

export interface FadeTransitionProps {
  /** Whether the content is visible */
  visible: boolean;
  /** Children to render */
  children: React.ReactNode;
  /** Transition duration in milliseconds */
  duration?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Simple fade transition for showing/hiding content
 */
export function FadeTransition({
  visible,
  children,
  duration = 200,
  className = '',
}: FadeTransitionProps): React.ReactElement | null {
  const [shouldRender, setShouldRender] = useState(visible);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      return undefined;
    } else {
      setIsAnimating(false);
      const timeout = setTimeout(() => {
        setShouldRender(false);
      }, duration);
      return (): void => {
        clearTimeout(timeout);
      };
    }
  }, [visible, duration]);

  if (!shouldRender) return null;

  return (
    <div
      className={`transition-opacity ${className}`}
      style={{
        opacity: isAnimating ? 1 : 0,
        transitionDuration: `${String(duration)}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default PageTransition;
