/**
 * Validation functions for core data models
 */

import {
  Alternative,
  CognitiveConfig,
  CognitiveInput,
  Concept,
  Context,
  EmotionalState,
  Episode,
  MemoryChunk,
  ProcessingMode,
  ReasoningStep,
  ReasoningType,
  ThoughtMetadata,
  ThoughtResult,
} from "../types/core.js";

// Validation error class
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Helper function to check if value is within range
function isInRange(value: number, min: number, max: number): boolean {
  return (
    typeof value === "number" && !isNaN(value) && value >= min && value <= max
  );
}

// Helper function to check if value is a positive number
function isPositiveNumber(value: number): boolean {
  return typeof value === "number" && !isNaN(value) && value >= 0;
}

// Helper function to check if string is non-empty
function isNonEmptyString(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validates Context object
 */
export function validateContext(context: Context): void {
  if (!context || typeof context !== "object") {
    throw new ValidationError("Context must be a valid object", "context");
  }

  if (!isNonEmptyString(context.session_id)) {
    throw new ValidationError(
      "Context session_id must be a non-empty string",
      "context.session_id"
    );
  }

  if (context.urgency !== undefined && !isInRange(context.urgency, 0, 1)) {
    throw new ValidationError(
      "Context urgency must be between 0 and 1",
      "context.urgency"
    );
  }

  if (
    context.complexity !== undefined &&
    !isInRange(context.complexity, 0, 1)
  ) {
    throw new ValidationError(
      "Context complexity must be between 0 and 1",
      "context.complexity"
    );
  }

  if (
    context.previous_thoughts !== undefined &&
    !Array.isArray(context.previous_thoughts)
  ) {
    throw new ValidationError(
      "Context previous_thoughts must be an array",
      "context.previous_thoughts"
    );
  }
}

/**
 * Validates Alternative object
 */
export function validateAlternative(alternative: Alternative): void {
  if (!alternative || typeof alternative !== "object") {
    throw new ValidationError(
      "Alternative must be a valid object",
      "alternative"
    );
  }

  if (!isNonEmptyString(alternative.content)) {
    throw new ValidationError(
      "Alternative content must be a non-empty string",
      "alternative.content"
    );
  }

  if (!isInRange(alternative.confidence, 0, 1)) {
    throw new ValidationError(
      "Alternative confidence must be between 0 and 1",
      "alternative.confidence"
    );
  }

  if (!isNonEmptyString(alternative.reasoning)) {
    throw new ValidationError(
      "Alternative reasoning must be a non-empty string",
      "alternative.reasoning"
    );
  }
}

/**
 * Validates ReasoningStep object
 */
export function validateReasoningStep(step: ReasoningStep): void {
  if (!step || typeof step !== "object") {
    throw new ValidationError(
      "ReasoningStep must be a valid object",
      "reasoningStep"
    );
  }

  if (!Object.values(ReasoningType).includes(step.type as ReasoningType)) {
    throw new ValidationError(
      "ReasoningStep type must be a valid ReasoningType",
      "reasoningStep.type"
    );
  }

  if (!isNonEmptyString(step.content)) {
    throw new ValidationError(
      "ReasoningStep content must be a non-empty string",
      "reasoningStep.content"
    );
  }

  if (!isInRange(step.confidence, 0, 1)) {
    throw new ValidationError(
      "ReasoningStep confidence must be between 0 and 1",
      "reasoningStep.confidence"
    );
  }

  if (!Array.isArray(step.alternatives)) {
    throw new ValidationError(
      "ReasoningStep alternatives must be an array",
      "reasoningStep.alternatives"
    );
  }

  step.alternatives.forEach((alt, index) => {
    try {
      validateAlternative(alt);
    } catch (error) {
      throw new ValidationError(
        `Invalid alternative at index ${index}: ${(error as Error).message}`,
        `reasoningStep.alternatives[${index}]`
      );
    }
  });
}

/**
 * Validates EmotionalState object
 */
export function validateEmotionalState(state: EmotionalState): void {
  if (!state || typeof state !== "object") {
    throw new ValidationError(
      "EmotionalState must be a valid object",
      "emotionalState"
    );
  }

  if (!isInRange(state.valence, -1, 1)) {
    throw new ValidationError(
      "EmotionalState valence must be between -1 and 1",
      "emotionalState.valence"
    );
  }

  if (!isInRange(state.arousal, 0, 1)) {
    throw new ValidationError(
      "EmotionalState arousal must be between 0 and 1",
      "emotionalState.arousal"
    );
  }

  if (!isInRange(state.dominance, 0, 1)) {
    throw new ValidationError(
      "EmotionalState dominance must be between 0 and 1",
      "emotionalState.dominance"
    );
  }

  if (!(state.specific_emotions instanceof Map)) {
    throw new ValidationError(
      "EmotionalState specific_emotions must be a Map",
      "emotionalState.specific_emotions"
    );
  }

  // Validate specific emotions values
  for (const [emotion, value] of state.specific_emotions.entries()) {
    if (!isNonEmptyString(emotion)) {
      throw new ValidationError(
        "EmotionalState specific emotion keys must be non-empty strings",
        "emotionalState.specific_emotions"
      );
    }
    if (!isInRange(value, 0, 1)) {
      throw new ValidationError(
        `EmotionalState specific emotion "${emotion}" value must be between 0 and 1`,
        "emotionalState.specific_emotions"
      );
    }
  }
}

/**
 * Validates ThoughtMetadata object
 */
export function validateThoughtMetadata(metadata: ThoughtMetadata): void {
  if (!metadata || typeof metadata !== "object") {
    throw new ValidationError(
      "ThoughtMetadata must be a valid object",
      "thoughtMetadata"
    );
  }

  if (!isPositiveNumber(metadata.processing_time_ms)) {
    throw new ValidationError(
      "ThoughtMetadata processing_time_ms must be a positive number",
      "thoughtMetadata.processing_time_ms"
    );
  }

  if (!Array.isArray(metadata.components_used)) {
    throw new ValidationError(
      "ThoughtMetadata components_used must be an array",
      "thoughtMetadata.components_used"
    );
  }

  if (!isPositiveNumber(metadata.memory_retrievals)) {
    throw new ValidationError(
      "ThoughtMetadata memory_retrievals must be a positive number",
      "thoughtMetadata.memory_retrievals"
    );
  }

  if (
    !Object.values(ProcessingMode).includes(
      metadata.system_mode as ProcessingMode
    )
  ) {
    throw new ValidationError(
      "ThoughtMetadata system_mode must be a valid ProcessingMode",
      "thoughtMetadata.system_mode"
    );
  }

  if (!isPositiveNumber(metadata.temperature)) {
    throw new ValidationError(
      "ThoughtMetadata temperature must be a positive number",
      "thoughtMetadata.temperature"
    );
  }
}

/**
 * Validates ThoughtResult object
 */
export function validateThoughtResult(result: ThoughtResult): void {
  if (!result || typeof result !== "object") {
    throw new ValidationError(
      "ThoughtResult must be a valid object",
      "thoughtResult"
    );
  }

  if (!isNonEmptyString(result.content)) {
    throw new ValidationError(
      "ThoughtResult content must be a non-empty string",
      "thoughtResult.content"
    );
  }

  if (!isInRange(result.confidence, 0, 1)) {
    throw new ValidationError(
      "ThoughtResult confidence must be between 0 and 1",
      "thoughtResult.confidence"
    );
  }

  if (!Array.isArray(result.reasoning_path)) {
    throw new ValidationError(
      "ThoughtResult reasoning_path must be an array",
      "thoughtResult.reasoning_path"
    );
  }

  result.reasoning_path.forEach((step, index) => {
    try {
      validateReasoningStep(step);
    } catch (error) {
      throw new ValidationError(
        `Invalid reasoning step at index ${index}: ${(error as Error).message}`,
        `thoughtResult.reasoning_path[${index}]`
      );
    }
  });

  try {
    validateEmotionalState(result.emotional_context);
  } catch (error) {
    throw new ValidationError(
      `Invalid emotional context: ${(error as Error).message}`,
      "thoughtResult.emotional_context"
    );
  }

  try {
    validateThoughtMetadata(result.metadata);
  } catch (error) {
    throw new ValidationError(
      `Invalid metadata: ${(error as Error).message}`,
      "thoughtResult.metadata"
    );
  }
}

/**
 * Validates MemoryChunk object
 */
export function validateMemoryChunk(chunk: MemoryChunk): void {
  if (!chunk || typeof chunk !== "object") {
    throw new ValidationError(
      "MemoryChunk must be a valid object",
      "memoryChunk"
    );
  }

  if (chunk.content === undefined || chunk.content === null) {
    throw new ValidationError(
      "MemoryChunk content cannot be undefined or null",
      "memoryChunk.content"
    );
  }

  if (!isInRange(chunk.activation, 0, 1)) {
    throw new ValidationError(
      "MemoryChunk activation must be between 0 and 1",
      "memoryChunk.activation"
    );
  }

  if (!isPositiveNumber(chunk.timestamp)) {
    throw new ValidationError(
      "MemoryChunk timestamp must be a positive number",
      "memoryChunk.timestamp"
    );
  }

  if (!(chunk.associations instanceof Set)) {
    throw new ValidationError(
      "MemoryChunk associations must be a Set",
      "memoryChunk.associations"
    );
  }

  if (!isInRange(chunk.emotional_valence, -1, 1)) {
    throw new ValidationError(
      "MemoryChunk emotional_valence must be between -1 and 1",
      "memoryChunk.emotional_valence"
    );
  }

  if (!isInRange(chunk.importance, 0, 1)) {
    throw new ValidationError(
      "MemoryChunk importance must be between 0 and 1",
      "memoryChunk.importance"
    );
  }

  if (!Array.isArray(chunk.context_tags)) {
    throw new ValidationError(
      "MemoryChunk context_tags must be an array",
      "memoryChunk.context_tags"
    );
  }
}

/**
 * Validates CognitiveInput object
 */
export function validateCognitiveInput(input: CognitiveInput): void {
  if (!input || typeof input !== "object") {
    throw new ValidationError(
      "CognitiveInput must be a valid object",
      "cognitiveInput"
    );
  }

  if (!isNonEmptyString(input.input)) {
    throw new ValidationError(
      "CognitiveInput input must be a non-empty string",
      "cognitiveInput.input"
    );
  }

  try {
    validateContext(input.context);
  } catch (error) {
    throw new ValidationError(
      `Invalid context: ${(error as Error).message}`,
      "cognitiveInput.context"
    );
  }

  if (!Object.values(ProcessingMode).includes(input.mode as ProcessingMode)) {
    throw new ValidationError(
      "CognitiveInput mode must be a valid ProcessingMode",
      "cognitiveInput.mode"
    );
  }

  try {
    validateCognitiveConfig(input.configuration);
  } catch (error) {
    throw new ValidationError(
      `Invalid configuration: ${(error as Error).message}`,
      "cognitiveInput.configuration"
    );
  }
}

/**
 * Validates CognitiveConfig object
 */
export function validateCognitiveConfig(config: CognitiveConfig): void {
  if (!config || typeof config !== "object") {
    throw new ValidationError(
      "CognitiveConfig must be a valid object",
      "cognitiveConfig"
    );
  }

  if (
    !Object.values(ProcessingMode).includes(
      config.default_mode as ProcessingMode
    )
  ) {
    throw new ValidationError(
      "CognitiveConfig default_mode must be a valid ProcessingMode",
      "cognitiveConfig.default_mode"
    );
  }

  if (typeof config.enable_emotion !== "boolean") {
    throw new ValidationError(
      "CognitiveConfig enable_emotion must be a boolean",
      "cognitiveConfig.enable_emotion"
    );
  }

  if (typeof config.enable_metacognition !== "boolean") {
    throw new ValidationError(
      "CognitiveConfig enable_metacognition must be a boolean",
      "cognitiveConfig.enable_metacognition"
    );
  }

  if (typeof config.enable_prediction !== "boolean") {
    throw new ValidationError(
      "CognitiveConfig enable_prediction must be a boolean",
      "cognitiveConfig.enable_prediction"
    );
  }

  if (
    !Number.isInteger(config.working_memory_capacity) ||
    config.working_memory_capacity <= 0
  ) {
    throw new ValidationError(
      "CognitiveConfig working_memory_capacity must be a positive integer",
      "cognitiveConfig.working_memory_capacity"
    );
  }

  if (
    !Number.isInteger(config.episodic_memory_size) ||
    config.episodic_memory_size <= 0
  ) {
    throw new ValidationError(
      "CognitiveConfig episodic_memory_size must be a positive integer",
      "cognitiveConfig.episodic_memory_size"
    );
  }

  if (
    !Number.isInteger(config.semantic_memory_size) ||
    config.semantic_memory_size <= 0
  ) {
    throw new ValidationError(
      "CognitiveConfig semantic_memory_size must be a positive integer",
      "cognitiveConfig.semantic_memory_size"
    );
  }

  if (!isPositiveNumber(config.consolidation_interval)) {
    throw new ValidationError(
      "CognitiveConfig consolidation_interval must be a positive number",
      "cognitiveConfig.consolidation_interval"
    );
  }

  if (!isInRange(config.noise_level, 0, 1)) {
    throw new ValidationError(
      "CognitiveConfig noise_level must be between 0 and 1",
      "cognitiveConfig.noise_level"
    );
  }

  if (!isPositiveNumber(config.temperature)) {
    throw new ValidationError(
      "CognitiveConfig temperature must be a positive number",
      "cognitiveConfig.temperature"
    );
  }

  if (!isInRange(config.attention_threshold, 0, 1)) {
    throw new ValidationError(
      "CognitiveConfig attention_threshold must be between 0 and 1",
      "cognitiveConfig.attention_threshold"
    );
  }

  if (
    !Number.isInteger(config.max_reasoning_depth) ||
    config.max_reasoning_depth <= 0
  ) {
    throw new ValidationError(
      "CognitiveConfig max_reasoning_depth must be a positive integer",
      "cognitiveConfig.max_reasoning_depth"
    );
  }

  if (!Number.isInteger(config.timeout_ms) || config.timeout_ms <= 0) {
    throw new ValidationError(
      "CognitiveConfig timeout_ms must be a positive integer",
      "cognitiveConfig.timeout_ms"
    );
  }

  if (
    !Number.isInteger(config.max_concurrent_sessions) ||
    config.max_concurrent_sessions <= 0
  ) {
    throw new ValidationError(
      "CognitiveConfig max_concurrent_sessions must be a positive integer",
      "cognitiveConfig.max_concurrent_sessions"
    );
  }

  if (!isInRange(config.confidence_threshold, 0, 1)) {
    throw new ValidationError(
      "CognitiveConfig confidence_threshold must be between 0 and 1",
      "cognitiveConfig.confidence_threshold"
    );
  }

  if (!isInRange(config.system2_activation_threshold, 0, 1)) {
    throw new ValidationError(
      "CognitiveConfig system2_activation_threshold must be between 0 and 1",
      "cognitiveConfig.system2_activation_threshold"
    );
  }

  if (!isInRange(config.memory_retrieval_threshold, 0, 1)) {
    throw new ValidationError(
      "CognitiveConfig memory_retrieval_threshold must be between 0 and 1",
      "cognitiveConfig.memory_retrieval_threshold"
    );
  }

  if (typeof config.brain_dir !== "string" || config.brain_dir.trim() === "") {
    throw new ValidationError(
      "CognitiveConfig brain_dir must be a non-empty string",
      "cognitiveConfig.brain_dir"
    );
  }
}

/**
 * Validates Episode object
 */
export function validateEpisode(episode: Episode): void {
  if (!episode || typeof episode !== "object") {
    throw new ValidationError("Episode must be a valid object", "episode");
  }

  if (episode.content === undefined || episode.content === null) {
    throw new ValidationError(
      "Episode content cannot be undefined or null",
      "episode.content"
    );
  }

  try {
    validateContext(episode.context);
  } catch (error) {
    throw new ValidationError(
      `Invalid context: ${(error as Error).message}`,
      "episode.context"
    );
  }

  if (!isPositiveNumber(episode.timestamp)) {
    throw new ValidationError(
      "Episode timestamp must be a positive number",
      "episode.timestamp"
    );
  }

  if (!Array.isArray(episode.emotional_tags)) {
    throw new ValidationError(
      "Episode emotional_tags must be an array",
      "episode.emotional_tags"
    );
  }

  if (!isInRange(episode.importance, 0, 1)) {
    throw new ValidationError(
      "Episode importance must be between 0 and 1",
      "episode.importance"
    );
  }

  if (!isInRange(episode.decay_factor, 0, 1)) {
    throw new ValidationError(
      "Episode decay_factor must be between 0 and 1",
      "episode.decay_factor"
    );
  }
}

/**
 * Validates Concept object
 */
export function validateConcept(concept: Concept): void {
  if (!concept || typeof concept !== "object") {
    throw new ValidationError("Concept must be a valid object", "concept");
  }

  if (!isNonEmptyString(concept.id)) {
    throw new ValidationError(
      "Concept id must be a non-empty string",
      "concept.id"
    );
  }

  if (concept.content === undefined || concept.content === null) {
    throw new ValidationError(
      "Concept content cannot be undefined or null",
      "concept.content"
    );
  }

  if (concept.embedding !== undefined && !Array.isArray(concept.embedding)) {
    throw new ValidationError(
      "Concept embedding must be an array if provided",
      "concept.embedding"
    );
  }

  if (!Array.isArray(concept.relations)) {
    throw new ValidationError(
      "Concept relations must be an array",
      "concept.relations"
    );
  }

  if (!isInRange(concept.activation, 0, 1)) {
    throw new ValidationError(
      "Concept activation must be between 0 and 1",
      "concept.activation"
    );
  }

  if (!isPositiveNumber(concept.last_accessed)) {
    throw new ValidationError(
      "Concept last_accessed must be a positive number",
      "concept.last_accessed"
    );
  }
}
