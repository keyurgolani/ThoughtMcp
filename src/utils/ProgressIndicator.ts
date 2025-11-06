/**
 * Progress indicator utilities for long-running operations
 * Provides user feedback during processing
 *
 * Note: This file uses 'any' types for flexible progress tracking across different operations.
 * The progress tracking system needs to handle diverse operation types dynamically.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Logger } from "./logger.js";

export interface ProgressUpdate {
  stage: string;
  progress: number; // 0-1
  message: string;
  details?: string;
  timestamp: number;
}

export interface ProgressOptions {
  enableLogging?: boolean;
  logLevel?: "info" | "debug";
  component?: string;
}

export class ProgressIndicator {
  private static logger = Logger.getInstance();
  private updates: ProgressUpdate[] = [];
  private startTime: number;
  private options: ProgressOptions;

  constructor(options: ProgressOptions = {}) {
    this.startTime = Date.now();
    this.options = {
      enableLogging: true,
      logLevel: "info",
      component: "ProgressIndicator",
      ...options,
    };
  }

  /**
   * Update progress with a new stage
   */
  updateProgress(
    stage: string,
    progress: number,
    message: string,
    details?: string
  ): void {
    const update: ProgressUpdate = {
      stage,
      progress: Math.max(0, Math.min(1, progress)), // Clamp between 0-1
      message,
      details,
      timestamp: Date.now(),
    };

    this.updates.push(update);

    if (this.options.enableLogging) {
      const elapsed = Date.now() - this.startTime;
      const progressPercent = Math.round(progress * 100);

      const logMessage = `[${progressPercent}%] ${stage}: ${message}${
        details ? ` (${details})` : ""
      } [${elapsed}ms elapsed]`;

      if (this.options.logLevel === "debug") {
        ProgressIndicator.logger.debug(
          this.options.component ?? "ProgressIndicator",
          logMessage
        );
      } else {
        ProgressIndicator.logger.info(
          this.options.component ?? "ProgressIndicator",
          logMessage
        );
      }
    }
  }

  /**
   * Get current progress state
   */
  getCurrentProgress(): ProgressUpdate | null {
    return this.updates.length > 0
      ? this.updates[this.updates.length - 1]
      : null;
  }

  /**
   * Get all progress updates
   */
  getAllUpdates(): ProgressUpdate[] {
    return [...this.updates];
  }

  /**
   * Get progress summary
   */
  getSummary(): {
    totalStages: number;
    currentStage: string;
    overallProgress: number;
    elapsedTime: number;
    estimatedTimeRemaining?: number;
  } {
    const current = this.getCurrentProgress();
    const elapsed = Date.now() - this.startTime;

    let estimatedTimeRemaining: number | undefined;
    if (current && current.progress > 0) {
      const totalEstimated = elapsed / current.progress;
      estimatedTimeRemaining = Math.max(0, totalEstimated - elapsed);
    }

    return {
      totalStages: this.updates.length,
      currentStage: current?.stage ?? "Not started",
      overallProgress: current?.progress ?? 0,
      elapsedTime: elapsed,
      estimatedTimeRemaining,
    };
  }

  /**
   * Create a user-friendly progress message
   */
  getProgressMessage(): string {
    const current = this.getCurrentProgress();
    if (!current) {
      return "🚀 Starting processing...";
    }

    const percent = Math.round(current.progress * 100);
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);

    let emoji = "⏳";
    if (current.progress >= 1.0) {
      emoji = "✅";
    } else if (current.progress >= 0.8) {
      emoji = "🏁";
    } else if (current.progress >= 0.5) {
      emoji = "⚡";
    }

    return `${emoji} ${current.stage}: ${current.message} (${percent}% complete, ${elapsed}s elapsed)`;
  }

  /**
   * Create progress bar visualization
   */
  getProgressBar(width: number = 20): string {
    const current = this.getCurrentProgress();
    if (!current) {
      return `[${"·".repeat(width)}] 0%`;
    }

    const filled = Math.round(current.progress * width);
    const empty = width - filled;
    const bar = "█".repeat(filled) + "·".repeat(empty);
    const percent = Math.round(current.progress * 100);

    return `[${bar}] ${percent}%`;
  }

  /**
   * Reset progress tracking
   */
  reset(): void {
    this.updates = [];
    this.startTime = Date.now();
  }

  /**
   * Mark as completed
   */
  complete(message: string = "Processing completed"): void {
    this.updateProgress("Completed", 1.0, message);
  }

  /**
   * Create a progress indicator for common cognitive operations
   */
  static createForThinking(): ProgressIndicator {
    return new ProgressIndicator({
      component: "ThinkingProcess",
      enableLogging: true,
      logLevel: "info",
    });
  }

  static createForMemoryOperation(): ProgressIndicator {
    return new ProgressIndicator({
      component: "MemoryOperation",
      enableLogging: true,
      logLevel: "debug",
    });
  }

  static createForSystematicThinking(): ProgressIndicator {
    return new ProgressIndicator({
      component: "SystematicThinking",
      enableLogging: true,
      logLevel: "info",
    });
  }

  /**
   * Utility to track progress through multiple async operations
   */
  static async trackMultipleOperations<T>(
    operations: Array<{
      name: string;
      operation: () => Promise<T>;
      weight?: number; // Relative weight for progress calculation
    }>,
    onProgress?: (update: ProgressUpdate) => void
  ): Promise<T[]> {
    const indicator = new ProgressIndicator({
      component: "MultipleOperations",
      enableLogging: true,
    });

    const totalWeight = operations.reduce(
      (sum, op) => sum + (op.weight ?? 1),
      0
    );
    const results: T[] = [];
    let completedWeight = 0;

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const weight = op.weight ?? 1;

      indicator.updateProgress(
        `Operation ${i + 1}/${operations.length}`,
        completedWeight / totalWeight,
        `Starting: ${op.name}`
      );

      if (onProgress) {
        const progress = indicator.getCurrentProgress();
        if (progress) {
          onProgress(progress);
        }
      }

      try {
        const result = await op.operation();
        results.push(result);
        completedWeight += weight;

        indicator.updateProgress(
          `Operation ${i + 1}/${operations.length}`,
          completedWeight / totalWeight,
          `Completed: ${op.name}`
        );

        if (onProgress) {
          const progress = indicator.getCurrentProgress();
          if (progress) {
            onProgress(progress);
          }
        }
      } catch (error) {
        indicator.updateProgress(
          `Operation ${i + 1}/${operations.length}`,
          completedWeight / totalWeight,
          `Failed: ${op.name}`,
          error instanceof Error ? error.message : String(error)
        );

        if (onProgress) {
          const progress = indicator.getCurrentProgress();
          if (progress) {
            onProgress(progress);
          }
        }
        throw error;
      }
    }

    indicator.complete("All operations completed successfully");
    if (onProgress) {
      const progress = indicator.getCurrentProgress();
      if (progress) {
        onProgress(progress);
      }
    }

    return results;
  }
}

/**
 * Decorator for adding progress tracking to methods
 */
export function withProgress(stageName: string, component?: string) {
  return function (
    target: any,
    _propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const indicator = new ProgressIndicator({
        component: component ?? target.constructor.name,
      });

      indicator.updateProgress(stageName, 0, "Starting operation");

      try {
        const result = await method.apply(this, args);
        indicator.complete(`${stageName} completed successfully`);
        return result;
      } catch (error) {
        indicator.updateProgress(
          stageName,
          0.5,
          "Operation failed",
          error instanceof Error ? error.message : String(error)
        );
        throw error;
      }
    };

    return descriptor;
  };
}
