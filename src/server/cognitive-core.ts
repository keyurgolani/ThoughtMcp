/**
 * Cognitive Core Interface
 *
 * Defines the shared cognitive components interface used by both the MCP server
 * and REST API server. This ensures both servers share the same instances of
 * cognitive components to avoid resource duplication.
 *
 * Requirements: 16.2, 16.4
 */

import type { BiasPatternRecognizer } from "../bias/bias-pattern-recognizer.js";
import type { MultiDimensionalConfidenceAssessor } from "../confidence/multi-dimensional-assessor.js";
import type { CircumplexEmotionAnalyzer } from "../emotion/circumplex-analyzer.js";
import type { FrameworkSelector } from "../framework/framework-selector.js";
import type { MemoryRepository } from "../memory/memory-repository.js";
import type { MemoryAugmentedReasoning } from "../reasoning/memory-augmented-reasoning.js";
import type { ParallelReasoningOrchestrator } from "../reasoning/orchestrator.js";
import type { ProblemDecomposer } from "../reasoning/problem-decomposer.js";

/**
 * Cognitive Core Interface
 *
 * Contains all cognitive components shared between MCP server and REST API.
 */
export interface CognitiveCore {
  /** Memory repository for CRUD operations */
  memoryRepository: MemoryRepository;

  /** Parallel reasoning orchestrator for multi-stream reasoning */
  reasoningOrchestrator: ParallelReasoningOrchestrator;

  /** Framework selector for problem-solving approach selection */
  frameworkSelector: FrameworkSelector;

  /** Confidence assessor for multi-dimensional confidence analysis */
  confidenceAssessor: MultiDimensionalConfidenceAssessor;

  /** Bias detector for cognitive bias pattern recognition */
  biasDetector: BiasPatternRecognizer;

  /** Emotion analyzer using Circumplex model */
  emotionAnalyzer: CircumplexEmotionAnalyzer;

  /** Problem decomposer for breaking down complex problems */
  problemDecomposer: ProblemDecomposer;

  /** Memory-augmented reasoning for context-aware reasoning */
  memoryAugmentedReasoning: MemoryAugmentedReasoning;
}

/** Singleton instance of the shared cognitive core */
let sharedCore: CognitiveCore | null = null;

/**
 * Get the shared cognitive core instance
 *
 * This function returns the singleton instance of the cognitive core.
 * If no instance exists, it throws an error - the core must be initialized
 * by the main application before use.
 *
 * @returns The shared cognitive core instance
 * @throws Error if the cognitive core has not been initialized
 */
export function getSharedCore(): CognitiveCore {
  if (!sharedCore) {
    throw new Error("Cognitive core not initialized. Call initializeSharedCore() first.");
  }
  return sharedCore;
}

/**
 * Initialize the shared cognitive core
 *
 * This function sets the singleton instance of the cognitive core.
 * Should be called once during application startup.
 *
 * @param core - The cognitive core instance to share
 * @throws Error if the cognitive core has already been initialized
 */
export function initializeSharedCore(core: CognitiveCore): void {
  if (sharedCore) {
    throw new Error("Cognitive core already initialized");
  }
  sharedCore = core;
}

/**
 * Reset the shared cognitive core (for testing purposes)
 *
 * This function clears the singleton instance of the cognitive core.
 * Should only be used in tests.
 */
export function resetSharedCore(): void {
  sharedCore = null;
}

/**
 * Check if the shared cognitive core is initialized
 *
 * @returns true if the cognitive core has been initialized
 */
export function isSharedCoreInitialized(): boolean {
  return sharedCore !== null;
}
