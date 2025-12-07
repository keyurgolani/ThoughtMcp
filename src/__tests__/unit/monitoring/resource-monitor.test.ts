/**
 * Tests for Resource Monitor
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ResourceMonitor } from "../../../monitoring/resource-monitor.js";

describe("ResourceMonitor", () => {
  let monitor: ResourceMonitor;

  beforeEach(() => {
    monitor = new ResourceMonitor({ maxSnapshots: 100 });
  });

  afterEach(() => {
    monitor.stop();
  });

  describe("Current Metrics", () => {
    it("should get current system metrics", () => {
      const metrics = monitor.getCurrentMetrics();

      expect(metrics.memoryUsed).toBeGreaterThan(0);
      expect(metrics.memoryTotal).toBeGreaterThan(0);
      expect(metrics.heapUsed).toBeGreaterThan(0);
      expect(metrics.heapTotal).toBeGreaterThan(0);
    });

    it("should include CPU usage", () => {
      // First call initializes CPU tracking
      monitor.getCurrentMetrics();
      // Second call calculates actual CPU usage
      const metrics = monitor.getCurrentMetrics();

      expect(metrics.cpuUsage).toBeDefined();
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsage).toBeLessThanOrEqual(100);
    });

    it("should include database connections when configured", () => {
      monitor.setDatabaseConnectionsFn(() => ({ active: 5, idle: 15 }));
      const metrics = monitor.getCurrentMetrics();

      expect(metrics.dbConnectionsActive).toBe(5);
      expect(metrics.dbConnectionsIdle).toBe(15);
    });

    it("should handle database connection errors gracefully", () => {
      monitor.setDatabaseConnectionsFn(() => {
        throw new Error("Connection error");
      });
      const metrics = monitor.getCurrentMetrics();

      // Should not throw, just omit DB metrics
      expect(metrics.memoryUsed).toBeGreaterThan(0);
    });
  });

  describe("Snapshots", () => {
    it("should take a snapshot", () => {
      const snapshot = monitor.takeSnapshot();

      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot.metrics.memoryUsed).toBeGreaterThan(0);
    });

    it("should store snapshots", () => {
      monitor.takeSnapshot();
      monitor.takeSnapshot();
      monitor.takeSnapshot();

      const snapshots = monitor.getSnapshots();
      expect(snapshots.length).toBe(3);
    });

    it("should limit snapshot history", () => {
      const smallMonitor = new ResourceMonitor({ maxSnapshots: 3 });

      for (let i = 0; i < 10; i++) {
        smallMonitor.takeSnapshot();
      }

      expect(smallMonitor.getSnapshots().length).toBe(3);
    });

    it("should get snapshots in time range", async () => {
      monitor.takeSnapshot();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const start = new Date();
      monitor.takeSnapshot();
      monitor.takeSnapshot();
      const end = new Date();
      await new Promise((resolve) => setTimeout(resolve, 10));
      monitor.takeSnapshot();

      const rangeSnapshots = monitor.getSnapshotsInRange(start, end);
      expect(rangeSnapshots.length).toBe(2);
    });
  });

  describe("Periodic Monitoring", () => {
    it("should start periodic monitoring", async () => {
      monitor.start(50); // 50ms interval for testing
      expect(monitor.isRunning()).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 120));
      monitor.stop();

      // Should have at least 2 snapshots (initial + 1 interval)
      expect(monitor.getSnapshots().length).toBeGreaterThanOrEqual(2);
    });

    it("should stop periodic monitoring", () => {
      monitor.start(50);
      expect(monitor.isRunning()).toBe(true);

      monitor.stop();
      expect(monitor.isRunning()).toBe(false);
    });

    it("should not start if already running", () => {
      monitor.start(50);
      const initialSnapshots = monitor.getSnapshots().length;

      monitor.start(50); // Should be ignored
      expect(monitor.getSnapshots().length).toBe(initialSnapshots);
    });
  });

  describe("Average Metrics", () => {
    it("should calculate average metrics over time window", () => {
      // Take multiple snapshots
      for (let i = 0; i < 5; i++) {
        monitor.takeSnapshot();
      }

      const avg = monitor.getAverageMetrics(5);
      expect(avg).not.toBeNull();
      expect(avg!.memoryUsed).toBeGreaterThan(0);
      expect(avg!.heapUsed).toBeGreaterThan(0);
    });

    it("should return null when no snapshots in window", () => {
      const avg = monitor.getAverageMetrics(5);
      expect(avg).toBeNull();
    });
  });

  describe("Peak Metrics", () => {
    it("should calculate peak metrics over time window", () => {
      // Take multiple snapshots
      for (let i = 0; i < 5; i++) {
        monitor.takeSnapshot();
      }

      const peak = monitor.getPeakMetrics(5);
      expect(peak).not.toBeNull();
      expect(peak!.memoryUsed).toBeGreaterThan(0);
    });

    it("should return null when no snapshots in window", () => {
      const peak = monitor.getPeakMetrics(5);
      expect(peak).toBeNull();
    });
  });

  describe("Clear", () => {
    it("should clear all snapshots", () => {
      monitor.takeSnapshot();
      monitor.takeSnapshot();

      monitor.clear();
      expect(monitor.getSnapshots().length).toBe(0);
    });
  });
});
