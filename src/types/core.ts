/**
 * Core data types and interfaces for the cognitive architecture
 */

// Token interface for sensory processing
export interface Token {
  text: string;
  position: number;
  semantic_weight: number;
  attention_score: number;
  context_tags: string[];
}

// Processing modes for different thinking styles
export enum ProcessingMode {
  INTUITIVE = "intuitive",
  DELIBERATIVE = "deliberative",
  BALANCED = "balanced",
  CREATIVE = "creative",
  ANALYTICAL = "analytical",
}

// Type alias for processing mode values
export type ProcessingModeValue = `${ProcessingMode}` | ProcessingMode;

// Types of reasoning steps
export enum ReasoningType {
  PATTERN_MATCH = "pattern_match",
  LOGICAL_INFERENCE = "logical_inference",
  ANALOGICAL = "analogical",
  CAUSAL = "causal",
  PROBABILISTIC = "probabilistic",
  METACOGNITIVE = "metacognitive",
  DEDUCTIVE = "deductive",
  INDUCTIVE = "inductive",
  ABDUCTIVE = "abductive",
  HEURISTIC = "heuristic",
  CONTEXTUAL = "contextual",
}

// Type alias for reasoning type values
export type ReasoningTypeValue = `${ReasoningType}` | ReasoningType;

// Context information for cognitive processing
export interface Context {
  session_id: string;
  previous_thoughts?: string[];
  domain?: string;
  urgency?: number;
  complexity?: number;
  timestamp?: number;
  working_memory?: unknown;
  emotional_context?: EmotionalState;
  predictions?: unknown;
  memories?: unknown;
  [key: string]: unknown; // Allow additional properties
}

// Alternative reasoning paths
export interface Alternative {
  content: string;
  confidence: number;
  reasoning: string;
}

// Individual reasoning steps in the thought process
export interface ReasoningStep {
  type: ReasoningTypeValue;
  content: string;
  confidence: number;
  alternatives: Alternative[];
  metadata?: Record<string, unknown>;
}

// Emotional state representation
export interface EmotionalState {
  valence: number; // -1 to 1 (negative to positive)
  arousal: number; // 0 to 1 (calm to excited)
  dominance: number; // 0 to 1 (submissive to dominant)
  specific_emotions: Map<string, number>;
}

// Response from intuitive processing (System 1)
export interface IntuitiveResponse {
  content: string;
  confidence: number;
  processing_time: number;
  heuristics_used: string[];
  patterns_detected: string[];
}

// Response from deliberative processing (System 2)
export interface DeliberativeResponse {
  content: string;
  confidence: number;
  processing_time: number;
  reasoning_steps: ReasoningStep[];
  alternatives_considered: Alternative[];
}

// Dual process information
export interface DualProcessInfo {
  system1_response?: IntuitiveResponse;
  system2_response?: DeliberativeResponse;
  conflict_detected: boolean;
  resolution_strategy: string;
  processing_time_system1: number;
  processing_time_system2: number;
  dual_process_decision?: {
    selected_system: string;
    reasoning: string;
  };
  system1_confidence?: number;
  system2_confidence?: number | null;
  conflict_resolution?: unknown;
  total_processing_time?: number;
}

// Metadata for thought results
export interface ThoughtMetadata {
  processing_time_ms: number;
  components_used: string[];
  memory_retrievals: number;
  system_mode: ProcessingModeValue;
  temperature: number;
  dual_process_info?: DualProcessInfo;
  metacognitive_assessment?: unknown;
  stochastic_processing?: unknown;
  [key: string]: unknown; // Allow additional properties
}

// Main result structure for thinking operations
export interface ThoughtResult {
  content: string;
  confidence: number;
  reasoning_path: ReasoningStep[];
  emotional_context: EmotionalState;
  metadata: ThoughtMetadata;
}

// Input structure for cognitive processing
export interface CognitiveInput {
  input: string;
  context: Context;
  mode: ProcessingModeValue;
  configuration: CognitiveConfig;
}

// Memory chunk representation
export interface MemoryChunk {
  content: unknown;
  activation: number;
  timestamp: number;
  associations: Set<string>;
  emotional_valence: number;
  importance: number;
  context_tags: string[];
}

// Episode in episodic memory
export interface Episode {
  content: unknown;
  context: Context;
  timestamp: number;
  emotional_tags: string[];
  importance: number;
  decay_factor: number;
}

// Concept in semantic memory
export interface Concept {
  id: string;
  content: unknown;
  embedding?: number[];
  relations: string[];
  activation: number;
  last_accessed: number;
}

// Relation between concepts
export interface Relation {
  from: string;
  to: string;
  type: string;
  strength: number;
}

// Configuration for cognitive processing
export interface CognitiveConfig {
  // Processing modes
  default_mode: ProcessingModeValue;
  enable_emotion: boolean;
  enable_metacognition: boolean;
  enable_prediction: boolean;

  // Memory settings
  working_memory_capacity: number;
  episodic_memory_size: number;
  semantic_memory_size: number;
  consolidation_interval: number;

  // Neural processing
  noise_level: number;
  temperature: number;
  attention_threshold: number;

  // Performance settings
  max_reasoning_depth: number;
  timeout_ms: number;
  max_concurrent_sessions: number;

  // Thresholds
  confidence_threshold: number;
  system2_activation_threshold: number;
  memory_retrieval_threshold: number;

  // Systematic thinking configuration
  enable_systematic_thinking?: boolean;
  systematic_thinking_mode?: "auto" | "hybrid" | "manual";

  // Brain directory configuration
  brain_dir?: string;
}
