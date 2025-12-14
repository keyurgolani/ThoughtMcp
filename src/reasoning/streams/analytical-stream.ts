/**
 * Analytical Reasoning Stream
 *
 * Implements logical, systematic analysis with:
 * - Problem decomposition into sub-problems
 * - Step-by-step systematic analysis
 * - Evidence evaluation and validation
 * - Structured solution generation
 * - Progress tracking and timeout management
 */

import type { ReasoningStream, StreamProcessor } from "../stream";
import { StreamStatus, StreamType, type Insight, type Problem, type StreamResult } from "../types";

/**
 * Analytical stream processor
 *
 * Implements the core analytical reasoning logic with systematic
 * problem decomposition and evidence-based analysis.
 */
export class AnalyticalStreamProcessor implements StreamProcessor {
  /**
   * Process a problem using analytical reasoning
   *
   * @param problem - Problem to analyze
   * @returns Promise resolving to stream result
   */
  async process(problem: Problem): Promise<StreamResult> {
    const startTime = Date.now();
    const reasoning: string[] = [];
    const insights: Insight[] = [];

    // Validate problem - throw for truly invalid problems
    if (!problem || !problem.id || !problem.description) {
      throw new Error("Invalid problem: missing required fields");
    }

    try {
      // Step 1: Analyze problem structure
      reasoning.push(
        `Analyzing problem: ${problem.description.substring(0, 100)}${problem.description.length > 100 ? "..." : ""}`
      );

      // Step 2: Decompose into sub-problems
      const subProblems = this.decomposeProblem(problem);
      if (subProblems.length > 1) {
        reasoning.push(
          `Decomposed into ${subProblems.length} sub-problems: ${subProblems.join(", ")}`
        );
      }

      // Step 3: Evaluate available evidence
      const evidenceQuality = this.evaluateEvidence(problem);
      reasoning.push(
        `Evidence assessment: ${evidenceQuality.description}. ${evidenceQuality.gaps.length > 0 ? `Gaps identified: ${evidenceQuality.gaps.join(", ")}` : "Sufficient data available."}`
      );

      // Step 4: Consider constraints
      if (problem.constraints && problem.constraints.length > 0) {
        reasoning.push(`Constraints to consider: ${problem.constraints.join(", ")}`);
        insights.push({
          content: `Analysis must account for ${problem.constraints.length} constraint(s)`,
          source: StreamType.ANALYTICAL,
          confidence: 0.9,
          importance: 0.7,
        });
      }

      // Step 5: Systematic analysis of each sub-problem
      for (let i = 0; i < subProblems.length; i++) {
        const subProblem = subProblems[i];
        const analysis = this.analyzeSubProblem(subProblem, problem, i, subProblems.length);
        reasoning.push(analysis.reasoning);
        if (analysis.insight) {
          insights.push(analysis.insight);
        }
      }

      // Step 6: Synthesize findings
      const conclusion = this.generateConclusion(problem, subProblems, evidenceQuality);
      reasoning.push(`Therefore, ${conclusion}`);

      // Step 7: Generate actionable insights
      const actionableInsights = this.generateInsights(problem, subProblems, evidenceQuality);
      insights.push(...actionableInsights);

      // Calculate confidence based on evidence quality and problem clarity
      const confidence = this.calculateConfidence(problem, evidenceQuality);

      const processingTime = Math.max(1, Date.now() - startTime);

      return {
        streamId: `analytical-${problem.id}`,
        streamType: StreamType.ANALYTICAL,
        conclusion,
        reasoning,
        insights,
        confidence,
        processingTime,
        status: StreamStatus.COMPLETED,
      };
    } catch (error) {
      const processingTime = Math.max(1, Date.now() - startTime);
      return {
        streamId: `analytical-${problem.id}`,
        streamType: StreamType.ANALYTICAL,
        conclusion: "",
        reasoning,
        insights,
        confidence: 0,
        processingTime,
        status: StreamStatus.FAILED,
        error: error as Error,
      };
    }
  }

  /**
   * Get the strtype this processor handles
   *
   * @returns Stream type identifier
   */
  getStreamType(): StreamType {
    return StreamType.ANALYTICAL;
  }

  /**
   * Decompose problem into sub-problems
   *
   * @param problem - Problem to decompose
   * @returns Array of sub-problem descriptions
   */
  private decomposeProblem(problem: Problem): string[] {
    const subProblems: string[] = [];

    // For simple problems, don't over-decompose
    if (problem.complexity === "simple") {
      subProblems.push(problem.description);
      return subProblems;
    }

    // Identify key aspects based on problem description
    const description = problem.description.toLowerCase();

    // Look for multiple aspects or causes
    if (description.includes("and") || description.includes("multiple")) {
      const parts = problem.description.split(/\band\b/i);
      subProblems.push(...parts.map((p) => p.trim()).filter((p) => p.length > 0));
    } else {
      // Default decomposition for moderate/complex problems
      subProblems.push(`Root cause analysis: ${problem.description}`);

      if (problem.goals && problem.goals.length > 0) {
        subProblems.push(`Solution identification for: ${problem.goals.join(", ")}`);
      }

      if (problem.constraints && problem.constraints.length > 0) {
        subProblems.push(`Constraint impact assessment`);
      }
    }

    return subProblems.length > 0 ? subProblems : [problem.description];
  }

  /**
   * Evaluate available evidence
   *
   * @param problem - Problem with context
   * @returns Evidence quality assessment
   */
  private evaluateEvidence(problem: Problem): {
    quality: number;
    description: string;
    gaps: string[];
  } {
    const gaps: string[] = [];
    let quality = 0.5;

    // Check for ambiguous or vague problem description
    const isAmbiguous =
      problem.description.toLowerCase().includes("something") ||
      problem.description.toLowerCase().includes("wrong") ||
      problem.description.length < 30;

    if (isAmbiguous) {
      gaps.push("Problem description is unclear or ambiguous - need more specific information");
      quality -= 0.3;
    }

    // Check context richness
    if (!problem.context || problem.context.length < 20) {
      gaps.push("Limited context provided");
      quality -= 0.2;
    } else if (problem.context.length > 100) {
      quality += 0.2;
    }

    // Check for quantitative data
    const hasNumbers = /\d+%|\d+\.\d+|\d+ (users|customers|percent)/.test(problem.context);
    if (hasNumbers) {
      quality += 0.2;
    } else {
      gaps.push("Quantitative data needed");
    }

    // Check for specific details
    const hasSpecifics = problem.context.includes(":") || problem.context.includes("shows");
    if (hasSpecifics) {
      quality += 0.1;
    } else {
      gaps.push("More specific details required");
    }

    // Ensure quality is in valid range
    quality = Math.max(0.1, Math.min(1.0, quality));

    const description =
      quality > 0.7
        ? "Strong evidence base"
        : quality > 0.4
          ? "Moderate evidence available"
          : "Limited evidence";

    return { quality, description, gaps };
  }

  /**
   * Analyze a sub-problem
   *
   * @param subProblem - Sub-problem description
   * @param problem - Original problem
   * @param index - Index of this sub-problem
   * @param total - Total number of sub-problems
   * @returns Analysis result
   */
  private analyzeSubProblem(
    subProblem: string,
    problem: Problem,
    index: number,
    total: number
  ): { reasoning: string; insight?: Insight } {
    // Use logical connectors based on position
    let connector = "";
    if (index === 0) {
      connector = "first, ";
    } else if (index === total - 1) {
      connector = "therefore, ";
    } else {
      connector = "then, ";
    }

    let reasoning = `Examining ${connector}${subProblem}. `;

    // Generate insight based on sub-problem type
    let insight: Insight | undefined;

    if (subProblem.toLowerCase().includes("root cause")) {
      reasoning += `We must examine underlying factors in: ${problem.context.substring(0, 50)}...`;
      insight = {
        content: `Root cause analysis requires examining underlying factors in: ${problem.context.substring(0, 50)}...`,
        source: StreamType.ANALYTICAL,
        confidence: 0.75,
        importance: 0.85,
      };
    } else if (subProblem.toLowerCase().includes("solution")) {
      reasoning += `Solutions must address identified causes while respecting constraints.`;
      insight = {
        content: `Solutions must address identified causes while respecting constraints`,
        source: StreamType.ANALYTICAL,
        confidence: 0.8,
        importance: 0.8,
      };
    } else {
      reasoning += "Analysis complete.";
    }

    return { reasoning, insight };
  }

  /**
   * Generate conclusion from analysis
   *
   * @param problem - Original problem
   * @param subProblems - Identified sub-problems
   * @param evidenceQuality - Evidence assessment
   * @returns Conclusion statement
   */
  private generateConclusion(
    problem: Problem,
    _subProblems: string[],
    evidenceQuality: { quality: number; gaps: string[] }
  ): string {
    const parts: string[] = [];

    // Address the main problem
    if (problem.goals && problem.goals.length > 0) {
      parts.push(`to achieve ${problem.goals[0]}`);
    } else {
      parts.push(`to address ${problem.description}`);
    }

    // Note evidence quality
    if (evidenceQuality.quality < 0.5) {
      parts.push("additional data collection is recommended before proceeding");
    } else {
      parts.push("the analysis suggests a systematic approach");
    }

    // Consider constraints
    if (problem.constraints && problem.constraints.length > 0) {
      parts.push(`within the given constraints (${problem.constraints.join(", ")})`);
    }

    return parts.join(", ");
  }

  /**
   * Generate actionable insights
   *
   * @param problem - Original problem
   * @param subProblems - Identified sub-problems
   * @param evidenceQuality - Evidence assessment
   * @returns Array of insights
   */
  private generateInsights(
    problem: Problem,
    subProblems: string[],
    evidenceQuality: { quality: number; gaps: string[] }
  ): Insight[] {
    const insights: Insight[] = [];

    // Insight about problem complexity
    if (subProblems.length > 2) {
      insights.push({
        content: `Problem has ${subProblems.length} distinct aspects requiring coordinated approach`,
        source: StreamType.ANALYTICAL,
        confidence: 0.85,
        importance: 0.75,
      });
    }

    // Insight about evidence gaps
    if (evidenceQuality.gaps.length > 0) {
      insights.push({
        content: `Evidence gaps identified: ${evidenceQuality.gaps.join(", ")}. Recommend gathering this data.`,
        source: StreamType.ANALYTICAL,
        confidence: 0.9,
        importance: 0.8,
      });
    }

    // Insight about urgency
    if (problem.urgency === "high") {
      insights.push({
        content: `High urgency requires prioritizing quick wins while planning comprehensive solution`,
        source: StreamType.ANALYTICAL,
        confidence: 0.8,
        importance: 0.85,
      });
    }

    return insights;
  }

  /**
   * Calculate confidence score
   *
   * @param problem - Problem being analyzed
   * @param evidenceQuality - Evidence assessment
   * @returns Confidence score (0-1)
   */
  private calculateConfidence(problem: Problem, evidenceQuality: { quality: number }): number {
    let confidence = evidenceQuality.quality;

    // Adjust for problem clarity
    if (problem.description.length < 20) {
      confidence *= 0.8;
    }

    // Adjust for context availability
    if (!problem.context || problem.context.length < 50) {
      confidence *= 0.85;
    }

    // Adjust for complexity
    if (problem.complexity === "complex") {
      confidence *= 0.9;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }
}

/**
 * Analytical Reasoning Stream
 *
 * Implements a reasoning stream that performs logical, systematic analysis
 * with progress tracking, timeout management, and cancellation support.
 */
export class AnalyticalReasoningStream implements ReasoningStream {
  public readonly id: string;
  public readonly type: StreamType;
  public readonly processor: StreamProcessor;
  public readonly timeout: number;

  private progress: number = 0;
  private cancelled: boolean = false;
  private processing: boolean = false;

  /**
   * Create analytical reasoning stream
   *
   * @param timeout - Timeout in milliseconds (default: 10000ms)
   */
  constructor(timeout: number = 10000) {
    this.id = `analytical-stream-${Date.now()}`;
    this.type = StreamType.ANALYTICAL;
    this.processor = new AnalyticalStreamProcessor();
    this.timeout = timeout;
  }

  /**
   * Process a problem using analytical reasoning
   *
   * @param problem - Problem to analyze
   * @returns Promise resolving to stream result
   */
  async process(problem: Problem): Promise<StreamResult> {
    if (this.processing) {
      throw new Error("Stream is already processing");
    }

    this.processing = true;
    this.progress = 0;
    this.cancelled = false;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<StreamResult>((resolve) => {
        setTimeout(() => {
          if (!this.cancelled) {
            resolve({
              streamId: this.id,
              streamType: this.type,
              conclusion: "Analysis incomplete due to timeout",
              reasoning: ["Processing exceeded time limit"],
              insights: [],
              confidence: 0.3,
              processingTime: this.timeout,
              status: StreamStatus.TIMEOUT,
            });
          }
        }, this.timeout);
      });

      // Create processing promise with progress tracking
      const processingPromise = this.processWithProgress(problem);

      // Race between processing and timeout
      const result = await Promise.race([processingPromise, timeoutPromise]);

      // Check if cancelled
      if (this.cancelled) {
        return {
          streamId: this.id,
          streamType: this.type,
          conclusion: "",
          reasoning: [],
          insights: [],
          confidence: 0,
          processingTime: Date.now() - Date.now(),
          status: StreamStatus.CANCELLED,
        };
      }

      this.progress = 1.0;
      return result;
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process with progress tracking
   *
   * @param problem - Problem to analyze
   * @returns Promise resolving to stream result
   */
  private async processWithProgress(problem: Problem): Promise<StreamResult> {
    // Simulate progress updates during processing
    const progressInterval = setInterval(() => {
      if (!this.cancelled && this.progress < 0.9) {
        this.progress += 0.1;
      }
    }, this.timeout / 10);

    try {
      const result = await this.processor.process(problem);

      clearInterval(progressInterval);
      this.progress = 1.0;

      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  /**
   * Get current processing progress
   *
   * @returns Progress value between 0 and 1
   */
  getProgress(): number {
    return this.progress;
  }

  /**
   * Cancel stream processing
   */
  cancel(): void {
    this.cancelled = true;
    this.progress = 0;
  }
}
