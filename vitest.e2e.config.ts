import { defineConfig } from "vitest/config";

/**
 * E2E Vitest Configuration: End-to-End Tests
 *
 * This configuration is for E2E tests that:
 * - REQUIRE real PostgreSQL (database operations, migrations, queries)
 * - REQUIRE real Ollama (embedding generation, model operations)
 * - Test complete user workflows from request to response
 * - Must run sequentially to prevent race conditions and resource contention
 * - Are NOT part of the default test target (npm test)
 *
 * Execution characteristics:
 * - Sequential execution (singleThread: true) to prevent race conditions
 * - Global setup starts both PostgreSQL and Ollama containers if not running
 * - Global teardown stops containers that were started by setup
 * - 60 second test timeout (E2E tests may have high variance)
 * - Real PostgreSQL and real Ollama - no mocks
 * - Data cleanup after each test
 *
 * Test file patterns:
 * - src/__tests__/e2e/** (all .test.ts files)
 *
 * Usage:
 * - npm run test:e2e (runs E2E tests with automatic container lifecycle)
 * - npm run test:qa (runs local tests + E2E tests)
 *
 * Requirements: 13.1, 13.2, 13.4, 13.5, 13.8, 14.4, 14.5
 * - 13.1: E2E tests verify complete user workflows
 * - 13.2: E2E tests use real PostgreSQL and Ollama
 * - 13.4: E2E tests have dedicated target (npm run test:e2e)
 * - 13.5: E2E tests NOT part of default test target
 * - 13.8: E2E tests execute sequentially
 * - 14.4: E2E tests include only end-to-end tests with real dependencies
 * - 14.5: E2E tests execute sequentially
 *
 * @module vitest.e2e.config
 */
export default defineConfig({
  test: {
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Node environment for all tests
    environment: "node",

    // Test isolation and cleanup
    isolate: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    // No retries for deterministic tests
    retry: 0,

    // Watch mode disabled by default (use --watch flag)
    watch: false,

    // Test file patterns - E2E tests only
    include: ["src/__tests__/e2e/**/*.test.ts"],

    // Exclude all other test types
    exclude: [
      "node_modules",
      "dist",
      "coverage",
      "src/__tests__/unit/**",
      "src/__tests__/integration/**",
      "src/__tests__/production/**",
    ],

    // Test timeout: 60 seconds for E2E operations (Requirement 13.8)
    // E2E tests involve real database and embedding operations which can be slow
    testTimeout: 60000,
    hookTimeout: 60000,

    // Global setup for container management (teardown returned by setup function)
    // Requirements: 13.9, 13.10, 13.11 - Auto-start containers, wait for ready, cleanup
    globalSetup: "./src/__tests__/setup/e2e-setup.ts",

    // Setup files for test environment
    setupFiles: ["./src/__tests__/setup/test-environment.ts"],

    // Sequential execution (Requirement 13.8)
    // E2E tests must run sequentially to prevent race conditions
    // and resource contention between PostgreSQL and Ollama operations
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true, // Sequential execution - prevents race conditions
        isolate: true, // Isolate test files for safety
      },
    },

    // Coverage configuration - disabled for E2E tests
    // E2E tests don't contribute to coverage metrics (Requirement 14.8)
    // Coverage is measured from local tests only
    coverage: {
      provider: "v8",
      enabled: false,
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./development/reports/coverage/e2e",
      // Disable thresholds for E2E tests - set to 0 to skip enforcement
      thresholds: {
        lines: 0,
        branches: 0,
        functions: 0,
        statements: 0,
      },
      include: ["src/**/*.ts"],
      exclude: [
        "node_modules/",
        "dist/",
        "coverage/",
        "src/__tests__/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.config.ts",
        "**/*.d.ts",
        "**/index.ts",
        "**/types.ts",
      ],
    },

    // Reporters
    reporters: ["verbose"],

    // Environment variables for E2E tests
    env: {
      NODE_ENV: "test",
      // Signal to test utilities that this is E2E
      TEST_BUCKET: "e2e",
      // Enable database setup - we need real PostgreSQL
      SKIP_DB_SETUP: "false",
      // Enable auto-start of both containers
      AUTO_START_CONTAINERS: "true",
      // Signal that we need both PostgreSQL and Ollama
      FULL_INTEGRATION: "true",
      // Use real embeddings - no mocks
      USE_MOCK_EMBEDDINGS: "false",
      // Use real PostgreSQL - no mocks
      USE_MOCK_POSTGRES: "false",
    },
  },
});
