#!/usr/bin/env tsx
/**
 * Configuration Validation Script
 *
 * Validates environment configuration for Thought deployment.
 * Run before starting the server to catch configuration issues early.
 *
 * Usage:
 *   npx tsx scripts/validate-config.ts
 *   npm run config:validate
 */

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ConfigRequirement {
  name: string;
  required: boolean;
  validator?: (value: string) => boolean;
  message?: string;
  defaultValue?: string;
}

const REQUIRED_CONFIGS: ConfigRequirement[] = [
  // Database Configuration
  {
    name: "DATABASE_URL",
    required: true,
    validator: (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
    message: "DATABASE_URL must be a valid PostgreSQL connection string",
  },
  {
    name: "DB_POOL_SIZE",
    required: false,
    validator: (v) => {
      const num = parseInt(v, 10);
      return !isNaN(num) && num >= 1 && num <= 100;
    },
    message: "DB_POOL_SIZE must be a number between 1 and 100",
    defaultValue: "20",
  },

  // Embedding Configuration
  {
    name: "EMBEDDING_MODEL",
    required: true,
    validator: (v) => ["ollama", "e5", "bge", "openai"].includes(v.toLowerCase()),
    message: "EMBEDDING_MODEL must be one of: ollama, e5, bge, openai",
  },
  {
    name: "EMBEDDING_DIMENSION",
    required: true,
    validator: (v) => {
      const num = parseInt(v, 10);
      return !isNaN(num) && [384, 768, 1024, 1536].includes(num);
    },
    message: "EMBEDDING_DIMENSION must be one of: 384, 768, 1024, 1536",
  },

  // Environment
  {
    name: "NODE_ENV",
    required: false,
    validator: (v) => ["development", "production", "test"].includes(v),
    message: "NODE_ENV must be one of: development, production, test",
    defaultValue: "production",
  },
  {
    name: "LOG_LEVEL",
    required: false,
    validator: (v) => ["DEBUG", "INFO", "WARN", "ERROR"].includes(v.toUpperCase()),
    message: "LOG_LEVEL must be one of: DEBUG, INFO, WARN, ERROR",
    defaultValue: "WARN",
  },

  // Performance
  {
    name: "CACHE_TTL",
    required: false,
    validator: (v) => {
      const num = parseInt(v, 10);
      return !isNaN(num) && num >= 0 && num <= 86400;
    },
    message: "CACHE_TTL must be a number between 0 and 86400 (24 hours)",
    defaultValue: "300",
  },
  {
    name: "MAX_PROCESSING_TIME",
    required: false,
    validator: (v) => {
      const num = parseInt(v, 10);
      return !isNaN(num) && num >= 1000 && num <= 300000;
    },
    message: "MAX_PROCESSING_TIME must be between 1000 and 300000 milliseconds",
    defaultValue: "30000",
  },
];

const OLLAMA_CONFIGS: ConfigRequirement[] = [
  {
    name: "OLLAMA_HOST",
    required: true,
    validator: (v) => {
      try {
        new URL(v);
        return true;
      } catch {
        return false;
      }
    },
    message: "OLLAMA_HOST must be a valid URL (e.g., http://localhost:11434)",
  },
];

function validateConfig(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  console.log("🔍 Validating Thought configuration...\n");

  // Check required configurations
  for (const config of REQUIRED_CONFIGS) {
    const value = process.env[config.name];

    if (!value) {
      if (config.required) {
        result.errors.push(`❌ Missing required: ${config.name}`);
        result.valid = false;
      } else if (config.defaultValue) {
        result.warnings.push(`⚠️  ${config.name} not set, using default: ${config.defaultValue}`);
      }
      continue;
    }

    if (config.validator && !config.validator(value)) {
      result.errors.push(`❌ Invalid ${config.name}: ${config.message}`);
      result.valid = false;
    } else {
      console.log(`✅ ${config.name}: ${maskSensitive(config.name, value)}`);
    }
  }

  // Check Ollama-specific configs if using Ollama
  const embeddingModel = process.env.EMBEDDING_MODEL?.toLowerCase();
  if (embeddingModel === "ollama") {
    console.log("\n📦 Checking Ollama configuration...");
    for (const config of OLLAMA_CONFIGS) {
      const value = process.env[config.name];

      if (!value) {
        if (config.required) {
          result.errors.push(`❌ Missing required (for Ollama): ${config.name}`);
          result.valid = false;
        }
        continue;
      }

      if (config.validator && !config.validator(value)) {
        result.errors.push(`❌ Invalid ${config.name}: ${config.message}`);
        result.valid = false;
      } else {
        console.log(`✅ ${config.name}: ${value}`);
      }
    }
  }

  // Production-specific checks
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") {
    console.log("\n🏭 Running production-specific checks...");

    // Check for secure database connection
    const dbUrl = process.env.DATABASE_URL || "";
    if (!dbUrl.includes("sslmode=require") && !dbUrl.includes("ssl=true")) {
      result.warnings.push(
        "⚠️  DATABASE_URL does not include SSL mode. Consider adding ?sslmode=require"
      );
    }

    // Check log level
    const logLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (logLevel === "DEBUG") {
      result.warnings.push(
        "⚠️  LOG_LEVEL=DEBUG in production may impact performance and expose sensitive data"
      );
    }

    // Check pool size
    const poolSize = parseInt(process.env.DB_POOL_SIZE || "20", 10);
    if (poolSize < 10) {
      result.warnings.push(`⚠️  DB_POOL_SIZE=${poolSize} may be too low for production workloads`);
    }
  }

  return result;
}

function maskSensitive(name: string, value: string): string {
  const sensitiveKeys = ["PASSWORD", "SECRET", "KEY", "TOKEN", "CREDENTIAL"];
  const isSensitive = sensitiveKeys.some((key) => name.toUpperCase().includes(key));

  if (isSensitive) {
    return value.substring(0, 4) + "****" + value.substring(value.length - 4);
  }

  // Mask password in DATABASE_URL
  if (name === "DATABASE_URL") {
    return value.replace(/:([^:@]+)@/, ":****@");
  }

  return value;
}

async function testDatabaseConnection(): Promise<boolean> {
  console.log("\n🔌 Testing database connection...");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("❌ Cannot test: DATABASE_URL not set");
    return false;
  }

  try {
    // Dynamic import to avoid issues if pg is not installed
    const pg = await import("pg");
    const pool = new pg.Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    const result = await client.query("SELECT 1 as test");
    client.release();
    await pool.end();

    if (result.rows[0]?.test === 1) {
      console.log("✅ Database connection successful");
      return true;
    }
    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log(`❌ Database connection failed: ${message}`);
    return false;
  }
}

async function testOllamaConnection(): Promise<boolean> {
  const embeddingModel = process.env.EMBEDDING_MODEL?.toLowerCase();
  if (embeddingModel !== "ollama") {
    return true;
  }

  console.log("\n🦙 Testing Ollama connection...");

  const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";

  try {
    const response = await fetch(`${ollamaHost}/api/tags`);
    if (response.ok) {
      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = data.models || [];
      console.log(`✅ Ollama connection successful (${models.length} models available)`);

      // Check if nomic-embed-text is available
      const hasEmbedModel = models.some(
        (m: { name: string }) => m.name.includes("nomic-embed-text") || m.name.includes("embed")
      );
      if (!hasEmbedModel) {
        console.log("⚠️  No embedding model found. Run: ollama pull nomic-embed-text");
      }
      return true;
    }
    console.log(`❌ Ollama returned status: ${response.status}`);
    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log(`❌ Ollama connection failed: ${message}`);
    return false;
  }
}

async function main(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("           Thought Configuration Validator");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const result = validateConfig();

  // Print warnings
  if (result.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    result.warnings.forEach((w) => console.log(`   ${w}`));
  }

  // Print errors
  if (result.errors.length > 0) {
    console.log("\n❌ Errors:");
    result.errors.forEach((e) => console.log(`   ${e}`));
  }

  // Test connections if basic validation passed
  if (result.valid) {
    const dbOk = await testDatabaseConnection();
    const ollamaOk = await testOllamaConnection();

    if (!dbOk || !ollamaOk) {
      result.valid = false;
      result.errors.push("Connection tests failed");
    }
  }

  // Final summary
  console.log("\n═══════════════════════════════════════════════════════════════");
  if (result.valid) {
    console.log("✅ Configuration is valid! Ready for deployment.");
  } else {
    console.log("❌ Configuration validation failed. Please fix the errors above.");
    process.exit(1);
  }
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error("Validation script error:", error);
  process.exit(1);
});
