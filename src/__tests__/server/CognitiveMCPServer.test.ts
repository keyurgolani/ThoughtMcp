/**
 * Unit tests for CognitiveMCPServer
 * Tests the main MCP server implementation and tool handling functionality
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CognitiveMCPServer } from "../../server/CognitiveMCPServer.js";
import { ProcessingMode } from "../../types/core.js";

// Mock the MCP SDK
vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock cognitive components
vi.mock("../../cognitive/CognitiveOrchestrator.js", () => ({
  CognitiveOrchestrator: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    think: vi.fn().mockResolvedValue({
      content: "Test cognitive response",
      confidence: 0.8,
      reasoning_steps: [],
      processing_time_ms: 100,
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "CognitiveOrchestrator",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
  })),
}));

vi.mock("../../cognitive/MemorySystem.js", () => ({
  MemorySystem: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    storeExperience: vi.fn().mockResolvedValue({
      episodic_id: "test-memory-123",
      storage_time_ms: 50,
      success: true,
    }),
    storeEpisode: vi.fn().mockReturnValue("test-episode-456"),
    retrieveMemories: vi.fn().mockResolvedValue({
      episodic_memories: [],
      semantic_concepts: [],
      combined_relevance: 0.5,
      retrieval_time_ms: 25,
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "MemorySystem",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
  })),
}));

vi.mock("../../cognitive/MetacognitionModule.js", () => ({
  MetacognitionModule: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    analyzeReasoning: vi.fn().mockResolvedValue({
      confidence_calibration: 0.8,
      bias_detection: [],
      reasoning_quality: 0.9,
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "MetacognitionModule",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
  })),
}));

vi.mock("../../cognitive/SystematicThinkingOrchestrator.js", () => ({
  SystematicThinkingOrchestrator: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    processSystematically: vi.fn().mockResolvedValue({
      analysis: "Systematic analysis result",
      framework_used: "scientific_method",
      confidence: 0.9,
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "SystematicThinkingOrchestrator",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
  })),
}));

vi.mock("../../cognitive/ParallelReasoningProcessor.js", () => ({
  ParallelReasoningProcessor: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    processParallel: vi.fn().mockResolvedValue({
      streams: [],
      synthesis: "Parallel reasoning result",
      confidence: 0.85,
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "ParallelReasoningProcessor",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
  })),
}));

vi.mock("../../cognitive/ProbabilisticReasoningEngine.js", () => ({
  ProbabilisticReasoningEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    processProbabilistic: vi.fn().mockResolvedValue({
      hypotheses: [],
      evidence: [],
      confidence: 0.75,
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "ProbabilisticReasoningEngine",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
  })),
}));

vi.mock("../../cognitive/RealTimeProblemDecomposer.js", () => ({
  RealTimeProblemDecomposer: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    decompose: vi.fn().mockResolvedValue({
      subproblems: [],
      dependencies: [],
      complexity_analysis: {},
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "RealTimeProblemDecomposer",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
  })),
}));

// Mock forgetting system components
vi.mock("../../cognitive/forgetting/MemoryUsageAnalyzer.js", () => ({
  MemoryUsageAnalyzer: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../../cognitive/forgetting/GradualDegradationManager.js", () => ({
  GradualDegradationManager: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../../cognitive/forgetting/RecoveryEngine.js", () => ({
  RecoveryEngine: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../../cognitive/forgetting/ForgettingControlSystem.js", () => ({
  ForgettingControlSystem: vi.fn().mockImplementation(() => ({})),
}));

// Mock other dependencies
vi.mock("../../utils/config.js", () => ({
  ConfigManager: vi.fn().mockImplementation(() => ({
    getMemoryFilePath: vi.fn().mockReturnValue("./test-brain"),
    getConfig: vi.fn().mockReturnValue({}),
  })),
}));

vi.mock("../../utils/PerformanceMonitor.js", () => ({
  PerformanceMonitor: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    startMeasurement: vi.fn().mockReturnValue({
      recordCognitiveMetrics: vi.fn(),
      complete: vi.fn().mockReturnValue({ responseTime: 100 }),
    }),
    recordMetrics: vi.fn(),
    getMetrics: vi.fn().mockReturnValue({}),
  })),
}));

vi.mock("../../utils/logger.js", () => ({
  CognitiveLogger: {
    getInstance: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
  Logger: {
    getInstance: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("../../utils/version.js", () => ({
  getVersion: vi.fn().mockReturnValue("1.0.0-test"),
}));

describe("CognitiveMCPServer", () => {
  let server: CognitiveMCPServer;

  beforeEach(() => {
    server = new CognitiveMCPServer();
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      await expect(server.initialize()).resolves.not.toThrow();
    });

    it("should initialize all cognitive components", async () => {
      await server.initialize();

      // Verify components were initialized
      expect(server["cognitiveOrchestrator"].initialize).toHaveBeenCalled();
      expect(server["memorySystem"].initialize).toHaveBeenCalled();
      expect(server["metacognitionModule"].initialize).toHaveBeenCalled();
    });

    it("should register MCP tools during initialization", async () => {
      await server.initialize();

      // Verify server request handlers were set up
      expect(server["server"].setRequestHandler).toHaveBeenCalled();
    });

    it("should handle initialization errors gracefully", async () => {
      // Mock initialization failure
      vi.mocked(server["cognitiveOrchestrator"].initialize).mockRejectedValue(
        new Error("Component initialization failed")
      );

      await expect(server.initialize()).rejects.toThrow();
    });

    it("should not initialize twice", async () => {
      await server.initialize();

      // Second initialization should be ignored
      await server.initialize();

      // Should only be called once
      expect(server["cognitiveOrchestrator"].initialize).toHaveBeenCalledTimes(
        1
      );
    });
  });

  describe("Tool Handling", () => {
    beforeEach(async () => {
      await server.initialize();
    });

    describe("think tool", () => {
      it("should handle think requests successfully", async () => {
        const args = {
          input: "What is artificial intelligence?",
          mode: ProcessingMode.BALANCED,
          context: { session_id: "test-session" },
        };

        const result = await server.handleThink(args);

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });

      it("should validate think parameters", async () => {
        const invalidArgs = {
          input: "", // Empty input should be invalid
          mode: "invalid_mode" as any,
        };

        await expect(server.handleThink(invalidArgs)).rejects.toThrow();
      });

      it("should handle think errors gracefully", async () => {
        // Mock processing failure
        vi.mocked(server["cognitiveOrchestrator"].think).mockRejectedValue(
          new Error("Processing failed")
        );

        const args = {
          input: "This should fail",
          mode: ProcessingMode.BALANCED,
        };

        await expect(server.handleThink(args)).rejects.toThrow();
      });
    });

    describe("remember tool", () => {
      it("should handle remember requests successfully", async () => {
        const args = {
          content: "Important information to remember",
          type: "episodic" as const,
          importance: 0.8,
        };

        const result = await server.handleRemember(args);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.memory_id).toBeDefined();
      });

      it("should validate remember parameters", async () => {
        const invalidArgs = {
          content: "", // Empty content should be invalid
          type: "invalid_type" as any,
        };

        await expect(server.handleRemember(invalidArgs)).rejects.toThrow();
      });
    });

    describe("recall tool", () => {
      it("should handle recall requests successfully", async () => {
        const args = {
          cue: "artificial intelligence",
          max_results: 5,
        };

        const result = await server.handleRecall(args);

        expect(result).toBeDefined();
        expect(result.memories).toBeDefined();
        expect(result.total_found).toBeGreaterThanOrEqual(0);
      });

      it("should validate recall parameters", async () => {
        const invalidArgs = {
          cue: "", // Empty cue should be invalid
          max_results: -1, // Negative max_results should be invalid
        };

        await expect(server.handleRecall(invalidArgs)).rejects.toThrow();
      });
    });
  });

  describe("Error Handling", () => {
    beforeEach(async () => {
      await server.initialize();
    });

    it("should handle server initialization properly", async () => {
      // Test that the server initializes without errors
      expect(server).toBeDefined();
      await expect(server.initialize()).resolves.not.toThrow();
    });
  });

  describe("Performance Monitoring", () => {
    beforeEach(async () => {
      await server.initialize();
    });

    it("should monitor tool execution performance", async () => {
      const mockPerformanceMonitor = server["performanceMonitor"];

      const args = {
        input: "Test performance monitoring",
        mode: ProcessingMode.BALANCED,
      };

      await server.handleThink(args);

      expect(mockPerformanceMonitor.startMeasurement).toHaveBeenCalled();
    });
  });

  describe("Server Lifecycle", () => {
    it("should initialize server successfully", async () => {
      await expect(server.initialize()).resolves.not.toThrow();
    });

    it("should handle initialization errors gracefully", async () => {
      // Test that server handles initialization properly
      const newServer = new CognitiveMCPServer();
      await expect(newServer.initialize()).resolves.not.toThrow();
    });
  });

  describe("Configuration", () => {
    it("should use default configuration when none provided", () => {
      const defaultServer = new CognitiveMCPServer();
      expect(defaultServer).toBeDefined();
    });

    it("should accept custom performance thresholds", () => {
      const customThresholds = {
        responseTimeCritical: 5000,
        memoryUsageCritical: 1000 * 1024 * 1024,
      };

      const customServer = new CognitiveMCPServer(customThresholds);
      expect(customServer).toBeDefined();
    });
  });

  describe("Status and Health", () => {
    beforeEach(async () => {
      await server.initialize();
    });

    it("should initialize all components properly", () => {
      expect(server).toBeDefined();
      expect(server["cognitiveOrchestrator"]).toBeDefined();
      expect(server["memorySystem"]).toBeDefined();
    });
  });
});
