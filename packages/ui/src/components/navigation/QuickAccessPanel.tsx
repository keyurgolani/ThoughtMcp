/**
 * QuickAccessPanel Component
 *
 * Displays recent memories and saved sessions for quick access.
 * Uses glassmorphism styling consistent with the dark theme design.
 *
 * Requirements: 23.3
 */

import { useCallback, useMemo, useState } from "react";
import type { Bookmark, SavedPath } from "../../stores/sessionStore";
import { BookOpen, Calendar, Cog, FileText, Heart, Sparkles, Star } from "../icons/Icons";

// ============================================================================
// Types
// ============================================================================

export interface RecentMemory {
  /** Memory ID */
  id: string;
  /** Memory content preview */
  contentPreview: string;
  /** Primary sector type */
  primarySector: string;
  /** Last accessed timestamp */
  lastAccessed: number;
}

export interface QuickAccessPanelProps {
  /** Recent memories to display */
  recentMemories: RecentMemory[];
  /** Bookmarked memories */
  bookmarks: Bookmark[];
  /** Saved exploration paths */
  savedPaths: SavedPath[];
  /** Callback when a memory is clicked */
  onMemoryClick?: (memoryId: string) => void;
  /** Callback when a path is clicked */
  onPathClick?: (pathId: string) => void;
  /** Callback when a bookmark is clicked */
  onBookmarkClick?: (nodeId: string) => void;
  /** Whether the panel is expanded */
  isExpanded?: boolean;
  /** Callback to toggle expansion */
  onToggleExpand?: () => void;
  /** Maximum items to show per section */
  maxItems?: number;
  /** Additional CSS classes */
  className?: string;
}

type TabId = "recent" | "bookmarks" | "paths";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_ITEMS = 5;

// CSS classes for sector badges - uses CSS variables that adapt to theme
const SECTOR_BADGE_CLASSES: Record<string, string> = {
  episodic: "sector-badge-episodic",
  semantic: "sector-badge-semantic",
  procedural: "sector-badge-procedural",
  emotional: "sector-badge-emotional",
  reflective: "sector-badge-reflective",
};

const SECTOR_ICONS: Record<string, React.ReactElement> = {
  episodic: <Calendar size={14} />,
  semantic: <BookOpen size={14} />,
  procedural: <Cog size={14} />,
  emotional: <Heart size={14} />,
  reflective: <Sparkles size={14} />,
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
  return "Just now";
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// ============================================================================
// Sub-Components
// ============================================================================

interface TabButtonProps {
  id: TabId;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Tab button for switching between sections
 */
function TabButton({ id, label, count, isActive, onClick }: TabButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      aria-selected={isActive}
      role="tab"
      id={`tab-${id}`}
      aria-controls={`panel-${id}`}
      className={`
        flex-1 px-3 py-2
        text-xs font-medium
        rounded-t-lg
        transition-colors duration-200
        ${
          isActive
            ? "bg-ui-surface text-ui-accent-primary border-b-2 border-ui-accent-primary"
            : "text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-border/30"
        }
      `}
    >
      {label}
      {count > 0 && (
        <span
          className={`
            ml-1 px-1.5 py-0.5
            text-[10px] rounded-full
            ${isActive ? "bg-ui-accent-primary/20" : "bg-ui-border"}
          `}
        >
          {count}
        </span>
      )}
    </button>
  );
}

interface MemoryItemProps {
  memory: RecentMemory;
  onClick: () => void;
}

/**
 * Recent memory list item
 */
function MemoryItem({ memory, onClick }: MemoryItemProps): React.ReactElement {
  const sectorBadgeClass = SECTOR_BADGE_CLASSES[memory.primarySector] ?? "";
  const sectorIcon = SECTOR_ICONS[memory.primarySector] ?? <FileText size={14} />;

  return (
    <button
      onClick={onClick}
      className="
        w-full p-2
        text-left
        rounded-lg
        bg-ui-background/30
        hover:bg-ui-border/50
        transition-colors duration-200
        group
      "
      aria-label={`Navigate to memory: ${memory.contentPreview}`}
    >
      <div className="flex items-start gap-2">
        <span className={`text-sm ${sectorBadgeClass}`} aria-hidden="true">
          {sectorIcon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-ui-text-primary truncate group-hover:text-ui-accent-primary">
            {truncateText(memory.contentPreview, 50)}
          </p>
          <p className="text-[10px] text-ui-text-muted mt-0.5">
            {formatRelativeTime(memory.lastAccessed)}
          </p>
        </div>
      </div>
    </button>
  );
}

interface BookmarkItemProps {
  bookmark: Bookmark;
  onClick: () => void;
}

/**
 * Bookmark list item
 */
function BookmarkItem({ bookmark, onClick }: BookmarkItemProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className="
        w-full p-2
        text-left
        rounded-lg
        bg-ui-background/30
        hover:bg-ui-border/50
        transition-colors duration-200
        group
      "
      aria-label={`Navigate to bookmark: ${bookmark.label}`}
    >
      <div className="flex items-start gap-2">
        <Star size={14} className="text-ui-accent-secondary" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-ui-text-primary truncate group-hover:text-ui-accent-primary">
            {truncateText(bookmark.label, 50)}
          </p>
          {bookmark.notes !== undefined && bookmark.notes.length > 0 && (
            <p className="text-[10px] text-ui-text-muted mt-0.5 truncate">{bookmark.notes}</p>
          )}
        </div>
      </div>
    </button>
  );
}

interface PathItemProps {
  path: SavedPath;
  onClick: () => void;
}

/**
 * Saved path list item
 */
function PathItem({ path, onClick }: PathItemProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className="
        w-full p-2
        text-left
        rounded-lg
        bg-ui-background/30
        hover:bg-ui-border/50
        transition-colors duration-200
        group
      "
      aria-label={`Load path: ${path.name}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm text-ui-accent-primary" aria-hidden="true">
          🛤️
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-ui-text-primary truncate group-hover:text-ui-accent-primary">
            {path.name}
          </p>
          <p className="text-[10px] text-ui-text-muted mt-0.5">
            {path.nodeIds.length} nodes • {formatRelativeTime(path.createdAt)}
          </p>
        </div>
      </div>
    </button>
  );
}

interface EmptyStateProps {
  message: string;
}

/**
 * Empty state display
 */
function EmptyState({ message }: EmptyStateProps): React.ReactElement {
  return (
    <div className="py-4 text-center">
      <p className="text-xs text-ui-text-muted">{message}</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * QuickAccessPanel - Recent memories and saved sessions
 *
 * Features:
 * - Recent memories list (Requirement 23.3)
 * - Saved sessions/paths list (Requirement 23.3)
 * - Bookmarks list
 * - Tabbed interface for organization
 * - Glassmorphism styling
 * - Collapsible panel
 *
 * Requirements: 23.3
 */
export function QuickAccessPanel({
  recentMemories,
  bookmarks,
  savedPaths,
  onMemoryClick,
  onPathClick,
  onBookmarkClick,
  isExpanded = true,
  onToggleExpand,
  maxItems = DEFAULT_MAX_ITEMS,
  className = "",
}: QuickAccessPanelProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabId>("recent");

  // Limit items to maxItems
  const limitedMemories = useMemo(
    () => recentMemories.slice(0, maxItems),
    [recentMemories, maxItems]
  );

  const limitedBookmarks = useMemo(() => bookmarks.slice(0, maxItems), [bookmarks, maxItems]);

  const limitedPaths = useMemo(() => savedPaths.slice(0, maxItems), [savedPaths, maxItems]);

  // Handle item clicks
  const handleMemoryClick = useCallback(
    (memoryId: string) => {
      onMemoryClick?.(memoryId);
    },
    [onMemoryClick]
  );

  const handleBookmarkClick = useCallback(
    (nodeId: string) => {
      onBookmarkClick?.(nodeId);
    },
    [onBookmarkClick]
  );

  const handlePathClick = useCallback(
    (pathId: string) => {
      onPathClick?.(pathId);
    },
    [onPathClick]
  );

  // Render tab content
  const renderTabContent = (): React.ReactElement => {
    switch (activeTab) {
      case "recent":
        return limitedMemories.length > 0 ? (
          <div className="space-y-1">
            {limitedMemories.map((memory) => (
              <MemoryItem
                key={memory.id}
                memory={memory}
                onClick={(): void => {
                  handleMemoryClick(memory.id);
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No recent memories" />
        );

      case "bookmarks":
        return limitedBookmarks.length > 0 ? (
          <div className="space-y-1">
            {limitedBookmarks.map((bookmark) => (
              <BookmarkItem
                key={bookmark.nodeId}
                bookmark={bookmark}
                onClick={(): void => {
                  handleBookmarkClick(bookmark.nodeId);
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No bookmarks yet" />
        );

      case "paths":
        return limitedPaths.length > 0 ? (
          <div className="space-y-1">
            {limitedPaths.map((path) => (
              <PathItem
                key={path.id}
                path={path}
                onClick={(): void => {
                  handlePathClick(path.id);
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No saved paths" />
        );
    }
  };

  return (
    <div
      className={`
        bg-ui-surface/80
        backdrop-blur-glass
        border border-ui-border
        rounded-lg
        overflow-hidden
        ${className}
      `}
      style={{
        boxShadow: "0 0 15px rgba(0, 255, 255, 0.1)",
        zIndex: 25, // Z_INDEX.QUICK_ACCESS_PANEL - ensures panel is above 3D canvas and clickable (Requirement 48.1, 48.5)
        position: "relative",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ui-border">
        <h3 className="text-sm font-medium text-ui-accent-primary">Quick Access</h3>
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
            className="text-ui-text-muted hover:text-ui-text-primary transition-colors"
          >
            <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
          </button>
        )}
      </div>

      {isExpanded && (
        <>
          {/* Tabs */}
          <div
            className="flex border-b border-ui-border"
            role="tablist"
            aria-label="Quick access sections"
          >
            <TabButton
              id="recent"
              label="Recent"
              count={recentMemories.length}
              isActive={activeTab === "recent"}
              onClick={(): void => {
                setActiveTab("recent");
              }}
            />
            <TabButton
              id="bookmarks"
              label="Bookmarks"
              count={bookmarks.length}
              isActive={activeTab === "bookmarks"}
              onClick={(): void => {
                setActiveTab("bookmarks");
              }}
            />
            <TabButton
              id="paths"
              label="Paths"
              count={savedPaths.length}
              isActive={activeTab === "paths"}
              onClick={(): void => {
                setActiveTab("paths");
              }}
            />
          </div>

          {/* Tab Content */}
          <div
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="p-2 max-h-64 overflow-y-auto"
          >
            {renderTabContent()}
          </div>
        </>
      )}
    </div>
  );
}

export default QuickAccessPanel;
