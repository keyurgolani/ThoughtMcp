/**
 * ContentRenderer Component
 *
 * Renders memory content with both keyword highlighting and wiki link rendering.
 * Combines KeywordHighlighter and WikiLinkRenderer functionality to provide
 * a unified content display with all interactive elements.
 *
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 41.3, 41.4
 */

import { useCallback, useMemo, useState } from 'react';
import type { LinkType } from '../../types/api';
import { getKeywordLinkColor, type LinkedKeyword } from './KeywordHighlighter';
import type { MemoryPreview } from './KeywordHoverPreview';
import { KeywordHoverPreview } from './KeywordHoverPreview';
import { parseWikiLinks, type ParsedWikiLink } from './WikiLinkRenderer';

// ============================================================================
// Types
// ============================================================================

export interface ContentRendererProps {
  /** The content to render */
  content: string;
  /** Array of linked keywords to highlight (Requirements: 40.1) */
  linkedKeywords?: LinkedKeyword[] | undefined;
  /** Callback when a keyword is clicked (Requirements: 40.2) */
  onKeywordClick?: ((keyword: LinkedKeyword) => void) | undefined;
  /** Callback when a wiki link is clicked (Requirements: 41.4) */
  onWikiLinkClick?: ((memoryId: string) => void) | undefined;
  /** Map of memory IDs to memory previews for hover tooltip (Requirements: 40.3) */
  memoryPreviews?: Map<string, MemoryPreview> | undefined;
  /** Whether to use high contrast colors */
  highContrast?: boolean | undefined;
  /** Additional CSS classes */
  className?: string | undefined;
}

// ============================================================================
// Constants
// ============================================================================

const WIKI_LINK_COLOR = '#00FFFF';
const WIKI_LINK_COLOR_HIGH_CONTRAST = '#00E5E5';
const WIKI_LINK_COLOR_LIGHT = '#0066CC'; // Darker blue for light mode visibility

// ============================================================================
// Helper Types
// ============================================================================

type ContentSegmentType = 'text' | 'keyword' | 'wikilink';

interface ContentSegment {
  type: ContentSegmentType;
  content: string;
  startIndex: number;
  endIndex: number;
  keyword?: LinkedKeyword;
  wikiLink?: ParsedWikiLink;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Merges keyword segments and wiki link segments into a single sorted array.
 * Handles overlapping segments by prioritizing wiki links (they are explicit user-created links).
 */
function mergeSegments(
  content: string,
  keywords: LinkedKeyword[],
  wikiLinks: ParsedWikiLink[]
): ContentSegment[] {
  // Create segments from keywords
  const keywordSegments: ContentSegment[] = keywords.map((kw) => ({
    type: 'keyword' as const,
    content: content.slice(kw.startIndex, kw.endIndex),
    startIndex: kw.startIndex,
    endIndex: kw.endIndex,
    keyword: kw,
  }));

  // Create segments from wiki links
  const wikiLinkSegments: ContentSegment[] = wikiLinks.map((link) => ({
    type: 'wikilink' as const,
    content: link.displayText,
    startIndex: link.startIndex,
    endIndex: link.endIndex,
    wikiLink: link,
  }));

  // Combine and sort by start index
  const allSegments = [...keywordSegments, ...wikiLinkSegments].sort(
    (a, b) => a.startIndex - b.startIndex
  );

  // Remove overlapping segments (wiki links take priority)
  const nonOverlapping: ContentSegment[] = [];
  let lastEndIndex = 0;

  for (const segment of allSegments) {
    // Skip if this segment overlaps with a previous one
    if (segment.startIndex < lastEndIndex) {
      // If this is a wiki link and the previous was a keyword, replace it
      if (segment.type === 'wikilink' && nonOverlapping.length > 0) {
        const lastSegment = nonOverlapping[nonOverlapping.length - 1];
        if (lastSegment?.type === 'keyword' && lastSegment.endIndex > segment.startIndex) {
          // Remove the overlapping keyword
          nonOverlapping.pop();
          // Adjust lastEndIndex
          lastEndIndex =
            nonOverlapping.length > 0
              ? (nonOverlapping[nonOverlapping.length - 1]?.endIndex ?? 0)
              : 0;
        } else {
          continue;
        }
      } else {
        continue;
      }
    }

    nonOverlapping.push(segment);
    lastEndIndex = segment.endIndex;
  }

  // Build final segments including text between special segments
  const finalSegments: ContentSegment[] = [];
  let currentIndex = 0;

  for (const segment of nonOverlapping) {
    // Add text before this segment
    if (segment.startIndex > currentIndex) {
      finalSegments.push({
        type: 'text',
        content: content.slice(currentIndex, segment.startIndex),
        startIndex: currentIndex,
        endIndex: segment.startIndex,
      });
    }

    finalSegments.push(segment);
    currentIndex = segment.endIndex;
  }

  // Add remaining text
  if (currentIndex < content.length) {
    finalSegments.push({
      type: 'text',
      content: content.slice(currentIndex),
      startIndex: currentIndex,
      endIndex: content.length,
    });
  }

  return finalSegments;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface HighlightedKeywordElementProps {
  keyword: LinkedKeyword;
  displayText: string;
  onClick: ((keyword: LinkedKeyword) => void) | undefined;
  onHover:
    | ((keyword: LinkedKeyword | null, position: { x: number; y: number }) => void)
    | undefined;
}

function HighlightedKeywordElement({
  keyword,
  displayText,
  onClick,
  onHover,
}: HighlightedKeywordElementProps): React.ReactElement {
  // Check if we're in light mode for color adjustments
  const isLightMode =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme-mode') === 'light';
  const color = getKeywordLinkColor(keyword.linkType, isLightMode);

  const handleClick = useCallback(() => {
    onClick?.(keyword);
  }, [onClick, keyword]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      onHover?.(keyword, { x: e.clientX, y: e.clientY });
    },
    [onHover, keyword]
  );

  const handleMouseLeave = useCallback(() => {
    onHover?.(null, { x: 0, y: 0 });
  }, [onHover]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      onHover?.(keyword, { x: e.clientX, y: e.clientY });
    },
    [onHover, keyword]
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

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      aria-label={`Linked keyword: ${displayText}. ${String(connectionCount)} connection${connectionCount !== 1 ? 's' : ''}.`}
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
      {hasMultipleConnections && (
        <span
          className="inline-flex items-center justify-center text-[10px] font-semibold leading-none rounded-full px-1 py-0.5 ml-0.5"
          style={{
            backgroundColor: `${color}33`,
            color: color,
            border: `1px solid ${color}66`,
            textDecoration: 'none',
            minWidth: '16px',
            height: '14px',
          }}
          aria-hidden="true"
        >
          {connectionCount}
        </span>
      )}
    </span>
  );
}

interface WikiLinkElementProps {
  link: ParsedWikiLink;
  onClick: ((memoryId: string) => void) | undefined;
  onHover: ((link: ParsedWikiLink | null, position: { x: number; y: number }) => void) | undefined;
  highContrast: boolean;
}

function WikiLinkElement({
  link,
  onClick,
  onHover,
  highContrast,
}: WikiLinkElementProps): React.ReactElement {
  // Check if we're in light mode for color adjustments
  const isLightMode =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme-mode') === 'light';
  const color = isLightMode
    ? WIKI_LINK_COLOR_LIGHT
    : highContrast
      ? WIKI_LINK_COLOR_HIGH_CONTRAST
      : WIKI_LINK_COLOR;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClick?.(link.memoryId);
    },
    [onClick, link.memoryId]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      onHover?.(link, { x: e.clientX, y: e.clientY });
    },
    [onHover, link]
  );

  const handleMouseLeave = useCallback(() => {
    onHover?.(null, { x: 0, y: 0 });
  }, [onHover]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      onHover?.(link, { x: e.clientX, y: e.clientY });
    },
    [onHover, link]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.(link.memoryId);
      }
    },
    [onClick, link.memoryId]
  );

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      aria-label={`Wiki link to memory: ${link.displayText}. Press Enter to navigate.`}
      className="cursor-pointer transition-all duration-150 hover:brightness-125 inline-flex items-center gap-1"
      style={{ color }}
      data-testid="wiki-link"
    >
      <svg
        className="w-3 h-3 flex-shrink-0"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6.5 11.5L4 14a2.12 2.12 0 01-3-3l2.5-2.5" />
        <path d="M9.5 4.5L12 2a2.12 2.12 0 013 3l-2.5 2.5" />
        <path d="M6 10l4-4" />
      </svg>
      <span
        className="hover:underline"
        style={{
          textDecorationColor: color,
          textDecorationThickness: '1px',
          textUnderlineOffset: '2px',
        }}
      >
        {link.displayText}
      </span>
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ContentRenderer - Renders memory content with keywords and wiki links.
 *
 * Features:
 * - Highlights linked keywords with type-specific colors
 * - Renders wiki links as clickable elements with link icon
 * - Shows hover preview tooltips for both keywords and wiki links
 * - Handles overlapping segments (wiki links take priority)
 * - Accessible with keyboard navigation
 *
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 41.3, 41.4
 */
export function ContentRenderer({
  content,
  linkedKeywords = [],
  onKeywordClick,
  onWikiLinkClick,
  memoryPreviews,
  highContrast = false,
  className = '',
}: ContentRendererProps): React.ReactElement {
  // State for hover preview
  const [hoveredKeyword, setHoveredKeyword] = useState<LinkedKeyword | null>(null);
  const [hoveredWikiLink, setHoveredWikiLink] = useState<ParsedWikiLink | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Parse wiki links from content
  const wikiLinks = useMemo(() => parseWikiLinks(content), [content]);

  // Merge all segments
  const segments = useMemo(
    () => mergeSegments(content, linkedKeywords, wikiLinks),
    [content, linkedKeywords, wikiLinks]
  );

  // Handle keyword hover
  const handleKeywordHover = useCallback(
    (keyword: LinkedKeyword | null, position: { x: number; y: number }) => {
      setHoveredKeyword(keyword);
      setHoveredWikiLink(null);
      setMousePosition(position);
    },
    []
  );

  // Handle wiki link hover
  const handleWikiLinkHover = useCallback(
    (link: ParsedWikiLink | null, position: { x: number; y: number }) => {
      setHoveredWikiLink(link);
      setHoveredKeyword(null);
      setMousePosition(position);
    },
    []
  );

  // Get memory previews for tooltip
  const connectedMemoryPreviews = useMemo(() => {
    if (!memoryPreviews) return [];

    if (hoveredKeyword) {
      const previews: MemoryPreview[] = [];
      for (const memoryId of hoveredKeyword.linkedMemoryIds) {
        const preview = memoryPreviews.get(memoryId);
        if (preview) previews.push(preview);
      }
      return previews;
    }

    if (hoveredWikiLink) {
      const preview = memoryPreviews.get(hoveredWikiLink.memoryId);
      return preview ? [preview] : [];
    }

    return [];
  }, [memoryPreviews, hoveredKeyword, hoveredWikiLink]);

  // Determine tooltip visibility and content
  const isTooltipVisible =
    (hoveredKeyword !== null || hoveredWikiLink !== null) && connectedMemoryPreviews.length > 0;
  const tooltipText = hoveredKeyword?.text ?? hoveredWikiLink?.displayText ?? '';
  const tooltipLinkType: LinkType = hoveredKeyword?.linkType ?? 'semantic';

  return (
    <>
      <span className={className}>
        {segments.map((segment, index) => {
          if (segment.type === 'text') {
            return <span key={`text-${String(index)}`}>{segment.content}</span>;
          }

          if (segment.type === 'keyword' && segment.keyword) {
            return (
              <HighlightedKeywordElement
                key={`keyword-${String(segment.startIndex)}`}
                keyword={segment.keyword}
                displayText={segment.content}
                onClick={onKeywordClick}
                onHover={handleKeywordHover}
              />
            );
          }

          if (segment.type === 'wikilink' && segment.wikiLink) {
            return (
              <WikiLinkElement
                key={`wikilink-${String(segment.startIndex)}`}
                link={segment.wikiLink}
                onClick={onWikiLinkClick}
                onHover={handleWikiLinkHover}
                highContrast={highContrast}
              />
            );
          }

          return <span key={`unknown-${String(index)}`}>{segment.content}</span>;
        })}
      </span>

      {/* Hover preview tooltip */}
      {memoryPreviews && (
        <KeywordHoverPreview
          isVisible={isTooltipVisible}
          keywordText={tooltipText}
          linkType={tooltipLinkType}
          connectedMemories={connectedMemoryPreviews}
          position={mousePosition}
          highContrast={highContrast}
        />
      )}
    </>
  );
}

export default ContentRenderer;
