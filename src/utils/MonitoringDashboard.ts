/**
 * Monitoring dashboard for cognitive architecture performance
 */

import {
  MemoryUsage,
  PerformanceAlert,
  PerformanceMonitor,
  PerformanceStatistics,
} from "./PerformanceMonitor.js";

export interface DashboardConfig {
  refreshInterval: number;
  alertThreshold: number;
  displayMetrics: string[];
  timeWindows: number[];
}

export class MonitoringDashboard {
  private monitor: PerformanceMonitor;
  private config: DashboardConfig;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout | undefined;

  constructor(monitor: PerformanceMonitor, config?: Partial<DashboardConfig>) {
    this.monitor = monitor;
    this.config = {
      refreshInterval: 5000, // 5 seconds
      alertThreshold: 10,
      displayMetrics: [
        "responseTime",
        "memoryUsage",
        "confidence",
        "throughput",
      ],
      timeWindows: [60000, 300000, 3600000], // 1min, 5min, 1hour
      ...config,
    };
  }

  /**
   * Start the monitoring dashboard
   */
  start(): void {
    if (this.isRunning) {
      console.warn("Dashboard is already running");
      return;
    }

    this.isRunning = true;
    console.log("🚀 Cognitive Performance Dashboard Started");
    this.displayDashboard();

    this.intervalId = setInterval(() => {
      this.displayDashboard();
    }, this.config.refreshInterval);
  }

  /**
   * Stop the monitoring dashboard
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log("📊 Cognitive Performance Dashboard Stopped");
  }

  /**
   * Display current dashboard
   */
  displayDashboard(): void {
    console.clear();
    console.log(
      "╔══════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║              🧠 COGNITIVE PERFORMANCE DASHBOARD              ║"
    );
    console.log(
      "╚══════════════════════════════════════════════════════════════╝"
    );
    console.log();

    // Display statistics for different time windows
    this.config.timeWindows.forEach((window, index) => {
      const windowName = this.formatTimeWindow(window);
      const stats = this.monitor.getStatistics(window);

      console.log(`📈 ${windowName} Statistics:`);
      this.displayStatistics(stats);

      if (index < this.config.timeWindows.length - 1) {
        console.log("─".repeat(60));
      }
    });

    // Display recent alerts
    const alerts = this.monitor.getAlerts(5);
    if (alerts.length > 0) {
      console.log();
      console.log("🚨 Recent Alerts:");
      alerts.forEach((alert) => {
        const icon = alert.type === "critical" ? "🔴" : "🟡";
        const timestamp = new Date(alert.timestamp).toLocaleTimeString();
        console.log(`  ${icon} [${timestamp}] ${alert.message}`);
      });
    }

    // Display memory usage bar
    console.log();
    this.displayMemoryUsageBar();

    console.log();
    console.log(`Last updated: ${new Date().toLocaleTimeString()}`);
    console.log("Press Ctrl+C to stop monitoring");
  }

  /**
   * Generate performance report
   */
  generateReport(timeWindow?: number): PerformanceReport {
    const stats = this.monitor.getStatistics(timeWindow);
    const alerts = this.monitor.getAlerts();
    const currentMemory = this.monitor.getMemoryUsage();

    return {
      timestamp: Date.now(),
      timeWindow: timeWindow ?? 0,
      statistics: stats,
      alerts: alerts,
      currentMemoryUsage: currentMemory,
      recommendations: this.generateRecommendations(stats, alerts),
    };
  }

  /**
   * Export dashboard data as JSON
   */
  exportData(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  private displayStatistics(stats: PerformanceStatistics): void {
    console.log(`  📊 Total Requests: ${stats.totalRequests}`);

    if (stats.totalRequests > 0) {
      console.log(`  ⏱️  Response Times:`);
      console.log(`     Average: ${stats.averageResponseTime.toFixed(1)}ms`);
      console.log(`     Median:  ${stats.medianResponseTime.toFixed(1)}ms`);
      console.log(`     P95:     ${stats.p95ResponseTime.toFixed(1)}ms`);
      console.log(`     P99:     ${stats.p99ResponseTime.toFixed(1)}ms`);

      console.log(`  🧠 Cognitive Metrics:`);
      console.log(
        `     Average Confidence: ${(stats.averageConfidence * 100).toFixed(
          1
        )}%`
      );
      console.log(
        `     Low Confidence Requests: ${stats.lowConfidenceRequests}`
      );

      console.log(`  💾 Memory Usage:`);
      console.log(
        `     Average: ${this.formatBytes(stats.averageMemoryUsage)}`
      );
      console.log(`     Peak:    ${this.formatBytes(stats.peakMemoryUsage)}`);

      // Tool usage breakdown
      if (Object.keys(stats.toolUsageStats).length > 0) {
        console.log(`  🔧 Tool Usage:`);
        Object.entries(stats.toolUsageStats).forEach(([tool, toolStats]) => {
          console.log(
            `     ${tool}: ${
              toolStats.count
            } calls (${toolStats.averageResponseTime.toFixed(1)}ms avg)`
          );
        });
      }
    }
    console.log();
  }

  private displayMemoryUsageBar(): void {
    const memory = this.monitor.getMemoryUsage();
    const usedMB = memory.heapUsed / 1024 / 1024;
    const totalMB = memory.heapTotal / 1024 / 1024;
    const percentage = (usedMB / totalMB) * 100;

    const barLength = 40;
    const filledLength = Math.round((percentage / 100) * barLength);
    const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength);

    console.log(`💾 Memory Usage: [${bar}] ${percentage.toFixed(1)}%`);
    console.log(
      `   Used: ${usedMB.toFixed(1)}MB / Total: ${totalMB.toFixed(1)}MB`
    );
  }

  private formatTimeWindow(ms: number): string {
    if (ms < 60000) return `${ms / 1000}s`;
    if (ms < 3600000) return `${ms / 60000}min`;
    return `${ms / 3600000}h`;
  }

  private formatBytes(bytes: number): string {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  private generateRecommendations(
    stats: PerformanceStatistics,
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = [];

    // Response time recommendations
    if (stats.averageResponseTime > 2000) {
      recommendations.push(
        "Consider optimizing cognitive processing pipeline - average response time is high"
      );
    }

    if (stats.p95ResponseTime > 5000) {
      recommendations.push(
        "Investigate slow requests - 95th percentile response time exceeds 5 seconds"
      );
    }

    // Memory recommendations
    if (stats.peakMemoryUsage > 500 * 1024 * 1024) {
      recommendations.push("Monitor memory usage - peak usage exceeds 500MB");
    }

    // Confidence recommendations
    if (stats.averageConfidence < 0.5) {
      recommendations.push(
        "Review cognitive model parameters - average confidence is low"
      );
    }

    if (
      stats.totalRequests > 0 &&
      stats.lowConfidenceRequests / stats.totalRequests > 0.3
    ) {
      recommendations.push(
        "High percentage of low-confidence responses - consider model tuning"
      );
    }

    // Alert-based recommendations
    const criticalAlerts = alerts.filter((a) => a.type === "critical").length;
    if (criticalAlerts > 0) {
      recommendations.push(
        `Address ${criticalAlerts} critical performance alerts`
      );
    }

    // Tool-specific recommendations
    Object.entries(stats.toolUsageStats).forEach(([tool, toolStats]) => {
      if (toolStats.averageResponseTime > 3000) {
        recommendations.push(
          `Optimize ${tool} tool - average response time is ${toolStats.averageResponseTime.toFixed(
            0
          )}ms`
        );
      }
    });

    return recommendations;
  }
}

export interface PerformanceReport {
  timestamp: number;
  timeWindow: number;
  statistics: PerformanceStatistics;
  alerts: PerformanceAlert[];
  currentMemoryUsage: MemoryUsage;
  recommendations: string[];
}

/**
 * Create a simple CLI dashboard
 */
export function createCLIDashboard(
  monitor: PerformanceMonitor
): MonitoringDashboard {
  return new MonitoringDashboard(monitor, {
    refreshInterval: 3000,
    displayMetrics: ["responseTime", "memoryUsage", "confidence"],
    timeWindows: [60000, 300000], // 1min, 5min
  });
}
