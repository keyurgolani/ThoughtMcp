/**
 * MemoryGraphStyle4 - 3D Neural Network Style
 *
 * Reference implementation for graph style selection.
 * Features: Pulsing nodes, animated particle flow on links, neural aesthetic.
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

export interface MemoryGraphStyle4Props {
  nodes: GraphNode[];
  edges: GraphEdge2D[];
  selectedNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  width?: number;
  height?: number;
  lightMode?: boolean;
}

const EDGE_COLORS: Record<GraphEdgeType, string> = {
  tag: "#00ffff",
  similarity: "#ff00ff",
  mention: "#ffff00",
};

export function MemoryGraphStyle4({
  nodes,
  edges,
  selectedNodeId = null,
  onNodeClick,
  width = 800,
  height = 600,
  lightMode = false,
}: MemoryGraphStyle4Props): React.ReactElement {
  const graphRef = useRef<ForceGraphMethods<GraphNodeInternal, GraphLinkInternal> | undefined>(
    undefined
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Animation loop for pulsing effect
  useEffect(() => {
    let frameId: number;
    const animate = (): void => {
      setAnimationFrame((f) => (f + 1) % 120);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return (): void => {
      cancelAnimationFrame(frameId);
    };
  }, []);

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
          { x: node.x, y: node.y, z: z + 120 },
          { x: node.x, y: node.y, z },
          1000
        );
      }
    }
  }, [selectedNodeId, graphData.nodes]);

  // Neural network style nodes with pulsing glow
  const nodeThreeObject = useCallback(
    (node: GraphNodeInternal) => {
      const baseSize = 4 + node.salience * 10;
      const pulse = Math.sin(animationFrame * 0.05 + node.salience * 10) * 0.15 + 1;
      const size = baseSize * pulse;
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;
      const color = getSectorColor(node.primarySector, false, lightMode);

      const group = new THREE.Group();

      // Outer glow sphere
      const glowGeometry = new THREE.SphereGeometry(size * 2, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.15 * pulse,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      group.add(glow);

      // Main sphere
      const geometry = new THREE.SphereGeometry(size, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3 * pulse,
        shininess: 150,
        transparent: true,
        opacity: 0.9,
      });
      const sphere = new THREE.Mesh(geometry, material);
      group.add(sphere);

      // Inner bright core
      const coreGeometry = new THREE.SphereGeometry(size * 0.4, 16, 16);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      group.add(core);

      if (isSelected || isHovered) {
        const ringGeometry = new THREE.TorusGeometry(size + 4, 0.8, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: isSelected ? 0xffffff : 0xaaaaaa,
          transparent: true,
          opacity: isSelected ? 0.9 : 0.5,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      }

      return group;
    },
    [selectedNodeId, hoveredNodeId, lightMode, animationFrame]
  );

  const linkColor = useCallback((link: GraphLinkInternal) => {
    return EDGE_COLORS[link.type];
  }, []);

  const linkWidth = useCallback((link: GraphLinkInternal) => {
    return Math.max(1, link.weight * 2);
  }, []);

  const nodeLabel = useCallback((node: GraphNodeInternal) => {
    const content = node.content.length > 50 ? node.content.substring(0, 50) + "..." : node.content;
    return `<div style="background: rgba(0,0,0,0.9); padding: 10px 14px; border-radius: 8px; color: white; font-size: 12px; border: 1px solid #00ffff40;">
      <div style="font-weight: 600; margin-bottom: 4px; color: #00ffff;">${node.primarySector}</div>
      <div>${content}</div>
    </div>`;
  }, []);

  const bgColor = lightMode ? "#f0f4f8" : "#050508";

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: bgColor }}>
      <div className="absolute top-4 left-4 z-10 bg-ui-surface/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-ui-border/30">
        <h3 className="text-sm font-semibold text-ui-accent-primary">
          Style 4: Neural Network (3D)
        </h3>
        <p className="text-xs text-ui-text-secondary">Pulsing nodes, particle flow</p>
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
        linkOpacity={0.4}
        linkDirectionalParticles={4}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.008}
        linkDirectionalParticleColor={linkColor}
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

export default MemoryGraphStyle4;
