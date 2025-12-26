/**
 * Framework Selection Types
 *
 * Type definitions for problem classification and framework selection system.
 * Supports dynamic selection of systematic thinking frameworks based on problem characteristics.
 */

import type { Problem } from "../reasoning/types.js";

// Re-export Problem from reasoning types for convenience
export type { Problem };

/**
 * Complexity level classification for problems
 */
export type ComplexityLevel = "simple" | "moderate" | "complex";

/**
 * Uncertainty level in problem understanding
 */
export type UncertaintyLevel = "low" | "medium" | "high";

/**
 * Stakes level indicating problem importance
 */
export type StakesLevel = "routine" | "important" | "critical";

/**
 * Time pressure level for problem resolution
 */
export type TimePressureLevel = "none" | "moderate" | "high";

/**
 * Multi-dimensional problem classification result
 *
 * Classifies problems across four key dimensions to enable
 * appropriate framework selection and reasoning approach.
 */
export interface ProblemClassification {
  /** Complexity assessment (simple/moderate/complex) */
  complexity: ComplexityLevel;

  /** Uncertainty evaluation (low/medium/high) */
  uncertainty: UncertaintyLevel;

  /** Stakes assessment (routine/important/critical) */
  stakes: StakesLevel;

  /** Time pressure evaluation (none/moderate/high) */
  timePressure: TimePressureLevel;

  /** Overall classification confidence (0-1) */
  confidence: number;

  /** Detailed reasoning for each dimension */
  reasoning: {
    /** Explanation for complexity assessment */
    complexityReason: string;
    /** Explanation for uncertainty evaluation */
    uncertaintyReason: string;
    /** Explanation for stakes assessment */
    stakesReason: string;
    /** Explanation for time pressure evaluation */
    timePressureReason: string;
  };

  /** Classification timestamp */
  timestamp: Date;
}

/**
 * Problem characteristics used for classification
 *
 * Extracted features from problem description used to
 * determine classification across all dimensions.
 */
export interface ProblemCharacteristics {
  /** Number of goals identified */
  goalCount: number;

  /** Number of constraints identified */
  constraintCount: number;

  /** Number of known factors */
  knownFactorCount: number;

  /** Number of unknown factors */
  unknownFactorCount: number;

  /** Number of stakeholders affected */
  stakeholderCount: number;

  /** Whether problem has a deadline */
  hasDeadline: boolean;

  /** Days until deadline (if applicable) */
  daysUntilDeadline?: number;

  /** Explicit importance indicators found */
  importanceIndicators: string[];

  /** Complexity indicators found in description */
  complexityIndicators: string[];

  /** Uncertainty indicators found in description */
  uncertaintyIndicators: string[];
}

/**
 * Obstacle severity level
 *
 * Indicates how significantly an obstacle impacts framework execution.
 */
export type ObstacleSeverity = "low" | "medium" | "high" | "critical";

/**
 * Obstacle type classification
 *
 * Categorizes obstacles by their nature to enable appropriate handling.
 */
export type ObstacleType =
  | "missing_information"
  | "conflicting_constraints"
  | "resource_limitation"
  | "time_constraint"
  | "complexity_exceeded"
  | "assumption_violated"
  | "external_dependency"
  | "other";

/**
 * Obstacle encountered during framework execution
 *
 * Represents a problem or blocker that prevents normal framework
 * execution and may require adaptation or framework switching.
 */
export interface Obstacle {
  /** Unique obstacle identifier */
  id: string;

  /** Type of obstacle */
  type: ObstacleType;

  /** Detailed description of the obstacle */
  description: string;

  /** Severity level of the obstacle */
  severity: ObstacleSeverity;

  /** When the obstacle was detected */
  detectedAt: Date;

  /** Step where obstacle was encountered (if applicable) */
  stepId?: string;

  /** Suggested resolution approaches */
  suggestedResolutions?: string[];
}

/**
 * Adaptation made to framework execution
 *
 * Records changes made to framework execution in response to
 * obstacles, progress, or changing problem understanding.
 */
export interface Adaptation {
  /** Unique adaptation identifier */
  id: string;

  /** Reason for the adaptation */
  reason: string;

  /** Specific changes made */
  changes: string[];

  /** When the adaptation was made */
  timestamp: Date;

  /** Obstacle that triggered adaptation (if applicable) */
  triggeredBy?: string;

  /** Effectiveness of adaptation (0-1, if measured) */
  effectiveness?: number;
}

/**
 * Context for framework execution
 *
 * Provides complete context including problem, evidence, constraints,
 * goals, and emotional state for framework execution.
 */
export interface Context {
  /** Problem to be solved */
  problem: Problem;

  /** Available evidence and information */
  evidence: string[];

  /** Constraints that limit solutions */
  constraints: string[];

  /** Goals to achieve */
  goals: string[];

  /** Emotional state context (if detected) */
  emotionalState?: {
    /** Emotional valence (-1 to +1, negative to positive) */
    valence: number;
    /** Emotional arousal (0 to 1, calm to excited) */
    arousal: number;
    /** Emotional dominance (-1 to +1, submissive to dominant) */
    dominance: number;
  };

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Execution progress tracking
 *
 * Tracks progress through framework execution including current step,
 * completed steps, and overall progress percentage.
 */
export interface ExecutionProgress {
  /** ID of the current step being executed */
  currentStep: string;

  /** IDs of steps that have been completed */
  completedSteps: string[];

  /** Total number of steps in the framework */
  totalSteps: number;

  /** Progress percentage (0-100) */
  progressPercentage: number;

  /** Estimated time remaining in milliseconds (if available) */
  estimatedTimeRemaining?: number;

  /** Obstacles encountered so far */
  obstacles: Obstacle[];

  /** Adaptations made so far */
  adaptations: Adaptation[];
}

/**
 * Result from executing a single framework step
 *
 * Contains the output, insights, and metadata from executing
 * one step of a thinking framework.
 */
export interface StepResult {
  /** ID of the step that was executed */
  stepId: string;

  /** Whether the step completed successfully */
  success: boolean;

  /** Output produced by the step */
  output: string;

  /** Insights generated during step execution */
  insights: string[];

  /** Processing time in milliseconds */
  processingTime: number;

  /** Confidence in the step result (0-1) */
  confidence: number;

  /** Any obstacles encountered during this step */
  obstacles?: Obstacle[];

  /** Error if step failed */
  error?: Error;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Complete result from framework execution
 *
 * Contains the final conclusion, all step results, insights,
 * and execution metadata from running a thinking framework.
 */
export interface FrameworkResult {
  /** Framework ID that was executed */
  frameworkId: string;

  /** Framework name */
  frameworkName: string;

  /** Whether framework execution completed successfully */
  success: boolean;

  /** Final conclusion from framework execution */
  conclusion: string;

  /** Results from each step */
  steps: StepResult[];

  /** All insights generated during execution */
  insights: string[];

  /** Overall confidence in the result (0-1) */
  confidence: number;

  /** Total processing time in milliseconds */
  processingTime: number;

  /** Obstacles encountered during execution */
  obstacles: Obstacle[];

  /** Adaptations made during execution */
  adaptations: Adaptation[];

  /** Execution progress at completion */
  progress: ExecutionProgress;

  /** Error if framework execution failed */
  error?: Error;

  /** Execution timestamp */
  timestamp: Date;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Single step in a thinking framework
 *
 * Represents one step in a systematic thinking framework with
 * execution logic and validation.
 */
export interface FrameworkStep {
  /** Unique step identifier */
  id: string;

  /** Step name */
  name: string;

  /** Detailed description of what this step does */
  description: string;

  /** Order in the framework (0-based) */
  order: number;

  /** Whether this step is optional */
  optional: boolean;

  /**
   * Execute this step with the given context
   *
   * @param context - Execution context including problem and evidence
   * @param previousResults - Results from previous steps
   * @returns Promise resolving to step result
   */
  execute(context: Context, previousResults: StepResult[]): Promise<StepResult>;

  /**
   * Validate whether this step can be executed
   *
   * @param context - Execution context
   * @param previousResults - Results from previous steps
   * @returns Promise resolving to validation result with any issues
   */
  validate(
    context: Context,
    previousResults: StepResult[]
  ): Promise<{ valid: boolean; issues: string[] }>;

  /** Expected duration in milliseconds (if known) */
  expectedDuration?: number;

  /** Dependencies on other steps (step IDs) */
  dependencies?: string[];
}

/**
 * Systematic thinking framework
 *
 * Represents a complete thinking framework with structured steps
 * for problem-solving, execution logic, and adaptation capabilities.
 */
export interface ThinkingFramework {
  /** Unique framework identifier */
  id: string;

  /** Framework name */
  name: string;

  /** Detailed description of the framework */
  description: string;

  /** Problem characteristics this framework is best suited for */
  bestSuitedFor: ProblemCharacteristics[];

  /** Ordered steps in the framework */
  steps: FrameworkStep[];

  /** Zod Schema for validation and Prompt Binding */
  inputSchema?: import("zod").ZodSchema;

  /** Zod Schema for structured output enforcement */
  outputSchema?: import("zod").ZodSchema;

  /** System prompt template for this framework */
  systemPromptTemplate?: string;

  /**
   * Execute the complete framework
   *
   * @param problem - Problem to solve
   * @param context - Execution context
   * @returns Promise resolving to framework result
   */
  execute(problem: Problem, context: Context): Promise<FrameworkResult>;

  /**
   * Adapt framework execution based on progress and obstacles
   *
   * @param problem - Problem being solved
   * @param progress - Current execution progress
   * @returns Promise resolving when adaptation is complete
   */
  adapt(problem: Problem, progress: ExecutionProgress): Promise<void>;

  /** Expected total duration in milliseconds (if known) */
  expectedDuration?: number;

  /** Framework version */
  version?: string;

  /** Framework metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Alternative framework option
 *
 * Represents an alternative framework that could be used
 * instead of the primary selection, with confidence and reasoning.
 */
export interface FrameworkAlternative {
  /** Alternative framework */
  framework: ThinkingFramework;

  /** Confidence in this alternative (0-1) */
  confidence: number;

  /** Reason why this is a viable alternative */
  reason: string;
}

/**
 * Framework selection result
 *
 * Result from dynamic framework selection including primary framework,
 * alternatives, confidence, and reasoning for the selection.
 */
export interface FrameworkSelection {
  /** Primary selected framework */
  primaryFramework: ThinkingFramework;

  /** Alternative frameworks ranked by suitability */
  alternatives: FrameworkAlternative[];

  /** Overall confidence in the selection (0-1) */
  confidence: number;

  /** Reasoning for the selection */
  reason: string;

  /** Whether this is a hybrid framework combination */
  isHybrid: boolean;

  /** Frameworks combined in hybrid approach (if applicable) */
  hybridFrameworks?: ThinkingFramework[];

  /** Selection timestamp */
  timestamp: Date;

  /** Unique selection ID for tracking (when learning system is enabled) */
  selectionId?: string;
}

/**
 * Options for framework selection
 */
export interface FrameworkSelectionOptions {
  /** Explicitly preferred framework ID */
  preferredFrameworkId?: string;

  /** Execution context */
  context?: Context;
}

/**
 * Selection outcome for learning system
 *
 * Tracks the outcome of a framework selection to enable learning
 * and improvement of selection accuracy over time.
 */
export interface SelectionOutcome {
  /** Unique identifier for this selection */
  selectionId: string;

  /** ID of the framework that was selected */
  frameworkId: string;

  /** Problem classification that led to this selection */
  problemClassification: {
    /** Complexity level */
    complexity: ComplexityLevel;
    /** Uncertainty level */
    uncertainty: UncertaintyLevel;
    /** Stakes level */
    stakes: StakesLevel;
    /** Time pressure level */
    timePressure: TimePressureLevel;
  };

  /** Whether the selection was successful */
  wasSuccessful: boolean;

  /** User satisfaction score (0-1) */
  userSatisfaction: number;

  /** When this selection occurred */
  timestamp: Date;

  /** Execution time in milliseconds (optional) */
  executionTime?: number;

  /** Number of adaptations made during execution (optional) */
  adaptationCount?: number;

  /** Number of obstacles encountered (optional) */
  obstacleCount?: number;

  /** Additional notes about the outcome (optional) */
  notes?: string;
}

/**
 * User feedback on framework selection
 *
 * Captures explicit user feedback to improve framework selection
 * and adapt to user preferences over time.
 */
export interface UserFeedback {
  /** Unique identifier for this feedback */
  feedbackId: string;

  /** ID of the selection this feedback is for */
  selectionId: string;

  /** User rating (1-5 scale) */
  rating: number;

  /** When the feedback was provided */
  timestamp: Date;

  /** Optional comment from user */
  comment?: string;

  /** Framework user would have preferred (optional) */
  suggestedFramework?: string;

  /** Whether the framework was appropriate for the problem (optional) */
  wasFrameworkAppropriate?: boolean;
}

/**
 * Learning metrics for framework selection system
 *
 * Tracks overall learning progress and accuracy improvements
 * over time to measure system effectiveness.
 */
export interface LearningMetrics {
  /** Total number of framework selections made */
  totalSelections: number;

  /** Number of successful selections */
  successfulSelections: number;

  /** Average user satisfaction across all selections (0-1) */
  averageUserSatisfaction: number;

  /** Selection accuracy rate (0-1) */
  accuracyRate: number;

  /** Rate of improvement over time (0-1) */
  improvementRate: number;

  /** When these metrics were last updated */
  lastUpdated: Date;

  /** Domain-specific metrics (optional) */
  domainMetrics?: Record<string, { accuracy: number; count: number }>;
}

/**
 * Domain pattern for framework selection
 *
 * Captures patterns of successful framework selections for
 * specific problem domains to improve future selections.
 */
export interface DomainPattern {
  /** Domain identifier (e.g., "technical-debugging", "creative-design") */
  domain: string;

  /** Characteristic problem classification for this domain */
  characteristics: {
    /** Typical complexity level */
    complexity: ComplexityLevel;
    /** Typical uncertainty level */
    uncertainty: UncertaintyLevel;
    /** Typical stakes level */
    stakes: StakesLevel;
    /** Typical time pressure level */
    timePressure: TimePressureLevel;
  };

  /** Frameworks that work well for this domain (ordered by preference) */
  preferredFrameworks: string[];

  /** Success rate for this pattern (0-1) */
  successRate: number;

  /** Number of selections this pattern is based on */
  sampleSize: number;

  /** When this pattern was last updated (optional) */
  lastUpdated?: Date;

  /** Additional notes about this pattern (optional) */
  notes?: string;
}

/**
 * Scoring weights for framework selection
 *
 * Defines the relative importance of different dimensions
 * when scoring frameworks for selection. Can be adapted
 * based on learning and domain-specific patterns.
 */
export interface ScoringWeights {
  /** Weight for complexity dimension (0-1) */
  complexity: number;

  /** Weight for uncertainty dimension (0-1) */
  uncertainty: number;

  /** Weight for stakes dimension (0-1) */
  stakes: number;

  /** Weight for time pressure dimension (0-1) */
  timePressure: number;

  /** Domain these weights apply to (optional) */
  domain?: string;

  /** When these weights were last updated (optional) */
  lastUpdated?: Date;
}
