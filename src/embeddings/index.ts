/**
 * Embeddings Module
 *
 * Five-sector embedding generation system for Hierarchical Memory Decomposition (HMD).
 * Exports all public APIs for embedding generation, caching, and model management.
 */

// Core engine
export { EmbeddingEngine } from "./embedding-engine";

// Storage
export { EmbeddingStorage } from "./embedding-storage";

// Cache
export { EmbeddingCache, generateCacheKey } from "./cache";

// Models
export { BaseEmbeddingModel } from "./models/base-model";
export { OllamaEmbeddingModel } from "./models/ollama-model";

// Types
export type {
  EmbeddingConfig,
  EmbeddingModel,
  EmotionState,
  EmbeddingCache as IEmbeddingCache,
  MemoryContent,
  MemorySector,
  SectorEmbeddings,
  SectorWeights,
  SimilarityResult,
  TemporalContext,
} from "./types";

export { EmbeddingError, NetworkError, TimeoutError, ValidationError } from "./types";
