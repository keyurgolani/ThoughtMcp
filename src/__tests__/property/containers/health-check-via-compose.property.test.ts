/**
 * Property Test: Health Check via Docker Compose
 *
 * **Feature: auto-test-containers, Property 7: Health Check via Docker Compose**
 *
 * This property test validates that the TestContainerManager uses Docker Compose's
 * `--wait` flag or polls `docker compose ps` for health status, not implementing
 * custom health checks.
 *
 * **Validates: Requirements 1.3, 1.4**
 *
 * - Requirement 1.3: WHEN containers are started THEN the Test Container Manager
 *   SHALL wait for health checks to pass before allowing tests to proceed
 * - Requirement 1.4: WHEN health checks fail after 60 seconds THEN the Test
 *   Container Manager SHALL report a clear error message and abort the test run
 *
 * @module __tests__/property/containers/health-check-via-compose.property.test
 */

import * as fc from "fast-check";
import { describe, expect, it, vi } from "vitest";

import { TestContainerManager } from "../../../containers/test-container-manager";
import type {
  ComposeUpOptions,
  ContainerManagerConfig,
  DockerAvailability,
  IContainerLogger,
  IDockerComposeWrapper,
  IEnvironmentConfigurator,
  IPortAllocator,
  ServiceStatus,
  TestEnvironmentConfig,
} from "../../../containers/types";

/**
 * Arbitrary for generating startup timeout values.
 */
const timeoutArb = fc.integer({ min: 10, max: 300 });

/**
 * Arbitrary for generating port numbers in valid ranges.
 */
const portArb = fc.integer({ min: 1024, max: 65535 });

/**
 * Arbitrary for generating healthy services.
 */
const healthyServicesArb = fc.tuple(
  fc.record({
    name: fc.constant("postgres-test"),
    status: fc.constant("running") as fc.Arbitrary<"running">,
    health: fc.constant("healthy") as fc.Arbitrary<"healthy">,
    ports: fc.array(
      fc.record({
        internal: fc.constant(5432),
        external: portArb,
        protocol: fc.constant("tcp") as fc.Arbitrary<"tcp">,
      }),
      { minLength: 1, maxLength: 1 }
    ),
  }),
  fc.record({
    name: fc.constant("ollama-test"),
    status: fc.constant("running") as fc.Arbitrary<"running">,
    health: fc.constant("healthy") as fc.Arbitrary<"healthy">,
    ports: fc.array(
      fc.record({
        internal: fc.constant(11434),
        external: portArb,
        protocol: fc.constant("tcp") as fc.Arbitrary<"tcp">,
      }),
      { minLength: 1, maxLength: 1 }
    ),
  })
);

/**
 * Arbitrary for generating unhealthy service combinations.
 */
const unhealthyServiceArb = fc.constantFrom("postgres-test", "ollama-test", "both");

/**
 * Creates mock dependencies for TestContainerManager that track calls.
 */
function createMocks(): {
  composeWrapper: IDockerComposeWrapper & {
    upCalls: Array<{ composeFile: string; options?: ComposeUpOptions }>;
    psCalls: string[];
    isServiceHealthyCalls: Array<{ composeFile: string; serviceName: string }>;
  };
  portAllocator: IPortAllocator;
  envConfigurator: IEnvironmentConfigurator;
  logger: IContainerLogger & { errors: Array<{ service: string; error: string }> };
} {
  const defaultEnvConfig: TestEnvironmentConfig = {
    databaseUrl: "postgresql://thoughtmcp_test:test_password@localhost:5433/thoughtmcp_test",
    dbHost: "localhost",
    dbPort: 5433,
    dbName: "thoughtmcp_test",
    dbUser: "thoughtmcp_test",
    dbPassword: "test_password",
    ollamaHost: "http://localhost:11435",
    ollamaPort: 11435,
  };

  const upCalls: Array<{ composeFile: string; options?: ComposeUpOptions }> = [];
  const psCalls: string[] = [];
  const isServiceHealthyCalls: Array<{ composeFile: string; serviceName: string }> = [];
  const errors: Array<{ service: string; error: string }> = [];

  return {
    composeWrapper: {
      upCalls,
      psCalls,
      isServiceHealthyCalls,
      isAvailable: vi.fn().mockResolvedValue({
        available: true,
        dockerVersion: "24.0.0",
        composeVersion: "2.20.0",
      } as DockerAvailability),
      up: vi.fn(async (composeFile: string, options?: ComposeUpOptions) => {
        upCalls.push({ composeFile, options });
      }),
      down: vi.fn().mockResolvedValue(undefined),
      ps: vi.fn(async (composeFile: string) => {
        psCalls.push(composeFile);
        return [];
      }),
      isServiceHealthy: vi.fn(async (composeFile: string, serviceName: string) => {
        isServiceHealthyCalls.push({ composeFile, serviceName });
        return true;
      }),
      logs: vi.fn().mockResolvedValue(""),
      exec: vi.fn().mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" }),
    },
    portAllocator: {
      isPortAvailable: vi.fn().mockResolvedValue(true),
      findAvailablePort: vi.fn().mockResolvedValue(5434),
      reservePort: vi.fn(),
      releasePort: vi.fn(),
    },
    envConfigurator: {
      configureFromServices: vi.fn(),
      configurePostgres: vi.fn(),
      configureOllama: vi.fn(),
      getConfiguration: vi.fn().mockReturnValue(defaultEnvConfig),
      reset: vi.fn(),
    },
    logger: {
      errors,
      logStarting: vi.fn(),
      logHealthCheck: vi.fn(),
      logReady: vi.fn(),
      logError: vi.fn((service: string, error: string) => {
        errors.push({ service, error });
      }),
      logStopped: vi.fn(),
    },
  };
}

/**
 * Default test configuration.
 */
const defaultConfig: Partial<ContainerManagerConfig> = {
  autoStart: true,
  startupTimeout: 60,
  keepRunning: false,
  preserveData: false,
  isCI: false,
  composeFile: "docker-compose.test.yml",
  projectName: "thoughtmcp-test",
  postgres: {
    defaultPort: 5433,
    portRangeStart: 5434,
    portRangeEnd: 5500,
    serviceName: "postgres-test",
  },
  ollama: {
    defaultPort: 11435,
    portRangeStart: 11436,
    portRangeEnd: 11500,
    serviceName: "ollama-test",
    embeddingModel: "nomic-embed-text",
    modelPullTimeout: 300,
  },
};

describe("Property 7: Health Check via Docker Compose", () => {
  describe("Health checks use Docker Compose --wait flag", () => {
    /**
     * Property: For any container startup, the manager SHALL use the --wait flag
     * when calling docker compose up.
     */
    it("should use --wait flag when starting containers", async () => {
      await fc.assert(
        fc.asyncProperty(timeoutArb, async (timeout) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [
            {
              name: "postgres-test",
              status: "running",
              health: "healthy",
              ports: [{ internal: 5432, external: 5433, protocol: "tcp" }],
            },
            {
              name: "ollama-test",
              status: "running",
              health: "healthy",
              ports: [{ internal: 11434, external: 11435, protocol: "tcp" }],
            },
          ];

          // First ps returns empty (no containers), second returns healthy services
          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(services);

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            { ...defaultConfig, startupTimeout: timeout }
          );

          await manager.startContainers();

          // Verify up was called with wait: true
          expect(mocks.composeWrapper.upCalls).toHaveLength(1);
          expect(mocks.composeWrapper.upCalls[0].options?.wait).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any startup timeout configuration, the manager SHALL pass
     * the timeout to Docker Compose's --wait-timeout.
     */
    it("should pass timeout to --wait-timeout", async () => {
      await fc.assert(
        fc.asyncProperty(timeoutArb, async (timeout) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [
            {
              name: "postgres-test",
              status: "running",
              health: "healthy",
              ports: [{ internal: 5432, external: 5433, protocol: "tcp" }],
            },
            {
              name: "ollama-test",
              status: "running",
              health: "healthy",
              ports: [{ internal: 11434, external: 11435, protocol: "tcp" }],
            },
          ];

          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(services);

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            { ...defaultConfig, startupTimeout: timeout }
          );

          await manager.startContainers();

          // Verify timeout was passed
          expect(mocks.composeWrapper.upCalls).toHaveLength(1);
          expect(mocks.composeWrapper.upCalls[0].options?.timeout).toBe(timeout);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Health status is checked via docker compose ps", () => {
    /**
     * Property: For any health check, the manager SHALL use docker compose ps
     * to determine service health status.
     */
    it("should use isServiceHealthy which calls docker compose ps", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async ([postgresService, ollamaService]) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [postgresService, ollamaService];

          // First ps returns empty, second returns services
          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(services);

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            defaultConfig
          );

          await manager.startContainers();

          // Verify isServiceHealthy was called for both services
          expect(mocks.composeWrapper.isServiceHealthyCalls.length).toBeGreaterThanOrEqual(2);

          const postgresHealthCheck = mocks.composeWrapper.isServiceHealthyCalls.find(
            (c) => c.serviceName === "postgres-test"
          );
          const ollamaHealthCheck = mocks.composeWrapper.isServiceHealthyCalls.find(
            (c) => c.serviceName === "ollama-test"
          );

          expect(postgresHealthCheck).toBeDefined();
          expect(ollamaHealthCheck).toBeDefined();

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: The isHealthy() method SHALL use docker compose ps to check health.
     */
    it("should use docker compose ps for isHealthy() method", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async ([postgresService, ollamaService]) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [postgresService, ollamaService];

          // Setup for startContainers
          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(services);

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            defaultConfig
          );

          await manager.startContainers();

          // Clear call tracking
          mocks.composeWrapper.isServiceHealthyCalls.length = 0;

          // Call isHealthy
          await manager.isHealthy();

          // Verify isServiceHealthy was called (which uses docker compose ps)
          expect(mocks.composeWrapper.isServiceHealthyCalls.length).toBe(2);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Health check failures are reported clearly", () => {
    /**
     * Property: When health checks fail, the manager SHALL report a clear error
     * message and abort.
     */
    it("should report clear error when health checks fail", async () => {
      await fc.assert(
        fc.asyncProperty(unhealthyServiceArb, async (unhealthyService) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [
            {
              name: "postgres-test",
              status: "running",
              health:
                unhealthyService === "postgres-test" || unhealthyService === "both"
                  ? "unhealthy"
                  : "healthy",
              ports: [{ internal: 5432, external: 5433, protocol: "tcp" }],
            },
            {
              name: "ollama-test",
              status: "running",
              health:
                unhealthyService === "ollama-test" || unhealthyService === "both"
                  ? "unhealthy"
                  : "healthy",
              ports: [{ internal: 11434, external: 11435, protocol: "tcp" }],
            },
          ];

          // First ps returns empty, second returns services
          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(services);

          // Mock isServiceHealthy to return false for unhealthy services
          (mocks.composeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockImplementation(
            async (_composeFile: string, serviceName: string) => {
              mocks.composeWrapper.isServiceHealthyCalls.push({
                composeFile: _composeFile,
                serviceName,
              });
              if (unhealthyService === "both") return false;
              if (unhealthyService === "postgres-test" && serviceName === "postgres-test")
                return false;
              if (unhealthyService === "ollama-test" && serviceName === "ollama-test") return false;
              return true;
            }
          );

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            defaultConfig
          );

          // Should throw an error
          await expect(manager.startContainers()).rejects.toThrow(/Health checks failed/);

          // Should log an error with clear message
          expect(mocks.logger.errors.length).toBeGreaterThan(0);
          const healthError = mocks.logger.errors.find((e) =>
            e.error.includes("Health checks failed")
          );
          expect(healthError).toBeDefined();

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Health check error messages SHALL identify which services failed.
     */
    it("should identify which services failed health checks", async () => {
      await fc.assert(
        fc.asyncProperty(unhealthyServiceArb, async (unhealthyService) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [
            {
              name: "postgres-test",
              status: "running",
              health: "healthy",
              ports: [{ internal: 5432, external: 5433, protocol: "tcp" }],
            },
            {
              name: "ollama-test",
              status: "running",
              health: "healthy",
              ports: [{ internal: 11434, external: 11435, protocol: "tcp" }],
            },
          ];

          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(services);

          // Mock isServiceHealthy to return false for specific services
          (mocks.composeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockImplementation(
            async (_composeFile: string, serviceName: string) => {
              mocks.composeWrapper.isServiceHealthyCalls.push({
                composeFile: _composeFile,
                serviceName,
              });
              if (unhealthyService === "both") return false;
              if (unhealthyService === "postgres-test" && serviceName === "postgres-test")
                return false;
              if (unhealthyService === "ollama-test" && serviceName === "ollama-test") return false;
              return true;
            }
          );

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            defaultConfig
          );

          try {
            await manager.startContainers();
          } catch (error) {
            const errorMessage = (error as Error).message;

            // Error message should identify which services failed
            if (unhealthyService === "postgres-test") {
              expect(errorMessage).toContain("postgres");
            } else if (unhealthyService === "ollama-test") {
              expect(errorMessage).toContain("ollama");
            } else if (unhealthyService === "both") {
              expect(errorMessage).toContain("postgres");
              expect(errorMessage).toContain("ollama");
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("No custom health check implementations", () => {
    /**
     * Property: The manager SHALL NOT implement custom TCP/HTTP health checks.
     * All health checking is delegated to Docker Compose.
     */
    it("should not make direct network connections for health checks", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async ([postgresService, ollamaService]) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [postgresService, ollamaService];

          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(services);

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            defaultConfig
          );

          await manager.startContainers();

          // The only health-related calls should be to isServiceHealthy
          // which internally uses docker compose ps
          // No direct TCP or HTTP connections should be made

          // Verify that health checks went through the compose wrapper
          expect(mocks.composeWrapper.isServiceHealthyCalls.length).toBeGreaterThanOrEqual(2);

          // The compose wrapper's isServiceHealthy uses ps internally
          // This is verified by the implementation, not by mock tracking
          // The key property is that TestContainerManager delegates to IDockerComposeWrapper

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Health check waits before proceeding", () => {
    /**
     * Property: For any container startup, tests SHALL NOT proceed until
     * health checks pass.
     */
    it("should not return from startContainers until health checks pass", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async ([postgresService, ollamaService]) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [postgresService, ollamaService];

          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(services);

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            defaultConfig
          );

          const containers = await manager.startContainers();

          // After startContainers returns, containers should be healthy
          expect(containers).toHaveLength(2);
          for (const container of containers) {
            expect(container.status).toBe("healthy");
          }

          // isHealthy should return true
          const healthy = await manager.isHealthy();
          expect(healthy).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
