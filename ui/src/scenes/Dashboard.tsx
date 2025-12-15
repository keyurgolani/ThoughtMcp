/**
 * Dashboard Component
 *
 * Home screen with overview of the knowledge base.
 * Displays quick stats, recent memories, suggested actions,
 * pinned memories, recent sessions, and memory graph preview
 * in a grid layout with glassmorphism styling.
 *
 * Requirements: 23.1, 39.2, 42.3, 9.1, 44.1, 50.1-50.7
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { MiniMap, type MiniMapEdge, type MiniMapNode } from '../components/hud/MiniMap';
import {
  QuickCaptureModal,
  type QuickCaptureSaveResult,
} from '../components/hud/QuickCaptureModal';
import type { Memory, MemorySectorType } from '../types/api';

// ============================================================================
// Types
// ============================================================================

export interface QuickStats {
  /** Total number of memories */
  totalMemories: number;
  /** Total number of connections */
  totalConnections: number;
  /** Memories added this week */
  memoriesThisWeek: number;
  /** Number of hub nodes (>5 connections) */
  hubNodes: number;
}

export interface RecentMemoryItem {
  /** Memory ID */
  id: string;
  /** Memory content preview */
  contentPreview: string;
  /** Primary sector type */
  primarySector: string;
  /** Last accessed timestamp */
  lastAccessed: number;
}

export interface SuggestedAction {
  /** Action ID */
  id: string;
  /** Action type */
  type: 'explore' | 'reason' | 'analyze' | 'connect';
  /** Action title */
  title: string;
  /** Action description */
  description: string;
  /** Target memory ID (optional) */
  targetMemoryId?: string;
}

/**
 * Pinned memory item for quick access (Requirement 50.3)
 */
export interface PinnedMemoryItem {
  /** Memory ID */
  id: string;
  /** Memory title or content preview */
  title: string;
  /** Primary sector type */
  primarySector: string;
  /** When it was pinned */
  pinnedAt: number;
}

/**
 * Recent cognitive session (Requirement 50.4)
 */
export interface CognitiveSession {
  /** Session ID */
  id: string;
  /** Session type */
  type: 'reasoning' | 'analysis' | 'decomposition' | 'framework';
  /** Session title/problem */
  title: string;
  /** When the session was created */
  timestamp: number;
  /** Session status */
  status: 'completed' | 'in-progress' | 'paused';
  /** Preview of the session content */
  preview: string;
}

/**
 * Graph preview node for mini visualization (Requirement 50.5)
 */
export interface GraphPreviewNode {
  /** Node ID */
  id: string;
  /** X position (0-100) */
  x: number;
  /** Y position (0-100) */
  y: number;
  /** Primary sector */
  sector: string;
  /** Activity level (0-1) for hotspot indication */
  activity: number;
}

export interface DashboardProps {
  /** Quick stats to display */
  stats?: QuickStats;
  /** Recent memories to display */
  recentMemories?: RecentMemoryItem[];
  /** Suggested actions to display */
  suggestedActions?: SuggestedAction[];
  /** Pinned/favorite memories (Requirement 50.3) */
  pinnedMemories?: PinnedMemoryItem[];
  /** Recent cognitive sessions (Requirement 50.4) */
  recentSessions?: CognitiveSession[];
  /** Graph preview nodes (Requirement 50.5) */
  graphPreviewNodes?: GraphPreviewNode[];
  /** All available memories for wiki link autocomplete */
  availableMemories?: Memory[];
  /** Callback when quick capture is triggered */
  onQuickCapture?: () => void;
  /** Callback when a memory is clicked */
  onMemoryClick?: (memoryId: string) => void;
  /** Callback when an action is clicked */
  onActionClick?: (action: SuggestedAction) => void;
  /** Callback when a session is resumed (Requirement 50.4) */
  onSessionResume?: (sessionId: string) => void;
  /** Callback when graph preview is clicked (Requirement 50.5) */
  onGraphPreviewClick?: () => void;
  /** Callback when a pinned memory is unpinned */
  onUnpinMemory?: (memoryId: string) => void;
  /** User ID for API calls */
  userId?: string;
  /** Session ID for API calls */
  sessionId?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SECTOR_COLORS: Record<string, string> = {
  episodic: 'bg-sector-episodic/20 border-sector-episodic/40 text-sector-episodic',
  semantic: 'bg-sector-semantic/20 border-sector-semantic/40 text-sector-semantic',
  procedural: 'bg-sector-procedural/20 border-sector-procedural/40 text-sector-procedural',
  emotional: 'bg-sector-emotional/20 border-sector-emotional/40 text-sector-emotional',
  reflective: 'bg-sector-reflective/20 border-sector-reflective/40 text-sector-reflective',
};

const SECTOR_ICONS: Record<string, string> = {
  episodic: '📅',
  semantic: '📚',
  procedural: '⚙️',
  emotional: '💛',
  reflective: '🪞',
};

const DEFAULT_STATS: QuickStats = {
  totalMemories: 0,
  totalConnections: 0,
  memoriesThisWeek: 0,
  hubNodes: 0,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a timestamp as relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${String(days)}d ago`;
  if (hours > 0) return `${String(hours)}h ago`;
  if (minutes > 0) return `${String(minutes)}m ago`;
  return 'Just now';
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MemoryCardProps {
  memory: RecentMemoryItem;
  onClick: () => void;
}

/**
 * Recent memory card with sector color coding
 */
function MemoryCard({ memory, onClick }: MemoryCardProps): ReactElement {
  const sectorClass = SECTOR_COLORS[memory.primarySector] ?? 'bg-ui-border/20 border-ui-border/40';
  const sectorIcon = SECTOR_ICONS[memory.primarySector] ?? '📝';

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3 text-left rounded-lg border
        ${sectorClass}
        bg-ui-surface/50 backdrop-blur-glass
        hover:bg-ui-surface-elevated/70
        transition-all duration-normal
        group animate-fade-in
      `}
      aria-label={`Navigate to memory: ${memory.contentPreview}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5" aria-hidden="true">
          {sectorIcon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ui-text-primary truncate group-hover:text-ui-accent-primary transition-colors">
            {truncateText(memory.contentPreview, 60)}
          </p>
          <p className="text-xs text-ui-text-muted mt-1">
            {formatRelativeTime(memory.lastAccessed)}
          </p>
        </div>
        <svg
          className="w-4 h-4 text-ui-text-muted group-hover:text-ui-accent-primary transition-colors mt-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

interface PinnedMemoryCardProps {
  memory: PinnedMemoryItem;
  onClick: () => void;
  onUnpin?: (() => void) | undefined;
}

/**
 * Pinned memory card for quick access (Requirement 50.3)
 * Displays in a wide horizontal layout to show more content
 */
function PinnedMemoryCard({ memory, onClick, onUnpin }: PinnedMemoryCardProps): ReactElement {
  const sectorClass = SECTOR_COLORS[memory.primarySector] ?? 'bg-ui-border/20 border-ui-border/40';
  const sectorIcon = SECTOR_ICONS[memory.primarySector] ?? '📝';

  return (
    <div
      className={`
        relative p-3 rounded-lg border
        ${sectorClass}
        bg-ui-surface/50 backdrop-blur-glass
        hover:bg-ui-surface-elevated/70
        transition-all duration-normal
        group animate-fade-in
      `}
    >
      <button
        onClick={onClick}
        className="w-full text-left"
        aria-label={`Navigate to pinned memory: ${memory.title}`}
      >
        <div className="flex items-center gap-3 pr-8">
          <span className="text-lg flex-shrink-0" aria-hidden="true">
            {sectorIcon}
          </span>
          <span className="text-sm text-ui-text-primary group-hover:text-ui-accent-primary transition-colors flex-1 line-clamp-1">
            {memory.title}
          </span>
        </div>
      </button>
      {onUnpin !== undefined && (
        <button
          onClick={(e): void => {
            e.stopPropagation();
            onUnpin();
          }}
          className="absolute top-2 right-2 p-1 rounded hover:bg-status-error/20 transition-all"
          aria-label="Unpin memory"
          title="Unpin memory"
        >
          <span className="text-sm opacity-60 hover:opacity-100">📌</span>
        </button>
      )}
    </div>
  );
}

interface GraphPreviewProps {
  nodes: GraphPreviewNode[];
  onClick: () => void;
}

/**
 * Convert GraphPreviewNode to MiniMapNode for the interactive preview
 */
function convertToMiniMapNodes(nodes: GraphPreviewNode[]): MiniMapNode[] {
  return nodes.map((node) => ({
    id: node.id,
    label: `Memory ${node.id}`,
    primarySector: node.sector as MemorySectorType,
    salience: node.activity,
    position: [node.x, node.y] as [number, number],
  }));
}

/**
 * Generate edges from GraphPreviewNodes based on proximity
 */
function generateEdgesFromNodes(nodes: GraphPreviewNode[]): MiniMapEdge[] {
  const edges: MiniMapEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      if (nodeA && nodeB) {
        const distance = Math.sqrt(Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2));
        if (distance < 30) {
          edges.push({
            source: nodeA.id,
            target: nodeB.id,
            weight: 1 - distance / 30,
          });
        }
      }
    }
  }
  return edges;
}

/**
 * Interactive memory graph preview using MiniMap component (Requirement 50.5)
 * Shows actual interactive graph that navigates to Memory Explorer on click
 */
function GraphPreview({ nodes, onClick }: GraphPreviewProps): ReactElement {
  const miniMapNodes = useMemo(() => convertToMiniMapNodes(nodes), [nodes]);
  const miniMapEdges = useMemo(() => generateEdgesFromNodes(nodes), [nodes]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 200, height: 170 });

  // Find the most active node to highlight
  const mostActiveNodeId = useMemo(() => {
    if (nodes.length === 0) return null;
    const sorted = [...nodes].sort((a, b) => b.activity - a.activity);
    return sorted[0]?.id ?? null;
  }, [nodes]);

  // Measure container size and update MiniMap dimensions
  useEffect(() => {
    function updateDimensions(): void {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.floor(width), height: Math.floor(height) });
      }
    }

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return (): void => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label="Open Memory Explorer to view full graph"
      onKeyDown={(e): void => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      <MiniMap
        nodes={miniMapNodes}
        edges={miniMapEdges}
        currentNodeId={mostActiveNodeId}
        history={[]}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Dashboard - Home screen with knowledge base overview
 *
 * Features:
 * - Grid layout for dashboard cards (Requirement 23.1)
 * - Glassmorphism styling consistent with dark cosmic theme
 * - Quick stats display (total memories, connections, hub nodes)
 * - Recent memories list with sector color coding
 * - Suggested actions for AI-powered features
 * - Quick capture button for rapid memory creation
 *
 * Layout Structure:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                        Welcome Header                           │
 * ├──────────┬──────────┬──────────┬──────────────────────────────┤
 * │  Stats   │  Stats   │  Stats   │         Stats                 │
 * ├──────────┴──────────┴──────────┼──────────────────────────────┤
 * │                                │                               │
 * │      Recent Memories           │      Suggested Actions        │
 * │                                │                               │
 * └────────────────────────────────┴──────────────────────────────┘
 *
 * Requirements: 23.1, 39.2, 42.3, 9.1, 44.1
 */
export function Dashboard({
  stats = DEFAULT_STATS,
  recentMemories = [],
  pinnedMemories = [],
  graphPreviewNodes = [],
  availableMemories = [],
  onQuickCapture,
  onMemoryClick,
  onActionClick,
  onGraphPreviewClick,
  onUnpinMemory,
  userId = 'demo-user',
  sessionId = 'demo-session',
  className = '',
}: DashboardProps): ReactElement {
  const navigate = useNavigate();

  // QuickCaptureModal state (Requirement 44.1)
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);

  // Memoize limited lists
  const limitedMemories = useMemo(() => recentMemories.slice(0, 5), [recentMemories]);
  const limitedPinnedMemories = useMemo(() => pinnedMemories.slice(0, 6), [pinnedMemories]);

  // Handlers
  const handleMemoryClick = useCallback(
    (memoryId: string) => {
      onMemoryClick?.(memoryId);
    },
    [onMemoryClick]
  );

  const handleUnpinMemory = useCallback(
    (memoryId: string) => {
      onUnpinMemory?.(memoryId);
    },
    [onUnpinMemory]
  );

  const handleGraphPreviewClick = useCallback(() => {
    onGraphPreviewClick?.();
  }, [onGraphPreviewClick]);

  // Open QuickCaptureModal on click (Requirement 44.1)
  const handleQuickCapture = useCallback(() => {
    setIsQuickCaptureOpen(true);
    onQuickCapture?.();
  }, [onQuickCapture]);

  // Handle QuickCaptureModal save (Requirement 44.5)
  const handleQuickCaptureSave = useCallback((result: QuickCaptureSaveResult) => {
    // Memory was saved via the modal
    // Dashboard doesn't need to animate nodes since it's not the 3D view
    console.log('Quick capture saved:', result);
    setIsQuickCaptureOpen(false);
  }, []);

  // Handle QuickCaptureModal close
  const handleQuickCaptureClose = useCallback(() => {
    setIsQuickCaptureOpen(false);
  }, []);

  return (
    <div className={`h-full overflow-y-auto p-4 ${className}`}>
      <div className="space-y-6">
        {/* Primary Quick Actions Section - Prominent at top (Requirement 50.1) */}
        <section aria-labelledby="quick-actions-primary-heading" className="glass-panel-glow p-5">
          <h2
            id="quick-actions-primary-heading"
            className="text-lg font-semibold text-ui-text-primary flex items-center gap-2 mb-4"
          >
            <span aria-hidden="true">⚡</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-5 gap-3">
            <button
              onClick={handleQuickCapture}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-ui-accent-primary/30 bg-ui-accent-primary/10 hover:bg-ui-accent-primary/20 transition-all group aspect-[20/17]"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">📝</span>
              <span className="text-xs font-medium text-ui-accent-primary text-center">
                New Memory
              </span>
            </button>
            <button
              onClick={(): void => {
                onActionClick?.({
                  id: 'reason',
                  type: 'reason',
                  title: 'Start Reasoning',
                  description: 'Open Reasoning Console',
                });
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-sector-procedural/30 bg-sector-procedural/10 hover:bg-sector-procedural/20 transition-all group aspect-[20/17]"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">💭</span>
              <span className="text-xs font-medium text-sector-procedural text-center">
                Reasoning
              </span>
            </button>
            <button
              onClick={(): void => {
                onActionClick?.({
                  id: 'analyze',
                  type: 'analyze',
                  title: 'Check Biases',
                  description: 'Open Confidence & Bias Dashboard',
                });
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-sector-semantic/30 bg-sector-semantic/10 hover:bg-sector-semantic/20 transition-all group aspect-[20/17]"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">⚖️</span>
              <span className="text-xs font-medium text-sector-semantic text-center">Biases</span>
            </button>
            <button
              onClick={(): void => {
                void navigate('/memories');
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-sector-episodic/30 bg-sector-episodic/10 hover:bg-sector-episodic/20 transition-all group aspect-[20/17]"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">🔎</span>
              <span className="text-xs font-medium text-sector-episodic text-center">Search</span>
            </button>
            {/* Memory Graph Mini Preview */}
            <div
              onClick={handleGraphPreviewClick}
              className="rounded-lg border border-ui-border/30 bg-ui-background/30 hover:border-ui-accent-primary/50 transition-all cursor-pointer group aspect-[20/17] overflow-hidden"
              role="button"
              tabIndex={0}
              aria-label="Open Memory Explorer"
              onKeyDown={(e): void => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleGraphPreviewClick();
                }
              }}
            >
              {graphPreviewNodes.length > 0 ? (
                <GraphPreview nodes={graphPreviewNodes} onClick={handleGraphPreviewClick} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <span className="text-3xl group-hover:scale-110 transition-transform">🌐</span>
                  <span className="text-xs font-medium text-ui-text-secondary">Graph</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stats Section - Compact inline display with clickable links */}
        <section
          aria-labelledby="stats-heading"
          className="flex flex-wrap items-center justify-center gap-4 text-sm"
        >
          <span className="text-ui-text-muted">📊</span>
          <button
            onClick={(): void => {
              void navigate('/memories');
            }}
            className="text-ui-text-secondary hover:text-ui-accent-primary transition-colors"
          >
            <span className="font-semibold text-ui-text-primary">
              {stats.totalMemories.toLocaleString()}
            </span>{' '}
            memories
          </button>
          <span className="text-ui-border">•</span>
          <button
            onClick={(): void => {
              void navigate('/explorer');
            }}
            className="text-ui-text-secondary hover:text-ui-accent-primary transition-colors"
          >
            <span className="font-semibold text-ui-text-primary">
              {stats.totalConnections.toLocaleString()}
            </span>{' '}
            connections
          </button>
          <span className="text-ui-border">•</span>
          <button
            onClick={(): void => {
              void navigate('/explorer');
            }}
            className="text-ui-text-secondary hover:text-ui-accent-primary transition-colors"
          >
            <span className="font-semibold text-ui-text-primary">
              {stats.hubNodes.toLocaleString()}
            </span>{' '}
            hubs
          </button>
          {stats.memoriesThisWeek > 0 && (
            <>
              <span className="text-ui-border">•</span>
              <span className="text-status-success text-xs">
                +{stats.memoriesThisWeek} this week
              </span>
            </>
          )}
        </section>

        {/* Main Content Grid - 2 column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Recent Memories */}
          <section aria-labelledby="recent-memories-heading" className="glass-panel-glow p-5">
            <div className="flex items-center justify-between mb-4">
              <h2
                id="recent-memories-heading"
                className="text-lg font-semibold text-ui-text-primary flex items-center gap-2"
              >
                <span aria-hidden="true">📋</span>
                Recent Memories
              </h2>
              <span className="text-xs text-ui-text-muted">
                {String(recentMemories.length)} total
              </span>
            </div>

            {limitedMemories.length > 0 ? (
              <div className="space-y-2">
                {limitedMemories.map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    onClick={(): void => {
                      handleMemoryClick(memory.id);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl mb-3 block" aria-hidden="true">
                  🌟
                </span>
                <p className="text-ui-text-secondary text-sm">No memories yet</p>
                <p className="text-ui-text-muted text-xs mt-1">
                  Start by capturing your first thought
                </p>
              </div>
            )}
          </section>

          {/* Right Column: Pinned Memories */}
          <section aria-labelledby="pinned-memories-heading" className="glass-panel-glow p-5">
            <div className="flex items-center justify-between mb-4">
              <h2
                id="pinned-memories-heading"
                className="text-lg font-semibold text-ui-text-primary flex items-center gap-2"
              >
                <span aria-hidden="true">📌</span>
                Pinned Memories
              </h2>
              <span className="text-xs text-ui-text-muted">
                {String(pinnedMemories.length)} pinned
              </span>
            </div>

            {limitedPinnedMemories.length > 0 ? (
              <div className="space-y-2">
                {limitedPinnedMemories.map((memory) => (
                  <PinnedMemoryCard
                    key={memory.id}
                    memory={memory}
                    onClick={(): void => {
                      handleMemoryClick(memory.id);
                    }}
                    onUnpin={
                      onUnpinMemory !== undefined
                        ? (): void => {
                            handleUnpinMemory(memory.id);
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl mb-3 block" aria-hidden="true">
                  📌
                </span>
                <p className="text-ui-text-secondary text-sm">No pinned memories</p>
                <p className="text-ui-text-muted text-xs mt-1">
                  Pin important memories for quick access
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Floating Quick Capture Button - Bottom center (Requirement 44.1) */}
      <button
        onClick={handleQuickCapture}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-56 px-6 py-3 rounded-xl bg-ui-accent-primary hover:bg-ui-accent-primary/90 text-ui-background shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group hover:scale-105 active:scale-95"
        aria-label="Quick capture new memory"
        style={{
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <svg
          className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        <span className="font-medium text-sm">New Memory</span>
      </button>

      {/* QuickCaptureModal (Requirement 44.1) */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onSave={handleQuickCaptureSave}
        onClose={handleQuickCaptureClose}
        availableMemories={availableMemories}
        userId={userId}
        sessionId={sessionId}
      />
    </div>
  );
}

export default Dashboard;
