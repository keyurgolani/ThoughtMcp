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
 */

import type { ReasoningStream, StreamProcessor } from "../stream";
import { StreamStatus, StreamType, type Insight, type Problem, type StreamResult } from "../types";

/**
 * Creative stream processor
 *
 * Implements the core creative reasoning logic with brainstorming,
 * alternative generation, and creative techniques.
 */
export class CreativeStreamProcessor implements StreamProcessor {
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
      // Step 1: Initial brainstorming
      reasoning.push(
        `Brainstorming innovative solutions for: ${problem.description.substring(0, 100)}${problem.description.length > 100 ? "..." : ""}`
      );

      // Step 2: Generate diverse ideas using creative techniques
      const ideas = this.generateCreativeIdeas(problem);
      reasoning.push(`Generated ${ideas.length} diverse ideas using multiple creative techniques`);

      // Step 3: Apply creative techniques
      const analogyIdeas = this.applyAnalogy(problem);
      if (analogyIdeas.length > 0) {
        reasoning.push(`Using analogy: ${analogyIdeas[0].content.substring(0, 80)}...`);
        insights.push(...analogyIdeas);
      }

      const reframingIdeas = this.applyReframing(problem);
      if (reframingIdeas.length > 0) {
        reasoning.push(`Reframing perspective: ${reframingIdeas[0].content.substring(0, 80)}...`);
        insights.push(...reframingIdeas);
      }

      const lateralIdeas = this.applyLateralThinking(problem);
      if (lateralIdeas.length > 0) {
        reasoning.push(`What if we ${lateralIdeas[0].content.toLowerCase().substring(0, 60)}...?`);
        insights.push(...lateralIdeas);
      }

      // Step 4: Combine and build on ideas
      const combinedIdeas = this.combineIdeas(ideas, problem);
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
        const constraintAwareIdeas = this.adaptToConstraints(scoredIdeas, problem);
        insights.push(...constraintAwareIdeas);
      }

      // Step 7: Generate conclusion
      const conclusion = this.generateConclusion(problem, scoredIdeas);
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
   * Generate creative ideas through brainstorming
   *
   * @param problem - Problem to brainstorm
   * @returns Array of creative insights
   */
  private generateCreativeIdeas(problem: Problem): Insight[] {
    const ideas: Insight[] = [];

    // Generate multiple diverse ideas
    const ideaTemplates = [
      `Create a novel approach to ${problem.description.toLowerCase()}`,
      `Imagine an innovative solution that ${problem.goals?.[0] || "solves the problem"}`,
      `Design a unique method to address ${problem.description.toLowerCase()}`,
      `Develop an unconventional strategy for ${problem.description.toLowerCase()}`,
      `Invent a creative way to ${problem.goals?.[0] || "achieve the goal"}`,
    ];

    for (const template of ideaTemplates) {
      ideas.push({
        content: template,
        source: StreamType.CREATIVE,
        confidence: 0.7,
        importance: 0.6 + Math.random() * 0.3, // Vary novelty scores
      });
    }

    return ideas;
  }

  /**
   * Apply analogy technique
   *
   * @param _problem - Problem to analyze (unused in current implementation)
   * @returns Array of analogy-based insights
   */
  private applyAnalogy(_problem: Problem): Insight[] {
    const insights: Insight[] = [];

    // Generate analogies from different domains
    const analogies = [
      "This is like how nature solves similar problems through evolution",
      "Similar to how successful companies pivot when facing challenges",
      "Analogous to how ecosystems maintain balance through diversity",
    ];

    const selectedAnalogy = analogies[Math.floor(Math.random() * analogies.length)];

    insights.push({
      content: `${selectedAnalogy} - we could apply similar principles here`,
      source: StreamType.CREATIVE,
      confidence: 0.65,
      importance: 0.75,
    });

    return insights;
  }

  /**
   * Apply reframing technique
   *
   * @param _problem - Problem to reframe (unused in current implementation)
   * @returns Array of reframed insights
   */
  private applyReframing(_problem: Problem): Insight[] {
    const insights: Insight[] = [];

    // Reframe from different perspectives
    const perspectives = [
      "Looking at this from a different angle: what if we viewed this as an opportunity rather than a problem?",
      "Reframing the perspective: instead of fixing what's broken, what if we reimagined the entire approach?",
      "From another viewpoint: what would a complete beginner suggest without preconceptions?",
    ];

    const selectedPerspective = perspectives[Math.floor(Math.random() * perspectives.length)];

    insights.push({
      content: selectedPerspective,
      source: StreamType.CREATIVE,
      confidence: 0.7,
      importance: 0.8,
    });

    return insights;
  }

  /**
   * Apply lateral thinking technique
   *
   * @param _problem - Problem to analyze (unused in current implementation)
   * @returns Array of lateral thinking insights
   */
  private applyLateralThinking(_problem: Problem): Insight[] {
    const insights: Insight[] = [];

    // Generate "what if" scenarios
    const lateralQuestions = [
      "What if we did the exact opposite of the conventional approach?",
      "Suppose we had unlimited resources - what would we try?",
      "What if this problem didn't exist - how would that change things?",
      "Imagine we could start from scratch - what would we do differently?",
    ];

    const selectedQuestion = lateralQuestions[Math.floor(Math.random() * lateralQuestions.length)];

    insights.push({
      content: selectedQuestion,
      source: StreamType.CREATIVE,
      confidence: 0.6,
      importance: 0.85,
    });

    return insights;
  }

  /**
   * Combine ideas in novel ways
   *
   * @param ideas - Existing ideas
   * @param _problem - Original problem (unused in current implementation)
   * @returns Array of combined insights
   */
  private combineIdeas(ideas: Insight[], _problem: Problem): Insight[] {
    const combined: Insight[] = [];

    if (ideas.length >= 2) {
      // Combine first two ideas
      combined.push({
        content: `Combining approaches: merge ${ideas[0].content.substring(0, 30)}... with ${ideas[1].content.substring(0, 30)}... for a hybrid solution`,
        source: StreamType.CREATIVE,
        confidence: 0.65,
        importance: 0.7,
      });
    }

    // Add iterative improvement
    if (ideas.length > 0) {
      combined.push({
        content: `Building on the initial concept, we could further expand by integrating additional creative elements`,
        source: StreamType.CREATIVE,
        confidence: 0.7,
        importance: 0.65,
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
   * Adapt ideas to constraints while maintaining creativity
   *
   * @param _ideas - Existing ideas (unused in current implementation)
   * @param problem - Problem with constraints
   * @returns Constraint-aware insights
   */
  private adaptToConstraints(_ideas: Insight[], problem: Problem): Insight[] {
    const adapted: Insight[] = [];

    if (problem.constraints && problem.constraints.length > 0) {
      adapted.push({
        content: `Creative workaround: work within existing ${problem.constraints[0]} by finding innovative applications`,
        source: StreamType.CREATIVE,
        confidence: 0.7,
        importance: 0.75,
      });

      // Show optimistic, possibility-focused thinking
      adapted.push({
        content: `Despite constraints, there's potential to achieve goals through creative resource allocation`,
        source: StreamType.CREATIVE,
        confidence: 0.65,
        importance: 0.7,
      });
    }

    return adapted;
  }

  /**
   * Generate conclusion from creative analysis
   *
   * @param problem - Original problem
   * @param ideas - Generated ideas
   * @returns Conclusion statement
   */
  private generateConclusion(problem: Problem, ideas: Insight[]): string {
    const parts: string[] = [];

    // Count highly novel ideas
    const highNoveltyCount = ideas.filter((i) => i.importance > 0.7).length;

    if (highNoveltyCount > 0) {
      parts.push(
        `${highNoveltyCount} highly innovative solution${highNoveltyCount > 1 ? "s" : ""} identified`
      );
    } else {
      parts.push("several creative approaches generated");
    }

    // Address goals
    if (problem.goals && problem.goals.length > 0) {
      parts.push(`that could ${problem.goals[0].toLowerCase()}`);
    }

    // Note feasibility
    if (problem.constraints && problem.constraints.length > 0) {
      parts.push("while working within practical constraints");
    } else {
      parts.push("with strong potential for implementation");
    }

    return parts.join(" ");
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
