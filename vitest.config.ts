import { defineConfig } from "vitest/config";

/**
 * Main Vitest Configuration: Local Tests (Unit + Integration)
 *
 * This configuration is for all local tests that:
 * - Do NOT require real external dependencies (PostgreSQL, Ollama)
 * - Use mocks for all external services
 * - Can run in parallel across multiple threads
 * - Are part of the default test target (npm test)
 *
 * Execution characteristics:
 * - 10 parallel worker threads for maximum throughput
 * - 10 second test timeout for unit tests
 * - 30 second hook timeout for setup/teardown
 * - Full test isolation between files
 *
 * Test file patterns:
 * - src/__tests__/unit/** (all .test.ts files)
 * - src/__tests__/integration/** (all .test.ts files)
 *
 * Excludes:
 * - src/__tests__/e2e/** (E2E tests require real dependencies)
 * - src/__tests__/production/** (production tests run separately)
 *
 * Requirements: 14.1, 14.2, 14.3, 14.6, 14.7, 14.8
 * - 14.1: Two categories - Local Tests and E2E Tests
 * - 14.2: Local tests include unit and integration tests with mocks
 * - 14.3: Local tests execute in parallel (10 threads)
 * - 14.6: npm test runs only local tests
 * - 14.7: npm run build runs only local tests
 * - 14.8: npm run test:coverage measures coverage from local tests only
 *
 * @module vitest.config
 */
export default defineConfig({
  test: {
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Node environment with PostgreSQL support
    environment: "node",

    // Test file patterns - unit and integration tests (with mocks)
    // Requirements: 14.2 - Local tests include unit and integration tests with mocks
    include: ["src/__tests__/unit/**/*.test.ts", "src/__tests__/integration/**/*.test.ts"],

    // Exclude E2E tests (they require real dependencies) and production tests
    // Requirements: 14.2 - Local tests are unit + integration only
    exclude: [
      "node_modules",
      "dist",
      "coverage",
      "src/__tests__/e2e/**",
      "src/__tests__/production/**",
    ],

    // Test timeouts
    testTimeout: 10000, // 10s default for unit tests
    hookTimeout: 30000, // 30s for setup/teardown hooks

    // Test isolation and cleanup
    isolate: true, // Run each test file in isolation
    clearMocks: true, // Clear mocks between tests
    restoreMocks: true, // Restore mocks after tests
    mockReset: true, // Reset mock state between tests

    // Retry configuration (no retries for deterministic tests)
    retry: 0,

    // Global setup for local tests (configures mocks)
    globalSetup: ["./src/__tests__/setup/local-setup.ts"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      enabled: false, // Enable with --coverage flag
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./development/reports/coverage",

      // Coverage thresholds (75% minimum for all metrics)
      thresholds: {
        lines: 75,
        branches: 75,
        functions: 75,
        statements: 75,
      },

      // Files to include in coverage
      include: ["src/**/*.ts"],

      // Files to exclude from coverage
      exclude: [
        "node_modules/",
        "dist/",
        "coverage/",
        "src/__tests__/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.config.ts",
        "**/*.d.ts",
        "**/index.ts", // Re-export files
        "**/types.ts", // Type definition files
      ],

      // Report uncovered lines
      all: true,
      skipFull: false,
    },

    // Reporters
    reporters: process.env.CI
      ? [
          "verbose",
          ["json", { outputFile: "./development/reports/test-results.json" }],
          ["html", { outputFile: "./development/reports/test-results.html" }],
        ]
      : ["verbose"],

    // Parallel execution with 10 worker threads (Requirement 14.3)
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false, // Enable parallel execution
        minThreads: 1,
        maxThreads: 10, // 10 parallel worker threads
        isolate: true, // Isolate test files for safety
      },
    },

    // Watch mode configuration
    watch: false, // Disable watch mode by default (use --watch flag)
    watchExclude: ["node_modules/**", "dist/**", "coverage/**"],

    // Snapshot configuration
    resolveSnapshotPath: (testPath, snapExtension) => {
      return testPath.replace(/\.test\.ts$/, `.test.ts${snapExtension}`);
    },

    // Environment variables for tests
    env: {
      NODE_ENV: "test",
      // Signal to test utilities that this is local tests (no containers)
      TEST_BUCKET: "local",
      // Skip database setup - use mocks instead
      SKIP_DB_SETUP: "true",
      // Disable auto-start of containers
      AUTO_START_CONTAINERS: "false",
      // Use mock embeddings
      USE_MOCK_EMBEDDINGS: "true",
      // Use mock PostgreSQL
      USE_MOCK_POSTGRES: "true",
    },

    // Setup files (run before each test file)
    setupFiles: ["./src/__tests__/setup/test-environment.ts"],
  },
});
