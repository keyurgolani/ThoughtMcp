/**
 * System 1 (Intuitive) Processor - Fast, automatic, pattern-based thinking
 * Implements Kahneman's System 1 thinking with pattern matching and heuristics
 */

import {
  ComponentStatus,
  HeuristicResult,
  ISystem1Processor,
  Pattern,
} from "../interfaces/cognitive.js";
import {
  CognitiveInput,
  EmotionalState,
  ProcessingMode,
  ReasoningStep,
  ReasoningType,
  ThoughtResult,
} from "../types/core.js";

interface IntuitiveConfig {
  pattern_threshold?: number;
  confidence_decay?: number;
  max_patterns?: number;
  heuristic_weight?: number;
}

export class IntuitiveProcessor implements ISystem1Processor {
  private initialized: boolean = false;
  private patternCache: Map<string, Pattern[]> = new Map();
  private heuristicRules: Map<
    string,
    (input: string, patterns: Pattern[]) => HeuristicResult
  > = new Map();
  private lastActivity: number = 0;
  private config: IntuitiveConfig = {};

  async initialize(config: IntuitiveConfig): Promise<void> {
    this.config = {
      pattern_threshold: 0.3,
      confidence_decay: 0.1,
      max_patterns: 50,
      heuristic_weight: 0.8,
      ...config,
    };

    this.initializeHeuristics();
    this.initialized = true;
  }

  private initializeHeuristics(): void {
    // Availability heuristic - judge by ease of recall
    this.heuristicRules.set(
      "availability",
      (_input: string, patterns: Pattern[]) => {
        const recentPatterns = patterns.filter((p) => p.salience > 0.7);
        return {
          name: "availability",
          type: "availability",
          confidence: recentPatterns.length > 0 ? 0.8 : 0.3,
          result: `Based on ${recentPatterns.length} easily recalled patterns`,
          processing_time: 1,
        };
      }
    );

    // Representativeness heuristic - judge by similarity to prototypes
    this.heuristicRules.set(
      "representativeness",
      (_input: string, patterns: Pattern[]) => {
        const prototypeMatches = patterns.filter(
          (p) => p.type === "prototype" && p.confidence > 0.6
        );
        return {
          name: "representativeness",
          type: "representativeness",
          confidence: prototypeMatches.length > 0 ? 0.7 : 0.4,
          result: `Matches ${prototypeMatches.length} known prototypes`,
          processing_time: 2,
        };
      }
    );

    // Anchoring heuristic - influenced by initial information
    this.heuristicRules.set(
      "anchoring",
      (_input: string, patterns: Pattern[]) => {
        const firstPattern = patterns[0];
        return {
          name: "anchoring",
          type: "anchoring",
          confidence: firstPattern ? firstPattern.confidence * 0.9 : 0.2,
          result: `Anchored on first impression: ${
            firstPattern?.content.join(" ") ?? "none"
          }`,
          processing_time: 1,
        };
      }
    );

    // Affect heuristic - "how do I feel about it?"
    this.heuristicRules.set("affect", (_input: string, patterns: Pattern[]) => {
      const emotionalPatterns = patterns.filter((p) => p.type === "emotional");
      const avgSalience =
        emotionalPatterns.reduce((sum, p) => sum + p.salience, 0) /
        (emotionalPatterns.length || 1);
      return {
        name: "affect",
        type: "affect",
        confidence: avgSalience > 0.5 ? 0.8 : 0.3,
        result: `Emotional response strength: ${avgSalience.toFixed(2)}`,
        processing_time: 1,
      };
    });
  }

  async processIntuitive(input: CognitiveInput): Promise<ThoughtResult> {
    const startTime = Date.now();
    this.lastActivity = startTime;

    try {
      // Step 1: Pattern matching
      const patterns = this.matchPatterns(input.input);

      // Step 2: Apply heuristics
      const heuristicResults = this.applyHeuristics(input.input, patterns);

      // Step 3: Generate intuitive response
      const response = this.generateIntuitiveResponse(
        input.input,
        patterns,
        heuristicResults
      );

      // Step 4: Assess confidence
      const confidence = this.getConfidence(response);

      // Step 5: Create reasoning path
      const reasoningPath = this.createReasoningPath(
        patterns,
        heuristicResults,
        response
      );

      const processingTime = Date.now() - startTime;

      return {
        content: response.content,
        confidence: confidence,
        reasoning_path: reasoningPath,
        emotional_context: this.assessEmotionalContext(input.input, patterns),
        metadata: {
          processing_time_ms: processingTime,
          components_used: ["IntuitiveProcessor"],
          memory_retrievals: patterns.length,
          system_mode: ProcessingMode.INTUITIVE,
          temperature: input.configuration.temperature,
        },
      };
    } catch (error) {
      throw new Error(
        `Intuitive processing failed: ${(error as Error).message}`
      );
    }
  }

  matchPatterns(input: string): Pattern[] {
    // Check cache first
    const cachedPatterns = this.patternCache.get(input);
    if (cachedPatterns) {
      return cachedPatterns;
    }

    const patterns: Pattern[] = [];
    const tokens = input.toLowerCase().split(/\s+/);

    // Simple pattern matching based on common structures
    patterns.push(...this.detectQuestionPatterns(tokens));
    patterns.push(...this.detectEmotionalPatterns(tokens));
    patterns.push(...this.detectCausalPatterns(tokens));
    patterns.push(...this.detectComparisonPatterns(tokens));
    patterns.push(...this.detectNegationPatterns(tokens));

    // Cache results
    if (patterns.length > 0) {
      this.patternCache.set(input, patterns);

      // Limit cache size
      if (this.patternCache.size > (this.config.max_patterns ?? 50)) {
        const firstKey = this.patternCache.keys().next().value;
        if (firstKey) {
          this.patternCache.delete(firstKey);
        }
      }
    }

    return patterns;
  }

  private detectQuestionPatterns(tokens: string[]): Pattern[] {
    const questionWords = [
      "what",
      "how",
      "why",
      "when",
      "where",
      "who",
      "which",
    ];
    const patterns: Pattern[] = [];

    for (const qWord of questionWords) {
      if (tokens.includes(qWord)) {
        patterns.push({
          type: "question",
          content: [
            qWord,
            ...tokens.slice(tokens.indexOf(qWord), tokens.indexOf(qWord) + 3),
          ],
          confidence: 0.9,
          salience: 0.8,
        });
      }
    }

    return patterns;
  }

  private detectEmotionalPatterns(tokens: string[]): Pattern[] {
    const emotionalWords = {
      positive: [
        "good",
        "great",
        "excellent",
        "happy",
        "love",
        "amazing",
        "wonderful",
      ],
      negative: [
        "bad",
        "terrible",
        "hate",
        "awful",
        "horrible",
        "sad",
        "angry",
      ],
      neutral: ["okay", "fine", "normal", "average"],
    };

    const patterns: Pattern[] = [];

    for (const [valence, words] of Object.entries(emotionalWords)) {
      for (const word of words) {
        if (tokens.includes(word)) {
          patterns.push({
            type: "emotional",
            content: [word],
            confidence: 0.7,
            salience: valence === "neutral" ? 0.4 : 0.8,
          });
        }
      }
    }

    return patterns;
  }

  private detectCausalPatterns(tokens: string[]): Pattern[] {
    const causalIndicators = [
      "because",
      "since",
      "due to",
      "caused by",
      "results in",
      "leads to",
    ];
    const patterns: Pattern[] = [];

    for (const indicator of causalIndicators) {
      const indicatorTokens = indicator.split(" ");
      if (this.containsSequence(tokens, indicatorTokens)) {
        patterns.push({
          type: "causal",
          content: indicatorTokens,
          confidence: 0.8,
          salience: 0.7,
        });
      }
    }

    return patterns;
  }

  private detectComparisonPatterns(tokens: string[]): Pattern[] {
    const comparisonWords = [
      "better",
      "worse",
      "more",
      "less",
      "than",
      "compared to",
      "versus",
    ];
    const patterns: Pattern[] = [];

    for (const word of comparisonWords) {
      if (tokens.includes(word)) {
        patterns.push({
          type: "comparison",
          content: [word],
          confidence: 0.6,
          salience: 0.6,
        });
      }
    }

    return patterns;
  }

  private detectNegationPatterns(tokens: string[]): Pattern[] {
    const negationWords = ["not", "no", "never", "nothing", "none", "neither"];
    const patterns: Pattern[] = [];

    for (const word of negationWords) {
      if (tokens.includes(word)) {
        patterns.push({
          type: "negation",
          content: [word],
          confidence: 0.8,
          salience: 0.7,
        });
      }
    }

    return patterns;
  }

  private containsSequence(tokens: string[], sequence: string[]): boolean {
    for (let i = 0; i <= tokens.length - sequence.length; i++) {
      if (sequence.every((token, j) => tokens[i + j] === token)) {
        return true;
      }
    }
    return false;
  }

  applyHeuristics(
    input: string,
    patterns: Pattern[]
  ): Record<string, HeuristicResult> {
    const results: Record<string, HeuristicResult> = {};

    for (const [name, heuristic] of this.heuristicRules) {
      try {
        const result = heuristic(input, patterns);
        // Ensure the result has the correct type property
        results[name] = {
          ...result,
          type: name, // Add the type property that tests expect
        };
      } catch (error) {
        results[name] = {
          name: name,
          type: name, // Add the type property
          confidence: 0.1,
          result: `Heuristic failed: ${(error as Error).message}`,
          processing_time: 0,
        };
      }
    }

    return results;
  }

  private generateIntuitiveResponse(
    input: string,
    patterns: Pattern[],
    heuristicResults: Record<string, HeuristicResult>
  ): { content: string; confidence: number; type: string } {
    // Combine patterns and heuristics to generate a quick response
    const dominantPattern = patterns.reduce(
      (max, p) => (p.salience > max.salience ? p : max),
      patterns[0]
    );
    const heuristicValues = Object.values(heuristicResults);
    const dominantHeuristic =
      heuristicValues.length > 0
        ? heuristicValues.reduce(
            (max, h) => (h.confidence > max.confidence ? h : max),
            heuristicValues[0]
          )
        : null;

    let content = "";
    let responseType = "general";

    if (dominantPattern) {
      switch (dominantPattern.type) {
        case "question":
          content = this.generateQuestionResponse(input, dominantPattern);
          responseType = "question_response";
          break;
        case "emotional":
          content = this.generateEmotionalResponse(input, dominantPattern);
          responseType = "emotional_response";
          break;
        case "causal":
          content = this.generateCausalResponse(input, dominantPattern);
          responseType = "causal_response";
          break;
        default:
          content = this.generateGeneralResponse(input, dominantPattern);
      }
    } else {
      const heuristicType =
        dominantHeuristic &&
        typeof dominantHeuristic === "object" &&
        "type" in dominantHeuristic
          ? dominantHeuristic.type
          : "general reasoning";
      const heuristicReasoning =
        dominantHeuristic &&
        typeof dominantHeuristic === "object" &&
        "reasoning" in dominantHeuristic
          ? dominantHeuristic.reasoning
          : "standard approach";
      // Include the input content in the response to ensure uniqueness
      content = `Regarding "${input}", I sense this relates to ${heuristicType}. My initial impression suggests a ${heuristicReasoning}.`;
    }

    return {
      content,
      confidence: dominantPattern?.confidence ?? 0.5,
      type: responseType,
    };
  }

  private generateQuestionResponse(input: string, pattern: Pattern): string {
    const questionWord = pattern.content[0];
    switch (questionWord) {
      case "what":
        return `Based on the patterns I recognize in "${input}", this appears to be asking for identification or definition.`;
      case "how":
        return `This seems to be asking about a process or method regarding "${input}". My intuition suggests looking at the steps involved.`;
      case "why":
        return `This is asking for reasons or causes about "${input}". I sense there are underlying factors to consider.`;
      case "when":
        return `This is about timing regarding "${input}". My initial sense is that temporal context is important here.`;
      case "where":
        return `This is about location or context for "${input}". The spatial or situational aspect seems relevant.`;
      default:
        return `This appears to be an information-seeking question about "${input}" that requires careful consideration.`;
    }
  }

  private generateEmotionalResponse(input: string, pattern: Pattern): string {
    return `I detect emotional content in "${input}". The tone suggests ${pattern.content[0]} feelings, which influences how I initially perceive the situation.`;
  }

  private generateCausalResponse(input: string, pattern: Pattern): string {
    return `I notice causal relationships in "${input}" indicated by "${pattern.content.join(
      " "
    )}". This suggests cause-and-effect thinking is needed.`;
  }

  private generateGeneralResponse(input: string, pattern: Pattern): string {
    // Extract key terms from input for more specific responses
    const inputWords = input.toLowerCase().split(/\s+/);
    const keyTerms = inputWords
      .filter(
        (word) =>
          word.length > 3 &&
          ![
            "what",
            "how",
            "why",
            "when",
            "where",
            "which",
            "that",
            "this",
            "with",
            "from",
            "they",
            "have",
            "been",
            "will",
            "would",
            "could",
            "should",
          ].includes(word)
      )
      .slice(0, 3);

    // Add some variability based on input hash
    const inputHash = input.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    const variations = [
      `I sense this relates to ${
        pattern.type
      }. My initial analysis of "${keyTerms.join(", ")}" suggests ${
        pattern.type
      }-based reasoning would be most effective.`,
      `My intuitive response recognizes a ${
        pattern.type
      } pattern here. The key elements "${keyTerms.join(
        ", "
      )}" indicate this requires ${pattern.type} thinking.`,
      `This immediately strikes me as a ${
        pattern.type
      } situation. Based on "${keyTerms.join(", ")}", I'd approach this with ${
        pattern.type
      } reasoning.`,
      `I'm getting a strong ${
        pattern.type
      } impression from this. The terms "${keyTerms.join(", ")}" suggest ${
        pattern.type
      } analysis is needed.`,
      `My first instinct identifies this as ${
        pattern.type
      }. Looking at "${keyTerms.join(", ")}", ${
        pattern.type
      } reasoning seems most appropriate.`,
    ];

    const selectedVariation =
      variations[Math.abs(inputHash) % variations.length];
    return selectedVariation;
  }

  getConfidence(result: unknown): number {
    // If result has a confidence property, use it
    if (
      typeof result === "object" &&
      result !== null &&
      "confidence" in result
    ) {
      return Math.min(Math.max(result.confidence as number, 0.1), 0.9);
    }

    // Default confidence for System 1
    return 0.6;
  }

  private createReasoningPath(
    patterns: Pattern[],
    heuristicResults: Record<string, HeuristicResult>,
    response: { content: string; confidence: number; type: string }
  ): ReasoningStep[] {
    const steps: ReasoningStep[] = [];

    // Pattern recognition step
    if (patterns.length > 0) {
      steps.push({
        type: ReasoningType.PATTERN_MATCH,
        content: `Recognized ${patterns.length} patterns: ${patterns
          .map((p) => p.type)
          .join(", ")}`,
        confidence:
          patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
        alternatives: patterns.slice(1, 4).map((p) => ({
          content: `Alternative pattern: ${p.type}`,
          confidence: p.confidence,
          reasoning: `Pattern salience: ${p.salience}`,
        })),
      });
    }

    // Heuristic application step - use different types based on heuristic
    const heuristicNames = Object.keys(heuristicResults);
    if (heuristicNames.length > 0) {
      const avgConfidence =
        Object.values(heuristicResults).reduce(
          (sum: number, h) => sum + h.confidence,
          0
        ) / heuristicNames.length;

      // Use HEURISTIC type for heuristic-based reasoning
      steps.push({
        type: ReasoningType.HEURISTIC,
        content: `Applied heuristics: ${heuristicNames.join(", ")}`,
        confidence: avgConfidence,
        alternatives: Object.entries(heuristicResults)
          .slice(0, 3)
          .map(([name, result]: [string, HeuristicResult]) => ({
            content: `${name}: ${result.result}`,
            confidence: result.confidence,
            reasoning: `Heuristic application`,
          })),
      });

      // Add specific reasoning types based on heuristics used
      if (heuristicNames.includes("availability")) {
        steps.push({
          type: ReasoningType.PROBABILISTIC,
          content: `Availability heuristic suggests high probability based on ease of recall`,
          confidence: heuristicResults.availability?.confidence ?? 0.5,
          alternatives: [],
        });
      }

      if (heuristicNames.includes("representativeness")) {
        steps.push({
          type: ReasoningType.ANALOGICAL,
          content: `Representativeness suggests similarity to known prototypes`,
          confidence: heuristicResults.representativeness?.confidence ?? 0.5,
          alternatives: [],
        });
      }
    }

    // Contextual assessment step
    steps.push({
      type: ReasoningType.CONTEXTUAL,
      content: `Contextual assessment based on immediate impressions and situational cues`,
      confidence: 0.7,
      alternatives: [],
    });

    // Intuitive conclusion step - use INDUCTIVE for intuitive leaps
    steps.push({
      type: ReasoningType.INDUCTIVE,
      content: `Intuitive response: ${response.content}`,
      confidence: this.getConfidence(response),
      alternatives: [],
    });

    return steps;
  }

  private assessEmotionalContext(
    _input: string,
    patterns: Pattern[]
  ): EmotionalState {
    const emotionalPatterns = patterns.filter((p) => p.type === "emotional");

    let valence = 0;
    let arousal = 0.3; // Base arousal for System 1
    const dominance = 0.7; // System 1 tends to be confident

    if (emotionalPatterns.length > 0) {
      // Simple emotional assessment based on detected patterns
      const positiveWords = [
        "good",
        "great",
        "excellent",
        "happy",
        "love",
        "amazing",
        "wonderful",
      ];
      const negativeWords = [
        "bad",
        "terrible",
        "hate",
        "awful",
        "horrible",
        "sad",
        "angry",
      ];

      for (const pattern of emotionalPatterns) {
        const word = pattern.content[0];
        if (positiveWords.includes(word)) {
          valence += 0.3;
          arousal += 0.2;
        } else if (negativeWords.includes(word)) {
          valence -= 0.3;
          arousal += 0.3;
        }
      }
    }

    return {
      valence: Math.max(-1, Math.min(1, valence)),
      arousal: Math.max(0, Math.min(1, arousal)),
      dominance: Math.max(0, Math.min(1, dominance)),
      specific_emotions: new Map([
        ["confidence", dominance],
        ["curiosity", arousal * 0.8],
        ["uncertainty", 1 - dominance],
      ]),
    };
  }

  process(input: unknown): Promise<unknown> {
    return this.processIntuitive(input as CognitiveInput);
  }

  reset(): void {
    this.patternCache.clear();
    this.lastActivity = 0;
  }

  getStatus(): ComponentStatus {
    return {
      name: "IntuitiveProcessor",
      initialized: this.initialized,
      active: Date.now() - this.lastActivity < 30000, // Active if used in last 30 seconds
      last_activity: this.lastActivity,
      error: "",
    };
  }
}
