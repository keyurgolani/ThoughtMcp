/**
 * Docker Compose Wrapper
 *
 * Wraps `docker compose` CLI commands to provide a consistent interface
 * for managing test containers. This is the primary interface for container
 * management operations.
 *
 * @module containers/docker-compose-wrapper
 */

import { exec } from "child_process";
import { promisify } from "util";

import type {
  ComposeDownOptions,
  ComposeUpOptions,
  DockerAvailability,
  ExecResult,
  IDockerComposeWrapper,
  PortMapping,
  ServiceStatus,
} from "./types";

const execAsync = promisify(exec);

/**
 * Parses Docker Compose ps JSON output into ServiceStatus array.
 * Handles both JSON array format and NDJSON (newline-delimited JSON) format.
 */
function parseComposePs(output: string): ServiceStatus[] {
  if (!output.trim()) {
    return [];
  }

  try {
    // First try parsing as a JSON array
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed)) {
      return parsed.map(parseServiceObject);
    }
    // If it's a single object, check if it looks like a valid service
    // Valid services have a Service or Name field
    if (parsed && typeof parsed === "object" && (parsed.Service || parsed.Name)) {
      return [parseServiceObject(parsed)];
    }
    // Otherwise it's likely an error response or invalid format
    return [];
  } catch {
    // If JSON array parsing fails, try NDJSON (newline-delimited JSON)
    // This is the format docker compose ps --format json uses
    const lines = output.trim().split("\n");
    const services: ServiceStatus[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      try {
        const service = JSON.parse(trimmedLine);
        // Only add if it looks like a valid service object
        if (service && typeof service === "object" && (service.Service || service.Name)) {
          services.push(parseServiceObject(service));
        }
      } catch {
        // Skip lines that aren't valid JSON
        continue;
      }
    }

    return services;
  }
}

/**
 * Parses a single service object from Docker Compose ps output.
 */
function parseServiceObject(service: Record<string, unknown>): ServiceStatus {
  const ports = parsePortMappings(
    (service.Publishers as Array<{
      PublishedPort?: number;
      TargetPort?: number;
      Protocol?: string;
    }>) ?? []
  );
  const health = parseHealthStatus((service.Health as string) ?? (service.State as string) ?? "");
  const status = parseContainerStatus((service.State as string) ?? "");

  return {
    name: (service.Service as string) ?? (service.Name as string) ?? "",
    status,
    health,
    ports,
  };
}

/**
 * Parses port mappings from Docker Compose ps output.
 */
function parsePortMappings(
  publishers: Array<{
    PublishedPort?: number;
    TargetPort?: number;
    Protocol?: string;
  }>
): PortMapping[] {
  if (!Array.isArray(publishers)) {
    return [];
  }

  return publishers
    .filter((p) => p.PublishedPort && p.TargetPort)
    .map((p) => ({
      external: p.PublishedPort as number,
      internal: p.TargetPort as number,
      protocol: p.Protocol === "udp" ? "udp" : "tcp",
    }));
}

/**
 * Parses health status from Docker Compose ps output.
 */
function parseHealthStatus(health: string): ServiceStatus["health"] {
  const healthLower = health.toLowerCase();
  if (healthLower.includes("healthy") && !healthLower.includes("unhealthy")) {
    return "healthy";
  }
  if (healthLower.includes("unhealthy")) {
    return "unhealthy";
  }
  if (healthLower.includes("starting") || healthLower.includes("health:")) {
    return "starting";
  }
  return "none";
}

/**
 * Parses container status from Docker Compose ps output.
 */
function parseContainerStatus(state: string): ServiceStatus["status"] {
  const stateLower = state.toLowerCase();
  if (stateLower.includes("running")) {
    return "running";
  }
  if (stateLower.includes("exited")) {
    return "exited";
  }
  if (stateLower.includes("paused")) {
    return "paused";
  }
  if (stateLower.includes("restarting")) {
    return "restarting";
  }
  return "created";
}

/**
 * Builds the base docker compose command with the compose file.
 */
function buildComposeCommand(composeFile: string): string[] {
  return ["docker", "compose", "-f", composeFile];
}

/**
 * DockerComposeWrapper provides a TypeScript interface for Docker Compose CLI commands.
 *
 * This class wraps the `docker compose` CLI to provide:
 * - Availability checking for Docker and Docker Compose
 * - Starting and stopping services
 * - Service status and health checking
 * - Log retrieval and command execution
 *
 * @implements {IDockerComposeWrapper}
 */
export class DockerComposeWrapper implements IDockerComposeWrapper {
  /**
   * Checks if Docker and Docker Compose are available on the system.
   *
   * @returns Promise resolving to availability information
   */
  async isAvailable(): Promise<DockerAvailability> {
    try {
      // Check Docker version
      const dockerVersionResult = await this.runCommand(["docker", "--version"]);
      if (dockerVersionResult.exitCode !== 0) {
        return {
          available: false,
          error: "Docker is not installed or not in PATH",
          suggestion: "Install Docker Desktop from https://www.docker.com/products/docker-desktop",
        };
      }
      const dockerVersion = this.parseVersion(
        dockerVersionResult.stdout,
        /Docker version ([^\s,]+)/
      );

      // Check if Docker daemon is running
      const dockerInfoResult = await this.runCommand(["docker", "info"]);
      if (dockerInfoResult.exitCode !== 0) {
        const isPermissionError =
          dockerInfoResult.stderr.includes("permission denied") ||
          dockerInfoResult.stderr.includes("Permission denied");

        if (isPermissionError) {
          return {
            available: false,
            dockerVersion,
            error: "Docker permission denied",
            suggestion:
              "Add your user to the docker group: sudo usermod -aG docker $USER, then log out and back in",
          };
        }

        return {
          available: false,
          dockerVersion,
          error: "Docker daemon is not running",
          suggestion: "Start Docker Desktop or run: sudo systemctl start docker",
        };
      }

      // Check Docker Compose version
      const composeVersionResult = await this.runCommand(["docker", "compose", "version"]);
      if (composeVersionResult.exitCode !== 0) {
        return {
          available: false,
          dockerVersion,
          error: "Docker Compose is not available",
          suggestion:
            "Docker Compose should be included with Docker Desktop. Try updating Docker or install docker-compose-plugin",
        };
      }
      const composeVersion = this.parseVersion(
        composeVersionResult.stdout,
        /Docker Compose version v?([^\s]+)/
      );

      return {
        available: true,
        dockerVersion,
        composeVersion,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        available: false,
        error: `Failed to check Docker availability: ${errorMessage}`,
        suggestion: "Ensure Docker is installed and the docker command is in your PATH",
      };
    }
  }

  /**
   * Starts services defined in a Docker Compose file.
   *
   * @param composeFile - Path to the docker-compose.yml file
   * @param options - Options for starting services
   * @throws Error if the command fails
   */
  async up(composeFile: string, options: ComposeUpOptions = {}): Promise<void> {
    const args = [...buildComposeCommand(composeFile), "up"];

    if (options.detach !== false) {
      args.push("-d");
    }

    if (options.wait) {
      args.push("--wait");
      if (options.timeout) {
        args.push("--wait-timeout", String(options.timeout));
      }
    }

    if (options.recreate) {
      args.push("--force-recreate");
    }

    const env = { ...process.env, ...options.env };
    const result = await this.runCommand(args, { env });

    if (result.exitCode !== 0) {
      throw new Error(`docker compose up failed: ${result.stderr || result.stdout}`);
    }
  }

  /**
   * Stops and removes services defined in a Docker Compose file.
   *
   * @param composeFile - Path to the docker-compose.yml file
   * @param options - Options for stopping services
   * @throws Error if the command fails
   */
  async down(composeFile: string, options: ComposeDownOptions = {}): Promise<void> {
    const args = [...buildComposeCommand(composeFile), "down"];

    if (options.volumes) {
      args.push("-v");
    }

    if (options.timeout !== undefined) {
      args.push("--timeout", String(options.timeout));
    }

    const result = await this.runCommand(args);

    if (result.exitCode !== 0) {
      throw new Error(`docker compose down failed: ${result.stderr || result.stdout}`);
    }
  }

  /**
   * Gets the status of services defined in a Docker Compose file.
   *
   * @param composeFile - Path to the docker-compose.yml file
   * @returns Promise resolving to array of service statuses
   */
  async ps(composeFile: string): Promise<ServiceStatus[]> {
    const args = [...buildComposeCommand(composeFile), "ps", "--format", "json"];
    const result = await this.runCommand(args);

    if (result.exitCode !== 0) {
      // If no containers are running, docker compose ps may return non-zero
      // but we should return an empty array, not throw
      if (result.stderr.includes("no such service") || result.stdout.trim() === "") {
        return [];
      }
      throw new Error(`docker compose ps failed: ${result.stderr || result.stdout}`);
    }

    return parseComposePs(result.stdout);
  }

  /**
   * Checks if a specific service is running and healthy.
   *
   * @param composeFile - Path to the docker-compose.yml file
   * @param serviceName - Name of the service to check
   * @returns Promise resolving to true if service is healthy
   */
  async isServiceHealthy(composeFile: string, serviceName: string): Promise<boolean> {
    const services = await this.ps(composeFile);
    const service = services.find((s) => s.name === serviceName);

    if (!service) {
      return false;
    }

    return service.status === "running" && service.health === "healthy";
  }

  /**
   * Gets logs from a service.
   *
   * @param composeFile - Path to the docker-compose.yml file
   * @param serviceName - Name of the service
   * @param tail - Number of lines to return (default: all)
   * @returns Promise resolving to log output
   */
  async logs(composeFile: string, serviceName: string, tail?: number): Promise<string> {
    const args = [...buildComposeCommand(composeFile), "logs", serviceName];

    if (tail !== undefined) {
      args.push("--tail", String(tail));
    }

    const result = await this.runCommand(args);

    if (result.exitCode !== 0) {
      throw new Error(`docker compose logs failed: ${result.stderr || result.stdout}`);
    }

    return result.stdout;
  }

  /**
   * Executes a command in a running service container.
   *
   * @param composeFile - Path to the docker-compose.yml file
   * @param serviceName - Name of the service
   * @param command - Command and arguments to execute
   * @returns Promise resolving to execution result
   */
  async exec(composeFile: string, serviceName: string, command: string[]): Promise<ExecResult> {
    const args = [...buildComposeCommand(composeFile), "exec", "-T", serviceName, ...command];

    return this.runCommand(args);
  }

  /**
   * Runs a command and returns the result.
   *
   * @param args - Command and arguments
   * @param options - Execution options
   * @returns Promise resolving to execution result
   */
  private async runCommand(
    args: string[],
    options: { env?: NodeJS.ProcessEnv } = {}
  ): Promise<ExecResult> {
    const command = args.join(" ");

    try {
      const { stdout, stderr } = await execAsync(command, {
        env: options.env ?? process.env,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      });

      return {
        exitCode: 0,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
      };
    } catch (error) {
      // execAsync throws on non-zero exit codes
      const execError = error as {
        code?: number;
        stdout?: string | Buffer;
        stderr?: string | Buffer;
      };

      return {
        exitCode: execError.code ?? 1,
        stdout: execError.stdout?.toString() ?? "",
        stderr: execError.stderr?.toString() ?? "",
      };
    }
  }

  /**
   * Parses a version string from command output.
   *
   * @param output - Command output
   * @param pattern - Regex pattern with capture group for version
   * @returns Version string or undefined
   */
  private parseVersion(output: string, pattern: RegExp): string | undefined {
    const match = output.match(pattern);
    return match?.[1];
  }
}

/**
 * Creates a new DockerComposeWrapper instance.
 */
export function createDockerComposeWrapper(): IDockerComposeWrapper {
  return new DockerComposeWrapper();
}
