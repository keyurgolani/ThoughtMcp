/**
 * MemoryNode3D Component
 *
 * Renders a memory node as a 3D sphere with glow effect, color based on sector type,
 * size based on salience, and opacity based on strength.
 *
 * Requirements: 2.1-2.7
 */

import { Billboard, Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import type { MemoryNodeDisplayProps } from '@types';
import { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { calculateNodeOpacity, calculateNodeSize, getSectorColor } from '../../utils/visualization';

// ============================================================================
// Constants
// ============================================================================

/** Base sphere segments for geometry */
const SPHERE_SEGMENTS = 32;

/** Current node accent color - refined, professional */
const CURRENT_NODE_ACCENT_COLOR = '#E8B86D';

/** Hover scale multiplier (20% increase per Requirements 2.6) */
const HOVER_SCALE = 1.2;

/** Scale multiplier for current/selected node */
const CURRENT_NODE_SCALE = 1.3;

/** Scale multiplier for non-selected nodes (half size) */
const NON_SELECTED_SCALE = 0.5;

/** Pulsing animation speed - subtle */
const PULSE_SPEED = 1.5;

/** Pulsing animation amplitude - very subtle */
const PULSE_AMPLITUDE = 0.03;

/** Label offset from node center */
const LABEL_OFFSET_Y = 1.2;

/** Maximum label length before truncation */
const MAX_LABEL_LENGTH = 30;

/** Label font size - increased for better readability (Requirements 2.7) */
const LABEL_FONT_SIZE = 0.22;

/** Label background padding */
const LABEL_BACKGROUND_PADDING = 0.08;

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

interface NodeLabelProps {
  content: string;
  size: number;
  visible: boolean;
}

/**
 * Billboard text label that always faces the camera with background for contrast
 * Requirements: 2.7
 */
function NodeLabel({ content, size, visible }: NodeLabelProps): React.ReactElement | null {
  if (!visible) {
    return null;
  }

  const labelText = truncateForLabel(content, MAX_LABEL_LENGTH);
  const fontSize = LABEL_FONT_SIZE * (size + 0.5);

  // Calculate approximate background dimensions based on text length
  const textWidth = labelText.length * fontSize * 0.5;
  const textHeight = fontSize * 1.2;
  const bgWidth = textWidth + LABEL_BACKGROUND_PADDING * 2;
  const bgHeight = textHeight + LABEL_BACKGROUND_PADDING * 2;

  return (
    <Billboard position={[0, size + LABEL_OFFSET_Y * size, 0]} follow lockX={false} lockY={false}>
      {/* Background plane for contrast */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[bgWidth, bgHeight]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.75} depthWrite={false} />
      </mesh>
      {/* Text label */}
      <Text
        fontSize={fontSize}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
        maxWidth={3}
      >
        {labelText}
      </Text>
    </Billboard>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export interface MemoryNode3DProps extends MemoryNodeDisplayProps {
  /** Whether to show the label */
  showLabel?: boolean;
  /** Whether to use high contrast colors */
  highContrast?: boolean;
  /** Whether reduced motion is preferred */
  reducedMotion?: boolean;
  /** Whether this node is highlighted (e.g., from tag hover) (Requirement: 42.6) */
  isHighlighted?: boolean;
  /** Whether light mode is active (for color visibility) */
  lightMode?: boolean;
}

export function MemoryNode3D({
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
  isHighlighted = false,
  lightMode = false,
}: MemoryNode3DProps): React.ReactElement {
  // Refs for animation
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Local hover state for pointer events
  const [localHovered, setLocalHovered] = useState(false);

  // Calculate visual properties
  const baseSize = useMemo(() => calculateNodeSize(salience), [salience]);
  const baseOpacity = useMemo(() => calculateNodeOpacity(strength), [strength]);
  const sectorColor = useMemo(
    () => getSectorColor(primarySector, highContrast, lightMode),
    [primarySector, highContrast, lightMode]
  );

  // Determine effective hover state
  const effectiveHovered = isHovered || localHovered;

  // Calculate base scale based on selection state
  // Selected (current) nodes are slightly larger, non-selected are half size
  const selectionScale = isCurrent ? CURRENT_NODE_SCALE : NON_SELECTED_SCALE;

  // Calculate current scale (with hover and highlight effects) (Requirement: 42.6)
  const targetScale = effectiveHovered
    ? selectionScale * HOVER_SCALE
    : isHighlighted
      ? selectionScale * 1.1
      : selectionScale;

  // Animation frame for pulsing effect (current node only)
  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return;

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
      console.log('MemoryNode3D clicked:', id);
      onClick();
    },
    [onClick, id]
  );

  // Determine the display color (accent for current node)
  const displayColor = isCurrent ? CURRENT_NODE_ACCENT_COLOR : sectorColor;

  // Emissive intensity - much higher in light mode for bold visibility
  const baseEmissive = lightMode ? 0.8 : 0.15;
  const emissiveIntensity = isCurrent
    ? lightMode
      ? 1.2
      : 0.4
    : effectiveHovered
      ? lightMode
        ? 1.0
        : 0.3
      : isHighlighted
        ? lightMode
          ? 0.9
          : 0.25
        : baseEmissive;

  return (
    <group ref={groupRef} position={position} name={`memory-node-${id}`}>
      {/* Main sphere mesh - clean, professional appearance */}
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[baseSize, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={lightMode ? 1.0 : baseOpacity}
          roughness={lightMode ? 0.2 : 0.6}
          metalness={lightMode ? 0.5 : 0.2}
        />
      </mesh>

      {/* Subtle selection indicator for current node - thin ring */}
      {isCurrent && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseSize * 1.15, baseSize * 1.18, 64]} />
          <meshBasicMaterial
            color={CURRENT_NODE_ACCENT_COLOR}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Subtle highlight indicator for tag hover (Requirement: 42.6) */}
      {isHighlighted && !isCurrent && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseSize * 1.12, baseSize * 1.15, 64]} />
          <meshBasicMaterial color="#6BA3BE" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Billboard text label (Requirements 2.7) */}
      <NodeLabel content={contentPreview || content} size={baseSize} visible={showLabel} />
    </group>
  );
}

export default MemoryNode3D;
