/**
 * Schema Migration System
 *
 * Manages database schema migrations with versioning and rollback support.
 * Implements idempotent migrations for PostgreSQL with pgvector.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import type { PoolClient } from "pg";
import { fileURLToPath } from "url";
import { Logger } from "../utils/logger.js";
import type { DatabaseConnectionManager } from "./connection-manager";

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Migration definition
 */
export interface Migration {
  version: number;
  name: string;
  upFile: string; // Path to SQL file for migration
  downFile: string; // Path to SQL file for rollback
  appliedAt?: Date;
}

/**
 * Schema Migration System class
 * Manages database schema creation, migration, and rollback
 */
export class SchemaMigrationSystem {
  private dbManager: DatabaseConnectionManager;
  private migrationsDir: string;
  private migrations: Migration[];

  constructor(dbManager: DatabaseConnectionManager, migrationsDir?: string) {
    this.dbManager = dbManager;
    this.migrationsDir = migrationsDir ?? join(__dirname, "migrations");

    // Define migrations in order
    this.migrations = [
      {
        version: 1,
        name: "initial_schema",
        upFile: "001_initial_schema.sql",
        downFile: "001_initial_schema_down.sql",
      },
      {
        version: 2,
        name: "create_indexes",
        upFile: "002_create_indexes.sql",
        downFile: "002_create_indexes_down.sql",
      },
      {
        version: 3,
        name: "reinforcement_history",
        upFile: "003_reinforcement_history.sql",
        downFile: "003_reinforcement_history_down.sql",
      },
      {
        version: 4,
        name: "full_text_search",
        upFile: "004_full_text_search.sql",
        downFile: "004_full_text_search_down.sql",
      },
      {
        version: 5,
        name: "embedding_status",
        upFile: "005_embedding_status.sql",
        downFile: "005_embedding_status_down.sql",
      },
    ];
  }

  /**
   * Initialize migration tracking table
   */
  private async initializeMigrationTable(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Get current schema version
   */
  async getCurrentVersion(): Promise<number> {
    const client = await this.dbManager.getConnection();
    try {
      await this.initializeMigrationTable(client);

      const result = await client.query("SELECT MAX(version) as version FROM schema_migrations");

      return result.rows[0]?.version ?? 0;
    } finally {
      this.dbManager.releaseConnection(client);
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    // Find migrations that need to be applied
    const pendingMigrations = this.migrations.filter((m) => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      // All migrations are up to date
      return;
    }

    // Running pending migrations
    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
    }

    // All migrations completed successfully
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: Migration): Promise<void> {
    const client = await this.dbManager.beginTransaction();

    try {
      Logger.info(`  ⏳ Applying migration ${migration.version}: ${migration.name}...`);

      // Read migration SQL
      const sqlPath = join(this.migrationsDir, migration.upFile);
      const sql = readFileSync(sqlPath, "utf-8");

      // Execute the entire SQL file as a single statement
      // PostgreSQL can handle multiple statements separated by semicolons
      await client.query(sql);

      // Record migration
      await client.query("INSERT INTO schema_migrations (version, name) VALUES ($1, $2)", [
        migration.version,
        migration.name,
      ]);

      await this.dbManager.commitTransaction(client);

      Logger.info(`  ✅ Migration ${migration.version} applied successfully`);
    } catch (error) {
      await this.dbManager.rollbackTransaction(client);
      throw new Error(
        `Failed to apply migration ${migration.version}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Rollback to a specific version
   */
  async rollbackMigration(targetVersion: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    if (targetVersion >= currentVersion) {
      Logger.info("✅ Already at or below target version");
      return;
    }

    // Find migrations to rollback (in reverse order)
    const migrationsToRollback = this.migrations
      .filter((m) => m.version > targetVersion && m.version <= currentVersion)
      .reverse();

    if (migrationsToRollback.length === 0) {
      Logger.info("✅ No migrations to rollback");
      return;
    }

    Logger.info(`📦 Rolling back ${migrationsToRollback.length} migrations...`);

    for (const migration of migrationsToRollback) {
      await this.rollbackSingleMigration(migration);
    }

    Logger.info("✅ Rollback completed successfully");
  }

  /**
   * Rollback a single migration
   */
  private async rollbackSingleMigration(migration: Migration): Promise<void> {
    const client = await this.dbManager.beginTransaction();

    try {
      Logger.info(`  ⏳ Rolling back migration ${migration.version}: ${migration.name}...`);

      // Read and execute rollback SQL
      const sqlPath = join(this.migrationsDir, migration.downFile);
      const sql = readFileSync(sqlPath, "utf-8");

      await client.query(sql);

      // Remove migration record
      await client.query("DELETE FROM schema_migrations WHERE version = $1", [migration.version]);

      await this.dbManager.commitTransaction(client);

      Logger.info(`  ✅ Migration ${migration.version} rolled back successfully`);
    } catch (error) {
      await this.dbManager.rollbackTransaction(client);
      throw new Error(
        `Failed to rollback migration ${migration.version}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create memories table
   */
  async createMemoriesTable(): Promise<void> {
    // This is handled by migration 001
    await this.runMigrations();
  }

  /**
   * Create embeddings table
   */
  async createEmbeddingsTable(): Promise<void> {
    // This is handled by migration 001
    await this.runMigrations();
  }

  /**
   * Create links table
   */
  async createLinksTable(): Promise<void> {
    // This is handled by migration 001
    await this.runMigrations();
  }

  /**
   * Create metadata table
   */
  async createMetadataTable(): Promise<void> {
    // This is handled by migration 001
    await this.runMigrations();
  }

  /**
   * Create emotions table
   */
  async createEmotionsTable(): Promise<void> {
    // This is handled by migration 001
    await this.runMigrations();
  }

  /**
   * Create all indexes
   */
  async createIndexes(): Promise<void> {
    // This is handled by migration 002
    await this.runMigrations();
  }

  /**
   * Enable pgvector extension
   */
  async enablePgvectorExtension(): Promise<void> {
    // This is handled by migration 001
    await this.runMigrations();
  }

  /**
   * Reset database (drop all tables and rerun migrations)
   */
  async resetDatabase(): Promise<void> {
    Logger.info("🗑️  Resetting database...");

    // Rollback all migrations
    await this.rollbackMigration(0);

    // Rerun all migrations
    await this.runMigrations();

    Logger.info("✅ Database reset complete");
  }
}
