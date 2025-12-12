/**
 * ToolRegistry Unit Tests
 *
 * Tests for the MCP tool registry that manages registration and discovery of tools.
 *
 * Requirements: 2.1
 */

import { beforeEach, describe, expect, it } from "vitest";

import { ToolRegistry } from "../../../server/tool-registry.js";
import type { MCPTool } from "../../../server/types.js";

/**
 * Creates a valid mock tool for testing
 */
function createMockTool(name: string, overrides: Partial<MCPTool> = {}): MCPTool {
  return {
    name,
    description: `Mock tool: ${name}`,
    inputSchema: {
      type: "object",
      properties: {
        param1: { type: "string" },
      },
    },
    handler: async () => ({ success: true }),
    ...overrides,
  };
}

describe("ToolRegistry", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe("Tool Registration", () => {
    it("should register a valid tool", () => {
      const tool = createMockTool("test_tool");

      registry.registerTool(tool);

      expect(registry.getTool("test_tool")).toBeDefined();
      expect(registry.getTool("test_tool")?.name).toBe("test_tool");
    });

    it("should register multiple tools", () => {
      const tool1 = createMockTool("tool1");
      const tool2 = createMockTool("tool2");
      const tool3 = createMockTool("tool3");

      registry.registerTool(tool1);
      registry.registerTool(tool2);
      registry.registerTool(tool3);

      expect(registry.getToolCount()).toBe(3);
      expect(registry.getTool("tool1")).toBeDefined();
      expect(registry.getTool("tool2")).toBeDefined();
      expect(registry.getTool("tool3")).toBeDefined();
    });

    it("should prevent duplicate tool registration", () => {
      const tool = createMockTool("duplicate_tool");

      registry.registerTool(tool);

      expect(() => registry.registerTool(tool)).toThrow("Tool already registered: duplicate_tool");
    });

    it("should complete tool registration within 1 second", () => {
      const tool = createMockTool("performance_tool");

      const startTime = Date.now();
      registry.registerTool(tool);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe("Tool Schema Validation", () => {
    it("should reject tool without name", () => {
      const invalidTool = {
        description: "Test tool",
        inputSchema: { type: "object", properties: {} },
        handler: async () => ({ success: true }),
      } as unknown as MCPTool;

      expect(() => registry.registerTool(invalidTool)).toThrow("Invalid tool schema");
    });

    it("should reject tool with non-string name", () => {
      const invalidTool = {
        name: 123,
        description: "Test tool",
        inputSchema: { type: "object", properties: {} },
        handler: async () => ({ success: true }),
      } as unknown as MCPTool;

      expect(() => registry.registerTool(invalidTool)).toThrow("Invalid tool schema");
    });

    it("should reject tool without description", () => {
      const invalidTool = {
        name: "test_tool",
        inputSchema: { type: "object", properties: {} },
        handler: async () => ({ success: true }),
      } as unknown as MCPTool;

      expect(() => registry.registerTool(invalidTool)).toThrow("Invalid tool schema");
    });

    it("should reject tool without inputSchema", () => {
      const invalidTool = {
        name: "test_tool",
        description: "Test tool",
        handler: async () => ({ success: true }),
      } as unknown as MCPTool;

      expect(() => registry.registerTool(invalidTool)).toThrow("Invalid tool schema");
    });

    it("should reject tool with invalid inputSchema type", () => {
      const invalidTool = {
        name: "test_tool",
        description: "Test tool",
        inputSchema: { type: "array", properties: {} },
        handler: async () => ({ success: true }),
      } as unknown as MCPTool;

      expect(() => registry.registerTool(invalidTool)).toThrow("Invalid tool schema");
    });

    it("should reject tool without inputSchema properties", () => {
      const invalidTool = {
        name: "test_tool",
        description: "Test tool",
        inputSchema: { type: "object" },
        handler: async () => ({ success: true }),
      } as unknown as MCPTool;

      expect(() => registry.registerTool(invalidTool)).toThrow("Invalid tool schema");
    });

    it("should reject tool without handler", () => {
      const invalidTool = {
        name: "test_tool",
        description: "Test tool",
        inputSchema: { type: "object", properties: {} },
      } as unknown as MCPTool;

      expect(() => registry.registerTool(invalidTool)).toThrow("Invalid tool schema");
    });

    it("should reject tool with non-function handler", () => {
      const invalidTool = {
        name: "test_tool",
        description: "Test tool",
        inputSchema: { type: "object", properties: {} },
        handler: "not a function",
      } as unknown as MCPTool;

      expect(() => registry.registerTool(invalidTool)).toThrow("Invalid tool schema");
    });

    it("should accept tool with valid schema", () => {
      const validTool: MCPTool = {
        name: "valid_tool",
        description: "A valid tool",
        inputSchema: {
          type: "object",
          properties: {
            param1: { type: "string" },
            param2: { type: "number" },
          },
          required: ["param1"],
        },
        handler: async () => ({ success: true }),
      };

      expect(() => registry.registerTool(validTool)).not.toThrow();
      expect(registry.getTool("valid_tool")).toBeDefined();
    });
  });

  describe("Tool Discovery", () => {
    it("should return undefined for non-existent tool", () => {
      expect(registry.getTool("nonexistent")).toBeUndefined();
    });

    it("should return all registered tools", () => {
      registry.registerTool(createMockTool("tool1"));
      registry.registerTool(createMockTool("tool2"));
      registry.registerTool(createMockTool("tool3"));

      const allTools = registry.getAllTools();

      expect(allTools).toHaveLength(3);
      expect(allTools.map((t) => t.name)).toContain("tool1");
      expect(allTools.map((t) => t.name)).toContain("tool2");
      expect(allTools.map((t) => t.name)).toContain("tool3");
    });

    it("should return empty array when no tools registered", () => {
      const allTools = registry.getAllTools();

      expect(allTools).toHaveLength(0);
    });

    it("should return correct tool count", () => {
      expect(registry.getToolCount()).toBe(0);

      registry.registerTool(createMockTool("tool1"));
      expect(registry.getToolCount()).toBe(1);

      registry.registerTool(createMockTool("tool2"));
      expect(registry.getToolCount()).toBe(2);
    });
  });

  describe("Registry Management", () => {
    it("should clear all tools", () => {
      registry.registerTool(createMockTool("tool1"));
      registry.registerTool(createMockTool("tool2"));

      expect(registry.getToolCount()).toBe(2);

      registry.clear();

      expect(registry.getToolCount()).toBe(0);
      expect(registry.getTool("tool1")).toBeUndefined();
      expect(registry.getTool("tool2")).toBeUndefined();
    });

    it("should allow re-registration after clear", () => {
      const tool = createMockTool("reusable_tool");

      registry.registerTool(tool);
      registry.clear();

      expect(() => registry.registerTool(tool)).not.toThrow();
      expect(registry.getTool("reusable_tool")).toBeDefined();
    });
  });

  describe("Tool Handler Execution", () => {
    it("should store handler that can be executed", async () => {
      const handler = async (params: unknown) => ({
        success: true,
        data: { received: params as Record<string, unknown> },
      });

      const tool = createMockTool("executable_tool", { handler });
      registry.registerTool(tool);

      const registeredTool = registry.getTool("executable_tool");
      const result = await registeredTool?.handler({ test: "value" });

      expect(result?.success).toBe(true);
      expect((result?.data as { received: Record<string, unknown> }).received).toEqual({
        test: "value",
      });
    });

    it("should preserve handler context", async () => {
      let handlerCalled = false;
      const handler = async () => {
        handlerCalled = true;
        return { success: true };
      };

      const tool = createMockTool("context_tool", { handler });
      registry.registerTool(tool);

      const registeredTool = registry.getTool("context_tool");
      await registeredTool?.handler({});

      expect(handlerCalled).toBe(true);
    });
  });
});
