/**
 * MemoryGraphStyle5 - 3D Organic/Tree Style
 *
 * Reference implementation for graph style selection.
 * Features: Organic branching layout, teardrop/leaf-like nodes, natural aesthetic.
 * This is an isolated 3D implementation for comparison purposes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import * as THREE from "three";
import type { GraphNode, MemorySectorType } from "../../types/api";
import type { GraphEdge2D, GraphEdgeType } from "../../utils/graphEdges";
import { getSectorColor } from "../../utils/visualization";

interface GraphNodeInternal {
  id: string;
  content: string;
  primarySector: MemorySectorType;
  salience: number;
  strength: number;
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLinkInternal {
  source: string | GraphNodeInternal;
  target: string | GraphNodeInternal;
  type: GraphEdgeType;
  weight: number;
}

export interface MemoryGraphStyle5Props {
  nodes: GraphNode[];
  edges: GraphEdge2D[];
  selectedNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  width?: number;
  height?: number;
  lightMode?: boolean;
}

const EDGE_COLORS: Record<GraphEdgeType, string> = {
  tag: "#4a9c6d",
  similarity: "#7a6b4e",
  mention: "#8b5a2b",
};

// Create a custom leaf/teardrop geometry
function createLeafGeometry(size: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();

  // Teardrop/leaf shape
  shape.moveTo(0, size);
  shape.bezierCurveTo(size * 0.8, size * 0.5, size * 0.8, -size * 0.5, 0, -size);
  shape.bezierCurveTo(-size * 0.8, -size * 0.5, -size * 0.8, size * 0.5, 0, size);

  const extrudeSettings = {
    depth: size * 0.3,
    bevelEnabled: true,
    bevelThickness: size * 0.1,
    bevelSize: size * 0.1,
    bevelSegments: 3,
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

export function MemoryGraphStyle5({
  nodes,
  edges,
  selectedNodeId = null,
  onNodeClick,
  width = 800,
  height = 600,
  lightMode = false,
}: MemoryGraphStyle5Props): React.ReactElement {
  const graphRef = useRef<ForceGraphMethods<GraphNodeInternal, GraphLinkInternal> | undefined>(
    undefined
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const graphData = useMemo(
    () => ({
      nodes: nodes.map((n) => ({
        id: n.id,
        content: n.content,
        primarySector: n.primarySector,
        salience: n.salience,
        strength: n.strength,
      })),
      links: edges.map((e) => ({
        source: e.source,
        target: e.target,
        type: e.type,
        weight: e.weight,
      })),
    }),
    [nodes, edges]
  );

  useEffect(() => {
    if (selectedNodeId !== null && graphRef.current) {
      const node = graphData.nodes.find((n) => n.id === selectedNodeId) as
        | GraphNodeInternal
        | undefined;
      if (node && node.x !== undefined && node.y !== undefined) {
        const z = node.z ?? 0;
        graphRef.current.cameraPosition(
          { x: node.x, y: node.y, z: z + 150 },
          { x: node.x, y: node.y, z },
          1000
        );
      }
    }
  }, [selectedNodeId, graphData.nodes]);

  // Organic leaf-shaped nodes
  const nodeThreeObject = useCallback(
    (node: GraphNodeInternal) => {
      const size = 5 + node.salience * 12;
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;
      const color = getSectorColor(node.primarySector, false, lightMode);

      const group = new THREE.Group();

      // Leaf shape
      const geometry = createLeafGeometry(size);
      geometry.center();

      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: isSelected ? 0.3 : isHovered ? 0.15 : 0.05,
        shininess: 60,
        side: THREE.DoubleSide,
      });
      const leaf = new THREE.Mesh(geometry, material);

      // Random rotation for organic feel
      leaf.rotation.x = Math.random() * Math.PI * 0.3;
      leaf.rotation.y = Math.random() * Math.PI * 2;
      leaf.rotation.z = Math.random() * Math.PI * 0.3;

      group.add(leaf);

      // Vein line through center
      const veinGeometry = new THREE.CylinderGeometry(0.2, 0.2, size * 1.6, 8);
      const veinMaterial = new THREE.MeshBasicMaterial({
        color: lightMode ? 0x2d4a3e : 0xa8d5ba,
        transparent: true,
        opacity: 0.4,
      });
      const vein = new THREE.Mesh(veinGeometry, veinMaterial);
      vein.rotation.copy(leaf.rotation);
      group.add(vein);

      if (isSelected || isHovered) {
        // Glow sphere
        const glowGeometry = new THREE.SphereGeometry(size * 1.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: isSelected ? 0.25 : 0.12,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
      }

      return group;
    },
    [selectedNodeId, hoveredNodeId, lightMode]
  );

  const linkColor = useCallback((link: GraphLinkInternal) => {
    return EDGE_COLORS[link.type];
  }, []);

  const linkWidth = useCallback((link: GraphLinkInternal) => {
    return Math.max(1, link.weight * 3);
  }, []);

  const nodeLabel = useCallback(
    (node: GraphNodeInternal) => {
      const content =
        node.content.length > 45 ? node.content.substring(0, 45) + "..." : node.content;
      const textColor = lightMode ? "#2d4a3e" : "#a8d5ba";
      return `<div style="background: rgba(13,18,16,0.9); padding: 8px 12px; border-radius: 6px; color: ${textColor}; font-size: 12px; border: 1px solid #4a9c6d40;">
      <div style="font-weight: 600; margin-bottom: 4px; color: #4a9c6d;">${node.primarySector}</div>
      <div>${content}</div>
    </div>`;
    },
    [lightMode]
  );

  const bgColor = lightMode ? "#f5f7f2" : "#0d1210";

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: bgColor }}>
      <div className="absolute top-4 left-4 z-10 bg-ui-surface/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-ui-border/30">
        <h3 className="text-sm font-semibold text-ui-accent-primary">Style 5: Organic Tree (3D)</h3>
        <p className="text-xs text-ui-text-secondary">Leaf nodes, natural curves</p>
      </div>
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        width={width}
        height={height}
        backgroundColor={bgColor}
        nodeThreeObject={nodeThreeObject}
        nodeLabel={nodeLabel}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={0.5}
        linkCurvature={0.2}
        onNodeClick={(node) => onNodeClick?.(node.id)}
        onNodeHover={(node) => {
          setHoveredNodeId(node?.id ?? null);
        }}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.25}
      />
    </div>
  );
}

export default MemoryGraphStyle5;
