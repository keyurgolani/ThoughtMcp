/**
 * Evidence Extractor
 *
 * Extracts evidence statements from reasoning text when no explicit
 * evidence array is provided. Identifies data references, studies,
 * facts, and other evidence indicators to calculate evidence quality.
 *
 * @module confidence/evidence-extractor
 */

/**
 * Extracted evidence item
 */
export interface ExtractedEvidence {
  /** The extracted evidence statement */
  statement: string;
  /** Type of evidence (data, study, fact, observation, etc.) */
  type: EvidenceType;
  /** Confidence in the extraction (0-1) */
  confidence: number;
}

/**
 * Evidence types that can be extracted
 */
export type EvidenceType =
  | "data"
  | "study"
  | "fact"
  | "observation"
  | "statistic"
  | "reference"
  | "example"
  | "measurement";

/**
 * Evidence extraction result
 */
export interface EvidenceExtractionResult {
  /** Extracted evidence items */
  evidence: ExtractedEvidence[];
  /** Overall quality score (0-1) */
  quality: number;
  /** Number of evidence items found */
  count: number;
}

/**
 * Evidence indicator patterns for extraction
 */
interface EvidencePattern {
  /** Regex pattern to match */
  pattern: RegExp;
  /** Type of evidence this pattern indicates */
  type: EvidenceType;
  /** Base confidence for this pattern */
  confidence: number;
}

/**
 * Evidence Extractor
 *
 * Extracts evidence statements from reasoning text using pattern matching
 * and heuristics. Identifies various types of evidence including data
 * references, studies, statistics, and factual statements.
 */
export class EvidenceExtractor {
  private readonly patterns: EvidencePattern[];

  constructor() {
    this.patterns = this.initializePatterns();
  }

  /** Initialize all evidence detection patterns */
  private initializePatterns(): EvidencePattern[] {
    return [
      ...this.getDataPatterns(),
      ...this.getStudyPatterns(),
      ...this.getStatisticPatterns(),
      ...this.getFactPatterns(),
      ...this.getObservationPatterns(),
      ...this.getReferencePatterns(),
      ...this.getExamplePatterns(),
      ...this.getMeasurementPatterns(),
    ];
  }

  /** Data-related evidence patterns */
  private getDataPatterns(): EvidencePattern[] {
    return [
      {
        pattern:
          /\b(?:data|metrics?|measurements?)\s+(?:shows?|indicates?|reveals?|demonstrates?)\b/gi,
        type: "data",
        confidence: 0.85,
      },
      {
        pattern: /\b(?:according to|based on)\s+(?:the\s+)?(?:data|metrics?|analysis)/gi,
        type: "data",
        confidence: 0.8,
      },
      {
        pattern: /\b(?:the|our|this)\s+(?:data|analysis|results?)\s+(?:show|indicate|suggest)/gi,
        type: "data",
        confidence: 0.75,
      },
    ];
  }

  /** Study/research evidence patterns */
  private getStudyPatterns(): EvidencePattern[] {
    return [
      {
        pattern:
          /\b(?:stud(?:y|ies)|research|experiments?)\s+(?:shows?|found|indicates?|suggests?|demonstrates?)\b/gi,
        type: "study",
        confidence: 0.9,
      },
      {
        pattern: /\b(?:according to|based on)\s+(?:a\s+)?(?:study|research|experiment)/gi,
        type: "study",
        confidence: 0.85,
      },
    ];
  }

  /** Statistic evidence patterns */
  private getStatisticPatterns(): EvidencePattern[] {
    return [
      {
        pattern: /\b\d+(?:\.\d+)?%\s+(?:of|increase|decrease|improvement|reduction)/gi,
        type: "statistic",
        confidence: 0.9,
      },
      {
        pattern: /\b(?:approximately|about|roughly|nearly)\s+\d+/gi,
        type: "statistic",
        confidence: 0.75,
      },
      {
        pattern: /\b\d+(?:\.\d+)?\s*(?:times|x)\s+(?:faster|slower|better|worse|more|less)/gi,
        type: "statistic",
        confidence: 0.85,
      },
      { pattern: /\b(?:by|at|to|from)\s+\d+(?:\.\d+)?%/gi, type: "statistic", confidence: 0.8 },
      {
        pattern: /\b(?:increased|decreased|improved|reduced|grew|dropped)\s+(?:by\s+)?\d+/gi,
        type: "statistic",
        confidence: 0.85,
      },
      {
        pattern: /\b(?:between|from)\s+\d+(?:\.\d+)?\s*(?:to|and|-)\s*\d+/gi,
        type: "statistic",
        confidence: 0.8,
      },
      {
        pattern: /\b\d+(?:\.\d+)?(?:x|X)\s+(?:the|more|less|higher|lower)/gi,
        type: "statistic",
        confidence: 0.85,
      },
    ];
  }

  /** Fact evidence patterns */
  private getFactPatterns(): EvidencePattern[] {
    return [
      {
        pattern: /\b(?:it is|it's)\s+(?:a\s+)?(?:fact|known|established|proven)\s+that\b/gi,
        type: "fact",
        confidence: 0.7,
      },
      {
        pattern: /\b(?:evidence|proof)\s+(?:shows?|suggests?|indicates?)\b/gi,
        type: "fact",
        confidence: 0.8,
      },
      {
        pattern: /\b(?:has been|have been|was|were)\s+(?:shown|proven|demonstrated|confirmed)\b/gi,
        type: "fact",
        confidence: 0.75,
      },
      {
        pattern: /\b(?:because|since|due to|as a result of)\s+(?:the|this|our)/gi,
        type: "fact",
        confidence: 0.7,
      },
    ];
  }

  /** Observation evidence patterns */
  private getObservationPatterns(): EvidencePattern[] {
    return [
      {
        pattern: /\b(?:we\s+)?(?:observed|noticed|found|discovered|identified)\s+that\b/gi,
        type: "observation",
        confidence: 0.75,
      },
      {
        pattern: /\b(?:observations?|findings?)\s+(?:show|indicate|suggest|reveal)\b/gi,
        type: "observation",
        confidence: 0.8,
      },
      {
        pattern:
          /\b(?:analysis|review|audit|assessment)\s+(?:revealed|showed|found|identified)\b/gi,
        type: "observation",
        confidence: 0.8,
      },
    ];
  }

  /** Reference evidence patterns */
  private getReferencePatterns(): EvidencePattern[] {
    return [
      {
        pattern: /\b(?:according to|as\s+(?:stated|mentioned|noted)\s+(?:by|in))\b/gi,
        type: "reference",
        confidence: 0.7,
      },
      {
        pattern:
          /\b(?:source|report|documentation|specification)\s+(?:states?|indicates?|shows?)\b/gi,
        type: "reference",
        confidence: 0.75,
      },
      {
        pattern: /\b(?:in|from)\s+(?:the|a)\s+(?:report|study|paper|article|survey)\b/gi,
        type: "reference",
        confidence: 0.7,
      },
    ];
  }

  /** Example evidence patterns */
  private getExamplePatterns(): EvidencePattern[] {
    return [
      {
        pattern: /\b(?:for\s+example|for\s+instance|e\.g\.|such\s+as)\b/gi,
        type: "example",
        confidence: 0.65,
      },
      {
        pattern: /\b(?:specifically|in particular|notably|particularly)\b/gi,
        type: "example",
        confidence: 0.6,
      },
    ];
  }

  /** Measurement evidence patterns */
  private getMeasurementPatterns(): EvidencePattern[] {
    return [
      {
        pattern: /\b(?:measured|recorded|logged)\s+(?:at|as|to\s+be)\b/gi,
        type: "measurement",
        confidence: 0.85,
      },
      {
        pattern: /\b(?:p50|p95|p99|latency|throughput|response\s+time)\s*(?:is|was|of)\s*\d+/gi,
        type: "measurement",
        confidence: 0.9,
      },
      {
        pattern:
          /\b(?:cpu|memory|disk|network|bandwidth)\s+(?:usage|utilization)\s*(?:is|was|at)\s*\d+/gi,
        type: "measurement",
        confidence: 0.85,
      },
      {
        pattern: /\b\d+\s*(?:ms|milliseconds?|seconds?|minutes?|hours?)\b/gi,
        type: "measurement",
        confidence: 0.8,
      },
      {
        pattern: /\b\d+\s*(?:KB|MB|GB|TB|bytes?|records?|rows?|items?|users?|requests?)\b/gi,
        type: "measurement",
        confidence: 0.8,
      },
    ];
  }

  /**
   * Extract evidence from reasoning text
   *
   * Analyzes the reasoning text to find evidence statements using
   * pattern matching and heuristics.
   *
   * @param text - Reasoning text to analyze
   * @returns Extraction result with evidence items and quality score
   */
  extract(text: string): EvidenceExtractionResult {
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return { evidence: [], quality: 0, count: 0 };
    }

    const extractedEvidence: ExtractedEvidence[] = [];
    const sentences = this.splitIntoSentences(text);

    for (const sentence of sentences) {
      const evidence = this.extractFromSentence(sentence);
      if (evidence) {
        extractedEvidence.push(evidence);
      }
    }

    // Deduplicate evidence
    const uniqueEvidence = this.deduplicateEvidence(extractedEvidence);

    // Calculate quality score
    const quality = this.calculateQuality(uniqueEvidence);

    return {
      evidence: uniqueEvidence,
      quality,
      count: uniqueEvidence.length,
    };
  }

  /**
   * Calculate evidence quality score
   *
   * Computes quality based on count, diversity, and confidence of
   * extracted evidence items.
   *
   * @param evidence - Array of extracted evidence
   * @returns Quality score (0-1)
   */
  calculateQuality(evidence: ExtractedEvidence[]): number {
    if (evidence.length === 0) {
      return 0;
    }

    // Count score (with diminishing returns)
    let countScore: number;
    if (evidence.length <= 3) {
      countScore = evidence.length / 3;
    } else if (evidence.length <= 7) {
      countScore = 0.9 + (evidence.length - 3) * 0.025;
    } else {
      countScore = Math.max(0.85, 1.0 - (evidence.length - 7) * 0.01);
    }

    // Diversity score (unique types)
    const uniqueTypes = new Set(evidence.map((e) => e.type));
    const diversityScore = Math.min(1.0, uniqueTypes.size / 4);

    // Average confidence score
    const avgConfidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;

    // Weighted combination
    const quality = countScore * 0.4 + diversityScore * 0.3 + avgConfidence * 0.3;

    return Math.min(1.0, Math.max(0, quality));
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries while preserving abbreviations
    const sentences = text
      .replace(/([.!?])\s+/g, "$1\n")
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return sentences;
  }

  /**
   * Extract evidence from a single sentence
   */
  private extractFromSentence(sentence: string): ExtractedEvidence | null {
    for (const pattern of this.patterns) {
      if (pattern.pattern.test(sentence)) {
        // Reset regex lastIndex for global patterns
        pattern.pattern.lastIndex = 0;
        return {
          statement: sentence,
          type: pattern.type,
          confidence: pattern.confidence,
        };
      }
    }
    return null;
  }

  /**
   * Deduplicate evidence items
   */
  private deduplicateEvidence(evidence: ExtractedEvidence[]): ExtractedEvidence[] {
    const seen = new Set<string>();
    const unique: ExtractedEvidence[] = [];

    for (const item of evidence) {
      const key = item.statement.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique;
  }
}
