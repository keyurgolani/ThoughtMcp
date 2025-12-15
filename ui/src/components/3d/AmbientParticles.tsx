/**
 * AmbientParticles Component
 *
 * Creates an enhanced ambient particle system for atmospheric effects in the 3D scene.
 * Features denser particles, subtle color variation (cyan/purple/white), and gentle
 * floating animation to create an ethereal, cosmic atmosphere.
 *
 * Requirements: 1.7
 */

import { useFrame } from '@react-three/fiber';
import type { ParticleSystemConfig } from '@types';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../utils/accessibility';

// ============================================================================
// Types
// ============================================================================

export interface AmbientParticlesProps {
  /** Particle system configuration */
  config?: Partial<ParticleSystemConfig>;
  /** Enable color variation (cyan, purple, white) */
  colorVariation?: boolean;
  /** Density multiplier (1 = default, 2 = double particles) */
  density?: number;
}

// ============================================================================
// Default Configuration - Enhanced for denser atmosphere
// ============================================================================

const DEFAULT_CONFIG: ParticleSystemConfig = {
  count: 1200, // Increased from 500 for denser atmosphere
  size: 0.04, // Slightly smaller for more subtle effect
  color: '#ffffff',
  opacity: 0.35,
  spread: 60, // Larger spread for more immersive feel
  speed: 0.08, // Slightly slower for gentler motion
};

// Color palette for variation (cyan, purple, white tints)
const PARTICLE_COLORS = [
  new THREE.Color('#00FFFF'), // Cyan
  new THREE.Color('#00CCCC'), // Muted cyan
  new THREE.Color('#9B59B6'), // Purple
  new THREE.Color('#7D4A94'), // Muted purple
  new THREE.Color('#FFFFFF'), // White
  new THREE.Color('#E0E0FF'), // Light blue-white
  new THREE.Color('#FFE0FF'), // Light pink-white
];

// ============================================================================
// Component
// ============================================================================

export function AmbientParticles({
  config = {},
  colorVariation = true,
  density = 1,
}: AmbientParticlesProps): React.ReactElement {
  const pointsRef = useRef<THREE.Points>(null);
  const reducedMotion = prefersReducedMotion();
  const timeRef = useRef(0);

  // Merge config with defaults and apply density multiplier
  const particleConfig = useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      ...config,
      count: Math.floor((config.count ?? DEFAULT_CONFIG.count) * density),
    }),
    [config, density]
  );

  // Generate particle positions, velocities, colors, and phase offsets
  const { positions, velocities, colors, phases, sizes } = useMemo(() => {
    const posArray = new Float32Array(particleConfig.count * 3);
    const velArray = new Float32Array(particleConfig.count * 3);
    const colorArray = new Float32Array(particleConfig.count * 3);
    const phaseArray = new Float32Array(particleConfig.count);
    const sizeArray = new Float32Array(particleConfig.count);

    for (let i = 0; i < particleConfig.count; i++) {
      const i3 = i * 3;

      // Random position within spread radius (spherical distribution for more natural look)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = Math.random() * particleConfig.spread * 0.5;

      posArray[i3] = radius * Math.sin(phi) * Math.cos(theta);
      posArray[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      posArray[i3 + 2] = radius * Math.cos(phi);

      // Random velocity for gentle floating motion with slight upward bias
      velArray[i3] = (Math.random() - 0.5) * 0.015;
      velArray[i3 + 1] = (Math.random() - 0.3) * 0.015; // Slight upward bias
      velArray[i3 + 2] = (Math.random() - 0.5) * 0.015;

      // Color variation
      if (colorVariation) {
        const colorIndex = Math.floor(Math.random() * PARTICLE_COLORS.length);
        const color = PARTICLE_COLORS[colorIndex] ?? new THREE.Color('#FFFFFF');
        colorArray[i3] = color.r;
        colorArray[i3 + 1] = color.g;
        colorArray[i3 + 2] = color.b;
      } else {
        colorArray[i3] = 1;
        colorArray[i3 + 1] = 1;
        colorArray[i3 + 2] = 1;
      }

      // Random phase offset for varied animation timing
      phaseArray[i] = Math.random() * Math.PI * 2;

      // Varied sizes for depth perception
      sizeArray[i] = particleConfig.size * (0.5 + Math.random() * 1.0);
    }

    return {
      positions: posArray,
      velocities: velArray,
      colors: colorArray,
      phases: phaseArray,
      sizes: sizeArray,
    };
  }, [particleConfig.count, particleConfig.spread, particleConfig.size, colorVariation]);

  // Animate particles with gentle floating motion
  useFrame((_, delta) => {
    if (!pointsRef.current || reducedMotion) return;

    timeRef.current += delta;
    const time = timeRef.current;

    const positionAttribute = pointsRef.current.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const posArray = positionAttribute.array as Float32Array;
    const halfSpread = particleConfig.spread / 2;

    for (let i = 0; i < particleConfig.count; i++) {
      const i3 = i * 3;
      const velX = velocities[i3];
      const velY = velocities[i3 + 1];
      const velZ = velocities[i3 + 2];
      const phase = phases[i] ?? 0;

      // Skip if velocity values are undefined
      if (velX === undefined || velY === undefined || velZ === undefined) continue;

      // Update position based on velocity
      const currentX = posArray[i3] ?? 0;
      const currentY = posArray[i3 + 1] ?? 0;
      const currentZ = posArray[i3 + 2] ?? 0;

      // Add gentle sinusoidal floating motion for more organic feel
      const floatX = Math.sin(time * 0.3 + phase) * 0.02;
      const floatY = Math.sin(time * 0.2 + phase * 1.3) * 0.03;
      const floatZ = Math.cos(time * 0.25 + phase * 0.7) * 0.02;

      let newX = currentX + (velX + floatX) * particleConfig.speed * delta * 60;
      let newY = currentY + (velY + floatY) * particleConfig.speed * delta * 60;
      let newZ = currentZ + (velZ + floatZ) * particleConfig.speed * delta * 60;

      // Wrap around when particles go out of bounds
      if (newX > halfSpread) newX = -halfSpread;
      if (newX < -halfSpread) newX = halfSpread;
      if (newY > halfSpread) newY = -halfSpread;
      if (newY < -halfSpread) newY = halfSpread;
      if (newZ > halfSpread) newZ = -halfSpread;
      if (newZ < -halfSpread) newZ = halfSpread;

      posArray[i3] = newX;
      posArray[i3 + 1] = newY;
      posArray[i3 + 2] = newZ;
    }

    positionAttribute.needsUpdate = true;
  });

  return (
    <points
      ref={pointsRef}
      renderOrder={-70} // Render after stars but before scene objects (Requirement 51.3, 51.4)
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleConfig.count}
          array={positions}
          itemSize={3}
        />
        {colorVariation && (
          <bufferAttribute
            attach="attributes-color"
            count={particleConfig.count}
            array={colors}
            itemSize={3}
          />
        )}
        <bufferAttribute
          attach="attributes-size"
          count={particleConfig.count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={particleConfig.size}
        color={colorVariation ? '#ffffff' : particleConfig.color}
        vertexColors={colorVariation}
        transparent
        opacity={particleConfig.opacity}
        sizeAttenuation
        depthWrite={false}
        depthTest={true} // Keep depth test for particles to properly occlude (Requirement 51.5)
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default AmbientParticles;
