/**
 * MCP Protocol Compliance Integration Tests
 *
 * Tests specific to MCP protocol compliance, tool schema validation,
 * and proper MCP response formatting.
 *
 * Requirements: 1.1, 1.2, 1.3
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CognitiveMCPServer } from "../../server/CognitiveMCPServer.js";
import { ProcessingMode, ReasoningType } from "../../types/core.js";
import { TOOL_SCHEMAS } from "../../types/mcp.js";

describe("MCP Protocol Compliance Integration Tests", () => {
  let server: CognitiveMCPServer;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set up test environment with unique temporary brain directory
    const testId = Math.random().toString(36).substring(7);
    process.env.COGNITIVE_BRAIN_DIR = `./tmp/test-brain-${testId}`;

    server = new CognitiveMCPServer();
    await server.initialize(true);
  });

  afterEach(async () => {
    await server.shutdown();

    // Restore original environment
    process.env = originalEnv;
  });

  describe("Tool Schema Validation", () => {
    it("should validate all tool schemas against MCP specification", () => {
      const requiredTools = [
        "think",
        "remember",
        "recall",
        "analyze_reasoning",
      ];

      requiredTools.forEach((toolName) => {
        const schema = TOOL_SCHEMAS[toolName as keyof typeof TOOL_SCHEMAS];

        // Verify schema structure
        expect(schema).toBeDefined();
        expect(schema.name).toBe(toolName);
        expect(typeof schema.description).toBe("string");
        expect(schema.description.length).toBeGreaterThan(10);
        expect(schema.inputSchema).toBeDefined();
        expect(schema.inputSchema.type).toBe("object");
        expect(schema.inputSchema.properties).toBeDefined();
        expect((schema.inputSchema as any).required).toBeDefined();
        expect(Array.isArray((schema.inputSchema as any).required)).toBe(true);
      });
    });

    it("should validate think tool schema completeness", () => {
      const thinkSchema = TOOL_SCHEMAS.think;

      expect(thinkSchema.inputSchema.properties.input).toBeDefined();
      expect(thinkSchema.inputSchema.properties.input.type).toBe("string");
      expect(thinkSchema.inputSchema.required).toContain("input");

      // Optional parameters should be properly typed
      expect(thinkSchema.inputSchema.properties.mode).toBeDefined();
      expect(thinkSchema.inputSchema.properties.mode.enum).toContain(
        ProcessingMode.BALANCED
      );
      expect(thinkSchema.inputSchema.properties.temperature).toBeDefined();
      expect(thinkSchema.inputSchema.properties.temperature.type).toBe(
        "number"
      );
      expect(thinkSchema.inputSchema.properties.enable_emotion).toBeDefined();
      expect(thinkSchema.inputSchema.properties.enable_emotion.type).toBe(
        "boolean"
      );
    });

    it("should validate remember tool schema completeness", () => {
      const rememberSchema = TOOL_SCHEMAS.remember;

      expect(rememberSchema.inputSchema.properties.content).toBeDefined();
      expect(rememberSchema.inputSchema.properties.content.type).toBe("string");
      expect(rememberSchema.inputSchema.properties.type).toBeDefined();
      expect(rememberSchema.inputSchema.properties.type.enum).toContain(
        "episodic"
      );
      expect(rememberSchema.inputSchema.properties.type.enum).toContain(
        "semantic"
      );
      expect(rememberSchema.inputSchema.required).toContain("content");
      expect(rememberSchema.inputSchema.required).toContain("type");
    });

    it("should validate recall tool schema completeness", () => {
      const recallSchema = TOOL_SCHEMAS.recall;

      expect(recallSchema.inputSchema.properties.cue).toBeDefined();
      expect(recallSchema.inputSchema.properties.cue.type).toBe("string");
      expect(recallSchema.inputSchema.properties.type).toBeDefined();
      expect(recallSchema.inputSchema.properties.type.enum).toContain("both");
      expect(recallSchema.inputSchema.properties.max_results).toBeDefined();
      expect(recallSchema.inputSchema.properties.max_results.type).toBe(
        "number"
      );
      expect(recallSchema.inputSchema.required).toContain("cue");
    });

    it("should validate analyze_reasoning tool schema completeness", () => {
      const analyzeSchema = TOOL_SCHEMAS.analyze_reasoning;

      expect(
        analyzeSchema.inputSchema.properties.reasoning_steps
      ).toBeDefined();
      expect(analyzeSchema.inputSchema.properties.reasoning_steps.type).toBe(
        "array"
      );
      expect(
        analyzeSchema.inputSchema.properties.reasoning_steps.items
      ).toBeDefined();
      expect(analyzeSchema.inputSchema.required).toContain("reasoning_steps");
    });
  });

  describe("Input Validation and Error Handling", () => {
    it("should reject invalid think tool parameters", async () => {
      const invalidCases = [
        { args: {}, expectedError: "input" },
        { args: { input: "" }, expectedError: "input" },
        {
          args: { input: "valid", mode: "invalid_mode" },
          expectedError: "mode",
        },
        {
          args: { input: "valid", temperature: -1 },
          expectedError: "temperature",
        },
        {
          args: { input: "valid", temperature: 3 },
          expectedError: "temperature",
        },
        { args: { input: "valid", max_depth: -1 }, expectedError: "depth" },
        { args: { input: "valid", max_depth: 0 }, expectedError: "depth" },
      ];

      for (const testCase of invalidCases) {
        await expect(
          server.handleThink(testCase.args as any)
        ).rejects.toThrow();
      }
    });

    it("should reject invalid remember tool parameters", async () => {
      const invalidCases = [
        { args: {}, expectedError: "content" },
        { args: { content: "" }, expectedError: "content" },
        { args: { content: "valid" }, expectedError: "type" },
        { args: { content: "valid", type: "invalid" }, expectedError: "type" },
        {
          args: { content: "valid", type: "episodic", importance: -1 },
          expectedError: "importance",
        },
        {
          args: { content: "valid", type: "episodic", importance: 2 },
          expectedError: "importance",
        },
      ];

      for (const testCase of invalidCases) {
        await expect(
          server.handleRemember(testCase.args as any)
        ).rejects.toThrow();
      }
    });

    it("should reject invalid recall tool parameters", async () => {
      const invalidCases = [
        { args: {}, expectedError: "cue" },
        { args: { cue: "" }, expectedError: "cue" },
        { args: { cue: "valid", type: "invalid" }, expectedError: "type" },
        {
          args: { cue: "valid", max_results: -1 },
          expectedError: "max_results",
        },
        {
          args: { cue: "valid", max_results: 0 },
          expectedError: "max_results",
        },
        { args: { cue: "valid", threshold: -1 }, expectedError: "threshold" },
        { args: { cue: "valid", threshold: 2 }, expectedError: "threshold" },
      ];

      for (const testCase of invalidCases) {
        await expect(
          server.handleRecall(testCase.args as any)
        ).rejects.toThrow();
      }
    });

    it("should reject invalid analyze_reasoning tool parameters", async () => {
      const invalidCases = [
        { args: {}, expectedError: "reasoning_steps" },
        { args: { reasoning_steps: [] }, expectedError: "reasoning_steps" },
        { args: { reasoning_steps: [{}] }, expectedError: "type" },
        {
          args: { reasoning_steps: [{ type: "invalid" }] },
          expectedError: "type",
        },
        {
          args: {
            reasoning_steps: [{ type: ReasoningType.LOGICAL_INFERENCE }],
          },
          expectedError: "content",
        },
        {
          args: {
            reasoning_steps: [
              { type: ReasoningType.LOGICAL_INFERENCE, content: "" },
            ],
          },
          expectedError: "content",
        },
      ];

      for (const testCase of invalidCases) {
        await expect(
          server.handleAnalyzeReasoning(testCase.args as any)
        ).rejects.toThrow();
      }
    });
  });

  describe("Response Format Compliance", () => {
    it("should return properly structured think responses", async () => {
      const result = await server.handleThink({
        input: "Test response structure",
        mode: ProcessingMode.BALANCED,
      });

      // Verify response structure
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");

      // Required fields
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe("string");
      expect(result.content.length).toBeGreaterThan(0);

      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence).toBe("number");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      expect(result.reasoning_path).toBeDefined();
      expect(Array.isArray(result.reasoning_path)).toBe(true);

      expect(result.emotional_context).toBeDefined();
      expect(typeof result.emotional_context).toBe("object");
      expect(typeof result.emotional_context.valence).toBe("number");
      expect(typeof result.emotional_context.arousal).toBe("number");
      expect(typeof result.emotional_context.dominance).toBe("number");

      expect(result.metadata).toBeDefined();
      expect(typeof result.metadata).toBe("object");
      expect(typeof result.metadata.processing_time_ms).toBe("number");
      expect(Array.isArray(result.metadata.components_used)).toBe(true);
      expect(result.metadata.system_mode).toBeDefined();
    });

    it("should return properly structured remember responses", async () => {
      const result = await server.handleRemember({
        content: "Test memory content",
        type: "episodic",
        importance: 0.7,
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");

      expect(result.success).toBeDefined();
      expect(typeof result.success).toBe("boolean");
      expect(result.success).toBe(true);

      expect(result.memory_id).toBeDefined();
      expect(typeof result.memory_id).toBe("string");
      expect(result.memory_id.length).toBeGreaterThan(0);

      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe("string");
    });

    it("should return properly structured recall responses", async () => {
      // First store a memory
      await server.handleRemember({
        content: "Test recall content",
        type: "semantic",
        importance: 0.8,
      });

      const result = await server.handleRecall({
        cue: "test recall",
        max_results: 5,
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");

      expect(result.memories).toBeDefined();
      expect(Array.isArray(result.memories)).toBe(true);

      expect(result.total_found).toBeDefined();
      expect(typeof result.total_found).toBe("number");
      expect(result.total_found).toBeGreaterThanOrEqual(0);

      expect(result.search_time_ms).toBeDefined();
      expect(typeof result.search_time_ms).toBe("number");
      expect(result.search_time_ms).toBeGreaterThanOrEqual(0);

      // Verify memory structure if any found
      if (result.memories.length > 0) {
        const memory = result.memories[0];
        expect(memory.content).toBeDefined();
        expect(typeof memory.content).toBe("string");
        expect(memory.importance).toBeDefined();
        expect(typeof memory.importance).toBe("number");
        expect(memory.timestamp).toBeDefined();
        expect(typeof memory.timestamp).toBe("number");
      }
    });

    it("should return properly structured analyze_reasoning responses", async () => {
      const result = await server.handleAnalyzeReasoning({
        reasoning_steps: [
          {
            type: ReasoningType.LOGICAL_INFERENCE,
            content: "If A then B, A is true, therefore B is true",
            confidence: 0.9,
            alternatives: [],
          },
          {
            type: ReasoningType.DEDUCTIVE,
            content: "This follows from the logical premise",
            confidence: 0.8,
            alternatives: [],
          },
        ],
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");

      expect(result.coherence_score).toBeDefined();
      expect(typeof result.coherence_score).toBe("number");
      expect(result.coherence_score).toBeGreaterThanOrEqual(0);
      expect(result.coherence_score).toBeLessThanOrEqual(1);

      expect(result.confidence_assessment).toBeDefined();
      expect(typeof result.confidence_assessment).toBe("string");

      expect(result.detected_biases).toBeDefined();
      expect(Array.isArray(result.detected_biases)).toBe(true);

      expect(result.suggested_improvements).toBeDefined();
      expect(Array.isArray(result.suggested_improvements)).toBe(true);

      expect(result.reasoning_quality).toBeDefined();
      expect(typeof result.reasoning_quality).toBe("object");
      expect(typeof result.reasoning_quality.logical_consistency).toBe(
        "number"
      );
      expect(typeof result.reasoning_quality.evidence_support).toBe("number");
      expect(typeof result.reasoning_quality.completeness).toBe("number");
    });
  });

  describe("Error Response Format Compliance", () => {
    it("should return properly formatted error responses", async () => {
      try {
        await server.handleThink({ input: "" } as any);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeDefined();
        expect(typeof (error as Error).message).toBe("string");
        expect((error as Error).message.length).toBeGreaterThan(0);
      }
    });

    it("should handle malformed requests gracefully", async () => {
      const malformedRequests = [
        null,
        undefined,
        {},
        { invalid: "parameter" },
        { input: null },
        { input: 123 },
        { input: [] },
        { input: {} },
      ];

      for (const request of malformedRequests) {
        try {
          await server.handleThink(request as any);
          expect(true).toBe(false); // Should not reach here
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe("Tool Registration and Discovery", () => {
    it("should properly register all cognitive tools", () => {
      // Verify that the server has registered request handlers
      const serverInstance = (server as any).server;
      expect(serverInstance._requestHandlers).toBeDefined();

      // Check for list_tools handler
      const listToolsHandler =
        serverInstance._requestHandlers.get("tools/list");
      expect(listToolsHandler).toBeDefined();

      // Check for call_tool handler
      const callToolHandler = serverInstance._requestHandlers.get("tools/call");
      expect(callToolHandler).toBeDefined();
    });

    it("should provide complete tool metadata", () => {
      Object.values(TOOL_SCHEMAS).forEach((schema) => {
        // Verify each tool has complete metadata
        expect(schema.name).toBeDefined();
        expect(typeof schema.name).toBe("string");
        expect(schema.name.length).toBeGreaterThan(0);

        expect(schema.description).toBeDefined();
        expect(typeof schema.description).toBe("string");
        expect(schema.description.length).toBeGreaterThan(20);

        expect(schema.inputSchema).toBeDefined();
        expect(schema.inputSchema.type).toBe("object");
        expect(schema.inputSchema.properties).toBeDefined();
        expect(
          Object.keys(schema.inputSchema.properties).length
        ).toBeGreaterThan(0);
      });
    });
  });

  describe("Concurrent Request Handling", () => {
    it("should handle multiple tool calls concurrently", async () => {
      const concurrentRequests = [
        server.handleThink({ input: "Concurrent think 1" }),
        server.handleThink({ input: "Concurrent think 2" }),
        server.handleRemember({
          content: "Concurrent memory",
          type: "episodic",
        }),
        server.handleRecall({ cue: "concurrent" }),
        server.handleAnalyzeReasoning({
          reasoning_steps: [
            {
              type: ReasoningType.LOGICAL_INFERENCE,
              content: "Concurrent reasoning",
              confidence: 0.7,
              alternatives: [],
            },
          ],
        }),
      ];

      const results = await Promise.all(concurrentRequests);

      expect(results.length).toBe(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });

    it("should maintain response integrity under concurrent load", async () => {
      const requestCount = 20;
      const requests = Array.from({ length: requestCount }, (_, i) =>
        server.handleThink({
          input: `Concurrent integrity test ${i}`,
          context: { session_id: `integrity_${i}` },
        })
      );

      const results = await Promise.all(requests);

      expect(results.length).toBe(requestCount);

      // Verify each response is properly structured and unique
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(typeof result.content).toBe("string");
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);

        // Verify response contains the unique input identifier
        expect(result.content).toContain(`${index}`);
      });
    });
  });

  describe("Protocol Version Compatibility", () => {
    it("should maintain backward compatibility", async () => {
      // Test with minimal required parameters (backward compatibility)
      const minimalThink = await server.handleThink({
        input: "Minimal think request",
      });

      expect(minimalThink).toBeDefined();
      expect(minimalThink.content).toBeDefined();

      const minimalRemember = await server.handleRemember({
        content: "Minimal remember request",
        type: "episodic",
      });

      expect(minimalRemember.success).toBe(true);

      const minimalRecall = await server.handleRecall({
        cue: "minimal",
      });
      expect(minimalRecall).toBeDefined();
      expect(Array.isArray(minimalRecall.memories)).toBe(true);
    });

    it("should handle extended parameters gracefully", async () => {
      // Test with all optional parameters
      const extendedThink = await server.handleThink({
        input: "Extended think request",
        mode: ProcessingMode.ANALYTICAL,
        context: {
          session_id: "extended_test",
          domain: "testing",
          urgency: 0.7,
          complexity: 0.8,
          previous_thoughts: ["Previous context"],
        },
        enable_emotion: true,
        enable_metacognition: true,
        max_depth: 8,
        temperature: 0.9,
      });

      expect(extendedThink).toBeDefined();
      expect(extendedThink.metadata.system_mode).toBe(
        ProcessingMode.ANALYTICAL
      );
      expect(extendedThink.metadata.temperature).toBe(0.9);
    });
  });
});
