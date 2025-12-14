/**
 * ContainerLogger Unit Tests
 *
 * Tests for the structured logging of container operations.
 * These tests verify log output format and remediation suggestions.
 *
 * @module __tests__/unit/containers/container-logger.test
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContainerLogger, createContainerLogger } from "../../../containers/container-logger";

describe("ContainerLogger", () => {
  let logger: ContainerLogger;
  let stderrWriteSpy: ReturnType<typeof vi.fn>;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Capture stderr output
    stderrWriteSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true) as ReturnType<
      typeof vi.fn
    >;
    originalNodeEnv = process.env.NODE_ENV;
    // Enable verbose logging for tests
    logger = new ContainerLogger("containers", true);
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
  });

  /**
   * Helper to get the last logged message
   */
  function getLastLogMessage(): string {
    const calls = stderrWriteSpy.mock.calls;
    if (calls.length === 0) return "";
    return calls[calls.length - 1][0] as string;
  }

  /**
   * Helper to get all logged messages
   */
  function getAllLogMessages(): string[] {
    return stderrWriteSpy.mock.calls.map((call) => call[0] as string);
  }

  describe("logStarting", () => {
    /**
     * Requirement 5.1: WHEN containers are starting THEN the Test Container Manager
     * SHALL log the container name and target port
     */
    it("should log service name and compose file when starting", () => {
      logger.logStarting("postgres-test", "docker-compose.test.yml");

      const message = getLastLogMessage();
      expect(message).toContain("postgres-test");
      expect(message).toContain("docker-compose.test.yml");
      expect(message).toContain("Starting");
    });

    it("should include INFO level in log message", () => {
      logger.logStarting("ollama-test", "docker-compose.test.yml");

      const message = getLastLogMessage();
      expect(message).toContain("INFO");
    });

    it("should include timestamp in ISO format", () => {
      logger.logStarting("postgres-test", "docker-compose.test.yml");

      const message = getLastLogMessage();
      // ISO timestamp pattern: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(message).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it("should include prefix in log message", () => {
      const customLogger = new ContainerLogger("test-prefix", true);
      customLogger.logStarting("service", "compose.yml");

      const message = getLastLogMessage();
      expect(message).toContain("[test-prefix]");
    });
  });

  describe("logHealthCheck", () => {
    /**
     * Requirement 5.2: WHEN health checks are in progress THEN the Test Container Manager
     * SHALL log the health check status every 5 seconds
     */
    it("should log service name and health status", () => {
      logger.logHealthCheck("postgres-test", "healthy");

      const message = getLastLogMessage();
      expect(message).toContain("postgres-test");
      expect(message).toContain("healthy");
      expect(message).toContain("Health check");
    });

    it("should log starting health status", () => {
      logger.logHealthCheck("ollama-test", "starting");

      const message = getLastLogMessage();
      expect(message).toContain("starting");
    });

    it("should log unhealthy status", () => {
      logger.logHealthCheck("postgres-test", "unhealthy");

      const message = getLastLogMessage();
      expect(message).toContain("unhealthy");
    });

    it("should use DEBUG level for health checks", () => {
      logger.logHealthCheck("postgres-test", "healthy");

      const message = getLastLogMessage();
      expect(message).toContain("DEBUG");
    });

    it("should not log health checks in production mode without verbose", () => {
      process.env.NODE_ENV = "production";
      const prodLogger = new ContainerLogger("containers", false);

      prodLogger.logHealthCheck("postgres-test", "healthy");

      expect(stderrWriteSpy).not.toHaveBeenCalled();
    });
  });

  describe("logReady", () => {
    /**
     * Requirement 5.3: WHEN containers are ready THEN the Test Container Manager
     * SHALL log the final connection details (host, port, database name)
     */
    it("should log service name and connection details", () => {
      logger.logReady("postgres-test", "localhost:5433/thoughtmcp_test");

      const message = getLastLogMessage();
      expect(message).toContain("postgres-test");
      expect(message).toContain("localhost:5433/thoughtmcp_test");
      expect(message).toContain("ready");
    });

    it("should log Ollama connection details", () => {
      logger.logReady("ollama-test", "http://localhost:11435");

      const message = getLastLogMessage();
      expect(message).toContain("ollama-test");
      expect(message).toContain("http://localhost:11435");
    });

    it("should use INFO level for ready messages", () => {
      logger.logReady("postgres-test", "localhost:5433");

      const message = getLastLogMessage();
      expect(message).toContain("INFO");
    });
  });

  describe("logError", () => {
    /**
     * Requirement 5.4: WHEN container startup fails THEN the Test Container Manager
     * SHALL log the Docker error output and suggest remediation steps
     */
    it("should log service name and error message", () => {
      logger.logError("postgres-test", "Failed to start container");

      const messages = getAllLogMessages();
      expect(messages[0]).toContain("postgres-test");
      expect(messages[0]).toContain("Failed to start container");
      expect(messages[0]).toContain("ERROR");
    });

    it("should include provided remediation suggestion", () => {
      logger.logError("postgres-test", "Connection failed", "Check if Docker is running");

      const messages = getAllLogMessages();
      expect(messages.length).toBe(2);
      expect(messages[1]).toContain("Suggestion");
      expect(messages[1]).toContain("Check if Docker is running");
    });

    it("should auto-detect remediation for port already in use", () => {
      logger.logError("postgres-test", "Error: port already in use");

      const messages = getAllLogMessages();
      expect(messages.length).toBe(2);
      expect(messages[1]).toContain("Suggestion");
      expect(messages[1]).toContain("TEST_DB_PORT");
    });

    it("should auto-detect remediation for permission denied", () => {
      logger.logError("postgres-test", "permission denied while connecting to Docker");

      const messages = getAllLogMessages();
      expect(messages.length).toBe(2);
      expect(messages[1]).toContain("docker group");
    });

    it("should auto-detect remediation for connection refused", () => {
      logger.logError("postgres-test", "connection refused");

      const messages = getAllLogMessages();
      expect(messages.length).toBe(2);
      expect(messages[1]).toContain("Docker daemon");
    });

    it("should auto-detect remediation for image not found", () => {
      logger.logError("postgres-test", "image not found: pgvector/pgvector:pg16");

      const messages = getAllLogMessages();
      expect(messages.length).toBe(2);
      expect(messages[1]).toContain("docker pull");
    });

    it("should auto-detect remediation for timeout errors", () => {
      logger.logError("postgres-test", "timeout waiting for container to be healthy");

      const messages = getAllLogMessages();
      expect(messages.length).toBe(2);
      expect(messages[1]).toContain("CONTAINER_STARTUP_TIMEOUT");
    });

    it("should auto-detect remediation for health check failures", () => {
      logger.logError("postgres-test", "health check failed after 60 seconds");

      const messages = getAllLogMessages();
      expect(messages.length).toBe(2);
      expect(messages[1]).toContain("docker compose");
    });

    it("should auto-detect remediation for out of memory", () => {
      logger.logError("postgres-test", "out of memory");

      const messages = getAllLogMessages();
      expect(messages.length).toBe(2);
      expect(messages[1]).toContain("Docker Desktop");
    });

    it("should auto-detect remediation for disk space issues", () => {
      logger.logError("postgres-test", "no disk space left on device");

      const messages = getAllLogMessages();
      expect(messages.length).toBe(2);
      expect(messages[1]).toContain("docker system prune");
    });

    it("should auto-detect remediation for missing compose file", () => {
      logger.logError("postgres-test", "no such file or directory: docker-compose.test.yml");

      const messages = getAllLogMessages();
      expect(messages.length).toBe(2);
      expect(messages[1]).toContain("docker-compose.test.yml");
    });

    it("should not add suggestion for unknown errors", () => {
      logger.logError("postgres-test", "Unknown error XYZ123");

      const messages = getAllLogMessages();
      expect(messages.length).toBe(1);
    });

    it("should prefer provided suggestion over auto-detected", () => {
      logger.logError("postgres-test", "port already in use", "Custom suggestion");

      const messages = getAllLogMessages();
      expect(messages[1]).toContain("Custom suggestion");
      expect(messages[1]).not.toContain("TEST_DB_PORT");
    });
  });

  describe("logStopped", () => {
    /**
     * Requirement 5.5: WHEN containers are stopped THEN the Test Container Manager
     * SHALL log the cleanup status
     */
    it("should log service name when stopped", () => {
      logger.logStopped("postgres-test");

      const message = getLastLogMessage();
      expect(message).toContain("postgres-test");
      expect(message).toContain("stopped");
    });

    it("should use INFO level for stopped messages", () => {
      logger.logStopped("ollama-test");

      const message = getLastLogMessage();
      expect(message).toContain("INFO");
    });
  });

  describe("createContainerLogger factory", () => {
    it("should create a ContainerLogger instance", () => {
      const factoryLogger = createContainerLogger();

      expect(factoryLogger).toBeInstanceOf(ContainerLogger);
    });

    it("should accept custom prefix", () => {
      const factoryLogger = createContainerLogger("custom-prefix", true);
      factoryLogger.logStarting("service", "compose.yml");

      const message = getLastLogMessage();
      expect(message).toContain("[custom-prefix]");
    });

    it("should accept verbose flag", () => {
      process.env.NODE_ENV = "production";
      const verboseLogger = createContainerLogger("test", true);
      verboseLogger.logHealthCheck("service", "healthy");

      expect(stderrWriteSpy).toHaveBeenCalled();
    });
  });

  describe("log format consistency", () => {
    it("should have consistent format across all log methods", () => {
      logger.logStarting("service1", "compose.yml");
      logger.logHealthCheck("service2", "healthy");
      logger.logReady("service3", "localhost:5432");
      logger.logError("service4", "error");
      logger.logStopped("service5");

      const messages = getAllLogMessages();

      // All messages should have timestamp, level, and prefix
      for (const message of messages) {
        expect(message).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
        expect(message).toMatch(/\[(INFO|DEBUG|ERROR|WARN)\s*\]/);
        expect(message).toContain("[containers]");
      }
    });

    it("should end each log message with newline", () => {
      logger.logStarting("service", "compose.yml");

      const message = getLastLogMessage();
      expect(message.endsWith("\n")).toBe(true);
    });
  });
});
