/**
 * Migration Process Integration Tests
 *
 * Tests the complete migration lifecycle including:
 * - Fresh database setup
 * - Migration from empty to current schema
 * - Rollback scenarios
 * - Migration with existing data
 */

import type { PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../database/connection-manager";
import { SchemaMigrationSystem } from "../../database/schema-migration";

describe("Migration Process Integration", () => {
  let adminDbManager: DatabaseConnectionManager;
  let testDbManager: DatabaseConnectionManager;
  const testDbName = `test_migration_process_${Date.now()}`;

  beforeAll(async () => {
    // Connect to default postgres database to create test database
    adminDbManager = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: "postgres",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });

    await adminDbManager.connect();
    const adminClient = await adminDbManager.getConnection();

    try {
      // Create fresh test database
      await adminClient.query(`DROP DATABASE IF EXISTS ${testDbName}`);
      await adminClient.query(`CREATE DATABASE ${testDbName}`);
    } finally {
      adminDbManager.releaseConnection(adminClient);
    }

    // Connect to test database
    testDbManager = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: testDbName,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });

    await testDbManager.connect();
  });

  afterAll(async () => {
    // Disconnect from test database
    if (testDbManager) {
      await testDbManager.disconnect();
    }

    // Drop test database
    if (adminDbManager) {
      const adminClient = await adminDbManager.getConnection();
      try {
        await adminClient.query(`DROP DATABASE IF EXISTS ${testDbName}`);
      } finally {
        adminDbManager.releaseConnection(adminClient);
        await adminDbManager.disconnect();
      }
    }
  }, 60000); // 60 second timeout for cleanup

  describe("Fresh Database Setup", () => {
    it("should start with version 0 on empty database", async () => {
      const migrationSystem = new SchemaMigrationSystem(testDbManager);
      const version = await migrationSystem.getCurrentVersion();

      expect(version).toBe(0);
    });

    it("should create schema_migrations table on first access", async () => {
      const client = await testDbManager.getConnection();
      try {
        const result = await client.query(`
          SELECT table_name FROM information_schema.tables
          WHERE table_name = 'schema_migrations'
        `);
        expect(result.rows.length).toBe(1);
      } finally {
        testDbManager.releaseConnection(client);
      }
    });
  });

  describe("Migration from Empty to Current Schema", () => {
    it("should apply all migrations successfully", async () => {
      const migrationSystem = new SchemaMigrationSystem(testDbManager);

      // Run all migrations
      await migrationSystem.runMigrations();

      // Verify we're at latest version (4)
      const version = await migrationSystem.getCurrentVersion();
      expect(version).toBe(4);
    });

    it("should create all required tables", async () => {
      const client = await testDbManager.getConnection();
      try {
        const result = await client.query(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN ('memories', 'memory_embeddings', 'memory_links', 'memory_metadata', 'memory_emotions')
          ORDER BY table_name
        `);

        expect(result.rows.length).toBe(5);
        expect(result.rows.map((r) => r.table_name)).toEqual([
          "memories",
          "memory_embeddings",
          "memory_emotions",
          "memory_links",
          "memory_metadata",
        ]);
      } finally {
        testDbManager.releaseConnection(client);
      }
    });

    it("should enable pgvector extension", async () => {
      const client = await testDbManager.getConnection();
      try {
        const result = await client.query(`
          SELECT * FROM pg_extension WHERE extname = 'vector'
        `);
        expect(result.rows.length).toBe(1);
      } finally {
        testDbManager.releaseConnection(client);
      }
    });

    it("should create all required indexes", async () => {
      const client = await testDbManager.getConnection();
      try {
        const result = await client.query(`
          SELECT indexname FROM pg_indexes
          WHERE schemaname = 'public'
          AND indexname LIKE 'idx_%'
          ORDER BY indexname
        `);

        // Should have indexes for memories, embeddings, links, metadata
        expect(result.rows.length).toBeGreaterThan(10);

        const indexNames = result.rows.map((r) => r.indexname);
        expect(indexNames).toContain("idx_memories_user");
        expect(indexNames).toContain("idx_memories_created");
        expect(indexNames).toContain("idx_embeddings_vector");
        expect(indexNames).toContain("idx_metadata_keywords");
      } finally {
        testDbManager.releaseConnection(client);
      }
    });

    it("should track all applied migrations", async () => {
      const client = await testDbManager.getConnection();
      try {
        const result = await client.query(`
          SELECT version, name FROM schema_migrations ORDER BY version
        `);

        expect(result.rows.length).toBe(4);
        expect(result.rows[0].version).toBe(1);
        expect(result.rows[0].name).toBe("initial_schema");
        expect(result.rows[3].version).toBe(4);
        expect(result.rows[3].name).toBe("full_text_search");
      } finally {
        testDbManager.releaseConnection(client);
      }
    });
  });

  describe("Rollback Scenarios", () => {
    it("should rollback to version 2 successfully", async () => {
      const migrationSystem = new SchemaMigrationSystem(testDbManager);

      // Rollback to version 2
      await migrationSystem.rollbackMigration(2);

      // Verify version
      const version = await migrationSystem.getCurrentVersion();
      expect(version).toBe(2);
    });

    it("should remove rolled back migrations from tracking", async () => {
      const client = await testDbManager.getConnection();
      try {
        const result = await client.query(`
          SELECT version FROM schema_migrations ORDER BY version
        `);

        expect(result.rows.length).toBe(2);
        expect(result.rows.map((r) => r.version)).toEqual([1, 2]);
      } finally {
        testDbManager.releaseConnection(client);
      }
    });

    it("should remove full-text search column after rollback", async () => {
      const client = await testDbManager.getConnection();
      try {
        const result = await client.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'memories' AND column_name = 'search_vector'
        `);

        // search_vector should be removed after rolling back migration 4
        expect(result.rows.length).toBe(0);
      } finally {
        testDbManager.releaseConnection(client);
      }
    });

    it("should re-apply migrations after rollback", async () => {
      const migrationSystem = new SchemaMigrationSystem(testDbManager);

      // Re-apply all migrations
      await migrationSystem.runMigrations();

      // Verify we're back at latest version
      const version = await migrationSystem.getCurrentVersion();
      expect(version).toBe(4);
    });

    it("should rollback to version 0 (empty schema)", async () => {
      const migrationSystem = new SchemaMigrationSystem(testDbManager);

      // Rollback all migrations
      await migrationSystem.rollbackMigration(0);

      // Verify version
      const version = await migrationSystem.getCurrentVersion();
      expect(version).toBe(0);
    });

    it("should remove all tables after full rollback", async () => {
      const client = await testDbManager.getConnection();
      try {
        const result = await client.query(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN ('memories', 'memory_embeddings', 'memory_links', 'memory_metadata', 'memory_emotions')
        `);

        expect(result.rows.length).toBe(0);
      } finally {
        testDbManager.releaseConnection(client);
      }
    });
  });

  describe("Migration with Existing Data", () => {
    let client: PoolClient;

    beforeAll(async () => {
      // Re-apply migrations first
      const migrationSystem = new SchemaMigrationSystem(testDbManager);
      await migrationSystem.runMigrations();
    });

    it("should preserve data during migration", async () => {
      client = await testDbManager.getConnection();

      try {
        // Insert test data
        await client.query(`
          INSERT INTO memories (id, content, user_id, primary_sector)
          VALUES ('test-memory-1', 'Test content for migration', 'user-1', 'semantic')
        `);

        // Verify data exists
        const result = await client.query(`SELECT * FROM memories WHERE id = 'test-memory-1'`);
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].content).toBe("Test content for migration");
      } finally {
        testDbManager.releaseConnection(client);
      }
    });

    it("should maintain data integrity after rollback and re-migration", async () => {
      const migrationSystem = new SchemaMigrationSystem(testDbManager);

      // Rollback to version 3 (before full-text search)
      await migrationSystem.rollbackMigration(3);

      // Re-apply migration 4
      await migrationSystem.runMigrations();

      // Verify data still exists
      client = await testDbManager.getConnection();
      try {
        const result = await client.query(`SELECT * FROM memories WHERE id = 'test-memory-1'`);
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].content).toBe("Test content for migration");
      } finally {
        testDbManager.releaseConnection(client);
      }
    });

    it("should update search_vector for existing data after migration", async () => {
      client = await testDbManager.getConnection();
      try {
        // Migration 4 should have updated search_vector for existing rows
        const result = await client.query(`
          SELECT search_vector FROM memories WHERE id = 'test-memory-1'
        `);

        expect(result.rows.length).toBe(1);
        expect(result.rows[0].search_vector).not.toBeNull();
      } finally {
        testDbManager.releaseConnection(client);
      }
    });

    it("should handle cascade deletes correctly", async () => {
      client = await testDbManager.getConnection();
      try {
        // Insert related data
        await client.query(`
          INSERT INTO memory_metadata (memory_id, keywords, tags, importance)
          VALUES ('test-memory-1', ARRAY['test', 'migration'], ARRAY['integration'], 0.8)
        `);

        // Delete parent memory
        await client.query(`DELETE FROM memories WHERE id = 'test-memory-1'`);

        // Verify cascade delete worked
        const metadataResult = await client.query(`
          SELECT * FROM memory_metadata WHERE memory_id = 'test-memory-1'
        `);
        expect(metadataResult.rows.length).toBe(0);
      } finally {
        testDbManager.releaseConnection(client);
      }
    });
  });

  describe("Idempotency", () => {
    it("should be safe to run migrations multiple times", async () => {
      const migrationSystem = new SchemaMigrationSystem(testDbManager);

      // Run migrations multiple times
      await migrationSystem.runMigrations();
      await migrationSystem.runMigrations();
      await migrationSystem.runMigrations();

      // Should still be at version 4
      const version = await migrationSystem.getCurrentVersion();
      expect(version).toBe(4);
    });

    it("should not duplicate migration records", async () => {
      const client = await testDbManager.getConnection();
      try {
        const result = await client.query(`
          SELECT version, COUNT(*) as count
          FROM schema_migrations
          GROUP BY version
          HAVING COUNT(*) > 1
        `);

        // No duplicates should exist
        expect(result.rows.length).toBe(0);
      } finally {
        testDbManager.releaseConnection(client);
      }
    });
  });

  describe("Error Handling", () => {
    it("should rollback transaction on migration failure", async () => {
      const migrationSystem = new SchemaMigrationSystem(testDbManager, "/nonexistent/path");

      // Rollback to version 0 first
      await new SchemaMigrationSystem(testDbManager).rollbackMigration(0);

      // Try to run migrations with invalid path (should fail)
      await expect(migrationSystem.runMigrations()).rejects.toThrow();

      // Verify database is still at version 0 (transaction was rolled back)
      const versionAfter = await new SchemaMigrationSystem(testDbManager).getCurrentVersion();
      expect(versionAfter).toBe(0);

      // Restore migrations for other tests
      await new SchemaMigrationSystem(testDbManager).runMigrations();
    });
  });

  describe("Database Reset", () => {
    it("should reset database to clean state", async () => {
      const migrationSystem = new SchemaMigrationSystem(testDbManager);

      // Reset database
      await migrationSystem.resetDatabase();

      // Verify we're at latest version
      const version = await migrationSystem.getCurrentVersion();
      expect(version).toBe(4);

      // Verify all tables exist
      const client = await testDbManager.getConnection();
      try {
        const result = await client.query(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN ('memories', 'memory_embeddings', 'memory_links', 'memory_metadata', 'memory_emotions')
        `);
        expect(result.rows.length).toBe(5);
      } finally {
        testDbManager.releaseConnection(client);
      }
    });
  });
});
