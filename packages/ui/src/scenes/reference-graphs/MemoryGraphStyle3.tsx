/**
 * MemoryGraphStyle3 - 3D Cluster/Group Layout
 *
 * Reference implementation for graph style selection.
 * Features: Nodes clustered by sector type in 3D space, octahedron nodes.
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

export interface MemoryGraphStyle3Props {
  nodes: GraphNode[];
  edges: GraphEdge2D[];
  selectedNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  width?: number;
  height?: number;
  lightMode?: boolean;
}

// 3D cluster positions - vertices of a larger structure
const SECTOR_POSITIONS: Record<MemorySectorType, { x: number; y: number; z: number }> = {
  episodic: { x: -100, y: 80, z: 0 },
  semantic: { x: 100, y: 80, z: 0 },
  procedural: { x: 0, y: -100, z: 80 },
  emotional: { x: -80, y: -50, z: -80 },
  reflective: { x: 80, y: -50, z: -80 },
};

const EDGE_COLORS: Record<GraphEdgeType, string> = {
  tag: "#6ba3be",
  similarity: "#8b7bb5",
  mention: "#e8b86d",
};

export function MemoryGraphStyle3({
  nodes,
  edges,
  selectedNodeId = null,
  onNodeClick,
  width = 800,
  height = 600,
  lightMode = false,
}: MemoryGraphStyle3Props): React.ReactElement {
  const graphRef = useRef<ForceGraphMethods<GraphNodeInternal, GraphLinkInternal> | undefined>(
    undefined
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const graphData = useMemo(() => {
    const graphNodes: GraphNodeInternal[] = nodes.map((n) => {
      const clusterPos = SECTOR_POSITIONS[n.primarySector];
      return {
        id: n.id,
        content: n.content,
        primarySector: n.primarySector,
        salience: n.salience,
        strength: n.strength,
        x: clusterPos.x + (Math.random() - 0.5) * 60,
        y: clusterPos.y + (Math.random() - 0.5) * 60,
        z: clusterPos.z + (Math.random() - 0.5) * 60,
      };
    });

    return {
      nodes: graphNodes,
      links: edges.map((e) => ({
        source: e.source,
        target: e.target,
        type: e.type,
        weight: e.weight,
      })),
    };
  }, [nodes, edges]);

  useEffect(() => {
    if (selectedNodeId !== null && graphRef.current) {
      const node = graphData.nodes.find((n) => n.id === selectedNodeId);
      if (node && node.x !== undefined && node.y !== undefined) {
        const z = node.z ?? 0;
        graphRef.current.cameraPosition(
          { x: node.x + 100, y: node.y + 50, z: z + 150 },
          { x: node.x, y: node.y, z },
          1000
        );
      }
    }
  }, [selectedNodeId, graphData.nodes]);

  // Octahedron (diamond) nodes
  const nodeThreeObject = useCallback(
    (node: GraphNodeInternal) => {
      const size = 5 + node.salience * 10;
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;
      const color = getSectorColor(node.primarySector, false, lightMode);

      const group = new THREE.Group();

      // Octahedron shape (3D diamond)
      const geometry = new THREE.OctahedronGeometry(size, 0);
      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: isSelected ? 0.5 : isHovered ? 0.3 : 0.1,
        shininess: 100,
        flatShading: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);

      if (isSelected || isHovered) {
        const outlineGeometry = new THREE.OctahedronGeometry(size * 1.2, 0);
        const outlineMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: true,
          transparent: true,
          opacity: isSelected ? 0.8 : 0.4,
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        group.add(outline);
      }

      return group;
    },
    [selectedNodeId, hoveredNodeId, lightMode]
  );

  const linkColor = useCallback((link: GraphLinkInternal) => {
    const source = link.source as GraphNodeInternal;
    const target = link.target as GraphNodeInternal;
    const isCrossCluster = source.primarySector !== target.primarySector;
    // Brighter color for cross-cluster links
    return isCrossCluster ? "#ffffff" : EDGE_COLORS[link.type];
  }, []);

  const linkWidth = useCallback((link: GraphLinkInternal) => {
    const source = link.source as GraphNodeInternal;
    const target = link.target as GraphNodeInternal;
    const isCrossCluster = source.primarySector !== target.primarySector;
    return Math.max(0.5, link.weight * (isCrossCluster ? 2 : 1));
  }, []);

  // Note: linkOpacity in ForceGraph3D only accepts a number, not a function
  // Cross-cluster highlighting is done via linkColor and linkWidth instead

  const nodeLabel = useCallback((node: GraphNodeInternal) => {
    const content = node.content.length > 45 ? node.content.substring(0, 45) + "..." : node.content;
    return `<div style="background: rgba(0,0,0,0.85); padding: 8px 12px; border-radius: 6px; color: white; font-size: 12px;">
      <div style="font-weight: 600; margin-bottom: 4px; text-transform: capitalize;">${node.primarySector}</div>
      <div>${content}</div>
    </div>`;
  }, []);

  const bgColor = lightMode ? "#f8fafc" : "#0a0a0f";

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: bgColor }}>
      <div className="absolute top-4 left-4 z-10 bg-ui-surface/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-ui-border/30">
        <h3 className="text-sm font-semibold text-ui-accent-primary">Style 3: Clustered (3D)</h3>
        <p className="text-xs text-ui-text-secondary">Sector groups, octahedron nodes</p>
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
        d3AlphaDecay={0.05}
        d3VelocityDecay={0.5}
        onNodeClick={(node) => onNodeClick?.(node.id)}
        onNodeHover={(node) => {
          setHoveredNodeId(node?.id ?? null);
        }}
      />
    </div>
  );
}

export default MemoryGraphStyle3;
