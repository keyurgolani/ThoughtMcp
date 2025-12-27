/**
 * MasonryMemoryCard Component
 *
 * A memory card component designed for masonry grid layouts.
 * Features min/max height constraints, relative timestamps,
 * memory type badges, and independently scrollable markdown content.
 *
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { useMemo, type ReactElement } from "react";
import type { Memory } from "../../types/api";
import { BlockNotePreview } from "./BlockNotePreview";
import { SectorBadge } from "./SectorBadge";

// ============================================================================
// Types
// ============================================================================

export interface MasonryMemoryCardProps {
  /** The memory to display */
  memory: Memory;
  /** Callback when the card is clicked */
  onClick?: () => void;
  /** Minimum height in pixels (default: 150, use 0 for flexible) */
  minHeight?: number;
  /** Maximum height in pixels (default: 300, use undefined for flexible) */
  maxHeight?: number | undefined;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MIN_HEIGHT = 150;
const DEFAULT_MAX_HEIGHT = 300;

// ============================================================================
// Helper Functions
// ============================================================================

import { formatRelativeTime } from "../../utils/timeUtils";

// ============================================================================
// Main Component
// ============================================================================

/**
 * MasonryMemoryCard - A card component for displaying memories in a masonry grid
 *
 * Features:
 * - Configurable min/max height constraints (Requirements: 4.2)
 * - Relative timestamp display with minimal footprint (Requirements: 4.3)
 * - Memory type badge with sector color (Requirements: 4.4)
 * - Markdown content rendering (Requirements: 4.5)
 * - Independent scroll for content area (Requirements: 4.6)
 *
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6
 */
export function MasonryMemoryCard({
  memory,
  onClick,
  minHeight = DEFAULT_MIN_HEIGHT,
  maxHeight,
  className = "",
}: MasonryMemoryCardProps): ReactElement {
  // Format the creation timestamp
  const relativeTime = useMemo(() => {
    return formatRelativeTime(memory.createdAt);
  }, [memory.createdAt]);

  // Handle click with keyboard support
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  // Build height styles - support flexible height when maxHeight is undefined
  const heightStyles: React.CSSProperties = {};
  if (minHeight > 0) {
    heightStyles.minHeight = `${String(minHeight)}px`;
  }
  // Only apply maxHeight if explicitly provided (not undefined)
  const effectiveMaxHeight = maxHeight ?? DEFAULT_MAX_HEIGHT;
  const hasFlexibleHeight = className.includes("h-full");
  if (!hasFlexibleHeight && effectiveMaxHeight > 0) {
    heightStyles.maxHeight = `${String(effectiveMaxHeight)}px`;
  }

  return (
    <div
      className={`
        relative flex flex-col
        p-4 rounded-lg border
        bg-ui-surface/80 border-ui-border/50
        hover:bg-ui-surface-elevated/50 hover:border-ui-accent-primary/50
        transition-all duration-200 cursor-pointer
        break-inside-avoid
        group
        ${className}
      `}
      style={{
        ...heightStyles,
        ...(hasFlexibleHeight ? { height: "100%" } : {}),
        backdropFilter: "blur(12px)",
        boxShadow: "0 0 15px var(--theme-primary-glow), inset 0 0 20px var(--theme-primary-bg)",
      }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "0 0 25px var(--theme-primary-glow), 0 0 50px var(--theme-primary-bg), inset 0 0 30px var(--theme-primary-bg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow =
          "0 0 15px var(--theme-primary-glow), inset 0 0 20px var(--theme-primary-bg)";
      }}
      role="button"
      tabIndex={0}
      aria-label={`View memory: ${memory.content.substring(0, 50)}...`}
    >
      {/* Header: Sector badge and timestamp */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
        {/* Sector badge - small and minimal (Requirements: 4.4) */}
        <SectorBadge sector={memory.primarySector} size="sm" />

        {/* Relative timestamp - minimal footprint (Requirements: 4.3) */}
        <span
          className="text-xs text-ui-text-muted flex-shrink-0"
          title={new Date(memory.createdAt).toLocaleString()}
        >
          {relativeTime}
        </span>
      </div>

      {/* Content area - independently scrollable (Requirements: 4.5, 4.6) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 text-sm text-ui-text-primary group-hover:text-ui-accent-primary/90 transition-colors duration-fast">
        <BlockNotePreview content={memory.content} maxLines={10} />
      </div>
    </div>
  );
}

export default MasonryMemoryCard;
