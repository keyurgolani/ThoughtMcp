/**
 * Tests for utils module exports
 *
 * Verifies that all error classes, error handler, and utilities
 * are properly exported from the utils module index.
 */

import { describe, expect, it } from "vitest";
import {
  CognitiveError,
  CognitiveErrorHandler,
  DatabaseError,
  EmbeddingError,
  ErrorCodes,
  Logger,
  ReasoningError,
  ValidationError,
  createConnectionError,
  createEmbeddingTimeoutError,
  createFrameworkFailureError,
  createModelUnavailableError,
  createQueryTimeoutError,
  createStreamTimeoutError,
  createTransactionError,
  createValidationError,
} from "../../../utils/index.js";

describe("Utils Module Exports", () => {
  describe("Logger Export", () => {
    it("should export Logger class", () => {
      expect(Logger).toBeDefined();
      expect(typeof Logger.error).toBe("function");
      expect(typeof Logger.info).toBe("function");
      expect(typeof Logger.warn).toBe("function");
    });
  });

  describe("Error Classes Export", () => {
    it("should export CognitiveError class", () => {
      expect(CognitiveError).toBeDefined();
      const error = new CognitiveError("Test error", ErrorCodes.UNKNOWN_ERROR);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CognitiveError);
    });

    it("should export DatabaseError class", () => {
      expect(DatabaseError).toBeDefined();
      const error = new DatabaseError("DB error", ErrorCodes.DB_CONNECTION_FAILED);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CognitiveError);
      expect(error).toBeInstanceOf(DatabaseError);
    });

    it("should export EmbeddingError class", () => {
      expect(EmbeddingError).toBeDefined();
      const error = new EmbeddingError(
        "Embedding error",
        ErrorCodes.EMBEDDING_TIMEOUT,
        "test-model",
        100
      );
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CognitiveError);
      expect(error).toBeInstanceOf(EmbeddingError);
    });

    it("should export ReasoningError class", () => {
      expect(ReasoningError).toBeDefined();
      const error = new ReasoningError("Reasoning error", ErrorCodes.REASONING_FRAMEWORK_FAILED);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CognitiveError);
      expect(error).toBeInstanceOf(ReasoningError);
    });

    it("should export ValidationError class", () => {
      expect(ValidationError).toBeDefined();
      const error = new ValidationError("Validation error", "field", "value", "constraint");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CognitiveError);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe("Error Codes Export", () => {
    it("should export ErrorCodes constants", () => {
      expect(ErrorCodes).toBeDefined();
      expect(ErrorCodes.DB_CONNECTION_FAILED).toBe("DB_CONNECTION_FAILED");
      expect(ErrorCodes.DB_TRANSACTION_FAILED).toBe("DB_TRANSACTION_FAILED");
      expect(ErrorCodes.DB_QUERY_TIMEOUT).toBe("DB_QUERY_TIMEOUT");
      expect(ErrorCodes.EMBEDDING_TIMEOUT).toBe("EMBEDDING_TIMEOUT");
      expect(ErrorCodes.EMBEDDING_MODEL_UNAVAILABLE).toBe("EMBEDDING_MODEL_UNAVAILABLE");
      expect(ErrorCodes.REASONING_FRAMEWORK_FAILED).toBe("REASONING_FRAMEWORK_FAILED");
      expect(ErrorCodes.REASONING_STREAM_TIMEOUT).toBe("REASONING_STREAM_TIMEOUT");
      expect(ErrorCodes.VALIDATION_FAILED).toBe("VALIDATION_FAILED");
    });
  });

  describe("Error Helper Functions Export", () => {
    it("should export createConnectionError", () => {
      expect(createConnectionError).toBeDefined();
      const error = createConnectionError("Connection failed");
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe(ErrorCodes.DB_CONNECTION_FAILED);
    });

    it("should export createTransactionError", () => {
      expect(createTransactionError).toBeDefined();
      const error = createTransactionError("Transaction failed");
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe(ErrorCodes.DB_TRANSACTION_FAILED);
    });

    it("should export createQueryTimeoutError", () => {
      expect(createQueryTimeoutError).toBeDefined();
      const error = createQueryTimeoutError("Query timeout");
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe(ErrorCodes.DB_QUERY_TIMEOUT);
    });

    it("should export createEmbeddingTimeoutError", () => {
      expect(createEmbeddingTimeoutError).toBeDefined();
      const error = createEmbeddingTimeoutError("Embedding timeout", "model", 100);
      expect(error).toBeInstanceOf(EmbeddingError);
      expect(error.code).toBe(ErrorCodes.EMBEDDING_TIMEOUT);
    });

    it("should export createModelUnavailableError", () => {
      expect(createModelUnavailableError).toBeDefined();
      const error = createModelUnavailableError("Model unavailable", "model", 100);
      expect(error).toBeInstanceOf(EmbeddingError);
      expect(error.code).toBe(ErrorCodes.EMBEDDING_MODEL_UNAVAILABLE);
    });

    it("should export createFrameworkFailureError", () => {
      expect(createFrameworkFailureError).toBeDefined();
      const error = createFrameworkFailureError("Framework failed", "test-framework");
      expect(error).toBeInstanceOf(ReasoningError);
      expect(error.code).toBe(ErrorCodes.REASONING_FRAMEWORK_FAILED);
    });

    it("should export createStreamTimeoutError", () => {
      expect(createStreamTimeoutError).toBeDefined();
      const error = createStreamTimeoutError("Stream timeout");
      expect(error).toBeInstanceOf(ReasoningError);
      expect(error.code).toBe(ErrorCodes.REASONING_STREAM_TIMEOUT);
    });

    it("should export createValidationError", () => {
      expect(createValidationError).toBeDefined();
      const error = createValidationError("field", "value", "constraint");
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
    });
  });

  describe("Error Handler Export", () => {
    it("should export CognitiveErrorHandler class", () => {
      expect(CognitiveErrorHandler).toBeDefined();
      const handler = new CognitiveErrorHandler();
      expect(handler).toBeInstanceOf(CognitiveErrorHandler);
      expect(typeof handler.handleError).toBe("function");
    });

    it("should be able to use error handler with exported errors", async () => {
      const handler = new CognitiveErrorHandler();
      const error = createConnectionError("Test connection error");
      const result = await handler.handleError(error);
      expect(result).toBeDefined();
      expect(result.recovered).toBeDefined();
      expect(result.strategy).toBeDefined();
      expect(result.userMessage).toBeDefined();
    });
  });

  describe("Integration Test", () => {
    it("should allow importing and using all exports together", async () => {
      // Create various errors using helper functions
      const dbError = createConnectionError("DB connection failed");
      const embeddingError = createEmbeddingTimeoutError("Embedding timeout", "model", 100);
      const reasoningError = createFrameworkFailureError("Framework failed", "test");
      const validationError = createValidationError("field", "value", "constraint");

      // Handle errors with error handler
      const handler = new CognitiveErrorHandler();
      const dbResult = await handler.handleError(dbError);
      const embeddingResult = await handler.handleError(embeddingError);
      const reasoningResult = await handler.handleError(reasoningError);
      const validationResult = await handler.handleError(validationError);

      // Verify all results
      expect(dbResult.recovered).toBe(true);
      expect(embeddingResult.recovered).toBe(true);
      expect(reasoningResult.recovered).toBe(true);
      expect(validationResult.recovered).toBe(false); // Validation errors are not recoverable

      // Verify error codes
      expect(dbError.code).toBe(ErrorCodes.DB_CONNECTION_FAILED);
      expect(embeddingError.code).toBe(ErrorCodes.EMBEDDING_TIMEOUT);
      expect(reasoningError.code).toBe(ErrorCodes.REASONING_FRAMEWORK_FAILED);
      expect(validationError.code).toBe(ErrorCodes.VALIDATION_FAILED);
    });
  });
});
