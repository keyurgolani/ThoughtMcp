/**
 * Working Memory Module Implementation
 *
 * Implements Miller's 7±2 capacity limitation with phonological and visuospatial buffers,
 * information chunking, rehearsal mechanisms, and decay processes.
 */

import { ComponentStatus, IWorkingMemory } from "../interfaces/cognitive.js";
import { MemoryChunk } from "../types/core.js";

// Buffer types for different information modalities
export enum BufferType {
  PHONOLOGICAL = "phonological",
  VISUOSPATIAL = "visuospatial",
  EPISODIC = "episodic",
}

// Working memory buffer interface
export interface WorkingMemoryBuffer {
  type: BufferType;
  capacity: number;
  chunks: MemoryChunk[];
  decay_rate: number;
  rehearsal_threshold: number;
}

// Chunking strategy interface
export interface ChunkingStrategy {
  name: string;
  chunk(items: unknown[]): MemoryChunk[];
  canChunk(items: unknown[]): boolean;
}

// Working memory state
export interface WorkingMemoryState {
  active_chunks: MemoryChunk[];
  cognitive_load: number;
  rehearsal_queue: string[];
  buffer_states: Map<BufferType, WorkingMemoryBuffer>;
  last_decay: number;
}

export class WorkingMemoryModule implements IWorkingMemory {
  private capacity: number = 7; // Miller's magic number
  private decay_rate: number = 0.1; // Per second
  private rehearsal_threshold: number = 0.5;
  // Note: chunk_similarity_threshold available for future similarity-based chunking

  // Buffers for different types of information (initialized in constructor)
  private phonological_buffer!: WorkingMemoryBuffer;
  private visuospatial_buffer!: WorkingMemoryBuffer;
  private episodic_buffer!: WorkingMemoryBuffer;

  // Chunking strategies (initialized in constructor)
  private chunking_strategies!: ChunkingStrategy[];

  // Component state
  private initialized: boolean = false;
  private active: boolean = false;
  private last_activity: number = 0;
  private error?: string;

  // Rehearsal mechanism
  private rehearsal_interval: NodeJS.Timeout | null = null;
  private rehearsal_frequency: number = 2000; // ms

  constructor() {
    this.initializeBuffers();
    this.initializeChunkingStrategies();
  }

  async initialize(config: Record<string, unknown>): Promise<void> {
    try {
      // Validate configuration
      if (!config) {
        throw new Error("Configuration is required");
      }

      if (
        config.working_memory_capacity &&
        (config.working_memory_capacity as number) < 1
      ) {
        throw new Error("Working memory capacity must be at least 1");
      }

      // Configure capacity and parameters from config
      this.capacity = (config.working_memory_capacity as number) ?? 7;
      this.decay_rate = (config.noise_level as number) ?? 0.1;
      this.rehearsal_threshold = (config.confidence_threshold as number) ?? 0.5;

      // Initialize buffers with configuration
      this.initializeBuffers();

      // Start rehearsal mechanism
      this.startRehearsalProcess();

      this.initialized = true;
      this.active = true;
      this.last_activity = Date.now();
    } catch (error) {
      this.error = `Failed to initialize WorkingMemoryModule: ${error}`;
      throw error;
    }
  }

  private initializeBuffers(): void {
    // Phonological buffer for verbal/auditory information
    this.phonological_buffer = {
      type: BufferType.PHONOLOGICAL,
      capacity: Math.ceil(this.capacity * 0.4), // ~40% of total capacity
      chunks: [],
      decay_rate: this.decay_rate * 1.2, // Faster decay for phonological
      rehearsal_threshold: this.rehearsal_threshold,
    };

    // Visuospatial buffer for visual/spatial information
    this.visuospatial_buffer = {
      type: BufferType.VISUOSPATIAL,
      capacity: Math.ceil(this.capacity * 0.4), // ~40% of total capacity
      chunks: [],
      decay_rate: this.decay_rate * 0.8, // Slower decay for visuospatial
      rehearsal_threshold: this.rehearsal_threshold,
    };

    // Episodic buffer for integrated information
    this.episodic_buffer = {
      type: BufferType.EPISODIC,
      capacity: Math.ceil(this.capacity * 0.2), // ~20% of total capacity
      chunks: [],
      decay_rate: this.decay_rate,
      rehearsal_threshold: this.rehearsal_threshold * 0.8, // Lower threshold
    };
  }

  private initializeChunkingStrategies(): void {
    this.chunking_strategies = [
      new SemanticChunkingStrategy(),
      new SequentialChunkingStrategy(),
      new CategoryChunkingStrategy(),
      new SpatialChunkingStrategy(),
    ];
  }

  async process(input: unknown): Promise<WorkingMemoryState> {
    this.last_activity = Date.now();

    // Apply decay before processing
    this.decay();

    // Process input and create memory chunks
    const chunks = this.createMemoryChunks(input);

    // Add chunks to appropriate buffers
    for (const chunk of chunks) {
      this.addChunk(chunk);
    }

    // Perform rehearsal
    this.rehearse();

    return this.getCurrentState();
  }

  addChunk(chunk: MemoryChunk): boolean {
    // Validate chunk
    if (!chunk?.content) {
      return false;
    }

    // Determine appropriate buffer based on content type
    const buffer = this.selectBuffer(chunk);

    // Check if buffer has capacity
    if (buffer.chunks.length >= buffer.capacity) {
      // Try to make space by removing least active chunks
      if (!this.makeSpace(buffer)) {
        return false; // Could not add chunk
      }
    }

    // Try to chunk with existing information
    const chunked = this.attemptChunking(chunk, buffer);
    if (chunked) {
      return true;
    }

    // Add as new chunk
    buffer.chunks.push({
      ...chunk,
      timestamp: Date.now(),
      activation: Math.max(0.1, chunk.activation ?? 1.0), // Ensure minimum activation
    });

    return true;
  }

  getActiveChunks(): MemoryChunk[] {
    const allChunks: MemoryChunk[] = [];

    // Collect chunks from all buffers
    allChunks.push(...this.phonological_buffer.chunks);
    allChunks.push(...this.visuospatial_buffer.chunks);
    allChunks.push(...this.episodic_buffer.chunks);

    // Filter by activation threshold and sort by activation
    return allChunks
      .filter((chunk) => chunk.activation > 0.1)
      .sort((a, b) => b.activation - a.activation);
  }

  rehearse(): void {
    // Rehearse chunks that are above threshold but below full activation
    const rehearsalCandidates = this.getActiveChunks().filter(
      (chunk) =>
        chunk.activation >= this.rehearsal_threshold && chunk.activation < 0.9
    );

    // Boost activation for rehearsed chunks
    for (const chunk of rehearsalCandidates) {
      chunk.activation = Math.min(1.0, chunk.activation + 0.1);
      chunk.timestamp = Date.now(); // Reset decay timer
    }
  }

  decay(): void {
    const now = Date.now();

    // Apply decay to all buffers
    this.applyDecayToBuffer(this.phonological_buffer, now);
    this.applyDecayToBuffer(this.visuospatial_buffer, now);
    this.applyDecayToBuffer(this.episodic_buffer, now);

    this.last_activity = now;
  }

  private applyDecayToBuffer(
    buffer: WorkingMemoryBuffer,
    currentTime: number
  ): void {
    buffer.chunks = buffer.chunks
      .map((chunk) => {
        const timeDelta = (currentTime - chunk.timestamp) / 1000; // Convert to seconds
        const decayAmount = buffer.decay_rate * timeDelta;
        return {
          ...chunk,
          activation: Math.max(0, chunk.activation - decayAmount),
        };
      })
      .filter((chunk) => chunk.activation > 0.05); // Remove very weak chunks
  }

  getCapacity(): number {
    return this.capacity;
  }

  getCurrentLoad(): number {
    const totalChunks =
      this.phonological_buffer.chunks.length +
      this.visuospatial_buffer.chunks.length +
      this.episodic_buffer.chunks.length;

    return totalChunks / this.capacity;
  }

  reset(): void {
    this.phonological_buffer.chunks = [];
    this.visuospatial_buffer.chunks = [];
    this.episodic_buffer.chunks = [];

    if (this.rehearsal_interval) {
      clearInterval(this.rehearsal_interval);
      this.rehearsal_interval = null;
    }

    this.active = false;
  }

  getStatus(): ComponentStatus {
    return {
      name: "WorkingMemoryModule",
      initialized: this.initialized,
      active: this.active,
      last_activity: this.last_activity,
      error: this.error ?? "",
    };
  }

  private createMemoryChunks(input: unknown): MemoryChunk[] {
    // Convert input to memory chunks based on content type
    if (typeof input === "string") {
      return this.createTextChunks(input);
    } else if (Array.isArray(input)) {
      return this.createArrayChunks(input);
    } else if (typeof input === "object") {
      return this.createObjectChunks(input as Record<string, unknown>);
    }

    // Default single chunk
    return [
      {
        content: input,
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set<string>(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: [],
      },
    ];
  }

  private createTextChunks(text: string): MemoryChunk[] {
    // Split text into semantic chunks
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    return sentences.map((sentence) => ({
      content: sentence.trim(),
      activation: 1.0,
      timestamp: Date.now(),
      associations: new Set<string>(),
      emotional_valence: 0,
      importance: 0.5,
      context_tags: ["text", "phonological"],
    }));
  }

  private createArrayChunks(array: unknown[]): MemoryChunk[] {
    // Group array items into chunks of manageable size
    const chunkSize = 3; // Optimal chunk size for arrays
    const chunks: MemoryChunk[] = [];

    // Only chunk if array is large enough to benefit from chunking
    if (array.length > chunkSize) {
      for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.slice(i, i + chunkSize);
        chunks.push({
          content: chunk,
          activation: 1.0,
          timestamp: Date.now(),
          associations: new Set<string>(),
          emotional_valence: 0,
          importance: 0.5,
          context_tags: ["array", "sequential"],
        });
      }
    } else {
      // Small arrays stay as single chunks
      chunks.push({
        content: array,
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set<string>(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ["array", "sequential"],
      });
    }

    return chunks;
  }

  private createObjectChunks(obj: Record<string, unknown>): MemoryChunk[] {
    // Create a single chunk for the entire object to avoid overwhelming working memory
    return [
      {
        content: obj,
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set<string>(Object.keys(obj)),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ["object", "structured"],
      },
    ];
  }

  private selectBuffer(chunk: MemoryChunk): WorkingMemoryBuffer {
    // Select appropriate buffer based on content type and context tags
    const contextTags = chunk.context_tags ?? [];

    if (
      contextTags.includes("phonological") ??
      (contextTags.includes("text") || typeof chunk.content === "string")
    ) {
      return this.phonological_buffer;
    }

    if (
      contextTags.includes("visuospatial") ??
      contextTags.includes("spatial") ??
      contextTags.includes("visual")
    ) {
      return this.visuospatial_buffer;
    }

    // Default to episodic buffer for complex or integrated information
    return this.episodic_buffer;
  }

  private makeSpace(buffer: WorkingMemoryBuffer): boolean {
    // Remove the chunk with lowest activation
    if (buffer.chunks.length === 0) return true;

    const lowestActivation = Math.min(
      ...buffer.chunks.map((c) => c.activation)
    );
    const indexToRemove = buffer.chunks.findIndex(
      (c) => c.activation === lowestActivation
    );

    if (indexToRemove !== -1) {
      buffer.chunks.splice(indexToRemove, 1);
      return true;
    }

    return false;
  }

  private attemptChunking(
    newChunk: MemoryChunk,
    buffer: WorkingMemoryBuffer
  ): boolean {
    // Try each chunking strategy
    for (const strategy of this.chunking_strategies) {
      for (const existingChunk of buffer.chunks) {
        if (strategy.canChunk([existingChunk.content, newChunk.content])) {
          const chunkedResult = strategy.chunk([
            existingChunk.content,
            newChunk.content,
          ]);

          if (chunkedResult.length === 1) {
            // Successfully chunked - replace existing chunk
            const index = buffer.chunks.indexOf(existingChunk);
            buffer.chunks[index] = {
              ...chunkedResult[0],
              activation: Math.max(
                existingChunk.activation,
                newChunk.activation
              ),
              timestamp: Date.now(),
              associations: new Set([
                ...existingChunk.associations,
                ...newChunk.associations,
              ]),
            };
            return true;
          }
        }
      }
    }

    return false;
  }

  private startRehearsalProcess(): void {
    this.rehearsal_interval = setInterval(() => {
      if (this.active) {
        this.rehearse();
        this.decay();
      }
    }, this.rehearsal_frequency);
  }

  private getRehearsalQueue(): string[] {
    return this.getActiveChunks()
      .filter((chunk) => chunk.activation >= this.rehearsal_threshold)
      .map((chunk) => JSON.stringify(chunk.content));
  }

  getCurrentState(): WorkingMemoryState {
    const bufferStates = new Map<BufferType, WorkingMemoryBuffer>();
    bufferStates.set(BufferType.PHONOLOGICAL, this.phonological_buffer);
    bufferStates.set(BufferType.VISUOSPATIAL, this.visuospatial_buffer);
    bufferStates.set(BufferType.EPISODIC, this.episodic_buffer);

    return {
      active_chunks: this.getActiveChunks(),
      cognitive_load: this.getCurrentLoad(),
      rehearsal_queue: this.getRehearsalQueue(),
      buffer_states: bufferStates,
      last_decay: this.last_activity,
    };
  }
}

// Chunking strategy implementations
class SemanticChunkingStrategy implements ChunkingStrategy {
  name = "semantic";

  canChunk(items: unknown[]): boolean {
    // Check if items are semantically related (simplified)
    if (items.length !== 2) return false;

    const [item1, item2] = items;
    if (typeof item1 === "string" && typeof item2 === "string") {
      // Simple semantic similarity check
      const words1 = item1.toLowerCase().split(/\s+/);
      const words2 = item2.toLowerCase().split(/\s+/);
      const commonWords = words1.filter((w) => words2.includes(w));
      return commonWords.length > 0;
    }

    return false;
  }

  chunk(items: unknown[]): MemoryChunk[] {
    return [
      {
        content: Array.isArray(items) ? items.join(" ") : String(items),
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set<string>(),
        emotional_valence: 0,
        importance: 0.6, // Slightly higher importance for chunked items
        context_tags: ["semantic", "chunked"],
      },
    ];
  }
}

class SequentialChunkingStrategy implements ChunkingStrategy {
  name = "sequential";

  canChunk(items: unknown[]): boolean {
    // Check if items can be sequentially chunked
    return Array.isArray(items) && items.length <= 4; // Max chunk size
  }

  chunk(items: unknown[]): MemoryChunk[] {
    return [
      {
        content: items,
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set<string>(),
        emotional_valence: 0,
        importance: 0.6,
        context_tags: ["sequential", "chunked"],
      },
    ];
  }
}

class CategoryChunkingStrategy implements ChunkingStrategy {
  name = "category";

  canChunk(items: unknown[]): boolean {
    // Check if items belong to the same category (simplified)
    if (items.length !== 2) return false;

    const [item1, item2] = items;
    if (typeof item1 === "object" && typeof item2 === "object") {
      // Check if objects have similar structure
      const keys1 = Object.keys(item1 as object);
      const keys2 = Object.keys(item2 as object);
      const commonKeys = keys1.filter((k) => keys2.includes(k));
      return commonKeys.length > keys1.length * 0.5;
    }

    return false;
  }

  chunk(items: unknown[]): MemoryChunk[] {
    return [
      {
        content: items,
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set<string>(),
        emotional_valence: 0,
        importance: 0.6,
        context_tags: ["category", "chunked"],
      },
    ];
  }
}

class SpatialChunkingStrategy implements ChunkingStrategy {
  name = "spatial";

  canChunk(items: unknown[]): boolean {
    // Check if items have spatial relationships
    return items.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        ("x" in item || "y" in item || "position" in item)
    );
  }

  chunk(items: unknown[]): MemoryChunk[] {
    return [
      {
        content: items,
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set<string>(),
        emotional_valence: 0,
        importance: 0.6,
        context_tags: ["spatial", "chunked", "visuospatial"],
      },
    ];
  }
}
