/**
 * Synthetic Reasoning Stream
 *
 * Implements integrative, holistic thinking with:
 * - Pattern recognition across disparate information
 * - Connection identification between concepts
 * - Theme extraction from complex data
 * - Integrative thinking and synthesis
 * - Holistic perspective generation (big picture view)
 * - Progress tracking and timeout management
 * - Problem-specific patterns (Requirements 4.4, 15.3)
 */

import { KeyTermExtractor, type KeyTerms } from "../key-term-extractor";
import type { ReasoningStream, StreamProcessor } from "../stream";
import { StreamStatus, StreamType, type Insight, type Problem, type StreamResult } from "../types";

/**
 * Synthetic stream processor
 *
 * Implements the core synthetic reasoning logic with pattern recognition,
 * connection discovery, theme extraction, and holistic perspective generation.
 * Generates problem-specific patterns using key term extraction.
 */
export class SyntheticStreamProcessor implements StreamProcessor {
  private readonly keyTermExtractor: KeyTermExtractor;

  constructor() {
    this.keyTermExtractor = new KeyTermExtractor();
  }

  /**
   * Process a problem using synthetic reasoning
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
      // Extract key terms for problem-specific patterns (Req 4.4, 15.3)
      const keyTerms = this.keyTermExtractor.extract(problem.description, problem.context);
      const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "the system";

      // Step 1: Initial pattern recognition
      reasoning.push(
        `Analyzing patterns and connections in: ${problem.description.substring(0, 100)}${problem.description.length > 100 ? "..." : ""}`
      );

      // Step 2: Identify patterns across the problem space
      const patterns = this.identifyPatterns(problem, keyTerms);
      if (patterns.length > 0) {
        reasoning.push(`Identified ${patterns.length} recurring patterns in ${primaryTerm}`);
        // Add specific pattern details to reasoning
        for (const pattern of patterns) {
          if (
            pattern.content.toLowerCase().includes("cause") ||
            pattern.content.toLowerCase().includes("effect")
          ) {
            reasoning.push(`Pattern analysis: ${pattern.content.substring(0, 100)}`);
            break;
          }
        }
        insights.push(...patterns);
      }

      // Step 3: Map connections between concepts
      const connections = this.mapConnections(problem, keyTerms);
      if (connections.length > 0) {
        reasoning.push(`Mapped ${connections.length} key connections in ${primaryTerm}`);
        // Add specific connection details to reasoning
        for (const connection of connections) {
          const content = connection.content.toLowerCase();
          if (
            content.includes("affects") ||
            content.includes("relates") ||
            content.includes("influences")
          ) {
            reasoning.push(`Connection insight: ${connection.content.substring(0, 100)}`);
            break;
          }
        }
        for (const connection of connections) {
          const content = connection.content.toLowerCase();
          if (
            content.includes("hidden") ||
            content.includes("subtle") ||
            content.includes("indirect")
          ) {
            reasoning.push(`Hidden relationship: ${connection.content.substring(0, 100)}`);
            break;
          }
        }
        for (const connection of connections) {
          const content = connection.content.toLowerCase();
          if (
            content.includes("interdepend") ||
            content.includes("depend") ||
            content.includes("mutual")
          ) {
            reasoning.push(`Interdependency: ${connection.content.substring(0, 100)}`);
            break;
          }
        }
        insights.push(...connections);
      }

      // Step 4: Extract overarching themes
      const themes = this.extractThemes(problem, keyTerms);
      if (themes.length > 0) {
        reasoning.push(`Extracted ${themes.length} unifying themes for ${primaryTerm}`);
        // Add specific theme details to reasoning
        for (const theme of themes) {
          const content = theme.content.toLowerCase();
          if (
            content.includes("meta") ||
            content.includes("higher level") ||
            content.includes("broader")
          ) {
            reasoning.push(`Meta-level theme: ${theme.content.substring(0, 100)}`);
            break;
          }
        }
        for (const theme of themes) {
          const content = theme.content.toLowerCase();
          if (
            content.includes("emergent") ||
            content.includes("emerge") ||
            content.includes("whole")
          ) {
            reasoning.push(`Emergent insight: ${theme.content.substring(0, 100)}`);
            break;
          }
        }
        insights.push(...themes);
      }

      // Step 5: Apply integrative thinking
      const integratedInsights = this.integrateInformation(
        problem,
        [...patterns, ...connections, ...themes],
        keyTerms
      );
      if (integratedInsights.length > 0) {
        reasoning.push(
          `Synthesized ${integratedInsights.length} integrative insights for ${primaryTerm}`
        );
        // Add specific integration details to reasoning
        for (const insight of integratedInsights) {
          const content = insight.content.toLowerCase();
          if (
            content.includes("paradox") ||
            content.includes("tension") ||
            content.includes("both")
          ) {
            reasoning.push(`Integration: ${insight.content.substring(0, 100)}`);
            break;
          }
        }
        insights.push(...integratedInsights);
      }

      // Step 6: Generate holistic perspective
      const holisticView = this.generateHolisticPerspective(problem, insights, keyTerms);
      reasoning.push(`Big picture view: ${holisticView.content}`);
      insights.push(holisticView);

      // Step 7: Identify leverage points
      const leveragePoints = this.identifyLeveragePoints(problem, insights, keyTerms);
      if (leveragePoints.length > 0) {
        reasoning.push(
          `Identified ${leveragePoints.length} critical leverage points for ${primaryTerm}`
        );
        insights.push(...leveragePoints);
      }

      // Step 8: Consider temporal dynamics
      if (problem.context && problem.context.length > 0) {
        reasoning.push(`Considering how ${primaryTerm} evolves over time`);
        const temporalInsights = this.considerTemporalDynamics(problem, keyTerms);
        insights.push(...temporalInsights);
      }

      // Step 9: Generate conclusion
      const conclusion = this.generateConclusion(problem, insights, keyTerms);
      reasoning.push(`Therefore, ${conclusion}`);

      // Calculate confidence based on synthesis quality
      const confidence = this.calculateConfidence(problem, insights);

      const processingTime = Math.max(1, Date.now() - startTime);

      // Return top insights
      const finalInsights = insights
        .sort((a, b) => b.importance - a.importance)
        .slice(0, Math.min(10, insights.length));

      return {
        streamId: `synthetic-${problem.id}`,
        streamType: StreamType.SYNTHETIC,
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
        streamId: `synthetic-${problem.id}`,
        streamType: StreamType.SYNTHETIC,
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
    return StreamType.SYNTHETIC;
  }

  /**
   * Identify patterns across disparate information with term reference tracking
   *
   * @param problem - Problem to analyze
   * @param keyTerms - Extracted key terms for problem-specific patterns
   * @returns Array of pattern insights with referenced terms tracked
   */
  private identifyPatterns(problem: Problem, keyTerms: KeyTerms): Insight[] {
    const patterns: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "the system";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);

    // Analyze context for patterns
    const context = problem.context || "";
    const description = problem.description || "";

    // Look for systemic patterns
    if (
      context.includes("multiple") ||
      context.includes("various") ||
      context.includes("several")
    ) {
      const content = `Pattern in ${primaryTerm}: Multiple interconnected ${domainTerms[0] || "factors"} creating systemic complexity`;
      patterns.push({
        content,
        source: StreamType.SYNTHETIC,
        confidence: 0.75,
        importance: 0.8,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }

    // Look for recurring themes
    if (
      description.includes("recurring") ||
      description.includes("repeated") ||
      context.includes("again")
    ) {
      const content = `Recurring pattern in ${primaryTerm}: Similar ${domainTerms[0] || "issues"} manifesting across different areas`;
      patterns.push({
        content,
        source: StreamType.SYNTHETIC,
        confidence: 0.7,
        importance: 0.75,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }

    // Identify cause-effect patterns with specific terms
    const causeEffectContent = `Cause-effect pattern in ${primaryTerm}: ${domainTerms[0] || "Issues"} lead to ${domainTerms[1] || "consequences"} with cascading effects`;
    patterns.push({
      content: causeEffectContent,
      source: StreamType.SYNTHETIC,
      confidence: 0.8,
      importance: 0.85,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(causeEffectContent, keyTerms),
    });

    // Look for feedback loops
    if (context.includes("cycle") || context.includes("loop") || context.includes("reinforc")) {
      const content = `Feedback loop in ${primaryTerm}: Self-reinforcing ${domainTerms[0] || "dynamics"} amplifying effects over time`;
      patterns.push({
        content,
        source: StreamType.SYNTHETIC,
        confidence: 0.75,
        importance: 0.9,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }

    return patterns;
  }

  /**
   * Map connections between concepts with term reference tracking
   *
   * @param problem - Problem to analyze
   * @param keyTerms - Extracted key terms for problem-specific connections
   * @returns Array of connection insights with referenced terms tracked
   */
  private mapConnections(problem: Problem, keyTerms: KeyTerms): Insight[] {
    const connections: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "the system";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);
    const terms = keyTerms.terms.slice(0, 3);

    // Identify direct connections and relationships
    const directContent = `Connection mapping in ${primaryTerm}: ${terms.join(", ")} affects overall ${domainTerms[0] || "dynamics"}`;
    connections.push({
      content: directContent,
      source: StreamType.SYNTHETIC,
      confidence: 0.7,
      importance: 0.75,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(directContent, keyTerms),
    });

    // Look for interdependencies with specific terms
    const interdepContent = `Interdependencies in ${primaryTerm}: ${domainTerms[0] || "Elements"} and ${domainTerms[1] || "components"} mutually depend on each other`;
    connections.push({
      content: interdepContent,
      source: StreamType.SYNTHETIC,
      confidence: 0.75,
      importance: 0.8,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(interdepContent, keyTerms),
    });

    // Identify hidden connections with specific terms
    const hiddenContent = `Hidden connections in ${primaryTerm}: Subtle indirect relationships linking ${terms.slice(0, 2).join(" and ") || "separate issues"}`;
    connections.push({
      content: hiddenContent,
      source: StreamType.SYNTHETIC,
      confidence: 0.65,
      importance: 0.85,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(hiddenContent, keyTerms),
    });

    // Map influence networks
    if (problem.constraints && problem.constraints.length > 1) {
      const influenceContent = `Influence network in ${primaryTerm}: Constraints (${problem.constraints.slice(0, 2).join(", ")}) creating interconnected limitations`;
      connections.push({
        content: influenceContent,
        source: StreamType.SYNTHETIC,
        confidence: 0.7,
        importance: 0.75,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(influenceContent, keyTerms),
      });
    }

    return connections;
  }

  /**
   * Extract overarching themes with term reference tracking
   *
   * @param problem - Problem to analyze
   * @param keyTerms - Extracted key terms for problem-specific themes
   * @returns Array of theme insights with referenced terms tracked
   */
  private extractThemes(_problem: Problem, keyTerms: KeyTerms): Insight[] {
    const themes: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "the system";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);

    // Extract unifying themes with specific terms
    const unifyingContent = `Unifying theme for ${primaryTerm}: Balancing ${domainTerms[0] || "competing priorities"} and ${domainTerms[1] || "managing complexity"}`;
    themes.push({
      content: unifyingContent,
      source: StreamType.SYNTHETIC,
      confidence: 0.75,
      importance: 0.85,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(unifyingContent, keyTerms),
    });

    // Meta-level insights with specific terms
    const metaContent = `Meta-level insight for ${primaryTerm}: Reflects broader ${domainTerms[0] || "systemic"} patterns requiring strategic thinking`;
    themes.push({
      content: metaContent,
      source: StreamType.SYNTHETIC,
      confidence: 0.7,
      importance: 0.8,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(metaContent, keyTerms),
    });

    // Emergent properties with specific terms
    const emergentContent = `Emergent property of ${primaryTerm}: ${domainTerms[0] || "System"} behaviors emerge from ${domainTerms[1] || "component"} interactions`;
    themes.push({
      content: emergentContent,
      source: StreamType.SYNTHETIC,
      confidence: 0.75,
      importance: 0.9,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(emergentContent, keyTerms),
    });

    return themes;
  }

  /**
   * Integrate information from multiple sources with term reference tracking
   *
   * @param problem - Problem being analyzed
   * @param existingInsights - Insights gathered so far
   * @param keyTerms - Extracted key terms for problem-specific integration
   * @returns Array of integrated insights with referenced terms tracked
   */
  private integrateInformation(
    problem: Problem,
    existingInsights: Insight[],
    keyTerms: KeyTerms
  ): Insight[] {
    const integrated: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "the system";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);

    // Synthesize multiple perspectives
    if (existingInsights.length >= 3) {
      const synthesisContent = `Synthesis for ${primaryTerm}: Integrating ${domainTerms[0] || "patterns"}, ${domainTerms[1] || "connections"}, and themes reveals coherent view`;
      integrated.push({
        content: synthesisContent,
        source: StreamType.SYNTHETIC,
        confidence: 0.8,
        importance: 0.85,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(synthesisContent, keyTerms),
      });
    }

    // Bridge different domains
    if (problem.context && problem.context.length > 100) {
      const bridgeContent = `Cross-domain integration for ${primaryTerm}: Bridging ${domainTerms.join(" and ") || "different areas"} creates comprehensive understanding`;
      integrated.push({
        content: bridgeContent,
        source: StreamType.SYNTHETIC,
        confidence: 0.7,
        importance: 0.75,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(bridgeContent, keyTerms),
      });
    }

    // Resolve contradictions with specific terms
    const paradoxContent = `Paradox resolution for ${primaryTerm}: Tensions between ${domainTerms[0] || "competing demands"} can be balanced through systems-level thinking`;
    integrated.push({
      content: paradoxContent,
      source: StreamType.SYNTHETIC,
      confidence: 0.65,
      importance: 0.8,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(paradoxContent, keyTerms),
    });

    return integrated;
  }

  /**
   * Generate holistic perspective with term reference tracking
   *
   * @param problem - Problem being analyzed
   * @param insights - All gathered insights
   * @param keyTerms - Extracted key terms for problem-specific perspective
   * @returns Holistic perspective insight with referenced terms tracked
   */
  private generateHolisticPerspective(
    problem: Problem,
    insights: Insight[],
    keyTerms: KeyTerms
  ): Insight {
    const context = problem.context || "";
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "the system";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);
    const terms = keyTerms.terms.slice(0, 3);

    let content = `The big picture of ${primaryTerm} reveals `;

    // Assess complexity
    if (insights.length >= 5 || context.length > 150) {
      content += `a complex adaptive ${domainTerms[0] || "system"} where `;
    } else {
      content += `an interconnected ${domainTerms[0] || "situation"} where `;
    }

    // Add systemic view with specific terms
    content += `${terms.join(", ")} interact dynamically, `;

    // Consider boundaries
    if (problem.constraints && problem.constraints.length > 0) {
      content += `operating within ${problem.constraints[0]}, `;
    }

    // Add temporal dimension with specific terms
    content += `evolving through ${domainTerms[1] || "feedback"} mechanisms`;

    return {
      content,
      source: StreamType.SYNTHETIC,
      confidence: 0.8,
      importance: 0.9,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
    };
  }

  /**
   * Identify leverage points for intervention with term reference tracking
   *
   * @param problem - Problem being analyzed
   * @param insights - All gathered insights
   * @param keyTerms - Extracted key terms for problem-specific leverage points
   * @returns Array of leverage point insights with referenced terms tracked
   */
  private identifyLeveragePoints(
    problem: Problem,
    insights: Insight[],
    keyTerms: KeyTerms
  ): Insight[] {
    const leveragePoints: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "the system";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);

    // Find high-impact intervention points
    const highImportanceInsights = insights.filter((i) => i.importance > 0.8);

    if (highImportanceInsights.length > 0) {
      const criticalContent = `Critical leverage point for ${primaryTerm}: Focus on ${highImportanceInsights.length} key ${domainTerms[0] || "areas"} with highest impact`;
      leveragePoints.push({
        content: criticalContent,
        source: StreamType.SYNTHETIC,
        confidence: 0.75,
        importance: 0.85,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(criticalContent, keyTerms),
      });
    }

    // Consider goals with specific terms
    if (problem.goals && problem.goals.length > 0) {
      const strategicContent = `Strategic leverage for ${primaryTerm}: Align ${domainTerms[0] || "interventions"} with ${problem.goals[0]} to maximize effectiveness`;
      leveragePoints.push({
        content: strategicContent,
        source: StreamType.SYNTHETIC,
        confidence: 0.7,
        importance: 0.8,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(strategicContent, keyTerms),
      });
    }

    return leveragePoints;
  }

  /**
   * Consider temporal dynamics with term reference tracking
   *
   * @param problem - Problem being analyzed
   * @param keyTerms - Extracted key terms for problem-specific temporal insights
   * @returns Array of temporal insights with referenced terms tracked
   */
  private considerTemporalDynamics(problem: Problem, keyTerms: KeyTerms): Insight[] {
    const temporal: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "the system";
    const domainTerm = keyTerms.domainTerms[0] || "";

    // Time-based evolution with specific terms
    const evolutionContent = `Temporal dynamics of ${primaryTerm}: ${domainTerm || "The system"} changes over time, requiring adaptive ${domainTerm || "strategies"}`;
    temporal.push({
      content: evolutionContent,
      source: StreamType.SYNTHETIC,
      confidence: 0.7,
      importance: 0.75,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(evolutionContent, keyTerms),
    });

    // Consider urgency with specific terms
    if (problem.urgency === "high") {
      const urgencyContent = `Time pressure on ${primaryTerm}: Rapid ${domainTerm || "evolution"} demands quick yet thoughtful intervention`;
      temporal.push({
        content: urgencyContent,
        source: StreamType.SYNTHETIC,
        confidence: 0.75,
        importance: 0.8,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(urgencyContent, keyTerms),
      });
    }

    return temporal;
  }

  /**
   * Generate conclusion from synthetic analysis with validated term references
   *
   * @param problem - Original problem
   * @param insights - Generated insights
   * @param keyTerms - Extracted key terms for problem-specific conclusion
   * @returns Conclusion statement with guaranteed key term reference
   */
  private generateConclusion(problem: Problem, insights: Insight[], keyTerms: KeyTerms): string {
    const parts: string[] = [];
    const primaryTerm = keyTerms.primarySubject || keyTerms.terms[0] || "the situation";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);

    // Overall synthesis with specific terms
    parts.push(`${primaryTerm} represents`);

    // Assess complexity
    if (insights.length >= 7) {
      parts.push(`a highly complex ${domainTerms[0] || "system"}`);
    } else if (insights.length >= 4) {
      parts.push(`a moderately complex ${domainTerms[0] || "system"}`);
    } else {
      parts.push(`an interconnected ${domainTerms[0] || "system"}`);
    }

    // Key themes with specific terms
    const highImportanceCount = insights.filter((i) => i.importance > 0.8).length;
    if (highImportanceCount > 0) {
      parts.push(
        `with ${highImportanceCount} critical ${domainTerms[1] || "leverage point"}${highImportanceCount > 1 ? "s" : ""}`
      );
    }

    // Strategic direction with specific terms
    if (problem.goals && problem.goals.length > 0) {
      parts.push(
        `requiring strategic ${domainTerms[0] || "systems-level"} thinking to ${problem.goals[0]}`
      );
    } else {
      parts.push(
        `requiring holistic understanding of ${domainTerms.join(" and ") || "all components"}`
      );
    }

    // Validate and ensure conclusion contains at least one key term
    const conclusion = parts.join(" ");
    return this.keyTermExtractor.ensureTermReference(conclusion, keyTerms);
  }

  /**
   * Calculate confidence score
   *
   * @param problem - Problem being analyzed
   * @param insights - Generated insights
   * @returns Confidence score (0-1)
   */
  private calculateConfidence(problem: Problem, insights: Insight[]): number {
    let confidence = 0.75; // Synthetic stream is generally confident in synthesis

    // Boost confidence if we have many insights
    if (insights.length >= 7) {
      confidence += 0.1;
    }

    // Boost confidence if we have high importance insights
    const highImportanceCount = insights.filter((i) => i.importance > 0.8).length;
    if (highImportanceCount >= 3) {
      confidence += 0.1;
    }

    // Reduce confidence if context is limited or missing
    if (!problem.context || problem.context.trim().length === 0) {
      confidence -= 0.35; // Larger penalty for missing/empty context
    } else if (problem.context.length < 20) {
      confidence -= 0.25; // Penalty for very limited context
    } else if (problem.context.length < 50) {
      confidence -= 0.15;
    }

    // Reduce confidence if problem is very constrained
    if (problem.constraints && problem.constraints.length > 3) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }
}

/**
 * Synthetic Reasoning Stream
 *
 * Implements a reasoning stream that performs integrative, holistic thinking
 * with progress tracking, timeout management, and cancellation support.
 */
export class SyntheticReasoningStream implements ReasoningStream {
  public readonly id: string;
  public readonly type: StreamType;
  public readonly processor: StreamProcessor;
  public readonly timeout: number;

  private progress: number = 0;
  private cancelled: boolean = false;
  private processing: boolean = false;

  /**
   * Create synthetic reasoning stream
   *
   * @param timeout - Timeout in milliseconds (default: 10000ms)
   */
  constructor(timeout: number = 10000) {
    this.id = `synthetic-stream-${Date.now()}`;
    this.type = StreamType.SYNTHETIC;
    this.processor = new SyntheticStreamProcessor();
    this.timeout = timeout;
  }

  /**
   * Process a problem using synthetic reasoning
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
              conclusion: "Synthesis incomplete due to timeout",
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
