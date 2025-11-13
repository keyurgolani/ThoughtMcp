#!/usr/bin/env node

/**
 * ThoughtMCP Cognitive Architecture - Entry Point
 *
 * Minimal MCP server stub for the complete rebuild.
 * Implementation will be added following TDD principles in subsequent phases.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "./utils/logger.js";

// Placeholder for future exports
export const VERSION = "2.0.0-rebuild";

// Export embeddings module
export * from "./embeddings/index.js";

async function main(): Promise<void> {
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

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "placeholder",
          description: "Placeholder tool - cognitive architecture rebuild in progress",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "placeholder") {
      return {
        content: [
          {
            type: "text",
            text: "ThoughtMCP Cognitive Architecture v2.0.0 - Rebuild in progress. Implementation will be added following TDD principles.",
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  Logger.info("ThoughtMCP Cognitive Architecture v2.0.0 started");
  Logger.info("Complete rebuild in progress...");
}

// Only run main if this file is executed directly
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1]?.endsWith("index.js") ?? false) ||
  (process.argv[1]?.includes("thoughtmcp") ?? false);

if (isMainModule) {
  main().catch((error) => {
    Logger.error("Error:", error);
    process.exit(1);
  });
}
