/**
 * File Persistence Provider Tests
 *
 * Tests for file-based memory persistence functionality.
 */

import { promises as fs } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemorySnapshot } from "../../../interfaces/persistence.js";
import { FilePersistenceProvider } from "../../../utils/persistence/FilePersistenceProvider.js";

describe("FilePersistenceProvider", () => {
  let provider: FilePersistenceProvider;
  let testDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    testDir = join(process.cwd(), "test-data");
    testFilePath = join(testDir, "test-memory.json");

    provider = new FilePersistenceProvider();

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
  });

  afterEach(async () => {
    await provider.cleanup();

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
  });

  describe("initialization", () => {
    it("should initialize with default config", async () => {
      await provider.initialize({
        storage_type: "file",
        file_path: testFilePath,
        backup_interval_ms: 0, // Disable auto-backup for tests
        max_backups: 5,
        compression_enabled: false,
        encryption_enabled: false,
      });

      const status = provider.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.provider_type).toBe("file");
    });

    it("should create directory if it doesn't exist", async () => {
      await provider.initialize({
        storage_type: "file",
        file_path: testFilePath,
        backup_interval_ms: 0,
        max_backups: 5,
        compression_enabled: false,
        encryption_enabled: false,
      });

      // Check that directory was created
      const dirExists = await fs
        .access(testDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);
    });

    it("should throw error if file path is not provided", async () => {
      await expect(
        provider.initialize({
          storage_type: "file",
          file_path: undefined,
          backup_interval_ms: 0,
          max_backups: 5,
          compression_enabled: false,
          encryption_enabled: false,
        })
      ).rejects.toThrow("File path is required");
    });
  });

  describe("save and load", () => {
    beforeEach(async () => {
      await provider.initialize({
        storage_type: "file",
        file_path: testFilePath,
        backup_interval_ms: 0,
        max_backups: 5,
        compression_enabled: false,
        encryption_enabled: false,
      });
    });

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

    it("should return null when loading non-existent file", async () => {
      const loaded = await provider.load();
      expect(loaded).toBeNull();
    });

    it("should handle compression", async () => {
      // Reinitialize with compression enabled
      await provider.cleanup();
      await provider.initialize({
        storage_type: "file",
        file_path: testFilePath,
        backup_interval_ms: 0,
        max_backups: 5,
        compression_enabled: true,
        encryption_enabled: false,
      });

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
      const loaded = await provider.load();

      expect(loaded).not.toBeNull();
      expect(loaded!.version).toBe(snapshot.version);
    });

    it("should validate snapshot structure", async () => {
      // Create invalid snapshot file
      await fs.writeFile(testFilePath, JSON.stringify({ invalid: "data" }));

      await expect(provider.load()).rejects.toThrow("Invalid snapshot");
    });
  });

  describe("backup and restore", () => {
    beforeEach(async () => {
      await provider.initialize({
        storage_type: "file",
        file_path: testFilePath,
        backup_interval_ms: 0,
        max_backups: 3,
        compression_enabled: false,
        encryption_enabled: false,
      });
    });

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

      // Corrupt the backup metadata
      const backupDir = join(testDir, "backups");
      const metadataPath = join(backupDir, "test-backup.meta");
      const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
      metadata.checksum = "invalid";
      await fs.writeFile(metadataPath, JSON.stringify(metadata));

      await expect(provider.restore("test-backup")).rejects.toThrow(
        "checksum verification failed"
      );
    });
  });

  describe("error handling", () => {
    it("should handle save errors gracefully", async () => {
      // Test initialization error first
      await expect(
        provider.initialize({
          storage_type: "file",
          file_path: "/invalid/path/file.json",
          backup_interval_ms: 0,
          max_backups: 5,
          compression_enabled: false,
          encryption_enabled: false,
        })
      ).rejects.toThrow();
    });

    it("should handle operations when not initialized", async () => {
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

      await expect(provider.save(snapshot)).rejects.toThrow("not initialized");
      await expect(provider.load()).rejects.toThrow("not initialized");
      await expect(provider.backup("test")).rejects.toThrow("not initialized");
    });
  });
});
