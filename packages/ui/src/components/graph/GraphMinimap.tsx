/**
 * GraphMinimap Component
 *
 * A minimap for the memory graph that shows a scaled-down overview of the entire
 * graph with a viewport indicator showing the current visible area.
 *
 * Requirements: 6.5
 * - Display an intuitive representation of the graph
 * - Show viewport indicator for current visible area
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
interface MinimapNodeInternal {
  id: string;
  content: string;
  primarySector: MemorySectorType;
  salience: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

/**
 * Internal link type for react-force-graph-2d
 */
interface MinimapLinkInternal {
  source: string | MinimapNodeInternal;
  target: string | MinimapNodeInternal;
  type: GraphEdgeType;
  weight: number;
}

/**
 * Graph data structure for react-force-graph-2d
 */
interface MinimapGraphData {
  nodes: MinimapNodeInternal[];
  links: MinimapLinkInternal[];
}

/**
 * Viewport bounds representing the visible area in the main graph
 */
export interface ViewportBounds {
  /** Left edge x coordinate */
  x: number;
  /** Top edge y coordinate */
  y: number;
  /** Width of the viewport */
  width: number;
  /** Height of the viewport */
  height: number;
}

export interface GraphMinimapProps {
  /** Array of memory nodes to display */
  nodes: GraphNode[];
  /** Array of edges connecting nodes */
  edges: GraphEdge2D[];
  /** Current viewport bounds from the main graph */
  viewportBounds?: ViewportBounds | null;
  /** Callback when user clicks on the minimap to navigate */
  onNavigate?: (x: number, y: number) => void;
  /** Width of the minimap */
  width?: number;
  /** Height of the minimap */
  height?: number;
  /** Whether to use high contrast colors */
  highContrast?: boolean;
  /** Whether to use light mode colors */
  lightMode?: boolean;
  /** CSS class name */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default minimap dimensions */
const DEFAULT_WIDTH = 180;
const DEFAULT_HEIGHT = 140;

/** Node size in minimap (smaller than main graph) */
const NODE_SIZE = {
  min: 2,
  max: 6,
};

/** Edge colors by type (muted for minimap) */
const EDGE_COLORS: Record<GraphEdgeType, string> = {
  tag: "rgba(107, 163, 190, 0.4)",
  similarity: "rgba(139, 123, 181, 0.4)",
  mention: "rgba(232, 184, 109, 0.4)",
};

/** Viewport indicator styling */
const VIEWPORT_STROKE_COLOR = "rgba(0, 255, 255, 0.8)";
const VIEWPORT_FILL_COLOR = "rgba(0, 255, 255, 0.1)";
const VIEWPORT_STROKE_WIDTH = 2;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculates node size based on salience value (scaled down for minimap).
 */
function calculateNodeSize(salience: number): number {
  const clampedSalience = Math.max(0, Math.min(1, salience));
  return NODE_SIZE.min + clampedSalience * (NODE_SIZE.max - NODE_SIZE.min);
}

/**
 * Gets edge color based on type.
 */
function getEdgeColor(type: GraphEdgeType): string {
  return EDGE_COLORS[type];
}

// ============================================================================
// Main Component
// ============================================================================

export function GraphMinimap({
  nodes,
  edges,
  viewportBounds = null,
  onNavigate,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  highContrast = false,
  lightMode = false,
  className = "",
}: GraphMinimapProps): React.ReactElement {
  const graphRef = useRef<ForceGraphMethods<MinimapNodeInternal, MinimapLinkInternal> | undefined>(
    undefined
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStabilized, setIsStabilized] = useState(false);

  // Convert nodes and edges to graph data format
  const graphData: MinimapGraphData = useMemo(() => {
    const graphNodes: MinimapNodeInternal[] = nodes.map((node) => ({
      id: node.id,
      content: node.content,
      primarySector: node.primarySector,
      salience: node.salience,
    }));

    const graphLinks: MinimapLinkInternal[] = edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
      weight: edge.weight,
    }));

    return { nodes: graphNodes, links: graphLinks };
  }, [nodes, edges]);

  // Fit graph to view once stabilized
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      // Wait for simulation to stabilize then zoom to fit
      const timer = setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(200, 20);
          setIsStabilized(true);
        }
      }, 500);
      return (): void => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [graphData.nodes.length]);

  // Handle click on minimap to navigate
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onNavigate || !graphRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Convert screen coordinates to graph coordinates
      const graphCoords = graphRef.current.screen2GraphCoords(clickX, clickY);
      onNavigate(graphCoords.x, graphCoords.y);
    },
    [onNavigate]
  );

  // Custom node rendering (simplified for minimap)
  const nodeCanvasObject = useCallback(
    (node: MinimapNodeInternal, ctx: CanvasRenderingContext2D, _globalScale: number) => {
      const { x, y, primarySector, salience } = node;
      if (x === undefined || y === undefined) return;

      const size = calculateNodeSize(salience);
      const color = getSectorColor(primarySector, highContrast, lightMode);

      // Draw simple circle node
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [highContrast, lightMode]
  );

  // Custom link rendering (simplified for minimap)
  const linkCanvasObject = useCallback(
    (link: MinimapLinkInternal, ctx: CanvasRenderingContext2D, _globalScale: number) => {
      const source = link.source as MinimapNodeInternal;
      const target = link.target as MinimapNodeInternal;

      if (
        source.x === undefined ||
        source.y === undefined ||
        target.x === undefined ||
        target.y === undefined
      ) {
        return;
      }

      const color = getEdgeColor(link.type);

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    },
    []
  );

  // Draw viewport indicator overlay
  const drawViewportIndicator = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!viewportBounds || !graphRef.current) return;

      const { x, y, width: vWidth, height: vHeight } = viewportBounds;

      // Draw viewport rectangle
      ctx.strokeStyle = VIEWPORT_STROKE_COLOR;
      ctx.fillStyle = VIEWPORT_FILL_COLOR;
      ctx.lineWidth = VIEWPORT_STROKE_WIDTH;

      ctx.beginPath();
      ctx.rect(x, y, vWidth, vHeight);
      ctx.fill();
      ctx.stroke();
    },
    [viewportBounds]
  );

  // Post-render callback to draw viewport indicator
  const onRenderFramePost = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (isStabilized) {
        drawViewportIndicator(ctx);
      }
    },
    [isStabilized, drawViewportIndicator]
  );

  // Determine background color
  const bgColor = lightMode ? "rgba(248, 250, 252, 0.9)" : "rgba(10, 10, 15, 0.9)";
  const borderColor = lightMode ? "rgba(0, 0, 0, 0.1)" : "var(--theme-primary-glow)";

  return (
    <div
      ref={containerRef}
      className={`relative rounded-lg overflow-hidden ${className}`}
      style={{
        width,
        height,
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        boxShadow: lightMode
          ? "0 2px 8px rgba(0, 0, 0, 0.1)"
          : "0 0 10px var(--theme-primary-glow)",
        cursor: onNavigate ? "crosshair" : "default",
      }}
      onClick={handleClick}
      role="img"
      aria-label="Memory graph minimap - click to navigate"
    >
      {/* Title label */}
      <div
        className="absolute top-1 left-2 text-xs font-medium z-10"
        style={{
          color: lightMode ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.5)",
        }}
      >
        Overview
      </div>

      {/* Force graph minimap */}
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={width}
        height={height}
        backgroundColor={bgColor}
        // Node configuration
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={() => {
          // Disable node pointer area in minimap
        }}
        // Link configuration
        linkSource="source"
        linkTarget="target"
        linkCanvasObject={linkCanvasObject}
        linkDirectionalParticles={0}
        // Force simulation (faster stabilization for minimap)
        d3AlphaDecay={0.05}
        d3VelocityDecay={0.4}
        warmupTicks={100}
        cooldownTicks={50}
        // Disable interactions (minimap is view-only except for click-to-navigate)
        enableZoomInteraction={false}
        enablePanInteraction={false}
        enableNodeDrag={false}
        // Post-render callback for viewport indicator
        onRenderFramePost={onRenderFramePost}
      />

      {/* Node count indicator */}
      <div
        className="absolute bottom-1 right-2 text-xs z-10"
        style={{
          color: lightMode ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.4)",
        }}
      >
        {nodes.length} nodes
      </div>
    </div>
  );
}

export default GraphMinimap;
