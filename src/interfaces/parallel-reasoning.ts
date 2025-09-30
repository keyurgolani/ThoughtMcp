/**
 * Interfaces for parallel reasoning streams system
 */

import { Context, ReasoningStep } from "../types/core.js";
import { Problem } from "./systematic-thinking.js";

// Stream types for different reasoning approaches
export type ReasoningStreamType =
  | "analytical"
  | "creative"
  | "critical"
  | "synthetic";

// Base interface for reasoning streams
export interface ReasoningStream {
  id: string;
  type: ReasoningStreamType;
  name: string;
  description: string;

  // Core processing method
  process(problem: Problem, context?: Context): Promise<StreamResult>;

  // Stream management
  initialize(): Promise<void>;
  reset(): void;
  getStatus(): StreamStatus;
}

// Result from a single reasoning stream
export interface StreamResult {
  stream_id: string;
  stream_type: ReasoningStreamType;
  reasoning_steps: ReasoningStep[];
  conclusions: string[];
  confidence: number;
  processing_time_ms: number;
  insights: string[];
  evidence: Evidence[];
  assumptions: string[];
}

// Evidence supporting reasoning
export interface Evidence {
  content: string;
  source: string;
  reliability: number;
  relevance: number;
}

// Status of a reasoning stream
export interface StreamStatus {
  stream_id: string;
  active: boolean;
  processing: boolean;
  last_activity: number;
  error?: string;
}

// Coordination between streams
export interface StreamCoordination {
  synchronization_points: SynchronizationPoint[];
  conflict_resolutions: ConflictResolution[];
  consensus_building: ConsensusBuilding;
  information_sharing: InformationSharing[];
}

// Points where streams synchronize
export interface SynchronizationPoint {
  timestamp: number;
  participating_streams: string[];
  shared_insights: string[];
  coordination_type:
    | "information_exchange"
    | "conflict_resolution"
    | "consensus_building";
}

// Resolution of conflicts between streams
export interface ConflictResolution {
  conflicting_streams: string[];
  conflict_description: string;
  resolution_strategy: string;
  resolved_conclusion: string;
  confidence: number;
}

// Building consensus across streams
export interface ConsensusBuilding {
  participating_streams: string[];
  consensus_points: string[];
  disagreement_points: string[];
  final_consensus: string;
  consensus_confidence: number;
}

// Information sharing between streams
export interface InformationSharing {
  from_stream: string;
  to_stream: string;
  shared_information: string;
  information_type: "insight" | "evidence" | "assumption" | "conclusion";
  timestamp: number;
}

// Parallel reasoning processor interface
export interface IParallelReasoningProcessor {
  // Core processing
  processParallel(
    problem: Problem,
    context?: Context
  ): Promise<ParallelReasoningResult>;

  // Stream management
  initializeStreams(problem: Problem): Promise<ReasoningStream[]>;
  coordinateStreams(
    streams: ReasoningStream[],
    problem: Problem
  ): Promise<StreamCoordination>;
  synchronizeStreams(
    streams: ReasoningStream[]
  ): Promise<SynchronizationPoint[]>;

  // Conflict resolution
  detectConflicts(results: StreamResult[]): ConflictDetection[];
  resolveConflicts(
    conflicts: ConflictDetection[]
  ): Promise<ConflictResolution[]>;

  // Consensus building
  buildConsensus(results: StreamResult[]): Promise<ConsensusBuilding>;

  // Synthesis
  synthesizeResults(
    results: StreamResult[],
    coordination: StreamCoordination,
    originalProblem?: Problem,
    processingTime?: number
  ): ParallelReasoningResult;

  // Management
  initialize(): Promise<void>;
  reset(): void;
}

// Conflict detection between streams
export interface ConflictDetection {
  stream_ids: string[];
  conflict_type: "conclusion" | "evidence" | "assumption" | "reasoning";
  description: string;
  severity: number; // 0-1 scale
}

// Result from parallel reasoning
export interface ParallelReasoningResult {
  problem: Problem;
  stream_results: StreamResult[];
  coordination: StreamCoordination;
  synthesized_conclusion: string;
  confidence: number;
  processing_time_ms: number;
  insights: string[];
  recommendations: string[];
  alternative_perspectives: AlternativePerspective[];
}

// Alternative perspectives from different streams
export interface AlternativePerspective {
  stream_type: ReasoningStreamType;
  perspective: string;
  supporting_evidence: Evidence[];
  confidence: number;
}

// Stream synchronization manager interface
export interface IStreamSynchronizationManager {
  // Synchronization management
  scheduleSynchronization(
    streams: ReasoningStream[],
    interval_ms: number
  ): Promise<void>;
  executeSynchronization(
    streams: ReasoningStream[]
  ): Promise<SynchronizationPoint>;

  // Real-time coordination
  enableRealTimeCoordination(streams: ReasoningStream[]): Promise<void>;
  shareInformation(
    from_stream: string,
    to_stream: string,
    information: string
  ): Promise<void>;

  // Conflict management
  monitorConflicts(streams: ReasoningStream[]): Promise<ConflictDetection[]>;
  facilitateResolution(
    conflict: ConflictDetection,
    streams: ReasoningStream[]
  ): Promise<ConflictResolution>;

  // Status monitoring
  getCoordinationStatus(): CoordinationStatus;

  // Management
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

// Status of stream coordination
export interface CoordinationStatus {
  active_streams: number;
  synchronization_points: number;
  conflicts_detected: number;
  conflicts_resolved: number;
  last_synchronization: number;
  coordination_efficiency: number; // 0-1 scale
}

// Specific stream implementations
export interface IAnalyticalReasoningStream extends ReasoningStream {
  analyzeLogically(problem: Problem): Promise<LogicalAnalysis>;
  evaluateEvidence(evidence: Evidence[]): Promise<EvidenceEvaluation>;
  buildArgumentChain(
    premises: string[],
    conclusion: string
  ): Promise<ArgumentChain>;
}

export interface ICreativeReasoningStream extends ReasoningStream {
  generateAlternatives(problem: Problem): Promise<CreativeAlternative[]>;
  exploreUnconventional(problem: Problem): Promise<UnconventionalApproach[]>;
  synthesizeNovelSolutions(insights: string[]): Promise<NovelSolution[]>;
}

export interface ICriticalReasoningStream extends ReasoningStream {
  identifyAssumptions(reasoning: ReasoningStep[]): Promise<Assumption[]>;
  evaluateArguments(
    argumentChains: ArgumentChain[]
  ): Promise<ArgumentEvaluation[]>;
  detectBiases(reasoning: ReasoningStep[]): Promise<BiasDetection[]>;
}

export interface ISyntheticReasoningStream extends ReasoningStream {
  integrateInsights(insights: string[]): Promise<IntegratedInsight>;
  reconcilePerspectives(
    perspectives: AlternativePerspective[]
  ): Promise<ReconciledPerspective>;
  generateHolistic(partial_solutions: string[]): Promise<HolisticSolution>;
}

// Supporting types for specific streams
export interface LogicalAnalysis {
  premises: string[];
  inferences: string[];
  conclusions: string[];
  logical_validity: number;
  soundness_assessment: string;
}

export interface EvidenceEvaluation {
  evidence_items: Evidence[];
  reliability_scores: number[];
  relevance_scores: number[];
  overall_strength: number;
}

export interface ArgumentChain {
  premises: string[];
  inference_steps: string[];
  conclusion: string;
  validity: number;
  strength: number;
}

export interface CreativeAlternative {
  alternative: string;
  novelty_score: number;
  feasibility: number;
  potential_impact: number;
}

export interface UnconventionalApproach {
  approach: string;
  rationale: string;
  risks: string[];
  benefits: string[];
}

export interface NovelSolution {
  solution: string;
  innovation_level: number;
  implementation_complexity: number;
  expected_outcomes: string[];
}

export interface Assumption {
  assumption: string;
  implicit: boolean;
  validity: number;
  impact_if_false: string;
}

export interface ArgumentEvaluation {
  argument: ArgumentChain;
  strengths: string[];
  weaknesses: string[];
  overall_quality: number;
}

export interface BiasDetection {
  bias_type: string;
  description: string;
  severity: number;
  mitigation_suggestions: string[];
}

export interface IntegratedInsight {
  integrated_understanding: string;
  key_themes: string[];
  synthesis_confidence: number;
  supporting_streams: string[];
}

export interface ReconciledPerspective {
  reconciled_view: string;
  common_ground: string[];
  remaining_differences: string[];
  confidence: number;
}

export interface HolisticSolution {
  solution: string;
  addresses_aspects: string[];
  integration_quality: number;
  completeness: number;
}
