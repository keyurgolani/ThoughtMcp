/**
 * LODMemoryNode Component
 *
 * Level-of-Detail aware memory node that simplifies geometry
 * based on distance from camera for performance optimization.
 *
 * Requirements: 11.1
 */

import { Billboard, Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import type { MemoryNodeDisplayProps } from '@types';
import { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { calculateLODLevel, DEFAULT_LOD_LEVELS, type LODLevel } from '../../utils/performance';
import { calculateNodeOpacity, calculateNodeSize, getSectorColor } from '../../utils/visualization';

// ============================================================================
// Constants
// ============================================================================

/** Glow layer scale multiplier */
const GLOW_SCALE = 1.3;

/** Current node golden glow color */
const CURRENT_NODE_GLOW_COLOR = '#FFD700';

/** Hover scale multiplier (20% increase per Requirements 2.6) */
const HOVER_SCALE = 1.2;

/** Hover glow intensity multiplier */
const HOVER_GLOW_INTENSITY = 1.5;

/** Pulsing animation speed */
const PULSE_SPEED = 2;

/** Pulsing animation amplitude */
const PULSE_AMPLITUDE = 0.1;

/** Label offset from node center */
const LABEL_OFFSET_Y = 1.2;

/** Maximum label length before truncation */
const MAX_LABEL_LENGTH = 30;

/** Label font size */
const LABEL_FONT_SIZE = 0.15;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Truncates content for label display
 */
function truncateForLabel(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// Sub-Components
// ============================================================================

interface GlowSphereProps {
  size: number;
  color: string;
  opacity: number;
  glowIntensity: number;
  segments: number;
}

/**
 * Inner glow sphere with emissive material
 */
function GlowSphere({
  size,
  color,
  opacity,
  glowIntensity,
  segments,
}: GlowSphereProps): React.ReactElement {
  return (
    <mesh>
      <sphereGeometry args={[size * GLOW_SCALE, segments / 2, segments / 2]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity * 0.3 * glowIntensity}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

interface NodeLabelProps {
  content: string;
  size: number;
  visible: boolean;
}

/**
 * Billboard text label that always faces the camera
 */
function NodeLabel({ content, size, visible }: NodeLabelProps): React.ReactElement | null {
  if (!visible) {
    return null;
  }

  const labelText = truncateForLabel(content, MAX_LABEL_LENGTH);

  return (
    <Billboard position={[0, size + LABEL_OFFSET_Y * size, 0]} follow lockX={false} lockY={false}>
      <Text
        fontSize={LABEL_FONT_SIZE * (size + 0.5)}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {labelText}
      </Text>
    </Billboard>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export interface LODMemoryNodeProps extends MemoryNodeDisplayProps {
  /** Whether to show the label */
  showLabel?: boolean;
  /** Whether to use high contrast colors */
  highContrast?: boolean;
  /** Whether reduced motion is preferred */
  reducedMotion?: boolean;
  /** Custom LOD levels */
  lodLevels?: LODLevel[];
  /** Camera position for LOD calculation */
  cameraPosition?: [number, number, number];
}

export function LODMemoryNode({
  id,
  content,
  contentPreview,
  primarySector,
  salience,
  strength,
  position,
  isCurrent,
  isHovered,
  onClick,
  onHover,
  showLabel = true,
  highContrast = false,
  reducedMotion = false,
  lodLevels = DEFAULT_LOD_LEVELS,
}: LODMemoryNodeProps): React.ReactElement {
  // Get initial LOD level safely - DEFAULT_LOD_LEVELS always has at least one element
  const defaultLOD: LODLevel = {
    maxDistance: 10,
    segments: 32,
    showLabel: true,
    showGlow: true,
    opacityMultiplier: 1.0,
  };
  const initialLOD: LODLevel = lodLevels[0] ?? DEFAULT_LOD_LEVELS[0] ?? defaultLOD;

  // Refs for animation and LOD
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const currentLODRef = useRef<LODLevel>(initialLOD);

  // Local hover state for pointer events
  const [localHovered, setLocalHovered] = useState(false);
  const [currentLOD, setCurrentLOD] = useState<LODLevel>(initialLOD);

  // Calculate visual properties
  const baseSize = useMemo(() => calculateNodeSize(salience), [salience]);
  const baseOpacity = useMemo(() => calculateNodeOpacity(strength), [strength]);
  const sectorColor = useMemo(
    () => getSectorColor(primarySector, highContrast),
    [primarySector, highContrast]
  );

  // Determine effective hover state
  const effectiveHovered = isHovered || localHovered;

  // Calculate current scale (with hover effect)
  const targetScale = effectiveHovered ? HOVER_SCALE : 1;

  // Calculate glow intensity
  const glowIntensity = effectiveHovered ? HOVER_GLOW_INTENSITY : 1;

  // Animation frame for pulsing effect and LOD updates
  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return;

    // Calculate distance from camera for LOD
    const cameraPos = state.camera.position;
    const nodePos = groupRef.current.position;
    const distance = cameraPos.distanceTo(nodePos);

    // Update LOD level based on distance
    const newLOD = calculateLODLevel(distance, lodLevels);
    if (newLOD !== currentLODRef.current) {
      currentLODRef.current = newLOD;
      setCurrentLOD(newLOD);
    }

    // Apply hover scale with smooth interpolation
    const currentScale = groupRef.current.scale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
    groupRef.current.scale.setScalar(newScale);

    // Pulsing animation for current node (Requirements 2.5)
    if (isCurrent && !reducedMotion) {
      const pulse = Math.sin(state.clock.elapsedTime * PULSE_SPEED) * PULSE_AMPLITUDE;
      meshRef.current.scale.setScalar(1 + pulse);
    } else {
      meshRef.current.scale.setScalar(1);
    }
  });

  // Event handlers
  const handlePointerOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setLocalHovered(true);
      onHover(true);
      document.body.style.cursor = 'pointer';
    },
    [onHover]
  );

  const handlePointerOut = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setLocalHovered(false);
      onHover(false);
      document.body.style.cursor = 'auto';
    },
    [onHover]
  );

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      onClick();
    },
    [onClick]
  );

  // Determine the display color (golden for current node)
  const displayColor = isCurrent ? CURRENT_NODE_GLOW_COLOR : sectorColor;

  // Emissive intensity based on state
  const emissiveIntensity = isCurrent ? 0.8 : effectiveHovered ? 0.5 : 0.3;

  // Apply LOD opacity multiplier
  const finalOpacity = baseOpacity * currentLOD.opacityMultiplier;

  // Determine if label should be shown based on LOD
  const shouldShowLabel = showLabel && currentLOD.showLabel;

  // Determine if glow should be shown based on LOD
  const shouldShowGlow = currentLOD.showGlow;

  return (
    <group ref={groupRef} position={position} name={`lod-memory-node-${id}`}>
      {/* Outer glow layer (only at high LOD) */}
      {shouldShowGlow && (
        <GlowSphere
          size={baseSize}
          color={displayColor}
          opacity={finalOpacity}
          glowIntensity={glowIntensity}
          segments={currentLOD.segments}
        />
      )}

      {/* Main sphere mesh with LOD-based segments */}
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[baseSize, currentLOD.segments, currentLOD.segments]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={finalOpacity}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Current node additional glow ring (Requirements 2.5) */}
      {isCurrent && shouldShowGlow && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseSize * 1.4, baseSize * 1.6, currentLOD.segments * 2]} />
          <meshBasicMaterial
            color={CURRENT_NODE_GLOW_COLOR}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Billboard text label (only at high LOD) */}
      <NodeLabel content={contentPreview || content} size={baseSize} visible={shouldShowLabel} />
    </group>
  );
}

export default LODMemoryNode;
