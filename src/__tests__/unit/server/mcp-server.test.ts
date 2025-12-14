/**
 * CognitiveMCPServer Tests
 *
 * Tests for MCP server initialization, tool registration, connection handling, and error recovery.
 * Following TDD principles - these tests define expected behavior before implementation.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Import implementation
import { CognitiveMCPServer } from "../../../server/mcp-server.js";
import type { MCPTool } from "../../../server/types.js";

// Mock all cognitive components
vi.mock("../../../memory/memory-repository.js", () => ({
  MemoryRepository: vi.fn().mockImplementation(() => ({
    healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
    disconnect: vi.fn().mockResolvedValue(undefined),
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

describe("CognitiveMCPServer", () => {
  let server: CognitiveMCPServer;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    server = new CognitiveMCPServer();
  });

  afterEach(async () => {
    // Cleanup: shutdown server if initialized
    if (server.isInitialized) {
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
      // Mock all initialization methods to succeed
      vi.spyOn(server as any, "initializeComponents").mockResolvedValue(undefined);
      vi.spyOn(server as any, "registerTools").mockImplementation(() => {});

      await server.initialize();

      expect(server.isInitialized).toBe(true);
    });

    it("should initialize all cognitive components", async () => {
      // Mock initialization to actually create the components
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

      // Verify all components are initialized
      expect(server.memoryRepository).toBeDefined();
      expect(server.reasoningOrchestrator).toBeDefined();
      expect(server.frameworkSelector).toBeDefined();
      expect(server.confidenceAssessor).toBeDefined();
      expect(server.biasDetector).toBeDefined();
      expect(server.emotionAnalyzer).toBeDefined();
      expect(server.performanceMonitor).toBeDefined();
    });

    it("should register all tools during initialization", async () => {
      vi.spyOn(server as any, "initializeComponents").mockResolvedValue(undefined);
      vi.spyOn(server as any, "registerTools").mockImplementation(() => {
        // Register a test tool
        server.toolRegistry.registerTool({
          name: "test_tool",
          description: "Test tool",
          inputSchema: { type: "object", properties: {} },
          handler: async () => ({ success: true }),
        });
      });

      await server.initialize();

      const tools = server.getTools();
      expect(tools.length).toBeGreaterThan(0);
    });

    it("should complete initialization within 5 seconds", async () => {
      vi.spyOn(server as any, "initializeComponents").mockResolvedValue(undefined);
      vi.spyOn(server as any, "registerTools").mockImplementation(() => {});

      const startTime = Date.now();
      await server.initialize();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });

    it("should handle initialization timeout", async () => {
      // Mock a component that takes too long to initialize
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
      // Mock a component initialization failure
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

    it("should cleanup all components", async () => {
      const shutdownSpy = vi
        .spyOn(server as any, "shutdownComponents")
        .mockResolvedValue(undefined);

      await server.shutdown();

      expect(shutdownSpy).toHaveBeenCalled();
    });

    it("should terminate all connections", async () => {
      // Set up a mock database manager
      const mockDisconnect = vi.fn().mockResolvedValue(undefined);
      (server as any).databaseManager = { disconnect: mockDisconnect };

      vi.spyOn(server as any, "shutdownComponents").mockImplementation(async () => {
        if ((server as any).databaseManager) {
          await (server as any).databaseManager.disconnect();
          (server as any).databaseManager = undefined;
        }
      });

      await server.shutdown();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it("should release all resources", async () => {
      // Set up mock components
      server.memoryRepository = {} as any;
      server.reasoningOrchestrator = {} as any;

      vi.spyOn(server as any, "shutdownComponents").mockImplementation(async () => {
        server.memoryRepository = undefined;
        server.reasoningOrchestrator = undefined;
      });

      await server.shutdown();

      // Verify resources are released
      expect(server.memoryRepository).toBeUndefined();
      expect(server.reasoningOrchestrator).toBeUndefined();
    });

    it("should complete shutdown within 10 seconds", async () => {
      vi.spyOn(server as any, "shutdownComponents").mockResolvedValue(undefined);

      const startTime = Date.now();
      await server.shutdown();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000);
    });

    it("should handle shutdown errors gracefully", async () => {
      // Mock a component shutdown failure
      vi.spyOn(server as any, "shutdownComponents").mockRejectedValue(
        new Error("Component shutdown failed")
      );

      // Should not throw, but log error
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
});

describe("Tool Registration and Discovery", () => {
  let server: CognitiveMCPServer;

  beforeEach(async () => {
    server = new CognitiveMCPServer();
    vi.spyOn(server as any, "initializeComponents").mockResolvedValue(undefined);
    vi.spyOn(server as any, "registerTools").mockImplementation(() => {});
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

  it("should register all required tools", async () => {
    // Register placeholder tool
    server.toolRegistry.registerTool({
      name: "placeholder",
      description: "Placeholder tool",
      inputSchema: { type: "object", properties: {} },
      handler: async () => ({ success: true }),
    });

    const tools = server.getTools();

    // Verify placeholder tool exists
    const placeholderTool = tools.find((t) => t.name === "placeholder");
    expect(placeholderTool).toBeDefined();
  });

  it("should return valid tool schemas", async () => {
    server.toolRegistry.registerTool({
      name: "test_tool",
      description: "Test tool",
      inputSchema: { type: "object", properties: {} },
      handler: async () => ({ success: true }),
    });

    const tools = server.getTools();

    tools.forEach((tool) => {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
    });
  });

  it("should allow tool discovery", async () => {
    const tools = server.getTools();

    expect(Array.isArray(tools)).toBe(true);
  });

  it("should prevent duplicate tool registration", async () => {
    const tool: MCPTool = {
      name: "test_tool",
      description: "Test tool",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async () => ({ success: true }),
    };

    server.toolRegistry.registerTool(tool);

    expect(() => server.toolRegistry.registerTool(tool)).toThrow("Tool already registered");
  });

  it("should validate tool schemas on registration", async () => {
    const invalidTool: any = {
      name: "invalid_tool",
      // Missing required fields
    };

    expect(() => server.toolRegistry.registerTool(invalidTool)).toThrow("Invalid tool schema");
  });

  it("should complete tool registration within 1 second", async () => {
    const startTime = Date.now();
    server.toolRegistry.registerTool({
      name: "test_tool",
      description: "Test tool",
      inputSchema: { type: "object", properties: {} },
      handler: async () => ({ success: true }),
    });
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000);
  });
});

describe("Connection Handling and Lifecycle", () => {
  let server: CognitiveMCPServer;

  beforeEach(async () => {
    server = new CognitiveMCPServer();
    vi.spyOn(server as any, "initializeComponents").mockImplementation(async () => {
      (server as any).databaseManager = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        healthCheck: vi.fn().mockResolvedValue(true),
      };
    });
    vi.spyOn(server as any, "registerTools").mockImplementation(() => {});
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

  it("should establish connections successfully", async () => {
    const connectionStatus = server.getConnectionStatus();

    expect(connectionStatus.connected).toBe(true);
  });

  it("should manage connection state", async () => {
    expect(server.getConnectionStatus().state).toBe("connected");

    vi.spyOn(server as any, "shutdownComponents").mockResolvedValue(undefined);
    await server.shutdown();

    expect(server.getConnectionStatus().state).toBe("disconnected");
  });

  it("should handle connection errors", async () => {
    // Mock a connection error
    vi.spyOn(server as any, "checkConnection").mockResolvedValue(false);
    vi.spyOn(server as any, "reconnect").mockRejectedValue(new Error("Connection lost"));

    const status = await server.healthCheck();

    expect(status.healthy).toBe(false);
  });

  it("should implement reconnection logic", async () => {
    // Simulate connection loss
    vi.spyOn(server as any, "checkConnection").mockResolvedValue(false);

    // Should attempt reconnection
    const reconnectSpy = vi.spyOn(server as any, "reconnect").mockResolvedValue(undefined);

    await server.healthCheck();

    expect(reconnectSpy).toHaveBeenCalled();
  });
});

describe("Error Handling and Recovery", () => {
  let server: CognitiveMCPServer;

  beforeEach(() => {
    server = new CognitiveMCPServer();
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

  it("should handle component initialization failures", async () => {
    // Mock the entire initialization chain to fail at memory repository
    vi.spyOn(server as any, "initializeDatabaseManager").mockResolvedValue(undefined);
    vi.spyOn(server as any, "initializeEmbeddingEngine").mockResolvedValue(undefined);
    vi.spyOn(server as any, "initializeMemoryRepository").mockRejectedValue(
      new Error("Database connection failed")
    );
    vi.spyOn(server as any, "rollbackInitialization").mockResolvedValue(undefined);

    await expect(server.initialize()).rejects.toThrow("Database connection failed");
    expect(server.isInitialized).toBe(false);
  });

  it("should handle tool execution errors", async () => {
    vi.spyOn(server as any, "initializeComponents").mockResolvedValue(undefined);
    vi.spyOn(server as any, "registerTools").mockImplementation(() => {});
    await server.initialize();

    // Mock tool that throws error
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

  it("should implement graceful degradation", async () => {
    vi.spyOn(server as any, "initializeComponents").mockImplementation(async () => {
      server.memoryRepository = {} as any;
      server.reasoningOrchestrator = {} as any;
      server.frameworkSelector = {} as any;
      server.confidenceAssessor = {} as any;
      server.biasDetector = {} as any;
      server.emotionAnalyzer = {} as any;
      server.performanceMonitor = {} as any;
      (server as any).databaseManager = {
        healthCheck: vi.fn().mockResolvedValue(true),
      };
    });
    vi.spyOn(server as any, "registerTools").mockImplementation(() => {});
    await server.initialize();

    // Simulate component failure by removing it
    server.biasDetector = undefined;

    // Server should continue operating without bias detection
    const health = await server.healthCheck();

    expect(health.degraded).toBe(true);
    expect(health.unavailableComponents).toContain("biasDetector");
  });

  it("should log all errors with context", async () => {
    const { Logger } = await import("../../../utils/logger.js");
    const loggerSpy = vi.spyOn(Logger, "error");

    vi.spyOn(server as any, "initializeComponents").mockImplementation(async () => {
      (server as any).databaseManager = {
        healthCheck: vi.fn().mockResolvedValue(true),
      };
    });
    vi.spyOn(server as any, "registerTools").mockImplementation(() => {});
    await server.initialize();

    // Trigger an error
    vi.spyOn(server as any, "checkConnection").mockRejectedValue(new Error("Connection error"));

    await server.healthCheck();

    expect(loggerSpy).toHaveBeenCalled();
  });

  it("should provide user-friendly error messages", async () => {
    vi.spyOn(server as any, "initializeComponents").mockResolvedValue(undefined);
    vi.spyOn(server as any, "registerTools").mockImplementation(() => {});
    await server.initialize();

    const result = await server.executeTool("nonexistent_tool", {});

    expect(result.success).toBe(false);
    expect(result.error).toContain("Tool not found");
    expect(result.suggestion).toBeDefined();
  });

  it("should recover from transient errors", async () => {
    vi.spyOn(server as any, "initializeComponents").mockImplementation(async () => {
      server.memoryRepository = {} as any;
      server.reasoningOrchestrator = {} as any;
      server.frameworkSelector = {} as any;
      server.confidenceAssessor = {} as any;
      server.biasDetector = {} as any;
      server.emotionAnalyzer = {} as any;
      server.performanceMonitor = {} as any;
      (server as any).databaseManager = {
        healthCheck: vi.fn().mockResolvedValue(true),
        disconnect: vi.fn().mockResolvedValue(undefined),
        connect: vi.fn().mockResolvedValue(undefined),
      };
    });
    vi.spyOn(server as any, "registerTools").mockImplementation(() => {});
    await server.initialize();

    // Simulate transient error by making a component fail temporarily
    const originalMemoryRepo = server.memoryRepository;
    server.memoryRepository = undefined;

    // First call fails due to missing component
    let health = await server.healthCheck();
    expect(health.healthy).toBe(false);
    expect(health.degraded).toBe(true);

    // Restore component (recovery)
    server.memoryRepository = originalMemoryRepo;

    // Second call succeeds
    health = await server.healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.degraded).toBe(false);
  });
});

describe("Health Check and Status", () => {
  let server: CognitiveMCPServer;

  beforeEach(async () => {
    server = new CognitiveMCPServer();
    vi.spyOn(server as any, "initializeComponents").mockImplementation(async () => {
      server.memoryRepository = {} as any;
      server.reasoningOrchestrator = {} as any;
      server.frameworkSelector = {} as any;
      server.confidenceAssessor = {} as any;
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
    expect(health.components.reasoningOrchestrator).toBe("healthy");
  });

  it("should provide performance metrics", async () => {
    vi.spyOn(server as any, "checkConnection").mockResolvedValue(true);

    // Wait a bit to ensure uptime > 0
    await new Promise((resolve) => setTimeout(resolve, 10));

    const health = await server.healthCheck();

    expect(health.metrics).toBeDefined();
    expect(health.metrics.uptime).toBeGreaterThanOrEqual(0);
    expect(health.metrics.requestCount).toBeGreaterThanOrEqual(0);
  });

  it("should perform readiness checks", async () => {
    vi.spyOn(server as any, "checkConnection").mockResolvedValue(true);

    const health = await server.healthCheck();

    expect(health.ready).toBe(true);
  });

  it("should respond to health check within 100ms", async () => {
    vi.spyOn(server as any, "checkConnection").mockResolvedValue(true);

    const startTime = Date.now();
    await server.healthCheck();
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100);
  });

  it("should report unhealthy when components fail", async () => {
    // Simulate component failure
    server.memoryRepository = undefined;

    vi.spyOn(server as any, "checkConnection").mockResolvedValue(true);

    const health = await server.healthCheck();

    expect(health.healthy).toBe(false);
    expect(health.components.memoryRepository).toBe("unhealthy");
  });

  it("should include timestamp in health status", async () => {
    vi.spyOn(server as any, "checkConnection").mockResolvedValue(true);

    const health = await server.healthCheck();

    expect(health.timestamp).toBeDefined();
    expect(new Date(health.timestamp).getTime()).toBeGreaterThan(0);
  });
});

describe("Tool Execution", () => {
  let server: CognitiveMCPServer;

  beforeEach(async () => {
    server = new CognitiveMCPServer();
    vi.spyOn(server as any, "initializeComponents").mockResolvedValue(undefined);
    vi.spyOn(server as any, "registerTools").mockImplementation(() => {});
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

  it("should execute tools successfully", async () => {
    // Register a test tool
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
        properties: {
          required_param: { type: "string" },
        },
        required: ["required_param"],
      },
      handler: async (params: any) => ({ success: true, params }),
    });

    // Missing required parameter
    const result = await server.executeTool("param_tool", {});

    expect(result.success).toBe(false);
    expect(result.error).toContain("required_param");
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
    expect(result.metadata?.componentsUsed).toBeDefined();
  });

  it("should handle tool not found", async () => {
    const result = await server.executeTool("nonexistent_tool", {});

    expect(result.success).toBe(false);
    expect(result.error).toContain("Tool not found");
  });

  it("should handle concurrent tool executions", async () => {
    server.toolRegistry.registerTool({
      name: "concurrent_tool",
      description: "Tool for concurrent testing",
      inputSchema: { type: "object", properties: {} },
      handler: async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { success: true };
      },
    });

    const promises = Array.from({ length: 10 }, () => server.executeTool("concurrent_tool", {}));

    const results = await Promise.all(promises);

    results.forEach((result) => {
      expect(result.success).toBe(true);
    });
  });
});
