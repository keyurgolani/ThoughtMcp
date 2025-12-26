/**
 * Tests for Logger utility
 *
 * TDD: Write tests first to define expected behavior
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "../../../utils/logger";

describe("Logger", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on stderr.write to capture log output
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true) as ReturnType<
      typeof vi.spyOn
    >;
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  describe("error", () => {
    it("should write error messages to stderr", () => {
      Logger.error("Test error message");

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Test error message"));
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("\n"));
    });

    it("should handle multiple arguments", () => {
      Logger.error("Error:", "details", 123);

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Error: details 123"));
    });

    it("should handle Error objects", () => {
      const error = new Error("Test error");
      Logger.error("Failed:", error);

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Failed:"));
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Test error"));
    });
  });

  describe("info", () => {
    it("should write info messages to stderr", () => {
      Logger.info("Test info message");

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Test info message"));
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("\n"));
    });

    it("should handle multiple arguments", () => {
      Logger.info("Info:", "details", 456);

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Info: details 456"));
    });
  });

  describe("warn", () => {
    it("should write warning messages to stderr", () => {
      Logger.warn("Test warning message");

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Test warning message"));
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("\n"));
    });
  });

  describe("debug", () => {
    it("should write debug messages to stderr when NODE_ENV is development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      Logger.debug("Test debug message");

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Test debug message"));

      process.env.NODE_ENV = originalEnv;
    });

    it("should not write debug messages in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      Logger.debug("Test debug message");

      expect(stderrSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("log", () => {
    it("should write log messages to stderr", () => {
      Logger.log("Test log message");

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Test log message"));
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("\n"));
    });
  });

  describe("formatArgs edge cases", () => {
    it("should format Error object with stack trace", () => {
      const error = new Error("Test error with stack");
      Logger.error(error);

      const call = stderrSpy.mock.calls[0][0] as string;
      expect(call).toContain("Test error with stack");
      expect(call).toContain("Error:");
    });

    it("should format Error object without stack trace", () => {
      const error = new Error("Test error");
      delete (error as { stack?: string }).stack;
      Logger.error(error);

      const call = stderrSpy.mock.calls[0][0] as string;
      expect(call).toContain("Test error");
    });

    it("should handle circular reference in object", () => {
      const obj: { name: string; self?: unknown } = { name: "test" };
      obj.self = obj; // Create circular reference

      Logger.log(obj);

      const call = stderrSpy.mock.calls[0][0] as string;
      expect(call).toContain("[object Object]");
    });

    it("should handle mixed argument types", () => {
      const obj = { key: "value" };
      const error = new Error("test error");
      Logger.log("string", 123, obj, error, true, null, undefined);

      const call = stderrSpy.mock.calls[0][0] as string;
      expect(call).toContain("string");
      expect(call).toContain("123");
      expect(call).toContain("key");
      expect(call).toContain("test error");
      expect(call).toContain("true");
      expect(call).toContain("null");
      expect(call).toContain("undefined");
    });

    it("should handle null argument", () => {
      Logger.log(null);

      const call = stderrSpy.mock.calls[0][0] as string;
      expect(call).toContain("null");
    });

    it("should handle undefined argument", () => {
      Logger.log(undefined);

      const call = stderrSpy.mock.calls[0][0] as string;
      expect(call).toContain("undefined");
    });

    it("should handle empty arguments array", () => {
      Logger.log();

      expect(stderrSpy).toHaveBeenCalledWith("\n");
    });

    it("should format objects with JSON.stringify", () => {
      const obj = { name: "test", value: 123, nested: { key: "value" } };
      Logger.log(obj);

      const call = stderrSpy.mock.calls[0][0] as string;
      expect(call).toContain('"name"');
      expect(call).toContain('"test"');
      expect(call).toContain('"value"');
      expect(call).toContain("123");
      expect(call).toContain('"nested"');
    });

    it("should handle very large objects", () => {
      const largeObj = { data: new Array(1000).fill("x").join("") };
      Logger.log(largeObj);

      const call = stderrSpy.mock.calls[0][0] as string;
      expect(call).toContain("data");
      expect(call.length).toBeGreaterThan(1000);
    });
  });
});
