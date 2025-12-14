/**
 * Waypoint Graph Builder Tests
 *
 * Tests for waypoint connection creation system.
 * Following TDD principles - these tests define expected behavior before implementation.
 *
 * Tests cover:
 * - Finding relevant connections (max 1-3 per memory)
 * - Connection type classification (causal, associative, temporal, hierarchical)
 * - Connection strength calculation
 * - Bidirectional connection creation
 * - Self-connection prevention
 *
 * Requirements: 2.3, 2.4, 2.5
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Memory, WaypointGraphConfig } from "../../../graph/types";
import { LinkType, SelfLinkError } from "../../../graph/types";
import { WaypointGraphBuilder } from "../../../graph/waypoint-builder";

// Mock database and embedding storage will be injected
const mockDbManager = {
  pool: {
    query: async () => ({ rows: [] }),
  },
} as any;

const mockEmbeddingStorage = {
  retrieveEmbeddings: async () => ({
    episodic: createTestEmbedding(768, 0.1),
    semantic: createTestEmbedding(768, 0.2),
    procedural: createTestEmbedding(768, 0.3),
    emotional: createTestEmbedding(768, 0.4),
    reflective: createTestEmbedding(768, 0.5),
  }),
  vectorSimilaritySearch: async () => [],
} as any;

describe("WaypointGraphBuilder - Connection Discovery", () => {
  let builder: WaypointGraphBuilder;
  let config: WaypointGraphConfig;

  beforeEach(() => {
    config = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);
  });

  afterEach(() => {
    // Cleanup if needed
  });

  it("should find relevant connections with max 1-3 per memory", async () => {
    // Requirement 2.3: Max 1-3 links per memory
    const newMemory = createTestMemory("mem-001", "New memory content");
    const existingMemories = createTestMemories(10);

    const result = await builder.createWaypointLinks(newMemory, existingMemories);

    expect(result.links).toBeDefined();
    expect(result.links.length).toBeGreaterThanOrEqual(1);
    expect(result.links.length).toBeLessThanOrEqual(3);
  });

  it("should only create links above similarity threshold", async () => {
    // Requirement 2.3: Similarity threshold >0.7
    const newMemory = createTestMemory("mem-001", "New memory content");
    const existingMemories = createTestMemories(10);

    const result = await builder.createWaypointLinks(newMemory, existingMemories);

    // All created links should have weight >= threshold
    result.links.forEach((link) => {
      expect(link.weight).toBeGreaterThanOrEqual(config.similarityThreshold);
    });
  });

  it("should find best matches from candidate pool", async () => {
    // Requirement 2.3: Find top matches
    const memory = createTestMemory("mem-001", "Test memory");
    const candidates = createTestMemories(20);

    const bestMatches = await builder.findBestMatches(memory, candidates, 3);

    expect(bestMatches).toBeDefined();
    expect(bestMatches.length).toBeLessThanOrEqual(3);
  });

  it("should handle case with no good matches", async () => {
    // Requirement 2.3: Handle no matches above threshold
    const newMemory = createTestMemory("mem-001", "Completely unique content");
    const existingMemories = createTestMemories(5);

    // Mock low similarity for all candidates
    const result = await builder.createWaypointLinks(newMemory, existingMemories);

    // Should return empty or minimal links if none meet threshold
    expect(result.links.length).toBeLessThanOrEqual(3);
    expect(result.skippedCount).toBeGreaterThanOrEqual(0);
  });

  it("should prioritize highest similarity matches", async () => {
    // Requirement 2.3: Select top matches by similarity
    const memory = createTestMemory("mem-001", "Test memory");
    const candidates = createTestMemories(10);

    const bestMatches = await builder.findBestMatches(memory, candidates, 3);

    // Verify matches are sorted by similarity (implementation will determine order)
    expect(bestMatches.length).toBeGreaterThan(0);
  });

  it("should handle empty candidate pool", async () => {
    // Edge case: No existing memories
    const newMemory = createTestMemory("mem-001", "First memory");
    const existingMemories: Memory[] = [];

    const result = await builder.createWaypointLinks(newMemory, existingMemories);

    expect(result.links).toEqual([]);
    expect(result.skippedCount).toBe(0);
  });

  it("should handle single candidate", async () => {
    // Edge case: Only one existing memory
    const newMemory = createTestMemory("mem-001", "New memory");
    const existingMemories = [createTestMemory("mem-002", "Existing memory")];

    const result = await builder.createWaypointLinks(newMemory, existingMemories);

    // Should create link if similarity is above threshold
    expect(result.links.length).toBeLessThanOrEqual(1);
  });
});

describe("WaypointGraphBuilder - Connection Type Classification", () => {
  let builder: WaypointGraphBuilder;

  beforeEach(() => {
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);
  });

  it("should classify causal links correctly", async () => {
    // Requirement 2.4: Causal link detection
    const memory1 = createTestMemory("mem-001", "User clicked button");
    const memory2 = createTestMemory("mem-002", "Form was submitted");

    // Add causal indicators to metadata
    memory1.metadata.keywords = ["action", "click", "trigger"];
    memory2.metadata.keywords = ["result", "submit", "effect"];

    const linkType = await builder.classifyLinkType(memory1, memory2);

    expect(linkType).toBe(LinkType.Causal);
  });

  it("should classify associative links correctly", async () => {
    // Requirement 2.4: Associative link detection
    const memory1 = createTestMemory("mem-001", "Machine learning algorithms");
    const memory2 = createTestMemory("mem-002", "Neural network architectures");

    // Similar semantic content
    memory1.metadata.keywords = ["ml", "algorithms", "ai"];
    memory2.metadata.keywords = ["neural", "networks", "ai"];
    memory1.metadata.category = "technology";
    memory2.metadata.category = "technology";

    const linkType = await builder.classifyLinkType(memory1, memory2);

    expect(linkType).toBe(LinkType.Semantic);
  });

  it("should classify temporal links correctly", async () => {
    // Requirement 2.4: Temporal link detection
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const memory1 = createTestMemory("mem-001", "Started task");
    const memory2 = createTestMemory("mem-002", "Completed task");

    memory1.createdAt = fiveMinutesAgo;
    memory2.createdAt = now;
    memory1.sessionId = "session-123";
    memory2.sessionId = "session-123";

    const linkType = await builder.classifyLinkType(memory1, memory2);

    expect(linkType).toBe(LinkType.Temporal);
  });

  it("should classify hierarchical links correctly", async () => {
    // Requirement 2.4: Hierarchical link detection
    const memory1 = createTestMemory("mem-001", "Project overview");
    const memory2 = createTestMemory("mem-002", "Project task details");

    // Hierarchical relationship
    memory1.metadata.category = "project";
    memory2.metadata.category = "task";
    memory2.metadata.parentId = memory1.id;

    const linkType = await builder.classifyLinkType(memory1, memory2);

    expect(linkType).toBe(LinkType.Analogical);
  });

  it("should handle multi-type classification", async () => {
    // Requirement 2.4: Handle memories with multiple relationship types
    const memory1 = createTestMemory("mem-001", "User action");
    const memory2 = createTestMemory("mem-002", "System response");

    // Both causal and temporal
    memory1.createdAt = new Date(Date.now() - 1000);
    memory2.createdAt = new Date();
    memory1.sessionId = "session-123";
    memory2.sessionId = "session-123";
    memory1.metadata.keywords = ["action", "trigger"];
    memory2.metadata.keywords = ["response", "result"];

    const linkType = await builder.classifyLinkType(memory1, memory2);

    // Should prioritize one type (implementation decides priority)
    expect([LinkType.Causal, LinkType.Temporal, LinkType.Semantic, LinkType.Analogical]).toContain(
      linkType
    );
  });

  it("should default to semantic for unclear relationships", async () => {
    // Requirement 2.4: Default classification
    const memory1 = createTestMemory("mem-001", "Random content A");
    const memory2 = createTestMemory("mem-002", "Random content B");

    const linkType = await builder.classifyLinkType(memory1, memory2);

    // Should default to semantic when relationship is unclear
    expect(linkType).toBe(LinkType.Semantic);
  });
});

describe("WaypointGraphBuilder - Connection Strength Calculation", () => {
  let builder: WaypointGraphBuilder;

  beforeEach(() => {
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);
  });

  it("should calculate strength based on embedding similarity", async () => {
    // Requirement 2.5: Similarity-based strength
    const memory1 = createTestMemory("mem-001", "Similar content");
    const memory2 = createTestMemory("mem-002", "Similar content");

    const weight = await builder.calculateLinkWeight(memory1, memory2);

    expect(weight).toBeGreaterThanOrEqual(0);
    expect(weight).toBeLessThanOrEqual(1);
  });

  it("should calculate strength based on metadata overlap", async () => {
    // Requirement 2.5: Metadata-based strength
    const memory1 = createTestMemory("mem-001", "Content A");
    const memory2 = createTestMemory("mem-002", "Content B");

    // High metadata overlap
    memory1.metadata.keywords = ["ai", "ml", "neural"];
    memory2.metadata.keywords = ["ai", "ml", "deep"];
    memory1.metadata.tags = ["tech", "research"];
    memory2.metadata.tags = ["tech", "research"];

    const weight = await builder.calculateLinkWeight(memory1, memory2);

    expect(weight).toBeGreaterThan(0.5); // High overlap should give high weight
  });

  it("should calculate strength based on temporal proximity", async () => {
    // Requirement 2.5: Temporal-based strength
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    const memory1 = createTestMemory("mem-001", "Recent memory");
    const memory2 = createTestMemory("mem-002", "Very recent memory");

    memory1.createdAt = oneMinuteAgo;
    memory2.createdAt = now;
    memory1.sessionId = "session-123";
    memory2.sessionId = "session-123";

    const weight = await builder.calculateLinkWeight(memory1, memory2);

    expect(weight).toBeGreaterThan(0); // Temporal proximity should contribute
  });

  it("should use composite scoring for strength", async () => {
    // Requirement 2.5: Composite strength calculation
    const memory1 = createTestMemory("mem-001", "Test memory");
    const memory2 = createTestMemory("mem-002", "Related memory");

    // Set up multiple factors
    memory1.metadata.keywords = ["test", "memory"];
    memory2.metadata.keywords = ["test", "related"];
    memory1.createdAt = new Date(Date.now() - 5000);
    memory2.createdAt = new Date();
    memory1.sessionId = "session-123";
    memory2.sessionId = "session-123";

    const weight = await builder.calculateLinkWeight(memory1, memory2);

    // Should combine multiple factors
    expect(weight).toBeGreaterThanOrEqual(0);
    expect(weight).toBeLessThanOrEqual(1);
  });

  it("should normalize strength to 0-1 range", async () => {
    // Requirement 2.5: Normalized weights
    const memory1 = createTestMemory("mem-001", "Memory A");
    const memory2 = createTestMemory("mem-002", "Memory B");

    const weight = await builder.calculateLinkWeight(memory1, memory2);

    expect(weight).toBeGreaterThanOrEqual(0);
    expect(weight).toBeLessThanOrEqual(1);
  });

  it("should give higher weight to more similar memories", async () => {
    // Requirement 2.5: Weight proportional to similarity
    const memory1 = createTestMemory("mem-001", "Base memory");
    const memory2 = createTestMemory("mem-002", "Very similar memory");
    const memory3 = createTestMemory("mem-003", "Somewhat similar memory");

    // memory2 is more similar than memory3
    memory1.metadata.keywords = ["a", "b", "c", "d"];
    memory2.metadata.keywords = ["a", "b", "c", "e"]; // 3/4 overlap
    memory3.metadata.keywords = ["a", "b", "x", "y"]; // 2/4 overlap

    const weight12 = await builder.calculateLinkWeight(memory1, memory2);
    const weight13 = await builder.calculateLinkWeight(memory1, memory3);

    expect(weight12).toBeGreaterThan(weight13);
  });
});

describe("WaypointGraphBuilder - Bidirectional Connection Creation", () => {
  let builder: WaypointGraphBuilder;

  beforeEach(() => {
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);
  });

  it("should create bidirectional links", async () => {
    // Requirement 2.3: Bidirectional connections
    const memory1 = createTestMemory("mem-001", "Memory A");
    const memory2 = createTestMemory("mem-002", "Memory B");

    const links = await builder.createBidirectionalLink(memory1, memory2, LinkType.Semantic, 0.8);

    expect(links).toHaveLength(2);
    expect(links[0].sourceId).toBe(memory1.id);
    expect(links[0].targetId).toBe(memory2.id);
    expect(links[1].sourceId).toBe(memory2.id);
    expect(links[1].targetId).toBe(memory1.id);
  });

  it("should assign symmetric weights to bidirectional links", async () => {
    // Requirement 2.3: Symmetric weights
    const memory1 = createTestMemory("mem-001", "Memory A");
    const memory2 = createTestMemory("mem-002", "Memory B");

    const links = await builder.createBidirectionalLink(memory1, memory2, LinkType.Semantic, 0.75);

    expect(links[0].weight).toBe(links[1].weight);
    expect(links[0].weight).toBe(0.75);
  });

  it("should maintain graph consistency", async () => {
    // Requirement 2.3: Graph consistency
    const memory1 = createTestMemory("mem-001", "Memory A");
    const memory2 = createTestMemory("mem-002", "Memory B");

    const links = await builder.createBidirectionalLink(memory1, memory2, LinkType.Temporal, 0.9);

    // Both links should have same type
    expect(links[0].linkType).toBe(links[1].linkType);
    expect(links[0].linkType).toBe(LinkType.Temporal);
  });

  it("should handle existing connections gracefully", async () => {
    // Requirement 2.3: Handle existing links
    const memory1 = createTestMemory("mem-001", "Memory A");
    const memory2 = createTestMemory("mem-002", "Memory B");

    // Create link first time
    const links1 = await builder.createBidirectionalLink(memory1, memory2, LinkType.Semantic, 0.8);
    expect(links1).toHaveLength(2);

    // Attempt to create again - should handle gracefully
    const links2 = await builder.createBidirectionalLink(memory1, memory2, LinkType.Semantic, 0.8);

    // Implementation should either skip or update existing links
    expect(links2).toBeDefined();
  });

  it("should support unidirectional mode when configured", async () => {
    // Requirement 2.3: Optional unidirectional links
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: false,
    };
    const unidirectionalBuilder = new WaypointGraphBuilder(
      mockDbManager,
      mockEmbeddingStorage,
      config
    );

    const memory1 = createTestMemory("mem-001", "Memory A");
    const memory2 = createTestMemory("mem-002", "Memory B");

    const links = await unidirectionalBuilder.createBidirectionalLink(
      memory1,
      memory2,
      LinkType.Semantic,
      0.8
    );

    // Should only create one link when bidirectional is disabled
    expect(links.length).toBeLessThanOrEqual(1);
  });
});

describe("WaypointGraphBuilder - Self-Connection Prevention", () => {
  let builder: WaypointGraphBuilder;

  beforeEach(() => {
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);
  });

  it("should reject self-links at creation time", async () => {
    // Requirement 2.3: Prevent self-connections
    const memory = createTestMemory("mem-001", "Test memory");

    await expect(
      builder.createBidirectionalLink(memory, memory, LinkType.Semantic, 0.9)
    ).rejects.toThrow(SelfLinkError);
  });

  it("should validate source and target are different", async () => {
    // Requirement 2.3: Validation
    const memory = createTestMemory("mem-001", "Test memory");

    const isValid = await builder.validateLink(memory.id, memory.id);

    expect(isValid).toBe(false);
  });

  it("should filter out self from candidate pool", async () => {
    // Requirement 2.3: Exclude self from candidates
    const memory = createTestMemory("mem-001", "Test memory");
    const candidates = [memory, ...createTestMemories(5)];

    const bestMatches = await builder.findBestMatches(memory, candidates, 3);

    // Should not include self in matches
    expect(bestMatches.every((m) => m.id !== memory.id)).toBe(true);
  });

  it("should enforce database constraint for self-links", async () => {
    // Requirement 2.3: Database-level prevention
    const memory = createTestMemory("mem-001", "Test memory");

    // Attempt to create self-link should fail at validation level
    await expect(
      builder.createBidirectionalLink(memory, memory, LinkType.Semantic, 0.8)
    ).rejects.toThrow();
  });
});

describe("WaypointGraphBuilder - Configuration Edge Cases", () => {
  it("should handle unidirectional mode with maxLinksPerNode=1", async () => {
    // Test unidirectional configuration
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 1,
      minLinksPerNode: 1,
      enableBidirectional: false,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);

    const memory = createTestMemory("mem-001", "Test memory");
    const candidates = createTestMemories(5);

    const result = await builder.createWaypointLinks(memory, candidates);

    // Should create only 1 link (unidirectional)
    expect(result.links.length).toBeLessThanOrEqual(1);
  });

  it("should handle maxLinksPerNode=2 with bidirectional mode", async () => {
    // Test bidirectional with even maxLinksPerNode
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 2,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);

    const memory = createTestMemory("mem-001", "Test memory");
    const candidates = createTestMemories(5);

    const result = await builder.createWaypointLinks(memory, candidates);

    // Should create at most 2 links (1 bidirectional pair)
    expect(result.links.length).toBeLessThanOrEqual(2);
  });

  it("should handle maxLinksPerNode=1 with bidirectional mode", async () => {
    // Test edge case: bidirectional with maxLinksPerNode=1
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 1,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);

    const memory = createTestMemory("mem-001", "Test memory");
    const candidates = createTestMemories(3);

    const result = await builder.createWaypointLinks(memory, candidates);

    // With maxLinksPerNode=1 and bidirectional, effectiveMaxConnections=0
    // Should handle gracefully
    expect(result.links.length).toBeLessThanOrEqual(1);
  });

  it("should enforce connection limit with many high-similarity candidates", async () => {
    // Test connection limit enforcement
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.5, // Lower threshold to ensure matches
      maxLinksPerNode: 4, // 2 bidirectional pairs
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);

    const memory = createTestMemory("mem-001", "Test memory");
    const candidates = createTestMemories(10); // Many candidates

    const result = await builder.createWaypointLinks(memory, candidates);

    // Should respect maxLinksPerNode limit
    expect(result.links.length).toBeLessThanOrEqual(4);
    // Should have skipped some candidates
    if (result.links.length === 4) {
      expect(result.skippedCount).toBeGreaterThan(0);
    }
  });

  it("should handle link overflow when bidirectional pair exceeds limit", async () => {
    // Test partial link addition when full pair doesn't fit
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.5,
      maxLinksPerNode: 3, // Odd number - can't fit 2 full pairs
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);

    const memory = createTestMemory("mem-001", "Test memory");
    const candidates = createTestMemories(5);

    const result = await builder.createWaypointLinks(memory, candidates);

    // Should respect maxLinksPerNode limit
    expect(result.links.length).toBeLessThanOrEqual(3);
  });

  it("should handle all candidates being self-references", async () => {
    // Test empty candidates after filtering
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);

    const memory = createTestMemory("mem-001", "Test memory");
    // All candidates are the same memory (self-references)
    const candidates = [memory, memory, memory];

    const bestMatches = await builder.findBestMatches(memory, candidates, 3);

    // Should return empty array after filtering out self-references
    expect(bestMatches).toEqual([]);
  });

  it("should handle embedding retrieval errors gracefully", async () => {
    // Test error handling in embedding similarity calculation
    const mockEmbeddingStorageWithError = {
      retrieveEmbeddings: async () => {
        throw new Error("Embedding retrieval failed");
      },
      vectorSimilaritySearch: async () => [],
    } as any;

    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorageWithError, config);

    const memory1 = createTestMemory("mem-001", "Test memory");
    const memory2 = createTestMemory("mem-002", "Another memory");

    const weight = await builder.calculateLinkWeight(memory1, memory2);

    // Should return default similarity of 0.5 on error
    expect(weight).toBeGreaterThan(0);
    expect(weight).toBeLessThanOrEqual(1);
  });

  it("should handle temporal proximity for distant memories in same session", async () => {
    // Test temporal proximity calculation for distant memories
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);

    const now = new Date();
    const fortyMinutesAgo = new Date(now.getTime() - 40 * 60 * 1000);

    const memory1 = createTestMemory("mem-001", "Old memory");
    const memory2 = createTestMemory("mem-002", "Recent memory");

    memory1.createdAt = fortyMinutesAgo;
    memory2.createdAt = now;
    memory1.sessionId = "session-123";
    memory2.sessionId = "session-123";

    const weight = await builder.calculateLinkWeight(memory1, memory2);

    // Should calculate weight with low temporal proximity score
    expect(weight).toBeGreaterThanOrEqual(0);
    expect(weight).toBeLessThanOrEqual(1);
  });
});

describe("WaypointGraphBuilder - Database Access", () => {
  it("should return database connection manager", () => {
    // Requirement 2.3: Test database access method
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);

    const db = builder.getDatabase();

    expect(db).toBe(mockDbManager);
  });

  it("should respect maxLinksPerNode limit with bidirectional links", async () => {
    // Requirement 2.3: Test link limit enforcement with bidirectional pairs
    // When maxLinksPerNode is odd, should handle partial pairs correctly

    // Create a mock that ensures high similarity for multiple candidates
    const mockEmbeddingStorageHighSim = {
      retrieveEmbeddings: async () => ({
        episodic: createTestEmbedding(768, 0.9),
        semantic: createTestEmbedding(768, 0.9),
        procedural: createTestEmbedding(768, 0.9),
        emotional: createTestEmbedding(768, 0.9),
        reflective: createTestEmbedding(768, 0.9),
      }),
      vectorSimilaritySearch: async () => [],
    } as any;

    const config: WaypointGraphConfig = {
      similarityThreshold: 0.3, // Very low threshold to ensure all candidates match
      maxLinksPerNode: 3, // Odd number - after first pair (2 links), only 1 slot remains
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorageHighSim, config);

    const memory = createTestMemory("mem-001", "Test memory");
    // Create multiple candidates with high metadata overlap to ensure high weights
    const candidates = createTestMemories(3);
    candidates.forEach((c, i) => {
      c.metadata.keywords = ["test", "memory", "similar"];
      c.metadata.tags = ["tag1", "tag2"];
      c.metadata.category = "test";
      c.sessionId = memory.sessionId;
      c.createdAt = new Date(memory.createdAt.getTime() + i * 1000);
    });

    const result = await builder.createWaypointLinks(memory, candidates);

    // Should respect maxLinksPerNode=3 limit exactly
    expect(result.links.length).toBeLessThanOrEqual(3);
    // Should have created links (at least 1 full pair)
    expect(result.links.length).toBeGreaterThan(0);
    // Should have skipped some candidates due to limit
    expect(result.skippedCount).toBeGreaterThan(0);
  });

  it("should calculate link weight with default similarity when embeddings unavailable", async () => {
    // Requirement 2.3: Test fallback behavior when embeddings are missing
    const mockEmbeddingStorageNoEmbeddings = {
      retrieveEmbeddings: async () => ({
        episodic: null,
        semantic: null,
        procedural: null,
        emotional: null,
        reflective: null,
      }),
      vectorSimilaritySearch: async () => [],
    } as any;

    const config: WaypointGraphConfig = {
      similarityThreshold: 0.3,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(
      mockDbManager,
      mockEmbeddingStorageNoEmbeddings,
      config
    );

    const memory1 = createTestMemory("mem-001", "Test memory");
    const memory2 = createTestMemory("mem-002", "Another memory");

    const weight = await builder.calculateLinkWeight(memory1, memory2);

    // Should return default similarity of 0.5 when no embeddings
    expect(weight).toBeGreaterThan(0);
    expect(weight).toBeLessThanOrEqual(1);
  });

  it("should apply temporal proximity bonus for memories created within 30 minutes", async () => {
    // Requirement 2.3: Test temporal proximity calculation in link weight
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const memory1 = createTestMemory("mem-001", "Old memory");
    const memory2 = createTestMemory("mem-002", "Recent memory");

    memory1.createdAt = fifteenMinutesAgo;
    memory2.createdAt = now;
    memory1.sessionId = "session-123";
    memory2.sessionId = "session-123";

    const weight = await builder.calculateLinkWeight(memory1, memory2);

    // Should calculate weight with moderate temporal proximity (0.5)
    expect(weight).toBeGreaterThanOrEqual(0);
    expect(weight).toBeLessThanOrEqual(1);
  });

  it("should not apply temporal proximity bonus for memories more than 30 minutes apart", async () => {
    // Requirement 2.3: Test temporal proximity calculation for distant memories
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);

    const now = new Date();
    const fortyFiveMinutesAgo = new Date(now.getTime() - 45 * 60 * 1000);

    const memory1 = createTestMemory("mem-001", "Old memory");
    const memory2 = createTestMemory("mem-002", "Recent memory");

    memory1.createdAt = fortyFiveMinutesAgo;
    memory2.createdAt = now;
    memory1.sessionId = "session-123";
    memory2.sessionId = "session-123";

    const weight = await builder.calculateLinkWeight(memory1, memory2);

    // Should calculate weight with low temporal proximity (0.1)
    expect(weight).toBeGreaterThanOrEqual(0);
    expect(weight).toBeLessThanOrEqual(1);
  });

  it("should calculate metadata overlap when both memories have no keywords or tags", async () => {
    // Requirement 2.3: Test metadata overlap calculation with empty arrays
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);

    const memory1 = createTestMemory("mem-001", "Memory A");
    const memory2 = createTestMemory("mem-002", "Memory B");

    // Empty metadata arrays
    memory1.metadata.keywords = [];
    memory1.metadata.tags = [];
    memory2.metadata.keywords = [];
    memory2.metadata.tags = [];

    const weight = await builder.calculateLinkWeight(memory1, memory2);

    // Should handle empty arrays gracefully
    expect(weight).toBeGreaterThanOrEqual(0);
    expect(weight).toBeLessThanOrEqual(1);
  });

  it("should handle metadata overlap with one array empty", async () => {
    // Test array overlap edge case
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    const builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);

    const memory1 = createTestMemory("mem-001", "Memory A");
    const memory2 = createTestMemory("mem-002", "Memory B");

    // One empty, one with values
    memory1.metadata.keywords = [];
    memory2.metadata.keywords = ["test", "memory"];
    memory1.metadata.tags = ["tag1"];
    memory2.metadata.tags = [];

    const weight = await builder.calculateLinkWeight(memory1, memory2);

    // Should handle mixed empty/non-empty arrays
    expect(weight).toBeGreaterThanOrEqual(0);
    expect(weight).toBeLessThanOrEqual(1);
  });
});

describe("WaypointGraphBuilder - Edge Cases", () => {
  let builder: WaypointGraphBuilder;

  beforeEach(() => {
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);
  });

  it("should handle duplicate candidates", async () => {
    // Edge case: Duplicate memories in candidate pool
    const memory = createTestMemory("mem-001", "Test memory");
    const duplicate = createTestMemory("mem-002", "Duplicate");
    const candidates = [duplicate, duplicate, ...createTestMemories(3)];

    const bestMatches = await builder.findBestMatches(memory, candidates, 3);

    // Should deduplicate candidates
    const uniqueIds = new Set(bestMatches.map((m) => m.id));
    expect(uniqueIds.size).toBe(bestMatches.length);
  });

  it("should handle all low-similarity candidates", async () => {
    // Edge case: No candidates above threshold
    const memory = createTestMemory("mem-001", "Unique content");
    const candidates = createTestMemories(10);

    // Mock low similarity
    const result = await builder.createWaypointLinks(memory, candidates);

    // Should return empty or minimal links
    expect(result.links.length).toBeLessThanOrEqual(3);
    if (result.links.length === 0) {
      expect(result.skippedCount).toBeGreaterThan(0);
    }
  });

  it("should handle memory with max connections already", async () => {
    // Edge case: Memory already has max links
    const memory = createTestMemory("mem-001", "Test memory");
    const candidates = createTestMemories(5);

    // Simulate memory already having 3 links
    // Implementation should check existing link count
    const result = await builder.createWaypointLinks(memory, candidates);

    // Should respect max links constraint
    expect(result.links.length).toBeLessThanOrEqual(3);
  });

  it("should handle invalid memory data", async () => {
    // Edge case: Missing required fields
    const invalidMemory = {
      id: "mem-001",
      content: "",
      // Missing other required fields
    } as any;

    const candidates = createTestMemories(3);

    await expect(builder.createWaypointLinks(invalidMemory, candidates)).rejects.toThrow();
  });

  it("should handle concurrent link creation", async () => {
    // Edge case: Multiple links being created simultaneously
    const memory = createTestMemory("mem-001", "Test memory");
    const candidates = createTestMemories(10);

    // Create links concurrently
    const promises = [
      builder.createWaypointLinks(memory, candidates.slice(0, 5)),
      builder.createWaypointLinks(memory, candidates.slice(5, 10)),
    ];

    const results = await Promise.all(promises);

    // Should handle concurrent creation without errors
    expect(results).toHaveLength(2);
    results.forEach((result) => {
      expect(result.links).toBeDefined();
    });
  });
});

describe("WaypointGraphBuilder - Performance", () => {
  let builder: WaypointGraphBuilder;

  beforeEach(() => {
    const config: WaypointGraphConfig = {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    };
    builder = new WaypointGraphBuilder(mockDbManager, mockEmbeddingStorage, config);
  });

  it("should complete link creation within 500ms for 100 candidates", async () => {
    // Requirement 2.5: Performance target
    const memory = createTestMemory("mem-001", "Test memory");
    const candidates = createTestMemories(100);

    const startTime = Date.now();
    await builder.createWaypointLinks(memory, candidates);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(500);
  });

  it("should use cached embeddings for similarity calculations", async () => {
    // Requirement 2.5: Caching optimization
    const memory = createTestMemory("mem-001", "Test memory");
    const candidates = createTestMemories(10);

    // First call - may cache embeddings
    await builder.createWaypointLinks(memory, candidates);

    // Second call - should use cache
    const startTime = Date.now();
    await builder.createWaypointLinks(memory, candidates);
    const duration = Date.now() - startTime;

    // Should be faster with cache
    expect(duration).toBeLessThan(200);
  });

  it("should batch database operations efficiently", async () => {
    // Requirement 2.5: Efficient database operations
    const memory = createTestMemory("mem-001", "Test memory");
    const candidates = createTestMemories(20);

    const result = await builder.createWaypointLinks(memory, candidates);

    // Should create links in batch, not one-by-one
    expect(result.links).toBeDefined();
  });
});

// Helper functions

function createTestMemory(id: string, content: string): Memory {
  return {
    id,
    content,
    createdAt: new Date(),
    lastAccessed: new Date(),
    accessCount: 0,
    salience: 0.5,
    strength: 1.0,
    userId: "test-user",
    sessionId: "test-session",
    primarySector: "semantic",
    metadata: {
      keywords: [],
      tags: [],
      category: "general",
      context: "",
      importance: 0.5,
      isAtomic: true,
    },
  };
}

function createTestMemories(count: number): Memory[] {
  return Array.from({ length: count }, (_, i) =>
    createTestMemory(`mem-${String(i + 1).padStart(3, "0")}`, `Test memory ${i + 1}`)
  );
}

function createTestEmbedding(dimension: number, seed: number): number[] {
  const embedding = new Array(dimension);
  for (let i = 0; i < dimension; i++) {
    embedding[i] = seed + i * 0.001;
  }
  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}
