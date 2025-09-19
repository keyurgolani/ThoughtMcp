/**
 * Unit tests for factory functions
 */

import { describe, it, expect } from 'vitest';
import {
  createDefaultContext,
  createDefaultAlternative,
  createDefaultReasoningStep,
  createDefaultEmotionalState,
  createDefaultThoughtMetadata,
  createDefaultThoughtResult,
  createDefaultMemoryChunk,
  createDefaultCognitiveConfig,
  createDefaultCognitiveInput,
  createDefaultEpisode,
  createDefaultConcept,
  createMinimalContext,
  createMinimalEmotionalState,
  createMinimalCognitiveConfig,
  createComplexThoughtResult,
  createTestDataSet
} from '../utils/factories.js';
import {
  validateContext,
  validateAlternative,
  validateReasoningStep,
  validateEmotionalState,
  validateThoughtMetadata,
  validateThoughtResult,
  validateMemoryChunk,
  validateCognitiveConfig,
  validateCognitiveInput,
  validateEpisode,
  validateConcept
} from '../utils/validation.js';
import { ProcessingMode, ReasoningType } from '../types/core.js';

describe('Factory Functions', () => {
  describe('createDefaultContext', () => {
    it('should create a valid default context', () => {
      const context = createDefaultContext();
      expect(() => validateContext(context)).not.toThrow();
      expect(context.session_id).toMatch(/^session-\d+$/);
      expect(context.urgency).toBe(0.5);
      expect(context.complexity).toBe(0.5);
    });

    it('should apply overrides correctly', () => {
      const context = createDefaultContext({ 
        urgency: 0.9, 
        domain: 'test-domain' 
      });
      expect(() => validateContext(context)).not.toThrow();
      expect(context.urgency).toBe(0.9);
      expect(context.domain).toBe('test-domain');
    });
  });

  describe('createDefaultAlternative', () => {
    it('should create a valid default alternative', () => {
      const alternative = createDefaultAlternative();
      expect(() => validateAlternative(alternative)).not.toThrow();
      expect(alternative.confidence).toBe(0.7);
    });

    it('should apply overrides correctly', () => {
      const alternative = createDefaultAlternative({ 
        confidence: 0.9,
        content: 'Custom content' 
      });
      expect(() => validateAlternative(alternative)).not.toThrow();
      expect(alternative.confidence).toBe(0.9);
      expect(alternative.content).toBe('Custom content');
    });
  });

  describe('createDefaultReasoningStep', () => {
    it('should create a valid default reasoning step', () => {
      const step = createDefaultReasoningStep();
      expect(() => validateReasoningStep(step)).not.toThrow();
      expect(step.type).toBe(ReasoningType.LOGICAL_INFERENCE);
      expect(step.confidence).toBe(0.8);
    });

    it('should apply overrides correctly', () => {
      const step = createDefaultReasoningStep({ 
        type: ReasoningType.PATTERN_MATCH,
        confidence: 0.95 
      });
      expect(() => validateReasoningStep(step)).not.toThrow();
      expect(step.type).toBe(ReasoningType.PATTERN_MATCH);
      expect(step.confidence).toBe(0.95);
    });
  });

  describe('createDefaultEmotionalState', () => {
    it('should create a valid default emotional state', () => {
      const state = createDefaultEmotionalState();
      expect(() => validateEmotionalState(state)).not.toThrow();
      expect(state.valence).toBe(0.0);
      expect(state.arousal).toBe(0.5);
      expect(state.specific_emotions.has('neutral')).toBe(true);
    });

    it('should merge specific emotions correctly', () => {
      const customEmotions = new Map([['joy', 0.8], ['excitement', 0.6]]);
      const state = createDefaultEmotionalState({ 
        valence: 0.5,
        specific_emotions: customEmotions 
      });
      expect(() => validateEmotionalState(state)).not.toThrow();
      expect(state.valence).toBe(0.5);
      expect(state.specific_emotions.has('joy')).toBe(true);
      expect(state.specific_emotions.has('neutral')).toBe(true); // Should keep defaults
    });
  });

  describe('createDefaultThoughtMetadata', () => {
    it('should create valid default thought metadata', () => {
      const metadata = createDefaultThoughtMetadata();
      expect(() => validateThoughtMetadata(metadata)).not.toThrow();
      expect(metadata.processing_time_ms).toBe(100);
      expect(metadata.system_mode).toBe(ProcessingMode.BALANCED);
    });
  });

  describe('createDefaultThoughtResult', () => {
    it('should create a valid default thought result', () => {
      const result = createDefaultThoughtResult();
      expect(() => validateThoughtResult(result)).not.toThrow();
      expect(result.confidence).toBe(0.8);
      expect(result.reasoning_path).toHaveLength(1);
    });

    it('should apply overrides correctly', () => {
      const result = createDefaultThoughtResult({ 
        confidence: 0.95,
        content: 'Custom thought content' 
      });
      expect(() => validateThoughtResult(result)).not.toThrow();
      expect(result.confidence).toBe(0.95);
      expect(result.content).toBe('Custom thought content');
    });
  });

  describe('createDefaultMemoryChunk', () => {
    it('should create a valid default memory chunk', () => {
      const chunk = createDefaultMemoryChunk();
      expect(() => validateMemoryChunk(chunk)).not.toThrow();
      expect(chunk.activation).toBe(0.7);
      expect(chunk.associations.has('concept1')).toBe(true);
    });

    it('should merge associations correctly', () => {
      const additionalAssociations = new Set(['concept3', 'concept4']);
      const chunk = createDefaultMemoryChunk({ 
        associations: additionalAssociations 
      });
      expect(() => validateMemoryChunk(chunk)).not.toThrow();
      expect(chunk.associations.has('concept1')).toBe(true); // Should keep defaults
      expect(chunk.associations.has('concept3')).toBe(true); // Should add new ones
    });
  });

  describe('createDefaultCognitiveConfig', () => {
    it('should create a valid default cognitive config', () => {
      const config = createDefaultCognitiveConfig();
      expect(() => validateCognitiveConfig(config)).not.toThrow();
      expect(config.working_memory_capacity).toBe(7);
      expect(config.default_mode).toBe(ProcessingMode.BALANCED);
    });

    it('should apply overrides correctly', () => {
      const config = createDefaultCognitiveConfig({ 
        working_memory_capacity: 10,
        enable_emotion: false 
      });
      expect(() => validateCognitiveConfig(config)).not.toThrow();
      expect(config.working_memory_capacity).toBe(10);
      expect(config.enable_emotion).toBe(false);
    });
  });

  describe('createDefaultCognitiveInput', () => {
    it('should create a valid default cognitive input', () => {
      const input = createDefaultCognitiveInput();
      expect(() => validateCognitiveInput(input)).not.toThrow();
      expect(input.mode).toBe(ProcessingMode.BALANCED);
      expect(input.input).toBe('What is the meaning of life?');
    });

    it('should apply overrides correctly', () => {
      const input = createDefaultCognitiveInput({ 
        input: 'Custom question?',
        mode: ProcessingMode.DELIBERATIVE 
      });
      expect(() => validateCognitiveInput(input)).not.toThrow();
      expect(input.input).toBe('Custom question?');
      expect(input.mode).toBe(ProcessingMode.DELIBERATIVE);
    });
  });

  describe('createDefaultEpisode', () => {
    it('should create a valid default episode', () => {
      const episode = createDefaultEpisode();
      expect(() => validateEpisode(episode)).not.toThrow();
      expect(episode.importance).toBe(0.7);
      expect(episode.emotional_tags).toContain('curiosity');
    });
  });

  describe('createDefaultConcept', () => {
    it('should create a valid default concept', () => {
      const concept = createDefaultConcept();
      expect(() => validateConcept(concept)).not.toThrow();
      expect(concept.id).toMatch(/^concept-\d+$/);
      expect(concept.activation).toBe(0.6);
    });
  });

  describe('Minimal factories', () => {
    it('should create minimal valid context', () => {
      const context = createMinimalContext();
      expect(() => validateContext(context)).not.toThrow();
      expect(context.session_id).toBe('minimal-session');
      expect(context.urgency).toBeUndefined();
    });

    it('should create minimal valid emotional state', () => {
      const state = createMinimalEmotionalState();
      expect(() => validateEmotionalState(state)).not.toThrow();
      expect(state.valence).toBe(0);
      expect(state.specific_emotions.size).toBe(0);
    });

    it('should create minimal valid cognitive config', () => {
      const config = createMinimalCognitiveConfig();
      expect(() => validateCognitiveConfig(config)).not.toThrow();
      expect(config.working_memory_capacity).toBe(1);
      expect(config.enable_emotion).toBe(false);
    });
  });

  describe('createComplexThoughtResult', () => {
    it('should create a valid complex thought result', () => {
      const result = createComplexThoughtResult();
      expect(() => validateThoughtResult(result)).not.toThrow();
      expect(result.reasoning_path).toHaveLength(3);
      expect(result.reasoning_path[0].alternatives).toHaveLength(1);
      expect(result.reasoning_path[1].alternatives).toHaveLength(2);
      expect(result.emotional_context.specific_emotions.has('confidence')).toBe(true);
    });

    it('should have different reasoning types in path', () => {
      const result = createComplexThoughtResult();
      const types = result.reasoning_path.map(step => step.type);
      expect(types).toContain(ReasoningType.PATTERN_MATCH);
      expect(types).toContain(ReasoningType.LOGICAL_INFERENCE);
      expect(types).toContain(ReasoningType.METACOGNITIVE);
    });
  });

  describe('createTestDataSet', () => {
    it('should create a valid test data set', () => {
      const dataSet = createTestDataSet();
      
      expect(dataSet.contexts).toHaveLength(3);
      expect(dataSet.emotionalStates).toHaveLength(3);
      expect(dataSet.thoughtResults).toHaveLength(3);
      expect(dataSet.memoryChunks).toHaveLength(3);
      expect(dataSet.cognitiveConfigs).toHaveLength(3);

      // Validate all contexts
      dataSet.contexts.forEach(context => {
        expect(() => validateContext(context)).not.toThrow();
      });

      // Validate all emotional states
      dataSet.emotionalStates.forEach(state => {
        expect(() => validateEmotionalState(state)).not.toThrow();
      });

      // Validate all thought results
      dataSet.thoughtResults.forEach(result => {
        expect(() => validateThoughtResult(result)).not.toThrow();
      });

      // Validate all memory chunks
      dataSet.memoryChunks.forEach(chunk => {
        expect(() => validateMemoryChunk(chunk)).not.toThrow();
      });

      // Validate all cognitive configs
      dataSet.cognitiveConfigs.forEach(config => {
        expect(() => validateCognitiveConfig(config)).not.toThrow();
      });
    });

    it('should create diverse test data', () => {
      const dataSet = createTestDataSet();
      
      // Check that contexts have different urgency levels
      const urgencies = dataSet.contexts.map(c => c.urgency).filter(u => u !== undefined);
      expect(new Set(urgencies).size).toBeGreaterThan(1);

      // Check that thought results have different confidence levels
      const confidences = dataSet.thoughtResults.map(r => r.confidence);
      expect(new Set(confidences).size).toBeGreaterThan(1);

      // Check that memory chunks have different importance levels
      const importances = dataSet.memoryChunks.map(c => c.importance);
      expect(new Set(importances).size).toBeGreaterThan(1);
    });
  });
});