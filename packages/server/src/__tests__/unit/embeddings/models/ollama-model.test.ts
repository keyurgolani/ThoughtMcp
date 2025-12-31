/**
 * Tests for OllamaEmbeddingModel
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { OllamaEmbeddingModel } from "../../../../embeddings/models/ollama-model";
import {
  EmbeddingError,
  NetworkError,
  TimeoutError,
  ValidationError,
} from "../../../../embeddings/types";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("OllamaEmbeddingModel", () => {
  const defaultConfig = {
    host: "http://localhost:11434",
    modelName: "nomic-embed-text",
    dimension: 768,
    timeout: 30000,
    maxRetries: 3,
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("Constructor", () => {
    it("should create model with valid configuration", () => {
      const model = new OllamaEmbeddingModel(defaultConfig);
      expect(model.getDimension()).toBe(768);
      expect(model.getModelName()).toBe("nomic-embed-text");
    });
  });

  describe("Successful Generation", () => {
    it("should generate and normalize embedding", async () => {
      const rawEmbedding = new Array(768).fill(0).map((_, i) => (i === 0 ? 3 : i === 1 ? 4 : 0));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ embedding: rawEmbedding }),
      });

      const model = new OllamaEmbeddingModel(defaultConfig);
      const result = await model.generate("test text");

      expect(result).toHaveLength(768);
      expect(result[0]).toBeCloseTo(0.6, 5);
      expect(result[1]).toBeCloseTo(0.8, 5);
    });

    it("should call API with correct parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ embedding: new Array(768).fill(0.1) }),
      });

      const model = new OllamaEmbeddingModel(defaultConfig);
      await model.generate("test text");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/embeddings",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });

  describe("Input Validation", () => {
    it("should reject empty string", async () => {
      const model = new OllamaEmbeddingModel(defaultConfig);
      await expect(model.generate("")).rejects.toThrow(ValidationError);
    });

    it("should reject null input", async () => {
      const model = new OllamaEmbeddingModel(defaultConfig);
      await expect(model.generate(null as any)).rejects.toThrow(ValidationError);
    });
  });

  describe("HTTP Errors", () => {
    it("should handle 404 model not found", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({}),
      } as Response);

      const model = new OllamaEmbeddingModel(defaultConfig);

      const error = await model.generate("test").catch((e) => e);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toContain("Model 'nomic-embed-text' not found");
    });

    it("should handle 500 error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      } as Response);

      const model = new OllamaEmbeddingModel(defaultConfig);

      const error = await model.generate("test").catch((e) => e);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toContain("status 500");
    });

    it("should handle 503 service unavailable", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => ({}),
      } as Response);

      const model = new OllamaEmbeddingModel(defaultConfig);

      const error = await model.generate("test").catch((e) => e);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toContain("status 503");
    });
  });

  describe("Invalid Responses", () => {
    it("should handle missing embedding field", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      const model = new OllamaEmbeddingModel(defaultConfig);

      const error = await model.generate("test").catch((e) => e);
      expect(error).toBeInstanceOf(EmbeddingError);
      expect(error.message).toContain("Invalid response format");
    });

    it("should handle non-array embedding field", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ embedding: "not an array" }),
      } as Response);

      const model = new OllamaEmbeddingModel(defaultConfig);

      const error = await model.generate("test").catch((e) => e);
      expect(error).toBeInstanceOf(EmbeddingError);
      expect(error.message).toContain("Invalid response format");
    });

    it("should handle dimension mismatch", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ embedding: [0.1, 0.2] }),
      } as Response);

      const model = new OllamaEmbeddingModel(defaultConfig);

      const error = await model.generate("test").catch((e) => e);
      expect(error).toBeInstanceOf(EmbeddingError);
      expect(error.message).toContain("dimension mismatch");
    });
  });

  describe("Network Errors", () => {
    it("should handle connection refused", async () => {
      mockFetch.mockRejectedValue(new TypeError("fetch failed"));

      const model = new OllamaEmbeddingModel(defaultConfig);

      const error = await model.generate("test").catch((e) => e);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toContain("Failed to connect");
    });

    it("should handle timeout", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  json: async () => ({ embedding: new Array(768).fill(0.1) }),
                } as Response),
              200
            )
          )
      );

      const model = new OllamaEmbeddingModel({
        ...defaultConfig,
        timeout: 100,
      });

      const error = await model.generate("test").catch((e) => e);
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.message).toContain("timed out");
    });

    it("should handle unknown errors", async () => {
      mockFetch.mockRejectedValue(new Error("Unknown error"));

      const model = new OllamaEmbeddingModel(defaultConfig);

      const error = await model.generate("test").catch((e) => e);
      expect(error).toBeInstanceOf(EmbeddingError);
      expect(error.message).toContain("Unexpected error");
    });
  });

  describe("Retry Logic", () => {
    it("should retry on transient failures", async () => {
      let attempts = 0;
      mockFetch.mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new TypeError("Network error");
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ embedding: new Array(768).fill(0.1) }),
        };
      });

      const model = new OllamaEmbeddingModel(defaultConfig);
      const result = await model.generate("test");

      expect(result).toHaveLength(768);
      expect(attempts).toBe(3);
    });

    it("should fail after max retries", async () => {
      mockFetch.mockRejectedValue(new TypeError("Persistent error"));

      const model = new OllamaEmbeddingModel({
        ...defaultConfig,
        maxRetries: 2,
      });

      await expect(model.generate("test")).rejects.toThrow(NetworkError);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("Normalization", () => {
    it("should normalize to unit vector", async () => {
      const rawEmbedding = [2, 2, 1];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ embedding: rawEmbedding }),
      });

      const model = new OllamaEmbeddingModel({ ...defaultConfig, dimension: 3 });
      const result = await model.generate("test");

      const magnitude = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it("should handle zero-magnitude embedding", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ embedding: [0, 0, 0] }),
      });

      const model = new OllamaEmbeddingModel({ ...defaultConfig, dimension: 3 });
      const result = await model.generate("test");

      expect(result).toEqual([0, 0, 0]);
    });
  });

  describe("Batch Generation", () => {
    it("should return empty array for empty input", async () => {
      const model = new OllamaEmbeddingModel(defaultConfig);
      const result = await model.generateBatch([]);
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should generate embeddings for multiple texts", async () => {
      const embeddings = [new Array(768).fill(0.1), new Array(768).fill(0.2)];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ embeddings }),
      });

      const model = new OllamaEmbeddingModel(defaultConfig);
      const result = await model.generateBatch(["text1", "text2"]);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(768);
      expect(result[1]).toHaveLength(768);
    });

    it("should call batch API with correct parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ embeddings: [new Array(768).fill(0.1)] }),
      });

      const model = new OllamaEmbeddingModel(defaultConfig);
      await model.generateBatch(["test text"]);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/embed",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "nomic-embed-text",
            input: ["test text"],
          }),
        })
      );
    });

    it("should validate all inputs before batch processing", async () => {
      const model = new OllamaEmbeddingModel(defaultConfig);
      await expect(model.generateBatch(["valid", ""])).rejects.toThrow(ValidationError);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle 404 model not found in batch", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({}),
      } as Response);

      const model = new OllamaEmbeddingModel(defaultConfig);
      const error = await model.generateBatch(["test"]).catch((e) => e);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toContain("Model 'nomic-embed-text' not found");
    });

    it("should handle non-404 HTTP errors in batch", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      } as Response);

      const model = new OllamaEmbeddingModel(defaultConfig);
      const error = await model.generateBatch(["test"]).catch((e) => e);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toContain("status 500");
    });

    it("should handle missing embeddings field in batch response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      const model = new OllamaEmbeddingModel(defaultConfig);
      const error = await model.generateBatch(["test"]).catch((e) => e);
      expect(error).toBeInstanceOf(EmbeddingError);
      expect(error.message).toContain("missing or invalid 'embeddings' field");
    });

    it("should handle embedding count mismatch", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ embeddings: [new Array(768).fill(0.1)] }),
      } as Response);

      const model = new OllamaEmbeddingModel(defaultConfig);
      const error = await model.generateBatch(["text1", "text2"]).catch((e) => e);
      expect(error).toBeInstanceOf(EmbeddingError);
      expect(error.message).toContain("Embedding count mismatch");
    });

    it("should handle non-array embedding in batch", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ embeddings: ["not an array"] }),
      } as Response);

      const model = new OllamaEmbeddingModel(defaultConfig);
      const error = await model.generateBatch(["test"]).catch((e) => e);
      expect(error).toBeInstanceOf(EmbeddingError);
      expect(error.message).toContain("not an array");
    });

    it("should handle dimension mismatch in batch", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ embeddings: [[0.1, 0.2]] }),
      } as Response);

      const model = new OllamaEmbeddingModel(defaultConfig);
      const error = await model.generateBatch(["test"]).catch((e) => e);
      expect(error).toBeInstanceOf(EmbeddingError);
      expect(error.message).toContain("dimension mismatch");
    });

    it("should handle connection errors in batch", async () => {
      mockFetch.mockRejectedValue(new TypeError("fetch failed"));

      const model = new OllamaEmbeddingModel(defaultConfig);
      const error = await model.generateBatch(["test"]).catch((e) => e);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toContain("Failed to connect");
    });

    it("should handle unknown errors in batch", async () => {
      mockFetch.mockRejectedValue(new Error("Unknown error"));

      const model = new OllamaEmbeddingModel(defaultConfig);
      const error = await model.generateBatch(["test"]).catch((e) => e);
      expect(error).toBeInstanceOf(EmbeddingError);
      expect(error.message).toContain("Unexpected error");
    });

    it("should normalize all embeddings in batch", async () => {
      const rawEmbeddings = [
        [3, 4, 0],
        [0, 3, 4],
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ embeddings: rawEmbeddings }),
      });

      const model = new OllamaEmbeddingModel({ ...defaultConfig, dimension: 3 });
      const result = await model.generateBatch(["text1", "text2"]);

      // Check both embeddings are normalized
      for (const embedding of result) {
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        expect(magnitude).toBeCloseTo(1.0, 5);
      }
    });
  });
});
