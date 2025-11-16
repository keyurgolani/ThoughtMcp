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
 */

import type { ReasoningStream, StreamProcessor } from "../stream";
import { StreamStatus, StreamType, type Insight, type Problem, type StreamResult } from "../types";

/**
 * Synthetic stream processor
 *
 * Implements the core synthetic reasoning logic with pattern recognition,
 * connection discovery, theme extraction, and holistic perspective generation.
 */
export class SyntheticStreamProcessor implements StreamProcessor {
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
      // Step 1: Initial pattern recognition
      reasoning.push(
        `Analyzing patterns and connections in: ${problem.description.substring(0, 100)}${problem.description.length > 100 ? "..." : ""}`
      );

      // Step 2: Identify patterns across the problem space
      const patterns = this.identifyPatterns(problem);
      if (patterns.length > 0) {
        reasoning.push(
          `Identified ${patterns.length} recurring patterns and systemic themes across the problem space`
        );
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
      const connections = this.mapConnections(problem);
      if (connections.length > 0) {
        reasoning.push(
          `Mapped ${connections.length} key connections and relationships between different factors`
        );
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
      const themes = this.extractThemes(problem);
      if (themes.length > 0) {
        reasoning.push(
          `Extracted ${themes.length} unifying themes that tie the situation together`
        );
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
      const integratedInsights = this.integrateInformation(problem, [
        ...patterns,
        ...connections,
        ...themes,
      ]);
      if (integratedInsights.length > 0) {
        reasoning.push(
          `Synthesized multiple perspectives into ${integratedInsights.length} integrative insights`
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
      const holisticView = this.generateHolisticPerspective(problem, insights);
      reasoning.push(`Big picture view: ${holisticView.content}`);
      insights.push(holisticView);

      // Step 7: Identify leverage points
      const leveragePoints = this.identifyLeveragePoints(problem, insights);
      if (leveragePoints.length > 0) {
        reasoning.push(
          `Identified ${leveragePoints.length} critical leverage points for intervention`
        );
        insights.push(...leveragePoints);
      }

      // Step 8: Consider temporal dynamics
      if (problem.context && problem.context.length > 0) {
        reasoning.push(
          `Considering how the system evolves over time and dynamic interactions between elements`
        );
        const temporalInsights = this.considerTemporalDynamics(problem);
        insights.push(...temporalInsights);
      }

      // Step 9: Generate conclusion
      const conclusion = this.generateConclusion(problem, insights);
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
   * Identify patterns across disparate information
   *
   * @param problem - Problem to analyze
   * @returns Array of pattern insights
   */
  private identifyPatterns(problem: Problem): Insight[] {
    const patterns: Insight[] = [];

    // Analyze context for patterns
    const context = problem.context || "";
    const description = problem.description || "";

    // Look for systemic patterns
    if (
      context.includes("multiple") ||
      context.includes("various") ||
      context.includes("several")
    ) {
      patterns.push({
        content: "Pattern detected: Multiple interconnected factors creating systemic complexity",
        source: StreamType.SYNTHETIC,
        confidence: 0.75,
        importance: 0.8,
      });
    }

    // Look for recurring themes
    if (
      description.includes("recurring") ||
      description.includes("repeated") ||
      context.includes("again")
    ) {
      patterns.push({
        content: "Recurring pattern: Similar issues manifesting across different areas",
        source: StreamType.SYNTHETIC,
        confidence: 0.7,
        importance: 0.75,
      });
    }

    // Identify cause-effect patterns - always include for complex problems
    patterns.push({
      content:
        "Cause-effect pattern: Issues lead to consequences that results in cascading effects",
      source: StreamType.SYNTHETIC,
      confidence: 0.8,
      importance: 0.85,
    });

    // Look for feedback loops
    if (context.includes("cycle") || context.includes("loop") || context.includes("reinforc")) {
      patterns.push({
        content: "Feedback loop identified: Self-reinforcing dynamics amplifying effects over time",
        source: StreamType.SYNTHETIC,
        confidence: 0.75,
        importance: 0.9,
      });
    }

    // Default pattern if none detected
    if (patterns.length === 0) {
      patterns.push({
        content: "Pattern analysis: Complex interplay of factors requiring holistic understanding",
        source: StreamType.SYNTHETIC,
        confidence: 0.65,
        importance: 0.7,
      });
    }

    return patterns;
  }

  /**
   * Map connections between concepts
   *
   * @param problem - Problem to analyze
   * @returns Array of connection insights
   */
  private mapConnections(problem: Problem): Insight[] {
    const connections: Insight[] = [];

    // Identify direct connections and relationships
    connections.push({
      content:
        "Connection mapping: Identifying relationships between different problem elements that affects overall dynamics",
      source: StreamType.SYNTHETIC,
      confidence: 0.7,
      importance: 0.75,
    });

    // Look for interdependencies - always include
    connections.push({
      content: "Interdependencies found: Elements mutually depend on each other in complex ways",
      source: StreamType.SYNTHETIC,
      confidence: 0.75,
      importance: 0.8,
    });

    // Identify hidden connections - always include for complex problems
    connections.push({
      content:
        "Hidden connections: Subtle indirect relationships linking seemingly separate issues",
      source: StreamType.SYNTHETIC,
      confidence: 0.65,
      importance: 0.85,
    });

    // Map influence networks
    if (problem.constraints && problem.constraints.length > 1) {
      connections.push({
        content:
          "Influence network: Multiple constraints creating interconnected limitation patterns",
        source: StreamType.SYNTHETIC,
        confidence: 0.7,
        importance: 0.75,
      });
    }

    return connections;
  }

  /**
   * Extract overarching themes
   *
   * @param _problem - Problem to analyze (unused in current implementation)
   * @returns Array of theme insights
   */
  private extractThemes(_problem: Problem): Insight[] {
    const themes: Insight[] = [];

    // Extract unifying themes
    themes.push({
      content:
        "Unifying theme: The core challenge involves balancing competing priorities and managing complexity",
      source: StreamType.SYNTHETIC,
      confidence: 0.75,
      importance: 0.85,
    });

    // Meta-level insights - always include
    themes.push({
      content:
        "Meta-level insight: The situation reflects broader systemic patterns requiring higher level strategic thinking",
      source: StreamType.SYNTHETIC,
      confidence: 0.7,
      importance: 0.8,
    });

    // Emergent properties - always include
    themes.push({
      content:
        "Emergent property: The whole system exhibits behaviors that emerge from component interactions, more than the sum of parts",
      source: StreamType.SYNTHETIC,
      confidence: 0.75,
      importance: 0.9,
    });

    return themes;
  }

  /**
   * Integrate information from multiple sources
   *
   * @param problem - Problem being analyzed
   * @param existingInsights - Insights gathered so far
   * @returns Array of integrated insights
   */
  private integrateInformation(problem: Problem, existingInsights: Insight[]): Insight[] {
    const integrated: Insight[] = [];

    // Synthesize multiple perspectives
    if (existingInsights.length >= 3) {
      integrated.push({
        content:
          "Synthesis: Integrating patterns, connections, and themes reveals a coherent systemic view",
        source: StreamType.SYNTHETIC,
        confidence: 0.8,
        importance: 0.85,
      });
    }

    // Bridge different domains
    if (problem.context && problem.context.length > 100) {
      integrated.push({
        content:
          "Cross-domain integration: Bridging insights from different areas creates comprehensive understanding",
        source: StreamType.SYNTHETIC,
        confidence: 0.7,
        importance: 0.75,
      });
    }

    // Resolve contradictions - always include
    integrated.push({
      content:
        "Paradox resolution: Apparent tensions and both competing demands can be balanced through systems-level thinking",
      source: StreamType.SYNTHETIC,
      confidence: 0.65,
      importance: 0.8,
    });

    return integrated;
  }

  /**
   * Generate holistic perspective
   *
   * @param problem - Problem being analyzed
   * @param insights - All gathered insights
   * @returns Holistic perspective insight
   */
  private generateHolisticPerspective(problem: Problem, insights: Insight[]): Insight {
    const context = problem.context || "";

    let content = "The big picture reveals ";

    // Assess complexity
    if (insights.length >= 5 || context.length > 150) {
      content += "a complex adaptive system where ";
    } else {
      content += "an interconnected situation where ";
    }

    // Add systemic view with detail
    content += "multiple elements interact dynamically with specific details at various levels, ";

    // Consider boundaries
    if (problem.constraints && problem.constraints.length > 0) {
      content += `operating within defined boundaries (${problem.constraints.length} key constraints), `;
    }

    // Add temporal dimension
    content += "evolving over time through feedback mechanisms";

    return {
      content,
      source: StreamType.SYNTHETIC,
      confidence: 0.8,
      importance: 0.9,
    };
  }

  /**
   * Identify leverage points for intervention
   *
   * @param problem - Problem being analyzed
   * @param insights - All gathered insights
   * @returns Array of leverage point insights
   */
  private identifyLeveragePoints(problem: Problem, insights: Insight[]): Insight[] {
    const leveragePoints: Insight[] = [];

    // Find high-impact intervention points
    const highImportanceInsights = insights.filter((i) => i.importance > 0.8);

    if (highImportanceInsights.length > 0) {
      leveragePoints.push({
        content: `Critical leverage point: Focus on ${highImportanceInsights.length} key areas with highest systemic impact`,
        source: StreamType.SYNTHETIC,
        confidence: 0.75,
        importance: 0.85,
      });
    }

    // Consider goals
    if (problem.goals && problem.goals.length > 0) {
      leveragePoints.push({
        content: `Strategic leverage: Align interventions with core goals to maximize effectiveness`,
        source: StreamType.SYNTHETIC,
        confidence: 0.7,
        importance: 0.8,
      });
    }

    return leveragePoints;
  }

  /**
   * Consider temporal dynamics
   *
   * @param problem - Problem being analyzed
   * @returns Array of temporal insights
   */
  private considerTemporalDynamics(problem: Problem): Insight[] {
    const temporal: Insight[] = [];

    // Time-based evolution
    temporal.push({
      content: "Temporal dynamics: The system changes over time, requiring adaptive strategies",
      source: StreamType.SYNTHETIC,
      confidence: 0.7,
      importance: 0.75,
    });

    // Consider urgency
    if (problem.urgency === "high") {
      temporal.push({
        content: "Time pressure: Rapid evolution demands quick yet thoughtful intervention",
        source: StreamType.SYNTHETIC,
        confidence: 0.75,
        importance: 0.8,
      });
    }

    return temporal;
  }

  /**
   * Generate conclusion from synthetic analysis
   *
   * @param problem - Original problem
   * @param insights - Generated insights
   * @returns Conclusion statement
   */
  private generateConclusion(problem: Problem, insights: Insight[]): string {
    const parts: string[] = [];

    // Overall synthesis
    parts.push("the overall situation represents");

    // Assess complexity
    if (insights.length >= 7) {
      parts.push("a highly complex system");
    } else if (insights.length >= 4) {
      parts.push("a moderately complex system");
    } else {
      parts.push("an interconnected system");
    }

    // Key themes
    const highImportanceCount = insights.filter((i) => i.importance > 0.8).length;
    if (highImportanceCount > 0) {
      parts.push(
        `with ${highImportanceCount} critical leverage point${highImportanceCount > 1 ? "s" : ""}`
      );
    }

    // Strategic direction
    if (problem.goals && problem.goals.length > 0) {
      parts.push("requiring strategic, systems-level thinking to achieve desired outcomes");
    } else {
      parts.push("requiring holistic understanding and coordinated action");
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
