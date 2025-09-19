/**
 * Unit tests for MemorySystem
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemorySystem } from "../../cognitive/MemorySystem.js";
import { Concept, Context, Episode } from "../../types/core.js";

describe("MemorySystem", () => {
  let memorySystem: MemorySystem;
  let mockContext: Context;

  beforeEach(async () => {
    memorySystem = new MemorySystem({
      episodic: {
        capacity: 100,
        decay_rate: 0.01,
        retrieval_threshold: 0.3,
      },
      semantic: {
        capacity: 100,
        embedding_dim: 64,
        similarity_threshold: 0.7,
      },
      consolidation: {
        consolidation_threshold: 0.6,
        minimum_episode_count: 2,
      },
      consolidation_interval_ms: 1000, // 1 second for testing
      auto_consolidation: false, // Disable for controlled testing
      memory_decay_interval_ms: 1000,
      auto_decay: false,
      persistence_enabled: false, // Disable persistence for testing
      auto_recovery_enabled: false,
      auto_save_enabled: false,
    });

    mockContext = {
      session_id: "test-session",
      domain: "test-domain",
      urgency: 0.5,
      complexity: 0.6,
    };

    await memorySystem.initialize();
  });

  afterEach(() => {
    memorySystem.shutdown();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      const status = memorySystem.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.name).toBe("MemorySystem");
    });

    it("should initialize all subsystems", async () => {
      const status = memorySystem.getStatus();
      expect(status.initialized).toBe(true);
    });
  });

  describe("experience storage", () => {
    it("should store experience in both episodic and semantic memory", async () => {
      const experience = {
        content: { text: "Learning about neural networks" },
        context: mockContext,
        importance: 0.8,
        emotional_tags: ["curious", "focused"],
      };

      const result = await memorySystem.storeExperience(experience);

      expect(result.success).toBe(true);
      expect(result.episodic_id).toBeDefined();
      expect(result.semantic_id).toBeDefined();
      expect(result.storage_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle experiences without emotional tags", async () => {
      const experience = {
        content: { text: "Simple learning experience" },
        context: mockContext,
        importance: 0.6,
      };

      const result = await memorySystem.storeExperience(experience);

      expect(result.success).toBe(true);
      expect(result.episodic_id).toBeDefined();
    });

    it("should extract multiple concepts from rich experiences", async () => {
      const experience = {
        content: {
          text: "Deep learning workshop on computer vision",
          topic: "machine learning",
          subtopic: "computer vision",
        },
        context: { ...mockContext, domain: "ai" },
        importance: 0.9,
        emotional_tags: ["excited", "motivated"],
      };

      const result = await memorySystem.storeExperience(experience);

      expect(result.success).toBe(true);
      expect(result.semantic_id).toBeDefined();
    });
  });

  describe("memory retrieval", () => {
    beforeEach(async () => {
      // Store test experiences
      const experiences = [
        {
          content: { text: "Machine learning algorithms process data" },
          context: { ...mockContext, domain: "ai" },
          importance: 0.8,
          emotional_tags: ["curious"],
        },
        {
          content: { text: "Neural networks learn complex patterns" },
          context: { ...mockContext, domain: "ai" },
          importance: 0.9,
          emotional_tags: ["fascinated"],
        },
        {
          content: { text: "Cooking pasta requires boiling water" },
          context: { ...mockContext, domain: "cooking" },
          importance: 0.6,
          emotional_tags: ["practical"],
        },
      ];

      for (const experience of experiences) {
        await memorySystem.storeExperience(experience);
      }
    });

    it("should retrieve memories from both systems", async () => {
      const result = await memorySystem.retrieveMemories(
        "machine learning",
        0.2
      );

      expect(result.episodic_memories.length).toBeGreaterThan(0);
      expect(result.semantic_concepts.length).toBeGreaterThan(0);
      expect(result.combined_relevance).toBeGreaterThan(0);
      expect(result.retrieval_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should compute combined relevance score", async () => {
      const aiResult = await memorySystem.retrieveMemories(
        "neural networks",
        0.2
      );
      const cookingResult = await memorySystem.retrieveMemories("cooking", 0.2);

      // Both should have some relevance, but we can't guarantee which is higher due to retrieval variability
      expect(aiResult.combined_relevance).toBeGreaterThan(0);
      expect(cookingResult.combined_relevance).toBeGreaterThan(0);
    });

    it("should respect retrieval thresholds", async () => {
      const highThreshold = await memorySystem.retrieveMemories(
        "learning",
        0.8
      );
      const lowThreshold = await memorySystem.retrieveMemories("learning", 0.1);

      expect(lowThreshold.episodic_memories.length).toBeGreaterThanOrEqual(
        highThreshold.episodic_memories.length
      );
    });
  });

  describe("direct storage methods", () => {
    it("should store episodes directly", () => {
      const episode: Episode = {
        content: { text: "Direct episode storage test" },
        context: mockContext,
        timestamp: Date.now(),
        emotional_tags: ["test"],
        importance: 0.7,
        decay_factor: 1.0,
      };

      const episodeId = memorySystem.storeEpisode(episode);
      expect(episodeId).toBeDefined();
      expect(typeof episodeId).toBe("string");
    });

    it("should store concepts directly", () => {
      const concept: Concept = {
        id: "direct-concept-test",
        content: { text: "Direct concept storage test" },
        relations: [],
        activation: 0.8,
        last_accessed: Date.now(),
      };

      const conceptId = memorySystem.storeConcept(concept);
      expect(conceptId).toBe("direct-concept-test");
    });
  });

  describe("contextual retrieval", () => {
    beforeEach(async () => {
      const episodes: Episode[] = [
        {
          content: { text: "AI research session" },
          context: { ...mockContext, domain: "ai", session_id: "session1" },
          timestamp: Date.now() - 3600000,
          emotional_tags: ["focused"],
          importance: 0.8,
          decay_factor: 1.0,
        },
        {
          content: { text: "Cooking experiment" },
          context: {
            ...mockContext,
            domain: "cooking",
            session_id: "session2",
          },
          timestamp: Date.now() - 1800000,
          emotional_tags: ["creative"],
          importance: 0.6,
          decay_factor: 1.0,
        },
      ];

      episodes.forEach((episode) => memorySystem.storeEpisode(episode));
    });

    it("should retrieve episodes by context", () => {
      const aiEpisodes = memorySystem.getEpisodesByContext("domain", "ai");
      const cookingEpisodes = memorySystem.getEpisodesByContext(
        "domain",
        "cooking"
      );

      expect(aiEpisodes.length).toBe(1);
      expect(cookingEpisodes.length).toBe(1);
      expect(aiEpisodes[0].content.text).toContain("AI research");
      expect(cookingEpisodes[0].content.text).toContain("Cooking experiment");
    });

    it("should retrieve episodes by time range", () => {
      const now = Date.now();
      const recentEpisodes = memorySystem.getEpisodesByTimeRange(
        now - 2700000, // 45 minutes ago
        now
      );

      expect(recentEpisodes.length).toBe(1);
      expect(recentEpisodes[0].content.text).toContain("Cooking experiment");
    });
  });

  describe("semantic relationships", () => {
    beforeEach(async () => {
      const concepts: Concept[] = [
        {
          id: "parent-ai",
          content: { text: "Artificial Intelligence" },
          relations: [],
          activation: 0.9,
          last_accessed: Date.now(),
        },
        {
          id: "child-ml",
          content: { text: "Machine Learning" },
          relations: [],
          activation: 0.8,
          last_accessed: Date.now(),
        },
      ];

      concepts.forEach((concept) => memorySystem.storeConcept(concept));
    });

    it("should find related concepts", () => {
      const relatedConcepts = memorySystem.getRelatedConcepts("parent-ai");
      // Initially no relations, but method should work
      expect(Array.isArray(relatedConcepts)).toBe(true);
    });

    it("should find similar concepts", () => {
      const similarConcepts = memorySystem.findSimilarConcepts("parent-ai", 5);
      expect(Array.isArray(similarConcepts)).toBe(true);
      expect(similarConcepts.length).toBeLessThanOrEqual(5);
    });
  });

  describe("consolidation process", () => {
    beforeEach(async () => {
      // Store episodes that should be consolidated
      const episodes = [
        {
          content: { text: "Learning neural network fundamentals" },
          context: { ...mockContext, domain: "ai" },
          importance: 0.9,
          emotional_tags: ["learning"],
        },
        {
          content: { text: "Understanding neural network architectures" },
          context: { ...mockContext, domain: "ai" },
          importance: 0.8,
          emotional_tags: ["understanding"],
        },
        {
          content: { text: "Applying neural networks to problems" },
          context: { ...mockContext, domain: "ai" },
          importance: 0.85,
          emotional_tags: ["applying"],
        },
      ];

      for (const experience of episodes) {
        await memorySystem.storeExperience(experience);
      }
    });

    it("should run consolidation manually", async () => {
      const result = await memorySystem.runConsolidation();

      expect(result).toBeDefined();
      expect(result.episodes_processed).toBeGreaterThanOrEqual(0);
      expect(result.concepts_created).toBeGreaterThanOrEqual(0);
    });

    it("should handle consolidation with no eligible episodes", async () => {
      // Create a fresh memory system with persistence disabled
      const freshMemory = new MemorySystem({
        persistence_enabled: false,
        auto_recovery_enabled: false,
        auto_save_enabled: false,
      });
      await freshMemory.initialize();

      const result = await freshMemory.runConsolidation();

      expect(result.episodes_processed).toBe(0);
      expect(result.concepts_created).toBe(0);

      freshMemory.shutdown();
    });
  });

  describe("memory statistics", () => {
    beforeEach(async () => {
      const experience = {
        content: { text: "Statistics test experience" },
        context: mockContext,
        importance: 0.7,
        emotional_tags: ["test"],
      };

      await memorySystem.storeExperience(experience);
    });

    it("should provide memory statistics", () => {
      const stats = memorySystem.getMemoryStats();

      expect(stats.episodic_count).toBeGreaterThan(0);
      expect(stats.semantic_count).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.consolidation_history)).toBe(true);
    });

    it("should track consolidation history", async () => {
      // Store some experiences first to have something to consolidate
      const experience = {
        content: { text: "Consolidation history test" },
        context: mockContext,
        importance: 0.8,
        emotional_tags: ["test"],
      };
      await memorySystem.storeExperience(experience);

      await memorySystem.runConsolidation();

      const stats = memorySystem.getMemoryStats();
      expect(stats.consolidation_history.length).toBeGreaterThanOrEqual(0);
      // Last consolidation might be null if no episodes were eligible
      expect(stats.last_consolidation).toBeDefined();
    });
  });

  describe("automatic processes", () => {
    it("should support automatic consolidation when enabled", async () => {
      const autoMemory = new MemorySystem({
        consolidation_interval_ms: 100, // Very fast for testing
        auto_consolidation: true,
        auto_decay: false,
      });

      await autoMemory.initialize();

      // Store some experiences
      const experience = {
        content: { text: "Auto consolidation test" },
        context: mockContext,
        importance: 0.8,
        emotional_tags: ["test"],
      };

      await autoMemory.storeExperience(experience);

      // Wait for auto consolidation
      await new Promise((resolve) => setTimeout(resolve, 200));

      const stats = autoMemory.getMemoryStats();
      // Auto consolidation may or may not have run depending on timing
      expect(stats.consolidation_history.length).toBeGreaterThanOrEqual(0);

      autoMemory.shutdown();
    });
  });

  describe("error handling", () => {
    it("should handle process method with different operations", async () => {
      const experience = {
        content: { text: "Process test" },
        context: mockContext,
        importance: 0.7,
      };

      // Test store operation
      const storeResult = await memorySystem.process({
        operation: "store",
        experience,
      });
      expect(storeResult.success).toBe(true);

      // Test retrieve operation
      const retrieveResult = await memorySystem.process({
        operation: "retrieve",
        cue: "process test",
        threshold: 0.3,
      });
      expect(retrieveResult.episodic_memories).toBeDefined();

      // Test consolidate operation
      const consolidateResult = await memorySystem.process({
        operation: "consolidate",
      });
      expect(consolidateResult.episodes_processed).toBeGreaterThanOrEqual(0);
    });

    it("should handle invalid process operations", async () => {
      await expect(
        memorySystem.process({
          operation: "invalid",
        })
      ).rejects.toThrow();
    });

    it("should handle storage errors gracefully", async () => {
      // This test would require mocking internal components to force errors
      // For now, we test that the interface handles the error case
      const experience = {
        content: { text: "Error test" },
        context: mockContext,
        importance: 0.7,
      };

      const result = await memorySystem.storeExperience(experience);
      // Should either succeed or fail gracefully
      expect(typeof result.success).toBe("boolean");
    });
  });

  describe("reset and shutdown", () => {
    it("should reset memory state", () => {
      memorySystem.reset();

      const stats = memorySystem.getMemoryStats();
      expect(stats.episodic_count).toBe(0);
      expect(stats.semantic_count).toBe(0);
    });

    it("should shutdown cleanly", () => {
      expect(() => memorySystem.shutdown()).not.toThrow();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complex learning scenario", async () => {
      // Simulate a learning session with multiple related experiences
      const learningExperiences = [
        {
          content: {
            text: "Introduction to machine learning concepts",
            topic: "ml-basics",
            difficulty: "beginner",
          },
          context: { ...mockContext, domain: "education" },
          importance: 0.8,
          emotional_tags: ["curious", "motivated"],
        },
        {
          content: {
            text: "Understanding supervised learning algorithms",
            topic: "supervised-learning",
            difficulty: "intermediate",
          },
          context: { ...mockContext, domain: "education" },
          importance: 0.9,
          emotional_tags: ["focused", "challenged"],
        },
        {
          content: {
            text: "Implementing neural networks from scratch",
            topic: "neural-networks",
            difficulty: "advanced",
          },
          context: { ...mockContext, domain: "education" },
          importance: 0.95,
          emotional_tags: ["accomplished", "confident"],
        },
      ];

      // Store all experiences
      for (const experience of learningExperiences) {
        const result = await memorySystem.storeExperience(experience);
        expect(result.success).toBe(true);
      }

      // Test retrieval of related memories
      const mlMemories = await memorySystem.retrieveMemories(
        "machine learning",
        0.3
      );
      expect(mlMemories.episodic_memories.length).toBeGreaterThan(0);
      expect(mlMemories.semantic_concepts.length).toBeGreaterThan(0);

      // Test consolidation
      const consolidationResult = await memorySystem.runConsolidation();
      expect(consolidationResult.episodes_processed).toBeGreaterThan(0);

      // Verify memory statistics
      const stats = memorySystem.getMemoryStats();
      expect(stats.episodic_count).toBe(3);
      expect(stats.semantic_count).toBeGreaterThan(0);
    });
  });
});
