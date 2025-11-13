/**
 * Global Setup for Test Framework
 *
 * Runs once before all tests start.
 * Used for:
 * - Setting up test database infrastructure
 * - Initializing test environment
 * - Loading test configuration
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

export default async function globalSetup(): Promise<void> {
  console.log("🚀 Starting ThoughtMCP Test Framework...");

  // Set test environment
  process.env.NODE_ENV = "test";

  // Load .env.test file if it exists
  const envTestPath = resolve(process.cwd(), ".env.test");
  if (existsSync(envTestPath)) {
    const envContent = readFileSync(envTestPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=");
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }

  // Validate required environment variables
  const requiredEnvVars = [
    "DATABASE_URL",
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingVars.join(", ")}`);
    console.warn("   Using default test configuration...");

    // Set default test environment variables
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5433/thoughtmcp_test";
    process.env.DB_HOST = process.env.DB_HOST ?? "localhost";
    process.env.DB_PORT = process.env.DB_PORT ?? "5433";
    process.env.DB_NAME = process.env.DB_NAME ?? "thoughtmcp_test";
    process.env.DB_USER = process.env.DB_USER ?? "test";
    process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? "test";
  }

  // Set default test configuration
  process.env.DB_POOL_SIZE = process.env.DB_POOL_SIZE ?? "5";
  process.env.EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "mock";
  process.env.EMBEDDING_DIMENSION = process.env.EMBEDDING_DIMENSION ?? "1536";
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "ERROR";
  process.env.CACHE_TTL = process.env.CACHE_TTL ?? "300";
  process.env.MAX_PROCESSING_TIME = process.env.MAX_PROCESSING_TIME ?? "30000";

  console.log("✅ Test environment configured");
  console.log(`   Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`   Embedding Model: ${process.env.EMBEDDING_MODEL}`);
  console.log(`   Log Level: ${process.env.LOG_LEVEL}`);
}
