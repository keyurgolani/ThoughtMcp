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
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
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
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
];
