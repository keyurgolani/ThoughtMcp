/**
 * Embedding Engine
 *
 * Core embedding generation engine implementing five-sector HMD system.
 * Generates specialized embeddings for Episodic, Semantic, Procedural,
 * Emotional, and Reflective memory sectors with caching and batch support.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { generateCacheKey } from "./cache";
import type {
  EmbeddingModel,
  EmotionState,
  EmbeddingCache as IEmbeddingCache,
  MemoryContent,
  MemorySector,
  SectorEmbeddings,
  TemporalContext,
} from "./types";

/**
 * Five-sector embedding generation engine
 */
export class EmbeddingEngine {
  private model: EmbeddingModel;
  private cache: IEmbeddingCache;

  constructor(model: EmbeddingModel, cache: IEmbeddingCache) {
    this.model = model;
    this.cache = cache;
  }

  /**
   * Generate episodic embedding with temporal context markers
   */
  async generateEpisodicEmbedding(content: string, context: TemporalContext): Promise<number[]> {
    const cacheKey = generateCacheKey("episodic" as MemorySector, content, context);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Augment content with temporal markers
    const augmentedContent = this.augmentEpisodicContent(content, context);

    // Generate embedding
    const embedding = await this.model.generate(augmentedContent);

    // Store in cache
    this.cache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Generate semantic embedding (pure factual content)
   */
  async generateSemanticEmbedding(content: string): Promise<number[]> {
    const cacheKey = generateCacheKey("semantic" as MemorySector, content);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate embedding (no augmentation for semantic)
    const embedding = await this.model.generate(content);

    // Store in cache
    this.cache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Generate procedural embedding with process markers
   */
  async generateProceduralEmbedding(content: string): Promise<number[]> {
    const cacheKey = generateCacheKey("procedural" as MemorySector, content);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Augment content with process markers
    const augmentedContent = this.augmentProceduralContent(content);

    // Generate embedding
    const embedding = await this.model.generate(augmentedContent);

    // Store in cache
    this.cache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Generate emotional embedding with emotion state markers
   */
  async generateEmotionalEmbedding(content: string, emotion: EmotionState): Promise<number[]> {
    const cacheKey = generateCacheKey("emotional" as MemorySector, content, emotion);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Augment content with emotion markers
    const augmentedContent = this.augmentEmotionalContent(content, emotion);

    // Generate embedding
    const embedding = await this.model.generate(augmentedContent);

    // Store in cache
    this.cache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Generate reflective embedding with meta-insight markers
   */
  async generateReflectiveEmbedding(content: string, insights: string[]): Promise<number[]> {
    const cacheKey = generateCacheKey("reflective" as MemorySector, content, insights);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Augment content with meta-insight markers
    const augmentedContent = this.augmentReflectiveContent(content, insights);

    // Generate embedding
    const embedding = await this.model.generate(augmentedContent);

    // Store in cache
    this.cache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Generate all five sector embeddings for a memory
   */
  async generateAllSectorEmbeddings(memory: MemoryContent): Promise<SectorEmbeddings> {
    // Generate all sectors in parallel
    const [episodic, semantic, procedural, emotional, reflective] = await Promise.all([
      this.generateEpisodicEmbedding(
        memory.text,
        memory.context ?? {
          timestamp: new Date(),
          sessionId: "default",
        }
      ),
      this.generateSemanticEmbedding(memory.text),
      this.generateProceduralEmbedding(memory.text),
      this.generateEmotionalEmbedding(
        memory.text,
        memory.emotion ?? {
          valence: 0,
          arousal: 0.5,
          dominance: 0,
        }
      ),
      this.generateReflectiveEmbedding(memory.text, memory.insights ?? []),
    ]);

    return {
      episodic,
      semantic,
      procedural,
      emotional,
      reflective,
    };
  }

  /**
   * Generate embeddings for multiple memories in batch
   */
  async batchGenerateEmbeddings(memories: MemoryContent[]): Promise<SectorEmbeddings[]> {
    // Process all memories in parallel
    return Promise.all(memories.map((memory) => this.generateAllSectorEmbeddings(memory)));
  }

  /**
   * Get current model dimension
   */
  getModelDimension(): number {
    return this.model.getDimension();
  }

  /**
   * Load a different model
   */
  loadModel(model: EmbeddingModel): void {
    this.model = model;
    // Clear cache when switching models
    this.cache.clear();
  }

  /**
   * Augment content with temporal markers for episodic embedding
   */
  private augmentEpisodicContent(content: string, context: TemporalContext): string {
    const markers: string[] = [];

    // Add timestamp marker
    markers.push(`[TIME: ${context.timestamp.toISOString()}]`);

    // Add session marker
    markers.push(`[SESSION: ${context.sessionId}]`);

    // Add sequence marker if available
    if (context.sequenceNumber !== undefined) {
      markers.push(`[SEQUENCE: ${context.sequenceNumber}]`);
    }

    // Add duration marker if available
    if (context.duration !== undefined) {
      markers.push(`[DURATION: ${context.duration}s]`);
    }

    // Add location marker if available
    if (context.location) {
      markers.push(`[LOCATION: ${context.location}]`);
    }

    // Add participants marker if available
    if (context.participants && context.participants.length > 0) {
      markers.push(`[PARTICIPANTS: ${context.participants.join(", ")}]`);
    }

    return `${markers.join(" ")} ${content}`;
  }

  /**
   * Augment content with process markers for procedural embedding
   */
  private augmentProceduralContent(content: string): string {
    // Add procedural markers to emphasize process/steps
    return `[PROCEDURE] [STEPS] [HOW-TO] ${content}`;
  }

  /**
   * Augment content with emotion markers for emotional embedding
   */
  private augmentEmotionalContent(content: string, emotion: EmotionState): string {
    const markers: string[] = [];

    // Add valence marker
    const valenceLabel =
      emotion.valence > 0 ? "POSITIVE" : emotion.valence < 0 ? "NEGATIVE" : "NEUTRAL";
    markers.push(`[VALENCE: ${valenceLabel}]`);

    // Add arousal marker
    const arousalLabel = emotion.arousal > 0.7 ? "HIGH" : emotion.arousal > 0.3 ? "MEDIUM" : "LOW";
    markers.push(`[AROUSAL: ${arousalLabel}]`);

    // Add dominance marker
    const dominanceLabel =
      emotion.dominance > 0 ? "DOMINANT" : emotion.dominance < 0 ? "SUBMISSIVE" : "NEUTRAL";
    markers.push(`[DOMINANCE: ${dominanceLabel}]`);

    // Add primary emotion if available
    if (emotion.primaryEmotion) {
      markers.push(`[EMOTION: ${emotion.primaryEmotion.toUpperCase()}]`);
    }

    return `${markers.join(" ")} ${content}`;
  }

  /**
   * Augment content with meta-insight markers for reflective embedding
   */
  private augmentReflectiveContent(content: string, insights: string[]): string {
    const markers: string[] = ["[REFLECTION]", "[META-COGNITION]"];

    // Add insights as markers if available
    if (insights.length > 0) {
      markers.push(`[INSIGHTS: ${insights.join("; ")}]`);
    }

    return `${markers.join(" ")} ${content}`;
  }
}
