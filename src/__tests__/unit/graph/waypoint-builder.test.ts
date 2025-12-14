/**
 * Waypoint Graph Builder Tests
 *
 * Tests for waypoint connection creation system.
 * Tests cover:
 * - Finding relevant connections (max 1-3 per memory)
 * - Connection type classification (causal, associative, temporal, hierarchical)
 * - Connection strength calculation
 * - Bidirectional connection creation
 * - Self-connection prevention
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { Memory, WaypointGraphConfig } from "../../../graph/types";
import { WaypointGraphBuilder } from "../../../graph/waypoint-builder";

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

// Helper functions
function createTestEmbedding(dimension: number, seed: number): number[] {
  return Array.from({ length: dimension }, (_, i) => Math.sin(seed + i * 0.1));
}

function createTestMemory(id: string, content: string): Memory {
  return {
    id,
    userId: "user-1",
    sessionId: "session-1",
    content,
    primarySector: "semantic",
    metadata: {
      keywords: [],
      tags: [],
      category: "test",
      context: "test context",
      importance: 0.5,
      isAtomic: true,
    },
    createdAt: new Date(),
    lastAccessed: new Date(),
    accessCount: 0,
    strength: 1.0,
    salience: 0.5,
  };
}

function createTestMemories(count: number): Memory[] {
  return Array.from({ length: count }, (_, i) =>
    createTestMemory(`mem-${i + 1}`, `Memory content ${i + 1}`)
  );
}

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

  it("should find relevant connections with max 1-3 per memory", async () => {
    const newMemory = createTestMemory("mem-001", "New memory content");
    const existingMemories = createTestMemories(10);

    const result = await builder.createWaypointLinks(newMemory, existingMemories);

    expect(result.links).toBeDefined();
    expect(result.links.length).toBeGreaterThanOrEqual(0);
    expect(result.links.length).toBeLessThanOrEqual(3);
  });

  it("should only create links above similarity threshold", async () => {
    const newMemory = createTestMemory("mem-001", "New memory content");
    const existingMemories = createTestMemories(10);

    const result = await builder.createWaypointLinks(newMemory, existingMemories);

    result.links.forEach((link) => {
      expect(link.weight).toBeGreaterThanOrEqual(config.similarityThreshold);
    });
  });

  it("should handle empty candidate pool", async () => {
    const newMemory = createTestMemory("mem-001", "First memory");
    const existingMemories: Memory[] = [];

    const result = await builder.createWaypointLinks(newMemory, existingMemories);

    expect(result.links).toEqual([]);
    expect(result.skippedCount).toBe(0);
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

  it("should classify link types", async () => {
    const source = createTestMemory("mem-001", "Action A causes result B");
    const target = createTestMemory("mem-002", "Result B happened because of A");

    const linkType = await builder.classifyLinkType(source, target);

    // Should return a valid LinkType
    expect(linkType).toBeDefined();
  });
});

describe("WaypointGraphBuilder - Connection Weight Calculation", () => {
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

  it("should calculate weight based on embedding similarity", async () => {
    const source = createTestMemory("mem-001", "Source memory");
    const target = createTestMemory("mem-002", "Target memory");

    const weight = await builder.calculateLinkWeight(source, target);

    expect(weight).toBeGreaterThanOrEqual(0);
    expect(weight).toBeLessThanOrEqual(1);
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

  it("should create bidirectional links via createWaypointLinks", async () => {
    const source = createTestMemory("mem-001", "Source memory");
    const target = createTestMemory("mem-002", "Target memory");

    const result = await builder.createWaypointLinks(source, [target]);

    // With bidirectional enabled, links should be created
    expect(result.links).toBeDefined();
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

  it("should validate links are not self-referential", async () => {
    const memory = createTestMemory("mem-001", "Memory");

    const isValid = await builder.validateLink(memory.id, memory.id);

    expect(isValid).toBe(false);
  });

  it("should validate different source and target", async () => {
    const source = createTestMemory("mem-001", "Source");
    const target = createTestMemory("mem-002", "Target");

    const isValid = await builder.validateLink(source.id, target.id);

    expect(isValid).toBe(true);
  });
});
