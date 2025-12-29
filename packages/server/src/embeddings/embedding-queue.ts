/**
 * Embedding Job Queue
 *
 * Manages background embedding generation with retry logic and exponential backoff.
 * Provides a queue-based approach for asynchronous embedding generation to improve
 * memory creation responsiveness.
 *
 * Requirements: 8.2, 8.5
 */

import { Logger } from "../utils/logger.js";

/**
 * Embedding job status
 */
export type EmbeddingJobStatus = "pending" | "processing" | "complete" | "failed";

/**
 * Embedding job interface
 * Requirements: 8.2
 */
export interface EmbeddingJob {
  /** Unique job identifier */
  id: string;
  /** Memory ID to generate embeddings for */
  memoryId: string;
  /** Memory content to embed */
  content: string;
  /** Primary sector for the memory */
  sector: string;
  /** Current attempt number (1-based) */
  attempt: number;
  /** Job status */
  status: EmbeddingJobStatus;
  /** Timestamp when job was created */
  createdAt: Date;
  /** Timestamp when job was last updated */
  updatedAt: Date;
  /** Error message if job failed */
  error?: string;
  /** User ID for the memory owner */
  userId: string;
}

/**
 * Embedding queue configuration
 */
export interface EmbeddingQueueConfig {
  /** Maximum retry attempts (default: 3) */
  maxRetries: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelayMs: number;
  /** Maximum concurrent jobs (default: 5) */
  maxConcurrent: number;
  /** Job timeout in ms (default: 30000) */
  jobTimeoutMs: number;
}

/**
 * Default queue configuration
 */
export const DEFAULT_QUEUE_CONFIG: EmbeddingQueueConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxConcurrent: 5,
  jobTimeoutMs: 30000,
};

/**
 * Callback for when embeddings are generated
 */
export type EmbeddingCompleteCallback = (
  memoryId: string,
  userId: string,
  success: boolean,
  error?: string
) => Promise<void>;

/**
 * Embedding generator function type
 */
export type EmbeddingGenerator = (
  memoryId: string,
  content: string,
  sector: string
) => Promise<void>;

/**
 * Embedding Job Queue
 *
 * Manages background embedding generation with:
 * - Queue-based job processing
 * - Retry with exponential backoff (3 attempts, 1s base delay)
 * - Concurrent job limiting
 * - Job status tracking
 *
 * Requirements: 8.2, 8.5
 */
export class EmbeddingQueue {
  private queue: Map<string, EmbeddingJob> = new Map();
  private pendingJobs: string[] = [];
  private processingCount: number = 0;
  private config: EmbeddingQueueConfig;
  private generator: EmbeddingGenerator | null = null;
  private onComplete: EmbeddingCompleteCallback | null = null;
  private isProcessing: boolean = false;
  private processingPromise: Promise<void> | null = null;

  constructor(config: Partial<EmbeddingQueueConfig> = {}) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
  }

  /**
   * Set the embedding generator function
   * This is called to actually generate embeddings for a job
   */
  setGenerator(generator: EmbeddingGenerator): void {
    this.generator = generator;
  }

  /**
   * Set the completion callback
   * Called when a job completes (success or failure after all retries)
   */
  setOnComplete(callback: EmbeddingCompleteCallback): void {
    this.onComplete = callback;
  }

  /**
   * Enqueue a new embedding job
   * Requirements: 8.2
   *
   * @param memoryId - Memory ID to generate embeddings for
   * @param content - Memory content to embed
   * @param sector - Primary sector for the memory
   * @param userId - User ID for the memory owner
   * @returns Job ID
   */
  enqueue(memoryId: string, content: string, sector: string, userId: string): string {
    const jobId = `emb-${memoryId}-${Date.now()}`;
    const now = new Date();

    const job: EmbeddingJob = {
      id: jobId,
      memoryId,
      content,
      sector,
      attempt: 0,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      userId,
    };

    this.queue.set(jobId, job);
    this.pendingJobs.push(jobId);

    Logger.debug(`Enqueued embedding job ${jobId} for memory ${memoryId}`);

    // Start processing if not already running
    this.startProcessing();

    return jobId;
  }

  /**
   * Get the status of a specific job
   *
   * @param jobId - Job ID to check
   * @returns Job status or null if not found
   */
  getStatus(jobId: string): EmbeddingJob | null {
    return this.queue.get(jobId) ?? null;
  }

  /**
   * Get the status of a job by memory ID
   *
   * @param memoryId - Memory ID to check
   * @returns Job status or null if not found
   */
  getStatusByMemoryId(memoryId: string): EmbeddingJob | null {
    for (const job of this.queue.values()) {
      if (job.memoryId === memoryId) {
        return job;
      }
    }
    return null;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    pending: number;
    processing: number;
    complete: number;
    failed: number;
    total: number;
  } {
    let pending = 0;
    let processing = 0;
    let complete = 0;
    let failed = 0;

    for (const job of this.queue.values()) {
      switch (job.status) {
        case "pending":
          pending++;
          break;
        case "processing":
          processing++;
          break;
        case "complete":
          complete++;
          break;
        case "failed":
          failed++;
          break;
      }
    }

    return {
      pending,
      processing,
      complete,
      failed,
      total: this.queue.size,
    };
  }

  /**
   * Start the processing loop if not already running
   */
  private startProcessing(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.processingPromise = this.processLoop();
  }

  /**
   * Main processing loop
   */
  private async processLoop(): Promise<void> {
    while (this.pendingJobs.length > 0 || this.processingCount > 0) {
      // Process jobs up to max concurrent limit
      while (this.pendingJobs.length > 0 && this.processingCount < this.config.maxConcurrent) {
        const jobId = this.pendingJobs.shift();
        if (jobId) {
          // Don't await - process concurrently
          void this.processJob(jobId);
        }
      }

      // Wait a bit before checking again
      await this.sleep(100);
    }

    this.isProcessing = false;
    this.processingPromise = null;
  }

  /**
   * Process a single job with retry logic
   * Requirements: 8.5
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.queue.get(jobId);
    if (!job) {
      return;
    }

    this.processingCount++;
    job.status = "processing";
    job.attempt++;
    job.updatedAt = new Date();

    Logger.debug(
      `Processing embedding job ${jobId} (attempt ${job.attempt}/${this.config.maxRetries})`
    );

    try {
      if (!this.generator) {
        throw new Error("No embedding generator configured");
      }

      // Generate embeddings with timeout
      await this.withTimeout(
        this.generator(job.memoryId, job.content, job.sector),
        this.config.jobTimeoutMs
      );

      // Success
      job.status = "complete";
      job.updatedAt = new Date();
      Logger.debug(`Embedding job ${jobId} completed successfully`);

      // Notify completion
      if (this.onComplete) {
        await this.onComplete(job.memoryId, job.userId, true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      job.error = errorMessage;
      job.updatedAt = new Date();

      Logger.warn(`Embedding job ${jobId} failed (attempt ${job.attempt}): ${errorMessage}`);

      // Check if we should retry
      if (job.attempt < this.config.maxRetries) {
        // Calculate exponential backoff delay
        const delay = this.calculateBackoffDelay(job.attempt);
        Logger.debug(`Retrying job ${jobId} in ${delay}ms`);

        // Reset status to pending and re-queue after delay
        job.status = "pending";
        await this.sleep(delay);
        this.pendingJobs.push(jobId);
      } else {
        // Max retries exceeded
        job.status = "failed";
        Logger.error(`Embedding job ${jobId} failed after ${this.config.maxRetries} attempts`);

        // Notify failure
        if (this.onComplete) {
          await this.onComplete(job.memoryId, job.userId, false, errorMessage);
        }
      }
    } finally {
      this.processingCount--;
    }
  }

  /**
   * Calculate exponential backoff delay
   * Requirements: 8.5
   *
   * @param attempt - Current attempt number (1-based)
   * @returns Delay in milliseconds
   */
  calculateBackoffDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^(attempt-1)
    // Attempt 1: 1000ms, Attempt 2: 2000ms, Attempt 3: 4000ms
    return this.config.baseDelayMs * Math.pow(2, attempt - 1);
  }

  /**
   * Execute a promise with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      return result;
    } catch (error) {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      throw error;
    }
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear completed and failed jobs from the queue
   * Useful for memory management
   */
  clearFinishedJobs(): number {
    let cleared = 0;
    for (const [jobId, job] of this.queue) {
      if (job.status === "complete" || job.status === "failed") {
        this.queue.delete(jobId);
        cleared++;
      }
    }
    Logger.debug(`Cleared ${cleared} finished jobs from queue`);
    return cleared;
  }

  /**
   * Wait for all pending jobs to complete
   * Useful for testing and graceful shutdown
   */
  async waitForCompletion(): Promise<void> {
    if (this.processingPromise) {
      await this.processingPromise;
    }
  }

  /**
   * Get the number of pending jobs
   */
  getPendingCount(): number {
    return this.pendingJobs.length;
  }

  /**
   * Get the number of currently processing jobs
   */
  getProcessingCount(): number {
    return this.processingCount;
  }

  /**
   * Check if the queue is currently processing
   */
  isQueueProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Clear all jobs from the queue
   * Warning: This will cancel all pending jobs
   */
  clear(): void {
    this.queue.clear();
    this.pendingJobs = [];
    Logger.debug("Embedding queue cleared");
  }
}
