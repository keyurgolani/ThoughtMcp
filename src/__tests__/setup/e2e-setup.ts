/**
 * E2E Global Setup: End-to-End Tests Container Management
 *
 * This setup file is specifically for E2E tests that:
 * - REQUIRE real PostgreSQL for database operations
 * - REQUIRE real Ollama for embedding operations
 * - Test complete user workflows with real dependencies
 *
 * Responsibilities:
 * - Start PostgreSQL container using docker-compose.test.yml
 * - Wait for PostgreSQL to be healthy (accept connections)
 * - Start Ollama container using docker-compose.test.yml
 * - Wait for Ollama to be healthy (model loaded and responding)
 * - Run database migrations to prepare schema
 * - Export connection details for tests to use
 * - Return teardown function with closure access to container state
 *
 * Requirements: 13.9, 13.10, 13.11
 * - 13.9: E2E test setup automatically spins up PostgreSQL and Ollama containers
 * - 13.10: E2E test teardown automatically spins down containers
 * - 13.11: E2E container setup fails with clear error message if setup fails
 *
 * @module __tests__/setup/e2e-setup
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { DockerComposeWrapper } from "../../containers/index.js";
import { DatabaseConnectionManager } from "../../database/connection-manager.js";
import { SchemaMigrationSystem } from "../../database/schema-migration.js";

/**
 * Loads environment variables from a .env file.
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
 * Sets default environment variables for PostgreSQL.
 */
function setPostgresEnvironment(): void {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ??
    "postgresql://thoughtmcp_test:test_password@localhost:5433/thoughtmcp_test";
  process.env.DB_HOST = process.env.DB_HOST ?? "localhost";
  process.env.DB_PORT = process.env.DB_PORT ?? "5433";
  process.env.DB_NAME = process.env.DB_NAME ?? "thoughtmcp_test";
  process.env.DB_USER = process.env.DB_USER ?? "thoughtmcp_test";
  process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? "test_password";
  process.env.DB_POOL_SIZE = process.env.DB_POOL_SIZE ?? "5";
}

/**
 * Sets Ollama environment variables for real embedding operations.
 */
function setOllamaEnvironment(): void {
  process.env.OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11435";
  process.env.EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "nomic-embed-text";
  process.env.EMBEDDING_DIMENSION = process.env.EMBEDDING_DIMENSION ?? "768";
  process.env.USE_MOCK_EMBEDDINGS = "false";
}

/**
 * Checks if PostgreSQL container is already running.
 */
async function isPostgresRunning(
  composeWrapper: DockerComposeWrapper,
  composeFile: string
): Promise<boolean> {
  try {
    const services = await composeWrapper.ps(composeFile);
    const postgresService = services.find(
      (s) => s.name === "postgres-test" || s.name.includes("postgres")
    );
    return postgresService?.status === "running";
  } catch {
    return false;
  }
}

/**
 * Checks if Ollama container is already running.
 */
async function isOllamaRunning(
  composeWrapper: DockerComposeWrapper,
  composeFile: string
): Promise<boolean> {
  try {
    const services = await composeWrapper.ps(composeFile);
    const ollamaService = services.find(
      (s) => s.name === "ollama-test" || s.name.includes("ollama")
    );
    return ollamaService?.status === "running";
  } catch {
    return false;
  }
}

/**
 * Starts both PostgreSQL and Ollama containers using Docker Compose.
 */
async function startAllContainers(
  composeWrapper: DockerComposeWrapper,
  composeFile: string
): Promise<void> {
  console.log("   Starting PostgreSQL and Ollama containers...");
  await composeWrapper.up(composeFile, {
    detach: true,
    wait: true,
    timeout: 120,
  });
}

/**
 * Starts only PostgreSQL container using Docker Compose.
 */
async function startPostgresContainer(
  composeWrapper: DockerComposeWrapper,
  composeFile: string
): Promise<void> {
  console.log("   Starting PostgreSQL container...");
  await composeWrapper.up(composeFile, {
    detach: true,
    wait: true,
    timeout: 60,
    env: { COMPOSE_PROFILES: "postgres" },
  });
}

/**
 * Starts only Ollama container using Docker Compose.
 */
async function startOllamaContainer(
  composeWrapper: DockerComposeWrapper,
  composeFile: string
): Promise<void> {
  console.log("   Starting Ollama container...");
  await composeWrapper.up(composeFile, {
    detach: true,
    wait: true,
    timeout: 120,
    env: { COMPOSE_PROFILES: "ollama" },
  });
}

/**
 * Waits for PostgreSQL to be ready to accept connections.
 */
async function waitForPostgresReady(maxAttempts = 30, intervalMs = 1000): Promise<void> {
  console.log("   Waiting for PostgreSQL to be ready...");

  const dbManager = new DatabaseConnectionManager({
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5433", 10),
    database: process.env.DB_NAME ?? "thoughtmcp_test",
    user: process.env.DB_USER ?? "thoughtmcp_test",
    password: process.env.DB_PASSWORD ?? "test_password",
    poolSize: 1,
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await dbManager.connect();
      await dbManager.disconnect();
      console.log(`   ✅ PostgreSQL ready after ${attempt} attempt(s)`);
      return;
    } catch {
      if (attempt === maxAttempts) {
        throw new Error(`PostgreSQL not ready after ${maxAttempts} attempts`);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

/**
 * Waits for Ollama to be ready and the model to be available.
 */
async function waitForOllamaReady(maxAttempts = 60, intervalMs = 2000): Promise<void> {
  console.log("   Waiting for Ollama to be ready...");

  const ollamaHost = process.env.OLLAMA_HOST ?? "http://localhost:11435";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${ollamaHost}/api/tags`);
      if (response.ok) {
        console.log(`   ✅ Ollama API ready after ${attempt} attempt(s)`);
        return;
      }
    } catch {
      // Ollama not ready yet
    }

    if (attempt === maxAttempts) {
      throw new Error(`Ollama not ready after ${maxAttempts} attempts`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * Ensures the embedding model is available in Ollama.
 */
async function ensureModelReady(): Promise<void> {
  const ollamaHost = process.env.OLLAMA_HOST ?? "http://localhost:11435";
  const modelName = process.env.EMBEDDING_MODEL ?? "nomic-embed-text";

  console.log(`   Checking if model '${modelName}' is available...`);

  try {
    const tagsResponse = await fetch(`${ollamaHost}/api/tags`);
    if (!tagsResponse.ok) {
      throw new Error(`Failed to get model list: ${tagsResponse.statusText}`);
    }

    const tagsData = (await tagsResponse.json()) as { models?: Array<{ name: string }> };
    const models = tagsData.models ?? [];
    const modelExists = models.some(
      (m) => m.name === modelName || m.name.startsWith(`${modelName}:`)
    );

    if (modelExists) {
      console.log(`   ✅ Model '${modelName}' is available`);
      return;
    }

    console.log(`   Model '${modelName}' not found, pulling...`);
    const pullResponse = await fetch(`${ollamaHost}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName }),
    });

    if (!pullResponse.ok) {
      throw new Error(`Failed to pull model: ${pullResponse.statusText}`);
    }

    const reader = pullResponse.body?.getReader();
    if (reader) {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }

    console.log(`   ✅ Model '${modelName}' pulled successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`   ⚠️  Could not verify model availability: ${errorMessage}`);
  }
}

/**
 * Runs database migrations.
 */
async function runMigrations(): Promise<void> {
  console.log("   Running database migrations...");

  const dbManager = new DatabaseConnectionManager({
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5433", 10),
    database: process.env.DB_NAME ?? "thoughtmcp_test",
    user: process.env.DB_USER ?? "thoughtmcp_test",
    password: process.env.DB_PASSWORD ?? "test_password",
    poolSize: parseInt(process.env.DB_POOL_SIZE ?? "5", 10),
  });

  try {
    await dbManager.connect();
    const migrationSystem = new SchemaMigrationSystem(dbManager);
    await migrationSystem.runMigrations();
    console.log("   ✅ Database migrations completed");
  } finally {
    await dbManager.disconnect();
  }
}

/**
 * E2E global setup function.
 *
 * Returns a teardown function with closure access to container state,
 * eliminating the need for file-based state persistence.
 */
export default async function e2eSetup(): Promise<() => Promise<void>> {
  console.log("🚀 Starting E2E Test Setup (Real PostgreSQL + Real Ollama)...");

  // Set test environment
  process.env.NODE_ENV = "test";
  process.env.TEST_BUCKET = "e2e";
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "ERROR";

  // Load .env.test file if it exists
  loadEnvFile(resolve(process.cwd(), ".env.test"));

  // Set environment variables
  setPostgresEnvironment();
  setOllamaEnvironment();

  console.log("✅ Test environment configured");
  console.log(`   Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`   Ollama: ${process.env.OLLAMA_HOST}`);
  console.log(`   Model: ${process.env.EMBEDDING_MODEL}`);

  // Check if container management should be skipped (e.g., in CI with pre-started services)
  const skipContainerManagement = process.env.SKIP_CONTAINER_MANAGEMENT === "true";

  // Track which containers we start (used by teardown closure)
  let postgresStartedBySetup = false;
  let ollamaStartedBySetup = false;

  if (skipContainerManagement) {
    console.log("   ℹ️  Skipping container management (SKIP_CONTAINER_MANAGEMENT=true)");
    console.log("   ℹ️  Using externally managed PostgreSQL and Ollama services");
  } else {
    // Initialize container management
    const composeWrapper = new DockerComposeWrapper();
    const composeFile = process.env.TEST_COMPOSE_FILE ?? "docker-compose.test.yml";

    // Check if containers are already running
    const postgresAlreadyRunning = await isPostgresRunning(composeWrapper, composeFile);
    const ollamaAlreadyRunning = await isOllamaRunning(composeWrapper, composeFile);

    if (postgresAlreadyRunning) {
      console.log("   ℹ️  PostgreSQL container already running - reusing");
    }
    if (ollamaAlreadyRunning) {
      console.log("   ℹ️  Ollama container already running - reusing");
    }

    // Start containers as needed
    try {
      if (!postgresAlreadyRunning && !ollamaAlreadyRunning) {
        await startAllContainers(composeWrapper, composeFile);
        postgresStartedBySetup = true;
        ollamaStartedBySetup = true;
        console.log("   ✅ Both containers started");
      } else if (!postgresAlreadyRunning) {
        await startPostgresContainer(composeWrapper, composeFile);
        postgresStartedBySetup = true;
        console.log("   ✅ PostgreSQL container started");
      } else if (!ollamaAlreadyRunning) {
        await startOllamaContainer(composeWrapper, composeFile);
        ollamaStartedBySetup = true;
        console.log("   ✅ Ollama container started");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ E2E container setup failed:", errorMessage);
      console.error("   Please ensure Docker is running and try again.");
      console.error("   You can also start containers manually:");
      console.error("   docker compose -f docker-compose.test.yml up -d");
      throw new Error(`E2E container setup failed: ${errorMessage}`);
    }
  }

  // Wait for services and run migrations
  await waitForPostgresReady();
  await runMigrations();
  await waitForOllamaReady();
  await ensureModelReady();

  console.log("✅ E2E setup complete");
  console.log("   PostgreSQL: ready");
  console.log("   Ollama: ready");

  // Return teardown function with closure access to container state
  return async () => {
    console.log("\n🧹 Starting E2E Test Teardown...");

    if (skipContainerManagement) {
      console.log("   Skipping container teardown (SKIP_CONTAINER_MANAGEMENT=true)");
      console.log("✅ E2E teardown complete\n");
      return;
    }

    if (process.env.KEEP_CONTAINERS_RUNNING === "true") {
      console.log("   Keeping containers running (KEEP_CONTAINERS_RUNNING=true)");
      console.log("✅ E2E teardown complete\n");
      return;
    }

    if (!postgresStartedBySetup) {
      console.log("   PostgreSQL was already running - leaving it running");
    }
    if (!ollamaStartedBySetup) {
      console.log("   Ollama was already running - leaving it running");
    }

    if (postgresStartedBySetup || ollamaStartedBySetup) {
      const composeWrapper = new DockerComposeWrapper();
      const composeFile = process.env.TEST_COMPOSE_FILE ?? "docker-compose.test.yml";
      try {
        console.log("   Stopping containers...");
        await composeWrapper.down(composeFile, { volumes: true, timeout: 15 });
        console.log("   ✅ Containers stopped and volumes removed");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`   ⚠️  Failed to stop containers: ${errorMessage}`);
      }
    }

    console.log("✅ E2E teardown complete\n");
  };
}
