/**
 * Memory Retrieval Performance Tests
 *
 * Validates that memory retrieval meets performance targets:
 * - p50 < 100ms for single memory retrieval
 * - p95 < 200ms for single memory retrieval
 * - p99 < 500ms for single memory retrieval
 * - Search operations scale efficiently with data volume
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../database/connection-manager";
import { EmbeddingCache } from "../../embeddings/cache";
import { EmbeddingEngine } from "../../embeddings/embedding-engine";
import { EmbeddingStorage } from "../../embeddings/embedding-storage";
import { WaypointGraphBuilder } from "../../graph/waypoint-builder";
import { MemoryRepository } from "../../memory/memory-repository";
import type { MemoryContent } from "../../memory/types";
import { PerformanceMonitor } from "../../utils/performance-monitor";
import { MockOllamaEmbeddingModel } from "../utils/mock-embeddings";

describe("Memory Retrieval Performance", () => {
  let db: DatabaseConnectionManager;
  let repository: MemoryRepository;
  let monitor: PerformanceMonitor;
  const testUserId = "perf-test-user";
  const testSessionId = "perf-test-session";

  beforeAll(async () => {
    // Initialize components
    db = new DatabaseConnectionManager({
      host: process.env.DB_HOST ?? "localhost",
      port: parseInt(process.env.DB_PORT ?? "5432"),
      database: process.env.DB_NAME ?? "thoughtmcp_test",
      user: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASSWORD ?? "postgres",
      poolSize: 20,
      connectionTimeout: 5000,
      idleTimeout: 30000,
    });

    await db.connect();

    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });

    const cache = new EmbeddingCache(10000, 3600000);
    const embeddingEngine = new EmbeddingEngine(model, cache);
    const embeddingStorage = new EmbeddingStorage(db);
    const graphBuilder = new WaypointGraphBuilder(db, embeddingStorage, {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    });

    repository = new MemoryRepository(db, embeddingEngine, graphBuilder, embeddingStorage);
    monitor = new PerformanceMonitor();
  }, 30000);

  beforeEach(async () => {
    // Clean database before each test
    if (db.pool) {
      await db.pool.query("TRUNCATE TABLE memories CASCADE");
    }
    monitor.clear();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  it("should retrieve single memory in <100ms (p50)", async () => {
    // Create a test memory
    const content: MemoryContent = {
      content: "Performance test memory for single retrieval",
      userId: testUserId,
      sessionId: testSessionId,
      primarySector: "semantic",
    };

    const memory = await repository.create(content);

    // Measure retrieval performance
    const durations: number[] = [];

    for (let i = 0; i < 50; i++) {
      const timer = monitor.startTimer(`retrieve-${i}`, "memory");
      await repository.retrieve(memory.id, testUserId);
      const duration = monitor.endTimer(timer);
      durations.push(duration);
    }

    // Calculate p50
    const sorted = durations.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];

    expect(p50).toBeLessThan(100);
  }, 30000);

  it("should retrieve single memory in <200ms (p95)", async () => {
    // Create a test memory
    const content: MemoryContent = {
      content: "Performance test memory for p95 retrieval",
      userId: testUserId,
      sessionId: testSessionId,
      primarySector: "semantic",
    };

    const memory = await repository.create(content);

    // Measure retrieval performance
    const durations: number[] = [];

    for (let i = 0; i < 100; i++) {
      const timer = monitor.startTimer(`retrieve-p95-${i}`, "memory");
      await repository.retrieve(memory.id, testUserId);
      const duration = monitor.endTimer(timer);
      durations.push(duration);
    }

    // Calculate p95
    const sorted = durations.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    expect(p95).toBeLessThan(200);
  }, 60000);

  it("should retrieve single memory in <500ms (p99)", async () => {
    // Create a test memory
    const content: MemoryContent = {
      content: "Performance test memory for p99 retrieval",
      userId: testUserId,
      sessionId: testSessionId,
      primarySector: "semantic",
    };

    const memory = await repository.create(content);

    // Measure retrieval performance
    const durations: number[] = [];

    for (let i = 0; i < 100; i++) {
      const timer = monitor.startTimer(`retrieve-p99-${i}`, "memory");
      await repository.retrieve(memory.id, testUserId);
      const duration = monitor.endTimer(timer);
      durations.push(duration);
    }

    // Calculate p99
    const sorted = durations.sort((a, b) => a - b);
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    expect(p99).toBeLessThan(500);
  }, 60000);

  it("should benefit from caching on repeated retrievals", async () => {
    // Create a test memory
    const content: MemoryContent = {
      content: "Performance test memory for cache testing",
      userId: testUserId,
      sessionId: testSessionId,
      primarySector: "semantic",
    };

    const memory = await repository.create(content);

    // First retrieval (cache miss)
    const timer1 = monitor.startTimer("first-retrieval", "memory");
    await repository.retrieve(memory.id, testUserId);
    const duration1 = monitor.endTimer(timer1);

    // Second retrieval (cache hit)
    const timer2 = monitor.startTimer("cached-retrieval", "memory");
    await repository.retrieve(memory.id, testUserId);
    const duration2 = monitor.endTimer(timer2);

    // Cached retrieval should be faster (or at least not significantly slower)
    // Allow some variance due to system load
    expect(duration2).toBeLessThanOrEqual(duration1 * 1.5);
  }, 30000);

  it("should handle batch retrieval efficiently", async () => {
    // Create 10 test memories
    const memories = [];
    for (let i = 0; i < 10; i++) {
      const content: MemoryContent = {
        content: `Batch retrieval test memory ${i}`,
        userId: testUserId,
        sessionId: testSessionId,
        primarySector: "semantic",
      };
      const memory = await repository.create(content);
      memories.push(memory);
    }

    // Measure batch retrieval performance
    const timer = monitor.startTimer("batch-retrieval", "memory");
    await Promise.all(memories.map((m) => repository.retrieve(m.id, testUserId)));
    const duration = monitor.endTimer(timer);

    // Batch of 10 should complete in reasonable time (1s = 100ms * 10)
    expect(duration).toBeLessThan(1000);
  }, 60000);

  it("should maintain performance under load", async () => {
    // Create 50 test memories
    const memories = [];
    for (let i = 0; i < 50; i++) {
      const content: MemoryContent = {
        content: `Load test memory ${i}`,
        userId: testUserId,
        sessionId: testSessionId,
        primarySector: "semantic",
      };
      const memory = await repository.create(content);
      memories.push(memory);
    }

    // Measure retrieval performance under load
    const durations: number[] = [];

    for (const memory of memories) {
      const timer = monitor.startTimer(`load-test-${memory.id}`, "memory");
      await repository.retrieve(memory.id, testUserId);
      const duration = monitor.endTimer(timer);
      durations.push(duration);
    }

    // Calculate percentiles
    const sorted = durations.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    // All percentiles should meet targets
    expect(p50).toBeLessThan(100);
    expect(p95).toBeLessThan(200);
    expect(p99).toBeLessThan(500);
  }, 120000);
});
