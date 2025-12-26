/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// Vitest Configuration for @thought/ui package
//
// This configuration is for UI tests that:
// - Use jsdom environment for React component testing
// - Run in parallel for fast feedback
// - Are part of the default test target (pnpm test)
//
// Test file patterns: src/**/*.{test,spec}.{ts,tsx}
//
// Requirements: 0.5 - Vitest configuration works across all packages
export default defineConfig({
  plugins: [react()],
  test: {
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // jsdom environment for React component testing
    environment: "jsdom",

    // Setup files (run before each test file)
    setupFiles: ["./src/__tests__/setup.ts"],

    // Test file patterns
    include: ["src/**/*.{test,spec}.{ts,tsx}"],

    // Test timeouts
    testTimeout: 10000, // 10s default for unit tests
    hookTimeout: 30000, // 30s for setup/teardown hooks

    // Test isolation and cleanup
    isolate: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    // No retries for deterministic tests
    retry: 0,

    // Watch mode disabled by default (use --watch flag)
    watch: false,

    // Coverage configuration
    coverage: {
      provider: "v8",
      enabled: false, // Enable with --coverage flag
      reporter: ["text", "json", "html", "lcov"],
      // Output to shared development/reports/coverage directory at monorepo root
      reportsDirectory: "../../development/reports/coverage/ui",

      // Coverage thresholds (75% minimum for all metrics)
      thresholds: {
        lines: 75,
        branches: 75,
        functions: 75,
        statements: 75,
      },

      // Files to include in coverage
      include: ["src/**/*.{ts,tsx}"],

      // Files to exclude from coverage
      exclude: [
        "node_modules/",
        "src/__tests__/",
        "dist/",
        "dist-node/",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/*.config.ts",
        "**/*.d.ts",
      ],

      // Report uncovered lines
      all: true,
      skipFull: false,
    },

    // Reporters
    reporters: process.env.CI
      ? [
          "verbose",
          ["json", { outputFile: "../../development/reports/ui-test-results.json" }],
          ["html", { outputFile: "../../development/reports/ui-test-results.html" }],
        ]
      : ["verbose"],

    // Watch mode configuration
    watchExclude: ["node_modules/**", "dist/**", "dist-node/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@stores": path.resolve(__dirname, "./src/stores"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@api": path.resolve(__dirname, "./src/api"),
      "@scenes": path.resolve(__dirname, "./src/scenes"),
    },
  },
});
