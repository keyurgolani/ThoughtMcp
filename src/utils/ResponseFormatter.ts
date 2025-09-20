/**
 * Response formatting utilities for MCP tool outputs
 * Provides consistent, structured responses with proper error handling
 */

import { ReasoningStep, ThoughtResult } from "../types/core.js";
import { AnalysisResult, MemoryResult, RecallResult } from "../types/mcp.js";

export interface FormattedResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorDetails;
  metadata: ResponseMetadata;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  suggestions?: string[];
}

export interface ResponseMetadata {
  timestamp: number;
  processing_time_ms: number;
  tool_name: string;
  version: string;
  request_id?: string;
}

import { getVersion } from "./version.js";

export class ResponseFormatter {
  private static readonly VERSION = getVersion();

  /**
   * Format a successful ThoughtResult response
   */
  static formatThinkResponse(
    result: ThoughtResult,
    processingTimeMs: number,
    requestId?: string
  ): FormattedResponse<ThoughtResult> {
    return {
      success: true,
      data: {
        ...result,
        // Ensure emotional_context is properly serialized
        emotional_context: {
          valence: result.emotional_context.valence,
          arousal: result.emotional_context.arousal,
          dominance: result.emotional_context.dominance,
          specific_emotions: result.emotional_context.specific_emotions,
        },
        // Ensure reasoning_path is properly formatted
        reasoning_path: result.reasoning_path.map((step) =>
          this.formatReasoningStep(step)
        ),
      },
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: processingTimeMs,
        tool_name: "think",
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Format a successful MemoryResult response
   */
  static formatRememberResponse(
    result: MemoryResult,
    processingTimeMs: number,
    requestId?: string
  ): FormattedResponse<MemoryResult> {
    return {
      success: true,
      data: result,
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: processingTimeMs,
        tool_name: "remember",
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Format a successful RecallResult response
   */
  static formatRecallResponse(
    result: RecallResult,
    requestId?: string
  ): FormattedResponse<RecallResult> {
    return {
      success: true,
      data: {
        ...result,
        // Memories are already properly typed, no need to serialize and cast
        memories: result.memories,
      },
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: result.search_time_ms,
        tool_name: "recall",
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Format a successful AnalysisResult response
   */
  static formatAnalyzeResponse(
    result: AnalysisResult,
    processingTimeMs: number,
    requestId?: string
  ): FormattedResponse<AnalysisResult> {
    return {
      success: true,
      data: result,
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: processingTimeMs,
        tool_name: "analyze_reasoning",
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Format an error response with appropriate error details
   */
  static formatErrorResponse(
    error: Error | string,
    toolName: string,
    processingTimeMs: number = 0,
    requestId?: string,
    additionalDetails?: Record<string, unknown>
  ): FormattedResponse<never> {
    const errorMessage = typeof error === "string" ? error : error.message;
    const errorCode = this.categorizeError(errorMessage);

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: additionalDetails || {},
        suggestions: this.generateErrorSuggestions(errorCode, errorMessage),
      },
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: processingTimeMs,
        tool_name: toolName,
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Format a graceful degradation response when components fail
   */
  static formatDegradedResponse<T>(
    partialResult: Partial<T>,
    failedComponents: string[],
    toolName: string,
    processingTimeMs: number,
    requestId?: string
  ): FormattedResponse<Partial<T>> {
    return {
      success: true,
      data: partialResult,
      error: {
        code: "PARTIAL_FAILURE",
        message: `Some components failed but partial results are available`,
        details: {
          failed_components: failedComponents,
          degraded_functionality: true,
        },
        suggestions: [
          "Results may be incomplete due to component failures",
          "Consider retrying the request",
          "Check system logs for detailed error information",
        ],
      },
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: processingTimeMs,
        tool_name: toolName,
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Format ReasoningStep for consistent output
   */
  private static formatReasoningStep(step: ReasoningStep): ReasoningStep {
    return {
      type: step.type,
      content: step.content,
      confidence: step.confidence,
      alternatives: step.alternatives,
      metadata: step.metadata || {},
    };
  }

  /**
   * Categorize errors for appropriate error codes
   */
  private static categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();

    if (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("requires")
    ) {
      return "VALIDATION_ERROR";
    }
    if (message.includes("timeout") || message.includes("time")) {
      return "TIMEOUT_ERROR";
    }
    if (message.includes("memory") || message.includes("capacity")) {
      return "MEMORY_ERROR";
    }
    if (message.includes("processing") || message.includes("cognitive")) {
      return "PROCESSING_ERROR";
    }
    if (message.includes("network") || message.includes("connection")) {
      return "NETWORK_ERROR";
    }
    if (message.includes("configuration") || message.includes("config")) {
      return "CONFIGURATION_ERROR";
    }

    return "UNKNOWN_ERROR";
  }

  /**
   * Generate helpful suggestions based on error type
   */
  private static generateErrorSuggestions(
    errorCode: string,
    _errorMessage: string
  ): string[] {
    const suggestions: string[] = [];

    switch (errorCode) {
      case "VALIDATION_ERROR":
        suggestions.push("Check that all required parameters are provided");
        suggestions.push("Verify parameter types and value ranges");
        suggestions.push(
          "Refer to the tool schema for valid parameter formats"
        );
        break;

      case "TIMEOUT_ERROR":
        suggestions.push("Try reducing the complexity of the request");
        suggestions.push("Consider breaking the task into smaller parts");
        suggestions.push("Check if the system is under heavy load");
        break;

      case "MEMORY_ERROR":
        suggestions.push("Try reducing the amount of data being processed");
        suggestions.push("Clear old memories if the system is at capacity");
        suggestions.push("Consider adjusting memory configuration parameters");
        break;

      case "PROCESSING_ERROR":
        suggestions.push(
          "Verify that the cognitive components are properly initialized"
        );
        suggestions.push("Try using a simpler processing mode");
        suggestions.push("Check system logs for detailed error information");
        break;

      case "CONFIGURATION_ERROR":
        suggestions.push("Verify configuration file syntax and values");
        suggestions.push(
          "Check that all required configuration parameters are set"
        );
        suggestions.push("Ensure configuration values are within valid ranges");
        break;

      default:
        suggestions.push(
          "Check system logs for more detailed error information"
        );
        suggestions.push("Try the request again after a brief delay");
        suggestions.push("Contact support if the problem persists");
    }

    return suggestions;
  }

  /**
   * Validate response structure before sending
   */
  static validateResponse<T>(response: FormattedResponse<T>): boolean {
    try {
      // Check required fields
      if (typeof response.success !== "boolean") return false;
      if (!response.metadata || typeof response.metadata !== "object")
        return false;
      if (typeof response.metadata.timestamp !== "number") return false;
      if (typeof response.metadata.processing_time_ms !== "number")
        return false;
      if (typeof response.metadata.tool_name !== "string") return false;
      if (typeof response.metadata.version !== "string") return false;

      // Check success response structure
      if (response.success && !response.data) return false;

      // Check error response structure
      if (!response.success) {
        if (!response.error) return false;
        if (typeof response.error.code !== "string") return false;
        if (typeof response.error.message !== "string") return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a minimal fallback response when formatting fails
   */
  static createFallbackResponse(
    toolName: string,
    originalError: Error | string,
    requestId?: string
  ): FormattedResponse<never> {
    return {
      success: false,
      error: {
        code: "FORMATTING_ERROR",
        message: "Failed to format response properly",
        details: {
          original_error:
            typeof originalError === "string"
              ? originalError
              : originalError.message,
        },
        suggestions: [
          "This is a system error - please contact support",
          "Include the request ID in your support request",
        ],
      },
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: 0,
        tool_name: toolName,
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }
}
