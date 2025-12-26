/**
 * MiniMap Component
 *
 * 2D mini-map showing local graph structure with neural network visual style.
 * Displays current node, neighbors, traversal path, and supports click-to-navigate.
 * Enhanced with subtle border glow, improved node visibility at small sizes,
 * zoom controls, and improved path trail visibility.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 28.1, 28.2, 28.3, 28.4, 28.5, 28.6, 28.7
 */

import React, { useCallback, useMemo, useState } from "react";
import type { MiniMapEdge, MiniMapNode } from "../../utils/miniMapUtils";
import { PADDING, calculateNodePositions } from "../../utils/miniMapUtils";
import { getSectorColor } from "../../utils/visualization";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 200;
const ZOOM_STEP = 0.2;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.0;
const DEFAULT_ZOOM = 1.0;

const NODE_RADIUS_MIN = 4;
const NODE_RADIUS_MAX = 8;
const CURRENT_NODE_RADIUS = 12;
const EDGE_WIDTH_MIN = 1;
const EDGE_WIDTH_MAX = 3;
const PATH_WIDTH = 2; // Width of path trail connection
const PATH_GLOW_WIDTH = 6; // Width of path glow

const PULSE_DURATION = "2s"; // CSS animation duration

const PATH_COLOR = "#00f7ff"; // Cyan color for path
const PATH_GLOW_COLOR = "#00f7ff"; // Glow color for path
const EDGE_COLOR_DARK = "#4a5568";
const EDGE_COLOR_LIGHT = "#cbd5e0";

export interface MiniMapProps {
  /** Local nodes to display */
  nodes: MiniMapNode[];
  /** Local edges to display */
  edges: MiniMapEdge[];
  /** Current active node ID */
  currentNodeId: string | null;
  /** History of visited node IDs */
  history: string[];
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Width of the component */
  width?: number;
  /** Height of the component */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate node radius based on salience - improved visibility at small sizes
 * Requirements: 28.1
 */
function calculateNodeRadius(salience: number, zoom: number): number {
  const clampedSalience = Math.max(0, Math.min(1, salience));
  const baseRadius = NODE_RADIUS_MIN + clampedSalience * (NODE_RADIUS_MAX - NODE_RADIUS_MIN);
  return baseRadius * zoom;
}

/**
 * Calculate edge width based on weight
 */
function calculateEdgeWidth(weight: number, zoom: number): number {
  const clampedWeight = Math.max(0, Math.min(1, weight));
  const baseWidth = EDGE_WIDTH_MIN + clampedWeight * (EDGE_WIDTH_MAX - EDGE_WIDTH_MIN);
  return baseWidth * zoom;
}

/**
 * Truncate label for display
 */
function truncateLabel(label: string, maxLength: number = 12): string {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength - 3) + "...";
}

/**
 * Generate a bezier curve path for neuron-like connections
 * Requirements: 28.1
 */
function generateNeuronPath(sourcePos: [number, number], targetPos: [number, number]): string {
  const [x1, y1] = sourcePos;
  const [x2, y2] = targetPos;

  // Calculate midpoint
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Calculate perpendicular offset for curve
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Add slight curve based on distance
  const curveAmount = Math.min(length * 0.15, 15);
  const perpX = (-dy / length) * curveAmount;
  const perpY = (dx / length) * curveAmount;

  // Control point with slight offset
  const ctrlX = midX + perpX;
  const ctrlY = midY + perpY;

  return `M ${String(x1)} ${String(y1)} Q ${String(ctrlX)} ${String(ctrlY)} ${String(x2)} ${String(y2)}`;
}

// ============================================================================
// Zoom Controls Component
// ============================================================================

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

/**
 * Zoom controls for the mini-map
 */
function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: ZoomControlsProps): React.ReactElement {
  const canZoomIn = zoom < ZOOM_MAX;
  const canZoomOut = zoom > ZOOM_MIN;
  const isDefault = zoom === DEFAULT_ZOOM;

  const buttonStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--theme-surface)",
    border: "1px solid var(--theme-primary-glow)",
    borderRadius: 4,
    color: "var(--theme-text-secondary)",
    cursor: "pointer",
    transition: "all 150ms ease-out",
  };

  const disabledStyle: React.CSSProperties = {
    ...buttonStyle,
    opacity: 0.4,
    cursor: "not-allowed",
  };

  return (
    <div
      className="absolute bottom-2 right-2 flex flex-col gap-1"
      style={{
        zIndex: 10,
      }}
    >
      {/* Zoom In */}
      <button
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom in"
        aria-label="Zoom in"
        style={canZoomIn ? buttonStyle : disabledStyle}
        onMouseEnter={(e) => {
          if (canZoomIn) {
            e.currentTarget.style.background = "var(--theme-primary-subtle)";
            e.currentTarget.style.borderColor = "var(--theme-primary)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--theme-surface)";
          e.currentTarget.style.borderColor = "var(--theme-primary-glow)";
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Reset Zoom */}
      <button
        onClick={onReset}
        disabled={isDefault}
        title={`Reset zoom (${String(Math.round(zoom * 100))}%)`}
        aria-label="Reset zoom"
        style={!isDefault ? buttonStyle : disabledStyle}
        onMouseEnter={(e) => {
          if (!isDefault) {
            e.currentTarget.style.background = "var(--theme-primary-subtle)";
            e.currentTarget.style.borderColor = "var(--theme-primary)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--theme-surface)";
          e.currentTarget.style.borderColor = "var(--theme-primary-glow)";
        }}
      >
        <span className="text-xs font-mono">{Math.round(zoom * 100)}%</span>
      </button>

      {/* Zoom Out */}
      <button
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom out"
        aria-label="Zoom out"
        style={canZoomOut ? buttonStyle : disabledStyle}
        onMouseEnter={(e) => {
          if (canZoomOut) {
            e.currentTarget.style.background = "var(--theme-primary-subtle)";
            e.currentTarget.style.borderColor = "var(--theme-primary)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--theme-surface)";
          e.currentTarget.style.borderColor = "var(--theme-primary-glow)";
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface NeuronEdgeProps {
  sourcePos: [number, number];
  targetPos: [number, number];
  weight: number;
  isPathEdge: boolean;
  zoom: number;
  lightMode?: boolean;
}

/**
 * Renders a neuron-like edge connection between two nodes
 * Enhanced with improved path trail visibility
 * Requirements: 28.1, 28.3
 */
function NeuronEdge({
  sourcePos,
  targetPos,
  weight,
  isPathEdge,
  zoom,
  lightMode = false,
}: NeuronEdgeProps): React.ReactElement {
  const strokeWidth = isPathEdge ? PATH_WIDTH * zoom : calculateEdgeWidth(weight, zoom);
  const edgeColor = lightMode ? EDGE_COLOR_LIGHT : EDGE_COLOR_DARK;
  const strokeColor = isPathEdge ? (lightMode ? "#0088aa" : PATH_COLOR) : edgeColor;
  const path = generateNeuronPath(sourcePos, targetPos);

  return (
    <g>
      {/* Enhanced glow effect for path edges - improved visibility */}
      {isPathEdge && (
        <>
          {/* Outer glow */}
          <path
            d={path}
            fill="none"
            stroke={PATH_GLOW_COLOR}
            strokeWidth={PATH_GLOW_WIDTH * zoom}
            strokeLinecap="round"
            opacity={0.3}
          />
          {/* Inner glow */}
          <path
            d={path}
            fill="none"
            stroke={PATH_GLOW_COLOR}
            strokeWidth={(strokeWidth + 4) * zoom}
            strokeLinecap="round"
            opacity={0.5}
          />
        </>
      )}
      {/* Main edge path */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={isPathEdge ? 1 : lightMode ? 0.8 : 0.5}
      />
    </g>
  );
}

interface NeuronNodeProps {
  node: MiniMapNode;
  position: [number, number];
  isCurrent: boolean;
  isInPath: boolean;
  zoom: number;
  onClick?: () => void;
}

/**
 * Renders a neuron-like node dot on the mini-map
 * Enhanced with improved visibility at small sizes
 * Requirements: 28.1, 28.2, 28.4
 */
function NeuronNode({
  node,
  position,
  isCurrent,
  isInPath,
  zoom,
  onClick,
}: NeuronNodeProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);
  const color = getSectorColor(node.primarySector);
  const baseRadius = isCurrent ? CURRENT_NODE_RADIUS : calculateNodeRadius(node.salience, 1);
  const radius = baseRadius * zoom;

  // Hover scale effect
  const displayRadius = isHovered && !isCurrent ? radius * 1.2 : radius;

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      style={{ cursor: onClick ? "pointer" : "default" }}
      role="button"
      tabIndex={0}
      aria-label={`Navigate to ${truncateLabel(node.label)}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.();
        }
      }}
    >
      {/* Pulsing glow effect for current node - Requirements: 28.4 */}
      {isCurrent && (
        <>
          {/* Outer pulsing glow - enhanced visibility */}
          <circle
            cx={position[0]}
            cy={position[1]}
            r={radius + 10}
            fill="none"
            stroke="#FFD700"
            strokeWidth={2.5}
            opacity={0.4}
          >
            <animate
              attributeName="r"
              values={`${String(radius + 8)};${String(radius + 14)};${String(radius + 8)}`}
              dur={PULSE_DURATION}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.4;0.15;0.4"
              dur={PULSE_DURATION}
              repeatCount="indefinite"
            />
          </circle>
          {/* Inner glow ring */}
          <circle
            cx={position[0]}
            cy={position[1]}
            r={radius + 5}
            fill="none"
            stroke="#FFD700"
            strokeWidth={2}
            opacity={0.7}
          >
            <animate
              attributeName="opacity"
              values="0.7;0.4;0.7"
              dur={PULSE_DURATION}
              repeatCount="indefinite"
            />
          </circle>
        </>
      )}

      {/* Path indicator ring for nodes in traversal path - enhanced */}
      {isInPath && !isCurrent && (
        <>
          <circle
            cx={position[0]}
            cy={position[1]}
            r={displayRadius + 4}
            fill="none"
            stroke={PATH_COLOR}
            strokeWidth={1}
            opacity={0.4}
          />
          <circle
            cx={position[0]}
            cy={position[1]}
            r={displayRadius + 2}
            fill="none"
            stroke={PATH_COLOR}
            strokeWidth={1.5}
            opacity={0.8}
          />
        </>
      )}

      {/* Hover glow effect */}
      {isHovered && !isCurrent && (
        <circle
          cx={position[0]}
          cy={position[1]}
          r={displayRadius + 3}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          opacity={0.5}
        />
      )}

      {/* Subtle glow behind node - improved visibility */}
      <circle
        cx={position[0]}
        cy={position[1]}
        r={displayRadius + 2}
        fill={color}
        opacity={0.4}
        style={{ filter: "blur(3px)" }}
      />

      {/* Main node dot - improved visibility with border */}
      <circle
        cx={position[0]}
        cy={position[1]}
        r={displayRadius}
        fill={color}
        opacity={isCurrent ? 1 : 0.9}
        stroke={isCurrent ? "#FFD700" : "rgba(255, 255, 255, 0.3)"}
        strokeWidth={isCurrent ? 2 : 0.5}
      />
    </g>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * MiniMap - 2D visualization of the local memory graph with neural network style
 *
 * Features:
 * - Displays local graph structure with neuron-like nodes and connections
 * - Uses sector colors matching main visualization (Requirements: 28.2)
 * - Only displays actual waypoint connections (Requirements: 28.3)
 * - Highlights current node with pulsing glow effect (Requirements: 28.4)
 * - Shows traversal path as highlighted trail (Requirements: 28.5)
 * - Dark background matching main viewport (Requirements: 28.6)
 * - Scales graph to fit bounds (Requirements: 28.7)
 * - Supports click-to-navigate to any visible node
 * - Enhanced with subtle border glow
 * - Improved node visibility at small sizes
 * - Zoom controls for better exploration
 * - Improved path trail visibility
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 28.1-28.7
 */
export function MiniMap({
  nodes,
  edges,
  currentNodeId,
  history,
  onNodeClick,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className = "",
}: MiniMapProps): React.ReactElement {
  // Zoom state
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Detect light mode from document attribute
  const isLightMode =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme-mode") === "light";

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom((prev: number) => Math.min(prev + ZOOM_STEP, ZOOM_MAX));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev: number) => Math.max(prev - ZOOM_STEP, ZOOM_MIN));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  // Calculate node positions - scales to fit bounds with zoom
  const nodePositions = useMemo(
    () => calculateNodePositions(nodes, edges, currentNodeId, width, height, zoom),
    [nodes, edges, currentNodeId, width, height, zoom]
  );

  // Create set of nodes in the path for quick lookup
  const pathNodeIds = useMemo(() => new Set(history), [history]);

  // Create set of path edges (consecutive pairs in history)
  const pathEdges = useMemo(() => {
    const pathEdgeSet = new Set<string>();
    for (let i = 0; i < history.length - 1; i++) {
      const source: string | undefined = history[i];
      const target: string | undefined = history[i + 1];
      // Store both directions for lookup
      if (source !== undefined && target !== undefined) {
        pathEdgeSet.add(`${source}-${target}`);
        pathEdgeSet.add(`${target}-${source}`);
      }
    }
    return pathEdgeSet;
  }, [history]);

  // Check if an edge is part of the path
  const isPathEdge = useCallback(
    (source: string, target: string): boolean => {
      return pathEdges.has(`${source}-${target}`);
    },
    [pathEdges]
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (onNodeClick && nodeId !== currentNodeId) {
        onNodeClick(nodeId);
      }
    },
    [onNodeClick, currentNodeId]
  );

  // Filter edges to only include actual waypoint connections
  // Requirements: 28.3 - Only display actual connections from waypoint graph data
  const validEdges = useMemo(() => {
    const nodeIdSet = new Set(nodes.map((n) => n.id));
    return edges.filter((edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target));
  }, [edges, nodes]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden minimap-container ${className}`}
      style={{
        width,
        height,
        // Theme-aware background - Requirements: 28.6
        background: "var(--theme-surface)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        // Enhanced border using theme colors
        border: "1px solid var(--theme-border)",
        boxShadow: `
          0 4px 20px rgba(0, 0, 0, 0.15),
          0 0 0 1px var(--theme-border)
        `,
      }}
    >
      {/* Animated border glow effect */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none animate-glow-slow"
        style={{
          border: "1px solid transparent",
          background:
            "linear-gradient(135deg, rgba(0, 255, 255, 0.1), transparent, rgba(0, 255, 255, 0.1)) border-box",
          WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        aria-label="Memory graph mini-map"
        role="img"
      >
        {/* Definitions for filters and gradients */}
        <defs>
          {/* Enhanced glow filter for nodes */}
          <filter id="minimap-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Path glow filter */}
          <filter id="minimap-path-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Radial gradient for background depth */}
          <radialGradient id="minimap-bg-gradient" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="rgba(20, 20, 40, 0.4)" />
            <stop offset="100%" stopColor="rgba(5, 5, 15, 0.6)" />
          </radialGradient>
        </defs>

        {/* Background with depth effect */}
        <rect width={width} height={height} fill="url(#minimap-bg-gradient)" />

        {/* Subtle grid pattern for depth */}
        <g opacity={0.1}>
          {Array.from({ length: 5 }).map((_, i) => (
            <circle
              key={`grid-${String(i)}`}
              cx={width / 2}
              cy={height / 2}
              r={(Math.min(width, height) / 2 - PADDING) * ((i + 1) / 5)}
              fill="none"
              stroke="rgba(0, 255, 255, 0.3)"
              strokeWidth={0.5}
              strokeDasharray="2 4"
            />
          ))}
        </g>

        {/* Render edges first (below nodes) - neuron-like connections */}
        <g className="minimap-edges">
          {validEdges.map((edge) => {
            const sourcePos = nodePositions.get(edge.source);
            const targetPos = nodePositions.get(edge.target);
            if (!sourcePos || !targetPos) return null;

            const edgeKey = `${edge.source}-${edge.target}`;
            const isPath = isPathEdge(edge.source, edge.target);

            return (
              <NeuronEdge
                key={edgeKey}
                sourcePos={sourcePos}
                targetPos={targetPos}
                weight={edge.weight}
                isPathEdge={isPath}
                zoom={zoom}
                lightMode={isLightMode}
              />
            );
          })}
        </g>

        {/* Render path trail on top of regular edges - Requirements: 28.5 */}
        <g className="minimap-path" filter="url(#minimap-path-glow)">
          {history.slice(0, -1).map((nodeId, index) => {
            const nextNodeId: string | undefined = history[index + 1];
            if (nextNodeId === undefined || nextNodeId === "") return null;
            const sourcePos = nodePositions.get(nodeId);
            const targetPos = nodePositions.get(nextNodeId);
            if (!sourcePos || !targetPos) return null;

            const path = generateNeuronPath(sourcePos, targetPos);

            return (
              <g key={`path-${nodeId}-${nextNodeId}`}>
                {/* Outer glow for path */}
                <path
                  d={path}
                  fill="none"
                  stroke={PATH_GLOW_COLOR}
                  strokeWidth={PATH_GLOW_WIDTH * zoom}
                  strokeLinecap="round"
                  opacity={0.3}
                />
                {/* Inner glow for path */}
                <path
                  d={path}
                  fill="none"
                  stroke={PATH_GLOW_COLOR}
                  strokeWidth={(PATH_WIDTH + 4) * zoom}
                  strokeLinecap="round"
                  opacity={0.5}
                />
                {/* Main path line */}
                <path
                  d={path}
                  fill="none"
                  stroke={PATH_COLOR}
                  strokeWidth={PATH_WIDTH * zoom}
                  strokeLinecap="round"
                  opacity={1}
                />
              </g>
            );
          })}
        </g>

        {/* Render nodes on top - improved visibility with sector colors */}
        <g className="minimap-nodes" filter="url(#minimap-glow)">
          {nodes.map((node) => {
            const position = nodePositions.get(node.id);
            if (!position) return null;

            const isCurrent = node.id === currentNodeId;
            const isInPath = pathNodeIds.has(node.id);

            return (
              <NeuronNode
                key={node.id}
                node={node}
                position={position}
                isCurrent={isCurrent}
                isInPath={isInPath}
                zoom={zoom}
                onClick={() => {
                  handleNodeClick(node.id);
                }}
              />
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleZoomReset}
      />

      {/* Node count indicator */}
      <div
        className="absolute top-2 left-2 text-xs text-ui-text-tertiary"
        style={{
          background: "var(--theme-surface)",
          padding: "2px 6px",
          borderRadius: 4,
          border: "1px solid var(--theme-border)",
        }}
      >
        {nodes.length} nodes
      </div>
    </div>
  );
}

// ============================================================================
// Utility Functions for External Use
// ============================================================================

export default MiniMap;
