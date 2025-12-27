/**
 * RecentMemoriesMasonry Component
 *
 * Displays recent memories in a masonry grid layout using CSS Grid.
 * Sorts memories by createdAt descending and limits to 10 most recent.
 *
 * Requirements: 4.1, 4.7, 4.8
 */

import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { Memory } from "../../types/api";
import { EmptyBrainIcon } from "../icons";
import { MasonryMemoryCard } from "./MasonryMemoryCard";

// ============================================================================
// Types
// ============================================================================

export interface RecentMemoriesMasonryProps {
  /** Array of memories to display */
  memories: Memory[];
  /** Maximum number of memories to display (default: 10) */
  maxCount?: number;
  /** Callback when a memory card is clicked */
  onMemoryClick?: (memoryId: string) => void;
  /** Minimum height for memory cards in pixels (default: 150) */
  cardMinHeight?: number;
  /** Maximum height for memory cards in pixels (default: 300) */
  cardMaxHeight?: number;
  /** Title for the section */
  title?: string;
  /** Show empty state when no memories */
  showEmptyState?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Enable 2-row layout that adapts to screen width */
  twoRowLayout?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_COUNT = 10;
const DEFAULT_CARD_MIN_HEIGHT = 150;
const DEFAULT_CARD_MAX_HEIGHT = 300;

// Minimum card width for grid calculations
const CARD_MIN_WIDTH = 380;
const GRID_GAP = 16; // 4 in tailwind = 16px

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate how many columns fit in a container width
 * Based on min card width of 380px and 16px gap
 */
function calculateColumnsCount(containerWidth: number): number {
  if (containerWidth === 0) return 1;
  // Formula: (containerWidth + gap) / (cardMinWidth + gap)
  const cols = Math.floor((containerWidth + GRID_GAP) / (CARD_MIN_WIDTH + GRID_GAP));
  return Math.max(1, Math.min(cols, 4)); // Clamp between 1-4 columns
}

/**
 * Sort memories by createdAt timestamp in descending order (newest first)
 * Requirements: 4.8
 */
import { getRecentMemories } from "../../utils/memoryUtils";

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Empty state when no memories are available
 */
function EmptyState(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-ui-text-muted mb-4" aria-hidden="true">
        <EmptyBrainIcon size="4xl" />
      </div>
      <p className="text-sm text-ui-text-secondary mb-1">No memories yet</p>
      <p className="text-xs text-ui-text-muted">Start capturing your thoughts to see them here</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * RecentMemoriesMasonry - Display recent memories in a masonry grid layout
 *
 * Features:
 * - CSS columns masonry layout (Requirements: 4.1)
 * - Scrollable grid container (Requirements: 4.7)
 * - Displays 10 most recent memories by createdAt (Requirements: 4.8)
 * - Uses MasonryMemoryCard for individual cards
 * - twoRowLayout: uses CSS Grid with 2 rows that fill available height
 *
 * Requirements: 4.1, 4.7, 4.8
 */
export function RecentMemoriesMasonry({
  memories,
  maxCount = DEFAULT_MAX_COUNT,
  onMemoryClick,
  cardMinHeight = DEFAULT_CARD_MIN_HEIGHT,
  cardMaxHeight = DEFAULT_CARD_MAX_HEIGHT,
  title,
  showEmptyState = true,
  className = "",
  twoRowLayout = false,
}: RecentMemoriesMasonryProps): ReactElement {
  // Track container width for responsive column calculation when twoRowLayout is enabled
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // Calculate how many columns fit based on container width and card min-width
  const columnsCount = useMemo(() => {
    return calculateColumnsCount(containerWidth);
  }, [containerWidth]);

  // Calculate how many cards fit in 2 rows
  const cardsToShow = useMemo(() => {
    if (!twoRowLayout) return maxCount;
    // 2 rows × number of columns
    return Math.max(2, columnsCount * 2);
  }, [twoRowLayout, columnsCount, maxCount]);

  // Observe container width changes
  useEffect(() => {
    if (!containerRef) return;

    // Get initial width
    setContainerWidth(containerRef.offsetWidth);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef);
    return (): void => {
      observer.disconnect();
    };
  }, [containerRef]);

  // Get the most recent memories sorted by createdAt descending
  // Requirements: 4.8
  const recentMemories = useMemo(() => {
    const count = twoRowLayout ? cardsToShow : maxCount;
    return getRecentMemories(memories, count);
  }, [memories, maxCount, twoRowLayout, cardsToShow]);

  // Handle memory card click
  const handleMemoryClick = (memoryId: string): void => {
    onMemoryClick?.(memoryId);
  };

  // Render empty state if no memories
  if (recentMemories.length === 0 && showEmptyState) {
    return (
      <div className={className}>
        {title !== undefined && title.length > 0 && (
          <h2 className="text-lg font-semibold text-ui-text-primary mb-4">{title}</h2>
        )}
        <EmptyState />
      </div>
    );
  }

  // For twoRowLayout, use CSS Grid with 2 rows that fill available height
  if (twoRowLayout) {
    return (
      <div
        ref={setContainerRef}
        className={`flex flex-col overflow-visible ${className}`}
        style={{ height: "100%", minHeight: 0 }}
      >
        {/* Title */}
        {title !== undefined && title.length > 0 && (
          <h2 className="text-lg font-semibold text-ui-text-primary mb-4 flex-shrink-0">{title}</h2>
        )}

        {/* CSS Grid - 2 rows, columns based on container width */}
        {/* Added padding to allow glow effects to be visible outside card boundaries */}
        <div
          className="grid gap-4 overflow-visible"
          style={{
            flex: "1 1 0",
            minHeight: 0,
            maxHeight: "100%",
            gridTemplateColumns: `repeat(${String(columnsCount)}, minmax(${String(CARD_MIN_WIDTH)}px, 1fr))`,
            gridTemplateRows: "1fr 1fr",
            padding: "8px",
            margin: "-8px",
          }}
        >
          {recentMemories.map((memory) => (
            <MasonryMemoryCard
              key={memory.id}
              memory={memory}
              onClick={(): void => {
                handleMemoryClick(memory.id);
              }}
              minHeight={0}
              maxHeight={undefined}
              className="h-full overflow-hidden"
            />
          ))}
        </div>
      </div>
    );
  }

  // Default: CSS columns masonry layout
  return (
    <div ref={setContainerRef} className={`flex flex-col h-full ${className}`}>
      {/* Title */}
      {title !== undefined && title.length > 0 && (
        <h2 className="text-lg font-semibold text-ui-text-primary mb-4 flex-shrink-0">{title}</h2>
      )}

      {/* Masonry Grid Container */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div
          className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4"
          style={{ columnFill: "balance" }}
        >
          {recentMemories.map((memory) => (
            <MasonryMemoryCard
              key={memory.id}
              memory={memory}
              onClick={(): void => {
                handleMemoryClick(memory.id);
              }}
              minHeight={cardMinHeight}
              maxHeight={cardMaxHeight}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default RecentMemoriesMasonry;
