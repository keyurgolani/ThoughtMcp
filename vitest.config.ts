import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Node environment with PostgreSQL support
    environment: "node",

    // Test file patterns - exclude performance tests from default run (require database)
    include: [
      "src/__tests__/unit/**/*.test.ts",
      "src/__tests__/integration/**/*.test.ts",
      "src/__tests__/e2e/**/*.test.ts",
      "src/__tests__/examples/**/*.test.ts", // Include examples for validation
      "src/__tests__/validation/**/*.test.ts", // Include validation tests
      "src/__tests__/production/**/*.test.ts", // Include production tests
      "src/__tests__/property/**/*.test.ts", // Include property-based tests
    ],
    exclude: [
      "node_modules",
      "dist",
      "coverage",
      "src/__tests__/performance/**", // Performance tests require database, run separately
      "src/__tests__/accuracy/**", // Accuracy tests require database, run separately
    ],

    // Performance and accuracy tests run separately with database:
    // npm run test:performance - runs src/__tests__/performance/**/*.perf.test.ts
    // npm run test:accuracy - runs src/__tests__/accuracy/**/*.accuracy.test.ts

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

    // Global setup and teardown
    // Note: Property tests (src/__tests__/property/**) don't require database setup
    // They are pure tests that only read files and don't need external services
    globalSetup: ["./src/__tests__/setup/global-setup.ts"],
    globalTeardown: ["./src/__tests__/setup/global-teardown.ts"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      enabled: false, // Enable with --coverage flag
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./development/reports/coverage",

      // Coverage thresholds (95% line, 90% branch minimum)
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 95,
        statements: 95,
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
        ] // Full output in CI
      : ["verbose"], // Clean output for local development

    // Performance optimization
    // TEMPORARY: Disable parallel execution to fix test isolation issues
    // Tests are failing when run in parallel due to shared database state
    // TODO: Implement unique test prefixes per file to enable parallel execution
    pool: "threads", // Use worker threads
    poolOptions: {
      threads: {
        singleThread: true, // Run tests sequentially to prevent race conditions
        isolate: true, // Isolate test files
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
    },

    // Setup files (run before each test file)
    setupFiles: ["./src/__tests__/setup/test-environment.ts"],
  },
});
