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
      detectBiasesFromText: vi.fn(),
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

    // Create mock bias corrector
    const mockBiasCorrector = {
      getSuggestion: vi.fn().mockReturnValue({
        biasType: "confirmation",
        suggestion: "Actively seek disconfirming evidence",
        techniques: ["Search for contradicting evidence", "Ask opposing viewpoints"],
        challengeQuestions: ["What evidence would prove this wrong?"],
      }),
      addCorrections: vi.fn(),
      getConciseSuggestion: vi.fn(),
      getAllTemplates: vi.fn().mockReturnValue(new Map()),
      formatCorrection: vi.fn().mockReturnValue("Formatted correction"),
    };

    // Set up mock components directly without initialization
    server.confidenceAssessor = mockConfidenceAssessor;
    server.biasDetector = mockBiasDetector;
    server.biasCorrector = mockBiasCorrector;
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

    it("should extract evidence from reasoning when no explicit evidence provided (Requirement 7.3)", async () => {
      const mockAssessment = {
        overallConfidence: 0.75,
        evidenceQuality: 0.7,
        reasoningCoherence: 0.8,
        completeness: 0.7,
        uncertaintyLevel: 0.3,
        uncertaintyType: "epistemic",
        factors: [],
        timestamp: new Date(),
        processingTime: 10,
      };

      mockConfidenceAssessor.assessConfidence.mockResolvedValue(mockAssessment);

      // Set up evidence extractor on the server
      const { EvidenceExtractor } = await import("../../../confidence/evidence-extractor.js");
      server.evidenceExtractor = new EvidenceExtractor();

      const result = await server.executeTool("assess_confidence", {
        reasoning:
          "Research shows that this approach improves performance by 30%. " +
          "The data indicates consistent results across all test cases. " +
          "We observed significant improvements in response time.",
      });

      expect(result.success).toBe(true);
      // Evidence should be extracted from reasoning text
      expect((result.data as any).extractedEvidence).toBeDefined();
      expect((result.data as any).extractedEvidence.length).toBeGreaterThan(0);
      // Metadata should indicate evidence was extracted
      expect(result.metadata?.evidenceSource).toBe("extracted");
      expect(result.metadata?.componentsUsed).toContain("evidenceExtractor");
    });

    it("should include extracted evidence items in response (Requirement 7.4)", async () => {
      const mockAssessment = {
        overallConfidence: 0.8,
        evidenceQuality: 0.75,
        reasoningCoherence: 0.85,
        completeness: 0.8,
        uncertaintyLevel: 0.2,
        uncertaintyType: "aleatory",
        factors: [],
        timestamp: new Date(),
        processingTime: 8,
      };

      mockConfidenceAssessor.assessConfidence.mockResolvedValue(mockAssessment);

      // Set up evidence extractor on the server
      const { EvidenceExtractor } = await import("../../../confidence/evidence-extractor.js");
      server.evidenceExtractor = new EvidenceExtractor();

      const result = await server.executeTool("assess_confidence", {
        reasoning:
          "Studies found that the new algorithm is 2x faster. " +
          "According to the documentation, this is the recommended approach.",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).extractedEvidence).toBeDefined();
      // Each extracted evidence should have statement, type, and confidence
      const extracted = (result.data as any).extractedEvidence;
      expect(extracted.length).toBeGreaterThan(0);
      expect(extracted[0].statement).toBeDefined();
      expect(extracted[0].type).toBeDefined();
      expect(extracted[0].confidence).toBeDefined();
    });

    it("should not extract evidence when explicit evidence is provided", async () => {
      const mockAssessment = {
        overallConfidence: 0.9,
        evidenceQuality: 0.9,
        reasoningCoherence: 0.9,
        completeness: 0.85,
        uncertaintyLevel: 0.1,
        uncertaintyType: "aleatory",
        factors: [],
        timestamp: new Date(),
        processingTime: 5,
      };

      mockConfidenceAssessor.assessConfidence.mockResolvedValue(mockAssessment);

      // Set up evidence extractor on the server
      const { EvidenceExtractor } = await import("../../../confidence/evidence-extractor.js");
      server.evidenceExtractor = new EvidenceExtractor();

      const result = await server.executeTool("assess_confidence", {
        reasoning: "The optimization will improve performance.",
        evidence: ["Benchmark shows 40% improvement", "Load tests confirm scalability"],
      });

      expect(result.success).toBe(true);
      // Should not have extractedEvidence since explicit evidence was provided
      expect((result.data as any).extractedEvidence).toBeUndefined();
      // Metadata should indicate evidence was provided
      expect(result.metadata?.evidenceSource).toBe("provided");
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
        },
      ];

      mockBiasDetector.detectBiasesFromText.mockReturnValue(mockBiases);

      const result = await server.executeTool("detect_bias", {
        reasoning: "All the data I looked at supports my hypothesis, so it must be correct",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).biases).toHaveLength(1);
      expect((result.data as any).biases[0].type).toBe("confirmation");
      expect((result.data as any).biases[0].severity).toBe(0.7);
      // Correction is now added by BiasCorrector (Requirements 10.6, 10.10)
      expect((result.data as any).biases[0].correction).toBeDefined();
      expect((result.data as any).biases[0].correction.suggestion).toBeDefined();
    });

    it("should detect anchoring bias", async () => {
      const mockBiases = [
        {
          type: "anchoring",
          severity: 0.65,
          description: "Over-reliance on initial information",
          evidence: ["First estimate heavily influenced final decision"],
        },
      ];

      mockBiasDetector.detectBiasesFromText.mockReturnValue(mockBiases);

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
        },
      ];

      mockBiasDetector.detectBiasesFromText.mockReturnValue(mockBiases);

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
        },
        {
          type: "recency",
          severity: 0.5,
          description: "Recency bias detected",
          evidence: ["Over-weighting recent data"],
        },
        {
          type: "framing",
          severity: 0.6,
          description: "Framing effects detected",
          evidence: ["Presentation influenced judgment"],
        },
      ];

      mockBiasDetector.detectBiasesFromText.mockReturnValue(mockBiases);

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
        },
      ];

      mockBiasDetector.detectBiasesFromText.mockReturnValue(mockBiases);

      const result = await server.executeTool("detect_bias", {
        reasoning: "Test reasoning",
      });

      expect(result.success).toBe(true);
      expect((result.data as any).detectionTime).toBeLessThan(3);
    });

    it("should not enable continuous monitoring (not supported by BiasPatternRecognizer)", async () => {
      const mockBiases: unknown[] = [];

      mockBiasDetector.detectBiasesFromText.mockReturnValue(mockBiases);

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
        },
      ];

      mockBiasDetector.detectBiasesFromText.mockReturnValue(mockBiases);

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
        },
      ];

      mockBiasDetector.detectBiasesFromText.mockReturnValue(mockBiases);

      const result = await server.executeTool("detect_bias", {
        reasoning: "Test reasoning",
      });

      expect(result.success).toBe(true);
      // Correction is now an object with suggestion, techniques, and challengeQuestions (Requirements 10.6, 10.10)
      expect((result.data as any).biases[0].correction).toBeDefined();
      expect((result.data as any).biases[0].correction.suggestion).toBeDefined();
      expect((result.data as any).biases[0].correction.techniques).toBeDefined();
    });

    it("should handle no biases detected", async () => {
      mockBiasDetector.detectBiasesFromText.mockReturnValue([]);

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
      mockBiasDetector.detectBiasesFromText.mockImplementation(() => {
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

      const result = await server.executeTool("evaluate", {
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

      const result = await server.executeTool("evaluate", {
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

      const result = await server.executeTool("evaluate", {
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

      const result = await server.executeTool("evaluate", {
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

      const result = await server.executeTool("evaluate", {
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

      const result = await server.executeTool("evaluate", {
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

      const result = await server.executeTool("evaluate", {
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

      const result = await server.executeTool("evaluate", {
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
      const result = await server.executeTool("evaluate", {
        context: "Test context",
        // Missing reasoning
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("reasoning");
    });

    it("should handle analysis errors gracefully", async () => {
      mockConfidenceAssessor.assessConfidence.mockRejectedValue(new Error("Analysis failed"));

      const result = await server.executeTool("evaluate", {
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

      const result = await server.executeTool("evaluate", {
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
      const expectedTools = ["assess_confidence", "detect_bias", "detect_emotion", "evaluate"];

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
      mockBiasDetector.detectBiasesFromText.mockReturnValue([]);

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
        { name: "evaluate", params: { reasoning: "test" } },
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
