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
      "src/__tests__/**/*.ts",
      "src/server/**/*.ts", // Allow console in server files for logging
      "src/utils/logger.ts",
      "src/utils/MonitoringDashboard.ts",
      "src/utils/PerformanceMonitor.ts",
      "src/utils/config.ts",
      "src/utils/version.ts",
    ],
    rules: {
      "no-console": "off", // Allow console statements in examples and tests
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
