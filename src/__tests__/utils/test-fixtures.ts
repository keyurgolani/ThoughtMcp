/**
 * Test Fixtures and Data Factories
 *
 * Provides factory functions for creating test data:
 * - Memory objects
 * - Embeddings
 * - Reasoning contexts
 * - User data
 * - Relationships
 */

/**
 * Memory Sector Types
 */
export type MemorySector = "episodic" | "semantic" | "procedural" | "emotional" | "reflective";

/**
 * Memory fixture interface
 */
export interface TestMemory {
  id: string;
  content: string;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  salience: number;
  decayRate: number;
  strength: number;
  userId: string;
  sessionId: string;
  primarySector: MemorySector;
  metadata: TestMemoryMetadata;
}

export interface TestMemoryMetadata {
  keywords: string[];
  tags: string[];
  category: string;
  context: string;
  importance: number;
  isAtomic: boolean;
  parentId?: string;
}

/**
 * Create a test memory with default or custom values
 *
 * @param overrides - Custom values to override defaults
 * @returns Test memory object
 */
export function createTestMemory(overrides: Partial<TestMemory> = {}): TestMemory {
  const id = overrides.id ?? generateId();
  const now = new Date();

  return {
    id,
    content: overrides.content ?? "Test memory content",
    createdAt: overrides.createdAt ?? now,
    lastAccessed: overrides.lastAccessed ?? now,
    accessCount: overrides.accessCount ?? 0,
    salience: overrides.salience ?? 0.5,
    decayRate: overrides.decayRate ?? 0.02,
    strength: overrides.strength ?? 1.0,
    userId: overrides.userId ?? "test-user",
    sessionId: overrides.sessionId ?? "test-session",
    primarySector: overrides.primarySector ?? "semantic",
    metadata: overrides.metadata ?? createTestMemoryMetadata(),
  };
}

/**
 * Create test memory metadata
 *
 * @param overrides - Custom values to override defaults
 * @returns Test memory metadata
 */
export function createTestMemoryMetadata(
  overrides: Partial<TestMemoryMetadata> = {}
): TestMemoryMetadata {
  return {
    keywords: overrides.keywords ?? ["test", "memory"],
    tags: overrides.tags ?? ["test"],
    category: overrides.category ?? "general",
    context: overrides.context ?? "test context",
    importance: overrides.importance ?? 0.5,
    isAtomic: overrides.isAtomic ?? true,
    parentId: overrides.parentId,
  };
}

/**
 * Create multiple test memories
 *
 * @param count - Number of memories to create
 * @param overrides - Custom values to override defaults
 * @returns Array of test memories
 */
export function createTestMemories(
  count: number,
  overrides: Partial<TestMemory> = {}
): TestMemory[] {
  return Array.from({ length: count }, (_, i) =>
    createTestMemory({
      ...overrides,
      content: `${overrides.content ?? "Test memory"} ${i + 1}`,
    })
  );
}

/**
 * Create test embeddings
 *
 * @param dimension - Embedding dimension
 * @returns Test embedding vector
 */
export function createTestEmbedding(dimension: number = 1536): number[] {
  return Array.from({ length: dimension }, () => Math.random());
}

/**
 * Create test sector embeddings
 *
 * @param dimension - Embedding dimension
 * @returns Test sector embeddings
 */
export function createTestSectorEmbeddings(
  dimension: number = 1536
): Record<MemorySector, number[]> {
  return {
    episodic: createTestEmbedding(dimension),
    semantic: createTestEmbedding(dimension),
    procedural: createTestEmbedding(dimension),
    emotional: createTestEmbedding(dimension),
    reflective: createTestEmbedding(dimension),
  };
}

/**
 * Create test emotion state
 */
export interface TestEmotionState {
  valence: number;
  arousal: number;
  dominance: number;
  discreteEmotions: Map<string, number>;
  primaryEmotion: string;
  confidence: number;
}

export function createTestEmotionState(
  overrides: Partial<TestEmotionState> = {}
): TestEmotionState {
  return {
    valence: overrides.valence ?? 0.5,
    arousal: overrides.arousal ?? 0.5,
    dominance: overrides.dominance ?? 0.0,
    discreteEmotions: overrides.discreteEmotions ?? new Map([["joy", 0.7]]),
    primaryEmotion: overrides.primaryEmotion ?? "joy",
    confidence: overrides.confidence ?? 0.8,
  };
}

/**
 * Create test reasoning context
 */
export interface TestReasoningContext {
  problem: string;
  evidence: string[];
  constraints: string[];
  goals: string[];
}

export function createTestReasoningContext(
  overrides: Partial<TestReasoningContext> = {}
): TestReasoningContext {
  return {
    problem: overrides.problem ?? "Test problem",
    evidence: overrides.evidence ?? ["evidence 1", "evidence 2"],
    constraints: overrides.constraints ?? ["constraint 1"],
    goals: overrides.goals ?? ["goal 1"],
  };
}

/**
 * Create test link between memories
 */
export interface TestLink {
  sourceId: string;
  targetId: string;
  linkType: "semantic" | "temporal" | "causal" | "analogical";
  weight: number;
  createdAt: Date;
  traversalCount: number;
}

export function createTestLink(overrides: Partial<TestLink> = {}): TestLink {
  return {
    sourceId: overrides.sourceId ?? generateId(),
    targetId: overrides.targetId ?? generateId(),
    linkType: overrides.linkType ?? "semantic",
    weight: overrides.weight ?? 0.7,
    createdAt: overrides.createdAt ?? new Date(),
    traversalCount: overrides.traversalCount ?? 0,
  };
}

/**
 * Create test search query
 */
export interface TestSearchQuery {
  text?: string;
  embedding?: number[];
  sectors?: MemorySector[];
  metadata?: {
    keywords?: string[];
    tags?: string[];
    category?: string;
  };
  minStrength?: number;
  limit?: number;
}

export function createTestSearchQuery(overrides: Partial<TestSearchQuery> = {}): TestSearchQuery {
  return {
    text: overrides.text,
    embedding: overrides.embedding,
    sectors: overrides.sectors ?? ["semantic"],
    metadata: overrides.metadata,
    minStrength: overrides.minStrength ?? 0.1,
    limit: overrides.limit ?? 10,
  };
}

// Helper functions

function generateId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Create realistic test data for specific scenarios
 */
export const testScenarios = {
  /**
   * Create memories for testing temporal decay
   */
  temporalDecay: () => {
    const now = new Date();
    return [
      createTestMemory({
        content: "Recent memory",
        createdAt: now,
        lastAccessed: now,
        strength: 1.0,
      }),
      createTestMemory({
        content: "Week old memory",
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        lastAccessed: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        strength: 0.8,
      }),
      createTestMemory({
        content: "Month old memory",
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        lastAccessed: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        strength: 0.3,
      }),
    ];
  },

  /**
   * Create memories for testing waypoint graph
   */
  waypointGraph: () => {
    const memories = createTestMemories(5);
    const links = [
      createTestLink({
        sourceId: memories[0].id,
        targetId: memories[1].id,
        weight: 0.9,
      }),
      createTestLink({
        sourceId: memories[0].id,
        targetId: memories[2].id,
        weight: 0.8,
      }),
      createTestLink({
        sourceId: memories[1].id,
        targetId: memories[3].id,
        weight: 0.7,
      }),
      createTestLink({
        sourceId: memories[2].id,
        targetId: memories[4].id,
        weight: 0.75,
      }),
    ];
    return { memories, links };
  },

  /**
   * Create memories for testing search
   */
  search: () => {
    return [
      createTestMemory({
        content: "Machine learning algorithms",
        metadata: createTestMemoryMetadata({
          keywords: ["machine", "learning", "algorithms"],
          tags: ["ai", "ml"],
          category: "technology",
        }),
      }),
      createTestMemory({
        content: "Deep learning neural networks",
        metadata: createTestMemoryMetadata({
          keywords: ["deep", "learning", "neural", "networks"],
          tags: ["ai", "deep-learning"],
          category: "technology",
        }),
      }),
      createTestMemory({
        content: "Natural language processing",
        metadata: createTestMemoryMetadata({
          keywords: ["natural", "language", "processing"],
          tags: ["ai", "nlp"],
          category: "technology",
        }),
      }),
    ];
  },
};
