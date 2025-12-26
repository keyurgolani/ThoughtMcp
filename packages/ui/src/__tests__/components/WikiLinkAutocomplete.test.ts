/**
 * WikiLinkAutocomplete Component Tests
 *
 * Tests for the wiki-style [[ link autocomplete functionality.
 * Includes tests for link insertion and waypoint connection creation.
 *
 * Requirements: 41.1, 41.2
 */

import { describe, expect, it, vi } from "vitest";
import type { Memory } from "../../types/api";

// Mock the API client module before importing the component
vi.mock("../../api/client", () => ({
  getDefaultClient: vi.fn(() => ({
    updateMemory: vi.fn().mockResolvedValue({
      memoryId: "source-mem",
      embeddingsRegenerated: false,
      connectionsUpdated: true,
      processingTimeMs: 50,
    }),
  })),
}));

// Import functions after mocking
import {
  calculateMatchScore,
  createWaypointLink,
  detectWikiLinkPattern,
  extractTitle,
  filterMemoriesByQuery,
  insertWikiLinkWithWaypoint,
} from "../../utils/wikiLinkUtils";

// ============================================================================
// Test Data
// ============================================================================

const createMockMemory = (
  id: string,
  content: string,
  metadata: Partial<Memory["metadata"]> = {}
): Memory => ({
  id,
  content,
  createdAt: "2024-01-01T00:00:00Z",
  lastAccessed: "2024-01-01T00:00:00Z",
  accessCount: 1,
  salience: 0.5,
  strength: 0.5,
  userId: "test-user",
  sessionId: "test-session",
  primarySector: "semantic",
  metadata: {
    keywords: [],
    tags: [],
    ...metadata,
  },
});

const mockMemories: Memory[] = [
  createMockMemory("mem-1", "Introduction to machine learning", {
    keywords: ["ML", "AI"],
    tags: ["tech", "learning"],
    category: "education",
  }),
  createMockMemory("mem-2", "React component patterns", {
    keywords: ["React", "patterns"],
    tags: ["frontend", "development"],
    category: "programming",
  }),
  createMockMemory("mem-3", "Database optimization techniques", {
    keywords: ["SQL", "performance"],
    tags: ["backend", "database"],
    category: "programming",
  }),
  createMockMemory("mem-4", "Project management best practices", {
    keywords: ["agile", "scrum"],
    tags: ["management"],
    category: "business",
  }),
  createMockMemory("mem-5", "Learning TypeScript fundamentals", {
    keywords: ["TypeScript", "JavaScript"],
    tags: ["frontend", "learning"],
    category: "programming",
  }),
];

// ============================================================================
// detectWikiLinkPattern Tests
// ============================================================================

describe("detectWikiLinkPattern", () => {
  it("should detect [[ at cursor position", () => {
    const result = detectWikiLinkPattern("Hello [[", 8);
    expect(result).not.toBeNull();
    expect(result?.query).toBe("");
    expect(result?.startIndex).toBe(6);
  });

  it("should extract query text after [[", () => {
    const result = detectWikiLinkPattern("Hello [[machine", 15);
    expect(result).not.toBeNull();
    expect(result?.query).toBe("machine");
    expect(result?.startIndex).toBe(6);
  });

  it("should return null when no [[ is present", () => {
    const result = detectWikiLinkPattern("Hello world", 11);
    expect(result).toBeNull();
  });

  it("should return null when [[ is closed with ]]", () => {
    const result = detectWikiLinkPattern("Hello [[link]] world", 20);
    expect(result).toBeNull();
  });

  it("should detect [[ even with text before it", () => {
    const result = detectWikiLinkPattern("Some text before [[query", 24);
    expect(result).not.toBeNull();
    expect(result?.query).toBe("query");
    expect(result?.startIndex).toBe(17);
  });

  it("should handle multiple [[ and return the last unclosed one", () => {
    const result = detectWikiLinkPattern("[[first]] and [[second", 22);
    expect(result).not.toBeNull();
    expect(result?.query).toBe("second");
    expect(result?.startIndex).toBe(14);
  });

  it("should handle cursor in the middle of text", () => {
    const result = detectWikiLinkPattern("Hello [[mac world", 11);
    expect(result).not.toBeNull();
    expect(result?.query).toBe("mac");
  });

  it("should return null when cursor is before [[", () => {
    const result = detectWikiLinkPattern("Hello [[machine", 5);
    expect(result).toBeNull();
  });

  it("should handle empty string", () => {
    const result = detectWikiLinkPattern("", 0);
    expect(result).toBeNull();
  });

  it("should handle [[ at the start of text", () => {
    const result = detectWikiLinkPattern("[[query", 7);
    expect(result).not.toBeNull();
    expect(result?.query).toBe("query");
    expect(result?.startIndex).toBe(0);
  });
});

// ============================================================================
// extractTitle Tests
// ============================================================================

describe("extractTitle", () => {
  it("should return first line of content", () => {
    const result = extractTitle("First line\nSecond line\nThird line");
    expect(result).toBe("First line");
  });

  it("should return full content if no newlines and under 50 chars", () => {
    const result = extractTitle("Short content");
    expect(result).toBe("Short content");
  });

  it("should truncate to 50 characters if first line is too long", () => {
    const longLine =
      "This is a very long first line that exceeds fifty characters and should be truncated";
    const result = extractTitle(longLine);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result).toBe("This is a very long first line that exceeds fifty");
  });

  it("should trim whitespace from result", () => {
    const result = extractTitle("  Padded content  \nSecond line");
    expect(result).toBe("Padded content");
  });

  it("should handle empty content", () => {
    const result = extractTitle("");
    expect(result).toBe("");
  });

  it("should handle content with only newlines", () => {
    const result = extractTitle("\n\n\n");
    expect(result).toBe("");
  });
});

// ============================================================================
// calculateMatchScore Tests
// ============================================================================

describe("calculateMatchScore", () => {
  const createTestMemory = (content: string, metadata: Partial<Memory["metadata"]> = {}): Memory =>
    createMockMemory("test-mem", content, metadata);

  it("should return high score for exact title match", () => {
    const memory = createTestMemory("React patterns");
    const score = calculateMatchScore(memory, "React patterns");
    expect(score).toBeGreaterThanOrEqual(100); // Exact title match = 100 points
  });

  it("should return high score for title starts with query", () => {
    const memory = createTestMemory("React patterns for beginners");
    const score = calculateMatchScore(memory, "React");
    expect(score).toBeGreaterThanOrEqual(80); // Title starts with = 80 points
  });

  it("should return medium score for title contains query", () => {
    const memory = createTestMemory("Advanced React patterns");
    const score = calculateMatchScore(memory, "React");
    expect(score).toBeGreaterThanOrEqual(60); // Title contains = 60 points
  });

  it("should return score for content match", () => {
    const memory = createTestMemory("First line\nThis content mentions React somewhere");
    const score = calculateMatchScore(memory, "React");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(60); // Content match is lower than title match
  });

  it("should return score for keyword match", () => {
    const memory = createTestMemory("Some content", { keywords: ["React", "TypeScript"] });
    const score = calculateMatchScore(memory, "React");
    expect(score).toBe(20); // Keywords match = 20 points
  });

  it("should return score for tag match", () => {
    const memory = createTestMemory("Some content", { tags: ["frontend", "react"] });
    const score = calculateMatchScore(memory, "react");
    expect(score).toBe(15); // Tags match = 15 points
  });

  it("should return score for category match", () => {
    const memory = createTestMemory("Some content", { category: "programming" });
    const score = calculateMatchScore(memory, "programming");
    expect(score).toBe(10); // Category match = 10 points
  });

  it("should accumulate scores from multiple matches", () => {
    const memory = createTestMemory("React patterns", {
      keywords: ["React"],
      tags: ["react"],
    });
    const score = calculateMatchScore(memory, "React");
    // Title starts with (80) + keywords (20) + tags (15) = 115
    expect(score).toBeGreaterThanOrEqual(115);
  });

  it("should be case-insensitive", () => {
    const memory = createTestMemory("REACT PATTERNS");
    const score = calculateMatchScore(memory, "react");
    expect(score).toBeGreaterThanOrEqual(80); // Title starts with
  });

  it("should return zero for no match", () => {
    const memory = createTestMemory("Some content about databases");
    const score = calculateMatchScore(memory, "react");
    expect(score).toBe(0);
  });

  it("should return recency-based score for empty query", () => {
    // Create a memory with a recent date
    const recentMemory: Memory = {
      ...createTestMemory("Some content"),
      createdAt: new Date().toISOString(), // Today's date
    };
    const score = calculateMatchScore(recentMemory, "");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// filterMemoriesByQuery Tests
// ============================================================================

describe("filterMemoriesByQuery", () => {
  it("should return all memories for empty query (sorted by recency)", () => {
    const result = filterMemoriesByQuery(mockMemories, "");
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result.length).toBe(mockMemories.length);
  });

  it("should filter by content match", () => {
    const result = filterMemoriesByQuery(mockMemories, "machine");
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("mem-1");
  });

  it("should be case-insensitive", () => {
    const result = filterMemoriesByQuery(mockMemories, "MACHINE");
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("mem-1");
  });

  it("should filter by keyword match", () => {
    const result = filterMemoriesByQuery(mockMemories, "React");
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("mem-2");
  });

  it("should filter by tag match", () => {
    const result = filterMemoriesByQuery(mockMemories, "frontend");
    expect(result.length).toBe(2);
    expect(result.map((m) => m.id)).toContain("mem-2");
    expect(result.map((m) => m.id)).toContain("mem-5");
  });

  it("should filter by category match", () => {
    const result = filterMemoriesByQuery(mockMemories, "programming");
    expect(result.length).toBe(3);
  });

  it("should return empty array when no matches", () => {
    const result = filterMemoriesByQuery(mockMemories, "nonexistent");
    expect(result.length).toBe(0);
  });

  it("should handle partial matches", () => {
    const result = filterMemoriesByQuery(mockMemories, "learn");
    expect(result.length).toBe(2);
    expect(result.map((m) => m.id)).toContain("mem-1");
    expect(result.map((m) => m.id)).toContain("mem-5");
  });

  it("should trim whitespace from query", () => {
    const result = filterMemoriesByQuery(mockMemories, "  machine  ");
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("mem-1");
  });

  it("should handle memories with empty metadata", () => {
    const memoriesWithEmptyMetadata = [createMockMemory("mem-empty", "Test content", {})];
    const result = filterMemoriesByQuery(memoriesWithEmptyMetadata, "Test");
    expect(result.length).toBe(1);
  });

  it("should handle memories with undefined metadata arrays", () => {
    const memoriesWithUndefined: Memory[] = [
      {
        ...createMockMemory("mem-undef", "Test content", {}),
        metadata: {},
      },
    ];
    const result = filterMemoriesByQuery(memoriesWithUndefined, "Test");
    expect(result.length).toBe(1);
  });

  it("should prioritize title matches over content matches", () => {
    const memoriesWithTitles = [
      createMockMemory("mem-title", "React patterns for beginners", {}),
      createMockMemory("mem-content", "This article discusses various React patterns", {}),
    ];
    const result = filterMemoriesByQuery(memoriesWithTitles, "React");
    expect(result.length).toBe(2);
    // Title starts with "React" should be first
    expect(result[0]?.id).toBe("mem-title");
  });

  it("should sort results by match score (best matches first)", () => {
    const memoriesForScoring = [
      createMockMemory("mem-low", "Some content about databases", {
        tags: ["programming"],
      }),
      createMockMemory("mem-high", "Programming best practices", {
        category: "programming",
      }),
    ];
    const result = filterMemoriesByQuery(memoriesForScoring, "programming");
    expect(result.length).toBe(2);
    // "Programming" in title should score higher than just in tags/category
    expect(result[0]?.id).toBe("mem-high");
  });
});

// ============================================================================
// createWaypointLink Tests
// ============================================================================

describe("createWaypointLink", () => {
  it("should return error when source memory ID is missing", async () => {
    const result = await createWaypointLink({
      sourceMemoryId: "",
      targetMemoryId: "target-mem",
      userId: "user-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Source and target memory IDs are required");
  });

  it("should return error when target memory ID is missing", async () => {
    const result = await createWaypointLink({
      sourceMemoryId: "source-mem",
      targetMemoryId: "",
      userId: "user-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Source and target memory IDs are required");
  });

  it("should return error when trying to link memory to itself", async () => {
    const result = await createWaypointLink({
      sourceMemoryId: "same-mem",
      targetMemoryId: "same-mem",
      userId: "user-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot create a link from a memory to itself");
  });

  it("should use semantic as default link type", async () => {
    const result = await createWaypointLink({
      sourceMemoryId: "source-mem",
      targetMemoryId: "target-mem",
      userId: "user-1",
    });

    expect(result.linkType).toBe("semantic");
  });

  it("should use provided link type", async () => {
    const result = await createWaypointLink({
      sourceMemoryId: "source-mem",
      targetMemoryId: "target-mem",
      userId: "user-1",
      linkType: "causal",
    });

    expect(result.linkType).toBe("causal");
  });

  it("should return source and target IDs in result", async () => {
    const result = await createWaypointLink({
      sourceMemoryId: "source-mem",
      targetMemoryId: "target-mem",
      userId: "user-1",
    });

    expect(result.sourceId).toBe("source-mem");
    expect(result.targetId).toBe("target-mem");
  });
});

// ============================================================================
// insertWikiLinkWithWaypoint Tests
// ============================================================================

describe("insertWikiLinkWithWaypoint", () => {
  const testMemory: Memory = {
    id: "mem-123",
    content: "This is a test memory with some content",
    createdAt: "2024-01-01T00:00:00Z",
    lastAccessed: "2024-01-01T00:00:00Z",
    accessCount: 1,
    salience: 0.5,
    strength: 0.5,
    userId: "test-user",
    sessionId: "test-session",
    primarySector: "semantic",
    metadata: {
      keywords: [],
      tags: [],
    },
  };

  it("should insert link text at correct position", async () => {
    const result = await insertWikiLinkWithWaypoint("Hello [[", 6, 8, testMemory);

    expect(result.newText).toContain("[[mem-123|");
    expect(result.newText).toContain("]]");
    expect(result.newText.startsWith("Hello ")).toBe(true);
  });

  it("should return correct link text format", async () => {
    const result = await insertWikiLinkWithWaypoint("Hello [[", 6, 8, testMemory);

    expect(result.linkText).toMatch(/^\[\[mem-123\|.+\]\]$/);
  });

  it("should return correct new cursor position", async () => {
    const result = await insertWikiLinkWithWaypoint("Hello [[", 6, 8, testMemory);

    // Cursor should be after the inserted link
    expect(result.newCursorPosition).toBe(6 + result.linkText.length);
  });

  it("should preserve text after cursor", async () => {
    const result = await insertWikiLinkWithWaypoint("Hello [[ world", 6, 8, testMemory);

    expect(result.newText).toContain(" world");
  });

  it("should not create waypoint when options not provided", async () => {
    const result = await insertWikiLinkWithWaypoint("Hello [[", 6, 8, testMemory);

    expect(result.waypointResult).toBeUndefined();
  });

  it("should not create waypoint when createWaypoint is false", async () => {
    const result = await insertWikiLinkWithWaypoint("Hello [[", 6, 8, testMemory, {
      sourceMemoryId: "source-mem",
      userId: "user-1",
      createWaypoint: false,
    });

    expect(result.waypointResult).toBeUndefined();
  });

  it("should not create waypoint when sourceMemoryId is missing", async () => {
    const result = await insertWikiLinkWithWaypoint("Hello [[", 6, 8, testMemory, {
      userId: "user-1",
      createWaypoint: true,
    });

    expect(result.waypointResult).toBeUndefined();
  });

  it("should not create waypoint when userId is missing", async () => {
    const result = await insertWikiLinkWithWaypoint("Hello [[", 6, 8, testMemory, {
      sourceMemoryId: "source-mem",
      createWaypoint: true,
    });

    expect(result.waypointResult).toBeUndefined();
  });

  it("should truncate long content in preview", async () => {
    const longContentMemory: Memory = {
      ...testMemory,
      content:
        "This is a very long memory content that should be truncated in the preview to keep the link text manageable",
    };

    const result = await insertWikiLinkWithWaypoint("Hello [[", 6, 8, longContentMemory);

    // Preview should be truncated (30 chars max + ...)
    expect(result.linkText.length).toBeLessThan(50);
    expect(result.linkText).toContain("...");
  });

  it("should handle empty text before link", async () => {
    const result = await insertWikiLinkWithWaypoint("[[", 0, 2, testMemory);

    expect(result.newText.startsWith("[[")).toBe(true);
    expect(result.newCursorPosition).toBe(result.linkText.length);
  });

  it("should handle query text after [[", async () => {
    const result = await insertWikiLinkWithWaypoint("Hello [[test query", 6, 18, testMemory);

    // The query text should be replaced with the link
    expect(result.newText).not.toContain("test query");
    expect(result.newText).toContain("[[mem-123|");
  });
});
