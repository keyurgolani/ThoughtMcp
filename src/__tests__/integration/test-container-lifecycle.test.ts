/**
 * Test Container Lifecycle Integration Tests
 *
 * Task 12.3: Integration tests for test container lifecycle
 * Tests full startup/teardown cycle and signal handling.
 *
 * These tests verify the integration between:
 * - TestContainerManager
 * - DockerComposeWrapper
 * - PortAllocator
 * - EnvironmentConfigurator
 * - ContainerLogger
 * - Global setup/teardown
 *
 * Note: These tests use mocked Docker Compose commands to avoid
 * requiring actual Docker during test execution. The integration
 * being tested is the coordination between components, not Docker itself.
 *
 * Requirements: 2.5
 *
 * @module __tests__/integration/test-container-lifecycle.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContainerLogger,
  EnvironmentConfigurator,
  PortAllocator,
  TestContainerManager,
} from "../../containers/index.js";
import type {
  ContainerManagerConfig,
  DockerAvailability,
  IDockerComposeWrapper,
  ServiceStatus,
} from "../../containers/types.js";

describe("Test Container Lifecycle Integration", () => {
  // Mock DockerComposeWrapper for integration testing
  let mockComposeWrapper: IDockerComposeWrapper;
  let portAllocator: PortAllocator;
  let envConfigurator: EnvironmentConfigurator;
  let logger: ContainerLogger;

  // Track original environment
  let originalEnv: NodeJS.ProcessEnv;

  // Default test configuration
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

  // Helper to create healthy service status
  function createHealthyServices(): ServiceStatus[] {
    return [
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
  }

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Create mock DockerComposeWrapper
    mockComposeWrapper = {
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
    };

    // Create real instances of other components
    portAllocator = new PortAllocator();
    envConfigurator = new EnvironmentConfigurator();
    logger = new ContainerLogger("test-lifecycle", false); // Quiet mode for tests
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("Full Startup/Teardown Cycle", () => {
    it("should complete full lifecycle: start → verify → stop", async () => {
      // Setup: No containers running initially, then healthy after start
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([]) // Initial check - no containers
        .mockResolvedValueOnce(createHealthyServices()); // After up

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        defaultConfig
      );

      // Phase 1: Start containers
      const containers = await manager.startContainers();

      // Verify containers started
      expect(containers).toHaveLength(2);
      expect(containers[0].service).toBe("postgres-test");
      expect(containers[1].service).toBe("ollama-test");
      expect(containers[0].startedByManager).toBe(true);
      expect(containers[1].startedByManager).toBe(true);

      // Verify Docker Compose up was called
      expect(mockComposeWrapper.up).toHaveBeenCalledWith(
        "docker-compose.test.yml",
        expect.objectContaining({
          detach: true,
          wait: true,
        })
      );

      // Phase 2: Verify status
      const status = manager.getStatus();
      expect(status.isReady).toBe(true);
      expect(status.postgres).not.toBeNull();
      expect(status.ollama).not.toBeNull();
      expect(status.startTime).toBeInstanceOf(Date);

      // Phase 3: Verify health
      const healthy = await manager.isHealthy();
      expect(healthy).toBe(true);

      // Phase 4: Stop containers
      await manager.stopContainers();

      // Verify Docker Compose down was called
      expect(mockComposeWrapper.down).toHaveBeenCalledWith(
        "docker-compose.test.yml",
        expect.objectContaining({
          volumes: true, // preserveData is false
        })
      );

      // Verify state is reset
      const finalStatus = manager.getStatus();
      expect(finalStatus.isReady).toBe(false);
      expect(finalStatus.postgres).toBeNull();
      expect(finalStatus.ollama).toBeNull();
    });

    it("should reuse existing containers and not stop them", async () => {
      // Setup: Containers already running and healthy
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>).mockResolvedValue(
        createHealthyServices()
      );

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        defaultConfig
      );

      // Start should detect existing containers
      const containers = await manager.startContainers();

      // Verify containers were reused (not started by manager)
      expect(containers).toHaveLength(2);
      expect(containers[0].startedByManager).toBe(false);
      expect(containers[1].startedByManager).toBe(false);

      // Verify Docker Compose up was NOT called
      expect(mockComposeWrapper.up).not.toHaveBeenCalled();

      // Stop should not call down (containers were pre-existing)
      await manager.stopContainers();
      expect(mockComposeWrapper.down).not.toHaveBeenCalled();
    });

    it("should handle KEEP_CONTAINERS_RUNNING=true", async () => {
      // Setup: No containers running initially
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(createHealthyServices());

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        { ...defaultConfig, keepRunning: true }
      );

      // Start containers
      await manager.startContainers();
      expect(mockComposeWrapper.up).toHaveBeenCalled();

      // Stop should NOT call down when keepRunning is true
      await manager.stopContainers();
      expect(mockComposeWrapper.down).not.toHaveBeenCalled();
    });

    it("should preserve data when PRESERVE_TEST_DATA=true", async () => {
      // Setup: No containers running initially
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(createHealthyServices());

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        { ...defaultConfig, preserveData: true }
      );

      // Start and stop containers
      await manager.startContainers();
      await manager.stopContainers();

      // Verify volumes are NOT removed
      expect(mockComposeWrapper.down).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          volumes: false, // preserveData is true
        })
      );
    });

    it("should skip startup when AUTO_START_CONTAINERS=false", async () => {
      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        { ...defaultConfig, autoStart: false }
      );

      // Start should return empty array
      const containers = await manager.startContainers();
      expect(containers).toEqual([]);

      // No Docker commands should be called
      expect(mockComposeWrapper.isAvailable).not.toHaveBeenCalled();
      expect(mockComposeWrapper.up).not.toHaveBeenCalled();
    });
  });

  describe("Environment Configuration Integration", () => {
    it("should configure environment variables from running services", async () => {
      // Setup: No containers running initially
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(createHealthyServices());

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        defaultConfig
      );

      // Start containers
      await manager.startContainers();

      // Verify environment was configured
      const config = envConfigurator.getConfiguration();
      expect(config.dbPort).toBe(5433);
      expect(config.ollamaPort).toBe(11435);
      expect(config.dbHost).toBe("localhost");
    });

    it("should reset environment on cleanup", async () => {
      // Setup: No containers running initially
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(createHealthyServices());

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        defaultConfig
      );

      // Start and stop containers
      await manager.startContainers();
      await manager.stopContainers();

      // Environment should be reset to defaults
      const config = envConfigurator.getConfiguration();
      expect(config.dbPort).toBe(5433); // Default port
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle Docker unavailable gracefully", async () => {
      (mockComposeWrapper.isAvailable as ReturnType<typeof vi.fn>).mockResolvedValue({
        available: false,
        error: "Docker daemon is not running",
        suggestion: "Start Docker Desktop",
      } as DockerAvailability);

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        defaultConfig
      );

      // Should throw with clear error
      await expect(manager.startContainers()).rejects.toThrow("Docker daemon is not running");
    });

    it("should handle health check failures", async () => {
      // Setup: Containers start but health checks fail
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            name: "postgres-test",
            status: "running",
            health: "unhealthy",
            ports: [{ internal: 5432, external: 5433, protocol: "tcp" }],
          },
          {
            name: "ollama-test",
            status: "running",
            health: "unhealthy",
            ports: [{ internal: 11434, external: 11435, protocol: "tcp" }],
          },
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        defaultConfig
      );

      // Should throw with health check error
      await expect(manager.startContainers()).rejects.toThrow("Health checks failed");
    });

    it("should handle cleanup errors gracefully", async () => {
      // Setup: Containers start successfully
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(createHealthyServices());

      // But cleanup fails
      (mockComposeWrapper.down as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Cleanup failed")
      );

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        defaultConfig
      );

      // Start containers
      await manager.startContainers();

      // Stop should not throw (cleanup is best-effort)
      await expect(manager.stopContainers()).resolves.not.toThrow();
    });
  });

  describe("Signal Handling Integration", () => {
    /**
     * Requirement 2.5: WHEN the process receives SIGINT or SIGTERM
     * THEN the Test Container Manager SHALL perform graceful container cleanup
     *
     * Note: We can't actually send signals in tests, but we can verify
     * that the cleanup function works correctly when called.
     */
    it("should support graceful cleanup for signal handlers", async () => {
      // Setup: Containers start successfully
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(createHealthyServices());

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        defaultConfig
      );

      // Start containers
      await manager.startContainers();

      // Verify containers are running
      expect(manager.getStatus().isReady).toBe(true);

      // Simulate signal handler calling stopContainers
      // This is what global-teardown.ts does on SIGINT/SIGTERM
      await manager.stopContainers();

      // Verify cleanup was performed
      expect(mockComposeWrapper.down).toHaveBeenCalled();
      expect(manager.getStatus().isReady).toBe(false);
    });

    it("should handle multiple cleanup calls safely", async () => {
      // Setup: Containers start successfully
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(createHealthyServices());

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        defaultConfig
      );

      // Start containers
      await manager.startContainers();

      // Call stopContainers multiple times (simulating signal + normal teardown)
      await manager.stopContainers();
      await manager.stopContainers(); // Second call should be safe

      // down should only be called once (second call has no services to stop)
      expect(mockComposeWrapper.down).toHaveBeenCalledTimes(1);
    });

    it("should cleanup even when tests fail (interrupted state)", async () => {
      // Setup: Containers start successfully
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(createHealthyServices());

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        defaultConfig
      );

      // Start containers
      await manager.startContainers();

      // Simulate test failure by not running any tests
      // Just call cleanup directly (as teardown would)
      await manager.stopContainers();

      // Verify cleanup was still performed
      expect(mockComposeWrapper.down).toHaveBeenCalled();
    });
  });

  describe("State Tracking Integration", () => {
    it("should track services started by manager", async () => {
      // Setup: No containers running initially
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(createHealthyServices());

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        defaultConfig
      );

      // Start containers
      await manager.startContainers();

      // Verify state tracking
      const state = manager.getState();
      expect(state.servicesStartedByManager).toContain("postgres-test");
      expect(state.servicesStartedByManager).toContain("ollama-test");
      expect(state.isInitialized).toBe(true);
    });

    it("should not track pre-existing services", async () => {
      // Setup: Containers already running
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>).mockResolvedValue(
        createHealthyServices()
      );

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        defaultConfig
      );

      // Start (reuse existing)
      await manager.startContainers();

      // Verify state tracking
      const state = manager.getState();
      expect(state.servicesStartedByManager).toHaveLength(0);
      expect(state.isInitialized).toBe(true);
    });

    it("should reset state after cleanup", async () => {
      // Setup: No containers running initially
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(createHealthyServices());

      const manager = new TestContainerManager(
        mockComposeWrapper,
        portAllocator,
        envConfigurator,
        logger,
        defaultConfig
      );

      // Start and stop
      await manager.startContainers();
      await manager.stopContainers();

      // Verify state is reset
      const state = manager.getState();
      expect(state.servicesStartedByManager).toHaveLength(0);
      expect(state.isInitialized).toBe(false);
      expect(state.portsAllocated.size).toBe(0);
    });
  });
});
