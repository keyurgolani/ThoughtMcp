/**
 * Tests for Structured Logger
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { StructuredLogger } from "../../../monitoring/structured-logger.js";

describe("StructuredLogger", () => {
  let logger: StructuredLogger;
  let stderrSpy: MockInstance;

  beforeEach(() => {
    stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true) as unknown as MockInstance;
    logger = new StructuredLogger({
      minLevel: "debug",
      structuredOutput: false,
      component: "test",
    });
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  describe("Log Levels", () => {
    it("should log debug messages when level is debug", () => {
      logger.debug("Debug message");
      expect(stderrSpy).toHaveBeenCalled();
      expect(stderrSpy.mock.calls[0][0]).toContain("DEBUG");
      expect(stderrSpy.mock.calls[0][0]).toContain("Debug message");
    });

    it("should log info messages", () => {
      logger.info("Info message");
      expect(stderrSpy).toHaveBeenCalled();
      expect(stderrSpy.mock.calls[0][0]).toContain("INFO");
    });

    it("should log warn messages", () => {
      logger.warn("Warning message");
      expect(stderrSpy).toHaveBeenCalled();
      expect(stderrSpy.mock.calls[0][0]).toContain("WARN");
    });

    it("should log error messages", () => {
      logger.error("Error message");
      expect(stderrSpy).toHaveBeenCalled();
      expect(stderrSpy.mock.calls[0][0]).toContain("ERROR");
    });

    it("should log fatal messages", () => {
      logger.fatal("Fatal message");
      expect(stderrSpy).toHaveBeenCalled();
      expect(stderrSpy.mock.calls[0][0]).toContain("FATAL");
    });

    it("should filter messages below minimum level", () => {
      logger.setLevel("warn");
      logger.debug("Debug message");
      logger.info("Info message");
      expect(stderrSpy).not.toHaveBeenCalled();

      logger.warn("Warning message");
      expect(stderrSpy).toHaveBeenCalled();
    });
  });

  describe("Structured Output", () => {
    it("should output JSON when structured output is enabled", () => {
      logger.setStructuredOutput(true);
      logger.info("Test message");

      const output = stderrSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output.trim());

      expect(parsed.level).toBe("info");
      expect(parsed.message).toBe("Test message");
      expect(parsed.component).toBe("test");
      expect(parsed.timestamp).toBeDefined();
    });

    it("should output human-readable format when structured output is disabled", () => {
      logger.setStructuredOutput(false);
      logger.info("Test message");

      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("INFO");
      expect(output).toContain("[test]");
      expect(output).toContain("Test message");
    });
  });

  describe("Context and Metadata", () => {
    it("should include operation in log output", () => {
      logger.info("Test message", { operation: "test.operation" });
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("test.operation");
    });

    it("should include trace ID in log output", () => {
      logger.info("Test message", { traceId: "trace-123" });
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("trace-123");
    });

    it("should include context in log output", () => {
      logger.info("Test message", { context: { key: "value" } });
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("key");
      expect(output).toContain("value");
    });

    it("should include duration in log output", () => {
      logger.info("Test message", { durationMs: 150 });
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("150ms");
    });

    it("should include error details in log output", () => {
      const error = new Error("Test error");
      logger.error("Error occurred", { error });
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("Test error");
    });
  });

  describe("Child Logger", () => {
    it("should create child logger with additional context", () => {
      const child = logger.child({ component: "child-component" });
      child.info("Child message");

      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("child-component");
    });

    it("should inherit parent settings", () => {
      logger.setLevel("error");
      const child = logger.child({ component: "child" });
      child.info("Should not appear");
      expect(stderrSpy).not.toHaveBeenCalled();

      child.error("Should appear");
      expect(stderrSpy).toHaveBeenCalled();
    });

    it("should merge context from parent and child", () => {
      const parent = new StructuredLogger({
        minLevel: "debug",
        structuredOutput: true,
        defaultContext: { parentKey: "parentValue" },
      });
      const child = parent.child({ context: { childKey: "childValue" } });
      child.info("Test");

      const output = stderrSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output.trim());
      expect(parsed.context.parentKey).toBe("parentValue");
      expect(parsed.context.childKey).toBe("childValue");
    });
  });

  describe("Configuration", () => {
    it("should get and set log level", () => {
      expect(logger.getLevel()).toBe("debug");
      logger.setLevel("error");
      expect(logger.getLevel()).toBe("error");
    });

    it("should get and set structured output", () => {
      expect(logger.isStructuredOutput()).toBe(false);
      logger.setStructuredOutput(true);
      expect(logger.isStructuredOutput()).toBe(true);
    });
  });
});
