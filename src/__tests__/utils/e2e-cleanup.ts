/**
 * E2E Test Cleanup Utilities
 *
 * Provides utilities for cleaning up test data in E2E tests.
 * Each test should clean up its own data to ensure isolation.
 *
 * Requirements: 13.3
 * - Each test should clean up its own data in afterEach
 * - Use unique user IDs and session IDs per test
 * - Verify database is in clean state after test suite
 */

import type { PoolClient } from "pg";

/**
 * Test context for tracking test-specific data that needs cleanup.
 */
export interface E2ETestContext {
  userId: string;
  sessionId: string;
  memoryIds: string[];
  testStartTime: Date;
}

/**
 * Creates a new E2E test context with unique identifiers.
 * Uses a counter-based approach for deterministic, unique IDs.
 *
 * @param testName - Name of the test for identification
 * @returns E2E test context with unique identifiers
 */
let testCounter = 0;

export function createE2ETestContext(testName: string): E2ETestContext {
  testCounter++;
  const timestamp = Date.now();
  const sanitizedName = testName.replace(/[^a-zA-Z0-9]/g, "-").substring(0, 20);

  return {
    userId: `e2e-user-${testCounter}-${timestamp}`,
    sessionId: `e2e-session-${testCounter}-${timestamp}-${sanitizedName}`,
    memoryIds: [],
    testStartTime: new Date(),
  };
}

/**
 * Resets the test counter. Call this in global setup if needed.
 */
export function resetTestCounter(): void {
  testCounter = 0;
}

/**
 * Tracks a memory ID for cleanup.
 *
 * @param context - E2E test context
 * @param memoryId - Memory ID to track
 */
export function trackMemoryId(context: E2ETestContext, memoryId: string): void {
  context.memoryIds.push(memoryId);
}

/**
 * Cleans up all test data for a specific user.
 * This is the primary cleanup method - removes all data associated with a user ID.
 *
 * @param client - Database client
 * @param userId - User ID to clean up
 * @returns Promise resolving when cleanup is complete
 */
export async function cleanupUserData(client: PoolClient, userId: string): Promise<void> {
  // Delete in order respecting foreign key constraints
  // 1. Delete memory_links (references memories)
  await client.query(
    "DELETE FROM memory_links WHERE source_id IN (SELECT id FROM memories WHERE user_id = $1)",
    [userId]
  );

  // 2. Delete memory_connections (references memories)
  await client.query(
    "DELETE FROM memory_connections WHERE source_id IN (SELECT id FROM memories WHERE user_id = $1)",
    [userId]
  );

  // 3. Delete memory_metadata (references memories)
  await client.query(
    "DELETE FROM memory_metadata WHERE memory_id IN (SELECT id FROM memories WHERE user_id = $1)",
    [userId]
  );

  // 4. Delete memory_embeddings (references memories)
  await client.query(
    "DELETE FROM memory_embeddings WHERE memory_id IN (SELECT id FROM memories WHERE user_id = $1)",
    [userId]
  );

  // 5. Delete memories
  await client.query("DELETE FROM memories WHERE user_id = $1", [userId]);
}

/**
 * Cleans up specific memories by ID.
 * Use this when you need to clean up specific memories rather than all user data.
 *
 * @param client - Database client
 * @param memoryIds - Array of memory IDs to clean up
 * @returns Promise resolving when cleanup is complete
 */
export async function cleanupMemories(client: PoolClient, memoryIds: string[]): Promise<void> {
  if (memoryIds.length === 0) return;

  // Delete in order respecting foreign key constraints
  // 1. Delete memory_links
  await client.query("DELETE FROM memory_links WHERE source_id = ANY($1) OR target_id = ANY($1)", [
    memoryIds,
  ]);

  // 2. Delete memory_connections
  await client.query(
    "DELETE FROM memory_connections WHERE source_id = ANY($1) OR target_id = ANY($1)",
    [memoryIds]
  );

  // 3. Delete memory_metadata
  await client.query("DELETE FROM memory_metadata WHERE memory_id = ANY($1)", [memoryIds]);

  // 4. Delete memory_embeddings
  await client.query("DELETE FROM memory_embeddings WHERE memory_id = ANY($1)", [memoryIds]);

  // 5. Delete memories
  await client.query("DELETE FROM memories WHERE id = ANY($1)", [memoryIds]);
}

/**
 * Cleans up all E2E test data (data created by E2E tests).
 * This identifies E2E test data by the user ID pattern.
 *
 * @param client - Database client
 * @returns Promise resolving when cleanup is complete
 */
export async function cleanupAllE2ETestData(client: PoolClient): Promise<void> {
  // Find all E2E test user IDs
  const result = await client.query(
    "SELECT DISTINCT user_id FROM memories WHERE user_id LIKE 'e2e-user-%' OR user_id LIKE 'test-user-%'"
  );

  for (const row of result.rows) {
    await cleanupUserData(client, row.user_id);
  }
}

/**
 * Verifies the database is in a clean state (no E2E test data remains).
 *
 * @param client - Database client
 * @returns Promise resolving to verification result
 */
export async function verifyCleanState(client: PoolClient): Promise<{
  isClean: boolean;
  remainingTestUsers: string[];
  remainingMemoryCount: number;
}> {
  // Check for remaining E2E test data
  const userResult = await client.query(
    "SELECT DISTINCT user_id FROM memories WHERE user_id LIKE 'e2e-user-%' OR user_id LIKE 'test-user-%'"
  );

  const countResult = await client.query(
    "SELECT COUNT(*) as count FROM memories WHERE user_id LIKE 'e2e-user-%' OR user_id LIKE 'test-user-%'"
  );

  const remainingTestUsers = userResult.rows.map((row) => row.user_id);
  const remainingMemoryCount = parseInt(countResult.rows[0].count, 10);

  return {
    isClean: remainingTestUsers.length === 0,
    remainingTestUsers,
    remainingMemoryCount,
  };
}

/**
 * Gets database statistics for debugging.
 *
 * @param client - Database client
 * @returns Promise resolving to database statistics
 */
export async function getDatabaseStats(client: PoolClient): Promise<{
  totalMemories: number;
  totalEmbeddings: number;
  totalConnections: number;
  totalLinks: number;
  testMemories: number;
}> {
  const [memoriesResult, embeddingsResult, connectionsResult, linksResult, testMemoriesResult] =
    await Promise.all([
      client.query("SELECT COUNT(*) as count FROM memories"),
      client.query("SELECT COUNT(*) as count FROM memory_embeddings"),
      client.query("SELECT COUNT(*) as count FROM memory_connections"),
      client.query("SELECT COUNT(*) as count FROM memory_links"),
      client.query(
        "SELECT COUNT(*) as count FROM memories WHERE user_id LIKE 'e2e-user-%' OR user_id LIKE 'test-user-%'"
      ),
    ]);

  return {
    totalMemories: parseInt(memoriesResult.rows[0].count, 10),
    totalEmbeddings: parseInt(embeddingsResult.rows[0].count, 10),
    totalConnections: parseInt(connectionsResult.rows[0].count, 10),
    totalLinks: parseInt(linksResult.rows[0].count, 10),
    testMemories: parseInt(testMemoriesResult.rows[0].count, 10),
  };
}
