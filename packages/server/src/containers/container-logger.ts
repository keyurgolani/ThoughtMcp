/**
 * Container Logger
 *
 * Provides structured logging for container operations during test setup and teardown.
 * Logs to stderr to avoid interfering with MCP protocol on stdout.
 *
 * @module containers/container-logger
 */

import type { IContainerLogger } from "./types";

/**
 * Log levels for container operations.
 */
type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Remediation suggestions for common container errors.
 */
const REMEDIATION_SUGGESTIONS: Record<string, string> = {
  "port already in use":
    "Try stopping the conflicting service or use a different port via TEST_DB_PORT/TEST_OLLAMA_PORT environment variables",
  "connection refused": "Ensure Docker daemon is running. Try: docker info",
  "permission denied":
    "Add your user to the docker group: sudo usermod -aG docker $USER, then log out and back in",
  "image not found": "Check your internet connection and try: docker pull <image-name>",
  "no such file": "Ensure docker-compose.test.yml exists in the project root",
  timeout: "Increase CONTAINER_STARTUP_TIMEOUT or check container logs for startup issues",
  "health check":
    "Container may be slow to start. Check logs with: docker compose -f docker-compose.test.yml logs",
  "out of memory": "Increase Docker memory allocation in Docker Desktop settings",
  "disk space": "Free up disk space or run: docker system prune",
};

/**
 * Formats a timestamp for log output.
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Formats a log message with timestamp and level.
 */
function formatLogMessage(level: LogLevel, prefix: string, message: string): string {
  const timestamp = formatTimestamp();
  const levelUpper = level.toUpperCase().padEnd(5);
  return `[${timestamp}] [${levelUpper}] [${prefix}] ${message}`;
}

/**
 * Finds a remediation suggestion based on error message content.
 */
function findRemediation(error: string): string | undefined {
  const errorLower = error.toLowerCase();

  for (const [pattern, suggestion] of Object.entries(REMEDIATION_SUGGESTIONS)) {
    if (errorLower.includes(pattern)) {
      return suggestion;
    }
  }

  return undefined;
}

/**
 * ContainerLogger provides structured logging for container operations.
 *
 * Features:
 * - Timestamped log messages
 * - Log level indicators (INFO, WARN, ERROR, DEBUG)
 * - Service name prefixes for easy filtering
 * - Automatic remediation suggestions for common errors
 * - Writes to stderr to avoid MCP protocol interference
 *
 * @implements {IContainerLogger}
 */
export class ContainerLogger implements IContainerLogger {
  private readonly prefix: string;
  private readonly verbose: boolean;

  /**
   * Creates a new ContainerLogger instance.
   *
   * @param prefix - Prefix for all log messages (default: "containers")
   * @param verbose - Whether to include debug-level logs (default: based on NODE_ENV)
   */
  constructor(prefix = "containers", verbose?: boolean) {
    this.prefix = prefix;
    this.verbose = verbose ?? process.env.NODE_ENV !== "production";
  }

  /**
   * Logs that a service is starting.
   *
   * Requirement 5.1: WHEN containers are starting THEN the Test Container Manager
   * SHALL log the container name and target port
   *
   * @param serviceName - Name of the service being started
   * @param composeFile - Path to the Docker Compose file being used
   */
  logStarting(serviceName: string, composeFile: string): void {
    const message = `Starting service '${serviceName}' using ${composeFile}`;
    this.log("info", message);
  }

  /**
   * Logs health check status.
   *
   * Requirement 5.2: WHEN health checks are in progress THEN the Test Container Manager
   * SHALL log the health check status every 5 seconds
   *
   * @param serviceName - Name of the service being checked
   * @param status - Current health check status
   */
  logHealthCheck(serviceName: string, status: string): void {
    const message = `Health check for '${serviceName}': ${status}`;
    this.log("debug", message);
  }

  /**
   * Logs that a service is ready with connection details.
   *
   * Requirement 5.3: WHEN containers are ready THEN the Test Container Manager
   * SHALL log the final connection details (host, port, database name)
   *
   * @param serviceName - Name of the service that is ready
   * @param connectionDetails - Connection details string (e.g., "localhost:5433/testdb")
   */
  logReady(serviceName: string, connectionDetails: string): void {
    const message = `Service '${serviceName}' is ready at ${connectionDetails}`;
    this.log("info", message);
  }

  /**
   * Logs an error with optional remediation suggestion.
   *
   * Requirement 5.4: WHEN container startup fails THEN the Test Container Manager
   * SHALL log the Docker error output and suggest remediation steps
   *
   * @param serviceName - Name of the service that encountered an error
   * @param error - Error message or description
   * @param suggestion - Optional remediation suggestion (auto-detected if not provided)
   */
  logError(serviceName: string, error: string, suggestion?: string): void {
    const message = `Error with service '${serviceName}': ${error}`;
    this.log("error", message);

    // Use provided suggestion or try to find one based on error content
    const remediation = suggestion ?? findRemediation(error);
    if (remediation) {
      this.log("info", `Suggestion: ${remediation}`);
    }
  }

  /**
   * Logs that a service has stopped.
   *
   * Requirement 5.5: WHEN containers are stopped THEN the Test Container Manager
   * SHALL log the cleanup status
   *
   * @param serviceName - Name of the service that was stopped
   */
  logStopped(serviceName: string): void {
    const message = `Service '${serviceName}' has been stopped`;
    this.log("info", message);
  }

  /**
   * Internal logging method that writes to stderr.
   *
   * @param level - Log level
   * @param message - Message to log
   */
  private log(level: LogLevel, message: string): void {
    // Skip debug logs in production unless verbose is explicitly enabled
    if (level === "debug" && !this.verbose) {
      return;
    }

    const formattedMessage = formatLogMessage(level, this.prefix, message);
    process.stderr.write(`${formattedMessage}\n`);
  }
}

/**
 * Creates a new ContainerLogger instance.
 *
 * @param prefix - Optional prefix for log messages
 * @param verbose - Optional verbose flag
 * @returns A new ContainerLogger instance
 */
export function createContainerLogger(prefix?: string, verbose?: boolean): IContainerLogger {
  return new ContainerLogger(prefix, verbose);
}
