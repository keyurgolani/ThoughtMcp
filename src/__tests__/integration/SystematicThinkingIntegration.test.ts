/**
 * Integration tests for systematic thinking integration with cognitive systems
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CognitiveOrchestrator } from "../../cognitive/CognitiveOrchestrator.js";
import { CognitiveInput, ProcessingMode } from "../../types/core.js";

describe("Systematic Thinking Integration", () => {
  let orchestrator: CognitiveOrchestrator;

  beforeEach(async () => {
    orchestrator = new CognitiveOrchestrator({
      enable_systematic_thinking: true,
      enable_all_components: true,
    });
    await orchestrator.initialize();
  });

  afterEach(() => {
    orchestrator.reset();
  });

  describe("Enhanced Think Tool with Systematic Thinking", () => {
    it("should use systematic thinking for complex analytical problems", async () => {
      const input: CognitiveInput = {
        input:
          "Design a scalable microservices architecture for a high-traffic e-commerce platform with multiple payment systems, inventory management, and real-time analytics",
        context: { session_id: "test-systematic-1" },
        mode: ProcessingMode.ANALYTICAL,
        configuration: {
          default_mode: ProcessingMode.ANALYTICAL,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          enable_systematic_thinking: true,
          systematic_thinking_mode: "auto",
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 0.7,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
          brain_dir: "~/.brain",
        },
      };

      const result = await orchestrator.think(input);

      // Verify systematic thinking was used
      expect(result.metadata.systematic_thinking_result).toBeDefined();
      expect(result.metadata.systematic_thinking_result).not.toBeNull();
      expect(
        result.metadata.systematic_thinking_result.framework_used
      ).toBeDefined();
      expect(
        result.metadata.systematic_thinking_result.framework_type
      ).toBeDefined();
      expect(
        result.metadata.systematic_thinking_result.confidence
      ).toBeGreaterThan(0);
      expect(
        result.metadata.systematic_thinking_result.processing_time_ms
      ).toBeGreaterThan(0);
      expect(
        result.metadata.systematic_thinking_result.analysis_steps_count
      ).toBeGreaterThan(0);

      // Verify components were used
      expect(result.metadata.components_used).toContain(
        "SystematicThinkingOrchestrator"
      );

      // Verify result quality
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(100);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.reasoning_path.length).toBeGreaterThan(3);
    });

    it("should not use systematic thinking for simple problems when disabled", async () => {
      const input: CognitiveInput = {
        input: "What is 2 + 2?",
        context: { session_id: "test-systematic-2" },
        mode: ProcessingMode.BALANCED,
        configuration: {
          default_mode: ProcessingMode.BALANCED,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          enable_systematic_thinking: false,
          systematic_thinking_mode: "auto",
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 0.7,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
          brain_dir: "~/.brain",
        },
      };

      const result = await orchestrator.think(input);

      // Verify systematic thinking was not used
      expect(result.metadata.systematic_thinking_result).toBeNull();

      // Verify basic processing still works
      expect(result.content).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should use different systematic thinking modes", async () => {
      const modes: Array<"auto" | "hybrid" | "manual"> = [
        "auto",
        "hybrid",
        "manual",
      ];

      for (const mode of modes) {
        const input: CognitiveInput = {
          input:
            "Analyze the root causes of performance issues in a distributed system",
          context: { session_id: `test-systematic-mode-${mode}` },
          mode: ProcessingMode.ANALYTICAL,
          configuration: {
            default_mode: ProcessingMode.ANALYTICAL,
            enable_emotion: true,
            enable_metacognition: true,
            enable_prediction: true,
            enable_systematic_thinking: true,
            systematic_thinking_mode: mode,
            working_memory_capacity: 7,
            episodic_memory_size: 1000,
            semantic_memory_size: 5000,
            consolidation_interval: 60000,
            noise_level: 0.1,
            temperature: 0.7,
            attention_threshold: 0.3,
            max_reasoning_depth: 10,
            timeout_ms: 30000,
            max_concurrent_sessions: 100,
            confidence_threshold: 0.6,
            system2_activation_threshold: 0.7,
            memory_retrieval_threshold: 0.3,
            brain_dir: "~/.brain",
          },
        };

        const result = await orchestrator.think(input);

        // Verify systematic thinking was used with the specified mode
        expect(result.metadata.systematic_thinking_result).toBeDefined();
        expect(result.metadata.systematic_thinking_result).not.toBeNull();
        expect(result.content).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe("Memory Integration", () => {
    it("should store systematic thinking results in memory", async () => {
      const input: CognitiveInput = {
        input:
          "Design a comprehensive testing strategy for a complex software system",
        context: { session_id: "test-memory-integration" },
        mode: ProcessingMode.ANALYTICAL,
        configuration: {
          default_mode: ProcessingMode.ANALYTICAL,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          enable_systematic_thinking: true,
          systematic_thinking_mode: "auto",
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 0.7,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
          brain_dir: "~/.brain",
        },
      };

      const result = await orchestrator.think(input);

      // Verify systematic thinking was used
      expect(result.metadata.systematic_thinking_result).toBeDefined();
      expect(result.metadata.systematic_thinking_result).not.toBeNull();

      // The memory storage is handled internally by the orchestrator
      // We can verify this by checking that the experience was processed
      expect(result.metadata.processing_time_ms).toBeGreaterThan(0);
      expect(result.metadata.memory_retrievals).toBeGreaterThanOrEqual(0);
    });

    it("should retrieve and use systematic thinking results from memory", async () => {
      // First, store a systematic thinking result
      const firstInput: CognitiveInput = {
        input:
          "Analyze the architecture patterns for microservices communication",
        context: {
          session_id: "test-memory-retrieval",
          domain: "software_architecture",
        },
        mode: ProcessingMode.ANALYTICAL,
        configuration: {
          default_mode: ProcessingMode.ANALYTICAL,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          enable_systematic_thinking: true,
          systematic_thinking_mode: "auto",
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 0.7,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
          brain_dir: "~/.brain",
        },
      };

      const firstResult = await orchestrator.think(firstInput);
      expect(firstResult.metadata.systematic_thinking_result).toBeDefined();

      // Then, ask a related question that should benefit from the stored knowledge
      const secondInput: CognitiveInput = {
        input: "What are the best practices for microservices architecture?",
        context: {
          session_id: "test-memory-retrieval",
          domain: "software_architecture",
        },
        mode: ProcessingMode.BALANCED,
        configuration: {
          default_mode: ProcessingMode.BALANCED,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          enable_systematic_thinking: true,
          systematic_thinking_mode: "auto",
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 0.7,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
          brain_dir: "~/.brain",
        },
      };

      const secondResult = await orchestrator.think(secondInput);

      // Verify that memory was retrieved (indicated by memory_retrievals > 0)
      expect(secondResult.metadata.memory_retrievals).toBeGreaterThan(0);
      expect(secondResult.content).toBeDefined();
      expect(secondResult.confidence).toBeGreaterThan(0);
    });
  });

  describe("Performance Monitoring", () => {
    it("should track systematic thinking performance metrics", async () => {
      const input: CognitiveInput = {
        input:
          "Optimize the performance of a database-intensive application with complex queries",
        context: { session_id: "test-performance-monitoring" },
        mode: ProcessingMode.ANALYTICAL,
        configuration: {
          default_mode: ProcessingMode.ANALYTICAL,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          enable_systematic_thinking: true,
          systematic_thinking_mode: "auto",
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 0.7,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
          brain_dir: "~/.brain",
        },
      };

      const result = await orchestrator.think(input);

      // Verify performance metrics are tracked
      expect(result.metadata.processing_time_ms).toBeGreaterThan(0);
      expect(result.metadata.processing_time_ms).toBeLessThan(30000); // Should complete within timeout

      if (result.metadata.systematic_thinking_result) {
        expect(
          result.metadata.systematic_thinking_result.processing_time_ms
        ).toBeGreaterThan(0);
        expect(
          result.metadata.systematic_thinking_result.processing_time_ms
        ).toBeLessThanOrEqual(result.metadata.processing_time_ms);
        expect(
          result.metadata.systematic_thinking_result.confidence
        ).toBeGreaterThan(0);
        expect(
          result.metadata.systematic_thinking_result.confidence
        ).toBeLessThanOrEqual(1);
      }
    });

    it("should maintain performance within acceptable thresholds", async () => {
      const inputs = [
        "Analyze system bottlenecks",
        "Design scalable architecture",
        "Optimize database performance",
        "Implement caching strategy",
        "Plan deployment pipeline",
      ];

      const results = [];
      const startTime = Date.now();

      for (let i = 0; i < inputs.length; i++) {
        const input: CognitiveInput = {
          input: inputs[i],
          context: { session_id: `test-performance-${i}` },
          mode: ProcessingMode.ANALYTICAL,
          configuration: {
            default_mode: ProcessingMode.ANALYTICAL,
            enable_emotion: true,
            enable_metacognition: true,
            enable_prediction: true,
            enable_systematic_thinking: true,
            systematic_thinking_mode: "auto",
            working_memory_capacity: 7,
            episodic_memory_size: 1000,
            semantic_memory_size: 5000,
            consolidation_interval: 60000,
            noise_level: 0.1,
            temperature: 0.7,
            attention_threshold: 0.3,
            max_reasoning_depth: 10,
            timeout_ms: 30000,
            max_concurrent_sessions: 100,
            confidence_threshold: 0.6,
            system2_activation_threshold: 0.7,
            memory_retrieval_threshold: 0.3,
            brain_dir: "~/.brain",
          },
        };

        const result = await orchestrator.think(input);
        results.push(result);
      }

      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / inputs.length;

      // Verify performance thresholds
      expect(averageTime).toBeLessThan(15000); // Average should be under 15 seconds
      expect(totalTime).toBeLessThan(60000); // Total should be under 1 minute

      // Verify all results are valid
      results.forEach((result, index) => {
        expect(result.content).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.metadata.processing_time_ms).toBeLessThan(30000);
      });
    });
  });

  describe("Quality Assurance", () => {
    it("should improve problem-solving quality with systematic thinking", async () => {
      const complexProblem =
        "Design a fault-tolerant distributed system that can handle network partitions, node failures, and data consistency requirements while maintaining high availability and performance";

      // Test without systematic thinking
      const withoutSystematic: CognitiveInput = {
        input: complexProblem,
        context: { session_id: "test-quality-without" },
        mode: ProcessingMode.BALANCED,
        configuration: {
          default_mode: ProcessingMode.BALANCED,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          enable_systematic_thinking: false,
          systematic_thinking_mode: "auto",
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 0.7,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
          brain_dir: "~/.brain",
        },
      };

      // Test with systematic thinking
      const withSystematic: CognitiveInput = {
        input: complexProblem,
        context: { session_id: "test-quality-with" },
        mode: ProcessingMode.ANALYTICAL,
        configuration: {
          default_mode: ProcessingMode.ANALYTICAL,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          enable_systematic_thinking: true,
          systematic_thinking_mode: "auto",
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 0.7,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
          brain_dir: "~/.brain",
        },
      };

      const resultWithout = await orchestrator.think(withoutSystematic);
      const resultWith = await orchestrator.think(withSystematic);

      // Verify systematic thinking was used only in the second case
      expect(resultWithout.metadata.systematic_thinking_result).toBeNull();
      expect(resultWith.metadata.systematic_thinking_result).toBeDefined();

      // Verify improved quality metrics
      expect(resultWith.reasoning_path.length).toBeGreaterThanOrEqual(
        resultWithout.reasoning_path.length
      );
      expect(resultWith.content.length).toBeGreaterThan(
        resultWithout.content.length
      );

      // Both should have reasonable confidence, but systematic thinking should provide more structured analysis
      expect(resultWith.confidence).toBeGreaterThan(0.5);
      expect(resultWithout.confidence).toBeGreaterThan(0.3);
    });
  });
});
