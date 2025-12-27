/**
 * MemoryGraph3D Component
 *
 * A feature-rich 3D force-directed graph visualization for memory nodes using react-force-graph-3d.
 * Implements features from react-force-graph examples:
 * - Fit to canvas: Auto-fit graph to viewport on load
 * - Click to focus: Zoom/focus on clicked node with smooth animation
 * - Dynamic data changes: Handle data updates smoothly
 * - Large graph optimization: Performance tuning for 1000+ nodes
 * - Highlight node links: Show connected nodes/links on hover with link reason
 * - 3D text in nodes: Display text labels using Three.js sprites
 * - Auto-colored nodes and links: Sector-based coloring
 * - Directional links with arrows: Show link direction
 * - Curved links: Use curved bezier links for better visibility
 *
 * Requirements: 6.1, 6.2, 6.7
 * @see https://github.com/vasturiano/react-force-graph
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
  // Highlight state
  __highlighted?: boolean;
}

/**
 * Internal link type for react-force-graph-3d
 */
interface GraphLinkInternal {
  source: string | GraphNodeInternal;
  target: string | GraphNodeInternal;
  type: GraphEdgeType;
  weight: number;
  // Highlight state
  __highlighted?: boolean;
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
  /** Callback when a link is hovered - provides link reason/type */
  onLinkHover?: (
    linkType: GraphEdgeType | null,
    sourceId: string | null,
    targetId: string | null
  ) => void;
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
  /** Enable node dragging */
  enableNodeDrag?: boolean;
  /** Large graph mode - optimizes for 1000+ nodes */
  largeGraphMode?: boolean;
  /** Show navigation controls */
  showNavInfo?: boolean;
  /** Show 3D text labels on nodes (Note: dynamic updates handled by effect) */
  showNodeLabels?: boolean;
  /** Show directional arrows on links */
  showLinkArrows?: boolean;
  /** Use curved links */
  curvedLinks?: boolean;
  /** Link curvature amount (0-1) */
  linkCurvature?: number;
  /** Auto-fit graph to canvas on load */
  fitToCanvas?: boolean;
  /** Fit padding (ms to wait before fitting) */
  fitDelay?: number;
  /** Ref to expose graph methods for external control */
  graphRef?: React.MutableRefObject<{
    centerAt: (x: number, y: number, z: number) => void;
    cameraPosition: (pos: { x: number; y: number; z: number }) => void;
    fitToCanvas: () => void;
    zoomToFit: (duration?: number, padding?: number) => void;
  } | null>;
  /** Callback when the background is clicked */
  onBackgroundClick?: (event: MouseEvent) => void;
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

/** Highlighted edge colors (brighter) */
const HIGHLIGHT_EDGE_COLORS: Record<GraphEdgeType, string> = {
  tag: "#8ED4F0",
  similarity: "#B8A8E0",
  mention: "#FFD699",
};

/** Link type labels for display */
const LINK_TYPE_LABELS: Record<GraphEdgeType, string> = {
  tag: "Shared Tag",
  similarity: "Semantic Similarity",
  mention: "Direct Mention",
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

function getEdgeColor(
  type: GraphEdgeType,
  lightMode: boolean = false,
  highlighted: boolean = false
): string {
  if (highlighted) {
    return HIGHLIGHT_EDGE_COLORS[type];
  }
  return lightMode ? LIGHT_MODE_EDGE_COLORS[type] : EDGE_COLORS[type];
}

function truncateContent(content: string, maxLength: number = 20): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength - 3) + "...";
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
  onLinkHover,
  width,
  height,
  highContrast = false,
  lightMode = false,
  className = "",
  backgroundColor,
  enableNodeDrag = true,
  largeGraphMode,
  showNavInfo = true,
  showNodeLabels = true,
  showLinkArrows = true,
  curvedLinks = true,
  linkCurvature = 0.25,
  fitToCanvas = true,
  fitDelay = 500,
  graphRef: externalGraphRef,
  onBackgroundClick,
}: MemoryGraph3DProps): React.ReactElement {
  const graphRef = useRef<ForceGraphMethods<GraphNodeInternal, GraphLinkInternal> | undefined>(
    undefined
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const isGraphReady = useRef(false);

  // State
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<GraphLinkInternal>>(new Set());
  const [dimensions, setDimensions] = useState({
    width: width ?? 800,
    height: height ?? 600,
  });

  // Auto-detect large graph mode
  const isLargeGraph = largeGraphMode ?? nodes.length > LARGE_GRAPH_THRESHOLD;
  const graphConfig = isLargeGraph ? LARGE_GRAPH_CONFIG : SMALL_GRAPH_CONFIG;

  // Build node neighbors and links maps for highlight feature
  const { nodeNeighbors, nodeLinks } = useMemo(() => {
    const neighbors = new Map<string, Set<string>>();
    const links = new Map<string, Set<GraphLinkInternal>>();

    // Initialize maps for all nodes
    nodes.forEach((node) => {
      neighbors.set(node.id, new Set());
      links.set(node.id, new Set());
    });

    return { nodeNeighbors: neighbors, nodeLinks: links };
  }, [nodes]);

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

    // Build neighbor relationships
    graphLinks.forEach((link) => {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id;
      const targetId = typeof link.target === "string" ? link.target : link.target.id;

      nodeNeighbors.get(sourceId)?.add(targetId);
      nodeNeighbors.get(targetId)?.add(sourceId);
      nodeLinks.get(sourceId)?.add(link);
      nodeLinks.get(targetId)?.add(link);
    });

    return { nodes: graphNodes, links: graphLinks };
  }, [nodes, edges, nodeNeighbors, nodeLinks]);

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
        fitToCanvas: (): void => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(CAMERA_TRANSITION_DURATION, 50);
          }
        },
        zoomToFit: (duration = CAMERA_TRANSITION_DURATION, padding = 50): void => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(duration, padding);
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

  // Fit to canvas on initial load (like fit-to-canvas example)
  useEffect(() => {
    if (!fitToCanvas || !graphRef.current) return;

    const timer = setTimeout(() => {
      if (graphRef.current) {
        graphRef.current.zoomToFit(CAMERA_TRANSITION_DURATION, 50);
      }
    }, fitDelay);

    return (): void => {
      clearTimeout(timer);
    };
  }, [fitToCanvas, fitDelay, graphData.nodes.length]);

  // Center on selected node (like click-to-focus example)
  // Only navigate after the graph engine has computed positions
  useEffect(() => {
    if (selectedNodeId === null || selectedNodeId === "" || !graphRef.current) return;
    if (!isGraphReady.current) return;

    // Small delay to ensure positions are stable
    const timer = setTimeout(() => {
      if (!graphRef.current) return;

      const node = graphData.nodes.find((n) => n.id === selectedNodeId);
      if (
        node &&
        node.x !== undefined &&
        node.y !== undefined &&
        !isNaN(node.x) &&
        !isNaN(node.y)
      ) {
        const z = node.z ?? 0;
        // Calculate distance based on node connections for better framing
        const distance = 120 + (nodeNeighbors.get(node.id)?.size ?? 0) * 8;
        graphRef.current.cameraPosition(
          { x: node.x, y: node.y, z: z + distance },
          { x: node.x, y: node.y, z: z }, // Look explicitly at the node's position
          CAMERA_TRANSITION_DURATION
        );
      }
    }, 100);

    return (): void => {
      clearTimeout(timer);
    };
  }, [selectedNodeId, graphData.nodes, nodeNeighbors]);

  // Handle engine stop - mark graph as ready
  const handleEngineStop = useCallback((): void => {
    isGraphReady.current = true;
  }, []);

  // Handle node click - just trigger the callback, don't auto-zoom
  // This prevents the camera from getting locked and allows natural navigation
  const handleNodeClick = useCallback(
    (node: GraphNodeInternal): void => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  // Handle node hover with highlight (highlight example)
  const handleNodeHover = useCallback(
    (node: GraphNodeInternal | null): void => {
      const nodeId = node?.id ?? null;
      setHoveredNodeId(nodeId);

      // Update highlight sets
      if (node) {
        const neighbors = nodeNeighbors.get(node.id) ?? new Set();
        const links = nodeLinks.get(node.id) ?? new Set();

        // Highlight the hovered node and its neighbors
        const newHighlightNodes = new Set<string>([node.id, ...neighbors]);
        setHighlightNodes(newHighlightNodes);
        setHighlightLinks(links);
      } else {
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());
      }

      if (onNodeHover) {
        onNodeHover(nodeId);
      }
    },
    [onNodeHover, nodeNeighbors, nodeLinks]
  );

  // Handle link hover (highlight example with link reason)
  const handleLinkHover = useCallback(
    (link: GraphLinkInternal | null): void => {
      if (link) {
        const sourceId = typeof link.source === "string" ? link.source : link.source.id;
        const targetId = typeof link.target === "string" ? link.target : link.target.id;

        // Highlight the link and its connected nodes
        setHighlightNodes(new Set([sourceId, targetId]));
        setHighlightLinks(new Set([link]));

        if (onLinkHover) {
          onLinkHover(link.type, sourceId, targetId);
        }
      } else {
        if (hoveredNodeId === null || hoveredNodeId === "") {
          setHighlightNodes(new Set());
          setHighlightLinks(new Set());
        }
        if (onLinkHover) {
          onLinkHover(null, null, null);
        }
      }
    },
    [onLinkHover, hoveredNodeId]
  );

  // Ref for efficient lookups
  const nodesMapRef = useRef<Map<string, THREE.Group>>(new Map());

  // Update visual state of nodes without re-creating geometries
  useEffect(() => {
    if (!graphRef.current) return;

    nodesMapRef.current.forEach((group, nodeId) => {
      const node = graphData.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const isSelected = nodeId === selectedNodeId;
      const isHovered = nodeId === hoveredNodeId;
      const isHighlighted = highlightNodes.has(nodeId);
      const dimmed = highlightNodes.size > 0 && !isHighlighted;

      const color = getSectorColor(node.primarySector, highContrast, lightMode);

      // Update Main Sphere
      const mainSphere = group.getObjectByName("main-sphere");
      if (
        mainSphere instanceof THREE.Mesh &&
        mainSphere.material instanceof THREE.MeshPhongMaterial
      ) {
        mainSphere.material.color.set(color);
        mainSphere.material.emissive.set(
          isSelected || isHovered || isHighlighted ? color : "#000000"
        );
        mainSphere.material.emissiveIntensity = isSelected
          ? 0.6
          : isHovered
            ? 0.4
            : isHighlighted
              ? 0.3
              : 0;
        mainSphere.material.opacity = dimmed ? 0.3 : 0.9;
      }

      // Update Glow
      const glow = group.getObjectByName("glow-sphere");
      if (glow instanceof THREE.Mesh) {
        glow.visible = isHighlighted && !dimmed;
        if (glow.material instanceof THREE.MeshBasicMaterial) {
          glow.material.color.set(color);
        }
      }

      // Update Ring
      const ring = group.getObjectByName("selection-ring");
      if (ring) {
        ring.visible = isSelected;
      }

      // Update Label Visibility
      // Semantic Zoom: Use LOD logic or simple visibility
      const showLabelAlways = isSelected || isHovered || (isHighlighted && !isLargeGraph);
      const labelGroup = group.getObjectByName("label-group");

      if (labelGroup) {
        // Only show ambient labels if showNodeLabels is true
        // Always show if hovered/selected (optional design choice, mimicking original "creation" logic means we hide all if false)
        // Original logic: if (!showNodeLabels) nothing created, so hidden.
        if (showNodeLabels && showLabelAlways) {
          labelGroup.visible = true;
          // If we had LOD, we might want to force high detail, but simple visibility is often enough
          // For standard Sprite:
          if (labelGroup instanceof THREE.Sprite) {
            labelGroup.visible = true;
          }
        } else {
          // Hidden or LOD handled
          labelGroup.visible = false;
        }
      }
    });
  }, [
    selectedNodeId,
    hoveredNodeId,
    highlightNodes,
    highContrast,
    lightMode,
    isLargeGraph,
    graphData.nodes,
    showNodeLabels,
  ]);

  // Custom 3D node object with text labels (stable callback)
  const nodeThreeObject = useCallback(
    (node: GraphNodeInternal) => {
      // NOTE: usage of current prop values here like 'lightMode' will capture the value
      // at creation time. Since we removed deps, they might be stale.
      // However, we update visual properties in the useEffect above.
      // We only use this to create the STRUCTURE.

      const size = calculateNodeSize(node.salience);
      // Initial color (will be updated by effect immediately, but good to set correctly)
      const color = getSectorColor(node.primarySector, highContrast, lightMode);

      const group = new THREE.Group();
      group.userData = { nodeId: node.id }; // Store ID for lookup

      // 1. Invisible Hit Sphere (Larger target)
      const hitGeometry = new THREE.SphereGeometry(size * 2.5, 8, 8);
      const hitMaterial = new THREE.MeshBasicMaterial({
        visible: false,
        transparent: true,
        opacity: 0,
      });
      const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial);
      hitMesh.name = "hit-sphere";
      group.add(hitMesh);

      // 2. Main Sphere
      const geometry = new THREE.SphereGeometry(size, 16, 16);
      const material = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 80,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = "main-sphere";
      group.add(mesh);

      // 3. Glow Sphere (Initially hidden)
      const glowGeometry = new THREE.SphereGeometry(size * 1.3, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.2,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.name = "glow-sphere";
      glow.visible = false;
      group.add(glow);

      // 4. Selection Ring (Initially hidden)
      const ringGeometry = new THREE.RingGeometry(size + 2, size + 4, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: "#ffffff",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.name = "selection-ring";
      ring.visible = false;
      group.add(ring);

      // 5. Label
      // We always create structure, visibility controlled by effect
      const label = truncateContent(node.content, 25);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (context) {
        canvas.width = 256;
        canvas.height = 64;
        context.fillStyle = "rgba(0, 0, 0, 0.8)";
        context.roundRect(0, 0, canvas.width, canvas.height, 8);
        context.fill();
        context.fillStyle = color;
        context.fillRect(8, 8, 4, canvas.height - 16);
        context.font = "bold 18px Inter, system-ui, sans-serif";
        context.fillStyle = "#ffffff";
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillText(label, 20, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(40, 10, 1);
        sprite.position.set(0, size + 12, 0);
        sprite.name = "label-sprite";

        // LOD Logic wrapped in Group
        const lod = new THREE.LOD();
        lod.name = "label-group";

        const visibleGroup = new THREE.Group();
        visibleGroup.add(sprite);
        lod.addLevel(visibleGroup, 0);

        const hiddenGroup = new THREE.Group();
        lod.addLevel(hiddenGroup, 250);

        group.add(lod);
      }

      // Store in ref map
      nodesMapRef.current.set(node.id, group);

      return group;
    },
    [highContrast, lightMode] // Re-create nodes only on config/theme changes
  );

  // Link color based on type and highlight state (auto-colored + highlight examples)
  const linkColor = useCallback(
    (link: GraphLinkInternal) => {
      const isHighlighted = highlightLinks.has(link);
      const dimmed = highlightNodes.size > 0 && !isHighlighted;

      if (dimmed) {
        return "rgba(100, 100, 100, 0.2)";
      }

      return getEdgeColor(link.type, lightMode, isHighlighted);
    },
    [lightMode, highlightLinks, highlightNodes]
  );

  // Link width based on weight and highlight state
  const linkWidth = useCallback(
    (link: GraphLinkInternal) => {
      const isHighlighted = highlightLinks.has(link);
      const baseWidth = Math.max(0.5, link.weight * 2);
      return isHighlighted ? baseWidth * 2 : baseWidth;
    },
    [highlightLinks]
  );

  // Link curvature for curved links (curved-links example)
  const getLinkCurvature = useCallback(
    (link: GraphLinkInternal) => {
      if (!curvedLinks) return 0;

      // Vary curvature slightly based on link type for visual distinction
      const baseCurvature = linkCurvature;
      switch (link.type) {
        case "tag":
          return baseCurvature;
        case "similarity":
          return baseCurvature * 0.8;
        case "mention":
          return baseCurvature * 1.2;
        default:
          return baseCurvature;
      }
    },
    [curvedLinks, linkCurvature]
  );

  // Link directional arrow length (directional-links-arrows example)
  const linkDirectionalArrowLength = useCallback(
    (link: GraphLinkInternal) => {
      if (!showLinkArrows) return 0;
      const isHighlighted = highlightLinks.has(link);
      return isHighlighted ? 6 : 4;
    },
    [showLinkArrows, highlightLinks]
  );

  // Link directional arrow position
  const linkDirectionalArrowRelPos = useCallback(() => {
    return 0.5; // Arrow at middle of link
  }, []);

  // Node label with sector and content - shows first line rendered
  const nodeLabel = useCallback(
    (node: GraphNodeInternal) => {
      // Get first line of content for tooltip
      const firstLine = node.content.split("\n")[0]?.trim() ?? node.content.substring(0, 100);
      // Clean up markdown headers for display
      const cleanFirstLine = firstLine.replace(/^#+\s*/, "").trim();
      const displayContent =
        cleanFirstLine.length > 100 ? cleanFirstLine.substring(0, 100) + "..." : cleanFirstLine;

      const neighbors = nodeNeighbors.get(node.id)?.size ?? 0;
      const links = nodeLinks.get(node.id);

      // Count link types
      const linkTypeCounts: Record<GraphEdgeType, number> = { tag: 0, similarity: 0, mention: 0 };
      links?.forEach((link) => {
        linkTypeCounts[link.type]++;
      });

      const linkInfo = Object.entries(linkTypeCounts)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => `${LINK_TYPE_LABELS[type as GraphEdgeType]}: ${String(count)}`)
        .join("<br/>");

      return `<div style="background: rgba(0,0,0,0.9); padding: 12px 16px; border-radius: 8px; color: white; font-size: 12px; max-width: 350px; border-left: 4px solid ${getSectorColor(node.primarySector, highContrast, lightMode)};">
      <div style="font-weight: 700; margin-bottom: 6px; color: ${getSectorColor(node.primarySector, highContrast, lightMode)}; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">${node.primarySector}</div>
      <div style="margin-bottom: 8px; line-height: 1.4; font-weight: 500;">${displayContent}</div>
      <div style="font-size: 10px; color: #888; border-top: 1px solid #333; padding-top: 8px;">
        <div style="margin-bottom: 4px;">Connections: ${String(neighbors)}</div>
        ${linkInfo.length > 0 ? `<div style="color: #aaa;">${linkInfo}</div>` : ""}
      </div>
    </div>`;
    },
    [highContrast, lightMode, nodeNeighbors, nodeLinks]
  );

  // Link label showing connection reason (highlight example)
  const linkLabel = useCallback(
    (link: GraphLinkInternal) => {
      const sourceNode =
        typeof link.source === "string"
          ? graphData.nodes.find((n) => n.id === link.source)
          : link.source;
      const targetNode =
        typeof link.target === "string"
          ? graphData.nodes.find((n) => n.id === link.target)
          : link.target;

      const sourceLabel = sourceNode ? truncateContent(sourceNode.content, 15) : "Unknown";
      const targetLabel = targetNode ? truncateContent(targetNode.content, 15) : "Unknown";

      return `<div style="background: rgba(0,0,0,0.9); padding: 8px 12px; border-radius: 6px; color: white; font-size: 11px; border-left: 3px solid ${getEdgeColor(link.type, lightMode)};">
      <div style="font-weight: 600; color: ${getEdgeColor(link.type, lightMode)}; margin-bottom: 4px;">${LINK_TYPE_LABELS[link.type]}</div>
      <div style="color: #ccc;">${sourceLabel} → ${targetLabel}</div>
      <div style="font-size: 10px; color: #888; margin-top: 4px;">Weight: ${(link.weight * 100).toFixed(0)}%</div>
    </div>`;
    },
    [graphData.nodes, lightMode]
  );

  // Background color
  const bgColor = backgroundColor ?? (lightMode ? "#f8fafc" : "#0a0a0f");

  // Particle settings for directional flow (subtle effect)
  const linkDirectionalParticles = useCallback(
    (link: GraphLinkInternal) => {
      const isHighlighted = highlightLinks.has(link);
      return isHighlighted ? 2 : 1;
    },
    [highlightLinks]
  );

  const linkDirectionalParticleWidth = useCallback(
    (link: GraphLinkInternal) => {
      const isHighlighted = highlightLinks.has(link);
      return isHighlighted ? 1.5 : 0.8;
    },
    [highlightLinks]
  );

  const linkDirectionalParticleSpeed = useCallback(
    (link: GraphLinkInternal) => {
      const isHighlighted = highlightLinks.has(link);
      return isHighlighted ? 0.004 : 0.002;
    },
    [highlightLinks]
  );

  const linkDirectionalParticleColor = useCallback(
    (link: GraphLinkInternal) => {
      return getEdgeColor(link.type, lightMode, true);
    },
    [lightMode]
  );

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
        linkLabel={linkLabel}
        onLinkHover={handleLinkHover}
        // Curved links (curved-links example)
        linkCurvature={getLinkCurvature}
        linkCurveRotation={0.5}
        // Directional arrows (directional-links-arrows example)
        linkDirectionalArrowLength={linkDirectionalArrowLength}
        linkDirectionalArrowRelPos={linkDirectionalArrowRelPos}
        linkDirectionalArrowColor={linkColor}
        // Directional particles for flow visualization
        linkDirectionalParticles={linkDirectionalParticles}
        linkDirectionalParticleWidth={linkDirectionalParticleWidth}
        linkDirectionalParticleSpeed={linkDirectionalParticleSpeed}
        linkDirectionalParticleColor={linkDirectionalParticleColor}
        // Force simulation
        d3AlphaDecay={graphConfig.d3AlphaDecay}
        d3VelocityDecay={graphConfig.d3VelocityDecay}
        // Controls - use orbit controls for reliable navigation
        controlType="orbit"
        enableNodeDrag={enableNodeDrag}
        showNavInfo={showNavInfo}
        // Engine callbacks
        onEngineStop={handleEngineStop}
        // Background interaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        onBackgroundClick={onBackgroundClick as any}
        // Performance
        warmupTicks={graphConfig.warmupTicks}
        cooldownTicks={graphConfig.cooldownTicks}
      />

      {/* Highlight info when hovering */}
      {highlightNodes.size > 0 && (
        <div className="absolute top-4 left-4 glass-panel-glow rounded-lg px-3 py-2 text-xs">
          <span className="text-ui-accent-primary font-medium">
            {highlightNodes.size} node{highlightNodes.size > 1 ? "s" : ""} connected
          </span>
          {highlightLinks.size > 0 && (
            <span className="text-ui-text-secondary ml-2">
              ({highlightLinks.size} link{highlightLinks.size > 1 ? "s" : ""})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default MemoryGraph3D;
