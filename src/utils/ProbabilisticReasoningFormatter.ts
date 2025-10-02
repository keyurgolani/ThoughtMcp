/**
 * Probabilistic Reasoning Formatter
 *
 * Provides user-friendly formatting for probabilistic reasoning results
 * with simplified uncertainty presentation and practical confidence intervals.
 */

import {
  EvidenceIntegration,
  ProbabilisticReasoningResult,
  UncertaintyAssessment,
} from "../interfaces/probabilistic-reasoning.js";

export interface SimplifiedUncertainty {
  confidence_level: "very_low" | "low" | "moderate" | "high" | "very_high";
  confidence_percentage: number;
  uncertainty_level: "very_low" | "low" | "moderate" | "high" | "very_high";
  practical_meaning: string;
  confidence_range: {
    min: number;
    max: number;
    description: string;
  };
  reliability_indicator: "🔴" | "🟡" | "🟢";
  user_friendly_explanation: string;
}

export interface PracticalConfidenceInterval {
  range: [number, number];
  percentage_range: string;
  interpretation: string;
  decision_guidance: string;
  risk_level: "low" | "medium" | "high";
  action_recommendations: string[];
}

export interface EvidenceQualityAssessment {
  overall_grade: "A" | "B" | "C" | "D" | "F";
  strength_indicators: string[];
  weakness_indicators: string[];
  evidence_count: number;
  quality_summary: string;
  improvement_suggestions: string[];
}

export interface BayesianExplanation {
  what_happened: string;
  how_beliefs_changed: string;
  why_this_conclusion: string;
  what_evidence_mattered: string[];
  alternative_possibilities: string[];
  next_steps: string[];
}

export interface UserFriendlyProbabilisticResult {
  main_conclusion: string;
  confidence_assessment: SimplifiedUncertainty;
  confidence_interval: PracticalConfidenceInterval;
  evidence_quality: EvidenceQualityAssessment;
  bayesian_explanation: BayesianExplanation;
  uncertainty_breakdown: {
    what_we_know: string[];
    what_we_dont_know: string[];
    biggest_uncertainties: string[];
    how_to_reduce_uncertainty: string[];
  };
  decision_support: {
    should_i_act: "yes" | "no" | "gather_more_info";
    reasoning: string;
    risk_factors: string[];
    opportunities: string[];
  };
}

export class ProbabilisticReasoningFormatter {
  static formatForUser(
    result: ProbabilisticReasoningResult
  ): UserFriendlyProbabilisticResult {
    const confidenceAssessment = this.createSimplifiedUncertainty(result);
    const confidenceInterval = this.createPracticalConfidenceInterval(result);
    const evidenceQuality = this.assessEvidenceQuality(
      result.evidence_integration
    );
    const bayesianExplanation = this.createBayesianExplanation(result);
    const uncertaintyBreakdown = this.createUncertaintyBreakdown(result);
    const decisionSupport = this.createDecisionSupport(result);

    return {
      main_conclusion: this.simplifyConclusion(result.conclusion),
      confidence_assessment: confidenceAssessment,
      confidence_interval: confidenceInterval,
      evidence_quality: evidenceQuality,
      bayesian_explanation: bayesianExplanation,
      uncertainty_breakdown: uncertaintyBreakdown,
      decision_support: decisionSupport,
    };
  }

  private static createSimplifiedUncertainty(
    result: ProbabilisticReasoningResult
  ): SimplifiedUncertainty {
    const confidence = result.confidence;
    const uncertainty = result.uncertainty_assessment;

    let confidenceLevel: "very_low" | "low" | "moderate" | "high" | "very_high";
    let uncertaintyLevel:
      | "very_low"
      | "low"
      | "moderate"
      | "high"
      | "very_high";
    let reliabilityIndicator: "🔴" | "🟡" | "🟢";
    let practicalMeaning: string;

    // Determine confidence level
    if (confidence >= 0.9) {
      confidenceLevel = "very_high";
      practicalMeaning =
        "Very confident - strong evidence supports this conclusion";
      reliabilityIndicator = "🟢";
    } else if (confidence >= 0.7) {
      confidenceLevel = "high";
      practicalMeaning = "Confident - good evidence supports this conclusion";
      reliabilityIndicator = "🟢";
    } else if (confidence >= 0.5) {
      confidenceLevel = "moderate";
      practicalMeaning = "Moderately confident - some evidence supports this";
      reliabilityIndicator = "🟡";
    } else if (confidence >= 0.3) {
      confidenceLevel = "low";
      practicalMeaning = "Low confidence - limited evidence available";
      reliabilityIndicator = "🟡";
    } else {
      confidenceLevel = "very_low";
      practicalMeaning = "Very low confidence - insufficient evidence";
      reliabilityIndicator = "🔴";
    }

    // Determine uncertainty level (inverse of confidence with adjustments)
    const combinedUncertainty = uncertainty.combined_uncertainty;
    if (combinedUncertainty <= 0.1) {
      uncertaintyLevel = "very_low";
    } else if (combinedUncertainty <= 0.3) {
      uncertaintyLevel = "low";
    } else if (combinedUncertainty <= 0.5) {
      uncertaintyLevel = "moderate";
    } else if (combinedUncertainty <= 0.7) {
      uncertaintyLevel = "high";
    } else {
      uncertaintyLevel = "very_high";
    }

    // Create user-friendly explanation
    const userFriendlyExplanation = this.createConfidenceExplanation(
      confidenceLevel,
      uncertaintyLevel,
      uncertainty
    );

    const confidenceRange = {
      min: Math.max(0, uncertainty.confidence_interval[0]),
      max: Math.min(1, uncertainty.confidence_interval[1]),
      description: this.createRangeDescription(uncertainty.confidence_interval),
    };

    return {
      confidence_level: confidenceLevel,
      confidence_percentage: Math.round(confidence * 100),
      uncertainty_level: uncertaintyLevel,
      practical_meaning: practicalMeaning,
      confidence_range: confidenceRange,
      reliability_indicator: reliabilityIndicator,
      user_friendly_explanation: userFriendlyExplanation,
    };
  }

  private static createPracticalConfidenceInterval(
    result: ProbabilisticReasoningResult
  ): PracticalConfidenceInterval {
    const interval = result.uncertainty_assessment.confidence_interval;
    const range: [number, number] = [
      Math.max(0, interval[0]),
      Math.min(1, interval[1]),
    ];

    const percentageRange = `${Math.round(range[0] * 100)}% - ${Math.round(
      range[1] * 100
    )}%`;
    const width = range[1] - range[0];

    let interpretation: string;
    let decisionGuidance: string;
    let riskLevel: "low" | "medium" | "high";
    let actionRecommendations: string[];

    if (width <= 0.2) {
      interpretation = "Narrow confidence range - relatively precise estimate";
      riskLevel = "low";
      decisionGuidance = "You can proceed with reasonable confidence";
      actionRecommendations = [
        "The analysis provides a fairly precise estimate",
        "Consider proceeding with your decision",
        "Monitor for new information that might change the assessment",
      ];
    } else if (width <= 0.4) {
      interpretation = "Moderate confidence range - some uncertainty remains";
      riskLevel = "medium";
      decisionGuidance =
        "Consider gathering more information before major decisions";
      actionRecommendations = [
        "The estimate has moderate precision",
        "Consider the range of possibilities in your planning",
        "Gather additional evidence if the decision is important",
        "Prepare for scenarios across the confidence range",
      ];
    } else {
      interpretation = "Wide confidence range - high uncertainty";
      riskLevel = "high";
      decisionGuidance =
        "Gather more evidence before making important decisions";
      actionRecommendations = [
        "The estimate is quite uncertain",
        "Strongly consider gathering more evidence",
        "Plan for multiple scenarios",
        "Avoid irreversible decisions until uncertainty is reduced",
        "Focus on reducing the biggest sources of uncertainty",
      ];
    }

    return {
      range,
      percentage_range: percentageRange,
      interpretation,
      decision_guidance: decisionGuidance,
      risk_level: riskLevel,
      action_recommendations: actionRecommendations,
    };
  }

  private static assessEvidenceQuality(
    evidenceIntegration: EvidenceIntegration
  ): EvidenceQualityAssessment {
    const qualityScore = evidenceIntegration.evidence_quality_score;
    const evidenceCount = evidenceIntegration.total_evidence_count;
    const conflictingCount = evidenceIntegration.conflicting_evidence.length;
    const supportingCount = evidenceIntegration.supporting_evidence.length;

    let overallGrade: "A" | "B" | "C" | "D" | "F";
    let qualitySummary: string;
    const strengthIndicators: string[] = [];
    const weaknessIndicators: string[] = [];
    const improvementSuggestions: string[] = [];

    // Determine overall grade
    if (qualityScore >= 0.9 && evidenceCount >= 3) {
      overallGrade = "A";
      qualitySummary = "Excellent evidence quality with strong support";
    } else if (qualityScore >= 0.7 && evidenceCount >= 2) {
      overallGrade = "B";
      qualitySummary = "Good evidence quality with adequate support";
    } else if (qualityScore >= 0.5 && evidenceCount >= 1) {
      overallGrade = "C";
      qualitySummary = "Fair evidence quality with some limitations";
    } else if (qualityScore >= 0.3) {
      overallGrade = "D";
      qualitySummary = "Poor evidence quality with significant limitations";
    } else {
      overallGrade = "F";
      qualitySummary = "Very poor evidence quality - conclusions unreliable";
    }

    // Identify strengths
    if (evidenceCount >= 3) {
      strengthIndicators.push(
        `Multiple sources of evidence (${evidenceCount} pieces)`
      );
    }
    if (qualityScore >= 0.7) {
      strengthIndicators.push("High-quality, reliable evidence");
    }
    if (supportingCount > conflictingCount * 2) {
      strengthIndicators.push("Evidence strongly supports the conclusion");
    }
    if (evidenceIntegration.reliability_weighted_score >= 0.7) {
      strengthIndicators.push("Evidence sources are generally trustworthy");
    }

    // Identify weaknesses
    if (evidenceCount < 2) {
      weaknessIndicators.push("Limited number of evidence sources");
      improvementSuggestions.push(
        "Gather additional evidence from different sources"
      );
    }
    if (qualityScore < 0.5) {
      weaknessIndicators.push("Low reliability of available evidence");
      improvementSuggestions.push("Seek higher-quality, more reliable sources");
    }
    if (conflictingCount > supportingCount) {
      weaknessIndicators.push("More conflicting than supporting evidence");
      improvementSuggestions.push(
        "Investigate and resolve conflicting evidence"
      );
    }
    if (evidenceIntegration.reliability_weighted_score < 0.5) {
      weaknessIndicators.push("Evidence sources have questionable reliability");
      improvementSuggestions.push(
        "Verify evidence sources and seek more credible alternatives"
      );
    }

    // General improvement suggestions
    if (overallGrade === "C" || overallGrade === "D" || overallGrade === "F") {
      improvementSuggestions.push(
        "Consider delaying important decisions until better evidence is available"
      );
    }

    return {
      overall_grade: overallGrade,
      strength_indicators: strengthIndicators,
      weakness_indicators: weaknessIndicators,
      evidence_count: evidenceCount,
      quality_summary: qualitySummary,
      improvement_suggestions: improvementSuggestions,
    };
  }

  private static createBayesianExplanation(
    result: ProbabilisticReasoningResult
  ): BayesianExplanation {
    const whatHappened =
      "The analysis started with initial beliefs and updated them based on available evidence using Bayesian reasoning.";

    const howBeliefsChanged = this.explainBeliefUpdating(result);
    const whyThisConclusion = this.explainConclusionReasoning(result);
    const whatEvidenceMattered = this.identifyKeyEvidence(result);
    const alternativePossibilities = this.explainAlternatives(result);
    const nextSteps = this.suggestNextSteps(result);

    return {
      what_happened: whatHappened,
      how_beliefs_changed: howBeliefsChanged,
      why_this_conclusion: whyThisConclusion,
      what_evidence_mattered: whatEvidenceMattered,
      alternative_possibilities: alternativePossibilities,
      next_steps: nextSteps,
    };
  }

  private static createUncertaintyBreakdown(
    result: ProbabilisticReasoningResult
  ): {
    what_we_know: string[];
    what_we_dont_know: string[];
    biggest_uncertainties: string[];
    how_to_reduce_uncertainty: string[];
  } {
    const uncertainty = result.uncertainty_assessment;

    const whatWeKnow: string[] = [];
    const whatWeDontKnow: string[] = [];
    const biggestUncertainties: string[] = [];
    const howToReduce: string[] = [];

    // What we know (high confidence elements)
    if (result.confidence > 0.7) {
      whatWeKnow.push("The main conclusion has good evidence support");
    }
    if (result.evidence_integration.supporting_evidence.length > 0) {
      whatWeKnow.push(
        `${result.evidence_integration.supporting_evidence.length} pieces of supporting evidence`
      );
    }
    if (uncertainty.reliability_assessment > 0.6) {
      whatWeKnow.push("The reasoning process appears reliable");
    }

    // What we don't know (uncertainty sources)
    for (const source of uncertainty.uncertainty_sources) {
      whatWeDontKnow.push(source.description);
      if (source.impact > 0.5) {
        biggestUncertainties.push(`${source.type}: ${source.description}`);
      }
      howToReduce.push(...source.mitigation_suggestions);
    }

    // Add general uncertainty reduction strategies
    if (result.evidence_integration.total_evidence_count < 3) {
      howToReduce.push("Gather more evidence from different sources");
    }
    if (uncertainty.combined_uncertainty > 0.5) {
      howToReduce.push("Focus on the most uncertain aspects first");
    }

    return {
      what_we_know: whatWeKnow,
      what_we_dont_know: whatWeDontKnow,
      biggest_uncertainties: biggestUncertainties,
      how_to_reduce_uncertainty: [...new Set(howToReduce)], // Remove duplicates
    };
  }

  private static createDecisionSupport(result: ProbabilisticReasoningResult): {
    should_i_act: "yes" | "no" | "gather_more_info";
    reasoning: string;
    risk_factors: string[];
    opportunities: string[];
  } {
    const confidence = result.confidence;
    const uncertainty = result.uncertainty_assessment;

    let shouldAct: "yes" | "no" | "gather_more_info";
    let reasoning: string;
    const riskFactors: string[] = [];
    const opportunities: string[] = [];

    // Decision logic
    if (confidence >= 0.8 && uncertainty.combined_uncertainty <= 0.3) {
      shouldAct = "yes";
      reasoning = "High confidence and low uncertainty support taking action";
      opportunities.push("Strong evidence supports moving forward");
      opportunities.push("Low risk of being wrong");
    } else if (confidence >= 0.6 && uncertainty.combined_uncertainty <= 0.5) {
      shouldAct = "yes";
      reasoning =
        "Moderate confidence with manageable uncertainty - proceed with caution";
      opportunities.push("Reasonable evidence supports action");
      riskFactors.push("Some uncertainty remains - monitor closely");
    } else if (confidence < 0.4 || uncertainty.combined_uncertainty > 0.7) {
      shouldAct = "no";
      reasoning =
        "Low confidence or high uncertainty - avoid major commitments";
      riskFactors.push("High risk of making wrong decision");
      riskFactors.push("Insufficient evidence for confident action");
    } else {
      shouldAct = "gather_more_info";
      reasoning =
        "Moderate confidence but significant uncertainty - more information needed";
      riskFactors.push(
        "Current evidence is insufficient for confident decision"
      );
      opportunities.push(
        "Additional evidence could significantly improve confidence"
      );
    }

    // Add specific risk factors based on uncertainty sources
    for (const source of uncertainty.uncertainty_sources) {
      if (source.impact > 0.3) {
        riskFactors.push(`${source.type}: ${source.description}`);
      }
    }

    // Add opportunities based on evidence quality
    if (result.evidence_integration.evidence_quality_score > 0.7) {
      opportunities.push("High-quality evidence provides good foundation");
    }
    if (result.alternative_hypotheses.length > 0) {
      opportunities.push("Alternative scenarios have been considered");
    }

    return {
      should_i_act: shouldAct,
      reasoning,
      risk_factors: riskFactors,
      opportunities: opportunities,
    };
  }

  // Helper methods
  private static simplifyConclusion(conclusion: string): string {
    // Remove technical jargon and make more accessible
    return conclusion
      .replace(/posterior probability/gi, "likelihood")
      .replace(/epistemic uncertainty/gi, "knowledge gaps")
      .replace(/aleatoric uncertainty/gi, "inherent randomness")
      .replace(/Bayesian updating/gi, "evidence-based belief updating");
  }

  private static createConfidenceExplanation(
    confidenceLevel: string,
    uncertaintyLevel: string,
    uncertainty: UncertaintyAssessment
  ): string {
    let explanation = `This is a ${confidenceLevel} confidence result with ${uncertaintyLevel} uncertainty. `;

    if (uncertainty.uncertainty_sources.length > 0) {
      const mainSource = uncertainty.uncertainty_sources[0];
      explanation += `The main source of uncertainty is ${mainSource.description.toLowerCase()}. `;
    }

    if (confidenceLevel === "high" || confidenceLevel === "very_high") {
      explanation +=
        "You can rely on this conclusion for most practical purposes.";
    } else if (confidenceLevel === "moderate") {
      explanation +=
        "This conclusion is reasonably reliable but consider gathering more evidence for important decisions.";
    } else {
      explanation +=
        "This conclusion should be treated with caution - more evidence is needed.";
    }

    return explanation;
  }

  private static createRangeDescription(interval: [number, number]): string {
    const width = interval[1] - interval[0];
    const midpoint = (interval[0] + interval[1]) / 2;

    if (width <= 0.2) {
      return `Precise estimate around ${Math.round(midpoint * 100)}%`;
    } else if (width <= 0.4) {
      return `Moderate range with best estimate around ${Math.round(
        midpoint * 100
      )}%`;
    } else {
      return `Wide range indicating high uncertainty`;
    }
  }

  private static explainBeliefUpdating(
    result: ProbabilisticReasoningResult
  ): string {
    const evidenceCount = result.evidence_integration.total_evidence_count;
    const qualityScore = result.evidence_integration.evidence_quality_score;

    return (
      `Started with initial assumptions and updated beliefs based on ${evidenceCount} pieces of evidence ` +
      `with an average quality of ${Math.round(qualityScore * 100)}%. ` +
      `The evidence ${
        qualityScore > 0.6
          ? "strongly"
          : qualityScore > 0.4
          ? "moderately"
          : "weakly"
      } ` +
      `influenced the final conclusion.`
    );
  }

  private static explainConclusionReasoning(
    result: ProbabilisticReasoningResult
  ): string {
    const confidence = result.confidence;
    const supportingEvidence =
      result.evidence_integration.supporting_evidence.length;

    return (
      `This conclusion was reached because it has the highest probability (${Math.round(
        confidence * 100
      )}%) ` +
      `given the available evidence. ${supportingEvidence} pieces of evidence support this interpretation, ` +
      `making it the most likely explanation.`
    );
  }

  private static identifyKeyEvidence(
    result: ProbabilisticReasoningResult
  ): string[] {
    const keyEvidence: string[] = [];

    // Add supporting evidence
    for (const evidence of result.evidence_integration.supporting_evidence.slice(
      0,
      3
    )) {
      keyEvidence.push(
        `${evidence.type} evidence: ${evidence.content.substring(0, 100)}...`
      );
    }

    if (keyEvidence.length === 0) {
      keyEvidence.push(
        "Limited evidence available - conclusion based on available information"
      );
    }

    return keyEvidence;
  }

  private static explainAlternatives(
    result: ProbabilisticReasoningResult
  ): string[] {
    const alternatives: string[] = [];

    for (const hypothesis of result.alternative_hypotheses.slice(0, 3)) {
      alternatives.push(
        `${hypothesis.description} (${Math.round(
          hypothesis.probability * 100
        )}% likely)`
      );
    }

    if (alternatives.length === 0) {
      alternatives.push("No significant alternative explanations identified");
    }

    return alternatives;
  }

  private static suggestNextSteps(
    result: ProbabilisticReasoningResult
  ): string[] {
    const steps: string[] = [];
    const confidence = result.confidence;
    const uncertainty = result.uncertainty_assessment;

    if (confidence < 0.7) {
      steps.push("Gather additional evidence to increase confidence");
    }

    if (uncertainty.uncertainty_sources.length > 0) {
      const mainSource = uncertainty.uncertainty_sources[0];
      steps.push(...mainSource.mitigation_suggestions);
    }

    if (result.alternative_hypotheses.length > 0) {
      steps.push("Consider testing predictions of alternative hypotheses");
    }

    steps.push("Monitor for new information that might change the assessment");

    return [...new Set(steps)]; // Remove duplicates
  }

  static createSummaryText(
    userFriendlyResult: UserFriendlyProbabilisticResult
  ): string {
    let summary = `# Probabilistic Analysis Results\n\n`;

    // Main conclusion with confidence indicator
    summary += `## ${userFriendlyResult.confidence_assessment.reliability_indicator} Main Conclusion\n\n`;
    summary += `**${userFriendlyResult.main_conclusion}**\n\n`;

    // Confidence assessment
    summary += `## Confidence Assessment\n\n`;
    summary += `**Confidence Level:** ${userFriendlyResult.confidence_assessment.confidence_percentage}% (${userFriendlyResult.confidence_assessment.confidence_level})\n\n`;
    summary += `**Practical Meaning:** ${userFriendlyResult.confidence_assessment.practical_meaning}\n\n`;
    summary += `**Confidence Range:** ${userFriendlyResult.confidence_interval.percentage_range}\n`;
    summary += `*${userFriendlyResult.confidence_interval.interpretation}*\n\n`;

    // Evidence quality
    summary += `## Evidence Quality: Grade ${userFriendlyResult.evidence_quality.overall_grade}\n\n`;
    summary += `${userFriendlyResult.evidence_quality.quality_summary}\n\n`;

    if (userFriendlyResult.evidence_quality.strength_indicators.length > 0) {
      summary += `**Strengths:**\n`;
      userFriendlyResult.evidence_quality.strength_indicators.forEach(
        (strength) => {
          summary += `• ${strength}\n`;
        }
      );
      summary += `\n`;
    }

    if (userFriendlyResult.evidence_quality.weakness_indicators.length > 0) {
      summary += `**Areas for Improvement:**\n`;
      userFriendlyResult.evidence_quality.weakness_indicators.forEach(
        (weakness) => {
          summary += `• ${weakness}\n`;
        }
      );
      summary += `\n`;
    }

    // Decision guidance
    summary += `## Decision Guidance\n\n`;
    summary += `**Recommendation:** ${
      userFriendlyResult.decision_support.should_i_act === "yes"
        ? "✅ Proceed"
        : userFriendlyResult.decision_support.should_i_act === "no"
        ? "❌ Do not proceed"
        : "⏸️ Gather more information"
    }\n\n`;
    summary += `**Reasoning:** ${userFriendlyResult.decision_support.reasoning}\n\n`;

    // Uncertainty breakdown
    if (
      userFriendlyResult.uncertainty_breakdown.biggest_uncertainties.length > 0
    ) {
      summary += `## Key Uncertainties\n\n`;
      userFriendlyResult.uncertainty_breakdown.biggest_uncertainties.forEach(
        (uncertainty) => {
          summary += `• ${uncertainty}\n`;
        }
      );
      summary += `\n`;
    }

    // Next steps
    if (userFriendlyResult.bayesian_explanation.next_steps.length > 0) {
      summary += `## Recommended Next Steps\n\n`;
      userFriendlyResult.bayesian_explanation.next_steps.forEach((step) => {
        summary += `• ${step}\n`;
      });
    }

    return summary;
  }
}
