/**
 * MemoryGraphScene Component
 *
 * Main 3D scene component for the Memory Graph UI.
 * Sets up the R3F Canvas with dark background, camera, lighting,
 * fog effects, ambient particle system, and post-processing effects
 * including bloom for luminous node appearance.
 *
 * Requirements: 1.1, 1.2, 1.5, 1.7, 2.1-2.7, 3.1-3.6
 */

import { Preload } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import type {
  CameraConfig,
  MemoryGraphSceneProps,
  ParticleSystemConfig,
  SceneConfig,
} from "@types";
import { BlendFunction } from "postprocessing";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useRadialLayoutTransition } from "../../hooks/useRadialLayoutTransition";
import { useGraphStore, type NeighborNode } from "../../stores/graphStore";
import { useThemeStore } from "../../stores/themeStore";
import { isHubNode, isValidEdge } from "../../utils/visualization";
import { AmbientParticles } from "./AmbientParticles";
import { AxonEdge3D } from "./AxonEdge3D";
import { CameraController } from "./CameraController";
import { Edge3D } from "./Edge3D";
import { MemoryNode3D } from "./MemoryNode3D";
import { NebulaBg } from "./NebulaBg";
import { NeuronNode3D } from "./NeuronNode3D";
import { StarField } from "./StarField";
import { WarpNavigator } from "./WarpNavigator";

// ============================================================================
// Default Configurations
// ============================================================================

// Note: backgroundColor and fogColor are dynamically set from CSS variables
// via getComputedStyle in the component to support theming
const DEFAULT_SCENE_CONFIG: SceneConfig = {
  backgroundColor: "#0a0a0f", // Fallback, overridden by theme
  fogColor: "#0a0a0f", // Fallback, overridden by theme
  // Increased fog distances to prevent nodes from being obscured
  fogNear: 20,
  fogFar: 150,
  // Increased ambient light intensity for better node visibility
  ambientLightIntensity: 0.6,
  ambientLightColor: "#ffffff",
};

const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  fov: 75,
  near: 0.1,
  far: 1000,
  // Position camera much further back (z=35, y=12) to ensure nodes don't cover too much of the viewport
  // Selected nodes should only take up about 1/5 of the canvas at max (Requirement 1.1)
  // Increased from z=22 to z=35 to give more distance from focused nodes
  position: [0, 12, 35],
};

const DEFAULT_PARTICLE_CONFIG: ParticleSystemConfig = {
  count: 1200, // Increased for denser atmosphere (Requirement 1.7)
  size: 0.04, // Slightly smaller for more subtle effect
  color: "#ffffff",
  opacity: 0.35,
  spread: 60, // Larger spread for more immersive feel
  speed: 0.08, // Slightly slower for gentler motion
};

/** Bloom post-processing configuration for luminous node appearance (Requirements 2.1, 2.5) */
interface BloomConfig {
  /** Bloom intensity */
  intensity: number;
  /** Luminance threshold - pixels brighter than this will bloom */
  luminanceThreshold: number;
  /** Luminance smoothing */
  luminanceSmoothing: number;
  /** Mipmap blur - enables smoother bloom */
  mipmapBlur: boolean;
}

const DEFAULT_BLOOM_CONFIG: BloomConfig = {
  // Slightly reduced intensity to prevent over-saturation (Requirement 51.2)
  intensity: 1.2,
  // Increased threshold to reduce bloom on dark areas (Requirement 51.2)
  luminanceThreshold: 0.3,
  luminanceSmoothing: 0.9,
  mipmapBlur: true,
};

/** Depth of field configuration for visual hierarchy (Requirement 1.5) */
interface DepthOfFieldConfig {
  /** Focus distance from camera */
  focusDistance: number;
  /** Focal length */
  focalLength: number;
  /** Bokeh scale (blur amount) */
  bokehScale: number;
  /** Whether DOF is enabled */
  enabled: boolean;
}

const DEFAULT_DOF_CONFIG: DepthOfFieldConfig = {
  // Focus on objects at medium distance (where current/hovered nodes typically are)
  // Note: Values normalized to 0-1 range where 0 = near plane, 1 = far plane
  focusDistance: 0.01,
  // Moderate focal length for natural-looking blur
  focalLength: 0.02,
  // Bokeh scale controls blur intensity - lower values for subtler effect
  bokehScale: 2,
  // Disabled by default as it can cause rendering issues on some systems
  enabled: false,
};

/** Chromatic aberration configuration for cinematic edge effect (Requirements 34.1) */
interface ChromaticAberrationConfig {
  /** Offset amount for color channel separation */
  offset: [number, number];
  /** Whether to apply radial modulation (stronger at edges) */
  radialModulation: boolean;
  /** Modulation offset for radial effect */
  modulationOffset: number;
  /** Whether effect is enabled */
  enabled: boolean;
}

const DEFAULT_CHROMATIC_ABERRATION_CONFIG: ChromaticAberrationConfig = {
  // Subtle offset for cinematic feel without being distracting
  offset: [0.0008, 0.0008],
  // Apply stronger effect at screen edges
  radialModulation: true,
  modulationOffset: 0.5,
  enabled: true,
};

/** Vignette configuration for focus effect (Requirements 34.2) */
interface VignetteConfig {
  /** Offset from center where vignette starts */
  offset: number;
  /** Darkness intensity of vignette */
  darkness: number;
  /** Whether effect is enabled */
  enabled: boolean;
}

const DEFAULT_VIGNETTE_CONFIG: VignetteConfig = {
  // Start vignette at 35% from center for softer edge
  offset: 0.35,
  // Reduced darkness to prevent black foreground artifacts (Requirement 51.1, 51.2)
  darkness: 0.35,
  enabled: true,
};

/** Film grain/noise configuration for cinematic feel (Requirements 34.1) */
interface NoiseConfig {
  /** Opacity of the noise effect */
  opacity: number;
  /** Whether effect is enabled */
  enabled: boolean;
}

const DEFAULT_NOISE_CONFIG: NoiseConfig = {
  // Disabled - grain effect doesn't look good
  opacity: 0,
  enabled: false,
};

// ============================================================================
// Scene Content Component
// ============================================================================

interface SceneContentProps {
  sceneConfig: SceneConfig;
  particleConfig: ParticleSystemConfig;
  bloomConfig: BloomConfig;
  dofConfig: DepthOfFieldConfig;
  chromaticAberrationConfig: ChromaticAberrationConfig;
  vignetteConfig: VignetteConfig;
  noiseConfig: NoiseConfig;
  viewMode: MemoryGraphSceneProps["viewMode"];
  debug?: boolean | undefined;
  onNodeClick?: ((nodeId: string) => void) | undefined;
  onNodeHover?: ((nodeId: string | null) => void) | undefined;
  /** Target position for warp transition */
  warpTargetPosition?: [number, number, number] | null | undefined;
  /** Target node ID for warp transition */
  warpTargetNodeId?: string | null | undefined;
  /** Trigger counter for warp transition */
  warpTrigger?: number | undefined;
  /** Callback when warp starts */
  onWarpStart?: ((nodeId: string) => void) | undefined;
  /** Callback when warp completes */
  onWarpComplete?: ((nodeId: string) => void) | undefined;
  /** Use neural network visual style (Requirements: 25.1-25.6) */
  useNeuralStyle?: boolean | undefined;
  /** Callback when clicking outside any node (Requirements: 26.4) */
  onBackgroundClick?: (() => void) | undefined;
  /** IDs of nodes to show (for tag filtering). If undefined, show all nodes. (Requirements: 42.3, 42.4) */
  filteredNodeIds?: string[] | undefined;
  /** IDs of nodes to highlight (for tag hover). (Requirement: 42.6) */
  highlightedNodeIds?: string[] | undefined;
  /** Whether light mode is active (for node color visibility) */
  lightMode?: boolean | undefined;
}

function SceneContent({
  sceneConfig,
  particleConfig,
  bloomConfig,
  dofConfig: _dofConfig,
  chromaticAberrationConfig,
  vignetteConfig,
  noiseConfig,
  viewMode = "fly",
  debug = false,
  onNodeClick,
  onNodeHover,
  warpTargetPosition,
  warpTargetNodeId,
  warpTrigger = 0,
  onWarpStart,
  onWarpComplete,
  lightMode = false,
  useNeuralStyle = true,
  onBackgroundClick,
  filteredNodeIds,
  highlightedNodeIds,
}: SceneContentProps): React.ReactElement {
  // Get graph data from store
  const { currentNodeId, currentNode, neighbors: allNeighbors } = useGraphStore();

  // Filter neighbors by tag selection (Requirements: 42.3, 42.4)
  const neighbors = useMemo(() => {
    // If no filter is applied, show all neighbors
    if (filteredNodeIds === undefined || filteredNodeIds.length === 0) {
      return allNeighbors;
    }
    // Create a set for O(1) lookup
    const filteredSet = new Set(filteredNodeIds);
    return allNeighbors.filter((neighbor) => filteredSet.has(neighbor.id));
  }, [allNeighbors, filteredNodeIds]);

  // Create a set of highlighted node IDs for O(1) lookup (Requirement: 42.6)
  // Used for tag hover highlighting - nodes matching the hovered tag get visual emphasis
  const highlightedSet = useMemo(() => {
    return new Set(highlightedNodeIds ?? []);
  }, [highlightedNodeIds]);

  // Track hovered node/edge
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // Handle background click (Requirement 26.4)
  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.();
  }, [onBackgroundClick]);

  // Get edges from store for connection counting
  const { edges } = useGraphStore();

  // Calculate connection counts for each node (Requirements: 39.2, 39.3, 43.5)
  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>();

    // Count connections for current node
    if (currentNodeId !== null && currentNodeId !== "") {
      const currentNodeConnections = edges.filter(
        (e) => e.source === currentNodeId || e.target === currentNodeId
      ).length;
      counts.set(currentNodeId, currentNodeConnections);
    }

    // Count connections for each neighbor
    neighbors.forEach((neighbor: NeighborNode) => {
      const neighborConnections = edges.filter(
        (e) => e.source === neighbor.id || e.target === neighbor.id
      ).length;
      counts.set(neighbor.id, neighborConnections);
    });

    return counts;
  }, [currentNodeId, neighbors, edges]);

  // Get current node's connection count for radial layout transition
  const currentNodeConnectionCount =
    currentNodeId !== null && currentNodeId !== "" ? (connectionCounts.get(currentNodeId) ?? 0) : 0;

  // Get neighbor IDs for layout calculation
  const neighborIds = useMemo(() => neighbors.map((n) => n.id), [neighbors]);

  // Use radial layout transition hook for smooth hub navigation (Requirements: 43.4)
  const { nodePositions, transitionToNode, setPositionsImmediate } = useRadialLayoutTransition({
    duration: 600,
    easing: "easeInOut",
    // Compact radii for shorter edges to fit more memories on screen
    radialRadius: 3.5,
    sphereRadius: 5,
    addYVariation: true,
  });

  // Trigger layout transition when current node or neighbors change
  useEffect(() => {
    if (currentNodeId !== null && currentNodeId !== "" && neighborIds.length > 0) {
      // Use transition for navigation, immediate for initial load
      if (nodePositions.size === 0) {
        setPositionsImmediate(currentNodeId, neighborIds, currentNodeConnectionCount);
      } else {
        transitionToNode(currentNodeId, neighborIds, currentNodeConnectionCount);
      }
    }
  }, [
    currentNodeId,
    neighborIds,
    currentNodeConnectionCount,
    nodePositions.size,
    setPositionsImmediate,
    transitionToNode,
  ]);

  // Create fog
  const fog = useMemo(
    () => new THREE.Fog(sceneConfig.fogColor, sceneConfig.fogNear, sceneConfig.fogFar),
    [sceneConfig.fogColor, sceneConfig.fogNear, sceneConfig.fogFar]
  );

  // Node click handler - manages expansion state (Requirements: 26.1, 26.6)
  // Node click handler
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      onNodeClick?.(nodeId);
    },
    [onNodeClick]
  );

  // Node hover handler
  const handleNodeHover = useCallback(
    (nodeId: string, hovered: boolean) => {
      const newHoveredId = hovered ? nodeId : null;
      setHoveredNodeId(newHoveredId);
      onNodeHover?.(newHoveredId);
    },
    [onNodeHover]
  );

  // Edge hover handler
  const handleEdgeHover = useCallback((edgeId: string, hovered: boolean) => {
    setHoveredEdgeId(hovered ? edgeId : null);
  }, []);

  // Truncate content for preview
  const truncateContent = (content: string, maxLength: number = 50): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength - 3) + "...";
  };

  return (
    <>
      {/* Scene fog for depth effect (Requirement 1.5) */}
      <primitive object={fog} attach="fog" />

      {/* Ambient lighting */}
      <ambientLight
        intensity={sceneConfig.ambientLightIntensity}
        color={sceneConfig.ambientLightColor}
      />

      {/* Point light at center for subtle glow */}
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#00ffff" distance={20} decay={2} />

      {/* Camera controller */}
      <CameraController viewMode={viewMode} enabled={true} />

      {/* Warp navigator for smooth transitions between nodes (Requirements 4.1-4.5) */}
      <WarpNavigator
        targetPosition={warpTargetPosition}
        targetNodeId={warpTargetNodeId}
        warpTrigger={warpTrigger}
        onWarpStart={onWarpStart}
        onWarpComplete={onWarpComplete}
      />

      {/* Nebula background for cosmic atmosphere (Requirements 34.3) */}
      <NebulaBg enableAnimation={true} opacity={0.35} />

      {/* Star field background layer with parallax (Requirements 34.3, 1.7) */}
      <StarField enableTwinkle={true} enableParallax={true} density={1.2} />

      {/* Enhanced ambient particle system for atmosphere (Requirement 1.7) */}
      {/* Features: denser particles, subtle color variation (cyan/purple/white), gentle floating animation */}
      <AmbientParticles config={particleConfig} colorVariation={true} density={1.5} />

      {/* Current node at center (if exists) - Neural or Standard style (Requirements 25.1, 26.1-26.6, 39.2, 42.6, 43.5) */}
      {currentNode &&
        (useNeuralStyle ? (
          <NeuronNode3D
            id={currentNode.id}
            content={currentNode.content}
            contentPreview={truncateContent(currentNode.content)}
            primarySector={currentNode.primarySector}
            salience={currentNode.salience}
            strength={currentNode.strength}
            position={[0, 0, 0]}
            isCurrent={true}
            isHovered={hoveredNodeId === currentNode.id}
            isHighlighted={highlightedSet.has(currentNode.id)}
            connectionCount={connectionCounts.get(currentNode.id) ?? 0}
            lightMode={lightMode}
            onClick={(): void => {
              handleNodeClick(currentNode.id);
            }}
            onHover={(hovered: boolean): void => {
              handleNodeHover(currentNode.id, hovered);
            }}
          />
        ) : (
          <MemoryNode3D
            id={currentNode.id}
            content={currentNode.content}
            contentPreview={truncateContent(currentNode.content)}
            primarySector={currentNode.primarySector}
            salience={currentNode.salience}
            strength={currentNode.strength}
            position={[0, 0, 0]}
            isCurrent={true}
            isHovered={hoveredNodeId === currentNode.id}
            isHighlighted={highlightedSet.has(currentNode.id)}
            lightMode={lightMode}
            onClick={(): void => {
              handleNodeClick(currentNode.id);
            }}
            onHover={(hovered: boolean): void => {
              handleNodeHover(currentNode.id, hovered);
            }}
          />
        ))}

      {/* Neighbor nodes distributed around center (Requirements 1.2, 2.1-2.7, 25.1, 26.1-26.6, 39.2, 42.6, 43.5) */}
      {neighbors.map((neighbor: NeighborNode) => {
        const position = nodePositions.get(neighbor.id) ?? [0, 0, 0];

        // Check if this neighbor is highlighted from tag hover (Requirement 42.6)
        const isNeighborHighlighted = highlightedSet.has(neighbor.id);
        return useNeuralStyle ? (
          <NeuronNode3D
            key={neighbor.id}
            id={neighbor.id}
            content={neighbor.content}
            contentPreview={truncateContent(neighbor.content)}
            primarySector={neighbor.primarySector}
            salience={neighbor.salience}
            strength={neighbor.strength}
            position={position}
            isCurrent={false}
            isHovered={hoveredNodeId === neighbor.id}
            isHighlighted={isNeighborHighlighted}
            connectionCount={connectionCounts.get(neighbor.id) ?? 0}
            lightMode={lightMode}
            onClick={(): void => {
              handleNodeClick(neighbor.id);
            }}
            onHover={(hovered: boolean): void => {
              handleNodeHover(neighbor.id, hovered);
            }}
          />
        ) : (
          <MemoryNode3D
            key={neighbor.id}
            id={neighbor.id}
            content={neighbor.content}
            contentPreview={truncateContent(neighbor.content)}
            primarySector={neighbor.primarySector}
            salience={neighbor.salience}
            strength={neighbor.strength}
            position={position}
            isCurrent={false}
            isHovered={hoveredNodeId === neighbor.id}
            isHighlighted={isNeighborHighlighted}
            lightMode={lightMode}
            onClick={(): void => {
              handleNodeClick(neighbor.id);
            }}
            onHover={(hovered: boolean): void => {
              handleNodeHover(neighbor.id, hovered);
            }}
          />
        );
      })}

      {/* Edges connecting current node to neighbors (Requirements 3.1-3.6, 25.2-25.6, 43.3) */}
      {/* Only render edges for actual waypoint links in data (Requirements 25.4, 25.5) */}
      {currentNodeId !== null &&
        currentNodeId !== "" &&
        neighbors
          .filter((neighbor: NeighborNode) => isValidEdge(neighbor.edge))
          .map((neighbor: NeighborNode) => {
            const targetPosition = nodePositions.get(neighbor.id) ?? [0, 0, 0];
            const edgeId = `${currentNodeId}-${neighbor.id}`;
            // Determine if this is a hub connection (Requirements: 43.3)
            // An edge is a hub connection if either the source or target node is a hub
            const currentNodeConnections = connectionCounts.get(currentNodeId) ?? 0;
            const neighborConnections = connectionCounts.get(neighbor.id) ?? 0;
            const isHubConnection =
              isHubNode(currentNodeConnections) || isHubNode(neighborConnections);
            return useNeuralStyle ? (
              <AxonEdge3D
                key={edgeId}
                sourcePosition={[0, 0, 0]}
                targetPosition={targetPosition}
                edge={neighbor.edge}
                isHovered={hoveredEdgeId === edgeId}
                onHover={(hovered: boolean): void => {
                  handleEdgeHover(edgeId, hovered);
                }}
                bidirectional={false}
                isHubConnection={isHubConnection}
                lightMode={lightMode}
              />
            ) : (
              <Edge3D
                key={edgeId}
                sourcePosition={[0, 0, 0]}
                targetPosition={targetPosition}
                edge={neighbor.edge}
                isHovered={hoveredEdgeId === edgeId}
                onHover={(hovered: boolean): void => {
                  handleEdgeHover(edgeId, hovered);
                }}
                bidirectional={false}
                isHubConnection={isHubConnection}
                lightMode={lightMode}
              />
            );
          })}

      {/* Invisible background plane to capture clicks outside nodes (Requirement 26.4) */}
      {/* This large sphere captures clicks that miss all other objects */}
      {/* Using renderOrder and proper material settings to prevent visual artifacts (Requirement 51.5) */}
      <mesh onClick={handleBackgroundClick} visible={false} renderOrder={-200}>
        <sphereGeometry args={[500, 16, 16]} />
        <meshBasicMaterial
          side={THREE.BackSide}
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
          colorWrite={false}
        />
      </mesh>

      {/* Debug helpers */}
      {debug && (
        <>
          <axesHelper args={[5]} />
          <gridHelper args={[20, 20, "#333333", "#222222"]} />
        </>
      )}

      {/* Post-processing effects for luminous appearance (Requirements 2.1, 2.5, 1.5, 34.1, 34.2) */}
      {/* Using multisampling=0, explicit frameBufferType, and autoClear to prevent flickering black cover artifacts */}
      <EffectComposer multisampling={0} frameBufferType={THREE.HalfFloatType} autoClear={false}>
        {/* Bloom for luminous node glow */}
        <Bloom
          intensity={bloomConfig.intensity}
          luminanceThreshold={bloomConfig.luminanceThreshold}
          luminanceSmoothing={bloomConfig.luminanceSmoothing}
          mipmapBlur={bloomConfig.mipmapBlur}
        />

        {/* Chromatic aberration at screen edges for cinematic feel (Requirement 34.1) */}
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={
            new THREE.Vector2(
              chromaticAberrationConfig.enabled ? chromaticAberrationConfig.offset[0] : 0,
              chromaticAberrationConfig.enabled ? chromaticAberrationConfig.offset[1] : 0
            )
          }
          radialModulation={chromaticAberrationConfig.radialModulation}
          modulationOffset={chromaticAberrationConfig.modulationOffset}
        />

        {/* Vignette for focus effect (Requirement 34.2) */}
        <Vignette
          offset={vignetteConfig.enabled ? vignetteConfig.offset : 0}
          darkness={vignetteConfig.enabled ? vignetteConfig.darkness : 0}
          blendFunction={BlendFunction.NORMAL}
        />

        {/* Subtle film grain for cinematic texture (Requirement 34.1) */}
        {/* Using SCREEN blend mode to prevent flickering black cover artifacts (Requirement 51.2) */}
        {/* SOFT_LIGHT can cause flickering on some GPUs/browsers */}
        <Noise
          opacity={noiseConfig.enabled ? noiseConfig.opacity : 0}
          blendFunction={BlendFunction.SCREEN}
        />
      </EffectComposer>

      {/* Preload assets */}
      <Preload all />
    </>
  );
}

// ============================================================================
// Loading Fallback
// ============================================================================

function LoadingFallback(): React.ReactElement {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="#00ffff" wireframe />
    </mesh>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export interface MemoryGraphSceneFullProps extends MemoryGraphSceneProps {
  /** Scene configuration overrides */
  sceneConfig?: Partial<SceneConfig>;
  /** Camera configuration overrides */
  cameraConfig?: Partial<CameraConfig>;
  /** Particle system configuration overrides */
  particleConfig?: Partial<ParticleSystemConfig>;
  /** Bloom post-processing configuration overrides */
  bloomConfig?: Partial<BloomConfig>;
  /** Depth of field configuration overrides */
  dofConfig?: Partial<DepthOfFieldConfig>;
  /** Chromatic aberration configuration overrides (Requirements 34.1) */
  chromaticAberrationConfig?: Partial<ChromaticAberrationConfig>;
  /** Vignette configuration overrides (Requirements 34.2) */
  vignetteConfig?: Partial<VignetteConfig>;
  /** Film grain/noise configuration overrides (Requirements 34.1) */
  noiseConfig?: Partial<NoiseConfig>;
  /** CSS class name for the canvas container */
  className?: string;
  /** Target position for warp transition */
  warpTargetPosition?: [number, number, number] | null;
  /** Target node ID for warp transition */
  warpTargetNodeId?: string | null;
  /** Trigger counter for warp transition (increment to trigger) */
  warpTrigger?: number;
  /** Callback when warp transition starts */
  onWarpStart?: (nodeId: string) => void;
  /** Callback when warp transition completes */
  onWarpComplete?: (nodeId: string) => void;
  /** Use neural network visual style (Requirements: 25.1-25.6) */
  useNeuralStyle?: boolean;
  /** Callback when clicking outside any node (Requirements: 26.4) */
  onBackgroundClick?: () => void;
  /** IDs of nodes to show (for tag filtering). If undefined, show all nodes. (Requirements: 42.3, 42.4) */
  filteredNodeIds?: string[] | undefined;
  /** IDs of nodes to highlight (for tag hover). (Requirement: 42.6) */
  highlightedNodeIds?: string[] | undefined;
}

export function MemoryGraphScene({
  viewMode = "fly",
  debug = false,
  onNodeClick,
  onNodeHover,
  sceneConfig: sceneConfigOverrides = {},
  cameraConfig: cameraConfigOverrides = {},
  particleConfig: particleConfigOverrides = {},
  bloomConfig: bloomConfigOverrides = {},
  dofConfig: dofConfigOverrides = {},
  chromaticAberrationConfig: chromaticAberrationConfigOverrides = {},
  vignetteConfig: vignetteConfigOverrides = {},
  noiseConfig: noiseConfigOverrides = {},
  className = "",
  warpTargetPosition = null,
  warpTargetNodeId = null,
  warpTrigger = 0,
  onWarpStart,
  onWarpComplete,
  useNeuralStyle = true,
  onBackgroundClick,
  filteredNodeIds,
  highlightedNodeIds,
}: MemoryGraphSceneFullProps): React.ReactElement {
  // Get theme for background color
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const getTheme = useThemeStore((state) => state.getTheme);

  // Determine if we're in light mode based on theme
  // getTheme() is fast and component re-renders when currentTheme changes via store subscription
  const isLightMode = getTheme().isLight;

  // Merge configurations with defaults, using theme background
  // Light mode uses much less fog for better visibility
  // Note: currentTheme is intentionally included to trigger recalculation when theme changes
  const sceneConfig = useMemo(() => {
    const theme = getTheme();
    return {
      ...DEFAULT_SCENE_CONFIG,
      backgroundColor: theme.colors.background,
      fogColor: theme.colors.background,
      // Reduce fog intensity in light mode - push fog much further away
      fogNear: isLightMode ? 80 : DEFAULT_SCENE_CONFIG.fogNear,
      fogFar: isLightMode ? 500 : DEFAULT_SCENE_CONFIG.fogFar,
      // Increase ambient light in light mode for better visibility
      ambientLightIntensity: isLightMode ? 1.0 : DEFAULT_SCENE_CONFIG.ambientLightIntensity,
      ...sceneConfigOverrides,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneConfigOverrides, currentTheme, getTheme, isLightMode]);

  const cameraConfig = useMemo(
    () => ({ ...DEFAULT_CAMERA_CONFIG, ...cameraConfigOverrides }),
    [cameraConfigOverrides]
  );

  const particleConfig = useMemo(
    () => ({ ...DEFAULT_PARTICLE_CONFIG, ...particleConfigOverrides }),
    [particleConfigOverrides]
  );

  const bloomConfig = useMemo(
    () => ({ ...DEFAULT_BLOOM_CONFIG, ...bloomConfigOverrides }),
    [bloomConfigOverrides]
  );

  const dofConfig = useMemo(
    () => ({ ...DEFAULT_DOF_CONFIG, ...dofConfigOverrides }),
    [dofConfigOverrides]
  );

  const chromaticAberrationConfig = useMemo(
    () => ({ ...DEFAULT_CHROMATIC_ABERRATION_CONFIG, ...chromaticAberrationConfigOverrides }),
    [chromaticAberrationConfigOverrides]
  );

  const vignetteConfig = useMemo(
    () => ({ ...DEFAULT_VIGNETTE_CONFIG, ...vignetteConfigOverrides }),
    [vignetteConfigOverrides]
  );

  const noiseConfig = useMemo(
    () => ({ ...DEFAULT_NOISE_CONFIG, ...noiseConfigOverrides }),
    [noiseConfigOverrides]
  );

  return (
    <div className={`w-full h-full ${className}`} data-testid="memory-graph-scene">
      <Canvas
        // Key changes with theme to force re-render and apply new colors (Requirement: theme refresh)
        key={`canvas-${currentTheme}`}
        camera={{
          fov: cameraConfig.fov,
          near: cameraConfig.near,
          far: cameraConfig.far,
          position: cameraConfig.position,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          stencil: true,
          depth: true,
          // Ensure proper pixel ratio handling for resize (Requirement 51.6)
          preserveDrawingBuffer: false,
        }}
        // Use device pixel ratio with bounds to prevent visual corruption on resize (Requirement 51.6)
        dpr={[1, Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1)]}
        style={{ background: sceneConfig.backgroundColor }}
        // Enable automatic resize handling (Requirement 51.6)
        resize={{ scroll: false, debounce: { scroll: 50, resize: 50 } }}
        onCreated={({ gl }) => {
          gl.setClearColor(sceneConfig.backgroundColor);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          // Ensure proper clear behavior to prevent visual artifacts (Requirement 51.1)
          gl.autoClear = true;
          gl.autoClearColor = true;
          gl.autoClearDepth = true;
          gl.autoClearStencil = true;
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent
            sceneConfig={sceneConfig}
            particleConfig={particleConfig}
            bloomConfig={bloomConfig}
            dofConfig={dofConfig}
            chromaticAberrationConfig={chromaticAberrationConfig}
            vignetteConfig={vignetteConfig}
            noiseConfig={noiseConfig}
            viewMode={viewMode}
            debug={debug}
            onNodeClick={onNodeClick}
            onNodeHover={onNodeHover}
            warpTargetPosition={warpTargetPosition}
            warpTargetNodeId={warpTargetNodeId}
            warpTrigger={warpTrigger}
            onWarpStart={onWarpStart}
            onWarpComplete={onWarpComplete}
            useNeuralStyle={useNeuralStyle}
            onBackgroundClick={onBackgroundClick}
            filteredNodeIds={filteredNodeIds}
            highlightedNodeIds={highlightedNodeIds}
            lightMode={isLightMode}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default MemoryGraphScene;
