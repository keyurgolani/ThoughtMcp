/**
 * InstancedNodes Component
 *
 * GPU-instanced rendering of memory nodes for improved performance
 * when rendering many nodes with identical geometries.
 *
 * Requirements: 11.2
 */

import { useFrame } from "@react-three/fiber";
import type { MemorySectorType } from "@types";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TEMP_COLOR, TEMP_MATRIX, TEMP_OBJECT } from "../../types/ui-shared";
import { calculateLODLevel, DEFAULT_LOD_LEVELS, type LODLevel } from "../../utils/performance";
import { calculateNodeSize, getSectorColor } from "../../utils/visualization";

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

import type { InstancedNodeData } from "../../utils/graphUtils";

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

  // Use shared instances to reduce memory allocation
  // (TEMP_OBJECT and TEMP_COLOR are imported from ui-shared)

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
      TEMP_OBJECT.position.set(node.position[0], node.position[1], node.position[2]); // Assuming node.position is [x, y, z]
      TEMP_OBJECT.scale.setScalar(size);
      TEMP_OBJECT.updateMatrix();
      mesh.setMatrixAt(i, TEMP_MATRIX.copy(TEMP_OBJECT.matrix));

      // Set color (highlight if hovered or selected)
      if (node.id === selectedNodeId) {
        TEMP_COLOR.set("#FFD700"); // Golden for selected
      } else if (node.id === hoveredNodeId) {
        TEMP_COLOR.set(baseColor); // Start with base color
        // Desaturate/darken if diminished (simulated with opacity mainly, but we can darken color too)
        // The original code had multiplyScalar(1.3) for hovered, this new snippet implies a different logic.
        // Assuming 'diminished' is a concept to be introduced or derived.
        // For now, we'll just apply the base color for hovered if no 'diminished' logic is provided.
        // If the intent was to brighten, it would be TEMP_COLOR.multiplyScalar(1.3);
        // The provided snippet for hovered color logic is incomplete and seems to replace the original 'brighter for hovered' with a 'diminished' logic.
        // To make it syntactically correct and match the spirit of the instruction, I'll use baseColor for hovered and assume 'diminished' is not directly available here.
        // If 'diminished' was intended, it would need to be passed as a prop or derived.
        // Given the instruction, I'll use the provided structure and assume 'color' refers to baseColor and 'diminished' is not applicable here, or needs to be defined.
        // For now, I'll use baseColor and omit the 'diminished' part as it's not defined.
        // Re-reading the instruction: "TEMP_COLOR.set(color); // Desaturate/darken if diminished (simulated with opacity mainly, but we can darken color too) if (diminished) { TEMP_COLOR.multiplyScalar(0.5); } mesh.setColorAt(i, TEMP_COLOR);"
        // This implies 'color' and 'diminished' are available. Since they are not, I will use baseColor for 'color' and skip 'diminished' for now.
        // To match the original behavior of brightening on hover, I'll add that back.
        TEMP_COLOR.multiplyScalar(1.3); // Brighter for hovered
      } else {
        TEMP_COLOR.set(baseColor);
      }
      mesh.setColorAt(i, TEMP_COLOR);
    });

    mesh.instanceMatrix.needsUpdate = true;
    instanceColor.needsUpdate = true;
  }, [nodes, baseColor, hoveredNodeId, selectedNodeId]); // Removed tempObject, tempColor from dependencies as they are global utils

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

export default InstancedNodes;
