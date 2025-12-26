/**
 * Container Management Module
 *
 * Provides Docker Compose-based container management for test environments.
 * This module wraps `docker compose` commands to provide a consistent interface
 * for starting, stopping, and monitoring test containers.
 *
 * Key components:
 * - DockerComposeWrapper: Wraps docker compose CLI commands
 * - PortAllocator: Manages dynamic port allocation
 * - EnvironmentConfigurator: Updates test environment variables
 * - TestContainerManager: Main orchestrator for container lifecycle
 * - ContainerLogger: Structured logging for container operations
 *
 * @module containers
 */

// Export all types
export type {
  ComposeDownOptions,
  // Docker Compose types
  ComposeUpOptions,
  // Test container manager types
  ContainerInfo,
  ContainerManagerConfig,
  ContainerManagerState,
  ContainerStatus,
  DockerAvailability,
  ExecResult,
  // Container logger types
  IContainerLogger,
  IDockerComposeWrapper,
  IEnvironmentConfigurator,
  // Port allocator types
  IPortAllocator,
  ITestContainerManager,
  PortMapping,
  ServiceStatus,
  // Environment configurator types
  TestEnvironmentConfig,
} from "./types";

// Export default configuration and factory function
export { DEFAULT_CONTAINER_CONFIG, createConfigFromEnv } from "./types";

// Export DockerComposeWrapper
export { DockerComposeWrapper, createDockerComposeWrapper } from "./docker-compose-wrapper";

// Export PortAllocator
export { PortAllocationError, PortAllocator, createPortAllocator } from "./port-allocator";

// Export EnvironmentConfigurator
export { EnvironmentConfigurator, createEnvironmentConfigurator } from "./environment-configurator";

// Export ContainerLogger
export { ContainerLogger, createContainerLogger } from "./container-logger";

// Export TestContainerManager
export { TestContainerManager, createTestContainerManager } from "./test-container-manager";
