/**
 * 3D Scene Type Definitions
 *
 * TypeScript interfaces for 3D scene components and rendering.
 * Requirements: 1.1, 1.5, 1.6, 1.7, 12.1, 12.2
 */

import type { GraphEdge, MemorySectorType } from './api';

// ============================================================================
// View Mode Types (Requirements: 12.1-12.4)
// ============================================================================

export type ViewMode = 'fly' | 'orbit' | 'timeline' | 'cluster';

// ============================================================================
// Camera Types
// ============================================================================

export interface CameraConfig {
  /** Field of view in degrees */
  fov: number;
  /** Near clipping plane */
  near: number;
  /** Far clipping plane */
  far: number;
  /** Initial position [x, y, z] */
  position: [number, number, number];
}

export interface CameraControlsConfig {
  /** Enable damping for smooth movement */
  enableDamping: boolean;
  /** Damping factor (0-1) */
  dampingFactor: number;
  /** Rotation speed */
  rotateSpeed: number;
  /** Minimum distance from target (orbit mode) */
  minDistance: number;
  /** Maximum distance from target (orbit mode) */
  maxDistance: number;
}

// ============================================================================
// Scene Configuration Types
// ============================================================================

export interface SceneConfig {
  /** Background color (hex) */
  backgroundColor: string;
  /** Fog color (hex) */
  fogColor: string;
  /** Fog near distance */
  fogNear: number;
  /** Fog far distance */
  fogFar: number;
  /** Ambient light intensity */
  ambientLightIntensity: number;
  /** Ambient light color (hex) */
  ambientLightColor: string;
}

export interface ParticleSystemConfig {
  /** Number of particles */
  count: number;
  /** Particle size */
  size: number;
  /** Particle color (hex) */
  color: string;
  /** Particle opacity */
  opacity: number;
  /** Spread radius */
  spread: number;
  /** Animation speed */
  speed: number;
}

// ============================================================================
// Memory Node Display Types
// ============================================================================

export interface MemoryNodeDisplayProps {
  /** Unique node ID */
  id: string;
  /** Node content */
  content: string;
  /** Content preview for label */
  contentPreview: string;
  /** Primary memory sector */
  primarySector: MemorySectorType;
  /** Salience value (0-1) */
  salience: number;
  /** Strength value (0-1) */
  strength: number;
  /** 3D position [x, y, z] */
  position: [number, number, number];
  /** Whether this is the current/focused node */
  isCurrent: boolean;
  /** Whether this node is hovered */
  isHovered: boolean;
  /** Click handler */
  onClick: () => void;
  /** Hover state change handler */
  onHover: (hovered: boolean) => void;
}

// ============================================================================
// Edge Display Types
// ============================================================================

export interface EdgeDisplayProps {
  /** Source node position */
  sourcePosition: [number, number, number];
  /** Target node position */
  targetPosition: [number, number, number];
  /** Edge data */
  edge: GraphEdge;
  /** Whether this edge is hovered */
  isHovered: boolean;
  /** Hover state change handler */
  onHover: (hovered: boolean) => void;
}

// ============================================================================
// Scene Props Types
// ============================================================================

export interface MemoryGraphSceneProps {
  /** Current node ID */
  currentNodeId: string | null;
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Callback when a node is hovered */
  onNodeHover?: (nodeId: string | null) => void;
  /** Current view mode */
  viewMode?: ViewMode;
  /** Whether to show debug helpers */
  debug?: boolean;
  /** IDs of nodes to show (for tag filtering). If undefined, show all nodes. (Requirements: 42.3, 42.4) */
  filteredNodeIds?: string[] | undefined;
  /** IDs of nodes to highlight (for tag hover). (Requirement: 42.6) */
  highlightedNodeIds?: string[] | undefined;
}

export interface CameraControlsProps {
  /** Current view mode */
  viewMode: ViewMode;
  /** Target position for orbit mode */
  target?: [number, number, number];
  /** Whether controls are enabled */
  enabled?: boolean;
  /** Callback when camera moves */
  onCameraMove?: () => void;
}

// ============================================================================
// Animation Types
// ============================================================================

export interface TransitionConfig {
  /** Transition duration in milliseconds */
  duration: number;
  /** Easing function name */
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface WarpTransitionConfig extends TransitionConfig {
  /** Enable motion blur during warp */
  enableMotionBlur: boolean;
  /** Motion blur intensity */
  motionBlurIntensity: number;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  fov: 75,
  near: 0.1,
  far: 1000,
  position: [0, 5, 15], // Position camera outside center node to see all nodes on load (Requirement 1.1)
};

export const DEFAULT_CAMERA_CONTROLS_CONFIG: CameraControlsConfig = {
  enableDamping: true,
  dampingFactor: 0.05,
  rotateSpeed: 0.5,
  minDistance: 2,
  maxDistance: 50,
};

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  backgroundColor: '#0a0a0f',
  fogColor: '#0a0a0f',
  fogNear: 10,
  fogFar: 100,
  ambientLightIntensity: 0.4,
  ambientLightColor: '#ffffff',
};

export const DEFAULT_PARTICLE_CONFIG: ParticleSystemConfig = {
  count: 500,
  size: 0.05,
  color: '#ffffff',
  opacity: 0.3,
  spread: 50,
  speed: 0.1,
};

export const DEFAULT_WARP_TRANSITION: WarpTransitionConfig = {
  duration: 1000,
  easing: 'easeInOut',
  enableMotionBlur: true,
  motionBlurIntensity: 0.5,
};
