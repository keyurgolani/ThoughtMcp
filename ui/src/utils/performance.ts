/**
 * Performance Utilities
 *
 * Utility functions for performance optimizations including
 * Level-of-Detail (LOD) calculations, distance-based rendering,
 * and frame rate management.
 *
 * Requirements: 11.1, 11.3, 11.5, 11.6
 */

// ============================================================================
// LOD Configuration (Requirements: 11.1)
// ============================================================================

export interface LODLevel {
  /** Maximum distance for this LOD level */
  maxDistance: number;
  /** Number of sphere segments for geometry */
  segments: number;
  /** Whether to show labels at this LOD */
  showLabel: boolean;
  /** Whether to show glow effects */
  showGlow: boolean;
  /** Opacity multiplier for this level */
  opacityMultiplier: number;
}

/** Default LOD levels for memory nodes */
export const DEFAULT_LOD_LEVELS: LODLevel[] = [
  { maxDistance: 10, segments: 32, showLabel: true, showGlow: true, opacityMultiplier: 1.0 },
  { maxDistance: 25, segments: 16, showLabel: true, showGlow: true, opacityMultiplier: 0.9 },
  { maxDistance: 50, segments: 8, showLabel: false, showGlow: false, opacityMultiplier: 0.7 },
  { maxDistance: 100, segments: 4, showLabel: false, showGlow: false, opacityMultiplier: 0.5 },
  { maxDistance: Infinity, segments: 4, showLabel: false, showGlow: false, opacityMultiplier: 0.3 },
];

/**
 * Calculate the appropriate LOD level based on distance from camera
 *
 * @param distance - Distance from camera to object
 * @param lodLevels - Array of LOD level configurations
 * @returns The appropriate LOD level for the given distance
 */
export function calculateLODLevel(
  distance: number,
  lodLevels: LODLevel[] = DEFAULT_LOD_LEVELS
): LODLevel {
  for (const level of lodLevels) {
    if (distance <= level.maxDistance) {
      return level;
    }
  }
  // Return the last level (furthest) as fallback
  const lastLevel = lodLevels[lodLevels.length - 1];
  const defaultLastLevel = DEFAULT_LOD_LEVELS[DEFAULT_LOD_LEVELS.length - 1];
  if (lastLevel) {
    return lastLevel;
  }
  if (defaultLastLevel) {
    return defaultLastLevel;
  }
  // Ultimate fallback - should never reach here
  return {
    maxDistance: Infinity,
    segments: 4,
    showLabel: false,
    showGlow: false,
    opacityMultiplier: 0.3,
  };
}

/**
 * Get the LOD level index for a given distance
 *
 * @param distance - Distance from camera to object
 * @param lodLevels - Array of LOD level configurations
 * @returns The index of the appropriate LOD level
 */
export function getLODLevelIndex(
  distance: number,
  lodLevels: LODLevel[] = DEFAULT_LOD_LEVELS
): number {
  for (let i = 0; i < lodLevels.length; i++) {
    const level = lodLevels[i];
    if (level && distance <= level.maxDistance) {
      return i;
    }
  }
  return lodLevels.length - 1;
}

// ============================================================================
// Clustering Configuration (Requirements: 11.3)
// ============================================================================

/** Threshold for when to start clustering nodes */
export const CLUSTERING_THRESHOLD = 1000;

/** Minimum nodes in a cluster */
export const MIN_CLUSTER_SIZE = 5;

/** Maximum clusters to create */
export const MAX_CLUSTERS = 50;

export interface ClusterConfig {
  /** Threshold for when to start clustering */
  threshold: number;
  /** Minimum nodes per cluster */
  minSize: number;
  /** Maximum number of clusters */
  maxClusters: number;
  /** Distance threshold for grouping nodes */
  distanceThreshold: number;
}

export const DEFAULT_CLUSTER_CONFIG: ClusterConfig = {
  threshold: CLUSTERING_THRESHOLD,
  minSize: MIN_CLUSTER_SIZE,
  maxClusters: MAX_CLUSTERS,
  distanceThreshold: 15,
};

/**
 * Determine if clustering should be enabled based on node count
 *
 * @param nodeCount - Number of visible nodes
 * @param threshold - Clustering threshold (default: 1000)
 * @returns Whether clustering should be enabled
 */
export function shouldEnableClustering(
  nodeCount: number,
  threshold: number = CLUSTERING_THRESHOLD
): boolean {
  return nodeCount > threshold;
}

// ============================================================================
// Progressive Loading Configuration (Requirements: 11.5)
// ============================================================================

export interface LoadingPriority {
  /** Node ID */
  nodeId: string;
  /** Distance from current node */
  distance: number;
  /** Priority score (lower = higher priority) */
  priority: number;
}

/**
 * Calculate loading priority based on distance
 * Closer nodes have higher priority (lower number)
 *
 * @param distance - Distance from current node
 * @param maxDistance - Maximum distance to consider
 * @returns Priority score (0-1, lower = higher priority)
 */
export function calculateLoadingPriority(distance: number, maxDistance: number = 100): number {
  if (distance <= 0) return 0;
  if (distance >= maxDistance) return 1;
  return distance / maxDistance;
}

/**
 * Sort nodes by loading priority (closest first)
 *
 * @param nodes - Array of nodes with distances
 * @returns Sorted array with closest nodes first
 */
export function sortByLoadingPriority<T extends { distance: number }>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => a.distance - b.distance);
}

// ============================================================================
// Frame Rate Control (Requirements: 11.6)
// ============================================================================

export interface FrameRateConfig {
  /** Target frame rate when active */
  activeFrameRate: number;
  /** Target frame rate when idle */
  idleFrameRate: number;
  /** Time in ms before considering user idle */
  idleTimeout: number;
  /** Transition duration in ms */
  transitionDuration: number;
}

export const DEFAULT_FRAME_RATE_CONFIG: FrameRateConfig = {
  activeFrameRate: 60,
  idleFrameRate: 15,
  idleTimeout: 3000,
  transitionDuration: 500,
};

/**
 * Calculate the frame interval for a target frame rate
 *
 * @param frameRate - Target frames per second
 * @returns Interval in milliseconds between frames
 */
export function calculateFrameInterval(frameRate: number): number {
  if (frameRate <= 0) return 1000 / DEFAULT_FRAME_RATE_CONFIG.activeFrameRate;
  return 1000 / frameRate;
}

/**
 * Interpolate between two frame rates for smooth transition
 *
 * @param currentRate - Current frame rate
 * @param targetRate - Target frame rate
 * @param progress - Transition progress (0-1)
 * @returns Interpolated frame rate
 */
export function interpolateFrameRate(
  currentRate: number,
  targetRate: number,
  progress: number
): number {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return currentRate + (targetRate - currentRate) * clampedProgress;
}

// ============================================================================
// Distance Calculations
// ============================================================================

/**
 * Calculate 3D distance between two points
 *
 * @param p1 - First point [x, y, z]
 * @param p2 - Second point [x, y, z]
 * @returns Euclidean distance
 */
export function calculateDistance(
  p1: [number, number, number],
  p2: [number, number, number]
): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate squared distance (faster, for comparisons)
 *
 * @param p1 - First point [x, y, z]
 * @param p2 - Second point [x, y, z]
 * @returns Squared Euclidean distance
 */
export function calculateDistanceSquared(
  p1: [number, number, number],
  p2: [number, number, number]
): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  return dx * dx + dy * dy + dz * dz;
}

// ============================================================================
// Visibility Culling
// ============================================================================

/**
 * Check if a point is within a spherical frustum
 *
 * @param point - Point to check [x, y, z]
 * @param cameraPosition - Camera position [x, y, z]
 * @param maxDistance - Maximum visible distance
 * @returns Whether the point is potentially visible
 */
export function isWithinViewDistance(
  point: [number, number, number],
  cameraPosition: [number, number, number],
  maxDistance: number
): boolean {
  const distSq = calculateDistanceSquared(point, cameraPosition);
  return distSq <= maxDistance * maxDistance;
}

/**
 * Filter nodes by view distance
 *
 * @param nodes - Array of nodes with positions
 * @param cameraPosition - Camera position
 * @param maxDistance - Maximum visible distance
 * @returns Filtered array of visible nodes
 */
export function filterByViewDistance<T extends { position: [number, number, number] }>(
  nodes: T[],
  cameraPosition: [number, number, number],
  maxDistance: number
): T[] {
  return nodes.filter((node) => isWithinViewDistance(node.position, cameraPosition, maxDistance));
}
