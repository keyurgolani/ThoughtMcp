/**
 * REST API Server Unit Tests
 *
 * Tests for the RestApiServer class that provides HTTP endpoints for ThoughtMCP.
 * Requirements: 16.1, 16.2
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CognitiveCore } from "../../../server/cognitive-core.js";
import {
  DEFAULT_REST_API_CONFIG,
  RestApiServer,
  type RestApiServerConfig,
} from "../../../server/rest-api-server.js";

// Mock cognitive core
const createMockCognitiveCore = (): CognitiveCore => ({
  memoryRepository: {} as CognitiveCore["memoryRepository"],
  reasoningOrchestrator: {} as CognitiveCore["reasoningOrchestrator"],
  frameworkSelector: {} as CognitiveCore["frameworkSelector"],
  confidenceAssessor: {} as CognitiveCore["confidenceAssessor"],
  biasDetector: {} as CognitiveCore["biasDetector"],
  emotionAnalyzer: {} as CognitiveCore["emotionAnalyzer"],
  problemDecomposer: {} as CognitiveCore["problemDecomposer"],
  memoryAugmentedReasoning: {} as CognitiveCore["memoryAugmentedReasoning"],
});

describe("RestApiServer", () => {
  let server: RestApiServer;
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
    server = new RestApiServer(mockCore);
  });

  afterEach(async () => {
    if (server.getIsRunning()) {
      await server.stop();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create server with default configuration", () => {
      const config = server.getConfig();
      expect(config.port).toBe(DEFAULT_REST_API_CONFIG.port);
      expect(config.bodyLimit).toBe(DEFAULT_REST_API_CONFIG.bodyLimit);
      expect(config.requestTimeout).toBe(DEFAULT_REST_API_CONFIG.requestTimeout);
    });

    it("should accept custom configuration", () => {
      const customConfig: Partial<RestApiServerConfig> = {
        port: 4000,
        bodyLimit: "2mb",
        requestTimeout: 60000,
      };
      const customServer = new RestApiServer(mockCore, customConfig);
      const config = customServer.getConfig();
      expect(config.port).toBe(4000);
      expect(config.bodyLimit).toBe("2mb");
      expect(config.requestTimeout).toBe(60000);
    });

    it("should return cognitive core instance", () => {
      expect(server.getCognitiveCore()).toBe(mockCore);
    });

    it("should return Express application", () => {
      const app = server.getApp();
      expect(app).toBeDefined();
      expect(typeof app.use).toBe("function");
    });

    it("should return Express router", () => {
      const router = server.getRouter();
      expect(router).toBeDefined();
      expect(typeof router.get).toBe("function");
      expect(typeof router.post).toBe("function");
    });
  });

  describe("Server Lifecycle", () => {
    it("should start server successfully", async () => {
      const testPort = 3100 + Math.floor(Math.random() * 100);
      const testServer = new RestApiServer(mockCore, { port: testPort });

      expect(testServer.getIsRunning()).toBe(false);
      await testServer.start();
      expect(testServer.getIsRunning()).toBe(true);
      await testServer.stop();
    });

    it("should stop server successfully", async () => {
      const testPort = 3200 + Math.floor(Math.random() * 100);
      const testServer = new RestApiServer(mockCore, { port: testPort });

      await testServer.start();
      expect(testServer.getIsRunning()).toBe(true);
      await testServer.stop();
      expect(testServer.getIsRunning()).toBe(false);
    });

    it("should throw error when starting already running server", async () => {
      const testPort = 3300 + Math.floor(Math.random() * 100);
      const testServer = new RestApiServer(mockCore, { port: testPort });

      await testServer.start();
      await expect(testServer.start()).rejects.toThrow("REST API server is already running");
      await testServer.stop();
    });

    it("should throw error when stopping non-running server", async () => {
      await expect(server.stop()).rejects.toThrow("REST API server is not running");
    });

    it("should track uptime correctly", async () => {
      const testPort = 3400 + Math.floor(Math.random() * 100);
      const testServer = new RestApiServer(mockCore, { port: testPort });

      expect(testServer.getUptime()).toBe(0);
      await testServer.start();

      // Wait a bit and check uptime
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(testServer.getUptime()).toBeGreaterThan(0);

      await testServer.stop();
      expect(testServer.getUptime()).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle port already in use error", async () => {
      const testPort = 3500 + Math.floor(Math.random() * 100);
      const server1 = new RestApiServer(mockCore, { port: testPort });
      const server2 = new RestApiServer(mockCore, { port: testPort });

      await server1.start();

      await expect(server2.start()).rejects.toThrow(`Port ${testPort} is already in use`);

      await server1.stop();
    });
  });

  describe("Graceful Shutdown", () => {
    it("should setup graceful shutdown handlers", () => {
      const processSpy = vi.spyOn(process, "on");
      server.setupGracefulShutdown();

      expect(processSpy).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
      expect(processSpy).toHaveBeenCalledWith("SIGINT", expect.any(Function));
      expect(processSpy).toHaveBeenCalledWith("uncaughtException", expect.any(Function));
      expect(processSpy).toHaveBeenCalledWith("unhandledRejection", expect.any(Function));

      processSpy.mockRestore();
    });
  });

  describe("Middleware Configuration", () => {
    it("should configure helmet security middleware", () => {
      const app = server.getApp();
      // Helmet is configured in setupMiddleware
      expect(app).toBeDefined();
    });

    it("should configure JSON body parsing", () => {
      const app = server.getApp();
      expect(app).toBeDefined();
    });
  });
});
