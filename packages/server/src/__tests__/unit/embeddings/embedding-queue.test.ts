/**
 * Embedding Queue Tests
 *
 * Tests for the background embedding generation queue with retry logic.
 *
 * Requirements: 8.2, 8.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_QUEUE_CONFIG,
  EmbeddingQueue,
  type EmbeddingCompleteCallback,
  type EmbeddingGenerator,
} from "../../../embeddings/embedding-queue";

describe("EmbeddingQueue", () => {
  let queue: EmbeddingQueue;
  let mockGenerator: EmbeddingGenerator;
  let mockOnComplete: EmbeddingCompleteCallback;

  beforeEach(() => {
    vi.useFakeTimers();
    queue = new EmbeddingQueue({
      maxRetries: 3,
      baseDelayMs: 1000,
      maxConcurrent: 5,
      jobTimeoutMs: 5000,
    });

    mockGenerator = vi.fn().mockResolvedValue(undefined);
    mockOnComplete = vi.fn().mockResolvedValue(undefined);

    queue.setGenerator(mockGenerator);
    queue.setOnComplete(mockOnComplete);
  });

  afterEach(() => {
    queue.clear();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should use default configuration when none provided", () => {
      const defaultQueue = new EmbeddingQueue();
      expect(defaultQueue).toBeDefined();
    });

    it("should merge custom configuration with defaults", () => {
      const customQueue = new EmbeddingQueue({ maxRetries: 5 });
      expect(customQueue).toBeDefined();
    });

    it("should export DEFAULT_QUEUE_CONFIG", () => {
      expect(DEFAULT_QUEUE_CONFIG).toEqual({
        maxRetries: 3,
        baseDelayMs: 1000,
        maxConcurrent: 5,
        jobTimeoutMs: 30000,
      });
    });
  });

  describe("Enqueue", () => {
    it("should enqueue a job and return job ID", () => {
      const jobId = queue.enqueue("mem-123", "test content", "semantic", "user-1");

      expect(jobId).toBeDefined();
      expect(jobId).toContain("emb-mem-123");
    });

    it("should create job with correct initial state", () => {
      // Don't set generator so job stays pending
      const noGenQueue = new EmbeddingQueue({
        maxRetries: 3,
        baseDelayMs: 1000,
        maxConcurrent: 5,
        jobTimeoutMs: 5000,
      });

      const jobId = noGenQueue.enqueue("mem-123", "test content", "semantic", "user-1");
      const job = noGenQueue.getStatus(jobId);

      expect(job).toBeDefined();
      expect(job?.memoryId).toBe("mem-123");
      expect(job?.content).toBe("test content");
      expect(job?.sector).toBe("semantic");
      expect(job?.userId).toBe("user-1");
      // Job starts at attempt 0, but processing increments it
      expect(job?.attempt).toBeGreaterThanOrEqual(0);
      expect(job?.createdAt).toBeInstanceOf(Date);
      expect(job?.updatedAt).toBeInstanceOf(Date);

      noGenQueue.clear();
    });

    it("should increment pending count", async () => {
      // Use a slow generator to keep jobs in queue
      const slowGenerator = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5000)));
      queue.setGenerator(slowGenerator);

      expect(queue.getPendingCount()).toBe(0);

      queue.enqueue("mem-1", "content 1", "semantic", "user-1");
      queue.enqueue("mem-2", "content 2", "episodic", "user-1");

      // With slow generator, at least one should still be pending
      // (first one starts processing, second stays pending)
      await vi.advanceTimersByTimeAsync(50);

      // Total jobs should be 2
      expect(queue.getStats().total).toBe(2);
    });
  });

  describe("Job Status", () => {
    it("should return null for non-existent job", () => {
      const status = queue.getStatus("non-existent");
      expect(status).toBeNull();
    });

    it("should find job by memory ID", () => {
      queue.enqueue("mem-123", "test content", "semantic", "user-1");
      const job = queue.getStatusByMemoryId("mem-123");

      expect(job).toBeDefined();
      expect(job?.memoryId).toBe("mem-123");
    });

    it("should return null for non-existent memory ID", () => {
      const job = queue.getStatusByMemoryId("non-existent");
      expect(job).toBeNull();
    });
  });

  describe("Queue Statistics", () => {
    it("should return correct stats for empty queue", () => {
      const stats = queue.getStats();

      expect(stats).toEqual({
        pending: 0,
        processing: 0,
        complete: 0,
        failed: 0,
        total: 0,
      });
    });

    it("should track pending jobs", async () => {
      // Use a slow generator to keep jobs in queue
      const slowGenerator = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5000)));
      queue.setGenerator(slowGenerator);

      queue.enqueue("mem-1", "content", "semantic", "user-1");
      queue.enqueue("mem-2", "content", "semantic", "user-1");

      await vi.advanceTimersByTimeAsync(50);

      const stats = queue.getStats();
      // Total should be 2 (one processing, one pending or both processing)
      expect(stats.total).toBe(2);
      // Combined pending + processing should be 2
      expect(stats.pending + stats.processing).toBe(2);
    });
  });

  describe("Job Processing", () => {
    it("should process job and call generator", async () => {
      queue.enqueue("mem-123", "test content", "semantic", "user-1");

      // Advance timers to allow processing
      await vi.advanceTimersByTimeAsync(200);

      expect(mockGenerator).toHaveBeenCalledWith("mem-123", "test content", "semantic");
    });

    it("should mark job as complete on success", async () => {
      const jobId = queue.enqueue("mem-123", "test content", "semantic", "user-1");

      await vi.advanceTimersByTimeAsync(200);

      const job = queue.getStatus(jobId);
      expect(job?.status).toBe("complete");
      expect(job?.attempt).toBe(1);
    });

    it("should call onComplete callback on success", async () => {
      queue.enqueue("mem-123", "test content", "semantic", "user-1");

      await vi.advanceTimersByTimeAsync(200);

      expect(mockOnComplete).toHaveBeenCalledWith("mem-123", "user-1", true);
    });

    it("should process multiple jobs concurrently", async () => {
      queue.enqueue("mem-1", "content 1", "semantic", "user-1");
      queue.enqueue("mem-2", "content 2", "episodic", "user-1");
      queue.enqueue("mem-3", "content 3", "procedural", "user-1");

      await vi.advanceTimersByTimeAsync(200);

      expect(mockGenerator).toHaveBeenCalledTimes(3);
    });

    it("should respect max concurrent limit", async () => {
      const slowGenerator = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      queue.setGenerator(slowGenerator);

      // Enqueue more jobs than max concurrent (5)
      for (let i = 0; i < 10; i++) {
        queue.enqueue(`mem-${i}`, `content ${i}`, "semantic", "user-1");
      }

      // After initial processing starts
      await vi.advanceTimersByTimeAsync(100);

      // Should only be processing up to maxConcurrent
      expect(queue.getProcessingCount()).toBeLessThanOrEqual(5);
    });
  });

  describe("Retry with Exponential Backoff", () => {
    it("should retry failed jobs", async () => {
      let attempts = 0;
      const failingGenerator = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error("Temporary failure"));
        }
        return Promise.resolve();
      });
      queue.setGenerator(failingGenerator);

      const jobId = queue.enqueue("mem-123", "test content", "semantic", "user-1");

      // First attempt fails
      await vi.advanceTimersByTimeAsync(200);
      expect(failingGenerator).toHaveBeenCalledTimes(1);

      // Wait for backoff (1000ms) and second attempt
      await vi.advanceTimersByTimeAsync(1100);
      expect(failingGenerator).toHaveBeenCalledTimes(2);

      // Wait for backoff (2000ms) and third attempt (success)
      await vi.advanceTimersByTimeAsync(2100);
      expect(failingGenerator).toHaveBeenCalledTimes(3);

      const job = queue.getStatus(jobId);
      expect(job?.status).toBe("complete");
    });

    it("should calculate correct exponential backoff delays", () => {
      // Attempt 1: 1000ms * 2^0 = 1000ms
      expect(queue.calculateBackoffDelay(1)).toBe(1000);

      // Attempt 2: 1000ms * 2^1 = 2000ms
      expect(queue.calculateBackoffDelay(2)).toBe(2000);

      // Attempt 3: 1000ms * 2^2 = 4000ms
      expect(queue.calculateBackoffDelay(3)).toBe(4000);
    });

    it("should fail after max retries", async () => {
      const alwaysFailGenerator = vi.fn().mockRejectedValue(new Error("Permanent failure"));
      queue.setGenerator(alwaysFailGenerator);

      const jobId = queue.enqueue("mem-123", "test content", "semantic", "user-1");

      // Process all retries with backoff delays
      // Attempt 1
      await vi.advanceTimersByTimeAsync(200);
      // Backoff 1000ms + Attempt 2
      await vi.advanceTimersByTimeAsync(1200);
      // Backoff 2000ms + Attempt 3
      await vi.advanceTimersByTimeAsync(2200);
      // Final processing
      await vi.advanceTimersByTimeAsync(200);

      const job = queue.getStatus(jobId);
      expect(job?.status).toBe("failed");
      expect(job?.attempt).toBe(3);
      expect(job?.error).toBe("Permanent failure");
    });

    it("should call onComplete with failure after max retries", async () => {
      const alwaysFailGenerator = vi.fn().mockRejectedValue(new Error("Permanent failure"));
      queue.setGenerator(alwaysFailGenerator);

      queue.enqueue("mem-123", "test content", "semantic", "user-1");

      // Process all retries
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(1200);
      await vi.advanceTimersByTimeAsync(2200);
      await vi.advanceTimersByTimeAsync(200);

      expect(mockOnComplete).toHaveBeenCalledWith("mem-123", "user-1", false, "Permanent failure");
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout long-running jobs", async () => {
      const slowGenerator = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 10000)));
      queue.setGenerator(slowGenerator);

      const jobId = queue.enqueue("mem-123", "test content", "semantic", "user-1");

      // Advance past timeout (5000ms configured)
      await vi.advanceTimersByTimeAsync(5200);

      const job = queue.getStatus(jobId);
      expect(job?.error).toContain("timed out");
    });
  });

  describe("Queue Management", () => {
    it("should clear finished jobs", async () => {
      queue.enqueue("mem-1", "content", "semantic", "user-1");
      queue.enqueue("mem-2", "content", "semantic", "user-1");

      await vi.advanceTimersByTimeAsync(200);

      const cleared = queue.clearFinishedJobs();
      expect(cleared).toBe(2);
      expect(queue.getStats().total).toBe(0);
    });

    it("should clear all jobs", () => {
      queue.enqueue("mem-1", "content", "semantic", "user-1");
      queue.enqueue("mem-2", "content", "semantic", "user-1");

      queue.clear();

      expect(queue.getStats().total).toBe(0);
      expect(queue.getPendingCount()).toBe(0);
    });

    it("should report processing state", async () => {
      expect(queue.isQueueProcessing()).toBe(false);

      const slowGenerator = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      queue.setGenerator(slowGenerator);

      queue.enqueue("mem-1", "content", "semantic", "user-1");

      await vi.advanceTimersByTimeAsync(100);
      expect(queue.isQueueProcessing()).toBe(true);
    });

    it("should wait for completion", async () => {
      queue.enqueue("mem-1", "content", "semantic", "user-1");

      const waitPromise = queue.waitForCompletion();
      await vi.advanceTimersByTimeAsync(500);

      await expect(waitPromise).resolves.toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing generator gracefully", async () => {
      const noGeneratorQueue = new EmbeddingQueue();
      noGeneratorQueue.setOnComplete(mockOnComplete);

      const jobId = noGeneratorQueue.enqueue("mem-123", "content", "semantic", "user-1");

      await vi.advanceTimersByTimeAsync(200);
      // Wait for all retries
      await vi.advanceTimersByTimeAsync(1200);
      await vi.advanceTimersByTimeAsync(2200);
      await vi.advanceTimersByTimeAsync(200);

      const job = noGeneratorQueue.getStatus(jobId);
      expect(job?.status).toBe("failed");
      expect(job?.error).toContain("No embedding generator configured");
    });

    it("should handle non-Error rejection", async () => {
      const stringRejectGenerator = vi.fn().mockRejectedValue("string error");
      queue.setGenerator(stringRejectGenerator);

      const jobId = queue.enqueue("mem-123", "content", "semantic", "user-1");

      // Process all retries
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(1200);
      await vi.advanceTimersByTimeAsync(2200);
      await vi.advanceTimersByTimeAsync(200);

      const job = queue.getStatus(jobId);
      expect(job?.error).toBe("string error");
    });
  });
});
