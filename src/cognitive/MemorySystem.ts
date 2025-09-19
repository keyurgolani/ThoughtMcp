/**
 * Integrated Memory System
 *
 * Coordinates episodic memory, semantic memory, and consolidation engine
 * to provide a unified memory interface for the cognitive architecture.
 */

import {
  CognitiveComponent,
  ComponentStatus,
} from "../interfaces/cognitive.js";
import { Concept, Context, Episode } from "../types/core.js";
import {
  PersistenceManager,
  PersistenceManagerConfig,
} from "../utils/persistence/index.js";
import {
  ConsolidationConfig,
  ConsolidationEngine,
  ConsolidationResult,
} from "./ConsolidationEngine.js";
import { EpisodicMemory, EpisodicMemoryConfig } from "./EpisodicMemory.js";
import { SemanticMemory, SemanticMemoryConfig } from "./SemanticMemory.js";

export interface MemorySystemConfig {
  episodic: Partial<EpisodicMemoryConfig>;
  semantic: Partial<SemanticMemoryConfig>;
  consolidation: Partial<ConsolidationConfig>;
  persistence: Partial<PersistenceManagerConfig>;
  consolidation_interval_ms: number;
  auto_consolidation: boolean;
  memory_decay_interval_ms: number;
  auto_decay: boolean;
  persistence_enabled: boolean;
  auto_save_enabled: boolean;
  auto_recovery_enabled: boolean;
}

export interface MemoryRetrievalResult {
  episodic_memories: Episode[];
  semantic_concepts: Concept[];
  combined_relevance: number;
  retrieval_time_ms: number;
}

export interface MemoryStorageResult {
  episodic_id: string;
  semantic_id?: string;
  storage_time_ms: number;
  success: boolean;
}

export class MemorySystem implements CognitiveComponent {
  private episodicMemory: EpisodicMemory;
  private semanticMemory: SemanticMemory;
  private consolidationEngine: ConsolidationEngine;
  private persistenceManager?: PersistenceManager;
  private config: MemorySystemConfig;
  private initialized: boolean = false;
  private lastActivity: number = 0;
  private consolidationTimer?: NodeJS.Timeout | undefined;
  private decayTimer?: NodeJS.Timeout | undefined;

  constructor(config?: Partial<MemorySystemConfig>) {
    this.config = {
      episodic: {},
      semantic: {},
      consolidation: {},
      persistence: {},
      consolidation_interval_ms: 60000, // 1 minute
      auto_consolidation: true,
      memory_decay_interval_ms: 300000, // 5 minutes
      auto_decay: true,
      persistence_enabled: true,
      auto_save_enabled: true,
      auto_recovery_enabled: true,
      ...config,
    };

    this.episodicMemory = new EpisodicMemory(this.config.episodic);
    this.semanticMemory = new SemanticMemory(this.config.semantic);
    this.consolidationEngine = new ConsolidationEngine(
      this.config.consolidation
    );

    // Initialize persistence manager if enabled
    if (this.config.persistence_enabled) {
      this.persistenceManager = new PersistenceManager(this.config.persistence);
    }
  }

  async initialize(config?: Partial<MemorySystemConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize all memory components
    await this.episodicMemory.initialize(this.config.episodic);
    await this.semanticMemory.initialize(this.config.semantic);
    await this.consolidationEngine.initialize(this.config.consolidation);

    // Initialize persistence manager if enabled
    if (this.config.persistence_enabled && this.persistenceManager) {
      await this.persistenceManager.initialize();

      // Attempt recovery if enabled
      if (this.config.auto_recovery_enabled) {
        await this.attemptRecovery();
      }

      // Start auto-save if enabled
      if (this.config.auto_save_enabled) {
        this.persistenceManager.startAutoSave(async () => {
          await this.saveToStorage();
        });
      }
    }

    // Start automatic processes
    if (this.config.auto_consolidation) {
      this.startConsolidationProcess();
    }

    if (this.config.auto_decay) {
      this.startDecayProcess();
    }

    this.initialized = true;
    this.lastActivity = Date.now();
  }

  async process(input: unknown): Promise<unknown> {
    // Generic process method - route to appropriate memory operation
    const inputObj = input as {
      operation?: string;
      experience?: unknown;
      cue?: string;
      threshold?: number;
    };
    if (inputObj?.operation === "store") {
      return this.storeExperience(
        inputObj.experience as {
          content: unknown;
          context: Context;
          importance: number;
          emotional_tags?: string[];
        }
      );
    } else if (inputObj?.operation === "retrieve") {
      return this.retrieveMemories(
        inputObj.cue as string,
        inputObj.threshold as number
      );
    } else if (inputObj?.operation === "consolidate") {
      return this.runConsolidation();
    }

    throw new Error("Invalid operation for MemorySystem.process()");
  }

  reset(): void {
    this.episodicMemory.reset();
    this.semanticMemory.reset();
    this.consolidationEngine.reset();

    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
    }
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
    }

    this.lastActivity = Date.now();
  }

  getStatus(): ComponentStatus {
    const episodicStatus = this.episodicMemory.getStatus();
    const semanticStatus = this.semanticMemory.getStatus();
    // Note: consolidationStatus available but not used in current status logic

    return {
      name: "MemorySystem",
      initialized:
        this.initialized &&
        episodicStatus.initialized &&
        semanticStatus.initialized,
      active: episodicStatus.active || semanticStatus.active,
      last_activity: Math.max(
        this.lastActivity,
        Math.max(episodicStatus.last_activity, semanticStatus.last_activity)
      ),
    };
  }

  /**
   * Store an experience in both episodic and semantic memory
   */
  async storeExperience(experience: {
    content: unknown;
    context: Context;
    importance: number;
    emotional_tags?: string[];
  }): Promise<MemoryStorageResult> {
    const startTime = Date.now();
    this.lastActivity = startTime;

    try {
      // Create episode for episodic memory
      const episode: Episode = {
        content: experience.content,
        context: experience.context,
        timestamp: startTime,
        emotional_tags: experience.emotional_tags || [],
        importance: experience.importance,
        decay_factor: 1.0,
      };

      // Store in episodic memory
      const episodicId = this.episodicMemory.store(episode);

      // Extract concepts for semantic memory
      const concepts = this.extractConceptsFromExperience(experience);
      let semanticId: string | undefined;

      if (concepts.length > 0) {
        // Store the primary concept
        semanticId = this.semanticMemory.store(concepts[0]);

        // Store additional concepts and create relations
        for (let i = 1; i < concepts.length; i++) {
          const conceptId = this.semanticMemory.store(concepts[i]);
          this.semanticMemory.addRelation(
            semanticId,
            conceptId,
            "related_to",
            0.5 + experience.importance * 0.3
          );
        }
      }

      const result: MemoryStorageResult = {
        episodic_id: episodicId,
        storage_time_ms: Date.now() - startTime,
        success: true,
      };

      if (semanticId) {
        result.semantic_id = semanticId;
      }

      return result;
    } catch {
      return {
        episodic_id: "",
        storage_time_ms: Date.now() - startTime,
        success: false,
      };
    }
  }

  /**
   * Retrieve memories from both episodic and semantic systems
   */
  async retrieveMemories(
    cue: string,
    threshold: number = 0.3
  ): Promise<MemoryRetrievalResult> {
    const startTime = Date.now();
    this.lastActivity = startTime;

    // Retrieve from both memory systems in parallel
    const [episodicMemories, semanticConcepts] = await Promise.all([
      Promise.resolve(this.episodicMemory.retrieve(cue, threshold)),
      Promise.resolve(this.semanticMemory.retrieve(cue, threshold)),
    ]);

    // Compute combined relevance score
    const combinedRelevance = this.computeCombinedRelevance(
      episodicMemories,
      semanticConcepts,
      cue
    );

    return {
      episodic_memories: episodicMemories,
      semantic_concepts: semanticConcepts,
      combined_relevance: combinedRelevance,
      retrieval_time_ms: Date.now() - startTime,
    };
  }

  /**
   * Store episodic memory directly
   */
  storeEpisode(episode: Episode): string {
    this.lastActivity = Date.now();
    return this.episodicMemory.store(episode);
  }

  /**
   * Store semantic concept directly
   */
  storeConcept(concept: Concept): string {
    this.lastActivity = Date.now();
    return this.semanticMemory.store(concept);
  }

  /**
   * Get episodes by time range
   */
  getEpisodesByTimeRange(startTime: number, endTime: number): Episode[] {
    return this.episodicMemory.getEpisodesByTimeRange(startTime, endTime);
  }

  /**
   * Get episodes by context
   */
  getEpisodesByContext(contextKey: string, contextValue: string): Episode[] {
    return this.episodicMemory.getEpisodesByContext(contextKey, contextValue);
  }

  /**
   * Get related concepts
   */
  getRelatedConcepts(conceptId: string): Concept[] {
    return this.semanticMemory.getRelated(conceptId);
  }

  /**
   * Find similar concepts
   */
  findSimilarConcepts(conceptId: string, maxResults: number = 10): Concept[] {
    return this.semanticMemory.findSimilarConcepts(conceptId, maxResults);
  }

  /**
   * Run consolidation process manually
   */
  async runConsolidation(): Promise<ConsolidationResult> {
    this.lastActivity = Date.now();

    // Get episodes ready for consolidation
    const episodesToConsolidate = this.episodicMemory.consolidate();

    if (episodesToConsolidate.length === 0) {
      return {
        patterns_extracted: 0,
        concepts_created: 0,
        relations_strengthened: 0,
        episodes_processed: 0,
        pruned_memories: 0,
      };
    }

    // Run consolidation
    const newConcepts = this.consolidationEngine.consolidate(
      episodesToConsolidate
    );

    // Store new concepts in semantic memory
    for (const concept of newConcepts) {
      this.semanticMemory.store(concept);
    }

    // Apply decay to both memory systems
    this.episodicMemory.decay();
    this.semanticMemory.applyDecay();

    return (
      this.consolidationEngine.getLastConsolidationResult() || {
        patterns_extracted: 0,
        concepts_created: newConcepts.length,
        relations_strengthened: 0,
        episodes_processed: episodesToConsolidate.length,
        pruned_memories: 0,
      }
    );
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    episodic_count: number;
    semantic_count: number;
    consolidation_history: ConsolidationResult[];
    last_consolidation: ConsolidationResult | null;
  } {
    return {
      episodic_count: this.episodicMemory.getSize(),
      semantic_count: this.semanticMemory.getActiveConcepts().length,
      consolidation_history: this.consolidationEngine.getConsolidationStats(),
      last_consolidation: this.consolidationEngine.getLastConsolidationResult(),
    };
  }

  /**
   * Save current memory state to persistent storage
   */
  async saveToStorage(): Promise<void> {
    if (!this.persistenceManager) {
      throw new Error("Persistence not enabled");
    }

    const episodes = Array.from(this.episodicMemory["episodes"].values());
    const concepts = Array.from(this.semanticMemory["concepts"].values());
    const relations = Array.from(this.semanticMemory["relations"].values());
    const lastConsolidation =
      this.consolidationEngine.getLastConsolidationResult()
        ?.patterns_extracted || 0;

    await this.persistenceManager.saveMemorySystem(
      episodes,
      concepts,
      relations,
      lastConsolidation
    );
  }

  /**
   * Load memory state from persistent storage
   */
  async loadFromStorage(): Promise<boolean> {
    if (!this.persistenceManager) {
      throw new Error("Persistence not enabled");
    }

    const data = await this.persistenceManager.loadMemorySystem();
    if (!data) {
      return false;
    }

    // Clear current memory
    this.episodicMemory.reset();
    this.semanticMemory.reset();

    // Load episodes
    for (const episode of data.episodicMemories) {
      this.episodicMemory.store(episode);
    }

    // Load concepts
    for (const concept of data.semanticConcepts) {
      this.semanticMemory.store(concept);
    }

    // Load relations
    for (const relation of data.semanticRelations) {
      this.semanticMemory.addRelation(
        relation.from,
        relation.to,
        relation.type,
        relation.strength
      );
    }

    return true;
  }

  /**
   * Create a backup of current memory state
   */
  async createBackup(backupId?: string): Promise<string> {
    if (!this.persistenceManager) {
      throw new Error("Persistence not enabled");
    }

    // Save current state first
    await this.saveToStorage();

    // Create backup
    return this.persistenceManager.createBackup(backupId);
  }

  /**
   * Restore memory state from a backup
   */
  async restoreFromBackup(backupId: string): Promise<void> {
    if (!this.persistenceManager) {
      throw new Error("Persistence not enabled");
    }

    const data = await this.persistenceManager.restoreFromBackup(backupId);

    // Clear current memory
    this.episodicMemory.reset();
    this.semanticMemory.reset();

    // Load episodes
    for (const episode of data.episodicMemories) {
      this.episodicMemory.store(episode);
    }

    // Load concepts
    for (const concept of data.semanticConcepts) {
      this.semanticMemory.store(concept);
    }

    // Load relations
    for (const relation of data.semanticRelations) {
      this.semanticMemory.addRelation(
        relation.from,
        relation.to,
        relation.type,
        relation.strength
      );
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<string[]> {
    if (!this.persistenceManager) {
      throw new Error("Persistence not enabled");
    }

    return this.persistenceManager.listBackups();
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    if (!this.persistenceManager) {
      throw new Error("Persistence not enabled");
    }

    await this.persistenceManager.deleteBackup(backupId);
  }

  /**
   * Get persistence status
   */
  getPersistenceStatus(): { enabled: boolean; [key: string]: unknown } {
    if (!this.persistenceManager) {
      return { enabled: false };
    }

    return {
      enabled: true,
      ...this.persistenceManager.getStatus(),
    };
  }

  /**
   * Attempt to recover from the most recent backup
   */
  private async attemptRecovery(): Promise<void> {
    if (!this.persistenceManager) {
      return;
    }

    try {
      // First try to load from normal storage
      const loaded = await this.loadFromStorage();
      if (loaded) {
        return;
      }

      // If that fails, try recovery from backup
      const recoveredData = await this.persistenceManager.attemptRecovery();
      if (recoveredData) {
        // Clear current memory
        this.episodicMemory.reset();
        this.semanticMemory.reset();

        // Load recovered data
        for (const episode of recoveredData.episodicMemories) {
          this.episodicMemory.store(episode);
        }

        for (const concept of recoveredData.semanticConcepts) {
          this.semanticMemory.store(concept);
        }

        for (const relation of recoveredData.semanticRelations) {
          this.semanticMemory.addRelation(
            relation.from,
            relation.to,
            relation.type,
            relation.strength
          );
        }

        console.log("Memory system recovered from backup");
      }
    } catch (error) {
      console.error("Recovery attempt failed:", error);
    }
  }

  /**
   * Shutdown the memory system
   */
  async shutdown(): Promise<void> {
    // Save current state before shutdown if persistence is enabled
    if (this.persistenceManager && this.config.auto_save_enabled) {
      try {
        await this.saveToStorage();
      } catch (error) {
        console.error("Failed to save memory state during shutdown:", error);
      }
    }

    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
      this.consolidationTimer = undefined;
    }

    if (this.decayTimer) {
      clearInterval(this.decayTimer);
      this.decayTimer = undefined;
    }

    if (this.persistenceManager) {
      await this.persistenceManager.shutdown();
    }
  }

  // Private helper methods

  private startConsolidationProcess(): void {
    this.consolidationTimer = setInterval(async () => {
      try {
        await this.runConsolidation();
      } catch (error) {
        console.error("Consolidation process error:", error);
      }
    }, this.config.consolidation_interval_ms);
  }

  private startDecayProcess(): void {
    this.decayTimer = setInterval(() => {
      try {
        this.episodicMemory.decay();
        this.semanticMemory.applyDecay();
      } catch (error) {
        console.error("Decay process error:", error);
      }
    }, this.config.memory_decay_interval_ms);
  }

  private extractConceptsFromExperience(experience: {
    content: unknown;
    context: Context;
    importance: number;
    emotional_tags?: string[];
  }): Concept[] {
    const concepts: Concept[] = [];

    // Extract main concept from content
    const mainConcept: Concept = {
      id: this.generateConceptId(experience.content),
      content: experience.content,
      relations: [],
      activation: experience.importance,
      last_accessed: Date.now(),
    };

    concepts.push(mainConcept);

    // Extract context-based concepts
    if (experience.context.domain) {
      const domainConcept: Concept = {
        id: `domain_${experience.context.domain}`,
        content: { type: "domain", value: experience.context.domain },
        relations: [],
        activation: experience.importance * 0.5,
        last_accessed: Date.now(),
      };
      concepts.push(domainConcept);
    }

    // Extract emotional concepts
    if (experience.emotional_tags && experience.emotional_tags.length > 0) {
      for (const tag of experience.emotional_tags) {
        const emotionalConcept: Concept = {
          id: `emotion_${tag}`,
          content: { type: "emotion", value: tag },
          relations: [],
          activation: experience.importance * 0.3,
          last_accessed: Date.now(),
        };
        concepts.push(emotionalConcept);
      }
    }

    return concepts;
  }

  private generateConceptId(content: unknown): string {
    const contentStr = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < contentStr.length; i++) {
      const char = contentStr.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `concept_${Math.abs(hash).toString(16)}`;
  }

  private computeCombinedRelevance(
    episodes: Episode[],
    concepts: Concept[],
    _cue: string
  ): number {
    let relevance = 0;

    // Episodic relevance
    if (episodes.length > 0) {
      const episodicRelevance =
        episodes.reduce((sum, ep) => sum + ep.importance, 0) / episodes.length;
      relevance += episodicRelevance * 0.6;
    }

    // Semantic relevance
    if (concepts.length > 0) {
      const semanticRelevance =
        concepts.reduce((sum, concept) => sum + concept.activation, 0) /
        concepts.length;
      relevance += semanticRelevance * 0.4;
    }

    return Math.min(relevance, 1.0);
  }
}
