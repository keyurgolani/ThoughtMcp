/**
 * Memory Persistence Provider Tests
 *
 * Tests for in-memory persistence functionality.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { MemorySnapshot } from "../../../interfaces/persistence.js";
import { MemoryPersistenceProvider } from "../../../utils/persistence/MemoryPersistenceProvider.js";

describe("MemoryPersistenceProvider", () => {
  let provider: MemoryPersistenceProvider;

  beforeEach(async () => {
    provider = new MemoryPersistenceProvider();
    await provider.initialize({
      storage_type: "memory",
      backup_interval_ms: 0,
      max_backups: 3,
      compression_enabled: false,
      encryption_enabled: false,
    });
  });

  describe("initialization", () => {
    it("should initialize successfully", () => {
      const status = provider.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.provider_type).toBe("memory");
    });
  });

  describe("save and load", () => {
    it("should save and load memory snapshot", async () => {
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        version: "1.0.0",
        episodic_memories: [
          {
            content: { text: "test memory" },
            context: { session_id: "test", domain: "test" },
            timestamp: Date.now(),
            emotional_tags: ["positive"],
            importance: 0.8,
            decay_factor: 1.0,
          },
        ],
        semantic_concepts: [
          {
            id: "concept1",
            content: { type: "test", value: "concept" },
            relations: [],
            activation: 0.9,
            last_accessed: Date.now(),
          },
        ],
        semantic_relations: [
          {
            from: "concept1",
            to: "concept2",
            type: "related_to",
            strength: 0.7,
          },
        ],
        metadata: {
          total_episodes: 1,
          total_concepts: 1,
          total_relations: 1,
          last_consolidation: Date.now(),
        },
      };

      await provider.save(snapshot);

      const loaded = await provider.load();
      expect(loaded).not.toBeNull();
      expect(loaded!.version).toBe(snapshot.version);
      expect(loaded!.episodic_memories).toHaveLength(1);
      expect(loaded!.semantic_concepts).toHaveLength(1);
      expect(loaded!.semantic_relations).toHaveLength(1);
    });

    it("should return null when no snapshot exists", async () => {
      const loaded = await provider.load();
      expect(loaded).toBeNull();
    });

    it("should handle deep cloning correctly", async () => {
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        version: "1.0.0",
        episodic_memories: [
          {
            content: { text: "test memory" },
            context: { session_id: "test", domain: "test" },
            timestamp: Date.now(),
            emotional_tags: ["positive"],
            importance: 0.8,
            decay_factor: 1.0,
          },
        ],
        semantic_concepts: [],
        semantic_relations: [],
        metadata: {
          total_episodes: 1,
          total_concepts: 0,
          total_relations: 0,
          last_consolidation: Date.now(),
        },
      };

      await provider.save(snapshot);

      // Modify original snapshot
      snapshot.episodic_memories[0].content = { text: "modified" };

      const loaded = await provider.load();
      expect(loaded!.episodic_memories[0].content).toEqual({
        text: "test memory",
      });
    });
  });

  describe("backup and restore", () => {
    it("should create and restore backup", async () => {
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        version: "1.0.0",
        episodic_memories: [],
        semantic_concepts: [],
        semantic_relations: [],
        metadata: {
          total_episodes: 0,
          total_concepts: 0,
          total_relations: 0,
          last_consolidation: Date.now(),
        },
      };

      await provider.save(snapshot);
      await provider.backup("test-backup");

      const backups = await provider.listBackups();
      expect(backups).toContain("test-backup");

      const restored = await provider.restore("test-backup");
      expect(restored.version).toBe(snapshot.version);
    });

    it("should cleanup old backups", async () => {
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        version: "1.0.0",
        episodic_memories: [],
        semantic_concepts: [],
        semantic_relations: [],
        metadata: {
          total_episodes: 0,
          total_concepts: 0,
          total_relations: 0,
          last_consolidation: Date.now(),
        },
      };

      await provider.save(snapshot);

      // Create more backups than max_backups
      for (let i = 0; i < 5; i++) {
        await provider.backup(`backup-${i}`);
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const backups = await provider.listBackups();
      expect(backups.length).toBeLessThanOrEqual(3);
    });

    it("should delete backup", async () => {
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        version: "1.0.0",
        episodic_memories: [],
        semantic_concepts: [],
        semantic_relations: [],
        metadata: {
          total_episodes: 0,
          total_concepts: 0,
          total_relations: 0,
          last_consolidation: Date.now(),
        },
      };

      await provider.save(snapshot);
      await provider.backup("test-backup");

      let backups = await provider.listBackups();
      expect(backups).toContain("test-backup");

      await provider.deleteBackup("test-backup");

      backups = await provider.listBackups();
      expect(backups).not.toContain("test-backup");
    });

    it("should verify backup checksum", async () => {
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        version: "1.0.0",
        episodic_memories: [],
        semantic_concepts: [],
        semantic_relations: [],
        metadata: {
          total_episodes: 0,
          total_concepts: 0,
          total_relations: 0,
          last_consolidation: Date.now(),
        },
      };

      await provider.save(snapshot);
      await provider.backup("test-backup");

      // Corrupt the backup checksum
      const metadata = provider.getBackupMetadata("test-backup");
      if (metadata) {
        metadata.checksum = "invalid";
      }

      await expect(provider.restore("test-backup")).rejects.toThrow(
        "checksum verification failed"
      );
    });

    it("should sort backups by timestamp", async () => {
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        version: "1.0.0",
        episodic_memories: [],
        semantic_concepts: [],
        semantic_relations: [],
        metadata: {
          total_episodes: 0,
          total_concepts: 0,
          total_relations: 0,
          last_consolidation: Date.now(),
        },
      };

      await provider.save(snapshot);

      // Create backups with delays to ensure different timestamps
      await provider.backup("backup-1");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await provider.backup("backup-2");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await provider.backup("backup-3");

      const backups = await provider.listBackups();
      expect(backups[0]).toBe("backup-3"); // Most recent first
    });
  });

  describe("error handling", () => {
    it("should handle restore of non-existent backup", async () => {
      await expect(provider.restore("non-existent")).rejects.toThrow(
        "not found"
      );
    });

    it("should handle delete of non-existent backup", async () => {
      await expect(provider.deleteBackup("non-existent")).rejects.toThrow(
        "not found"
      );
    });

    it("should handle operations when not initialized", async () => {
      const uninitializedProvider = new MemoryPersistenceProvider();

      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        version: "1.0.0",
        episodic_memories: [],
        semantic_concepts: [],
        semantic_relations: [],
        metadata: {
          total_episodes: 0,
          total_concepts: 0,
          total_relations: 0,
          last_consolidation: Date.now(),
        },
      };

      await expect(uninitializedProvider.save(snapshot)).rejects.toThrow(
        "not initialized"
      );
      await expect(uninitializedProvider.load()).rejects.toThrow(
        "not initialized"
      );
      await expect(uninitializedProvider.backup("test")).rejects.toThrow(
        "not initialized"
      );
    });
  });

  describe("testing utilities", () => {
    it("should provide access to current snapshot for testing", async () => {
      expect(provider.getCurrentSnapshot()).toBeNull();

      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        version: "1.0.0",
        episodic_memories: [],
        semantic_concepts: [],
        semantic_relations: [],
        metadata: {
          total_episodes: 0,
          total_concepts: 0,
          total_relations: 0,
          last_consolidation: Date.now(),
        },
      };

      await provider.save(snapshot);
      expect(provider.getCurrentSnapshot()).not.toBeNull();
    });

    it("should provide backup metadata for testing", async () => {
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        version: "1.0.0",
        episodic_memories: [],
        semantic_concepts: [],
        semantic_relations: [],
        metadata: {
          total_episodes: 0,
          total_concepts: 0,
          total_relations: 0,
          last_consolidation: Date.now(),
        },
      };

      await provider.save(snapshot);
      await provider.backup("test-backup");

      const metadata = provider.getBackupMetadata("test-backup");
      expect(metadata).toBeDefined();
      expect(metadata!.id).toBe("test-backup");
    });

    it("should clear all data for testing", async () => {
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        version: "1.0.0",
        episodic_memories: [],
        semantic_concepts: [],
        semantic_relations: [],
        metadata: {
          total_episodes: 0,
          total_concepts: 0,
          total_relations: 0,
          last_consolidation: Date.now(),
        },
      };

      await provider.save(snapshot);
      await provider.backup("test-backup");

      provider.clear();

      expect(provider.getCurrentSnapshot()).toBeNull();
      const backups = await provider.listBackups();
      expect(backups).toHaveLength(0);
    });
  });

  describe("status reporting", () => {
    it("should report accurate status", async () => {
      const status = provider.getStatus();
      expect(status.provider_type).toBe("memory");
      expect(status.initialized).toBe(true);
      expect(status.backup_count).toBe(0);
      expect(status.storage_size_bytes).toBe(0);

      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        version: "1.0.0",
        episodic_memories: [],
        semantic_concepts: [],
        semantic_relations: [],
        metadata: {
          total_episodes: 0,
          total_concepts: 0,
          total_relations: 0,
          last_consolidation: Date.now(),
        },
      };

      await provider.save(snapshot);
      await provider.backup("test-backup");

      const updatedStatus = provider.getStatus();
      expect(updatedStatus.backup_count).toBe(1);
      expect(updatedStatus.storage_size_bytes).toBeGreaterThan(0);
    });
  });
});
