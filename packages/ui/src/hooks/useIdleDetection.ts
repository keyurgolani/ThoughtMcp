/**
 * useIdleDetection Hook
 *
 * Detects user idle state based on mouse movement, keyboard input,
 * and other user interactions.
 *
 * Requirements: 11.6
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface IdleDetectionConfig {
  /** Time in ms before considering user idle */
  idleTimeout: number;
  /** Events to track for activity */
  events: string[];
  /** Whether idle detection is enabled */
  enabled: boolean;
}

export interface IdleDetectionState {
  /** Whether user is currently idle */
  isIdle: boolean;
  /** Time since last activity in ms */
  idleTime: number;
  /** Timestamp of last activity */
  lastActivityTime: number;
}

export interface IdleDetectionResult {
  /** Current idle state */
  state: IdleDetectionState;
  /** Manually mark as active */
  markActive: () => void;
  /** Reset idle timer */
  reset: () => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_IDLE_DETECTION_CONFIG: IdleDetectionConfig = {
  idleTimeout: 3000, // 3 seconds
  events: [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'scroll',
    'wheel',
    'pointerdown',
    'pointermove',
  ],
  enabled: true,
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useIdleDetection(config: Partial<IdleDetectionConfig> = {}): IdleDetectionResult {
  const mergedConfig: IdleDetectionConfig = {
    ...DEFAULT_IDLE_DETECTION_CONFIG,
    ...config,
  };

  // State
  const [state, setState] = useState<IdleDetectionState>({
    isIdle: false,
    idleTime: 0,
    lastActivityTime: Date.now(),
  });

  // Refs
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());

  /**
   * Handle user activity
   */
  const handleActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    setState((prev) => ({
      ...prev,
      isIdle: false,
      idleTime: 0,
      lastActivityTime: now,
    }));

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for idle detection
    if (mergedConfig.enabled) {
      timeoutRef.current = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          isIdle: true,
        }));
      }, mergedConfig.idleTimeout);
    }
  }, [mergedConfig.enabled, mergedConfig.idleTimeout]);

  /**
   * Manually mark as active
   */
  const markActive = useCallback(() => {
    handleActivity();
  }, [handleActivity]);

  /**
   * Reset idle detection
   */
  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const now = Date.now();
    lastActivityRef.current = now;

    setState({
      isIdle: false,
      idleTime: 0,
      lastActivityTime: now,
    });

    // Start new timeout
    if (mergedConfig.enabled) {
      timeoutRef.current = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          isIdle: true,
        }));
      }, mergedConfig.idleTimeout);
    }
  }, [mergedConfig.enabled, mergedConfig.idleTimeout]);

  // Set up event listeners
  useEffect(() => {
    if (!mergedConfig.enabled) {
      return;
    }

    // Add event listeners
    for (const event of mergedConfig.events) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    // Start initial timeout
    timeoutRef.current = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isIdle: true,
      }));
    }, mergedConfig.idleTimeout);

    // Update idle time periodically
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.isIdle) {
          return {
            ...prev,
            idleTime: Date.now() - lastActivityRef.current,
          };
        }
        return prev;
      });
    }, 1000);

    // Cleanup
    return (): void => {
      for (const event of mergedConfig.events) {
        window.removeEventListener(event, handleActivity);
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [mergedConfig.enabled, mergedConfig.events, mergedConfig.idleTimeout, handleActivity]);

  return {
    state,
    markActive,
    reset,
  };
}

export default useIdleDetection;
