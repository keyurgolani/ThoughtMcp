/**
 * Search Analytics Tracker
 *
 * Tracks search execution analytics with in-memory storage.
 * Provides methods to record, retrieve, and analyze search performance.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { DatabaseConnectionManager } from "../database/connection-manager";
import type { SearchAnalytics, AnalyticsSummary, SearchStrategy } from "./types";

/**
 * SearchAnalyticsTracker class for tracking search analytics
 */
export class SearchAnalyticsTracker {
  private readonly retentionDays: number;
  private readonly analytics: SearchAnalytics[];

  /**
   * Create a new SearchAnalyticsTracker
   *
   * @param _db - Database connection manager (reserved for future use)
   * @param retentionDays - Number of days to retain analytics data (default: 30)
   */
  constructor(_db: DatabaseConnectionManager, retentionDays: number = 30) {
    this.retentionDays = retentionDays;
    this.analytics = [];
  }

  /**
   * Track a search execution
   *
   * @param analytics - Search analytics data to track
   */
  trackSearch(analytics: SearchAnalytics): void {
    this.analytics.push(analytics);
  }

  /**
   * Get analytics for a date range
   *
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @returns Array of analytics within the date range
   */
  getAnalytics(startDate: Date, endDate: Date): SearchAnalytics[] {
    return this.analytics.filter((a) => {
      const timestamp = a.timestamp.getTime();
      return timestamp >= startDate.getTime() && timestamp <= endDate.getTime();
    });
  }

  /**
   * Get summary statistics for a date range
   *
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @returns Summary statistics
   */
  getSummary(startDate: Date, endDate: Date): AnalyticsSummary {
    const rangeAnalytics = this.getAnalytics(startDate, endDate);

    if (rangeAnalytics.length === 0) {
      return {
        totalSearches: 0,
        avgExecutionTimeMs: 0,
        cacheHitRate: 0,
        strategiesUsed: {} as Record<SearchStrategy, number>,
        avgResultsCount: 0,
        topQueries: [],
      };
    }

    // Calculate total searches
    const totalSearches = rangeAnalytics.length;

    // Calculate average execution time
    const totalExecutionTime = rangeAnalytics.reduce((sum, a) => sum + a.executionTimeMs, 0);
    const avgExecutionTimeMs = totalExecutionTime / totalSearches;

    // Calculate cache hit rate
    const cacheHits = rangeAnalytics.filter((a) => a.cacheHit).length;
    const cacheHitRate = cacheHits / totalSearches;

    // Count strategies used
    const strategiesUsed: Record<SearchStrategy, number> = {} as Record<SearchStrategy, number>;
    rangeAnalytics.forEach((a) => {
      a.strategiesUsed.forEach((strategy) => {
        strategiesUsed[strategy] = (strategiesUsed[strategy] || 0) + 1;
      });
    });

    // Calculate average results count
    const totalResults = rangeAnalytics.reduce((sum, a) => sum + a.resultsCount, 0);
    const avgResultsCount = totalResults / totalSearches;

    // Find top queries
    const queryCount = new Map<string, number>();
    rangeAnalytics.forEach((a) => {
      const queryText = a.query.text ?? "";
      if (queryText) {
        queryCount.set(queryText, (queryCount.get(queryText) ?? 0) + 1);
      }
    });

    const topQueries = Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalSearches,
      avgExecutionTimeMs,
      cacheHitRate,
      strategiesUsed,
      avgResultsCount,
      topQueries,
    };
  }

  /**
   * Clean up old analytics data beyond retention period
   *
   * @returns Number of analytics entries removed
   */
  cleanup(): number {
    const now = Date.now();
    const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = now - retentionMs;

    const initialLength = this.analytics.length;

    // Remove analytics older than retention period
    let i = 0;
    while (i < this.analytics.length) {
      if (this.analytics[i].timestamp.getTime() < cutoffTime) {
        this.analytics.splice(i, 1);
      } else {
        i++;
      }
    }

    return initialLength - this.analytics.length;
  }
}
