/**
 * Migration Validator Tests
 *
 * Tests for migration file validation and health checks.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MigrationValidator } from "../../../database/migration-validator";
import type { Migration } from "../../../database/schema-migration";

describe("MigrationValidator", () => {
  const testDir = join(process.cwd(), "tmp", "test-migrations");

  beforeAll(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("validateMigration", () => {
    it("should validate a valid migration", () => {
      // Create valid migration files
      writeFileSync(
        join(testDir, "001_test.sql"),
        "CREATE TABLE IF NOT EXISTS test (id TEXT PRIMARY KEY);"
      );
      writeFileSync(join(testDir, "001_test_down.sql"), "DROP TABLE IF EXISTS test;");

      const validator = new MigrationValidator(testDir);
      const migration: Migration = {
        version: 1,
        name: "test",
        upFile: "001_test.sql",
        downFile: "001_test_down.sql",
      };

      const result = validator.validateMigration(migration);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing up file", () => {
      const validator = new MigrationValidator(testDir);
      const migration: Migration = {
        version: 99,
        name: "missing",
        upFile: "099_missing.sql",
        downFile: "099_missing_down.sql",
      };

      const result = validator.validateMigration(migration);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Up migration file not found: 099_missing.sql");
    });

    it("should detect missing down file", () => {
      // Create only up file
      writeFileSync(join(testDir, "002_partial.sql"), "CREATE TABLE partial (id TEXT);");

      const validator = new MigrationValidator(testDir);
      const migration: Migration = {
        version: 2,
        name: "partial",
        upFile: "002_partial.sql",
        downFile: "002_partial_down.sql",
      };

      const result = validator.validateMigration(migration);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Down migration file not found: 002_partial_down.sql");
    });

    it("should detect empty migration files", () => {
      writeFileSync(join(testDir, "003_empty.sql"), "");
      writeFileSync(join(testDir, "003_empty_down.sql"), "");

      const validator = new MigrationValidator(testDir);
      const migration: Migration = {
        version: 3,
        name: "empty",
        upFile: "003_empty.sql",
        downFile: "003_empty_down.sql",
      };

      const result = validator.validateMigration(migration);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("up migration file is empty");
      expect(result.errors).toContain("down migration file is empty");
    });

    it("should detect invalid version number", () => {
      writeFileSync(join(testDir, "000_invalid.sql"), "SELECT 1;");
      writeFileSync(join(testDir, "000_invalid_down.sql"), "SELECT 1;");

      const validator = new MigrationValidator(testDir);
      const migration: Migration = {
        version: 0,
        name: "invalid",
        upFile: "000_invalid.sql",
        downFile: "000_invalid_down.sql",
      };

      const result = validator.validateMigration(migration);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid version number: 0");
    });

    it("should detect empty migration name", () => {
      writeFileSync(join(testDir, "004_noname.sql"), "SELECT 1;");
      writeFileSync(join(testDir, "004_noname_down.sql"), "SELECT 1;");

      const validator = new MigrationValidator(testDir);
      const migration: Migration = {
        version: 4,
        name: "",
        upFile: "004_noname.sql",
        downFile: "004_noname_down.sql",
      };

      const result = validator.validateMigration(migration);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Migration name is empty");
    });

    it("should warn about DROP DATABASE", () => {
      writeFileSync(join(testDir, "005_dangerous.sql"), "DROP DATABASE production;");
      writeFileSync(join(testDir, "005_dangerous_down.sql"), "SELECT 1;");

      const validator = new MigrationValidator(testDir);
      const migration: Migration = {
        version: 5,
        name: "dangerous",
        upFile: "005_dangerous.sql",
        downFile: "005_dangerous_down.sql",
      };

      const result = validator.validateMigration(migration);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("DROP DATABASE is not allowed in migrations");
    });

    it("should warn about CREATE TABLE without IF NOT EXISTS", () => {
      writeFileSync(join(testDir, "006_notidempotent.sql"), "CREATE TABLE test (id TEXT);");
      writeFileSync(join(testDir, "006_notidempotent_down.sql"), "DROP TABLE IF EXISTS test;");

      const validator = new MigrationValidator(testDir);
      const migration: Migration = {
        version: 6,
        name: "notidempotent",
        upFile: "006_notidempotent.sql",
        downFile: "006_notidempotent_down.sql",
      };

      const result = validator.validateMigration(migration);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("CREATE TABLE without IF NOT EXISTS may fail on re-run");
    });

    it("should warn about DROP TABLE without IF EXISTS", () => {
      writeFileSync(
        join(testDir, "007_dropnocheck.sql"),
        "CREATE TABLE IF NOT EXISTS test (id TEXT);"
      );
      writeFileSync(join(testDir, "007_dropnocheck_down.sql"), "DROP TABLE test;");

      const validator = new MigrationValidator(testDir);
      const migration: Migration = {
        version: 7,
        name: "dropnocheck",
        upFile: "007_dropnocheck.sql",
        downFile: "007_dropnocheck_down.sql",
      };

      const result = validator.validateMigration(migration);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "DROP TABLE without IF EXISTS may fail if table doesn't exist"
      );
    });

    it("should warn about comment-only migrations", () => {
      writeFileSync(
        join(testDir, "008_comments.sql"),
        "-- This is just a comment\n-- Another comment"
      );
      writeFileSync(join(testDir, "008_comments_down.sql"), "-- Rollback comment");

      const validator = new MigrationValidator(testDir);
      const migration: Migration = {
        version: 8,
        name: "comments",
        upFile: "008_comments.sql",
        downFile: "008_comments_down.sql",
      };

      const result = validator.validateMigration(migration);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("up migration contains only comments");
      expect(result.warnings).toContain("down migration contains only comments");
    });
  });

  describe("validateAll", () => {
    it("should validate multiple migrations", () => {
      writeFileSync(join(testDir, "010_valid1.sql"), "CREATE TABLE IF NOT EXISTS t1 (id TEXT);");
      writeFileSync(join(testDir, "010_valid1_down.sql"), "DROP TABLE IF EXISTS t1;");
      writeFileSync(join(testDir, "011_valid2.sql"), "CREATE TABLE IF NOT EXISTS t2 (id TEXT);");
      writeFileSync(join(testDir, "011_valid2_down.sql"), "DROP TABLE IF EXISTS t2;");

      const validator = new MigrationValidator(testDir);
      const migrations: Migration[] = [
        { version: 10, name: "valid1", upFile: "010_valid1.sql", downFile: "010_valid1_down.sql" },
        { version: 11, name: "valid2", upFile: "011_valid2.sql", downFile: "011_valid2_down.sql" },
      ];

      const report = validator.validateAll(migrations);

      expect(report.isValid).toBe(true);
      expect(report.totalMigrations).toBe(2);
      expect(report.validMigrations).toBe(2);
      expect(report.invalidMigrations).toBe(0);
    });

    it("should report invalid migrations in batch", () => {
      writeFileSync(join(testDir, "012_valid.sql"), "CREATE TABLE IF NOT EXISTS t3 (id TEXT);");
      writeFileSync(join(testDir, "012_valid_down.sql"), "DROP TABLE IF EXISTS t3;");

      const validator = new MigrationValidator(testDir);
      const migrations: Migration[] = [
        { version: 12, name: "valid", upFile: "012_valid.sql", downFile: "012_valid_down.sql" },
        {
          version: 13,
          name: "invalid",
          upFile: "013_missing.sql",
          downFile: "013_missing_down.sql",
        },
      ];

      const report = validator.validateAll(migrations);

      expect(report.isValid).toBe(false);
      expect(report.totalMigrations).toBe(2);
      expect(report.validMigrations).toBe(1);
      expect(report.invalidMigrations).toBe(1);
    });
  });

  describe("checkSequence", () => {
    it("should detect no gaps in sequential migrations", () => {
      const validator = new MigrationValidator(testDir);
      const migrations: Migration[] = [
        { version: 1, name: "first", upFile: "001.sql", downFile: "001_down.sql" },
        { version: 2, name: "second", upFile: "002.sql", downFile: "002_down.sql" },
        { version: 3, name: "third", upFile: "003.sql", downFile: "003_down.sql" },
      ];

      const result = validator.checkSequence(migrations);

      expect(result.hasGaps).toBe(false);
      expect(result.gaps).toHaveLength(0);
    });

    it("should detect gaps in migration sequence", () => {
      const validator = new MigrationValidator(testDir);
      const migrations: Migration[] = [
        { version: 1, name: "first", upFile: "001.sql", downFile: "001_down.sql" },
        { version: 3, name: "third", upFile: "003.sql", downFile: "003_down.sql" },
        { version: 5, name: "fifth", upFile: "005.sql", downFile: "005_down.sql" },
      ];

      const result = validator.checkSequence(migrations);

      expect(result.hasGaps).toBe(true);
      expect(result.gaps).toContain(2);
      expect(result.gaps).toContain(4);
    });
  });

  describe("generateDryRunReport", () => {
    it("should generate report for pending migrations", () => {
      const validator = new MigrationValidator(testDir);
      const pendingMigrations: Migration[] = [
        { version: 3, name: "third", upFile: "003.sql", downFile: "003_down.sql" },
        { version: 4, name: "fourth", upFile: "004.sql", downFile: "004_down.sql" },
      ];

      const report = validator.generateDryRunReport(pendingMigrations, 2);

      expect(report).toContain("Current database version: 2");
      expect(report).toContain("Pending migrations: 2");
      expect(report).toContain("3. third");
      expect(report).toContain("4. fourth");
      expect(report).toContain("database will be at version 4");
    });

    it("should report when database is up to date", () => {
      const validator = new MigrationValidator(testDir);

      const report = validator.generateDryRunReport([], 4);

      expect(report).toContain("Database is up to date at version 4");
      expect(report).toContain("No migrations to apply");
    });
  });

  describe("generateRollbackPlan", () => {
    it("should generate rollback plan", () => {
      const validator = new MigrationValidator(testDir);
      const migrations: Migration[] = [
        { version: 1, name: "first", upFile: "001.sql", downFile: "001_down.sql" },
        { version: 2, name: "second", upFile: "002.sql", downFile: "002_down.sql" },
        { version: 3, name: "third", upFile: "003.sql", downFile: "003_down.sql" },
      ];

      const plan = validator.generateRollbackPlan(3, 1, migrations);

      expect(plan).toContain("Current database version: 3");
      expect(plan).toContain("Target version: 1");
      expect(plan).toContain("Migrations to rollback: 2");
      expect(plan).toContain("3. third");
      expect(plan).toContain("2. second");
      expect(plan).toContain("WARNING: Rollback may result in data loss");
    });

    it("should report when no rollback needed", () => {
      const validator = new MigrationValidator(testDir);
      const migrations: Migration[] = [
        { version: 1, name: "first", upFile: "001.sql", downFile: "001_down.sql" },
      ];

      const plan = validator.generateRollbackPlan(1, 2, migrations);

      expect(plan).toContain("Target version 2 is not less than current version 1");
      expect(plan).toContain("No rollback needed");
    });
  });

  describe("getMigrationFiles", () => {
    it("should return empty array for non-existent directory", () => {
      const validator = new MigrationValidator("/nonexistent/path");
      const files = validator.getMigrationFiles();

      expect(files).toHaveLength(0);
    });

    it("should parse migration files from directory", () => {
      // Create test migration files
      writeFileSync(join(testDir, "020_test_migration.sql"), "SELECT 1;");
      writeFileSync(join(testDir, "020_test_migration_down.sql"), "SELECT 1;");

      const validator = new MigrationValidator(testDir);
      const files = validator.getMigrationFiles();

      const testMigration = files.find((f) => f.version === 20);
      expect(testMigration).toBeDefined();
      expect(testMigration?.name).toBe("test_migration");
      expect(testMigration?.upExists).toBe(true);
    });
  });
});
