/**
 * DatabaseConnectionManager Unit Tests
 *
 * Tests for PostgreSQL connection management with pooling, transactions, and error handling.
 * All external dependencies (pg module) are mocked for isolation.
 */

import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DatabaseConnectionManager,
  type DatabaseConfig,
} from "../../../database/connection-manager";

vi.mock("pg", () => {
  return {
    Pool: vi.fn(),
  };
});

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
  let mockClient: MockClient;

  beforeEach(() => {
    const mocks = createMockPoolAndClient();
    mockPool = mocks.mockPool;
    mockClient = mocks.mockClient;

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

      expect(managerWithDefaults.config.poolSize).toBe(20);
      expect(managerWithDefaults.config.connectionTimeout).toBe(5000);

      await managerWithDefaults.disconnect();
    });

    it("should not create duplicate pools on multiple connect calls", async () => {
      await manager.connect();
      const firstPool = manager.pool;

      await manager.connect();
      const secondPool = manager.pool;

      expect(firstPool).toBe(secondPool);
    });
  });

  describe("Connection Acquisition and Release", () => {
    it("should acquire connection from pool", async () => {
      await manager.connect();

      const client = await manager.getConnection();

      expect(client).toBeDefined();
      expect(mockPool.connect).toHaveBeenCalled();
    });

    it("should release connection back to pool", async () => {
      await manager.connect();
      const client = await manager.getConnection();

      manager.releaseConnection(client);

      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should throw error when getting connection before connect", async () => {
      await expect(manager.getConnection()).rejects.toThrow();
    });
  });

  describe("Transaction Management", () => {
    it("should begin transaction", async () => {
      await manager.connect();

      const client = await manager.beginTransaction();

      expect(client).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
    });

    it("should commit transaction", async () => {
      await manager.connect();
      const client = await manager.beginTransaction();

      await manager.commitTransaction(client);

      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should rollback transaction", async () => {
      await manager.connect();
      const client = await manager.beginTransaction();

      await manager.rollbackTransaction(client);

      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("Health Check", () => {
    it("should return true when database is healthy", async () => {
      await manager.connect();

      const isHealthy = await manager.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it("should return false when database is unhealthy", async () => {
      await manager.connect();
      mockPool.query.mockRejectedValueOnce(new Error("Connection failed"));

      const isHealthy = await manager.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it("should return false when not connected", async () => {
      const isHealthy = await manager.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe("Pool Statistics", () => {
    it("should return pool statistics", async () => {
      await manager.connect();

      const stats = manager.getPoolStats();

      expect(stats.totalConnections).toBe(20);
      expect(stats.idleConnections).toBe(15);
      expect(stats.waitingClients).toBe(0);
    });

    it("should throw error when getting stats before connect", () => {
      expect(() => manager.getPoolStats()).toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle connection failure gracefully", async () => {
      mockPool.connect.mockRejectedValueOnce(new Error("Connection failed"));

      await manager.connect();

      await expect(manager.getConnection()).rejects.toThrow("Connection failed");
    });

    it("should handle disconnect when not connected", async () => {
      await expect(manager.disconnect()).resolves.not.toThrow();
    });

    it("should handle commit transaction error", async () => {
      await manager.connect();
      const client = await manager.beginTransaction();
      mockClient.query.mockRejectedValueOnce(new Error("Commit failed"));

      await expect(manager.commitTransaction(client)).rejects.toThrow();
    });

    it("should handle rollback transaction error", async () => {
      await manager.connect();
      const client = await manager.beginTransaction();
      mockClient.query.mockRejectedValueOnce(new Error("Rollback failed"));

      await expect(manager.rollbackTransaction(client)).rejects.toThrow();
    });
  });
});
