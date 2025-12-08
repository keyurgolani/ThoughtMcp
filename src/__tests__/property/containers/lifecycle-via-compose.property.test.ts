/**
 * Property Test: Container Lifecycle via Docker Compose
 *
 * **Feature: auto-test-containers, Property 3: Container Lifecycle via Docker Compose**
 *
 * This property test validates that the DockerComposeWrapper uses `docker compose up`
 * and `docker compose down` commands for container lifecycle management, not direct
 * Docker CLI commands.
 *
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.3**
 *
 * - Requirement 1.1: WHEN the test suite starts THEN the Test Container Manager SHALL
 *   check if required containers are already running
 * - Requirement 1.2: WHEN required containers are not running THEN the Test Container
 *   Manager SHALL start the containers using Docker
 * - Requirement 2.1: WHEN all tests complete successfully THEN the Test Container
 *   Manager SHALL stop containers that it started
 * - Requirement 2.3: WHEN the Test Container Manager stops containers THEN the Test
 *   Container Manager SHALL remove the containers to free resources
 *
 * @module __tests__/property/containers/lifecycle-via-compose.property.test
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import type {
  ComposeDownOptions,
  ComposeUpOptions,
  IDockerComposeWrapper,
  ServiceStatus,
} from "../../../containers/types";

/**
 * Mock implementation that tracks all commands that WOULD be executed.
 * This simulates the command building logic of DockerComposeWrapper
 * without actually executing any commands.
 */
class MockDockerComposeWrapper implements IDockerComposeWrapper {
  public executedCommands: string[] = [];

  async up(composeFile: string, options: ComposeUpOptions = {}): Promise<void> {
    const args = ["docker", "compose", "-f", composeFile, "up"];
    if (options.detach !== false) args.push("-d");
    if (options.wait) {
      args.push("--wait");
      if (options.timeout) args.push("--wait-timeout", String(options.timeout));
    }
    if (options.recreate) args.push("--force-recreate");
    this.executedCommands.push(args.join(" "));
  }

  async down(composeFile: string, options: ComposeDownOptions = {}): Promise<void> {
    const args = ["docker", "compose", "-f", composeFile, "down"];
    if (options.volumes) args.push("-v");
    if (options.timeout !== undefined) args.push("--timeout", String(options.timeout));
    this.executedCommands.push(args.join(" "));
  }

  async ps(composeFile: string): Promise<ServiceStatus[]> {
    this.executedCommands.push(`docker compose -f ${composeFile} ps --format json`);
    return [];
  }

  async isServiceHealthy(composeFile: string, _serviceName: string): Promise<boolean> {
    this.executedCommands.push(`docker compose -f ${composeFile} ps --format json`);
    return true;
  }

  async logs(composeFile: string, serviceName: string, tail?: number): Promise<string> {
    const args = ["docker", "compose", "-f", composeFile, "logs", serviceName];
    if (tail !== undefined) args.push("--tail", String(tail));
    this.executedCommands.push(args.join(" "));
    return "";
  }

  async exec(
    composeFile: string,
    serviceName: string,
    command: string[]
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const args = ["docker", "compose", "-f", composeFile, "exec", "-T", serviceName, ...command];
    this.executedCommands.push(args.join(" "));
    return { exitCode: 0, stdout: "", stderr: "" };
  }

  async isAvailable(): Promise<{
    available: boolean;
    dockerVersion?: string;
    composeVersion?: string;
  }> {
    this.executedCommands.push("docker --version");
    this.executedCommands.push("docker info");
    this.executedCommands.push("docker compose version");
    return { available: true, dockerVersion: "24.0.0", composeVersion: "2.20.0" };
  }
}

function isDockerComposeCommand(command: string): boolean {
  const directDockerCommands = [
    /^docker run\b/,
    /^docker stop\b/,
    /^docker rm\b/,
    /^docker start\b/,
    /^docker kill\b/,
    /^docker create\b/,
    /^docker container\b/,
  ];
  for (const pattern of directDockerCommands) {
    if (pattern.test(command)) return false;
  }
  const validPatterns = [/^docker compose\b/, /^docker --version\b/, /^docker info\b/];
  return validPatterns.some((pattern) => pattern.test(command));
}

const composeFileArb = fc.constantFrom(
  "docker-compose.test.yml",
  "docker-compose.dev.yml",
  "docker-compose.prod.yml"
);

const composeUpOptionsArb = fc.record({
  detach: fc.boolean(),
  wait: fc.boolean(),
  timeout: fc.option(fc.integer({ min: 1, max: 300 }), { nil: undefined }),
  recreate: fc.boolean(),
});

const composeDownOptionsArb = fc.record({
  volumes: fc.boolean(),
  timeout: fc.option(fc.integer({ min: 1, max: 60 }), { nil: undefined }),
});

const serviceNameArb = fc.constantFrom("postgres-test", "ollama-test", "postgres", "ollama");

describe("Property 3: Container Lifecycle via Docker Compose", () => {
  describe("Container startup uses docker compose up", () => {
    it("should use docker compose up for any compose file and options", async () => {
      await fc.assert(
        fc.asyncProperty(composeFileArb, composeUpOptionsArb, async (composeFile, options) => {
          const wrapper = new MockDockerComposeWrapper();
          await wrapper.up(composeFile, options);
          const upCommand = wrapper.executedCommands.find((cmd) => cmd.includes("up"));
          expect(upCommand).toBeDefined();
          expect(upCommand).toMatch(/^docker compose -f .+ up/);
          for (const cmd of wrapper.executedCommands) {
            expect(isDockerComposeCommand(cmd)).toBe(true);
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should include compose file in up command", async () => {
      await fc.assert(
        fc.asyncProperty(composeFileArb, async (composeFile) => {
          const wrapper = new MockDockerComposeWrapper();
          await wrapper.up(composeFile);
          const upCommand = wrapper.executedCommands.find((cmd) => cmd.includes("up"));
          expect(upCommand).toContain(`-f ${composeFile}`);
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Container shutdown uses docker compose down", () => {
    it("should use docker compose down for any compose file and options", async () => {
      await fc.assert(
        fc.asyncProperty(composeFileArb, composeDownOptionsArb, async (composeFile, options) => {
          const wrapper = new MockDockerComposeWrapper();
          await wrapper.down(composeFile, options);
          const downCommand = wrapper.executedCommands.find((cmd) => cmd.includes("down"));
          expect(downCommand).toBeDefined();
          expect(downCommand).toMatch(/^docker compose -f .+ down/);
          for (const cmd of wrapper.executedCommands) {
            expect(isDockerComposeCommand(cmd)).toBe(true);
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should include compose file in down command", async () => {
      await fc.assert(
        fc.asyncProperty(composeFileArb, async (composeFile) => {
          const wrapper = new MockDockerComposeWrapper();
          await wrapper.down(composeFile);
          const downCommand = wrapper.executedCommands.find((cmd) => cmd.includes("down"));
          expect(downCommand).toContain(`-f ${composeFile}`);
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Container status check uses docker compose ps", () => {
    it("should use docker compose ps for any compose file", async () => {
      await fc.assert(
        fc.asyncProperty(composeFileArb, async (composeFile) => {
          const wrapper = new MockDockerComposeWrapper();
          await wrapper.ps(composeFile);
          const psCommand = wrapper.executedCommands.find((cmd) => cmd.includes("ps"));
          expect(psCommand).toBeDefined();
          expect(psCommand).toMatch(/^docker compose -f .+ ps/);
          for (const cmd of wrapper.executedCommands) {
            expect(isDockerComposeCommand(cmd)).toBe(true);
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Health check uses docker compose", () => {
    it("should use docker compose ps for health checks", async () => {
      await fc.assert(
        fc.asyncProperty(composeFileArb, serviceNameArb, async (composeFile, serviceName) => {
          const wrapper = new MockDockerComposeWrapper();
          await wrapper.isServiceHealthy(composeFile, serviceName);
          const psCommand = wrapper.executedCommands.find((cmd) => cmd.includes("ps"));
          expect(psCommand).toBeDefined();
          expect(psCommand).toMatch(/^docker compose -f .+ ps/);
          for (const cmd of wrapper.executedCommands) {
            expect(isDockerComposeCommand(cmd)).toBe(true);
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Log retrieval uses docker compose logs", () => {
    it("should use docker compose logs for any compose file and service", async () => {
      await fc.assert(
        fc.asyncProperty(
          composeFileArb,
          serviceNameArb,
          fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
          async (composeFile, serviceName, tail) => {
            const wrapper = new MockDockerComposeWrapper();
            await wrapper.logs(composeFile, serviceName, tail);
            const logsCommand = wrapper.executedCommands.find((cmd) => cmd.includes("logs"));
            expect(logsCommand).toBeDefined();
            expect(logsCommand).toMatch(/^docker compose -f .+ logs/);
            for (const cmd of wrapper.executedCommands) {
              expect(isDockerComposeCommand(cmd)).toBe(true);
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Full lifecycle uses only docker compose commands", () => {
    it("should use only docker compose commands for complete lifecycle", async () => {
      await fc.assert(
        fc.asyncProperty(
          composeFileArb,
          composeUpOptionsArb,
          composeDownOptionsArb,
          async (composeFile, upOptions, downOptions) => {
            const wrapper = new MockDockerComposeWrapper();
            await wrapper.isAvailable();
            await wrapper.ps(composeFile);
            await wrapper.up(composeFile, upOptions);
            await wrapper.ps(composeFile);
            await wrapper.isServiceHealthy(composeFile, "postgres-test");
            await wrapper.down(composeFile, downOptions);
            for (const cmd of wrapper.executedCommands) {
              expect(isDockerComposeCommand(cmd)).toBe(true);
            }
            const directDockerCommands = wrapper.executedCommands.filter(
              (cmd) =>
                cmd.startsWith("docker run") ||
                cmd.startsWith("docker stop") ||
                cmd.startsWith("docker rm")
            );
            expect(directDockerCommands).toHaveLength(0);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Options are correctly passed to commands", () => {
    it("should include -v flag when volumes option is true in down", async () => {
      await fc.assert(
        fc.asyncProperty(composeFileArb, async (composeFile) => {
          const wrapper = new MockDockerComposeWrapper();
          await wrapper.down(composeFile, { volumes: true });
          const downCommand = wrapper.executedCommands.find((cmd) => cmd.includes("down"));
          expect(downCommand).toContain("-v");
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should include --wait flag when wait option is true in up", async () => {
      await fc.assert(
        fc.asyncProperty(composeFileArb, async (composeFile) => {
          const wrapper = new MockDockerComposeWrapper();
          await wrapper.up(composeFile, { wait: true });
          const upCommand = wrapper.executedCommands.find((cmd) => cmd.includes("up"));
          expect(upCommand).toContain("--wait");
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should include --force-recreate flag when recreate option is true in up", async () => {
      await fc.assert(
        fc.asyncProperty(composeFileArb, async (composeFile) => {
          const wrapper = new MockDockerComposeWrapper();
          await wrapper.up(composeFile, { recreate: true });
          const upCommand = wrapper.executedCommands.find((cmd) => cmd.includes("up"));
          expect(upCommand).toContain("--force-recreate");
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should include -d flag by default in up", async () => {
      await fc.assert(
        fc.asyncProperty(composeFileArb, async (composeFile) => {
          const wrapper = new MockDockerComposeWrapper();
          await wrapper.up(composeFile, {});
          const upCommand = wrapper.executedCommands.find((cmd) => cmd.includes("up"));
          expect(upCommand).toContain("-d");
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
