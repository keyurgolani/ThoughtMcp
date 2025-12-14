/**
 * Local Tests Global Setup: Unit + Integration Tests (No Containers, All Mocks)
 *
 * This setup file is for all local tests that:
 * - Do NOT require real PostgreSQL (use mock interfaces)
 * - Do NOT require real Ollama (use mock embeddings)
 * - Run in parallel across multiple threads
 * - Are part of the default test target (npm test)
 *
 * Responsibilities:
 * - Configure mock PostgreSQL interfaces
 * - Configure mock embedding generation
 * - Ensure NO container operations are triggered
 * - Set up test environment for isolated tests
 *
 * Requirements: 14.1, 14.2, 14.3
 * - 14.1: Two categories - Local Tests and E2E Tests
 * - 14.2: Local tests include unit and integration tests with mocks
 * - 14.3: Local tests execute in parallel (10 threads)
 *
 * @module __tests__/setup/local-setup
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

/**
 * Mock database configuration for local tests.
 * These values are used by mock interfaces, not real connections.
 */
export interface MockDatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  poolSize: number;
}

/**
 * Mock embedding configuration for local tests.
 */
export interface MockEmbeddingConfig {
  model: string;
  dimension: number;
  useMock: boolean;
}

/**
 * Local setup state for verification in tests.
 */
export interface LocalSetupState {
  initialized: boolean;
  mockDatabaseConfigured: boolean;
  mockEmbeddingsConfigured: boolean;
  containerOperationsBlocked: boolean;
  setupTime: string;
}

/**
 * Global state tracking for local setup.
 * Exported for test verification purposes.
 */
let setupState: LocalSetupState = {
  initialized: false,
  mockDatabaseConfigured: false,
  mockEmbeddingsConfigured: false,
  containerOperationsBlocked: false,
  setupTime: "",
};

/**
 * Gets the current local setup state.
 * Useful for tests to verify setup was performed correctly.
 */
export function getLocalSetupState(): LocalSetupState {
  return { ...setupState };
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
 * Configures mock PostgreSQL environment variables.
 * These are used by mock interfaces, not real database connections.
 */
function configureMockPostgres(): MockDatabaseConfig {
  // Set environment variables that signal mock usage
  process.env.USE_MOCK_DATABASE = "true";
  process.env.USE_MOCK_POSTGRES = "true";
  process.env.SKIP_DB_SETUP = "true";
  process.env.AUTO_START_CONTAINERS = "false";

  // Set mock database configuration values
  // These are placeholder values used by mock interfaces
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? "postgresql://mock:mock@localhost:5432/mock_test";
  process.env.DB_HOST = process.env.DB_HOST ?? "localhost";
  process.env.DB_PORT = process.env.DB_PORT ?? "5432";
  process.env.DB_NAME = process.env.DB_NAME ?? "mock_test";
  process.env.DB_USER = process.env.DB_USER ?? "mock";
  process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? "mock";
  process.env.DB_POOL_SIZE = process.env.DB_POOL_SIZE ?? "1";

  return {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    poolSize: parseInt(process.env.DB_POOL_SIZE, 10),
  };
}

/**
 * Configures mock embedding environment variables.
 * These signal that mock embeddings should be used instead of real Ollama.
 */
function configureMockEmbeddings(): MockEmbeddingConfig {
  // Set environment variables that signal mock usage
  process.env.USE_MOCK_EMBEDDINGS = "true";
  process.env.SKIP_OLLAMA = "true";

  // Set mock embedding configuration values
  process.env.EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "nomic-embed-text";
  process.env.EMBEDDING_DIMENSION = process.env.EMBEDDING_DIMENSION ?? "768";
  process.env.OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";

  return {
    model: process.env.EMBEDDING_MODEL,
    dimension: parseInt(process.env.EMBEDDING_DIMENSION, 10),
    useMock: true,
  };
}

/**
 * Blocks container operations by setting environment flags.
 * This ensures no Docker operations are triggered during local tests.
 */
function blockContainerOperations(): void {
  // Disable all container auto-start functionality
  process.env.AUTO_START_CONTAINERS = "false";
  process.env.SKIP_CONTAINER_SETUP = "true";
  process.env.DOCKER_DISABLED = "true";

  // Set flags that container management code should check
  process.env.NO_POSTGRES_CONTAINER = "true";
  process.env.NO_OLLAMA_CONTAINER = "true";
}

/**
 * Sets general test environment configuration.
 */
function setTestEnvironment(): void {
  process.env.NODE_ENV = "test";
  process.env.TEST_BUCKET = "local";
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "ERROR";
  process.env.CACHE_TTL = process.env.CACHE_TTL ?? "300";
  process.env.MAX_PROCESSING_TIME = process.env.MAX_PROCESSING_TIME ?? "30000";
}

/**
 * Local tests global setup function.
 *
 * This function:
 * 1. Sets test environment for local tests
 * 2. Loads .env.test file if present
 * 3. Configures mock PostgreSQL interfaces
 * 4. Configures mock embedding generation
 * 5. Blocks all container operations
 * 6. Does NOT start any containers
 * 7. Does NOT connect to any external services
 *
 * @returns Promise resolving when setup is complete
 */
export default async function localSetup(): Promise<void> {
  console.log("🚀 Starting Local Tests Setup (Unit + Integration - No Containers)...");

  // Set test environment
  setTestEnvironment();

  // Load .env.test file if it exists (for any custom test configuration)
  const envTestPath = resolve(process.cwd(), ".env.test");
  loadEnvFile(envTestPath);

  // Block container operations FIRST
  blockContainerOperations();
  setupState.containerOperationsBlocked = true;

  // Configure mock PostgreSQL interfaces
  const mockDbConfig = configureMockPostgres();
  setupState.mockDatabaseConfigured = true;

  // Configure mock embedding generation
  const mockEmbeddingConfig = configureMockEmbeddings();
  setupState.mockEmbeddingsConfigured = true;

  // Mark setup as complete
  setupState.initialized = true;
  setupState.setupTime = new Date().toISOString();

  console.log("✅ Local tests setup complete");
  console.log("   Test Category: Local (Unit + Integration)");
  console.log("   PostgreSQL: MOCK (no container)");
  console.log(`     - Host: ${mockDbConfig.host}:${mockDbConfig.port}`);
  console.log(`     - Database: ${mockDbConfig.database}`);
  console.log("   Ollama: MOCK (no container)");
  console.log(`     - Model: ${mockEmbeddingConfig.model}`);
  console.log(`     - Dimension: ${mockEmbeddingConfig.dimension}`);
  console.log("   Container Operations: BLOCKED");
}

/**
 * Local tests global teardown function.
 *
 * For local tests, teardown is minimal since no containers were started.
 * This function exists for consistency with E2E teardown patterns.
 *
 * @returns Promise resolving when teardown is complete
 */
export async function localTeardown(): Promise<void> {
  console.log("🧹 Local Tests Teardown (No cleanup needed - no containers started)");

  // Reset setup state
  setupState = {
    initialized: false,
    mockDatabaseConfigured: false,
    mockEmbeddingsConfigured: false,
    containerOperationsBlocked: false,
    setupTime: "",
  };

  console.log("✅ Local tests teardown complete");
}
