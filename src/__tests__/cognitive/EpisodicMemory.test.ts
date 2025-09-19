/**
 * Unit tests for EpisodicMemory
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EpisodicMemory } from '../../cognitive/EpisodicMemory.js';
import { Episode, Context } from '../../types/core.js';

describe('EpisodicMemory', () => {
  let episodicMemory: EpisodicMemory;
  let mockContext: Context;

  beforeEach(async () => {
    episodicMemory = new EpisodicMemory({
      capacity: 100,
      decay_rate: 0.01,
      retrieval_threshold: 0.3,
      consolidation_threshold: 0.7,
      importance_boost: 0.2
    });

    mockContext = {
      session_id: 'test-session',
      domain: 'test-domain',
      urgency: 0.5,
      complexity: 0.6
    };

    await episodicMemory.initialize();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const status = episodicMemory.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.name).toBe('EpisodicMemory');
    });

    it('should start with empty memory', () => {
      expect(episodicMemory.getSize()).toBe(0);
    });
  });

  describe('storage', () => {
    it('should store an episode successfully', () => {
      const episode: Episode = {
        content: { text: 'Test memory content' },
        context: mockContext,
        timestamp: Date.now(),
        emotional_tags: ['positive'],
        importance: 0.8,
        decay_factor: 1.0
      };

      const episodeId = episodicMemory.store(episode);
      
      expect(episodeId).toBeDefined();
      expect(typeof episodeId).toBe('string');
      expect(episodicMemory.getSize()).toBe(1);
    });

    it('should handle multiple episodes', () => {
      const episodes: Episode[] = [
        {
          content: { text: 'First memory' },
          context: mockContext,
          timestamp: Date.now(),
          emotional_tags: ['neutral'],
          importance: 0.5,
          decay_factor: 1.0
        },
        {
          content: { text: 'Second memory' },
          context: mockContext,
          timestamp: Date.now() + 1000,
          emotional_tags: ['positive'],
          importance: 0.7,
          decay_factor: 1.0
        }
      ];

      episodes.forEach(episode => episodicMemory.store(episode));
      expect(episodicMemory.getSize()).toBe(2);
    });

    it('should enforce capacity limits', async () => {
      const smallMemory = new EpisodicMemory({ capacity: 2 });
      await smallMemory.initialize();
      
      // Store 3 episodes (exceeds capacity)
      for (let i = 0; i < 3; i++) {
        const episode: Episode = {
          content: { text: `Memory ${i}` },
          context: mockContext,
          timestamp: Date.now() + i * 1000,
          emotional_tags: [],
          importance: 0.5,
          decay_factor: 1.0
        };
        smallMemory.store(episode);
      }

      // Should have pruned to stay within capacity
      expect(smallMemory.getSize()).toBeLessThanOrEqual(2);
    });
  });

  describe('retrieval', () => {
    beforeEach(() => {
      // Store test episodes
      const episodes: Episode[] = [
        {
          content: { text: 'Learning about machine learning algorithms' },
          context: { ...mockContext, domain: 'ai' },
          timestamp: Date.now() - 3600000, // 1 hour ago
          emotional_tags: ['curious'],
          importance: 0.8,
          decay_factor: 1.0
        },
        {
          content: { text: 'Cooking pasta for dinner' },
          context: { ...mockContext, domain: 'cooking' },
          timestamp: Date.now() - 1800000, // 30 minutes ago
          emotional_tags: ['satisfied'],
          importance: 0.6,
          decay_factor: 1.0
        },
        {
          content: { text: 'Reading about neural networks' },
          context: { ...mockContext, domain: 'ai' },
          timestamp: Date.now() - 900000, // 15 minutes ago
          emotional_tags: ['focused'],
          importance: 0.9,
          decay_factor: 1.0
        }
      ];

      episodes.forEach(episode => episodicMemory.store(episode));
    });

    it('should retrieve relevant episodes based on content cue', () => {
      const results = episodicMemory.retrieve('machine learning', 0.2);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content.text).toContain('machine learning');
    });

    it('should retrieve episodes based on neural networks cue', () => {
      const results = episodicMemory.retrieve('neural networks', 0.2);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content.text).toContain('neural networks');
    });

    it('should return empty array for irrelevant cues', () => {
      const results = episodicMemory.retrieve('quantum physics', 0.8);
      expect(results.length).toBe(0);
    });

    it('should respect retrieval threshold', () => {
      const highThreshold = episodicMemory.retrieve('learning', 0.9);
      const lowThreshold = episodicMemory.retrieve('learning', 0.1);
      
      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    });

    it('should boost importance of retrieved episodes', () => {
      const initialResults = episodicMemory.retrieve('machine learning', 0.2);
      const initialImportance = initialResults[0]?.importance || 0;
      
      // Retrieve again to trigger boost
      episodicMemory.retrieve('machine learning', 0.2);
      
      const boostedResults = episodicMemory.retrieve('machine learning', 0.2);
      const boostedImportance = boostedResults[0]?.importance || 0;
      
      expect(boostedImportance).toBeGreaterThanOrEqual(initialImportance);
    });
  });

  describe('context-based retrieval', () => {
    beforeEach(() => {
      const episodes: Episode[] = [
        {
          content: { text: 'AI research discussion' },
          context: { ...mockContext, domain: 'ai', session_id: 'session1' },
          timestamp: Date.now(),
          emotional_tags: ['excited'],
          importance: 0.8,
          decay_factor: 1.0
        },
        {
          content: { text: 'Cooking recipe sharing' },
          context: { ...mockContext, domain: 'cooking', session_id: 'session2' },
          timestamp: Date.now(),
          emotional_tags: ['happy'],
          importance: 0.6,
          decay_factor: 1.0
        }
      ];

      episodes.forEach(episode => episodicMemory.store(episode));
    });

    it('should retrieve episodes by context domain', () => {
      const aiEpisodes = episodicMemory.getEpisodesByContext('domain', 'ai');
      const cookingEpisodes = episodicMemory.getEpisodesByContext('domain', 'cooking');
      
      expect(aiEpisodes.length).toBe(1);
      expect(cookingEpisodes.length).toBe(1);
      expect(aiEpisodes[0].content.text).toContain('AI research');
      expect(cookingEpisodes[0].content.text).toContain('Cooking recipe');
    });

    it('should retrieve episodes by session ID', () => {
      const session1Episodes = episodicMemory.getEpisodesByContext('session_id', 'session1');
      const session2Episodes = episodicMemory.getEpisodesByContext('session_id', 'session2');
      
      expect(session1Episodes.length).toBe(1);
      expect(session2Episodes.length).toBe(1);
    });
  });

  describe('temporal operations', () => {
    it('should retrieve episodes by time range', () => {
      const now = Date.now();
      const episodes: Episode[] = [
        {
          content: { text: 'Old memory' },
          context: mockContext,
          timestamp: now - 7200000, // 2 hours ago
          emotional_tags: [],
          importance: 0.5,
          decay_factor: 1.0
        },
        {
          content: { text: 'Recent memory' },
          context: mockContext,
          timestamp: now - 1800000, // 30 minutes ago
          emotional_tags: [],
          importance: 0.7,
          decay_factor: 1.0
        }
      ];

      episodes.forEach(episode => episodicMemory.store(episode));

      const recentEpisodes = episodicMemory.getEpisodesByTimeRange(
        now - 3600000, // 1 hour ago
        now
      );

      expect(recentEpisodes.length).toBe(1);
      expect(recentEpisodes[0].content.text).toBe('Recent memory');
    });
  });

  describe('decay mechanism', () => {
    it('should apply decay to episodes', () => {
      // Mock Date.now to control time
      const originalNow = Date.now;
      const baseTime = 1000000000000;
      Date.now = vi.fn(() => baseTime);

      const episode: Episode = {
        content: { text: 'Test decay' },
        context: mockContext,
        timestamp: baseTime,
        emotional_tags: [],
        importance: 0.8,
        decay_factor: 1.0
      };

      const episodeId = episodicMemory.store(episode);

      // Advance time by 24 hours
      Date.now = vi.fn(() => baseTime + 24 * 60 * 60 * 1000);

      episodicMemory.decay();

      // Episode should still exist but with reduced decay factor
      const results = episodicMemory.retrieve('Test decay', 0.1);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].decay_factor).toBeLessThan(1.0);

      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('consolidation', () => {
    it('should identify episodes ready for consolidation', () => {
      const episodes: Episode[] = [
        {
          content: { text: 'High importance memory' },
          context: mockContext,
          timestamp: Date.now(),
          emotional_tags: ['important'],
          importance: 0.9, // Above consolidation threshold
          decay_factor: 0.8
        },
        {
          content: { text: 'Low importance memory' },
          context: mockContext,
          timestamp: Date.now(),
          emotional_tags: [],
          importance: 0.3, // Below consolidation threshold
          decay_factor: 0.9
        }
      ];

      episodes.forEach(episode => episodicMemory.store(episode));

      const consolidationCandidates = episodicMemory.consolidate();
      
      expect(consolidationCandidates.length).toBe(1);
      expect(consolidationCandidates[0].content.text).toBe('High importance memory');
    });
  });

  describe('error handling', () => {
    it('should handle invalid process input', async () => {
      await expect(episodicMemory.process('invalid')).rejects.toThrow();
    });

    it('should handle valid process input', async () => {
      const episode: Episode = {
        content: { text: 'Process test' },
        context: mockContext,
        timestamp: Date.now(),
        emotional_tags: [],
        importance: 0.5,
        decay_factor: 1.0
      };

      const result = await episodicMemory.process({ episode });
      expect(typeof result).toBe('string');
    });
  });

  describe('reset functionality', () => {
    it('should reset memory state', () => {
      // Store some episodes
      const episode: Episode = {
        content: { text: 'Test reset' },
        context: mockContext,
        timestamp: Date.now(),
        emotional_tags: [],
        importance: 0.5,
        decay_factor: 1.0
      };

      episodicMemory.store(episode);
      expect(episodicMemory.getSize()).toBe(1);

      episodicMemory.reset();
      expect(episodicMemory.getSize()).toBe(0);
    });
  });
});