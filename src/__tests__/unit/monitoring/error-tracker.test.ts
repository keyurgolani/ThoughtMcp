/**
 * Tests for Error Tracker
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorTracker } from "../../../monitoring/error-tracker.js";

describe("ErrorTracker", () => {
  let tracker: ErrorTracker;

  beforeEach(() => {
    tracker = new ErrorTracker({ maxErrors: 50, maxRecentErrors: 100 });
  });

  describe("Error Tracking", () => {
    it("should track an error", () => {
      const error = new Error("Test error");
      const entry = tracker.trackError(error, { component: "test" });

      expect(entry.name).toBe("Error");
      expect(entry.message).toBe("Test error");
      expect(entry.component).toBe("test");
      expect(entry.count).toBe(1);
    });

    it("should include stack trace", () => {
      const error = new Error("Test error");
      const entry = tracker.trackError(error, { component: "test" });

      expect(entry.stack).toBeDefined();
      expect(entry.stack).toContain("Error: Test error");
    });

    it("should include operation and trace ID", () => {
      const error = new Error("Test error");
      const entry = tracker.trackError(error, {
        component: "test",
        operation: "test.operation",
        traceId: "trace-123",
      });

      expect(entry.operation).toBe("test.operation");
      expect(entry.traceId).toBe("trace-123");
    });

    it("should include context", () => {
      const error = new Error("Test error");
      const entry = tracker.trackError(error, {
        component: "test",
        context: { userId: "user-123", action: "create" },
      });

      expect(entry.context).toEqual({ userId: "user-123", action: "create" });
    });

    it("should deduplicate errors by fingerprint", () => {
      const error1 = new Error("Same error");
      const error2 = new Error("Same error");

      tracker.trackError(error1, { component: "test" });
      tracker.trackError(error2, { component: "test" });

      const allErrors = tracker.getAllErrors();
      expect(allErrors.length).toBe(1);
      expect(allErrors[0].count).toBe(2);
    });

    it("should track different errors separately", () => {
      tracker.trackError(new Error("Error 1"), { component: "test" });
      tracker.trackError(new Error("Error 2"), { component: "test" });

      const allErrors = tracker.getAllErrors();
      expect(allErrors.length).toBe(2);
    });

    it("should update lastSeen on duplicate errors", async () => {
      const error = new Error("Test error");
      const entry1 = tracker.trackError(error, { component: "test" });
      const firstSeen = entry1.firstSeen;

      await new Promise((resolve) => setTimeout(resolve, 10));
      const entry2 = tracker.trackError(error, { component: "test" });

      expect(entry2.firstSeen.getTime()).toBe(firstSeen.getTime());
      expect(entry2.lastSeen.getTime()).toBeGreaterThan(firstSeen.getTime());
    });
  });

  describe("Error Retrieval", () => {
    it("should get error by ID", () => {
      const error = new Error("Test error");
      const entry = tracker.trackError(error, { component: "test" });

      const retrieved = tracker.getError(entry.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.message).toBe("Test error");
    });

    it("should return undefined for non-existent ID", () => {
      expect(tracker.getError("non-existent")).toBeUndefined();
    });

    it("should get all errors", () => {
      tracker.trackError(new Error("Error 1"), { component: "test" });
      tracker.trackError(new Error("Error 2"), { component: "test" });

      const allErrors = tracker.getAllErrors();
      expect(allErrors.length).toBe(2);
    });

    it("should get recent errors", () => {
      tracker.trackError(new Error("Error 1"), { component: "test" });
      tracker.trackError(new Error("Error 2"), { component: "test" });

      const recent = tracker.getRecentErrors({ limit: 1 });
      expect(recent.length).toBe(1);
    });

    it("should filter recent errors by component", () => {
      tracker.trackError(new Error("Error 1"), { component: "db" });
      tracker.trackError(new Error("Error 2"), { component: "cache" });

      const dbErrors = tracker.getRecentErrors({ component: "db" });
      expect(dbErrors.length).toBe(1);
      expect(dbErrors[0].component).toBe("db");
    });

    it("should filter recent errors by time", async () => {
      tracker.trackError(new Error("Old error"), { component: "test" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      const since = new Date();
      tracker.trackError(new Error("New error"), { component: "test" });

      const recent = tracker.getRecentErrors({ since });
      expect(recent.length).toBe(1);
      expect(recent[0].message).toBe("New error");
    });
  });

  describe("Error Statistics", () => {
    it("should count errors by component", () => {
      tracker.trackError(new Error("Error 1"), { component: "db" });
      tracker.trackError(new Error("Error 2"), { component: "db" });
      tracker.trackError(new Error("Error 3"), { component: "cache" });

      const counts = tracker.getErrorCountByComponent();
      expect(counts.db).toBe(2);
      expect(counts.cache).toBe(1);
    });

    it("should count errors by name", () => {
      tracker.trackError(new TypeError("Type error"), { component: "test" });
      tracker.trackError(new RangeError("Range error"), { component: "test" });
      tracker.trackError(new TypeError("Another type error"), { component: "test" });

      const counts = tracker.getErrorCountByName();
      expect(counts.TypeError).toBe(2);
      expect(counts.RangeError).toBe(1);
    });

    it("should get total error count", () => {
      tracker.trackError(new Error("Error 1"), { component: "test" });
      tracker.trackError(new Error("Error 1"), { component: "test" }); // Duplicate
      tracker.trackError(new Error("Error 2"), { component: "test" });

      expect(tracker.getTotalErrorCount()).toBe(3);
    });

    it("should calculate error rate", () => {
      // Track some errors
      for (let i = 0; i < 10; i++) {
        tracker.trackError(new Error(`Error ${i}`), { component: "test" });
      }

      const rate = tracker.getErrorRate(5); // 5 minute window
      expect(rate).toBeGreaterThan(0);
    });

    it("should get top errors by count", () => {
      for (let i = 0; i < 5; i++) {
        tracker.trackError(new Error("Common error"), { component: "test" });
      }
      tracker.trackError(new Error("Rare error"), { component: "test" });

      const topErrors = tracker.getTopErrors(1);
      expect(topErrors.length).toBe(1);
      expect(topErrors[0].message).toBe("Common error");
      expect(topErrors[0].count).toBe(5);
    });
  });

  describe("Alert Callbacks", () => {
    it("should call alert callback on new error", () => {
      const callback = vi.fn();
      tracker.onError(callback);

      tracker.trackError(new Error("Test error"), { component: "test" });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].message).toBe("Test error");
    });

    it("should call alert callback on duplicate error", () => {
      const callback = vi.fn();
      tracker.onError(callback);

      tracker.trackError(new Error("Test error"), { component: "test" });
      tracker.trackError(new Error("Test error"), { component: "test" });

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should remove alert callback", () => {
      const callback = vi.fn();
      tracker.onError(callback);
      tracker.offError(callback);

      tracker.trackError(new Error("Test error"), { component: "test" });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("Error Cleanup", () => {
    it("should clear all errors", () => {
      tracker.trackError(new Error("Error 1"), { component: "test" });
      tracker.trackError(new Error("Error 2"), { component: "test" });

      tracker.clear();

      expect(tracker.getAllErrors().length).toBe(0);
      expect(tracker.getRecentErrors().length).toBe(0);
    });

    it("should clear errors older than date", async () => {
      tracker.trackError(new Error("Old error"), { component: "test" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      const cutoff = new Date();
      tracker.trackError(new Error("New error"), { component: "test" });

      const cleared = tracker.clearOlderThan(cutoff);
      expect(cleared).toBe(1);
      expect(tracker.getAllErrors().length).toBe(1);
    });

    it("should limit max errors", () => {
      const smallTracker = new ErrorTracker({ maxErrors: 3 });

      for (let i = 0; i < 10; i++) {
        smallTracker.trackError(new Error(`Error ${i}`), { component: "test" });
      }

      expect(smallTracker.getAllErrors().length).toBe(3);
    });
  });

  describe("Error Summary Export", () => {
    it("should export error summary", () => {
      tracker.trackError(new Error("Error 1"), { component: "db" });
      tracker.trackError(new Error("Error 2"), { component: "cache" });

      const summary = tracker.exportSummary();

      expect(summary.totalUniqueErrors).toBe(2);
      expect(summary.totalErrorCount).toBe(2);
      expect(summary.errorsByComponent).toHaveProperty("db");
      expect(summary.errorsByComponent).toHaveProperty("cache");
      expect(summary.topErrors.length).toBeLessThanOrEqual(5);
      expect(typeof summary.errorRate).toBe("number");
    });
  });
});
