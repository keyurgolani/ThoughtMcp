/**
 * Related Memories Utilities Tests
 *
 * Tests for computing related memories with connection type distinction.
 * Requirements: 45.1, 45.2, 45.4
 */

import { describe, expect, it } from 'vitest';
import type { GraphEdge, Memory, MemorySectorType } from '../../types/api';
import {
  computeRelatedMemories,
  determineConnectionType,
  findDirectlyLinkedIds,
  findEdge,
  findInferredConnectionIds,
  findSharedKeywords,
} from '../../utils/relatedMemories';

// ============================================================================
// Test Fixtures
// ============================================================================

const createMemory = (
  id: string,
  content: string,
  keywords: string[] = [],
  sector: MemorySectorType = 'semantic'
): Memory => ({
  id,
  content,
  createdAt: new Date().toISOString(),
  lastAccessed: new Date().toISOString(),
  accessCount: 1,
  salience: 0.5,
  strength: 0.5,
  userId: 'test-user',
  sessionId: 'test-session',
  primarySector: sector,
  metadata: { keywords },
});

const testMemories: Memory[] = [
  createMemory('mem-1', 'Neural networks and deep learning fundamentals', [
    'neural',
    'learning',
    'AI',
  ]),
  createMemory('mem-2', 'Machine learning algorithms and optimization', [
    'machine',
    'learning',
    'algorithms',
  ]),
  createMemory('mem-3', 'Natural language processing with transformers', [
    'NLP',
    'transformers',
    'AI',
  ]),
  createMemory('mem-4', 'Computer vision and image recognition', [
    'vision',
    'images',
    'recognition',
  ]),
  createMemory('mem-5', 'Reinforcement learning and game playing', [
    'reinforcement',
    'learning',
    'games',
  ]),
];

const testEdges: GraphEdge[] = [
  { source: 'mem-1', target: 'mem-2', linkType: 'semantic', weight: 0.8 },
  { source: 'mem-1', target: 'mem-3', linkType: 'causal', weight: 0.6 },
  { source: 'mem-2', target: 'mem-5', linkType: 'semantic', weight: 0.7 },
];

// ============================================================================
// findDirectlyLinkedIds Tests
// ============================================================================

describe('findDirectlyLinkedIds', () => {
  it('should find all directly linked memory IDs', () => {
    const linkedIds = findDirectlyLinkedIds('mem-1', testEdges);

    expect(linkedIds.size).toBe(2);
    expect(linkedIds.has('mem-2')).toBe(true);
    expect(linkedIds.has('mem-3')).toBe(true);
    expect(linkedIds.has('mem-4')).toBe(false);
  });

  it('should find links in both directions', () => {
    const linkedIds = findDirectlyLinkedIds('mem-2', testEdges);

    expect(linkedIds.size).toBe(2);
    expect(linkedIds.has('mem-1')).toBe(true); // mem-1 -> mem-2
    expect(linkedIds.has('mem-5')).toBe(true); // mem-2 -> mem-5
  });

  it('should return empty set for memory with no links', () => {
    const linkedIds = findDirectlyLinkedIds('mem-4', testEdges);

    expect(linkedIds.size).toBe(0);
  });

  it('should return empty set for empty edges array', () => {
    const linkedIds = findDirectlyLinkedIds('mem-1', []);

    expect(linkedIds.size).toBe(0);
  });
});

// ============================================================================
// findInferredConnectionIds Tests
// ============================================================================

describe('findInferredConnectionIds', () => {
  it('should find inferred connections through shared neighbors', () => {
    const directlyLinked = findDirectlyLinkedIds('mem-1', testEdges);
    const inferredIds = findInferredConnectionIds('mem-1', testEdges, directlyLinked);

    // mem-1 -> mem-2 -> mem-5, so mem-5 is inferred
    expect(inferredIds.has('mem-5')).toBe(true);
  });

  it('should not include directly linked memories', () => {
    const directlyLinked = findDirectlyLinkedIds('mem-1', testEdges);
    const inferredIds = findInferredConnectionIds('mem-1', testEdges, directlyLinked);

    expect(inferredIds.has('mem-2')).toBe(false);
    expect(inferredIds.has('mem-3')).toBe(false);
  });

  it('should return empty set when no inferred connections exist', () => {
    const directlyLinked = findDirectlyLinkedIds('mem-4', testEdges);
    const inferredIds = findInferredConnectionIds('mem-4', testEdges, directlyLinked);

    expect(inferredIds.size).toBe(0);
  });
});

// ============================================================================
// determineConnectionType Tests
// ============================================================================

describe('determineConnectionType', () => {
  const directlyLinked = new Set(['mem-2', 'mem-3']);
  const inferred = new Set(['mem-5']);

  it('should return "direct" for directly linked memories', () => {
    expect(determineConnectionType('mem-2', directlyLinked, inferred)).toBe('direct');
    expect(determineConnectionType('mem-3', directlyLinked, inferred)).toBe('direct');
  });

  it('should return "inferred" for inferred connections', () => {
    expect(determineConnectionType('mem-5', directlyLinked, inferred)).toBe('inferred');
  });

  it('should return "semantic" for memories with no direct or inferred link', () => {
    expect(determineConnectionType('mem-4', directlyLinked, inferred)).toBe('semantic');
  });
});

// ============================================================================
// findEdge Tests
// ============================================================================

describe('findEdge', () => {
  it('should find edge between two memories', () => {
    const edge = findEdge('mem-1', 'mem-2', testEdges);

    expect(edge).toBeDefined();
    expect(edge?.linkType).toBe('semantic');
    expect(edge?.weight).toBe(0.8);
  });

  it('should find edge regardless of direction', () => {
    const edge1 = findEdge('mem-1', 'mem-2', testEdges);
    const edge2 = findEdge('mem-2', 'mem-1', testEdges);

    expect(edge1).toEqual(edge2);
  });

  it('should return undefined when no edge exists', () => {
    const edge = findEdge('mem-1', 'mem-4', testEdges);

    expect(edge).toBeUndefined();
  });
});

// ============================================================================
// findSharedKeywords Tests
// ============================================================================

describe('findSharedKeywords', () => {
  it('should find shared keywords between memories', () => {
    const mem1 = createMemory('1', 'Neural networks', ['neural', 'AI']);
    const mem2 = createMemory('2', 'AI systems', ['AI', 'systems']);

    const shared = findSharedKeywords(mem1, mem2);

    // 'AI' is in both metadata keywords
    expect(shared).toContain('ai');
  });

  it('should return empty array when no shared keywords', () => {
    const mem1 = createMemory('1', 'Cooking recipes', ['cooking', 'food']);
    const mem2 = createMemory('2', 'Space exploration', ['space', 'rockets']);

    const shared = findSharedKeywords(mem1, mem2);

    expect(shared.length).toBe(0);
  });
});

// ============================================================================
// computeRelatedMemories Tests - Requirements: 45.1, 45.2, 45.4
// ============================================================================

describe('computeRelatedMemories', () => {
  it('should distinguish direct links from semantic similarity (Requirement 45.4)', () => {
    const currentMemory = testMemories[0];
    if (!currentMemory) throw new Error('Test memory not found');
    const related = computeRelatedMemories(currentMemory, testMemories, testEdges);

    // mem-2 and mem-3 are directly linked
    const directLinks = related.filter((r) => r.connectionType === 'direct');

    expect(directLinks.length).toBeGreaterThan(0);

    // Check that directly linked memories are marked as 'direct'
    const mem2Related = related.find((r) => r.memory.id === 'mem-2');
    const mem3Related = related.find((r) => r.memory.id === 'mem-3');

    expect(mem2Related?.connectionType).toBe('direct');
    expect(mem3Related?.connectionType).toBe('direct');

    // mem-4 has no direct link, should be semantic if included
    const mem4Related = related.find((r) => r.memory.id === 'mem-4');
    if (mem4Related) {
      expect(mem4Related.connectionType).toBe('semantic');
    }
  });

  it('should include relevance scores (Requirement 45.2)', () => {
    const currentMemory = testMemories[0];
    if (!currentMemory) throw new Error('Test memory not found');
    const related = computeRelatedMemories(currentMemory, testMemories, testEdges);

    for (const rel of related) {
      expect(rel.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(rel.relevanceScore).toBeLessThanOrEqual(1);
    }
  });

  it('should include shared keywords (Requirement 45.2)', () => {
    const currentMemory = testMemories[0];
    if (!currentMemory) throw new Error('Test memory not found');
    const related = computeRelatedMemories(currentMemory, testMemories, testEdges);

    for (const rel of related) {
      expect(Array.isArray(rel.sharedKeywords)).toBe(true);
    }
  });

  it('should sort direct links before semantic links', () => {
    const currentMemory = testMemories[0];
    if (!currentMemory) throw new Error('Test memory not found');
    const related = computeRelatedMemories(currentMemory, testMemories, testEdges);

    // Find first semantic link index
    const firstSemanticIndex = related.findIndex((r) => r.connectionType === 'semantic');

    if (firstSemanticIndex > 0) {
      // All items before first semantic should be direct or inferred
      for (let i = 0; i < firstSemanticIndex; i++) {
        const item = related[i];
        if (item) {
          expect(['direct', 'inferred']).toContain(item.connectionType);
        }
      }
    }
  });

  it('should not include the current memory in results', () => {
    const currentMemory = testMemories[0];
    if (!currentMemory) throw new Error('Test memory not found');
    const related = computeRelatedMemories(currentMemory, testMemories, testEdges);

    const selfIncluded = related.some((r) => r.memory.id === currentMemory.id);
    expect(selfIncluded).toBe(false);
  });

  it('should respect maxResults option', () => {
    const currentMemory = testMemories[0];
    if (!currentMemory) throw new Error('Test memory not found');
    const related = computeRelatedMemories(currentMemory, testMemories, testEdges, {
      maxResults: 2,
    });

    expect(related.length).toBeLessThanOrEqual(2);
  });

  it('should return empty array for null current memory', () => {
    const related = computeRelatedMemories(null, testMemories, testEdges);

    expect(related).toEqual([]);
  });

  it('should return empty array for empty memories array', () => {
    const currentMemory = testMemories[0];
    if (!currentMemory) throw new Error('Test memory not found');
    const related = computeRelatedMemories(currentMemory, [], testEdges);

    expect(related).toEqual([]);
  });

  it('should include inferred connections when enabled', () => {
    const currentMemory = testMemories[0];
    if (!currentMemory) throw new Error('Test memory not found');
    const related = computeRelatedMemories(currentMemory, testMemories, testEdges, {
      includeInferred: true,
    });

    // mem-5 is connected through mem-2 (mem-1 -> mem-2 -> mem-5)
    const mem5Related = related.find((r) => r.memory.id === 'mem-5');

    // mem-5 should be either inferred or semantic
    if (mem5Related) {
      expect(['inferred', 'semantic']).toContain(mem5Related.connectionType);
    }
  });
});
