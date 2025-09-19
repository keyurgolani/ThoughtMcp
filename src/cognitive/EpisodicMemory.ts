/**
 * Episodic Memory System
 *
 * Implements temporal storage and context tagging for episodic memories.
 * Handles storage, retrieval, decay, and consolidation of episodic experiences.
 */

import { ComponentStatus, IEpisodicMemory } from "../interfaces/cognitive.js";
import { Episode } from "../types/core.js";

export interface EpisodicMemoryConfig {
  capacity: number;
  decay_rate: number;
  retrieval_threshold: number;
  consolidation_threshold: number;
  importance_boost: number;
}

export class EpisodicMemory implements IEpisodicMemory {
  private episodes: Map<string, Episode> = new Map();
  private contextIndex: Map<string, Set<string>> = new Map(); // context -> episode IDs
  private temporalIndex: Map<number, Set<string>> = new Map(); // timestamp -> episode IDs
  private config: EpisodicMemoryConfig;
  private initialized: boolean = false;
  private lastActivity: number = 0;

  constructor(config?: Partial<EpisodicMemoryConfig>) {
    this.config = {
      capacity: 10000,
      decay_rate: 0.01,
      retrieval_threshold: 0.3,
      consolidation_threshold: 0.7,
      importance_boost: 0.2,
      ...config,
    };
  }

  async initialize(config?: Partial<EpisodicMemoryConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.episodes.clear();
    this.contextIndex.clear();
    this.temporalIndex.clear();

    this.initialized = true;
    this.lastActivity = Date.now();
  }

  async process(input: unknown): Promise<unknown> {
    // Generic process method for CognitiveComponent interface
    const inputObj = input as { episode?: unknown };
    if (typeof input === "object" && input !== null && inputObj?.episode) {
      return this.store(inputObj.episode as Episode);
    }
    throw new Error("Invalid input for EpisodicMemory.process()");
  }

  reset(): void {
    this.episodes.clear();
    this.contextIndex.clear();
    this.temporalIndex.clear();
    this.lastActivity = Date.now();
  }

  getStatus(): ComponentStatus {
    return {
      name: "EpisodicMemory",
      initialized: this.initialized,
      active: this.episodes.size > 0,
      last_activity: this.lastActivity,
    };
  }

  /**
   * Store an episode in episodic memory with context tagging
   */
  store(episode: Episode): string {
    this.lastActivity = Date.now();

    // Generate unique ID for the episode
    const episodeId = this.generateEpisodeId(episode);

    // Store the episode first
    this.episodes.set(episodeId, {
      ...episode,
      timestamp: episode.timestamp || Date.now(),
      decay_factor: 1.0,
    });

    // Update context index
    this.updateContextIndex(episodeId, episode);

    // Update temporal index
    this.updateTemporalIndex(episodeId, episode.timestamp || Date.now());

    // Apply capacity management after storing
    if (this.episodes.size > this.config.capacity) {
      this.pruneOldestEpisodes();
    }

    return episodeId;
  }

  /**
   * Retrieve episodes based on cue and threshold
   */
  retrieve(
    cue: string,
    threshold: number = this.config.retrieval_threshold
  ): Episode[] {
    this.lastActivity = Date.now();

    const matches: Array<{ episode: Episode; score: number }> = [];

    // Search through all episodes
    for (const [id, episode] of this.episodes) {
      const score = this.computeRetrievalScore(episode, cue);

      if (score >= threshold) {
        matches.push({ episode, score });

        // Boost activation for retrieved episodes
        this.boostEpisodeActivation(id);
      }
    }

    // Sort by relevance score and return episodes
    return matches
      .sort((a, b) => b.score - a.score)
      .map((match) => match.episode);
  }

  /**
   * Apply decay to all episodes
   */
  decay(): void {
    const currentTime = Date.now();

    for (const [id, episode] of this.episodes) {
      const timeDelta = (currentTime - episode.timestamp) / (1000 * 60 * 60); // hours
      const newDecayFactor =
        episode.decay_factor * Math.exp(-this.config.decay_rate * timeDelta);

      // Update episode with new decay factor
      this.episodes.set(id, {
        ...episode,
        decay_factor: newDecayFactor,
      });

      // Remove episodes that have decayed too much
      if (newDecayFactor < 0.01) {
        this.removeEpisode(id);
      }
    }
  }

  /**
   * Get episodes ready for consolidation
   */
  consolidate(): Episode[] {
    const consolidationCandidates: Episode[] = [];

    for (const episode of this.episodes.values()) {
      // Episodes with high importance and sufficient activation are candidates
      if (
        episode.importance >= this.config.consolidation_threshold &&
        episode.decay_factor > 0.5
      ) {
        consolidationCandidates.push(episode);
      }
    }

    return consolidationCandidates;
  }

  /**
   * Get current size of episodic memory
   */
  getSize(): number {
    return this.episodes.size;
  }

  /**
   * Get episodes within a time range
   */
  getEpisodesByTimeRange(startTime: number, endTime: number): Episode[] {
    const episodes: Episode[] = [];

    for (const episode of this.episodes.values()) {
      if (episode.timestamp >= startTime && episode.timestamp <= endTime) {
        episodes.push(episode);
      }
    }

    return episodes.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get episodes by context
   */
  getEpisodesByContext(contextKey: string, contextValue: string): Episode[] {
    const episodes: Episode[] = [];

    for (const episode of this.episodes.values()) {
      if (
        episode.context &&
        contextKey in episode.context &&
        (episode.context as unknown as Record<string, unknown>)[contextKey] ===
          contextValue
      ) {
        episodes.push(episode);
      }
    }

    return episodes;
  }

  // Private helper methods

  private generateEpisodeId(episode: Episode): string {
    const timestamp = episode.timestamp || Date.now();
    const contentHash = this.hashContent(episode.content);
    return `episode_${timestamp}_${contentHash}`;
  }

  private hashContent(content: unknown): string {
    // Simple hash function for content
    const str = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private updateContextIndex(episodeId: string, episode: Episode): void {
    if (!episode.context) return;

    // Index by session_id
    if (episode.context.session_id) {
      this.addToIndex(
        this.contextIndex,
        `session:${episode.context.session_id}`,
        episodeId
      );
    }

    // Index by domain
    if (episode.context.domain) {
      this.addToIndex(
        this.contextIndex,
        `domain:${episode.context.domain}`,
        episodeId
      );
    }

    // Index by emotional tags
    if (episode.emotional_tags) {
      episode.emotional_tags.forEach((tag) => {
        this.addToIndex(this.contextIndex, `emotion:${tag}`, episodeId);
      });
    }
  }

  private updateTemporalIndex(episodeId: string, timestamp: number): void {
    // Group by hour for temporal indexing
    const hourKey = Math.floor(timestamp / (1000 * 60 * 60));
    this.addToIndex(this.temporalIndex, hourKey, episodeId);
  }

  private addToIndex<K>(
    index: Map<K, Set<string>>,
    key: K,
    episodeId: string
  ): void {
    if (!index.has(key)) {
      index.set(key, new Set());
    }
    index.get(key)!.add(episodeId);
  }

  private computeRetrievalScore(episode: Episode, cue: string): number {
    let score = 0;

    // Content similarity (simple string matching for now)
    const contentStr = JSON.stringify(episode.content).toLowerCase();
    const cueWords = cue.toLowerCase().split(" ");

    for (const word of cueWords) {
      if (contentStr.includes(word)) {
        score += 0.3;
      }
    }

    // Recency boost
    const hoursSinceCreation =
      (Date.now() - episode.timestamp) / (1000 * 60 * 60);
    const recencyBoost = Math.exp(-hoursSinceCreation / 24); // Decay over days
    score += recencyBoost * 0.2;

    // Importance boost
    score += episode.importance * 0.3;

    // Decay factor
    score *= episode.decay_factor;

    // Emotional relevance (if cue contains emotional words)
    if (episode.emotional_tags && episode.emotional_tags.length > 0) {
      const emotionalWords = [
        "happy",
        "sad",
        "angry",
        "fear",
        "surprise",
        "disgust",
      ];
      for (const emotion of emotionalWords) {
        if (cue.toLowerCase().includes(emotion)) {
          score += 0.1;
        }
      }
    }

    return Math.min(score, 1.0);
  }

  private boostEpisodeActivation(episodeId: string): void {
    const episode = this.episodes.get(episodeId);
    if (episode) {
      const boostedImportance = Math.min(
        episode.importance + this.config.importance_boost,
        1.0
      );

      this.episodes.set(episodeId, {
        ...episode,
        importance: boostedImportance,
      });
    }
  }

  private pruneOldestEpisodes(): void {
    // Remove episodes until we're at capacity
    const episodeEntries = Array.from(this.episodes.entries());
    const sortedByAge = episodeEntries.sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );
    const toRemove = this.episodes.size - this.config.capacity;

    for (let i = 0; i < toRemove && i < sortedByAge.length; i++) {
      this.removeEpisode(sortedByAge[i][0]);
    }
  }

  private removeEpisode(episodeId: string): void {
    const episode = this.episodes.get(episodeId);
    if (!episode) return;

    // Remove from main storage
    this.episodes.delete(episodeId);

    // Remove from context index
    for (const [key, episodeSet] of this.contextIndex) {
      episodeSet.delete(episodeId);
      if (episodeSet.size === 0) {
        this.contextIndex.delete(key);
      }
    }

    // Remove from temporal index
    for (const [key, episodeSet] of this.temporalIndex) {
      episodeSet.delete(episodeId);
      if (episodeSet.size === 0) {
        this.temporalIndex.delete(key);
      }
    }
  }
}
