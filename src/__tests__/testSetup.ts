/**
 * Test setup for clean output - suppresses info-level logs during tests
 * Following ThoughtMCP best practices for clean test output
 */

import { afterAll, beforeAll } from "vitest";

// Set environment for clean test output
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "WARN";
process.env.NODE_ENV = "test";

// Store original console methods
const originalLog = console.log;
const originalInfo = console.info;

// Suppress console methods during tests (except in debug mode)
if (process.env.LOG_LEVEL !== "DEBUG") {
  console.log = () => {};
  console.info = () => {};
}

// Restore console methods after tests (for cleanup)
export function restoreConsole(): void {
  console.log = originalLog;
  console.info = originalInfo;
}

// Global test environment setup
beforeAll(() => {
  // Ensure clean test environment
  if (process.env.LOG_LEVEL !== "DEBUG") {
    console.log = () => {};
    console.info = () => {};
  }
});

afterAll(() => {
  // Restore console for cleanup messages
  console.log = originalLog;
  console.info = originalInfo;
});
