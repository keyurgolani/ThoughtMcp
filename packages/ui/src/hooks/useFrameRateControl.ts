/**
 * useFrameRateControl Hook
 *
 * Controls the rendering frame rate based on user activity,
 * reducing frame rate when idle to conserve resources.
 *
 * Requirements: 11.6
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  calculateFrameInterval,
  DEFAULT_FRAME_RATE_CONFIG,
  interpolateFrameRate,
  type FrameRateConfig,
} from '../utils/performance';
import { useIdleDetection, type IdleDetectionConfig } from './useIdleDetection';

// ============================================================================
// Types
// ============================================================================

export interface FrameRateControlConfig extends FrameRateConfig {
  /** Idle detection configuration */
  idleDetection?: Partial<IdleDetectionConfig>;
  /** Whether frame rate control is enabled */
  enabled: boolean;
}

export interface FrameRateControlState {
  /** Current target frame rate */
  currentFrameRate: number;
  /** Whether currently in idle mode */
  isIdleMode: boolean;
  /** Whether transitioning between modes */
  isTransitioning: boolean;
  /** Transition progress (0-1) */
  transitionProgress: number;
}

export interface FrameRateControlResult {
  /** Current state */
  state: FrameRateControlState;
  /** Force active mode */
  forceActive: () => void;
  /** Force idle mode */
  forceIdle: () => void;
  /** Reset to automatic mode */
  resetToAuto: () => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_FRAME_RATE_CONTROL_CONFIG: FrameRateControlConfig = {
  ...DEFAULT_FRAME_RATE_CONFIG,
  enabled: true,
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFrameRateControl(
  config: Partial<FrameRateControlConfig> = {}
): FrameRateControlResult {
  const mergedConfig: FrameRateControlConfig = {
    ...DEFAULT_FRAME_RATE_CONTROL_CONFIG,
    ...config,
  };

  // Get Three.js context
  const { invalidate, gl } = useThree();

  // Idle detection
  const { state: idleState, markActive } = useIdleDetection({
    idleTimeout: mergedConfig.idleTimeout,
    ...mergedConfig.idleDetection,
    enabled: mergedConfig.enabled,
  });

  // State
  const [state, setState] = useState<FrameRateControlState>({
    currentFrameRate: mergedConfig.activeFrameRate,
    isIdleMode: false,
    isTransitioning: false,
    transitionProgress: 0,
  });

  // Refs for frame limiting
  const lastFrameTimeRef = useRef(0);
  const forcedModeRef = useRef<'active' | 'idle' | null>(null);
  const transitionStartRef = useRef(0);
  const transitionFromRef = useRef(mergedConfig.activeFrameRate);

  /**
   * Get target frame rate based on current mode
   */
  const getTargetFrameRate = useCallback((): number => {
    if (forcedModeRef.current === 'active') {
      return mergedConfig.activeFrameRate;
    }
    if (forcedModeRef.current === 'idle') {
      return mergedConfig.idleFrameRate;
    }
    return idleState.isIdle ? mergedConfig.idleFrameRate : mergedConfig.activeFrameRate;
  }, [idleState.isIdle, mergedConfig.activeFrameRate, mergedConfig.idleFrameRate]);

  /**
   * Force active mode
   */
  const forceActive = useCallback(() => {
    forcedModeRef.current = 'active';
    markActive();
    setState((prev) => ({
      ...prev,
      isIdleMode: false,
      currentFrameRate: mergedConfig.activeFrameRate,
    }));
  }, [markActive, mergedConfig.activeFrameRate]);

  /**
   * Force idle mode
   */
  const forceIdle = useCallback(() => {
    forcedModeRef.current = 'idle';
    setState((prev) => ({
      ...prev,
      isIdleMode: true,
      currentFrameRate: mergedConfig.idleFrameRate,
    }));
  }, [mergedConfig.idleFrameRate]);

  /**
   * Reset to automatic mode
   */
  const resetToAuto = useCallback(() => {
    forcedModeRef.current = null;
  }, []);

  // Handle idle state changes with smooth transition
  useEffect(() => {
    if (!mergedConfig.enabled) return;

    const targetRate = getTargetFrameRate();
    const isIdleMode = targetRate === mergedConfig.idleFrameRate;

    if (state.currentFrameRate !== targetRate) {
      // Start transition
      transitionStartRef.current = Date.now();
      transitionFromRef.current = state.currentFrameRate;

      setState((prev) => ({
        ...prev,
        isTransitioning: true,
        transitionProgress: 0,
      }));
    }

    setState((prev) => ({
      ...prev,
      isIdleMode,
    }));
  }, [
    idleState.isIdle,
    getTargetFrameRate,
    mergedConfig.enabled,
    mergedConfig.idleFrameRate,
    state.currentFrameRate,
  ]);

  // Frame rate limiting using useFrame
  useFrame((frameState) => {
    if (!mergedConfig.enabled) return;

    const now = frameState.clock.elapsedTime * 1000;
    const targetRate = getTargetFrameRate();

    // Handle transition
    if (state.isTransitioning) {
      const elapsed = Date.now() - transitionStartRef.current;
      const progress = Math.min(1, elapsed / mergedConfig.transitionDuration);

      const interpolatedRate = interpolateFrameRate(
        transitionFromRef.current,
        targetRate,
        progress
      );

      setState((prev) => ({
        ...prev,
        currentFrameRate: interpolatedRate,
        transitionProgress: progress,
        isTransitioning: progress < 1,
      }));
    }

    // Frame limiting
    const frameInterval = calculateFrameInterval(state.currentFrameRate);
    const delta = now - lastFrameTimeRef.current;

    if (delta < frameInterval) {
      // Skip this frame
      return;
    }

    lastFrameTimeRef.current = now;

    // Request next frame if in idle mode (manual frame control)
    if (state.isIdleMode && !state.isTransitioning) {
      // In idle mode, we let the frame rate naturally reduce
      // by not calling invalidate() as frequently
    }
  });

  // Set up frame loop mode based on idle state
  useEffect(() => {
    if (!mergedConfig.enabled) return;

    // Configure renderer for power saving in idle mode
    if (state.isIdleMode && !state.isTransitioning) {
      gl.setAnimationLoop(null); // Disable automatic animation loop
      // Set up manual frame requests at reduced rate
      const interval = setInterval(() => {
        invalidate();
      }, calculateFrameInterval(mergedConfig.idleFrameRate));

      return (): void => {
        clearInterval(interval);
        gl.setAnimationLoop(null);
      };
    }

    return undefined;
  }, [
    state.isIdleMode,
    state.isTransitioning,
    mergedConfig.enabled,
    mergedConfig.idleFrameRate,
    gl,
    invalidate,
  ]);

  return {
    state,
    forceActive,
    forceIdle,
    resetToAuto,
  };
}

// ============================================================================
// Standalone Hook (without R3F context)
// ============================================================================

export interface FrameRateControlStandaloneResult {
  /** Current state */
  state: FrameRateControlState;
  /** Whether user is idle */
  isIdle: boolean;
  /** Force active mode */
  forceActive: () => void;
  /** Force idle mode */
  forceIdle: () => void;
  /** Reset to automatic mode */
  resetToAuto: () => void;
  /** Mark user as active */
  markActive: () => void;
}

/**
 * Standalone version that doesn't require R3F context
 * Useful for components outside the Canvas
 */
export function useFrameRateControlStandalone(
  config: Partial<FrameRateControlConfig> = {}
): FrameRateControlStandaloneResult {
  const mergedConfig: FrameRateControlConfig = {
    ...DEFAULT_FRAME_RATE_CONTROL_CONFIG,
    ...config,
  };

  // Idle detection
  const {
    state: idleState,
    markActive,
    reset,
  } = useIdleDetection({
    idleTimeout: mergedConfig.idleTimeout,
    ...mergedConfig.idleDetection,
    enabled: mergedConfig.enabled,
  });

  // State
  const [state, setState] = useState<FrameRateControlState>({
    currentFrameRate: mergedConfig.activeFrameRate,
    isIdleMode: false,
    isTransitioning: false,
    transitionProgress: 0,
  });

  // Refs
  const forcedModeRef = useRef<'active' | 'idle' | null>(null);
  const transitionStartRef = useRef(0);
  const transitionFromRef = useRef(mergedConfig.activeFrameRate);

  /**
   * Get target frame rate based on current mode
   */
  const getTargetFrameRate = useCallback((): number => {
    if (forcedModeRef.current === 'active') {
      return mergedConfig.activeFrameRate;
    }
    if (forcedModeRef.current === 'idle') {
      return mergedConfig.idleFrameRate;
    }
    return idleState.isIdle ? mergedConfig.idleFrameRate : mergedConfig.activeFrameRate;
  }, [idleState.isIdle, mergedConfig.activeFrameRate, mergedConfig.idleFrameRate]);

  /**
   * Force active mode
   */
  const forceActive = useCallback(() => {
    forcedModeRef.current = 'active';
    markActive();
    setState((prev) => ({
      ...prev,
      isIdleMode: false,
      currentFrameRate: mergedConfig.activeFrameRate,
    }));
  }, [markActive, mergedConfig.activeFrameRate]);

  /**
   * Force idle mode
   */
  const forceIdle = useCallback(() => {
    forcedModeRef.current = 'idle';
    setState((prev) => ({
      ...prev,
      isIdleMode: true,
      currentFrameRate: mergedConfig.idleFrameRate,
    }));
  }, [mergedConfig.idleFrameRate]);

  /**
   * Reset to automatic mode
   */
  const resetToAuto = useCallback(() => {
    forcedModeRef.current = null;
    reset();
  }, [reset]);

  // Handle idle state changes with smooth transition
  useEffect(() => {
    if (!mergedConfig.enabled) return;

    const targetRate = getTargetFrameRate();
    const isIdleMode = targetRate === mergedConfig.idleFrameRate;

    if (state.currentFrameRate !== targetRate) {
      // Start transition
      transitionStartRef.current = Date.now();
      transitionFromRef.current = state.currentFrameRate;

      // Animate transition
      const animate = (): void => {
        const elapsed = Date.now() - transitionStartRef.current;
        const progress = Math.min(1, elapsed / mergedConfig.transitionDuration);

        const interpolatedRate = interpolateFrameRate(
          transitionFromRef.current,
          targetRate,
          progress
        );

        setState((prev) => ({
          ...prev,
          currentFrameRate: interpolatedRate,
          transitionProgress: progress,
          isTransitioning: progress < 1,
          isIdleMode,
        }));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else {
      setState((prev) => ({
        ...prev,
        isIdleMode,
      }));
    }
  }, [
    idleState.isIdle,
    getTargetFrameRate,
    mergedConfig.enabled,
    mergedConfig.idleFrameRate,
    mergedConfig.transitionDuration,
    state.currentFrameRate,
  ]);

  return {
    state,
    isIdle: idleState.isIdle,
    forceActive,
    forceIdle,
    resetToAuto,
    markActive,
  };
}

export default useFrameRateControl;
