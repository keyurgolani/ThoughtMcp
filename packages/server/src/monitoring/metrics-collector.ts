/**
 * Metrics Collector
 *
 * Collects and aggregates performance metrics for production monitoring.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import type { MetricEntry, MetricType } from "./types.js";

/**
 * Histogram bucket configuration
 */
interface HistogramBuckets {
  /** Bucket boundaries */
  boundaries: number[];
  /** Count per bucket */
  counts: number[];
  /** Sum of all values */
  sum: number;
  /** Total count */
  count: number;
}

/**
 * Metric storage
 */
interface MetricStorage {
  /** Metric type */
  type: MetricType;
  /** Current value (for counter/gauge) */
  value: number;
  /** Labels */
  labels: Record<string, string>;
  /** Unit */
  unit?: string;
  /** Histogram buckets (for histogram type) */
  histogram?: HistogramBuckets;
  /** Summary values (for summary type) */
  summary?: number[];
  /** Last update timestamp */
  lastUpdate: Date;
}

/**
 * Metrics Collector class
 *
 * Collects counters, gauges, histograms, and summaries for monitoring.
 */
export class MetricsCollector {
  private metrics: Map<string, MetricStorage> = new Map();
  private history: MetricEntry[] = [];
  private maxHistory: number;
  private defaultHistogramBuckets: number[];

  constructor(
    options: {
      maxHistory?: number;
      defaultHistogramBuckets?: number[];
    } = {}
  ) {
    this.maxHistory = options.maxHistory ?? 1000;
    this.defaultHistogramBuckets = options.defaultHistogramBuckets ?? [
      5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
    ];
  }

  /**
   * Generate a metric key from name and labels
   */
  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return `${name}{${labelStr}}`;
  }

  /**
   * Increment a counter
   */
  incrementCounter(
    name: string,
    value: number = 1,
    options?: { labels?: Record<string, string>; unit?: string }
  ): void {
    const key = this.getMetricKey(name, options?.labels);
    const existing = this.metrics.get(key);

    if (existing) {
      existing.value += value;
      existing.lastUpdate = new Date();
    } else {
      this.metrics.set(key, {
        type: "counter",
        value,
        labels: options?.labels ?? {},
        unit: options?.unit,
        lastUpdate: new Date(),
      });
    }

    const metric = this.metrics.get(key);
    this.recordHistory(name, "counter", metric?.value ?? value, options?.labels, options?.unit);
  }

  /**
   * Set a gauge value
   */
  setGauge(
    name: string,
    value: number,
    options?: { labels?: Record<string, string>; unit?: string }
  ): void {
    const key = this.getMetricKey(name, options?.labels);

    this.metrics.set(key, {
      type: "gauge",
      value,
      labels: options?.labels ?? {},
      unit: options?.unit,
      lastUpdate: new Date(),
    });

    this.recordHistory(name, "gauge", value, options?.labels, options?.unit);
  }

  /**
   * Increment a gauge
   */
  incrementGauge(
    name: string,
    value: number = 1,
    options?: { labels?: Record<string, string>; unit?: string }
  ): void {
    const key = this.getMetricKey(name, options?.labels);
    const existing = this.metrics.get(key);

    if (existing?.type === "gauge") {
      existing.value += value;
      existing.lastUpdate = new Date();
    } else {
      this.setGauge(name, value, options);
    }
  }

  /**
   * Decrement a gauge
   */
  decrementGauge(
    name: string,
    value: number = 1,
    options?: { labels?: Record<string, string>; unit?: string }
  ): void {
    this.incrementGauge(name, -value, options);
  }

  /**
   * Observe a histogram value
   */
  observeHistogram(
    name: string,
    value: number,
    options?: { labels?: Record<string, string>; unit?: string; buckets?: number[] }
  ): void {
    const key = this.getMetricKey(name, options?.labels);
    const existing = this.metrics.get(key);
    const buckets = options?.buckets ?? this.defaultHistogramBuckets;

    if (existing?.type === "histogram" && existing.histogram) {
      // Update existing histogram
      existing.histogram.sum += value;
      existing.histogram.count += 1;
      for (let i = 0; i < buckets.length; i++) {
        if (value <= buckets[i]) {
          existing.histogram.counts[i] += 1;
        }
      }
      existing.lastUpdate = new Date();
    } else {
      // Create new histogram
      const counts = buckets.map((b) => (value <= b ? 1 : 0));
      this.metrics.set(key, {
        type: "histogram",
        value: 0,
        labels: options?.labels ?? {},
        unit: options?.unit,
        histogram: {
          boundaries: buckets,
          counts,
          sum: value,
          count: 1,
        },
        lastUpdate: new Date(),
      });
    }

    this.recordHistory(name, "histogram", value, options?.labels, options?.unit);
  }

  /**
   * Observe a summary value
   */
  observeSummary(
    name: string,
    value: number,
    options?: { labels?: Record<string, string>; unit?: string; maxSamples?: number }
  ): void {
    const key = this.getMetricKey(name, options?.labels);
    const existing = this.metrics.get(key);
    const maxSamples = options?.maxSamples ?? 1000;

    if (existing?.type === "summary" && existing.summary) {
      existing.summary.push(value);
      if (existing.summary.length > maxSamples) {
        existing.summary.shift();
      }
      existing.lastUpdate = new Date();
    } else {
      this.metrics.set(key, {
        type: "summary",
        value: 0,
        labels: options?.labels ?? {},
        unit: options?.unit,
        summary: [value],
        lastUpdate: new Date(),
      });
    }

    this.recordHistory(name, "summary", value, options?.labels, options?.unit);
  }

  /**
   * Record metric to history
   */
  private recordHistory(
    name: string,
    type: MetricType,
    value: number,
    labels?: Record<string, string>,
    unit?: string
  ): void {
    this.history.push({
      name,
      type,
      value,
      timestamp: new Date(),
      labels,
      unit,
    });

    // Trim history if needed
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  /**
   * Get a metric value
   */
  getMetric(name: string, labels?: Record<string, string>): MetricStorage | undefined {
    const key = this.getMetricKey(name, labels);
    return this.metrics.get(key);
  }

  /**
   * Get counter value
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const metric = this.getMetric(name, labels);
    return metric?.type === "counter" ? metric.value : 0;
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, labels?: Record<string, string>): number {
    const metric = this.getMetric(name, labels);
    return metric?.type === "gauge" ? metric.value : 0;
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(
    name: string,
    labels?: Record<string, string>
  ): {
    count: number;
    sum: number;
    mean: number;
    buckets: { le: number; count: number }[];
  } | null {
    const metric = this.getMetric(name, labels);
    if (metric?.type !== "histogram" || !metric.histogram) {
      return null;
    }

    const { boundaries, counts, sum, count } = metric.histogram;
    return {
      count,
      sum,
      mean: count > 0 ? sum / count : 0,
      buckets: boundaries.map((le, i) => ({ le, count: counts[i] })),
    };
  }

  /**
   * Get summary percentiles
   */
  getSummaryPercentiles(
    name: string,
    percentiles: number[] = [0.5, 0.9, 0.95, 0.99],
    labels?: Record<string, string>
  ): Record<string, number> | null {
    const metric = this.getMetric(name, labels);
    if (metric?.type !== "summary" || !metric.summary || metric.summary.length === 0) {
      return null;
    }

    const sorted = [...metric.summary].sort((a, b) => a - b);
    const result: Record<string, number> = {};

    for (const p of percentiles) {
      const index = Math.floor(sorted.length * p);
      result[`p${p * 100}`] = sorted[Math.min(index, sorted.length - 1)];
    }

    return result;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, MetricStorage> {
    return new Map(this.metrics);
  }

  /**
   * Get metric history
   */
  getHistory(options?: {
    name?: string;
    type?: MetricType;
    since?: Date;
    limit?: number;
  }): MetricEntry[] {
    let filtered = this.history;

    if (options?.name) {
      filtered = filtered.filter((m) => m.name === options.name);
    }
    if (options?.type) {
      filtered = filtered.filter((m) => m.type === options.type);
    }
    if (options?.since) {
      const since = options.since;
      filtered = filtered.filter((m) => m.timestamp >= since);
    }
    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Reset a metric
   */
  resetMetric(name: string, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    this.metrics.delete(key);
  }

  /**
   * Reset all metrics
   */
  resetAll(): void {
    this.metrics.clear();
    this.history = [];
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const [key, metric] of this.metrics) {
      const baseName = key.split("{")[0];
      const labelStr = Object.entries(metric.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");
      const labelPart = labelStr ? `{${labelStr}}` : "";

      switch (metric.type) {
        case "counter":
        case "gauge":
          lines.push(`# TYPE ${baseName} ${metric.type}`);
          lines.push(`${baseName}${labelPart} ${metric.value}`);
          break;
        case "histogram":
          this.exportHistogramMetric(lines, baseName, labelStr, labelPart, metric);
          break;
        case "summary":
          this.exportSummaryMetric(lines, baseName, labelStr, labelPart, metric);
          break;
      }
    }

    return lines.join("\n");
  }

  /**
   * Export histogram metric to Prometheus format
   */
  private exportHistogramMetric(
    lines: string[],
    baseName: string,
    labelStr: string,
    labelPart: string,
    metric: MetricStorage
  ): void {
    if (!metric.histogram) return;

    lines.push(`# TYPE ${baseName} histogram`);
    for (let i = 0; i < metric.histogram.boundaries.length; i++) {
      const le = metric.histogram.boundaries[i];
      const count = metric.histogram.counts[i];
      const labelSuffix = labelStr ? `,${labelStr}` : "";
      lines.push(`${baseName}_bucket{le="${le}"${labelSuffix}} ${count}`);
    }
    lines.push(`${baseName}_sum${labelPart} ${metric.histogram.sum}`);
    lines.push(`${baseName}_count${labelPart} ${metric.histogram.count}`);
  }

  /**
   * Export summary metric to Prometheus format
   */
  private exportSummaryMetric(
    lines: string[],
    baseName: string,
    labelStr: string,
    labelPart: string,
    metric: MetricStorage
  ): void {
    if (!metric.summary || metric.summary.length === 0) return;

    lines.push(`# TYPE ${baseName} summary`);
    const percentiles = this.getSummaryPercentiles(baseName, [0.5, 0.9, 0.99], metric.labels);
    if (percentiles) {
      for (const [p, v] of Object.entries(percentiles)) {
        const quantile = parseFloat(p.replace("p", "")) / 100;
        const labelSuffix = labelStr ? `,${labelStr}` : "";
        lines.push(`${baseName}{quantile="${quantile}"${labelSuffix}} ${v}`);
      }
    }
    const sum = metric.summary.reduce((a, b) => a + b, 0);
    lines.push(`${baseName}_sum${labelPart} ${sum}`);
    lines.push(`${baseName}_count${labelPart} ${metric.summary.length}`);
  }
}

/**
 * Global metrics collector instance
 */
export const metrics = new MetricsCollector();
