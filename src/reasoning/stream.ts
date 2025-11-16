/**
 * Base interfaces for reasoning streams
 *
 * This module defines the core interfaces for reasoning streams that
 * process problems in parallel using different cognitive approaches.
 */

import type { Problem, StreamResult, StreamType } from "./types";

/**
 * Stream processor interface
 *
 * Defines the contract for processing logic that can be executed
 * by a reasoning stream. Implementations provide the actual reasoning
 * algorithms for each stream type.
 */
export interface StreamProcessor {
  /**
   * Process a problem and generate a result
   *
   * @param problem - Problem to analyze
   * @returns Promise resolving to stream result
   */
  process(problem: Problem): Promise<StreamResult>;

  /**
   * Get the stream type this processor handles
   *
   * @returns Stream type identifier
   */
  getStreamType(): StreamType;
}

/**
 * Reasoning stream interface
 *
 * Represents a single reasoning stream that processes problems
 * independently with timeout management and progress tracking.
 */
export interface ReasoningStream {
  /** Unique stream identifier */
  id: string;

  /** Type of reasoning this stream performs */
  type: StreamType;

  /** Processor that implements the reasoning logic */
  processor: StreamProcessor;

  /** Timeout in milliseconds (default: 10000ms = 10s) */
  timeout: number;

  /**
   * Process a problem using this stream's reasoning approach
   *
   * @param problem - Problem to analyze
   * @returns Promise resolving to stream result
   * @throws Error if processing fails or times out
   */
  process(problem: Problem): Promise<StreamResult>;

  /**
   * Get current processing progress
   *
   * @returns Progress value between 0 (not started) and 1 (complete)
   */
  getProgress(): number;

  /**
   * Cancel stream processing
   *
   * Stops the stream execution and cleans up resources.
   * The stream result will have status 'cancelled'.
   */
  cancel(): void;
}
