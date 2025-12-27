/**
 * Visualization Utility Functions
 *
 * Provides utility functions for 3D visualization of memory nodes and edges.
 * Requirements: 1.2, 2.1-2.4, 3.2-3.3, 13.3
 */

import type { LinkType, MemorySectorType } from "@types";

// ============================================================================
// Types
// ============================================================================

export type Position3D = [number, number, number];

// ============================================================================
// Constants
// ============================================================================

/** Golden angle in radians for Fibonacci sphere distribution */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Default node size range [min, max] - reduced for compact display to fit more memories */
const NODE_SIZE_RANGE = { min: 0.08, max: 0.4 };

/** Default node opacity range [min, max] */
const NODE_OPACITY_RANGE = { min: 0.3, max: 1.0 };

/** Default edge thickness range [min, max] - reduced for cleaner visual appearance */
const EDGE_THICKNESS_RANGE = { min: 0.01, max: 0.05 };

/** Hub node threshold - nodes with more connections are considered hubs (Requirements: 39.2, 43.5) */
const HUB_CONNECTION_THRESHOLD = 5;

/** Hub node size multiplier - how much larger hub nodes appear (Requirements: 39.2, 43.5) */
const HUB_SIZE_MULTIPLIER = 1.6;

// ============================================================================
// Sector Colors (Requirements: 2.1, 2.2)
// ============================================================================

/**
 * FIXED Sector Colors - Theme Agnostic Business Logic Colors
 * These colors are consistent across all themes (light and dark).
 * Memory types are business logic, not user preference.
 * Must match CSS variables in index.css (--sector-*-color)
 */
const SECTOR_COLORS: Record<MemorySectorType, string> = {
  episodic: "#d97706", // Amber - Events and experiences
  semantic: "#0891b2", // Cyan - Facts and knowledge
  procedural: "#7c3aed", // Purple - Skills and processes
  emotional: "#e11d48", // Rose - Feelings and emotions
  reflective: "#64748b", // Slate - Meta-insights and reflections
};

/**
 * High contrast sector colors (Requirements: 13.3)
 * Slightly brighter versions for accessibility, but still theme-agnostic
 */
const HIGH_CONTRAST_SECTOR_COLORS: Record<MemorySectorType, string> = {
  episodic: "#f59e0b", // Brighter amber
  semantic: "#06b6d4", // Brighter cyan
  procedural: "#8b5cf6", // Brighter purple
  emotional: "#f43f5e", // Brighter rose
  reflective: "#94a3b8", // Brighter slate
};

/**
 * @deprecated Light mode colors are no longer used - sector colors are theme-agnostic
 * Kept for backward compatibility but returns the same fixed colors
 */
const LIGHT_MODE_SECTOR_COLORS: Record<MemorySectorType, string> = {
  episodic: "#d97706", // Same as standard - theme agnostic
  semantic: "#0891b2", // Same as standard - theme agnostic
  procedural: "#7c3aed", // Same as standard - theme agnostic
  emotional: "#e11d48", // Same as standard - theme agnostic
  reflective: "#64748b", // Same as standard - theme agnostic
};

// ============================================================================
// Link Type Colors (Requirements: 3.2)
// ============================================================================

/** Link type colors - refined, professional palette */
const LINK_TYPE_COLORS: Record<LinkType, string> = {
  semantic: "#5B8FA8", // Muted blue
  causal: "#C9896B", // Muted orange
  temporal: "#6B9E7A", // Muted green
  analogical: "#8B7BB5", // Muted purple
};

/** Light mode link type colors - bold, saturated colors for visibility on light backgrounds */
const LIGHT_MODE_LINK_TYPE_COLORS: Record<LinkType, string> = {
  semantic: "#0077B6", // Bold blue
  causal: "#D62828", // Bold red-orange
  temporal: "#2D6A4F", // Bold green
  analogical: "#7B2CBF", // Bold purple
};

// ============================================================================
// Fibonacci Sphere Position Calculator (Requirements: 1.2)
// ============================================================================

/**
 * Calculates evenly distributed positions on a sphere using the Fibonacci sphere algorithm.
 * Uses the golden angle to distribute points uniformly across the sphere surface.
 *
 * @param nodeCount - Number of positions to generate (1-1000)
 * @param radius - Radius of the sphere (default: 5)
 * @returns Array of [x, y, z] positions
 *
 * Requirements: 1.2
 */
export function calculateFibonacciSpherePositions(
  nodeCount: number,
  radius: number = 5
): Position3D[] {
  // Validate inputs
  if (nodeCount < 1) {
    return [];
  }

  const clampedCount = Math.min(Math.max(1, Math.floor(nodeCount)), 1000);
  const clampedRadius = Math.max(0.1, radius);

  const positions: Position3D[] = [];

  for (let i = 0; i < clampedCount; i++) {
    // Calculate y coordinate: evenly spaced from -1 to 1
    const y = 1 - (i / (clampedCount - 1 || 1)) * 2;

    // Calculate radius at this y level (circle radius on sphere)
    const radiusAtY = Math.sqrt(1 - y * y);

    // Calculate angle using golden angle
    const theta = GOLDEN_ANGLE * i;

    // Calculate x and z coordinates
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    // Scale by sphere radius
    positions.push([x * clampedRadius, y * clampedRadius, z * clampedRadius]);
  }

  return positions;
}

// ============================================================================
// Sector Color Mapping (Requirements: 2.1, 2.2, 13.3)
// ============================================================================

/**
 * Gets the color for a memory sector type.
 *
 * @param sector - The memory sector type
 * @param highContrast - Whether to use high contrast colors (default: false)
 * @param lightMode - Whether to use light mode colors (default: false)
 * @returns Hex color string
 *
 * Requirements: 2.1, 2.2, 13.3
 */
export function getSectorColor(
  sector: MemorySectorType,
  highContrast: boolean = false,
  lightMode: boolean = false
): string {
  // Light mode takes precedence for visibility on light backgrounds
  if (lightMode) {
    return LIGHT_MODE_SECTOR_COLORS[sector];
  }
  const colorMap = highContrast ? HIGH_CONTRAST_SECTOR_COLORS : SECTOR_COLORS;
  return colorMap[sector];
}

// ============================================================================
// Link Type Color Mapping (Requirements: 3.2)
// ============================================================================

/**
 * Gets the color for a link type.
 *
 * @param linkType - The link type
 * @param lightMode - Whether to use light mode colors (default: false)
 * @returns Hex color string
 *
 * Requirements: 3.2
 */
export function getLinkTypeColor(linkType?: LinkType, lightMode: boolean = false): string {
  // Default to a fallback color if linkType is undefined or invalid
  if (!linkType) {
    return lightMode ? "#0088AA" : "#00FFFF"; // Default Cyan
  }

  if (lightMode) {
    return LIGHT_MODE_LINK_TYPE_COLORS[linkType] || "#0088AA";
  }
  return LINK_TYPE_COLORS[linkType] || "#00FFFF";
}

/**
 * Gets the label for a link type.
 *
 * @param linkType - The link type
 * @returns Human-readable label
 */
export function getLinkTypeLabel(linkType?: LinkType): string {
  switch (linkType) {
    case "semantic":
      return "Semantic";
    case "causal":
      return "Causal";
    case "temporal":
      return "Temporal";
    case "analogical":
      return "Analogical";
    default:
      return "Connected";
  }
}

// ============================================================================
// Node Size Calculator (Requirements: 2.3)
// ============================================================================

/**
 * Calculates node size based on salience value.
 * Size is proportionally scaled from salience (0-1) to the size range.
 *
 * @param salience - Salience value (0-1)
 * @param minSize - Minimum node size (default: 0.3)
 * @param maxSize - Maximum node size (default: 1.5)
 * @returns Calculated node size
 *
 * Requirements: 2.3
 */
export function calculateNodeSize(
  salience: number,
  minSize: number = NODE_SIZE_RANGE.min,
  maxSize: number = NODE_SIZE_RANGE.max
): number {
  // Clamp salience to valid range
  const clampedSalience = Math.max(0, Math.min(1, salience));

  // Linear interpolation between min and max
  return minSize + clampedSalience * (maxSize - minSize);
}

// ============================================================================
// Node Opacity Calculator (Requirements: 2.4)
// ============================================================================

/**
 * Calculates node opacity based on strength value.
 * Opacity is proportionally scaled from strength (0-1) to the opacity range.
 *
 * @param strength - Strength value (0-1)
 * @param minOpacity - Minimum opacity (default: 0.3)
 * @param maxOpacity - Maximum opacity (default: 1.0)
 * @returns Calculated opacity value
 *
 * Requirements: 2.4
 */
export function calculateNodeOpacity(
  strength: number,
  minOpacity: number = NODE_OPACITY_RANGE.min,
  maxOpacity: number = NODE_OPACITY_RANGE.max
): number {
  // Clamp strength to valid range
  const clampedStrength = Math.max(0, Math.min(1, strength));

  // Linear interpolation between min and max
  return minOpacity + clampedStrength * (maxOpacity - minOpacity);
}

// ============================================================================
// Edge Thickness Calculator (Requirements: 3.3)
// ============================================================================

/**
 * Calculates edge thickness based on link weight.
 * Thickness is proportionally scaled from weight (0-1) to the thickness range.
 *
 * @param weight - Link weight value (0-1)
 * @param minThickness - Minimum thickness (default: 0.02)
 * @param maxThickness - Maximum thickness (default: 0.15)
 * @returns Calculated edge thickness
 *
 * Requirements: 3.3
 */
export function calculateEdgeThickness(
  weight: number,
  minThickness: number = EDGE_THICKNESS_RANGE.min,
  maxThickness: number = EDGE_THICKNESS_RANGE.max
): number {
  // Clamp weight to valid range
  const clampedWeight = Math.max(0, Math.min(1, weight));

  // Linear interpolation between min and max
  return minThickness + clampedWeight * (maxThickness - minThickness);
}

// ============================================================================
// Hub Node Size Calculator (Requirements: 39.2, 43.5)
// ============================================================================

/**
 * Determines if a node is a hub based on its connection count.
 * Hub nodes have more than 5 connections.
 *
 * @param connectionCount - Number of connections the node has
 * @returns True if the node is a hub (>5 connections)
 *
 * Requirements: 39.2, 43.5
 */
export function isHubNode(connectionCount: number): boolean {
  return connectionCount > HUB_CONNECTION_THRESHOLD;
}

/**
 * Gets the hub connection threshold value.
 *
 * @returns The number of connections required to be considered a hub
 *
 * Requirements: 39.2, 43.5
 */
export function getHubThreshold(): number {
  return HUB_CONNECTION_THRESHOLD;
}

/**
 * Calculates the size multiplier for hub nodes.
 * Hub nodes (>5 connections) get a size increase for visual emphasis.
 *
 * @param connectionCount - Number of connections the node has
 * @returns Size multiplier (1.0 for normal nodes, HUB_SIZE_MULTIPLIER for hubs)
 *
 * Requirements: 39.2, 43.5
 */
export function calculateHubSizeMultiplier(connectionCount: number): number {
  return isHubNode(connectionCount) ? HUB_SIZE_MULTIPLIER : 1.0;
}

/**
 * Calculates node size with hub emphasis applied.
 * Combines base salience-based size with hub multiplier for nodes with many connections.
 *
 * @param salience - Salience value (0-1)
 * @param connectionCount - Number of connections the node has
 * @param minSize - Minimum node size (default: 0.3)
 * @param maxSize - Maximum node size (default: 1.5)
 * @returns Calculated node size with hub emphasis
 *
 * Requirements: 2.3, 39.2, 43.5
 */
export function calculateNodeSizeWithHubEmphasis(
  salience: number,
  connectionCount: number,
  minSize: number = NODE_SIZE_RANGE.min,
  maxSize: number = NODE_SIZE_RANGE.max
): number {
  const baseSize = calculateNodeSize(salience, minSize, maxSize);
  const hubMultiplier = calculateHubSizeMultiplier(connectionCount);
  return baseSize * hubMultiplier;
}

// ============================================================================
// Hub Edge Enhancement (Requirements: 43.3)
// ============================================================================

/** Hub edge thickness multiplier - how much thicker hub edges appear */
const HUB_EDGE_THICKNESS_MULTIPLIER = 1.8;

/** Hub edge emissive intensity multiplier - how much brighter hub edges appear */
const HUB_EDGE_EMISSIVE_MULTIPLIER = 1.5;

/** Hub edge glow opacity multiplier - how much more glow hub edges have */
const HUB_EDGE_GLOW_MULTIPLIER = 1.4;

/**
 * Calculates edge thickness for hub connections.
 * Hub connections are rendered thicker for visual emphasis.
 *
 * @param weight - Link weight value (0-1)
 * @param isHubConnection - Whether this edge connects to a hub node
 * @param minThickness - Minimum thickness (default: 0.04)
 * @param maxThickness - Maximum thickness (default: 0.2)
 * @returns Calculated edge thickness with hub enhancement
 *
 * Requirements: 43.3
 */
export function calculateHubEdgeThickness(
  weight: number,
  isHubConnection: boolean,
  minThickness: number = EDGE_THICKNESS_RANGE.min,
  maxThickness: number = EDGE_THICKNESS_RANGE.max
): number {
  const baseThickness = calculateEdgeThickness(weight, minThickness, maxThickness);
  return isHubConnection ? baseThickness * HUB_EDGE_THICKNESS_MULTIPLIER : baseThickness;
}

/**
 * Gets the emissive intensity multiplier for hub edges.
 * Hub edges are rendered brighter for visual emphasis.
 *
 * @param isHubConnection - Whether this edge connects to a hub node
 * @returns Emissive intensity multiplier (1.0 for normal, HUB_EDGE_EMISSIVE_MULTIPLIER for hubs)
 *
 * Requirements: 43.3
 */
export function getHubEdgeEmissiveMultiplier(isHubConnection: boolean): number {
  return isHubConnection ? HUB_EDGE_EMISSIVE_MULTIPLIER : 1.0;
}

/**
 * Gets the glow opacity multiplier for hub edges.
 * Hub edges have more prominent glow for visual emphasis.
 *
 * @param isHubConnection - Whether this edge connects to a hub node
 * @returns Glow opacity multiplier (1.0 for normal, HUB_EDGE_GLOW_MULTIPLIER for hubs)
 *
 * Requirements: 43.3
 */
export function getHubEdgeGlowMultiplier(isHubConnection: boolean): number {
  return isHubConnection ? HUB_EDGE_GLOW_MULTIPLIER : 1.0;
}

// ============================================================================
// Timeline Mode Layout (Requirements: 12.3)
// ============================================================================

export interface TimelineNode {
  id: string;
  createdAt: Date | string;
}

/**
 * Calculates positions for nodes arranged chronologically along a timeline axis.
 * Nodes are distributed along the X-axis based on their creation time,
 * with slight Y variation to prevent overlap.
 *
 * @param nodes - Array of nodes with id and createdAt properties
 * @param config - Configuration for timeline layout
 * @returns Map of node IDs to their 3D positions
 *
 * Requirements: 12.3
 */
export function calculateTimelinePositions(
  nodes: TimelineNode[],
  config: {
    /** Length of the timeline axis (default: 50) */
    axisLength?: number;
    /** Vertical spread for nodes (default: 3) */
    verticalSpread?: number;
    /** Depth spread for nodes (default: 2) */
    depthSpread?: number;
  } = {}
): Map<string, Position3D> {
  const { axisLength = 50, verticalSpread = 3, depthSpread = 2 } = config;

  const positions = new Map<string, Position3D>();

  if (nodes.length === 0) {
    return positions;
  }

  // Sort nodes by creation date
  const sortedNodes = [...nodes].sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
    return dateA.getTime() - dateB.getTime();
  });

  // Get time range
  const firstNode = sortedNodes[0];
  const lastNode = sortedNodes[sortedNodes.length - 1];

  // Safety check (should never happen due to early return, but TypeScript needs it)
  if (!firstNode || !lastNode) {
    return positions;
  }

  const firstDate =
    firstNode.createdAt instanceof Date ? firstNode.createdAt : new Date(firstNode.createdAt);
  const lastDate =
    lastNode.createdAt instanceof Date ? lastNode.createdAt : new Date(lastNode.createdAt);

  const timeRange = lastDate.getTime() - firstDate.getTime();

  // Calculate positions
  sortedNodes.forEach((node, index) => {
    const nodeDate = node.createdAt instanceof Date ? node.createdAt : new Date(node.createdAt);

    // X position based on time (centered around 0)
    let x: number;
    if (timeRange === 0) {
      // All nodes have same timestamp, distribute evenly
      x = nodes.length === 1 ? 0 : (index / (nodes.length - 1) - 0.5) * axisLength;
    } else {
      const timeProgress = (nodeDate.getTime() - firstDate.getTime()) / timeRange;
      x = (timeProgress - 0.5) * axisLength;
    }

    // Y position with slight variation to prevent overlap
    // Use a deterministic pattern based on index
    const yOffset = ((index % 5) - 2) * (verticalSpread / 2);
    const y = yOffset;

    // Z position with slight variation
    const zOffset = ((index % 3) - 1) * (depthSpread / 2);
    const z = zOffset;

    positions.set(node.id, [x, y, z]);
  });

  return positions;
}

// ============================================================================
// Cluster Mode Layout (Requirements: 12.4)
// ============================================================================

export interface ClusterNode {
  id: string;
  primarySector: MemorySectorType;
}

/** Cluster center positions for each sector */
const SECTOR_CLUSTER_CENTERS: Record<MemorySectorType, Position3D> = {
  episodic: [-8, 0, -8], // Front-left
  semantic: [8, 0, -8], // Front-right
  procedural: [0, 5, 0], // Top-center
  emotional: [-8, 0, 8], // Back-left
  reflective: [8, 0, 8], // Back-right
};

/**
 * Calculates positions for nodes grouped by sector type into distinct regions.
 * Each sector has a designated cluster center, and nodes within each sector
 * are distributed around that center using Fibonacci sphere positioning.
 *
 * @param nodes - Array of nodes with id and primarySector properties
 * @param config - Configuration for cluster layout
 * @returns Map of node IDs to their 3D positions
 *
 * Requirements: 12.4
 */
export function calculateClusterPositions(
  nodes: ClusterNode[],
  config: {
    /** Radius of each cluster (default: 5) */
    clusterRadius?: number;
    /** Custom cluster centers (optional) */
    clusterCenters?: Partial<Record<MemorySectorType, Position3D>>;
  } = {}
): Map<string, Position3D> {
  const { clusterRadius = 5, clusterCenters = {} } = config;

  const positions = new Map<string, Position3D>();

  if (nodes.length === 0) {
    return positions;
  }

  // Merge custom centers with defaults
  const centers: Record<MemorySectorType, Position3D> = {
    ...SECTOR_CLUSTER_CENTERS,
    ...clusterCenters,
  };

  // Group nodes by sector
  const nodesBySector = new Map<MemorySectorType, ClusterNode[]>();
  for (const node of nodes) {
    const sectorNodes = nodesBySector.get(node.primarySector) ?? [];
    sectorNodes.push(node);
    nodesBySector.set(node.primarySector, sectorNodes);
  }

  // Calculate positions for each sector cluster
  for (const [sector, sectorNodes] of nodesBySector) {
    const center = centers[sector];
    const clusterPositions = calculateFibonacciSpherePositions(sectorNodes.length, clusterRadius);

    sectorNodes.forEach((node, index) => {
      const localPos = clusterPositions[index] ?? [0, 0, 0];
      // Offset by cluster center
      const worldPos: Position3D = [
        center[0] + localPos[0],
        center[1] + localPos[1],
        center[2] + localPos[2],
      ];
      positions.set(node.id, worldPos);
    });
  }

  return positions;
}

/**
 * Gets the cluster center position for a given sector.
 *
 * @param sector - The memory sector type
 * @returns The 3D position of the cluster center
 *
 * Requirements: 12.4
 */
export function getClusterCenter(sector: MemorySectorType): Position3D {
  return SECTOR_CLUSTER_CENTERS[sector];
}

// ============================================================================
// Edge Data Integrity Validation (Requirements: 25.4, 25.5)
// ============================================================================

import type { GraphEdge } from "@types";

/**
 * Validates that an edge has valid source and target node IDs.
 * Returns true only if both source and target are non-empty strings.
 *
 * @param edge - The edge to validate
 * @returns True if the edge has valid source and target IDs
 *
 * Requirements: 25.4, 25.5
 */
export function isValidEdge(edge: GraphEdge): boolean {
  return (
    typeof edge.source === "string" &&
    edge.source.length > 0 &&
    typeof edge.target === "string" &&
    edge.target.length > 0 &&
    typeof edge.weight === "number" &&
    edge.weight >= 0 &&
    edge.weight <= 1
  );
}

/**
 * Filters edges to only include those with valid waypoint links.
 * Removes any auto-generated, placeholder, or invalid connections.
 *
 * @param edges - Array of edges to filter
 * @param validNodeIds - Set of valid node IDs that exist in the graph
 * @returns Array of validated edges
 *
 * Requirements: 25.4, 25.5
 */
export function filterValidEdges(edges: GraphEdge[], validNodeIds: Set<string>): GraphEdge[] {
  return edges.filter((edge) => {
    // Check basic edge validity
    if (!isValidEdge(edge)) {
      return false;
    }

    // Ensure both source and target nodes exist in the graph
    if (!validNodeIds.has(edge.source) || !validNodeIds.has(edge.target)) {
      return false;
    }

    // Prevent self-loops
    if (edge.source === edge.target) {
      return false;
    }

    return true;
  });
}

/**
 * Validates that an edge connects two specific nodes.
 * Used to verify that a rendered connection corresponds to actual waypoint data.
 *
 * @param edge - The edge to check
 * @param nodeId1 - First node ID
 * @param nodeId2 - Second node ID
 * @returns True if the edge connects the two nodes (in either direction)
 *
 * Requirements: 25.4, 25.5
 */
export function edgeConnectsNodes(edge: GraphEdge, nodeId1: string, nodeId2: string): boolean {
  return (
    (edge.source === nodeId1 && edge.target === nodeId2) ||
    (edge.source === nodeId2 && edge.target === nodeId1)
  );
}

/**
 * Gets the edge connecting two nodes from a list of edges.
 * Returns undefined if no edge exists between the nodes.
 *
 * @param edges - Array of edges to search
 * @param nodeId1 - First node ID
 * @param nodeId2 - Second node ID
 * @returns The edge connecting the nodes, or undefined
 *
 * Requirements: 25.4, 25.5
 */
export function getEdgeBetweenNodes(
  edges: GraphEdge[],
  nodeId1: string,
  nodeId2: string
): GraphEdge | undefined {
  return edges.find((edge) => edgeConnectsNodes(edge, nodeId1, nodeId2));
}

// ============================================================================
// Hub-and-Spoke Visualization (Requirements: 43.1, 43.2)
// ============================================================================

export interface HubNode {
  id: string;
  connectionCount: number;
}

export interface HubLayoutNode {
  id: string;
  connectionCount: number;
  primarySector?: MemorySectorType;
}

/**
 * Calculates the connection count for each node based on edges.
 *
 * @param nodeIds - Array of node IDs to calculate counts for
 * @param edges - Array of edges in the graph
 * @returns Map of node IDs to their connection counts
 *
 * Requirements: 43.1, 43.2
 */
export function calculateConnectionCounts(
  nodeIds: string[],
  edges: GraphEdge[]
): Map<string, number> {
  const counts = new Map<string, number>();

  // Initialize all nodes with 0 connections
  for (const id of nodeIds) {
    counts.set(id, 0);
  }

  // Count connections from edges
  for (const edge of edges) {
    const sourceCount = counts.get(edge.source);
    const targetCount = counts.get(edge.target);

    if (sourceCount !== undefined) {
      counts.set(edge.source, sourceCount + 1);
    }
    if (targetCount !== undefined) {
      counts.set(edge.target, targetCount + 1);
    }
  }

  return counts;
}

/** Default radius for radial layout around hub nodes */
const HUB_RADIAL_RADIUS = 6;

/** Central position offset for hub nodes (slightly elevated) */
const HUB_CENTER_OFFSET: Position3D = [0, 0.5, 0];

/**
 * Calculates positions for nodes with hub nodes positioned centrally.
 * Hub nodes (>5 connections) are placed at or near the center,
 * while non-hub nodes are distributed around them.
 *
 * @param nodes - Array of nodes with id and connectionCount
 * @param currentNodeId - The ID of the current/focused node (optional)
 * @param config - Configuration for hub layout
 * @returns Map of node IDs to their 3D positions
 *
 * Requirements: 43.1
 */
export function calculateHubCentricPositions(
  nodes: HubLayoutNode[],
  currentNodeId?: string,
  config: {
    /** Radius for non-hub node distribution (default: 5) */
    radius?: number;
    /** Whether to prioritize current node at center (default: true) */
    prioritizeCurrentNode?: boolean;
  } = {}
): Map<string, Position3D> {
  const { radius = 5, prioritizeCurrentNode = true } = config;
  const positions = new Map<string, Position3D>();

  if (nodes.length === 0) {
    return positions;
  }

  // Separate hub nodes from non-hub nodes
  const hubNodes: HubLayoutNode[] = [];
  const nonHubNodes: HubLayoutNode[] = [];

  for (const node of nodes) {
    if (isHubNode(node.connectionCount)) {
      hubNodes.push(node);
    } else {
      nonHubNodes.push(node);
    }
  }

  // Sort hub nodes by connection count (most connected first)
  hubNodes.sort((a, b) => b.connectionCount - a.connectionCount);

  // Determine the primary hub (center node)
  let primaryHubId: string | undefined;

  if (prioritizeCurrentNode && currentNodeId != null && currentNodeId !== "") {
    // If current node is a hub, it becomes the primary hub
    const currentIsHub = hubNodes.some((h) => h.id === currentNodeId);
    if (currentIsHub) {
      primaryHubId = currentNodeId;
    } else {
      // Otherwise, use the most connected hub
      primaryHubId = hubNodes[0]?.id;
    }
  } else {
    primaryHubId = hubNodes[0]?.id;
  }

  // Position the primary hub at center
  if (primaryHubId != null && primaryHubId !== "") {
    positions.set(primaryHubId, [...HUB_CENTER_OFFSET]);
  }

  // Position other hub nodes in a small inner ring
  const otherHubs = hubNodes.filter((h) => h.id !== primaryHubId);
  if (otherHubs.length > 0) {
    const innerRadius = radius * 0.4; // Inner ring for secondary hubs
    const hubPositions = calculateFibonacciSpherePositions(otherHubs.length, innerRadius);
    otherHubs.forEach((hub, index) => {
      const pos = hubPositions[index] ?? [0, 0, 0];
      positions.set(hub.id, [pos[0], pos[1] + HUB_CENTER_OFFSET[1], pos[2]]);
    });
  }

  // Position non-hub nodes in outer sphere
  if (nonHubNodes.length > 0) {
    const outerPositions = calculateFibonacciSpherePositions(nonHubNodes.length, radius);
    nonHubNodes.forEach((node, index) => {
      positions.set(node.id, outerPositions[index] ?? [0, 0, 0]);
    });
  }

  return positions;
}

/**
 * Calculates positions for neighbors arranged in a radial pattern around a hub node.
 * The hub node is positioned at the center, and neighbors are evenly distributed
 * in a circular pattern around it.
 *
 * @param hubNodeId - The ID of the hub node at the center
 * @param neighborIds - Array of neighbor node IDs to arrange radially
 * @param config - Configuration for radial layout
 * @returns Map of node IDs to their 3D positions
 *
 * Requirements: 43.2
 */
export function calculateRadialNeighborPositions(
  hubNodeId: string,
  neighborIds: string[],
  config: {
    /** Radius of the radial arrangement (default: 6) */
    radius?: number;
    /** Y-axis offset for the plane (default: 0) */
    yOffset?: number;
    /** Starting angle in radians (default: 0) */
    startAngle?: number;
    /** Whether to add slight Y variation for depth (default: true) */
    addYVariation?: boolean;
  } = {}
): Map<string, Position3D> {
  const { radius = HUB_RADIAL_RADIUS, yOffset = 0, startAngle = 0, addYVariation = true } = config;
  const positions = new Map<string, Position3D>();

  // Position hub at center
  positions.set(hubNodeId, [0, yOffset, 0]);

  if (neighborIds.length === 0) {
    return positions;
  }

  // Calculate angle step for even distribution
  const angleStep = (2 * Math.PI) / neighborIds.length;

  neighborIds.forEach((neighborId, index) => {
    const angle = startAngle + index * angleStep;

    // Calculate X and Z positions on the circle
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Add slight Y variation for visual depth if enabled
    let y = yOffset;
    if (addYVariation) {
      // Alternate between slightly above and below the plane
      y += ((index % 3) - 1) * 0.5;
    }

    positions.set(neighborId, [x, y, z]);
  });

  return positions;
}

/**
 * Calculates positions for a hub-and-spoke layout where the current node
 * (if it's a hub) is centered with neighbors arranged radially around it.
 * Falls back to Fibonacci sphere for non-hub current nodes.
 *
 * @param currentNodeId - The ID of the current/focused node
 * @param currentNodeConnectionCount - Connection count of the current node
 * @param neighborIds - Array of neighbor node IDs
 * @param config - Configuration for the layout
 * @returns Map of node IDs to their 3D positions
 *
 * Requirements: 43.1, 43.2
 */
export function calculateHubAndSpokePositions(
  currentNodeId: string,
  currentNodeConnectionCount: number,
  neighborIds: string[],
  config: {
    /** Radius for neighbor distribution (default: 6) */
    radius?: number;
    /** Whether to use radial layout even for non-hubs (default: false) */
    forceRadial?: boolean;
  } = {}
): Map<string, Position3D> {
  const { radius = HUB_RADIAL_RADIUS, forceRadial = false } = config;

  // Use radial layout if current node is a hub or forceRadial is true
  if (isHubNode(currentNodeConnectionCount) || forceRadial) {
    return calculateRadialNeighborPositions(currentNodeId, neighborIds, { radius });
  }

  // Fall back to Fibonacci sphere for non-hub nodes
  const positions = new Map<string, Position3D>();

  // Position current node at center
  positions.set(currentNodeId, [0, 0, 0]);

  // Position neighbors on sphere
  if (neighborIds.length > 0) {
    const spherePositions = calculateFibonacciSpherePositions(neighborIds.length, radius);
    neighborIds.forEach((id, index) => {
      positions.set(id, spherePositions[index] ?? [0, 0, 0]);
    });
  }

  return positions;
}
