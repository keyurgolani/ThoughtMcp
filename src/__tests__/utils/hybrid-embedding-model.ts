/**
 * Hybrid Embedding Model
 *
 * Provides a unified interface that automatically switches between:
 * - Real Ollama embeddings when server is available
 * - Mock embeddings (with cached Ollama data) when server is unavailable
 *
 * This ensures tests can run in any environment while maintaining
 * consistency with real Ollama outputs when possible.
 */

import { OllamaEmbeddingModel } from "../../embeddings/models/ollama-model";
import { MockOllamaEmbeddingModel } from "./mock-embeddings";
import { checkOllamaAvailability, DEFAULT_OLLAMA_HOST, isModelAvailable } from "./ollama-detector";

/**
 * Configuration for hybrid embedding model
 */
export interface HybridEmbeddingConfig {
  host?: string;
  modelName?: string;
  dimension?: number;
  timeout?: number;
  maxRetries?: number;
  preferReal?: boolean; // If true, prefer real Ollama when available
  forceMode?: "real" | "mock"; // Force a specific mode
}

/**
 * Embedding model interface (common to both real and mock)
 */
export interface EmbeddingModel {
  generate(text: string): Promise<number[]>;
  getDimension(): number;
  getModelName(): string;
}

/**
 * Result of model initialization
 */
export interface HybridModelResult {
  model: EmbeddingModel;
  mode: "real" | "mock";
  reason: string;
}

/**
 * Create a hybrid embedding model that uses real Ollama when available
 *
 * @param config - Configuration options
 * @returns Promise resolving to model and mode information
 */
export async function createHybridEmbeddingModel(
  config: HybridEmbeddingConfig = {}
): Promise<HybridModelResult> {
  const {
    host = process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST,
    modelName = process.env.EMBEDDING_MODEL ?? "nomic-embed-text",
    dimension = parseInt(process.env.EMBEDDING_DIMENSION ?? "768", 10),
    timeout = 30000,
    maxRetries = 3,
    preferReal = true,
    forceMode,
  } = config;

  // Handle forced mode
  if (forceMode === "mock") {
    return {
      model: new MockOllamaEmbeddingModel({
        host,
        modelName,
        dimension,
        timeout,
        maxRetries,
        useCachedEmbeddings: true,
      }),
      mode: "mock",
      reason: "Forced mock mode",
    };
  }

  if (forceMode === "real") {
    return {
      model: new OllamaEmbeddingModel({
        host,
        modelName,
        dimension,
        timeout,
        maxRetries,
      }),
      mode: "real",
      reason: "Forced real mode",
    };
  }

  // Check environment variables
  if (process.env.USE_MOCK_EMBEDDINGS === "true") {
    return {
      model: new MockOllamaEmbeddingModel({
        host,
        modelName,
        dimension,
        timeout,
        maxRetries,
        useCachedEmbeddings: true,
      }),
      mode: "mock",
      reason: "USE_MOCK_EMBEDDINGS=true",
    };
  }

  if (process.env.USE_REAL_OLLAMA === "true") {
    return {
      model: new OllamaEmbeddingModel({
        host,
        modelName,
        dimension,
        timeout,
        maxRetries,
      }),
      mode: "real",
      reason: "USE_REAL_OLLAMA=true",
    };
  }

  // Auto-detect if preferReal is enabled
  if (preferReal) {
    const status = await checkOllamaAvailability(host, 2000);

    if (status.available) {
      const modelAvailable = await isModelAvailable(modelName, host);

      if (modelAvailable) {
        return {
          model: new OllamaEmbeddingModel({
            host,
            modelName,
            dimension,
            timeout,
            maxRetries,
          }),
          mode: "real",
          reason: `Ollama available at ${host} with model ${modelName}`,
        };
      } else {
        return {
          model: new MockOllamaEmbeddingModel({
            host,
            modelName,
            dimension,
            timeout,
            maxRetries,
            useCachedEmbeddings: true,
          }),
          mode: "mock",
          reason: `Model '${modelName}' not found in Ollama`,
        };
      }
    } else {
      return {
        model: new MockOllamaEmbeddingModel({
          host,
          modelName,
          dimension,
          timeout,
          maxRetries,
          useCachedEmbeddings: true,
        }),
        mode: "mock",
        reason: `Ollama not available: ${status.error}`,
      };
    }
  }

  // Default to mock
  return {
    model: new MockOllamaEmbeddingModel({
      host,
      modelName,
      dimension,
      timeout,
      maxRetries,
      useCachedEmbeddings: true,
    }),
    mode: "mock",
    reason: "Default to mock mode",
  };
}

/**
 * Create embedding model for tests with automatic mode selection
 *
 * Convenience function that logs the mode being used
 *
 * @param config - Configuration options
 * @param silent - If true, don't log mode information
 * @returns Promise resolving to embedding model
 */
export async function createTestEmbeddingModel(
  config: HybridEmbeddingConfig = {},
  silent: boolean = false
): Promise<EmbeddingModel> {
  const result = await createHybridEmbeddingModel(config);

  if (!silent && process.env.NODE_ENV !== "test") {
    console.log(`[Embedding] Using ${result.mode} mode: ${result.reason}`);
  }

  return result.model;
}

/**
 * Get embedding model for integration tests
 *
 * Integration tests should use real Ollama when available
 * to ensure realistic behavior
 *
 * @param config - Configuration options
 * @returns Promise resolving to model result
 */
export async function getIntegrationTestModel(
  config: HybridEmbeddingConfig = {}
): Promise<HybridModelResult> {
  return createHybridEmbeddingModel({
    ...config,
    preferReal: true,
  });
}

/**
 * Get embedding model for unit tests
 *
 * Unit tests should always use mock to ensure
 * fast, deterministic, isolated tests
 *
 * @param config - Configuration options
 * @returns Mock embedding model
 */
export function getUnitTestModel(config: HybridEmbeddingConfig = {}): MockOllamaEmbeddingModel {
  const {
    host = DEFAULT_OLLAMA_HOST,
    modelName = "nomic-embed-text",
    dimension = 768,
    timeout = 30000,
    maxRetries = 3,
  } = config;

  return new MockOllamaEmbeddingModel({
    host,
    modelName,
    dimension,
    timeout,
    maxRetries,
    useCachedEmbeddings: true,
  });
}
