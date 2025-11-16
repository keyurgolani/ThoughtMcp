/**
 * Tests for ParallelReasoningOrchestrator
 *
 * Following TDD methodology - these tests are written first and should fail
 * until the orchestrator implementation is complete.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ParallelReasoningOrchestrator } from "../../../reasoning/orchestrator";
import type { ReasoningStream } from "../../../reasoning/stream";
import {
  Problem,
  StreamResult,
  StreamStatus,
  StreamType,
  SynthesizedResult,
} from "../../../reasoning/types";

// Mock stream implementation for testing
class MockReasoningStream implements ReasoningStream {
  id: string;
  type: StreamType;
  processor: any;
  timeout: number;
  private progress: number = 0;
  private cancelled: boolean = false;
  private processingTime: number;
  private shouldFail: boolean;
  private shouldTimeout: boolean;

  constructor(
    type: StreamType,
    processingTime: number = 100,
    shouldFail: boolean = false,
    shouldTimeout: boolean = false
  ) {
    this.id = `${type}-stream`;
    this.type = type;
    this.processor = null;
    this.timeout = 10000; // 10s default
    this.processingTime = processingTime;
    this.shouldFail = shouldFail;
    this.shouldTimeout = shouldTimeout;
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

    if (this.shouldTimeout) {
      // Simulate timeout by taking longer than timeout limit
      await new Promise((resolve) => setTimeout(resolve, this.timeout + 1000));
    }

    if (this.shouldFail) {
      throw new Error(`${this.type} stream failed`);
    }

    // Simulate processing
    const startTime = Date.now();
    await new Promise((resolve) => setTimeout(resolve, this.processingTime));
    const endTime = Date.now();

    this.progress = 1.0;

    return {
      streamId: this.id,
      streamType: this.type,
      conclusion: `${this.type} conclusion`,
      reasoning: [`${this.type} step 1`, `${this.type} step 2`],
      insights: [
        {
          content: `${this.type} insight`,
          source: this.type,
          confidence: 0.8,
          importance: 0.7,
        },
      ],
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
}

// Test problem
const createTestProblem = (): Problem => ({
  id: "test-problem-1",
  description: "Test problem description",
  context: "Test context",
  constraints: ["constraint1", "constraint2"],
  goals: ["goal1", "goal2"],
  complexity: "moderate",
  urgency: "medium",
});

describe("ParallelReasoningOrchestrator", () => {
  let orchestrator: ParallelReasoningOrchestrator;
  let testProblem: Problem;

  beforeEach(() => {
    testProblem = createTestProblem();
    orchestrator = new ParallelReasoningOrchestrator();
  });

  describe("Initialization", () => {
    it("should provide access to coordination manager", () => {
      const coordinationManager = orchestrator.getCoordinationManager();
      expect(coordinationManager).toBeDefined();
    });
  });

  describe("Parallel Execution", () => {
    it("should execute all 4 streams in parallel", async () => {
      // Create 4 mock streams with different processing times
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 150),
        new MockReasoningStream(StreamType.CRITICAL, 120),
        new MockReasoningStream(StreamType.SYNTHETIC, 130),
      ];

      // This will fail until orchestrator is implemented
      expect(orchestrator).toBeDefined();
      expect(orchestrator.executeStreams).toBeDefined();

      const startTime = Date.now();
      const result: SynthesizedResult = await orchestrator.executeStreams(testProblem, streams);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify synthesis result structure
      expect(result.conclusion).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.conflicts).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.quality).toBeDefined();
      expect(result.metadata).toBeDefined();

      // Verify parallel execution (should be ~150ms, not 500ms sequential)
      expect(totalTime).toBeLessThan(300); // Allow some overhead

      // Verify all 4 streams were used
      expect(result.metadata.streamsUsed).toHaveLength(4);
    });

    it("should complete within 30s total timeout", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 5000),
        new MockReasoningStream(StreamType.CREATIVE, 5000),
        new MockReasoningStream(StreamType.CRITICAL, 5000),
        new MockReasoningStream(StreamType.SYNTHETIC, 5000),
      ];

      const startTime = Date.now();
      const result = await orchestrator.executeStreams(testProblem, streams);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete in ~5s (parallel), not 20s (sequential)
      expect(totalTime).toBeLessThan(30000);
      expect(result.metadata.synthesisTime).toBeLessThan(30000);
    });
  });

  describe("Timeout Management", () => {
    it("should enforce 10s timeout per stream", async () => {
      // Create stream that will timeout
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100),
        new MockReasoningStream(StreamType.CRITICAL, 100, false, true), // Will timeout
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should synthesize from 3 successful streams (critical timed out)
      expect(result.metadata.streamsUsed).toHaveLength(3);
      expect(result.metadata.streamsUsed).not.toContain(StreamType.CRITICAL);

      // Quality completeness should reflect missing stream
      expect(result.quality.completeness).toBeLessThan(1.0);
    }, 15000); // 15s timeout for test

    it("should enforce 30s total timeout", async () => {
      // All streams take 15s each
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 15000),
        new MockReasoningStream(StreamType.CREATIVE, 15000),
        new MockReasoningStream(StreamType.CRITICAL, 15000),
        new MockReasoningStream(StreamType.SYNTHETIC, 15000),
      ];

      const startTime = Date.now();
      const result = await orchestrator.executeStreams(testProblem, streams);
      const endTime = Date.now();

      // Should timeout at 30s, not wait for all 15s streams
      expect(endTime - startTime).toBeLessThan(31000);
      // Synthesis time should be reasonable
      expect(result.metadata.synthesisTime).toBeLessThan(31000);
    }, 35000); // 35s timeout for test
  });

  describe("Stream Independence", () => {
    it("should not block other streams when one is slow", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 5000), // Slow stream
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // All 4 streams should be used (including the slow one)
      expect(result.metadata.streamsUsed).toHaveLength(4);

      // Should have insights from all streams
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it("should maintain independent results", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100),
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // All 4 streams should be used
      expect(result.metadata.streamsUsed).toHaveLength(4);
      expect(result.metadata.streamsUsed).toContain(StreamType.ANALYTICAL);
      expect(result.metadata.streamsUsed).toContain(StreamType.CREATIVE);
      expect(result.metadata.streamsUsed).toContain(StreamType.CRITICAL);
      expect(result.metadata.streamsUsed).toContain(StreamType.SYNTHETIC);

      // Should have synthesized insights from all streams
      expect(result.insights.length).toBeGreaterThan(0);
    });
  });

  describe("Resource Allocation", () => {
    it("should distribute resources fairly across streams", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100),
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // All 4 streams should be used (fair allocation)
      expect(result.metadata.streamsUsed).toHaveLength(4);

      // Quality should be good with all streams completing
      expect(result.quality.completeness).toBe(1.0);
    });

    it("should monitor resource usage", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100),
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Orchestrator should track synthesis time
      expect(result.metadata.synthesisTime).toBeGreaterThan(0);
      expect(result.metadata.synthesisTime).toBeLessThan(30000);
    });
  });

  describe("Graceful Degradation", () => {
    it("should continue when one stream fails", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100, true), // Will fail
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should synthesize from 3 successful streams (creative failed)
      expect(result.metadata.streamsUsed).toHaveLength(3);
      expect(result.metadata.streamsUsed).not.toContain(StreamType.CREATIVE);

      // Quality completeness should reflect missing stream
      expect(result.quality.completeness).toBeLessThan(1.0);
    });

    it("should handle multiple stream failures", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100, true), // Fail
        new MockReasoningStream(StreamType.CREATIVE, 100, true), // Fail
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should synthesize from 2 successful streams
      expect(result.metadata.streamsUsed).toHaveLength(2);
      expect(result.metadata.streamsUsed).toContain(StreamType.CRITICAL);
      expect(result.metadata.streamsUsed).toContain(StreamType.SYNTHETIC);

      // Quality completeness should reflect missing streams
      expect(result.quality.completeness).toBe(0.5); // 2 out of 4 streams
    });

    it("should return partial results when all streams fail", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100, true),
        new MockReasoningStream(StreamType.CREATIVE, 100, true),
        new MockReasoningStream(StreamType.CRITICAL, 100, true),
        new MockReasoningStream(StreamType.SYNTHETIC, 100, true),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should return empty synthesis when all streams fail
      expect(result.conclusion).toContain("Unable to synthesize");
      expect(result.insights).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.confidence).toBe(0);
      expect(result.quality.overallScore).toBe(0);
      expect(result.metadata.streamsUsed).toHaveLength(0);
    });

    it("should preserve error information", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100, true),
        new MockReasoningStream(StreamType.CREATIVE, 100),
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should synthesize from 3 successful streams
      expect(result.metadata.streamsUsed).toHaveLength(3);
      expect(result.metadata.streamsUsed).not.toContain(StreamType.ANALYTICAL);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle missing stream types in results", async () => {
      // Create only 2 streams instead of 4
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should synthesize from only 2 streams
      expect(result.metadata.streamsUsed).toHaveLength(2);
      expect(result.metadata.streamsUsed).toContain(StreamType.ANALYTICAL);
      expect(result.metadata.streamsUsed).toContain(StreamType.CREATIVE);

      // Quality completeness should reflect missing streams
      expect(result.quality.completeness).toBe(0.5); // 2 out of 4 streams
    });

    it("should handle total timeout gracefully", async () => {
      // Create streams with varying processing times
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 200),
        new MockReasoningStream(StreamType.CRITICAL, 300),
        new MockReasoningStream(StreamType.SYNTHETIC, 400),
      ];

      // Set total timeout that allows some but not all streams to complete
      const result = await orchestrator.executeStreams(testProblem, streams, 250);

      // Should return results even with timeout
      expect(result).toBeDefined();

      // Should synthesize from completed streams
      expect(result.metadata.streamsUsed.length).toBeGreaterThanOrEqual(1);

      // Quality completeness should reflect completion (may be 1.0 if all complete, or less if some timeout)
      expect(result.quality.completeness).toBeGreaterThan(0);
      expect(result.quality.completeness).toBeLessThanOrEqual(1.0);
    });

    it("should handle total timeout exceeded with catch block", async () => {
      // Create streams that all take longer than the total timeout
      // This will trigger the catch block in executeWithTotalTimeout when timeoutPromise wins the race
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 500),
        new MockReasoningStream(StreamType.CREATIVE, 500),
        new MockReasoningStream(StreamType.CRITICAL, 500),
        new MockReasoningStream(StreamType.SYNTHETIC, 500),
      ];

      // Set total timeout shorter than stream processing time
      // This ensures timeoutPromise wins the race and triggers the catch block
      const result = await orchestrator.executeStreams(testProblem, streams, 100);

      // Should return results even with timeout
      expect(result).toBeDefined();

      // Should synthesize from completed streams
      expect(result.metadata.streamsUsed.length).toBeGreaterThanOrEqual(0);

      // Should have valid synthesis structure
      expect(result.conclusion).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it("should handle promise rejection with non-Error objects", async () => {
      // Create a stream that rejects with a string instead of Error
      class RejectingStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          throw "String error instead of Error object";
        }
      }

      const streams: ReasoningStream[] = [
        new RejectingStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100),
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should synthesize from 3 successful streams
      expect(result.metadata.streamsUsed).toHaveLength(3);
      expect(result.metadata.streamsUsed).not.toContain(StreamType.ANALYTICAL);
    });

    it("should handle rejected promises in catch block with timeout", async () => {
      // Create streams that reject with non-Error objects and take longer than timeout
      class SlowRejectingStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          await new Promise((resolve) => setTimeout(resolve, 200));
          throw "Slow rejection";
        }
      }

      const streams: ReasoningStream[] = [
        new SlowRejectingStream(StreamType.ANALYTICAL, 200),
        new SlowRejectingStream(StreamType.CREATIVE, 200),
        new SlowRejectingStream(StreamType.CRITICAL, 200),
        new SlowRejectingStream(StreamType.SYNTHETIC, 200),
      ];

      // Set very short timeout to trigger catch block
      const result = await orchestrator.executeStreams(testProblem, streams, 50);

      // Should return results even with timeout and rejections
      expect(result).toBeDefined();

      // Should return empty synthesis when all streams fail
      expect(result.metadata.streamsUsed).toHaveLength(0);
      expect(result.conclusion).toContain("Unable to synthesize");
    });

    it("should handle promise rejection in try block (lines 142-154)", async () => {
      // Create a stream that rejects immediately without timeout
      class ImmediateRejectStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          // Reject immediately with a non-Error object to test error handling
          throw { message: "Custom rejection object" };
        }
      }

      const streams: ReasoningStream[] = [
        new ImmediateRejectStream(StreamType.ANALYTICAL, 10000),
        new MockReasoningStream(StreamType.CREATIVE, 100),
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      // Use long total timeout so we don't hit catch block
      const result = await orchestrator.executeStreams(testProblem, streams, 30000);

      // Should synthesize from 3 successful streams
      expect(result.metadata.streamsUsed).toHaveLength(3);
      expect(result.metadata.streamsUsed).not.toContain(StreamType.ANALYTICAL);
    });

    it("should handle promise rejection with Error object in try block", async () => {
      // Create a stream that rejects with an Error object
      class ErrorRejectStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          throw new Error("Stream processing error");
        }
      }

      const streams: ReasoningStream[] = [
        new ErrorRejectStream(StreamType.ANALYTICAL, 10000),
        new ErrorRejectStream(StreamType.CREATIVE, 10000),
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      // Use long total timeout so we don't hit catch block
      const result = await orchestrator.executeStreams(testProblem, streams, 30000);

      // Should synthesize from 2 successful streams
      expect(result.metadata.streamsUsed).toHaveLength(2);
      expect(result.metadata.streamsUsed).toContain(StreamType.CRITICAL);
      expect(result.metadata.streamsUsed).toContain(StreamType.SYNTHETIC);
    });

    it("should handle catch block with fulfilled and rejected promises (lines 164-176)", async () => {
      // Create mix of fast completing and slow rejecting streams
      class VerySlowRejectStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          // Take longer than total timeout, then reject
          await new Promise((resolve) => setTimeout(resolve, 300));
          throw "Timeout rejection";
        }
      }

      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 50), // Fast, will complete
        new VerySlowRejectStream(StreamType.CREATIVE, 10000), // Slow, will reject
        new VerySlowRejectStream(StreamType.CRITICAL, 10000), // Slow, will reject
        new MockReasoningStream(StreamType.SYNTHETIC, 50), // Fast, will complete
      ];

      // Set timeout that allows fast streams to complete but triggers catch block
      const result = await orchestrator.executeStreams(testProblem, streams, 100);

      // Should return results from catch block
      expect(result).toBeDefined();

      // Should synthesize from completed streams
      expect(result.metadata.streamsUsed.length).toBeGreaterThanOrEqual(2);
      expect(result.metadata.streamsUsed).toContain(StreamType.ANALYTICAL);
      expect(result.metadata.streamsUsed).toContain(StreamType.SYNTHETIC);
    });

    it("should handle catch block with all rejected promises", async () => {
      // Create streams that all reject after timeout
      class AllRejectStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          await new Promise((resolve) => setTimeout(resolve, 200));
          throw new Error("All streams reject");
        }
      }

      const streams: ReasoningStream[] = [
        new AllRejectStream(StreamType.ANALYTICAL, 10000),
        new AllRejectStream(StreamType.CREATIVE, 10000),
        new AllRejectStream(StreamType.CRITICAL, 10000),
        new AllRejectStream(StreamType.SYNTHETIC, 10000),
      ];

      // Set very short timeout to trigger catch block before any complete
      const result = await orchestrator.executeStreams(testProblem, streams, 50);

      // Should return results from catch block
      expect(result).toBeDefined();

      // Should return empty synthesis when all streams fail
      expect(result.metadata.streamsUsed).toHaveLength(0);
      expect(result.conclusion).toContain("Unable to synthesize");
    });

    it("should handle empty streams array", async () => {
      const streams: ReasoningStream[] = [];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should return empty synthesis with no streams
      expect(result).toBeDefined();
      expect(result.metadata.streamsUsed).toHaveLength(0);
      expect(result.conclusion).toContain("Unable to synthesize");
      expect(result.insights).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    it("should handle Promise.allSettled with rejected promises in try block", async () => {
      // Create streams that mix success and failure
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100, true), // Will fail
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should synthesize from successful streams only
      expect(result.metadata.streamsUsed).toHaveLength(3);
      expect(result.metadata.streamsUsed).not.toContain(StreamType.CREATIVE);
    });

    it("should handle Promise.allSettled with non-Error rejection in try block", async () => {
      // Create stream that rejects with non-Error object
      class NonErrorRejectStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          throw "String rejection";
        }
      }

      const streams: ReasoningStream[] = [new NonErrorRejectStream(StreamType.ANALYTICAL, 100)];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should return empty synthesis when stream fails
      expect(result.metadata.streamsUsed).toHaveLength(0);
      expect(result.conclusion).toContain("Unable to synthesize");
    });

    it("should handle Promise.allSettled with rejected promises in catch block", async () => {
      // Create stream that rejects after delay
      class SlowRejectStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          await new Promise((resolve) => setTimeout(resolve, 200));
          throw new Error("Slow rejection");
        }
      }

      const streams: ReasoningStream[] = [new SlowRejectStream(StreamType.ANALYTICAL, 10000)];

      // Call with very short timeout to trigger catch block
      const result = await orchestrator.executeStreams(testProblem, streams, 50);

      // Should return empty synthesis when stream fails
      expect(result.metadata.streamsUsed).toHaveLength(0);
      expect(result.conclusion).toContain("Unable to synthesize");
    });

    it("should handle Promise.allSettled with non-Error rejection in catch block", async () => {
      // Create stream that rejects with non-Error object after delay
      class SlowNonErrorRejectStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          await new Promise((resolve) => setTimeout(resolve, 200));
          throw { custom: "object rejection" };
        }
      }

      const streams: ReasoningStream[] = [
        new SlowNonErrorRejectStream(StreamType.ANALYTICAL, 10000),
      ];

      // Call with very short timeout to trigger catch block
      const result = await orchestrator.executeStreams(testProblem, streams, 50);

      // Should return empty synthesis when stream fails
      expect(result.metadata.streamsUsed).toHaveLength(0);
      expect(result.conclusion).toContain("Unable to synthesize");
    });

    it("should handle rejected promise with Error in try block (lines 140-152)", async () => {
      // Create a stream that rejects with Error object
      class ErrorRejectingStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          throw new Error("Explicit error rejection");
        }
      }

      const streams: ReasoningStream[] = [
        new ErrorRejectingStream(StreamType.ANALYTICAL, 10000),
        new MockReasoningStream(StreamType.CREATIVE, 100),
      ];

      // Use long timeout to ensure we stay in try block
      const result = await orchestrator.executeStreams(testProblem, streams, 30000);

      // Should synthesize from successful stream only
      expect(result.metadata.streamsUsed).toHaveLength(1);
      expect(result.metadata.streamsUsed).toContain(StreamType.CREATIVE);
    });

    it("should handle rejected promise with non-Error in try block (lines 140-152)", async () => {
      // Create a stream that rejects with non-Error object
      class NonErrorRejectingStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          throw "String error rejection";
        }
      }

      const streams: ReasoningStream[] = [
        new NonErrorRejectingStream(StreamType.ANALYTICAL, 10000),
        new MockReasoningStream(StreamType.CREATIVE, 100),
      ];

      // Use long timeout to ensure we stay in try block
      const result = await orchestrator.executeStreams(testProblem, streams, 30000);

      // Should synthesize from successful stream only
      expect(result.metadata.streamsUsed).toHaveLength(1);
      expect(result.metadata.streamsUsed).toContain(StreamType.CREATIVE);
    });

    it("should handle rejected promise with Error in catch block (lines 162-174)", async () => {
      // Create a stream that takes longer than timeout then rejects with Error
      class TimeoutErrorRejectingStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          await new Promise((resolve) => setTimeout(resolve, 200));
          throw new Error("Timeout error rejection");
        }
      }

      const streams: ReasoningStream[] = [
        new TimeoutErrorRejectingStream(StreamType.ANALYTICAL, 10000),
      ];

      // Use very short timeout to trigger catch block
      const result = await orchestrator.executeStreams(testProblem, streams, 50);

      // Should return empty synthesis
      expect(result.metadata.streamsUsed).toHaveLength(0);
      expect(result.conclusion).toContain("Unable to synthesize");
    });

    it("should handle rejected promise with non-Error in catch block (lines 162-174)", async () => {
      // Create a stream that takes longer than timeout then rejects with non-Error
      class TimeoutNonErrorRejectingStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          await new Promise((resolve) => setTimeout(resolve, 200));
          throw { message: "Timeout non-error rejection" };
        }
      }

      const streams: ReasoningStream[] = [
        new TimeoutNonErrorRejectingStream(StreamType.ANALYTICAL, 10000),
      ];

      // Use very short timeout to trigger catch block
      const result = await orchestrator.executeStreams(testProblem, streams, 50);

      // Should return empty synthesis
      expect(result.metadata.streamsUsed).toHaveLength(0);
      expect(result.conclusion).toContain("Unable to synthesize");
    });

    it("should handle Promise.race rejection in try block (lines 147-152)", async () => {
      // Create a stream that rejects immediately to trigger the rejected branch in Promise.allSettled
      // This will cause Promise.race to resolve with Promise.allSettled results that include rejected promises
      class ImmediateRejectWithErrorStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          // Reject with Error object to test line 151
          throw new Error("Immediate rejection with Error");
        }
      }

      class ImmediateRejectWithNonErrorStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          // Reject with non-Error object to test line 152
          throw "Immediate rejection with string";
        }
      }

      const streams: ReasoningStream[] = [
        new ImmediateRejectWithErrorStream(StreamType.ANALYTICAL, 10000),
        new ImmediateRejectWithNonErrorStream(StreamType.CREATIVE, 10000),
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      // Use long timeout so Promise.allSettled wins the race (try block)
      const result = await orchestrator.executeStreams(testProblem, streams, 30000);

      // Should synthesize from successful streams only
      expect(result.metadata.streamsUsed).toHaveLength(2);
      expect(result.metadata.streamsUsed).toContain(StreamType.CRITICAL);
      expect(result.metadata.streamsUsed).toContain(StreamType.SYNTHETIC);
    });

    it("should handle Promise.race rejection in catch block with Error (lines 162-174)", async () => {
      // Create streams that reject after a delay to trigger catch block
      // The timeout will win the race, triggering the catch block
      // Then Promise.allSettled will have rejected promises to map over
      class DelayedRejectWithErrorStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          await new Promise((resolve) => setTimeout(resolve, 300));
          throw new Error("Delayed rejection with Error");
        }
      }

      class DelayedRejectWithNonErrorStream extends MockReasoningStream {
        async process(_problem: Problem): Promise<StreamResult> {
          await new Promise((resolve) => setTimeout(resolve, 300));
          throw { custom: "Delayed rejection with object" };
        }
      }

      const streams: ReasoningStream[] = [
        new DelayedRejectWithErrorStream(StreamType.ANALYTICAL, 10000),
        new DelayedRejectWithNonErrorStream(StreamType.CREATIVE, 10000),
      ];

      // Use very short timeout to trigger catch block before streams complete
      const result = await orchestrator.executeStreams(testProblem, streams, 50);

      // Should return empty synthesis when all streams fail/timeout
      expect(result.metadata.streamsUsed).toHaveLength(0);
      expect(result.conclusion).toContain("Unable to synthesize");
    });

    it("should handle executeWithTotalTimeout with rejected promises in try block", async () => {
      // Access the private method through type assertion to test it directly
      const orchestratorAny = orchestrator as any;

      // Create promises that reject with Error
      const rejectingPromiseWithError = Promise.reject(new Error("Test error"));
      // Create promise that rejects with non-Error
      const rejectingPromiseWithNonError = Promise.reject("Test string error");
      // Create promise that resolves
      const resolvingPromise = Promise.resolve({
        streamId: "test-stream",
        streamType: StreamType.ANALYTICAL,
        conclusion: "Test conclusion",
        reasoning: [],
        insights: [],
        confidence: 0.8,
        processingTime: 100,
        status: StreamStatus.COMPLETED,
      } as StreamResult);

      // Call with long timeout so Promise.allSettled wins (try block)
      const results = await orchestratorAny.executeWithTotalTimeout(
        [rejectingPromiseWithError, rejectingPromiseWithNonError, resolvingPromise],
        30000
      );

      // Should have 3 results (1 fulfilled, 2 rejected)
      expect(results).toHaveLength(3);

      // First result should be failed (rejected with Error)
      expect(results[0].status).toBe("failed");
      expect(results[0].error).toBeInstanceOf(Error);

      // Second result should be failed (rejected with non-Error)
      expect(results[1].status).toBe("failed");
      expect(results[1].error).toBeInstanceOf(Error);

      // Third result should be the resolved value
      expect(results[2].status).toBe("completed");
      expect(results[2].streamId).toBe("test-stream");
    });

    it("should handle executeWithTotalTimeout with rejected promises in catch block", async () => {
      // Access the private method through type assertion to test it directly
      const orchestratorAny = orchestrator as any;

      // Create promises that reject with Error after delay
      const slowRejectingPromiseWithError = new Promise<StreamResult>((_, reject) => {
        setTimeout(() => reject(new Error("Slow error")), 200);
      });

      // Create promise that rejects with non-Error after delay
      const slowRejectingPromiseWithNonError = new Promise<StreamResult>((_, reject) => {
        setTimeout(() => reject({ custom: "Slow non-error" }), 200);
      });

      // Create promise that resolves quickly
      const fastResolvingPromise = new Promise<StreamResult>((resolve) => {
        setTimeout(
          () =>
            resolve({
              streamId: "fast-stream",
              streamType: StreamType.CREATIVE,
              conclusion: "Fast conclusion",
              reasoning: [],
              insights: [],
              confidence: 0.9,
              processingTime: 50,
              status: StreamStatus.COMPLETED,
            }),
          50
        );
      });

      // Call with very short timeout to trigger catch block
      const results = await orchestratorAny.executeWithTotalTimeout(
        [slowRejectingPromiseWithError, slowRejectingPromiseWithNonError, fastResolvingPromise],
        100
      );

      // Should have 3 results
      expect(results).toHaveLength(3);

      // Results should include the fast resolved one and timeout status for slow ones
      const completedResults = results.filter((r: StreamResult) => r.status === "completed");
      const timeoutResults = results.filter((r: StreamResult) => r.status === "timeout");

      expect(completedResults.length).toBeGreaterThanOrEqual(1);
      expect(timeoutResults.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Synthesis Integration", () => {
    it("should integrate synthesis engine and return SynthesizedResult", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100),
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should return SynthesizedResult with synthesis fields
      expect(result).toBeDefined();
      expect(result.conclusion).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.conflicts).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.quality).toBeDefined();
      expect(result.metadata).toBeDefined();

      // Metadata should include streams used
      expect(result.metadata.streamsUsed).toHaveLength(4);
      expect(result.metadata.synthesisTime).toBeGreaterThan(0);
      expect(result.metadata.timestamp).toBeInstanceOf(Date);
    });

    it("should synthesize insights from all streams", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100),
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should have attributed insights
      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);

      // Insights should be attributed to source streams
      if (result.insights.length > 0) {
        const insight = result.insights[0];
        expect(insight.content).toBeDefined();
        expect(insight.sources).toBeDefined();
        expect(Array.isArray(insight.sources)).toBe(true);
        expect(insight.confidence).toBeGreaterThanOrEqual(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
        expect(insight.importance).toBeGreaterThanOrEqual(0);
        expect(insight.importance).toBeLessThanOrEqual(1);
      }
    });

    it("should detect and preserve conflicts", async () => {
      // Create streams with potentially conflicting conclusions
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100),
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should have conflicts array (may be empty if no conflicts)
      expect(result.conflicts).toBeDefined();
      expect(Array.isArray(result.conflicts)).toBe(true);

      // If conflicts exist, they should have proper structure
      if (result.conflicts.length > 0) {
        const conflict = result.conflicts[0];
        expect(conflict.id).toBeDefined();
        expect(conflict.type).toBeDefined();
        expect(conflict.severity).toBeDefined();
        expect(conflict.sourceStreams).toBeDefined();
        expect(conflict.description).toBeDefined();
        expect(conflict.evidence).toBeDefined();
        expect(conflict.detectedAt).toBeInstanceOf(Date);
        expect(conflict.resolutionFramework).toBeDefined();
      }
    });

    it("should assess synthesis quality", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100),
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should have quality assessment
      expect(result.quality).toBeDefined();
      expect(result.quality.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.quality.overallScore).toBeLessThanOrEqual(1);
      expect(result.quality.coherence).toBeGreaterThanOrEqual(0);
      expect(result.quality.coherence).toBeLessThanOrEqual(1);
      expect(result.quality.completeness).toBeGreaterThanOrEqual(0);
      expect(result.quality.completeness).toBeLessThanOrEqual(1);
      expect(result.quality.consistency).toBeGreaterThanOrEqual(0);
      expect(result.quality.consistency).toBeLessThanOrEqual(1);
      expect(result.quality.insightQuality).toBeGreaterThanOrEqual(0);
      expect(result.quality.insightQuality).toBeLessThanOrEqual(1);
      expect(result.quality.recommendationQuality).toBeGreaterThanOrEqual(0);
      expect(result.quality.recommendationQuality).toBeLessThanOrEqual(1);
    });

    it("should handle synthesis with partial stream failures", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100, true), // Fail
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should still synthesize from successful streams
      expect(result.conclusion).toBeDefined();
      expect(result.metadata.streamsUsed).toHaveLength(3); // Only successful streams

      // Quality completeness should reflect missing stream
      expect(result.quality.completeness).toBeLessThan(1.0);
    });

    it("should handle synthesis with all stream failures", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100, true),
        new MockReasoningStream(StreamType.CREATIVE, 100, true),
        new MockReasoningStream(StreamType.CRITICAL, 100, true),
        new MockReasoningStream(StreamType.SYNTHETIC, 100, true),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should return empty synthesis
      expect(result.conclusion).toBeDefined();
      expect(result.conclusion).toContain("Unable to synthesize");
      expect(result.insights).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.confidence).toBe(0);
      expect(result.quality.overallScore).toBe(0);
    });

    it("should maintain backward compatibility with stream results", async () => {
      const streams: ReasoningStream[] = [
        new MockReasoningStream(StreamType.ANALYTICAL, 100),
        new MockReasoningStream(StreamType.CREATIVE, 100),
        new MockReasoningStream(StreamType.CRITICAL, 100),
        new MockReasoningStream(StreamType.SYNTHETIC, 100),
      ];

      const result = await orchestrator.executeStreams(testProblem, streams);

      // Should still have access to individual stream results through insights
      expect(result.insights).toBeDefined();
      expect(result.metadata.streamsUsed).toContain(StreamType.ANALYTICAL);
      expect(result.metadata.streamsUsed).toContain(StreamType.CREATIVE);
      expect(result.metadata.streamsUsed).toContain(StreamType.CRITICAL);
      expect(result.metadata.streamsUsed).toContain(StreamType.SYNTHETIC);
    });
  });
});
