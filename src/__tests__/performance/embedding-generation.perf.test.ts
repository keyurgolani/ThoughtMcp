/**
 * Embedding Generation Performance Tests
 *
 * Validates that embedding generation meets performance targets:
 * - <500ms for generating all 5 sector embeddings
 * - Batch operations scale efficiently
 * - Cache hit rates are high for repeated content
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { beforeEach, describe, expect, it } from "vitest";
import { EmbeddingCache } from "../../embeddings/cache";
import { EmbeddingEngine } from "../../embeddings/embedding-engine";
import type { MemoryContent, MemorySector } from "../../embeddings/types";
import { PerformanceMonitor } from "../../utils/performance-monitor";
import { MockOllamaEmbeddingModel } from "../utils/mock-embeddings";

describe("Embedding Generation Performance", () => {
  let engine: EmbeddingEngine;
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache(10000, 3600000); // 10k entries, 1 hour TTL
    engine = new EmbeddingEngine(model, cache);
    monitor = new PerformanceMonitor();
  });

  it("should generate all 5 sector embeddings in <500ms", async () => {
    // Requirement: Embedding generation <500ms for 5 sectors
    const memory: MemoryContent = {
      text: "Performance test memory with sufficient content to generate realistic embeddings",
      sector: "episodic" as MemorySector,
      context: {
        timestamp: new Date(),
        sessionId: "perf-test-1",
      },
      emotion: {
        valence: 0.5,
        arousal: 0.5,
        dominance: 0.0,
      },
      insights: ["Performance matters"],
    };

    const timer = monitor.startTimer("generate-all-sectors", "embedding");
    await engine.generateAllSectorEmbeddings(memory);
    const duration = monitor.endTimer(timer);

    expect(duration).toBeLessThan(500);
  });

  it("should benefit from caching on repeated content", async () => {
    // First generation (cache miss)
    const memory: MemoryContent = {
      text: "Repeated content for cache testing",
      sector: "semantic" as MemorySector,
    };

    const timer1 = monitor.startTimer("first-generation", "embedding");
    await engine.generateAllSectorEmbeddings(memory);
    const duration1 = monitor.endTimer(timer1);

    // Second generation (cache hit)
    const timer2 = monitor.startTimer("cached-generation", "embedding");
    await engine.generateAllSectorEmbeddings(memory);
    const duration2 = monitor.endTimer(timer2);

    // Cached generation should be significantly faster
    expect(duration2).toBeLessThan(duration1 * 0.5);
  });

  it("should handle batch generation efficiently", async () => {
    // Generate 10 memories in batch
    const memories: MemoryContent[] = Array.from({ length: 10 }, (_, i) => ({
      text: `Batch memory ${i} with unique content`,
      sector: "semantic" as MemorySector,
    }));

    const timer = monitor.startTimer("batch-generation", "embedding");
    await engine.batchGenerateEmbeddings(memories);
    const duration = monitor.endTimer(timer);

    // Batch of 10 should complete in reasonable time (5s = 500ms * 10)
    expect(duration).toBeLessThan(5000);
  });

  it("should scale linearly with batch size", async () => {
    // Small batch
    const smallBatch: MemoryContent[] = Array.from({ length: 5 }, (_, i) => ({
      text: `Small batch memory ${i}`,
      sector: "semantic" as MemorySector,
    }));

    const timer1 = monitor.startTimer("small-batch", "embedding");
    await engine.batchGenerateEmbeddings(smallBatch);
    const duration1 = monitor.endTimer(timer1);

    // Large batch (2x size)
    const largeBatch: MemoryContent[] = Array.from({ length: 10 }, (_, i) => ({
      text: `Large batch memory ${i}`,
      sector: "semantic" as MemorySector,
    }));

    const timer2 = monitor.startTimer("large-batch", "embedding");
    await engine.batchGenerateEmbeddings(largeBatch);
    const duration2 = monitor.endTimer(timer2);

    // Should scale roughly linearly (allow 2.5x for overhead)
    expect(duration2).toBeLessThan(duration1 * 2.5);
  });

  it("should maintain performance under load", async () => {
    // Generate 50 embeddings sequentially
    const durations: number[] = [];

    for (let i = 0; i < 50; i++) {
      const memory: MemoryContent = {
        text: `Load test memory ${i}`,
        sector: "semantic" as MemorySector,
      };

      const timer = monitor.startTimer(`load-test-${i}`, "embedding");
      await engine.generateAllSectorEmbeddings(memory);
      const duration = monitor.endTimer(timer);
      durations.push(duration);
    }

    // Calculate percentiles
    const sorted = durations.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    // All percentiles should meet target
    expect(p50).toBeLessThan(500);
    expect(p95).toBeLessThan(500);
    expect(p99).toBeLessThan(500);
  });
});
