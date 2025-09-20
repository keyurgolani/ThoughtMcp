#!/usr/bin/env node

/**
 * Entry point for the Cognitive MCP Server
 */

import { CognitiveMCPServer } from "./server/CognitiveMCPServer.js";

// Export the main components for library usage
export * from "./cognitive/index.js";
export { CognitiveMCPServer } from "./server/CognitiveMCPServer.js";
export * from "./types/index.js";
export * from "./utils/index.js";

async function main(): Promise<void> {
  try {
    const server = new CognitiveMCPServer();
    await server.initialize();

    // Keep the process running
    process.stdin.resume();
  } catch (error) {
    console.error("Failed to start Cognitive MCP Server:", error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
  });

  main().catch((error) => {
    console.error("Main function error:", error);
    process.exit(1);
  });
}
