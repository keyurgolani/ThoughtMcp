/**
 * MCP Validation Errors Integration Tests
 *
 * Tests validation error responses through MCP tool calls.
 * Verifies field-level details in responses and proper error formatting.
 *
 * Requirements: 4.2 (MCP Interface validation)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CognitiveMCPServer } from "../../server/mcp-server.js";

// Mock all dependencies
vi.mock("../../memory/memory-repository.js");
vi.mock("../../reasoning/orchestrator.js");
vi.mock("../../framework/framework-selector.js");
vi.mock("../../confidence/multi-dimensional-assessor.js");
vi.mock("../../bias/bias-pattern-recognizer.js");
vi.mock("../../emotion/circumplex-analyzer.js");
vi.mock("../../metacognitive/performance-monitoring-system.js");
vi.mock("../../database/connection-manager.js");
vi.mock("../../embeddings/embedding-engine.js");
vi.mock("../../utils/logger.js", () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("MCP Validation Errors Integration", () => {
  let server: CognitiveMCPServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    server = new CognitiveMCPServer();

    // Initialize server with mocked components
    vi.spyOn(server as any, "initializeComponents").mockImplementation(async () => {
      server.memoryRepository = {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        search: vi.fn(),
        batchCreate: vi.fn(),
        batchRetrieve: vi.fn(),
        batchDelete: vi.fn(),
      } as any;
      server.reasoningOrchestrator = {} as any;
      server.frameworkSelector = {} as any;
      server.confidenceAssessor = {} as any;
      server.evidenceExtractor = {} as any;
      server.biasDetector = {} as any;
      server.emotionAnalyzer = {} as any;
      server.performanceMonitor = {} as any;
      server.healthMonitor = {} as any;
      server.pruningService = {} as any;
      server.consolidationEngine = {} as any;
      server.exportImportService = {} as any;
      (server as any).databaseManager = {
        healthCheck: vi.fn().mockResolvedValue(true),
      };
    });

    await server.initialize();
  });

  afterEach(async () => {
    if (server?.isInitialized) {
      try {
        await server.shutdown();
      } catch {
        // Ignore errors during cleanup
      }
    }
    vi.clearAllMocks();
  });

  describe("validateToolInput method", () => {
    it("should return valid result for correct input", () => {
      const result = server.validateToolInput<{ userId: string }>("memory_health", {
        userId: "user-123",
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.userId).toBe("user-123");
      }
    });

    it("should return structured error for missing required field", () => {
      const result = server.validateToolInput<{ userId: string }>("memory_health", {});

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.success).toBe(false);
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.fieldErrors).toBeDefined();
        expect(result.error.fieldErrors.length).toBeGreaterThan(0);
        expect(result.error.fieldErrors[0].path).toBe("userId");
      }
    });

    it("should return structured error for invalid enum value", () => {
      const result = server.validateToolInput<{ userId: string; primarySector: string }>(
        "remember",
        {
          content: "Test content that is long enough",
          userId: "user-123",
          sessionId: "session-456",
          primarySector: "invalid_sector",
        }
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.success).toBe(false);
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.fieldErrors.some((e) => e.path === "primarySector")).toBe(true);
      }
    });

    it("should return structured error for string too short", () => {
      const result = server.validateToolInput<{ content: string }>("remember", {
        content: "short", // Less than 10 characters
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.success).toBe(false);
        expect(result.error.fieldErrors.some((e) => e.path === "content")).toBe(true);
      }
    });

    it("should return structured error for number out of range", () => {
      const result = server.validateToolInput<{ minStrength: number }>("recall", {
        userId: "user-123",
        minStrength: 1.5, // Greater than 1
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.success).toBe(false);
        expect(result.error.fieldErrors.some((e) => e.path === "minStrength")).toBe(true);
      }
    });

    it("should skip validation for tools without registered schemas", () => {
      const result = server.validateToolInput<{ anyField: string }>("unregistered_tool", {
        anyField: "any value",
      });

      // Should pass validation (backward compatibility)
      expect(result.valid).toBe(true);
    });
  });

  describe("Tool execution with validation errors", () => {
    it("should return validation error for search tool with invalid parameters", async () => {
      const result = await server.executeTool("search", {
        // Missing required userId
        text: "search query",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // The error should contain field-level details
      expect(result.error).toContain("userId");
    });

    it("should return validation error for batch_remember with empty memories array", async () => {
      const result = await server.executeTool("batch_remember", {
        userId: "user-123",
        sessionId: "session-456",
        memories: [], // Empty array - should fail validation
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return validation error for batch_recall with empty memoryIds", async () => {
      const result = await server.executeTool("batch_recall", {
        userId: "user-123",
        memoryIds: [], // Empty array - should fail validation
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return validation error for prune_memories with invalid action", async () => {
      const result = await server.executeTool("prune_memories", {
        userId: "user-123",
        action: "invalid_action", // Invalid enum value
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Field-level error details in MCP responses", () => {
    it("should include path in field errors", () => {
      const result = server.validateToolInput("remember", {
        content: "short",
        userId: "",
        sessionId: "",
        primarySector: "invalid",
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        // All field errors should have a path
        result.error.fieldErrors.forEach((fieldError) => {
          expect(fieldError.path).toBeDefined();
          expect(typeof fieldError.path).toBe("string");
        });
      }
    });

    it("should include message in field errors", () => {
      const result = server.validateToolInput("remember", {
        content: "short",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        result.error.fieldErrors.forEach((fieldError) => {
          expect(fieldError.message).toBeDefined();
          expect(typeof fieldError.message).toBe("string");
          expect(fieldError.message.length).toBeGreaterThan(0);
        });
      }
    });

    it("should include code in field errors", () => {
      const result = server.validateToolInput("remember", {
        content: "short",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        result.error.fieldErrors.forEach((fieldError) => {
          expect(fieldError.code).toBeDefined();
          expect(typeof fieldError.code).toBe("string");
        });
      }
    });

    it("should include expected constraint in field errors", () => {
      const result = server.validateToolInput("remember", {
        content: "short",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        result.error.fieldErrors.forEach((fieldError) => {
          expect(fieldError.expected).toBeDefined();
        });
      }
    });

    it("should include suggestion in field errors", () => {
      const result = server.validateToolInput("remember", {
        content: "short",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        result.error.fieldErrors.forEach((fieldError) => {
          expect(fieldError.suggestion).toBeDefined();
          expect(typeof fieldError.suggestion).toBe("string");
        });
      }
    });
  });

  describe("Multiple validation errors aggregation", () => {
    it("should collect all field errors without short-circuiting", () => {
      const result = server.validateToolInput("remember", {
        content: "short", // Too short
        userId: "", // Empty string
        sessionId: "", // Empty string
        primarySector: "invalid", // Invalid enum
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        // Should have multiple errors, not just the first one
        expect(result.error.fieldErrors.length).toBeGreaterThan(1);
      }
    });

    it("should include errors for nested fields", () => {
      const result = server.validateToolInput("remember", {
        content: "Valid content that is long enough",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
        metadata: {
          importance: 2.0, // Out of range (should be 0-1)
        },
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        // Should have error for nested metadata.importance field
        const importanceError = result.error.fieldErrors.find(
          (e) => e.path === "metadata.importance" || e.path.includes("importance")
        );
        expect(importanceError).toBeDefined();
      }
    });
  });

  describe("MCP response structure (Requirements 4.2)", () => {
    it("should always include success: false for validation errors", () => {
      const result = server.validateToolInput("memory_health", {});

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.success).toBe(false);
      }
    });

    it("should always include code: VALIDATION_ERROR", () => {
      const result = server.validateToolInput("memory_health", {});

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should always include error message", () => {
      const result = server.validateToolInput("memory_health", {});

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.error).toBeDefined();
        expect(typeof result.error.error).toBe("string");
      }
    });

    it("should always include suggestion", () => {
      const result = server.validateToolInput("memory_health", {});

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.suggestion).toBeDefined();
        expect(typeof result.error.suggestion).toBe("string");
      }
    });

    it("should always include fieldErrors array", () => {
      const result = server.validateToolInput("memory_health", {});

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(Array.isArray(result.error.fieldErrors)).toBe(true);
      }
    });
  });
});
