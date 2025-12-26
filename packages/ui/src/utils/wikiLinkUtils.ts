import { getDefaultClient } from "../api/client";
import type { LinkType, Memory } from "../types/api";

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

export interface CreateWaypointLinkOptions {
  /** Source memory ID */
  sourceMemoryId: string;
  /** Target memory ID */
  targetMemoryId: string;
  /** User ID for API authentication */
  userId: string;
  /** Link type (default: 'semantic') */
  linkType?: LinkType;
}

export interface CreateWaypointLinkResult {
  /** Whether the link was created successfully */
  success: boolean;
  /** Error message if creation failed */
  error?: string;
  /** Source memory ID */
  sourceId: string;
  /** Target memory ID */
  targetId: string;
  /** Link type used */
  linkType: LinkType;
}

export interface ContentSegment {
  type: "text" | "wikilink";
  content: string;
  link?: ParsedWikiLink;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Regex pattern to match wiki links: [[memory-id|display text]] or [[memory-id]]
 * Captures: group 1 = memory-id, group 2 = display text (optional)
 */
const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect [[ pattern in text and extract the search query
 * Returns null if no [[ pattern is found, or the query text after [[
 */
export function detectWikiLinkPattern(
  text: string,
  cursorPosition: number
): { query: string; startIndex: number } | null {
  // Look backwards from cursor to find [[
  const textBeforeCursor = text.substring(0, cursorPosition);
  const lastOpenBrackets = textBeforeCursor.lastIndexOf("[[");

  if (lastOpenBrackets === -1) {
    return null;
  }

  // Check if there's a closing ]] between [[ and cursor
  const textBetween = textBeforeCursor.substring(lastOpenBrackets + 2);
  if (textBetween.includes("]]")) {
    return null;
  }

  // Extract the query (text after [[)
  const query = textBetween;

  return {
    query,
    startIndex: lastOpenBrackets,
  };
}

/**
 * Extract title from memory content (first line or first 50 characters)
 *
 * Requirements: 41.5
 */
export function extractTitle(content: string): string {
  const lines = content.split("\n");
  const firstLine = (lines[0] ?? "").trim();
  if (firstLine.length <= 50) {
    return firstLine;
  }
  return firstLine.substring(0, 50).trim();
}

/**
 * Calculate match score for a memory against a search query.
 */
export function calculateMatchScore(memory: Memory, query: string): number {
  const lowerQuery = query.toLowerCase().trim();
  if (lowerQuery.length === 0) {
    // When no query, score by recency (more recent = higher score)
    const createdTime = new Date(memory.createdAt).getTime();
    const now = Date.now();
    const ageInDays = (now - createdTime) / (1000 * 60 * 60 * 24);
    // Score from 100 (today) to 0 (365+ days old)
    return Math.max(0, 100 - ageInDays / 3.65);
  }

  let score = 0;
  const lowerContent = memory.content.toLowerCase();
  const title = extractTitle(memory.content).toLowerCase();

  // Title matching (highest priority)
  if (title === lowerQuery) {
    score += 100; // Exact title match
  } else if (title.startsWith(lowerQuery)) {
    score += 80; // Title starts with query
  } else if (title.includes(lowerQuery)) {
    score += 60; // Title contains query
  }

  // Content matching
  if (lowerContent.startsWith(lowerQuery)) {
    score += 50; // Content starts with query
  } else if (lowerContent.includes(lowerQuery)) {
    score += 30; // Content contains query
  }

  // Keywords matching
  if (memory.metadata.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery)) === true) {
    score += 20;
  }

  // Tags matching
  if (memory.metadata.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) === true) {
    score += 15;
  }

  // Category matching
  if (memory.metadata.category?.toLowerCase().includes(lowerQuery) === true) {
    score += 10;
  }

  return score;
}

/**
 * Filter and rank memories by search query in real-time.
 */
export function filterMemoriesByQuery(memories: Memory[], query: string): Memory[] {
  const trimmedQuery = query.trim();

  // Score all memories
  const scoredMemories = memories.map((memory) => ({
    memory,
    score: calculateMatchScore(memory, trimmedQuery),
  }));

  // Filter out zero-score memories (no match) when there's a query
  const filtered =
    trimmedQuery.length === 0 ? scoredMemories : scoredMemories.filter((item) => item.score > 0);

  // Sort by score (highest first)
  filtered.sort((a, b) => b.score - a.score);

  // Return just the memories
  return filtered.map((item) => item.memory);
}

/**
 * Get a preview of memory content (first 60 characters)
 */
export function getContentPreview(content: string, maxLength: number = 60): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength).trim() + "...";
}

/**
 * Create a waypoint connection between two memories.
 */
export async function createWaypointLink(
  options: CreateWaypointLinkOptions
): Promise<CreateWaypointLinkResult> {
  const { sourceMemoryId, targetMemoryId, userId, linkType = "semantic" } = options;

  // Validate inputs
  if (!sourceMemoryId || !targetMemoryId) {
    return {
      success: false,
      error: "Source and target memory IDs are required",
      sourceId: sourceMemoryId,
      targetId: targetMemoryId,
      linkType,
    };
  }

  if (sourceMemoryId === targetMemoryId) {
    return {
      success: false,
      error: "Cannot create a link from a memory to itself",
      sourceId: sourceMemoryId,
      targetId: targetMemoryId,
      linkType,
    };
  }

  try {
    const client = getDefaultClient();

    // Update the source memory to trigger waypoint link creation
    await client.updateMemory({
      memoryId: sourceMemoryId,
      userId,
      metadata: {
        keywords: [`linked:${targetMemoryId}`, `linktype:${linkType}`],
      },
    });

    return {
      success: true,
      sourceId: sourceMemoryId,
      targetId: targetMemoryId,
      linkType,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create waypoint link";
    console.error("Failed to create waypoint link:", error);

    return {
      success: false,
      error: errorMessage,
      sourceId: sourceMemoryId,
      targetId: targetMemoryId,
      linkType,
    };
  }
}

/**
 * Insert a wiki link reference into text and optionally create a waypoint connection.
 */
export async function insertWikiLinkWithWaypoint(
  text: string,
  startIndex: number,
  cursorPosition: number,
  memory: Memory,
  options?: {
    sourceMemoryId?: string;
    userId?: string;
    createWaypoint?: boolean;
    linkType?: LinkType;
  }
): Promise<{
  newText: string;
  linkText: string;
  newCursorPosition: number;
  waypointResult?: CreateWaypointLinkResult;
}> {
  // Create the link text: [[memory-id|preview]]
  const preview = getContentPreview(memory.content, 30);
  const linkText = `[[${memory.id}|${preview}]]`;

  // Replace the [[ and query with the full link
  const beforeLink = text.substring(0, startIndex);
  const afterLink = text.substring(cursorPosition);
  const newText = beforeLink + linkText + afterLink;
  const newCursorPosition = startIndex + linkText.length;

  // Create waypoint connection if requested
  if (
    options?.createWaypoint === true &&
    options.sourceMemoryId !== undefined &&
    options.sourceMemoryId !== "" &&
    options.userId !== undefined &&
    options.userId !== ""
  ) {
    const waypointOptions: CreateWaypointLinkOptions = {
      sourceMemoryId: options.sourceMemoryId,
      targetMemoryId: memory.id,
      userId: options.userId,
    };

    // Only add linkType if it's defined
    if (options.linkType !== undefined) {
      waypointOptions.linkType = options.linkType;
    }

    const waypointResult = await createWaypointLink(waypointOptions);

    return {
      newText,
      linkText,
      newCursorPosition,
      waypointResult,
    };
  }

  return {
    newText,
    linkText,
    newCursorPosition,
  };
}

/**
 * Parses content for wiki link patterns and returns an array of parsed links.
 */
export function parseWikiLinks(content: string): ParsedWikiLink[] {
  const links: ParsedWikiLink[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  WIKI_LINK_PATTERN.lastIndex = 0;

  while ((match = WIKI_LINK_PATTERN.exec(content)) !== null) {
    const fullMatch = match[0];
    const memoryId = match[1]?.trim() ?? "";
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

/**
 * Parses content into segments of plain text and wiki links.
 */
export function parseContentWithWikiLinks(
  content: string,
  links: ParsedWikiLink[]
): ContentSegment[] {
  if (links.length === 0) {
    return [{ type: "text", content }];
  }

  const segments: ContentSegment[] = [];
  let currentIndex = 0;

  for (const link of links) {
    // Add text before the link
    if (link.startIndex > currentIndex) {
      segments.push({
        type: "text",
        content: content.slice(currentIndex, link.startIndex),
      });
    }

    // Add the wiki link segment
    segments.push({
      type: "wikilink",
      content: link.displayText,
      link,
    });

    currentIndex = link.endIndex;
  }

  // Add remaining text after the last link
  if (currentIndex < content.length) {
    segments.push({
      type: "text",
      content: content.slice(currentIndex),
    });
  }

  return segments;
}
