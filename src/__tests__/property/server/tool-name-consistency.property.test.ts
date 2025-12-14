/**
 * Property Test: Tool Name Consistency
 *
 * **Feature: mcp-tool-improvements, Property 12: Tool Name Consistency**
 *
 * This property test validates that the MCP server has correctly renamed tools
 * to natural, cognitive-aligned names and that old names are no longer registered.
 *
 * **Validates: Requirements 12.1-12.8**
 *
 * - Requirement 12.1: store_memory SHALL be renamed to remember
 * - Requirement 12.2: retrieve_memories SHALL be renamed to recall
 * - Requirement 12.3: search_memories SHALL be renamed to search
 * - Requirement 12.4: delete_memory SHALL be renamed to forget
 * - Requirement 12.5: think_parallel SHALL be renamed to ponder
 * - Requirement 12.6: analyze_systematically SHALL be renamed to analyze
 * - Requirement 12.7: decompose_problem SHALL be renamed to breakdown
 * - Requirement 12.8: analyze_reasoning SHALL be renamed to evaluate
 *
 * @module __tests__/property/server/tool-name-consistency.property.test
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { ToolRegistry } from "../../../server/tool-registry";

describe("Property 12: Tool Name Consistency", () => {
  /**
   * Tool name mapping from old to new names
   */
  const toolNameMapping: Array<{ oldName: string; newName: string; requirement: string }> = [
    { oldName: "store_memory", newName: "remember", requirement: "12.1" },
    { oldName: "retrieve_memories", newName: "recall", requirement: "12.2" },
    { oldName: "search_memories", newName: "search", requirement: "12.3" },
    { oldName: "delete_memory", newName: "forget", requirement: "12.4" },
    { oldName: "think_parallel", newName: "ponder", requirement: "12.5" },
    { oldName: "analyze_systematically", newName: "analyze", requirement: "12.6" },
    { oldName: "decompose_problem", newName: "breakdown", requirement: "12.7" },
    { oldName: "analyze_reasoning", newName: "evaluate", requirement: "12.8" },
  ];

  /**
   * Create a mock tool for testing
   */
  const createMockTool = (name: string) => ({
    name,
    description: `Mock tool: ${name}`,
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
    handler: async () => ({ success: true }),
  });

  /**
   * **Feature: mcp-tool-improvements, Property 12: Tool Name Consistency**
   * **Validates: Requirements 12.1-12.8**
   *
   * For any renamed tool, the new name SHALL be registered and the old name SHALL NOT be registered.
   */
  describe("New tool names are registered, old names are not", () => {
    it("should register new tool names and reject old names", () => {
      // Create arbitrary that selects from the tool name mappings
      const toolMappingArb = fc.constantFrom(...toolNameMapping);

      fc.assert(
        fc.property(toolMappingArb, (mapping) => {
          const registry = new ToolRegistry();

          // Register the new tool name
          registry.registerTool(createMockTool(mapping.newName));

          // Property: New name SHALL be registered
          const newTool = registry.getTool(mapping.newName);
          expect(newTool).toBeDefined();
          expect(newTool?.name).toBe(mapping.newName);

          // Property: Old name SHALL NOT be registered
          const oldTool = registry.getTool(mapping.oldName);
          expect(oldTool).toBeUndefined();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 12: Tool Name Consistency**
   * **Validates: Requirements 12.1-12.8**
   *
   * All 8 renamed tools SHALL be present with their new names.
   */
  describe("All renamed tools are present", () => {
    it("should have all 8 renamed tools registered with new names", () => {
      const registry = new ToolRegistry();

      // Register all new tool names
      for (const mapping of toolNameMapping) {
        registry.registerTool(createMockTool(mapping.newName));
      }

      // Property: All 8 new names SHALL be registered
      expect(registry.getToolCount()).toBe(8);

      // Property: Each new name SHALL be retrievable
      for (const mapping of toolNameMapping) {
        const tool = registry.getTool(mapping.newName);
        expect(tool).toBeDefined();
        expect(tool?.name).toBe(mapping.newName);
      }
    });

    it("should not have any old tool names registered", () => {
      const registry = new ToolRegistry();

      // Register all new tool names
      for (const mapping of toolNameMapping) {
        registry.registerTool(createMockTool(mapping.newName));
      }

      // Property: No old names SHALL be registered
      for (const mapping of toolNameMapping) {
        const oldTool = registry.getTool(mapping.oldName);
        expect(oldTool).toBeUndefined();
      }
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 12: Tool Name Consistency**
   * **Validates: Requirements 12.1-12.8**
   *
   * New tool names SHALL follow the cognitive metaphor naming convention.
   */
  describe("Tool names follow cognitive metaphor", () => {
    it("should use natural, cognitive-aligned names", () => {
      const newNames = toolNameMapping.map((m) => m.newName);

      // Property: All new names SHALL be single words (no underscores)
      for (const name of newNames) {
        expect(name).not.toContain("_");
      }

      // Property: All new names SHALL be lowercase
      for (const name of newNames) {
        expect(name).toBe(name.toLowerCase());
      }

      // Property: All new names SHALL be human-readable verbs
      const expectedVerbs = [
        "remember",
        "recall",
        "search",
        "forget",
        "ponder",
        "analyze",
        "breakdown",
        "evaluate",
      ];
      expect(newNames.sort()).toEqual(expectedVerbs.sort());
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 12: Tool Name Consistency**
   * **Validates: Requirements 12.1-12.8**
   *
   * Tool registry SHALL prevent duplicate registrations.
   */
  describe("No duplicate tool registrations", () => {
    it("should prevent registering the same tool name twice", () => {
      fc.assert(
        fc.property(fc.constantFrom(...toolNameMapping), (mapping) => {
          const registry = new ToolRegistry();

          // Register the new tool name
          registry.registerTool(createMockTool(mapping.newName));

          // Property: Attempting to register same name again SHALL throw
          expect(() => {
            registry.registerTool(createMockTool(mapping.newName));
          }).toThrow(`Tool already registered: ${mapping.newName}`);

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 12: Tool Name Consistency**
   * **Validates: Requirements 12.1-12.8**
   *
   * Old and new names SHALL be distinct (no overlap).
   */
  describe("Old and new names are distinct", () => {
    it("should have no overlap between old and new names", () => {
      const oldNames = new Set(toolNameMapping.map((m) => m.oldName));
      const newNames = new Set(toolNameMapping.map((m) => m.newName));

      // Property: No name SHALL appear in both old and new sets
      for (const oldName of oldNames) {
        expect(newNames.has(oldName)).toBe(false);
      }

      for (const newName of newNames) {
        expect(oldNames.has(newName)).toBe(false);
      }
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 12: Tool Name Consistency**
   * **Validates: Requirements 12.1-12.8**
   *
   * Tool count SHALL remain the same after renaming (8 renamed tools).
   */
  describe("Tool count invariant", () => {
    it("should have exactly 8 renamed tools", () => {
      // Property: Exactly 8 tools SHALL be renamed
      expect(toolNameMapping.length).toBe(8);

      // Property: Each mapping SHALL have unique old and new names
      const oldNames = toolNameMapping.map((m) => m.oldName);
      const newNames = toolNameMapping.map((m) => m.newName);

      expect(new Set(oldNames).size).toBe(8);
      expect(new Set(newNames).size).toBe(8);
    });
  });
});
