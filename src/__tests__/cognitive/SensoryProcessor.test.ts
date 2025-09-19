/**
 * Unit tests for SensoryProcessor
 * Tests all aspects of sensory processing including tokenization, attention filtering,
 * pattern detection, and salience computation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SensoryProcessor, Token, ProcessedInput } from '../../cognitive/SensoryProcessor.js';
import { Pattern, SalienceMap } from '../../interfaces/cognitive.js';

describe('SensoryProcessor', () => {
  let processor: SensoryProcessor;

  beforeEach(async () => {
    processor = new SensoryProcessor();
    await processor.initialize({
      attention_threshold: 0.3,
      buffer_size: 10
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with default config', async () => {
      const newProcessor = new SensoryProcessor();
      await newProcessor.initialize({});
      
      const status = newProcessor.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.active).toBe(true);
      expect(status.name).toBe('SensoryProcessor');
    });

    it('should initialize with custom config', async () => {
      const newProcessor = new SensoryProcessor();
      await newProcessor.initialize({
        attention_threshold: 0.5,
        buffer_size: 20
      });
      
      const status = newProcessor.getStatus();
      expect(status.initialized).toBe(true);
    });

    it('should handle initialization errors', async () => {
      const newProcessor = new SensoryProcessor();
      
      // Mock initialization failure
      vi.spyOn(newProcessor as any, 'initializePatternModels').mockRejectedValue(new Error('Init failed'));
      
      await expect(newProcessor.initialize({})).rejects.toThrow('Init failed');
      
      const status = newProcessor.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.error).toContain('Initialization failed');
    });
  });

  describe('Tokenization', () => {
    it('should tokenize simple text correctly', () => {
      const input = "Hello world, this is a test.";
      const tokens = processor.tokenize(input);
      
      expect(tokens).toHaveLength(6);
      expect(tokens[0].text).toBe('hello');
      expect(tokens[1].text).toBe('world');
      expect(tokens[0].position).toBe(0);
      expect(tokens[1].position).toBe(1);
    });

    it('should assign semantic weights to tokens', () => {
      const input = "The intelligent system processes information efficiently.";
      const tokens = processor.tokenize(input);
      
      // Content words should have higher semantic weight than function words
      const theToken = tokens.find(t => t.text === 'the');
      const intelligentToken = tokens.find(t => t.text === 'intelligent');
      const systemToken = tokens.find(t => t.text === 'system');
      
      expect(theToken?.semantic_weight).toBeLessThan(intelligentToken?.semantic_weight || 0);
      expect(theToken?.semantic_weight).toBeLessThan(systemToken?.semantic_weight || 0);
    });

    it('should compute attention scores for tokens', () => {
      const input = "Important message about cognitive processing.";
      const tokens = processor.tokenize(input);
      
      tokens.forEach(token => {
        expect(token.attention_score).toBeGreaterThanOrEqual(0.1);
        expect(token.attention_score).toBeLessThanOrEqual(1.0);
      });
      
      // First and last tokens should have higher attention (position bias)
      expect(tokens[0].attention_score).toBeGreaterThan(0.5);
      expect(tokens[tokens.length - 1].attention_score).toBeGreaterThan(0.5);
    });

    it('should extract context tags', () => {
      const input = "The quick brown fox jumps over the lazy dog.";
      const tokens = processor.tokenize(input);
      
      // Check that tokens have appropriate context tags
      const foxToken = tokens.find(t => t.text === 'fox');
      const jumpsToken = tokens.find(t => t.text === 'jumps');
      
      expect(foxToken?.context_tags).toContain('noun');
      expect(jumpsToken?.context_tags).toContain('verb');
      
      // First token should have sentence_start tag
      expect(tokens[0].context_tags).toContain('sentence_start');
      
      // Last token should have sentence_end tag
      expect(tokens[tokens.length - 1].context_tags).toContain('sentence_end');
    });

    it('should handle empty input', () => {
      const tokens = processor.tokenize("");
      expect(tokens).toHaveLength(0);
    });

    it('should handle punctuation and special characters', () => {
      const input = "Hello, world! How are you? I'm fine.";
      const tokens = processor.tokenize(input);
      
      // Should filter out punctuation and normalize
      expect(tokens.every(t => /^[a-z]+$/.test(t.text))).toBe(true);
    });
  });

  describe('Attention Filtering', () => {
    it('should filter tokens based on attention threshold', () => {
      const tokens: Token[] = [
        { text: 'important', position: 0, semantic_weight: 0.8, attention_score: 0.9, context_tags: ['noun'] },
        { text: 'the', position: 1, semantic_weight: 0.2, attention_score: 0.1, context_tags: [] },
        { text: 'system', position: 2, semantic_weight: 0.7, attention_score: 0.8, context_tags: ['noun'] },
        { text: 'is', position: 3, semantic_weight: 0.1, attention_score: 0.2, context_tags: [] }
      ];
      
      const filtered = processor.filterAttention(tokens, 0.5);
      
      // Should keep tokens above threshold, but minimum retention may keep more
      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.map(t => t.text)).toContain('important');
      expect(filtered.map(t => t.text)).toContain('system');
    });

    it('should preserve high importance tokens even if below threshold', () => {
      const tokens: Token[] = [
        { text: 'entity', position: 0, semantic_weight: 0.9, attention_score: 0.3, context_tags: ['entity'] },
        { text: 'action', position: 1, semantic_weight: 0.8, attention_score: 0.2, context_tags: ['action'] },
        { text: 'normal', position: 2, semantic_weight: 0.5, attention_score: 0.2, context_tags: [] }
      ];
      
      const filtered = processor.filterAttention(tokens, 0.5);
      
      // Should keep entity and action tokens despite low attention scores
      expect(filtered.map(t => t.text)).toContain('entity');
      expect(filtered.map(t => t.text)).toContain('action');
      expect(filtered.length).toBeGreaterThanOrEqual(2);
    });

    it('should ensure minimum information retention', () => {
      const tokens: Token[] = Array.from({ length: 10 }, (_, i) => ({
        text: `word${i}`,
        position: i,
        semantic_weight: 0.3,
        attention_score: 0.1, // All below threshold
        context_tags: []
      }));
      
      const filtered = processor.filterAttention(tokens, 0.5);
      
      // Should keep at least 30% of tokens
      expect(filtered.length).toBeGreaterThanOrEqual(3);
    });

    it('should compute dynamic threshold based on input complexity', () => {
      const simpleTokens: Token[] = [
        { text: 'hello', position: 0, semantic_weight: 0.5, attention_score: 0.6, context_tags: [] },
        { text: 'world', position: 1, semantic_weight: 0.5, attention_score: 0.6, context_tags: [] }
      ];
      
      const complexTokens: Token[] = Array.from({ length: 20 }, (_, i) => ({
        text: `word${i}`,
        position: i,
        semantic_weight: 0.5,
        attention_score: 0.4,
        context_tags: []
      }));
      
      const simpleFiltered = processor.filterAttention(simpleTokens, 0.5);
      const complexFiltered = processor.filterAttention(complexTokens, 0.5);
      
      // Complex input should retain more tokens due to minimum retention policy
      expect(complexFiltered.length).toBeGreaterThan(simpleFiltered.length);
      
      // Or at least the retention rate should be reasonable for complex input
      expect(complexFiltered.length / complexTokens.length).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect sequential patterns (n-grams)', () => {
      const tokens: Token[] = [
        { text: 'machine', position: 0, semantic_weight: 0.7, attention_score: 0.8, context_tags: ['noun'] },
        { text: 'learning', position: 1, semantic_weight: 0.8, attention_score: 0.9, context_tags: ['noun'] },
        { text: 'algorithm', position: 2, semantic_weight: 0.8, attention_score: 0.8, context_tags: ['noun'] }
      ];
      
      const patterns = processor.detectPatterns(tokens);
      
      const bigramPatterns = patterns.filter(p => p.type === '2-gram');
      const trigramPatterns = patterns.filter(p => p.type === '3-gram');
      
      expect(bigramPatterns.length).toBeGreaterThan(0);
      expect(trigramPatterns.length).toBeGreaterThan(0);
      
      // Should find "machine learning" bigram
      const mlPattern = bigramPatterns.find(p => 
        p.content.includes('machine') && p.content.includes('learning')
      );
      expect(mlPattern).toBeDefined();
      expect(mlPattern?.confidence).toBeGreaterThan(0.3);
    });

    it('should detect semantic patterns', () => {
      const tokens: Token[] = [
        { text: 'dog', position: 0, semantic_weight: 0.7, attention_score: 0.8, context_tags: ['entity'] },
        { text: 'runs', position: 1, semantic_weight: 0.6, attention_score: 0.7, context_tags: ['action'] },
        { text: 'cat', position: 2, semantic_weight: 0.7, attention_score: 0.8, context_tags: ['entity'] },
        { text: 'sleeps', position: 3, semantic_weight: 0.6, attention_score: 0.7, context_tags: ['action'] }
      ];
      
      const patterns = processor.detectPatterns(tokens);
      
      const semanticPatterns = patterns.filter(p => p.type === 'semantic_cluster');
      expect(semanticPatterns.length).toBeGreaterThan(0);
      
      // Should cluster entities and actions separately
      const entityCluster = semanticPatterns.find(p => 
        p.content.includes('dog') && p.content.includes('cat')
      );
      expect(entityCluster).toBeDefined();
    });

    it('should detect syntactic patterns', () => {
      const tokens: Token[] = [
        { text: 'big', position: 0, semantic_weight: 0.5, attention_score: 0.6, context_tags: ['adjective'] },
        { text: 'house', position: 1, semantic_weight: 0.7, attention_score: 0.8, context_tags: ['noun'] },
        { text: 'dog', position: 2, semantic_weight: 0.7, attention_score: 0.8, context_tags: ['noun'] },
        { text: 'barks', position: 3, semantic_weight: 0.6, attention_score: 0.7, context_tags: ['verb'] }
      ];
      
      const patterns = processor.detectPatterns(tokens);
      
      const adjectiveNounPattern = patterns.find(p => p.type === 'adjective_noun');
      const nounVerbPattern = patterns.find(p => p.type === 'noun_verb');
      
      expect(adjectiveNounPattern).toBeDefined();
      expect(adjectiveNounPattern?.content).toEqual(['big', 'house']);
      
      expect(nounVerbPattern).toBeDefined();
      expect(nounVerbPattern?.content).toEqual(['dog', 'barks']);
    });

    it('should detect repetition patterns', () => {
      const tokens: Token[] = [
        { text: 'the', position: 0, semantic_weight: 0.2, attention_score: 0.3, context_tags: [] },
        { text: 'cat', position: 1, semantic_weight: 0.7, attention_score: 0.8, context_tags: ['noun'] },
        { text: 'and', position: 2, semantic_weight: 0.2, attention_score: 0.3, context_tags: [] },
        { text: 'the', position: 3, semantic_weight: 0.2, attention_score: 0.3, context_tags: [] },
        { text: 'dog', position: 4, semantic_weight: 0.7, attention_score: 0.8, context_tags: ['noun'] }
      ];
      
      const patterns = processor.detectPatterns(tokens);
      
      const repetitionPattern = patterns.find(p => p.type === 'repetition');
      expect(repetitionPattern).toBeDefined();
      expect(repetitionPattern?.content).toEqual(['the']);
      expect(repetitionPattern?.confidence).toBeGreaterThan(0.2);
    });

    it('should cache pattern detection results', () => {
      const tokens: Token[] = [
        { text: 'test', position: 0, semantic_weight: 0.5, attention_score: 0.6, context_tags: [] }
      ];
      
      // First call
      const patterns1 = processor.detectPatterns(tokens);
      
      // Second call should use cache
      const patterns2 = processor.detectPatterns(tokens);
      
      expect(patterns1).toEqual(patterns2);
    });
  });

  describe('Salience Computation', () => {
    it('should compute salience scores for all tokens', () => {
      const tokens: Token[] = [
        { text: 'important', position: 0, semantic_weight: 0.9, attention_score: 0.8, context_tags: ['entity'] },
        { text: 'the', position: 1, semantic_weight: 0.2, attention_score: 0.3, context_tags: [] },
        { text: 'system', position: 2, semantic_weight: 0.7, attention_score: 0.7, context_tags: ['noun'] }
      ];
      
      const salienceMap = processor.computeSalience(tokens);
      
      expect(salienceMap.tokens).toHaveLength(3);
      expect(salienceMap.scores).toHaveLength(3);
      
      // Scores should be normalized between 0 and 1
      salienceMap.scores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
      
      // Important token should have highest salience
      const importantIndex = salienceMap.tokens.indexOf('important');
      const theIndex = salienceMap.tokens.indexOf('the');
      
      expect(salienceMap.scores[importantIndex]).toBeGreaterThan(salienceMap.scores[theIndex]);
    });

    it('should identify attention focus areas', () => {
      const tokens: Token[] = [
        { text: 'critical', position: 0, semantic_weight: 0.9, attention_score: 0.9, context_tags: ['entity'] },
        { text: 'information', position: 1, semantic_weight: 0.8, attention_score: 0.8, context_tags: ['noun'] },
        { text: 'the', position: 2, semantic_weight: 0.2, attention_score: 0.3, context_tags: [] }
      ];
      
      const salienceMap = processor.computeSalience(tokens);
      
      expect(salienceMap.attention_focus.length).toBeGreaterThan(0);
      expect(salienceMap.attention_focus).toContain('critical');
      expect(salienceMap.attention_focus).toContain('information');
      expect(salienceMap.attention_focus).not.toContain('the');
    });

    it('should handle empty token list', () => {
      const salienceMap = processor.computeSalience([]);
      
      expect(salienceMap.tokens).toHaveLength(0);
      expect(salienceMap.scores).toHaveLength(0);
      expect(salienceMap.attention_focus).toHaveLength(0);
    });
  });

  describe('Full Processing Pipeline', () => {
    it('should process input through complete pipeline', async () => {
      const input = "The intelligent cognitive system processes complex information efficiently using advanced algorithms.";
      
      const result = await processor.process(input);
      
      expect(result).toBeDefined();
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.salience_map.tokens.length).toBeGreaterThan(0);
      expect(result.semantic_chunks.length).toBeGreaterThan(0);
      
      // Should have filtered some tokens (or at least processed them)
      expect(typeof result.attention_filtered).toBe('boolean');
    });

    it('should create semantic chunks', async () => {
      const input = "Machine learning algorithms process data efficiently.";
      
      const result = await processor.process(input);
      
      expect(result.semantic_chunks.length).toBeGreaterThan(0);
      
      result.semantic_chunks.forEach(chunk => {
        expect(chunk.tokens.length).toBeGreaterThan(0);
        expect(chunk.coherence_score).toBeGreaterThanOrEqual(0);
        expect(chunk.coherence_score).toBeLessThanOrEqual(1);
        expect(chunk.importance).toBeGreaterThanOrEqual(0);
        expect(chunk.importance).toBeLessThanOrEqual(1);
        expect(chunk.semantic_category).toBeDefined();
      });
      
      // Chunks should be sorted by importance
      for (let i = 1; i < result.semantic_chunks.length; i++) {
        expect(result.semantic_chunks[i - 1].importance).toBeGreaterThanOrEqual(
          result.semantic_chunks[i].importance
        );
      }
    });

    it('should handle complex input with multiple patterns', async () => {
      const input = "The advanced artificial intelligence system uses machine learning algorithms to process natural language understanding tasks efficiently and accurately.";
      
      const result = await processor.process(input);
      
      // Should detect multiple types of patterns
      const patternTypes = new Set(result.patterns.map(p => p.type));
      expect(patternTypes.size).toBeGreaterThan(1);
      
      // Should have semantic clusters
      const semanticClusters = result.patterns.filter(p => p.type === 'semantic_cluster');
      expect(semanticClusters.length).toBeGreaterThan(0);
      
      // Should have n-gram patterns
      const ngramPatterns = result.patterns.filter(p => p.type.includes('-gram'));
      expect(ngramPatterns.length).toBeGreaterThan(0);
    });

    it('should update status during processing', async () => {
      const input = "Test input for status tracking.";
      
      const statusBefore = processor.getStatus();
      const lastActivityBefore = statusBefore.last_activity;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await processor.process(input);
      
      const statusAfter = processor.getStatus();
      expect(statusAfter.last_activity).toBeGreaterThan(lastActivityBefore);
      expect(statusAfter.active).toBe(true);
    });

    it('should handle processing errors gracefully', async () => {
      // Mock a processing error
      const originalTokenize = processor.tokenize;
      processor.tokenize = vi.fn().mockImplementation(() => {
        throw new Error('Tokenization failed');
      });
      
      await expect(processor.process("test input")).rejects.toThrow('Processing failed');
      
      const status = processor.getStatus();
      expect(status.error).toContain('Processing failed');
      
      // Restore original method
      processor.tokenize = originalTokenize;
    });
  });

  describe('Reset and Status', () => {
    it('should reset processor state', async () => {
      // Process some input to populate state
      await processor.process("Test input to populate state.");
      
      // Reset
      processor.reset();
      
      const status = processor.getStatus();
      expect(status.last_activity).toBeGreaterThan(0);
      
      // Internal state should be cleared (context buffer, pattern cache)
      // This is tested indirectly by ensuring consistent behavior after reset
    });

    it('should return accurate status information', () => {
      const status = processor.getStatus();
      
      expect(status.name).toBe('SensoryProcessor');
      expect(status.initialized).toBe(true);
      expect(status.active).toBe(true);
      expect(status.last_activity).toBeGreaterThan(0);
      expect(status.error).toBeUndefined();
    });

    it('should handle uninitialized processor', async () => {
      const uninitializedProcessor = new SensoryProcessor();
      
      await expect(uninitializedProcessor.process("test")).rejects.toThrow('SensoryProcessor not initialized');
      
      const status = uninitializedProcessor.getStatus();
      expect(status.initialized).toBe(false);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long input efficiently', async () => {
      const longInput = "word ".repeat(1000).trim();
      
      const startTime = Date.now();
      const result = await processor.process(longInput);
      const processingTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle single word input', async () => {
      const result = await processor.process("hello");
      
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].text).toBe('hello');
      expect(result.patterns.length).toBeGreaterThanOrEqual(0);
      expect(result.semantic_chunks).toHaveLength(1);
    });

    it('should handle input with only function words', async () => {
      const result = await processor.process("the and or but");
      
      expect(result.tokens.length).toBeGreaterThan(0);
      // Should still process even if all are function words
      expect(result.semantic_chunks.length).toBeGreaterThan(0);
    });

    it('should handle repeated processing of same input', async () => {
      const input = "Repeated processing test input.";
      
      const result1 = await processor.process(input);
      const result2 = await processor.process(input);
      
      // Results should be consistent
      expect(result1.tokens.length).toBe(result2.tokens.length);
      expect(result1.patterns.length).toBe(result2.patterns.length);
      
      // Pattern cache should be used for second call
      expect(result1.patterns).toEqual(result2.patterns);
    });
  });
});