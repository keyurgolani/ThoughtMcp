/**
 * MemoryGraphStyle2 - 3D Radial/Spherical Layout
 *
 * Reference implementation for graph style selection.
 * Features: Spherical layout from center, concentric shells by salience, icosahedron nodes.
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
  fx?: number;
  fy?: number;
  fz?: number;
}

interface GraphLinkInternal {
  source: string | GraphNodeInternal;
  target: string | GraphNodeInternal;
  type: GraphEdgeType;
  weight: number;
}

export interface MemoryGraphStyle2Props {
  nodes: GraphNode[];
  edges: GraphEdge2D[];
  selectedNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  width?: number;
  height?: number;
  lightMode?: boolean;
}

const EDGE_COLORS: Record<GraphEdgeType, string> = {
  tag: "#6ba3be",
  similarity: "#8b7bb5",
  mention: "#e8b86d",
};

export function MemoryGraphStyle2({
  nodes,
  edges,
  selectedNodeId = null,
  onNodeClick,
  width = 800,
  height = 600,
  lightMode = false,
}: MemoryGraphStyle2Props): React.ReactElement {
  const graphRef = useRef<ForceGraphMethods<GraphNodeInternal, GraphLinkInternal> | undefined>(
    undefined
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Spherical layout - position nodes in concentric shells based on salience
  const graphData = useMemo(() => {
    const maxRadius = 200;

    // Sort by salience (highest in center)
    const sortedNodes = [...nodes].sort((a, b) => b.salience - a.salience);

    const graphNodes: GraphNodeInternal[] = sortedNodes.map((n, i) => {
      const shell = Math.floor(i / 12); // 12 nodes per shell
      const posInShell = i % 12;
      const shellRadius = (shell + 1) * (maxRadius / Math.ceil(sortedNodes.length / 12));

      // Fibonacci sphere distribution for even spacing
      const phi = Math.acos(1 - (2 * (posInShell + 0.5)) / 12);
      const theta = Math.PI * (1 + Math.sqrt(5)) * posInShell + shell * 0.5;

      return {
        id: n.id,
        content: n.content,
        primarySector: n.primarySector,
        salience: n.salience,
        strength: n.strength,
        fx: shellRadius * Math.sin(phi) * Math.cos(theta),
        fy: shellRadius * Math.sin(phi) * Math.sin(theta),
        fz: shellRadius * Math.cos(phi),
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
      if (node && node.fx !== undefined && node.fy !== undefined) {
        const z = node.fz ?? 0;
        graphRef.current.cameraPosition(
          { x: node.fx * 1.5, y: node.fy * 1.5, z: z * 1.5 + 100 },
          { x: node.fx, y: node.fy, z },
          1000
        );
      }
    }
  }, [selectedNodeId, graphData.nodes]);

  // Icosahedron nodes for geometric variety
  const nodeThreeObject = useCallback(
    (node: GraphNodeInternal) => {
      const size = 6 + node.salience * 10;
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;
      const color = getSectorColor(node.primarySector, false, lightMode);

      const group = new THREE.Group();

      // Icosahedron shape
      const geometry = new THREE.IcosahedronGeometry(size, 0);
      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: isSelected ? 0.4 : isHovered ? 0.2 : 0.05,
        shininess: 80,
        flatShading: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);

      // Wireframe overlay
      const wireGeometry = new THREE.IcosahedronGeometry(size * 1.02, 0);
      const wireMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: isSelected ? 0.5 : isHovered ? 0.3 : 0.1,
      });
      const wireframe = new THREE.Mesh(wireGeometry, wireMaterial);
      group.add(wireframe);

      if (isSelected) {
        const ringGeometry = new THREE.TorusGeometry(size + 3, 0.5, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.8,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      }

      return group;
    },
    [selectedNodeId, hoveredNodeId, lightMode]
  );

  const linkColor = useCallback((link: GraphLinkInternal) => {
    return EDGE_COLORS[link.type];
  }, []);

  const linkWidth = useCallback((link: GraphLinkInternal) => {
    return Math.max(0.5, link.weight * 1.5);
  }, []);

  const nodeLabel = useCallback((node: GraphNodeInternal) => {
    const content = node.content.length > 40 ? node.content.substring(0, 40) + "..." : node.content;
    return `<div style="background: rgba(0,0,0,0.85); padding: 8px 12px; border-radius: 6px; color: white; font-size: 12px;">
      <div style="font-weight: 600; margin-bottom: 4px; color: #8B7BB5;">${node.primarySector}</div>
      <div>${content}</div>
    </div>`;
  }, []);

  const bgColor = lightMode ? "#f8fafc" : "#0a0a0f";

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: bgColor }}>
      <div className="absolute top-4 left-4 z-10 bg-ui-surface/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-ui-border/30">
        <h3 className="text-sm font-semibold text-ui-accent-primary">
          Style 2: Radial Layout (3D)
        </h3>
        <p className="text-xs text-ui-text-secondary">Spherical shells, icosahedron nodes</p>
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
        cooldownTicks={0}
        onNodeClick={(node) => onNodeClick?.(node.id)}
        onNodeHover={(node) => {
          setHoveredNodeId(node?.id ?? null);
        }}
      />
    </div>
  );
}

export default MemoryGraphStyle2;
