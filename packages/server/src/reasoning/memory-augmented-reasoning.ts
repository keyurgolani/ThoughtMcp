/**
 * Memory-Augmented Reasoning Component
 *
 * Integrates memory retrieval with cognitive tools to provide contextually
 * relevant insights based on stored memories.
 *
 * Requirements: 13.1, 13.2, 13.5, 13.6
 */

import { truncateContent } from "../memory/content-validator";
import type { MemoryRepository } from "../memory/memory-repository";
import type { Memory, MemorySectorType, SearchQuery } from "../memory/types";
import { Logger } from "../utils/logger";

/**
 * Configuration for memory-augmented reasoning
 *
 * Requirements: 3.1, 3.2, 3.4
 */
export interface MemoryAugmentedReasoningConfig {
  /** Minimum salience score for retrieved memories (default: 0.5) */
  minSalience: number;
  /** Maximum number of memories to retrieve (default: 5) */
  maxMemories: number;
  /** Memory sectors to search (default: all sectors) */
  sectors?: MemorySectorType[];
  /** Minimum strength for retrieved memories (default: 0.3) */
  minStrength: number;
  /** Minimum relevance score for retrieved memories (default: 0.5) - Requirements: 3.1, 3.2 */
  minRelevance: number;
  /** Maximum content length for display truncation (default: 500) - Requirements: 3.4 */
  maxContentLength: number;
}

/**
 * Default configuration values
 *
 * Requirements: 3.1, 3.2, 3.4
 */
const DEFAULT_CONFIG: MemoryAugmentedReasoningConfig = {
  minSalience: 0.5,
  maxMemories: 5, // Changed from 10 to 5 per Requirements 3.4
  minStrength: 0.3,
  minRelevance: 0.5, // Requirements 3.1, 3.2
  maxContentLength: 500, // Requirements 3.4
};

/**
 * Retrieved memory context for reasoning
 */
export interface MemoryContext {
  /** Retrieved memories relevant to the problem */
  memories: RetrievedMemory[];
  /** Total number of memories found */
  totalFound: number;
  /** Time taken to retrieve memories in milliseconds */
  retrievalTime: number;
}

/**
 * Simplified memory representation for reasoning context
 *
 * Requirements: 3.3, 4.1
 */
export interface RetrievedMemory {
  /** Memory ID */
  id: string;
  /** Memory content (may be truncated for display, full content used for reasoning) */
  content: string;
  /** Primary sector of the memory */
  primarySector: MemorySectorType;
  /** Salience score */
  salience: number;
  /** Strength score */
  strength: number;
  /** Relevance score from search */
  relevanceScore: number;
  /** Keywords from metadata */
  keywords: string[];
  /** Whether the content was truncated for display - Requirements: 4.1 */
  isTruncated: boolean;
  /** Original content length if truncated - Requirements: 4.1 */
  originalLength?: number;
}

/**
 * Augmented problem context with memory information
 */
export interface AugmentedProblemContext {
  /** Original problem description */
  originalProblem: string;
  /** Augmented problem with memory context */
  augmentedProblem: string;
  /** Background information from memories */
  memoryBackground: string;
  /** Memories used for augmentation */
  memoriesUsed: RetrievedMemory[];
  /** Whether memories were found and used */
  hasMemoryContext: boolean;
}

/**
 * Memory-Augmented Reasoning Component
 *
 * Retrieves relevant memories and augments problem context for cognitive tools.
 */
export class MemoryAugmentedReasoning {
  private config: MemoryAugmentedReasoningConfig;

  constructor(
    private memoryRepository: MemoryRepository,
    config?: Partial<MemoryAugmentedReasoningConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Retrieve relevant memories for a problem
   *
   * Uses vector similarity search with the problem text as the query.
   * Filters by minSalience of 0.5 to ensure quality context.
   * Filters by minRelevance threshold and limits results.
   *
   * Requirements: 3.1, 3.2, 3.4, 3.5, 13.5, 13.6
   *
   * @param problemText - The problem description to find relevant memories for
   * @param userId - User ID for memory isolation
   * @returns Memory context with retrieved memories
   */
  async retrieveContext(problemText: string, userId: string): Promise<MemoryContext> {
    const startTime = Date.now();

    try {
      // Build search query with vector similarity
      const searchQuery: SearchQuery = {
        text: problemText,
        userId,
        minSalience: this.config.minSalience,
        minStrength: this.config.minStrength,
        sectors: this.config.sectors,
        limit: this.config.maxMemories,
      };

      // Execute search
      const searchResult = await this.memoryRepository.search(searchQuery);

      // Convert to retrieved memory format with relevance filtering
      // Requirements: 3.1, 3.2 - Filter by minRelevance threshold
      const memories: RetrievedMemory[] = searchResult.memories
        .map((memory: Memory) => {
          const score = searchResult.scores.get(memory.id);
          const relevanceScore = score?.total ?? 0;

          // Apply truncation for display (not for reasoning input)
          // Requirements: 3.3, 4.1
          const truncationResult = truncateContent(memory.content, this.config.maxContentLength);

          return {
            id: memory.id,
            content: truncationResult.content,
            primarySector: memory.primarySector,
            salience: memory.salience,
            strength: memory.strength,
            relevanceScore,
            keywords: memory.metadata.keywords ?? [],
            isTruncated: truncationResult.isTruncated,
            originalLength: truncationResult.isTruncated
              ? truncationResult.originalLength
              : undefined,
          };
        })
        // Filter by relevance threshold - Requirements: 3.1, 3.2
        .filter((memory: RetrievedMemory) => memory.relevanceScore >= this.config.minRelevance)
        // Sort by relevance descending - Requirements: 3.2
        .sort((a: RetrievedMemory, b: RetrievedMemory) => b.relevanceScore - a.relevanceScore)
        // Limit results - Requirements: 3.4
        .slice(0, this.config.maxMemories);

      const retrievalTime = Date.now() - startTime;

      Logger.debug(
        `Retrieved ${memories.length} memories for problem context in ${retrievalTime}ms (filtered from ${searchResult.memories.length})`
      );

      // Requirements: 3.5 - Return empty context when no memories meet threshold
      return {
        memories,
        totalFound: searchResult.totalCount,
        retrievalTime,
      };
    } catch (error) {
      Logger.error("Failed to retrieve memory context:", error);

      // Return empty context on error - reasoning should continue without memories
      return {
        memories: [],
        totalFound: 0,
        retrievalTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Augment problem context with relevant memories
   *
   * Retrieves relevant memories and injects them into the problem context
   * to provide additional background information for reasoning.
   *
   * Requirements: 13.1, 13.2
   *
   * @param problemText - The original problem description
   * @param userId - User ID for memory isolation
   * @returns Augmented problem context with memory information
   */
  async augmentProblemContext(
    problemText: string,
    userId: string
  ): Promise<AugmentedProblemContext> {
    // Retrieve relevant memories
    const memoryContext = await this.retrieveContext(problemText, userId);

    // If no memories found, return original problem without augmentation
    if (memoryContext.memories.length === 0) {
      return {
        originalProblem: problemText,
        augmentedProblem: problemText,
        memoryBackground: "",
        memoriesUsed: [],
        hasMemoryContext: false,
      };
    }

    // Build memory background from retrieved memories
    const memoryBackground = this.buildMemoryBackground(memoryContext.memories);

    // Create augmented problem with memory context
    const augmentedProblem = this.buildAugmentedProblem(problemText, memoryBackground);

    return {
      originalProblem: problemText,
      augmentedProblem,
      memoryBackground,
      memoriesUsed: memoryContext.memories,
      hasMemoryContext: true,
    };
  }

  /**
   * Build memory background text from retrieved memories
   *
   * Formats memories into a readable background section that can be
   * injected into the problem context.
   *
   * @param memories - Retrieved memories to format
   * @returns Formatted memory background text
   */
  private buildMemoryBackground(memories: RetrievedMemory[]): string {
    if (memories.length === 0) {
      return "";
    }

    // Sort by relevance score (highest first)
    const sortedMemories = [...memories].sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Build background sections
    const sections: string[] = [];

    for (const memory of sortedMemories) {
      const sectorLabel = this.getSectorLabel(memory.primarySector);
      const keywordsStr =
        memory.keywords.length > 0 ? ` [Keywords: ${memory.keywords.join(", ")}]` : "";

      sections.push(`- ${sectorLabel}: ${memory.content}${keywordsStr}`);
    }

    return `Relevant context from previous interactions:\n${sections.join("\n")}`;
  }

  /**
   * Build augmented problem text with memory context
   *
   * @param originalProblem - Original problem description
   * @param memoryBackground - Formatted memory background
   * @returns Augmented problem text
   */
  private buildAugmentedProblem(originalProblem: string, memoryBackground: string): string {
    if (!memoryBackground) {
      return originalProblem;
    }

    return `${memoryBackground}\n\nCurrent problem:\n${originalProblem}`;
  }

  /**
   * Get human-readable label for memory sector
   *
   * @param sector - Memory sector type
   * @returns Human-readable sector label
   */
  private getSectorLabel(sector: MemorySectorType): string {
    const labels: Record<MemorySectorType, string> = {
      episodic: "Past experience",
      semantic: "Known fact",
      procedural: "Learned procedure",
      emotional: "Emotional context",
      reflective: "Previous insight",
    };

    return labels[sector] ?? "Memory";
  }

  /**
   * Update configuration
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<MemoryAugmentedReasoningConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   *
   * @returns Current configuration
   */
  getConfig(): MemoryAugmentedReasoningConfig {
    return { ...this.config };
  }
}
