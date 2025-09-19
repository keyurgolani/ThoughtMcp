/**
 * Factory functions for creating valid instances of core data models
 * Useful for testing and development
 */

import {
  Context,
  Alternative,
  ReasoningStep,
  EmotionalState,
  ThoughtMetadata,
  ThoughtResult,
  MemoryChunk,
  CognitiveInput,
  CognitiveConfig,
  Episode,
  Concept,
  ProcessingMode,
  ReasoningType
} from '../types/core.js';

/**
 * Creates a default Context object
 */
export function createDefaultContext(overrides: Partial<Context> = {}): Context {
  return {
    session_id: `session-${Date.now()}`,
    previous_thoughts: [],
    domain: 'general',
    urgency: 0.5,
    complexity: 0.5,
    ...overrides
  };
}

/**
 * Creates a default Alternative object
 */
export function createDefaultAlternative(overrides: Partial<Alternative> = {}): Alternative {
  return {
    content: 'Alternative reasoning path',
    confidence: 0.7,
    reasoning: 'This is an alternative approach to the problem',
    ...overrides
  };
}

/**
 * Creates a default ReasoningStep object
 */
export function createDefaultReasoningStep(overrides: Partial<ReasoningStep> = {}): ReasoningStep {
  return {
    type: ReasoningType.LOGICAL_INFERENCE,
    content: 'This is a reasoning step',
    confidence: 0.8,
    alternatives: [],
    metadata: {},
    ...overrides
  };
}

/**
 * Creates a default EmotionalState object
 */
export function createDefaultEmotionalState(overrides: Partial<EmotionalState> = {}): EmotionalState {
  const defaultState: EmotionalState = {
    valence: 0.0,
    arousal: 0.5,
    dominance: 0.5,
    specific_emotions: new Map([
      ['neutral', 0.8],
      ['curiosity', 0.3]
    ])
  };

  // Handle Map merging specially
  if (overrides.specific_emotions) {
    const mergedEmotions = new Map(defaultState.specific_emotions);
    for (const [emotion, value] of overrides.specific_emotions.entries()) {
      mergedEmotions.set(emotion, value);
    }
    overrides.specific_emotions = mergedEmotions;
  }

  return {
    ...defaultState,
    ...overrides
  };
}

/**
 * Creates a default ThoughtMetadata object
 */
export function createDefaultThoughtMetadata(overrides: Partial<ThoughtMetadata> = {}): ThoughtMetadata {
  return {
    processing_time_ms: 100,
    components_used: ['sensory', 'working_memory', 'system1'],
    memory_retrievals: 2,
    system_mode: ProcessingMode.BALANCED,
    temperature: 0.7,
    ...overrides
  };
}

/**
 * Creates a default ThoughtResult object
 */
export function createDefaultThoughtResult(overrides: Partial<ThoughtResult> = {}): ThoughtResult {
  const defaultResult: ThoughtResult = {
    content: 'This is a thought result',
    confidence: 0.8,
    reasoning_path: [createDefaultReasoningStep()],
    emotional_context: createDefaultEmotionalState(),
    metadata: createDefaultThoughtMetadata()
  };

  return {
    ...defaultResult,
    ...overrides
  };
}

/**
 * Creates a default MemoryChunk object
 */
export function createDefaultMemoryChunk(overrides: Partial<MemoryChunk> = {}): MemoryChunk {
  const defaultChunk: MemoryChunk = {
    content: { text: 'Memory content', type: 'text' },
    activation: 0.7,
    timestamp: Date.now(),
    associations: new Set(['concept1', 'concept2']),
    emotional_valence: 0.1,
    importance: 0.6,
    context_tags: ['general', 'learning']
  };

  // Handle Set merging specially
  if (overrides.associations) {
    const mergedAssociations = new Set([...defaultChunk.associations, ...overrides.associations]);
    overrides.associations = mergedAssociations;
  }

  return {
    ...defaultChunk,
    ...overrides
  };
}

/**
 * Creates a default CognitiveConfig object
 */
export function createDefaultCognitiveConfig(overrides: Partial<CognitiveConfig> = {}): CognitiveConfig {
  return {
    default_mode: ProcessingMode.BALANCED,
    enable_emotion: true,
    enable_metacognition: true,
    enable_prediction: true,
    working_memory_capacity: 7,
    episodic_memory_size: 1000,
    semantic_memory_size: 5000,
    consolidation_interval: 3600,
    noise_level: 0.1,
    temperature: 0.7,
    attention_threshold: 0.3,
    max_reasoning_depth: 10,
    timeout_ms: 30000,
    max_concurrent_sessions: 10,
    confidence_threshold: 0.6,
    system2_activation_threshold: 0.4,
    memory_retrieval_threshold: 0.5,
    ...overrides
  };
}

/**
 * Creates a default CognitiveInput object
 */
export function createDefaultCognitiveInput(overrides: Partial<CognitiveInput> = {}): CognitiveInput {
  return {
    input: 'What is the meaning of life?',
    context: createDefaultContext(),
    mode: ProcessingMode.BALANCED,
    configuration: createDefaultCognitiveConfig(),
    ...overrides
  };
}

/**
 * Creates a default Episode object
 */
export function createDefaultEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    content: { event: 'User interaction', details: 'User asked a question' },
    context: createDefaultContext(),
    timestamp: Date.now(),
    emotional_tags: ['curiosity', 'engagement'],
    importance: 0.7,
    decay_factor: 0.95,
    ...overrides
  };
}

/**
 * Creates a default Concept object
 */
export function createDefaultConcept(overrides: Partial<Concept> = {}): Concept {
  return {
    id: `concept-${Date.now()}`,
    content: { name: 'Test Concept', description: 'A concept for testing' },
    embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
    relations: ['related-concept-1', 'related-concept-2'],
    activation: 0.6,
    last_accessed: Date.now(),
    ...overrides
  };
}

/**
 * Creates a minimal valid Context (for testing edge cases)
 */
export function createMinimalContext(): Context {
  return {
    session_id: 'minimal-session'
  };
}

/**
 * Creates a minimal valid EmotionalState (for testing edge cases)
 */
export function createMinimalEmotionalState(): EmotionalState {
  return {
    valence: 0,
    arousal: 0,
    dominance: 0,
    specific_emotions: new Map()
  };
}

/**
 * Creates a minimal valid CognitiveConfig (for testing edge cases)
 */
export function createMinimalCognitiveConfig(): CognitiveConfig {
  return {
    default_mode: ProcessingMode.BALANCED,
    enable_emotion: false,
    enable_metacognition: false,
    enable_prediction: false,
    working_memory_capacity: 1,
    episodic_memory_size: 1,
    semantic_memory_size: 1,
    consolidation_interval: 1,
    noise_level: 0,
    temperature: 0.1,
    attention_threshold: 0,
    max_reasoning_depth: 1,
    timeout_ms: 1000,
    max_concurrent_sessions: 1,
    confidence_threshold: 0,
    system2_activation_threshold: 0,
    memory_retrieval_threshold: 0
  };
}

/**
 * Creates a complex ThoughtResult with multiple reasoning steps and alternatives
 */
export function createComplexThoughtResult(): ThoughtResult {
  return {
    content: 'Complex thought with multiple reasoning paths',
    confidence: 0.85,
    reasoning_path: [
      {
        type: ReasoningType.PATTERN_MATCH,
        content: 'Initial pattern recognition',
        confidence: 0.9,
        alternatives: [
          createDefaultAlternative({ content: 'Alternative pattern match', confidence: 0.7 })
        ]
      },
      {
        type: ReasoningType.LOGICAL_INFERENCE,
        content: 'Logical deduction from patterns',
        confidence: 0.8,
        alternatives: [
          createDefaultAlternative({ content: 'Alternative logical path', confidence: 0.6 }),
          createDefaultAlternative({ content: 'Another logical approach', confidence: 0.5 })
        ]
      },
      {
        type: ReasoningType.METACOGNITIVE,
        content: 'Self-reflection on reasoning quality',
        confidence: 0.75,
        alternatives: []
      }
    ],
    emotional_context: createDefaultEmotionalState({
      valence: 0.3,
      arousal: 0.6,
      specific_emotions: new Map([
        ['confidence', 0.8],
        ['curiosity', 0.7],
        ['satisfaction', 0.6]
      ])
    }),
    metadata: createDefaultThoughtMetadata({
      processing_time_ms: 250,
      components_used: ['sensory', 'working_memory', 'system1', 'system2', 'metacognition'],
      memory_retrievals: 5,
      system_mode: ProcessingMode.DELIBERATIVE
    })
  };
}

/**
 * Utility function to create test data sets
 */
export function createTestDataSet() {
  return {
    contexts: [
      createDefaultContext(),
      createMinimalContext(),
      createDefaultContext({ urgency: 1.0, complexity: 0.9 })
    ],
    emotionalStates: [
      createDefaultEmotionalState(),
      createMinimalEmotionalState(),
      createDefaultEmotionalState({ 
        valence: 0.8, 
        specific_emotions: new Map([['joy', 0.9], ['excitement', 0.7]]) 
      })
    ],
    thoughtResults: [
      createDefaultThoughtResult(),
      createComplexThoughtResult(),
      createDefaultThoughtResult({ confidence: 0.3, content: 'Low confidence thought' })
    ],
    memoryChunks: [
      createDefaultMemoryChunk(),
      createDefaultMemoryChunk({ importance: 1.0, emotional_valence: 0.8 }),
      createDefaultMemoryChunk({ activation: 0.1, associations: new Set() })
    ],
    cognitiveConfigs: [
      createDefaultCognitiveConfig(),
      createMinimalCognitiveConfig(),
      createDefaultCognitiveConfig({ 
        enable_emotion: false, 
        max_reasoning_depth: 20,
        temperature: 1.0 
      })
    ]
  };
}