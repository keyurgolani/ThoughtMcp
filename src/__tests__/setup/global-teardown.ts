/**
 * Global Teardown for Test Framework
 *
 * Runs once after all tests complete.
 * Used for:
 * - Stopping test containers via Docker Compose
 * - Cleaning up test database infrastructure
 * - Closing connections
 * - Generating final reports
 *
 * Handles:
 * - KEEP_CONTAINERS_RUNNING=true case (preserves containers)
 * - Signal handlers for SIGINT/SIGTERM (graceful cleanup)
 *
 * Note: Since global setup and teardown run in separate processes in Vitest,
 * we cannot share the TestContainerManager instance. Instead, we use Docker
 * Compose directly to check and stop containers.
 *
 * Requirements: 2.1, 2.2, 2.4, 2.5, 6.3
 *
 * @module __tests__/setup/global-teardown
 */

import { DockerComposeWrapper } from "../../containers/docker-compose-wrapper";

/**
 * Flag to track if cleanup has already been performed.
 * Prevents duplicate cleanup from signal handlers.
 */
let cleanupPerformed = false;

/**
 * Performs container cleanup using Docker Compose directly.
 *
 * Since global setup and teardown run in separate processes in Vitest,
 * we cannot share the TestContainerManager instance. Instead, we use
 * Docker Compose directly to check and stop containers.
 *
 * This function:
 * 1. Checks KEEP_CONTAINERS_RUNNING setting
 * 2. Checks AUTO_START_CONTAINERS setting (if false, we didn't start containers)
 * 3. Uses docker compose down to stop test containers
 *
 * Requirements:
 * - 2.1: Stop containers that were started by manager
 * - 2.2: Stop containers even if tests fail or are interrupted
 * - 6.3: Honor KEEP_CONTAINERS_RUNNING setting
 *
 * @returns Promise resolving when cleanup is complete
 */
async function performContainerCleanup(): Promise<void> {
  // Prevent duplicate cleanup
  if (cleanupPerformed) {
    return;
  }
  cleanupPerformed = true;

  // Check if we should keep containers running
  if (process.env.KEEP_CONTAINERS_RUNNING === "true") {
    console.log("   Keeping containers running (KEEP_CONTAINERS_RUNNING=true)");
    return;
  }

  // Check if auto-start was disabled (we didn't start containers)
  if (process.env.AUTO_START_CONTAINERS === "false") {
    console.log("   Skipping cleanup (AUTO_START_CONTAINERS=false)");
    return;
  }

  // Check if database setup was skipped
  if (process.env.SKIP_DB_SETUP === "true") {
    console.log("   Skipping cleanup (SKIP_DB_SETUP=true)");
    return;
  }

  try {
    const composeWrapper = new DockerComposeWrapper();
    const composeFile = process.env.TEST_COMPOSE_FILE ?? "docker-compose.test.yml";

    // Check if test containers are running
    const services = await composeWrapper.ps(composeFile);
    const runningServices = services.filter((s) => s.status === "running");

    if (runningServices.length === 0) {
      console.log("   No test containers running - skipping cleanup");
      return;
    }

    // Stop containers
    const preserveData = process.env.PRESERVE_TEST_DATA === "true";
    await composeWrapper.down(composeFile, {
      volumes: !preserveData,
      timeout: 10,
    });

    console.log("   ✅ Container cleanup complete");
  } catch (error) {
    // Log error but don't throw - cleanup should be best-effort
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ⚠️  Container cleanup error: ${errorMessage}`);
  }
}

/**
 * Signal handler for graceful shutdown.
 *
 * Handles SIGINT (Ctrl+C) and SIGTERM signals to ensure
 * containers are properly cleaned up when tests are interrupted.
 *
 * Requirement 2.5: Perform graceful container cleanup on SIGINT/SIGTERM
 *
 * @param signal - The signal that was received
 */
function handleSignal(signal: string): void {
  console.log(`\n🛑 Received ${signal} - performing graceful cleanup...`);

  // Perform cleanup synchronously since we're in a signal handler
  // Note: We can't use async/await directly in signal handlers
  performContainerCleanup()
    .then(() => {
      console.log("✅ Graceful shutdown complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error during graceful shutdown:", error);
      process.exit(1);
    });
}

/**
 * Registers signal handlers for graceful shutdown.
 *
 * This ensures containers are cleaned up even when:
 * - User presses Ctrl+C (SIGINT)
 * - Process is terminated (SIGTERM)
 *
 * Requirement 2.5: Handle SIGINT/SIGTERM for graceful cleanup
 */
function registerSignalHandlers(): void {
  // Only register handlers once
  const signalHandlersRegistered = (global as Record<string, unknown>).__signalHandlersRegistered;
  if (signalHandlersRegistered) {
    return;
  }
  (global as Record<string, unknown>).__signalHandlersRegistered = true;

  // Register SIGINT handler (Ctrl+C)
  process.on("SIGINT", () => handleSignal("SIGINT"));

  // Register SIGTERM handler (kill command)
  process.on("SIGTERM", () => handleSignal("SIGTERM"));
}

/**
 * Global teardown function for Vitest.
 *
 * This function:
 * 1. Registers signal handlers for graceful shutdown
 * 2. Stops containers via TestContainerManager
 * 3. Performs final cleanup
 *
 * Requirements:
 * - 2.1: Stop containers that were started
 * - 2.2: Stop containers even if tests fail
 * - 2.4: Leave pre-existing containers running
 * - 2.5: Handle SIGINT/SIGTERM gracefully
 * - 6.3: Honor KEEP_CONTAINERS_RUNNING setting
 *
 * @returns Promise resolving when teardown is complete
 */
export default async function globalTeardown(): Promise<void> {
  console.log("\n🧹 Cleaning up ThoughtMCP Test Framework...");

  // Register signal handlers for any late signals
  registerSignalHandlers();

  // Perform container cleanup
  try {
    await performContainerCleanup();
  } catch (error) {
    console.error("❌ Teardown error:", error);
  }

  console.log("✅ Test framework cleanup complete\n");
}
