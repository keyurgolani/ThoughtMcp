/**
 * Main interfaces export file
 */

export * from "./audit.js";
export * from "./cognitive.js";
export * from "./forgetting.js";
export * from "./mcp.js";
export * from "./parallel-reasoning.js";
export * from "./persistence.js";
export * from "./systematic-thinking.js";

// Export probabilistic reasoning interfaces with specific names to avoid conflicts
export type {
  BeliefEdge,
  BeliefNetwork,
  BeliefNode,
  CombinedUncertainty,
  ConfidenceEvolution,
  DataPoint,
  EvidenceIntegration,
  Hypothesis,
  KnowledgeState,
  ProbabilisticReasoningEngine,
  ProbabilisticReasoningResult,
  ReasoningChain,
  UncertaintyAssessment,
  UncertaintyPropagation,
  UncertaintyQuantifier,
} from "./probabilistic-reasoning.js";
