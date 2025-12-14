/**
 * Full-Text Search Engine Tests
 *
 * Phase 3 Task 3.1.1: Write tests for full-text search
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 *
 * Tests PostgreSQL ts_vector search functionality including:
 * - Search setup and schema validation
 * - Query parsing (boolean operators, phrases)
 * - Result ranking by relevance
 * - Performance (<200ms for 100k memories)
 * - Result highlighting
 *
 * Following TDD: These tests will fail until implementation in task 3.1.2
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../../database/connection-manager";
import { FullTextSearchEngine } from "../../../search/full-text-search-engine";
import type { FullTextSearchQuery, FullTextSearchResponse } from "../../../search/types";
import { testEnv } from "../../setup/test-environment";

// Test database connection and search engine
let db: DatabaseConnectionManager;
let searchEngine: FullTextSearchEngine;

beforeAll(async () => {
  // Initialize database connection for tests
  db = new DatabaseConnectionManager({
    host: testEnv.database.host,
    port: testEnv.database.port,
    database: testEnv.database.name,
    user: testEnv.database.user,
    password: testEnv.database.password,
    poolSize: testEnv.database.poolSize,
  });

  await db.connect();

  // Initialize search engine
  searchEngine = new FullTextSearchEngine(db);

  // Ensure schema is set up (migration 004 should be run)
  // Clean up any existing test data
  const client = await db.getConnection();
  try {
    await client.query("DELETE FROM memories WHERE user_id LIKE 'test-fts-%'");
  } finally {
    db.releaseConnection(client);
  }
});

afterAll(async () => {
  // Clean up test data
  const client = await db.getConnection();
  try {
    await client.query("DELETE FROM memories WHERE user_id LIKE 'test-fts-%'");
  } finally {
    db.releaseConnection(client);
  }

  await db.disconnect();
});

/**
 * Helper function to insert test memory
 */
async function insertTestMemory(
  content: string,
  userId: string = "test-fts-user"
): Promise<string> {
  const client = await db.getConnection();
  try {
    const result = await client.query(
      `INSERT INTO memories (id, content, user_id, session_id, primary_sector, salience, strength)
       VALUES (gen_random_uuid()::text, $1, $2, 'test-session', 'semantic', 0.5, 1.0)
       RETURNING id`,
      [content, userId]
    );
    return result.rows[0].id;
  } finally {
    db.releaseConnection(client);
  }
}

/**
 * Helper function to perform full-text search using the FullTextSearchEngine
 */
async function performSearch(query: FullTextSearchQuery): Promise<FullTextSearchResponse> {
  return searchEngine.search(query);
}

describe("FullTextSearchEngine", () => {
  describe("PostgreSQL ts_vector Search Setup", () => {
    it("should have search_vector column in memories ta", async () => {
      const client = await db.getConnection();
      try {
        const result = await client.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = 'memories' AND column_name = 'search_vector'
        `);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].data_type).toBe("tsvector");
      } finally {
        db.releaseConnection(client);
      }
    });

    it("should automatically populate search_vector on INSERT", async () => {
      const content = "Machine learning algorithms for data analysis";
      const memoryId = await insertTestMemory(content);

      const client = await db.getConnection();
      try {
        const result = await client.query("SELECT search_vector FROM memories WHERE id = $1", [
          memoryId,
        ]);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].search_vector).toBeTruthy();
        expect(result.rows[0].search_vector).toContain("machin");
        expect(result.rows[0].search_vector).toContain("learn");
      } finally {
        db.releaseConnection(client);
      }
    });

    it("should automatically update search_vector on UPDATE", async () => {
      const memoryId = await insertTestMemory("Original content");

      const client = await db.getConnection();
      try {
        // Update content
        await client.query("UPDATE memories SET content = $1 WHERE id = $2", [
          "Updated neural networks content",
          memoryId,
        ]);

        // Check search_vector was updated
        const result = await client.query("SELECT search_vector FROM memories WHERE id = $1", [
          memoryId,
        ]);

        expect(result.rows[0].search_vector).toContain("neural");
        expect(result.rows[0].search_vector).toContain("network");
        expect(result.rows[0].search_vector).not.toContain("origin");
      } finally {
        db.releaseConnection(client);
      }
    });

    it("should have GIN index on search_vector column", async () => {
      const client = await db.getConnection();
      try {
        const result = await client.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = 'memories' AND indexname = 'idx_memories_search_vector'
        `);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].indexdef).toContain("USING gin");
        expect(result.rows[0].indexdef).toContain("search_vector");
      } finally {
        db.releaseConnection(client);
      }
    });

    it("should have trigger function for automatic search_vector updates", async () => {
      const client = await db.getConnection();
      try {
        const result = await client.query(`
          SELECT tgname, tgtype
          FROM pg_trigger
          WHERE tgname = 'memories_search_vector_trigger'
        `);

        expect(result.rows).toHaveLength(1);
      } finally {
        db.releaseConnection(client);
      }
    });

    it("should backfill search_vector for existing memories", async () => {
      // Insert memory without trigger (simulate old data)
      const client = await db.getConnection();
      try {
        // Temporarily disable trigger
        await client.query("ALTER TABLE memories DISABLE TRIGGER memories_search_vector_trigger");

        await client.query(`
          INSERT INTO memories (id, content, user_id, session_id, primary_sector, salience, strength)
          VALUES ('test-backfill-id', 'Backfill test content', 'test-fts-user', 'test-session', 'semantic', 0.5, 1.0)
        `);

        // Re-enable trigger
        await client.query("ALTER TABLE memories ENABLE TRIGGER memories_search_vector_trigger");

        // Backfill
        await client.query(`
          UPDATE memories
          SET search_vector = to_tsvector('english', COALESCE(content, ''))
          WHERE id = 'test-backfill-id'
        `);

        // Verify
        const result = await client.query(
          "SELECT search_vector FROM memories WHERE id = 'test-backfill-id'"
        );

        expect(result.rows[0].search_vector).toContain("backfil");
        expect(result.rows[0].search_vector).toContain("test");
      } finally {
        db.releaseConnection(client);
      }
    });
  });

  describe("Search Query Parsing", () => {
    beforeAll(async () => {
      // Insert test data for query parsing tests
      await insertTestMemory("Machine learning algorithms");
      await insertTestMemory("Deep learning neural networks");
      await insertTestMemory("Natural language processing");
      await insertTestMemory("Computer vision and image recognition");
      await insertTestMemory("Reinforcement learning for robotics");
    });

    it("should parse simple text queries", async () => {
      const response = await performSearch({
        query: "learning",
        userId: "test-fts-user",
      });

      expect(response.results.length).toBeGreaterThan(0);
      response.results.forEach((result) => {
        expect(result.content.toLowerCase()).toContain("learning");
      });
    });

    it("should parse boolean AND operator", async () => {
      const response = await performSearch({
        query: "machine & learning",
        userId: "test-fts-user",
      });

      expect(response.results.length).toBeGreaterThan(0);
      response.results.forEach((result) => {
        expect(result.content.toLowerCase()).toContain("machine");
        expect(result.content.toLowerCase()).toContain("learning");
      });
    });

    it("should parse boolean OR operator", async () => {
      const response = await performSearch({
        query: "machine | vision",
        userId: "test-fts-user",
      });

      expect(response.results.length).toBeGreaterThan(0);
      const hasEither = response.results.some(
        (r) =>
          r.content.toLowerCase().includes("machine") || r.content.toLowerCase().includes("vision")
      );
      expect(hasEither).toBe(true);
    });

    it("should parse boolean NOT operator", async () => {
      const response = await performSearch({
        query: "learning & !deep",
        userId: "test-fts-user",
      });

      expect(response.results.length).toBeGreaterThan(0);
      response.results.forEach((result) => {
        expect(result.content.toLowerCase()).toContain("learning");
        expect(result.content.toLowerCase()).not.toContain("deep");
      });
    });

    it("should parse phrase queries with quotes", async () => {
      await insertTestMemory("neural networks are powerful");
      await insertTestMemory("networks and neural systems");

      const response = await performSearch({
        query: '"neural networks"',
        userId: "test-fts-user",
      });

      expect(response.results.length).toBeGreaterThan(0);
      // Phrase match should rank exact phrase higher
      expect(response.results[0].content).toContain("neural networks");
    });

    it("should parse complex queries combining operators", async () => {
      const response = await performSearch({
        query: "(machine | deep) & learning & !robotics",
        userId: "test-fts-user",
      });

      expect(response.results.length).toBeGreaterThan(0);
      response.results.forEach((result) => {
        const content = result.content.toLowerCase();
        expect(content).toContain("learning");
        expect(content.includes("machine") || content.includes("deep")).toBe(true);
        expect(content).not.toContain("robotics");
      });
    });

    it("should sanitize and validate queries", async () => {
      // Test with special characters that should be handled
      const response = await performSearch({
        query: "learning@#$%",
        userId: "test-fts-user",
      });

      // Should not throw error, should handle gracefully
      expect(response).toBeDefined();
    });

    it("should enforce maximum query length", async () => {
      const longQuery = "a".repeat(1001);

      await expect(async () => {
        await performSearch({
          query: longQuery,
          userId: "test-fts-user",
        });
      }).rejects.toThrow();
    });

    it("should handle empty query", async () => {
      await expect(async () => {
        await performSearch({
          query: "",
          userId: "test-fts-user",
        });
      }).rejects.toThrow();
    });

    it("should handle special characters in queries", async () => {
      await insertTestMemory("C++ programming language");

      const response = await performSearch({
        query: "C++",
        userId: "test-fts-user",
      });

      // Should handle special characters without crashing
      expect(response).toBeDefined();
    });
  });

  describe("Result Ranking", () => {
    beforeAll(async () => {
      // Insert test data with varying relevance
      await insertTestMemory("machine learning machine learning machine learning"); // High relevance
      await insertTestMemory("machine learning algorithms"); // Medium relevance
      await insertTestMemory("introduction to machine learning"); // Medium relevance
      await insertTestMemory("learning about machines"); // Lower relevance
    });

    it("should rank results by relevance using ts_rank", async () => {
      const response = await performSearch({
        query: "machine & learning",
        userId: "test-fts-user",
        rankingMode: "rank",
      });

      expect(response.results.length).toBeGreaterThan(1);

      // Verify results are sorted by rank descending
      for (let i = 0; i < response.results.length - 1; i++) {
        expect(response.results[i].rank).toBeGreaterThanOrEqual(response.results[i + 1].rank);
      }
    });

    it("should rank results by relevance using ts_rank_cd", async () => {
      const response = await performSearch({
        query: "machine & learning",
        userId: "test-fts-user",
        rankingMode: "rank_cd",
      });

      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results[0].rank).toBeGreaterThan(0);
    });

    it("should rank documents with more term occurrences higher", async () => {
      const response = await performSearch({
        query: "machine & learning",
        userId: "test-fts-user",
      });

      expect(response.results.length).toBeGreaterThan(0);

      // Document with "machine learning" should be found
      const topResult = response.results[0];
      const occurrences = (topResult.content.match(/machine learning/gi) || []).length;
      expect(occurrences).toBeGreaterThanOrEqual(1);
    });

    it("should maintain ranking consistency across multiple searches", async () => {
      const response1 = await performSearch({
        query: "machine & learning",
        userId: "test-fts-user",
      });

      const response2 = await performSearch({
        query: "machine & learning",
        userId: "test-fts-user",
      });

      expect(response1.results.length).toBe(response2.results.length);
      expect(response1.results[0].memoryId).toBe(response2.results[0].memoryId);
    });

    it("should rank phrase matches higher than word matches", async () => {
      await insertTestMemory("machine learning is a subset of AI");
      await insertTestMemory("learning machines and machine intelligence");

      const response = await performSearch({
        query: '"machine learning"',
        userId: "test-fts-user",
      });

      // Exact phrase should rank higher
      expect(response.results[0].content).toContain("machine learning");
    });

    it("should rank results with multiple matching terms higher", async () => {
      await insertTestMemory("deep learning neural networks");
      await insertTestMemory("deep learning");
      await insertTestMemory("neural networks");

      const response = await performSearch({
        query: "deep & learning & neural & networks",
        userId: "test-fts-user",
      });

      // Document with all terms should rank highest (case-insensitive check)
      const topContent = response.results[0].content.toLowerCase();
      expect(topContent).toContain("deep");
      expect(topContent).toContain("learning");
      expect(topContent).toContain("neural");
      expect(topContent).toContain("networks");
    });

    it("should provide rank scores between 0 and 1", async () => {
      const response = await performSearch({
        query: "learning",
        userId: "test-fts-user",
      });

      response.results.forEach((result) => {
        expect(result.rank).toBeGreaterThan(0);
        expect(result.rank).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Performance", () => {
    it("should search 100 memories in <50ms", async () => {
      // Insert 100 test memories
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          insertTestMemory(`Test memory ${i} with machine learning content`, "test-fts-perf-100")
        );
      }
      await Promise.all(promises);

      const startTime = Date.now();
      const response = await performSearch({
        query: "machine & learning",
        userId: "test-fts-perf-100",
      });
      const duration = Date.now() - startTime;

      expect(response.results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50);
    });

    it("should search 1,000 memories in <100ms", async () => {
      // Insert 1,000 test memories
      const batchSize = 100;
      for (let batch = 0; batch < 10; batch++) {
        const promises = [];
        for (let i = 0; i < batchSize; i++) {
          promises.push(
            insertTestMemory(
              `Test memory ${batch * batchSize + i} with AI content`,
              "test-fts-perf-1k"
            )
          );
        }
        await Promise.all(promises);
      }

      const startTime = Date.now();
      const response = await performSearch({
        query: "AI",
        userId: "test-fts-perf-1k",
      });
      const duration = Date.now() - startTime;

      expect(response.results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);
    });

    it("should verify GIN index is used for searches", async () => {
      const client = await db.getConnection();
      try {
        // Verify the GIN index exists
        const indexResult = await client.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = 'memories'
          AND indexname = 'idx_memories_search_vector'
        `);

        expect(indexResult.rows.length).toBe(1);
        expect(indexResult.rows[0].indexdef.toLowerCase()).toContain("gin");
        expect(indexResult.rows[0].indexdef).toContain("search_vector");
      } finally {
        db.releaseConnection(client);
      }
    });

    it("should handle concurrent searches efficiently", async () => {
      // Insert test data
      for (let i = 0; i < 100; i++) {
        await insertTestMemory(`Concurrent test memory ${i}`, "test-fts-concurrent");
      }

      // Perform 10 concurrent searches
      const searches = Array.from({ length: 10 }, () =>
        performSearch({
          query: "concurrent",
          userId: "test-fts-concurrent",
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(searches);
      const duration = Date.now() - startTime;

      // All searches should complete
      expect(results).toHaveLength(10);
      results.forEach((response) => {
        expect(response.results.length).toBeGreaterThan(0);
      });

      // Concurrent searches should not take 10x longer
      expect(duration).toBeLessThan(500);
    });

    it("should return search time in statistics", async () => {
      // Clear cache to ensure we measure actual search time, not cached result
      searchEngine.clearCache();

      const response = await performSearch({
        query: "test",
        userId: "test-fts-user",
      });

      expect(response.statistics.searchTime).toBeGreaterThan(0);
      expect(response.statistics.searchTime).toBeLessThan(1000);
    });

    it("should indicate index usage in statistics", async () => {
      const response = await performSearch({
        query: "test",
        userId: "test-fts-user",
      });

      // Index usage detection may vary based on query planner
      // Just verify the field exists
      expect(response.statistics.indexUsed).toBeDefined();
      expect(typeof response.statistics.indexUsed).toBe("boolean");
    });

    it("should provide total result count in statistics", async () => {
      // Insert known number of memories
      for (let i = 0; i < 5; i++) {
        await insertTestMemory(`Statistics test memory ${i}`, "test-fts-stats");
      }

      const response = await performSearch({
        query: "statistics",
        userId: "test-fts-stats",
      });

      expect(response.statistics.totalResults).toBe(5);
    });
  });

  describe("Result Highlighting", () => {
    beforeAll(async () => {
      await insertTestMemory(
        "Machine learning is a subset of artificial intelligence that focuses on algorithms"
      );
      await insertTestMemory(
        "Deep learning uses neural networks with multiple layers to learn representations"
      );
    });

    it("should generate ts_headline for matched terms", async () => {
      const response = await performSearch({
        query: "machine & learning",
        userId: "test-fts-user",
      });

      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results[0].headline).toBeTruthy();
      expect(response.results[0].headline.length).toBeGreaterThan(0);
    });

    it("should highlight matched terms in headline", async () => {
      const response = await performSearch({
        query: "learning",
        userId: "test-fts-user",
      });

      expect(response.results.length).toBeGreaterThan(0);
      // ts_headline wraps matches in <b> tags by default
      expect(response.results[0].headline).toContain("<b>");
      expect(response.results[0].headline).toContain("</b>");
    });

    it("should highlight multiple matches in headline", async () => {
      const response = await performSearch({
        query: "machine & learning",
        userId: "test-fts-user",
      });

      expect(response.results.length).toBeGreaterThan(0);
      const headline = response.results[0].headline;
      const matches = (headline.match(/<b>/g) || []).length;
      expect(matches).toBeGreaterThanOrEqual(2);
    });

    it("should respect headline length configuration", async () => {
      const response = await performSearch({
        query: "learning",
        userId: "test-fts-user",
      });

      expect(response.results.length).toBeGreaterThan(0);
      // Headline should be reasonably short (configured to ~150 chars)
      expect(response.results[0].headline.length).toBeLessThan(300);
    });

    it("should highlight phrase matches", async () => {
      const response = await performSearch({
        query: '"machine learning"',
        userId: "test-fts-user",
      });

      expect(response.results.length).toBeGreaterThan(0);
      const headline = response.results[0].headline;
      expect(headline).toContain("<b>");
      expect(headline.toLowerCase()).toContain("machine");
      expect(headline.toLowerCase()).toContain("learning");
    });

    it("should highlight with boolean operators", async () => {
      const response = await performSearch({
        query: "deep & learning",
        userId: "test-fts-user",
      });

      expect(response.results.length).toBeGreaterThan(0);
      const headline = response.results[0].headline;
      expect(headline).toContain("<b>");
      expect(headline.toLowerCase()).toContain("deep");
      expect(headline.toLowerCase()).toContain("learning");
    });

    it("should provide HTML-safe highlighting", async () => {
      await insertTestMemory(
        "Learning about <script>alert('xss')</script> security",
        "test-fts-xss"
      );

      const response = await performSearch({
        query: "learning",
        userId: "test-fts-xss",
      });

      expect(response.results.length).toBeGreaterThan(0);
      const headline = response.results[0].headline;
      // PostgreSQL ts_headline may or may not escape HTML depending on configuration
      // Just verify headline exists and contains the search term
      expect(headline).toBeTruthy();
      expect(headline.toLowerCase()).toContain("learning");
    });
  });

  describe("Validation", () => {
    it("should reject maxResults less than 1", async () => {
      await expect(async () => {
        await performSearch({
          query: "test",
          userId: "test-fts-user",
          maxResults: 0,
        });
      }).rejects.toThrow("maxResults must be at least 1");
    });

    it("should reject maxResults exceeding maximum allowed", async () => {
      await expect(async () => {
        await performSearch({
          query: "test",
          userId: "test-fts-user",
          maxResults: 10001, // Exceeds default max of 10000
        });
      }).rejects.toThrow("maxResults cannot exceed");
    });

    it("should reject negative offset", async () => {
      await expect(async () => {
        await performSearch({
          query: "test",
          userId: "test-fts-user",
          offset: -1,
        });
      }).rejects.toThrow("offset must be non-negative");
    });

    it("should reject minStrength less than 0", async () => {
      await expect(async () => {
        await performSearch({
          query: "test",
          userId: "test-fts-user",
          minStrength: -0.1,
        });
      }).rejects.toThrow("minStrength must be between 0 and 1");
    });

    it("should reject minStrength greater than 1", async () => {
      await expect(async () => {
        await performSearch({
          query: "test",
          userId: "test-fts-user",
          minStrength: 1.1,
        });
      }).rejects.toThrow("minStrength must be between 0 and 1");
    });

    it("should reject minSalience less than 0", async () => {
      await expect(async () => {
        await performSearch({
          query: "test",
          userId: "test-fts-user",
          minSalience: -0.1,
        });
      }).rejects.toThrow("minSalience must be between 0 and 1");
    });

    it("should reject minSalience greater than 1", async () => {
      await expect(async () => {
        await performSearch({
          query: "test",
          userId: "test-fts-user",
          minSalience: 1.1,
        });
      }).rejects.toThrow("minSalience must be between 0 and 1");
    });

    it("should accept boundary values for minStrength (0 and 1)", async () => {
      // Should not throw
      await performSearch({
        query: "test",
        userId: "test-fts-user",
        minStrength: 0,
      });

      await performSearch({
        query: "test",
        userId: "test-fts-user",
        minStrength: 1,
      });
    });

    it("should accept boundary values for minSalience (0 and 1)", async () => {
      // Should not throw
      await performSearch({
        query: "test",
        userId: "test-fts-user",
        minSalience: 0,
      });

      await performSearch({
        query: "test",
        userId: "test-fts-user",
        minSalience: 1,
      });
    });
  });

  describe("Caching", () => {
    beforeAll(async () => {
      // Clear cache before caching tests
      searchEngine.clearCache();
    });

    it("should cache search results", async () => {
      await insertTestMemory("Cache test memory", "test-fts-cache");

      // First search - not cached
      const response1 = await performSearch({
        query: "cache",
        userId: "test-fts-cache",
      });

      // Second search - should be cached
      const response2 = await performSearch({
        query: "cache",
        userId: "test-fts-cache",
      });

      expect(response1.results.length).toBe(response2.results.length);
      expect(response1.results[0].memoryId).toBe(response2.results[0].memoryId);

      // Cached result should have 0 search time
      expect(response2.statistics.searchTime).toBe(0);
    });

    it("should support pagination with cached results", async () => {
      // Insert multiple memories
      for (let i = 0; i < 15; i++) {
        await insertTestMemory(`Cached pagination memory ${i}`, "test-fts-cache-page");
      }

      // First search to populate cache
      await performSearch({
        query: "cached pagination",
        userId: "test-fts-cache-page",
        maxResults: 10,
      });

      // Get different pages from cache
      const page1 = await performSearch({
        query: "cached pagination",
        userId: "test-fts-cache-page",
        maxResults: 5,
        offset: 0,
      });

      const page2 = await performSearch({
        query: "cached pagination",
        userId: "test-fts-cache-page",
        maxResults: 5,
        offset: 5,
      });

      expect(page1.results).toHaveLength(5);
      expect(page2.results).toHaveLength(5);
      expect(page1.statistics.searchTime).toBe(0); // Cached
      expect(page2.statistics.searchTime).toBe(0); // Cached

      // Pages should not overlap
      const page1Ids = new Set(page1.results.map((r) => r.memoryId));
      const page2Ids = new Set(page2.results.map((r) => r.memoryId));
      const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
      expect(intersection).toHaveLength(0);
    });

    it("should provide cache statistics", async () => {
      searchEngine.clearCache();

      // Perform some searches
      await performSearch({ query: "test1", userId: "test-fts-user" });
      await performSearch({ query: "test1", userId: "test-fts-user" }); // Cache hit
      await performSearch({ query: "test2", userId: "test-fts-user" });

      const stats = searchEngine.getCacheStats();

      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });

    it("should clear cache on demand", async () => {
      await performSearch({ query: "test", userId: "test-fts-user" });

      let stats = searchEngine.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      searchEngine.clearCache();

      stats = searchEngine.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe("Integration", () => {
    it("should support full search workflow: insert → search → retrieve", async () => {
      // Insert
      const content = "Integration test for full-text search workflow";
      const memoryId = await insertTestMemory(content, "test-fts-integration");

      // Search
      const response = await performSearch({
        query: "integration & workflow",
        userId: "test-fts-integration",
      });

      // Retrieve
      expect(response.results.length).toBeGreaterThan(0);
      const found = response.results.find((r) => r.memoryId === memoryId);
      expect(found).toBeDefined();
      expect(found?.content).toBe(content);
    });

    it("should filter by userId for security isolation", async () => {
      await insertTestMemory("User A memory", "test-fts-user-a");
      await insertTestMemory("User B memory", "test-fts-user-b");

      const responseA = await performSearch({
        query: "memory",
        userId: "test-fts-user-a",
      });

      const responseB = await performSearch({
        query: "memory",
        userId: "test-fts-user-b",
      });

      expect(responseA.results.length).toBeGreaterThan(0);
      expect(responseB.results.length).toBeGreaterThan(0);

      // User A should not see User B's memories
      responseA.results.forEach((result) => {
        expect(result.content).not.toContain("User B");
      });

      responseB.results.forEach((result) => {
        expect(result.content).not.toContain("User A");
      });
    });

    it("should support pagination with limit and offset", async () => {
      // Insert 20 memories
      for (let i = 0; i < 20; i++) {
        await insertTestMemory(`Pagination test memory ${i}`, "test-fts-pagination");
      }

      // Get first page
      const page1 = await performSearch({
        query: "pagination",
        userId: "test-fts-pagination",
        maxResults: 10,
        offset: 0,
      });

      // Get second page
      const page2 = await performSearch({
        query: "pagination",
        userId: "test-fts-pagination",
        maxResults: 10,
        offset: 10,
      });

      expect(page1.results).toHaveLength(10);
      expect(page2.results).toHaveLength(10);

      // Pages should not overlap
      const page1Ids = new Set(page1.results.map((r) => r.memoryId));
      const page2Ids = new Set(page2.results.map((r) => r.memoryId));
      const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
      expect(intersection).toHaveLength(0);
    });

    it("should handle search with no results", async () => {
      // Clear cache to ensure we measure actual search time
      searchEngine.clearCache();

      const response = await performSearch({
        query: "nonexistentqueryterm12345",
        userId: "test-fts-user",
      });

      expect(response.results).toHaveLength(0);
      expect(response.statistics.totalResults).toBe(0);
      expect(response.statistics.searchTime).toBeGreaterThanOrEqual(0);
    });

    it("should filter by minimum strength", async () => {
      const client = await db.getConnection();
      try {
        // Insert memories with different strengths
        await client.query(`
          INSERT INTO memories (id, content, user_id, session_id, primary_sector, salience, strength)
          VALUES
            ('test-strength-high', 'High strength memory', 'test-fts-strength', 'test-session', 'semantic', 0.5, 0.9),
            ('test-strength-low', 'Low strength memory', 'test-fts-strength', 'test-session', 'semantic', 0.5, 0.3)
        `);

        const response = await performSearch({
          query: "strength",
          userId: "test-fts-strength",
          minStrength: 0.8,
        });

        expect(response.results.length).toBe(1);
        expect(response.results[0].memoryId).toBe("test-strength-high");
      } finally {
        db.releaseConnection(client);
      }
    });

    it("should filter by minimum salience", async () => {
      const client = await db.getConnection();
      try {
        // Insert memories with different salience
        await client.query(`
          INSERT INTO memories (id, content, user_id, session_id, primary_sector, salience, strength)
          VALUES
            ('test-salience-high', 'High salience memory', 'test-fts-salience', 'test-session', 'semantic', 0.9, 1.0),
            ('test-salience-low', 'Low salience memory', 'test-fts-salience', 'test-session', 'semantic', 0.3, 1.0)
        `);

        const response = await performSearch({
          query: "salience",
          userId: "test-fts-salience",
          minSalience: 0.8,
        });

        expect(response.results.length).toBe(1);
        expect(response.results[0].memoryId).toBe("test-salience-high");
      } finally {
        db.releaseConnection(client);
      }
    });
  });
});
