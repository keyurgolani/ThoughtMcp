/**
 * MemoryGraph2D Component
 *
 * A 2D force-directed graph visualization for memory nodes using react-force-graph-2d.
 * Optimized for large graphs using the same approach as the react-force-graph large-graph example.
 * Uses nodeCanvasObjectMode: 'replace' for maximum performance with custom rendering.
 *
 * Requirements: 6.1, 6.2, 6.7
 * - 6.1: Memory graph renders without flickering during navigation
 * - 6.2: Memory graph animates smoothly when transitioning between nodes
 * - 6.7: Memory graph supports user viewport navigation (pan, zoom)
 *
 * @see https://vasturiano.github.io/react-force-graph/example/large-graph
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import type { GraphNode, MemorySectorType } from "../../types/api";
import type { GraphEdge2D, GraphEdgeType } from "../../utils/graphEdges";
import { getSectorColor } from "../../utils/visualization";

// ============================================================================
// Types
// ============================================================================

/**
 * Internal node type for react-force-graph-2d
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
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

/**
 * Internal link type for react-force-graph-2d
 */
interface GraphLinkInternal {
  source: string | GraphNodeInternal;
  target: string | GraphNodeInternal;
  type: GraphEdgeType;
  weight: number;
}

/**
 * Graph data structure for react-force-graph-2d
 */
interface GraphData {
  nodes: GraphNodeInternal[];
  links: GraphLinkInternal[];
}

export interface MemoryGraph2DProps {
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
  /** Enable pan controls */
  enablePan?: boolean;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Enable node dragging (disable for large graphs) */
  enableNodeDrag?: boolean;
  /** Large graph mode - optimizes for 1000+ nodes */
  largeGraphMode?: boolean;
  /** Ref to expose graph methods for external control */
  graphRef?: React.MutableRefObject<{ centerAt: (x: number, y: number) => void } | null>;
}

// ============================================================================
// Constants
// ============================================================================

/** Edge colors by type */
const EDGE_COLORS: Record<GraphEdgeType, string> = {
  tag: "#6BA3BE", // Steel blue for tag connections
  similarity: "#8B7BB5", // Muted purple for similarity
  mention: "#E8B86D", // Muted gold for explicit mentions
};

/** Light mode edge colors */
const LIGHT_MODE_EDGE_COLORS: Record<GraphEdgeType, string> = {
  tag: "#0077B6", // Bold blue
  similarity: "#7B2CBF", // Bold purple
  mention: "#D4880F", // Bold amber
};

/** Node size range based on salience */
const NODE_SIZE = {
  min: 4,
  max: 16,
};

/** Default camera transition duration in ms */
const CAMERA_TRANSITION_DURATION = 500;

/** Large graph threshold - auto-enable optimizations above this count */
const LARGE_GRAPH_THRESHOLD = 500;

/** Performance tuning for large graphs */
const LARGE_GRAPH_CONFIG = {
  warmupTicks: 100,
  cooldownTicks: 0, // Disable cooldown for instant rendering
  d3AlphaDecay: 0.0228, // Default d3 value
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

/**
 * Calculates node size based on salience value.
 */
function calculateNodeSize(salience: number): number {
  const clampedSalience = Math.max(0, Math.min(1, salience));
  return NODE_SIZE.min + clampedSalience * (NODE_SIZE.max - NODE_SIZE.min);
}

/**
 * Gets edge color based on type and mode.
 */
function getEdgeColor(type: GraphEdgeType, lightMode: boolean = false): string {
  return lightMode ? LIGHT_MODE_EDGE_COLORS[type] : EDGE_COLORS[type];
}

/**
 * Truncates content for display in node labels.
 */
function truncateContent(content: string, maxLength: number = 30): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength - 3) + "...";
}

// ============================================================================
// Main Component
// ============================================================================

export function MemoryGraph2D({
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
  enableZoom = true,
  enablePan = true,
  minZoom = 0.5,
  maxZoom = 8,
  enableNodeDrag = true,
  largeGraphMode,
  graphRef: externalGraphRef,
}: MemoryGraph2DProps): React.ReactElement {
  // Use a ref with the correct generic types for the library
  const graphRef = useRef<ForceGraphMethods<GraphNodeInternal, GraphLinkInternal> | undefined>(
    undefined
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({
    width: width ?? 800,
    height: height ?? 600,
  });

  // Expose graph methods to external ref
  useEffect(() => {
    if (externalGraphRef) {
      externalGraphRef.current = {
        centerAt: (x: number, y: number): void => {
          if (graphRef.current) {
            graphRef.current.centerAt(x, y, CAMERA_TRANSITION_DURATION);
            graphRef.current.zoom(2, CAMERA_TRANSITION_DURATION);
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

  // Auto-detect large graph mode based on node count
  const isLargeGraph = largeGraphMode ?? nodes.length > LARGE_GRAPH_THRESHOLD;
  const graphConfig = isLargeGraph ? LARGE_GRAPH_CONFIG : SMALL_GRAPH_CONFIG;

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

  // Center on selected node with smooth transition (Requirement 6.2)
  useEffect(() => {
    if (selectedNodeId === null || selectedNodeId === "" || !graphRef.current) return;

    const node = graphData.nodes.find((n) => n.id === selectedNodeId);
    if (node && node.x !== undefined && node.y !== undefined) {
      graphRef.current.centerAt(node.x, node.y, CAMERA_TRANSITION_DURATION);
      graphRef.current.zoom(2, CAMERA_TRANSITION_DURATION);
    }
  }, [selectedNodeId, graphData.nodes]);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: GraphNodeInternal): void => {
      if (onNodeClick) {
        onNodeClick(node.id);
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

  // Custom node rendering with sector colors (Requirement 6.1)
  // Uses 'replace' mode for maximum performance (like large-graph example)
  const nodeCanvasObject = useCallback(
    (node: GraphNodeInternal, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { x, y, primarySector, salience, content, id } = node;
      if (x === undefined || y === undefined) return;

      const size = calculateNodeSize(salience);
      const isSelected = id === selectedNodeId;
      const isHovered = id === hoveredNodeId;
      const color = getSectorColor(primarySector, highContrast, lightMode);

      // Draw node circle
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);

      // Fill with sector color
      ctx.fillStyle = color;
      ctx.fill();

      // Draw border for selected/hovered nodes
      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = isSelected ? 3 / globalScale : 2 / globalScale;
        ctx.stroke();
      }

      // Draw label when zoomed in or hovered (skip in large graph mode at low zoom for performance)
      const showLabel = isLargeGraph
        ? (globalScale > 2 && isHovered) || isSelected
        : globalScale > 1.5 || isHovered || isSelected;

      if (showLabel) {
        const label = truncateContent(content, 20);
        const fontSize = Math.max(10 / globalScale, 3);
        ctx.font = `${String(fontSize)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        // Draw label background
        const textWidth = ctx.measureText(label).width;
        const padding = 2 / globalScale;
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(
          x - textWidth / 2 - padding,
          y + size + 2 / globalScale,
          textWidth + padding * 2,
          fontSize + padding * 2
        );

        // Draw label text
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, x, y + size + 4 / globalScale);
      }
    },
    [selectedNodeId, hoveredNodeId, highContrast, lightMode, isLargeGraph]
  );

  // Node canvas object mode - 'replace' for maximum performance
  const nodeCanvasObjectMode = useCallback(() => "replace" as const, []);

  // Custom link rendering by type
  const linkCanvasObject = useCallback(
    (link: GraphLinkInternal, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const source = link.source as GraphNodeInternal;
      const target = link.target as GraphNodeInternal;

      if (
        source.x === undefined ||
        source.y === undefined ||
        target.x === undefined ||
        target.y === undefined
      ) {
        return;
      }

      const color = getEdgeColor(link.type, lightMode);
      const lineWidth = Math.max(0.5, link.weight * 2) / globalScale;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = 0.6 + link.weight * 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    [lightMode]
  );

  // Node pointer area for click detection
  const nodePointerAreaPaint = useCallback(
    (node: GraphNodeInternal, color: string, ctx: CanvasRenderingContext2D) => {
      const size = calculateNodeSize(node.salience);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, size + 2, 0, 2 * Math.PI);
      ctx.fill();
    },
    []
  );

  // Determine background color
  const bgColor = backgroundColor ?? (lightMode ? "#f8fafc" : "#0a0a0f");

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor={bgColor}
        // Node configuration
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={nodeCanvasObjectMode}
        nodePointerAreaPaint={nodePointerAreaPaint}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        // Link configuration
        linkSource="source"
        linkTarget="target"
        linkCanvasObject={linkCanvasObject}
        linkDirectionalParticles={0}
        // Force simulation - optimized based on graph size
        d3AlphaDecay={graphConfig.d3AlphaDecay}
        d3VelocityDecay={graphConfig.d3VelocityDecay}
        // Zoom and pan controls (Requirement 6.7)
        enableZoomInteraction={enableZoom}
        enablePanInteraction={enablePan}
        enableNodeDrag={isLargeGraph ? false : enableNodeDrag}
        minZoom={minZoom}
        maxZoom={maxZoom}
        // Performance - optimized for large graphs
        warmupTicks={graphConfig.warmupTicks}
        cooldownTicks={graphConfig.cooldownTicks}
      />
    </div>
  );
}

export default MemoryGraph2D;
