/**
 * Port Allocator
 *
 * Manages dynamic port allocation for test containers.
 * Uses Node.js net module to check port availability and tracks
 * reserved ports to prevent conflicts within the same process.
 *
 * @module containers/port-allocator
 */

import * as net from "net";

import type { IPortAllocator } from "./types";

/**
 * Error thrown when no available port can be found in the specified range.
 */
export class PortAllocationError extends Error {
  constructor(
    public readonly startPort: number,
    public readonly endPort: number,
    public readonly attemptedPorts: number[]
  ) {
    super(
      `No available port found in range ${startPort}-${endPort}. ` +
        `Attempted ports: ${attemptedPorts.join(", ")}`
    );
    this.name = "PortAllocationError";
  }
}

/**
 * PortAllocator manages dynamic port allocation for test containers.
 *
 * This class provides:
 * - Port availability checking using Node.js net module
 * - Finding available ports within a specified range
 * - Tracking reserved ports to prevent conflicts within the same process
 *
 * @implements {IPortAllocator}
 */
export class PortAllocator implements IPortAllocator {
  /**
   * Set of ports reserved by this process.
   * Used to prevent allocating the same port twice within a single process.
   */
  private readonly reservedPorts: Set<number> = new Set();

  /**
   * Checks if a specific port is available for binding.
   *
   * This method attempts to create a TCP server on the specified port.
   * If successful, the port is available. If it fails with EADDRINUSE,
   * the port is already in use.
   *
   * @param port - The port number to check
   * @returns Promise resolving to true if the port is available
   */
  async isPortAvailable(port: number): Promise<boolean> {
    // First check if we've reserved this port
    if (this.reservedPorts.has(port)) {
      return false;
    }

    return new Promise((resolve) => {
      const server = net.createServer();

      server.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          resolve(false);
        } else {
          // Other errors (e.g., EACCES for privileged ports) also mean unavailable
          resolve(false);
        }
      });

      server.once("listening", () => {
        // Port is available, close the server
        server.close(() => {
          resolve(true);
        });
      });

      // Try to listen on the port on all interfaces (0.0.0.0)
      // This matches how Docker binds ports by default
      server.listen(port, "0.0.0.0");
    });
  }

  /**
   * Finds an available port within the specified range.
   *
   * Searches sequentially from startPort to endPort until an available
   * port is found. Throws PortAllocationError if no port is available.
   *
   * @param startPort - The beginning of the port range (inclusive)
   * @param endPort - The end of the port range (inclusive)
   * @returns Promise resolving to an available port number
   * @throws {PortAllocationError} If no available port is found in the range
   */
  async findAvailablePort(startPort: number, endPort: number): Promise<number> {
    const attemptedPorts: number[] = [];

    for (let port = startPort; port <= endPort; port++) {
      attemptedPorts.push(port);
      const available = await this.isPortAvailable(port);
      if (available) {
        return port;
      }
    }

    throw new PortAllocationError(startPort, endPort, attemptedPorts);
  }

  /**
   * Reserves a port to prevent it from being allocated again.
   *
   * This is used to track ports that have been allocated by this process
   * but may not yet be bound by a container. Call this after successfully
   * allocating a port to prevent double-allocation.
   *
   * @param port - The port number to reserve
   */
  reservePort(port: number): void {
    this.reservedPorts.add(port);
  }

  /**
   * Releases a previously reserved port.
   *
   * Call this when a container using the port has been stopped,
   * allowing the port to be reused.
   *
   * @param port - The port number to release
   */
  releasePort(port: number): void {
    this.reservedPorts.delete(port);
  }

  /**
   * Gets the set of currently reserved ports.
   *
   * Useful for debugging and testing.
   *
   * @returns A copy of the reserved ports set
   */
  getReservedPorts(): Set<number> {
    return new Set(this.reservedPorts);
  }

  /**
   * Clears all reserved ports.
   *
   * Useful for cleanup during testing.
   */
  clearReservedPorts(): void {
    this.reservedPorts.clear();
  }
}

/**
 * Creates a new PortAllocator instance.
 */
export function createPortAllocator(): IPortAllocator {
  return new PortAllocator();
}
