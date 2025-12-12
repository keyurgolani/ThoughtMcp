import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        NodeJS: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error", // Strict: no 'any' type
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",

      // General code quality
      "prefer-const": "error",
      "no-var": "error",
      "no-unused-vars": "off",
      "no-undef": "off", // TypeScript handles this
      "no-console": "warn", // Warn about console statements
      "no-debugger": "error", // Error on debugger statements
      "no-alert": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "prefer-template": "error",
      "prefer-arrow-callback": "error",
      "arrow-spacing": "error",
      "no-duplicate-imports": "error",

      // Cognitive architecture specific rules
      "max-lines-per-function": ["error", { max: 100, skipBlankLines: true, skipComments: true }],
      "max-depth": ["error", 4],
      complexity: ["error", 15],
      "max-params": ["error", 5],
    },
  },
  // Allow console statements in examples, tests, and utility files where appropriate
  {
    files: [
      "src/examples/**/*.ts",
      "src/server/**/*.ts", // Allow console in server files for logging
      "src/utils/logger.ts",
      "src/utils/MonitoringDashboard.ts",
      "src/utils/PerformanceMonitor.ts",
      "src/utils/config.ts",
      "src/utils/version.ts",
    ],
    rules: {
      "no-console": "off", // Allow console statements in examples
    },
  },
  // Relaxed rules for test files - per steering documentation, 'any' is acceptable
  // in test files for mocks, invalid input testing, and accessing internals
  {
    files: ["src/__tests__/**/*.ts"],
    rules: {
      "no-console": "off", // Allow console statements in tests
      "@typescript-eslint/no-explicit-any": "off", // Allow 'any' for mocks and test utilities
      "@typescript-eslint/explicit-function-return-type": "off", // Tests don't need explicit return types
      "max-lines-per-function": "off", // Test functions can be large (setup, multiple assertions)
      complexity: "off", // Test functions can have complex setup/teardown
      "max-depth": "off", // Tests may have nested describe/it blocks
      "@typescript-eslint/no-non-null-assertion": "off", // Allow non-null assertions in tests
      "@typescript-eslint/prefer-nullish-coalescing": "off", // Allow || for default values in tests
      "no-duplicate-imports": "off", // Allow duplicate imports in tests (common with mocking)
      "max-params": "off", // Test helper functions may have many parameters
      "@typescript-eslint/no-unused-vars": "off", // Allow unused vars in tests (setup variables)
    },
  },
  // Allow larger functions in MCP server handlers (complex tool implementations)
  {
    files: ["src/server/mcp-server.ts"],
    rules: {
      "max-lines-per-function": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
  // Allow larger/complex functions in memory repository (complex database operations)
  {
    files: ["src/memory/memory-repository.ts"],
    rules: {
      "max-lines-per-function": ["error", { max: 120, skipBlankLines: true, skipComments: true }],
      complexity: ["error", 30],
    },
  },
  // Allow more parameters in error factory functions
  {
    files: ["src/utils/errors.ts"],
    rules: {
      "max-params": ["error", 7],
    },
  },
  // Allow control character regex in input validator (intentional security patterns)
  {
    files: ["src/security/input-validator.ts"],
    rules: {
      "no-control-regex": "off",
    },
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      ".vitest/**",
      "src/__tests__/templates/**/*.template.ts",
    ],
  },
];
