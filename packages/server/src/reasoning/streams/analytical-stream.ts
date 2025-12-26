/**
 * Analytical Reasoning Stream
 *
 * Implements logical, systematic analysis using LLM-based reasoning.
 * Requirements: 4.1, 15.3, 15.4
 */

import type { ReasoningStream, StreamProcessor } from "../stream.types.js";
import { StreamStatus, StreamType, type Problem, type StreamResult } from "../types.js";
// AnalyticalStreamProcessor stream processor
import { AnalyticalStreamProcessor } from "./analytical-stream-processor.js";
export { AnalyticalStreamProcessor };

/**
 * Analytical Reasoning Stream Wrapper
 * Maintains the existing interface for the Orchestrator
 */
export class AnalyticalReasoningStream implements ReasoningStream {
  public readonly id: string;
  public readonly type: StreamType;
  public readonly processor: StreamProcessor;
  public readonly timeout: number;

  private cancelled: boolean = false;
  private processing: boolean = false;

  constructor(timeout: number = 30000) {
    this.id = `analytical-stream-${Date.now()}`;
    this.type = StreamType.ANALYTICAL;
    this.processor = new AnalyticalStreamProcessor();
    this.timeout = timeout;
  }

  async process(problem: Problem): Promise<StreamResult> {
    if (this.processing) {
      throw new Error("Stream is already processing");
    }

    if (this.cancelled) {
      return {
        streamId: this.id,
        streamType: this.type,
        conclusion: "Cancelled",
        reasoning: [],
        insights: [],
        confidence: 0,
        processingTime: 0,
        status: StreamStatus.CANCELLED,
      };
    }

    this.processing = true;
    try {
      const processingPromise = this.processor.process(problem);
      let result = await processingPromise;

      if (this.cancelled && result.status !== StreamStatus.CANCELLED) {
        result = {
          streamId: this.id,
          streamType: this.type,
          conclusion: "Cancelled",
          reasoning: [],
          insights: [],
          confidence: 0,
          processingTime: 0,
          status: StreamStatus.CANCELLED,
        };
      }
      return result;
    } finally {
      this.processing = false;
    }
  }

  getProgress(): number {
    return this.processor instanceof AnalyticalStreamProcessor ? 0.5 : 0; // Simplified progress
  }

  cancel(): void {
    this.cancelled = true;
  }
}
