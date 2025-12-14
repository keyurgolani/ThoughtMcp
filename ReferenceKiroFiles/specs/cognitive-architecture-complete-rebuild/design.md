# ThoughtMCP Cognitive Architecture Complete Rebuild - Design Document

## Overview

This design document outlines the comprehensive rebuild of ThoughtMCP's cognitive architecture, transforming it into a production-ready AI brain construct. The design integrates Hierarchical Memory Decomposition (HMD) with PostgreSQL persistence, real-time systematic thinking, parallel reasoning streams, dynamic framework selection, confidence calibration, bias detection, emotional intelligence, and metacognitive monitoring.

The architecture follows a layered approach with clear separation of concerns:

- **Persistence Layer**: PostgreSQL with pgvector for memory storage
- **Memory Layer**: HMD with five-sector embeddings and waypoint graphs
- **Reasoning Layer**: Parallel streams and systematic thinking frameworks
- **Metacognitive Layer**: Confidence calibration, bias detection, self-improvement
- **Integration Layer**: MCP tools and standardized responses

**Critical Design Principle**: Test-Driven Development (TDD) throughout. Every feature must have failing tests written first, then minimal implementation to pass tests, followed by refactoring.

## Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       MCP Interface Layer                     │
│  Enhanced tools with comprehensive schemas and validation    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Cognitive Orchestrator                      │
│  Coordinates all cognitive components and manages workflow   │
└─────┬──────────────┬────────────┬──────────────┬────────────┘
      │              │            │              │
┌─────▼─────┐ ┌─────▼─────┐ ┌───▼────┐ ┌───────▼────────┐
│ Reasoning │ │  Memory   │ │ Bias   │ │  Metacognition │
│  Engine   │ │  System   │ │Detector│ │    Monitor     │
└─────┬─────┘ └─────┬─────┘ └───┬────┘ └───────┬────────┘
      │              │            │              │
      │      ┌───────▼────────────▼──────────┐   │
      │      │   HMD Memory Layer            │   │
      │      │  • Five-Sector Embeddings    │   │
      │      │  • Temporal Decay System     │   │
      └──────►  • Waypoint Graph           ◄───┘
             │  • Search & Retrieval        │
             └───────────┬───────────────────┘
                         │
             ┌───────────▼───────────────────┐
             │  PostgreSQL Persistence       │
             │  • pgvector extension         │
             │  • Connection pooling         │
             │  • Transaction management     │
             └───────────────────────────────┘
```

### Data Flow Architecture

**Memory Creation Flow:**

```
User Input → Cognitive Orchestrator
    ↓
Sector Classification (which memory types apply?)
    ↓
Atomization (break into single-concept units if needed)
    ↓
Embedding Generation (per sector, per atomic unit)
    ↓
Waypoint Graph Integration (find 1-3 best links)
    ↓
Metadata Enrichment (timestamps, salience, emotion)
    ↓
PostgreSQL Persistence (transactional write)
    ↓
Metacognitive Review (confidence, bias check)
    ↓
Standardized Response to User
```

**Memory Retrieval Flow:**

```
Query → Cognitive Orchestrator
    ↓
Query Analysis (intent, required sectors, complexity)
    ↓
Multi-Strategy Parallel Retrieval:
    ├─ Vector Similarity (pgvector cosine)
    ├─ Graph Traversal (1-hop waypoint expansion)
    ├─ Full-Text Search (ts_vector)
    └─ Metadata Filtering (GIN indexes)
    ↓
Composite Scoring (0.6×sim + 0.2×sal + 0.1×rec + 0.1×link)
    ↓
Top-K Selection and Ranking
    ↓
Metacognitive Assessment (relevance confidence)
    ↓
Standardized Response with Guidance
```

## Components and Interfaces

### 1. PostgreSQL Foundation

#### Database Connection Manager

```typescript
interface DatabaseConnectionManager {
  pool: pg.Pool;
  config: DatabaseConfig;

  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnection(): Promise<pg.PoolClient>;
  releaseConnection(client: pg.PoolClient): void;

  // Transaction support
  beginTransaction(): Promise<pg.PoolClient>;
  commitTransaction(client: pg.PoolClient): Promise<void>;
  rollbackTransaction(client: pg.PoolClient): Promise<void>;

  // Health checks
  healthCheck(): Promise<boolean>;
  getPoolStats(): PoolStatistics;
}

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  poolSize: number; // default 20
  connectionTimeout: number; // default 5000ms
  idleTimeout: number; // default 30000ms
}
```

#### Schema Migration System

```typescript
interface SchemaMigrationSystem {
  migrations: Migration[];

  // Migration operations
  runMigrations(): Promise<void>;
  rollbackMigration(version: number): Promise<void>;
  getCurrentVersion(): Promise<number>;

  // Schema creation
  createMemoriesTable(): Promise<void>;
  createEmbeddingsTable(): Promise<void>;
  createLinksTable(): Promise<void>;
  createMetadataTable(): Promise<void>;
  createIndexes(): Promise<void>;

  // pgvector setup
  enablePgvectorExtension(): Promise<void>;
  createVectorIndexes(): Promise<void>;
}
```

### 2. Five-Sector Embedding System

#### Embedding Engine

```typescript
interface EmbeddingEngine {
  model: EmbeddingModel; // Ollama, E5, BGE, OpenAI
  cache: EmbeddingCache;

  // Sector-specific generation
  generateEpisodicEmbedding(
    content: string,
    context: TemporalContext
  ): Promise<number[]>;
  generateSemanticEmbedding(content: string): Promise<number[]>;
  generateProceduralEmbedding(content: string): Promise<number[]>;
  generateEmotionalEmbedding(
    content: string,
    emotion: EmotionState
  ): Promise<number[]>;
  generateReflectiveEmbedding(
    content: string,
    insights: string[]
  ): Promise<number[]>;

  // Batch operations
  generateAllSectorEmbeddings(memory: MemoryContent): Promise<SectorEmbeddings>;
  batchGenerateEmbeddings(
    memories: MemoryContent[]
  ): Promise<SectorEmbeddings[]>;

  // Model management
  loadModel(modelName: string): Promise<void>;
  getModelDimension(): number;
}

interface SectorEmbeddings {
  episodic: number[];
  semantic: number[];
  procedural: number[];
  emotional: number[];
  reflective: number[];
}
```

#### Embedding Storage

```typescript
interface EmbeddingStorage {
  db: DatabaseConnectionManager;

  // Storage operations
  storeEmbeddings(
    memoryId: string,
    embeddings: SectorEmbeddings
  ): Promise<void>;
  retrieveEmbeddings(
    memoryId: string,
    sectors?: MemorySector[]
  ): Promise<SectorEmbeddings>;
  updateEmbeddings(
    memoryId: string,
    embeddings: Partial<SectorEmbeddings>
  ): Promise<void>;
  deleteEmbeddings(memoryId: string): Promise<void>;

  // Search operations
  vectorSimilaritySearch(
    queryEmbedding: number[],
    sector: MemorySector,
    limit: number,
    threshold: number
  ): Promise<SimilarityResult[]>;

  multiSectorSearch(
    queryEmbeddings: Partial<SectorEmbeddings>,
    weights: SectorWeights,
    limit: number
  ): Promise<SimilarityResult[]>;
}
```

### 3. Waypoint Graph System

#### Graph Builder

```typescript
interface WaypointGraphBuilder {
  db: DatabaseConnectionManager;
  similarityThreshold: number; // default 0.7
  maxLinksPerNode: number; // default 1-3

  // Link creation
  createWaypointLinks(
    newMemory: Memory,
    existingMemories: Memory[]
  ): Promise<Link[]>;
  findBestMatches(
    memory: Memory,
    candidates: Memory[],
    maxLinks: number
  ): Promise<Memory[]>;
  calculateLinkWeight(memory1: Memory, memory2: Memory): Promise<number>;

  // Link management
  addLink(
    sourceId: string,
    targetId: string,
    linkType: LinkType,
    weight: number
  ): Promise<void>;
  removeLink(sourceId: string, targetId: string): Promise<void>;
  updateLinkWeight(
    sourceId: string,
    targetId: string,
    newWeight: number
  ): Promise<void>;

  // Graph maintenance
  pruneWeakLinks(threshold: number): Promise<number>;
  detectOrphanedNodes(): Promise<string[]>;
  rebalanceGraph(): Promise<void>;
}

interface GraphTraversal {
  db: DatabaseConnectionManager;

  // Traversal operations
  expandViaWaypoint(startMemoryId: string, hops: number): Promise<Memory[]>;
  findPath(sourceId: string, targetId: string, maxDepth: number): Promise<Path>;
  getConnectedMemories(memoryId: string): Promise<Memory[]>;

  // Path analysis
  explainPath(path: Path): string;
  calculatePathStrength(path: Path): number;
  findAlternativePaths(sourceId: string, targetId: string): Promise<Path[]>;
}
```

### 4. Memory Operations

#### Memory Repository

```typescript
interface MemoryRepository {
  db: DatabaseConnectionManager;
  embeddingEngine: EmbeddingEngine;
  graphBuilder: WaypointGraphBuilder;

  // CRUD operations
  create(content: MemoryContent, metadata: MemoryMetadata): Promise<Memory>;
  retrieve(memoryId: string): Promise<Memory | null>;
  update(memoryId: string, updates: Partial<Memory>): Promise<Memory>;
  delete(memoryId: string, soft: boolean): Promise<void>;

  // Search operations
  search(query: SearchQuery): Promise<SearchResult>;
  findSimilar(memoryId: string, limit: number): Promise<Memory[]>;
  filterByMetadata(filters: MetadataFilters): Promise<Memory[]>;

  // Batch operations
  batchCreate(memories: MemoryContent[]): Promise<Memory[]>;
  batchUpdate(updates: Map<string, Partial<Memory>>): Promise<void>;
  batchDelete(memoryIds: string[]): Promise<void>;
}

interface SearchQuery {
  text?: string; // full-text search
  embedding?: number[]; // vector similarity
  sectors?: MemorySector[]; // which sectors to search
  metadata?: MetadataFilters; // keyword, tag, category filters
  dateRange?: DateRange; // temporal filtering
  minStrength?: number; // strength threshold
  limit?: number; // result limit
  offset?: number; // pagination
}
```

#### Temporal Decay Engine

```typescript
interface TemporalDecayEngine {
  config: DecayConfig;
  db: DatabaseConnectionManager;

  // Decay operations
  applyDecay(memory: Memory): Promise<void>;
  batchApplyDecay(memories: Memory[]): Promise<void>;
  calculateDecayedStrength(memory: Memory, currentTime: Date): number;

  // Reinforcement
  reinforceMemory(memoryId: string, boost: number): Promise<void>;
  autoReinforceOnAccess(memoryId: string): Promise<void>;

  // Scheduling
  scheduleDecayJob(cronExpression: string): void;
  runDecayMaintenance(): Promise<DecayMaintenanceResult>;

  // Pruning
  identifyPruningCandidates(threshold: number): Promise<string[]>;
  pruneMemories(memoryIds: string[]): Promise<number>;
}

interface DecayConfig {
  baseLambda: number; // 0.02 default
  sectorMultipliers: Record<MemorySector, number>;
  reinforcementBoost: number; // 0.3 default
  minimumStrength: number; // 0.1 floor
  pruningThreshold: number; // 0.2 default
}
```

### 5. Parallel Reasoning Streams

#### Parallel Reasoning Processor

```typescript
interface ParallelReasoningProcessor {
  streams: ReasoningStream[];
  coordinator: StreamCoordinator;
  synthesizer: ResultSynthesizer;

  // Main processing
  processParallel(
    problem: Problem,
    timeout: number
  ): Promise<ParallelReasoningResult>;

  // Stream management
  initializeStreams(problem: Problem): ReasoningStream[];
  executeStreams(streams: ReasoningStream[]): Promise<StreamResult[]>;
  handleStreamTimeout(stream: ReasoningStream): void;
  handleStreamFailure(stream: ReasoningStream, error: Error): void;
}

interface ReasoningStream {
  id: string;
  type: "analytical" | "creative" | "critical" | "synthetic";
  processor: StreamProcessor;
  timeout: number; // 10s per stream

  // Processing
  process(problem: Problem): Promise<StreamResult>;
  getProgress(): number; // 0-1
  cancel(): void;
}

interface StreamCoordinator {
  synchronizationPoints: number[]; // [0.25, 0.5, 0.75]

  // Coordination
  synchronizeStreams(streams: ReasoningStream[]): Promise<void>;
  shareInsights(streams: ReasoningStream[]): Promise<void>;
  detectConvergence(streams: ReasoningStream[]): boolean;
  measureCoordinationOverhead(): number;
}

interface ResultSynthesizer {
  // Synthesis
  synthesizeResults(results: StreamResult[]): SynthesizedResult;
  attributeInsights(
    insights: Insight[],
    results: StreamResult[]
  ): AttributedInsight[];
  rankRecommendations(recommendations: Recommendation[]): Recommendation[];
  preserveConflicts(results: StreamResult[]): Conflict[];
}
```

### 6. Dynamic Framework Selection

#### Framework Selector

```typescript
interface DynamicFrameworkSelector {
  frameworks: Map<string, ThinkingFramework>;
  classifier: ProblemClassifier;
  learningSystem: FrameworkLearningSystem;

  // Selection
  selectFramework(problem: Problem, context: Context): FrameworkSelection;
  createHybridFramework(frameworks: ThinkingFramework[]): HybridFramework;

  // Available frameworks
  getAvailableFrameworks(): ThinkingFramework[];
  getFrameworkDescription(frameworkId: string): string;
}

interface ThinkingFramework {
  id: string;
  name: string;
  description: string;
  bestSuitedFor: ProblemCharacteristics[];
  steps: FrameworkStep[];

  // Execution
  execute(problem: Problem, context: Context): Promise<FrameworkResult>;
  adapt(problem: Problem, progress: ExecutionProgress): Promise<void>;
}

interface ProblemClassifier {
  // Classification
  classify(problem: Problem): ProblemClassification;
  assessComplexity(problem: Problem): "simple" | "moderate" | "complex";
  assessUncertainty(problem: Problem): "low" | "medium" | "high";
  assessStakes(problem: Problem): "routine" | "important" | "critical";
  assessTimePressure(problem: Problem): "none" | "moderate" | "high";
}
```

### 7. Confidence Calibration System

#### Confidence Assessor

```typescript
interface MultiDimensionalConfidenceAssessor {
  calibrationModel: CalibrationModel;

  // Assessment
  assessConfidence(context: ReasoningContext): ConfidenceAssessment;
  assessEvidenceQuality(evidence: Evidence[]): number;
  assessReasoningCoherence(reasoning: ReasoningChain): number;
  assessCompleteness(
    result: ReasoningResult,
    requirements: Requirement[]
  ): number;
  classifyUncertainty(context: ReasoningContext): UncertaintyType;

  // Calibration
  calibrateConfidence(rawConfidence: number, context: ReasoningContext): number;
  updateCalibrationModel(predictions: Prediction[], outcomes: Outcome[]): void;
}

interface CalibrationLearningEngine {
  models: Map<string, CalibrationModel>; // domain-specific models

  // Learning
  trackPredictionOutcome(prediction: Prediction, outcome: Outcome): void;
  trainCalibrationModel(domain: string, data: PredictionOutcomePair[]): void;
  calculateCalibrationError(
    predictions: Prediction[],
    outcomes: Outcome[]
  ): number;

  // Improvement
  identifyCalibrationBiases(): CalibrationBias[];
  adjustFactorWeights(biases: CalibrationBias[]): void;
}

interface ConfidenceCommunicationModule {
  // Communication
  formatConfidence(confidence: number): string;
  provideInterpretation(confidence: number, context: ReasoningContext): string;
  explainUncertainty(uncertainty: UncertaintyType): string;
  recommendActions(confidence: number): string[];
  generateFactorBreakdown(assessment: ConfidenceAssessment): FactorBreakdown;
}
```

### 8. Bias Detection and Mitigation

#### Bias Pattern Recognizer

```typescript
interface BiasPatternRecognizer {
  detectors: Map<BiasType, BiasDetector>;

  // Detection
  detectBiases(reasoning: ReasoningChain): DetectedBias[];
  detectConfirmationBias(reasoning: ReasoningChain): DetectedBias | null;
  detectAnchoringBias(reasoning: ReasoningChain): DetectedBias | null;
  detectAvailabilityBias(reasoning: ReasoningChain): DetectedBias | null;
  detectRecencyBias(reasoning: ReasoningChain): DetectedBias | null;
  detectRepresentativenessBias(reasoning: ReasoningChain): DetectedBias | null;
  detectFramingEffects(reasoning: ReasoningChain): DetectedBias | null;
  detectSunkCostFallacy(reasoning: ReasoningChain): DetectedBias | null;
  detectAttributionBias(reasoning: ReasoningChain): DetectedBias | null;

  // Assessment
  assessBiasSeverity(bias: DetectedBias): number; // 0-1
  identifyBiasPatterns(history: ReasoningChain[]): BiasPattern[];
}

interface BiasMonitoringSystem {
  recognizer: BiasPatternRecognizer;
  alertThreshold: number;

  // Monitoring
  monitorContinuously(reasoning: ReasoningChain): void;
  generateRealTimeAlerts(biases: DetectedBias[]): Alert[];
  measurePerformanceOverhead(): number;

  // Reporting
  generateBiasReport(session: Session): BiasReport;
  trackBiasesOverTime(): BiasTimeSeries;
}

interface BiasCorrectionEngine {
  strategies: Map<BiasType, CorrectionStrategy>;

  // Correction
  correctBias(
    bias: DetectedBias,
    reasoning: ReasoningChain
  ): CorrectedReasoning;
  applyDevilsAdvocate(reasoning: ReasoningChain): AlternativePerspective[];
  reweightEvidence(evidence: Evidence[], bias: DetectedBias): Evidence[];
  generateCounterArguments(argument: Argument): Argument[];

  // Effectiveness
  measureCorrectionEffectiveness(
    before: ReasoningChain,
    after: CorrectedReasoning
  ): number;
  validateCorrection(corrected: CorrectedReasoning): ValidationResult;
}
```

### 9. Emotion Detection and Emotional Intelligence

#### Emotion Analyzer

```typescript
interface CircumplexEmotionAnalyzer {
  model: EmotionModel;

  // Circumplex detection
  detectValence(text: string): number; // -1 to +1
  detectArousal(text: string): number; // 0 to 1
  detectDominance(text: string): number; // -1 to +1

  // Combined analysis
  analyzeCircumplex(text: string): CircumplexState;
  calculateConfidence(state: CircumplexState): number;
}

interface DiscreteEmotionClassifier {
  model: EmotionClassificationModel;

  // Classification
  classifyEmotions(text: string): EmotionClassification[];
  detectJoy(text: string): number;
  detectSadness(text: string): number;
  detectAnger(text: string): number;
  detectFear(text: string): number;
  detectDisgust(text: string): number;
  detectSurprise(text: string): number;
  detectPride(text: string): number;
  detectShame(text: string): number;
  detectGuilt(text: string): number;
  detectGratitude(text: string): number;
  detectAwe(text: string): number;

  // Multi-label support
  classifyMultiLabel(text: string): EmotionClassification[];
  extractEmotionEvidence(text: string, emotion: EmotionType): string[];
}

interface ContextualEmotionProcessor {
  // Context processing
  analyzeConversationHistory(history: Message[]): EmotionalContext;
  considerCulturalFactors(text: string, culture: CulturalContext): EmotionAdjustment;
  adjustForProfessionalContext(emotion: EmotionState, context: ProfessionalContext): EmotionState;
  integrateS ituationalFactors(emotion: EmotionState, situation: Situation): EmotionState;
}

interface EmotionalTrajectoryTracker {
  history: EmotionState[];

  // Tracking
  trackEmotionalState(state: EmotionState): void;
  detectEmotionalShift(threshold: number): EmotionalShift | null;
  recognizePatterns(): EmotionalPattern[];
  identifyTriggers(): EmotionalTrigger[];

  // Insights
  generateTrajectoryInsights(): TrajectoryInsight[];
  predictEmotionalTrend(): EmotionState;
}
```

### 10. Metacognitive Monitoring and Self-Improvement

#### Performance Monitoring System

```typescript
interface PerformanceMonitoringSystem {
  metrics: MetricsCollector;

  // Tracking
  trackReasoningQuality(result: ReasoningResult): void;
  trackConfidenceCalibration(prediction: number, actual: number): void;
  trackBiasDetectionEffectiveness(
    detected: DetectedBias[],
    actual: ActualBias[]
  ): void;
  trackFrameworkSelection(
    selection: FrameworkSelection,
    outcome: Outcome
  ): void;
  trackUserSatisfaction(feedback: UserFeedback): void;

  // Analysis
  generatePerformanceReport(period: TimePeriod): PerformanceReport;
  identifyPerformanceTrends(): PerformanceTrend[];
  calculateQualityMetrics(): QualityMetrics;
}

interface AdaptiveStrategySystem {
  learningEngine: StrategyLearningEngine;

  // Pattern identification
  identifySuccessPatterns(history: StrategyExecution[]): SuccessPattern[];
  identifyFailurePatterns(history: StrategyExecution[]): FailurePattern[];

  // Effectiveness measurement
  measureStrategyEffectiveness(strategy: Strategy, outcomes: Outcome[]): number;
  compareStrategies(
    strategies: Strategy[],
    context: Context
  ): StrategyComparison;

  // Adaptation
  adjustStrategyRules(patterns: Pattern[]): void;
  updateStrategySelection(feedback: Feedback[]): void;

  // Improvement tracking
  demonstrateImprovement(
    baseline: Performance,
    current: Performance
  ): ImprovementMetrics;
}

interface SelfImprovementSystem {
  feedbackIntegrator: FeedbackIntegrator;
  preferenceLearner: PreferenceLearner;
  outcomeTracker: OutcomeTracker;

  // Feedback integration
  integrateFeedback(feedback: UserFeedback): void;
  learnFromCorrections(corrections: Correction[]): void;

  // Preference learning
  learnUserPreferences(interactions: Interaction[]): UserPreferences;
  adaptToPreferences(preferences: UserPreferences): void;

  // Outcome tracking
  trackOutcomes(decisions: Decision[], outcomes: Outcome[]): void;
  analyzeOutcomePatterns(): OutcomePattern[];

  // Improvement measurement
  measureImprovement(period: TimePeriod): ImprovementMetrics;
  generateImprovementReport(): ImprovementReport;
}
```

## Data Models

### Core Memory Models

```typescript
interface Memory {
  id: string;
  content: string;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  salience: number; // 0-1
  decayRate: number; // sector-specific
  strength: number; // 0-1
  userId: string;
  sessionId: string;
  primarySector: MemorySector;
  metadata: MemoryMetadata;
  embeddings?: SectorEmbeddings;
  links?: Link[];
  emotion?: EmotionState;
}

interface MemoryMetadata {
  keywords: string[];
  tags: string[];
  category: string;
  context: string;
  importance: number; // 0-1
  isAtomic: boolean;
  parentId?: string;
}

interface Link {
  sourceId: string;
  targetId: string;
  linkType: "semantic" | "temporal" | "causal" | "analogical";
  weight: number; // 0-1
  createdAt: Date;
  traversalCount: number;
}

interface EmotionState {
  // Circumplex
  valence: number; // -1 to +1
  arousal: number; // 0 to 1
  dominance: number; // -1 to +1

  // Discrete
  discreteEmotions: Map<EmotionType, number>;
  primaryEmotion: EmotionType;
  confidence: number;
}
```

### Reasoning Models

```typescript
interface ReasoningContext {
  problem: Problem;
  evidence: Evidence[];
  constraints: Constraint[];
  goals: Goal[];
  framework?: ThinkingFramework;
  emotionalState?: EmotionState;
}

interface ReasoningResult {
  conclusion: string;
  reasoning: ReasoningChain;
  confidence: ConfidenceAssessment;
  biases: DetectedBias[];
  alternatives: Alternative[];
  recommendations: Recommendation[];
  metadata: ResultMetadata;
}

interface ReasoningChain {
  steps: ReasoningStep[];
  branches: ReasoningBranch[];
  assumptions: Assumption[];
  inferences: Inference[];
}

interface ParallelReasoningResult {
  analyticalResult: StreamResult;
  creativeResult: StreamResult;
  criticalResult: StreamResult;
  syntheticResult: StreamResult;
  synthesis: SynthesizedResult;
  conflicts: Conflict[];
  processingTime: number;
}
```

## Database Schema

### Core Tables

```sql
-- Memory Nodes
CREATE TABLE memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    salience REAL DEFAULT 0.5,
    decay_rate REAL DEFAULT 0.02,
    strength REAL DEFAULT 1.0,
    user_id TEXT NOT NULL,
    session_id TEXT,
    primary_sector TEXT NOT NULL,
    CONSTRAINT valid_salience CHECK (salience >= 0 AND salience <= 1),
    CONSTRAINT valid_strength CHECK (strength >= 0 AND strength <= 1)
);

-- Multi-Sector Embeddings
CREATE TABLE memory_embeddings (
    memory_id TEXT NOT NULL,
    sector TEXT NOT NULL,
    embedding vector(1536), -- pgvector type
    dimension INTEGER NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (memory_id, sector),
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- Waypoint Graph Links
CREATE TABLE memory_links (
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    link_type TEXT NOT NULL,
    weight REAL DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    traversal_count INTEGER DEFAULT 0,
    PRIMARY KEY (source_id, target_id),
    FOREIGN KEY (source_id) REFERENCES memories(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES memories(id) ON DELETE CASCADE,
    CONSTRAINT valid_weight CHECK (weight >= 0 AND weight <= 1),
    CONSTRAINT no_self_links CHECK (source_id != target_id)
);

-- Memory Metadata
CREATE TABLE memory_metadata (
    memory_id TEXT PRIMARY KEY,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    category TEXT,
    context TEXT,
    importance REAL DEFAULT 0.5,
    is_atomic BOOLEAN DEFAULT TRUE,
    parent_id TEXT,
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES memories(id),
    CONSTRAINT valid_importance CHECK (importance >= 0 AND importance <= 1)
);

-- Emotional Annotations
CREATE TABLE memory_emotions (
    memory_id TEXT PRIMARY KEY,
    valence REAL NOT NULL,
    arousal REAL NOT NULL,
    dominance REAL NOT NULL,
    discrete_emotions JSONB NOT NULL,
    primary_emotion TEXT NOT NULL,
    confidence REAL NOT NULL,
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    CONSTRAINT valid_valence CHECK (valence >= -1 AND valence <= 1),
    CONSTRAINT valid_arousal CHECK (arousal >= 0 AND arousal <= 1),
    CONSTRAINT valid_dominance CHECK (dominance >= -1 AND dominance <= 1),
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Performance Indexes
CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_created ON memories(created_at DESC);
CREATE INDEX idx_memories_accessed ON memories(last_accessed DESC);
CREATE INDEX idx_memories_salience ON memories(salience DESC);
CREATE INDEX idx_memories_strength ON memories(strength DESC);
CREATE INDEX idx_embeddings_vector ON memory_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_links_source ON memory_links(source_id);
CREATE INDEX idx_links_target ON memory_links(target_id);
CREATE INDEX idx_links_weight ON memory_links(weight DESC);
CREATE INDEX idx_metadata_keywords ON memory_metadata USING GIN(keywords);
CREATE INDEX idx_metadata_tags ON memory_metadata USING GIN(tags);
CREATE INDEX idx_metadata_category ON memory_metadata(category);
```

## Error Handling

### Error Hierarchy

```typescript
class CognitiveError extends Error {
  code: string;
  context: ErrorContext;
  recoverable: boolean;
}

class DatabaseError extends CognitiveError {
  query?: string;
  params?: any[];
}

class EmbeddingError extends CognitiveError {
  model: string;
  inputLength: number;
}

class ReasoningError extends CognitiveError {
  framework?: string;
  step?: string;
}

class ValidationError extends CognitiveError {
  field: string;
  value: any;
  constraint: string;
}
```

### Error Recovery Strategies

```typescript
interface ErrorRecoveryStrategy {
  // Database errors
  handleConnectionFailure(): Promise<void>; // Retry with exponential backoff
  handleTransactionFailure(): Promise<void>; // Rollback and retry
  handleQueryTimeout(): Promise<void>; // Cancel and retry with simpler query

  // Embedding errors
  handleEmbeddingTimeout(): Promise<void>; // Use cached or fallback model
  handleModelUnavailable(): Promise<void>; // Switch to alternative model

  // Reasoning errors
  handleFrameworkFailure(): Promise<void>; // Fall back to simpler framework
  handleStreamTimeout(): Promise<void>; // Continue with completed streams

  // Graceful degradation
  degradeToBasicMode(): void; // Disable advanced features
  notifyUser(error: CognitiveError): void; // Provide helpful error message
}
```

## Testing Strategy

### Test-Driven Development Approach

**For every feature:**

1. Write failing tests first that define expected behavior
2. Implement minimal code to make tests pass
3. Refactor while keeping tests green
4. Validate coverage and performance

### Test Categories

```typescript
interface TestStrategy {
  // Unit tests (95%+ coverage target)
  unitTests: {
    databaseOperations: DatabaseTest[];
    embeddingGeneration: EmbeddingTest[];
    graphOperations: GraphTest[];
    reasoningLogic: ReasoningTest[];
    biasDetection: BiasTest[];
    emotionDetection: EmotionTest[];
  };

  // Integration tests
  integrationTests: {
    endToEndMemoryLifecycle: IntegrationTest[];
    crossSessionPersistence: IntegrationTest[];
    parallelReasoningWorkflow: IntegrationTest[];
    mcpServerIntegration: IntegrationTest[];
  };

  // Performance tests
  performanceTests: {
    retrievalLatency: PerformanceTest[]; // p50, p95, p99 targets
    embeddingGeneration: PerformanceTest[];
    parallelProcessing: PerformanceTest[];
    scalability: PerformanceTest[]; // 1k, 10k, 100k, 1M memories
  };

  // Accuracy tests
  accuracyTests: {
    confidenceCalibration: AccuracyTest[]; // ±10% target
    biasDetection: AccuracyTest[]; // >70% target
    emotionDetection: AccuracyTest[]; // >75% target
    frameworkSelection: AccuracyTest[]; // >80% target
  };
}
```

## Performance Optimization

### Critical Performance Targets

- **Memory Retrieval**: p50 <100ms, p95 <200ms, p99 <500ms
- **Embedding Generation**: <500ms for 5 sectors
- **Parallel Reasoning**: <30s total, <10s per stream
- **Confidence Assessment**: <100ms
- **Bias Detection**: <15% overhead
- **Emotion Detection**: <200ms

### Optimization Strategies

```typescript
interface PerformanceOptimization {
  // Database optimization
  connectionPooling: {
    poolSize: 20;
    maxWaitTime: 5000;
    idleTimeout: 30000;
  };

  // Query optimization
  indexStrategy: {
    vectorIndexes: "IVFFlat"; // Fast approximate search
    fullTextIndexes: "GIN"; // Fast text search
    arrayIndexes: "GIN"; // Fast array operations
  };

  // Caching strategy
  embeddingCache: {
    type: "LRU";
    maxSize: 10000;
    ttl: 3600; // 1 hour
  };

  // Batch processing
  batchSizes: {
    embeddingGeneration: 100;
    decayProcessing: 1000;
    linkCreation: 50;
  };

  // Parallel execution
  concurrency: {
    reasoningStreams: 4;
    databaseConnections: 20;
    embeddingRequests: 10;
  };
}
```

This design provides a comprehensive foundation for implementing the cognitive architecture rebuild with clear interfaces, data models, and performance targets. All components follow TDD principles and are designed for production-ready reliability and scalability.
