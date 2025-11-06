/**
 * Unit tests for DualProcessController
 */

import { beforeEach, describe, expect, it } from "vitest";
import { DualProcessController } from "../../cognitive/DualProcessController.js";
import {
  CognitiveInput,
  ProcessingMode,
  ReasoningType,
} from "../../types/core.js";

describe("DualProcessController", () => {
  let controller: DualProcessController;
  let mockInput: CognitiveInput;

  beforeEach(async () => {
    controller = new DualProcessController();
    await controller.initialize({
      system2_activation_threshold: 0.6,
      conflict_threshold: 0.3,
      confidence_weight: 0.4,
      processing_time_weight: 0.2,
      complexity_weight: 0.4,
      max_processing_time: 30000,
      hybrid_blend_ratio: 0.6,
    });

    mockInput = {
      input: "What is the best approach to solve this complex problem?",
      context: {
        session_id: "test-session",
        domain: "problem-solving",
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
        temperature: 0.7,
        attention_threshold: 0.3,
        max_reasoning_depth: 5,
        timeout_ms: 30000,
        max_concurrent_sessions: 10,
        confidence_threshold: 0.6,
        system2_activation_threshold: 0.6,
        memory_retrieval_threshold: 0.3,
      },
    };
  });

  describe("Initialization", () => {
    it("should initialize successfully with both systems", async () => {
      const newController = new DualProcessController();
      await newController.initialize({});

      const status = newController.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.name).toBe("DualProcessController");
    });

    it("should initialize subsystems correctly", async () => {
      const system1Status = controller.getSystem1Status();
      const system2Status = controller.getSystem2Status();

      expect(system1Status.initialized).toBe(true);
      expect(system2Status.initialized).toBe(true);
    });
  });

  describe("Processing Decision Making", () => {
    it("should decide to use only System 1 for simple inputs", async () => {
      const simpleInput = {
        ...mockInput,
        input: "Hello",
        mode: ProcessingMode.INTUITIVE,
      };

      const decision = controller["makeProcessingDecision"](simpleInput);

      expect(decision.use_system1).toBe(true);
      expect(decision.use_system2).toBe(false);
    });

    it("should decide to use both systems for complex inputs", async () => {
      const complexInput = {
        ...mockInput,
        input:
          "Analyze the complex interrelationships between economic policy, environmental sustainability, and social equity in the context of global climate change",
        mode: ProcessingMode.DELIBERATIVE,
      };

      const decision = controller["makeProcessingDecision"](complexInput);

      expect(decision.use_system1).toBe(true);
      expect(decision.use_system2).toBe(true);
    });

    it("should consider urgency in decision making", async () => {
      const lowUrgencyInput = {
        ...mockInput,
        context: { ...mockInput.context, urgency: 0.2 },
      };

      const decision = controller["makeProcessingDecision"](lowUrgencyInput);

      // Low urgency should allow for deliberation
      expect(decision.reasoning.toLowerCase()).toContain("urgency") ??
        expect(decision.use_system2).toBe(true);
    });

    it("should detect uncertainty indicators", async () => {
      const uncertainInput = {
        ...mockInput,
        input: "Maybe we should consider this uncertain and complex situation",
      };

      const decision = controller["makeProcessingDecision"](uncertainInput);

      expect(decision.reasoning.toLowerCase()).toContain("uncertainty") ??
        decision.use_system2;
    });
  });

  describe("Complexity Assessment", () => {
    it("should assess low complexity for simple inputs", () => {
      const complexity = controller["assessComplexity"]("Hello world");
      expect(complexity).toBeLessThan(0.3);
    });

    it("should assess high complexity for complex inputs", () => {
      const complexText =
        "Analyze the systematic relationships between multiple variables while considering the implications of various conditional scenarios and their potential consequences";
      const complexity = controller["assessComplexity"](complexText);
      expect(complexity).toBeGreaterThan(0.5);
    });

    it("should detect complex question structures", () => {
      const isComplex = controller["isComplexQuestion"](
        "What happens if we do this and how does it affect that when considering these conditions?"
      );
      expect(isComplex).toBe(true);
    });

    it("should identify simple questions", () => {
      const isComplex = controller["isComplexQuestion"]("What is this?");
      expect(isComplex).toBe(false);
    });
  });

  describe("Dual Process Execution", () => {
    it("should process with System 1 only for simple inputs", async () => {
      const simpleInput = {
        ...mockInput,
        input: "What color is the sky?",
        mode: ProcessingMode.INTUITIVE,
      };

      const result = await controller.process(simpleInput);

      expect(result).toBeDefined();
      expect(result.metadata.dual_process_info).toBeDefined();
      expect(
        result.metadata.dual_process_info!.system1_confidence
      ).toBeDefined();
      expect(result.metadata.dual_process_info!.system2_confidence).toBeNull();
    });

    it("should process with both systems for complex inputs", async () => {
      const complexInput = {
        ...mockInput,
        input:
          "Analyze the relationship between economic growth and environmental sustainability",
        mode: ProcessingMode.DELIBERATIVE,
      };

      const result = await controller.process(complexInput);

      expect(result).toBeDefined();
      expect(result.metadata.dual_process_info).toBeDefined();
      expect(
        result.metadata.dual_process_info!.system1_confidence
      ).toBeDefined();
      expect(
        result.metadata.dual_process_info!.system2_confidence
      ).toBeDefined();
    });

    it("should handle balanced mode appropriately", async () => {
      const result = await controller.process(mockInput);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning_path.length).toBeGreaterThan(0);
    });
  });

  describe("Conflict Resolution", () => {
    it("should resolve conflicts between systems", async () => {
      const mockSystem1Result = {
        content: "Quick intuitive answer",
        confidence: 0.8,
        reasoning_path: [],
        emotional_context: {
          valence: 0.5,
          arousal: 0.6,
          dominance: 0.7,
          specific_emotions: new Map(),
        },
        metadata: {
          processing_time_ms: 100,
          components_used: ["IntuitiveProcessor"],
          memory_retrievals: 2,
          system_mode: ProcessingMode.INTUITIVE,
          temperature: 0.7,
        },
      };

      const mockSystem2Result = {
        content: "Detailed analytical answer",
        confidence: 0.6,
        reasoning_path: [],
        emotional_context: {
          valence: 0.2,
          arousal: 0.3,
          dominance: 0.8,
          specific_emotions: new Map(),
        },
        metadata: {
          processing_time_ms: 500,
          components_used: ["DeliberativeProcessor"],
          memory_retrievals: 5,
          system_mode: ProcessingMode.DELIBERATIVE,
          temperature: 0.35,
        },
      };

      const resolution = controller["resolveConflict"](
        mockSystem1Result,
        mockSystem2Result,
        mockInput
      );

      expect(resolution).toBeDefined();
      expect(resolution.selected_system).toMatch(/system1|system2|hybrid/);
      expect(resolution.confidence_difference).toBeDefined();
      expect(resolution.resolution_strategy).toBeDefined();
      expect(resolution.reasoning).toBeDefined();
    });

    it("should detect content similarity", () => {
      const similarity = controller["assessContentSimilarity"](
        "This is a test answer",
        "This is a test response"
      );

      expect(similarity).toBeGreaterThan(0.5); // Should detect similarity
    });

    it("should detect content differences", () => {
      const similarity = controller["assessContentSimilarity"](
        "Completely different content",
        "Totally unrelated response"
      );

      expect(similarity).toBeLessThan(0.5); // Should detect differences
    });
  });

  describe("Result Blending", () => {
    it("should blend compatible results", async () => {
      const mockSystem1Result = {
        content: "Initial assessment",
        confidence: 0.7,
        reasoning_path: [
          {
            type: ReasoningType.PATTERN_MATCH,
            content: "Pattern recognized",
            confidence: 0.7,
            alternatives: [],
          },
        ],
        emotional_context: {
          valence: 0.5,
          arousal: 0.6,
          dominance: 0.7,
          specific_emotions: new Map([["confidence", 0.7]]),
        },
        metadata: {
          processing_time_ms: 100,
          components_used: ["IntuitiveProcessor"],
          memory_retrievals: 2,
          system_mode: ProcessingMode.INTUITIVE,
          temperature: 0.7,
        },
      };

      const mockSystem2Result = {
        content: "Detailed analysis",
        confidence: 0.8,
        reasoning_path: [
          {
            type: ReasoningType.LOGICAL_INFERENCE,
            content: "Logical step",
            confidence: 0.8,
            alternatives: [],
          },
        ],
        emotional_context: {
          valence: 0.3,
          arousal: 0.2,
          dominance: 0.8,
          specific_emotions: new Map([["analytical", 0.8]]),
        },
        metadata: {
          processing_time_ms: 500,
          components_used: ["DeliberativeProcessor"],
          memory_retrievals: 5,
          system_mode: ProcessingMode.DELIBERATIVE,
          temperature: 0.35,
        },
      };

      const resolution = {
        selected_system: "hybrid" as const,
        confidence_difference: 0.1,
        resolution_strategy: "blend_compatible",
        reasoning: "Compatible results",
      };

      const blended = controller["blendResults"](
        mockSystem1Result,
        mockSystem2Result,
        resolution
      );

      expect(blended.content).toContain("Initial assessment");
      expect(blended.content).toContain("Detailed analysis");
      expect(blended.reasoning_path.length).toBeGreaterThan(2);
      expect(blended.metadata.components_used).toContain(
        "DualProcessController"
      );
    });
  });

  describe("Individual System Access", () => {
    it("should allow System 1 only processing", async () => {
      const result = await controller.processSystem1Only(mockInput);

      expect(result).toBeDefined();
      expect(result.metadata.system_mode).toBe(ProcessingMode.INTUITIVE);
    });

    it("should allow System 2 only processing", async () => {
      const result = await controller.processSystem2Only(mockInput);

      expect(result).toBeDefined();
      expect(result.metadata.system_mode).toBe(ProcessingMode.DELIBERATIVE);
    });
  });

  describe("Status Management", () => {
    it("should report correct status", () => {
      const status = controller.getStatus();

      expect(status.name).toBe("DualProcessController");
      expect(status.initialized).toBe(true);
    });

    it("should show active status after processing", async () => {
      await controller.process(mockInput);

      const status = controller.getStatus();
      expect(status.active).toBe(true);
      expect(status.last_activity).toBeGreaterThan(0);
    });

    it("should reset successfully", () => {
      controller.reset();

      const status = controller.getStatus();
      expect(status.last_activity).toBe(0);
    });
  });

  describe("Mode-Specific Processing", () => {
    it("should handle intuitive mode requests", async () => {
      const intuitiveInput = {
        ...mockInput,
        mode: ProcessingMode.INTUITIVE,
      };

      const result = await controller.process(intuitiveInput);

      expect(result).toBeDefined();
      // Should favor System 1 processing
    });

    it("should handle deliberative mode requests", async () => {
      const deliberativeInput = {
        ...mockInput,
        mode: ProcessingMode.DELIBERATIVE,
      };

      const result = await controller.process(deliberativeInput);

      expect(result).toBeDefined();
      expect(result.metadata.dual_process_info).toBeDefined();
      expect(
        result.metadata.dual_process_info!.system2_confidence
      ).toBeDefined();
    });

    it("should handle analytical mode requests", async () => {
      const analyticalInput = {
        ...mockInput,
        mode: ProcessingMode.ANALYTICAL,
      };

      const result = await controller.process(analyticalInput);

      expect(result).toBeDefined();
      expect(result.metadata.dual_process_info).toBeDefined();
      expect(
        result.metadata.dual_process_info!.system2_confidence
      ).toBeDefined();
    });

    it("should handle creative mode requests", async () => {
      const creativeInput = {
        ...mockInput,
        mode: ProcessingMode.CREATIVE,
      };

      const result = await controller.process(creativeInput);

      expect(result).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle system initialization failures gracefully", async () => {
      const faultyController = new DualProcessController();

      // Initialize with invalid config
      await faultyController.initialize({
        system2_activation_threshold: -1, // Invalid threshold
      });

      // Should still process
      const result = await faultyController.process(mockInput);
      expect(result).toBeDefined();
    });

    it("should handle processing errors", async () => {
      const extremeInput = {
        ...mockInput,
        input: "", // Empty input
        context: {
          ...mockInput.context,
          urgency: 2.0, // Invalid urgency value
        },
      };

      const result = await controller.process(extremeInput);
      expect(result).toBeDefined();
    });
  });

  describe("Metadata Enhancement", () => {
    it("should enhance metadata with dual-process information", async () => {
      const result = await controller.process(mockInput);

      expect(result.metadata.dual_process_info).toBeDefined();
      expect(
        result.metadata.dual_process_info!.dual_process_decision
      ).toBeDefined();
      expect(
        result.metadata.dual_process_info!.system1_confidence
      ).toBeDefined();
      expect(
        result.metadata.dual_process_info!.total_processing_time
      ).toBeDefined();
    });
  });

  describe("Performance Characteristics", () => {
    it("should complete processing within reasonable time", async () => {
      const startTime = Date.now();
      await controller.process(mockInput);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should handle concurrent processing requests", async () => {
      const promises = [
        controller.process(mockInput),
        controller.process({ ...mockInput, input: "Different input 1" }),
        controller.process({ ...mockInput, input: "Different input 2" }),
      ];

      const results = await Promise.all(promises);

      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      });
    });
  });
});
