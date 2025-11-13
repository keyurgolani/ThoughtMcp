/**
 * Run migration 003 - Reinforcement History
 *
 * This script runs the reinforcement history migration directly.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { DatabaseConnectionManager } from "../src/database/connection-manager";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log("🔄 Running migration 003: Reinforcement History...");

  // Create database connection
  const db = new DatabaseConnectionManager({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5433"),
    database: process.env.DB_NAME || "thoughtmcp_test",
    user: process.env.DB_USER || "thoughtmcp_test",
    password: process.env.DB_PASSWORD || "test_password",
    poolSize: 5,
    connectionTimeout: 5000,
    idleTimeout: 30000,
  });

  try {
    await db.connect();
    console.log("✅ Connected to database");

    // Read migration SQL
    const sqlPath = join(__dirname, "../src/database/migrations/003_reinforcement_history.sql");
    const sql = readFileSync(sqlPath, "utf-8");

    // Execute migration
    const client = await db.getConnection();
    try {
      await client.query(sql);
      console.log("✅ Migration 003 applied successfully");
    } finally {
      db.releaseConnection(client);
    }

    await db.disconnect();
    console.log("✅ Disconnected from database");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
