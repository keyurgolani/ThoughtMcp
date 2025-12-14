/**
 * Mock Embedding Utilities
 *
 * Provides utilities for generating mock embeddings for testing:
 * - Deterministic embedding generation using cached Ollama embeddings when available
 * - Fallback to hash-based generation when cache miss
 * - Similarity control
 * - Fast generation for tests
 * - No external API calls
 *
 * The mock embeddings system supports two modes:
 * 1. Cached mode: Uses pre-computed embeddings from real Ollama server
 * 2. Generated mode: Falls back to deterministic hash-based generation
 *
 * To capture real Ollama embeddings for the cache:
 * npm run test:capture-embeddings
 */

import { getCachedEmbedding, hasCachedEmbedding } from "./ollama-embeddings-cache.js";

/**
 * Generate a deterministic mock embedding
 *
 * @param dimension - Embedding dimension
 * @param seed - Seed for deterministic generation
 * @returns Mock embedding vector
 */
export function generateMockEmbedding(dimension: number = 1536, seed: number = 0): number[] {
  const embedding: number[] = [];
  let currentSeed = seed;

  for (let i = 0; i < dimension; i++) {
    // Simple deterministic pseudo-random number generator
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const value = currentSeed / 233280;
    embedding.push(value);
  }

  // Normalize to unit vector
  return normalizeVector(embedding);
}

/**
 * Generate a mock embedding similar to a reference embedding
 *
 * @param reference - Reference embedding
 * @param similarity - Target similarity (0-1)
 * @returns Similar mock embedding
 */
export function generateSimilarEmbedding(reference: number[], similarity: number = 0.9): number[] {
  if (similarity < 0 || similarity > 1) {
    throw new Error("Similarity must be between 0 and 1");
  }

  const dimension = reference.length;
  const similar: number[] = [];

  // Generate similar vector by mixing reference with random noise
  for (let i = 0; i < dimension; i++) {
    const noise = (Math.random() - 0.5) * 2;
    const value = reference[i] * similarity + noise * (1 - similarity);
    similar.push(value);
  }

  return normalizeVector(similar);
}

/**
 * Generate mock embeddings for all sectors
 *
 * @param dimension - Embedding dimension
 * @param seed - Seed for deterministic generation
 * @returns Mock sector embeddings
 */
export function generateMockSectorEmbeddings(
  dimension: number = 1536,
  seed: number = 0
): {
  episodic: number[];
  semantic: number[];
  procedural: number[];
  emotional: number[];
  reflective: number[];
} {
  return {
    episodic: generateMockEmbedding(dimension, seed),
    semantic: generateMockEmbedding(dimension, seed + 1),
    procedural: generateMockEmbedding(dimension, seed + 2),
    emotional: generateMockEmbedding(dimension, seed + 3),
    reflective: generateMockEmbedding(dimension, seed + 4),
  };
}

/**
 * Calculate cosine similarity between two embeddings
 *
 * @param a - First embedding
 * @param b - Second embedding
 * @returns Cosine similarity (-1 to 1)
 */
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have same dimension");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Normalize a vector to unit length
 *
 * @param vector - Vector to normalize
 * @returns Normalized vector
 */
export function normalizeVector(vector: number[]): number[] {
  let magnitude = 0;

  for (const value of vector) {
    magnitude += value * value;
  }

  magnitude = Math.sqrt(magnitude);

  if (magnitude === 0) {
    return vector.map(() => 0);
  }

  return vector.map((value) => value / magnitude);
}

/**
 * Generate a batch of mock embeddings
 *
 * @param count - Number of embeddings to generate
 * @param dimension - Embedding dimension
 * @param baseSeed - Base seed for generation
 * @returns Array of mock embeddings
 */
export function generateMockEmbeddingBatch(
  count: number,
  dimension: number = 1536,
  baseSeed: number = 0
): number[][] {
  return Array.from({ length: count }, (_, i) => generateMockEmbedding(dimension, baseSeed + i));
}

/**
 * Generate mock embeddings with controlled similarity distribution
 *
 * @param reference - Reference embedding
 * @param count - Number of embeddings to generate
 * @param minSimilarity - Minimum similarity
 * @param maxSimilarity - Maximum similarity
 * @returns Array of embeddings with controlled similarity
 */
export function generateSimilarityDistribution(
  reference: number[],
  count: number,
  minSimilarity: number = 0.5,
  maxSimilarity: number = 0.95
): number[][] {
  const embeddings: number[][] = [];

  for (let i = 0; i < count; i++) {
    const similarity = minSimilarity + (maxSimilarity - minSimilarity) * (i / (count - 1));
    embeddings.push(generateSimilarEmbedding(reference, similarity));
  }

  return embeddings;
}

/**
 * Mock embedding engine for testing
 */
export class MockEmbeddingEngine {
  private dimension: number;
  private cache: Map<string, number[]>;

  constructor(dimension: number = 1536) {
    this.dimension = dimension;
    this.cache = new Map();
  }

  /**
   * Generate embedding for text
   *
   * @param text - Input text
   * @returns Mock embedding
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache
    const cached = this.cache.get(text);
    if (cached !== undefined) {
      return cached;
    }

    // Generate deterministic embedding based on text hash
    const seed = this.hashString(text);
    const embedding = generateMockEmbedding(this.dimension, seed);

    // Cache result
    this.cache.set(text, embedding);

    return embedding;
  }

  /**
   * Generate embeddings for all sectors
   *
   * @param text - Input text
   * @returns Mock sector embeddings
   */
  async generateSectorEmbeddings(text: string): Promise<{
    episodic: number[];
    semantic: number[];
    procedural: number[];
    emotional: number[];
    reflective: number[];
  }> {
    const seed = this.hashString(text);
    return generateMockSectorEmbeddings(this.dimension, seed);
  }

  /**
   * Generate batch of embeddings
   *
   * @param texts - Input texts
   * @returns Array of mock embeddings
   */
  async generateBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.generateEmbedding(text)));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Create a mock embedding engine for testing
 *
 * @param dimension - Embedding dimension
 * @returns Mock embedding engine
 */
export function createMockEmbeddingEngine(dimension: number = 1536): MockEmbeddingEngine {
  return new MockEmbeddingEngine(dimension);
}

/**
 * Mock Ollama Embedding Model for testing
 *
 * Provides a drop-in replacement for OllamaEmbeddingModel that:
 * - Uses cached real Ollama embeddings when available for consistency
 * - Falls back to deterministic hash-based generation for cache misses
 * - Does not require external Ollama service
 * - Supports all OllamaEmbeddingModel configuration options
 * - Returns normalized unit vectors
 */
export class MockOllamaEmbeddingModel {
  private readonly modelName: string;
  private readonly dimension: number;
  private readonly useCachedEmbeddings: boolean;
  private cache: Map<string, number[]>;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor(config: {
    host: string;
    modelName: string;
    dimension: number;
    timeout?: number;
    maxRetries?: number;
    useCachedEmbeddings?: boolean;
  }) {
    // Accept all config options for compatibility, but only store what we need
    this.modelName = config.modelName;
    this.dimension = config.dimension;
    this.useCachedEmbeddings = config.useCachedEmbeddings ?? true;
    this.cache = new Map();
  }

  /**
   * Generate embedding vector for text
   * Uses cached Ollama embeddings when available, falls back to hash-based generation
   */
  async generate(text: string): Promise<number[]> {
    // Validate input (same as real implementation)
    if (!text || typeof text !== "string") {
      throw new Error("Text must be a non-empty string");
    }

    if (text.trim().length === 0) {
      throw new Error("Text cannot be empty or whitespace only");
    }

    if (text.length > 100000) {
      throw new Error("Text exceeds maximum length of 100,000 characters");
    }

    // Check local cache first
    const localCached = this.cache.get(text);
    if (localCached !== undefined) {
      return localCached;
    }

    let embedding: number[];

    // Try to get from pre-computed Ollama cache
    if (this.useCachedEmbeddings && hasCachedEmbedding(text)) {
      const cachedEmbedding = getCachedEmbedding(text);
      if (cachedEmbedding && cachedEmbedding.length === this.dimension) {
        embedding = cachedEmbedding;
        this.cacheHits++;
      } else {
        // Dimension mismatch or invalid cache, fall back to generated
        embedding = this.generateDeterministicEmbedding(text);
        this.cacheMisses++;
      }
    } else {
      // No cached embedding, generate deterministically
      embedding = this.generateDeterministicEmbedding(text);
      this.cacheMisses++;
    }

    // Store in local cache
    this.cache.set(text, embedding);

    return embedding;
  }

  /**
   * Generate deterministic embedding based on text hash
   * Used as fallback when no cached Ollama embedding is available
   */
  private generateDeterministicEmbedding(text: string): number[] {
    const seed = this.hashString(text);
    return generateMockEmbedding(this.dimension, seed);
  }

  /**
   * Get embedding dimension for this model
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * Get model name/identifier
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get cache size (useful for testing)
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    };
  }

  /**
   * Simple string hash function
   * Same implementation as MockEmbeddingEngine for consistency
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Create a mock Ollama embedding model for testing
 *
 * @param config - Configuration matching OllamaEmbeddingModel
 * @returns Mock Ollama embedding model
 */
export function createMockOllamaModel(config: {
  host: string;
  modelName: string;
  dimension: number;
  timeout?: number;
  maxRetries?: number;
  useCachedEmbeddings?: boolean;
}): MockOllamaEmbeddingModel {
  return new MockOllamaEmbeddingModel(config);
}

// Re-export utilities from related modules for convenience
export {
  COMMON_TEST_STRINGS,
  getCachedEmbedding,
  getCachedTexts,
  getCacheMetadata,
  hasCachedEmbedding,
} from "./ollama-embeddings-cache";

export {
  checkOllamaAvailability,
  clearOllamaStatusCache,
  DEFAULT_OLLAMA_HOST,
  getCachedOllamaStatus,
  getEmbeddingModelConfig,
  isModelAvailable,
  shouldUseRealOllama,
  type OllamaStatus,
} from "./ollama-detector";

export {
  createHybridEmbeddingModel,
  createTestEmbeddingModel,
  getIntegrationTestModel,
  getUnitTestModel,
  type EmbeddingModel,
  type HybridEmbeddingConfig,
  type HybridModelResult,
} from "./hybrid-embedding-model";
