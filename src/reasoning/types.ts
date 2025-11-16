/**
 * Core types and interfaces for parallel reasoning system
 *
 * This module defines the foundational types for the parallel reasoning
 * infrastructure, including problem representation, stream results, and
 * orchestration outcomes.
 */

/**
 * Stream type enumeration
 *
 * Defines the four parallel reasoning streams that process problems
 * from different cognitive perspectives.
 */
export enum StreamType {
  /** Logical, systematic analysis */
  ANALYTICAL = "analytical",
  /** Innovative, divergent thinking */
  CREATIVE = "creative",
  /** Skeptical, evaluative thinking */
  CRITICAL = "critical",
  /** Integrative, holistic thinking */
  SYNTHETIC = "synthetic",
}

/**
 * Stream execution status
 *
 * Tracks the current state of a reasoning stream during execution.
 */
export enum StreamStatus {
  /** Stream is waiting to start */
  PENDING = "pending",
  /** Stream is currently processing */
  RUNNING = "running",
  /** Stream completed successfully */
  COMPLETED = "completed",
  /** Stream exceeded timeout limit */
  TIMEOUT = "timeout",
  /** Stream encountered an error */
  FAILED = "failed",
  /** Stream was cancelled */
  CANCELLED = "cancelled",
}

/**
 * Problem representation
 *
 * Defines a problem to be analyzed by the parallel reasoning system.
 */
export interface Problem {
  /** Unique problem identifier */
  id: string;
  /** Problem description */
  description: string;
  /** Additional context and background */
  context: string;
  /** Constraints that limit solutions */
  constraints?: string[];
  /** Goals to achieve */
  goals?: string[];
  /** Problem complexity level */
  complexity?: "simple" | "moderate" | "complex";
  /** Time pressure level */
  urgency?: "low" | "medium" | "high";
}

/**
 * Reasoning context
 *
 * Provides complete context for reasoning operations including
 * problem, evidence, constraints, and emotional state.
 */
export interface ReasoningContext {
  /** Problem to be analyzed */
  problem: Problem;
  /** Available evidence */
  evidence: string[];
  /** Constraints on reasoning */
  constraints: string[];
  /** Goals to achieve */
  goals: string[];
  /** Selected thinking framework (if any) */
  framework?: string;
  /** Emotional state context (if detected) */
  emotionalState?: {
    valence: number; // -1 to +1
    arousal: number; // 0 to 1
    dominance: number; // -1 to +1
  };
}

/**
 * Insight generated during reasoning
 *
 * Represents a single insight or discovery made by a reasoning stream.
 */
export interface Insight {
  /** Insight content */
  content: string;
  /** Source stream that generated this insight */
  source: StreamType;
  /** Confidence in this insight (0-1) */
  confidence: number;
  /** Importance score (0-1) */
  importance: number;
}

/**
 * Result from a single reasoning stream
 *
 * Contains the complete output from one reasoning stream including
 * conclusion, reasoning steps, insights, and execution metadata.
 */
export interface StreamResult {
  /** Stream identifier */
  streamId: string;
  /** Type of reasoning stream */
  streamType: StreamType;
  /** Final conclusion */
  conclusion: string;
  /** Reasoning steps taken */
  reasoning: string[];
  /** Insights generated */
  insights: Insight[];
  /** Confidence in conclusion (0-1) */
  confidence: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Execution status */
  status: StreamStatus;
  /** Error if stream failed */
  error?: Error;
}

/**
 * Parallel reasoning result
 *
 * Aggregates results from all four reasoning streams with
 * execution statistics and success metrics.
 */
export interface ParallelReasoningResult {
  /** Result from analytical stream */
  analyticalResult: StreamResult;
  /** Result from creative stream */
  creativeResult: StreamResult;
  /** Result from critical stream */
  criticalResult: StreamResult;
  /** Result from synthetic stream */
  syntheticResult: StreamResult;
  /** Total processing time in milliseconds */
  totalProcessingTime: number;
  /** Number of streams that completed successfully */
  successfulStreams: number;
  /** Number of streams that failed or timed out */
  failedStreams: number;
}

/**
 * Attributed insight with source tracking
 *
 * Represents an insight that has been attributed to one or more
 * source reasoning streams with confidence and importance scores.
 */
export interface AttributedInsight {
  /** Insight content */
  content: string;
  /** Source stream(s) that generated this insight */
  sources: StreamType[];
  /** Confidence in this insight (0-1) */
  confidence: number;
  /** Importance score (0-1) */
  importance: number;
  /** Supporting evidence from streams */
  evidence: string[];
}

/**
 * Recommendation with priority and rationale
 *
 * Represents a recommended action or approach with priority,
 * confidence, rationale, and potential concerns.
 */
export interface Recommendation {
  /** Recommendation description */
  description: string;
  /** Source stream(s) that generated this recommendation */
  sources: StreamType[];
  /** Priority score (0-1, higher is more important) */
  priority: number;
  /** Confidence in recommendation (0-1) */
  confidence: number;
  /** Rationale from streams */
  rationale: string[];
  /** Potential risks or concerns */
  concerns: string[];
}

/**
 * Conflict type enumeration
 *
 * Classifies conflicts by their nature to enable appropriate
 * resolution strategies.
 */
export enum ConflictType {
  /** Contradictory facts or data */
  FACTUAL = "factual",
  /** Logical inconsistencies in reasoning */
  LOGICAL = "logical",
  /** Different methodological approaches */
  METHODOLOGICAL = "methodological",
  /** Different value judgments or priorities */
  EVALUATIVE = "evaluative",
  /** Different predictions or forecasts */
  PREDICTIVE = "predictive",
}

/**
 * Conflict severity enumeration
 *
 * Assesses the impact and importance of resolving a conflict.
 */
export enum ConflictSeverity {
  /** Minor disagreement, easily reconciled */
  LOW = "low",
  /** Significant disagreement, requires analysis */
  MEDIUM = "medium",
  /** Major contradiction, needs careful resolution */
  HIGH = "high",
  /** Fundamental incompatibility, critical to address */
  CRITICAL = "critical",
}

/**
 * Evidence for a conflict from a specific stream
 *
 * Captures the claim, reasoning, and confidence from one side
 * of a conflict.
 */
export interface ConflictEvidence {
  /** Stream that produced this evidence */
  streamId: string;
  /** Type of reasoning stream */
  streamType: StreamType;
  /** Claim or conclusion being made */
  claim: string;
  /** Reasoning supporting the claim */
  reasoning: string;
  /** Confidence in the claim (0-1) */
  confidence: number;
}

/**
 * Framework for resolving a conflict
 *
 * Provides structured guidance on how to approach and resolve
 * a specific conflict between reasoning streams.
 */
export interface ResolutionFramework {
  /** Resolution approach description */
  approach: string;
  /** Specific steps to resolve the conflict */
  steps: string[];
  /** Important factors to consider */
  considerations: string[];
  /** Recommended action to take */
  recommendedAction: string;
}

/**
 * Conflict between reasoning streams (detailed)
 *
 * Represents a conflict or disagreement between reasoning streams
 * with detailed classification, severity assessment, evidence, and
 * resolution framework.
 */
export interface Conflict {
  /** Unique conflict identifier */
  id: string;
  /** Type of conflict */
  type: ConflictType;
  /** Severity level */
  severity: ConflictSeverity;
  /** Streams involved in conflict */
  sourceStreams: string[];
  /** Conflict description */
  description: string;
  /** Evidence from each conflicting stream */
  evidence: ConflictEvidence[];
  /** When conflict was detected */
  detectedAt: Date;
  /** Resolution framework (if generated) */
  resolutionFramework?: ResolutionFramework;
}

/**
 * Pattern of conflicts over time
 *
 * Tracks recurring conflict patterns to enable learning and
 * improved conflict prevention.
 */
export interface ConflictPattern {
  /** Types of conflicts in this pattern */
  conflictTypes: ConflictType[];
  /** How often this pattern occurs */
  frequency: number;
  /** Streams commonly involved */
  commonSources: string[];
  /** Success rate of resolutions (0-1) */
  resolutionSuccess: number;
}

/**
 * Quality assessment for synthesis
 *
 * Evaluates the quality of synthesized results across multiple
 * dimensions including coherence, completeness, and consistency.
 */
export interface QualityAssessment {
  /** Overall quality score (0-1) */
  overallScore: number;
  /** Coherence of synthesis (0-1) */
  coherence: number;
  /** Completeness - coverage of all streams (0-1) */
  completeness: number;
  /** Consistency across streams (0-1) */
  consistency: number;
  /** Insight quality (0-1) */
  insightQuality: number;
  /** Recommendation quality (0-1) */
  recommendationQuality: number;
}

/**
 * Synthesized result from parallel reasoning
 *
 * Integrates outputs from all reasoning streams into a coherent
 * result with attributed insights, ranked recommendations, preserved
 * conflicts, and quality assessment.
 */
export interface SynthesizedResult {
  /** Integrated conclusion from all streams */
  conclusion: string;
  /** Key insights attributed to source streams */
  insights: AttributedInsight[];
  /** Ranked recommendations */
  recommendations: Recommendation[];
  /** Preserved conflicts between streams */
  conflicts: Conflict[];
  /** Overall confidence (weighted average) */
  confidence: number;
  /** Quality metrics */
  quality: QualityAssessment;
  /** Processing metadata */
  metadata: {
    /** Streams used in synthesis */
    streamsUsed: StreamType[];
    /** Synthesis processing time in milliseconds */
    synthesisTime: number;
    /** Timestamp of synthesis */
    timestamp: Date;
  };
}
