/**
 * Graph Edge Generation Utilities Tests
 *
 * Tests for generating edges between memory nodes based on
 * shared tags and explicit mentions.
 *
 * Requirements: 6.3, 6.4
 */

import { describe, expect, it } from "vitest";
import type { Memory, MemorySectorType } from "../../types/api";
import {
  extractMentions,
  filterTypeBasedEdges,
  generateEdges,
  generateMentionEdge,
  generateTagEdge,
  getEdgeKey,
  getMemoryTags,
  getSharedTags,
  type GraphEdge2D,
  hasMention,
  mergeEdges,
} from "../../utils/graphEdges";

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestMemory(
  id: string,
  content: string,
  tags: string[] = [],
  sector: MemorySectorType = "semantic"
): Memory {
  return {
    id,
    content,
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
    accessCount: 1,
    salience: 0.5,
    strength: 0.5,
    userId: "test-user",
    sessionId: "test-session",
    primarySector: sector,
    metadata: {
      tags,
      keywords: [],
    },
  };
}

// ============================================================================
// getMemoryTags Tests
// ============================================================================

describe("getMemoryTags", () => {
  it("should return empty array for memory without tags", () => {
    const memory = createTestMemory("mem-1", "Test content");
    expect(getMemoryTags(memory)).toEqual([]);
  });

  it("should return lowercase trimmed tags", () => {
    const memory = createTestMemory("mem-1", "Test content", ["JavaScript", " React ", "NODE.JS"]);
    expect(getMemoryTags(memory)).toEqual(["javascript", "react", "node.js"]);
  });

  it("should filter out empty tags", () => {
    const memory = createTestMemory("mem-1", "Test content", ["valid", "", "  ", "another"]);
    expect(getMemoryTags(memory)).toEqual(["valid", "another"]);
  });
});

// ============================================================================
// getSharedTags Tests
// ============================================================================

describe("getSharedTags", () => {
  it("should return empty array when no shared tags", () => {
    const memA = createTestMemory("mem-1", "Content A", ["javascript", "react"]);
    const memB = createTestMemory("mem-2", "Content B", ["python", "django"]);
    expect(getSharedTags(memA, memB)).toEqual([]);
  });

  it("should return shared tags (case-insensitive)", () => {
    const memA = createTestMemory("mem-1", "Content A", ["JavaScript", "React", "TypeScript"]);
    const memB = createTestMemory("mem-2", "Content B", ["react", "typescript", "node"]);
    expect(getSharedTags(memA, memB)).toEqual(["react", "typescript"]);
  });

  it("should handle empty tag arrays", () => {
    const memA = createTestMemory("mem-1", "Content A", []);
    const memB = createTestMemory("mem-2", "Content B", ["react"]);
    expect(getSharedTags(memA, memB)).toEqual([]);
  });
});

// ============================================================================
// extractMentions Tests
// ============================================================================

describe("extractMentions", () => {
  it("should extract simple wiki-link mentions", () => {
    const content = "This references [[mem-123]] and [[mem-456]].";
    expect(extractMentions(content)).toEqual(["mem-123", "mem-456"]);
  });

  it("should extract wiki-links with display text", () => {
    const content = "See [[mem-123|My Memory]] for details.";
    expect(extractMentions(content)).toEqual(["mem-123"]);
  });

  it("should return empty array for content without mentions", () => {
    const content = "This is plain text without any mentions.";
    expect(extractMentions(content)).toEqual([]);
  });

  it("should handle mixed mention formats", () => {
    const content = "Check [[mem-1]] and [[mem-2|Display]] and [[mem-3]].";
    expect(extractMentions(content)).toEqual(["mem-1", "mem-2", "mem-3"]);
  });

  it("should trim whitespace from mention IDs", () => {
    const content = "Reference [[ mem-123 ]] here.";
    expect(extractMentions(content)).toEqual(["mem-123"]);
  });
});

// ============================================================================
// hasMention Tests
// ============================================================================

describe("hasMention", () => {
  it("should return true when memory mentions target", () => {
    const memory = createTestMemory("mem-1", "This links to [[mem-2]].");
    expect(hasMention(memory, "mem-2")).toBe(true);
  });

  it("should return false when memory does not mention target", () => {
    const memory = createTestMemory("mem-1", "This links to [[mem-3]].");
    expect(hasMention(memory, "mem-2")).toBe(false);
  });

  it("should return false for plain text content", () => {
    const memory = createTestMemory("mem-1", "No mentions here.");
    expect(hasMention(memory, "mem-2")).toBe(false);
  });
});

// ============================================================================
// generateTagEdge Tests - Requirements: 6.3
// ============================================================================

describe("generateTagEdge", () => {
  it("should generate edge for memories with shared tags", () => {
    const memA = createTestMemory("mem-1", "Content A", ["react", "typescript"]);
    const memB = createTestMemory("mem-2", "Content B", ["react", "node"]);

    const edge = generateTagEdge(memA, memB);

    expect(edge).not.toBeNull();
    expect(edge?.source).toBe("mem-1");
    expect(edge?.target).toBe("mem-2");
    expect(edge?.type).toBe("tag");
    expect(edge?.weight).toBe(0.5); // 1 shared / 2 max tags
  });

  it("should return null for memories without shared tags", () => {
    const memA = createTestMemory("mem-1", "Content A", ["react"]);
    const memB = createTestMemory("mem-2", "Content B", ["python"]);

    const edge = generateTagEdge(memA, memB);

    expect(edge).toBeNull();
  });

  it("should calculate weight based on max tags", () => {
    const memA = createTestMemory("mem-1", "Content A", ["a", "b", "c", "d"]);
    const memB = createTestMemory("mem-2", "Content B", ["a", "b"]);

    const edge = generateTagEdge(memA, memB);

    expect(edge?.weight).toBe(0.5); // 2 shared / 4 max tags
  });

  it("should respect minimum overlap ratio", () => {
    const memA = createTestMemory("mem-1", "Content A", ["a", "b", "c", "d"]);
    const memB = createTestMemory("mem-2", "Content B", ["a"]);

    // 1/4 = 0.25, which is less than 0.3
    const edge = generateTagEdge(memA, memB, 0.3);

    expect(edge).toBeNull();
  });
});

// ============================================================================
// generateMentionEdge Tests - Requirements: 6.3
// ============================================================================

describe("generateMentionEdge", () => {
  it("should generate edge when A mentions B", () => {
    const memA = createTestMemory("mem-1", "See [[mem-2]] for details.");
    const memB = createTestMemory("mem-2", "Content B");

    const edge = generateMentionEdge(memA, memB);

    expect(edge).not.toBeNull();
    expect(edge?.source).toBe("mem-1");
    expect(edge?.target).toBe("mem-2");
    expect(edge?.type).toBe("mention");
    expect(edge?.weight).toBe(1.0);
  });

  it("should generate edge when B mentions A", () => {
    const memA = createTestMemory("mem-1", "Content A");
    const memB = createTestMemory("mem-2", "Related to [[mem-1]].");

    const edge = generateMentionEdge(memA, memB);

    expect(edge).not.toBeNull();
    expect(edge?.type).toBe("mention");
  });

  it("should return null when no mentions exist", () => {
    const memA = createTestMemory("mem-1", "Content A");
    const memB = createTestMemory("mem-2", "Content B");

    const edge = generateMentionEdge(memA, memB);

    expect(edge).toBeNull();
  });
});

// ============================================================================
// generateEdges Tests - Requirements: 6.3, 6.4
// ============================================================================

describe("generateEdges", () => {
  it("should generate both tag and mention edges", () => {
    const memories = [
      createTestMemory("mem-1", "Content with [[mem-2]]", ["react"]),
      createTestMemory("mem-2", "Content B", ["react", "node"]),
      createTestMemory("mem-3", "Content C", ["node"]),
    ];

    const edges = generateEdges(memories);

    // Should have: mem-1 <-> mem-2 (tag + mention), mem-2 <-> mem-3 (tag)
    expect(edges.length).toBeGreaterThanOrEqual(2);

    const tagEdges = edges.filter((e) => e.type === "tag");
    const mentionEdges = edges.filter((e) => e.type === "mention");

    expect(tagEdges.length).toBeGreaterThanOrEqual(1);
    expect(mentionEdges.length).toBe(1);
  });

  it("should NOT generate edges based on memory type (Requirement 6.4)", () => {
    const memories = [
      createTestMemory("mem-1", "Content A", [], "episodic"),
      createTestMemory("mem-2", "Content B", [], "episodic"),
      createTestMemory("mem-3", "Content C", [], "semantic"),
    ];

    const edges = generateEdges(memories);

    // No edges should be created since there are no shared tags or mentions
    expect(edges.length).toBe(0);
  });

  it("should handle empty memories array", () => {
    const edges = generateEdges([]);
    expect(edges).toEqual([]);
  });

  it("should handle single memory", () => {
    const memories = [createTestMemory("mem-1", "Content A", ["react"])];
    const edges = generateEdges(memories);
    expect(edges).toEqual([]);
  });

  it("should respect includeTags option", () => {
    const memories = [
      createTestMemory("mem-1", "Content A", ["react"]),
      createTestMemory("mem-2", "Content B", ["react"]),
    ];

    const edges = generateEdges(memories, { includeTags: false });

    expect(edges.length).toBe(0);
  });

  it("should respect includeMentions option", () => {
    const memories = [
      createTestMemory("mem-1", "See [[mem-2]]"),
      createTestMemory("mem-2", "Content B"),
    ];

    const edges = generateEdges(memories, { includeMentions: false });

    expect(edges.length).toBe(0);
  });

  it("should not create duplicate edges", () => {
    const memories = [
      createTestMemory("mem-1", "See [[mem-2]]", ["react"]),
      createTestMemory("mem-2", "See [[mem-1]]", ["react"]),
    ];

    const edges = generateEdges(memories);

    // Should have 2 edges: one tag edge and one mention edge
    // But not duplicates for bidirectional mentions
    const tagEdges = edges.filter((e) => e.type === "tag");
    const mentionEdges = edges.filter((e) => e.type === "mention");

    expect(tagEdges.length).toBe(1);
    expect(mentionEdges.length).toBe(1);
  });
});

// ============================================================================
// getEdgeKey Tests
// ============================================================================

describe("getEdgeKey", () => {
  it("should create consistent key regardless of source/target order", () => {
    const edge1: GraphEdge2D = { source: "a", target: "b", type: "tag", weight: 0.5 };
    const edge2: GraphEdge2D = { source: "b", target: "a", type: "tag", weight: 0.5 };

    expect(getEdgeKey(edge1)).toBe(getEdgeKey(edge2));
  });

  it("should create different keys for different edge types", () => {
    const edge1: GraphEdge2D = { source: "a", target: "b", type: "tag", weight: 0.5 };
    const edge2: GraphEdge2D = { source: "a", target: "b", type: "mention", weight: 1.0 };

    expect(getEdgeKey(edge1)).not.toBe(getEdgeKey(edge2));
  });
});

// ============================================================================
// filterTypeBasedEdges Tests - Requirements: 6.4
// ============================================================================

describe("filterTypeBasedEdges", () => {
  it("should keep valid edge types", () => {
    const edges: GraphEdge2D[] = [
      { source: "a", target: "b", type: "tag", weight: 0.5 },
      { source: "b", target: "c", type: "mention", weight: 1.0 },
      { source: "c", target: "d", type: "similarity", weight: 0.8 },
    ];

    const filtered = filterTypeBasedEdges(edges);

    expect(filtered.length).toBe(3);
  });

  it("should filter out invalid edge types", () => {
    // Using type assertion to test invalid edge type filtering
    const invalidEdge = {
      source: "b",
      target: "c",
      type: "type",
      weight: 0.5,
    } as unknown as GraphEdge2D;
    const edges: GraphEdge2D[] = [
      { source: "a", target: "b", type: "tag", weight: 0.5 },
      invalidEdge,
    ];

    const filtered = filterTypeBasedEdges(edges);

    expect(filtered.length).toBe(1);
    expect(filtered[0]?.type).toBe("tag");
  });
});

// ============================================================================
// mergeEdges Tests
// ============================================================================

describe("mergeEdges", () => {
  it("should merge edges from multiple sources", () => {
    const edges1: GraphEdge2D[] = [{ source: "a", target: "b", type: "tag", weight: 0.5 }];
    const edges2: GraphEdge2D[] = [{ source: "b", target: "c", type: "mention", weight: 1.0 }];

    const merged = mergeEdges(edges1, edges2);

    expect(merged.length).toBe(2);
  });

  it("should keep higher weight edge when duplicates exist", () => {
    const edges1: GraphEdge2D[] = [{ source: "a", target: "b", type: "tag", weight: 0.3 }];
    const edges2: GraphEdge2D[] = [{ source: "a", target: "b", type: "tag", weight: 0.7 }];

    const merged = mergeEdges(edges1, edges2);

    expect(merged.length).toBe(1);
    expect(merged[0]?.weight).toBe(0.7);
  });

  it("should handle empty arrays", () => {
    const merged = mergeEdges([], []);
    expect(merged).toEqual([]);
  });
});
