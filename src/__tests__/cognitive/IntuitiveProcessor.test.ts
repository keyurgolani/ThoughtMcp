/**
 * Unit tests for IntuitiveProcessor (System 1)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntuitiveProcessor } from '../../cognitive/IntuitiveProcessor.js';
import { CognitiveInput, ProcessingMode, ReasoningType } from '../../types/core.js';

describe('IntuitiveProcessor', () => {
  let processor: IntuitiveProcessor;
  let mockInput: CognitiveInput;

  beforeEach(async () => {
    processor = new IntuitiveProcessor();
    await processor.initialize({
      pattern_threshold: 0.3,
      confidence_decay: 0.1,
      max_patterns: 50,
      heuristic_weight: 0.8
    });

    mockInput = {
      input: 'What is the best approach to solve this problem?',
      context: {
        session_id: 'test-session',
        domain: 'problem-solving',
        urgency: 0.5,
        complexity: 0.6
      },
      mode: ProcessingMode.INTUITIVE,
      configuration: {
        default_mode: ProcessingMode.INTUITIVE,
        enable_emotion: true,
        enable_metacognition: true,
        enable_prediction: true,
        working_memory_capacity: 7,
        episodic_memory_size: 1000,
        semantic_memory_size: 5000,
        consolidation_interval: 60000,
        noise_level: 0.1,
        temperature: 0.7,
        attention_threshold: 0.3,
        max_reasoning_depth: 5,
        timeout_ms: 30000,
        max_concurrent_sessions: 10,
        confidence_threshold: 0.6,
        system2_activation_threshold: 0.6,
        memory_retrieval_threshold: 0.3
      }
    };
  });

  describe('Initialization', () => {
    it('should initialize successfully with default config', async () => {
      const newProcessor = new IntuitiveProcessor();
      await newProcessor.initialize({});
      
      const status = newProcessor.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.name).toBe('IntuitiveProcessor');
    });

    it('should initialize with custom config', async () => {
      const newProcessor = new IntuitiveProcessor();
      await newProcessor.initialize({
        pattern_threshold: 0.5,
        max_patterns: 100
      });
      
      const status = newProcessor.getStatus();
      expect(status.initialized).toBe(true);
    });
  });

  describe('Pattern Matching', () => {
    it('should detect question patterns', () => {
      const patterns = processor.matchPatterns('What is the meaning of life?');
      
      const questionPatterns = patterns.filter(p => p.type === 'question');
      expect(questionPatterns.length).toBeGreaterThan(0);
      expect(questionPatterns[0].content).toContain('what');
      expect(questionPatterns[0].confidence).toBeGreaterThan(0.8);
    });

    it('should detect emotional patterns', () => {
      const patterns = processor.matchPatterns('I love this amazing solution!');
      
      const emotionalPatterns = patterns.filter(p => p.type === 'emotional');
      expect(emotionalPatterns.length).toBeGreaterThan(0);
      expect(emotionalPatterns.some(p => p.content.includes('love') || p.content.includes('amazing'))).toBe(true);
    });

    it('should detect causal patterns', () => {
      const patterns = processor.matchPatterns('This happened because of that reason');
      
      const causalPatterns = patterns.filter(p => p.type === 'causal');
      expect(causalPatterns.length).toBeGreaterThan(0);
      expect(causalPatterns[0].content).toContain('because');
    });

    it('should detect negation patterns', () => {
      const patterns = processor.matchPatterns('This is not the right answer');
      
      const negationPatterns = patterns.filter(p => p.type === 'negation');
      expect(negationPatterns.length).toBeGreaterThan(0);
      expect(negationPatterns[0].content).toContain('not');
    });

    it('should cache patterns for repeated inputs', () => {
      const input = 'What is the best approach?';
      
      const patterns1 = processor.matchPatterns(input);
      const patterns2 = processor.matchPatterns(input);
      
      expect(patterns1).toEqual(patterns2);
    });
  });

  describe('Heuristic Application', () => {
    it('should apply availability heuristic', () => {
      const patterns = [
        { type: 'test', content: ['test'], confidence: 0.8, salience: 0.9 }
      ];
      
      const results = processor.applyHeuristics('test input', patterns);
      
      expect(results.availability).toBeDefined();
      expect(results.availability.type).toBe('availability');
      expect(results.availability.confidence).toBeGreaterThan(0.5);
    });

    it('should apply representativeness heuristic', () => {
      const patterns = [
        { type: 'prototype', content: ['prototype'], confidence: 0.7, salience: 0.8 }
      ];
      
      const results = processor.applyHeuristics('test input', patterns);
      
      expect(results.representativeness).toBeDefined();
      expect(results.representativeness.type).toBe('representativeness');
    });

    it('should handle empty patterns gracefully', () => {
      const results = processor.applyHeuristics('test input', []);
      
      expect(results.availability).toBeDefined();
      expect(results.representativeness).toBeDefined();
      expect(results.anchoring).toBeDefined();
      expect(results.affect).toBeDefined();
    });
  });

  describe('Intuitive Processing', () => {
    it('should process input and return ThoughtResult', async () => {
      const result = await processor.processIntuitive(mockInput);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning_path).toBeDefined();
      expect(result.emotional_context).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should have appropriate confidence levels', async () => {
      const result = await processor.processIntuitive(mockInput);
      
      // System 1 should have moderate to high confidence
      expect(result.confidence).toBeGreaterThan(0.1);
      expect(result.confidence).toBeLessThan(0.95); // Not too overconfident
    });

    it('should generate reasoning path', async () => {
      const result = await processor.processIntuitive(mockInput);
      
      expect(result.reasoning_path.length).toBeGreaterThan(0);
      expect(result.reasoning_path[0].type).toBe(ReasoningType.PATTERN_MATCH);
      expect(result.reasoning_path[0].content).toBeDefined();
    });

    it('should assess emotional context', async () => {
      const emotionalInput = {
        ...mockInput,
        input: 'I hate this terrible problem!'
      };
      
      const result = await processor.processIntuitive(emotionalInput);
      
      expect(result.emotional_context.valence).toBeLessThan(0); // Negative valence
      expect(result.emotional_context.arousal).toBeGreaterThan(0.3); // Higher arousal
    });

    it('should handle complex questions', async () => {
      const complexInput = {
        ...mockInput,
        input: 'How can we analyze the relationship between cause and effect while considering multiple variables?'
      };
      
      const result = await processor.processIntuitive(complexInput);
      
      expect(result.content).toBeDefined();
      expect(result.reasoning_path.length).toBeGreaterThan(1);
    });

    it('should process quickly (System 1 characteristic)', async () => {
      const startTime = Date.now();
      await processor.processIntuitive(mockInput);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(1000); // Should be fast
    });
  });

  describe('Confidence Assessment', () => {
    it('should calculate confidence based on patterns and heuristics', () => {
      const mockResult = {
        dominant_pattern: { confidence: 0.8, salience: 0.9 },
        dominant_heuristic: { confidence: 0.7 }
      };
      
      const confidence = processor.getConfidence(mockResult);
      
      expect(confidence).toBeGreaterThan(0.1);
      expect(confidence).toBeLessThanOrEqual(0.9);
    });

    it('should handle missing pattern or heuristic', () => {
      const mockResult = {
        dominant_pattern: null,
        dominant_heuristic: { confidence: 0.6 }
      };
      
      const confidence = processor.getConfidence(mockResult);
      
      expect(confidence).toBeGreaterThan(0.1);
      expect(confidence).toBeLessThanOrEqual(0.9);
    });
  });

  describe('Status and Reset', () => {
    it('should report correct status', () => {
      const status = processor.getStatus();
      
      expect(status.name).toBe('IntuitiveProcessor');
      expect(status.initialized).toBe(true);
      expect(status.active).toBe(false); // No recent activity
    });

    it('should reset successfully', () => {
      processor.reset();
      
      const status = processor.getStatus();
      expect(status.last_activity).toBe(0);
    });

    it('should show active status after processing', async () => {
      await processor.processIntuitive(mockInput);
      
      const status = processor.getStatus();
      expect(status.active).toBe(true);
      expect(status.last_activity).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed input gracefully', async () => {
      const badInput = {
        ...mockInput,
        input: ''
      };
      
      const result = await processor.processIntuitive(badInput);
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle processing errors', async () => {
      // Create a processor with invalid config to trigger errors
      const badProcessor = new IntuitiveProcessor();
      await badProcessor.initialize({
        pattern_threshold: -1, // Invalid threshold
        max_patterns: 0
      });
      
      // Should still process without throwing
      const result = await badProcessor.processIntuitive(mockInput);
      expect(result).toBeDefined();
    });
  });

  describe('Pattern Cache Management', () => {
    it('should limit cache size', () => {
      // Fill cache beyond limit
      for (let i = 0; i < 60; i++) {
        processor.matchPatterns(`test input ${i}`);
      }
      
      // Should still work without errors
      const patterns = processor.matchPatterns('new test input');
      expect(patterns).toBeDefined();
    });
  });

  describe('Response Generation', () => {
    it('should generate appropriate responses for different question types', async () => {
      const questions = [
        'What is this?',
        'How does this work?',
        'Why did this happen?',
        'When should we do this?',
        'Where can we find this?'
      ];
      
      for (const question of questions) {
        const input = { ...mockInput, input: question };
        const result = await processor.processIntuitive(input);
        
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(10);
      }
    });

    it('should handle non-question inputs', async () => {
      const statement = { ...mockInput, input: 'This is a simple statement.' };
      const result = await processor.processIntuitive(statement);
      
      expect(result.content).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });
});