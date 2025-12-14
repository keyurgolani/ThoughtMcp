/**
 * TestContainerManager Unit Tests
 *
 * Tests for the TestContainerManager that orchestrates container lifecycle.
 * These tests mock all dependencies to test the orchestration logic
 * without requiring Docker to be installed.
 *
 * @module __tests__/unit/containers/test-container-manager.test
 *
 * _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.4_
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("TestContainerManager", () => {
  // Mock dependencies
  let mockComposeWrapper: IDockerComposeWrapper;
  let mockPortAllocator: IPortAllocator;
  let mockEnvConfigurator: IEnvironmentConfigurator;
  let mockLogger: IContainerLogger;

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

  // Default mock environment config
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

  beforeEach(() => {
    // Create mock implementations
    mockComposeWrapper = {
      isAvailable: vi.fn(),
      up: vi.fn(),
      down: vi.fn(),
      ps: vi.fn(),
      isServiceHealthy: vi.fn(),
      logs: vi.fn(),
      exec: vi.fn(),
    };

    mockPortAllocator = {
      isPortAvailable: vi.fn(),
      findAvailablePort: vi.fn(),
      reservePort: vi.fn(),
      releasePort: vi.fn(),
    };

    mockEnvConfigurator = {
      configureFromServices: vi.fn(),
      configurePostgres: vi.fn(),
      configureOllama: vi.fn(),
      getConfiguration: vi.fn().mockReturnValue(defaultEnvConfig),
      reset: vi.fn(),
    };

    mockLogger = {
      logStarting: vi.fn(),
      logHealthCheck: vi.fn(),
      logReady: vi.fn(),
      logError: vi.fn(),
      logStopped: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create manager with default mocks
  function createManager(config?: Partial<ContainerManagerConfig>): TestContainerManager {
    return new TestContainerManager(
      mockComposeWrapper,
      mockPortAllocator,
      mockEnvConfigurator,
      mockLogger,
      { ...defaultConfig, ...config }
    );
  }

  // Helper to mock Docker available
  function mockDockerAvailable(): void {
    (mockComposeWrapper.isAvailable as ReturnType<typeof vi.fn>).mockResolvedValue({
      available: true,
      dockerVersion: "24.0.0",
      composeVersion: "2.20.0",
    } as DockerAvailability);
  }

  // Helper to mock Docker unavailable
  function mockDockerUnavailable(error: string, suggestion?: string): void {
    (mockComposeWrapper.isAvailable as ReturnType<typeof vi.fn>).mockResolvedValue({
      available: false,
      error,
      suggestion,
    } as DockerAvailability);
  }

  // Helper to mock healthy services
  function mockHealthyServices(): void {
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
    (mockComposeWrapper.ps as ReturnType<typeof vi.fn>).mockResolvedValue(services);
    (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    // Mock embedding model already available
    (mockComposeWrapper.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
      exitCode: 0,
      stdout:
        "NAME                    ID              SIZE      MODIFIED\nnomic-embed-text:latest abc123          274 MB    2 days ago",
      stderr: "",
    });
  }

  // Helper to mock no running services
  function mockNoRunningServices(): void {
    (mockComposeWrapper.ps as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // Mock embedding model check - model already available (default behavior)
    (mockComposeWrapper.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
      exitCode: 0,
      stdout:
        "NAME                    ID              SIZE      MODIFIED\nnomic-embed-text:latest abc123          274 MB    2 days ago",
      stderr: "",
    });
  }

  // Helper to mock ports available
  function mockPortsAvailable(): void {
    (mockPortAllocator.isPortAvailable as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  }

  describe("startContainers", () => {
    /**
     * Requirement 1.1: WHEN the test suite starts THEN the Test Container Manager
     * SHALL check if required containers are already running
     */
    it("should check for existing running containers", async () => {
      mockDockerAvailable();
      mockHealthyServices();
      mockPortsAvailable();

      const manager = createManager();
      await manager.startContainers();

      expect(mockComposeWrapper.ps).toHaveBeenCalledWith("docker-compose.test.yml");
    });

    /**
     * Requirement 1.5: WHEN containers are already running on expected ports
     * THEN the Test Container Manager SHALL reuse the existing containers
     */
    it("should reuse existing healthy containers", async () => {
      mockDockerAvailable();
      mockHealthyServices();

      const manager = createManager();
      const containers = await manager.startContainers();

      // Should not call up since containers are already running
      expect(mockComposeWrapper.up).not.toHaveBeenCalled();
      // Should configure environment from existing services
      expect(mockEnvConfigurator.configureFromServices).toHaveBeenCalled();
      // Should return container info with startedByManager = false
      expect(containers).toHaveLength(2);
      expect(containers[0].startedByManager).toBe(false);
      expect(containers[1].startedByManager).toBe(false);
    });

    /**
     * Requirement 1.2: WHEN required containers are not running
     * THEN the Test Container Manager SHALL start the containers using Docker
     */
    it("should start containers when none are running", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      mockPortsAvailable();
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      // After up, return healthy services
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([]) // First call - no services
        .mockResolvedValueOnce([
          // After up
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
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager();
      const containers = await manager.startContainers();

      expect(mockComposeWrapper.up).toHaveBeenCalledWith(
        "docker-compose.test.yml",
        expect.objectContaining({
          detach: true,
          wait: true,
          timeout: 60,
        })
      );
      expect(containers).toHaveLength(2);
      expect(containers[0].startedByManager).toBe(true);
    });

    /**
     * Requirement 1.3: WHEN containers are started THEN the Test Container Manager
     * SHALL wait for health checks to pass before allowing tests to proceed
     */
    it("should wait for health checks via docker compose --wait", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      mockPortsAvailable();
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
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
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager();
      await manager.startContainers();

      expect(mockComposeWrapper.up).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ wait: true })
      );
    });

    it("should throw error when health checks fail", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      mockPortsAvailable();
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            name: "postgres-test",
            status: "running",
            health: "unhealthy",
            ports: [],
          },
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const manager = createManager();

      await expect(manager.startContainers()).rejects.toThrow("Health checks failed");
      expect(mockLogger.logError).toHaveBeenCalled();
    });

    it("should skip startup when AUTO_START_CONTAINERS is false", async () => {
      const manager = createManager({ autoStart: false });
      const containers = await manager.startContainers();

      expect(mockComposeWrapper.isAvailable).not.toHaveBeenCalled();
      expect(mockComposeWrapper.up).not.toHaveBeenCalled();
      expect(containers).toEqual([]);
    });

    it("should throw error when Docker is unavailable", async () => {
      mockDockerUnavailable("Docker is not installed", "Install Docker Desktop");

      const manager = createManager();

      await expect(manager.startContainers()).rejects.toThrow("Docker is not installed");
      expect(mockLogger.logError).toHaveBeenCalledWith(
        "docker",
        "Docker is not installed",
        "Install Docker Desktop"
      );
    });

    it("should allocate dynamic ports when defaults are occupied", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      // First port check fails (occupied), second succeeds
      (mockPortAllocator.isPortAvailable as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(false) // postgres default port occupied
        .mockResolvedValueOnce(true); // ollama default port available
      (mockPortAllocator.findAvailablePort as ReturnType<typeof vi.fn>).mockResolvedValue(5434);
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            name: "postgres-test",
            status: "running",
            health: "healthy",
            ports: [{ internal: 5432, external: 5434, protocol: "tcp" }],
          },
          {
            name: "ollama-test",
            status: "running",
            health: "healthy",
            ports: [{ internal: 11434, external: 11435, protocol: "tcp" }],
          },
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager();
      await manager.startContainers();

      expect(mockPortAllocator.findAvailablePort).toHaveBeenCalledWith(5434, 5500);
      expect(mockPortAllocator.reservePort).toHaveBeenCalledWith(5434);
      expect(mockComposeWrapper.up).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: expect.objectContaining({ TEST_DB_PORT: "5434" }),
        })
      );
    });

    it("should log ready status with connection details", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      mockPortsAvailable();
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
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
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager();
      await manager.startContainers();

      expect(mockLogger.logReady).toHaveBeenCalledWith(
        "postgres",
        expect.stringContaining("localhost:5433")
      );
      expect(mockLogger.logReady).toHaveBeenCalledWith(
        "ollama",
        expect.stringContaining("http://localhost:11435")
      );
    });

    it("should check for embedding model and pull if not available", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      mockPortsAvailable();
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      // First exec call: model not found, second: pull succeeds
      (mockComposeWrapper.exec as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: "NAME                    ID              SIZE      MODIFIED\n",
          stderr: "",
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: "pulling manifest\npulling abc123\nverifying sha256\nwriting manifest\nsuccess",
          stderr: "",
        });
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
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
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager();
      await manager.startContainers();

      // Should have called exec twice: once to list, once to pull
      expect(mockComposeWrapper.exec).toHaveBeenCalledTimes(2);
      expect(mockComposeWrapper.exec).toHaveBeenCalledWith(
        "docker-compose.test.yml",
        "ollama-test",
        ["ollama", "list"]
      );
      expect(mockComposeWrapper.exec).toHaveBeenCalledWith(
        "docker-compose.test.yml",
        "ollama-test",
        ["ollama", "pull", "nomic-embed-text"]
      );
      expect(mockLogger.logHealthCheck).toHaveBeenCalledWith(
        "ollama",
        expect.stringContaining("Pulling embedding model")
      );
    });

    it("should skip model pull if model already available", async () => {
      mockDockerAvailable();
      mockHealthyServices();

      const manager = createManager();
      await manager.startContainers();

      // Should have called exec only once to check model availability
      expect(mockComposeWrapper.exec).toHaveBeenCalledTimes(1);
      expect(mockComposeWrapper.exec).toHaveBeenCalledWith(
        "docker-compose.test.yml",
        "ollama-test",
        ["ollama", "list"]
      );
      expect(mockLogger.logHealthCheck).toHaveBeenCalledWith(
        "ollama",
        expect.stringContaining("already available")
      );
    });

    it("should throw error if model pull fails", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      mockPortsAvailable();
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      // First exec call: model not found, second: pull fails
      (mockComposeWrapper.exec as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: "NAME                    ID              SIZE      MODIFIED\n",
          stderr: "",
        })
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: "",
          stderr: "Error: pull model manifest: file does not exist",
        });
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
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
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager();

      await expect(manager.startContainers()).rejects.toThrow(
        "Failed to pull embedding model nomic-embed-text"
      );
      expect(mockLogger.logError).toHaveBeenCalledWith(
        "ollama",
        expect.stringContaining("Failed to pull model"),
        expect.any(String)
      );
    });
  });

  describe("stopContainers", () => {
    /**
     * Requirement 2.1: WHEN all tests complete successfully
     * THEN the Test Container Manager SHALL stop containers that it started
     */
    it("should stop containers that were started by manager", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      mockPortsAvailable();
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.down as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
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
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager();
      await manager.startContainers();
      await manager.stopContainers();

      expect(mockComposeWrapper.down).toHaveBeenCalledWith(
        "docker-compose.test.yml",
        expect.objectContaining({ volumes: true })
      );
    });

    /**
     * Requirement 2.4: WHEN containers were pre-existing (not started by Test Container Manager)
     * THEN the Test Container Manager SHALL leave those containers running
     */
    it("should not stop pre-existing containers", async () => {
      mockDockerAvailable();
      mockHealthyServices();

      const manager = createManager();
      await manager.startContainers(); // Reuses existing
      await manager.stopContainers();

      expect(mockComposeWrapper.down).not.toHaveBeenCalled();
      expect(mockLogger.logStopped).toHaveBeenCalledWith(
        expect.stringContaining("none started by manager")
      );
    });

    /**
     * Requirement 6.3: WHEN the environment variable KEEP_CONTAINERS_RUNNING is set to "true"
     * THEN the Test Container Manager SHALL not stop containers after tests complete
     */
    it("should not stop containers when KEEP_CONTAINERS_RUNNING is true", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      mockPortsAvailable();
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
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
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager({ keepRunning: true });
      await manager.startContainers();
      await manager.stopContainers();

      expect(mockComposeWrapper.down).not.toHaveBeenCalled();
      expect(mockLogger.logStopped).toHaveBeenCalledWith(expect.stringContaining("kept running"));
    });

    /**
     * Requirement 2.3: WHEN the Test Container Manager stops containers
     * THEN the Test Container Manager SHALL remove the containers to free resources
     */
    it("should remove volumes when preserveData is false", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      mockPortsAvailable();
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.down as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
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
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager({ preserveData: false });
      await manager.startContainers();
      await manager.stopContainers();

      expect(mockComposeWrapper.down).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ volumes: true })
      );
    });

    it("should preserve volumes when preserveData is true", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      mockPortsAvailable();
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.down as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
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
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager({ preserveData: true });
      await manager.startContainers();
      await manager.stopContainers();

      expect(mockComposeWrapper.down).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ volumes: false })
      );
    });

    it("should release allocated ports on cleanup", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      (mockPortAllocator.isPortAvailable as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);
      (mockPortAllocator.findAvailablePort as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(5434)
        .mockResolvedValueOnce(11436);
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.down as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            name: "postgres-test",
            status: "running",
            health: "healthy",
            ports: [{ internal: 5432, external: 5434, protocol: "tcp" }],
          },
          {
            name: "ollama-test",
            status: "running",
            health: "healthy",
            ports: [{ internal: 11434, external: 11436, protocol: "tcp" }],
          },
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager();
      await manager.startContainers();
      await manager.stopContainers();

      expect(mockPortAllocator.releasePort).toHaveBeenCalledWith(5434);
      expect(mockPortAllocator.releasePort).toHaveBeenCalledWith(11436);
    });

    it("should reset environment configuration on cleanup", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      mockPortsAvailable();
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.down as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
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
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager();
      await manager.startContainers();
      await manager.stopContainers();

      expect(mockEnvConfigurator.reset).toHaveBeenCalled();
    });

    /**
     * Requirement 2.2: WHEN tests fail or are interrupted
     * THEN the Test Container Manager SHALL still stop containers that it started
     */
    it("should handle cleanup errors gracefully", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      mockPortsAvailable();
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.down as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Cleanup failed")
      );
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
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
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager();
      await manager.startContainers();

      // Should not throw, cleanup is best-effort
      await expect(manager.stopContainers()).resolves.not.toThrow();
      expect(mockLogger.logError).toHaveBeenCalledWith(
        "containers",
        expect.stringContaining("Failed to stop")
      );
    });
  });

  describe("getStatus", () => {
    it("should return null containers when not initialized", () => {
      const manager = createManager();
      const status = manager.getStatus();

      expect(status.postgres).toBeNull();
      expect(status.ollama).toBeNull();
      expect(status.isReady).toBe(false);
      expect(status.startTime).toBeNull();
    });

    it("should return container info when initialized", async () => {
      mockDockerAvailable();
      mockHealthyServices();

      const manager = createManager();
      await manager.startContainers();
      const status = manager.getStatus();

      expect(status.postgres).not.toBeNull();
      expect(status.postgres?.service).toBe("postgres-test");
      expect(status.postgres?.port).toBe(5433);
      expect(status.ollama).not.toBeNull();
      expect(status.ollama?.service).toBe("ollama-test");
      expect(status.isReady).toBe(true);
      expect(status.startTime).toBeInstanceOf(Date);
    });

    it("should indicate startedByManager correctly", async () => {
      mockDockerAvailable();
      mockHealthyServices();

      const manager = createManager();
      await manager.startContainers(); // Reuses existing
      const status = manager.getStatus();

      expect(status.postgres?.startedByManager).toBe(false);
      expect(status.ollama?.startedByManager).toBe(false);
    });
  });

  describe("isHealthy", () => {
    it("should return false when not initialized", async () => {
      const manager = createManager();
      const healthy = await manager.isHealthy();

      expect(healthy).toBe(false);
    });

    it("should return true when all services are healthy", async () => {
      mockDockerAvailable();
      mockHealthyServices();

      const manager = createManager();
      await manager.startContainers();

      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      const healthy = await manager.isHealthy();

      expect(healthy).toBe(true);
    });

    it("should return false when any service is unhealthy", async () => {
      mockDockerAvailable();
      mockHealthyServices();

      const manager = createManager();
      await manager.startContainers();

      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(true) // postgres healthy
        .mockResolvedValueOnce(false); // ollama unhealthy

      const healthy = await manager.isHealthy();

      expect(healthy).toBe(false);
    });
  });

  describe("getConfig and getState", () => {
    it("should return current configuration", () => {
      const manager = createManager({ startupTimeout: 120 });
      const config = manager.getConfig();

      expect(config.startupTimeout).toBe(120);
      expect(config.composeFile).toBe("docker-compose.test.yml");
    });

    it("should return current state", async () => {
      mockDockerAvailable();
      mockNoRunningServices();
      mockPortsAvailable();
      (mockComposeWrapper.up as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockComposeWrapper.ps as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
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
        ]);
      (mockComposeWrapper.isServiceHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const manager = createManager();
      await manager.startContainers();
      const state = manager.getState();

      expect(state.isInitialized).toBe(true);
      expect(state.servicesStartedByManager).toContain("postgres-test");
      expect(state.servicesStartedByManager).toContain("ollama-test");
    });
  });
});
