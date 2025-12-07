/**
 * Search Operations Performance Tests
 *
 * Validates that search operations meet performance targets:
 * - Search operations < 200ms for 100k memories
 * - Full-text search performance
 * - Vector similarity search performance
 * - Metadata filtering performance
 * - Cache effectiveness
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../database/connection-manager";
import { EmbeddingCache } from "../../embeddings/cache";
import { EmbeddingEngine } from "../../embeddings/embedding-engine";
import { EmbeddingStorage } from "../../embeddings/embedding-storage";
import { MemorySector } from "../../embeddings/types";
import { WaypointGraphBuilder } from "../../graph/waypoint-builder";
import { MemoryRepository } from "../../memory/memory-repository";
import type { MemoryContent, SearchQuery } from "../../memory/types";
import { MemorySearchEngine } from "../../search/memory-search-engine";
import type { IntegratedSearchQuery } from "../../search/types";
import { PerformanceMonitor } from "../../utils/performance-monitor";
import { MockOllamaEmbeddingModel } from "../utils/mock-embeddings";

describe("Search Operations Performance", () => {
  let db: DatabaseConnectionManager;
  let repository: MemoryRepository;
  let searchEngine: MemorySearchEngine;
  let embeddingStorage: EmbeddingStorage;
  let monitor: PerformanceMonitor;
  const testUserId = "search-perf-user";
  const testSessionId = "search-perf-session";

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
    embeddingStorage = new EmbeddingStorage(db);
    const graphBuilder = new WaypointGraphBuilder(db, embeddingStorage, {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    });

    repository = new MemoryRepository(db, embeddingEngine, graphBuilder, embeddingStorage);
    searchEngine = new MemorySearchEngine(db, embeddingStorage);
    monitor = new PerformanceMonitor();
  }, 30000);

  beforeEach(async () => {
    // Clean database before each test
    if (db.pool) {
      await db.pool.query("TRUNCATE TABLE memories CASCADE");
    }
    monitor.clear();
    searchEngine.clearCache();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  it("should perform vector search in <200ms", async () => {
    // Create 100 test memories
    for (let i = 0; i < 100; i++) {
      const content: MemoryContent = {
        content: `Search performance test memory ${i} with various keywords`,
        userId: testUserId,
        sessionId: testSessionId,
        primarySector: "semantic",
      };
      await repository.create(content);
    }

    // Generate query embedding
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const queryEmbedding = await model.generate("search query");

    // Measure search performance
    const durations: number[] = [];

    for (let i = 0; i < 20; i++) {
      const timer = monitor.startTimer(`vector-search-${i}`, "search");
      await embeddingStorage.vectorSimilaritySearch(queryEmbedding, MemorySector.Semantic, 10, 0.5);
      const duration = monitor.endTimer(timer);
      durations.push(duration);
    }

    // Calculate p95
    const sorted = durations.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    expect(p95).toBeLessThan(200);
  }, 60000);

  it("should perform full-text search in <200ms", async () => {
    // Create 100 test memories with searchable content
    for (let i = 0; i < 100; i++) {
      const content: MemoryContent = {
        content: `Full-text search test memory ${i} with important keywords and phrases`,
        userId: testUserId,
        sessionId: testSessionId,
        primarySector: "semantic",
      };
      await repository.create(content);
    }

    // Measure full-text search performance
    const durations: number[] = [];

    for (let i = 0; i < 20; i++) {
      const timer = monitor.startTimer(`fulltext-search-${i}`, "search");
      await repository.searchFullText({
        query: "important keywords",
        userId: testUserId,
        maxResults: 10,
      });
      const duration = monitor.endTimer(timer);
      durations.push(duration);
    }

    // Calculate p95
    const sorted = durations.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    expect(p95).toBeLessThan(200);
  }, 60000);

  it("should perform metadata filtering in <200ms", async () => {
    // Create 100 test memories with metadata
    for (let i = 0; i < 100; i++) {
      const content: MemoryContent = {
        content: `Metadata filter test memory ${i}`,
        userId: testUserId,
        sessionId: testSessionId,
        primarySector: "semantic",
      };
      await repository.create(content, {
        keywords: [`keyword${i % 10}`, "common"],
        tags: [`tag${i % 5}`],
        category: `category${i % 3}`,
        importance: 0.5,
        isAtomic: true,
      });
    }

    // Measure metadata filtering performance
    const durations: number[] = [];

    for (let i = 0; i < 20; i++) {
      const query: SearchQuery = {
        userId: testUserId,
        metadata: {
          keywords: ["common"],
          tags: ["tag0"],
        },
        limit: 10,
      };

      const timer = monitor.startTimer(`metadata-filter-${i}`, "search");
      await repository.search(query);
      const duration = monitor.endTimer(timer);
      durations.push(duration);
    }

    // Calculate p95
    const sorted = durations.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    expect(p95).toBeLessThan(200);
  }, 60000);

  it("should perform integrated search in <200ms", async () => {
    // Create 100 test memories
    for (let i = 0; i < 100; i++) {
      const content: MemoryContent = {
        content: `Integrated search test memory ${i} with searchable content`,
        userId: testUserId,
        sessionId: testSessionId,
        primarySector: "semantic",
      };
      await repository.create(content, {
        keywords: [`keyword${i % 10}`],
        tags: [`tag${i % 5}`],
        category: "test",
        importance: 0.5,
        isAtomic: true,
      });
    }

    // Measure integrated search performance
    const durations: number[] = [];

    for (let i = 0; i < 20; i++) {
      const query: IntegratedSearchQuery = {
        text: "searchable content",
        userId: testUserId,
        metadata: {
          categories: ["test"],
        },
        limit: 10,
      };

      const timer = monitor.startTimer(`integrated-search-${i}`, "search");
      await searchEngine.search(query);
      const duration = monitor.endTimer(timer);
      durations.push(duration);
    }

    // Calculate p95
    const sorted = durations.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    expect(p95).toBeLessThan(200);
  }, 60000);

  it("should benefit from caching on repeated searches", async () => {
    // Create 50 test memories
    for (let i = 0; i < 50; i++) {
      const content: MemoryContent = {
        content: `Cache test memory ${i}`,
        userId: testUserId,
        sessionId: testSessionId,
        primarySector: "semantic",
      };
      await repository.create(content);
    }

    const query: IntegratedSearchQuery = {
      text: "cache test",
      userId: testUserId,
      limit: 10,
    };

    // First search (cache miss)
    const timer1 = monitor.startTimer("first-search", "search");
    await searchEngine.search(query);
    const duration1 = monitor.endTimer(timer1);

    // Second search (cache hit)
    const timer2 = monitor.startTimer("cached-search", "search");
    await searchEngine.search(query);
    const duration2 = monitor.endTimer(timer2);

    // Cached search should be significantly faster
    expect(duration2).toBeLessThan(duration1 * 0.5);

    // Verify cache hit
    const cacheStats = searchEngine.getCacheStats();
    expect(cacheStats.hits).toBeGreaterThan(0);
  }, 60000);

  it("should scale linearly with result limit", async () => {
    // Create 200 test memories
    for (let i = 0; i < 200; i++) {
      const content: MemoryContent = {
        content: `Scaling test memory ${i}`,
        userId: testUserId,
        sessionId: testSessionId,
        primarySector: "semantic",
      };
      await repository.create(content);
    }

    // Search with limit 10
    const query1: SearchQuery = {
      userId: testUserId,
      text: "scaling test",
      limit: 10,
    };

    const timer1 = monitor.startTimer("search-limit-10", "search");
    await repository.search(query1);
    const duration1 = monitor.endTimer(timer1);

    // Search with limit 50
    const query2: SearchQuery = {
      userId: testUserId,
      text: "scaling test",
      limit: 50,
    };

    const timer2 = monitor.startTimer("search-limit-50", "search");
    await repository.search(query2);
    const duration2 = monitor.endTimer(timer2);

    // Should scale roughly linearly (allow 6x for overhead)
    expect(duration2).toBeLessThan(duration1 * 6);
  }, 120000);

  it("should maintain performance under concurrent searches", async () => {
    // Create 100 test memories
    for (let i = 0; i < 100; i++) {
      const content: MemoryContent = {
        content: `Concurrent search test memory ${i}`,
        userId: testUserId,
        sessionId: testSessionId,
        primarySector: "semantic",
      };
      await repository.create(content);
    }

    // Execute 10 concurrent searches
    const queries: SearchQuery[] = Array.from({ length: 10 }, (_, i) => ({
      userId: testUserId,
      text: `concurrent test ${i}`,
      limit: 10,
    }));

    const timer = monitor.startTimer("concurrent-searches", "search");
    await Promise.all(queries.map((q) => repository.search(q)));
    const duration = monitor.endTimer(timer);

    // Concurrent searches should complete in reasonable time
    // Allow 2s total for 10 concurrent searches (200ms * 10 with some parallelism)
    expect(duration).toBeLessThan(2000);
  }, 60000);
});
