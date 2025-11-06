import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    globalSetup: "./src/__tests__/globalSetup.ts",
    testTimeout: 10000, // 10 seconds for integration tests
    setupFiles: ["./src/__tests__/testSetup.ts"], // Clean test output setup
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "dist/",
        "coverage/",
        "**/*.test.ts",
        "**/*.config.ts",
        "**/types.ts",
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
        // Realistic targets for critical components based on current coverage
        "src/cognitive/**": {
          branches: 80,
          functions: 90,
          lines: 85,
          statements: 85,
        },
        "src/server/**": {
          branches: 60,
          functions: 80,
          lines: 55,
          statements: 55,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
