/**
 * Insight Generator
 *
 * Generates domain-specific insights from pattern matches.
 * Handles template substitution, hypothesis ordering by likelihood,
 * recommendation ordering by priority and dependencies, and fallback
 * generation when no patterns match.
 *
 * Requirements: 4.1, 5.1, 6.3
 */

import type { KeyTerms } from "../key-term-extractor.js";
import type {
  GeneratedHypothesis,
  GeneratedInsights,
  GeneratedRecommendation,
  PatternMatchResult,
} from "./types.js";

/**
 * Options for insight generation
 */
export interface InsightGeneratorOptions {
  /** Maximum number of hypotheses to generate (default: 10) */
  maxHypotheses?: number;
  /** Maximum number of recommendations to generate (default: 10) */
  maxRecommendations?: number;
  /** Whether to include fallback insights when no patterns match (default: true) */
  includeFallback?: boolean;
  /** Minimum confidence threshold for including pattern matches (default: 0.1) */
  minConfidence?: number;
  /** Minimum number of hypotheses when domain matches (default: 2) */
  minHypothesesOnMatch?: number;
}

/**
 * Default options for insight generation
 */
const DEFAULT_OPTIONS: Required<InsightGeneratorOptions> = {
  maxHypotheses: 10,
  maxRecommendations: 10,
  includeFallback: true,
  minConfidence: 0.1,
  minHypothesesOnMatch: 2,
};

/**
 * Insight Generator class
 *
 * Generates domain-specific insights from pattern matches.
 */
export class InsightGenerator {
  private readonly options: Required<InsightGeneratorOptions>;

  /**
   * Create a new InsightGenerator
   *
   * @param options - Configuration options
   */
  constructor(options: InsightGeneratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate insights from pattern matches
   *
   * Combines hypotheses and recommendations from all matched patterns,
   * applies template substitution with key terms, and orders results
   * by likelihood and priority.
   *
   * @param matches - Pattern match results from PatternMatcher
   * @param keyTerms - Extracted key terms for template substitution
   * @param problem - Original problem description
   * @returns Generated insights with hypotheses, recommendations, and analysis
   *
   * Requirements: 4.1, 5.1, 6.3
   */
  generateInsights(
    matches: PatternMatchResult[],
    keyTerms: KeyTerms,
    problem: string
  ): GeneratedInsights {
    // Filter matches by minimum confidence
    const validMatches = matches.filter((m) => m.confidence >= this.options.minConfidence);

    // Check if we have any valid matches
    if (validMatches.length === 0) {
      if (this.options.includeFallback) {
        return this.generateFallbackInsights(keyTerms, problem);
      }
      return this.createEmptyInsights();
    }

    // Collect and process hypotheses from all matches
    const allHypotheses = this.collectHypotheses(validMatches, keyTerms);

    // Collect and process recommendations from all matches
    const allRecommendations = this.collectRecommendations(validMatches, keyTerms);

    // Order hypotheses by likelihood (highest first)
    const orderedHypotheses = this.orderHypothesesByLikelihood(allHypotheses);

    // Ensure minimum hypotheses when domain matches (Requirements: 4.5, 4.7)
    const hypothesesWithMinimum = this.ensureMinimumHypotheses(
      orderedHypotheses,
      keyTerms,
      validMatches
    );

    // Order recommendations by priority and dependencies
    const orderedRecommendations = this.orderRecommendationsByPriority(allRecommendations);

    // Limit to max counts
    const limitedHypotheses = hypothesesWithMinimum.slice(0, this.options.maxHypotheses);
    const limitedRecommendations = orderedRecommendations.slice(0, this.options.maxRecommendations);

    // Generate root cause analysis summary
    const rootCauseAnalysis = this.generateRootCauseAnalysis(
      validMatches,
      limitedHypotheses,
      keyTerms
    );

    // Generate conclusion
    const conclusion = this.generateConclusion(validMatches, limitedHypotheses, keyTerms);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(validMatches);

    // Get matched domains
    const matchedDomains = [...new Set(validMatches.map((m) => m.domain))];

    return {
      hypotheses: limitedHypotheses,
      recommendations: limitedRecommendations,
      rootCauseAnalysis,
      conclusion,
      confidence,
      matchedDomains,
      usedFallback: false,
    };
  }

  /**
   * Collect hypotheses from all pattern matches
   *
   * @param matches - Pattern match results
   * @param keyTerms - Key terms for template substitution
   * @returns Array of generated hypotheses
   */
  private collectHypotheses(
    matches: PatternMatchResult[],
    keyTerms: KeyTerms
  ): GeneratedHypothesis[] {
    const hypotheses: GeneratedHypothesis[] = [];

    for (const match of matches) {
      for (const hypothesis of match.hypotheses) {
        // Re-apply template substitution to ensure consistency
        const processedHypothesis = this.processHypothesis(
          hypothesis,
          keyTerms,
          match.patternId,
          match.confidence
        );
        hypotheses.push(processedHypothesis);
      }
    }

    return hypotheses;
  }

  /**
   * Process a hypothesis with template substitution
   *
   * @param hypothesis - Hypothesis to process (may already have substitutions from PatternMatcher)
   * @param keyTerms - Key terms for substitution
   * @param patternId - Source pattern ID
   * @param confidence - Match confidence for likelihood adjustment
   * @returns Processed hypothesis
   */
  private processHypothesis(
    hypothesis: GeneratedHypothesis,
    keyTerms: KeyTerms,
    patternId: string,
    _confidence: number
  ): GeneratedHypothesis {
    return {
      id: hypothesis.id,
      statement: this.substituteTemplate(hypothesis.statement, keyTerms),
      investigationSteps: hypothesis.investigationSteps.map((step) =>
        this.substituteTemplate(step, keyTerms)
      ),
      expectedFindings: hypothesis.expectedFindings.map((finding) =>
        this.substituteTemplate(finding, keyTerms)
      ),
      relatedHypotheses: hypothesis.relatedHypotheses,
      estimatedTime: hypothesis.estimatedTime,
      // Likelihood is preserved from the pattern template
      likelihood: hypothesis.likelihood,
      sourcePatternId: patternId,
    };
  }

  /**
   * Collect recommendations from all pattern matches
   *
   * @param matches - Pattern match results
   * @param keyTerms - Key terms for template substitution
   * @returns Array of generated recommendations
   */
  private collectRecommendations(
    matches: PatternMatchResult[],
    keyTerms: KeyTerms
  ): GeneratedRecommendation[] {
    const recommendations: GeneratedRecommendation[] = [];

    for (const match of matches) {
      for (const recommendation of match.recommendations) {
        // Re-apply template substitution to ensure consistency
        const processedRecommendation = this.processRecommendation(
          recommendation,
          keyTerms,
          match.patternId
        );
        recommendations.push(processedRecommendation);
      }
    }

    return recommendations;
  }

  /**
   * Process a recommendation with template substitution
   *
   * @param recommendation - Recommendation to process
   * @param keyTerms - Key terms for substitution
   * @param patternId - Source pattern ID
   * @returns Processed recommendation
   */
  private processRecommendation(
    recommendation: GeneratedRecommendation,
    keyTerms: KeyTerms,
    patternId: string
  ): GeneratedRecommendation {
    return {
      id: recommendation.id,
      type: recommendation.type,
      action: this.substituteTemplate(recommendation.action, keyTerms),
      tools: recommendation.tools,
      expectedOutcome: this.substituteTemplate(recommendation.expectedOutcome, keyTerms),
      prerequisites: recommendation.prerequisites.map((prereq) =>
        this.substituteTemplate(prereq, keyTerms)
      ),
      priority: recommendation.priority,
      documentationLinks: recommendation.documentationLinks,
      sourcePatternId: patternId,
    };
  }

  /**
   * Order hypotheses by likelihood (highest first)
   *
   * @param hypotheses - Hypotheses to order
   * @returns Ordered hypotheses
   *
   * Requirements: 4.5
   */
  private orderHypothesesByLikelihood(hypotheses: GeneratedHypothesis[]): GeneratedHypothesis[] {
    return [...hypotheses].sort((a, b) => b.likelihood - a.likelihood);
  }

  /**
   * Ensure minimum number of hypotheses when domain matches
   *
   * When patterns match but don't provide enough hypotheses, supplement
   * with generic fallback hypotheses to meet the minimum requirement.
   *
   * @param hypotheses - Ordered hypotheses from pattern matches
   * @param keyTerms - Key terms for generating fallback hypotheses
   * @param matches - Pattern match results for context
   * @returns Hypotheses with minimum count ensured
   *
   * Requirements: 4.7
   */
  private ensureMinimumHypotheses(
    hypotheses: GeneratedHypothesis[],
    keyTerms: KeyTerms,
    matches: PatternMatchResult[]
  ): GeneratedHypothesis[] {
    const minRequired = this.options.minHypothesesOnMatch;

    // If we already have enough hypotheses, return as-is
    if (hypotheses.length >= minRequired) {
      return hypotheses;
    }

    // Generate supplemental hypotheses to meet minimum
    const supplementalHypotheses = this.generateSupplementalHypotheses(
      keyTerms,
      matches,
      minRequired - hypotheses.length
    );

    // Combine original hypotheses with supplemental ones
    // Original hypotheses come first (they're already ordered by likelihood)
    return [...hypotheses, ...supplementalHypotheses];
  }

  /**
   * Generate supplemental hypotheses when pattern matches don't provide enough
   *
   * Creates generic but contextually relevant hypotheses based on matched domains.
   *
   * @param keyTerms - Key terms for personalization
   * @param matches - Pattern match results for domain context
   * @param count - Number of supplemental hypotheses needed
   * @returns Array of supplemental hypotheses
   */
  private generateSupplementalHypotheses(
    keyTerms: KeyTerms,
    matches: PatternMatchResult[],
    count: number
  ): GeneratedHypothesis[] {
    const subject = keyTerms.primarySubject ?? "the system";
    const domains = [...new Set(matches.map((m) => m.domain))];
    const domainContext = domains.length > 0 ? domains.join(", ") : "the relevant components";

    // Pool of supplemental hypotheses ordered by general applicability
    const supplementalPool: GeneratedHypothesis[] = [
      {
        id: "supplemental-resource-contention",
        statement: `${subject} may be experiencing resource contention or capacity limitations in ${domainContext}`,
        investigationSteps: [
          `Monitor resource utilization metrics for ${subject}`,
          "Check for concurrent access patterns",
          "Review recent changes to load or configuration",
        ],
        expectedFindings: [
          "High CPU, memory, or I/O utilization",
          "Increased request queuing or wait times",
          "Resource exhaustion warnings in logs",
        ],
        relatedHypotheses: ["supplemental-configuration"],
        estimatedTime: "15-30 minutes",
        likelihood: 0.35, // Lower than pattern-derived hypotheses
        sourcePatternId: "supplemental",
      },
      {
        id: "supplemental-configuration",
        statement: `Configuration or environmental factors may be affecting ${subject}`,
        investigationSteps: [
          "Review recent configuration changes",
          "Compare current settings with known-good baseline",
          "Check environment variables and dependencies",
        ],
        expectedFindings: [
          "Recent configuration modifications",
          "Mismatched or missing settings",
          "Environmental differences from expected state",
        ],
        relatedHypotheses: ["supplemental-resource-contention"],
        estimatedTime: "10-20 minutes",
        likelihood: 0.3,
        sourcePatternId: "supplemental",
      },
      {
        id: "supplemental-dependency-issue",
        statement: `External dependencies or integrations may be causing issues with ${subject}`,
        investigationSteps: [
          "Check health status of dependent services",
          "Review network connectivity and latency",
          "Verify API contracts and version compatibility",
        ],
        expectedFindings: [
          "Degraded or unavailable dependent services",
          "Increased network latency or timeouts",
          "API version mismatches or contract violations",
        ],
        relatedHypotheses: ["supplemental-configuration"],
        estimatedTime: "15-25 minutes",
        likelihood: 0.25,
        sourcePatternId: "supplemental",
      },
      {
        id: "supplemental-data-integrity",
        statement: `Data integrity or consistency issues may be affecting ${subject}`,
        investigationSteps: [
          "Validate data consistency across related records",
          "Check for orphaned or corrupted data",
          "Review recent data migrations or transformations",
        ],
        expectedFindings: [
          "Inconsistent data across related entities",
          "Missing or malformed records",
          "Failed or incomplete data migrations",
        ],
        relatedHypotheses: ["supplemental-dependency-issue"],
        estimatedTime: "20-40 minutes",
        likelihood: 0.2,
        sourcePatternId: "supplemental",
      },
    ];

    // Return the requested number of supplemental hypotheses
    return supplementalPool.slice(0, Math.min(count, supplementalPool.length));
  }

  /**
   * Order recommendations by priority and dependencies
   *
   * Higher priority recommendations come first.
   * Recommendations with prerequisites come after their dependencies.
   *
   * @param recommendations - Recommendations to order
   * @returns Ordered recommendations
   *
   * Requirements: 5.5
   */
  private orderRecommendationsByPriority(
    recommendations: GeneratedRecommendation[]
  ): GeneratedRecommendation[] {
    // First, sort by priority (higher first)
    const sortedByPriority = [...recommendations].sort((a, b) => b.priority - a.priority);

    // Then, ensure prerequisites come before dependents
    return this.topologicalSortRecommendations(sortedByPriority);
  }

  /**
   * Topologically sort recommendations to ensure prerequisites come first
   *
   * @param recommendations - Recommendations sorted by priority
   * @returns Recommendations with prerequisites before dependents
   */
  private topologicalSortRecommendations(
    recommendations: GeneratedRecommendation[]
  ): GeneratedRecommendation[] {
    // Build a map of recommendation IDs to recommendations
    const recMap = new Map<string, GeneratedRecommendation>();
    for (const rec of recommendations) {
      recMap.set(rec.id, rec);
    }

    // Track which recommendations have been added to result
    const added = new Set<string>();
    const result: GeneratedRecommendation[] = [];

    // Helper to add a recommendation and its prerequisites
    const addWithPrereqs = (rec: GeneratedRecommendation): void => {
      if (added.has(rec.id)) return;

      // First add prerequisites that are in our list
      for (const prereqId of rec.prerequisites) {
        const prereq = recMap.get(prereqId);
        if (prereq && !added.has(prereqId)) {
          addWithPrereqs(prereq);
        }
      }

      // Then add this recommendation
      if (!added.has(rec.id)) {
        result.push(rec);
        added.add(rec.id);
      }
    };

    // Process all recommendations in priority order
    for (const rec of recommendations) {
      addWithPrereqs(rec);
    }

    return result;
  }

  /**
   * Substitute template placeholders with key terms
   *
   * Supported placeholders:
   * - {{primarySubject}} - Primary subject from key terms
   * - {{domainTerms}} - Comma-separated domain terms
   * - {{actionVerbs}} - Comma-separated action verbs
   * - {{nounPhrases}} - Comma-separated noun phrases
   * - {{terms}} - Comma-separated general terms
   *
   * @param template - Template string with placeholders
   * @param keyTerms - Key terms for substitution
   * @returns Template with placeholders replaced
   *
   * Requirements: 6.3
   */
  private substituteTemplate(template: string, keyTerms: KeyTerms): string {
    let result = template;

    // Replace {{primarySubject}}
    if (keyTerms.primarySubject) {
      result = result.replace(/\{\{primarySubject\}\}/g, keyTerms.primarySubject);
    } else {
      result = result.replace(/\{\{primarySubject\}\}/g, "the system");
    }

    // Replace {{domainTerms}}
    if (keyTerms.domainTerms.length > 0) {
      result = result.replace(/\{\{domainTerms\}\}/g, keyTerms.domainTerms.join(", "));
    } else {
      result = result.replace(/\{\{domainTerms\}\}/g, "relevant components");
    }

    // Replace {{actionVerbs}}
    if (keyTerms.actionVerbs.length > 0) {
      result = result.replace(/\{\{actionVerbs\}\}/g, keyTerms.actionVerbs.join(", "));
    } else {
      result = result.replace(/\{\{actionVerbs\}\}/g, "operations");
    }

    // Replace {{nounPhrases}}
    if (keyTerms.nounPhrases.length > 0) {
      result = result.replace(/\{\{nounPhrases\}\}/g, keyTerms.nounPhrases.join(", "));
    } else {
      result = result.replace(/\{\{nounPhrases\}\}/g, "system components");
    }

    // Replace {{terms}}
    if (keyTerms.terms.length > 0) {
      result = result.replace(/\{\{terms\}\}/g, keyTerms.terms.slice(0, 5).join(", "));
    } else {
      result = result.replace(/\{\{terms\}\}/g, "relevant aspects");
    }

    return result;
  }

  /**
   * Generate fallback insights when no patterns match
   *
   * Produces generic analytical reasoning that is still useful.
   *
   * @param keyTerms - Key terms for personalization
   * @param problem - Original problem description
   * @returns Fallback insights
   *
   * Requirements: 3.5, 8.2
   */
  private generateFallbackInsights(keyTerms: KeyTerms, _problem: string): GeneratedInsights {
    const subject = keyTerms.primarySubject ?? "the system";
    const domainContext =
      keyTerms.domainTerms.length > 0 ? keyTerms.domainTerms.join(", ") : "the relevant components";

    // Generate generic but useful hypotheses
    const hypotheses: GeneratedHypothesis[] = [
      {
        id: "fallback-resource-contention",
        statement: `${subject} may be experiencing resource contention or capacity limitations`,
        investigationSteps: [
          `Monitor resource utilization metrics for ${subject}`,
          "Check for concurrent access patterns",
          "Review recent changes to load or configuration",
        ],
        expectedFindings: [
          "High CPU, memory, or I/O utilization",
          "Increased request queuing or wait times",
          "Resource exhaustion warnings in logs",
        ],
        relatedHypotheses: ["fallback-configuration"],
        estimatedTime: "15-30 minutes",
        likelihood: 0.5,
        sourcePatternId: "fallback",
      },
      {
        id: "fallback-configuration",
        statement: `Configuration or environmental factors may be affecting ${subject}`,
        investigationSteps: [
          "Review recent configuration changes",
          "Compare current settings with known-good baseline",
          "Check environment variables and dependencies",
        ],
        expectedFindings: [
          "Recent configuration modifications",
          "Mismatched or missing settings",
          "Environmental differences from expected state",
        ],
        relatedHypotheses: ["fallback-resource-contention"],
        estimatedTime: "10-20 minutes",
        likelihood: 0.4,
        sourcePatternId: "fallback",
      },
    ];

    // Generate generic but useful recommendations
    const recommendations: GeneratedRecommendation[] = [
      {
        id: "fallback-gather-data",
        type: "diagnostic",
        action: `Gather diagnostic data about ${subject} including logs, metrics, and recent changes`,
        tools: ["logging system", "monitoring dashboard", "version control history"],
        expectedOutcome: "Comprehensive view of system state and recent changes",
        prerequisites: [],
        priority: 9,
        sourcePatternId: "fallback",
      },
      {
        id: "fallback-isolate-issue",
        type: "diagnostic",
        action: `Isolate the issue by testing ${domainContext} independently`,
        tools: ["test environment", "debugging tools"],
        expectedOutcome: "Identification of specific component or interaction causing the issue",
        prerequisites: ["fallback-gather-data"],
        priority: 8,
        sourcePatternId: "fallback",
      },
    ];

    return {
      hypotheses,
      recommendations,
      rootCauseAnalysis: `Analysis of ${subject}: The issue requires further investigation to determine the root cause. Initial analysis suggests examining resource utilization, configuration, and recent changes to ${domainContext}.`,
      conclusion: `Based on the available information about ${subject}, a systematic investigation approach is recommended. Start with diagnostic data gathering and proceed to isolate the specific cause.`,
      confidence: 0.3,
      matchedDomains: [],
      usedFallback: true,
    };
  }

  /**
   * Create empty insights structure
   *
   * @returns Empty insights with no hypotheses or recommendations
   */
  private createEmptyInsights(): GeneratedInsights {
    return {
      hypotheses: [],
      recommendations: [],
      rootCauseAnalysis: "No patterns matched and fallback generation is disabled.",
      conclusion: "Unable to generate insights without pattern matches.",
      confidence: 0,
      matchedDomains: [],
      usedFallback: false,
    };
  }

  /**
   * Generate root cause analysis summary
   *
   * @param matches - Pattern match results
   * @param hypotheses - Generated hypotheses
   * @param keyTerms - Key terms for personalization
   * @returns Root cause analysis text
   */
  private generateRootCauseAnalysis(
    matches: PatternMatchResult[],
    hypotheses: GeneratedHypothesis[],
    keyTerms: KeyTerms
  ): string {
    const subject = keyTerms.primarySubject ?? "the system";
    const domains = [...new Set(matches.map((m) => m.domain))];
    const topHypothesis = hypotheses[0];

    if (!topHypothesis) {
      return `Analysis of ${subject} did not yield specific root cause hypotheses.`;
    }

    const domainContext = domains.length > 0 ? `in the ${domains.join(", ")} domain(s)` : "";

    return (
      `Root cause analysis for ${subject} ${domainContext}: ` +
      `The most likely cause is: ${topHypothesis.statement} ` +
      `(likelihood: ${Math.round(topHypothesis.likelihood * 100)}%). ` +
      `${hypotheses.length > 1 ? `${hypotheses.length - 1} alternative hypotheses have also been identified.` : ""}`
    );
  }

  /**
   * Generate conclusion summary
   *
   * @param matches - Pattern match results
   * @param hypotheses - Generated hypotheses
   * @param keyTerms - Key terms for personalization
   * @returns Conclusion text
   */
  private generateConclusion(
    matches: PatternMatchResult[],
    hypotheses: GeneratedHypothesis[],
    keyTerms: KeyTerms
  ): string {
    const subject = keyTerms.primarySubject ?? "the system";
    const confidence = this.calculateOverallConfidence(matches);
    const confidenceLevel =
      confidence >= 0.7 ? "high" : confidence >= 0.4 ? "moderate" : "preliminary";

    if (hypotheses.length === 0) {
      return `Analysis of ${subject} requires additional information to draw conclusions.`;
    }

    const topHypothesis = hypotheses[0];
    const actionableSteps = topHypothesis.investigationSteps.slice(0, 2).join("; ");

    return (
      `With ${confidenceLevel} confidence, the analysis suggests investigating ${topHypothesis.statement.toLowerCase()}. ` +
      `Recommended next steps: ${actionableSteps}. ` +
      `Estimated investigation time: ${topHypothesis.estimatedTime}.`
    );
  }

  /**
   * Calculate overall confidence from pattern matches
   *
   * Uses weighted average based on match confidence.
   *
   * @param matches - Pattern match results
   * @returns Overall confidence score (0-1)
   */
  private calculateOverallConfidence(matches: PatternMatchResult[]): number {
    if (matches.length === 0) return 0;

    // Use the highest confidence match as the primary indicator
    const maxConfidence = Math.max(...matches.map((m) => m.confidence));

    // Boost slightly if multiple domains match (indicates broader coverage)
    const uniqueDomains = new Set(matches.map((m) => m.domain)).size;
    const domainBoost = Math.min(0.1, (uniqueDomains - 1) * 0.05);

    return Math.min(1, maxConfidence + domainBoost);
  }
}

/**
 * Create a new InsightGenerator instance
 *
 * @param options - Configuration options
 * @returns A new InsightGenerator
 */
export function createInsightGenerator(options?: InsightGeneratorOptions): InsightGenerator {
  return new InsightGenerator(options);
}
