/**
 * WikiLinkRenderer Component
 *
 * Renders wiki-style [[link]] syntax as clickable elements.
 * Parses content for [[memory-id|preview]] patterns and renders them
 * as styled clickable links that navigate to the linked memory.
 *
 * Requirements: 41.3, 41.4
 */

import { useCallback, useMemo, useState } from 'react';
import type { MemoryPreview } from './KeywordHoverPreview';
import { KeywordHoverPreview } from './KeywordHoverPreview';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a parsed wiki link from content.
 */
export interface ParsedWikiLink {
  /** The full match including [[ and ]] */
  fullMatch: string;
  /** The memory ID */
  memoryId: string;
  /** The display text (preview) */
  displayText: string;
  /** Start index in the content string */
  startIndex: number;
  /** End index in the content string (exclusive) */
  endIndex: number;
}

export interface WikiLinkRendererProps {
  /** The content to parse and render */
  content: string;
  /** Callback when a wiki link is clicked - receives the memory ID */
  onLinkClick?: (memoryId: string) => void;
  /** Callback when a wiki link is hovered */
  onLinkHover?: (link: ParsedWikiLink | null) => void;
  /** Additional CSS classes */
  className?: string;
  /** Map of memory IDs to memory previews for hover tooltip */
  memoryPreviews?: Map<string, MemoryPreview> | undefined;
  /** Whether to use high contrast colors */
  highContrast?: boolean | undefined;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Regex pattern to match wiki links: [[memory-id|display text]] or [[memory-id]]
 * Captures: group 1 = memory-id, group 2 = display text (optional)
 */
const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Default color for wiki links (cyan to match semantic links)
 */
const WIKI_LINK_COLOR = '#00FFFF';

/**
 * High contrast color for wiki links
 */
const WIKI_LINK_COLOR_HIGH_CONTRAST = '#00E5E5';

/**
 * Light mode color for wiki links (darker for visibility)
 */
const WIKI_LINK_COLOR_LIGHT = '#0066CC';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parses content for wiki link patterns and returns an array of parsed links.
 *
 * Supports two formats:
 * - [[memory-id|display text]] - Full format with custom display text
 * - [[memory-id]] - Short format, uses memory ID as display text
 *
 * @param content - The content string to parse
 * @returns Array of parsed wiki links
 */
export function parseWikiLinks(content: string): ParsedWikiLink[] {
  const links: ParsedWikiLink[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  WIKI_LINK_PATTERN.lastIndex = 0;

  while ((match = WIKI_LINK_PATTERN.exec(content)) !== null) {
    const fullMatch = match[0];
    const memoryId = match[1]?.trim() ?? '';
    const displayText = match[2]?.trim() ?? memoryId;

    // Skip invalid links (empty memory ID)
    if (memoryId.length === 0) {
      continue;
    }

    links.push({
      fullMatch,
      memoryId,
      displayText,
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
    });
  }

  return links;
}

// ============================================================================
// Helper Types
// ============================================================================

interface ContentSegment {
  type: 'text' | 'wikilink';
  content: string;
  link?: ParsedWikiLink;
}

/**
 * Parses content into segments of plain text and wiki links.
 *
 * @param content - The full content string
 * @param links - Array of parsed wiki links
 * @returns Array of content segments
 */
export function parseContentWithWikiLinks(
  content: string,
  links: ParsedWikiLink[]
): ContentSegment[] {
  if (links.length === 0) {
    return [{ type: 'text', content }];
  }

  const segments: ContentSegment[] = [];
  let currentIndex = 0;

  for (const link of links) {
    // Add text before the link
    if (link.startIndex > currentIndex) {
      segments.push({
        type: 'text',
        content: content.slice(currentIndex, link.startIndex),
      });
    }

    // Add the wiki link segment
    segments.push({
      type: 'wikilink',
      content: link.displayText,
      link,
    });

    currentIndex = link.endIndex;
  }

  // Add remaining text after the last link
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

interface WikiLinkElementProps {
  link: ParsedWikiLink;
  onClick: ((memoryId: string) => void) | undefined;
  onHover: ((link: ParsedWikiLink | null) => void) | undefined;
  onMouseMove: ((link: ParsedWikiLink, position: { x: number; y: number }) => void) | undefined;
  highContrast: boolean;
}

/**
 * Renders a single wiki link as a clickable element.
 * Requirements: 41.3, 41.4
 */
function WikiLinkElement({
  link,
  onClick,
  onHover,
  onMouseMove,
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

  const handleMouseEnter = useCallback(() => {
    onHover?.(link);
  }, [onHover, link]);

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      onMouseMove?.(link, { x: e.clientX, y: e.clientY });
    },
    [onMouseMove, link]
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

  const ariaLabel = `Wiki link to memory: ${link.displayText}. Press Enter to navigate.`;

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
      className="cursor-pointer transition-all duration-150 hover:brightness-125 inline-flex items-center gap-1"
      style={{
        color,
        textDecoration: 'none',
      }}
      data-testid="wiki-link"
    >
      {/* Link icon */}
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
      {/* Link text with underline on hover */}
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
 * WikiLinkRenderer - Renders wiki-style [[link]] syntax as clickable elements.
 *
 * Features:
 * - Parses content for [[memory-id|preview]] patterns
 * - Renders links as styled clickable elements with link icon
 * - Supports click to navigate to linked memory
 * - Shows hover preview tooltip with memory details
 * - Accessible with keyboard navigation
 *
 * Requirements: 41.3, 41.4
 */
export function WikiLinkRenderer({
  content,
  onLinkClick,
  onLinkHover,
  className = '',
  memoryPreviews,
  highContrast = false,
}: WikiLinkRendererProps): React.ReactElement {
  // State for hover preview tooltip
  const [hoveredLink, setHoveredLink] = useState<ParsedWikiLink | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Parse wiki links from content
  const parsedLinks = useMemo(() => parseWikiLinks(content), [content]);

  // Parse content into segments
  const segments = useMemo(
    () => parseContentWithWikiLinks(content, parsedLinks),
    [content, parsedLinks]
  );

  // Handle link hover with external callback
  const handleLinkHover = useCallback(
    (link: ParsedWikiLink | null) => {
      setHoveredLink(link);
      onLinkHover?.(link);
    },
    [onLinkHover]
  );

  // Handle mouse move to track position for tooltip
  const handleMouseMove = useCallback(
    (_link: ParsedWikiLink, position: { x: number; y: number }) => {
      setMousePosition(position);
    },
    []
  );

  // Get memory preview for the hovered link
  const hoveredMemoryPreview = useMemo(() => {
    if (!hoveredLink || !memoryPreviews) {
      return null;
    }
    return memoryPreviews.get(hoveredLink.memoryId) ?? null;
  }, [hoveredLink, memoryPreviews]);

  // Create array of previews for KeywordHoverPreview component
  const connectedMemoryPreviews = useMemo(() => {
    if (!hoveredMemoryPreview) {
      return [];
    }
    return [hoveredMemoryPreview];
  }, [hoveredMemoryPreview]);

  return (
    <>
      <span className={className}>
        {segments.map((segment, index) => {
          if (segment.type === 'text') {
            return <span key={`text-${String(index)}`}>{segment.content}</span>;
          }

          // Wiki link segment
          const link = segment.link;
          if (!link) {
            return <span key={`text-${String(index)}`}>{segment.content}</span>;
          }

          return (
            <WikiLinkElement
              key={`wikilink-${String(link.startIndex)}-${String(link.endIndex)}`}
              link={link}
              onClick={onLinkClick}
              onHover={handleLinkHover}
              onMouseMove={handleMouseMove}
              highContrast={highContrast}
            />
          );
        })}
      </span>

      {/* Hover preview tooltip */}
      {memoryPreviews && (
        <KeywordHoverPreview
          isVisible={hoveredLink !== null && connectedMemoryPreviews.length > 0}
          keywordText={hoveredLink?.displayText ?? ''}
          linkType="semantic"
          connectedMemories={connectedMemoryPreviews}
          position={mousePosition}
          highContrast={highContrast}
        />
      )}
    </>
  );
}

export default WikiLinkRenderer;
