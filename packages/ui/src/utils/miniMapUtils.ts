import type { GraphEdge, GraphNode, MemorySectorType } from "../types/api";

// ============================================================================
// Types
// ============================================================================

export interface MiniMapNode {
  id: string;
  label: string;
  primarySector: MemorySectorType;
  salience: number;
}

export interface MiniMapEdge {
  source: string;
  target: string;
  weight: number;
}

// ============================================================================
// Constants
// ============================================================================

export const PADDING = 20;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert GraphNode to MiniMapNode
 */
export function graphNodeToMiniMapNode(node: GraphNode): MiniMapNode {
  return {
    id: node.id,
    label: node.content.substring(0, 50),
    primarySector: node.primarySector,
    salience: node.salience,
  };
}

/**
 * Convert GraphEdge to MiniMapEdge
 * Only converts actual waypoint connections - Requirements: 28.3
 */
export function graphEdgeToMiniMapEdge(edge: GraphEdge): MiniMapEdge {
  return {
    source: edge.source,
    target: edge.target,
    weight: edge.weight,
  };
}

/**
 * Calculate node positions - scales to fit bounds with zoom
 */
export function calculateNodePositions(
  nodes: MiniMapNode[],
  edges: MiniMapEdge[],
  currentNodeId: string | null,
  width: number,
  height: number,
  zoom: number
): Map<string, [number, number]> {
  const positions = new Map<string, [number, number]>();
  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(width, height) / 2 - PADDING;
  const radius = baseRadius / zoom; // Adjust radius based on zoom

  if (nodes.length === 0) {
    return positions;
  }

  // If there's a current node, place it at center
  if (currentNodeId !== null && currentNodeId !== "") {
    positions.set(currentNodeId, [centerX, centerY]);
  }

  // Find neighbors of current node using actual waypoint connections
  const neighborIds = new Set<string>();
  if (currentNodeId !== null && currentNodeId !== "") {
    for (const edge of edges) {
      if (edge.source === currentNodeId) {
        neighborIds.add(edge.target);
      } else if (edge.target === currentNodeId) {
        neighborIds.add(edge.source);
      }
    }
  }

  // Place neighbors in a circle around the current node
  const neighbors = nodes.filter((n) => neighborIds.has(n.id));
  const angleStep = (2 * Math.PI) / Math.max(neighbors.length, 1);

  neighbors.forEach((node, index) => {
    const angle = index * angleStep - Math.PI / 2; // Start from top
    const x = centerX + Math.cos(angle) * radius * 0.7;
    const y = centerY + Math.sin(angle) * radius * 0.7;
    positions.set(node.id, [x, y]);
  });

  // Place remaining nodes (not current, not neighbors) in outer ring
  const otherNodes = nodes.filter((n) => n.id !== currentNodeId && !neighborIds.has(n.id));
  const outerAngleStep = (2 * Math.PI) / Math.max(otherNodes.length, 1);

  otherNodes.forEach((node, index) => {
    const angle = index * outerAngleStep;
    const x = centerX + Math.cos(angle) * radius * 0.95;
    const y = centerY + Math.sin(angle) * radius * 0.95;
    positions.set(node.id, [x, y]);
  });

  // If no current node, distribute all nodes evenly
  if ((currentNodeId === null || currentNodeId === "") && nodes.length > 0) {
    const allAngleStep = (2 * Math.PI) / nodes.length;
    nodes.forEach((node, index) => {
      const angle = index * allAngleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius * 0.7;
      const y = centerY + Math.sin(angle) * radius * 0.7;
      positions.set(node.id, [x, y]);
    });
  }

  return positions;
}
