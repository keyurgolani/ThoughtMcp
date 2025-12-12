/**
 * API Response Types and Utilities Unit Tests
 *
 * Tests for the API response formatting utilities.
 * Requirements: 15.1, 15.2
 */

import { describe, expect, it } from "vitest";
import {
  buildErrorResponse,
  buildNotFoundResponse,
  buildSuccessResponse,
  buildValidationErrorResponse,
  ErrorCodes,
  ErrorCodeToHttpStatus,
  generateRequestId,
  getHttpStatusForErrorCode,
  isErrorResponse,
  isSuccessResponse,
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from "../../../../server/types/api-response.js";

describe("API Response Types and Utilities", () => {
  describe("generateRequestId", () => {
    it("should generate unique request IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
    });

    it("should generate IDs with correct format", () => {
      const id = generateRequestId();

      expect(id).toMatch(/^req-\d+-[a-z0-9]+$/);
    });

    it("should include timestamp in ID", () => {
      const before = Date.now();
      const id = generateRequestId();
      const after = Date.now();

      const timestampPart = parseInt(id.split("-")[1], 10);
      expect(timestampPart).toBeGreaterThanOrEqual(before);
      expect(timestampPart).toBeLessThanOrEqual(after);
    });
  });

  describe("buildSuccessResponse", () => {
    it("should build success response with data", () => {
      const data = { message: "Hello" };
      const response = buildSuccessResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
    });

    it("should include metadata by default", () => {
      const response = buildSuccessResponse({ test: true });

      expect(response.metadata).toBeDefined();
      expect(response.metadata?.requestId).toMatch(/^req-/);
      expect(response.metadata?.timestamp).toBeDefined();
      expect(typeof response.metadata?.processingTime).toBe("number");
    });

    it("should use provided requestId", () => {
      const requestId = "custom-request-id";
      const response = buildSuccessResponse({ test: true }, { requestId });

      expect(response.metadata?.requestId).toBe(requestId);
    });

    it("should calculate processing time from startTime", () => {
      const startTime = Date.now() - 100;
      const response = buildSuccessResponse({ test: true }, { startTime });

      expect(response.metadata?.processingTime).toBeGreaterThanOrEqual(100);
    });

    it("should exclude metadata when includeMetadata is false", () => {
      const response = buildSuccessResponse({ test: true }, { includeMetadata: false });

      expect(response.metadata).toBeUndefined();
    });

    it("should handle complex data types", () => {
      const complexData = {
        array: [1, 2, 3],
        nested: { deep: { value: "test" } },
        nullValue: null,
      };
      const response = buildSuccessResponse(complexData);

      expect(response.data).toEqual(complexData);
    });
  });

  describe("buildErrorResponse", () => {
    it("should build error response with message and code", () => {
      const response = buildErrorResponse("Something went wrong", ErrorCodes.INTERNAL_ERROR);

      expect(response.success).toBe(false);
      expect(response.error).toBe("Something went wrong");
      expect(response.code).toBe(ErrorCodes.INTERNAL_ERROR);
    });

    it("should include suggestion when provided", () => {
      const response = buildErrorResponse("Error", ErrorCodes.VALIDATION_ERROR, {
        suggestion: "Try again",
      });

      expect(response.suggestion).toBe("Try again");
    });

    it("should include details when provided", () => {
      const details = { field: "email", reason: "invalid format" };
      const response = buildErrorResponse("Error", ErrorCodes.VALIDATION_ERROR, { details });

      expect(response.details).toEqual(details);
    });

    it("should not include optional fields when not provided", () => {
      const response = buildErrorResponse("Error", ErrorCodes.INTERNAL_ERROR);

      expect(response.suggestion).toBeUndefined();
      expect(response.details).toBeUndefined();
    });
  });

  describe("buildValidationErrorResponse", () => {
    it("should build validation error with field errors", () => {
      const fieldErrors = {
        email: "Invalid email format",
        password: "Password too short",
      };
      const response = buildValidationErrorResponse(fieldErrors);

      expect(response.success).toBe(false);
      expect(response.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(response.details).toEqual(fieldErrors);
    });

    it("should include helpful suggestion", () => {
      const response = buildValidationErrorResponse({ field: "error" });

      expect(response.suggestion).toBe(
        "Check that all required fields are provided with valid values"
      );
    });

    it("should have correct error message", () => {
      const response = buildValidationErrorResponse({});

      expect(response.error).toBe("Invalid request parameters");
    });
  });

  describe("buildNotFoundResponse", () => {
    it("should build not found error with resource info", () => {
      const response = buildNotFoundResponse("Memory", "mem-123");

      expect(response.success).toBe(false);
      expect(response.code).toBe(ErrorCodes.NOT_FOUND);
      expect(response.error).toBe("Memory not found");
    });

    it("should include resource ID in details", () => {
      const response = buildNotFoundResponse("Session", "sess-456");

      expect(response.details).toEqual({ sessionId: "sess-456" });
    });

    it("should include helpful suggestion", () => {
      const response = buildNotFoundResponse("Memory", "mem-123");

      expect(response.suggestion).toContain("memory");
      expect(response.suggestion).toContain("ID");
    });
  });

  describe("isSuccessResponse", () => {
    it("should return true for success responses", () => {
      const response: ApiSuccessResponse<string> = {
        success: true,
        data: "test",
      };

      expect(isSuccessResponse(response)).toBe(true);
    });

    it("should return false for error responses", () => {
      const response: ApiErrorResponse = {
        success: false,
        error: "Error",
        code: "ERROR",
      };

      expect(isSuccessResponse(response)).toBe(false);
    });
  });

  describe("isErrorResponse", () => {
    it("should return true for error responses", () => {
      const response: ApiErrorResponse = {
        success: false,
        error: "Error",
        code: "ERROR",
      };

      expect(isErrorResponse(response)).toBe(true);
    });

    it("should return false for success responses", () => {
      const response: ApiSuccessResponse<string> = {
        success: true,
        data: "test",
      };

      expect(isErrorResponse(response)).toBe(false);
    });
  });

  describe("ErrorCodes", () => {
    it("should have all expected error codes", () => {
      expect(ErrorCodes.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
      expect(ErrorCodes.UNAUTHORIZED).toBe("UNAUTHORIZED");
      expect(ErrorCodes.FORBIDDEN).toBe("FORBIDDEN");
      expect(ErrorCodes.NOT_FOUND).toBe("NOT_FOUND");
      expect(ErrorCodes.CONFLICT).toBe("CONFLICT");
      expect(ErrorCodes.RATE_LIMITED).toBe("RATE_LIMITED");
      expect(ErrorCodes.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
      expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe("SERVICE_UNAVAILABLE");
      expect(ErrorCodes.REQUEST_TIMEOUT).toBe("REQUEST_TIMEOUT");
    });
  });

  describe("ErrorCodeToHttpStatus", () => {
    it("should map error codes to correct HTTP status codes", () => {
      expect(ErrorCodeToHttpStatus[ErrorCodes.VALIDATION_ERROR]).toBe(400);
      expect(ErrorCodeToHttpStatus[ErrorCodes.UNAUTHORIZED]).toBe(401);
      expect(ErrorCodeToHttpStatus[ErrorCodes.FORBIDDEN]).toBe(403);
      expect(ErrorCodeToHttpStatus[ErrorCodes.NOT_FOUND]).toBe(404);
      expect(ErrorCodeToHttpStatus[ErrorCodes.CONFLICT]).toBe(409);
      expect(ErrorCodeToHttpStatus[ErrorCodes.RATE_LIMITED]).toBe(429);
      expect(ErrorCodeToHttpStatus[ErrorCodes.INTERNAL_ERROR]).toBe(500);
      expect(ErrorCodeToHttpStatus[ErrorCodes.SERVICE_UNAVAILABLE]).toBe(503);
      expect(ErrorCodeToHttpStatus[ErrorCodes.REQUEST_TIMEOUT]).toBe(408);
    });
  });

  describe("getHttpStatusForErrorCode", () => {
    it("should return correct HTTP status for known error codes", () => {
      expect(getHttpStatusForErrorCode(ErrorCodes.VALIDATION_ERROR)).toBe(400);
      expect(getHttpStatusForErrorCode(ErrorCodes.NOT_FOUND)).toBe(404);
      expect(getHttpStatusForErrorCode(ErrorCodes.INTERNAL_ERROR)).toBe(500);
    });

    it("should return 500 for unknown error codes", () => {
      // Using type assertion to test unknown code handling
      expect(getHttpStatusForErrorCode("UNKNOWN_CODE" as never)).toBe(500);
    });
  });
});
