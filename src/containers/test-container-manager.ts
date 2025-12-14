/**
 * Test Container Manager
 *
 * Orchestrates all container management operations for test environments.
 * Uses Docker Compose as the single source of truth for container configuration.
 *
 * Key responsibilities:
 * - Start test containers using docker-compose.test.yml
 * - Detect and reuse existing containers
 * - Allocate dynamic ports when defaults are occupied
 * - Configure test environment variables
 * - Clean up containers after tests (respecting configuration)
 *
 * @module containers/test-container-manager
 */

import type {
  ContainerInfo,
  ContainerManagerConfig,
  ContainerManagerState,
  ContainerStatus,
  IContainerLogger,
  IDockerComposeWrapper,
  IEnvironmentConfigurator,
  IPortAllocator,
  ITestContainerManager,
  ServiceStatus,
} from "./types";
import { createConfigFromEnv, DEFAULT_CONTAINER_CONFIG } from "./types.js";

/**
 * Default images for container services.
 */
const SERVICE_IMAGES = {
  postgres: "pgvector/pgvector:pg16",
  ollama: "ollama/ollama:latest",
} as const;

/**
 * Internal ports for container services.
 */
const INTERNAL_PORTS = {
  postgres: 5432,
  ollama: 11434,
} as const;

/**
 * TestContainerManager orchestrates all container management operations.
 *
 * This class provides:
 * - Container lifecycle management (start, stop)
 * - Container reuse detection
 * - Dynamic port allocation
 * - Environment configuration
 * - Health checking
 *
 * @implements {ITestContainerManager}
 */
export class TestContainerManager implements ITestContainerManager {
  private readonly config: ContainerManagerConfig;
  private readonly composeWrapper: IDockerComposeWrapper;
  private readonly portAllocator: IPortAllocator;
  private readonly envConfigurator: IEnvironmentConfigurator;
  private readonly logger: IContainerLogger;
  private state: ContainerManagerState;

  /**
   * Creates a new TestContainerManager instance.
   *
   * @param composeWrapper - Docker Compose CLI wrapper
   * @param portAllocator - Port allocation manager
   * @param envConfigurator - Environment configuration manager
   * @param logger - Container operation logger
   * @param config - Optional configuration (defaults to environment-based config)
   */
  constructor(
    composeWrapper: IDockerComposeWrapper,
    portAllocator: IPortAllocator,
    envConfigurator: IEnvironmentConfigurator,
    logger: IContainerLogger,
    config?: Partial<ContainerManagerConfig>
  ) {
    this.composeWrapper = composeWrapper;
    this.portAllocator = portAllocator;
    this.envConfigurator = envConfigurator;
    this.logger = logger;

    // Merge provided config with defaults from environment
    const envConfig = createConfigFromEnv();
    this.config = {
      ...DEFAULT_CONTAINER_CONFIG,
      ...envConfig,
      ...config,
      postgres: {
        ...DEFAULT_CONTAINER_CONFIG.postgres,
        ...envConfig.postgres,
        ...config?.postgres,
      },
      ollama: {
        ...DEFAULT_CONTAINER_CONFIG.ollama,
        ...envConfig.ollama,
        ...config?.ollama,
      },
    };

    // Initialize state
    this.state = {
      servicesStartedByManager: [],
      portsAllocated: new Map(),
      isInitialized: false,
      startTime: null,
      composeFile: this.config.composeFile,
    };
  }

  /**
   * Starts test containers using docker-compose.test.yml.
   *
   * This method:
   * 1. Checks if AUTO_START_CONTAINERS is enabled
   * 2. Verifies Docker availability
   * 3. Checks for existing running containers
   * 4. Allocates dynamic ports if needed
   * 5. Starts containers via docker compose up
   * 6. Waits for health checks
   * 7. Configures environment variables
   *
   * Requirements: 1.1, 1.2, 1.3, 1.5
   *
   * @returns Promise resolving to array of container info
   * @throws Error if Docker is unavailable or containers fail to start
   */
  async startContainers(): Promise<ContainerInfo[]> {
    // Check if auto-start is disabled
    if (!this.config.autoStart) {
      this.logger.logStarting("containers", "AUTO_START_CONTAINERS=false, skipping");
      return [];
    }

    // Check Docker availability
    const availability = await this.composeWrapper.isAvailable();
    if (!availability.available) {
      this.logger.logError(
        "docker",
        availability.error ?? "Docker is not available",
        availability.suggestion
      );
      throw new Error(availability.error ?? "Docker is not available");
    }

    // Check for existing running containers
    const existingServices = await this.composeWrapper.ps(this.config.composeFile);
    const runningServices = existingServices.filter((s) => s.status === "running");

    // Check if all required services are already running and healthy
    const postgresRunning = this.findService(runningServices, this.config.postgres.serviceName);
    const ollamaRunning = this.findService(runningServices, this.config.ollama.serviceName);

    if (postgresRunning?.health === "healthy" && ollamaRunning?.health === "healthy") {
      // Reuse existing containers - don't mark as started by manager
      this.logger.logStarting("containers", "Reusing existing healthy containers");

      // Ensure embedding model is available even when reusing containers
      await this.ensureEmbeddingModel();

      this.envConfigurator.configureFromServices(runningServices);
      this.state.isInitialized = true;
      this.state.startTime = new Date();

      return this.buildContainerInfoList(runningServices, false);
    }

    // Allocate ports if defaults are occupied
    const env = await this.allocatePorts();

    // Start containers
    this.logger.logStarting("containers", this.config.composeFile);

    try {
      await this.composeWrapper.up(this.config.composeFile, {
        detach: true,
        wait: true,
        timeout: this.config.startupTimeout,
        env,
        recreate: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.logError("containers", `Failed to start: ${errorMessage}`);
      throw error;
    }

    // Get updated service status
    const services = await this.composeWrapper.ps(this.config.composeFile);

    // Verify health
    const postgresHealthy = await this.composeWrapper.isServiceHealthy(
      this.config.composeFile,
      this.config.postgres.serviceName
    );
    const ollamaHealthy = await this.composeWrapper.isServiceHealthy(
      this.config.composeFile,
      this.config.ollama.serviceName
    );

    if (!postgresHealthy || !ollamaHealthy) {
      const unhealthyServices = [];
      if (!postgresHealthy) unhealthyServices.push("postgres");
      if (!ollamaHealthy) unhealthyServices.push("ollama");

      this.logger.logError(
        "containers",
        `Health checks failed for: ${unhealthyServices.join(", ")}`,
        "Check container logs with: docker compose -f docker-compose.test.yml logs"
      );
      throw new Error(`Health checks failed for: ${unhealthyServices.join(", ")}`);
    }

    // Ensure embedding model is pulled in Ollama container
    await this.ensureEmbeddingModel();

    // Configure environment from running services
    this.envConfigurator.configureFromServices(services);

    // Track that we started these services
    this.state.servicesStartedByManager = [
      this.config.postgres.serviceName,
      this.config.ollama.serviceName,
    ];
    this.state.isInitialized = true;
    this.state.startTime = new Date();

    // Log ready status
    const config = this.envConfigurator.getConfiguration();
    this.logger.logReady("postgres", `${config.dbHost}:${config.dbPort}/${config.dbName}`);
    this.logger.logReady("ollama", config.ollamaHost);

    return this.buildContainerInfoList(services, true);
  }

  /**
   * Stops containers that were started by this manager.
   *
   * This method:
   * 1. Checks KEEP_CONTAINERS_RUNNING setting
   * 2. Only stops containers started by this manager instance
   * 3. Uses docker compose down with appropriate options
   * 4. Releases allocated ports
   * 5. Resets environment configuration
   *
   * Requirements: 2.1, 2.2, 2.3, 2.4
   *
   * @returns Promise resolving when cleanup is complete
   */
  async stopContainers(): Promise<void> {
    // Check if we should keep containers running
    if (this.config.keepRunning) {
      this.logger.logStopped("containers (kept running per KEEP_CONTAINERS_RUNNING)");
      return;
    }

    // Only stop if we started the containers
    if (this.state.servicesStartedByManager.length === 0) {
      this.logger.logStopped("containers (none started by manager)");
      return;
    }

    try {
      await this.composeWrapper.down(this.config.composeFile, {
        volumes: !this.config.preserveData,
        timeout: 10,
      });

      // Log stopped services
      for (const service of this.state.servicesStartedByManager) {
        this.logger.logStopped(service);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.logError("containers", `Failed to stop: ${errorMessage}`);
      // Don't throw - cleanup should be best-effort
    }

    // Release allocated ports
    for (const port of this.state.portsAllocated.values()) {
      this.portAllocator.releasePort(port);
    }

    // Reset environment
    this.envConfigurator.reset();

    // Reset state
    this.state = {
      servicesStartedByManager: [],
      portsAllocated: new Map(),
      isInitialized: false,
      startTime: null,
      composeFile: this.config.composeFile,
    };
  }

  /**
   * Gets the current status of managed containers.
   *
   * @returns Current container status
   */
  getStatus(): ContainerStatus {
    const config = this.envConfigurator.getConfiguration();

    return {
      postgres: this.state.isInitialized
        ? {
            name: `${this.config.projectName}-postgres`,
            service: this.config.postgres.serviceName,
            image: SERVICE_IMAGES.postgres,
            port: config.dbPort,
            internalPort: INTERNAL_PORTS.postgres,
            status: "healthy",
            startedByManager: this.state.servicesStartedByManager.includes(
              this.config.postgres.serviceName
            ),
          }
        : null,
      ollama: this.state.isInitialized
        ? {
            name: `${this.config.projectName}-ollama`,
            service: this.config.ollama.serviceName,
            image: SERVICE_IMAGES.ollama,
            port: config.ollamaPort,
            internalPort: INTERNAL_PORTS.ollama,
            status: "healthy",
            startedByManager: this.state.servicesStartedByManager.includes(
              this.config.ollama.serviceName
            ),
          }
        : null,
      startTime: this.state.startTime,
      isReady: this.state.isInitialized,
      composeFile: this.state.composeFile,
    };
  }

  /**
   * Checks if all containers are healthy.
   *
   * @returns Promise resolving to true if all containers are healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.state.isInitialized) {
      return false;
    }

    const postgresHealthy = await this.composeWrapper.isServiceHealthy(
      this.config.composeFile,
      this.config.postgres.serviceName
    );
    const ollamaHealthy = await this.composeWrapper.isServiceHealthy(
      this.config.composeFile,
      this.config.ollama.serviceName
    );

    return postgresHealthy && ollamaHealthy;
  }

  /**
   * Gets the current configuration.
   *
   * @returns Current container manager configuration
   */
  getConfig(): ContainerManagerConfig {
    return { ...this.config };
  }

  /**
   * Gets the current state.
   *
   * @returns Current container manager state
   */
  getState(): ContainerManagerState {
    return {
      ...this.state,
      portsAllocated: new Map(this.state.portsAllocated),
    };
  }

  /**
   * Ensures the embedding model is available in the Ollama container.
   * Pulls the model if it's not already present.
   *
   * This method:
   * 1. Checks if the model is already available using 'ollama list'
   * 2. If not, pulls the model using 'ollama pull'
   * 3. Waits for the pull to complete with timeout
   *
   * @throws Error if model pull fails or times out
   */
  private async ensureEmbeddingModel(): Promise<void> {
    const modelName = this.config.ollama.embeddingModel;
    const serviceName = this.config.ollama.serviceName;

    this.logger.logHealthCheck("ollama", `Checking for embedding model: ${modelName}`);

    // Check if model is already available
    const listResult = await this.composeWrapper.exec(this.config.composeFile, serviceName, [
      "ollama",
      "list",
    ]);

    if (listResult.exitCode === 0 && listResult.stdout.includes(modelName)) {
      this.logger.logHealthCheck("ollama", `Model ${modelName} already available`);
      return;
    }

    // Model not found, need to pull it
    this.logger.logHealthCheck(
      "ollama",
      `Pulling embedding model: ${modelName} (this may take a few minutes on first run)`
    );

    const pullResult = await this.pullModelWithTimeout(serviceName, modelName);

    if (pullResult.exitCode !== 0) {
      const errorMsg = pullResult.stderr || pullResult.stdout || "Unknown error";
      this.logger.logError(
        "ollama",
        `Failed to pull model ${modelName}: ${errorMsg}`,
        `Try manually: docker compose -f ${this.config.composeFile} exec ${serviceName} ollama pull ${modelName}`
      );
      throw new Error(`Failed to pull embedding model ${modelName}: ${errorMsg}`);
    }

    this.logger.logHealthCheck("ollama", `Model ${modelName} pulled successfully`);
  }

  /**
   * Pulls a model with timeout handling.
   * The ollama pull command can take several minutes for large models.
   *
   * @param serviceName - Ollama service name
   * @param modelName - Model to pull
   * @returns Execution result
   */
  private async pullModelWithTimeout(
    serviceName: string,
    modelName: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const timeoutMs = this.config.ollama.modelPullTimeout * 1000;

    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Model pull timed out after ${this.config.ollama.modelPullTimeout}s`));
      }, timeoutMs);
    });

    // Execute the pull command
    const pullPromise = this.composeWrapper.exec(this.config.composeFile, serviceName, [
      "ollama",
      "pull",
      modelName,
    ]);

    // Race between pull and timeout
    try {
      return await Promise.race([pullPromise, timeoutPromise]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 1,
        stdout: "",
        stderr: errorMessage,
      };
    }
  }

  /**
   * Allocates dynamic ports if defaults are occupied.
   *
   * @returns Environment variables with allocated ports
   */
  private async allocatePorts(): Promise<Record<string, string>> {
    const env: Record<string, string> = {};

    // Check PostgreSQL port
    const pgDefaultPort = this.config.postgres.defaultPort;
    const pgAvailable = await this.portAllocator.isPortAvailable(pgDefaultPort);

    if (!pgAvailable) {
      const pgPort = await this.portAllocator.findAvailablePort(
        this.config.postgres.portRangeStart,
        this.config.postgres.portRangeEnd
      );
      this.portAllocator.reservePort(pgPort);
      this.state.portsAllocated.set(this.config.postgres.serviceName, pgPort);
      env.TEST_DB_PORT = String(pgPort);
      this.logger.logHealthCheck(
        "postgres",
        `Using dynamic port ${pgPort} (default ${pgDefaultPort} occupied)`
      );
    }

    // Check Ollama port
    const ollamaDefaultPort = this.config.ollama.defaultPort;
    const ollamaAvailable = await this.portAllocator.isPortAvailable(ollamaDefaultPort);

    if (!ollamaAvailable) {
      const ollamaPort = await this.portAllocator.findAvailablePort(
        this.config.ollama.portRangeStart,
        this.config.ollama.portRangeEnd
      );
      this.portAllocator.reservePort(ollamaPort);
      this.state.portsAllocated.set(this.config.ollama.serviceName, ollamaPort);
      env.TEST_OLLAMA_PORT = String(ollamaPort);
      this.logger.logHealthCheck(
        "ollama",
        `Using dynamic port ${ollamaPort} (default ${ollamaDefaultPort} occupied)`
      );
    }

    return env;
  }

  /**
   * Finds a service by name in the service list.
   *
   * @param services - List of services
   * @param serviceName - Name to find
   * @returns Service status or undefined
   */
  private findService(services: ServiceStatus[], serviceName: string): ServiceStatus | undefined {
    return services.find((s) => s.name === serviceName);
  }

  /**
   * Builds container info list from service statuses.
   *
   * @param services - Service statuses from docker compose ps
   * @param startedByManager - Whether containers were started by this manager
   * @returns Array of container info
   */
  private buildContainerInfoList(
    services: ServiceStatus[],
    startedByManager: boolean
  ): ContainerInfo[] {
    const result: ContainerInfo[] = [];

    const postgres = this.findService(services, this.config.postgres.serviceName);
    if (postgres) {
      const externalPort = postgres.ports.find((p) => p.internal === INTERNAL_PORTS.postgres);
      result.push({
        name: `${this.config.projectName}-postgres`,
        service: this.config.postgres.serviceName,
        image: SERVICE_IMAGES.postgres,
        port: externalPort?.external ?? this.config.postgres.defaultPort,
        internalPort: INTERNAL_PORTS.postgres,
        status: postgres.health === "healthy" ? "healthy" : "starting",
        startedByManager,
      });
    }

    const ollama = this.findService(services, this.config.ollama.serviceName);
    if (ollama) {
      const externalPort = ollama.ports.find((p) => p.internal === INTERNAL_PORTS.ollama);
      result.push({
        name: `${this.config.projectName}-ollama`,
        service: this.config.ollama.serviceName,
        image: SERVICE_IMAGES.ollama,
        port: externalPort?.external ?? this.config.ollama.defaultPort,
        internalPort: INTERNAL_PORTS.ollama,
        status: ollama.health === "healthy" ? "healthy" : "starting",
        startedByManager,
      });
    }

    return result;
  }
}

/**
 * Creates a new TestContainerManager with default dependencies.
 *
 * @param config - Optional configuration overrides
 * @returns A new TestContainerManager instance
 */
export function createTestContainerManager(
  composeWrapper: IDockerComposeWrapper,
  portAllocator: IPortAllocator,
  envConfigurator: IEnvironmentConfigurator,
  logger: IContainerLogger,
  config?: Partial<ContainerManagerConfig>
): ITestContainerManager {
  return new TestContainerManager(composeWrapper, portAllocator, envConfigurator, logger, config);
}
