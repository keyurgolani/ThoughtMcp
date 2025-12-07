#!/usr/bin/env node

/**
 * ThoughtMCP Cognitive Architecture - Entry Point
 *
 * MCP server that integrates all cognitive components:
 * - HMD Memory System with 5-sector embeddings
 * - Parallel Reasoning Streams
 * - Dynamic Framework Selection
 * - Confidence Calibration
 * - Bias Detection and Mitigation
 * - Emotion Detection
 * - Metacognitive Monitoring
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { CognitiveMCPServer } from "./server/mcp-server.js";
import { Logger } from "./utils/logger.js";

export const VERSION = "0.5.0";

// Export modules for programmatic use
export * from "./embeddings/index.js";
export * from "./security/index.js";
export { CognitiveMCPServer } from "./server/mcp-server.js";

async function main(): Promise<void> {
  // Create and initialize the cognitive server
  const cognitiveServer = new CognitiveMCPServer();

  try {
    await cognitiveServer.initialize();
  } catch (error) {
    Logger.error("Failed to initialize cognitive server:", error);
    Logger.warn("Starting in degraded mode with limited functionality");
  }

  // Create MCP SDK server
  const server = new Server(
    {
      name: "thoughtmcp",
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools from the cognitive server
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = cognitiveServer.toolRegistry.getAllTools();

    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Handle tool calls by delegating to the cognitive server
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const tool = cognitiveServer.toolRegistry.getTool(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await tool.handler(args ?? {});

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : "Tool execution failed",
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  Logger.info(`ThoughtMCP Cognitive Architecture v${VERSION} started`);
  Logger.info(`Registered ${cognitiveServer.toolRegistry.getToolCount()} tools`);
}

// Run main if executed directly
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1]?.endsWith("index.js") ?? false) ||
  (process.argv[1]?.includes("thoughtmcp") ?? false);

if (isMainModule) {
  main().catch((error) => {
    Logger.error("Fatal error:", error);
    process.exit(1);
  });
}
