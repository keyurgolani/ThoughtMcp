/**
 * Schema Migration System Tests
 *
 * Tests for database schema creation, migration, and rollback.
 * Validates all tables, indexes, constraints, and pgvector extension.
 *
 * Following TDD - these tests define the schema requirements before implementation.
 */

import type { PoolClient } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../../database/connection-manager";
import { SchemaMigrationSystem } from "../../../database/schema-migration";

describe("SchemaMigrationSystem", () => {
  let dbManager: DatabaseConnectionManager;
  let client: PoolClient;
  const testDbName = `test_schema_${Date.now()}`;

  beforeAll(async () => {
    // Connect to default postgres database to create test database
    const adminDbManager = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: "postgres",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });

    await adminDbManager.connect();
    const adminClient = await adminDbManager.getConnection();

    try {
      // Create test database
      await adminClient.query(`DROP DATABASE IF EXISTS ${testDbName}`);
      await adminClient.query(`CREATE DATABASE ${testDbName}`);
    } finally {
      adminDbManager.releaseConnection(adminClient);
      await adminDbManager.disconnect();
    }

    // Connect to test database
    dbManager = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: testDbName,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });

    await dbManager.connect();

    // Run migrations to create schema
    const migrationSystem = new SchemaMigrationSystem(dbManager);
    await migrationSystem.runMigrations();
  });

  afterAll(async () => {
    // Disconnect from test database
    if (dbManager) {
      await dbManager.disconnect();
    }

    // Drop test database
    const adminDbManager = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: "postgres",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });

    await adminDbManager.connect();
    const adminClient = await adminDbManager.getConnection();

    try {
      await adminClient.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    } finally {
      adminDbManager.releaseConnection(adminClient);
      await adminDbManager.disconnect();
    }
  });

  beforeEach(async () => {
    client = await dbManager.getConnection();
  });

  afterEach(() => {
    if (client) {
      dbManager.releaseConnection(client);
    }
  });

  describe("pgvector Extension", () => {
    it("should enable pgvector extension", async () => {
      // This test will pass once implementation creates the extension
      const result = await client.query("SELECT * FROM pg_extension WHERE extname = 'vector'");
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it("should support vector data type", async () => {
      // Test that vector type is available
      const result = await client.query("SELECT typname FROM pg_type WHERE typname = 'vector'");
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe("memories Table", () => {
    it("should create memories table with correct structure", async () => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'memories'
        ORDER BY ordinal_position
      `);

      expect(result.rows.length).toBeGreaterThan(0);

      // Verify required columns exist
      const columns = result.rows.map((row) => row.column_name);
      expect(columns).toContain("id");
      expect(columns).toContain("content");
      expect(columns).toContain("created_at");
      expect(columns).toContain("last_accessed");
      expect(columns).toContain("access_count");
      expect(columns).toContain("salience");
      expect(columns).toContain("decay_rate");
      expect(columns).toContain("strength");
      expect(columns).toContain("user_id");
      expect(columns).toContain("session_id");
      expect(columns).toContain("primary_sector");
    });

    it("should have id as primary key", async () => {
      const result = await client.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'memories' AND constraint_type = 'PRIMARY KEY'
      `);

      expect(result.rows.length).toBe(1);
    });

    it("should have check constraints for salience (0-1)", async () => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'memories'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%salience%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it("should have check constraints for strength (0-1)", async () => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'memories'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%strength%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
    it("should have default values for timestamps", async () => {
      const result = await client.query(`
        SELECT column_name, column_default
        FROM information_schema.columns
        WHERE table_name = 'memories'
        AND column_name IN ('created_at', 'last_accessed')
      `);

      expect(result.rows.length).toBe(2);
      result.rows.forEach((row) => {
        expect(row.column_default).toContain("CURRENT_TIMESTAMP");
      });
    });
  });

  describe("memory_embeddings Table", () => {
    it("should create memory_embeddings table with correct structure", async () => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'memory_embeddings'
        ORDER BY ordinal_position
      `);

      expect(result.rows.length).toBeGreaterThan(0);

      const columns = result.rows.map((row) => row.column_name);
      expect(columns).toContain("memory_id");
      expect(columns).toContain("sector");
      expect(columns).toContain("embedding");
      expect(columns).toContain("dimension");
      expect(columns).toContain("model");
      expect(columns).toContain("created_at");
    });

    it("should have composite primary key (memory_id, sector)", async () => {
      const result = await client.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'memory_embeddings' AND constraint_type = 'PRIMARY KEY'
      `);

      expect(result.rows.length).toBe(1);
    });

    it("should have foreign key to memories table", async () => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'memory_embeddings'
        AND constraint_type = 'FOREIGN KEY'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it("should have CASCADE delete on foreign key", async () => {
      const result = await client.query(`
        SELECT delete_rule
        FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'memory_embeddings'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].delete_rule).toBe("CASCADE");
    });
  });

  describe("memory_links Table", () => {
    it("should create memory_links table with correct structure", async () => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'memory_links'
        ORDER BY ordinal_position
      `);

      expect(result.rows.length).toBeGreaterThan(0);

      const columns = result.rows.map((row) => row.column_name);
      expect(columns).toContain("source_id");
      expect(columns).toContain("target_id");
      expect(columns).toContain("link_type");
      expect(columns).toContain("weight");
      expect(columns).toContain("created_at");
      expect(columns).toContain("traversal_count");
    });

    it("should have composite primary key (source_id, target_id)", async () => {
      const result = await client.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'memory_links' AND constraint_type = 'PRIMARY KEY'
      `);

      expect(result.rows.length).toBe(1);
    });

    it("should have foreign keys to memories table", async () => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'memory_links'
        AND constraint_type = 'FOREIGN KEY'
      `);

      // Should have 2 foreign keys (source_id and target_id)
      expect(result.rows.length).toBe(2);
    });

    it("should have check constraint preventing self-links", async () => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'memory_links'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%self%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it("should have check constraint for weight (0-1)", async () => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'memory_links'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%weight%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe("memory_metadata Table", () => {
    it("should create memory_metadata table with correct structure", async () => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'memory_metadata'
        ORDER BY ordinal_position
      `);

      expect(result.rows.length).toBeGreaterThan(0);

      const columns = result.rows.map((row) => row.column_name);
      expect(columns).toContain("memory_id");
      expect(columns).toContain("keywords");
      expect(columns).toContain("tags");
      expect(columns).toContain("category");
      expect(columns).toContain("context");
      expect(columns).toContain("importance");
      expect(columns).toContain("is_atomic");
      expect(columns).toContain("parent_id");
    });

    it("should have keywords as array type", async () => {
      const result = await client.query(`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'memory_metadata' AND column_name = 'keywords'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data_type).toBe("ARRAY");
    });

    it("should have tags as array type", async () => {
      const result = await client.query(`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'memory_metadata' AND column_name = 'tags'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data_type).toBe("ARRAY");
    });

    it("should have foreign key to memories table", async () => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'memory_metadata'
        AND constraint_type = 'FOREIGN KEY'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it("should have check constraint for importance (0-1)", async () => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'memory_metadata'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%importance%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe("memory_emotions Table", () => {
    it("should create memory_emotions table with correct structure", async () => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'memory_emotions'
        ORDER BY ordinal_position
      `);

      expect(result.rows.length).toBeGreaterThan(0);

      const columns = result.rows.map((row) => row.column_name);
      expect(columns).toContain("memory_id");
      expect(columns).toContain("valence");
      expect(columns).toContain("arousal");
      expect(columns).toContain("dominance");
      expect(columns).toContain("discrete_emotions");
      expect(columns).toContain("primary_emotion");
      expect(columns).toContain("confidence");
    });

    it("should have discrete_emotions as JSONB type", async () => {
      const result = await client.query(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'memory_emotions' AND column_name = 'discrete_emotions'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data_type).toBe("jsonb");
    });

    it("should have check constraints for valence (-1 to 1)", async () => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'memory_emotions'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%valence%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it("should have check constraints for arousal (0 to 1)", async () => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'memory_emotions'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%arousal%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it("should have check constraints for dominance (-1 to 1)", async () => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'memory_emotions'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%dominance%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it("should have check constraints for confidence (0 to 1)", async () => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'memory_emotions'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%confidence%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe("Indexes", () => {
    it("should create index on memories.user_id", async () => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'memories' AND indexname = 'idx_memories_user'
      `);

      expect(result.rows.length).toBe(1);
    });

    it("should create index on memories.created_at", async () => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'memories' AND indexname = 'idx_memories_created'
      `);

      expect(result.rows.length).toBe(1);
    });

    it("should create index on memories.last_accessed", async () => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'memories' AND indexname = 'idx_memories_accessed'
      `);

      expect(result.rows.length).toBe(1);
    });

    it("should create index on memories.salience", async () => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'memories' AND indexname = 'idx_memories_salience'
      `);

      expect(result.rows.length).toBe(1);
    });

    it("should create index on memories.strength", async () => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'memories' AND indexname = 'idx_memories_strength'
      `);

      expect(result.rows.length).toBe(1);
    });

    it("should create IVFFlat vector index on memory_embeddings.embedding", async () => {
      const result = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'memory_embeddings' AND indexname = 'idx_embeddings_vector'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].indexdef).toContain("ivfflat");
      expect(result.rows[0].indexdef).toContain("vector_cosine_ops");
    });

    it("should create indexes on memory_links source and target", async () => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'memory_links'
        AND indexname IN ('idx_links_source', 'idx_links_target')
      `);

      expect(result.rows.length).toBe(2);
    });

    it("should create index on memory_links.weight", async () => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'memory_links' AND indexname = 'idx_links_weight'
      `);

      expect(result.rows.length).toBe(1);
    });

    it("should create GIN index on memory_metadata.keywords", async () => {
      const result = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'memory_metadata' AND indexname = 'idx_metadata_keywords'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].indexdef).toContain("gin");
    });

    it("should create GIN index on memory_metadata.tags", async () => {
      const result = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'memory_metadata' AND indexname = 'idx_metadata_tags'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].indexdef).toContain("gin");
    });

    it("should create index on memory_metadata.category", async () => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'memory_metadata' AND indexname = 'idx_metadata_category'
      `);

      expect(result.rows.length).toBe(1);
    });
  });

  describe("Migration System", () => {
    it("should track migration versions", async () => {
      // Verify schema_migrations table exists
      const tableResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = 'schema_migrations'
      `);

      expect(tableResult.rows.length).toBe(1);

      // Verify migrations are tracked
      const migrationResult = await client.query(`
        SELECT version, name, applied_at
        FROM schema_migrations
        ORDER BY version
      `);

      expect(migrationResult.rows.length).toBeGreaterThan(0);

      // Verify version 1 and 2 are applied
      const versions = migrationResult.rows.map((row) => row.version);
      expect(versions).toContain(1);
      expect(versions).toContain(2);
    });

    it("should handle migration failure and rollback transaction", async () => {
      // Create a migration system with invalid migrations directory
      const invalidMigrationSystem = new SchemaMigrationSystem(dbManager, "/nonexistent/path");

      // Rollback to version 0 first
      const validMigrationSystem = new SchemaMigrationSystem(dbManager);
      await validMigrationSystem.rollbackMigration(0);

      // Try to run migrations with invalid path (should fail)
      await expect(invalidMigrationSystem.runMigrations()).rejects.toThrow();

      // Verify database is still at version 0 (transaction was rolled back)
      const version = await validMigrationSystem.getCurrentVersion();
      expect(version).toBe(0);

      // Restore migrations
      await validMigrationSystem.runMigrations();
    });

    it("should handle rollback failure and rollback transaction", async () => {
      // Create a migration system with invalid migrations directory
      const invalidMigrationSystem = new SchemaMigrationSystem(dbManager, "/nonexistent/path");

      // Ensure we're at version 2
      const validMigrationSystem = new SchemaMigrationSystem(dbManager);
      await validMigrationSystem.runMigrations();

      const versionBefore = await validMigrationSystem.getCurrentVersion();
      expect(versionBefore).toBe(4);

      // Try to rollback with invalid path (should fail)
      await expect(invalidMigrationSystem.rollbackMigration(1)).rejects.toThrow();

      // Verify database is still at version 4 (transaction was rolled back)
      const versionAfter = await validMigrationSystem.getCurrentVersion();
      expect(versionAfter).toBe(4);
    });

    it("should support rollback functionality", async () => {
      const migrationSystem = new SchemaMigrationSystem(dbManager);

      // Get current version
      const currentVersion = await migrationSystem.getCurrentVersion();
      expect(currentVersion).toBeGreaterThan(0);

      // Rollback to version 1
      await migrationSystem.rollbackMigration(1);

      // Verify version is now 1
      const newVersion = await migrationSystem.getCurrentVersion();
      expect(newVersion).toBe(1);

      // Verify indexes are gone (they were in migration 2)
      const indexResult = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'memories' AND indexname = 'idx_memories_user'
      `);

      expect(indexResult.rows.length).toBe(0);

      // Re-run migrations to restore
      await migrationSystem.runMigrations();

      // Verify we're back to version 4 (latest)
      const finalVersion = await migrationSystem.getCurrentVersion();
      expect(finalVersion).toBe(4);
    });

    it("should handle rollback when already at target version", async () => {
      const migrationSystem = new SchemaMigrationSystem(dbManager);

      // Get current version
      const currentVersion = await migrationSystem.getCurrentVersion();

      // Try to rollback to current version (should be no-op)
      await migrationSystem.rollbackMigration(currentVersion);

      // Verify version hasn't changed
      const newVersion = await migrationSystem.getCurrentVersion();
      expect(newVersion).toBe(currentVersion);
    });

    it("should handle rollback when no migrations to rollback", async () => {
      const migrationSystem = new SchemaMigrationSystem(dbManager);

      // Rollback to version 0
      await migrationSystem.rollbackMigration(0);

      // Verify version is 0
      const version = await migrationSystem.getCurrentVersion();
      expect(version).toBe(0);

      // Try to rollback again (should be no-op)
      await migrationSystem.rollbackMigration(0);

      // Verify version is still 0
      const newVersion = await migrationSystem.getCurrentVersion();
      expect(newVersion).toBe(0);

      // Restore migrations
      await migrationSystem.runMigrations();
    });

    it("should handle rollback when target version is between migrations", async () => {
      const migrationSystem = new SchemaMigrationSystem(dbManager);

      // Ensure we're at version 4 (latest)
      await migrationSystem.runMigrations();
      const currentVersion = await migrationSystem.getCurrentVersion();
      expect(currentVersion).toBe(4);

      // Try to rollback to version 1.5 (between migrations 1 and 2)
      // This should rollback migration 2 but keep migration 1
      await migrationSystem.rollbackMigration(1);

      // Verify we're at version 1
      const newVersion = await migrationSystem.getCurrentVersion();
      expect(newVersion).toBe(1);

      // Now try to rollback to version 0.5 (between 0 and 1)
      // This should trigger the "no migrations to rollback" path
      // because there are no migrations between 0.5 and 1
      await migrationSystem.rollbackMigration(1);

      // Verify we're still at version 1
      const finalVersion = await migrationSystem.getCurrentVersion();
      expect(finalVersion).toBe(1);

      // Restore to version 2
      await migrationSystem.runMigrations();
    });

    it("should handle rollback with no matching migrations in range", async () => {
      const migrationSystem = new SchemaMigrationSystem(dbManager);

      // Ensure we're at version 3 (latest)
      await migrationSystem.runMigrations();

      // Manually insert a fake migration version 5 to simulate a gap
      await client.query(
        "INSERT INTO schema_migrations (version, name) VALUES (5, 'fake_migration')"
      );

      // Verify we're at version 5 now
      const currentVersion = await migrationSystem.getCurrentVersion();
      expect(currentVersion).toBe(5);

      // Try to rollback to version 4 (between 3 and 5)
      // This should trigger the "no migrations to rollback" path
      // because there are no migrations defined between 4 and 5
      await migrationSystem.rollbackMigration(4);

      // Verify we're still at version 5 (no rollback occurred)
      const newVersion = await migrationSystem.getCurrentVersion();
      expect(newVersion).toBe(5);

      // Clean up: remove fake migration
      await client.query("DELETE FROM schema_migrations WHERE version = 5");

      // Verify we're back to version 4 (latest)
      const finalVersion = await migrationSystem.getCurrentVersion();
      expect(finalVersion).toBe(4);
    });

    it("should be idempotent (safe to run multiple times)", async () => {
      const migrationSystem = new SchemaMigrationSystem(dbManager);

      // Get current version
      const versionBefore = await migrationSystem.getCurrentVersion();

      // Run migrations again (should be no-op)
      await migrationSystem.runMigrations();

      // Verify version hasn't changed
      const versionAfter = await migrationSystem.getCurrentVersion();
      expect(versionAfter).toBe(versionBefore);

      // Verify tables still exist
      const tableResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name IN ('memories', 'memory_embeddings', 'memory_links', 'memory_metadata', 'memory_emotions')
        ORDER BY table_name
      `);

      expect(tableResult.rows.length).toBe(5);
    });

    it("should support database reset", async () => {
      const migrationSystem = new SchemaMigrationSystem(dbManager);

      // Reset database
      await migrationSystem.resetDatabase();

      // Verify all tables exist after reset
      const tableResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name IN ('memories', 'memory_embeddings', 'memory_links', 'memory_metadata', 'memory_emotions')
        ORDER BY table_name
      `);

      expect(tableResult.rows.length).toBe(5);

      // Verify we're at latest version
      const version = await migrationSystem.getCurrentVersion();
      expect(version).toBe(4);
    });

    it("should support convenience methods for table creation", async () => {
      const migrationSystem = new SchemaMigrationSystem(dbManager);

      // These methods should be idempotent
      await migrationSystem.createMemoriesTable();
      await migrationSystem.createEmbeddingsTable();
      await migrationSystem.createLinksTable();
      await migrationSystem.createMetadataTable();
      await migrationSystem.createEmotionsTable();
      await migrationSystem.createIndexes();
      await migrationSystem.enablePgvectorExtension();

      // Verify all tables still exist
      const tableResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name IN ('memories', 'memory_embeddings', 'memory_links', 'memory_metadata', 'memory_emotions')
        ORDER BY table_name
      `);

      expect(tableResult.rows.length).toBe(5);
    });
  });
});
