/**
 * Performance monitoring and metrics collection for cognitive architecture
 */

import { getLogger } from "./logger.js";

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: MemoryUsage;
  cognitiveMetrics: CognitiveMetrics;
  timestamp: number;
  requestId: string;
  toolName: string;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface CognitiveMetrics {
  confidenceScore: number;
  reasoningDepth: number;
  memoryRetrievals: number;
  emotionalProcessingTime?: number | undefined;
  metacognitionTime?: number | undefined;
  workingMemoryLoad: number;
}

export interface PerformanceAlert {
  type: "warning" | "critical";
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  message: string;
}

export interface PerformanceThresholds {
  responseTimeWarning: number;
  responseTimeCritical: number;
  memoryUsageWarning: number;
  memoryUsageCritical: number;
  confidenceThreshold: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds;
  private maxMetricsHistory: number = 1000;
  private maxAlertsHistory: number = 100;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      responseTimeWarning: 1000, // 1 second
      responseTimeCritical: 5000, // 5 seconds
      memoryUsageWarning: 500 * 1024 * 1024, // 500MB
      memoryUsageCritical: 1024 * 1024 * 1024, // 1GB
      confidenceThreshold: 0.3,
      ...thresholds,
    };
  }

  /**
   * Start performance measurement for a request
   */
  startMeasurement(
    requestId: string,
    toolName: string
  ): PerformanceMeasurement {
    return new PerformanceMeasurement(requestId, toolName, this);
  }

  /**
   * Record performance metrics
   */
  recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);

    // Maintain history limit
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Check for alerts
    this.checkThresholds(metrics);
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): MemoryUsage {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    };
  }

  /**
   * Get performance statistics
   */
  getStatistics(timeWindow?: number): PerformanceStatistics {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;

    const relevantMetrics = this.metrics.filter(
      (m) => m.timestamp >= windowStart
    );

    if (relevantMetrics.length === 0) {
      return this.getEmptyStatistics();
    }

    const responseTimes = relevantMetrics.map((m) => m.responseTime);
    const memoryUsages = relevantMetrics.map((m) => m.memoryUsage.heapUsed);
    const confidenceScores = relevantMetrics.map(
      (m) => m.cognitiveMetrics.confidenceScore
    );

    return {
      totalRequests: relevantMetrics.length,
      averageResponseTime: this.calculateAverage(responseTimes),
      medianResponseTime: this.calculateMedian(responseTimes),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      averageMemoryUsage: this.calculateAverage(memoryUsages),
      peakMemoryUsage: Math.max(...memoryUsages),
      averageConfidence: this.calculateAverage(confidenceScores),
      lowConfidenceRequests: confidenceScores.filter(
        (c) => c < this.thresholds.confidenceThreshold
      ).length,
      toolUsageStats: this.calculateToolUsageStats(relevantMetrics),
      timeWindow: timeWindow ?? now - relevantMetrics[0].timestamp,
    };
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 10): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metrics = [];
    this.alerts = [];
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    // Check response time thresholds
    if (metrics.responseTime > this.thresholds.responseTimeCritical) {
      this.addAlert(
        "critical",
        "responseTime",
        metrics.responseTime,
        this.thresholds.responseTimeCritical,
        `Critical response time: ${metrics.responseTime}ms for ${metrics.toolName}`
      );
    } else if (metrics.responseTime > this.thresholds.responseTimeWarning) {
      this.addAlert(
        "warning",
        "responseTime",
        metrics.responseTime,
        this.thresholds.responseTimeWarning,
        `High response time: ${metrics.responseTime}ms for ${metrics.toolName}`
      );
    }

    // Check memory usage thresholds
    if (metrics.memoryUsage.heapUsed > this.thresholds.memoryUsageCritical) {
      this.addAlert(
        "critical",
        "memoryUsage",
        metrics.memoryUsage.heapUsed,
        this.thresholds.memoryUsageCritical,
        `Critical memory usage: ${Math.round(
          metrics.memoryUsage.heapUsed / 1024 / 1024
        )}MB`
      );
    } else if (
      metrics.memoryUsage.heapUsed > this.thresholds.memoryUsageWarning
    ) {
      this.addAlert(
        "warning",
        "memoryUsage",
        metrics.memoryUsage.heapUsed,
        this.thresholds.memoryUsageWarning,
        `High memory usage: ${Math.round(
          metrics.memoryUsage.heapUsed / 1024 / 1024
        )}MB`
      );
    }

    // Check confidence threshold
    if (
      metrics.cognitiveMetrics.confidenceScore <
      this.thresholds.confidenceThreshold
    ) {
      this.addAlert(
        "warning",
        "confidence",
        metrics.cognitiveMetrics.confidenceScore,
        this.thresholds.confidenceThreshold,
        `Low confidence score: ${metrics.cognitiveMetrics.confidenceScore.toFixed(
          2
        )} for ${metrics.toolName}`
      );
    }
  }

  private addAlert(
    type: "warning" | "critical",
    metric: string,
    value: number,
    threshold: number,
    message: string
  ): void {
    this.alerts.push({
      type,
      metric,
      value,
      threshold,
      timestamp: Date.now(),
      message,
    });

    // Maintain alerts history limit
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts.shift();
    }

    // Log alert
    const logger = getLogger();
    logger.warn(
      "PerformanceMonitor",
      `[PerformanceAlert] ${type.toUpperCase()}: ${message}`
    );
  }

  private calculateAverage(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateToolUsageStats(
    metrics: PerformanceMetrics[]
  ): Record<string, ToolUsageStats> {
    const toolStats: Record<string, ToolUsageStats> = {};

    metrics.forEach((metric) => {
      if (!toolStats[metric.toolName]) {
        toolStats[metric.toolName] = {
          count: 0,
          totalResponseTime: 0,
          averageResponseTime: 0,
          averageConfidence: 0,
          totalConfidence: 0,
        };
      }

      const stats = toolStats[metric.toolName];
      stats.count++;
      stats.totalResponseTime += metric.responseTime;
      stats.totalConfidence += metric.cognitiveMetrics.confidenceScore;
      stats.averageResponseTime = stats.totalResponseTime / stats.count;
      stats.averageConfidence = stats.totalConfidence / stats.count;
    });

    return toolStats;
  }

  private getEmptyStatistics(): PerformanceStatistics {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      medianResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      averageMemoryUsage: 0,
      peakMemoryUsage: 0,
      averageConfidence: 0,
      lowConfidenceRequests: 0,
      toolUsageStats: {},
      timeWindow: 0,
    };
  }
}

export interface PerformanceStatistics {
  totalRequests: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  averageConfidence: number;
  lowConfidenceRequests: number;
  toolUsageStats: Record<string, ToolUsageStats>;
  timeWindow: number;
}

export interface ToolUsageStats {
  count: number;
  totalResponseTime: number;
  averageResponseTime: number;
  averageConfidence: number;
  totalConfidence: number;
}

/**
 * Helper class for measuring performance of individual requests
 */
export class PerformanceMeasurement {
  private startTime: number;
  // Memory usage tracking for future use
  // private _startMemory: MemoryUsage;
  private cognitiveMetrics: Partial<CognitiveMetrics> = {};

  constructor(
    private requestId: string,
    private toolName: string,
    private monitor: PerformanceMonitor
  ) {
    this.startTime = Date.now();
    // this._startMemory = monitor.getMemoryUsage();
  }

  /**
   * Record cognitive metrics during processing
   */
  recordCognitiveMetrics(metrics: Partial<CognitiveMetrics>): void {
    this.cognitiveMetrics = { ...this.cognitiveMetrics, ...metrics };
  }

  /**
   * Complete the measurement and record metrics
   */
  complete(): PerformanceMetrics {
    const endTime = Date.now();
    const endMemory = this.monitor.getMemoryUsage();

    const metrics: PerformanceMetrics = {
      responseTime: endTime - this.startTime,
      memoryUsage: endMemory,
      cognitiveMetrics: {
        confidenceScore: this.cognitiveMetrics.confidenceScore ?? 0,
        reasoningDepth: this.cognitiveMetrics.reasoningDepth ?? 0,
        memoryRetrievals: this.cognitiveMetrics.memoryRetrievals ?? 0,
        emotionalProcessingTime: this.cognitiveMetrics.emotionalProcessingTime,
        metacognitionTime: this.cognitiveMetrics.metacognitionTime,
        workingMemoryLoad: this.cognitiveMetrics.workingMemoryLoad ?? 0,
      },
      timestamp: endTime,
      requestId: this.requestId,
      toolName: this.toolName,
    };

    this.monitor.recordMetrics(metrics);
    return metrics;
  }
}

// Singleton instance for global access
export const performanceMonitor = new PerformanceMonitor();
