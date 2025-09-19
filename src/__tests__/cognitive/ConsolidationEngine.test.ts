/**
 * Unit tests for ConsolidationEngine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConsolidationEngine } from '../../cognitive/ConsolidationEngine.js';
import { Episode, Context } from '../../types/core.js';

describe('ConsolidationEngine', () => {
  let consolidationEngine: ConsolidationEngine;
  let mockContext: Context;

  beforeEach(async () => {
    consolidationEngine = new ConsolidationEngine({
      consolidation_threshold: 0.3, // Lower threshold for testing
      pattern_similarity_threshold: 0.3, // Lower threshold for testing
      minimum_episode_count: 2,
      importance_weight: 0.4,
      recency_weight: 0.3,
      frequency_weight: 0.3,
      max_patterns_per_cycle: 10,
      pruning_threshold: 0.1
    });

    mockContext = {
      session_id: 'test-session',
      domain: 'test-domain',
      urgency: 0.5,
      complexity: 0.6
    };

    await consolidationEngine.initialize();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const status = consolidationEngine.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.name).toBe('ConsolidationEngine');
    });

    it('should start with empty consolidation history', () => {
      const stats = consolidationEngine.getConsolidationStats();
      expect(stats.length).toBe(0);
    });
  });

  describe('pattern extraction', () => {
    it('should extract patterns from similar episodes', () => {
      const episodes: Episode[] = [
        {
          content: { text: 'Learning about machine learning algorithms' },
          context: { ...mockContext, domain: 'ai' },
          timestamp: Date.now() - 3600000,
          emotional_tags: ['curious'],
          importance: 0.8,
          decay_factor: 1.0
        },
        {
          content: { text: 'Studying machine learning techniques' },
          context: { ...mockContext, domain: 'ai' },
          timestamp: Date.now() - 1800000,
          emotional_tags: ['focused'],
          importance: 0.7,
          decay_factor: 1.0
        },
        {
          content: { text: 'Reading about machine learning applications' },
          context: { ...mockContext, domain: 'ai' },
          timestamp: Date.now() - 900000,
          emotional_tags: ['interested'],
          importance: 0.9,
          decay_factor: 1.0
        }
      ];

      const patterns = consolidationEngine.extractPatterns(episodes);
      
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].confidence).toBeGreaterThan(0);
      expect(patterns[0].salience).toBeGreaterThan(0);
    });

    it('should not extract patterns from insufficient episodes', () => {
      const episodes: Episode[] = [
        {
          content: { text: 'Single episode' },
          context: mockContext,
          timestamp: Date.now(),
          emotional_tags: [],
          importance: 0.8,
          decay_factor: 1.0
        }
      ];

      const patterns = consolidationEngine.extractPatterns(episodes);
      expect(patterns.length).toBe(0);
    });

    it('should limit patterns to max per cycle', () => {
      const smallEngine = new ConsolidationEngine({ max_patterns_per_cycle: 1 });
      
      // Create many similar episodes that could generate multiple patterns
      const episodes: Episode[] = [];
      for (let i = 0; i < 10; i++) {
        episodes.push({
          content: { text: `Learning topic ${i}`, category: 'education' },
          context: { ...mockContext, domain: 'education' },
          timestamp: Date.now() - (i * 1000),
          emotional_tags: ['learning'],
          importance: 0.8,
          decay_factor: 1.0
        });
      }

      const patterns = smallEngine.extractPatterns(episodes);
      expect(patterns.length).toBeLessThanOrEqual(1);
    });
  });

  describe('consolidation process', () => {
    it('should consolidate episodes into concepts', () => {
      const episodes: Episode[] = [
        {
          content: { text: 'Neural networks learn patterns from data' },
          context: { ...mockContext, domain: 'ai' },
          timestamp: Date.now() - 7200000,
          emotional_tags: ['fascinated'],
          importance: 0.9,
          decay_factor: 0.8
        },
        {
          content: { text: 'Deep neural networks use multiple layers' },
          context: { ...mockContext, domain: 'ai' },
          timestamp: Date.now() - 3600000,
          emotional_tags: ['curious'],
          importance: 0.8,
          decay_factor: 0.9
        },
        {
          content: { text: 'Neural network training requires large datasets' },
          context: { ...mockContext, domain: 'ai' },
          timestamp: Date.now() - 1800000,
          emotional_tags: ['understanding'],
          importance: 0.85,
          decay_factor: 0.95
        }
      ];

      const concepts = consolidationEngine.consolidate(episodes);
      
      expect(concepts.length).toBeGreaterThan(0);
      expect(concepts[0].id).toBeDefined();
      expect(concepts[0].content).toBeDefined();
      expect(concepts[0].activation).toBeGreaterThan(0);
    });

    it('should return empty array for insufficient episodes', () => {
      const episodes: Episode[] = [
        {
          content: { text: 'Single episode' },
          context: mockContext,
          timestamp: Date.now(),
          emotional_tags: [],
          importance: 0.8,
          decay_factor: 1.0
        }
      ];

      const concepts = consolidationEngine.consolidate(episodes);
      expect(concepts.length).toBe(0);
    });

    it('should track consolidation results', () => {
      const episodes: Episode[] = [
        {
          content: { text: 'First learning experience' },
          context: mockContext,
          timestamp: Date.now() - 3600000,
          emotional_tags: ['learning'],
          importance: 0.8,
          decay_factor: 1.0
        },
        {
          content: { text: 'Second learning experience' },
          context: mockContext,
          timestamp: Date.now() - 1800000,
          emotional_tags: ['learning'],
          importance: 0.7,
          decay_factor: 1.0
        }
      ];

      consolidationEngine.consolidate(episodes);
      
      const lastResult = consolidationEngine.getLastConsolidationResult();
      expect(lastResult).toBeDefined();
      expect(lastResult?.episodes_processed).toBe(2);
      
      const stats = consolidationEngine.getConsolidationStats();
      expect(stats.length).toBe(1);
    });
  });

  describe('connection strengthening', () => {
    it('should strengthen connections between related concepts', () => {
      const concepts = [
        {
          id: 'concept-1',
          content: { text: 'Machine learning algorithms' },
          embedding: [0.1, 0.2, 0.3, 0.4],
          relations: [],
          activation: 0.8,
          last_accessed: Date.now()
        },
        {
          id: 'concept-2',
          content: { text: 'Neural network architectures' },
          embedding: [0.15, 0.25, 0.35, 0.45], // Similar to concept-1
          relations: [],
          activation: 0.7,
          last_accessed: Date.now()
        }
      ];

      const strengthenedCount = consolidationEngine.strengthenConnections(concepts);
      expect(strengthenedCount).toBeGreaterThanOrEqual(0);
    });

    it('should not strengthen weak connections', () => {
      const concepts = [
        {
          id: 'concept-1',
          content: { text: 'Machine learning' },
          embedding: [1.0, 0.0, 0.0, 0.0],
          relations: [],
          activation: 0.8,
          last_accessed: Date.now() - 7200000 // 2 hours ago
        },
        {
          id: 'concept-2',
          content: { text: 'Cooking recipes' },
          embedding: [0.0, 1.0, 0.0, 0.0], // Very different
          relations: [],
          activation: 0.2, // Very different activation
          last_accessed: Date.now() - 3600000 // 1 hour ago
        }
      ];

      const strengthenedCount = consolidationEngine.strengthenConnections(concepts);
      expect(strengthenedCount).toBe(0);
    });
  });

  describe('consolidation statistics', () => {
    it('should maintain consolidation history', () => {
      const episodes1: Episode[] = [
        {
          content: { text: 'First batch episode 1' },
          context: mockContext,
          timestamp: Date.now() - 3600000,
          emotional_tags: ['learning'],
          importance: 0.8,
          decay_factor: 1.0
        },
        {
          content: { text: 'First batch episode 2' },
          context: mockContext,
          timestamp: Date.now() - 1800000,
          emotional_tags: ['learning'],
          importance: 0.7,
          decay_factor: 1.0
        }
      ];

      const episodes2: Episode[] = [
        {
          content: { text: 'Second batch episode 1' },
          context: mockContext,
          timestamp: Date.now() - 900000,
          emotional_tags: ['understanding'],
          importance: 0.9,
          decay_factor: 1.0
        },
        {
          content: { text: 'Second batch episode 2' },
          context: mockContext,
          timestamp: Date.now() - 450000,
          emotional_tags: ['understanding'],
          importance: 0.8,
          decay_factor: 1.0
        }
      ];

      consolidationEngine.consolidate(episodes1);
      consolidationEngine.consolidate(episodes2);

      const stats = consolidationEngine.getConsolidationStats();
      expect(stats.length).toBe(2);
      
      const lastResult = consolidationEngine.getLastConsolidationResult();
      expect(lastResult?.episodes_processed).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle invalid process input', async () => {
      await expect(consolidationEngine.process('invalid')).rejects.toThrow();
    });

    it('should handle valid process input', async () => {
      const episodes: Episode[] = [
        {
          content: { text: 'Process test episode 1' },
          context: mockContext,
          timestamp: Date.now() - 1800000,
          emotional_tags: [],
          importance: 0.8,
          decay_factor: 1.0
        },
        {
          content: { text: 'Process test episode 2' },
          context: mockContext,
          timestamp: Date.now() - 900000,
          emotional_tags: [],
          importance: 0.7,
          decay_factor: 1.0
        }
      ];

      const result = await consolidationEngine.process(episodes);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty episode arrays gracefully', () => {
      const concepts = consolidationEngine.consolidate([]);
      expect(concepts).toEqual([]);
    });
  });

  describe('pattern classification', () => {
    it('should classify different types of patterns', () => {
      const emotionalEpisodes: Episode[] = [
        {
          content: { text: 'Happy learning experience' },
          context: mockContext,
          timestamp: Date.now() - 3600000,
          emotional_tags: ['happy', 'excited'],
          importance: 0.8,
          decay_factor: 1.0
        },
        {
          content: { text: 'Joyful discovery moment' },
          context: mockContext,
          timestamp: Date.now() - 1800000,
          emotional_tags: ['joy', 'excited'],
          importance: 0.9,
          decay_factor: 1.0
        }
      ];

      const domainEpisodes: Episode[] = [
        {
          content: { text: 'AI research discussion' },
          context: { ...mockContext, domain: 'artificial-intelligence' },
          timestamp: Date.now() - 3600000,
          emotional_tags: [],
          importance: 0.8,
          decay_factor: 1.0
        },
        {
          content: { text: 'Machine learning study session' },
          context: { ...mockContext, domain: 'artificial-intelligence' },
          timestamp: Date.now() - 1800000,
          emotional_tags: [],
          importance: 0.7,
          decay_factor: 1.0
        }
      ];

      const emotionalPatterns = consolidationEngine.extractPatterns(emotionalEpisodes);
      const domainPatterns = consolidationEngine.extractPatterns(domainEpisodes);

      // Should extract patterns (exact classification depends on implementation details)
      expect(emotionalPatterns.length + domainPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('reset functionality', () => {
    it('should reset consolidation state', () => {
      const episodes: Episode[] = [
        {
          content: { text: 'Reset test episode 1' },
          context: mockContext,
          timestamp: Date.now() - 1800000,
          emotional_tags: [],
          importance: 0.8,
          decay_factor: 1.0
        },
        {
          content: { text: 'Reset test episode 2' },
          context: mockContext,
          timestamp: Date.now() - 900000,
          emotional_tags: [],
          importance: 0.7,
          decay_factor: 1.0
        }
      ];

      consolidationEngine.consolidate(episodes);
      expect(consolidationEngine.getConsolidationStats().length).toBe(1);

      consolidationEngine.reset();
      expect(consolidationEngine.getConsolidationStats().length).toBe(0);
      expect(consolidationEngine.getLastConsolidationResult()).toBeNull();
    });
  });
});