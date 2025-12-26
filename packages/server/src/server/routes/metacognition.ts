/**
 * Metacognition Routes
 *
 * REST API endpoints for metacognitive analysis operations.
 * Requirements: 5.1, 5.2, 5.3
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { DetectedBias, ReasoningChain, ReasoningStep } from "../../bias/types.js";
import type { CognitiveCore } from "../cognitive-core.js";
import { asyncHandler, ValidationApiError } from "../middleware/error-handler.js";
import { buildSuccessResponse } from "../types/api-response.js";

/**
 * Helper to extract request ID from request
 */
function getRequestId(req: Request): string | undefined {
  return (req as Request & { requestId?: string }).requestId;
}

/**
 * Helper to parse Zod validation errors into field errors
 */
function parseZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "request";
    fieldErrors[path] = issue.message;
  }
  return fieldErrors;
}

/**
 * Reasoning step in request
 * Requirements: 5.1
 */
const reasoningStepSchema = z.object({
  id: z.string().min(1, "step id is required"),
  content: z.string().min(1, "step content is required"),
  type: z.enum(["hypothesis", "evidence", "inference", "conclusion", "assumption"]),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.array(z.string()).optional(),
});

/**
 * Reasoning chain in request
 * Requirements: 5.1
 */
const reasoningChainSchema = z.object({
  steps: z.array(reasoningStepSchema).optional(),
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
 * Zod schema for metacognition analyze request validation
 * Requirements: 5.1
 */
const metacognitionAnalyzeRequestSchema = z.object({
  reasoningChain: reasoningChainSchema,
  context: z.string().max(5000, "context must be at most 5,000 characters").optional(),
});

/**
 * Detected bias in response format
 * Requirements: 5.3
 */
interface DetectedBiasResponse {
  type: string;
  severity: "low" | "medium" | "high";
  affectedSteps: string[];
  correctionStrategies: string[];
  confidence: number;
  explanation: string;
}

/**
 * Confidence calibration in response
 * Requirements: 5.1
 */
interface ConfidenceCalibrationResponse {
  overallConfidence: number;
  evidenceQuality: number;
  reasoningCoherence: number;
  completeness: number;
  uncertaintyLevel: number;
  uncertaintyType: string;
}

/**
 * Improvement suggestion in response
 * Requirements: 5.1
 */
interface ImprovementSuggestion {
  category: string;
  description: string;
  priority: "low" | "medium" | "high";
  affectedAreas: string[];
}

/**
 * Response type for metacognition analyze endpoint
 * Requirements: 5.1
 */
interface MetacognitionAnalyzeResponse {
  qualityScore: number;
  biasesDetected: DetectedBiasResponse[];
  confidenceCalibration: ConfidenceCalibrationResponse;
  improvementSuggestions: ImprovementSuggestion[];
}

/**
 * Convert severity number to severity level
 */
function severityToLevel(severity: number): "low" | "medium" | "high" {
  if (severity >= 0.7) return "high";
  if (severity >= 0.4) return "medium";
  return "low";
}

/**
 * Get correction strategies for a bias type
 */
function getCorrectionStrategies(biasType: string): string[] {
  const strategies: Record<string, string[]> = {
    confirmation: [
      "Actively seek disconfirming evidence",
      "Consider alternative hypotheses",
      "Use structured analytical techniques",
      "Consult diverse perspectives",
    ],
    anchoring: [
      "Generate multiple independent estimates",
      "Consider the full range of possibilities",
      "Delay initial judgments",
      "Use reference class forecasting",
    ],
    availability: [
      "Seek statistical base rates",
      "Consider less memorable but relevant examples",
      "Use systematic data collection",
      "Avoid relying on recent or vivid examples",
    ],
    recency: [
      "Weight historical data appropriately",
      "Consider long-term trends",
      "Use time-weighted analysis",
      "Document and review past decisions",
    ],
    representativeness: [
      "Consider base rates and prior probabilities",
      "Avoid stereotyping",
      "Use statistical reasoning",
      "Consider sample size and variability",
    ],
    framing: [
      "Reframe the problem in multiple ways",
      "Consider both gains and losses",
      "Use neutral language",
      "Separate facts from presentation",
    ],
    sunk_cost: [
      "Focus on future costs and benefits only",
      "Set clear decision criteria in advance",
      "Consider opportunity costs",
      "Seek outside perspective",
    ],
    attribution: [
      "Consider situational factors",
      "Avoid fundamental attribution error",
      "Seek multiple explanations",
      "Use empathy and perspective-taking",
    ],
  };

  return (
    strategies[biasType] ?? [
      "Review reasoning for logical consistency",
      "Seek additional evidence",
      "Consider alternative explanations",
    ]
  );
}

/**
 * Convert detected bias to response format
 * Requirements: 5.3
 */
function convertBiasToResponse(bias: DetectedBias, steps: ReasoningStep[]): DetectedBiasResponse {
  // Find affected step IDs based on bias location
  const affectedSteps: string[] = [];

  // Use stepIndex to identify affected step
  if (bias.location.stepIndex >= 0 && bias.location.stepIndex < steps.length) {
    affectedSteps.push(steps[bias.location.stepIndex].id);
  } else if (steps.length > 0) {
    // If no specific step identified, mark all steps as potentially affected
    affectedSteps.push(...steps.map((s) => s.id));
  }

  return {
    type: bias.type,
    severity: severityToLevel(bias.severity),
    affectedSteps,
    correctionStrategies: getCorrectionStrategies(bias.type),
    confidence: bias.confidence,
    explanation: bias.explanation,
  };
}

/**
 * Generate improvement suggestions based on analysis
 * Requirements: 5.1
 */
function generateImprovementSuggestions(
  biases: DetectedBias[],
  qualityScore: number,
  confidenceCalibration: ConfidenceCalibrationResponse
): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];

  // Suggestions based on detected biases
  if (biases.length > 0) {
    const highSeverityBiases = biases.filter((b) => b.severity >= 0.7);
    if (highSeverityBiases.length > 0) {
      suggestions.push({
        category: "bias_mitigation",
        description: `Address ${highSeverityBiases.length} high-severity cognitive bias(es) detected in reasoning`,
        priority: "high",
        affectedAreas: highSeverityBiases.map((b) => b.type),
      });
    }

    const mediumSeverityBiases = biases.filter((b) => b.severity >= 0.4 && b.severity < 0.7);
    if (mediumSeverityBiases.length > 0) {
      suggestions.push({
        category: "bias_awareness",
        description: `Review ${mediumSeverityBiases.length} medium-severity bias(es) for potential impact`,
        priority: "medium",
        affectedAreas: mediumSeverityBiases.map((b) => b.type),
      });
    }
  }

  // Suggestions based on confidence calibration
  if (confidenceCalibration.evidenceQuality < 0.5) {
    suggestions.push({
      category: "evidence_quality",
      description: "Strengthen evidence base with additional supporting data or sources",
      priority: confidenceCalibration.evidenceQuality < 0.3 ? "high" : "medium",
      affectedAreas: ["evidence", "data_quality"],
    });
  }

  if (confidenceCalibration.reasoningCoherence < 0.5) {
    suggestions.push({
      category: "reasoning_coherence",
      description: "Improve logical consistency and flow between reasoning steps",
      priority: confidenceCalibration.reasoningCoherence < 0.3 ? "high" : "medium",
      affectedAreas: ["logic", "structure"],
    });
  }

  if (confidenceCalibration.completeness < 0.5) {
    suggestions.push({
      category: "completeness",
      description: "Address gaps in reasoning by considering additional factors or perspectives",
      priority: confidenceCalibration.completeness < 0.3 ? "high" : "medium",
      affectedAreas: ["coverage", "thoroughness"],
    });
  }

  if (confidenceCalibration.uncertaintyLevel > 0.7) {
    suggestions.push({
      category: "uncertainty_reduction",
      description: "Reduce uncertainty by gathering more information or clarifying assumptions",
      priority: "high",
      affectedAreas: ["uncertainty", "assumptions"],
    });
  }

  // Overall quality suggestions
  if (qualityScore < 0.5) {
    suggestions.push({
      category: "overall_quality",
      description: "Consider restructuring the reasoning approach for improved quality",
      priority: "high",
      affectedAreas: ["methodology", "approach"],
    });
  } else if (qualityScore < 0.7) {
    suggestions.push({
      category: "quality_enhancement",
      description: "Fine-tune reasoning to achieve higher quality outcomes",
      priority: "medium",
      affectedAreas: ["refinement", "optimization"],
    });
  }

  // If no issues found, provide positive feedback
  if (suggestions.length === 0) {
    suggestions.push({
      category: "validation",
      description: "Reasoning quality is good. Consider peer review for additional validation.",
      priority: "low",
      affectedAreas: ["review", "validation"],
    });
  }

  return suggestions;
}

/**
 * Calculate overall quality score from components
 */
function calculateQualityScore(
  biases: DetectedBias[],
  confidenceCalibration: ConfidenceCalibrationResponse
): number {
  // Base score from confidence calibration components
  const calibrationScore =
    (confidenceCalibration.evidenceQuality +
      confidenceCalibration.reasoningCoherence +
      confidenceCalibration.completeness) /
    3;

  // Penalty for biases (weighted by severity)
  const biasPenalty = biases.reduce((penalty, bias) => {
    return penalty + bias.severity * 0.1; // Each bias reduces score by up to 10%
  }, 0);

  // Penalty for high uncertainty
  const uncertaintyPenalty = confidenceCalibration.uncertaintyLevel * 0.2;

  // Calculate final score (clamped to 0-1)
  const rawScore = calibrationScore - biasPenalty - uncertaintyPenalty;
  return Math.max(0, Math.min(1, rawScore));
}

/**
 * Convert request reasoning chain to internal format
 * Requirements: 5.1
 */
function convertToInternalChain(
  reasoningChain: z.infer<typeof reasoningChainSchema>
): ReasoningChain {
  type StepType = z.infer<typeof reasoningStepSchema>;
  type AssumptionType = NonNullable<z.infer<typeof reasoningChainSchema>["assumptions"]>[number];
  type InferenceType = NonNullable<z.infer<typeof reasoningChainSchema>["inferences"]>[number];

  return {
    id: `chain-${Date.now()}`,
    steps:
      reasoningChain.steps?.map((step: StepType) => ({
        id: step.id,
        content: step.content,
        type: step.type,
        confidence: step.confidence,
        evidence: step.evidence,
      })) ?? [],
    branches: [],
    evidence:
      reasoningChain.evidence?.map((e: string, idx: number) => ({
        id: `evidence-${idx}`,
        content: e,
        source: "user_provided",
      })) ?? [],
    assumptions:
      reasoningChain.assumptions?.map((a: AssumptionType) => ({
        id: a.id,
        content: a.content,
        explicit: a.explicit,
        confidence: a.confidence,
      })) ?? [],
    inferences:
      reasoningChain.inferences?.map((i: InferenceType) => ({
        id: i.id,
        content: i.content,
        premises: i.premises,
        confidence: i.confidence,
        type: i.type,
      })) ?? [],
    conclusion: reasoningChain.steps?.find((s: StepType) => s.type === "conclusion")?.content ?? "",
  };
}

/**
 * Handler for POST /api/v1/metacognition/analyze
 * Requirements: 5.1
 *
 * Analyzes a reasoning chain for quality, biases, and confidence calibration.
 * Returns quality score, detected biases, confidence calibration, and improvement suggestions.
 */
function createMetacognitionAnalyzeHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    // Validate request body
    const parseResult = metacognitionAnalyzeRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { reasoningChain, context } = parseResult.data;

    // Convert request reasoning chain to internal format
    const internalChain = convertToInternalChain(reasoningChain);

    // Detect biases in the reasoning chain
    const detectedBiases = cognitiveCore.biasDetector.detectBiases(internalChain);

    // Build reasoning context for confidence assessment
    const reasoningContext = {
      problem: {
        id: `metacog-${Date.now()}`,
        description: context ?? "Reasoning chain analysis",
        context: context ?? "",
      },
      evidence: reasoningChain.evidence ?? [],
      constraints: [],
      goals: [],
      framework: "metacognitive_analysis",
    };

    // Assess confidence
    const confidenceAssessment =
      await cognitiveCore.confidenceAssessor.assessConfidence(reasoningContext);

    // Build confidence calibration response
    const confidenceCalibration: ConfidenceCalibrationResponse = {
      overallConfidence: confidenceAssessment.overallConfidence,
      evidenceQuality: confidenceAssessment.evidenceQuality,
      reasoningCoherence: confidenceAssessment.reasoningCoherence,
      completeness: confidenceAssessment.completeness,
      uncertaintyLevel: confidenceAssessment.uncertaintyLevel,
      uncertaintyType: confidenceAssessment.uncertaintyType,
    };

    // Convert biases to response format
    const biasesDetected = detectedBiases.map((bias) =>
      convertBiasToResponse(bias, internalChain.steps ?? [])
    );

    // Calculate quality score
    const qualityScore = calculateQualityScore(detectedBiases, confidenceCalibration);

    // Generate improvement suggestions
    const improvementSuggestions = generateImprovementSuggestions(
      detectedBiases,
      qualityScore,
      confidenceCalibration
    );

    // Build response
    const responseData: MetacognitionAnalyzeResponse = {
      qualityScore,
      biasesDetected,
      confidenceCalibration,
      improvementSuggestions,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Bias definition in response
 * Requirements: 5.2
 */
interface BiasDefinition {
  type: string;
  name: string;
  description: string;
  examples: string[];
  indicators: string[];
  mitigationStrategies: string[];
}

/**
 * Bias occurrence in detection history
 * Requirements: 5.2
 */
interface BiasOccurrence {
  type: string;
  detectedAt: string;
  severity: "low" | "medium" | "high";
  context: string;
}

/**
 * Response type for biases library endpoint
 * Requirements: 5.2
 */
interface BiasLibraryResponse {
  commonBiases: BiasDefinition[];
  detectionHistory: BiasOccurrence[];
}

/**
 * Common cognitive bias definitions
 * Requirements: 5.2
 */
const COMMON_BIASES: BiasDefinition[] = [
  {
    type: "confirmation",
    name: "Confirmation Bias",
    description:
      "The tendency to search for, interpret, favor, and recall information that confirms or supports one's prior beliefs or values.",
    examples: [
      "Only reading news sources that align with your political views",
      "Remembering instances that support your hypothesis while forgetting contradicting ones",
      "Interpreting ambiguous evidence as supporting your existing beliefs",
    ],
    indicators: [
      "One-sided evidence gathering",
      "Dismissing contradictory information",
      "Selective memory of supporting facts",
    ],
    mitigationStrategies: [
      "Actively seek disconfirming evidence",
      "Consider alternative hypotheses",
      "Use structured analytical techniques",
      "Consult diverse perspectives",
    ],
  },
  {
    type: "anchoring",
    name: "Anchoring Bias",
    description:
      "The tendency to rely too heavily on the first piece of information encountered (the anchor) when making decisions.",
    examples: [
      "Being influenced by an initial price in negotiations",
      "Estimating based on an arbitrary starting point",
      "First impressions dominating subsequent judgments",
    ],
    indicators: [
      "Heavy reliance on initial information",
      "Insufficient adjustment from starting point",
      "Resistance to updating estimates",
    ],
    mitigationStrategies: [
      "Generate multiple independent estimates",
      "Consider the full range of possibilities",
      "Delay initial judgments",
      "Use reference class forecasting",
    ],
  },
  {
    type: "availability",
    name: "Availability Heuristic",
    description:
      "The tendency to overestimate the likelihood of events based on how easily examples come to mind.",
    examples: [
      "Overestimating risk of plane crashes after seeing news coverage",
      "Judging frequency based on memorable instances",
      "Recent events seeming more probable",
    ],
    indicators: [
      "Reliance on easily recalled examples",
      "Overweighting vivid or recent events",
      "Ignoring base rates",
    ],
    mitigationStrategies: [
      "Seek statistical base rates",
      "Consider less memorable but relevant examples",
      "Use systematic data collection",
      "Avoid relying on recent or vivid examples",
    ],
  },
  {
    type: "recency",
    name: "Recency Bias",
    description:
      "The tendency to weight recent events more heavily than earlier events in decision-making.",
    examples: [
      "Judging performance based only on recent results",
      "Overreacting to recent market movements",
      "Forgetting long-term patterns in favor of recent trends",
    ],
    indicators: [
      "Overemphasis on recent data",
      "Ignoring historical patterns",
      "Short-term focus in analysis",
    ],
    mitigationStrategies: [
      "Weight historical data appropriately",
      "Consider long-term trends",
      "Use time-weighted analysis",
      "Document and review past decisions",
    ],
  },
  {
    type: "representativeness",
    name: "Representativeness Heuristic",
    description:
      "The tendency to judge probability based on how similar something is to a prototype, ignoring base rates.",
    examples: [
      "Assuming someone is a librarian because they are quiet and bookish",
      "Expecting random sequences to look random",
      "Ignoring sample size in probability judgments",
    ],
    indicators: [
      "Stereotyping based on surface features",
      "Ignoring prior probabilities",
      "Expecting patterns in random data",
    ],
    mitigationStrategies: [
      "Consider base rates and prior probabilities",
      "Avoid stereotyping",
      "Use statistical reasoning",
      "Consider sample size and variability",
    ],
  },
  {
    type: "framing",
    name: "Framing Effect",
    description:
      "The tendency to draw different conclusions from the same information depending on how it is presented.",
    examples: [
      "Preferring '90% fat-free' over '10% fat'",
      "Risk preferences changing based on gain vs loss framing",
      "Different reactions to equivalent statistics",
    ],
    indicators: [
      "Sensitivity to presentation format",
      "Inconsistent preferences across framings",
      "Emotional response to framing",
    ],
    mitigationStrategies: [
      "Reframe the problem in multiple ways",
      "Consider both gains and losses",
      "Use neutral language",
      "Separate facts from presentation",
    ],
  },
  {
    type: "sunk_cost",
    name: "Sunk Cost Fallacy",
    description:
      "The tendency to continue investing in something because of previously invested resources rather than future value.",
    examples: [
      "Continuing a failing project because of past investment",
      "Staying in a bad situation because of time already spent",
      "Refusing to abandon a losing strategy",
    ],
    indicators: [
      "Justifying decisions by past investment",
      "Reluctance to abandon failing efforts",
      "Escalation of commitment",
    ],
    mitigationStrategies: [
      "Focus on future costs and benefits only",
      "Set clear decision criteria in advance",
      "Consider opportunity costs",
      "Seek outside perspective",
    ],
  },
  {
    type: "attribution",
    name: "Attribution Bias",
    description:
      "The tendency to attribute others' behavior to their character while attributing own behavior to circumstances.",
    examples: [
      "Blaming others' failures on laziness while excusing own failures",
      "Attributing success to skill but failure to bad luck",
      "Judging others more harshly than oneself",
    ],
    indicators: [
      "Asymmetric explanations for self vs others",
      "Dispositional attributions for others",
      "Situational attributions for self",
    ],
    mitigationStrategies: [
      "Consider situational factors",
      "Avoid fundamental attribution error",
      "Seek multiple explanations",
      "Use empathy and perspective-taking",
    ],
  },
];

// In-memory detection history (for demonstration - in production would be persisted)
const detectionHistory: BiasOccurrence[] = [];

/**
 * Add a bias occurrence to detection history
 */
export function recordBiasOccurrence(
  type: string,
  severity: "low" | "medium" | "high",
  context: string
): void {
  detectionHistory.push({
    type,
    detectedAt: new Date().toISOString(),
    severity,
    context,
  });

  // Keep only last 100 occurrences
  if (detectionHistory.length > 100) {
    detectionHistory.shift();
  }
}

/**
 * Handler for GET /api/v1/metacognition/biases
 * Requirements: 5.2
 *
 * Returns common bias definitions and detection history.
 */
function createBiasesLibraryHandler(): (
  req: Request,
  res: Response,
  next: import("express").NextFunction
) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    // Build response
    const responseData: BiasLibraryResponse = {
      commonBiases: COMMON_BIASES,
      detectionHistory: [...detectionHistory].reverse(), // Most recent first
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Create metacognition routes
 *
 * @param cognitiveCore - Shared cognitive core instance
 * @returns Express router with metacognition endpoints
 */
export function createMetacognitionRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // POST /api/v1/metacognition/analyze - Analyze reasoning
  // Requirements: 5.1
  router.post("/analyze", createMetacognitionAnalyzeHandler(cognitiveCore));

  // GET /api/v1/metacognition/biases - Get bias definitions
  // Requirements: 5.2
  router.get("/biases", createBiasesLibraryHandler());

  return router;
}

// Export types for testing
export type {
  BiasDefinition,
  BiasLibraryResponse,
  BiasOccurrence,
  ConfidenceCalibrationResponse,
  DetectedBiasResponse,
  ImprovementSuggestion,
  MetacognitionAnalyzeResponse,
};
