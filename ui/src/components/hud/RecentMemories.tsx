/**
 * RecentMemories Component
 *
 * Displays a list of recently accessed/created memories with sector color
 * indicators and click-to-navigate functionality.
 *
 * Requirements: 23.3
 */

import { useMemo, type ReactElement } from 'react';
import type { MemorySectorType } from '../../types/api';
import type { RecentMemoryItem } from '../layout/Sidebar';
import { GlassPanel } from './GlassPanel';

// Re-export the type for convenience
export type { RecentMemoryItem } from '../layout/Sidebar';

export interface RecentMemoriesProps {
  /** List of recent memories to display */
  memories: RecentMemoryItem[];
  /** Callback when a memory is clicked */
  onMemoryClick?: (memoryId: string) => void;
  /** Maximum number of memories to display */
  maxItems?: number;
  /** Display variant */
  variant?: 'list' | 'compact' | 'grid';
  /** Show timestamps */
  showTimestamps?: boolean;
  /** Title for the section */
  title?: string;
  /** Show empty state when no memories */
  showEmptyState?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_ITEMS = 5;

const SECTOR_COLORS: Record<MemorySectorType, string> = {
  episodic: 'bg-sector-episodic',
  semantic: 'bg-sector-semantic',
  procedural: 'bg-sector-procedural',
  emotional: 'bg-sector-emotional',
  reflective: 'bg-sector-reflective',
};

const SECTOR_TEXT_COLORS: Record<MemorySectorType, string> = {
  episodic: 'text-sector-episodic',
  semantic: 'text-sector-semantic',
  procedural: 'text-sector-procedural',
  emotional: 'text-sector-emotional',
  reflective: 'text-sector-reflective',
};

const SECTOR_ICONS: Record<MemorySectorType, string> = {
  episodic: '📅',
  semantic: '📚',
  procedural: '⚙️',
  emotional: '💛',
  reflective: '🪞',
};

const SECTOR_LABELS: Record<MemorySectorType, string> = {
  episodic: 'Episodic',
  semantic: 'Semantic',
  procedural: 'Procedural',
  emotional: 'Emotional',
  reflective: 'Reflective',
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
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MemoryListItemProps {
  memory: RecentMemoryItem;
  showTimestamp: boolean;
  onClick: () => void;
}

/**
 * Individual memory list item
 */
function MemoryListItem({ memory, showTimestamp, onClick }: MemoryListItemProps): ReactElement {
  const sector = memory.primarySector as MemorySectorType;
  const sectorColor = SECTOR_COLORS[sector];
  const sectorTextColor = SECTOR_TEXT_COLORS[sector];
  const sectorIcon = SECTOR_ICONS[sector];
  const sectorLabel = SECTOR_LABELS[sector];

  return (
    <button
      onClick={onClick}
      className="
        w-full p-3
        text-left
        rounded-lg
        bg-ui-background/30
        hover:bg-ui-border/40
        border border-transparent
        hover:border-ui-border/50
        transition-all duration-normal
        group
        focus:outline-none focus:ring-2 focus:ring-ui-accent-primary/50
      "
      aria-label={`Navigate to memory: ${memory.contentPreview}`}
    >
      <div className="flex items-start gap-3">
        {/* Sector color indicator */}
        <div className="flex-shrink-0 mt-0.5">
          <div
            className={`
              w-2 h-2 rounded-full ${sectorColor}
              group-hover:scale-125
              transition-transform duration-fast
            `}
            style={{
              boxShadow: `0 0 6px currentColor`,
            }}
            title={sectorLabel}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ui-text-primary truncate group-hover:text-ui-accent-primary transition-colors duration-fast">
            {truncateText(memory.contentPreview, 60)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs ${sectorTextColor}`} aria-hidden="true">
              {sectorIcon}
            </span>
            <span className="text-xs text-ui-text-muted">{sectorLabel}</span>
            {showTimestamp && (
              <>
                <span className="text-xs text-ui-text-muted">•</span>
                <span className="text-xs text-ui-text-muted">
                  {formatRelativeTime(memory.lastAccessed)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
          <span className="text-ui-text-muted text-sm">→</span>
        </div>
      </div>
    </button>
  );
}

interface CompactMemoryItemProps {
  memory: RecentMemoryItem;
  onClick: () => void;
}

/**
 * Compact memory item for sidebar use
 */
function CompactMemoryItem({ memory, onClick }: CompactMemoryItemProps): ReactElement {
  const sector = memory.primarySector as MemorySectorType;
  const sectorColor = SECTOR_COLORS[sector];
  const sectorIcon = SECTOR_ICONS[sector];

  return (
    <button
      onClick={onClick}
      className="
        w-full p-2
        text-left
        rounded-lg
        hover:bg-ui-border/30
        transition-colors duration-normal
        group
        focus:outline-none focus:ring-2 focus:ring-ui-accent-primary/50
      "
      aria-label={`Navigate to memory: ${memory.contentPreview}`}
      title={memory.contentPreview}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-1.5 h-1.5 rounded-full ${sectorColor} flex-shrink-0`}
          style={{ boxShadow: `0 0 4px currentColor` }}
        />
        <span className="text-xs" aria-hidden="true">
          {sectorIcon}
        </span>
        <span className="text-xs text-ui-text-primary truncate group-hover:text-ui-accent-primary">
          {truncateText(memory.contentPreview, 30)}
        </span>
      </div>
    </button>
  );
}

interface GridMemoryItemProps {
  memory: RecentMemoryItem;
  onClick: () => void;
}

/**
 * Grid memory card for dashboard use
 */
function GridMemoryItem({ memory, onClick }: GridMemoryItemProps): ReactElement {
  const sector = memory.primarySector as MemorySectorType;
  const sectorColor = SECTOR_COLORS[sector];
  const sectorTextColor = SECTOR_TEXT_COLORS[sector];
  const sectorIcon = SECTOR_ICONS[sector];
  const sectorLabel = SECTOR_LABELS[sector];

  return (
    <button
      onClick={onClick}
      className="
        w-full p-4
        text-left
        rounded-xl
        bg-ui-background/40
        hover:bg-ui-border/40
        border border-ui-border/30
        hover:border-ui-accent-primary/30
        transition-all duration-normal
        group
        focus:outline-none focus:ring-2 focus:ring-ui-accent-primary/50
      "
      style={{
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      }}
      aria-label={`Navigate to memory: ${memory.contentPreview}`}
    >
      {/* Header with sector indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${sectorColor}`}
          style={{ boxShadow: `0 0 8px currentColor` }}
        />
        <span className={`text-xs font-medium ${sectorTextColor}`}>
          {sectorIcon} {sectorLabel}
        </span>
      </div>

      {/* Content preview */}
      <p className="text-sm text-ui-text-primary line-clamp-2 group-hover:text-ui-accent-primary transition-colors duration-fast">
        {truncateText(memory.contentPreview, 80)}
      </p>

      {/* Timestamp */}
      <p className="text-xs text-ui-text-muted mt-2">{formatRelativeTime(memory.lastAccessed)}</p>
    </button>
  );
}

/**
 * Empty state when no recent memories
 */
function EmptyState(): ReactElement {
  return (
    <div className="text-center py-8 px-4">
      <div className="text-4xl mb-3" aria-hidden="true">
        🧠
      </div>
      <p className="text-sm text-ui-text-secondary mb-1">No recent memories</p>
      <p className="text-xs text-ui-text-muted">Memories you access will appear here</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * RecentMemories - Display list of recently accessed/created memories
 *
 * Features:
 * - Display list of recently accessed/created memories (Requirement 23.3)
 * - Show memory preview with sector color indicator
 * - Click to navigate to Memory Explorer
 * - Multiple display variants (list, compact, grid)
 * - Relative timestamps
 * - Glassmorphism styling
 *
 * Requirements: 23.3
 */
export function RecentMemories({
  memories,
  onMemoryClick,
  maxItems = DEFAULT_MAX_ITEMS,
  variant = 'list',
  showTimestamps = true,
  title = 'Recent Memories',
  showEmptyState = true,
  className = '',
}: RecentMemoriesProps): ReactElement {
  // Sort memories by lastAccessed (newest first) and limit
  const sortedMemories = useMemo(() => {
    return [...memories].sort((a, b) => b.lastAccessed - a.lastAccessed).slice(0, maxItems);
  }, [memories, maxItems]);

  // Handle memory click
  const handleMemoryClick = (memoryId: string): void => {
    onMemoryClick?.(memoryId);
  };

  // Render empty state
  if (sortedMemories.length === 0 && showEmptyState) {
    return (
      <div className={className}>
        {title && (
          <h3 className="text-xs font-semibold text-ui-text-muted uppercase tracking-wider mb-3">
            {title}
          </h3>
        )}
        <EmptyState />
      </div>
    );
  }

  // Render compact variant
  if (variant === 'compact') {
    return (
      <div className={className}>
        {title && (
          <h3 className="text-xs font-semibold text-ui-text-muted uppercase tracking-wider mb-2 px-1">
            {title}
          </h3>
        )}
        <ul className="space-y-1">
          {sortedMemories.map((memory) => (
            <li key={memory.id}>
              <CompactMemoryItem
                memory={memory}
                onClick={(): void => {
                  handleMemoryClick(memory.id);
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Render grid variant
  if (variant === 'grid') {
    return (
      <div className={className}>
        {title && <h3 className="text-sm font-semibold text-ui-text-secondary mb-4">{title}</h3>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedMemories.map((memory) => (
            <GridMemoryItem
              key={memory.id}
              memory={memory}
              onClick={(): void => {
                handleMemoryClick(memory.id);
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Render list variant (default)
  return (
    <div className={className}>
      {title && (
        <h3 className="text-xs font-semibold text-ui-text-muted uppercase tracking-wider mb-3">
          {title}
        </h3>
      )}
      <ul className="space-y-2">
        {sortedMemories.map((memory) => (
          <li key={memory.id}>
            <MemoryListItem
              memory={memory}
              showTimestamp={showTimestamps}
              onClick={(): void => {
                handleMemoryClick(memory.id);
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Panel Wrapper Component
// ============================================================================

export interface RecentMemoriesPanelProps extends RecentMemoriesProps {
  /** Panel variant for glassmorphism styling */
  panelVariant?: 'default' | 'glow' | 'glow-cyan';
}

/**
 * RecentMemoriesPanel - RecentMemories wrapped in a GlassPanel
 *
 * Convenience component for use in dashboard layouts.
 */
export function RecentMemoriesPanel({
  panelVariant = 'default',
  className = '',
  ...props
}: RecentMemoriesPanelProps): ReactElement {
  return (
    <GlassPanel variant={panelVariant} size="md" className={className}>
      <RecentMemories {...props} />
    </GlassPanel>
  );
}

export default RecentMemories;
