/**
 * Error Handler Middleware Tests
 *
 * Tests for the REST API error handling middleware.
 * Requirements: 15.3, 15.4, 15.5
 */

import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z, ZodError } from "zod";
import {
  ApiError,
  asyncHandler,
  ConflictError,
  errorHandler,
  ForbiddenError,
  formatZodErrors,
  NotFoundError,
  notFoundHandler,
  UnauthorizedError,
  ValidationApiError,
} from "../../../../server/middleware/error-handler.js";
import { ErrorCodes } from "../../../../server/types/api-response.js";
import {
  CognitiveError,
  DatabaseError,
  EmbeddingError,
  ReasoningError,
  ErrorCodes as UtilErrorCodes,
  ValidationError as UtilValidationError,
} from "../../../../utils/errors.js";

// Mock logger to prevent console output during tests
vi.mock("../../../../utils/logger.js", () => ({
  Logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Error Handler Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      method: "GET",
      path: "/api/v1/test",
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = vi.fn();
  });

  describe("ApiError class", () => {
    it("should create ApiError with all properties", () => {
      const error = new ApiError("Test error", 400, ErrorCodes.VALIDATION_ERROR, {
        details: { field: "value" },
        suggestion: "Fix the field",
      });

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.details).toEqual({ field: "value" });
      expect(error.suggestion).toBe("Fix the field");
      expect(error.name).toBe("ApiError");
    });

    it("should create ApiError without optional properties", () => {
      const error = new ApiError("Test error", 500, ErrorCodes.INTERNAL_ERROR);

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
      expect(error.details).toBeUndefined();
      expect(error.suggestion).toBeUndefined();
    });
  });

  describe("NotFoundError class", () => {
    it("should create NotFoundError with resource details", () => {
      const error = new NotFoundError("Memory", "mem-123");

      expect(error.message).toBe("Memory not found");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(error.resourceType).toBe("Memory");
      expect(error.resourceId).toBe("mem-123");
      expect(error.details).toEqual({ memoryId: "mem-123" });
      expect(error.suggestion).toContain("memory");
      expect(error.name).toBe("NotFoundError");
    });
  });

  describe("ValidationApiError class", () => {
    it("should create ValidationApiError with field errors", () => {
      const fieldErrors = {
        email: "Invalid email format",
        password: "Password too short",
      };
      const error = new ValidationApiError(fieldErrors);

      expect(error.message).toBe("Invalid request parameters");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.fieldErrors).toEqual(fieldErrors);
      expect(error.details).toEqual(fieldErrors);
      expect(error.name).toBe("ValidationApiError");
    });
  });

  describe("UnauthorizedError class", () => {
    it("should create UnauthorizedError with default message", () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe("Authentication required");
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
      expect(error.name).toBe("UnauthorizedError");
    });

    it("should create UnauthorizedError with custom message", () => {
      const error = new UnauthorizedError("Invalid token");

      expect(error.message).toBe("Invalid token");
      expect(error.statusCode).toBe(401);
    });
  });

  describe("ForbiddenError class", () => {
    it("should create ForbiddenError with default message", () => {
      const error = new ForbiddenError();

      expect(error.message).toBe("Access denied");
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCodes.FORBIDDEN);
      expect(error.name).toBe("ForbiddenError");
    });

    it("should create ForbiddenError with custom message", () => {
      const error = new ForbiddenError("Insufficient permissions");

      expect(error.message).toBe("Insufficient permissions");
      expect(error.statusCode).toBe(403);
    });
  });

  describe("ConflictError class", () => {
    it("should create ConflictError with message and details", () => {
      const error = new ConflictError("Resource already exists", { id: "123" });

      expect(error.message).toBe("Resource already exists");
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(ErrorCodes.CONFLICT);
      expect(error.details).toEqual({ id: "123" });
      expect(error.name).toBe("ConflictError");
    });
  });

  describe("formatZodErrors", () => {
    it("should format Zod errors into field-level messages", () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(0),
      });

      try {
        schema.parse({ email: "invalid", age: -1 });
      } catch (err) {
        if (err instanceof ZodError) {
          const fieldErrors = formatZodErrors(err);
          expect(fieldErrors).toHaveProperty("email");
          expect(fieldErrors).toHaveProperty("age");
        }
      }
    });

    it("should handle nested paths", () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(1),
        }),
      });

      try {
        schema.parse({ user: { name: "" } });
      } catch (err) {
        if (err instanceof ZodError) {
          const fieldErrors = formatZodErrors(err);
          expect(fieldErrors).toHaveProperty("user.name");
        }
      }
    });

    it("should use 'request' for root-level errors", () => {
      const schema = z.string();

      try {
        schema.parse(123);
      } catch (err) {
        if (err instanceof ZodError) {
          const fieldErrors = formatZodErrors(err);
          expect(fieldErrors).toHaveProperty("request");
        }
      }
    });
  });

  describe("errorHandler middleware", () => {
    it("should handle ApiError", () => {
      const error = new ApiError("Test error", 400, ErrorCodes.VALIDATION_ERROR, {
        details: { field: "error" },
        suggestion: "Fix it",
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Test error",
          code: ErrorCodes.VALIDATION_ERROR,
        })
      );
    });

    it("should handle NotFoundError with resource identifier", () => {
      const error = new NotFoundError("Session", "sess-456");

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Session not found",
          code: ErrorCodes.NOT_FOUND,
          details: { sessionId: "sess-456" },
        })
      );
    });

    it("should handle ValidationApiError with field-level details", () => {
      const error = new ValidationApiError({
        email: "Invalid email",
        password: "Too short",
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Invalid request parameters",
          code: ErrorCodes.VALIDATION_ERROR,
          details: {
            email: "Invalid email",
            password: "Too short",
          },
        })
      );
    });

    it("should handle UnauthorizedError", () => {
      const error = new UnauthorizedError("Token expired");

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Token expired",
          code: ErrorCodes.UNAUTHORIZED,
        })
      );
    });

    it("should handle ForbiddenError", () => {
      const error = new ForbiddenError();

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Access denied",
          code: ErrorCodes.FORBIDDEN,
        })
      );
    });

    it("should handle ZodError with field-level details", () => {
      const schema = z.object({
        content: z.string().min(10),
        userId: z.string().uuid(),
      });

      let zodError: ZodError | undefined;
      try {
        schema.parse({ content: "short", userId: "invalid" });
      } catch (err) {
        if (err instanceof ZodError) {
          zodError = err;
        }
      }

      if (zodError) {
        errorHandler(zodError, mockRequest as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: "Invalid request parameters",
            code: ErrorCodes.VALIDATION_ERROR,
          })
        );
        const response = jsonMock.mock.calls[0][0];
        expect(response.details).toHaveProperty("content");
        expect(response.details).toHaveProperty("userId");
      }
    });

    it("should handle utility ValidationError", () => {
      const error = new UtilValidationError(
        "Validation failed",
        "email",
        "invalid@",
        "must be valid email"
      );

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Invalid request parameters",
          code: ErrorCodes.VALIDATION_ERROR,
          details: { email: "must be valid email" },
        })
      );
    });

    it("should handle CognitiveError", () => {
      const error = new CognitiveError(
        "Cognitive processing failed",
        UtilErrorCodes.OPERATION_FAILED,
        { component: "reasoning" }
      );

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: ErrorCodes.INTERNAL_ERROR,
        })
      );
    });

    it("should handle DatabaseError with service unavailable", () => {
      const error = new DatabaseError(
        "Connection failed",
        UtilErrorCodes.DB_CONNECTION_FAILED,
        {},
        true
      );

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: ErrorCodes.SERVICE_UNAVAILABLE,
        })
      );
    });

    it("should handle EmbeddingError", () => {
      const error = new EmbeddingError(
        "Embedding timeout",
        UtilErrorCodes.EMBEDDING_TIMEOUT,
        "nomic-embed-text",
        1000
      );

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: ErrorCodes.SERVICE_UNAVAILABLE,
        })
      );
    });

    it("should handle ReasoningError", () => {
      const error = new ReasoningError(
        "Framework failed",
        UtilErrorCodes.REASONING_FRAMEWORK_FAILED,
        {},
        true,
        "analytical"
      );

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: ErrorCodes.INTERNAL_ERROR,
        })
      );
    });

    it("should handle generic error with 'not found' in message", () => {
      const error = new Error("Resource not found");

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: ErrorCodes.NOT_FOUND,
        })
      );
    });

    it("should handle generic error with 'unauthorized' in message", () => {
      const error = new Error("Unauthorized access");

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: ErrorCodes.UNAUTHORIZED,
        })
      );
    });

    it("should handle generic error with 'forbidden' in message", () => {
      const error = new Error("Forbidden operation");

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: ErrorCodes.FORBIDDEN,
        })
      );
    });

    it("should handle unknown errors as internal server error", () => {
      const error = new Error("Something went wrong");

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Internal server error",
          code: ErrorCodes.INTERNAL_ERROR,
        })
      );
    });
  });

  describe("notFoundHandler", () => {
    it("should return 404 with route details", () => {
      mockRequest = {
        method: "POST",
        path: "/api/v1/unknown",
      };

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Route not found: POST /api/v1/unknown",
          code: ErrorCodes.NOT_FOUND,
          details: { method: "POST", path: "/api/v1/unknown" },
        })
      );
    });
  });

  describe("asyncHandler", () => {
    it("should pass successful async function result", async () => {
      const asyncFn = vi.fn().mockResolvedValue(undefined);
      const wrapped = asyncHandler(asyncFn);

      wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should catch async errors and pass to next", async () => {
      const error = new Error("Async error");
      const asyncFn = vi.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(asyncFn);

      wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
