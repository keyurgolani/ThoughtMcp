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
import type { ReasoningStream, StreamProcessor } from "../stream.types";
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
    if (!problem?.id || !problem.description) {
      throw new Error("Invalid problem: missing required fields");
    }

    try {
      // Extract key terms for problem-specific patterns (Req 4.4, 15.3)
      const keyTerms = this.keyTermExtractor.extract(problem.description, problem.context);
      const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the system";

      // Step 1: Initial pattern recognition
      reasoning.push(
        `Analyzing patterns and connections in: ${problem.description.substring(0, 100)}${problem.description.length > 100 ? "..." : ""}`
      );

      // Steps 2-5: Core synthesis analysis
      this.performCoreSynthesis(problem, keyTerms, primaryTerm, reasoning, insights);

      // Step 6: Generate holistic perspective
      const holisticView = this.generateHolisticPerspective(problem, insights, keyTerms);
      reasoning.push(`Big picture view: ${holisticView.content}`);
      insights.push(holisticView);

      // Steps 7-8: Leverage points and temporal dynamics
      this.analyzeLeverageAndTemporal(problem, keyTerms, primaryTerm, reasoning, insights);

      // Step 9: Generate conclusion
      const conclusion = this.generateConclusion(problem, insights, keyTerms);
      reasoning.push(`Therefore, ${conclusion}`);

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

  private performCoreSynthesis(
    problem: Problem,
    keyTerms: KeyTerms,
    primaryTerm: string,
    reasoning: string[],
    insights: Insight[]
  ): void {
    // Step 2: Identify patterns
    const patterns = this.identifyPatterns(problem, keyTerms);
    this.addPatternReasoning(patterns, primaryTerm, reasoning, insights);

    // Step 3: Map connections
    const connections = this.mapConnections(problem, keyTerms);
    this.addConnectionReasoning(connections, primaryTerm, reasoning, insights);

    // Step 4: Extract themes
    const themes = this.extractThemes(problem, keyTerms);
    this.addThemeReasoning(themes, primaryTerm, reasoning, insights);

    // Step 5: Integrate information
    const integratedInsights = this.integrateInformation(
      problem,
      [...patterns, ...connections, ...themes],
      keyTerms
    );
    this.addIntegrationReasoning(integratedInsights, primaryTerm, reasoning, insights);
  }

  private addPatternReasoning(
    patterns: Insight[],
    primaryTerm: string,
    reasoning: string[],
    insights: Insight[]
  ): void {
    if (patterns.length > 0) {
      reasoning.push(`Identified ${patterns.length} recurring patterns in ${primaryTerm}`);
      this.addFirstMatchingReasoning(patterns, ["cause", "effect"], "Pattern analysis", reasoning);
      insights.push(...patterns);
    }
  }

  private addConnectionReasoning(
    connections: Insight[],
    primaryTerm: string,
    reasoning: string[],
    insights: Insight[]
  ): void {
    if (connections.length > 0) {
      reasoning.push(`Mapped ${connections.length} key connections in ${primaryTerm}`);
      this.addFirstMatchingReasoning(
        connections,
        ["affects", "relates", "influences"],
        "Connection insight",
        reasoning
      );
      this.addFirstMatchingReasoning(
        connections,
        ["hidden", "subtle", "indirect"],
        "Hidden relationship",
        reasoning
      );
      this.addFirstMatchingReasoning(
        connections,
        ["interdepend", "depend", "mutual"],
        "Interdependency",
        reasoning
      );
      insights.push(...connections);
    }
  }

  private addThemeReasoning(
    themes: Insight[],
    primaryTerm: string,
    reasoning: string[],
    insights: Insight[]
  ): void {
    if (themes.length > 0) {
      reasoning.push(`Extracted ${themes.length} unifying themes for ${primaryTerm}`);
      this.addFirstMatchingReasoning(
        themes,
        ["meta", "higher level", "broader"],
        "Meta-level theme",
        reasoning
      );
      this.addFirstMatchingReasoning(
        themes,
        ["emergent", "emerge", "whole"],
        "Emergent insight",
        reasoning
      );
      insights.push(...themes);
    }
  }

  private addIntegrationReasoning(
    integratedInsights: Insight[],
    primaryTerm: string,
    reasoning: string[],
    insights: Insight[]
  ): void {
    if (integratedInsights.length > 0) {
      reasoning.push(
        `Synthesized ${integratedInsights.length} integrative insights for ${primaryTerm}`
      );
      this.addFirstMatchingReasoning(
        integratedInsights,
        ["paradox", "tension", "both"],
        "Integration",
        reasoning
      );
      insights.push(...integratedInsights);
    }
  }

  private addFirstMatchingReasoning(
    items: Insight[],
    keywords: string[],
    prefix: string,
    reasoning: string[]
  ): void {
    for (const item of items) {
      const content = item.content.toLowerCase();
      if (keywords.some((kw) => content.includes(kw))) {
        reasoning.push(`${prefix}: ${item.content.substring(0, 100)}`);
        return;
      }
    }
  }

  private analyzeLeverageAndTemporal(
    problem: Problem,
    keyTerms: KeyTerms,
    primaryTerm: string,
    reasoning: string[],
    insights: Insight[]
  ): void {
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
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the system";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);
    const context = problem.context ?? "";

    this.checkSystemicPatterns(context, primaryTerm, domainTerms, keyTerms, patterns);
    this.checkRecurringPatterns(problem, primaryTerm, domainTerms, keyTerms, patterns);
    this.addCauseEffectPattern(primaryTerm, domainTerms, keyTerms, patterns);
    this.checkFeedbackLoops(context, primaryTerm, domainTerms, keyTerms, patterns);

    return patterns;
  }

  private checkSystemicPatterns(
    context: string,
    primaryTerm: string,
    domainTerms: string[],
    keyTerms: KeyTerms,
    patterns: Insight[]
  ): void {
    const hasSystemicIndicators =
      context.includes("multiple") || context.includes("various") || context.includes("several");
    if (hasSystemicIndicators) {
      const content = `Pattern in ${primaryTerm}: Multiple interconnected ${domainTerms[0] ?? "factors"} creating systemic complexity`;
      patterns.push(this.createPatternInsight(content, 0.75, 0.8, keyTerms));
    }
  }

  private checkRecurringPatterns(
    problem: Problem,
    primaryTerm: string,
    domainTerms: string[],
    keyTerms: KeyTerms,
    patterns: Insight[]
  ): void {
    const context = problem.context ?? "";
    const description = problem.description ?? "";
    const hasRecurringIndicators =
      description.includes("recurring") ||
      description.includes("repeated") ||
      context.includes("again");
    if (hasRecurringIndicators) {
      const content = `Recurring pattern in ${primaryTerm}: Similar ${domainTerms[0] ?? "issues"} manifesting across different areas`;
      patterns.push(this.createPatternInsight(content, 0.7, 0.75, keyTerms));
    }
  }

  private addCauseEffectPattern(
    primaryTerm: string,
    domainTerms: string[],
    keyTerms: KeyTerms,
    patterns: Insight[]
  ): void {
    const causeEffectContent = `Cause-effect pattern in ${primaryTerm}: ${domainTerms[0] ?? "Issues"} lead to ${domainTerms[1] ?? "consequences"} with cascading effects`;
    patterns.push(this.createPatternInsight(causeEffectContent, 0.8, 0.85, keyTerms));
  }

  private checkFeedbackLoops(
    context: string,
    primaryTerm: string,
    domainTerms: string[],
    keyTerms: KeyTerms,
    patterns: Insight[]
  ): void {
    const hasFeedbackIndicators =
      context.includes("cycle") || context.includes("loop") || context.includes("reinforc");
    if (hasFeedbackIndicators) {
      const content = `Feedback loop in ${primaryTerm}: Self-reinforcing ${domainTerms[0] ?? "dynamics"} amplifying effects over time`;
      patterns.push(this.createPatternInsight(content, 0.75, 0.9, keyTerms));
    }
  }

  private createPatternInsight(
    content: string,
    confidence: number,
    importance: number,
    keyTerms: KeyTerms
  ): Insight {
    return {
      content,
      source: StreamType.SYNTHETIC,
      confidence,
      importance,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
    };
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
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the system";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);
    const terms = keyTerms.terms.slice(0, 3);

    // Identify direct connections and relationships
    const directContent = `Connection mapping in ${primaryTerm}: ${terms.join(", ")} affects overall ${domainTerms[0] ?? "dynamics"}`;
    connections.push({
      content: directContent,
      source: StreamType.SYNTHETIC,
      confidence: 0.7,
      importance: 0.75,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(directContent, keyTerms),
    });

    // Look for interdependencies with specific terms
    const interdepContent = `Interdependencies in ${primaryTerm}: ${domainTerms[0] ?? "Elements"} and ${domainTerms[1] ?? "components"} mutually depend on each other`;
    connections.push({
      content: interdepContent,
      source: StreamType.SYNTHETIC,
      confidence: 0.75,
      importance: 0.8,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(interdepContent, keyTerms),
    });

    // Identify hidden connections with specific terms
    const hiddenContent = `Hidden connections in ${primaryTerm}: Subtle indirect relationships linking ${terms.slice(0, 2).join(" and ") ?? "separate issues"}`;
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
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the system";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);

    // Extract unifying themes with specific terms
    const unifyingContent = `Unifying theme for ${primaryTerm}: Balancing ${domainTerms[0] ?? "competing priorities"} and ${domainTerms[1] ?? "managing complexity"}`;
    themes.push({
      content: unifyingContent,
      source: StreamType.SYNTHETIC,
      confidence: 0.75,
      importance: 0.85,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(unifyingContent, keyTerms),
    });

    // Meta-level insights with specific terms
    const metaContent = `Meta-level insight for ${primaryTerm}: Reflects broader ${domainTerms[0] ?? "systemic"} patterns requiring strategic thinking`;
    themes.push({
      content: metaContent,
      source: StreamType.SYNTHETIC,
      confidence: 0.7,
      importance: 0.8,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(metaContent, keyTerms),
    });

    // Emergent properties with specific terms
    const emergentContent = `Emergent property of ${primaryTerm}: ${domainTerms[0] ?? "System"} behaviors emerge from ${domainTerms[1] ?? "component"} interactions`;
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
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the system";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);

    // Synthesize multiple perspectives
    if (existingInsights.length >= 3) {
      const synthesisContent = `Synthesis for ${primaryTerm}: Integrating ${domainTerms[0] ?? "patterns"}, ${domainTerms[1] ?? "connections"}, and themes reveals coherent view`;
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
    const paradoxContent = `Paradox resolution for ${primaryTerm}: Tensions between ${domainTerms[0] ?? "competing demands"} can be balanced through systems-level thinking`;
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
    const context = problem.context ?? "";
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the system";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);
    const terms = keyTerms.terms.slice(0, 3);

    let content = `The big picture of ${primaryTerm} reveals `;

    // Assess complexity
    if (insights.length >= 5 || context.length > 150) {
      content += `a complex adaptive ${domainTerms[0] ?? "system"} where `;
    } else {
      content += `an interconnected ${domainTerms[0] ?? "situation"} where `;
    }

    // Add systemic view with specific terms
    content += `${terms.join(", ")} interact dynamically, `;

    // Consider boundaries
    if (problem.constraints && problem.constraints.length > 0) {
      content += `operating within ${problem.constraints[0]}, `;
    }

    // Add temporal dimension with specific terms
    content += `evolving through ${domainTerms[1] ?? "feedback"} mechanisms`;

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
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the system";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);
    const context = problem.context ?? "";

    // Add high-impact leverage points
    this.addHighImpactLeveragePoints(leveragePoints, insights, primaryTerm, domainTerms, keyTerms);

    // Add goal-aligned leverage points
    this.addGoalAlignedLeveragePoints(leveragePoints, problem, primaryTerm, domainTerms, keyTerms);

    // Add context-specific leverage points
    this.addContextSpecificLeveragePoints(leveragePoints, context, primaryTerm, keyTerms);

    // Add trade-off analysis
    this.addTradeoffAnalysis(leveragePoints, problem, primaryTerm, domainTerms, keyTerms);

    return leveragePoints;
  }

  /**
   * Add leverage points for high-importance insights
   */
  private addHighImpactLeveragePoints(
    leveragePoints: Insight[],
    insights: Insight[],
    primaryTerm: string,
    domainTerms: string[],
    keyTerms: KeyTerms
  ): void {
    const highImportanceInsights = insights.filter((i) => i.importance > 0.8);

    if (highImportanceInsights.length > 0) {
      const content = `Critical leverage point for ${primaryTerm}: Focus on ${highImportanceInsights.length} key ${domainTerms[0] ?? "areas"} with highest impact. Prioritization framework: (1) Address items with >80% importance first, (2) Sequence by dependency order, (3) Target 80/20 rule - 20% of changes should yield 80% of benefits`;
      leveragePoints.push({
        content,
        source: StreamType.SYNTHETIC,
        confidence: 0.75,
        importance: 0.85,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }
  }

  /**
   * Add leverage points aligned with problem goals
   */
  private addGoalAlignedLeveragePoints(
    leveragePoints: Insight[],
    problem: Problem,
    primaryTerm: string,
    domainTerms: string[],
    keyTerms: KeyTerms
  ): void {
    if (problem.goals && problem.goals.length > 0) {
      const content = `Strategic leverage for ${primaryTerm}: Align ${domainTerms[0] ?? "interventions"} with "${problem.goals[0]}" using OKR framework - define 3-5 key results with measurable targets, review progress bi-weekly, and adjust tactics based on leading indicators`;
      leveragePoints.push({
        content,
        source: StreamType.SYNTHETIC,
        confidence: 0.7,
        importance: 0.8,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }
  }

  /**
   * Add context-specific leverage points (performance, user engagement)
   */
  private addContextSpecificLeveragePoints(
    leveragePoints: Insight[],
    context: string,
    primaryTerm: string,
    keyTerms: KeyTerms
  ): void {
    const lowerContext = context.toLowerCase();

    if (lowerContext.includes("performance") || lowerContext.includes("latency")) {
      const content = `System leverage point for ${primaryTerm}: Target the critical path - identify the 3-5 operations that account for 80% of latency and optimize those first. Use profiling data to validate assumptions before investing in optimization`;
      leveragePoints.push({
        content,
        source: StreamType.SYNTHETIC,
        confidence: 0.75,
        importance: 0.85,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }

    if (lowerContext.includes("user") || lowerContext.includes("engagement")) {
      const content = `User experience leverage point for ${primaryTerm}: Focus on the "aha moment" - identify the single action that correlates most strongly with long-term retention and optimize the path to that action. Reduce friction by eliminating unnecessary steps`;
      leveragePoints.push({
        content,
        source: StreamType.SYNTHETIC,
        confidence: 0.7,
        importance: 0.8,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }
  }

  /**
   * Add trade-off analysis for constrained problems
   */
  private addTradeoffAnalysis(
    leveragePoints: Insight[],
    problem: Problem,
    primaryTerm: string,
    domainTerms: string[],
    keyTerms: KeyTerms
  ): void {
    if (problem.constraints && problem.constraints.length > 0) {
      const content = `Trade-off analysis for ${primaryTerm}: Given constraint "${problem.constraints[0]}", optimize for ${domainTerms[0] ?? "primary metric"} while accepting controlled degradation in secondary metrics. Document trade-off decisions for future reference`;
      leveragePoints.push({
        content,
        source: StreamType.SYNTHETIC,
        confidence: 0.7,
        importance: 0.75,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }
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
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the system";
    const domainTerm = keyTerms.domainTerms[0] ?? "";

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
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the situation";
    const domainTerms = keyTerms.domainTerms.slice(0, 2);

    // Overall synthesis with specific characterization
    parts.push(`${primaryTerm} represents`);

    // Assess complexity with specific implications
    if (insights.length >= 7) {
      parts.push(
        `a highly complex ${domainTerms[0] ?? "system"} with multiple interdependencies requiring coordinated intervention across ${Math.min(insights.length, 5)} key areas`
      );
    } else if (insights.length >= 4) {
      parts.push(
        `a moderately complex ${domainTerms[0] ?? "system"} with identifiable patterns that can be addressed through focused, sequential improvements`
      );
    } else {
      parts.push(
        `an interconnected ${domainTerms[0] ?? "system"} with clear intervention points for targeted optimization`
      );
    }

    // Key themes with specific recommendations
    const highImportanceCount = insights.filter((i) => i.importance > 0.8).length;
    if (highImportanceCount > 0) {
      parts.push(
        `with ${highImportanceCount} critical ${domainTerms[1] ?? "leverage point"}${highImportanceCount > 1 ? "s" : ""} that should be prioritized in the first phase of implementation`
      );
    }

    // Strategic direction with actionable next steps
    if (problem.goals && problem.goals.length > 0) {
      parts.push(
        `Recommended approach to ${problem.goals[0]}: (1) Start with highest-impact, lowest-risk interventions, (2) Establish feedback loops to measure progress, (3) Iterate based on observed outcomes`
      );
    } else {
      parts.push(
        `Recommended approach: Apply systems thinking to understand ${domainTerms.join(" and ") || "all components"} holistically, then implement changes incrementally with continuous monitoring`
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
          reasoning: result.reasoning ?? [],
          insights: result.insights ?? [],
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
