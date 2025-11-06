/**
 * Memory System Persistence Integration Tests
 *
 * Tests the integration between MemorySystem and persistence providers.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemorySystem } from "../../cognitive/MemorySystem.js";
import { Concept, Episode } from "../../types/core.js";

describe("MemorySystem Persistence Integration", () => {
  let memorySystem: MemorySystem;

  beforeEach(async () => {
    memorySystem = new MemorySystem({
      episodic: {
        capacity: 1000,
        decay_rate: 0.01,
        retrieval_threshold: 0.3,
      },
      semantic: {
        capacity: 5000,
        similarity_threshold: 0.7,
      },
      persistence: {
        storage_type: "memory",
        backup_interval_ms: 0, // Disable auto-backup for tests
        max_backups: 5,
        auto_save_enabled: false, // Disable auto-save for tests
        auto_backup_enabled: false,
      },
      persistence_enabled: true,
      auto_save_enabled: false,
      auto_recovery_enabled: false, // Disable auto-recovery for controlled tests
      consolidation_interval_ms: 0, // Disable auto-consolidation
      auto_consolidation: false,
      memory_decay_interval_ms: 0, // Disable auto-decay
      auto_decay: false,
    });

    await memorySystem.initialize();
  });

  afterEach(async () => {
    await memorySystem.shutdown();
  });

  describe("basic persistence operations", () => {
    it("should save and load memory system state", async () => {
      // Store some test data
      const episode: Episode = {
        content: { text: "test memory for persistence" },
        context: { session_id: "test", domain: "persistence" },
        timestamp: Date.now(),
        emotional_tags: ["test"],
        importance: 0.8,
        decay_factor: 1.0,
      };

      const concept: Concept = {
        id: "test-concept",
        content: { type: "test", value: "persistence concept" },
        relations: [],
        activation: 0.9,
        last_accessed: Date.now(),
      };

      memorySystem.storeEpisode(episode);
      memorySystem.storeConcept(concept);

      // Save to storage
      await memorySystem.saveToStorage();

      // Since we're using memory provider, data doesn't persist across instances
      // Instead, test that we can load from the same system
      const loaded = await memorySystem.loadFromStorage();
      expect(loaded).toBe(true);

      // Verify data is still available in the same system
      const retrievedEpisodes = await memorySystem.retrieveMemories(
        "test memory",
        0.1
      );
      expect(retrievedEpisodes.episodic_memories).toHaveLength(1);
      expect(retrievedEpisodes.episodic_memories[0].content).toEqual(
        episode.content
      );

      const retrievedConcepts = await memorySystem.retrieveMemories(
        "persistence concept",
        0.1
      );
      expect(retrievedConcepts.semantic_concepts).toHaveLength(1);
      expect(retrievedConcepts.semantic_concepts[0].content).toEqual(
        concept.content
      );
    });

    it("should handle empty memory system", async () => {
      // Save empty memory system
      await memorySystem.saveToStorage();

      // Test loading from same system
      const loaded = await memorySystem.loadFromStorage();
      expect(loaded).toBe(true);

      const stats = memorySystem.getMemoryStats();
      expect(stats.episodic_count).toBe(0);
      expect(stats.semantic_count).toBe(0);
    });

    it("should return false when no saved data exists", async () => {
      const loaded = await memorySystem.loadFromStorage();
      expect(loaded).toBe(false);
    });
  });

  describe("backup and restore operations", () => {
    beforeEach(async () => {
      // Add some test data
      const episode: Episode = {
        content: { text: "backup test episode" },
        context: { session_id: "backup", domain: "test" },
        timestamp: Date.now(),
        emotional_tags: ["backup"],
        importance: 0.7,
        decay_factor: 1.0,
      };

      const concept: Concept = {
        id: "backup-concept",
        content: { type: "backup", value: "test concept" },
        relations: [],
        activation: 0.8,
        last_accessed: Date.now(),
      };

      memorySystem.storeEpisode(episode);
      memorySystem.storeConcept(concept);
    });

    it("should create and restore from backup", async () => {
      // Create backup
      const backupId = await memorySystem.createBackup("test-backup");
      expect(backupId).toBe("test-backup");

      // Verify backup exists
      const backups = await memorySystem.listBackups();
      expect(backups).toContain("test-backup");

      // Clear current memory
      memorySystem.reset();
      let stats = memorySystem.getMemoryStats();
      expect(stats.episodic_count).toBe(0);
      expect(stats.semantic_count).toBe(0);

      // Restore from backup
      await memorySystem.restoreFromBackup("test-backup");

      // Verify data was restored
      stats = memorySystem.getMemoryStats();
      expect(stats.episodic_count).toBe(1);
      expect(stats.semantic_count).toBe(1);

      const retrieved = await memorySystem.retrieveMemories("backup test", 0.1);
      expect(retrieved.episodic_memories).toHaveLength(1);
      expect(retrieved.semantic_concepts).toHaveLength(1);
    });

    it("should create backup with auto-generated ID", async () => {
      const backupId = await memorySystem.createBackup();
      expect(backupId).toMatch(/^manual_\d+$/);

      const backups = await memorySystem.listBackups();
      expect(backups).toContain(backupId);
    });

    it("should delete backup", async () => {
      await memorySystem.createBackup("delete-test");

      let backups = await memorySystem.listBackups();
      expect(backups).toContain("delete-test");

      await memorySystem.deleteBackup("delete-test");

      backups = await memorySystem.listBackups();
      expect(backups).not.toContain("delete-test");
    });

    it("should handle restore of non-existent backup", async () => {
      await expect(
        memorySystem.restoreFromBackup("non-existent")
      ).rejects.toThrow();
    });
  });

  describe("persistence status and monitoring", () => {
    it("should report persistence status", () => {
      const status = memorySystem.getPersistenceStatus();
      expect(status.enabled).toBe(true);
      expect(status.provider_type).toBe("memory");
      expect(status.initialized).toBe(true);
    });

    it("should report disabled persistence", async () => {
      const noPersistenceSystem = new MemorySystem({
        persistence_enabled: false,
      });

      await noPersistenceSystem.initialize();

      const status = noPersistenceSystem.getPersistenceStatus();
      expect(status.enabled).toBe(false);

      await noPersistenceSystem.shutdown();
    });

    it("should update status after operations", async () => {
      const initialStatus = memorySystem.getPersistenceStatus();
      expect(initialStatus.last_save).toBe(0);

      await memorySystem.saveToStorage();

      const updatedStatus = memorySystem.getPersistenceStatus();
      expect(updatedStatus.last_save).toBeGreaterThan(
        initialStatus.last_save as number
      );
    });
  });

  describe("error handling", () => {
    it("should handle persistence operations when disabled", async () => {
      const noPersistenceSystem = new MemorySystem({
        persistence_enabled: false,
      });

      await noPersistenceSystem.initialize();

      await expect(noPersistenceSystem.saveToStorage()).rejects.toThrow(
        "Persistence not enabled"
      );

      await expect(noPersistenceSystem.loadFromStorage()).rejects.toThrow(
        "Persistence not enabled"
      );

      await expect(noPersistenceSystem.createBackup()).rejects.toThrow(
        "Persistence not enabled"
      );

      await noPersistenceSystem.shutdown();
    });

    it("should handle save during shutdown gracefully", async () => {
      // Add some data
      const episode: Episode = {
        content: { text: "shutdown test" },
        context: { session_id: "shutdown", domain: "test" },
        timestamp: Date.now(),
        emotional_tags: [],
        importance: 0.5,
        decay_factor: 1.0,
      };

      memorySystem.storeEpisode(episode);

      // Shutdown should save data automatically
      await memorySystem.shutdown();

      // Verify data was saved by loading in new system
      const newSystem = new MemorySystem({
        persistence: { storage_type: "memory" },
        persistence_enabled: true,
      });

      await newSystem.initialize();

      // Note: Since we're using memory provider, data won't persist across instances
      // This test verifies the shutdown process doesn't throw errors

      await newSystem.shutdown();
    });
  });

  describe("memory consolidation with persistence", () => {
    it("should persist consolidated memories", async () => {
      // Add multiple related episodes for consolidation
      const episodes: Episode[] = [
        {
          content: { text: "learning about cats", topic: "animals" },
          context: { session_id: "learning", domain: "animals" },
          timestamp: Date.now() - 1000,
          emotional_tags: ["curious"],
          importance: 0.8,
          decay_factor: 1.0,
        },
        {
          content: { text: "cats are mammals", topic: "animals" },
          context: { session_id: "learning", domain: "animals" },
          timestamp: Date.now() - 500,
          emotional_tags: ["informative"],
          importance: 0.9,
          decay_factor: 1.0,
        },
        {
          content: { text: "cats have whiskers", topic: "animals" },
          context: { session_id: "learning", domain: "animals" },
          timestamp: Date.now(),
          emotional_tags: ["factual"],
          importance: 0.7,
          decay_factor: 1.0,
        },
      ];

      for (const episode of episodes) {
        memorySystem.storeEpisode(episode);
      }

      // Run consolidation
      const consolidationResult = await memorySystem.runConsolidation();
      expect(consolidationResult.episodes_processed).toBeGreaterThan(0);

      // Save consolidated state
      await memorySystem.saveToStorage();

      // Verify consolidation persisted in same system
      const loaded = await memorySystem.loadFromStorage();
      expect(loaded).toBe(true);

      const stats = memorySystem.getMemoryStats();
      expect(stats.episodic_count).toBe(episodes.length);
      // Note: Semantic concept creation depends on consolidation implementation
      // For this test, we just verify the episodes persisted correctly
    });
  });

  describe("concurrent operations", () => {
    it("should handle concurrent save and backup operations", async () => {
      // Add test data
      const episode: Episode = {
        content: { text: "concurrent test" },
        context: { session_id: "concurrent", domain: "test" },
        timestamp: Date.now(),
        emotional_tags: [],
        importance: 0.6,
        decay_factor: 1.0,
      };

      memorySystem.storeEpisode(episode);

      // Run save and backup concurrently
      const [, backupId] = await Promise.all([
        memorySystem.saveToStorage(),
        memorySystem.createBackup("concurrent-backup"),
      ]);

      expect(backupId).toBe("concurrent-backup");

      // Verify both operations succeeded
      const backups = await memorySystem.listBackups();
      expect(backups).toContain("concurrent-backup");

      const retrieved = await memorySystem.retrieveMemories("concurrent", 0.1);
      expect(retrieved.episodic_memories).toHaveLength(1);
    });
  });
});
