/**
 * ClusterNode Component
 *
 * Renders a cluster of memory nodes as a single meta-node
 * that can be expanded to show individual nodes.
 *
 * Requirements: 11.3
 */

import { Billboard, Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Cluster } from '../../utils/clustering';
import { getSectorColor } from '../../utils/visualization';

// ============================================================================
// Constants
// ============================================================================

/** Base size for cluster nodes */
const BASE_CLUSTER_SIZE = 1.5;

/** Size multiplier based on node count */
const SIZE_PER_NODE = 0.02;

/** Maximum cluster size */
const MAX_CLUSTER_SIZE = 4;

/** Hover scale multiplier */
const HOVER_SCALE = 1.15;

/** Rotation speed for cluster animation */
const ROTATION_SPEED = 0.3;

/** Number of ring segments */
const RING_SEGMENTS = 64;

/** Label font size */
const LABEL_FONT_SIZE = 0.2;

// ============================================================================
// Types
// ============================================================================

export interface ClusterNodeProps {
  /** Cluster data */
  cluster: Cluster;
  /** Whether to use high contrast colors */
  highContrast?: boolean;
  /** Whether reduced motion is preferred */
  reducedMotion?: boolean;
  /** Click handler */
  onClick: (clusterId: string) => void;
  /** Hover state change handler */
  onHover: (clusterId: string | null) => void;
  /** Whether this cluster is hovered */
  isHovered?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate cluster size based on node count
 */
function calculateClusterSize(nodeCount: number): number {
  const size = BASE_CLUSTER_SIZE + nodeCount * SIZE_PER_NODE;
  return Math.min(size, MAX_CLUSTER_SIZE);
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ClusterRingsProps {
  size: number;
  color: string;
  isHovered: boolean;
  reducedMotion: boolean;
}

/**
 * Animated rings around the cluster
 */
function ClusterRings({
  size,
  color,
  isHovered,
  reducedMotion,
}: ClusterRingsProps): React.ReactElement {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (reducedMotion) return;

    const time = state.clock.elapsedTime * ROTATION_SPEED;
    const speed = isHovered ? 2 : 1;

    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = time * speed;
      ring1Ref.current.rotation.y = time * 0.5 * speed;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = time * speed;
      ring2Ref.current.rotation.z = time * 0.3 * speed;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z = time * speed;
      ring3Ref.current.rotation.x = time * 0.7 * speed;
    }
  });

  const ringOpacity = isHovered ? 0.6 : 0.4;

  return (
    <>
      <mesh ref={ring1Ref}>
        <ringGeometry args={[size * 1.2, size * 1.25, RING_SEGMENTS]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={ringOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={ring2Ref}>
        <ringGeometry args={[size * 1.35, size * 1.4, RING_SEGMENTS]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={ringOpacity * 0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={ring3Ref}>
        <ringGeometry args={[size * 1.5, size * 1.55, RING_SEGMENTS]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={ringOpacity * 0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

interface ClusterLabelProps {
  nodeCount: number;
  size: number;
}

/**
 * Label showing node count
 */
function ClusterLabel({ nodeCount, size }: ClusterLabelProps): React.ReactElement {
  return (
    <Billboard position={[0, size + 0.5, 0]} follow>
      <Text
        fontSize={LABEL_FONT_SIZE}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {`${String(nodeCount)} memories`}
      </Text>
    </Billboard>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ClusterNode({
  cluster,
  highContrast = false,
  reducedMotion = false,
  onClick,
  onHover,
  isHovered = false,
}: ClusterNodeProps): React.ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Local hover state
  const [localHovered, setLocalHovered] = useState(false);

  // Calculate visual properties
  const size = useMemo(() => calculateClusterSize(cluster.nodes.length), [cluster.nodes.length]);
  const color = useMemo(
    () => getSectorColor(cluster.dominantSector, highContrast),
    [cluster.dominantSector, highContrast]
  );

  // Effective hover state
  const effectiveHovered = isHovered || localHovered;

  // Target scale
  const targetScale = effectiveHovered ? HOVER_SCALE : 1;

  // Animation
  useFrame(() => {
    if (!groupRef.current) return;

    // Smooth scale interpolation
    const currentScale = groupRef.current.scale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
    groupRef.current.scale.setScalar(newScale);
  });

  // Event handlers
  const handlePointerOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setLocalHovered(true);
      onHover(cluster.id);
      document.body.style.cursor = 'pointer';
    },
    [cluster.id, onHover]
  );

  const handlePointerOut = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setLocalHovered(false);
      onHover(null);
      document.body.style.cursor = 'auto';
    },
    [onHover]
  );

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      onClick(cluster.id);
    },
    [cluster.id, onClick]
  );

  // Emissive intensity based on state
  const emissiveIntensity = effectiveHovered ? 0.6 : 0.4;

  return (
    <group ref={groupRef} position={cluster.centroid} name={`cluster-node-${cluster.id}`}>
      {/* Animated rings */}
      <ClusterRings
        size={size}
        color={color}
        isHovered={effectiveHovered}
        reducedMotion={reducedMotion}
      />

      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={0.8}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[size * 0.8, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* Node count label */}
      <ClusterLabel nodeCount={cluster.nodes.length} size={size} />
    </group>
  );
}

export default ClusterNode;
