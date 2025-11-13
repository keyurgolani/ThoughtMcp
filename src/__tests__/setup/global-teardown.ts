/**
 * Global Teardown for Test Framework
 *
 * Runs once after all tests complete.
 * Used for:
 * - Cleaning up test database infrastructure
 * - Closing connections
 * - Generating final reports
 */

export default async function globalTeardown(): Promise<void> {
  console.log("🧹 Cleaning up ThoughtMCP Test Framework...");

  // Cleanup will be handled by individual test suites
  // This is just for final cleanup and reporting

  console.log("✅ Test framework cleanup complete");
}
