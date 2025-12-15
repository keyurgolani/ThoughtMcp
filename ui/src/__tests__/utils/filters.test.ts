/**
 * Filter Utility Tests
 *
 * Tests for filter utility functions.
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import type { GraphNode, MemorySectorType } from '@types';
import {
  filterNodes,
  filterNodesBySalience,
  filterNodesBySector,
  filterNodesByStrength,
  filterNodesByTags,
  filterNodesByText,
} from '@utils/filters';
import { describe, expect, it } from 'vitest';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: 'test-node-1',
    content: 'Test memory content',
    primarySector: 'semantic',
    salience: 0.5,
    strength: 0.5,
    createdAt: '2024-01-01T00:00:00Z',
    metadata: {
      keywords: [],
      tags: [],
      category: '',
    },
    ...overrides,
  };
}

function createTestNodes(): GraphNode[] {
  return [
    createTestNode({
      id: 'node-1',
      content: 'Learning TypeScript basics',
      primarySector: 'semantic',
      salience: 0.8,
      strength: 0.9,
      metadata: {
        keywords: ['typescript', 'programming'],
        tags: ['learning', 'tech'],
        category: 'education',
      },
    }),
    createTestNode({
      id: 'node-2',
      content: 'Meeting with team yesterday',
      primarySector: 'episodic',
      salience: 0.6,
      strength: 0.7,
      metadata: {
        keywords: ['meeting', 'team'],
        tags: ['work'],
        category: 'events',
      },
    }),
    createTestNode({
      id: 'node-3',
      content: 'How to deploy applications',
      primarySector: 'procedural',
      salience: 0.4,
      strength: 0.5,
      metadata: {
        keywords: ['deployment', 'devops'],
        tags: ['tutorial'],
        category: 'technical',
      },
    }),
    createTestNode({
      id: 'node-4',
      content: 'Feeling excited about the project',
      primarySector: 'emotional',
      salience: 0.3,
      strength: 0.4,
      metadata: {
        keywords: ['excitement', 'project'],
        tags: ['feelings'],
        category: 'personal',
      },
    }),
    createTestNode({
      id: 'node-5',
      content: 'Reflection on coding practices',
      primarySector: 'reflective',
      salience: 0.2,
      strength: 0.3,
      metadata: {
        keywords: ['reflection', 'coding'],
        tags: ['insights'],
        category: 'meta',
      },
    }),
  ];
}

// ============================================================================
// Text Search Filter Tests (Requirements: 7.1)
// ============================================================================

describe('filterNodesByText', () => {
  const nodes = createTestNodes();

  it('should return all nodes for empty query', () => {
    expect(filterNodesByText(nodes, '')).toEqual(nodes);
    expect(filterNodesByText(nodes, '   ')).toEqual(nodes);
  });

  it('should filter by content match', () => {
    const result = filterNodesByText(nodes, 'TypeScript');
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('node-1');
  });

  it('should be case-insensitive', () => {
    const result1 = filterNodesByText(nodes, 'typescript');
    const result2 = filterNodesByText(nodes, 'TYPESCRIPT');
    expect(result1).toHaveLength(1);
    expect(result2).toHaveLength(1);
    expect(result1[0]?.id).toBe(result2[0]?.id);
  });

  it('should filter by keyword match', () => {
    const result = filterNodesByText(nodes, 'programming');
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('node-1');
  });

  it('should filter by tag match', () => {
    const result = filterNodesByText(nodes, 'tutorial');
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('node-3');
  });

  it('should filter by category match', () => {
    const result = filterNodesByText(nodes, 'education');
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('node-1');
  });

  it('should return multiple matches', () => {
    const result = filterNodesByText(nodes, 'project');
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('node-4');
  });

  it('should return empty array when no matches', () => {
    const result = filterNodesByText(nodes, 'nonexistent');
    expect(result).toHaveLength(0);
  });

  it('should handle partial matches', () => {
    const result = filterNodesByText(nodes, 'deploy');
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('node-3');
  });

  it('should handle nodes with empty metadata', () => {
    const nodesWithEmptyMeta = [
      createTestNode({
        id: 'empty-meta',
        content: 'Test content',
        metadata: {},
      }),
    ];
    const result = filterNodesByText(nodesWithEmptyMeta, 'Test');
    expect(result).toHaveLength(1);
  });
});

// ============================================================================
// Sector Filter Tests (Requirements: 7.2)
// ============================================================================

describe('filterNodesBySector', () => {
  const nodes = createTestNodes();

  it('should return all nodes when no sectors selected', () => {
    expect(filterNodesBySector(nodes, [])).toEqual(nodes);
  });

  it('should filter by single sector', () => {
    const result = filterNodesBySector(nodes, ['semantic']);
    expect(result).toHaveLength(1);
    expect(result[0]?.primarySector).toBe('semantic');
  });

  it('should filter by multiple sectors', () => {
    const result = filterNodesBySector(nodes, ['semantic', 'episodic']);
    expect(result).toHaveLength(2);
    expect(result.every((n) => ['semantic', 'episodic'].includes(n.primarySector))).toBe(true);
  });

  it('should return all nodes matching any selected sector', () => {
    const sectors: MemorySectorType[] = [
      'episodic',
      'semantic',
      'procedural',
      'emotional',
      'reflective',
    ];
    const result = filterNodesBySector(nodes, sectors);
    expect(result).toHaveLength(5);
  });

  it('should return empty array when no nodes match sectors', () => {
    const nodesOnlySemantic = [createTestNode({ primarySector: 'semantic' })];
    const result = filterNodesBySector(nodesOnlySemantic, ['episodic']);
    expect(result).toHaveLength(0);
  });

  it('should handle undefined sectors array', () => {
    const result = filterNodesBySector(nodes, undefined as unknown as MemorySectorType[]);
    expect(result).toEqual(nodes);
  });
});

// ============================================================================
// Strength Threshold Filter Tests (Requirements: 7.3)
// ============================================================================

describe('filterNodesByStrength', () => {
  const nodes = createTestNodes();

  it('should return all nodes for threshold of 0', () => {
    expect(filterNodesByStrength(nodes, 0)).toEqual(nodes);
  });

  it('should filter nodes below threshold', () => {
    const result = filterNodesByStrength(nodes, 0.5);
    expect(result.every((n) => n.strength >= 0.5)).toBe(true);
  });

  it('should include nodes at exactly the threshold', () => {
    const result = filterNodesByStrength(nodes, 0.5);
    expect(result.some((n) => n.strength === 0.5)).toBe(true);
  });

  it('should return empty array when threshold is too high', () => {
    const result = filterNodesByStrength(nodes, 1.0);
    expect(result).toHaveLength(0);
  });

  it('should clamp negative threshold to 0', () => {
    const result = filterNodesByStrength(nodes, -0.5);
    expect(result).toEqual(nodes);
  });

  it('should clamp threshold above 1 to 1', () => {
    const result = filterNodesByStrength(nodes, 1.5);
    expect(result).toHaveLength(0);
  });

  it('should filter progressively with increasing threshold', () => {
    const count0 = filterNodesByStrength(nodes, 0).length;
    const count05 = filterNodesByStrength(nodes, 0.5).length;
    const count08 = filterNodesByStrength(nodes, 0.8).length;

    expect(count0).toBeGreaterThanOrEqual(count05);
    expect(count05).toBeGreaterThanOrEqual(count08);
  });
});

// ============================================================================
// Salience Threshold Filter Tests (Requirements: 7.4)
// ============================================================================

describe('filterNodesBySalience', () => {
  const nodes = createTestNodes();

  it('should return all nodes for threshold of 0', () => {
    expect(filterNodesBySalience(nodes, 0)).toEqual(nodes);
  });

  it('should filter nodes below threshold', () => {
    const result = filterNodesBySalience(nodes, 0.5);
    expect(result.every((n) => n.salience >= 0.5)).toBe(true);
  });

  it('should include nodes at exactly the threshold', () => {
    const nodesWithExact = [createTestNode({ salience: 0.5 })];
    const result = filterNodesBySalience(nodesWithExact, 0.5);
    expect(result).toHaveLength(1);
  });

  it('should return empty array when threshold is too high', () => {
    const result = filterNodesBySalience(nodes, 1.0);
    expect(result).toHaveLength(0);
  });

  it('should clamp negative threshold to 0', () => {
    const result = filterNodesBySalience(nodes, -0.5);
    expect(result).toEqual(nodes);
  });

  it('should clamp threshold above 1 to 1', () => {
    const result = filterNodesBySalience(nodes, 1.5);
    expect(result).toHaveLength(0);
  });

  it('should filter progressively with increasing threshold', () => {
    const count0 = filterNodesBySalience(nodes, 0).length;
    const count05 = filterNodesBySalience(nodes, 0.5).length;
    const count08 = filterNodesBySalience(nodes, 0.8).length;

    expect(count0).toBeGreaterThanOrEqual(count05);
    expect(count05).toBeGreaterThanOrEqual(count08);
  });
});

// ============================================================================
// Tag Filter Tests (Requirements: 42.3, 42.4)
// ============================================================================

describe('filterNodesByTags', () => {
  const nodes = createTestNodes();

  it('should return all nodes when no tags selected', () => {
    expect(filterNodesByTags(nodes, [])).toEqual(nodes);
    expect(filterNodesByTags(nodes, null)).toEqual(nodes);
    expect(filterNodesByTags(nodes, undefined)).toEqual(nodes);
  });

  it('should filter by single tag', () => {
    const result = filterNodesByTags(nodes, ['learning']);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('node-1');
  });

  it('should be case-insensitive', () => {
    const result1 = filterNodesByTags(nodes, ['LEARNING']);
    const result2 = filterNodesByTags(nodes, ['Learning']);
    const result3 = filterNodesByTags(nodes, ['learning']);
    expect(result1).toHaveLength(1);
    expect(result2).toHaveLength(1);
    expect(result3).toHaveLength(1);
    expect(result1[0]?.id).toBe(result2[0]?.id);
    expect(result2[0]?.id).toBe(result3[0]?.id);
  });

  it('should use intersection (AND) logic for multiple tags (Requirement 42.4)', () => {
    // Create nodes with multiple tags for testing intersection
    const nodesWithMultipleTags = [
      createTestNode({
        id: 'multi-1',
        content: 'Node with both tags',
        metadata: { keywords: [], tags: ['tech', 'learning'], category: '' },
      }),
      createTestNode({
        id: 'multi-2',
        content: 'Node with only tech',
        metadata: { keywords: [], tags: ['tech'], category: '' },
      }),
      createTestNode({
        id: 'multi-3',
        content: 'Node with only learning',
        metadata: { keywords: [], tags: ['learning'], category: '' },
      }),
    ];

    // Single tag should return all nodes with that tag
    const singleTagResult = filterNodesByTags(nodesWithMultipleTags, ['tech']);
    expect(singleTagResult).toHaveLength(2);

    // Multiple tags should return only nodes with ALL tags (intersection)
    const multiTagResult = filterNodesByTags(nodesWithMultipleTags, ['tech', 'learning']);
    expect(multiTagResult).toHaveLength(1);
    expect(multiTagResult[0]?.id).toBe('multi-1');
  });

  it('should return empty array when no nodes have all selected tags', () => {
    const result = filterNodesByTags(nodes, ['learning', 'work']);
    expect(result).toHaveLength(0);
  });

  it('should return empty array for nodes without tags', () => {
    const nodesWithoutTags = [
      createTestNode({
        id: 'no-tags',
        content: 'Node without tags',
        metadata: { keywords: [], tags: [], category: '' },
      }),
    ];
    const result = filterNodesByTags(nodesWithoutTags, ['any-tag']);
    expect(result).toHaveLength(0);
  });

  it('should handle nodes with undefined tags', () => {
    const nodesWithUndefinedTags = [
      createTestNode({
        id: 'undefined-tags',
        content: 'Node with undefined tags',
        metadata: { keywords: [] },
      }),
    ];
    const result = filterNodesByTags(nodesWithUndefinedTags, ['any-tag']);
    expect(result).toHaveLength(0);
  });

  it('should filter progressively with more tags', () => {
    const nodesWithVaryingTags = [
      createTestNode({
        id: 'all-tags',
        content: 'Node with all tags',
        metadata: { keywords: [], tags: ['a', 'b', 'c'], category: '' },
      }),
      createTestNode({
        id: 'two-tags',
        content: 'Node with two tags',
        metadata: { keywords: [], tags: ['a', 'b'], category: '' },
      }),
      createTestNode({
        id: 'one-tag',
        content: 'Node with one tag',
        metadata: { keywords: [], tags: ['a'], category: '' },
      }),
    ];

    const oneTag = filterNodesByTags(nodesWithVaryingTags, ['a']);
    const twoTags = filterNodesByTags(nodesWithVaryingTags, ['a', 'b']);
    const threeTags = filterNodesByTags(nodesWithVaryingTags, ['a', 'b', 'c']);

    expect(oneTag).toHaveLength(3);
    expect(twoTags).toHaveLength(2);
    expect(threeTags).toHaveLength(1);
  });
});

// ============================================================================
// Combined Filter Tests (Requirements: 7.1, 7.2, 7.3, 7.4, 42.3, 42.4)
// ============================================================================

describe('filterNodes', () => {
  const nodes = createTestNodes();

  it('should return all nodes with empty options', () => {
    expect(filterNodes(nodes, {})).toEqual(nodes);
  });

  it('should apply text filter only', () => {
    const result = filterNodes(nodes, { query: 'TypeScript' });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('node-1');
  });

  it('should apply sector filter only', () => {
    const result = filterNodes(nodes, { sectors: ['episodic'] });
    expect(result).toHaveLength(1);
    expect(result[0]?.primarySector).toBe('episodic');
  });

  it('should apply strength filter only', () => {
    const result = filterNodes(nodes, { minStrength: 0.7 });
    expect(result.every((n) => n.strength >= 0.7)).toBe(true);
  });

  it('should apply salience filter only', () => {
    const result = filterNodes(nodes, { minSalience: 0.6 });
    expect(result.every((n) => n.salience >= 0.6)).toBe(true);
  });

  it('should combine multiple filters', () => {
    const result = filterNodes(nodes, {
      sectors: ['semantic', 'episodic'],
      minStrength: 0.5,
    });
    expect(result.every((n) => ['semantic', 'episodic'].includes(n.primarySector))).toBe(true);
    expect(result.every((n) => n.strength >= 0.5)).toBe(true);
  });

  it('should apply all filters together', () => {
    const result = filterNodes(nodes, {
      query: 'learning',
      sectors: ['semantic'],
      minStrength: 0.5,
      minSalience: 0.5,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('node-1');
  });

  it('should return empty array when no nodes match all criteria', () => {
    const result = filterNodes(nodes, {
      query: 'TypeScript',
      sectors: ['episodic'], // TypeScript node is semantic, not episodic
    });
    expect(result).toHaveLength(0);
  });

  it('should apply tag filter only (Requirements: 42.3, 42.4)', () => {
    const result = filterNodes(nodes, { tags: ['learning'] });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('node-1');
  });

  it('should combine tag filter with other filters (Requirements: 42.3, 42.4)', () => {
    const result = filterNodes(nodes, {
      tags: ['tech'],
      sectors: ['semantic'],
      minStrength: 0.5,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('node-1');
  });

  it('should return empty when tag filter excludes all nodes', () => {
    const result = filterNodes(nodes, {
      tags: ['nonexistent-tag'],
    });
    expect(result).toHaveLength(0);
  });
});
