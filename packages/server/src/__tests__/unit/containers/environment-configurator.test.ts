/**
 * EnvironmentConfigurator Unit Tests
 *
 * Tests for the environment configuration system that manages test environment
 * variables based on running container status. These tests verify environment
 * variable setting, configuration retrieval, and reset functionality.
 *
 * @module __tests__/unit/containers/environment-configurator.test
 *
 * _Requirements: 3.3, 4.1, 4.2, 4.3, 4.4_
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createEnvironmentConfigurator,
  EnvironmentConfigurator,
} from "../../../containers/environment-configurator";
import type { ServiceStatus } from "../../../containers/types";

describe("EnvironmentConfigurator", () => {
  let configurator: EnvironmentConfigurator;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    configurator = new EnvironmentConfigurator();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("configurePostgres", () => {
    /**
     * Requirement 4.1: WHEN containers start with dynamic ports THEN the Test Container Manager
     * SHALL set DATABASE_URL environment variable with the correct port
     */
    it("should set DATABASE_URL with correct connection string", () => {
      configurator.configurePostgres("localhost", 5434, "testdb", "testuser", "testpass");

      expect(process.env.DATABASE_URL).toBe("postgresql://testuser:testpass@localhost:5434/testdb");
    });

    /**
     * Requirement 4.2: WHEN containers start with dynamic ports THEN the Test Container Manager
     * SHALL set DB_PORT environment variable with the PostgreSQL port
     */
    it("should set DB_PORT environment variable", () => {
      configurator.configurePostgres("localhost", 5434, "testdb", "testuser", "testpass");

      expect(process.env.DB_PORT).toBe("5434");
    });

    it("should set all PostgreSQL environment variables", () => {
      configurator.configurePostgres("127.0.0.1", 5435, "mydb", "myuser", "mypass");

      expect(process.env.DB_HOST).toBe("127.0.0.1");
      expect(process.env.DB_PORT).toBe("5435");
      expect(process.env.DB_NAME).toBe("mydb");
      expect(process.env.DB_USER).toBe("myuser");
      expect(process.env.DB_PASSWORD).toBe("mypass");
    });

    it("should set TEST_* variants for test-specific configuration", () => {
      configurator.configurePostgres("localhost", 5436, "testdb", "testuser", "testpass");

      expect(process.env.TEST_DB_HOST).toBe("localhost");
      expect(process.env.TEST_DB_PORT).toBe("5436");
      expect(process.env.TEST_DB_NAME).toBe("testdb");
      expect(process.env.TEST_DB_USER).toBe("testuser");
      expect(process.env.TEST_DB_PASSWORD).toBe("testpass");
    });

    it("should update internal configuration", () => {
      configurator.configurePostgres("localhost", 5437, "newdb", "newuser", "newpass");

      const config = configurator.getConfiguration();
      expect(config.dbHost).toBe("localhost");
      expect(config.dbPort).toBe(5437);
      expect(config.dbName).toBe("newdb");
      expect(config.dbUser).toBe("newuser");
      expect(config.dbPassword).toBe("newpass");
      expect(config.databaseUrl).toBe("postgresql://newuser:newpass@localhost:5437/newdb");
    });
  });

  describe("configureOllama", () => {
    /**
     * Requirement 4.3: WHEN containers start with dynamic ports THEN the Test Container Manager
     * SHALL set OLLAMA_HOST environment variable with the correct Ollama URL and port
     */
    it("should set OLLAMA_HOST with correct URL", () => {
      configurator.configureOllama("localhost", 11436);

      expect(process.env.OLLAMA_HOST).toBe("http://localhost:11436");
    });

    it("should set OLLAMA_PORT environment variable", () => {
      configurator.configureOllama("localhost", 11437);

      expect(process.env.OLLAMA_PORT).toBe("11437");
    });

    it("should set TEST_* variants for test-specific configuration", () => {
      configurator.configureOllama("localhost", 11438);

      expect(process.env.TEST_OLLAMA_HOST).toBe("http://localhost:11438");
      expect(process.env.TEST_OLLAMA_PORT).toBe("11438");
    });

    it("should update internal configuration", () => {
      configurator.configureOllama("127.0.0.1", 11439);

      const config = configurator.getConfiguration();
      expect(config.ollamaHost).toBe("http://127.0.0.1:11439");
      expect(config.ollamaPort).toBe(11439);
    });
  });

  describe("configureFromServices", () => {
    it("should configure PostgreSQL from service status", () => {
      const services: ServiceStatus[] = [
        {
          name: "postgres-test",
          status: "running",
          health: "healthy",
          ports: [{ internal: 5432, external: 5440, protocol: "tcp" }],
        },
      ];

      configurator.configureFromServices(services);

      expect(process.env.DB_PORT).toBe("5440");
    });

    it("should configure Ollama from service status", () => {
      const services: ServiceStatus[] = [
        {
          name: "ollama-test",
          status: "running",
          health: "healthy",
          ports: [{ internal: 11434, external: 11440, protocol: "tcp" }],
        },
      ];

      configurator.configureFromServices(services);

      expect(process.env.OLLAMA_HOST).toBe("http://localhost:11440");
      expect(process.env.OLLAMA_PORT).toBe("11440");
    });

    it("should configure both services from combined status", () => {
      const services: ServiceStatus[] = [
        {
          name: "postgres-test",
          status: "running",
          health: "healthy",
          ports: [{ internal: 5432, external: 5441, protocol: "tcp" }],
        },
        {
          name: "ollama-test",
          status: "running",
          health: "healthy",
          ports: [{ internal: 11434, external: 11441, protocol: "tcp" }],
        },
      ];

      configurator.configureFromServices(services);

      expect(process.env.DB_PORT).toBe("5441");
      expect(process.env.OLLAMA_PORT).toBe("11441");
    });

    it("should ignore services without matching port mappings", () => {
      const services: ServiceStatus[] = [
        {
          name: "postgres-test",
          status: "running",
          health: "healthy",
          ports: [], // No port mappings
        },
      ];

      // Should not throw, just skip configuration
      configurator.configureFromServices(services);

      // Should still have default values
      const config = configurator.getConfiguration();
      expect(config.dbPort).toBe(5433); // Default
    });

    it("should ignore unknown services", () => {
      const services: ServiceStatus[] = [
        {
          name: "redis",
          status: "running",
          health: "healthy",
          ports: [{ internal: 6379, external: 6379, protocol: "tcp" }],
        },
      ];

      // Should not throw
      configurator.configureFromServices(services);

      // Configuration should remain at defaults
      const config = configurator.getConfiguration();
      expect(config.dbPort).toBe(5433);
      expect(config.ollamaPort).toBe(11435);
    });

    it("should handle services with multiple port mappings", () => {
      const services: ServiceStatus[] = [
        {
          name: "postgres-test",
          status: "running",
          health: "healthy",
          ports: [
            { internal: 5432, external: 5442, protocol: "tcp" },
            { internal: 9187, external: 9187, protocol: "tcp" }, // Exporter port
          ],
        },
      ];

      configurator.configureFromServices(services);

      // Should use the correct internal port mapping
      expect(process.env.DB_PORT).toBe("5442");
    });

    it("should handle empty services array", () => {
      configurator.configureFromServices([]);

      // Should not throw, configuration remains at defaults
      const config = configurator.getConfiguration();
      expect(config.dbPort).toBe(5433);
      expect(config.ollamaPort).toBe(11435);
    });
  });

  describe("getConfiguration", () => {
    it("should return default configuration initially", () => {
      const config = configurator.getConfiguration();

      expect(config.dbHost).toBe("localhost");
      expect(config.dbPort).toBe(5433);
      expect(config.dbName).toBe("thought_test");
      expect(config.dbUser).toBe("thought_test");
      expect(config.dbPassword).toBe("test_password");
      expect(config.ollamaHost).toBe("http://localhost:11435");
      expect(config.ollamaPort).toBe(11435);
    });

    /**
     * Requirement 4.4: WHEN test code accesses database configuration
     * THEN the test code SHALL receive the dynamically allocated port values
     */
    it("should return updated configuration after configurePostgres", () => {
      configurator.configurePostgres("myhost", 5443, "mydb", "myuser", "mypass");

      const config = configurator.getConfiguration();
      expect(config.dbHost).toBe("myhost");
      expect(config.dbPort).toBe(5443);
      expect(config.dbName).toBe("mydb");
    });

    it("should return a copy of configuration", () => {
      const config1 = configurator.getConfiguration();
      config1.dbPort = 9999;

      const config2 = configurator.getConfiguration();
      expect(config2.dbPort).toBe(5433); // Should still be default
    });
  });

  describe("reset", () => {
    it("should restore original environment variables", () => {
      // Set an original value
      process.env.DB_PORT = "original_port";

      // Create new configurator after setting original
      const newConfigurator = new EnvironmentConfigurator();
      newConfigurator.configurePostgres("localhost", 5444, "testdb", "testuser", "testpass");

      expect(process.env.DB_PORT).toBe("5444");

      newConfigurator.reset();

      expect(process.env.DB_PORT).toBe("original_port");
    });

    it("should remove environment variables that did not exist before", () => {
      // Ensure TEST_DB_PORT doesn't exist
      delete process.env.TEST_DB_PORT;

      const newConfigurator = new EnvironmentConfigurator();
      newConfigurator.configurePostgres("localhost", 5445, "testdb", "testuser", "testpass");

      expect(process.env.TEST_DB_PORT).toBe("5445");

      newConfigurator.reset();

      expect(process.env.TEST_DB_PORT).toBeUndefined();
    });

    it("should reset internal configuration to defaults", () => {
      configurator.configurePostgres("myhost", 5446, "mydb", "myuser", "mypass");
      configurator.configureOllama("myhost", 11446);

      configurator.reset();

      const config = configurator.getConfiguration();
      expect(config.dbHost).toBe("localhost");
      expect(config.dbPort).toBe(5433);
      expect(config.ollamaPort).toBe(11435);
    });

    it("should allow reconfiguration after reset", () => {
      configurator.configurePostgres("host1", 5447, "db1", "user1", "pass1");
      configurator.reset();
      configurator.configurePostgres("host2", 5448, "db2", "user2", "pass2");

      const config = configurator.getConfiguration();
      expect(config.dbHost).toBe("host2");
      expect(config.dbPort).toBe(5448);
    });
  });

  describe("getDefaults", () => {
    it("should return default configuration values", () => {
      const defaults = EnvironmentConfigurator.getDefaults();

      expect(defaults.dbHost).toBe("localhost");
      expect(defaults.dbPort).toBe(5433);
      expect(defaults.dbName).toBe("thought_test");
      expect(defaults.dbUser).toBe("thought_test");
      expect(defaults.dbPassword).toBe("test_password");
      expect(defaults.ollamaHost).toBe("http://localhost:11435");
      expect(defaults.ollamaPort).toBe(11435);
    });

    it("should return a copy that does not affect defaults", () => {
      const defaults1 = EnvironmentConfigurator.getDefaults();
      defaults1.dbPort = 9999;

      const defaults2 = EnvironmentConfigurator.getDefaults();
      expect(defaults2.dbPort).toBe(5433);
    });
  });

  describe("createEnvironmentConfigurator factory", () => {
    it("should create a new EnvironmentConfigurator instance", () => {
      const instance = createEnvironmentConfigurator();
      expect(instance).toBeDefined();
      expect(typeof instance.configurePostgres).toBe("function");
      expect(typeof instance.configureOllama).toBe("function");
      expect(typeof instance.configureFromServices).toBe("function");
      expect(typeof instance.getConfiguration).toBe("function");
      expect(typeof instance.reset).toBe("function");
    });
  });
});
