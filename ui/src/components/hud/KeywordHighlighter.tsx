/**
 * KeywordHighlighter Component
 *
 * Parses memory content and highlights keywords that link to other memories.
 * Keywords are underlined and colored based on their link type.
 * Shows tooltip preview of connected memories on hover.
 *
 * Requirements: 40.1, 40.3, 40.4
 */

import { useCallback, useMemo, useState } from 'react';
import type { LinkType } from '../../types/api';
import type { MemoryPreview } from './KeywordHoverPreview';
import { KeywordHoverPreview } from './KeywordHoverPreview';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a keyword in memory content that links to other memories.
 */
export interface LinkedKeyword {
  /** The keyword text */
  text: string;
  /** Start index in the content string */
  startIndex: number;
  /** End index in the content string (exclusive) */
  endIndex: number;
  /** IDs of memories this keyword links to */
  linkedMemoryIds: string[];
  /** Type of link (determines color) */
  linkType: LinkType;
}

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
// Constants
// ============================================================================

/**
 * Color mapping for link types (dark mode).
 * Requirements: 40.4 - cyan for semantic, orange for causal
 */
const KEYWORD_LINK_COLORS: Record<LinkType, string> = {
  semantic: '#00FFFF', // Cyan
  causal: '#FF8800', // Orange
  temporal: '#00FF88', // Green
  analogical: '#8800FF', // Purple
};

/**
 * Color mapping for link types (light mode - bold, saturated for visibility).
 */
const KEYWORD_LINK_COLORS_LIGHT: Record<LinkType, string> = {
  semantic: '#0077B6', // Bold blue
  causal: '#D62828', // Bold red-orange
  temporal: '#2D6A4F', // Bold green
  analogical: '#7B2CBF', // Bold purple
};

/**
 * Gets the color for a keyword based on its link type.
 * Requirements: 40.4
 *
 * @param linkType - The type of link
 * @param lightMode - Whether to use light mode colors
 * @returns CSS color string
 */
export function getKeywordLinkColor(linkType: LinkType, lightMode: boolean = false): string {
  if (lightMode) {
    return KEYWORD_LINK_COLORS_LIGHT[linkType];
  }
  return KEYWORD_LINK_COLORS[linkType];
}

// ============================================================================
// Helper Types
// ============================================================================

interface ContentSegment {
  type: 'text' | 'keyword';
  content: string;
  keyword?: LinkedKeyword;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parses content into segments of plain text and highlighted keywords.
 * Handles overlapping keywords by using the first one encountered.
 *
 * @param content - The full content string
 * @param keywords - Array of linked keywords to highlight
 * @returns Array of content segments
 */
export function parseContentWithKeywords(
  content: string,
  keywords: LinkedKeyword[]
): ContentSegment[] {
  if (keywords.length === 0) {
    return [{ type: 'text', content }];
  }

  // Sort keywords by start index
  const sortedKeywords = [...keywords].sort((a, b) => a.startIndex - b.startIndex);

  // Filter out invalid keywords and remove overlaps
  const validKeywords: LinkedKeyword[] = [];
  let lastEndIndex = 0;

  for (const keyword of sortedKeywords) {
    // Validate keyword indices
    if (
      keyword.startIndex < 0 ||
      keyword.endIndex > content.length ||
      keyword.startIndex >= keyword.endIndex
    ) {
      continue;
    }

    // Skip overlapping keywords
    if (keyword.startIndex < lastEndIndex) {
      continue;
    }

    // Verify the keyword text matches the content at the specified position
    const contentSlice = content.slice(keyword.startIndex, keyword.endIndex);
    if (contentSlice.toLowerCase() !== keyword.text.toLowerCase()) {
      continue;
    }

    validKeywords.push(keyword);
    lastEndIndex = keyword.endIndex;
  }

  // Build segments
  const segments: ContentSegment[] = [];
  let currentIndex = 0;

  for (const keyword of validKeywords) {
    // Add text before keyword
    if (keyword.startIndex > currentIndex) {
      segments.push({
        type: 'text',
        content: content.slice(currentIndex, keyword.startIndex),
      });
    }

    // Add keyword segment
    segments.push({
      type: 'keyword',
      content: content.slice(keyword.startIndex, keyword.endIndex),
      keyword,
    });

    currentIndex = keyword.endIndex;
  }

  // Add remaining text after last keyword
  if (currentIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.slice(currentIndex),
    });
  }

  return segments;
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
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme-mode') === 'light';
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
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.(keyword);
      }
    },
    [onClick, keyword]
  );

  const connectionCount = keyword.linkedMemoryIds.length;
  const hasMultipleConnections = connectionCount > 1;
  const ariaLabel = `Linked keyword: ${displayText}. ${String(connectionCount)} connection${connectionCount !== 1 ? 's' : ''}. Press Enter to navigate.`;

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
        textDecoration: 'underline',
        textDecorationColor: color,
        textDecorationThickness: '2px',
        textUnderlineOffset: '2px',
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
            textDecoration: 'none',
            minWidth: '16px',
            height: '14px',
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
  className = '',
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
          if (segment.type === 'text') {
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
          keywordText={hoveredKeyword?.text ?? ''}
          linkType={hoveredKeyword?.linkType ?? 'semantic'}
          connectedMemories={connectedMemoryPreviews}
          position={mousePosition}
          highContrast={highContrast}
        />
      )}
    </>
  );
}

export default KeywordHighlighter;
