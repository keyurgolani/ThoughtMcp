/**
 * MemoryGraphStyle1 - 3D Force-Directed with Curved Links
 *
 * Reference implementation for graph style selection.
 * Features: Curved bezier links, glow effects, particle animations on links.
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

export interface MemoryGraphStyle1Props {
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

export function MemoryGraphStyle1({
  nodes,
  edges,
  selectedNodeId = null,
  onNodeClick,
  width = 800,
  height = 600,
  lightMode = false,
}: MemoryGraphStyle1Props): React.ReactElement {
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

  // Custom 3D node with glow effect
  const nodeThreeObject = useCallback(
    (node: GraphNodeInternal) => {
      const size = 4 + node.salience * 12;
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;
      const color = getSectorColor(node.primarySector, false, lightMode);

      const group = new THREE.Group();

      // Main sphere
      const geometry = new THREE.SphereGeometry(size, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: isSelected ? 0.5 : isHovered ? 0.3 : 0.1,
        shininess: 100,
        transparent: true,
        opacity: 0.9,
      });
      const sphere = new THREE.Mesh(geometry, material);
      group.add(sphere);

      // Glow effect for selected/hovered
      if (isSelected || isHovered) {
        const glowGeometry = new THREE.SphereGeometry(size * 1.5, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: isSelected ? 0.3 : 0.15,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
      }

      // Selection ring
      if (isSelected) {
        const ringGeometry = new THREE.RingGeometry(size + 2, size + 4, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        group.add(ring);
      }

      return group;
    },
    [selectedNodeId, hoveredNodeId, lightMode]
  );

  // Custom link with color based on type
  const linkColor = useCallback((link: GraphLinkInternal) => {
    return EDGE_COLORS[link.type];
  }, []);

  const linkWidth = useCallback((link: GraphLinkInternal) => {
    return Math.max(0.5, link.weight * 2);
  }, []);

  const nodeLabel = useCallback((node: GraphNodeInternal) => {
    const content = node.content.length > 50 ? node.content.substring(0, 50) + "..." : node.content;
    return `<div style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 6px; color: white; font-size: 12px; max-width: 300px;">
      <div style="font-weight: 600; margin-bottom: 4px; color: #6BA3BE;">${node.primarySector}</div>
      <div>${content}</div>
    </div>`;
  }, []);

  const bgColor = lightMode ? "#f8fafc" : "#0a0a0f";

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: bgColor }}>
      <div className="absolute top-4 left-4 z-10 bg-ui-surface/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-ui-border/30">
        <h3 className="text-sm font-semibold text-ui-accent-primary">Style 1: Curved Links (3D)</h3>
        <p className="text-xs text-ui-text-secondary">Glow spheres, particle flow</p>
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
        linkOpacity={0.6}
        linkDirectionalParticles={3}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleSpeed={0.006}
        onNodeClick={(node) => onNodeClick?.(node.id)}
        onNodeHover={(node) => {
          setHoveredNodeId(node?.id ?? null);
        }}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </div>
  );
}

export default MemoryGraphStyle1;
