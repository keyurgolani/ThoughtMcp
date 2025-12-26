/**
 * Clustering Utilities
 *
 * Algorithms for clustering memory nodes when the graph exceeds
 * the clustering threshold (1000+ nodes).
 *
 * Requirements: 11.3
 */

import type { GraphNode, MemorySectorType } from '../types/api';
import {
  calculateDistance,
  CLUSTERING_THRESHOLD,
  DEFAULT_CLUSTER_CONFIG,
  type ClusterConfig,
} from './performance';

// ============================================================================
// Types
// ============================================================================

export interface NodeWithPosition {
  id: string;
  position: [number, number, number];
  primarySector: MemorySectorType;
  salience: number;
  strength: number;
}

export interface Cluster {
  /** Unique cluster ID */
  id: string;
  /** Centroid position */
  centroid: [number, number, number];
  /** Nodes in this cluster */
  nodes: NodeWithPosition[];
  /** Dominant sector type */
  dominantSector: MemorySectorType;
  /** Average salience of nodes */
  averageSalience: number;
  /** Average strength of nodes */
  averageStrength: number;
  /** Whether cluster is expanded */
  isExpanded: boolean;
}

export interface ClusteringResult {
  /** Clustered nodes (meta-nodes) */
  clusters: Cluster[];
  /** Nodes that weren't clustered (too few nearby) */
  unclustered: NodeWithPosition[];
  /** Whether clustering was applied */
  wasClustered: boolean;
}

// ============================================================================
// K-Means Clustering Implementation
// ============================================================================

/**
 * Initialize cluster centroids using k-means++ algorithm
 */
function initializeCentroids(nodes: NodeWithPosition[], k: number): [number, number, number][] {
  if (nodes.length === 0 || k <= 0) return [];

  const centroids: [number, number, number][] = [];

  // Pick first centroid randomly
  const firstIndex = Math.floor(Math.random() * nodes.length);
  const firstNode = nodes[firstIndex];
  if (firstNode) {
    centroids.push([...firstNode.position]);
  }

  // Pick remaining centroids with probability proportional to distance squared
  while (centroids.length < k && centroids.length < nodes.length) {
    const distances: number[] = [];
    let totalDistance = 0;

    for (const node of nodes) {
      // Find minimum distance to existing centroids
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = calculateDistance(node.position, centroid);
        if (dist < minDist) {
          minDist = dist;
        }
      }
      distances.push(minDist * minDist);
      totalDistance += minDist * minDist;
    }

    // Pick next centroid with probability proportional to distance squared
    let random = Math.random() * totalDistance;
    for (let i = 0; i < nodes.length; i++) {
      const dist = distances[i] ?? 0;
      random -= dist;
      if (random <= 0) {
        const node = nodes[i];
        if (node) {
          centroids.push([...node.position]);
        }
        break;
      }
    }
  }

  return centroids;
}

/**
 * Assign nodes to nearest centroid
 */
function assignToClusters(
  nodes: NodeWithPosition[],
  centroids: [number, number, number][]
): Map<number, NodeWithPosition[]> {
  const assignments = new Map<number, NodeWithPosition[]>();

  // Initialize empty arrays for each centroid
  for (let i = 0; i < centroids.length; i++) {
    assignments.set(i, []);
  }

  // Assign each node to nearest centroid
  for (const node of nodes) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < centroids.length; i++) {
      const centroid = centroids[i];
      if (centroid) {
        const dist = calculateDistance(node.position, centroid);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestIndex = i;
        }
      }
    }

    const cluster = assignments.get(nearestIndex);
    if (cluster) {
      cluster.push(node);
    }
  }

  return assignments;
}

/**
 * Update centroid positions based on assigned nodes
 */
function updateCentroids(
  assignments: Map<number, NodeWithPosition[]>,
  centroids: [number, number, number][]
): [number, number, number][] {
  const newCentroids: [number, number, number][] = [];

  for (let i = 0; i < centroids.length; i++) {
    const nodes = assignments.get(i) ?? [];

    if (nodes.length === 0) {
      // Keep old centroid if no nodes assigned
      const oldCentroid = centroids[i];
      if (oldCentroid) {
        newCentroids.push([...oldCentroid]);
      }
    } else {
      // Calculate mean position
      let sumX = 0,
        sumY = 0,
        sumZ = 0;
      for (const node of nodes) {
        sumX += node.position[0];
        sumY += node.position[1];
        sumZ += node.position[2];
      }
      newCentroids.push([sumX / nodes.length, sumY / nodes.length, sumZ / nodes.length]);
    }
  }

  return newCentroids;
}

/**
 * Check if centroids have converged
 */
function hasConverged(
  oldCentroids: [number, number, number][],
  newCentroids: [number, number, number][],
  threshold: number = 0.001
): boolean {
  for (let i = 0; i < oldCentroids.length; i++) {
    const oldC = oldCentroids[i];
    const newC = newCentroids[i];
    if (oldC && newC) {
      const dist = calculateDistance(oldC, newC);
      if (dist > threshold) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Perform k-means clustering
 */
function kMeansClustering(
  nodes: NodeWithPosition[],
  k: number,
  maxIterations: number = 50
): Map<number, NodeWithPosition[]> {
  if (nodes.length === 0 || k <= 0) {
    return new Map();
  }

  // Initialize centroids
  let centroids = initializeCentroids(nodes, k);

  // Iterate until convergence or max iterations
  let assignments = new Map<number, NodeWithPosition[]>();
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign nodes to clusters
    assignments = assignToClusters(nodes, centroids);

    // Update centroids
    const newCentroids = updateCentroids(assignments, centroids);

    // Check convergence
    if (hasConverged(centroids, newCentroids)) {
      break;
    }

    centroids = newCentroids;
  }

  return assignments;
}

// ============================================================================
// Cluster Creation
// ============================================================================

/**
 * Determine dominant sector in a group of nodes
 */
function getDominantSector(nodes: NodeWithPosition[]): MemorySectorType {
  const counts = new Map<MemorySectorType, number>();

  for (const node of nodes) {
    const count = counts.get(node.primarySector) ?? 0;
    counts.set(node.primarySector, count + 1);
  }

  let maxCount = 0;
  let dominant: MemorySectorType = 'semantic';

  for (const [sector, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      dominant = sector;
    }
  }

  return dominant;
}

/**
 * Calculate cluster centroid from nodes
 */
function calculateCentroid(nodes: NodeWithPosition[]): [number, number, number] {
  if (nodes.length === 0) return [0, 0, 0];

  let sumX = 0,
    sumY = 0,
    sumZ = 0;
  for (const node of nodes) {
    sumX += node.position[0];
    sumY += node.position[1];
    sumZ += node.position[2];
  }

  return [sumX / nodes.length, sumY / nodes.length, sumZ / nodes.length];
}

/**
 * Create a Cluster object from a group of nodes
 */
function createCluster(id: string, nodes: NodeWithPosition[]): Cluster {
  const centroid = calculateCentroid(nodes);
  const dominantSector = getDominantSector(nodes);

  let totalSalience = 0;
  let totalStrength = 0;
  for (const node of nodes) {
    totalSalience += node.salience;
    totalStrength += node.strength;
  }

  return {
    id,
    centroid,
    nodes,
    dominantSector,
    averageSalience: nodes.length > 0 ? totalSalience / nodes.length : 0,
    averageStrength: nodes.length > 0 ? totalStrength / nodes.length : 0,
    isExpanded: false,
  };
}

// ============================================================================
// Main Clustering Function
// ============================================================================

/**
 * Cluster nodes when count exceeds threshold
 *
 * @param nodes - Array of nodes with positions
 * @param config - Clustering configuration
 * @returns Clustering result with clusters and unclustered nodes
 */
export function clusterNodes(
  nodes: NodeWithPosition[],
  config: ClusterConfig = DEFAULT_CLUSTER_CONFIG
): ClusteringResult {
  // Don't cluster if below threshold
  if (nodes.length <= config.threshold) {
    return {
      clusters: [],
      unclustered: nodes,
      wasClustered: false,
    };
  }

  // Calculate number of clusters (aim for ~20-50 nodes per cluster)
  const targetNodesPerCluster = 30;
  const k = Math.min(
    config.maxClusters,
    Math.max(1, Math.ceil(nodes.length / targetNodesPerCluster))
  );

  // Perform k-means clustering
  const assignments = kMeansClustering(nodes, k);

  // Create cluster objects
  const clusters: Cluster[] = [];
  const unclustered: NodeWithPosition[] = [];

  let clusterIndex = 0;
  for (const [, clusterNodes] of assignments) {
    if (clusterNodes.length < config.minSize) {
      // Too few nodes, don't cluster
      unclustered.push(...clusterNodes);
    } else {
      clusters.push(createCluster(`cluster-${String(clusterIndex)}`, clusterNodes));
      clusterIndex++;
    }
  }

  return {
    clusters,
    unclustered,
    wasClustered: true,
  };
}

/**
 * Convert GraphNodes to NodeWithPosition for clustering
 */
export function graphNodesToClusterInput(
  nodes: GraphNode[],
  positionMap: Map<string, [number, number, number]>
): NodeWithPosition[] {
  return nodes
    .filter((node) => positionMap.has(node.id))
    .map((node) => {
      const position = positionMap.get(node.id);
      if (!position) {
        throw new Error(`Position not found for node ${node.id}`);
      }
      return {
        id: node.id,
        position,
        primarySector: node.primarySector,
        salience: node.salience,
        strength: node.strength,
      };
    });
}

/**
 * Expand a cluster to show individual nodes
 */
export function expandCluster(result: ClusteringResult, clusterId: string): ClusteringResult {
  const clusters = result.clusters.map((cluster) => {
    if (cluster.id === clusterId) {
      return { ...cluster, isExpanded: true };
    }
    return cluster;
  });

  return {
    ...result,
    clusters,
  };
}

/**
 * Collapse a cluster back to meta-node
 */
export function collapseCluster(result: ClusteringResult, clusterId: string): ClusteringResult {
  const clusters = result.clusters.map((cluster) => {
    if (cluster.id === clusterId) {
      return { ...cluster, isExpanded: false };
    }
    return cluster;
  });

  return {
    ...result,
    clusters,
  };
}

/**
 * Check if clustering should be enabled
 */
export function shouldCluster(
  nodeCount: number,
  threshold: number = CLUSTERING_THRESHOLD
): boolean {
  return nodeCount > threshold;
}
