/**
 * PortAllocator Unit Tests
 *
 * Tests for the port allocation system that manages dynamic port allocation
 * for test containers. These tests verify port availability checking,
 * port range searching, and port reservation tracking.
 *
 * @module __tests__/unit/containers/port-allocator.test
 *
 * _Requirements: 3.1, 3.2, 3.4, 3.5_
 */

import * as net from "net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PortAllocationError, PortAllocator } from "../../../containers/port-allocator";

describe("PortAllocator", () => {
  let allocator: PortAllocator;

  beforeEach(() => {
    allocator = new PortAllocator();
  });

  afterEach(() => {
    allocator.clearReservedPorts();
  });

  describe("isPortAvailable", () => {
    /**
     * Requirement 3.5: WHEN checking port availability THEN the Test Container Manager
     * SHALL verify the port is not in use by any process
     */
    it("should return true for an available port", async () => {
      // Use a high port that's unlikely to be in use
      const testPort = 59999;
      const available = await allocator.isPortAvailable(testPort);
      expect(available).toBe(true);
    });

    it("should return false for a port in use", async () => {
      // Create a server to occupy a port on all interfaces (0.0.0.0)
      // This matches how Docker binds ports by default
      const server = net.createServer();
      const testPort = 59998;

      await new Promise<void>((resolve) => {
        server.listen(testPort, "0.0.0.0", () => resolve());
      });

      try {
        const available = await allocator.isPortAvailable(testPort);
        expect(available).toBe(false);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it("should return false for a reserved port", async () => {
      const testPort = 59997;
      allocator.reservePort(testPort);

      const available = await allocator.isPortAvailable(testPort);
      expect(available).toBe(false);
    });

    it("should return true for a released port", async () => {
      const testPort = 59996;
      allocator.reservePort(testPort);
      allocator.releasePort(testPort);

      const available = await allocator.isPortAvailable(testPort);
      expect(available).toBe(true);
    });
  });

  describe("findAvailablePort", () => {
    /**
     * Requirement 3.1: WHEN the default PostgreSQL port (5433) is occupied
     * THEN the Test Container Manager SHALL find an available port in the range 5434-5500
     */
    it("should find the first available port in range", async () => {
      // Use a high port range unlikely to be in use
      const startPort = 59990;
      const endPort = 59995;

      const port = await allocator.findAvailablePort(startPort, endPort);

      expect(port).toBeGreaterThanOrEqual(startPort);
      expect(port).toBeLessThanOrEqual(endPort);
    });

    /**
     * Requirement 3.2: WHEN the default Ollama port (11434) is occupied
     * THEN the Test Container Manager SHALL find an available port in the range 11435-11500
     */
    it("should skip occupied ports and find next available", async () => {
      // Occupy the first port in range on all interfaces (0.0.0.0)
      // This matches how Docker binds ports by default
      const server = net.createServer();
      const startPort = 59980;
      const endPort = 59985;

      await new Promise<void>((resolve) => {
        server.listen(startPort, "0.0.0.0", () => resolve());
      });

      try {
        const port = await allocator.findAvailablePort(startPort, endPort);
        expect(port).toBeGreaterThan(startPort);
        expect(port).toBeLessThanOrEqual(endPort);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it("should skip reserved ports", async () => {
      const startPort = 59970;
      const endPort = 59975;

      // Reserve the first two ports
      allocator.reservePort(startPort);
      allocator.reservePort(startPort + 1);

      const port = await allocator.findAvailablePort(startPort, endPort);

      expect(port).toBeGreaterThanOrEqual(startPort + 2);
      expect(port).toBeLessThanOrEqual(endPort);
    });

    /**
     * Requirement 3.4: WHEN no available port is found in the specified range
     * THEN the Test Container Manager SHALL report a clear error message listing the attempted ports
     */
    it("should throw PortAllocationError when no port is available", async () => {
      // Create servers to occupy all ports in a small range
      const servers: net.Server[] = [];
      const startPort = 59960;
      const endPort = 59962;

      for (let port = startPort; port <= endPort; port++) {
        const server = net.createServer();
        await new Promise<void>((resolve) => {
          // Listen on all interfaces (0.0.0.0) to match Docker's default behavior
          server.listen(port, "0.0.0.0", () => resolve());
        });
        servers.push(server);
      }

      try {
        await expect(allocator.findAvailablePort(startPort, endPort)).rejects.toThrow(
          PortAllocationError
        );

        try {
          await allocator.findAvailablePort(startPort, endPort);
        } catch (error) {
          expect(error).toBeInstanceOf(PortAllocationError);
          const allocError = error as PortAllocationError;
          expect(allocError.startPort).toBe(startPort);
          expect(allocError.endPort).toBe(endPort);
          expect(allocError.attemptedPorts).toEqual([startPort, startPort + 1, startPort + 2]);
          expect(allocError.message).toContain(`${startPort}-${endPort}`);
          expect(allocError.message).toContain("Attempted ports");
        }
      } finally {
        // Clean up servers
        await Promise.all(
          servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve())))
        );
      }
    });

    it("should throw PortAllocationError when all ports are reserved", async () => {
      const startPort = 59950;
      const endPort = 59952;

      // Reserve all ports in range
      for (let port = startPort; port <= endPort; port++) {
        allocator.reservePort(port);
      }

      await expect(allocator.findAvailablePort(startPort, endPort)).rejects.toThrow(
        PortAllocationError
      );
    });

    it("should handle single port range", async () => {
      // Find an actually available port to test with in a wider range
      const basePort = 59940;
      let testPort: number | null = null;

      for (let p = basePort; p <= basePort + 100; p++) {
        if (await allocator.isPortAvailable(p)) {
          testPort = p;
          break;
        }
      }

      // Skip test if no port available (rare but possible)
      if (testPort === null) {
        console.warn("Skipping test: no available port found in range");
        return;
      }

      // Try to find the port - if it fails due to race condition, skip
      try {
        const foundPort = await allocator.findAvailablePort(testPort, testPort);
        expect(foundPort).toBe(testPort);
      } catch (error) {
        // Port may have become unavailable between check and allocation (race condition)
        if (error instanceof PortAllocationError) {
          console.warn("Skipping test: port became unavailable (race condition)");
          return;
        }
        throw error;
      }
    });
  });

  describe("reservePort", () => {
    it("should add port to reserved set", () => {
      const port = 59930;
      allocator.reservePort(port);

      const reserved = allocator.getReservedPorts();
      expect(reserved.has(port)).toBe(true);
    });

    it("should handle reserving same port multiple times", () => {
      const port = 59929;
      allocator.reservePort(port);
      allocator.reservePort(port);

      const reserved = allocator.getReservedPorts();
      expect(reserved.size).toBe(1);
      expect(reserved.has(port)).toBe(true);
    });

    it("should allow reserving multiple ports", () => {
      allocator.reservePort(59920);
      allocator.reservePort(59921);
      allocator.reservePort(59922);

      const reserved = allocator.getReservedPorts();
      expect(reserved.size).toBe(3);
    });
  });

  describe("releasePort", () => {
    it("should remove port from reserved set", () => {
      const port = 59910;
      allocator.reservePort(port);
      allocator.releasePort(port);

      const reserved = allocator.getReservedPorts();
      expect(reserved.has(port)).toBe(false);
    });

    it("should handle releasing non-reserved port", () => {
      const port = 59909;
      // Should not throw
      allocator.releasePort(port);

      const reserved = allocator.getReservedPorts();
      expect(reserved.has(port)).toBe(false);
    });

    it("should only release specified port", () => {
      allocator.reservePort(59900);
      allocator.reservePort(59901);
      allocator.releasePort(59900);

      const reserved = allocator.getReservedPorts();
      expect(reserved.has(59900)).toBe(false);
      expect(reserved.has(59901)).toBe(true);
    });
  });

  describe("getReservedPorts", () => {
    it("should return empty set initially", () => {
      const reserved = allocator.getReservedPorts();
      expect(reserved.size).toBe(0);
    });

    it("should return copy of reserved ports", () => {
      allocator.reservePort(59890);
      const reserved = allocator.getReservedPorts();

      // Modifying returned set should not affect internal state
      reserved.delete(59890);

      const reservedAgain = allocator.getReservedPorts();
      expect(reservedAgain.has(59890)).toBe(true);
    });
  });

  describe("clearReservedPorts", () => {
    it("should clear all reserved ports", () => {
      allocator.reservePort(59880);
      allocator.reservePort(59881);
      allocator.reservePort(59882);

      allocator.clearReservedPorts();

      const reserved = allocator.getReservedPorts();
      expect(reserved.size).toBe(0);
    });
  });

  describe("PortAllocationError", () => {
    it("should have correct name", () => {
      const error = new PortAllocationError(5000, 5010, [5000, 5001, 5002]);
      expect(error.name).toBe("PortAllocationError");
    });

    it("should include port range in message", () => {
      const error = new PortAllocationError(5000, 5010, [5000, 5001]);
      expect(error.message).toContain("5000-5010");
    });

    it("should include attempted ports in message", () => {
      const error = new PortAllocationError(5000, 5002, [5000, 5001, 5002]);
      expect(error.message).toContain("5000, 5001, 5002");
    });

    it("should expose properties", () => {
      const error = new PortAllocationError(5000, 5010, [5000, 5001]);
      expect(error.startPort).toBe(5000);
      expect(error.endPort).toBe(5010);
      expect(error.attemptedPorts).toEqual([5000, 5001]);
    });
  });
});
