/**
 * Container Management Types
 *
 * Type definitions for the Docker Compose-based container management system.
 * These interfaces define the contracts for managing test containers,
 * port allocation, environment configuration, and logging.
 *
 * @module containers/types
 */

// =============================================================================
// Docker Compose Wrapper Types
// =============================================================================

/**
 * Options for starting Docker Compose services.
 */
export interface ComposeUpOptions {
  /** Run containers in detached mode (-d flag) */
  detach?: boolean;
  /** Wait for health checks to pass (--wait flag) */
  wait?: boolean;
  /** Timeout in seconds for --wait-timeout */
  timeout?: number;
  /** Additional environment variables to pass to Docker Compose */
  env?: Record<string, string>;
  /** Force recreation of containers (--force-recreate) */
  recreate?: boolean;
}

/**
 * Options for stopping Docker Compose services.
 */
export interface ComposeDownOptions {
  /** Remove volumes (-v flag) */
  volumes?: boolean;
  /** Timeout in seconds for graceful shutdown */
  timeout?: number;
}

/**
 * Port mapping between container internal and host external ports.
 */
export interface PortMapping {
  /** Port inside the container */
  internal: number;
  /** Port exposed on the host */
  external: number;
  /** Network protocol */
  protocol: "tcp" | "udp";
}

/**
 * Status of a Docker Compose service.
 */
export interface ServiceStatus {
  /** Service name as defined in docker-compose.yml */
  name: string;
  /** Current container status */
  status: "running" | "exited" | "paused" | "restarting" | "created";
  /** Health check status */
  health: "healthy" | "unhealthy" | "starting" | "none";
  /** Port mappings for this service */
  ports: PortMapping[];
}

/**
 * Docker and Docker Compose availability information.
 */
export interface DockerAvailability {
  /** Whether Docker and Docker Compose are available */
  available: boolean;
  /** Docker version string */
  dockerVersion?: string;
  /** Docker Compose version string */
  composeVersion?: string;
  /** Error message if not available */
  error?: string;
  /** Suggestion for resolving the issue */
  suggestion?: string;
}

/**
 * Result of executing a command in a container.
 */
export interface ExecResult {
  /** Exit code of the command */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
}

/**
 * Interface for wrapping Docker Compose CLI commands.
 * This is the primary interface for container management operations.
 */
export interface IDockerComposeWrapper {
  /** Check if Docker and Docker Compose are available */
  isAvailable(): Promise<DockerAvailability>;

  /** Start services defined in a compose file */
  up(composeFile: string, options?: ComposeUpOptions): Promise<void>;

  /** Stop and remove services */
  down(composeFile: string, options?: ComposeDownOptions): Promise<void>;

  /** Get status of services */
  ps(composeFile: string): Promise<ServiceStatus[]>;

  /** Check if specific service is running and healthy */
  isServiceHealthy(composeFile: string, serviceName: string): Promise<boolean>;

  /** Get logs from a service */
  logs(composeFile: string, serviceName: string, tail?: number): Promise<string>;

  /** Execute command in a running service */
  exec(composeFile: string, serviceName: string, command: string[]): Promise<ExecResult>;
}

// =============================================================================
// Port Allocator Types
// =============================================================================

/**
 * Interface for managing dynamic port allocation.
 * Used to find available ports when defaults are occupied.
 */
export interface IPortAllocator {
  /** Find an available port in the specified range */
  findAvailablePort(startPort: number, endPort: number): Promise<number>;

  /** Check if a specific port is available */
  isPortAvailable(port: number): Promise<boolean>;

  /** Reserve a port (mark as in-use for this process) */
  reservePort(port: number): void;

  /** Release a reserved port */
  releasePort(port: number): void;
}

// =============================================================================
// Environment Configurator Types
// =============================================================================

/**
 * Test environment configuration values.
 */
export interface TestEnvironmentConfig {
  /** Full PostgreSQL connection URL */
  databaseUrl: string;
  /** Database host */
  dbHost: string;
  /** Database port */
  dbPort: number;
  /** Database name */
  dbName: string;
  /** Database user */
  dbUser: string;
  /** Database password */
  dbPassword: string;
  /** Ollama host URL (e.g., http://localhost:11435) */
  ollamaHost: string;
  /** Ollama port */
  ollamaPort: number;
}

/**
 * Interface for managing test environment configuration.
 * Updates environment variables based on running container status.
 */
export interface IEnvironmentConfigurator {
  /** Configure environment based on running services */
  configureFromServices(services: ServiceStatus[]): void;

  /** Configure environment for PostgreSQL */
  configurePostgres(
    host: string,
    port: number,
    database: string,
    user: string,
    password: string
  ): void;

  /** Configure environment for Ollama */
  configureOllama(host: string, port: number): void;

  /** Get current configuration */
  getConfiguration(): TestEnvironmentConfig;

  /** Reset to defaults */
  reset(): void;
}

// =============================================================================
// Container Logger Types
// =============================================================================

/**
 * Interface for structured logging of container operations.
 */
export interface IContainerLogger {
  /** Log that a service is starting */
  logStarting(serviceName: string, composeFile: string): void;

  /** Log health check status */
  logHealthCheck(serviceName: string, status: string): void;

  /** Log that a service is ready with connection details */
  logReady(serviceName: string, connectionDetails: string): void;

  /** Log an error with optional remediation suggestion */
  logError(serviceName: string, error: string, suggestion?: string): void;

  /** Log that a service has stopped */
  logStopped(serviceName: string): void;
}

// =============================================================================
// Test Container Manager Types
// =============================================================================

/**
 * Information about a running container.
 */
export interface ContainerInfo {
  /** Container name */
  name: string;
  /** Docker Compose service name */
  service: string;
  /** Docker image used */
  image: string;
  /** External port on host */
  port: number;
  /** Internal port in container */
  internalPort: number;
  /** Current container status */
  status: "starting" | "healthy" | "unhealthy" | "stopped";
  /** Whether this container was started by the manager */
  startedByManager: boolean;
}

/**
 * Overall status of managed containers.
 */
export interface ContainerStatus {
  /** PostgreSQL container info, or null if not running */
  postgres: ContainerInfo | null;
  /** Ollama container info, or null if not running */
  ollama: ContainerInfo | null;
  /** When containers were started */
  startTime: Date | null;
  /** Whether all containers are ready */
  isReady: boolean;
  /** Which compose file is being used */
  composeFile: string;
}

/**
 * Configuration for the TestContainerManager.
 */
export interface ContainerManagerConfig {
  // Behavior settings (from environment)
  /** Whether to automatically start containers (AUTO_START_CONTAINERS) */
  autoStart: boolean;
  /** Timeout in seconds for container startup (CONTAINER_STARTUP_TIMEOUT) */
  startupTimeout: number;
  /** Whether to keep containers running after tests (KEEP_CONTAINERS_RUNNING) */
  keepRunning: boolean;
  /** Whether to preserve test data volumes (PRESERVE_TEST_DATA) */
  preserveData: boolean;
  /** Whether running in CI environment (CI) */
  isCI: boolean;

  // Docker Compose settings
  /** Path to docker-compose.test.yml */
  composeFile: string;
  /** Docker Compose project name */
  projectName: string;

  // Port configuration for PostgreSQL
  postgres: {
    /** Default port (5433) */
    defaultPort: number;
    /** Start of port range for dynamic allocation (5434) */
    portRangeStart: number;
    /** End of port range for dynamic allocation (5500) */
    portRangeEnd: number;
    /** Service name in docker-compose.yml ('postgres-test') */
    serviceName: string;
  };

  // Port configuration for Ollama
  ollama: {
    /** Default port (11435) */
    defaultPort: number;
    /** Start of port range for dynamic allocation (11436) */
    portRangeStart: number;
    /** End of port range for dynamic allocation (11500) */
    portRangeEnd: number;
    /** Service name in docker-compose.yml ('ollama-test') */
    serviceName: string;
    /** Embedding model to pull (e.g., 'nomic-embed-text') */
    embeddingModel: string;
    /** Timeout in seconds for model pull operation */
    modelPullTimeout: number;
  };
}

/**
 * Internal state tracking for the TestContainerManager.
 */
export interface ContainerManagerState {
  /** Service names that were started by this manager instance */
  servicesStartedByManager: string[];
  /** Map of service name to allocated port */
  portsAllocated: Map<string, number>;
  /** Whether the manager has been initialized */
  isInitialized: boolean;
  /** When containers were started */
  startTime: Date | null;
  /** Which compose file is being used */
  composeFile: string;
}

/**
 * Interface for the main TestContainerManager.
 * Orchestrates all container management operations.
 */
export interface ITestContainerManager {
  /** Start test containers using docker-compose.test.yml */
  startContainers(): Promise<ContainerInfo[]>;

  /** Stop containers (respects KEEP_CONTAINERS_RUNNING) */
  stopContainers(): Promise<void>;

  /** Get current container status */
  getStatus(): ContainerStatus;

  /** Check if containers are healthy */
  isHealthy(): Promise<boolean>;
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default configuration values for the container manager.
 */
export const DEFAULT_CONTAINER_CONFIG: ContainerManagerConfig = {
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
    modelPullTimeout: 300, // 5 minutes for model download
  },
};

/**
 * Creates a ContainerManagerConfig from environment variables.
 */
export function createConfigFromEnv(): ContainerManagerConfig {
  return {
    autoStart: process.env.AUTO_START_CONTAINERS !== "false",
    startupTimeout: parseInt(process.env.CONTAINER_STARTUP_TIMEOUT ?? "60", 10),
    keepRunning: process.env.KEEP_CONTAINERS_RUNNING === "true",
    preserveData: process.env.PRESERVE_TEST_DATA === "true",
    isCI: process.env.CI === "true",
    composeFile: process.env.TEST_COMPOSE_FILE ?? "docker-compose.test.yml",
    projectName: process.env.TEST_CONTAINER_PREFIX ?? "thoughtmcp-test",
    postgres: {
      defaultPort: parseInt(process.env.TEST_DB_PORT ?? "5433", 10),
      portRangeStart: 5434,
      portRangeEnd: 5500,
      serviceName: "postgres-test",
    },
    ollama: {
      defaultPort: parseInt(process.env.TEST_OLLAMA_PORT ?? "11435", 10),
      portRangeStart: 11436,
      portRangeEnd: 11500,
      serviceName: "ollama-test",
      embeddingModel: process.env.EMBEDDING_MODEL ?? "nomic-embed-text",
      modelPullTimeout: parseInt(process.env.MODEL_PULL_TIMEOUT ?? "300", 10),
    },
  };
}
