/**
 * Test Environment Setup
 *
 * Runs before each test file.
 * Used for:
 * - Setting up test-specific environment
 * - Configuring test utilities
 * - Initializing test state
 */

import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";

// Global test state
let testStartTime: number;

beforeAll(() => {
  testStartTime = Date.now();
});

afterAll(() => {
  const duration = Date.now() - testStartTime;
  if (duration > 5000) {
    console.warn(`⚠️  Test suite took ${duration}ms (consider optimization)`);
  }
});

beforeEach(() => {
  // Reset any global state before each test
  // This ensures test isolation
});

afterEach(() => {
  // Cleanup after each test
  // This ensures no test pollution
});

// Export test environment utilities
export const testEnv = {
  isDevelopment: process.env.NODE_ENV === "development",
  isTest: process.env.NODE_ENV === "test",
  isCI: process.env.CI === "true",

  // Database configuration
  database: {
    url: process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5433/thoughtmcp_test",
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5433", 10),
    name: process.env.DB_NAME ?? "thoughtmcp_test",
    user: process.env.DB_USER ?? "test",
    password: process.env.DB_PASSWORD ?? "test",
    poolSize: parseInt(process.env.DB_POOL_SIZE ?? "5", 10),
  },

  // Embedding configuration
  embedding: {
    model: process.env.EMBEDDING_MODEL ?? "mock",
    dimension: parseInt(process.env.EMBEDDING_DIMENSION ?? "1536", 10),
  },

  // Test configuration
  test: {
    logLevel: process.env.LOG_LEVEL ?? "ERROR",
    cacheTTL: parseInt(process.env.CACHE_TTL ?? "300", 10),
    maxProcessingTime: parseInt(process.env.MAX_PROCESSING_TIME ?? "30000", 10),
  },
};
