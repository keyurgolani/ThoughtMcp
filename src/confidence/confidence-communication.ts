/**
 * Confidence Communication Module
 *
 * Provides clear, user-friendly communication of confidence assessments
 * including formatting, interpretation guidance, uncertainty explanations,
 * action recommendations, and factor breakdowns.
 */

import {
  UncertaintyType as UncertaintyTypeEnum,
  type ConfidenceAssessment,
  type FactorBreakdown,
} from "./types";

/**
 * Context for confidence interpretation
 */
export interface InterpretationContext {
  domain?: string;
  problemType?: string;
  [key: string]: unknown;
}

/**
 * Confidence Communication Module
 *
 * Translates technical confidence assessments into clear, actionable
 * communication for users. Provides formatting, interpretation, and
 * recommendations in non-technical language.
 */
export class ConfidenceCommunicationModule {
  /**
   * Format confidence score into user-friendly string
   *
   * Converts a 0-1 confidence score into a percentage and qualitative
   * label that users can easily understand.
   *
   * @param confidence - Confidence score (0-1)
   * @returns Formatted confidence string with percentage and label
   * @throws Error if confidence is invalid (not a number, out of range)
   */
  formatConfidence(confidence: number): string {
    // Validate input
    if (typeof confidence !== "number" || isNaN(confidence)) {
      throw new Error("Confidence must be a valid number");
    }
    if (!isFinite(confidence)) {
      throw new Error("Confidence must be a finite number");
    }
    if (confidence < 0 || confidence > 1) {
      throw new Error("Confidence must be between 0 and 1");
    }

    const percentage = Math.round(confidence * 100);
    let label: string;

    if (confidence >= 0.9) {
      label = "Very High";
    } else if (confidence >= 0.8) {
      label = "High";
    } else if (confidence >= 0.65) {
      label = "Fairly Confident";
    } else if (confidence >= 0.5) {
      label = "Medium";
    } else if (confidence >= 0.3) {
      label = "Low";
    } else if (confidence > 0) {
      label = "Very Low";
    } else {
      label = "No Confidence";
    }

    return `${percentage}% (${label})`;
  }

  /**
   * Provide interpretation guidance for confidence level
   *
   * Generates context-specific interpretation of what the confidence
   * level means and how to act on it.
   *
   * @param confidence - Confidence score (0-1)
   * @param context - Optional context for interpretation
   * @returns Human-readable interpretation guidance
   */
  provideInterpretation(confidence: number, _context?: InterpretationContext): string {
    // Context could be used for domain-specific interpretations in the future
    // const domain = _context?.domain || "general";

    if (confidence >= 0.8) {
      return `This is a highly reliable assessment. The reasoning is well-supported by strong evidence and coherent logic. You can proceed with confidence in this conclusion.`;
    } else if (confidence >= 0.6) {
      return `This is a reasonably confident assessment. The reasoning is sound, but there may be some gaps or uncertainties. Consider verifying key assumptions before taking action.`;
    } else if (confidence >= 0.4) {
      return `This assessment has moderate uncertainty. While the reasoning follows logically, there are significant gaps in evidence or completeness. Gather more information before making important decisions.`;
    } else if (confidence > 0) {
      return `This assessment has low confidence. The reasoning may be incomplete or based on limited evidence. Exercise caution and seek additional information or expert input before proceeding.`;
    } else {
      return `This assessment has no confidence. The reasoning is highly uncertain or unreliable. Do not proceed without gathering substantially more information or seeking expert guidance.`;
    }
  }

  /**
   * Explain uncertainty type in clear language
   *
   * Provides a user-friendly explanation of the type of uncertainty
   * present in the assessment.
   *
   * @param uncertaintyType - Type of uncertainty
   * @returns Clear explanation of the uncertainty type
   */
  explainUncertainty(uncertaintyType: UncertaintyTypeEnum): string {
    switch (uncertaintyType) {
      case UncertaintyTypeEnum.EPISTEMIC:
        return "This uncertainty comes from a lack of knowledge or information. It can be reduced by gathering more data, conducting research, or learning more about the subject. The more you know, the more confident you can become.";

      case UncertaintyTypeEnum.ALEATORY:
        return "This uncertainty comes from inherent randomness or variability in the situation. It cannot be reduced through more information because it reflects genuine unpredictability. You'll need to account for this variability in your planning.";

      case UncertaintyTypeEnum.AMBIGUITY:
        return "This uncertainty comes from multiple valid interpretations or ambiguous information. The situation could be understood in different ways. Clarifying definitions, assumptions, or context can help resolve this ambiguity.";

      default:
        return "The type of uncertainty is unclear. Consider reviewing the assessment for more details.";
    }
  }

  /**
   * Recommend actions based on confidence level
   *
   * Generates actionable recommendations appropriate for the
   * confidence level.
   *
   * @param confidence - Confidence score (0-1)
   * @returns Array of actionable recommendations
   */
  recommendActions(confidence: number): string[] {
    if (confidence >= 0.8) {
      return [
        "Proceed with the recommended course of action",
        "Document your decision and reasoning for future reference",
        "Monitor outcomes to validate the assessment",
      ];
    } else if (confidence >= 0.6) {
      return [
        "Verify key assumptions before proceeding",
        "Consider gathering additional evidence for critical factors",
        "Review the reasoning for potential gaps or biases",
        "Proceed with appropriate caution and monitoring",
      ];
    } else if (confidence >= 0.3) {
      return [
        "Gather more information before making important decisions",
        "Investigate the main sources of uncertainty",
        "Consider alternative approaches or perspectives",
        "Proceed with caution and consult with experts if available",
      ];
    } else if (confidence >= 0.2) {
      return [
        "Do not proceed without substantial additional information",
        "Conduct thorough research to address knowledge gaps",
        "Seek expert guidance or consultation",
        "Consider whether the problem is well-defined",
        "Explore alternative problem-solving approaches",
      ];
    } else {
      return [
        "Do not proceed with this assessment",
        "Fundamentally reconsider the approach or problem definition",
        "Seek expert guidance immediately",
        "Gather substantially more data and evidence",
        "Consider whether the question can be answered with available methods",
      ];
    }
  }

  /**
   * Generate factor breakdown for display
   *
   * Creates a detailed breakdown of confidence factors with
   * strengths, weaknesses, and recommendations.
   *
   * @param assessment - Complete confidence assessment
   * @returns Factor breakdown for user communication
   */
  generateFactorBreakdown(assessment: ConfidenceAssessment): FactorBreakdown {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // Analyze each factor
    for (const factor of assessment.factors) {
      if (factor.score >= 0.75) {
        strengths.push(`${this.capitalizeFirst(factor.dimension)}: ${factor.explanation}`);
      } else if (factor.score < 0.65) {
        weaknesses.push(`${this.capitalizeFirst(factor.dimension)}: ${factor.explanation}`);
      }
    }

    // Generate recommendations based on weaknesses
    if (assessment.evidenceQuality < 0.6) {
      recommendations.push("Gather more evidence to support your conclusions");
    }
    if (assessment.reasoningCoherence < 0.6) {
      recommendations.push("Review the logical flow and consistency of your reasoning");
    }
    if (assessment.completeness < 0.6) {
      recommendations.push("Address gaps in your analysis to improve completeness");
    }
    if (assessment.uncertaintyLevel > 0.5) {
      recommendations.push("Identify and reduce sources of uncertainty where possible");
    }

    // If no specific recommendations, provide general guidance
    if (recommendations.length === 0) {
      if (assessment.overallConfidence >= 0.8) {
        recommendations.push("Continue with your current approach - it's working well");
      } else {
        recommendations.push(
          "Consider reviewing all factors to identify improvement opportunities"
        );
      }
    }

    return {
      overall: assessment.overallConfidence,
      factors: assessment.factors,
      strengths,
      weaknesses,
      recommendations: recommendations.slice(0, 5), // Limit to 5 recommendations
    };
  }

  /**
   * Capitalize first letter of a string
   *
   * @param str - String to capitalize
   * @returns String with first letter capitalized
   */
  private capitalizeFirst(str: string): string {
    if (!str || str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
