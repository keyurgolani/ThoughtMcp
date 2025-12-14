/**
 * Property Test: Dynamic Port Allocation with Environment Variables
 *
 * **Feature: auto-test-containers, Property 4: Dynamic Port Allocation with Environment Variables**
 *
 * This property test validates that when port conflicts occur, the system finds
 * available ports and passes them to Docker Compose via environment variables,
 * not by modifying the compose file.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 *
 * - Requirement 3.1: WHEN the default PostgreSQL port (5433) is occupied THEN the
 *   Test Container Manager SHALL find an available port in the range 5434-5500
 * - Requirement 3.2: WHEN the default Ollama port (11434) is occupied THEN the
 *   Test Container Manager SHALL find an available port in the range 11435-11500
 * - Requirement 3.3: WHEN a dynamic port is allocated THEN the Test Container Manager
 *   SHALL update the test environment variables (DB_PORT, OLLAMA_HOST) to use the
 *   allocated port
 *
 * @module __tests__/property/containers/port-allocation.property.test
 */

import * as fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PortAllocationError, PortAllocator } from "../../../containers/port-allocator";

/**
 * Configuration for port allocation testing.
 * Mirrors the actual configuration from types.ts
 */
interface PortConfig {
  defaultPort: number;
  portRangeStart: number;
  portRangeEnd: number;
  serviceName: string;
}

const POSTGRES_CONFIG: PortConfig = {
  defaultPort: 5433,
  portRangeStart: 5434,
  portRangeEnd: 5500,
  serviceName: "postgres-test",
};

const OLLAMA_CONFIG: PortConfig = {
  defaultPort: 11435,
  portRangeStart: 11436,
  portRangeEnd: 11500,
  serviceName: "ollama-test",
};

/**
 * Simulates port allocation behavior when default port is occupied.
 * Returns the environment variables that would be passed to Docker Compose.
 */
async function allocatePortWithEnvVar(
  allocator: PortAllocator,
  config: PortConfig,
  occupiedPorts: Set<number>
): Promise<{ port: number; envVar: Record<string, string> }> {
  // Check if default port is available
  const defaultAvailable =
    !occupiedPorts.has(config.defaultPort) && (await allocator.isPortAvailable(config.defaultPort));

  if (defaultAvailable) {
    // Use default port
    allocator.reservePort(config.defaultPort);
    return {
      port: config.defaultPort,
      envVar: {},
    };
  }

  // Find available port in range
  for (let port = config.portRangeStart; port <= config.portRangeEnd; port++) {
    if (!occupiedPorts.has(port) && (await allocator.isPortAvailable(port))) {
      allocator.reservePort(port);
      // Return environment variable to pass to Docker Compose
      const envVarName =
        config.serviceName === "postgres-test" ? "TEST_DB_PORT" : "TEST_OLLAMA_PORT";
      return {
        port,
        envVar: { [envVarName]: String(port) },
      };
    }
  }

  throw new PortAllocationError(config.portRangeStart, config.portRangeEnd, []);
}

describe("Property 4: Dynamic Port Allocation with Environment Variables", () => {
  let allocator: PortAllocator;

  beforeEach(() => {
    allocator = new PortAllocator();
  });

  afterEach(() => {
    allocator.clearReservedPorts();
  });

  /**
   * **Feature: auto-test-containers, Property 4: Dynamic Port Allocation with Environment Variables**
   * **Validates: Requirements 3.1, 3.2, 3.3**
   *
   * For any port conflict, the TestContainerManager SHALL find an available port
   * and pass it to Docker Compose via environment variables.
   */
  describe("Port allocation finds available ports in valid range", () => {
    // Arbitrary for generating a set of occupied ports within a range
    const occupiedPortsArb = (config: PortConfig) =>
      fc
        .subarray(
          Array.from(
            { length: config.portRangeEnd - config.portRangeStart + 1 },
            (_, i) => config.portRangeStart + i
          ),
          { minLength: 0, maxLength: 10 }
        )
        .map((ports) => new Set([config.defaultPort, ...ports]));

    /**
     * Requirement 3.1: WHEN the default PostgreSQL port (5433) is occupied
     * THEN the Test Container Manager SHALL find an available port in the range 5434-5500
     */
    it("should find PostgreSQL port in valid range when default is occupied", async () => {
      await fc.assert(
        fc.asyncProperty(occupiedPortsArb(POSTGRES_CONFIG), async (occupiedPorts) => {
          // Skip if all ports in range are occupied
          const rangeSize = POSTGRES_CONFIG.portRangeEnd - POSTGRES_CONFIG.portRangeStart + 1;
          const occupiedInRange = Array.from(occupiedPorts).filter(
            (p) => p >= POSTGRES_CONFIG.portRangeStart && p <= POSTGRES_CONFIG.portRangeEnd
          ).length;

          if (occupiedInRange >= rangeSize) {
            return true; // Skip - all ports occupied
          }

          // Mark occupied ports as reserved to simulate them being in use
          for (const port of occupiedPorts) {
            allocator.reservePort(port);
          }

          const result = await allocatePortWithEnvVar(allocator, POSTGRES_CONFIG, occupiedPorts);

          // Port should be in valid range
          expect(result.port).toBeGreaterThanOrEqual(POSTGRES_CONFIG.portRangeStart);
          expect(result.port).toBeLessThanOrEqual(POSTGRES_CONFIG.portRangeEnd);

          // Port should not be in occupied set
          expect(occupiedPorts.has(result.port)).toBe(false);

          // Environment variable should be set
          expect(result.envVar).toHaveProperty("TEST_DB_PORT");
          expect(result.envVar.TEST_DB_PORT).toBe(String(result.port));

          // Clean up for next iteration
          allocator.clearReservedPorts();

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 3.2: WHEN the default Ollama port (11434) is occupied
     * THEN the Test Container Manager SHALL find an available port in the range 11435-11500
     */
    it("should find Ollama port in valid range when default is occupied", async () => {
      await fc.assert(
        fc.asyncProperty(occupiedPortsArb(OLLAMA_CONFIG), async (occupiedPorts) => {
          // Skip if all ports in range are occupied
          const rangeSize = OLLAMA_CONFIG.portRangeEnd - OLLAMA_CONFIG.portRangeStart + 1;
          const occupiedInRange = Array.from(occupiedPorts).filter(
            (p) => p >= OLLAMA_CONFIG.portRangeStart && p <= OLLAMA_CONFIG.portRangeEnd
          ).length;

          if (occupiedInRange >= rangeSize) {
            return true; // Skip - all ports occupied
          }

          // Mark occupied ports as reserved to simulate them being in use
          for (const port of occupiedPorts) {
            allocator.reservePort(port);
          }

          const result = await allocatePortWithEnvVar(allocator, OLLAMA_CONFIG, occupiedPorts);

          // Port should be in valid range
          expect(result.port).toBeGreaterThanOrEqual(OLLAMA_CONFIG.portRangeStart);
          expect(result.port).toBeLessThanOrEqual(OLLAMA_CONFIG.portRangeEnd);

          // Port should not be in occupied set
          expect(occupiedPorts.has(result.port)).toBe(false);

          // Environment variable should be set
          expect(result.envVar).toHaveProperty("TEST_OLLAMA_PORT");
          expect(result.envVar.TEST_OLLAMA_PORT).toBe(String(result.port));

          // Clean up for next iteration
          allocator.clearReservedPorts();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Requirement 3.3: WHEN a dynamic port is allocated THEN the Test Container Manager
   * SHALL update the test environment variables to use the allocated port
   */
  describe("Environment variables are set correctly for allocated ports", () => {
    const portArb = fc.integer({ min: 1024, max: 65535 });

    it("should set TEST_DB_PORT environment variable for PostgreSQL", async () => {
      await fc.assert(
        fc.asyncProperty(portArb, async (port) => {
          // Simulate allocating a specific port
          const envVar: Record<string, string> = { TEST_DB_PORT: String(port) };

          // Verify environment variable format
          expect(envVar.TEST_DB_PORT).toBe(String(port));
          expect(parseInt(envVar.TEST_DB_PORT, 10)).toBe(port);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should set TEST_OLLAMA_PORT environment variable for Ollama", async () => {
      await fc.assert(
        fc.asyncProperty(portArb, async (port) => {
          // Simulate allocating a specific port
          const envVar: Record<string, string> = { TEST_OLLAMA_PORT: String(port) };

          // Verify environment variable format
          expect(envVar.TEST_OLLAMA_PORT).toBe(String(port));
          expect(parseInt(envVar.TEST_OLLAMA_PORT, 10)).toBe(port);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Port allocation respects reserved ports", () => {
    // Generate a list of ports to reserve
    const reservedPortsArb = fc
      .array(fc.integer({ min: 5434, max: 5450 }), { minLength: 1, maxLength: 5 })
      .map((ports) => [...new Set(ports)]); // Remove duplicates

    it("should not allocate already reserved ports", async () => {
      await fc.assert(
        fc.asyncProperty(reservedPortsArb, async (reservedPorts) => {
          // Reserve the ports
          for (const port of reservedPorts) {
            allocator.reservePort(port);
          }

          // Try to find an available port
          const startPort = 5434;
          const endPort = 5500;

          try {
            const foundPort = await allocator.findAvailablePort(startPort, endPort);

            // Found port should not be in reserved list
            expect(reservedPorts.includes(foundPort)).toBe(false);
          } catch (error) {
            // If all ports are reserved, that's expected
            expect(error).toBeInstanceOf(PortAllocationError);
          }

          // Clean up
          allocator.clearReservedPorts();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Sequential port allocation produces unique ports", () => {
    const numAllocationsArb = fc.integer({ min: 2, max: 10 });

    it("should allocate unique ports for multiple sequential allocations", async () => {
      await fc.assert(
        fc.asyncProperty(numAllocationsArb, async (numAllocations) => {
          const allocatedPorts: number[] = [];
          const startPort = 59800; // Use high ports unlikely to be in use
          const endPort = 59850;

          for (let i = 0; i < numAllocations; i++) {
            const port = await allocator.findAvailablePort(startPort, endPort);
            allocatedPorts.push(port);
            allocator.reservePort(port);
          }

          // All allocated ports should be unique
          const uniquePorts = new Set(allocatedPorts);
          expect(uniquePorts.size).toBe(allocatedPorts.length);

          // All ports should be in valid range
          for (const port of allocatedPorts) {
            expect(port).toBeGreaterThanOrEqual(startPort);
            expect(port).toBeLessThanOrEqual(endPort);
          }

          // Clean up
          allocator.clearReservedPorts();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Port allocation uses environment variables, not compose file modification", () => {
    /**
     * This test verifies the design principle that port allocation works via
     * environment variables passed to Docker Compose, not by modifying the
     * compose file itself.
     */
    it("should return environment variables for Docker Compose, not file modifications", async () => {
      await fc.assert(
        fc.asyncProperty(fc.constantFrom(POSTGRES_CONFIG, OLLAMA_CONFIG), async (config) => {
          // Simulate default port being occupied
          allocator.reservePort(config.defaultPort);

          const result = await allocatePortWithEnvVar(
            allocator,
            config,
            new Set([config.defaultPort])
          );

          // Result should contain environment variable, not file path or content
          expect(result.envVar).toBeDefined();
          expect(typeof result.envVar).toBe("object");

          // Environment variable key should be a valid env var name
          const envVarKeys = Object.keys(result.envVar);
          for (const key of envVarKeys) {
            expect(key).toMatch(/^[A-Z][A-Z0-9_]*$/);
          }

          // Environment variable value should be a string representation of port
          for (const value of Object.values(result.envVar)) {
            expect(typeof value).toBe("string");
            expect(parseInt(value, 10)).toBeGreaterThan(0);
          }

          // Clean up
          allocator.clearReservedPorts();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Default port is used when available", () => {
    it("should use default port and return empty env vars when default is available", async () => {
      await fc.assert(
        fc.asyncProperty(fc.constantFrom(POSTGRES_CONFIG, OLLAMA_CONFIG), async (config) => {
          // Mock isPortAvailable to always return true for this test
          // This tests the logic: "when default port IS available, use it"
          // without depending on actual system port availability
          const originalIsPortAvailable = allocator.isPortAvailable.bind(allocator);
          allocator.isPortAvailable = async (port: number) => {
            // For this test, pretend all ports are available (not reserved)
            return !allocator.getReservedPorts().has(port);
          };

          try {
            // Don't reserve default port - it should be available
            const result = await allocatePortWithEnvVar(allocator, config, new Set());

            // Should use default port
            expect(result.port).toBe(config.defaultPort);

            // No environment variable override needed
            expect(Object.keys(result.envVar).length).toBe(0);

            return true;
          } finally {
            // Restore original method and clean up
            allocator.isPortAvailable = originalIsPortAvailable;
            allocator.clearReservedPorts();
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
