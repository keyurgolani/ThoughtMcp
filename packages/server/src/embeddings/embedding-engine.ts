/**
 * Embedding Engine
 *
 * Core embedding generation engine implementing five-sector HMD system.
 * Generates specialized embeddings for Episodic, Semantic, Procedural,
 * Emotional, and Reflective memory sectors with caching and batch support.
 *
 * Performance optimization: Uses batch embedding generation when the model
 * supports it, reducing 5 API calls to 1 for significant latency improvement.
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
  private inFlightRequests: Map<string, Promise<number[]>>;

  constructor(model: EmbeddingModel, cache: IEmbeddingCache) {
    this.model = model;
    this.cache = cache;
    this.inFlightRequests = new Map();
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

    // Check for in-flight request
    const inFlight = this.inFlightRequests.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    // Augment content with temporal markers
    const augmentedContent = this.augmentEpisodicContent(content, context);

    // Generate embedding with deduplication
    const promise = this.generateWithDeduplication(cacheKey, augmentedContent);
    return promise;
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

    // Check for in-flight request
    const inFlight = this.inFlightRequests.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    // Generate embedding with deduplication (no augmentation for semantic)
    const promise = this.generateWithDeduplication(cacheKey, content);
    return promise;
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

    // Check for in-flight request
    const inFlight = this.inFlightRequests.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    // Augment content with process markers
    const augmentedContent = this.augmentProceduralContent(content);

    // Generate embedding with deduplication
    const promise = this.generateWithDeduplication(cacheKey, augmentedContent);
    return promise;
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

    // Check for in-flight request
    const inFlight = this.inFlightRequests.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    // Augment content with emotion markers
    const augmentedContent = this.augmentEmotionalContent(content, emotion);

    // Generate embedding with deduplication
    const promise = this.generateWithDeduplication(cacheKey, augmentedContent);
    return promise;
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

    // Check for in-flight request
    const inFlight = this.inFlightRequests.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    // Augment content with meta-insight markers
    const augmentedContent = this.augmentReflectiveContent(content, insights);

    // Generate embedding with deduplication
    const promise = this.generateWithDeduplication(cacheKey, augmentedContent);
    return promise;
  }

  /**
   * Generate all five sector embeddings for a memory
   *
   * Performance optimization: Uses batch embedding generation when the model
   * supports it (e.g., Ollama's /api/embed endpoint), reducing 5 API calls
   * to 1 for ~3-5x latency improvement.
   */
  async generateAllSectorEmbeddings(memory: MemoryContent): Promise<SectorEmbeddings> {
    // Prepare augmented content for each sector
    const context = memory.context ?? {
      timestamp: new Date(),
      sessionId: "default",
    };
    const emotion = memory.emotion ?? {
      valence: 0,
      arousal: 0.5,
      dominance: 0,
    };
    const insights = memory.insights ?? [];

    const episodicContent = this.augmentEpisodicContent(memory.text, context);
    const semanticContent = memory.text; // No augmentation for semantic
    const proceduralContent = this.augmentProceduralContent(memory.text);
    const emotionalContent = this.augmentEmotionalContent(memory.text, emotion);
    const reflectiveContent = this.augmentReflectiveContent(memory.text, insights);

    // Generate cache keys for all sectors
    const cacheKeys = {
      episodic: generateCacheKey("episodic" as MemorySector, memory.text, context),
      semantic: generateCacheKey("semantic" as MemorySector, memory.text),
      procedural: generateCacheKey("procedural" as MemorySector, memory.text),
      emotional: generateCacheKey("emotional" as MemorySector, memory.text, emotion),
      reflective: generateCacheKey("reflective" as MemorySector, memory.text, insights),
    };

    // Check cache for all sectors
    const cachedEmbeddings: Partial<SectorEmbeddings> = {};
    const uncachedSectors: Array<{
      sector: keyof SectorEmbeddings;
      content: string;
      cacheKey: string;
    }> = [];

    const sectorContents: Array<{ sector: keyof SectorEmbeddings; content: string }> = [
      { sector: "episodic", content: episodicContent },
      { sector: "semantic", content: semanticContent },
      { sector: "procedural", content: proceduralContent },
      { sector: "emotional", content: emotionalContent },
      { sector: "reflective", content: reflectiveContent },
    ];

    for (const { sector, content } of sectorContents) {
      const cacheKey = cacheKeys[sector];

      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached) {
        cachedEmbeddings[sector] = cached;
        continue;
      }

      // Check for in-flight request
      const inFlight = this.inFlightRequests.get(cacheKey);
      if (inFlight) {
        cachedEmbeddings[sector] = await inFlight;
        continue;
      }

      uncachedSectors.push({ sector, content, cacheKey });
    }

    // If all sectors are cached, return immediately
    if (uncachedSectors.length === 0) {
      return cachedEmbeddings as SectorEmbeddings;
    }

    // Generate uncached embeddings
    let generatedEmbeddings: number[][];

    // Use batch generation if model supports it (significant performance improvement)
    if (this.model.generateBatch && uncachedSectors.length > 1) {
      const contents = uncachedSectors.map((s) => s.content);
      generatedEmbeddings = await this.model.generateBatch(contents);
    } else {
      // Fallback to parallel individual generation
      generatedEmbeddings = await Promise.all(
        uncachedSectors.map((s) => this.model.generate(s.content))
      );
    }

    // Store generated embeddings in cache and build result
    for (let i = 0; i < uncachedSectors.length; i++) {
      const { sector, cacheKey } = uncachedSectors[i];
      const embedding = generatedEmbeddings[i];

      this.cache.set(cacheKey, embedding);
      cachedEmbeddings[sector] = embedding;
    }

    return cachedEmbeddings as SectorEmbeddings;
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
   * Generate embedding with request deduplication
   * Prevents duplicate in-flight requests for the same content
   */
  private async generateWithDeduplication(cacheKey: string, content: string): Promise<number[]> {
    // Create promise for this request
    const promise = (async () => {
      try {
        // Generate embedding
        const embedding = await this.model.generate(content);

        // Store in cache
        this.cache.set(cacheKey, embedding);

        return embedding;
      } finally {
        // Remove from in-flight requests when done
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    // Store in-flight request
    this.inFlightRequests.set(cacheKey, promise);

    return promise;
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
