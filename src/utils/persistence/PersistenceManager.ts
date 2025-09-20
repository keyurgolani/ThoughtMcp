/**
 * Persistence Manager
 *
 * Manages memory persistence and provides a unified interface for
 * different persistence providers (file, database, memory).
 */

import {
  IPersistenceProvider,
  MemorySnapshot,
  PersistenceConfig,
  PersistenceStatus,
} from "../../interfaces/persistence.js";
import { Concept, Episode, Relation } from "../../types/core.js";
import { DatabasePersistenceProvider } from "./DatabasePersistenceProvider.js";
import { FilePersistenceProvider } from "./FilePersistenceProvider.js";
import { MemoryPersistenceProvider } from "./MemoryPersistenceProvider.js";

export interface PersistenceManagerConfig extends PersistenceConfig {
  auto_save_enabled: boolean;
  auto_save_interval_ms: number;
  auto_backup_enabled: boolean;
  recovery_enabled: boolean;
  version: string;
}

export class PersistenceManager {
  private provider: IPersistenceProvider;
  private config: PersistenceManagerConfig;
  private autoSaveTimer?: NodeJS.Timeout;
  private autoBackupTimer?: NodeJS.Timeout;
  private initialized: boolean = false;

  constructor(config?: Partial<PersistenceManagerConfig>) {
    this.config = {
      storage_type: "file",
      file_path: "./brain/memory.json", // Updated to use brain directory
      backup_interval_ms: 300000, // 5 minutes
      max_backups: 10,
      compression_enabled: true,
      encryption_enabled: false,
      auto_save_enabled: true,
      auto_save_interval_ms: 60000, // 1 minute
      auto_backup_enabled: true,
      recovery_enabled: true,
      version: "1.0.0",
      ...config,
    };

    // Create appropriate provider based on storage type
    this.provider = this.createProvider(this.config.storage_type);
  }

  async initialize(): Promise<void> {
    await this.provider.initialize(this.config);

    // Start automatic processes if enabled
    if (this.config.auto_backup_enabled && this.config.backup_interval_ms > 0) {
      this.startAutoBackup();
    }

    this.initialized = true;
  }

  /**
   * Save memory snapshot from memory system components
   */
  async saveMemorySystem(
    episodicMemories: Episode[],
    semanticConcepts: Concept[],
    semanticRelations: Relation[],
    lastConsolidation: number = Date.now()
  ): Promise<void> {
    if (!this.initialized) {
      throw new Error("Persistence manager not initialized");
    }

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      version: this.config.version,
      episodic_memories: episodicMemories,
      semantic_concepts: semanticConcepts,
      semantic_relations: semanticRelations,
      metadata: {
        total_episodes: episodicMemories.length,
        total_concepts: semanticConcepts.length,
        total_relations: semanticRelations.length,
        last_consolidation: lastConsolidation,
      },
    };

    await this.provider.save(snapshot);
  }

  /**
   * Load memory snapshot and return components
   */
  async loadMemorySystem(): Promise<{
    episodicMemories: Episode[];
    semanticConcepts: Concept[];
    semanticRelations: Relation[];
    lastConsolidation: number;
  } | null> {
    if (!this.initialized) {
      throw new Error("Persistence manager not initialized");
    }

    const snapshot = await this.provider.load();
    if (!snapshot) {
      return null;
    }

    return {
      episodicMemories: snapshot.episodic_memories,
      semanticConcepts: snapshot.semantic_concepts,
      semanticRelations: snapshot.semantic_relations,
      lastConsolidation: snapshot.metadata.last_consolidation,
    };
  }

  /**
   * Create a manual backup
   */
  async createBackup(backupId?: string): Promise<string> {
    if (!this.initialized) {
      throw new Error("Persistence manager not initialized");
    }

    const id = backupId || `manual_${Date.now()}`;
    await this.provider.backup(id);
    return id;
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string): Promise<{
    episodicMemories: Episode[];
    semanticConcepts: Concept[];
    semanticRelations: Relation[];
    lastConsolidation: number;
  }> {
    if (!this.initialized) {
      throw new Error("Persistence manager not initialized");
    }

    const snapshot = await this.provider.restore(backupId);

    return {
      episodicMemories: snapshot.episodic_memories,
      semanticConcepts: snapshot.semantic_concepts,
      semanticRelations: snapshot.semantic_relations,
      lastConsolidation: snapshot.metadata.last_consolidation,
    };
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<string[]> {
    if (!this.initialized) {
      throw new Error("Persistence manager not initialized");
    }

    return this.provider.listBackups();
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error("Persistence manager not initialized");
    }

    await this.provider.deleteBackup(backupId);
  }

  /**
   * Attempt recovery from the most recent backup
   */
  async attemptRecovery(): Promise<{
    episodicMemories: Episode[];
    semanticConcepts: Concept[];
    semanticRelations: Relation[];
    lastConsolidation: number;
  } | null> {
    if (!this.initialized || !this.config.recovery_enabled) {
      return null;
    }

    try {
      const backups = await this.listBackups();
      if (backups.length === 0) {
        return null;
      }

      // Try to restore from the most recent backup
      const mostRecentBackup = backups[0];
      return await this.restoreFromBackup(mostRecentBackup);
    } catch (error) {
      console.error("Recovery attempt failed:", error);
      return null;
    }
  }

  /**
   * Get persistence status
   */
  getStatus(): PersistenceStatus & { manager_initialized: boolean } {
    const providerStatus = this.provider.getStatus();
    return {
      ...providerStatus,
      manager_initialized: this.initialized,
    };
  }

  /**
   * Start automatic saving (for memory systems that support it)
   */
  startAutoSave(saveCallback: () => Promise<void>): void {
    if (!this.config.auto_save_enabled || this.autoSaveTimer) {
      return;
    }

    this.autoSaveTimer = setInterval(async () => {
      try {
        await saveCallback();
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, this.config.auto_save_interval_ms);
  }

  /**
   * Stop automatic saving
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
  }

  /**
   * Shutdown persistence manager
   */
  async shutdown(): Promise<void> {
    this.stopAutoSave();
    this.stopAutoBackup();
    await this.provider.cleanup();
    this.initialized = false;
  }

  /**
   * Switch to a different persistence provider
   */
  async switchProvider(
    newStorageType: "file" | "database" | "memory",
    newConfig?: Partial<PersistenceConfig>
  ): Promise<void> {
    // Save current state if possible
    let currentSnapshot: MemorySnapshot | null = null;
    try {
      currentSnapshot = await this.provider.load();
    } catch {
      // Ignore errors when switching providers
    }

    // Cleanup current provider
    await this.provider.cleanup();

    // Update config and create new provider
    this.config = {
      ...this.config,
      storage_type: newStorageType,
      ...newConfig,
    };
    this.provider = this.createProvider(newStorageType);

    // Initialize new provider
    await this.provider.initialize(this.config);

    // Restore data if available
    if (currentSnapshot) {
      try {
        await this.provider.save(currentSnapshot);
      } catch (error) {
        console.error("Failed to migrate data to new provider:", error);
      }
    }
  }

  // Private helper methods

  private createProvider(storageType: string): IPersistenceProvider {
    switch (storageType) {
      case "file":
        return new FilePersistenceProvider();
      case "database":
        return new DatabasePersistenceProvider();
      case "memory":
        return new MemoryPersistenceProvider();
      default:
        throw new Error(`Unsupported storage type: ${storageType}`);
    }
  }

  private startAutoBackup(): void {
    if (this.autoBackupTimer) {
      return;
    }

    this.autoBackupTimer = setInterval(async () => {
      try {
        const backupId = `auto_${Date.now()}`;
        await this.provider.backup(backupId);
      } catch (error) {
        console.error("Auto-backup failed:", error);
      }
    }, this.config.backup_interval_ms);
  }

  private stopAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = undefined;
    }
  }
}
