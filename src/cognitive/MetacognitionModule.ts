/**
 * Metacognitive Monitoring Module
 * Implements self-monitoring and bias detection for cognitive processes
 * Provides confidence assessment, coherence evaluation, and reasoning strategy suggestions
 */

import {
  ComponentStatus,
  IMetacognitionModule,
} from "../interfaces/cognitive.js";
import { ReasoningStep, ReasoningType } from "../types/core.js";

interface BiasPattern {
  name: string;
  description: string;
  indicators: string[];
  severity: number;
  mitigation: string;
}

interface ConfidenceFactors {
  consistency: number;
  evidence_strength: number;
  reasoning_depth: number;
  alternative_consideration: number;
  uncertainty_acknowledgment: number;
}

interface CoherenceMetrics {
  logical_consistency: number;
  narrative_flow: number;
  premise_conclusion_alignment: number;
  contradiction_count: number;
  gap_count: number;
}

interface MetacognitiveAssessment {
  confidence: number;
  coherence: number;
  biases_detected: string[];
  completeness: number;
  quality_score: number;
  suggestions: string[];
  should_reconsider: boolean;
  reasoning: string;
}

interface StrategyRecommendation {
  strategy: string;
  reasoning: string;
  confidence: number;
  applicable_contexts: string[];
}

export class MetacognitionModule implements IMetacognitionModule {
  private initialized: boolean = false;
  private lastActivity: number = 0;
  private config: MetacognitiveConfig = {};
  private biasPatterns: Map<string, BiasPattern> = new Map();
  private performanceHistory: PerformanceRecord[] = [];

  constructor() {
    this.initializeBiasPatterns();
  }

  async initialize(config: Record<string, unknown>): Promise<void> {
    this.config = {
      confidence_threshold: 0.6,
      coherence_threshold: 0.7,
      bias_detection_sensitivity: 0.5,
      max_suggestions: 5,
      performance_history_size: 100,
      quality_weight_confidence: 0.3,
      quality_weight_coherence: 0.3,
      quality_weight_completeness: 0.2,
      quality_weight_bias_absence: 0.2,
      ...config,
    } as MetacognitiveConfig;

    this.initialized = true;
  }

  async process(input: unknown): Promise<unknown> {
    if (!Array.isArray(input)) {
      throw new Error(
        "MetacognitionModule expects array of ReasoningStep as input"
      );
    }

    const reasoning = input as ReasoningStep[];
    return this.assessReasoning(reasoning);
  }

  monitorConfidence(reasoning: ReasoningStep[]): number {
    this.lastActivity = Date.now();

    if (reasoning.length === 0) {
      return 0.1; // Very low confidence for empty reasoning
    }

    const factors = this.analyzeConfidenceFactors(reasoning);

    // Weighted combination of confidence factors
    const weights = {
      consistency: 0.2,
      evidence_strength: 0.35,
      reasoning_depth: 0.15,
      alternative_consideration: 0.2,
      uncertainty_acknowledgment: 0.1,
    };

    const confidence =
      factors.consistency * weights.consistency +
      factors.evidence_strength * weights.evidence_strength +
      factors.reasoning_depth * weights.reasoning_depth +
      factors.alternative_consideration * weights.alternative_consideration +
      factors.uncertainty_acknowledgment * weights.uncertainty_acknowledgment;

    return Math.max(0, Math.min(1, confidence));
  }

  detectBiases(reasoning: ReasoningStep[]): string[] {
    this.lastActivity = Date.now();

    const detectedBiases: string[] = [];
    const reasoningText = reasoning
      .map((step) => step.content)
      .join(" ")
      .toLowerCase();
    const reasoningTypes = reasoning.map((step) => step.type);

    for (const [biasName, pattern] of this.biasPatterns) {
      if (this.detectBiasPattern(reasoningText, reasoningTypes, pattern)) {
        detectedBiases.push(biasName);
      }
    }

    // Additional bias detection based on reasoning structure
    detectedBiases.push(...this.detectStructuralBiases(reasoning));

    return [...new Set(detectedBiases)]; // Remove duplicates
  }

  assessCoherence(reasoning: ReasoningStep[]): number {
    this.lastActivity = Date.now();

    if (reasoning.length === 0) {
      return 0.1;
    }

    const metrics = this.computeCoherenceMetrics(reasoning);

    // Weighted combination of coherence metrics
    const coherence =
      metrics.logical_consistency * 0.4 +
      metrics.narrative_flow * 0.3 +
      metrics.premise_conclusion_alignment * 0.3 -
      metrics.contradiction_count * 0.1 -
      metrics.gap_count * 0.05;

    return Math.max(0, Math.min(1, coherence));
  }

  suggestImprovements(reasoning: ReasoningStep[]): string[] {
    this.lastActivity = Date.now();

    const suggestions: string[] = [];

    // Calculate individual metrics without calling assessReasoning to avoid circular dependency
    const confidence = this.monitorConfidence(reasoning);
    const coherence = this.assessCoherence(reasoning);
    const biases = this.detectBiases(reasoning);
    const completeness = this.assessCompleteness(reasoning);

    // Confidence-based suggestions
    if (confidence < this.config.confidence_threshold!) {
      suggestions.push(
        ...this.generateConfidenceSuggestionsFromMetrics(confidence)
      );
    }

    // Coherence-based suggestions
    if (coherence < this.config.coherence_threshold!) {
      suggestions.push(
        ...this.generateCoherenceSuggestionsFromMetrics(coherence)
      );
    }

    // Bias-based suggestions
    if (biases.length > 0) {
      suggestions.push(...this.generateBiasSuggestions(biases));
    }

    // Completeness-based suggestions
    if (completeness < 0.7) {
      suggestions.push(...this.generateCompletenessSuggestions(reasoning));
    }

    // Strategy recommendations
    suggestions.push(...this.recommendStrategies(reasoning));

    return suggestions.slice(0, this.config.max_suggestions);
  }

  // Main assessment method that combines all metacognitive functions
  assessReasoning(reasoning: ReasoningStep[]): MetacognitiveAssessment {
    const confidence = this.monitorConfidence(reasoning);
    const coherence = this.assessCoherence(reasoning);
    const biases = this.detectBiases(reasoning);
    const completeness = this.assessCompleteness(reasoning);

    const qualityScore = this.computeQualityScore(
      confidence,
      coherence,
      completeness,
      biases
    );

    // Generate suggestions without circular dependency
    const suggestions = this.generateSuggestionsFromMetrics(
      confidence,
      coherence,
      biases,
      completeness,
      reasoning
    );

    const shouldReconsider =
      confidence < this.config.confidence_threshold! ||
      coherence < this.config.coherence_threshold! ||
      biases.length > 3 ||
      completeness < 0.5;

    return {
      confidence,
      coherence,
      biases_detected: biases,
      completeness,
      quality_score: qualityScore,
      suggestions,
      should_reconsider: shouldReconsider,
      reasoning: this.generateAssessmentReasoning(
        confidence,
        coherence,
        biases,
        completeness
      ),
    };
  }

  private initializeBiasPatterns(): void {
    const patterns: BiasPattern[] = [
      {
        name: "confirmation_bias",
        description:
          "Tendency to search for or interpret information that confirms pre-existing beliefs",
        indicators: [
          "confirms",
          "supports my view",
          "as expected",
          "obviously",
          "clearly",
        ],
        severity: 0.8,
        mitigation:
          "Actively seek disconfirming evidence and consider alternative explanations",
      },
      {
        name: "anchoring_bias",
        description: "Over-reliance on first piece of information encountered",
        indicators: [
          "initially",
          "first impression",
          "starting point",
          "based on",
        ],
        severity: 0.6,
        mitigation: "Consider multiple starting points and reference frames",
      },
      {
        name: "availability_heuristic",
        description:
          "Overestimating likelihood of events based on memory availability",
        indicators: ["remember", "recall", "comes to mind", "recent example"],
        severity: 0.7,
        mitigation: "Seek statistical data and consider base rates",
      },
      {
        name: "representativeness_heuristic",
        description: "Judging probability by similarity to mental prototypes",
        indicators: ["typical", "representative", "looks like", "similar to"],
        severity: 0.6,
        mitigation: "Consider base rates and statistical reasoning",
      },
      {
        name: "overconfidence_bias",
        description: "Excessive confidence in one's own answers or judgments",
        indicators: [
          "definitely",
          "certainly",
          "without doubt",
          "obviously",
          "clearly",
        ],
        severity: 0.8,
        mitigation: "Acknowledge uncertainty and consider confidence intervals",
      },
      {
        name: "hindsight_bias",
        description:
          "Tendency to perceive past events as more predictable than they were",
        indicators: [
          "should have known",
          "predictable",
          "obvious in retrospect",
        ],
        severity: 0.5,
        mitigation: "Consider what information was available at the time",
      },
      {
        name: "framing_effect",
        description:
          "Drawing different conclusions from same information based on presentation",
        indicators: ["depends on how you look at it", "from this perspective"],
        severity: 0.6,
        mitigation:
          "Consider multiple framings and presentations of the same information",
      },
    ];

    patterns.forEach((pattern) => {
      this.biasPatterns.set(pattern.name, pattern);
    });
  }

  private analyzeConfidenceFactors(
    reasoning: ReasoningStep[]
  ): ConfidenceFactors {
    const confidenceVariance = this.calculateVariance(
      reasoning.map((step) => step.confidence)
    );

    return {
      consistency: Math.max(0, 1 - confidenceVariance), // Lower variance = higher consistency
      evidence_strength: this.assessEvidenceStrength(reasoning),
      reasoning_depth: Math.min(1, reasoning.length / 5), // Normalize to 5 steps
      alternative_consideration: this.assessAlternativeConsideration(reasoning),
      uncertainty_acknowledgment:
        this.assessUncertaintyAcknowledgment(reasoning),
    };
  }

  private assessEvidenceStrength(reasoning: ReasoningStep[]): number {
    let evidenceScore = 0;
    const evidenceKeywords = [
      "evidence",
      "data",
      "research",
      "study",
      "fact",
      "proven",
      "demonstrated",
      "based on",
      "supported",
      "shows",
    ];

    reasoning.forEach((step) => {
      const content = step.content.toLowerCase();
      const evidenceCount = evidenceKeywords.filter((keyword) =>
        content.includes(keyword)
      ).length;
      evidenceScore += evidenceCount * 0.3;

      // Bonus for specific types of reasoning
      if (step.type === ReasoningType.LOGICAL_INFERENCE) evidenceScore += 0.2;
      if (step.type === ReasoningType.CAUSAL) evidenceScore += 0.25;
      if (step.type === ReasoningType.PROBABILISTIC) evidenceScore += 0.15;

      // Base score for having any reasoning
      evidenceScore += 0.1;
    });

    return Math.min(1, evidenceScore / reasoning.length);
  }

  private assessAlternativeConsideration(reasoning: ReasoningStep[]): number {
    let alternativeScore = 0;

    reasoning.forEach((step) => {
      alternativeScore += step.alternatives.length * 0.4;

      const content = step.content.toLowerCase();
      const alternativeKeywords = [
        "however",
        "alternatively",
        "on the other hand",
        "but",
        "although",
        "consider",
        "alternative",
      ];
      const alternativeCount = alternativeKeywords.filter((keyword) =>
        content.includes(keyword)
      ).length;
      alternativeScore += alternativeCount * 0.2;
    });

    return Math.min(1, alternativeScore / reasoning.length);
  }

  private assessUncertaintyAcknowledgment(reasoning: ReasoningStep[]): number {
    let uncertaintyScore = 0;
    const uncertaintyKeywords = [
      "might",
      "could",
      "possibly",
      "perhaps",
      "uncertain",
      "unclear",
      "may",
    ];

    reasoning.forEach((step) => {
      const content = step.content.toLowerCase();
      const uncertaintyCount = uncertaintyKeywords.filter((keyword) =>
        content.includes(keyword)
      ).length;
      uncertaintyScore += uncertaintyCount * 0.15;

      // Lower confidence should increase uncertainty acknowledgment score
      if (step.confidence < 0.7) uncertaintyScore += 0.1;
    });

    return Math.min(1, uncertaintyScore / reasoning.length);
  }

  private detectBiasPattern(
    text: string,
    _types: ReasoningType[],
    pattern: BiasPattern
  ): boolean {
    const indicatorCount = pattern.indicators.filter((indicator) =>
      text.includes(indicator)
    ).length;

    // For confirmation bias, be more sensitive - require at least 2 indicators
    if (pattern.name === "confirmation_bias") {
      return indicatorCount >= 2;
    }

    // Use a minimum threshold of 1 indicator, or sensitivity-based threshold
    const threshold = Math.max(
      1,
      Math.ceil(
        pattern.indicators.length * this.config.bias_detection_sensitivity!
      )
    );

    return indicatorCount >= threshold;
  }

  private detectStructuralBiases(reasoning: ReasoningStep[]): string[] {
    const biases: string[] = [];

    // Check for overconfidence (all steps have very high confidence)
    const avgConfidence =
      reasoning.reduce((sum, step) => sum + step.confidence, 0) /
      reasoning.length;
    if (avgConfidence > 0.9 && reasoning.length > 2) {
      biases.push("overconfidence_bias");
    }

    // Check for lack of alternative consideration
    const stepsWithAlternatives = reasoning.filter(
      (step) => step.alternatives.length > 0
    ).length;
    if (stepsWithAlternatives / reasoning.length < 0.3) {
      biases.push("tunnel_vision");
    }

    // Check for reasoning type diversity
    const uniqueTypes = new Set(reasoning.map((step) => step.type));
    if (uniqueTypes.size === 1 && reasoning.length > 3) {
      biases.push("single_mode_thinking");
    }

    return biases;
  }

  private computeCoherenceMetrics(
    reasoning: ReasoningStep[]
  ): CoherenceMetrics {
    return {
      logical_consistency: this.assessLogicalConsistency(reasoning),
      narrative_flow: this.assessNarrativeFlow(reasoning),
      premise_conclusion_alignment:
        this.assessPremiseConclusionAlignment(reasoning),
      contradiction_count: this.countContradictions(reasoning),
      gap_count: this.countLogicalGaps(reasoning),
    };
  }

  private assessLogicalConsistency(reasoning: ReasoningStep[]): number {
    // Check for logical consistency between steps
    let consistencyScore = 1.0;

    for (let i = 1; i < reasoning.length; i++) {
      const currentStep = reasoning[i];
      const previousStep = reasoning[i - 1];

      // Simple consistency check based on confidence alignment
      const confidenceDiff = Math.abs(
        currentStep.confidence - previousStep.confidence
      );
      if (confidenceDiff > 0.5) {
        consistencyScore -= 0.1;
      }

      // Check for contradictory content (simplified)
      if (this.areStepsContradictory(currentStep, previousStep)) {
        consistencyScore -= 0.2;
      }
    }

    return Math.max(0, consistencyScore);
  }

  private assessNarrativeFlow(reasoning: ReasoningStep[]): number {
    // Assess how well steps flow together
    let flowScore = 1.0;
    const transitionWords = [
      "therefore",
      "thus",
      "consequently",
      "however",
      "furthermore",
      "moreover",
    ];

    for (let i = 1; i < reasoning.length; i++) {
      const content = reasoning[i].content.toLowerCase();
      const hasTransition = transitionWords.some((word) =>
        content.includes(word)
      );

      if (!hasTransition && reasoning.length > 2) {
        flowScore -= 0.1;
      }
    }

    return Math.max(0, flowScore);
  }

  private assessPremiseConclusionAlignment(reasoning: ReasoningStep[]): number {
    if (reasoning.length < 2) return 1.0;

    const firstStep = reasoning[0];
    const lastStep = reasoning[reasoning.length - 1];

    // Simple alignment check based on confidence progression
    const confidenceProgression = lastStep.confidence - firstStep.confidence;

    // Good alignment should show either stable or increasing confidence
    if (confidenceProgression >= -0.1) {
      return 1.0;
    } else {
      return Math.max(0, 1 + confidenceProgression); // Penalize large drops
    }
  }

  private countContradictions(reasoning: ReasoningStep[]): number {
    let contradictions = 0;

    for (let i = 0; i < reasoning.length; i++) {
      for (let j = i + 1; j < reasoning.length; j++) {
        if (this.areStepsContradictory(reasoning[i], reasoning[j])) {
          contradictions++;
        }
      }
    }

    return contradictions;
  }

  private countLogicalGaps(reasoning: ReasoningStep[]): number {
    // Count potential logical gaps (simplified heuristic)
    let gaps = 0;

    for (let i = 1; i < reasoning.length; i++) {
      const currentStep = reasoning[i];
      const previousStep = reasoning[i - 1];

      // Large confidence jumps might indicate gaps
      if (currentStep.confidence - previousStep.confidence > 0.4) {
        gaps++;
      }
    }

    return gaps;
  }

  private areStepsContradictory(
    step1: ReasoningStep,
    step2: ReasoningStep
  ): boolean {
    // Simplified contradiction detection
    const content1 = step1.content.toLowerCase();
    const content2 = step2.content.toLowerCase();

    const contradictionPairs = [
      ["yes", "no"],
      ["true", "false"],
      ["correct", "incorrect"],
      ["valid", "invalid"],
      ["possible", "impossible"],
    ];

    return contradictionPairs.some(
      ([word1, word2]) =>
        (content1.includes(word1) && content2.includes(word2)) ||
        (content1.includes(word2) && content2.includes(word1))
    );
  }

  private assessCompleteness(reasoning: ReasoningStep[]): number {
    let completenessScore = 0;

    // Check for different types of reasoning
    const types = new Set(reasoning.map((step) => step.type));
    completenessScore += Math.min(1, types.size / 4) * 0.3; // Diversity bonus

    // Check for consideration of alternatives
    const totalAlternatives = reasoning.reduce(
      (sum, step) => sum + step.alternatives.length,
      0
    );
    completenessScore +=
      Math.min(1, totalAlternatives / reasoning.length) * 0.3;

    // Check reasoning depth
    completenessScore += Math.min(1, reasoning.length / 5) * 0.2;

    // Check for metacognitive steps
    const metacognitiveSteps = reasoning.filter(
      (step) => step.type === ReasoningType.METACOGNITIVE
    ).length;
    completenessScore += Math.min(1, metacognitiveSteps / 2) * 0.2;

    return completenessScore;
  }

  private computeQualityScore(
    confidence: number,
    coherence: number,
    completeness: number,
    biases: string[]
  ): number {
    const biasScore = Math.max(0, 1 - biases.length * 0.2);

    return (
      confidence * this.config.quality_weight_confidence! +
      coherence * this.config.quality_weight_coherence! +
      completeness * this.config.quality_weight_completeness! +
      biasScore * this.config.quality_weight_bias_absence!
    );
  }

  private generateBiasSuggestions(biases: string[]): string[] {
    const suggestions: string[] = [];

    biases.forEach((bias) => {
      const pattern = this.biasPatterns.get(bias);
      if (pattern) {
        suggestions.push(`Address ${bias}: ${pattern.mitigation}`);
      }
    });

    return suggestions;
  }

  private generateCompletenessSuggestions(
    reasoning: ReasoningStep[]
  ): string[] {
    const suggestions: string[] = [];

    const types = new Set(reasoning.map((step) => step.type));
    if (!types.has(ReasoningType.ANALOGICAL)) {
      suggestions.push(
        "Consider analogical reasoning to find similar situations or patterns"
      );
    }
    if (!types.has(ReasoningType.CAUSAL)) {
      suggestions.push(
        "Explore causal relationships and underlying mechanisms"
      );
    }
    if (!types.has(ReasoningType.PROBABILISTIC)) {
      suggestions.push(
        "Consider probabilistic reasoning and uncertainty quantification"
      );
    }

    return suggestions;
  }

  private recommendStrategies(_reasoning: ReasoningStep[]): string[] {
    const strategies: StrategyRecommendation[] = [
      {
        strategy: "devil's_advocate",
        reasoning:
          "Actively argue against your own position to identify weaknesses",
        confidence: 0.8,
        applicable_contexts: ["decision_making", "analysis"],
      },
      {
        strategy: "pre_mortem",
        reasoning:
          "Imagine your conclusion is wrong and work backwards to find potential causes",
        confidence: 0.7,
        applicable_contexts: ["planning", "risk_assessment"],
      },
      {
        strategy: "base_rate_neglect_check",
        reasoning: "Consider statistical base rates and prior probabilities",
        confidence: 0.9,
        applicable_contexts: ["probability", "prediction"],
      },
    ];

    // Select most relevant strategies based on reasoning content
    return strategies
      .filter((strategy) => strategy.confidence > 0.6)
      .map((strategy) => `Try ${strategy.strategy}: ${strategy.reasoning}`)
      .slice(0, 2);
  }

  private generateAssessmentReasoning(
    confidence: number,
    coherence: number,
    biases: string[],
    completeness: number
  ): string {
    const parts: string[] = [];

    if (confidence < 0.6) {
      parts.push(
        `Low confidence (${confidence.toFixed(
          2
        )}) suggests need for more evidence`
      );
    }
    if (coherence < 0.7) {
      parts.push(
        `Coherence issues (${coherence.toFixed(
          2
        )}) indicate logical inconsistencies`
      );
    }
    if (biases.length > 0) {
      parts.push(`Detected biases: ${biases.join(", ")}`);
    }
    if (completeness < 0.7) {
      parts.push(
        `Incomplete analysis (${completeness.toFixed(
          2
        )}) - consider additional perspectives`
      );
    }

    return parts.length > 0
      ? parts.join("; ")
      : "Reasoning appears sound with good metacognitive quality";
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // Helper methods to avoid circular dependencies
  private generateSuggestionsFromMetrics(
    confidence: number,
    coherence: number,
    biases: string[],
    completeness: number,
    reasoning: ReasoningStep[]
  ): string[] {
    const suggestions: string[] = [];

    // Confidence-based suggestions
    if (confidence < this.config.confidence_threshold!) {
      suggestions.push(
        ...this.generateConfidenceSuggestionsFromMetrics(confidence)
      );
    }

    // Coherence-based suggestions
    if (coherence < this.config.coherence_threshold!) {
      suggestions.push(
        ...this.generateCoherenceSuggestionsFromMetrics(coherence)
      );
    }

    // Bias-based suggestions
    if (biases.length > 0) {
      suggestions.push(...this.generateBiasSuggestions(biases));
    }

    // Completeness-based suggestions
    if (completeness < 0.7) {
      suggestions.push(...this.generateCompletenessSuggestions(reasoning));
    }

    // Strategy recommendations
    suggestions.push(...this.recommendStrategies(reasoning));

    return suggestions.slice(0, this.config.max_suggestions);
  }

  private generateConfidenceSuggestionsFromMetrics(
    confidence: number
  ): string[] {
    const suggestions: string[] = [];

    if (confidence < 0.4) {
      suggestions.push(
        "Consider gathering more evidence or information before drawing conclusions"
      );
      suggestions.push(
        "Break down complex problems into smaller, more manageable components"
      );
    } else if (confidence < 0.6) {
      suggestions.push(
        "Seek additional perspectives or expert opinions to validate your reasoning"
      );
      suggestions.push(
        "Consider potential counterarguments to strengthen your position"
      );
    }

    return suggestions;
  }

  private generateCoherenceSuggestionsFromMetrics(coherence: number): string[] {
    const suggestions: string[] = [];

    if (coherence < 0.5) {
      suggestions.push(
        "Review your reasoning chain for logical consistency and flow"
      );
      suggestions.push(
        "Ensure each step follows logically from the previous ones"
      );
      suggestions.push(
        "Consider reorganizing your reasoning to improve narrative flow"
      );
    } else if (coherence < 0.7) {
      suggestions.push(
        "Add transitional statements to better connect your reasoning steps"
      );
      suggestions.push(
        "Check for any contradictions or inconsistencies in your logic"
      );
    }

    return suggestions;
  }

  reset(): void {
    this.lastActivity = 0;
    this.performanceHistory = [];
  }

  recordPerformance(
    assessment: MetacognitiveAssessment,
    outcome?: "success" | "failure"
  ): void {
    const record: PerformanceRecord = {
      timestamp: Date.now(),
      assessment,
      ...(outcome && { outcome }),
    };

    this.performanceHistory.push(record);

    // Keep history within configured size
    if (
      this.performanceHistory.length >
      (this.config.performance_history_size || 100)
    ) {
      this.performanceHistory.shift();
    }
  }

  getPerformanceHistory(): PerformanceRecord[] {
    return [...this.performanceHistory];
  }

  getStatus(): ComponentStatus {
    return {
      name: "MetacognitionModule",
      initialized: this.initialized,
      active: Date.now() - this.lastActivity < 30000,
      last_activity: this.lastActivity,
    };
  }
}

interface MetacognitiveConfig {
  confidence_threshold?: number;
  coherence_threshold?: number;
  bias_detection_sensitivity?: number;
  max_suggestions?: number;
  performance_history_size?: number;
  quality_weight_confidence?: number;
  quality_weight_coherence?: number;
  quality_weight_completeness?: number;
  quality_weight_bias_absence?: number;
}

interface PerformanceRecord {
  timestamp: number;
  assessment: MetacognitiveAssessment;
  outcome?: "success" | "failure";
}
