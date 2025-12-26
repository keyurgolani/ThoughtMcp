import type { GraphNode, MemorySectorType } from "../types/api";

// ============================================================================
// Constants
// ============================================================================

/** Hub threshold - nodes with more connections are considered hubs */
const HUB_THRESHOLD = 5;

// ============================================================================
// Types
// ============================================================================

export interface InstancedNodeData {
  id: string;
  position: [number, number, number];
  primarySector: MemorySectorType;
  salience: number;
  strength: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determines if a node should be considered a hub based on connection count.
 */
export function isHubNode(connectionCount: number): boolean {
  return connectionCount > HUB_THRESHOLD;
}

/**
 * Gets the hub threshold value.
 */
export function getHubThreshold(): number {
  return HUB_THRESHOLD;
}

/**
 * Convert GraphNode array to InstancedNodeData array with positions
 */
export function graphNodesToInstancedData(
  nodes: GraphNode[],
  positionMap: Map<string, [number, number, number]>
): InstancedNodeData[] {
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
