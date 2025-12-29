/**
 * Reasoning Routes
 *
 * REST API endpoints for thinking and reasoning operations.
 * Requirements: 3.1, 3.2, 3.3, 4.1, 4.4
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { ConfidenceAssessment } from "../../confidence/types.js";
import type { StreamCoordinationManager } from "../../reasoning/coordination-manager.js";
import { StreamManager } from "../../reasoning/stream-manager.js";
import type { ReasoningStream } from "../../reasoning/stream.types.js";
import { AnalyticalReasoningStream } from "../../reasoning/streams/analytical-stream.js";
import { CreativeReasoningStream } from "../../reasoning/streams/creative-stream.js";
import { CriticalReasoningStream } from "../../reasoning/streams/critical-stream.js";
import { SyntheticReasoningStream } from "../../reasoning/streams/synthetic-stream.js";
import type {
  AttributedInsight,
  Conflict,
  Problem,
  ReasoningContext,
  StreamType,
  SynthesizedResult,
} from "../../reasoning/types.js";
import type { CognitiveCore } from "../cognitive-core.js";
import { NotFoundError, ValidationApiError, asyncHandler } from "../middleware/error-handler.js";
import { buildSuccessResponse } from "../types/api-response.js";

/**
 * Think session status
 * Requirements: 3.2
 */
export type ThinkSessionStatus = "processing" | "complete" | "error";

/**
 * Think session data structure
 * Requirements: 3.2
 */
export interface ThinkSession {
  sessionId: string;
  status: ThinkSessionStatus;
  progress: number;
  currentStage: string;
  activeStreams: string[];
  mode: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * In-memory store for think sessions
 * Requirements: 3.2
 */
export class ThinkSessionStore {
  private sessions: Map<string, ThinkSession> = new Map();

  /**
   * Create a new think session
   */
  createSession(mode: string, activeStreams: string[]): ThinkSession {
    const sessionId = `think-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const session: ThinkSession = {
      sessionId,
      status: "processing",
      progress: 0,
      currentStage: "initializing",
      activeStreams,
      mode,
      startedAt: new Date(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): ThinkSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update a session
   */
  updateSession(sessionId: string, updates: Partial<ThinkSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      if (updates.status === "complete" || updates.status === "error") {
        session.completedAt = new Date();
      }
    }
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Cleanup old sessions
   */
  cleanupOldSessions(maxAgeMs: number): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      if (now - session.startedAt.getTime() > maxAgeMs) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Global session store instance
const thinkSessionStore = new ThinkSessionStore();

/**
 * Valid thinking modes for the think endpoint
 * Requirements: 3.1
 */
const VALID_MODES = ["intuitive", "deliberative", "balanced", "creative", "analytical"] as const;
type ThinkMode = (typeof VALID_MODES)[number];

/**
 * Zod schema for think request validation
 * Requirements: 3.1, 3.3
 *
 * Note: Uses 'problem' field to align with MCP tool naming convention.
 * The 'problem' field represents the question or problem to reason about.
 */
const thinkRequestSchema = z.object({
  problem: z
    .string()
    .min(1, "problem is required")
    .max(10000, "problem must be at most 10,000 characters"),
  mode: z.enum(VALID_MODES, {
    errorMap: () => ({
      message: `mode must be one of: ${VALID_MODES.join(", ")}`,
    }),
  }),
  context: z.string().max(5000, "context must be at most 5,000 characters").optional(),
  userId: z.string().min(1, "userId must be non-empty if provided").optional(),
});

/**
 * Metacognitive assessment in think response
 * Requirements: 3.1
 */
interface MetacognitiveAssessmentResponse {
  overallConfidence: number;
  evidenceQuality: number;
  reasoningCoherence: number;
  completeness: number;
  uncertaintyLevel: number;
  uncertaintyType: string;
  factors: Array<{
    dimension: string;
    score: number;
    weight: number;
    explanation: string;
  }>;
}

/**
 * Thought item in think response
 * Requirements: 3.1
 */
interface ThoughtItem {
  content: string;
  sources: string[];
  confidence: number;
  importance: number;
}

/**
 * Memory used in reasoning response
 * Requirements: 3.1
 */
interface MemoryUsedResponse {
  id: string;
  content: string;
  primarySector: string;
  relevance: number;
}

/**
 * Response type for think endpoint
 * Requirements: 3.1
 */
interface ThinkResponse {
  thoughts: ThoughtItem[];
  confidence: number;
  modeUsed: ThinkMode;
  processingTimeMs: number;
  metacognitiveAssessment: MetacognitiveAssessmentResponse;
  conclusion: string;
  recommendations: Array<{
    description: string;
    priority: number;
    confidence: number;
  }>;
  memoriesUsed?: MemoryUsedResponse[];
}

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
 * Map think mode to stream types
 * Requirements: 3.1
 */
function getStreamsForMode(mode: ThinkMode): StreamType[] {
  switch (mode) {
    case "intuitive":
      // Fast, pattern-based thinking - creative and synthetic
      return ["creative", "synthetic"] as StreamType[];
    case "deliberative":
      // Slow, analytical thinking - analytical and critical
      return ["analytical", "critical"] as StreamType[];
    case "balanced":
      // All streams for comprehensive analysis
      return ["analytical", "creative", "critical", "synthetic"] as StreamType[];
    case "creative":
      // Focus on creative and synthetic streams
      return ["creative", "synthetic"] as StreamType[];
    case "analytical":
      // Focus on analytical and critical streams
      return ["analytical", "critical"] as StreamType[];
  }
}

/**
 * Create reasoning streams based on selected types
 */
function createStreams(streamTypes: StreamType[]): ReasoningStream[] {
  const streams: ReasoningStream[] = [];

  for (const type of streamTypes) {
    switch (type) {
      case "analytical":
        streams.push(new AnalyticalReasoningStream());
        break;
      case "creative":
        streams.push(new CreativeReasoningStream());
        break;
      case "critical":
        streams.push(new CriticalReasoningStream());
        break;
      case "synthetic":
        streams.push(new SyntheticReasoningStream());
        break;
    }
  }

  return streams;
}

/**
 * LLM timeout in milliseconds (from environment or default 60s)
 */
const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT ?? "60000", 10);

/**
 * Mode-specific thought content for fallback responses
 */
const MODE_THOUGHTS: Record<ThinkMode, string> = {
  analytical:
    "Consider breaking down the problem into smaller components and analyzing each systematically.",
  creative: "Explore unconventional approaches and consider analogies from different domains.",
  deliberative: "Take time to carefully weigh all options and consider long-term implications.",
  intuitive: "Trust initial instincts while remaining open to quick pattern recognition.",
  balanced: "Combine analytical rigor with creative exploration for a comprehensive approach.",
};

/**
 * Generate basic metacognitive assessment for fallback response
 */
function generateFallbackMetacognitiveAssessment(): MetacognitiveAssessmentResponse {
  return {
    overallConfidence: 0.3,
    evidenceQuality: 0.2,
    reasoningCoherence: 0.4,
    completeness: 0.2,
    uncertaintyLevel: 0.8,
    uncertaintyType: "epistemic",
    factors: [
      {
        dimension: "evidence",
        score: 0.2,
        weight: 0.3,
        explanation: "Limited evidence available due to timeout - using rule-based fallback",
      },
      {
        dimension: "coherence",
        score: 0.4,
        weight: 0.3,
        explanation: "Basic logical structure maintained in fallback response",
      },
      {
        dimension: "completeness",
        score: 0.2,
        weight: 0.2,
        explanation: "Incomplete analysis due to LLM timeout",
      },
      {
        dimension: "bias",
        score: 0.5,
        weight: 0.2,
        explanation: "Rule-based analysis has limited bias detection",
      },
    ],
  };
}

/**
 * Generate fallback thoughts based on problem and mode
 */
function generateFallbackThoughts(problem: Problem, mode: ThinkMode): ThoughtItem[] {
  const thoughts: ThoughtItem[] = [];
  const truncatedProblem = problem.description.substring(0, 100);
  const problemSuffix = problem.description.length > 100 ? "..." : "";

  thoughts.push({
    content: `The problem "${truncatedProblem}${problemSuffix}" requires ${mode} reasoning.`,
    sources: ["rule-based-analysis"],
    confidence: 0.3,
    importance: 0.7,
  });

  thoughts.push({
    content: MODE_THOUGHTS[mode],
    sources: ["rule-based-analysis"],
    confidence: 0.4,
    importance: 0.6,
  });

  if (problem.context) {
    const truncatedContext = problem.context.substring(0, 100);
    const contextSuffix = problem.context.length > 100 ? "..." : "";
    thoughts.push({
      content: `Consider the provided context: "${truncatedContext}${contextSuffix}"`,
      sources: ["rule-based-analysis"],
      confidence: 0.3,
      importance: 0.5,
    });
  }

  return thoughts;
}

/**
 * Generate a rule-based fallback response when LLM times out
 */
function generateRuleBasedFallbackResponse(
  problem: Problem,
  mode: ThinkMode,
  processingTimeMs: number,
  memoriesUsed?: MemoryUsedResponse[]
): ThinkResponse {
  const keyTerms = problem.description
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, 10);

  const altMode = mode === "deliberative" ? "intuitive" : "deliberative";
  const altModeDesc = mode === "deliberative" ? "faster" : "more thorough";

  const response: ThinkResponse = {
    thoughts: generateFallbackThoughts(problem, mode),
    confidence: 0.3,
    modeUsed: mode,
    processingTimeMs,
    metacognitiveAssessment: generateFallbackMetacognitiveAssessment(),
    conclusion: `Due to processing constraints, a complete ${mode} analysis could not be performed. The problem involves: ${keyTerms.join(", ")}. Consider retrying with a simpler query or using a different reasoning mode.`,
    recommendations: [
      {
        description: "Retry with a more specific or simpler problem statement",
        priority: 1,
        confidence: 0.6,
      },
      {
        description: `Try using "${altMode}" mode for ${altModeDesc} analysis`,
        priority: 2,
        confidence: 0.5,
      },
      {
        description: "Break down the problem into smaller sub-problems",
        priority: 3,
        confidence: 0.5,
      },
    ],
  };

  if (memoriesUsed && memoriesUsed.length > 0) {
    response.memoriesUsed = memoriesUsed;
  }

  return response;
}

/**
 * Convert synthesized result to think response format
 */
function convertToThinkResponse(
  result: SynthesizedResult,
  mode: ThinkMode,
  processingTimeMs: number,
  metacognitiveAssessment: ConfidenceAssessment,
  memoriesUsed?: MemoryUsedResponse[]
): ThinkResponse {
  // Convert insights to thoughts
  const thoughts: ThoughtItem[] = result.insights.map((insight: AttributedInsight) => ({
    content: insight.content,
    sources: insight.sources,
    confidence: insight.confidence,
    importance: insight.importance,
  }));

  // Convert metacognitive assessment
  const metacognitiveResponse: MetacognitiveAssessmentResponse = {
    overallConfidence: metacognitiveAssessment.overallConfidence,
    evidenceQuality: metacognitiveAssessment.evidenceQuality,
    reasoningCoherence: metacognitiveAssessment.reasoningCoherence,
    completeness: metacognitiveAssessment.completeness,
    uncertaintyLevel: metacognitiveAssessment.uncertaintyLevel,
    uncertaintyType: metacognitiveAssessment.uncertaintyType,
    factors: metacognitiveAssessment.factors.map((factor) => ({
      dimension: factor.dimension,
      score: factor.score,
      weight: factor.weight,
      explanation: factor.explanation,
    })),
  };

  // Convert recommendations
  const recommendations = result.recommendations.map((rec) => ({
    description: rec.description,
    priority: rec.priority,
    confidence: rec.confidence,
  }));

  const response: ThinkResponse = {
    thoughts,
    confidence: result.confidence,
    modeUsed: mode,
    processingTimeMs,
    metacognitiveAssessment: metacognitiveResponse,
    conclusion: result.conclusion,
    recommendations,
  };

  // Include memories used if available
  if (memoriesUsed && memoriesUsed.length > 0) {
    response.memoriesUsed = memoriesUsed;
  }

  return response;
}

/**
 * Build problem context from user input and memory augmentation
 */
async function buildProblemContextForThink(
  cognitiveCore: CognitiveCore,
  problemInput: string,
  context: string | undefined,
  userId: string | undefined
): Promise<{
  problemDescription: string;
  problemContext: string;
  memoriesUsed: MemoryUsedResponse[];
}> {
  let problemDescription = problemInput;
  let problemContext = "";
  let memoriesUsed: MemoryUsedResponse[] = [];

  if (userId && context) {
    problemContext = context;
  } else if (userId) {
    const augmentedContext = await cognitiveCore.memoryAugmentedReasoning.augmentProblemContext(
      problemInput,
      userId
    );
    if (augmentedContext.hasMemoryContext) {
      problemDescription = augmentedContext.augmentedProblem;
      problemContext = augmentedContext.memoryBackground;
      memoriesUsed = augmentedContext.memoriesUsed.map((mem) => ({
        id: mem.id,
        content: mem.content,
        primarySector: mem.primarySector,
        relevance: mem.relevanceScore,
      }));
    }
  } else if (context) {
    problemContext = context;
  }

  return { problemDescription, problemContext, memoriesUsed };
}

/**
 * Options for creating fallback response with metadata
 */
interface FallbackResponseOptions {
  problem: Problem;
  mode: ThinkMode;
  processingTimeMs: number;
  memoriesUsed: MemoryUsedResponse[];
  reason: string;
  suggestion: string;
}

/**
 * Create fallback response with metadata
 */
function createFallbackResponseWithMeta(options: FallbackResponseOptions): ThinkResponse & {
  _meta: { fallbackUsed: boolean; reason: string; suggestion: string; timeoutMs?: number };
} {
  const { problem, mode, processingTimeMs, memoriesUsed, reason, suggestion } = options;
  const fallbackResponse = generateRuleBasedFallbackResponse(
    problem,
    mode,
    processingTimeMs,
    memoriesUsed.length > 0 ? memoriesUsed : undefined
  );

  return {
    ...fallbackResponse,
    _meta: {
      fallbackUsed: true,
      reason,
      suggestion,
      ...(reason === "LLM timeout" ? { timeoutMs: LLM_TIMEOUT_MS } : {}),
    },
  };
}

/**
 * Execute reasoning with timeout protection
 */
async function executeReasoningWithTimeout(
  cognitiveCore: CognitiveCore,
  problem: Problem,
  streams: ReasoningStream[],
  effectiveTimeout: number
): Promise<SynthesizedResult> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`LLM timeout after ${LLM_TIMEOUT_MS}ms`));
    }, LLM_TIMEOUT_MS);
  });

  return Promise.race([
    cognitiveCore.reasoningOrchestrator.executeStreams(problem, streams, effectiveTimeout),
    timeoutPromise,
  ]);
}

/**
 * Handler for POST /api/v1/think
 * Requirements: 3.1, 3.3
 *
 * Initiates reasoning with the specified mode and returns thoughts,
 * confidence, mode used, processing time, and metacognitive assessment.
 * Includes timeout handling with fallback to rule-based analysis.
 */
function createThinkHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    const parseResult = thinkRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { problem: problemInput, mode, context, userId } = parseResult.data;

    const { problemDescription, problemContext, memoriesUsed } = await buildProblemContextForThink(
      cognitiveCore,
      problemInput,
      context,
      userId
    );

    const problemObj: Problem = {
      id: `think-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      description: problemDescription,
      context: problemContext,
      complexity:
        mode === "deliberative" ? "complex" : mode === "intuitive" ? "simple" : "moderate",
    };

    const streamTypes = getStreamsForMode(mode);
    const streams = createStreams(streamTypes);
    const streamTimeout = mode === "intuitive" ? 10000 : 30000;
    const effectiveTimeout = Math.min(streamTimeout, LLM_TIMEOUT_MS);

    let synthesizedResult: SynthesizedResult;

    try {
      synthesizedResult = await executeReasoningWithTimeout(
        cognitiveCore,
        problemObj,
        streams,
        effectiveTimeout
      );
    } catch (error) {
      const isTimeout =
        error instanceof Error &&
        (error.message.includes("timeout") || error.message.includes("timed out"));

      if (isTimeout) {
        const processingTimeMs = Date.now() - startTime;
        const responseWithTimeout = createFallbackResponseWithMeta({
          problem: problemObj,
          mode,
          processingTimeMs,
          memoriesUsed,
          reason: "LLM timeout",
          suggestion:
            "The reasoning service took too long to respond. A rule-based fallback analysis was provided instead.",
        });
        res.status(200).json(buildSuccessResponse(responseWithTimeout, { requestId, startTime }));
        return;
      }
      throw error;
    }

    const allStreamsFailed =
      synthesizedResult.insights.length === 0 && synthesizedResult.confidence === 0;

    if (allStreamsFailed) {
      const processingTimeMs = Date.now() - startTime;
      const responseWithTimeout = createFallbackResponseWithMeta({
        problem: problemObj,
        mode,
        processingTimeMs,
        memoriesUsed,
        reason: "All reasoning streams failed or timed out",
        suggestion:
          "The reasoning streams could not produce results. A rule-based fallback analysis was provided instead.",
      });
      res.status(200).json(buildSuccessResponse(responseWithTimeout, { requestId, startTime }));
      return;
    }

    const reasoningContext: ReasoningContext = {
      problem: problemObj,
      evidence: synthesizedResult.insights.map((i) => i.content),
      constraints: problemObj.constraints ?? [],
      goals: problemObj.goals ?? [],
      framework: mode,
    };

    const metacognitiveAssessment =
      await cognitiveCore.confidenceAssessor.assessConfidence(reasoningContext);
    const processingTimeMs = Date.now() - startTime;

    const responseData = convertToThinkResponse(
      synthesizedResult,
      mode,
      processingTimeMs,
      metacognitiveAssessment,
      memoriesUsed.length > 0 ? memoriesUsed : undefined
    );

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Response type for think status endpoint
 * Requirements: 3.2
 */
interface ThinkStatusResponse {
  status: ThinkSessionStatus;
  progress: number;
  currentStage: string;
  activeStreams?: string[];
}

/**
 * Handler for GET /api/v1/think/status/:sessionId
 * Requirements: 3.2
 *
 * Returns current processing status, progress percentage, current stage,
 * and active streams for a think session.
 */
function createThinkStatusHandler(): (
  req: Request,
  res: Response,
  next: import("express").NextFunction
) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = getRequestId(req);
    const startTime = Date.now();
    const { sessionId } = req.params;

    // Validate sessionId parameter
    if (!sessionId || typeof sessionId !== "string" || sessionId.trim() === "") {
      throw new ValidationApiError({ sessionId: "sessionId is required" });
    }

    // Get session from store
    const session = thinkSessionStore.getSession(sessionId);

    if (!session) {
      throw new NotFoundError("ThinkSession", sessionId);
    }

    // Build response
    const responseData: ThinkStatusResponse = {
      status: session.status,
      progress: session.progress,
      currentStage: session.currentStage,
    };

    // Include active streams only if processing
    if (session.status === "processing") {
      responseData.activeStreams = session.activeStreams;
    }

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Decision point in reasoning chain
 * Requirements: 4.3
 */
export interface DecisionPoint {
  /** Decision point identifier */
  id: string;
  /** Description of the decision */
  description: string;
  /** Options that were considered */
  options: string[];
  /** The option that was selected */
  selectedOption: string;
  /** Rationale for the selection */
  rationale: string;
  /** Confidence at this decision point (0-1) */
  confidence: number;
  /** Timestamp of the decision */
  timestamp: string;
}

/**
 * Reasoning step in chain response
 * Requirements: 4.3
 */
export interface ReasoningStepResponse {
  /** Step identifier */
  id: string;
  /** Step content */
  content: string;
  /** Type of reasoning step */
  type: "hypothesis" | "evidence" | "inference" | "conclusion" | "assumption";
  /** Confidence in this step (0-1) */
  confidence: number;
  /** Supporting evidence for this step */
  evidence: string[];
  /** Timestamp of step */
  timestamp: string;
}

/**
 * Reasoning branch in chain response
 * Requirements: 4.3
 */
export interface ReasoningBranchResponse {
  /** Branch identifier */
  id: string;
  /** Branch description */
  description: string;
  /** Steps in this branch */
  steps: ReasoningStepResponse[];
  /** Whether this branch was selected */
  selected: boolean;
  /** Reason for selection/rejection */
  rationale: string;
}

/**
 * Response type for reasoning chain endpoint
 * Requirements: 4.3
 */
export interface ReasoningChainResponse {
  /** Chain identifier (same as session ID) */
  chainId: string;
  /** Sequential reasoning steps */
  steps: ReasoningStepResponse[];
  /** Alternative reasoning branches */
  branches: ReasoningBranchResponse[];
  /** Confidence evolution over time (array of confidence values) */
  confidenceEvolution: number[];
  /** Decision points in the reasoning process */
  decisionPoints: DecisionPoint[];
}

/**
 * Valid stream types for parallel reasoning
 * Requirements: 4.1
 */
const VALID_STREAM_TYPES = ["analytical", "creative", "critical", "synthetic"] as const;

/**
 * Zod schema for parallel reasoning request validation
 * Requirements: 4.1
 */
const parallelReasoningRequestSchema = z.object({
  problem: z
    .string()
    .min(1, "problem is required")
    .max(10000, "problem must be at most 10,000 characters"),
  streams: z
    .array(
      z.enum(VALID_STREAM_TYPES, {
        errorMap: () => ({
          message: `stream type must be one of: ${VALID_STREAM_TYPES.join(", ")}`,
        }),
      })
    )
    .min(1, "at least one stream is required")
    .max(4, "at most 4 streams allowed"),
  coordinationStrategy: z
    .string()
    .max(100, "coordinationStrategy must be at most 100 characters")
    .optional(),
  userId: z.string().min(1, "userId must be non-empty if provided").optional(),
  context: z.string().max(5000, "context must be at most 5,000 characters").optional(),
  timeout: z.number().min(1000).max(60000).optional(),
  async: z.boolean().optional(),
});

/**
 * Stream output in parallel reasoning response
 * Requirements: 4.1
 */
interface StreamOutputResponse {
  streamId: string;
  streamType: string;
  conclusion: string;
  reasoning: string[];
  insights: Array<{
    content: string;
    confidence: number;
    importance: number;
  }>;
  confidence: number;
  processingTime: number;
  status: string;
}

/**
 * Conflict resolution in parallel reasoning response
 * Requirements: 4.1
 */
interface ConflictResolutionResponse {
  id: string;
  type: string;
  severity: string;
  description: string;
  sourceStreams: string[];
  resolution?: {
    approach: string;
    recommendedAction: string;
  };
}

/**
 * Coordination metrics in parallel reasoning response
 * Requirements: 4.4
 */
interface CoordinationMetricsResponse {
  sync25: number;
  sync50: number;
  sync75: number;
  totalCoordinationTime: number;
  overheadPercentage: number;
}

/**
 * Synthesis in parallel reasoning response
 * Requirements: 4.1
 */
interface SynthesisResponse {
  conclusion: string;
  insights: Array<{
    content: string;
    sources: string[];
    confidence: number;
    importance: number;
  }>;
  recommendations: Array<{
    description: string;
    priority: number;
    confidence: number;
  }>;
  confidence: number;
  quality: {
    overallScore: number;
    coherence: number;
    completeness: number;
    consistency: number;
  };
}

/**
 * Response type for parallel reasoning endpoint
 * Requirements: 4.1, 4.4
 */
interface ParallelReasoningResponse {
  sessionId: string;
  streams: StreamOutputResponse[];
  synthesis: SynthesisResponse;
  conflictsResolved: ConflictResolutionResponse[];
  coordinationMetrics: CoordinationMetricsResponse;
}

/**
 * Parallel reasoning session data structure
 * Requirements: 4.1
 */
export interface ParallelReasoningSession {
  sessionId: string;
  status: "processing" | "complete" | "error";
  progress: number;
  currentStage: string;
  activeStreams: string[];
  startedAt: Date;
  completedAt?: Date;
  result?: ParallelReasoningResponse;
  error?: string;
  syncCheckpoints: {
    sync25: number;
    sync50: number;
    sync75: number;
  };
}

/**
 * In-memory store for parallel reasoning sessions
 * Requirements: 4.1
 */
export class ParallelReasoningSessionStore {
  private sessions: Map<string, ParallelReasoningSession> = new Map();

  /**
   * Create a new parallel reasoning session
   */
  createSession(activeStreams: string[]): ParallelReasoningSession {
    const sessionId = `parallel-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const session: ParallelReasoningSession = {
      sessionId,
      status: "processing",
      progress: 0,
      currentStage: "initializing",
      activeStreams,
      startedAt: new Date(),
      syncCheckpoints: {
        sync25: 0,
        sync50: 0,
        sync75: 0,
      },
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): ParallelReasoningSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update a session
   */
  updateSession(sessionId: string, updates: Partial<ParallelReasoningSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      if (updates.status === "complete" || updates.status === "error") {
        session.completedAt = new Date();
      }
    }
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Cleanup old sessions
   */
  cleanupOldSessions(maxAgeMs: number): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      if (now - session.startedAt.getTime() > maxAgeMs) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Global parallel reasoning session store instance
const parallelReasoningSessionStore = new ParallelReasoningSessionStore();

/**
 * SSE Event types for parallel reasoning streams
 * Requirements: 4.2
 */
export type SSEEventType =
  | "stream_started"
  | "stream_progress"
  | "stream_insight"
  | "stream_completed"
  | "sync_checkpoint"
  | "synthesis_started"
  | "synthesis_completed"
  | "session_completed"
  | "session_error"
  | "heartbeat";

/**
 * SSE Event data structure
 * Requirements: 4.2
 */
export interface SSEEvent {
  type: SSEEventType;
  timestamp: string;
  data: {
    sessionId: string;
    streamType?: string;
    progress?: number;
    checkpoint?: number;
    insight?: {
      content: string;
      confidence: number;
      importance: number;
    };
    message?: string;
    error?: string;
  };
}

/**
 * SSE client connection for a session
 * Requirements: 4.2
 */
interface SSEClient {
  res: Response;
  sessionId: string;
  connectedAt: Date;
}

/**
 * SSE Connection Manager for parallel reasoning sessions
 * Requirements: 4.2
 *
 * Manages Server-Sent Events connections for real-time streaming
 * of parallel reasoning updates to connected clients.
 */
export class SSEConnectionManager {
  private clients: Map<string, Set<SSEClient>> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly heartbeatIntervalMs: number = 15000; // 15 seconds

  /**
   * Add a client connection for a session
   */
  addClient(sessionId: string, res: Response): SSEClient {
    const client: SSEClient = {
      res,
      sessionId,
      connectedAt: new Date(),
    };

    if (!this.clients.has(sessionId)) {
      this.clients.set(sessionId, new Set());
      this.startHeartbeat(sessionId);
    }

    const sessionClients = this.clients.get(sessionId);
    if (sessionClients) {
      sessionClients.add(client);
    }
    return client;
  }

  /**
   * Remove a client connection
   */
  removeClient(sessionId: string, client: SSEClient): void {
    const sessionClients = this.clients.get(sessionId);
    if (sessionClients) {
      sessionClients.delete(client);
      if (sessionClients.size === 0) {
        this.clients.delete(sessionId);
        this.stopHeartbeat(sessionId);
      }
    }
  }

  /**
   * Get all clients for a session
   */
  getClients(sessionId: string): Set<SSEClient> | undefined {
    return this.clients.get(sessionId);
  }

  /**
   * Check if session has connected clients
   */
  hasClients(sessionId: string): boolean {
    const clients = this.clients.get(sessionId);
    return clients !== undefined && clients.size > 0;
  }

  /**
   * Get client count for a session
   */
  getClientCount(sessionId: string): number {
    return this.clients.get(sessionId)?.size ?? 0;
  }

  /**
   * Broadcast an event to all clients of a session
   */
  broadcast(sessionId: string, event: SSEEvent): void {
    const sessionClients = this.clients.get(sessionId);
    if (!sessionClients) return;

    const eventData = `data: ${JSON.stringify(event)}\n\n`;

    for (const client of sessionClients) {
      try {
        if (!client.res.writableEnded) {
          client.res.write(eventData);
        }
      } catch {
        // Client disconnected, will be cleaned up
        this.removeClient(sessionId, client);
      }
    }
  }

  /**
   * Start heartbeat for a session to keep connections alive
   */
  private startHeartbeat(sessionId: string): void {
    const interval = setInterval(() => {
      const event: SSEEvent = {
        type: "heartbeat",
        timestamp: new Date().toISOString(),
        data: {
          sessionId,
          message: "keepalive",
        },
      };
      this.broadcast(sessionId, event);
    }, this.heartbeatIntervalMs);

    this.heartbeatIntervals.set(sessionId, interval);
  }

  /**
   * Stop heartbeat for a session
   */
  private stopHeartbeat(sessionId: string): void {
    const interval = this.heartbeatIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(sessionId);
    }
  }

  /**
   * Cleanup all connections for a session
   */
  cleanupSession(sessionId: string): void {
    const sessionClients = this.clients.get(sessionId);
    if (sessionClients) {
      for (const client of sessionClients) {
        try {
          if (!client.res.writableEnded) {
            client.res.end();
          }
        } catch {
          // Ignore errors during cleanup
        }
      }
      this.clients.delete(sessionId);
    }
    this.stopHeartbeat(sessionId);
  }

  /**
   * Cleanup all connections
   */
  cleanupAll(): void {
    for (const sessionId of this.clients.keys()) {
      this.cleanupSession(sessionId);
    }
  }
}

// Global SSE connection manager instance
const sseConnectionManager = new SSEConnectionManager();

/**
 * Convert conflict to response format
 */
function convertConflictToResponse(conflict: Conflict): ConflictResolutionResponse {
  const response: ConflictResolutionResponse = {
    id: conflict.id,
    type: conflict.type,
    severity: conflict.severity,
    description: conflict.description,
    sourceStreams: conflict.sourceStreams,
  };

  if (conflict.resolutionFramework) {
    response.resolution = {
      approach: conflict.resolutionFramework.approach,
      recommendedAction: conflict.resolutionFramework.recommendedAction,
    };
  }

  return response;
}

/**
 * Convert synthesized result to synthesis response format
 */
function convertToSynthesisResponse(result: SynthesizedResult): SynthesisResponse {
  return {
    conclusion: result.conclusion,
    insights: result.insights.map((insight) => ({
      content: insight.content,
      sources: insight.sources,
      confidence: insight.confidence,
      importance: insight.importance,
    })),
    recommendations: result.recommendations.map((rec) => ({
      description: rec.description,
      priority: rec.priority,
      confidence: rec.confidence,
    })),
    confidence: result.confidence,
    quality: {
      overallScore: result.quality.overallScore,
      coherence: result.quality.coherence,
      completeness: result.quality.completeness,
      consistency: result.quality.consistency,
    },
  };
}

/**
 * Build problem context from user input or memory augmentation
 * Requirements: 4.1
 */
async function buildProblemContext(
  cognitiveCore: CognitiveCore,
  problem: string,
  userId?: string,
  context?: string
): Promise<{ description: string; context: string }> {
  if (userId && context) {
    return { description: problem, context };
  }
  if (userId) {
    const augmented = await cognitiveCore.memoryAugmentedReasoning.augmentProblemContext(
      problem,
      userId
    );
    if (augmented.hasMemoryContext) {
      return { description: augmented.augmentedProblem, context: augmented.memoryBackground };
    }
  }
  return { description: problem, context: context ?? "" };
}

/**
 * Build stream outputs from synthesized result
 * Requirements: 4.1
 */
function buildStreamOutputs(
  sessionId: string,
  synthesizedResult: import("../../reasoning/orchestrator").ExtendedSynthesizedResult
): StreamOutputResponse[] {
  // Use individual stream results if available
  if (synthesizedResult.streamResults && synthesizedResult.streamResults.length > 0) {
    return synthesizedResult.streamResults.map((result, index) => ({
      streamId: `${sessionId}-${result.streamType}-${index}`,
      streamType: result.streamType,
      conclusion: result.conclusion || "Stream did not produce a conclusion",
      reasoning: result.reasoning || [],
      insights: result.insights.map((i) => ({
        content: i.content,
        confidence: i.confidence,
        importance: i.importance,
      })),
      confidence: result.confidence,
      processingTime: result.processingTime,
      status: result.status,
    }));
  }

  // Fallback to old behavior if streamResults not available
  return synthesizedResult.metadata.streamsUsed.map((streamType, index) => ({
    streamId: `${sessionId}-${streamType}-${index}`,
    streamType,
    conclusion: synthesizedResult.conclusion,
    reasoning: [],
    insights: synthesizedResult.insights
      .filter((i) => i.sources.includes(streamType))
      .map((i) => ({ content: i.content, confidence: i.confidence, importance: i.importance })),
    confidence: synthesizedResult.confidence,
    processingTime: synthesizedResult.metadata.synthesisTime,
    status: "completed",
  }));
}

/**
 * Handler for POST /api/v1/reasoning/parallel
 * Requirements: 4.1, 4.4
 *
 * Initiates parallel reasoning with selected streams and returns
 * session ID, stream outputs, synthesis, conflict resolutions,
 * and coordination metrics.
 */

interface SessionExecutionOptions {
  session: ParallelReasoningSession;
  problemObj: Problem;
  streams: ReasoningStream[];
  totalTimeout: number;
  coordinationManager: StreamCoordinationManager;
  cognitiveCore: CognitiveCore;
  startTime: number;
}

async function runSessionExecution({
  session,
  problemObj,
  streams,
  totalTimeout,
  coordinationManager,
  cognitiveCore,
  startTime,
}: SessionExecutionOptions): Promise<ParallelReasoningResponse> {
  const syncCheckpoints = { sync25: 0, sync50: 0, sync75: 0 };

  const trackCheckpoint = async (
    checkpoint: number,
    key: keyof typeof syncCheckpoints
  ): Promise<void> => {
    const checkpointStart = Date.now();
    await coordinationManager.waitForCheckpoint(streams, checkpoint, totalTimeout * checkpoint);
    syncCheckpoints[key] = Date.now() - checkpointStart;
    parallelReasoningSessionStore.updateSession(session.sessionId, {
      progress: checkpoint,
      currentStage: `sync_${Math.round(checkpoint * 100)}`,
      syncCheckpoints: { ...syncCheckpoints },
    });
  };

  const checkpointPromises = [
    trackCheckpoint(0.25, "sync25"),
    trackCheckpoint(0.5, "sync50"),
    trackCheckpoint(0.75, "sync75"),
  ];

  const synthesizedResult = await cognitiveCore.reasoningOrchestrator.executeStreams(
    problemObj,
    streams,
    totalTimeout
  );

  await Promise.race([
    Promise.allSettled(checkpointPromises),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);

  const overheadMetrics = coordinationManager.getOverheadMetrics();
  const processingTime = Date.now() - startTime;
  const overheadPercentage = coordinationManager.measureCoordinationOverhead(processingTime);

  const responseData: ParallelReasoningResponse = {
    sessionId: session.sessionId,
    streams: buildStreamOutputs(session.sessionId, synthesizedResult),
    synthesis: convertToSynthesisResponse(synthesizedResult),
    conflictsResolved: synthesizedResult.conflicts.map(convertConflictToResponse),
    coordinationMetrics: {
      sync25: syncCheckpoints.sync25,
      sync50: syncCheckpoints.sync50,
      sync75: syncCheckpoints.sync75,
      totalCoordinationTime: overheadMetrics.totalCoordinationTime,
      overheadPercentage: Math.round(overheadPercentage * 100) / 100,
    },
  };

  parallelReasoningSessionStore.updateSession(session.sessionId, {
    status: "complete",
    progress: 1.0,
    currentStage: "completed",
    result: responseData,
  });

  return responseData;
}

/**
 * Handler for POST /api/v1/reasoning/parallel
 * Requirements: 4.1, 4.4
 *
 * Initiates parallel reasoning with selected streams and returns
 * session ID, stream outputs, synthesis, conflict resolutions,
 * and coordination metrics.
 */
function createParallelReasoningHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Validate request body
    const parseResult = parallelReasoningRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { problem, streams: requestedStreams, userId, context, timeout } = parseResult.data;
    const session = parallelReasoningSessionStore.createSession(requestedStreams);

    // Build problem context
    const problemCtx = await buildProblemContext(cognitiveCore, problem, userId, context);
    const problemObj: Problem = {
      id: session.sessionId,
      description: problemCtx.description,
      context: problemCtx.context,
      complexity: requestedStreams.length >= 3 ? "complex" : "moderate",
    };

    const streams = createStreams(requestedStreams as StreamType[]);
    parallelReasoningSessionStore.updateSession(session.sessionId, {
      currentStage: "executing_streams",
      progress: 0.1,
    });

    const coordinationManager = cognitiveCore.reasoningOrchestrator.getCoordinationManager();
    const totalTimeout = timeout ?? 30000;

    // Async Mode
    if (parseResult.data.async) {
      // Run in background
      void runSessionExecution({
        session,
        problemObj,
        streams,
        totalTimeout,
        coordinationManager,
        cognitiveCore,
        startTime,
      }).catch((error) => {
        parallelReasoningSessionStore.updateSession(session.sessionId, {
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      });

      res.status(202).json(
        buildSuccessResponse(
          {
            sessionId: session.sessionId,
            status: "processing",
            message:
              "Parallel reasoning started successfully. Connect to event stream via GET /api/v1/reasoning/live/:sessionId",
          },
          { requestId, startTime }
        )
      );
      return;
    }

    // Sync Mode
    const responseData = await runSessionExecution({
      session,
      problemObj,
      streams,
      totalTimeout,
      coordinationManager,
      cognitiveCore,
      startTime,
    });

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Handler for GET /api/v1/reasoning/live/:streamId
 * Requirements: 4.2
 *
 * Subscribes to the StreamManager for real-time token streaming (Glass Box).
 */
function createLiveStreamHandler(): (
  req: Request,
  res: Response,
  next: import("express").NextFunction
) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { streamId } = req.params;

    if (!streamId || typeof streamId !== "string" || streamId.trim() === "") {
      throw new ValidationApiError({ streamId: "streamId is required" });
    }

    StreamManager.getInstance().addConnection(streamId, res);
  });
}

/**
 * Create an SSE event object
 * Requirements: 4.2
 */
function createSSEEvent(
  type: SSEEventType,
  sessionId: string,
  data: Partial<SSEEvent["data"]> = {}
): SSEEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    data: { sessionId, ...data },
  };
}

/**
 * Write an SSE event to the response
 * Requirements: 4.2
 */
function writeSSEEvent(res: Response, event: SSEEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Set up SSE headers on the response
 * Requirements: 4.2
 */
function setupSSEHeaders(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

/**
 * Check and send checkpoint events
 * Requirements: 4.2
 */
function checkAndSendCheckpoints(
  res: Response,
  session: ParallelReasoningSession,
  sentCheckpoints: { sync25: boolean; sync50: boolean; sync75: boolean }
): void {
  const checkpoints = [
    { key: "sync25" as const, value: 25, threshold: 0.25 },
    { key: "sync50" as const, value: 50, threshold: 0.5 },
    { key: "sync75" as const, value: 75, threshold: 0.75 },
  ];

  for (const { key, value, threshold } of checkpoints) {
    if (
      !sentCheckpoints[key] &&
      session.syncCheckpoints[key] > 0 &&
      session.progress >= threshold
    ) {
      writeSSEEvent(
        res,
        createSSEEvent("sync_checkpoint", session.sessionId, { checkpoint: value })
      );
      sentCheckpoints[key] = true;
    }
  }
}

/**
 * Handler for GET /api/v1/reasoning/parallel/:sessionId/stream
 * Requirements: 4.2
 *
 * Sets up Server-Sent Events connection for real-time updates
 * from parallel reasoning streams.
 */
function createSSEStreamHandler(): (
  req: Request,
  res: Response,
  next: import("express").NextFunction
) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;

    if (!sessionId || typeof sessionId !== "string" || sessionId.trim() === "") {
      throw new ValidationApiError({ sessionId: "sessionId is required" });
    }

    const session = parallelReasoningSessionStore.getSession(sessionId);
    if (!session) {
      throw new NotFoundError("ParallelReasoningSession", sessionId);
    }

    setupSSEHeaders(res);
    writeSSEEvent(
      res,
      createSSEEvent("stream_started", session.sessionId, {
        progress: session.progress,
        message: "Connected to SSE stream",
      })
    );

    const client = sseConnectionManager.addClient(sessionId, res);

    if (session.status === "complete") {
      writeSSEEvent(
        res,
        createSSEEvent("session_completed", session.sessionId, {
          progress: 1.0,
          message: "Session completed",
        })
      );
      sseConnectionManager.removeClient(sessionId, client);
      res.end();
      return;
    }

    if (session.status === "error") {
      writeSSEEvent(
        res,
        createSSEEvent("session_error", session.sessionId, {
          error: session.error ?? "Unknown error",
        })
      );
      sseConnectionManager.removeClient(sessionId, client);
      res.end();
      return;
    }

    const sentCheckpoints = { sync25: false, sync50: false, sync75: false };

    const cleanup = (): void => {
      clearInterval(pollInterval);
      sseConnectionManager.removeClient(sessionId, client);
      if (!res.writableEnded) res.end();
    };

    const pollInterval = setInterval(() => {
      const currentSession = parallelReasoningSessionStore.getSession(sessionId);

      if (!currentSession) {
        writeSSEEvent(
          res,
          createSSEEvent("session_error", sessionId, {
            error: "Session no longer exists",
          })
        );
        cleanup();
        return;
      }

      writeSSEEvent(
        res,
        createSSEEvent("stream_progress", currentSession.sessionId, {
          progress: currentSession.progress,
          message: currentSession.currentStage,
        })
      );

      checkAndSendCheckpoints(res, currentSession, sentCheckpoints);

      if (currentSession.status === "complete") {
        writeSSEEvent(
          res,
          createSSEEvent("session_completed", currentSession.sessionId, {
            progress: 1.0,
            message: "Session completed",
          })
        );
        cleanup();
        return;
      }

      if (currentSession.status === "error") {
        writeSSEEvent(
          res,
          createSSEEvent("session_error", currentSession.sessionId, {
            error: currentSession.error ?? "Unknown error",
          })
        );
        cleanup();
        return;
      }
    }, 500);

    req.on("close", cleanup);
    req.on("error", cleanup);
  });
}

/**
 * Build reasoning steps from session result
 * Requirements: 4.3
 */
function buildReasoningSteps(
  sessionId: string,
  session: ParallelReasoningSession,
  result: ParallelReasoningResponse
): { steps: ReasoningStepResponse[]; confidenceEvolution: number[] } {
  const steps: ReasoningStepResponse[] = [];
  const confidenceEvolution: number[] = [];
  let stepIndex = 0;

  // Initial hypothesis step
  steps.push({
    id: `${sessionId}-step-${stepIndex++}`,
    content: `Problem analysis initiated with ${session.activeStreams.length} parallel streams`,
    type: "hypothesis",
    confidence: 0.5,
    evidence: [],
    timestamp: session.startedAt.toISOString(),
  });
  confidenceEvolution.push(0.5);

  // Steps from stream insights
  for (const stream of result.streams) {
    for (const insight of stream.insights) {
      steps.push({
        id: `${sessionId}-step-${stepIndex++}`,
        content: insight.content,
        type: "inference",
        confidence: insight.confidence,
        evidence: [stream.streamType],
        timestamp: new Date().toISOString(),
      });
      confidenceEvolution.push(insight.confidence);
    }
  }

  // Synthesis insights as evidence steps
  for (const insight of result.synthesis.insights) {
    steps.push({
      id: `${sessionId}-step-${stepIndex++}`,
      content: insight.content,
      type: "evidence",
      confidence: insight.confidence,
      evidence: insight.sources,
      timestamp: new Date().toISOString(),
    });
    confidenceEvolution.push(insight.confidence);
  }

  // Conclusion step
  steps.push({
    id: `${sessionId}-step-${stepIndex++}`,
    content: result.synthesis.conclusion,
    type: "conclusion",
    confidence: result.synthesis.confidence,
    evidence: result.streams.map((s) => s.streamType),
    timestamp: session.completedAt?.toISOString() ?? new Date().toISOString(),
  });
  confidenceEvolution.push(result.synthesis.confidence);

  return { steps, confidenceEvolution };
}

/**
 * Build reasoning branches from stream outputs
 * Requirements: 4.3
 */
function buildReasoningBranches(
  sessionId: string,
  result: ParallelReasoningResponse
): ReasoningBranchResponse[] {
  const branches: ReasoningBranchResponse[] = [];
  let branchIndex = 0;

  for (const stream of result.streams) {
    if (stream.insights.length > 0) {
      branches.push({
        id: `${sessionId}-branch-${branchIndex++}`,
        description: `${stream.streamType} reasoning path`,
        steps: stream.insights.map((insight, idx) => ({
          id: `${sessionId}-branch-${branchIndex - 1}-step-${idx}`,
          content: insight.content,
          type: "inference" as const,
          confidence: insight.confidence,
          evidence: [stream.streamType],
          timestamp: new Date().toISOString(),
        })),
        selected: true,
        rationale: `Contributed to synthesis with confidence ${stream.confidence}`,
      });
    }
  }
  return branches;
}

/**
 * Build decision points from session and result
 * Requirements: 4.3
 */
function buildDecisionPoints(
  sessionId: string,
  session: ParallelReasoningSession,
  result: ParallelReasoningResponse
): DecisionPoint[] {
  const decisionPoints: DecisionPoint[] = [];
  const checkpointTimestamp = new Date().toISOString();

  // Stream selection decision
  decisionPoints.push({
    id: `${sessionId}-decision-0`,
    description: "Parallel stream selection",
    options: ["analytical", "creative", "critical", "synthetic"],
    selectedOption: session.activeStreams.join(", "),
    rationale: `Selected ${session.activeStreams.length} streams for comprehensive analysis`,
    confidence: 0.9,
    timestamp: session.startedAt.toISOString(),
  });

  // Sync checkpoint decisions
  const checkpoints = [
    { sync: result.coordinationMetrics.sync25, id: 1, pct: "25%", conf: 0.75 },
    { sync: result.coordinationMetrics.sync50, id: 2, pct: "50%", conf: 0.85 },
    { sync: result.coordinationMetrics.sync75, id: 3, pct: "75%", conf: 0.9 },
  ];

  for (const cp of checkpoints) {
    if (cp.sync > 0) {
      decisionPoints.push({
        id: `${sessionId}-decision-${cp.id}`,
        description: `${cp.pct} synchronization checkpoint`,
        options: ["continue", "adjust", "abort"],
        selectedOption: "continue",
        rationale: `Streams synchronized at ${cp.pct} in ${cp.sync}ms`,
        confidence: cp.conf,
        timestamp: checkpointTimestamp,
      });
    }
  }

  // Synthesis decision
  decisionPoints.push({
    id: `${sessionId}-decision-final`,
    description: "Synthesis approach selection",
    options: ["weighted_merge", "conflict_resolution", "consensus"],
    selectedOption: result.conflictsResolved.length > 0 ? "conflict_resolution" : "weighted_merge",
    rationale:
      result.conflictsResolved.length > 0
        ? `Resolved ${result.conflictsResolved.length} conflicts during synthesis`
        : "Merged stream outputs using weighted confidence scores",
    confidence: result.synthesis.confidence,
    timestamp: session.completedAt?.toISOString() ?? new Date().toISOString(),
  });

  return decisionPoints;
}

/**
 * Handler for GET /api/v1/reasoning/chain/:sessionId
 * Requirements: 4.3
 *
 * Returns the complete reasoning chain with steps, branches,
 * confidence evolution, and decision points for a completed session.
 */
function createReasoningChainHandler(): (
  req: Request,
  res: Response,
  next: import("express").NextFunction
) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = getRequestId(req);
    const startTime = Date.now();
    const { sessionId } = req.params;

    if (!sessionId || typeof sessionId !== "string" || sessionId.trim() === "") {
      throw new ValidationApiError({ sessionId: "sessionId is required" });
    }

    const session = parallelReasoningSessionStore.getSession(sessionId);
    if (!session) {
      throw new NotFoundError("ParallelReasoningSession", sessionId);
    }

    let steps: ReasoningStepResponse[] = [];
    let confidenceEvolution: number[] = [];
    let branches: ReasoningBranchResponse[] = [];
    let decisionPoints: DecisionPoint[] = [];

    if (session.result) {
      const result = session.result;
      const stepsData = buildReasoningSteps(sessionId, session, result);
      steps = stepsData.steps;
      confidenceEvolution = stepsData.confidenceEvolution;
      branches = buildReasoningBranches(sessionId, result);
      decisionPoints = buildDecisionPoints(sessionId, session, result);
    } else {
      // Session still processing - return minimal chain
      steps.push({
        id: `${sessionId}-step-0`,
        content: `Session ${session.status}: ${session.currentStage}`,
        type: "hypothesis",
        confidence: session.progress,
        evidence: session.activeStreams,
        timestamp: session.startedAt.toISOString(),
      });
      confidenceEvolution.push(session.progress);
      decisionPoints.push({
        id: `${sessionId}-decision-0`,
        description: "Parallel stream selection",
        options: ["analytical", "creative", "critical", "synthetic"],
        selectedOption: session.activeStreams.join(", "),
        rationale: `Selected ${session.activeStreams.length} streams for analysis`,
        confidence: 0.9,
        timestamp: session.startedAt.toISOString(),
      });
    }

    const responseData: ReasoningChainResponse = {
      chainId: sessionId,
      steps,
      branches,
      confidenceEvolution,
      decisionPoints,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Create reasoning routes
 *
 * @param cognitiveCore - Shared cognitive core instance
 * @returns Express router with reasoning endpoints
 */
export function createReasoningRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // POST /api/v1/think - Initiate thinking
  // Requirements: 3.1, 3.3
  router.post("/", createThinkHandler(cognitiveCore));

  // GET /api/v1/think/status/:sessionId - Get thinking status
  // Requirements: 3.2
  router.get("/status/:sessionId", createThinkStatusHandler());

  // POST /api/v1/reasoning/parallel - Parallel reasoning
  // Requirements: 4.1, 4.4
  router.post("/parallel", createParallelReasoningHandler(cognitiveCore));

  // GET /api/v1/reasoning/parallel/:sessionId/stream - SSE stream
  // Requirements: 4.2
  router.get("/parallel/:sessionId/stream", createSSEStreamHandler());

  // GET /api/v1/reasoning/live/:streamId - Live Glass Box stream
  router.get("/live/:streamId", createLiveStreamHandler());

  // GET /api/v1/reasoning/chain/:sessionId - Get reasoning chain
  // Requirements: 4.3
  router.get("/chain/:sessionId", createReasoningChainHandler());

  return router;
}

// Export session stores and connection manager for testing
export { parallelReasoningSessionStore, sseConnectionManager, thinkSessionStore };
