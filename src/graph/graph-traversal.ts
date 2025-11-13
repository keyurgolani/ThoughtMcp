/**
 * Graph Traversal System
 *
 * Implements breadth-first and depth-first traversal algorithms for the waypoint graph.
 * Provides path finding, path explanation, and connection-weighted retrieval.
 *
 * Requirements: 2.3, 2.4, 2.5
 */

import type { DatabaseConnectionManager } from "../database/connection-manager";
import type { Link, Memory, Path, TraversalOptions, TraversalResult } from "./types";

/**
 * GraphTraversal class for navigating the waypoint graph
 */
export class GraphTraversal {
  private readonly db: DatabaseConnectionManager;

  constructor(db: DatabaseConnectionManager) {
    this.db = db;
  }

  /**
   * Get all memories connected to the starting memory
   *
   * @param memoryId - Starting memory ID
   * @param options - Traversal options (maxDepth, minWeight, traversalType, includePaths)
   * @returns TraversalResult with connected memories and metadata
   */
  async getConnectedMemories(
    memoryId: string,
    options?: TraversalOptions
  ): Promise<TraversalResult> {
    // Default options
    const opts: TraversalOptions = {
      maxDepth: options?.maxDepth ?? 3,
      minWeight: options?.minWeight,
      traversalType: options?.traversalType ?? "breadth-first",
      includePaths: options?.includePaths ?? false,
    };

    // Choose traversal algorithm
    if (opts.traversalType === "depth-first") {
      return this.depthFirstSearch(memoryId, opts);
    } else {
      return this.breadthFirstSearch(memoryId, opts);
    }
  }

  /**
   * Find shortest path between two memories
   *
   * @param sourceId - Source memory ID
   * @param targetId - Target memory ID
   * @param maxDepth - Maximum depth to search
   * @returns Path if found, null otherwise
   */
  async findPath(sourceId: string, targetId: string, maxDepth: number): Promise<Path | null> {
    // BFS to find shortest path
    const visited = new Set<string>();
    const queue: Array<{
      memoryId: string;
      depth: number;
      path: Memory[];
      links: Link[];
    }> = [];

    // Get start memory
    const startMemory = await this.getMemory(sourceId);
    if (!startMemory) {
      return null;
    }

    // Initialize queue
    queue.push({
      memoryId: sourceId,
      depth: 0,
      path: [startMemory],
      links: [],
    });
    visited.add(sourceId);

    // BFS traversal
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;

      // Check if we found the target
      if (current.memoryId === targetId) {
        const totalWeight = this.calculatePathWeight(current.links);
        const explanation = this.explainPath({
          memories: current.path,
          links: current.links,
          totalWeight,
          explanation: "",
        });

        return {
          memories: current.path,
          links: current.links,
          totalWeight,
          explanation,
        };
      }

      // Stop if we've reached max depth
      if (current.depth >= maxDepth) {
        continue;
      }

      // Get outgoing links
      const links = await this.getOutgoingLinks(current.memoryId);

      // Explore neighbors
      for (const link of links) {
        if (!visited.has(link.targetId)) {
          visited.add(link.targetId);

          const memory = await this.getMemory(link.targetId);
          if (memory) {
            queue.push({
              memoryId: link.targetId,
              depth: current.depth + 1,
              path: [...current.path, memory],
              links: [...current.links, link],
            });
          }
        }
      }
    }

    // No path found
    return null;
  }

  /**
   * Generate human-readable explanation of a path
   *
   * @param path - Path to explain
   * @returns Human-readable path description
   */
  explainPath(path: Path): string {
    // Handle empty path
    if (path.memories.length === 0) {
      return "No path found";
    }

    // Single memory (no links)
    if (path.memories.length === 1) {
      return `${path.memories[0].content}`;
    }

    // Build explanation
    const parts: string[] = [];

    for (let i = 0; i < path.memories.length; i++) {
      const memory = path.memories[i];
      const truncatedContent =
        memory.content.length > 50 ? `${memory.content.substring(0, 47)}...` : memory.content;

      parts.push(truncatedContent);

      // Add link info if not last memory
      if (i < path.links.length) {
        const link = path.links[i];
        parts.push(` → [${link.linkType}, ${link.weight.toFixed(2)}] → `);
      }
    }

    // Add total strength
    parts.push(` (total strength: ${path.totalWeight.toFixed(2)})`);

    return parts.join("");
  }

  /**
   * Expand from starting memory for N hops
   *
   * @param startMemoryId - Starting memory ID
   * @param hops - Number of hops to expand
   * @returns All reachable memories within hop limit
   */
  async expandViaWaypoint(startMemoryId: string, hops: number): Promise<Memory[]> {
    // Validate hops
    if (hops < 0) {
      return [];
    }

    // Use BFS with maxDepth=hops
    const result = await this.breadthFirstSearch(startMemoryId, {
      maxDepth: hops,
    });

    return result.memories;
  }

  /**
   * Get all outgoing links from a memory
   *
   * @param memoryId - Memory ID
   * @returns Array of links sorted by weight descending
   */
  private async getOutgoingLinks(memoryId: string): Promise<Link[]> {
    const client = await this.db.getConnection();
    try {
      const result = await client.query(
        `SELECT source_id, target_id, link_type, weight, created_at, traversal_count
         FROM memory_links
         WHERE source_id = $1
         ORDER BY weight DESC`,
        [memoryId]
      );

      return result.rows.map((row) => ({
        sourceId: row.source_id,
        targetId: row.target_id,
        linkType: row.link_type,
        weight: row.weight,
        createdAt: new Date(row.created_at),
        traversalCount: row.traversal_count,
      }));
    } catch {
      // Log error but return empty array to allow graceful degradation
      return [];
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Get memory by ID
   *
   * @param memoryId - Memory ID
   * @returns Memory if found, null otherwise
   */
  private async getMemory(memoryId: string): Promise<Memory | null> {
    const client = await this.db.getConnection();
    try {
      const result = await client.query(
        `SELECT id, content, created_at, last_accessed, access_count, salience, strength,
                user_id, session_id, primary_sector
         FROM memories
         WHERE id = $1`,
        [memoryId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      // Get metadata
      const metadataResult = await client.query(
        `SELECT keywords, tags, category, context, importance, is_atomic, parent_id
         FROM memory_metadata
         WHERE memory_id = $1`,
        [memoryId]
      );

      const metadata = metadataResult.rows[0] ?? {
        keywords: [],
        tags: [],
        category: "",
        context: "",
        importance: 0.5,
        is_atomic: true,
        parent_id: null,
      };

      return {
        id: row.id,
        content: row.content,
        createdAt: new Date(row.created_at),
        lastAccessed: new Date(row.last_accessed),
        accessCount: row.access_count,
        salience: row.salience,
        strength: row.strength,
        userId: row.user_id,
        sessionId: row.session_id,
        primarySector: row.primary_sector,
        metadata: {
          keywords: metadata.keywords ?? [],
          tags: metadata.tags ?? [],
          category: metadata.category ?? "",
          context: metadata.context ?? "",
          importance: metadata.importance ?? 0.5,
          isAtomic: metadata.is_atomic ?? true,
          parentId: metadata.parent_id ?? undefined,
        },
      };
    } catch {
      // Log error and return null
      return null;
    } finally {
      this.db.releaseConnection(client);
    }
  }

  /**
   * Calculate total path weight as average of link weights
   *
   * @param links - Array of links in path
   * @returns Average weight (0-1)
   */
  private calculatePathWeight(links: Link[]): number {
    if (links.length === 0) {
      return 0;
    }

    const sum = links.reduce((acc, link) => acc + link.weight, 0);
    return sum / links.length;
  }

  /**
   * Breadth-first search traversal
   *
   * @param startId - Starting memory ID
   * @param options - Traversal options
   * @returns TraversalResult with memories and metadata
   */
  private async breadthFirstSearch(
    startId: string,
    options: TraversalOptions
  ): Promise<TraversalResult> {
    const visited = new Set<string>();
    const queue: Array<{ memoryId: string; depth: number }> = [];
    const memories: Memory[] = [];

    // Get start memory
    const startMemory = await this.getMemory(startId);
    if (!startMemory) {
      return { memories: [], visitedCount: 0 };
    }

    // Initialize queue with start node
    queue.push({ memoryId: startId, depth: 0 });
    visited.add(startId);
    memories.push(startMemory);

    // BFS traversal
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;

      // Stop if we've reached max depth
      if (current.depth >= options.maxDepth) {
        continue;
      }

      // Get outgoing links
      const links = await this.getOutgoingLinks(current.memoryId);

      // Filter by minimum weight if specified
      const filteredLinks = options.minWeight
        ? links.filter((link) => link.weight >= (options.minWeight ?? 0))
        : links;

      // Add connected memories to queue
      for (const link of filteredLinks) {
        if (!visited.has(link.targetId)) {
          visited.add(link.targetId);

          const memory = await this.getMemory(link.targetId);
          if (memory) {
            memories.push(memory);
            queue.push({ memoryId: link.targetId, depth: current.depth + 1 });
          }
        }
      }
    }

    return {
      memories,
      visitedCount: visited.size,
    };
  }

  /**
   * Depth-first search traversal
   *
   * @param startId - Starting memory ID
   * @param options - Traversal options
   * @returns TraversalResult with memories and metadata
   */
  private async depthFirstSearch(
    startId: string,
    options: TraversalOptions
  ): Promise<TraversalResult> {
    const visited = new Set<string>();
    const stack: Array<{ memoryId: string; depth: number }> = [];
    const memories: Memory[] = [];

    // Get start memory
    const startMemory = await this.getMemory(startId);
    if (!startMemory) {
      return { memories: [], visitedCount: 0 };
    }

    // Initialize stack with start node
    stack.push({ memoryId: startId, depth: 0 });

    // DFS traversal
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;

      // Skip if already visited
      if (visited.has(current.memoryId)) {
        continue;
      }

      visited.add(current.memoryId);

      const memory = await this.getMemory(current.memoryId);
      if (memory) {
        memories.push(memory);
      }

      // Stop if we've reached max depth
      if (current.depth >= options.maxDepth) {
        continue;
      }

      // Get outgoing links
      const links = await this.getOutgoingLinks(current.memoryId);

      // Filter by minimum weight if specified
      const filteredLinks = options.minWeight
        ? links.filter((link) => link.weight >= (options.minWeight ?? 0))
        : links;

      // Add connected memories to stack (in reverse order for consistent traversal)
      for (let i = filteredLinks.length - 1; i >= 0; i--) {
        const link = filteredLinks[i];
        if (!visited.has(link.targetId)) {
          stack.push({ memoryId: link.targetId, depth: current.depth + 1 });
        }
      }
    }

    return {
      memories,
      visitedCount: visited.size,
    };
  }
}
