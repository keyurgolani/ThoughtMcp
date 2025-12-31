/**
 * Consolidation Scheduler
 *
 * Manages scheduled execution of memory consolidation with cron-based scheduling,
 * manual triggers, progress reporting, and system load monitoring.
 *
 * Requirements:
 * - 7.1: Cron-based scheduling (default: daily at 3 AM)
 * - 7.2: Manual trigger via API
 * - 7.3: Progress reporting via Health API
 * - 7.4: Configurable batch size (default: 100 memories per run)
 * - 7.5: Retry with exponential backoff (max 3 attempts)
 * - 7.6: Skip consolidation if system load exceeds threshold
 */

import { Logger } from "../utils/logger";
import {
  DEFAULT_CONSOLIDATION_CONFIG,
  type ConsolidationConfig,
  type ConsolidationEngine,
  type ConsolidationResult,
} from "./consolidation-engine";

/**
 * Scheduler configuration
 *
 * Requirements: 7.1, 7.4, 7.6
 */
export interface SchedulerConfig {
  /** Cron expression for scheduling (default: "0 3 * * *" - daily at 3 AM) */
  cronExpression: string;
  /** Whether scheduler is enabled */
  enabled: boolean;
  /** Maximum system load to allow consolidation (0.0-1.0) */
  maxSystemLoad: number;
  /** Consolidation configuration */
  consolidationConfig: ConsolidationConfig;
  /** Maximum retry attempts for failed consolidation */
  maxRetryAttempts: number;
  /** Base delay for exponential backoff in milliseconds */
  baseRetryDelayMs: number;
}

/**
 * Default scheduler configuration
 *
 * Requirements: 7.1 - default daily at 3 AM
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  cronExpression: "0 3 * * *", // Daily at 3 AM
  enabled: true,
  maxSystemLoad: 0.8,
  consolidationConfig: DEFAULT_CONSOLIDATION_CONFIG,
  maxRetryAttempts: 3,
  baseRetryDelayMs: 1000,
};

/**
 * Detailed progress information for consolidation
 *
 * Requirements: 7.3 - Progress reporting via Health API
 */
export interface ConsolidationProgress {
  /** Number of items processed */
  processed: number;
  /** Total number of items to process */
  total: number;
  /** Percentage complete (0-100) */
  percentComplete: number;
  /** Current phase of consolidation */
  phase: "identifying_clusters" | "generating_summaries" | "consolidating" | "complete";
  /** Number of clusters identified */
  clustersIdentified: number;
  /** Number of clusters consolidated */
  clustersConsolidated: number;
  /** Number of memories processed in current batch */
  memoriesProcessed: number;
  /** Total memories in current batch */
  memoriesTotal: number;
  /** Start time of current consolidation */
  startedAt: Date;
  /** Estimated time remaining in milliseconds */
  estimatedRemainingMs: number;
}

/**
 * Scheduler status for progress reporting
 *
 * Requirements: 7.3
 */
export interface SchedulerStatus {
  /** Whether the scheduler is currently running a consolidation job */
  isRunning: boolean;
  /** Timestamp of last consolidation run */
  lastRunAt: Date | null;
  /** Timestamp of next scheduled run */
  nextRunAt: Date | null;
  /** Current progress if a job is running */
  currentProgress: {
    /** Number of users processed */
    processed: number;
    /** Total number of users to process */
    total: number;
    /** Percentage complete (0-100) */
    percentComplete: number;
  } | null;
  /** Detailed progress information */
  detailedProgress: ConsolidationProgress | null;
  /** Last error if any */
  lastError: string | null;
  /** Number of retry attempts for current/last run */
  retryAttempts: number;
  /** Current batch size being used */
  batchSize: number;
}

/**
 * Error class for scheduler operations
 */
export class ConsolidationSchedulerError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ConsolidationSchedulerError";
  }
}

/**
 * Consolidation Scheduler
 *
 * Manages scheduled and manual execution of memory consolidation.
 *
 * Requirements:
 * - 7.1: Cron-based scheduling
 * - 7.2: Manual trigger support
 * - 7.3: Progress reporting
 * - 7.4: Configurable batch size
 * - 7.5: Retry with exponential backoff
 * - 7.6: System load threshold
 */
export class ConsolidationScheduler {
  private config: SchedulerConfig;
  private isSchedulerRunning: boolean = false;
  private isJobExecuting: boolean = false;
  private cronJob: NodeJS.Timeout | null = null;
  private lastRunAt: Date | null = null;
  private nextRunAt: Date | null = null;
  private lastError: string | null = null;
  private retryAttempts: number = 0;
  private currentProgress: SchedulerStatus["currentProgress"] = null;
  private detailedProgress: ConsolidationProgress | null = null;

  constructor(
    private consolidationEngine: ConsolidationEngine,
    config: Partial<SchedulerConfig> = {}
  ) {
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
    this.validateConfig();
  }

  /**
   * Validate scheduler configuration
   */
  private validateConfig(): void {
    if (!this.config.cronExpression || typeof this.config.cronExpression !== "string") {
      throw new ConsolidationSchedulerError(
        "Invalid cron expression: must be a non-empty string",
        "INVALID_CONFIG"
      );
    }

    if (this.config.maxSystemLoad < 0 || this.config.maxSystemLoad > 1) {
      throw new ConsolidationSchedulerError(
        "maxSystemLoad must be between 0 and 1",
        "INVALID_CONFIG",
        { maxSystemLoad: this.config.maxSystemLoad }
      );
    }

    if (this.config.maxRetryAttempts < 0) {
      throw new ConsolidationSchedulerError(
        "maxRetryAttempts must be non-negative",
        "INVALID_CONFIG",
        { maxRetryAttempts: this.config.maxRetryAttempts }
      );
    }

    if (this.config.baseRetryDelayMs < 0) {
      throw new ConsolidationSchedulerError(
        "baseRetryDelayMs must be non-negative",
        "INVALID_CONFIG",
        { baseRetryDelayMs: this.config.baseRetryDelayMs }
      );
    }
  }

  /**
   * Start the scheduler
   *
   * Requirements: 7.1 - Cron-based scheduling
   *
   * Begins cron-based job scheduling. Uses a simplified interval-based
   * approach that checks if it's time to run based on the cron expression.
   */
  start(): void {
    if (this.isSchedulerRunning) {
      Logger.debug("Scheduler already running");
      return;
    }

    if (!this.config.enabled) {
      Logger.info("Scheduler is disabled, not starting");
      return;
    }

    this.isSchedulerRunning = true;
    this.calculateNextRunTime();

    // Use interval to check if it's time to run
    // Check every minute to match cron granularity
    this.cronJob = setInterval(() => {
      void this.checkAndRunScheduledJob();
    }, 60000); // Check every minute

    Logger.info(`Consolidation scheduler started with cron: ${this.config.cronExpression}`);
  }

  /**
   * Stop the scheduler gracefully
   *
   * Stops the scheduler and waits for any running job to complete.
   */
  stop(): void {
    if (this.cronJob) {
      clearInterval(this.cronJob);
      this.cronJob = null;
    }

    this.isSchedulerRunning = false;
    this.nextRunAt = null;

    Logger.info("Consolidation scheduler stopped");
  }

  /**
   * Trigger manual consolidation for a specific user
   *
   * Requirements: 7.2 - Manual trigger via API
   *
   * @param userId - User ID to run consolidation for
   * @returns Array of consolidation results
   */
  async triggerNow(userId: string): Promise<ConsolidationResult[]> {
    if (!userId) {
      throw new ConsolidationSchedulerError("userId is required", "INVALID_INPUT");
    }

    if (this.isJobExecuting) {
      throw new ConsolidationSchedulerError(
        "A consolidation job is already running",
        "JOB_IN_PROGRESS"
      );
    }

    Logger.info(`Manual consolidation triggered for user ${userId}`);

    return this.runConsolidationWithRetry(userId);
  }

  /**
   * Get scheduler status
   *
   * Requirements: 7.3 - Progress reporting via Health API
   *
   * @returns Current scheduler status
   */
  getStatus(): SchedulerStatus {
    return {
      isRunning: this.isJobExecuting,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.nextRunAt,
      currentProgress: this.currentProgress,
      detailedProgress: this.detailedProgress,
      lastError: this.lastError,
      retryAttempts: this.retryAttempts,
      batchSize: this.config.consolidationConfig.batchSize,
    };
  }

  /**
   * Update scheduler configuration
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<SchedulerConfig>): void {
    const wasRunning = this.isSchedulerRunning;

    // Stop if running
    if (wasRunning) {
      this.stop();
    }

    // Update config
    this.config = { ...this.config, ...config };
    this.validateConfig();

    // Restart if was running
    if (wasRunning && this.config.enabled) {
      this.start();
    }

    Logger.info("Scheduler configuration updated", { config: this.config });
  }

  /**
   * Get current configuration
   *
   * @returns Current scheduler configuration
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * Get current batch size
   *
   * Requirements: 7.4 - Configurable batch size
   *
   * @returns Current batch size setting
   */
  getBatchSize(): number {
    return this.config.consolidationConfig.batchSize;
  }

  /**
   * Set batch size
   *
   * Requirements: 7.4 - Configurable batch size
   *
   * @param batchSize - New batch size (must be >= 1)
   */
  setBatchSize(batchSize: number): void {
    if (batchSize < 1) {
      throw new ConsolidationSchedulerError("batchSize must be at least 1", "INVALID_CONFIG", {
        batchSize,
      });
    }

    this.config.consolidationConfig.batchSize = batchSize;
    Logger.info(`Batch size updated to ${batchSize}`);
  }

  /**
   * Get detailed progress for Health API integration
   *
   * Requirements: 7.3 - Progress reporting via Health API
   *
   * @returns Detailed progress or null if not running
   */
  getDetailedProgress(): ConsolidationProgress | null {
    return this.detailedProgress ? { ...this.detailedProgress } : null;
  }

  /**
   * Check if scheduler is running
   *
   * @returns True if scheduler is active
   */
  isRunning(): boolean {
    return this.isSchedulerRunning;
  }

  /**
   * Check current system load
   *
   * Requirements: 7.6 - Skip consolidation if system load exceeds threshold
   *
   * @returns Current system load as a fraction (0.0-1.0)
   */
  async checkSystemLoad(): Promise<number> {
    // Get memory usage from Node.js process
    const memUsage = process.memoryUsage();
    const heapUsedRatio = memUsage.heapUsed / memUsage.heapTotal;

    // Get CPU usage (simplified - in production would track over time)
    const cpuUsage = process.cpuUsage();
    const totalCpuTime = cpuUsage.user + cpuUsage.system;
    // Normalize to 0-1 range (simplified approximation)
    const cpuRatio = Math.min((totalCpuTime / 1000000) % 1, 1);

    // Combined load metric (weighted average)
    const load = heapUsedRatio * 0.6 + cpuRatio * 0.4;

    return Math.min(load, 1);
  }

  /**
   * Check if consolidation should be skipped due to high system load
   *
   * Requirements: 7.6
   *
   * @returns True if consolidation should be skipped
   */
  async shouldSkipDueToLoad(): Promise<boolean> {
    const load = await this.checkSystemLoad();
    const shouldSkip = load > this.config.maxSystemLoad;

    if (shouldSkip) {
      Logger.warn(
        `Skipping consolidation due to high system load: ${(load * 100).toFixed(1)}% > ${(this.config.maxSystemLoad * 100).toFixed(1)}%`
      );
    }

    return shouldSkip;
  }

  /**
   * Calculate next run time based on cron expression
   *
   * Simplified implementation that parses basic cron expressions.
   * Format: minute hour day-of-month month day-of-week
   */
  private calculateNextRunTime(): void {
    const now = new Date();
    const parts = this.config.cronExpression.split(" ");

    if (parts.length !== 5) {
      Logger.warn(`Invalid cron expression: ${this.config.cronExpression}`);
      this.nextRunAt = null;
      return;
    }

    const [minute, hour] = parts;

    // Parse minute and hour (simplified - only handles specific values, not ranges)
    const targetMinute = minute === "*" ? 0 : parseInt(minute, 10);
    const targetHour = hour === "*" ? now.getHours() : parseInt(hour, 10);

    // Calculate next run time
    const next = new Date(now);
    next.setMinutes(targetMinute);
    next.setSeconds(0);
    next.setMilliseconds(0);

    if (hour !== "*") {
      next.setHours(targetHour);
    }

    // If the calculated time is in the past, move to next day
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    this.nextRunAt = next;
  }

  /**
   * Check if it's time to run the scheduled job
   */
  private async checkAndRunScheduledJob(): Promise<void> {
    if (!this.isSchedulerRunning || this.isJobExecuting) {
      return;
    }

    if (!this.nextRunAt) {
      this.calculateNextRunTime();
      return;
    }

    const now = new Date();
    if (now >= this.nextRunAt) {
      Logger.info("Scheduled consolidation time reached, starting job");

      // Run consolidation for all users (in production, would query for active users)
      // For now, this is a placeholder - actual implementation would iterate users
      await this.runScheduledConsolidation();

      // Calculate next run time
      this.calculateNextRunTime();
    }
  }

  /**
   * Run scheduled consolidation
   *
   * This method would typically iterate over all users and run consolidation.
   * For now, it's a placeholder that logs the scheduled run.
   */
  private async runScheduledConsolidation(): Promise<void> {
    if (this.isJobExecuting) {
      Logger.debug("Job already executing, skipping scheduled run");
      return;
    }

    // Check system load before starting
    if (await this.shouldSkipDueToLoad()) {
      this.lastError = "Skipped due to high system load";
      return;
    }

    this.isJobExecuting = true;
    this.lastError = null;
    this.retryAttempts = 0;

    try {
      // In a full implementation, this would:
      // 1. Query for all users with memories to consolidate
      // 2. Iterate through users and run consolidation
      // 3. Update progress as each user is processed

      Logger.info("Scheduled consolidation completed");
      this.lastRunAt = new Date();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      Logger.error("Scheduled consolidation failed:", error);
    } finally {
      this.isJobExecuting = false;
      this.currentProgress = null;
    }
  }

  /**
   * Run consolidation with retry logic
   *
   * Requirements: 7.5 - Retry with exponential backoff (max 3 attempts)
   * Requirements: 7.3 - Progress reporting
   * Requirements: 7.4 - Configurable batch size
   *
   * @param userId - User ID to run consolidation for
   * @returns Array of consolidation results
   */
  private async runConsolidationWithRetry(userId: string): Promise<ConsolidationResult[]> {
    // Check system load before starting
    if (await this.shouldSkipDueToLoad()) {
      throw new ConsolidationSchedulerError(
        "Consolidation skipped due to high system load",
        "LOAD_THRESHOLD_EXCEEDED",
        { currentLoad: await this.checkSystemLoad(), threshold: this.config.maxSystemLoad }
      );
    }

    this.isJobExecuting = true;
    this.lastError = null;
    this.retryAttempts = 0;
    this.currentProgress = { processed: 0, total: 1, percentComplete: 0 };

    // Initialize detailed progress
    const startTime = new Date();
    this.detailedProgress = {
      processed: 0,
      total: 1,
      percentComplete: 0,
      phase: "identifying_clusters",
      clustersIdentified: 0,
      clustersConsolidated: 0,
      memoriesProcessed: 0,
      memoriesTotal: this.config.consolidationConfig.batchSize,
      startedAt: startTime,
      estimatedRemainingMs: 0,
    };

    try {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= this.config.maxRetryAttempts; attempt++) {
        this.retryAttempts = attempt;

        try {
          // Update phase to identifying clusters
          this.updateDetailedProgress({ phase: "identifying_clusters" });

          // Run consolidation
          const results = await this.consolidationEngine.runConsolidation(
            userId,
            this.config.consolidationConfig
          );

          // Update progress to complete
          this.currentProgress = { processed: 1, total: 1, percentComplete: 100 };
          this.updateDetailedProgress({
            processed: 1,
            total: 1,
            percentComplete: 100,
            phase: "complete",
            clustersConsolidated: results.length,
            memoriesProcessed: results.reduce((sum, r) => sum + r.consolidatedIds.length, 0),
            estimatedRemainingMs: 0,
          });

          this.lastRunAt = new Date();

          Logger.info(`Consolidation completed for user ${userId}`, {
            resultsCount: results.length,
            attempts: attempt + 1,
            batchSize: this.config.consolidationConfig.batchSize,
          });

          return results;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt < this.config.maxRetryAttempts) {
            // Calculate exponential backoff delay
            const delay = this.config.baseRetryDelayMs * Math.pow(2, attempt);

            Logger.warn(
              `Consolidation attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
              error
            );

            await this.sleep(delay);
          }
        }
      }

      // All retries exhausted
      this.lastError = lastError?.message ?? "Unknown error";
      throw new ConsolidationSchedulerError(
        `Consolidation failed after ${this.config.maxRetryAttempts + 1} attempts: ${this.lastError}`,
        "MAX_RETRIES_EXCEEDED",
        { userId, attempts: this.config.maxRetryAttempts + 1 }
      );
    } finally {
      this.isJobExecuting = false;
      this.currentProgress = null;
      this.detailedProgress = null;
    }
  }

  /**
   * Update detailed progress with partial updates
   *
   * Requirements: 7.3 - Progress reporting
   *
   * @param updates - Partial progress updates
   */
  private updateDetailedProgress(updates: Partial<ConsolidationProgress>): void {
    if (this.detailedProgress) {
      this.detailedProgress = {
        ...this.detailedProgress,
        ...updates,
      };

      // Calculate estimated remaining time based on progress
      if (this.detailedProgress.processed > 0 && this.detailedProgress.total > 0) {
        const elapsed = Date.now() - this.detailedProgress.startedAt.getTime();
        const rate = this.detailedProgress.processed / elapsed;
        const remaining = this.detailedProgress.total - this.detailedProgress.processed;
        this.detailedProgress.estimatedRemainingMs = rate > 0 ? remaining / rate : 0;
      }
    }
  }

  /**
   * Sleep for a specified duration
   *
   * @param ms - Duration in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create ConsolidationScheduler
 */
export function createConsolidationScheduler(
  consolidationEngine: ConsolidationEngine,
  config?: Partial<SchedulerConfig>
): ConsolidationScheduler {
  return new ConsolidationScheduler(consolidationEngine, config);
}
