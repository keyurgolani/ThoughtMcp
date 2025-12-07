#!/usr/bin/env npx tsx
/**
 * ThoughtMCP Database Migration CLI
 *
 * Production-ready migration tool for managing database schema changes.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts <command> [options]
 *
 * Commands:
 *   status     Show current migration status
 *   up         Apply all pending migrations
 *   down <ver> Rollback to specific version
 *   validate   Validate all migration files
 *   dry-run    Show what migrations would be applied
 *   reset      Reset database (development only)
 *
 * Environment Variables:
 *   DB_HOST     Database host (default: localhost)
 *   DB_PORT     Database port (default: 5432)
 *   DB_NAME     Database name (required)
 *   DB_USER     Database user (required)
 *   DB_PASSWORD Database password (required)
 */

import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { DatabaseConnectionManager } from "../src/database/connection-manager.js";
import { MigrationValidator } from "../src/database/migration-validator.js";
import { SchemaMigrationSystem } from "../src/database/schema-migration.js";

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color?: keyof typeof colors): void {
  if (color) {
    console.log(`${colors[color]}${message}${colors.reset}`);
  } else {
    console.log(message);
  }
}

function logError(message: string): void {
  console.error(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

function logSuccess(message: string): void {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function logWarning(message: string): void {
  console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}

function logInfo(message: string): void {
  console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

/**
 * Get database configuration from environment
 */
function getDatabaseConfig(): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
} {
  const host = process.env.DB_HOST || "localhost";
  const port = parseInt(process.env.DB_PORT || "5432", 10);
  const database = process.env.DB_NAME || process.env.DATABASE_NAME;
  const user = process.env.DB_USER || process.env.DATABASE_USER;
  const password = process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD;

  if (!database) {
    throw new Error("DB_NAME environment variable is required");
  }
  if (!user) {
    throw new Error("DB_USER environment variable is required");
  }
  if (!password) {
    throw new Error("DB_PASSWORD environment variable is required");
  }

  return { host, port, database, user, password };
}

/**
 * Show migration status
 */
async function showStatus(): Promise<void> {
  const config = getDatabaseConfig();
  const dbManager = new DatabaseConnectionManager(config);

  try {
    await dbManager.connect();
    const migrationSystem = new SchemaMigrationSystem(dbManager);
    const currentVersion = await migrationSystem.getCurrentVersion();

    log("\n📊 Database Migration Status", "cyan");
    log("═".repeat(40));
    log(`Database: ${config.database}`);
    log(`Host: ${config.host}:${config.port}`);
    log(`Current Version: ${currentVersion}`);

    // Get migration info
    const migrationsDir = join(__dirname, "../src/database/migrations");
    const validator = new MigrationValidator(migrationsDir);
    const files = validator.getMigrationFiles();

    log("\n📁 Migration Files:");
    for (const file of files) {
      const status = file.version <= currentVersion ? "✅" : "⏳";
      log(`  ${status} ${file.version}. ${file.name}`);
    }

    const pendingCount = files.filter((f) => f.version > currentVersion).length;
    if (pendingCount > 0) {
      logWarning(`\n${pendingCount} pending migration(s)`);
    } else {
      logSuccess("\nDatabase is up to date");
    }
  } finally {
    await dbManager.disconnect();
  }
}

/**
 * Apply pending migrations
 */
async function migrateUp(): Promise<void> {
  const config = getDatabaseConfig();
  const dbManager = new DatabaseConnectionManager(config);

  try {
    await dbManager.connect();
    const migrationSystem = new SchemaMigrationSystem(dbManager);

    const versionBefore = await migrationSystem.getCurrentVersion();
    logInfo(`Current version: ${versionBefore}`);
    logInfo("Applying pending migrations...\n");

    await migrationSystem.runMigrations();

    const versionAfter = await migrationSystem.getCurrentVersion();

    if (versionAfter > versionBefore) {
      logSuccess(`\nMigrated from version ${versionBefore} to ${versionAfter}`);
    } else {
      logSuccess("\nDatabase is already up to date");
    }
  } finally {
    await dbManager.disconnect();
  }
}

/**
 * Rollback to specific version
 */
async function migrateDown(targetVersion: number): Promise<void> {
  const config = getDatabaseConfig();
  const dbManager = new DatabaseConnectionManager(config);

  try {
    await dbManager.connect();
    const migrationSystem = new SchemaMigrationSystem(dbManager);

    const currentVersion = await migrationSystem.getCurrentVersion();

    if (targetVersion >= currentVersion) {
      logWarning(
        `Target version ${targetVersion} is not less than current version ${currentVersion}`
      );
      return;
    }

    logWarning(`⚠️  Rolling back from version ${currentVersion} to ${targetVersion}`);
    logWarning("This operation may result in data loss!\n");

    // In production, we'd want confirmation here
    // For now, proceed with rollback
    await migrationSystem.rollbackMigration(targetVersion);

    const newVersion = await migrationSystem.getCurrentVersion();
    logSuccess(`\nRolled back to version ${newVersion}`);
  } finally {
    await dbManager.disconnect();
  }
}

/**
 * Validate migration files
 */
async function validateMigrations(): Promise<void> {
  const migrationsDir = join(__dirname, "../src/database/migrations");
  const validator = new MigrationValidator(migrationsDir);

  log("\n🔍 Validating Migration Files", "cyan");
  log("═".repeat(40));

  // Get migrations from SchemaMigrationSystem
  const migrations = [
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
  ];

  const report = validator.validateAll(migrations);

  for (const result of report.results) {
    const status = result.isValid ? "✅" : "❌";
    log(`\n${status} Migration ${result.migration.version}: ${result.migration.name}`);

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        logError(`  ${error}`);
      }
    }

    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        logWarning(`  ${warning}`);
      }
    }
  }

  // Check sequence
  const sequenceCheck = validator.checkSequence(migrations);
  if (sequenceCheck.hasGaps) {
    logWarning(`\n⚠️  Migration sequence has gaps: ${sequenceCheck.gaps.join(", ")}`);
  }

  log("\n" + "═".repeat(40));
  if (report.isValid) {
    logSuccess(report.summary);
  } else {
    logError(report.summary);
    process.exit(1);
  }
}

/**
 * Show dry-run of pending migrations
 */
async function dryRun(): Promise<void> {
  const config = getDatabaseConfig();
  const dbManager = new DatabaseConnectionManager(config);

  try {
    await dbManager.connect();
    const migrationSystem = new SchemaMigrationSystem(dbManager);
    const currentVersion = await migrationSystem.getCurrentVersion();

    const migrationsDir = join(__dirname, "../src/database/migrations");
    const validator = new MigrationValidator(migrationsDir);

    // Get all migrations
    const allMigrations = [
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
    ];

    const pendingMigrations = allMigrations.filter((m) => m.version > currentVersion);

    log("\n🔮 Dry Run - Migration Preview", "cyan");
    log("═".repeat(40));
    log(validator.generateDryRunReport(pendingMigrations, currentVersion));
  } finally {
    await dbManager.disconnect();
  }
}

/**
 * Reset database (development only)
 */
async function resetDatabase(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    logError("Database reset is not allowed in production!");
    process.exit(1);
  }

  const config = getDatabaseConfig();
  const dbManager = new DatabaseConnectionManager(config);

  try {
    await dbManager.connect();
    const migrationSystem = new SchemaMigrationSystem(dbManager);

    logWarning("⚠️  Resetting database - ALL DATA WILL BE LOST!");
    logInfo("Rolling back all migrations...\n");

    await migrationSystem.resetDatabase();

    logSuccess("\nDatabase reset complete");
  } finally {
    await dbManager.disconnect();
  }
}

/**
 * Show help
 */
function showHelp(): void {
  log("\n📚 ThoughtMCP Database Migration Tool", "cyan");
  log("═".repeat(40));
  log("\nUsage: npx tsx scripts/migrate.ts <command> [options]\n");
  log("Commands:");
  log("  status     Show current migration status");
  log("  up         Apply all pending migrations");
  log("  down <ver> Rollback to specific version");
  log("  validate   Validate all migration files");
  log("  dry-run    Show what migrations would be applied");
  log("  reset      Reset database (development only)");
  log("\nEnvironment Variables:");
  log("  DB_HOST     Database host (default: localhost)");
  log("  DB_PORT     Database port (default: 5432)");
  log("  DB_NAME     Database name (required)");
  log("  DB_USER     Database user (required)");
  log("  DB_PASSWORD Database password (required)");
  log("\nExamples:");
  log("  npx tsx scripts/migrate.ts status");
  log("  npx tsx scripts/migrate.ts up");
  log("  npx tsx scripts/migrate.ts down 2");
  log("  npx tsx scripts/migrate.ts validate");
  log("  npx tsx scripts/migrate.ts dry-run");
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "status":
        await showStatus();
        break;
      case "up":
      case "migrate":
        await migrateUp();
        break;
      case "down":
      case "rollback":
        const targetVersion = parseInt(args[1], 10);
        if (isNaN(targetVersion)) {
          logError("Target version is required for rollback");
          logInfo("Usage: npx tsx scripts/migrate.ts down <version>");
          process.exit(1);
        }
        await migrateDown(targetVersion);
        break;
      case "validate":
        await validateMigrations();
        break;
      case "dry-run":
        await dryRun();
        break;
      case "reset":
        await resetDatabase();
        break;
      case "help":
      case "--help":
      case "-h":
        showHelp();
        break;
      default:
        if (command) {
          logError(`Unknown command: ${command}`);
        }
        showHelp();
        process.exit(command ? 1 : 0);
    }
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
