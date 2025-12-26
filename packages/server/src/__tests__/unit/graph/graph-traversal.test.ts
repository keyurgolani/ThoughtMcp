/**
 * Graph Traversal Unit Tests
 *
 * Unit tests for GraphTraversal class using mocked database connections.
 * Tests cover BFS/DFS traversal, path finding, path explanation, and error handling.
 *
 * Requirements: 2.3, 2.4, 2.5
 */

import { describe, expect, it, vi } from "vitest";
import type { DatabaseConnectionManager } from "../../../database/connection-manager";
import { GraphTraversal } from "../../../graph/graph-traversal";
import { LinkType, type Memory } from "../../../graph/types";

// Helper to create mock memory data
function createMockMemoryRow(id: string, content: string) {
  return {
    id,
    content,
    created_at: new Date(),
    last_accessed: new Date(),
    access_count: 0,
    salience: 0.5,
    strength: 1.0,
    user_id: "test-user",
    session_id: "test-session",
    primary_sector: "semantic",
  };
}

// Helper to create mock link data
function createMockLinkRow(
  sourceId: string,
  targetId: string,
  weight: number,
  linkType = "semantic"
) {
  return {
    source_id: sourceId,
    target_id: targetId,
    link_type: linkType,
    weight,
    created_at: new Date(),
    traversal_count: 0,
  };
}

// Helper to create Memory object for explainPath tests
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

describe("GraphTraversal - explainPath", () => {
  it("should generate explanation for multi-step path", () => {
    // Create mock db (not used for explainPath but required for constructor)
    const mockDb = {
      getConnection: vi.fn(),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

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
  });

  it("should handle empty path", () => {
    const mockDb = {
      getConnection: vi.fn(),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const emptyPath = {
      memories: [],
      links: [],
      totalWeight: 0,
      explanation: "",
    };

    const explanation = graphTraversal.explainPath(emptyPath);
    expect(explanation).toBe("No path found");
  });

  it("should handle single memory path", () => {
    const mockDb = {
      getConnection: vi.fn(),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const singlePath = {
      memories: [createMemory("A", "Memory A")],
      links: [],
      totalWeight: 0,
      explanation: "",
    };

    const explanation = graphTraversal.explainPath(singlePath);
    expect(explanation).toBe("Memory A");
  });

  it("should truncate long content", () => {
    const mockDb = {
      getConnection: vi.fn(),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

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

    const explanation = graphTraversal.explainPath(path);
    expect(explanation).toContain("...");
    expect(explanation).toContain("Short");
  });
});

describe("GraphTraversal - Database Error Handling", () => {
  it("should handle database query errors in getOutgoingLinks", async () => {
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          throw new Error("Simulated database error");
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("any-id", { maxDepth: 1 });

    expect(result.memories).toHaveLength(0);
    expect(result.visitedCount).toBe(0);
  });

  it("should handle database query errors in getMemory", async () => {
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          throw new Error("Simulated database error in getMemory");
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const path = await graphTraversal.findPath("source-id", "target-id", 5);
    expect(path).toBeNull();
  });

  it("should handle database errors in BFS traversal", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] }; // Metadata query
          } else {
            throw new Error("Database error");
          }
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", { maxDepth: 2 });

    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].id).toBe("start-id");
  });

  it("should handle database errors in DFS traversal", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount <= 4) {
            if (callCount % 2 === 1) {
              return { rows: [createMockMemoryRow("start-id", "Start memory")] };
            }
            return { rows: [] }; // Metadata query
          }
          throw new Error("Database error");
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].id).toBe("start-id");
  });
});

describe("GraphTraversal - BFS Traversal with Mocks", () => {
  it("should skip null memories in BFS when getMemory returns null", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return {
              rows: [createMockLinkRow("start-id", "deleted-memory-id", 0.8)],
            };
          } else if (callCount === 4) {
            return { rows: [] }; // getMemory returns null for deleted memory
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 2,
      traversalType: "breadth-first",
    });

    expect(result).toBeDefined();
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].id).toBe("start-id");
  });

  it("should handle BFS without minWeight filter", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [createMockLinkRow("start-id", "target-id", 0.3)] };
          } else if (callCount === 4) {
            return { rows: [createMockMemoryRow("target-id", "Target memory")] };
          } else if (callCount === 5) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
    });

    expect(result.memories).toHaveLength(2);
  });

  it("should handle BFS with minWeight filtering all links", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [createMockLinkRow("start-id", "target-id", 0.1)] };
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 2,
      minWeight: 0.5,
    });

    expect(result.memories).toHaveLength(1);
    expect(result.visitedCount).toBe(1);
  });

  it("should handle BFS with minWeight as 0", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [createMockLinkRow("start-id", "target-id", 0.0)] };
          } else if (callCount === 4) {
            return { rows: [createMockMemoryRow("target-id", "Target memory")] };
          } else if (callCount === 5) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
      minWeight: 0,
    });

    expect(result.memories).toHaveLength(2);
  });

  it("should default to breadth-first traversal when traversalType is undefined", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [createMockLinkRow("start-id", "target-id", 0.8)] };
          } else if (callCount === 4) {
            return { rows: [createMockMemoryRow("target-id", "Target memory")] };
          } else if (callCount === 5) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
    });

    expect(result).toBeDefined();
    expect(result.memories).toHaveLength(2);
    expect(result.visitedCount).toBe(2);
  });

  it("should handle isolated nodes with no outgoing links in BFS", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("isolated-id", "Isolated memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [] }; // No outgoing links
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("isolated-id", {
      maxDepth: 2,
    });

    expect(result.memories).toHaveLength(1);
    expect(result.visitedCount).toBe(1);
  });
});

describe("GraphTraversal - DFS Traversal with Mocks", () => {
  it("should skip null memories in DFS when getMemory returns null", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 4) {
            return { rows: [] };
          } else if (callCount === 5) {
            return {
              rows: [
                createMockLinkRow("start-id", "deleted-memory-id", 0.8),
                createMockLinkRow("start-id", "valid-memory-id", 0.7),
              ],
            };
          } else if (callCount === 6) {
            return { rows: [createMockMemoryRow("valid-memory-id", "Valid memory")] };
          } else if (callCount === 7) {
            return { rows: [] };
          } else if (callCount === 8) {
            return { rows: [] };
          } else if (callCount === 9) {
            return { rows: [] }; // getMemory returns null for deleted memory
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    expect(result).toBeDefined();
    expect(result.memories).toHaveLength(2);
    expect(result.memories[0].id).toBe("start-id");
    expect(result.memories[1].id).toBe("valid-memory-id");
  });

  it("should handle DFS without minWeight filter", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 4) {
            return { rows: [] };
          } else if (callCount === 5) {
            return { rows: [createMockLinkRow("start-id", "target-id", 0.3)] };
          } else if (callCount === 6) {
            return { rows: [createMockMemoryRow("target-id", "Target memory")] };
          } else if (callCount === 7) {
            return { rows: [] };
          } else if (callCount === 8) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
      traversalType: "depth-first",
    });

    expect(result.memories).toHaveLength(2);
  });

  it("should handle DFS with minWeight filtering all links", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 4) {
            return { rows: [] };
          } else if (callCount === 5) {
            return { rows: [createMockLinkRow("start-id", "target-id", 0.1)] };
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 2,
      traversalType: "depth-first",
      minWeight: 0.5,
    });

    expect(result.memories).toHaveLength(1);
    expect(result.visitedCount).toBe(1);
  });

  it("should handle DFS with minWeight as 0", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 4) {
            return { rows: [] };
          } else if (callCount === 5) {
            return { rows: [createMockLinkRow("start-id", "target-id", 0.0)] };
          } else if (callCount === 6) {
            return { rows: [createMockMemoryRow("target-id", "Target memory")] };
          } else if (callCount === 7) {
            return { rows: [] };
          } else if (callCount === 8) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
      traversalType: "depth-first",
      minWeight: 0,
    });

    expect(result.memories).toHaveLength(2);
  });

  it("should skip already visited nodes in DFS traversal", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 4) {
            return { rows: [] };
          } else if (callCount === 5) {
            // Return two links to same target (creates duplicate in stack)
            return {
              rows: [
                createMockLinkRow("start-id", "shared-target", 0.9),
                createMockLinkRow("start-id", "shared-target", 0.8, "causal"),
              ],
            };
          } else if (callCount === 6) {
            return { rows: [createMockMemoryRow("shared-target", "Shared target memory")] };
          } else if (callCount === 7) {
            return { rows: [] };
          } else if (callCount === 8) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    expect(result).toBeDefined();
    expect(result.memories).toHaveLength(2);
    expect(result.visitedCount).toBe(2);
  });

  it("should handle isolated nodes with no outgoing links in DFS", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("isolated-id", "Isolated memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [createMockMemoryRow("isolated-id", "Isolated memory")] };
          } else if (callCount === 4) {
            return { rows: [] };
          } else if (callCount === 5) {
            return { rows: [] }; // No outgoing links
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("isolated-id", {
      maxDepth: 2,
      traversalType: "depth-first",
    });

    expect(result.memories).toHaveLength(1);
    expect(result.visitedCount).toBe(1);
  });
});

describe("GraphTraversal - Path Finding with Mocks", () => {
  it("should find path when maxDepth exactly matches required depth", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("source-id", "Source memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [createMockLinkRow("source-id", "target-id", 0.8)] };
          } else if (callCount === 4) {
            return { rows: [createMockMemoryRow("target-id", "Target memory")] };
          } else if (callCount === 5) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const path = await graphTraversal.findPath("source-id", "target-id", 1);

    expect(path).not.toBeNull();
    expect(path!.memories).toHaveLength(2);
  });

  it("should return null when no path exists", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("source-id", "Source memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [] }; // No outgoing links
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const path = await graphTraversal.findPath("source-id", "target-id", 5);

    expect(path).toBeNull();
  });

  it("should return path with single memory when source equals target", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("same-id", "Same memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const path = await graphTraversal.findPath("same-id", "same-id", 5);

    expect(path).not.toBeNull();
    expect(path!.memories).toHaveLength(1);
    expect(path!.links).toHaveLength(0);
    expect(path!.totalWeight).toBe(0);
  });

  it("should return null for non-existent source memory", async () => {
    const mockDb = {
      getConnection: async () => ({
        query: async () => ({ rows: [] }),
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const path = await graphTraversal.findPath("non-existent", "target-id", 5);

    expect(path).toBeNull();
  });
});

describe("GraphTraversal - expandViaWaypoint with Mocks", () => {
  it("should return empty array for negative hops", async () => {
    const mockDb = {
      getConnection: vi.fn(),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const memories = await graphTraversal.expandViaWaypoint("any-id", -1);

    expect(memories).toHaveLength(0);
  });

  it("should return only start node for 0 hops", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const memories = await graphTraversal.expandViaWaypoint("start-id", 0);

    expect(memories).toHaveLength(1);
    expect(memories[0].id).toBe("start-id");
  });

  it("should return empty array for non-existent start memory", async () => {
    const mockDb = {
      getConnection: async () => ({
        query: async () => ({ rows: [] }),
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const memories = await graphTraversal.expandViaWaypoint("non-existent-id", 2);

    expect(memories).toHaveLength(0);
  });
});

describe("GraphTraversal - Explicit Option Combinations", () => {
  it("should apply all traversal options in BFS", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [createMockLinkRow("start-id", "target-id", 0.8)] };
          } else if (callCount === 4) {
            return { rows: [createMockMemoryRow("target-id", "Target memory")] };
          } else if (callCount === 5) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
      minWeight: 0.5,
      traversalType: "breadth-first",
      includePaths: false,
    });

    expect(result.memories).toHaveLength(2);
  });

  it("should apply all traversal options in DFS", async () => {
    let callCount = 0;
    const mockDb = {
      getConnection: async () => ({
        query: async () => {
          callCount++;
          if (callCount === 1) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 2) {
            return { rows: [] };
          } else if (callCount === 3) {
            return { rows: [createMockMemoryRow("start-id", "Start memory")] };
          } else if (callCount === 4) {
            return { rows: [] };
          } else if (callCount === 5) {
            return { rows: [createMockLinkRow("start-id", "target-id", 0.8)] };
          } else if (callCount === 6) {
            return { rows: [createMockMemoryRow("target-id", "Target memory")] };
          } else if (callCount === 7) {
            return { rows: [] };
          } else if (callCount === 8) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      }),
      releaseConnection: vi.fn(),
    } as unknown as DatabaseConnectionManager;

    const graphTraversal = new GraphTraversal(mockDb);

    const result = await graphTraversal.getConnectedMemories("start-id", {
      maxDepth: 1,
      minWeight: 0.5,
      traversalType: "depth-first",
      includePaths: false,
    });

    expect(result.memories).toHaveLength(2);
  });
});
