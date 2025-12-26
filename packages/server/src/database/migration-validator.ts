/**
 * Migration Validator
 *
 * Validates migration files before execution to catch common issues.
 * Provides dry-run capability and migration health checks.
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { Migration } from "./schema-migration.js";

/**
 * Validation result for a single migration
 */
export interface MigrationValidationResult {
  migration: Migration;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Overall validation report
 */
export interface ValidationReport {
  isValid: boolean;
  totalMigrations: number;
  validMigrations: number;
  invalidMigrations: number;
  results: MigrationValidationResult[];
  summary: string;
}

/**
 * Migration file info
 */
export interface MigrationFileInfo {
  version: number;
  name: string;
  upFile: string;
  downFile: string;
  upExists: boolean;
  downExists: boolean;
  upContent?: string;
  downContent?: string;
}

/**
 * Migration Validator class
 * Validates migration files and provides health checks
 */
export class MigrationValidator {
  private migrationsDir: string;

  constructor(migrationsDir: string) {
    this.migrationsDir = migrationsDir;
  }

  /**
   * Validate all migrations in the directory
   */
  validateAll(migrations: Migration[]): ValidationReport {
    const results: MigrationValidationResult[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const migration of migrations) {
      const result = this.validateMigration(migration);
      results.push(result);

      if (result.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }

    const isValid = invalidCount === 0;
    const summary = isValid
      ? `All ${validCount} migrations are valid`
      : `${invalidCount} of ${migrations.length} migrations have issues`;

    return {
      isValid,
      totalMigrations: migrations.length,
      validMigrations: validCount,
      invalidMigrations: invalidCount,
      results,
      summary,
    };
  }

  /**
   * Validate a single migration
   */
  validateMigration(migration: Migration): MigrationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check up file exists
    const upPath = join(this.migrationsDir, migration.upFile);
    if (!existsSync(upPath)) {
      errors.push(`Up migration file not found: ${migration.upFile}`);
    } else {
      // Validate up file content
      const upContent = readFileSync(upPath, "utf-8");
      this.validateSqlContent(upContent, "up", errors, warnings);
    }

    // Check down file exists
    const downPath = join(this.migrationsDir, migration.downFile);
    if (!existsSync(downPath)) {
      errors.push(`Down migration file not found: ${migration.downFile}`);
    } else {
      // Validate down file content
      const downContent = readFileSync(downPath, "utf-8");
      this.validateSqlContent(downContent, "down", errors, warnings);
    }

    // Validate version number
    if (migration.version <= 0) {
      errors.push(`Invalid version number: ${migration.version}`);
    }

    // Validate name
    if (!migration.name || migration.name.trim() === "") {
      errors.push("Migration name is empty");
    }

    return {
      migration,
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate SQL content for common issues
   */
  private validateSqlContent(
    content: string,
    type: "up" | "down",
    errors: string[],
    warnings: string[]
  ): void {
    const trimmed = content.trim();
    if (trimmed === "") {
      errors.push(`${type} migration file is empty`);
      return;
    }

    const hasStatements = this.checkSqlStatements(content, type, errors, warnings);
    if (!hasStatements) {
      warnings.push(`${type} migration contains only comments`);
    }

    this.checkIdempotency(content, type, warnings);
  }

  /**
   * Check SQL statements for dangerous operations
   */
  private checkSqlStatements(
    content: string,
    type: "up" | "down",
    errors: string[],
    warnings: string[]
  ): boolean {
    const lines = content.split("\n");
    let hasStatements = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("--") || trimmedLine === "") {
        continue;
      }
      hasStatements = true;

      if (type === "up") {
        this.checkUpMigrationLine(trimmedLine, errors, warnings);
      }
    }

    return hasStatements;
  }

  /**
   * Check a single line in an up migration for dangerous operations
   */
  private checkUpMigrationLine(line: string, errors: string[], warnings: string[]): void {
    const upperLine = line.toUpperCase();
    if (upperLine.includes("DROP DATABASE")) {
      errors.push("DROP DATABASE is not allowed in migrations");
    }
    if (upperLine.includes("TRUNCATE") && !line.includes("CASCADE")) {
      warnings.push("TRUNCATE without CASCADE may fail with foreign keys");
    }
  }

  /**
   * Check for IF EXISTS / IF NOT EXISTS for idempotency
   */
  private checkIdempotency(content: string, type: "up" | "down", warnings: string[]): void {
    const upperContent = content.toUpperCase();

    if (type === "up") {
      if (upperContent.includes("CREATE TABLE") && !upperContent.includes("IF NOT EXISTS")) {
        warnings.push("CREATE TABLE without IF NOT EXISTS may fail on re-run");
      }
      if (upperContent.includes("CREATE INDEX") && !upperContent.includes("IF NOT EXISTS")) {
        warnings.push("CREATE INDEX without IF NOT EXISTS may fail on re-run");
      }
    } else {
      if (upperContent.includes("DROP TABLE") && !upperContent.includes("IF EXISTS")) {
        warnings.push("DROP TABLE without IF EXISTS may fail if table doesn't exist");
      }
      if (upperContent.includes("DROP INDEX") && !upperContent.includes("IF EXISTS")) {
        warnings.push("DROP INDEX without IF EXISTS may fail if index doesn't exist");
      }
    }
  }

  /**
   * Get migration file info from directory
   */
  getMigrationFiles(): MigrationFileInfo[] {
    if (!existsSync(this.migrationsDir)) {
      return [];
    }

    const files = readdirSync(this.migrationsDir);
    const upFiles = files.filter((f) => f.endsWith(".sql") && !f.includes("_down"));
    const migrations: MigrationFileInfo[] = [];

    for (const upFile of upFiles) {
      const match = upFile.match(/^(\d+)_(.+)\.sql$/);
      if (!match) continue;

      const version = parseInt(match[1], 10);
      const name = match[2];
      const downFile = `${match[1]}_${name}_down.sql`;

      const upPath = join(this.migrationsDir, upFile);
      const downPath = join(this.migrationsDir, downFile);

      migrations.push({
        version,
        name,
        upFile,
        downFile,
        upExists: existsSync(upPath),
        downExists: existsSync(downPath),
        upContent: existsSync(upPath) ? readFileSync(upPath, "utf-8") : undefined,
        downContent: existsSync(downPath) ? readFileSync(downPath, "utf-8") : undefined,
      });
    }

    return migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * Check migration sequence for gaps
   */
  checkSequence(migrations: Migration[]): { hasGaps: boolean; gaps: number[] } {
    const versions = migrations.map((m) => m.version).sort((a, b) => a - b);
    const gaps: number[] = [];

    for (let i = 1; i < versions.length; i++) {
      const expected = versions[i - 1] + 1;
      if (versions[i] !== expected) {
        // There's a gap
        for (let v = expected; v < versions[i]; v++) {
          gaps.push(v);
        }
      }
    }

    return {
      hasGaps: gaps.length > 0,
      gaps,
    };
  }

  /**
   * Generate dry-run report for pending migrations
   */
  generateDryRunReport(pendingMigrations: Migration[], currentVersion: number): string {
    if (pendingMigrations.length === 0) {
      return `Database is up to date at version ${currentVersion}. No migrations to apply.`;
    }

    const lines: string[] = [
      `Current database version: ${currentVersion}`,
      `Pending migrations: ${pendingMigrations.length}`,
      "",
      "Migrations to be applied:",
    ];

    for (const migration of pendingMigrations) {
      lines.push(`  ${migration.version}. ${migration.name}`);
      lines.push(`     Up file: ${migration.upFile}`);
    }

    lines.push("");
    lines.push(
      `After migration, database will be at version ${pendingMigrations[pendingMigrations.length - 1].version}`
    );

    return lines.join("\n");
  }

  /**
   * Generate rollback plan
   */
  generateRollbackPlan(
    currentVersion: number,
    targetVersion: number,
    migrations: Migration[]
  ): string {
    if (targetVersion >= currentVersion) {
      return `Target version ${targetVersion} is not less than current version ${currentVersion}. No rollback needed.`;
    }

    const migrationsToRollback = migrations
      .filter((m) => m.version > targetVersion && m.version <= currentVersion)
      .reverse();

    if (migrationsToRollback.length === 0) {
      return `No migrations to rollback between version ${targetVersion} and ${currentVersion}.`;
    }

    const lines: string[] = [
      `Current database version: ${currentVersion}`,
      `Target version: ${targetVersion}`,
      `Migrations to rollback: ${migrationsToRollback.length}`,
      "",
      "Rollback order:",
    ];

    for (const migration of migrationsToRollback) {
      lines.push(`  ${migration.version}. ${migration.name}`);
      lines.push(`     Down file: ${migration.downFile}`);
    }

    lines.push("");
    lines.push(`After rollback, database will be at version ${targetVersion}`);
    lines.push("");
    lines.push("⚠️  WARNING: Rollback may result in data loss!");

    return lines.join("\n");
  }
}
