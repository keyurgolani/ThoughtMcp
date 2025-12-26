/**
 * Unit Tests for SearchAnalyticsTracker
 *
 * Tests search analytics tracking with in-memory storage.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchAnalyticsTracker } from "../../../search/search-analytics";
import type { SearchAnalytics, IntegratedSearchQuery } from "../../../search/types";

describe("SearchAnalyticsTracker", () => {
  let tracker: SearchAnalyticsTracker;
  let mockDb: any;

  const mockQuery: IntegratedSearchQuery = {
    text: "test query",
    limit: 10,
  };

  const mockAnalytics: SearchAnalytics = {
    queryId: "query-001",
    query: mockQuery,
    strategiesUsed: ["full-text", "vector"],
    executionTimeMs: 150,
    resultsCount: 5,
    cacheHit: false,
    timestamp: new Date("2024-11-13T10:00:00Z"),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-11-13T10:00:00Z"));

    mockDb = {
      query: vi.fn(),
      getConnection: vi.fn(),
    };

    tracker = new SearchAnalyticsTracker(mockDb, 30); // 30 days retention
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Constructor", () => {
    it("should initialize with database connection and retention days", () => {
      expect(tracker).toBeDefined();
      expect(tracker).toBeInstanceOf(SearchAnalyticsTracker);
    });

    it("should use default retention days if not provided", () => {
      const defaultTracker = new SearchAnalyticsTracker(mockDb);
      expect(defaultTracker).toBeDefined();
    });
  });

  describe("trackSearch()", () => {
    it("should store analytics data", () => {
      tracker.trackSearch(mockAnalytics);

      const analytics = tracker.getAnalytics(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(analytics).toHaveLength(1);
      expect(analytics[0]).toEqual(mockAnalytics);
    });

    it("should store multiple analytics entries", () => {
      const analytics1: SearchAnalytics = { ...mockAnalytics, queryId: "query-001" };
      const analytics2: SearchAnalytics = { ...mockAnalytics, queryId: "query-002" };
      const analytics3: SearchAnalytics = { ...mockAnalytics, queryId: "query-003" };

      tracker.trackSearch(analytics1);
      tracker.trackSearch(analytics2);
      tracker.trackSearch(analytics3);

      const analytics = tracker.getAnalytics(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(analytics).toHaveLength(3);
    });

    it("should handle analytics with different timestamps", () => {
      const analytics1: SearchAnalytics = {
        ...mockAnalytics,
        queryId: "query-001",
        timestamp: new Date("2024-11-13T10:00:00Z"),
      };
      const analytics2: SearchAnalytics = {
        ...mockAnalytics,
        queryId: "query-002",
        timestamp: new Date("2024-11-13T15:00:00Z"),
      };

      tracker.trackSearch(analytics1);
      tracker.trackSearch(analytics2);

      const analytics = tracker.getAnalytics(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(analytics).toHaveLength(2);
    });
  });

  describe("getAnalytics()", () => {
    beforeEach(() => {
      // Add test data
      tracker.trackSearch({
        ...mockAnalytics,
        queryId: "query-001",
        timestamp: new Date("2024-11-13T10:00:00Z"),
      });
      tracker.trackSearch({
        ...mockAnalytics,
        queryId: "query-002",
        timestamp: new Date("2024-11-14T10:00:00Z"),
      });
      tracker.trackSearch({
        ...mockAnalytics,
        queryId: "query-003",
        timestamp: new Date("2024-11-15T10:00:00Z"),
      });
    });

    it("should retrieve analytics for date range", () => {
      const analytics = tracker.getAnalytics(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(analytics).toHaveLength(1);
      expect(analytics[0].queryId).toBe("query-001");
    });

    it("should retrieve analytics for multiple days", () => {
      const analytics = tracker.getAnalytics(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-14T23:59:59Z")
      );

      expect(analytics).toHaveLength(2);
      expect(analytics[0].queryId).toBe("query-001");
      expect(analytics[1].queryId).toBe("query-002");
    });

    it("should return empty array for date range with no data", () => {
      const analytics = tracker.getAnalytics(
        new Date("2024-11-01T00:00:00Z"),
        new Date("2024-11-02T23:59:59Z")
      );

      expect(analytics).toHaveLength(0);
    });

    it("should handle inclusive date ranges", () => {
      const analytics = tracker.getAnalytics(
        new Date("2024-11-13T10:00:00Z"),
        new Date("2024-11-13T10:00:00Z")
      );

      expect(analytics).toHaveLength(1);
    });
  });

  describe("getSummary()", () => {
    beforeEach(() => {
      // Add diverse test data
      tracker.trackSearch({
        queryId: "query-001",
        query: { text: "test query 1" },
        strategiesUsed: ["full-text"],
        executionTimeMs: 100,
        resultsCount: 5,
        cacheHit: false,
        timestamp: new Date("2024-11-13T10:00:00Z"),
      });
      tracker.trackSearch({
        queryId: "query-002",
        query: { text: "test query 2" },
        strategiesUsed: ["vector"],
        executionTimeMs: 200,
        resultsCount: 10,
        cacheHit: true,
        timestamp: new Date("2024-11-13T11:00:00Z"),
      });
      tracker.trackSearch({
        queryId: "query-003",
        query: { text: "test query 1" },
        strategiesUsed: ["full-text", "vector"],
        executionTimeMs: 150,
        resultsCount: 8,
        cacheHit: false,
        timestamp: new Date("2024-11-13T12:00:00Z"),
      });
    });

    it("should calculate total searches", () => {
      const summary = tracker.getSummary(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(summary.totalSearches).toBe(3);
    });

    it("should calculate average execution time", () => {
      const summary = tracker.getSummary(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(summary.avgExecutionTimeMs).toBe(150); // (100 + 200 + 150) / 3
    });

    it("should calculate cache hit rate", () => {
      const summary = tracker.getSummary(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(summary.cacheHitRate).toBeCloseTo(0.333, 2); // 1 hit out of 3
    });

    it("should count strategies used", () => {
      const summary = tracker.getSummary(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(summary.strategiesUsed["full-text"]).toBe(2);
      expect(summary.strategiesUsed["vector"]).toBe(2);
    });

    it("should calculate average results count", () => {
      const summary = tracker.getSummary(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(summary.avgResultsCount).toBeCloseTo(7.667, 2); // (5 + 10 + 8) / 3
    });

    it("should identify top queries", () => {
      const summary = tracker.getSummary(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(summary.topQueries).toHaveLength(2);
      expect(summary.topQueries[0]).toEqual({ query: "test query 1", count: 2 });
      expect(summary.topQueries[1]).toEqual({ query: "test query 2", count: 1 });
    });

    it("should return empty summary for date range with no data", () => {
      const summary = tracker.getSummary(
        new Date("2024-11-01T00:00:00Z"),
        new Date("2024-11-02T23:59:59Z")
      );

      expect(summary.totalSearches).toBe(0);
      expect(summary.avgExecutionTimeMs).toBe(0);
      expect(summary.cacheHitRate).toBe(0);
      expect(summary.avgResultsCount).toBe(0);
      expect(summary.topQueries).toHaveLength(0);
    });

    it("should handle summary for single search", () => {
      const singleTracker = new SearchAnalyticsTracker(mockDb, 30);
      singleTracker.trackSearch({
        queryId: "query-001",
        query: { text: "single query" },
        strategiesUsed: ["full-text"],
        executionTimeMs: 100,
        resultsCount: 5,
        cacheHit: true,
        timestamp: new Date("2024-11-13T10:00:00Z"),
      });

      const summary = singleTracker.getSummary(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(summary.totalSearches).toBe(1);
      expect(summary.avgExecutionTimeMs).toBe(100);
      expect(summary.cacheHitRate).toBe(1);
      expect(summary.avgResultsCount).toBe(5);
    });
  });

  describe("cleanup()", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date("2024-11-13T10:00:00Z"));

      // Add data with different ages
      tracker.trackSearch({
        ...mockAnalytics,
        queryId: "query-old",
        timestamp: new Date("2024-10-01T10:00:00Z"), // 43 days old
      });
      tracker.trackSearch({
        ...mockAnalytics,
        queryId: "query-recent",
        timestamp: new Date("2024-11-10T10:00:00Z"), // 3 days old
      });
      tracker.trackSearch({
        ...mockAnalytics,
        queryId: "query-today",
        timestamp: new Date("2024-11-13T10:00:00Z"), // today
      });
    });

    it("should remove analytics older than retention days", () => {
      const removed = tracker.cleanup();

      expect(removed).toBe(1); // Only the 43-day-old entry

      const allAnalytics = tracker.getAnalytics(
        new Date("2024-10-01T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(allAnalytics).toHaveLength(2);
      expect(allAnalytics.find((a) => a.queryId === "query-old")).toBeUndefined();
    });

    it("should keep analytics within retention period", () => {
      tracker.cleanup();

      const recentAnalytics = tracker.getAnalytics(
        new Date("2024-11-10T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(recentAnalytics).toHaveLength(2);
      expect(recentAnalytics.find((a) => a.queryId === "query-recent")).toBeDefined();
      expect(recentAnalytics.find((a) => a.queryId === "query-today")).toBeDefined();
    });

    it("should return 0 when no old data to remove", () => {
      // First cleanup removes old data
      tracker.cleanup();

      // Second cleanup should find nothing
      const removed = tracker.cleanup();
      expect(removed).toBe(0);
    });

    it("should handle empty analytics", () => {
      const emptyTracker = new SearchAnalyticsTracker(mockDb, 30);
      const removed = emptyTracker.cleanup();

      expect(removed).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle analytics with missing query text", () => {
      tracker.trackSearch({
        queryId: "query-001",
        query: { limit: 10 },
        strategiesUsed: ["vector"],
        executionTimeMs: 100,
        resultsCount: 5,
        cacheHit: false,
        timestamp: new Date("2024-11-13T10:00:00Z"),
      });

      const summary = tracker.getSummary(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(summary.totalSearches).toBe(1);
    });

    it("should handle analytics with empty strategies", () => {
      tracker.trackSearch({
        queryId: "query-001",
        query: { text: "test" },
        strategiesUsed: [],
        executionTimeMs: 100,
        resultsCount: 5,
        cacheHit: false,
        timestamp: new Date("2024-11-13T10:00:00Z"),
      });

      const summary = tracker.getSummary(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(summary.totalSearches).toBe(1);
    });

    it("should handle analytics with zero results", () => {
      tracker.trackSearch({
        queryId: "query-001",
        query: { text: "test" },
        strategiesUsed: ["full-text"],
        executionTimeMs: 100,
        resultsCount: 0,
        cacheHit: false,
        timestamp: new Date("2024-11-13T10:00:00Z"),
      });

      const summary = tracker.getSummary(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(summary.avgResultsCount).toBe(0);
    });

    it("should handle very large execution times", () => {
      tracker.trackSearch({
        queryId: "query-001",
        query: { text: "test" },
        strategiesUsed: ["full-text"],
        executionTimeMs: 999999,
        resultsCount: 5,
        cacheHit: false,
        timestamp: new Date("2024-11-13T10:00:00Z"),
      });

      const summary = tracker.getSummary(
        new Date("2024-11-13T00:00:00Z"),
        new Date("2024-11-13T23:59:59Z")
      );

      expect(summary.avgExecutionTimeMs).toBe(999999);
    });
  });
});
