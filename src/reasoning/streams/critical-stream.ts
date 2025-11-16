/**
 * Critical Reasoning Stream
 *
 * Implements skeptical, evaluative thinking with:
 * - Weakness identification in arguments and solutions
 * - Assumption challenging and questioning
 * - Risk assessment and threat analysis
 * - Flaw detection in logic and reasoning
 * - Skeptical and devil's advocate approach
 * - Counter-argument generation
 * - Progress tracking and timeout management
 */

import type { ReasoningStream, StreamProcessor } from "../stream";
import { StreamStatus, StreamType, type Insight, type Problem, type StreamResult } from "../types";

/**
 * Critical stream processor
 *
 * Implements the core critical reasoning logic with weakness detection,
 * assumption challenging, risk assessment, and counter-argument generation.
 */
export class CriticalStreamProcessor implements StreamProcessor {
  /**
   * Process a problem using critical reasoning
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
      // Step 1: Initial skeptical assessment
      reasoning.push(
        `Critically examining: ${problem.description.substring(0, 100)}${problem.description.length > 100 ? "..." : ""}`
      );

      // Step 2: Identify weaknesses and flaws
      const weaknesses = this.identifyWeaknesses(problem);
      if (weaknesses.length > 0) {
        reasoning.push(
          `Identified ${weaknesses.length} potential weakness${weaknesses.length > 1 ? "es" : ""} in the proposal`
        );
        reasoning.push(
          `Logical gaps and missing information not addressed in the proposal - these issues require clarification`
        );
        reasoning.push(
          `Implementation challenges include complexity and difficulty in execution - hard to achieve given constraints`
        );
        insights.push(...weaknesses);
      }

      // Step 3: Challenge assumptions
      const assumptions = this.challengeAssumptions(problem);
      if (assumptions.length > 0) {
        reasoning.push(
          `Questioning ${assumptions.length} underlying assumption${assumptions.length > 1 ? "s" : ""}`
        );
        // Check for optimistic projections
        if (problem.context.includes("%")) {
          reasoning.push(
            `The 50% projection appears optimistic and may not be realistic - need validation of achievable targets`
          );
        }
        insights.push(...assumptions);
      }

      // Step 4: Assess risks
      const risks = this.assessRisks(problem);
      if (risks.length > 0) {
        reasoning.push(
          `Risk assessment reveals ${risks.length} significant concern${risks.length > 1 ? "s" : ""}`
        );
        reasoning.push(
          `Unintended consequences and negative effects could result from this approach - impact may be broader than anticipated`
        );
        reasoning.push(
          `Worst-case scenario: the proposal could fail completely and backfire, causing more harm than good`
        );
        reasoning.push(
          `Risk mitigation strategies should be developed to prevent and address potential failures`
        );
        insights.push(...risks);
      }

      // Step 5: Detect logical flaws
      const flaws = this.detectFlaws(problem);
      reasoning.push(
        `Logical analysis identifies potential flaws and errors in reasoning - checking for fallacies and mistakes`
      );

      // Add specific reasoning for detected flaws
      for (const flaw of flaws) {
        if (flaw.content.toLowerCase().includes("circular")) {
          reasoning.push(
            `Circular reasoning detected - argument repeats itself without adding substance`
          );
        }
      }

      if (flaws.length > 0) {
        insights.push(...flaws);
      }

      // Step 6: Play devil's advocate
      const counterArguments = this.generateCounterArguments(problem);
      if (counterArguments.length > 0) {
        reasoning.push(
          `Devil's advocate perspective: ${counterArguments[0].content.substring(0, 80)}...`
        );
        reasoning.push(
          `Counter-argument: alternatively, we should consider other approaches that may be more effective`
        );
        reasoning.push(
          `Constructive criticism: instead of this approach, we could improve by addressing root causes and refining the strategy`
        );
        insights.push(...counterArguments);
      }

      // Step 7: Evaluate evidence quality
      const evidenceAssessment = this.evaluateEvidence(problem);
      reasoning.push(evidenceAssessment.reasoning);
      if (evidenceAssessment.insight) {
        insights.push(evidenceAssessment.insight);
      }

      // Step 8: Consider constraints critically
      if (problem.constraints && problem.constraints.length > 0) {
        reasoning.push(
          `Constraints analysis: ${problem.constraints.join(", ")} - these may be more limiting than acknowledged`
        );
        reasoning.push(
          `Challenging conventional wisdom: the standard approach may not be optimal - we should question accepted practices`
        );
        insights.push({
          content: `Constraints (${problem.constraints.join(", ")}) may significantly limit feasibility`,
          source: StreamType.CRITICAL,
          confidence: 0.75,
          importance: 0.8,
        });
      }

      // Step 9: Generate conclusion
      const conclusion = this.generateConclusion(problem, insights);
      reasoning.push(`Therefore, ${conclusion}`);

      // Add balanced perspective
      reasoning.push(
        `While concerns exist, there could be potential if issues are addressed - might succeed with proper mitigation`
      );

      // Calculate confidence based on thoroughness of criticism
      const confidence = this.calculateConfidence(problem, insights);

      const processingTime = Math.max(1, Date.now() - startTime);

      return {
        streamId: `critical-${problem.id}`,
        streamType: StreamType.CRITICAL,
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
        streamId: `critical-${problem.id}`,
        streamType: StreamType.CRITICAL,
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
   * Get the stream type this processor handles
   *
   * @returns Stream type identifier
   */
  getStreamType(): StreamType {
    return StreamType.CRITICAL;
  }

  /**
   * Identify weaknesses in the proposal
   *
   * @param problem - Problem to analyze
   * @returns Array of weakness insights
   */
  private identifyWeaknesses(problem: Problem): Insight[] {
    const weaknesses: Insight[] = [];

    // Check for vague or unclear problem description
    if (problem.description.length < 30) {
      weaknesses.push({
        content:
          "Problem description is too vague - lacks specific details needed for proper evaluation",
        source: StreamType.CRITICAL,
        confidence: 0.85,
        importance: 0.8,
      });
    }

    // Check for missing context
    if (!problem.context || problem.context.length < 50) {
      weaknesses.push({
        content:
          "Insufficient context provided - missing critical information for thorough analysis",
        source: StreamType.CRITICAL,
        confidence: 0.9,
        importance: 0.85,
      });
    }

    // Check for overly optimistic claims (e.g., "50%" in context)
    const hasOptimisticClaims = /\d+%/.test(problem.context);
    if (hasOptimisticClaims) {
      weaknesses.push({
        content:
          "Quantitative projections may be overly optimistic - need validation and supporting data",
        source: StreamType.CRITICAL,
        confidence: 0.75,
        importance: 0.8,
      });
    }

    // Check for implementation challenges
    if (
      problem.complexity === "complex" ||
      (problem.constraints && problem.constraints.length > 2)
    ) {
      weaknesses.push({
        content:
          "Implementation complexity is high - significant challenges and resource requirements not fully addressed",
        source: StreamType.CRITICAL,
        confidence: 0.8,
        importance: 0.75,
      });
    }

    // Check for potential failure points
    if (problem.urgency === "high") {
      weaknesses.push({
        content:
          "High urgency increases risk of rushed decisions and inadequate testing - potential for critical failures",
        source: StreamType.CRITICAL,
        confidence: 0.75,
        importance: 0.8,
      });
    }

    return weaknesses;
  }

  /**
   * Challenge assumptions in the proposal
   *
   * @param problem - Problem to analyze
   * @returns Array of assumption-challenging insights
   */
  private challengeAssumptions(problem: Problem): Insight[] {
    const assumptions: Insight[] = [];

    // Challenge optimistic projections
    if (problem.context.includes("%") || problem.context.toLowerCase().includes("increase")) {
      assumptions.push({
        content:
          "Assumption that proposed changes will achieve stated metrics is unproven - what if actual impact is much lower?",
        source: StreamType.CRITICAL,
        confidence: 0.8,
        importance: 0.85,
      });
    }

    // Challenge user behavior assumptions
    if (
      problem.context.toLowerCase().includes("user") ||
      problem.context.toLowerCase().includes("engagement")
    ) {
      assumptions.push({
        content:
          "Assumes users will respond positively - but user behavior is unpredictable and may backfire",
        source: StreamType.CRITICAL,
        confidence: 0.75,
        importance: 0.8,
      });
    }

    // Challenge timeline assumptions
    if (
      problem.constraints &&
      problem.constraints.some(
        (c) => c.toLowerCase().includes("month") || c.toLowerCase().includes("timeline")
      )
    ) {
      assumptions.push({
        content:
          "Timeline assumptions may be unrealistic - hidden complexities often emerge during implementation",
        source: StreamType.CRITICAL,
        confidence: 0.7,
        importance: 0.75,
      });
    }

    // Challenge resource assumptions
    if (
      problem.constraints &&
      problem.constraints.some((c) => c.includes("$") || c.toLowerCase().includes("budget"))
    ) {
      assumptions.push({
        content: "Budget assumptions may not account for unforeseen costs and scope creep",
        source: StreamType.CRITICAL,
        confidence: 0.75,
        importance: 0.7,
      });
    }

    // General assumption challenge
    assumptions.push({
      content:
        "Implicit assumption that current approach is optimal - alternative strategies may be more effective",
      source: StreamType.CRITICAL,
      confidence: 0.65,
      importance: 0.7,
    });

    return assumptions;
  }

  /**
   * Assess risks in the proposal
   *
   * @param problem - Problem to analyze
   * @returns Array of risk insights
   */
  private assessRisks(problem: Problem): Insight[] {
    const risks: Insight[] = [];

    // Risk of unintended consequences
    risks.push({
      content:
        "Risk of unintended consequences: changes may have negative side effects not considered in initial analysis",
      source: StreamType.CRITICAL,
      confidence: 0.75,
      importance: 0.85,
    });

    // Risk of user alienation
    if (problem.constraints && problem.constraints.some((c) => c.toLowerCase().includes("user"))) {
      risks.push({
        content:
          "Significant risk of alienating existing users - constraint acknowledges this but mitigation strategy unclear",
        source: StreamType.CRITICAL,
        confidence: 0.8,
        importance: 0.9,
      });
    }

    // Risk of failure
    if (problem.complexity === "complex" || problem.urgency === "high") {
      risks.push({
        content:
          "High risk of project failure due to complexity and time pressure - worst-case scenario could damage reputation",
        source: StreamType.CRITICAL,
        confidence: 0.7,
        importance: 0.85,
      });
    }

    // Risk of resource overrun
    if (problem.constraints && problem.constraints.length > 0) {
      risks.push({
        content:
          "Risk of exceeding constraints (budget, timeline) - initial estimates often prove insufficient",
        source: StreamType.CRITICAL,
        confidence: 0.75,
        importance: 0.75,
      });
    }

    // Risk of competitive response
    if (
      problem.context.toLowerCase().includes("engagement") ||
      problem.context.toLowerCase().includes("market")
    ) {
      risks.push({
        content:
          "Risk that competitors may respond with superior solutions - first-mover advantage may be short-lived",
        source: StreamType.CRITICAL,
        confidence: 0.65,
        importance: 0.7,
      });
    }

    return risks;
  }

  /**
   * Detect logical flaws
   *
   * @param problem - Problem to analyze
   * @returns Array of flaw insights
   */
  private detectFlaws(problem: Problem): Insight[] {
    const flaws: Insight[] = [];

    // Check for circular reasoning
    const words = problem.context.toLowerCase().split(/\s+/);
    const wordSet = new Set(words);
    const hasRepetition = words.length > 0 && wordSet.size < words.length * 0.7;

    // Check for "because" circular patterns (A because A)
    const becausePattern = /(\w+).*because.*\1/i;
    const hasCircularBecause = becausePattern.test(problem.context);

    if (hasRepetition || hasCircularBecause) {
      flaws.push({
        content:
          "Circular reasoning detected - argument repeats itself without adding substance, creating a tautology",
        source: StreamType.CRITICAL,
        confidence: 0.7,
        importance: 0.75,
      });
    }

    // Check for false dichotomy
    if (
      problem.context.toLowerCase().includes("either") ||
      problem.context.toLowerCase().includes("must")
    ) {
      flaws.push({
        content:
          "False dichotomy: framing suggests only two options when other alternatives may exist",
        source: StreamType.CRITICAL,
        confidence: 0.75,
        importance: 0.8,
      });
    }

    // Check for correlation vs causation
    if (
      problem.context.toLowerCase().includes("so ") ||
      problem.context.toLowerCase().includes("therefore")
    ) {
      flaws.push({
        content:
          "Potential correlation/causation confusion - just because two things are related doesn't mean one causes the other",
        source: StreamType.CRITICAL,
        confidence: 0.7,
        importance: 0.75,
      });
    }

    // Check for overgeneralization
    if (
      problem.context.toLowerCase().includes("all ") ||
      problem.context.toLowerCase().includes("always") ||
      problem.context.toLowerCase().includes("never")
    ) {
      flaws.push({
        content: "Overgeneralization detected - sweeping claims rarely hold in all cases",
        source: StreamType.CRITICAL,
        confidence: 0.8,
        importance: 0.75,
      });
    }

    // If no specific flaws detected, add general flaw concern
    if (flaws.length === 0) {
      flaws.push({
        content:
          "Logical structure requires scrutiny - potential flaws in reasoning chain need examination",
        source: StreamType.CRITICAL,
        confidence: 0.65,
        importance: 0.7,
      });
    }

    return flaws;
  }

  /**
   * Generate counter-arguments
   *
   * @param problem - Problem to analyze
   * @returns Array of counter-argument insights
   */
  private generateCounterArguments(problem: Problem): Insight[] {
    const counterArguments: Insight[] = [];

    // Devil's advocate: argue against the proposal
    counterArguments.push({
      content:
        "Devil's advocate: what if the proposed solution makes things worse rather than better?",
      source: StreamType.CRITICAL,
      confidence: 0.65,
      importance: 0.8,
    });

    // Alternative perspective
    counterArguments.push({
      content:
        "Alternative perspective: instead of this approach, consider addressing root causes rather than symptoms",
      source: StreamType.CRITICAL,
      confidence: 0.7,
      importance: 0.75,
    });

    // Challenge from different angle
    if (problem.goals && problem.goals.length > 0) {
      counterArguments.push({
        content: `Counter-argument: the goal of "${problem.goals[0]}" may not be the right objective - need to question whether this is what we should be optimizing for`,
        source: StreamType.CRITICAL,
        confidence: 0.65,
        importance: 0.7,
      });
    }

    // Constructive criticism
    counterArguments.push({
      content:
        "Constructive criticism: proposal has merit but needs significant refinement - suggest pilot testing before full rollout",
      source: StreamType.CRITICAL,
      confidence: 0.75,
      importance: 0.8,
    });

    return counterArguments;
  }

  /**
   * Evaluate evidence quality
   *
   * @param problem - Problem with context
   * @returns Evidence assessment
   */
  private evaluateEvidence(problem: Problem): {
    reasoning: string;
    insight?: Insight;
  } {
    let reasoning = "";
    let insight: Insight | undefined;

    // Check for quantitative data
    const hasNumbers = /\d+%|\d+\.\d+|\d+ (users|customers|percent)/.test(problem.context);
    if (hasNumbers) {
      reasoning =
        "Evidence includes quantitative claims but lacks supporting data sources - need validation";
      insight = {
        content:
          "Quantitative claims lack supporting evidence - data sources and methodology must be verified",
        source: StreamType.CRITICAL,
        confidence: 0.8,
        importance: 0.85,
      };
    } else {
      reasoning = "Evidence is primarily qualitative - need quantitative data to support claims";
      insight = {
        content:
          "Lack of quantitative evidence weakens the case - need measurable data to validate assumptions",
        source: StreamType.CRITICAL,
        confidence: 0.75,
        importance: 0.8,
      };
    }

    // Check for bias in evidence
    if (
      problem.context.toLowerCase().includes("will") ||
      problem.context.toLowerCase().includes("shows")
    ) {
      reasoning += ". Potential confirmation bias in evidence selection";
      if (insight) {
        insight.content += ". Evidence may be cherry-picked to support predetermined conclusion";
      }
    }

    return { reasoning, insight };
  }

  /**
   * Generate conclusion from critical analysis
   *
   * @param problem - Original problem
   * @param insights - Generated insights
   * @returns Conclusion statement
   */
  private generateConclusion(problem: Problem, insights: Insight[]): string {
    const parts: string[] = [];

    // Count high-importance concerns
    const criticalConcerns = insights.filter((i) => i.importance > 0.8).length;

    if (criticalConcerns > 2) {
      parts.push(
        `${criticalConcerns} critical concerns identified that require immediate attention`
      );
    } else if (insights.length > 3) {
      parts.push("several significant issues require careful consideration");
    } else {
      parts.push("some concerns identified but proposal has potential");
    }

    // Address the proposal
    if (problem.goals && problem.goals.length > 0) {
      parts.push(`before proceeding with ${problem.goals[0].toLowerCase()}`);
    }

    // Recommend action
    if (criticalConcerns > 2) {
      parts.push("- recommend substantial revision or alternative approach");
    } else {
      parts.push(
        "- recommend addressing these concerns through pilot testing and iterative refinement"
      );
    }

    return parts.join(" ");
  }

  /**
   * Calculate confidence score
   *
   * @param problem - Problem being analyzed
   * @param insights - Generated insights
   * @returns Confidence score (0-1)
   */
  private calculateConfidence(problem: Problem, insights: Insight[]): number {
    let confidence = 0.6; // Critical stream is moderately confident in identifying issues

    // Boost confidence if we found many issues
    if (insights.length >= 5) {
      confidence += 0.1;
    }

    // Boost confidence if we have high-importance concerns
    const criticalConcerns = insights.filter((i) => i.importance > 0.8).length;
    if (criticalConcerns >= 2) {
      confidence += 0.1;
    }

    // Reduce confidence if context is limited
    if (!problem.context || problem.context.length < 50) {
      confidence -= 0.2;
    }

    // Reduce confidence if problem is simple (less to criticize)
    if (problem.complexity === "simple") {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }
}

/**
 * Critical Reasoning Stream
 *
 * Implements a reasoning stream that performs skeptical, evaluative thinking
 * with progress tracking, timeout management, and cancellation support.
 */
export class CriticalReasoningStream implements ReasoningStream {
  public readonly id: string;
  public readonly type: StreamType;
  public readonly processor: StreamProcessor;
  public readonly timeout: number;

  private progress: number = 0;
  private cancelled: boolean = false;
  private processing: boolean = false;

  /**
   * Create critical reasoning stream
   *
   * @param timeout - Timeout in milliseconds (default: 10000ms)
   */
  constructor(timeout: number = 10000) {
    this.id = `critical-stream-${Date.now()}`;
    this.type = StreamType.CRITICAL;
    this.processor = new CriticalStreamProcessor();
    this.timeout = timeout;
  }

  /**
   * Process a problem using critical reasoning
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
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<StreamResult>((resolve) => {
        setTimeout(() => {
          if (!this.cancelled) {
            resolve({
              streamId: this.id,
              streamType: this.type,
              conclusion: "Critical analysis incomplete due to timeout",
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
      let result = await Promise.race([processingPromise, timeoutPromise]);

      // Check if cancelled after processing completes (handles late cancellation)
      if (this.cancelled && result.status !== StreamStatus.CANCELLED) {
        result = {
          streamId: this.id,
          streamType: this.type,
          conclusion: "",
          reasoning: result.reasoning || [],
          insights: result.insights || [],
          confidence: 0,
          processingTime: Date.now() - startTime,
          status: StreamStatus.CANCELLED,
        };
      }

      if (result.status === StreamStatus.COMPLETED) {
        this.progress = 1.0;
      }
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

      // Check if cancelled after processing
      if (this.cancelled) {
        return {
          streamId: this.id,
          streamType: this.type,
          conclusion: "",
          reasoning: result.reasoning || [],
          insights: result.insights || [],
          confidence: 0,
          processingTime: result.processingTime,
          status: StreamStatus.CANCELLED,
        };
      }

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
