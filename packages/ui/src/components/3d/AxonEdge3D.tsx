/**
 * AxonEdge3D Component
 *
 * Renders a connection between memory nodes as an axon-like fiber with
 * organic bezier curves, slight randomized wobble, and synaptic junction
 * effects at connection points.
 *
 * Requirements: 25.2, 25.3, 25.6
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
const TUBE_SEGMENTS = 48;

/** Number of radial segments for tube geometry */
const TUBE_RADIAL_SEGMENTS = 8;

/** Hover brightness multiplier */
const HOVER_BRIGHTNESS = 1.5;

/** Base emissive intensity */
const BASE_EMISSIVE_INTENSITY = 0.7;

/** Hover emissive intensity */
const HOVER_EMISSIVE_INTENSITY = 1.1;

/** Number of particles per edge */
const PARTICLE_COUNT = 14;

/** Particle size */
const PARTICLE_SIZE = 0.05;

/** Particle animation speed */
const PARTICLE_SPEED = 1.0;

/** Edge glow scale multiplier */
const EDGE_GLOW_SCALE = 2.0;

/** Label offset from edge center */
const LABEL_OFFSET_Y = 0.35;

/** Label font size */
const LABEL_FONT_SIZE = 0.12;

/** Bezier curve control point offset ratio */
const CURVE_CONTROL_OFFSET = 0.25;

/** Wobble amplitude for organic appearance */
const WOBBLE_AMPLITUDE = 0.15;

/** Synaptic junction sphere size ratio */
const SYNAPSE_SIZE_RATIO = 2.5;

/** Synaptic junction glow opacity */
const SYNAPSE_GLOW_OPACITY = 0.4;

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
 * Generates a deterministic pseudo-random number based on seed
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Creates an organic bezier curve path between two points with wobble
 * Requirements: 25.2, 25.3
 */
function createOrganicCurve(
  source: [number, number, number],
  target: [number, number, number],
  edgeId: string
): THREE.CubicBezierCurve3 {
  const sourceVec = new THREE.Vector3(...source);
  const targetVec = new THREE.Vector3(...target);

  // Calculate direction and distance
  const direction = new THREE.Vector3().subVectors(targetVec, sourceVec);
  const distance = direction.length();
  const normalizedDir = direction.clone().normalize();

  // Create perpendicular vectors for wobble
  const up = new THREE.Vector3(0, 1, 0);
  const perpendicular1 = new THREE.Vector3().crossVectors(normalizedDir, up).normalize();
  if (perpendicular1.length() < 0.1) {
    perpendicular1.set(1, 0, 0);
  }
  const perpendicular2 = new THREE.Vector3()
    .crossVectors(normalizedDir, perpendicular1)
    .normalize();

  // Generate deterministic wobble based on edge ID
  let hash = 0;
  for (let i = 0; i < edgeId.length; i++) {
    hash = (hash << 5) - hash + edgeId.charCodeAt(i);
    hash = hash & hash;
  }

  const wobble1 = (seededRandom(hash) - 0.5) * 2 * WOBBLE_AMPLITUDE * distance;
  const wobble2 = (seededRandom(hash + 1) - 0.5) * 2 * WOBBLE_AMPLITUDE * distance;
  const wobble3 = (seededRandom(hash + 2) - 0.5) * 2 * WOBBLE_AMPLITUDE * distance;
  const wobble4 = (seededRandom(hash + 3) - 0.5) * 2 * WOBBLE_AMPLITUDE * distance;

  // Calculate control points with organic offset
  const controlOffset = distance * CURVE_CONTROL_OFFSET;

  const control1 = sourceVec
    .clone()
    .add(normalizedDir.clone().multiplyScalar(controlOffset))
    .add(perpendicular1.clone().multiplyScalar(wobble1))
    .add(perpendicular2.clone().multiplyScalar(wobble2));

  const control2 = targetVec
    .clone()
    .sub(normalizedDir.clone().multiplyScalar(controlOffset))
    .add(perpendicular1.clone().multiplyScalar(wobble3))
    .add(perpendicular2.clone().multiplyScalar(wobble4));

  return new THREE.CubicBezierCurve3(sourceVec, control1, control2, targetVec);
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

interface AxonTubeProps {
  curve: THREE.CubicBezierCurve3;
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
 * Organic tube geometry for the axon connection with glow effect
 * Requirements: 25.2, 25.3, 43.3
 */
function AxonTube({
  curve,
  thickness,
  color,
  isHovered,
  onPointerOver,
  onPointerOut,
  emissiveMultiplier = 1.0,
  glowMultiplier = 1.0,
  lightMode = false,
}: AxonTubeProps): React.ReactElement {
  // Create tube geometry from bezier curve - slightly thicker in light mode for visibility
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

  // Create outer glow geometry
  const glowGeometry = useMemo(() => {
    return new THREE.TubeGeometry(
      curve,
      TUBE_SEGMENTS,
      effectiveThickness * EDGE_GLOW_SCALE,
      TUBE_RADIAL_SEGMENTS,
      false
    );
  }, [curve, effectiveThickness]);

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
  const baseGlow = lightMode ? (isHovered ? 0.8 : 0.6) : isHovered ? 0.35 : 0.2;
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
      {/* Main axon tube */}
      <mesh geometry={geometry} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={lightMode ? 1.0 : 0.85}
          roughness={lightMode ? 0.15 : 0.25}
          metalness={lightMode ? 0.65 : 0.55}
        />
      </mesh>
    </group>
  );
}

interface SynapticJunctionProps {
  position: [number, number, number];
  thickness: number;
  color: string;
  isHovered: boolean;
  /** Emissive intensity multiplier for hub edges (Requirements: 43.3) */
  emissiveMultiplier?: number;
  /** Glow opacity multiplier for hub edges (Requirements: 43.3) */
  glowMultiplier?: number;
}

/**
 * Synaptic junction effect at connection endpoints
 * Requirements: 25.6, 43.3
 */
function SynapticJunction({
  position,
  thickness,
  color,
  isHovered,
  emissiveMultiplier = 1.0,
  glowMultiplier = 1.0,
}: SynapticJunctionProps): React.ReactElement {
  const meshRef = useRef<THREE.Mesh>(null);
  const size = thickness * SYNAPSE_SIZE_RATIO;

  // Subtle pulsing animation
  useFrame((state) => {
    if (!meshRef.current) return;
    const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1;
    meshRef.current.scale.setScalar(pulse);
  });

  const displayColor = isHovered ? brightenColor(color, HOVER_BRIGHTNESS) : color;
  // Apply hub emissive multiplier for brighter hub synapses (Requirements: 43.3)
  const baseEmissive = isHovered ? 1.0 : 0.7;
  const emissiveIntensity = baseEmissive * emissiveMultiplier;
  // Apply hub glow multiplier for more luminous hub synapses (Requirements: 43.3)
  const baseGlowOpacity = SYNAPSE_GLOW_OPACITY * (isHovered ? 1.3 : 1);
  const glowOpacity = baseGlowOpacity * glowMultiplier;

  return (
    <group position={position}>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[size * 1.5, 16, 16]} />
        <meshBasicMaterial
          color={displayColor}
          transparent
          opacity={glowOpacity}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {/* Inner synapse bulb */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={0.9}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>
    </group>
  );
}

interface FlowingParticlesProps {
  curve: THREE.CubicBezierCurve3;
  color: string;
  bidirectional: boolean;
  isHovered: boolean;
}

/**
 * Flowing particles along the axon
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

  useFrame((_, delta) => {
    if (!particlesRef.current) return;

    const positionAttr = particlesRef.current.geometry.attributes.position;
    if (!(positionAttr instanceof THREE.BufferAttribute)) return;

    const speed = PARTICLE_SPEED * (isHovered ? 1.4 : 1);
    const progress = progressRef.current;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let currentProgress = progress[i] ?? i / PARTICLE_COUNT;

      if (bidirectional && i >= PARTICLE_COUNT / 2) {
        currentProgress -= delta * speed;
        if (currentProgress < 0) currentProgress = 1;
      } else {
        currentProgress += delta * speed;
        if (currentProgress > 1) currentProgress = 0;
      }

      progress[i] = currentProgress;

      const point = curve.getPoint(currentProgress);
      positionAttr.setXYZ(i, point.x, point.y, point.z);
    }

    positionAttr.needsUpdate = true;
  });

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
        size={PARTICLE_SIZE * (isHovered ? 1.25 : 1)}
        transparent
        opacity={0.85}
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
 */
function EdgeLabel({
  position,
  linkType,
  weight,
  visible,
}: EdgeLabelProps): React.ReactElement | null {
  if (!visible) return null;

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

export interface AxonEdge3DProps extends EdgeDisplayProps {
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
 * AxonEdge3D Component
 *
 * Renders a connection between memory nodes as an organic axon-like fiber
 * with bezier curves, wobble, and synaptic junction effects.
 *
 * Requirements: 25.2, 25.3, 25.6
 */
export function AxonEdge3D({
  sourcePosition,
  targetPosition,
  edge,
  isHovered,
  onHover,
  bidirectional = false,
  reducedMotion = false,
  isHubConnection = false,
  lightMode = false,
}: AxonEdge3DProps): React.ReactElement {
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

  // Create organic bezier curve
  const edgeId = `${edge.source}-${edge.target}`;
  const curve = useMemo(
    () => createOrganicCurve(sourcePosition, targetPosition, edgeId),
    [sourcePosition, targetPosition, edgeId]
  );

  // Calculate midpoint for label
  const midpoint = useMemo((): [number, number, number] => {
    const point = curve.getPoint(0.5);
    return [point.x, point.y, point.z];
  }, [curve]);

  const effectiveHovered = isHovered || localHovered;

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
    <group name={`axon-edge-${edgeId}`}>
      {/* Synaptic junction at source (Requirements 25.6, 43.3) */}
      <SynapticJunction
        position={sourcePosition}
        thickness={thickness}
        color={color}
        isHovered={effectiveHovered}
        emissiveMultiplier={emissiveMultiplier}
        glowMultiplier={glowMultiplier}
      />

      {/* Main axon tube (Requirements 25.2, 25.3, 43.3) */}
      <AxonTube
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

      {/* Synaptic junction at target (Requirements 25.6, 43.3) */}
      <SynapticJunction
        position={targetPosition}
        thickness={thickness}
        color={color}
        isHovered={effectiveHovered}
        emissiveMultiplier={emissiveMultiplier}
        glowMultiplier={glowMultiplier}
      />

      {/* Flowing particles */}
      {!reducedMotion && (
        <FlowingParticles
          curve={curve}
          color={color}
          bidirectional={bidirectional}
          isHovered={effectiveHovered}
        />
      )}

      {/* Hover label */}
      <EdgeLabel
        position={midpoint}
        linkType={edge.linkType}
        weight={edge.weight}
        visible={effectiveHovered}
      />
    </group>
  );
}

export default AxonEdge3D;
