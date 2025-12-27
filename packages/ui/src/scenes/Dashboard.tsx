/**
 * Dashboard Component
 *
 * Home screen with overview of the knowledge base.
 * Displays compact stats bar at top, recent memories section
 * taking prime real estate with masonry grid layout, and New Memory FAB at bottom center.
 *
 * Requirements: 3.1, 3.4, 4.1
 */

import { useCallback, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { CompactStatsBar } from "../components/hud/CompactStatsBar";
import {
  CreateMemoryModal,
  type CreateMemorySaveResult,
} from "../components/hud/CreateMemoryModal";
import { FloatingActionButton, PlusIcon } from "../components/hud/FloatingActionButton";
import { RecentMemoriesMasonry } from "../components/hud/RecentMemoriesMasonry";
import { RecentMemoriesIcon } from "../components/icons";
import { useMemoryStore } from "../stores/memoryStore";
import { useUIStore } from "../stores/uiStore";
import type { Memory } from "../types/api";

// ============================================================================
// Types
// ============================================================================

export interface QuickStats {
  totalMemories: number;
  totalConnections: number;
  memoriesThisWeek: number;
  hubNodes: number;
}

/** @deprecated Use Memory type directly with RecentMemoriesMasonry */
export interface RecentMemoryItem {
  id: string;
  contentPreview: string;
  primarySector: string;
  lastAccessed: number;
}

export interface SuggestedAction {
  id: string;
  type: "explore" | "reason" | "analyze" | "connect";
  title: string;
  description: string;
  targetMemoryId?: string;
}

export interface CognitiveSession {
  id: string;
  type: "reasoning" | "analysis" | "decomposition" | "framework";
  title: string;
  timestamp: number;
  status: "completed" | "in-progress" | "paused";
  preview: string;
}

export interface DashboardProps {
  stats?: QuickStats;
  /** @deprecated Use availableMemories instead */
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  recentMemories?: RecentMemoryItem[];
  suggestedActions?: SuggestedAction[];
  recentSessions?: CognitiveSession[];
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

const DEFAULT_STATS: QuickStats = {
  totalMemories: 0,
  totalConnections: 0,
  memoriesThisWeek: 0,
  hubNodes: 0,
};

// ============================================================================
// Main Component
// ============================================================================

export function Dashboard({
  stats = DEFAULT_STATS,
  availableMemories = [],
  onCreateMemory,
  onMemoryClick,
  userId,
  sessionId,
  className = "",
}: DashboardProps): ReactElement {
  const navigate = useNavigate();
  const [isCreateMemoryOpen, setIsCreateMemoryOpen] = useState(false);

  // Get memory preview action from uiStore
  const openMemoryPreview = useUIStore((state) => state.openMemoryPreview);

  // Get force refresh action from memory store
  const forceRefreshMemories = useMemoryStore((state) => state.forceRefreshMemories);

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

  const handleCreateMemory = useCallback(() => {
    setIsCreateMemoryOpen(true);
    onCreateMemory?.();
  }, [onCreateMemory]);

  // Get memory store action for adding new memories
  const addMemory = useMemoryStore((state) => state.addMemory);

  const handleCreateMemorySave = useCallback(
    (result: CreateMemorySaveResult) => {
      console.log("Memory created:", result);
      setIsCreateMemoryOpen(false);

      // Add the new memory to the memory store so it appears in search/lists
      const now = new Date().toISOString();
      addMemory({
        id: result.memoryId,
        userId,
        sessionId,
        content: result.content,
        primarySector: result.primarySector,
        salience: result.salience,
        strength: result.strength,
        createdAt: now,
        lastAccessed: now,
        accessCount: 0,
        metadata: {},
      });
    },
    [addMemory, userId, sessionId]
  );

  const handleCreateMemoryClose = useCallback(() => {
    setIsCreateMemoryOpen(false);
  }, []);

  // Convert RecentMemoryItem[] to Memory[] for masonry grid
  // The masonry grid expects full Memory objects
  const memoriesForMasonry = availableMemories.length > 0 ? availableMemories : [];

  return (
    <div className={`h-full flex flex-col p-4 gap-4 ${className}`}>
      {/* Stats Section - Compact bar at top (Requirements: 5.1, 5.3) */}
      <CompactStatsBar
        totalMemories={stats.totalMemories}
        totalConnections={stats.totalConnections}
        hubNodes={stats.hubNodes}
        memoriesThisWeek={stats.memoriesThisWeek}
        className="flex-shrink-0"
      />

      {/* Recent Memories - Masonry Grid taking prime real estate (Requirements: 3.4, 4.1) */}
      {/* overflow-visible allows card glow effects to extend beyond container boundaries */}
      <section
        aria-labelledby="recent-memories-heading"
        className="flex-1 min-h-0 glass-panel-glow p-4 flex flex-col overflow-visible"
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
          <div className="flex items-center gap-3">
            <button
              onClick={(): void => {
                void forceRefreshMemories();
              }}
              className="text-xs text-ui-text-muted hover:text-ui-accent-primary transition-colors flex items-center gap-1"
              title="Force refresh memories from server"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
            <button
              onClick={(): void => {
                void navigate("/memories");
              }}
              className="text-xs text-ui-text-muted hover:text-ui-accent-primary transition-colors"
            >
              View all ({stats.totalMemories})
            </button>
          </div>
        </div>

        {/* 2-Row Grid - Adapts columns to screen width */}
        <RecentMemoriesMasonry
          memories={memoriesForMasonry}
          maxCount={12}
          onMemoryClick={handleMemoryClick}
          cardMinHeight={180}
          cardMaxHeight={280}
          showEmptyState={true}
          className="flex-1 min-h-0"
          twoRowLayout={true}
        />
      </section>

      {/* New Memory FAB - Standardized component */}
      <FloatingActionButton
        label="New Memory"
        onClick={handleCreateMemory}
        icon={<PlusIcon />}
        ariaLabel="Create new memory"
      />

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
