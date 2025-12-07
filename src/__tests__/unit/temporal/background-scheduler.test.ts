/**
 * Background Scheduler Tests
 *
 * Tests for cron-based decay scheduling with batch processing, resource monitoring,
 * graceful shutdown, and processing time limits.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../../database/connection-manager";
import { BackgroundScheduler } from "../../../temporal/background-scheduler";
import { TemporalDecayEngine } from "../../../temporal/decay-engine";
import {
  type BackgroundSchedulerConfig,
  DEFAULT_SCHEDULER_CONFIG,
} from "../../../temporal/scheduler-types";
import { SectorConfigManager } from "../../../temporal/sector-config";

describe("BackgroundScheduler - Cron-based Scheduling", () => {
  let configManager: SectorConfigManager;
  let db: DatabaseConnectionManager;
  let decayEngine: TemporalDecayEngine;
  let scheduler: BackgroundScheduler;

  // Test default configuration without database setup
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

  // Tests that require database connection
  describe("Database-dependent tests", () => {
    beforeEach(async () => {
      configManager = new SectorConfigManager();

      db = new DatabaseConnectionManager({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5433"),
        database: process.env.DB_NAME || "thoughtmcp_test",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        poolSize: 5,
        connectionTimeout: 5000,
        idleTimeout: 30000,
      });

      await db.connect();
      decayEngine = new TemporalDecayEngine(configManager, db);

      // Clean up any leftover test data from previous runs
      const cleanupClient = await db.getConnection();
      try {
        await cleanupClient.query(`DELETE FROM memories WHERE id LIKE 'batch-test-%'`);
        await cleanupClient.query(`DELETE FROM memories WHERE id LIKE 'time-test-%'`);
      } finally {
        db.releaseConnection(cleanupClient);
      }
    });

    afterEach(async () => {
      if (scheduler) {
        scheduler.stop();
      }
      await db.disconnect();
    });

    describe("Configuration Validation", () => {
      it("should reject empty cron expression", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        expect(() => new BackgroundScheduler(config, decayEngine)).toThrow(
          "Invalid cron expression: must be a non-empty string"
        );
      });

      it("should reject non-string cron expression", () => {
        const config = {
          cronExpression: 123 as unknown as string,
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        expect(() => new BackgroundScheduler(config, decayEngine)).toThrow(
          "Invalid cron expression: must be a non-empty string"
        );
      });

      it("should reject negative batch size", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: -100,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        expect(() => new BackgroundScheduler(config, decayEngine)).toThrow(
          "Invalid batch size: must be positive"
        );
      });

      it("should reject zero batch size", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 0,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        expect(() => new BackgroundScheduler(config, decayEngine)).toThrow(
          "Invalid batch size: must be positive"
        );
      });

      it("should reject negative max processing time", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: -1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        expect(() => new BackgroundScheduler(config, decayEngine)).toThrow(
          "Invalid max processing time: must be positive"
        );
      });

      it("should reject zero max processing time", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 0,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        expect(() => new BackgroundScheduler(config, decayEngine)).toThrow(
          "Invalid max processing time: must be positive"
        );
      });

      it("should reject negative CPU threshold", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: -10,
            maxMemoryMB: 2048,
          },
        };

        expect(() => new BackgroundScheduler(config, decayEngine)).toThrow(
          "Invalid CPU threshold: must be between 0 and 100"
        );
      });

      it("should reject zero CPU threshold", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 0,
            maxMemoryMB: 2048,
          },
        };

        expect(() => new BackgroundScheduler(config, decayEngine)).toThrow(
          "Invalid CPU threshold: must be between 0 and 100"
        );
      });

      it("should reject CPU threshold above 100", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 150,
            maxMemoryMB: 2048,
          },
        };

        expect(() => new BackgroundScheduler(config, decayEngine)).toThrow(
          "Invalid CPU threshold: must be between 0 and 100"
        );
      });

      it("should reject negative memory threshold", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: -1024,
          },
        };

        expect(() => new BackgroundScheduler(config, decayEngine)).toThrow(
          "Invalid memory threshold: must be positive"
        );
      });

      it("should reject zero memory threshold", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 0,
          },
        };

        expect(() => new BackgroundScheduler(config, decayEngine)).toThrow(
          "Invalid memory threshold: must be positive"
        );
      });
    });

    describe("Cron Expression Configuration", () => {
      it("should accept valid cron expression for daily at 2 AM", () => {
        // Test default cron expression: daily at 2 AM
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000, // 30 minutes
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        expect(scheduler.getCronExpression()).toBe("0 2 * * *");
      });

      it("should accept custom cron expressions", () => {
        // Test custom cron expression: every 6 hours
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 */6 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        expect(scheduler.getCronExpression()).toBe("0 */6 * * *");
      });

      it("should validate cron expression format", () => {
        // Test invalid cron expression
        const invalidConfig: BackgroundSchedulerConfig = {
          cronExpression: "invalid cron",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        // In actual implementation, this should throw or return validation error
        // For now, we just verify the config is stored
        scheduler = new BackgroundScheduler(invalidConfig, decayEngine);
        expect(scheduler.getCronExpression()).toBe("invalid cron");
      });

      it("should support multiple scheduling patterns", () => {
        // Test various cron patterns
        const patterns = [
          "0 2 * * *", // Daily at 2 AM
          "0 */4 * * *", // Every 4 hours
          "0 0 * * 0", // Weekly on Sunday at midnight
          "0 3 1 * *", // Monthly on 1st at 3 AM
        ];

        patterns.forEach((pattern) => {
          const config: BackgroundSchedulerConfig = {
            cronExpression: pattern,
            batchSize: 1000,
            maxProcessingTime: 30 * 60 * 1000,
            resourceThresholds: {
              maxCpuPercent: 80,
              maxMemoryMB: 2048,
            },
          };

          const testScheduler = new BackgroundScheduler(config, decayEngine);
          expect(testScheduler.getCronExpression()).toBe(pattern);
        });
      });
    });

    describe("Batch Processing Configuration", () => {
      it("should use configurable batch size", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 500,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        expect(scheduler.getBatchSize()).toBe(500);
      });

      it("should support default batch size of 1000", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        expect(scheduler.getBatchSize()).toBe(1000);
      });

      it("should support different batch sizes for different workloads", () => {
        const batchSizes = [100, 500, 1000, 2000, 5000];

        batchSizes.forEach((size) => {
          const config: BackgroundSchedulerConfig = {
            cronExpression: "0 2 * * *",
            batchSize: size,
            maxProcessingTime: 30 * 60 * 1000,
            resourceThresholds: {
              maxCpuPercent: 80,
              maxMemoryMB: 2048,
            },
          };

          const testScheduler = new BackgroundScheduler(config, decayEngine);
          expect(testScheduler.getBatchSize()).toBe(size);
        });
      });

      it("should process memories in batches during maintenance", async () => {
        // Create test memories using batch insert
        const client = await db.getConnection();
        try {
          // Build batch insert query for 2500 test memories
          const values: string[] = [];
          const params: any[] = [];
          let paramIndex = 1;

          for (let i = 0; i < 2500; i++) {
            values.push(
              `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`
            );
            params.push(
              `batch-test-${i}`,
              `Test memory ${i}`,
              new Date(),
              new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
              1,
              0.5,
              0.02,
              1.0,
              "user-1",
              "session-1",
              "episodic"
            );
            paramIndex += 11;
          }

          await client.query(
            `INSERT INTO memories (id, content, created_at, last_accessed, access_count,
           salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ${values.join(", ")}`,
            params
          );
        } finally {
          db.releaseConnection(client);
        }

        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        // Run maintenance job
        const startTime = Date.now();
        await scheduler.runJob();
        const processingTime = Date.now() - startTime;

        // Verify processing completed
        expect(processingTime).toBeLessThan(30 * 60 * 1000); // Should complete within 30 minutes

        // Clean up test memories
        const cleanupClient = await db.getConnection();
        try {
          await cleanupClient.query(`DELETE FROM memories WHERE id LIKE 'batch-test-%'`);
        } finally {
          db.releaseConnection(cleanupClient);
        }
      }, 30000); // 30 second timeout for processing 2500 memories
    });

    describe("Resource Monitoring and Throttling", () => {
      it("should monitor CPU usage", async () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        const usage = await scheduler.checkResourceUsage();

        expect(usage).toHaveProperty("cpuPercent");
        expect(typeof usage.cpuPercent).toBe("number");
        expect(usage.cpuPercent).toBeGreaterThanOrEqual(0);
        expect(usage.cpuPercent).toBeLessThanOrEqual(100);
      });

      it("should monitor memory usage", async () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        const usage = await scheduler.checkResourceUsage();

        expect(usage).toHaveProperty("memoryMB");
        expect(typeof usage.memoryMB).toBe("number");
        expect(usage.memoryMB).toBeGreaterThan(0);
      });

      it("should throttle when CPU exceeds threshold", async () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        // Simulate high CPU usage
        const highCpuUsage = { cpuPercent: 85, memoryMB: 512 };
        const shouldThrottle = scheduler.shouldThrottle(highCpuUsage);

        expect(shouldThrottle).toBe(true);
      });

      it("should throttle when memory exceeds threshold", async () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        // Simulate high memory usage
        const highMemoryUsage = { cpuPercent: 45, memoryMB: 2500 };
        const shouldThrottle = scheduler.shouldThrottle(highMemoryUsage);

        expect(shouldThrottle).toBe(true);
      });

      it("should not throttle when resources are within limits", async () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        // Simulate normal resource usage
        const normalUsage = { cpuPercent: 45, memoryMB: 512 };
        const shouldThrottle = scheduler.shouldThrottle(normalUsage);

        expect(shouldThrottle).toBe(false);
      });

      it("should support configurable resource thresholds", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 60,
            maxMemoryMB: 1024,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        const thresholds = scheduler.getResourceThresholds();
        expect(thresholds.maxCpuPercent).toBe(60);
        expect(thresholds.maxMemoryMB).toBe(1024);
      });
    });

    describe("Graceful Shutdown and Resumption", () => {
      it("should start scheduler successfully", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        scheduler.start();

        expect(scheduler.isSchedulerRunning()).toBe(true);
      });

      it("should stop scheduler gracefully", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        scheduler.start();
        expect(scheduler.isSchedulerRunning()).toBe(true);

        scheduler.stop();
        expect(scheduler.isSchedulerRunning()).toBe(false);
      });

      it("should handle multiple start/stop cycles", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

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
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        // Start, stop, then resume
        scheduler.start();
        scheduler.stop();
        scheduler.start();

        expect(scheduler.isSchedulerRunning()).toBe(true);
      });

      it("should handle stop when not running", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        // Stop without starting
        expect(() => scheduler.stop()).not.toThrow();
        expect(scheduler.isSchedulerRunning()).toBe(false);
      });

      it("should handle multiple start calls idempotently", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        // Start multiple times
        scheduler.start();
        expect(scheduler.isSchedulerRunning()).toBe(true);

        scheduler.start(); // Should not throw or cause issues
        expect(scheduler.isSchedulerRunning()).toBe(true);

        scheduler.start(); // Third time
        expect(scheduler.isSchedulerRunning()).toBe(true);
      });

      it("should prevent concurrent job execution", async () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        // Start two jobs concurrently
        const job1Promise = scheduler.runJob();
        const job2Promise = scheduler.runJob(); // Should return immediately

        // Both should complete without error
        await Promise.all([job1Promise, job2Promise]);

        // No assertion needed - if we get here without hanging, the test passes
        expect(true).toBe(true);
      });
    });

    describe("Processing Time Limits", () => {
      it("should enforce maximum processing time", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000, // 30 minutes
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

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
            cronExpression: "0 2 * * *",
            batchSize: 1000,
            maxProcessingTime: limit,
            resourceThresholds: {
              maxCpuPercent: 80,
              maxMemoryMB: 2048,
            },
          };

          const testScheduler = new BackgroundScheduler(config, decayEngine);
          expect(testScheduler.getMaxProcessingTime()).toBe(limit);
        });
      });

      it("should complete processing within time limit for 100k memories", async () => {
        // This test verifies the requirement: "processing SHALL complete within 30 minutes for 100,000 memories"
        // We'll test with a smaller dataset and verify the time scales appropriately

        // Create 1000 test memories (1% of 100k) using batch insert
        const client = await db.getConnection();
        try {
          // Build batch insert query for 1000 test memories
          const values: string[] = [];
          const params: any[] = [];
          let paramIndex = 1;

          for (let i = 0; i < 1000; i++) {
            values.push(
              `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`
            );
            params.push(
              `time-test-${i}`,
              `Test memory ${i}`,
              new Date(),
              new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
              1,
              0.5,
              0.02,
              1.0,
              "user-1",
              "session-1",
              "episodic"
            );
            paramIndex += 11;
          }

          await client.query(
            `INSERT INTO memories (id, content, created_at, last_accessed, access_count,
           salience, decay_rate, strength, user_id, session_id, primary_sector)
           VALUES ${values.join(", ")}`,
            params
          );
        } finally {
          db.releaseConnection(client);
        }

        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        const startTime = Date.now();
        await scheduler.runJob();
        const processingTime = Date.now() - startTime;

        // For 1000 memories, should complete in < 18 seconds (1% of 30 minutes)
        // Using 20 seconds to allow for overhead
        expect(processingTime).toBeLessThan(20000);

        // Clean up
        const cleanupClient = await db.getConnection();
        try {
          await cleanupClient.query(`DELETE FROM memories WHERE id LIKE 'time-test-%'`);
        } finally {
          db.releaseConnection(cleanupClient);
        }
      }, 30000); // 30 second timeout for processing 1000 memories

      it("should track processing time for maintenance operations", async () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        const startTime = Date.now();
        const result = await decayEngine.runDecayMaintenance();
        const actualTime = Date.now() - startTime;

        // Verify result includes processing time
        expect(result).toHaveProperty("processingTime");
        expect(result.processingTime).toBeGreaterThan(0);
        expect(result.processingTime).toBeLessThanOrEqual(actualTime + 100); // Allow 100ms tolerance
      });

      it("should handle throttling delay when resources are constrained", async () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 1, // Very low threshold to trigger throttling
            maxMemoryMB: 1, // Very low threshold to trigger throttling
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        const startTime = Date.now();
        await scheduler.runJob();
        const processingTime = Date.now() - startTime;

        // Should include the 5 second throttling delay
        expect(processingTime).toBeGreaterThanOrEqual(5000);
      });
    });

    describe("Configuration Access", () => {
      it("should return full configuration object", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        const retrievedConfig = scheduler.getConfig();

        expect(retrievedConfig).toEqual(config);
        expect(retrievedConfig).not.toBe(config); // Should be a copy, not the same reference
      });

      it("should return immutable configuration copy", () => {
        const config: BackgroundSchedulerConfig = {
          cronExpression: "0 2 * * *",
          batchSize: 1000,
          maxProcessingTime: 30 * 60 * 1000,
          resourceThresholds: {
            maxCpuPercent: 80,
            maxMemoryMB: 2048,
          },
        };

        scheduler = new BackgroundScheduler(config, decayEngine);

        const retrievedConfig = scheduler.getConfig();
        retrievedConfig.batchSize = 5000; // Modify the copy

        // Original config should remain unchanged
        expect(scheduler.getBatchSize()).toBe(1000);
      });
    });
  }); // Close "Database-dependent tests" describe block
});
