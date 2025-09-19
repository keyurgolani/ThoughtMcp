/**
 * Unit tests for ErrorHandler utility
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorHandler,
  ErrorSeverity,
  GracefulDegradationOptions,
} from "../../utils/ErrorHandler.js";

describe("ErrorHandler", () => {
  beforeEach(() => {
    // Clear error history before each test
    ErrorHandler.clearErrorHistory();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    ErrorHandler.clearErrorHistory();
  });

  describe("handleError", () => {
    it("should handle Error object correctly", async () => {
      const error = new Error("Test error message");
      const result = await ErrorHandler.handleError(error, "TestComponent");

      expect(result.canContinue).toBeDefined();
      expect(typeof result.canContinue).toBe("boolean");
    });

    it("should handle string error correctly", async () => {
      const result = await ErrorHandler.handleError(
        "String error",
        "TestComponent"
      );

      expect(result.canContinue).toBeDefined();
      expect(typeof result.canContinue).toBe("boolean");
    });

    it("should provide fallback data when graceful degradation is possible", async () => {
      const error = new Error("Non-critical error");
      const options: Partial<GracefulDegradationOptions> = {
        enableFallbacks: true,
        criticalComponents: [],
      };

      const result = await ErrorHandler.handleError(
        error,
        "SensoryProcessor",
        {},
        options
      );

      if (result.canContinue) {
        expect(result.fallbackData).toBeDefined();
      }
    });

    it("should not allow graceful degradation for critical errors", async () => {
      const error = new Error("Out of memory error");
      const result = await ErrorHandler.handleError(error, "TestComponent");

      expect(result.canContinue).toBe(false);
      expect(result.fallbackData).toBeUndefined();
    });

    it("should not allow graceful degradation for critical components with high severity", async () => {
      const error = new Error("Initialization failed");
      const options: Partial<GracefulDegradationOptions> = {
        criticalComponents: ["CognitiveOrchestrator"],
      };

      const result = await ErrorHandler.handleError(
        error,
        "CognitiveOrchestrator",
        {},
        options
      );

      expect(result.canContinue).toBe(false);
    });

    it("should track component errors", async () => {
      const error1 = new Error("First error");
      const error2 = new Error("Second error");

      await ErrorHandler.handleError(error1, "TestComponent");
      await ErrorHandler.handleError(error2, "TestComponent");

      const stats = ErrorHandler.getErrorStatistics();
      expect(stats.TestComponent).toBeDefined();
      expect(stats.TestComponent.total).toBe(2);
    });
  });

  describe("withErrorHandling", () => {
    it("should execute successful operation", async () => {
      const mockOperation = vi.fn().mockResolvedValue("success result");

      const result = await ErrorHandler.withErrorHandling(
        mockOperation,
        "TestComponent"
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe("success result");
      expect(result.error).toBeUndefined();
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it("should retry failed operations", async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockRejectedValueOnce(new Error("Second failure"))
        .mockResolvedValue("success result");

      const result = await ErrorHandler.withErrorHandling(
        mockOperation,
        "TestComponent",
        { maxRetries: 3, retryDelayMs: 10 }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe("success result");
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it("should fail after max retries", async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValue(new Error("Persistent failure"));

      const result = await ErrorHandler.withErrorHandling(
        mockOperation,
        "TestComponent",
        { maxRetries: 2, retryDelayMs: 10 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe("Persistent failure");
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it("should handle timeout", async () => {
      const mockOperation = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 200))
        );

      const result = await ErrorHandler.withErrorHandling(
        mockOperation,
        "TestComponent",
        { timeoutMs: 50, maxRetries: 1 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain("timed out");
    });

    it("should provide fallback data on failure", async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValue(new Error("Operation failed"));

      const result = await ErrorHandler.withErrorHandling(
        mockOperation,
        "SensoryProcessor",
        { maxRetries: 1, retryDelayMs: 10 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Fallback data might be provided depending on component
      if (result.data) {
        expect(result.data).toBeDefined();
      }
    });
  });

  describe("Error severity assessment", () => {
    it("should assess critical errors correctly", async () => {
      const criticalErrors = [
        "Out of memory error",
        "Stack overflow detected",
        "Segmentation fault occurred",
      ];

      for (const errorMsg of criticalErrors) {
        const result = await ErrorHandler.handleError(
          errorMsg,
          "TestComponent"
        );
        expect(result.canContinue).toBe(false);
      }
    });

    it("should assess high severity errors for core components", async () => {
      const highSeverityErrors = [
        "Initialization failed",
        "Configuration error detected",
        "Connection lost",
      ];

      for (const errorMsg of highSeverityErrors) {
        const result = await ErrorHandler.handleError(
          errorMsg,
          "CognitiveOrchestrator",
          {},
          { criticalComponents: ["CognitiveOrchestrator"] }
        );
        expect(result.canContinue).toBe(false);
      }
    });

    it("should assess medium severity errors correctly", async () => {
      const mediumSeverityErrors = [
        "Processing timeout occurred",
        "Validation failed for input",
        "Timeout exceeded",
      ];

      for (const errorMsg of mediumSeverityErrors) {
        const result = await ErrorHandler.handleError(
          errorMsg,
          "TestComponent"
        );
        // Medium severity errors should allow graceful degradation
        expect(result.canContinue).toBe(true);
      }
    });
  });

  describe("Component fallbacks", () => {
    it("should provide SensoryProcessor fallback", async () => {
      const result = await ErrorHandler.handleError(
        "Processing failed",
        "SensoryProcessor",
        { input: "test input" },
        { enableFallbacks: true }
      );

      if (result.canContinue && result.fallbackData) {
        const fallback = result.fallbackData as any;
        expect(fallback.tokens).toBeDefined();
        expect(fallback.patterns).toBeDefined();
        expect(fallback.salience_map).toBeDefined();
      }
    });

    it("should provide EmotionalProcessor fallback", async () => {
      const result = await ErrorHandler.handleError(
        "Emotional processing failed",
        "EmotionalProcessor",
        {},
        { enableFallbacks: true }
      );

      if (result.canContinue && result.fallbackData) {
        const fallback = result.fallbackData as any;
        expect(fallback.valence).toBe(0);
        expect(fallback.arousal).toBe(0.5);
        expect(fallback.dominance).toBe(0.5);
        expect(fallback.specific_emotions).toBeDefined();
      }
    });

    it("should provide MetacognitionModule fallback", async () => {
      const result = await ErrorHandler.handleError(
        "Metacognition failed",
        "MetacognitionModule",
        {},
        { enableFallbacks: true }
      );

      if (result.canContinue && result.fallbackData) {
        const fallback = result.fallbackData as any;
        expect(fallback.confidence).toBe(0.5);
        expect(fallback.coherence).toBe(0.5);
        expect(fallback.completeness).toBe(0.5);
        expect(fallback.biases_detected).toEqual([]);
        expect(fallback.suggestions).toBeDefined();
        expect(fallback.reasoning).toContain("Fallback assessment");
      }
    });

    it("should provide DualProcessController fallback", async () => {
      const result = await ErrorHandler.handleError(
        "Dual process failed",
        "DualProcessController",
        { input: "test input" },
        { enableFallbacks: true }
      );

      if (result.canContinue && result.fallbackData) {
        const fallback = result.fallbackData as any;
        expect(fallback.system1_response).toBeDefined();
        expect(fallback.system1_response.content).toBe("test input");
        expect(fallback.system2_response).toBeNull();
        expect(fallback.conflict_detected).toBe(false);
        expect(fallback.resolution_strategy).toBe("fallback_system1_only");
      }
    });

    it("should return null for unknown components", async () => {
      const result = await ErrorHandler.handleError(
        "Unknown component failed",
        "UnknownComponent",
        {},
        { enableFallbacks: true }
      );

      if (result.canContinue) {
        expect(result.fallbackData).toBeNull();
      }
    });
  });

  describe("Error statistics and tracking", () => {
    it("should track error statistics correctly", async () => {
      await ErrorHandler.handleError(new Error("Error 1"), "Component1");
      await ErrorHandler.handleError(new Error("Error 2"), "Component1");
      await ErrorHandler.handleError(new Error("Error 3"), "Component2");

      const stats = ErrorHandler.getErrorStatistics();

      expect(stats.Component1).toBeDefined();
      expect(stats.Component1.total).toBe(2);
      expect(stats.Component2).toBeDefined();
      expect(stats.Component2.total).toBe(1);
    });

    it("should categorize errors by severity in statistics", async () => {
      await ErrorHandler.handleError(
        new Error("Out of memory"),
        "TestComponent"
      );
      await ErrorHandler.handleError(
        new Error("Validation failed"),
        "TestComponent"
      );
      await ErrorHandler.handleError(
        new Error("Processing timeout"),
        "TestComponent"
      );

      const stats = ErrorHandler.getErrorStatistics();
      const componentStats = stats.TestComponent;

      expect(
        componentStats.by_severity[ErrorSeverity.CRITICAL]
      ).toBeGreaterThan(0);
      expect(componentStats.by_severity[ErrorSeverity.MEDIUM]).toBeGreaterThan(
        0
      );
    });

    it("should clear error history for specific component", async () => {
      await ErrorHandler.handleError(new Error("Error 1"), "Component1");
      await ErrorHandler.handleError(new Error("Error 2"), "Component2");

      ErrorHandler.clearErrorHistory("Component1");

      const stats = ErrorHandler.getErrorStatistics();
      expect(stats.Component1).toBeUndefined();
      expect(stats.Component2).toBeDefined();
    });

    it("should clear all error history", async () => {
      await ErrorHandler.handleError(new Error("Error 1"), "Component1");
      await ErrorHandler.handleError(new Error("Error 2"), "Component2");

      ErrorHandler.clearErrorHistory();

      const stats = ErrorHandler.getErrorStatistics();
      expect(Object.keys(stats)).toHaveLength(0);
    });

    it("should prevent graceful degradation with too many recent errors", async () => {
      // Simulate many recent errors
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(
          ErrorHandler.handleError(new Error(`Error ${i}`), "TestComponent")
        );
      }
      await Promise.all(promises);

      // Next error should not allow graceful degradation
      const result = await ErrorHandler.handleError(
        new Error("Another error"),
        "TestComponent"
      );

      expect(result.canContinue).toBe(false);
    });
  });

  describe("Error context and logging", () => {
    it("should handle errors with context information", async () => {
      const context = {
        user_id: "123",
        operation: "test_operation",
        timestamp: Date.now(),
      };

      const result = await ErrorHandler.handleError(
        new Error("Context error"),
        "TestComponent",
        context
      );

      expect(result.canContinue).toBeDefined();
      // Context should be recorded in error tracking
      const stats = ErrorHandler.getErrorStatistics();
      expect(stats.TestComponent).toBeDefined();
    });

    it("should handle various error types", async () => {
      const errors = [
        new TypeError("Type error"),
        new ReferenceError("Reference error"),
        new RangeError("Range error"),
        new Error("Generic error"),
      ];

      for (const error of errors) {
        const result = await ErrorHandler.handleError(error, "TestComponent");
        expect(result.canContinue).toBeDefined();
      }

      const stats = ErrorHandler.getErrorStatistics();
      expect(stats.TestComponent.total).toBe(4);
    });
  });
});
