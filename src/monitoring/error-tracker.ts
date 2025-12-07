/**
 * Error Tracker
 *
 * Tracks and aggregates errors for monitoring and alerting.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { randomUUID } from "crypto";
import type { ErrorTrackingEntry } from "./types.js";

/**
 * Error fingerprint for deduplication
 */
interface ErrorFingerprint {
  name: string;
  message: string;
  component: string;
  code?: string;
}

/**
 * Error Tracker class
 *
 * Tracks errors with deduplication, aggregation, and alerting support.
 */
export class ErrorTracker {
  private errors: Map<string, ErrorTrackingEntry> = new Map();
  private recentErrors: ErrorTrackingEntry[] = [];
  private maxErrors: number;
  private maxRecentErrors: number;
  private alertCallbacks: ((entry: ErrorTrackingEntry) => void)[] = [];

  constructor(options?: { maxErrors?: number; maxRecentErrors?: number }) {
    this.maxErrors = options?.maxErrors ?? 100;
    this.maxRecentErrors = options?.maxRecentErrors ?? 1000;
  }

  /**
   * Generate a fingerprint for error deduplication
   */
  private generateFingerprint(fp: ErrorFingerprint): string {
    return `${fp.name}:${fp.message}:${fp.component}:${fp.code ?? ""}`;
  }

  /**
   * Track an error
   */
  trackError(
    error: Error,
    options: {
      component: string;
      operation?: string;
      traceId?: string;
      context?: Record<string, unknown>;
    }
  ): ErrorTrackingEntry {
    const fingerprint = this.generateFingerprint({
      name: error.name,
      message: error.message,
      component: options.component,
      code: (error as Error & { code?: string }).code,
    });

    const now = new Date();
    const existing = this.errors.get(fingerprint);

    if (existing) {
      // Update existing error entry
      existing.count += 1;
      existing.lastSeen = now;
      if (options.traceId) {
        existing.traceId = options.traceId;
      }
      if (options.context) {
        existing.context = { ...existing.context, ...options.context };
      }

      this.addToRecent(existing);
      this.notifyAlertCallbacks(existing);
      return existing;
    }

    // Create new error entry
    const entry: ErrorTrackingEntry = {
      id: randomUUID(),
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as Error & { code?: string }).code,
      component: options.component,
      operation: options.operation,
      timestamp: now,
      traceId: options.traceId,
      context: options.context,
      count: 1,
      firstSeen: now,
      lastSeen: now,
    };

    this.errors.set(fingerprint, entry);
    this.addToRecent(entry);
    this.trimErrors();
    this.notifyAlertCallbacks(entry);

    return entry;
  }

  /**
   * Add error to recent list
   */
  private addToRecent(entry: ErrorTrackingEntry): void {
    this.recentErrors.push({ ...entry, timestamp: new Date() });
    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors = this.recentErrors.slice(-this.maxRecentErrors);
    }
  }

  /**
   * Trim errors to max limit
   */
  private trimErrors(): void {
    if (this.errors.size <= this.maxErrors) {
      return;
    }

    // Remove oldest errors by firstSeen
    const entries = Array.from(this.errors.entries()).sort(
      ([, a], [, b]) => a.firstSeen.getTime() - b.firstSeen.getTime()
    );

    const toRemove = entries.slice(0, entries.length - this.maxErrors);
    for (const [key] of toRemove) {
      this.errors.delete(key);
    }
  }

  /**
   * Notify alert callbacks
   */
  private notifyAlertCallbacks(entry: ErrorTrackingEntry): void {
    for (const callback of this.alertCallbacks) {
      try {
        callback(entry);
      } catch {
        // Ignore callback errors
      }
    }
  }

  /**
   * Register an alert callback
   */
  onError(callback: (entry: ErrorTrackingEntry) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Remove an alert callback
   */
  offError(callback: (entry: ErrorTrackingEntry) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index !== -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Get error by ID
   */
  getError(id: string): ErrorTrackingEntry | undefined {
    for (const entry of this.errors.values()) {
      if (entry.id === id) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Get all tracked errors
   */
  getAllErrors(): ErrorTrackingEntry[] {
    return Array.from(this.errors.values());
  }

  /**
   * Get recent errors
   */
  getRecentErrors(options?: {
    limit?: number;
    since?: Date;
    component?: string;
  }): ErrorTrackingEntry[] {
    let filtered = this.recentErrors;

    if (options?.since) {
      const since = options.since;
      filtered = filtered.filter((e) => e.timestamp >= since);
    }
    if (options?.component) {
      filtered = filtered.filter((e) => e.component === options.component);
    }
    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Get error count by component
   */
  getErrorCountByComponent(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const entry of this.errors.values()) {
      counts[entry.component] = (counts[entry.component] ?? 0) + entry.count;
    }
    return counts;
  }

  /**
   * Get error count by name
   */
  getErrorCountByName(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const entry of this.errors.values()) {
      counts[entry.name] = (counts[entry.name] ?? 0) + entry.count;
    }
    return counts;
  }

  /**
   * Get total error count
   */
  getTotalErrorCount(): number {
    let total = 0;
    for (const entry of this.errors.values()) {
      total += entry.count;
    }
    return total;
  }

  /**
   * Get error rate (errors per minute) over a time window
   */
  getErrorRate(windowMinutes: number = 5): number {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    const recentCount = this.recentErrors.filter((e) => e.timestamp >= windowStart).length;
    return recentCount / windowMinutes;
  }

  /**
   * Get top errors by count
   */
  getTopErrors(limit: number = 10): ErrorTrackingEntry[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Clear all tracked errors
   */
  clear(): void {
    this.errors.clear();
    this.recentErrors = [];
  }

  /**
   * Clear errors older than a given date
   */
  clearOlderThan(date: Date): number {
    let cleared = 0;
    for (const [key, entry] of this.errors) {
      if (entry.lastSeen < date) {
        this.errors.delete(key);
        cleared++;
      }
    }
    this.recentErrors = this.recentErrors.filter((e) => e.timestamp >= date);
    return cleared;
  }

  /**
   * Export error summary
   */
  exportSummary(): {
    totalUniqueErrors: number;
    totalErrorCount: number;
    errorsByComponent: Record<string, number>;
    errorsByName: Record<string, number>;
    topErrors: ErrorTrackingEntry[];
    errorRate: number;
  } {
    return {
      totalUniqueErrors: this.errors.size,
      totalErrorCount: this.getTotalErrorCount(),
      errorsByComponent: this.getErrorCountByComponent(),
      errorsByName: this.getErrorCountByName(),
      topErrors: this.getTopErrors(5),
      errorRate: this.getErrorRate(),
    };
  }
}

/**
 * Global error tracker instance
 */
export const errorTracker = new ErrorTracker();
