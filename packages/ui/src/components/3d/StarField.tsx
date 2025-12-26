/**
 * StarField Component
 *
 * Creates a distant star field background layer with subtle parallax effect
 * for enhanced cosmic atmosphere.
 *
 * Requirements: 34.3, 1.7, 51.3
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../utils/accessibility';

// ============================================================================
// Constants
// ============================================================================

/** Number of stars in the field */
const STAR_COUNT = 2000;

/** Radius of the star field sphere - slightly larger than nebula to prevent z-fighting (Requirement 51.3) */
const STAR_FIELD_RADIUS = 195;

/** Base star size */
const STAR_SIZE = 0.08;

/** Star twinkle speed */
const TWINKLE_SPEED = 0.5;

/** Parallax effect intensity */
const PARALLAX_INTENSITY = 0.02;

// Star colors (white to blue-white spectrum)
const STAR_COLORS = [
  new THREE.Color('#FFFFFF'), // Pure white
  new THREE.Color('#F0F0FF'), // Slight blue
  new THREE.Color('#E0E8FF'), // Light blue
  new THREE.Color('#D0E0FF'), // Blue-white
  new THREE.Color('#FFE8E0'), // Warm white
  new THREE.Color('#FFF0E0'), // Yellow-white
];

// ============================================================================
// Types
// ============================================================================

export interface StarFieldProps {
  /** Enable twinkle animation */
  enableTwinkle?: boolean;
  /** Enable parallax effect based on camera movement */
  enableParallax?: boolean;
  /** Star density multiplier */
  density?: number;
}

// ============================================================================
// Component
// ============================================================================

export function StarField({
  enableTwinkle = true,
  enableParallax = true,
  density = 1,
}: StarFieldProps): React.ReactElement {
  const pointsRef = useRef<THREE.Points>(null);
  const reducedMotion = prefersReducedMotion();
  const lastCameraPos = useRef(new THREE.Vector3());

  const starCount = Math.floor(STAR_COUNT * density);

  // Generate star positions and properties
  // Note: sizes and twinklePhases are generated but not currently used for per-particle effects
  // They're kept for future enhancements like individual star twinkle
  const { positions, colors } = useMemo(() => {
    const posArray = new Float32Array(starCount * 3);
    const colorArray = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      // Distribute stars on a sphere surface
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      posArray[i3] = STAR_FIELD_RADIUS * Math.sin(phi) * Math.cos(theta);
      posArray[i3 + 1] = STAR_FIELD_RADIUS * Math.sin(phi) * Math.sin(theta);
      posArray[i3 + 2] = STAR_FIELD_RADIUS * Math.cos(phi);

      // Random star color
      const colorIndex = Math.floor(Math.random() * STAR_COLORS.length);
      const color = STAR_COLORS[colorIndex] ?? new THREE.Color('#FFFFFF');
      colorArray[i3] = color.r;
      colorArray[i3 + 1] = color.g;
      colorArray[i3 + 2] = color.b;
    }

    return {
      positions: posArray,
      colors: colorArray,
    };
  }, [starCount]);

  // Animate twinkle and parallax
  useFrame((state) => {
    if (!pointsRef.current || reducedMotion) return;

    const time = state.clock.elapsedTime;

    // Twinkle effect - modulate opacity
    if (enableTwinkle) {
      const material = pointsRef.current.material as THREE.PointsMaterial;
      // Subtle global twinkle
      material.opacity = 0.7 + Math.sin(time * TWINKLE_SPEED) * 0.1;
    }

    // Parallax effect - subtle rotation based on camera movement
    if (enableParallax) {
      const camera = state.camera;
      const cameraDelta = camera.position.clone().sub(lastCameraPos.current);

      // Apply subtle rotation based on camera movement
      pointsRef.current.rotation.y += cameraDelta.x * PARALLAX_INTENSITY;
      pointsRef.current.rotation.x += cameraDelta.y * PARALLAX_INTENSITY;

      lastCameraPos.current.copy(camera.position);
    }
  });

  return (
    <points
      ref={pointsRef}
      renderOrder={-80} // Render after nebula but before particles (Requirement 51.3, 51.4)
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={starCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute attach="attributes-color" count={starCount} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={STAR_SIZE}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation={false}
        depthWrite={false}
        depthTest={false} // Disable depth test to prevent z-fighting (Requirement 51.3)
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default StarField;
