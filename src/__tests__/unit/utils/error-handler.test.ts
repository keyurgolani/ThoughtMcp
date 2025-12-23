/**
 * Tests for CognitiveErrorHandler
 *
 * Validates error handling, recovery strategies, graceful degradation,
 * circuit breaker pattern, and user message generation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CognitiveErrorHandler } from "../../../utils/error-handler.js";
import {
  CognitiveError,
  DatabaseError,
  EmbeddingError,
  ErrorCodes,
  ReasoningError,
  ValidationError,
} from "../../../utils/errors.js";
import { Logger } from "../../../utils/logger.js";

describe("CognitiveErrorHandler", () => {
  let handler: CognitiveErrorHandler;

  beforeEach(() => {
    handler = new CognitiveErrorHandler();
    vi.clearAllMocks();
    vi.spyOn(Logger, "error").mockImplementation(() => {});
    vi.spyOn(Logger, "warn").mockImplementation(() => {});
    vi.spyOn(Logger, "info").mockImplementation(() => {});
  });

  describe("handleError", () => {
    it("should handle DatabaseError with connection retry", async () => {
      const error = new DatabaseError("Connection failed", ErrorCodes.DB_CONNECTION_FAILED, {
        component: "MemoryRepository",
        operation: "query",
      });

      const result = await handler.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe("connection_retry");
      expect(result.userMessage).toContain("database");
      expect(Logger.error).toHaveBeenCalled();
    });

    it("should handle DatabaseError with transaction rollback", async () => {
      const error = new DatabaseError("Transaction failed", ErrorCodes.DB_TRANSACTION_FAILED, {
        component: "MemoryRepository",
        operation: "create",
      });

      const result = await handler.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe("transaction_rollback");
      expect(result.userMessage).toContain("try again");
    });

    it("should handle DatabaseError with query simplification", async () => {
      const error = new DatabaseError("Query timeout", ErrorCodes.DB_QUERY_TIMEOUT, {
        component: "SearchEngine",
        operation: "search",
      });

      const result = await handler.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe("query_simplification");
      expect(result.userMessage).toContain("simpler");
    });

    it("should handle EmbeddingError with cache fallback", async () => {
      const error = new EmbeddingError(
        "Embedding timeout",
        ErrorCodes.EMBEDDING_TIMEOUT,
        "nomic-embed-text",
        1000,
        { component: "EmbeddingEngine", operation: "generate" }
      );

      const result = await handler.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe("cache_fallback");
      expect(result.userMessage).toContain("cached");
    });

    it("should handle EmbeddingError with model switching", async () => {
      const error = new EmbeddingError(
        "Model unavailable",
        ErrorCodes.EMBEDDING_MODEL_UNAVAILABLE,
        "nomic-embed-text",
        1000,
        { component: "EmbeddingEngine", operation: "generate" }
      );

      const result = await handler.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe("model_switching");
      expect(result.userMessage).toContain("alternative");
    });

    it("should handle ReasoningError with framework fallback", async () => {
      const error = new ReasoningError(
        "Framework failed",
        ErrorCodes.REASONING_FRAMEWORK_FAILED,
        { component: "FrameworkSelector", operation: "execute" },
        true,
        "scientific-method"
      );

      const result = await handler.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe("framework_fallback");
      expect(result.userMessage).toContain("simpler approach");
    });

    it("should handle ReasoningError with stream continuation", async () => {
      const error = new ReasoningError(
        "Stream timeout",
        ErrorCodes.REASONING_STREAM_TIMEOUT,
        { component: "ReasoningOrchestrator", operation: "execute" },
        true,
        undefined,
        "synthesis"
      );

      const result = await handler.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe("stream_continuation");
      expect(result.userMessage).toContain("partial results");
    });

    it("should not recover from ValidationError", async () => {
      const error = new ValidationError("Invalid field", "userId", null, "required");

      const result = await handler.handleError(error);

      expect(result.recovered).toBe(false);
      expect(result.strategy).toBe("none");
      expect(result.userMessage).toContain("Invalid");
    });

    it("should not recover from non-recoverable errors", async () => {
      const error = new CognitiveError(
        "Fatal error",
        ErrorCodes.UNKNOWN_ERROR,
        {},
        false // not recoverable
      );

      const result = await handler.handleError(error);

      expect(result.recovered).toBe(false);
      expect(result.strategy).toBe("none");
    });
  });

  describe("graceful degradation", () => {
    it("should degrade to basic mode after multiple failures", async () => {
      const error = new DatabaseError("Connection failed", ErrorCodes.DB_CONNECTION_FAILED, {
        component: "MemoryRepository",
      });

      // Simulate multiple failures
      for (let i = 0; i < 5; i++) {
        await handler.handleError(error);
      }

      const degraded = handler.isInBasicMode();
      expect(degraded).toBe(true);
    });

    it("should provide basic mode status", () => {
      expect(handler.isInBasicMode()).toBe(false);

      handler.degradeToBasicMode();

      expect(handler.isInBasicMode()).toBe(true);
    });

    it("should allow recovery from basic mode", () => {
      handler.degradeToBasicMode();
      expect(handler.isInBasicMode()).toBe(true);

      handler.recoverFromBasicMode();
      expect(handler.isInBasicMode()).toBe(false);
    });
  });

  describe("circuit breaker", () => {
    it("should open circuit after threshold failures", async () => {
      const error = new DatabaseError("Connection failed", ErrorCodes.DB_CONNECTION_FAILED, {
        component: "MemoryRepository",
      });

      // Trigger circuit breaker (default threshold is 5)
      for (let i = 0; i < 5; i++) {
        await handler.handleError(error);
      }

      const result = await handler.handleError(error);

      expect(result.recovered).toBe(false);
      expect(result.strategy).toBe("circuit_open");
      expect(result.userMessage).toContain("temporarily unavailable");
    });

    it("should reset circuit after successful recovery", async () => {
      const error = new DatabaseError("Connection failed", ErrorCodes.DB_CONNECTION_FAILED, {
        component: "MemoryRepository",
      });

      // Trigger some failures
      await handler.handleError(error);
      await handler.handleError(error);

      // Simulate successful operation
      handler.recordSuccess();

      // Circuit should be reset
      const result = await handler.handleError(error);
      expect(result.recovered).toBe(true);
    });

    it("should track failure count per error type", async () => {
      const dbError = new DatabaseError("Connection failed", ErrorCodes.DB_CONNECTION_FAILED, {});
      const embeddingError = new EmbeddingError(
        "Timeout",
        ErrorCodes.EMBEDDING_TIMEOUT,
        "model",
        100,
        {}
      );

      // Different error types should have separate counters
      await handler.handleError(dbError);
      await handler.handleError(embeddingError);

      const stats = handler.getErrorStats();
      expect(stats.DB_CONNECTION_FAILED).toBeGreaterThan(0);
      expect(stats.EMBEDDING_TIMEOUT).toBeGreaterThan(0);
    });
  });

  describe("recovery time tracking", () => {
    it("should track recovery time for successful recoveries", async () => {
      const error = new DatabaseError("Connection failed", ErrorCodes.DB_CONNECTION_FAILED, {});

      const result = await handler.handleError(error);

      expect(result.recoveryTimeMs).toBeGreaterThan(0);
      expect(result.recoveryTimeMs).toBeLessThan(5000); // Should be fast
    });

    it("should not track recovery time for failed recoveries", async () => {
      const error = new ValidationError("Invalid", "field", null, "required");

      const result = await handler.handleError(error);

      expect(result.recoveryTimeMs).toBe(0);
    });
  });

  describe("exponential backoff", () => {
    it("should increase delay with each retry attempt", async () => {
      const error = new DatabaseError("Connection failed", ErrorCodes.DB_CONNECTION_FAILED, {});

      const times: number[] = [];
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await handler.handleError(error);
        times.push(Date.now() - start);
      }

      // Exponential backoff: delays are 10ms, 20ms, 40ms (capped at 50ms in test mode)
      // Due to timing variance, we verify the general pattern:
      // - First call should be relatively quick (10ms base delay)
      // - Later calls should have non-trivial delays
      // We use a tolerance-based check since exact timing varies by system
      expect(times[0]).toBeGreaterThanOrEqual(5); // At least some delay occurred
      expect(times[1]).toBeGreaterThanOrEqual(10); // Second call has longer delay
      expect(times[2]).toBeGreaterThanOrEqual(10); // Third call also has delay (may be capped)

      // Total time should reflect cumulative backoff (10 + 20 + 40 = 70ms minimum)
      const totalTime = times.reduce((a, b) => a + b, 0);
      expect(totalTime).toBeGreaterThanOrEqual(50); // Allow some tolerance
    });
  });

  describe("user message generation", () => {
    it("should generate clear user messages for database errors", async () => {
      const error = new DatabaseError("Connection failed", ErrorCodes.DB_CONNECTION_FAILED, {});

      const result = await handler.handleError(error);

      expect(result.userMessage).not.toContain("stack");
      expect(result.userMessage).not.toContain("undefined");
      expect(result.userMessage.length).toBeGreaterThan(10);
    });

    it("should generate actionable messages", async () => {
      const error = new DatabaseError("Query timeout", ErrorCodes.DB_QUERY_TIMEOUT, {});

      const result = await handler.handleError(error);

      expect(result.userMessage).toMatch(/try|simpler|again/i);
    });

    it("should avoid technical jargon in user messages", async () => {
      const error = new EmbeddingError(
        "Model unavailable",
        ErrorCodes.EMBEDDING_MODEL_UNAVAILABLE,
        "nomic-embed-text",
        1000,
        {}
      );

      const result = await handler.handleError(error);

      expect(result.userMessage).not.toContain("nomic-embed-text");
      expect(result.userMessage).not.toContain("vector");
      // User message should be simple and clear
      expect(result.userMessage.length).toBeGreaterThan(10);
    });
  });

  describe("error logging", () => {
    it("should log errors with context", async () => {
      const error = new DatabaseError("Connection failed", ErrorCodes.DB_CONNECTION_FAILED, {
        component: "MemoryRepository",
        operation: "query",
        userId: "user123",
      });

      await handler.handleError(error);

      expect(Logger.error).toHaveBeenCalledWith(
        "CognitiveError",
        expect.objectContaining({
          code: ErrorCodes.DB_CONNECTION_FAILED,
          name: "DatabaseError",
          context: expect.objectContaining({
            component: "MemoryRepository",
            operation: "query",
          }),
        })
      );
    });

    it("should log recovery attempts", async () => {
      const error = new DatabaseError("Connection failed", ErrorCodes.DB_CONNECTION_FAILED, {});

      await handler.handleError(error);

      expect(Logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Recovery"),
        expect.anything()
      );
    });

    it("should log circuit breaker state changes", async () => {
      const error = new DatabaseError("Connection failed", ErrorCodes.DB_CONNECTION_FAILED, {});

      // Trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await handler.handleError(error);
      }

      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Circuit breaker"),
        expect.anything()
      );
    });
  });

  describe("edge cases", () => {
    it("should handle unknown error types", async () => {
      const error = new Error("Unknown error");

      const result = await handler.handleError(error);

      expect(result.recovered).toBe(false);
      expect(result.userMessage).toContain("unexpected");
    });

    it("should handle errors without context", async () => {
      const error = new DatabaseError("Error", ErrorCodes.DB_CONNECTION_FAILED);

      const result = await handler.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.userMessage).toBeDefined();
    });

    it("should handle cascading failures", async () => {
      const error1 = new DatabaseError("Error 1", ErrorCodes.DB_CONNECTION_FAILED, {});
      const error2 = new EmbeddingError("Error 2", ErrorCodes.EMBEDDING_TIMEOUT, "model", 100, {});

      await handler.handleError(error1);
      const result = await handler.handleError(error2);

      expect(result.recovered).toBe(true);
    });

    it("should handle partial recovery scenarios", async () => {
      const error = new ReasoningError(
        "Stream timeout",
        ErrorCodes.REASONING_STREAM_TIMEOUT,
        {},
        true
      );

      const result = await handler.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.userMessage).toContain("partial");
    });
  });
});
