/**
 * System 1 (Intuitive) Processor - Fast, automatic, pattern-based thinking
 * Implements Kahneman's System 1 thinking with pattern matching and heuristics
 */

import { 
  ISystem1Processor, 
  ComponentStatus, 
  Pattern 
} from '../interfaces/cognitive.js';
import { 
  CognitiveInput, 
  ThoughtResult, 
  ReasoningStep, 
  ReasoningType, 
  ProcessingMode,
  EmotionalState
} from '../types/core.js';

export class IntuitiveProcessor implements ISystem1Processor {
  private initialized: boolean = false;
  private patternCache: Map<string, Pattern[]> = new Map();
  private heuristicRules: Map<string, (input: string, patterns: Pattern[]) => any> = new Map();
  private lastActivity: number = 0;
  private config: any = {};

  async initialize(config: any): Promise<void> {
    this.config = {
      pattern_threshold: 0.3,
      confidence_decay: 0.1,
      max_patterns: 50,
      heuristic_weight: 0.8,
      ...config
    };

    this.initializeHeuristics();
    this.initialized = true;
  }

  private initializeHeuristics(): void {
    // Availability heuristic - judge by ease of recall
    this.heuristicRules.set('availability', (_input: string, patterns: Pattern[]) => {
      const recentPatterns = patterns.filter(p => p.salience > 0.7);
      return {
        type: 'availability',
        confidence: recentPatterns.length > 0 ? 0.8 : 0.3,
        reasoning: `Based on ${recentPatterns.length} easily recalled patterns`
      };
    });

    // Representativeness heuristic - judge by similarity to prototypes
    this.heuristicRules.set('representativeness', (_input: string, patterns: Pattern[]) => {
      const prototypeMatches = patterns.filter(p => p.type === 'prototype' && p.confidence > 0.6);
      return {
        type: 'representativeness',
        confidence: prototypeMatches.length > 0 ? 0.7 : 0.4,
        reasoning: `Matches ${prototypeMatches.length} known prototypes`
      };
    });

    // Anchoring heuristic - influenced by initial information
    this.heuristicRules.set('anchoring', (_input: string, patterns: Pattern[]) => {
      const firstPattern = patterns[0];
      return {
        type: 'anchoring',
        confidence: firstPattern ? firstPattern.confidence * 0.9 : 0.2,
        reasoning: `Anchored on first impression: ${firstPattern?.content.join(' ') || 'none'}`
      };
    });

    // Affect heuristic - "how do I feel about it?"
    this.heuristicRules.set('affect', (_input: string, patterns: Pattern[]) => {
      const emotionalPatterns = patterns.filter(p => p.type === 'emotional');
      const avgSalience = emotionalPatterns.reduce((sum, p) => sum + p.salience, 0) / emotionalPatterns.length || 0;
      return {
        type: 'affect',
        confidence: avgSalience > 0.5 ? 0.8 : 0.3,
        reasoning: `Emotional response strength: ${avgSalience.toFixed(2)}`
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
      const response = this.generateIntuitiveResponse(input.input, patterns, heuristicResults);

      // Step 4: Assess confidence
      const confidence = this.getConfidence(response);

      // Step 5: Create reasoning path
      const reasoningPath = this.createReasoningPath(patterns, heuristicResults, response);

      const processingTime = Date.now() - startTime;

      return {
        content: response.content,
        confidence: confidence,
        reasoning_path: reasoningPath,
        emotional_context: this.assessEmotionalContext(input.input, patterns),
        metadata: {
          processing_time_ms: processingTime,
          components_used: ['IntuitiveProcessor'],
          memory_retrievals: patterns.length,
          system_mode: ProcessingMode.INTUITIVE,
          temperature: input.configuration.temperature
        }
      };

    } catch (error) {
      throw new Error(`Intuitive processing failed: ${(error as Error).message}`);
    }
  }

  matchPatterns(input: string): Pattern[] {
    // Check cache first
    if (this.patternCache.has(input)) {
      return this.patternCache.get(input)!;
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
      if (this.patternCache.size > this.config.max_patterns) {
        const firstKey = this.patternCache.keys().next().value;
        if (firstKey) {
          this.patternCache.delete(firstKey);
        }
      }
    }

    return patterns;
  }

  private detectQuestionPatterns(tokens: string[]): Pattern[] {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
    const patterns: Pattern[] = [];

    for (const qWord of questionWords) {
      if (tokens.includes(qWord)) {
        patterns.push({
          type: 'question',
          content: [qWord, ...tokens.slice(tokens.indexOf(qWord), tokens.indexOf(qWord) + 3)],
          confidence: 0.9,
          salience: 0.8
        });
      }
    }

    return patterns;
  }

  private detectEmotionalPatterns(tokens: string[]): Pattern[] {
    const emotionalWords = {
      positive: ['good', 'great', 'excellent', 'happy', 'love', 'amazing', 'wonderful'],
      negative: ['bad', 'terrible', 'hate', 'awful', 'horrible', 'sad', 'angry'],
      neutral: ['okay', 'fine', 'normal', 'average']
    };

    const patterns: Pattern[] = [];

    for (const [valence, words] of Object.entries(emotionalWords)) {
      for (const word of words) {
        if (tokens.includes(word)) {
          patterns.push({
            type: 'emotional',
            content: [word],
            confidence: 0.7,
            salience: valence === 'neutral' ? 0.4 : 0.8
          });
        }
      }
    }

    return patterns;
  }

  private detectCausalPatterns(tokens: string[]): Pattern[] {
    const causalIndicators = ['because', 'since', 'due to', 'caused by', 'results in', 'leads to'];
    const patterns: Pattern[] = [];

    for (const indicator of causalIndicators) {
      const indicatorTokens = indicator.split(' ');
      if (this.containsSequence(tokens, indicatorTokens)) {
        patterns.push({
          type: 'causal',
          content: indicatorTokens,
          confidence: 0.8,
          salience: 0.7
        });
      }
    }

    return patterns;
  }

  private detectComparisonPatterns(tokens: string[]): Pattern[] {
    const comparisonWords = ['better', 'worse', 'more', 'less', 'than', 'compared to', 'versus'];
    const patterns: Pattern[] = [];

    for (const word of comparisonWords) {
      if (tokens.includes(word)) {
        patterns.push({
          type: 'comparison',
          content: [word],
          confidence: 0.6,
          salience: 0.6
        });
      }
    }

    return patterns;
  }

  private detectNegationPatterns(tokens: string[]): Pattern[] {
    const negationWords = ['not', 'no', 'never', 'nothing', 'none', 'neither'];
    const patterns: Pattern[] = [];

    for (const word of negationWords) {
      if (tokens.includes(word)) {
        patterns.push({
          type: 'negation',
          content: [word],
          confidence: 0.8,
          salience: 0.7
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

  applyHeuristics(input: string, patterns: Pattern[]): any {
    const results: any = {};

    for (const [name, heuristic] of this.heuristicRules) {
      try {
        results[name] = heuristic(input, patterns);
      } catch (error) {
        results[name] = {
          type: name,
          confidence: 0.1,
          reasoning: `Heuristic failed: ${(error as Error).message}`
        };
      }
    }

    return results;
  }

  private generateIntuitiveResponse(input: string, patterns: Pattern[], heuristicResults: any): any {
    // Combine patterns and heuristics to generate a quick response
    const dominantPattern = patterns.reduce((max, p) => p.salience > max.salience ? p : max, patterns[0]);
    const dominantHeuristic = Object.values(heuristicResults).reduce((max: any, h: any) => 
      h.confidence > max.confidence ? h : max, Object.values(heuristicResults)[0]);

    let content = '';
    let responseType = 'general';

    if (dominantPattern) {
      switch (dominantPattern.type) {
        case 'question':
          content = this.generateQuestionResponse(input, dominantPattern);
          responseType = 'question_response';
          break;
        case 'emotional':
          content = this.generateEmotionalResponse(input, dominantPattern);
          responseType = 'emotional_response';
          break;
        case 'causal':
          content = this.generateCausalResponse(input, dominantPattern);
          responseType = 'causal_response';
          break;
        default:
          content = this.generateGeneralResponse(input, dominantPattern);
      }
    } else {
      const heuristicType = dominantHeuristic && typeof dominantHeuristic === 'object' && 'type' in dominantHeuristic ? dominantHeuristic.type : 'general reasoning';
      const heuristicReasoning = dominantHeuristic && typeof dominantHeuristic === 'object' && 'reasoning' in dominantHeuristic ? dominantHeuristic.reasoning : 'standard approach';
      content = `I sense this relates to ${heuristicType}. My initial impression suggests a ${heuristicReasoning}.`;
    }

    return {
      content,
      type: responseType,
      dominant_pattern: dominantPattern,
      dominant_heuristic: dominantHeuristic
    };
  }

  private generateQuestionResponse(_input: string, pattern: Pattern): string {
    const questionWord = pattern.content[0];
    switch (questionWord) {
      case 'what':
        return "Based on the patterns I recognize, this appears to be asking for identification or definition.";
      case 'how':
        return "This seems to be asking about a process or method. My intuition suggests looking at the steps involved.";
      case 'why':
        return "This is asking for reasons or causes. I sense there are underlying factors to consider.";
      case 'when':
        return "This is about timing. My initial sense is that temporal context is important here.";
      case 'where':
        return "This is about location or context. The spatial or situational aspect seems relevant.";
      default:
        return "This appears to be an information-seeking question that requires careful consideration.";
    }
  }

  private generateEmotionalResponse(_input: string, pattern: Pattern): string {
    return `I detect emotional content in this input. The tone suggests ${pattern.content[0]} feelings, which influences how I initially perceive the situation.`;
  }

  private generateCausalResponse(_input: string, pattern: Pattern): string {
    return `I notice causal relationships indicated by "${pattern.content.join(' ')}". This suggests cause-and-effect thinking is needed.`;
  }

  private generateGeneralResponse(_input: string, pattern: Pattern): string {
    return `My initial impression recognizes a ${pattern.type} pattern. This suggests approaching the situation with ${pattern.type}-based reasoning.`;
  }

  getConfidence(result: any): number {
    let confidence = 0.5; // Base confidence for System 1

    // Adjust based on pattern strength
    if (result.dominant_pattern) {
      confidence += result.dominant_pattern.confidence * 0.3;
    }

    // Adjust based on heuristic confidence
    if (result.dominant_heuristic) {
      confidence += result.dominant_heuristic.confidence * 0.2;
    }

    // Apply decay for uncertainty
    confidence *= (1 - this.config.confidence_decay);

    return Math.min(Math.max(confidence, 0.1), 0.9); // Clamp between 0.1 and 0.9
  }

  private createReasoningPath(patterns: Pattern[], heuristicResults: any, response: any): ReasoningStep[] {
    const steps: ReasoningStep[] = [];

    // Pattern recognition step
    if (patterns.length > 0) {
      steps.push({
        type: ReasoningType.PATTERN_MATCH,
        content: `Recognized ${patterns.length} patterns: ${patterns.map(p => p.type).join(', ')}`,
        confidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
        alternatives: patterns.slice(1, 4).map(p => ({
          content: `Alternative pattern: ${p.type}`,
          confidence: p.confidence,
          reasoning: `Pattern salience: ${p.salience}`
        }))
      });
    }

    // Heuristic application step
    const heuristicNames = Object.keys(heuristicResults);
    if (heuristicNames.length > 0) {
      const avgConfidence = Object.values(heuristicResults).reduce((sum: number, h: any) => sum + h.confidence, 0) / heuristicNames.length;
      
      steps.push({
        type: ReasoningType.PATTERN_MATCH,
        content: `Applied heuristics: ${heuristicNames.join(', ')}`,
        confidence: avgConfidence,
        alternatives: Object.entries(heuristicResults).slice(0, 3).map(([name, result]: [string, any]) => ({
          content: `${name}: ${result.reasoning}`,
          confidence: result.confidence,
          reasoning: `Heuristic application`
        }))
      });
    }

    // Intuitive conclusion step
    steps.push({
      type: ReasoningType.PATTERN_MATCH,
      content: `Intuitive response: ${response.content}`,
      confidence: this.getConfidence(response),
      alternatives: []
    });

    return steps;
  }

  private assessEmotionalContext(_input: string, patterns: Pattern[]): EmotionalState {
    const emotionalPatterns = patterns.filter(p => p.type === 'emotional');
    
    let valence = 0;
    let arousal = 0.3; // Base arousal for System 1
    let dominance = 0.7; // System 1 tends to be confident

    if (emotionalPatterns.length > 0) {
      // Simple emotional assessment based on detected patterns
      const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'amazing', 'wonderful'];
      const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'sad', 'angry'];
      
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
        ['confidence', dominance],
        ['curiosity', arousal * 0.8],
        ['uncertainty', 1 - dominance]
      ])
    };
  }

  process(input: any): Promise<any> {
    return this.processIntuitive(input);
  }

  reset(): void {
    this.patternCache.clear();
    this.lastActivity = 0;
  }

  getStatus(): ComponentStatus {
    return {
      name: 'IntuitiveProcessor',
      initialized: this.initialized,
      active: Date.now() - this.lastActivity < 30000, // Active if used in last 30 seconds
      last_activity: this.lastActivity,
      error: ''
    };
  }
}