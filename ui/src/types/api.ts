/**
 * ThoughtMCP REST API Type Definitions
 *
 * TypeScript interfaces for all API request/response types.
 * Requirements: 5.5, 16.2-16.6
 */

// ============================================================================
// Memory Sector Types
// ============================================================================

export type MemorySectorType = 'episodic' | 'semantic' | 'procedural' | 'emotional' | 'reflective';

export const VALID_SECTORS: MemorySectorType[] = [
  'episodic',
  'semantic',
  'procedural',
  'emotional',
  'reflective',
];

// ============================================================================
// Link Types
// ============================================================================

export type LinkType = 'semantic' | 'causal' | 'temporal' | 'analogical';

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

export type RankingMethod = 'similarity' | 'salience';

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
  trend: 'improving' | 'declining' | 'stable';
  memoryCount: number;
}

// ============================================================================
// Activity Types
// ============================================================================

export interface ActivityItem {
  type: 'create' | 'update' | 'delete' | 'access';
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

// Server-side think modes
export type ThinkMode = 'intuitive' | 'deliberative' | 'balanced' | 'creative' | 'analytical';

// UI-side reasoning modes (mapped to server modes)
export type ReasoningMode = 'analytical' | 'creative' | 'critical' | 'synthetic' | 'parallel';

/**
 * Map UI reasoning mode to server think mode
 */
export function mapReasoningModeToThinkMode(mode: ReasoningMode): ThinkMode {
  const mapping: Record<ReasoningMode, ThinkMode> = {
    analytical: 'analytical',
    creative: 'creative',
    critical: 'deliberative', // Critical thinking maps to deliberative
    synthetic: 'balanced', // Synthetic maps to balanced
    parallel: 'balanced', // Parallel uses balanced as default
  };
  return mapping[mode];
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

export interface ThinkResponse {
  thoughts: ThoughtItem[];
  confidence: number;
  modeUsed: ThinkMode;
  processingTimeMs: number;
  metacognitiveAssessment: MetacognitiveAssessment;
  conclusion: string;
  recommendations: RecommendationItem[];
  // Legacy fields for backward compatibility (populated by client)
  mode?: ReasoningMode;
  analysis?: string;
  insights?: string[];
  biases?: BiasDetection[];
}

// Stream types for parallel reasoning
export type StreamType = 'analytical' | 'creative' | 'critical' | 'synthetic';

export interface ParallelThinkRequest {
  problem: string;
  streams: StreamType[];
  userId?: string;
  timeout?: number;
  context?: string;
  coordinationStrategy?: string;
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
 */
export function transformParallelResponse(
  serverResponse: ServerParallelResponse
): ParallelThinkResponse {
  try {
    // Transform streams array to Record
    const streams: Record<string, StreamResult> = {};

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
    console.error('Error transforming parallel response:', error);
    return createEmptyParallelResponse(error instanceof Error ? error.message : 'Transform error');
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
      : 'No analysis available';
  const emptyStream: StreamResult = {
    mode: 'analytical',
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
      analytical: { ...emptyStream, mode: 'analytical' },
      creative: { ...emptyStream, mode: 'creative' },
      critical: { ...emptyStream, mode: 'critical' },
      synthetic: { ...emptyStream, mode: 'synthetic' },
      parallel: { ...emptyStream, mode: 'parallel' },
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
  | 'scientific-method'
  | 'design-thinking'
  | 'systems-thinking'
  | 'critical-thinking'
  | 'creative-problem-solving'
  | 'root-cause-analysis'
  | 'first-principles'
  | 'scenario-planning';

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
 */
export interface ServerFrameworkSelectResponse {
  selectedFramework: {
    id: string;
    name: string;
    description: string;
    steps: Array<{
      name: string;
      description: string;
      order: number;
    }>;
    applicability: number;
  };
  alternativeFrameworks: Array<{
    id: string;
    name: string;
    applicability: number;
  }>;
  reasoning: string;
  processingTimeMs: number;
}

/**
 * UI-friendly framework selection response
 */
export interface FrameworkSelectResponse {
  framework: FrameworkType;
  frameworkName: string;
  description: string;
  applicability: number;
  alternatives: Array<{
    framework: FrameworkType;
    name: string;
    applicability: number;
  }>;
  reasoning: string;
  processingTimeMs: number;
}

/**
 * Transform server framework select response to AnalyzeResponse format
 */
export function transformFrameworkSelectResponse(
  serverResponse: ServerFrameworkSelectResponse,
  problem: string
): AnalyzeResponse {
  const { selectedFramework, reasoning, processingTimeMs } = serverResponse;

  // Map server framework ID to FrameworkType
  const frameworkId = selectedFramework.id.toLowerCase().replace(/_/g, '-') as FrameworkType;

  // Transform steps to FrameworkStep format
  const steps: FrameworkStep[] = selectedFramework.steps.map((step) => ({
    name: step.name,
    description: step.description,
    result: '', // Result will be populated when the framework is actually applied
  }));

  const problemPreview = problem.substring(0, 100) + (problem.length > 100 ? '...' : '');
  const alternativeRecs = serverResponse.alternativeFrameworks.slice(0, 2).map((alt) => {
    const percentage = String(Math.round(alt.applicability * 100));
    return `Alternative: ${alt.name} (${percentage}% applicable)`;
  });

  return {
    framework: frameworkId,
    frameworkName: selectedFramework.name,
    steps,
    conclusion: `Recommended framework: ${selectedFramework.name}. ${reasoning}`,
    recommendations: [
      `Apply ${selectedFramework.name} to analyze: "${problemPreview}"`,
      ...alternativeRecs,
    ],
    processingTimeMs,
  };
}

// ============================================================================
// Problem Decomposition Types
// ============================================================================

export interface DecomposeRequest {
  problem: string;
  maxDepth?: number;
  userId?: string;
  context?: string;
  strategy?: 'recursive' | 'parallel' | 'sequential';
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
  complexity: 'low' | 'medium' | 'high';
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
  dependencies: ServerDecomposeResponse['dependencies'],
  priorityOrder: string[]
): SubProblem {
  const nodeDeps = dependencies.filter((d) => d.to === node.id).map((d) => d.from);
  const executionOrder = priorityOrder.indexOf(node.id);

  const result: SubProblem = {
    id: node.id,
    description: node.description,
    complexity: node.depth <= 1 ? 'high' : node.depth === 2 ? 'medium' : 'low',
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
        ? Math.max(...allSubProblems.map((sp) => sp.id.split('-').length))
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
    console.error('Error transforming decompose response:', error);
    const problemDescription = serverResponse.decompositionTree.description;
    return createEmptyDecomposeResponse(
      problemDescription,
      error instanceof Error ? error.message : 'Transform error'
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
    id: 'root',
    description,
    complexity: 'high',
    dependencies: [],
    executionOrder: 0,
  };

  return {
    rootProblem: problem,
    subProblems: [rootSubProblem],
    totalSubProblems: 1,
    maxDepth: 1,
    suggestedOrder: ['root'],
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
  confidenceCalibration: {
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
  };
  biasesDetected: Array<{
    type: string;
    severity: number;
    evidence: string[];
    correctionStrategy: string;
  }>;
  recommendations: string[];
  processingTimeMs: number;
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
  const { confidenceCalibration, biasesDetected, recommendations, processingTimeMs } =
    serverResponse;

  // Calculate overall risk based on bias severities
  const maxSeverity =
    biasesDetected.length > 0 ? Math.max(...biasesDetected.map((b) => b.severity)) : 0;
  const overallRisk: 'low' | 'medium' | 'high' =
    maxSeverity >= 0.7 ? 'high' : maxSeverity >= 0.4 ? 'medium' : 'low';

  // Generate interpretation from confidence data
  const interpretation = generateConfidenceInterpretation(confidenceCalibration);

  // Generate warnings from low confidence dimensions
  const warnings = generateConfidenceWarnings(confidenceCalibration);

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
  calibration: ServerMetacognitionResponse['confidenceCalibration']
): string {
  const { overallConfidence, uncertaintyType } = calibration;
  const uncertaintyNote =
    uncertaintyType.length > 0 ? ` Primary uncertainty: ${uncertaintyType}.` : '';

  if (overallConfidence >= 0.8) {
    return 'High confidence in the reasoning quality. The analysis is well-supported and coherent.';
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
  calibration: ServerMetacognitionResponse['confidenceCalibration']
): string[] {
  const warnings: string[] = [];
  const threshold = 0.5;

  if (calibration.evidenceQuality < threshold) {
    warnings.push('Evidence quality is below acceptable threshold');
  }
  if (calibration.reasoningCoherence < threshold) {
    warnings.push('Reasoning coherence needs improvement');
  }
  if (calibration.completeness < threshold) {
    warnings.push('Analysis may be incomplete');
  }
  if (calibration.uncertaintyLevel > 1 - threshold) {
    warnings.push('High uncertainty detected in the reasoning');
  }

  return warnings;
}

// ============================================================================
// Bias Detection Types
// ============================================================================

export type BiasType =
  | 'confirmation'
  | 'anchoring'
  | 'availability'
  | 'recency'
  | 'representativeness'
  | 'framing'
  | 'sunk_cost'
  | 'attribution';

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
  overallRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
  processingTimeMs: number;
}

// ============================================================================
// Emotion Detection Types
// ============================================================================

export type DiscreteEmotion =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'disgust'
  | 'surprise'
  | 'pride'
  | 'shame'
  | 'guilt'
  | 'gratitude'
  | 'awe';

export interface CircumplexResult {
  valence: number;
  arousal: number;
  dominance: number;
}

export interface DiscreteEmotionResult {
  emotion: DiscreteEmotion;
  score: number;
  intensity: 'low' | 'medium' | 'high';
}

export interface DetectEmotionRequest {
  text: string;
  includeDiscrete?: boolean;
  context?: string;
}

export interface DetectEmotionResponse {
  circumplex: CircumplexResult;
  discreteEmotions: DiscreteEmotionResult[];
  dominantEmotion?: DiscreteEmotion;
  interpretation: string;
  processingTimeMs: number;
}

/**
 * Create an empty emotion response for error cases.
 * Prevents UI crashes when the API fails.
 */
export function createEmptyEmotionResponse(errorMessage?: string): DetectEmotionResponse {
  const interpretation =
    errorMessage !== undefined && errorMessage.length > 0
      ? `Emotion analysis failed: ${errorMessage}`
      : 'No emotional content detected';
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
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ============================================================================
// WebSocket Event Types (Requirements: 10.1-10.5)
// ============================================================================

export type ActivityEventType =
  | 'memory_operation'
  | 'reasoning_update'
  | 'load_change'
  | 'session_event'
  | 'system_event'
  | 'heartbeat'
  | 'connection_established';

export interface MemoryOperationData {
  operation: 'store' | 'recall' | 'update' | 'delete' | 'search';
  memoryId?: string;
  userId: string;
  sector?: string;
  success: boolean;
  duration?: number;
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
  visualIntensity: 'low' | 'medium' | 'high';
}

export interface SessionEventData {
  event: 'created' | 'updated' | 'deleted';
  sessionId: string;
  userId?: string;
}

export interface SystemEventData {
  event: 'startup' | 'shutdown' | 'health_change' | 'config_change';
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

export type WebSocketConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

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
