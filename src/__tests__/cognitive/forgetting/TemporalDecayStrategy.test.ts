/**
 * Tests for TemporalDecayStrategy
 */

import { beforeEach, describe, expect, it } from "vitest";
import { TemporalDecayStrategyImpl } from "../../../cognitive/forgetting/TemporalDecayStrategy.js";
import { ForgettingContext } from "../../../interfaces/forgetting.js";
import { Concept, Episode } from "../../../types/core.js";

describe("TemporalDecayStrategy", () => {
  let strategy: TemporalDecayStrategyImpl;
  let mockContext: ForgettingContext;

  beforeEach(() => {
    strategy = new TemporalDecayStrategyImpl({
      decay_rate: 0.1,
      recency_weight: 0.4,
      access_frequency_weight: 0.3,
    });

    mockContext = {
      current_time: Date.now(),
      memory_pressure: 0.5,
      recent_access_patterns: [],
      system_goals: ["learning", "productivity"],
      user_preferences: {
        consent_required: false,
        protected_categories: [],
        max_auto_forget_importance: 0.3,
        retention_period_days: 30,
      },
    };
  });

  describe("evaluateForForgetting", () => {
    it("should return higher forgetting score for old memories", async () => {
      const oldEpisode: Episode = {
        content: "Old memory content",
        context: { domain: "test" },
        timestamp: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
        emotional_tags: [],
        importance: 0.5,
        decay_factor: 1.0,
      };

      const newEpisode: Episode = {
        content: "New memory content",
        context: { domain: "test" },
        timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
        emotional_tags: [],
        importance: 0.5,
        decay_factor: 1.0,
      };

      const oldScore = await strategy.evaluateForForgetting(
        oldEpisode,
        mockContext
      );
      const newScore = await strategy.evaluateForForgetting(
        newEpisode,
        mockContext
      );

      expect(oldScore.score).toBeGreaterThan(newScore.score);
      expect(oldScore.strategy_name).toBe("temporal_decay");
      expect(oldScore.confidence).toBeGreaterThan(0);
    });

    it("should return lower forgetting score for recently accessed memories", async () => {
      const memoryId = "test_memory_123";

      // Add recent access patterns for this memory
      mockContext.recent_access_patterns = [
        {
          memory_id: memoryId,
          access_time: Date.now() - 60 * 60 * 1000, // 1 hour ago
          access_type: "retrieval",
          context_similarity: 0.8,
        },
        {
          memory_id: memoryId,
          access_time: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
          access_type: "retrieval",
          context_similarity: 0.7,
        },
      ];

      const frequentlyAccessedConcept: Concept = {
        id: memoryId,
        content: "Frequently accessed concept",
        relations: [],
        activation: 0.8,
        last_accessed: Date.now() - 60 * 60 * 1000, // 1 hour ago
      };

      const rarelyAccessedConcept: Concept = {
        id: "rarely_accessed_memory",
        content: "Rarely accessed concept",
        relations: [],
        activation: 0.3,
        last_accessed: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      };

      const frequentScore = await strategy.evaluateForForgetting(
        frequentlyAccessedConcept,
        mockContext
      );
      const rareScore = await strategy.evaluateForForgetting(
        rarelyAccessedConcept,
        mockContext
      );

      expect(frequentScore.score).toBeLessThan(rareScore.score);
    });

    it("should apply exponential decay correctly", async () => {
      const veryOldEpisode: Episode = {
        content: "Very old memory",
        context: { domain: "test" },
        timestamp: Date.now() - 2 * 365 * 24 * 60 * 60 * 1000, // 2 years ago
        emotional_tags: [],
        importance: 0.5,
        decay_factor: 1.0,
      };

      const score = await strategy.evaluateForForgetting(
        veryOldEpisode,
        mockContext
      );

      // Should have high forgetting score due to age and decay
      expect(score.score).toBeGreaterThan(0.5);

      // Should have decay factor in the factors
      const decayFactor = score.factors.find(
        (f) => f.name === "temporal_decay"
      );
      expect(decayFactor).toBeDefined();
      expect(decayFactor!.value).toBeGreaterThan(0);
    });

    it("should include all expected factors in evaluation", async () => {
      const episode: Episode = {
        content: "Test memory",
        context: { domain: "test" },
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
        emotional_tags: [],
        importance: 0.5,
        decay_factor: 1.0,
      };

      const score = await strategy.evaluateForForgetting(episode, mockContext);

      const factorNames = score.factors.map((f) => f.name);
      expect(factorNames).toContain("age");
      expect(factorNames).toContain("recency");
      expect(factorNames).toContain("access_frequency");
      expect(factorNames).toContain("temporal_decay");
    });

    it("should provide meaningful reasoning", async () => {
      const episode: Episode = {
        content: "Test memory",
        context: { domain: "test" },
        timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        emotional_tags: [],
        importance: 0.5,
        decay_factor: 1.0,
      };

      const score = await strategy.evaluateForForgetting(episode, mockContext);

      expect(score.reasoning.length).toBeGreaterThan(0);
      expect(score.reasoning[0]).toContain("Temporal decay analysis");
      expect(score.reasoning.some((r) => r.includes("Primary factor"))).toBe(
        true
      );
    });

    it("should handle concepts without timestamps", async () => {
      const concept: Concept = {
        id: "test_concept",
        content: "Test concept content",
        relations: [],
        activation: 0.6,
        last_accessed: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
      };

      const score = await strategy.evaluateForForgetting(concept, mockContext);

      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1);
      expect(score.confidence).toBeGreaterThan(0);
    });

    it("should respect strategy configuration", async () => {
      const customStrategy = new TemporalDecayStrategyImpl({
        decay_rate: 0.5, // Higher decay rate
        recency_weight: 0.8, // Higher recency weight
        access_frequency_weight: 0.1, // Lower frequency weight
      });

      const episode: Episode = {
        content: "Test memory",
        context: { domain: "test" },
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
        emotional_tags: [],
        importance: 0.5,
        decay_factor: 1.0,
      };

      const defaultScore = await strategy.evaluateForForgetting(
        episode,
        mockContext
      );
      const customScore = await customStrategy.evaluateForForgetting(
        episode,
        mockContext
      );

      // Custom strategy should produce different results due to different weights
      expect(customScore.score).not.toBe(defaultScore.score);
    });
  });

  describe("configuration", () => {
    it("should use default configuration when none provided", () => {
      const defaultStrategy = new TemporalDecayStrategyImpl();

      expect(defaultStrategy.name).toBe("temporal_decay");
      expect(defaultStrategy.decay_rate).toBe(0.1);
      expect(defaultStrategy.recency_weight).toBe(0.4);
      expect(defaultStrategy.access_frequency_weight).toBe(0.3);
    });

    it("should accept custom configuration", () => {
      const customConfig = {
        decay_rate: 0.2,
        recency_weight: 0.5,
        access_frequency_weight: 0.4,
      };

      const customStrategy = new TemporalDecayStrategyImpl(customConfig);

      expect(customStrategy.decay_rate).toBe(0.2);
      expect(customStrategy.recency_weight).toBe(0.5);
      expect(customStrategy.access_frequency_weight).toBe(0.4);
    });
  });
});
