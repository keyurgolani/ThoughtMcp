/**
 * Graph Traversal Edge Cases and Null Handling Tests
 *
 * Tests for edge cases including null metadata fields, explicit zero values,
 * and boundary conditions in graph traversal operations.
 *
 * Requirements: 2.3, 2.4, 2.5
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../../database/connection-manager";
import { GraphTraversal } from "../../../graph/graph-traversal";

describe("GraphTraversal - Null Handling and Edge Cases", () => {
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
      await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-branch-%'");
      await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-branch-%'");
      await client.query("DELETE FROM memories WHERE id LIKE 'test-branch-%'");
    } finally {
      db.releaseConnection(client);
    }
  });

  afterEach(async () => {
    if (db) {
      const client = await db.getConnection();
      try {
        await client.query("DELETE FROM memory_links WHERE source_id LIKE 'test-branch-%'");
        await client.query("DELETE FROM memory_metadata WHERE memory_id LIKE 'test-branch-%'");
        await client.query("DELETE FROM memories WHERE id LIKE 'test-branch-%'");
      } finally {
        db.releaseConnection(client);
      }
      await db.disconnect();
    }
  });

  async function createTestMemory(
    id: string,
    content: string,
    metadata?: {
      keywords?: string[] | null;
      tags?: string[] | null;
      category?: string | null;
      context?: string | null;
      importance?: number | null;
      is_atomic?: boolean | null;
      parent_id?: string | null;
    }
  ): Promise<void> {
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, strength, user_id, session_id, primary_sector)
         VALUES ($1, $2, NOW(), NOW(), 0, 0.5, 1.0, 'test-user', 'test-session', 'semantic')`,
        [id, content]
      );

      // Insert metadata with explicit null values if provided
      await client.query(
        `INSERT INTO memory_metadata (memory_id, keywords, tags, category, context, importance, is_atomic, parent_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          metadata?.keywords ?? [],
          metadata?.tags ?? [],
          metadata?.category ?? "test",
          metadata?.context ?? "",
          metadata?.importance ?? 0.5,
          metadata?.is_atomic ?? true,
          metadata?.parent_id ?? null,
        ]
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

  it("should apply default values for null metadata fields", async () => {
    // Requirement 2.4: Test metadata null handling with appropriate defaults
    // Nullable fields: category, context, importance, is_atomic, parent_id

    // Given: Memory with nullable metadata fields set to NULL
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, strength, user_id, session_id, primary_sector)
         VALUES ($1, $2, NOW(), NOW(), 0, 0.5, 1.0, 'test-user', 'test-session', 'semantic')`,
        ["test-branch-null-metadata", "Memory with null metadata"]
      );

      // Insert metadata with NULL values for nullable fields
      await client.query(
        `INSERT INTO memory_metadata (memory_id, keywords, tags, category, context, importance, is_atomic, parent_id)
         VALUES ($1, $2, $3, NULL, NULL, NULL, NULL, NULL)`,
        ["test-branch-null-metadata", [], []]
      );
    } finally {
      db.releaseConnection(client);
    }

    // When: Retrieving the memory (which calls getMemory internally)
    const result = await graphTraversal.getConnectedMemories("test-branch-null-metadata", {
      maxDepth: 0,
    });

    // Then: Should handle null metadata gracefully with defaults
    expect(result.memories).toHaveLength(1);
    const memory = result.memories[0];
    expect(memory.metadata.keywords).toEqual([]);
    expect(memory.metadata.tags).toEqual([]);
    expect(memory.metadata.category).toBe(""); // NULL -> ""
    expect(memory.metadata.context).toBe(""); // NULL -> ""
    expect(memory.metadata.importance).toBe(0.5); // NULL -> 0.5
    expect(memory.metadata.isAtomic).toBe(true); // NULL -> true
    expect(memory.metadata.parentId).toBeUndefined(); // NULL -> undefined
  });

  it("should include all links when minWeight is explicitly set to 0", async () => {
    // Requirement 2.4: Test explicit zero minWeight vs undefined

    // Given: Memories with links of varying weights including 0
    await createTestMemory("test-branch-minweight-A", "Memory A");
    await createTestMemory("test-branch-minweight-B", "Memory B");
    await createTestMemory("test-branch-minweight-C", "Memory C");
    await createTestLink("test-branch-minweight-A", "test-branch-minweight-B", "semantic", 0.0);
    await createTestLink("test-branch-minweight-A", "test-branch-minweight-C", "semantic", 0.5);

    // When: Using explicit minWeight of 0
    const result = await graphTraversal.getConnectedMemories("test-branch-minweight-A", {
      maxDepth: 1,
      minWeight: 0, // Explicit 0, not undefined
    });

    // Then: Should include all links >= 0 (which is all links)
    expect(result.memories).toHaveLength(3); // A, B, C
    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("test-branch-minweight-B"); // 0.0 weight
    expect(ids).toContain("test-branch-minweight-C"); // 0.5 weight
  });

  it("should filter links by weight threshold in BFS traversal", async () => {
    // Requirement 2.4: Test link weight filtering in breadth-first search

    // Given: Memories with links of varying weights
    await createTestMemory("test-branch-bfs-minweight-A", "Memory A");
    await createTestMemory("test-branch-bfs-minweight-B", "Memory B");
    await createTestMemory("test-branch-bfs-minweight-C", "Memory C");
    await createTestLink(
      "test-branch-bfs-minweight-A",
      "test-branch-bfs-minweight-B",
      "semantic",
      0.3
    );
    await createTestLink(
      "test-branch-bfs-minweight-A",
      "test-branch-bfs-minweight-C",
      "semantic",
      0.7
    );

    // When: Using explicit minWeight of 0.5 with BFS
    const result = await graphTraversal.getConnectedMemories("test-branch-bfs-minweight-A", {
      maxDepth: 1,
      minWeight: 0.5,
      traversalType: "breadth-first",
    });

    // Then: Should only include links >= 0.5
    expect(result.memories).toHaveLength(2); // A, C (not B)
    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("test-branch-bfs-minweight-A");
    expect(ids).toContain("test-branch-bfs-minweight-C"); // 0.7 >= 0.5
    expect(ids).not.toContain("test-branch-bfs-minweight-B"); // 0.3 < 0.5
  });

  it("should filter links by weight threshold in DFS traversal", async () => {
    // Requirement 2.4: Test link weight filtering in depth-first search

    // Given: Memories with links of varying weights
    await createTestMemory("test-branch-dfs-minweight-A", "Memory A");
    await createTestMemory("test-branch-dfs-minweight-B", "Memory B");
    await createTestMemory("test-branch-dfs-minweight-C", "Memory C");
    await createTestLink(
      "test-branch-dfs-minweight-A",
      "test-branch-dfs-minweight-B",
      "semantic",
      0.3
    );
    await createTestLink(
      "test-branch-dfs-minweight-A",
      "test-branch-dfs-minweight-C",
      "semantic",
      0.7
    );

    // When: Using explicit minWeight of 0.5 with DFS
    const result = await graphTraversal.getConnectedMemories("test-branch-dfs-minweight-A", {
      maxDepth: 1,
      minWeight: 0.5,
      traversalType: "depth-first",
    });

    // Then: Should only include links >= 0.5
    expect(result.memories).toHaveLength(2); // A, C (not B)
    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("test-branch-dfs-minweight-A");
    expect(ids).toContain("test-branch-dfs-minweight-C"); // 0.7 >= 0.5
    expect(ids).not.toContain("test-branch-dfs-minweight-B"); // 0.3 < 0.5
  });

  it("should preserve is_atomic false value for composite memories", async () => {
    // Requirement 2.4: Test composite memory flag handling

    // Given: Memory with is_atomic explicitly set to false
    const client = await db.getConnection();
    try {
      await client.query(
        `INSERT INTO memories (id, content, created_at, last_accessed, access_count, salience, strength, user_id, session_id, primary_sector)
         VALUES ($1, $2, NOW(), NOW(), 0, 0.5, 1.0, 'test-user', 'test-session', 'semantic')`,
        ["test-branch-atomic-false", "Composite memory"]
      );

      await client.query(
        `INSERT INTO memory_metadata (memory_id, keywords, tags, category, context, importance, is_atomic, parent_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ["test-branch-atomic-false", [], [], "test", "", 0.5, false, null]
      );
    } finally {
      db.releaseConnection(client);
    }

    // When: Retrieving the memory
    const result = await graphTraversal.getConnectedMemories("test-branch-atomic-false", {
      maxDepth: 0,
    });

    // Then: Should preserve is_atomic = false
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].metadata.isAtomic).toBe(false);
  });

  it("should preserve parent_id for child memories", async () => {
    // Requirement 2.4: Test parent-child memory relationship tracking

    // Given: Memory with parent_id set
    await createTestMemory("test-branch-parent", "Parent memory");
    await createTestMemory("test-branch-child", "Child memory", {
      parent_id: "test-branch-parent",
    });

    // When: Retrieving the child memory
    const result = await graphTraversal.getConnectedMemories("test-branch-child", {
      maxDepth: 0,
    });

    // Then: Should include parent_id
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].metadata.parentId).toBe("test-branch-parent");
  });
});
