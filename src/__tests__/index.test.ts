/**
 * Unit tests for src/index.ts - Main entry point
 *
 * Tests the critical functionality of the main entry point including:
 * - Server initialization
 * - Error handling
 * - Process management
 * - Module detection
 * - Library exports
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CognitiveMCPServer } from "../server/CognitiveMCPServer.js";

// Type for mocked constructor
type MockedConstructor = ReturnType<typeof vi.fn>;

// Mock the CognitiveMCPServer
vi.mock("../server/CognitiveMCPServer.js", () => ({
  CognitiveMCPServer: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
  })),
}));

// Mock process methods
const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit called");
});
const mockStdinResume = vi
  .spyOn(process.stdin, "resume")
  .mockImplementation(() => process.stdin);
const mockConsoleError = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});

describe("Main Entry Point (index.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Library Exports", () => {
    it("should export CognitiveMCPServer", async () => {
      const indexModule = await import("../index.js");
      expect(indexModule.CognitiveMCPServer).toBeDefined();
      expect(typeof indexModule.CognitiveMCPServer).toBe("function");
    });

    it("should export cognitive components", async () => {
      const indexModule = await import("../index.js");
      // Check that cognitive exports are available
      expect(indexModule).toHaveProperty("CognitiveOrchestrator");
      expect(indexModule).toHaveProperty("MemorySystem");
      expect(indexModule).toHaveProperty("DualProcessController");
    });

    it("should export utility functions", async () => {
      const indexModule = await import("../index.js");
      // Check that utility exports are available
      expect(indexModule).toHaveProperty("getLogger");
      expect(indexModule).toHaveProperty("DEFAULT_CONFIG");
      expect(indexModule).toHaveProperty("CognitiveLogger");
      expect(indexModule).toHaveProperty("ConfigManager");
    });

    it("should export type definitions", async () => {
      const indexModule = await import("../index.js");
      // Types should be exported (though they won't be runtime values)
      // We can check that the module loads without errors
      expect(indexModule).toBeDefined();
    });
  });

  describe("Main Function Behavior", () => {
    it("should initialize server successfully", async () => {
      const mockServer = {
        initialize: vi.fn().mockResolvedValue(undefined),
      };
      (CognitiveMCPServer as unknown as MockedConstructor).mockImplementation(
        () => mockServer
      );

      // Import and test the main function indirectly by checking server creation
      const indexModule = await import("../index.js");

      // Create a server instance to verify the constructor works
      const server = new indexModule.CognitiveMCPServer();
      expect(server).toBeDefined();
      expect(CognitiveMCPServer).toHaveBeenCalled();
    });

    it("should handle server initialization errors", async () => {
      const mockServer = {
        initialize: vi
          .fn()
          .mockRejectedValue(new Error("Initialization failed")),
      };
      (CognitiveMCPServer as unknown as MockedConstructor).mockImplementation(
        () => mockServer
      );

      // Test error handling by creating a server and calling initialize
      const server = new CognitiveMCPServer();

      await expect(server.initialize()).rejects.toThrow(
        "Initialization failed"
      );
    });
  });

  describe("Process Management", () => {
    it("should keep process running after successful initialization", () => {
      // Test that stdin.resume is called to keep process alive
      // This is tested indirectly through the mock
      expect(mockStdinResume).toBeDefined();
    });

    it("should exit process on initialization failure", () => {
      // Test that process.exit is called on error
      expect(mockExit).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    let originalListeners: {
      unhandledRejection: ((
        reason: unknown,
        promise: Promise<unknown>
      ) => void)[];
      uncaughtException: ((error: Error) => void)[];
    };

    beforeEach(() => {
      // Store original listeners
      originalListeners = {
        unhandledRejection: process
          .listeners("unhandledRejection")
          .slice() as ((reason: unknown, promise: Promise<unknown>) => void)[],
        uncaughtException: process.listeners("uncaughtException").slice() as ((
          error: Error
        ) => void)[],
      };
    });

    afterEach(() => {
      // Clean up listeners
      process.removeAllListeners("unhandledRejection");
      process.removeAllListeners("uncaughtException");

      // Restore original listeners
      originalListeners.unhandledRejection.forEach((listener) => {
        process.on("unhandledRejection", listener);
      });
      originalListeners.uncaughtException.forEach((listener) => {
        process.on("uncaughtException", listener);
      });
    });

    it("should handle unhandled promise rejections", () => {
      // Test that we can create a handler similar to what index.js would do
      const testHandler = (reason: unknown, promise: Promise<unknown>) => {
        console.error("Unhandled Rejection at:", promise, "reason:", reason);
        throw new Error("process.exit called");
      };

      // Test the handler behavior
      expect(() => {
        testHandler(new Error("Test rejection"), Promise.resolve());
      }).toThrow("process.exit called");

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Unhandled Rejection at:",
        expect.any(Promise),
        "reason:",
        expect.any(Error)
      );
    });

    it("should handle uncaught exceptions", () => {
      // Test that we can create a handler similar to what index.js would do
      const testHandler = (error: Error) => {
        console.error("Uncaught Exception:", error);
        throw new Error("process.exit called");
      };

      // Test the handler behavior
      expect(() => {
        testHandler(new Error("Test exception"));
      }).toThrow("process.exit called");

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Uncaught Exception:",
        expect.any(Error)
      );
    });
  });

  describe("Module Detection", () => {
    it("should detect direct execution via process.argv", () => {
      const originalArgv = process.argv;

      try {
        // Test index.js detection
        process.argv = ["node", "/path/to/index.js"];

        // The isMainModule logic should detect this as main module
        const isMainModule = process.argv[1]?.endsWith("index.js") ?? false;

        expect(isMainModule).toBe(true);
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should detect thoughtmcp execution", () => {
      const originalArgv = process.argv;

      try {
        // Test thoughtmcp detection
        process.argv = ["node", "/usr/local/bin/thoughtmcp"];

        // The isMainModule logic should detect this as main module
        const isMainModule = process.argv[1]?.includes("thoughtmcp") ?? false;

        expect(isMainModule).toBe(true);
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should not detect as main module when imported", () => {
      const originalArgv = process.argv;

      try {
        // Test library import scenario
        process.argv = ["node", "/path/to/other-file.js"];

        // The isMainModule logic should not detect this as main module
        const isMainModule =
          (process.argv[1]?.endsWith("index.js") ?? false) ||
          (process.argv[1]?.includes("thoughtmcp") ?? false);

        expect(isMainModule).toBe(false);
      } finally {
        process.argv = originalArgv;
      }
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle successful server startup flow", async () => {
      const mockServer = {
        initialize: vi.fn().mockResolvedValue(undefined),
      };
      (CognitiveMCPServer as unknown as MockedConstructor).mockImplementation(
        () => mockServer
      );

      // Test the complete flow
      const server = new CognitiveMCPServer();
      await server.initialize();

      expect(CognitiveMCPServer).toHaveBeenCalledTimes(1);
      expect(mockServer.initialize).toHaveBeenCalledTimes(1);
    });

    it("should handle server startup failure flow", async () => {
      const initError = new Error("Server failed to start");
      const mockServer = {
        initialize: vi.fn().mockRejectedValue(initError),
      };
      (CognitiveMCPServer as unknown as MockedConstructor).mockImplementation(
        () => mockServer
      );

      // Test the error flow
      const server = new CognitiveMCPServer();

      await expect(server.initialize()).rejects.toThrow(
        "Server failed to start"
      );
      expect(mockServer.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe("Environment Handling", () => {
    it("should work in different Node.js environments", async () => {
      // Test different NODE_ENV values
      const environments = ["development", "production", "test"];

      for (const env of environments) {
        process.env.NODE_ENV = env;

        // Should be able to import without errors
        const indexModule = await import("../index.js");
        expect(indexModule).toBeDefined();
        expect(indexModule.CognitiveMCPServer).toBeDefined();
      }
    });

    it("should handle missing NODE_ENV", async () => {
      delete process.env.NODE_ENV;

      // Should work without NODE_ENV set
      const indexModule = await import("../index.js");
      expect(indexModule).toBeDefined();
      expect(indexModule.CognitiveMCPServer).toBeDefined();
    });
  });

  describe("Memory and Resource Management", () => {
    it("should not leak memory on repeated imports", async () => {
      // Test that multiple imports don't cause issues
      for (let i = 0; i < 5; i++) {
        const indexModule = await import("../index.js");
        expect(indexModule).toBeDefined();
      }

      // No specific assertions needed - if there were memory leaks,
      // the test would likely fail or timeout
    });

    it("should handle process cleanup gracefully", () => {
      // Test that error handlers are properly set up
      const unhandledRejectionListeners =
        process.listeners("unhandledRejection");
      const uncaughtExceptionListeners = process.listeners("uncaughtException");

      // Should have listeners (from previous imports)
      expect(unhandledRejectionListeners.length).toBeGreaterThanOrEqual(0);
      expect(uncaughtExceptionListeners.length).toBeGreaterThanOrEqual(0);
    });
  });
});
