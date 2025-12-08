import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for property-based tests.
 *
 * Property tests are pure tests that don't require external services
 * like databases or Ollama. They only read files and validate properties.
 */
export default defineConfig({
  test: {
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Node environment
    environment: "node",

    // Only include property tests
    include: ["src/__tests__/property/**/*.test.ts"],
    exclude: ["node_modules", "dist", "coverage"],

    // Test timeouts
    testTimeout: 30000, // 30s for property tests (they run many iterations)
    hookTimeout: 10000,

    // Test isolation and cleanup
    isolate: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    // No retries for deterministic tests
    retry: 0,

    // NO global setup/teardown - property tests don't need database
    // globalSetup: [],
    // globalTeardown: [],

    // Reporters
    reporters: process.env.CI
      ? ["verbose", ["json", { outputFile: "./development/reports/property-test-results.json" }]]
      : ["verbose"],

    // Performance optimization
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false, // Property tests can run in parallel
        isolate: true,
      },
    },

    // Watch mode configuration
    watch: false,
    watchExclude: ["node_modules/**", "dist/**", "coverage/**"],

    // Environment variables for tests
    env: {
      NODE_ENV: "test",
    },
  },
});
