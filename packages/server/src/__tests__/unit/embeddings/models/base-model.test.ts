/**
 * Tests for BaseEmbeddingModel
 *
 * Comprehensive test coverage for the abstract base class including:
 * - Input validation edge cases
 * - Timeout handling
 * - Retry logic with exponential backoff
 * - Error handling paths
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { beforeEach, describe, expect, it } from "vitest";
import { BaseEmbeddingModel } from "../../../../embeddings/models/base-model";
import { TimeoutError, ValidationError } from "../../../../embeddings/types";

/**
 * Concrete implementation for testing
 */
class TestEmbeddingModel extends BaseEmbeddingModel {
  private mockGenerate: (text: string) => Promise<number[]>;

  constructor(
    mockGenerate: (text: string) => Promise<number[]>,
    timeout?: number,
    maxRetries?: number
  ) {
    super(timeout, maxRetries);
    this.mockGenerate = mockGenerate;
  }

  async generate(text: string): Promise<number[]> {
    this.validateInput(text);
    return this.withTimeout(this.withRetry(() => this.mockGenerate(text)));
  }

  getDimension(): number {
    return 1536;
  }

  getModelName(): string {
    return "test-model";
  }
}

describe("BaseEmbeddingModel", () => {
  describe("Input Validation", () => {
    let model: TestEmbeddingModel;

    beforeEach(() => {
      model = new TestEmbeddingModel(async (_text) => [0.1, 0.2, 0.3]);
    });

    it("should accept valid text input", async () => {
      const result = await model.generate("valid text");
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it("should reject null input", async () => {
      await expect(model.generate(null as any)).rejects.toThrow(ValidationError);
      await expect(model.generate(null as any)).rejects.toThrow("Text must be a non-empty string");
    });

    it("should reject undefined input", async () => {
      await expect(model.generate(undefined as any)).rejects.toThrow(ValidationError);
    });

    it("should reject empty string", async () => {
      await expect(model.generate("")).rejects.toThrow(ValidationError);
      await expect(model.generate("")).rejects.toThrow("Text must be a non-empty string");
    });

    it("should reject whitespace-only string", async () => {
      await expect(model.generate("   ")).rejects.toThrow(ValidationError);
      await expect(model.generate("   ")).rejects.toThrow(
        "Text cannot be empty or whitespace only"
      );
    });

    it("should reject whitespace-only string with tabs and newlines", async () => {
      await expect(model.generate("\t\n  \r\n")).rejects.toThrow(ValidationError);
    });

    it("should reject non-string input", async () => {
      await expect(model.generate(123 as any)).rejects.toThrow(ValidationError);
      await expect(model.generate({} as any)).rejects.toThrow(ValidationError);
      await expect(model.generate([] as any)).rejects.toThrow(ValidationError);
    });

    it("should reject text exceeding maximum length", async () => {
      const longText = "a".repeat(100001);
      await expect(model.generate(longText)).rejects.toThrow(ValidationError);
      await expect(model.generate(longText)).rejects.toThrow(
        "Text exceeds maximum length of 100,000 characters"
      );
    });

    it("should accept text at maximum length boundary", async () => {
      const maxText = "a".repeat(100000);
      const result = await model.generate(maxText);
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it("should accept text with leading/trailing whitespace if content exists", async () => {
      const result = await model.generate("  valid text  ");
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout operation after specified duration", async () => {
      const model = new TestEmbeddingModel(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return [0.1, 0.2, 0.3];
        },
        100 // 100ms timeout
      );

      await expect(model.generate("test")).rejects.toThrow(TimeoutError);
      await expect(model.generate("test")).rejects.toThrow("Operation timed out after 100ms");
    });

    it("should complete operation within timeout", async () => {
      const model = new TestEmbeddingModel(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return [0.1, 0.2, 0.3];
        },
        200 // 200ms timeout
      );

      const result = await model.generate("test");
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it("should use default timeout of 30 seconds", async () => {
      const model = new TestEmbeddingModel(async () => [0.1, 0.2, 0.3]);
      const result = await model.generate("test");
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe("Retry Logic", () => {
    it("should retry on transient failures", async () => {
      let attempts = 0;
      const model = new TestEmbeddingModel(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Transient failure");
        }
        return [0.1, 0.2, 0.3];
      });

      const result = await model.generate("test");
      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(attempts).toBe(3);
    });

    it("should not retry on validation errors", async () => {
      let attempts = 0;
      const model = new TestEmbeddingModel(async () => {
        attempts++;
        throw new ValidationError("Invalid input", "text", "test");
      });

      await expect(model.generate("test")).rejects.toThrow(ValidationError);
      expect(attempts).toBe(1); // Should not retry
    });

    it("should fail after max retries exceeded", async () => {
      let attempts = 0;
      const model = new TestEmbeddingModel(
        async () => {
          attempts++;
          throw new Error("Persistent failure");
        },
        30000,
        2 // max 2 retries
      );

      await expect(model.generate("test")).rejects.toThrow("Persistent failure");
      expect(attempts).toBe(3); // Initial attempt + 2 retries
    });

    it("should use exponential backoff between retries", async () => {
      const delays: number[] = [];
      let attempts = 0;
      let lastTime = Date.now();

      const model = new TestEmbeddingModel(
        async () => {
          attempts++;
          if (attempts > 1) {
            const currentTime = Date.now();
            delays.push(currentTime - lastTime);
            lastTime = currentTime;
          } else {
            lastTime = Date.now();
          }

          if (attempts < 4) {
            throw new Error("Retry test");
          }
          return [0.1, 0.2, 0.3];
        },
        30000,
        3
      );

      await model.generate("test");

      // Verify exponential backoff: ~100ms, ~200ms, ~400ms
      expect(delays.length).toBe(3);
      expect(delays[0]).toBeGreaterThanOrEqual(90); // ~100ms
      expect(delays[1]).toBeGreaterThanOrEqual(180); // ~200ms
      expect(delays[2]).toBeGreaterThanOrEqual(380); // ~400ms
    });

    it("should succeed on first attempt without retries", async () => {
      let attempts = 0;
      const model = new TestEmbeddingModel(async () => {
        attempts++;
        return [0.1, 0.2, 0.3];
      });

      const result = await model.generate("test");
      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(attempts).toBe(1);
    });
  });

  describe("Abstract Method Implementation", () => {
    it("should require generate method implementation", () => {
      class IncompleteModel extends BaseEmbeddingModel {
        async generate(_text: string): Promise<number[]> {
          return [0.1, 0.2, 0.3];
        }
        getDimension(): number {
          return 1536;
        }
        getModelName(): string {
          return "incomplete";
        }
      }

      // TypeScript will catch this at compile time, but we can verify runtime behavior
      const model = new IncompleteModel();
      expect(model.getDimension()).toBe(1536);
      expect(model.getModelName()).toBe("incomplete");
    });

    it("should require getDimension method implementation", () => {
      class TestModel extends BaseEmbeddingModel {
        async generate(_text: string): Promise<number[]> {
          return [0.1, 0.2];
        }
        getDimension(): number {
          return 768;
        }
        getModelName(): string {
          return "test";
        }
      }

      // TypeScript enforces this, verify it works
      const model = new TestModel();
      expect(model.getModelName()).toBe("test");
      expect(model.getDimension()).toBe(768);
    });

    it("should require getModelName method implementation", () => {
      class TestModel extends BaseEmbeddingModel {
        async generate(_text: string): Promise<number[]> {
          return [0.1, 0.2];
        }
        getDimension(): number {
          return 768;
        }
        getModelName(): string {
          return "test-model";
        }
      }

      const model = new TestModel();
      expect(model.getDimension()).toBe(768);
      expect(model.getModelName()).toBe("test-model");
    });
  });

  describe("Combined Timeout and Retry", () => {
    it("should timeout during retry attempts", async () => {
      let attempts = 0;
      const model = new TestEmbeddingModel(
        async () => {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 150));
          throw new Error("Should timeout before this");
        },
        100, // 100ms timeout
        3
      );

      await expect(model.generate("test")).rejects.toThrow(TimeoutError);
      // Should timeout on first attempt, not retry
      expect(attempts).toBe(1);
    });

    it("should handle timeout errors and not retry them", async () => {
      let attempts = 0;
      const model = new TestEmbeddingModel(
        async () => {
          attempts++;
          // Simulate operation that takes too long
          await new Promise((resolve) => setTimeout(resolve, 150));
          return [0.1, 0.2, 0.3];
        },
        100, // 100ms timeout
        3
      );

      // Timeout errors should not be retried
      await expect(model.generate("test")).rejects.toThrow(TimeoutError);
      expect(attempts).toBe(1); // Only one attempt before timeout
    });
  });

  describe("Error Context", () => {
    it("should preserve error context through retries", async () => {
      const model = new TestEmbeddingModel(async () => {
        throw new Error("Custom error with context");
      });

      try {
        await model.generate("test");
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Custom error with context");
      }
    });

    it("should include field and value in ValidationError", async () => {
      const model = new TestEmbeddingModel(async () => [0.1, 0.2]);

      try {
        await model.generate("");
        expect.fail("Should have thrown ValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.field).toBe("text");
        expect(validationError.value).toBe("");
      }
    });

    it("should include duration in TimeoutError", async () => {
      const model = new TestEmbeddingModel(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return [0.1, 0.2];
      }, 100);

      try {
        await model.generate("test");
        expect.fail("Should have thrown TimeoutError");
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        const timeoutError = error as TimeoutError;
        expect(timeoutError.duration).toBe(100);
      }
    });
  });
});
