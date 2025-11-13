/**
 * Embedding System Type Definitions
 *
 * Core types and interfaces for the five-sector embedding system.
 * Supports Hierarchical Memory Decomposition (HMD) with specialized
 * embeddings for Episodic, Semantic, Procedural, Emotional, and Reflective memory sectors.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

/**
 * Memory sector types for HMD system
 */
export enum MemorySector {
  Episodic = "episodic",
  Semantic = "semantic",
  Procedural = "procedural",
  Emotional = "emotional",
  Reflective = "reflective",
}

/**
 * Five-sector embeddings for a single memory
 */
export interface SectorEmbeddings {
  episodic: number[];
  semantic: number[];
  procedural: number[];
  emotional: number[];
  reflective: number[];
}

/**
 * Temporal context for episodic embeddings
 */
export interface TemporalContext {
  timestamp: Date;
  sessionId: string;
  sequenceNumber?: number;
  duration?: number;
  location?: string;
  participants?: string[];
}

/**
 * Emotion state for emotional embeddings
 * Based on Circumplex model
 */
export interface EmotionState {
  valence: number; // -1 to +1 (negative to positive)
  arousal: number; // 0 to 1 (calm to excited)
  dominance: number; // -1 to +1 (submissive to dominant)
  primaryEmotion?: string;
}

/**
 * Memory content for embedding generation
 */
export interface MemoryContent {
  text: string;
  sector: MemorySector;
  context?: TemporalContext;
  emotion?: EmotionState;
  insights?: string[];
}

/**
 * Base interface for embedding models
 */
export interface EmbeddingModel {
  /**
   * Generate embedding vector for text
   */
  generate(text: string): Promise<number[]>;

  /**
   * Get embedding dimension for this model
   */
  getDimension(): number;

  /**
   * Get model name/identifier
   */
  getModelName(): string;
}

/**
 * Configuration for embedding models
 */
export interface EmbeddingConfig {
  modelName: string;
  dimension: number;
  host?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Cache interface for embedding storage
 */
export interface EmbeddingCache {
  /**
   * Store embedding in cache
   */
  set(key: string, value: number[], ttl?: number): void;

  /**
   * Retrieve embedding from cache
   */
  get(key: string): number[] | null;

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean;

  /**
   * Clear all cache entries
   */
  clear(): void;

  /**
   * Get current cache size
   */
  size(): number;
}

/**
 * Sector weights for multi-sector search
 */
export interface SectorWeights {
  episodic?: number;
  semantic?: number;
  procedural?: number;
  emotional?: number;
  reflective?: number;
}

/**
 * Similarity search result
 */
export interface SimilarityResult {
  memoryId: string;
  sector: MemorySector | "composite";
  similarity: number;
}

/**
 * Error types for embedding operations
 */
export class EmbeddingError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}

export class ValidationError extends EmbeddingError {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message, "VALIDATION_ERROR", { field, value });
    this.name = "ValidationError";
  }
}

export class TimeoutError extends EmbeddingError {
  constructor(
    message: string,
    public duration: number
  ) {
    super(message, "TIMEOUT_ERROR", { duration });
    this.name = "TimeoutError";
  }
}

export class NetworkError extends EmbeddingError {
  constructor(
    message: string,
    public endpoint: string,
    public statusCode?: number
  ) {
    super(message, "NETWORK_ERROR", { endpoint, statusCode });
    this.name = "NetworkError";
  }
}
