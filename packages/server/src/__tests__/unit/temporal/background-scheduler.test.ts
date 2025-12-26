/**
 * Background Scheduler Unit Tests
 *
 * Tests for cron-based decay scheduling configuration, validation,
 * resource monitoring logic, and graceful shutdown.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundScheduler } from "../../../temporal/background-scheduler";
import type { BackgroundSchedulerConfig } from "../../../temporal/scheduler-types";
import { DEFAULT_SCHEDULER_CONFIG } from "../../../temporal/scheduler-types";

describe("BackgroundScheduler", () => {
  // Mock decay engine for unit tests
  const mockDecayEngine = {
    runDecayMaintenance: vi.fn().mockResolvedValue({
      memoriesProcessed: 0,
      memoriesDecayed: 0,
      processingTime: 100,
    }),
  };

  const validConfig: BackgroundSchedulerConfig = {
    cronExpression: "0 2 * * *",
    batchSize: 1000,
    maxProcessingTime: 30 * 60 * 1000,
    resourceThresholds: {
      maxCpuPercent: 80,
      maxMemoryMB: 2048,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Default Configuration", () => {
    it("should have valid default scheduler configuration", () => {
      expect(DEFAULT_SCHEDULER_CONFIG).toBeDefined();
      expect(DEFAULT_SCHEDULER_CONFIG.cronExpression).toBe("0 2 * * *");
      expect(DEFAULT_SCHEDULER_CONFIG.batchSize).toBe(1000);
      expect(DEFAULT_SCHEDULER_CONFIG.maxProcessingTime).toBe(30 * 60 * 1000);
      expect(DEFAULT_SCHEDULER_CONFIG.resourceThresholds.maxCpuPercent).toBe(80);
      expect(DEFAULT_SCHEDULER_CONFIG.resourceThresholds.maxMemoryMB).toBe(2048);
    });
  });

  describe("Configuration Validation", () => {
    it("should reject empty cron expression", () => {
      const config: BackgroundSchedulerConfig = {
        ...validConfig,
        cronExpression: "",
      };

      expect(() => new BackgroundScheduler(config, mockDecayEngine as any)).toThrow(
        "Invalid cron expression: must be a non-empty string"
      );
    });

    it("should reject non-string cron expression", () => {
      const config = {
        ...validConfig,
        cronExpression: 123 as unknown as string,
      };

      expect(() => new BackgroundScheduler(config, mockDecayEngine as any)).toThrow(
        "Invalid cron expression: must be a non-empty string"
      );
    });

    it("should reject negative batch size", () => {
      const config: BackgroundSchedulerConfig = {
        ...validConfig,
        batchSize: -100,
      };

      expect(() => new BackgroundScheduler(config, mockDecayEngine as any)).toThrow(
        "Invalid batch size: must be positive"
      );
    });

    it("should reject zero batch size", () => {
      const config: BackgroundSchedulerConfig = {
        ...validConfig,
        batchSize: 0,
      };

      expect(() => new BackgroundScheduler(config, mockDecayEngine as any)).toThrow(
        "Invalid batch size: must be positive"
      );
    });

    it("should reject negative max processing time", () => {
      const config: BackgroundSchedulerConfig = {
        ...validConfig,
        maxProcessingTime: -1000,
      };

      expect(() => new BackgroundScheduler(config, mockDecayEngine as any)).toThrow(
        "Invalid max processing time: must be positive"
      );
    });

    it("should reject zero max processing time", () => {
      const config: BackgroundSchedulerConfig = {
        ...validConfig,
        maxProcessingTime: 0,
      };

      expect(() => new BackgroundScheduler(config, mockDecayEngine as any)).toThrow(
        "Invalid max processing time: must be positive"
      );
    });

    it("should reject negative CPU threshold", () => {
      const config: BackgroundSchedulerConfig = {
        ...validConfig,
        resourceThresholds: {
          maxCpuPercent: -10,
          maxMemoryMB: 2048,
        },
      };

      expect(() => new BackgroundScheduler(config, mockDecayEngine as any)).toThrow(
        "Invalid CPU threshold: must be between 0 and 100"
      );
    });

    it("should reject zero CPU threshold", () => {
      const config: BackgroundSchedulerConfig = {
        ...validConfig,
        resourceThresholds: {
          maxCpuPercent: 0,
          maxMemoryMB: 2048,
        },
      };

      expect(() => new BackgroundScheduler(config, mockDecayEngine as any)).toThrow(
        "Invalid CPU threshold: must be between 0 and 100"
      );
    });

    it("should reject CPU threshold above 100", () => {
      const config: BackgroundSchedulerConfig = {
        ...validConfig,
        resourceThresholds: {
          maxCpuPercent: 150,
          maxMemoryMB: 2048,
        },
      };

      expect(() => new BackgroundScheduler(config, mockDecayEngine as any)).toThrow(
        "Invalid CPU threshold: must be between 0 and 100"
      );
    });

    it("should reject negative memory threshold", () => {
      const config: BackgroundSchedulerConfig = {
        ...validConfig,
        resourceThresholds: {
          maxCpuPercent: 80,
          maxMemoryMB: -1024,
        },
      };

      expect(() => new BackgroundScheduler(config, mockDecayEngine as any)).toThrow(
        "Invalid memory threshold: must be positive"
      );
    });

    it("should reject zero memory threshold", () => {
      const config: BackgroundSchedulerConfig = {
        ...validConfig,
        resourceThresholds: {
          maxCpuPercent: 80,
          maxMemoryMB: 0,
        },
      };

      expect(() => new BackgroundScheduler(config, mockDecayEngine as any)).toThrow(
        "Invalid memory threshold: must be positive"
      );
    });
  });

  describe("Cron Expression Configuration", () => {
    it("should accept valid cron expression for daily at 2 AM", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      expect(scheduler.getCronExpression()).toBe("0 2 * * *");
    });

    it("should accept custom cron expressions", () => {
      const config: BackgroundSchedulerConfig = {
        ...validConfig,
        cronExpression: "0 */6 * * *",
      };

      const scheduler = new BackgroundScheduler(config, mockDecayEngine as any);
      expect(scheduler.getCronExpression()).toBe("0 */6 * * *");
    });

    it("should support multiple scheduling patterns", () => {
      const patterns = [
        "0 2 * * *", // Daily at 2 AM
        "0 */4 * * *", // Every 4 hours
        "0 0 * * 0", // Weekly on Sunday at midnight
        "0 3 1 * *", // Monthly on 1st at 3 AM
      ];

      patterns.forEach((pattern) => {
        const config: BackgroundSchedulerConfig = {
          ...validConfig,
          cronExpression: pattern,
        };

        const scheduler = new BackgroundScheduler(config, mockDecayEngine as any);
        expect(scheduler.getCronExpression()).toBe(pattern);
      });
    });
  });

  describe("Batch Processing Configuration", () => {
    it("should use configurable batch size", () => {
      const config: BackgroundSchedulerConfig = {
        ...validConfig,
        batchSize: 500,
      };

      const scheduler = new BackgroundScheduler(config, mockDecayEngine as any);
      expect(scheduler.getBatchSize()).toBe(500);
    });

    it("should support default batch size of 1000", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      expect(scheduler.getBatchSize()).toBe(1000);
    });

    it("should support different batch sizes for different workloads", () => {
      const batchSizes = [100, 500, 1000, 2000, 5000];

      batchSizes.forEach((size) => {
        const config: BackgroundSchedulerConfig = {
          ...validConfig,
          batchSize: size,
        };

        const scheduler = new BackgroundScheduler(config, mockDecayEngine as any);
        expect(scheduler.getBatchSize()).toBe(size);
      });
    });
  });

  describe("Resource Monitoring and Throttling", () => {
    it("should monitor CPU usage", async () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      const usage = await scheduler.checkResourceUsage();

      expect(usage).toHaveProperty("cpuPercent");
      expect(typeof usage.cpuPercent).toBe("number");
      expect(usage.cpuPercent).toBeGreaterThanOrEqual(0);
      expect(usage.cpuPercent).toBeLessThanOrEqual(100);
    });

    it("should monitor memory usage", async () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      const usage = await scheduler.checkResourceUsage();

      expect(usage).toHaveProperty("memoryMB");
      expect(typeof usage.memoryMB).toBe("number");
      expect(usage.memoryMB).toBeGreaterThan(0);
    });

    it("should throttle when CPU exceeds threshold", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      const highCpuUsage = { cpuPercent: 85, memoryMB: 512 };
      expect(scheduler.shouldThrottle(highCpuUsage)).toBe(true);
    });

    it("should throttle when memory exceeds threshold", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      const highMemoryUsage = { cpuPercent: 45, memoryMB: 2500 };
      expect(scheduler.shouldThrottle(highMemoryUsage)).toBe(true);
    });

    it("should not throttle when resources are within limits", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      const normalUsage = { cpuPercent: 45, memoryMB: 512 };
      expect(scheduler.shouldThrottle(normalUsage)).toBe(false);
    });

    it("should support configurable resource thresholds", () => {
      const config: BackgroundSchedulerConfig = {
        ...validConfig,
        resourceThresholds: {
          maxCpuPercent: 60,
          maxMemoryMB: 1024,
        },
      };

      const scheduler = new BackgroundScheduler(config, mockDecayEngine as any);
      const thresholds = scheduler.getResourceThresholds();
      expect(thresholds.maxCpuPercent).toBe(60);
      expect(thresholds.maxMemoryMB).toBe(1024);
    });
  });

  describe("Graceful Shutdown and Resumption", () => {
    it("should start scheduler successfully", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
      scheduler.stop();
    });

    it("should stop scheduler gracefully", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
      scheduler.stop();
      expect(scheduler.isSchedulerRunning()).toBe(false);
    });

    it("should handle multiple start/stop cycles", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);

      // First cycle
      scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
      scheduler.stop();
      expect(scheduler.isSchedulerRunning()).toBe(false);

      // Second cycle
      scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
      scheduler.stop();
      expect(scheduler.isSchedulerRunning()).toBe(false);

      // Third cycle
      scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
      scheduler.stop();
      expect(scheduler.isSchedulerRunning()).toBe(false);
    });

    it("should allow resumption after graceful shutdown", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      scheduler.start();
      scheduler.stop();
      scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
      scheduler.stop();
    });

    it("should handle stop when not running", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      expect(() => scheduler.stop()).not.toThrow();
      expect(scheduler.isSchedulerRunning()).toBe(false);
    });

    it("should handle multiple start calls idempotently", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
      scheduler.start(); // Should not throw or cause issues
      expect(scheduler.isSchedulerRunning()).toBe(true);
      scheduler.start(); // Third time
      expect(scheduler.isSchedulerRunning()).toBe(true);
      scheduler.stop();
    });

    it("should prevent concurrent job execution", async () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);

      // Start two jobs concurrently
      const job1Promise = scheduler.runJob();
      const job2Promise = scheduler.runJob(); // Should return immediately

      // Both should complete without error
      await Promise.all([job1Promise, job2Promise]);

      // Verify decay engine was only called once (second job skipped)
      expect(mockDecayEngine.runDecayMaintenance).toHaveBeenCalledTimes(1);
    });
  });

  describe("Processing Time Limits", () => {
    it("should enforce maximum processing time", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      expect(scheduler.getMaxProcessingTime()).toBe(30 * 60 * 1000);
    });

    it("should support configurable processing time limits", () => {
      const timeLimits = [
        10 * 60 * 1000, // 10 minutes
        30 * 60 * 1000, // 30 minutes
        60 * 60 * 1000, // 1 hour
      ];

      timeLimits.forEach((limit) => {
        const config: BackgroundSchedulerConfig = {
          ...validConfig,
          maxProcessingTime: limit,
        };

        const scheduler = new BackgroundScheduler(config, mockDecayEngine as any);
        expect(scheduler.getMaxProcessingTime()).toBe(limit);
      });
    });
  });

  describe("Configuration Access", () => {
    it("should return full configuration object", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      const retrievedConfig = scheduler.getConfig();

      expect(retrievedConfig).toEqual(validConfig);
      expect(retrievedConfig).not.toBe(validConfig); // Should be a copy
    });

    it("should return immutable configuration copy", () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      const retrievedConfig = scheduler.getConfig();
      retrievedConfig.batchSize = 5000; // Modify the copy

      // Original config should remain unchanged
      expect(scheduler.getBatchSize()).toBe(1000);
    });
  });

  describe("Job Execution", () => {
    it("should run decay maintenance job", async () => {
      const scheduler = new BackgroundScheduler(validConfig, mockDecayEngine as any);
      await scheduler.runJob();
      expect(mockDecayEngine.runDecayMaintenance).toHaveBeenCalledTimes(1);
    });

    it("should handle decay engine errors gracefully", async () => {
      const errorEngine = {
        runDecayMaintenance: vi.fn().mockRejectedValue(new Error("Decay failed")),
      };

      const scheduler = new BackgroundScheduler(validConfig, errorEngine as any);
      await expect(scheduler.runJob()).rejects.toThrow("Decay failed");
    });
  });
});
