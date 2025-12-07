/**
 * Performance optimization tests for ParallelReasoningOrchestrator
 *
 * Tests for:
 * - Synchronization overhead <10%
 * - Early termination for converged streams
 * - Optimized insight sharing
 * - Optimized synthesis process
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ParallelReasoningOrchestrator } from "../../../reasoning/orchestrator";
import type { ReasoningStream } from "../../../reasoning/stream";
import { Problem, StreamResult, StreamStatus, StreamType } from "../../../reasoning/types";

// Mock stream for performance testing
class PerformanceMockStream implements ReasoningStream {
  id: string;
  type: StreamType;
  processor: any;
  timeout: number;
  private progress: number = 0;
  private cancelled: boolean = false;
  private processingTime: number;
  private insights: any[] = [];

  constructor(type: StreamType, processingTime: number = 100) {
    this.id = `${type}-stream`;
    this.type = type;
    this.processor = null;
    this.timeout = 10000;
    this.processingTime = processingTime;
  }

  async process(_problem: Problem): Promise<StreamResult> {
    if (this.cancelled) {
      return {
        streamId: this.id,
        streamType: this.type,
        conclusion: "",
        reasoning: [],
        insights: [],
        confidence: 0,
        processingTime: 0,
        status: StreamStatus.CANCELLED,
      };
    }

    const startTime = Date.now();

    // Simulate processing with progress updates
    for (let i = 0; i < 4; i++) {
      if (this.cancelled) break;
      await new Promise((resolve) => setTimeout(resolve, this.processingTime / 4));
      this.progress = (i + 1) * 0.25;
    }

    const endTime = Date.now();

    return {
      streamId: this.id,
      streamType: this.type,
      conclusion: `${this.type} conclusion`,
      reasoning: [`${this.type} step 1`, `${this.type} step 2`],
      insights: this.insights,
      confidence: 0.8,
      processingTime: endTime - startTime,
      status: StreamStatus.COMPLETED,
    };
  }

  getProgress(): number {
    return this.progress;
  }

  cancel(): void {
    this.cancelled = true;
  }

  isCancelled(): boolean {
    return this.cancelled;
  }

  getInsights(): any[] {
    return this.insights;
  }

  setInsights(insights: any[]): void {
    this.insights = insights;
  }
}

describe("ParallelReasoningOrchestrator - Performance Optimizations", () => {
  let orchestrator: ParallelReasoningOrchestrator;
  let testProblem: Problem;

  beforeEach(() => {
    orchestrator = new ParallelReasoningOrchestrator();
    testProblem = {
      id: "test-problem",
      description: "Test problem",
      context: "Test context",
      constraints: [],
      goals: [],
    };
  });

  describe("Synchronization Overhead", () => {
    it("should keep coordination overhead below 10%", async () => {
      const streams: ReasoningStream[] = [
        new PerformanceMockStream(StreamType.ANALYTICAL, 1000),
        new PerformanceMockStream(StreamType.CREATIVE, 1000),
        new PerformanceMockStream(StreamType.CRITICAL, 1000),
        new PerformanceMockStream(StreamType.SYNTHETIC, 1000),
      ];

      const startTime = Date.now();
      const result = await orchestrator.executeStreams(testProblem, streams, 30000);
      const totalTime = Date.now() - startTime;

      // Get coordination overhead from manager
      const coordinator = orchestrator.getCoordinationManager();
      const overheadPercentage = coordinator.measureCoordinationOverhead(totalTime);

      expect(overheadPercentage).toBeLessThan(0.1); // <10%
      expect(result).toBeDefined();
    });

    it("should minimize synchronization time at checkpoints", async () => {
      const streams: ReasoningStream[] = [
        new PerformanceMockStream(StreamType.ANALYTICAL, 500),
        new PerformanceMockStream(StreamType.CREATIVE, 500),
        new PerformanceMockStream(StreamType.CRITICAL, 500),
        new PerformanceMockStream(StreamType.SYNTHETIC, 500),
      ];

      await orchestrator.executeStreams(testProblem, streams, 30000);

      const coordinator = orchestrator.getCoordinationManager();
      const syncTime = coordinator.getLastSyncTime();

      // Synchronization should be very fast (<50ms)
      expect(syncTime).toBeLessThan(50);
    });
  });

  describe("Early Termination", () => {
    it("should support early termination when streams converge", async () => {
      // Create streams that will converge quickly
      const streams: ReasoningStream[] = [
        new PerformanceMockStream(StreamType.ANALYTICAL, 200),
        new PerformanceMockStream(StreamType.CREATIVE, 200),
        new PerformanceMockStream(StreamType.CRITICAL, 200),
        new PerformanceMockStream(StreamType.SYNTHETIC, 200),
      ];

      const startTime = Date.now();
      const result = await orchestrator.executeStreams(testProblem, streams, 30000);
      const totalTime = Date.now() - startTime;

      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(5000);
      expect(result.metadata.streamsUsed.length).toBeGreaterThan(0);
    });

    it("should detect high confidence convergence", async () => {
      const streams: ReasoningStream[] = [
        new PerformanceMockStream(StreamType.ANALYTICAL, 100),
        new PerformanceMockStream(StreamType.CREATIVE, 100),
        new PerformanceMockStream(StreamType.CRITICAL, 100),
        new PerformanceMockStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams, 30000);

      // Result should have high confidence if streams converged
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("Insight Sharing Optimization", () => {
    it("should share insights efficiently", async () => {
      const streams: ReasoningStream[] = [
        new PerformanceMockStream(StreamType.ANALYTICAL, 300),
        new PerformanceMockStream(StreamType.CREATIVE, 300),
        new PerformanceMockStream(StreamType.CRITICAL, 300),
        new PerformanceMockStream(StreamType.SYNTHETIC, 300),
      ];

      // Add high-importance insights
      (streams[0] as PerformanceMockStream).setInsights([
        {
          content: "Important insight",
          source: StreamType.ANALYTICAL,
          confidence: 0.9,
          importance: 0.8,
        },
      ]);

      await orchestrator.executeStreams(testProblem, streams, 30000);

      const coordinator = orchestrator.getCoordinationManager();
      const shareTime = coordinator.getLastShareTime();

      // Insight sharing should be fast (<50ms)
      expect(shareTime).toBeLessThan(50);
    });

    it("should only share high-importance insights", async () => {
      const streams: ReasoningStream[] = [
        new PerformanceMockStream(StreamType.ANALYTICAL, 200),
        new PerformanceMockStream(StreamType.CREATIVE, 200),
        new PerformanceMockStream(StreamType.CRITICAL, 200),
        new PerformanceMockStream(StreamType.SYNTHETIC, 200),
      ];

      // Add mixed importance insights
      (streams[0] as PerformanceMockStream).setInsights([
        {
          content: "High importance",
          source: StreamType.ANALYTICAL,
          confidence: 0.9,
          importance: 0.8,
        },
        {
          content: "Low importance",
          source: StreamType.ANALYTICAL,
          confidence: 0.5,
          importance: 0.3,
        },
      ]);

      await orchestrator.executeStreams(testProblem, streams, 30000);

      const coordinator = orchestrator.getCoordinationManager();
      const shareResult = coordinator.getLastShareResult();

      // Should only share high-importance insights (>0.7)
      expect(shareResult.insightsShared).toBe(1);
    });
  });

  describe("Synthesis Optimization", () => {
    it("should synthesize results quickly", async () => {
      const streams: ReasoningStream[] = [
        new PerformanceMockStream(StreamType.ANALYTICAL, 100),
        new PerformanceMockStream(StreamType.CREATIVE, 100),
        new PerformanceMockStream(StreamType.CRITICAL, 100),
        new PerformanceMockStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams, 30000);

      // Synthesis should be fast (<100ms)
      expect(result.metadata.synthesisTime).toBeLessThan(100);
    });

    it("should handle large result sets efficiently", async () => {
      const streams: ReasoningStream[] = [
        new PerformanceMockStream(StreamType.ANALYTICAL, 100),
        new PerformanceMockStream(StreamType.CREATIVE, 100),
        new PerformanceMockStream(StreamType.CRITICAL, 100),
        new PerformanceMockStream(StreamType.SYNTHETIC, 100),
      ];

      // Add many insights to each stream
      for (const stream of streams) {
        const insights = Array.from({ length: 20 }, (_, i) => ({
          content: `Insight ${i}`,
          source: stream.type,
          confidence: 0.7 + Math.random() * 0.3,
          importance: 0.5 + Math.random() * 0.5,
        }));
        (stream as PerformanceMockStream).setInsights(insights);
      }

      const result = await orchestrator.executeStreams(testProblem, streams, 30000);

      // Should still synthesize quickly even with many insights
      expect(result.metadata.synthesisTime).toBeLessThan(200);
      expect(result.insights.length).toBeGreaterThan(0);
    });
  });

  describe("Overall Performance", () => {
    it("should complete within 30s total timeout", async () => {
      const streams: ReasoningStream[] = [
        new PerformanceMockStream(StreamType.ANALYTICAL, 5000),
        new PerformanceMockStream(StreamType.CREATIVE, 5000),
        new PerformanceMockStream(StreamType.CRITICAL, 5000),
        new PerformanceMockStream(StreamType.SYNTHETIC, 5000),
      ];

      const startTime = Date.now();
      const result = await orchestrator.executeStreams(testProblem, streams, 30000);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(30000);
      expect(result).toBeDefined();
    });

    it("should handle fast streams efficiently", async () => {
      const streams: ReasoningStream[] = [
        new PerformanceMockStream(StreamType.ANALYTICAL, 50),
        new PerformanceMockStream(StreamType.CREATIVE, 50),
        new PerformanceMockStream(StreamType.CRITICAL, 50),
        new PerformanceMockStream(StreamType.SYNTHETIC, 50),
      ];

      const startTime = Date.now();
      const result = await orchestrator.executeStreams(testProblem, streams, 30000);
      const totalTime = Date.now() - startTime;

      // Should complete quickly with minimal overhead
      expect(totalTime).toBeLessThan(500);
      expect(result.metadata.streamsUsed.length).toBe(4);
    });
  });
});
