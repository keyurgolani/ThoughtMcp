/**
 * useWarpTransition Hook
 *
 * Manages warp transition animations for navigating between memory nodes.
 * Animates camera along edge path with motion blur effects.
 *
 * Requirements: 4.1-4.3
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import { useNavigationStore } from '../stores/navigationStore';

// ============================================================================
// Types
// ============================================================================

export interface WarpTransitionConfig {
  /** Transition duration in milliseconds (800-1200ms per requirement) */
  duration: number;
  /** Easing function type */
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  /** Enable motion blur effect */
  enableMotionBlur: boolean;
  /** Motion blur intensity (0-1) */
  motionBlurIntensity: number;
}

export interface WarpTransitionState {
  /** Whether a warp transition is currently active */
  isWarping: boolean;
  /** Progress of current warp (0-1) */
  progress: number;
  /** Source position of the warp */
  sourcePosition: THREE.Vector3 | null;
  /** Target position of the warp */
  targetPosition: THREE.Vector3 | null;
  /** Current motion blur intensity */
  currentBlurIntensity: number;
}

export interface WarpTransitionActions {
  /** Start a warp transition to target position */
  startWarp: (
    targetPosition: [number, number, number],
    targetNodeId: string,
    onComplete?: () => void
  ) => void;
  /** Cancel current warp transition */
  cancelWarp: () => void;
  /** Get current warp state */
  getState: () => WarpTransitionState;
}

export type UseWarpTransitionReturn = WarpTransitionState & WarpTransitionActions;

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_WARP_CONFIG: WarpTransitionConfig = {
  duration: 1000, // 1000ms (within 800-1200ms range per requirement 4.2)
  easing: 'easeInOut',
  enableMotionBlur: true,
  motionBlurIntensity: 0.5,
};

// ============================================================================
// Easing Functions
// ============================================================================

type EasingFunction = (t: number) => number;

const easingFunctions: Record<WarpTransitionConfig['easing'], EasingFunction> = {
  linear: (t: number): number => t,
  easeIn: (t: number): number => t * t * t,
  easeOut: (t: number): number => 1 - Math.pow(1 - t, 3),
  easeInOut: (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

/**
 * Calculate motion blur intensity based on warp progress.
 * Blur is highest in the middle of the transition.
 */
export function calculateMotionBlurIntensity(progress: number, maxIntensity: number): number {
  // Bell curve: blur peaks at 50% progress
  const bellCurve = Math.sin(progress * Math.PI);
  return bellCurve * maxIntensity;
}

/**
 * Interpolate position along a curved path between two points.
 * Creates a slight arc for more dynamic movement.
 */
export function interpolateWarpPath(
  source: THREE.Vector3,
  target: THREE.Vector3,
  progress: number,
  arcHeight: number = 0.5
): THREE.Vector3 {
  // Linear interpolation for base position
  const result = new THREE.Vector3().lerpVectors(source, target, progress);

  // Add arc effect (parabolic curve)
  const arcProgress = Math.sin(progress * Math.PI);
  const distance = source.distanceTo(target);
  const arcOffset = arcProgress * arcHeight * Math.min(distance * 0.1, 2);

  // Calculate perpendicular direction for arc
  const direction = new THREE.Vector3().subVectors(target, source).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const perpendicular = new THREE.Vector3().crossVectors(direction, up).normalize();

  // If direction is parallel to up, use a different perpendicular
  if (perpendicular.length() < 0.1) {
    perpendicular.set(1, 0, 0);
  }

  // Apply arc offset perpendicular to travel direction
  result.addScaledVector(up, arcOffset);

  return result;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useWarpTransition(
  config: Partial<WarpTransitionConfig> = {}
): UseWarpTransitionReturn {
  const { camera } = useThree();
  const setTransitioning = useNavigationStore((state) => state.setTransitioning);

  // Merge config with defaults
  const fullConfig: WarpTransitionConfig = {
    ...DEFAULT_WARP_CONFIG,
    ...config,
  };

  // State
  const [isWarping, setIsWarping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBlurIntensity, setCurrentBlurIntensity] = useState(0);

  // Refs for animation state
  const sourcePositionRef = useRef<THREE.Vector3 | null>(null);
  const targetPositionRef = useRef<THREE.Vector3 | null>(null);
  const startTimeRef = useRef<number>(0);
  const onCompleteRef = useRef<(() => void) | undefined>(undefined);
  const targetNodeIdRef = useRef<string>('');

  // Get easing function
  const easingFn = easingFunctions[fullConfig.easing];

  /**
   * Start a warp transition to the target position
   */
  const startWarp = useCallback(
    (
      targetPosition: [number, number, number],
      targetNodeId: string,
      onComplete?: () => void
    ): void => {
      // Don't start if already warping
      if (isWarping) {
        return;
      }

      // Store source position (current camera position)
      sourcePositionRef.current = camera.position.clone();
      targetPositionRef.current = new THREE.Vector3(...targetPosition);
      startTimeRef.current = performance.now();
      onCompleteRef.current = onComplete;
      targetNodeIdRef.current = targetNodeId;

      // Lock navigation during transition (Requirement 4.8)
      setTransitioning(true);
      setIsWarping(true);
      setProgress(0);
      setCurrentBlurIntensity(0);
    },
    [camera, isWarping, setTransitioning]
  );

  /**
   * Cancel the current warp transition
   */
  const cancelWarp = useCallback((): void => {
    if (!isWarping) {
      return;
    }

    sourcePositionRef.current = null;
    targetPositionRef.current = null;
    onCompleteRef.current = undefined;
    targetNodeIdRef.current = '';

    setTransitioning(false);
    setIsWarping(false);
    setProgress(0);
    setCurrentBlurIntensity(0);
  }, [isWarping, setTransitioning]);

  /**
   * Get current warp state
   */
  const getState = useCallback((): WarpTransitionState => {
    return {
      isWarping,
      progress,
      sourcePosition: sourcePositionRef.current,
      targetPosition: targetPositionRef.current,
      currentBlurIntensity,
    };
  }, [isWarping, progress, currentBlurIntensity]);

  // Animation frame update
  useFrame(() => {
    if (!isWarping || !sourcePositionRef.current || !targetPositionRef.current) {
      return;
    }

    const elapsed = performance.now() - startTimeRef.current;
    const rawProgress = Math.min(elapsed / fullConfig.duration, 1);
    const easedProgress = easingFn(rawProgress);

    // Update progress state
    setProgress(easedProgress);

    // Calculate and update motion blur intensity
    if (fullConfig.enableMotionBlur) {
      const blurIntensity = calculateMotionBlurIntensity(
        rawProgress,
        fullConfig.motionBlurIntensity
      );
      setCurrentBlurIntensity(blurIntensity);
    }

    // Interpolate camera position along warp path
    const newPosition = interpolateWarpPath(
      sourcePositionRef.current,
      targetPositionRef.current,
      easedProgress
    );
    camera.position.copy(newPosition);

    // Make camera look towards target during warp
    if (easedProgress < 0.9) {
      camera.lookAt(targetPositionRef.current);
    }

    // Check if warp is complete
    if (rawProgress >= 1) {
      // Ensure camera is exactly at target
      camera.position.copy(targetPositionRef.current);

      // Call completion callback
      const onComplete = onCompleteRef.current;

      // Reset state
      sourcePositionRef.current = null;
      targetPositionRef.current = null;
      onCompleteRef.current = undefined;

      setTransitioning(false);
      setIsWarping(false);
      setProgress(1);
      setCurrentBlurIntensity(0);

      // Execute callback after state reset
      if (onComplete) {
        onComplete();
      }
    }
  });

  return {
    isWarping,
    progress,
    sourcePosition: sourcePositionRef.current,
    targetPosition: targetPositionRef.current,
    currentBlurIntensity,
    startWarp,
    cancelWarp,
    getState,
  };
}

export default useWarpTransition;
