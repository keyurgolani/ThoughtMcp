/**
 * Base implementation for reasoning streams
 */

import {
  Evidence,
  ReasoningStream,
  ReasoningStreamType,
  StreamResult,
  StreamStatus,
} from "../../interfaces/parallel-reasoning.js";
import { Problem } from "../../interfaces/systematic-thinking.js";
import { Context, ReasoningStep, ReasoningType } from "../../types/core.js";

export abstract class BaseReasoningStream implements ReasoningStream {
  public readonly id: string;
  public readonly type: ReasoningStreamType;
  public readonly name: string;
  public readonly description: string;

  protected initialized: boolean = false;
  protected active: boolean = false;
  protected processing: boolean = false;
  protected lastActivity: number = 0;
  protected error?: string;

  constructor(
    type: ReasoningStreamType,
    name: string,
    description: string,
    id?: string
  ) {
    this.id =
      id || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.name = name;
    this.description = description;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.doInitialize();
      this.initialized = true;
      this.active = true;
      this.lastActivity = Date.now();
      this.error = undefined;
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Initialization failed";
      throw error;
    }
  }

  async process(problem: Problem, context?: Context): Promise<StreamResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.processing = true;
    this.lastActivity = Date.now();
    const startTime = Date.now();

    try {
      const result = await this.doProcess(problem, context);

      const processingTime = Date.now() - startTime;

      return {
        stream_id: this.id,
        stream_type: this.type,
        reasoning_steps: result.reasoning_steps,
        conclusions: result.conclusions,
        confidence: result.confidence,
        processing_time_ms: processingTime,
        insights: result.insights,
        evidence: result.evidence,
        assumptions: result.assumptions,
      };
    } catch (error) {
      this.error = error instanceof Error ? error.message : "Processing failed";
      throw error;
    } finally {
      this.processing = false;
      this.lastActivity = Date.now();
    }
  }

  reset(): void {
    this.processing = false;
    this.error = undefined;
    this.lastActivity = Date.now();
    this.doReset();
  }

  getStatus(): StreamStatus {
    return {
      stream_id: this.id,
      active: this.active,
      processing: this.processing,
      last_activity: this.lastActivity,
      error: this.error,
    };
  }

  // Abstract methods to be implemented by specific stream types
  protected abstract doInitialize(): Promise<void>;
  protected abstract doProcess(
    problem: Problem,
    context?: Context
  ): Promise<{
    reasoning_steps: ReasoningStep[];
    conclusions: string[];
    confidence: number;
    insights: string[];
    evidence: Evidence[];
    assumptions: string[];
  }>;
  protected abstract doReset(): void;

  // Helper methods for common stream operations
  protected createReasoningStep(
    type: ReasoningType,
    content: string,
    confidence: number,
    metadata?: Record<string, unknown>
  ): ReasoningStep {
    return {
      type,
      content,
      confidence,
      alternatives: [],
      metadata,
    };
  }

  protected createEvidence(
    content: string,
    source: string,
    reliability: number = 0.7,
    relevance: number = 0.8
  ): Evidence {
    return {
      content,
      source,
      reliability: Math.max(0, Math.min(1, reliability)),
      relevance: Math.max(0, Math.min(1, relevance)),
    };
  }

  protected extractKeywords(text: string): string[] {
    // Simple keyword extraction
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter(
        (word) => !/^(the|and|or|but|in|on|at|to|for|of|with|by)$/.test(word)
      )
      .slice(0, 10); // Limit to top 10 keywords
  }

  protected assessComplexity(problem: Problem): number {
    let complexity = problem.complexity || 0.5;

    // Adjust based on problem characteristics
    if (problem.constraints.length > 3) complexity += 0.1;
    if (problem.stakeholders.length > 2) complexity += 0.1;
    if (problem.uncertainty > 0.7) complexity += 0.1;

    return Math.min(1.0, complexity);
  }

  protected generateInsights(
    problem: Problem,
    reasoningSteps: ReasoningStep[]
  ): string[] {
    const insights: string[] = [];

    // Generate insights based on problem characteristics
    if (problem.complexity > 0.7) {
      insights.push("High complexity requires systematic decomposition");
    }

    if (problem.uncertainty > 0.6) {
      insights.push(
        "Significant uncertainty suggests need for multiple scenarios"
      );
    }

    if (problem.time_sensitivity > 0.8) {
      insights.push(
        "Time pressure may require rapid decision-making approaches"
      );
    }

    // Generate insights based on reasoning depth
    if (reasoningSteps.length > 5) {
      insights.push("Multi-step reasoning reveals interconnected factors");
    }

    return insights;
  }
}
