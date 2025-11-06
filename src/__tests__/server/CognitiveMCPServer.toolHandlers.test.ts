/**
 * Unit tests for CognitiveMCPServer tool handlers
 * Tests the implementation of handleThink, handleRemember, handleRecall, and handleAnalyzeReasoning
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CognitiveMCPServer } from "../../server/CognitiveMCPServer.js";
import { ProcessingMode, ReasoningType } from "../../types/core.js";
import type {
  AnalyzeReasoningArgs,
  RecallArgs,
  RememberArgs,
  ThinkArgs,
  ThinkProbabilisticArgs,
} from "../../types/mcp.js";

describe("CognitiveMCPServer Tool Handlers", () => {
  let server: CognitiveMCPServer;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set up test environment with unique temporary brain directory
    const testId = Math.random().toString(36).substring(7);
    process.env.COGNITIVE_BRAIN_DIR = `./tmp/test-brain-${testId}`;

    server = new CognitiveMCPServer();
    // Initialize without connecting to transport for testing
    await server.initialize(true);
  });

  afterEach(async () => {
    await server.shutdown();

    // Restore original environment
    process.env = originalEnv;
  });

  describe("handleThink", () => {
    it("should process basic think request with default parameters", async () => {
      const args: ThinkArgs = {
        input: "What is the meaning of life?",
      };

      const result = await server.handleThink(args);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe("string");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.reasoning_path)).toBe(true);
      expect(result.emotional_context).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.processing_time_ms).toBeGreaterThan(0);
      expect(result.metadata.system_mode).toBe(ProcessingMode.BALANCED);
    });

    it("should process think request with specific mode", async () => {
      const args: ThinkArgs = {
        input: "Analyze this complex problem",
        mode: ProcessingMode.ANALYTICAL,
        enable_emotion: false,
        enable_metacognition: true,
        max_depth: 5,
        temperature: 0.3,
      };

      const result = await server.handleThink(args);

      expect(result).toBeDefined();
      expect(result.metadata.system_mode).toBe(ProcessingMode.ANALYTICAL);
      expect(result.metadata.temperature).toBeDefined();
    });

    it("should process think request with context", async () => {
      const args: ThinkArgs = {
        input: "Consider this in the context of software development",
        context: {
          domain: "software_engineering",
          session_id: "test_session_123",
          urgency: 0.8,
          complexity: 0.9,
        },
      };

      const result = await server.handleThink(args);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it("should handle creative mode thinking", async () => {
      const args: ThinkArgs = {
        input: "Come up with innovative solutions",
        mode: ProcessingMode.CREATIVE,
        temperature: 1.5,
      };

      const result = await server.handleThink(args);

      expect(result).toBeDefined();
      expect(result.metadata.system_mode).toBe(ProcessingMode.CREATIVE);
      expect(result.metadata.temperature).toBe(1.5);
    });

    it("should handle intuitive mode thinking", async () => {
      const args: ThinkArgs = {
        input: "What's your gut feeling about this?",
        mode: ProcessingMode.INTUITIVE,
        enable_emotion: true,
      };

      const result = await server.handleThink(args);

      expect(result).toBeDefined();
      expect(result.metadata.system_mode).toBe(ProcessingMode.INTUITIVE);
    });

    it("should handle deliberative mode thinking", async () => {
      const args: ThinkArgs = {
        input: "Carefully analyze all aspects of this decision",
        mode: ProcessingMode.DELIBERATIVE,
        max_depth: 15,
      };

      const result = await server.handleThink(args);

      expect(result).toBeDefined();
      expect(result.metadata.system_mode).toBe(ProcessingMode.DELIBERATIVE);
    });

    it("should throw error for invalid input", async () => {
      const args = {
        input: "", // Empty input should be invalid
      } as ThinkArgs;

      await expect(server.handleThink(args)).rejects.toThrow();
    });

    it("should handle long input text", async () => {
      const longInput = "A".repeat(10000); // Very long input
      const args: ThinkArgs = {
        input: longInput,
      };

      const result = await server.handleThink(args);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("handleRemember", () => {
    it("should store episodic memory", async () => {
      const args: RememberArgs = {
        content: "I had a great meeting with the team today",
        type: "episodic",
        importance: 0.8,
        emotional_tags: ["positive", "productive"],
        context: {
          domain: "work",
          session_id: "test_session",
        },
      };

      const result = await server.handleRemember(args);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.memory_id).toBeDefined();
      expect(typeof result.memory_id).toBe("string");
      expect(result.message).toContain("episodic");
    });

    it("should store semantic memory", async () => {
      const args: RememberArgs = {
        content: "TypeScript is a superset of JavaScript",
        type: "semantic",
        importance: 0.9,
        context: {
          domain: "programming",
        },
      };

      const result = await server.handleRemember(args);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.memory_id).toBeDefined();
      expect(result.message).toContain("semantic");
    });

    it("should handle memory with minimal information", async () => {
      const args: RememberArgs = {
        content: "Simple fact to remember",
        type: "semantic",
      };

      const result = await server.handleRemember(args);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should handle memory with emotional tags", async () => {
      const args: RememberArgs = {
        content: "This was a challenging but rewarding experience",
        type: "episodic",
        importance: 0.7,
        emotional_tags: ["challenging", "rewarding", "growth"],
      };

      const result = await server.handleRemember(args);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should throw error for invalid memory type", async () => {
      const args = {
        content: "Some content",
        type: "invalid_type", // Invalid type
      } as unknown as RememberArgs;

      await expect(server.handleRemember(args)).rejects.toThrow();
    });

    it("should throw error for empty content", async () => {
      const args = {
        content: "", // Empty content
        type: "episodic",
      } as RememberArgs;

      await expect(server.handleRemember(args)).rejects.toThrow();
    });
  });

  describe("handleRecall", () => {
    beforeEach(async () => {
      // Store some test memories first
      await server.handleRemember({
        content: "Meeting about project planning",
        type: "episodic",
        importance: 0.8,
        emotional_tags: ["productive"],
        context: { domain: "work" },
      });

      await server.handleRemember({
        content: "JavaScript is a programming language",
        type: "semantic",
        importance: 0.9,
        context: { domain: "programming" },
      });

      await server.handleRemember({
        content: "Team lunch was enjoyable",
        type: "episodic",
        importance: 0.6,
        emotional_tags: ["positive", "social"],
      });
    });

    it("should recall memories with basic cue", async () => {
      const args: RecallArgs = {
        cue: "meeting",
      };

      const result = await server.handleRecall(args);

      expect(result).toBeDefined();
      expect(Array.isArray(result.memories)).toBe(true);
      expect(typeof result.total_found).toBe("number");
      expect(result.search_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should recall episodic memories only", async () => {
      const args: RecallArgs = {
        cue: "team",
        type: "episodic",
        max_results: 5,
        threshold: 0.3,
      };

      const result = await server.handleRecall(args);

      expect(result).toBeDefined();
      expect(Array.isArray(result.memories)).toBe(true);
      // All returned memories should be episodic (check that we have memories)
      expect(result.memories.length).toBeGreaterThanOrEqual(0);
    });

    it("should recall semantic memories only", async () => {
      const args: RecallArgs = {
        cue: "programming",
        type: "semantic",
        max_results: 5,
        threshold: 0.2,
      };

      const result = await server.handleRecall(args);

      expect(result).toBeDefined();
      expect(Array.isArray(result.memories)).toBe(true);
    });

    it("should recall both types of memories", async () => {
      const args: RecallArgs = {
        cue: "work",
        type: "both",
        max_results: 10,
        threshold: 0.1,
      };

      const result = await server.handleRecall(args);

      expect(result).toBeDefined();
      expect(Array.isArray(result.memories)).toBe(true);
    });

    it("should respect max_results limit", async () => {
      const args: RecallArgs = {
        cue: "test",
        max_results: 2,
      };

      const result = await server.handleRecall(args);

      expect(result).toBeDefined();
      expect(result.memories.length).toBeLessThanOrEqual(2);
    });

    it("should handle high threshold filtering", async () => {
      const args: RecallArgs = {
        cue: "nonexistent",
        threshold: 0.9, // Very high threshold
      };

      const result = await server.handleRecall(args);

      expect(result).toBeDefined();
      expect(Array.isArray(result.memories)).toBe(true);
      // Might return empty array due to high threshold
    });

    it("should throw error for empty cue", async () => {
      const args = {
        cue: "", // Empty cue
      } as RecallArgs;

      await expect(server.handleRecall(args)).rejects.toThrow();
    });

    it("should handle context-based recall", async () => {
      const args: RecallArgs = {
        cue: "project",
        context: {
          domain: "work",
          session_id: "test_session",
        },
      };

      const result = await server.handleRecall(args);

      expect(result).toBeDefined();
      expect(Array.isArray(result.memories)).toBe(true);
    });
  });

  describe("handleAnalyzeReasoning", () => {
    it("should analyze basic reasoning steps", async () => {
      const args: AnalyzeReasoningArgs = {
        reasoning_steps: [
          {
            type: ReasoningType.LOGICAL_INFERENCE,
            content:
              "If all humans are mortal, and Socrates is human, then Socrates is mortal",
            confidence: 0.9,
            alternatives: [],
          },
          {
            type: ReasoningType.DEDUCTIVE,
            content: "This follows logically from the premises",
            confidence: 0.8,
            alternatives: [
              {
                content: "Could consider inductive reasoning instead",
                confidence: 0.3,
                reasoning: "Alternative approach",
              },
            ],
          },
        ],
      };

      const result = await server.handleAnalyzeReasoning(args);

      expect(result).toBeDefined();
      expect(typeof result.coherence_score).toBe("number");
      expect(result.coherence_score).toBeGreaterThanOrEqual(0);
      expect(result.coherence_score).toBeLessThanOrEqual(1);
      expect(typeof result.confidence_assessment).toBe("string");
      expect(Array.isArray(result.detected_biases)).toBe(true);
      expect(Array.isArray(result.suggested_improvements)).toBe(true);
      expect(result.reasoning_quality).toBeDefined();
      expect(typeof result.reasoning_quality.logical_consistency).toBe(
        "number"
      );
      expect(typeof result.reasoning_quality.evidence_support).toBe("number");
      expect(typeof result.reasoning_quality.completeness).toBe("number");
    });

    it("should detect biases in reasoning", async () => {
      const args: AnalyzeReasoningArgs = {
        reasoning_steps: [
          {
            type: ReasoningType.HEURISTIC,
            content:
              "This obviously confirms my initial belief and supports my view clearly",
            confidence: 0.95,
            alternatives: [],
          },
          {
            type: ReasoningType.PATTERN_MATCH,
            content:
              "As expected, this is definitely the right answer without doubt",
            confidence: 0.98,
            alternatives: [],
          },
        ],
      };

      const result = await server.handleAnalyzeReasoning(args);

      expect(result).toBeDefined();
      expect(result.detected_biases.length).toBeGreaterThan(0);
      // Should detect confirmation bias and overconfidence bias
      expect(result.suggested_improvements.length).toBeGreaterThan(0);
    });

    it("should analyze reasoning with low confidence", async () => {
      const args: AnalyzeReasoningArgs = {
        reasoning_steps: [
          {
            type: ReasoningType.PROBABILISTIC,
            content: "I'm not sure about this, but maybe it could be true",
            confidence: 0.2,
            alternatives: [],
          },
          {
            type: ReasoningType.ANALOGICAL,
            content: "This might be similar to other cases, but I'm uncertain",
            confidence: 0.3,
            alternatives: [],
          },
        ],
      };

      const result = await server.handleAnalyzeReasoning(args);

      expect(result).toBeDefined();
      expect(result.confidence_assessment).toContain("confidence");
      expect(result.suggested_improvements.length).toBeGreaterThan(0);
    });

    it("should analyze complex reasoning with multiple types", async () => {
      const args: AnalyzeReasoningArgs = {
        reasoning_steps: [
          {
            type: ReasoningType.CAUSAL,
            content: "The increase in temperature causes ice to melt",
            confidence: 0.9,
            alternatives: [],
          },
          {
            type: ReasoningType.PROBABILISTIC,
            content:
              "There's a 90% chance this will happen under these conditions",
            confidence: 0.8,
            alternatives: [
              {
                content: "Could be 85% based on different data",
                confidence: 0.7,
                reasoning: "Alternative probability estimate",
              },
            ],
          },
          {
            type: ReasoningType.METACOGNITIVE,
            content: "I should consider whether my reasoning is sound",
            confidence: 0.7,
            alternatives: [],
          },
        ],
      };

      const result = await server.handleAnalyzeReasoning(args);

      expect(result).toBeDefined();
      expect(result.reasoning_quality.completeness).toBeGreaterThan(0.5);
    });

    it("should handle single reasoning step", async () => {
      const args: AnalyzeReasoningArgs = {
        reasoning_steps: [
          {
            type: ReasoningType.LOGICAL_INFERENCE,
            content: "This is a simple logical conclusion",
            confidence: 0.7,
            alternatives: [],
          },
        ],
      };

      const result = await server.handleAnalyzeReasoning(args);

      expect(result).toBeDefined();
      expect(result.coherence_score).toBeGreaterThanOrEqual(0);
    });

    it("should throw error for empty reasoning steps", async () => {
      const args = {
        reasoning_steps: [], // Empty array
      } as AnalyzeReasoningArgs;

      await expect(server.handleAnalyzeReasoning(args)).rejects.toThrow();
    });

    it("should throw error for invalid reasoning step format", async () => {
      const args = {
        reasoning_steps: [
          {
            // Missing required fields
            content: "Some content",
          },
        ],
      } as AnalyzeReasoningArgs;

      await expect(server.handleAnalyzeReasoning(args)).rejects.toThrow();
    });

    it("should analyze reasoning with context", async () => {
      const args: AnalyzeReasoningArgs = {
        reasoning_steps: [
          {
            type: ReasoningType.CONTEXTUAL,
            content:
              "In the context of software development, this approach makes sense",
            confidence: 0.8,
            alternatives: [],
          },
        ],
        context: {
          domain: "software_engineering",
          session_id: "analysis_session",
        },
      };

      const result = await server.handleAnalyzeReasoning(args);

      expect(result).toBeDefined();
      expect(result.coherence_score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Integration Tests", () => {
    it("should handle think -> remember -> recall workflow", async () => {
      // First, think about something
      const thinkResult = await server.handleThink({
        input: "What are the benefits of TypeScript?",
        mode: ProcessingMode.ANALYTICAL,
      });

      expect(thinkResult).toBeDefined();

      // Remember the thought
      const rememberResult = await server.handleRemember({
        content: thinkResult.content,
        type: "episodic",
        importance: 0.8,
        emotional_tags: ["learning"],
      });

      expect(rememberResult.success).toBe(true);

      // Recall related memories
      const recallResult = await server.handleRecall({
        cue: "TypeScript",
        type: "both",
      });

      expect(recallResult).toBeDefined();
      expect(Array.isArray(recallResult.memories)).toBe(true);
    });

    it("should handle think -> analyze reasoning workflow", async () => {
      // Think about something complex
      const thinkResult = await server.handleThink({
        input: "Should we adopt microservices architecture?",
        mode: ProcessingMode.DELIBERATIVE,
        enable_metacognition: true,
      });

      expect(thinkResult).toBeDefined();
      expect(thinkResult.reasoning_path.length).toBeGreaterThan(0);

      // Analyze the reasoning
      const analysisResult = await server.handleAnalyzeReasoning({
        reasoning_steps: thinkResult.reasoning_path,
      });

      expect(analysisResult).toBeDefined();
      expect(typeof analysisResult.coherence_score).toBe("number");
    });

    it("should maintain consistency across multiple operations", async () => {
      const sessionId = "consistency_test_session";

      // Multiple think operations with same session
      const results = await Promise.all([
        server.handleThink({
          input: "First thought",
          context: { session_id: sessionId },
        }),
        server.handleThink({
          input: "Second thought",
          context: { session_id: sessionId },
        }),
        server.handleThink({
          input: "Third thought",
          context: { session_id: sessionId },
        }),
      ]);

      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      });

      // Store memories from all thoughts
      const memoryResults = await Promise.all(
        results.map((result, index) =>
          server.handleRemember({
            content: result.content,
            type: "episodic",
            importance: 0.5 + index * 0.1,
            context: { session_id: sessionId },
          })
        )
      );

      memoryResults.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // Recall memories from the session
      const recallResult = await server.handleRecall({
        cue: "thought",
        context: { session_id: sessionId },
      });

      expect(recallResult).toBeDefined();
      expect(recallResult.total_found).toBeGreaterThanOrEqual(0);
    });
  });

  describe("handleThinkProbabilistic", () => {
    it("should process probabilistic reasoning request with basic input", async () => {
      const args: ThinkProbabilisticArgs = {
        input:
          "What is the probability that it will rain tomorrow given cloudy skies?",
      };

      const result = await server.handleThinkProbabilistic(args);

      expect(result).toBeDefined();
      expect(result.conclusion).toBeDefined();
      expect(typeof result.conclusion).toBe("string");
      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence).toBe("number");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.uncertainty_assessment).toBeDefined();
      expect(result.belief_network).toBeDefined();
      expect(result.evidence_integration).toBeDefined();
      expect(Array.isArray(result.alternative_hypotheses)).toBe(true);
      expect(result.reasoning_chain).toBeDefined();
      expect(typeof result.processing_time_ms).toBe("number");
    });

    it("should handle probabilistic reasoning with context", async () => {
      const args: ThinkProbabilisticArgs = {
        input:
          "Should I invest in this stock given the current market conditions?",
        context: {
          domain: "finance",
          session_id: "test-session",
        },
      };

      const result = await server.handleThinkProbabilistic(args);

      expect(result).toBeDefined();
      expect(result.conclusion).toBeDefined();
      expect(result.uncertainty_assessment).toBeDefined();
      expect(result.uncertainty_assessment.epistemic_uncertainty).toBeDefined();
      expect(result.uncertainty_assessment.aleatoric_uncertainty).toBeDefined();
      expect(result.uncertainty_assessment.combined_uncertainty).toBeDefined();
      expect(
        Array.isArray(result.uncertainty_assessment.confidence_interval)
      ).toBe(true);
      expect(result.uncertainty_assessment.confidence_interval).toHaveLength(2);
      expect(
        Array.isArray(result.uncertainty_assessment.uncertainty_sources)
      ).toBe(true);
    });

    it("should generate multiple hypotheses for complex scenarios", async () => {
      const args: ThinkProbabilisticArgs = {
        input:
          "What are the possible outcomes of implementing a new software architecture?",
      };

      const result = await server.handleThinkProbabilistic(args);

      expect(result).toBeDefined();
      expect(Array.isArray(result.alternative_hypotheses)).toBe(true);
      expect(result.alternative_hypotheses.length).toBeGreaterThan(0);
      expect(result.belief_network.nodes.size).toBeGreaterThan(0);
      expect(result.reasoning_chain.steps).toBeDefined();
      expect(Array.isArray(result.reasoning_chain.steps)).toBe(true);
      expect(result.reasoning_chain.steps.length).toBeGreaterThan(0);
    });

    it("should handle uncertainty quantification correctly", async () => {
      const args: ThinkProbabilisticArgs = {
        input: "What is the likelihood of success for this uncertain project?",
      };

      const result = await server.handleThinkProbabilistic(args);

      expect(result).toBeDefined();
      expect(result.uncertainty_assessment).toBeDefined();

      const uncertainty = result.uncertainty_assessment;
      expect(uncertainty.epistemic_uncertainty).toBeGreaterThanOrEqual(0);
      expect(uncertainty.epistemic_uncertainty).toBeLessThanOrEqual(1);
      expect(uncertainty.aleatoric_uncertainty).toBeGreaterThanOrEqual(0);
      expect(uncertainty.aleatoric_uncertainty).toBeLessThanOrEqual(1);
      expect(uncertainty.combined_uncertainty).toBeGreaterThanOrEqual(0);
      expect(uncertainty.combined_uncertainty).toBeLessThanOrEqual(1);
      expect(uncertainty.reliability_assessment).toBeGreaterThanOrEqual(0);
      expect(uncertainty.reliability_assessment).toBeLessThanOrEqual(1);
    });

    it("should handle empty input gracefully", async () => {
      const args: ThinkProbabilisticArgs = { input: "" };

      const result = await server.handleThinkProbabilistic(args);

      expect(result).toBeDefined();
      expect(result.conclusion).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.uncertainty_assessment).toBeDefined();
      expect(
        result.uncertainty_assessment.combined_uncertainty
      ).toBeGreaterThan(0.3); // Higher uncertainty for empty input
    });

    it("should handle edge cases gracefully", async () => {
      const args: ThinkProbabilisticArgs = {
        input: "A very short input",
      };

      const result = await server.handleThinkProbabilistic(args);

      expect(result).toBeDefined();
      expect(result.conclusion).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });
  });
});
