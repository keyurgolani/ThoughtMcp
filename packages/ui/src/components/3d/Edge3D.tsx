/**
 * Edge3D Component
 *
 * Renders a connection between memory nodes as a luminous tube with
 * flowing particle animation and hover state with label.
 *
 * Requirements: 3.1-3.6
 */

import { Billboard, Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import type { EdgeDisplayProps, LinkType } from '@types';
import { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  calculateHubEdgeThickness,
  getHubEdgeEmissiveMultiplier,
  getHubEdgeGlowMultiplier,
  getLinkTypeColor,
} from '../../utils/visualization';

// ============================================================================
// Constants
// ============================================================================

/** Number of segments for tube geometry */
const TUBE_SEGMENTS = 32;

/** Number of radial segments for tube geometry */
const TUBE_RADIAL_SEGMENTS = 8;

/** Hover brightness multiplier */
const HOVER_BRIGHTNESS = 1.5;

/** Base emissive intensity - increased for better bloom visibility */
const BASE_EMISSIVE_INTENSITY = 0.8;

/** Hover emissive intensity - increased for better bloom visibility */
const HOVER_EMISSIVE_INTENSITY = 1.2;

/** Number of particles per edge - increased for better visibility */
const PARTICLE_COUNT = 12;

/** Particle size - increased for better visibility */
const PARTICLE_SIZE = 0.06;

/** Particle animation speed (units per second) - increased for faster flow (Requirements 3.4) */
const PARTICLE_SPEED = 1.2;

/** Edge glow scale multiplier for outer glow effect */
const EDGE_GLOW_SCALE = 1.8;

/** Label offset from edge center */
const LABEL_OFFSET_Y = 0.3;

/** Label font size */
const LABEL_FONT_SIZE = 0.12;

/** Link type display names */
const LINK_TYPE_NAMES: Record<LinkType, string> = {
  semantic: 'Semantic',
  causal: 'Causal',
  temporal: 'Temporal',
  analogical: 'Analogical',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a curve path between two points
 */
function createEdgeCurve(
  source: [number, number, number],
  target: [number, number, number]
): THREE.CatmullRomCurve3 {
  const sourceVec = new THREE.Vector3(...source);
  const targetVec = new THREE.Vector3(...target);

  // Create a slight curve by adding a midpoint offset
  const midpoint = new THREE.Vector3().addVectors(sourceVec, targetVec).multiplyScalar(0.5);

  // Add slight upward curve for visual appeal
  const distance = sourceVec.distanceTo(targetVec);
  midpoint.y += distance * 0.1;

  return new THREE.CatmullRomCurve3([sourceVec, midpoint, targetVec]);
}

/**
 * Brightens a hex color by a multiplier
 */
function brightenColor(hex: string, multiplier: number): string {
  const color = new THREE.Color(hex);
  color.multiplyScalar(multiplier);
  return `#${color.getHexString()}`;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface EdgeTubeProps {
  curve: THREE.CatmullRomCurve3;
  thickness: number;
  color: string;
  isHovered: boolean;
  onPointerOver: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (event: ThreeEvent<PointerEvent>) => void;
  /** Emissive intensity multiplier for hub edges (Requirements: 43.3) */
  emissiveMultiplier?: number;
  /** Glow opacity multiplier for hub edges (Requirements: 43.3) */
  glowMultiplier?: number;
  /** Whether light mode is active */
  lightMode?: boolean;
}

/**
 * Tube geometry for the edge connection with glow effect
 * Requirements: 3.1, 3.2, 3.3, 43.3
 */
function EdgeTube({
  curve,
  thickness,
  color,
  isHovered,
  onPointerOver,
  onPointerOut,
  emissiveMultiplier = 1.0,
  glowMultiplier = 1.0,
  lightMode = false,
}: EdgeTubeProps): React.ReactElement {
  const tubeRef = useRef<THREE.Mesh>(null);

  // Create tube geometry from curve - slightly thicker in light mode for visibility
  const effectiveThickness = lightMode ? thickness * 1.3 : thickness;
  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(
      curve,
      TUBE_SEGMENTS,
      effectiveThickness,
      TUBE_RADIAL_SEGMENTS,
      false
    );
  }, [curve, effectiveThickness]);

  // Create outer glow geometry (larger tube)
  const glowGeometry = useMemo(() => {
    return new THREE.TubeGeometry(
      curve,
      TUBE_SEGMENTS,
      effectiveThickness * EDGE_GLOW_SCALE,
      TUBE_RADIAL_SEGMENTS,
      false
    );
  }, [curve, effectiveThickness]);

  // Calculate display color based on hover state
  const displayColor = isHovered ? brightenColor(color, HOVER_BRIGHTNESS) : color;
  // Apply hub emissive multiplier for brighter hub edges (Requirements: 43.3)
  // Light mode needs much higher emissive intensity for bold visibility
  const baseEmissive = lightMode
    ? isHovered
      ? 2.5
      : 2.0
    : isHovered
      ? HOVER_EMISSIVE_INTENSITY
      : BASE_EMISSIVE_INTENSITY;
  const emissiveIntensity = baseEmissive * emissiveMultiplier;
  // Apply hub glow multiplier for more luminous hub edges (Requirements: 43.3)
  // Light mode needs higher glow opacity for bold appearance
  const baseGlow = lightMode ? (isHovered ? 0.8 : 0.6) : isHovered ? 0.4 : 0.25;
  const glowOpacity = baseGlow * glowMultiplier;

  return (
    <group>
      {/* Outer glow layer */}
      <mesh geometry={glowGeometry}>
        <meshBasicMaterial
          color={displayColor}
          transparent
          opacity={glowOpacity}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {/* Main tube */}
      <mesh
        ref={tubeRef}
        geometry={geometry}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={lightMode ? 1.0 : 0.9}
          roughness={lightMode ? 0.1 : 0.2}
          metalness={lightMode ? 0.7 : 0.6}
        />
      </mesh>
    </group>
  );
}

interface FlowingParticlesProps {
  curve: THREE.CatmullRomCurve3;
  color: string;
  bidirectional: boolean;
  isHovered: boolean;
}

/**
 * Flowing particles along the edge
 * Requirements: 3.4, 3.6
 */
function FlowingParticles({
  curve,
  color,
  bidirectional,
  isHovered,
}: FlowingParticlesProps): React.ReactElement {
  const particlesRef = useRef<THREE.Points>(null);
  const progressRef = useRef<number[]>(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => i / PARTICLE_COUNT)
  );

  // Animate particles along the curve
  useFrame((_, delta) => {
    if (!particlesRef.current) return;

    const positionAttr = particlesRef.current.geometry.attributes.position;
    if (!(positionAttr instanceof THREE.BufferAttribute)) return;

    const speed = PARTICLE_SPEED * (isHovered ? 1.5 : 1);
    const progress = progressRef.current;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let currentProgress = progress[i] ?? i / PARTICLE_COUNT;

      // Update progress
      if (bidirectional && i >= PARTICLE_COUNT / 2) {
        // Reverse direction for second half of particles
        currentProgress -= delta * speed;
        if (currentProgress < 0) {
          currentProgress = 1;
        }
      } else {
        currentProgress += delta * speed;
        if (currentProgress > 1) {
          currentProgress = 0;
        }
      }

      progress[i] = currentProgress;

      // Get position on curve
      const point = curve.getPoint(currentProgress);
      positionAttr.setXYZ(i, point.x, point.y, point.z);
    }

    positionAttr.needsUpdate = true;
  });

  // Create particle positions buffer
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const point = curve.getPoint(i / PARTICLE_COUNT);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    }
    return positions;
  }, [curve]);

  const displayColor = isHovered ? brightenColor(color, HOVER_BRIGHTNESS) : color;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={particlePositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={displayColor}
        size={PARTICLE_SIZE * (isHovered ? 1.3 : 1)}
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

interface EdgeLabelProps {
  position: [number, number, number];
  linkType: LinkType;
  weight: number;
  visible: boolean;
}

/**
 * Hover label showing relationship type
 * Requirements: 3.5
 */
function EdgeLabel({
  position,
  linkType,
  weight,
  visible,
}: EdgeLabelProps): React.ReactElement | null {
  if (!visible) {
    return null;
  }

  const weightPercent = String(Math.round(weight * 100));
  const labelText = `${LINK_TYPE_NAMES[linkType]} (${weightPercent}%)`;

  return (
    <Billboard position={[position[0], position[1] + LABEL_OFFSET_Y, position[2]]} follow>
      <Text
        fontSize={LABEL_FONT_SIZE}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
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

export interface Edge3DProps extends EdgeDisplayProps {
  /** Whether to show bidirectional particle flow */
  bidirectional?: boolean;
  /** Whether reduced motion is preferred */
  reducedMotion?: boolean;
  /** Whether this edge connects to a hub node (>5 connections) - Requirements: 43.3 */
  isHubConnection?: boolean;
  /** Whether light mode is active (for visibility) */
  lightMode?: boolean;
}

/**
 * Edge3D Component
 *
 * Renders a connection between memory nodes as a luminous tube with
 * flowing particle animation and hover state with label.
 *
 * Requirements: 3.1-3.6
 */
export function Edge3D({
  sourcePosition,
  targetPosition,
  edge,
  isHovered,
  onHover,
  bidirectional = false,
  reducedMotion = false,
  isHubConnection = false,
  lightMode = false,
}: Edge3DProps): React.ReactElement {
  // Local hover state
  const [localHovered, setLocalHovered] = useState(false);

  // Calculate visual properties with hub enhancement (Requirements: 43.3)
  const thickness = useMemo(
    () => calculateHubEdgeThickness(edge.weight, isHubConnection),
    [edge.weight, isHubConnection]
  );
  const color = useMemo(
    () => getLinkTypeColor(edge.linkType, lightMode),
    [edge.linkType, lightMode]
  );

  // Get hub edge enhancement multipliers (Requirements: 43.3)
  const emissiveMultiplier = useMemo(
    () => getHubEdgeEmissiveMultiplier(isHubConnection),
    [isHubConnection]
  );
  const glowMultiplier = useMemo(
    () => getHubEdgeGlowMultiplier(isHubConnection),
    [isHubConnection]
  );

  // Create curve for the edge
  const curve = useMemo(
    () => createEdgeCurve(sourcePosition, targetPosition),
    [sourcePosition, targetPosition]
  );

  // Calculate midpoint for label positioning
  const midpoint = useMemo((): [number, number, number] => {
    const point = curve.getPoint(0.5);
    return [point.x, point.y, point.z];
  }, [curve]);

  // Effective hover state
  const effectiveHovered = isHovered || localHovered;

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

  return (
    <group name={`edge-${edge.source}-${edge.target}`}>
      {/* Main tube geometry (Requirements: 3.1, 3.2, 3.3, 43.3) */}
      <EdgeTube
        curve={curve}
        thickness={thickness}
        color={color}
        isHovered={effectiveHovered}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        emissiveMultiplier={emissiveMultiplier}
        glowMultiplier={glowMultiplier}
        lightMode={lightMode}
      />

      {/* Flowing particles (Requirements: 3.4, 3.6) */}
      {!reducedMotion && (
        <FlowingParticles
          curve={curve}
          color={color}
          bidirectional={bidirectional}
          isHovered={effectiveHovered}
        />
      )}

      {/* Hover label (Requirements: 3.5) */}
      <EdgeLabel
        position={midpoint}
        linkType={edge.linkType}
        weight={edge.weight}
        visible={effectiveHovered}
      />
    </group>
  );
}

export default Edge3D;
