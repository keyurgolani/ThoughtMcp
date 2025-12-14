/**
 * Property Test: Environment Synchronization from Docker Compose
 *
 * **Feature: auto-test-containers, Property 5: Environment Synchronization from Docker Compose**
 *
 * This property test validates that the EnvironmentConfigurator correctly reads
 * actual port mappings from `docker compose ps` output and configures the test
 * environment accordingly.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 *
 * - Requirement 4.1: WHEN containers start with dynamic ports THEN the Test Container Manager
 *   SHALL set DATABASE_URL environment variable with the correct port
 * - Requirement 4.2: WHEN containers start with dynamic ports THEN the Test Container Manager
 *   SHALL set DB_PORT environment variable with the PostgreSQL port
 * - Requirement 4.3: WHEN containers start with dynamic ports THEN the Test Container Manager
 *   SHALL set OLLAMA_HOST environment variable with the correct Ollama URL and port
 * - Requirement 4.4: WHEN test code accesses database configuration THEN the test code
 *   SHALL receive the dynamically allocated port values
 *
 * @module __tests__/property/containers/environment-sync.property.test
 */

import * as fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { EnvironmentConfigurator } from "../../../containers/environment-configurator";
import type { ServiceStatus } from "../../../containers/types";

/**
 * Internal port constants for container services (same as in environment-configurator.ts).
 */
const INTERNAL_PORTS = {
  postgres: 5432,
  ollama: 11434,
} as const;

/**
 * Service name constants for matching Docker Compose services.
 */
const SERVICE_NAMES = {
  postgres: "postgres-test",
  ollama: "ollama-test",
} as const;

/**
 * Arbitrary for generating valid external port numbers.
 * Uses realistic port ranges that would be used in testing.
 */
const externalPortArb = fc.integer({ min: 1024, max: 65535 });

/**
 * Arbitrary for generating PostgreSQL port in the test range.
 */
const postgresPortArb = fc.integer({ min: 5433, max: 5500 });

/**
 * Arbitrary for generating Ollama port in the test range.
 */
const ollamaPortArb = fc.integer({ min: 11435, max: 11500 });

/**
 * Arbitrary for generating a valid PostgreSQL service status.
 */
const postgresServiceArb = postgresPortArb.map(
  (externalPort): ServiceStatus => ({
    name: SERVICE_NAMES.postgres,
    status: "running",
    health: "healthy",
    ports: [{ internal: INTERNAL_PORTS.postgres, external: externalPort, protocol: "tcp" }],
  })
);

/**
 * Arbitrary for generating a valid Ollama service status.
 */
const ollamaServiceArb = ollamaPortArb.map(
  (externalPort): ServiceStatus => ({
    name: SERVICE_NAMES.ollama,
    status: "running",
    health: "healthy",
    ports: [{ internal: INTERNAL_PORTS.ollama, external: externalPort, protocol: "tcp" }],
  })
);

/**
 * Arbitrary for generating both services together.
 */
const bothServicesArb = fc
  .tuple(postgresPortArb, ollamaPortArb)
  .map(([pgPort, ollamaPort]): ServiceStatus[] => [
    {
      name: SERVICE_NAMES.postgres,
      status: "running",
      health: "healthy",
      ports: [{ internal: INTERNAL_PORTS.postgres, external: pgPort, protocol: "tcp" }],
    },
    {
      name: SERVICE_NAMES.ollama,
      status: "running",
      health: "healthy",
      ports: [{ internal: INTERNAL_PORTS.ollama, external: ollamaPort, protocol: "tcp" }],
    },
  ]);

describe("Property 5: Environment Synchronization from Docker Compose", () => {
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

  /**
   * **Feature: auto-test-containers, Property 5: Environment Synchronization from Docker Compose**
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
   *
   * For any container startup, the TestContainerManager SHALL read actual port mappings
   * from `docker compose ps` output and configure test environment accordingly.
   */
  describe("PostgreSQL environment synchronization", () => {
    /**
     * Requirement 4.1: WHEN containers start with dynamic ports THEN the Test Container Manager
     * SHALL set DATABASE_URL environment variable with the correct port
     */
    it("should set DATABASE_URL with the port from service status", () => {
      fc.assert(
        fc.property(postgresServiceArb, (service) => {
          configurator.configureFromServices([service]);

          const expectedPort = service.ports[0].external;
          const config = configurator.getConfiguration();

          // DATABASE_URL should contain the correct port
          expect(config.databaseUrl).toContain(`:${expectedPort}/`);
          expect(process.env.DATABASE_URL).toContain(`:${expectedPort}/`);

          // Reset for next iteration
          configurator.reset();

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 4.2: WHEN containers start with dynamic ports THEN the Test Container Manager
     * SHALL set DB_PORT environment variable with the PostgreSQL port
     */
    it("should set DB_PORT environment variable with the correct port", () => {
      fc.assert(
        fc.property(postgresServiceArb, (service) => {
          configurator.configureFromServices([service]);

          const expectedPort = service.ports[0].external;

          // DB_PORT should match the external port
          expect(process.env.DB_PORT).toBe(String(expectedPort));
          expect(process.env.TEST_DB_PORT).toBe(String(expectedPort));

          // Reset for next iteration
          configurator.reset();

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 4.4: WHEN test code accesses database configuration
     * THEN the test code SHALL receive the dynamically allocated port values
     */
    it("should return correct port in getConfiguration()", () => {
      fc.assert(
        fc.property(postgresServiceArb, (service) => {
          configurator.configureFromServices([service]);

          const expectedPort = service.ports[0].external;
          const config = configurator.getConfiguration();

          // Configuration should reflect the dynamic port
          expect(config.dbPort).toBe(expectedPort);

          // Reset for next iteration
          configurator.reset();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Ollama environment synchronization", () => {
    /**
     * Requirement 4.3: WHEN containers start with dynamic ports THEN the Test Container Manager
     * SHALL set OLLAMA_HOST environment variable with the correct Ollama URL and port
     */
    it("should set OLLAMA_HOST with the correct URL and port", () => {
      fc.assert(
        fc.property(ollamaServiceArb, (service) => {
          configurator.configureFromServices([service]);

          const expectedPort = service.ports[0].external;

          // OLLAMA_HOST should contain the correct port
          expect(process.env.OLLAMA_HOST).toBe(`http://localhost:${expectedPort}`);
          expect(process.env.TEST_OLLAMA_HOST).toBe(`http://localhost:${expectedPort}`);
          expect(process.env.OLLAMA_PORT).toBe(String(expectedPort));
          expect(process.env.TEST_OLLAMA_PORT).toBe(String(expectedPort));

          // Reset for next iteration
          configurator.reset();

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 4.4: WHEN test code accesses database configuration
     * THEN the test code SHALL receive the dynamically allocated port values
     */
    it("should return correct Ollama port in getConfiguration()", () => {
      fc.assert(
        fc.property(ollamaServiceArb, (service) => {
          configurator.configureFromServices([service]);

          const expectedPort = service.ports[0].external;
          const config = configurator.getConfiguration();

          // Configuration should reflect the dynamic port
          expect(config.ollamaPort).toBe(expectedPort);
          expect(config.ollamaHost).toBe(`http://localhost:${expectedPort}`);

          // Reset for next iteration
          configurator.reset();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Combined service synchronization", () => {
    /**
     * For any combination of PostgreSQL and Ollama services, both should be
     * configured correctly from the service status.
     */
    it("should synchronize both services correctly", () => {
      fc.assert(
        fc.property(bothServicesArb, (services) => {
          configurator.configureFromServices(services);

          const pgService = services.find((s) => s.name === SERVICE_NAMES.postgres);
          const ollamaService = services.find((s) => s.name === SERVICE_NAMES.ollama);

          const config = configurator.getConfiguration();

          // PostgreSQL should be configured
          if (pgService) {
            const expectedPgPort = pgService.ports[0].external;
            expect(config.dbPort).toBe(expectedPgPort);
            expect(process.env.DB_PORT).toBe(String(expectedPgPort));
          }

          // Ollama should be configured
          if (ollamaService) {
            const expectedOllamaPort = ollamaService.ports[0].external;
            expect(config.ollamaPort).toBe(expectedOllamaPort);
            expect(process.env.OLLAMA_PORT).toBe(String(expectedOllamaPort));
          }

          // Reset for next iteration
          configurator.reset();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Environment variable consistency", () => {
    /**
     * For any port configuration, the environment variables and internal
     * configuration should always be consistent.
     */
    it("should maintain consistency between env vars and configuration", () => {
      fc.assert(
        fc.property(postgresPortArb, ollamaPortArb, (pgPort, ollamaPort) => {
          // Configure directly using the configurator methods
          configurator.configurePostgres("localhost", pgPort, "testdb", "testuser", "testpass");
          configurator.configureOllama("localhost", ollamaPort);

          const config = configurator.getConfiguration();

          // Environment variables should match configuration
          expect(process.env.DB_PORT).toBe(String(config.dbPort));
          expect(process.env.OLLAMA_PORT).toBe(String(config.ollamaPort));
          expect(process.env.DATABASE_URL).toBe(config.databaseUrl);
          expect(process.env.OLLAMA_HOST).toBe(config.ollamaHost);

          // TEST_* variants should also match
          expect(process.env.TEST_DB_PORT).toBe(String(config.dbPort));
          expect(process.env.TEST_OLLAMA_PORT).toBe(String(config.ollamaPort));

          // Reset for next iteration
          configurator.reset();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Reset restores original environment", () => {
    /**
     * For any configuration changes, reset() should restore the original
     * environment state.
     */
    it("should restore original environment after reset", () => {
      fc.assert(
        fc.property(postgresPortArb, ollamaPortArb, (pgPort, ollamaPort) => {
          // Capture original values
          const originalDbPort = process.env.DB_PORT;
          const originalOllamaPort = process.env.OLLAMA_PORT;

          // Configure with new values
          configurator.configurePostgres("localhost", pgPort, "testdb", "testuser", "testpass");
          configurator.configureOllama("localhost", ollamaPort);

          // Verify configuration was applied
          expect(process.env.DB_PORT).toBe(String(pgPort));
          expect(process.env.OLLAMA_PORT).toBe(String(ollamaPort));

          // Reset
          configurator.reset();

          // Original values should be restored
          expect(process.env.DB_PORT).toBe(originalDbPort);
          expect(process.env.OLLAMA_PORT).toBe(originalOllamaPort);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Service status with multiple port mappings", () => {
    /**
     * Arbitrary for generating a service with multiple port mappings.
     * Only the correct internal port should be used.
     */
    const serviceWithMultiplePortsArb = fc
      .tuple(
        postgresPortArb,
        externalPortArb // Additional port for metrics/exporter
      )
      .map(
        ([pgPort, metricsPort]): ServiceStatus => ({
          name: SERVICE_NAMES.postgres,
          status: "running",
          health: "healthy",
          ports: [
            { internal: INTERNAL_PORTS.postgres, external: pgPort, protocol: "tcp" },
            { internal: 9187, external: metricsPort, protocol: "tcp" }, // Exporter port
          ],
        })
      );

    it("should use correct internal port mapping when multiple ports exist", () => {
      fc.assert(
        fc.property(serviceWithMultiplePortsArb, (service) => {
          configurator.configureFromServices([service]);

          // Find the PostgreSQL port mapping (internal 5432)
          const pgPortMapping = service.ports.find((p) => p.internal === INTERNAL_PORTS.postgres);
          const expectedPort = pgPortMapping?.external;

          const config = configurator.getConfiguration();

          // Should use the PostgreSQL port, not the metrics port
          expect(config.dbPort).toBe(expectedPort);

          // Reset for next iteration
          configurator.reset();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Unknown services are ignored", () => {
    /**
     * Arbitrary for generating unknown service names.
     */
    const unknownServiceArb = fc
      .tuple(
        fc
          .stringMatching(/^[a-z][a-z0-9-]*$/)
          .filter((name) => name !== SERVICE_NAMES.postgres && name !== SERVICE_NAMES.ollama),
        externalPortArb
      )
      .map(
        ([name, port]): ServiceStatus => ({
          name,
          status: "running",
          health: "healthy",
          ports: [{ internal: 5432, external: port, protocol: "tcp" }],
        })
      );

    it("should not modify configuration for unknown services", () => {
      fc.assert(
        fc.property(unknownServiceArb, (service) => {
          const defaultConfig = EnvironmentConfigurator.getDefaults();

          configurator.configureFromServices([service]);

          const config = configurator.getConfiguration();

          // Configuration should remain at defaults
          expect(config.dbPort).toBe(defaultConfig.dbPort);
          expect(config.ollamaPort).toBe(defaultConfig.ollamaPort);

          // Reset for next iteration
          configurator.reset();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Services without port mappings are handled gracefully", () => {
    /**
     * Arbitrary for generating a service without the expected port mapping.
     */
    const serviceWithoutPortArb = fc.constantFrom<ServiceStatus>(
      {
        name: SERVICE_NAMES.postgres,
        status: "running",
        health: "healthy",
        ports: [], // No ports
      },
      {
        name: SERVICE_NAMES.postgres,
        status: "running",
        health: "healthy",
        ports: [{ internal: 9999, external: 9999, protocol: "tcp" }], // Wrong internal port
      }
    );

    it("should not modify configuration when expected port mapping is missing", () => {
      fc.assert(
        fc.property(serviceWithoutPortArb, (service) => {
          const defaultConfig = EnvironmentConfigurator.getDefaults();

          configurator.configureFromServices([service]);

          const config = configurator.getConfiguration();

          // Configuration should remain at defaults
          expect(config.dbPort).toBe(defaultConfig.dbPort);

          // Reset for next iteration
          configurator.reset();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
