/**
 * Base Embedding Model
 *
 * Abstract base class for all embedding model implementations.
 * Provides common functionality including input validation, timeout handling,
 * and retry logic with exponential backoff.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { TimeoutError, ValidationError, type EmbeddingModel } from "../types";

/**
 * Abstract base class for embedding models
 */
export abstract class BaseEmbeddingModel implements EmbeddingModel {
  protected readonly timeout: number;
  protected readonly maxRetries: number;

  constructor(timeout: number = 30000, maxRetries: number = 3) {
    this.timeout = timeout;
    this.maxRetries = maxRetries;
  }

  /**
   * Generate embedding vector for text
   * Subclasses must implement this method
   */
  abstract generate(text: string): Promise<number[]>;

  /**
   * Get embedding dimension for this model
   * Subclasses must implement this method
   */
  abstract getDimension(): number;

  /**
   * Get model name/identifier
   * Subclasses must implement this method
   */
  abstract getModelName(): string;

  /**
   * Validate input text
   * @throws ValidationError if text is invalid
   */
  protected validateInput(text: string): void {
    if (!text || typeof text !== "string") {
      throw new ValidationError("Text must be a non-empty string", "text", text);
    }

    if (text.trim().length === 0) {
      throw new ValidationError("Text cannot be empty or whitespace only", "text", text);
    }

    // Reasonable length check (100k characters max)
    if (text.length > 100000) {
      throw new ValidationError(
        "Text exceeds maximum length of 100,000 characters",
        "text",
        text.length
      );
    }
  }

  /**
   * Execute operation with timeout
   */
  protected async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number = this.timeout
  ): Promise<T> {
    return Promise.race([
      operation,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`, timeoutMs)),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Execute operation with retry logic and exponential backoff
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on validation errors
        if (error instanceof ValidationError) {
          throw error;
        }

        // Don't retry if this was the last attempt
        if (attempt === retries) {
          break;
        }

        // Exponential backoff: 100ms, 200ms, 400ms, etc.
        const delay = 100 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
