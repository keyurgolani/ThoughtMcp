/**
 * Resource Monitor
 *
 * Monitors system resources including CPU, memory, and database connections.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { metrics } from "./metrics-collector.js";
import type { SystemMetrics } from "./types.js";

/**
 * Resource snapshot
 */
export interface ResourceSnapshot {
  timestamp: Date;
  metrics: SystemMetrics;
}

/**
 * Resource Monitor class
 *
 * Monitors and tracks system resource usage over time.
 */
export class ResourceMonitor {
  private snapshots: ResourceSnapshot[] = [];
  private maxSnapshots: number;
  private intervalId?: ReturnType<typeof setInterval>;
  private lastCpuUsage?: NodeJS.CpuUsage;
  private lastCpuTime?: number;
  private dbConnectionsFn?: () => { active: number; idle: number };

  constructor(options?: { maxSnapshots?: number }) {
    this.maxSnapshots = options?.maxSnapshots ?? 360; // 1 hour at 10s intervals
  }

  /**
   * Set database connections function
   */
  setDatabaseConnectionsFn(fn: () => { active: number; idle: number }): void {
    this.dbConnectionsFn = fn;
  }

  /**
   * Get current CPU usage percentage
   */
  private getCpuUsage(): number {
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    const currentTime = Date.now();

    if (!this.lastCpuUsage || !this.lastCpuTime) {
      this.lastCpuUsage = process.cpuUsage();
      this.lastCpuTime = currentTime;
      return 0;
    }

    const elapsedTime = (currentTime - this.lastCpuTime) * 1000; // Convert to microseconds
    const totalCpuTime = currentCpuUsage.user + currentCpuUsage.system;
    const cpuPercent = (totalCpuTime / elapsedTime) * 100;

    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = currentTime;

    return Math.min(100, Math.max(0, cpuPercent));
  }

  /**
   * Get current system metrics
   */
  getCurrentMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = this.getCpuUsage();

    const result: SystemMetrics = {
      cpuUsage,
      memoryUsed: memUsage.rss,
      memoryTotal: memUsage.rss + memUsage.external,
      memoryUsagePercent: 0, // Would need OS-level info
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
    };

    // Add database connections if available
    if (this.dbConnectionsFn) {
      try {
        const dbConns = this.dbConnectionsFn();
        result.dbConnectionsActive = dbConns.active;
        result.dbConnectionsIdle = dbConns.idle;
      } catch {
        // Ignore errors getting DB connections
      }
    }

    return result;
  }

  /**
   * Take a resource snapshot
   */
  takeSnapshot(): ResourceSnapshot {
    const snapshot: ResourceSnapshot = {
      timestamp: new Date(),
      metrics: this.getCurrentMetrics(),
    };

    this.snapshots.push(snapshot);

    // Trim snapshots if needed
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    // Record metrics
    this.recordMetrics(snapshot.metrics);

    return snapshot;
  }

  /**
   * Record metrics to metrics collector
   */
  private recordMetrics(m: SystemMetrics): void {
    if (m.cpuUsage !== undefined) {
      metrics.setGauge("system_cpu_usage_percent", m.cpuUsage, { unit: "percent" });
    }
    metrics.setGauge("system_memory_used_bytes", m.memoryUsed, { unit: "bytes" });
    metrics.setGauge("system_memory_total_bytes", m.memoryTotal, { unit: "bytes" });
    metrics.setGauge("system_heap_used_bytes", m.heapUsed, { unit: "bytes" });
    metrics.setGauge("system_heap_total_bytes", m.heapTotal, { unit: "bytes" });

    if (m.dbConnectionsActive !== undefined) {
      metrics.setGauge("db_connections_active", m.dbConnectionsActive);
    }
    if (m.dbConnectionsIdle !== undefined) {
      metrics.setGauge("db_connections_idle", m.dbConnectionsIdle);
    }
  }

  /**
   * Start periodic monitoring
   */
  start(intervalMs: number = 10000): void {
    if (this.intervalId) {
      return; // Already running
    }

    // Take initial snapshot
    this.takeSnapshot();

    // Start periodic snapshots
    this.intervalId = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);
  }

  /**
   * Stop periodic monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Check if monitoring is running
   */
  isRunning(): boolean {
    return this.intervalId !== undefined;
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): ResourceSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get snapshots within a time range
   */
  getSnapshotsInRange(start: Date, end: Date): ResourceSnapshot[] {
    return this.snapshots.filter((s) => s.timestamp >= start && s.timestamp <= end);
  }

  /**
   * Get average metrics over a time window
   */
  getAverageMetrics(windowMinutes: number = 5): SystemMetrics | null {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    const windowSnapshots = this.snapshots.filter((s) => s.timestamp >= windowStart);

    if (windowSnapshots.length === 0) {
      return null;
    }

    const sum = windowSnapshots.reduce(
      (acc, s) => ({
        cpuUsage: (acc.cpuUsage ?? 0) + (s.metrics.cpuUsage ?? 0),
        memoryUsed: acc.memoryUsed + s.metrics.memoryUsed,
        memoryTotal: acc.memoryTotal + s.metrics.memoryTotal,
        memoryUsagePercent: acc.memoryUsagePercent + s.metrics.memoryUsagePercent,
        heapUsed: acc.heapUsed + s.metrics.heapUsed,
        heapTotal: acc.heapTotal + s.metrics.heapTotal,
        dbConnectionsActive: (acc.dbConnectionsActive ?? 0) + (s.metrics.dbConnectionsActive ?? 0),
        dbConnectionsIdle: (acc.dbConnectionsIdle ?? 0) + (s.metrics.dbConnectionsIdle ?? 0),
      }),
      {
        cpuUsage: 0,
        memoryUsed: 0,
        memoryTotal: 0,
        memoryUsagePercent: 0,
        heapUsed: 0,
        heapTotal: 0,
        dbConnectionsActive: 0,
        dbConnectionsIdle: 0,
      }
    );

    const count = windowSnapshots.length;
    return {
      cpuUsage: (sum.cpuUsage ?? 0) / count,
      memoryUsed: sum.memoryUsed / count,
      memoryTotal: sum.memoryTotal / count,
      memoryUsagePercent: sum.memoryUsagePercent / count,
      heapUsed: sum.heapUsed / count,
      heapTotal: sum.heapTotal / count,
      dbConnectionsActive: sum.dbConnectionsActive ? sum.dbConnectionsActive / count : undefined,
      dbConnectionsIdle: sum.dbConnectionsIdle ? sum.dbConnectionsIdle / count : undefined,
    };
  }

  /**
   * Get peak metrics over a time window
   */
  getPeakMetrics(windowMinutes: number = 5): SystemMetrics | null {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    const windowSnapshots = this.snapshots.filter((s) => s.timestamp >= windowStart);

    if (windowSnapshots.length === 0) {
      return null;
    }

    return windowSnapshots.reduce(
      (peak, s) => ({
        cpuUsage: Math.max(peak.cpuUsage ?? 0, s.metrics.cpuUsage ?? 0),
        memoryUsed: Math.max(peak.memoryUsed, s.metrics.memoryUsed),
        memoryTotal: Math.max(peak.memoryTotal, s.metrics.memoryTotal),
        memoryUsagePercent: Math.max(peak.memoryUsagePercent, s.metrics.memoryUsagePercent),
        heapUsed: Math.max(peak.heapUsed, s.metrics.heapUsed),
        heapTotal: Math.max(peak.heapTotal, s.metrics.heapTotal),
        dbConnectionsActive: Math.max(
          peak.dbConnectionsActive ?? 0,
          s.metrics.dbConnectionsActive ?? 0
        ),
        dbConnectionsIdle: Math.max(peak.dbConnectionsIdle ?? 0, s.metrics.dbConnectionsIdle ?? 0),
      }),
      windowSnapshots[0].metrics
    );
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots = [];
  }
}

/**
 * Global resource monitor instance
 */
export const resourceMonitor = new ResourceMonitor();
