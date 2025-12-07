/**
 * Secrets Manager Tests
 *
 * Tests for secrets management functionality.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SecretsManager,
  createEnvSecretsManager,
  createFileSecretsManager,
  getSecretsManager,
} from "../../../security/secrets-manager.js";

describe("SecretsManager", () => {
  let manager: SecretsManager;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    manager = new SecretsManager();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("get()", () => {
    it("should get secret from environment variable", async () => {
      process.env.TEST_SECRET = "secret_value";

      const value = await manager.get("TEST_SECRET");

      expect(value).toBe("secret_value");
    });

    it("should return null for non-existent secret", async () => {
      const value = await manager.get("NON_EXISTENT_SECRET");

      expect(value).toBeNull();
    });

    it("should use env prefix when configured", async () => {
      process.env.APP_TEST_SECRET = "prefixed_value";

      const prefixedManager = new SecretsManager({
        provider: "env",
        envPrefix: "APP_",
      });

      const value = await prefixedManager.get("TEST_SECRET");

      expect(value).toBe("prefixed_value");
    });

    it("should cache values when enabled", async () => {
      process.env.CACHED_SECRET = "cached_value";

      const cachingManager = new SecretsManager({
        provider: "env",
        cacheEnabled: true,
        cacheTtl: 60000,
      });

      // First call
      await cachingManager.get("CACHED_SECRET");

      // Change env value
      process.env.CACHED_SECRET = "new_value";

      // Second call should return cached value
      const value = await cachingManager.get("CACHED_SECRET");

      expect(value).toBe("cached_value");
    });

    it("should not cache when disabled", async () => {
      process.env.UNCACHED_SECRET = "original_value";

      const noCacheManager = new SecretsManager({
        provider: "env",
        cacheEnabled: false,
      });

      // First call
      await noCacheManager.get("UNCACHED_SECRET");

      // Change env value
      process.env.UNCACHED_SECRET = "new_value";

      // Second call should return new value
      const value = await noCacheManager.get("UNCACHED_SECRET");

      expect(value).toBe("new_value");
    });
  });

  describe("getRequired()", () => {
    it("should return value when secret exists", async () => {
      process.env.REQUIRED_SECRET = "required_value";

      const value = await manager.getRequired("REQUIRED_SECRET");

      expect(value).toBe("required_value");
    });

    it("should throw when secret does not exist", async () => {
      await expect(manager.getRequired("NON_EXISTENT")).rejects.toThrow(
        "Required secret not found: NON_EXISTENT"
      );
    });
  });

  describe("getWithDefault()", () => {
    it("should return value when secret exists", async () => {
      process.env.OPTIONAL_SECRET = "actual_value";

      const value = await manager.getWithDefault("OPTIONAL_SECRET", "default");

      expect(value).toBe("actual_value");
    });

    it("should return default when secret does not exist", async () => {
      const value = await manager.getWithDefault("NON_EXISTENT", "default_value");

      expect(value).toBe("default_value");
    });
  });

  describe("exists()", () => {
    it("should return true when secret exists", async () => {
      process.env.EXISTS_SECRET = "value";

      const exists = await manager.exists("EXISTS_SECRET");

      expect(exists).toBe(true);
    });

    it("should return false when secret does not exist", async () => {
      const exists = await manager.exists("NON_EXISTENT");

      expect(exists).toBe(false);
    });
  });

  describe("clearCache()", () => {
    it("should clear cached values", async () => {
      process.env.CLEAR_CACHE_SECRET = "original";

      const cachingManager = new SecretsManager({
        provider: "env",
        cacheEnabled: true,
        cacheTtl: 60000,
      });

      // Cache the value
      await cachingManager.get("CLEAR_CACHE_SECRET");

      // Change env value
      process.env.CLEAR_CACHE_SECRET = "new_value";

      // Clear cache
      cachingManager.clearCache();

      // Should get new value
      const value = await cachingManager.get("CLEAR_CACHE_SECRET");

      expect(value).toBe("new_value");
    });
  });

  describe("getDatabaseConfig()", () => {
    it("should parse DATABASE_URL", async () => {
      process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/testdb?sslmode=require";

      const config = await manager.getDatabaseConfig();

      expect(config.host).toBe("localhost");
      expect(config.port).toBe(5432);
      expect(config.database).toBe("testdb");
      expect(config.user).toBe("user");
      expect(config.password).toBe("password");
    });

    it("should handle URL-encoded password", async () => {
      process.env.DATABASE_URL = "postgresql://user:p%40ssw%23rd@localhost:5432/testdb";

      const config = await manager.getDatabaseConfig();

      expect(config.password).toBe("p@ssw#rd");
    });

    it("should fall back to individual settings", async () => {
      delete process.env.DATABASE_URL;
      process.env.DB_HOST = "dbhost";
      process.env.DB_PORT = "5433";
      process.env.DB_NAME = "mydb";
      process.env.DB_USER = "dbuser";
      process.env.DB_PASSWORD = "dbpass";

      const config = await manager.getDatabaseConfig();

      expect(config.host).toBe("dbhost");
      expect(config.port).toBe(5433);
      expect(config.database).toBe("mydb");
      expect(config.user).toBe("dbuser");
      expect(config.password).toBe("dbpass");
    });

    it("should use default host and port", async () => {
      delete process.env.DATABASE_URL;
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      process.env.DB_NAME = "mydb";
      process.env.DB_USER = "dbuser";
      process.env.DB_PASSWORD = "dbpass";

      const config = await manager.getDatabaseConfig();

      expect(config.host).toBe("localhost");
      expect(config.port).toBe(5432);
    });

    it("should throw for invalid DATABASE_URL", async () => {
      process.env.DATABASE_URL = "invalid-url";

      await expect(manager.getDatabaseConfig()).rejects.toThrow("Invalid DATABASE_URL format");
    });
  });

  describe("static methods", () => {
    it("should mask secrets correctly", () => {
      const masked = SecretsManager.maskSecret("mysecretpassword");

      expect(masked).toBe("myse****word");
      expect(masked).not.toContain("secret");
    });

    it("should fully mask short secrets", () => {
      const masked = SecretsManager.maskSecret("short");

      expect(masked).toBe("*****");
    });

    it("should identify secret-like keys", () => {
      expect(SecretsManager.looksLikeSecret("DB_PASSWORD")).toBe(true);
      expect(SecretsManager.looksLikeSecret("API_KEY")).toBe(true);
      expect(SecretsManager.looksLikeSecret("SECRET_TOKEN")).toBe(true);
      expect(SecretsManager.looksLikeSecret("AUTH_CREDENTIAL")).toBe(true);
      expect(SecretsManager.looksLikeSecret("DB_HOST")).toBe(false);
      expect(SecretsManager.looksLikeSecret("LOG_LEVEL")).toBe(false);
    });
  });

  describe("factory functions", () => {
    it("should create env secrets manager", async () => {
      process.env.TEST_VALUE = "test";

      const envManager = createEnvSecretsManager();
      const value = await envManager.get("TEST_VALUE");

      expect(value).toBe("test");
    });

    it("should create env secrets manager with prefix", async () => {
      process.env.PREFIX_TEST_VALUE = "prefixed";

      const envManager = createEnvSecretsManager("PREFIX_");
      const value = await envManager.get("TEST_VALUE");

      expect(value).toBe("prefixed");
    });

    it("should create file secrets manager", () => {
      const fileManager = createFileSecretsManager("/path/to/secrets.json");

      expect(fileManager).toBeInstanceOf(SecretsManager);
    });

    it("should return singleton from getSecretsManager", () => {
      const manager1 = getSecretsManager();
      const manager2 = getSecretsManager();

      expect(manager1).toBe(manager2);
    });
  });

  describe("file provider", () => {
    it("should return null when file does not exist", async () => {
      const fileManager = new SecretsManager({
        provider: "file",
        filePath: "/non/existent/path.json",
      });

      const value = await fileManager.get("TEST_KEY");

      expect(value).toBeNull();
    });

    it("should return null when no file path configured", async () => {
      const fileManager = new SecretsManager({
        provider: "file",
        filePath: "",
      });

      const value = await fileManager.get("TEST_KEY");

      expect(value).toBeNull();
    });
  });

  describe("vault provider", () => {
    it("should return null when vault not configured", async () => {
      const vaultManager = new SecretsManager({
        provider: "vault",
        vaultUrl: "",
        vaultToken: "",
      });

      const value = await vaultManager.get("TEST_KEY");

      expect(value).toBeNull();
    });

    it("should attempt to fetch from vault when configured", async () => {
      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      global.fetch = mockFetch;

      const vaultManager = new SecretsManager({
        provider: "vault",
        vaultUrl: "http://vault:8200",
        vaultToken: "test-token",
      });

      const value = await vaultManager.get("TEST_KEY");

      expect(value).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        "http://vault:8200/v1/secret/data/TEST_KEY",
        expect.objectContaining({
          headers: { "X-Vault-Token": "test-token" },
        })
      );
    });
  });
});
