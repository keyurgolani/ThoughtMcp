/**
 * Unit tests for CognitiveMCPServer utility methods and error handling
 * Tests private methods, error paths, and edge cases to improve coverage
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CognitiveMCPServer } from "../../server/CognitiveMCPServer.js";
import { ProcessingMode } from "../../types/core.js";

describe("CognitiveMCPServer Utilities and Error Handling", () => {
  let server: CognitiveMCPServer;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set up test environment with unique temporary brain directory
    const testId = Math.random().toString(36).substring(7);
    process.env.COGNITIVE_BRAIN_DIR = `./tmp/test-brain-${testId}`;

    server = new CognitiveMCPServer();
    // Initialize without connecting to transport for testing
    await server.initialize(true);
  });

  afterEach(async () => {
    await server.shutdown();

    // Restore original environment
    process.env = originalEnv;
  });

  describe("Utility Methods", () => {
    it("should generate unique request IDs", () => {
      // Access private method through type assertion
      const generateRequestId = (server as any).generateRequestId.bind(server);

      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(typeof id1).toBe("string");
      expect(typeof id2).toBe("string");
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it("should create context from arguments", () => {
      const createContext = (server as any).createContext.bind(server);

      // Test with undefined
      const context1 = createContext();
      expect(context1).toBeDefined();
      expect(context1.session_id).toBe("default");
      expect(context1.timestamp).toBeGreaterThan(0);
      expect(context1.user_id).toBe("anonymous");

      // Test with partial context
      const context2 = createContext({
        session_id: "test_session",
        domain: "testing",
      });
      expect(context2.session_id).toBe("test_session");
      expect(context2.domain).toBe("testing");
      expect(context2.user_id).toBe("anonymous");

      // Test with full context
      const context3 = createContext({
        session_id: "full_session",
        user_id: "test_user",
        domain: "test_domain",
        urgency: 0.8,
        complexity: 0.9,
      });
      expect(context3.session_id).toBe("full_session");
      expect(context3.user_id).toBe("test_user");
      expect(context3.domain).toBe("test_domain");
      expect(context3.urgency).toBe(0.8);
      expect(context3.complexity).toBe(0.9);
    });

    it("should create cognitive config from arguments", () => {
      const createCognitiveConfig = (server as any).createCognitiveConfig.bind(
        server
      );

      // Test with minimal args
      const config1 = createCognitiveConfig({
        input: "test",
      });
      expect(config1).toBeDefined();
      expect(config1.default_mode).toBe(ProcessingMode.BALANCED);
      expect(config1.enable_emotion).toBe(true);
      expect(config1.enable_metacognition).toBe(true);

      // Test with full args
      const config2 = createCognitiveConfig({
        input: "test",
        mode: ProcessingMode.ANALYTICAL,
        enable_emotion: false,
        enable_metacognition: false,
        temperature: 0.3,
        max_depth: 5,
      });
      expect(config2.default_mode).toBe(ProcessingMode.ANALYTICAL);
      expect(config2.enable_emotion).toBe(false);
      expect(config2.enable_metacognition).toBe(false);
      expect(config2.temperature).toBe(0.3);
      expect(config2.max_reasoning_depth).toBe(5);
    });

    it("should create problem from input", () => {
      const createProblemFromInput = (
        server as any
      ).createProblemFromInput.bind(server);

      const context = {
        session_id: "test",
        domain: "testing",
        urgency: 0.7,
        complexity: 0.8,
      };

      const problem = createProblemFromInput(
        "Solve this complex problem",
        context
      );

      expect(problem).toBeDefined();
      expect(problem.description).toBe("Solve this complex problem");
      expect(problem.domain).toBe("testing");
      expect(problem.complexity).toBeCloseTo(0.45, 10);
      expect(problem.uncertainty).toBeGreaterThanOrEqual(0);
      expect(problem.uncertainty).toBeLessThanOrEqual(1);
      expect(Array.isArray(problem.constraints)).toBe(true);
      expect(Array.isArray(problem.stakeholders)).toBe(true);
      expect(problem.time_sensitivity).toBeGreaterThanOrEqual(0);
      expect(problem.time_sensitivity).toBeLessThanOrEqual(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle server initialization errors gracefully", async () => {
      // Create a new server instance ttialization
      const testServer = new CognitiveMCPServer();

      // Mock a component to throw an error during initialization
      const originalInitialize = testServer["cognitiveOrchestrator"].initialize;
      testServer["cognitiveOrchestrator"].initialize = vi
        .fn()
        .mockRejectedValue(new Error("Initialization failed"));

      await expect(testServer.initialize(true)).rejects.toThrow();

      // Restore original method
      testServer["cognitiveOrchestrator"].initialize = originalInitialize;
    });

    it("should handle validation errors in think tool", async () => {
      await expect(
        server.handleThink({
          input: "", // Empty input should fail validation
        })
      ).rejects.toThrow("Parameter validation failed");
    });

    it("should handle validation errors in remember tool", async () => {
      await expect(
        server.handleRemember({
          content: "", // Empty content should fail validation
          type: "episodic",
        })
      ).rejects.toThrow("Parameter validation failed");
    });

    it("should handle validation errors in recall tool", async () => {
      await expect(
        server.handleRecall({
          cue: "", // Empty cue should fail validation
        })
      ).rejects.toThrow("Parameter validation failed");
    });

    it("should handle invalid tool names in request handler", async () => {
      // Access the call tool handler directly
      const callToolHandler = (server as any).server._requestHandlers.get(
        "tools/call"
      );

      if (callToolHandler) {
        const result = await callToolHandler({
          method: "tools/call",
          params: {
            name: "nonexistent_tool",
            arguments: {},
          },
        });

        // Should return an error response, not throw
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain("Unknown tool");
      }
    });

    it("should handle malformed arguments in request handler", async () => {
      const callToolHandler = (server as any).server._requestHandlers.get(
        "tools/call"
      );

      if (callToolHandler) {
        const result = await callToolHandler({
          method: "tools/call",
          params: {
            name: "think",
            arguments: {}, // Use empty object instead of null
          },
        });

        // Should return an error response for missing required parameter
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain("validation failed");
      }
    });

    it("should handle component failures with graceful degradation", async () => {
      // Mock a component failure
      const originalThink = server["cognitiveOrchestrator"].think;
      server["cognitiveOrchestrator"].think = vi
        .fn()
        .mockRejectedValue(new Error("Component failure"));

      await expect(
        server.handleThink({
          input: "test input",
        })
      ).rejects.toThrow();

      // Restore original method
      server["cognitiveOrchestrator"].think = originalThink;
    });
  });

  describe("Server Lifecycle", () => {
    it("should handle multiple initialization calls", async () => {
      // Server is already initialized in beforeEach
      expect(server.isInitialized()).toBe(true);

      // Second initialization should not throw
      await expect(server.initialize(true)).resolves.not.toThrow();
      expect(server.isInitialized()).toBe(true);
    });

    it("should handle shutdown when not initialized", async () => {
      const newServer = new CognitiveMCPServer();
      // Don't initialize, just try to shutdown
      await expect(newServer.shutdown()).resolves.not.toThrow();
    });

    it("should handle multiple shutdown calls", async () => {
      await expect(server.shutdown()).resolves.not.toThrow();
      // Second shutdown should not throw
      await expect(server.shutdown()).resolves.not.toThrow();
    });

    it("should provide correct server info", () => {
      const info = server.getServerInfo();
      expect(info.name).toBe("thoughtmcp");
      expect(info.version).toBeDefined();
      expect(typeof info.version).toBe("string");
      expect(info.initialized).toBe(true);
    });
  });

  describe("Performance Monitoring", () => {
    it("should track performance metrics for all operations", async () => {
      const result = await server.handleThink({
        input: "Performance test",
      });

      expect(result.metadata.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.metadata.system_mode).toBeDefined();
      expect(result.metadata.temperature).toBeDefined();
    });

    it("should handle performance monitoring errors gracefully", async () => {
      // Mock performance monitor to throw an error
      const originalStartMeasurement =
        server["performanceMonitor"].startMeasurement;
      server["performanceMonitor"].startMeasurement = vi
        .fn()
        .mockImplementation(() => {
          throw new Error("Performance monitoring failed");
        });

      // Operation should still complete despite performance monitoring failure
      const result = await server.handleThink({
        input: "test with performance error",
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      // Restore original method
      server["performanceMonitor"].startMeasurement = originalStartMeasurement;
    });
  });

  describe("Parameter Validation", () => {
    it("should validate think parameters comprehensively", async () => {
      // Test various invalid parameters
      const invalidCases = [
        { input: "test", mode: "invalid_mode" },
        { input: "test", temperature: -1 },
        { input: "test", temperature: 3 },
        { input: "test", max_depth: 0 },
        { input: "test", max_depth: 25 },
      ];

      for (const invalidCase of invalidCases) {
        await expect(server.handleThink(invalidCase as any)).rejects.toThrow(
          "Parameter validation failed"
        );
      }
    });

    it("should validate remember parameters comprehensively", async () => {
      const invalidCases = [
        { content: "test", type: "invalid_type" },
        { content: "test", type: "episodic", importance: -1 },
        { content: "test", type: "episodic", importance: 2 },
      ];

      for (const invalidCase of invalidCases) {
        await expect(server.handleRemember(invalidCase as any)).rejects.toThrow(
          "Parameter validation failed"
        );
      }
    });

    it("should validate recall parameters comprehensively", async () => {
      const invalidCases = [
        { cue: "test", type: "invalid_type" },
        { cue: "test", threshold: -1 },
        { cue: "test", threshold: 2 },
        { cue: "test", max_results: 0 },
        { cue: "test", max_results: 100 },
      ];

      for (const invalidCase of invalidCases) {
        await expect(server.handleRecall(invalidCase as any)).rejects.toThrow(
          "Parameter validation failed"
        );
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long input strings", async () => {
      const longInput = "A".repeat(50000); // Very long input

      const result = await server.handleThink({
        input: longInput,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it("should handle special characters in input", async () => {
      const specialInput =
        "Test with special chars: !@#$%^&*()[]{}|\\:;\"'<>,.?/~`";

      const result = await server.handleThink({
        input: specialInput,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it("should handle unicode characters in input", async () => {
      const unicodeInput = "Test with unicode: 你好世界 🌍 🚀 ñáéíóú";

      const result = await server.handleThink({
        input: unicodeInput,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it("should handle empty context objects", async () => {
      const result = await server.handleThink({
        input: "test",
        context: {},
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it("should handle null and undefined values in context", async () => {
      const result = await server.handleThink({
        input: "test",
        context: {
          session_id: undefined,
          domain: undefined,
          urgency: undefined,
        },
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });
});
