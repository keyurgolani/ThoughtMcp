#!/usr/bin/env node

/**
 * Thought Cognitive Architecture - Entry Point
 *
 * MCP server that integrates all cognitive components:
 * - HMD Memory System with 5-sector embeddings
 * - Parallel Reasoning Streams
 * - Dynamic Framework Selection
 * - Confidence Calibration
 * - Bias Detection and Mitigation
 * - Emotion Detection
 * - Metacognitive Monitoring
 * - Memory Consolidation Scheduler (Requirements: 7.1)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { CognitiveMCPServer } from "./server/mcp-server.js";
import { Logger } from "./utils/logger.js";

export const VERSION = "0.6.0";

// Export modules for programmatic use
export * from "./embeddings/index.js";
export * from "./security/index.js";
export { CognitiveMCPServer } from "./server/mcp-server.js";

// Track if shutdown is in progress to prevent multiple shutdown attempts
let isShuttingDown = false;

/**
 * Setup graceful shutdown handlers for SIGINT and SIGTERM signals
 *
 * Requirements: 7.1 - Graceful shutdown handling for consolidation scheduler
 *
 * @param cognitiveServer - The cognitive server instance to shutdown
 */
function setupGracefulShutdown(cognitiveServer: CognitiveMCPServer): void {
  const handleShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      Logger.debug(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    isShuttingDown = true;
    Logger.info(`Received ${signal}, initiating graceful shutdown...`);

    try {
      // Shutdown the cognitive server (stops consolidation scheduler and cleans up resources)
      await cognitiveServer.shutdown();
      Logger.info("Graceful shutdown complete");
      process.exit(0);
    } catch (error) {
      Logger.error("Error during graceful shutdown:", error);
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on("SIGINT", () => {
    void handleShutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void handleShutdown("SIGTERM");
  });

  Logger.debug("Graceful shutdown handlers registered");
}

/**
 * Start the consolidation scheduler if available
 *
 * Requirements: 7.1 - Start consolidation scheduler on server init
 *
 * @param cognitiveServer - The cognitive server instance
 */
function startConsolidationScheduler(cognitiveServer: CognitiveMCPServer): void {
  if (cognitiveServer.consolidationScheduler) {
    cognitiveServer.consolidationScheduler.start();
    Logger.info("Consolidation scheduler started");
  } else {
    Logger.warn("Consolidation scheduler not available, skipping scheduler start");
  }
}

async function main(): Promise<void> {
  // Create and initialize the cognitive server
  const cognitiveServer = new CognitiveMCPServer();

  // Setup graceful shutdown handlers early
  setupGracefulShutdown(cognitiveServer);

  try {
    await cognitiveServer.initialize();

    // Start the consolidation scheduler after successful initialization
    // Requirements: 7.1 - Cron-based scheduling (default: daily at 3 AM)
    startConsolidationScheduler(cognitiveServer);
  } catch (error) {
    Logger.error("Failed to initialize cognitive server:", error);
    Logger.warn("Starting in degraded mode with limited functionality");
  }

  // Create MCP SDK server
  const server = new Server(
    {
      name: "thought",
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

  Logger.info(`Thought Cognitive Architecture v${VERSION} started`);
  Logger.info(`Registered ${cognitiveServer.toolRegistry.getToolCount()} tools`);
}

// Run main if executed directly
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1]?.endsWith("index.js") ?? false) ||
  (process.argv[1]?.includes("thought") ?? false);

if (isMainModule) {
  main().catch((error) => {
    Logger.error("Fatal error:", error);
    process.exit(1);
  });
}
