/**
 * BiasCorrector - Generates correction suggestions for detected cognitive biases
 *
 * This component provides actionable correction suggestions for biases detected
 * from raw text input. Unlike BiasCorrectionEngine which modifies ReasoningChain
 * objects, BiasCorrector generates human-readable suggestions that can be
 * returned directly in MCP tool responses.
 *
 * Implements Requirements 10.6, 10.7, 10.8, 10.9, 10.10
 */

import { BiasType, type DetectedBias } from "./types";

/**
 * Correction suggestion for a detected bias
 */
export interface BiasCorrectionSuggestion {
  /** The type of bias being corrected */
  biasType: BiasType;
  /** Human-readable suggestion for correcting the bias */
  suggestion: string;
  /** Specific techniques to apply */
  techniques: string[];
  /** Questions to ask to challenge the bias */
  challengeQuestions: string[];
}

/**
 * Bias with correction suggestion attached
 */
export interface BiasWithCorrection {
  /** The detected bias */
  bias: DetectedBias;
  /** Correction suggestion for this bias */
  correction: BiasCorrectionSuggestion;
}

/**
 * Correction suggestion templates for each bias type
 */
const CORRECTION_TEMPLATES: Record<BiasType, Omit<BiasCorrectionSuggestion, "biasType">> = {
  // Confirmation bias correction (Requirement 10.8)
  [BiasType.CONFIRMATION]: {
    suggestion:
      "Actively seek disconfirming evidence and consider alternative explanations that contradict your current belief.",
    techniques: [
      "Search for evidence that contradicts your hypothesis",
      "Ask someone with an opposing viewpoint to review your reasoning",
      "List three reasons why your conclusion might be wrong",
      "Consider what evidence would change your mind",
    ],
    challengeQuestions: [
      "What evidence would prove this belief wrong?",
      "Am I only noticing information that supports what I already think?",
      "Have I genuinely considered alternative explanations?",
      "What would someone who disagrees with me say?",
    ],
  },

  // Anchoring bias correction
  [BiasType.ANCHORING]: {
    suggestion:
      "Generate multiple independent estimates before settling on a value, and consider whether your starting point is biasing your final judgment.",
    techniques: [
      "Generate estimates from multiple starting points",
      "Ask others for their independent estimates before sharing yours",
      "Consider the full range of possible values, not just adjustments from the anchor",
      "Question whether the initial information is actually relevant",
    ],
    challengeQuestions: [
      "Would I reach the same conclusion if I started from a different reference point?",
      "Is my first piece of information actually the most relevant?",
      "Am I adjusting enough from my starting estimate?",
      "What would my estimate be if I had no prior information?",
    ],
  },

  // Availability bias correction
  [BiasType.AVAILABILITY]: {
    suggestion:
      "Seek statistical data and base rates rather than relying on easily recalled examples or recent events.",
    techniques: [
      "Look up actual statistics rather than relying on memory",
      "Consider whether memorable examples are representative",
      "Ask what the base rate or typical frequency actually is",
      "Distinguish between vivid anecdotes and systematic evidence",
    ],
    challengeQuestions: [
      "Am I overweighting this because it's easy to remember?",
      "What do the actual statistics say about this?",
      "Is this example representative or just memorable?",
      "Would I think differently if I hadn't heard about this recently?",
    ],
  },

  // Recency bias correction
  [BiasType.RECENCY]: {
    suggestion:
      "Give appropriate weight to historical data and long-term trends, not just recent events.",
    techniques: [
      "Review historical data over a longer time period",
      "Compare recent events to historical patterns",
      "Ask whether recent changes are temporary or permanent",
      "Consider cyclical patterns that may explain recent trends",
    ],
    challengeQuestions: [
      "Am I overweighting recent information?",
      "What does the long-term historical pattern show?",
      "Is this recent change likely to persist or revert?",
      "How would I evaluate this if I only had older data?",
    ],
  },

  // Representativeness bias correction
  [BiasType.REPRESENTATIVENESS]: {
    suggestion:
      "Consider base rates and statistical probabilities rather than judging by how well something fits a stereotype or pattern.",
    techniques: [
      "Look up the actual base rate or prevalence",
      "Consider sample size and statistical significance",
      "Avoid judging probability by similarity to stereotypes",
      "Apply Bayesian reasoning with prior probabilities",
    ],
    challengeQuestions: [
      "What is the actual base rate for this category?",
      "Am I judging by stereotypes rather than statistics?",
      "How common is this outcome in the general population?",
      "Am I ignoring relevant statistical information?",
    ],
  },

  // Framing bias correction (Requirement 10.7)
  [BiasType.FRAMING]: {
    suggestion:
      "Reframe the problem in multiple ways - consider both positive and negative framings to see if your conclusion changes.",
    techniques: [
      "Restate the problem as a gain instead of a loss (or vice versa)",
      "Present the same information in different formats (percentages vs. absolute numbers)",
      "Ask how you would decide if the framing were reversed",
      "Focus on the underlying facts rather than how they are presented",
    ],
    challengeQuestions: [
      "Would I decide differently if this were framed as a loss instead of a gain?",
      "Am I being influenced by how the information is presented?",
      "What are the underlying facts, separate from how they're framed?",
      "How would I present this to someone to get an unbiased reaction?",
    ],
  },

  // Sunk cost fallacy correction (Requirement 10.9)
  [BiasType.SUNK_COST]: {
    suggestion:
      "Evaluate decisions based only on future costs and benefits - past investments are irrelevant to optimal future choices.",
    techniques: [
      "Ignore past investments when evaluating future options",
      "Ask what you would do if you were starting fresh today",
      "Compare future value of continuing vs. alternatives",
      "Consider opportunity cost of continuing the current path",
    ],
    challengeQuestions: [
      "If I hadn't already invested time/money, would I start this now?",
      "Am I continuing just because I've already put resources into this?",
      "What is the best use of my resources going forward?",
      "What would I advise a friend who hadn't made this investment yet?",
    ],
  },

  // Attribution bias correction
  [BiasType.ATTRIBUTION]: {
    suggestion:
      "Consider situational factors when explaining behavior - both your own and others'. Avoid attributing outcomes solely to personal characteristics.",
    techniques: [
      "List situational factors that could explain the behavior",
      "Apply the same standards to yourself and others",
      "Consider what external pressures or constraints were present",
      "Ask whether you would behave differently in the same situation",
    ],
    challengeQuestions: [
      "What situational factors might explain this behavior?",
      "Am I judging others by their character but myself by my circumstances?",
      "Would I behave the same way in their situation?",
      "What external factors am I not considering?",
    ],
  },

  // Bandwagon bias / social proof fallacy correction
  [BiasType.BANDWAGON]: {
    suggestion:
      "Evaluate options based on their own merits and fit for your specific needs, not on popularity or what others are doing.",
    techniques: [
      "List your specific requirements and evaluate each option against them",
      "Consider why popular choices might not fit your unique situation",
      "Research failures and drawbacks of popular options, not just successes",
      "Ask what would be the best choice if no one else had made this decision yet",
      "Evaluate the actual evidence for effectiveness, not adoption rates",
    ],
    challengeQuestions: [
      "Would this still be the best choice if no one else was using it?",
      "Am I choosing this because it's popular or because it meets my needs?",
      "What are the specific reasons this is right for my situation?",
      "Have I evaluated alternatives on their merits, or dismissed them because they're less popular?",
      "What problems have others encountered with this popular choice?",
      "Is 'everyone is doing it' actually evidence that it's the right choice for me?",
    ],
  },
};

/**
 * BiasCorrector class
 *
 * Generates correction suggestions for detected cognitive biases.
 * Designed to work with raw text bias detection and provide
 * actionable suggestions for MCP tool responses.
 */
export class BiasCorrector {
  /**
   * Get correction suggestion for a specific bias type
   *
   * @param biasType - The type of bias to get correction for
   * @returns Correction suggestion with techniques and challenge questions
   */
  getSuggestion(biasType: BiasType): BiasCorrectionSuggestion {
    const template = CORRECTION_TEMPLATES[biasType];

    if (!template) {
      // Fallback for unknown bias types
      return {
        biasType,
        suggestion:
          "Review your reasoning for potential cognitive biases and seek alternative perspectives.",
        techniques: [
          "Consider alternative explanations",
          "Seek input from others with different viewpoints",
          "Question your assumptions",
        ],
        challengeQuestions: [
          "What assumptions am I making?",
          "What would change my mind?",
          "Am I being objective?",
        ],
      };
    }

    return {
      biasType,
      ...template,
    };
  }

  /**
   * Add correction suggestions to detected biases
   *
   * Takes an array of detected biases and returns them with
   * correction suggestions attached. Each bias gets its own
   * correction suggestion (Requirement 10.10).
   *
   * @param biases - Array of detected biases
   * @returns Array of biases with correction suggestions
   */
  addCorrections(biases: DetectedBias[]): BiasWithCorrection[] {
    return biases.map((bias) => ({
      bias,
      correction: this.getSuggestion(bias.type),
    }));
  }

  /**
   * Get a concise correction message for a bias
   *
   * Returns a single-line suggestion suitable for inclusion
   * in API responses.
   *
   * @param biasType - The type of bias
   * @returns Concise correction suggestion string
   */
  getConciseSuggestion(biasType: BiasType): string {
    const template = CORRECTION_TEMPLATES[biasType];
    return template?.suggestion ?? "Review your reasoning for potential cognitive biases.";
  }

  /**
   * Get all correction templates
   *
   * Returns the full set of correction templates for all bias types.
   * Useful for documentation or UI display.
   *
   * @returns Map of bias types to correction templates
   */
  getAllTemplates(): Map<BiasType, BiasCorrectionSuggestion> {
    const templates = new Map<BiasType, BiasCorrectionSuggestion>();

    for (const biasType of Object.values(BiasType)) {
      templates.set(biasType, this.getSuggestion(biasType));
    }

    return templates;
  }

  /**
   * Format correction for display
   *
   * Creates a formatted string with the suggestion, techniques,
   * and challenge questions for display in responses.
   *
   * @param correction - The correction suggestion to format
   * @returns Formatted string for display
   */
  formatCorrection(correction: BiasCorrectionSuggestion): string {
    const lines: string[] = [
      `Suggestion: ${correction.suggestion}`,
      "",
      "Techniques:",
      ...correction.techniques.map((t) => `  • ${t}`),
      "",
      "Challenge Questions:",
      ...correction.challengeQuestions.map((q) => `  • ${q}`),
    ];

    return lines.join("\n");
  }
}
