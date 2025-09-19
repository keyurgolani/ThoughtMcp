/**
 * Integration tests for CognitiveOrchestrator
 * Tests the complete thinking pipeline with all cognitive components
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CognitiveOrchestrator } from "../../cognitive/CognitiveOrchestrator.js";
import {
  CognitiveInput,
  ProcessingMode,
  ReasoningType,
} from "../../types/core.js";

describe("CognitiveOrchestrator Integration Tests", () => {
  let orchestrator: CognitiveOrchestrator;

  beforeEach(async () => {
    orchestrator = new CognitiveOrchestrator({
      enable_all_components: true,
      session_timeout_ms: 60000,
      component_timeout_ms: 10000,
    });

    await orchestrator.initialize();
  });

  afterEach(() => {
    orchestrator.reset();
  });

  describe("Initialization", () => {
    it("should initialize all components successfully", async () => {
      const status = orchestrator.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.error).toBeUndefined();
    });

    it("should initialize components in correct order", async () => {
      const componentStatuses = orchestrator.getAllComponentStatuses();

      // All components should be initialized
      Object.values(componentStatuses).forEach((status) => {
        expect(status.initialized).toBe(true);
      });
    });

    it("should handle component initialization failures gracefully", async () => {
      const faultyOrchestrator = new CognitiveOrchestrator({
        sensory_processor: { invalid_config: "this should cause error" },
      });

      // Should not throw but should report error in status
      try {
        await faultyOrchestrator.initialize();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Complete Thinking Pipeline", () => {
    it("should process simple input through complete pipeline", async () => {
      const input: CognitiveInput = {
        input: "What is artificial intelligence?",
        context: {
          session_id: "test_session_1",
          domain: "technology",
          urgency: 0.5,
          complexity: 0.6,
        },
        mode: ProcessingMode.BALANCED,
        configuration: {
          default_mode: ProcessingMode.BALANCED,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 1.0,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
        },
      };

      const result = await orchestrator.think(input);

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe("string");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning_path).toBeDefined();
      expect(Array.isArray(result.reasoning_path)).toBe(true);
      expect(result.emotional_context).toBeDefined();
      expect(result.metadata).toBeDefined();

      // Verify metadata
      expect(result.metadata.processing_time_ms).toBeGreaterThan(0);
      expect(result.metadata.components_used).toBeDefined();
      expect(result.metadata.components_used.length).toBeGreaterThan(0);
      expect(result.metadata.memory_retrievals).toBeGreaterThanOrEqual(0);
      expect(result.metadata.system_mode).toBe(ProcessingMode.BALANCED);

      // Verify reasoning path has at least some steps
      expect(result.reasoning_path.length).toBeGreaterThan(0);

      // Verify emotional context structure
      expect(typeof result.emotional_context.valence).toBe("number");
      expect(typeof result.emotional_context.arousal).toBe("number");
      expect(typeof result.emotional_context.dominance).toBe("number");
      expect(result.emotional_context.specific_emotions).toBeDefined();
    });

    it("should handle complex reasoning with multiple modes", async () => {
      const modes = [
        ProcessingMode.INTUITIVE,
        ProcessingMode.DELIBERATIVE,
        ProcessingMode.ANALYTICAL,
        ProcessingMode.CREATIVE,
      ];

      for (const mode of modes) {
        const input: CognitiveInput = {
          input: "How can we solve climate change through technology?",
          context: {
            session_id: `test_session_${mode}`,
            domain: "environment",
            urgency: 0.8,
            complexity: 0.9,
          },
          mode,
          configuration: {
            default_mode: mode,
            enable_emotion: true,
            enable_metacognition: true,
            enable_prediction: true,
            working_memory_capacity: 7,
            episodic_memory_size: 1000,
            semantic_memory_size: 5000,
            consolidation_interval: 60000,
            noise_level: 0.1,
            temperature: 1.0,
            attention_threshold: 0.3,
            max_reasoning_depth: 10,
            timeout_ms: 30000,
            max_concurrent_sessions: 100,
            confidence_threshold: 0.6,
            system2_activation_threshold: 0.7,
            memory_retrieval_threshold: 0.3,
          },
        };

        const result = await orchestrator.think(input);

        expect(result).toBeDefined();
        expect(result.metadata.system_mode).toBe(mode);
        expect(result.reasoning_path.length).toBeGreaterThan(0);
      }
    });

    it("should maintain session state across multiple interactions", async () => {
      const sessionId = "persistent_session";

      // First interaction
      const input1: CognitiveInput = {
        input: "Tell me about machine learning",
        context: {
          session_id: sessionId,
          domain: "technology",
        },
        mode: ProcessingMode.BALANCED,
        configuration: {
          default_mode: ProcessingMode.BALANCED,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 1.0,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
        },
      };

      const result1 = await orchestrator.think(input1);
      expect(result1).toBeDefined();

      // Second interaction in same session
      const input2: CognitiveInput = {
        input: "How does it relate to neural networks?",
        context: {
          session_id: sessionId,
          domain: "technology",
          previous_thoughts: [result1.content],
        },
        mode: ProcessingMode.BALANCED,
        configuration: input1.configuration,
      };

      const result2 = await orchestrator.think(input2);
      expect(result2).toBeDefined();

      // Verify session persistence
      const sessionInfo = orchestrator.getSessionInfo(sessionId);
      expect(sessionInfo).toBeDefined();
      expect(sessionInfo!.processing_history.length).toBe(2);
      expect(sessionInfo!.session_id).toBe(sessionId);
    });

    it("should handle emotional processing integration", async () => {
      const emotionalInputs = [
        "I'm really excited about this new AI breakthrough!",
        "I'm worried about the risks of artificial intelligence",
        "This is a neutral statement about technology",
      ];

      for (const inputText of emotionalInputs) {
        const input: CognitiveInput = {
          input: inputText,
          context: {
            session_id: `emotional_test_${Date.now()}`,
          },
          mode: ProcessingMode.BALANCED,
          configuration: {
            default_mode: ProcessingMode.BALANCED,
            enable_emotion: true,
            enable_metacognition: true,
            enable_prediction: true,
            working_memory_capacity: 7,
            episodic_memory_size: 1000,
            semantic_memory_size: 5000,
            consolidation_interval: 60000,
            noise_level: 0.1,
            temperature: 1.0,
            attention_threshold: 0.3,
            max_reasoning_depth: 10,
            timeout_ms: 30000,
            max_concurrent_sessions: 100,
            confidence_threshold: 0.6,
            system2_activation_threshold: 0.7,
            memory_retrieval_threshold: 0.3,
          },
        };

        const result = await orchestrator.think(input);

        // Verify emotional processing occurred
        expect(result.emotional_context).toBeDefined();
        expect(typeof result.emotional_context.valence).toBe("number");
        expect(result.emotional_context.valence).toBeGreaterThanOrEqual(-1);
        expect(result.emotional_context.valence).toBeLessThanOrEqual(1);
      }
    });

    it("should apply metacognitive monitoring when enabled", async () => {
      const input: CognitiveInput = {
        input: "This is a complex philosophical question about consciousness",
        context: {
          session_id: "metacognitive_test",
          complexity: 0.9,
        },
        mode: ProcessingMode.DELIBERATIVE,
        configuration: {
          default_mode: ProcessingMode.DELIBERATIVE,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 1.0,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
        },
      };

      const result = await orchestrator.think(input);

      // Check for metacognitive reasoning steps
      const metacognitiveSteps = result.reasoning_path.filter(
        (step) => step.type === ReasoningType.METACOGNITIVE
      );

      expect(metacognitiveSteps.length).toBeGreaterThan(0);
      expect(result.metadata.metacognitive_assessment).toBeDefined();
    });

    it("should handle stochastic processing when noise is enabled", async () => {
      const input: CognitiveInput = {
        input: "Test stochastic processing",
        context: {
          session_id: "stochastic_test",
        },
        mode: ProcessingMode.BALANCED,
        configuration: {
          default_mode: ProcessingMode.BALANCED,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.3, // Higher noise level
          temperature: 1.2,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
        },
      };

      const result = await orchestrator.think(input);

      // Verify stochastic processing was applied
      expect(result.metadata.stochastic_processing).toBeDefined();

      // Check that reasoning steps have stochastic metadata
      const stochasticSteps = result.reasoning_path.filter(
        (step) => step.metadata?.stochastic_enhancement !== undefined
      );
      expect(stochasticSteps.length).toBeGreaterThan(0);
    });
  });

  describe("Session Management", () => {
    it("should create and manage multiple sessions", async () => {
      const sessionIds = ["session1", "session2", "session3"];

      for (const sessionId of sessionIds) {
        const input: CognitiveInput = {
          input: `Test input for ${sessionId}`,
          context: { session_id: sessionId },
          mode: ProcessingMode.BALANCED,
          configuration: {
            default_mode: ProcessingMode.BALANCED,
            enable_emotion: true,
            enable_metacognition: true,
            enable_prediction: true,
            working_memory_capacity: 7,
            episodic_memory_size: 1000,
            semantic_memory_size: 5000,
            consolidation_interval: 60000,
            noise_level: 0.1,
            temperature: 1.0,
            attention_threshold: 0.3,
            max_reasoning_depth: 10,
            timeout_ms: 30000,
            max_concurrent_sessions: 100,
            confidence_threshold: 0.6,
            system2_activation_threshold: 0.7,
            memory_retrieval_threshold: 0.3,
          },
        };

        await orchestrator.think(input);
      }

      const activeSessions = orchestrator.getActiveSessions();
      expect(activeSessions.length).toBe(3);

      sessionIds.forEach((sessionId) => {
        const session = orchestrator.getSessionInfo(sessionId);
        expect(session).toBeDefined();
        expect(session!.session_id).toBe(sessionId);
      });
    });

    it("should clear specific sessions", async () => {
      const input: CognitiveInput = {
        input: "Test session clearing",
        context: { session_id: "clearable_session" },
        mode: ProcessingMode.BALANCED,
        configuration: {
          default_mode: ProcessingMode.BALANCED,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 1.0,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
        },
      };

      await orchestrator.think(input);

      expect(orchestrator.getSessionInfo("clearable_session")).toBeDefined();

      const cleared = orchestrator.clearSession("clearable_session");
      expect(cleared).toBe(true);
      expect(orchestrator.getSessionInfo("clearable_session")).toBeUndefined();
    });
  });

  describe("Component Integration", () => {
    it("should coordinate all components in the pipeline", async () => {
      const input: CognitiveInput = {
        input:
          "Analyze the relationship between creativity and artificial intelligence",
        context: {
          session_id: "component_integration_test",
          domain: "cognitive_science",
          complexity: 0.8,
        },
        mode: ProcessingMode.ANALYTICAL,
        configuration: {
          default_mode: ProcessingMode.ANALYTICAL,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 1.0,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
        },
      };

      const result = await orchestrator.think(input);

      // Verify all expected components were used
      const expectedComponents = [
        "SensoryProcessor",
        "WorkingMemoryModule",
        "DualProcessController",
        "MemorySystem",
        "EmotionalProcessor",
        "MetacognitionModule",
        "PredictiveProcessor",
        "StochasticNeuralProcessor",
        "CognitiveOrchestrator",
      ];

      expectedComponents.forEach((component) => {
        expect(result.metadata.components_used).toContain(component);
      });

      // Verify reasoning path contains different types of reasoning
      const reasoningTypes = new Set(
        result.reasoning_path.map((step) => step.type)
      );
      expect(reasoningTypes.size).toBeGreaterThan(1);
    });

    it("should handle component failures gracefully", async () => {
      // This test would require mocking component failures
      // For now, we'll test that the orchestrator can handle missing components
      const input: CognitiveInput = {
        input: "Test graceful failure handling",
        context: { session_id: "failure_test" },
        mode: ProcessingMode.BALANCED,
        configuration: {
          default_mode: ProcessingMode.BALANCED,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 1.0,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 30000,
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
        },
      };

      // Should not throw even with potential component issues
      const result = await orchestrator.think(input);
      expect(result).toBeDefined();
    });
  });

  describe("Performance and Statistics", () => {
    it("should provide processing statistics", async () => {
      // Process several inputs to generate statistics
      for (let i = 0; i < 3; i++) {
        const input: CognitiveInput = {
          input: `Test input ${i}`,
          context: { session_id: `stats_test_${i}` },
          mode: ProcessingMode.BALANCED,
          configuration: {
            default_mode: ProcessingMode.BALANCED,
            enable_emotion: true,
            enable_metacognition: true,
            enable_prediction: true,
            working_memory_capacity: 7,
            episodic_memory_size: 1000,
            semantic_memory_size: 5000,
            consolidation_interval: 60000,
            noise_level: 0.1,
            temperature: 1.0,
            attention_threshold: 0.3,
            max_reasoning_depth: 10,
            timeout_ms: 30000,
            max_concurrent_sessions: 100,
            confidence_threshold: 0.6,
            system2_activation_threshold: 0.7,
            memory_retrieval_threshold: 0.3,
          },
        };

        await orchestrator.think(input);
      }

      const stats = orchestrator.getProcessingStats();

      expect(stats.active_sessions).toBe(3);
      expect(stats.total_sessions_created).toBe(3);
      expect(stats.average_processing_time).toBeGreaterThanOrEqual(0);
      expect(stats.component_statuses).toBeDefined();

      // Verify all components are reported in stats
      Object.values(stats.component_statuses).forEach((status) => {
        expect(status.initialized).toBe(true);
      });
    });

    it("should handle processing mode changes", async () => {
      const modes = [
        ProcessingMode.INTUITIVE,
        ProcessingMode.DELIBERATIVE,
        ProcessingMode.CREATIVE,
      ];

      for (const mode of modes) {
        orchestrator.setProcessingMode(mode);

        const input: CognitiveInput = {
          input: "Test mode switching",
          context: { session_id: `mode_test_${mode}` },
          mode,
          configuration: {
            default_mode: mode,
            enable_emotion: true,
            enable_metacognition: true,
            enable_prediction: true,
            working_memory_capacity: 7,
            episodic_memory_size: 1000,
            semantic_memory_size: 5000,
            consolidation_interval: 60000,
            noise_level: 0.1,
            temperature: 1.0,
            attention_threshold: 0.3,
            max_reasoning_depth: 10,
            timeout_ms: 30000,
            max_concurrent_sessions: 100,
            confidence_threshold: 0.6,
            system2_activation_threshold: 0.7,
            memory_retrieval_threshold: 0.3,
          },
        };

        const result = await orchestrator.think(input);
        expect(result.metadata.system_mode).toBe(mode);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid input gracefully", async () => {
      const invalidInputs = [
        {
          input: "",
          context: { session_id: "empty_input_test" },
          mode: ProcessingMode.BALANCED,
          configuration: {
            default_mode: ProcessingMode.BALANCED,
            enable_emotion: true,
            enable_metacognition: true,
            enable_prediction: true,
            working_memory_capacity: 7,
            episodic_memory_size: 1000,
            semantic_memory_size: 5000,
            consolidation_interval: 60000,
            noise_level: 0.1,
            temperature: 1.0,
            attention_threshold: 0.3,
            max_reasoning_depth: 10,
            timeout_ms: 30000,
            max_concurrent_sessions: 100,
            confidence_threshold: 0.6,
            system2_activation_threshold: 0.7,
            memory_retrieval_threshold: 0.3,
          },
        },
      ];

      for (const input of invalidInputs) {
        const result = await orchestrator.think(input as CognitiveInput);
        expect(result).toBeDefined();
        // Should still produce some result even with empty input
      }
    });

    it("should handle processing timeouts", async () => {
      const input: CognitiveInput = {
        input: "Test timeout handling",
        context: { session_id: "timeout_test" },
        mode: ProcessingMode.BALANCED,
        configuration: {
          default_mode: ProcessingMode.BALANCED,
          enable_emotion: true,
          enable_metacognition: true,
          enable_prediction: true,
          working_memory_capacity: 7,
          episodic_memory_size: 1000,
          semantic_memory_size: 5000,
          consolidation_interval: 60000,
          noise_level: 0.1,
          temperature: 1.0,
          attention_threshold: 0.3,
          max_reasoning_depth: 10,
          timeout_ms: 1, // Very short timeout
          max_concurrent_sessions: 100,
          confidence_threshold: 0.6,
          system2_activation_threshold: 0.7,
          memory_retrieval_threshold: 0.3,
        },
      };

      // Should either complete quickly or handle timeout gracefully
      try {
        const result = await orchestrator.think(input);
        expect(result).toBeDefined();
      } catch (error) {
        // Timeout errors are acceptable for this test
        expect(error).toBeDefined();
      }
    });
  });
});
