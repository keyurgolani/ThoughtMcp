/**
 * ConnectionBadge3D Component
 *
 * Displays a badge showing connection count on 3D memory nodes.
 * Positioned above the node to indicate how many connections it has.
 *
 * Requirements: 39.1
 */

import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

// ============================================================================
// Constants
// ============================================================================

/** Badge offset above the node */
const BADGE_OFFSET_Y = 0.8;

/** Badge circle radius */
const BADGE_RADIUS = 0.25;

/** Badge font size */
const BADGE_FONT_SIZE = 0.2;

/** Hub threshold - nodes with more connections are considered hubs */
const HUB_THRESHOLD = 5;

/** Badge background color for normal nodes */
const BADGE_COLOR_NORMAL = '#00FFFF';

/** Badge background color for hub nodes */
const BADGE_COLOR_HUB = '#FFD700';

/** Badge text color */
const BADGE_TEXT_COLOR = '#000000';

/** Glow intensity for hub badges */
const HUB_GLOW_INTENSITY = 0.5;

/** Pulse animation speed for hub badges */
const HUB_PULSE_SPEED = 2;

/** Pulse animation amplitude */
const HUB_PULSE_AMPLITUDE = 0.1;

// ============================================================================
// Types
// ============================================================================

export interface ConnectionBadge3DProps {
  /** Number of connections this node has */
  connectionCount: number;
  /** Position of the node in 3D space */
  position: [number, number, number];
  /** Whether this node is a hub (>5 connections) */
  isHub: boolean;
  /** Callback when badge is hovered */
  onHover: (hovered: boolean) => void;
  /** Node size to calculate badge offset */
  nodeSize?: number;
  /** Whether reduced motion is preferred */
  reducedMotion?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Determines if a node should be considered a hub based on connection count.
 *
 * @param connectionCount - Number of connections the node has
 * @returns True if the node is a hub (>5 connections)
 *
 * Requirements: 39.2
 */
export function isHubNode(connectionCount: number): boolean {
  return connectionCount > HUB_THRESHOLD;
}

/**
 * Gets the hub threshold value.
 *
 * @returns The number of connections required to be considered a hub
 */
export function getHubThreshold(): number {
  return HUB_THRESHOLD;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ConnectionBadge3D Component
 *
 * Displays a small badge showing the total connection count on 3D nodes.
 * Hub nodes (>5 connections) get special visual treatment with golden color
 * and pulsing animation.
 *
 * Requirements: 39.1
 */
export function ConnectionBadge3D({
  connectionCount,
  position,
  isHub,
  onHover,
  nodeSize = 0.5,
  reducedMotion = false,
}: ConnectionBadge3DProps): React.ReactElement | null {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Calculate badge position above the node
  const badgePosition = useMemo((): [number, number, number] => {
    return [position[0], position[1] + nodeSize + BADGE_OFFSET_Y, position[2]];
  }, [position, nodeSize]);

  // Determine badge color based on hub status
  const badgeColor = isHub ? BADGE_COLOR_HUB : BADGE_COLOR_NORMAL;

  // Format connection count for display
  const displayCount = connectionCount > 99 ? '99+' : String(connectionCount);

  // Pulse animation for hub badges
  useFrame((state) => {
    // Skip animation if no connections, reduced motion, or not a hub
    if (connectionCount <= 0 || !groupRef.current || reducedMotion || !isHub) return;

    const pulse = Math.sin(state.clock.elapsedTime * HUB_PULSE_SPEED) * HUB_PULSE_AMPLITUDE;
    groupRef.current.scale.setScalar(1 + pulse);

    // Animate glow opacity
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = HUB_GLOW_INTENSITY * 0.3 * (1 + pulse * 2);
    }
  });

  // Don't render badge if no connections
  if (connectionCount <= 0) {
    return null;
  }

  return (
    <group ref={groupRef} position={badgePosition}>
      <Billboard follow lockX={false} lockY={false}>
        {/* Glow effect for hub nodes */}
        {isHub && (
          <mesh ref={glowRef} position={[0, 0, -0.02]}>
            <circleGeometry args={[BADGE_RADIUS * 1.5, 32]} />
            <meshBasicMaterial
              color={badgeColor}
              transparent
              opacity={HUB_GLOW_INTENSITY * 0.3}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Badge background circle */}
        <mesh
          onPointerOver={(e): void => {
            e.stopPropagation();
            onHover(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={(e): void => {
            e.stopPropagation();
            onHover(false);
            document.body.style.cursor = 'auto';
          }}
        >
          <circleGeometry args={[BADGE_RADIUS, 32]} />
          <meshBasicMaterial color={badgeColor} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>

        {/* Connection count text */}
        <Text
          position={[0, 0, 0.01]}
          fontSize={BADGE_FONT_SIZE}
          color={BADGE_TEXT_COLOR}
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {displayCount}
        </Text>
      </Billboard>
    </group>
  );
}

export default ConnectionBadge3D;
