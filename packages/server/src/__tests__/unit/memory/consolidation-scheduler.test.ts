/**
 * Consolidation Scheduler Unit Tests
 *
 * Tests for the ConsolidationScheduler class that manages scheduled and manual
 * execution of memory consolidation.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONSOLIDATION_CONFIG } from "../../../memory/consolidation-engine";
import {
  ConsolidationScheduler,
  ConsolidationSchedulerError,
  DEFAULT_SCHEDULER_CONFIG,
  type SchedulerConfig,
} from "../../../memory/consolidation-scheduler";

// Mock consolidation engine
const mockRunConsolidation = vi.fn();
const mockConsolidationEngine = {
  runConsolidation: mockRunConsolidation,
  identifyClusters: vi.fn(),
  generateSummary: vi.fn(),
  consolidate: vi.fn(),
};

describe("ConsolidationScheduler", () => {
  let scheduler: ConsolidationScheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    scheduler = new ConsolidationScheduler(mockConsolidationEngine as never);
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("DEFAULT_SCHEDULER_CONFIG", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_SCHEDULER_CONFIG.cronExpression).toBe("0 3 * * *");
      expect(DEFAULT_SCHEDULER_CONFIG.enabled).toBe(true);
      expect(DEFAULT_SCHEDULER_CONFIG.maxSystemLoad).toBe(0.8);
      expect(DEFAULT_SCHEDULER_CONFIG.maxRetryAttempts).toBe(3);
      expect(DEFAULT_SCHEDULER_CONFIG.baseRetryDelayMs).toBe(1000);
      expect(DEFAULT_SCHEDULER_CONFIG.consolidationConfig).toEqual(DEFAULT_CONSOLIDATION_CONFIG);
    });
  });

  describe("Configuration Validation", () => {
    it("should reject empty cron expression", () => {
      expect(() => {
        new ConsolidationScheduler(mockConsolidationEngine as never, {
          cronExpression: "",
        });
      }).toThrow(ConsolidationSchedulerError);
    });

    it("should reject maxSystemLoad below 0", () => {
      expect(() => {
        new ConsolidationScheduler(mockConsolidationEngine as never, {
          maxSystemLoad: -0.1,
        });
      }).toThrow(ConsolidationSchedulerError);
    });

    it("should reject maxSystemLoad above 1", () => {
      expect(() => {
        new ConsolidationScheduler(mockConsolidationEngine as never, {
          maxSystemLoad: 1.5,
        });
      }).toThrow(ConsolidationSchedulerError);
    });

    it("should reject negative maxRetryAttempts", () => {
      expect(() => {
        new ConsolidationScheduler(mockConsolidationEngine as never, {
          maxRetryAttempts: -1,
        });
      }).toThrow(ConsolidationSchedulerError);
    });

    it("should reject negative baseRetryDelayMs", () => {
      expect(() => {
        new ConsolidationScheduler(mockConsolidationEngine as never, {
          baseRetryDelayMs: -100,
        });
      }).toThrow(ConsolidationSchedulerError);
    });

    it("should accept valid configuration", () => {
      const config: Partial<SchedulerConfig> = {
        cronExpression: "0 */6 * * *",
        enabled: true,
        maxSystemLoad: 0.9,
        maxRetryAttempts: 5,
        baseRetryDelayMs: 2000,
      };

      const customScheduler = new ConsolidationScheduler(mockConsolidationEngine as never, config);
      const actualConfig = customScheduler.getConfig();

      expect(actualConfig.cronExpression).toBe("0 */6 * * *");
      expect(actualConfig.maxSystemLoad).toBe(0.9);
      expect(actualConfig.maxRetryAttempts).toBe(5);
      expect(actualConfig.baseRetryDelayMs).toBe(2000);
    });
  });

  describe("start/stop", () => {
    it("should start the scheduler", () => {
      expect(scheduler.isRunning()).toBe(false);

      scheduler.start();

      expect(scheduler.isRunning()).toBe(true);
    });

    it("should stop the scheduler", () => {
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);

      scheduler.stop();

      expect(scheduler.isRunning()).toBe(false);
    });

    it("should be idempotent when starting multiple times", () => {
      scheduler.start();
      scheduler.start();
      scheduler.start();

      expect(scheduler.isRunning()).toBe(true);
    });

    it("should not start if disabled", () => {
      const disabledScheduler = new ConsolidationScheduler(mockConsolidationEngine as never, {
        enabled: false,
      });

      disabledScheduler.start();

      expect(disabledScheduler.isRunning()).toBe(false);
    });
  });

  describe("triggerNow", () => {
    it("should throw error when userId is empty", async () => {
      await expect(scheduler.triggerNow("")).rejects.toThrow(ConsolidationSchedulerError);
      await expect(scheduler.triggerNow("")).rejects.toMatchObject({
        code: "INVALID_INPUT",
      });
    });

    it("should run consolidation for the specified user", async () => {
      const mockResults = [
        {
          summaryId: "summary1",
          consolidatedIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
          summaryContent: "Test summary",
          consolidatedAt: new Date(),
        },
      ];

      mockRunConsolidation.mockResolvedValueOnce(mockResults);

      const results = await scheduler.triggerNow("user1");

      expect(results).toEqual(mockResults);
      expect(mockRunConsolidation).toHaveBeenCalledWith("user1", expect.any(Object));
    });

    it("should throw error if job is already running", async () => {
      // Use a deferred promise pattern to control when the job completes
      let resolveJob: () => void;
      let jobStarted: () => void;
      const jobStartedPromise = new Promise<void>((resolve) => {
        jobStarted = resolve;
      });

      mockRunConsolidation.mockImplementation(() => {
        // Signal that the job has started
        jobStarted();
        return new Promise((resolve) => {
          resolveJob = () => resolve([]);
        });
      });

      // Start first job (don't await)
      const firstJob = scheduler.triggerNow("user1");

      // Wait for the job to actually start (mock is called)
      await jobStartedPromise;

      // Now try to start second job - should fail
      await expect(scheduler.triggerNow("user2")).rejects.toThrow(ConsolidationSchedulerError);
      await expect(scheduler.triggerNow("user2")).rejects.toMatchObject({
        code: "JOB_IN_PROGRESS",
      });

      // Clean up - resolve the first job
      resolveJob!();
      await firstJob;
    });

    it("should update lastRunAt after successful consolidation", async () => {
      mockRunConsolidation.mockResolvedValueOnce([]);

      const beforeRun = scheduler.getStatus().lastRunAt;
      expect(beforeRun).toBeNull();

      await scheduler.triggerNow("user1");

      const afterRun = scheduler.getStatus().lastRunAt;
      expect(afterRun).toBeInstanceOf(Date);
    });
  });

  describe("getStatus", () => {
    it("should return initial status", () => {
      const status = scheduler.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.lastRunAt).toBeNull();
      expect(status.currentProgress).toBeNull();
      expect(status.detailedProgress).toBeNull();
      expect(status.lastError).toBeNull();
      expect(status.retryAttempts).toBe(0);
      expect(status.batchSize).toBe(DEFAULT_CONSOLIDATION_CONFIG.batchSize);
    });

    it("should report running status during consolidation", async () => {
      let resolveConsolidation: () => void;
      let jobStarted: () => void;
      const jobStartedPromise = new Promise<void>((resolve) => {
        jobStarted = resolve;
      });

      mockRunConsolidation.mockImplementation(() => {
        // Signal that the job has started
        jobStarted();
        return new Promise((resolve) => {
          resolveConsolidation = () => resolve([]);
        });
      });

      // Start consolidation
      const jobPromise = scheduler.triggerNow("user1");

      // Wait for the job to actually start
      await jobStartedPromise;

      // Check status while running
      const runningStatus = scheduler.getStatus();
      expect(runningStatus.isRunning).toBe(true);
      expect(runningStatus.currentProgress).not.toBeNull();
      expect(runningStatus.detailedProgress).not.toBeNull();
      expect(runningStatus.detailedProgress?.phase).toBe("identifying_clusters");

      // Complete the job
      resolveConsolidation!();
      await jobPromise;

      // Check status after completion
      const completedStatus = scheduler.getStatus();
      expect(completedStatus.isRunning).toBe(false);
      expect(completedStatus.currentProgress).toBeNull();
      expect(completedStatus.detailedProgress).toBeNull();
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      scheduler.updateConfig({ maxSystemLoad: 0.9 });

      const config = scheduler.getConfig();
      expect(config.maxSystemLoad).toBe(0.9);
    });

    it("should restart scheduler if it was running", () => {
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);

      scheduler.updateConfig({ cronExpression: "0 4 * * *" });

      expect(scheduler.isRunning()).toBe(true);
      expect(scheduler.getConfig().cronExpression).toBe("0 4 * * *");
    });

    it("should not restart scheduler if it was not running", () => {
      expect(scheduler.isRunning()).toBe(false);

      scheduler.updateConfig({ cronExpression: "0 4 * * *" });

      expect(scheduler.isRunning()).toBe(false);
    });

    it("should validate new configuration", () => {
      expect(() => {
        scheduler.updateConfig({ maxSystemLoad: 2.0 });
      }).toThrow(ConsolidationSchedulerError);
    });
  });

  describe("Retry Logic (Requirement 7.5)", () => {
    it("should retry on failure with exponential backoff", async () => {
      const error = new Error("Consolidation failed");
      mockRunConsolidation
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce([]);

      const customScheduler = new ConsolidationScheduler(mockConsolidationEngine as never, {
        maxRetryAttempts: 3,
        baseRetryDelayMs: 100,
      });

      const resultPromise = customScheduler.triggerNow("user1");

      // First attempt fails immediately
      await vi.advanceTimersByTimeAsync(0);

      // Wait for first retry delay (100ms)
      await vi.advanceTimersByTimeAsync(100);

      // Wait for second retry delay (200ms)
      await vi.advanceTimersByTimeAsync(200);

      const results = await resultPromise;

      expect(results).toEqual([]);
      expect(mockRunConsolidation).toHaveBeenCalledTimes(3);
    });

    it("should throw after max retries exceeded", async () => {
      const error = new Error("Consolidation failed");
      mockRunConsolidation.mockRejectedValue(error);

      const customScheduler = new ConsolidationScheduler(mockConsolidationEngine as never, {
        maxRetryAttempts: 2,
        baseRetryDelayMs: 100,
      });

      // Use real timers for this test since we're testing actual retry behavior
      vi.useRealTimers();

      await expect(customScheduler.triggerNow("user1")).rejects.toThrow(
        ConsolidationSchedulerError
      );

      // Verify the error code in a separate call
      try {
        await customScheduler.triggerNow("user1");
      } catch (e) {
        expect(e).toBeInstanceOf(ConsolidationSchedulerError);
        expect((e as ConsolidationSchedulerError).code).toBe("MAX_RETRIES_EXCEEDED");
      }

      // 3 attempts total (initial + 2 retries) for first call
      // Plus 3 more for second call = 6 total
      expect(mockRunConsolidation).toHaveBeenCalledTimes(6);

      // Restore fake timers for other tests
      vi.useFakeTimers();
    }, 15000); // Increase timeout for retry delays

    it("should track retry attempts in status", async () => {
      const error = new Error("Consolidation failed");
      mockRunConsolidation
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce([]);

      const customScheduler = new ConsolidationScheduler(mockConsolidationEngine as never, {
        maxRetryAttempts: 3,
        baseRetryDelayMs: 100,
      });

      const resultPromise = customScheduler.triggerNow("user1");

      // Advance through retries
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);

      await resultPromise;

      // After completion, retryAttempts should reflect the last attempt number
      const status = customScheduler.getStatus();
      expect(status.retryAttempts).toBe(2); // 0-indexed, so 2 means third attempt
    });
  });

  describe("System Load Threshold (Requirement 7.6)", () => {
    it("should check system load", async () => {
      const load = await scheduler.checkSystemLoad();

      expect(typeof load).toBe("number");
      expect(load).toBeGreaterThanOrEqual(0);
      expect(load).toBeLessThanOrEqual(1);
    });

    it("should skip consolidation when load exceeds threshold", async () => {
      // Create scheduler with very low threshold
      const lowThresholdScheduler = new ConsolidationScheduler(mockConsolidationEngine as never, {
        maxSystemLoad: 0.0001, // Very low threshold to trigger skip
      });

      await expect(lowThresholdScheduler.triggerNow("user1")).rejects.toThrow(
        ConsolidationSchedulerError
      );
      await expect(lowThresholdScheduler.triggerNow("user1")).rejects.toMatchObject({
        code: "LOAD_THRESHOLD_EXCEEDED",
      });

      // Consolidation should not have been called
      expect(mockRunConsolidation).not.toHaveBeenCalled();
    });

    it("should proceed when load is below threshold", async () => {
      mockRunConsolidation.mockResolvedValueOnce([]);

      // Create scheduler with high threshold
      const highThresholdScheduler = new ConsolidationScheduler(mockConsolidationEngine as never, {
        maxSystemLoad: 0.99, // High threshold to allow consolidation
      });

      await highThresholdScheduler.triggerNow("user1");

      expect(mockRunConsolidation).toHaveBeenCalled();
    });
  });

  describe("Progress Reporting (Requirement 7.3)", () => {
    it("should report progress during consolidation", async () => {
      let resolveConsolidation: () => void;
      let jobStarted: () => void;
      const jobStartedPromise = new Promise<void>((resolve) => {
        jobStarted = resolve;
      });

      mockRunConsolidation.mockImplementation(() => {
        // Signal that the job has started
        jobStarted();
        return new Promise((resolve) => {
          resolveConsolidation = () => resolve([]);
        });
      });

      // Start consolidation
      const jobPromise = scheduler.triggerNow("user1");

      // Wait for the job to actually start
      await jobStartedPromise;

      // Check progress while running
      const status = scheduler.getStatus();
      expect(status.currentProgress).not.toBeNull();
      expect(status.currentProgress?.processed).toBe(0);
      expect(status.currentProgress?.total).toBe(1);
      expect(status.currentProgress?.percentComplete).toBe(0);

      // Complete the job
      resolveConsolidation!();
      await jobPromise;

      // Progress should be cleared after completion
      const finalStatus = scheduler.getStatus();
      expect(finalStatus.currentProgress).toBeNull();
    });
  });

  describe("Batch Size Configuration (Requirement 7.4)", () => {
    it("should pass batch size to consolidation engine", async () => {
      mockRunConsolidation.mockResolvedValueOnce([]);

      const customScheduler = new ConsolidationScheduler(mockConsolidationEngine as never, {
        consolidationConfig: {
          ...DEFAULT_CONSOLIDATION_CONFIG,
          batchSize: 50,
        },
      });

      await customScheduler.triggerNow("user1");

      expect(mockRunConsolidation).toHaveBeenCalledWith(
        "user1",
        expect.objectContaining({ batchSize: 50 })
      );
    });

    it("should return batch size from getBatchSize", () => {
      const customScheduler = new ConsolidationScheduler(mockConsolidationEngine as never, {
        consolidationConfig: {
          ...DEFAULT_CONSOLIDATION_CONFIG,
          batchSize: 75,
        },
      });

      expect(customScheduler.getBatchSize()).toBe(75);
    });

    it("should update batch size with setBatchSize", () => {
      expect(scheduler.getBatchSize()).toBe(DEFAULT_CONSOLIDATION_CONFIG.batchSize);

      scheduler.setBatchSize(200);

      expect(scheduler.getBatchSize()).toBe(200);
      expect(scheduler.getStatus().batchSize).toBe(200);
    });

    it("should reject invalid batch size", () => {
      expect(() => scheduler.setBatchSize(0)).toThrow(ConsolidationSchedulerError);
      expect(() => scheduler.setBatchSize(-1)).toThrow(ConsolidationSchedulerError);
    });

    it("should include batch size in status", () => {
      const status = scheduler.getStatus();
      expect(status.batchSize).toBe(DEFAULT_CONSOLIDATION_CONFIG.batchSize);
    });
  });

  describe("Detailed Progress (Requirement 7.3)", () => {
    it("should return null when not running", () => {
      expect(scheduler.getDetailedProgress()).toBeNull();
    });

    it("should return detailed progress during consolidation", async () => {
      // Create scheduler with high threshold to avoid system load check failures
      const highThresholdScheduler = new ConsolidationScheduler(mockConsolidationEngine as never, {
        maxSystemLoad: 0.99, // High threshold to ensure test doesn't fail due to actual system load
      });

      let resolveConsolidation: () => void;
      let jobStarted: () => void;
      const jobStartedPromise = new Promise<void>((resolve) => {
        jobStarted = resolve;
      });

      mockRunConsolidation.mockImplementation(() => {
        jobStarted();
        return new Promise((resolve) => {
          resolveConsolidation = () => resolve([]);
        });
      });

      const jobPromise = highThresholdScheduler.triggerNow("user1");
      await jobStartedPromise;

      const progress = highThresholdScheduler.getDetailedProgress();
      expect(progress).not.toBeNull();
      expect(progress?.phase).toBe("identifying_clusters");
      expect(progress?.startedAt).toBeInstanceOf(Date);
      expect(progress?.memoriesTotal).toBe(DEFAULT_CONSOLIDATION_CONFIG.batchSize);

      resolveConsolidation!();
      await jobPromise;

      expect(highThresholdScheduler.getDetailedProgress()).toBeNull();

      // Clean up
      highThresholdScheduler.stop();
    });

    it("should update progress after successful consolidation", async () => {
      // Create scheduler with high threshold to avoid system load check failures
      const highThresholdScheduler = new ConsolidationScheduler(mockConsolidationEngine as never, {
        maxSystemLoad: 0.99, // High threshold to ensure test doesn't fail due to actual system load
      });

      const mockResults = [
        {
          summaryId: "summary1",
          consolidatedIds: ["mem1", "mem2", "mem3", "mem4", "mem5"],
          summaryContent: "Test summary",
          consolidatedAt: new Date(),
        },
      ];

      mockRunConsolidation.mockResolvedValueOnce(mockResults);

      await highThresholdScheduler.triggerNow("user1");

      // After completion, detailed progress should be cleared
      expect(highThresholdScheduler.getDetailedProgress()).toBeNull();

      // But status should show last run
      const status = highThresholdScheduler.getStatus();
      expect(status.lastRunAt).toBeInstanceOf(Date);

      // Clean up
      highThresholdScheduler.stop();
    });
  });

  describe("Cron Expression Parsing", () => {
    it("should calculate next run time for daily cron", () => {
      const dailyScheduler = new ConsolidationScheduler(mockConsolidationEngine as never, {
        cronExpression: "0 3 * * *", // Daily at 3 AM
      });

      dailyScheduler.start();
      const status = dailyScheduler.getStatus();

      expect(status.nextRunAt).toBeInstanceOf(Date);
      expect(status.nextRunAt?.getHours()).toBe(3);
      expect(status.nextRunAt?.getMinutes()).toBe(0);

      dailyScheduler.stop();
    });

    it("should handle invalid cron expression gracefully", () => {
      const invalidScheduler = new ConsolidationScheduler(mockConsolidationEngine as never, {
        cronExpression: "invalid",
      });

      invalidScheduler.start();
      const status = invalidScheduler.getStatus();

      // Should not crash, but nextRunAt may be null
      expect(status.nextRunAt).toBeNull();

      invalidScheduler.stop();
    });
  });
});
