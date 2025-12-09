/**
 * Creative Reasoning Stream
 *
 * Implements innovative, divergent thinking with:
 * - Brainstorming and ideation
 * - Alternative solution generation
 * - Creative techniques (analogy, metaphor, reframing, lateral thinking)
 * - Novelty scoring (how unique/innovative)
 * - Feasibility assessment (how practical)
 * - Progress tracking and timeout management
 * - Problem-specific ideas (Requirements 4.2, 15.3)
 */

import { KeyTermExtractor, type KeyTerms } from "../key-term-extractor";
import type { ReasoningStream, StreamProcessor } from "../stream";
import { StreamStatus, StreamType, type Insight, type Problem, type StreamResult } from "../types";

/**
 * Creative stream processor
 *
 * Implements the core creative reasoning logic with brainstorming,
 * alternative generation, and creative techniques.
 * Generates problem-specific ideas using key term extraction.
 */
export class CreativeStreamProcessor implements StreamProcessor {
  private readonly keyTermExtractor: KeyTermExtractor;

  constructor() {
    this.keyTermExtractor = new KeyTermExtractor();
  }

  /**
   * Process a problem using creative reasoning
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
      // Extract key terms for problem-specific ideas (Req 4.2, 15.3)
      const keyTerms = this.keyTermExtractor.extract(problem.description, problem.context);

      // Step 1: Initial brainstorming
      reasoning.push(
        `Brainstorming innovative solutions for: ${problem.description.substring(0, 100)}${problem.description.length > 100 ? "..." : ""}`
      );

      // Step 2: Generate diverse ideas using creative techniques
      const ideas = this.generateCreativeIdeas(problem, keyTerms);
      reasoning.push(`Generated ${ideas.length} diverse ideas using multiple creative techniques`);

      // Step 3: Apply creative techniques
      const analogyIdeas = this.applyAnalogy(problem, keyTerms);
      if (analogyIdeas.length > 0) {
        reasoning.push(`Using analogy: ${analogyIdeas[0].content.substring(0, 80)}...`);
        insights.push(...analogyIdeas);
      }

      const reframingIdeas = this.applyReframing(problem, keyTerms);
      if (reframingIdeas.length > 0) {
        reasoning.push(`Reframing perspective: ${reframingIdeas[0].content.substring(0, 80)}...`);
        insights.push(...reframingIdeas);
      }

      const lateralIdeas = this.applyLateralThinking(problem, keyTerms);
      if (lateralIdeas.length > 0) {
        reasoning.push(`What if we ${lateralIdeas[0].content.toLowerCase().substring(0, 60)}...?`);
        insights.push(...lateralIdeas);
      }

      // Step 4: Combine and build on ideas
      const combinedIdeas = this.combineIdeas(ideas, problem, keyTerms);
      if (combinedIdeas.length > 0) {
        reasoning.push(
          `Building on previous ideas: combining ${combinedIdeas.length} concepts together`
        );
        insights.push(...combinedIdeas);
      }

      // Step 5: Assess novelty and feasibility
      const scoredIdeas = this.scoreIdeas([...ideas, ...insights], problem);
      reasoning.push(
        `Assessed novelty and feasibility: ${scoredIdeas.filter((i) => i.importance > 0.7).length} highly novel ideas identified`
      );

      // Step 6: Consider constraints while maintaining creativity
      if (problem.constraints && problem.constraints.length > 0) {
        reasoning.push(
          `Considering constraints: ${problem.constraints.join(", ")} - but looking for creative workarounds`
        );
        const constraintAwareIdeas = this.adaptToConstraints(scoredIdeas, problem, keyTerms);
        insights.push(...constraintAwareIdeas);
      }

      // Step 7: Generate conclusion
      const conclusion = this.generateConclusion(problem, scoredIdeas, keyTerms);
      reasoning.push(`Therefore, ${conclusion}`);

      // Calculate confidence based on idea quality and diversity
      const confidence = this.calculateConfidence(problem, scoredIdeas);

      const processingTime = Math.max(1, Date.now() - startTime);

      // Return top scored ideas as final insights
      const finalInsights = scoredIdeas
        .sort((a, b) => b.importance - a.importance)
        .slice(0, Math.min(10, scoredIdeas.length));

      return {
        streamId: `creative-${problem.id}`,
        streamType: StreamType.CREATIVE,
        conclusion,
        reasoning,
        insights: finalInsights,
        confidence,
        processingTime,
        status: StreamStatus.COMPLETED,
      };
    } catch (error) {
      const processingTime = Math.max(1, Date.now() - startTime);
      return {
        streamId: `creative-${problem.id}`,
        streamType: StreamType.CREATIVE,
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
    return StreamType.CREATIVE;
  }

  /**
   * Generate creative ideas through brainstorming with term reference tracking
   *
   * @param problem - Problem to brainstorm
   * @param keyTerms - Extracted key terms for problem-specific ideas
   * @returns Array of creative insights with referenced terms tracked
   */
  private generateCreativeIdeas(problem: Problem, keyTerms: KeyTerms): Insight[] {
    const ideas: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "the challenge";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);
    const actionVerb = keyTerms.actionVerbs[0] || "transform";

    // Generate problem-specific ideas using extracted terms
    const ideaTemplates = [
      `Create a novel ${domainTerms[0] || "approach"} for ${primaryTerm} that leverages ${domainTerms[1] || "existing strengths"}`,
      `Imagine ${primaryTerm} reimagined with ${problem.goals?.[0] || "enhanced capabilities"}`,
      `Design a unique method to ${actionVerb} ${primaryTerm} using unconventional techniques`,
      `Develop an innovative ${domainTerms[0] || "strategy"} that addresses ${primaryTerm} from a fresh angle`,
      `Invent a creative way to ${problem.goals?.[0] || `improve ${primaryTerm}`} by combining disparate concepts`,
    ];

    for (const template of ideaTemplates) {
      ideas.push({
        content: template,
        source: StreamType.CREATIVE,
        confidence: 0.7,
        importance: 0.6 + Math.random() * 0.3, // Vary novelty scores
        referencedTerms: this.keyTermExtractor.findReferencedTerms(template, keyTerms),
      });
    }

    return ideas;
  }

  /**
   * Apply analogy technique with term reference tracking
   *
   * @param problem - Problem to analyze
   * @param keyTerms - Extracted key terms for problem-specific analogies
   * @returns Array of analogy-based insights with referenced terms tracked
   */
  private applyAnalogy(_problem: Problem, keyTerms: KeyTerms): Insight[] {
    const insights: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "this challenge";
    const domainTerm = keyTerms.domainTerms[0] || "";

    // Generate problem-specific analogies
    let analogy: string;
    if (
      domainTerm === "performance" ||
      domainTerm === "optimization" ||
      domainTerm === "scalability"
    ) {
      analogy = `${primaryTerm} is like a highway system - we can apply traffic flow optimization principles to improve throughput`;
    } else if (domainTerm === "user" || domainTerm === "customer" || domainTerm === "engagement") {
      analogy = `${primaryTerm} is like a conversation - we can apply principles of active listening and responsiveness`;
    } else if (domainTerm === "security" || domainTerm === "authentication") {
      analogy = `${primaryTerm} is like a castle defense - we can apply layered protection strategies`;
    } else if (domainTerm === "data" || domainTerm === "analytics") {
      analogy = `${primaryTerm} is like archaeology - we can apply systematic excavation techniques to uncover insights`;
    } else {
      analogy = `${primaryTerm} is like how nature solves similar problems through evolution - we could apply adaptive principles`;
    }

    insights.push({
      content: analogy,
      source: StreamType.CREATIVE,
      confidence: 0.65,
      importance: 0.75,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(analogy, keyTerms),
    });

    return insights;
  }

  /**
   * Apply reframing technique with term reference tracking
   *
   * @param problem - Problem to reframe
   * @param keyTerms - Extracted key terms for problem-specific reframing
   * @returns Array of reframed insights with referenced terms tracked
   */
  private applyReframing(_problem: Problem, keyTerms: KeyTerms): Insight[] {
    const insights: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "this situation";
    const actionVerb = keyTerms.actionVerbs[0] || "improve";

    // Generate problem-specific reframing
    const perspectives = [
      `Reframing ${primaryTerm}: what if we viewed this as an opportunity to ${actionVerb} rather than a problem to fix?`,
      `Instead of trying to ${actionVerb} ${primaryTerm}, what if we reimagined the entire approach from scratch?`,
      `From a user's perspective: what would make ${primaryTerm} delightful rather than just functional?`,
    ];

    const selectedPerspective = perspectives[Math.floor(Math.random() * perspectives.length)];

    insights.push({
      content: selectedPerspective,
      source: StreamType.CREATIVE,
      confidence: 0.7,
      importance: 0.8,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(selectedPerspective, keyTerms),
    });

    return insights;
  }

  /**
   * Apply lateral thinking technique with term reference tracking
   *
   * @param problem - Problem to analyze
   * @param keyTerms - Extracted key terms for problem-specific lateral thinking
   * @returns Array of lateral thinking insights with referenced terms tracked
   */
  private applyLateralThinking(_problem: Problem, keyTerms: KeyTerms): Insight[] {
    const insights: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "this";
    const domainTerm = keyTerms.domainTerms[0] || "";

    // Generate problem-specific "what if" scenarios
    const lateralQuestions = [
      `What if we did the exact opposite with ${primaryTerm} - instead of adding, what if we removed?`,
      `Suppose we had unlimited ${domainTerm || "resources"} for ${primaryTerm} - what would we try first?`,
      `What if ${primaryTerm} didn't need to exist at all - what would replace it?`,
      `Imagine we could redesign ${primaryTerm} from scratch with today's technology - what would be different?`,
    ];

    const selectedQuestion = lateralQuestions[Math.floor(Math.random() * lateralQuestions.length)];

    insights.push({
      content: selectedQuestion,
      source: StreamType.CREATIVE,
      confidence: 0.6,
      importance: 0.85,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(selectedQuestion, keyTerms),
    });

    return insights;
  }

  /**
   * Combine ideas in novel ways with term reference tracking
   *
   * @param ideas - Existing ideas
   * @param problem - Original problem
   * @param keyTerms - Extracted key terms for problem-specific combinations
   * @returns Array of combined insights with referenced terms tracked
   */
  private combineIdeas(ideas: Insight[], _problem: Problem, keyTerms: KeyTerms): Insight[] {
    const combined: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "the solution";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);

    if (ideas.length >= 2) {
      // Combine ideas with problem-specific context
      const hybridContent = `Hybrid approach for ${primaryTerm}: combine ${ideas[0].content.substring(0, 40)}... with ${ideas[1].content.substring(0, 40)}...`;
      combined.push({
        content: hybridContent,
        source: StreamType.CREATIVE,
        confidence: 0.65,
        importance: 0.7,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(hybridContent, keyTerms),
      });
    }

    // Add iterative improvement with specific terms
    if (ideas.length > 0 && domainTerms.length > 0) {
      const iterativeContent = `Building on ${primaryTerm} concept: integrate ${domainTerms.join(" and ")} elements for enhanced effectiveness`;
      combined.push({
        content: iterativeContent,
        source: StreamType.CREATIVE,
        confidence: 0.7,
        importance: 0.65,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(iterativeContent, keyTerms),
      });
    } else if (ideas.length > 0) {
      const iterativeContent = `Building on ${primaryTerm} concept: iterate and expand with complementary approaches`;
      combined.push({
        content: iterativeContent,
        source: StreamType.CREATIVE,
        confidence: 0.7,
        importance: 0.65,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(iterativeContent, keyTerms),
      });
    }

    return combined;
  }

  /**
   * Score ideas for novelty and feasibility
   *
   * @param ideas - Ideas to score
   * @param problem - Original problem
   * @returns Scored insights
   */
  private scoreIdeas(ideas: Insight[], problem: Problem): Insight[] {
    return ideas.map((idea) => {
      // Novelty scoring based on content uniqueness
      let novelty = idea.importance || 0.6;

      // Boost novelty for certain keywords
      const content = idea.content.toLowerCase();
      if (
        content.includes("novel") ||
        content.includes("innovative") ||
        content.includes("unique") ||
        content.includes("unconventional")
      ) {
        novelty += 0.1;
      }

      if (content.includes("what if") || content.includes("imagine")) {
        novelty += 0.15;
      }

      // Feasibility consideration
      let feasibility = 0.7;
      if (problem.constraints && problem.constraints.length > 0) {
        // Check if idea acknowledges constraints
        const acknowledgesConstraints = problem.constraints.some((constraint) =>
          content.includes(constraint.toLowerCase())
        );
        if (acknowledgesConstraints) {
          feasibility += 0.2;
        } else {
          feasibility -= 0.1;
        }
      }

      // Balance novelty with feasibility
      const importance = Math.min(1.0, novelty * 0.7 + feasibility * 0.3);

      return {
        ...idea,
        importance: Math.max(0.1, Math.min(1.0, importance)),
      };
    });
  }

  /**
   * Adapt ideas to constraints while maintaining creativity with term reference tracking
   *
   * @param _ideas - Existing ideas (unused in current implementation)
   * @param problem - Problem with constraints
   * @param keyTerms - Extracted key terms for problem-specific adaptations
   * @returns Constraint-aware insights with referenced terms tracked
   */
  private adaptToConstraints(_ideas: Insight[], problem: Problem, keyTerms: KeyTerms): Insight[] {
    const adapted: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "the solution";

    if (problem.constraints && problem.constraints.length > 0) {
      const constraint = problem.constraints[0];
      const workaroundContent = `Creative workaround for ${primaryTerm}: leverage ${constraint} as a design constraint that drives innovation`;
      adapted.push({
        content: workaroundContent,
        source: StreamType.CREATIVE,
        confidence: 0.7,
        importance: 0.75,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(workaroundContent, keyTerms),
      });

      // Show optimistic, possibility-focused thinking with specific terms
      const optimisticContent = `Despite ${constraint}, ${primaryTerm} can achieve goals through creative ${keyTerms.domainTerms[0] || "resource"} allocation`;
      adapted.push({
        content: optimisticContent,
        source: StreamType.CREATIVE,
        confidence: 0.65,
        importance: 0.7,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(optimisticContent, keyTerms),
      });
    }

    return adapted;
  }

  /**
   * Generate conclusion from creative analysis with validated term references
   *
   * @param problem - Original problem
   * @param ideas - Generated ideas
   * @param keyTerms - Extracted key terms for problem-specific conclusion
   * @returns Conclusion statement with guaranteed key term reference
   */
  private generateConclusion(problem: Problem, ideas: Insight[], keyTerms: KeyTerms): string {
    const parts: string[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "the challenge";

    // Count highly novel ideas
    const highNoveltyCount = ideas.filter((i) => i.importance > 0.7).length;

    if (highNoveltyCount > 0) {
      parts.push(
        `${highNoveltyCount} highly innovative solution${highNoveltyCount > 1 ? "s" : ""} for ${primaryTerm} identified`
      );
    } else {
      parts.push(`several creative approaches for ${primaryTerm} generated`);
    }

    // Address goals with specific terms
    if (problem.goals && problem.goals.length > 0) {
      parts.push(`that could ${problem.goals[0].toLowerCase()}`);
    } else if (keyTerms.actionVerbs.length > 0) {
      parts.push(`that could ${keyTerms.actionVerbs[0]} ${primaryTerm}`);
    }

    // Note feasibility with specific constraints
    if (problem.constraints && problem.constraints.length > 0) {
      parts.push(`while working within ${problem.constraints[0]}`);
    } else {
      parts.push("with strong potential for implementation");
    }

    // Validate and ensure conclusion contains at least one key term
    const conclusion = parts.join(" ");
    return this.keyTermExtractor.ensureTermReference(conclusion, keyTerms);
  }

  /**
   * Calculate confidence score
   *
   * @param problem - Problem being analyzed
   * @param ideas - Generated ideas
   * @returns Confidence score (0-1)
   */
  private calculateConfidence(problem: Problem, ideas: Insight[]): number {
    let confidence = 0.7; // Creative stream is generally confident in generating ideas

    // Boost confidence if we have many ideas
    if (ideas.length >= 5) {
      confidence += 0.1;
    }

    // Boost confidence if we have high novelty ideas
    const highNoveltyCount = ideas.filter((i) => i.importance > 0.7).length;
    if (highNoveltyCount >= 2) {
      confidence += 0.1;
    }

    // Reduce confidence if problem is very constrained
    if (problem.constraints && problem.constraints.length > 3) {
      confidence -= 0.15;
    }

    // Reduce confidence if context is limited or missing
    if (!problem.context || problem.context.trim().length === 0) {
      confidence -= 0.25; // Larger penalty for missing/empty context
    } else if (problem.context.length < 20) {
      confidence -= 0.2; // Penalty for very limited context
    } else if (problem.context.length < 50) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }
}

/**
 * Creative Reasoning Stream
 *
 * Implements a reasoning stream that performs innovative, divergent thinking
 * with progress tracking, timeout management, and cancellation support.
 */
export class CreativeReasoningStream implements ReasoningStream {
  public readonly id: string;
  public readonly type: StreamType;
  public readonly processor: StreamProcessor;
  public readonly timeout: number;

  private progress: number = 0;
  private cancelled: boolean = false;
  private processing: boolean = false;

  /**
   * Create creative reasoning stream
   *
   * @param timeout - Timeout in milliseconds (default: 10000ms)
   */
  constructor(timeout: number = 10000) {
    this.id = `creative-stream-${Date.now()}`;
    this.type = StreamType.CREATIVE;
    this.processor = new CreativeStreamProcessor();
    this.timeout = timeout;
  }

  /**
   * Process a problem using creative reasoning
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
              conclusion: "Creative ideation incomplete due to timeout",
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
