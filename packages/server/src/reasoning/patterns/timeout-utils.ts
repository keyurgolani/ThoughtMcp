/**
 * Timeout Utilities for Pattern-Based Reasoning
 *
 * Provides timeout protection for pattern matching and reasoning operations.
 * Returns partial results with timeout indicators when operations exceed
 * sanity check thresholds.
 *
 * Requirements: 9.2, 9.4, 9.5, 9.6
 */

import { Logger } from "../../utils/logger.js";

/**
 * Default timeout values (sanity checks)
 *
 * These are sanity check timeouts to prevent indefinite hangs,
 * not strict performance requirements.
 */
export const PATTERN_MATCHING_TIMEOUT_MS = 5000; // 5 seconds
export const FULL_REASONING_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Result of a timeout-protected operation
 *
 * Contains the result (possibly partial) and timeout status.
 */
export interface TimeoutResult<T> {
  /** The result of the operation (may be partial if timed out) */
  result: T;
  /** Whether the operation timed out */
  timedOut: boolean;
  /** Actual execution time in milliseconds */
  executionTimeMs: number;
}

/**
 * Execute an operation with timeout protection
 *
 * If the operation exceeds the timeout, returns the partial result
 * (if available) or a fallback value with timeout indicator.
 *
 * @param operation - The async operation to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param fallbackValue - Value to return if operation times out without partial result
 * @param operationName - Name for logging purposes
 * @returns TimeoutResult with result and timeout status
 *
 * Requirements: 9.2, 9.4, 9.5, 9.6
 */
export async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  fallbackValue: T,
  operationName: string
): Promise<TimeoutResult<T>> {
  const startTime = Date.now();

  // Create timeout promise
  const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
    setTimeout(() => {
      resolve({ timedOut: true });
    }, timeoutMs);
  });

  // Create operation promise that wraps the result
  const operationPromise = operation().then((result) => ({
    timedOut: false as const,
    result,
  }));

  try {
    // Race between operation and timeout
    const raceResult = await Promise.race([operationPromise, timeoutPromise]);
    const executionTimeMs = Date.now() - startTime;

    if (raceResult.timedOut) {
      Logger.warn(`${operationName}: Operation timed out after ${timeoutMs}ms`, {
        timeoutMs,
        executionTimeMs,
      });

      return {
        result: fallbackValue,
        timedOut: true,
        executionTimeMs,
      };
    }

    return {
      result: raceResult.result,
      timedOut: false,
      executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    Logger.error(`${operationName}: Operation failed`, {
      error: error instanceof Error ? error.message : String(error),
      executionTimeMs,
    });

    // Return fallback value on error (not a timeout, but still need to return something)
    return {
      result: fallbackValue,
      timedOut: false,
      executionTimeMs,
    };
  }
}

/**
 * Execute an operation with timeout protection and partial result support
 *
 * Similar to executeWithTimeout, but allows the operation to provide
 * partial results that can be returned on timeout.
 *
 * @param operation - The async operation to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param getPartialResult - Function to get partial result if available
 * @param fallbackValue - Value to return if no partial result available
 * @param operationName - Name for logging purposes
 * @returns TimeoutResult with result and timeout status
 *
 * Requirements: 9.5, 9.6
 */
export async function executeWithTimeoutAndPartialResult<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  getPartialResult: () => T | null,
  fallbackValue: T,
  operationName: string
): Promise<TimeoutResult<T>> {
  const startTime = Date.now();
  let operationCompleted = false;

  // Create timeout promise
  const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
    setTimeout(() => {
      if (!operationCompleted) {
        resolve({ timedOut: true });
      }
    }, timeoutMs);
  });

  // Create operation promise that wraps the result
  const operationPromise = operation().then((result) => {
    operationCompleted = true;
    return {
      timedOut: false as const,
      result,
    };
  });

  try {
    // Race between operation and timeout
    const raceResult = await Promise.race([operationPromise, timeoutPromise]);
    const executionTimeMs = Date.now() - startTime;

    if (raceResult.timedOut) {
      Logger.warn(`${operationName}: Operation timed out after ${timeoutMs}ms`, {
        timeoutMs,
        executionTimeMs,
      });

      // Try to get partial result
      const partialResult = getPartialResult();
      if (partialResult !== null) {
        Logger.info(`${operationName}: Returning partial result after timeout`);
        return {
          result: partialResult,
          timedOut: true,
          executionTimeMs,
        };
      }

      return {
        result: fallbackValue,
        timedOut: true,
        executionTimeMs,
      };
    }

    return {
      result: raceResult.result,
      timedOut: false,
      executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    Logger.error(`${operationName}: Operation failed`, {
      error: error instanceof Error ? error.message : String(error),
      executionTimeMs,
    });

    // Try to get partial result on error
    const partialResult = getPartialResult();
    if (partialResult !== null) {
      return {
        result: partialResult,
        timedOut: false,
        executionTimeMs,
      };
    }

    return {
      result: fallbackValue,
      timedOut: false,
      executionTimeMs,
    };
  }
}

/**
 * Create a cancellable operation wrapper
 *
 * Wraps an operation to support cancellation via AbortSignal.
 * Useful for operations that can be interrupted.
 *
 * @param operation - The operation to wrap
 * @param signal - AbortSignal for cancellation
 * @returns Promise that rejects if aborted
 */
export function withAbortSignal<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("Operation aborted"));
      return;
    }

    const abortHandler = (): void => {
      reject(new Error("Operation aborted"));
    };

    signal.addEventListener("abort", abortHandler, { once: true });

    operation()
      .then((result) => {
        signal.removeEventListener("abort", abortHandler);
        resolve(result);
      })
      .catch((error) => {
        signal.removeEventListener("abort", abortHandler);
        reject(error);
      });
  });
}
