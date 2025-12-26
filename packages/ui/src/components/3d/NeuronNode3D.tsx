/**
 * NeuronNode3D Component
 *
 * Renders a memory node as a neuron-like structure with a central soma (cell body)
 * and subtle dendrite extensions for an organic, brain-like appearance.
 *
 * Requirements: 25.1
 */

import { Billboard, Text } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import type { MemoryNodeDisplayProps } from "@types";
import { useCallback, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  calculateNodeOpacity,
  calculateNodeSizeWithHubEmphasis,
  getSectorColor,
  isHubNode,
} from "../../utils/visualization";
import { ConnectionBadge3D } from "./ConnectionBadge3D";

// ============================================================================
// Constants
// ============================================================================

/** Base sphere segments for soma geometry */
const SOMA_SEGMENTS = 32;

/** Number of dendrite extensions per node */
const DENDRITE_COUNT = 5;

/** Dendrite length relative to soma size */
const DENDRITE_LENGTH_RATIO = 0.8;

/** Dendrite thickness relative to soma size */
const DENDRITE_THICKNESS_RATIO = 0.08;

/** Glow layer scale multiplier */
const GLOW_SCALE = 1.4;

/** Current node golden glow color */
const CURRENT_NODE_GLOW_COLOR = "#FFD700";

/** Hover scale multiplier (20% increase per Requirements 2.6) */
const HOVER_SCALE = 1.2;

/** Hover glow intensity multiplier */
const HOVER_GLOW_INTENSITY = 1.5;

/** Pulsing animation speed */
const PULSE_SPEED = 2;

/** Pulsing animation amplitude */
const PULSE_AMPLITUDE = 0.1;

/** Label offset from node center */
const LABEL_OFFSET_Y = 1.4;

/** Maximum label length before truncation */
const MAX_LABEL_LENGTH = 30;

/** Label font size */
const LABEL_FONT_SIZE = 0.22;

/** Label background padding */
const LABEL_BACKGROUND_PADDING = 0.08;

/** Dendrite wobble animation speed */
const DENDRITE_WOBBLE_SPEED = 0.5;

/** Dendrite wobble amplitude */
const DENDRITE_WOBBLE_AMPLITUDE = 0.02;

/** Fresnel rim lighting power (higher = sharper edge glow) */
const FRESNEL_POWER = 2.5;

/** Fresnel rim lighting intensity */
const FRESNEL_INTENSITY = 0.6;

/** Particle burst count on selection */
const PARTICLE_BURST_COUNT = 12;

/** Particle burst duration in seconds */
const PARTICLE_BURST_DURATION = 0.8;

/** Idle rotation speed (radians per second) */
const IDLE_ROTATION_SPEED = 0.15;

/** Highlight glow intensity multiplier (for tag hover highlighting - Requirement 42.6) */
const HIGHLIGHT_GLOW_INTENSITY = 2.0;

/** Highlight pulse speed (for tag hover highlighting - Requirement 42.6) */
const HIGHLIGHT_PULSE_SPEED = 3;

/** Highlight pulse amplitude (for tag hover highlighting - Requirement 42.6) */
const HIGHLIGHT_PULSE_AMPLITUDE = 0.15;

// ============================================================================
// Hub Node Visual Emphasis Constants (Requirements: 39.2, 39.3, 43.5)
// ============================================================================

/** Corona glow scale multiplier for hub nodes */
const HUB_CORONA_SCALE = 1.8;

/** Corona glow opacity for hub nodes */
const HUB_CORONA_OPACITY = 0.25;

/** Corona pulse speed for hub nodes */
const HUB_CORONA_PULSE_SPEED = 1.5;

/** Corona pulse amplitude for hub nodes */
const HUB_CORONA_PULSE_AMPLITUDE = 0.15;

/** Number of corona rings for hub nodes */
const HUB_CORONA_RING_COUNT = 3;

/** Corona ring spacing multiplier */
const HUB_CORONA_RING_SPACING = 0.2;

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
  return content.substring(0, maxLength - 3) + "...";
}

/**
 * Generates deterministic dendrite directions based on node ID
 */
function generateDendriteDirections(nodeId: string, count: number): THREE.Vector3[] {
  const directions: THREE.Vector3[] = [];
  // Use node ID hash for deterministic but varied directions
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    hash = (hash << 5) - hash + nodeId.charCodeAt(i);
    hash = hash & hash;
  }

  for (let i = 0; i < count; i++) {
    // Golden angle distribution with hash-based offset
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + hash * 0.001);

    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.sin(phi) * Math.sin(theta);
    const z = Math.cos(phi);

    directions.push(new THREE.Vector3(x, y, z).normalize());
  }

  return directions;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SomaGlowProps {
  size: number;
  color: string;
  opacity: number;
  glowIntensity: number;
}

/**
 * Outer glow sphere for the soma (cell body)
 */
function SomaGlow({ size, color, opacity, glowIntensity }: SomaGlowProps): React.ReactElement {
  return (
    <mesh>
      <sphereGeometry args={[size * GLOW_SCALE, SOMA_SEGMENTS / 2, SOMA_SEGMENTS / 2]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity * 0.25 * glowIntensity}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

interface DendriteProps {
  direction: THREE.Vector3;
  somaSize: number;
  color: string;
  opacity: number;
  emissiveIntensity: number;
  index: number;
  reducedMotion: boolean;
}

/**
 * Single dendrite extension from the soma
 */
function Dendrite({
  direction,
  somaSize,
  color,
  opacity,
  emissiveIntensity,
  index,
  reducedMotion,
}: DendriteProps): React.ReactElement {
  const meshRef = useRef<THREE.Mesh>(null);
  const length = somaSize * DENDRITE_LENGTH_RATIO;
  const thickness = somaSize * DENDRITE_THICKNESS_RATIO;

  // Calculate position and rotation
  const position = useMemo(() => {
    return direction.clone().multiplyScalar(somaSize * 0.9);
  }, [direction, somaSize]);

  const rotation = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z] as [number, number, number];
  }, [direction]);

  // Subtle wobble animation for organic feel
  useFrame((state) => {
    if (!meshRef.current || reducedMotion) return;

    const wobble =
      Math.sin(state.clock.elapsedTime * DENDRITE_WOBBLE_SPEED + index * 1.5) *
      DENDRITE_WOBBLE_AMPLITUDE;
    meshRef.current.scale.setScalar(1 + wobble);
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      {/* Tapered cylinder for dendrite */}
      <cylinderGeometry args={[thickness * 0.3, thickness, length, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity * 0.6}
        transparent
        opacity={opacity * 0.8}
        roughness={0.4}
        metalness={0.5}
      />
    </mesh>
  );
}

interface FresnelGlowProps {
  size: number;
  color: string;
  opacity: number;
  intensity: number;
}

/**
 * Fresnel rim lighting effect for enhanced edge glow (Requirements 34.2, 34.4)
 * Creates a subtle glow around the edges of the node for depth and visual interest
 */
function FresnelGlow({ size, color, opacity, intensity }: FresnelGlowProps): React.ReactElement {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Custom fresnel shader for rim lighting effect
  // Note: Using WebGL2/GLSL3 compatible syntax with explicit output
  const fresnelShader = useMemo(
    () => ({
      uniforms: {
        fresnelColor: { value: new THREE.Color(color) },
        fresnelPower: { value: FRESNEL_POWER },
        fresnelIntensity: { value: intensity * FRESNEL_INTENSITY },
        opacity: { value: opacity },
      },
      vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
      fragmentShader: `
      uniform vec3 fresnelColor;
      uniform float fresnelPower;
      uniform float fresnelIntensity;
      uniform float opacity;

      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), fresnelPower);
        vec3 finalColor = fresnelColor * fresnel * fresnelIntensity;
        float finalAlpha = fresnel * opacity * fresnelIntensity;
        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `,
    }),
    [color, intensity, opacity]
  );

  // Update uniforms when props change
  useFrame(() => {
    if (materialRef.current?.uniforms != null) {
      const uniforms = materialRef.current.uniforms as {
        fresnelColor?: { value: THREE.Color };
        fresnelIntensity?: { value: number };
        opacity?: { value: number };
      };
      if (uniforms.fresnelColor != null) uniforms.fresnelColor.value.set(color);
      if (uniforms.fresnelIntensity != null)
        uniforms.fresnelIntensity.value = intensity * FRESNEL_INTENSITY;
      if (uniforms.opacity != null) uniforms.opacity.value = opacity;
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[size * 1.05, SOMA_SEGMENTS, SOMA_SEGMENTS]} />
      <shaderMaterial
        ref={materialRef}
        {...fresnelShader}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

interface ParticleBurstProps {
  active: boolean;
  position: [number, number, number];
  color: string;
  size: number;
  onComplete?: () => void;
}

/**
 * Particle burst effect on node selection (Requirements 34.2)
 * Creates an expanding ring of particles when a node is selected
 */
function ParticleBurst({
  active,
  position,
  color,
  size,
  onComplete,
}: ParticleBurstProps): React.ReactElement | null {
  const pointsRef = useRef<THREE.Points>(null);
  const startTimeRef = useRef<number | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Generate particle positions in a sphere pattern
  const particleData = useMemo(() => {
    const positions = new Float32Array(PARTICLE_BURST_COUNT * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < PARTICLE_BURST_COUNT; i++) {
      // Start at center
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      // Random outward velocity using golden angle distribution
      const phi = Math.acos(1 - (2 * (i + 0.5)) / PARTICLE_BURST_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);

      velocities.push(new THREE.Vector3(x, y, z).multiplyScalar(size * 3));
    }

    return { positions, velocities };
  }, [size]);

  // Trigger burst when active changes to true
  useFrame((state) => {
    if (active && !isActive) {
      setIsActive(true);
      startTimeRef.current = state.clock.elapsedTime;
    }

    if (!isActive || !pointsRef.current || startTimeRef.current === null) return;

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const progress = elapsed / PARTICLE_BURST_DURATION;

    if (progress >= 1) {
      setIsActive(false);
      startTimeRef.current = null;
      onComplete?.();
      return;
    }

    // Update particle positions
    const positionAttr = pointsRef.current.geometry.attributes.position;
    if (!positionAttr) return;

    const positions = positionAttr.array as Float32Array;
    const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease out

    for (let i = 0; i < PARTICLE_BURST_COUNT; i++) {
      const velocity = particleData.velocities[i];
      if (velocity) {
        positions[i * 3] = velocity.x * easeOut;
        positions[i * 3 + 1] = velocity.y * easeOut;
        positions[i * 3 + 2] = velocity.z * easeOut;
      }
    }

    positionAttr.needsUpdate = true;

    // Fade out particles
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = 1 - progress;
  });

  if (!isActive) return null;

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_BURST_COUNT}
          array={particleData.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size * 0.15}
        transparent
        opacity={1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

interface CoronaGlowProps {
  size: number;
  color: string;
  opacity: number;
  isHub: boolean;
  reducedMotion: boolean;
}

/**
 * Corona glow effect for hub nodes (Requirements: 39.2, 39.3, 43.5)
 * Creates a distinctive pulsing ring/corona effect around hub nodes
 * to visually emphasize their importance as central connection points.
 */
function CoronaGlow({
  size,
  color,
  opacity,
  isHub,
  reducedMotion,
}: CoronaGlowProps): React.ReactElement | null {
  const groupRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<(THREE.Mesh | undefined)[]>([]);

  // Pulsing animation for corona rings
  useFrame((state) => {
    if (!isHub || reducedMotion || groupRef.current == null) return;

    const time = state.clock.elapsedTime;

    // Animate each ring with offset phases
    ringsRef.current.forEach((ring, index) => {
      // Ring may be undefined if not yet assigned
      if (ring === undefined) return;

      // Staggered pulse for each ring
      const phase = (index / HUB_CORONA_RING_COUNT) * Math.PI * 2;
      const pulse =
        Math.sin(time * HUB_CORONA_PULSE_SPEED + phase) * HUB_CORONA_PULSE_AMPLITUDE + 1;

      ring.scale.setScalar(pulse);

      // Fade opacity based on pulse
      const material = ring.material as THREE.MeshBasicMaterial | undefined;
      if (material != null) {
        material.opacity = HUB_CORONA_OPACITY * opacity * (0.5 + pulse * 0.5);
      }
    });

    // Slow rotation of the entire corona group
    groupRef.current.rotation.z += 0.002;
  });

  // Don't render if not a hub node
  if (!isHub) {
    return null;
  }

  // Generate corona rings
  const rings = [];
  for (let i = 0; i < HUB_CORONA_RING_COUNT; i++) {
    const ringScale = HUB_CORONA_SCALE + i * HUB_CORONA_RING_SPACING;
    const innerRadius = size * ringScale * 0.9;
    const outerRadius = size * ringScale;

    rings.push(
      <mesh
        key={`corona-ring-${String(i)}`}
        ref={(el): void => {
          if (el) ringsRef.current[i] = el;
        }}
        rotation={[Math.PI / 2, 0, (i * Math.PI) / HUB_CORONA_RING_COUNT]}
      >
        <ringGeometry args={[innerRadius, outerRadius, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={HUB_CORONA_OPACITY * opacity * (1 - i * 0.2)}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    );
  }

  return (
    <group ref={groupRef} name="corona-glow">
      {rings}
      {/* Outer glow sphere for additional emphasis */}
      <mesh>
        <sphereGeometry args={[size * HUB_CORONA_SCALE, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={HUB_CORONA_OPACITY * opacity * 0.3}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

interface NodeLabelProps {
  content: string;
  size: number;
  visible: boolean;
}

/**
 * Billboard text label that always faces the camera with background for contrast
 */
function NodeLabel({ content, size, visible }: NodeLabelProps): React.ReactElement | null {
  if (!visible) {
    return null;
  }

  const labelText = truncateForLabel(content, MAX_LABEL_LENGTH);
  const fontSize = LABEL_FONT_SIZE * (size + 0.5);

  const textWidth = labelText.length * fontSize * 0.5;
  const textHeight = fontSize * 1.2;
  const bgWidth = textWidth + LABEL_BACKGROUND_PADDING * 2;
  const bgHeight = textHeight + LABEL_BACKGROUND_PADDING * 2;

  return (
    <Billboard position={[0, size + LABEL_OFFSET_Y * size, 0]} follow lockX={false} lockY={false}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[bgWidth, bgHeight]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.75} depthWrite={false} />
      </mesh>
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

export interface NeuronNode3DProps extends MemoryNodeDisplayProps {
  /** Whether to show the label */
  showLabel?: boolean;
  /** Whether to use high contrast colors */
  highContrast?: boolean;
  /** Whether reduced motion is preferred */
  reducedMotion?: boolean;
  /** Whether this node is highlighted (e.g., from tag hover) (Requirement: 42.6) */
  isHighlighted?: boolean;
  /** Number of connections this node has (Requirements: 39.2, 39.3, 43.5) */
  connectionCount?: number;
  /** Whether light mode is active (for color visibility) */
  lightMode?: boolean;
}

/**
 * NeuronNode3D Component
 *
 * Renders a memory node as a neuron-like structure with central soma
 * and dendrite extensions for organic appearance.
 *
 * Requirements: 25.1
 */
export function NeuronNode3D({
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
  connectionCount = 0,
  lightMode = false,
}: NeuronNode3DProps): React.ReactElement {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [localHovered, setLocalHovered] = useState(false);
  const [showParticleBurst, setShowParticleBurst] = useState(false);
  const prevIsCurrentRef = useRef(isCurrent);

  // Calculate visual properties with hub emphasis (Requirements: 39.2, 43.5)
  const baseSize = useMemo(
    () => calculateNodeSizeWithHubEmphasis(salience, connectionCount),
    [salience, connectionCount]
  );
  const baseOpacity = useMemo(() => calculateNodeOpacity(strength), [strength]);
  const sectorColor = useMemo(
    () => getSectorColor(primarySector, highContrast, lightMode),
    [primarySector, highContrast, lightMode]
  );

  // Determine if this node is a hub (Requirements: 39.2, 39.3, 43.5)
  const isHub = useMemo(() => isHubNode(connectionCount), [connectionCount]);

  // Generate dendrite directions
  const dendriteDirections = useMemo(() => generateDendriteDirections(id, DENDRITE_COUNT), [id]);

  // Track node visibility
  // Node opacity is always 1 unless overridden by specialized logic (removed expansion logic)
  const nodeOpacity = 1;

  // Determine effective hover state (Requirement 42.6: tag hover highlighting)
  const effectiveHovered = isHovered || localHovered;
  // Highlighted nodes (from tag hover) get enhanced glow but not scale change
  const targetScale = effectiveHovered ? HOVER_SCALE : 1;
  const glowIntensity = isHighlighted
    ? HIGHLIGHT_GLOW_INTENSITY
    : effectiveHovered
      ? HOVER_GLOW_INTENSITY
      : 1;

  // Animation frame for pulsing, scale, expansion, and idle rotation
  useFrame((state, delta) => {
    if (!meshRef.current || !groupRef.current) return;

    // Trigger particle burst when becoming current node (Requirements 34.2)
    if (isCurrent && !prevIsCurrentRef.current) {
      setShowParticleBurst(true);
    }
    prevIsCurrentRef.current = isCurrent;

    // Smooth scale interpolation
    const currentScale = groupRef.current.scale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
    groupRef.current.scale.setScalar(newScale);

    // Pulsing animation for current node or highlighted node
    // Requirement 42.6: Highlighted nodes from tag hover get a distinctive pulse
    if ((isCurrent || isHighlighted) && !reducedMotion) {
      const pulseSpeed = isHighlighted ? HIGHLIGHT_PULSE_SPEED : PULSE_SPEED;
      const pulseAmplitude = isHighlighted ? HIGHLIGHT_PULSE_AMPLITUDE : PULSE_AMPLITUDE;
      const pulse = Math.sin(state.clock.elapsedTime * pulseSpeed) * pulseAmplitude;
      meshRef.current.scale.setScalar(1 + pulse);
    } else {
      meshRef.current.scale.setScalar(1);
    }

    // Subtle idle rotation for non-current nodes (Requirements 34.4)
    if (!isCurrent && !reducedMotion && !effectiveHovered) {
      groupRef.current.rotation.y += IDLE_ROTATION_SPEED * delta;
    }
  });

  // Event handlers
  const handlePointerOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setLocalHovered(true);
      onHover(true);
      document.body.style.cursor = "pointer";
    },
    [onHover]
  );

  const handlePointerOut = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setLocalHovered(false);
      onHover(false);
      document.body.style.cursor = "auto";
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

  // Display color (golden for current node)
  const displayColor = isCurrent ? CURRENT_NODE_GLOW_COLOR : sectorColor;
  // Requirement 42.6: Highlighted nodes get enhanced emissive intensity
  // Light mode needs much higher emissive intensity for bold visibility on light backgrounds
  const baseEmissiveIntensity = lightMode ? 2.0 : 0.6;
  const emissiveIntensity = isCurrent
    ? lightMode
      ? 2.8
      : 1.2
    : isHighlighted
      ? lightMode
        ? 2.5
        : 1.1
      : effectiveHovered
        ? lightMode
          ? 2.2
          : 0.9
        : baseEmissiveIntensity;

  // Calculate animated opacity for node elements
  const animatedOpacity = baseOpacity * nodeOpacity;

  return (
    <group ref={groupRef} position={position} name={`neuron-node-${id}`}>
      {/* Node visuals */}
      {/* Node visuals */}
      <>
        {/* Outer glow layer */}
        <SomaGlow
          size={baseSize}
          color={displayColor}
          opacity={animatedOpacity}
          glowIntensity={glowIntensity}
        />

        {/* Fresnel rim lighting for enhanced edge glow (Requirements 34.2, 34.4) */}
        <FresnelGlow
          size={baseSize}
          color={displayColor}
          opacity={animatedOpacity}
          intensity={effectiveHovered ? 1.5 : 1}
        />

        {/* Corona glow effect for hub nodes (Requirements: 39.2, 39.3, 43.5) */}
        <CoronaGlow
          size={baseSize}
          color={displayColor}
          opacity={animatedOpacity}
          isHub={isHub}
          reducedMotion={reducedMotion}
        />

        {/* Dendrite extensions (Requirements 25.1) */}
        {dendriteDirections.map((direction, index) => (
          <Dendrite
            key={index}
            direction={direction}
            somaSize={baseSize}
            color={displayColor}
            opacity={animatedOpacity}
            emissiveIntensity={emissiveIntensity}
            index={index}
            reducedMotion={reducedMotion}
          />
        ))}

        {/* Main soma (cell body) mesh */}
        <mesh
          ref={meshRef}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <sphereGeometry args={[baseSize, SOMA_SEGMENTS, SOMA_SEGMENTS]} />
          <meshStandardMaterial
            color={displayColor}
            emissive={displayColor}
            emissiveIntensity={emissiveIntensity}
            transparent
            opacity={lightMode ? 1.0 : animatedOpacity}
            roughness={lightMode ? 0.15 : 0.3}
            metalness={lightMode ? 0.6 : 0.7}
          />
        </mesh>

        {/* Current node ring indicator */}
        {isCurrent && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[baseSize * 1.5, baseSize * 1.7, 64]} />
            <meshBasicMaterial
              color={CURRENT_NODE_GLOW_COLOR}
              transparent
              opacity={0.5 * nodeOpacity}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Highlight ring for tag hover highlighting (Requirement: 42.6) */}
        {isHighlighted && !isCurrent && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[baseSize * 1.4, baseSize * 1.55, 64]} />
            <meshBasicMaterial
              color="#00FFFF"
              transparent
              opacity={0.6 * nodeOpacity}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )}

        {/* Highlight ring for tag hover highlighting (Requirement: 42.6) */}
        {isHighlighted && !isCurrent && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[baseSize * 1.3, baseSize * 1.45, 64]} />
            <meshBasicMaterial
              color="#00FFFF"
              transparent
              opacity={0.6 * nodeOpacity}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Billboard text label */}
        <NodeLabel content={contentPreview || content} size={baseSize} visible={showLabel} />

        {/* Connection count badge - positioned above node (Requirements: 39.1) */}
        {connectionCount > 0 && (
          <ConnectionBadge3D
            connectionCount={connectionCount}
            position={[0, 0, 0]}
            isHub={isHub}
            onHover={onHover}
            nodeSize={baseSize}
            reducedMotion={reducedMotion}
          />
        )}
      </>

      {/* Particle burst effect on node selection (Requirements 34.2) */}
      <ParticleBurst
        active={showParticleBurst}
        position={[0, 0, 0]}
        color={displayColor}
        size={baseSize}
        onComplete={(): void => {
          setShowParticleBurst(false);
        }}
      />
    </group>
  );
}

export default NeuronNode3D;
