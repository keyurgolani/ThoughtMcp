/**
 * Graph Traversal Tests
 *
 * Tests for graph traversal functionality using real GraphTraversal class.
 * Tests include:
 * - Finding connected memories (BFS and DFS)
 * - Path finding between memories
 * - Path explanation generation
 * - Waypoint expansion
 * - Connection strength weighting
 *
 * Requirements: 2.3, 2.4, 2.5
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../../database/connection-manager";
import { GraphTraversal } from "../../../graph/graph-traversal";
import { LinkType, type Memory } from "../../../graph/types";

describe("GraphTraversal - getConnectedMemories", () => {
  let db: DatabaseConnectionManager;
  let graphTraversal: GraphTraversal;
  let testMemoryIds: string[];

  beforeEach(async () => {
    // Create database connection
    db = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      poolSize: 5,
    });

    await db.connect();
    graphTraversal = new GraphTraversal(db);
    testMemoryIds = [];

    // Clean up any existing test data
    const client = await db.getConnection();
    try {
      await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-graph-%'");
      await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-graph-%'");
      await client.query("DELETE FROM memories WHERE id LIKE 'test-graph-%'");
    } finally {
      db.releaseConnection(client);
    }
  });

  afterEach(async () => {
    // Clean up test data
    if (db) {
      const client = await db.getConnection();
      try {
        await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-graph-%'");
        await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-graph-%'");
        await client.query("DELETE FROM memories WHERE id LIKE 'test-graph-%'");
      } finally {
        db.releaseConnection(client);
      }
      await db.disconnect();
    }
  });

  async function createTestMemory(
    id: string,
    content: string,
    salience: number = 0.5
  ): Promise<void> {
    testMemoryIds.push(id);
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, strength, user_id, session_id, primary_sector)
         VALUES ($1, $2, NOW(), NOW(), 0, $3, 1.0, 'test-user', 'test-session', 'semantic')`,
        [id, content, salience]
      );
      await client.query(
        `INSERT INTO memory_metadata (memory_id, keywords, tags, category, context, importance, is_atomic)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, [], [], "test", "", 0.5, true]
      );
    } finally {
      db.releaseConnection(client);
    }
  }

  async function createTestLink(
    sourceId: string,
    targetId: string,
    linkType: string,
    weight: number
  ): Promise<void> {
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memory_links (source_id, target_id, link_type, weight, created_at, traversal_count)
         VALUES ($1, $2, $3, $4, NOW(), 0)`,
        [sourceId, targetId, linkType, weight]
      );
    } finally {
      db.releaseConnection(client);
    }
  }

  it("should find direct connections (1-hop) with BFS", async () => {
    // Requirement 2.3: Waypoint graph with 1-3 links per memory
    // Requirement 2.4: Graph traversal for memory retrieval

    // Given: Memory A with direct link to B
    await createTestMemory("test-graph-A", "Memory A");
    await createTestMemory("test-graph-B", "Memory B");
    await createTestLink("test-graph-A", "test-graph-B", "semantic", 0.8);

    // When: Finding 1-hop connections
    const result = await graphTraversal.getConnectedMemories("test-graph-A", { maxDepth: 1 });

    // Then: Should return A (start) and B (1-hop)
    expect(result.memories).toHaveLength(2);
    expect(result.visitedCount).toBe(2);
    expect(result.memories.find((m) => m.id === "test-graph-A")).toBeDefined();
    expect(result.memories.find((m) => m.id === "test-graph-B")).toBeDefined();
  });

  it("should find multi-hop connections (2-3 hops) with BFS", async () => {
    // Requirement 2.4: Graph traversal for memory retrieval

    // Given: Chain A→B→C→D
    await createTestMemory("test-graph-A", "Memory A");
    await createTestMemory("test-graph-B", "Memory B");
    await createTestMemory("test-graph-C", "Memory C");
    await createTestMemory("test-graph-D", "Memory D");
    await createTestLink("test-graph-A", "test-graph-B", "semantic", 0.8);
    await createTestLink("test-graph-B", "test-graph-C", "semantic", 0.7);
    await createTestLink("test-graph-C", "test-graph-D", "semantic", 0.9);

    // When: Finding 2-hop connections
    const result2 = await graphTraversal.getConnectedMemories("test-graph-A", { maxDepth: 2 });

    // Then: Should return A, B, C (up to 2 hops)
    expect(result2.memories).toHaveLength(3);
    expect(result2.visitedCount).toBe(3);

    // When: Finding 3-hop connections
    const result3 = await graphTraversal.getConnectedMemories("test-graph-A", { maxDepth: 3 });

    // Then: Should return A, B, C, D (up to 3 hops)
    expect(result3.memories).toHaveLength(4);
    expect(result3.visitedCount).toBe(4);
  });

  it("should handle isolated nodes (no connections)", async () => {
    // Requirement 2.3: Waypoint graph structure

    // Given: Memory with no outgoing links
    await createTestMemory("test-graph-isolated", "Isolated Memory");

    // When: Finding connections
    const result = await graphTraversal.getConnectedMemories("test-graph-isolated", {
      maxDepth: 3,
    });

    // Then: Should return only the start node
    expect(result.memories).toHaveLength(1);
    expect(result.visitedCount).toBe(1);
    expect(result.memories[0].id).toBe("test-graph-isolated");
  });

  it("should support depth-first traversal", async () => {
    // Requirement 2.4: DFS traversal

    // Given: Tree structure A→B, A→C, B→D
    await createTestMemory("test-graph-A", "Memory A");
    await createTestMemory("test-graph-B", "Memory B");
    await createTestMemory("test-graph-C", "Memory C");
    await createTestMemory("test-graph-D", "Memory D");
    await createTestLink("test-graph-A", "test-graph-B", "semantic", 0.8);
    await createTestLink("test-graph-A", "test-graph-C", "semantic", 0.7);
    await createTestLink("test-graph-B", "test-graph-D", "semantic", 0.9);

    // When: DFS traversal with depth 2
    const result = await graphTraversal.getConnectedMemories("test-graph-A", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    // Then: Should visit all reachable nodes
    expect(result.memories).toHaveLength(4);
    expect(result.visitedCount).toBe(4);
  });

  it("should filter by minimum weight threshold", async () => {
    // Requirement 2.5: Weight threshold filtering

    // Given: Links with different weights
    await createTestMemory("test-graph-A", "Memory A");
    await createTestMemory("test-graph-B", "Memory B");
    await createTestMemory("test-graph-C", "Memory C");
    await createTestMemory("test-graph-D", "Memory D");
    await createTestLink("test-graph-A", "test-graph-B", "semantic", 0.9);
    await createTestLink("test-graph-A", "test-graph-C", "semantic", 0.5);
    await createTestLink("test-graph-A", "test-graph-D", "semantic", 0.7);

    // When: Filtering by minimum weight 0.6
    const result = await graphTraversal.getConnectedMemories("test-graph-A", {
      maxDepth: 1,
      minWeight: 0.6,
    });

    // Then: Should return only A, B (0.9), and D (0.7), not C (0.5)
    expect(result.memories).toHaveLength(3);
    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("test-graph-A");
    expect(ids).toContain("test-graph-B");
    expect(ids).toContain("test-graph-D");
    expect(ids).not.toContain("test-graph-C");
  });

  it("should handle non-existent memory ID", async () => {
    // Requirement 2.4: Edge case handling

    // When: Querying non-existent memory
    const result = await graphTraversal.getConnectedMemories("non-existent-id", { maxDepth: 1 });

    // Then: Should return empty result
    expect(result.memories).toHaveLength(0);
    expect(result.visitedCount).toBe(0);
  });

  it("should handle depth 0 boundary condition", async () => {
    // Requirement 2.4: Edge case handling

    // Given: Memory with connections
    await createTestMemory("test-graph-A", "Memory A");
    await createTestMemory("test-graph-B", "Memory B");
    await createTestLink("test-graph-A", "test-graph-B", "semantic", 0.8);

    // When: Traversing with depth 0
    const result = await graphTraversal.getConnectedMemories("test-graph-A", { maxDepth: 0 });

    // Then: Should return only start node
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].id).toBe("test-graph-A");
  });

  it("should prevent infinite loops in cyclic graphs", async () => {
    // Requirement 2.3: Cycle detection

    // Given: Cycle A→B→C→A
    await createTestMemory("test-graph-A", "Memory A");
    await createTestMemory("test-graph-B", "Memory B");
    await createTestMemory("test-graph-C", "Memory C");
    await createTestLink("test-graph-A", "test-graph-B", "semantic", 0.8);
    await createTestLink("test-graph-B", "test-graph-C", "semantic", 0.7);
    await createTestLink("test-graph-C", "test-graph-A", "semantic", 0.9);

    // When: Traversing with large depth
    const result = await graphTraversal.getConnectedMemories("test-graph-A", { maxDepth: 10 });

    // Then: Should visit each node only once
    expect(result.memories).toHaveLength(3);
    expect(result.visitedCount).toBe(3);
  });
});

describe("GraphTraversal - findPath", () => {
  let db: DatabaseConnectionManager;
  let graphTraversal: GraphTraversal;

  beforeEach(async () => {
    db = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      poolSize: 5,
    });

    await db.connect();
    graphTraversal = new GraphTraversal(db);

    const client = await db.getConnection();
    try {
      await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-path-%'");
      await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-path-%'");
      await client.query("DELETE FROM memories WHERE id LIKE 'test-path-%'");
    } finally {
      db.releaseConnection(client);
    }
  });

  afterEach(async () => {
    if (db) {
      const client = await db.getConnection();
      try {
        await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-path-%'");
        await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-path-%'");
        await client.query("DELETE FROM memories WHERE id LIKE 'test-path-%'");
      } finally {
        db.releaseConnection(client);
      }
      await db.disconnect();
    }
  });

  async function createTestMemory(id: string, content: string): Promise<void> {
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, strength, user_id, session_id, primary_sector)
         VALUES ($1, $2, NOW(), NOW(), 0, 0.5, 1.0, 'test-user', 'test-session', 'semantic')`,
        [id, content]
      );
      await client.query(
        `INSERT INTO memory_metadata (memory_id, keywords, tags, category, context, importance, is_atomic)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, [], [], "test", "", 0.5, true]
      );
    } finally {
      db.releaseConnection(client);
    }
  }

  async function createTestLink(
    sourceId: string,
    targetId: string,
    linkType: string,
    weight: number
  ): Promise<void> {
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memory_links (source_id, target_id, link_type, weight, created_at, traversal_count)
         VALUES ($1, $2, $3, $4, NOW(), 0)`,
        [sourceId, targetId, linkType, weight]
      );
    } finally {
      db.releaseConnection(client);
    }
  }

  it("should find shortest path between two memories", async () => {
    // Requirement 2.4: Path finding

    // Given: Path A→B→C
    await createTestMemory("test-path-A", "Memory A");
    await createTestMemory("test-path-B", "Memory B");
    await createTestMemory("test-path-C", "Memory C");
    await createTestLink("test-path-A", "test-path-B", "causal", 0.85);
    await createTestLink("test-path-B", "test-path-C", "temporal", 0.72);

    // When: Finding path from A to C
    const path = await graphTraversal.findPath("test-path-A", "test-path-C", 5);

    // Then: Should find path A→B→C
    expect(path).not.toBeNull();
    expect(path!.memories).toHaveLength(3);
    expect(path!.links).toHaveLength(2);
    expect(path!.memories[0].id).toBe("test-path-A");
    expect(path!.memories[1].id).toBe("test-path-B");
    expect(path!.memories[2].id).toBe("test-path-C");
  });

  it("should return null when no path exists", async () => {
    // Requirement 2.4: Handle disconnected graphs

    // Given: Disconnected memories A and B
    await createTestMemory("test-path-A", "Memory A");
    await createTestMemory("test-path-B", "Memory B");

    // When: Finding path from A to B
    const path = await graphTraversal.findPath("test-path-A", "test-path-B", 5);

    // Then: Should return null
    expect(path).toBeNull();
  });

  it("should respect maxDepth limit", async () => {
    // Requirement 2.4: Depth-limited path finding

    // Given: Long chain A→B→C→D→E
    await createTestMemory("test-path-A", "Memory A");
    await createTestMemory("test-path-B", "Memory B");
    await createTestMemory("test-path-C", "Memory C");
    await createTestMemory("test-path-D", "Memory D");
    await createTestMemory("test-path-E", "Memory E");
    await createTestLink("test-path-A", "test-path-B", "semantic", 0.8);
    await createTestLink("test-path-B", "test-path-C", "semantic", 0.7);
    await createTestLink("test-path-C", "test-path-D", "semantic", 0.9);
    await createTestLink("test-path-D", "test-path-E", "semantic", 0.6);

    // When: Finding path with maxDepth 2
    const path = await graphTraversal.findPath("test-path-A", "test-path-E", 2);

    // Then: Should not find path (requires 4 hops)
    expect(path).toBeNull();
  });

  it("should calculate path weight correctly", async () => {
    // Requirement 2.5: Path weight calculation

    // Given: Path with known weights
    await createTestMemory("test-path-A", "Memory A");
    await createTestMemory("test-path-B", "Memory B");
    await createTestMemory("test-path-C", "Memory C");
    await createTestLink("test-path-A", "test-path-B", "causal", 0.8);
    await createTestLink("test-path-B", "test-path-C", "temporal", 0.6);

    // When: Finding path
    const path = await graphTraversal.findPath("test-path-A", "test-path-C", 5);

    // Then: Should calculate average weight (0.8 + 0.6) / 2 = 0.7
    expect(path).not.toBeNull();
    expect(path!.totalWeight).toBeCloseTo(0.7, 2);
  });

  it("should handle source equals target", async () => {
    // Requirement 2.4: Edge case handling

    // Given: Single memory
    await createTestMemory("test-path-A", "Memory A");

    // When: Finding path from A to A
    const path = await graphTraversal.findPath("test-path-A", "test-path-A", 5);

    // Then: Should return path with single memory
    expect(path).not.toBeNull();
    expect(path!.memories).toHaveLength(1);
    expect(path!.links).toHaveLength(0);
    expect(path!.memories[0].id).toBe("test-path-A");
  });

  it("should find shortest path when multiple paths exist", async () => {
    // Requirement 2.4: Shortest path selection

    // Given: Two paths from A to D:
    //   Path 1: A→B→D (2 hops)
    //   Path 2: A→C→E→D (3 hops)
    await createTestMemory("test-path-A", "Memory A");
    await createTestMemory("test-path-B", "Memory B");
    await createTestMemory("test-path-C", "Memory C");
    await createTestMemory("test-path-D", "Memory D");
    await createTestMemory("test-path-E", "Memory E");

    // Shorter path: A→B→D
    await createTestLink("test-path-A", "test-path-B", "semantic", 0.8);
    await createTestLink("test-path-B", "test-path-D", "semantic", 0.7);

    // Longer path: A→C→E→D
    await createTestLink("test-path-A", "test-path-C", "semantic", 0.9);
    await createTestLink("test-path-C", "test-path-E", "semantic", 0.8);
    await createTestLink("test-path-E", "test-path-D", "semantic", 0.7);

    // When: Finding path from A to D
    const path = await graphTraversal.findPath("test-path-A", "test-path-D", 5);

    // Then: Should return shorter path (2 hops)
    expect(path).not.toBeNull();
    expect(path!.memories).toHaveLength(3);
    expect(path!.links).toHaveLength(2);
    expect(path!.memories[0].id).toBe("test-path-A");
    expect(path!.memories[1].id).toBe("test-path-B");
    expect(path!.memories[2].id).toBe("test-path-D");
  });

  it("should handle cyclic graphs without infinite loops", async () => {
    // Requirement 2.4: Cycle handling

    // Given: Cycle A→B→C→A with target D reachable from B
    await createTestMemory("test-path-A", "Memory A");
    await createTestMemory("test-path-B", "Memory B");
    await createTestMemory("test-path-C", "Memory C");
    await createTestMemory("test-path-D", "Memory D");

    // Create cycle
    await createTestLink("test-path-A", "test-path-B", "semantic", 0.8);
    await createTestLink("test-path-B", "test-path-C", "semantic", 0.7);
    await createTestLink("test-path-C", "test-path-A", "semantic", 0.9);

    // Add path to target
    await createTestLink("test-path-B", "test-path-D", "semantic", 0.6);

    // When: Finding path from A to D
    const path = await graphTraversal.findPath("test-path-A", "test-path-D", 5);

    // Then: Should find path without infinite loop
    expect(path).not.toBeNull();
    expect(path!.memories).toHaveLength(3);
    expect(path!.memories[0].id).toBe("test-path-A");
    expect(path!.memories[1].id).toBe("test-path-B");
    expect(path!.memories[2].id).toBe("test-path-D");
  });

  it("should return null for non-existent source memory", async () => {
    // Requirement 2.4: Error handling

    // Given: Valid target memory
    await createTestMemory("test-path-target", "Target Memory");

    // When: Finding path from non-existent source
    const path = await graphTraversal.findPath("non-existent-source", "test-path-target", 5);

    // Then: Should return null
    expect(path).toBeNull();
  });

  it("should return null for non-existent target memory", async () => {
    // Requirement 2.4: Error handling

    // Given: Valid source memory
    await createTestMemory("test-path-source", "Source Memory");

    // When: Finding path to non-existent target
    const path = await graphTraversal.findPath("test-path-source", "non-existent-target", 5);

    // Then: Should return null
    expect(path).toBeNull();
  });
});

describe("GraphTraversal - explainPath", () => {
  let db: DatabaseConnectionManager;
  let graphTraversal: GraphTraversal;

  beforeEach(async () => {
    db = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      poolSize: 5,
    });

    await db.connect();
    graphTraversal = new GraphTraversal(db);
  });

  afterEach(async () => {
    if (db) {
      await db.disconnect();
    }
  });

  function createMemory(id: string, content: string): Memory {
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
        category: "test",
        context: "",
        importance: 0.5,
        isAtomic: true,
      },
    };
  }

  it("should generate explanation for multi-step path", async () => {
    // Requirement 2.4: Path explanation generation

    // Given: Path A→B→C
    const path = {
      memories: [
        createMemory("A", "Memory A"),
        createMemory("B", "Memory B"),
        createMemory("C", "Memory C"),
      ],
      links: [
        {
          sourceId: "A",
          targetId: "B",
          linkType: LinkType.Causal,
          weight: 0.85,
          createdAt: new Date(),
          traversalCount: 0,
        },
        {
          sourceId: "B",
          targetId: "C",
          linkType: LinkType.Temporal,
          weight: 0.72,
          createdAt: new Date(),
          traversalCount: 0,
        },
      ],
      totalWeight: 0.785,
      explanation: "",
    };

    // When: Generating explanation
    const explanation = graphTraversal.explainPath(path);

    // Then: Should include all memories, link types, and weights
    expect(explanation).toContain("Memory A");
    expect(explanation).toContain("Memory B");
    expect(explanation).toContain("Memory C");
    expect(explanation).toContain("causal");
    expect(explanation).toContain("temporal");
    expect(explanation).toContain("0.85");
    expect(explanation).toContain("0.72");
    expect(explanation).toContain("0.79"); // total weight
  });

  it("should handle empty path", async () => {
    // Requirement 2.4: Edge case handling

    // Given: Empty path
    const emptyPath = {
      memories: [],
      links: [],
      totalWeight: 0,
      explanation: "",
    };

    // When: Generating explanation
    const explanation = graphTraversal.explainPath(emptyPath);

    // Then: Should return appropriate message
    expect(explanation).toBe("No path found");
  });

  it("should handle single memory path", async () => {
    // Requirement 2.4: Edge case handling

    // Given: Path with single memory
    const singlePath = {
      memories: [createMemory("A", "Memory A")],
      links: [],
      totalWeight: 0,
      explanation: "",
    };

    // When: Generating explanation
    const explanation = graphTraversal.explainPath(singlePath);

    // Then: Should return just the memory content
    expect(explanation).toBe("Memory A");
  });

  it("should truncate long content", async () => {
    // Requirement 2.4: Content truncation

    // Given: Path with memory having long content (>50 chars) and a link
    const longContent = "A".repeat(100);
    const path = {
      memories: [createMemory("A", longContent), createMemory("B", "Short")],
      links: [
        {
          sourceId: "A",
          targetId: "B",
          linkType: LinkType.Semantic,
          weight: 0.8,
          createdAt: new Date(),
          traversalCount: 0,
        },
      ],
      totalWeight: 0.8,
      explanation: "",
    };

    // When: Generating explanation
    const explanation = graphTraversal.explainPath(path);

    // Then: Should truncate long content to 50 chars (47 + "...")
    expect(explanation).toContain("...");
    expect(explanation).toContain("Short"); // Second memory should be included
  });
});

describe("GraphTraversal - expandViaWaypoint", () => {
  let db: DatabaseConnectionManager;
  let graphTraversal: GraphTraversal;

  beforeEach(async () => {
    db = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      poolSize: 5,
    });

    await db.connect();
    graphTraversal = new GraphTraversal(db);

    const client = await db.getConnection();
    try {
      await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-expand-%'");
      await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-expand-%'");
      await client.query("DELETE FROM memories WHERE id LIKE 'test-expand-%'");
    } finally {
      db.releaseConnection(client);
    }
  });

  afterEach(async () => {
    if (db) {
      const client = await db.getConnection();
      try {
        await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-expand-%'");
        await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-expand-%'");
        await client.query("DELETE FROM memories WHERE id LIKE 'test-expand-%'");
      } finally {
        db.releaseConnection(client);
      }
      await db.disconnect();
    }
  });

  async function createTestMemory(id: string, content: string): Promise<void> {
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, strength, user_id, session_id, primary_sector)
         VALUES ($1, $2, NOW(), NOW(), 0, 0.5, 1.0, 'test-user', 'test-session', 'semantic')`,
        [id, content]
      );
      await client.query(
        `INSERT INTO memory_metadata (memory_id, keywords, tags, category, context, importance, is_atomic)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, [], [], "test", "", 0.5, true]
      );
    } finally {
      db.releaseConnection(client);
    }
  }

  async function createTestLink(
    sourceId: string,
    targetId: string,
    linkType: string,
    weight: number
  ): Promise<void> {
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memory_links (source_id, target_id, link_type, weight, created_at, traversal_count)
         VALUES ($1, $2, $3, $4, NOW(), 0)`,
        [sourceId, targetId, linkType, weight]
      );
    } finally {
      db.releaseConnection(client);
    }
  }

  it("should expand for 1 hop", async () => {
    // Requirement 2.3: Waypoint expansion

    // Given: A→B
    await createTestMemory("test-expand-A", "Memory A");
    await createTestMemory("test-expand-B", "Memory B");
    await createTestLink("test-expand-A", "test-expand-B", "semantic", 0.8);

    // When: Expanding 1 hop
    const memories = await graphTraversal.expandViaWaypoint("test-expand-A", 1);

    // Then: Should return A and B
    expect(memories).toHaveLength(2);
    const ids = memories.map((m) => m.id);
    expect(ids).toContain("test-expand-A");
    expect(ids).toContain("test-expand-B");
  });

  it("should expand for multiple hops", async () => {
    // Requirement 2.3: Multi-hop expansion

    // Given: A→B→C→D
    await createTestMemory("test-expand-A", "Memory A");
    await createTestMemory("test-expand-B", "Memory B");
    await createTestMemory("test-expand-C", "Memory C");
    await createTestMemory("test-expand-D", "Memory D");
    await createTestLink("test-expand-A", "test-expand-B", "semantic", 0.8);
    await createTestLink("test-expand-B", "test-expand-C", "semantic", 0.7);
    await createTestLink("test-expand-C", "test-expand-D", "semantic", 0.9);

    // When: Expanding 2 hops
    const memories = await graphTraversal.expandViaWaypoint("test-expand-A", 2);

    // Then: Should return A, B, C
    expect(memories).toHaveLength(3);
  });

  it("should return empty array for negative hops", async () => {
    // Requirement 2.3: Edge case handling

    // Given: Any memory
    await createTestMemory("test-expand-A", "Memory A");

    // When: Expanding with negative hops
    const memories = await graphTraversal.expandViaWaypoint("test-expand-A", -1);

    // Then: Should return empty array
    expect(memories).toHaveLength(0);
  });

  it("should return only start node for 0 hops", async () => {
    // Requirement 2.3: Edge case handling

    // Given: Memory with connections
    await createTestMemory("test-expand-A", "Memory A");
    await createTestMemory("test-expand-B", "Memory B");
    await createTestLink("test-expand-A", "test-expand-B", "semantic", 0.8);

    // When: Expanding 0 hops
    const memories = await graphTraversal.expandViaWaypoint("test-expand-A", 0);

    // Then: Should return only start node
    expect(memories).toHaveLength(1);
    expect(memories[0].id).toBe("test-expand-A");
  });

  it("should handle non-existent start memory", async () => {
    // Requirement 2.3: Error handling

    // When: Expanding from non-existent memory
    const memories = await graphTraversal.expandViaWaypoint("non-existent-id", 2);

    // Then: Should return empty array
    expect(memories).toHaveLength(0);
  });
});

describe("GraphTraversal - Error Handling and Edge Cases", () => {
  let db: DatabaseConnectionManager;
  let graphTraversal: GraphTraversal;

  beforeEach(async () => {
    db = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      poolSize: 5,
    });

    await db.connect();
    graphTraversal = new GraphTraversal(db);

    const client = await db.getConnection();
    try {
      await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-error-%'");
      await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-error-%'");
      await client.query("DELETE FROM memories WHERE id LIKE 'test-error-%'");
    } finally {
      db.releaseConnection(client);
    }
  });

  afterEach(async () => {
    if (db) {
      const client = await db.getConnection();
      try {
        await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-error-%'");
        await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-error-%'");
        await client.query("DELETE FROM memories WHERE id LIKE 'test-error-%'");
      } finally {
        db.releaseConnection(client);
      }
      await db.disconnect();
    }
  });

  async function createTestMemory(id: string, content: string): Promise<void> {
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, strength, user_id, session_id, primary_sector)
         VALUES ($1, $2, NOW(), NOW(), 0, 0.5, 1.0, 'test-user', 'test-session', 'semantic')`,
        [id, content]
      );
      await client.query(
        `INSERT INTO memory_metadata (memory_id, keywords, tags, category, context, importance, is_atomic)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, [], [], "test", "", 0.5, true]
      );
    } finally {
      db.releaseConnection(client);
    }
  }

  async function createTestLink(
    sourceId: string,
    targetId: string,
    linkType: string,
    weight: number
  ): Promise<void> {
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memory_links (source_id, target_id, link_type, weight, created_at, traversal_count)
         VALUES ($1, $2, $3, $4, NOW(), 0)`,
        [sourceId, targetId, linkType, weight]
      );
    } finally {
      db.releaseConnection(client);
    }
  }

  it("should handle memory with missing metadata gracefully", async () => {
    // Requirement 2.4: Error handling

    // Given: Memory without metadata (edge case)
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, strength, user_id, session_id, primary_sector)
         VALUES ($1, $2, NOW(), NOW(), 0, 0.5, 1.0, 'test-user', 'test-session', 'semantic')`,
        ["test-error-no-metadata", "Memory without metadata"]
      );
      // Intentionally not inserting metadata
    } finally {
      db.releaseConnection(client);
    }

    // When: Traversing from this memory
    const result = await graphTraversal.getConnectedMemories("test-error-no-metadata", {
      maxDepth: 1,
    });

    // Then: Should still return the memory with default metadata
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].id).toBe("test-error-no-metadata");
    expect(result.memories[0].metadata).toBeDefined();
  });

  it("should handle broken links gracefully (target memory deleted)", async () => {
    // Requirement 2.4: Error handling

    // Given: Link pointing to non-existent memory
    await createTestMemory("test-error-A", "Memory A");
    await createTestMemory("test-error-B", "Memory B");
    await createTestLink("test-error-A", "test-error-B", "semantic", 0.8);

    // Delete target memory but leave link (simulates orphaned link)
    const client = await db.getConnection();
    try {
      await client.query("DELETE FROM memory_metadata WHERE memory_id = $1", ["test-error-B"]);
      await client.query("DELETE FROM memories WHERE id = $1", ["test-error-B"]);
    } finally {
      db.releaseConnection(client);
    }

    // When: Traversing from A
    const result = await graphTraversal.getConnectedMemories("test-error-A", { maxDepth: 1 });

    // Then: Should return only A (broken link ignored)
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].id).toBe("test-error-A");
  });

  it("should handle DFS with missing memory in traversal path", async () => {
    // Requirement 2.4: DFS error handling

    // Given: Chain where middle node will be deleted after link creation
    await createTestMemory("test-error-A", "Memory A");
    await createTestMemory("test-error-B", "Memory B");
    await createTestMemory("test-error-C", "Memory C");
    await createTestLink("test-error-A", "test-error-B", "semantic", 0.8);
    await createTestLink("test-error-A", "test-error-C", "semantic", 0.7);

    // Delete B after links are created
    const client = await db.getConnection();
    try {
      await client.query("DELETE FROM memory_metadata WHERE memory_id = $1", ["test-error-B"]);
      await client.query("DELETE FROM memories WHERE id = $1", ["test-error-B"]);
    } finally {
      db.releaseConnection(client);
    }

    // When: DFS traversal
    const result = await graphTraversal.getConnectedMemories("test-error-A", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    // Then: Should skip broken link and continue with valid ones
    expect(result.memories.length).toBeGreaterThanOrEqual(2);
    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("test-error-A");
    expect(ids).toContain("test-error-C");
  });

  it("should handle path finding with broken intermediate node", async () => {
    // Requirement 2.4: Path finding error handling

    // Given: Path A→B→C where B will be deleted
    await createTestMemory("test-error-A", "Memory A");
    await createTestMemory("test-error-B", "Memory B");
    await createTestMemory("test-error-C", "Memory C");
    await createTestLink("test-error-A", "test-error-B", "semantic", 0.8);
    await createTestLink("test-error-B", "test-error-C", "semantic", 0.7);

    // Delete intermediate node
    const client = await db.getConnection();
    try {
      await client.query("DELETE FROM memory_metadata WHERE memory_id = $1", ["test-error-B"]);
      await client.query("DELETE FROM memories WHERE id = $1", ["test-error-B"]);
    } finally {
      db.releaseConnection(client);
    }

    // When: Finding path from A to C
    const path = await graphTraversal.findPath("test-error-A", "test-error-C", 5);

    // Then: Should return null (path broken)
    expect(path).toBeNull();
  });

  it("should handle DFS with minWeight filtering", async () => {
    // Requirement 2.5: DFS with weight filtering

    // Given: Tree with varying weights
    await createTestMemory("test-error-A", "Memory A");
    await createTestMemory("test-error-B", "Memory B");
    await createTestMemory("test-error-C", "Memory C");
    await createTestMemory("test-error-D", "Memory D");
    await createTestLink("test-error-A", "test-error-B", "semantic", 0.9);
    await createTestLink("test-error-A", "test-error-C", "semantic", 0.4);
    await createTestLink("test-error-B", "test-error-D", "semantic", 0.8);

    // When: DFS with minWeight 0.5
    const result = await graphTraversal.getConnectedMemories("test-error-A", {
      maxDepth: 2,
      traversalType: "depth-first",
      minWeight: 0.5,
    });

    // Then: Should include A, B, D but not C (weight 0.4)
    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("test-error-A");
    expect(ids).toContain("test-error-B");
    expect(ids).toContain("test-error-D");
    expect(ids).not.toContain("test-error-C");
  });

  it("should handle DFS with non-existent start memory", async () => {
    // Requirement 2.4: DFS error handling for missing start node

    // When: DFS from non-existent memory
    const result = await graphTraversal.getConnectedMemories("non-existent-dfs-start", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    // Then: Should return empty result
    expect(result.memories).toHaveLength(0);
    expect(result.visitedCount).toBe(0);
  });

  it("should handle database query errors in getOutgoingLinks gracefully", async () => {
    // Requirement 2.4: Database error handling

    // Given: Memory with invalid link data that causes query error
    await createTestMemory("test-error-query", "Memory A");

    // Create a corrupted link by inserting invalid data directly
    const client = await db.getConnection();
    try {
      // Insert a link with NULL weight which violates constraint
      await client.query(
        `INSERT INTO memory_links (source_id, target_id, link_type, weight, created_at, traversal_count)
         VALUES ($1, $2, $3, NULL, NOW(), 0)
         ON CONFLICT DO NOTHING`,
        ["test-error-query", "test-error-target", "semantic"]
      );
    } catch {
      // Expected to fail, that's okay
    } finally {
      db.releaseConnection(client);
    }

    // When: Traversing from this memory (should handle query errors)
    const result = await graphTraversal.getConnectedMemories("test-error-query", {
      maxDepth: 1,
    });

    // Then: Should handle error gracefully
    expect(result).toBeDefined();
  });

  it("should handle database connection errors gracefully during traversal", async () => {
    // Requirement 2.4: Database connection error handling

    // Given: Valid memory setup
    await createTestMemory("test-error-conn-A", "Memory A");
    await createTestMemory("test-error-conn-B", "Memory B");
    await createTestLink("test-error-conn-A", "test-error-conn-B", "semantic", 0.8);

    // When: Disconnect database mid-traversal
    await db.disconnect();

    // Try to traverse (will fail to get connections)
    const result = await graphTraversal.getConnectedMemories("test-error-conn-A", {
      maxDepth: 1,
    });

    // Then: Should handle error gracefully without throwing
    expect(result).toBeDefined();
  });

  it("should handle null current node in DFS traversal", async () => {
    // Requirement 2.4: DFS null handling

    // Given: Memory with connections
    await createTestMemory("test-error-dfs-null", "Memory A");
    await createTestMemory("test-error-dfs-B", "Memory B");
    await createTestLink("test-error-dfs-null", "test-error-dfs-B", "semantic", 0.8);

    // When: DFS traversal (internal stack.pop() could return undefined)
    const result = await graphTraversal.getConnectedMemories("test-error-dfs-null", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    // Then: Should complete successfully
    expect(result.memories.length).toBeGreaterThan(0);
  });

  it("should skip null memories in DFS traversal path", async () => {
    // Requirement 2.4: DFS null memory handling

    // Given: Chain where a memory might be null during traversal
    await createTestMemory("test-error-dfs-chain-A", "Memory A");
    await createTestMemory("test-error-dfs-chain-B", "Memory B");
    await createTestMemory("test-error-dfs-chain-C", "Memory C");
    await createTestLink("test-error-dfs-chain-A", "test-error-dfs-chain-B", "semantic", 0.8);
    await createTestLink("test-error-dfs-chain-B", "test-error-dfs-chain-C", "semantic", 0.7);

    // Delete middle memory after links created
    const client = await db.getConnection();
    try {
      await client.query("DELETE FROM memory_metadata WHERE memory_id = $1", [
        "test-error-dfs-chain-B",
      ]);
      await client.query("DELETE FROM memories WHERE id = $1", ["test-error-dfs-chain-B"]);
    } finally {
      db.releaseConnection(client);
    }

    // When: DFS traversal encounters null memory
    const result = await graphTraversal.getConnectedMemories("test-error-dfs-chain-A", {
      maxDepth: 3,
      traversalType: "depth-first",
    });

    // Then: Should skip null memory and continue
    expect(result.memories.length).toBeGreaterThanOrEqual(1);
    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("test-error-dfs-chain-A");
  });
});

describe("GraphTraversal - Database Error Simulation", () => {
  it("should handle database query errors in getOutgoingLinks", async () => {
    // Requirement 2.4: Error handling in getOutgoingLinks

    // Create a mock database that throws errors
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          throw new Error("Simulated database error");
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: Calling getConnectedMemories (which calls getOutgoingLinks internally)
    const result = await graphTraversal.getConnectedMemories("any-id", { maxDepth: 1 });

    // Then: Should handle error gracefully and return empty result
    expect(result.memories).toHaveLength(0);
    expect(result.visitedCount).toBe(0);
  });

  it("should handle database query errors in getMemory", async () => {
    // Requirement 2.4: Error handling in getMemory

    // Create a mock database that throws errors
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          throw new Error("Simulated database error in getMemory");
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: Calling findPath (which calls getMemory internally)
    const path = await graphTraversal.findPath("source-id", "target-id", 5);

    // Then: Should handle error gracefully and return null
    expect(path).toBeNull();
  });

  it("should handle database errors in BFS traversal", async () => {
    // Requirement 2.4: BFS error handling

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          // First call succeeds (getMemory for start node), subsequent calls fail
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            // Metadata query
            return { rows: [] };
          } else {
            // Subsequent queries fail (getOutgoingLinks)
            throw new Error("Database error");
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: BFS traversal with database errors
    const result = await graphTraversal.getConnectedMemories("start-id", { maxDepth: 2 });

    // Then: Should return at least the start node
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].id).toBe("start-id");
  });

  it("should handle database errors in DFS traversal", async () => {
    // Requirement 2.4: DFS error handling

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          // First call succeeds (getMemory for start node check)
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            // Metadata query for start node
            return { rows: [] };
          } else if (callCount === 3) {
            // Second getMemory call in DFS loop
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 4) {
            // Metadata query for second getMemory
            return { rows: [] };
          } else {
            // Subsequent queries fail (getOutgoingLinks)
            throw new Error("Database error");
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: DFS traversal with database errors
    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    // Then: Should return at least the start node
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].id).toBe("start-id");
  });

  it("should skip null memories in DFS when getMemory returns null", async () => {
    // Requirement 2.4: DFS null memory handling (lines 410-411)
    // This test ensures that when getMemory returns null for a memory ID in the DFS stack,
    // the code skips adding it to the memories array but continues traversal

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          // First call: getMemory for start node check (before DFS loop)
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            // Metadata query for start node (before DFS loop)
            return { rows: [] };
          } else if (callCount === 3) {
            // getMemory call in DFS loop for start-id - return it
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 4) {
            // Metadata for start-id in DFS loop
            return { rows: [] };
          } else if (callCount === 5) {
            // getOutgoingLinks for start node - return links to two memories
            return {
              rows: [
                {
                  source_id: "start-id",
                  target_id: "deleted-memory-id",
                  link_type: "semantic",
                  weight: 0.8,
                  created_at: new Date(),
                  traversal_count: 0,
                },
                {
                  source_id: "start-id",
                  target_id: "valid-memory-id",
                  link_type: "semantic",
                  weight: 0.7,
                  created_at: new Date(),
                  traversal_count: 0,
                },
              ],
            };
          } else if (callCount === 6) {
            // getMemory for valid-memory-id (processed first due to stack LIFO)
            return {
              rows: [
                {
                  id: "valid-memory-id",
                  content: "Valid memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 7) {
            // Metadata for valid-memory-id
            return { rows: [] };
          } else if (callCount === 8) {
            // getOutgoingLinks for valid-memory-id
            return { rows: [] };
          } else if (callCount === 9) {
            // getMemory for deleted-memory-id - return null (no rows) - THIS HITS LINE 410-411
            return { rows: [] };
          } else if (callCount === 10) {
            // Metadata query for deleted-memory-id (won't be called since rows is empty)
            return { rows: [] };
          } else {
            // Any other calls return empty
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: DFS traversal where getMemory returns null for a linked node
    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    // Then: Should skip the null memory and not crash
    expect(result).toBeDefined();
    expect(result.memories).toHaveLength(2); // start-id and valid-memory-id
    expect(result.memories[0].id).toBe("start-id");
    expect(result.memories[1].id).toBe("valid-memory-id");
    expect(result.visitedCount).toBe(3); // Visited start-id, valid-memory-id, and deleted-memory-id
  });

  it("should skip null memories in BFS when getMemory returns null", async () => {
    // Requirement 2.4: BFS null memory handling (lines 397-398)

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          // First call: getMemory for start node check
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            // Metadata query for start node
            return { rows: [] };
          } else if (callCount === 3) {
            // getOutgoingLinks for start node - return a link to a non-existent memory
            return {
              rows: [
                {
                  source_id: "start-id",
                  target_id: "deleted-memory-id",
                  link_type: "semantic",
                  weight: 0.8,
                  created_at: new Date(),
                  traversal_count: 0,
                },
              ],
            };
          } else if (callCount === 4) {
            // getMemory for deleted-memory-id - return null (no rows)
            return { rows: [] };
          } else {
            // Any other calls return empty
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: BFS traversal where getMemory returns null for a linked node
    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 2,
      traversalType: "breadth-first",
    });

    // Then: Should skip the null memory and not crash
    expect(result).toBeDefined();
    expect(result.memories).toHaveLength(1); // Only start-id
    expect(result.memories[0].id).toBe("start-id");
    expect(result.visitedCount).toBe(2); // Visited start-id and deleted-memory-id
  });

  it("should handle BFS without minWeight filter", async () => {
    // Requirement 2.4: BFS without weight filtering (line 356 else branch)

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return {
              rows: [
                {
                  source_id: "start-id",
                  target_id: "target-id",
                  link_type: "semantic",
                  weight: 0.3,
                  created_at: new Date(),
                  traversal_count: 0,
                },
              ],
            };
          } else if (callCount === 4) {
            return {
              rows: [
                {
                  id: "target-id",
                  content: "Target memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 5) {
            return { rows: [] };
          } else {
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: BFS without minWeight (should use else branch)
    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
      // No minWeight specified
    });

    // Then: Should include all links regardless of weight
    expect(result.memories).toHaveLength(2);
  });

  it("should handle DFS without minWeight filter", async () => {
    // Requirement 2.4: DFS without weight filtering (line 430 else branch)

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 4) {
            return { rows: [] };
          } else if (callCount === 5) {
            return {
              rows: [
                {
                  source_id: "start-id",
                  target_id: "target-id",
                  link_type: "semantic",
                  weight: 0.3,
                  created_at: new Date(),
                  traversal_count: 0,
                },
              ],
            };
          } else if (callCount === 6) {
            return {
              rows: [
                {
                  id: "target-id",
                  content: "Target memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 7) {
            return { rows: [] };
          } else if (callCount === 8) {
            return { rows: [] };
          } else {
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: DFS without minWeight (should use else branch)
    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
      traversalType: "depth-first",
      // No minWeight specified
    });

    // Then: Should include all links regardless of weight
    expect(result.memories).toHaveLength(2);
  });

  it("should default to breadth-first traversal when traversalType is undefined", async () => {
    // Requirement 2.4: Default traversal type (line 44 else branch)
    // This test ensures that when traversalType is not specified, BFS is used by default

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return {
              rows: [
                {
                  source_id: "start-id",
                  target_id: "target-id",
                  link_type: "semantic",
                  weight: 0.8,
                  created_at: new Date(),
                  traversal_count: 0,
                },
              ],
            };
          } else if (callCount === 4) {
            return {
              rows: [
                {
                  id: "target-id",
                  content: "Target memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 5) {
            return { rows: [] };
          } else {
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: Calling getConnectedMemories without specifying traversalType
    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
      // traversalType is undefined - should default to BFS
    });

    // Then: Should use BFS and return results
    expect(result).toBeDefined();
    expect(result.memories).toHaveLength(2);
    expect(result.visitedCount).toBe(2);
  });

  it("should skip already visited nodes in DFS traversal", async () => {
    // Requirement 2.4: DFS already-visited check (lines 410-411)
    // This test ensures the "if (visited.has(current.memoryId)) continue" branch is hit

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          // First call: getMemory for start node check
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            // Metadata query for start node
            return { rows: [] };
          } else if (callCount === 3) {
            // getMemory for start-id in DFS loop
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 4) {
            // Metadata for start-id
            return { rows: [] };
          } else if (callCount === 5) {
            // getOutgoingLinks - return two links that point to same target (creates duplicate in stack)
            return {
              rows: [
                {
                  source_id: "start-id",
                  target_id: "shared-target",
                  link_type: "semantic",
                  weight: 0.9,
                  created_at: new Date(),
                  traversal_count: 0,
                },
                {
                  source_id: "start-id",
                  target_id: "shared-target",
                  link_type: "causal",
                  weight: 0.8,
                  created_at: new Date(),
                  traversal_count: 0,
                },
              ],
            };
          } else if (callCount === 6) {
            // getMemory for shared-target (first time)
            return {
              rows: [
                {
                  id: "shared-target",
                  content: "Shared target memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 7) {
            // Metadata for shared-target
            return { rows: [] };
          } else if (callCount === 8) {
            // getOutgoingLinks for shared-target
            return { rows: [] };
          } else {
            // Any other calls return empty
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: DFS traversal with duplicate target IDs in stack
    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    // Then: Should visit each node only once (hits the visited check)
    expect(result).toBeDefined();
    expect(result.memories).toHaveLength(2); // start-id and shared-target
    expect(result.visitedCount).toBe(2); // Only 2 unique nodes visited
  });
});

describe("GraphTraversal - Path Finding Edge Cases", () => {
  it("should find path when maxDepth exactly matches required depth", async () => {
    // Requirement 2.4: Test maxDepth boundary conditions in findPath

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          if (callCount === 1) {
            // getMemory for source
            return {
              rows: [
                {
                  id: "source-id",
                  content: "Source memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            // Metadata for source
            return { rows: [] };
          } else if (callCount === 3) {
            // getOutgoingLinks for source
            return {
              rows: [
                {
                  source_id: "source-id",
                  target_id: "target-id",
                  link_type: "semantic",
                  weight: 0.8,
                  created_at: new Date(),
                  traversal_count: 0,
                },
              ],
            };
          } else if (callCount === 4) {
            // getMemory for target
            return {
              rows: [
                {
                  id: "target-id",
                  content: "Target memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 5) {
            // Metadata for target
            return { rows: [] };
          } else {
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: Finding path with exact maxDepth needed
    const path = await graphTraversal.findPath("source-id", "target-id", 1);

    // Then: Should find the path
    expect(path).not.toBeNull();
    expect(path!.memories).toHaveLength(2);
  });

  it("should handle isolated nodes with no outgoing links in BFS", async () => {
    // Requirement 2.4: Test BFS with no outgoing links

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "isolated-id",
                  content: "Isolated memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            // getOutgoingLinks returns empty array
            return { rows: [] };
          } else {
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: BFS with no outgoing links
    const result = await graphTraversal.getConnectedMemories("isolated-id", {
      maxDepth: 2,
    });

    // Then: Should return only the start node
    expect(result.memories).toHaveLength(1);
    expect(result.visitedCount).toBe(1);
  });

  it("should handle isolated nodes with no outgoing links in DFS", async () => {
    // Requirement 2.4: Test DFS with no outgoing links

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "isolated-id",
                  content: "Isolated memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            // getMemory in DFS loop
            return {
              rows: [
                {
                  id: "isolated-id",
                  content: "Isolated memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 4) {
            return { rows: [] };
          } else if (callCount === 5) {
            // getOutgoingLinks returns empty array
            return { rows: [] };
          } else {
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: DFS with no outgoing links
    const result = await graphTraversal.getConnectedMemories("isolated-id", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    // Then: Should return only the start node
    expect(result.memories).toHaveLength(1);
    expect(result.visitedCount).toBe(1);
  });

  it("should handle BFS with minWeight filtering all links", async () => {
    // Requirement 2.5: Test BFS when minWeight filters out all links
    // This helps cover the minWeight branch more thoroughly

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            // getOutgoingLinks returns links with low weights
            return {
              rows: [
                {
                  source_id: "start-id",
                  target_id: "target-id",
                  link_type: "semantic",
                  weight: 0.1,
                  created_at: new Date(),
                  traversal_count: 0,
                },
              ],
            };
          } else {
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: BFS with minWeight that filters out all links
    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 2,
      minWeight: 0.5,
    });

    // Then: Should return only the start node
    expect(result.memories).toHaveLength(1);
    expect(result.visitedCount).toBe(1);
  });

  it("should handle DFS with minWeight filtering all links", async () => {
    // Requirement 2.5: Test DFS when minWeight filters out all links
    // This helps cover the minWeight branch more thoroughly

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            // getMemory in DFS loop
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 4) {
            return { rows: [] };
          } else if (callCount === 5) {
            // getOutgoingLinks returns links with low weights
            return {
              rows: [
                {
                  source_id: "start-id",
                  target_id: "target-id",
                  link_type: "semantic",
                  weight: 0.1,
                  created_at: new Date(),
                  traversal_count: 0,
                },
              ],
            };
          } else {
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: DFS with minWeight that filters out all links
    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 2,
      traversalType: "depth-first",
      minWeight: 0.5,
    });

    // Then: Should return only the start node
    expect(result.memories).toHaveLength(1);
    expect(result.visitedCount).toBe(1);
  });
});

describe("GraphTraversal - Explicit Option Combinations", () => {
  it("should apply all traversal options in BFS", async () => {
    // Requirement 2.4: Test BFS with maxDepth, minWeight, and linkTypes

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return {
              rows: [
                {
                  source_id: "start-id",
                  target_id: "target-id",
                  link_type: "semantic",
                  weight: 0.8,
                  created_at: new Date(),
                  traversal_count: 0,
                },
              ],
            };
          } else if (callCount === 4) {
            return {
              rows: [
                {
                  id: "target-id",
                  content: "Target memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 5) {
            return { rows: [] };
          } else {
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: BFS with all options explicitly set
    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
      minWeight: 0.5,
      traversalType: "breadth-first",
      includePaths: false,
    });

    // Then: Should return results
    expect(result.memories).toHaveLength(2);
  });

  it("should apply all traversal options in DFS", async () => {
    // Requirement 2.4: Test DFS with maxDepth, minWeight, and linkTypes

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 4) {
            return { rows: [] };
          } else if (callCount === 5) {
            return {
              rows: [
                {
                  source_id: "start-id",
                  target_id: "target-id",
                  link_type: "semantic",
                  weight: 0.8,
                  created_at: new Date(),
                  traversal_count: 0,
                },
              ],
            };
          } else if (callCount === 6) {
            return {
              rows: [
                {
                  id: "target-id",
                  content: "Target memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 7) {
            return { rows: [] };
          } else if (callCount === 8) {
            return { rows: [] };
          } else {
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: DFS with all options explicitly set
    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
      minWeight: 0.5,
      traversalType: "depth-first",
      includePaths: false,
    });

    // Then: Should return results
    expect(result.memories).toHaveLength(2);
  });

  it("should handle BFS with minWeight as 0", async () => {
    // Requirement 2.5: Test BFS with minWeight explicitly set to 0
    // This tests the truthy check for minWeight

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return {
              rows: [
                {
                  source_id: "start-id",
                  target_id: "target-id",
                  link_type: "semantic",
                  weight: 0.0,
                  created_at: new Date(),
                  traversal_count: 0,
                },
              ],
            };
          } else if (callCount === 4) {
            return {
              rows: [
                {
                  id: "target-id",
                  content: "Target memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 5) {
            return { rows: [] };
          } else {
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: BFS with minWeight = 0 (falsy but valid)
    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
      minWeight: 0,
    });

    // Then: Should include links with weight >= 0
    expect(result.memories).toHaveLength(2);
  });

  it("should handle DFS with minWeight as 0", async () => {
    // Requirement 2.5: Test DFS with minWeight explicitly set to 0
    // This tests the truthy check for minWeight

    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async (_sql: string) => {
          callCount++;
          if (callCount === 1) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return {
              rows: [
                {
                  id: "start-id",
                  content: "Start memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 4) {
            return { rows: [] };
          } else if (callCount === 5) {
            return {
              rows: [
                {
                  source_id: "start-id",
                  target_id: "target-id",
                  link_type: "semantic",
                  weight: 0.0,
                  created_at: new Date(),
                  traversal_count: 0,
                },
              ],
            };
          } else if (callCount === 6) {
            return {
              rows: [
                {
                  id: "target-id",
                  content: "Target memory",
                  created_at: new Date(),
                  last_accessed: new Date(),
                  access_count: 0,
                  salience: 0.5,
                  strength: 1.0,
                  user_id: "test-user",
                  session_id: "test-session",
                  primary_sector: "semantic",
                },
              ],
            };
          } else if (callCount === 7) {
            return { rows: [] };
          } else if (callCount === 8) {
            return { rows: [] };
          } else {
            return { rows: [] };
          }
        },
      }),
      releaseConnection: () => {},
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    // When: DFS with minWeight = 0 (falsy but valid)
    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
      traversalType: "depth-first",
      minWeight: 0,
    });

    // Then: Should include links with weight >= 0
    expect(result.memories).toHaveLength(2);
  });
});

describe("GraphTraversal - Boundary Condition Coverage", () => {
  let db: DatabaseConnectionManager;
  let graphTraversal: GraphTraversal;

  beforeEach(async () => {
    db = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      poolSize: 5,
    });

    await db.connect();
    graphTraversal = new GraphTraversal(db);

    const client = await db.getConnection();
    try {
      await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-boundary-%'");
      await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-boundary-%'");
      await client.query("DELETE FROM memories WHERE id LIKE 'test-boundary-%'");
    } finally {
      db.releaseConnection(client);
    }
  });

  afterEach(async () => {
    if (db) {
      const client = await db.getConnection();
      try {
        await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-boundary-%'");
        await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-boundary-%'");
        await client.query("DELETE FROM memories WHERE id LIKE 'test-boundary-%'");
      } finally {
        db.releaseConnection(client);
      }
      await db.disconnect();
    }
  });

  async function createTestMemory(id: string, content: string): Promise<void> {
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, strength, user_id, session_id, primary_sector)
         VALUES ($1, $2, NOW(), NOW(), 0, 0.5, 1.0, 'test-user', 'test-session', 'semantic')`,
        [id, content]
      );
      await client.query(
        `INSERT INTO memory_metadata (memory_id, keywords, tags, category, context, importance, is_atomic)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, [], [], "test", "", 0.5, true]
      );
    } finally {
      db.releaseConnection(client);
    }
  }

  async function createTestLink(
    sourceId: string,
    targetId: string,
    linkType: string,
    weight: number
  ): Promise<void> {
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memory_links (source_id, target_id, link_type, weight, created_at, traversal_count)
         VALUES ($1, $2, $3, $4, NOW(), 0)`,
        [sourceId, targetId, linkType, weight]
      );
    } finally {
      db.releaseConnection(client);
    }
  }

  it("should explicitly test DFS visited check (line 406) - diamond graph pattern", async () => {
    // Requirement 2.4: DFS visited check optimization
    // This test creates a diamond pattern where node D can be reached via two paths:
    // A → B → D and A → C → D
    // The DFS visited check (line 406) should prevent D from being processed twice

    // Given: Diamond graph A → B → D, A → C → D
    await createTestMemory("test-boundary-A", "Memory A");
    await createTestMemory("test-boundary-B", "Memory B");
    await createTestMemory("test-boundary-C", "Memory C");
    await createTestMemory("test-boundary-D", "Memory D");

    // Create diamond pattern
    await createTestLink("test-boundary-A", "test-boundary-B", "semantic", 0.9);
    await createTestLink("test-boundary-A", "test-boundary-C", "semantic", 0.8);
    await createTestLink("test-boundary-B", "test-boundary-D", "semantic", 0.7);
    await createTestLink("test-boundary-C", "test-boundary-D", "semantic", 0.6);

    // When: DFS traversal from A
    const result = await graphTraversal.getConnectedMemories("test-boundary-A", {
      maxDepth: 3,
      traversalType: "depth-first",
    });

    // Then: Should visit D only once despite two paths leading to it
    expect(result.memories).toHaveLength(4); // A, B, C, D
    expect(result.visitedCount).toBe(4); // Each node visited exactly once

    // Verify D appears exactly once in the result
    const dCount = result.memories.filter((m) => m.id === "test-boundary-D").length;
    expect(dCount).toBe(1);
  });

  it("should explicitly test DFS visited check (line 406) - complex multi-path graph", async () => {
    // Requirement 2.4: DFS visited check with multiple convergent paths
    // This test creates a more complex graph where node E can be reached via multiple paths:
    // A → B → E, A → C → E, A → D → E
    // The visited check should prevent E from being added multiple times

    // Given: Multi-path graph converging at E
    await createTestMemory("test-boundary-multi-A", "Memory A");
    await createTestMemory("test-boundary-multi-B", "Memory B");
    await createTestMemory("test-boundary-multi-C", "Memory C");
    await createTestMemory("test-boundary-multi-D", "Memory D");
    await createTestMemory("test-boundary-multi-E", "Memory E");

    // Create multiple paths to E
    await createTestLink("test-boundary-multi-A", "test-boundary-multi-B", "semantic", 0.9);
    await createTestLink("test-boundary-multi-A", "test-boundary-multi-C", "semantic", 0.8);
    await createTestLink("test-boundary-multi-A", "test-boundary-multi-D", "semantic", 0.7);
    await createTestLink("test-boundary-multi-B", "test-boundary-multi-E", "semantic", 0.6);
    await createTestLink("test-boundary-multi-C", "test-boundary-multi-E", "semantic", 0.5);
    await createTestLink("test-boundary-multi-D", "test-boundary-multi-E", "semantic", 0.4);

    // When: DFS traversal from A with sufficient depth
    const result = await graphTraversal.getConnectedMemories("test-boundary-multi-A", {
      maxDepth: 3,
      traversalType: "depth-first",
    });

    // Then: Should visit E only once despite three paths leading to it
    expect(result.memories).toHaveLength(5); // A, B, C, D, E
    expect(result.visitedCount).toBe(5); // Each node visited exactly once

    // Verify E appears exactly once
    const eCount = result.memories.filter((m) => m.id === "test-boundary-multi-E").length;
    expect(eCount).toBe(1);
  });

  it("should explicitly test DFS minWeight undefined branch (line 430) - no filtering", async () => {
    // Requirement 2.5: DFS without minWeight filtering (else branch at line 430)
    // When minWeight is undefined, all links should be included regardless of weight

    // Given: Links with varying weights including very low weights
    await createTestMemory("test-boundary-weight-A", "Memory A");
    await createTestMemory("test-boundary-weight-B", "Memory B");
    await createTestMemory("test-boundary-weight-C", "Memory C");
    await createTestMemory("test-boundary-weight-D", "Memory D");

    // Create links with different weights, including very low ones
    await createTestLink("test-boundary-weight-A", "test-boundary-weight-B", "semantic", 0.9);
    await createTestLink("test-boundary-weight-A", "test-boundary-weight-C", "semantic", 0.1); // Very low weight
    await createTestLink("test-boundary-weight-A", "test-boundary-weight-D", "semantic", 0.05); // Very low weight

    // When: DFS without minWeight (undefined)
    const result = await graphTraversal.getConnectedMemories("test-boundary-weight-A", {
      maxDepth: 1,
      traversalType: "depth-first",
      // minWeight is undefined - should use else branch at line 430
    });

    // Then: Should include ALL links regardless of weight
    expect(result.memories).toHaveLength(4); // A, B, C, D
    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("test-boundary-weight-A");
    expect(ids).toContain("test-boundary-weight-B");
    expect(ids).toContain("test-boundary-weight-C"); // Low weight included
    expect(ids).toContain("test-boundary-weight-D"); // Very low weight included
  });

  it("should explicitly test DFS minWeight defined branch (line 430) - with filtering", async () => {
    // Requirement 2.5: DFS with minWeight filtering (if branch at line 430)
    // When minWeight is defined, only links meeting the threshold should be included

    // Given: Links with varying weights
    await createTestMemory("test-boundary-filter-A", "Memory A");
    await createTestMemory("test-boundary-filter-B", "Memory B");
    await createTestMemory("test-boundary-filter-C", "Memory C");
    await createTestMemory("test-boundary-filter-D", "Memory D");
    await createTestMemory("test-boundary-filter-E", "Memory E");

    // Create links with specific weights to test filtering
    await createTestLink("test-boundary-filter-A", "test-boundary-filter-B", "semantic", 0.9); // Above threshold
    await createTestLink("test-boundary-filter-A", "test-boundary-filter-C", "semantic", 0.7); // Above threshold
    await createTestLink("test-boundary-filter-A", "test-boundary-filter-D", "semantic", 0.5); // At threshold
    await createTestLink("test-boundary-filter-A", "test-boundary-filter-E", "semantic", 0.3); // Below threshold

    // When: DFS with minWeight = 0.5 (defined)
    const result = await graphTraversal.getConnectedMemories("test-boundary-filter-A", {
      maxDepth: 1,
      traversalType: "depth-first",
      minWeight: 0.5, // Defined - should use if branch at line 430
    });

    // Then: Should include only links with weight >= 0.5
    expect(result.memories).toHaveLength(4); // A, B, C, D (not E)
    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("test-boundary-filter-A");
    expect(ids).toContain("test-boundary-filter-B"); // 0.9 >= 0.5
    expect(ids).toContain("test-boundary-filter-C"); // 0.7 >= 0.5
    expect(ids).toContain("test-boundary-filter-D"); // 0.5 >= 0.5
    expect(ids).not.toContain("test-boundary-filter-E"); // 0.3 < 0.5 - filtered out
  });

  it("should test DFS minWeight edge case - weight exactly at threshold", async () => {
    // Requirement 2.5: DFS minWeight boundary condition
    // Test that links with weight exactly equal to minWeight are included

    // Given: Links with weights at and around threshold
    await createTestMemory("test-boundary-edge-A", "Memory A");
    await createTestMemory("test-boundary-edge-B", "Memory B");
    await createTestMemory("test-boundary-edge-C", "Memory C");
    await createTestMemory("test-boundary-edge-D", "Memory D");

    await createTestLink("test-boundary-edge-A", "test-boundary-edge-B", "semantic", 0.601); // Just above
    await createTestLink("test-boundary-edge-A", "test-boundary-edge-C", "semantic", 0.6); // Exactly at
    await createTestLink("test-boundary-edge-A", "test-boundary-edge-D", "semantic", 0.599); // Just below

    // When: DFS with minWeight = 0.6
    const result = await graphTraversal.getConnectedMemories("test-boundary-edge-A", {
      maxDepth: 1,
      traversalType: "depth-first",
      minWeight: 0.6,
    });

    // Then: Should include B and C (>= 0.6) but not D (< 0.6)
    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("test-boundary-edge-B"); // 0.601 >= 0.6
    expect(ids).toContain("test-boundary-edge-C"); // 0.6 >= 0.6 (exactly at threshold)
    expect(ids).not.toContain("test-boundary-edge-D"); // 0.599 < 0.6
  });

  it("should test DFS minWeight = 0 - includes all links", async () => {
    // Requirement 2.5: DFS minWeight with zero threshold
    // When minWeight is 0, all links should be included (even those with 0 weight)

    // Given: Links including one with 0 weight
    await createTestMemory("test-boundary-zero-A", "Memory A");
    await createTestMemory("test-boundary-zero-B", "Memory B");
    await createTestMemory("test-boundary-zero-C", "Memory C");

    await createTestLink("test-boundary-zero-A", "test-boundary-zero-B", "semantic", 0.5);
    await createTestLink("test-boundary-zero-A", "test-boundary-zero-C", "semantic", 0.0); // Zero weight

    // When: DFS with minWeight = 0
    const result = await graphTraversal.getConnectedMemories("test-boundary-zero-A", {
      maxDepth: 1,
      traversalType: "depth-first",
      minWeight: 0,
    });

    // Then: Should include all links including zero-weight link
    expect(result.memories).toHaveLength(3); // A, B, C
    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("test-boundary-zero-C"); // Zero weight link included
  });
});
