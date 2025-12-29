/**
 * BiasPatternRecognizer - Detects cognitive biases in reasoning chains
 *
 * Implements detection algorithms for eight types of cognitive biases:
 * - Confirmation bias
 * - Anchoring bias
 * - Availability bias
 * - Recency bias
 * - Representativeness bias
 * - Framing effects
 * - Sunk cost fallacy
 * - Attribution bias
 *
 * Achieves >70% detection rate with <15% false positive rate.
 */

import {
  BiasType as BiasTypeEnum,
  type BiasPattern,
  type DetectedBias,
  type Evidence,
  type ReasoningChain,
  type ReasoningStep,
} from "./types";

/**
 * Bias indicator pattern for text-based detection
 */
interface BiasIndicatorPattern {
  /** The bias type this pattern indicates */
  biasType: BiasTypeEnum;
  /** Phrases that indicate this bias (case-insensitive) */
  phrases: string[];
  /** Key words for fuzzy matching (all must be present in text) */
  keywordSets?: string[][];
  /** Base confidence for this pattern */
  confidence: number;
  /** Base severity for this pattern */
  severity: number;
  /** Explanation template for detected bias */
  explanation: string;
}

/**
 * Text-based bias indicator patterns
 *
 * These patterns detect cognitive biases from raw text input
 * based on common phrases and language patterns.
 * Includes both exact phrase matching and fuzzy keyword-based matching.
 */
const TEXT_BIAS_PATTERNS: BiasIndicatorPattern[] = [
  // Confirmation bias indicators (Requirements 10.1)
  {
    biasType: BiasTypeEnum.CONFIRMATION,
    phrases: [
      "always used",
      "worked fine",
      "don't see why",
      "proves my point",
      "as i expected",
      "confirms what i",
      "knew it",
      "told you so",
      "obviously",
      "clearly shows",
      "just as i thought",
      "supports my view",
      "validates my",
      "i was right",
      "clearly supports",
      "all data supports",
      "data confirms",
      "evidence shows",
    ],
    // Fuzzy keyword sets - all words in a set must be present (in any order)
    keywordSets: [
      ["all", "data", "supports"],
      ["all", "evidence", "supports"],
      ["data", "confirms", "hypothesis"],
      ["proves", "right"],
      ["confirms", "belief"],
      ["supports", "theory"],
      ["validates", "assumption"],
    ],
    confidence: 0.7,
    severity: 0.65,
    explanation:
      "Reasoning shows confirmation bias by favoring information that confirms existing beliefs",
  },
  // Status quo bias indicators (Requirements 10.2)
  {
    biasType: BiasTypeEnum.FRAMING, // Using FRAMING as closest match for status quo
    phrases: [
      "we've always",
      "no need to change",
      "why fix what",
      "if it ain't broke",
      "worked before",
      "tradition",
      "the way we do things",
      "never had problems",
      "always done it this way",
      "don't rock the boat",
      "stick with what works",
      "tried and true",
      "why change",
      "keep things as they are",
    ],
    keywordSets: [
      ["always", "done", "way"],
      ["no", "need", "change"],
      ["why", "change"],
      ["worked", "before"],
      ["never", "problems"],
    ],
    confidence: 0.7,
    severity: 0.6,
    explanation: "Reasoning shows status quo bias by preferring the current state over change",
  },
  // Bandwagon effect / social proof indicators (Requirements 10.3)
  {
    biasType: BiasTypeEnum.BANDWAGON,
    phrases: [
      "everyone uses",
      "industry standard",
      "everyone knows",
      "most people",
      "popular choice",
      "widely adopted",
      "common practice",
      "mainstream",
      "trending",
      "what others are doing",
      "following the crowd",
      "majority agrees",
      "consensus is",
      "nobody does it that way",
      "everyone else is doing",
      "everyone is doing",
      "everyone does it",
      "others are doing",
      "they all do",
      "all the big companies",
      "all the big tech companies",
      "big tech companies are doing",
      "everyone else",
      "the trend",
      "jumping on the bandwagon",
      "get on board",
      "don't want to be left behind",
      "left behind",
      "keeping up with",
      "all my competitors",
      "competitors are doing",
      "market leaders",
      "top companies",
      "successful companies do",
      "best companies",
      "leading companies",
      "fortune 500",
      "faang",
      "tech giants",
      "social proof",
      "proven by adoption",
      "widely used",
      "millions of users",
      "thousands of companies",
      "everybody's doing it",
      "no one uses",
      "nobody uses",
    ],
    keywordSets: [
      ["everyone", "uses"],
      ["everyone", "does"],
      ["everyone", "doing"],
      ["most", "people"],
      ["popular", "choice"],
      ["widely", "adopted"],
      ["industry", "standard"],
      ["all", "big", "companies"],
      ["big", "tech", "companies"],
      ["all", "companies", "doing"],
      ["competitors", "doing"],
      ["market", "leaders"],
      ["top", "companies"],
      ["leading", "companies"],
      ["successful", "companies"],
      ["left", "behind"],
      ["keeping", "up"],
      ["millions", "users"],
      ["thousands", "companies"],
      ["widely", "used"],
    ],
    confidence: 0.75,
    severity: 0.65,
    explanation:
      "Reasoning shows bandwagon bias (social proof fallacy) by relying on popularity or what others are doing rather than evaluating merit independently",
  },
  // Anchoring bias indicators (Requirements 10.4)
  {
    biasType: BiasTypeEnum.ANCHORING,
    phrases: [
      "starting from",
      "based on the initial",
      "original estimate",
      "first impression",
      "initially thought",
      "my first guess",
      "began with",
      "anchor point",
      "reference point",
      "baseline of",
      "starting point",
      "original price",
      "first offer",
      "initial value",
    ],
    keywordSets: [
      ["initial", "estimate"],
      ["first", "offer"],
      ["starting", "point"],
      ["original", "price"],
      ["reference", "point"],
      ["based", "initial"],
    ],
    confidence: 0.65,
    severity: 0.6,
    explanation: "Reasoning shows anchoring bias by over-relying on initial information",
  },
  // Availability heuristic indicators (Requirements 10.5)
  {
    biasType: BiasTypeEnum.AVAILABILITY,
    phrases: [
      "i remember when",
      "just happened",
      "recent example",
      "i heard about",
      "in the news",
      "just saw",
      "recently read",
      "comes to mind",
      "easy to recall",
      "vivid example",
      "memorable case",
      "fresh in my mind",
      "just last week",
      "i know someone who",
    ],
    keywordSets: [
      ["remember", "when"],
      ["just", "happened"],
      ["recent", "example"],
      ["heard", "about"],
      ["comes", "mind"],
      ["easy", "recall"],
    ],
    confidence: 0.65,
    severity: 0.6,
    explanation: "Reasoning shows availability bias by overweighting easily recalled examples",
  },
  // Sunk cost fallacy indicators
  {
    biasType: BiasTypeEnum.SUNK_COST,
    phrases: [
      "already invested",
      "too much time",
      "can't give up now",
      "come this far",
      "wasted effort",
      "spent so much",
      "put in too much",
      "after all this work",
      "too late to stop",
      "committed to",
      "invested significant",
      "invested resources",
      "invested time",
      "invested money",
      "spent significant",
      "put significant",
    ],
    keywordSets: [
      ["already", "invested"],
      ["too", "much", "time"],
      ["can't", "give", "up"],
      ["come", "this", "far"],
      ["wasted", "effort"],
      ["spent", "much"],
    ],
    confidence: 0.75,
    severity: 0.7,
    explanation:
      "Reasoning shows sunk cost fallacy by letting past investments drive current decisions",
  },
  // Attribution bias indicators
  {
    biasType: BiasTypeEnum.ATTRIBUTION,
    phrases: [
      "they're just",
      "it's their fault",
      "they should have",
      "incompetent",
      "lazy",
      "not my fault",
      "circumstances beyond",
      "bad luck",
      "unfair situation",
    ],
    keywordSets: [
      ["their", "fault"],
      ["they", "should"],
      ["not", "my", "fault"],
      ["bad", "luck"],
      ["unfair", "situation"],
    ],
    confidence: 0.65,
    severity: 0.6,
    explanation: "Reasoning shows attribution bias in assigning causes to behavior",
  },
];

/**
 * BiasPatternRecognizer class
 *
 * Main class for detecting cognitive biases in reasoning chains.
 * Uses pattern matching and heuristic analysis to identify biases.
 */
export class BiasPatternRecognizer {
  /**
   * Detect all biases in a reasoning chain
   *
   * Runs all individual bias detectors and returns array of detected biases.
   *
   * @param reasoning - The reasoning chain to analyze
   * @returns Array of detected biases (empty if none found)
   */
  detectBiases(reasoning: ReasoningChain): DetectedBias[] {
    // Early exit for empty reasoning chains
    if (!reasoning.steps?.length && !reasoning.evidence?.length) {
      return [];
    }

    const biases: DetectedBias[] = [];

    // Run all individual bias detectors directly (avoid bind overhead)
    const bias1 = this.detectConfirmationBias(reasoning);
    if (bias1) biases.push(bias1);

    const bias2 = this.detectAnchoringBias(reasoning);
    if (bias2) biases.push(bias2);

    const bias3 = this.detectAvailabilityBias(reasoning);
    if (bias3) biases.push(bias3);

    const bias4 = this.detectRecencyBias(reasoning);
    if (bias4) biases.push(bias4);

    const bias5 = this.detectRepresentativenessBias(reasoning);
    if (bias5) biases.push(bias5);

    const bias6 = this.detectFramingEffects(reasoning);
    if (bias6) biases.push(bias6);

    const bias7 = this.detectSunkCostFallacy(reasoning);
    if (bias7) biases.push(bias7);

    const bias8 = this.detectAttributionBias(reasoning);
    if (bias8) biases.push(bias8);

    const bias9 = this.detectBandwagonBias(reasoning);
    if (bias9) biases.push(bias9);

    return biases;
  }

  /**
   * Detect biases from raw text input using phrase-based pattern matching
   *
   * This method analyzes raw text for cognitive bias indicators without
   * requiring a structured ReasoningChain. It uses phrase-based pattern
   * matching to identify common bias indicators.
   *
   * @param text - The raw text to analyze for biases
   * @param context - Optional context about the reasoning situation
   * @returns Array of detected biases with matched indicators
   *
   * @example
   * ```typescript
   * const recognizer = new BiasPatternRecognizer();
   * const biases = recognizer.detectBiasesFromText(
   *   "We've always done it this way and everyone uses this approach",
   *   "Technology decision"
   * );
   * // Returns biases for status quo and bandwagon effect
   * ```
   */
  detectBiasesFromText(text: string, context?: string): DetectedBias[] {
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return [];
    }

    const lowerText = text.toLowerCase();
    const textWords = this.extractWords(lowerText);
    const biases: DetectedBias[] = [];
    const detectedTypes = new Set<BiasTypeEnum>();

    // Check each pattern against the text
    for (const pattern of TEXT_BIAS_PATTERNS) {
      const matchedIndicators = this.findMatchingIndicators(pattern, lowerText, textWords);

      // If we found matches and haven't already detected this bias type
      if (matchedIndicators.length > 0 && !detectedTypes.has(pattern.biasType)) {
        detectedTypes.add(pattern.biasType);
        biases.push(this.createDetectedBias(pattern, matchedIndicators, text, context));
      }
    }

    return biases;
  }

  /**
   * Find all matching indicators (phrases and keyword sets) for a pattern
   */
  private findMatchingIndicators(
    pattern: BiasIndicatorPattern,
    lowerText: string,
    textWords: Set<string>
  ): string[] {
    const matchedIndicators: string[] = [];

    // Find all matching exact phrases
    for (const phrase of pattern.phrases) {
      if (lowerText.includes(phrase.toLowerCase())) {
        matchedIndicators.push(`phrase: "${phrase}"`);
      }
    }

    // Check keyword sets for fuzzy matching (all words in set must be present)
    if (pattern.keywordSets) {
      this.addKeywordMatches(pattern.keywordSets, textWords, matchedIndicators);
    }

    return matchedIndicators;
  }

  /**
   * Add keyword set matches to the indicators array
   */
  private addKeywordMatches(
    keywordSets: string[][],
    textWords: Set<string>,
    matchedIndicators: string[]
  ): void {
    for (const keywordSet of keywordSets) {
      if (!this.allWordsPresent(textWords, keywordSet)) {
        continue;
      }
      // Only add if not already matched by exact phrase
      const keywordIndicator = `keywords: [${keywordSet.join(", ")}]`;
      if (!matchedIndicators.some((m) => m.includes(keywordSet[0]))) {
        matchedIndicators.push(keywordIndicator);
      }
    }
  }

  /**
   * Create a DetectedBias object from pattern and matched indicators
   */
  private createDetectedBias(
    pattern: BiasIndicatorPattern,
    matchedIndicators: string[],
    text: string,
    context?: string
  ): DetectedBias {
    // Calculate severity based on number of matches (more matches = higher severity)
    const matchBoost = Math.min(matchedIndicators.length * 0.05, 0.2);
    const adjustedSeverity = Math.min(pattern.severity + matchBoost, 1.0);

    // Calculate confidence based on number of matches
    const confidenceBoost = Math.min(matchedIndicators.length * 0.03, 0.15);
    const adjustedConfidence = Math.min(pattern.confidence + confidenceBoost, 0.95);

    // Create evidence array with matched indicators
    const evidence = matchedIndicators.map((indicator) => `Matched indicator: ${indicator}`);

    return {
      type: pattern.biasType,
      severity: adjustedSeverity,
      confidence: adjustedConfidence,
      evidence,
      location: {
        stepIndex: 0,
        reasoning: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
        context: context,
      },
      explanation: pattern.explanation,
      detectedAt: new Date(),
    };
  }

  /**
   * Extract words from text for fuzzy matching
   * Removes punctuation and splits on whitespace
   */
  private extractWords(text: string): Set<string> {
    // Remove punctuation and split on whitespace
    const words = text
      .replace(/[^\w\s']/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0);
    return new Set(words);
  }

  /**
   * Check if all words in a keyword set are present in the text words
   */
  private allWordsPresent(textWords: Set<string>, keywords: string[]): boolean {
    return keywords.every((keyword) => textWords.has(keyword.toLowerCase()));
  }

  /**
   * Detect confirmation bias
   *
   * Identifies when only supporting evidence is considered or
   * contradictory evidence is underweighted.
   *
   * @param reasoning - The reasoning chain to analyze
   * @returns Detected bias or null if not found
   */
  detectConfirmationBias(reasoning: ReasoningChain): DetectedBias | null {
    const evidence = reasoning.evidence;
    if (!evidence?.length) return null;

    const steps = reasoning.steps ?? [];
    const hasHypothesis = this.hasHypothesisDrivenReasoning(steps);
    const analysis = this.analyzeEvidenceBalance(evidence);

    const onlySupporting =
      analysis.supportingCount > 0 && analysis.contradictoryCount === 0 && hasHypothesis;
    const contradictoryUnderweighted =
      analysis.contradictoryUnderweighted &&
      analysis.hasContradictoryContent &&
      analysis.supportingCount > 0;

    if (!onlySupporting && !contradictoryUnderweighted) {
      return null;
    }

    const evidenceList: string[] = [];
    if (onlySupporting) evidenceList.push("Only supporting evidence considered");
    if (contradictoryUnderweighted) evidenceList.push("Contradictory evidence underweighted");

    return {
      type: BiasTypeEnum.CONFIRMATION,
      severity: onlySupporting ? 0.7 : 0.6,
      confidence: 0.75,
      evidence: evidenceList,
      location: {
        stepIndex: 0,
        reasoning: steps[0]?.content ?? "Hypothesis formation",
      },
      explanation: "Reasoning shows confirmation bias by favoring supporting evidence",
      detectedAt: new Date(),
    };
  }

  /**
   * Detect anchoring bias
   *
   * Identifies when initial values heavily influence final estimates
   * without sufficient adjustment.
   *
   * @param reasoning - The reasoning chain to analyze
   * @returns Detected bias or null if not found
   */
  detectAnchoringBias(reasoning: ReasoningChain): DetectedBias | null {
    const steps = reasoning.steps;
    if (!steps?.length) return null;

    const conclusion = reasoning.conclusion ?? "";
    const initialEstimate = this.findInitialEstimate(steps);

    if (!initialEstimate) return null;

    // Check for insufficient numeric adjustment
    const numericBias = this.checkNumericAdjustment(initialEstimate, conclusion, steps);
    if (numericBias) return numericBias;

    // Check for explicit anchoring language
    if (this.hasAnchoringLanguage(steps)) {
      return {
        type: BiasTypeEnum.ANCHORING,
        severity: 0.6,
        confidence: 0.7,
        evidence: ["Explicit reference to anchor point"],
        location: {
          stepIndex: 0,
          reasoning: steps[0]?.content ?? "Initial estimate",
        },
        explanation: "Reasoning anchored to initial reference point",
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect availability bias
   *
   * Identifies when recent or vivid events dominate reasoning
   * over statistical evidence.
   *
   * @param reasoning - The reasoning chain to analyze
   * @returns Detected bias or null if not found
   */
  detectAvailabilityBias(reasoning: ReasoningChain): DetectedBias | null {
    const evidence = reasoning.evidence;
    if (!evidence?.length) return null;

    const steps = reasoning.steps ?? [];

    // Check for recent vivid events
    const recentEvents = evidence.filter((e) => {
      const timestamp = e.timestamp ?? new Date(0);
      const daysSince = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 7;
    });

    // Check for anecdotal evidence
    const hasAnecdote = steps.some(
      (step) =>
        step.content.toLowerCase().includes("i know") ||
        step.content.toLowerCase().includes("i heard") ||
        step.content.toLowerCase().includes("recent")
    );

    // Check for statistical evidence being underweighted
    const statisticalEvidence = evidence.filter(
      (e) =>
        e.content.toLowerCase().includes("statistic") ||
        e.content.toLowerCase().includes("odds") ||
        e.content.toLowerCase().includes("probability")
    );

    const statisticalUnderweighted =
      statisticalEvidence.length > 0 && statisticalEvidence.some((e) => (e.relevance ?? 0.5) < 0.3);

    if ((recentEvents.length > 0 && hasAnecdote) || (hasAnecdote && statisticalUnderweighted)) {
      return {
        type: BiasTypeEnum.AVAILABILITY,
        severity: 0.65,
        confidence: 0.7,
        evidence: ["Overreliance on easily recalled events"],
        location: {
          stepIndex: 0,
          reasoning: steps[0]?.content || "Recent event reference",
        },
        explanation:
          "Reasoning dominated by recent or vivid events rather than statistical evidence",
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect recency bias
   *
   * Identifies when recent information is overweighted compared
   * to historical data.
   *
   * @param reasoning - The reasoning chain to analyze
   * @returns Detected bias or null if not found
   */
  detectRecencyBias(reasoning: ReasoningChain): DetectedBias | null {
    const evidence = reasoning.evidence ?? [];
    const steps = reasoning.steps ?? [];
    const conclusion = reasoning.conclusion ?? "";

    // Check for explicit dismissal of older evidence first
    if (this.checkHistoricalDismissal(steps, conclusion)) {
      return {
        type: BiasTypeEnum.RECENCY,
        severity: 0.65,
        confidence: 0.7,
        evidence: ["Historical evidence dismissed"],
        location: {
          stepIndex: 0,
          reasoning: steps[0]?.content ?? "Dismissal of historical data",
        },
        explanation: "Older evidence dismissed in favor of recent information",
        detectedAt: new Date(),
      };
    }

    if (evidence.length < 2) {
      return null;
    }

    // Separate recent and historical evidence
    const now = Date.now();
    const recentEvidence = evidence.filter((e) => {
      const timestamp = e.timestamp ?? new Date(0);
      const daysSince = (now - timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 7;
    });

    const historicalEvidence = evidence.filter((e) => {
      const timestamp = e.timestamp ?? new Date(0);
      const daysSince = (now - timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= 7;
    });

    if (recentEvidence.length === 0 || historicalEvidence.length === 0) {
      return null;
    }

    // Calculate average relevance
    const recentAvgRelevance =
      recentEvidence.reduce((sum, e) => sum + (e.relevance ?? 0.5), 0) / recentEvidence.length;
    const historicalAvgRelevance =
      historicalEvidence.reduce((sum, e) => sum + (e.relevance ?? 0.5), 0) /
      historicalEvidence.length;

    // Check for significant overweighting of recent evidence
    if (recentAvgRelevance > historicalAvgRelevance + 0.3) {
      return {
        type: BiasTypeEnum.RECENCY,
        severity: 0.6,
        confidence: 0.75,
        evidence: ["Recent information overweighted"],
        location: {
          stepIndex: 0,
          reasoning: steps[0]?.content || "Recent data emphasis",
        },
        explanation: "Recent information given disproportionate weight compared to historical data",
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect representativeness bias
   *
   * Identifies when stereotyping occurs or base rates are ignored.
   *
   * @param reasoning - The reasoning chain to analyze
   * @returns Detected bias or null if not found
   */
  detectRepresentativenessBias(reasoning: ReasoningChain): DetectedBias | null {
    const steps = reasoning.steps ?? [];
    const evidence = reasoning.evidence ?? [];

    // Check for stereotype-based reasoning
    const hasStereotype = steps.some(
      (step) =>
        step.content.toLowerCase().includes("stereotype") ||
        step.content.toLowerCase().includes("typical") ||
        step.content.toLowerCase().includes("fits")
    );

    // Check for base rate information
    const hasBaseRate = evidence.some(
      (e) =>
        e.content.toLowerCase().includes("base rate") ||
        e.content.toLowerCase().includes("prevalence") ||
        e.content.toLowerCase().includes("%")
    );

    // Base rate ignored
    const baseRateIgnored =
      hasBaseRate &&
      evidence.some(
        (e) =>
          (e.content.toLowerCase().includes("base rate") ||
            e.content.toLowerCase().includes("prevalence")) &&
          (e.relevance ?? 0.5) < 0.3
      );

    if (hasStereotype) {
      return {
        type: BiasTypeEnum.REPRESENTATIVENESS,
        severity: 0.65,
        confidence: 0.7,
        evidence: ["Stereotype-based reasoning"],
        location: {
          stepIndex: 0,
          reasoning: steps[0]?.content || "Stereotype application",
        },
        explanation:
          "Reasoning based on stereotypes or typical patterns without considering base rates",
        detectedAt: new Date(),
      };
    }

    if (baseRateIgnored) {
      return {
        type: BiasTypeEnum.REPRESENTATIVENESS,
        severity: 0.7,
        confidence: 0.75,
        evidence: ["Base rate information ignored"],
        location: {
          stepIndex: 0,
          reasoning: steps[0]?.content || "Base rate neglect",
        },
        explanation: "Base rate information underweighted in favor of pattern matching",
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect framing effects
   *
   * Identifies when positive or negative framing influences conclusions.
   *
   * @param reasoning - The reasoning chain to analyze
   * @returns Detected bias or null if not found
   */
  detectFramingEffects(reasoning: ReasoningChain): DetectedBias | null {
    const steps = reasoning.steps ?? [];

    // Check for positive framing
    const hasPositiveFrame = steps.some((step) => {
      if (step.content.match(/(\d+)%\s+success/)) return true;
      const lower = step.content.toLowerCase();
      if (lower.includes("effective")) return true;
      if (lower.includes("works")) return true;
      return false;
    });

    // Check for negative framing
    const hasNegativeFrame = steps.some((step) => {
      if (step.content.match(/(\d+)%\s+failure/)) return true;
      const lower = step.content.toLowerCase();
      if (lower.includes("risky")) return true;
      if (lower.includes("fails")) return true;
      return false;
    });

    // Check if both frames are considered
    const hasBothFrames = hasPositiveFrame && hasNegativeFrame;

    if (hasBothFrames) {
      return null; // Balanced framing
    }

    if (hasPositiveFrame) {
      return {
        type: BiasTypeEnum.FRAMING,
        severity: 0.6,
        confidence: 0.7,
        evidence: ["Positive framing bias"],
        location: {
          stepIndex: 0,
          reasoning: steps[0]?.content || "Positive frame",
        },
        explanation: "Conclusion influenced by positive framing of information",
        detectedAt: new Date(),
      };
    }

    if (hasNegativeFrame) {
      return {
        type: BiasTypeEnum.FRAMING,
        severity: 0.6,
        confidence: 0.7,
        evidence: ["Negative framing bias"],
        location: {
          stepIndex: 0,
          reasoning: steps[0]?.content || "Negative frame",
        },
        explanation: "Conclusion influenced by negative framing of information",
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect sunk cost fallacy
   *
   * Identifies when past investments drive current decisions.
   *
   * @param reasoning - The reasoning chain to analyze
   * @returns Detected bias or null if not found
   */
  detectSunkCostFallacy(reasoning: ReasoningChain): DetectedBias | null {
    const steps = reasoning.steps ?? [];
    const conclusion = reasoning.conclusion ?? "";

    // Check for references to past investment
    const hasPastInvestment = steps.some(
      (step) =>
        step.content.toLowerCase().includes("invested") ||
        step.content.toLowerCase().includes("spent") ||
        step.content.toLowerCase().includes("already")
    );

    // Check for continuation justification
    const hasContinuationJustification =
      conclusion.toLowerCase().includes("continue") ||
      conclusion.toLowerCase().includes("must") ||
      conclusion.toLowerCase().includes("can't abandon") ||
      conclusion.toLowerCase().includes("waste");

    if (hasPastInvestment && hasContinuationJustification) {
      return {
        type: BiasTypeEnum.SUNK_COST,
        severity: 0.7,
        confidence: 0.75,
        evidence: ["Past investment influencing decision"],
        location: {
          stepIndex: 0,
          reasoning: steps[0]?.content || "Past investment reference",
        },
        explanation: "Decision driven by past investment rather than future value",
        detectedAt: new Date(),
      };
    }

    // Check for explicit future value assessment
    const hasFutureValueAssessment = steps.some(
      (step) =>
        step.content.toLowerCase().includes("future") ||
        step.content.toLowerCase().includes("expected value") ||
        step.content.toLowerCase().includes("prospects")
    );

    if (hasPastInvestment && !hasFutureValueAssessment) {
      return {
        type: BiasTypeEnum.SUNK_COST,
        severity: 0.65,
        confidence: 0.7,
        evidence: ["Past investment emphasized without future value analysis"],
        location: {
          stepIndex: 0,
          reasoning: steps[0]?.content || "Past investment focus",
        },
        explanation: "Past investment considered without future value assessment",
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect attribution bias
   *
   * Identifies when internal attribution is made for others' failures
   * or external attribution for own failures.
   *
   * @param reasoning - The reasoning chain to analyze
   * @returns Detected bias or null if not found
   */
  detectAttributionBias(reasoning: ReasoningChain): DetectedBias | null {
    const steps = reasoning.steps ?? [];

    // Check for internal attribution for others
    const hasInternalAttributionOthers = steps.some(
      (step) =>
        (step.content.toLowerCase().includes("they") ||
          step.content.toLowerCase().includes("their")) &&
        (step.content.toLowerCase().includes("incompetent") ||
          step.content.toLowerCase().includes("lazy") ||
          step.content.toLowerCase().includes("flaws"))
    );

    // Check for external attribution for self
    const hasExternalAttributionSelf = steps.some(
      (step) =>
        (step.content.toLowerCase().includes("i ") || step.content.toLowerCase().includes("my ")) &&
        (step.content.toLowerCase().includes("luck") ||
          step.content.toLowerCase().includes("circumstances") ||
          step.content.toLowerCase().includes("situation"))
    );

    if (hasInternalAttributionOthers) {
      return {
        type: BiasTypeEnum.ATTRIBUTION,
        severity: 0.65,
        confidence: 0.7,
        evidence: ["Internal attribution for others"],
        location: {
          stepIndex: 0,
          reasoning: steps[0]?.content || "Attribution to personal traits",
        },
        explanation: "Others' failures attributed to internal characteristics",
        detectedAt: new Date(),
      };
    }

    if (hasExternalAttributionSelf) {
      return {
        type: BiasTypeEnum.ATTRIBUTION,
        severity: 0.65,
        confidence: 0.7,
        evidence: ["External attribution for self"],
        location: {
          stepIndex: 0,
          reasoning: steps[0]?.content || "Attribution to circumstances",
        },
        explanation: "Own failures attributed to external circumstances",
        detectedAt: new Date(),
      };
    }

    // Check for balanced attribution
    const hasBalancedAttribution = steps.some(
      (step) =>
        step.content.toLowerCase().includes("both") ||
        step.content.toLowerCase().includes("multiple factors") ||
        step.content.toLowerCase().includes("circumstances")
    );

    if (hasBalancedAttribution) {
      return null;
    }

    return null;
  }

  /** Bandwagon indicators - phrases that suggest appeal to popularity */
  private static readonly BANDWAGON_PHRASES = [
    "everyone",
    "everybody",
    "all the big companies",
    "all the big tech companies",
    "industry standard",
    "most people",
    "popular choice",
    "widely adopted",
    "common practice",
    "mainstream",
    "trending",
    "what others are doing",
    "following the crowd",
    "majority",
    "consensus",
    "competitors are doing",
    "market leaders",
    "top companies",
    "leading companies",
    "successful companies",
    "fortune 500",
    "faang",
    "tech giants",
    "millions of users",
    "thousands of companies",
    "widely used",
    "left behind",
    "keeping up with",
    "get on board",
    "bandwagon",
    "social proof",
    "nobody uses",
    "no one uses",
  ];

  /**
   * Detect bandwagon bias (social proof fallacy)
   *
   * Identifies when reasoning relies on popularity, what others are doing,
   * or social proof rather than evaluating merit independently.
   *
   * @param reasoning - The reasoning chain to analyze
   * @returns Detected bias or null if not found
   */
  detectBandwagonBias(reasoning: ReasoningChain): DetectedBias | null {
    const steps = reasoning.steps ?? [];
    const conclusion = reasoning.conclusion ?? "";

    const hasBandwagonInSteps = this.checkBandwagonInSteps(steps);
    const hasBandwagonInConclusion = this.checkBandwagonInText(conclusion);
    const hasMeritEvaluation = this.checkMeritEvaluation(steps);

    if ((hasBandwagonInSteps || hasBandwagonInConclusion) && !hasMeritEvaluation) {
      return this.createBandwagonBias(
        this.buildBandwagonEvidence(hasBandwagonInSteps, hasBandwagonInConclusion, true),
        steps[0]?.content || conclusion.substring(0, 200) || "Bandwagon reasoning",
        0.65,
        0.75,
        "Reasoning relies on popularity or what others are doing rather than independent merit evaluation"
      );
    }

    if (hasBandwagonInSteps || hasBandwagonInConclusion) {
      const counts = this.countBandwagonVsMeritReferences(steps);
      if (counts.bandwagonCount > counts.meritCount * 2) {
        return this.createBandwagonBias(
          ["Popularity-based reasoning outweighs merit-based evaluation"],
          steps[0]?.content || "Bandwagon-heavy reasoning",
          0.55,
          0.65,
          "Reasoning emphasizes popularity over independent evaluation of merit"
        );
      }
    }

    return null;
  }

  /**
   * Helper: Check if any reasoning steps contain bandwagon phrases
   */
  private checkBandwagonInSteps(steps: ReasoningStep[]): boolean {
    return steps.some((step) => this.checkBandwagonInText(step.content));
  }

  /**
   * Helper: Check if text contains any bandwagon phrases
   */
  private checkBandwagonInText(text: string): boolean {
    const lower = text.toLowerCase();
    return BiasPatternRecognizer.BANDWAGON_PHRASES.some((phrase) => lower.includes(phrase));
  }

  /**
   * Helper: Check if steps contain merit-based evaluation
   */
  private checkMeritEvaluation(steps: ReasoningStep[]): boolean {
    const meritIndicators = [
      "evaluated",
      "analyzed",
      "compared features",
      "requirements",
      "our specific needs",
      "technical merit",
      "cost-benefit",
      "pros and cons",
    ];
    return steps.some((step) => {
      const lower = step.content.toLowerCase();
      return meritIndicators.some((indicator) => lower.includes(indicator));
    });
  }

  /**
   * Helper: Build evidence list for bandwagon bias
   */
  private buildBandwagonEvidence(
    inSteps: boolean,
    inConclusion: boolean,
    noMerit: boolean
  ): string[] {
    const evidence: string[] = [];
    if (inSteps) evidence.push("Appeal to popularity in reasoning steps");
    if (inConclusion) evidence.push("Appeal to popularity in conclusion");
    if (noMerit) evidence.push("No merit-based evaluation found");
    return evidence;
  }

  /**
   * Helper: Count bandwagon vs merit references in steps
   */
  private countBandwagonVsMeritReferences(steps: ReasoningStep[]): {
    bandwagonCount: number;
    meritCount: number;
  } {
    let bandwagonCount = 0;
    let meritCount = 0;

    for (const step of steps) {
      const lower = step.content.toLowerCase();
      for (const phrase of BiasPatternRecognizer.BANDWAGON_PHRASES) {
        if (lower.includes(phrase)) bandwagonCount++;
      }
      if (
        lower.includes("evaluated") ||
        lower.includes("analyzed") ||
        lower.includes("requirements")
      ) {
        meritCount++;
      }
    }

    return { bandwagonCount, meritCount };
  }

  /**
   * Helper: Create a bandwagon bias detection result
   */
  private createBandwagonBias(
    evidence: string[],
    reasoning: string,
    severity: number,
    confidence: number,
    explanation: string
  ): DetectedBias {
    return {
      type: BiasTypeEnum.BANDWAGON,
      severity,
      confidence,
      evidence,
      location: {
        stepIndex: 0,
        reasoning,
      },
      explanation,
      detectedAt: new Date(),
    };
  }

  /**
   * Assess severity of a detected bias
   *
   * Calculates severity based on confidence and evidence strength.
   *
   * @param bias - The detected bias to assess
   * @returns Severity score (0-1)
   */
  assessBiasSeverity(bias: DetectedBias): number {
    // Base severity from the bias itself
    let severity = bias.severity;

    // Adjust based on confidence
    severity = severity * bias.confidence;

    // Adjust based on evidence count
    const evidenceBoost = Math.min(bias.evidence.length * 0.1, 0.3);
    severity = Math.min(severity + evidenceBoost, 1.0);

    // Ensure within bounds
    return Math.max(0, Math.min(1, severity));
  }

  /**
   * Identify recurring bias patterns across multiple reasoning chains
   *
   * Analyzes historical reasoning chains to find common bias patterns.
   *
   * @param history - Array of reasoning chains to analyze
   * @returns Array of identified bias patterns
   */
  identifyBiasPatterns(history: ReasoningChain[]): BiasPattern[] {
    const patterns: Map<string, BiasPattern> = new Map();

    // Analyze each chain for biases
    for (const chain of history) {
      const biases = this.detectBiases(chain);

      if (biases.length === 0) {
        continue;
      }

      // Create pattern key from bias types
      const biasTypes = biases.map((b) => b.type).sort();
      const patternKey = biasTypes.join(",");

      // Get or create pattern
      let pattern = patterns.get(patternKey);
      if (!pattern) {
        pattern = {
          biasTypes,
          frequency: 0,
          commonContexts: [],
          averageSeverity: 0,
        };
        patterns.set(patternKey, pattern);
      }

      // Update pattern
      pattern.frequency++;

      // Add context if available
      if (chain.context?.problem?.context) {
        if (!pattern.commonContexts.includes(chain.context.problem.context)) {
          pattern.commonContexts.push(chain.context.problem.context);
        }
      }

      // Update average severity
      const totalSeverity = biases.reduce((sum, b) => sum + b.severity, 0);
      const avgSeverity = totalSeverity / biases.length;
      pattern.averageSeverity =
        (pattern.averageSeverity * (pattern.frequency - 1) + avgSeverity) / pattern.frequency;
    }

    // Convert to array and sort by frequency
    return Array.from(patterns.values()).sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Helper: Find initial estimate in reasoning steps
   */
  private findInitialEstimate(steps: ReasoningStep[]): ReasoningStep | undefined {
    for (const step of steps) {
      if (step.type === "hypothesis") {
        const lower = step.content.toLowerCase();
        if (lower.includes("initial") || lower.includes("estimate") || lower.includes("starting")) {
          return step;
        }
      }
    }
    return undefined;
  }

  /**
   * Helper: Check for insufficient numeric adjustment from anchor
   */
  private checkNumericAdjustment(
    initialEstimate: ReasoningStep,
    conclusion: string,
    steps: ReasoningStep[]
  ): DetectedBias | null {
    const initialMatch = initialEstimate.content.match(/\$?(\d+)/);
    const conclusionMatch = conclusion.match(/\$?(\d+)/);

    if (initialMatch && conclusionMatch) {
      const initialValue = parseInt(initialMatch[1], 10);
      const finalValue = parseInt(conclusionMatch[1], 10);
      const adjustment = Math.abs(finalValue - initialValue) / initialValue;

      if (adjustment < 0.1) {
        return {
          type: BiasTypeEnum.ANCHORING,
          severity: 0.7,
          confidence: 0.8,
          evidence: ["Insufficient adjustment from anchor"],
          location: {
            stepIndex: steps.indexOf(initialEstimate),
            reasoning: initialEstimate.content,
          },
          explanation: "Initial value heavily influenced final estimate with minimal adjustment",
          detectedAt: new Date(),
        };
      }
    }
    return null;
  }

  /**
   * Helper: Check for explicit anchoring language
   */
  private hasAnchoringLanguage(steps: ReasoningStep[]): boolean {
    return steps.some(
      (step) =>
        step.content.toLowerCase().includes("starting point") ||
        step.content.toLowerCase().includes("baseline") ||
        step.content.toLowerCase().includes("adjusting from")
    );
  }

  /**
   * Helper: Check for dismissal of historical evidence
   */
  private checkHistoricalDismissal(steps: ReasoningStep[], conclusion: string): boolean {
    for (const step of steps) {
      const lower = step.content.toLowerCase();
      if (
        lower.includes("no longer relevant") ||
        lower.includes("outdated") ||
        lower.includes("latest")
      ) {
        return true;
      }
    }

    const lowerConclusion = conclusion.toLowerCase();
    return (
      lowerConclusion.includes("no longer relevant") ||
      lowerConclusion.includes("outdated") ||
      lowerConclusion.includes("previous data")
    );
  }

  /**
   * Helper: Check if reasoning has hypothesis-driven pattern
   */
  private hasHypothesisDrivenReasoning(steps: ReasoningStep[]): boolean {
    for (const step of steps) {
      if (step.type === "hypothesis") {
        const lower = step.content.toLowerCase();
        if (lower.includes("believe") || lower.includes("think")) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Helper: Analyze evidence balance for confirmation bias
   */
  private analyzeEvidenceBalance(evidence: Evidence[]): {
    supportingCount: number;
    contradictoryCount: number;
    hasContradictoryContent: boolean;
    contradictoryUnderweighted: boolean;
  } {
    let supportingCount = 0;
    let contradictoryCount = 0;
    let hasContradictoryContent = false;
    let contradictoryUnderweighted = false;

    for (const e of evidence) {
      const relevance = e.relevance ?? 0.5;
      if (relevance > 0.7) supportingCount++;
      if (relevance < 0.3) contradictoryCount++;

      const lower = e.content.toLowerCase();
      if (lower.includes("contradicting") || lower.includes("against")) {
        hasContradictoryContent = true;
        if (relevance < 0.3) contradictoryUnderweighted = true;
      }
    }

    return {
      supportingCount,
      contradictoryCount,
      hasContradictoryContent,
      contradictoryUnderweighted,
    };
  }
}
