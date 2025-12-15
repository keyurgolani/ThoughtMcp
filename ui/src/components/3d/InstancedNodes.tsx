/**
 * InstancedNodes Component
 *
 * GPU-instanced rendering of memory nodes for improved performance
 * when rendering many nodes with identical geometries.
 *
 * Requirements: 11.2
 */

import { useFrame } from '@react-three/fiber';
import type { GraphNode, MemorySectorType } from '@types';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { calculateLODLevel, DEFAULT_LOD_LEVELS, type LODLevel } from '../../utils/performance';
import { calculateNodeSize, getSectorColor } from '../../utils/visualization';

// ============================================================================
// Constants
// ============================================================================

/** Maximum instances per batch */
const MAX_INSTANCES = 10000;

/** Default sphere segments for instanced geometry */
const DEFAULT_SEGMENTS = 16;

// ============================================================================
// Types
// ============================================================================

export interface InstancedNodeData {
  /** Node ID */
  id: string;
  /** 3D position */
  position: [number, number, number];
  /** Primary sector type */
  primarySector: MemorySectorType;
  /** Salience value (0-1) */
  salience: number;
  /** Strength value (0-1) */
  strength: number;
}

export interface InstancedNodesProps {
  /** Array of node data to render */
  nodes: InstancedNodeData[];
  /** Whether to use high contrast colors */
  highContrast?: boolean;
  /** Custom LOD levels */
  lodLevels?: LODLevel[];
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Callback when a node is hovered */
  onNodeHover?: (nodeId: string | null) => void;
  /** Currently hovered node ID */
  hoveredNodeId?: string | null;
  /** Currently selected node ID */
  selectedNodeId?: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Group nodes by sector type for efficient instanced rendering
 */
function groupNodesBySector(
  nodes: InstancedNodeData[]
): Map<MemorySectorType, InstancedNodeData[]> {
  const groups = new Map<MemorySectorType, InstancedNodeData[]>();

  for (const node of nodes) {
    const existing = groups.get(node.primarySector);
    if (existing) {
      existing.push(node);
    } else {
      groups.set(node.primarySector, [node]);
    }
  }

  return groups;
}

// ============================================================================
// Instanced Sector Group Component
// ============================================================================

interface InstancedSectorGroupProps {
  nodes: InstancedNodeData[];
  sector: MemorySectorType;
  highContrast: boolean;
  lodLevels: LODLevel[];
  hoveredNodeId?: string | null | undefined;
  selectedNodeId?: string | null | undefined;
}

function InstancedSectorGroup({
  nodes,
  sector,
  highContrast,
  lodLevels,
  hoveredNodeId,
  selectedNodeId,
}: InstancedSectorGroupProps): React.ReactElement | null {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Get base color for this sector
  const baseColor = useMemo(() => getSectorColor(sector, highContrast), [sector, highContrast]);

  // Create geometry with appropriate segments
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(1, DEFAULT_SEGMENTS, DEFAULT_SEGMENTS);
  }, []);

  // Create material
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: baseColor,
      emissiveIntensity: 0.3,
      transparent: true,
      roughness: 0.3,
      metalness: 0.7,
    });
  }, [baseColor]);

  // Update instance matrices and colors
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Initialize color attribute if not present
    let instanceColor = mesh.instanceColor;
    if (!instanceColor) {
      const colors = new Float32Array(nodes.length * 3);
      instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      mesh.instanceColor = instanceColor;
    }

    nodes.forEach((node, i) => {
      // Calculate size based on salience
      const size = calculateNodeSize(node.salience);

      // Set position and scale
      tempObject.position.set(...node.position);
      tempObject.scale.setScalar(size);
      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);

      // Set color (highlight if hovered or selected)
      if (node.id === selectedNodeId) {
        tempColor.set('#FFD700'); // Golden for selected
      } else if (node.id === hoveredNodeId) {
        tempColor.set(baseColor).multiplyScalar(1.3); // Brighter for hovered
      } else {
        tempColor.set(baseColor);
      }
      mesh.setColorAt(i, tempColor);
    });

    mesh.instanceMatrix.needsUpdate = true;
    instanceColor.needsUpdate = true;
  }, [nodes, baseColor, hoveredNodeId, selectedNodeId, tempObject, tempColor]);

  // Update opacity based on LOD
  useFrame((state) => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const cameraPos = state.camera.position;

    // Calculate average distance for LOD (simplified)
    let totalDistance = 0;
    for (const node of nodes) {
      const nodePos = new THREE.Vector3(...node.position);
      totalDistance += cameraPos.distanceTo(nodePos);
    }
    const avgDistance = totalDistance / nodes.length;

    // Get LOD level and update material opacity
    const lod = calculateLODLevel(avgDistance, lodLevels);
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.opacity = 0.8 * lod.opacityMultiplier;
  });

  if (nodes.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, Math.min(nodes.length, MAX_INSTANCES)]}
      frustumCulled
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function InstancedNodes({
  nodes,
  highContrast = false,
  lodLevels = DEFAULT_LOD_LEVELS,
  hoveredNodeId,
  selectedNodeId,
}: InstancedNodesProps): React.ReactElement {
  // Group nodes by sector for efficient rendering
  const nodesBySector = useMemo(() => groupNodesBySector(nodes), [nodes]);

  return (
    <group name="instanced-nodes">
      {Array.from(nodesBySector.entries()).map(([sector, sectorNodes]) => (
        <InstancedSectorGroup
          key={sector}
          nodes={sectorNodes}
          sector={sector}
          highContrast={highContrast}
          lodLevels={lodLevels}
          hoveredNodeId={hoveredNodeId}
          selectedNodeId={selectedNodeId}
        />
      ))}
    </group>
  );
}

// ============================================================================
// Utility: Convert GraphNodes to InstancedNodeData
// ============================================================================

/**
 * Convert GraphNode array to InstancedNodeData array with positions
 *
 * @param nodes - Array of graph nodes
 * @param positionMap - Map of node IDs to positions
 * @returns Array of instanced node data
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

export default InstancedNodes;
