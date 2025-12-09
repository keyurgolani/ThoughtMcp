/**
 * Key Term Extractor
 *
 * Extracts meaningful key terms from problem statements and context
 * for use in generating problem-specific insights in reasoning streams.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 15.3, 15.4
 */

/**
 * Stop words to exclude from key term extraction
 * Includes common question starters and filler words that produce awkward output
 */
const STOP_WORDS = new Set([
  // Articles and conjunctions
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  // Prepositions
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
  "about",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  // Verbs (common)
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
  "being",
  "having",
  "doing",
  "get",
  "got",
  "getting",
  "make",
  "made",
  "making",
  // Pronouns
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
  // Question words (CRITICAL: these cause "should we" type issues)
  "how",
  "what",
  "when",
  "where",
  "why",
  "which",
  "who",
  "whom",
  // Adverbs and modifiers
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "all",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "also",
  "now",
  // Conjunctions and connectors
  "because",
  "while",
  "although",
  "though",
  "if",
  "unless",
  "until",
  "since",
  "whether",
  "both",
  "either",
  "neither",
  // Quantifiers
  "any",
  "every",
  "much",
  "many",
  "several",
  "various",
  "certain",
  "another",
  // Indefinite pronouns
  "something",
  "anything",
  "everything",
  "nothing",
  "someone",
  "anyone",
  "everyone",
  "nobody",
  // Generic nouns (produce vague output)
  "problem",
  "issue",
  "question",
  "solution",
  "approach",
  "way",
  "thing",
  "things",
  "stuff",
  "kind",
  "type",
  "sort",
  "lot",
  "lots",
  "bit",
  "part",
  "parts",
  // NEW: Common question/statement starters that cause awkward extraction
  "decide",
  "deciding",
  "consider",
  "considering",
  "think",
  "thinking",
  "want",
  "wanting",
  "like",
  "looking",
  "trying",
  "going",
  "best",
  "better",
  "good",
  "new",
  "old",
  "first",
  "last",
  "next",
  "different",
  "same",
  "right",
  "wrong",
  "able",
  "possible",
  "necessary",
  "important",
  "sure",
  "really",
  "actually",
  "basically",
  "currently",
  "already",
  "still",
  "yet",
  "even",
  "ever",
]);

/**
 * Domain-specific technical terms that should be prioritized
 */
const DOMAIN_TERMS = new Set([
  // Software engineering
  "api",
  "database",
  "server",
  "client",
  "frontend",
  "backend",
  "microservice",
  "kubernetes",
  "docker",
  "deployment",
  "scalability",
  "latency",
  "throughput",
  "concurrency",
  "cache",
  "queue",
  "async",
  "middleware",
  "framework",
  "library",
  "interface",
  "authentication",
  "authorization",
  "encryption",
  "security",
  "performance",
  "optimization",
  "algorithm",
  "architecture",
  // Business
  "customer",
  "user",
  "revenue",
  "cost",
  "profit",
  "market",
  "strategy",
  "stakeholder",
  "engagement",
  "conversion",
  "retention",
  "acquisition",
  "growth",
  "metric",
  "kpi",
  "roi",
  // Data
  "data",
  "analytics",
  "model",
  "training",
  "inference",
  "dataset",
  "feature",
  "prediction",
  "classification",
  "clustering",
  "embedding",
  // Design
  "design",
  "ux",
  "ui",
  "interface",
  "experience",
  "usability",
  "accessibility",
  "layout",
  "navigation",
  "workflow",
]);

/**
 * Result of key term extraction
 */
export interface KeyTerms {
  /** All extracted key terms */
  terms: string[];
  /** Domain-specific technical terms found */
  domainTerms: string[];
  /** Action verbs found in the problem */
  actionVerbs: string[];
  /** Noun phrases (compound terms) */
  nounPhrases: string[];
  /** Primary subject of the problem */
  primarySubject: string | null;
}

/**
 * Key Term Extractor
 *
 * Extracts meaningful terms from problem statements for use in
 * generating problem-specific insights.
 */
export class KeyTermExtractor {
  /**
   * Extract key terms from problem text
   *
   * @param problem - Problem description
   * @param context - Optional additional context
   * @returns Extracted key terms
   */
  extract(problem: string, context?: string): KeyTerms {
    const fullText = context ? `${problem} ${context}` : problem;

    const terms = this.extractTerms(fullText);
    const domainTerms = this.extractDomainTerms(fullText);
    const actionVerbs = this.extractActionVerbs(problem);
    const nounPhrases = this.extractNounPhrases(fullText);
    const primarySubject = this.extractPrimarySubject(problem);

    return {
      terms,
      domainTerms,
      actionVerbs,
      nounPhrases,
      primarySubject,
    };
  }

  /**
   * Extract all meaningful terms (excluding stop words)
   */
  private extractTerms(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    // Return unique terms, preserving order of first occurrence
    return [...new Set(words)];
  }

  /**
   * Extract domain-specific technical terms
   */
  private extractDomainTerms(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/);

    const found: string[] = [];
    for (const word of words) {
      if (DOMAIN_TERMS.has(word) && !found.includes(word)) {
        found.push(word);
      }
    }

    return found;
  }

  /**
   * Extract action verbs from problem statement
   */
  private extractActionVerbs(text: string): string[] {
    const actionVerbPatterns = [
      /\b(improve|improving|improved)\b/gi,
      /\b(increase|increasing|increased)\b/gi,
      /\b(decrease|decreasing|decreased)\b/gi,
      /\b(reduce|reducing|reduced)\b/gi,
      /\b(optimize|optimizing|optimized)\b/gi,
      /\b(build|building|built)\b/gi,
      /\b(create|creating|created)\b/gi,
      /\b(design|designing|designed)\b/gi,
      /\b(implement|implementing|implemented)\b/gi,
      /\b(develop|developing|developed)\b/gi,
      /\b(fix|fixing|fixed)\b/gi,
      /\b(solve|solving|solved)\b/gi,
      /\b(analyze|analyzing|analyzed)\b/gi,
      /\b(evaluate|evaluating|evaluated)\b/gi,
      /\b(assess|assessing|assessed)\b/gi,
      /\b(scale|scaling|scaled)\b/gi,
      /\b(migrate|migrating|migrated)\b/gi,
      /\b(integrate|integrating|integrated)\b/gi,
      /\b(automate|automating|automated)\b/gi,
      /\b(streamline|streamlining|streamlined)\b/gi,
    ];

    const verbs: string[] = [];
    for (const pattern of actionVerbPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        // Normalize to base form
        const baseForm = matches[0].toLowerCase().replace(/(ing|ed|s)$/, "");
        if (!verbs.includes(baseForm)) {
          verbs.push(baseForm);
        }
      }
    }

    return verbs;
  }

  /**
   * Extract noun phrases (compound terms)
   */
  private extractNounPhrases(text: string): string[] {
    const phrases: string[] = [];

    // Common compound patterns
    const compoundPatterns = [
      /\b(\w+)\s+(system|service|platform|application|tool|engine|manager|handler|processor|controller|module|component|layer|interface|api|database|server|client)\b/gi,
      /\b(user|customer|admin|system|data|file|memory|cache|queue|event|message|request|response|error|log)\s+(\w+)\b/gi,
      /\b(\w+)\s+(rate|time|count|size|limit|threshold|score|weight|factor|level|status|state|mode|type|format)\b/gi,
    ];

    for (const pattern of compoundPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const phrase = match[0].toLowerCase();
        if (!phrases.includes(phrase) && !STOP_WORDS.has(match[1].toLowerCase())) {
          phrases.push(phrase);
        }
      }
    }

    return phrases;
  }

  /**
   * Extract the primary subject of the problem
   *
   * Focuses on extracting meaningful noun phrases rather than
   * partial question fragments like "should we" or "design a"
   */
  private extractPrimarySubject(problem: string): string | null {
    // First, try to extract meaningful noun phrases after action verbs
    const actionVerbPatterns = [
      // "migrate to microservices" -> "microservices"
      /\b(?:migrate|migrating)\s+(?:to|from)\s+(\w+(?:\s+\w+)?)/i,
      // "build a real-time system" -> "real-time system"
      /\b(?:build|create|design|develop|implement)\s+(?:a|an|the)?\s*(\w+(?:[-\s]\w+)*\s+(?:system|service|platform|application|app|tool|feature|module|component|api|database|server|client|interface|engine))/i,
      // "improve user engagement" -> "user engagement"
      /\b(?:improve|increase|decrease|reduce|optimize|enhance|fix|solve)\s+(?:the|our|my|a|an)?\s*(\w+\s+\w+)/i,
      // "the authentication system" -> "authentication system"
      /\b(?:the|our|my|this)\s+(\w+\s+(?:system|service|platform|application|app|tool|feature|module|component|api|database|server|client|interface|engine|process|workflow|pipeline))/i,
    ];

    for (const pattern of actionVerbPatterns) {
      const match = problem.match(pattern);
      if (match?.[1]) {
        const subject = match[1].toLowerCase().trim();
        // Validate: must have at least one non-stop word
        const words = subject.split(/\s+/);
        const hasSubstantiveWord = words.some((w) => w.length > 2 && !STOP_WORDS.has(w));
        if (hasSubstantiveWord) {
          return subject;
        }
      }
    }

    // Try simpler patterns for single-word subjects
    const simplePatterns = [
      /\b(?:the|our|my|this)\s+(\w{4,})\b/i,
      /\b(?:improve|increase|decrease|reduce|optimize|build|create|design|implement|develop|fix|solve)\s+(?:the|our|my|a|an)?\s*(\w{4,})\b/i,
    ];

    for (const pattern of simplePatterns) {
      const match = problem.match(pattern);
      if (match?.[1]) {
        const subject = match[1].toLowerCase().trim();
        if (!STOP_WORDS.has(subject)) {
          return subject;
        }
      }
    }

    // Fall back to first domain term or meaningful term
    const terms = this.extractTerms(problem);
    const domainTerms = this.extractDomainTerms(problem);

    // Prefer domain terms as they're more specific
    if (domainTerms.length > 0) {
      return domainTerms[0];
    }

    // Filter out any remaining stop words and short terms
    const meaningfulTerms = terms.filter((t) => t.length > 3 && !STOP_WORDS.has(t));
    return meaningfulTerms.length > 0 ? meaningfulTerms[0] : null;
  }

  /**
   * Get a formatted string of key terms for use in insights
   *
   * Produces grammatically correct output by:
   * 1. Prioritizing meaningful domain terms and noun phrases
   * 2. Filtering out partial phrases and stop words
   * 3. Ensuring terms make sense in context
   *
   * @param keyTerms - Extracted key terms
   * @param maxTerms - Maximum number of terms to include
   * @returns Formatted string of terms
   */
  formatTermsForInsight(keyTerms: KeyTerms, maxTerms: number = 3): string {
    const prioritized: string[] = [];

    // First priority: primary subject (most specific)
    this.addIfValid(keyTerms.primarySubject, prioritized, maxTerms);

    // Second priority: domain terms (technical specificity)
    this.addTermsIfValid(keyTerms.domainTerms, prioritized, maxTerms);

    // Third priority: noun phrases (compound terms)
    this.addTermsIfValid(keyTerms.nounPhrases, prioritized, maxTerms);

    // Fourth priority: general terms (filtered)
    this.addTermsIfValid(keyTerms.terms, prioritized, maxTerms);

    // If we still have nothing, return a generic but grammatically correct fallback
    return prioritized.length === 0 ? "the system" : prioritized.join(", ");
  }

  /** Check if a term is meaningful (not a stop word or too short) */
  private isValidTerm(term: string | null | undefined): boolean {
    if (!term || term.length < 3) return false;
    const words = term.toLowerCase().split(/\s+/);
    return words.some((w) => w.length > 2 && !STOP_WORDS.has(w));
  }

  /** Add a single term if valid and not already present */
  private addIfValid(term: string | null | undefined, list: string[], maxTerms: number): void {
    if (list.length < maxTerms && term && !list.includes(term) && this.isValidTerm(term)) {
      list.push(term);
    }
  }

  /** Add multiple terms if valid and not already present */
  private addTermsIfValid(terms: string[], list: string[], maxTerms: number): void {
    for (const term of terms) {
      if (list.length >= maxTerms) break;
      this.addIfValid(term, list, maxTerms);
    }
  }

  /**
   * Check if the problem has sufficient context for specific insights
   *
   * @param keyTerms - Extracted key terms
   * @returns True if there are enough terms for specific insights
   */
  hasSpecificContext(keyTerms: KeyTerms): boolean {
    return (
      keyTerms.terms.length >= 3 ||
      keyTerms.domainTerms.length >= 1 ||
      keyTerms.nounPhrases.length >= 1
    );
  }

  /**
   * Find which key terms are referenced in a given text
   *
   * @param text - Text to search for term references
   * @param keyTerms - Extracted key terms to look for
   * @returns Array of terms that are referenced in the text
   */
  findReferencedTerms(text: string, keyTerms: KeyTerms): string[] {
    const textLower = text.toLowerCase();
    const referenced: string[] = [];

    // Check primary subject
    if (keyTerms.primarySubject && textLower.includes(keyTerms.primarySubject.toLowerCase())) {
      referenced.push(keyTerms.primarySubject);
    }

    // Check domain terms
    for (const term of keyTerms.domainTerms) {
      if (textLower.includes(term.toLowerCase()) && !referenced.includes(term)) {
        referenced.push(term);
      }
    }

    // Check noun phrases
    for (const phrase of keyTerms.nounPhrases) {
      if (textLower.includes(phrase.toLowerCase()) && !referenced.includes(phrase)) {
        referenced.push(phrase);
      }
    }

    // Check general terms (only if we haven't found enough)
    if (referenced.length < 2) {
      for (const term of keyTerms.terms) {
        if (textLower.includes(term.toLowerCase()) && !referenced.includes(term)) {
          referenced.push(term);
          if (referenced.length >= 3) break;
        }
      }
    }

    return referenced;
  }

  /**
   * Validate that text contains at least one key term
   *
   * @param text - Text to validate
   * @param keyTerms - Extracted key terms
   * @returns True if at least one key term is referenced
   */
  validateTermReference(text: string, keyTerms: KeyTerms): boolean {
    return this.findReferencedTerms(text, keyTerms).length > 0;
  }

  /**
   * Ensure text contains at least one key term, adding one if necessary
   *
   * @param text - Text to enhance
   * @param keyTerms - Extracted key terms
   * @returns Text with guaranteed term reference
   */
  ensureTermReference(text: string, keyTerms: KeyTerms): string {
    if (this.validateTermReference(text, keyTerms)) {
      return text;
    }

    // Add the primary subject or first domain term to the text
    // Use explicit checks for empty strings since we want to skip empty values
    const termToAdd =
      (keyTerms.primarySubject && keyTerms.primarySubject.length > 0
        ? keyTerms.primarySubject
        : null) ??
      (keyTerms.domainTerms[0] && keyTerms.domainTerms[0].length > 0
        ? keyTerms.domainTerms[0]
        : null) ??
      (keyTerms.terms[0] && keyTerms.terms[0].length > 0 ? keyTerms.terms[0] : null);

    if (termToAdd) {
      // Insert term naturally into the text
      if (text.endsWith(".")) {
        return `${text.slice(0, -1)} regarding ${termToAdd}.`;
      }
      return `${text} regarding ${termToAdd}`;
    }

    return text;
  }
}
