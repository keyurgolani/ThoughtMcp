/**
 * Metacognitive MCP Tools Tests
 *
 * Tests for metacognitive operation MCP tools (assess_confidence, detect_bias, detect_emotion, analyze_reasoning).
 * Following TDD principles - these tests define expected behavior before implementation.
 *
 * Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CognitiveMCPServer } from "../../../server/mcp-server.js";

// Mock all dependencies
vi.mock("../../../memory/memory-repository.js");
vi.mock("../../../reasoning/orchestrator.js");
vi.mock("../../../framework/framework-selector.js");
vi.mock("../../../confidence/multi-dimensional-assessor.js");
vi.mock("../../../bias/bias-pattern-recognizer.js");
vi.mock("../../../emotion/circumplex-analyzer.js");
vi.mock("../../../metacognitive/performance-monitoring-system.js");
vi.mock("../../../database/connection-manager.js");
vi.mock("../../../embeddings/embedding-engine.js");
vi.mock("../../../utils/logger.js", () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Metacognitive MCP Tools", () => {
  let server: CognitiveMCPServer;
  let mockConfidenceAssessor: any;
  let mockBiasDetector: any;
  let mockEmotionAnalyzer: any;
  let mockPerformanceMonitor: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create mock components
    mockConfidenceAssessor = {
      assessConfidence: vi.fn(),
    };

    mockBiasDetector = {
      detectBiases: vi.fn(),
      monitorContinuously: vi.fn(),
    };

    mockEmotionAnalyzer = {
      analyzeCircumplex: vi.fn(),
      classifyEmotions: vi.fn(),
    };

    mockPerformanceMonitor = {
      trackReasoningQuality: vi.fn(),
      generatePerformanceReport: vi.fn(),
    };

    // Create server (but don't initialize to avoid registering real tools)
    server = new CognitiveMCPServer();

    // Set up mock components directly without initialization
    server.confidenceAssessor = mockConfidenceAssessor;
    server.biasDetector = mockBiasDetector;
    server.emotionAnalyzer = mockEmotionAnalyzer;
    server.performanceMonitor = mockPerformanceMonitor;
    (server as any).databaseManager = {
      healthCheck: vi.fn().mockResolvedValue(true),
    };
    server.isInitialized = true; // Mark as initialized for executeTool to work

    // Register the metacognitive tools manually for testing
    (server as any).registerMetacognitiveTools();
  });

  afterEach(async () => {
    // Clear tool registry to prevent "Tool already registered" errors
    server.toolRegistry.clear();
    server.isInitialized = false;
    vi.clearAllMocks();
  });

  describe("assess_confidence tool", () => {
    // Note: Tool is already registered by server.initialize()
    // No need to register again in beforeEach

    it("should assess confidence with multi-dimensional analysis", async () => {
      const mockAssessment = {
        overallConfidence: 0.85,
        dimensions: {
          evidenceQuality: 0.9,
          reasoningCoherence: 0.85,
          completeness: 0.8,
          uncertaintyLevel: 0.15,
          biasFreedom: 0.9,
        },
        interpretation: "High confidence - strong evidence and coherent reasoning",
        recommendations: ["Proceed with implementation", "Monitor for edge cases"],
      };

      mockConfidenceAssessor.assessConfidence.mockResolvedValue(mockAssessment);

      const result = await server.executeTool("assess_confidence", {
        reasoning: "Based on performance metrics, the optimization will improve throughput by 40%",
        evidence: ["Benchmark results show 40% improvement", "Load tests confirm scalability"],
        context: "Production optimization decision",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).overallConfidence).toBe(0.85);
      expect((result.data as any).dimensions).toBeDefined();
      expect((result.data as any).dimensions.evidenceQuality).toBe(0.9);
      expect((result.data as any).dimensions.reasoningCoherence).toBe(0.85);
      expect((result.data as any).dimensions.completeness).toBe(0.8);
      expect((result.data as any).dimensions.uncertaintyLevel).toBe(0.15);
      expect((result.data as any).dimensions.biasFreedom).toBe(0.9);
      expect((result.data as any).interpretation).toBeDefined();
      expect((result.data as any).recommendations).toHaveLength(2);
    });

    it("should assess confidence with minimal evidence", async () => {
      const mockAssessment = {
        overallConfidence: 0.45,
        dimensions: {
          evidenceQuality: 0.3,
          reasoningCoherence: 0.6,
          completeness: 0.4,
          uncertaintyLevel: 0.6,
          biasFreedom: 0.7,
        },
        interpretation: "Low confidence - insufficient evidence",
        recommendations: [
          "Gather more evidence",
          "Consider alternative approaches",
          "Seek expert review",
        ],
      };

      mockConfidenceAssessor.assessConfidence.mockResolvedValue(mockAssessment);

      const result = await server.executeTool("assess_confidence", {
        reasoning: "This approach might work based on intuition",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).overallConfidence).toBeLessThan(0.5);
      expect((result.data as any).dimensions.evidenceQuality).toBeLessThan(0.5);
      expect((result.data as any).recommendations).toContain("Gather more evidence");
    });

    it("should detect high uncertainty and provide warnings", async () => {
      const mockAssessment = {
        overallConfidence: 0.35,
        dimensions: {
          evidenceQuality: 0.4,
          reasoningCoherence: 0.5,
          completeness: 0.3,
          uncertaintyLevel: 0.8,
          biasFreedom: 0.6,
        },
        interpretation: "Very low confidence - high uncertainty detected",
        warnings: ["Insufficient data for reliable conclusion", "Consider delaying decision"],
        recommendations: ["Collect more data", "Run pilot test", "Consult domain experts"],
      };

      mockConfidenceAssessor.assessConfidence.mockResolvedValue(mockAssessment);

      const result = await server.executeTool("assess_confidence", {
        reasoning: "We could try this new approach",
        context: "Experimental feature",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).overallConfidence).toBeLessThan(0.5);
      expect((result.data as any).dimensions.uncertaintyLevel).toBeGreaterThan(0.7);
      expect((result.data as any).warnings).toBeDefined();
      expect((result.data as any).warnings.length).toBeGreaterThan(0);
    });

    it("should assess confidence within 100ms", async () => {
      const mockAssessment = {
        overallConfidence: 0.75,
        dimensions: {
          evidenceQuality: 0.8,
          reasoningCoherence: 0.75,
          completeness: 0.7,
          uncertaintyLevel: 0.25,
          biasFreedom: 0.8,
        },
        interpretation: "Moderate to high confidence",
        recommendations: [],
      };

      mockConfidenceAssessor.assessConfidence.mockResolvedValue(mockAssessment);

      const startTime = Date.now();
      const result = await server.executeTool("assess_confidence", {
        reasoning: "Test reasoning",
      });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100);
    });

    it("should validate required parameters", async () => {
      const result = await server.executeTool("assess_confidence", {
        evidence: ["Some evidence"],
        // Missing reasoning
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("reasoning");
    });

    it("should handle assessment errors gracefully", async () => {
      mockConfidenceAssessor.assessConfidence.mockRejectedValue(new Error("Assessment failed"));

      const result = await server.executeTool("assess_confidence", {
        reasoning: "Test reasoning",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Assessment failed");
    });

    it("should include metadata in response", async () => {
      const mockAssessment = {
        overallConfidence: 0.8,
        dimensions: {
          evidenceQuality: 0.8,
          reasoningCoherence: 0.8,
          completeness: 0.8,
          uncertaintyLevel: 0.2,
          biasFreedom: 0.8,
        },
        interpretation: "High confidence",
        recommendations: [],
      };

      mockConfidenceAssessor.assessConfidence.mockResolvedValue(mockAssessment);

      const result = await server.executeTool("assess_confidence", {
        reasoning: "Test reasoning",
      });

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.timestamp).toBeDefined();
      expect(result.metadata?.processingTime).toBeDefined();
    });
  });

  describe("detect_bias tool", () => {
    // Note: Tool is already registered by server.initialize()
    // No need to register again in beforeEach

    it("should detect confirmation bias", async () => {
      const mockBiases = [
        {
          type: "confirmation",
          severity: 0.7,
          description: "Seeking only supporting evidence",
          evidence: ["Ignored contradictory data", "Cherry-picked favorable results"],
          correction: "Consider alternative explanations and contradictory evidence",
        },
      ];

      mockBiasDetector.detectBiases.mockReturnValue(mockBiases);

      const result = await server.executeTool("detect_bias", {
        reasoning: "All the data I looked at supports my hypothesis, so it must be correct",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).biases).toHaveLength(1);
      expect((result.data as any).biases[0].type).toBe("confirmation");
      expect((result.data as any).biases[0].severity).toBe(0.7);
      expect((result.data as any).biases[0].correction).toBeDefined();
    });

    it("should detect anchoring bias", async () => {
      const mockBiases = [
        {
          type: "anchoring",
          severity: 0.65,
          description: "Over-reliance on initial information",
          evidence: ["First estimate heavily influenced final decision"],
          correction: "Consider multiple reference points and adjust estimates independently",
        },
      ];

      mockBiasDetector.detectBiases.mockReturnValue(mockBiases);

      const result = await server.executeTool("detect_bias", {
        reasoning: "The initial estimate was $100k, so I'll adjust to $95k",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).biases[0].type).toBe("anchoring");
    });

    it("should detect availability bias", async () => {
      const mockBiases = [
        {
          type: "availability",
          severity: 0.6,
          description: "Over-weighting recent or memorable events",
          evidence: ["Recent incident influenced risk assessment"],
          correction: "Consider base rates and statistical evidence",
        },
      ];

      mockBiasDetector.detectBiases.mockReturnValue(mockBiases);

      const result = await server.executeTool("detect_bias", {
        reasoning: "Since we just had a security breach, security is our biggest risk",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).biases[0].type).toBe("availability");
    });

    it("should detect multiple biases simultaneously", async () => {
      const mockBiases = [
        {
          type: "confirmation",
          severity: 0.7,
          description: "Confirmation bias detected",
          evidence: ["Selective evidence"],
          correction: "Consider alternatives",
        },
        {
          type: "recency",
          severity: 0.5,
          description: "Recency bias detected",
          evidence: ["Over-weighting recent data"],
          correction: "Consider historical patterns",
        },
        {
          type: "framing",
          severity: 0.6,
          description: "Framing effects detected",
          evidence: ["Presentation influenced judgment"],
          correction: "Reframe the problem",
        },
      ];

      mockBiasDetector.detectBiases.mockReturnValue(mockBiases);

      const result = await server.executeTool("detect_bias", {
        reasoning: "Recent positive results confirm our approach is working",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).biases).toHaveLength(3);
      expect((result.data as any).biases.map((b: any) => b.type)).toContain("confirmation");
      expect((result.data as any).biases.map((b: any) => b.type)).toContain("recency");
      expect((result.data as any).biases.map((b: any) => b.type)).toContain("framing");
    });

    it("should detect biases within 2-3 seconds", async () => {
      const mockBiases = [
        {
          type: "confirmation",
          severity: 0.6,
          description: "Bias detected",
          evidence: [],
          correction: "Correction strategy",
        },
      ];

      mockBiasDetector.detectBiases.mockReturnValue(mockBiases);

      const result = await server.executeTool("detect_bias", {
        reasoning: "Test reasoning",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).detectionTime).toBeLessThan(3);
    });

    it("should not enable continuous monitoring (not supported by BiasPatternRecognizer)", async () => {
      const mockBiases: unknown[] = [];

      mockBiasDetector.detectBiases.mockReturnValue(mockBiases);

      const result = await server.executeTool("detect_bias", {
        reasoning: "Test reasoning",
        monitorContinuously: true,
      });

      expect(result.success).toBe(true);
      // Continuous monitoring is not supported by BiasPatternRecognizer
      // Use BiasMonitoringSystem for continuous monitoring capabilities
      expect((result.data as { monitoringActive: boolean }).monitoringActive).toBe(false);
    });

    it("should assess bias severity on 0-1 scale", async () => {
      const mockBiases = [
        {
          type: "confirmation",
          severity: 0.85,
          description: "Severe confirmation bias",
          evidence: ["Strong selective evidence"],
          correction: "Urgent correction needed",
        },
      ];

      mockBiasDetector.detectBiases.mockReturnValue(mockBiases);

      const result = await server.executeTool("detect_bias", {
        reasoning: "Test reasoning",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).biases[0].severity).toBeGreaterThanOrEqual(0);
      expect((result.data as any).biases[0].severity).toBeLessThanOrEqual(1);
    });

    it("should provide correction strategies for detected biases", async () => {
      const mockBiases = [
        {
          type: "anchoring",
          severity: 0.7,
          description: "Anchoring bias",
          evidence: ["Initial anchor influenced estimate"],
          correction: "Use multiple reference points and independent estimates",
        },
      ];

      mockBiasDetector.detectBiases.mockReturnValue(mockBiases);

      const result = await server.executeTool("detect_bias", {
        reasoning: "Test reasoning",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).biases[0].correction).toBeDefined();
      expect((result.data as any).biases[0].correction.length).toBeGreaterThan(0);
    });

    it("should handle no biases detected", async () => {
      mockBiasDetector.detectBiases.mockReturnValue([]);

      const result = await server.executeTool("detect_bias", {
        reasoning: "Objective analysis based on comprehensive data",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).biases).toHaveLength(0);
    });

    it("should validate required parameters", async () => {
      const result = await server.executeTool("detect_bias", {
        context: "Test context",
        // Missing reasoning
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("reasoning");
    });

    it("should handle detection errors gracefully", async () => {
      mockBiasDetector.detectBiases.mockImplementation(() => {
        throw new Error("Detection failed");
      });

      const result = await server.executeTool("detect_bias", {
        reasoning: "Test reasoning",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Detection failed");
    });
  });

  describe("detect_emotion tool", () => {
    // Note: Tool is already registered by server.initialize()
    // No need to register again in beforeEach

    it("should detect emotions using Circumplex model", async () => {
      const mockCircumplex = {
        valence: 0.7,
        arousal: 0.6,
        dominance: 0.5,
        confidence: 0.85,
      };

      mockEmotionAnalyzer.analyzeCircumplex.mockReturnValue(mockCircumplex);
      mockEmotionAnalyzer.classifyEmotions.mockReturnValue([]);

      const result = await server.executeTool("detect_emotion", {
        text: "I'm really excited about this new project!",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).circumplex).toBeDefined();
      expect((result.data as any).circumplex.valence).toBe(0.7);
      expect((result.data as any).circumplex.arousal).toBe(0.6);
      expect((result.data as any).circumplex.dominance).toBe(0.5);
      expect((result.data as any).circumplex.confidence).toBe(0.85);
    });

    it("should validate valence range (-1 to +1)", async () => {
      const mockCircumplex = {
        valence: -0.8,
        arousal: 0.7,
        dominance: -0.3,
        confidence: 0.8,
      };

      mockEmotionAnalyzer.analyzeCircumplex.mockReturnValue(mockCircumplex);
      mockEmotionAnalyzer.classifyEmotions.mockReturnValue([]);

      const result = await server.executeTool("detect_emotion", {
        text: "This is terrible and frustrating",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).circumplex.valence).toBeGreaterThanOrEqual(-1);
      expect((result.data as any).circumplex.valence).toBeLessThanOrEqual(1);
    });

    it("should validate arousal range (0 to 1)", async () => {
      const mockCircumplex = {
        valence: 0.2,
        arousal: 0.9,
        dominance: 0.6,
        confidence: 0.75,
      };

      mockEmotionAnalyzer.analyzeCircumplex.mockReturnValue(mockCircumplex);
      mockEmotionAnalyzer.classifyEmotions.mockReturnValue([]);

      const result = await server.executeTool("detect_emotion", {
        text: "I'm so energized and ready to go!",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).circumplex.arousal).toBeGreaterThanOrEqual(0);
      expect((result.data as any).circumplex.arousal).toBeLessThanOrEqual(1);
    });

    it("should validate dominance range (-1 to +1)", async () => {
      const mockCircumplex = {
        valence: -0.5,
        arousal: 0.4,
        dominance: -0.7,
        confidence: 0.8,
      };

      mockEmotionAnalyzer.analyzeCircumplex.mockReturnValue(mockCircumplex);
      mockEmotionAnalyzer.classifyEmotions.mockReturnValue([]);

      const result = await server.executeTool("detect_emotion", {
        text: "I feel powerless and overwhelmed",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).circumplex.dominance).toBeGreaterThanOrEqual(-1);
      expect((result.data as any).circumplex.dominance).toBeLessThanOrEqual(1);
    });

    it("should classify discrete emotions", async () => {
      const mockCircumplex = {
        valence: 0.8,
        arousal: 0.7,
        dominance: 0.6,
        confidence: 0.85,
      };

      const mockDiscrete = [
        {
          emotion: "joy",
          intensity: 0.85,
          confidence: 0.9,
        },
        {
          emotion: "excitement",
          intensity: 0.7,
          confidence: 0.8,
        },
      ];

      mockEmotionAnalyzer.analyzeCircumplex.mockReturnValue(mockCircumplex);
      mockEmotionAnalyzer.classifyEmotions.mockReturnValue(mockDiscrete);

      const result = await server.executeTool("detect_emotion", {
        text: "I'm so happy and excited about this!",
        includeDiscrete: true,
      });

      expect(result.success).toBe(true);
      expect((result.data as any).discrete).toBeDefined();
      expect((result.data as any).discrete).toHaveLength(2);
      expect((result.data as any).discrete[0].emotion).toBe("joy");
      expect((result.data as any).discrete[0].intensity).toBe(0.85);
    });

    it("should detect all 11 discrete emotion types", async () => {
      const mockCircumplex = {
        valence: 0.0,
        arousal: 0.5,
        dominance: 0.0,
        confidence: 0.7,
      };

      const mockDiscrete = [
        { emotion: "joy", intensity: 0.1, confidence: 0.5 },
        { emotion: "sadness", intensity: 0.2, confidence: 0.6 },
        { emotion: "anger", intensity: 0.1, confidence: 0.5 },
        { emotion: "fear", intensity: 0.15, confidence: 0.55 },
        { emotion: "disgust", intensity: 0.1, confidence: 0.5 },
        { emotion: "surprise", intensity: 0.2, confidence: 0.6 },
        { emotion: "pride", intensity: 0.1, confidence: 0.5 },
        { emotion: "shame", intensity: 0.1, confidence: 0.5 },
        { emotion: "guilt", intensity: 0.1, confidence: 0.5 },
        { emotion: "gratitude", intensity: 0.15, confidence: 0.55 },
        { emotion: "awe", intensity: 0.1, confidence: 0.5 },
      ];

      mockEmotionAnalyzer.analyzeCircumplex.mockReturnValue(mockCircumplex);
      mockEmotionAnalyzer.classifyEmotions.mockReturnValue(mockDiscrete);

      const result = await server.executeTool("detect_emotion", {
        text: "Complex emotional text",
        includeDiscrete: true,
      });

      expect(result.success).toBe(true);
      expect((result.data as any).discrete).toHaveLength(11);
      const emotionTypes = (result.data as any).discrete.map((e: any) => e.emotion);
      expect(emotionTypes).toContain("joy");
      expect(emotionTypes).toContain("sadness");
      expect(emotionTypes).toContain("anger");
      expect(emotionTypes).toContain("fear");
      expect(emotionTypes).toContain("disgust");
      expect(emotionTypes).toContain("surprise");
      expect(emotionTypes).toContain("pride");
      expect(emotionTypes).toContain("shame");
      expect(emotionTypes).toContain("guilt");
      expect(emotionTypes).toContain("gratitude");
      expect(emotionTypes).toContain("awe");
    });

    it("should skip discrete classification when requested", async () => {
      const mockCircumplex = {
        valence: 0.5,
        arousal: 0.5,
        dominance: 0.5,
        confidence: 0.8,
      };

      mockEmotionAnalyzer.analyzeCircumplex.mockReturnValue(mockCircumplex);

      const result = await server.executeTool("detect_emotion", {
        text: "Test text",
        includeDiscrete: false,
      });

      expect(result.success).toBe(true);
      expect((result.data as any).circumplex).toBeDefined();
      expect((result.data as any).discrete).toBeNull();
      expect(mockEmotionAnalyzer.classifyEmotions).not.toHaveBeenCalled();
    });

    it("should detect emotions within 200ms", async () => {
      const mockCircumplex = {
        valence: 0.5,
        arousal: 0.5,
        dominance: 0.5,
        confidence: 0.8,
      };

      mockEmotionAnalyzer.analyzeCircumplex.mockReturnValue(mockCircumplex);
      mockEmotionAnalyzer.classifyEmotions.mockReturnValue([]);

      const result = await server.executeTool("detect_emotion", {
        text: "Test text",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).detectionTime).toBeLessThan(200);
    });

    it("should validate required parameters", async () => {
      const result = await server.executeTool("detect_emotion", {
        includeDiscrete: true,
        // Missing text
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("text");
    });

    it("should handle detection errors gracefully", async () => {
      mockEmotionAnalyzer.analyzeCircumplex.mockImplementation(() => {
        throw new Error("Emotion detection failed");
      });

      const result = await server.executeTool("detect_emotion", {
        text: "Test text",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Emotion detection failed");
    });

    it("should include metadata in response", async () => {
      const mockCircumplex = {
        valence: 0.5,
        arousal: 0.5,
        dominance: 0.5,
        confidence: 0.8,
      };

      mockEmotionAnalyzer.analyzeCircumplex.mockReturnValue(mockCircumplex);
      mockEmotionAnalyzer.classifyEmotions.mockReturnValue([]);

      const result = await server.executeTool("detect_emotion", {
        text: "Test text",
      });

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.timestamp).toBeDefined();
      expect(result.metadata?.processingTime).toBeDefined();
    });
  });

  describe("analyze_reasoning tool", () => {
    // Note: Tool is already registered by server.initialize()
    // No need to register again in beforeEach

    it("should analyze reasoning quality comprehensively", async () => {
      mockConfidenceAssessor.assessConfidence.mockResolvedValue({
        overallConfidence: 0.8,
        dimensions: {
          evidenceQuality: 0.8,
          reasoningCoherence: 0.85,
          completeness: 0.75,
          uncertaintyLevel: 0.2,
          biasFreedom: 0.85,
        },
      });

      mockBiasDetector.detectBiases.mockReturnValue([]);

      const result = await server.executeTool("analyze_reasoning", {
        reasoning: "Based on comprehensive analysis, the proposed solution is optimal",
        context: "Technical decision",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).quality).toBeDefined();
      expect((result.data as any).quality.coherence).toBeGreaterThan(0.8);
      expect((result.data as any).quality.completeness).toBeGreaterThan(0.7);
      expect((result.data as any).quality.logicalValidity).toBeGreaterThan(0.8);
      expect((result.data as any).quality.evidenceSupport).toBeGreaterThan(0.7);
    });

    it("should identify reasoning strengths", async () => {
      mockConfidenceAssessor.assessConfidence.mockResolvedValue({
        overallConfidence: 0.85,
        dimensions: {
          evidenceQuality: 0.9,
          reasoningCoherence: 0.9,
          completeness: 0.8,
          uncertaintyLevel: 0.15,
          biasFreedom: 0.85,
        },
      });

      mockBiasDetector.detectBiases.mockReturnValue([]);

      const result = await server.executeTool("analyze_reasoning", {
        reasoning: "Well-structured argument with strong evidence",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).strengths).toBeDefined();
      expect((result.data as any).strengths.length).toBeGreaterThan(0);
    });

    it("should identify reasoning weaknesses", async () => {
      mockConfidenceAssessor.assessConfidence.mockResolvedValue({
        overallConfidence: 0.5,
        dimensions: {
          evidenceQuality: 0.4,
          reasoningCoherence: 0.6,
          completeness: 0.5,
          uncertaintyLevel: 0.5,
          biasFreedom: 0.6,
        },
      });

      mockBiasDetector.detectBiases.mockReturnValue([
        {
          type: "confirmation",
          severity: 0.6,
          description: "Confirmation bias detected",
          evidence: [],
          correction: "Consider alternatives",
        },
      ]);

      const result = await server.executeTool("analyze_reasoning", {
        reasoning: "Weak argument with limited support",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).weaknesses).toBeDefined();
      expect((result.data as any).weaknesses.length).toBeGreaterThan(0);
    });

    it("should provide improvement recommendations", async () => {
      mockConfidenceAssessor.assessConfidence.mockResolvedValue({
        overallConfidence: 0.65,
        dimensions: {
          evidenceQuality: 0.6,
          reasoningCoherence: 0.7,
          completeness: 0.6,
          uncertaintyLevel: 0.35,
          biasFreedom: 0.7,
        },
      });

      mockBiasDetector.detectBiases.mockReturnValue([]);

      const result = await server.executeTool("analyze_reasoning", {
        reasoning: "Moderate quality reasoning",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).recommendations).toBeDefined();
      expect((result.data as any).recommendations.length).toBeGreaterThan(0);
    });

    it("should include confidence assessment when requested", async () => {
      const mockConfidence = {
        overallConfidence: 0.8,
        dimensions: {
          evidenceQuality: 0.8,
          reasoningCoherence: 0.85,
          completeness: 0.75,
          uncertaintyLevel: 0.2,
          biasFreedom: 0.85,
        },
        interpretation: "High confidence",
        recommendations: [],
      };

      mockConfidenceAssessor.assessConfidence.mockResolvedValue(mockConfidence);
      mockBiasDetector.detectBiases.mockReturnValue([]);

      const result = await server.executeTool("analyze_reasoning", {
        reasoning: "Test reasoning",
        includeConfidence: true,
      });

      expect(result.success).toBe(true);
      expect((result.data as any).confidence).toBeDefined();
      expect((result.data as any).confidence.overallConfidence).toBe(0.8);
    });

    it("should include bias detection when requested", async () => {
      const mockBiases = [
        {
          type: "confirmation",
          severity: 0.6,
          description: "Confirmation bias",
          evidence: [],
          correction: "Consider alternatives",
        },
      ];

      mockConfidenceAssessor.assessConfidence.mockResolvedValue({
        overallConfidence: 0.7,
        dimensions: {
          evidenceQuality: 0.7,
          reasoningCoherence: 0.7,
          completeness: 0.7,
          uncertaintyLevel: 0.3,
          biasFreedom: 0.7,
        },
      });

      mockBiasDetector.detectBiases.mockReturnValue(mockBiases);

      const result = await server.executeTool("analyze_reasoning", {
        reasoning: "Test reasoning",
        includeBias: true,
      });

      expect(result.success).toBe(true);
      expect((result.data as any).biases).toBeDefined();
      expect((result.data as any).biases).toHaveLength(1);
    });

    it("should include emotion analysis when requested", async () => {
      const mockEmotion = {
        valence: 0.6,
        arousal: 0.5,
        dominance: 0.4,
        confidence: 0.8,
      };

      mockConfidenceAssessor.assessConfidence.mockResolvedValue({
        overallConfidence: 0.75,
        dimensions: {
          evidenceQuality: 0.75,
          reasoningCoherence: 0.75,
          completeness: 0.75,
          uncertaintyLevel: 0.25,
          biasFreedom: 0.75,
        },
      });

      mockBiasDetector.detectBiases.mockReturnValue([]);
      mockEmotionAnalyzer.analyzeCircumplex.mockReturnValue(mockEmotion);

      const result = await server.executeTool("analyze_reasoning", {
        reasoning: "Test reasoning",
        includeEmotion: true,
      });

      expect(result.success).toBe(true);
      expect((result.data as any).emotion).toBeDefined();
      expect((result.data as any).emotion.valence).toBe(0.6);
    });

    it("should skip optional analyses when not requested", async () => {
      mockConfidenceAssessor.assessConfidence.mockResolvedValue({
        overallConfidence: 0.75,
        dimensions: {
          evidenceQuality: 0.75,
          reasoningCoherence: 0.75,
          completeness: 0.75,
          uncertaintyLevel: 0.25,
          biasFreedom: 0.75,
        },
      });

      mockBiasDetector.detectBiases.mockReturnValue([]);

      const result = await server.executeTool("analyze_reasoning", {
        reasoning: "Test reasoning",
        includeConfidence: false,
        includeBias: false,
        includeEmotion: false,
      });

      expect(result.success).toBe(true);
      expect((result.data as any).quality).toBeDefined();
      expect((result.data as any).confidence).toBeUndefined();
      expect((result.data as any).biases).toBeUndefined();
      expect((result.data as any).emotion).toBeUndefined();
    });

    it("should validate required parameters", async () => {
      const result = await server.executeTool("analyze_reasoning", {
        context: "Test context",
        // Missing reasoning
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("reasoning");
    });

    it("should handle analysis errors gracefully", async () => {
      mockConfidenceAssessor.assessConfidence.mockRejectedValue(new Error("Analysis failed"));

      const result = await server.executeTool("analyze_reasoning", {
        reasoning: "Test reasoning",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Analysis failed");
    });

    it("should include metadata in response", async () => {
      mockConfidenceAssessor.assessConfidence.mockResolvedValue({
        overallConfidence: 0.75,
        dimensions: {
          evidenceQuality: 0.75,
          reasoningCoherence: 0.75,
          completeness: 0.75,
          uncertaintyLevel: 0.25,
          biasFreedom: 0.75,
        },
      });

      mockBiasDetector.detectBiases.mockReturnValue([]);

      const result = await server.executeTool("analyze_reasoning", {
        reasoning: "Test reasoning",
      });

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.timestamp).toBeDefined();
      expect(result.metadata?.processingTime).toBeDefined();
    });
  });

  describe("Parameter Validation", () => {
    it("should validate all tools have proper schemas", () => {
      // Note: Tools are already registered by server.initialize()
      const expectedTools = [
        "assess_confidence",
        "detect_bias",
        "detect_emotion",
        "analyze_reasoning",
      ];

      expectedTools.forEach((toolName) => {
        const tool = server.toolRegistry.getTool(toolName);
        expect(tool).toBeDefined();
        expect(tool?.inputSchema).toBeDefined();
        expect(tool?.inputSchema.type).toBe("object");
        expect(tool?.inputSchema.properties).toBeDefined();
        expect(tool?.inputSchema.required).toBeDefined();
      });
    });

    it("should validate response format consistency", async () => {
      // Setup mocks
      mockConfidenceAssessor.assessConfidence.mockResolvedValue({
        overallConfidence: 0.8,
        dimensions: {
          evidenceQuality: 0.8,
          reasoningCoherence: 0.8,
          completeness: 0.8,
          uncertaintyLevel: 0.2,
          biasFreedom: 0.8,
        },
        interpretation: "High confidence",
        recommendations: [],
      });

      mockBiasDetector.detectBiases.mockReturnValue([]);

      mockEmotionAnalyzer.analyzeCircumplex.mockReturnValue({
        valence: 0.5,
        arousal: 0.5,
        dominance: 0.5,
        confidence: 0.8,
      });

      // Note: Tools are already registered by server.initialize()
      // Test all tools with mocked components
      const tools = [
        { name: "assess_confidence", params: { reasoning: "test" } },
        { name: "detect_bias", params: { reasoning: "test" } },
        { name: "detect_emotion", params: { text: "test" } },
        { name: "analyze_reasoning", params: { reasoning: "test" } },
      ];

      for (const tool of tools) {
        const result = await server.executeTool(tool.name, tool.params);

        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("data");
        expect(result).toHaveProperty("metadata");
        expect(result.metadata).toHaveProperty("timestamp");
        expect(result.metadata).toHaveProperty("processingTime");
      }
    });
  });
});
