/**
 * Batch Recall Handler Unit Tests
 *
 * Tests for the batch_recall MCP tool handler, specifically testing
 * the includeDeleted parameter behavior.
 *
 * Requirements: 2.3, 2.4
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Memory, MemoryMetadata, MemorySectorType } from "../../../memory/types.js";
import { CognitiveMCPServer } from "../../../server/mcp-server.js";

// Mock all cognitive components
vi.mock("../../../memory/memory-repository.js", () => ({
  MemoryRepository: vi.fn().mockImplementation(() => ({
    healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    batchRetrieve: vi.fn(),
  })),
}));

vi.mock("../../../reasoning/orchestrator.js", () => ({
  ParallelReasoningOrchestrator: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../../../framework/framework-selector.js", () => ({
  DynamicFrameworkSelector: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../../../confidence/multi-dimensional-assessor.js", () => ({
  MultiDimensionalConfidenceAssessor: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../../../bias/bias-pattern-recognizer.js", () => ({
  BiasPatternRecognizer: vi.fn().mockImplementation(() => ({
    detectBiases: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../../../emotion/circumplex-analyzer.js", () => ({
  CircumplexEmotionAnalyzer: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../../../metacognitive/performance-monitoring-system.js", () => ({
  PerformanceMonitoringSystem: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../../../database/connection-manager.js", () => ({
  DatabaseConnectionManager: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    healthCheck: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock("../../../embeddings/embedding-engine.js", () => ({
  EmbeddingEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
  })),
}));

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

describe("Batch Recall Handler - includeDeleted Parameter", () => {
  let server: CognitiveMCPServer;
  let mockBatchRetrieve: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    server = new CognitiveMCPServer();

    // Create mock batchRetrieve function
    mockBatchRetrieve = vi.fn();

    // Initialize server with mocked components
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
    if (server.isInitialized) {
      try {
        await server.shutdown();
      } catch {
        // Ignore errors during cleanup
      }
    }
    vi.clearAllMocks();
  });

  /**
   * Test: includeDeleted=true returns soft-deleted memories
   * Requirements: 2.4
   */
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

    // Verify batchRetrieve was called with includeDeleted=true
    expect(mockBatchRetrieve).toHaveBeenCalledWith({
      userId,
      memoryIds: ["mem-1", "mem-2"],
      includeDeleted: true,
    });

    // Verify response includes both memories
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    const data = result.data as any;
    expect(data.memories).toHaveLength(2);

    // Verify soft-deleted memory is included with strength=0
    const softDeleted = data.memories.find((m: any) => m.id === "mem-1");
    expect(softDeleted).toBeDefined();
    expect(softDeleted.strength).toBe(0);
  });

  /**
   * Test: includeDeleted=false (default) excludes soft-deleted memories
   * Requirements: 2.3
   */
  it("should pass includeDeleted=false to batchRetrieve and exclude soft-deleted memories", async () => {
    const userId = "test-user";
    const activeMemory = createMockMemory("mem-2", userId, 0.8, "Active memory");

    // When includeDeleted=false, repository returns only active memories
    mockBatchRetrieve.mockResolvedValue({
      memories: [activeMemory],
      notFound: ["mem-1"], // Soft-deleted memory appears in notFound
      processingTime: 10,
    });

    const result = await server.executeTool("batch_recall", {
      userId,
      memoryIds: ["mem-1", "mem-2"],
      includeDeleted: false,
    });

    // Verify batchRetrieve was called with includeDeleted=false
    expect(mockBatchRetrieve).toHaveBeenCalledWith({
      userId,
      memoryIds: ["mem-1", "mem-2"],
      includeDeleted: false,
    });

    // Verify response excludes soft-deleted memory
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    const data = result.data as any;
    expect(data.memories).toHaveLength(1);
    expect(data.memories[0].id).toBe("mem-2");
    expect(data.notFound).toContain("mem-1");
  });

  /**
   * Test: Default behavior (no includeDeleted) excludes soft-deleted memories
   * Requirements: 2.3
   */
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
      // includeDeleted not provided - should default to false/undefined
    });

    // Verify batchRetrieve was called with includeDeleted undefined (default)
    expect(mockBatchRetrieve).toHaveBeenCalledWith({
      userId,
      memoryIds: ["mem-1", "mem-2"],
      includeDeleted: undefined,
    });

    // Verify response excludes soft-deleted memory
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    const data = result.data as any;
    expect(data.memories).toHaveLength(1);
  });

  /**
   * Test: Verify strength values are correctly returned
   * Requirements: 2.1, 2.4
   */
  it("should return current strength values for all memories including soft-deleted", async () => {
    const userId = "test-user";
    const memories = [
      createMockMemory("mem-1", userId, 0, "Soft-deleted"),
      createMockMemory("mem-2", userId, 0.5, "Half strength"),
      createMockMemory("mem-3", userId, 1.0, "Full strength"),
    ];

    mockBatchRetrieve.mockResolvedValue({
      memories,
      notFound: [],
      processingTime: 10,
    });

    const result = await server.executeTool("batch_recall", {
      userId,
      memoryIds: ["mem-1", "mem-2", "mem-3"],
      includeDeleted: true,
    });

    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.memories).toHaveLength(3);

    // Verify each memory has correct strength
    const mem1 = data.memories.find((m: any) => m.id === "mem-1");
    const mem2 = data.memories.find((m: any) => m.id === "mem-2");
    const mem3 = data.memories.find((m: any) => m.id === "mem-3");

    expect(mem1.strength).toBe(0);
    expect(mem2.strength).toBe(0.5);
    expect(mem3.strength).toBe(1.0);
  });

  /**
   * Test: Error handling when repository is not initialized
   */
  it("should return error when memory repository is not initialized", async () => {
    // Create a new server without initializing
    const uninitializedServer = new CognitiveMCPServer();

    const result = await uninitializedServer.executeTool("batch_recall", {
      userId: "test-user",
      memoryIds: ["mem-1"],
      includeDeleted: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not initialized");
  });

  /**
   * Test: Error handling when batchRetrieve throws
   */
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
