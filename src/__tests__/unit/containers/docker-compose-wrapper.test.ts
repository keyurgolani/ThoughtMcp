/**
 * DockerComposeWrapper Unit Tests
 *
 * Tests for the Docker Compose CLI wrapper that provides container management operations.
 * These tests mock the runCommand method to test command building and parsing
 * without requiring Docker to be installed.
 *
 * @module __tests__/unit/containers/docker-compose-wrapper.test
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DockerComposeWrapper } from "../../../containers/docker-compose-wrapper";
import type { ComposeDownOptions, ComposeUpOptions, ExecResult } from "../../../containers/types";

describe("DockerComposeWrapper", () => {
  let wrapper: DockerComposeWrapper;
  let runCommandSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    wrapper = new DockerComposeWrapper();
    // Spy on the private runCommand method
    runCommandSpy = vi.spyOn(wrapper as any, "runCommand");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper to mock successful command execution
  function mockRunCommandSuccess(stdout: string, stderr = ""): void {
    runCommandSpy.mockResolvedValue({ exitCode: 0, stdout, stderr });
  }

  // Helper to mock failed command execution
  function mockRunCommandFailure(code: number, stdout = "", stderr = ""): void {
    runCommandSpy.mockResolvedValue({ exitCode: code, stdout, stderr });
  }

  // Helper to mock sequential command executions
  function mockRunCommandSequence(
    responses: Array<{ exitCode: number; stdout?: string; stderr?: string }>
  ): void {
    let callIndex = 0;
    runCommandSpy.mockImplementation(async (): Promise<ExecResult> => {
      const response = responses[callIndex] || responses[responses.length - 1];
      callIndex++;
      return {
        exitCode: response.exitCode,
        stdout: response.stdout || "",
        stderr: response.stderr || "",
      };
    });
  }

  describe("isAvailable - Docker/Compose availability detection", () => {
    /**
     * Requirement 7.1: WHEN Docker is not installed THEN the Test Container Manager
     * SHALL report a clear error message with installation instructions
     */
    it("should detect when Docker is not installed", async () => {
      mockRunCommandFailure(127, "", "docker: command not found");

      const result = await wrapper.isAvailable();

      expect(result.available).toBe(false);
      expect(result.error).toContain("Docker is not installed");
      expect(result.suggestion).toContain("Install Docker Desktop");
    });

    /**
     * Requirement 7.2: WHEN Docker daemon is not running THEN the Test Container Manager
     * SHALL report a clear error message with startup instructions
     */
    it("should detect when Docker daemon is not running", async () => {
      mockRunCommandSequence([
        { exitCode: 0, stdout: "Docker version 24.0.0, build abc123" },
        { exitCode: 1, stderr: "Cannot connect to the Docker daemon" },
      ]);

      const result = await wrapper.isAvailable();

      expect(result.available).toBe(false);
      expect(result.dockerVersion).toBe("24.0.0");
      expect(result.error).toContain("Docker daemon is not running");
      expect(result.suggestion).toContain("Start Docker Desktop");
    });

    /**
     * Requirement 7.3: WHEN Docker commands fail due to permissions THEN the Test Container Manager
     * SHALL suggest running with appropriate permissions
     */
    it("should detect permission denied errors", async () => {
      mockRunCommandSequence([
        { exitCode: 0, stdout: "Docker version 24.0.0" },
        { exitCode: 1, stderr: "permission denied while trying to connect" },
      ]);

      const result = await wrapper.isAvailable();

      expect(result.available).toBe(false);
      expect(result.error).toContain("permission denied");
      expect(result.suggestion).toContain("docker group");
    });

    it("should detect when Docker Compose is not available", async () => {
      mockRunCommandSequence([
        { exitCode: 0, stdout: "Docker version 24.0.0" },
        { exitCode: 0, stdout: "Docker info output" },
        { exitCode: 1, stderr: "docker compose: command not found" },
      ]);

      const result = await wrapper.isAvailable();

      expect(result.available).toBe(false);
      expect(result.dockerVersion).toBe("24.0.0");
      expect(result.error).toContain("Docker Compose is not available");
      expect(result.suggestion).toContain("docker-compose-plugin");
    });

    it("should return available when Docker and Compose are installed", async () => {
      mockRunCommandSequence([
        { exitCode: 0, stdout: "Docker version 24.0.0, build abc123" },
        { exitCode: 0, stdout: "Docker info output" },
        { exitCode: 0, stdout: "Docker Compose version v2.20.0" },
      ]);

      const result = await wrapper.isAvailable();

      expect(result.available).toBe(true);
      expect(result.dockerVersion).toBe("24.0.0");
      expect(result.composeVersion).toBe("2.20.0");
      expect(result.error).toBeUndefined();
    });

    /**
     * Requirement 7.5: WHEN Docker version is incompatible THEN the Test Container Manager
     * SHALL report the minimum required version
     */
    it("should parse Docker version correctly", async () => {
      mockRunCommandSequence([
        { exitCode: 0, stdout: "Docker version 20.10.17, build 100c701" },
        { exitCode: 0, stdout: "Docker info" },
        { exitCode: 0, stdout: "Docker Compose version 2.17.3" },
      ]);

      const result = await wrapper.isAvailable();

      expect(result.available).toBe(true);
      expect(result.dockerVersion).toBe("20.10.17");
      expect(result.composeVersion).toBe("2.17.3");
    });

    it("should handle unexpected errors gracefully", async () => {
      runCommandSpy.mockRejectedValue(new Error("Unexpected system error"));

      const result = await wrapper.isAvailable();

      expect(result.available).toBe(false);
      expect(result.error).toContain("Failed to check Docker availability");
      expect(result.suggestion).toContain("PATH");
    });
  });

  describe("up - Start services", () => {
    it("should execute docker compose up with compose file", async () => {
      mockRunCommandSuccess("");

      await wrapper.up("docker-compose.test.yml");

      expect(runCommandSpy).toHaveBeenCalledWith(
        expect.arrayContaining(["docker", "compose", "-f", "docker-compose.test.yml", "up"]),
        expect.any(Object)
      );
    });

    it("should include -d flag by default", async () => {
      mockRunCommandSuccess("");

      await wrapper.up("docker-compose.test.yml");

      expect(runCommandSpy).toHaveBeenCalledWith(
        expect.arrayContaining(["-d"]),
        expect.any(Object)
      );
    });

    it("should include --wait flag when wait option is true", async () => {
      mockRunCommandSuccess("");

      await wrapper.up("docker-compose.test.yml", { wait: true });

      expect(runCommandSpy).toHaveBeenCalledWith(
        expect.arrayContaining(["--wait"]),
        expect.any(Object)
      );
    });

    it("should include --wait-timeout when timeout is specified with wait", async () => {
      mockRunCommandSuccess("");

      await wrapper.up("docker-compose.test.yml", { wait: true, timeout: 120 });

      const callArgs = runCommandSpy.mock.calls[0][0] as string[];
      expect(callArgs).toContain("--wait-timeout");
      expect(callArgs).toContain("120");
    });

    it("should include --force-recreate when recreate option is true", async () => {
      mockRunCommandSuccess("");

      await wrapper.up("docker-compose.test.yml", { recreate: true });

      expect(runCommandSpy).toHaveBeenCalledWith(
        expect.arrayContaining(["--force-recreate"]),
        expect.any(Object)
      );
    });

    it("should pass environment variables to docker compose", async () => {
      mockRunCommandSuccess("");

      const options: ComposeUpOptions = {
        env: { TEST_DB_PORT: "5434", TEST_OLLAMA_PORT: "11436" },
      };

      await wrapper.up("docker-compose.test.yml", options);

      expect(runCommandSpy).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            TEST_DB_PORT: "5434",
            TEST_OLLAMA_PORT: "11436",
          }),
        })
      );
    });

    it("should throw error when docker compose up fails", async () => {
      mockRunCommandFailure(1, "", "Error: service postgres-test failed to start");

      await expect(wrapper.up("docker-compose.test.yml")).rejects.toThrow(
        "docker compose up failed"
      );
    });

    it("should not include -d flag when detach is false", async () => {
      mockRunCommandSuccess("");

      await wrapper.up("docker-compose.test.yml", { detach: false });

      const callArgs = runCommandSpy.mock.calls[0][0] as string[];
      expect(callArgs).toContain("up");
      expect(callArgs).not.toContain("-d");
    });
  });

  describe("down - Stop services", () => {
    it("should execute docker compose down with compose file", async () => {
      mockRunCommandSuccess("");

      await wrapper.down("docker-compose.test.yml");

      expect(runCommandSpy).toHaveBeenCalledWith([
        "docker",
        "compose",
        "-f",
        "docker-compose.test.yml",
        "down",
      ]);
    });

    it("should include -v flag when volumes option is true", async () => {
      mockRunCommandSuccess("");

      await wrapper.down("docker-compose.test.yml", { volumes: true });

      const callArgs = runCommandSpy.mock.calls[0][0] as string[];
      expect(callArgs).toContain("-v");
    });

    it("should include --timeout when timeout is specified", async () => {
      mockRunCommandSuccess("");

      await wrapper.down("docker-compose.test.yml", { timeout: 30 });

      const callArgs = runCommandSpy.mock.calls[0][0] as string[];
      expect(callArgs).toContain("--timeout");
      expect(callArgs).toContain("30");
    });

    it("should throw error when docker compose down fails", async () => {
      mockRunCommandFailure(1, "", "Error: failed to stop containers");

      await expect(wrapper.down("docker-compose.test.yml")).rejects.toThrow(
        "docker compose down failed"
      );
    });

    it("should handle both volumes and timeout options", async () => {
      mockRunCommandSuccess("");

      const options: ComposeDownOptions = { volumes: true, timeout: 60 };

      await wrapper.down("docker-compose.test.yml", options);

      const callArgs = runCommandSpy.mock.calls[0][0] as string[];
      expect(callArgs).toContain("-v");
      expect(callArgs).toContain("--timeout");
      expect(callArgs).toContain("60");
    });
  });

  describe("ps - Service status parsing", () => {
    it("should parse JSON output from docker compose ps", async () => {
      const psOutput = JSON.stringify([
        {
          Service: "postgres-test",
          State: "running",
          Health: "healthy",
          Publishers: [{ PublishedPort: 5433, TargetPort: 5432, Protocol: "tcp" }],
        },
        {
          Service: "ollama-test",
          State: "running",
          Health: "healthy",
          Publishers: [{ PublishedPort: 11435, TargetPort: 11434, Protocol: "tcp" }],
        },
      ]);
      mockRunCommandSuccess(psOutput);

      const services = await wrapper.ps("docker-compose.test.yml");

      expect(services).toHaveLength(2);
      expect(services[0].name).toBe("postgres-test");
      expect(services[0].status).toBe("running");
      expect(services[0].health).toBe("healthy");
      expect(services[0].ports).toHaveLength(1);
      expect(services[0].ports[0].external).toBe(5433);
      expect(services[0].ports[0].internal).toBe(5432);
    });

    it("should return empty array when no containers are running", async () => {
      mockRunCommandSuccess("");

      const services = await wrapper.ps("docker-compose.test.yml");

      expect(services).toEqual([]);
    });

    it("should handle services with no health check", async () => {
      const psOutput = JSON.stringify([
        {
          Service: "redis",
          State: "running",
          Publishers: [{ PublishedPort: 6379, TargetPort: 6379, Protocol: "tcp" }],
        },
      ]);
      mockRunCommandSuccess(psOutput);

      const services = await wrapper.ps("docker-compose.test.yml");

      expect(services[0].health).toBe("none");
    });

    it("should parse unhealthy status correctly", async () => {
      const psOutput = JSON.stringify([
        {
          Service: "postgres-test",
          State: "running",
          Health: "unhealthy",
          Publishers: [],
        },
      ]);
      mockRunCommandSuccess(psOutput);

      const services = await wrapper.ps("docker-compose.test.yml");

      expect(services[0].health).toBe("unhealthy");
    });

    it("should parse starting health status correctly", async () => {
      const psOutput = JSON.stringify([
        {
          Service: "postgres-test",
          State: "running",
          Health: "health: starting",
          Publishers: [],
        },
      ]);
      mockRunCommandSuccess(psOutput);

      const services = await wrapper.ps("docker-compose.test.yml");

      expect(services[0].health).toBe("starting");
    });

    it("should parse exited status correctly", async () => {
      const psOutput = JSON.stringify([
        {
          Service: "postgres-test",
          State: "exited",
          Health: "",
          Publishers: [],
        },
      ]);
      mockRunCommandSuccess(psOutput);

      const services = await wrapper.ps("docker-compose.test.yml");

      expect(services[0].status).toBe("exited");
    });

    it("should handle services with multiple port mappings", async () => {
      const psOutput = JSON.stringify([
        {
          Service: "web",
          State: "running",
          Health: "healthy",
          Publishers: [
            { PublishedPort: 80, TargetPort: 80, Protocol: "tcp" },
            { PublishedPort: 443, TargetPort: 443, Protocol: "tcp" },
          ],
        },
      ]);
      mockRunCommandSuccess(psOutput);

      const services = await wrapper.ps("docker-compose.test.yml");

      expect(services[0].ports).toHaveLength(2);
      expect(services[0].ports[0].external).toBe(80);
      expect(services[0].ports[1].external).toBe(443);
    });

    it("should handle UDP protocol", async () => {
      const psOutput = JSON.stringify([
        {
          Service: "dns",
          State: "running",
          Health: "healthy",
          Publishers: [{ PublishedPort: 53, TargetPort: 53, Protocol: "udp" }],
        },
      ]);
      mockRunCommandSuccess(psOutput);

      const services = await wrapper.ps("docker-compose.test.yml");

      expect(services[0].ports[0].protocol).toBe("udp");
    });

    it("should return empty array when ps command fails with no such service", async () => {
      mockRunCommandFailure(1, "", "no such service: unknown");

      const services = await wrapper.ps("docker-compose.test.yml");

      expect(services).toEqual([]);
    });

    it("should throw error for other ps failures", async () => {
      // The ps method only throws if stderr doesn't contain "no such service" and stdout is not empty
      // So we need to provide a non-empty stdout to trigger the throw
      mockRunCommandFailure(1, "some output", "Error: compose file not found");

      await expect(wrapper.ps("nonexistent.yml")).rejects.toThrow("docker compose ps failed");
    });

    it("should handle malformed JSON gracefully", async () => {
      mockRunCommandSuccess("not valid json");

      const services = await wrapper.ps("docker-compose.test.yml");

      expect(services).toEqual([]);
    });

    it("should handle non-array JSON response", async () => {
      mockRunCommandSuccess('{"error": "something"}');

      const services = await wrapper.ps("docker-compose.test.yml");

      expect(services).toEqual([]);
    });
  });

  describe("isServiceHealthy", () => {
    it("should return true when service is running and healthy", async () => {
      const psOutput = JSON.stringify([
        {
          Service: "postgres-test",
          State: "running",
          Health: "healthy",
          Publishers: [],
        },
      ]);
      mockRunCommandSuccess(psOutput);

      const isHealthy = await wrapper.isServiceHealthy("docker-compose.test.yml", "postgres-test");

      expect(isHealthy).toBe(true);
    });

    it("should return false when service is not found", async () => {
      mockRunCommandSuccess("[]");

      const isHealthy = await wrapper.isServiceHealthy("docker-compose.test.yml", "unknown");

      expect(isHealthy).toBe(false);
    });

    it("should return false when service is running but unhealthy", async () => {
      const psOutput = JSON.stringify([
        {
          Service: "postgres-test",
          State: "running",
          Health: "unhealthy",
          Publishers: [],
        },
      ]);
      mockRunCommandSuccess(psOutput);

      const isHealthy = await wrapper.isServiceHealthy("docker-compose.test.yml", "postgres-test");

      expect(isHealthy).toBe(false);
    });

    it("should return false when service is exited", async () => {
      const psOutput = JSON.stringify([
        {
          Service: "postgres-test",
          State: "exited",
          Health: "healthy",
          Publishers: [],
        },
      ]);
      mockRunCommandSuccess(psOutput);

      const isHealthy = await wrapper.isServiceHealthy("docker-compose.test.yml", "postgres-test");

      expect(isHealthy).toBe(false);
    });

    it("should return false when service health is starting", async () => {
      const psOutput = JSON.stringify([
        {
          Service: "postgres-test",
          State: "running",
          Health: "starting",
          Publishers: [],
        },
      ]);
      mockRunCommandSuccess(psOutput);

      const isHealthy = await wrapper.isServiceHealthy("docker-compose.test.yml", "postgres-test");

      expect(isHealthy).toBe(false);
    });
  });

  describe("logs", () => {
    it("should execute docker compose logs for a service", async () => {
      mockRunCommandSuccess("2024-01-01 postgres started\n2024-01-01 ready to accept connections");

      const logs = await wrapper.logs("docker-compose.test.yml", "postgres-test");

      expect(runCommandSpy).toHaveBeenCalledWith([
        "docker",
        "compose",
        "-f",
        "docker-compose.test.yml",
        "logs",
        "postgres-test",
      ]);
      expect(logs).toContain("postgres started");
    });

    it("should include --tail option when specified", async () => {
      mockRunCommandSuccess("last 10 lines");

      await wrapper.logs("docker-compose.test.yml", "postgres-test", 10);

      const callArgs = runCommandSpy.mock.calls[0][0] as string[];
      expect(callArgs).toContain("--tail");
      expect(callArgs).toContain("10");
    });

    it("should throw error when logs command fails", async () => {
      mockRunCommandFailure(1, "", "Error: no such service");

      await expect(wrapper.logs("docker-compose.test.yml", "unknown")).rejects.toThrow(
        "docker compose logs failed"
      );
    });
  });

  describe("exec", () => {
    it("should execute command in a running container", async () => {
      mockRunCommandSuccess("command output");

      const result = await wrapper.exec("docker-compose.test.yml", "postgres-test", [
        "pg_isready",
        "-U",
        "test",
      ]);

      expect(runCommandSpy).toHaveBeenCalledWith([
        "docker",
        "compose",
        "-f",
        "docker-compose.test.yml",
        "exec",
        "-T",
        "postgres-test",
        "pg_isready",
        "-U",
        "test",
      ]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("command output");
    });

    it("should return non-zero exit code on command failure", async () => {
      mockRunCommandFailure(1, "", "command failed");

      const result = await wrapper.exec("docker-compose.test.yml", "postgres-test", ["false"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe("command failed");
    });

    it("should include -T flag for non-interactive execution", async () => {
      mockRunCommandSuccess("");

      await wrapper.exec("docker-compose.test.yml", "postgres-test", ["echo", "test"]);

      const callArgs = runCommandSpy.mock.calls[0][0] as string[];
      expect(callArgs).toContain("-T");
    });
  });

  /**
   * Requirement 7.4: WHEN Docker is unavailable and AUTO_START_CONTAINERS is "false"
   * THEN the Test Container Manager SHALL proceed without error (assuming external containers)
   *
   * This is tested at the TestContainerManager level, but we verify the wrapper
   * provides the necessary information for that decision.
   */
  describe("Integration scenarios", () => {
    it("should provide enough information for AUTO_START_CONTAINERS=false decision", async () => {
      mockRunCommandFailure(127, "", "docker: command not found");

      const availability = await wrapper.isAvailable();

      expect(availability.available).toBe(false);
      expect(availability.error).toBeDefined();
    });
  });
});
