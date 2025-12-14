/**
 * Tests for Hybrid Embedding Model
 *
 * Verifies the hybrid embedding model correctly switches between
 * real Ollama and mock embeddings based on availability.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createHybridEmbeddingModel, getUnitTestModel } from "../../utils/hybrid-embedding-model";
import { MockOllamaEmbeddingModel } from "../../utils/mock-embeddings";
import { clearOllamaStatusCache } from "../../utils/ollama-detector";

describe("Hybrid Embedding Model", () => {
  beforeEach(() => {
    // Clear cached Ollama status between tests
    clearOllamaStatusCache();
    // Reset environment variables
    delete process.env.USE_MOCK_EMBEDDINGS;
    delete process.env.USE_REAL_OLLAMA;
  });

  describe("getUnitTestModel", () => {
    it("should return a MockOllamaEmbeddingModel", () => {
      const model = getUnitTestModel();

      expect(model).toBeInstanceOf(MockOllamaEmbeddingModel);
      expect(model.getDimension()).toBe(768);
      expect(model.getModelName()).toBe("nomic-embed-text");
    });

    it("should respect custom configuration", () => {
      const model = getUnitTestModel({
        modelName: "custom-model",
        dimension: 1024,
      });

      expect(model.getDimension()).toBe(1024);
      expect(model.getModelName()).toBe("custom-model");
    });

    it("should generate deterministic embeddings", async () => {
      const model = getUnitTestModel();

      const embedding1 = await model.generate("test text");
      const embedding2 = await model.generate("test text");

      expect(embedding1).toEqual(embedding2);
      expect(embedding1.length).toBe(768);
    });

    it("should generate different embeddings for different text", async () => {
      const model = getUnitTestModel();

      const embedding1 = await model.generate("first text");
      const embedding2 = await model.generate("second text");

      expect(embedding1).not.toEqual(embedding2);
    });
  });

  describe("createHybridEmbeddingModel", () => {
    it("should return mock mode when USE_MOCK_EMBEDDINGS is true", async () => {
      process.env.USE_MOCK_EMBEDDINGS = "true";

      const result = await createHybridEmbeddingModel();

      expect(result.mode).toBe("mock");
      expect(result.reason).toBe("USE_MOCK_EMBEDDINGS=true");
    });

    it("should return real mode when USE_REAL_OLLAMA is true", async () => {
      process.env.USE_REAL_OLLAMA = "true";

      const result = await createHybridEmbeddingModel();

      expect(result.mode).toBe("real");
      expect(result.reason).toBe("USE_REAL_OLLAMA=true");
    });

    it("should return mock mode when forceMode is mock", async () => {
      const result = await createHybridEmbeddingModel({ forceMode: "mock" });

      expect(result.mode).toBe("mock");
      expect(result.reason).toBe("Forced mock mode");
    });

    it("should return real mode when forceMode is real", async () => {
      const result = await createHybridEmbeddingModel({ forceMode: "real" });

      expect(result.mode).toBe("real");
      expect(result.reason).toBe("Forced real mode");
    });

    it("should respect custom configuration in mock mode", async () => {
      const result = await createHybridEmbeddingModel({
        forceMode: "mock",
        modelName: "custom-model",
        dimension: 512,
      });

      expect(result.model.getDimension()).toBe(512);
      expect(result.model.getModelName()).toBe("custom-model");
    });
  });

  describe("MockOllamaEmbeddingModel with cache", () => {
    it("should track cache statistics", async () => {
      const model = getUnitTestModel();

      // Generate some embeddings
      await model.generate("text 1");
      await model.generate("text 2");
      await model.generate("text 1"); // Should hit local cache

      const stats = model.getCacheStats();

      // All should be misses from the pre-computed cache (no cache file exists yet)
      // but the local cache should have 2 entries
      expect(model.getCacheSize()).toBe(2);
      expect(stats.misses).toBeGreaterThanOrEqual(2);
    });

    it("should clear cache and statistics", async () => {
      const model = getUnitTestModel();

      await model.generate("test");
      expect(model.getCacheSize()).toBe(1);

      model.clearCache();

      expect(model.getCacheSize()).toBe(0);
      const stats = model.getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it("should validate input like real OllamaEmbeddingModel", async () => {
      const model = getUnitTestModel();

      await expect(model.generate("")).rejects.toThrow();
      await expect(model.generate("   ")).rejects.toThrow();
      await expect(model.generate(null as unknown as string)).rejects.toThrow();
    });

    it("should return normalized unit vectors", async () => {
      const model = getUnitTestModel();

      const embedding = await model.generate("test text");

      // Calculate magnitude
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));

      // Should be approximately 1 (unit vector)
      expect(magnitude).toBeCloseTo(1, 5);
    });
  });
});
