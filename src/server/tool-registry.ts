/**
 * Tool Registry
 *
 * Manages registration and discovery of MCP tools.
 */

import type { MCPTool } from "./types";

/**
 * Registry for MCP tools
 */
export class ToolRegistry {
  private tools: Map<string, MCPTool>;

  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a new tool
   *
   * @param tool - Tool to register
   * @throws Error if tool already registered or schema invalid
   */
  registerTool(tool: MCPTool): void {
    // Validate tool schema
    if (!this.validateToolSchema(tool)) {
      throw new Error("Invalid tool schema");
    }

    // Check for duplicates
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    // Register tool
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   *
   * @param name - Tool name
   * @returns Tool or undefined if not found
   */
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   *
   * @returns Array of all tools
   */
  getAllTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Validate tool schema
   *
   * @param tool - Tool to validate
   * @returns True if valid, false otherwise
   */
  validateToolSchema(tool: MCPTool): boolean {
    // Check required fields
    if (!tool.name || typeof tool.name !== "string") {
      return false;
    }

    if (!tool.description || typeof tool.description !== "string") {
      return false;
    }

    if (!tool.inputSchema || typeof tool.inputSchema !== "object") {
      return false;
    }

    if (!tool.handler || typeof tool.handler !== "function") {
      return false;
    }

    // Validate input schema structure
    if (tool.inputSchema.type !== "object") {
      return false;
    }

    if (!tool.inputSchema.properties || typeof tool.inputSchema.properties !== "object") {
      return false;
    }

    return true;
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get tool count
   *
   * @returns Number of registered tools
   */
  getToolCount(): number {
    return this.tools.size;
  }
}
