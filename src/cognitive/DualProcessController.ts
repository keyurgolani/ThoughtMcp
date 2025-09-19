/**
 * Dual Process Controller - Coordinates System 1 and System 2 thinking
 * Implements conflict resolution and mode switching between intuitive and deliberative processing
 */

import { 
  ComponentStatus 
} from '../interfaces/cognitive.js';
import { 
  CognitiveInput, 
  ThoughtResult, 
  ReasoningStep, 
  ReasoningType, 
  ProcessingMode,
  EmotionalState,
  ThoughtMetadata
} from '../types/core.js';
import { IntuitiveProcessor } from './IntuitiveProcessor.js';
import { DeliberativeProcessor } from './DeliberativeProcessor.js';

interface ConflictResolution {
  selected_system: 'system1' | 'system2' | 'hybrid';
  confidence_difference: number;
  resolution_strategy: string;
  reasoning: string;
}

interface ProcessingDecision {
  use_system1: boolean;
  use_system2: boolean;
  conflict_expected: boolean;
  reasoning: string;
}

export class DualProcessController {
  private initialized: boolean = false;
  private system1: IntuitiveProcessor;
  private system2: DeliberativeProcessor;
  private lastActivity: number = 0;
  private config: any = {};

  constructor() {
    this.system1 = new IntuitiveProcessor();
    this.system2 = new DeliberativeProcessor();
  }

  async initialize(config: any): Promise<void> {
    this.config = {
      system2_activation_threshold: 0.6,
      conflict_threshold: 0.3,
      confidence_weight: 0.4,
      processing_time_weight: 0.2,
      complexity_weight: 0.4,
      max_processing_time: 30000,
      hybrid_blend_ratio: 0.6, // How much to weight System 2 in hybrid mode
      ...config
    };

    await this.system1.initialize(config.system1 || {});
    await this.system2.initialize(config.system2 || {});
    
    this.initialized = true;
  }

  async process(input: CognitiveInput): Promise<ThoughtResult> {
    const startTime = Date.now();
    this.lastActivity = startTime;

    try {
      // Step 1: Decide which systems to activate
      const decision = this.makeProcessingDecision(input);

      // Step 2: Run System 1 (always runs first)
      const system1Result = await this.system1.processIntuitive(input);

      let system2Result: ThoughtResult | null = null;
      let finalResult: ThoughtResult;

      // Step 3: Run System 2 if needed
      if (decision.use_system2) {
        system2Result = await this.system2.processDeliberative(input);
      }

      // Step 4: Resolve conflicts and select final result
      if (system2Result) {
        const resolution = this.resolveConflict(system1Result, system2Result, input);
        finalResult = this.applyResolution(system1Result, system2Result, resolution);
      } else {
        finalResult = system1Result;
      }

      // Step 5: Add dual-process metadata
      const processingTime = Date.now() - startTime;
      finalResult.metadata = this.enhanceMetadata(finalResult.metadata, {
        dual_process_decision: decision,
        system1_confidence: system1Result.confidence,
        system2_confidence: system2Result?.confidence || null,
        conflict_resolution: system2Result ? this.getLastResolution() : null,
        total_processing_time: processingTime
      });

      return finalResult;

    } catch (error) {
      throw new Error(`Dual process control failed: ${(error as Error).message}`);
    }
  }

  private makeProcessingDecision(input: CognitiveInput): ProcessingDecision {
    let system2Score = 0;
    const reasons: string[] = [];

    // Factor 1: Explicit mode request
    if (input.mode === ProcessingMode.DELIBERATIVE || input.mode === ProcessingMode.ANALYTICAL) {
      system2Score += 1.0;
      reasons.push('Explicit deliberative mode requested');
    } else if (input.mode === ProcessingMode.INTUITIVE) {
      system2Score -= 0.5;
      reasons.push('Explicit intuitive mode requested');
    }

    // Factor 2: Input complexity
    const complexity = this.assessComplexity(input.input);
    if (complexity > 0.7) {
      system2Score += 0.4;
      reasons.push(`High complexity detected (${complexity.toFixed(2)})`);
    }

    // Factor 3: Uncertainty indicators
    const uncertaintyWords = ['maybe', 'perhaps', 'might', 'could', 'uncertain', 'unclear', 'complex', 'difficult'];
    const uncertaintyCount = uncertaintyWords.filter(word => 
      input.input.toLowerCase().includes(word)
    ).length;
    
    if (uncertaintyCount > 0) {
      system2Score += uncertaintyCount * 0.2;
      reasons.push(`Uncertainty indicators found (${uncertaintyCount})`);
    }

    // Factor 4: Question complexity
    if (this.isComplexQuestion(input.input)) {
      system2Score += 0.3;
      reasons.push('Complex question structure detected');
    }

    // Factor 5: Context importance
    if (input.context.urgency !== undefined && input.context.urgency < 0.3) {
      system2Score += 0.2;
      reasons.push('Low urgency allows for deliberation');
    }

    // Factor 6: Previous context suggests need for careful thinking
    if (input.context.previous_thoughts && input.context.previous_thoughts.length > 0) {
      const hasComplexPrevious = input.context.previous_thoughts.some(thought => 
        thought.length > 100 || thought.includes('analyze') || thought.includes('consider')
      );
      if (hasComplexPrevious) {
        system2Score += 0.2;
        reasons.push('Previous complex thoughts suggest continued deliberation');
      }
    }

    const useSystem2 = system2Score >= this.config.system2_activation_threshold;
    
    return {
      use_system1: true, // Always use System 1
      use_system2: useSystem2,
      conflict_expected: useSystem2 && system2Score < 0.8, // Expect conflict if borderline decision
      reasoning: reasons.join('; ')
    };
  }

  private assessComplexity(input: string): number {
    let complexity = 0;

    // Length factor
    complexity += Math.min(input.length / 500, 0.3);

    // Sentence structure complexity
    const sentences = input.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = input.length / sentences.length;
    complexity += Math.min(avgSentenceLength / 50, 0.2);

    // Complex words and concepts
    const complexWords = ['analyze', 'synthesize', 'evaluate', 'compare', 'contrast', 'implications', 'consequences', 'relationships', 'systematic', 'comprehensive'];
    const complexWordCount = complexWords.filter(word => 
      input.toLowerCase().includes(word)
    ).length;
    complexity += complexWordCount * 0.1;

    // Multiple questions or topics
    const questionMarks = (input.match(/\?/g) || []).length;
    if (questionMarks > 1) {
      complexity += 0.2;
    }

    // Conditional statements
    const conditionalWords = ['if', 'when', 'unless', 'provided that', 'assuming'];
    const conditionalCount = conditionalWords.filter(word => 
      input.toLowerCase().includes(word)
    ).length;
    complexity += conditionalCount * 0.1;

    return Math.min(complexity, 1.0);
  }

  private isComplexQuestion(input: string): boolean {
    // Multi-part questions
    if ((input.match(/\?/g) || []).length > 1) return true;

    // Questions with multiple clauses
    const complexQuestionPatterns = [
      /what.*and.*how/i,
      /why.*but.*what/i,
      /how.*when.*where/i,
      /what.*if.*then/i
    ];

    return complexQuestionPatterns.some(pattern => pattern.test(input));
  }

  private resolveConflict(system1Result: ThoughtResult, system2Result: ThoughtResult, input: CognitiveInput): ConflictResolution {
    const confidenceDiff = Math.abs(system1Result.confidence - system2Result.confidence);
    
    // Determine if there's actually a conflict
    const contentSimilarity = this.assessContentSimilarity(system1Result.content, system2Result.content);
    const hasConflict = confidenceDiff > this.config.conflict_threshold || contentSimilarity < 0.5;

    if (!hasConflict) {
      // No significant conflict - blend the results
      return {
        selected_system: 'hybrid',
        confidence_difference: confidenceDiff,
        resolution_strategy: 'blend_compatible',
        reasoning: `Both systems agree (similarity: ${contentSimilarity.toFixed(2)}, confidence diff: ${confidenceDiff.toFixed(2)})`
      };
    }

    // Resolve conflict based on multiple factors
    let system1Score = 0;
    let system2Score = 0;
    const factors: string[] = [];

    // Factor 1: Confidence levels
    if (system1Result.confidence > system2Result.confidence) {
      system1Score += (system1Result.confidence - system2Result.confidence) * this.config.confidence_weight;
      factors.push(`System 1 more confident (+${(system1Result.confidence - system2Result.confidence).toFixed(2)})`);
    } else {
      system2Score += (system2Result.confidence - system1Result.confidence) * this.config.confidence_weight;
      factors.push(`System 2 more confident (+${(system2Result.confidence - system1Result.confidence).toFixed(2)})`);
    }

    // Factor 2: Processing time vs quality trade-off
    // Note: Processing times are available but not used in current logic
    
    if (input.context.urgency && input.context.urgency > 0.7) {
      // High urgency favors System 1
      system1Score += 0.3;
      factors.push('High urgency favors quick response');
    } else {
      // Low urgency allows for System 2's thoroughness
      system2Score += 0.2;
      factors.push('Low urgency allows thorough analysis');
    }

    // Factor 3: Complexity of reasoning
    const system1ReasoningComplexity = system1Result.reasoning_path.length;
    const system2ReasoningComplexity = system2Result.reasoning_path.length;
    
    if (system2ReasoningComplexity > system1ReasoningComplexity * 1.5) {
      system2Score += 0.2;
      factors.push('System 2 provides more detailed reasoning');
    }

    // Factor 4: Mode preference
    if (input.mode === ProcessingMode.INTUITIVE) {
      system1Score += 0.3;
      factors.push('Intuitive mode preference');
    } else if (input.mode === ProcessingMode.DELIBERATIVE || input.mode === ProcessingMode.ANALYTICAL) {
      system2Score += 0.3;
      factors.push('Deliberative mode preference');
    }

    // Factor 5: Emotional context appropriateness
    const emotionalIntensity = Math.abs(system1Result.emotional_context.valence) + system1Result.emotional_context.arousal;
    if (emotionalIntensity > 0.7) {
      system1Score += 0.1;
      factors.push('High emotional content favors intuitive processing');
    }

    // Make final decision
    let selectedSystem: 'system1' | 'system2' | 'hybrid';
    let strategy: string;

    if (Math.abs(system1Score - system2Score) < 0.2) {
      selectedSystem = 'hybrid';
      strategy = 'blend_weighted';
    } else if (system1Score > system2Score) {
      selectedSystem = 'system1';
      strategy = 'system1_override';
    } else {
      selectedSystem = 'system2';
      strategy = 'system2_override';
    }

    return {
      selected_system: selectedSystem,
      confidence_difference: confidenceDiff,
      resolution_strategy: strategy,
      reasoning: `Factors: ${factors.join('; ')}. Scores: S1=${system1Score.toFixed(2)}, S2=${system2Score.toFixed(2)}`
    };
  }

  private assessContentSimilarity(content1: string, content2: string): number {
    // Simple similarity assessment based on word overlap
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  private applyResolution(system1Result: ThoughtResult, system2Result: ThoughtResult, resolution: ConflictResolution): ThoughtResult {
    switch (resolution.selected_system) {
      case 'system1':
        return {
          ...system1Result,
          reasoning_path: this.addResolutionStep(system1Result.reasoning_path, resolution, 'system1')
        };

      case 'system2':
        return {
          ...system2Result,
          reasoning_path: this.addResolutionStep(system2Result.reasoning_path, resolution, 'system2')
        };

      case 'hybrid':
        return this.blendResults(system1Result, system2Result, resolution);

      default:
        return system1Result;
    }
  }

  private blendResults(system1Result: ThoughtResult, system2Result: ThoughtResult, resolution: ConflictResolution): ThoughtResult {
    const blendRatio = this.config.hybrid_blend_ratio;
    
    // Blend confidence
    const blendedConfidence = (system1Result.confidence * (1 - blendRatio)) + (system2Result.confidence * blendRatio);
    
    // Blend content
    let blendedContent: string;
    if (resolution.resolution_strategy === 'blend_compatible') {
      blendedContent = `Initial impression: ${system1Result.content}\n\nUpon further analysis: ${system2Result.content}\n\nIntegrated perspective: Both approaches converge on a comprehensive understanding.`;
    } else {
      blendedContent = `Intuitive assessment: ${system1Result.content}\n\nDeliberative analysis: ${system2Result.content}\n\nBalanced conclusion: Considering both perspectives, the situation requires both quick insight and careful analysis.`;
    }

    // Combine reasoning paths
    const combinedReasoning = [
      ...system1Result.reasoning_path.map(step => ({
        ...step,
        metadata: { ...step.metadata, source: 'system1' }
      })),
      ...system2Result.reasoning_path.map(step => ({
        ...step,
        metadata: { ...step.metadata, source: 'system2' }
      })),
      {
        type: ReasoningType.METACOGNITIVE,
        content: `Dual-process integration: ${resolution.reasoning}`,
        confidence: blendedConfidence,
        alternatives: []
      }
    ];

    // Blend emotional context
    const blendedEmotional: EmotionalState = {
      valence: (system1Result.emotional_context.valence * (1 - blendRatio)) + (system2Result.emotional_context.valence * blendRatio),
      arousal: (system1Result.emotional_context.arousal * (1 - blendRatio)) + (system2Result.emotional_context.arousal * blendRatio),
      dominance: (system1Result.emotional_context.dominance * (1 - blendRatio)) + (system2Result.emotional_context.dominance * blendRatio),
      specific_emotions: new Map([
        ...system1Result.emotional_context.specific_emotions,
        ...system2Result.emotional_context.specific_emotions,
        ['integration', blendedConfidence]
      ])
    };

    return {
      content: blendedContent,
      confidence: blendedConfidence,
      reasoning_path: combinedReasoning,
      emotional_context: blendedEmotional,
      metadata: {
        processing_time_ms: system1Result.metadata.processing_time_ms + system2Result.metadata.processing_time_ms,
        components_used: ['IntuitiveProcessor', 'DeliberativeProcessor', 'DualProcessController'],
        memory_retrievals: system1Result.metadata.memory_retrievals + system2Result.metadata.memory_retrievals,
        system_mode: ProcessingMode.BALANCED,
        temperature: (system1Result.metadata.temperature + system2Result.metadata.temperature) / 2
      }
    };
  }

  private addResolutionStep(reasoningPath: ReasoningStep[], resolution: ConflictResolution, selectedSystem: string): ReasoningStep[] {
    const resolutionStep: ReasoningStep = {
      type: ReasoningType.METACOGNITIVE,
      content: `Dual-process resolution: Selected ${selectedSystem} (${resolution.resolution_strategy})`,
      confidence: 0.8,
      alternatives: [{
        content: `Alternative: Use ${selectedSystem === 'system1' ? 'system2' : 'system1'}`,
        confidence: 0.6,
        reasoning: resolution.reasoning
      }]
    };

    return [...reasoningPath, resolutionStep];
  }

  private enhanceMetadata(metadata: ThoughtMetadata, dualProcessInfo: any): ThoughtMetadata {
    return {
      ...metadata,
      dual_process_info: dualProcessInfo
    };
  }

  private lastResolution: ConflictResolution | null = null;

  private getLastResolution(): ConflictResolution | null {
    return this.lastResolution;
  }

  reset(): void {
    this.system1.reset();
    this.system2.reset();
    this.lastActivity = 0;
    this.lastResolution = null;
  }

  getStatus(): ComponentStatus {
    const system1Status = this.system1.getStatus();
    const system2Status = this.system2.getStatus();

    return {
      name: 'DualProcessController',
      initialized: this.initialized && system1Status.initialized && system2Status.initialized,
      active: Date.now() - this.lastActivity < 30000,
      last_activity: this.lastActivity,
      error: system1Status.error || system2Status.error || ''
    };
  }

  // Additional methods for external access
  getSystem1Status(): ComponentStatus {
    return this.system1.getStatus();
  }

  getSystem2Status(): ComponentStatus {
    return this.system2.getStatus();
  }

  async processSystem1Only(input: CognitiveInput): Promise<ThoughtResult> {
    return await this.system1.processIntuitive(input);
  }

  async processSystem2Only(input: CognitiveInput): Promise<ThoughtResult> {
    return await this.system2.processDeliberative(input);
  }
}