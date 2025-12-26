/**
 * MCP Tools End-to-End Tests
 *
 * Tests the 5 essential user workflows with real PostgreSQL and Ollama dependencies.
 * These tests verify complete user interaction patterns, not edge cases or load testing.
 *
 * Essential Workflows:
 * 1. Memory CRUD - Store, retrieve, update, delete lifecycle
 * 2. Memory Search - Store multiple memories and search by text/metadata
 * 3. Reasoning - Think, assess confidence, detect bias
 * 4. Problem Decomposition - Breakdown, analyze, evaluate
 * 5. Tool Chaining - Memory + Reasoning integration
 *
 * Data Cleanup Strategy (Requirement 13.3):
 * - Each test uses unique user IDs and session IDs
 * - Each test cleans up its own data in afterEach
 * - Final verification ensures database is in clean state
 *
 * Requirements: 13.1, 13.3, 13.7
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CognitiveMCPServer } from "../../server/mcp-server.js";
import type { MCPResponse } from "../../server/types.js";
import {
  cleanupUserData,
  createE2ETestContext,
  getDatabaseStats,
  resetTestCounter,
  trackMemoryId,
  verifyCleanState,
  type E2ETestContext,
} from "../utils/e2e-cleanup.js";
import { withTimeout } from "../utils/test-helpers.js";

// Shared test state
let server: CognitiveMCPServer;
let testContext: E2ETestContext;

/**
 * Helper function to invoke MCP tool
 */
async function invokeTool(toolName: string, params: Record<string, unknown>): Promise<MCPResponse> {
  const tool = server.toolRegistry.getTool(toolName);
  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`);
  }
  return await tool.handler(params);
}

/**
 * Helper to get database client for cleanup operations
 */
async function getDbClient() {
  if (!server["databaseManager"]) {
    throw new Error("Database manager not available");
  }
  return await server["databaseManager"].getConnection();
}

/**
 * Ensures the database schema exists.
 * Creates tables if they don't exist (idempotent operations).
 * Does NOT drop existing data.
 */
async function ensureDatabaseSchema(
  client: Awaited<ReturnType<typeof getDbClient>>
): Promise<void> {
  const embeddingDimension = parseInt(process.env.EMBEDDING_DIMENSION ?? "768", 10);

  // Create memories table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      content TEXT NOT NULL,
      primary_sector TEXT NOT NULL,
      strength REAL NOT NULL DEFAULT 1.0,
      salience REAL NOT NULL DEFAULT 0.5,
      importance REAL NOT NULL DEFAULT 0.5,
      decay_rate REAL NOT NULL DEFAULT 0.1,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      access_count INTEGER NOT NULL DEFAULT 0,
      metadata JSONB,
      search_vector tsvector
    )
  `);

  // Create function and trigger for search_vector (idempotent)
  // Note: Using $$ for dollar-quoting in PostgreSQL functions
  await client.query(`
    CREATE OR REPLACE FUNCTION memories_search_vector_update() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await client.query(`DROP TRIGGER IF EXISTS memories_search_vector_trigger ON memories`);

  await client.query(`
    CREATE TRIGGER memories_search_vector_trigger
      BEFORE INSERT OR UPDATE OF content ON memories
      FOR EACH ROW
      EXECUTE FUNCTION memories_search_vector_update()
  `);

  // Create GIN index for full-text search
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_memories_search_vector ON memories USING GIN(search_vector)
  `);

  // Create memory_embeddings table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS memory_embeddings (
      memory_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      sector TEXT NOT NULL,
      embedding vector(${embeddingDimension}),
      dimension INTEGER NOT NULL,
      model TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      PRIMARY KEY (memory_id, sector)
    )
  `);

  // Create memory_connections table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS memory_connections (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      connection_type TEXT NOT NULL,
      strength REAL NOT NULL DEFAULT 1.0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  // Create memory_metadata table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS memory_metadata (
      memory_id TEXT PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
      keywords TEXT[] NOT NULL DEFAULT '{}',
      tags TEXT[] NOT NULL DEFAULT '{}',
      category TEXT,
      context TEXT,
      importance REAL DEFAULT 0.5,
      is_atomic BOOLEAN DEFAULT TRUE,
      parent_id TEXT REFERENCES memories(id),
      CONSTRAINT valid_importance CHECK (importance >= 0 AND importance <= 1)
    )
  `);

  // Create memory_links table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS memory_links (
      source_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      link_type TEXT NOT NULL,
      weight REAL DEFAULT 0.5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      traversal_count INTEGER DEFAULT 0,
      PRIMARY KEY (source_id, target_id),
      CONSTRAINT valid_weight CHECK (weight >= 0 AND weight <= 1),
      CONSTRAINT no_self_links CHECK (source_id != target_id)
    )
  `);
}

describe("MCP Tools End-to-End Tests", () => {
  beforeAll(async () => {
    // Reset test counter for deterministic IDs
    resetTestCounter();
  });

  beforeEach(async () => {
    // Create fresh server instance
    server = new CognitiveMCPServer();

    // Initialize server with timeout
    await withTimeout(() => server.initialize(), 10000);

    // Ensure database schema exists (create tables if needed, but don't drop existing data)
    if (server["databaseManager"]) {
      const client = await getDbClient();
      try {
        await ensureDatabaseSchema(client);
      } finally {
        client.release();
      }
    }

    // Create unique test context for this test
    testContext = createE2ETestContext("e2e-test");
  });

  afterEach(async () => {
    // Clean up test data for this specific test
    if (server["databaseManager"] && server.isInitialized) {
      const client = await getDbClient();
      try {
        // Clean up all data for this test's user ID
        await cleanupUserData(client, testContext.userId);
      } catch (error) {
        console.error("Cleanup error:", error);
      } finally {
        client.release();
      }
    }

    // Shutdown server
    if (server.isInitialized) {
      await server.shutdown();
    }
  });

  afterAll(async () => {
    // Final verification that all E2E test data has been cleaned up
    const verifyServer = new CognitiveMCPServer();
    try {
      await withTimeout(() => verifyServer.initialize(), 10000);
      if (verifyServer["databaseManager"]) {
        const client = await verifyServer["databaseManager"].getConnection();
        try {
          const cleanState = await verifyCleanState(client);
          if (!cleanState.isClean) {
            console.warn(
              `⚠️ E2E test data not fully cleaned up: ${cleanState.remainingMemoryCount} memories remaining`
            );
          }
          const stats = await getDatabaseStats(client);
          console.log(
            `📊 Final DB stats: ${stats.totalMemories} memories, ${stats.testMemories} test memories`
          );
        } finally {
          client.release();
        }
      }
      await verifyServer.shutdown();
    } catch {
      // Verification is best-effort
    }
  });

  // ============================================================================
  // Workflow 1: Memory CRUD
  // Purpose: Verify the complete memory lifecycle from creation to deletion
  // ============================================================================
  describe("Workflow 1: Memory CRUD", () => {
    it(
      "should handle store → retrieve → update → delete workflow",
      { timeout: 30000 },
      async () => {
        testContext = createE2ETestContext("memory-crud");

        // Step 1: Store memory
        const storeResponse = await invokeTool("remember", {
          content: "User prefers dark mode for better readability",
          userId: testContext.userId,
          sessionId: testContext.sessionId,
          primarySector: "semantic",
          metadata: {
            keywords: ["dark", "mode", "preference"],
            tags: ["ui", "settings"],
            category: "preferences",
            importance: 0.8,
          },
        });

        expect(storeResponse.success).toBe(true);
        expect(storeResponse.data).toBeDefined();
        const memoryId = (storeResponse.data as Record<string, unknown>).memoryId as string;
        expect(memoryId).toBeDefined();
        expect((storeResponse.data as Record<string, unknown>).embeddingsGenerated).toBe(5);

        // Track memory for cleanup (backup in case test fails before delete)
        trackMemoryId(testContext, memoryId);

        // Step 2: Retrieve memory
        const retrieveResponse = await invokeTool("recall", {
          userId: testContext.userId,
          text: "dark mode",
          limit: 10,
        });

        expect(retrieveResponse.success).toBe(true);
        const memories = (retrieveResponse.data as Record<string, unknown>).memories as Array<
          Record<string, unknown>
        >;
        expect(memories).toHaveLength(1);
        expect(memories[0].id).toBe(memoryId);
        expect(memories[0].content).toContain("dark mode");

        // Step 3: Update memory
        const updateResponse = await invokeTool("update_memory", {
          memoryId,
          userId: testContext.userId,
          content: "User strongly prefers dark mode for all interfaces",
          strength: 0.95,
          metadata: { importance: 0.9 },
        });

        expect(updateResponse.success).toBe(true);
        expect((updateResponse.data as Record<string, unknown>).embeddingsRegenerated).toBe(true);
        expect((updateResponse.data as Record<string, unknown>).strength).toBe(0.95);

        // Step 4: Delete memory (soft delete first, then hard delete)
        const softDeleteResponse = await invokeTool("forget", {
          memoryId,
          userId: testContext.userId,
          soft: true,
        });

        expect(softDeleteResponse.success).toBe(true);
        expect((softDeleteResponse.data as Record<string, unknown>).deletionType).toBe("soft");

        const hardDeleteResponse = await invokeTool("forget", {
          memoryId,
          userId: testContext.userId,
          soft: false,
        });

        expect(hardDeleteResponse.success).toBe(true);
        expect((hardDeleteResponse.data as Record<string, unknown>).deletionType).toBe("hard");
      }
    );
  });

  // ============================================================================
  // Workflow 2: Memory Search
  // Purpose: Verify that multiple memories can be stored and searched effectively
  // ============================================================================
  describe("Workflow 2: Memory Search", () => {
    it(
      "should handle store multiple → search by text → search by metadata workflow",
      { timeout: 30000 },
      async () => {
        testContext = createE2ETestContext("memory-search");

        // Step 1: Store multiple memories
        const memoriesData = [
          {
            content: "Machine learning algorithms for classification",
            keywords: ["machine", "learning"],
            tags: ["ai", "ml"],
          },
          {
            content: "Deep learning neural networks for image recognition",
            keywords: ["deep", "learning"],
            tags: ["ai", "deep-learning"],
          },
          {
            content: "Natural language processing for text analysis",
            keywords: ["nlp", "text"],
            tags: ["ai", "nlp"],
          },
        ];

        for (const mem of memoriesData) {
          const response = await invokeTool("remember", {
            content: mem.content,
            userId: testContext.userId,
            sessionId: testContext.sessionId,
            primarySector: "semantic",
            metadata: { keywords: mem.keywords, tags: mem.tags, category: "technology" },
          });
          expect(response.success).toBe(true);
          trackMemoryId(testContext, (response.data as Record<string, unknown>).memoryId as string);
        }

        // Step 2: Search by text
        const textSearchResponse = await invokeTool("search", {
          userId: testContext.userId,
          text: "learning",
          limit: 10,
        });

        expect(textSearchResponse.success).toBe(true);
        const textSearchMemories = (textSearchResponse.data as Record<string, unknown>)
          .memories as Array<Record<string, unknown>>;
        expect(textSearchMemories.length).toBeGreaterThan(0);

        // Step 3: Search by metadata
        const metadataSearchResponse = await invokeTool("search", {
          userId: testContext.userId,
          metadata: { tags: ["deep-learning"] },
          limit: 10,
        });

        expect(metadataSearchResponse.success).toBe(true);
        const metadataSearchMemories = (metadataSearchResponse.data as Record<string, unknown>)
          .memories as Array<Record<string, unknown>>;
        expect(metadataSearchMemories.length).toBeGreaterThan(0);
        const firstMemoryMetadata = metadataSearchMemories[0].metadata as Record<string, unknown>;
        expect(firstMemoryMetadata.tags).toContain("deep-learning");
      }
    );
  });

  // ============================================================================
  // Workflow 3: Reasoning
  // Purpose: Verify the reasoning workflow including thinking, confidence, and bias
  // ============================================================================
  describe("Workflow 3: Reasoning", () => {
    it("should handle think → assess confidence → detect bias workflow", async () => {
      testContext = createE2ETestContext("reasoning");

      // Step 1: Think about a problem
      const thinkResponse = await invokeTool("think", {
        problem: "Should we migrate our monolithic application to microservices?",
        mode: "analytical",
        context: {
          evidence: [
            "Current system handles 10k requests/sec",
            "Team has 5 developers",
            "Budget is limited",
          ],
        },
      });

      expect(thinkResponse.success).toBe(true);
      const thinkData = thinkResponse.data as Record<string, unknown>;
      expect(thinkData.reasoning).toBeDefined();
      expect(thinkData.conclusion).toBeDefined();

      const reasoningText = Array.isArray(thinkData.reasoning)
        ? (thinkData.reasoning as string[]).join(" ")
        : (thinkData.reasoning as string);

      // Step 2: Assess confidence
      const confidenceResponse = await invokeTool("assess_confidence", {
        reasoning: reasoningText,
        evidence: [
          "Current system handles 10k requests/sec",
          "Team has 5 developers",
          "Budget is limited",
        ],
      });

      expect(confidenceResponse.success).toBe(true);
      const confidenceData = confidenceResponse.data as Record<string, unknown>;
      expect(confidenceData.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(confidenceData.overallConfidence).toBeLessThanOrEqual(1);
      expect(confidenceData.factors).toBeDefined();

      // Step 3: Detect bias
      const biasResponse = await invokeTool("detect_bias", {
        reasoning: reasoningText,
        context: "System migration decision",
      });

      expect(biasResponse.success).toBe(true);
      const biasData = biasResponse.data as Record<string, unknown>;
      expect(biasData.biases).toBeDefined();
      expect(Array.isArray(biasData.biases)).toBe(true);
    });
  });

  // ============================================================================
  // Workflow 4: Problem Decomposition
  // Purpose: Verify the problem decomposition and analysis workflow
  // ============================================================================
  describe("Workflow 4: Problem Decomposition", () => {
    it("should handle breakdown → analyze → evaluate workflow", async () => {
      testContext = createE2ETestContext("decomposition");

      // Step 1: Decompose problem
      const breakdownResponse = await invokeTool("breakdown", {
        problem: "Design a scalable e-commerce platform",
        maxDepth: 2,
      });

      expect(breakdownResponse.success).toBe(true);
      const breakdownData = breakdownResponse.data as Record<string, unknown>;
      expect(breakdownData.subProblems).toBeDefined();
      expect((breakdownData.subProblems as unknown[]).length).toBeGreaterThan(0);

      // Step 2: Analyze systematically
      const analyzeResponse = await invokeTool("analyze", {
        problem: "Design a scalable e-commerce platform",
        context: {
          constraints: ["Budget: $100k", "Timeline: 6 months"],
          goals: ["Handle 100k users", "99.9% uptime"],
        },
      });

      expect(analyzeResponse.success).toBe(true);
      const analyzeData = analyzeResponse.data as Record<string, unknown>;
      expect(analyzeData.framework).toBeDefined();
      expect(analyzeData.result).toBeDefined();

      // Step 3: Evaluate reasoning quality
      const resultData = analyzeData.result as Record<string, unknown>;
      const evaluateResponse = await invokeTool("evaluate", {
        reasoning: resultData.conclusion as string,
        context: "E-commerce platform design with constraints",
      });

      expect(evaluateResponse.success).toBe(true);
      const evaluateData = evaluateResponse.data as Record<string, unknown>;
      expect(evaluateData.quality).toBeDefined();
      expect(evaluateData.strengths).toBeDefined();
      expect(evaluateData.weaknesses).toBeDefined();
    });
  });

  // ============================================================================
  // Workflow 5: Tool Chaining (Memory + Reasoning Integration)
  // Purpose: Verify that memory and reasoning tools can be chained together
  // ============================================================================
  describe("Workflow 5: Tool Chaining", () => {
    it("should chain memory and reasoning tools", { timeout: 30000 }, async () => {
      testContext = createE2ETestContext("tool-chaining");

      // Step 1: Store context memory
      const storeResponse = await invokeTool("remember", {
        content: "Company policy: All decisions must consider environmental impact",
        userId: testContext.userId,
        sessionId: testContext.sessionId,
        primarySector: "semantic",
        metadata: {
          keywords: ["policy", "environment", "decisions"],
          tags: ["policy", "sustainability"],
          category: "company-policy",
          importance: 0.9,
        },
      });

      expect(storeResponse.success).toBe(true);
      trackMemoryId(
        testContext,
        (storeResponse.data as Record<string, unknown>).memoryId as string
      );

      // Step 2: Retrieve relevant context
      const retrieveResponse = await invokeTool("recall", {
        userId: testContext.userId,
        text: "company policy decisions",
        limit: 5,
      });

      expect(retrieveResponse.success).toBe(true);
      const memories = (retrieveResponse.data as Record<string, unknown>).memories as Array<
        Record<string, unknown>
      >;
      const context = memories.map((m) => m.content as string);

      // Step 3: Think with retrieved context
      const thinkResponse = await invokeTool("think", {
        problem: "Should we switch to cheaper but less eco-friendly packaging?",
        mode: "critical",
        context: {
          evidence: context,
          constraints: ["Budget constraints", "Environmental policy"],
        },
      });

      expect(thinkResponse.success).toBe(true);
      const thinkData = thinkResponse.data as Record<string, unknown>;
      expect(thinkData.reasoning).toBeDefined();

      // Step 4: Store the reasoning as a new memory
      const insightResponse = await invokeTool("remember", {
        content: `Decision insight: ${thinkData.conclusion as string}`,
        userId: testContext.userId,
        sessionId: testContext.sessionId,
        primarySector: "reflective",
        metadata: {
          keywords: ["decision", "packaging", "environment"],
          tags: ["decision", "insight"],
          category: "decisions",
          importance: 0.8,
        },
      });

      expect(insightResponse.success).toBe(true);
      trackMemoryId(
        testContext,
        (insightResponse.data as Record<string, unknown>).memoryId as string
      );
    });
  });
});
