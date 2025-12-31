/**
 * CognitiveMCPServer Tests
 *
 * Consolidated tests for MCP server initialization, tool registration, connection handling,
 * error recovery, and essential tool execution (memory and metacognitive tools).
 *
 * Requirements: 2.1, 2.4, 3.1, 7.1, 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Memory, MemoryMetadata, MemorySectorType } from "../../../memory/types.js";
import { CognitiveMCPServer } from "../../../server/mcp-server.js";
import type { MCPTool } from "../../../server/types.js";

// Mock all dependencies - use simple mocks like memory-tools.test.ts
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

/**
 * Creates a mock memory for testing
 */
function createMockMemory(
  id: string,
  userId: string,
  strength: number,
  content: string = "Test content"
): Memory {
  const now = new Date();
  const metadata: MemoryMetadata = {
    keywords: ["test"],
    tags: ["unit-test"],
    category: "test",
    importance: 0.5,
  };

  return {
    id,
    content,
    createdAt: now,
    lastAccessed: now,
    accessCount: 1,
    salience: 0.5,
    decayRate: 0.01,
    strength,
    userId,
    sessionId: "test-session",
    primarySector: "semantic" as MemorySectorType,
    metadata,
  };
}

describe("CognitiveMCPServer", () => {
  let server: CognitiveMCPServer;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new CognitiveMCPServer();
  });

  afterEach(async () => {
    if (server?.isInitialized) {
      try {
        await server.shutdown();
      } catch {
        // Ignore errors during cleanup
      }
    }
    vi.clearAllMocks();
  });

  describe("Server Startup and Initialization", () => {
    it("should start successfully with all components", async () => {
      vi.spyOn(server as any, "initializeComponents").mockResolvedValue(undefined);
      vi.spyOn(server as any, "registerTools").mockImplementation(() => {});

      await server.initialize();

      expect(server.isInitialized).toBe(true);
    });

    it("should initialize all cognitive components", async () => {
      vi.spyOn(server as any, "initializeComponents").mockImplementation(async () => {
        server.memoryRepository = {} as any;
        server.reasoningOrchestrator = {} as any;
        server.frameworkSelector = {} as any;
        server.confidenceAssessor = {} as any;
        server.biasDetector = {} as any;
        server.emotionAnalyzer = {} as any;
        server.performanceMonitor = {} as any;
      });
      vi.spyOn(server as any, "registerTools").mockImplementation(() => {});

      await server.initialize();

      expect(server.memoryRepository).toBeDefined();
      expect(server.reasoningOrchestrator).toBeDefined();
      expect(server.frameworkSelector).toBeDefined();
    });

    it("should handle initialization timeout", async () => {
      vi.spyOn(server as any, "initializeComponents").mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      await expect(server.initialize()).rejects.toThrow("Initialization timeout");
    });

    it("should not allow double initialization", async () => {
      vi.spyOn(server as any, "initializeComponents").mockResolvedValue(undefined);
      vi.spyOn(server as any, "registerTools").mockImplementation(() => {});

      await server.initialize();

      await expect(server.initialize()).rejects.toThrow("Server already initialized");
    });

    it("should rollback on initialization failure", async () => {
      vi.spyOn(server as any, "initializeMemoryRepository").mockRejectedValue(
        new Error("Database connection failed")
      );
      vi.spyOn(server as any, "rollbackInitialization").mockResolvedValue(undefined);

      await expect(server.initialize()).rejects.toThrow();
      expect(server.isInitialized).toBe(false);
    });
  });

  describe("Server Shutdown and Cleanup", () => {
    beforeEach(async () => {
      vi.spyOn(server as any, "initializeComponents").mockResolvedValue(undefined);
      vi.spyOn(server as any, "registerTools").mockImplementation(() => {});
      await server.initialize();
    });

    it("should shutdown gracefully", async () => {
      vi.spyOn(server as any, "shutdownComponents").mockResolvedValue(undefined);

      await server.shutdown();

      expect(server.isInitialized).toBe(false);
    });

    it("should handle shutdown errors gracefully", async () => {
      vi.spyOn(server as any, "shutdownComponents").mockRejectedValue(
        new Error("Component shutdown failed")
      );

      await expect(server.shutdown()).resolves.not.toThrow();
    });

    it("should not allow operations after shutdown", async () => {
      vi.spyOn(server as any, "shutdownComponents").mockResolvedValue(undefined);

      await server.shutdown();

      const result = await server.executeTool("test_tool", {});
      expect(result.success).toBe(false);
      expect(result.error).toContain("Server not initialized");
    });
  });

  describe("Tool Registration and Discovery", () => {
    beforeEach(async () => {
      vi.spyOn(server as any, "initializeComponents").mockResolvedValue(undefined);
      vi.spyOn(server as any, "registerTools").mockImplementation(() => {});
      await server.initialize();
    });

    it("should register and retrieve tools", async () => {
      server.toolRegistry.registerTool({
        name: "test_tool",
        description: "Test tool",
        inputSchema: { type: "object", properties: {} },
        handler: async () => ({ success: true }),
      });

      const tools = server.getTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.find((t) => t.name === "test_tool")).toBeDefined();
    });

    it("should prevent duplicate tool registration", async () => {
      const tool: MCPTool = {
        name: "test_tool",
        description: "Test tool",
        inputSchema: { type: "object", properties: {} },
        handler: async () => ({ success: true }),
      };

      server.toolRegistry.registerTool(tool);

      expect(() => server.toolRegistry.registerTool(tool)).toThrow("Tool already registered");
    });

    it("should validate tool schemas on registration", async () => {
      const invalidTool: any = {
        name: "invalid_tool",
      };

      expect(() => server.toolRegistry.registerTool(invalidTool)).toThrow("Invalid tool schema");
    });
  });

  describe("Health Check and Status", () => {
    beforeEach(async () => {
      vi.spyOn(server as any, "initializeComponents").mockImplementation(async () => {
        server.memoryRepository = {} as any;
        server.reasoningOrchestrator = {} as any;
        server.frameworkSelector = {} as any;
        server.confidenceAssessor = {} as any;
        server.evidenceExtractor = {} as any;
        server.biasDetector = {} as any;
        server.emotionAnalyzer = {} as any;
        server.performanceMonitor = {} as any;
        (server as any).databaseManager = {
          healthCheck: vi.fn().mockResolvedValue(true),
        };
      });
      vi.spyOn(server as any, "registerTools").mockImplementation(() => {});
      await server.initialize();
    });

    it("should provide health check endpoint", async () => {
      vi.spyOn(server as any, "checkConnection").mockResolvedValue(true);

      const health = await server.healthCheck();

      expect(health).toBeDefined();
      expect(health.healthy).toBeDefined();
    });

    it("should report component status", async () => {
      vi.spyOn(server as any, "checkConnection").mockResolvedValue(true);

      const health = await server.healthCheck();

      expect(health.components).toBeDefined();
      expect(health.components.memoryRepository).toBe("healthy");
    });

    it("should report unhealthy when components fail", async () => {
      server.memoryRepository = undefined;
      vi.spyOn(server as any, "checkConnection").mockResolvedValue(true);

      const health = await server.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.components.memoryRepository).toBe("unhealthy");
    });
  });

  describe("Tool Execution", () => {
    beforeEach(async () => {
      vi.spyOn(server as any, "initializeComponents").mockResolvedValue(undefined);
      vi.spyOn(server as any, "registerTools").mockImplementation(() => {});
      await server.initialize();
    });

    it("should execute tools successfully", async () => {
      server.toolRegistry.registerTool({
        name: "test_tool",
        description: "Test tool",
        inputSchema: { type: "object", properties: {} },
        handler: async () => ({ success: true, data: { value: "test" } }),
      });

      const result = await server.executeTool("test_tool", {});

      expect(result.success).toBe(true);
      expect((result.data as any).value).toBe("test");
    });

    it("should validate tool parameters", async () => {
      server.toolRegistry.registerTool({
        name: "param_tool",
        description: "Tool with parameters",
        inputSchema: {
          type: "object",
          properties: { required_param: { type: "string" } },
          required: ["required_param"],
        },
        handler: async (params: any) => ({ success: true, params }),
      });

      const result = await server.executeTool("param_tool", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("required_param");
    });

    it("should handle tool not found", async () => {
      const result = await server.executeTool("nonexistent_tool", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("Tool not found");
    });

    it("should handle tool execution errors", async () => {
      server.toolRegistry.registerTool({
        name: "error_tool",
        description: "Tool that throws error",
        inputSchema: { type: "object", properties: {} },
        handler: async () => {
          throw new Error("Tool execution failed");
        },
      });

      const result = await server.executeTool("error_tool", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("Tool execution failed");
    });

    it("should include metadata in responses", async () => {
      server.toolRegistry.registerTool({
        name: "meta_tool",
        description: "Tool with metadata",
        inputSchema: { type: "object", properties: {} },
        handler: async () => ({ success: true }),
      });

      const result = await server.executeTool("meta_tool", {});

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.timestamp).toBeDefined();
      expect(result.metadata?.processingTime).toBeDefined();
    });
  });
});

describe("Batch Recall Handler - includeDeleted Parameter", () => {
  let server: CognitiveMCPServer;
  let mockBatchRetrieve: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    server = new CognitiveMCPServer();
    mockBatchRetrieve = vi.fn();

    vi.spyOn(server as any, "initializeComponents").mockImplementation(async () => {
      server.memoryRepository = {
        batchRetrieve: mockBatchRetrieve,
        healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
      } as any;
      server.reasoningOrchestrator = {} as any;
      server.frameworkSelector = {} as any;
      server.confidenceAssessor = {} as any;
      server.evidenceExtractor = {} as any;
      server.biasDetector = {} as any;
      server.emotionAnalyzer = {} as any;
      server.performanceMonitor = {} as any;
      (server as any).databaseManager = {
        healthCheck: vi.fn().mockResolvedValue(true),
      };
    });

    await server.initialize();
  });

  afterEach(async () => {
    if (server?.isInitialized) {
      try {
        await server.shutdown();
      } catch {
        // Ignore errors during cleanup
      }
    }
    vi.clearAllMocks();
  });

  it("should pass includeDeleted=true to batchRetrieve and return soft-deleted memories", async () => {
    const userId = "test-user";
    const softDeletedMemory = createMockMemory("mem-1", userId, 0, "Soft-deleted memory");
    const activeMemory = createMockMemory("mem-2", userId, 0.8, "Active memory");

    mockBatchRetrieve.mockResolvedValue({
      memories: [softDeletedMemory, activeMemory],
      notFound: [],
      processingTime: 10,
    });

    const result = await server.executeTool("batch_recall", {
      userId,
      memoryIds: ["mem-1", "mem-2"],
      includeDeleted: true,
    });

    expect(mockBatchRetrieve).toHaveBeenCalledWith({
      userId,
      memoryIds: ["mem-1", "mem-2"],
      includeDeleted: true,
    });

    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.memories).toHaveLength(2);
  });

  it("should default to excluding soft-deleted memories when includeDeleted is not provided", async () => {
    const userId = "test-user";
    const activeMemory = createMockMemory("mem-2", userId, 0.8, "Active memory");

    mockBatchRetrieve.mockResolvedValue({
      memories: [activeMemory],
      notFound: ["mem-1"],
      processingTime: 10,
    });

    const result = await server.executeTool("batch_recall", {
      userId,
      memoryIds: ["mem-1", "mem-2"],
    });

    expect(mockBatchRetrieve).toHaveBeenCalledWith({
      userId,
      memoryIds: ["mem-1", "mem-2"],
      includeDeleted: undefined,
    });

    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.memories).toHaveLength(1);
  });

  it("should handle errors from batchRetrieve gracefully", async () => {
    mockBatchRetrieve.mockRejectedValue(new Error("Database connection failed"));

    const result = await server.executeTool("batch_recall", {
      userId: "test-user",
      memoryIds: ["mem-1"],
      includeDeleted: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Database connection failed");
  });
});

describe("Memory Tools - Essential Operations", () => {
  let server: CognitiveMCPServer;
  let mockMemoryRepository: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockMemoryRepository = {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      search: vi.fn(),
    };

    server = new CognitiveMCPServer();
    server.memoryRepository = mockMemoryRepository;
    (server as any).databaseManager = {
      healthCheck: vi.fn().mockResolvedValue(true),
    };
    server.isInitialized = true;
  });

  afterEach(async () => {
    if (server?.toolRegistry) {
      server.toolRegistry.clear();
    }
    if (server) {
      server.isInitialized = false;
    }
    vi.clearAllMocks();
  });

  describe("remember tool", () => {
    beforeEach(() => {
      server.toolRegistry.registerTool({
        name: "remember",
        description: "Store a new memory",
        inputSchema: {
          type: "object",
          properties: {
            content: { type: "string" },
            type: {
              type: "string",
              enum: ["episodic", "semantic", "procedural", "emotional", "reflective"],
            },
            userId: { type: "string" },
          },
          required: ["content", "type", "userId"],
        },
        handler: async (params: any) => {
          const memory = await mockMemoryRepository.create(
            {
              content: params.content,
              userId: params.userId,
              primarySector: params.type,
              sessionId: "test",
            },
            { keywords: [], tags: [], importance: 0.5, isAtomic: true }
          );
          return { success: true, data: { memoryId: memory.id } };
        },
      });
    });

    it("should store memory with required parameters", async () => {
      mockMemoryRepository.create.mockResolvedValue({ id: "mem_123", content: "Test" });

      const result = await server.executeTool("remember", {
        content: "Test memory content",
        type: "episodic",
        userId: "user_123",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).memoryId).toBe("mem_123");
      expect(mockMemoryRepository.create).toHaveBeenCalled();
    });

    it("should validate remember tool requires content parameter", async () => {
      const result = await server.executeTool("remember", {
        type: "episodic",
        userId: "user_123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("content");
    });

    it("should handle repository errors during memory creation", async () => {
      mockMemoryRepository.create.mockRejectedValue(new Error("Database error"));

      const result = await server.executeTool("remember", {
        content: "Test",
        type: "episodic",
        userId: "user_123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database error");
    });
  });

  describe("recall tool", () => {
    beforeEach(() => {
      server.toolRegistry.registerTool({
        name: "recall",
        description: "Retrieve memories",
        inputSchema: {
          type: "object",
          properties: {
            memoryId: { type: "string" },
            cue: { type: "string" },
            userId: { type: "string" },
          },
          required: ["userId"],
        },
        handler: async (params: any) => {
          if (params.memoryId) {
            const memory = await mockMemoryRepository.retrieve(params.memoryId, params.userId);
            return {
              success: true,
              data: { memories: memory ? [memory] : [], count: memory ? 1 : 0 },
            };
          } else if (params.cue) {
            const result = await mockMemoryRepository.search({ text: params.cue });
            return { success: true, data: { memories: result.memories, count: result.totalCount } };
          }
          return { success: false, error: "Either memoryId or cue must be provided" };
        },
      });
    });

    it("should retrieve memory by ID", async () => {
      mockMemoryRepository.retrieve.mockResolvedValue(createMockMemory("mem_123", "user_123", 1.0));

      const result = await server.executeTool("recall", {
        memoryId: "mem_123",
        userId: "user_123",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).memories).toHaveLength(1);
    });

    it("should handle non-existent memory", async () => {
      mockMemoryRepository.retrieve.mockResolvedValue(null);

      const result = await server.executeTool("recall", {
        memoryId: "nonexistent",
        userId: "user_123",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).memories).toHaveLength(0);
    });
  });

  describe("forget tool", () => {
    beforeEach(() => {
      server.toolRegistry.registerTool({
        name: "forget",
        description: "Delete a memory",
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
    });
  });
});

describe("Metacognitive Tools - Essential Operations", () => {
  let server: CognitiveMCPServer;
  let mockConfidenceAssessor: any;
  let mockBiasDetector: any;
  let mockEmotionAnalyzer: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockConfidenceAssessor = { assessConfidence: vi.fn() };
    mockBiasDetector = { detectBiasesFromText: vi.fn() };
    mockEmotionAnalyzer = { analyzeCircumplex: vi.fn(), classifyEmotions: vi.fn() };

    server = new CognitiveMCPServer();
    server.confidenceAssessor = mockConfidenceAssessor;
    server.biasDetector = mockBiasDetector;
    server.biasCorrector = {
      getSuggestion: vi.fn().mockReturnValue({
        biasType: "confirmation",
        suggestion: "Seek disconfirming evidence",
        techniques: ["Search for contradicting evidence"],
        challengeQuestions: ["What evidence would prove this wrong?"],
      }),
    } as any;
    server.emotionAnalyzer = mockEmotionAnalyzer;
    (server as any).databaseManager = { healthCheck: vi.fn().mockResolvedValue(true) };
    server.isInitialized = true;

    (server as any).registerMetacognitiveTools();
  });

  afterEach(async () => {
    if (server?.toolRegistry) {
      server.toolRegistry.clear();
    }
    if (server) {
      server.isInitialized = false;
    }
    vi.clearAllMocks();
  });

  describe("assess_confidence tool", () => {
    it("should assess confidence with multi-dimensional analysis", async () => {
      mockConfidenceAssessor.assessConfidence.mockResolvedValue({
        overallConfidence: 0.85,
        dimensions: {
          evidenceQuality: 0.9,
          reasoningCoherence: 0.85,
          completeness: 0.8,
          uncertaintyLevel: 0.15,
          biasFreedom: 0.9,
        },
        interpretation: "High confidence",
        recommendations: [],
      });

      const result = await server.executeTool("assess_confidence", {
        reasoning: "Based on metrics, optimization will improve throughput by 40%",
        evidence: ["Benchmark results", "Load tests"],
      });

      expect(result.success).toBe(true);
      expect((result.data as any).overallConfidence).toBe(0.85);
      expect((result.data as any).dimensions).toBeDefined();
    });

    it("should validate assess_confidence tool requires reasoning parameter", async () => {
      const result = await server.executeTool("assess_confidence", {
        evidence: ["Some evidence"],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("reasoning");
    });

    it("should handle confidence assessment errors gracefully", async () => {
      mockConfidenceAssessor.assessConfidence.mockRejectedValue(new Error("Assessment failed"));

      const result = await server.executeTool("assess_confidence", {
        reasoning: "Test reasoning",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Assessment failed");
    });
  });

  describe("detect_bias tool", () => {
    it("should detect biases and provide corrections", async () => {
      mockBiasDetector.detectBiasesFromText.mockReturnValue([
        {
          type: "confirmation",
          severity: 0.7,
          description: "Seeking only supporting evidence",
          evidence: ["Ignored contradictory data"],
        },
      ]);

      const result = await server.executeTool("detect_bias", {
        reasoning: "All the data supports my hypothesis",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).biases).toHaveLength(1);
      expect((result.data as any).biases[0].type).toBe("confirmation");
      expect((result.data as any).biases[0].correction).toBeDefined();
    });

    it("should handle no biases detected", async () => {
      mockBiasDetector.detectBiasesFromText.mockReturnValue([]);

      const result = await server.executeTool("detect_bias", {
        reasoning: "Objective analysis based on comprehensive data",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).biases).toHaveLength(0);
    });

    it("should validate detect_bias tool requires reasoning parameter", async () => {
      const result = await server.executeTool("detect_bias", {
        context: "Test context",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("reasoning");
    });
  });

  describe("detect_emotion tool", () => {
    it("should detect emotions using Circumplex model", async () => {
      mockEmotionAnalyzer.analyzeCircumplex.mockReturnValue({
        valence: 0.7,
        arousal: 0.6,
        dominance: 0.5,
        confidence: 0.85,
      });
      mockEmotionAnalyzer.classifyEmotions.mockReturnValue([]);

      const result = await server.executeTool("detect_emotion", {
        text: "I'm really excited about this project!",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).circumplex).toBeDefined();
      expect((result.data as any).circumplex.valence).toBe(0.7);
    });

    it("should classify discrete emotions when requested", async () => {
      mockEmotionAnalyzer.analyzeCircumplex.mockReturnValue({
        valence: 0.8,
        arousal: 0.7,
        dominance: 0.6,
        confidence: 0.85,
      });
      mockEmotionAnalyzer.classifyEmotions.mockReturnValue([
        { emotion: "joy", intensity: 0.85, confidence: 0.9 },
      ]);

      const result = await server.executeTool("detect_emotion", {
        text: "I'm so happy!",
        includeDiscrete: true,
      });

      expect(result.success).toBe(true);
      expect((result.data as any).discrete).toBeDefined();
      expect((result.data as any).discrete[0].emotion).toBe("joy");
    });

    it("should validate detect_emotion tool requires text parameter", async () => {
      const result = await server.executeTool("detect_emotion", {
        includeDiscrete: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("text");
    });
  });
});

describe("Export Memories Tool", () => {
  let server: CognitiveMCPServer;
  let mockExportImportService: {
    exportMemories: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    server = new CognitiveMCPServer();
    mockExportImportService = {
      exportMemories: vi.fn(),
    };

    vi.spyOn(server as any, "initializeComponents").mockImplementation(async () => {
      server.exportImportService = mockExportImportService as any;
      server.memoryRepository = {} as any;
      server.reasoningOrchestrator = {} as any;
      server.frameworkSelector = {} as any;
      server.confidenceAssessor = {} as any;
      server.evidenceExtractor = {} as any;
      server.biasDetector = {} as any;
      server.emotionAnalyzer = {} as any;
      server.performanceMonitor = {} as any;
      (server as any).databaseManager = {
        healthCheck: vi.fn().mockResolvedValue(true),
      };
    });

    await server.initialize();
  });

  afterEach(async () => {
    if (server?.isInitialized) {
      try {
        await server.shutdown();
      } catch {
        // Ignore errors during cleanup
      }
    }
    vi.clearAllMocks();
  });

  it("should export memories successfully", async () => {
    const mockExportResult = {
      memories: [
        {
          id: "mem-1",
          content:
            "Test memory content that is longer than 100 characters to test the preview truncation feature properly",
          primarySector: "episodic",
          metadata: { keywords: ["test"], tags: ["unit-test"] },
          embeddings: {
            episodic: [0.1, 0.2],
            semantic: [],
            procedural: [],
            emotional: [],
            reflective: [],
          },
          tags: ["test"],
          createdAt: "2024-01-01T00:00:00Z",
          lastAccessed: "2024-01-02T00:00:00Z",
          strength: 0.8,
          salience: 0.5,
          accessCount: 5,
          links: [{ targetId: "mem-2", weight: 0.6, linkType: "related" }],
        },
      ],
      exportedAt: "2024-01-15T00:00:00Z",
      version: "1.0.0",
      userId: "user-123",
      filter: {},
      count: 1,
    };

    mockExportImportService.exportMemories.mockResolvedValue(mockExportResult);

    const result = await server.executeTool("export_memories", {
      userId: "user-123",
    });

    expect(result.success).toBe(true);
    expect((result.data as any).count).toBe(1);
    expect((result.data as any).userId).toBe("user-123");
    expect((result.data as any).memories).toHaveLength(1);
    expect((result.data as any).memories[0].id).toBe("mem-1");
    expect((result.data as any).memories[0].hasEmbeddings).toBe(true);
    expect((result.data as any).memories[0].linkCount).toBe(1);
    expect((result.data as any).fullExport).toBeDefined();
    expect(mockExportImportService.exportMemories).toHaveBeenCalledWith("user-123", {});
  });

  it("should export memories with filters", async () => {
    const mockExportResult = {
      memories: [],
      exportedAt: "2024-01-15T00:00:00Z",
      version: "1.0.0",
      userId: "user-123",
      filter: {
        sectors: ["episodic", "semantic"],
        minStrength: 0.5,
      },
      count: 0,
    };

    mockExportImportService.exportMemories.mockResolvedValue(mockExportResult);

    const result = await server.executeTool("export_memories", {
      userId: "user-123",
      filter: {
        sectors: ["episodic", "semantic"],
        minStrength: 0.5,
      },
    });

    expect(result.success).toBe(true);
    expect((result.data as any).count).toBe(0);
    expect(mockExportImportService.exportMemories).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        sectors: ["episodic", "semantic"],
        minStrength: 0.5,
      })
    );
  });

  it("should return error when userId is missing", async () => {
    const result = await server.executeTool("export_memories", {});

    expect(result.success).toBe(false);
    expect(result.error).toContain("userId");
  });

  it("should handle export service errors gracefully", async () => {
    mockExportImportService.exportMemories.mockRejectedValue(
      new Error("Database connection failed")
    );

    const result = await server.executeTool("export_memories", {
      userId: "user-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Database connection failed");
  });

  it("should return error when export service is not initialized", async () => {
    server.exportImportService = undefined;

    const result = await server.executeTool("export_memories", {
      userId: "user-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Export/Import service not initialized");
  });
});

describe("Consolidate Memories Tool", () => {
  let server: CognitiveMCPServer;
  let mockConsolidationScheduler: {
    triggerNow: ReturnType<typeof vi.fn>;
    getConfig: ReturnType<typeof vi.fn>;
    updateConfig: ReturnType<typeof vi.fn>;
    getStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    server = new CognitiveMCPServer();
    mockConsolidationScheduler = {
      triggerNow: vi.fn(),
      getConfig: vi.fn().mockReturnValue({
        consolidationConfig: {
          similarityThreshold: 0.75,
          minClusterSize: 5,
          batchSize: 100,
          strengthReductionFactor: 0.5,
        },
      }),
      updateConfig: vi.fn(),
      getStatus: vi.fn().mockReturnValue({
        isRunning: false,
        lastRunAt: null,
        nextRunAt: null,
        currentProgress: null,
        detailedProgress: null,
        lastError: null,
        retryAttempts: 0,
        batchSize: 100,
      }),
    };

    vi.spyOn(server as any, "initializeComponents").mockImplementation(async () => {
      server.consolidationScheduler = mockConsolidationScheduler as any;
      server.memoryRepository = {} as any;
      server.reasoningOrchestrator = {} as any;
      server.frameworkSelector = {} as any;
      server.confidenceAssessor = {} as any;
      server.evidenceExtractor = {} as any;
      server.biasDetector = {} as any;
      server.emotionAnalyzer = {} as any;
      server.performanceMonitor = {} as any;
      (server as any).databaseManager = {
        healthCheck: vi.fn().mockResolvedValue(true),
      };
    });

    await server.initialize();
  });

  afterEach(async () => {
    if (server?.isInitialized) {
      try {
        await server.shutdown();
      } catch {
        // Ignore errors during cleanup
      }
    }
    vi.clearAllMocks();
  });

  it("should return success with 0 clusters when no memories to consolidate", async () => {
    mockConsolidationScheduler.triggerNow.mockResolvedValue([]);

    const result = await server.executeTool("consolidate_memories", {
      userId: "user-123",
    });

    expect(result.success).toBe(true);
    expect((result.data as any).consolidationsPerformed).toBe(0);
    expect((result.data as any).message).toContain("No clusters were consolidated");
    expect((result.data as any).results).toEqual([]);
  });

  it("should return success with consolidated clusters", async () => {
    const mockResults = [
      {
        summaryId: "summary-1",
        consolidatedIds: ["mem-1", "mem-2", "mem-3", "mem-4", "mem-5"],
        summaryContent: "This is a consolidated summary of related memories about programming.",
        consolidatedAt: new Date("2024-01-15T00:00:00Z"),
      },
    ];

    mockConsolidationScheduler.triggerNow.mockResolvedValue(mockResults);

    const result = await server.executeTool("consolidate_memories", {
      userId: "user-123",
    });

    expect(result.success).toBe(true);
    expect((result.data as any).consolidationsPerformed).toBe(1);
    expect((result.data as any).message).toContain("Successfully consolidated 1 cluster");
    expect((result.data as any).results).toHaveLength(1);
    expect((result.data as any).results[0].summaryId).toBe("summary-1");
    expect((result.data as any).results[0].consolidatedCount).toBe(5);
  });

  it("should return error when userId is missing", async () => {
    const result = await server.executeTool("consolidate_memories", {});

    expect(result.success).toBe(false);
    expect(result.error).toContain("userId");
  });

  it("should handle job already in progress error", async () => {
    const error = new Error("A consolidation job is already running");
    (error as any).code = "JOB_IN_PROGRESS";
    mockConsolidationScheduler.triggerNow.mockRejectedValue(error);

    const result = await server.executeTool("consolidate_memories", {
      userId: "user-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already running");
    expect(result.suggestion).toContain("Wait for it to complete");
  });

  it("should handle load threshold exceeded error", async () => {
    const error = new Error("Consolidation skipped due to high system load");
    (error as any).code = "LOAD_THRESHOLD_EXCEEDED";
    mockConsolidationScheduler.triggerNow.mockRejectedValue(error);

    const result = await server.executeTool("consolidate_memories", {
      userId: "user-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("high system load");
    expect(result.suggestion).toContain("Try again later");
  });

  it("should handle clustering error with helpful suggestion", async () => {
    mockConsolidationScheduler.triggerNow.mockRejectedValue(
      new Error("Failed to identify clusters")
    );

    const result = await server.executeTool("consolidate_memories", {
      userId: "user-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to identify clusters");
    expect(result.suggestion).toContain("database schema");
  });

  it("should return error when consolidation scheduler is not initialized", async () => {
    server.consolidationScheduler = undefined;

    const result = await server.executeTool("consolidate_memories", {
      userId: "user-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Consolidation scheduler not initialized");
  });

  it("should update config when provided", async () => {
    mockConsolidationScheduler.triggerNow.mockResolvedValue([]);

    await server.executeTool("consolidate_memories", {
      userId: "user-123",
      config: {
        similarityThreshold: 0.8,
        minClusterSize: 3,
      },
    });

    expect(mockConsolidationScheduler.updateConfig).toHaveBeenCalledWith({
      consolidationConfig: expect.objectContaining({
        similarityThreshold: 0.8,
        minClusterSize: 3,
      }),
    });
  });
});
