/**
 * Tests for Timeout Utilities
 *
 * Tests the timeout protection functionality for pattern matching
 * and reasoning operations.
 *
 * Requirements: 9.2, 9.4, 9.5, 9.6
 */

import { describe, expect, it, vi } from "vitest";
import {
  executeWithTimeout,
  executeWithTimeoutAndPartialResult,
  FULL_REASONING_TIMEOUT_MS,
  PATTERN_MATCHING_TIMEOUT_MS,
  withAbortSignal,
} from "../../../../reasoning/patterns/timeout-utils.js";

describe("Timeout Utilities", () => {
  describe("Constants", () => {
    it("should have correct timeout values", () => {
      expect(PATTERN_MATCHING_TIMEOUT_MS).toBe(5000); // 5 seconds
      expect(FULL_REASONING_TIMEOUT_MS).toBe(10000); // 10 seconds
    });
  });

  describe("executeWithTimeout", () => {
    it("should return result when operation completes within timeout", async () => {
      const operation = async () => "success";
      const result = await executeWithTimeout(operation, 1000, "fallback", "test-operation");

      expect(result.result).toBe("success");
      expect(result.timedOut).toBe(false);
      expect(result.executionTimeMs).toBeLessThan(1000);
    });

    it("should return fallback value when operation times out", async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return "success";
      };

      const result = await executeWithTimeout(
        operation,
        50, // Very short timeout
        "fallback",
        "test-operation"
      );

      expect(result.result).toBe("fallback");
      expect(result.timedOut).toBe(true);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(50);
    });

    it("should return fallback value when operation throws error", async () => {
      const operation = async () => {
        throw new Error("Operation failed");
      };

      const result = await executeWithTimeout(operation, 1000, "fallback", "test-operation");

      expect(result.result).toBe("fallback");
      expect(result.timedOut).toBe(false);
    });

    it("should track execution time accurately", async () => {
      const delay = 50;
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return "success";
      };

      const result = await executeWithTimeout(operation, 1000, "fallback", "test-operation");

      expect(result.executionTimeMs).toBeGreaterThanOrEqual(delay - 10);
      expect(result.executionTimeMs).toBeLessThan(delay + 100);
    });

    it("should handle complex return types", async () => {
      const complexResult = {
        hypotheses: [{ id: "h1", statement: "test" }],
        recommendations: [{ id: "r1", action: "test" }],
        confidence: 0.8,
      };

      const operation = async () => complexResult;
      const fallback = { hypotheses: [], recommendations: [], confidence: 0 };

      const result = await executeWithTimeout(operation, 1000, fallback, "test-operation");

      expect(result.result).toEqual(complexResult);
      expect(result.timedOut).toBe(false);
    });
  });

  describe("executeWithTimeoutAndPartialResult", () => {
    it("should return result when operation completes within timeout", async () => {
      const operation = async () => "success";
      const getPartialResult = () => "partial";

      const result = await executeWithTimeoutAndPartialResult(
        operation,
        1000,
        getPartialResult,
        "fallback",
        "test-operation"
      );

      expect(result.result).toBe("success");
      expect(result.timedOut).toBe(false);
    });

    it("should return partial result when operation times out and partial is available", async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return "success";
      };
      const getPartialResult = () => "partial";

      const result = await executeWithTimeoutAndPartialResult(
        operation,
        50,
        getPartialResult,
        "fallback",
        "test-operation"
      );

      expect(result.result).toBe("partial");
      expect(result.timedOut).toBe(true);
    });

    it("should return fallback when operation times out and no partial result", async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return "success";
      };
      const getPartialResult = () => null;

      const result = await executeWithTimeoutAndPartialResult(
        operation,
        50,
        getPartialResult,
        "fallback",
        "test-operation"
      );

      expect(result.result).toBe("fallback");
      expect(result.timedOut).toBe(true);
    });

    it("should return partial result on error if available", async () => {
      const operation = async () => {
        throw new Error("Operation failed");
      };
      const getPartialResult = () => "partial";

      const result = await executeWithTimeoutAndPartialResult(
        operation,
        1000,
        getPartialResult,
        "fallback",
        "test-operation"
      );

      expect(result.result).toBe("partial");
      expect(result.timedOut).toBe(false);
    });
  });

  describe("withAbortSignal", () => {
    it("should complete operation when not aborted", async () => {
      const controller = new AbortController();
      const operation = async () => "success";

      const result = await withAbortSignal(operation, controller.signal);

      expect(result).toBe("success");
    });

    it("should reject when signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const operation = async () => "success";

      await expect(withAbortSignal(operation, controller.signal)).rejects.toThrow(
        "Operation aborted"
      );
    });

    it("should reject when signal is aborted during operation", async () => {
      const controller = new AbortController();
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return "success";
      };

      const promise = withAbortSignal(operation, controller.signal);

      // Abort after a short delay
      setTimeout(() => controller.abort(), 20);

      await expect(promise).rejects.toThrow("Operation aborted");
    });

    it("should clean up abort listener on success", async () => {
      const controller = new AbortController();
      const removeEventListenerSpy = vi.spyOn(controller.signal, "removeEventListener");
      const operation = async () => "success";

      await withAbortSignal(operation, controller.signal);

      expect(removeEventListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function));
    });

    it("should clean up abort listener on error", async () => {
      const controller = new AbortController();
      const removeEventListenerSpy = vi.spyOn(controller.signal, "removeEventListener");
      const operation = async () => {
        throw new Error("Operation failed");
      };

      await expect(withAbortSignal(operation, controller.signal)).rejects.toThrow(
        "Operation failed"
      );

      expect(removeEventListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function));
    });
  });
});
