/**
 * MemoryGraph - Memory Graph Visualization
 *
 * A complete memory graph visualization with the following features:
 * - Fit to canvas on load
 * - Click to focus on node with smooth pan/zoom
 * - Dynamic data changes support
 * - Large graph optimization (1000+ nodes)
 * - Highlight node links with link reason tooltip
 * - 3D text labels on nodes
 * - Auto-colored nodes and links by sector/type
 * - Directional arrows on links
 * - Curved links for better visibility
 * - Tooltip with first line of memory on hover
 * - Left sidebar with focused memory details and related memories tabs
 * - Top-right search and filter panel
 * - Focused mode to hide all panels
 * - Memory view/edit modals via React Portal
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MemoryGraph3DEnhanced } from "../components/graph/MemoryGraph3DEnhanced";
import { BlockNotePreview } from "../components/hud/BlockNotePreview";
import { MasonryMemoryCard } from "../components/hud/MasonryMemoryCard";
import { useMemoryStore } from "../stores/memoryStore";
import { useThemeStore } from "../stores/themeStore";
import { useUIStore } from "../stores/uiStore";
import type { GraphNode, Memory, MemorySectorType } from "../types/api";
import type { GraphEdgeType } from "../utils/graphEdges";
import { generateEdges } from "../utils/graphEdges";
import { getSectorColor } from "../utils/visualization";

// ============================================================================
// Types
// ============================================================================

interface GraphNodeInternal {
  id: string;
  content: string;
  primarySector: MemorySectorType;
  salience: number;
  strength: number;
  createdAt: string;
  metadata: GraphNode["metadata"];
}

interface GraphLinkInternal {
  source: string | GraphNodeInternal;
  target: string | GraphNodeInternal;
  type: GraphEdgeType;
  weight: number;
}

export interface MemoryGraphProps {
  userId: string;
  sessionId: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function memoryToGraphNode(memory: Memory): GraphNode {
  return {
    id: memory.id,
    content: memory.content,
    primarySector: memory.primarySector,
    salience: memory.salience,
    strength: memory.strength,
    createdAt: memory.createdAt,
    metadata: memory.metadata,
  };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MemoryDetailsSidebarProps {
  focusedMemory: Memory | null;
  relatedMemories: RelatedMemoryItem[];
  onMemoryClick: (memoryId: string) => void;
  onViewMemory: (memory: Memory) => void;
  onEditMemory: (memory: Memory) => void;
  isLoading: boolean;
}

interface RelatedMemoryItem {
  memory: Memory;
  connectionType: "direct" | "semantic";
  relevanceScore: number;
}

function MemoryDetailsSidebar({
  focusedMemory,
  relatedMemories,
  onMemoryClick,
  onViewMemory,
  onEditMemory, // Kept for prop compatibility, but we might prefer direct store usage if we refactor props down the line
  isLoading,
}: MemoryDetailsSidebarProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<"focused" | "related">("focused");

  // Get UI store actions for card clicks
  const openMemoryPreview = useUIStore((state) => state.openMemoryPreview);

  // Handler for card clicks
  const handleCardClick = useCallback(
    (memory: Memory) => {
      openMemoryPreview(memory);
    },
    [openMemoryPreview]
  );

  if (!focusedMemory) {
    return (
      <div className="w-96 h-full glass-panel-glow rounded-xl p-4 flex flex-col">
        <div className="text-center text-ui-text-secondary py-8">
          <svg
            className="w-12 h-12 mx-auto mb-3 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
          <p className="text-sm">Click a memory node to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 h-full glass-panel-glow rounded-xl flex flex-col overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-ui-border/50 flex-shrink-0">
        <button
          onClick={(): void => {
            setActiveTab("focused");
          }}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === "focused"
              ? "text-ui-accent-primary border-b-2 border-ui-accent-primary bg-ui-accent-primary/5"
              : "text-ui-text-secondary hover:text-ui-text-primary"
          }`}
        >
          Focused Memory
        </button>
        <button
          onClick={(): void => {
            setActiveTab("related");
          }}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === "related"
              ? "text-ui-accent-primary border-b-2 border-ui-accent-primary bg-ui-accent-primary/5"
              : "text-ui-text-secondary hover:text-ui-text-primary"
          }`}
        >
          Related ({relatedMemories.length})
        </button>
      </div>

      {/* Tab Content - flex-1 to fill remaining height */}
      <div className="flex-1 overflow-hidden p-4 flex flex-col min-h-0">
        {activeTab === "focused" ? (
          <div className="flex flex-col h-full min-h-0">
            {/* Memory card with scrollable content - takes remaining space minus buttons */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
              <MasonryMemoryCard
                memory={focusedMemory}
                onClick={() => {
                  handleCardClick(focusedMemory);
                }}
                minHeight={0}
                maxHeight={undefined}
                className="h-full"
              />
            </div>

            {/* Action buttons - always visible at bottom */}
            <div className="mt-4 flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  onViewMemory(focusedMemory);
                }}
                className="flex-1 py-2 px-3 text-sm bg-ui-accent-primary/10 text-ui-accent-primary hover:bg-ui-accent-primary/20 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View
              </button>
              <button
                onClick={() => {
                  onEditMemory(focusedMemory);
                }}
                className="flex-1 py-2 px-3 text-sm border border-ui-border text-ui-text-secondary hover:text-ui-accent-primary hover:border-ui-accent-primary/50 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>
            </div>
          </div>
        ) : (
          <RelatedMemoriesTab
            memories={relatedMemories}
            onMemoryClick={onMemoryClick}
            onViewMemory={onViewMemory}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}

interface RelatedMemoriesTabProps {
  memories: RelatedMemoryItem[];
  onMemoryClick: (memoryId: string) => void;
  onViewMemory: (memory: Memory) => void;
  isLoading: boolean;
}

function RelatedMemoriesTab({
  memories,
  onMemoryClick,
  onViewMemory,
  isLoading,
}: RelatedMemoriesTabProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [useCompactCards, setUseCompactCards] = useState(false);

  // Check if content overflows and switch to compact mode if needed
  useEffect(() => {
    const checkOverflow = (): void => {
      if (containerRef.current) {
        const { scrollHeight, clientHeight } = containerRef.current;
        // If content overflows, use compact cards
        setUseCompactCards(scrollHeight > clientHeight + 10); // 10px threshold
      }
    };

    // Check on mount and when memories change
    checkOverflow();

    // Also check after a short delay to allow content to render
    const timer = setTimeout(checkOverflow, 100);

    // Add resize observer to recheck on container resize
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [memories]);

  if (isLoading) {
    return (
      <div className="space-y-3 h-full">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-ui-surface-hover rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="text-center py-8 text-ui-text-secondary h-full flex flex-col justify-center">
        <p className="text-sm">No related memories found</p>
        <p className="text-xs mt-1 text-ui-text-muted">
          Add tags or create links to connect memories
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3 h-full overflow-y-auto custom-scrollbar">
      {memories.map((item) => (
        <RelatedMemoryCard
          key={item.memory.id}
          item={item}
          compact={useCompactCards}
          onNavigate={() => {
            onMemoryClick(item.memory.id);
          }}
          onView={() => {
            onViewMemory(item.memory);
          }}
        />
      ))}
    </div>
  );
}

interface RelatedMemoryCardProps {
  item: RelatedMemoryItem;
  compact?: boolean;
  onNavigate: () => void;
  onView: () => void;
}

function RelatedMemoryCard({
  item,
  compact = false,
  onNavigate,
  onView,
}: RelatedMemoryCardProps): React.ReactElement {
  const { memory, connectionType, relevanceScore } = item;
  const sectorColor = getSectorColor(memory.primarySector);

  // In compact mode, limit to 3 lines; otherwise show more content
  const maxLines = compact ? 3 : 8;
  const contentLines = memory.content.split("\n").slice(0, maxLines).join("\n").trim();
  const previewContent = contentLines || memory.content.substring(0, compact ? 200 : 500);

  return (
    <div className="p-3 rounded-lg border border-ui-border/50 bg-ui-surface/50 hover:border-ui-accent-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sectorColor }} />
          <span className="text-xs text-ui-text-muted capitalize">{memory.primarySector}</span>
        </div>
        <span
          className={`px-1.5 py-0.5 text-[10px] rounded ${
            connectionType === "direct"
              ? "bg-ui-accent-primary/20 text-ui-accent-primary"
              : "bg-purple-500/20 text-purple-400"
          }`}
        >
          {connectionType === "direct" ? "Direct" : "Semantic"}
        </span>
      </div>

      {/* Content - BlockNote rendered preview */}
      <div className={compact ? "mb-2" : "mb-3"}>
        <BlockNotePreview content={previewContent} maxLines={maxLines} />
      </div>

      {/* Relevance */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1 bg-ui-border rounded-full overflow-hidden">
          <div
            className="h-full bg-ui-accent-primary transition-all"
            style={{ width: `${String(Math.round(relevanceScore * 100))}%` }}
          />
        </div>
        <span className="text-[10px] text-ui-text-muted font-mono">
          {String(Math.round(relevanceScore * 100))}%
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onView}
          className="flex-1 px-2 py-1 text-xs bg-ui-accent-primary/10 hover:bg-ui-accent-primary/20 text-ui-accent-primary rounded transition-colors"
        >
          View
        </button>
        <button
          onClick={onNavigate}
          className="flex-1 px-2 py-1 text-xs border border-ui-border hover:border-ui-accent-primary/50 text-ui-text-secondary hover:text-ui-accent-primary rounded transition-colors"
        >
          Navigate
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Search FAB Component
// ============================================================================

interface SearchFABProps {
  nodes: GraphNode[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onResultClick: (nodeId: string) => void;
  /** Focus mode state */
  isFocusedMode: boolean;
  /** Toggle focus mode */
  onToggleFocusMode: () => void;
  /** Fit to canvas callback */
  onFitToCanvas: () => void;
}

function SearchFAB({
  nodes,
  searchQuery,
  onSearchChange,
  onResultClick,
  isFocusedMode,
  onToggleFocusMode,
  onFitToCanvas,
}: SearchFABProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search results - show all nodes when query is empty, filter when query exists
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      // Return all nodes sorted by most recent
      return [...nodes].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    const query = searchQuery.toLowerCase();
    return nodes.filter((n) => n.content.toLowerCase().includes(query));
  }, [nodes, searchQuery]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to bottom of results when opening or when results change
  useEffect(() => {
    if (isOpen && resultsRef.current) {
      resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
    }
  }, [isOpen, searchResults]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleOpen = (): void => {
    setIsOpen(true);
  };

  const handleClose = (): void => {
    setIsOpen(false);
    onSearchChange("");
  };

  const handleResultClick = (nodeId: string): void => {
    handleClose();
    onResultClick(nodeId);
  };

  // Handle Cmd+Enter keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isOpen) {
        e.preventDefault();
        handleOpen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // FAB button (collapsed state)
  if (!isOpen) {
    return (
      <div className="fixed bottom-[5vh] left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
        {/* Focus Mode Toggle */}
        <button
          onClick={onToggleFocusMode}
          className={`w-12 h-12 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95 ${
            isFocusedMode
              ? "bg-ui-accent-primary text-ui-background"
              : "bg-ui-surface/90 backdrop-blur-sm border border-ui-border/50 text-ui-text-secondary hover:text-ui-accent-primary hover:border-ui-accent-primary/50"
          }`}
          style={{
            boxShadow: isFocusedMode
              ? "0 0 20px rgba(0, 255, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)"
              : "0 0 15px rgba(0, 255, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)",
          }}
          title={isFocusedMode ? "Exit Focus Mode" : "Enter Focus Mode"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isFocusedMode ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            )}
          </svg>
        </button>

        {/* Search FAB */}
        <button
          onClick={handleOpen}
          className="w-48 h-12 rounded-xl bg-[#0a1628] hover:bg-[#0d1e38] text-[#00FFFF] border border-[#00FFFF]/40 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group hover:scale-105 active:scale-95"
          style={{ boxShadow: "0 0 20px rgba(0, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4)" }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="font-semibold text-sm">Search</span>
          <kbd className="ml-1 px-2 py-1 text-xs font-medium bg-[#00FFFF]/20 text-[#00FFFF] rounded border border-[#00FFFF]/40">
            ⌘↵
          </kbd>
        </button>

        {/* Fit to View */}
        <button
          onClick={onFitToCanvas}
          className="w-12 h-12 rounded-xl bg-ui-surface/90 backdrop-blur-sm border border-ui-border/50 shadow-lg transition-all duration-200 flex items-center justify-center text-ui-text-secondary hover:text-ui-accent-primary hover:border-ui-accent-primary/50 hover:scale-105 active:scale-95"
          style={{ boxShadow: "0 0 15px rgba(0, 255, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)" }}
          title="Fit graph to view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      </div>
    );
  }

  // Expanded search bar state
  // Use absolute positioning with top/bottom constraints to fill available space within graph container

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 top-4 bottom-4 z-50 flex flex-col items-center pointer-events-none"
    >
      {/* Search Results - fills available space above search bar */}
      {searchResults.length > 0 && (
        <div
          className="flex-1 min-h-0 w-full flex flex-col items-center pointer-events-auto"
          style={{ maxWidth: "min(600px, 90vw)", marginLeft: "auto", marginRight: "auto" }}
        >
          <div className="w-full h-full glass-panel-glow rounded-xl overflow-hidden animate-fade-in flex flex-col">
            <div
              ref={resultsRef}
              className="flex-1 p-3 overflow-y-auto custom-scrollbar flex flex-col-reverse min-h-0"
            >
              <div className="space-y-2">
                {searchResults.map((node) => (
                  <SearchResultCard
                    key={node.id}
                    node={node}
                    onClick={() => handleResultClick(node.id)}
                  />
                ))}
              </div>
            </div>
            <div className="px-3 py-2 border-t border-ui-border/30 text-xs text-ui-text-muted flex-shrink-0">
              {searchResults.length} {searchResults.length === 1 ? "memory" : "memories"}
              {searchQuery ? " found" : " available"}
              <span className="float-right text-ui-text-tertiary">Scroll up for more</span>
            </div>
          </div>
        </div>
      )}

      {/* Search Input Bar - fixed at bottom with top padding for gap */}
      <div
        className="w-full flex-shrink-0 pointer-events-auto pt-4"
        style={{ maxWidth: "min(600px, 90vw)", marginLeft: "auto", marginRight: "auto" }}
      >
        <div
          className="w-full glass-panel-glow rounded-xl overflow-hidden animate-scale-in"
          style={{ boxShadow: "0 0 25px rgba(0, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3)" }}
        >
          <div className="p-3 flex items-center gap-3">
            {/* Search Icon */}
            <svg
              className="w-5 h-5 text-ui-accent-primary flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search memories..."
              className="flex-1 bg-transparent text-ui-text-primary placeholder-ui-text-muted focus:outline-none text-sm"
            />

            {/* Clear / Close button */}
            {searchQuery ? (
              <button
                onClick={() => onSearchChange("")}
                className="p-1.5 rounded-lg text-ui-text-muted hover:text-ui-text-primary hover:bg-ui-border/30 transition-colors"
                title="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            ) : null}

            {/* Escape hint */}
            <div className="flex items-center gap-1.5 text-xs text-ui-text-muted flex-shrink-0">
              <kbd className="px-1.5 py-0.5 bg-ui-background/50 rounded text-[10px] border border-ui-border/50">
                Esc
              </kbd>
              <span>to close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SearchResultCardProps {
  node: GraphNode;
  onClick: () => void;
}

function SearchResultCard({ node, onClick }: SearchResultCardProps): React.ReactElement {
  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent blur before click
        onClick();
      }}
      className="w-full p-3 text-left text-sm bg-ui-surface/50 hover:bg-ui-accent-primary/10 border border-ui-border/30 hover:border-ui-accent-primary/30 rounded-lg transition-all cursor-pointer group flex flex-col"
    >
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: getSectorColor(node.primarySector) }}
        />
        <span className="text-xs text-ui-text-muted uppercase tracking-wider font-medium">
          {node.primarySector}
        </span>
      </div>

      {/* Content preview - no scroll, uses line clamp */}
      <div className="text-ui-text-secondary group-hover:text-ui-text-primary transition-colors">
        <BlockNotePreview content={node.content} maxLines={3} />
      </div>
    </div>
  );
}

interface FilterPanelProps {
  selectedSectors: MemorySectorType[];
  selectedTags: string[];
  connectionFilter: "all" | "direct" | "semantic";
  onSectorToggle: (sector: MemorySectorType) => void;
  onTagToggle: (tag: string) => void;
  onConnectionFilterChange: (filter: "all" | "direct" | "semantic") => void;
  allTags: string[];
  onExpandChange?: (isExpanded: boolean) => void;
}

function FilterPanel({
  selectedSectors,
  selectedTags,
  connectionFilter,
  onSectorToggle,
  onTagToggle,
  onConnectionFilterChange,
  allTags,
  onExpandChange,
}: FilterPanelProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false); // Default collapsed for bottom placement
  const [isHovered, setIsHovered] = useState(false);

  // Panel is active (not translucent) when hovered or expanded
  const isActive = isHovered || isExpanded;

  const handleToggleExpand = (): void => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandChange?.(newExpanded);
  };

  const sectors: MemorySectorType[] = [
    "episodic",
    "semantic",
    "procedural",
    "emotional",
    "reflective",
  ];

  return (
    <div
      className={`w-96 rounded-xl overflow-hidden flex flex-col-reverse shadow-lg transition-all duration-300 ${
        isActive ? "glass-panel-glow opacity-100" : "bg-ui-surface/30 backdrop-blur-sm opacity-50"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Expand/Collapse Toggle (at bottom because panel is bottom-aligned) */}
      <button
        onClick={handleToggleExpand}
        className="w-full px-3 py-2 flex items-center justify-between text-xs text-ui-text-secondary hover:text-ui-text-primary transition-colors bg-ui-surface/50 font-medium"
      >
        <span>Filters</span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "" : "rotate-180"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-3 space-y-4">
          {/* Sector Filters */}
          <div>
            <label className="text-xs text-ui-text-muted uppercase tracking-wide mb-2 block">
              Sectors
            </label>
            <div className="flex flex-wrap gap-1">
              {sectors.map((sector) => {
                const isSelected = selectedSectors.includes(sector);
                const color = getSectorColor(sector);
                return (
                  <button
                    key={sector}
                    onClick={() => {
                      onSectorToggle(sector);
                    }}
                    className={`px-2 py-1 text-xs rounded-full border transition-all ${
                      isSelected
                        ? "ring-1 ring-offset-1 ring-offset-ui-background"
                        : "opacity-50 hover:opacity-75"
                    }`}
                    style={{
                      backgroundColor: isSelected ? `${color}30` : "transparent",
                      color: color,
                      borderColor: color,
                    }}
                  >
                    {sector}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connection Type Filter */}
          <div>
            <label className="text-xs text-ui-text-muted uppercase tracking-wide mb-2 block">
              Connection Type
            </label>
            <div className="flex gap-1">
              {(["all", "direct", "semantic"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    onConnectionFilterChange(filter);
                  }}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${
                    connectionFilter === filter
                      ? "bg-ui-accent-primary/20 text-ui-accent-primary"
                      : "bg-ui-surface/50 text-ui-text-secondary hover:text-ui-text-primary"
                  }`}
                >
                  {filter === "all" ? "All" : filter === "direct" ? "Direct" : "Semantic"}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div>
              <label className="text-xs text-ui-text-muted uppercase tracking-wide mb-2 block">
                Tags
              </label>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {allTags.slice(0, 15).map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        onTagToggle(tag);
                      }}
                      className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                        isSelected
                          ? "bg-ui-accent-primary/20 text-ui-accent-primary"
                          : "bg-ui-surface-hover text-ui-text-secondary hover:text-ui-text-primary"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
interface GraphRef {
  fitToCanvas: () => void;
  cameraPosition: (pos: { x: number; y: number; z: number }) => void;
  centerAt: (x: number, y: number, z: number) => void;
  zoomToFit: (duration?: number, padding?: number) => void;
}

export function MemoryGraph({
  userId,
  sessionId: _sessionId,
}: MemoryGraphProps): React.ReactElement {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<GraphRef | null>(null);

  // State
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [focusedMemory, setFocusedMemory] = useState<Memory | null>(null);
  const [isFocusedMode, setIsFocusedMode] = useState(false);

  // UI Store actions
  const openMemoryPreview = useUIStore((state) => state.openMemoryPreview);
  const openMemoryEdit = useUIStore((state) => state.openMemoryEdit);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSectors, setSelectedSectors] = useState<MemorySectorType[]>([
    "episodic",
    "semantic",
    "procedural",
    "emotional",
    "reflective",
  ]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [connectionFilter, setConnectionFilter] = useState<"all" | "direct" | "semantic">("all");
  const [_isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Theme
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const isLightMode = currentTheme === "light";

  // Store
  const memories = useMemoryStore((state) => state.memories);
  const fetchMemories = useMemoryStore((state) => state.fetchMemories);
  const isLoading = useMemoryStore((state) => state.isLoading);

  // Fetch memories on mount
  useEffect(() => {
    if (userId) {
      void fetchMemories(userId);
    }
  }, [fetchMemories, userId]);

  // Handle escape key to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && isFocusedMode) {
        e.preventDefault();
        setIsFocusedMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return (): void => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFocusedMode]);

  // Handle container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: width || 800, height: height || 600 });
      }
    });

    resizeObserver.observe(container);
    return (): void => {
      resizeObserver.disconnect();
    };
  }, []);

  // Generate all edges
  const allEdges = useMemo(() => generateEdges(memories), [memories]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    memories.forEach((m) => {
      m.metadata.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [memories]);

  // Filter nodes
  const filteredNodes = useMemo(() => {
    let nodes = memories.map(memoryToGraphNode);

    // Filter by sectors
    nodes = nodes.filter((n) => selectedSectors.includes(n.primarySector));

    // Filter by tags
    if (selectedTags.length > 0) {
      nodes = nodes.filter((n) =>
        selectedTags.some((tag) => n.metadata.tags?.includes(tag) === true)
      );
    }

    return nodes;
  }, [memories, selectedSectors, selectedTags]);

  // Filter edges
  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    let edges = allEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

    // Filter by connection type
    if (connectionFilter === "direct") {
      edges = edges.filter((e) => e.type === "tag" || e.type === "mention");
    } else if (connectionFilter === "semantic") {
      edges = edges.filter((e) => e.type === "similarity");
    }

    return edges;
  }, [allEdges, filteredNodes, connectionFilter]);

  // Build neighbor maps for highlighting
  const { nodeNeighbors, nodeLinks } = useMemo(() => {
    const neighbors = new Map<string, Set<string>>();
    const links = new Map<string, Set<GraphLinkInternal>>();

    filteredNodes.forEach((node) => {
      neighbors.set(node.id, new Set());
      links.set(node.id, new Set());
    });

    filteredEdges.forEach((link) => {
      const sourceId =
        typeof link.source === "string" ? link.source : (link.source as GraphNodeInternal).id;
      const targetId =
        typeof link.target === "string" ? link.target : (link.target as GraphNodeInternal).id;

      if (neighbors.has(sourceId) && neighbors.has(targetId)) {
        neighbors.get(sourceId)?.add(targetId);
        neighbors.get(targetId)?.add(sourceId);
        links.get(sourceId)?.add(link);
        links.get(targetId)?.add(link);
      }
    });

    return { nodeNeighbors: neighbors, nodeLinks: links };
  }, [filteredNodes, filteredEdges]);

  // Compute related memories for focused memory
  const relatedMemories = useMemo((): RelatedMemoryItem[] => {
    if (!focusedMemory) return [];

    const related: RelatedMemoryItem[] = [];
    const focusedId = focusedMemory.id;

    // Find directly connected memories
    const directNeighbors = nodeNeighbors.get(focusedId) ?? new Set();
    const directLinks = nodeLinks.get(focusedId) ?? new Set();

    directNeighbors.forEach((neighborId) => {
      const memory = memories.find((m) => m.id === neighborId);
      if (!memory) return;

      // Find the link to determine connection type
      let connectionType: "direct" | "semantic" = "direct";
      let maxWeight = 0;

      directLinks.forEach((link) => {
        const sourceId = typeof link.source === "string" ? link.source : link.source.id;
        const targetId = typeof link.target === "string" ? link.target : link.target.id;

        if (sourceId === neighborId || targetId === neighborId) {
          if (link.type === "similarity") {
            connectionType = "semantic";
          }
          maxWeight = Math.max(maxWeight, link.weight);
        }
      });

      related.push({
        memory,
        connectionType,
        relevanceScore: maxWeight || 0.5,
      });
    });

    // Sort by relevance
    return related.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [focusedMemory, memories, nodeNeighbors, nodeLinks]);

  // Sector toggle handler
  const handleSectorToggle = useCallback((sector: MemorySectorType) => {
    setSelectedSectors((prev) => {
      if (prev.includes(sector)) {
        if (prev.length === 1) return prev; // Don't allow empty
        return prev.filter((s) => s !== sector);
      }
      return [...prev, sector];
    });
  }, []);

  // Tag toggle handler
  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      return [...prev, tag];
    });
  }, []);

  // Navigate to memory from sidebar
  const handleMemoryNavigate = useCallback(
    (memoryId: string) => {
      const memory = memories.find((m) => m.id === memoryId);
      if (memory) {
        setFocusedMemory(memory);
      }
    },
    [memories]
  );

  // View memory modal
  const handleViewMemory = useCallback(
    (memory: Memory) => {
      openMemoryPreview(memory);
    },
    [openMemoryPreview]
  );

  // Edit memory modal
  const handleEditMemory = useCallback(
    (memory: Memory) => {
      openMemoryEdit(memory);
    },
    [openMemoryEdit]
  );

  return (
    <div className="h-full relative" ref={containerRef}>
      <MemoryGraph3DEnhanced
        nodes={filteredNodes}
        edges={filteredEdges}
        selectedNodeId={focusedMemory?.id ?? null}
        onNodeClick={(nodeId) => {
          const memory = memories.find((m) => m.id === nodeId);
          if (memory) setFocusedMemory(memory);
        }}
        onNodeHover={() => {
          // Hover highlighting is handled internally by MemoryGraph3DEnhanced
        }}
        onLinkHover={() => {
          // Optional: Handle link hover if needed specifically
        }}
        width={dimensions.width}
        height={dimensions.height}
        lightMode={isLightMode}
        showNavInfo={false} // We have our own controls
        fitToCanvas={true}
        graphRef={graphRef}
        onBackgroundClick={() => {
          setFocusedMemory(null);
        }}
      />

      {/* Left Sidebar - Memory Details */}
      {!isFocusedMode && focusedMemory && (
        <div className="absolute top-4 left-4 bottom-4 z-40">
          <MemoryDetailsSidebar
            focusedMemory={focusedMemory}
            relatedMemories={relatedMemories}
            onMemoryClick={handleMemoryNavigate}
            onViewMemory={handleViewMemory}
            onEditMemory={handleEditMemory}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Bottom Center - Search FAB */}
      {!isFocusedMode && (
        <SearchFAB
          nodes={filteredNodes}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onResultClick={handleMemoryNavigate}
          isFocusedMode={isFocusedMode}
          onToggleFocusMode={() => setIsFocusedMode(!isFocusedMode)}
          onFitToCanvas={() => {
            if (graphRef.current) {
              graphRef.current.fitToCanvas();
            }
          }}
        />
      )}

      {/* Focus Mode Exit Indicator */}
      {isFocusedMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setIsFocusedMode(false)}
            className="glass-panel-glow rounded-xl px-4 py-2.5 flex items-center gap-3 text-ui-text-secondary hover:text-ui-accent-primary transition-colors group"
          >
            <span className="text-sm">Focus Mode</span>
            <span className="flex items-center gap-1.5 text-xs text-ui-text-muted group-hover:text-ui-accent-primary">
              <kbd className="px-1.5 py-0.5 bg-ui-background/50 rounded text-[10px] border border-ui-border/50">
                Esc
              </kbd>
              <span>to exit</span>
            </span>
          </button>
        </div>
      )}

      {/* Bottom Right - Filter Panel (separate control) */}
      {!isFocusedMode && (
        <div className="absolute bottom-4 right-4 z-40">
          <FilterPanel
            selectedSectors={selectedSectors}
            selectedTags={selectedTags}
            connectionFilter={connectionFilter}
            onSectorToggle={handleSectorToggle}
            onTagToggle={handleTagToggle}
            onConnectionFilterChange={setConnectionFilter}
            allTags={allTags}
            onExpandChange={setIsFilterExpanded}
          />
        </div>
      )}
    </div>
  );
}

export default MemoryGraph;
