/**
 * Environment Configurator
 *
 * Manages test environment configuration by updating environment variables
 * based on running container status. Reads port mappings from Docker Compose
 * ps output and configures DATABASE_URL, DB_PORT, OLLAMA_HOST, etc.
 *
 * @module containers/environment-configurator
 */

import type { IEnvironmentConfigurator, ServiceStatus, TestEnvironmentConfig } from "./types";

/**
 * Default configuration values for test environment.
 */
const DEFAULT_CONFIG: TestEnvironmentConfig = {
  databaseUrl: "postgresql://thought_test:test_password@localhost:5433/thought_test",
  dbHost: "localhost",
  dbPort: 5433,
  dbName: "thought_test",
  dbUser: "thought_test",
  dbPassword: "test_password",
  ollamaHost: "http://localhost:11435",
  ollamaPort: 11435,
};

/**
 * Service name constants for matching Docker Compose services.
 */
const SERVICE_NAMES = {
  postgres: "postgres-test",
  ollama: "ollama-test",
} as const;

/**
 * Internal port constants for container services.
 */
const INTERNAL_PORTS = {
  postgres: 5432,
  ollama: 11434,
} as const;

/**
 * EnvironmentConfigurator manages test environment configuration.
 *
 * This class provides:
 * - Configuration from Docker Compose service status
 * - Individual service configuration (PostgreSQL, Ollama)
 * - Environment variable management
 * - Configuration retrieval and reset
 *
 * @implements {IEnvironmentConfigurator}
 */
export class EnvironmentConfigurator implements IEnvironmentConfigurator {
  /**
   * Current configuration state.
   */
  private config: TestEnvironmentConfig;

  /**
   * Original environment values for restoration on reset.
   */
  private originalEnv: Record<string, string | undefined>;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.originalEnv = {};
  }

  /**
   * Configures environment based on running Docker Compose services.
   *
   * Reads port mappings from service status and updates environment
   * variables accordingly. Handles both PostgreSQL and Ollama services.
   *
   * @param services - Array of service statuses from docker compose ps
   */
  configureFromServices(services: ServiceStatus[]): void {
    for (const service of services) {
      if (service.name === SERVICE_NAMES.postgres) {
        const externalPort = this.findExternalPort(service, INTERNAL_PORTS.postgres);
        if (externalPort !== null) {
          this.configurePostgres(
            this.config.dbHost,
            externalPort,
            this.config.dbName,
            this.config.dbUser,
            this.config.dbPassword
          );
        }
      } else if (service.name === SERVICE_NAMES.ollama) {
        const externalPort = this.findExternalPort(service, INTERNAL_PORTS.ollama);
        if (externalPort !== null) {
          this.configureOllama(this.config.dbHost, externalPort);
        }
      }
    }
  }

  /**
   * Configures environment for PostgreSQL connection.
   *
   * Sets DATABASE_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD
   * environment variables.
   *
   * @param host - Database host
   * @param port - Database port
   * @param database - Database name
   * @param user - Database user
   * @param password - Database password
   */
  configurePostgres(
    host: string,
    port: number,
    database: string,
    user: string,
    password: string
  ): void {
    // Update internal config
    this.config.dbHost = host;
    this.config.dbPort = port;
    this.config.dbName = database;
    this.config.dbUser = user;
    this.config.dbPassword = password;
    this.config.databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;

    // Save original values and set environment variables
    this.setEnvVar("DATABASE_URL", this.config.databaseUrl);
    this.setEnvVar("DB_HOST", host);
    this.setEnvVar("DB_PORT", String(port));
    this.setEnvVar("DB_NAME", database);
    this.setEnvVar("DB_USER", user);
    this.setEnvVar("DB_PASSWORD", password);

    // Also set TEST_* variants for test-specific configuration
    this.setEnvVar("TEST_DB_HOST", host);
    this.setEnvVar("TEST_DB_PORT", String(port));
    this.setEnvVar("TEST_DB_NAME", database);
    this.setEnvVar("TEST_DB_USER", user);
    this.setEnvVar("TEST_DB_PASSWORD", password);
  }

  /**
   * Configures environment for Ollama connection.
   *
   * Sets OLLAMA_HOST and OLLAMA_PORT environment variables.
   *
   * @param host - Ollama host (without protocol)
   * @param port - Ollama port
   */
  configureOllama(host: string, port: number): void {
    // Update internal config
    this.config.ollamaPort = port;
    this.config.ollamaHost = `http://${host}:${port}`;

    // Save original values and set environment variables
    this.setEnvVar("OLLAMA_HOST", this.config.ollamaHost);
    this.setEnvVar("OLLAMA_PORT", String(port));

    // Also set TEST_* variants for test-specific configuration
    this.setEnvVar("TEST_OLLAMA_HOST", this.config.ollamaHost);
    this.setEnvVar("TEST_OLLAMA_PORT", String(port));
  }

  /**
   * Gets the current configuration.
   *
   * @returns Current test environment configuration
   */
  getConfiguration(): TestEnvironmentConfig {
    return { ...this.config };
  }

  /**
   * Resets configuration to defaults and restores original environment.
   *
   * Restores all environment variables to their original values
   * (or removes them if they didn't exist before).
   */
  reset(): void {
    // Restore original environment values
    for (const [key, value] of Object.entries(this.originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    // Clear tracking
    this.originalEnv = {};

    // Reset config to defaults
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Finds the external port for a service's internal port.
   *
   * @param service - Service status with port mappings
   * @param internalPort - The internal container port to find
   * @returns External port number or null if not found
   */
  private findExternalPort(service: ServiceStatus, internalPort: number): number | null {
    const portMapping = service.ports.find((p) => p.internal === internalPort);
    return portMapping?.external ?? null;
  }

  /**
   * Sets an environment variable and tracks the original value.
   *
   * @param key - Environment variable name
   * @param value - Value to set
   */
  private setEnvVar(key: string, value: string): void {
    // Only save original value if we haven't already
    if (!(key in this.originalEnv)) {
      this.originalEnv[key] = process.env[key];
    }
    process.env[key] = value;
  }

  /**
   * Gets the default configuration values.
   *
   * Useful for testing and debugging.
   *
   * @returns Default test environment configuration
   */
  static getDefaults(): TestEnvironmentConfig {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Creates a new EnvironmentConfigurator instance.
 */
export function createEnvironmentConfigurator(): IEnvironmentConfigurator {
  return new EnvironmentConfigurator();
}
