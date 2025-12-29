/**
 * Thought REST API Type Definitions
 *
 * TypeScript interfaces for all API request/response types.
 * Requirements: 5.5, 16.2-16.6
 */

// ============================================================================
// API Constraints
// ============================================================================

/**
 * Maximum number of memories that can be recalled in a single request.
 * Server-side constraint: The API enforces a maximum limit of 100 memories per recall request.
 * Any limit value exceeding this will be capped to 100 by the client.
 */
export const MAX_MEMORY_RECALL_LIMIT = 100;

/**
 * Maximum content length for memory storage.
 * Safe limit for most embedding models to prevent HTTP 500 errors.
 * Content exceeding this limit will be truncated before saving.
 */
export const MAX_MEMORY_CONTENT_LENGTH = 8000;

// ============================================================================
// Memory Sector Types
// ============================================================================

export type MemorySectorType = "episodic" | "semantic" | "procedural" | "emotional" | "reflective";

export const VALID_SECTORS: MemorySectorType[] = [
  "episodic",
  "semantic",
  "procedural",
  "emotional",
  "reflective",
];

// ============================================================================
// Link Types
// ============================================================================

export type LinkType = "semantic" | "causal" | "temporal" | "analogical";

// ============================================================================
// Memory Metadata
// ============================================================================

export interface MemoryMetadata {
  keywords?: string[];
  tags?: string[];
  category?: string;
  context?: string;
  importance?: number;
}

// ============================================================================
// Memory Types
// ============================================================================

export interface Memory {
  id: string;
  content: string;
  createdAt: string;
  lastAccessed: string;
  accessCount: number;
  salience: number;
  strength: number;
  userId: string;
  sessionId: string;
  primarySector: MemorySectorType;
  metadata: MemoryMetadata;
}

export interface CompositeScore {
  total: number;
  similarity: number;
  salience: number;
  recency: number;
  linkWeight: number;
}

export type RankingMethod = "similarity" | "salience";

// ============================================================================
// Graph Types
// ============================================================================

export interface GraphNode {
  id: string;
  content: string;
  primarySector: MemorySectorType;
  salience: number;
  strength: number;
  createdAt: string;
  metadata: MemoryMetadata;
}

export interface GraphEdge {
  source: string;
  target: string;
  linkType: LinkType;
  weight: number;
}

export interface GraphCluster {
  id: string;
  name: string;
  nodeIds: string[];
  centroidId?: string;
}

// ============================================================================
// Timeline Types
// ============================================================================

export interface EmotionalState {
  valence: number;
  arousal: number;
  dominance: number;
}

export interface TimelineEvent {
  id: string;
  content: string;
  timestamp: string;
  primarySector: MemorySectorType;
  salience: number;
  strength: number;
  emotionalState?: EmotionalState;
  metadata: MemoryMetadata;
}

export interface EmotionalTrend {
  period: string;
  startDate: string;
  endDate: string;
  averageValence: number;
  averageArousal: number;
  averageDominance: number;
  trend: "improving" | "declining" | "stable";
  memoryCount: number;
}

// ============================================================================
// Activity Types
// ============================================================================

export interface ActivityItem {
  type: "create" | "update" | "delete" | "access";
  memoryId: string;
  timestamp: string;
  sector: MemorySectorType;
}

// ============================================================================
// Memory Request/Response Types
// ============================================================================

export interface StoreMemoryRequest {
  content: string;
  userId: string;
  sessionId: string;
  primarySector: MemorySectorType;
  metadata?: MemoryMetadata;
}

export interface StoreMemoryResponse {
  memoryId: string;
  embeddingsGenerated: number;
  linksCreated: number;
  salience: number;
  strength: number;
}

export interface RecallMemoryRequest {
  userId: string;
  text?: string;
  sectors?: MemorySectorType[];
  primarySector?: MemorySectorType;
  minStrength?: number;
  minSalience?: number;
  minSimilarity?: number;
  dateRange?: {
    start?: string;
    end?: string;
  };
  metadata?: {
    keywords?: string[];
    tags?: string[];
    category?: string;
  };
  limit?: number;
  offset?: number;
}

export interface RecallMemoryResponse {
  memories: Memory[];
  totalCount: number;
  scores: Record<string, CompositeScore>;
  rankingMethod: RankingMethod;
}

export interface UpdateMemoryRequest {
  memoryId: string;
  userId: string;
  content?: string;
  strength?: number;
  salience?: number;
  metadata?: Partial<MemoryMetadata>;
}

export interface UpdateMemoryResponse {
  memoryId: string;
  embeddingsRegenerated: boolean;
  connectionsUpdated: boolean;
  processingTimeMs: number;
}

export interface DeleteMemoryResponse {
  memoryId: string;
  deleted: boolean;
  soft: boolean;
}

export interface MemoryStatsResponse {
  episodicCount: number;
  semanticCount: number;
  proceduralCount: number;
  emotionalCount: number;
  reflectiveCount: number;
  totalCapacity: number;
  consolidationPending: number;
  recentActivity: ActivityItem[];
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
}

export interface TimelineResponse {
  timeline: TimelineEvent[];
  emotionalTrends: EmotionalTrend[];
  totalCount: number;
}

// ============================================================================
// Batch Operation Types
// ============================================================================

export interface BatchStoreRequest {
  userId: string;
  sessionId: string;
  memories: Array<{
    content: string;
    primarySector: MemorySectorType;
    metadata?: MemoryMetadata;
  }>;
}

export interface BatchStoreResponse {
  successCount: number;
  failureCount: number;
  results: Array<{
    memoryId?: string;
    content: string;
    success: boolean;
    error?: string;
  }>;
  processingTimeMs: number;
}

export interface BatchRecallRequest {
  userId: string;
  memoryIds: string[];
  includeDeleted?: boolean;
}

export interface BatchRecallResponse {
  memories: Memory[];
  notFound: string[];
  processingTimeMs: number;
}

export interface BatchDeleteRequest {
  userId: string;
  memoryIds: string[];
  soft?: boolean;
}

export interface BatchDeleteResponse {
  successCount: number;
  failureCount: number;
  results: Array<{
    memoryId: string;
    success: boolean;
    error?: string;
  }>;
  soft: boolean;
  processingTimeMs: number;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchRequest {
  userId: string;
  text?: string;
  sectors?: MemorySectorType[];
  primarySector?: MemorySectorType;
  minStrength?: number;
  minSalience?: number;
  minSimilarity?: number;
  dateRange?: {
    start?: string;
    end?: string;
  };
  metadata?: {
    keywords?: string[];
    tags?: string[];
    category?: string;
  };
  limit?: number;
  offset?: number;
}

export interface SearchResultItem extends Memory {
  score: CompositeScore;
  rank: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
  totalCount: number;
  rankingMethod: RankingMethod;
  query: {
    text?: string;
    parsedQuery?: string;
    includeTerms?: string[];
    excludeTerms?: string[];
  };
  processingTimeMs: number;
}

// ============================================================================
// Reasoning Types (Requirements: 16.2-16.6)
// ============================================================================

// Server-side think modes (REST API /api/v1/think endpoint)
// Note: The REST API uses different modes than the MCP server tool
export type ThinkMode = "intuitive" | "deliberative" | "balanced" | "creative" | "analytical";

// UI-side reasoning modes (user-facing)
export type ReasoningMode = "analytical" | "creative" | "critical" | "synthetic" | "parallel";

/**
 * Map UI reasoning mode to server think mode
 *
 * The REST API /api/v1/think endpoint accepts these modes:
 * - intuitive: Fast, pattern-based thinking (creative + synthetic streams)
 * - deliberative: Slow, analytical thinking (analytical + critical streams)
 * - balanced: All streams for comprehensive analysis
 * - creative: Focus on creative and synthetic streams
 * - analytical: Focus on analytical and critical streams
 *
 * The UI uses these modes:
 * - analytical: Maps to "analytical" (analytical + critical streams)
 * - creative: Maps to "creative" (creative + synthetic streams)
 * - critical: Maps to "deliberative" (analytical + critical streams)
 * - synthetic: Maps to "balanced" (all streams)
 * - parallel: Handled separately via /api/v1/reasoning/parallel endpoint
 */
export function mapReasoningModeToThinkMode(mode: ReasoningMode): ThinkMode {
  switch (mode) {
    case "analytical":
      return "analytical";
    case "creative":
      return "creative";
    case "critical":
      return "deliberative"; // Critical thinking uses deliberative mode
    case "synthetic":
      return "balanced"; // Synthetic uses all streams
    case "parallel":
      return "balanced"; // Parallel should use thinkParallel, but fallback to balanced
    default:
      return "balanced";
  }
}

export interface ThinkRequest {
  input: string;
  mode: ThinkMode;
  userId?: string;
  context?: string;
}

export interface ThoughtItem {
  content: string;
  sources: string[];
  confidence: number;
  importance: number;
}

export interface MetacognitiveAssessment {
  overallConfidence: number;
  evidenceQuality: number;
  reasoningCoherence: number;
  completeness: number;
  uncertaintyLevel: number;
  uncertaintyType: string;
  factors: Array<{
    dimension: string;
    score: number;
    weight: number;
    explanation: string;
  }>;
}

export interface RecommendationItem {
  description: string;
  priority: number;
  confidence: number;
}

/**
 * Memory used in reasoning response
 */
export interface MemoryUsedInReasoning {
  id: string;
  content: string;
  primarySector: MemorySectorType;
  relevance: number;
}

export interface ThinkResponse {
  thoughts: ThoughtItem[];
  confidence: number;
  modeUsed: ThinkMode;
  processingTimeMs: number;
  metacognitiveAssessment: MetacognitiveAssessment;
  conclusion: string;
  recommendations: RecommendationItem[];
  // Memories used for context augmentation
  memoriesUsed?: MemoryUsedInReasoning[];
  // Legacy fields for backward compatibility (populated by client)
  mode?: ReasoningMode;
  analysis?: string;
  insights?: string[];
  biases?: BiasDetection[];
}

// Stream types for parallel reasoning
export type StreamType = "analytical" | "creative" | "critical" | "synthetic";

export interface ParallelThinkRequest {
  problem: string;
  streams: StreamType[];
  userId?: string;
  timeout?: number;
  context?: string;
  coordinationStrategy?: string;
  async?: boolean;
}

export interface ParallelThinkAsyncResponse {
  sessionId: string;
  status: "processing";
  message: string;
}

// Server response format for stream
export interface ServerStreamOutput {
  streamId: string;
  streamType: StreamType;
  conclusion: string;
  reasoning: string[];
  insights: Array<{
    content: string;
    confidence: number;
    importance: number;
  }>;
  confidence: number;
  processingTime: number;
  status: string;
}

// Server response format for synthesis
export interface ServerSynthesis {
  conclusion: string;
  insights: Array<{
    content: string;
    sources: string[];
    confidence: number;
    importance: number;
  }>;
  recommendations: Array<{
    description: string;
    priority: number;
    confidence: number;
  }>;
  confidence: number;
  quality: {
    overallScore: number;
    coherence: number;
    completeness: number;
    consistency: number;
  };
}

// Server response format for parallel reasoning
export interface ServerParallelResponse {
  sessionId: string;
  streams: ServerStreamOutput[];
  synthesis: ServerSynthesis;
  conflictsResolved: Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
    sourceStreams: string[];
    resolution: {
      approach: string;
      recommendedAction: string;
    };
  }>;
  coordinationMetrics: {
    sync25: number;
    sync50: number;
    sync75: number;
    totalCoordinationTime: number;
    overheadPercentage: number;
  };
}

// UI-friendly stream result format
export interface StreamResult {
  mode: ReasoningMode;
  analysis: string;
  insights: string[];
  confidence: number;
}

// UI-friendly parallel response format
export interface ParallelThinkResponse {
  streams: Record<ReasoningMode, StreamResult>;
  synthesis: {
    combinedInsights: string[];
    conflicts: string[];
    recommendations: string[];
  };
  overallConfidence: number;
  processingTimeMs: number;
  // Raw server response for advanced use
  raw?: ServerParallelResponse;
}

/**
 * Transform server parallel response to UI format.
 * Handles all server response formats with fallback for unexpected structures.
 * Ensures all 4 streams are always present in the response.
 */
export function transformParallelResponse(
  serverResponse: ServerParallelResponse
): ParallelThinkResponse {
  try {
    // Initialize all streams with empty defaults
    const allModes: ReasoningMode[] = ["analytical", "creative", "critical", "synthetic"];
    const streams: Record<string, StreamResult> = {};

    // Initialize all streams with defaults
    for (const mode of allModes) {
      streams[mode] = {
        mode,
        analysis: "Stream did not complete",
        insights: [],
        confidence: 0,
      };
    }

    // Override with actual results from server
    for (const stream of serverResponse.streams) {
      const mode = stream.streamType as ReasoningMode;
      streams[mode] = {
        mode,
        analysis: stream.conclusion,
        insights: stream.insights.map((i) => i.content),
        confidence: stream.confidence,
      };
    }

    return {
      streams: streams as Record<ReasoningMode, StreamResult>,
      synthesis: {
        combinedInsights: serverResponse.synthesis.insights.map((i) => i.content),
        conflicts: serverResponse.conflictsResolved.map((c) => c.description),
        recommendations: serverResponse.synthesis.recommendations.map((r) => r.description),
      },
      overallConfidence: serverResponse.synthesis.confidence,
      processingTimeMs: serverResponse.coordinationMetrics.totalCoordinationTime,
      raw: serverResponse,
    };
  } catch (error) {
    console.error("Error transforming parallel response:", error);
    return createEmptyParallelResponse(error instanceof Error ? error.message : "Transform error");
  }
}

/**
 * Create an empty parallel response for error cases.
 * Prevents UI crashes when the API fails.
 */
export function createEmptyParallelResponse(errorMessage?: string): ParallelThinkResponse {
  const analysisText =
    errorMessage !== undefined && errorMessage.length > 0
      ? `Error: ${errorMessage}`
      : "No analysis available";
  const emptyStream: StreamResult = {
    mode: "analytical",
    analysis: analysisText,
    insights: [],
    confidence: 0,
  };

  const combinedInsights: string[] =
    errorMessage !== undefined && errorMessage.length > 0
      ? [`Parallel reasoning failed: ${errorMessage}`]
      : [];

  return {
    streams: {
      analytical: { ...emptyStream, mode: "analytical" },
      creative: { ...emptyStream, mode: "creative" },
      critical: { ...emptyStream, mode: "critical" },
      synthetic: { ...emptyStream, mode: "synthetic" },
      parallel: { ...emptyStream, mode: "parallel" },
    },
    synthesis: {
      combinedInsights,
      conflicts: [],
      recommendations: [],
    },
    overallConfidence: 0,
    processingTimeMs: 0,
  };
}

// ============================================================================
// Framework Analysis Types
// ============================================================================

export type FrameworkType =
  | "scientific-method"
  | "design-thinking"
  | "systems-thinking"
  | "critical-thinking"
  | "creative-problem-solving"
  | "root-cause-analysis"
  | "first-principles"
  | "scenario-planning";

export interface AnalyzeRequest {
  problem: string;
  preferredFramework?: FrameworkType;
  userId?: string;
  context?: {
    background?: string;
    constraints?: string[];
    goals?: string[];
  };
}

export interface FrameworkStep {
  name: string;
  description: string;
  result: string;
}

export interface AnalyzeResponse {
  framework: FrameworkType;
  frameworkName: string;
  steps: FrameworkStep[];
  conclusion: string;
  recommendations: string[];
  processingTimeMs: number;
}

/**
 * Server response format for /api/v1/problem/framework/select
 * Matches the actual server response structure from src/server/routes/problem.ts
 */
export interface ServerFrameworkSelectResponse {
  recommendedFramework: {
    id: string;
    name: string;
    description: string;
  };
  alternatives: Array<{
    framework: {
      id: string;
      name: string;
      description: string;
    };
    confidence: number;
    reason: string;
  }>;
  reasoning: string;
  confidence: number;
  isHybrid: boolean;
  hybridFrameworks?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  processingTimeMs: number;
}

/**
 * Predefined steps for each framework type.
 * Used to generate steps when the server doesn't provide them.
 */
export const FRAMEWORK_STEPS: Record<
  FrameworkType,
  Array<{ name: string; description: string }>
> = {
  "scientific-method": [
    { name: "Observe", description: "Gather observations and data about the phenomenon" },
    { name: "Hypothesize", description: "Form a testable hypothesis based on observations" },
    { name: "Predict", description: "Make predictions based on the hypothesis" },
    { name: "Experiment", description: "Design and conduct experiments to test predictions" },
    { name: "Analyze", description: "Analyze experimental results and data" },
    { name: "Conclude", description: "Draw conclusions and refine the hypothesis" },
  ],
  "design-thinking": [
    { name: "Empathize", description: "Understand the user and their needs" },
    { name: "Define", description: "Define the core problem to solve" },
    { name: "Ideate", description: "Generate creative solutions" },
    { name: "Prototype", description: "Build quick prototypes to test ideas" },
    { name: "Test", description: "Test prototypes with users and iterate" },
  ],
  "systems-thinking": [
    { name: "Identify System", description: "Identify the system boundaries and components" },
    { name: "Map Components", description: "Map all components and their relationships" },
    { name: "Analyze Relationships", description: "Analyze feedback loops and interactions" },
    { name: "Find Leverage Points", description: "Identify high-impact intervention points" },
    { name: "Intervene", description: "Design and implement systemic interventions" },
  ],
  "critical-thinking": [
    { name: "Clarify", description: "Clarify the question or problem" },
    { name: "Analyze", description: "Analyze arguments and evidence" },
    { name: "Evaluate", description: "Evaluate the credibility and relevance of information" },
    { name: "Infer", description: "Draw logical inferences from evidence" },
    { name: "Explain", description: "Explain conclusions and reasoning" },
  ],
  "creative-problem-solving": [
    { name: "Clarify", description: "Clarify the problem and objectives" },
    { name: "Ideate", description: "Generate diverse ideas without judgment" },
    { name: "Develop", description: "Develop and refine promising ideas" },
    { name: "Implement", description: "Plan and implement the solution" },
  ],
  "root-cause-analysis": [
    { name: "Define Problem", description: "Clearly define the problem to be solved" },
    { name: "Collect Data", description: "Gather relevant data and evidence" },
    {
      name: "Identify Causes",
      description: "Identify potential causes using techniques like 5 Whys",
    },
    { name: "Find Root Cause", description: "Determine the fundamental root cause" },
    { name: "Implement Solution", description: "Implement corrective actions" },
  ],
  "first-principles": [
    { name: "Identify Assumptions", description: "Identify all assumptions and beliefs" },
    { name: "Break Down", description: "Break down the problem to fundamental truths" },
    {
      name: "Rebuild from Fundamentals",
      description: "Rebuild understanding from basic principles",
    },
  ],
  "scenario-planning": [
    { name: "Identify Drivers", description: "Identify key drivers and uncertainties" },
    { name: "Develop Scenarios", description: "Develop plausible future scenarios" },
    { name: "Analyze Implications", description: "Analyze implications of each scenario" },
    { name: "Plan Responses", description: "Develop strategic responses for each scenario" },
  ],
};

/**
 * UI-friendly framework selection response
 */
export interface FrameworkSelectResponse {
  framework: FrameworkType;
  frameworkName: string;
  description: string;
  applicability: number;
  steps: Array<{ name: string; description: string }>;
  alternatives: Array<{
    framework: FrameworkType;
    name: string;
    applicability: number;
    reason?: string;
  }>;
  reasoning: string;
  interpretation: string;
  processingTimeMs: number;
}

/**
 * Transform server framework select response to AnalyzeResponse format
 */
export function transformFrameworkSelectResponse(
  serverResponse: ServerFrameworkSelectResponse,
  problem: string
): AnalyzeResponse {
  const { recommendedFramework, reasoning, processingTimeMs, alternatives } = serverResponse;

  // Map server framework ID to FrameworkType (handle both snake_case and kebab-case)
  const frameworkId = recommendedFramework.id.toLowerCase().replace(/_/g, "-") as FrameworkType;

  // Get predefined steps for this framework type, or use empty array if unknown
  const frameworkSteps = FRAMEWORK_STEPS[frameworkId];

  // Transform steps to FrameworkStep format
  const steps: FrameworkStep[] = frameworkSteps.map((step) => ({
    name: step.name,
    description: step.description,
    result: "", // Result will be populated when the framework is actually applied
  }));

  const problemPreview = problem.substring(0, 100) + (problem.length > 100 ? "..." : "");
  const alternativeRecs = alternatives.slice(0, 2).map((alt) => {
    const percentage = String(Math.round(alt.confidence * 100));
    return `Alternative: ${alt.framework.name} (${percentage}% confidence)`;
  });

  return {
    framework: frameworkId,
    frameworkName: recommendedFramework.name,
    steps,
    conclusion: `Recommended framework: ${recommendedFramework.name}. ${reasoning}`,
    recommendations: [
      `Apply ${recommendedFramework.name} to analyze: "${problemPreview}"`,
      ...alternativeRecs,
    ],
    processingTimeMs,
  };
}

/**
 * Transform server framework select response to UI-friendly FrameworkSelectResponse format
 */
export function transformToFrameworkSelectResponse(
  serverResponse: ServerFrameworkSelectResponse
): FrameworkSelectResponse {
  const { recommendedFramework, reasoning, processingTimeMs, alternatives, confidence } =
    serverResponse;

  // Map server framework ID to FrameworkType (handle both snake_case and kebab-case)
  const frameworkId = recommendedFramework.id.toLowerCase().replace(/_/g, "-") as FrameworkType;

  // Get predefined steps for this framework type
  const steps = FRAMEWORK_STEPS[frameworkId];

  // Transform alternatives
  const transformedAlternatives = alternatives.map((alt) => ({
    framework: alt.framework.id.toLowerCase().replace(/_/g, "-") as FrameworkType,
    name: alt.framework.name,
    applicability: alt.confidence,
    reason: alt.reason,
  }));

  // Generate interpretation based on confidence
  const interpretation = generateFrameworkInterpretation(
    recommendedFramework.name,
    confidence,
    reasoning
  );

  return {
    framework: frameworkId,
    frameworkName: recommendedFramework.name,
    description: recommendedFramework.description,
    applicability: confidence,
    steps,
    alternatives: transformedAlternatives,
    reasoning,
    interpretation,
    processingTimeMs,
  };
}

/**
 * Generate human-readable interpretation for framework selection
 */
function generateFrameworkInterpretation(
  frameworkName: string,
  confidence: number,
  reasoning: string
): string {
  const confidencePercent = String(Math.round(confidence * 100));

  if (confidence >= 0.8) {
    return `${frameworkName} is highly recommended (${confidencePercent}% confidence). ${reasoning}`;
  } else if (confidence >= 0.6) {
    return `${frameworkName} is a good fit (${confidencePercent}% confidence). ${reasoning}`;
  } else if (confidence >= 0.4) {
    return `${frameworkName} may be suitable (${confidencePercent}% confidence). Consider alternatives. ${reasoning}`;
  } else {
    return `${frameworkName} is suggested with low confidence (${confidencePercent}%). Strongly consider alternatives. ${reasoning}`;
  }
}

// ============================================================================
// Problem Decomposition Types
// ============================================================================

/**
 * Valid decomposition strategies accepted by the server API.
 * - functional: Break down by functional components and responsibilities
 * - temporal: Break down by time phases and sequences
 * - stakeholder: Break down by stakeholder perspectives and needs
 * - component: Break down by system components and modules
 */
export type DecompositionStrategy = "functional" | "temporal" | "stakeholder" | "component";

/**
 * Descriptions for each decomposition strategy
 */
export const DECOMPOSITION_STRATEGY_DESCRIPTIONS: Record<DecompositionStrategy, string> = {
  functional: "Break down by functional components and responsibilities",
  temporal: "Break down by time phases and sequences",
  stakeholder: "Break down by stakeholder perspectives and needs",
  component: "Break down by system components and modules",
};

export interface DecomposeRequest {
  problem: string;
  maxDepth?: number;
  userId?: string;
  context?: string;
  strategy?: DecompositionStrategy;
}

// Server response format for decomposition tree node
export interface ServerDecompositionNode {
  id: string;
  name: string;
  description: string;
  depth: number;
  parent?: string;
  domain?: string;
  children: ServerDecompositionNode[];
}

// Server response format for decomposition
export interface ServerDecomposeResponse {
  decompositionTree: ServerDecompositionNode;
  dependencies: Array<{
    from: string;
    to: string;
    type: string;
    description: string;
  }>;
  priorityOrder: string[];
  criticalPath: string[];
  recommendedApproach: string;
  processingTimeMs: number;
}

// UI-friendly sub-problem format
export interface SubProblem {
  id: string;
  description: string;
  complexity: "low" | "medium" | "high";
  dependencies: string[];
  executionOrder: number;
  children?: SubProblem[];
}

// UI-friendly decompose response
export interface DecomposeResponse {
  rootProblem: string;
  subProblems: SubProblem[];
  totalSubProblems: number;
  maxDepth: number;
  suggestedOrder: string[];
  processingTimeMs: number;
  // Raw server response
  raw?: ServerDecomposeResponse;
}

/**
 * Transform server decomposition node to UI SubProblem format
 */
function transformNode(
  node: ServerDecompositionNode,
  dependencies: ServerDecomposeResponse["dependencies"],
  priorityOrder: string[]
): SubProblem {
  const nodeDeps = dependencies.filter((d) => d.to === node.id).map((d) => d.from);
  const executionOrder = priorityOrder.indexOf(node.id);

  const result: SubProblem = {
    id: node.id,
    description: node.description,
    complexity: node.depth <= 1 ? "high" : node.depth === 2 ? "medium" : "low",
    dependencies: nodeDeps,
    executionOrder: executionOrder >= 0 ? executionOrder : 999,
  };

  // Only add children property if there are children
  if (node.children.length > 0) {
    result.children = node.children.map((c) => transformNode(c, dependencies, priorityOrder));
  }

  return result;
}

/**
 * Flatten tree to array of sub-problems
 */
function flattenTree(node: SubProblem): SubProblem[] {
  const result: SubProblem[] = [node];
  if (node.children) {
    for (const child of node.children) {
      result.push(...flattenTree(child));
    }
  }
  return result;
}

/**
 * Transform server decompose response to UI format
 */
export function transformDecomposeResponse(
  serverResponse: ServerDecomposeResponse
): DecomposeResponse {
  try {
    const rootNode = transformNode(
      serverResponse.decompositionTree,
      serverResponse.dependencies,
      serverResponse.priorityOrder
    );

    const allSubProblems = flattenTree(rootNode);
    const maxDepth =
      allSubProblems.length > 0
        ? Math.max(...allSubProblems.map((sp) => sp.id.split("-").length))
        : 1;

    return {
      rootProblem: serverResponse.decompositionTree.description,
      subProblems: allSubProblems,
      totalSubProblems: allSubProblems.length,
      maxDepth,
      suggestedOrder: serverResponse.priorityOrder,
      processingTimeMs: serverResponse.processingTimeMs,
      raw: serverResponse,
    };
  } catch (error) {
    console.error("Error transforming decompose response:", error);
    const problemDescription = serverResponse.decompositionTree.description;
    return createEmptyDecomposeResponse(
      problemDescription,
      error instanceof Error ? error.message : "Transform error"
    );
  }
}

/**
 * Create an empty decompose response for error cases.
 * Prevents UI crashes when the API fails.
 */
export function createEmptyDecomposeResponse(
  problem: string,
  errorMessage?: string
): DecomposeResponse {
  const description =
    errorMessage !== undefined && errorMessage.length > 0
      ? `Failed to decompose: ${errorMessage}`
      : problem;
  const rootSubProblem: SubProblem = {
    id: "root",
    description,
    complexity: "high",
    dependencies: [],
    executionOrder: 0,
  };

  return {
    rootProblem: problem,
    subProblems: [rootSubProblem],
    totalSubProblems: 1,
    maxDepth: 1,
    suggestedOrder: ["root"],
    processingTimeMs: 0,
  };
}

// ============================================================================
// Confidence Assessment Types
// ============================================================================

export interface AssessConfidenceRequest {
  reasoning: string;
  evidence?: string[];
  context?: string;
}

export interface ConfidenceDimensions {
  evidenceQuality: number;
  reasoningCoherence: number;
  completeness: number;
  uncertaintyLevel: number;
  biasFreedom: number;
}

export interface AssessConfidenceResponse {
  overall: number;
  dimensions: ConfidenceDimensions;
  interpretation: string;
  warnings: string[];
  recommendations: string[];
  processingTimeMs: number;
}

// ============================================================================
// Metacognition Unified Endpoint Types
// ============================================================================

/**
 * Server response format for /api/v1/metacognition/analyze
 * This is the unified endpoint that returns both confidence and bias data.
 */
export interface ServerMetacognitionResponse {
  qualityScore: number;
  confidenceCalibration: {
    overallConfidence: number;
    evidenceQuality: number;
    reasoningCoherence: number;
    completeness: number;
    uncertaintyLevel: number;
    uncertaintyType: string;
    factors?: Array<{
      dimension: string;
      score: number;
      weight: number;
      explanation: string;
    }>;
  };
  biasesDetected: Array<{
    type: string;
    severity: number;
    evidence: string[];
    correctionStrategy: string;
  }>;
  improvementSuggestions: Array<{
    category: string;
    description: string;
    priority: string;
    affectedAreas: string[];
  }>;
}

/**
 * UI-friendly response format for metacognition analysis
 */
export interface MetacognitionAnalyzeResponse {
  confidence: AssessConfidenceResponse;
  biases: DetectBiasResponse;
  processingTimeMs: number;
}

/**
 * Transform server metacognition response to UI format
 */
export function transformMetacognitionResponse(
  serverResponse: ServerMetacognitionResponse
): MetacognitionAnalyzeResponse {
  const { confidenceCalibration, biasesDetected, improvementSuggestions } = serverResponse;

  // Extract recommendations from improvement suggestions
  const recommendations = improvementSuggestions.map((s) => s.description);

  // Calculate overall risk based on bias severities
  const maxSeverity =
    biasesDetected.length > 0 ? Math.max(...biasesDetected.map((b) => b.severity)) : 0;
  const overallRisk: "low" | "medium" | "high" =
    maxSeverity >= 0.7 ? "high" : maxSeverity >= 0.4 ? "medium" : "low";

  // Generate interpretation from confidence data
  const interpretation = generateConfidenceInterpretation(confidenceCalibration);

  // Generate warnings from low confidence dimensions
  const warnings = generateConfidenceWarnings(confidenceCalibration);

  // Default processing time (server doesn't return it in this endpoint)
  const processingTimeMs = 0;

  return {
    confidence: {
      overall: confidenceCalibration.overallConfidence,
      dimensions: {
        evidenceQuality: confidenceCalibration.evidenceQuality,
        reasoningCoherence: confidenceCalibration.reasoningCoherence,
        completeness: confidenceCalibration.completeness,
        uncertaintyLevel: confidenceCalibration.uncertaintyLevel,
        biasFreedom: 1 - maxSeverity, // Inverse of max bias severity
      },
      interpretation,
      warnings,
      recommendations,
      processingTimeMs,
    },
    biases: {
      biases: biasesDetected.map((b) => ({
        type: b.type as BiasType,
        severity: b.severity,
        evidence: b.evidence,
        correctionStrategy: b.correctionStrategy,
      })),
      overallRisk,
      recommendations,
      processingTimeMs,
    },
    processingTimeMs,
  };
}

/**
 * Generate human-readable interpretation of confidence assessment
 */
function generateConfidenceInterpretation(
  calibration: ServerMetacognitionResponse["confidenceCalibration"]
): string {
  const { overallConfidence, uncertaintyType } = calibration;
  const uncertaintyNote =
    uncertaintyType.length > 0 ? ` Primary uncertainty: ${uncertaintyType}.` : "";

  if (overallConfidence >= 0.8) {
    return "High confidence in the reasoning quality. The analysis is well-supported and coherent.";
  } else if (overallConfidence >= 0.6) {
    return `Moderate confidence.${uncertaintyNote} Consider strengthening evidence.`;
  } else if (overallConfidence >= 0.4) {
    return `Low-moderate confidence.${uncertaintyNote} Significant gaps may exist.`;
  } else {
    return `Low confidence.${uncertaintyNote} Substantial revision recommended.`;
  }
}

/**
 * Generate warnings for low confidence dimensions
 */
function generateConfidenceWarnings(
  calibration: ServerMetacognitionResponse["confidenceCalibration"]
): string[] {
  const warnings: string[] = [];
  const threshold = 0.5;

  if (calibration.evidenceQuality < threshold) {
    warnings.push("Evidence quality is below acceptable threshold");
  }
  if (calibration.reasoningCoherence < threshold) {
    warnings.push("Reasoning coherence needs improvement");
  }
  if (calibration.completeness < threshold) {
    warnings.push("Analysis may be incomplete");
  }
  if (calibration.uncertaintyLevel > 1 - threshold) {
    warnings.push("High uncertainty detected in the reasoning");
  }

  return warnings;
}

// ============================================================================
// Bias Detection Types
// ============================================================================

export type BiasType =
  | "confirmation"
  | "anchoring"
  | "availability"
  | "recency"
  | "representativeness"
  | "framing"
  | "sunk_cost"
  | "attribution";

export interface BiasDetection {
  type: BiasType;
  severity: number;
  evidence: string[];
  correctionStrategy: string;
}

export interface DetectBiasRequest {
  reasoning: string;
  context?: string;
  monitorContinuously?: boolean;
}

export interface DetectBiasResponse {
  biases: BiasDetection[];
  overallRisk: "low" | "medium" | "high";
  recommendations: string[];
  processingTimeMs: number;
}

// ============================================================================
// Emotion Detection Types
// ============================================================================

export type DiscreteEmotion =
  | "joy"
  | "sadness"
  | "anger"
  | "fear"
  | "disgust"
  | "surprise"
  | "pride"
  | "shame"
  | "guilt"
  | "gratitude"
  | "awe";

export interface CircumplexResult {
  valence: number;
  arousal: number;
  dominance: number;
}

export interface DiscreteEmotionResult {
  emotion: DiscreteEmotion;
  score: number;
  intensity: "low" | "medium" | "high";
}

export interface DetectEmotionRequest {
  text: string;
  includeDiscrete?: boolean;
  context?: string;
}

/**
 * Server response format for /api/v1/emotion/detect
 * Matches the actual server response structure from src/server/routes/emotion.ts
 */
export interface ServerEmotionDetectResponse {
  circumplex: CircumplexResult;
  discrete: Array<{
    emotion: DiscreteEmotion;
    confidence: number;
    intensity: number;
  }>;
}

/**
 * UI-friendly response format for emotion detection
 */
export interface DetectEmotionResponse {
  circumplex: CircumplexResult;
  discreteEmotions: DiscreteEmotionResult[];
  dominantEmotion?: DiscreteEmotion;
  interpretation: string;
  processingTimeMs: number;
}

/**
 * Generate interpretation based on circumplex values and dominant emotion.
 * Based on the Circumplex model of affect.
 */
function generateEmotionInterpretation(
  circumplex: CircumplexResult,
  dominantEmotion?: DiscreteEmotion
): string {
  const { valence, arousal } = circumplex;

  let stateDescription: string;

  // Determine emotional state based on circumplex quadrant
  if (valence > 0.3 && arousal > 0.3) {
    stateDescription = "Excited, energetic emotional state";
  } else if (valence > 0.3 && arousal < -0.3) {
    stateDescription = "Calm, content emotional state";
  } else if (valence < -0.3 && arousal > 0.3) {
    stateDescription = "Stressed, anxious emotional state";
  } else if (valence < -0.3 && arousal < -0.3) {
    stateDescription = "Sad, depressed emotional state";
  } else {
    stateDescription = "Neutral emotional state";
  }

  // Add dominant emotion context if available
  if (dominantEmotion !== undefined) {
    return `${stateDescription}. Primary emotion detected: ${dominantEmotion}.`;
  }

  return stateDescription;
}

/**
 * Convert intensity value (0-1) to categorical intensity level.
 */
function getIntensityLevel(intensity: number): "low" | "medium" | "high" {
  if (intensity >= 0.7) return "high";
  if (intensity >= 0.4) return "medium";
  return "low";
}

/**
 * Transform server emotion response to UI-friendly format.
 * Maps confidence to score, calculates dominant emotion, and generates interpretation.
 */
export function transformEmotionResponse(
  serverResponse: ServerEmotionDetectResponse,
  processingTimeMs: number = 0
): DetectEmotionResponse {
  // Transform discrete emotions: map confidence to score, convert intensity to categorical
  const discreteEmotions: DiscreteEmotionResult[] = serverResponse.discrete.map((d) => ({
    emotion: d.emotion,
    score: d.confidence, // Map confidence to score
    intensity: getIntensityLevel(d.intensity),
  }));

  // Calculate dominant emotion (highest confidence emotion with confidence > 0)
  const sortedEmotions = [...serverResponse.discrete].sort((a, b) => b.confidence - a.confidence);
  const topEmotion = sortedEmotions[0];
  const dominantEmotion =
    topEmotion !== undefined && topEmotion.confidence > 0 ? topEmotion.emotion : undefined;

  // Generate interpretation based on circumplex values and dominant emotion
  const interpretation = generateEmotionInterpretation(serverResponse.circumplex, dominantEmotion);

  // Build response, only including dominantEmotion if it exists
  const response: DetectEmotionResponse = {
    circumplex: serverResponse.circumplex,
    discreteEmotions,
    interpretation,
    processingTimeMs,
  };

  if (dominantEmotion !== undefined) {
    response.dominantEmotion = dominantEmotion;
  }

  return response;
}

/**
 * Create an empty emotion response for error cases.
 * Prevents UI crashes when the API fails.
 */
export function createEmptyEmotionResponse(errorMessage?: string): DetectEmotionResponse {
  const interpretation =
    errorMessage !== undefined && errorMessage.length > 0
      ? `Emotion analysis failed: ${errorMessage}`
      : "No emotional content detected";
  return {
    circumplex: {
      valence: 0,
      arousal: 0,
      dominance: 0,
    },
    discreteEmotions: [],
    interpretation,
    processingTimeMs: 0,
  };
}

// ============================================================================
// Reasoning Analysis Types
// ============================================================================

export interface EvaluateRequest {
  reasoning: string;
  context?: string;
  includeConfidence?: boolean;
  includeBias?: boolean;
  includeEmotion?: boolean;
}

export interface EvaluateResponse {
  quality: {
    coherence: number;
    completeness: number;
    logicalValidity: number;
    evidenceSupport: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  confidence?: AssessConfidenceResponse;
  biases?: DetectBiasResponse;
  emotion?: DetectEmotionResponse;
  processingTimeMs: number;
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
  meta?: {
    requestId?: string;
    processingTimeMs?: number;
  };
}

// ============================================================================
// API Error Types
// ============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends Error {
  constructor(message: string = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

// ============================================================================
// WebSocket Event Types (Requirements: 10.1-10.5)
// ============================================================================

export type ActivityEventType =
  | "memory_operation"
  | "memory_created"
  | "memory_updated"
  | "memory_deleted"
  | "reasoning_update"
  | "load_change"
  | "session_event"
  | "system_event"
  | "heartbeat"
  | "connection_established";

export interface MemoryOperationData {
  operation: "store" | "recall" | "update" | "delete" | "search";
  memoryId?: string;
  userId: string;
  sector?: string;
  success: boolean;
  duration?: number;
}

/**
 * Memory created event data
 * Requirements: 3.4
 */
export interface MemoryCreatedEventData {
  /** The created memory object */
  memory: Memory;
  /** User ID for scoped broadcasting */
  userId: string;
  /** Temporary ID for matching optimistic updates */
  tempId?: string;
}

/**
 * Memory updated event data
 * Requirements: 3.5
 */
export interface MemoryUpdatedEventData {
  /** Memory ID that was updated */
  memoryId: string;
  /** User ID for scoped broadcasting */
  userId: string;
  /** Updated fields */
  updates: Partial<Memory>;
  /** Reason for update (e.g., 'embedding_complete', 'user_edit') */
  reason: string;
}

/**
 * Memory deleted event data
 * Requirements: 3.6
 */
export interface MemoryDeletedEventData {
  /** Memory ID that was deleted */
  memoryId: string;
  /** User ID for scoped broadcasting */
  userId: string;
}

export interface ReasoningUpdateData {
  sessionId: string;
  stage: string;
  progress: number;
  activeStreams?: string[];
  mode?: string;
}

export interface LoadChangeData {
  loadLevel: number;
  activeProcesses: number;
  memoryOpsPerSecond: number;
  reasoningSessions: number;
  visualIntensity: "low" | "medium" | "high";
}

export interface SessionEventData {
  event: "created" | "updated" | "deleted";
  sessionId: string;
  userId?: string;
}

export interface SystemEventData {
  event: "startup" | "shutdown" | "health_change" | "config_change";
  status?: string;
  message?: string;
}

export interface HeartbeatData {
  message: string;
}

export interface ConnectionEstablishedData {
  message: string;
}

export type ActivityEventData =
  | MemoryOperationData
  | MemoryCreatedEventData
  | MemoryUpdatedEventData
  | MemoryDeletedEventData
  | ReasoningUpdateData
  | LoadChangeData
  | SessionEventData
  | SystemEventData
  | HeartbeatData
  | ConnectionEstablishedData;

export interface ActivityEvent {
  type: ActivityEventType;
  timestamp: string;
  data: ActivityEventData;
}

// ============================================================================
// WebSocket Client Types
// ============================================================================

export type WebSocketConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface WebSocketClientConfig {
  /** WebSocket URL (e.g., 'ws://localhost:3000/api/v1/activity/live') */
  url: string;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base delay between reconnection attempts in ms (default: 1000) */
  reconnectDelay?: number;
  /** Maximum reconnection delay in ms (default: 30000) */
  maxReconnectDelay?: number;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;
}

export interface QueuedEvent {
  event: ActivityEvent;
  timestamp: number;
}
