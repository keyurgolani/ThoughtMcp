/**
 * File-based Persistence Provider
 *
 * Implements file-based storage for development environments.
 * Provides JSON-based storage with optional compression and backup rotation.
 */

import { createHash } from "crypto";
import { promises as fs } from "fs";
import { dirname, join } from "path";
import { promisify } from "util";
import { gunzip, gzip } from "zlib";

import {
  BackupMetadata,
  IPersistenceProvider,
  MemorySnapshot,
  PersistenceConfig,
  PersistenceStatus,
} from "../../interfaces/persistence.js";
import { getVersion } from "../version.js";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export class FilePersistenceProvider implements IPersistenceProvider {
  private config!: PersistenceConfig;
  private initialized: boolean = false;
  private lastSave: number = 0;
  private lastLoad: number = 0;
  private errorCount: number = 0;
  private backupTimer?: NodeJS.Timeout;

  async initialize(config: PersistenceConfig): Promise<void> {
    if (!config.file_path) {
      throw new Error("File path is required for file persistence");
    }

    this.config = {
      ...config,
      storage_type: "file",
      file_path: config.file_path,
      backup_interval_ms: config.backup_interval_ms ?? 300000, // 5 minutes
      max_backups: config.max_backups ?? 10,
      compression_enabled: config.compression_enabled ?? true,
      encryption_enabled: config.encryption_enabled ?? false,
    };

    // Ensure directory exists
    const dir = dirname(this.config.file_path!);

    try {
      await fs.mkdir(dir, { recursive: true });

      // Test write permissions by creating a temporary file with unique name
      const testFile = join(
        dir,
        `.write-test-${Date.now()}-${Math.random().toString(36).substring(7)}-${
          process.pid
        }`
      );
      await fs.writeFile(testFile, "test");
      await fs.unlink(testFile);
    } catch (error) {
      // Retry with exponential backoff to handle race conditions
      const maxRetries = 3;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * Math.pow(2, retryCount))
          );
          await fs.mkdir(dir, { recursive: true });

          const testFile = join(
            dir,
            `.write-test-${Date.now()}-${Math.random()
              .toString(36)
              .substring(7)}-${process.pid}-retry${retryCount}`
          );
          await fs.writeFile(testFile, "test");
          await fs.unlink(testFile);
          break; // Success, exit retry loop
        } catch (retryError) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error(
              `Cannot create or write to directory: ${dir} (after ${maxRetries} retries)`
            );
          }
        }
      }
    }

    // Ensure backup directory exists
    const backupDir = join(dir, "backups");
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (error) {
      // Retry with exponential backoff to handle race conditions
      const maxRetries = 3;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          await new Promise((resolve) =>
            setTimeout(resolve, 50 * Math.pow(2, retryCount))
          );
          await fs.mkdir(backupDir, { recursive: true });
          break; // Success, exit retry loop
        } catch (retryError) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error(
              `Cannot create backup directory: ${backupDir} (after ${maxRetries} retries)`
            );
          }
        }
      }
    }

    // Start automatic backup process
    if (this.config.backup_interval_ms > 0) {
      this.startBackupProcess();
    }

    this.initialized = true;
  }

  async save(snapshot: MemorySnapshot): Promise<void> {
    if (!this.initialized || !this.config.file_path) {
      throw new Error("Persistence provider not initialized");
    }

    try {
      const data = JSON.stringify(snapshot, null, 2);
      let buffer = Buffer.from(data, "utf8");

      // Apply compression if enabled
      if (this.config.compression_enabled) {
        buffer = Buffer.from(await gzipAsync(buffer));
      }

      // Write to temporary file first, then rename for atomic operation
      const tempPath = `${this.config.file_path}.tmp`;
      await fs.writeFile(tempPath, buffer);
      await fs.rename(tempPath, this.config.file_path);

      this.lastSave = Date.now();
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to save memory snapshot: ${error}`);
    }
  }

  async load(): Promise<MemorySnapshot | null> {
    if (!this.initialized || !this.config.file_path) {
      throw new Error("Persistence provider not initialized");
    }

    try {
      // Check if file exists
      try {
        await fs.access(this.config.file_path);
      } catch {
        return null; // File doesn't exist
      }

      let buffer = await fs.readFile(this.config.file_path);

      // Decompress if needed
      if (this.config.compression_enabled) {
        buffer = await gunzipAsync(buffer);
      }

      const data = buffer.toString("utf8");
      const snapshot = JSON.parse(data) as MemorySnapshot;

      // Validate snapshot structure
      this.validateSnapshot(snapshot);

      this.lastLoad = Date.now();
      return snapshot;
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to load memory snapshot: ${error}`);
    }
  }

  async backup(backupId: string): Promise<void> {
    if (!this.initialized || !this.config.file_path) {
      throw new Error("Persistence provider not initialized");
    }

    try {
      // Load current snapshot, or create empty one if none exists
      let snapshot: MemorySnapshot;
      try {
        const loadedSnapshot = await this.load();
        if (!loadedSnapshot) {
          throw new Error("No snapshot loaded");
        }
        snapshot = loadedSnapshot;
      } catch (error) {
        // If no snapshot exists, create an empty one for backup
        snapshot = {
          timestamp: Date.now(),
          version: getVersion(),
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
      }

      // Create backup metadata
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: Date.now(),
        size_bytes: 0,
        episode_count: snapshot.episodic_memories.length,
        concept_count: snapshot.semantic_concepts.length,
        relation_count: snapshot.semantic_relations.length,
        checksum: "",
      };

      // Serialize and compress backup
      const data = JSON.stringify({ snapshot, metadata }, null, 2);
      let buffer = Buffer.from(data, "utf8");

      if (this.config.compression_enabled) {
        buffer = Buffer.from(await gzipAsync(buffer));
      }

      // Calculate checksum
      metadata.size_bytes = buffer.length;
      metadata.checksum = createHash("sha256").update(buffer).digest("hex");

      // Save backup
      const backupDir = join(dirname(this.config.file_path), "backups");
      await fs.mkdir(backupDir, { recursive: true });
      const backupPath = join(backupDir, `${backupId}.backup`);
      await fs.writeFile(backupPath, buffer);

      // Save metadata
      const metadataPath = join(backupDir, `${backupId}.meta`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // Cleanup old backups
      await this.cleanupOldBackups();
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  async restore(backupId: string): Promise<MemorySnapshot> {
    if (!this.initialized || !this.config.file_path) {
      throw new Error("Persistence provider not initialized");
    }

    try {
      const backupDir = join(dirname(this.config.file_path), "backups");
      const backupPath = join(backupDir, `${backupId}.backup`);
      const metadataPath = join(backupDir, `${backupId}.meta`);

      // Load metadata
      const metadataData = await fs.readFile(metadataPath, "utf8");
      const metadata = JSON.parse(metadataData) as BackupMetadata;

      // Load backup
      let buffer = await fs.readFile(backupPath);

      // Verify checksum
      const actualChecksum = createHash("sha256").update(buffer).digest("hex");
      if (actualChecksum !== metadata.checksum) {
        throw new Error("Backup checksum verification failed");
      }

      // Decompress if needed
      if (this.config.compression_enabled) {
        buffer = await gunzipAsync(buffer);
      }

      const data = buffer.toString("utf8");
      const backupData = JSON.parse(data);

      // Validate and return snapshot
      this.validateSnapshot(backupData.snapshot);
      return backupData.snapshot as MemorySnapshot;
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to restore backup: ${error}`);
    }
  }

  async listBackups(): Promise<string[]> {
    if (!this.initialized || !this.config.file_path) {
      throw new Error("Persistence provider not initialized");
    }

    try {
      const backupDir = join(dirname(this.config.file_path), "backups");
      const files = await fs.readdir(backupDir);

      // Filter for backup files and extract IDs
      const backupIds = files
        .filter((file) => file.endsWith(".backup"))
        .map((file) => file.replace(".backup", ""))
        .sort();

      return backupIds;
    } catch (error) {
      // Directory might not exist yet
      return [];
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    if (!this.initialized || !this.config.file_path) {
      throw new Error("Persistence provider not initialized");
    }

    try {
      const backupDir = join(dirname(this.config.file_path), "backups");
      const backupPath = join(backupDir, `${backupId}.backup`);
      const metadataPath = join(backupDir, `${backupId}.meta`);

      // Delete both files
      await Promise.all([
        fs.unlink(backupPath).catch(() => {}), // Ignore if file doesn't exist
        fs.unlink(metadataPath).catch(() => {}),
      ]);
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to delete backup: ${error}`);
    }
  }

  async cleanup(): Promise<void> {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = undefined;
    }
  }

  getStatus(): PersistenceStatus {
    let storageSize = 0;
    let backupCount = 0;

    // Calculate storage size (async operation, so this is approximate)
    if (this.config.file_path) {
      fs.stat(this.config.file_path)
        .then((stats) => {
          storageSize = stats.size;
        })
        .catch(() => {
          // File might not exist
        });

      this.listBackups()
        .then((backups) => {
          backupCount = backups.length;
        })
        .catch(() => {
          // Ignore errors
        });
    }

    return {
      provider_type: "file",
      initialized: this.initialized,
      last_save: this.lastSave,
      last_load: this.lastLoad,
      backup_count: backupCount,
      storage_size_bytes: storageSize,
      error_count: this.errorCount,
    };
  }

  // Private helper methods

  private startBackupProcess(): void {
    this.backupTimer = setInterval(async () => {
      try {
        const backupId = `auto_${Date.now()}`;
        await this.backup(backupId);
      } catch (error) {
        console.error("Automatic backup failed:", error);
        this.errorCount++;
      }
    }, this.config.backup_interval_ms);
  }

  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();

    if (backups.length <= this.config.max_backups) {
      return;
    }

    // Sort by timestamp (oldest first) and remove excess
    const backupDir = join(dirname(this.config.file_path!), "backups");
    const backupsWithTimestamp: Array<{ id: string; timestamp: number }> = [];

    for (const backupId of backups) {
      try {
        const metadataPath = join(backupDir, `${backupId}.meta`);
        const metadataData = await fs.readFile(metadataPath, "utf8");
        const metadata = JSON.parse(metadataData) as BackupMetadata;
        backupsWithTimestamp.push({
          id: backupId,
          timestamp: metadata.timestamp,
        });
      } catch {
        // If we can't read metadata, assume it's old and should be deleted
        backupsWithTimestamp.push({ id: backupId, timestamp: 0 });
      }
    }

    // Sort by timestamp and remove oldest
    backupsWithTimestamp.sort((a, b) => a.timestamp - b.timestamp);
    const toDelete = backupsWithTimestamp.slice(
      0,
      backups.length - this.config.max_backups
    );

    for (const backup of toDelete) {
      await this.deleteBackup(backup.id);
    }
  }

  private validateSnapshot(snapshot: MemorySnapshot): void {
    if (!snapshot || typeof snapshot !== "object") {
      throw new Error("Invalid snapshot: not an object");
    }

    if (!snapshot.timestamp || typeof snapshot.timestamp !== "number") {
      throw new Error("Invalid snapshot: missing or invalid timestamp");
    }

    if (!snapshot.version || typeof snapshot.version !== "string") {
      throw new Error("Invalid snapshot: missing or invalid version");
    }

    if (!Array.isArray(snapshot.episodic_memories)) {
      throw new Error("Invalid snapshot: episodic_memories must be an array");
    }

    if (!Array.isArray(snapshot.semantic_concepts)) {
      throw new Error("Invalid snapshot: semantic_concepts must be an array");
    }

    if (!Array.isArray(snapshot.semantic_relations)) {
      throw new Error("Invalid snapshot: semantic_relations must be an array");
    }

    if (!snapshot.metadata || typeof snapshot.metadata !== "object") {
      throw new Error("Invalid snapshot: missing or invalid metadata");
    }
  }
}
