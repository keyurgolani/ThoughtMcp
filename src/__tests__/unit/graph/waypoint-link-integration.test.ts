/**
 * Waypoint Link Integration Tests
 *
 * Tests for waypoint link creation, storage, and deletion in the context
 * of memory repository operations.
 *
 * **Feature: mcp-tool-improvements, Task 5.6: Write unit tests for waypoint link creation**
 *
 * Tests cover:
 * - Link creation for similar memories
 * - Bidirectional links
 * - Link removal on delete
 *
 * **Validates: Requirements 14.2, 14.3, 14.4, 14.5**
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Link, LinkType } from "../../../graph/types";
import { MemoryRepository } from "../../../memory/memory-repository";
import type { MemoryContent } from "../../../memory/types";
import { createTestSectorEmbeddings } from "../../utils/test-fixtures";

describe("Waypoint Link Integration - Link Creation for Similar Memories", () => {
  /**
   * **Validates: Requirements 14.1, 14.2, 14.3**
   *
   * Tests that when a memory is stored with similar memories,
   * the system creates waypoint graph links.
   */

  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockGraphBuilder: any;
  let mockEmbeddingStorage: any;
  let mockClient: any;

  beforeEach(() => {
    // Mock database client with query method
    mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        // Return candidate memories for waypoint connection creation
        if (query.includes("SELECT m.*, me.embedding")) {
          return Promise.resolve({
            rows: [
              {
                id: "existing-memory-1",
                content: "Similar memory content about machine learning",
                created_at: new Date(),
                last_accessed: new Date(),
                access_count: 0,
                salience: 0.7,
                decay_rate: 0.02,
                strength: 1.0,
                user_id: "user-123",
                session_id: "session-456",
                primary_sector: "semantic",
              },
              {
                id: "existing-memory-2",
                content: "Another similar memory about AI",
                created_at: new Date(),
                last_accessed: new Date(),
                access_count: 0,
                salience: 0.6,
                decay_rate: 0.02,
                strength: 1.0,
                user_id: "user-123",
                session_id: "session-456",
                primary_sector: "semantic",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      }),
    };

    // Mock database connection manager
    mockDb = {
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    // Mock embedding engine
    mockEmbeddingEngine = {
      generateAllSectorEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
      generateSemanticEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    };

    // Mock waypoint graph builder - returns links for similar memories
    mockGraphBuilder = {
      createWaypointLinks: vi.fn().mockResolvedValue({
        links: [
          {
            sourceId: "new-memory-id",
            targetId: "existing-memory-1",
            linkType: LinkType.Semantic,
            weight: 0.85,
            createdAt: new Date(),
            traversalCount: 0,
          },
          {
            sourceId: "existing-memory-1",
            targetId: "new-memory-id",
            linkType: LinkType.Semantic,
            weight: 0.85,
            createdAt: new Date(),
            traversalCount: 0,
          },
        ],
        skippedCount: 1,
      }),
    };

    // Mock embedding storage
    mockEmbeddingStorage = {
      storeEmbeddings: vi.fn().mockResolvedValue(undefined),
      retrieveEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
      vectorSimilaritySearch: vi.fn().mockResolvedValue([]),
    };

    repository = new MemoryRepository(
      mockDb,
      mockEmbeddingEngine,
      mockGraphBuilder,
      mockEmbeddingStorage
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create links when similar memories exist", async () => {
    /**
     * Requirement 14.1: WHEN a memory is stored THEN the system SHALL attempt
     * to create waypoint graph links to related memories
     */
    const content: MemoryContent = {
      content: "Machine learning algorithms for data analysis",
      userId: "user-123",
      sessionId: "session-456",
      primarySector: "semantic",
    };

    const memory = await repository.create(content);

    // Verify graph builder was called to create links
    expect(mockGraphBuilder.createWaypointLinks).toHaveBeenCalled();

    // Verify links were created
    expect(memory.links).toBeDefined();
    expect(memory.links!.length).toBeGreaterThan(0);
  });

  it("should create links with weight above similarity threshold", async () => {
    /**
     * Requirement 14.2: WHEN similar memories exist (similarity > 0.7) THEN
     * the system SHALL create bidirectional links between them
     */
    const content: MemoryContent = {
      content: "Deep learning neural networks",
      userId: "user-123",
      sessionId: "session-456",
      primarySector: "semantic",
    };

    const memory = await repository.create(content);

    // All created links should have weight >= 0.7 (similarity threshold)
    if (memory.links && memory.links.length > 0) {
      memory.links.forEach((link: Link) => {
        expect(link.weight).toBeGreaterThanOrEqual(0.7);
      });
    }
  });

  it("should return accurate linksCreated count", async () => {
    /**
     * Requirement 14.3: WHEN links are created THEN the linksCreated count
     * in the response SHALL reflect the actual number of links created
     */
    const content: MemoryContent = {
      content: "Test memory for link count verification",
      userId: "user-123",
      sessionId: "session-456",
      primarySector: "semantic",
    };

    const memory = await repository.create(content);

    // The links array length should match the actual links created
    expect(memory.links).toBeDefined();
    expect(Array.isArray(memory.links)).toBe(true);
    expect(memory.links!.length).toBe(2); // Based on mock returning 2 links
  });

  it("should handle case with no similar memories", async () => {
    /**
     * Requirement 14.1: System should handle case when no similar memories exist
     */
    // Mock graph builder to return no links
    mockGraphBuilder.createWaypointLinks.mockResolvedValue({
      links: [],
      skippedCount: 0,
    });

    const content: MemoryContent = {
      content: "Completely unique content with no matches",
      userId: "user-123",
      sessionId: "session-456",
      primarySector: "semantic",
    };

    const memory = await repository.create(content);

    expect(memory.links).toBeDefined();
    expect(memory.links!.length).toBe(0);
  });

  it("should store links in database", async () => {
    /**
     * Requirement 14.1: Links should be persisted to database
     */
    const content: MemoryContent = {
      content: "Memory with links to store",
      userId: "user-123",
      sessionId: "session-456",
      primarySector: "semantic",
    };

    await repository.create(content);

    // Verify INSERT INTO memory_links was called
    const insertCalls = mockClient.query.mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("INSERT INTO memory_links")
    );

    expect(insertCalls.length).toBeGreaterThan(0);
  });
});

describe("Waypoint Link Integration - Bidirectional Links", () => {
  /**
   * **Validates: Requirements 14.2**
   *
   * Tests that bidirectional links are created correctly.
   */

  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockGraphBuilder: any;
  let mockEmbeddingStorage: any;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        if (query.includes("SELECT m.*, me.embedding")) {
          return Promise.resolve({
            rows: [
              {
                id: "existing-memory-1",
                content: "Existing memory content",
                created_at: new Date(),
                last_accessed: new Date(),
                access_count: 0,
                salience: 0.5,
                decay_rate: 0.02,
                strength: 1.0,
                user_id: "user-123",
                session_id: "session-456",
                primary_sector: "semantic",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      }),
    };

    mockDb = {
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    mockEmbeddingEngine = {
      generateAllSectorEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
      generateSemanticEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    };

    // Mock graph builder to return bidirectional links
    mockGraphBuilder = {
      createWaypointLinks: vi.fn().mockResolvedValue({
        links: [
          {
            sourceId: "new-memory-id",
            targetId: "existing-memory-1",
            linkType: LinkType.Semantic,
            weight: 0.85,
            createdAt: new Date(),
            traversalCount: 0,
          },
          {
            sourceId: "existing-memory-1",
            targetId: "new-memory-id",
            linkType: LinkType.Semantic,
            weight: 0.85,
            createdAt: new Date(),
            traversalCount: 0,
          },
        ],
        skippedCount: 0,
      }),
    };

    mockEmbeddingStorage = {
      storeEmbeddings: vi.fn().mockResolvedValue(undefined),
      retrieveEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
      vectorSimilaritySearch: vi.fn().mockResolvedValue([]),
    };

    repository = new MemoryRepository(
      mockDb,
      mockEmbeddingEngine,
      mockGraphBuilder,
      mockEmbeddingStorage
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create bidirectional links between memories", async () => {
    /**
     * Requirement 14.2: WHEN similar memories exist (similarity > 0.7) THEN
     * the system SHALL create bidirectional links between them
     */
    const content: MemoryContent = {
      content: "Test memory for bidirectional links",
      userId: "user-123",
      sessionId: "session-456",
      primarySector: "semantic",
    };

    const memory = await repository.create(content);

    expect(memory.links).toBeDefined();
    expect(memory.links!.length).toBe(2);

    // Verify bidirectional: one link from new to existing, one from existing to new
    const forwardLink = memory.links!.find(
      (l: Link) => l.sourceId === "new-memory-id" && l.targetId === "existing-memory-1"
    );
    const reverseLink = memory.links!.find(
      (l: Link) => l.sourceId === "existing-memory-1" && l.targetId === "new-memory-id"
    );

    expect(forwardLink).toBeDefined();
    expect(reverseLink).toBeDefined();
  });

  it("should have symmetric weights for bidirectional links", async () => {
    /**
     * Requirement 14.2: Bidirectional links should have symmetric weights
     */
    const content: MemoryContent = {
      content: "Test memory for symmetric weights",
      userId: "user-123",
      sessionId: "session-456",
      primarySector: "semantic",
    };

    const memory = await repository.create(content);

    if (memory.links && memory.links.length >= 2) {
      const forwardLink = memory.links.find(
        (l: Link) => l.sourceId === "new-memory-id" && l.targetId === "existing-memory-1"
      );
      const reverseLink = memory.links.find(
        (l: Link) => l.sourceId === "existing-memory-1" && l.targetId === "new-memory-id"
      );

      if (forwardLink && reverseLink) {
        expect(forwardLink.weight).toBe(reverseLink.weight);
      }
    }
  });

  it("should have same link type for bidirectional links", async () => {
    /**
     * Requirement 14.2: Bidirectional links should have same link type
     */
    const content: MemoryContent = {
      content: "Test memory for link type consistency",
      userId: "user-123",
      sessionId: "session-456",
      primarySector: "semantic",
    };

    const memory = await repository.create(content);

    if (memory.links && memory.links.length >= 2) {
      const forwardLink = memory.links.find(
        (l: Link) => l.sourceId === "new-memory-id" && l.targetId === "existing-memory-1"
      );
      const reverseLink = memory.links.find(
        (l: Link) => l.sourceId === "existing-memory-1" && l.targetId === "new-memory-id"
      );

      if (forwardLink && reverseLink) {
        expect(forwardLink.linkType).toBe(reverseLink.linkType);
      }
    }
  });

  it("should store both directions of bidirectional links in database", async () => {
    /**
     * Requirement 14.2: Both link directions should be persisted
     */
    const content: MemoryContent = {
      content: "Test memory for database storage",
      userId: "user-123",
      sessionId: "session-456",
      primarySector: "semantic",
    };

    await repository.create(content);

    // Count INSERT INTO memory_links calls
    const insertCalls = mockClient.query.mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("INSERT INTO memory_links")
    );

    // Should have 2 insert calls for bidirectional links
    expect(insertCalls.length).toBe(2);
  });
});

describe("Waypoint Link Integration - Link Removal on Delete", () => {
  /**
   * **Validates: Requirements 14.5**
   *
   * Tests that when a memory is deleted, associated waypoint graph links
   * are also removed.
   */

  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockGraphBuilder: any;
  let mockEmbeddingStorage: any;
  let mockClient: any;
  let deletedLinks: string[] = [];

  beforeEach(() => {
    deletedLinks = [];

    mockClient = {
      query: vi.fn().mockImplementation((query: string, params?: any[]) => {
        // Track link deletions
        if (query.includes("DELETE FROM memory_links")) {
          if (params && params[0]) {
            deletedLinks.push(`source:${params[0]}`);
          }
          return Promise.resolve({ rows: [], rowCount: 1 });
        }

        // Return memory for delete verification
        if (query.includes("DELETE FROM memories") && query.includes("RETURNING")) {
          return Promise.resolve({
            rows: [{ id: params?.[0] || "test-memory-id" }],
            rowCount: 1,
          });
        }

        return Promise.resolve({ rows: [] });
      }),
    };

    mockDb = {
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    mockEmbeddingEngine = {
      generateAllSectorEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
      generateSemanticEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    };

    mockGraphBuilder = {
      createWaypointLinks: vi.fn().mockResolvedValue({
        links: [],
        skippedCount: 0,
      }),
    };

    mockEmbeddingStorage = {
      storeEmbeddings: vi.fn().mockResolvedValue(undefined),
      retrieveEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
      vectorSimilaritySearch: vi.fn().mockResolvedValue([]),
    };

    repository = new MemoryRepository(
      mockDb,
      mockEmbeddingEngine,
      mockGraphBuilder,
      mockEmbeddingStorage
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should delete links where memory is source on hard delete", async () => {
    /**
     * Requirement 14.5: WHEN a memory is deleted THEN the associated
     * waypoint graph links SHALL also be removed
     */
    const memoryId = "test-memory-to-delete";

    await repository.delete(memoryId, false); // hard delete

    // Verify DELETE FROM memory_links WHERE source_id was called
    const sourceDeleteCalls = mockClient.query.mock.calls.filter(
      (call: any[]) =>
        typeof call[0] === "string" &&
        call[0].includes("DELETE FROM memory_links") &&
        call[0].includes("source_id")
    );

    expect(sourceDeleteCalls.length).toBeGreaterThan(0);
  });

  it("should delete links where memory is target on hard delete", async () => {
    /**
     * Requirement 14.5: Links where memory is target should also be removed
     */
    const memoryId = "test-memory-to-delete";

    await repository.delete(memoryId, false); // hard delete

    // Verify DELETE FROM memory_links WHERE target_id was called
    const targetDeleteCalls = mockClient.query.mock.calls.filter(
      (call: any[]) =>
        typeof call[0] === "string" &&
        call[0].includes("DELETE FROM memory_links") &&
        call[0].includes("target_id")
    );

    expect(targetDeleteCalls.length).toBeGreaterThan(0);
  });

  it("should not delete links on soft delete", async () => {
    /**
     * Requirement 14.5: Soft delete should preserve links
     */
    // Reset mock to track calls
    mockClient.query.mockClear();

    // Mock soft delete to return the memory
    mockClient.query.mockImplementation((query: string, params?: any[]) => {
      if (query.includes("UPDATE memories") && query.includes("strength = 0")) {
        return Promise.resolve({
          rows: [{ id: params?.[0] || "test-memory-id" }],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const memoryId = "test-memory-soft-delete";

    await repository.delete(memoryId, true); // soft delete

    // Verify no DELETE FROM memory_links was called
    const linkDeleteCalls = mockClient.query.mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("DELETE FROM memory_links")
    );

    expect(linkDeleteCalls.length).toBe(0);
  });

  it("should delete both source and target links for bidirectional connections", async () => {
    /**
     * Requirement 14.5: Both directions of bidirectional links should be removed
     */
    const memoryId = "test-memory-bidirectional";

    await repository.delete(memoryId, false); // hard delete

    // Should have calls for both source_id and target_id deletions
    const allDeleteCalls = mockClient.query.mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("DELETE FROM memory_links")
    );

    // Should have at least 2 delete calls (one for source, one for target)
    expect(allDeleteCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("should delete links before deleting memory record", async () => {
    /**
     * Requirement 14.5: Links should be deleted before memory to maintain referential integrity
     */
    const callOrder: string[] = [];

    mockClient.query.mockImplementation((query: string, params?: any[]) => {
      if (query.includes("DELETE FROM memory_links")) {
        callOrder.push("delete_links");
      }
      if (query.includes("DELETE FROM memories")) {
        callOrder.push("delete_memory");
        return Promise.resolve({
          rows: [{ id: params?.[0] || "test-memory-id" }],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const memoryId = "test-memory-order";

    await repository.delete(memoryId, false); // hard delete

    // Links should be deleted before memory
    const linkDeleteIndex = callOrder.indexOf("delete_links");
    const memoryDeleteIndex = callOrder.indexOf("delete_memory");

    expect(linkDeleteIndex).toBeLessThan(memoryDeleteIndex);
  });

  it("should handle delete when memory has no links", async () => {
    /**
     * Requirement 14.5: Delete should work even if memory has no links
     */
    mockClient.query.mockImplementation((query: string, params?: any[]) => {
      if (query.includes("DELETE FROM memory_links")) {
        return Promise.resolve({ rows: [], rowCount: 0 }); // No links deleted
      }
      if (query.includes("DELETE FROM memories") && query.includes("RETURNING")) {
        return Promise.resolve({
          rows: [{ id: params?.[0] || "test-memory-id" }],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const memoryId = "test-memory-no-links";

    // Should not throw
    await expect(repository.delete(memoryId, false)).resolves.not.toThrow();
  });
});

describe("Waypoint Link Integration - Link Weight in Composite Scoring", () => {
  /**
   * **Validates: Requirements 14.4**
   *
   * Tests that linkWeight reflects actual connections in retrieve_memories.
   */

  let repository: MemoryRepository;
  let mockDb: any;
  let mockEmbeddingEngine: any;
  let mockGraphBuilder: any;
  let mockEmbeddingStorage: any;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: vi.fn().mockImplementation((query: string, _params?: any[]) => {
        // Return link weights for composite scoring
        if (query.includes("SELECT") && query.includes("memory_links") && query.includes("AVG")) {
          return Promise.resolve({
            rows: [
              { memory_id: "memory-1", avg_weight: 0.85 },
              { memory_id: "memory-2", avg_weight: 0.75 },
            ],
          });
        }

        // Return memories for search
        if (query.includes("SELECT") && query.includes("FROM memories")) {
          return Promise.resolve({
            rows: [
              {
                id: "memory-1",
                content: "Test memory 1",
                created_at: new Date(),
                last_accessed: new Date(),
                access_count: 0,
                salience: 0.5,
                decay_rate: 0.02,
                strength: 1.0,
                user_id: "user-123",
                session_id: "session-456",
                primary_sector: "semantic",
                keywords: [],
                tags: [],
                category: "general",
                context: "",
                importance: 0.5,
                is_atomic: true,
              },
            ],
          });
        }

        return Promise.resolve({ rows: [] });
      }),
    };

    mockDb = {
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    mockEmbeddingEngine = {
      generateAllSectorEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
      generateSemanticEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    };

    mockGraphBuilder = {
      createWaypointLinks: vi.fn().mockResolvedValue({
        links: [],
        skippedCount: 0,
      }),
    };

    mockEmbeddingStorage = {
      storeEmbeddings: vi.fn().mockResolvedValue(undefined),
      retrieveEmbeddings: vi.fn().mockResolvedValue(createTestSectorEmbeddings()),
      vectorSimilaritySearch: vi
        .fn()
        .mockResolvedValue([{ memoryId: "memory-1", similarity: 0.9 }]),
    };

    repository = new MemoryRepository(
      mockDb,
      mockEmbeddingEngine,
      mockGraphBuilder,
      mockEmbeddingStorage
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should query link weights for composite scoring", async () => {
    /**
     * Requirement 14.4: WHEN retrieving memories THEN the linkWeight component
     * of composite scoring SHALL reflect actual link connections
     */
    await repository.search({
      userId: "user-123",
      text: "test query",
      limit: 10,
    });

    // Verify link weight query was made
    const linkWeightCalls = mockClient.query.mock.calls.filter(
      (call: any[]) =>
        typeof call[0] === "string" && call[0].includes("memory_links") && call[0].includes("AVG")
    );

    expect(linkWeightCalls.length).toBeGreaterThan(0);
  });

  it("should include both source and target links in weight calculation", async () => {
    /**
     * Requirement 14.4: Link weight should consider both directions
     */
    await repository.search({
      userId: "user-123",
      text: "test query",
      limit: 10,
    });

    // Verify query includes both source_id and target_id
    const linkWeightCalls = mockClient.query.mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("memory_links")
    );

    const hasSourceAndTarget = linkWeightCalls.some(
      (call: any[]) => call[0].includes("source_id") && call[0].includes("target_id")
    );

    expect(hasSourceAndTarget).toBe(true);
  });
});
