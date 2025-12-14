/**
 * Property Test: Container Reuse Preservation
 *
 * **Feature: auto-test-containers, Property 2: Container Reuse Preservation**
 *
 * This property test validates that the TestContainerManager correctly reuses
 * existing containers and does not stop them during cleanup when they were
 * not started by the manager.
 *
 * **Validates: Requirements 1.5, 2.4**
 *
 * - Requirement 1.5: WHEN containers are already running on expected ports
 *   THEN the Test Container Manager SHALL reuse the existing containers
 * - Requirement 2.4: WHEN containers were pre-existing (not started by Test Container Manager)
 *   THEN the Test Container Manager SHALL leave those containers running
 *
 * @module __tests__/property/containers/container-reuse.property.test
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
 * Arbitrary for generating service health states.
 */
const healthStateArb = fc.constantFrom("healthy", "unhealthy", "starting", "none") as fc.Arbitrary<
  "healthy" | "unhealthy" | "starting" | "none"
>;

/**
 * Arbitrary for generating service running states.
 */
const runningStateArb = fc.constantFrom(
  "running",
  "exited",
  "paused",
  "restarting",
  "created"
) as fc.Arbitrary<"running" | "exited" | "paused" | "restarting" | "created">;

/**
 * Arbitrary for generating port numbers in valid ranges.
 */
const portArb = fc.integer({ min: 1024, max: 65535 });

/**
 * Arbitrary for generating a ServiceStatus for postgres.
 */
const postgresServiceArb = fc.record({
  name: fc.constant("postgres-test"),
  status: runningStateArb,
  health: healthStateArb,
  ports: fc.array(
    fc.record({
      internal: fc.constant(5432),
      external: portArb,
      protocol: fc.constant("tcp") as fc.Arbitrary<"tcp">,
    }),
    { minLength: 1, maxLength: 1 }
  ),
});

/**
 * Arbitrary for generating a ServiceStatus for ollama.
 */
const ollamaServiceArb = fc.record({
  name: fc.constant("ollama-test"),
  status: runningStateArb,
  health: healthStateArb,
  ports: fc.array(
    fc.record({
      internal: fc.constant(11434),
      external: portArb,
      protocol: fc.constant("tcp") as fc.Arbitrary<"tcp">,
    }),
    { minLength: 1, maxLength: 1 }
  ),
});

/**
 * Arbitrary for generating both services with healthy running state.
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

describe("Property 2: Container Reuse Preservation", () => {
  describe("Pre-existing containers are reused", () => {
    /**
     * Property: For any healthy running containers, the manager SHALL reuse them
     * and NOT call docker compose up.
     */
    it("should reuse existing healthy containers without calling up", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async ([postgresService, ollamaService]) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [postgresService, ollamaService];

          // Mock ps to return existing healthy services
          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>).mockResolvedValue(services);

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            defaultConfig
          );

          const containers = await manager.startContainers();

          // Should NOT call up since containers are already running
          expect(mocks.composeWrapper.up).not.toHaveBeenCalled();

          // Should configure environment from existing services
          expect(mocks.envConfigurator.configureFromServices).toHaveBeenCalledWith(services);

          // Should return containers marked as NOT started by manager
          expect(containers).toHaveLength(2);
          for (const container of containers) {
            expect(container.startedByManager).toBe(false);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any pre-existing containers, stopContainers SHALL NOT call
     * docker compose down.
     */
    it("should not stop pre-existing containers during cleanup", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async ([postgresService, ollamaService]) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [postgresService, ollamaService];

          // Mock ps to return existing healthy services
          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>).mockResolvedValue(services);

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            defaultConfig
          );

          // Start (reuses existing)
          await manager.startContainers();

          // Stop
          await manager.stopContainers();

          // Should NOT call down since containers were pre-existing
          expect(mocks.composeWrapper.down).not.toHaveBeenCalled();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Manager-started containers are tracked correctly", () => {
    /**
     * Property: For any scenario where containers need to be started,
     * the manager SHALL track them and stop them during cleanup.
     */
    it("should track and stop containers started by manager", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async ([postgresService, ollamaService]) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [postgresService, ollamaService];

          // First ps call returns empty (no containers), second returns healthy services
          (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce([]) // No existing containers
            .mockResolvedValueOnce(services); // After up

          const manager = new TestContainerManager(
            mocks.composeWrapper,
            mocks.portAllocator,
            mocks.envConfigurator,
            mocks.logger,
            defaultConfig
          );

          // Start (needs to create containers)
          const containers = await manager.startContainers();

          // Should call up since no containers were running
          expect(mocks.composeWrapper.up).toHaveBeenCalled();

          // Should return containers marked as started by manager
          expect(containers).toHaveLength(2);
          for (const container of containers) {
            expect(container.startedByManager).toBe(true);
          }

          // Stop
          await manager.stopContainers();

          // Should call down since containers were started by manager
          expect(mocks.composeWrapper.down).toHaveBeenCalled();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("KEEP_CONTAINERS_RUNNING preserves containers", () => {
    /**
     * Property: For any containers started by manager, when KEEP_CONTAINERS_RUNNING
     * is true, stopContainers SHALL NOT call docker compose down.
     */
    it("should not stop containers when keepRunning is true", async () => {
      await fc.assert(
        fc.asyncProperty(healthyServicesArb, async ([postgresService, ollamaService]) => {
          const mocks = createMocks();
          const services: ServiceStatus[] = [postgresService, ollamaService];

          // First ps call returns empty, second returns healthy services
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

          // Start (creates containers)
          await manager.startContainers();

          // Stop
          await manager.stopContainers();

          // Should NOT call down due to keepRunning
          expect(mocks.composeWrapper.down).not.toHaveBeenCalled();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Partial container states", () => {
    /**
     * Property: When only one container is healthy and running, the manager
     * SHALL start containers (since both are required).
     */
    it("should start containers when only postgres is healthy", async () => {
      await fc.assert(
        fc.asyncProperty(
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
          async (postgresService) => {
            const mocks = createMocks();

            // Only postgres is running, ollama is not
            const initialServices: ServiceStatus[] = [postgresService];
            const afterUpServices: ServiceStatus[] = [
              postgresService,
              {
                name: "ollama-test",
                status: "running",
                health: "healthy",
                ports: [{ internal: 11434, external: 11435, protocol: "tcp" }],
              },
            ];

            (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
              .mockResolvedValueOnce(initialServices)
              .mockResolvedValueOnce(afterUpServices);

            const manager = new TestContainerManager(
              mocks.composeWrapper,
              mocks.portAllocator,
              mocks.envConfigurator,
              mocks.logger,
              defaultConfig
            );

            await manager.startContainers();

            // Should call up since ollama was not running
            expect(mocks.composeWrapper.up).toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: When only one container is healthy and running, the manager
     * SHALL start containers (since both are required).
     */
    it("should start containers when only ollama is healthy", async () => {
      await fc.assert(
        fc.asyncProperty(
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
          }),
          async (ollamaService) => {
            const mocks = createMocks();

            // Only ollama is running, postgres is not
            const initialServices: ServiceStatus[] = [ollamaService];
            const afterUpServices: ServiceStatus[] = [
              {
                name: "postgres-test",
                status: "running",
                health: "healthy",
                ports: [{ internal: 5432, external: 5433, protocol: "tcp" }],
              },
              ollamaService,
            ];

            (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
              .mockResolvedValueOnce(initialServices)
              .mockResolvedValueOnce(afterUpServices);

            const manager = new TestContainerManager(
              mocks.composeWrapper,
              mocks.portAllocator,
              mocks.envConfigurator,
              mocks.logger,
              defaultConfig
            );

            await manager.startContainers();

            // Should call up since postgres was not running
            expect(mocks.composeWrapper.up).toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Unhealthy containers trigger restart", () => {
    /**
     * Property: When containers are running but unhealthy, the manager
     * SHALL start containers (to trigger health check wait).
     */
    it("should start containers when existing containers are unhealthy", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(postgresServiceArb, ollamaServiceArb).filter(
            ([pg, ol]) =>
              // At least one is running but unhealthy
              (pg.status === "running" && pg.health !== "healthy") ||
              (ol.status === "running" && ol.health !== "healthy")
          ),
          async ([postgresService, ollamaService]) => {
            const mocks = createMocks();

            const initialServices: ServiceStatus[] = [postgresService, ollamaService];
            const afterUpServices: ServiceStatus[] = [
              { ...postgresService, health: "healthy" },
              { ...ollamaService, health: "healthy" },
            ];

            (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
              .mockResolvedValueOnce(initialServices)
              .mockResolvedValueOnce(afterUpServices);

            const manager = new TestContainerManager(
              mocks.composeWrapper,
              mocks.portAllocator,
              mocks.envConfigurator,
              mocks.logger,
              defaultConfig
            );

            await manager.startContainers();

            // Should call up since containers were not healthy
            expect(mocks.composeWrapper.up).toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("State consistency", () => {
    /**
     * Property: The startedByManager flag in getStatus SHALL match whether
     * containers were actually started by the manager.
     */
    it("should maintain consistent startedByManager state", async () => {
      await fc.assert(
        fc.asyncProperty(
          healthyServicesArb,
          fc.boolean(), // Whether containers pre-exist
          async ([postgresService, ollamaService], preExisting) => {
            const mocks = createMocks();
            const services: ServiceStatus[] = [postgresService, ollamaService];

            if (preExisting) {
              // Containers already exist
              (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>).mockResolvedValue(services);
            } else {
              // Containers need to be started
              (mocks.composeWrapper.ps as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce(services);
            }

            const manager = new TestContainerManager(
              mocks.composeWrapper,
              mocks.portAllocator,
              mocks.envConfigurator,
              mocks.logger,
              defaultConfig
            );

            await manager.startContainers();
            const status = manager.getStatus();

            // startedByManager should be opposite of preExisting
            expect(status.postgres?.startedByManager).toBe(!preExisting);
            expect(status.ollama?.startedByManager).toBe(!preExisting);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
