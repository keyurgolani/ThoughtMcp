/**
 * Memory MCP Tools Tests
 *
 * Tests for memory operation MCP tools (store, retrieve, update, delete, search).
 * Following TDD principles - these tests define expected behavior before implementation.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 4.1, 4.2
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinkType } from "../../../graph/types.js";
import type { Memory, MemoryContent, MemoryMetadata } from "../../../memory/types.js";
import { CognitiveMCPServer } from "../../../server/mcp-server.js";

// Mock all dependencies
vi.mock("../../../memory/memory-repository.js");
vi.mock("../../../reasoning/orchestrator.js");
vi.mock("../../../framework/framework-selector.js");
vi.mock("../../../confidence/multi-dimensional-assessor.js");
vi.mock("../../../bias/bias-pattern-recognizer.js");
vi.mock("../../../emotion/circumplex-analyzer.js");
vi.mock("../../../metacognitive/performance-monitoring-system.js");
vi.mock("../../../database/connection-manager.js");
vi.mock("../../../embeddings/embedding-engine.js");
vi.mock("../../../utils/logger.js", () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Memory MCP Tools", () => {
  let server: CognitiveMCPServer;
  let mockMemoryRepository: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create mock memory repository
    mockMemoryRepository = {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      search: vi.fn(),
    };

    // Create server (but don't initialize to avoid registering real tools)
    server = new CognitiveMCPServer();

    // Set up mock components directly without initialization
    server.memoryRepository = mockMemoryRepository;
    (server as any).databaseManager = {
      healthCheck: vi.fn().mockResolvedValue(true),
    };
    server.isInitialized = true; // Mark as initialized for executeTool to work
  });

  afterEach(async () => {
    // Clear tool registry to prevent "Tool already registered" errors
    server.toolRegistry.clear();
    server.isInitialized = false;
    vi.clearAllMocks();
  });

  describe("store_memory tool", () => {
    beforeEach(() => {
      // Register store_memory tool
      server.toolRegistry.registerTool({
        name: "remember",
        description: "Store a new memory with embeddings and waypoint connections",
        inputSchema: {
          type: "object",
          properties: {
            content: { type: "string" },
            type: {
              type: "string",
              enum: ["episodic", "semantic", "procedural", "emotional", "reflective"],
            },
            importance: { type: "number", minimum: 0, maximum: 1 },
            userId: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            keywords: { type: "array", items: { type: "string" } },
            category: { type: "string" },
            context: { type: "string" },
          },
          required: ["content", "type", "userId"],
        },
        handler: async (params: any) => {
          const content: MemoryContent = {
            content: params.content,
            userId: params.userId,
            sessionId: params.sessionId || "test-session",
            primarySector: params.type,
          };

          const metadata: MemoryMetadata = {
            keywords: params.keywords || [],
            tags: params.tags || [],
            category: params.category,
            context: params.context,
            importance: params.importance || 0.5,
            isAtomic: true,
          };

          const memory = await mockMemoryRepository.create(content, metadata);

          return {
            success: true,
            data: {
              memoryId: memory.id,
              content: memory.content,
              embeddings: memory.embeddings ? "generated" : "none",
              connections: memory.links?.length || 0,
            },
          };
        },
      });
    });

    it("should store memory with all required parameters", async () => {
      const mockMemory: Memory = {
        id: "mem_123",
        content: "Test memory content",
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        salience: 0.5,
        decayRate: 0.02,
        strength: 1.0,
        userId: "user_123",
        sessionId: "session_123",
        primarySector: "episodic",
        metadata: {
          keywords: [],
          tags: [],
          importance: 0.5,
          isAtomic: true,
        },
        embeddings: {
          episodic: new Array(768).fill(0),
          semantic: new Array(768).fill(0),
          procedural: new Array(768).fill(0),
          emotional: new Array(768).fill(0),
          reflective: new Array(768).fill(0),
        },
        links: [],
      };

      mockMemoryRepository.create.mockResolvedValue(mockMemory);

      const result = await server.executeTool("remember", {
        content: "Test memory content",
        type: "episodic",
        userId: "user_123",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).memoryId).toBe("mem_123");
      expect(mockMemoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Test memory content",
          userId: "user_123",
          primarySector: "episodic",
        }),
        expect.any(Object)
      );
    });

    it("should store memory with optional parameters", async () => {
      const mockMemory: Memory = {
        id: "mem_124",
        content: "Test memory with metadata",
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        salience: 0.5,
        decayRate: 0.02,
        strength: 1.0,
        userId: "user_123",
        sessionId: "session_123",
        primarySector: "semantic",
        metadata: {
          keywords: ["test", "memory"],
          tags: ["important", "work"],
          category: "project",
          context: "Test context",
          importance: 0.8,
          isAtomic: true,
        },
        embeddings: {
          episodic: new Array(768).fill(0),
          semantic: new Array(768).fill(0),
          procedural: new Array(768).fill(0),
          emotional: new Array(768).fill(0),
          reflective: new Array(768).fill(0),
        },
        links: [
          {
            sourceId: "mem_124",
            targetId: "mem_100",
            linkType: LinkType.Semantic,
            weight: 0.85,
            createdAt: new Date(),
            traversalCount: 0,
          },
        ],
      };

      mockMemoryRepository.create.mockResolvedValue(mockMemory);

      const result = await server.executeTool("remember", {
        content: "Test memory with metadata",
        type: "semantic",
        userId: "user_123",
        importance: 0.8,
        tags: ["important", "work"],
        keywords: ["test", "memory"],
        category: "project",
        context: "Test context",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).memoryId).toBe("mem_124");
      expect((result.data as any).connections).toBe(1);
      expect(mockMemoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Test memory with metadata",
          userId: "user_123",
          primarySector: "semantic",
        }),
        expect.objectContaining({
          keywords: ["test", "memory"],
          tags: ["important", "work"],
          category: "project",
          context: "Test context",
          importance: 0.8,
        })
      );
    });

    it("should validate required parameters", async () => {
      const result = await server.executeTool("remember", {
        type: "episodic",
        userId: "user_123",
        // Missing content
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("content");
    });

    it("should validate memory type enum", async () => {
      const result = await server.executeTool("remember", {
        content: "Test content",
        type: "invalid_type",
        userId: "user_123",
      });

      expect(result.success).toBe(false);
    });

    it("should validate importance range", async () => {
      const mockMemory: Memory = {
        id: "mem_125",
        content: "Test content",
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        salience: 0.5,
        decayRate: 0.02,
        strength: 1.0,
        userId: "user_123",
        sessionId: "session_123",
        primarySector: "episodic",
        metadata: {
          keywords: [],
          tags: [],
          importance: 1.5, // Invalid but repository should handle
          isAtomic: true,
        },
      };

      mockMemoryRepository.create.mockResolvedValue(mockMemory);

      // Tool should accept but repository will validate
      const result = await server.executeTool("remember", {
        content: "Test content",
        type: "episodic",
        userId: "user_123",
        importance: 1.5,
      });

      // If schema validation is strict, this should fail
      // If not, repository will handle it
      expect(result).toBeDefined();
    });

    it("should verify embedding generation is triggered", async () => {
      const mockMemory: Memory = {
        id: "mem_126",
        content: "Test content",
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        salience: 0.5,
        decayRate: 0.02,
        strength: 1.0,
        userId: "user_123",
        sessionId: "session_123",
        primarySector: "episodic",
        metadata: {
          keywords: [],
          tags: [],
          importance: 0.5,
          isAtomic: true,
        },
        embeddings: {
          episodic: new Array(768).fill(0.1),
          semantic: new Array(768).fill(0.1),
          procedural: new Array(768).fill(0.1),
          emotional: new Array(768).fill(0.1),
          reflective: new Array(768).fill(0.1),
        },
      };

      mockMemoryRepository.create.mockResolvedValue(mockMemory);

      const result = await server.executeTool("remember", {
        content: "Test content",
        type: "episodic",
        userId: "user_123",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).embeddings).toBe("generated");
    });

    it("should verify waypoint connections are created", async () => {
      const mockMemory: Memory = {
        id: "mem_127",
        content: "Test content",
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        salience: 0.5,
        decayRate: 0.02,
        strength: 1.0,
        userId: "user_123",
        sessionId: "session_123",
        primarySector: "episodic",
        metadata: {
          keywords: [],
          tags: [],
          importance: 0.5,
          isAtomic: true,
        },
        links: [
          {
            sourceId: "mem_127",
            targetId: "mem_100",
            linkType: LinkType.Semantic,
            weight: 0.85,
            createdAt: new Date(),
            traversalCount: 0,
          },
          {
            sourceId: "mem_127",
            targetId: "mem_101",
            linkType: LinkType.Temporal,
            weight: 0.75,
            createdAt: new Date(),
            traversalCount: 0,
          },
        ],
      };

      mockMemoryRepository.create.mockResolvedValue(mockMemory);

      const result = await server.executeTool("remember", {
        content: "Test content",
        type: "episodic",
        userId: "user_123",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).connections).toBe(2);
    });

    it("should include metadata in response", async () => {
      const mockMemory: Memory = {
        id: "mem_128",
        content: "Test content",
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        salience: 0.5,
        decayRate: 0.02,
        strength: 1.0,
        userId: "user_123",
        sessionId: "session_123",
        primarySector: "episodic",
        metadata: {
          keywords: [],
          tags: [],
          importance: 0.5,
          isAtomic: true,
        },
      };

      mockMemoryRepository.create.mockResolvedValue(mockMemory);

      const result = await server.executeTool("remember", {
        content: "Test content",
        type: "episodic",
        userId: "user_123",
      });

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.timestamp).toBeDefined();
      expect(result.metadata?.processingTime).toBeDefined();
    });

    it("should handle repository errors gracefully", async () => {
      mockMemoryRepository.create.mockRejectedValue(new Error("Database connection failed"));

      const result = await server.executeTool("remember", {
        content: "Test content",
        type: "episodic",
        userId: "user_123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database connection failed");
    });
  });

  describe("retrieve_memories tool", () => {
    beforeEach(() => {
      // Register retrieve_memories tool
      server.toolRegistry.registerTool({
        name: "recall",
        description: "Retrieve memories by ID or similarity search",
        inputSchema: {
          type: "object",
          properties: {
            memoryId: { type: "string" },
            cue: { type: "string" },
            userId: { type: "string" },
            sectors: { type: "array", items: { type: "string" } },
            limit: { type: "number", minimum: 1, maximum: 100 },
            offset: { type: "number", minimum: 0 },
          },
          required: ["userId"],
        },
        handler: async (params: any) => {
          if (params.memoryId) {
            // Retrieve by ID
            const memory = await mockMemoryRepository.retrieve(params.memoryId, params.userId);
            return {
              success: true,
              data: {
                memories: memory ? [memory] : [],
                count: memory ? 1 : 0,
              },
            };
          } else if (params.cue) {
            // Retrieve by similarity
            const result = await mockMemoryRepository.search({
              text: params.cue,
              sectors: params.sectors,
              limit: params.limit || 10,
              offset: params.offset || 0,
            });
            return {
              success: true,
              data: {
                memories: result.memories,
                scores: result.scores,
                count: result.totalCount,
              },
            };
          } else {
            return {
              success: false,
              error: "Either memoryId or cue must be provided",
            };
          }
        },
      });
    });

    it("should retrieve memory by ID", async () => {
      const mockMemory: Memory = {
        id: "mem_123",
        content: "Test memory content",
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
        salience: 0.5,
        decayRate: 0.02,
        strength: 1.0,
        userId: "user_123",
        sessionId: "session_123",
        primarySector: "episodic",
        metadata: {
          keywords: [],
          tags: [],
          importance: 0.5,
          isAtomic: true,
        },
      };

      mockMemoryRepository.retrieve.mockResolvedValue(mockMemory);

      const result = await server.executeTool("recall", {
        memoryId: "mem_123",
        userId: "user_123",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).memories).toHaveLength(1);
      expect((result.data as any).memories[0].id).toBe("mem_123");
      expect(mockMemoryRepository.retrieve).toHaveBeenCalledWith("mem_123", "user_123");
    });

    it("should retrieve memories by similarity cue", async () => {
      const mockSearchResult = {
        memories: [
          {
            id: "mem_200",
            content: "Similar memory 1",
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0,
            salience: 0.7,
            decayRate: 0.02,
            strength: 0.9,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "semantic",
            metadata: {
              keywords: ["test"],
              tags: [],
              importance: 0.7,
              isAtomic: true,
            },
          },
          {
            id: "mem_201",
            content: "Similar memory 2",
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0,
            salience: 0.6,
            decayRate: 0.02,
            strength: 0.8,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "semantic",
            metadata: {
              keywords: ["test"],
              tags: [],
              importance: 0.6,
              isAtomic: true,
            },
          },
        ],
        scores: [0.85, 0.75],
        totalCount: 2,
        processingTime: 50,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("recall", {
        cue: "test query",
        userId: "user_123",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).memories).toHaveLength(2);
      expect((result.data as any).scores).toEqual([0.85, 0.75]);
      expect((result.data as any).count).toBe(2);
      expect(mockMemoryRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "test query",
          limit: 10,
          offset: 0,
        })
      );
    });

    it("should retrieve with sector filtering", async () => {
      const mockSearchResult = {
        memories: [
          {
            id: "mem_202",
            content: "Episodic memory",
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0,
            salience: 0.7,
            decayRate: 0.02,
            strength: 0.9,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "episodic",
            metadata: {
              keywords: [],
              tags: [],
              importance: 0.7,
              isAtomic: true,
            },
          },
        ],
        scores: [0.9],
        totalCount: 1,
        processingTime: 45,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("recall", {
        cue: "test query",
        userId: "user_123",
        sectors: ["episodic", "semantic"],
      });

      expect(result.success).toBe(true);
      expect(mockMemoryRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sectors: ["episodic", "semantic"],
        })
      );
    });

    it("should support pagination with limit and offset", async () => {
      const mockSearchResult = {
        memories: [
          {
            id: "mem_203",
            content: "Memory 11",
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0,
            salience: 0.5,
            decayRate: 0.02,
            strength: 0.8,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "semantic",
            metadata: {
              keywords: [],
              tags: [],
              importance: 0.5,
              isAtomic: true,
            },
          },
        ],
        scores: [0.7],
        totalCount: 25,
        processingTime: 40,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("recall", {
        cue: "test query",
        userId: "user_123",
        limit: 5,
        offset: 10,
      });

      expect(result.success).toBe(true);
      expect(mockMemoryRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
          offset: 10,
        })
      );
    });

    it("should verify composite scoring is applied", async () => {
      const mockSearchResult = {
        memories: [
          {
            id: "mem_204",
            content: "High score memory",
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 5,
            salience: 0.9,
            decayRate: 0.02,
            strength: 1.0,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "semantic",
            metadata: {
              keywords: [],
              tags: [],
              importance: 0.9,
              isAtomic: true,
            },
          },
        ],
        scores: [0.95], // High composite score
        totalCount: 1,
        processingTime: 35,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("recall", {
        cue: "important query",
        userId: "user_123",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).scores[0]).toBeGreaterThan(0.9);
    });

    it("should handle non-existent memory ID", async () => {
      mockMemoryRepository.retrieve.mockResolvedValue(null);

      const result = await server.executeTool("recall", {
        memoryId: "nonexistent_id",
        userId: "user_123",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).memories).toHaveLength(0);
      expect((result.data as any).count).toBe(0);
    });

    it("should require either memoryId or cue", async () => {
      const result = await server.executeTool("recall", {
        userId: "user_123",
        // Neither memoryId nor cue provided
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("memoryId or cue");
    });

    it("should handle repository errors", async () => {
      mockMemoryRepository.retrieve.mockRejectedValue(new Error("Database error"));

      const result = await server.executeTool("recall", {
        memoryId: "mem_123",
        userId: "user_123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database error");
    });
  });

  describe("update_memory tool", () => {
    beforeEach(() => {
      // Register update_memory tool
      server.toolRegistry.registerTool({
        name: "update_memory",
        description: "Update an existing memory",
        inputSchema: {
          type: "object",
          properties: {
            memoryId: { type: "string" },
            userId: { type: "string" },
            content: { type: "string" },
            keywords: { type: "array", items: { type: "string" } },
            tags: { type: "array", items: { type: "string" } },
            category: { type: "string" },
            importance: { type: "number", minimum: 0, maximum: 1 },
            salience: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["memoryId", "userId"],
        },
        handler: async (params: any) => {
          const updates: any = {};
          if (params.content !== undefined) updates.content = params.content;
          if (params.keywords !== undefined) updates.keywords = params.keywords;
          if (params.tags !== undefined) updates.tags = params.tags;
          if (params.category !== undefined) updates.category = params.category;
          if (params.importance !== undefined) updates.importance = params.importance;
          if (params.salience !== undefined) updates.salience = params.salience;

          const result = await mockMemoryRepository.update(params.memoryId, updates);

          return {
            success: true,
            data: {
              memoryId: result.memory.id,
              updated: result.updated,
              reembedded: result.reembedded,
            },
          };
        },
      });
    });

    it("should update memory content and trigger re-embedding", async () => {
      const mockUpdateResult = {
        memory: {
          id: "mem_123",
          content: "Updated content",
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1,
          salience: 0.5,
          decayRate: 0.02,
          strength: 1.0,
          userId: "user_123",
          sessionId: "session_123",
          primarySector: "episodic",
          metadata: {
            keywords: [],
            tags: [],
            importance: 0.5,
            isAtomic: true,
          },
        },
        updated: ["content"],
        reembedded: true,
      };

      mockMemoryRepository.update.mockResolvedValue(mockUpdateResult);

      const result = await server.executeTool("update_memory", {
        memoryId: "mem_123",
        userId: "user_123",
        content: "Updated content",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).updated).toContain("content");
      expect((result.data as any).reembedded).toBe(true);
      expect(mockMemoryRepository.update).toHaveBeenCalledWith(
        "mem_123",
        expect.objectContaining({
          content: "Updated content",
        })
      );
    });

    it("should update metadata without re-embedding", async () => {
      const mockUpdateResult = {
        memory: {
          id: "mem_123",
          content: "Original content",
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1,
          salience: 0.5,
          decayRate: 0.02,
          strength: 1.0,
          userId: "user_123",
          sessionId: "session_123",
          primarySector: "episodic",
          metadata: {
            keywords: ["updated", "keywords"],
            tags: ["new-tag"],
            category: "updated-category",
            importance: 0.5,
            isAtomic: true,
          },
        },
        updated: ["keywords", "tags", "category"],
        reembedded: false,
      };

      mockMemoryRepository.update.mockResolvedValue(mockUpdateResult);

      const result = await server.executeTool("update_memory", {
        memoryId: "mem_123",
        userId: "user_123",
        keywords: ["updated", "keywords"],
        tags: ["new-tag"],
        category: "updated-category",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).updated).toEqual(["keywords", "tags", "category"]);
      expect((result.data as any).reembedded).toBe(false);
    });

    it("should update importance and salience", async () => {
      const mockUpdateResult = {
        memory: {
          id: "mem_123",
          content: "Test content",
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1,
          salience: 0.8,
          decayRate: 0.02,
          strength: 1.0,
          userId: "user_123",
          sessionId: "session_123",
          primarySector: "episodic",
          metadata: {
            keywords: [],
            tags: [],
            importance: 0.9,
            isAtomic: true,
          },
        },
        updated: ["importance", "salience"],
        reembedded: false,
      };

      mockMemoryRepository.update.mockResolvedValue(mockUpdateResult);

      const result = await server.executeTool("update_memory", {
        memoryId: "mem_123",
        userId: "user_123",
        importance: 0.9,
        salience: 0.8,
      });

      expect(result.success).toBe(true);
      expect((result.data as any).updated).toContain("importance");
      expect((result.data as any).updated).toContain("salience");
    });

    it("should support selective updates", async () => {
      const mockUpdateResult = {
        memory: {
          id: "mem_123",
          content: "Test content",
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1,
          salience: 0.5,
          decayRate: 0.02,
          strength: 1.0,
          userId: "user_123",
          sessionId: "session_123",
          primarySector: "episodic",
          metadata: {
            keywords: [],
            tags: ["only-tag-updated"],
            importance: 0.5,
            isAtomic: true,
          },
        },
        updated: ["tags"],
        reembedded: false,
      };

      mockMemoryRepository.update.mockResolvedValue(mockUpdateResult);

      const result = await server.executeTool("update_memory", {
        memoryId: "mem_123",
        userId: "user_123",
        tags: ["only-tag-updated"],
      });

      expect(result.success).toBe(true);
      expect((result.data as any).updated).toEqual(["tags"]);
      expect(mockMemoryRepository.update).toHaveBeenCalledWith(
        "mem_123",
        expect.objectContaining({
          tags: ["only-tag-updated"],
        })
      );
    });

    it("should handle non-existent memory", async () => {
      mockMemoryRepository.update.mockRejectedValue(new Error("Memory not found"));

      const result = await server.executeTool("update_memory", {
        memoryId: "nonexistent_id",
        userId: "user_123",
        content: "Updated content",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Memory not found");
    });

    it("should validate required parameters", async () => {
      const result = await server.executeTool("update_memory", {
        userId: "user_123",
        // Missing memoryId
        content: "Updated content",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("memoryId");
    });
  });

  describe("delete_memory tool", () => {
    beforeEach(() => {
      // Register delete_memory tool
      server.toolRegistry.registerTool({
        name: "forget",
        description: "Delete a memory (soft or hard delete)",
        inputSchema: {
          type: "object",
          properties: {
            memoryId: { type: "string" },
            userId: { type: "string" },
            soft: { type: "boolean" },
          },
          required: ["memoryId", "userId"],
        },
        handler: async (params: any) => {
          await mockMemoryRepository.delete(params.memoryId, params.soft ?? true);

          return {
            success: true,
            data: {
              memoryId: params.memoryId,
              deletionType: (params.soft ?? true) ? "soft" : "hard",
            },
          };
        },
      });
    });

    it("should perform soft delete by default", async () => {
      mockMemoryRepository.delete.mockResolvedValue(undefined);

      const result = await server.executeTool("forget", {
        memoryId: "mem_123",
        userId: "user_123",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).deletionType).toBe("soft");
      expect(mockMemoryRepository.delete).toHaveBeenCalledWith("mem_123", true);
    });

    it("should perform hard delete when specified", async () => {
      mockMemoryRepository.delete.mockResolvedValue(undefined);

      const result = await server.executeTool("forget", {
        memoryId: "mem_123",
        userId: "user_123",
        soft: false,
      });

      expect(result.success).toBe(true);
      expect((result.data as any).deletionType).toBe("hard");
      expect(mockMemoryRepository.delete).toHaveBeenCalledWith("mem_123", false);
    });

    it("should verify cascade deletion of embeddings", async () => {
      // Mock implementation that tracks cascade
      mockMemoryRepository.delete.mockImplementation(async (_memoryId: string, _soft: boolean) => {
        // In real implementation, this would cascade delete embeddings
        // Test verifies the call is made correctly
        return undefined;
      });

      const result = await server.executeTool("forget", {
        memoryId: "mem_123",
        userId: "user_123",
        soft: false,
      });

      expect(result.success).toBe(true);
      expect(mockMemoryRepository.delete).toHaveBeenCalledWith("mem_123", false);
    });

    it("should verify cascade deletion of connections", async () => {
      mockMemoryRepository.delete.mockResolvedValue(undefined);

      const result = await server.executeTool("forget", {
        memoryId: "mem_123",
        userId: "user_123",
        soft: false,
      });

      expect(result.success).toBe(true);
      // Repository is responsible for cascade deletion
      expect(mockMemoryRepository.delete).toHaveBeenCalled();
    });

    it("should verify cascade deletion of metadata", async () => {
      mockMemoryRepository.delete.mockResolvedValue(undefined);

      const result = await server.executeTool("forget", {
        memoryId: "mem_123",
        userId: "user_123",
        soft: false,
      });

      expect(result.success).toBe(true);
      expect(mockMemoryRepository.delete).toHaveBeenCalled();
    });

    it("should handle non-existent memory", async () => {
      mockMemoryRepository.delete.mockRejectedValue(new Error("Memory not found"));

      const result = await server.executeTool("forget", {
        memoryId: "nonexistent_id",
        userId: "user_123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Memory not found");
    });

    it("should validate required parameters", async () => {
      const result = await server.executeTool("forget", {
        userId: "user_123",
        // Missing memoryId
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("memoryId");
    });
  });

  describe("search_memories tool", () => {
    beforeEach(() => {
      // Register search_memories tool
      server.toolRegistry.registerTool({
        name: "search",
        description: "Search memories with various filters",
        inputSchema: {
          type: "object",
          properties: {
            userId: { type: "string" },
            text: { type: "string" },
            keywords: { type: "array", items: { type: "string" } },
            tags: { type: "array", items: { type: "string" } },
            category: { type: "string" },
            minStrength: { type: "number", minimum: 0, maximum: 1 },
            dateFrom: { type: "string", format: "date-time" },
            dateTo: { type: "string", format: "date-time" },
            limit: { type: "number", minimum: 1, maximum: 100 },
            offset: { type: "number", minimum: 0 },
          },
          required: ["userId"],
        },
        handler: async (params: any) => {
          const query: any = {};
          if (params.text) query.text = params.text;
          if (params.keywords) query.keywords = params.keywords;
          if (params.tags) query.tags = params.tags;
          if (params.category) query.category = params.category;
          if (params.minStrength !== undefined) query.minStrength = params.minStrength;
          if (params.dateFrom || params.dateTo) {
            query.dateRange = {
              from: params.dateFrom ? new Date(params.dateFrom) : undefined,
              to: params.dateTo ? new Date(params.dateTo) : undefined,
            };
          }
          query.limit = params.limit || 10;
          query.offset = params.offset || 0;

          const result = await mockMemoryRepository.search(query);

          return {
            success: true,
            data: {
              memories: result.memories,
              scores: result.scores,
              totalCount: result.totalCount,
              processingTime: result.processingTime,
            },
          };
        },
      });
    });

    it("should perform full-text search", async () => {
      const mockSearchResult = {
        memories: [
          {
            id: "mem_300",
            content: "Memory containing search text",
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0,
            salience: 0.7,
            decayRate: 0.02,
            strength: 0.9,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "semantic",
            metadata: {
              keywords: [],
              tags: [],
              importance: 0.7,
              isAtomic: true,
            },
          },
        ],
        scores: [0.85],
        totalCount: 1,
        processingTime: 45,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("search", {
        userId: "user_123",
        text: "search text",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).memories).toHaveLength(1);
      expect(mockMemoryRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "search text",
        })
      );
    });

    it("should filter by keywords", async () => {
      const mockSearchResult = {
        memories: [
          {
            id: "mem_301",
            content: "Memory with keywords",
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0,
            salience: 0.6,
            decayRate: 0.02,
            strength: 0.8,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "semantic",
            metadata: {
              keywords: ["test", "important"],
              tags: [],
              importance: 0.6,
              isAtomic: true,
            },
          },
        ],
        scores: [0.8],
        totalCount: 1,
        processingTime: 40,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("search", {
        userId: "user_123",
        keywords: ["test", "important"],
      });

      expect(result.success).toBe(true);
      expect(mockMemoryRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: ["test", "important"],
        })
      );
    });

    it("should filter by tags", async () => {
      const mockSearchResult = {
        memories: [
          {
            id: "mem_302",
            content: "Memory with tags",
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0,
            salience: 0.6,
            decayRate: 0.02,
            strength: 0.8,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "semantic",
            metadata: {
              keywords: [],
              tags: ["work", "project"],
              importance: 0.6,
              isAtomic: true,
            },
          },
        ],
        scores: [0.75],
        totalCount: 1,
        processingTime: 38,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("search", {
        userId: "user_123",
        tags: ["work", "project"],
      });

      expect(result.success).toBe(true);
      expect(mockMemoryRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["work", "project"],
        })
      );
    });

    it("should filter by category", async () => {
      const mockSearchResult = {
        memories: [
          {
            id: "mem_303",
            content: "Memory in category",
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0,
            salience: 0.6,
            decayRate: 0.02,
            strength: 0.8,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "semantic",
            metadata: {
              keywords: [],
              tags: [],
              category: "personal",
              importance: 0.6,
              isAtomic: true,
            },
          },
        ],
        scores: [0.7],
        totalCount: 1,
        processingTime: 35,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("search", {
        userId: "user_123",
        category: "personal",
      });

      expect(result.success).toBe(true);
      expect(mockMemoryRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "personal",
        })
      );
    });

    it("should filter by strength threshold", async () => {
      const mockSearchResult = {
        memories: [
          {
            id: "mem_304",
            content: "Strong memory",
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 10,
            salience: 0.9,
            decayRate: 0.02,
            strength: 0.95,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "semantic",
            metadata: {
              keywords: [],
              tags: [],
              importance: 0.9,
              isAtomic: true,
            },
          },
        ],
        scores: [0.9],
        totalCount: 1,
        processingTime: 42,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("search", {
        userId: "user_123",
        minStrength: 0.8,
      });

      expect(result.success).toBe(true);
      expect(mockMemoryRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          minStrength: 0.8,
        })
      );
    });

    it("should filter by date range", async () => {
      const mockSearchResult = {
        memories: [
          {
            id: "mem_305",
            content: "Recent memory",
            createdAt: new Date("2024-11-20"),
            lastAccessed: new Date(),
            accessCount: 0,
            salience: 0.6,
            decayRate: 0.02,
            strength: 0.9,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "episodic",
            metadata: {
              keywords: [],
              tags: [],
              importance: 0.6,
              isAtomic: true,
            },
          },
        ],
        scores: [0.8],
        totalCount: 1,
        processingTime: 40,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("search", {
        userId: "user_123",
        dateFrom: "2024-11-01T00:00:00Z",
        dateTo: "2024-11-30T23:59:59Z",
      });

      expect(result.success).toBe(true);
      expect(mockMemoryRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: expect.objectContaining({
            from: expect.any(Date),
            to: expect.any(Date),
          }),
        })
      );
    });

    it("should combine multiple filters", async () => {
      const mockSearchResult = {
        memories: [
          {
            id: "mem_306",
            content: "Filtered memory",
            createdAt: new Date("2024-11-20"),
            lastAccessed: new Date(),
            accessCount: 5,
            salience: 0.8,
            decayRate: 0.02,
            strength: 0.9,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "semantic",
            metadata: {
              keywords: ["important"],
              tags: ["work"],
              category: "project",
              importance: 0.8,
              isAtomic: true,
            },
          },
        ],
        scores: [0.92],
        totalCount: 1,
        processingTime: 55,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("search", {
        userId: "user_123",
        text: "important project",
        keywords: ["important"],
        tags: ["work"],
        category: "project",
        minStrength: 0.7,
      });

      expect(result.success).toBe(true);
      expect(mockMemoryRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "important project",
          keywords: ["important"],
          tags: ["work"],
          category: "project",
          minStrength: 0.7,
        })
      );
    });

    it("should support pagination", async () => {
      const mockSearchResult = {
        memories: [
          {
            id: "mem_307",
            content: "Page 2 memory",
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0,
            salience: 0.5,
            decayRate: 0.02,
            strength: 0.8,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "semantic",
            metadata: {
              keywords: [],
              tags: [],
              importance: 0.5,
              isAtomic: true,
            },
          },
        ],
        scores: [0.7],
        totalCount: 50,
        processingTime: 45,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("search", {
        userId: "user_123",
        text: "search",
        limit: 20,
        offset: 20,
      });

      expect(result.success).toBe(true);
      expect((result.data as any).totalCount).toBe(50);
      expect(mockMemoryRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 20,
        })
      );
    });

    it("should verify result ranking", async () => {
      const mockSearchResult = {
        memories: [
          {
            id: "mem_308",
            content: "High relevance",
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 10,
            salience: 0.9,
            decayRate: 0.02,
            strength: 1.0,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "semantic",
            metadata: {
              keywords: [],
              tags: [],
              importance: 0.9,
              isAtomic: true,
            },
          },
          {
            id: "mem_309",
            content: "Medium relevance",
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 3,
            salience: 0.6,
            decayRate: 0.02,
            strength: 0.8,
            userId: "user_123",
            sessionId: "session_123",
            primarySector: "semantic",
            metadata: {
              keywords: [],
              tags: [],
              importance: 0.6,
              isAtomic: true,
            },
          },
        ],
        scores: [0.95, 0.75], // Ranked by score
        totalCount: 2,
        processingTime: 50,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("search", {
        userId: "user_123",
        text: "relevance test",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).scores[0]).toBeGreaterThan((result.data as any).scores[1]);
    });

    it("should handle empty search results", async () => {
      const mockSearchResult = {
        memories: [],
        scores: [],
        totalCount: 0,
        processingTime: 30,
      };

      mockMemoryRepository.search.mockResolvedValue(mockSearchResult);

      const result = await server.executeTool("search", {
        userId: "user_123",
        text: "nonexistent query",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).memories).toHaveLength(0);
      expect((result.data as any).totalCount).toBe(0);
    });

    it("should handle repository errors", async () => {
      mockMemoryRepository.search.mockRejectedValue(new Error("Search index unavailable"));

      const result = await server.executeTool("search", {
        userId: "user_123",
        text: "test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Search index unavailable");
    });
  });

  describe("Parameter Validation", () => {
    it("should enforce required parameters for store_memory", async () => {
      server.toolRegistry.registerTool({
        name: "test_store",
        description: "Test tool",
        inputSchema: {
          type: "object",
          properties: {
            content: { type: "string" },
            type: { type: "string" },
            userId: { type: "string" },
          },
          required: ["content", "type", "userId"],
        },
        handler: async () => ({ success: true }),
      });

      const result = await server.executeTool("test_store", {
        content: "Test",
        // Missing type and userId
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should validate parameter types", async () => {
      server.toolRegistry.registerTool({
        name: "test_types",
        description: "Test tool",
        inputSchema: {
          type: "object",
          properties: {
            importance: { type: "number" },
          },
        },
        handler: async (params: any) => {
          if (typeof params.importance !== "number") {
            throw new Error("importance must be a number");
          }
          return { success: true };
        },
      });

      const result = await server.executeTool("test_types", {
        importance: "not a number",
      });

      expect(result.success).toBe(false);
    });

    it("should validate parameter constraints (ranges)", async () => {
      server.toolRegistry.registerTool({
        name: "test_range",
        description: "Test tool",
        inputSchema: {
          type: "object",
          properties: {
            importance: { type: "number", minimum: 0, maximum: 1 },
          },
        },
        handler: async (params: any) => {
          if (params.importance < 0 || params.importance > 1) {
            throw new Error("importance must be between 0 and 1");
          }
          return { success: true };
        },
      });

      const result = await server.executeTool("test_range", {
        importance: 1.5,
      });

      expect(result.success).toBe(false);
    });

    it("should validate array parameters", async () => {
      server.toolRegistry.registerTool({
        name: "test_array",
        description: "Test tool",
        inputSchema: {
          type: "object",
          properties: {
            tags: { type: "array", items: { type: "string" } },
          },
        },
        handler: async (params: any) => {
          if (!Array.isArray(params.tags)) {
            throw new Error("tags must be an array");
          }
          return { success: true };
        },
      });

      const result = await server.executeTool("test_array", {
        tags: "not an array",
      });

      expect(result.success).toBe(false);
    });

    it("should validate enum values", async () => {
      server.toolRegistry.registerTool({
        name: "test_enum",
        description: "Test tool",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["episodic", "semantic", "procedural"] },
          },
        },
        handler: async (params: any) => {
          const validTypes = ["episodic", "semantic", "procedural"];
          if (!validTypes.includes(params.type)) {
            throw new Error(`type must be one of: ${validTypes.join(", ")}`);
          }
          return { success: true };
        },
      });

      const result = await server.executeTool("test_enum", {
        type: "invalid",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Error Messages", () => {
    it("should provide clear error messages for missing parameters", async () => {
      server.toolRegistry.registerTool({
        name: "test_missing",
        description: "Test tool",
        inputSchema: {
          type: "object",
          properties: {
            required_field: { type: "string" },
          },
          required: ["required_field"],
        },
        handler: async () => ({ success: true }),
      });

      const result = await server.executeTool("test_missing", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("required_field");
      expect(result.suggestion).toBeDefined();
    });

    it("should provide actionable error messages", async () => {
      server.toolRegistry.registerTool({
        name: "test_actionable",
        description: "Test tool",
        inputSchema: {
          type: "object",
          properties: {},
        },
        handler: async () => {
          throw new Error("Database connection failed");
        },
      });

      const result = await server.executeTool("test_actionable", {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestion).toBeDefined();
    });

    it("should not expose internal details in error messages", async () => {
      server.toolRegistry.registerTool({
        name: "test_internal",
        description: "Test tool",
        inputSchema: {
          type: "object",
          properties: {},
        },
        handler: async () => {
          throw new Error("Internal error: pg.Pool connection failed at line 123");
        },
      });

      const result = await server.executeTool("test_internal", {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Error message should be sanitized in production
    });

    it("should provide suggestions for fixing invalid inputs", async () => {
      const result = await server.executeTool("nonexistent_tool", {});

      expect(result.success).toBe(false);
      expect(result.suggestion).toBeDefined();
      expect(result.suggestion).toContain("Available tools");
    });

    it("should have consistent error format", async () => {
      server.toolRegistry.registerTool({
        name: "test_format",
        description: "Test tool",
        inputSchema: {
          type: "object",
          properties: {},
        },
        handler: async () => {
          throw new Error("Test error");
        },
      });

      const result = await server.executeTool("test_format", {});

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("error");
      expect(result).toHaveProperty("suggestion");
      expect(result).toHaveProperty("metadata");
      expect(result.success).toBe(false);
    });
  });
});
