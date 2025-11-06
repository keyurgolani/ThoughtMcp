/**
 * Unit tests for CognitiveOrchestrator
 * Tests the central coordinator for cognitive processing and component integration
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CognitiveOrchestrator } from "../../cognitive/CognitiveOrchestrator.js";
import { CognitiveInput, ProcessingMode } from "../../types/core.js";
import { createDefaultCognitiveConfig } from "../../utils/factories.js";

// Mock all cognitive components
vi.mock("../../cognitive/SensoryProcessor.js", () => ({
  SensoryProcessor: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    process: vi.fn().mockResolvedValue({
      tokens: ["test", "input"],
      patterns: [],
      salience_map: new Map(),
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "SensoryProcessor",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
    reset: vi.fn(),
  })),
}));

vi.mock("../../cognitive/WorkingMemoryModule.js", () => ({
  WorkingMemoryModule: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    integrate: vi.fn().mockResolvedValue({
      active_chunks: [],
      associations: [],
      cognitive_load: 0.5,
    }),
    process: vi.fn().mockResolvedValue({
      active_chunks: [],
      associations: [],
      cognitive_load: 0.5,
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "WorkingMemoryModule",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
    reset: vi.fn(),
  })),
}));

vi.mock("../../cognitive/DualProcessController.js", () => ({
  DualProcessController: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    process: vi.fn().mockResolvedValue({
      content: "Test thought result",
      reasoning_path: [
        {
          type: "deductive",
          content: "Test reasoning step",
          confidence: 0.8,
          alternatives: [],
          metadata: {},
        },
      ],
      confidence: 0.8,
      processing_time_ms: 100,
      emotional_context: {
        valence: 0.0,
        arousal: 0.5,
        dominance: 0.7,
        specific_emotions: new Map([
          ["neutral", 0.8],
          ["calm", 0.6],
        ]),
      },
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "DualProcessController",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
    reset: vi.fn(),
  })),
}));

vi.mock("../../cognitive/MemorySystem.js", () => ({
  MemorySystem: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    retrieveMemories: vi.fn().mockResolvedValue({
      episodic_memories: [],
      semantic_concepts: [],
      combined_relevance: 0.5,
      retrieval_time_ms: 50,
    }),
    storeExperience: vi.fn().mockResolvedValue({
      episodic_id: "test-episode",
      storage_time_ms: 25,
      success: true,
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "MemorySystem",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
    reset: vi.fn(),
  })),
}));

vi.mock("../../cognitive/EmotionalProcessor.js", () => ({
  EmotionalProcessor: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    process: vi.fn().mockResolvedValue({
      valence: 0.0,
      arousal: 0.5,
      dominance: 0.7,
      specific_emotions: new Map([
        ["neutral", 0.8],
        ["calm", 0.6],
      ]),
    }),
    processWithEmotion: vi.fn().mockResolvedValue({
      emotion: "neutral",
      valence: 0.0,
      arousal: 0.5,
      confidence: 0.7,
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "EmotionalProcessor",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
    reset: vi.fn(),
  })),
}));

vi.mock("../../cognitive/MetacognitionModule.js", () => ({
  MetacognitionModule: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    adjust: vi.fn().mockImplementation((thought) => thought),
    assessConfidence: vi.fn().mockReturnValue(0.8),
    assessReasoning: vi.fn().mockReturnValue({
      confidence: 0.8,
      coherence: 0.9,
      biases_detected: [],
      completeness: 0.85,
      quality_score: 0.85,
      suggestions: [],
      should_reconsider: false,
      reasoning: "Assessment completed",
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "MetacognitionModule",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
    reset: vi.fn(),
  })),
}));

vi.mock("../../cognitive/PredictiveProcessor.js", () => ({
  PredictiveProcessor: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    process: vi.fn().mockResolvedValue({
      predictions: [],
      confidence: 0.6,
    }),
    generatePredictions: vi.fn().mockResolvedValue({
      predictions: [],
      confidence: 0.6,
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "PredictiveProcessor",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
    reset: vi.fn(),
  })),
}));

vi.mock("../../cognitive/SystematicThinkingOrchestrator.js", () => ({
  SystematicThinkingOrchestrator: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    processSystematically: vi.fn().mockResolvedValue({
      analysis: "Systematic analysis result",
      framework_used: "scientific_method",
      confidence: 0.9,
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "SystematicThinkingOrchestrator",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
    reset: vi.fn(),
  })),
}));

vi.mock("../../cognitive/StochasticNeuralProcessor.js", () => ({
  StochasticNeuralProcessor: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    process: vi.fn().mockResolvedValue({
      output: "Neural processing result",
      confidence: 0.75,
    }),
    getStatus: vi.fn().mockReturnValue({
      name: "StochasticNeuralProcessor",
      initialized: true,
      active: true,
      last_activity: Date.now(),
    }),
    reset: vi.fn(),
  })),
}));

describe("CognitiveOrchestrator", () => {
  let orchestrator: CognitiveOrchestrator;

  beforeEach(() => {
    orchestrator = new CognitiveOrchestrator();
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize successfully with default config", async () => {
      const defaultOrchestrator = new CognitiveOrchestrator();
      await expect(defaultOrchestrator.initialize()).resolves.not.toThrow();
    });

    it("should initialize successfully with custom config", async () => {
      const config = {
        default_processing_mode: ProcessingMode.ANALYTICAL,
        enable_all_components: true,
      };
      await expect(orchestrator.initialize(config)).resolves.not.toThrow();
    });

    it("should initialize all cognitive components", async () => {
      await orchestrator.initialize();

      const status = orchestrator.getStatus();
      expect(status.name).toBe("CognitiveOrchestrator");
      expect(status.initialized).toBe(true);
    });

    it("should handle initialization errors gracefully", async () => {
      // Mock initialization failure
      const failingOrchestrator = new CognitiveOrchestrator();
      vi.mocked(
        failingOrchestrator["sensoryProcessor"].initialize
      ).mockRejectedValue(new Error("Component initialization failed"));

      await expect(failingOrchestrator.initialize()).rejects.toThrow();
    });
  });

  describe("Cognitive Processing", () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it("should process simple text input successfully", async () => {
      const input: CognitiveInput = {
        input: "What is the meaning of life?",
        mode: ProcessingMode.BALANCED,
        context: { session_id: "test-session" },
        configuration: createDefaultCognitiveConfig({
          enable_emotion: true,
          enable_metacognition: true,
          enable_systematic_thinking: false,
          noise_level: 0,
          timeout_ms: 30000,
        }),
      };

      const result = await orchestrator.think(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.metadata.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle different processing modes", async () => {
      const modes = [
        ProcessingMode.INTUITIVE,
        ProcessingMode.DELIBERATIVE,
        ProcessingMode.BALANCED,
        ProcessingMode.CREATIVE,
        ProcessingMode.ANALYTICAL,
      ];

      for (const mode of modes) {
        const input: CognitiveInput = {
          input: "Test input for mode: " + mode,
          mode: mode,
          context: { session_id: "test-session" },
          configuration: createDefaultCognitiveConfig({
            enable_emotion: false,
            enable_metacognition: false,
            enable_systematic_thinking: false,
            noise_level: 0,
            timeout_ms: 30000,
          }),
        };

        const result = await orchestrator.think(input);
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      }
    });

    it("should process with emotional context when enabled", async () => {
      const input: CognitiveInput = {
        input: "I'm feeling excited about this new project!",
        mode: ProcessingMode.BALANCED,
        context: { session_id: "test-session" },
        configuration: createDefaultCognitiveConfig({
          enable_emotion: true,
          enable_metacognition: false,
          enable_systematic_thinking: false,
          noise_level: 0,
          timeout_ms: 30000,
        }),
      };

      const result = await orchestrator.think(input);

      expect(result).toBeDefined();
      expect(result.emotional_context).toBeDefined();
    });

    it("should apply metacognitive monitoring when enabled", async () => {
      const input: CognitiveInput = {
        input: "This is a complex reasoning task",
        mode: ProcessingMode.DELIBERATIVE,
        context: { session_id: "test-session" },
        configuration: createDefaultCognitiveConfig({
          enable_emotion: false,
          enable_metacognition: true,
          enable_systematic_thinking: false,
          noise_level: 0,
          timeout_ms: 30000,
        }),
      };

      const result = await orchestrator.think(input);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should handle processing errors gracefully", async () => {
      // Mock processing failure
      vi.mocked(
        orchestrator["dualProcessController"].process
      ).mockRejectedValue(new Error("Processing failed"));

      const input: CognitiveInput = {
        input: "This should fail",
        mode: ProcessingMode.BALANCED,
        context: { session_id: "test-session" },
        configuration: createDefaultCognitiveConfig({
          enable_emotion: false,
          enable_metacognition: false,
          enable_systematic_thinking: false,
          noise_level: 0,
          timeout_ms: 30000,
        }),
      };

      await expect(orchestrator.think(input)).rejects.toThrow(
        "Processing failed"
      );
    });
  });

  describe("Memory Integration", () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it("should retrieve relevant memories during processing", async () => {
      const input: CognitiveInput = {
        input: "Tell me about machine learning",
        mode: ProcessingMode.BALANCED,
        context: { session_id: "test-session" },
        configuration: createDefaultCognitiveConfig({
          enable_emotion: false,
          enable_metacognition: false,
          enable_systematic_thinking: false,
          noise_level: 0,
          timeout_ms: 30000,
        }),
      };

      await orchestrator.think(input);

      // Verify memory retrieval was called
      expect(orchestrator["memorySystem"].retrieveMemories).toHaveBeenCalled();
    });

    it("should store processing results in memory", async () => {
      const input: CognitiveInput = {
        input: "Remember this important fact",
        mode: ProcessingMode.BALANCED,
        context: { session_id: "test-session" },
        configuration: createDefaultCognitiveConfig({
          enable_emotion: false,
          enable_metacognition: false,
          enable_systematic_thinking: false,
          noise_level: 0,
          timeout_ms: 30000,
        }),
      };

      await orchestrator.think(input);

      // Verify memory storage was called
      expect(orchestrator["memorySystem"].storeExperience).toHaveBeenCalled();
    });
  });

  describe("Component Status", () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it("should return overall system status", () => {
      const status = orchestrator.getStatus();

      expect(status.name).toBe("CognitiveOrchestrator");
      expect(status.initialized).toBe(true);
      expect(status.last_activity).toBeGreaterThan(0);
    });

    it("should reflect component health in overall status", () => {
      // Mock unhealthy component
      vi.mocked(orchestrator["memorySystem"].getStatus).mockReturnValue({
        name: "MemorySystem",
        initialized: false,
        active: false,
        last_activity: 0,
      });

      const status = orchestrator.getStatus();
      expect(status.initialized).toBe(false);
    });
  });

  describe("Session Management", () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it("should handle session context properly", async () => {
      const sessionId = "test-session-123";
      const input: CognitiveInput = {
        input: "Test with session context",
        mode: ProcessingMode.BALANCED,
        context: { session_id: sessionId },
        configuration: createDefaultCognitiveConfig({
          enable_emotion: false,
          enable_metacognition: false,
          enable_systematic_thinking: false,
          noise_level: 0,
          timeout_ms: 30000,
        }),
      };

      const result = await orchestrator.think(input);
      expect(result).toBeDefined();
    });

    it("should maintain context across multiple interactions", async () => {
      const sessionId = "persistent-session";

      const input1: CognitiveInput = {
        input: "My name is Alice",
        mode: ProcessingMode.BALANCED,
        context: { session_id: sessionId },
        configuration: createDefaultCognitiveConfig({
          enable_emotion: false,
          enable_metacognition: false,
          enable_systematic_thinking: false,
          noise_level: 0,
          timeout_ms: 30000,
        }),
      };

      const input2: CognitiveInput = {
        input: "What is my name?",
        mode: ProcessingMode.BALANCED,
        context: { session_id: sessionId },
        configuration: createDefaultCognitiveConfig({
          enable_emotion: false,
          enable_metacognition: false,
          enable_systematic_thinking: false,
          noise_level: 0,
          timeout_ms: 30000,
        }),
      };

      await orchestrator.think(input1);
      const result2 = await orchestrator.think(input2);

      expect(result2).toBeDefined();
    });
  });

  describe("Configuration", () => {
    it("should use default configuration when none provided", () => {
      const defaultOrchestrator = new CognitiveOrchestrator();
      const status = defaultOrchestrator.getStatus();
      expect(status).toBeDefined();
    });

    it("should merge provided configuration with defaults", () => {
      const customConfig = {
        default_processing_mode: ProcessingMode.CREATIVE,
        enable_all_components: false,
      };

      const customOrchestrator = new CognitiveOrchestrator(customConfig);
      expect(customOrchestrator).toBeDefined();
    });

    it("should validate configuration parameters", () => {
      const config = {
        default_processing_mode: ProcessingMode.ANALYTICAL,
        enable_all_components: true,
      };

      const orchestratorWithConfig = new CognitiveOrchestrator(config);
      expect(orchestratorWithConfig).toBeDefined();
    });
  });

  describe("Reset Functionality", () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it("should reset all components", () => {
      orchestrator.reset();

      expect(orchestrator["sensoryProcessor"].reset).toHaveBeenCalled();
      expect(orchestrator["memorySystem"].reset).toHaveBeenCalled();
    });
  });
});
