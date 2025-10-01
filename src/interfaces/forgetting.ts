/**
 * Forgetting System Interfaces
 *
 * Defines interfaces for selective forgetting mechanisms including
 * forgetting strategies, evaluation engines, and decision synthesis.
 */

import { Concept, Episode } from "../types/core.js";

// Base forgetting strategy interface
export interface ForgettingStrategy {
  name: string;
  description: string;

  /**
   * Evaluate a memory item for potential forgetting
   * @param memory The memory item to evaluate
   * @param context Current context and system state
   * @returns Forgetting score (0-1, higher means more likely to forget)
   */
  evaluateForForgetting(
    memory: Episode | Concept,
    context: ForgettingContext
  ): Promise<ForgettingScore>;
}

// Temporal decay strategy - forgets based on age and access patterns
export interface TemporalDecayStrategy extends ForgettingStrategy {
  decay_rate: number;
  recency_weight: number;
  access_frequency_weight: number;
}

// Interference-based strategy - forgets memories that conflict with newer ones
export interface InterferenceBasedStrategy extends ForgettingStrategy {
  similarity_threshold: number;
  conflict_resolution_mode: "keep_newer" | "keep_stronger" | "merge";
  interference_weight: number;
}

// Importance-based strategy - forgets less important memories first
export interface ImportanceBasedStrategy extends ForgettingStrategy {
  importance_threshold: number;
  emotional_weight: number;
  context_relevance_weight: number;
}

// Context for forgetting evaluation
export interface ForgettingContext {
  current_time: number;
  memory_pressure: number; // 0-1, how much memory pressure exists
  recent_access_patterns: AccessPattern[];
  system_goals: string[];
  user_preferences: UserForgettingPreferences;
}

// Access pattern tracking
export interface AccessPattern {
  memory_id: string;
  access_time: number;
  access_type: "retrieval" | "update" | "reference";
  context_similarity: number;
}

// User preferences for forgetting
export interface UserForgettingPreferences {
  consent_required: boolean;
  protected_categories: string[];
  max_auto_forget_importance: number;
  retention_period_days: number;
}

// Forgetting score result
export interface ForgettingScore {
  strategy_name: string;
  score: number; // 0-1, higher means more likely to forget
  confidence: number; // 0-1, confidence in the score
  reasoning: string[];
  factors: ForgettingFactor[];
}

// Individual factors contributing to forgetting decision
export interface ForgettingFactor {
  name: string;
  value: number;
  weight: number;
  description: string;
}

// Forgetting evaluation engine interface
export interface IForgettingEvaluationEngine {
  /**
   * Evaluate memories for potential forgetting using multiple strategies
   */
  evaluateMemories(
    memories: (Episode | Concept)[],
    context: ForgettingContext
  ): Promise<ForgettingEvaluation[]>;

  /**
   * Add a forgetting strategy to the engine
   */
  addStrategy(strategy: ForgettingStrategy): void;

  /**
   * Remove a forgetting strategy from the engine
   */
  removeStrategy(strategyName: string): void;

  /**
   * Get all registered strategies
   */
  getStrategies(): ForgettingStrategy[];
}

// Comprehensive forgetting evaluation result
export interface ForgettingEvaluation {
  memory_id: string;
  memory_type: "episodic" | "semantic";
  memory_content_summary: string;
  strategy_scores: ForgettingScore[];
  combined_score: number;
  recommendation: ForgettingRecommendation;
  requires_user_consent: boolean;
  estimated_impact: ForgettingImpact;
}

// Forgetting recommendation
export interface ForgettingRecommendation {
  action: "forget" | "retain" | "degrade" | "archive";
  confidence: number;
  reasoning: string;
  alternative_actions: string[];
}

// Impact assessment of forgetting a memory
export interface ForgettingImpact {
  retrieval_loss_probability: number;
  related_memories_affected: number;
  knowledge_gap_risk: number;
  recovery_difficulty: number;
}

// Decision synthesis interface
export interface IForgettingDecisionSynthesizer {
  /**
   * Synthesize forgetting decisions from multiple strategy evaluations
   */
  synthesizeDecisions(
    evaluations: ForgettingEvaluation[],
    context: ForgettingContext
  ): Promise<ForgettingDecision[]>;

  /**
   * Request user consent for forgetting decisions
   */
  requestUserConsent(decisions: ForgettingDecision[]): Promise<ConsentResult[]>;
}

// Final forgetting decision
export interface ForgettingDecision {
  memory_id: string;
  action: "forget" | "retain" | "degrade" | "archive";
  confidence: number;
  reasoning: string;
  user_consent_required: boolean;
  user_consent_obtained?: boolean;
  execution_priority: number; // 1-10, higher means execute sooner
  estimated_benefit: ForgettingBenefit;
}

// Benefits of forgetting a memory
export interface ForgettingBenefit {
  memory_space_freed: number;
  processing_speed_improvement: number;
  interference_reduction: number;
  focus_improvement: number;
}

// User consent result
export interface ConsentResult {
  memory_id: string;
  consent_granted: boolean;
  user_feedback?: string;
  alternative_action?: string;
}

// Gradual degradation system interfaces

// Degradation stage configuration
export interface DegradationStage {
  stage_id: string;
  name: string;
  description: string;
  degradation_factor: number; // 0-1, how much to degrade (0 = no change, 1 = complete removal)
  duration_ms: number; // How long this stage lasts
  reversible: boolean; // Whether this stage can be reversed
  metadata_preservation: MetadataPreservationLevel;
}

// Levels of metadata preservation during degradation
export enum MetadataPreservationLevel {
  FULL = "full", // Preserve all metadata
  PARTIAL = "partial", // Preserve essential metadata only
  MINIMAL = "minimal", // Preserve only recovery-critical metadata
  NONE = "none", // No metadata preservation
}

// Recovery metadata preserved during degradation
export interface RecoveryMetadata {
  original_memory_id: string;
  original_content_hash: string;
  original_importance: number;
  original_timestamp: number;
  degradation_history: DegradationRecord[];
  recovery_cues: RecoveryCue[];
  association_fingerprint: AssociationFingerprint;
  content_summary: string;
  recovery_difficulty_estimate: number;
  preservation_timestamp: number;
}

// Record of degradation applied to a memory
export interface DegradationRecord {
  stage_id: string;
  applied_timestamp: number;
  degradation_factor: number;
  content_before_hash: string;
  content_after_hash: string;
  metadata_preserved: MetadataPreservationLevel;
  reversible: boolean;
}

// Cues that can help recover degraded memories
export interface RecoveryCue {
  type: "semantic" | "temporal" | "contextual" | "associative" | "emotional";
  value: string;
  strength: number; // 0-1, how strong this cue is for recovery
  source: string; // Where this cue came from
}

// Fingerprint of memory associations for recovery
export interface AssociationFingerprint {
  strong_associations: string[]; // IDs of strongly associated memories
  weak_associations: string[]; // IDs of weakly associated memories
  semantic_clusters: string[]; // Semantic cluster IDs this memory belonged to
  temporal_neighbors: string[]; // Memories from similar time periods
  contextual_tags: string[]; // Context tags that were associated
}

// Status of memory degradation
export interface DegradationStatus {
  memory_id: string;
  current_stage: string;
  degradation_level: number; // 0-1, current level of degradation
  stages_completed: string[];
  next_stage?: string;
  next_stage_scheduled_time?: number;
  is_paused: boolean;
  is_reversible: boolean;
  recovery_metadata?: RecoveryMetadata;
}

// Process for managing gradual degradation
export interface DegradationProcess {
  process_id: string;
  memory_id: string;
  target_degradation_level: number;
  stages: DegradationStage[];
  current_stage_index: number;
  status: DegradationStatus;
  created_timestamp: number;
  last_updated_timestamp: number;
  completion_callback?: (process: DegradationProcess) => Promise<void>;
}

// Gradual degradation manager interface
export interface IGradualDegradationManager {
  /**
   * Initialize a gradual degradation process for a memory
   */
  initiateDegradation(
    memory: Episode | Concept,
    target_degradation_level: number,
    stages?: DegradationStage[]
  ): Promise<DegradationProcess>;

  /**
   * Execute the next stage of degradation for a process
   */
  executeNextStage(process_id: string): Promise<DegradationStatus>;

  /**
   * Pause a degradation process
   */
  pauseDegradation(process_id: string): Promise<void>;

  /**
   * Resume a paused degradation process
   */
  resumeDegradation(process_id: string): Promise<void>;

  /**
   * Cancel a degradation process and attempt recovery
   */
  cancelDegradation(process_id: string): Promise<RecoveryResult>;

  /**
   * Get the status of a degradation process
   */
  getDegradationStatus(process_id: string): Promise<DegradationStatus>;

  /**
   * Get all active degradation processes
   */
  getActiveDegradationProcesses(): Promise<DegradationProcess[]>;

  /**
   * Schedule automatic degradation execution
   */
  scheduleAutomaticExecution(): Promise<void>;

  /**
   * Preserve recovery metadata for a memory before degradation
   */
  preserveRecoveryMetadata(
    memory: Episode | Concept,
    degradation_level: number
  ): Promise<RecoveryMetadata>;
}

// Recovery result from degradation cancellation or recovery attempt
export interface RecoveryResult {
  success: boolean;
  recovered_memory?: Episode | Concept;
  recovery_confidence: number;
  recovery_method: string;
  partial_recovery: boolean;
  missing_elements: string[];
  recovery_metadata_used: RecoveryMetadata;
}

// Memory usage analysis interface
export interface IMemoryUsageAnalyzer {
  /**
   * Analyze current memory usage and identify optimization opportunities
   */
  analyzeMemoryUsage(): Promise<MemoryUsageAnalysis>;

  /**
   * Get memory optimization recommendations
   */
  getOptimizationRecommendations(
    analysis: MemoryUsageAnalysis
  ): Promise<MemoryOptimizationRecommendation[]>;
}

// Memory usage analysis result
export interface MemoryUsageAnalysis {
  total_memories: number;
  episodic_memories: number;
  semantic_memories: number;
  memory_size_bytes: number;
  average_access_frequency: number;
  memory_pressure_level: number; // 0-1
  fragmentation_level: number; // 0-1
  oldest_memory_age_days: number;
  newest_memory_age_days: number;
  low_importance_memories: number;
  rarely_accessed_memories: number;
  conflicting_memories: number;
  optimization_potential: number; // 0-1
}

// Memory optimization recommendation
export interface MemoryOptimizationRecommendation {
  type: "forget" | "compress" | "archive" | "consolidate";
  target_memories: string[];
  estimated_benefit: ForgettingBenefit;
  risk_level: "low" | "medium" | "high";
  description: string;
  requires_user_consent: boolean;
}

// Recovery system interfaces

// Recovery engine interface
export interface IRecoveryEngine {
  /**
   * Attempt to recover a degraded or forgotten memory using various strategies
   */
  attemptRecovery(
    memory_id: string,
    recovery_cues: RecoveryCue[],
    recovery_metadata?: RecoveryMetadata
  ): Promise<RecoveryResult>;

  /**
   * Assess confidence in recovered memory content
   */
  assessRecoveryConfidence(
    recovered_content: unknown,
    original_metadata: RecoveryMetadata
  ): Promise<RecoveryConfidenceAssessment>;

  /**
   * Track recovery success and learn from patterns
   */
  trackRecoverySuccess(
    memory_id: string,
    recovery_result: RecoveryResult,
    user_validation?: RecoveryValidation
  ): Promise<void>;

  /**
   * Get recovery statistics and improvement metrics
   */
  getRecoveryStatistics(): Promise<RecoveryStatistics>;

  /**
   * Add a recovery strategy to the engine
   */
  addRecoveryStrategy(strategy: RecoveryStrategy): void;

  /**
   * Remove a recovery strategy from the engine
   */
  removeRecoveryStrategy(strategyName: string): void;
}

// Base recovery strategy interface
export interface RecoveryStrategy {
  name: string;
  description: string;
  confidence_threshold: number; // Minimum confidence to attempt recovery

  /**
   * Attempt to recover memory using this strategy
   */
  recover(
    memory_id: string,
    recovery_cues: RecoveryCue[],
    recovery_metadata: RecoveryMetadata
  ): Promise<RecoveryAttempt>;

  /**
   * Assess the likelihood of successful recovery
   */
  assessRecoveryProbability(
    recovery_cues: RecoveryCue[],
    recovery_metadata: RecoveryMetadata
  ): Promise<number>;
}

// Associative recovery strategy
export interface AssociativeRecoveryStrategy extends RecoveryStrategy {
  association_weight: number;
  spreading_activation_depth: number;
  similarity_threshold: number;
}

// Schema-based recovery strategy
export interface SchemaBasedRecoveryStrategy extends RecoveryStrategy {
  schema_matching_threshold: number;
  pattern_completion_enabled: boolean;
  contextual_inference_weight: number;
}

// Partial cue recovery strategy
export interface PartialCueRecoveryStrategy extends RecoveryStrategy {
  minimum_cue_strength: number;
  cue_combination_method: "weighted_sum" | "max_activation" | "consensus";
  temporal_decay_compensation: boolean;
}

// Recovery attempt result
export interface RecoveryAttempt {
  strategy_name: string;
  success: boolean;
  recovered_content?: unknown;
  confidence: number;
  partial_recovery: boolean;
  recovered_elements: string[];
  missing_elements: string[];
  recovery_method_details: string;
  processing_time_ms: number;
}

// Enhanced recovery result with detailed information
export interface EnhancedRecoveryResult extends RecoveryResult {
  recovery_attempts: RecoveryAttempt[];
  best_attempt: RecoveryAttempt;
  combined_confidence: number;
  recovery_strategies_used: string[];
  recovery_time_ms: number;
  quality_assessment: RecoveryQualityAssessment;
}

// Recovery confidence assessment
export interface RecoveryConfidenceAssessment {
  overall_confidence: number;
  content_accuracy_estimate: number;
  completeness_estimate: number;
  reliability_factors: ReliabilityFactor[];
  uncertainty_sources: UncertaintySource[];
  validation_suggestions: string[];
}

// Factors affecting recovery reliability
export interface ReliabilityFactor {
  factor_name: string;
  impact: number; // -1 to 1, negative reduces confidence
  description: string;
  evidence: string[];
}

// Sources of uncertainty in recovery
export interface UncertaintySource {
  source_name: string;
  uncertainty_level: number; // 0 to 1
  description: string;
  mitigation_strategies: string[];
}

// Recovery quality assessment
export interface RecoveryQualityAssessment {
  content_coherence: number;
  contextual_consistency: number;
  temporal_accuracy: number;
  associative_integrity: number;
  overall_quality: number;
  quality_issues: QualityIssue[];
}

// Quality issues identified in recovery
export interface QualityIssue {
  issue_type: "inconsistency" | "gap" | "distortion" | "contamination";
  severity: "low" | "medium" | "high";
  description: string;
  affected_content: string[];
  suggested_resolution: string;
}

// User validation of recovery results
export interface RecoveryValidation {
  memory_id: string;
  user_confirms_accuracy: boolean;
  accuracy_rating: number; // 0 to 1
  completeness_rating: number; // 0 to 1
  user_corrections?: string;
  user_feedback?: string;
  validation_timestamp: number;
}

// Recovery statistics and metrics
export interface RecoveryStatistics {
  total_recovery_attempts: number;
  successful_recoveries: number;
  partial_recoveries: number;
  failed_recoveries: number;
  average_recovery_confidence: number;
  average_recovery_time_ms: number;
  strategy_success_rates: Map<string, number>;
  improvement_trends: RecoveryTrend[];
  common_failure_patterns: FailurePattern[];
}

// Recovery improvement trends
export interface RecoveryTrend {
  metric_name: string;
  trend_direction: "improving" | "declining" | "stable";
  change_rate: number;
  time_period_days: number;
  significance: number;
}

// Common failure patterns in recovery
export interface FailurePattern {
  pattern_name: string;
  frequency: number;
  typical_causes: string[];
  suggested_improvements: string[];
  affected_memory_types: string[];
}
