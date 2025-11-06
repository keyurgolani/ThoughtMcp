/**
 * Additional unit tests for CognitiveMCPServer tool handlers
 * Tests the implementation of missing handler methods to improve coverage
 */

import { promises as fs } from "fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CognitiveMCPServer } from "../../server/CognitiveMCPServer.js";
import type {
  AnalyzeMemoryUsageArgs,
  AnalyzeSystematicallyArgs,
  DecomposeProblemArgs,
  ForgettingAuditArgs,
  ForgettingPolicyArgs,
  OptimizeMemoryArgs,
  RecoverMemoryArgs,
  ThinkParallelArgs,
} from "../../types/mcp.js";

describe("CognitiveMCPServer Additional Tool Handlers", () => {
  let server: CognitiveMCPServer;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };

    // Ensure tmp directory exists
    await fs.mkdir("./tmp", { recursive: true });

    // Set up test environment with unique temporary brain directory
    const testId = Math.random().toString(36).substring(7);
    process.env.COGNITIVE_BRAIN_DIR = `./tmp/test-brain-${testId}`;

    server = new CognitiveMCPServer();
    // Initialize without connecting to transport for testing
    await server.initialize(true);
  });

  afterEach(async () => {
    await server.shutdown();

    // Clean up test directory
    if (
      process.env.COGNITIVE_BRAIN_DIR &&
      process.env.COGNITIVE_BRAIN_DIR.startsWith("./tmp/test-brain-")
    ) {
      try {
        await fs.rm(process.env.COGNITIVE_BRAIN_DIR, {
          recursive: true,
          force: true,
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Restore original environment
    process.env = originalEnv;
  });

  describe("handleAnalyzeSystematically", () => {
    it("should analyze problems systematically with default mode", async () => {
      const args: AnalyzeSystematicallyArgs = {
        input: "How can we improve our software development process?",
      };

      const result = await server.handleAnalyzeSystematically(args);

      expect(result).toBeDefined();
      expect(result.problem_structure).toBeDefined();
      expect(result.recommended_framework).toBeDefined();
      expect(result.analysis_steps).toBeDefined();
      expect(Array.isArray(result.analysis_steps)).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.processing_time_ms).toBeGreaterThan(0);
    });

    it("should analyze with specific context", async () => {
      const args: AnalyzeSystematicallyArgs = {
        input: "What are the risks of cloud migration?",
        context: {
          domain: "technology",
          urgency: 0.8,
          complexity: 0.9,
        },
      };

      const result = await server.handleAnalyzeSystematically(args);

      expect(result).toBeDefined();
      expect(result.problem_structure).toBeDefined();
      expect(result.recommended_framework).toBeDefined();
    });

    it("should handle complex problems", async () => {
      const args: AnalyzeSystematicallyArgs = {
        input: "Design a comprehensive strategy for digital transformation",
        mode: "auto",
        verbosity: "detailed",
      };

      const result = await server.handleAnalyzeSystematically(args);

      expect(result).toBeDefined();
      expect(result.analysis_steps.length).toBeGreaterThan(0); // Detailed analysis
      expect(result.recommended_framework).toBeDefined();
    });

    it("should throw error for empty input", async () => {
      const args: AnalyzeSystematicallyArgs = {
        input: "",
      };

      await expect(server.handleAnalyzeSystematically(args)).rejects.toThrow();
    });
  });

  describe("handleThinkParallel", () => {
    it("should process parallel thinking with default settings", async () => {
      const args: ThinkParallelArgs = {
        input: "What are the pros and cons of remote work?",
      };

      const result = await server.handleThinkParallel(args);

      expect(result).toBeDefined();
      expect(result.synthesized_conclusion).toBeDefined();
      expect(typeof result.synthesized_conclusion).toBe("string");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.stream_results)).toBe(true);
      expect(result.stream_results.length).toBeGreaterThan(0);
      expect(result.processing_time_ms).toBeGreaterThan(0);
    });

    it("should handle paralg with context", async () => {
      const args: ThinkParallelArgs = {
        input: "How should we approach market expansion?",
        context: {
          domain: "business",
          urgency: 0.7,
          complexity: 0.8,
        },
        enable_coordination: true,
      };

      const result = await server.handleThinkParallel(args);

      expect(result).toBeDefined();
      expect(result.synthesized_conclusion).toBeDefined();
      expect(Array.isArray(result.stream_results)).toBe(true);
      expect(result.stream_results.length).toBeGreaterThan(0);
    });

    it("should process with different verbosity levels", async () => {
      const args: ThinkParallelArgs = {
        input: "Analyze the impact of AI on education",
        verbosity: "summary",
      };

      const result = await server.handleThinkParallel(args);

      expect(result).toBeDefined();
      expect(result.synthesized_conclusion).toBeDefined();
      expect(Array.isArray(result.stream_results)).toBe(true);
    });

    it("should throw error for empty input", async () => {
      const args: ThinkParallelArgs = {
        input: "",
      };

      await expect(server.handleThinkParallel(args)).rejects.toThrow();
    });
  });

  describe("handleDecomposeProblem", () => {
    it("should decompose problems with default settings", async () => {
      const args: DecomposeProblemArgs = {
        input: "Build a scalable e-commerce platform",
      };

      const result = await server.handleDecomposeProblem(args);

      expect(result).toBeDefined();
      expect(result.original_problem).toBeDefined();
      expect(Array.isArray(result.hierarchical_structure)).toBe(true);
      expect(result.hierarchical_structure.length).toBeGreaterThan(0);
      expect(result.processing_time_ms).toBeGreaterThan(0);
    });

    it("should decompose with specific depth", async () => {
      const args: DecomposeProblemArgs = {
        input: "Implement a machine learning pipeline",
        max_depth: 3,
      };

      const result = await server.handleDecomposeProblem(args);

      expect(result).toBeDefined();
      expect(result.original_problem).toBeDefined();
      expect(Array.isArray(result.hierarchical_structure)).toBe(true);
    });

    it("should handle complex problems with context", async () => {
      const args: DecomposeProblemArgs = {
        input: "Modernize legacy enterprise software",
        context: {
          domain: "enterprise_software",
          complexity: 0.9,
        },
        strategies: ["functional", "temporal"],
      };

      const result = await server.handleDecomposeProblem(args);

      expect(result).toBeDefined();
      expect(result.hierarchical_structure.length).toBeGreaterThan(0);
    });

    it("should throw error for empty input", async () => {
      const args: DecomposeProblemArgs = {
        input: "",
      };

      await expect(server.handleDecomposeProblem(args)).rejects.toThrow();
    });
  });

  describe("handleAnalyzeMemoryUsage", () => {
    beforeEach(async () => {
      // Store some test memories first
      await server.handleRemember({
        content: "Test memory for usage analysis",
        type: "episodic",
        importance: 0.8,
      });

      await server.handleRemember({
        content: "Another test memory",
        type: "semantic",
        importance: 0.6,
      });
    });

    it("should analyze memory usage with default settings", async () => {
      const args: AnalyzeMemoryUsageArgs = {};

      const result = await server.handleAnalyzeMemoryUsage(args);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(typeof result.analysis).toBe("object");
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.analysis_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should analyze with deep analysis", async () => {
      const args: AnalyzeMemoryUsageArgs = {
        analysis_depth: "deep",
        include_recommendations: true,
      };

      const result = await server.handleAnalyzeMemoryUsage(args);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.recommendations?.length ?? 0).toBeGreaterThanOrEqual(0);
    });

    it("should analyze with context", async () => {
      const args: AnalyzeMemoryUsageArgs = {
        context: {
          domain: "test",
          session_id: "analysis_session",
        },
        verbosity: "detailed",
      };

      const result = await server.handleAnalyzeMemoryUsage(args);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
    });
  });

  describe("handleOptimizeMemory", () => {
    beforeEach(async () => {
      // Store multiple test memories
      for (let i = 0; i < 10; i++) {
        await server.handleRemember({
          content: `Test memory ${i} for optimization`,
          type: i % 2 === 0 ? "episodic" : "semantic",
          importance: 0.3 + i * 0.05, // Varying importance
        });
      }
    });

    it("should optimize memory with default settings", async () => {
      const args: OptimizeMemoryArgs = {};

      const result = await server.handleOptimizeMemory(args);

      expect(result).toBeDefined();
      expect(result.optimization_summary).toBeDefined();
      expect(typeof result.optimization_summary).toBe("object");
      expect(
        result.optimization_summary.memories_processed
      ).toBeGreaterThanOrEqual(0);
      expect(
        result.optimization_summary.memories_degraded
      ).toBeGreaterThanOrEqual(0);
      expect(result.optimization_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should optimize with moderate settings", async () => {
      const args: OptimizeMemoryArgs = {
        optimization_mode: "moderate",
        target_memory_reduction: 0.2,
        preserve_important_memories: true,
      };

      const result = await server.handleOptimizeMemory(args);

      expect(result).toBeDefined();
      expect(result.optimization_summary).toBeDefined();
      expect(
        result.optimization_summary.memories_processed
      ).toBeGreaterThanOrEqual(0);
    });

    it("should optimize with context", async () => {
      const args: OptimizeMemoryArgs = {
        context: {
          domain: "test",
        },
        verbosity: "detailed",
      };

      const result = await server.handleOptimizeMemory(args);

      expect(result).toBeDefined();
      expect(result.optimization_summary).toBeDefined();
    });
  });

  describe("handleRecoverMemory", () => {
    let memoryId: string;

    beforeEach(async () => {
      // Store a memory that we can try to recover
      const result = await server.handleRemember({
        content: "Important memory to recover",
        type: "episodic",
        importance: 0.9,
        emotional_tags: ["important", "recovery_test"],
      });
      memoryId = result.memory_id;
    });

    it("should attempt memory recovery with basic cues", async () => {
      const args: RecoverMemoryArgs = {
        memory_id: memoryId,
        recovery_cues: [
          {
            type: "semantic",
            value: "important memory",
          },
          {
            type: "emotional",
            value: "important",
          },
        ],
      };

      const result = await server.handleRecoverMemory(args);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(typeof result.success).toBe("boolean");
      expect(result.memory_id).toBeDefined();
      expect(result.recovery_confidence).toBeGreaterThanOrEqual(0);
      expect(result.recovery_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle recovery with multiple cue types", async () => {
      const args: RecoverMemoryArgs = {
        memory_id: memoryId,
        recovery_cues: [
          {
            type: "semantic",
            value: "recovery test",
            strength: 0.8,
          },
          {
            type: "temporal",
            value: "recent",
            strength: 0.6,
          },
          {
            type: "contextual",
            value: "test environment",
            strength: 0.7,
          },
        ],
        max_recovery_attempts: 3,
      };

      const result = await server.handleRecoverMemory(args);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });

    it("should handle recovery with context", async () => {
      const args: RecoverMemoryArgs = {
        memory_id: memoryId,
        recovery_cues: [
          {
            type: "associative",
            value: "test memory",
          },
        ],
        context: {
          domain: "test",
        },
        verbosity: "detailed",
      };

      const result = await server.handleRecoverMemory(args);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it("should handle empty memory_id gracefully", async () => {
      const args: RecoverMemoryArgs = {
        memory_id: "",
        recovery_cues: [
          {
            type: "semantic",
            value: "test",
          },
        ],
      };

      const result = await server.handleRecoverMemory(args);
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it("should throw error for empty recovery cues", async () => {
      const args: RecoverMemoryArgs = {
        memory_id: memoryId,
        recovery_cues: [],
      };

      await expect(server.handleRecoverMemory(args)).rejects.toThrow();
    });
  });

  describe("handleForgettingAudit", () => {
    it("should perform forgetting audit with default settings", async () => {
      const args: ForgettingAuditArgs = {};

      const result = await server.handleForgettingAudit(args);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(typeof result.success).toBe("boolean");
      expect(Array.isArray(result.audit_entries)).toBe(true);
      expect(result.query_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should perform audit with query filters", async () => {
      const args: ForgettingAuditArgs = {
        query: {
          limit: 10,
          execution_status: ["executed"],
        },
        include_summary: true,
      };

      const result = await server.handleForgettingAudit(args);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(Array.isArray(result.audit_entries)).toBe(true);
    });

    it("should handle audit with context", async () => {
      const args: ForgettingAuditArgs = {
        verbosity: "detailed",
        include_executive_summary: true,
      };

      const result = await server.handleForgettingAudit(args);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe("handleForgettingPolicy", () => {
    it("should list forgetting policies", async () => {
      const args: ForgettingPolicyArgs = {
        action: "list",
      };

      const result = await server.handleForgettingPolicy(args);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(typeof result.success).toBe("boolean");
      expect(result.action).toBe("list");
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should create a new forgetting policy", async () => {
      const args: ForgettingPolicyArgs = {
        action: "create",
        policy_data: {
          policy_name: "test_policy",
          description: "Test policy for unit tests",
          active: true,
          rules: [
            {
              rule_name: "test_rule",
              conditions: [
                {
                  condition_type: "importance_threshold",
                  operator: "less_than",
                  value: 0.3,
                },
              ],
              condition_logic: "AND",
              action: "allow",
              priority: 1,
            },
          ],
        },
      };

      const result = await server.handleForgettingPolicy(args);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it("should handle policy evaluation", async () => {
      const args: ForgettingPolicyArgs = {
        action: "evaluate",
        evaluation_context: {
          memory_id: "test_memory_id",
          memory_type: "episodic",
          decision: {},
          evaluation: {},
          memory_metadata: {
            importance: 0.5,
            age_days: 30,
          },
        },
      };

      const result = await server.handleForgettingPolicy(args);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it("should throw error for invalid action", async () => {
      const args: ForgettingPolicyArgs = {
        action: "invalid_action" as any,
      };

      await expect(server.handleForgettingPolicy(args)).rejects.toThrow();
    });
  });

  describe("Integration Tests for Additional Handlers", () => {
    it("should handle systematic analysis -> parallel thinking workflow", async () => {
      // First, analyze systematically
      const systematicResult = await server.handleAnalyzeSystematically({
        input: "How can we improve team productivity?",
      });

      expect(systematicResult).toBeDefined();

      // Then use parallel thinking on the same topic
      const parallelResult = await server.handleThinkParallel({
        input: "How can we improve team productivity?",
      });

      expect(parallelResult).toBeDefined();
      expect(parallelResult.synthesized_conclusion).toBeDefined();
    });

    it("should handle problem decomposition -> memory optimization workflow", async () => {
      // Decompose a problem
      const decompositionResult = await server.handleDecomposeProblem({
        input: "Optimize our development workflow",
      });

      expect(decompositionResult).toBeDefined();

      // Store the decomposition as memory
      await server.handleRemember({
        content: JSON.stringify(decompositionResult.hierarchical_structure),
        type: "semantic",
        importance: 0.8,
      });

      // Analyze memory usage
      const memoryAnalysis = await server.handleAnalyzeMemoryUsage({});

      expect(memoryAnalysis).toBeDefined();

      // Optimize memory
      const optimizationResult = await server.handleOptimizeMemory({
        optimization_mode: "conservative",
      });

      expect(optimizationResult).toBeDefined();
    });

    it("should handle forgetting policy -> audit workflow", async () => {
      // List existing policies
      const listResult = await server.handleForgettingPolicy({
        action: "list",
      });

      expect(listResult).toBeDefined();

      // Perform audit
      const auditResult = await server.handleForgettingAudit({
        include_summary: true,
      });

      expect(auditResult).toBeDefined();
      expect(auditResult.success).toBeDefined();
    });
  });
});
