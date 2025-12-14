/**
 * Graph Traversal Queue/Stack Edge Cases Tests
 *
 * Tests for edge cases related to queue and stack operations in BFS and DFS traversal.
 * Specifically tests scenarios where queue.shift() or stack.pop() might return undefined.
 *
 * Requirements: 2.4
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../../database/connection-manager";
import { GraphTraversal } from "../../../graph/graph-traversal";

describe("GraphTraversal - Queue and Stack Edge Cases", () => {
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
      await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-queue-%'");
      await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-queue-%'");
      await client.query("DELETE FROM memories WHERE id LIKE 'test-queue-%'");
    } finally {
      db.releaseConnection(client);
    }
  });

  afterEach(async () => {
    if (db) {
      const client = await db.getConnection();
      try {
        await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-queue-%'");
        await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-queue-%'");
        await client.query("DELETE FROM memories WHERE id LIKE 'test-queue-%'");
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

  it("should handle BFS traversal with empty queue gracefully", async () => {
    // Requirement 2.4: Test BFS queue.shift() returning undefined
    // This tests the continue statement when queue.shift() returns undefined

    // Given: Single memory with no connections
    await createTestMemory("test-queue-bfs-single", "Single memory");

    // When: BFS traversal (queue will become empty after processing start node)
    const result = await graphTraversal.getConnectedMemories("test-queue-bfs-single", {
      maxDepth: 3,
      traversalType: "breadth-first",
    });

    // Then: Should complete successfully with just the start node
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].id).toBe("test-queue-bfs-single");
    expect(result.visitedCount).toBe(1);
  });

  it("should handle DFS traversal with empty stack gracefully", async () => {
    // Requirement 2.4: Test DFS stack.pop() returning undefined
    // This tests the continue statement when stack.pop() returns undefined

    // Given: Single memory with no connections
    await createTestMemory("test-queue-dfs-single", "Single memory");

    // When: DFS traversal (stack will become empty after processing start node)
    const result = await graphTraversal.getConnectedMemories("test-queue-dfs-single", {
      maxDepth: 3,
      traversalType: "depth-first",
    });

    // Then: Should complete successfully with just the start node
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].id).toBe("test-queue-dfs-single");
    expect(result.visitedCount).toBe(1);
  });

  it("should handle BFS with multiple disconnected branches", async () => {
    // Requirement 2.4: Test BFS queue operations with complex graph structure

    // Given: Memory A with two branches that don't connect to each other
    await createTestMemory("test-queue-bfs-A", "Memory A");
    await createTestMemory("test-queue-bfs-B", "Memory B");
    await createTestMemory("test-queue-bfs-C", "Memory C");
    await createTestMemory("test-queue-bfs-D", "Memory D");
    await createTestMemory("test-queue-bfs-E", "Memory E");

    // Create two separate branches from A
    await createTestLink("test-queue-bfs-A", "test-queue-bfs-B", "semantic", 0.8);
    await createTestLink("test-queue-bfs-A", "test-queue-bfs-C", "semantic", 0.7);
    await createTestLink("test-queue-bfs-B", "test-queue-bfs-D", "semantic", 0.6);
    await createTestLink("test-queue-bfs-C", "test-queue-bfs-E", "semantic", 0.5);

    // When: BFS traversal with depth 2
    const result = await graphTraversal.getConnectedMemories("test-queue-bfs-A", {
      maxDepth: 2,
      traversalType: "breadth-first",
    });

    // Then: Should visit all reachable nodes in BFS order
    expect(result.memories).toHaveLength(5);
    expect(result.visitedCount).toBe(5);
  });

  it("should handle DFS with multiple disconnected branches", async () => {
    // Requirement 2.4: Test DFS stack operations with complex graph structure

    // Given: Memory A with two branches that don't connect to each other
    await createTestMemory("test-queue-dfs-A", "Memory A");
    await createTestMemory("test-queue-dfs-B", "Memory B");
    await createTestMemory("test-queue-dfs-C", "Memory C");
    await createTestMemory("test-queue-dfs-D", "Memory D");
    await createTestMemory("test-queue-dfs-E", "Memory E");

    // Create two separate branches from A
    await createTestLink("test-queue-dfs-A", "test-queue-dfs-B", "semantic", 0.8);
    await createTestLink("test-queue-dfs-A", "test-queue-dfs-C", "semantic", 0.7);
    await createTestLink("test-queue-dfs-B", "test-queue-dfs-D", "semantic", 0.6);
    await createTestLink("test-queue-dfs-C", "test-queue-dfs-E", "semantic", 0.5);

    // When: DFS traversal with depth 2
    const result = await graphTraversal.getConnectedMemories("test-queue-dfs-A", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    // Then: Should visit all reachable nodes in DFS order
    expect(result.memories).toHaveLength(5);
    expect(result.visitedCount).toBe(5);
  });

  it("should handle findPath with empty queue when no path exists", async () => {
    // Requirement 2.4: Test findPath queue.shift() returning undefined

    // Given: Two disconnected memories
    await createTestMemory("test-queue-path-A", "Memory A");
    await createTestMemory("test-queue-path-B", "Memory B");

    // When: Finding path between disconnected memories
    const path = await graphTraversal.findPath("test-queue-path-A", "test-queue-path-B", 5);

    // Then: Should return null after exhausting queue
    expect(path).toBeNull();
  });

  it("should handle findPath with single-node path", async () => {
    // Requirement 2.4: Test findPath when source equals target

    // Given: Single memory
    await createTestMemory("test-queue-path-single", "Memory");

    // When: Finding path from memory to itself
    const path = await graphTraversal.findPath(
      "test-queue-path-single",
      "test-queue-path-single",
      5
    );

    // Then: Should return path with single memory and no links
    expect(path).not.toBeNull();
    expect(path!.memories).toHaveLength(1);
    expect(path!.links).toHaveLength(0);
    expect(path!.totalWeight).toBe(0);
  });

  it("should handle BFS with all links filtered out by minWeight", async () => {
    // Requirement 2.4: Test BFS when all links are below minWeight threshold

    // Given: Memory with links all below threshold
    await createTestMemory("test-queue-filter-A", "Memory A");
    await createTestMemory("test-queue-filter-B", "Memory B");
    await createTestMemory("test-queue-filter-C", "Memory C");
    await createTestLink("test-queue-filter-A", "test-queue-filter-B", "semantic", 0.2);
    await createTestLink("test-queue-filter-A", "test-queue-filter-C", "semantic", 0.3);

    // When: BFS with high minWeight threshold
    const result = await graphTraversal.getConnectedMemories("test-queue-filter-A", {
      maxDepth: 2,
      minWeight: 0.5,
      traversalType: "breadth-first",
    });

    // Then: Should return only start node (all links filtered)
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].id).toBe("test-queue-filter-A");
    expect(result.visitedCount).toBe(1);
  });

  it("should handle DFS with all links filtered out by minWeight", async () => {
    // Requirement 2.4: Test DFS when all links are below minWeight threshold

    // Given: Memory with links all below threshold
    await createTestMemory("test-queue-dfs-filter-A", "Memory A");
    await createTestMemory("test-queue-dfs-filter-B", "Memory B");
    await createTestMemory("test-queue-dfs-filter-C", "Memory C");
    await createTestLink("test-queue-dfs-filter-A", "test-queue-dfs-filter-B", "semantic", 0.2);
    await createTestLink("test-queue-dfs-filter-A", "test-queue-dfs-filter-C", "semantic", 0.3);

    // When: DFS with high minWeight threshold
    const result = await graphTraversal.getConnectedMemories("test-queue-dfs-filter-A", {
      maxDepth: 2,
      minWeight: 0.5,
      traversalType: "depth-first",
    });

    // Then: Should return only start node (all links filtered)
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].id).toBe("test-queue-dfs-filter-A");
    expect(result.visitedCount).toBe(1);
  });

  it("should handle expandViaWaypoint with isolated memory", async () => {
    // Requirement 2.3: Test waypoint expansion with no connections

    // Given: Isolated memory
    await createTestMemory("test-queue-expand-isolated", "Isolated memory");

    // When: Expanding via waypoint
    const memories = await graphTraversal.expandViaWaypoint("test-queue-expand-isolated", 3);

    // Then: Should return only the start memory
    expect(memories).toHaveLength(1);
    expect(memories[0].id).toBe("test-queue-expand-isolated");
  });

  it("should handle BFS traversal reaching maxDepth with pending queue items", async () => {
    // Requirement 2.4: Test BFS maxDepth boundary with items still in queue

    // Given: Deep chain A→B→C→D→E
    await createTestMemory("test-queue-depth-A", "Memory A");
    await createTestMemory("test-queue-depth-B", "Memory B");
    await createTestMemory("test-queue-depth-C", "Memory C");
    await createTestMemory("test-queue-depth-D", "Memory D");
    await createTestMemory("test-queue-depth-E", "Memory E");
    await createTestLink("test-queue-depth-A", "test-queue-depth-B", "semantic", 0.8);
    await createTestLink("test-queue-depth-B", "test-queue-depth-C", "semantic", 0.7);
    await createTestLink("test-queue-depth-C", "test-queue-depth-D", "semantic", 0.6);
    await createTestLink("test-queue-depth-D", "test-queue-depth-E", "semantic", 0.5);

    // When: BFS with maxDepth 2 (should stop before reaching E)
    const result = await graphTraversal.getConnectedMemories("test-queue-depth-A", {
      maxDepth: 2,
      traversalType: "breadth-first",
    });

    // Then: Should return A, B, C (depth 0, 1, 2) but not D or E
    expect(result.memories).toHaveLength(3);
    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("test-queue-depth-A");
    expect(ids).toContain("test-queue-depth-B");
    expect(ids).toContain("test-queue-depth-C");
    expect(ids).not.toContain("test-queue-depth-D");
    expect(ids).not.toContain("test-queue-depth-E");
  });

  it("should handle DFS traversal reaching maxDepth with pending stack items", async () => {
    // Requirement 2.4: Test DFS maxDepth boundary with items still in stack

    // Given: Deep chain A→B→C→D→E
    await createTestMemory("test-queue-dfs-depth-A", "Memory A");
    await createTestMemory("test-queue-dfs-depth-B", "Memory B");
    await createTestMemory("test-queue-dfs-depth-C", "Memory C");
    await createTestMemory("test-queue-dfs-depth-D", "Memory D");
    await createTestMemory("test-queue-dfs-depth-E", "Memory E");
    await createTestLink("test-queue-dfs-depth-A", "test-queue-dfs-depth-B", "semantic", 0.8);
    await createTestLink("test-queue-dfs-depth-B", "test-queue-dfs-depth-C", "semantic", 0.7);
    await createTestLink("test-queue-dfs-depth-C", "test-queue-dfs-depth-D", "semantic", 0.6);
    await createTestLink("test-queue-dfs-depth-D", "test-queue-dfs-depth-E", "semantic", 0.5);

    // When: DFS with maxDepth 2 (should stop before reaching E)
    const result = await graphTraversal.getConnectedMemories("test-queue-dfs-depth-A", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    // Then: Should return A, B, C (depth 0, 1, 2) but not D or E
    expect(result.memories).toHaveLength(3);
    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("test-queue-dfs-depth-A");
    expect(ids).toContain("test-queue-dfs-depth-B");
    expect(ids).toContain("test-queue-dfs-depth-C");
    expect(ids).not.toContain("test-queue-dfs-depth-D");
    expect(ids).not.toContain("test-queue-dfs-depth-E");
  });
});
