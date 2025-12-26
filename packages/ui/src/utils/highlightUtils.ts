import type { LinkType } from "../types/api";

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

// ============================================================================
// Constants
// ============================================================================

/**
 * Color mapping for link types (dark mode).
 * Requirements: 40.4 - cyan for semantic, orange for causal
 */
export const KEYWORD_LINK_COLORS: Record<LinkType, string> = {
  semantic: "#00FFFF", // Cyan
  causal: "#FF8800", // Orange
  temporal: "#00FF88", // Green
  analogical: "#8800FF", // Purple
};

/**
 * Color mapping for link types (light mode - bold, saturated for visibility).
 */
export const KEYWORD_LINK_COLORS_LIGHT: Record<LinkType, string> = {
  semantic: "#0077B6", // Bold blue
  causal: "#D62828", // Bold red-orange
  temporal: "#2D6A4F", // Bold green
  analogical: "#7B2CBF", // Bold purple
};

// ============================================================================
// Helper Functions
// ============================================================================

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

export interface ContentSegment {
  type: "text" | "keyword";
  content: string;
  keyword?: LinkedKeyword;
}

/**
 * Parses content into segments of plain text and highlighted keywords.
 * Handles overlapping keywords by using the first one encountered.
 */
export function parseContentWithKeywords(
  content: string,
  keywords: LinkedKeyword[]
): ContentSegment[] {
  if (keywords.length === 0) {
    return [{ type: "text", content }];
  }

  // Sort keywords by start index
  const sortedKeywords = [...keywords].sort((a, b) => a.startIndex - b.startIndex);

  const segments: ContentSegment[] = [];
  let currentIndex = 0;

  for (const keyword of sortedKeywords) {
    // Skip if this keyword overlaps with current position
    // (Simple strategy: first keyword wins)
    if (keyword.startIndex < currentIndex) {
      continue;
    }

    // Verify text matches (case-insensitive) to ensure we're highlighting the correct word
    // (Requirement: 40.1 - accurate keyword identification)
    const contentSlice = content.slice(keyword.startIndex, keyword.endIndex);
    if (contentSlice.toLowerCase() !== keyword.text.toLowerCase()) {
      continue;
    }

    // Add text before keyword
    if (keyword.startIndex > currentIndex) {
      segments.push({
        type: "text",
        content: content.slice(currentIndex, keyword.startIndex),
      });
    }

    // Add keyword
    segments.push({
      type: "keyword",
      content: content.slice(keyword.startIndex, keyword.endIndex),
      keyword,
    });

    currentIndex = keyword.endIndex;
  }

  // Add remaining text
  if (currentIndex < content.length) {
    segments.push({
      type: "text",
      content: content.slice(currentIndex),
    });
  }

  return segments;
}
