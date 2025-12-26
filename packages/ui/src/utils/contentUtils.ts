import type { LinkedKeyword } from "./highlightUtils";
import type { ParsedWikiLink } from "./wikiLinkUtils";

// ============================================================================
// Types
// ============================================================================

export type ContentSegmentType = "text" | "keyword" | "wikilink";

export interface RendererContentSegment {
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
 * Sanitizes content to fix common markdown rendering issues.
 *
 * Specifically handles:
 * 1. Lines wrapped in backticks that aren't actual code - removes the backticks
 *    to prevent awkward inline code rendering across multiple lines
 */
export function sanitizeContent(content: string): string {
  if (!content) return "";

  return content
    .split("\n")
    .map((line) => {
      // Check if line is wrapped in backticks but doesn't look like a code block definition
      // (starts with ` and ends with ` but not ```)
      const trimmed = line.trim();
      if (
        trimmed.length > 2 &&
        trimmed.startsWith("`") &&
        trimmed.endsWith("`") &&
        !trimmed.startsWith("```")
      ) {
        // Check if it's likely just emphasis/highlighting rather than code
        // If it contains spaces, multiple words, or colon-like structure (Title: Value), treatment as text is safer
        if (trimmed.includes(" ") || trimmed.includes(":")) {
          // Remove start and end backticks
          return trimmed.substring(1, trimmed.length - 1);
        }
      }
      return line;
    })
    .join("\n");
}

/**
 * Merges keyword segments and wiki link segments into a single sorted array.
 * Handles overlapping segments by prioritizing wiki links (they are explicit user-created links).
 */
export function mergeSegments(
  content: string,
  keywords: LinkedKeyword[],
  wikiLinks: ParsedWikiLink[]
): RendererContentSegment[] {
  // Create segments from keywords
  const keywordSegments: RendererContentSegment[] = keywords.map((kw) => ({
    type: "keyword",
    content: content.slice(kw.startIndex, kw.endIndex),
    startIndex: kw.startIndex,
    endIndex: kw.endIndex,
    keyword: kw,
  }));

  // Create segments from wiki links
  const wikiLinkSegments: RendererContentSegment[] = wikiLinks.map((link) => ({
    type: "wikilink",
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
  const nonOverlapping: RendererContentSegment[] = [];
  let lastEndIndex = 0;

  for (const segment of allSegments) {
    // Skip if this segment overlaps with a previous one
    if (segment.startIndex < lastEndIndex) {
      // If this is a wiki link and the previous was a keyword, replace it
      if (segment.type === "wikilink" && nonOverlapping.length > 0) {
        const lastSegment = nonOverlapping[nonOverlapping.length - 1];
        if (
          lastSegment &&
          lastSegment.type === "keyword" &&
          lastSegment.endIndex > segment.startIndex
        ) {
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
  const finalSegments: RendererContentSegment[] = [];
  let currentIndex = 0;

  for (const segment of nonOverlapping) {
    // Add text before this segment
    if (segment.startIndex > currentIndex) {
      finalSegments.push({
        type: "text",
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
      type: "text",
      content: content.slice(currentIndex),
      startIndex: currentIndex,
      endIndex: content.length,
    });
  }

  return finalSegments;
}
