/**
 * Problem Complexity Analyzer
 *
 * Analyzes problem complexity based on word count and patterns to scale
 * analysis depth appropriately. Simple problems get concise responses,
 * complex problems get thorough multi-step analysis.
 *
 * Requirements: 15.1, 15.2
 */

/**
 * Complexity level enumeration
 *
 * Classifies problems into four complexity tiers that determine
 * the appropriate depth of analysis.
 */
export enum ComplexityLevel {
  /** Very simple, direct questions (e.g., "What is 2+2?") */
  TRIVIAL = "trivial",
  /** Simple problems requiring minimal analysis */
  SIMPLE = "simple",
  /** Moderate problems requiring structured analysis */
  MODERATE = "moderate",
  /** Complex problems requiring thorough multi-step analysis */
  COMPLEX = "complex",
}

/**
 * Factors contributing to complexity assessment
 *
 * Tracks individual factors that influence the overall complexity score.
 */
export interface ComplexityFactors {
  /** Word count of the problem statement */
  wordCount: number;
  /** Number of distinct questions or parts */
  questionCount: number;
  /** Density of technical terms (0-1) */
  technicalDensity: number;
  /** Number of nested clauses or conditions */
  nestedClauseCount: number;
  /** Whether problem involves multiple domains */
  multiDomain: boolean;
  /** Whether problem requires temporal reasoning */
  temporalReasoning: boolean;
  /** Whether problem involves trade-offs or comparisons */
  hasTradeoffs: boolean;
}

/**
 * Result of complexity analysis
 *
 * Contains the complexity level, numeric score, contributing factors,
 * and recommended analysis depth.
 */
export interface ComplexityAnalysis {
  /** Classified complexity level */
  level: ComplexityLevel;
  /** Numeric complexity score (0-1) */
  score: number;
  /** Factors that contributed to the assessment */
  factors: ComplexityFactors;
  /** Recommended analysis depth (1-5) */
  recommendedDepth: number;
  /** Recommended number of reasoning steps */
  recommendedSteps: number;
  /** Whether to include detailed sub-problem decomposition */
  shouldDecompose: boolean;
}

/**
 * Simple question patterns that indicate trivial complexity
 */
const TRIVIAL_PATTERNS = [
  /^what is \d+\s*[+\-*/]\s*\d+\??$/i, // "What is 2+2?"
  /^what('s| is) the (sum|difference|product|quotient) of \d+ and \d+\??$/i,
  /^how much is \d+\s*[+\-*/]\s*\d+\??$/i,
  /^define \w+\.?$/i, // "Define X"
  /^what does \w+ mean\??$/i, // "What does X mean?"
  /^what is (a|an|the) \w+\??$/i, // "What is a X?"
  /^is \w+ (true|false|correct|wrong)\??$/i, // "Is X true?"
  /^yes or no:/i, // "Yes or no: ..."
  /^true or false:/i, // "True or false: ..."
];

/**
 * Patterns indicating complex multi-part questions
 */
const COMPLEX_PATTERNS = [
  /\b(and|or)\b.*\b(and|or)\b/i, // Multiple conjunctions
  /\b(compare|contrast|analyze|evaluate|assess)\b/i,
  /\b(trade-?off|pros and cons|advantages and disadvantages)\b/i,
  /\b(design|architect|implement|build|create) (a|an|the)? (system|application|platform|solution)\b/i,
  /\b(optimize|improve|enhance|scale)\b.*\b(while|without|maintaining)\b/i,
  /\b(if|when|unless|provided that|assuming)\b.*\b(then|otherwise|else)\b/i,
  /\b(first|second|third|finally|additionally|moreover|furthermore)\b/i,
  /\b(considering|given|taking into account)\b/i,
];

/**
 * Technical domain keywords
 */
const TECHNICAL_TERMS = new Set([
  // Software engineering
  "api",
  "database",
  "algorithm",
  "architecture",
  "microservice",
  "kubernetes",
  "docker",
  "ci/cd",
  "deployment",
  "scalability",
  "latency",
  "throughput",
  "concurrency",
  "parallelism",
  "distributed",
  "cache",
  "queue",
  "async",
  "synchronous",
  "asynchronous",
  "middleware",
  "framework",
  "library",
  "dependency",
  "injection",
  "interface",
  "abstraction",
  "polymorphism",
  "inheritance",
  "encapsulation",
  "refactor",
  "optimization",
  "performance",
  // Data science / ML
  "machine learning",
  "neural network",
  "deep learning",
  "model",
  "training",
  "inference",
  "dataset",
  "feature",
  "regression",
  "classification",
  "clustering",
  "embedding",
  "transformer",
  "attention",
  "gradient",
  "backpropagation",
  // Business / Strategy
  "stakeholder",
  "roi",
  "kpi",
  "metric",
  "strategy",
  "roadmap",
  "milestone",
  "deliverable",
  "requirement",
  "specification",
  "constraint",
  "scope",
  // Security
  "authentication",
  "authorization",
  "encryption",
  "vulnerability",
  "exploit",
  "penetration",
  "firewall",
  "ssl",
  "tls",
  "certificate",
  "token",
  "oauth",
]);

/**
 * Stop words to exclude from word count analysis
 */
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "were",
  "been",
  "be",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "need",
  "that",
  "this",
  "these",
  "those",
  "it",
  "its",
  "i",
  "we",
  "you",
  "they",
  "he",
  "she",
  "my",
  "our",
  "your",
  "their",
  "what",
  "which",
  "who",
  "whom",
  "how",
  "when",
  "where",
  "why",
]);

/**
 * Problem Complexity Analyzer
 *
 * Analyzes problem statements to determine appropriate analysis depth.
 * Uses word count, pattern matching, and domain detection to classify
 * problems and recommend analysis parameters.
 */
export class ProblemComplexityAnalyzer {
  /**
   * Analyze problem complexity
   *
   * @param problem - Problem statement to analyze
   * @param context - Optional additional context
   * @returns Complexity analysis result
   */
  analyze(problem: string, context?: string): ComplexityAnalysis {
    // Calculate individual factors
    const factors = this.calculateFactors(problem, context);

    // Calculate overall complexity score
    const score = this.calculateScore(factors, problem);

    // Determine complexity level
    const level = this.determineLevel(score, problem);

    // Calculate recommended parameters
    const recommendedDepth = this.calculateRecommendedDepth(level, factors);
    const recommendedSteps = this.calculateRecommendedSteps(level, factors);
    const shouldDecompose = this.shouldDecompose(level, factors);

    return {
      level,
      score,
      factors,
      recommendedDepth,
      recommendedSteps,
      shouldDecompose,
    };
  }

  /**
   * Calculate complexity factors from problem text
   */
  private calculateFactors(problem: string, context?: string): ComplexityFactors {
    const fullText = context ? `${problem} ${context}` : problem;

    return {
      wordCount: this.countMeaningfulWords(fullText),
      questionCount: this.countQuestions(problem),
      technicalDensity: this.calculateTechnicalDensity(fullText),
      nestedClauseCount: this.countNestedClauses(problem),
      multiDomain: this.detectMultipleDomains(fullText),
      temporalReasoning: this.detectTemporalReasoning(problem),
      hasTradeoffs: this.detectTradeoffs(problem),
    };
  }

  /**
   * Count meaningful words (excluding stop words)
   */
  private countMeaningfulWords(text: string): number {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
    return words.length;
  }

  /**
   * Count distinct questions in the pro
   */
  private countQuestions(text: string): number {
    // Count question marks
    const questionMarks = (text.match(/\?/g) ?? []).length;

    // Count question words at sentence starts
    const questionStarts = (
      text.match(
        /(?:^|[.!?]\s*)(what|who|when|where|why|how|which|can|could|would|should|is|are|do|does)/gi
      ) ?? []
    ).length;

    // Count enumerated items (1., 2., a., b., etc.)
    const enumeratedItems = (text.match(/(?:^|\n)\s*(?:\d+\.|[a-z]\.|[-•])\s/gi) ?? []).length;

    return Math.max(1, questionMarks + Math.floor(questionStarts / 2) + enumeratedItems);
  }

  /**
   * Calculate density of technical terms
   */
  private calculateTechnicalDensity(text: string): number {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (words.length === 0) return 0;

    let technicalCount = 0;
    for (const word of words) {
      if (TECHNICAL_TERMS.has(word)) {
        technicalCount++;
      }
    }

    // Also check for compound technical terms
    const textLower = text.toLowerCase();
    for (const term of TECHNICAL_TERMS) {
      if (term.includes(" ") && textLower.includes(term)) {
        technicalCount++;
      }
    }

    return Math.min(1, technicalCount / Math.max(10, words.length / 5));
  }

  /**
   * Count nested clauses and conditions
   */
  private countNestedClauses(text: string): number {
    const clauseIndicators = [
      /\b(if|when|while|unless|although|because|since|whereas|provided|assuming)\b/gi,
      /\b(that|which|who|whom|whose)\b/gi,
      /[,;]\s*(and|but|or|however|therefore|thus|hence)\b/gi,
    ];

    let count = 0;
    for (const pattern of clauseIndicators) {
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  /**
   * Detect if problem spans multiple domains
   */
  private detectMultipleDomains(text: string): boolean {
    const domains = {
      technical: /\b(code|software|system|api|database|server|application)\b/i,
      business: /\b(customer|revenue|cost|profit|market|strategy|stakeholder)\b/i,
      design: /\b(user|interface|experience|ux|ui|design|layout|visual)\b/i,
      data: /\b(data|analytics|metrics|report|dashboard|insight)\b/i,
      security: /\b(security|auth|permission|access|encrypt|protect)\b/i,
      operations: /\b(deploy|monitor|scale|maintain|operate|infrastructure)\b/i,
    };

    let domainCount = 0;
    for (const pattern of Object.values(domains)) {
      if (pattern.test(text)) {
        domainCount++;
      }
    }

    return domainCount >= 2;
  }

  /**
   * Detect if problem requires temporal reasoning
   */
  private detectTemporalReasoning(text: string): boolean {
    const temporalPatterns = [
      /\b(before|after|during|while|until|since|when)\b.*\b(then|next|later|finally)\b/i,
      /\b(first|second|third|then|finally|eventually|subsequently)\b/i,
      /\b(timeline|schedule|deadline|milestone|phase|stage)\b/i,
      /\b(past|present|future|historical|upcoming|planned)\b/i,
    ];

    return temporalPatterns.some((p) => p.test(text));
  }

  /**
   * Detect if problem involves trade-offs
   */
  private detectTradeoffs(text: string): boolean {
    const tradeoffPatterns = [
      /\b(trade-?off|balance|versus|vs\.?|compared to)\b/i,
      /\b(pros and cons|advantages and disadvantages)\b/i,
      /\b(on one hand|on the other hand)\b/i,
      /\b(benefit|drawback|risk|reward)\b/i,
      /\b(optimize|maximize|minimize)\b.*\b(while|without|maintaining)\b/i,
    ];

    return tradeoffPatterns.some((p) => p.test(text));
  }

  /**
   * Calculate overall complexity score (0-1)
   */
  private calculateScore(factors: ComplexityFactors, problem: string): number {
    // Handle empty or minimal content as trivial
    if (factors.wordCount === 0) {
      return 0.1;
    }

    // Check for trivial patterns first
    if (this.isTrivialProblem(problem)) {
      return 0.1;
    }

    let score = 0;

    // Word count contribution (0-0.35) - increased weight
    if (factors.wordCount < 5) {
      score += 0.05;
    } else if (factors.wordCount < 15) {
      score += 0.15;
    } else if (factors.wordCount < 30) {
      score += 0.25;
    } else if (factors.wordCount < 60) {
      score += 0.3;
    } else {
      score += 0.35;
    }

    // Question count contribution (0-0.15)
    score += Math.min(0.15, (factors.questionCount - 1) * 0.05);

    // Technical density contribution (0-0.25) - increased weight
    score += factors.technicalDensity * 0.25;

    // Nested clause contribution (0-0.1)
    score += Math.min(0.1, factors.nestedClauseCount * 0.02);

    // Multi-domain contribution (0.15) - increased weight
    if (factors.multiDomain) {
      score += 0.15;
    }

    // Temporal reasoning contribution (0.05)
    if (factors.temporalReasoning) {
      score += 0.05;
    }

    // Trade-offs contribution (0.1) - increased weight
    if (factors.hasTradeoffs) {
      score += 0.1;
    }

    // Check for complex patterns - boost score significantly
    if (COMPLEX_PATTERNS.some((p) => p.test(problem))) {
      score = Math.max(score, 0.7);
    }

    return Math.min(1, score);
  }

  /**
   * Check if problem matches trivial patterns
   */
  private isTrivialProblem(problem: string): boolean {
    const trimmed = problem.trim();
    return TRIVIAL_PATTERNS.some((p) => p.test(trimmed));
  }

  /**
   * Determine complexity level from score
   */
  private determineLevel(score: number, problem: string): ComplexityLevel {
    // Override for trivial patterns
    if (this.isTrivialProblem(problem)) {
      return ComplexityLevel.TRIVIAL;
    }

    // Empty or minimal content is trivial
    if (problem.trim().length === 0) {
      return ComplexityLevel.TRIVIAL;
    }

    if (score < 0.2) {
      return ComplexityLevel.TRIVIAL;
    } else if (score < 0.35) {
      return ComplexityLevel.SIMPLE;
    } else if (score < 0.65) {
      return ComplexityLevel.MODERATE;
    } else {
      return ComplexityLevel.COMPLEX;
    }
  }

  /**
   * Calculate recommended analysis depth (1-5)
   */
  private calculateRecommendedDepth(level: ComplexityLevel, factors: ComplexityFactors): number {
    const baseDepth: Record<ComplexityLevel, number> = {
      [ComplexityLevel.TRIVIAL]: 1,
      [ComplexityLevel.SIMPLE]: 2,
      [ComplexityLevel.MODERATE]: 3,
      [ComplexityLevel.COMPLEX]: 4,
    };

    let depth = baseDepth[level];

    // Adjust for multi-domain problems
    if (factors.multiDomain && depth < 5) {
      depth++;
    }

    // Adjust for multiple questions
    if (factors.questionCount > 3 && depth < 5) {
      depth++;
    }

    return Math.min(5, depth);
  }

  /**
   * Calculate recommended number of reasoning steps
   */
  private calculateRecommendedSteps(level: ComplexityLevel, factors: ComplexityFactors): number {
    const baseSteps: Record<ComplexityLevel, number> = {
      [ComplexityLevel.TRIVIAL]: 1,
      [ComplexityLevel.SIMPLE]: 2,
      [ComplexityLevel.MODERATE]: 4,
      [ComplexityLevel.COMPLEX]: 6,
    };

    let steps = baseSteps[level];

    // Add steps for each additional question
    steps += Math.max(0, factors.questionCount - 1);

    // Add steps for nested clauses
    steps += Math.floor(factors.nestedClauseCount / 3);

    // Cap at reasonable maximum
    return Math.min(10, steps);
  }

  /**
   * Determine if problem should be decomposed into sub-problems
   */
  private shouldDecompose(level: ComplexityLevel, factors: ComplexityFactors): boolean {
    // Never decompose trivial problems
    if (level === ComplexityLevel.TRIVIAL) {
      return false;
    }

    // Simple problems only decompose if multi-part
    if (level === ComplexityLevel.SIMPLE) {
      return factors.questionCount > 2 || factors.multiDomain;
    }

    // Moderate and complex problems should decompose
    return true;
  }
}
