/**
 * Performance Monitor Utility
 *
 * Tracks latencies and performance metrics for critical paths.
 * Provides percentile calculations (p50, p95, p99) for performance validation.
 */

/**
 * Performance metric entry
 */
export interface PerformanceMetric {
  operation: string;
  category: string;
  duration: number; // milliseconds
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Percentile statistics
 */
export interface PercentileStats {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
  count: number;
}

/**
 * Performance report for an operation
 */
export interface PerformanceReport {
  operation: string;
  category: string;
  stats: PercentileStats;
  samples: number;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Timer for tracking operation duration
 */
class PerformanceTimer {
  private startTime: number;
  private readonly operation: string;
  private readonly category: string;
  private readonly metadata?: Record<string, unknown>;

  constructor(operation: string, category: string, metadata?: Record<string, unknown>) {
    this.operation = operation;
    this.category = category;
    this.metadata = metadata;
    this.startTime = performance.now();
  }

  /**
   * End the timer and return duration in milliseconds
   */
  end(): number {
    const duration = performance.now() - this.startTime;
    return duration;
  }

  /**
   * Get operation name
   */
  getOperation(): string {
    return this.operation;
  }

  /**
   * Get category
   */
  getCategory(): string {
    return this.category;
  }

  /**
   * Get metadata
   */
  getMetadata(): Record<string, unknown> | undefined {
    return this.metadata;
  }
}

/**
 * Performance Monitor
 *
 * Tracks latencies and provides percentile statistics for performance validation.
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics: number;

  constructor(maxMetrics: number = 10000) {
    this.maxMetrics = maxMetrics;
  }

  /**
   * Start a timer for an operation
   */
  startTimer(
    operation: string,
    category: string,
    metadata?: Record<string, unknown>
  ): PerformanceTimer {
    return new PerformanceTimer(operation, category, metadata);
  }

  /**
   * End a timer and record the metric
   */
  endTimer(timer: PerformanceTimer): number {
    const duration = timer.end();
    this.recordMetric(timer.getOperation(), timer.getCategory(), duration, timer.getMetadata());
    return duration;
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    operation: string,
    category: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    const metric: PerformanceMetric = {
      operation,
      category,
      duration,
      timestamp: new Date(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Calculate percentile statistics for an operation
   */
  getStats(operation: string, category?: string): PercentileStats | null {
    let filtered = this.metrics.filter((m) => m.operation === operation);

    if (category) {
      filtered = filtered.filter((m) => m.category === category);
    }

    if (filtered.length === 0) {
      return null;
    }

    const durations = filtered.map((m) => m.duration).sort((a, b) => a - b);

    return this.calculatePercentiles(durations);
  }

  /**
   * Calculate percentiles from sorted array of durations
   */
  private calculatePercentiles(sortedDurations: number[]): PercentileStats {
    const count = sortedDurations.length;

    if (count === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        mean: 0,
        count: 0,
      };
    }

    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    const sum = sortedDurations.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;

    return {
      p50: sortedDurations[p50Index],
      p95: sortedDurations[p95Index],
      p99: sortedDurations[p99Index],
      min: sortedDurations[0],
      max: sortedDurations[count - 1],
      mean,
      count,
    };
  }

  /**
   * Generate a performance report for an operation
   */
  generateReport(operation: string, category?: string): PerformanceReport | null {
    let filtered = this.metrics.filter((m) => m.operation === operation);

    if (category) {
      filtered = filtered.filter((m) => m.category === category);
    }

    if (filtered.length === 0) {
      return null;
    }

    const durations = filtered.map((m) => m.duration).sort((a, b) => a - b);
    const stats = this.calculatePercentiles(durations);

    const timestamps = filtered.map((m) => m.timestamp);
    const start = new Date(Math.min(...timestamps.map((t) => t.getTime())));
    const end = new Date(Math.max(...timestamps.map((t) => t.getTime())));

    return {
      operation,
      category: category ?? "all",
      stats,
      samples: filtered.length,
      period: { start, end },
    };
  }

  /**
   * Get all metrics for a category
   */
  getMetricsByCategory(category: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.category === category);
  }

  /**
   * Get all metrics for an operation
   */
  getMetricsByOperation(operation: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.operation === operation);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get total number of metrics
   */
  getMetricCount(): number {
    return this.metrics.length;
  }

  /**
   * Get all unique operations
   */
  getOperations(): string[] {
    const operations = new Set(this.metrics.map((m) => m.operation));
    return Array.from(operations);
  }

  /**
   * Get all unique categories
   */
  getCategories(): string[] {
    const categories = new Set(this.metrics.map((m) => m.category));
    return Array.from(categories);
  }
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * Helper function to measure async operation performance
 */
export async function measureAsync<T>(
  operation: string,
  category: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const timer = globalPerformanceMonitor.startTimer(operation, category, metadata);
  try {
    const result = await fn();
    globalPerformanceMonitor.endTimer(timer);
    return result;
  } catch (error) {
    globalPerformanceMonitor.endTimer(timer);
    throw error;
  }
}

/**
 * Helper function to measure sync operation performance
 */
export function measureSync<T>(
  operation: string,
  category: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  const timer = globalPerformanceMonitor.startTimer(operation, category, metadata);
  try {
    const result = fn();
    globalPerformanceMonitor.endTimer(timer);
    return result;
  } catch (error) {
    globalPerformanceMonitor.endTimer(timer);
    throw error;
  }
}
