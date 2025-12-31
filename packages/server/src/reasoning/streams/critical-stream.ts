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
 * - Problem-specific weaknesses (Requirements 4.3, 15.3)
 */

import { KeyTermExtractor, type KeyTerms } from "../key-term-extractor";
import type { ReasoningStream, StreamProcessor } from "../stream.types";
import { StreamStatus, StreamType, type Insight, type Problem, type StreamResult } from "../types";

/**
 * Critical stream processor
 *
 * Implements the core critical reasoning logic with weakness detection,
 * assumption challenging, risk assessment, and counter-argument generation.
 * Generates problem-specific weaknesses using key term extraction.
 */
export class CriticalStreamProcessor implements StreamProcessor {
  private readonly keyTermExtractor: KeyTermExtractor;

  constructor() {
    this.keyTermExtractor = new KeyTermExtractor();
  }

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
    if (!problem?.id || !problem.description) {
      throw new Error("Invalid problem: missing required fields");
    }

    try {
      // Extract key terms for problem-specific criticism (Req 4.3, 15.3)
      const keyTerms = this.keyTermExtractor.extract(problem.description, problem.context);
      const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the proposal";

      // Step 1: Initial skeptical assessment
      reasoning.push(
        `Critically examining: ${problem.description.substring(0, 100)}${problem.description.length > 100 ? "..." : ""}`
      );

      // Steps 2-6: Core analysis
      this.performCoreAnalysis(problem, keyTerms, primaryTerm, reasoning, insights);

      // Step 7: Evaluate evidence quality
      const evidenceAssessment = this.evaluateEvidence(problem, keyTerms);
      reasoning.push(evidenceAssessment.reasoning);
      if (evidenceAssessment.insight) {
        insights.push(evidenceAssessment.insight);
      }

      // Step 8: Consider constraints critically
      this.analyzeConstraints(problem, keyTerms, primaryTerm, reasoning, insights);

      // Step 9: Generate conclusion
      const conclusion = this.generateConclusion(problem, insights, keyTerms);
      reasoning.push(`Therefore, ${conclusion}`);
      reasoning.push(
        `While concerns about ${primaryTerm} exist, there could be potential if issues are addressed`
      );

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

  private performCoreAnalysis(
    problem: Problem,
    keyTerms: KeyTerms,
    primaryTerm: string,
    reasoning: string[],
    insights: Insight[]
  ): void {
    // Step 2: Identify weaknesses
    const weaknesses = this.identifyWeaknesses(problem, keyTerms);
    this.addWeaknessReasoning(weaknesses, primaryTerm, reasoning, insights);

    // Step 3: Challenge assumptions
    const assumptions = this.challengeAssumptions(problem, keyTerms);
    this.addAssumptionReasoning(problem, assumptions, primaryTerm, reasoning, insights);

    // Step 4: Assess risks
    const risks = this.assessRisks(problem, keyTerms);
    this.addRiskReasoning(risks, primaryTerm, reasoning, insights);

    // Step 5: Detect logical flaws
    const flaws = this.detectFlaws(problem, keyTerms);
    this.addFlawReasoning(flaws, primaryTerm, reasoning, insights);

    // Step 6: Play devil's advocate
    const counterArguments = this.generateCounterArguments(problem, keyTerms);
    this.addCounterArgumentReasoning(counterArguments, primaryTerm, reasoning, insights);
  }

  private addWeaknessReasoning(
    weaknesses: Insight[],
    primaryTerm: string,
    reasoning: string[],
    insights: Insight[]
  ): void {
    if (weaknesses.length > 0) {
      reasoning.push(
        `Identified ${weaknesses.length} potential weakness${weaknesses.length > 1 ? "es" : ""} in ${primaryTerm}`
      );
      reasoning.push(`Logical gaps in ${primaryTerm} require clarification before proceeding`);
      reasoning.push(
        `Implementation challenges for ${primaryTerm} include complexity given current constraints`
      );
      insights.push(...weaknesses);
    }
  }

  private addAssumptionReasoning(
    problem: Problem,
    assumptions: Insight[],
    primaryTerm: string,
    reasoning: string[],
    insights: Insight[]
  ): void {
    if (assumptions.length > 0) {
      reasoning.push(
        `Questioning ${assumptions.length} underlying assumption${assumptions.length > 1 ? "s" : ""} about ${primaryTerm}`
      );
      if ((problem.context ?? "").includes("%")) {
        reasoning.push(
          `Projections for ${primaryTerm} appear optimistic - need validation of achievable targets`
        );
      }
      insights.push(...assumptions);
    }
  }

  private addRiskReasoning(
    risks: Insight[],
    primaryTerm: string,
    reasoning: string[],
    insights: Insight[]
  ): void {
    if (risks.length > 0) {
      reasoning.push(
        `Risk assessment for ${primaryTerm} reveals ${risks.length} significant concern${risks.length > 1 ? "s" : ""}`
      );
      reasoning.push(
        `Unintended consequences from ${primaryTerm} could have broader impact than anticipated`
      );
      reasoning.push(
        `Worst-case scenario: ${primaryTerm} could fail and cause more harm than good`
      );
      reasoning.push(`Risk mitigation strategies for ${primaryTerm} should be developed`);
      insights.push(...risks);
    }
  }

  private addFlawReasoning(
    flaws: Insight[],
    primaryTerm: string,
    reasoning: string[],
    insights: Insight[]
  ): void {
    reasoning.push(
      `Logical analysis of ${primaryTerm} identifies potential flaws and errors in reasoning`
    );
    for (const flaw of flaws) {
      if (flaw.content.toLowerCase().includes("circular")) {
        reasoning.push(
          `Circular reasoning detected in ${primaryTerm} - argument repeats itself without adding substance`
        );
      }
    }
    if (flaws.length > 0) {
      insights.push(...flaws);
    }
  }

  private addCounterArgumentReasoning(
    counterArguments: Insight[],
    primaryTerm: string,
    reasoning: string[],
    insights: Insight[]
  ): void {
    if (counterArguments.length > 0) {
      reasoning.push(
        `Devil's advocate on ${primaryTerm}: ${counterArguments[0].content.substring(0, 80)}...`
      );
      reasoning.push(
        `Counter-argument: alternative approaches to ${primaryTerm} may be more effective`
      );
      reasoning.push(
        `Constructive criticism: ${primaryTerm} could improve by addressing root causes`
      );
      insights.push(...counterArguments);
    }
  }

  private analyzeConstraints(
    problem: Problem,
    keyTerms: KeyTerms,
    primaryTerm: string,
    reasoning: string[],
    insights: Insight[]
  ): void {
    if (problem.constraints && problem.constraints.length > 0) {
      reasoning.push(
        `Constraints on ${primaryTerm}: ${problem.constraints.join(", ")} - these may be more limiting than acknowledged`
      );
      reasoning.push(
        `Challenging conventional wisdom about ${primaryTerm}: the standard approach may not be optimal`
      );
      const constraintContent = `Constraints on ${primaryTerm} (${problem.constraints.join(", ")}) may significantly limit feasibility`;
      insights.push({
        content: constraintContent,
        source: StreamType.CRITICAL,
        confidence: 0.75,
        importance: 0.8,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(constraintContent, keyTerms),
      });
    }
  }

  /**
   * Identify weaknesses in the proposal with term reference tracking
   *
   * @param problem - Problem to analyze
   * @param keyTerms - Extracted key terms for problem-specific weaknesses
   * @returns Array of weakness insights with referenced terms tracked
   */
  private identifyWeaknesses(problem: Problem, keyTerms: KeyTerms): Insight[] {
    const weaknesses: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the proposal";
    const domainTerm = keyTerms.domainTerms[0] ?? "";

    this.checkVagueDescription(problem, primaryTerm, domainTerm, keyTerms, weaknesses);
    this.checkMissingContext(problem, primaryTerm, domainTerm, keyTerms, weaknesses);
    this.checkOptimisticClaims(problem, primaryTerm, domainTerm, keyTerms, weaknesses);
    this.checkImplementationChallenges(problem, primaryTerm, domainTerm, keyTerms, weaknesses);
    this.checkUrgencyRisks(problem, primaryTerm, domainTerm, keyTerms, weaknesses);

    return weaknesses;
  }

  private checkVagueDescription(
    problem: Problem,
    primaryTerm: string,
    domainTerm: string,
    keyTerms: KeyTerms,
    weaknesses: Insight[]
  ): void {
    if (problem.description.length < 30) {
      const content = `${primaryTerm} description is too vague - lacks specific ${domainTerm !== "" ? domainTerm : "details"} needed for proper evaluation`;
      weaknesses.push(this.createWeaknessInsight(content, 0.85, 0.8, keyTerms));
    }
  }

  private checkMissingContext(
    problem: Problem,
    primaryTerm: string,
    domainTerm: string,
    keyTerms: KeyTerms,
    weaknesses: Insight[]
  ): void {
    if (!problem.context || problem.context.length < 50) {
      const content = `Insufficient context for ${primaryTerm} - missing critical ${domainTerm !== "" ? domainTerm : "information"} for thorough analysis`;
      weaknesses.push(this.createWeaknessInsight(content, 0.9, 0.85, keyTerms));
    }
  }

  private checkOptimisticClaims(
    problem: Problem,
    primaryTerm: string,
    domainTerm: string,
    keyTerms: KeyTerms,
    weaknesses: Insight[]
  ): void {
    const hasOptimisticClaims = /\d+%/.test(problem.context ?? "");
    if (hasOptimisticClaims) {
      const content = `Quantitative projections for ${primaryTerm} may be overly optimistic - need validation with ${domainTerm !== "" ? domainTerm : "supporting"} data`;
      weaknesses.push(this.createWeaknessInsight(content, 0.75, 0.8, keyTerms));
    }
  }

  private checkImplementationChallenges(
    problem: Problem,
    primaryTerm: string,
    domainTerm: string,
    keyTerms: KeyTerms,
    weaknesses: Insight[]
  ): void {
    const isComplex =
      problem.complexity === "complex" || (problem.constraints && problem.constraints.length > 2);
    if (isComplex) {
      const content = `${primaryTerm} implementation complexity is high - ${domainTerm !== "" ? domainTerm : "resource"} requirements not fully addressed`;
      weaknesses.push(this.createWeaknessInsight(content, 0.8, 0.75, keyTerms));
    }
  }

  private checkUrgencyRisks(
    problem: Problem,
    primaryTerm: string,
    domainTerm: string,
    keyTerms: KeyTerms,
    weaknesses: Insight[]
  ): void {
    if (problem.urgency === "high") {
      const content = `High urgency for ${primaryTerm} increases risk of rushed ${domainTerm !== "" ? domainTerm : "decisions"} and inadequate testing`;
      weaknesses.push(this.createWeaknessInsight(content, 0.75, 0.8, keyTerms));
    }
  }

  private createWeaknessInsight(
    content: string,
    confidence: number,
    importance: number,
    keyTerms: KeyTerms
  ): Insight {
    return {
      content,
      source: StreamType.CRITICAL,
      confidence,
      importance,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
    };
  }

  /**
   * Challenge assumptions in the proposal with term reference tracking
   *
   * @param problem - Problem to analyze
   * @param keyTerms - Extracted key terms for problem-specific assumption challenges
   * @returns Array of assumption-challenging insights with referenced terms tracked
   */
  private challengeAssumptions(problem: Problem, keyTerms: KeyTerms): Insight[] {
    const assumptions: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the proposal";
    const domainTerm = keyTerms.domainTerms[0] ?? "";
    const context = problem.context ?? "";

    this.challengeOptimisticProjections(context, primaryTerm, domainTerm, keyTerms, assumptions);
    this.challengeUserBehavior(context, primaryTerm, keyTerms, assumptions);
    this.challengeTimeline(problem, primaryTerm, domainTerm, keyTerms, assumptions);
    this.challengeResources(problem, primaryTerm, domainTerm, keyTerms, assumptions);

    // General assumption challenge with specific terms
    const generalContent = `Implicit assumption that current ${primaryTerm} approach is optimal - alternative ${domainTerm !== "" ? domainTerm : "strategies"} may be more effective`;
    assumptions.push(this.createWeaknessInsight(generalContent, 0.65, 0.7, keyTerms));

    return assumptions;
  }

  private challengeOptimisticProjections(
    context: string,
    primaryTerm: string,
    domainTerm: string,
    keyTerms: KeyTerms,
    assumptions: Insight[]
  ): void {
    if (context.includes("%") || context.toLowerCase().includes("increase")) {
      const content = `Assumption that ${primaryTerm} will achieve stated ${domainTerm !== "" ? domainTerm : "metrics"} is unproven - what if actual impact is much lower?`;
      assumptions.push(this.createWeaknessInsight(content, 0.8, 0.85, keyTerms));
    }
  }

  private challengeUserBehavior(
    context: string,
    primaryTerm: string,
    keyTerms: KeyTerms,
    assumptions: Insight[]
  ): void {
    const lowerContext = context.toLowerCase();
    if (lowerContext.includes("user") || lowerContext.includes("engagement")) {
      const content = `${primaryTerm} assumes users will respond positively - but user behavior is unpredictable`;
      assumptions.push(this.createWeaknessInsight(content, 0.75, 0.8, keyTerms));
    }
  }

  private challengeTimeline(
    problem: Problem,
    primaryTerm: string,
    domainTerm: string,
    keyTerms: KeyTerms,
    assumptions: Insight[]
  ): void {
    const hasTimelineConstraint = problem.constraints?.some(
      (c) => c.toLowerCase().includes("month") || c.toLowerCase().includes("timeline")
    );
    if (hasTimelineConstraint) {
      const content = `Timeline assumptions for ${primaryTerm} may be unrealistic - hidden ${domainTerm !== "" ? domainTerm : "complexities"} often emerge`;
      assumptions.push(this.createWeaknessInsight(content, 0.7, 0.75, keyTerms));
    }
  }

  private challengeResources(
    problem: Problem,
    primaryTerm: string,
    domainTerm: string,
    keyTerms: KeyTerms,
    assumptions: Insight[]
  ): void {
    const hasBudgetConstraint = problem.constraints?.some(
      (c) => c.includes("$") || c.toLowerCase().includes("budget")
    );
    if (hasBudgetConstraint) {
      const content = `Budget assumptions for ${primaryTerm} may not account for unforeseen ${domainTerm !== "" ? domainTerm : "costs"} and scope creep`;
      assumptions.push(this.createWeaknessInsight(content, 0.75, 0.7, keyTerms));
    }
  }

  /**
   * Assess risks in the proposal with term reference tracking
   *
   * @param problem - Problem to analyze
   * @param keyTerms - Extracted key terms for problem-specific risk assessment
   * @returns Array of risk insights with referenced terms tracked
   */
  private assessRisks(problem: Problem, keyTerms: KeyTerms): Insight[] {
    const risks: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the proposal";
    const domainTerm = keyTerms.domainTerms[0] ?? "";
    const context = problem.context ?? "";

    // Always add unintended consequences risk
    this.addUnintendedConsequencesRisk(risks, primaryTerm, domainTerm, keyTerms);

    // Add conditional risks based on problem characteristics
    this.addUserAlienationRisk(risks, problem, primaryTerm, context, keyTerms);
    this.addImplementationFailureRisk(risks, problem, primaryTerm, keyTerms);
    this.addResourceOverrunRisk(risks, problem, primaryTerm, keyTerms);
    this.addCompetitiveResponseRisk(risks, primaryTerm, domainTerm, context, keyTerms);
    this.addTechnicalDebtRisk(risks, problem, primaryTerm, keyTerms);

    return risks;
  }

  /**
   * Add unintended consequences risk (always included)
   */
  private addUnintendedConsequencesRisk(
    risks: Insight[],
    primaryTerm: string,
    domainTerm: string,
    keyTerms: KeyTerms
  ): void {
    const content = `Risk of unintended consequences (likelihood: 60-70%): ${primaryTerm} changes may trigger ${domainTerm !== "" ? domainTerm : "cascading"} side effects. Mitigation: implement feature flags for gradual rollout and establish rollback procedures`;
    risks.push({
      content,
      source: StreamType.CRITICAL,
      confidence: 0.75,
      importance: 0.85,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
    });
  }

  /**
   * Add user alienation risk if user-related context exists
   */
  private addUserAlienationRisk(
    risks: Insight[],
    problem: Problem,
    primaryTerm: string,
    context: string,
    keyTerms: KeyTerms
  ): void {
    const hasUserConstraint = problem.constraints?.some((c) => c.toLowerCase().includes("user"));
    if (hasUserConstraint || context.toLowerCase().includes("user")) {
      const content = `User alienation risk (likelihood: 40-50%): Changes to ${primaryTerm} may disrupt existing workflows. Mitigation: conduct user research before implementation, provide migration path, and maintain backward compatibility for 2-3 release cycles`;
      risks.push({
        content,
        source: StreamType.CRITICAL,
        confidence: 0.8,
        importance: 0.9,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }
  }

  /**
   * Add implementation failure risk for complex or urgent problems
   */
  private addImplementationFailureRisk(
    risks: Insight[],
    problem: Problem,
    primaryTerm: string,
    keyTerms: KeyTerms
  ): void {
    if (problem.complexity === "complex" || problem.urgency === "high") {
      const content = `Implementation failure risk (likelihood: 30-40%): ${primaryTerm} complexity combined with time pressure increases error probability. Mitigation: define clear success criteria, implement automated testing (target 80%+ coverage), and schedule regular checkpoint reviews`;
      risks.push({
        content,
        source: StreamType.CRITICAL,
        confidence: 0.7,
        importance: 0.85,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }
  }

  /**
   * Add resource overrun risk if constraints exist
   */
  private addResourceOverrunRisk(
    risks: Insight[],
    problem: Problem,
    primaryTerm: string,
    keyTerms: KeyTerms
  ): void {
    if (problem.constraints && problem.constraints.length > 0) {
      const content = `Resource overrun risk (likelihood: 50-60%): ${primaryTerm} may exceed ${problem.constraints[0]} by 20-50% based on typical project variance. Mitigation: build 25% buffer into estimates, track burn rate weekly, and identify scope reduction options early`;
      risks.push({
        content,
        source: StreamType.CRITICAL,
        confidence: 0.75,
        importance: 0.75,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }
  }

  /**
   * Add competitive response risk for market-related contexts
   */
  private addCompetitiveResponseRisk(
    risks: Insight[],
    primaryTerm: string,
    domainTerm: string,
    context: string,
    keyTerms: KeyTerms
  ): void {
    const lowerContext = context.toLowerCase();
    const hasCompetitiveContext =
      lowerContext.includes("engagement") ||
      lowerContext.includes("market") ||
      lowerContext.includes("competitive");

    if (hasCompetitiveContext) {
      const content = `Competitive response risk (likelihood: 70-80%): Competitors may respond to ${primaryTerm} within 3-6 months with similar or superior ${domainTerm !== "" ? domainTerm : "solutions"}. Mitigation: focus on defensible differentiators, accelerate time-to-market, and plan follow-up innovations`;
      risks.push({
        content,
        source: StreamType.CRITICAL,
        confidence: 0.65,
        importance: 0.7,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }
  }

  /**
   * Add technical debt risk for high urgency problems
   */
  private addTechnicalDebtRisk(
    risks: Insight[],
    problem: Problem,
    primaryTerm: string,
    keyTerms: KeyTerms
  ): void {
    if (problem.urgency === "high") {
      const content = `Technical debt risk (likelihood: 80-90%): Rushing ${primaryTerm} will likely introduce shortcuts that cost 2-3x more to fix later. Mitigation: document all known shortcuts, schedule debt repayment sprints, and establish code quality gates`;
      risks.push({
        content,
        source: StreamType.CRITICAL,
        confidence: 0.8,
        importance: 0.75,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }
  }

  /**
   * Detect logical flaws with term reference tracking
   *
   * @param problem - Problem to analyze
   * @param keyTerms - Extracted key terms for problem-specific flaw detection
   * @returns Array of flaw insights with referenced terms tracked
   */
  private detectFlaws(problem: Problem, keyTerms: KeyTerms): Insight[] {
    const flaws: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the argument";

    // Check for circular reasoning
    const words = problem.context.toLowerCase().split(/\s+/);
    const wordSet = new Set(words);
    const hasRepetition = words.length > 0 && wordSet.size < words.length * 0.7;

    // Check for "because" circular patterns (A because A)
    const becausePattern = /(\w+).*because.*\1/i;
    const hasCircularBecause = becausePattern.test(problem.context);

    if (hasRepetition || hasCircularBecause) {
      const content = `Circular reasoning in ${primaryTerm} - argument repeats itself without adding substance`;
      flaws.push({
        content,
        source: StreamType.CRITICAL,
        confidence: 0.7,
        importance: 0.75,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }

    // Check for false dichotomy
    if (
      problem.context.toLowerCase().includes("either") ||
      problem.context.toLowerCase().includes("must")
    ) {
      const content = `False dichotomy in ${primaryTerm}: framing suggests only two options when other alternatives may exist`;
      flaws.push({
        content,
        source: StreamType.CRITICAL,
        confidence: 0.75,
        importance: 0.8,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }

    // Check for correlation vs causation
    if (
      problem.context.toLowerCase().includes("so ") ||
      problem.context.toLowerCase().includes("therefore")
    ) {
      const content = `Potential correlation/causation confusion in ${primaryTerm} - relationship doesn't imply causation`;
      flaws.push({
        content,
        source: StreamType.CRITICAL,
        confidence: 0.7,
        importance: 0.75,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }

    // Check for overgeneralization
    if (
      problem.context.toLowerCase().includes("all ") ||
      problem.context.toLowerCase().includes("always") ||
      problem.context.toLowerCase().includes("never")
    ) {
      const content = `Overgeneralization in ${primaryTerm} - sweeping claims rarely hold in all cases`;
      flaws.push({
        content,
        source: StreamType.CRITICAL,
        confidence: 0.8,
        importance: 0.75,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }

    // If no specific flaws detected, add general flaw concern
    if (flaws.length === 0) {
      const content = `Logical structure of ${primaryTerm} requires scrutiny - potential flaws in reasoning chain`;
      flaws.push({
        content,
        source: StreamType.CRITICAL,
        confidence: 0.65,
        importance: 0.7,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      });
    }

    return flaws;
  }

  /**
   * Generate counter-arguments with term reference tracking
   *
   * @param problem - Problem to analyze
   * @param keyTerms - Extracted key terms for problem-specific counter-arguments
   * @returns Array of counter-argument insights with referenced terms tracked
   */
  private generateCounterArguments(problem: Problem, keyTerms: KeyTerms): Insight[] {
    const counterArguments: Insight[] = [];
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the solution";
    const domainTerm = keyTerms.domainTerms[0] ?? "";
    const context = problem.context ?? "";

    // Devil's advocate: argue against the proposal with specific reasoning
    const devilContent = `Devil's advocate: What if ${primaryTerm} makes ${domainTerm !== "" ? domainTerm : "things"} worse? Consider: (1) increased complexity may slow down future changes, (2) learning curve may temporarily reduce productivity, (3) opportunity cost of not pursuing alternatives`;
    counterArguments.push({
      content: devilContent,
      source: StreamType.CRITICAL,
      confidence: 0.65,
      importance: 0.8,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(devilContent, keyTerms),
    });

    // Alternative perspective with specific alternatives
    let altContent: string;
    if (context.toLowerCase().includes("performance") || context.toLowerCase().includes("slow")) {
      altContent = `Alternative perspective on ${primaryTerm}: Instead of optimizing the current approach, consider whether the underlying architecture is fundamentally misaligned with requirements. A complete redesign might be more cost-effective long-term`;
    } else if (
      context.toLowerCase().includes("user") ||
      context.toLowerCase().includes("engagement")
    ) {
      altContent = `Alternative perspective on ${primaryTerm}: Rather than adding features, consider removing friction points. User research shows that simplification often outperforms feature additions for engagement metrics`;
    } else {
      altContent = `Alternative perspective on ${primaryTerm}: Consider addressing root causes rather than symptoms. The proposed solution may provide temporary relief while the underlying issue continues to grow`;
    }
    counterArguments.push({
      content: altContent,
      source: StreamType.CRITICAL,
      confidence: 0.7,
      importance: 0.75,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(altContent, keyTerms),
    });

    // Challenge from different angle with specific questions
    if (problem.goals && problem.goals.length > 0) {
      const goalContent = `Counter-argument: Is "${problem.goals[0]}" the right objective for ${primaryTerm}? Consider: (1) Are we measuring the right metrics? (2) Does this goal align with long-term strategy? (3) What would success look like if we chose a different goal?`;
      counterArguments.push({
        content: goalContent,
        source: StreamType.CRITICAL,
        confidence: 0.65,
        importance: 0.7,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(goalContent, keyTerms),
      });
    }

    // Constructive criticism with specific recommendations
    const constructiveContent = `Constructive criticism: ${primaryTerm} has merit but needs refinement. Recommended validation approach: (1) Run a 2-week pilot with 5-10% of users, (2) Define success metrics upfront (e.g., 20% improvement threshold), (3) Establish kill criteria to avoid sunk cost fallacy`;
    counterArguments.push({
      content: constructiveContent,
      source: StreamType.CRITICAL,
      confidence: 0.75,
      importance: 0.8,
      referencedTerms: this.keyTermExtractor.findReferencedTerms(constructiveContent, keyTerms),
    });

    return counterArguments;
  }

  /**
   * Evaluate evidence quality with term reference tracking
   *
   * @param problem - Problem with context
   * @param keyTerms - Extracted key terms for problem-specific evidence evaluation
   * @returns Evidence assessment with referenced terms tracked
   */
  private evaluateEvidence(
    problem: Problem,
    keyTerms: KeyTerms
  ): {
    reasoning: string;
    insight?: Insight;
  } {
    let reasoning = "";
    let insight: Insight | undefined;
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the proposal";
    const domainTerm = keyTerms.domainTerms[0] ?? "";

    // Check for quantitative data
    const hasNumbers = /\d+%|\d+\.\d+|\d+ (users|customers|percent)/.test(problem.context);
    if (hasNumbers) {
      reasoning = `Evidence for ${primaryTerm} includes quantitative claims but lacks supporting ${domainTerm !== "" ? domainTerm : "data"} sources`;
      const content = `Quantitative claims about ${primaryTerm} lack supporting evidence - ${domainTerm !== "" ? domainTerm : "data"} sources must be verified`;
      insight = {
        content,
        source: StreamType.CRITICAL,
        confidence: 0.8,
        importance: 0.85,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      };
    } else {
      reasoning = `Evidence for ${primaryTerm} is primarily qualitative - need quantitative ${domainTerm !== "" ? domainTerm : "data"} to support claims`;
      const content = `Lack of quantitative evidence for ${primaryTerm} weakens the case - need measurable ${domainTerm !== "" ? domainTerm : "data"}`;
      insight = {
        content,
        source: StreamType.CRITICAL,
        confidence: 0.75,
        importance: 0.8,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(content, keyTerms),
      };
    }

    // Check for bias in evidence
    if (
      problem.context.toLowerCase().includes("will") ||
      problem.context.toLowerCase().includes("shows")
    ) {
      reasoning += `. Potential confirmation bias in ${primaryTerm} evidence selection`;
      if (insight) {
        insight.content += `. Evidence for ${primaryTerm} may be cherry-picked`;
        // Update referenced terms after content modification
        insight.referencedTerms = this.keyTermExtractor.findReferencedTerms(
          insight.content,
          keyTerms
        );
      }
    }

    return { reasoning, insight };
  }

  /**
   * Generate conclusion from critical analysis with validated term references
   *
   * @param problem - Original problem
   * @param insights - Generated insights
   * @param keyTerms - Extracted key terms for problem-specific conclusion
   * @returns Conclusion statement with guaranteed key term reference
   */
  private generateConclusion(problem: Problem, insights: Insight[], keyTerms: KeyTerms): string {
    const parts: string[] = [];
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the proposal";

    // Count high-importance concerns
    const criticalConcerns = insights.filter((i) => i.importance > 0.8).length;

    if (criticalConcerns > 2) {
      parts.push(
        `${criticalConcerns} critical concerns about ${primaryTerm} require immediate attention`
      );
    } else if (insights.length > 3) {
      parts.push(`several significant issues with ${primaryTerm} require careful consideration`);
    } else {
      parts.push(`some concerns about ${primaryTerm} identified but it has potential`);
    }

    // Address the proposal
    if (problem.goals && problem.goals.length > 0) {
      parts.push(`before proceeding with ${problem.goals[0].toLowerCase()}`);
    }

    // Recommend action with specific terms
    if (criticalConcerns > 2) {
      parts.push(`- recommend substantial revision of ${primaryTerm} or alternative approach`);
    } else {
      parts.push(
        `- recommend addressing ${primaryTerm} concerns through pilot testing and iterative refinement`
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
