/**
 * Background Scheduler Type Definitions
 *
 * Types and interfaces for the background decay scheduler system.
 * Supports cron-based scheduling, resource monitoring, and graceful shutdown.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

/**
 * Background scheduler configuration
 */
export interface BackgroundSchedulerConfig {
  /** Cron expression for scheduling (e.g., "0 2 * * *" for daily at 2 AM) */
  cronExpression: string;

  /** Number of memories to process in each batch (default 1000) */
  batchSize: number;

  /** Maximum processing time in milliseconds (default 30 minutes) */
  maxProcessingTime: number;

  /** Resource usage thresholds for throttling */
  resourceThresholds: {
    /** Maximum CPU usage percentage before throttling (default 80) */
    maxCpuPercent: number;

    /** Maximum memory usage in MB before throttling (default 2048) */
    maxMemoryMB: number;
  };
}

/**
 * Resource usage metrics
 */
export interface ResourceUsage {
  /** CPU usage as percentage (0-100) */
  cpuPercent: number;

  /** Memory usage in megabytes */
  memoryMB: number;
}

/**
 * Default scheduler configuration
 */
export const DEFAULT_SCHEDULER_CONFIG: BackgroundSchedulerConfig = {
  cronExpression: "0 2 * * *", // Daily at 2 AM
  batchSize: 1000,
  maxProcessingTime: 30 * 60 * 1000, // 30 minutes
  resourceThresholds: {
    maxCpuPercent: 80,
    maxMemoryMB: 2048,
  },
};
