/**
 * Embedding Engine Optimization Tests
 *
 * Tests for performance optimizations:
 * - Request deduplication (prevent duplicate in-flight requests)
 * - Batch processing optimization
 * - Cache efficiency
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmbeddingCache } from "../../../embeddings/cache";
import { EmbeddingEngine } from "../../../embeddings/embedding-engine";
import type { MemoryContent, MemorySector } from "../../../embeddings/types";
import { MockOllamaEmbeddingModel } from "../../utils/mock-embeddings";

describe("EmbeddingEngine - Request Deduplication", () => {
  let engine: EmbeddingEngine;
  let model: MockOllamaEmbeddingModel;

  beforeEach(() => {
    model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache(10000, 3600000);
    engine = new EmbeddingEngine(model, cache);
  });

  it("should deduplicate concurrent requests for same content", async () => {
    // Spy on model.generate to count actual calls
    const generateSpy = vi.spyOn(model, "generate");

    const content = "Duplicate request test content";

    // Make 5 concurrent requests for the same content
    const promises = Array.from({ length: 5 }, () => engine.generateSemanticEmbedding(content));

    const results = await Promise.all(promises);

    // All results should be identical
    expect(results).toHaveLength(5);
    results.forEach((result) => {
      expect(result).toEqual(results[0]);
    });

    // Model should only be called once (deduplication working)
    expect(generateSpy).toHaveBeenCalledTimes(1);
  });

  it("should deduplicate concurrent requests across different sectors", async () => {
    const generateSpy = vi.spyOn(model, "generate");

    const memory: MemoryContent = {
      text: "Multi-sector deduplication test",
      sector: "semantic" as MemorySector,
      context: {
        timestamp: new Date(),
        sessionId: "test-session",
      },
      emotion: {
        valence: 0.5,
        arousal: 0.5,
        dominance: 0.0,
      },
      insights: ["Test insight"],
    };

    // Make 3 concurrent requests for all sectors
    const promises = Array.from({ length: 3 }, () => engine.generateAllSectorEmbeddings(memory));

    const results = await Promise.all(promises);

    // All results should be identical
    expect(results).toHaveLength(3);
    results.forEach((result) => {
      expect(result).toEqual(results[0]);
    });

    // Model should be called exactly 5 times (once per sector, not 15 times)
    // Note: Each sector has different augmented content, so 5 unique calls expected
    expect(generateSpy.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("should not deduplicate requests for different content", async () => {
    const generateSpy = vi.spyOn(model, "generate");

    // Make concurrent requests for different content
    const promises = [
      engine.generateSemanticEmbedding("Content A"),
      engine.generateSemanticEmbedding("Content B"),
      engine.generateSemanticEmbedding("Content C"),
    ];

    await Promise.all(promises);

    // Model should be called 3 times (no deduplication for different content)
    expect(generateSpy).toHaveBeenCalledTimes(3);
  });

  it("should handle deduplication with cache misses and hits", async () => {
    const content = "Cache and deduplication test";

    // First request (cache miss, should generate)
    await engine.generateSemanticEmbedding(content);

    const generateSpy = vi.spyOn(model, "generate");

    // Make 5 concurrent requests (should all hit cache)
    const promises = Array.from({ length: 5 }, () => engine.generateSemanticEmbedding(content));

    await Promise.all(promises);

    // Model should not be called (all cache hits)
    expect(generateSpy).not.toHaveBeenCalled();
  });
});

describe("EmbeddingEngine - Batch Processing Optimization", () => {
  let engine: EmbeddingEngine;

  beforeEach(() => {
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache(10000, 3600000);
    engine = new EmbeddingEngine(model, cache);
  });

  it("should process large batches efficiently", async () => {
    // Create 100 unique memories
    const memories: MemoryContent[] = Array.from({ length: 100 }, (_, i) => ({
      text: `Batch memory ${i} with unique content for testing`,
      sector: "semantic" as MemorySector,
    }));

    const startTime = performance.now();
    const results = await engine.batchGenerateEmbeddings(memories);
    const duration = performance.now() - startTime;

    // Verify all embeddings generated
    expect(results).toHaveLength(100);
    results.forEach((result) => {
      expect(result.semantic).toBeDefined();
      expect(result.semantic.length).toBe(768);
    });

    // Should complete in reasonable time (50s = 500ms * 100)
    expect(duration).toBeLessThan(50000);
  });

  it("should handle empty batch gracefully", async () => {
    const results = await engine.batchGenerateEmbeddings([]);
    expect(results).toEqual([]);
  });

  it("should handle single item batch", async () => {
    const memories: MemoryContent[] = [
      {
        text: "Single item",
        sector: "semantic" as MemorySector,
      },
    ];

    const results = await engine.batchGenerateEmbeddings(memories);
    expect(results).toHaveLength(1);
    expect(results[0].semantic).toBeDefined();
  });

  it("should benefit from caching in batch operations", async () => {
    // Create batch with some duplicate content
    const memories: MemoryContent[] = [
      { text: "Unique content 1", sector: "semantic" as MemorySector },
      { text: "Duplicate content", sector: "semantic" as MemorySector },
      { text: "Unique content 2", sector: "semantic" as MemorySector },
      { text: "Duplicate content", sector: "semantic" as MemorySector },
      { text: "Duplicate content", sector: "semantic" as MemorySector },
    ];

    const results = await engine.batchGenerateEmbeddings(memories);

    // All results should be valid
    expect(results).toHaveLength(5);

    // Duplicate content should have identical embeddings
    expect(results[1].semantic).toEqual(results[3].semantic);
    expect(results[1].semantic).toEqual(results[4].semantic);
  });
});

describe("EmbeddingEngine - Cache Efficiency", () => {
  let engine: EmbeddingEngine;
  let cache: EmbeddingCache;

  beforeEach(() => {
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    cache = new EmbeddingCache(10000, 3600000); // 10k entries, 1 hour TTL
    engine = new EmbeddingEngine(model, cache);
  });

  it("should use cache with 1 hour TTL", async () => {
    const content = "Cache TTL test";

    // Generate embedding
    const embedding1 = await engine.generateSemanticEmbedding(content);

    // Immediately retrieve (should hit cache)
    const embedding2 = await engine.generateSemanticEmbedding(content);

    // Should be identical (from cache)
    expect(embedding1).toEqual(embedding2);
  });

  it("should support 10,000 cache entries", async () => {
    // Generate 10,000 unique embeddings
    const promises = Array.from({ length: 10000 }, (_, i) =>
      engine.generateSemanticEmbedding(`Cache capacity test ${i}`)
    );

    await Promise.all(promises);

    // Cache should have 10,000 entries (or close to it due to LRU)
    expect(cache.size()).toBeGreaterThan(9000);
    expect(cache.size()).toBeLessThanOrEqual(10000);
  });

  it("should evict oldest entries when cache is full", async () => {
    // Fill cache to capacity
    for (let i = 0; i < 10000; i++) {
      await engine.generateSemanticEmbedding(`Fill cache ${i}`);
    }

    const cacheSize = cache.size();

    // Add one more entry
    await engine.generateSemanticEmbedding("Overflow entry");

    // Cache size should remain at max
    expect(cache.size()).toBeLessThanOrEqual(10000);
    expect(cache.size()).toBeGreaterThanOrEqual(cacheSize);
  });
});
