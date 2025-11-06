/**
 * Persistence Manager Tests
 *
 * Tests for the unified persistence management system.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Concept, Episode, Relation } from "../../../types/core.js";
import { PersistenceManager } from "../../../utils/persistence/PersistenceManager.js";
import { getVersion } from "../../../utils/version.js";
import { TestCleanup } from "../testCleanup.js";
import { createTestDataDir } from "../testHelpers.js";

describe("PersistenceManager", () => {
  let manager: PersistenceManager;

  beforeEach(async () => {
    TestCleanup.initialize();
    manager = new PersistenceManager({
      storage_type: "memory",
      backup_interval_ms: 0, // Disable auto-backup for tests
      max_backups: 3,
      compression_enabled: false,
      encryption_enabled: false,
      auto_save_enabled: false, // Disable auto-save for tests
      auto_backup_enabled: false,
      recovery_enabled: true,
      version: getVersion(),
    });

    await manager.initialize();
  });

  afterEach(async () => {
    await manager.shutdown();
    await TestCleanup.cleanup();
  });

  describe("initialization", () => {
    it("should initialize successfully", () => {
      const status = manager.getStatus();
      expect(status.manager_initialized).toBe(true);
      expect(status.initialized).toBe(true);
    });

    it("should initialize with different storage types", async () => {
      // Create test directory using helper
      const testDir = await createTestDataDir();

      const fileManager = new PersistenceManager({
        storage_type: "file",
        file_path: `${testDir}/test-memory.json`,
        backup_interval_ms: 0,
        auto_save_enabled: false,
        auto_backup_enabled: false,
      });

      await fileManager.initialize();
      const status = fileManager.getStatus();
      expect(status.provider_type).toBe("file");

      await fileManager.shutdown();
      // Cleanup handled automatically by TestCleanup
    });
  });

  describe("memory system persistence", () => {
    it("should save and load memory system components", async () => {
      const episodes: Episode[] = [
        {
          content: { text: "test episode" },
          context: { session_id: "test", domain: "test" },
          timestamp: Date.now(),
          emotional_tags: ["positive"],
          importance: 0.8,
          decay_factor: 1.0,
        },
      ];

      const concepts: Concept[] = [
        {
          id: "concept1",
          content: { type: "test", value: "concept" },
          relations: [],
          activation: 0.9,
          last_accessed: Date.now(),
        },
      ];

      const relations: Relation[] = [
        {
          from: "concept1",
          to: "concept2",
          type: "related_to",
          strength: 0.7,
        },
      ];

      const lastConsolidation = Date.now();

      await manager.saveMemorySystem(
        episodes,
        concepts,
        relations,
        lastConsolidation
      );

      const loaded = await manager.loadMemorySystem();
      expect(loaded).not.toBeNull();
      expect(loaded!.episodicMemories).toHaveLength(1);
      expect(loaded!.semanticConcepts).toHaveLength(1);
      expect(loaded!.semanticRelations).toHaveLength(1);
      expect(loaded!.lastConsolidation).toBe(lastConsolidation);
    });

    it("should return null when no memory system exists", async () => {
      const loaded = await manager.loadMemorySystem();
      expect(loaded).toBeNull();
    });

    it("should handle empty memory system", async () => {
      await manager.saveMemorySystem([], [], [], Date.now());

      const loaded = await manager.loadMemorySystem();
      expect(loaded).not.toBeNull();
      expect(loaded!.episodicMemories).toHaveLength(0);
      expect(loaded!.semanticConcepts).toHaveLength(0);
      expect(loaded!.semanticRelations).toHaveLength(0);
    });
  });

  describe("backup and restore", () => {
    beforeEach(async () => {
      // Save some test data
      const episodes: Episode[] = [
        {
          content: { text: "test episode" },
          context: { session_id: "test", domain: "test" },
          timestamp: Date.now(),
          emotional_tags: ["positive"],
          importance: 0.8,
          decay_factor: 1.0,
        },
      ];

      await manager.saveMemorySystem(episodes, [], [], Date.now());
    });

    it("should create and restore backup", async () => {
      const backupId = await manager.createBackup("test-backup");
      expect(backupId).toBe("test-backup");

      const backups = await manager.listBackups();
      expect(backups).toContain("test-backup");

      const restored = await manager.restoreFromBackup("test-backup");
      expect(restored.episodicMemories).toHaveLength(1);
    });

    it("should create backup with auto-generated ID", async () => {
      const backupId = await manager.createBackup();
      expect(backupId).toMatch(/^manual_\d+$/);

      const backups = await manager.listBackups();
      expect(backups).toContain(backupId);
    });

    it("should delete backup", async () => {
      await manager.createBackup("test-backup");

      let backups = await manager.listBackups();
      expect(backups).toContain("test-backup");

      await manager.deleteBackup("test-backup");

      backups = await manager.listBackups();
      expect(backups).not.toContain("test-backup");
    });

    it("should handle restore of non-existent backup", async () => {
      await expect(manager.restoreFromBackup("non-existent")).rejects.toThrow();
    });
  });

  describe("recovery", () => {
    it("should attempt recovery from backup", async () => {
      // Create some data and backup
      const episodes: Episode[] = [
        {
          content: { text: "recovery test" },
          context: { session_id: "test", domain: "test" },
          timestamp: Date.now(),
          emotional_tags: [],
          importance: 0.5,
          decay_factor: 1.0,
        },
      ];

      await manager.saveMemorySystem(episodes, [], [], Date.now());
      await manager.createBackup("recovery-backup");

      // Test recovery
      const recovered = await manager.attemptRecovery();
      expect(recovered).not.toBeNull();
      expect(recovered!.episodicMemories).toHaveLength(1);
    });

    it("should return null when no recovery data available", async () => {
      const recovered = await manager.attemptRecovery();
      expect(recovered).toBeNull();
    });
  });

  describe("auto-save functionality", () => {
    it("should start and stop auto-save", async () => {
      let saveCallCount = 0;
      const saveCallback = async () => {
        saveCallCount++;
      };

      manager.startAutoSave(saveCallback);

      // Wait a bit to see if auto-save triggers
      await new Promise((resolve) => setTimeout(resolve, 100));

      manager.stopAutoSave();

      // Note: Since we disabled auto-save in config, this tests the interface
      // In a real scenario with auto_save_enabled: true, this would trigger saves
    });
  });

  describe("provider switching", () => {
    it("should switch between storage providers", async () => {
      // Save some data with memory provider
      const episodes: Episode[] = [
        {
          content: { text: "switch test" },
          context: { session_id: "test", domain: "test" },
          timestamp: Date.now(),
          emotional_tags: [],
          importance: 0.5,
          decay_factor: 1.0,
        },
      ];

      await manager.saveMemorySystem(episodes, [], [], Date.now());

      // Switch to file provider
      const testId = Math.random().toString(36).substring(7);
      const testDir = `./tmp/test-data-${testId}`;

      // Ensure test directory exists before switching
      const fs = await import("fs/promises");
      await fs.mkdir(testDir, { recursive: true });

      await manager.switchProvider("file", {
        file_path: `${testDir}/switched-memory.json`,
      });

      const status = manager.getStatus();
      expect(status.provider_type).toBe("file");

      // Data should still be available (migrated)
      const loaded = await manager.loadMemorySystem();
      expect(loaded).not.toBeNull();
      expect(loaded!.episodicMemories).toHaveLength(1);
    });

    it("should handle switch when no data exists", async () => {
      // Create test directory first
      const fs = await import("fs/promises");
      const testId = Math.random().toString(36).substring(7);
      const testDir = `./tmp/test-data-${testId}`;
      await fs.mkdir(testDir, { recursive: true });

      await manager.switchProvider("file", {
        file_path: `${testDir}/empty-switch.json`,
      });

      const status = manager.getStatus();
      expect(status.provider_type).toBe("file");

      // Clean up test directory
      try {
        await fs.rm(testDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  });

  describe("error handling", () => {
    it("should handle operations when not initialized", async () => {
      const uninitializedManager = new PersistenceManager();

      await expect(
        uninitializedManager.saveMemorySystem([], [], [], Date.now())
      ).rejects.toThrow("not initialized");

      await expect(uninitializedManager.loadMemorySystem()).rejects.toThrow(
        "not initialized"
      );

      await expect(uninitializedManager.createBackup()).rejects.toThrow(
        "not initialized"
      );
    });

    it("should handle save errors gracefully", async () => {
      // This would require mocking the provider to simulate errors
      // For now, we test the interface
      const episodes: Episode[] = [];

      // Should not throw for valid empty data
      await expect(
        manager.saveMemorySystem(episodes, [], [], Date.now())
      ).resolves.not.toThrow();
    });
  });

  describe("status reporting", () => {
    it("should provide comprehensive status", () => {
      const status = manager.getStatus();

      expect(status).toHaveProperty("manager_initialized");
      expect(status).toHaveProperty("provider_type");
      expect(status).toHaveProperty("initialized");
      expect(status).toHaveProperty("last_save");
      expect(status).toHaveProperty("last_load");
      expect(status).toHaveProperty("backup_count");
      expect(status).toHaveProperty("storage_size_bytes");
      expect(status).toHaveProperty("error_count");
    });

    it("should update status after operations", async () => {
      const initialStatus = manager.getStatus();
      expect(initialStatus.last_save).toBe(0);

      await manager.saveMemorySystem([], [], [], Date.now());

      const updatedStatus = manager.getStatus();
      expect(updatedStatus.last_save).toBeGreaterThan(initialStatus.last_save);
    });
  });

  describe("configuration", () => {
    it("should use default configuration values", async () => {
      const defaultManager = new PersistenceManager();
      await defaultManager.initialize();

      const status = defaultManager.getStatus();

      // Should have reasonable defaults
      expect(status.provider_type).toBe("file");

      await defaultManager.shutdown();
    });

    it("should override configuration values", async () => {
      const customManager = new PersistenceManager({
        storage_type: "memory",
        max_backups: 5,
        version: getVersion(),
      });

      await customManager.initialize();

      // Test that custom config is used
      await customManager.saveMemorySystem([], [], [], Date.now());
      await customManager.createBackup("test");

      const backups = await customManager.listBackups();
      expect(backups).toContain("test");

      await customManager.shutdown();
    });
  });
});
