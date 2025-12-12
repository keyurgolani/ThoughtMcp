/**
 * Emotion Routes
 *
 * REST API endpoints for emotion detection operations.
 * Requirements: 8.1, 8.2, 8.3
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { DiscreteEmotionClassifier } from "../../emotion/discrete-emotion-classifier.js";
import type { EmotionClassification, EmotionType } from "../../emotion/types.js";
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
 * Zod schema for emotion detect request validation
 * Requirements: 8.1, 8.3
 */
const emotionDetectRequestSchema = z.object({
  text: z
    .string()
    .min(1, "text is required")
    .max(100000, "text must be at most 100,000 characters"),
  context: z.string().max(5000, "context must be at most 5,000 characters").optional(),
  includeDiscrete: z.boolean().optional().default(true),
});

/**
 * Circumplex values in response
 * Requirements: 8.1
 */
interface CircumplexResponse {
  /** Emotional positivity/negativity (-1 to +1) */
  valence: number;
  /** Emotional intensity/activation (-1 to +1) */
  arousal: number;
  /** Sense of control/power (-1 to +1) */
  dominance: number;
}

/**
 * Discrete emotion in response
 * Requirements: 8.2
 */
interface DiscreteEmotionResponse {
  /** Emotion type */
  emotion: EmotionType;
  /** Confidence score (0 to 1) */
  confidence: number;
  /** Intensity rating (0 to 1) */
  intensity: number;
}

/**
 * Response type for emotion detect endpoint
 * Requirements: 8.1, 8.2
 */
interface EmotionDetectResponse {
  /** Circumplex model values */
  circumplex: CircumplexResponse;
  /** Discrete emotion classifications */
  discrete: DiscreteEmotionResponse[];
}

/**
 * All 11 supported emotion types
 * Requirements: 8.2
 */
const ALL_EMOTION_TYPES: EmotionType[] = [
  "joy",
  "sadness",
  "anger",
  "fear",
  "disgust",
  "surprise",
  "pride",
  "shame",
  "guilt",
  "gratitude",
  "awe",
];

/**
 * Convert emotion classifications to response format with all 11 emotions
 * Requirements: 8.2
 */
function convertToDiscreteResponse(
  classifications: EmotionClassification[]
): DiscreteEmotionResponse[] {
  // Create a map of detected emotions
  const detectedMap = new Map<EmotionType, EmotionClassification>();
  for (const classification of classifications) {
    detectedMap.set(classification.emotion, classification);
  }

  // Return all 11 emotions with their scores (0 if not detected)
  return ALL_EMOTION_TYPES.map((emotion) => {
    const detected = detectedMap.get(emotion);
    return {
      emotion,
      confidence: detected?.confidence ?? 0,
      intensity: detected?.intensity ?? 0,
    };
  });
}

/**
 * Handler for POST /api/v1/emotion/detect
 * Requirements: 8.1, 8.2, 8.3
 *
 * Detects emotions in text using Circumplex model and discrete emotion classification.
 * Returns valence, arousal, dominance values and discrete emotion classifications.
 */
function createEmotionDetectHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  // Create discrete classifier instance (reused across requests)
  const discreteClassifier = new DiscreteEmotionClassifier({
    name: "lexicon-based",
    version: "1.0.0",
  });

  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    // Validate request body
    const parseResult = emotionDetectRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { text, context, includeDiscrete } = parseResult.data;

    // Analyze text with Circumplex model
    // Context parameter is used to improve accuracy by providing additional context
    // The CircumplexEmotionAnalyzer uses the text directly; context can be prepended
    // for improved accuracy when provided
    const textToAnalyze = context ? `${context}: ${text}` : text;
    const circumplexState = cognitiveCore.emotionAnalyzer.analyzeCircumplex(textToAnalyze);

    // Build circumplex response
    const circumplex: CircumplexResponse = {
      valence: circumplexState.valence,
      arousal: circumplexState.arousal,
      dominance: circumplexState.dominance,
    };

    // Get discrete emotion classifications if requested
    let discrete: DiscreteEmotionResponse[] = [];
    if (includeDiscrete) {
      const classifications = discreteClassifier.classify(textToAnalyze);
      discrete = convertToDiscreteResponse(classifications);
    }

    // Build response
    const responseData: EmotionDetectResponse = {
      circumplex,
      discrete,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Create emotion routes
 *
 * @param cognitiveCore - Shared cognitive core instance
 * @returns Express router with emotion endpoints
 */
export function createEmotionRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // POST /api/v1/emotion/detect - Detect emotions in text
  // Requirements: 8.1, 8.2, 8.3
  router.post("/detect", createEmotionDetectHandler(cognitiveCore));

  return router;
}

// Export types for testing
export type { CircumplexResponse, DiscreteEmotionResponse, EmotionDetectResponse };
