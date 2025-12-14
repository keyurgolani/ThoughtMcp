/**
 * Global Setup for Test Framework
 *
 * Runs once before all tests start.
 * Used for:
 * - Starting test containers (PostgreSQL, Ollama) via TestContainerManager
 * - Setting up test database infrastructure
 * - Initializing test environment
 * - Loading test configuration
 * - Running database migrations
 *
 * Set SKIP_DB_SETUP=true to skip database setup for unit tests that don't need it.
 * Set AUTO_START_CONTAINERS=false to skip automatic container startup.
 *
 * Requirements: 1.1, 1.2, 1.3, 6.1, 7.4
 *
 * @module __tests__/setup/global-setup
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import {
  ContainerLogger,
  DockerComposeWrapper,
  EnvironmentConfigurator,
  PortAllocator,
  TestContainerManager,
} from "../../containers/index.js";
import { DatabaseConnectionManager } from "../../database/connection-manager.js";
import { SchemaMigrationSystem } from "../../database/schema-migration.js";

/**
 * Global state to track the TestContainerManager instance.
 * This is used by global-teardown.ts to clean up containers.
 */
let containerManager: TestContainerManager | null = null;

/**
 * Gets the TestContainerManager instance for use in teardown.
 * @returns The TestContainerManager instance or null if not initialized
 */
export function getContainerManager(): TestContainerManager | null {
  return containerManager;
}

/**
 * Loads environment variables from a .env file.
 * @param envPath - Path to the .env file
 */
function loadEnvFile(envPath: string): void {
  if (!existsSync(envPath)) {
    return;
  }

  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=");
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

/**
 * Sets default environment variables for tests that skip database setup.
 */
function setMinimalEnvironment(): void {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5433/thoughtmcp_test";
  process.env.DB_HOST = process.env.DB_HOST ?? "localhost";
  process.env.DB_PORT = process.env.DB_PORT ?? "5433";
  process.env.DB_NAME = process.env.DB_NAME ?? "thoughtmcp_test";
  process.env.DB_USER = process.env.DB_USER ?? "test";
  process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? "test";
  process.env.EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "nomic-embed-text";
  process.env.EMBEDDING_DIMENSION = process.env.EMBEDDING_DIMENSION ?? "768";
  process.env.OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "ERROR";
}

/**
 * Sets default test configuration environment variables.
 */
function setDefaultTestConfiguration(): void {
  process.env.DB_POOL_SIZE = process.env.DB_POOL_SIZE ?? "5";
  process.env.EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "nomic-embed-text";
  process.env.EMBEDDING_DIMENSION = process.env.EMBEDDING_DIMENSION ?? "768";
  process.env.OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "ERROR";
  process.env.CACHE_TTL = process.env.CACHE_TTL ?? "300";
  process.env.MAX_PROCESSING_TIME = process.env.MAX_PROCESSING_TIME ?? "30000";
}

/**
 * Initializes and starts test containers using TestContainerManager.
 *
 * Requirements:
 * - 1.1: Check if required containers are already running
 * - 1.2: Start containers if not running
 * - 1.3: Wait for health checks to pass
 * - 6.1: Handle AUTO_START_CONTAINERS=false
 * - 7.4: Handle Docker unavailable when AUTO_START_CONTAINERS=false
 *
 * @returns Promise resolving when containers are ready
 */
async function initializeContainers(): Promise<void> {
  // Check if auto-start is disabled
  if (process.env.AUTO_START_CONTAINERS === "false") {
    console.log("⏭️  Skipping container auto-start (AUTO_START_CONTAINERS=false)");
    console.log("   Assuming containers are managed externally");
    return;
  }

  console.log("🐳 Initializing test containers...");

  // Create container management components
  const composeWrapper = new DockerComposeWrapper();
  const portAllocator = new PortAllocator();
  const envConfigurator = new EnvironmentConfigurator();
  const logger = new ContainerLogger("test-setup", true);

  // Create TestContainerManager
  containerManager = new TestContainerManager(
    composeWrapper,
    portAllocator,
    envConfigurator,
    logger
  );

  try {
    // Start containers (handles reuse, port allocation, health checks)
    const containers = await containerManager.startContainers();

    if (containers.length === 0) {
      // AUTO_START_CONTAINERS was false or containers were already running
      console.log("   Using existing containers or external management");
      return;
    }

    // Log container status
    for (const container of containers) {
      const reusedLabel = container.startedByManager ? "started" : "reused";
      console.log(`   ✅ ${container.service}: ${reusedLabel} on port ${container.port}`);
    }

    console.log("✅ Test containers ready");
  } catch (error) {
    // Requirement 7.4: Handle Docker unavailable gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);

    // If Docker is unavailable but AUTO_START_CONTAINERS is not explicitly false,
    // we should fail with a clear error message
    if (
      errorMessage.includes("Docker is not available") ||
      errorMessage.includes("Docker is not installed") ||
      errorMessage.includes("Docker daemon is not running")
    ) {
      console.error("❌ Docker is not available for test containers");
      console.error("   Options:");
      console.error("   1. Start Docker Desktop or Docker daemon");
      console.error("   2. Set AUTO_START_CONTAINERS=false and start containers manually:");
      console.error("      docker compose -f docker-compose.test.yml up -d");
      throw error;
    }

    // Re-throw other errors
    console.error("❌ Failed to initialize test containers:", errorMessage);
    throw error;
  }
}

/**
 * Runs database migrations.
 * @returns Promise resolving when migrations are complete
 */
async function runMigrations(): Promise<void> {
  console.log("📦 Running database migrations...");

  const dbManager = new DatabaseConnectionManager({
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5433", 10),
    database: process.env.DB_NAME ?? "thoughtmcp_test",
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres",
    poolSize: parseInt(process.env.DB_POOL_SIZE ?? "5", 10),
  });

  try {
    await dbManager.connect();
    const migrationSystem = new SchemaMigrationSystem(dbManager);
    await migrationSystem.runMigrations();
    console.log("✅ Database migrations completed");
  } catch (error) {
    console.error("❌ Failed to run migrations:", error);
    throw error;
  } finally {
    await dbManager.disconnect();
  }
}

/**
 * Global setup function for Vitest.
 *
 * This function:
 * 1. Sets test environment
 * 2. Loads .env.test file if present
 * 3. Initializes test containers (if AUTO_START_CONTAINERS is not false)
 * 4. Runs database migrations (if SKIP_DB_SETUP is not true)
 *
 * @returns Promise resolving when setup is complete
 */
export default async function globalSetup(): Promise<void> {
  console.log("🚀 Starting ThoughtMCP Test Framework...");

  // Set test environment
  process.env.NODE_ENV = "test";

  // Load .env.test file if it exists
  const envTestPath = resolve(process.cwd(), ".env.test");
  loadEnvFile(envTestPath);

  // Skip database setup if SKIP_DB_SETUP is set (for unit tests that don't need database)
  if (process.env.SKIP_DB_SETUP === "true") {
    console.log("⏭️  Skipping database setup (SKIP_DB_SETUP=true)");
    setMinimalEnvironment();
    console.log("✅ Test environment configured (no database)");
    return;
  }

  // Validate required environment variables
  const requiredEnvVars = [
    "DATABASE_URL",
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingVars.join(", ")}`);
    console.warn("   Using default test configuration...");

    // Set default test environment variables
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5433/thoughtmcp_test";
    process.env.DB_HOST = process.env.DB_HOST ?? "localhost";
    process.env.DB_PORT = process.env.DB_PORT ?? "5433";
    process.env.DB_NAME = process.env.DB_NAME ?? "thoughtmcp_test";
    process.env.DB_USER = process.env.DB_USER ?? "test";
    process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? "test";
  }

  // Set default test configuration
  setDefaultTestConfiguration();

  console.log("✅ Test environment configured");
  console.log(`   Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`   Embedding Model: ${process.env.EMBEDDING_MODEL}`);
  console.log(`   Log Level: ${process.env.LOG_LEVEL}`);

  // Initialize test containers (before migrations)
  // Requirements: 1.1, 1.2, 1.3, 6.1, 7.4
  await initializeContainers();

  // Run database migrations
  await runMigrations();
}
