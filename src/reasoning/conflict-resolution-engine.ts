/**
 * Conflict Resolution Engine
 *
 * Detects and resolves conflicts between parallel reasoning streams.
 * Identifies contradictions, classifies conflict types, assesses severity,
 * and generates resolution frameworks.
 */

import {
  ConflictSeverity,
  ConflictType,
  type Conflict,
  type ConflictEvidence,
  type ConflictPattern,
  type ResolutionFramework,
  type StreamResult,
} from "./types";

/**
 * Engine for detecting and resolving conflicts between reasoning streams
 *
 * Provides comprehensive conflict detection across five conflict types:
 * - Factual: Contradictory facts or data
 * - Logical: Logical inconsistencies in reasoning
 * - Methodological: Different approaches or methods
 * - Evaluative: Different value judgments or priorities
 * - Predictive: Different predictions or forecasts
 */
export class ConflictResolutionEngine {
  private conflictPatterns: Map<string, ConflictPattern> = new Map();

  /**
   * Detect conflicts between reasoning stream results
   *
   * Analyzes all pairs of stream results to identify contradictions,
   * inconsistencies, and disagreements.
   *
   * @param results - Array of stream results to analyze
   * @returns Array of detected conflicts
   */
  detectConflicts(results: StreamResult[]): Conflict[] {
    // Handle edge cases
    if (!results || results.length === 0) {
      return [];
    }

    if (results.length === 1) {
      return [];
    }

    const conflicts: Conflict[] = [];

    // Compare all pairs of results
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const result1 = results[i];
        const result2 = results[j];

        // Skip malformed results
        if (!result1 || !result2 || !result1.streamId || !result2.streamId) {
          continue;
        }

        // Check for conflicts between this pair
        const conflict = this.detectConflictBetweenPair(result1, result2);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect conflict between a pair of stream results
   */
  private detectConflictBetweenPair(result1: StreamResult, result2: StreamResult): Conflict | null {
    // Check if conclusions are similar (no conflict)
    if (this.areConclusionsSimilar(result1.conclusion, result2.conclusion)) {
      return null;
    }

    // Classify the type of conflict
    const conflictType = this.classifyConflict(result1, result2);

    // Create conflict evidence
    const evidence: ConflictEvidence[] = [
      {
        streamId: result1.streamId,
        streamType: result1.streamType,
        claim: result1.conclusion,
        reasoning: result1.reasoning.join("; "),
        confidence: result1.confidence,
      },
      {
        streamId: result2.streamId,
        streamType: result2.streamType,
        claim: result2.conclusion,
        reasoning: result2.reasoning.join("; "),
        confidence: result2.confidence,
      },
    ];

    // Create conflict object
    const conflict: Conflict = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: conflictType,
      severity: ConflictSeverity.MEDIUM, // Will be assessed properly
      sourceStreams: [result1.streamId, result2.streamId],
      description: `${conflictType} conflict between ${result1.streamType} and ${result2.streamType}`,
      evidence,
      detectedAt: new Date(),
    };

    // Assess severity
    conflict.severity = this.assessSeverity(conflict);

    // Generate resolution framework
    conflict.resolutionFramework = this.generateResolutionFramework(conflict);

    return conflict;
  }

  /**
   * Check if two conclusions are similar (no conflict)
   */
  private areConclusionsSimilar(conclusion1: string, conclusion2: string): boolean {
    const norm1 = conclusion1.toLowerCase().trim();
    const norm2 = conclusion2.toLowerCase().trim();

    if (norm1 === norm2) {
      return true;
    }

    if (this.haveDifferentNumbers(norm1, norm2)) {
      return false;
    }

    if (this.haveDifferentSolutions(norm1, norm2)) {
      return false;
    }

    if (this.haveContradictoryTerms(norm1, norm2)) {
      return false;
    }

    return this.calculateWordSimilarity(norm1, norm2) > 0.75;
  }

  /**
   * Check if conclusions have different numbers
   */
  private haveDifferentNumbers(norm1: string, norm2: string): boolean {
    const numbers1: string[] = norm1.match(/\d+/g) ?? [];
    const numbers2: string[] = norm2.match(/\d+/g) ?? [];

    if (numbers1.length > 0 && numbers2.length > 0) {
      return numbers1.some((n1) => !numbers2.includes(n1));
    }

    return false;
  }

  /**
   * Check if conclusions reference different solutions
   */
  private haveDifferentSolutions(norm1: string, norm2: string): boolean {
    const solutionPattern = /solution\s+([a-z])/gi;
    const match1 = norm1.match(solutionPattern);
    const match2 = norm2.match(solutionPattern);
    return !!(match1 && match2 && match1[0] !== match2[0]);
  }

  /**
   * Check if conclusions have contradictory terms
   */
  private haveContradictoryTerms(norm1: string, norm2: string): boolean {
    const contradictoryPairs = [
      ["security", "usability"],
      ["quantitative", "qualitative"],
      ["grow", "decline"],
      ["increase", "decrease"],
      ["safe", "unsafe"],
      ["optimal", "suboptimal"],
    ];

    for (const [word1, word2] of contradictoryPairs) {
      if (
        (norm1.includes(word1) && norm2.includes(word2)) ||
        (norm1.includes(word2) && norm2.includes(word1))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate word overlap similarity between two normalized strings
   */
  private calculateWordSimilarity(norm1: string, norm2: string): number {
    const words1 = new Set(norm1.split(/\s+/).filter((w) => w.length > 2));
    const words2 = new Set(norm2.split(/\s+/).filter((w) => w.length > 2));

    if (words1.size === 0 || words2.size === 0) {
      return 0;
    }

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Classify the type of conflict between two stream results
   *
   * @param result1 - First stream result
   * @param result2 - Second stream result
   * @returns Conflict type classification
   */
  classifyConflict(result1: StreamResult, result2: StreamResult): ConflictType {
    const conclusion1 = result1.conclusion.toLowerCase();
    const conclusion2 = result2.conclusion.toLowerCase();

    // Check in order of specificity (most specific first)

    // Check for factual conflicts first (has strong indicators like "data shows")
    if (this.hasFactualConflict(conclusion1, conclusion2)) {
      return ConflictType.FACTUAL;
    }

    // Check for predictive conflicts (forecasts and predictions)
    if (this.hasPredictiveConflict(conclusion1, conclusion2)) {
      return ConflictType.PREDICTIVE;
    }

    // Check for logical conflicts (logical inconsistencies)
    if (this.hasLogicalConflict(conclusion1, conclusion2)) {
      return ConflictType.LOGICAL;
    }

    // Check for evaluative conflicts (different priorities/values)
    if (this.hasEvaluativeConflict(conclusion1, conclusion2)) {
      return ConflictType.EVALUATIVE;
    }

    // Check for methodological conflicts (different approaches)
    if (this.hasMethodologicalConflict(conclusion1, conclusion2)) {
      return ConflictType.METHODOLOGICAL;
    }

    // Default to methodological if unclear
    return ConflictType.METHODOLOGICAL;
  }

  /**
   * Detect factual conflicts (contradictory facts or data)
   */
  private hasFactualConflict(conclusion1: string, conclusion2: string): boolean {
    const norm1 = conclusion1.toLowerCase();
    const norm2 = conclusion2.toLowerCase();

    const hasFact1 = this.hasFactualIndicators(norm1);
    const hasFact2 = this.hasFactualIndicators(norm2);

    if (hasFact1 || hasFact2) {
      return this.checkFactualConflictWithIndicators(norm1, norm2);
    }

    return this.checkFactualConflictWithoutIndicators(norm1, norm2);
  }

  /**
   * Check if text has factual indicators
   */
  private hasFactualIndicators(text: string): boolean {
    const factualIndicators = [
      "fact:",
      "data shows",
      "data reveals",
      "analysis reveals",
      "the data",
    ];
    return factualIndicators.some((ind) => text.includes(ind));
  }

  /**
   * Check factual conflict when factual indicators are present
   */
  private checkFactualConflictWithIndicators(norm1: string, norm2: string): boolean {
    const hasMethod1 = this.hasMethodologicalIndicators(norm1);
    const hasMethod2 = this.hasMethodologicalIndicators(norm2);

    if (hasMethod1 && hasMethod2) {
      return this.checkDataPointConflict(norm1, norm2);
    }

    return this.checkDataOrNumberConflict(norm1, norm2);
  }

  /**
   * Check if text has methodological indicators
   */
  private hasMethodologicalIndicators(text: string): boolean {
    const methodIndicators = ["method", "approach", "\\buse\\b"];
    return methodIndicators.some((ind) => new RegExp(ind, "i").test(text));
  }

  /**
   * Check for data point conflicts
   */
  private checkDataPointConflict(norm1: string, norm2: string): boolean {
    const dataPattern = /data shows ([a-z]+|\d+)/gi;
    const data1 = norm1.match(dataPattern);
    const data2 = norm2.match(dataPattern);

    return !!(data1 && data2 && data1[0] !== data2[0]);
  }

  /**
   * Check for data or number conflicts
   */
  private checkDataOrNumberConflict(norm1: string, norm2: string): boolean {
    if (this.checkDataPointConflict(norm1, norm2)) {
      return true;
    }

    if (this.haveConflictingNumbers(norm1, norm2)) {
      return true;
    }

    return true; // If one has factual indicators and they differ, it's factual
  }

  /**
   * Check factual conflict without factual indicators
   */
  private checkFactualConflictWithoutIndicators(norm1: string, norm2: string): boolean {
    const predictiveIndicators = ["will", "forecast", "predict", "expect"];
    const hasPred1 = predictiveIndicators.some((ind) => norm1.includes(ind));
    const hasPred2 = predictiveIndicators.some((ind) => norm2.includes(ind));

    if (hasPred1 || hasPred2) {
      return false;
    }

    return this.haveConflictingNumbers(norm1, norm2);
  }

  /**
   * Check if two texts have conflicting numbers
   */
  private haveConflictingNumbers(norm1: string, norm2: string): boolean {
    const numberPattern = /\d+/g;
    const numbers1 = norm1.match(numberPattern);
    const numbers2 = norm2.match(numberPattern);

    if (numbers1 && numbers2 && numbers1.length > 0 && numbers2.length > 0) {
      return numbers1[0] !== numbers2[0];
    }

    return false;
  }

  /**
   * Detect logical conflicts (logical inconsistencies)
   */
  private hasLogicalConflict(conclusion1: string, conclusion2: string): boolean {
    // Look for logical operators and contradictions
    const logicalIndicators = ["if", "then", "therefore", "implies", "but not", "however"];
    const hasLogic1 = logicalIndicators.some((ind) => conclusion1.includes(ind));
    const hasLogic2 = logicalIndicators.some((ind) => conclusion2.includes(ind));

    if (hasLogic1 && hasLogic2) {
      // Check for "but not" or "however" indicating contradiction
      if (conclusion1.includes("but") || conclusion2.includes("but")) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect methodological conflicts (different approaches)
   */
  private hasMethodologicalConflict(conclusion1: string, conclusion2: string): boolean {
    // Look for method-related keywords
    const methodIndicators = [
      "method",
      "approach",
      "use",
      "quantitative",
      "qualitative",
      "analysis",
      "technique",
    ];

    const hasMethod1 = methodIndicators.some((ind) => conclusion1.includes(ind));
    const hasMethod2 = methodIndicators.some((ind) => conclusion2.includes(ind));

    return hasMethod1 && hasMethod2;
  }

  /**
   * Detect evaluative conflicts (different value judgments)
   */
  private hasEvaluativeConflict(conclusion1: string, conclusion2: string): boolean {
    // Look for priority/value keywords
    const evaluativeIndicators = [
      "prioritize",
      "priority",
      "better",
      "best",
      "over",
      "important",
      "matters",
      "paramount",
    ];

    const hasEval1 = evaluativeIndicators.some((ind) => conclusion1.includes(ind));
    const hasEval2 = evaluativeIndicators.some((ind) => conclusion2.includes(ind));

    return hasEval1 && hasEval2;
  }

  /**
   * Detect predictive conflicts (different forecasts)
   */
  private hasPredictiveConflict(conclusion1: string, conclusion2: string): boolean {
    // Look for prediction keywords
    const predictiveIndicators = [
      "will",
      "forecast",
      "predict",
      "expect",
      "grow",
      "decline",
      "increase",
      "decrease",
    ];

    const hasPred1 = predictiveIndicators.some((ind) => conclusion1.includes(ind));
    const hasPred2 = predictiveIndicators.some((ind) => conclusion2.includes(ind));

    // Also check for percentage patterns
    const hasPercent1 = conclusion1.includes("%") || /\d+%/.test(conclusion1);
    const hasPercent2 = conclusion2.includes("%") || /\d+%/.test(conclusion2);

    return (hasPred1 && hasPred2) || (hasPercent1 && hasPercent2);
  }

  /**
   * Assess the severity of a conflict
   *
   * Evaluates conflict severity based on:
   * - Confidence levels of conflicting streams
   * - Type of conflict
   * - Evidence strength
   *
   * @param conflict - Conflict to assess
   * @returns Severity level
   */
  assessSeverity(conflict: Conflict): ConflictSeverity {
    // Handle missing evidence
    if (!conflict.evidence || conflict.evidence.length === 0) {
      return ConflictSeverity.LOW;
    }

    // Calculate average confidence of conflicting streams
    const avgConfidence =
      conflict.evidence.reduce((sum, e) => sum + e.confidence, 0) / conflict.evidence.length;

    // Calculate confidence difference
    const confidences = conflict.evidence.map((e) => e.confidence);
    const maxConfidence = Math.max(...confidences);
    const minConfidence = Math.min(...confidences);
    const confidenceDiff = maxConfidence - minConfidence;

    // Assess based on conflict type and confidence
    // CRITICAL: Both streams very confident (>=0.95) and similar confidence
    if (avgConfidence >= 0.95 && confidenceDiff < 0.05) {
      return ConflictSeverity.CRITICAL;
    }

    // HIGH: High confidence (>=0.85) with small difference, or logical conflicts with high confidence
    if (avgConfidence >= 0.85 && confidenceDiff < 0.1) {
      return ConflictSeverity.HIGH;
    }

    if (avgConfidence >= 0.9 && conflict.type === ConflictType.LOGICAL) {
      return ConflictSeverity.HIGH;
    }

    // Evaluative conflicts (value judgments) are inherently more severe when confidence is reasonable
    // because they represent fundamental disagreements about priorities
    if (avgConfidence >= 0.75 && conflict.type === ConflictType.EVALUATIVE) {
      return ConflictSeverity.HIGH;
    }

    // MEDIUM: Moderate to moderately-high confidence (0.7-0.85)
    if (avgConfidence >= 0.7 && avgConfidence < 0.85) {
      return ConflictSeverity.MEDIUM;
    }

    // LOW: Lower confidence (<0.7)
    return ConflictSeverity.LOW;
  }

  /**
   * Generate resolution framework for a conflict
   *
   * Creates structured guidance for resolving the conflict based on
   * its type and severity.
   *
   * @param conflict - Conflict to resolve
   * @returns Resolution framework
   */
  generateResolutionFramework(conflict: Conflict): ResolutionFramework {
    switch (conflict.type) {
      case ConflictType.FACTUAL:
        return this.generateFactualResolution(conflict);
      case ConflictType.LOGICAL:
        return this.generateLogicalResolution(conflict);
      case ConflictType.METHODOLOGICAL:
        return this.generateMethodologicalResolution(conflict);
      case ConflictType.EVALUATIVE:
        return this.generateEvaluativeResolution(conflict);
      case ConflictType.PREDICTIVE:
        return this.generatePredictiveResolution(conflict);
      default:
        return this.generateDefaultResolution(conflict);
    }
  }

  /**
   * Generate resolution framework for factual conflicts
   */
  private generateFactualResolution(conflict: Conflict): ResolutionFramework {
    const urgency =
      conflict.severity === ConflictSeverity.CRITICAL
        ? "immediate"
        : conflict.severity === ConflictSeverity.HIGH
          ? "urgent"
          : "standard";

    return {
      approach: "Verify facts through authoritative sources and data validation",
      steps: [
        "Identify the specific factual claims in conflict",
        "Trace each claim back to its source data",
        "Verify data accuracy and completeness",
        "Check for measurement or interpretation errors",
        "Consult authoritative sources if available",
        "Determine which fact is correct or if both are partially correct",
      ],
      considerations: [
        "Data quality and reliability",
        "Measurement methodology",
        "Temporal context (facts may change over time)",
        "Scope and boundaries of claims",
      ],
      recommendedAction: `${urgency === "immediate" ? "IMMEDIATE ACTION REQUIRED: " : ""}Verify factual claims through ${urgency} data validation and source checking`,
    };
  }

  /**
   * Generate resolution framework for logical conflicts
   */
  private generateLogicalResolution(conflict: Conflict): ResolutionFramework {
    return {
      approach: "Analyze logical structure and identify reasoning errors",
      steps: [
        "Map out the logical structure of each argument",
        "Identify premises and conclusions",
        "Check for logical fallacies",
        "Verify validity of inferences",
        "Identify where reasoning diverges",
        "Determine which logical chain is sound",
      ],
      considerations: [
        "Validity of logical operators",
        "Hidden assumptions",
        "Scope of logical claims",
        "Formal vs informal reasoning",
      ],
      recommendedAction:
        conflict.severity === ConflictSeverity.CRITICAL
          ? "CRITICAL: Resolve logical inconsistency immediately through formal logical analysis"
          : "Perform logical analysis to identify and correct reasoning errors",
    };
  }

  /**
   * Generate resolution framework for methodological conflicts
   */
  private generateMethodologicalResolution(conflict: Conflict): ResolutionFramework {
    return {
      approach: "Evaluate methodological appropriateness for the problem context",
      steps: [
        "Identify the specific methods in conflict",
        "Assess appropriateness of each method for the problem",
        "Consider strengths and limitations of each approach",
        "Evaluate resource requirements",
        "Consider combining complementary methods",
        "Select optimal method or hybrid approach",
      ],
      considerations: [
        "Problem characteristics and requirements",
        "Available resources and constraints",
        "Methodological rigor and validity",
        "Practical feasibility",
      ],
      recommendedAction:
        conflict.severity === ConflictSeverity.LOW
          ? "Consider both methods as viable alternatives"
          : "Evaluate methodological fit and select most appropriate approach",
    };
  }

  /**
   * Generate resolution framework for evaluative conflicts
   */
  private generateEvaluativeResolution(_conflict: Conflict): ResolutionFramework {
    return {
      approach: "Clarify value priorities and stakeholder perspectives",
      steps: [
        "Identify the specific values in conflict",
        "Understand stakeholder perspectives",
        "Assess importance of each value in context",
        "Consider trade-offs and compromises",
        "Seek common ground or higher-order values",
        "Make explicit value judgment with rationale",
      ],
      considerations: [
        "Stakeholder priorities and concerns",
        "Ethical implications",
        "Long-term vs short-term values",
        "Context-specific value weights",
      ],
      recommendedAction:
        "Engage in value clarification and prioritization based on stakeholder needs and context",
    };
  }

  /**
   * Generate resolution framework for predictive conflicts
   */
  private generatePredictiveResolution(conflict: Conflict): ResolutionFramework {
    return {
      approach: "Evaluate prediction models and underlying assumptions",
      steps: [
        "Identify the specific predictions in conflict",
        "Examine underlying models and assumptions",
        "Assess quality and relevance of input data",
        "Consider uncertainty ranges",
        "Evaluate track record of prediction methods",
        "Generate ensemble prediction or confidence intervals",
      ],
      considerations: [
        "Model assumptions and limitations",
        "Data quality and completeness",
        "Uncertainty and confidence levels",
        "Historical accuracy of methods",
      ],
      recommendedAction:
        conflict.severity === ConflictSeverity.CRITICAL
          ? "URGENT: Reconcile predictive models immediately - high-stakes decision depends on accuracy"
          : "Evaluate prediction quality and consider ensemble or range-based forecast",
    };
  }

  /**
   * Generate default resolution framework
   */
  private generateDefaultResolution(_conflict: Conflict): ResolutionFramework {
    return {
      approach: "Systematic analysis and evidence-based resolution",
      steps: [
        "Clearly define the conflict",
        "Gather additional evidence",
        "Analyze each perspective",
        "Identify common ground",
        "Evaluate trade-offs",
        "Make informed decision",
      ],
      considerations: ["Context and constraints", "Evidence quality", "Stakeholder impact"],
      recommendedAction: "Conduct systematic analysis to resolve conflict",
    };
  }

  /**
   * Track conflict pattern for learning
   *
   * Records conflict information to identify recurring patterns
   * and improve conflict prevention.
   *
   * @param _conflict - Conflict to track
   * @param resolved - Whether conflict was successfully resolved
   */
  trackConflictPattern(_conflict: Conflict, resolved: boolean = false): void {
    const conflict = _conflict;
    // Create pattern key based on conflict type and source streams
    const sortedSources = [...conflict.sourceStreams].sort();
    const patternKey = `${conflict.type}-${sortedSources.join("-")}`;

    // Get or create pattern
    let pattern = this.conflictPatterns.get(patternKey);

    if (!pattern) {
      pattern = {
        conflictTypes: [conflict.type],
        frequency: 0,
        commonSources: sortedSources,
        resolutionSuccess: 0,
      };
      this.conflictPatterns.set(patternKey, pattern);
    }

    // Update pattern
    pattern.frequency += 1;

    // Update resolution success rate
    if (resolved) {
      const totalResolutions = pattern.frequency;
      const successfulResolutions = pattern.resolutionSuccess * (totalResolutions - 1) + 1;
      pattern.resolutionSuccess = successfulResolutions / totalResolutions;
    } else {
      // Recalculate success rate with new data point
      const totalResolutions = pattern.frequency;
      const successfulResolutions = pattern.resolutionSuccess * (totalResolutions - 1);
      pattern.resolutionSuccess = successfulResolutions / totalResolutions;
    }
  }

  /**
   * Get tracked conflict patterns
   *
   * @returns Array of conflict patterns
   */
  getConflictPatterns(): ConflictPattern[] {
    return Array.from(this.conflictPatterns.values());
  }
}
