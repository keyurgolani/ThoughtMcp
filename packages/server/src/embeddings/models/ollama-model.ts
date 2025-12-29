/**
 * Ollama Embedding Model
 *
 * Implementation of embedding model using Ollama for local embedding generation.
 * Supports various embedding models (nomic-embed-text, mxbai-embed-large, etc.)
 * with automatic retry logic and timeout handling.
 *
 * Performance optimization: Supports batch embedding generation via /api/embed
 * endpoint to reduce network round-trips (5 texts in 1 request vs 5 requests).
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { EmbeddingError, NetworkError } from "../types";
import { BaseEmbeddingModel } from "./base-model";

/**
 * Configuration for Ollama embedding model
 */
export interface OllamaConfig {
  host: string;
  modelName: string;
  dimension: number;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Ollama API response format for single embedding (legacy /api/embeddings endpoint)
 */
interface OllamaEmbeddingResponse {
  embedding: number[];
}

/**
 * Ollama API response format for batch embeddings (/api/embed endpoint)
 */
interface OllamaBatchEmbeddingResponse {
  embeddings: number[][];
}

/**
 * Ollama embedding model implementation
 */
export class OllamaEmbeddingModel extends BaseEmbeddingModel {
  private readonly host: string;
  private readonly modelName: string;
  private readonly dimension: number;

  constructor(config: OllamaConfig) {
    super(config.timeout, config.maxRetries);
    this.host = config.host;
    this.modelName = config.modelName;
    this.dimension = config.dimension;
  }

  /**
   * Generate embedding vector for text using Ollama API
   */
  async generate(text: string): Promise<number[]> {
    this.validateInput(text);

    return this.withRetry(async () => {
      return this.withTimeout(this.callOllamaAPI(text));
    });
  }

  /**
   * Generate embeddings for multiple texts in a single batch request
   *
   * This is significantly faster than calling generate() multiple times
   * because it reduces network round-trips from N to 1.
   *
   * Performance: ~200-300ms for batch vs ~1000-1500ms for 5 sequential calls
   *
   * @param texts - Array of texts to generate embeddings for
   * @returns Array of embedding vectors in the same order as input texts
   */
  async generateBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Validate all inputs
    for (const text of texts) {
      this.validateInput(text);
    }

    return this.withRetry(async () => {
      return this.withTimeout(this.callOllamaBatchAPI(texts));
    });
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
   * Normalize embedding vector to unit length
   * This ensures embeddings are suitable for cosine similarity calculations
   */
  private normalizeEmbedding(embedding: number[]): number[] {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));

    // Avoid division by zero
    if (magnitude === 0) {
      return embedding;
    }

    return embedding.map((val) => val / magnitude);
  }

  /**
   * Call Ollama API to generate embedding
   */
  private async callOllamaAPI(text: string): Promise<number[]> {
    const endpoint = `${this.host}/api/embeddings`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt: text,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new NetworkError(
            `Model '${this.modelName}' not found. Please ensure the model is pulled in Ollama.`,
            endpoint,
            response.status
          );
        }

        throw new NetworkError(
          `Ollama API request failed with status ${response.status}: ${response.statusText}`,
          endpoint,
          response.status
        );
      }

      const data = (await response.json()) as OllamaEmbeddingResponse;

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new EmbeddingError(
          "Invalid response format from Ollama API: missing or invalid 'embedding' field",
          "INVALID_RESPONSE",
          { response: data }
        );
      }

      if (data.embedding.length !== this.dimension) {
        throw new EmbeddingError(
          `Embedding dimension mismatch: expected ${this.dimension}, got ${data.embedding.length}`,
          "DIMENSION_MISMATCH",
          { expected: this.dimension, actual: data.embedding.length }
        );
      }

      // Normalize embedding to unit vector for cosine similarity
      return this.normalizeEmbedding(data.embedding);
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof NetworkError || error instanceof EmbeddingError) {
        throw error;
      }

      // Handle fetch errors (network issues, connection refused, etc.)
      if (error instanceof TypeError) {
        throw new NetworkError(
          `Failed to connect to Ollama at ${this.host}: ${error.message}`,
          endpoint
        );
      }

      // Unknown error
      throw new EmbeddingError(
        `Unexpected error calling Ollama API: ${error instanceof Error ? error.message : String(error)}`,
        "UNKNOWN_ERROR",
        { originalError: error }
      );
    }
  }

  /**
   * Call Ollama batch API to generate multiple embeddings in a single request
   *
   * Uses the /api/embed endpoint which accepts an array of inputs and returns
   * an array of embeddings. This is more efficient than multiple single requests.
   */
  private async callOllamaBatchAPI(texts: string[]): Promise<number[][]> {
    const endpoint = `${this.host}/api/embed`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.modelName,
          input: texts,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new NetworkError(
            `Model '${this.modelName}' not found. Please ensure the model is pulled in Ollama.`,
            endpoint,
            response.status
          );
        }

        throw new NetworkError(
          `Ollama batch API request failed with status ${response.status}: ${response.statusText}`,
          endpoint,
          response.status
        );
      }

      const data = (await response.json()) as OllamaBatchEmbeddingResponse;

      if (!data.embeddings || !Array.isArray(data.embeddings)) {
        throw new EmbeddingError(
          "Invalid response format from Ollama batch API: missing or invalid 'embeddings' field",
          "INVALID_RESPONSE",
          { response: data }
        );
      }

      if (data.embeddings.length !== texts.length) {
        throw new EmbeddingError(
          `Embedding count mismatch: expected ${texts.length}, got ${data.embeddings.length}`,
          "COUNT_MISMATCH",
          { expected: texts.length, actual: data.embeddings.length }
        );
      }

      // Validate and normalize each embedding
      const normalizedEmbeddings: number[][] = [];
      for (let i = 0; i < data.embeddings.length; i++) {
        const embedding = data.embeddings[i];

        if (!Array.isArray(embedding)) {
          throw new EmbeddingError(
            `Invalid embedding at index ${i}: not an array`,
            "INVALID_EMBEDDING",
            { index: i }
          );
        }

        if (embedding.length !== this.dimension) {
          throw new EmbeddingError(
            `Embedding dimension mismatch at index ${i}: expected ${this.dimension}, got ${embedding.length}`,
            "DIMENSION_MISMATCH",
            { index: i, expected: this.dimension, actual: embedding.length }
          );
        }

        // Note: /api/embed returns L2-normalized vectors, but we normalize anyway for consistency
        normalizedEmbeddings.push(this.normalizeEmbedding(embedding));
      }

      return normalizedEmbeddings;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof NetworkError || error instanceof EmbeddingError) {
        throw error;
      }

      // Handle fetch errors (network issues, connection refused, etc.)
      if (error instanceof TypeError) {
        throw new NetworkError(
          `Failed to connect to Ollama at ${this.host}: ${error.message}`,
          endpoint
        );
      }

      // Unknown error
      throw new EmbeddingError(
        `Unexpected error calling Ollama batch API: ${error instanceof Error ? error.message : String(error)}`,
        "UNKNOWN_ERROR",
        { originalError: error }
      );
    }
  }
}
