/**
 * Analytical Reasoning Stream
 *
 * Implements logical, systematic analysis with:
 * - Problem decomposition into sub-problems
 * - Step-by-step systematic analysis
 * - Evidence evaluation and validation
 * - Structured solution generation
 * - Progress tracking and timeout management
 * - Problem-specific insights (Requirements 4.1, 15.3, 15.4)
 */

import { KeyTermExtractor, type KeyTerms } from "../key-term-extractor";
import type { ReasoningStream, StreamProcessor } from "../stream";
import { StreamStatus, StreamType, type Insight, type Problem, type StreamResult } from "../types";

/**
 * Analytical stream processor
 *
 * Implements the core analytical reasoning logic with systematic
 * problem decomposition and evidence-based analysis.
 * Generates problem-specific insights using key term extraction.
 */
export class AnalyticalStreamProcessor implements StreamProcessor {
  private readonly keyTermExtractor: KeyTermExtractor;

  constructor() {
    this.keyTermExtractor = new KeyTermExtractor();
  }

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
    if (!problem?.id || !problem.description) {
      throw new Error("Invalid problem: missing required fields");
    }

    try {
      // Extract key terms for problem-specific insights (Req 4.1, 15.3, 15.4)
      const keyTerms = this.keyTermExtractor.extract(problem.description, problem.context);

      // Step 1: Analyze problem structure
      reasoning.push(
        `Analyzing problem: ${problem.description.substring(0, 100)}${problem.description.length > 100 ? "..." : ""}`
      );

      // Step 2: Decompose into sub-problems
      const subProblems = this.decomposeProblem(problem, keyTerms);
      if (subProblems.length > 1) {
        reasoning.push(
          `Decomposed into ${subProblems.length} sub-problems: ${subProblems.join(", ")}`
        );
      }

      // Step 3: Evaluate available evidence
      const evidenceQuality = this.evaluateEvidence(problem, keyTerms);
      reasoning.push(
        `Evidence assessment: ${evidenceQuality.description}. ${evidenceQuality.gaps.length > 0 ? `Gaps identified: ${evidenceQuality.gaps.join(", ")}` : "Sufficient data available."}`
      );

      // Step 4: Consider constraints
      if (problem.constraints && problem.constraints.length > 0) {
        reasoning.push(`Constraints to consider: ${problem.constraints.join(", ")}`);
        const constraintTerms = this.keyTermExtractor.formatTermsForInsight(keyTerms, 2);
        const constraintContent = `Analysis of ${constraintTerms ?? "the problem"} must account for ${problem.constraints.length} constraint(s): ${problem.constraints.join(", ")}`;
        insights.push({
          content: constraintContent,
          source: StreamType.ANALYTICAL,
          confidence: 0.9,
          importance: 0.7,
          referencedTerms: this.keyTermExtractor.findReferencedTerms(constraintContent, keyTerms),
        });
      }

      // Step 5: Systematic analysis of each sub-problem
      for (let i = 0; i < subProblems.length; i++) {
        const subProblem = subProblems[i];
        const analysis = this.analyzeSubProblem(
          subProblem,
          problem,
          i,
          subProblems.length,
          keyTerms
        );
        reasoning.push(analysis.reasoning);
        if (analysis.insight) {
          insights.push(analysis.insight);
        }
      }

      // Step 6: Synthesize findings
      const conclusion = this.generateConclusion(problem, subProblems, evidenceQuality, keyTerms);
      reasoning.push(`Therefore, ${conclusion}`);

      // Step 7: Generate actionable insights
      const actionableInsights = this.generateInsights(
        problem,
        subProblems,
        evidenceQuality,
        keyTerms
      );
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
   * @param keyTerms - Extracted key terms for problem-specific decomposition
   * @returns Array of sub-problem descriptions
   */
  private decomposeProblem(problem: Problem, keyTerms: KeyTerms): string[] {
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
      // Use key terms for problem-specific decomposition
      const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the issue";
      const domainContext =
        keyTerms.domainTerms.length > 0 ? keyTerms.domainTerms.slice(0, 2).join(" and ") : "";

      // Default decomposition for moderate/complex problems with specific terms
      if (domainContext) {
        subProblems.push(`Root cause analysis of ${primaryTerm} in context of ${domainContext}`);
      } else {
        subProblems.push(`Root cause analysis of ${primaryTerm}`);
      }

      if (problem.goals && problem.goals.length > 0) {
        subProblems.push(`Solution identification for ${primaryTerm}: ${problem.goals.join(", ")}`);
      }

      if (problem.constraints && problem.constraints.length > 0) {
        subProblems.push(
          `Constraint impact on ${primaryTerm}: ${problem.constraints.slice(0, 2).join(", ")}`
        );
      }
    }

    return subProblems.length > 0 ? subProblems : [problem.description];
  }

  /**
   * Evaluate available evidence
   *
   * @param problem - Problem with context
   * @param keyTerms - Extracted key terms for specific gap identification
   * @returns Evidence quality assessment
   */
  private evaluateEvidence(
    problem: Problem,
    keyTerms: KeyTerms
  ): {
    quality: number;
    description: string;
    gaps: string[];
  } {
    const gaps: string[] = [];
    let quality = 0.5;

    // Check for ambiguous or vague problem description
    quality = this.evaluateAmbiguity(problem, keyTerms, gaps, quality);

    // Check context richness
    quality = this.evaluateContext(problem, keyTerms, gaps, quality);

    // Check for quantitative data - use specific terms
    quality = this.evaluateQuantitativeData(problem, keyTerms, gaps, quality);

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

  private evaluateAmbiguity(
    problem: Problem,
    keyTerms: KeyTerms,
    gaps: string[],
    quality: number
  ): number {
    const isAmbiguous =
      problem.description.toLowerCase().includes("something") ||
      problem.description.toLowerCase().includes("wrong") ||
      problem.description.length < 30;

    if (isAmbiguous) {
      const subject = keyTerms.primarySubject ?? "the issue";
      gaps.push(`Clarify specific aspects of ${subject} that need addressing`);
      return quality - 0.3;
    }
    return quality;
  }

  private evaluateContext(
    problem: Problem,
    keyTerms: KeyTerms,
    gaps: string[],
    quality: number
  ): number {
    if (!problem.context || problem.context.length < 20) {
      if (keyTerms.domainTerms.length > 0) {
        gaps.push(`More details about ${keyTerms.domainTerms[0]} implementation needed`);
      } else if (keyTerms.primarySubject) {
        gaps.push(`More context about ${keyTerms.primarySubject} needed`);
      } else {
        gaps.push("Limited context provided");
      }
      return quality - 0.2;
    } else if (problem.context.length > 100) {
      return quality + 0.2;
    }
    return quality;
  }

  private evaluateQuantitativeData(
    problem: Problem,
    keyTerms: KeyTerms,
    gaps: string[],
    quality: number
  ): number {
    const hasNumbers = /\d+%|\d+\.\d+|\d+ (users|customers|percent)/.test(problem.context ?? "");
    if (hasNumbers) {
      return quality + 0.2;
    }

    if (keyTerms.domainTerms.length > 0) {
      const domain = keyTerms.domainTerms[0];
      this.addDomainSpecificGap(domain, gaps);
    }

    const hasSpecifics =
      (problem.context ?? "").includes(":") || (problem.context ?? "").includes("shows");
    if (hasSpecifics) {
      return quality + 0.1;
    }
    return quality;
  }

  private addDomainSpecificGap(domain: string, gaps: string[]): void {
    if (domain === "performance" || domain === "latency" || domain === "throughput") {
      gaps.push(`${domain} metrics (response times, throughput numbers) would strengthen analysis`);
    } else if (domain === "user" || domain === "customer" || domain === "engagement") {
      gaps.push(`${domain} metrics (conversion rates, retention data) would strengthen analysis`);
    } else {
      gaps.push(`Quantitative ${domain} data would strengthen analysis`);
    }
  }

  /**
   * Analyze a sub-problem with term reference tracking
   *
   * @param subProblem - Sub-problem description
   * @param problem - Original problem
   * @param index - Index of this sub-problem
   * @param total - Total number of sub-problems
   * @param keyTerms - Extracted key terms for problem-specific analysis
   * @returns Analysis result with referenced terms tracked
   */
  private analyzeSubProblem(
    subProblem: string,
    problem: Problem,
    index: number,
    total: number,
    keyTerms: KeyTerms
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

    // Generate insight based on sub-problem type with problem-specific terms
    let insight: Insight | undefined;
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the system";
    const domainContext = keyTerms.domainTerms.slice(0, 2).join(", ");

    if (subProblem.toLowerCase().includes("root cause")) {
      const contextSnippet = problem.context.substring(0, 50);
      reasoning += `We must examine underlying factors affecting ${primaryTerm}: ${contextSnippet}...`;
      const content = `Root cause analysis of ${primaryTerm} requires examining: ${contextSnippet}${domainContext ? ` (focusing on ${domainContext})` : ""}`;
      insight = {
        content,
        source: StreamType.ANALYTICAL,
        confidence: 0.75,
        importance: 0.85,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      };
    } else if (subProblem.toLowerCase().includes("solution")) {
      const constraintContext =
        problem.constraints?.slice(0, 2).join(", ") ?? "identified constraints";
      reasoning += `Solutions for ${primaryTerm} must address identified causes while respecting ${constraintContext}.`;
      const content = `Solutions for ${primaryTerm} must address root causes while respecting: ${constraintContext}`;
      insight = {
        content,
        source: StreamType.ANALYTICAL,
        confidence: 0.8,
        importance: 0.8,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      };
    } else if (subProblem.toLowerCase().includes("constraint")) {
      reasoning += `Evaluating how constraints impact ${primaryTerm}.`;
      const content = `Constraints directly impact ${primaryTerm} implementation approach`;
      insight = {
        content,
        source: StreamType.ANALYTICAL,
        confidence: 0.75,
        importance: 0.7,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      };
    } else {
      reasoning += `Analysis of ${primaryTerm} complete.`;
    }

    return { reasoning, insight };
  }

  /**
   * Generate conclusion from analysis with validated term references
   *
   * @param problem - Original problem
   * @param subProblems - Identified sub-problems
   * @param evidenceQuality - Evidence assessment
   * @param keyTerms - Extracted key terms for problem-specific conclusion
   * @returns Conclusion statement with guaranteed key term reference
   */
  private generateConclusion(
    problem: Problem,
    _subProblems: string[],
    evidenceQuality: { quality: number; gaps: string[] },
    keyTerms: KeyTerms
  ): string {
    const parts: string[] = [];
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the issue";

    // Address the main problem with specific terms
    if (problem.goals && problem.goals.length > 0) {
      parts.push(`to achieve ${problem.goals[0]} for ${primaryTerm}`);
    } else {
      parts.push(`to address ${primaryTerm}`);
    }

    // Note evidence quality with specific recommendations (avoid generic "additional data collection")
    if (evidenceQuality.quality < 0.5) {
      // Provide specific recommendations based on gaps instead of generic advice
      if (evidenceQuality.gaps.length > 0) {
        const specificGap = evidenceQuality.gaps[0];
        parts.push(`focus on: ${specificGap}`);
      } else if (keyTerms.domainTerms.length > 0) {
        parts.push(`a focused analysis of ${keyTerms.domainTerms[0]} factors is recommended`);
      } else {
        parts.push(`a targeted investigation of ${primaryTerm} specifics is recommended`);
      }
    } else {
      // Provide specific systematic approach
      if (keyTerms.actionVerbs.length > 0) {
        parts.push(
          `the analysis supports a systematic approach to ${keyTerms.actionVerbs[0]} ${primaryTerm}`
        );
      } else {
        parts.push(`the analysis supports a systematic approach to improving ${primaryTerm}`);
      }
    }

    // Consider constraints with specifics
    if (problem.constraints && problem.constraints.length > 0) {
      parts.push(`within the given constraints (${problem.constraints.slice(0, 2).join(", ")})`);
    }

    // Validate and ensure conclusion contains at least one key term
    const conclusion = parts.join(", ");
    return this.keyTermExtractor.ensureTermReference(conclusion, keyTerms);
  }

  /**
   * Generate actionable insights with term reference tracking
   *
   * @param problem - Original problem
   * @param subProblems - Identified sub-problems
   * @param evidenceQuality - Evidence assessment
   * @param keyTerms - Extracted key terms for problem-specific insights
   * @returns Array of insights with referenced terms tracked
   */
  private generateInsights(
    problem: Problem,
    subProblems: string[],
    evidenceQuality: { quality: number; gaps: string[] },
    keyTerms: KeyTerms
  ): Insight[] {
    const insights: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the system";
    const domainContext = keyTerms.domainTerms.slice(0, 2).join(" and ");

    // Insight about problem complexity with specific terms
    if (subProblems.length > 2) {
      const content = `${primaryTerm} has ${subProblems.length} distinct aspects${domainContext ? ` involving ${domainContext}` : ""} requiring coordinated approach`;
      insights.push({
        content,
        source: StreamType.ANALYTICAL,
        confidence: 0.85,
        importance: 0.75,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }

    // Insight about evidence gaps - use specific gaps, not generic recommendations
    if (evidenceQuality.gaps.length > 0) {
      // Format gaps as specific, actionable items
      const specificGaps = evidenceQuality.gaps.slice(0, 2).join("; ");
      const content = `For ${primaryTerm}: ${specificGaps}`;
      insights.push({
        content,
        source: StreamType.ANALYTICAL,
        confidence: 0.9,
        importance: 0.8,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }

    // Insight about urgency with problem-specific context
    if (problem.urgency === "high") {
      const content = `High urgency for ${primaryTerm} requires prioritizing quick wins${domainContext ? ` in ${domainContext}` : ""} while planning comprehensive solution`;
      insights.push({
        content,
        source: StreamType.ANALYTICAL,
        confidence: 0.8,
        importance: 0.85,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }

    // Add domain-specific insight if we have domain terms
    if (keyTerms.domainTerms.length > 0 && keyTerms.actionVerbs.length > 0) {
      const content = `Key action for ${primaryTerm}: ${keyTerms.actionVerbs[0]} ${keyTerms.domainTerms[0]} to address core issues`;
      insights.push({
        content,
        source: StreamType.ANALYTICAL,
        confidence: 0.75,
        importance: 0.7,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
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
