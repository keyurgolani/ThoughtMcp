/**
 * Common Test Helpers
 *
 * Provides utility functions for common test operations:
 * - Async utilities
 * - Retry logic
 * - Timeout handling
 * - Test data generation
 */

/**
 * Wait for a condition to be true
 *
 * @param condition - Function that returns true when condition is met
 * @param timeoutMs - Maximum time to wait
 * @param intervalMs - Check interval
 * @returns Promise that resolves when condition is met
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await condition();
    if (result) {
      return;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Sleep for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param initialDelayMs - Initial delay between retries
 * @returns Result of successful execution
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        await sleep(delayMs);
      }
    }
  }

  throw lastError ?? new Error("Retry failed");
}

/**
 * Execute function with timeout
 *
 * @param fn - Function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @returns Result of execution
 */
export async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Execute multiple promises in parallel with concurrency limit
 *
 * @param tasks - Array of task functions
 * @param concurrency - Maximum concurrent executions
 * @returns Array of results
 */
export async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let taskIndex = 0;

  async function runNext(): Promise<void> {
    while (taskIndex < tasks.length) {
      const currentIndex = taskIndex++;
      const result = await tasks[currentIndex]();
      results[currentIndex] = result;
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => runNext());
  await Promise.all(workers);

  return results;
}

/**
 * Generate random string
 *
 * @param length - String length
 * @returns Random string
 */
export function randomString(length: number = 10): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Generate random integer in range
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random float in range
 *
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random float
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Shuffle array in place
 *
 * @param array - Array to shuffle
 * @returns Shuffled array
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Pick random element from array
 *
 * @param array - Array to pick from
 * @returns Random element
 */
export function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Create a spy function that tracks calls
 */
export interface SpyFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T>;
  calls: Array<{ args: Parameters<T>; result: ReturnType<T> }>;
  callCount: number;
  reset: () => void;
}

export function createSpy<T extends (...args: unknown[]) => unknown>(
  implementation: T
): SpyFunction<T> {
  const calls: Array<{ args: Parameters<T>; result: ReturnType<T> }> = [];

  const spy = ((...args: Parameters<T>) => {
    const result = implementation(...args) as ReturnType<T>;
    calls.push({ args, result });
    return result;
  }) as SpyFunction<T>;

  Object.defineProperty(spy, "calls", {
    get: () => calls,
  });

  Object.defineProperty(spy, "callCount", {
    get: () => calls.length,
  });

  spy.reset = () => {
    calls.length = 0;
  };

  return spy;
}

/**
 * Create a mock function that returns predefined values
 */
export function createMock<T>(returnValues: T[]): () => T {
  let callIndex = 0;

  return () => {
    if (callIndex >= returnValues.length) {
      throw new Error("Mock called more times than return values provided");
    }
    return returnValues[callIndex++];
  };
}

/**
 * Deep clone an object
 *
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Compare two objects for deep equality
 *
 * @param a - First object
 * @param b - Second object
 * @returns True if objects are deeply equal
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Format bytes to human readable string
 *
 * @param bytes - Number of bytes
 * @returns Formatted string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format duration to human readable string
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

/**
 * Calculate percentiles from array of numbers
 *
 * @param values - Array of numbers
 * @param percentiles - Array of percentiles to calculate (0-1)
 * @returns Map of percentile to value
 */
export function calculatePercentiles(
  values: number[],
  percentiles: number[] = [0.5, 0.95, 0.99]
): Map<number, number> {
  const sorted = [...values].sort((a, b) => a - b);
  const result = new Map<number, number>();

  for (const p of percentiles) {
    const index = Math.floor(sorted.length * p);
    result.set(p, sorted[index]);
  }

  return result;
}

/**
 * Calculate statistics from array of numbers
 *
 * @param values - Array of numbers
 * @returns Statistics object
 */
export function calculateStats(values: number[]): {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
} {
  const count = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / count;

  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(count / 2)];

  const min = Math.min(...values);
  const max = Math.max(...values);

  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  return { count, sum, mean, median, min, max, stdDev };
}

/**
 * Create a deferred promise
 *
 * @returns Deferred promise with resolve and reject functions
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Extract data from MCP response with type assertion
 * This helper safely extracts and casts the data field from MCPResponse
 * for use in test assertions where the data shape is known
 *
 * @param response - MCP response object
 * @returns The data field cast to the expected type
 */
export function getMCPData<T = Record<string, unknown>>(response: {
  success: boolean;
  data?: { [key: string]: unknown };
}): T {
  if (!response.data) {
    throw new Error("Response data is undefined");
  }
  return response.data as unknown as T;
}
