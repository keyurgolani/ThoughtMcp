/**
 * NebulaBg Component
 *
 * Creates an animated nebula/galaxy background texture with subtle movement
 * for enhanced cosmic atmosphere.
 *
 * Requirements: 34.3, 51.3
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../utils/accessibility';

// ============================================================================
// Constants
// ============================================================================

/** Nebula sphere radius - increased to prevent z-fighting with other background elements (Requirement 51.3) */
const NEBULA_RADIUS = 190;

/** Number of nebula cloud layers */
const CLOUD_LAYERS = 3;

/** Rotation speed for nebula animation */
const ROTATION_SPEED = 0.01;

// Nebula colors (deep space purples and blues)
const NEBULA_COLORS = {
  primary: new THREE.Color('#1a0a2e'), // Deep purple
  secondary: new THREE.Color('#0a1628'), // Deep blue
  accent1: new THREE.Color('#2d1b4e'), // Purple
  accent2: new THREE.Color('#0f2847'), // Blue
  glow: new THREE.Color('#3d1a5c'), // Bright purple
};

// ============================================================================
// Types
// ============================================================================

export interface NebulaBgProps {
  /** Enable animation */
  enableAnimation?: boolean;
  /** Opacity of the nebula */
  opacity?: number;
}

// ============================================================================
// Component
// ============================================================================

export function NebulaBg({
  enableAnimation = true,
  opacity = 0.4,
}: NebulaBgProps): React.ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const reducedMotion = prefersReducedMotion();

  // Create nebula cloud meshes
  const cloudMeshes = useMemo(() => {
    const meshes: React.ReactElement[] = [];

    for (let layer = 0; layer < CLOUD_LAYERS; layer++) {
      const layerRadius = NEBULA_RADIUS - layer * 10;
      const layerOpacity = opacity * (1 - layer * 0.2);

      // Determine color based on layer
      const color =
        layer === 0
          ? NEBULA_COLORS.primary
          : layer === 1
            ? NEBULA_COLORS.secondary
            : NEBULA_COLORS.accent1;

      meshes.push(
        <mesh
          key={`nebula-layer-${String(layer)}`}
          rotation={[layer * 0.3, layer * 0.5, 0]}
          renderOrder={-100 + layer} // Ensure background renders first (Requirement 51.3, 51.4)
        >
          <sphereGeometry args={[layerRadius, 32, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={layerOpacity}
            side={THREE.BackSide}
            depthWrite={false}
            depthTest={false} // Disable depth test to prevent z-fighting (Requirement 51.3)
          />
        </mesh>
      );
    }

    // Add glow spots for nebula highlights
    const glowSpots = [
      { position: [50, 30, -150] as [number, number, number], scale: 40 },
      { position: [-60, -40, -140] as [number, number, number], scale: 35 },
      { position: [30, -50, -160] as [number, number, number], scale: 30 },
      { position: [-40, 60, -145] as [number, number, number], scale: 25 },
    ];

    glowSpots.forEach((spot, index) => {
      meshes.push(
        <mesh
          key={`glow-spot-${String(index)}`}
          position={spot.position}
          renderOrder={-90 + index} // Render after nebula layers but before other elements (Requirement 51.3, 51.4)
        >
          <sphereGeometry args={[spot.scale, 16, 16]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? NEBULA_COLORS.glow : NEBULA_COLORS.accent2}
            transparent
            opacity={opacity * 0.3}
            depthWrite={false}
            depthTest={false} // Disable depth test to prevent z-fighting (Requirement 51.3)
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      );
    });

    return meshes;
  }, [opacity]);

  // Animate nebula rotation
  useFrame((_, delta) => {
    if (!groupRef.current || reducedMotion || !enableAnimation) return;

    // Very slow rotation for subtle movement
    groupRef.current.rotation.y += ROTATION_SPEED * delta;
    groupRef.current.rotation.x += ROTATION_SPEED * 0.3 * delta;
  });

  return <group ref={groupRef}>{cloudMeshes}</group>;
}

export default NebulaBg;
