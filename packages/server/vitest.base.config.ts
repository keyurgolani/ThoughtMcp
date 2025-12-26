import { defineConfig, type UserConfig } from "vitest/config";

/**
 * Base Vitest configuration with shared settings for all test configurations.
 *
 * This configuration provides common settings that are extended by:
 * - vitest.config.ts (local tests - unit + integration with mocks)
 * - vitest.e2e.config.ts (E2E tests - real dependencies)
 *
 * The test architecture uses two categories:
 * - Local Tests: Unit + Integration tests with mocked external dependencies
 * - E2E Tests: End-to-end tests with real PostgreSQL and Ollama
 *
 * Requirements: 14.1, 14.9
 * - 14.1: Two categories - Local Tests and E2E Tests
 * - 14.9: Simplified test infrastructure
 */

/**
 * Shared test configuration settings.
 * These settings are common across all test configurations.
 */
export const sharedTestConfig: UserConfig["test"] = {
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

  // Environment variables for tests
  env: {
    NODE_ENV: "test",
  },

  // Snapshot configuration
  resolveSnapshotPath: (testPath, snapExtension) => {
    return testPath.replace(/\.test\.ts$/, `.test.ts${snapExtension}`);
  },
};

/**
 * Coverage configuration with 75% minimum thresholds.
 * Used by local tests only - E2E tests disable coverage thresholds.
 *
 * Requirements: 14.8
 * - Coverage is measured from local tests only
 */
export const coverageConfig: UserConfig["test"]["coverage"] = {
  provider: "v8",
  enabled: false, // Enable with --coverage flag
  reporter: ["text", "json", "html", "lcov"],
  reportsDirectory: "../../development/reports/coverage",

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
};

/**
 * Get reporters configuration based on environment.
 * In CI: verbose + JSON + HTML reports
 * Local: verbose only
 */
export function getReporters(): UserConfig["test"]["reporters"] {
  if (process.env.CI) {
    return [
      "verbose",
      ["json", { outputFile: "./development/reports/test-results.json" }],
      ["html", { outputFile: "./development/reports/test-results.html" }],
    ];
  }
  return ["verbose"];
}

/**
 * Base Vitest configuration.
 * Individual configs (vitest.config.ts, vitest.e2e.config.ts) should
 * define their own complete configurations, using these shared settings
 * as a reference.
 *
 * Requirements: 14.1, 14.9
 */
export default defineConfig({
  test: {
    ...sharedTestConfig,
    coverage: coverageConfig,
    reporters: getReporters(),
    watchExclude: ["node_modules/**", "dist/**", "coverage/**"],
  },
});
