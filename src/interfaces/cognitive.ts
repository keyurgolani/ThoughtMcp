/**
 * Core interfaces for cognitive components
 */

import { 
  CognitiveInput, 
  ThoughtResult, 
  MemoryChunk, 
  Episode, 
  Concept, 
  EmotionalState, 
  ReasoningStep,
  ProcessingMode,
  Context
} from '../types/core.js';

// Base interface for all cognitive components
export interface CognitiveComponent {
  initialize(config: any): Promise<void>;
  process(input: any): Promise<any>;
  reset(): void;
  getStatus(): ComponentStatus;
}

export interface ComponentStatus {
  name: string;
  initialized: boolean;
  active: boolean;
  last_activity: number;
  error?: string;
}

// Sensory processing interface
export interface ISensoryProcessor extends CognitiveComponent {
  tokenize(input: string): string[];
  filterAttention(tokens: string[], threshold: number): string[];
  detectPatterns(tokens: string[]): Pattern[];
  computeSalience(tokens: string[]): SalienceMap;
}

export interface Pattern {
  type: string;
  content: string[];
  confidence: number;
  salience: number;
}

export interface SalienceMap {
  tokens: string[];
  scores: number[];
  attention_focus: string[];
}

// Working memory interface
export interface IWorkingMemory extends CognitiveComponent {
  addChunk(chunk: MemoryChunk): boolean;
  getActiveChunks(): MemoryChunk[];
  rehearse(): void;
  decay(): void;
  getCapacity(): number;
  getCurrentLoad(): number;
}

// Dual-process thinking interfaces
export interface ISystem1Processor extends CognitiveComponent {
  processIntuitive(input: CognitiveInput): Promise<ThoughtResult>;
  matchPatterns(input: string): Pattern[];
  applyHeuristics(input: string, patterns: Pattern[]): any;
  getConfidence(result: any): number;
}

export interface ISystem2Processor extends CognitiveComponent {
  processDeliberative(input: CognitiveInput): Promise<ThoughtResult>;
  buildReasoningTree(input: string, maxDepth: number): ReasoningTree;
  evaluateOptions(options: any[]): any;
  checkConsistency(reasoning: ReasoningStep[]): boolean;
}

export interface ReasoningTree {
  root: ReasoningNode;
  depth: number;
  branches: number;
}

export interface ReasoningNode {
  content: string;
  confidence: number;
  children: ReasoningNode[];
  parent?: ReasoningNode;
}

// Memory system interfaces
export interface IEpisodicMemory extends CognitiveComponent {
  store(episode: Episode): string;
  retrieve(cue: string, threshold: number): Episode[];
  decay(): void;
  consolidate(): Episode[];
  getSize(): number;
}

export interface ISemanticMemory extends CognitiveComponent {
  store(concept: Concept): string;
  retrieve(cue: string, threshold: number): Concept[];
  addRelation(from: string, to: string, type: string, strength: number): void;
  getRelated(conceptId: string): Concept[];
  updateActivation(conceptId: string, delta: number): void;
}

export interface IConsolidationEngine extends CognitiveComponent {
  consolidate(episodes: Episode[]): Concept[];
  extractPatterns(episodes: Episode[]): Pattern[];
  strengthenConnections(concepts: Concept[]): void;
  pruneWeakMemories(threshold: number): void;
}

// Emotional processing interface
export interface IEmotionalProcessor extends CognitiveComponent {
  assessEmotion(input: string): EmotionalState;
  applySomaticMarkers(options: any[]): any[];
  modulateReasoning(reasoning: ReasoningStep[], emotion: EmotionalState): ReasoningStep[];
  updateEmotionalState(newState: Partial<EmotionalState>): void;
}

// Metacognitive monitoring interface
export interface IMetacognitionModule extends CognitiveComponent {
  monitorConfidence(reasoning: ReasoningStep[]): number;
  detectBiases(reasoning: ReasoningStep[]): string[];
  assessCoherence(reasoning: ReasoningStep[]): number;
  suggestImprovements(reasoning: ReasoningStep[]): string[];
}

// Predictive processing interface
export interface IPredictiveProcessor extends CognitiveComponent {
  generatePredictions(context: Context): Prediction[];
  computePredictionError(prediction: Prediction, actual: any): number;
  updateModel(error: number, prediction: Prediction): void;
  getBayesianUpdate(prior: number, likelihood: number, evidence: number): number;
}

export interface Prediction {
  content: any;
  confidence: number;
  timestamp: number;
  context: Context;
}

// Stochastic neural processing interface
export interface IStochasticNeuralProcessor extends CognitiveComponent {
  addNoise(signal: number[], noiseLevel: number): number[];
  applyStochasticResonance(signal: number[], noiseLevel: number): number[];
  sampleFromDistribution(distribution: number[]): number;
  adjustTemperature(temperature: number): void;
}

// Main cognitive orchestrator interface
export interface ICognitiveOrchestrator extends CognitiveComponent {
  think(input: CognitiveInput): Promise<ThoughtResult>;
  initializeComponents(): Promise<void>;
  getComponentStatus(componentName: string): ComponentStatus;
  setProcessingMode(mode: ProcessingMode): void;
}