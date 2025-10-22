/**
 * Gradual Degradation Manager
 *
 * Manages the gradual degradation of memories through configurable stages,
 * preserving recovery metadata and providing scheduling capabilities.
 */

import {
  AssociationFingerprint,
  DegradationProcess,
  DegradationRecord,
  DegradationStage,
  DegradationStatus,
  IGradualDegradationManager,
  MetadataPreservationLevel,
  RecoveryCue,
  RecoveryMetadata,
  RecoveryResult,
} from "../../interfaces/forgetting.js";
import { Concept, Episode } from "../../types/core.js";

export interface GradualDegradationManagerConfig {
  default_stages: DegradationStage[];
  auto_execution_enabled: boolean;
  execution_interval_ms: number;
  max_concurrent_processes: number;
  recovery_metadata_retention_days: number;
  enable_degradation_logging: boolean;
}

export class GradualDegradationManager implements IGradualDegradationManager {
  private config: GradualDegradationManagerConfig;
  private activeProcesses: Map<string, DegradationProcess> = new Map();
  private recoveryMetadataStore: Map<string, RecoveryMetadata> = new Map();
  private executionTimer?: NodeJS.Timeout;
  private processCounter: number = 0;

  constructor(config?: Partial<GradualDegradationManagerConfig>) {
    this.config = {
      default_stages: this.createDefaultDegradationStages(),
      auto_execution_enabled: true,
      execution_interval_ms: 60000, // 1 minute
      max_concurrent_processes: 10,
      recovery_metadata_retention_days: 90,
      enable_degradation_logging: true,
      ...config,
    };

    if (this.config.auto_execution_enabled) {
      this.scheduleAutomaticExecution();
    }
  }

  private createDefaultDegradationStages(): DegradationStage[] {
    return [
      {
        stage_id: "initial_fade",
        name: "Initial Fade",
        description: "Slight reduction in memory clarity and accessibility",
        degradation_factor: 0.1,
        duration_ms: 24 * 60 * 60 * 1000, // 24 hours
        reversible: true,
        metadata_preservation: MetadataPreservationLevel.FULL,
      },
      {
        stage_id: "moderate_decay",
        name: "Moderate Decay",
        description: "Noticeable reduction in memory detail and confidence",
        degradation_factor: 0.3,
        duration_ms: 7 * 24 * 60 * 60 * 1000, // 7 days
        reversible: true,
        metadata_preservation: MetadataPreservationLevel.PARTIAL,
      },
      {
        stage_id: "significant_loss",
        name: "Significant Loss",
        description: "Major reduction in memory content and associations",
        degradation_factor: 0.6,
        duration_ms: 30 * 24 * 60 * 60 * 1000, // 30 days
        reversible: true,
        metadata_preservation: MetadataPreservationLevel.MINIMAL,
      },
      {
        stage_id: "near_complete",
        name: "Near Complete Degradation",
        description: "Memory reduced to basic traces and recovery metadata",
        degradation_factor: 0.9,
        duration_ms: 90 * 24 * 60 * 60 * 1000, // 90 days
        reversible: false,
        metadata_preservation: MetadataPreservationLevel.MINIMAL,
      },
    ];
  }

  async initiateDegradation(
    memory: Episode | Concept,
    target_degradation_level: number,
    stages?: DegradationStage[]
  ): Promise<DegradationProcess> {
    // Validate inputs
    if (target_degradation_level < 0 || target_degradation_level > 1) {
      throw new Error("Target degradation level must be between 0 and 1");
    }

    if (this.activeProcesses.size >= this.config.max_concurrent_processes) {
      throw new Error("Maximum concurrent degradation processes reached");
    }

    // Generate unique process ID
    const processId = this.generateProcessId();
    const memoryId = this.getMemoryId(memory);

    // Use provided stages or default stages
    const degradationStages = stages || this.config.default_stages;

    // Filter stages to reach target degradation level
    const filteredStages = this.filterStagesToTarget(
      degradationStages,
      target_degradation_level
    );

    // Preserve recovery metadata before starting degradation
    // Pass the memoryId to ensure consistency
    const recoveryMetadata = await this.preserveRecoveryMetadata(
      memory,
      target_degradation_level,
      memoryId
    );

    // Create initial degradation status
    const status: DegradationStatus = {
      memory_id: memoryId,
      current_stage: filteredStages[0]?.stage_id || "none",
      degradation_level: 0,
      stages_completed: [],
      next_stage: filteredStages[0]?.stage_id,
      next_stage_scheduled_time:
        Date.now() + (filteredStages[0]?.duration_ms || 0),
      is_paused: false,
      is_reversible: true,
      recovery_metadata: recoveryMetadata,
    };

    // Create degradation process
    const process: DegradationProcess = {
      process_id: processId,
      memory_id: memoryId,
      target_degradation_level,
      stages: filteredStages,
      current_stage_index: 0,
      status,
      created_timestamp: Date.now(),
      last_updated_timestamp: Date.now(),
    };

    // Store the process
    this.activeProcesses.set(processId, process);

    // Log the initiation
    if (this.config.enable_degradation_logging) {
      console.error(
        `Initiated gradual degradation for memory ${memoryId} with ${filteredStages.length} stages`
      );
    }

    return process;
  }

  async executeNextStage(process_id: string): Promise<DegradationStatus> {
    const process = this.activeProcesses.get(process_id);
    if (!process) {
      throw new Error(`Degradation process ${process_id} not found`);
    }

    if (process.status.is_paused) {
      throw new Error(`Degradation process ${process_id} is paused`);
    }

    // Check if there are more stages to execute
    if (process.current_stage_index >= process.stages.length) {
      throw new Error(
        `All degradation stages completed for process ${process_id}`
      );
    }

    const currentStage = process.stages[process.current_stage_index];

    // Apply degradation for this stage
    await this.applyDegradationStage(process.memory_id, currentStage);

    // Update process status
    process.status.stages_completed.push(currentStage.stage_id);
    process.status.degradation_level = Math.min(
      process.status.degradation_level + currentStage.degradation_factor,
      process.target_degradation_level
    );

    // Move to next stage
    process.current_stage_index++;
    const nextStage = process.stages[process.current_stage_index];

    if (nextStage) {
      process.status.current_stage = nextStage.stage_id;
      process.status.next_stage = nextStage.stage_id;
      process.status.next_stage_scheduled_time =
        Date.now() + nextStage.duration_ms;
    } else {
      // All stages completed
      process.status.current_stage = "completed";
      process.status.next_stage = undefined;
      process.status.next_stage_scheduled_time = undefined;
    }

    // Update reversibility based on completed stages
    process.status.is_reversible = process.status.stages_completed.every(
      (stageId) => {
        const stage = process.stages.find((s) => s.stage_id === stageId);
        return stage?.reversible || false;
      }
    );

    process.last_updated_timestamp = Date.now();

    // Log the stage execution
    if (this.config.enable_degradation_logging) {
      console.error(
        `Executed degradation stage ${currentStage.stage_id} for memory ${process.memory_id}. ` +
          `Degradation level: ${process.status.degradation_level.toFixed(2)}`
      );
    }

    return process.status;
  }

  async pauseDegradation(process_id: string): Promise<void> {
    const process = this.activeProcesses.get(process_id);
    if (!process) {
      throw new Error(`Degradation process ${process_id} not found`);
    }

    process.status.is_paused = true;
    process.last_updated_timestamp = Date.now();

    if (this.config.enable_degradation_logging) {
      console.error(`Paused degradation process ${process_id}`);
    }
  }

  async resumeDegradation(process_id: string): Promise<void> {
    const process = this.activeProcesses.get(process_id);
    if (!process) {
      throw new Error(`Degradation process ${process_id} not found`);
    }

    process.status.is_paused = false;
    process.last_updated_timestamp = Date.now();

    // Reschedule next stage if needed
    if (process.status.next_stage && process.status.next_stage_scheduled_time) {
      const nextStage = process.stages[process.current_stage_index];
      if (nextStage) {
        process.status.next_stage_scheduled_time =
          Date.now() + nextStage.duration_ms;
      }
    }

    if (this.config.enable_degradation_logging) {
      console.error(`Resumed degradation process ${process_id}`);
    }
  }

  async cancelDegradation(process_id: string): Promise<RecoveryResult> {
    const process = this.activeProcesses.get(process_id);
    if (!process) {
      throw new Error(`Degradation process ${process_id} not found`);
    }

    // Attempt to recover the memory using recovery metadata
    const recoveryResult = await this.attemptRecovery(
      process.memory_id,
      process.status.recovery_metadata!
    );

    // Remove the process from active processes
    this.activeProcesses.delete(process_id);

    if (this.config.enable_degradation_logging) {
      console.error(
        `Cancelled degradation process ${process_id}. Recovery success: ${recoveryResult.success}`
      );
    }

    return recoveryResult;
  }

  async getDegradationStatus(process_id: string): Promise<DegradationStatus> {
    const process = this.activeProcesses.get(process_id);
    if (!process) {
      throw new Error(`Degradation process ${process_id} not found`);
    }

    return { ...process.status }; // Return a copy
  }

  async getActiveDegradationProcesses(): Promise<DegradationProcess[]> {
    return Array.from(this.activeProcesses.values()).map((process) => ({
      ...process,
      status: { ...process.status },
    }));
  }

  async scheduleAutomaticExecution(): Promise<void> {
    if (this.executionTimer) {
      clearInterval(this.executionTimer);
    }

    this.executionTimer = setInterval(async () => {
      await this.executeScheduledStages();
    }, this.config.execution_interval_ms);

    if (this.config.enable_degradation_logging) {
      console.error(
        `Scheduled automatic degradation execution every ${this.config.execution_interval_ms}ms`
      );
    }
  }

  async preserveRecoveryMetadata(
    memory: Episode | Concept,
    degradation_level: number,
    memoryId?: string
  ): Promise<RecoveryMetadata> {
    const finalMemoryId = memoryId || this.getMemoryId(memory);
    const contentHash = this.generateContentHash(memory);

    // Extract recovery cues
    const recoveryCues = this.extractRecoveryCues(memory);

    // Create association fingerprint
    const associationFingerprint = this.createAssociationFingerprint(memory);

    // Generate content summary
    const contentSummary = this.generateContentSummary(memory);

    // Estimate recovery difficulty
    const recoveryDifficulty = this.estimateRecoveryDifficulty(
      memory,
      degradation_level
    );

    const recoveryMetadata: RecoveryMetadata = {
      original_memory_id: finalMemoryId,
      original_content_hash: contentHash,
      original_importance: this.getMemoryImportance(memory),
      original_timestamp: this.getMemoryTimestamp(memory),
      degradation_history: [],
      recovery_cues: recoveryCues,
      association_fingerprint: associationFingerprint,
      content_summary: contentSummary,
      recovery_difficulty_estimate: recoveryDifficulty,
      preservation_timestamp: Date.now(),
    };

    // Store recovery metadata
    this.recoveryMetadataStore.set(memoryId, recoveryMetadata);

    return recoveryMetadata;
  }

  // Private helper methods

  private async executeScheduledStages(): Promise<void> {
    const currentTime = Date.now();

    for (const process of this.activeProcesses.values()) {
      if (
        !process.status.is_paused &&
        process.status.next_stage_scheduled_time &&
        currentTime >= process.status.next_stage_scheduled_time
      ) {
        try {
          await this.executeNextStage(process.process_id);
        } catch (error) {
          console.error(
            `Error executing scheduled degradation stage for process ${process.process_id}:`,
            error
          );
        }
      }
    }
  }

  private async applyDegradationStage(
    memoryId: string,
    stage: DegradationStage
  ): Promise<DegradationRecord> {
    // In a real implementation, this would modify the actual memory content
    // For now, we'll create a record of the degradation applied

    const contentBeforeHash = `hash_before_${memoryId}_${Date.now()}`;
    const contentAfterHash = `hash_after_${memoryId}_${Date.now()}`;

    const degradationRecord: DegradationRecord = {
      stage_id: stage.stage_id,
      applied_timestamp: Date.now(),
      degradation_factor: stage.degradation_factor,
      content_before_hash: contentBeforeHash,
      content_after_hash: contentAfterHash,
      metadata_preserved: stage.metadata_preservation,
      reversible: stage.reversible,
    };

    // Update recovery metadata with this degradation record
    const recoveryMetadata = this.recoveryMetadataStore.get(memoryId);
    if (recoveryMetadata) {
      recoveryMetadata.degradation_history.push(degradationRecord);
    }

    return degradationRecord;
  }

  private async attemptRecovery(
    memoryId: string,
    recoveryMetadata: RecoveryMetadata
  ): Promise<RecoveryResult> {
    // Simplified recovery attempt - in a real implementation, this would
    // use the recovery cues and association fingerprint to reconstruct the memory
    // The memoryId parameter would be used to identify the memory to recover
    console.error(`Attempting recovery for memory: ${memoryId}`);

    const recoveryConfidence =
      this.calculateRecoveryConfidence(recoveryMetadata);
    const partialRecovery = recoveryConfidence < 0.8;

    return {
      success: recoveryConfidence > 0.3,
      recovery_confidence: recoveryConfidence,
      recovery_method: "metadata_reconstruction",
      partial_recovery: partialRecovery,
      missing_elements: partialRecovery
        ? ["detailed_content", "weak_associations"]
        : [],
      recovery_metadata_used: recoveryMetadata,
    };
  }

  private filterStagesToTarget(
    stages: DegradationStage[],
    targetLevel: number
  ): DegradationStage[] {
    const filteredStages: DegradationStage[] = [];
    let cumulativeDegradation = 0;

    for (const stage of stages) {
      if (cumulativeDegradation >= targetLevel) {
        break;
      }

      filteredStages.push(stage);
      cumulativeDegradation += stage.degradation_factor;
    }

    return filteredStages;
  }

  private generateProcessId(): string {
    return `degradation_${Date.now()}_${++this.processCounter}`;
  }

  private getMemoryId(memory: Episode | Concept): string {
    if ("id" in memory && memory.id) {
      return memory.id;
    }
    return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateContentHash(memory: Episode | Concept): string {
    const content = JSON.stringify(memory.content);
    // Simplified hash - in production, use a proper hash function
    return `hash_${content.length}_${Date.now()}`;
  }

  private extractRecoveryCues(memory: Episode | Concept): RecoveryCue[] {
    const cues: RecoveryCue[] = [];

    // Semantic cues from content
    if (memory.content && typeof memory.content === "string") {
      const words = memory.content.split(" ").slice(0, 5); // First 5 words
      words.forEach((word, index) => {
        cues.push({
          type: "semantic",
          value: word,
          strength: 1 - index * 0.1, // Decreasing strength
          source: "content_keywords",
        });
      });
    }

    // Temporal cues
    const timestamp = this.getMemoryTimestamp(memory);
    cues.push({
      type: "temporal",
      value: new Date(timestamp).toISOString().split("T")[0], // Date only
      strength: 0.7,
      source: "timestamp",
    });

    // Contextual cues
    if ("context" in memory && memory.context) {
      if (memory.context.domain) {
        cues.push({
          type: "contextual",
          value: memory.context.domain,
          strength: 0.8,
          source: "domain_context",
        });
      }
    }

    // Emotional cues
    if ("emotional_tags" in memory && memory.emotional_tags) {
      memory.emotional_tags.forEach((tag) => {
        cues.push({
          type: "emotional",
          value: tag,
          strength: 0.6,
          source: "emotional_tags",
        });
      });
    }

    return cues;
  }

  private createAssociationFingerprint(
    memory: Episode | Concept
  ): AssociationFingerprint {
    const fingerprint: AssociationFingerprint = {
      strong_associations: [],
      weak_associations: [],
      semantic_clusters: [],
      temporal_neighbors: [],
      contextual_tags: [],
    };

    // Extract associations based on memory type
    if ("relations" in memory && memory.relations) {
      fingerprint.strong_associations = memory.relations.slice(0, 3); // Top 3
      fingerprint.weak_associations = memory.relations.slice(3, 10); // Next 7
    }

    // Extract contextual information
    if ("context" in memory && memory.context) {
      if (memory.context.domain) {
        fingerprint.contextual_tags.push(memory.context.domain);
      }
      if (memory.context.session_id) {
        fingerprint.contextual_tags.push(
          `session:${memory.context.session_id}`
        );
      }
    }

    return fingerprint;
  }

  private generateContentSummary(memory: Episode | Concept): string {
    if (memory.content && typeof memory.content === "string") {
      return memory.content.length > 100
        ? memory.content.substring(0, 100) + "..."
        : memory.content;
    }
    return "No content summary available";
  }

  private estimateRecoveryDifficulty(
    memory: Episode | Concept,
    degradation_level: number
  ): number {
    let difficulty = degradation_level; // Base difficulty from degradation level

    // Adjust based on memory characteristics
    const importance = this.getMemoryImportance(memory);
    difficulty -= importance * 0.2; // Important memories are easier to recover

    // Adjust based on associations
    if ("relations" in memory && memory.relations) {
      const associationCount = memory.relations.length;
      difficulty -= Math.min(associationCount / 10, 0.3); // More associations = easier recovery
    }

    // Adjust based on age
    const age = Date.now() - this.getMemoryTimestamp(memory);
    const ageInDays = age / (1000 * 60 * 60 * 24);
    difficulty += Math.min(ageInDays / 365, 0.2); // Older memories are harder to recover

    return Math.max(0.1, Math.min(1, difficulty));
  }

  private calculateRecoveryConfidence(
    recoveryMetadata: RecoveryMetadata
  ): number {
    let confidence = 1 - recoveryMetadata.recovery_difficulty_estimate;

    // Adjust based on degradation history
    const totalDegradation = recoveryMetadata.degradation_history.reduce(
      (sum, record) => sum + record.degradation_factor,
      0
    );
    confidence -= totalDegradation * 0.5;

    // Adjust based on recovery cues strength
    const avgCueStrength =
      recoveryMetadata.recovery_cues.reduce(
        (sum, cue) => sum + cue.strength,
        0
      ) / recoveryMetadata.recovery_cues.length;
    confidence += avgCueStrength * 0.3;

    return Math.max(0.1, Math.min(1, confidence));
  }

  private getMemoryImportance(memory: Episode | Concept): number {
    if ("importance" in memory) {
      return memory.importance;
    } else if ("activation" in memory) {
      return memory.activation;
    }
    return 0.5; // Default moderate importance
  }

  private getMemoryTimestamp(memory: Episode | Concept): number {
    if ("timestamp" in memory) {
      return memory.timestamp;
    } else if ("last_accessed" in memory) {
      return memory.last_accessed;
    }
    return Date.now(); // Default to current time
  }

  // Cleanup methods

  public async cleanup(): Promise<void> {
    if (this.executionTimer) {
      clearInterval(this.executionTimer);
      this.executionTimer = undefined;
    }

    // Clean up expired recovery metadata
    const expirationTime =
      Date.now() -
      this.config.recovery_metadata_retention_days * 24 * 60 * 60 * 1000;

    for (const [memoryId, metadata] of this.recoveryMetadataStore.entries()) {
      if (metadata.preservation_timestamp < expirationTime) {
        this.recoveryMetadataStore.delete(memoryId);
      }
    }

    if (this.config.enable_degradation_logging) {
      console.error("Gradual degradation manager cleanup completed");
    }
  }
}
