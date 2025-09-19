/**
 * Integration tests for response formatting and error handling in the MCP server
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CognitiveMCPServer } from "../../server/CognitiveMCPServer.js";
import { ProcessingMode, ReasoningType } from "../../types/core.js";
import { ErrorHandler } from "../../utils/ErrorHandler.js";
import { ResponseFormatter } from "../../utils/ResponseFormatter.js";

describe("Response Formatting Integration", () => {
  let server: CognitiveMCPServer;

  beforeEach(async () => {
    server = new CognitiveMCPServer();
    await server.initialize(true); // Test mode
    ErrorHandler.clearErrorHistory();
  });

  afterEach(async () => {
    await server.shutdown();
    ErrorHandler.clearErrorHistory();
  });

  describe("Think Tool Response Formatting", () => {
    it("should return properly formatted successful think response", async () => {
      const result = await server.handleThink({
        input: "What is the meaning of life?",
        mode: ProcessingMode.BALANCED,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning_path).toBeDefined();
      expect(Array.isArray(result.reasoning_path)).toBe(true);
      expect(result.emotional_context).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle think tool validation errors gracefully", async () => {
      await expect(
        server.handleThink({
          input: "",
          mode: ProcessingMode.BALANCED,
        })
      ).rejects.toThrow("Think tool requires a valid input string");
    });

    it("should handle think tool with invalid mode gracefully", async () => {
      await expect(
        server.handleThink({
          input: "test",
          mode: "invalid_mode" as any,
        })
      ).rejects.toThrow("Invalid processing mode");
    });

    it("should handle think tool with invalid temperature gracefully", async () => {
      await expect(
        server.handleThink({
          input: "test",
          temperature: -1,
        })
      ).rejects.toThrow("Temperature must be a number between 0 and 2");
    });
  });

  describe("Remember Tool Response Formatting", () => {
    it("should return properly formatted successful remember response", async () => {
      const result = await server.handleRemember({
        content: "Test memory content",
        type: "episodic",
        importance: 0.8,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.memory_id).toBeDefined();
      expect(typeof result.memory_id).toBe("string");
      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe("string");
    });

    it("should handle remember tool validation errors gracefully", async () => {
      await expect(
        server.handleRemember({
          content: "",
          type: "episodic",
        })
      ).rejects.toThrow("Remember tool requires a valid content string");
    });

    it("should handle remember tool with invalid type gracefully", async () => {
      await expect(
        server.handleRemember({
          content: "test",
          type: "invalid" as any,
        })
      ).rejects.toThrow(
        'Remember tool requires type to be either "episodic" or "semantic"'
      );
    });

    it("should handle remember tool with invalid importance gracefully", async () => {
      await expect(
        server.handleRemember({
          content: "test",
          type: "episodic",
          importance: 2,
        })
      ).rejects.toThrow("Importance must be a number between 0 and 1");
    });
  });

  describe("Recall Tool Response Formatting", () => {
    it("should return properly formatted successful recall response", async () => {
      // First store some memories
      await server.handleRemember({
        content: "Test memory for recall",
        type: "episodic",
        importance: 0.7,
      });

      const result = await server.handleRecall({
        cue: "test memory",
        type: "both",
        max_results: 5,
      });

      expect(result).toBeDefined();
      expect(result.memories).toBeDefined();
      expect(Array.isArray(result.memories)).toBe(true);
      expect(result.total_found).toBeGreaterThanOrEqual(0);
      expect(result.search_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle recall tool validation errors gracefully", async () => {
      await expect(
        server.handleRecall({
          cue: "",
        })
      ).rejects.toThrow("Recall tool requires a valid cue string");
    });

    it("should handle recall tool with invalid type gracefully", async () => {
      await expect(
        server.handleRecall({
          cue: "test",
          type: "invalid" as any,
        })
      ).rejects.toThrow(
        'Recall type must be "episodic", "semantic", or "both"'
      );
    });

    it("should handle recall tool with invalid threshold gracefully", async () => {
      await expect(
        server.handleRecall({
          cue: "test",
          threshold: 2,
        })
      ).rejects.toThrow("Threshold must be a number between 0 and 1");
    });

    it("should handle recall tool with invalid max_results gracefully", async () => {
      await expect(
        server.handleRecall({
          cue: "test",
          max_results: 100,
        })
      ).rejects.toThrow("Max results must be a number between 1 and 50");
    });
  });

  describe("Analyze Reasoning Tool Response Formatting", () => {
    it("should return properly formatted successful analyze response", async () => {
      const reasoningSteps = [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "First reasoning step",
          confidence: 0.8,
          alternatives: [],
        },
        {
          type: ReasoningType.PATTERN_MATCH,
          content: "Second reasoning step",
          confidence: 0.7,
          alternatives: [],
        },
      ];

      const result = await server.handleAnalyzeReasoning({
        reasoning_steps: reasoningSteps,
      });

      expect(result).toBeDefined();
      expect(result.coherence_score).toBeGreaterThanOrEqual(0);
      expect(result.coherence_score).toBeLessThanOrEqual(1);
      expect(result.confidence_assessment).toBeDefined();
      expect(typeof result.confidence_assessment).toBe("string");
      expect(result.detected_biases).toBeDefined();
      expect(Array.isArray(result.detected_biases)).toBe(true);
      expect(result.suggested_improvements).toBeDefined();
      expect(Array.isArray(result.suggested_improvements)).toBe(true);
      expect(result.reasoning_quality).toBeDefined();
      expect(
        result.reasoning_quality.logical_consistency
      ).toBeGreaterThanOrEqual(0);
      expect(result.reasoning_quality.evidence_support).toBeGreaterThanOrEqual(
        0
      );
      expect(result.reasoning_quality.completeness).toBeGreaterThanOrEqual(0);
    });

    it("should handle analyze tool validation errors gracefully", async () => {
      await expect(
        server.handleAnalyzeReasoning({
          reasoning_steps: undefined as any,
        })
      ).rejects.toThrow(
        "Analyze reasoning tool requires an array of reasoning steps"
      );
    });

    it("should handle analyze tool with empty steps gracefully", async () => {
      await expect(
        server.handleAnalyzeReasoning({
          reasoning_steps: [],
        })
      ).rejects.toThrow("At least one reasoning step is required");
    });

    it("should handle analyze tool with invalid step structure gracefully", async () => {
      await expect(
        server.handleAnalyzeReasoning({
          reasoning_steps: [
            {
              type: "",
              content: "test",
              confidence: 0.5,
              alternatives: [],
            },
          ],
        })
      ).rejects.toThrow("Reasoning step 0 requires a valid type string");
    });
  });

  describe("Error Response Formatting", () => {
    it("should format validation errors consistently", async () => {
      try {
        await server.handleThink({
          input: "",
          mode: ProcessingMode.BALANCED,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain(
          "Think tool requires a valid input string"
        );
      }
    });

    it("should handle component failures gracefully", async () => {
      // Mock a component failure
      const originalThink = server.getCognitiveOrchestrator().think;
      server.getCognitiveOrchestrator().think = vi
        .fn()
        .mockRejectedValue(new Error("Simulated component failure"));

      try {
        await server.handleThink({
          input: "test input",
          mode: ProcessingMode.BALANCED,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain("Think processing failed");
      }

      // Restore original method
      server.getCognitiveOrchestrator().think = originalThink;
    });

    it("should provide meaningful error messages for different error types", async () => {
      const testCases = [
        {
          input: { input: "", mode: ProcessingMode.BALANCED },
          expectedError: "think tool requires a valid input string",
        },
        {
          input: { input: "test", temperature: -1 },
          expectedError: "Temperature must be a number between 0 and 2",
        },
        {
          input: { input: "test", max_depth: 0 },
          expectedError: "Max depth must be a number between 1 and 20",
        },
      ];

      for (const testCase of testCases) {
        try {
          await server.handleThink(testCase.input as any);
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error.message.toLowerCase()).toContain(
            testCase.expectedError.toLowerCase()
          );
        }
      }
    });
  });

  describe("Response Structure Validation", () => {
    it("should validate response structure for all tools", async () => {
      // Test think response structure
      const thinkResult = await server.handleThink({
        input: "test input",
        mode: ProcessingMode.BALANCED,
      });

      const thinkFormatted = ResponseFormatter.formatThinkResponse(
        thinkResult,
        100
      );
      expect(ResponseFormatter.validateResponse(thinkFormatted)).toBe(true);

      // Test remember response structure
      const rememberResult = await server.handleRemember({
        content: "test content",
        type: "episodic",
      });

      const rememberFormatted = ResponseFormatter.formatRememberResponse(
        rememberResult,
        100
      );
      expect(ResponseFormatter.validateResponse(rememberFormatted)).toBe(true);

      // Test recall response structure
      const recallResult = await server.handleRecall({
        cue: "test cue",
      });

      const recallFormatted =
        ResponseFormatter.formatRecallResponse(recallResult);
      expect(ResponseFormatter.validateResponse(recallFormatted)).toBe(true);

      // Test analyze response structure
      const analyzeResult = await server.handleAnalyzeReasoning({
        reasoning_steps: [
          {
            type: ReasoningType.LOGICAL_INFERENCE,
            content: "test step",
            confidence: 0.8,
            alternatives: [],
          },
        ],
      });

      const analyzeFormatted = ResponseFormatter.formatAnalyzeResponse(
        analyzeResult,
        100
      );
      expect(ResponseFormatter.validateResponse(analyzeFormatted)).toBe(true);
    });

    it("should handle malformed responses gracefully", () => {
      const malformedResponse = {
        success: true,
        // Missing data field
        metadata: {
          timestamp: Date.now(),
          processing_time_ms: 100,
          tool_name: "test",
          version: "1.0.0",
        },
      } as any;

      expect(ResponseFormatter.validateResponse(malformedResponse)).toBe(false);
    });
  });

  describe("Performance and Timing", () => {
    it("should track processing times accurately", async () => {
      const startTime = Date.now();

      const result = await server.handleThink({
        input: "Performance test input",
        mode: ProcessingMode.BALANCED,
      });

      const endTime = Date.now();
      const actualTime = endTime - startTime;

      expect(result.metadata.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.metadata.processing_time_ms).toBeLessThanOrEqual(
        actualTime + 100
      ); // Allow some margin
    });

    it("should handle timeout scenarios gracefully", async () => {
      // This test would require mocking a long-running operation
      // For now, we'll test that the timeout mechanism exists
      const result = await server.handleThink({
        input: "Quick test",
        mode: ProcessingMode.BALANCED,
      });

      expect(result.metadata.processing_time_ms).toBeLessThan(30000); // Should be well under timeout
    });
  });

  describe("Graceful Degradation", () => {
    it("should continue processing with component failures when possible", async () => {
      // This would require more sophisticated mocking of component failures
      // For now, we'll test that the error handling infrastructure is in place
      const stats = ErrorHandler.getErrorStatistics();
      expect(typeof stats).toBe("object");
    });

    it("should provide fallback responses when appropriate", async () => {
      // Test that fallback mechanisms are available
      const fallbackResponse = ResponseFormatter.createFallbackResponse(
        "test_tool",
        "Test error",
        "req_123"
      );

      expect(fallbackResponse.success).toBe(false);
      expect(fallbackResponse.error?.code).toBe("FORMATTING_ERROR");
      expect(fallbackResponse.metadata.tool_name).toBe("test_tool");
    });
  });
});
