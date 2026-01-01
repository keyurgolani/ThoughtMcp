/**
 * Pattern Matcher
 *
 * Matches problem text against registered patterns and returns scored matches.
 * Supports exact phrase matching, fuzzy keyword matching, and regex patterns.
 * Integrates with key term extraction for enhanced scoring.
 *
 * Requirements: 3.1, 3.6
 */

import type { KeyTerms } from "../key-term-extractor.js";
import type { PatternRegistry } from "./pattern-registry.js";
import type {
  DomainPattern,
  GeneratedHypothesis,
  GeneratedRecommendation,
  MatchedIndicator,
  PatternIndicator,
  PatternMatchResult,
} from "./types.js";

/**
 * Pattern Matcher class
 *
 * Matches problem text against registered patterns and calculates confidence scores.
 */
export class PatternMatcher {
  /** Pattern registry for accessing patterns */
  private readonly registry: PatternRegistry;

  /** Cache for compiled regex patterns */
  private readonly regexCache: Map<string, RegExp> = new Map();

  /**
   * Create a new PatternMatcher
   *
   * @param registry - Pattern registry to use for pattern access
   */
  constructor(registry: PatternRegistry) {
    this.registry = registry;
  }

  /**
   * Match problem text against all patterns
   *
   * Returns scored matches for all patterns that match with confidence > 0.
   * Results are sorted by confidence score (highest first).
   *
   * @param problem - Problem description text
   * @param context - Optional additional context
   * @param keyTerms - Extracted key terms from the problem
   * @returns Array of pattern match results sorted by confidence
   *
   * Requirements: 3.1, 3.6
   */
  matchPatterns(
    problem: string,
    context: string | undefined,
    keyTerms: KeyTerms
  ): PatternMatchResult[] {
    const results: PatternMatchResult[] = [];
    const fullText = context ? `${problem} ${context}` : problem;

    // Get all patterns from all domains
    const domains = this.registry.getDomains();

    for (const domain of domains) {
      const patterns = this.registry.getPatternsByDomain(domain);

      for (const pattern of patterns) {
        const matchResult = this.matchPattern(pattern, domain, fullText, keyTerms);

        // Only include patterns with positive confidence
        if (matchResult.confidence > 0) {
          results.push(matchResult);
        }
      }
    }

    // Sort by confidence (highest first)
    results.sort((a, b) => b.confidence - a.confidence);

    return results;
  }

  /**
   * Calculate confidence score for a pattern match
   *
   * Scores are based on:
   * - Indicator matches (weighted by indicator weight)
   * - Negative indicator matches (reduce score)
   * - Key term category boosts
   *
   * @param pattern - Pattern to score
   * @param text - Text to match against
   * @param keyTerms - Extracted key terms
   * @returns Confidence score between 0 and 1
   *
   * Requirements: 3.1, 3.6
   */
  scoreMatch(pattern: DomainPattern, text: string, keyTerms: KeyTerms): number {
    const { positiveScore } = this.calculatePositiveScore(pattern.indicators, text, keyTerms);

    // Calculate negative indicator score reduction
    const negativeScore = this.calculateNegativeScore(pattern.negativeIndicators ?? [], text);

    // Final score is positive score minus negative score, clamped to [0, 1]
    const finalScore = Math.max(0, Math.min(1, positiveScore - negativeScore));

    return finalScore;
  }

  /**
   * Match a single pattern against text
   *
   * @param pattern - Pattern to match
   * @param domain - Domain the pattern belongs to
   * @param text - Text to match against
   * @param keyTerms - Extracted key terms
   * @returns Pattern match result
   */
  private matchPattern(
    pattern: DomainPattern,
    domain: string,
    text: string,
    keyTerms: KeyTerms
  ): PatternMatchResult {
    const { positiveScore, matchedIndicators } = this.calculatePositiveScore(
      pattern.indicators,
      text,
      keyTerms
    );

    // Calculate negative indicator score reduction
    const negativeScore = this.calculateNegativeScore(pattern.negativeIndicators ?? [], text);

    // Calculate domain-level boost from key terms
    const domainBoost = this.calculateDomainBoost(domain, keyTerms);

    // Apply domain boost to positive score before subtracting negative
    const boostedPositiveScore = positiveScore * (1 + domainBoost);

    // Final confidence is boosted positive score minus negative score, clamped to [0, 1]
    const confidence = Math.max(0, Math.min(1, boostedPositiveScore - negativeScore));

    // Generate hypotheses and recommendations (placeholder - will be enhanced in InsightGenerator)
    const hypotheses = this.generateBasicHypotheses(pattern, keyTerms, confidence);
    const recommendations = this.generateBasicRecommendations(pattern, keyTerms);

    return {
      patternId: pattern.id,
      domain,
      confidence,
      matchedIndicators,
      hypotheses,
      recommendations,
      severity: pattern.severity,
    };
  }

  /**
   * Calculate positive score from matching indicators
   *
   * @param indicators - Indicators to match
   * @param text - Text to match against
   * @param keyTerms - Extracted key terms
   * @returns Positive score and matched indicators
   */
  private calculatePositiveScore(
    indicators: PatternIndicator[],
    text: string,
    keyTerms: KeyTerms
  ): { positiveScore: number; matchedIndicators: MatchedIndicator[] } {
    const matchedIndicators: MatchedIndicator[] = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const indicator of indicators) {
      totalWeight += indicator.weight;

      const matchResult = this.matchIndicator(indicator, text);

      if (matchResult.matched) {
        let scoreContribution = indicator.weight;

        // Apply key term category boost if applicable
        if (indicator.keyTermCategory) {
          const boost = this.calculateKeyTermBoost(
            indicator.keyTermCategory,
            keyTerms,
            indicator.value
          );
          scoreContribution *= 1 + boost;
        }

        matchedWeight += scoreContribution;

        matchedIndicators.push({
          indicator,
          matchedText: matchResult.matchedText,
          scoreContribution,
        });
      }
    }

    // Normalize score to [0, 1] based on total possible weight
    const positiveScore = totalWeight > 0 ? matchedWeight / totalWeight : 0;

    return { positiveScore, matchedIndicators };
  }

  /**
   * Calculate negative score from matching negative indicators
   *
   * @param negativeIndicators - Negative indicators to match
   * @param text - Text to match against
   * @returns Negative score to subtract from positive score
   */
  private calculateNegativeScore(negativeIndicators: PatternIndicator[], text: string): number {
    if (negativeIndicators.length === 0) {
      return 0;
    }

    let negativeScore = 0;

    for (const indicator of negativeIndicators) {
      const matchResult = this.matchIndicator(indicator, text);

      if (matchResult.matched) {
        negativeScore += indicator.weight;
      }
    }

    return negativeScore;
  }

  /**
   * Calculate domain-level boost from key terms
   *
   * Boosts pattern scores when extracted domain terms match the pattern's domain.
   * This implements requirement 6.4: "WHEN Key_Term_Extractor identifies domain-specific
   * terms, THE Domain_Classifier SHALL boost corresponding domain scores"
   *
   * @param domain - Domain the pattern belongs to
   * @param keyTerms - Extracted key terms
   * @returns Boost multiplier (0 to 0.3)
   *
   * Requirements: 6.1, 6.4
   */
  private calculateDomainBoost(domain: string, keyTerms: KeyTerms): number {
    if (!keyTerms.domainTerms || keyTerms.domainTerms.length === 0) {
      return 0;
    }

    const domainLower = domain.toLowerCase();
    const domainWords = domainLower.split(/[-_\s]+/).filter((w) => w.length > 2);

    let boost = 0;

    for (const term of keyTerms.domainTerms) {
      const termLower = term.toLowerCase();

      // Direct match: domain name contains the term or vice versa
      if (domainLower.includes(termLower) || termLower.includes(domainLower)) {
        boost = Math.max(boost, 0.3);
        break;
      }

      // Word-level match: any domain word matches the term
      for (const domainWord of domainWords) {
        if (termLower.includes(domainWord) || domainWord.includes(termLower)) {
          boost = Math.max(boost, 0.2);
        }
      }

      // Related domain terms mapping
      const relatedTerms = this.getRelatedDomainTerms(domainLower);
      if (relatedTerms.some((rt) => termLower.includes(rt) || rt.includes(termLower))) {
        boost = Math.max(boost, 0.15);
      }
    }

    return boost;
  }

  /**
   * Get related terms for a domain
   *
   * Maps domain names to related technical terms that indicate relevance.
   *
   * @param domain - Domain name (lowercase)
   * @returns Array of related terms
   */
  private getRelatedDomainTerms(domain: string): string[] {
    const domainTermMap: Record<string, string[]> = {
      database: ["sql", "query", "index", "table", "postgresql", "mysql", "mongodb", "redis"],
      api: ["endpoint", "rest", "graphql", "http", "request", "response", "route"],
      security: [
        "auth",
        "authentication",
        "authorization",
        "encryption",
        "vulnerability",
        "access",
      ],
      performance: ["latency", "throughput", "optimization", "cache", "speed", "slow"],
      infrastructure: ["server", "deployment", "kubernetes", "docker", "cloud", "scaling"],
      "customer-engagement": [
        "customer",
        "user",
        "retention",
        "churn",
        "engagement",
        "satisfaction",
      ],
      "project-management": ["project", "schedule", "deadline", "milestone", "resource", "scope"],
      "root-cause-analysis": ["root", "cause", "analysis", "investigation", "diagnosis"],
    };

    return domainTermMap[domain] ?? [];
  }

  /**
   * Match a single indicator against text
   *
   * @param indicator - Indicator to match
   * @param text - Text to match against
   * @returns Match result with matched flag and matched text
   */
  private matchIndicator(
    indicator: PatternIndicator,
    text: string
  ): { matched: boolean; matchedText: string } {
    switch (indicator.type) {
      case "exact":
        return this.matchExact(indicator.value, text);
      case "fuzzy":
        return this.matchFuzzy(indicator.value, text);
      case "regex":
        return this.matchRegex(indicator.value, text);
      default:
        return { matched: false, matchedText: "" };
    }
  }

  /**
   * Match exact phrase (case-insensitive)
   *
   * @param phrase - Phrase to match
   * @param text - Text to search in
   * @returns Match result
   *
   * Requirements: 3.2
   */
  private matchExact(phrase: string, text: string): { matched: boolean; matchedText: string } {
    const lowerText = text.toLowerCase();
    const lowerPhrase = phrase.toLowerCase();

    const index = lowerText.indexOf(lowerPhrase);

    if (index !== -1) {
      // Return the actual matched text (preserving original case)
      const matchedText = text.substring(index, index + phrase.length);
      return { matched: true, matchedText };
    }

    return { matched: false, matchedText: "" };
  }

  /**
   * Match fuzzy keywords (all keywords must be present, any order)
   *
   * @param keywords - Space-separated keywords to match
   * @param text - Text to search in
   * @returns Match result
   *
   * Requirements: 3.3
   */
  private matchFuzzy(keywords: string, text: string): { matched: boolean; matchedText: string } {
    const lowerText = text.toLowerCase();
    const keywordList = keywords
      .toLowerCase()
      .split(/\s+/)
      .filter((k) => k.length > 0);

    if (keywordList.length === 0) {
      return { matched: false, matchedText: "" };
    }

    // All keywords must be present
    const allPresent = keywordList.every((keyword) => lowerText.includes(keyword));

    if (allPresent) {
      // Return the keywords as matched text
      return { matched: true, matchedText: keywords };
    }

    return { matched: false, matchedText: "" };
  }

  /**
   * Match regex pattern
   *
   * @param pattern - Regex pattern string
   * @param text - Text to search in
   * @returns Match result
   *
   * Requirements: 3.4
   */
  private matchRegex(pattern: string, text: string): { matched: boolean; matchedText: string } {
    try {
      // Get or compile regex (with caching)
      let regex = this.regexCache.get(pattern);

      if (!regex) {
        regex = new RegExp(pattern, "i"); // Case-insensitive
        this.regexCache.set(pattern, regex);
      }

      const match = text.match(regex);

      if (match) {
        return { matched: true, matchedText: match[0] };
      }

      return { matched: false, matchedText: "" };
    } catch {
      // Invalid regex - log and return no match
      return { matched: false, matchedText: "" };
    }
  }

  /**
   * Calculate key term category boost
   *
   * Boosts scores when key terms match indicator categories.
   * The boost is calculated based on:
   * 1. The presence of terms in the specified category
   * 2. The relevance of those terms to the indicator value
   *
   * @param category - Key term category to check
   * @param keyTerms - Extracted key terms
   * @param indicatorValue - Optional indicator value to check for relevance
   * @returns Boost multiplier (0 to 0.5)
   *
   * Requirements: 6.1, 6.2, 6.4
   */
  private calculateKeyTermBoost(
    category: "domainTerms" | "actionVerbs" | "nounPhrases" | "terms",
    keyTerms: KeyTerms,
    indicatorValue?: string
  ): number {
    const categoryTerms = keyTerms[category];

    if (!categoryTerms || categoryTerms.length === 0) {
      return 0;
    }

    // Base boost from having terms in the category (max 0.3)
    const baseBoost = Math.min(0.3, categoryTerms.length * 0.1);

    // Additional relevance boost if indicator value matches any key term (max 0.2)
    let relevanceBoost = 0;
    if (indicatorValue) {
      const indicatorLower = indicatorValue.toLowerCase();
      const indicatorWords = indicatorLower.split(/\s+/).filter((w) => w.length > 2);

      for (const term of categoryTerms) {
        const termLower = term.toLowerCase();

        // Check if indicator contains the term or term contains indicator words
        if (indicatorLower.includes(termLower) || termLower.includes(indicatorLower)) {
          relevanceBoost = 0.2;
          break;
        }

        // Check for word overlap between indicator and term
        const termWords = termLower.split(/\s+/).filter((w) => w.length > 2);
        const hasOverlap = indicatorWords.some((iw) =>
          termWords.some((tw) => tw.includes(iw) || iw.includes(tw))
        );
        if (hasOverlap) {
          relevanceBoost = Math.max(relevanceBoost, 0.15);
        }
      }
    }

    // Total boost capped at 0.5
    return Math.min(0.5, baseBoost + relevanceBoost);
  }

  /**
   * Generate basic hypotheses from pattern templates
   *
   * This is a basic implementation - full template substitution
   * will be handled by InsightGenerator in task 6.
   *
   * @param pattern - Pattern with hypothesis templates
   * @param keyTerms - Key terms for substitution
   * @param confidence - Match confidence for likelihood adjustment
   * @returns Generated hypotheses
   */
  private generateBasicHypotheses(
    pattern: DomainPattern,
    keyTerms: KeyTerms,
    confidence: number
  ): GeneratedHypothesis[] {
    return pattern.hypotheses.map((template) => ({
      id: template.id,
      statement: this.substituteTemplate(template.statement, keyTerms),
      investigationSteps: template.investigationSteps.map((step) =>
        this.substituteTemplate(step, keyTerms)
      ),
      expectedFindings: template.expectedFindings,
      relatedHypotheses: template.relatedHypotheses,
      estimatedTime: template.estimatedTime,
      likelihood: template.likelihood * confidence, // Adjust by match confidence
      sourcePatternId: pattern.id,
    }));
  }

  /**
   * Generate basic recommendations from pattern templates
   *
   * This is a basic implementation - full template substitution
   * will be handled by InsightGenerator in task 6.
   *
   * @param pattern - Pattern with recommendation templates
   * @param keyTerms - Key terms for substitution
   * @returns Generated recommendations
   */
  private generateBasicRecommendations(
    pattern: DomainPattern,
    keyTerms: KeyTerms
  ): GeneratedRecommendation[] {
    return pattern.recommendations.map((template) => ({
      id: template.id,
      type: template.type,
      action: this.substituteTemplate(template.action, keyTerms),
      tools: template.tools,
      expectedOutcome: template.expectedOutcome,
      prerequisites: template.prerequisites,
      priority: template.priority,
      documentationLinks: template.documentationLinks,
      sourcePatternId: pattern.id,
    }));
  }

  /**
   * Substitute template placeholders with key terms
   *
   * Supported placeholders:
   * - {{primarySubject}} - Primary subject from key terms
   * - {{domainTerms}} - Comma-separated domain terms
   * - {{actionVerbs}} - Comma-separated action verbs
   *
   * @param template - Template string with placeholders
   * @param keyTerms - Key terms for substitution
   * @returns Template with placeholders replaced
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

    return result;
  }

  /**
   * Clear the regex cache
   *
   * Useful for testing or when patterns are reloaded.
   */
  clearCache(): void {
    this.regexCache.clear();
  }
}

/**
 * Create a new PatternMatcher instance
 *
 * @param registry - Pattern registry to use
 * @returns A new PatternMatcher
 */
export function createPatternMatcher(registry: PatternRegistry): PatternMatcher {
  return new PatternMatcher(registry);
}
