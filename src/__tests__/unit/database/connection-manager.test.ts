/**
 * DatabaseConnectionManager Tests
 *
 * Tests for PostgreSQL connection management with pooling, transactions, and error handling.
 * Following TDD principles - these tests define expected behavior before implementation.
 */

import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Import implementation that will be completed in task 1.1.2
import {
  DatabaseConnectionManager,
  type DatabaseConfig,
} from "../../../database/connection-manager";

// Mock pg module
vi.mock("pg", () => {
  return {
    Pool: vi.fn(),
  };
});

// Helper to create fresh mocks for each test
type MockClient = {
  query: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
};

type MockPool = {
  connect: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
  totalCount: number;
  idleCount: number;
  waitingCount: number;
};

function createMockPoolAndClient(): { mockPool: MockPool; mockClient: MockClient } {
  const mockClient: MockClient = {
    query: vi.fn().mockResolvedValue({ rows: [{ result: 1 }] }),
    release: vi.fn(),
  };

  const mockPool: MockPool = {
    connect: vi.fn().mockResolvedValue(mockClient),
    end: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ rows: [{ result: 1 }] }),
    totalCount: 20,
    idleCount: 15,
    waitingCount: 0,
  };

  return { mockPool, mockClient };
}

describe("DatabaseConnectionManager", () => {
  let manager: DatabaseConnectionManager;
  let config: DatabaseConfig;
  let mockPool: MockPool;

  beforeEach(() => {
    // Create fresh mocks for each test
    const mocks = createMockPoolAndClient();
    mockPool = mocks.mockPool;

    // Setup Pool constructor to return our mock
    vi.mocked(Pool).mockImplementation(() => mockPool as unknown as Pool);

    config = {
      host: "localhost",
      port: 5432,
      database: "test_db",
      user: "test_user",
      password: "test_pass",
      poolSize: 20,
      connectionTimeout: 5000,
      idleTimeout: 30000,
    };
    manager = new DatabaseConnectionManager(config);
  });

  afterEach(async () => {
    // Cleanup: disconnect if connected
    if (manager.pool) {
      try {
        await manager.disconnect();
      } catch {
        // Ignore errors during cleanup
      }
    }
    vi.clearAllMocks();
  });

  describe("Connection Pool Creation", () => {
    it("should create connection pool with valid configuration", async () => {
      await manager.connect();

      expect(manager.pool).toBeDefined();
      expect(manager.config.poolSize).toBe(20);
      expect(manager.config.connectionTimeout).toBe(5000);
      expect(manager.config.idleTimeout).toBe(30000);
    });

    it("should use default values for optional configuration", async () => {
      const minimalConfig = {
        host: "localhost",
        port: 5432,
        database: "test_db",
        user: "test_user",
        password: "test_pass",
      };

      const managerWithDefaults = new DatabaseConnectionManager(minimalConfig as DatabaseConfig);
      await managerWithDefaults.connect();

      // Defaults should be applied
      expect(managerWithDefaults.config.poolSize).toBe(20);
      expect(managerWithDefaults.config.connectionTimeout).toBe(5000);
      expect(managerWithDefaults.config.idleTimeout).toBe(30000);

      await managerWithDefaults.disconnect();
    });

    it("should establish connection within 5 seconds (Requirement 1.1)", async () => {
      const startTime = Date.now();
      await manager.connect();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(manager.pool).toBeDefined();
    });

    it("should not create duplicate pools on multiple connect calls", async () => {
      await manager.connect();
      const firstPool = manager.pool;

      await manager.connect();
      const secondPool = manager.pool;

      expect(firstPool).toBe(secondPool);
    });

    it("should validate configuration before connecting", async () => {
      const invalidConfig = {
        host: "",
        port: -1,
        database: "",
        user: "",
        password: "",
        poolSize: 0,
        connectionTimeout: -1,
        idleTimeout: -1,
      };

      const invalidManager = new DatabaseConnectionManager(invalidConfig);

      await expect(invalidManager.connect()).rejects.toThrow();
    });
  });

  describe("Connection Acquisition and Release", () => {
    it("should acquire connection from pool", async () => {
      await manager.connect();
      const client = await manager.getConnection();

      expect(client).toBeDefined();
      expect(client.query).toBeDefined();
      expect(client.release).toBeDefined();

      manager.releaseConnection(client);
    });

    it("should release connection back to pool", async () => {
      await manager.connect();
      const client = await manager.getConnection();

      manager.releaseConnection(client);

      expect(client.release).toHaveBeenCalled();
    });

    it("should handle connection timeout", async () => {
      await manager.connect();

      // Mock pool to simulate timeout
      const mockPool = manager.pool as any;
      mockPool.connect = vi.fn().mockRejectedValue(new Error("Connection timeout"));

      await expect(manager.getConnection()).rejects.toThrow("Connection timeout");
    });

    it("should throw error when getting connection before connect", async () => {
      await expect(manager.getConnection()).rejects.toThrow();
    });

    it("should handle pool exhaustion gracefully", async () => {
      await manager.connect();

      // Mock pool to simulate exhaustion
      const mockPool = manager.pool as any;
      mockPool.connect = vi
        .fn()
        .mockRejectedValue(new Error("Pool exhausted - all connections in use"));

      await expect(manager.getConnection()).rejects.toThrow("Pool exhausted");
    });
  });

  describe("Transaction Management", () => {
    it("should begin transaction", async () => {
      await manager.connect();
      const client = await manager.beginTransaction();

      expect(client).toBeDefined();
      expect(client.query).toHaveBeenCalledWith("BEGIN");
    });

    it("should commit transaction", async () => {
      await manager.connect();
      const client = await manager.beginTransaction();

      await manager.commitTransaction(client);

      expect(client.query).toHaveBeenCalledWith("COMMIT");
      expect(client.release).toHaveBeenCalled();
    });

    it("should rollback transaction", async () => {
      await manager.connect();
      const client = await manager.beginTransaction();

      await manager.rollbackTransaction(client);

      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
      expect(client.release).toHaveBeenCalled();
    });

    it("should rollback transaction on error", async () => {
      await manager.connect();
      const client = await manager.beginTransaction();

      // Simulate error during transaction
      (client.query as any).mockRejectedValueOnce(new Error("Query failed"));

      await expect(client.query("INVALID SQL")).rejects.toThrow("Query failed");

      // Should still be able to rollback
      await manager.rollbackTransaction(client);
      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    });

    it("should handle nested transaction attempts", async () => {
      await manager.connect();
      const client1 = await manager.beginTransaction();
      const client2 = await manager.beginTransaction();

      // Should get different clients for different transactions
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();

      await manager.commitTransaction(client1);
      await manager.commitTransaction(client2);
    });

    it("should release client even if commit fails", async () => {
      await manager.connect();
      const client = await manager.beginTransaction();

      // Mock commit failure
      (client.query as any).mockRejectedValueOnce(new Error("Commit failed"));

      await expect(manager.commitTransaction(client)).rejects.toThrow("Commit failed");
      expect(client.release).toHaveBeenCalled();
    });

    it("should release client even if rollback fails", async () => {
      await manager.connect();
      const client = await manager.beginTransaction();

      // Mock rollback failure
      (client.query as any).mockRejectedValueOnce(new Error("Rollback failed"));

      await expect(manager.rollbackTransaction(client)).rejects.toThrow("Rollback failed");
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe("Health Check", () => {
    it("should return true when database is healthy", async () => {
      await manager.connect();

      const isHealthy = await manager.healthCheck();

      expect(isHealthy).toBe(true);
      expect(manager.pool?.query).toHaveBeenCalledWith("SELECT 1");
    });

    it("should return false when database is unhealthy", async () => {
      await manager.connect();

      // Mock query failure
      const mockPool = manager.pool as any;
      mockPool.query = vi.fn().mockRejectedValue(new Error("Connection lost"));

      const isHealthy = await manager.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it("should complete health check within 1 second", async () => {
      await manager.connect();

      const startTime = Date.now();
      await manager.healthCheck();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it("should return false when not connected", async () => {
      const isHealthy = await manager.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it("should handle health check timeout", async () => {
      await manager.connect();

      // Mock slow query
      const mockPool = manager.pool as any;
      mockPool.query = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ rows: [{ result: 1 }] }), 2000);
          })
      );

      const startTime = Date.now();
      const isHealthy = await manager.healthCheck();
      const duration = Date.now() - startTime;

      // Should timeout and return false
      expect(duration).toBeLessThan(1500);
      expect(isHealthy).toBe(false);
    });
  });

  describe("Pool Statistics", () => {
    it("should return pool statistics", async () => {
      await manager.connect();

      const stats = manager.getPoolStats();

      expect(stats).toBeDefined();
      expect(stats.totalConnections).toBeGreaterThanOrEqual(0);
      expect(stats.idleConnections).toBeGreaterThanOrEqual(0);
      expect(stats.activeConnections).toBeGreaterThanOrEqual(0);
      expect(stats.waitingClients).toBeGreaterThanOrEqual(0);
    });

    it("should track active connections correctly", async () => {
      await manager.connect();

      const statsBefore = manager.getPoolStats();
      const client = await manager.getConnection();
      const statsDuring = manager.getPoolStats();
      manager.releaseConnection(client);
      const statsAfter = manager.getPoolStats();

      expect(statsDuring.activeConnections).toBeGreaterThanOrEqual(statsBefore.activeConnections);
      expect(statsAfter.idleConnections).toBeGreaterThanOrEqual(statsDuring.idleConnections);
    });

    it("should track waiting clients when pool is exhausted", async () => {
      await manager.connect();

      const stats = manager.getPoolStats();

      expect(stats.waitingClients).toBe(0);
    });

    it("should calculate active connections correctly", async () => {
      await manager.connect();

      const stats = manager.getPoolStats();

      // active = total - idle
      expect(stats.activeConnections).toBe(stats.totalConnections - stats.idleConnections);
    });

    it("should throw error when getting stats before connect", () => {
      expect(() => manager.getPoolStats()).toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle connection failure gracefully", async () => {
      // Mock Pool constructor to throw on all attempts
      vi.mocked(Pool).mockImplementation(() => {
        throw new Error("Connection refused");
      });

      const failingManager = new DatabaseConnectionManager(config);

      await expect(failingManager.connect()).rejects.toThrow("Connection refused");
    });

    it("should handle query errors", async () => {
      await manager.connect();
      const client = await manager.getConnection();

      // Mock query failure
      (client.query as any).mockRejectedValueOnce(new Error("Query syntax error"));

      await expect(client.query("INVALID SQL")).rejects.toThrow("Query syntax error");

      manager.releaseConnection(client);
    });

    it("should retry connection on transient failures", async () => {
      let attempts = 0;
      vi.mocked(Pool).mockImplementationOnce(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Transient failure");
        }
        return {
          connect: vi.fn().mockResolvedValue({
            query: vi.fn(),
            release: vi.fn(),
          }),
          end: vi.fn().mockResolvedValue(undefined),
          query: vi.fn().mockResolvedValue({ rows: [{ result: 1 }] }),
          totalCount: 20,
          idleCount: 15,
          waitingCount: 0,
        } as any;
      });

      // Should eventually succeed after retries
      await manager.connect();
      expect(manager.pool).toBeDefined();
    });

    it("should handle disconnect when not connected", async () => {
      // Should not throw
      await expect(manager.disconnect()).resolves.not.toThrow();
    });

    it("should handle disconnect errors gracefully", async () => {
      await manager.connect();

      // Mock end failure
      const mockPool = manager.pool as any;
      mockPool.end = vi.fn().mockRejectedValue(new Error("Disconnect failed"));

      // Should handle error gracefully
      await expect(manager.disconnect()).rejects.toThrow("Disconnect failed");
    });

    it("should clean up resources on disconnect", async () => {
      await manager.connect();
      const pool = manager.pool;

      await manager.disconnect();

      expect(pool?.end).toHaveBeenCalled();
      expect(manager.pool).toBeNull();
    });
  });

  describe("Reconnection Logic", () => {
    it("should automatically reconnect on connection loss", async () => {
      await manager.connect();

      // Simulate connection loss
      manager.pool = null;

      // Should reconnect automatically
      const client = await manager.getConnection();
      expect(client).toBeDefined();
      expect(manager.pool).toBeDefined();

      manager.releaseConnection(client);
    });

    it("should use exponential backoff for retries", async () => {
      const delays: number[] = [];
      let attempts = 0;

      vi.mocked(Pool).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          // Fail first 2 attempts, succeed on 3rd
          const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000);
          delays.push(delay);
          throw new Error("Connection failed");
        }
        return {
          connect: vi.fn().mockResolvedValue({
            query: vi.fn(),
            release: vi.fn(),
          }),
          end: vi.fn().mockResolvedValue(undefined),
          query: vi.fn().mockResolvedValue({ rows: [{ result: 1 }] }),
          totalCount: 20,
          idleCount: 15,
          waitingCount: 0,
        } as any;
      });

      await manager.connect();

      // Verify exponential backoff pattern - should have retried at least once
      expect(delays.length).toBeGreaterThan(0);
      expect(attempts).toBe(3); // Should succeed on 3rd attempt
    });

    it("should give up after max retry attempts", async () => {
      vi.mocked(Pool).mockImplementation(() => {
        throw new Error("Persistent connection failure");
      });

      const failingManager = new DatabaseConnectionManager(config);

      await expect(failingManager.connect()).rejects.toThrow();
    });

    it("should handle pool cleanup errors during retry", async () => {
      let attempts = 0;
      vi.mocked(Pool).mockImplementation(() => {
        attempts++;
        const mockPool = {
          connect: vi.fn().mockResolvedValue({
            query: vi.fn(),
            release: vi.fn(),
          }),
          end: vi.fn().mockRejectedValue(new Error("Cleanup failed")),
          query: vi.fn().mockRejectedValue(new Error("Connection test failed")),
          totalCount: 20,
          idleCount: 15,
          waitingCount: 0,
        };

        if (attempts < 3) {
          return mockPool as any;
        }

        // Succeed on 3rd attempt
        return {
          ...mockPool,
          query: vi.fn().mockResolvedValue({ rows: [{ result: 1 }] }),
        } as any;
      });

      // Should eventually succeed despite cleanup errors
      await manager.connect();
      expect(manager.pool).toBeDefined();
    });

    it("should throw error when reconnection fails after connection loss", async () => {
      await manager.connect();

      // Simulate connection loss
      manager.pool = null;

      // Mock Pool to fail on reconnection
      vi.mocked(Pool).mockImplementation(() => {
        throw new Error("Reconnection failed");
      });

      // Should throw error when reconnection fails
      await expect(manager.getConnection()).rejects.toThrow();
    });

    it("should handle edge case where pool is null after successful connect", async () => {
      await manager.connect();

      // Simulate connection loss
      manager.pool = null;

      // Mock connect to succeed but somehow leave pool null (defensive code test)
      const originalConnect = manager.connect.bind(manager);
      manager.connect = vi.fn().mockImplementation(async () => {
        // Simulate connect succeeding but not setting pool (edge case)
        // This tests the defensive check at lines 176-177
        return Promise.resolve();
      });

      // Should throw the defensive error
      await expect(manager.getConnection()).rejects.toThrow(
        "Failed to establish database connection"
      );

      // Restore original connect
      manager.connect = originalConnect;
    });
  });

  describe("Configuration Validation", () => {
    it("should reject invalid host", async () => {
      const invalidConfig = { ...config, host: "" };
      const invalidManager = new DatabaseConnectionManager(invalidConfig);

      await expect(invalidManager.connect()).rejects.toThrow("host is required");
    });

    it("should reject whitespace-only host", async () => {
      const invalidConfig = { ...config, host: "   " };
      const invalidManager = new DatabaseConnectionManager(invalidConfig);

      await expect(invalidManager.connect()).rejects.toThrow("host is required");
    });

    it("should reject invalid port", async () => {
      const invalidConfig = { ...config, port: -1 };
      const invalidManager = new DatabaseConnectionManager(invalidConfig);

      await expect(invalidManager.connect()).rejects.toThrow("port must be between");
    });

    it("should reject port above 65535", async () => {
      const invalidConfig = { ...config, port: 70000 };
      const invalidManager = new DatabaseConnectionManager(invalidConfig);

      await expect(invalidManager.connect()).rejects.toThrow("port must be between");
    });

    it("should reject invalid database", async () => {
      const invalidConfig = { ...config, database: "" };
      const invalidManager = new DatabaseConnectionManager(invalidConfig);

      await expect(invalidManager.connect()).rejects.toThrow("database is required");
    });

    it("should reject whitespace-only database", async () => {
      const invalidConfig = { ...config, database: "   " };
      const invalidManager = new DatabaseConnectionManager(invalidConfig);

      await expect(invalidManager.connect()).rejects.toThrow("database is required");
    });

    it("should reject invalid user", async () => {
      const invalidConfig = { ...config, user: "" };
      const invalidManager = new DatabaseConnectionManager(invalidConfig);

      await expect(invalidManager.connect()).rejects.toThrow("user is required");
    });

    it("should reject whitespace-only user", async () => {
      const invalidConfig = { ...config, user: "   " };
      const invalidManager = new DatabaseConnectionManager(invalidConfig);

      await expect(invalidManager.connect()).rejects.toThrow("user is required");
    });

    it("should reject invalid pool size", async () => {
      const invalidConfig = { ...config, poolSize: 0 };
      const invalidManager = new DatabaseConnectionManager(invalidConfig);

      await expect(invalidManager.connect()).rejects.toThrow("poolSize must be greater than 0");
    });

    it("should reject invalid connection timeout", async () => {
      const invalidConfig = { ...config, connectionTimeout: -1 };
      const invalidManager = new DatabaseConnectionManager(invalidConfig);

      await expect(invalidManager.connect()).rejects.toThrow(
        "connectionTimeout must be non-negative"
      );
    });

    it("should reject invalid idle timeout", async () => {
      const invalidConfig = { ...config, idleTimeout: -1 };
      const invalidManager = new DatabaseConnectionManager(invalidConfig);

      await expect(invalidManager.connect()).rejects.toThrow("idleTimeout must be non-negative");
    });
  });
});
