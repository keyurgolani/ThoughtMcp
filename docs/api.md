# ThoughtMCP API Reference

## Overview

This document provides comprehensive API documentation for all public interfaces in the ThoughtMCP cognitive architecture. The system is organized into modular components, each with well-defined interfaces and responsibilities.

> **For MCP Tool Documentation**: See [MCP Tools Reference](mcp-tools.md) for complete documentation of all MCP tools including schemas, examples, and error codes.

> **For Integration Guides**: See [Integration Guide](integration.md) for platform-specific integration instructions (Kiro IDE, Claude Desktop, Cursor, custom clients).

## Table of Contents

- [MCP Tools](#mcp-tools)
- [Memory System](#memory-system)
- [Embedding System](#embedding-system)
- [Graph System](#graph-system)
- [Temporal Decay](#temporal-decay)
- [Search System](#search-system)
- [Reasoning System](#reasoning-system)
- [Framework Selection](#framework-selection)
- [Confidence System](#confidence-system)
- [Bias Detection](#bias-detection)
- [Emotion Detection](#emotion-detection)
- [Metacognitive System](#metacognitive-system)
- [Database Layer](#database-layer)
- [Utilities](#utilities)

---

## MCP Tools

ThoughtMCP exposes cognitive capabilities through MCP (Model Context Protocol) tools. These tools enable LLM clients to interact with the system.

### Available Tools

| Category          | Tool                     | Description                              |
| ----------------- | ------------------------ | ---------------------------------------- |
| **Memory**        | `remember`           | Store new memory with embeddings         |
| **Memory**        | `recall`      | Retrieve memories with composite scoring |
| **Memory**        | `update_memory`          | Update existing memory                   |
| **Memory**        | `forget`          | Delete memory (soft/hard)                |
| **Memory**        | `search`        | Full-text and vector search              |
| **Reasoning**     | `think`                  | Single or parallel reasoning             |
| **Reasoning**     | `analyze` | Framework-based analysis                 |
| **Reasoning**     | `ponder`         | Parallel stream reasoning                |
| **Reasoning**     | `breakdown`      | Problem decomposition                    |
| **Metacognitive** | `assess_confidence`      | Confidence assessment                    |
| **Metacognitive** | `detect_bias`            | Bias detection                           |
| **Metacognitive** | `detect_emotion`         | Emotion analysis                         |
| **Metacognitive** | `evaluate`      | Reasoning quality analysis               |

For complete tool documentation including schemas and examples, see **[MCP Tools Reference](mcp-tools.md)**.

---

## Memory System

### MemoryRepository

The central interface for all memory operations including creation, retrieval, updates, and deletion.

**Location**: `src/memory/memory-repository.ts`

#### Methods

##### `create(content: MemoryContent, metadata?: MemoryMetadata): Promise<Memory>`

Creates a new memory with automatic embedding generation and waypoint connections.

**Parameters:**

- `content` (MemoryContent): Memory content and user information
  - `content` (string): The actual memory content
  - `userId` (string): User identifier
  - `sessionId` (string, optional): Session identifier
  - `primarySector` (MemorySector): Primary memory sector
- `metadata` (MemoryMetadata, optional): Additional metadata
  - `keywords` (string[]): Keywords for search
  - `tags` (string[]): Tags for categorization
  - `category` (string): Category classification
  - `importance` (number): Importance score (0-1)

**Returns**: Promise<Memory> - The created memory with generated ID and embeddings

**Throws**:

- `ValidationError`: If content is invalid
- `DatabaseError`: If database operation fails

**Example**:

```typescript
const memory = await memoryRepository.create(
  {
    content: "Met with Sarah to discuss Q4 roadmap",
    userId: "user-123",
    primarySector: "episodic",
  },
  {
    keywords: ["meeting", "roadmap", "Q4"],
    tags: ["work", "planning"],
    importance: 0.8,
  }
);
```

##### `retrieve(memoryId: string): Promise<Memory | null>`

Retrieves a specific memory by ID and automatically applies reinforcement.

**Parameters:**

- `memoryId` (string): Unique memory identifier

**Returns**: Promise<Memory | null> - The memory if found, null otherwise

**Example**:

```typescript
const memory = await memoryRepository.retrieve("mem-abc123");
if (memory) {
  console.log(memory.content);
}
```

##### `search(query: SearchQuery): Promise<SearchResult>`

Performs comprehensive search across memories using multiple strategies.

**Parameters:**

- `query` (SearchQuery): Search parameters
  - `text` (string, optional): Full-text search query
  - `embedding` (number[], optional): Vector for similarity search
  - `sectors` (MemorySector[], optional): Sectors to search
  - `metadata` (MetadataFilters, optional): Metadata filters
  - `minStrength` (number, optional): Minimum strength threshold
  - `limit` (number, optional): Maximum results (default: 10)

**Returns**: Promise<SearchResult> - Search results with scores

**Example**:

```typescript
const results = await memoryRepository.search({
  text: "project planning",
  sectors: ["semantic", "episodic"],
  metadata: { tags: ["work"] },
  limit: 5,
});
```

##### `update(memoryId: string, updates: Partial<Memory>): Promise<Memory>`

Updates an existing memory. Regenerates embeddings if content changes.

**Parameters:**

- `memoryId` (string): Memory identifier
- `updates` (Partial<Memory>): Fields to update

**Returns**: Promise<Memory> - Updated memory

**Example**:

```typescript
const updated = awaitpository.update("mem-abc123", {
  content: "Updated content",
  importance: 0.9,
});
```

##### `delete(memoryId: string, soft?: boolean): Promise<void>`

Deletes a memory. Supports soft delete (strength = 0) or hard delete (remove from database).

**Parameters:**

- `memoryId` (string): Memory identifier
- `soft` (boolean, optional): If true, performs soft delete (default: false)

**Example**:

```typescript
// Soft delete (can be recovered)
await memoryRepository.delete("mem-abc123", true);

// Hard delete (permanent)
await memoryRepository.delete("mem-abc123", false);
```

---

## Embedding System

### EmbeddingEngine

Generates sector-specific embeddings for the HMD memory system.

**Location**: `src/embeddings/embedding-engine.ts`

#### Methods

##### `generateAllSectorEmbeddings(content: MemoryContent): Promise<SectorEmbeddings>`

Generates embeddings for all five memory sectors.

**Parameters:**

- `content` (MemoryContent): Memory content to embed

**Returns**: Promise<SectorEmbeddings> - Embeddings for all sectors

- `episodic` (number[]): Temporal/contextual embedding
- `semantic` (number[]): Factual/conceptual embedding
- `procedural` (number[]): Process/action embedding
- `emotional` (number[]): Affective embedding
- `reflective` (number[]): Meta-cognitive embedding

**Example**:

```typescript
const embeddings = await embeddingEngine.generateAllSectorEmbeddings({
  content: "Learned how to optimize database queries",
  userId: "user-123",
  primarySector: "procedural",
});
```

##### `generate(text: string, sector: MemorySector): Promise<number[]>`

Generates embedding for a specific sector.

**Parameters:**

- `text` (string): Text to embed
- `sector` (MemorySector): Target sector

**Returns**: Promise<number[]> - Embedding vector

**Example**:

```typescript
const embedding = await embeddingEngine.generate("Database optimization techniques", "semantic");
```

### EmbeddingStorage

Manages storage and retrieval of embeddings in PostgreSQL.

**Location**: `src/embeddings/embedding-storage.ts`

#### Methods

##### `storeEmbeddings(memoryId: string, embeddings: SectorEmbeddings): Promise<void>`

Stores embeddings for all sectors.

**Parameters:**

- `memoryId` (string): Memory identifier
- `embeddings` (SectorEmbeddings): Embeddings to store

**Example**:

```typescript
await embeddingStorage.storeEmbeddings("mem-abc123", embeddings);
```

##### `vectorSimilaritySearch(queryEmbedding: number[], sector: MemorySector, limit: number): Promise<SimilarityResult[]>`

Performs vector similarity search using pgvector.

**Parameters:**

- `queryEmbedding` (number[]): Query vector
- `sector` (MemorySector): Sector to search
- `limit` (number): Maximum results

**Returns**: Promise<SimilarityResult[]> - Similar memories with scores

**Example**:

```typescript
const similar = await embeddingStorage.vectorSimilaritySearch(queryEmbedding, "semantic", 10);
```

---

## Graph System

### WaypointGraphBuilder

Creates and maintains sparse waypoint graph connections between memories.

**Location**: `src/graph/waypoint-builder.ts`

#### Methods

##### `createWaypointLinks(newMemory: Memory, existingMemories: Memory[]): Promise<Link[]>`

Creates 1-3 waypoint connections to most similar memories.

**Parameters:**

- `newMemory` (Memory): New memory to connect
- `existingMemories` (Memory[]): Candidate memories for connections

**Returns**: Promise<Link[]> - Created links

**Example**:

```typescript
const links = await waypointBuilder.createWaypointLinks(newMemory, candidateMemories);
```

### GraphTraversal

Traverses the waypoint graph to find connected memories.

**Location**: `src/graph/graph-traversal.ts`

#### Methods

##### `expandViaWaypoint(startMemoryId: string, hops: number): Promise<Memory[]>`

Expands from a memory through waypoint connections.

**Parameters:**

- `startMemoryId` (string): Starting memory
- `hops` (number): Number of hops to traverse

**Returns**: Promise<Memory[]> - Connected memories

**Example**:

```typescript
const connected = await graphTraversal.expandViaWaypoint("mem-abc123", 2);
```

---

## Temporal Decay

### TemporalDecayEngine

Applies exponential decay to memory strength over time.

**Location**: `src/temporal/decay-engine.ts`

#### Methods

##### `applyDecay(memory: Memory): Promise<void>`

Applies decay formula: strength = initial × exp(-λ × time)

**Parameters:**

- `memory` (Memory): Memory to decay

**Example**:

```typescript
await decayEngine.applyDecay(memory);
```

##### `calculateDecayedStrength(memory: Memory, currentTime: Date): number`

Calculates what the strength should be at a given time.

**Parameters:**

- `memory` (Memory): Memory to calculate for
- `currentTime` (Date): Time to calculate strength at

**Returns**: number - Calculated strength (0-1)

**Example**:

```typescript
const strength = decayEngine.calculateDecayedStrength(memory, new Date());
```

### BackgroundScheduler

Schedules and executes background decay maintenance.

**Location**: `src/temporal/background-scheduler.ts`

#### Methods

##### `start(cronExpression: string): void`

Starts the background scheduler with a cron expression.

**Parameters:**

- `cronExpression` (string): Cron schedule (default: "0 2 \* \* \*" - daily at 2 AM)

**Example**:

```typescript
backgroundScheduler.start("0 2 * * *"); // Daily at 2 AM
```

##### `stop(): Promise<void>`

Stops the background scheduler gracefully.

**Example**:

```typescript
await backgroundScheduler.stop();
```

---

## Search System

### MemorySearchEngine

Orchestrates multi-strategy memory search.

**Location**: `src/search/memory-search-engine.ts`

#### Methods

##### `search(query: SearchQuery): Promise<SearchResult>`

Performs comprehensive search using vector similarity, full-text, metadata, and graph traversal.

**Parameters:**

- `query` (SearchQuery): Search parameters

**Returns**: Promise<SearchResult> - Ranked results with composite scores

**Example**:

```typescript
const results = await searchEngine.search({
  text: "machine learning",
  sectors: ["semantic"],
  limit: 10,
});
```

### FullTextSearchEngine

PostgreSQL full-text search using ts_vector.

**Location**: `src/search/full-text-search-engine.ts`

#### Methods

##### `search(query: string, filters?: MetadataFilters): Promise<Memory[]>`

Performs full-text search with optional metadata filtering.

**Parameters:**

- `query` (string): Search query (supports boolean operators)
- `filters` (MetadataFilters, optional): Additional filters

**Returns**: Promise<Memory[]> - Matching memories

**Example**:

```typescript
const results = await fullTextSearch.search("database AND optimization", { tags: ["technical"] });
```

---

## Reasoning System

### ParallelReasoningOrchestrator

Coordinates four parallel reasoning streams.

**Location**: `src/reasoning/orchestrator.ts`

#### Methods

##### `processParallel(problem: Problem, timeout?: number): Promise<ParallelReasoningResult>`

Executes all four reasoning streams in parallel with coordination.

**Parameters:**

- `problem` (Problem): Problem to reason about
- `timeout` (number, optional): Total timeout in ms (default: 30000)

**Returns**: Promise<ParallelReasoningResult> - Synthesized results from all streams

**Example**:

```typescript
const result = await reasoningOrchestrator.processParallel({
  description: "How to improve system performance?",
  context: { currentLoad: "high", budget: "limited" },
});
```

### SynthesisEngine

Synthesizes results from multiple reasoning streams.

**Location**: `src/reasoning/synthesis-engine.ts`

#### Methods

##### `synthesizeResults(results: StreamResult[]): SynthesizedResult`

Combines insights from all streams into coherent synthesis.

**Parameters:**

- `results` (StreamResult[]): Results from reasoning streams

**Returns**: SynthesizedResult - Integrated insights and recommendations

**Example**:

```typescript
const synthesis = synthesisEngine.synthesizeResults([
  analyticalResult,
  creativeResult,
  criticalResult,
  syntheticResult,
]);
```

---

## Framework Selection

### ProblemClassifier

Classifies problems across multiple dimensions.

**Location**: `src/framework/problem-classifier.ts`

#### Methods

##### `classify(problem: Problem): ProblemClassification`

Classifies problem complexity, uncertainty, stakes, and time pressure.

**Parameters:**

- `problem` (Problem): Problem to classify

**Returns**: ProblemClassification - Multi-dimensional classification

**Example**:

```typescript
const classification = problemClassifier.classify({
  description: "Design new feature with unclear requirements",
});
// Returns: { complexity: "complex", uncertainty: "high", stakes: "important", timePressure: "moderate" }
```

### FrameworkSelector

Selects optimal thinking framework for a problem.

**Location**: `src/framework/framework-selector.ts`

#### Methods

##### `selectFramework(problem: Problem, context: Context): FrameworkSelection`

Selects best framework based on problem characteristics.

**Parameters:**

- `problem` (Problem): Problem to solve
- `context` (Context): Additional context

**Returns**: FrameworkSelection - Selected framework with confidence

**Example**:

```typescript
const selection = frameworkSelector.selectFramework(problem, context);
// Returns: { framework: "design-thinking", confidence: 0.85, alternatives: [...] }
```

---

## Confidence System

### MultiDimensionalConfidenceAssessor

Assesses confidence across multiple dimensions.

**Location**: `src/confidence/multi-dimensional-assessor.ts`

#### Methods

##### `assessConfidence(context: ReasoningContext): ConfidenceAssessment`

Evaluates confidence based on evidence quality, reasoning coherence, completeness, and uncertainty.

**Parameters:**

- `context` (ReasoningContext): Reasoning context to assess

**Returns**: ConfidenceAssessment - Multi-dimensional confidence scores

**Example**:

```typescript
const assessment = confidenceAssessor.assessConfidence({
  problem,
  evidence,
  reasoning,
});
```

### CalibrationLearningEngine

Learns to calibrate confidence predictions with actual outcomes.

**Location**: `src/confidence/calibration-learning-engine.ts`

#### Methods

##### `trackPredictionOutcome(prediction: Prediction, outcome: Outcome): void`

Records prediction-outcome pair for learning.

**Parameters:**

- `prediction` (Prediction): Predicted confidence
- `outcome` (Outcome): Actual outcome

**Example**:

```typescript
calibrationEngine.trackPredictionOutcome(
  { confidence: 0.8, domain: "technical" },
  { success: true, actualConfidence: 0.85 }
);
```

---

## Bias Detection

### BiasPatternRecognizer

Detects cognitive biases in reasoning.

**Location**: `src/bias/bias-pattern-recognizer.ts`

#### Methods

##### `detectBiases(reasoning: ReasoningChain): DetectedBias[]`

Detects all bias types in reasoning chain.

**Parameters:**

- `reasoning` (ReasoningChain): Reasoning to analyze

**Returns**: DetectedBias[] - Detected biases with severity

**Example**:

```typescript
const biases = biasRecognizer.detectBiases(reasoningChain);
// Returns: [{ type: "confirmation", severity: 0.7, evidence: [...] }]
```

### BiasCorrectionEngine

Applies correction strategies to detected biases.

**Location**: `src/bias/bias-correction-engine.ts`

#### Methods

##### `correctBias(bias: DetectedBias, reasoning: ReasoningChain): CorrectedReasoning`

Applies appropriate correction strategy.

**Parameters:**

- `bias` (DetectedBias): Bias to correct
- `reasoning` (ReasoningChain): Original reasoning

**Returns**: CorrectedReasoning - Corrected reasoning with explanations

**Example**:

```typescript
const corrected = biasCorrectionEngine.correctBias(bias, reasoning);
```

---

## Emotion Detection

### CircumplexEmotionAnalyzer

Analyzes emotions using the Circumplex model.

**Location**: `src/emotion/circumplex-analyzer.ts`

#### Methods

##### `analyzeCircumplex(text: string): CircumplexState`

Detects valence, arousal, and dominance dimensions.

**Parameters:**

- `text` (string): Text to analyze

**Returns**: CircumplexState - Three-dimensional emotion state

**Example**:

```typescript
const emotion = circumplexAnalyzer.analyzeCircumplex("I'm excited about this new opportunity!");
// Returns: { valence: 0.8, arousal: 0.7, dominance: 0.6, confidence: 0.85 }
```

### DiscreteEmotionClassifier

Classifies discrete emotions (joy, sadness, anger, etc.).

**Location**: `src/emotion/discrete-emotion-classifier.ts`

#### Methods

##### `classifyEmotions(text: string): EmotionClassification[]`

Classifies all 11 discrete emotion types.

**Parameters:**

- `text` (string): Text to classify

**Returns**: EmotionClassification[] - Detected emotions with scores

**Example**:

```typescript
const emotions = emotionClassifier.classifyEmotions(text);
// Returns: [{ emotion: "joy", score: 0.8 }, { emotion: "gratitude", score: 0.6 }]
```

---

## Metacognitive System

### PerformanceMonitoringSystem

Tracks system performance metrics.

**Location**: `src/metacognitive/performance-monitoring-system.ts`

#### Methods

##### `trackReasoningQuality(result: ReasoningResult): void`

Records reasoning quality metrics.

**Parameters:**

- `result` (ReasoningResult): Reasoning result to track

**Example**:

```typescript
performanceMonitor.trackReasoningQuality(result);
```

##### `generatePerformanceReport(period: TimePeriod): PerformanceReport`

Generates performance report for a time period.

**Parameters:**

- `period` (TimePeriod): Time period to report on

**Returns**: PerformanceReport - Comprehensive performance metrics

**Example**:

```typescript
const report = performanceMonitor.generatePerformanceReport({
  start: new Date("2025-01-01"),
  end: new Date("2025-01-31"),
});
```

### SelfImprovementSystem

Implements continuous self-improvement mechanisms.

**Location**: `src/metacognitive/self-improvement-system.ts`

#### Methods

##### `integrateFeedback(feedback: UserFeedback): void`

Integrates user feedback into learning systems.

**Parameters:**

- `feedback` (UserFeedback): User feedback to integrate

**Example**:

```typescript
selfImprovementSystem.integrateFeedback({
  taskId: "task-123",
  rating: 4,
  comments: "Good analysis but missed edge case",
});
```

---

## Database Layer

### DatabaseConnectionManager

Manages PostgreSQL connections with pooling.

**Location**: `src/database/connection-manager.ts`

#### Methods

##### `connect(): Promise<void>`

Establishes database connection pool.

**Example**:

```typescript
await dbManager.connect();
```

##### `query<T>(sql: string, params?: any[]): Promise<QueryResult<T>>`

Executes parameterized query.

**Parameters:**

- `sql` (string): SQL query
- `params` (any[], optional): Query parameters

**Returns**: Promise<QueryResult<T>> - Query results

**Example**:

```typescript
const result = await dbManager.query("SELECT * FROM memories WHERE user_id = $1", ["user-123"]);
```

##### `transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>`

Executes operations in a transaction.

**Parameters:**

- `callback` (function): Transaction operations

**Returns**: Promise<T> - Transaction result

**Example**:

```typescript
await dbManager.transaction(async (client) => {
  await client.query("INSERT INTO memories ...");
  await client.query("INSERT INTO memory_embeddings ...");
});
```

---

## Utilities

### Logger

Structured logging utility.

**Location**: `src/utils/logger.ts`

#### Methods

##### `debug(message: string, meta?: object): void`

Logs debug message.

**Example**:

```typescript
logger.debug("Processing memory", { memoryId, userId });
```

##### `info(message: string, meta?: object): void`

Logs info message.

**Example**:

```typescript
logger.info("Memory created", { memoryId });
```

##### `warn(message: string, meta?: object): void`

Logs warning message.

**Example**:

```typescript
logger.warn("High memory usage", { usage: "85%" });
```

##### `error(message: string, meta?: object): void`

Logs error message.

**Example**:

```typescript
logger.error("Database error", { error, query });
```

---

## Error Handling

All methods may throw the following error types:

### ValidationError

Thrown when input validation fails.

**Properties:**

- `message` (string): Error description
- `field` (string): Field that failed validation
- `value` (any): Invalid value

### DatabaseError

Thrown when database operations fail.

**Properties:**

- `message` (string): Error description
- `query` (string, optional): Failed query
- `params` (any[], optional): Query parameters

### EmbeddingError

Thrown when embedding generation fails.

**Properties:**

- `message` (string): Error description
- `model` (string): Embedding model
- `inputLength` (number): Input text length

### ReasoningError

Thrown when reasoning operations fail.

**Properties:**

- `message` (string): Error description
- `framework` (string, optional): Framework being used
- `step` (string, optional): Failed step

---

## Type Definitions

### Core Types

```typescript
// Memory types
type MemorySector = "episodic" | "semantic" | "procedural" | "emotional" | "reflective";

interface Memory {
  id: string;
  content: string;
  userId: string;
  primarySector: MemorySector;
  strength: number; // 0-1
  salience: number; // 0-1
  importance: number; // 0-1
  createdAt: Date;
  lastAccessed: Date;
  embeddings?: SectorEmbeddings;
}

interface SectorEmbeddings {
  episodic: number[];
  semantic: number[];
  procedural: number[];
  emotional: number[];
  reflective: number[];
}

// Search types
interface SearchQuery {
  text?: string;
  embedding?: number[];
  sectors?: MemorySector[];
  metadata?: MetadataFilters;
  minStrength?: number;
  limit?: number;
}

interface SearchResult {
  memories: Memory[];
  scores: number[];
  totalCount: number;
}

// Reasoning types
interface Problem {
  description: string;
  context?: Record<string, any>;
  constraints?: string[];
}

interface ReasoningResult {
  conclusion: string;
  reasoning: ReasoningChain;
  confidence: ConfidenceAssessment;
  biases: DetectedBias[];
  recommendations: Recommendation[];
}
```

---

## Performance Characteristics

### Latency Targets

- **Memory Retrieval**: p50 <100ms, p95 <200ms, p99 <500ms
- **Embedding Generation**: <500ms for all five sectors
- **Parallel Reasoning**: <30s total, <10s per stream
- **Confidence Assessment**: <100ms
- **Bias Detection**: <15% overhead
- **Emotion Detection**: <200ms

### Scalability

- **Memory Capacity**: 100k memories per user (target)
- **Concurrent Operations**: 20 connections (default pool size)
- **Search Performance**: Sub-200ms at 100k memories
- **Cost**: <$10/month per 100k memories (local embeddings)

---

## See Also

- **[MCP Tools Reference](mcp-tools.md)** - Complete MCP tool documentation
- **[Integration Guide](integration.md)** - Platform integration guides
- **[Architecture Guide](architecture.md)** - System architecture and design
- **[Examples](examples.md)** - Usage examples for each feature
- **[Development Guide](development.md)** - Development workflow
- **[Testing Guide](testing.md)** - Testing strategies

---

**Last Updated**: December 2025
**Version**: 0.5.0
