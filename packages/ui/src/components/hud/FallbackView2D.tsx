/**
 * FallbackView2D Component
 *
 * Provides a 2D fallback view as an alternative to the 3D Memory Explorer.
 * This is an accessibility feature for users who cannot use the 3D interface.
 *
 * Requirements: 13.5
 */

import { useCallback, useState } from 'react';
import type { GraphEdge, GraphNode, MemorySectorType } from '../../types/api';
import { generateAriaLabel } from '../../utils/accessibility';
import { getSectorColor } from '../../utils/visualization';

// ============================================================================
// Types
// ============================================================================

export interface FallbackView2DProps {
  /** Array of nodes to display */
  nodes: GraphNode[];
  /** Array of edges connecting nodes */
  edges: GraphEdge[];
  /** Currently selected node ID */
  currentNodeId: string | null;
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Callback when a node is hovered */
  onNodeHover?: (nodeId: string | null) => void;
  /** Whether to use high contrast colors */
  highContrast?: boolean;
  /** CSS class name */
  className?: string;
}

export interface NodeCardProps {
  node: GraphNode;
  isSelected: boolean;
  isFocused: boolean;
  connectionCount: number;
  onClick: () => void;
  onFocus: () => void;
  onBlur: () => void;
  highContrast: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SECTOR_LABELS: Record<MemorySectorType, string> = {
  episodic: 'Episodic',
  semantic: 'Semantic',
  procedural: 'Procedural',
  emotional: 'Emotional',
  reflective: 'Reflective',
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Individual node card in the 2D view
 */
function NodeCard({
  node,
  isSelected,
  isFocused,
  connectionCount,
  onClick,
  onFocus,
  onBlur,
  highContrast,
}: NodeCardProps): React.ReactElement {
  const sectorColor = getSectorColor(node.primarySector, highContrast);
  const ariaLabel = generateAriaLabel(node, connectionCount);

  // Truncate content for display
  const contentPreview =
    node.content.length > 100 ? node.content.substring(0, 100) + '...' : node.content;

  return (
    <button
      type="button"
      onClick={onClick}
      onFocus={onFocus}
      onBlur={onBlur}
      className={`
        w-full text-left p-4 rounded-lg border-2 transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-ui-accent-primary focus:ring-offset-2 focus:ring-offset-ui-background
        ${
          isSelected
            ? 'border-ui-accent-primary bg-ui-accent-primary/10'
            : isFocused
              ? 'border-ui-accent-secondary bg-ui-surface'
              : 'border-ui-border bg-ui-surface hover:border-ui-border-hover'
        }
      `}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
    >
      {/* Header with sector badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{
            backgroundColor: sectorColor + '20',
            color: sectorColor,
            border: `1px solid ${sectorColor}`,
          }}
        >
          {SECTOR_LABELS[node.primarySector]}
        </span>
        <span className="text-ui-text-muted text-xs">
          {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content preview */}
      <p className="text-ui-text-primary text-sm mb-2 line-clamp-3">{contentPreview}</p>

      {/* Metadata row */}
      <div className="flex items-center gap-4 text-xs text-ui-text-muted">
        <span>Salience: {Math.round(node.salience * 100)}%</span>
        <span>Strength: {Math.round(node.strength * 100)}%</span>
      </div>

      {/* Keywords/tags if present */}
      {node.metadata.keywords !== undefined && node.metadata.keywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.metadata.keywords.slice(0, 5).map((keyword) => (
            <span
              key={keyword}
              className="px-1.5 py-0.5 bg-ui-surface-elevated rounded text-xs text-ui-text-secondary"
            >
              {keyword}
            </span>
          ))}
          {node.metadata.keywords.length > 5 && (
            <span className="px-1.5 py-0.5 text-xs text-ui-text-muted">
              +{node.metadata.keywords.length - 5} more
            </span>
          )}
        </div>
      )}
    </button>
  );
}

/**
 * Connection list showing edges for a node
 */
interface ConnectionListProps {
  edges: GraphEdge[];
  nodes: GraphNode[];
  currentNodeId: string;
  onNodeClick: (nodeId: string) => void;
}

function ConnectionList({
  edges,
  nodes,
  currentNodeId,
  onNodeClick,
}: ConnectionListProps): React.ReactElement | null {
  // Find edges connected to current node
  const connectedEdges = edges.filter(
    (e) => e.source === currentNodeId || e.target === currentNodeId
  );

  if (connectedEdges.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-ui-surface rounded-lg border border-ui-border">
      <h3 className="text-ui-text-primary font-semibold mb-3">
        Connections ({connectedEdges.length})
      </h3>
      <ul className="space-y-2">
        {connectedEdges.map((edge) => {
          const connectedNodeId = edge.source === currentNodeId ? edge.target : edge.source;
          const connectedNode = nodes.find((n) => n.id === connectedNodeId);

          if (connectedNode === undefined) return null;

          return (
            <li key={`${edge.source}-${edge.target}`}>
              <button
                type="button"
                onClick={(): void => {
                  onNodeClick(connectedNodeId);
                }}
                className="w-full text-left p-2 rounded hover:bg-ui-surface-elevated transition-colors
                  focus:outline-none focus:ring-2 focus:ring-ui-accent-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="text-ui-text-primary text-sm truncate flex-1">
                    {connectedNode.content.substring(0, 50)}
                    {connectedNode.content.length > 50 ? '...' : ''}
                  </span>
                  <span className="text-ui-text-muted text-xs ml-2">{edge.linkType}</span>
                </div>
                <div className="text-xs text-ui-text-muted mt-1">
                  Weight: {Math.round(edge.weight * 100)}%
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FallbackView2D({
  nodes,
  edges,
  currentNodeId,
  onNodeClick,
  onNodeHover,
  highContrast = false,
  className = '',
}: FallbackView2DProps): React.ReactElement {
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Calculate connection counts for each node
  const connectionCounts = new Map<string, number>();
  for (const node of nodes) {
    const count = edges.filter((e) => e.source === node.id || e.target === node.id).length;
    connectionCounts.set(node.id, count);
  }

  // Handle node click
  const handleNodeClick = useCallback(
    (nodeId: string): void => {
      if (onNodeClick) {
        onNodeClick(nodeId);
      }
    },
    [onNodeClick]
  );

  // Handle node focus
  const handleNodeFocus = useCallback(
    (nodeId: string): void => {
      setFocusedNodeId(nodeId);
      if (onNodeHover) {
        onNodeHover(nodeId);
      }
    },
    [onNodeHover]
  );

  // Handle node blur
  const handleNodeBlur = useCallback((): void => {
    setFocusedNodeId(null);
    if (onNodeHover) {
      onNodeHover(null);
    }
  }, [onNodeHover]);

  // Get current node
  const currentNode =
    currentNodeId !== null ? nodes.find((n) => n.id === currentNodeId) : undefined;

  return (
    <div
      className={`h-full overflow-auto bg-ui-background p-4 ${className}`}
      role="region"
      aria-label="Memory graph 2D view"
    >
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-ui-text-primary text-xl font-bold mb-1">Memory Graph (2D View)</h2>
        <p className="text-ui-text-secondary text-sm">
          {nodes.length} memories • {edges.length} connections
        </p>
      </div>

      {/* Instructions for screen readers */}
      <div className="sr-only" role="status" aria-live="polite">
        Use Tab to navigate between memory nodes. Press Enter or Space to select a node.
        {currentNode && ` Currently viewing: ${currentNode.content.substring(0, 50)}`}
      </div>

      {/* Two-column layout on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Node list */}
        <div className="space-y-3">
          <h3 className="text-ui-text-primary font-semibold mb-2">Memories</h3>
          {nodes.length === 0 ? (
            <p className="text-ui-text-muted text-sm p-4 bg-ui-surface rounded-lg">
              No memories to display
            </p>
          ) : (
            <div className="space-y-2" role="list">
              {nodes.map((node) => (
                <div key={node.id} role="listitem">
                  <NodeCard
                    node={node}
                    isSelected={node.id === currentNodeId}
                    isFocused={node.id === focusedNodeId}
                    connectionCount={connectionCounts.get(node.id) ?? 0}
                    onClick={(): void => {
                      handleNodeClick(node.id);
                    }}
                    onFocus={(): void => {
                      handleNodeFocus(node.id);
                    }}
                    onBlur={handleNodeBlur}
                    highContrast={highContrast}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connection details for selected node */}
        <div>
          {currentNodeId !== null && currentNode !== undefined ? (
            <>
              <h3 className="text-ui-text-primary font-semibold mb-2">Selected Memory Details</h3>
              <div className="p-4 bg-ui-surface rounded-lg border border-ui-accent-primary">
                <p className="text-ui-text-primary mb-3">{currentNode.content}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-ui-text-muted">Sector:</span>
                    <span className="text-ui-text-primary ml-2">
                      {SECTOR_LABELS[currentNode.primarySector]}
                    </span>
                  </div>
                  <div>
                    <span className="text-ui-text-muted">Salience:</span>
                    <span className="text-ui-text-primary ml-2">
                      {Math.round(currentNode.salience * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-ui-text-muted">Strength:</span>
                    <span className="text-ui-text-primary ml-2">
                      {Math.round(currentNode.strength * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-ui-text-muted">Created:</span>
                    <span className="text-ui-text-primary ml-2">
                      {new Date(currentNode.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <ConnectionList
                edges={edges}
                nodes={nodes}
                currentNodeId={currentNodeId}
                onNodeClick={handleNodeClick}
              />
            </>
          ) : (
            <div className="p-4 bg-ui-surface rounded-lg border border-ui-border text-center">
              <p className="text-ui-text-muted">Select a memory to view details and connections</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FallbackView2D;
