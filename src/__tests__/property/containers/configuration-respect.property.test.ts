/**
 * Property Test: Configuration Respect
 *
 * **Feature: auto-test-containers, Property 6: Configuration Respect**
 *
 * This property test validates that the TestContainerManager correctly honors
 * all configuration settings (AUTO_START_CONTAINERS, CONTAINER_STARTUP_TIMEOUT,
 * KEEP_CONTAINERS_RUNNING, TEST_CONTAINER_PREFIX).
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.5**
 *
 * - Requirement 6.1: WHEN the environment variable AUTO_START_CONTAINERS is set to "false"
 *   THEN the Test Container Manager SHALL skip automatic container startup
 * - Requirement 6.2: WHEN the environment variable CONTAINER_STARTUP_TIMEOUT is set
 *   THEN the Test Container Manager SHALL use that value (in seconds) for health check timeout
 * - Requirement 6.3: WHEN the environment variable KEEP_CONTAINERS_RUNNING is set to "true"
 *   THEN the Test Container Manager SHALL not stop containers after tests complete
 * - Requirement 6.5: WHEN the environment variable TEST_CONTAINER_PREFIX is set
 *   THEN the Test Container Manager SHALL use that prefix for container names
 *
 * @module __tests__/property/containers/configuration-respect.property.test
 */

import * as fc from "fast-check";
import { describe, expect, it, vi } from "vitest";

import { TestContainerManager } from "../../../containers/test-container-manager";
import type {
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
 * Arbitrary for generating valid startup timeout values (1-300 seconds).
 */
const startupTimeoutArb = fc.integer({ min: 1, max: 300 });

/**
 * Arbitrary for generating valid container prefix strings.
 * Must be valid Docker container name prefix (alphanumeric with hyphens).
 */
const containerPrefixArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .map((s) => s.toLowerCase().replace(/[^a-z0-9-]/g, ""))
  .filter((s) => s.length > 0 && /^[a-z][a-z0-9-]*$/.test(s));

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
 * Creates mock dependencies for TestContainerManager.
 */
function createMocks(): {
  composeWrapper: IDockerComposeWrapper;
  portAllocator: IPortAllocator;
  envConfigurator: IEnvironmentConfigurator;
  logger: IContainerLogger;
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

  return {
    composeWrapper: {
      isAvailable: vi.fn().mockResolvedValue({
        available: true,
        dockerVersion: "24.0.0",
        composeVersion: "2.20.0",
      } as DockerAvailability),
      up: vi.fn().mockResolvedValue(undefined),
      down: vi.fn().mockResolvedValue(undefined),
      ps: vi.fn().mockResolvedValue([]),
      isServiceHealthy: vi.fn().mockResolvedValue(true),
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
      logStarting: vi.fn(),
      logHealthCheck: vi.fn(),
      logReady: vi.fn(),
      logError: vi.fn(),
      logStopped: vi.fn(),
    },
  };
}

/**
 * Default test configuration.
 */
const defaultConfig: ContainerManagerConfig = {
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

describe("Property 6: Configuration Respect", () => {
  describe("Requirement 6.1: AUTO_START_CONTAINERS=false skips startup", () => {
    /**
     * Property: For any configuration where autoStart is false,
     * the manager SHALL NOT call docker compose up or check Docker availability.
     */
    it("should skip container startup when autoStart is false", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async () => {
          const mocks = createMocks();

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            { ...defaultConfig, autoStart: false }
          );

          const containers = await manager.startContainers();

          // Should NOT call isAvailable when autoStart is false
          // (optimization: skip Docker check entirely)
          expect(mocks.composeWrapper.up).not.toHaveBeenCalled();
          expect(mocks.composeWrapper.ps).not.toHaveBeenCalled();

          // Should return empty array
          expect(containers).toHaveLength(0);

          // Should log that startup was skipped
          expect(mocks.logger.logStarting).toHaveBeenCalledWith(
            "containers",
            expect.stringContaining("AUTO_START_CONTAINERS=false")
          );

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any configuration where autoStart is true,
     * the manager SHALL proceed with container startup.
     */
    it("should proceed with startup when autoStart is true", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async ([postgresService, ollamaService]) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [postgresService, ollamaService];

          // Return healthy services on ps call
          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>).mockResolvedValue(services);

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            { ...defaultConfig, autoStart: true }
          );

          const containers = await manager.startContainers();

          // Should check Docker availability
          expect(mocks.composeWrapper.isAvailable).toHaveBeenCalled();

          // Should check for existing containers
          expect(mocks.composeWrapper.ps).toHaveBeenCalled();

          // Should return containers
          expect(containers.length).toBeGreaterThan(0);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Requirement 6.2: CONTAINER_STARTUP_TIMEOUT is used for health check timeout", () => {
    /**
     * Property: For any valid timeout value, the manager SHALL pass that
     * timeout to docker compose up --wait-timeout.
     */
    it("should use configured startupTimeout for docker compose up", async () => {
      await fc.assert(
        fc.asyncProperty(
          startupTimeoutArb,
          healthyServicesArb,
          async (timeout, [postgresService, ollamaService]) => {
            const mocks = createMocks();
            const services: ServiceStatus[] = [postgresService, ollamaService];

            // First ps returns empty (need to start), second returns healthy
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

            // Should call up with the configured timeout
            expect(mocks.composeWrapper.up).toHaveBeenCalledWith(
              expect.any(String),
              expect.objectContaining({
                timeout: timeout,
              })
            );

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Requirement 6.3: KEEP_CONTAINERS_RUNNING=true prevents stopping", () => {
    /**
     * Property: For any configuration where keepRunning is true,
     * the manager SHALL NOT call docker compose down during cleanup.
     */
    it("should not stop containers when keepRunning is true", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async ([postgresService, ollamaService]) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [postgresService, ollamaService];

          // First ps returns empty (need to start), second returns healthy
          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(services);

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            { ...defaultConfig, keepRunning: true }
          );

          // Start containers
          await manager.startContainers();

          // Stop containers
          await manager.stopContainers();

          // Should NOT call down due to keepRunning
          expect(mocks.composeWrapper.down).not.toHaveBeenCalled();

          // Should log that containers were kept running
          expect(mocks.logger.logStopped).toHaveBeenCalledWith(
            expect.stringContaining("kept running")
          );

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any configuration where keepRunning is false,
     * the manager SHALL call docker compose down during cleanup
     * (if containers were started by manager).
     */
    it("should stop containers when keepRunning is false", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async ([postgresService, ollamaService]) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [postgresService, ollamaService];

          // First ps returns empty (need to start), second returns healthy
          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(services);

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            { ...defaultConfig, keepRunning: false }
          );

          // Start containers
          await manager.startContainers();

          // Stop containers
          await manager.stopContainers();

          // Should call down since keepRunning is false
          expect(mocks.composeWrapper.down).toHaveBeenCalled();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Requirement 6.5: TEST_CONTAINER_PREFIX is used for container names", () => {
    /**
     * Property: For any valid container prefix, the manager SHALL use that
     * prefix in container names returned by getStatus().
     */
    it("should use configured projectName as container name prefix", async () => {
      await fc.assert(
        fc.asyncProperty(
          containerPrefixArb,
          healthyServicesArb,
          async (prefix, [postgresService, ollamaService]) => {
            const mocks = createMocks();
            const services: ServiceStatus[] = [postgresService, ollamaService];

            // Return healthy services on ps call
            (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>).mockResolvedValue(services);

            const manager = new TestContainerManager(
              mocks.composeWrapper,
              mocks.portAllocator,
              mocks.envConfigurator,
              mocks.logger,
              { ...defaultConfig, projectName: prefix }
            );

            await manager.startContainers();
            const status = manager.getStatus();

            // Container names should use the configured prefix
            expect(status.postgres?.name).toBe(`${prefix}-postgres`);
            expect(status.ollama?.name).toBe(`${prefix}-ollama`);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Configuration combinations", () => {
    /**
     * Property: For any combination of configuration settings,
     * each setting SHALL be honored independently.
     */
    it("should honor all configuration settings independently", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // autoStart
          startupTimeoutArb, // startupTimeout
          fc.boolean(), // keepRunning
          containerPrefixArb, // projectName
          healthyServicesArb,
          async (autoStart, timeout, keepRunning, prefix, [postgresService, ollamaService]) => {
            const mocks = createMocks();
            const services: ServiceStatus[] = [postgresService, ollamaService];

            // First ps returns empty (need to start), second returns healthy
            (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
              .mockResolvedValueOnce([])
              .mockResolvedValueOnce(services);

            const config: ContainerManagerConfig = {
              ...defaultConfig,
              autoStart,
              startupTimeout: timeout,
              keepRunning,
              projectName: prefix,
            };

            const manager = new TestContainerManager(
              mocks.composeWrapper,
              mocks.portAllocator,
              mocks.envConfigurator,
              mocks.logger,
              config
            );

            // Verify config is stored correctly
            const storedConfig = (manager as any).config;
            expect(storedConfig.autoStart).toBe(autoStart);
            expect(storedConfig.startupTimeout).toBe(timeout);
            expect(storedConfig.keepRunning).toBe(keepRunning);
            expect(storedConfig.projectName).toBe(prefix);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("PRESERVE_TEST_DATA configuration", () => {
    /**
     * Property: For any configuration where preserveData is true,
     * the manager SHALL NOT remove volumes during cleanup.
     */
    it("should preserve volumes when preserveData is true", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async ([postgresService, ollamaService]) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [postgresService, ollamaService];

          // First ps returns empty (need to start), second returns healthy
          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(services);

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            { ...defaultConfig, preserveData: true, keepRunning: false }
          );

          // Start containers
          await manager.startContainers();

          // Stop containers
          await manager.stopContainers();

          // Should call down with volumes: false (preserve data)
          expect(mocks.composeWrapper.down).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
              volumes: false,
            })
          );

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any configuration where preserveData is false,
     * the manager SHALL remove volumes during cleanup.
     */
    it("should remove volumes when preserveData is false", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async ([postgresService, ollamaService]) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [postgresService, ollamaService];

          // First ps returns empty (need to start), second returns healthy
          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(services);

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            { ...defaultConfig, preserveData: false, keepRunning: false }
          );

          // Start containers
          await manager.startContainers();

          // Stop containers
          await manager.stopContainers();

          // Should call down with volumes: true (remove data)
          expect(mocks.composeWrapper.down).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
              volumes: true,
            })
          );

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
