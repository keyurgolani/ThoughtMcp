/**
 * Test helper functions for common test patterns
 */

import { CognitiveMCPServer } from "../../server/CognitiveMCPServer.js";
import { TestCleanup } from "./testCleanup.js";

/**
 * Create a test server with automatic cleanup
 */
export async function createTestServer(): Promise<CognitiveMCPServer> {
  await TestCleanup.createTempBrainDir();
  const server = new CognitiveMCPServer();
  await server.initialize(true); // Initialize in test mode
  return server;
}

/**
 * Setup test environment with brain directory
 */
export async function setupTestBrainDir(): Promise<string> {
  return await TestCleanup.createTempBrainDir();
}

/**
 * Create test memory file path
 */
export function createTestMemoryPath(): string {
  return TestCleanup.getTestFilePath("test-memory", ".json");
}

/**
 * Create test data directory
 */
export async function createTestDataDir(): Promise<string> {
  const testDir = await TestCleanup.createTempDir("./tmp");
  return testDir;
}

/**
 * Standard afterEach cleanup for cognitive tests
 */
export async function standardTestCleanup(
  server?: CognitiveMCPServer
): Promise<void> {
  if (server?.isInitialized()) {
    await server.shutdown();
  }
  await TestCleanup.cleanup();
}
