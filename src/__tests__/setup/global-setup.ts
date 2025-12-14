/**
 * Global Setup for Test Framework
 *
 * Runs once before all tests start.
 * Used for:
 * - Setting up test database infrastructure
 * - Initializing test environment
 * - Loading test configuration
 * - Running database migrations
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { DatabaseConnectionManager } from "../../database/connection-manager.js";
import { SchemaMigrationSystem } from "../../database/schema-migration.js";

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
  process.env.EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "nomic-embed-text";
  process.env.EMBEDDING_DIMENSION = process.env.EMBEDDING_DIMENSION ?? "768";
  process.env.OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "ERROR";
  process.env.CACHE_TTL = process.env.CACHE_TTL ?? "300";
  process.env.MAX_PROCESSING_TIME = process.env.MAX_PROCESSING_TIME ?? "30000";

  console.log("✅ Test environment configured");
  console.log(`   Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`   Embedding Model: ${process.env.EMBEDDING_MODEL}`);
  console.log(`   Log Level: ${process.env.LOG_LEVEL}`);

  // Run database migrations
  console.log("📦 Running database migrations...");
  const dbManager = new DatabaseConnectionManager({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5433", 10),
    database: process.env.DB_NAME || "thoughtmcp_test",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    poolSize: parseInt(process.env.DB_POOL_SIZE || "5", 10),
  });

  try {
    await dbManager.connect();
    const migrationSystem = new SchemaMigrationSystem(dbManager);
    await migrationSystem.runMigrations();
    console.log("✅ Database migrations completed");
  } catch (error) {
    console.error("❌ Failed to run migrations:", error);
    throw error;
  } finally {
    await dbManager.disconnect();
  }
}
