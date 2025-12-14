/**
 * Problem Classifier
 *
 * Analyzes problems across four dimensions to enable dynamic framework selection:
 * - Complexity (simple/moderate/complex)
 * - Uncertainty (low/medium/high)
 * - Stakes (routine/important/critical)
 * - Time Pressure (none/moderate/high)
 *
 * Uses fast heuristic-based algorithms to complete classification in <1-2 seconds.
 */

import type {
  ComplexityLevel,
  Problem,
  ProblemCharacteristics,
  ProblemClassification,
  StakesLevel,
  TimePressureLevel,
  UncertaintyLevel,
} from "./types.js";

/**
 * Problem classifier for dynamic framework selection
 *
 * Performs multi-dimensional analysis of problems to determine
 * appropriate reasoning approaches and systematic thinking frameworks.
 */
export class ProblemClassifier {
  private cache: Map<string, ProblemClassification>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Classify a problem across all four dimensions
   *
   * @param problem - Problem to classify
   * @returns Complete classification with confidence and reasoning
   * @throws Error if problem is null/undefined or missing required fields
   */
  classifyProblem(problem: Problem): ProblemClassification {
    // Validation
    if (!problem) {
      throw new Error("Problem cannot be null or undefined");
    }
    if (!problem.id || !problem.description) {
      throw new Error("Problem must have id and description");
    }

    // Check cache
    const cacheKey = this.getCacheKey(problem);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Extract characteristics
    const characteristics = this.extractCharacteristics(problem);

    // Assess each dimension
    const complexity = this.assessComplexity(problem, characteristics);
    const uncertainty = this.assessUncertainty(problem, characteristics);
    const stakes = this.assessStakes(problem, characteristics);
    const timePressure = this.assessTimePressure(problem, characteristics);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(problem, characteristics, uncertainty);

    // Build classification
    const classification: ProblemClassification = {
      complexity: complexity.level,
      uncertainty: uncertainty.level,
      stakes: stakes.level,
      timePressure: timePressure.level,
      confidence,
      reasoning: {
        complexityReason: complexity.reason,
        uncertaintyReason: uncertainty.reason,
        stakesReason: stakes.reason,
        timePressureReason: timePressure.reason,
      },
      timestamp: new Date(),
    };

    // Cache result
    this.cache.set(cacheKey, classification);

    return classification;
  }

  /**
   * Extract problem characteristics for classification
   */
  private extractCharacteristics(problem: Problem): ProblemCharacteristics {
    const description = problem.description.toLowerCase();
    const context = (problem.context ?? "").toLowerCase();
    const combined = `${description} ${context}`;

    return {
      goalCount: problem.goals?.length ?? 0,
      constraintCount: problem.constraints?.length ?? 0,
      knownFactorCount: this.countKnownFactors(combined),
      unknownFactorCount: this.countUnknownFactors(combined),
      stakeholderCount: this.countStakeholders(combined),
      hasDeadline: this.hasDeadline(problem, combined),
      daysUntilDeadline: this.calculateDaysUntilDeadline(problem),
      importanceIndicators: this.findImportanceIndicators(combined),
      complexityIndicators: this.findComplexityIndicators(combined),
      uncertaintyIndicators: this.findUncertaintyIndicators(combined),
    };
  }

  /**
   * Assess problem complexity
   */
  private assessComplexity(
    problem: Problem,
    characteristics: ProblemCharacteristics
  ): { level: ComplexityLevel; reason: string } {
    // Use explicit complexity if provided
    if (problem.complexity) {
      return {
        level: problem.complexity,
        reason: `Explicit complexity level: ${problem.complexity}`,
      };
    }

    let score = 0;
    const reasons: string[] = [];

    // Goal count (0-3 points)
    if (characteristics.goalCount === 0 || characteristics.goalCount === 1) {
      score += 0;
      reasons.push("single or no clear goal");
    } else if (characteristics.goalCount <= 3) {
      score += 1.5;
      reasons.push("multiple goals");
    } else {
      score += 3;
      reasons.push("many interdependent goals");
    }

    // Constraint count (0-2 points)
    if (characteristics.constraintCount === 0) {
      score += 0;
    } else if (characteristics.constraintCount <= 2) {
      score += 1;
      reasons.push("some constraints");
    } else {
      score += 2;
      reasons.push("numerous constraints");
    }

    // Complexity indicators (0-2 points)
    if (characteristics.complexityIndicators.length > 0) {
      score += Math.min(2, characteristics.complexityIndicators.length * 0.5);
      reasons.push("complexity indicators present");
    }

    // Description length (0-1 point)
    if (problem.description.length > 200) {
      score += 1;
      reasons.push("detailed description");
    }

    // Determine level based o-8 scale)
    let level: ComplexityLevel;
    if (score <= 2) {
      level = "simple";
      reasons.unshift("Simple problem:");
    } else if (score <= 5) {
      level = "moderate";
      reasons.unshift("Moderate complexity:");
    } else {
      level = "complex";
      reasons.unshift("Complex problem:");
    }

    return {
      level,
      reason: reasons.join(", "),
    };
  }

  /**
   * Assess problem uncertainty
   */
  private assessUncertainty(
    problem: Problem,
    characteristics: ProblemCharacteristics
  ): { level: UncertaintyLevel; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // Unknown factors (0-3 points)
    if (characteristics.unknownFactorCount === 0) {
      score += 0;
      reasons.push("most factors known");
    } else if (characteristics.unknownFactorCount <= 2) {
      score += 1.5;
      reasons.push("some unknown factors");
    } else {
      score += 3;
      reasons.push("many unknowns");
    }

    // Known vs unknown ratio (0-2 points)
    const totalFactors = characteristics.knownFactorCount + characteristics.unknownFactorCount;
    if (totalFactors > 0) {
      const unknownRatio = characteristics.unknownFactorCount / totalFactors;
      if (unknownRatio > 0.5) {
        score += 2;
        reasons.push("more unknowns than knowns");
      } else if (unknownRatio > 0.25) {
        score += 1;
      }
    }

    // Uncertainty indicators (0-2 points)
    if (characteristics.uncertaintyIndicators.length > 0) {
      score += Math.min(2, characteristics.uncertaintyIndicators.length * 0.5);
      reasons.push("uncertainty indicators present");
    }

    // Vague description (0-1 point)
    if (problem.description.length < 50 || !problem.context || problem.context.length < 20) {
      score += 1;
      reasons.push("limited information");
    }

    // Determine level based on score (0-8 scale)
    let level: UncertaintyLevel;
    if (score <= 1.5) {
      level = "low";
      reasons.unshift("Low uncertainty:");
    } else if (score <= 4.5) {
      level = "medium";
      reasons.unshift("Medium uncertainty:");
    } else {
      level = "high";
      reasons.unshift("High uncertainty:");
    }

    return {
      level,
      reason: reasons.join(", "),
    };
  }

  /**
   * Assess problem stakes
   */
  private assessStakes(
    problem: Problem,
    characteristics: ProblemCharacteristics
  ): { level: StakesLevel; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // Importance indicators (0-3 points)
    const criticalIndicators = characteristics.importanceIndicators.filter(
      (ind) =>
        ind.includes("critical") ||
        ind.includes("security") ||
        ind.includes("vulnerability") ||
        ind.includes("outage") ||
        ind.includes("data at risk")
    );

    if (criticalIndicators.length > 0) {
      score += 3;
      reasons.push("high impact indicators");
    } else if (characteristics.importanceIndicators.length > 0) {
      score += 1.5;
      reasons.push("moderate impact indicators");
    } else {
      reasons.push("low impact");
    }

    // Stakeholder count (0-2 points)
    if (characteristics.stakeholderCount > 5) {
      score += 2;
      reasons.push("affects many people");
    } else if (characteristics.stakeholderCount > 2) {
      score += 1;
      reasons.push("affects several people");
    } else {
      reasons.push("affects few people");
    }

    // Reversibility (0-2 points)
    const description = problem.description.toLowerCase();
    const context = (problem.context ?? "").toLowerCase();
    const combined = `${description} ${context}`;

    if (
      combined.includes("irreversible") ||
      combined.includes("permanent") ||
      combined.includes("cannot undo")
    ) {
      score += 2;
      reasons.push("difficult to reverse");
    } else if (
      combined.includes("reversible") ||
      combined.includes("can undo") ||
      combined.includes("rollback")
    ) {
      score += 0;
      reasons.push("easily reversible");
    }

    // Determine level based on score (0-7 scale)
    let level: StakesLevel;
    if (score <= 1.5) {
      level = "routine";
      reasons.unshift("Routine stakes:");
    } else if (score <= 3.5) {
      level = "important";
      reasons.unshift("Important stakes:");
    } else {
      level = "critical";
      reasons.unshift("Critical stakes:");
    }

    return {
      level,
      reason: reasons.join(", "),
    };
  }

  /**
   * Assess time pressure
   */
  private assessTimePressure(
    problem: Problem,
    characteristics: ProblemCharacteristics
  ): { level: TimePressureLevel; reason: string } {
    // Use explicit urgency if provided
    if (problem.urgency) {
      return this.assessExplicitUrgency(problem.urgency);
    }

    let score = 0;
    const reasons: string[] = [];

    // Deadline presence and proximity (0-3 points)
    const deadlineScore = this.assessDeadlineProximity(characteristics, reasons);
    score += deadlineScore;

    // Urgency keywords (0-2 points)
    const urgencyScore = this.assessUrgencyKeywords(problem, reasons);
    score += urgencyScore;

    // Determine level based on score (0-5 scale)
    return this.determineTimePressureLevel(score, reasons);
  }

  /**
   * Assess explicit urgency level
   */
  private assessExplicitUrgency(urgency: string): { level: TimePressureLevel; reason: string } {
    const urgencyMap: Record<string, TimePressureLevel> = {
      low: "none",
      medium: "moderate",
      high: "high",
    };
    const level = urgencyMap[urgency] ?? "moderate";
    return {
      level,
      reason: `Explicit urgency level: ${urgency}`,
    };
  }

  /**
   * Assess deadline proximity
   */
  private assessDeadlineProximity(
    characteristics: ProblemCharacteristics,
    reasons: string[]
  ): number {
    if (!characteristics.hasDeadline) {
      reasons.push("no deadline");
      return 0;
    }

    const days = characteristics.daysUntilDeadline;
    if (days !== undefined && days <= 1) {
      reasons.push("urgent deadline");
      return 3;
    }
    if (days !== undefined && days <= 14) {
      reasons.push("reasonable deadline");
      return 1.5;
    }
    reasons.push("distant deadline");
    return 0.5;
  }

  /**
   * Assess urgency keywords
   */
  private assessUrgencyKeywords(problem: Problem, reasons: string[]): number {
    const description = problem.description.toLowerCase();
    const context = (problem.context ?? "").toLowerCase();
    const combined = `${description} ${context}`;

    // Check for negations first
    if (this.hasUrgencyNegation(combined)) {
      return 0;
    }

    const urgentKeywords = [
      "urgent",
      "immediate",
      "asap",
      "emergency",
      "critical",
      "now",
      "outage",
      "down",
    ];
    const urgentCount = urgentKeywords.filter((kw) => combined.includes(kw)).length;

    if (urgentCount > 0) {
      reasons.push("urgency indicators");
      return Math.min(2, urgentCount);
    }

    return 0;
  }

  /**
   * Check for urgency negation keywords
   */
  private hasUrgencyNegation(text: string): boolean {
    return (
      text.includes("no immediate") ||
      text.includes("no urgent") ||
      text.includes("not urgent") ||
      text.includes("not immediate") ||
      text.includes("long-term") ||
      text.includes("future")
    );
  }

  /**
   * Determine time pressure level from score
   */
  private determineTimePressureLevel(
    score: number,
    reasons: string[]
  ): { level: TimePressureLevel; reason: string } {
    let level: TimePressureLevel;
    if (score <= 1) {
      level = "none";
      reasons.unshift("No time pressure:");
    } else if (score <= 3) {
      level = "moderate";
      reasons.unshift("Moderate time pressure:");
    } else {
      level = "high";
      reasons.unshift("High time pressure:");
    }

    return {
      level,
      reason: reasons.join(", "),
    };
  }

  /**
   * Calculate overall classification confidence
   */
  private calculateConfidence(
    problem: Problem,
    characteristics: ProblemCharacteristics,
    uncertainty: { level: UncertaintyLevel; reason: string }
  ): number {
    let confidence = 0.5; // Base confidence

    // Information completeness (0-0.3)
    confidence += this.assessInformationCompleteness(problem);

    // Explicit indicators (0-0.2)
    confidence += this.assessExplicitIndicators(problem, characteristics);

    // Consistency check (-0.1 to 0)
    confidence += this.assessConsistency(uncertainty, characteristics);

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Assess information completeness
   */
  private assessInformationCompleteness(problem: Problem): number {
    const hasDescription = problem.description && problem.description.length > 20;
    const hasContext = problem.context && problem.context.length > 20;
    const hasGoals = (problem.goals?.length ?? 0) > 0;
    const hasConstraints = (problem.constraints?.length ?? 0) > 0;

    return (
      (hasDescription ? 0.1 : 0) +
      (hasContext ? 0.1 : 0) +
      (hasGoals ? 0.05 : 0) +
      (hasConstraints ? 0.05 : 0)
    );
  }

  /**
   * Assess explicit indicators
   */
  private assessExplicitIndicators(
    problem: Problem,
    characteristics: ProblemCharacteristics
  ): number {
    let score = 0;
    if (problem.complexity) score += 0.05;
    if (problem.urgency) score += 0.05;
    if (characteristics.importanceIndicators.length > 0) score += 0.05;
    if (characteristics.hasDeadline) score += 0.05;
    return score;
  }

  /**
   * Assess consistency of classification
   */
  private assessConsistency(
    uncertainty: { level: UncertaintyLevel; reason: string },
    characteristics: ProblemCharacteristics
  ): number {
    // Lower confidence if assessments seem inconsistent
    if (
      uncertainty.level === "high" &&
      characteristics.knownFactorCount === 0 &&
      characteristics.unknownFactorCount === 0
    ) {
      return -0.1; // Uncertainty assessment based on limited info
    }
    return 0;
  }

  /**
   * Generate cache key for problem
   */
  private getCacheKey(problem: Problem): string {
    // Simple hash based on key fields
    const key = `${problem.description}|${problem.context ?? ""}|${problem.goals?.join(",") ?? ""}|${problem.constraints?.join(",") ?? ""}`;
    return key;
  }

  /**
   * Count known factors in text
   */
  private countKnownFactors(text: string): number {
    const knownIndicators = [
      "we know",
      "known",
      "clear",
      "defined",
      "established",
      "confirmed",
      "certain",
    ];
    return knownIndicators.filter((ind) => text.includes(ind)).length;
  }

  /**
   * Count unknown factors in text
   */
  private countUnknownFactors(text: string): number {
    const unknownIndicators = [
      "unknown",
      "unclear",
      "uncertain",
      "unsure",
      "don't know",
      "not sure",
      "unclear",
      "ambiguous",
      "vague",
    ];
    return unknownIndicators.filter((ind) => text.includes(ind)).length;
  }

  /**
   * Count stakeholders mentioned
   */
  private countStakeholders(text: string): number {
    const stakeholderIndicators = [
      "user",
      "customer",
      "client",
      "team",
      "department",
      "stakeholder",
      "people",
      "everyone",
      "all",
    ];
    return stakeholderIndicators.filter((ind) => text.includes(ind)).length;
  }

  /**
   * Check if problem has deadline
   */
  private hasDeadline(_problem: Problem, text: string): boolean {
    // Check for negations first
    if (
      text.includes("no deadline") ||
      text.includes("no immediate deadline") ||
      text.includes("no specific deadline")
    ) {
      return false;
    }

    const deadlineKeywords = [
      "deadline",
      "due",
      "by",
      "within",
      "before",
      "until",
      "asap",
      "urgent",
    ];
    return deadlineKeywords.some((kw) => text.includes(kw));
  }

  /**
   * Calculate days until deadline
   */
  private calculateDaysUntilDeadline(problem: Problem): number | undefined {
    // Simple heuristic based on urgency keywords
    const description = problem.description.toLowerCase();
    const context = (problem.context ?? "").toLowerCase();
    const combined = `${description} ${context}`;

    if (
      combined.includes("immediate") ||
      combined.includes("now") ||
      combined.includes("asap") ||
      combined.includes("outage")
    ) {
      return 0;
    }

    if (
      combined.includes("today") ||
      combined.includes("within 24 hours") ||
      combined.includes("within 1 hour")
    ) {
      return 1;
    }

    if (combined.includes("week") || combined.includes("7 days")) {
      return 7;
    }

    if (combined.includes("2 weeks") || combined.includes("14 days")) {
      return 14;
    }

    if (combined.includes("month") || combined.includes("30 days")) {
      return 30;
    }

    return undefined;
  }

  /**
   * Find importance indicators in text
   */
  private findImportanceIndicators(text: string): string[] {
    const indicators = [
      "critical",
      "important",
      "essential",
      "vital",
      "crucial",
      "security",
      "vulnerability",
      "outage",
      "data at risk",
      "compliance",
      "regulatory",
      "legal",
    ];
    return indicators.filter((ind) => text.includes(ind));
  }

  /**
   * Find complexity indicators in text
   */
  private findComplexityIndicators(text: string): string[] {
    const indicators = [
      "complex",
      "complicated",
      "intricate",
      "interdependent",
      "distributed",
      "microservices",
      "architecture",
      "system",
      "integration",
      "multiple",
    ];
    return indicators.filter((ind) => text.includes(ind));
  }

  /**
   * Find uncertainty indicators in text
   */
  private findUncertaintyIndicators(text: string): string[] {
    const indicators = [
      "uncertain",
      "unclear",
      "unknown",
      "ambiguous",
      "vague",
      "unpredictable",
      "investigate",
      "explore",
      "research",
    ];
    return indicators.filter((ind) => text.includes(ind));
  }
}
