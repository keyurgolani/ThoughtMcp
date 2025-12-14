/**
 * Temporal Decay Engine
 *
 * Implements exponential decay with sector-specific rates and reinforcement mechanisms.
 * Provides batch processing with transactions and decay operation logging.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type { DatabaseConnectionManager } from "../database/connection-manager";
import { MemorySector } from "../embeddings/types";
import type { Memory } from "../memory/types";
import { SectorConfigManager } from "./sector-config";
import type { DecayMaintenanceResult, ReinforcementEvent, ReinforcementType } from "./types";

/**
 * Convert MemorySectorType string to MemorySector enum
 */
function toMemorySector(sectorType: string): MemorySector {
  switch (sectorType) {
    case "episodic":
      return MemorySector.Episodic;
    case "semantic":
      return MemorySector.Semantic;
    case "procedural":
      return MemorySector.Procedural;
    case "emotional":
      return MemorySector.Emotional;
    case "reflective":
      return MemorySector.Reflective;
    default:
      throw new Error(`Invalid sector type: ${sectorType}`);
  }
}

/**
 * TemporalDecayEngine class
 *
 * Manages memory decay using exponential decay formula with sector-specific rates.
 * Supports reinforcement, batch processing, and automated maintenance.
 */
export class TemporalDecayEngine {
  private configManager: SectorConfigManager;
  private db: DatabaseConnectionManager;

  /**
   * Create a new TemporalDecayEngine
   * @param configManager - Sector configuration manager
   * @param db - Database connection manager
   */
  constructor(configManager: SectorConfigManager, db: DatabaseConnectionManager) {
    this.configManager = configManager;
    this.db = db;
  }

  /**
   * Log a reinforcement event to history
   * @param memoryId - ID of memory being reinforced
   * @param type - Type of reinforcement
   * @param boost - Boost applied
   * @param strengthBefore - Strength before reinforcement
   * @param strengthAfter - Strength after reinforcement
   * @private
   */
  private async logReinforcementEvent(
    memoryId: string,
    type: ReinforcementType,
    boost: number,
    strengthBefore: number,
    strengthAfter: number
  ): Promise<void> {
    const client = await this.db.getConnection();
    try {
      await client.query(
        `INSERT INTO memory_reinforcement_history
         (memory_id, timestamp, type, boost, strength_before, strength_after)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [memoryId, new Date(), type, boost, strengthBefore, strengthAfter]
      );
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Calculate diminished boost based on recent reinforcement
   * @param memoryId - ID of memory to check
   * @param defaultBoost - Default boost value
   * @returns Adjusted boost value
   * @private
   */
  private async calculateDiminishedBoost(memoryId: string, defaultBoost: number): Promise<number> {
    const client = await this.db.getConnection();
    try {
      // Get most recent reinforcement event
      const result = await client.query(
        `SELECT timestamp FROM memory_reinforcement_history
         WHERE memory_id = $1
         ORDER BY timestamp DESC
         LIMIT 1`,
        [memoryId]
      );

      if (result.rows.length === 0) {
        // No previous reinforcement, apply full boost
        return defaultBoost;
      }

      const lastReinforcement = new Date(result.rows[0].timestamp);
      const timeSinceLastMs = Date.now() - lastReinforcement.getTime();
      const hoursSinceLastMs = 60 * 60 * 1000; // 1 hour in milliseconds

      if (timeSinceLastMs < hoursSinceLastMs) {
        // Recent reinforcement, apply 50% boost
        return defaultBoost * 0.5;
      }

      // Sufficient time has passed, apply full boost
      return defaultBoost;
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Calculate decayed strength for a memory
   * @param memory - Memory to calculate decay for
   * @param currentTime - Current time for age calculation
   * @returns New strength value after decay
   */
  calculateDecayedStrength(memory: Memory, currentTime: Date): number {
    // Calculate age in days from lastAccessed
    const ageMs = currentTime.getTime() - memory.lastAccessed.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    // Handle negative time (future lastAccessed) - treat as 0
    if (ageDays < 0) {
      return memory.strength;
    }

    // Get effective decay rate for this memory's sector
    const sector = toMemorySector(memory.primarySector);
    const lambda = this.configManager.getEffectiveDecayRate(sector);

    // Apply exponential decay formula: strength = initial × exp(-λ × time)
    const rawStrength = memory.strength * Math.exp(-lambda * ageDays);

    // Enforce minimum strength floor
    const config = this.configManager.getConfig();
    const finalStrength = Math.max(rawStrength, config.minimumStrength);

    return finalStrength;
  }

  /**
   * Apply decay to a single memory
   * @param memory - Memory to apply decay to
   */
  async applyDecay(memory: Memory): Promise<void> {
    const currentTime = new Date();
    const newStrength = this.calculateDecayedStrength(memory, currentTime);

    // Update memory in database
    const client = await this.db.getConnection();
    try {
      await client.query(
        `UPDATE memories
         SET strength = $1, last_accessed = $2
         WHERE id = $3`,
        [newStrength, currentTime, memory.id]
      );
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Apply decay to multiple memories in batch with transaction
   * @param memories - Array of memories to apply decay to
   */
  async batchApplyDecay(memories: Memory[]): Promise<void> {
    if (memories.length === 0) {
      return;
    }

    const currentTime = new Date();
    const client = await this.db.beginTransaction();

    try {
      // Calculate new strengths for all memories
      const updates = memories.map((memory) => ({
        id: memory.id,
        newStrength: this.calculateDecayedStrength(memory, currentTime),
      }));

      // Batch update all memories
      for (const update of updates) {
        await client.query(
          `UPDATE memories
           SET strength = $1, last_accessed = $2
           WHERE id = $3`,
          [update.newStrength, currentTime, update.id]
        );
      }

      await this.db.commitTransaction(client);
    } catch (error) {
      await this.db.rollbackTransaction(client);
      throw error;
    }
  }

  /**
   * Reinforce a memory by boosting its strength
   * @param memoryId - ID of memory to reinforce
   * @param boost - Strength boost to apply (capped at 1.0)
   */
  async reinforceMemory(memoryId: string, boost: number): Promise<void> {
    const client = await this.db.getConnection();
    try {
      // Get current memory
      const result = await client.query(`SELECT strength FROM memories WHERE id = $1`, [memoryId]);

      if (result.rows.length === 0) {
        throw new Error(`Memory not found: ${memoryId}`);
      }

      const currentStrength = result.rows[0].strength as number;
      const newStrength = Math.min(currentStrength + boost, 1.0);

      // Update memory with reinforced strength
      await client.query(`UPDATE memories SET strength = $1 WHERE id = $2`, [
        newStrength,
        memoryId,
      ]);

      // Log reinforcement event
      await this.logReinforcementEvent(memoryId, "explicit", boost, currentStrength, newStrength);
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Automatically reinforce memory on access with default boost
   * @param memoryId - ID of memory to reinforce
   */
  async autoReinforceOnAccess(memoryId: string): Promise<void> {
    const config = this.configManager.getConfig();
    const defaultBoost = config.reinforcementBoost;

    // Calculate diminished boost based on recent reinforcement
    const boost = await this.calculateDiminishedBoost(memoryId, defaultBoost);

    const client = await this.db.getConnection();
    try {
      // Get current memory
      const result = await client.query(`SELECT strength FROM memories WHERE id = $1`, [memoryId]);

      if (result.rows.length === 0) {
        throw new Error(`Memory not found: ${memoryId}`);
      }

      const currentStrength = result.rows[0].strength as number;
      const newStrength = Math.min(currentStrength + boost, 1.0);
      const currentTime = new Date();

      // Update memory with reinforced strength and lastAccessed
      await client.query(
        `UPDATE memories
         SET strength = $1, last_accessed = $2, access_count = access_count + 1
         WHERE id = $3`,
        [newStrength, currentTime, memoryId]
      );

      // Log reinforcement event
      await this.logReinforcementEvent(memoryId, "access", boost, currentStrength, newStrength);
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Get reinforcement history for a memory
   * @param memoryId - ID of memory to get history for
   * @returns Array of reinforcement events
   */
  async getReinforcementHistory(memoryId: string): Promise<ReinforcementEvent[]> {
    const client = await this.db.getConnection();
    try {
      const result = await client.query(
        `SELECT timestamp, type, boost, strength_before, strength_after
         FROM memory_reinforcement_history
         WHERE memory_id = $1
         ORDER BY timestamp DESC`,
        [memoryId]
      );

      return result.rows.map((row) => ({
        timestamp: new Date(row.timestamp),
        type: row.type as ReinforcementType,
        boost: row.boost as number,
        strengthBefore: row.strength_before as number,
        strengthAfter: row.strength_after as number,
      }));
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Reinforce memory by type with appropriate boost calculation
   * @param memoryId - ID of memory to reinforce
   * @param type - Type of reinforcement ('access', 'explicit', 'importance')
   * @param boost - Custom boost for 'explicit' type (required for explicit, ignored for others)
   */
  async reinforceMemoryByType(
    memoryId: string,
    type: ReinforcementType,
    boost?: number
  ): Promise<void> {
    // Validate reinforcement type
    if (!["access", "explicit", "importance"].includes(type)) {
      throw new Error(`Invalid reinforcement type: ${type}`);
    }

    const client = await this.db.getConnection();
    try {
      // Get current memory and metadata
      const memoryResult = await client.query(
        `SELECT m.strength, mm.importance
         FROM memories m
         LEFT JOIN memory_metadata mm ON m.id = mm.memory_id
         WHERE m.id = $1`,
        [memoryId]
      );

      if (memoryResult.rows.length === 0) {
        throw new Error(`Memory not found: ${memoryId}`);
      }

      const currentStrength = memoryResult.rows[0].strength as number;
      let calculatedBoost: number;

      // Calculate boost based on type
      switch (type) {
        case "access": {
          // Use default boost with diminishing returns
          const config = this.configManager.getConfig();
          calculatedBoost = await this.calculateDiminishedBoost(
            memoryId,
            config.reinforcementBoost
          );
          break;
        }

        case "explicit": {
          // Use provided boost
          if (boost === undefined) {
            throw new Error("Boost parameter required for explicit reinforcement");
          }
          calculatedBoost = boost;
          break;
        }

        case "importance": {
          // Calculate boost based on memory importance
          const importance = (memoryResult.rows[0].importance as number) ?? 0.5;
          calculatedBoost = importance * 0.5; // Max boost of 0.5 for importance=1.0
          break;
        }

        default:
          throw new Error(`Invalid reinforcement type: ${type}`);
      }

      const newStrength = Math.min(currentStrength + calculatedBoost, 1.0);

      // Update memory strength
      await client.query(`UPDATE memories SET strength = $1 WHERE id = $2`, [
        newStrength,
        memoryId,
      ]);

      // Log reinforcement event
      await this.logReinforcementEvent(
        memoryId,
        type,
        calculatedBoost,
        currentStrength,
        newStrength
      );

      // Update last_accessed and access_count for access type
      if (type === "access") {
        await client.query(
          `UPDATE memories
           SET last_accessed = $1, access_count = access_count + 1
           WHERE id = $2`,
          [new Date(), memoryId]
        );
      }
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Schedule decay job with cron expression
   * @param cronExpression - Cron expression for scheduling (e.g., "0 2 * * *" for daily at 2 AM)
   */
  scheduleDecayJob(cronExpression: string): void {
    // Stub implementation - would integrate with cron library in production
    // For now, just validate the cron expression format
    if (!cronExpression || typeof cronExpression !== "string") {
      throw new Error("Invalid cron expression");
    }
    // In production, this would set up a cron job to call runDecayMaintenance()
  }

  /**
   * Run decay maintenance on all memories
   * @returns Statistics about the maintenance operation
   */
  async runDecayMaintenance(): Promise<DecayMaintenanceResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processedCount = 0;
    let prunedCount = 0;

    try {
      // Get all memories from database
      const client = await this.db.getConnection();
      let allMemories: Memory[];

      try {
        const result = await client.query(`
          SELECT id, content, created_at, last_accessed, access_count,
                 salience, decay_rate, strength, user_id, session_id, primary_sector
          FROM memories
        `);

        allMemories = result.rows.map((row) => ({
          id: row.id,
          content: row.content,
          createdAt: new Date(row.created_at),
          lastAccessed: new Date(row.last_accessed),
          accessCount: row.access_count,
          salience: row.salience,
          decayRate: row.decay_rate,
          strength: row.strength,
          userId: row.user_id,
          sessionId: row.session_id,
          primarySector: row.primary_sector,
          metadata: {},
        }));
      } finally {
        this.db.releaseConnection(client);
      }

      // Process in batches of 1000
      const batchSize = 1000;
      for (let i = 0; i < allMemories.length; i += batchSize) {
        const batch = allMemories.slice(i, i + batchSize);

        try {
          await this.batchApplyDecay(batch);
          processedCount += batch.length;
        } catch (error) {
          errors.push(`Batch ${i / batchSize + 1} failed: ${(error as Error).message}`);
        }
      }

      // Identify and prune weak memories
      const config = this.configManager.getConfig();
      const pruningCandidates = await this.identifyPruningCandidates(config.pruningThreshold);

      if (pruningCandidates.length > 0) {
        prunedCount = await this.pruneMemories(pruningCandidates);
      }
    } catch (error) {
      errors.push(`Maintenance failed: ${(error as Error).message}`);
    }

    const processingTime = Date.now() - startTime;

    return {
      processedCount,
      prunedCount,
      processingTime,
      errors,
    };
  }

  /**
   * Identify memories that are candidates for pruning
   * @param threshold - Strength threshold for pruning
   * @returns Array of memory IDs that are pruning candidates
   */
  async identifyPruningCandidates(threshold: number): Promise<string[]> {
    const client = await this.db.getConnection();
    try {
      // Query for memories with strength < threshold and importance < 0.3
      const result = await client.query(
        `SELECT m.id
         FROM memories m
         LEFT JOIN memory_metadata mm ON m.id = mm.memory_id
         WHERE m.strength < $1
         AND (mm.importance IS NULL OR mm.importance < 0.3)`,
        [threshold]
      );

      return result.rows.map((row) => row.id as string);
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Prune (delete) memories by IDs
   * @param memoryIds - Array of memory IDs to delete
   * @returns Number of memories deleted
   */
  async pruneMemories(memoryIds: string[]): Promise<number> {
    if (memoryIds.length === 0) {
      return 0;
    }

    const client = await this.db.beginTransaction();
    try {
      // Delete memories (cascade will handle embeddings, links, metadata)
      const result = await client.query(`DELETE FROM memories WHERE id = ANY($1::text[])`, [
        memoryIds,
      ]);

      await this.db.commitTransaction(client);
      return result.rowCount ?? 0;
    } catch (error) {
      await this.db.rollbackTransaction(client);
      throw error;
    }
  }
}
