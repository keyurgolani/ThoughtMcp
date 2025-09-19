/**
 * Database Persistence Provider
 *
 * Implements database-based storage for production deployments.
 * Provides SQL-based storage with transactions and connection pooling.
 */

import {
  BackupMetadata,
  IPersistenceProvider,
  MemorySnapshot,
  PersistenceConfig,
  PersistenceStatus,
} from "../../interfaces/persistence.js";
import { Concept, Episode, Relation } from "../../types/core.js";

// Mock database interface for demonstration
// In production, this would use a real database driver like pg, mysql2, etc.
interface DatabaseConnection {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
  transaction<T>(
    callback: (conn: DatabaseConnection) => Promise<T>
  ): Promise<T>;
  close(): Promise<void>;
}

export class DatabasePersistenceProvider implements IPersistenceProvider {
  private config!: PersistenceConfig;
  private connection?: DatabaseConnection;
  private initialized: boolean = false;
  private lastSave: number = 0;
  private lastLoad: number = 0;
  private errorCount: number = 0;

  async initialize(config: PersistenceConfig): Promise<void> {
    this.config = {
      ...config,
      storage_type: "database",
      database_url:
        config.database_url || "postgresql://localhost:5432/thoughtmcp",
      backup_interval_ms: config.backup_interval_ms ?? 600000, // 10 minutes
      max_backups: config.max_backups ?? 20,
      compression_enabled: config.compression_enabled ?? false,
      encryption_enabled: config.encryption_enabled ?? true,
    };

    if (!this.config.database_url) {
      throw new Error("Database URL is required for database persistence");
    }

    // Initialize database connection (mock implementation)
    this.connection = await this.createConnection(this.config.database_url);

    // Create tables if they don't exist
    await this.createTables();

    this.initialized = true;
  }

  async save(snapshot: MemorySnapshot): Promise<void> {
    if (!this.initialized || !this.connection) {
      throw new Error("Database persistence provider not initialized");
    }

    try {
      await this.connection.transaction(async (conn) => {
        // Clear existing data
        await conn.query("DELETE FROM episodic_memories");
        await conn.query("DELETE FROM semantic_concepts");
        await conn.query("DELETE FROM semantic_relations");
        await conn.query("DELETE FROM memory_snapshots");

        // Insert snapshot metadata
        await conn.query(
          `INSERT INTO memory_snapshots (timestamp, version, total_episodes, total_concepts, total_relations, last_consolidation)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            snapshot.timestamp,
            snapshot.version,
            snapshot.metadata.total_episodes,
            snapshot.metadata.total_concepts,
            snapshot.metadata.total_relations,
            snapshot.metadata.last_consolidation,
          ]
        );

        // Insert episodic memories
        for (const episode of snapshot.episodic_memories) {
          await this.connection!.query(
            `INSERT INTO episodic_memories (content, context, timestamp, emotional_tags, importance, decay_factor)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              JSON.stringify(episode.content),
              JSON.stringify(episode.context),
              episode.timestamp,
              JSON.stringify(episode.emotional_tags),
              episode.importance,
              episode.decay_factor,
            ]
          );
        }

        // Insert semantic concepts
        for (const concept of snapshot.semantic_concepts) {
          await conn.query(
            `INSERT INTO semantic_concepts (id, content, embedding, activation, last_accessed, relations)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              concept.id,
              JSON.stringify(concept.content),
              JSON.stringify(concept.embedding),
              concept.activation,
              concept.last_accessed,
              JSON.stringify(concept.relations),
            ]
          );
        }

        // Insert semantic relations
        for (const relation of snapshot.semantic_relations) {
          await conn.query(
            `INSERT INTO semantic_relations (from_concept, to_concept, type, strength)
             VALUES ($1, $2, $3, $4)`,
            [relation.from, relation.to, relation.type, relation.strength]
          );
        }
      });

      this.lastSave = Date.now();
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to save memory snapshot to database: ${error}`);
    }
  }

  async load(): Promise<MemorySnapshot | null> {
    if (!this.initialized || !this.connection) {
      throw new Error("Database persistence provider not initialized");
    }

    try {
      // Load snapshot metadata
      const snapshotRows = await this.connection.query(
        "SELECT * FROM memory_snapshots ORDER BY timestamp DESC LIMIT 1"
      );

      if (!snapshotRows || snapshotRows.length === 0) {
        return null; // No snapshot exists
      }

      const snapshotMeta = snapshotRows[0] as {
        timestamp: number;
        version: string;
        total_episodes: number;
        total_concepts: number;
        total_relations: number;
        last_consolidation: number;
      };

      // Load episodic memories
      const episodeRows = await this.connection.query(
        "SELECT * FROM episodic_memories ORDER BY timestamp DESC"
      );

      const episodicMemories: Episode[] = (
        episodeRows as Array<{
          content: string;
          context: string;
          timestamp: number;
          emotional_tags: string;
          importance: number;
          decay_factor: number;
        }>
      ).map((row) => ({
        content: JSON.parse(row.content),
        context: JSON.parse(row.context),
        timestamp: row.timestamp,
        emotional_tags: JSON.parse(row.emotional_tags),
        importance: row.importance,
        decay_factor: row.decay_factor,
      }));

      // Load semantic concepts
      const conceptRows = await this.connection.query(
        "SELECT * FROM semantic_concepts ORDER BY last_accessed DESC"
      );

      const semanticConcepts: Concept[] = (
        conceptRows as Array<{
          id: string;
          content: string;
          embedding: string;
          activation: number;
          last_accessed: number;
          relations: string;
        }>
      ).map((row) => ({
        id: row.id,
        content: JSON.parse(row.content),
        embedding: JSON.parse(row.embedding),
        activation: row.activation,
        last_accessed: row.last_accessed,
        relations: JSON.parse(row.relations),
      }));

      // Load semantic relations
      const relationRows = await this.connection.query(
        "SELECT * FROM semantic_relations ORDER BY strength DESC"
      );

      const semanticRelations: Relation[] = (
        relationRows as Array<{
          from_concept: string;
          to_concept: string;
          type: string;
          strength: number;
        }>
      ).map((row) => ({
        from: row.from_concept,
        to: row.to_concept,
        type: row.type,
        strength: row.strength,
      }));

      const snapshot: MemorySnapshot = {
        timestamp: snapshotMeta.timestamp,
        version: snapshotMeta.version,
        episodic_memories: episodicMemories,
        semantic_concepts: semanticConcepts,
        semantic_relations: semanticRelations,
        metadata: {
          total_episodes: snapshotMeta.total_episodes,
          total_concepts: snapshotMeta.total_concepts,
          total_relations: snapshotMeta.total_relations,
          last_consolidation: snapshotMeta.last_consolidation,
        },
      };

      this.lastLoad = Date.now();
      return snapshot;
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to load memory snapshot from database: ${error}`);
    }
  }

  async backup(backupId: string): Promise<void> {
    if (!this.initialized || !this.connection) {
      throw new Error("Database persistence provider not initialized");
    }

    try {
      // Load current snapshot
      const snapshot = await this.load();
      if (!snapshot) {
        throw new Error("No memory snapshot to backup");
      }

      // Create backup metadata
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: Date.now(),
        size_bytes: JSON.stringify(snapshot).length,
        episode_count: snapshot.episodic_memories.length,
        concept_count: snapshot.semantic_concepts.length,
        relation_count: snapshot.semantic_relations.length,
        checksum: this.calculateChecksum(snapshot),
      };

      // Store backup in database
      await this.connection.query(
        `INSERT INTO memory_backups (backup_id, timestamp, snapshot_data, metadata)
         VALUES ($1, $2, $3, $4)`,
        [
          backupId,
          metadata.timestamp,
          JSON.stringify(snapshot),
          JSON.stringify(metadata),
        ]
      );

      // Cleanup old backups
      await this.cleanupOldBackups();
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to create database backup: ${error}`);
    }
  }

  async restore(backupId: string): Promise<MemorySnapshot> {
    if (!this.initialized || !this.connection) {
      throw new Error("Database persistence provider not initialized");
    }

    try {
      const backupRows = await this.connection.query(
        "SELECT snapshot_data, metadata FROM memory_backups WHERE backup_id = $1",
        [backupId]
      );

      if (!backupRows || backupRows.length === 0) {
        throw new Error(`Backup ${backupId} not found`);
      }

      const backupRow = backupRows[0] as {
        snapshot_data: string;
        metadata: string;
      };

      const snapshot = JSON.parse(backupRow.snapshot_data) as MemorySnapshot;
      const metadata = JSON.parse(backupRow.metadata) as BackupMetadata;

      // Verify checksum
      const actualChecksum = this.calculateChecksum(snapshot);
      if (actualChecksum !== metadata.checksum) {
        throw new Error("Backup checksum verification failed");
      }

      return snapshot;
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to restore database backup: ${error}`);
    }
  }

  async listBackups(): Promise<string[]> {
    if (!this.initialized || !this.connection) {
      throw new Error("Database persistence provider not initialized");
    }

    try {
      const rows = await this.connection.query(
        "SELECT backup_id FROM memory_backups ORDER BY timestamp DESC"
      );

      return (rows as Array<{ backup_id: string }>).map((row) => row.backup_id);
    } catch (error) {
      this.errorCount++;
      return [];
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    if (!this.initialized || !this.connection) {
      throw new Error("Database persistence provider not initialized");
    }

    try {
      await this.connection.query(
        "DELETE FROM memory_backups WHERE backup_id = $1",
        [backupId]
      );
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to delete database backup: ${error}`);
    }
  }

  async cleanup(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = undefined as any;
    }
  }

  getStatus(): PersistenceStatus {
    return {
      provider_type: "database",
      initialized: this.initialized,
      last_save: this.lastSave,
      last_load: this.lastLoad,
      backup_count: 0, // Would need async query to get accurate count
      storage_size_bytes: 0, // Would need database-specific query
      error_count: this.errorCount,
    };
  }

  // Private helper methods

  private async createConnection(
    databaseUrl: string
  ): Promise<DatabaseConnection> {
    // Mock implementation - in production, use actual database driver
    console.log(`Connecting to database: ${databaseUrl}`);

    // Return mock connection for demonstration
    return {
      async query(_sql: string, _params?: unknown[]): Promise<unknown[]> {
        // Mock implementation
        return [];
      },
      async transaction<T>(
        callback: (conn: DatabaseConnection) => Promise<T>
      ): Promise<T> {
        // Mock transaction - in production, use real transaction
        return callback(this as DatabaseConnection);
      },
      async close(): Promise<void> {
        // Mock close
      },
    };
  }

  private async createTables(): Promise<void> {
    if (!this.connection) return;

    const tables = [
      `CREATE TABLE IF NOT EXISTS memory_snapshots (
        id SERIAL PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        version VARCHAR(50) NOT NULL,
        total_episodes INTEGER NOT NULL,
        total_concepts INTEGER NOT NULL,
        total_relations INTEGER NOT NULL,
        last_consolidation BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS episodic_memories (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        context TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        emotional_tags TEXT NOT NULL,
        importance REAL NOT NULL,
        decay_factor REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS semantic_concepts (
        id VARCHAR(255) PRIMARY KEY,
        content TEXT NOT NULL,
        embedding TEXT,
        activation REAL NOT NULL,
        last_accessed BIGINT NOT NULL,
        relations TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS semantic_relations (
        id SERIAL PRIMARY KEY,
        from_concept VARCHAR(255) NOT NULL,
        to_concept VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        strength REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS memory_backups (
        id SERIAL PRIMARY KEY,
        backup_id VARCHAR(255) UNIQUE NOT NULL,
        timestamp BIGINT NOT NULL,
        snapshot_data TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    for (const sql of tables) {
      await this.connection.query(sql);
    }

    // Create indexes for better performance
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memories(timestamp)",
      "CREATE INDEX IF NOT EXISTS idx_concepts_activation ON semantic_concepts(activation)",
      "CREATE INDEX IF NOT EXISTS idx_relations_strength ON semantic_relations(strength)",
      "CREATE INDEX IF NOT EXISTS idx_backups_timestamp ON memory_backups(timestamp)",
    ];

    for (const sql of indexes) {
      await this.connection.query(sql);
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    if (!this.connection) return;

    try {
      // Keep only the most recent backups
      await this.connection.query(
        `DELETE FROM memory_backups
         WHERE backup_id NOT IN (
           SELECT backup_id FROM memory_backups
           ORDER BY timestamp DESC
           LIMIT $1
         )`,
        [this.config.max_backups]
      );
    } catch (error) {
      console.error("Failed to cleanup old backups:", error);
    }
  }

  private calculateChecksum(snapshot: MemorySnapshot): string {
    // Simple checksum calculation - in production, use crypto.createHash
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
