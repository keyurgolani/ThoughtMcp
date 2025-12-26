/**
 * MemoryGraph3D Component
 *
 * A 3D force-directed graph visualization for memory nodes using react-force-graph-3d.
 * Provides immersive 3D navigation through the memory space with WebGL rendering.
 *
 * Requirements: 6.1, 6.2, 6.7
 * - 6.1: Memory graph renders without flickering during navigation
 * - 6.2: Memory graph animates smoothly when transitioning between nodes
 * - 6.7: Memory graph supports user viewport navigation (pan, zoom, rotate)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import * as THREE from "three";
import type { GraphNode, MemorySectorType } from "../../types/api";
import type { GraphEdge2D, GraphEdgeType } from "../../utils/graphEdges";
import { getSectorColor } from "../../utils/visualization";

// ============================================================================
// Types
// ============================================================================

/**
 * Internal node type for react-force-graph-3d
 */
interface GraphNodeInternal {
  id: string;
  content: string;
  primarySector: MemorySectorType;
  salience: number;
  strength: number;
  createdAt: string;
  metadata: GraphNode["metadata"];
  // Force graph adds these dynamically
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

/**
 * Internal link type for react-force-graph-3d
 */
interface GraphLinkInternal {
  source: string | GraphNodeInternal;
  target: string | GraphNodeInternal;
  type: GraphEdgeType;
  weight: number;
}

/**
 * Graph data structure for react-force-graph-3d
 */
interface GraphData {
  nodes: GraphNodeInternal[];
  links: GraphLinkInternal[];
}

export interface MemoryGraph3DProps {
  /** Array of memory nodes to display */
  nodes: GraphNode[];
  /** Array of edges connecting nodes */
  edges: GraphEdge2D[];
  /** Currently selected node ID */
  selectedNodeId?: string | null;
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Callback when a node is hovered */
  onNodeHover?: (nodeId: string | null) => void;
  /** Width of the graph container */
  width?: number;
  /** Height of the graph container */
  height?: number;
  /** Whether to use high contrast colors */
  highContrast?: boolean;
  /** Whether to use light mode colors */
  lightMode?: boolean;
  /** CSS class name */
  className?: string;
  /** Background color */
  backgroundColor?: string;
  /** Enable zoom controls */
  enableZoom?: boolean;
  /** Enable rotation controls */
  enableRotation?: boolean;
  /** Enable node dragging */
  enableNodeDrag?: boolean;
  /** Large graph mode - optimizes for 1000+ nodes */
  largeGraphMode?: boolean;
  /** Show navigation controls */
  showNavInfo?: boolean;
  /** Ref to expose graph methods for external control */
  graphRef?: React.MutableRefObject<{
    centerAt: (x: number, y: number, z: number) => void;
    cameraPosition: (pos: { x: number; y: number; z: number }) => void;
  } | null>;
}

// ============================================================================
// Constants
// ============================================================================

/** Edge colors by type */
const EDGE_COLORS: Record<GraphEdgeType, string> = {
  tag: "#6BA3BE",
  similarity: "#8B7BB5",
  mention: "#E8B86D",
};

/** Light mode edge colors */
const LIGHT_MODE_EDGE_COLORS: Record<GraphEdgeType, string> = {
  tag: "#0077B6",
  similarity: "#7B2CBF",
  mention: "#D4880F",
};

/** Node size range based on salience */
const NODE_SIZE = {
  min: 3,
  max: 12,
};

/** Default camera transition duration in ms */
const CAMERA_TRANSITION_DURATION = 1000;

/** Large graph threshold */
const LARGE_GRAPH_THRESHOLD = 500;

/** Performance tuning for large graphs */
const LARGE_GRAPH_CONFIG = {
  warmupTicks: 100,
  cooldownTicks: 0,
  d3AlphaDecay: 0.0228,
  d3VelocityDecay: 0.4,
};

/** Performance tuning for small graphs */
const SMALL_GRAPH_CONFIG = {
  warmupTicks: 50,
  cooldownTicks: 100,
  d3AlphaDecay: 0.02,
  d3VelocityDecay: 0.3,
};

// ============================================================================
// Helper Functions
// ============================================================================

function calculateNodeSize(salience: number): number {
  const clampedSalience = Math.max(0, Math.min(1, salience));
  return NODE_SIZE.min + clampedSalience * (NODE_SIZE.max - NODE_SIZE.min);
}

function getEdgeColor(type: GraphEdgeType, lightMode: boolean = false): string {
  return lightMode ? LIGHT_MODE_EDGE_COLORS[type] : EDGE_COLORS[type];
}

// ============================================================================
// Main Component
// ============================================================================

export function MemoryGraph3D({
  nodes,
  edges,
  selectedNodeId = null,
  onNodeClick,
  onNodeHover,
  width,
  height,
  highContrast = false,
  lightMode = false,
  className = "",
  backgroundColor,
  enableNodeDrag = true,
  largeGraphMode,
  showNavInfo = true,
  graphRef: externalGraphRef,
}: MemoryGraph3DProps): React.ReactElement {
  const graphRef = useRef<ForceGraphMethods<GraphNodeInternal, GraphLinkInternal> | undefined>(
    undefined
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({
    width: width ?? 800,
    height: height ?? 600,
  });

  // Auto-detect large graph mode
  const isLargeGraph = largeGraphMode ?? nodes.length > LARGE_GRAPH_THRESHOLD;
  const graphConfig = isLargeGraph ? LARGE_GRAPH_CONFIG : SMALL_GRAPH_CONFIG;

  // Expose graph methods to external ref
  useEffect(() => {
    if (externalGraphRef) {
      externalGraphRef.current = {
        centerAt: (x: number, y: number, z: number): void => {
          if (graphRef.current) {
            graphRef.current.cameraPosition(
              { x, y, z: z + 200 },
              { x, y, z },
              CAMERA_TRANSITION_DURATION
            );
          }
        },
        cameraPosition: (pos: { x: number; y: number; z: number }): void => {
          if (graphRef.current) {
            graphRef.current.cameraPosition(pos, undefined, CAMERA_TRANSITION_DURATION);
          }
        },
      };
    }
    return (): void => {
      if (externalGraphRef) {
        externalGraphRef.current = null;
      }
    };
  }, [externalGraphRef]);

  // Convert nodes and edges to graph data format
  const graphData: GraphData = useMemo(() => {
    const graphNodes: GraphNodeInternal[] = nodes.map((node) => ({
      id: node.id,
      content: node.content,
      primarySector: node.primarySector,
      salience: node.salience,
      strength: node.strength,
      createdAt: node.createdAt,
      metadata: node.metadata,
    }));

    const graphLinks: GraphLinkInternal[] = edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
      weight: edge.weight,
    }));

    return { nodes: graphNodes, links: graphLinks };
  }, [nodes, edges]);

  // Handle container resize
  useEffect(() => {
    if (width !== undefined && height !== undefined) {
      setDimensions({ width, height });
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        setDimensions({ width: w || 800, height: h || 600 });
      }
    });

    resizeObserver.observe(container);
    return (): void => {
      resizeObserver.disconnect();
    };
  }, [width, height]);

  // Center on selected node
  useEffect(() => {
    if (selectedNodeId === null || selectedNodeId === "" || !graphRef.current) return;

    const node = graphData.nodes.find((n) => n.id === selectedNodeId);
    if (node && node.x !== undefined && node.y !== undefined) {
      const z = node.z ?? 0;
      graphRef.current.cameraPosition(
        { x: node.x, y: node.y, z: z + 150 },
        { x: node.x, y: node.y, z },
        CAMERA_TRANSITION_DURATION
      );
    }
  }, [selectedNodeId, graphData.nodes]);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: GraphNodeInternal): void => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
      // Zoom to clicked node
      if (graphRef.current && node.x !== undefined && node.y !== undefined) {
        const z = node.z ?? 0;
        graphRef.current.cameraPosition(
          { x: node.x, y: node.y, z: z + 100 },
          { x: node.x, y: node.y, z },
          CAMERA_TRANSITION_DURATION
        );
      }
    },
    [onNodeClick]
  );

  // Handle node hover
  const handleNodeHover = useCallback(
    (node: GraphNodeInternal | null): void => {
      const nodeId = node?.id ?? null;
      setHoveredNodeId(nodeId);
      if (onNodeHover) {
        onNodeHover(nodeId);
      }
    },
    [onNodeHover]
  );

  // Custom 3D node object using Three.js
  const nodeThreeObject = useCallback(
    (node: GraphNodeInternal) => {
      const size = calculateNodeSize(node.salience);
      const color = getSectorColor(node.primarySector, highContrast, lightMode);
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;

      // Create sphere geometry
      const geometry = new THREE.SphereGeometry(size, 16, 16);

      // Create material with glow effect for selected/hovered
      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: isSelected || isHovered ? color : "#000000",
        emissiveIntensity: isSelected ? 0.5 : isHovered ? 0.3 : 0,
        shininess: 80,
        transparent: true,
        opacity: 0.9,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Add ring for selected node
      if (isSelected) {
        const ringGeometry = new THREE.RingGeometry(size + 2, size + 4, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: "#ffffff",
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        mesh.add(ring);
      }

      return mesh;
    },
    [selectedNodeId, hoveredNodeId, highContrast, lightMode]
  );

  // Link color based on type
  const linkColor = useCallback(
    (link: GraphLinkInternal) => {
      return getEdgeColor(link.type, lightMode);
    },
    [lightMode]
  );

  // Link width based on weight
  const linkWidth = useCallback((link: GraphLinkInternal) => {
    return Math.max(0.5, link.weight * 2);
  }, []);

  // Node label
  const nodeLabel = useCallback((node: GraphNodeInternal) => {
    const content = node.content.length > 50 ? node.content.substring(0, 50) + "..." : node.content;
    return `<div style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 6px; color: white; font-size: 12px; max-width: 300px;">
      <div style="font-weight: 600; margin-bottom: 4px;">${node.primarySector}</div>
      <div>${content}</div>
    </div>`;
  }, []);

  // Background color
  const bgColor = backgroundColor ?? (lightMode ? "#f8fafc" : "#0a0a0f");

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor={bgColor}
        // Node configuration
        nodeId="id"
        nodeThreeObject={nodeThreeObject}
        nodeLabel={nodeLabel}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        // Link configuration
        linkSource="source"
        linkTarget="target"
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={0.6}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1}
        linkDirectionalParticleSpeed={0.005}
        // Force simulation
        d3AlphaDecay={graphConfig.d3AlphaDecay}
        d3VelocityDecay={graphConfig.d3VelocityDecay}
        // Controls
        enableNodeDrag={isLargeGraph ? false : enableNodeDrag}
        showNavInfo={showNavInfo}
        // Performance
        warmupTicks={graphConfig.warmupTicks}
        cooldownTicks={graphConfig.cooldownTicks}
      />
    </div>
  );
}

export default MemoryGraph3D;
