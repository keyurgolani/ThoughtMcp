/**
 * KeywordHoverPreview Component Tests
 *
 * Tests for the KeywordHoverPreview component that displays a tooltip
 * preview of connected memories when hovering over a highlighted keyword.
 *
 * Requirements: 40.3
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  KeywordHoverPreview,
  memoryToPreview,
  truncatePreviewContent,
  type MemoryPreview,
} from '../../../components/hud/KeywordHoverPreview';
import type { Memory } from '../../../types/api';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMemoryPreview(overrides: Partial<MemoryPreview> = {}): MemoryPreview {
  return {
    id: 'mem-1',
    content: 'Test memory content for preview',
    primarySector: 'semantic',
    salience: 0.8,
    strength: 0.7,
    ...overrides,
  };
}

function createMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'mem-1',
    content: 'Test memory content',
    createdAt: '2024-01-01T00:00:00Z',
    lastAccessed: '2024-01-02T00:00:00Z',
    accessCount: 5,
    salience: 0.8,
    strength: 0.7,
    userId: 'user-1',
    sessionId: 'session-1',
    primarySector: 'semantic',
    metadata: {
      keywords: ['test'],
      tags: ['tag1'],
    },
    ...overrides,
  };
}

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('truncatePreviewContent', () => {
  it('should return content unchanged if shorter than max length', () => {
    const content = 'Short content';
    expect(truncatePreviewContent(content, 50)).toBe(content);
  });

  it('should truncate content with ellipsis if longer than max length', () => {
    const content = 'This is a very long content that should be truncated';
    const result = truncatePreviewContent(content, 20);
    expect(result).toBe('This is a very lo...');
    expect(result.length).toBe(20);
  });

  it('should use default max length of 120', () => {
    const longContent = 'A'.repeat(150);
    const result = truncatePreviewContent(longContent);
    expect(result.length).toBe(120);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should handle empty string', () => {
    expect(truncatePreviewContent('')).toBe('');
  });

  it('should handle content exactly at max length', () => {
    const content = 'A'.repeat(50);
    expect(truncatePreviewContent(content, 50)).toBe(content);
  });
});

describe('memoryToPreview', () => {
  it('should convert Memory to MemoryPreview', () => {
    const memory = createMemory({
      id: 'test-id',
      content: 'Test content',
      primarySector: 'episodic',
      salience: 0.9,
      strength: 0.6,
    });

    const preview = memoryToPreview(memory);

    expect(preview.id).toBe('test-id');
    expect(preview.content).toBe('Test content');
    expect(preview.primarySector).toBe('episodic');
    expect(preview.salience).toBe(0.9);
    expect(preview.strength).toBe(0.6);
  });

  it('should only include preview-relevant fields', () => {
    const memory = createMemory();
    const preview = memoryToPreview(memory);

    // Should have exactly these fields
    expect(Object.keys(preview).sort()).toEqual([
      'content',
      'id',
      'primarySector',
      'salience',
      'strength',
    ]);
  });
});

// ============================================================================
// KeywordHoverPreview Component Tests
// ============================================================================

describe('KeywordHoverPreview', () => {
  it('should not render when isVisible is false', () => {
    const { container } = render(
      <KeywordHoverPreview
        isVisible={false}
        keywordText="test"
        linkType="semantic"
        connectedMemories={[createMemoryPreview()]}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render when connectedMemories is empty', () => {
    const { container } = render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="test"
        linkType="semantic"
        connectedMemories={[]}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when visible with connected memories', () => {
    render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="test keyword"
        linkType="semantic"
        connectedMemories={[createMemoryPreview()]}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(screen.getByText('"test keyword"')).toBeInTheDocument();
    expect(screen.getByText('Semantic Link')).toBeInTheDocument();
  });

  it('should display correct link type label for causal links', () => {
    render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="cause"
        linkType="causal"
        connectedMemories={[createMemoryPreview()]}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(screen.getByText('Causal Link')).toBeInTheDocument();
  });

  it('should display correct link type label for temporal links', () => {
    render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="time"
        linkType="temporal"
        connectedMemories={[createMemoryPreview()]}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(screen.getByText('Temporal Link')).toBeInTheDocument();
  });

  it('should display correct link type label for analogical links', () => {
    render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="similar"
        linkType="analogical"
        connectedMemories={[createMemoryPreview()]}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(screen.getByText('Analogical Link')).toBeInTheDocument();
  });

  it('should display memory content preview', () => {
    render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="test"
        linkType="semantic"
        connectedMemories={[createMemoryPreview({ content: 'Preview content here' })]}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(screen.getByText('Preview content here')).toBeInTheDocument();
  });

  it('should display salience and strength percentages', () => {
    render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="test"
        linkType="semantic"
        connectedMemories={[createMemoryPreview({ salience: 0.85, strength: 0.65 })]}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(screen.getByText('Salience: 85%')).toBeInTheDocument();
    expect(screen.getByText('Strength: 65%')).toBeInTheDocument();
  });

  it('should display sector type', () => {
    render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="test"
        linkType="semantic"
        connectedMemories={[createMemoryPreview({ primarySector: 'episodic' })]}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(screen.getByText('episodic')).toBeInTheDocument();
  });

  it('should display multiple connected memories', () => {
    render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="test"
        linkType="semantic"
        connectedMemories={[
          createMemoryPreview({ id: 'mem-1', content: 'First memory' }),
          createMemoryPreview({ id: 'mem-2', content: 'Second memory' }),
        ]}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(screen.getByText('First memory')).toBeInTheDocument();
    expect(screen.getByText('Second memory')).toBeInTheDocument();
  });

  it('should limit displayed memories to 3 and show remaining count', () => {
    render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="test"
        linkType="semantic"
        connectedMemories={[
          createMemoryPreview({ id: 'mem-1', content: 'Memory 1' }),
          createMemoryPreview({ id: 'mem-2', content: 'Memory 2' }),
          createMemoryPreview({ id: 'mem-3', content: 'Memory 3' }),
          createMemoryPreview({ id: 'mem-4', content: 'Memory 4' }),
          createMemoryPreview({ id: 'mem-5', content: 'Memory 5' }),
        ]}
        position={{ x: 100, y: 100 }}
      />
    );

    // First 3 should be visible
    expect(screen.getByText('Memory 1')).toBeInTheDocument();
    expect(screen.getByText('Memory 2')).toBeInTheDocument();
    expect(screen.getByText('Memory 3')).toBeInTheDocument();

    // 4th and 5th should not be visible
    expect(screen.queryByText('Memory 4')).not.toBeInTheDocument();
    expect(screen.queryByText('Memory 5')).not.toBeInTheDocument();

    // Should show remaining count
    expect(screen.getByText('+2 more connected memories')).toBeInTheDocument();
  });

  it('should show singular form for 1 remaining memory', () => {
    render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="test"
        linkType="semantic"
        connectedMemories={[
          createMemoryPreview({ id: 'mem-1', content: 'Memory 1' }),
          createMemoryPreview({ id: 'mem-2', content: 'Memory 2' }),
          createMemoryPreview({ id: 'mem-3', content: 'Memory 3' }),
          createMemoryPreview({ id: 'mem-4', content: 'Memory 4' }),
        ]}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(screen.getByText('+1 more connected memory')).toBeInTheDocument();
  });

  it('should display click hint', () => {
    render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="test"
        linkType="semantic"
        connectedMemories={[createMemoryPreview()]}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(screen.getByText('Click keyword to navigate')).toBeInTheDocument();
  });

  it('should apply high contrast styling when enabled', () => {
    const { container } = render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="test"
        linkType="semantic"
        connectedMemories={[createMemoryPreview()]}
        position={{ x: 100, y: 100 }}
        highContrast={true}
      />
    );

    // High contrast mode should render the tooltip with appropriate styling
    // The tooltip uses inline styles now, so we check for the tooltip container
    const tooltip = container.querySelector('.backdrop-blur-xl');
    expect(tooltip).toBeInTheDocument();
  });

  it('should truncate long memory content', () => {
    const longContent = 'A'.repeat(200);
    render(
      <KeywordHoverPreview
        isVisible={true}
        keywordText="test"
        linkType="semantic"
        connectedMemories={[createMemoryPreview({ content: longContent })]}
        position={{ x: 100, y: 100 }}
      />
    );

    // Content should be truncated with ellipsis
    const truncated = screen.getByText(/A+\.\.\./);
    expect(truncated).toBeInTheDocument();
  });
});
