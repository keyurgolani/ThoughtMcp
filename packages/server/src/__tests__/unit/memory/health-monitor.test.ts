/**
 * Health Monitor Unit Tests
 *
 * Tests for memory health monitoring functionality.
 * Requirements: 2.1 (storage metrics), 2.2 (counts by sector), 2.3 (counts by age),
 *               2.5 (forgetting candidates), 2.6 (recommendations), 2.7 (80% threshold)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseConnectionManager } from "../../../database/connection-manager";
import {
  HealthMonitor,
  HealthMonitorError,
  createHealthMonitor,
} from "../../../memory/health-monitor";

describe("HealthMonitor", () => {
  let mockDb: {
    getConnection: ReturnType<typeof vi.fn>;
    releaseConnection: ReturnType<typeof vi.fn>;
    beginTransaction: ReturnType<typeof vi.fn>;
    commitTransaction: ReturnType<typeof vi.fn>;
    rollbackTransaction: ReturnType<typeof vi.fn>;
  };
  let mockClient: {
    query: ReturnType<typeof vi.fn>;
  };
  let healthMonitor: HealthMonitor;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };

    mockDb = {
      getConnection: vi.fn().mockResolvedValue(mockClient),
      releaseConnection: vi.fn(),
      beginTransaction: vi.fn().mockResolvedValue(mockClient),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
    };

    healthMonitor = new HealthMonitor(mockDb as unknown as DatabaseConnectionManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getStorageMetrics", () => {
    it("should return storage metrics for a user", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ content_bytes: "1000", embedding_bytes: "500" }],
      });

      const result = await healthMonitor.getStorageMetrics("user-123");

      expect(result.bytesUsed).toBe(1500);
      expect(result.quotaBytes).toBe(1024 * 1024 * 1024); // 1GB default
      expect(result.usagePercent).toBeCloseTo(0, 2); // Very small percentage
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("SELECT"), [
        "user-123",
      ]);
    });

    it("should handle zero storage usage", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ content_bytes: "0", embedding_bytes: "0" }],
      });

      const result = await healthMonitor.getStorageMetrics("user-123");

      expect(result.bytesUsed).toBe(0);
      expect(result.usagePercent).toBe(0);
    });

    it("should throw error for missing userId", async () => {
      await expect(healthMonitor.getStorageMetrics("")).rejects.toThrow(HealthMonitorError);
      await expect(healthMonitor.getStorageMetrics("")).rejects.toThrow("userId is required");
    });

    it("should handle database errors", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(healthMonitor.getStorageMetrics("user-123")).rejects.toThrow(HealthMonitorError);
    });
  });

  describe("getCountsBySector", () => {
    it("should return counts for all sectors", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { primary_sector: "episodic", count: "10" },
          { primary_sector: "semantic", count: "5" },
          { primary_sector: "procedural", count: "3" },
          { primary_sector: "emotional", count: "2" },
          { primary_sector: "reflective", count: "1" },
        ],
      });

      const result = await healthMonitor.getCountsBySector("user-123");

      expect(result.episodic).toBe(10);
      expect(result.semantic).toBe(5);
      expect(result.procedural).toBe(3);
      expect(result.emotional).toBe(2);
      expect(result.reflective).toBe(1);
    });

    it("should return zero for missing sectors", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ primary_sector: "episodic", count: "5" }],
      });

      const result = await healthMonitor.getCountsBySector("user-123");

      expect(result.episodic).toBe(5);
      expect(result.semantic).toBe(0);
      expect(result.procedural).toBe(0);
      expect(result.emotional).toBe(0);
      expect(result.reflective).toBe(0);
    });

    it("should throw error for missing userId", async () => {
      await expect(healthMonitor.getCountsBySector("")).rejects.toThrow(HealthMonitorError);
    });
  });

  describe("getCountsByAge", () => {
    it("should return counts for all age buckets", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            last_24h: "5",
            last_week: "10",
            last_month: "20",
            older: "100",
          },
        ],
      });

      const result = await healthMonitor.getCountsByAge("user-123");

      expect(result.last24h).toBe(5);
      expect(result.lastWeek).toBe(10);
      expect(result.lastMonth).toBe(20);
      expect(result.older).toBe(100);
    });

    it("should handle empty results", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{}],
      });

      const result = await healthMonitor.getCountsByAge("user-123");

      expect(result.last24h).toBe(0);
      expect(result.lastWeek).toBe(0);
      expect(result.lastMonth).toBe(0);
      expect(result.older).toBe(0);
    });

    it("should throw error for missing userId", async () => {
      await expect(healthMonitor.getCountsByAge("")).rejects.toThrow(HealthMonitorError);
    });
  });

  describe("getForgettingCandidates", () => {
    it("should return forgetting candidates breakdown", async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ low_strength: "10", old_age: "20", low_access: "30" }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: "45" }], // Some overlap between categories
        });

      const result = await healthMonitor.getForgettingCandidates("user-123");

      expect(result.lowStrength).toBe(10);
      expect(result.oldAge).toBe(20);
      expect(result.lowAccess).toBe(30);
      expect(result.total).toBe(45);
    });

    it("should handle zero candidates", async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ low_strength: "0", old_age: "0", low_access: "0" }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: "0" }],
        });

      const result = await healthMonitor.getForgettingCandidates("user-123");

      expect(result.lowStrength).toBe(0);
      expect(result.oldAge).toBe(0);
      expect(result.lowAccess).toBe(0);
      expect(result.total).toBe(0);
    });

    it("should throw error for missing userId", async () => {
      await expect(healthMonitor.getForgettingCandidates("")).rejects.toThrow(HealthMonitorError);
    });
  });

  describe("getRecommendations", () => {
    it("should return storage optimization recommendation when usage exceeds 80%", async () => {
      // Mock storage metrics showing 85% usage
      const quotaBytes = 1000;
      const monitor = new HealthMonitor(mockDb as unknown as DatabaseConnectionManager, {
        quotaBytes,
      });

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ content_bytes: "800", embedding_bytes: "50" }], // 85% usage
        })
        .mockResolvedValueOnce({
          rows: [], // counts by sector
        })
        .mockResolvedValueOnce({
          rows: [{ last_24h: "0", last_week: "0", last_month: "0", older: "0" }],
        })
        .mockResolvedValueOnce({
          rows: [{ low_strength: "0", old_age: "0", low_access: "0" }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: "0" }],
        });

      const result = await monitor.getRecommendations("user-123");

      expect(result.some((r) => r.type === "optimization")).toBe(true);
      expect(result.find((r) => r.type === "optimization")?.priority).toBe("medium");
    });

    it("should return high priority when storage exceeds 90%", async () => {
      const quotaBytes = 1000;
      const monitor = new HealthMonitor(mockDb as unknown as DatabaseConnectionManager, {
        quotaBytes,
      });

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ content_bytes: "900", embedding_bytes: "50" }], // 95% usage
        })
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          rows: [{ last_24h: "0", last_week: "0", last_month: "0", older: "0" }],
        })
        .mockResolvedValueOnce({
          rows: [{ low_strength: "0", old_age: "0", low_access: "0" }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: "0" }],
        });

      const result = await monitor.getRecommendations("user-123");

      expect(result.find((r) => r.type === "optimization")?.priority).toBe("high");
    });

    it("should return pruning recommendation when many forgetting candidates", async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ content_bytes: "100", embedding_bytes: "50" }],
        })
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          rows: [{ last_24h: "0", last_week: "0", last_month: "0", older: "0" }],
        })
        .mockResolvedValueOnce({
          rows: [{ low_strength: "50", old_age: "50", low_access: "50" }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: "150" }], // More than 100 candidates
        });

      const result = await healthMonitor.getRecommendations("user-123");

      expect(result.some((r) => r.type === "pruning")).toBe(true);
    });

    it("should return archiving recommendation when many old memories", async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ content_bytes: "100", embedding_bytes: "50" }],
        })
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          rows: [{ last_24h: "0", last_week: "0", last_month: "0", older: "150" }], // More than 100 old
        })
        .mockResolvedValueOnce({
          rows: [{ low_strength: "0", old_age: "0", low_access: "0" }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: "0" }],
        });

      const result = await healthMonitor.getRecommendations("user-123");

      expect(result.some((r) => r.type === "archiving")).toBe(true);
    });

    it("should return consolidation recommendation when many episodic memories", async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ content_bytes: "100", embedding_bytes: "50" }],
        })
        .mockResolvedValueOnce({
          rows: [{ primary_sector: "episodic", count: "100" }], // More than 50 episodic
        })
        .mockResolvedValueOnce({
          rows: [{ last_24h: "0", last_week: "0", last_month: "0", older: "0" }],
        })
        .mockResolvedValueOnce({
          rows: [{ low_strength: "0", old_age: "0", low_access: "0" }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: "0" }],
        });

      const result = await healthMonitor.getRecommendations("user-123");

      expect(result.some((r) => r.type === "consolidation")).toBe(true);
    });

    it("should return empty recommendations when all metrics are healthy", async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ content_bytes: "100", embedding_bytes: "50" }], // Low usage
        })
        .mockResolvedValueOnce({
          rows: [{ primary_sector: "episodic", count: "10" }], // Few episodic
        })
        .mockResolvedValueOnce({
          rows: [{ last_24h: "5", last_week: "5", last_month: "0", older: "0" }], // Few old
        })
        .mockResolvedValueOnce({
          rows: [{ low_strength: "0", old_age: "0", low_access: "0" }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: "0" }], // No candidates
        });

      const result = await healthMonitor.getRecommendations("user-123");

      expect(result.length).toBe(0);
    });

    it("should throw error for missing userId", async () => {
      await expect(healthMonitor.getRecommendations("")).rejects.toThrow(HealthMonitorError);
    });
  });

  describe("getHealth", () => {
    it("should return complete health response", async () => {
      // Setup mocks for all queries - use mockImplementation to handle parallel calls
      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("LENGTH(m.content)")) {
          // Storage metrics query
          return { rows: [{ content_bytes: "1000", embedding_bytes: "500" }] };
        }
        if (sql.includes("GROUP BY primary_sector")) {
          // Counts by sector query
          return {
            rows: [
              { primary_sector: "episodic", count: "10" },
              { primary_sector: "semantic", count: "5" },
            ],
          };
        }
        if (sql.includes("INTERVAL '24 hours'")) {
          // Counts by age query
          return { rows: [{ last_24h: "5", last_week: "10", last_month: "20", older: "50" }] };
        }
        if (sql.includes("low_strength") && sql.includes("old_age")) {
          // Forgetting candidates breakdown query
          return { rows: [{ low_strength: "5", old_age: "10", low_access: "15" }] };
        }
        if (
          sql.includes("strength <") &&
          sql.includes("access_count <=") &&
          !sql.includes("low_strength")
        ) {
          // Forgetting candidates total query
          return { rows: [{ total: "25" }] };
        }
        if (sql.includes("information_schema.columns")) {
          // Column check query - return that column exists
          return { rows: [{ column_name: "consolidated_into" }] };
        }
        if (sql.includes("consolidated_into IS NULL")) {
          // Consolidation queue query
          return { rows: [{ count: "10" }] };
        }
        return { rows: [] };
      });

      const result = await healthMonitor.getHealth("user-123");

      // Verify structure
      expect(result.storage).toBeDefined();
      expect(result.countsBySector).toBeDefined();
      expect(result.countsByAge).toBeDefined();
      expect(result.forgettingCandidates).toBeDefined();
      expect(result.consolidationQueue).toBeDefined();
      expect(result.activeConsolidation).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);

      // Verify values
      expect(result.storage.bytesUsed).toBe(1500);
      expect(result.countsBySector.episodic).toBe(10);
      expect(result.countsBySector.semantic).toBe(5);
      expect(result.countsByAge.last24h).toBe(5);
      expect(result.forgettingCandidates.total).toBe(25);

      // Verify activeConsolidation defaults (no scheduler set)
      expect(result.activeConsolidation.isRunning).toBe(false);
      expect(result.activeConsolidation.phase).toBeNull();
    });

    it("should handle missing consolidated_into column gracefully", async () => {
      // Setup mocks - column check returns empty (column doesn't exist)
      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("LENGTH(m.content)")) {
          return { rows: [{ content_bytes: "1000", embedding_bytes: "500" }] };
        }
        if (sql.includes("GROUP BY primary_sector")) {
          return {
            rows: [{ primary_sector: "episodic", count: "10" }],
          };
        }
        if (sql.includes("INTERVAL '24 hours'")) {
          return { rows: [{ last_24h: "5", last_week: "10", last_month: "20", older: "50" }] };
        }
        if (sql.includes("low_strength") && sql.includes("old_age")) {
          return { rows: [{ low_strength: "5", old_age: "10", low_access: "15" }] };
        }
        if (
          sql.includes("strength <") &&
          sql.includes("access_count <=") &&
          !sql.includes("low_strength")
        ) {
          return { rows: [{ total: "25" }] };
        }
        if (sql.includes("information_schema.columns")) {
          // Column doesn't exist
          return { rows: [] };
        }
        if (sql.includes("primary_sector = 'episodic'") && !sql.includes("consolidated_into")) {
          // Fallback query without consolidated_into
          return { rows: [{ count: "10" }] };
        }
        return { rows: [] };
      });

      const result = await healthMonitor.getHealth("user-123");

      // Should still return valid health response
      expect(result.storage).toBeDefined();
      expect(result.consolidationQueue.size).toBe(10);
    });

    it("should throw error for missing userId", async () => {
      await expect(healthMonitor.getHealth("")).rejects.toThrow(HealthMonitorError);
      await expect(healthMonitor.getHealth("")).rejects.toThrow("userId is required");
    });

    it("should handle database errors gracefully", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Connection failed"));

      await expect(healthMonitor.getHealth("user-123")).rejects.toThrow(HealthMonitorError);
      await expect(healthMonitor.getHealth("user-123")).rejects.toThrow(
        "Failed to get health metrics"
      );
    });

    it("should release connection after successful query", async () => {
      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("LENGTH(m.content)")) {
          return { rows: [{ content_bytes: "0", embedding_bytes: "0" }] };
        }
        if (sql.includes("GROUP BY primary_sector")) {
          return { rows: [] };
        }
        if (sql.includes("INTERVAL '24 hours'")) {
          return { rows: [{}] };
        }
        if (sql.includes("low_strength") && sql.includes("old_age")) {
          return { rows: [{}] };
        }
        if (sql.includes("strength <") && sql.includes("access_count <=")) {
          return { rows: [{ total: "0" }] };
        }
        if (sql.includes("information_schema.columns")) {
          // Column check query - return that column exists
          return { rows: [{ column_name: "consolidated_into" }] };
        }
        if (sql.includes("consolidated_into IS NULL")) {
          return { rows: [{ count: "0" }] };
        }
        return { rows: [] };
      });

      await healthMonitor.getHealth("user-123");

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });

    it("should release connection after error", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Query failed"));

      await expect(healthMonitor.getHealth("user-123")).rejects.toThrow();

      expect(mockDb.releaseConnection).toHaveBeenCalledWith(mockClient);
    });
  });

  describe("Scheduler Integration (Requirement 7.3)", () => {
    it("should return active consolidation progress when scheduler is set", async () => {
      const mockScheduler = {
        getDetailedProgress: vi.fn().mockReturnValue({
          processed: 5,
          total: 10,
          percentComplete: 50,
          phase: "consolidating" as const,
          clustersIdentified: 3,
          clustersConsolidated: 1,
          memoriesProcessed: 25,
          memoriesTotal: 100,
          startedAt: new Date(),
          estimatedRemainingMs: 5000,
        }),
      };

      healthMonitor.setScheduler(mockScheduler as never);

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("LENGTH(m.content)")) {
          return { rows: [{ content_bytes: "1000", embedding_bytes: "500" }] };
        }
        if (sql.includes("GROUP BY primary_sector")) {
          return { rows: [] };
        }
        if (sql.includes("INTERVAL '24 hours'")) {
          return { rows: [{ last_24h: "0", last_week: "0", last_month: "0", older: "0" }] };
        }
        if (sql.includes("low_strength") && sql.includes("old_age")) {
          return { rows: [{ low_strength: "0", old_age: "0", low_access: "0" }] };
        }
        if (sql.includes("strength <") && sql.includes("access_count <=")) {
          return { rows: [{ total: "0" }] };
        }
        if (sql.includes("information_schema.columns")) {
          return { rows: [{ column_name: "consolidated_into" }] };
        }
        if (sql.includes("consolidated_into IS NULL")) {
          return { rows: [{ count: "0" }] };
        }
        return { rows: [] };
      });

      const result = await healthMonitor.getHealth("user-123");

      expect(result.activeConsolidation.isRunning).toBe(true);
      expect(result.activeConsolidation.phase).toBe("consolidating");
      expect(result.activeConsolidation.clustersIdentified).toBe(3);
      expect(result.activeConsolidation.clustersConsolidated).toBe(1);
      expect(result.activeConsolidation.memoriesProcessed).toBe(25);
      expect(result.activeConsolidation.memoriesTotal).toBe(100);
      expect(result.activeConsolidation.percentComplete).toBe(50);
    });

    it("should return not running when scheduler has no progress", async () => {
      const mockScheduler = {
        getDetailedProgress: vi.fn().mockReturnValue(null),
      };

      healthMonitor.setScheduler(mockScheduler as never);

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes("LENGTH(m.content)")) {
          return { rows: [{ content_bytes: "0", embedding_bytes: "0" }] };
        }
        if (sql.includes("GROUP BY primary_sector")) {
          return { rows: [] };
        }
        if (sql.includes("INTERVAL '24 hours'")) {
          return { rows: [{ last_24h: "0", last_week: "0", last_month: "0", older: "0" }] };
        }
        if (sql.includes("low_strength") && sql.includes("old_age")) {
          return { rows: [{ low_strength: "0", old_age: "0", low_access: "0" }] };
        }
        if (sql.includes("strength <") && sql.includes("access_count <=")) {
          return { rows: [{ total: "0" }] };
        }
        if (sql.includes("information_schema.columns")) {
          return { rows: [{ column_name: "consolidated_into" }] };
        }
        if (sql.includes("consolidated_into IS NULL")) {
          return { rows: [{ count: "0" }] };
        }
        return { rows: [] };
      });

      const result = await healthMonitor.getHealth("user-123");

      expect(result.activeConsolidation.isRunning).toBe(false);
      expect(result.activeConsolidation.phase).toBeNull();
    });

    it("should accept scheduler in constructor options", () => {
      const mockScheduler = {
        getDetailedProgress: vi.fn().mockReturnValue(null),
      };

      const monitor = createHealthMonitor(mockDb as unknown as DatabaseConnectionManager, {
        scheduler: mockScheduler as never,
      });

      expect(monitor).toBeInstanceOf(HealthMonitor);
    });
  });

  describe("createHealthMonitor factory", () => {
    it("should create a HealthMonitor instance", () => {
      const monitor = createHealthMonitor(mockDb as unknown as DatabaseConnectionManager);
      expect(monitor).toBeInstanceOf(HealthMonitor);
    });

    it("should accept custom quota", async () => {
      const customQuota = 500;
      const monitor = createHealthMonitor(mockDb as unknown as DatabaseConnectionManager, {
        quotaBytes: customQuota,
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [{ content_bytes: "250", embedding_bytes: "0" }],
      });

      const result = await monitor.getStorageMetrics("user-123");

      expect(result.quotaBytes).toBe(customQuota);
      expect(result.usagePercent).toBe(50); // 250/500 = 50%
    });
  });

  describe("HealthMonitorError", () => {
    it("should have correct properties", () => {
      const error = new HealthMonitorError("Test error", "TEST_CODE", { key: "value" });

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_CODE");
      expect(error.context).toEqual({ key: "value" });
      expect(error.name).toBe("HealthMonitorError");
    });
  });
});
