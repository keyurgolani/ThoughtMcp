/**
 * Interfaces for probabilistic reasoning and uncertainty handling
 */

import { Context } from "../types/core.js";

// Core probabilistic reasoning interfaces
export interface ProbabilisticReasoningEngine {
  processWithUncertainty(
    input: string,
    context?: Context
  ): Promise<ProbabilisticReasoningResult>;
  updateBeliefs(
    evidence: Evidence,
    priorBeliefs: BeliefNetwork
  ): Promise<BeliefNetwork>;
  quantifyUncertainty(reasoning: ReasoningChain): UncertaintyAssessment;
  propagateUncertainty(
    beliefs: BeliefNetwork,
    evidence: Evidence[]
  ): UncertaintyPropagation;
}

export interface UncertaintyQuantifier {
  assessEpistemicUncertainty(knowledge: KnowledgeState): number;
  assessAleatoricUncertainty(data: DataPoint[]): number;
  combineUncertainties(
    epistemic: number,
    aleatoric: number
  ): CombinedUncertainty;
  trackConfidenceEvolution(reasoning: ReasoningStep[]): ConfidenceEvolution;
}

// Data structures
export interface ProbabilisticReasoningResult {
  conclusion: string;
  confidence: number;
  uncertainty_assessment: UncertaintyAssessment;
  belief_network: BeliefNetwork;
  evidence_integration: EvidenceIntegration;
  alternative_hypotheses: Hypothesis[];
  reasoning_chain: ReasoningChain;
  processing_time_ms: number;
}

export interface BeliefNetwork {
  nodes: Map<string, BeliefNode>;
  edges: Map<string, BeliefEdge>;
  prior_probabilities: Map<string, number>;
  conditional_probabilities: Map<string, ConditionalProbability>;
  evidence_nodes: string[];
}

export interface BeliefNode {
  id: string;
  name: string;
  type: "hypothesis" | "evidence" | "intermediate";
  probability: number;
  uncertainty: number;
  dependencies: string[];
  evidence_support: Evidence[];
}

export interface BeliefEdge {
  from: string;
  to: string;
  strength: number;
  type: "causal" | "evidential" | "logical";
  confidence: number;
}

export interface ConditionalProbability {
  given: string[];
  target: string;
  probability: number;
  confidence: number;
}

export interface Evidence {
  id: string;
  content: string;
  type: "observational" | "testimonial" | "statistical" | "logical";
  reliability: number;
  relevance: number;
  timestamp: number;
  source: string;
  weight: number;
}

export interface UncertaintyAssessment {
  epistemic_uncertainty: number; // Uncertainty due to lack of knowledge
  aleatoric_uncertainty: number; // Uncertainty due to inherent randomness
  combined_uncertainty: number;
  confidence_interval: [number, number];
  uncertainty_sources: UncertaintySource[];
  reliability_assessment: number;
}

export interface UncertaintySource {
  type:
    | "data_quality"
    | "model_limitations"
    | "incomplete_information"
    | "conflicting_evidence";
  description: string;
  impact: number;
  mitigation_suggestions: string[];
}

export interface CombinedUncertainty {
  total_uncertainty: number;
  epistemic_component: number;
  aleatoric_component: number;
  interaction_effects: number;
  confidence_bounds: [number, number];
}

export interface ConfidenceEvolution {
  initial_confidence: number;
  final_confidence: number;
  confidence_trajectory: number[];
  confidence_changes: ConfidenceChange[];
  stability_measure: number;
}

export interface ConfidenceChange {
  step: number;
  old_confidence: number;
  new_confidence: number;
  reason: string;
  evidence_impact: number;
}

export interface EvidenceIntegration {
  total_evidence_count: number;
  evidence_quality_score: number;
  conflicting_evidence: Evidence[];
  supporting_evidence: Evidence[];
  evidence_synthesis: string;
  reliability_weighted_score: number;
}

export interface Hypothesis {
  id: string;
  description: string;
  probability: number;
  evidence_support: Evidence[];
  alternative_explanations: string[];
  testable_predictions: string[];
  confidence: number;
}

export interface ReasoningChain {
  steps: ReasoningStep[];
  logical_structure: string;
  confidence_propagation: number[];
  uncertainty_propagation: number[];
  branch_points: BranchPoint[];
}

export interface ReasoningStep {
  id: string;
  type: "premise" | "inference" | "conclusion" | "assumption";
  content: string;
  confidence: number;
  uncertainty: number;
  evidence_basis: Evidence[];
  logical_form: string;
  alternatives: string[];
}

export interface BranchPoint {
  step_id: string;
  alternatives: Alternative[];
  selection_rationale: string;
  confidence_impact: number;
}

export interface Alternative {
  description: string;
  probability: number;
  consequences: string[];
  evidence_requirements: string[];
}

export interface UncertaintyPropagation {
  initial_uncertainty: Map<string, number>;
  final_uncertainty: Map<string, number>;
  propagation_path: PropagationStep[];
  uncertainty_amplification: number;
  critical_nodes: string[];
}

export interface PropagationStep {
  from_node: string;
  to_node: string;
  uncertainty_transfer: number;
  amplification_factor: number;
  method: string;
}

export interface KnowledgeState {
  known_facts: string[];
  uncertain_beliefs: Map<string, number>;
  knowledge_gaps: string[];
  confidence_in_knowledge: number;
  last_updated: number;
}

export interface DataPoint {
  value: unknown;
  uncertainty: number;
  source: string;
  timestamp: number;
  reliability: number;
}

// Bayesian updating interfaces
export interface BayesianUpdate {
  prior: number;
  likelihood: number;
  evidence: number;
  posterior: number;
  bayes_factor: number;
  update_strength: number;
}

export interface BayesianNetwork {
  variables: Map<string, BayesianVariable>;
  dependencies: Map<string, string[]>;
  conditional_tables: Map<string, ConditionalProbabilityTable>;
  evidence: Map<string, unknown>;
}

export interface BayesianVariable {
  name: string;
  domain: unknown[];
  current_belief: number[];
  prior_belief: number[];
  evidence_impact: number;
}

export interface ConditionalProbabilityTable {
  variable: string;
  parents: string[];
  probabilities: Map<string, number>;
  confidence: number;
}
