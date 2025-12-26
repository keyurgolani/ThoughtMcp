/**
 * WarpEffect Component
 *
 * Post-processing effects for warp transitions including motion blur simulation,
 * speed lines, tunnel/vortex effect, and camera shake.
 * Uses @react-three/postprocessing for GPU-accelerated effects.
 *
 * Requirements: 4.3 (motion blur during travel), 34.5 (enhanced warp effects)
 */

import { useFrame } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../utils/accessibility';

// ============================================================================
// Constants
// ============================================================================

/** Number of speed line particles */
const SPEED_LINE_COUNT = 100;

/** Speed line reset threshold */
const SPEED_LINE_RESET_Z = 15;

/** Camera shake intensity */
const CAMERA_SHAKE_INTENSITY = 0.03;

/** Camera shake frequency */
const CAMERA_SHAKE_FREQUENCY = 20;

// ============================================================================
// Types
// ============================================================================

export interface WarpEffectProps {
  /** Whether warp is currently active */
  isWarping: boolean;
  /** Current motion blur intensity (0-1) */
  blurIntensity: number;
  /** Whether motion blur is enabled */
  enableMotionBlur?: boolean;
  /** Enable speed lines effect */
  enableSpeedLines?: boolean;
  /** Enable camera shake */
  enableCameraShake?: boolean;
}

// ============================================================================
// Speed Lines Component
// ============================================================================

interface SpeedLinesProps {
  intensity: number;
  isActive: boolean;
}

function SpeedLines({ intensity, isActive }: SpeedLinesProps): React.ReactElement | null {
  const linesRef = useRef<THREE.Points>(null);
  const [visible, setVisible] = useState(false);

  // Generate speed line positions
  const positions = useMemo(() => {
    const posArray = new Float32Array(SPEED_LINE_COUNT * 3);

    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      const i3 = i * 3;

      // Random position in a cylinder around the camera
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 8;
      const z = (Math.random() - 0.5) * 30;

      posArray[i3] = Math.cos(angle) * radius;
      posArray[i3 + 1] = Math.sin(angle) * radius;
      posArray[i3 + 2] = z;
    }

    return posArray;
  }, []);

  // Animate speed lines
  useFrame((_, delta) => {
    if (!linesRef.current) return;

    // Show/hide based on active state
    if (isActive && !visible) {
      setVisible(true);
    } else if (!isActive && visible) {
      setVisible(false);
    }

    if (!isActive) return;

    const positionAttr = linesRef.current.geometry.attributes.position;
    if (!positionAttr) return;

    const posArray = positionAttr.array as Float32Array;
    const speed = intensity * 50 * delta;

    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      const i3 = i * 3;
      const currentZ = posArray[i3 + 2];

      if (currentZ !== undefined) {
        // Move towards camera
        const newZ = currentZ - speed;
        posArray[i3 + 2] = newZ;

        // Reset if past camera
        if (newZ < -SPEED_LINE_RESET_Z) {
          posArray[i3 + 2] = SPEED_LINE_RESET_Z;
        }
      }
    }

    positionAttr.needsUpdate = true;

    // Update material opacity based on intensity
    const material = linesRef.current.material as THREE.PointsMaterial;
    material.opacity = intensity * 0.6;
  });

  if (!visible) return null;

  return (
    <points ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={SPEED_LINE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#00FFFF"
        size={0.1}
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// ============================================================================
// Camera Shake Hook
// ============================================================================

function useCameraShake(isActive: boolean, intensity: number, enabled: boolean): void {
  const originalPositionRef = useRef<THREE.Vector3 | null>(null);
  const reducedMotion = prefersReducedMotion();

  useFrame(({ camera, clock }) => {
    if (reducedMotion || !enabled) return;

    if (isActive && intensity > 0) {
      // Store original position on first frame
      if (!originalPositionRef.current) {
        originalPositionRef.current = camera.position.clone();
      }

      // Apply shake
      const time = clock.elapsedTime * CAMERA_SHAKE_FREQUENCY;
      const shakeAmount = intensity * CAMERA_SHAKE_INTENSITY;

      camera.position.x += Math.sin(time * 1.1) * shakeAmount;
      camera.position.y += Math.cos(time * 1.3) * shakeAmount;
    } else if (originalPositionRef.current) {
      // Reset position when not active
      originalPositionRef.current = null;
    }
  });
}

// ============================================================================
// Component Implementation
// ============================================================================

export function WarpEffect({
  isWarping,
  blurIntensity,
  enableMotionBlur = true,
  enableSpeedLines = true,
  enableCameraShake = true,
}: WarpEffectProps): React.ReactElement | null {
  const reducedMotion = prefersReducedMotion();

  // Apply camera shake
  useCameraShake(isWarping, blurIntensity, enableCameraShake);

  // Calculate effect parameters based on blur intensity
  const effectParams = useMemo(() => {
    if (!enableMotionBlur || reducedMotion || !isWarping) {
      return null;
    }

    // Enhanced chromatic aberration for stronger speed effect
    const chromaticOffset = new THREE.Vector2(blurIntensity * 0.008, blurIntensity * 0.004);

    // Bloom intensity increases during warp for "light streak" effect
    const bloomIntensity = blurIntensity * 2.0;
    const bloomLuminanceThreshold = 0.6 - blurIntensity * 0.3;

    // Enhanced vignette for stronger tunnel effect
    const vignetteOffset = 0.2 + blurIntensity * 0.3;
    const vignetteDarkness = 0.6 + blurIntensity * 0.4;

    return {
      chromaticOffset,
      bloomIntensity,
      bloomLuminanceThreshold,
      vignetteOffset,
      vignetteDarkness,
    };
  }, [enableMotionBlur, reducedMotion, isWarping, blurIntensity]);

  // Don't render effects if not warping or reduced motion is preferred
  if (!isWarping || reducedMotion) {
    return null;
  }

  return (
    <>
      {/* Speed lines for motion effect (Requirements 34.5) */}
      {enableSpeedLines && <SpeedLines intensity={blurIntensity} isActive={isWarping} />}

      {/* Post-processing effects */}
      {enableMotionBlur && effectParams && (
        <EffectComposer>
          {/* Enhanced chromatic aberration for motion blur simulation */}
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={effectParams.chromaticOffset}
            radialModulation={true}
            modulationOffset={0.3}
          />

          {/* Enhanced bloom for light streaks during warp */}
          <Bloom
            intensity={effectParams.bloomIntensity}
            luminanceThreshold={effectParams.bloomLuminanceThreshold}
            luminanceSmoothing={0.9}
            mipmapBlur={true}
          />

          {/* Enhanced vignette for tunnel vision effect */}
          <Vignette
            offset={effectParams.vignetteOffset}
            darkness={effectParams.vignetteDarkness}
            blendFunction={BlendFunction.NORMAL}
          />
        </EffectComposer>
      )}
    </>
  );
}

export default WarpEffect;
