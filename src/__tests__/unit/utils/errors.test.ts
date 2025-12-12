/**
 * Tests for Error Handling Module
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  CognitiveError,
  DatabaseError,
  EmbeddingError,
  ErrorCodes,
  ErrorContext,
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
} from "../../../utils/errors.js";

describe("Error Hierarchy", () => {
  let testContext: ErrorContext;

  beforeEach(() => {
    testContext = {
      component: "TestComponent",
      operation: "testOperation",
      metadata: { key: "value" },
      userId: "user123",
      sessionId: "session456",
    };
  });

  describe("CognitiveError", () => {
    it("should create error with all fields", () => {
      const error = new CognitiveError("Test error", ErrorCodes.UNKNOWN_ERROR, testContext, true);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CognitiveError);
      expect(error.message).toBe("Test error");
      expect(error.code).toBe(ErrorCodes.UNKNOWN_ERROR);
      expect(error.context).toEqual(testContext);
      expect(error.recoverable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe("CognitiveError");
    });

    it("should create error with minimal fields", () => {
      const error = new CognitiveError("Test error", ErrorCodes.UNKNOWN_ERROR);

      expect(error.message).toBe("Test error");
      expect(error.code).toBe(ErrorCodes.UNKNOWN_ERROR);
      expect(error.context).toEqual({});
      expect(error.recoverable).toBe(false);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it("should preserve stack trace", () => {
      const error = new CognitiveError("Test error", ErrorCodes.UNKNOWN_ERROR);
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("CognitiveError");
    });

    it("should serialize to JSON correctly", () => {
      const error = new CognitiveError("Test error", ErrorCodes.UNKNOWN_ERROR, testContext, true);
      const json = error.toJSON();

      expect(json.name).toBe("CognitiveError");
      expect(json.message).toBe("Test error");
      expect(json.code).toBe(ErrorCodes.UNKNOWN_ERROR);
      expect(json.context).toEqual(testContext);
      expect(json.recoverable).toBe(true);
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });

    it("should generate user message", () => {
      const error = new CognitiveError("Test error", ErrorCodes.UNKNOWN_ERROR);
      expect(error.getUserMessage()).toBe("Test error");
    });

    it("should handle empty context", () => {
      const error = new CognitiveError("Test error", ErrorCodes.UNKNOWN_ERROR, {});
      expect(error.context).toEqual({});
    });

    it("should be instanceof Error", () => {
      const error = new CognitiveError("Test error", ErrorCodes.UNKNOWN_ERROR);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("DatabaseError", () => {
    it("should create database error with query and params", () => {
      const query = "SELECT * FROM memories WHERE id = $1";
      const params = ["mem123"];
      const error = new DatabaseError(
        "Query failed",
        ErrorCodes.DB_QUERY_FAILED,
        testContext,
        true,
        query,
        params
      );

      expect(error).toBeInstanceOf(CognitiveError);
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.message).toBe("Query failed");
      expect(error.code).toBe(ErrorCodes.DB_QUERY_FAILED);
      expect(error.query).toBe(query);
      expect(error.params).toEqual(params);
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe("DatabaseError");
    });

    it("should create database error without query", () => {
      const error = new DatabaseError(
        "Connection failed",
        ErrorCodes.DB_CONNECTION_FAILED,
        testContext
      );

      expect(error.query).toBeUndefined();
      expect(error.params).toBeUndefined();
    });

    it("should serialize with query and params", () => {
      const query = "SELECT * FROM memories";
      const params = ["value"];
      const error = new DatabaseError(
        "Query failed",
        ErrorCodes.DB_QUERY_FAILED,
        testContext,
        true,
        query,
        params
      );
      const json = error.toJSON();

      expect(json.query).toBe(query);
      expect(json.params).toEqual(params);
    });

    it("should generate user-friendly message for connection failure", () => {
      const error = new DatabaseError("Connection failed", ErrorCodes.DB_CONNECTION_FAILED);
      expect(error.getUserMessage()).toBe(
        "Unable to connect to the database. Please try again in a moment."
      );
    });

    it("should generate user-friendly message for query timeout", () => {
      const error = new DatabaseError("Timeout", ErrorCodes.DB_QUERY_TIMEOUT);
      expect(error.getUserMessage()).toBe(
        "The operation took too long. Please try again with a simpler query."
      );
    });

    it("should generate user-friendly message for transaction failure", () => {
      const error = new DatabaseError("Transaction failed", ErrorCodes.DB_TRANSACTION_FAILED);
      expect(error.getUserMessage()).toBe(
        "The operation could not be completed. Please try again."
      );
    });

    it("should generate generic message for other errors", () => {
      const error = new DatabaseError("Generic error", ErrorCodes.DB_QUERY_FAILED);
      expect(error.getUserMessage()).toBe("A database error occurred. Please try again.");
    });
  });

  describe("EmbeddingError", () => {
    it("should create embedding error with model and input length", () => {
      const error = new EmbeddingError(
        "Embedding failed",
        ErrorCodes.EMBEDDING_GENERATION_FAILED,
        "nomic-embed-text",
        1024,
        testContext,
        true
      );

      expect(error).toBeInstanceOf(CognitiveError);
      expect(error).toBeInstanceOf(EmbeddingError);
      expect(error.message).toBe("Embedding failed");
      expect(error.code).toBe(ErrorCodes.EMBEDDING_GENERATION_FAILED);
      expect(error.model).toBe("nomic-embed-text");
      expect(error.inputLength).toBe(1024);
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe("EmbeddingError");
    });

    it("should serialize with model and input length", () => {
      const error = new EmbeddingError(
        "Embedding failed",
        ErrorCodes.EMBEDDING_TIMEOUT,
        "nomic-embed-text",
        1024
      );
      const json = error.toJSON();

      expect(json.model).toBe("nomic-embed-text");
      expect(json.inputLength).toBe(1024);
    });

    it("should generate user-friendly message for timeout", () => {
      const error = new EmbeddingError(
        "Timeout",
        ErrorCodes.EMBEDDING_TIMEOUT,
        "nomic-embed-text",
        1024
      );
      expect(error.getUserMessage()).toBe(
        "Embedding generation took too long. Using cached results."
      );
    });

    it("should generate user-friendly message for model unavailable", () => {
      const error = new EmbeddingError(
        "Model unavailable",
        ErrorCodes.EMBEDDING_MODEL_UNAVAILABLE,
        "nomic-embed-text",
        1024
      );
      expect(error.getUserMessage()).toBe(
        "The embedding model is temporarily unavailable. Trying an alternative."
      );
    });

    it("should generate generic message for other errors", () => {
      const error = new EmbeddingError(
        "Generic error",
        ErrorCodes.EMBEDDING_GENERATION_FAILED,
        "nomic-embed-text",
        1024
      );
      expect(error.getUserMessage()).toBe(
        "An error occurred while generating embeddings. Please try again."
      );
    });
  });

  describe("ReasoningError", () => {
    it("should create reasoning error with framework and step", () => {
      const error = new ReasoningError(
        "Framework failed",
        ErrorCodes.REASONING_FRAMEWORK_FAILED,
        testContext,
        true,
        "Scientific Method",
        "hypothesis"
      );

      expect(error).toBeInstanceOf(CognitiveError);
      expect(error).toBeInstanceOf(ReasoningError);
      expect(error.message).toBe("Framework failed");
      expect(error.code).toBe(ErrorCodes.REASONING_FRAMEWORK_FAILED);
      expect(error.framework).toBe("Scientific Method");
      expect(error.step).toBe("hypothesis");
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe("ReasoningError");
    });

    it("should create reasoning error without framework and step", () => {
      const error = new ReasoningError("Reasoning failed", ErrorCodes.REASONING_SYNTHESIS_FAILED);

      expect(error.framework).toBeUndefined();
      expect(error.step).toBeUndefined();
    });

    it("should serialize with framework and step", () => {
      const error = new ReasoningError(
        "Framework failed",
        ErrorCodes.REASONING_FRAMEWORK_FAILED,
        testContext,
        true,
        "Design Thinking",
        "ideation"
      );
      const json = error.toJSON();

      expect(json.framework).toBe("Design Thinking");
      expect(json.step).toBe("ideation");
    });

    it("should generate user-friendly message for framework failure", () => {
      const error = new ReasoningError(
        "Framework failed",
        ErrorCodes.REASONING_FRAMEWORK_FAILED,
        {},
        true,
        "Scientific Method"
      );
      expect(error.getUserMessage()).toBe(
        "The Scientific Method framework encountered an issue. Trying a simpler approach."
      );
    });

    it("should generate user-friendly message for framework failure without name", () => {
      const error = new ReasoningError("Framework failed", ErrorCodes.REASONING_FRAMEWORK_FAILED);
      expect(error.getUserMessage()).toBe(
        "The reasoning framework encountered an issue. Trying a simpler approach."
      );
    });

    it("should generate user-friendly message for stream timeout", () => {
      const error = new ReasoningError("Timeout", ErrorCodes.REASONING_STREAM_TIMEOUT);
      expect(error.getUserMessage()).toBe(
        "Reasoning took longer than expected. Continuing with partial results."
      );
    });

    it("should generate generic message for other errors", () => {
      const error = new ReasoningError("Generic error", ErrorCodes.REASONING_SYNTHESIS_FAILED);
      expect(error.getUserMessage()).toBe("An error occurred during reasoning. Please try again.");
    });
  });

  describe("ValidationError", () => {
    it("should create validation error with field, value, and constraint", () => {
      const error = new ValidationError(
        "Validation failed for email: must be valid email",
        "email",
        "invalid-email",
        "must be valid email",
        testContext
      );

      expect(error).toBeInstanceOf(CognitiveError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe("Validation failed for email: must be valid email");
      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(error.field).toBe("email");
      expect(error.value).toBe("invalid-email");
      expect(error.constraint).toBe("must be valid email");
      expect(error.recoverable).toBe(false);
      expect(error.name).toBe("ValidationError");
    });

    it("should serialize with field, value, and constraint", () => {
      const error = new ValidationError("Validation failed", "age", -5, "must be positive");
      const json = error.toJSON();

      expect(json.field).toBe("age");
      expect(json.value).toBe(-5);
      expect(json.constraint).toBe("must be positive");
    });

    it("should generate user-friendly message", () => {
      const error = new ValidationError("Validation failed", "username", "", "must not be empty");
      expect(error.getUserMessage()).toBe("Invalid username: must not be empty");
    });

    it("should handle complex values", () => {
      const complexValue = { nested: { value: 123 } };
      const error = new ValidationError(
        "Validation failed",
        "data",
        complexValue,
        "must be string"
      );

      expect(error.value).toEqual(complexValue);
    });
  });

  describe("Helper Functions", () => {
    describe("createConnectionError", () => {
      it("should create database connection error", () => {
        const error = createConnectionError("Connection failed", testContext);

        expect(error).toBeInstanceOf(DatabaseError);
        expect(error.code).toBe(ErrorCodes.DB_CONNECTION_FAILED);
        expect(error.recoverable).toBe(true);
        expect(error.context).toEqual(testContext);
      });

      it("should create connection error with default context", () => {
        const error = createConnectionError("Connection failed");
        expect(error.context).toEqual({});
      });
    });

    describe("createTransactionError", () => {
      it("should create transaction error with query", () => {
        const query = "BEGIN TRANSACTION";
        const params = ["value"];
        const error = createTransactionError("Transaction failed", testContext, query, params);

        expect(error).toBeInstanceOf(DatabaseError);
        expect(error.code).toBe(ErrorCodes.DB_TRANSACTION_FAILED);
        expect(error.recoverable).toBe(true);
        expect(error.query).toBe(query);
        expect(error.params).toEqual(params);
      });
    });

    describe("createQueryTimeoutError", () => {
      it("should create query timeout error", () => {
        const query = "SELECT * FROM large_table";
        const error = createQueryTimeoutError("Query timeout", testContext, query);

        expect(error).toBeInstanceOf(DatabaseError);
        expect(error.code).toBe(ErrorCodes.DB_QUERY_TIMEOUT);
        expect(error.recoverable).toBe(true);
        expect(error.query).toBe(query);
      });
    });

    describe("createEmbeddingTimeoutError", () => {
      it("should create embedding timeout error", () => {
        const error = createEmbeddingTimeoutError(
          "Embedding timeout",
          "nomic-embed-text",
          2048,
          testContext
        );

        expect(error).toBeInstanceOf(EmbeddingError);
        expect(error.code).toBe(ErrorCodes.EMBEDDING_TIMEOUT);
        expect(error.model).toBe("nomic-embed-text");
        expect(error.inputLength).toBe(2048);
      });
    });

    describe("createModelUnavailableError", () => {
      it("should create model unavailable error", () => {
        const error = createModelUnavailableError(
          "Model unavailable",
          "nomic-embed-text",
          1024,
          testContext
        );

        expect(error).toBeInstanceOf(EmbeddingError);
        expect(error.code).toBe(ErrorCodes.EMBEDDING_MODEL_UNAVAILABLE);
        expect(error.model).toBe("nomic-embed-text");
        expect(error.inputLength).toBe(1024);
      });
    });

    describe("createFrameworkFailureError", () => {
      it("should create framework failure error", () => {
        const error = createFrameworkFailureError(
          "Framework failed",
          "Design Thinking",
          testContext
        );

        expect(error).toBeInstanceOf(ReasoningError);
        expect(error.code).toBe(ErrorCodes.REASONING_FRAMEWORK_FAILED);
        expect(error.framework).toBe("Design Thinking");
        expect(error.recoverable).toBe(true);
      });
    });

    describe("createStreamTimeoutError", () => {
      it("should create stream timeout error", () => {
        const error = createStreamTimeoutError("Stream timeout", testContext, "synthesis");

        expect(error).toBeInstanceOf(ReasoningError);
        expect(error.code).toBe(ErrorCodes.REASONING_STREAM_TIMEOUT);
        expect(error.step).toBe("synthesis");
        expect(error.recoverable).toBe(true);
      });
    });

    describe("createValidationError", () => {
      it("should create validation error", () => {
        const error = createValidationError("email", "invalid", "must be valid email", testContext);

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
        expect(error.field).toBe("email");
        expect(error.value).toBe("invalid");
        expect(error.constraint).toBe("must be valid email");
        expect(error.recoverable).toBe(false);
      });
    });
  });

  describe("Error Codes", () => {
    it("should have all required database error codes", () => {
      expect(ErrorCodes.DB_CONNECTION_FAILED).toBe("DB_CONNECTION_FAILED");
      expect(ErrorCodes.DB_TRANSACTION_FAILED).toBe("DB_TRANSACTION_FAILED");
      expect(ErrorCodes.DB_QUERY_TIMEOUT).toBe("DB_QUERY_TIMEOUT");
      expect(ErrorCodes.DB_QUERY_FAILED).toBe("DB_QUERY_FAILED");
    });

    it("should have all required embedding error codes", () => {
      expect(ErrorCodes.EMBEDDING_TIMEOUT).toBe("EMBEDDING_TIMEOUT");
      expect(ErrorCodes.EMBEDDING_MODEL_UNAVAILABLE).toBe("EMBEDDING_MODEL_UNAVAILABLE");
      expect(ErrorCodes.EMBEDDING_GENERATION_FAILED).toBe("EMBEDDING_GENERATION_FAILED");
    });

    it("should have all required reasoning error codes", () => {
      expect(ErrorCodes.REASONING_FRAMEWORK_FAILED).toBe("REASONING_FRAMEWORK_FAILED");
      expect(ErrorCodes.REASONING_STREAM_TIMEOUT).toBe("REASONING_STREAM_TIMEOUT");
      expect(ErrorCodes.REASONING_SYNTHESIS_FAILED).toBe("REASONING_SYNTHESIS_FAILED");
    });

    it("should have all required validation error codes", () => {
      expect(ErrorCodes.VALIDATION_FAILED).toBe("VALIDATION_FAILED");
      expect(ErrorCodes.INVALID_INPUT).toBe("INVALID_INPUT");
      expect(ErrorCodes.CONSTRAINT_VIOLATION).toBe("CONSTRAINT_VIOLATION");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null context gracefully", () => {
      const error = new CognitiveError("Test", ErrorCodes.UNKNOWN_ERROR, null as any);
      expect(error.context).toBeNull();
    });

    it("should handle undefined values in context", () => {
      const context: ErrorContext = {
        component: undefined,
        operation: "test",
      };
      const error = new CognitiveError("Test", ErrorCodes.UNKNOWN_ERROR, context);
      expect(error.context.component).toBeUndefined();
      expect(error.context.operation).toBe("test");
    });

    it("should handle very long error messages", () => {
      const longMessage = "A".repeat(10000);
      const error = new CognitiveError(longMessage, ErrorCodes.UNKNOWN_ERROR);
      expect(error.message).toBe(longMessage);
    });

    it("should handle special characters in error messages", () => {
      const message = "Error: <script>alert('xss')</script>";
      const error = new CognitiveError(message, ErrorCodes.UNKNOWN_ERROR);
      expect(error.message).toBe(message);
    });
  });
});
