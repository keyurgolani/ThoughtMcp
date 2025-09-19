/**
 * Persistence Interfaces
 *
 * Defines interfaces for memory persistence and storage systems.
 */

import { Concept, Episode, Relation } from "../types/core.js";

export interface MemorySnapshot {
  timestamp: number;
  version: string;
  episodic_memories: Episode[];
  semantic_concepts: Concept[];
  semantic_relations: Relation[];
  metadata: {
    total_episodes: number;
    total_concepts: number;
    total_relations: number;
    last_consolidation: number;
  };
}

export interface PersistenceConfig {
  storage_type: "file" | "database" | "memory";
  file_path?: string;
  database_url?: string;
  backup_interval_ms: number;
  max_backups: number;
  compression_enabled: boolean;
  encryption_enabled: boolean;
}

export interface IPersistenceProvider {
  initialize(config: PersistenceConfig): Promise<void>;
  save(snapshot: MemorySnapshot): Promise<void>;
  load(): Promise<MemorySnapshot | null>;
  backup(backupId: string): Promise<void>;
  restore(backupId: string): Promise<MemorySnapshot>;
  listBackups(): Promise<string[]>;
  deleteBackup(backupId: string): Promise<void>;
  cleanup(): Promise<void>;
  getStatus(): PersistenceStatus;
}

export interface PersistenceStatus {
  provider_type: string;
  initialized: boolean;
  last_save: number;
  last_load: number;
  backup_count: number;
  storage_size_bytes: number;
  error_count: number;
}

export interface BackupMetadata {
  id: string;
  timestamp: number;
  size_bytes: number;
  episode_count: number;
  concept_count: number;
  relation_count: number;
  checksum: string;
}
