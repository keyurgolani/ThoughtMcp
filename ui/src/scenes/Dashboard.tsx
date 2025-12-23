/**
 * Dashboard Component
 *
 * Home screen with overview of the knowledge base.
 * Displays quick stats, recent memories, suggested actions,
 * recent sessions, and memory graph preview
 * in a grid layout with glassmorphism styling.
 *
 * Requirements: 23.1, 39.2, 42.3, 9.1, 44.1, 50.1-50.7
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreateMemoryModal,
  type CreateMemorySaveResult,
} from '../components/hud/CreateMemoryModal';
import { MarkdownPreview } from '../components/hud/MarkdownPreview';
import { MiniMap, type MiniMapEdge, type MiniMapNode } from '../components/hud/MiniMap';
import {
  BarChart3,
  BiasIcon,
  EmptyMemoriesIcon,
  getSectorIcon,
  GraphIcon,
  QuickActionsIcon,
  ReasoningIcon,
  RecentMemoriesIcon,
  SearchIcon,
} from '../components/icons';
import { useUIStore } from '../stores/uiStore';
import type { Memory, MemorySectorType } from '../types/api';

// ============================================================================
// Types
// ============================================================================

export interface QuickStats {
  totalMemories: number;
  totalConnections: number;
  memoriesThisWeek: number;
  hubNodes: number;
}

export interface RecentMemoryItem {
  id: string;
  contentPreview: string;
  primarySector: string;
  lastAccessed: number;
}

export interface SuggestedAction {
  id: string;
  type: 'explore' | 'reason' | 'analyze' | 'connect';
  title: string;
  description: string;
  targetMemoryId?: string;
}

export interface CognitiveSession {
  id: string;
  type: 'reasoning' | 'analysis' | 'decomposition' | 'framework';
  title: string;
  timestamp: number;
  status: 'completed' | 'in-progress' | 'paused';
  preview: string;
}

export interface GraphPreviewNode {
  id: string;
  x: number;
  y: number;
  sector: string;
  activity: number;
}

export interface DashboardProps {
  stats?: QuickStats;
  recentMemories?: RecentMemoryItem[];
  suggestedActions?: SuggestedAction[];
  recentSessions?: CognitiveSession[];
  graphPreviewNodes?: GraphPreviewNode[];
  availableMemories?: Memory[];
  onCreateMemory?: () => void;
  onMemoryClick?: (memoryId: string) => void;
  onActionClick?: (action: SuggestedAction) => void;
  onSessionResume?: (sessionId: string) => void;
  onGraphPreviewClick?: () => void;
  /** User ID for API calls - required for memory operations */
  userId: string;
  /** Session ID for API calls - required for memory operations */
  sessionId: string;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SECTOR_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  episodic: {
    bg: 'bg-sector-episodic/10',
    border: 'border-sector-episodic/30',
    text: 'text-sector-episodic',
  },
  semantic: {
    bg: 'bg-sector-semantic/10',
    border: 'border-sector-semantic/30',
    text: 'text-sector-semantic',
  },
  procedural: {
    bg: 'bg-sector-procedural/10',
    border: 'border-sector-procedural/30',
    text: 'text-sector-procedural',
  },
  emotional: {
    bg: 'bg-sector-emotional/10',
    border: 'border-sector-emotional/30',
    text: 'text-sector-emotional',
  },
  reflective: {
    bg: 'bg-sector-reflective/10',
    border: 'border-sector-reflective/30',
    text: 'text-sector-reflective',
  },
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

// ============================================================================
// Sub-Components
// ============================================================================

interface MemoryRowProps {
  memory: RecentMemoryItem;
  onClick: () => void;
}

/**
 * Single row memory item - matches MemoryExplorer row card styling
 * with theme glow and hover effects (no scale to prevent cutoff)
 */
function MemoryRow({ memory, onClick }: MemoryRowProps): ReactElement {
  const colors = SECTOR_COLORS[memory.primarySector] ?? {
    bg: 'bg-ui-border/10',
    border: 'border-ui-border/30',
    text: 'text-ui-text-secondary',
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 py-3 text-left rounded-lg border transition-all duration-200
        bg-ui-surface/80 border-ui-border/50
        hover:bg-ui-surface-elevated/50 hover:border-ui-accent-primary/50
        group animate-fade-in memory-row-card
      `}
      aria-label={`View memory: ${memory.contentPreview}`}
    >
      {/* Header row: sector icon, sector name, timestamp, arrow */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={colors.text} aria-hidden="true">
          {getSectorIcon(memory.primarySector, 'sm')}
        </span>
        <span className={`text-xs ${colors.text} capitalize`}>{memory.primarySector}</span>
        <span className="text-xs text-ui-text-muted">•</span>
        <span className="text-xs text-ui-text-muted">
          {formatRelativeTime(memory.lastAccessed)}
        </span>
        <svg
          className="w-3 h-3 text-ui-text-muted group-hover:text-ui-accent-primary transition-colors ml-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Content - 2 lines spanning full width */}
      <div className="text-sm text-ui-text-primary leading-relaxed group-hover:text-ui-accent-primary transition-colors">
        <MarkdownPreview content={memory.contentPreview} maxLines={2} />
      </div>
    </button>
  );
}

interface GraphPreviewProps {
  nodes: GraphPreviewNode[];
  onClick: () => void;
}

function convertToMiniMapNodes(nodes: GraphPreviewNode[]): MiniMapNode[] {
  return nodes.map((node) => ({
    id: node.id,
    label: `Memory ${node.id}`,
    primarySector: node.sector as MemorySectorType,
    salience: node.activity,
    position: [node.x, node.y] as [number, number],
  }));
}

function generateEdgesFromNodes(nodes: GraphPreviewNode[]): MiniMapEdge[] {
  const edges: MiniMapEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      if (nodeA && nodeB) {
        const distance = Math.sqrt(Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2));
        if (distance < 30) {
          edges.push({ source: nodeA.id, target: nodeB.id, weight: 1 - distance / 30 });
        }
      }
    }
  }
  return edges;
}

function GraphPreview({ nodes, onClick }: GraphPreviewProps): ReactElement {
  const miniMapNodes = useMemo(() => convertToMiniMapNodes(nodes), [nodes]);
  const miniMapEdges = useMemo(() => generateEdgesFromNodes(nodes), [nodes]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 200, height: 170 });

  const mostActiveNodeId = useMemo(() => {
    if (nodes.length === 0) return null;
    const sorted = [...nodes].sort((a, b) => b.activity - a.activity);
    return sorted[0]?.id ?? null;
  }, [nodes]);

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
      aria-label="Open Memory Graph to view full graph"
      onKeyDown={(e): void => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
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

export function Dashboard({
  stats = DEFAULT_STATS,
  recentMemories = [],
  graphPreviewNodes = [],
  availableMemories = [],
  onCreateMemory,
  onMemoryClick,
  onActionClick,
  onGraphPreviewClick,
  userId,
  sessionId,
  className = '',
}: DashboardProps): ReactElement {
  const navigate = useNavigate();
  const [isCreateMemoryOpen, setIsCreateMemoryOpen] = useState(false);
  const recentMemoriesContainerRef = useRef<HTMLDivElement>(null);
  const [visibleMemoryCount, setVisibleMemoryCount] = useState(10);

  // Calculate how many memories fit in the available space
  useEffect(() => {
    function calculateVisibleCount(): void {
      if (recentMemoriesContainerRef.current) {
        const containerRect = recentMemoriesContainerRef.current.getBoundingClientRect();
        // Each memory row is approximately 80px average (variable based on content length)
        const rowHeight = 80;
        const headerHeight = 48; // Header section height
        // Floating button is at bottom-[5vh] with ~56px height, calculate where it starts
        const buttonTop = window.innerHeight - window.innerHeight * 0.05 - 56;
        // Available height is from container top (plus header) to where button starts
        const containerContentTop = containerRect.top + headerHeight;
        const availableHeight = Math.max(0, buttonTop - containerContentTop - 16); // 16px safety margin
        const count = Math.max(1, Math.floor(availableHeight / rowHeight));
        setVisibleMemoryCount(count);
      }
    }
    calculateVisibleCount();
    window.addEventListener('resize', calculateVisibleCount);
    return (): void => {
      window.removeEventListener('resize', calculateVisibleCount);
    };
  }, []);

  const limitedMemories = useMemo(
    () => recentMemories.slice(0, visibleMemoryCount),
    [recentMemories, visibleMemoryCount]
  );

  // Get memory preview action from uiStore
  const openMemoryPreview = useUIStore((state) => state.openMemoryPreview);

  const handleMemoryClick = useCallback(
    (memoryId: string) => {
      // Find the memory from availableMemories and open preview modal
      const memory = availableMemories.find((m) => m.id === memoryId);
      if (memory) {
        openMemoryPreview(memory);
      }
      onMemoryClick?.(memoryId);
    },
    [availableMemories, openMemoryPreview, onMemoryClick]
  );

  const handleGraphPreviewClick = useCallback(() => {
    onGraphPreviewClick?.();
  }, [onGraphPreviewClick]);

  const handleCreateMemory = useCallback(() => {
    setIsCreateMemoryOpen(true);
    onCreateMemory?.();
  }, [onCreateMemory]);

  const handleCreateMemorySave = useCallback((result: CreateMemorySaveResult) => {
    console.log('Memory created:', result);
    setIsCreateMemoryOpen(false);
  }, []);

  const handleCreateMemoryClose = useCallback(() => {
    setIsCreateMemoryOpen(false);
  }, []);

  return (
    <div className={`h-full flex flex-col p-4 gap-4 ${className}`}>
      {/* Top Section: Quick Actions + Stats */}
      <div className="flex-shrink-0 space-y-4">
        {/* Quick Actions */}
        <section aria-labelledby="quick-actions-heading" className="glass-panel-glow p-4">
          <h2
            id="quick-actions-heading"
            className="text-lg font-semibold text-ui-text-primary flex items-center gap-2 mb-3"
          >
            <span className="text-ui-accent-primary" aria-hidden="true">
              <QuickActionsIcon size="lg" />
            </span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-5 gap-3">
            <button
              onClick={handleCreateMemory}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-ui-accent-primary/30 bg-ui-accent-primary/10 hover:bg-ui-accent-primary/20 transition-all group aspect-[20/17]"
            >
              <span className="text-ui-accent-primary group-hover:scale-110 transition-transform">
                {getSectorIcon('default', '2xl')}
              </span>
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
              <span className="text-sector-procedural group-hover:scale-110 transition-transform">
                <ReasoningIcon size="2xl" />
              </span>
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
              <span className="text-sector-semantic group-hover:scale-110 transition-transform">
                <BiasIcon size="2xl" />
              </span>
              <span className="text-xs font-medium text-sector-semantic text-center">Biases</span>
            </button>
            <button
              onClick={(): void => {
                void navigate('/memories');
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-sector-episodic/30 bg-sector-episodic/10 hover:bg-sector-episodic/20 transition-all group aspect-[20/17]"
            >
              <span className="text-sector-episodic group-hover:scale-110 transition-transform">
                <SearchIcon size="2xl" />
              </span>
              <span className="text-xs font-medium text-sector-episodic text-center">Search</span>
            </button>
            <div
              onClick={handleGraphPreviewClick}
              className="rounded-lg border border-ui-border/30 bg-ui-background/30 hover:border-ui-accent-primary/50 transition-all cursor-pointer group aspect-[20/17] overflow-hidden"
              role="button"
              tabIndex={0}
              aria-label="Open Memory Graph"
              onKeyDown={(e): void => {
                if (e.key === 'Enter' || e.key === ' ') handleGraphPreviewClick();
              }}
            >
              {graphPreviewNodes.length > 0 ? (
                <GraphPreview nodes={graphPreviewNodes} onClick={handleGraphPreviewClick} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <span className="text-ui-text-secondary group-hover:scale-110 transition-transform">
                    <GraphIcon size="2xl" />
                  </span>
                  <span className="text-xs font-medium text-ui-text-secondary">Graph</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section
          aria-labelledby="stats-heading"
          className="flex flex-wrap items-center justify-center gap-4 text-sm"
        >
          <span className="text-ui-text-muted">
            <BarChart3 size={16} />
          </span>
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
      </div>

      {/* Recent Memories - Expands to fill available height */}
      <section
        ref={recentMemoriesContainerRef}
        aria-labelledby="recent-memories-heading"
        className="flex-1 min-h-0 glass-panel-glow p-4 flex flex-col"
      >
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h2
            id="recent-memories-heading"
            className="text-lg font-semibold text-ui-text-primary flex items-center gap-2"
          >
            <span className="text-ui-accent-primary" aria-hidden="true">
              <RecentMemoriesIcon size="lg" />
            </span>
            Recent Memories
          </h2>
          <button
            onClick={(): void => {
              void navigate('/memories');
            }}
            className="text-xs text-ui-text-muted hover:text-ui-accent-primary transition-colors"
          >
            View all ({recentMemories.length})
          </button>
        </div>

        {limitedMemories.length > 0 ? (
          <div className="flex-1 space-y-2 overflow-y-auto">
            {limitedMemories.map((memory) => (
              <MemoryRow
                key={memory.id}
                memory={memory}
                onClick={(): void => {
                  handleMemoryClick(memory.id);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="text-ui-accent-primary mb-3 block" aria-hidden="true">
                <EmptyMemoriesIcon size="4xl" />
              </span>
              <p className="text-ui-text-secondary text-sm">No memories yet</p>
              <p className="text-ui-text-muted text-xs mt-1">
                Start by capturing your first thought
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Floating Create Memory Button */}
      <button
        onClick={handleCreateMemory}
        className="fixed bottom-[5vh] left-1/2 -translate-x-1/2 z-50 w-56 px-6 py-3 rounded-xl bg-ui-accent-primary hover:bg-ui-accent-primary/90 text-ui-background shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group hover:scale-105 active:scale-95"
        aria-label="Create new memory"
        style={{ boxShadow: '0 0 20px rgba(0, 255, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)' }}
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

      {/* CreateMemoryModal */}
      <CreateMemoryModal
        isOpen={isCreateMemoryOpen}
        onSave={handleCreateMemorySave}
        onClose={handleCreateMemoryClose}
        availableMemories={availableMemories}
        userId={userId}
        sessionId={sessionId}
      />
    </div>
  );
}

export default Dashboard;
