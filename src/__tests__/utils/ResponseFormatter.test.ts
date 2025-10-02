/**
 * Unit tests for ResponseFormatter utility
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  ProcessingMode,
  ReasoningType,
  ThoughtResult,
} from "../../types/core.js";
import { AnalysisResult, MemoryResult, RecallResult } from "../../types/mcp.js";
import { ResponseFormatter } from "../../utils/ResponseFormatter.js";
import { getVersion } from "../../utils/version.js";

describe("ResponseFormatter", () => {
  let mockThoughtResult: ThoughtResult;
  let mockMemoryResult: MemoryResult;
  let mockRecallResult: RecallResult;
  let mockAnalysisResult: AnalysisResult;

  beforeEach(() => {
    // Mock ThoughtResult
    mockThoughtResult = {
      content: "Test thought content",
      confidence: 0.85,
      reasoning_path: [
        {
          type: ReasoningType.LOGICAL_INFERENCE,
          content: "Test reasoning step",
          confidence: 0.8,
          alternatives: [
            {
              content: "Alternative reasoning",
              confidence: 0.6,
              reasoning: "Alternative approach",
            },
          ],
          metadata: { test: "data" },
        },
      ],
      emotional_context: {
        valence: 0.5,
        arousal: 0.3,
        dominance: 0.7,
        specific_emotions: new Map([
          ["joy", 0.6],
          ["curiosity", 0.8],
        ]),
      },
      metadata: {
        processing_time_ms: 150,
        components_used: ["CognitiveOrchestrator"],
        memory_retrievals: 2,
        system_mode: ProcessingMode.BALANCED,
        temperature: 0.7,
      },
    };

    // Mock MemoryResult
    mockMemoryResult = {
      success: true,
      memory_id: "mem_123",
      message: "Memory stored successfully",
    };

    // Mock RecallResult
    mockRecallResult = {
      memories: [
        {
          content: "Test memory content",
          activation: 0.8,
          timestamp: Date.now(),
          associations: new Set(["test", "memory"]),
          emotional_valence: 0.5,
          importance: 0.7,
          context_tags: ["test"],
        },
      ],
      total_found: 1,
      search_time_ms: 50,
    };

    // Mock AnalysisResult
    mockAnalysisResult = {
      coherence_score: 0.85,
      confidence_assessment: "High confidence analysis",
      detected_biases: ["confirmation bias"],
      suggested_improvements: ["Consider alternative perspectives"],
      reasoning_quality: {
        logical_consistency: 0.9,
        evidence_support: 0.8,
        completeness: 0.7,
      },
    };
  });

  describe("formatThinkResponse", () => {
    it("should format a successful think response correctly", () => {
      const response = ResponseFormatter.formatThinkResponse(
        mockThoughtResult,
        150,
        "req_123"
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data!.content).toBe("Test thought content");
      expect(response.data!.confidence).toBe(0.85);
      expect(response.metadata.tool_name).toBe("think");
      expect(response.metadata.processing_time_ms).toBe(150);
      expect(response.metadata.request_id).toBe("req_123");
      expect(response.error).toBeUndefined();
    });

    it("should properly serialize emotional state", () => {
      const response = ResponseFormatter.formatThinkResponse(
        mockThoughtResult,
        150
      );

      const emotionalContext = response.data!.emotional_context as any;
      expect(emotionalContext.valence).toBe(0.5);
      expect(emotionalContext.arousal).toBe(0.3);
      expect(emotionalContext.dominance).toBe(0.7);
      expect(emotionalContext.specific_emotions).toEqual(
        new Map([
          ["joy", 0.6],
          ["curiosity", 0.8],
        ])
      );
    });

    it("should properly format reasoning steps", () => {
      const response = ResponseFormatter.formatThinkResponse(
        mockThoughtResult,
        150
      );

      const reasoningPath = response.data!.reasoning_path as any[];
      expect(reasoningPath).toHaveLength(1);
      expect(reasoningPath[0].type).toBe(ReasoningType.LOGICAL_INFERENCE);
      expect(reasoningPath[0].content).toBe("Test reasoning step");
      expect(reasoningPath[0].confidence).toBe(0.8);
      expect(reasoningPath[0].alternatives).toHaveLength(1);
      expect(reasoningPath[0].metadata).toEqual({ test: "data" });
    });
  });

  describe("formatRememberResponse", () => {
    it("should format a successful remember response correctly", () => {
      const response = ResponseFormatter.formatRememberResponse(
        mockMemoryResult,
        100,
        "req_456"
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockMemoryResult);
      expect(response.metadata.tool_name).toBe("remember");
      expect(response.metadata.processing_time_ms).toBe(100);
      expect(response.metadata.request_id).toBe("req_456");
      expect(response.error).toBeUndefined();
    });
  });

  describe("formatRecallResponse", () => {
    it("should format a successful recall response correctly", () => {
      const response = ResponseFormatter.formatRecallResponse(
        mockRecallResult,
        "req_789"
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data!.total_found).toBe(1);
      expect(response.metadata.tool_name).toBe("recall");
      expect(response.metadata.processing_time_ms).toBe(50);
      expect(response.metadata.request_id).toBe("req_789");
      expect(response.error).toBeUndefined();
    });

    it("should properly serialize memory chunks", () => {
      const response = ResponseFormatter.formatRecallResponse(mockRecallResult);

      const memories = response.data!.memories as any[];
      expect(memories).toHaveLength(1);
      expect(memories[0].content).toBe("Test memory content");
      expect(memories[0].activation).toBe(0.8);
      expect(memories[0].associations).toEqual(new Set(["test", "memory"]));
      expect(memories[0].emotional_valence).toBe(0.5);
      expect(memories[0].importance).toBe(0.7);
      expect(memories[0].context_tags).toEqual(["test"]);
    });
  });

  describe("formatAnalyzeResponse", () => {
    it("should format a successful analyze response correctly", () => {
      const response = ResponseFormatter.formatAnalyzeResponse(
        mockAnalysisResult,
        200,
        "req_abc"
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockAnalysisResult);
      expect(response.metadata.tool_name).toBe("analyze_reasoning");
      expect(response.metadata.processing_time_ms).toBe(200);
      expect(response.metadata.request_id).toBe("req_abc");
      expect(response.error).toBeUndefined();
    });
  });

  describe("formatErrorResponse", () => {
    it("should format error response with Error object", () => {
      const error = new Error("Test error message");
      const response = ResponseFormatter.formatErrorResponse(
        error,
        "test_tool",
        100,
        "req_error"
      );

      expect(response.success).toBe(false);
      expect(response.data).toBeUndefined();
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe("UNKNOWN_ERROR");
      expect(response.error!.message).toBe("Test error message");
      expect(response.error!.suggestions).toBeDefined();
      expect(response.metadata.tool_name).toBe("test_tool");
      expect(response.metadata.processing_time_ms).toBe(100);
      expect(response.metadata.request_id).toBe("req_error");
    });

    it("should format error response with string message", () => {
      const response = ResponseFormatter.formatErrorResponse(
        "String error message",
        "test_tool",
        50
      );

      expect(response.success).toBe(false);
      expect(response.error!.message).toBe("String error message");
      expect(response.metadata.processing_time_ms).toBe(50);
    });

    it("should categorize validation errors correctly", () => {
      const response = ResponseFormatter.formatErrorResponse(
        "Invalid parameter requires validation",
        "test_tool"
      );

      expect(response.error!.code).toBe("VALIDATION_ERROR");
      expect(response.error!.suggestions).toContain(
        "💡 Double-check your parameters - something's not quite right"
      );
    });

    it("should categorize timeout errors correctly", () => {
      const response = ResponseFormatter.formatErrorResponse(
        "Operation timed out after 30000ms",
        "test_tool"
      );

      expect(response.error!.code).toBe("TIMEOUT_ERROR");
      expect(response.error!.suggestions).toContain(
        "⏱️ Your request took too long - let's try a simpler approach"
      );
    });

    it("should categorize memory errors correctly", () => {
      const response = ResponseFormatter.formatErrorResponse(
        "Memory capacity exceeded",
        "test_tool"
      );

      expect(response.error!.code).toBe("MEMORY_ERROR");
      expect(response.error!.suggestions).toContain(
        "🧠 Memory system is getting full - time for some cleanup"
      );
    });

    it("should include additional details when provided", () => {
      const additionalDetails = { user_id: "123", operation: "test" };
      const response = ResponseFormatter.formatErrorResponse(
        "Test error",
        "test_tool",
        0,
        undefined,
        additionalDetails
      );

      expect(response.error!.details).toEqual(additionalDetails);
    });
  });

  describe("formatDegradedResponse", () => {
    it("should format degraded response correctly", () => {
      const partialResult = { content: "Partial result" };
      const failedComponents = ["EmotionalProcessor", "MetacognitionModule"];

      const response = ResponseFormatter.formatDegradedResponse(
        partialResult,
        failedComponents,
        "think",
        300,
        "req_degraded"
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(partialResult);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe("PARTIAL_FAILURE");
      expect(response.error!.details!.failed_components).toEqual(
        failedComponents
      );
      expect(response.error!.details!.degraded_functionality).toBe(true);
      expect(response.error!.suggestions).toContain(
        "Results may be incomplete due to component failures"
      );
      expect(response.metadata.tool_name).toBe("think");
      expect(response.metadata.processing_time_ms).toBe(300);
      expect(response.metadata.request_id).toBe("req_degraded");
    });
  });

  describe("validateResponse", () => {
    it("should validate correct success response", () => {
      const response = ResponseFormatter.formatThinkResponse(
        mockThoughtResult,
        150
      );

      expect(ResponseFormatter.validateResponse(response)).toBe(true);
    });

    it("should validate correct error response", () => {
      const response = ResponseFormatter.formatErrorResponse(
        "Test error",
        "test_tool"
      );

      expect(ResponseFormatter.validateResponse(response)).toBe(true);
    });

    it("should reject response without success field", () => {
      const invalidResponse = {
        data: {},
        metadata: {
          timestamp: Date.now(),
          processing_time_ms: 100,
          tool_name: "test",
          version: getVersion(),
        },
      } as any;

      expect(ResponseFormatter.validateResponse(invalidResponse)).toBe(false);
    });

    it("should reject response without metadata", () => {
      const invalidResponse = {
        success: true,
        data: {},
      } as any;

      expect(ResponseFormatter.validateResponse(invalidResponse)).toBe(false);
    });

    it("should reject success response without data", () => {
      const invalidResponse = {
        success: true,
        metadata: {
          timestamp: Date.now(),
          processing_time_ms: 100,
          tool_name: "test",
          version: getVersion(),
        },
      } as any;

      expect(ResponseFormatter.validateResponse(invalidResponse)).toBe(false);
    });

    it("should reject error response without error field", () => {
      const invalidResponse = {
        success: false,
        metadata: {
          timestamp: Date.now(),
          processing_time_ms: 100,
          tool_name: "test",
          version: getVersion(),
        },
      } as any;

      expect(ResponseFormatter.validateResponse(invalidResponse)).toBe(false);
    });
  });

  describe("createFallbackResponse", () => {
    it("should create fallback response with Error object", () => {
      const error = new Error("Original error");
      const response = ResponseFormatter.createFallbackResponse(
        "test_tool",
        error,
        "req_fallback"
      );

      expect(response.success).toBe(false);
      expect(response.error!.code).toBe("FORMATTING_ERROR");
      expect(response.error!.message).toBe(
        "Failed to format response properly"
      );
      expect(response.error!.details!.original_error).toBe("Original error");
      expect(response.metadata.tool_name).toBe("test_tool");
      expect(response.metadata.request_id).toBe("req_fallback");
    });

    it("should create fallback response with string error", () => {
      const response = ResponseFormatter.createFallbackResponse(
        "test_tool",
        "String error"
      );

      expect(response.error!.details!.original_error).toBe("String error");
    });
  });

  describe("Response structure consistency", () => {
    it("should have consistent metadata structure across all response types", () => {
      const thinkResponse = ResponseFormatter.formatThinkResponse(
        mockThoughtResult,
        100
      );
      const rememberResponse = ResponseFormatter.formatRememberResponse(
        mockMemoryResult,
        100
      );
      const recallResponse =
        ResponseFormatter.formatRecallResponse(mockRecallResult);
      const analyzeResponse = ResponseFormatter.formatAnalyzeResponse(
        mockAnalysisResult,
        100
      );
      const errorResponse = ResponseFormatter.formatErrorResponse(
        "Error",
        "test"
      );

      const responses = [
        thinkResponse,
        rememberResponse,
        recallResponse,
        analyzeResponse,
        errorResponse,
      ];

      responses.forEach((response) => {
        expect(response.metadata).toBeDefined();
        expect(typeof response.metadata.timestamp).toBe("number");
        expect(typeof response.metadata.processing_time_ms).toBe("number");
        expect(typeof response.metadata.tool_name).toBe("string");
        expect(typeof response.metadata.version).toBe("string");
        expect(typeof response.success).toBe("boolean");
      });
    });

    it("should have proper JSON serialization", () => {
      const response = ResponseFormatter.formatThinkResponse(
        mockThoughtResult,
        100
      );

      expect(() => JSON.stringify(response)).not.toThrow();

      const serialized = JSON.stringify(response);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.success).toBe(true);
      expect(deserialized.data.content).toBe("Test thought content");
      expect(deserialized.metadata.tool_name).toBe("think");
    });
  });
});
