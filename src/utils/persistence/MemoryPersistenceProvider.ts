/**
 * In-Memory Persistence Provider
 *
 * Implements in-memory storage for testing and development.
 * Provides volatile storage that doesn't persist across restarts.
 */

import {
  BackupMetadata,
  IPersistenceProvider,
  MemorySnapshot,
  PersistenceConfig,
  PersistenceStatus,
} from "../../interfaces/persistence.js";

export class MemoryPersistenceProvider implements IPersistenceProvider {
  private config!: PersistenceConfig;
  private currentSnapshot: MemorySnapshot | null = null;
  private backups: Map<
    string,
    { snapshot: MemorySnapshot; metadata: BackupMetadata }
  > = new Map();
  private initialized: boolean = false;
  private lastSave: number = 0;
  private lastLoad: number = 0;
  private errorCount: number = 0;

  async initialize(config: PersistenceConfig): Promise<void> {
    this.config = {
      ...config,
      storage_type: "memory",
      backup_interval_ms: config.backup_interval_ms ?? 0, // No automatic backups for memory provider
      max_backups: config.max_backups ?? 5,
      compression_enabled: config.compression_enabled ?? false,
      encryption_enabled: config.encryption_enabled ?? false,
    };

    this.currentSnapshot = null;
    this.backups.clear();
    this.initialized = true;
  }

  async save(snapshot: MemorySnapshot): Promise<void> {
    if (!this.initialized) {
      throw new Error("Memory persistence provider not initialized");
    }

    try {
      // Deep clone the snapshot to avoid reference issues
      this.currentSnapshot = JSON.parse(JSON.stringify(snapshot));
      this.lastSave = Date.now();
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to save memory snapshot: ${error}`);
    }
  }

  async load(): Promise<MemorySnapshot | null> {
    if (!this.initialized) {
      throw new Error("Memory persistence provider not initialized");
    }

    try {
      if (!this.currentSnapshot) {
        return null;
      }

      // Deep clone to avoid reference issues
      const snapshot = JSON.parse(
        JSON.stringify(this.currentSnapshot)
      ) as MemorySnapshot;
      this.lastLoad = Date.now();
      return snapshot;
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to load memory snapshot: ${error}`);
    }
  }

  async backup(backupId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error("Memory persistence provider not initialized");
    }

    try {
      if (!this.currentSnapshot) {
        throw new Error("No memory snapshot to backup");
      }

      // Create backup metadata
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: Date.now(),
        size_bytes: JSON.stringify(this.currentSnapshot).length,
        episode_count: this.currentSnapshot.episodic_memories.length,
        concept_count: this.currentSnapshot.semantic_concepts.length,
        relation_count: this.currentSnapshot.semantic_relations.length,
        checksum: this.calculateChecksum(this.currentSnapshot),
      };

      // Store backup (deep clone)
      const snapshotCopy = JSON.parse(
        JSON.stringify(this.currentSnapshot)
      ) as MemorySnapshot;
      this.backups.set(backupId, { snapshot: snapshotCopy, metadata });

      // Cleanup old backups if needed
      await this.cleanupOldBackups();
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to create memory backup: ${error}`);
    }
  }

  async restore(backupId: string): Promise<MemorySnapshot> {
    if (!this.initialized) {
      throw new Error("Memory persistence provider not initialized");
    }

    try {
      const backup = this.backups.get(backupId);
      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }

      // Verify checksum
      const actualChecksum = this.calculateChecksum(backup.snapshot);
      if (actualChecksum !== backup.metadata.checksum) {
        throw new Error("Backup checksum verification failed");
      }

      // Return deep clone
      return JSON.parse(JSON.stringify(backup.snapshot)) as MemorySnapshot;
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to restore memory backup: ${error}`);
    }
  }

  async listBackups(): Promise<string[]> {
    if (!this.initialized) {
      throw new Error("Memory persistence provider not initialized");
    }

    // Sort by timestamp (newest first)
    const backupEntries = Array.from(this.backups.entries());
    backupEntries.sort(
      (a, b) => b[1].metadata.timestamp - a[1].metadata.timestamp
    );

    return backupEntries.map(([id]) => id);
  }

  async deleteBackup(backupId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error("Memory persistence provider not initialized");
    }

    try {
      const deleted = this.backups.delete(backupId);
      if (!deleted) {
        throw new Error(`Backup ${backupId} not found`);
      }
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to delete memory backup: ${error}`);
    }
  }

  async cleanup(): Promise<void> {
    this.currentSnapshot = null;
    this.backups.clear();
  }

  getStatus(): PersistenceStatus {
    let storageSize = 0;

    if (this.currentSnapshot) {
      storageSize += JSON.stringify(this.currentSnapshot).length;
    }

    for (const backup of this.backups.values()) {
      storageSize += backup.metadata.size_bytes;
    }

    return {
      provider_type: "memory",
      initialized: this.initialized,
      last_save: this.lastSave,
      last_load: this.lastLoad,
      backup_count: this.backups.size,
      storage_size_bytes: storageSize,
      error_count: this.errorCount,
    };
  }

  // Additional methods for testing

  /**
   * Get current snapshot without loading (for testing)
   */
  getCurrentSnapshot(): MemorySnapshot | null {
    return this.currentSnapshot;
  }

  /**
   * Get backup metadata (for testing)
   */
  getBackupMetadata(backupId: string): BackupMetadata | undefined {
    return this.backups.get(backupId)?.metadata;
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.currentSnapshot = null;
    this.backups.clear();
    this.lastSave = 0;
    this.lastLoad = 0;
    this.errorCount = 0;
  }

  // Private helper methods

  private async cleanupOldBackups(): Promise<void> {
    if (this.backups.size <= this.config.max_backups) {
      return;
    }

    // Sort backups by timestamp and remove oldest
    const backupEntries = Array.from(this.backups.entries());
    backupEntries.sort(
      (a, b) => a[1].metadata.timestamp - b[1].metadata.timestamp
    );

    const toDelete = backupEntries.slice(
      0,
      this.backups.size - this.config.max_backups
    );
    for (const [backupId] of toDelete) {
      this.backups.delete(backupId);
    }
  }

  private calculateChecksum(snapshot: MemorySnapshot): string {
    // Simple checksum calculation
    const data = JSON.stringify(snapshot);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
