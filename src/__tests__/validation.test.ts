/**
 * Unit tests for data model validation functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateContext,
  validateAlternative,
  validateReasoningStep,
  validateEmotionalState,
  validateThoughtMetadata,
  validateThoughtResult,
  validateMemoryChunk,
  validateCognitiveInput,
  validateCognitiveConfig,
  validateEpisode,
  validateConcept,
  ValidationError
} from '../utils/validation.js';
import {
  ProcessingMode,
  ReasoningType,
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
  Concept
} from '../types/core.js';

describe('Validation Functions', () => {
  describe('validateContext', () => {
    it('should validate a valid context', () => {
      const validContext: Context = {
        session_id: 'test-session-123',
        previous_thoughts: ['thought1', 'thought2'],
        domain: 'test',
        urgency: 0.5,
        complexity: 0.7
      };

      expect(() => validateContext(validContext)).not.toThrow();
    });

    it('should throw error for invalid session_id', () => {
      const invalidContext = {
        session_id: '',
        urgency: 0.5
      } as Context;

      expect(() => validateContext(invalidContext)).toThrow(ValidationError);
      expect(() => validateContext(invalidContext)).toThrow('session_id must be a non-empty string');
    });

    it('should throw error for urgency out of range', () => {
      const invalidContext: Context = {
        session_id: 'test-session',
        urgency: 1.5
      };

      expect(() => validateContext(invalidContext)).toThrow(ValidationError);
      expect(() => validateContext(invalidContext)).toThrow('urgency must be between 0 and 1');
    });

    it('should throw error for invalid previous_thoughts type', () => {
      const invalidContext = {
        session_id: 'test-session',
        previous_thoughts: 'not an array'
      } as any;

      expect(() => validateContext(invalidContext)).toThrow(ValidationError);
      expect(() => validateContext(invalidContext)).toThrow('previous_thoughts must be an array');
    });
  });

  describe('validateAlternative', () => {
    it('should validate a valid alternative', () => {
      const validAlternative: Alternative = {
        content: 'Alternative reasoning',
        confidence: 0.8,
        reasoning: 'This is the reasoning behind the alternative'
      };

      expect(() => validateAlternative(validAlternative)).not.toThrow();
    });

    it('should throw error for empty content', () => {
      const invalidAlternative: Alternative = {
        content: '',
        confidence: 0.8,
        reasoning: 'Valid reasoning'
      };

      expect(() => validateAlternative(invalidAlternative)).toThrow(ValidationError);
      expect(() => validateAlternative(invalidAlternative)).toThrow('content must be a non-empty string');
    });

    it('should throw error for confidence out of range', () => {
      const invalidAlternative: Alternative = {
        content: 'Valid content',
        confidence: 1.5,
        reasoning: 'Valid reasoning'
      };

      expect(() => validateAlternative(invalidAlternative)).toThrow(ValidationError);
      expect(() => validateAlternative(invalidAlternative)).toThrow('confidence must be between 0 and 1');
    });
  });

  describe('validateReasoningStep', () => {
    it('should validate a valid reasoning step', () => {
      const validStep: ReasoningStep = {
        type: ReasoningType.LOGICAL_INFERENCE,
        content: 'This is a logical inference step',
        confidence: 0.9,
        alternatives: [
          {
            content: 'Alternative approach',
            confidence: 0.7,
            reasoning: 'Alternative reasoning'
          }
        ]
      };

      expect(() => validateReasoningStep(validStep)).not.toThrow();
    });

    it('should throw error for invalid reasoning type', () => {
      const invalidStep = {
        type: 'INVALID_TYPE',
        content: 'Valid content',
        confidence: 0.8,
        alternatives: []
      } as any;

      expect(() => validateReasoningStep(invalidStep)).toThrow(ValidationError);
      expect(() => validateReasoningStep(invalidStep)).toThrow('type must be a valid ReasoningType');
    });

    it('should throw error for invalid alternatives', () => {
      const invalidStep: ReasoningStep = {
        type: ReasoningType.PATTERN_MATCH,
        content: 'Valid content',
        confidence: 0.8,
        alternatives: [
          {
            content: '',
            confidence: 0.7,
            reasoning: 'Valid reasoning'
          }
        ]
      };

      expect(() => validateReasoningStep(invalidStep)).toThrow(ValidationError);
      expect(() => validateReasoningStep(invalidStep)).toThrow('Invalid alternative at index 0');
    });
  });

  describe('validateEmotionalState', () => {
    it('should validate a valid emotional state', () => {
      const validState: EmotionalState = {
        valence: 0.5,
        arousal: 0.7,
        dominance: 0.3,
        specific_emotions: new Map([
          ['joy', 0.8],
          ['curiosity', 0.6]
        ])
      };

      expect(() => validateEmotionalState(validState)).not.toThrow();
    });

    it('should throw error for valence out of range', () => {
      const invalidState: EmotionalState = {
        valence: -1.5,
        arousal: 0.5,
        dominance: 0.5,
        specific_emotions: new Map()
      };

      expect(() => validateEmotionalState(invalidState)).toThrow(ValidationError);
      expect(() => validateEmotionalState(invalidState)).toThrow('valence must be between -1 and 1');
    });

    it('should throw error for invalid specific_emotions type', () => {
      const invalidState = {
        valence: 0.5,
        arousal: 0.5,
        dominance: 0.5,
        specific_emotions: {}
      } as any;

      expect(() => validateEmotionalState(invalidState)).toThrow(ValidationError);
      expect(() => validateEmotionalState(invalidState)).toThrow('specific_emotions must be a Map');
    });

    it('should throw error for invalid emotion values', () => {
      const invalidState: EmotionalState = {
        valence: 0.5,
        arousal: 0.5,
        dominance: 0.5,
        specific_emotions: new Map([
          ['joy', 1.5]
        ])
      };

      expect(() => validateEmotionalState(invalidState)).toThrow(ValidationError);
      expect(() => validateEmotionalState(invalidState)).toThrow('specific emotion "joy" value must be between 0 and 1');
    });
  });

  describe('validateThoughtMetadata', () => {
    it('should validate valid thought metadata', () => {
      const validMetadata: ThoughtMetadata = {
        processing_time_ms: 150,
        components_used: ['sensory', 'working_memory', 'system1'],
        memory_retrievals: 3,
        system_mode: ProcessingMode.BALANCED,
        temperature: 0.7
      };

      expect(() => validateThoughtMetadata(validMetadata)).not.toThrow();
    });

    it('should throw error for negative processing time', () => {
      const invalidMetadata: ThoughtMetadata = {
        processing_time_ms: -50,
        components_used: ['sensory'],
        memory_retrievals: 1,
        system_mode: ProcessingMode.INTUITIVE,
        temperature: 0.5
      };

      expect(() => validateThoughtMetadata(invalidMetadata)).toThrow(ValidationError);
      expect(() => validateThoughtMetadata(invalidMetadata)).toThrow('processing_time_ms must be a positive number');
    });

    it('should throw error for invalid system_mode', () => {
      const invalidMetadata = {
        processing_time_ms: 100,
        components_used: ['sensory'],
        memory_retrievals: 1,
        system_mode: 'INVALID_MODE',
        temperature: 0.5
      } as any;

      expect(() => validateThoughtMetadata(invalidMetadata)).toThrow(ValidationError);
      expect(() => validateThoughtMetadata(invalidMetadata)).toThrow('system_mode must be a valid ProcessingMode');
    });
  });

  describe('validateThoughtResult', () => {
    it('should validate a complete valid thought result', () => {
      const validResult: ThoughtResult = {
        content: 'This is the thought result',
        confidence: 0.85,
        reasoning_path: [
          {
            type: ReasoningType.PATTERN_MATCH,
            content: 'Pattern matching step',
            confidence: 0.9,
            alternatives: []
          }
        ],
        emotional_context: {
          valence: 0.3,
          arousal: 0.5,
          dominance: 0.7,
          specific_emotions: new Map([['confidence', 0.8]])
        },
        metadata: {
          processing_time_ms: 200,
          components_used: ['sensory', 'system1'],
          memory_retrievals: 2,
          system_mode: ProcessingMode.INTUITIVE,
          temperature: 0.6
        }
      };

      expect(() => validateThoughtResult(validResult)).not.toThrow();
    });

    it('should throw error for empty content', () => {
      const invalidResult = {
        content: '',
        confidence: 0.8,
        reasoning_path: [],
        emotional_context: {
          valence: 0,
          arousal: 0,
          dominance: 0,
          specific_emotions: new Map()
        },
        metadata: {
          processing_time_ms: 100,
          components_used: [],
          memory_retrievals: 0,
          system_mode: ProcessingMode.BALANCED,
          temperature: 0.5
        }
      } as ThoughtResult;

      expect(() => validateThoughtResult(invalidResult)).toThrow(ValidationError);
      expect(() => validateThoughtResult(invalidResult)).toThrow('content must be a non-empty string');
    });
  });

  describe('validateMemoryChunk', () => {
    it('should validate a valid memory chunk', () => {
      const validChunk: MemoryChunk = {
        content: { text: 'Memory content', type: 'text' },
        activation: 0.8,
        timestamp: Date.now(),
        associations: new Set(['concept1', 'concept2']),
        emotional_valence: 0.3,
        importance: 0.7,
        context_tags: ['learning', 'important']
      };

      expect(() => validateMemoryChunk(validChunk)).not.toThrow();
    });

    it('should throw error for null content', () => {
      const invalidChunk: MemoryChunk = {
        content: null,
        activation: 0.8,
        timestamp: Date.now(),
        associations: new Set(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: []
      };

      expect(() => validateMemoryChunk(invalidChunk)).toThrow(ValidationError);
      expect(() => validateMemoryChunk(invalidChunk)).toThrow('content cannot be undefined or null');
    });

    it('should throw error for invalid associations type', () => {
      const invalidChunk = {
        content: 'Valid content',
        activation: 0.8,
        timestamp: Date.now(),
        associations: ['not', 'a', 'set'],
        emotional_valence: 0,
        importance: 0.5,
        context_tags: []
      } as any;

      expect(() => validateMemoryChunk(invalidChunk)).toThrow(ValidationError);
      expect(() => validateMemoryChunk(invalidChunk)).toThrow('associations must be a Set');
    });
  });

  describe('validateCognitiveInput', () => {
    it('should validate a valid cognitive input', () => {
      const validInput: CognitiveInput = {
        input: 'What is the meaning of life?',
        context: {
          session_id: 'session-123',
          urgency: 0.5,
          complexity: 0.7
        },
        mode: ProcessingMode.DELIBERATIVE,
        configuration: {
          default_mode: ProcessingMode.BALANCED,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: false,
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
          memory_retrieval_threshold: 0.5
        }
      };

      expect(() => validateCognitiveInput(validInput)).not.toThrow();
    });

    it('should throw error for empty input string', () => {
      const invalidInput = {
        input: '',
        context: { session_id: 'test' },
        mode: ProcessingMode.INTUITIVE,
        configuration: {} as CognitiveConfig
      } as CognitiveInput;

      expect(() => validateCognitiveInput(invalidInput)).toThrow(ValidationError);
      expect(() => validateCognitiveInput(invalidInput)).toThrow('input must be a non-empty string');
    });
  });

  describe('validateCognitiveConfig', () => {
    it('should validate a valid cognitive config', () => {
      const validConfig: CognitiveConfig = {
        default_mode: ProcessingMode.BALANCED,
        enable_emotion: true,
        enable_metacognition: true,
        enable_prediction: false,
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
        memory_retrieval_threshold: 0.5
      };

      expect(() => validateCognitiveConfig(validConfig)).not.toThrow();
    });

    it('should throw error for invalid working_memory_capacity', () => {
      const invalidConfig = {
        default_mode: ProcessingMode.BALANCED,
        enable_emotion: true,
        enable_metacognition: true,
        enable_prediction: false,
        working_memory_capacity: -5,
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
        memory_retrieval_threshold: 0.5
      } as CognitiveConfig;

      expect(() => validateCognitiveConfig(invalidConfig)).toThrow(ValidationError);
      expect(() => validateCognitiveConfig(invalidConfig)).toThrow('working_memory_capacity must be a positive integer');
    });

    it('should throw error for noise_level out of range', () => {
      const invalidConfig = {
        default_mode: ProcessingMode.BALANCED,
        enable_emotion: true,
        enable_metacognition: true,
        enable_prediction: false,
        working_memory_capacity: 7,
        episodic_memory_size: 1000,
        semantic_memory_size: 5000,
        consolidation_interval: 3600,
        noise_level: 1.5,
        temperature: 0.7,
        attention_threshold: 0.3,
        max_reasoning_depth: 10,
        timeout_ms: 30000,
        max_concurrent_sessions: 10,
        confidence_threshold: 0.6,
        system2_activation_threshold: 0.4,
        memory_retrieval_threshold: 0.5
      } as CognitiveConfig;

      expect(() => validateCognitiveConfig(invalidConfig)).toThrow(ValidationError);
      expect(() => validateCognitiveConfig(invalidConfig)).toThrow('noise_level must be between 0 and 1');
    });
  });

  describe('validateEpisode', () => {
    it('should validate a valid episode', () => {
      const validEpisode: Episode = {
        content: { event: 'User asked about AI', response: 'Provided explanation' },
        context: {
          session_id: 'session-123',
          domain: 'AI',
          urgency: 0.5
        },
        timestamp: Date.now(),
        emotional_tags: ['curiosity', 'satisfaction'],
        importance: 0.8,
        decay_factor: 0.95
      };

      expect(() => validateEpisode(validEpisode)).not.toThrow();
    });

    it('should throw error for invalid importance range', () => {
      const invalidEpisode: Episode = {
        content: 'Valid content',
        context: { session_id: 'test' },
        timestamp: Date.now(),
        emotional_tags: [],
        importance: 1.5,
        decay_factor: 0.9
      };

      expect(() => validateEpisode(invalidEpisode)).toThrow(ValidationError);
      expect(() => validateEpisode(invalidEpisode)).toThrow('importance must be between 0 and 1');
    });
  });

  describe('validateConcept', () => {
    it('should validate a valid concept', () => {
      const validConcept: Concept = {
        id: 'concept-123',
        content: { name: 'Artificial Intelligence', description: 'Machine intelligence' },
        embedding: [0.1, 0.2, 0.3, 0.4],
        relations: ['related-concept-1', 'related-concept-2'],
        activation: 0.7,
        last_accessed: Date.now()
      };

      expect(() => validateConcept(validConcept)).not.toThrow();
    });

    it('should throw error for empty id', () => {
      const invalidConcept: Concept = {
        id: '',
        content: 'Valid content',
        relations: [],
        activation: 0.5,
        last_accessed: Date.now()
      };

      expect(() => validateConcept(invalidConcept)).toThrow(ValidationError);
      expect(() => validateConcept(invalidConcept)).toThrow('id must be a non-empty string');
    });

    it('should throw error for invalid embedding type', () => {
      const invalidConcept = {
        id: 'valid-id',
        content: 'Valid content',
        embedding: 'not an array',
        relations: [],
        activation: 0.5,
        last_accessed: Date.now()
      } as any;

      expect(() => validateConcept(invalidConcept)).toThrow(ValidationError);
      expect(() => validateConcept(invalidConcept)).toThrow('embedding must be an array if provided');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with message and field', () => {
      const error = new ValidationError('Test error message', 'test.field');
      
      expect(error.message).toBe('Test error message');
      expect(error.field).toBe('test.field');
      expect(error.name).toBe('ValidationError');
      expect(error instanceof Error).toBe(true);
    });

    it('should create validation error with just message', () => {
      const error = new ValidationError('Test error message');
      
      expect(error.message).toBe('Test error message');
      expect(error.field).toBeUndefined();
      expect(error.name).toBe('ValidationError');
    });
  });
});