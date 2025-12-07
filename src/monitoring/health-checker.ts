/**
 * Health Checker
 *
 * Provides health check endpoints and component health monitoring.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import type { HealthCheckResult, SystemHealthReport, SystemMetrics } from "./types.js";

/**
 * Health check function type
 */
export type HealthCheckFn = () => Promise<HealthCheckResult>;

/**
 * Health Checker class
 *
 * Manages health checks for system components and generates health reports.
 */
export class HealthChecker {
  private checks: Map<string, HealthCheckFn> = new Map();
  private lastResults: Map<string, HealthCheckResult> = new Map();
  private startTime: Date;
  private version?: string;

  constructor(options?: { version?: string }) {
    this.startTime = new Date();
    this.version = options?.version;
  }

  /**
   * Register a health check
   */
  registerCheck(name: string, check: HealthCheckFn): void {
    this.checks.set(name, check);
  }

  /**
   * Unregister a health check
   */
  unregisterCheck(name: string): void {
    this.checks.delete(name);
    this.lastResults.delete(name);
  }

  /**
   * Run a single health check
   */
  async runCheck(name: string): Promise<HealthCheckResult> {
    const check = this.checks.get(name);
    if (!check) {
      return {
        component: name,
        status: "unhealthy",
        responseTimeMs: 0,
        error: `Health check '${name}' not found`,
      };
    }

    const startTime = performance.now();
    try {
      const result = await check();
      result.responseTimeMs = performance.now() - startTime;
      result.lastSuccess =
        result.status === "healthy" ? new Date() : this.lastResults.get(name)?.lastSuccess;
      this.lastResults.set(name, result);
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        component: name,
        status: "unhealthy",
        responseTimeMs: performance.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
        lastSuccess: this.lastResults.get(name)?.lastSuccess,
      };
      this.lastResults.set(name, result);
      return result;
    }
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const name of this.checks.keys()) {
      const result = await this.runCheck(name);
      results.push(result);
    }

    return results;
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();

    return {
      memoryUsed: memUsage.rss,
      memoryTotal: memUsage.rss + memUsage.external,
      memoryUsagePercent: 0, // Would need OS-level info for accurate percentage
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
    };
  }

  /**
   * Generate a full health report
   */
  async generateReport(): Promise<SystemHealthReport> {
    const components = await this.runAllChecks();
    const metrics = this.getSystemMetrics();
    const uptimeMs = Date.now() - this.startTime.getTime();

    // Determine overall status
    let status: "healthy" | "unhealthy" | "degraded" = "healthy";
    const unhealthyCount = components.filter((c) => c.status === "unhealthy").length;
    const degradedCount = components.filter((c) => c.status === "degraded").length;

    if (unhealthyCount > 0) {
      status = "unhealthy";
    } else if (degradedCount > 0) {
      status = "degraded";
    }

    return {
      status,
      timestamp: new Date(),
      components,
      metrics,
      uptimeMs,
      version: this.version,
    };
  }

  /**
   * Get last result for a component
   */
  getLastResult(name: string): HealthCheckResult | undefined {
    return this.lastResults.get(name);
  }

  /**
   * Get all last results
   */
  getAllLastResults(): Map<string, HealthCheckResult> {
    return new Map(this.lastResults);
  }

  /**
   * Check if system is healthy
   */
  async isHealthy(): Promise<boolean> {
    const report = await this.generateReport();
    return report.status === "healthy";
  }

  /**
   * Check if system is ready (healthy or degraded)
   */
  async isReady(): Promise<boolean> {
    const report = await this.generateReport();
    return report.status !== "unhealthy";
  }

  /**
   * Get uptime in milliseconds
   */
  getUptimeMs(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Get registered check names
   */
  getCheckNames(): string[] {
    return Array.from(this.checks.keys());
  }

  /**
   * Create a database health check
   */
  static createDatabaseCheck(
    checkFn: () => Promise<boolean>,
    name: string = "database"
  ): HealthCheckFn {
    return async (): Promise<HealthCheckResult> => {
      try {
        const healthy = await checkFn();
        return {
          component: name,
          status: healthy ? "healthy" : "unhealthy",
          responseTimeMs: 0,
          error: healthy ? undefined : "Database health check failed",
        };
      } catch (error) {
        return {
          component: name,
          status: "unhealthy",
          responseTimeMs: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    };
  }

  /**
   * Create a memory health check
   */
  static createMemoryCheck(thresholdPercent: number = 90, name: string = "memory"): HealthCheckFn {
    return async (): Promise<HealthCheckResult> => {
      const memUsage = process.memoryUsage();
      const usedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      let status: "healthy" | "unhealthy" | "degraded" = "healthy";
      if (usedPercent >= thresholdPercent) {
        status = "unhealthy";
      } else if (usedPercent >= thresholdPercent * 0.8) {
        status = "degraded";
      }

      return {
        component: name,
        status,
        responseTimeMs: 0,
        details: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          usedPercent: Math.round(usedPercent * 100) / 100,
          threshold: thresholdPercent,
        },
      };
    };
  }

  /**
   * Create a custom health check with timeout
   */
  static createTimeoutCheck(
    checkFn: () => Promise<boolean>,
    timeoutMs: number,
    name: string
  ): HealthCheckFn {
    return async (): Promise<HealthCheckResult> => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), timeoutMs)
        );

        const healthy = await Promise.race([checkFn(), timeoutPromise]);

        return {
          component: name,
          status: healthy ? "healthy" : "unhealthy",
          responseTimeMs: 0,
        };
      } catch (error) {
        return {
          component: name,
          status: "unhealthy",
          responseTimeMs: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    };
  }
}

/**
 * Global health checker instance
 */
export const healthChecker = new HealthChecker();
