/**
 * Secrets Manager
 *
 * Provides secure access to secrets from various sources including
 * environment variables, files, and external secret managers.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { existsSync, readFileSync } from "fs";
import type { SecretsConfig, SecretValue } from "./types.js";

/**
 * Default secrets configuration
 */
const DEFAULT_CONFIG: Required<SecretsConfig> = {
  provider: "env",
  envPrefix: "",
  filePath: "",
  vaultUrl: "",
  vaultToken: "",
  cacheEnabled: true,
  cacheTtl: 300000, // 5 minutes
};

/**
 * Secrets Manager class
 *
 * Manages secure access to secrets from various sources
 */
export class SecretsManager {
  private config: Required<SecretsConfig>;
  private cache: Map<string, SecretValue> = new Map();

  constructor(config: Partial<SecretsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get a secret value
   */
  async get(key: string): Promise<string | null> {
    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Get from provider
    let value: string | null = null;

    switch (this.config.provider) {
      case "env":
        value = this.getFromEnv(key);
        break;
      case "file":
        value = this.getFromFile(key);
        break;
      case "vault":
        value = await this.getFromVault(key);
        break;
    }

    // Cache the value
    if (value !== null && this.config.cacheEnabled) {
      this.setCache(key, value);
    }

    return value;
  }

  /**
   * Get a required secret (throws if not found)
   */
  async getRequired(key: string): Promise<string> {
    const value = await this.get(key);
    if (value === null) {
      throw new Error(`Required secret not found: ${key}`);
    }
    return value;
  }

  /**
   * Get a secret with a default value
   */
  async getWithDefault(key: string, defaultValue: string): Promise<string> {
    const value = await this.get(key);
    return value ?? defaultValue;
  }

  /**
   * Check if a secret exists
   */
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Get from environment variables
   */
  private getFromEnv(key: string): string | null {
    const envKey = this.config.envPrefix ? `${this.config.envPrefix}${key}` : key;
    return process.env[envKey] ?? null;
  }

  /**
   * Get from file
   */
  private getFromFile(key: string): string | null {
    if (!this.config.filePath) {
      return null;
    }

    try {
      // Check if file exists
      if (!existsSync(this.config.filePath)) {
        return null;
      }

      // Read and parse file
      const content = readFileSync(this.config.filePath, "utf-8");
      const secrets = JSON.parse(content) as Record<string, string>;

      return secrets[key] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get from HashiCorp Vault (placeholder for future implementation)
   */
  private async getFromVault(key: string): Promise<string | null> {
    if (!this.config.vaultUrl || !this.config.vaultToken) {
      return null;
    }

    try {
      // This is a placeholder for Vault integration
      // In production, you would use the Vault API
      const response = await fetch(`${this.config.vaultUrl}/v1/secret/data/${key}`, {
        headers: {
          "X-Vault-Token": this.config.vaultToken,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { data?: { data?: Record<string, string> } };
      return data?.data?.data?.value ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): string | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (cached.expiresAt && cached.expiresAt < new Date()) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Set cache value
   */
  private setCache(key: string, value: string): void {
    const now = new Date();
    this.cache.set(key, {
      value,
      source: this.config.provider,
      cachedAt: now,
      expiresAt: new Date(now.getTime() + this.config.cacheTtl),
    });
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get database configuration from secrets
   */
  async getDatabaseConfig(): Promise<{
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }> {
    // Try DATABASE_URL first
    const databaseUrl = await this.get("DATABASE_URL");
    if (databaseUrl) {
      return this.parseDatabaseUrl(databaseUrl);
    }

    // Fall back to individual settings
    return {
      host: await this.getWithDefault("DB_HOST", "localhost"),
      port: parseInt(await this.getWithDefault("DB_PORT", "5432"), 10),
      database: await this.getRequired("DB_NAME"),
      user: await this.getRequired("DB_USER"),
      password: await this.getRequired("DB_PASSWORD"),
    };
  }

  /**
   * Parse a PostgreSQL connection URL
   */
  private parseDatabaseUrl(url: string): {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  } {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || "5432", 10),
        database: parsed.pathname.slice(1), // Remove leading /
        user: parsed.username,
        password: decodeURIComponent(parsed.password),
      };
    } catch {
      throw new Error("Invalid DATABASE_URL format");
    }
  }

  /**
   * Mask a secret value for logging
   */
  static maskSecret(value: string, visibleChars: number = 4): string {
    if (value.length <= visibleChars * 2) {
      return "*".repeat(value.length);
    }
    return `${value.substring(0, visibleChars)}****${value.substring(value.length - visibleChars)}`;
  }

  /**
   * Check if a string looks like a secret
   */
  static looksLikeSecret(key: string): boolean {
    const secretPatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /credential/i,
      /auth/i,
      /api[_-]?key/i,
    ];
    return secretPatterns.some((pattern) => pattern.test(key));
  }
}

/**
 * Create a secrets manager with environment variable provider
 */
export function createEnvSecretsManager(prefix?: string): SecretsManager {
  return new SecretsManager({
    provider: "env",
    envPrefix: prefix,
  });
}

/**
 * Create a secrets manager with file provider
 */
export function createFileSecretsManager(filePath: string): SecretsManager {
  return new SecretsManager({
    provider: "file",
    filePath,
  });
}

/**
 * Default secrets manager instance
 */
let defaultSecretsManager: SecretsManager | null = null;

/**
 * Get the default secrets manager
 */
export function getSecretsManager(): SecretsManager {
  defaultSecretsManager ??= new SecretsManager();
  return defaultSecretsManager;
}
