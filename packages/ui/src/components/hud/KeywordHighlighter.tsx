/**
 * KeywordHighlighter Component
 *
 * Parses memory content and highlights keywords that link to other memories.
 * Keywords are underlined and colored based on their link type.
 * Shows tooltip preview of connected memories on hover.
 *
 * Requirements: 40.1, 40.3, 40.4
 */

import { useCallback, useMemo, useState } from "react";
import type { LinkedKeyword } from "../../utils/highlightUtils";
import { getKeywordLinkColor, parseContentWithKeywords } from "../../utils/highlightUtils";
import type { MemoryPreview } from "../../utils/previewUtils";
import { KeywordHoverPreview } from "./KeywordHoverPreview";

// ============================================================================
// Types
// ============================================================================

export type { LinkedKeyword };

export interface KeywordHighlighterProps {
  /** The memory content to parse and display */
  content: string;
  /** Array of linked keywords to highlight */
  linkedKeywords: LinkedKeyword[];
  /** Callback when a keyword is clicked */
  onKeywordClick?: (keyword: LinkedKeyword) => void;
  /** Callback when a keyword is hovered */
  onKeywordHover?: (keyword: LinkedKeyword | null) => void;
  /** Additional CSS classes */
  className?: string;
  /** Map of memory IDs to memory previews for hover tooltip (Requirements: 40.3) */
  memoryPreviews?: Map<string, MemoryPreview> | undefined;
  /** Whether to use high contrast colors */
  highContrast?: boolean | undefined;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface HighlightedKeywordProps {
  keyword: LinkedKeyword;
  displayText: string;
  onClick: ((keyword: LinkedKeyword) => void) | undefined;
  onHover: ((keyword: LinkedKeyword | null) => void) | undefined;
  onMouseMove: ((keyword: LinkedKeyword, position: { x: number; y: number }) => void) | undefined;
}

/**
 * Renders a single highlighted keyword with underline and color.
 * Shows a count badge when keyword connects to multiple memories.
 * Requirements: 40.1, 40.3, 40.4, 40.5
 */
function HighlightedKeyword({
  keyword,
  displayText,
  onClick,
  onHover,
  onMouseMove,
}: HighlightedKeywordProps): React.ReactElement {
  // Check if we're in light mode for color adjustments
  const isLightMode =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme-mode") === "light";
  const color = getKeywordLinkColor(keyword.linkType, isLightMode);

  const handleClick = useCallback(() => {
    onClick?.(keyword);
  }, [onClick, keyword]);

  const handleMouseEnter = useCallback(() => {
    onHover?.(keyword);
  }, [onHover, keyword]);

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      onMouseMove?.(keyword, { x: e.clientX, y: e.clientY });
    },
    [onMouseMove, keyword]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.(keyword);
      }
    },
    [onClick, keyword]
  );

  const connectionCount = keyword.linkedMemoryIds.length;
  const hasMultipleConnections = connectionCount > 1;
  const ariaLabel = `Linked keyword: ${displayText}. ${String(connectionCount)} connection${connectionCount !== 1 ? "s" : ""}. Press Enter to navigate.`;

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      className="cursor-pointer transition-all duration-150 hover:brightness-125 inline-flex items-baseline gap-0.5"
      style={{
        color,
        textDecoration: "underline",
        textDecorationColor: color,
        textDecorationThickness: "2px",
        textUnderlineOffset: "2px",
      }}
    >
      {displayText}
      {/* Multi-connection badge (Requirements: 40.5) */}
      {hasMultipleConnections && (
        <span
          className="inline-flex items-center justify-center text-[10px] font-semibold leading-none rounded-full px-1 py-0.5 ml-0.5 no-underline"
          style={{
            backgroundColor: `${color}33`, // 20% opacity of the link color
            color: color,
            border: `1px solid ${color}66`, // 40% opacity border
            textDecoration: "none",
            minWidth: "16px",
            height: "14px",
          }}
          aria-hidden="true"
          data-testid="multi-connection-badge"
        >
          {connectionCount}
        </span>
      )}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * KeywordHighlighter - Highlights linked keywords in memory content.
 *
 * Features:
 * - Parses content for linked keywords
 * - Underlines keywords with link-type-specific colors
 * - Supports click and hover interactions
 * - Shows tooltip preview of connected memories on hover
 * - Shows count badge for keywords with multiple connections
 * - Accessible with keyboard navigation
 *
 * Requirements: 40.1, 40.3, 40.4, 40.5
 */
export function KeywordHighlighter({
  content,
  linkedKeywords,
  onKeywordClick,
  onKeywordHover,
  className = "",
  memoryPreviews,
  highContrast = false,
}: KeywordHighlighterProps): React.ReactElement {
  // State for hover preview tooltip (Requirements: 40.3)
  const [hoveredKeyword, setHoveredKeyword] = useState<LinkedKeyword | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Parse content into segments
  const segments = useMemo(
    () => parseContentWithKeywords(content, linkedKeywords),
    [content, linkedKeywords]
  );

  // Handle keyword hover with external callback
  const handleKeywordHover = useCallback(
    (keyword: LinkedKeyword | null) => {
      setHoveredKeyword(keyword);
      onKeywordHover?.(keyword);
    },
    [onKeywordHover]
  );

  // Handle mouse move to track position for tooltip
  const handleMouseMove = useCallback(
    (_keyword: LinkedKeyword, position: { x: number; y: number }) => {
      setMousePosition(position);
    },
    []
  );

  // Get connected memory previews for the hovered keyword (Requirements: 40.3)
  const connectedMemoryPreviews = useMemo(() => {
    if (!hoveredKeyword || !memoryPreviews) {
      return [];
    }

    const previews: MemoryPreview[] = [];
    for (const memoryId of hoveredKeyword.linkedMemoryIds) {
      const preview = memoryPreviews.get(memoryId);
      if (preview) {
        previews.push(preview);
      }
    }
    return previews;
  }, [hoveredKeyword, memoryPreviews]);

  return (
    <>
      <span className={className}>
        {segments.map((segment, index) => {
          if (segment.type === "text") {
            return <span key={`text-${String(index)}`}>{segment.content}</span>;
          }

          // Keyword segment
          const keyword = segment.keyword;
          if (!keyword) {
            return <span key={`text-${String(index)}`}>{segment.content}</span>;
          }

          return (
            <HighlightedKeyword
              key={`keyword-${String(keyword.startIndex)}-${String(keyword.endIndex)}`}
              keyword={keyword}
              displayText={segment.content}
              onClick={onKeywordClick}
              onHover={handleKeywordHover}
              onMouseMove={handleMouseMove}
            />
          );
        })}
      </span>

      {/* Hover preview tooltip (Requirements: 40.3) */}
      {memoryPreviews && (
        <KeywordHoverPreview
          isVisible={hoveredKeyword !== null && connectedMemoryPreviews.length > 0}
          keywordText={hoveredKeyword?.text ?? ""}
          linkType={hoveredKeyword?.linkType ?? "semantic"}
          connectedMemories={connectedMemoryPreviews}
          position={mousePosition}
          highContrast={highContrast}
        />
      )}
    </>
  );
}

export default KeywordHighlighter;
