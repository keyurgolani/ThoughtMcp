/**
 * Parallel Reasoning Orchestrator
 *
 * Coordinates the execution of four reasoning streams in parallel,
 * managing timeouts, resource allocation, and error handling.
 */

import { StreamCoordinationManager } from "./coordination-manager";
import type { ReasoningStream } from "./stream";
import { ResultSynthesisEngine } from "./synthesis-engine";
import type { Problem, StreamResult, StreamStatus, StreamType, SynthesizedResult } from "./types";

/**
 * Orchestrator for parallel reasoning streams
 *
 * Executes four reasoning streams (analytical, creative, critical, synthetic)
 * in parallel with proper timeout management and graceful degradation.
 */
export class ParallelReasoningOrchestrator {
  private readonly defaultTotalTimeout: number = 30000; // 30s total
  private readonly coordinationManager: StreamCoordinationManager;
  private readonly synthesisEngine: ResultSynthesisEngine;

  /**
   * Create a new parallel reasoning orchestrator
   */
  constructor() {
    this.coordinationManager = new StreamCoordinationManager();
    this.synthesisEngine = new ResultSynthesisEngine();
  }

  /**
   * Get the coordination manager
   *
   * @returns Stream coordination manager instance
   */
  getCoordinationManager(): StreamCoordinationManager {
    return this.coordinationManager;
  }

  /**
   * Execute reasoning streams in parallel
   *
   * @param problem - Problem to analyze
   * @param streams - Array of reasoning streams to execute
   * @param totalTimeout - Total timeout in milliseconds (default: 30000ms)
   * @returns Promise resolving to synthesized result
   */
  async executeStreams(
    problem: Problem,
    streams: ReasoningStream[],
    totalTimeout: number = this.defaultTotalTimeout
  ): Promise<SynthesizedResult> {
    // Execute all streams in parallel with individual timeouts
    const streamPromises = streams.map((stream) =>
      this.executeStreamWithTimeout(stream, problem, stream.timeout)
    );

    // Share insights between streams during execution (optimization)
    // This happens asynchronously and doesn't block stream execution
    this.shareInsightsDuringExecution(streams).catch(() => {
      // Ignore errors in insight sharing to not block execution
    });

    // Wait for all streams with total timeout
    const results = await this.executeWithTotalTimeout(streamPromises, totalTimeout);

    // Synthesize results from all streams
    const synthesizedResult = this.synthesisEngine.synthesizeResults(results);

    return synthesizedResult;
  }

  /**
   * Share insights between streams during execution
   *
   * @param streams - Array of reasoning streams
   */
  private async shareInsightsDuringExecution(streams: ReasoningStream[]): Promise<void> {
    // Wait a bit for streams to generate initial insights
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Share high-importance insights
    await this.coordinationManager.shareInsights(streams);
  }

  /**
   * Execute a single stream with timeout
   *
   * @param stream - Reasoning stream to execute
   * @param problem - Problem to analyze
   * @param timeout - Timeout in milliseconds
   * @returns Promise resolving to stream result
   */
  private async executeStreamWithTimeout(
    stream: ReasoningStream,
    problem: Problem,
    timeout: number
  ): Promise<StreamResult> {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<StreamResult>((_, reject) => {
        setTimeout(() => {
          stream.cancel();
          reject(new Error(`Stream ${stream.type} timed out after ${timeout}ms`));
        }, timeout);
      });

      // Race between stream execution and timeout
      const result = await Promise.race([stream.process(problem), timeoutPromise]);

      return result;
    } catch (error) {
      // Handle timeout or execution error
      const isTimeout = error instanceof Error && error.message.includes("timed out");

      return {
        streamId: stream.id,
        streamType: stream.type,
        conclusion: "",
        reasoning: [],
        insights: [],
        confidence: 0,
        processingTime: timeout,
        status: isTimeout ? ("timeout" as StreamStatus) : ("failed" as StreamStatus),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Execute promises with total timeout
   *
   * @param promises - Array of stream promises
   * @param totalTimeout - Total timeout in milliseconds
   * @returns Promise resolving to array of stream results
   */
  private async executeWithTotalTimeout(
    promises: Promise<StreamResult>[],
    totalTimeout: number
  ): Promise<StreamResult[]> {
    try {
      // Create total timeout promise
      const timeoutPromise = new Promise<StreamResult[]>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Total execution timed out after ${totalTimeout}ms`));
        }, totalTimeout);
      });

      // Race between all streams and total timeout
      const results = await Promise.race([Promise.allSettled(promises), timeoutPromise]);

      // Extract results from settled promises
      return (results as PromiseSettledResult<StreamResult>[]).map((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          // Promise was rejected
          return {
            streamId: "unknown",
            streamType: "analytical" as StreamType,
            conclusion: "",
            reasoning: [],
            insights: [],
            confidence: 0,
            processingTime: 0,
            status: "failed" as StreamStatus,
            error:
              result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
          };
        }
      });
    } catch {
      // Total timeout exceeded - return whatever we have
      const settledResults = await Promise.allSettled(promises);

      return settledResults.map((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            streamId: "unknown",
            streamType: "analytical" as StreamType,
            conclusion: "",
            reasoning: [],
            insights: [],
            confidence: 0,
            processingTime: 0,
            status: "timeout" as StreamStatus,
            error:
              result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
          };
        }
      });
    }
  }
}
