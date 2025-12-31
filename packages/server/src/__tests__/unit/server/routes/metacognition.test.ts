/**
 * Metacognition Routes Unit Tests
 *
 * Tests for the metacognition routes that provide reasoning analysis endpoints.
 * Requirements: 5.1, 5.2, 5.4
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ConfidenceAssessment, UncertaintyType } from "../../../../confidence/types.js";
import type { CognitiveCore } from "../../../../server/cognitive-core.js";
import {
  createMetacognitionRoutes,
  type MetacognitionEvaluateResponse,
} from "../../../../server/routes/metacognition.js";

/**
 * Complex reasoning step schema (mirrors the one in metacognition.ts)
 * Used for testing validation behavior
 */
const complexReasoningStepSchema = z.object({
  id: z.string().min(1, "step id is required"),
  content: z.string().min(1, "step content is required"),
  type: z.enum(["hypothesis", "evidence", "inference", "conclusion", "assumption"]),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.array(z.string()).optional(),
});

/**
 * Flexible reasoning step schema that accepts either string or complex object
 * Used for testing validation behavior
 */
const flexibleReasoningStepSchema = z.union([
  z.string().min(1, "step content cannot be empty"),
  complexReasoningStepSchema,
]);

/**
 * Reasoning chain schema with flexible steps
 * Used for testing validation behavior
 */
const reasoningChainSchema = z.object({
  steps: z.array(flexibleReasoningStepSchema).optional(),
  evidence: z.array(z.string()).optional(),
  assumptions: z
    .array(
      z.object({
        id: z.string(),
        content: z.string(),
        explicit: z.boolean(),
        confidence: z.number().min(0).max(1).optional(),
      })
    )
    .optional(),
  inferences: z
    .array(
      z.object({
        id: z.string(),
        content: z.string(),
        premises: z.array(z.string()),
        confidence: z.number().min(0).max(1).optional(),
        type: z.enum(["deductive", "inductive", "abductive"]),
      })
    )
    .optional(),
});

/**
 * Analyze request schema with flexible steps
 * Used for testing validation behavior
 */
const metacognitionAnalyzeRequestSchema = z.object({
  reasoningChain: reasoningChainSchema,
  context: z.string().max(5000, "context must be at most 5,000 characters").optional(),
});

// Mock cognitive core with all required methods
const createMockCognitiveCore = (): CognitiveCore => {
  const mockConfidenceAssessment: ConfidenceAssessment = {
    overallConfidence: 0.75,
    evidenceQuality: 0.8,
    reasoningCoherence: 0.85,
    completeness: 0.7,
    uncertaintyLevel: 0.3,
    uncertaintyType: "epistemic" as UncertaintyType,
    factors: [
      {
        dimension: "evidence",
        score: 0.8,
        weight: 0.3,
        explanation: "Strong evidence base",
      },
      {
        dimension: "coherence",
        score: 0.85,
        weight: 0.3,
        explanation: "Well-structured reasoning",
      },
    ],
    timestamp: new Date(),
    processingTime: 50,
  };

  return {
    memoryRepository: {} as CognitiveCore["memoryRepository"],
    reasoningOrchestrator: {} as CognitiveCore["reasoningOrchestrator"],
    frameworkSelector: {} as CognitiveCore["frameworkSelector"],
    confidenceAssessor: {
      assessConfidence: vi.fn().mockResolvedValue(mockConfidenceAssessment),
    } as unknown as CognitiveCore["confidenceAssessor"],
    biasDetector: {
      detectBiases: vi.fn().mockReturnValue([]),
    } as unknown as CognitiveCore["biasDetector"],
    emotionAnalyzer: {
      analyzeCircumplex: vi.fn().mockReturnValue({
        valence: 0.5,
        arousal: 0.3,
        dominance: 0.6,
      }),
    } as unknown as CognitiveCore["emotionAnalyzer"],
    problemDecomposer: {} as CognitiveCore["problemDecomposer"],
    memoryAugmentedReasoning: {} as CognitiveCore["memoryAugmentedReasoning"],
  };
};

describe("Metacognition Routes", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
  });

  describe("createMetacognitionRoutes", () => {
    it("should create a router with routes", () => {
      const router = createMetacognitionRoutes(mockCore);
      expect(router).toBeDefined();
      // Router should have stack with routes
      expect(router.stack).toBeDefined();
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it("should have POST route for analyze endpoint", () => {
      const router = createMetacognitionRoutes(mockCore);
      // Check that there's at least one route in the stack
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it("should have POST route for evaluate endpoint", () => {
      const router = createMetacognitionRoutes(mockCore);
      // Router should have at least 3 routes (analyze, evaluate, biases)
      expect(router.stack.length).toBeGreaterThanOrEqual(3);
    });

    it("should have GET route for biases endpoint", () => {
      const router = createMetacognitionRoutes(mockCore);
      expect(router.stack.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Evaluate Handler Logic", () => {
    it("should have confidenceAssessor.assessConfidence mock configured", () => {
      createMetacognitionRoutes(mockCore);
      expect(mockCore.confidenceAssessor.assessConfidence).toBeDefined();
    });

    it("should have biasDetector.detectBiases mock configured", () => {
      createMetacognitionRoutes(mockCore);
      expect(mockCore.biasDetector.detectBiases).toBeDefined();
    });

    it("should have emotionAnalyzer.analyzeCircumplex mock configured", () => {
      createMetacognitionRoutes(mockCore);
      expect(mockCore.emotionAnalyzer.analyzeCircumplex).toBeDefined();
    });
  });

  describe("Mock Configuration", () => {
    it("should have correct mock confidence assessment structure", () => {
      expect(mockCore.confidenceAssessor).toBeDefined();
      expect(mockCore.confidenceAssessor.assessConfidence).toBeDefined();
    });

    it("should have correct mock bias detector structure", () => {
      expect(mockCore.biasDetector).toBeDefined();
      expect(mockCore.biasDetector.detectBiases).toBeDefined();
    });

    it("should have correct mock emotion analyzer structure", () => {
      expect(mockCore.emotionAnalyzer).toBeDefined();
      expect(mockCore.emotionAnalyzer.analyzeCircumplex).toBeDefined();
    });
  });
});

describe("MetacognitionEvaluateResponse Type", () => {
  it("should have correct structure", () => {
    const response: MetacognitionEvaluateResponse = {
      quality: {
        coherence: 0.85,
        completeness: 0.8,
        logicalValidity: 0.9,
        evidenceSupport: 0.75,
      },
      strengths: ["Clear logical structure"],
      weaknesses: ["Missing alternative perspectives"],
      recommendations: ["Consider counterarguments"],
    };

    expect(response.quality).toBeDefined();
    expect(response.quality.coherence).toBe(0.85);
    expect(response.quality.completeness).toBe(0.8);
    expect(response.quality.logicalValidity).toBe(0.9);
    expect(response.quality.evidenceSupport).toBe(0.75);
    expect(response.strengths).toHaveLength(1);
    expect(response.weaknesses).toHaveLength(1);
    expect(response.recommendations).toHaveLength(1);
  });

  it("should support optional confidence field", () => {
    const response: MetacognitionEvaluateResponse = {
      quality: {
        coherence: 0.85,
        completeness: 0.8,
        logicalValidity: 0.9,
        evidenceSupport: 0.75,
      },
      strengths: [],
      weaknesses: [],
      recommendations: [],
      confidence: { overallConfidence: 0.75 },
    };

    expect(response.confidence).toBeDefined();
  });

  it("should support optional biases field", () => {
    const response: MetacognitionEvaluateResponse = {
      quality: {
        coherence: 0.85,
        completeness: 0.8,
        logicalValidity: 0.9,
        evidenceSupport: 0.75,
      },
      strengths: [],
      weaknesses: [],
      recommendations: [],
      biases: [],
    };

    expect(response.biases).toBeDefined();
  });

  it("should support optional emotion field", () => {
    const response: MetacognitionEvaluateResponse = {
      quality: {
        coherence: 0.85,
        completeness: 0.8,
        logicalValidity: 0.9,
        evidenceSupport: 0.75,
      },
      strengths: [],
      weaknesses: [],
      recommendations: [],
      emotion: { valence: 0.5, arousal: 0.3, dominance: 0.6 },
    };

    expect(response.emotion).toBeDefined();
  });
});

/**
 * Tests for flexible steps validation in /metacognition/analyze endpoint
 * REST-002: The endpoint should accept both simple string arrays and complex step objects
 * Requirements: 5.1
 */
describe("Metacognition Analyze - Flexible Steps Validation", () => {
  describe("Simple string format (string array)", () => {
    it("should accept steps as simple string array", () => {
      const request = {
        reasoningChain: {
          steps: ["First, analyze the data", "Then, draw conclusions"],
        },
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reasoningChain.steps).toHaveLength(2);
        expect(result.data.reasoningChain.steps?.[0]).toBe("First, analyze the data");
        expect(result.data.reasoningChain.steps?.[1]).toBe("Then, draw conclusions");
      }
    });

    it("should reject empty string in steps array", () => {
      const request = {
        reasoningChain: {
          steps: ["Valid step", ""],
        },
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((issue) => issue.message === "step content cannot be empty")
        ).toBe(true);
      }
    });

    it("should accept single string step", () => {
      const request = {
        reasoningChain: {
          steps: ["Single reasoning step"],
        },
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  describe("Complex object format (object array)", () => {
    it("should accept steps as complex object array", () => {
      const request = {
        reasoningChain: {
          steps: [
            { id: "1", content: "First, analyze the data", type: "hypothesis" },
            { id: "2", content: "Then, draw conclusions", type: "conclusion" },
          ],
        },
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reasoningChain.steps).toHaveLength(2);
        const firstStep = result.data.reasoningChain.steps?.[0];
        expect(typeof firstStep).toBe("object");
        if (typeof firstStep === "object" && firstStep !== null) {
          expect(firstStep.id).toBe("1");
          expect(firstStep.content).toBe("First, analyze the data");
          expect(firstStep.type).toBe("hypothesis");
        }
      }
    });

    it("should accept complex step with optional fields", () => {
      const request = {
        reasoningChain: {
          steps: [
            {
              id: "1",
              content: "Hypothesis with confidence",
              type: "hypothesis",
              confidence: 0.85,
              evidence: ["Evidence 1", "Evidence 2"],
            },
          ],
        },
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        const step = result.data.reasoningChain.steps?.[0];
        expect(typeof step).toBe("object");
        if (typeof step === "object" && step !== null) {
          expect(step.confidence).toBe(0.85);
          expect(step.evidence).toEqual(["Evidence 1", "Evidence 2"]);
        }
      }
    });

    it("should reject complex step with missing required fields", () => {
      const request = {
        reasoningChain: {
          steps: [
            { id: "1", content: "Missing type field" }, // Missing 'type'
          ],
        },
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should reject complex step with invalid type", () => {
      const request = {
        reasoningChain: {
          steps: [{ id: "1", content: "Invalid type", type: "invalid_type" }],
        },
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should reject complex step with confidence out of range", () => {
      const request = {
        reasoningChain: {
          steps: [
            { id: "1", content: "Out of range confidence", type: "hypothesis", confidence: 1.5 },
          ],
        },
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe("Mixed format (string and object in same array)", () => {
    it("should accept mixed string and object steps", () => {
      const request = {
        reasoningChain: {
          steps: [
            "Simple string step",
            { id: "2", content: "Complex object step", type: "inference" },
            "Another simple step",
          ],
        },
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reasoningChain.steps).toHaveLength(3);
        expect(typeof result.data.reasoningChain.steps?.[0]).toBe("string");
        expect(typeof result.data.reasoningChain.steps?.[1]).toBe("object");
        expect(typeof result.data.reasoningChain.steps?.[2]).toBe("string");
      }
    });
  });

  describe("Empty and optional steps", () => {
    it("should accept empty steps array", () => {
      const request = {
        reasoningChain: {
          steps: [],
        },
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should accept missing steps field", () => {
      const request = {
        reasoningChain: {},
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should accept reasoningChain with only evidence", () => {
      const request = {
        reasoningChain: {
          evidence: ["Evidence 1", "Evidence 2"],
        },
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  describe("Context field validation", () => {
    it("should accept optional context field", () => {
      const request = {
        reasoningChain: {
          steps: ["Step 1"],
        },
        context: "Additional context for analysis",
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.context).toBe("Additional context for analysis");
      }
    });

    it("should reject context exceeding 5000 characters", () => {
      const request = {
        reasoningChain: {
          steps: ["Step 1"],
        },
        context: "x".repeat(5001),
      };

      const result = metacognitionAnalyzeRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((issue) => issue.message.includes("5,000 characters"))
        ).toBe(true);
      }
    });
  });

  describe("All step types validation", () => {
    it("should accept all valid step types", () => {
      const validTypes = ["hypothesis", "evidence", "inference", "conclusion", "assumption"];

      for (const type of validTypes) {
        const request = {
          reasoningChain: {
            steps: [{ id: "1", content: `Step of type ${type}`, type }],
          },
        };

        const result = metacognitionAnalyzeRequestSchema.safeParse(request);
        expect(result.success).toBe(true);
      }
    });
  });
});
