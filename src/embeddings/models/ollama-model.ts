/**
 * Ollama Embedding Model
 *
 * Implementation of embedding model using Ollama for local embedding generation.
 * Supports various embedding models (nomic-embed-text, mxbai-embed-large, etc.)
 * with automatic retry logic and timeout handling.
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
 * Ollama API response format
 */
interface OllamaEmbeddingResponse {
  embedding: number[];
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
}
