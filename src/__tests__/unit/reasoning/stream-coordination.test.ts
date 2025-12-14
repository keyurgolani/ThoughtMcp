/**
 * Tests for Stream Coordination Manager
 *
 * Tests the coordination mechanisms for parallel reasoning streams including:
 * - Synchronization at 25%, 50%, 75% progress checkpoints
 * - Selective insight sharing (importance >0.7)
 * - Convergence prevention (diversity >0.7)
 * - Coordination overhead monitoring (<10%)
 * - Stream independence maintenance
 */

import { beforeEach, describe, expect, it } from "vitest";
import { StreamCoordinationManager } from "../../../reasoning/coordination-manager";
import type { ReasoningStream } from "../../../reasoning/stream";
import {
  StreamStatus,
  StreamType,
  type Insight,
  type StreamResult,
} from "../../../reasoning/types";

// Mock stream for testing
class MockReasoningStream implements ReasoningStream {
  public id: string;
  public type: StreamType;
  public processor: any;
  public timeout: number;
  private _progress: number = 0;
  private _insights: Insight[] = [];
  private _cancelled: boolean = false;

  constructor(type: StreamType, timeout: number = 10000) {
    this.id = `mock-${type}-${Date.now()}`;
    this.type = type;
    this.timeout = timeout;
    this.processor = { getStreamType: () => type };
  }

  async process(): Promise<StreamResult> {
    return {
      streamId: this.id,
      streamType: this.type,
      conclusion: `${this.type} conclusion`,
      reasoning: [`${this.type} reasoning`],
      insights: this._insights,
      confidence: 0.8,
      processingTime: 100,
      status: StreamStatus.COMPLETED,
    };
  }

  getProgress(): number {
    return this._progress;
  }

  setProgress(progress: number): void {
    this._progress = progress;
  }

  cancel(): void {
    this._cancelled = true;
  }

  isCancelled(): boolean {
    return this._cancelled;
  }

  addInsight(insight: Insight): void {
    this._insights.push(insight);
  }

  getInsights(): Insight[] {
    return this._insights;
  }
}

describe("StreamCoordinationManager", () => {
  let coordinator: StreamCoordinationManager;
  let streams: MockReasoningStream[];

  beforeEach(() => {
    // Create mock streams for each type
    streams = [
      new MockReasoningStream(StreamType.ANALYTICAL),
      new MockReasoningStream(StreamType.CREATIVE),
      new MockReasoningStream(StreamType.CRITICAL),
      new MockReasoningStream(StreamType.SYNTHETIC),
    ];

    // Instantiate coordinator
    coordinator = new StreamCoordinationManager();
  });

  describe("Synchronization at Progress Checkpoints", () => {
    it("should trigger synchronization at 25% progress", async () => {
      // Set all streams to 25% progress
      streams.forEach((stream) => stream.setProgress(0.25));

      // This should fail until StreamCoordinationManager is implemented
      expect(coordinator).toBeDefined();
      expect(typeof coordinator.synchronizeAtCheckpoint).toBe("function");

      const syncResult = await coordinator.synchronizeAtCheckpoint(streams, 0.25);
      expect(syncResult.synchronized).toBe(true);
      expect(syncResult.checkpoint).toBe(0.25);
    });

    it("should trigger synchronization at 50% progress", async () => {
      streams.forEach((stream) => stream.setProgress(0.5));

      expect(coordinator).toBeDefined();
      const syncResult = await coordinator.synchronizeAtCheckpoint(streams, 0.5);
      expect(syncResult.synchronized).toBe(true);
      expect(syncResult.checkpoint).toBe(0.5);
    });

    it("should trigger synchronization at 75% progress", async () => {
      streams.forEach((stream) => stream.setProgress(0.75));

      expect(coordinator).toBeDefined();
      const syncResult = await coordinator.synchronizeAtCheckpoint(streams, 0.75);
      expect(syncResult.synchronized).toBe(true);
      expect(syncResult.checkpoint).toBe(0.75);
    });

    it("should not trigger synchronization below checkpoint thresholds", async () => {
      // Set streams to 20% (below 25% checkpoint)
      streams.forEach((stream) => stream.setProgress(0.2));

      expect(coordinator).toBeDefined();
      const shouldSync = coordinator.shouldSynchronize(streams, 0.25);
      expect(shouldSync).toBe(false);
    });

    it("should handle streams progressing at different rates", async () => {
      // Set streams to different progress levels
      streams[0].setProgress(0.3);
      streams[1].setProgress(0.25);
      streams[2].setProgress(0.28);
      streams[3].setProgress(0.26);

      expect(coordinator).toBeDefined();
      // Should sync when all have passed 25%
      const shouldSync = coordinator.shouldSynchronize(streams, 0.25);
      expect(shouldSync).toBe(true);
    });

    it("should wait for all streams to reach checkpoint before proceeding", async () => {
      // Set 3 streams past checkpoint, 1 below
      streams[0].setProgress(0.3);
      streams[1].setProgress(0.28);
      streams[2].setProgress(0.26);
      streams[3].setProgress(0.2); // Below checkpoint

      expect(coordinator).toBeDefined();
      const shouldSync = coordinator.shouldSynchronize(streams, 0.25);
      expect(shouldSync).toBe(false); // Should not sync until all reach checkpoint
    });
  });

  describe("Selective Insight Sharing", () => {
    it("should return default share result when no sharing has occurred", () => {
      expect(coordinator).toBeDefined();
      const shareResult = coordinator.getLastShareResult();
      expect(shareResult.insightsShared).toBe(0);
      expect(shareResult.recipientStreams).toBe(0);
      expect(shareResult.shareTime).toBe(0);
    });

    it("should share insights with importance >0.7", async () => {
      // Add high-importance insight to analytical stream
      streams[0].addInsight({
        content: "Critical finding",
        source: StreamType.ANALYTICAL,
        confidence: 0.9,
        importance: 0.85,
      });

      expect(coordinator).toBeDefined();
      const sharedInsights = coordinator.filterHighImportanceInsights(streams);
      expect(sharedInsights.length).toBe(1);
      expect(sharedInsights[0].importance).toBeGreaterThan(0.7);
    });

    it("should not share insights with importance <=0.7", async () => {
      // Add low-importance insight
      streams[0].addInsight({
        content: "Minor observation",
        source: StreamType.ANALYTICAL,
        confidence: 0.6,
        importance: 0.5,
      });

      expect(coordinator).toBeDefined();
      const sharedInsights = coordinator.filterHighImportanceInsights(streams);
      expect(sharedInsights.length).toBe(0);
    });

    it("should filter insights by importance threshold", async () => {
      // Add mix of high and low importance insights
      streams[0].addInsight({
        content: "High importance",
        source: StreamType.ANALYTICAL,
        confidence: 0.9,
        importance: 0.85,
      });
      streams[1].addInsight({
        content: "Low importance",
        source: StreamType.CREATIVE,
        confidence: 0.7,
        importance: 0.6,
      });
      streams[2].addInsight({
        content: "Medium importance",
        source: StreamType.CRITICAL,
        confidence: 0.8,
        importance: 0.75,
      });

      expect(coordinator).toBeDefined();
      const sharedInsights = coordinator.filterHighImportanceInsights(streams);
      expect(sharedInsights.length).toBe(2); // Only >0.7
      expect(sharedInsights.every((i: Insight) => i.importance > 0.7)).toBe(true);
    });

    it("should distribute high-importance insights to all streams", async () => {
      streams[0].addInsight({
        content: "Critical finding",
        source: StreamType.ANALYTICAL,
        confidence: 0.9,
        importance: 0.85,
      });

      expect(coordinator).toBeDefined();
      await coordinator.shareInsights(streams);

      // All streams should have received the insight
      // (Implementation will add shared insights to stream context)
      const shareResult = coordinator.getLastShareResult();
      expect(shareResult.insightsShared).toBe(1);
      expect(shareResult.recipientStreams).toBe(4);
    });

    it("should preserve insight source attribution", async () => {
      streams[0].addInsight({
        content: "Analytical insight",
        source: StreamType.ANALYTICAL,
        confidence: 0.9,
        importance: 0.85,
      });

      expect(coordinator).toBeDefined();
      const sharedInsights = coordinator.filterHighImportanceInsights(streams);
      expect(sharedInsights[0].source).toBe(StreamType.ANALYTICAL);
    });

    it("should handle streams with no high-importance insights", async () => {
      // No insights added to any stream

      expect(coordinator).toBeDefined();
      const sharedInsights = coordinator.filterHighImportanceInsights(streams);
      expect(sharedInsights.length).toBe(0);

      // Should not error when sharing nothing
      await expect(coordinator.shareInsights(streams)).resolves.not.toThrow();
    });
  });

  describe("Convergence Prevention", () => {
    it("should detect when streams are converging", async () => {
      // Create stream results with similar conclusions
      const results: StreamResult[] = [
        {
          streamId: "1",
          streamType: StreamType.ANALYTICAL,
          conclusion: "The solution is to optimize the database",
          reasoning: [],
          insights: [],
          confidence: 0.8,
          processingTime: 100,
          status: StreamStatus.COMPLETED,
        },
        {
          streamId: "2",
          streamType: StreamType.CREATIVE,
          conclusion: "The solution is to optimize the database queries",
          reasoning: [],
          insights: [],
          confidence: 0.8,
          processingTime: 100,
          status: StreamStatus.COMPLETED,
        },
      ];

      expect(coordinator).toBeDefined();
      const diversity = coordinator.checkDiversity(results);
      expect(diversity).toBeLessThan(0.7); // Similar conclusions = low diversity
    });

    it("should handle empty conclusions correctly", async () => {
      // Test both conclusions empty
      const bothEmptyResults: StreamResult[] = [
        {
          streamId: "1",
          streamType: StreamType.ANALYTICAL,
          conclusion: "",
          reasoning: [],
          insights: [],
          confidence: 0.8,
          processingTime: 100,
          status: StreamStatus.COMPLETED,
        },
        {
          streamId: "2",
          streamType: StreamType.CREATIVE,
          conclusion: "",
          reasoning: [],
          insights: [],
          confidence: 0.8,
          processingTime: 100,
          status: StreamStatus.COMPLETED,
        },
      ];

      expect(coordinator).toBeDefined();
      const diversity = coordinator.checkDiversity(bothEmptyResults);
      expect(diversity).toBe(0); // Both empty = identical = 0 diversity
    });

    it("should handle one empty conclusion correctly", async () => {
      // Test one conclusion empty, one not
      const oneEmptyResults: StreamResult[] = [
        {
          streamId: "1",
          streamType: StreamType.ANALYTICAL,
          conclusion: "Some conclusion",
          reasoning: [],
          insights: [],
          confidence: 0.8,
          processingTime: 100,
          status: StreamStatus.COMPLETED,
        },
        {
          streamId: "2",
          streamType: StreamType.CREATIVE,
          conclusion: "",
          reasoning: [],
          insights: [],
          confidence: 0.8,
          processingTime: 100,
          status: StreamStatus.COMPLETED,
        },
      ];

      expect(coordinator).toBeDefined();
      const diversity = coordinator.checkDiversity(oneEmptyResults);
      expect(diversity).toBe(1.0); // One empty, one not = completely different = max diversity
    });

    it("should maintain diversity >0.7 between streams", async () => {
      // Create stream results with diverse conclusions
      const results: StreamResult[] = [
        {
          streamId: "1",
          streamType: StreamType.ANALYTICAL,
          conclusion: "Optimize database queries",
          reasoning: [],
          insights: [],
          confidence: 0.8,
          processingTime: 100,
          status: StreamStatus.COMPLETED,
        },
        {
          streamId: "2",
          streamType: StreamType.CREATIVE,
          conclusion: "Redesign user interface",
          reasoning: [],
          insights: [],
          confidence: 0.8,
          processingTime: 100,
          status: StreamStatus.COMPLETED,
        },
      ];

      expect(coordinator).toBeDefined();
      const diversity = coordinator.checkDiversity(results);
      expect(diversity).toBeGreaterThan(0.7); // Different conclusions = high diversity
    });

    it("should measure diversity using conclusion similarity", async () => {
      const results: StreamResult[] = [
        {
          streamId: "1",
          streamType: StreamType.ANALYTICAL,
          conclusion: "Solution A",
          reasoning: [],
          insights: [],
          confidence: 0.8,
          processingTime: 100,
          status: StreamStatus.COMPLETED,
        },
        {
          streamId: "2",
          streamType: StreamType.CREATIVE,
          conclusion: "Solution B",
          reasoning: [],
          insights: [],
          confidence: 0.8,
          processingTime: 100,
          status: StreamStatus.COMPLETED,
        },
      ];

      expect(coordinator).toBeDefined();
      const diversity = coordinator.checkDiversity(results);
      expect(typeof diversity).toBe("number");
      expect(diversity).toBeGreaterThanOrEqual(0);
      expect(diversity).toBeLessThanOrEqual(1);
    });

    it("should alert when diversity falls below threshold", async () => {
      const results: StreamResult[] = streams.map((s) => ({
        streamId: s.id,
        streamType: s.type,
        conclusion: "Same conclusion", // All identical
        reasoning: [],
        insights: [],
        confidence: 0.8,
        processingTime: 100,
        status: StreamStatus.COMPLETED,
      }));

      expect(coordinator).toBeDefined();
      const diversity = coordinator.checkDiversity(results);
      expect(diversity).toBeLessThan(0.7);

      const alert = coordinator.shouldAlertLowDiversity(diversity);
      expect(alert).toBe(true);
    });

    it("should allow natural convergence on correct solutions", async () => {
      // When confidence is high and conclusions similar, it's natural convergence
      const results: StreamResult[] = streams.map((s) => ({
        streamId: s.id,
        streamType: s.type,
        conclusion: "Correct solution",
        reasoning: [],
        insights: [],
        confidence: 0.95, // High confidence
        processingTime: 100,
        status: StreamStatus.COMPLETED,
      }));

      expect(coordinator).toBeDefined();
      const diversity = coordinator.checkDiversity(results);
      const isNaturalConvergence = coordinator.isNaturalConvergence(results, diversity);
      expect(isNaturalConvergence).toBe(true); // High confidence + low diversity = natural
    });
  });

  describe("Coordination Overhead Monitoring", () => {
    it("should handle zero total time gracefully", () => {
      expect(coordinator).toBeDefined();
      coordinator.recordCoordinationTime(50);
      const overhead = coordinator.measureCoordinationOverhead(0);
      expect(overhead).toBe(0);
    });

    it("should measure coordination overhead as percentage of total time", async () => {
      expect(coordinator).toBeDefined();

      // Simulate coordination activities
      const totalTime = 1000; // ms
      const coordinationTime = 50; // ms

      coordinator.recordCoordinationTime(coordinationTime);
      const overhead = coordinator.measureCoordinationOverhead(totalTime);

      expect(overhead).toBe(0.05); // 5%
      expect(overhead).toBeLessThan(0.1); // Below 10% target
    });

    it("should keep coordination overhead below 10%", async () => {
      expect(coordinator).toBeDefined();

      const totalTime = 1000;
      const coordinationTime = 80; // 8%

      coordinator.recordCoordinationTime(coordinationTime);
      const overhead = coordinator.measureCoordinationOverhead(totalTime);

      expect(overhead).toBeLessThan(0.1);
    });

    it("should track time spent in synchronization", async () => {
      expect(coordinator).toBeDefined();

      // Set streams to checkpoint first
      streams.forEach((stream) => stream.setProgress(0.25));

      await coordinator.synchronizeAtCheckpoint(streams, 0.25);
      const syncTime = coordinator.getLastSyncTime();

      expect(syncTime).toBeGreaterThan(0);
      expect(typeof syncTime).toBe("number");
    });

    it("should track time spent in insight sharing", async () => {
      streams[0].addInsight({
        content: "Test insight",
        source: StreamType.ANALYTICAL,
        confidence: 0.9,
        importance: 0.85,
      });

      expect(coordinator).toBeDefined();

      await coordinator.shareInsights(streams);
      const shareTime = coordinator.getLastShareTime();

      expect(shareTime).toBeGreaterThan(0);
      expect(typeof shareTime).toBe("number");
    });

    it("should report overhead metrics", async () => {
      expect(coordinator).toBeDefined();

      // Perform some coordination activities
      coordinator.recordCoordinationTime(30);
      coordinator.recordCoordinationTime(20);

      const metrics = coordinator.getOverheadMetrics();

      expect(metrics).toHaveProperty("totalCoordinationTime");
      expect(metrics).toHaveProperty("overheadPercentage");
      expect(metrics).toHaveProperty("syncTime");
      expect(metrics).toHaveProperty("shareTime");
      expect(metrics.totalCoordinationTime).toBe(50);
    });
  });

  describe("Stream Independence", () => {
    it("should allow streams to process independently between checkpoints", async () => {
      // Set streams to different progress levels (all below next checkpoint)
      streams[0].setProgress(0.3);
      streams[1].setProgress(0.35);
      streams[2].setProgress(0.4);
      streams[3].setProgress(0.45);

      expect(coordinator).toBeDefined();

      // Streams should not be blocked
      const isBlocked = coordinator.areStreamsBlocked(streams, 0.5);
      expect(isBlocked).toBe(false);
    });

    it("should not block streams waiting for slower streams", async () => {
      // One stream is slow, others are fast
      streams[0].setProgress(0.8);
      streams[1].setProgress(0.82);
      streams[2].setProgress(0.85);
      streams[3].setProgress(0.6); // Slower stream

      expect(coordinator).toBeDefined();

      // Fast streams should not be blocked
      const fastStreams = streams.slice(0, 3);
      const canProceed = coordinator.canStreamsProceed(fastStreams, 0.75);
      expect(canProceed).toBe(true);
    });

    it("should maintain separate reasoning chains per stream", async () => {
      expect(coordinator).toBeDefined();

      // Each stream should have its own reasoning context
      const contexts = coordinator.getStreamContexts(streams);
      expect(contexts.length).toBe(4);
      expect(contexts[0]).not.toBe(contexts[1]); // Different objects
    });

    it("should prevent cross-contamination of stream conclusions", async () => {
      streams[0].addInsight({
        content: "Analytical insight",
        source: StreamType.ANALYTICAL,
        confidence: 0.9,
        importance: 0.85,
      });

      expect(coordinator).toBeDefined();

      // Share insights
      await coordinator.shareInsights(streams);

      // Insights should be shared but not modify original conclusions
      const analyticalInsights = streams[0].getInsights();

      // Original stream keeps its insight
      expect(analyticalInsights.length).toBeGreaterThan(0);
      // Other streams receive shared insights but maintain independence
      expect(coordinator.areStreamsSeparate(streams)).toBe(true);
    });
  });

  describe("Timeout Handling", () => {
    it("should handle streams that timeout before checkpoints", async () => {
      const timedOutResult: StreamResult = {
        streamId: streams[0].id,
        streamType: StreamType.ANALYTICAL,
        conclusion: "",
        reasoning: [],
        insights: [],
        confidence: 0,
        processingTime: 10000,
        status: StreamStatus.TIMEOUT,
      };

      expect(coordinator).toBeDefined();

      const results = [timedOutResult];
      const shouldContinue = coordinator.shouldContinueWithTimeout(results);
      expect(shouldContinue).toBe(true); // Continue with other streams
    });

    it("should continue coordination with remaining streams", async () => {
      // Mix of completed and timed-out streams
      const results: StreamResult[] = [
        {
          streamId: "1",
          streamType: StreamType.ANALYTICAL,
          conclusion: "Analysis complete",
          reasoning: [],
          insights: [],
          confidence: 0.8,
          processingTime: 5000,
          status: StreamStatus.COMPLETED,
        },
        {
          streamId: "2",
          streamType: StreamType.CREATIVE,
          conclusion: "",
          reasoning: [],
          insights: [],
          confidence: 0,
          processingTime: 10000,
          status: StreamStatus.TIMEOUT,
        },
      ];

      expect(coordinator).toBeDefined();

      const activeStreams = coordinator.getActiveStreams(results);
      expect(activeStreams.length).toBe(1); // Only completed stream
      expect(activeStreams[0].status).toBe(StreamStatus.COMPLETED);
    });

    it("should return early when checkpoint is reached", async () => {
      // Set all streams past checkpoint
      streams[0].setProgress(0.3);
      streams[1].setProgress(0.28);
      streams[2].setProgress(0.26);
      streams[3].setProgress(0.27);

      expect(coordinator).toBeDefined();

      const maxWaitTime = 1000; // 1 second max wait
      const startTime = Date.now();

      await coordinator.waitForCheckpoint(streams, 0.25, maxWaitTime);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(maxWaitTime); // Should return immediately
    });

    it("should not wait indefinitely for timed-out streams", async () => {
      streams[0].setProgress(0.3);
      streams[1].setProgress(0.28);
      streams[2].setProgress(0.26);
      streams[3].setProgress(0.1); // Very slow, will timeout

      expect(coordinator).toBeDefined();

      const maxWaitTime = 1000; // 1 second max wait
      const startTime = Date.now();

      await coordinator.waitForCheckpoint(streams, 0.25, maxWaitTime);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThanOrEqual(maxWaitTime + 100); // Allow small buffer
    });
  });

  describe("Failure Handling", () => {
    it("should handle streams without isCancelled method", () => {
      // Create a stream without isCancelled method
      const streamWithoutMethod = {
        id: "test-stream",
        type: StreamType.ANALYTICAL,
        processor: {
          getStreamType: () => StreamType.ANALYTICAL,
          process: async () => ({
            streamId: "test",
            streamType: StreamType.ANALYTICAL,
            conclusion: "test",
            reasoning: [],
            insights: [],
            confidence: 0.8,
            processingTime: 100,
            status: StreamStatus.COMPLETED,
          }),
        },
        timeout: 10000,
        process: async () => ({
          streamId: "test",
          streamType: StreamType.ANALYTICAL,
          conclusion: "test",
          reasoning: [],
          insights: [],
          confidence: 0.8,
          processingTime: 100,
          status: StreamStatus.COMPLETED,
        }),
        getProgress: () => 0.5,
        cancel: () => {},
      } as ReasoningStream;

      expect(coordinator).toBeDefined();
      const isolated = coordinator.isFailureIsolated([streamWithoutMethod]);
      expect(isolated).toBe(true); // No failures detected
    });

    it("should handle stream failures gracefully", async () => {
      const failedResult: StreamResult = {
        streamId: streams[0].id,
        streamType: StreamType.ANALYTICAL,
        conclusion: "",
        reasoning: [],
        insights: [],
        confidence: 0,
        processingTime: 100,
        status: StreamStatus.FAILED,
        error: new Error("Stream processing failed"),
      };

      expect(coordinator).toBeDefined();

      const results = [failedResult];
      const shouldContinue = coordinator.shouldContinueWithFailure(results);
      expect(shouldContinue).toBe(true); // Continue with other streams
    });

    it("should continue coordination with successful streams", async () => {
      const results: StreamResult[] = [
        {
          streamId: "1",
          streamType: StreamType.ANALYTICAL,
          conclusion: "Success",
          reasoning: [],
          insights: [],
          confidence: 0.8,
          processingTime: 100,
          status: StreamStatus.COMPLETED,
        },
        {
          streamId: "2",
          streamType: StreamType.CREATIVE,
          conclusion: "",
          reasoning: [],
          insights: [],
          confidence: 0,
          processingTime: 100,
          status: StreamStatus.FAILED,
          error: new Error("Failed"),
        },
      ];

      expect(coordinator).toBeDefined();

      const successfulStreams = coordinator.getSuccessfulStreams(results);
      expect(successfulStreams.length).toBe(1);
      expect(successfulStreams[0].status).toBe(StreamStatus.COMPLETED);
    });

    it("should not propagate failures across streams", async () => {
      streams[0].cancel(); // Simulate failure

      expect(coordinator).toBeDefined();

      // Other streams should not be affected
      const areOthersAffected = streams.slice(1).some((s) => s.isCancelled());
      expect(areOthersAffected).toBe(false);

      // Coordinator should isolate the failure
      const isolatedFailure = coordinator.isFailureIsolated(streams);
      expect(isolatedFailure).toBe(true);
    });
  });
});
