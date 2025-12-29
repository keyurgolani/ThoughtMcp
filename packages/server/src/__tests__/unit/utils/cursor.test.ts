/**
 * Tests for Cursor Encoding Utilities
 *
 * Tests cursor encoding/decoding for cursor-based pagination.
 * Validates Property 18: Cursor Opacity - encoding then decoding produces same result.
 */

import { describe, expect, it } from "vitest";
import {
  Cursor,
  CursorDecodeError,
  decodeCursor,
  encodeCursor,
  isValidCursor,
} from "../../../utils/cursor.js";

describe("Cursor Encoding Utilities", () => {
  describe("encodeCursor", () => {
    it("should encode cursor to base64 string", () => {
      const cursor: Cursor = {
        timestamp: new Date("2025-01-15T10:30:00.000Z"),
        id: "mem-123",
      };

      const encoded = encodeCursor(cursor);

      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);
      // Verify it's valid base64
      expect(() => Buffer.from(encoded, "base64")).not.toThrow();
    });

    it("should produce opaque base64 output", () => {
      const cursor: Cursor = {
        timestamp: new Date("2025-01-15T10:30:00.000Z"),
        id: "mem-123",
      };

      const encoded = encodeCursor(cursor);

      // Should not contain readable timestamp or ID directly
      expect(encoded).not.toContain("2025-01-15");
      expect(encoded).not.toContain("mem-123");
    });

    it("should throw error for null cursor", () => {
      expect(() => encodeCursor(null as unknown as Cursor)).toThrow(
        "Invalid cursor: timestamp and id are required"
      );
    });

    it("should throw error for undefined cursor", () => {
      expect(() => encodeCursor(undefined as unknown as Cursor)).toThrow(
        "Invalid cursor: timestamp and id are required"
      );
    });

    it("should throw error for missing timestamp", () => {
      const cursor = { id: "mem-123" } as Cursor;
      expect(() => encodeCursor(cursor)).toThrow("Invalid cursor: timestamp and id are required");
    });

    it("should throw error for missing id", () => {
      const cursor = { timestamp: new Date() } as Cursor;
      expect(() => encodeCursor(cursor)).toThrow("Invalid cursor: timestamp and id are required");
    });

    it("should throw error for invalid timestamp", () => {
      const cursor: Cursor = {
        timestamp: new Date("invalid"),
        id: "mem-123",
      };
      expect(() => encodeCursor(cursor)).toThrow("Invalid cursor: timestamp must be a valid Date");
    });

    it("should throw error for non-Date timestamp", () => {
      const cursor = {
        timestamp: "2025-01-15T10:30:00.000Z",
        id: "mem-123",
      } as unknown as Cursor;
      expect(() => encodeCursor(cursor)).toThrow("Invalid cursor: timestamp must be a valid Date");
    });

    it("should throw error for empty id", () => {
      const cursor: Cursor = {
        timestamp: new Date(),
        id: "",
      };
      expect(() => encodeCursor(cursor)).toThrow("Invalid cursor: id must be a non-empty string");
    });

    it("should throw error for non-string id", () => {
      const cursor = {
        timestamp: new Date(),
        id: 123,
      } as unknown as Cursor;
      expect(() => encodeCursor(cursor)).toThrow("Invalid cursor: id must be a non-empty string");
    });

    it("should handle IDs with special characters", () => {
      const cursor: Cursor = {
        timestamp: new Date("2025-01-15T10:30:00.000Z"),
        id: "mem-123-abc_def.xyz",
      };

      const encoded = encodeCursor(cursor);
      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);
    });

    it("should handle very long IDs", () => {
      const cursor: Cursor = {
        timestamp: new Date("2025-01-15T10:30:00.000Z"),
        id: "a".repeat(1000),
      };

      const encoded = encodeCursor(cursor);
      expect(typeof encoded).toBe("string");
    });
  });

  describe("decodeCursor", () => {
    it("should decode valid cursor string", () => {
      const original: Cursor = {
        timestamp: new Date("2025-01-15T10:30:00.000Z"),
        id: "mem-123",
      };
      const encoded = encodeCursor(original);

      const decoded = decodeCursor(encoded);

      expect(decoded.timestamp.toISOString()).toBe(original.timestamp.toISOString());
      expect(decoded.id).toBe(original.id);
    });

    it("should throw CursorDecodeError for null input", () => {
      expect(() => decodeCursor(null as unknown as string)).toThrow(CursorDecodeError);
      expect(() => decodeCursor(null as unknown as string)).toThrow(
        "Invalid cursor: must be a non-empty string"
      );
    });

    it("should throw CursorDecodeError for undefined input", () => {
      expect(() => decodeCursor(undefined as unknown as string)).toThrow(CursorDecodeError);
    });

    it("should throw CursorDecodeError for empty string", () => {
      expect(() => decodeCursor("")).toThrow(CursorDecodeError);
      expect(() => decodeCursor("")).toThrow("Invalid cursor: must be a non-empty string");
    });

    it("should throw CursorDecodeError for non-string input", () => {
      expect(() => decodeCursor(123 as unknown as string)).toThrow(CursorDecodeError);
    });

    it("should throw CursorDecodeError for invalid base64", () => {
      expect(() => decodeCursor("not-valid-base64!!!")).toThrow(CursorDecodeError);
    });

    it("should throw CursorDecodeError for malformed payload (no separator)", () => {
      const malformed = Buffer.from("just-some-text").toString("base64");
      expect(() => decodeCursor(malformed)).toThrow(CursorDecodeError);
      expect(() => decodeCursor(malformed)).toThrow("Invalid cursor: malformed payload");
    });

    it("should throw CursorDecodeError for missing timestamp", () => {
      const malformed = Buffer.from("|mem-123").toString("base64");
      expect(() => decodeCursor(malformed)).toThrow(CursorDecodeError);
      expect(() => decodeCursor(malformed)).toThrow("Invalid cursor: missing timestamp or id");
    });

    it("should throw CursorDecodeError for missing id", () => {
      const malformed = Buffer.from("2025-01-15T10:30:00.000Z|").toString("base64");
      expect(() => decodeCursor(malformed)).toThrow(CursorDecodeError);
      expect(() => decodeCursor(malformed)).toThrow("Invalid cursor: missing timestamp or id");
    });

    it("should throw CursorDecodeError for invalid timestamp format", () => {
      const malformed = Buffer.from("not-a-date|mem-123").toString("base64");
      expect(() => decodeCursor(malformed)).toThrow(CursorDecodeError);
      expect(() => decodeCursor(malformed)).toThrow("Invalid cursor: invalid timestamp format");
    });
  });

  describe("Round-trip encoding/decoding (Property 18: Cursor Opacity)", () => {
    it("should produce identical cursor after encode-decode cycle", () => {
      const original: Cursor = {
        timestamp: new Date("2025-01-15T10:30:00.000Z"),
        id: "mem-123",
      };

      const encoded = encodeCursor(original);
      const decoded = decodeCursor(encoded);
      const reEncoded = encodeCursor(decoded);

      expect(reEncoded).toBe(encoded);
    });

    it("should preserve timestamp precision through round-trip", () => {
      const original: Cursor = {
        timestamp: new Date("2025-01-15T10:30:45.123Z"),
        id: "mem-456",
      };

      const encoded = encodeCursor(original);
      const decoded = decodeCursor(encoded);

      expect(decoded.timestamp.getTime()).toBe(original.timestamp.getTime());
    });

    it("should preserve ID with special characters through round-trip", () => {
      const original: Cursor = {
        timestamp: new Date("2025-01-15T10:30:00.000Z"),
        id: "mem-123_abc.def-xyz",
      };

      const encoded = encodeCursor(original);
      const decoded = decodeCursor(encoded);

      expect(decoded.id).toBe(original.id);
    });

    it("should preserve ID with unicode characters through round-trip", () => {
      const original: Cursor = {
        timestamp: new Date("2025-01-15T10:30:00.000Z"),
        id: "mem-日本語-émoji-🎉",
      };

      const encoded = encodeCursor(original);
      const decoded = decodeCursor(encoded);

      expect(decoded.id).toBe(original.id);
    });

    it("should handle various timestamp values", () => {
      const timestamps = [
        new Date("2020-01-01T00:00:00.000Z"),
        new Date("2025-12-31T23:59:59.999Z"),
        new Date("2000-06-15T12:30:45.500Z"),
        new Date(0), // Unix epoch
        new Date(Date.now()),
      ];

      for (const timestamp of timestamps) {
        const original: Cursor = { timestamp, id: "test-id" };
        const encoded = encodeCursor(original);
        const decoded = decodeCursor(encoded);

        expect(decoded.timestamp.getTime()).toBe(original.timestamp.getTime());
      }
    });
  });

  describe("isValidCursor", () => {
    it("should return true for valid cursor", () => {
      const cursor: Cursor = {
        timestamp: new Date("2025-01-15T10:30:00.000Z"),
        id: "mem-123",
      };
      const encoded = encodeCursor(cursor);

      expect(isValidCursor(encoded)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isValidCursor(null as unknown as string)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isValidCursor(undefined as unknown as string)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidCursor("")).toBe(false);
    });

    it("should return false for invalid base64", () => {
      expect(isValidCursor("not-valid!!!")).toBe(false);
    });

    it("should return false for malformed payload", () => {
      const malformed = Buffer.from("no-separator-here").toString("base64");
      expect(isValidCursor(malformed)).toBe(false);
    });

    it("should return false for invalid timestamp", () => {
      const malformed = Buffer.from("invalid-date|mem-123").toString("base64");
      expect(isValidCursor(malformed)).toBe(false);
    });
  });

  describe("CursorDecodeError", () => {
    it("should be instance of Error", () => {
      const error = new CursorDecodeError("test message");
      expect(error).toBeInstanceOf(Error);
    });

    it("should have correct name", () => {
      const error = new CursorDecodeError("test message");
      expect(error.name).toBe("CursorDecodeError");
    });

    it("should preserve message", () => {
      const error = new CursorDecodeError("test message");
      expect(error.message).toBe("test message");
    });
  });
});
