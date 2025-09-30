/**
 * Tests for StreamSynchronizationManager
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StreamSynchronizationManager } from "../../cognitive/StreamSynchronizationManager.js";
import { AnalyticalReasoningStream } from "../../cognitive/streams/AnalyticalReasoningStream.js";
import { CreativeReasoningStream } from "../../cognitive/streams/CreativeReasoningStream.js";
import { ReasoningStream } from "../../interfaces/parallel-reasoning.js";

describe("StreamSynchronizationManager", () => {
  let manager: StreamSynchronizationManager;
  let testStreams: ReasoningStream[];

  beforeEach(async () => {
    manager = new StreamSynchronizationManager();

    // Create test streams
    const analyticalStream = new AnalyticalReasoningStream("test_analytical");
    const creativeStream = new CreativeReasoningStream("test_creative");

    await analyticalStream.initialize();
    await creativeStream.initialize();

    testStreams = [analyticalStream, creativeStream];
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await manager.initialize();

      const status = manager.getCoordinationStatus();
      expect(status.active_streams).toBe(0);
      expect(status.coordination_efficiency).toBe(1.0);
    });

    it("should handle multiple initializations gracefully", async () => {
      await manager.initialize();
      await manager.initialize(); // Should not throw

      const status = manager.getCoordinationStatus();
      expect(status).toBeDefined();
    });
  });

  describe("synchronization scheduling", () => {
    it("should schedule synchronization with streams", async () => {
      await manager.initialize();
      await manager.scheduleSynchronization(testStreams, 1000);

      const status = manager.getCoordinationStatus();
      expect(status.active_streams).toBe(testStreams.length);
    });

    it("should handle different synchronization intervals", async () => {
      await manager.initialize();

      // Test with different intervals
      await manager.scheduleSynchronization(testStreams, 500);
      let status = manager.getCoordinationStatus();
      expect(status.active_streams).toBe(testStreams.length);

      await manager.scheduleSynchronization(testStreams, 2000);
      status = manager.getCoordinationStatus();
      expect(status.active_streams).toBe(testStreams.length);
    });
  });

  describe("synchronization execution", () => {
    it("should execute synchronization successfully", async () => {
      await manager.initialize();

      const syncPoint = await manager.executeSynchronization(testStreams);

      expect(syncPoint).toBeDefined();
      expect(syncPoint.timestamp).toBeGreaterThan(0);
      expect(syncPoint.participating_streams).toHaveLength(testStreams.length);
      expect(syncPoint.shared_insights).toBeDefined();
      expect(syncPoint.coordination_type).toBeDefined();
    });

    it("should track synchronization points", async () => {
      await manager.initialize();

      await manager.executeSynchronization(testStreams);
      await manager.executeSynchronization(testStreams);

      const history = manager.getSynchronizationHistory();
      expect(history.length).toBe(2);

      const status = manager.getCoordinationStatus();
      expect(status.synchronization_points).toBe(2);
    });
  });

  describe("real-time coordination", () => {
    it("should enable real-time coordination", async () => {
      await manager.initialize();
      await manager.enableRealTimeCoordination(testStreams);

      const status = manager.getCoordinationStatus();
      expect(status.active_streams).toBe(testStreams.length);
    });

    it("should handle information sharing", async () => {
      await manager.initialize();
      await manager.enableRealTimeCoordination(testStreams);

      const fromStream = testStreams[0].id;
      const toStream = testStreams[1].id;
      const information = "Test insight from analytical stream";

      await manager.shareInformation(fromStream, toStream, information);

      const sharingLog = manager.getInformationSharingLog();
      expect(sharingLog.length).toBe(1);
      expect(sharingLog[0].from_stream).toBe(fromStream);
      expect(sharingLog[0].to_stream).toBe(toStream);
      expect(sharingLog[0].shared_information).toBe(information);
    });

    it("should validate stream IDs for information sharing", async () => {
      await manager.initialize();
      await manager.enableRealTimeCoordination(testStreams);

      await expect(
        manager.shareInformation("invalid_id", testStreams[0].id, "test")
      ).rejects.toThrow("Invalid stream IDs");

      await expect(
        manager.shareInformation(testStreams[0].id, "invalid_id", "test")
      ).rejects.toThrow("Invalid stream IDs");
    });
  });

  describe("conflict monitoring", () => {
    it("should monitor conflicts successfully", async () => {
      await manager.initialize();

      const conflicts = await manager.monitorConflicts(testStreams);

      expect(Array.isArray(conflicts)).toBe(true);
      // Conflicts may or may not exist depending on stream states
    });

    it("should detect processing time conflicts", async () => {
      await manager.initialize();

      // Mock a stream with old last activity to simulate long processing
      const mockStream = {
        ...testStreams[0],
        getStatus: () => ({
          stream_id: testStreams[0].id,
          active: true,
          processing: true,
          last_activity: Date.now() - 10000, // 10 seconds ago
          error: undefined,
        }),
      } as ReasoningStream;

      const conflicts = await manager.monitorConflicts([mockStream]);

      // Should detect long-running stream conflict
      const timeConflicts = conflicts.filter((c) =>
        c.description.includes("processing time")
      );
      expect(timeConflicts.length).toBeGreaterThan(0);
    });

    it("should detect error conflicts", async () => {
      await manager.initialize();

      // Mock a stream with error
      const mockStream = {
        ...testStreams[0],
        getStatus: () => ({
          stream_id: testStreams[0].id,
          active: true,
          processing: false,
          last_activity: Date.now(),
          error: "Test error",
        }),
      } as ReasoningStream;

      const conflicts = await manager.monitorConflicts([mockStream]);

      // Should detect error conflict
      const errorConflicts = conflicts.filter((c) =>
        c.description.includes("errors")
      );
      expect(errorConflicts.length).toBeGreaterThan(0);
    });
  });

  describe("conflict resolution", () => {
    it("should facilitate conflict resolution", async () => {
      await manager.initialize();

      const testConflict = {
        stream_ids: [testStreams[0].id, testStreams[1].id],
        conflict_type: "reasoning" as const,
        description: "Test conflict",
        severity: 0.5,
      };

      const resolution = await manager.facilitateResolution(
        testConflict,
        testStreams
      );

      expect(resolution).toBeDefined();
      expect(resolution.conflicting_streams).toEqual(testConflict.stream_ids);
      expect(resolution.conflict_description).toBe(testConflict.description);
      expect(resolution.resolution_strategy).toBeDefined();
      expect(resolution.resolved_conclusion).toBeDefined();
      expect(resolution.confidence).toBeGreaterThan(0);
      expect(resolution.confidence).toBeLessThanOrEqual(1);
    });

    it("should handle different conflict types", async () => {
      await manager.initialize();

      const processingConflict = {
        stream_ids: [testStreams[0].id],
        conflict_type: "reasoning" as const,
        description: "Streams exceeding expected processing time",
        severity: 0.6,
      };

      const resolution = await manager.facilitateResolution(
        processingConflict,
        testStreams
      );

      expect(resolution.resolution_strategy).toContain("Timeout management");
    });
  });

  describe("coordination status", () => {
    it("should provide accurate coordination status", async () => {
      await manager.initialize();

      let status = manager.getCoordinationStatus();
      expect(status.active_streams).toBe(0);
      expect(status.synchronization_points).toBe(0);
      expect(status.conflicts_detected).toBe(0);
      expect(status.conflicts_resolved).toBe(0);
      expect(status.coordination_efficiency).toBe(1.0);

      // After scheduling synchronization
      await manager.scheduleSynchronization(testStreams, 1000);
      status = manager.getCoordinationStatus();
      expect(status.active_streams).toBe(testStreams.length);
    });

    it("should update status after operations", async () => {
      await manager.initialize();
      await manager.scheduleSynchronization(testStreams, 1000);

      // Execute synchronization
      await manager.executeSynchronization(testStreams);

      const status = manager.getCoordinationStatus();
      expect(status.synchronization_points).toBe(1);
      expect(status.last_synchronization).toBeGreaterThan(0);
    });
  });

  describe("performance monitoring", () => {
    it("should track average response time", async () => {
      await manager.initialize();

      // Execute multiple synchronizations
      await manager.executeSynchronization(testStreams);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
      await manager.executeSynchronization(testStreams);

      const avgResponseTime = manager.getAverageResponseTime();
      expect(avgResponseTime).toBeGreaterThan(0);
    });

    it("should calculate conflict resolution rate", async () => {
      await manager.initialize();

      // Initially should be 1.0 (no conflicts = perfect resolution)
      let resolutionRate = manager.getConflictResolutionRate();
      expect(resolutionRate).toBe(1.0);

      // After detecting conflicts but not resolving them
      const conflicts = await manager.monitorConflicts(testStreams);
      if (conflicts.length > 0) {
        resolutionRate = manager.getConflictResolutionRate();
        expect(resolutionRate).toBeLessThan(1.0);
      }
    });

    it("should track information sharing rate", async () => {
      await manager.initialize();
      await manager.enableRealTimeCoordination(testStreams);

      // Share some information
      await manager.shareInformation(
        testStreams[0].id,
        testStreams[1].id,
        "Test information"
      );

      const sharingRate = manager.getInformationSharingRate();
      expect(sharingRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe("shutdown", () => {
    it("should shutdown gracefully", async () => {
      await manager.initialize();
      await manager.scheduleSynchronization(testStreams, 1000);

      await manager.shutdown();

      const status = manager.getCoordinationStatus();
      expect(status.active_streams).toBe(0);
    });

    it("should clear timers on shutdown", async () => {
      await manager.initialize();
      await manager.scheduleSynchronization(testStreams, 100); // Short interval

      // Let it run briefly
      await new Promise((resolve) => setTimeout(resolve, 150));

      await manager.shutdown();

      // Should not continue synchronizing after shutdown
      const initialSyncCount =
        manager.getCoordinationStatus().synchronization_points;
      await new Promise((resolve) => setTimeout(resolve, 200));
      const finalSyncCount =
        manager.getCoordinationStatus().synchronization_points;

      expect(finalSyncCount).toBe(initialSyncCount);
    });
  });

  describe("history tracking", () => {
    it("should maintain synchronization history", async () => {
      await manager.initialize();

      await manager.executeSynchronization(testStreams);
      await manager.executeSynchronization(testStreams);

      const history = manager.getSynchronizationHistory();
      expect(history.length).toBe(2);

      // History should be ordered by timestamp
      expect(history[1].timestamp).toBeGreaterThanOrEqual(history[0].timestamp);
    });

    it("should maintain information sharing log", async () => {
      await manager.initialize();
      await manager.enableRealTimeCoordination(testStreams);

      await manager.shareInformation(
        testStreams[0].id,
        testStreams[1].id,
        "Info 1"
      );
      await manager.shareInformation(
        testStreams[1].id,
        testStreams[0].id,
        "Info 2"
      );

      const log = manager.getInformationSharingLog();
      expect(log.length).toBe(2);
      expect(log[0].shared_information).toBe("Info 1");
      expect(log[1].shared_information).toBe("Info 2");
    });

    it("should maintain conflict history", async () => {
      await manager.initialize();

      const testConflict = {
        stream_ids: [testStreams[0].id],
        conflict_type: "reasoning" as const,
        description: "Test conflict",
        severity: 0.5,
      };

      await manager.facilitateResolution(testConflict, testStreams);

      const history = manager.getConflictHistory();
      expect(history.detected.length).toBeGreaterThan(0);
      expect(history.resolved.length).toBeGreaterThan(0);
    });
  });
});
