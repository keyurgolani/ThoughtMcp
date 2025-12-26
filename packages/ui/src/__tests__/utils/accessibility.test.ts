/**
 * Accessibility Utility Tests
 *
 * Tests for accessibility utility functions.
 * Requirements: 13.2, 13.4
 */

import type { GraphNode, MemorySectorType } from '@types';
import {
  formatConnectionCount,
  generateAriaLabel,
  getAnimationConfig,
  prefersReducedMotion,
  subscribeToReducedMotion,
  truncateContent,
} from '@utils/accessibility';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: 'test-node-1',
    content: 'This is a test memory node with some content',
    primarySector: 'semantic',
    salience: 0.8,
    strength: 0.7,
    createdAt: '2024-01-01T00:00:00Z',
    metadata: {
      keywords: ['test', 'memory'],
      tags: ['unit-test'],
      category: 'testing',
    },
    ...overrides,
  };
}

// ============================================================================
// ARIA Label Generator Tests (Requirements: 13.4)
// ============================================================================

describe('generateAriaLabel', () => {
  it('should generate label with content preview and connection count', () => {
    const node = createTestNode({ content: 'Short content' });
    const label = generateAriaLabel(node, 5);

    expect(label).toBe('Semantic memory: Short content. 5 connections.');
  });

  it('should truncate long content with ellipsis', () => {
    const longContent =
      'This is a very long content that exceeds the maximum preview length and should be truncated';
    const node = createTestNode({ content: longContent });
    const label = generateAriaLabel(node, 3);

    expect(label).toContain('...');
    expect(label.length).toBeLessThan(longContent.length + 50);
  });

  it('should include correct sector name for each sector type', () => {
    const sectors: MemorySectorType[] = [
      'episodic',
      'semantic',
      'procedural',
      'emotional',
      'reflective',
    ];
    const expectedNames = ['Episodic', 'Semantic', 'Procedural', 'Emotional', 'Reflective'];

    sectors.forEach((sector, index) => {
      const node = createTestNode({ primarySector: sector, content: 'Test' });
      const label = generateAriaLabel(node, 1);
      const expectedName = expectedNames[index];
      if (expectedName === undefined) return;
      expect(label).toContain(expectedName + ' memory:');
    });
  });

  it('should handle zero connections', () => {
    const node = createTestNode();
    const label = generateAriaLabel(node, 0);

    expect(label).toContain('No connections');
  });

  it('should handle single connection', () => {
    const node = createTestNode();
    const label = generateAriaLabel(node, 1);

    expect(label).toContain('1 connection.');
  });

  it('should handle multiple connections', () => {
    const node = createTestNode();
    const label = generateAriaLabel(node, 10);

    expect(label).toContain('10 connections.');
  });

  it('should handle empty content', () => {
    const node = createTestNode({ content: '' });
    const label = generateAriaLabel(node, 2);

    expect(label).toContain('Empty content');
  });

  it('should handle whitespace-only content', () => {
    const node = createTestNode({ content: '   \n\t  ' });
    const label = generateAriaLabel(node, 2);

    expect(label).toContain('Empty content');
  });
});

// ============================================================================
// Truncate Content Tests
// ============================================================================

describe('truncateContent', () => {
  it('should return content as-is if within limit', () => {
    const content = 'Short content';
    expect(truncateContent(content, 50)).toBe(content);
  });

  it('should truncate and add ellipsis for long content', () => {
    const content = 'This is a very long content that needs to be truncated';
    const result = truncateContent(content, 20);

    expect(result).toContain('...');
    expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
  });

  it('should break at word boundary when possible', () => {
    const content = 'Hello world this is a test';
    const result = truncateContent(content, 15);

    // Should break at 'world' not mid-word
    expect(result).toBe('Hello world...');
  });

  it('should handle empty content', () => {
    expect(truncateContent('', 50)).toBe('Empty content');
  });

  it('should handle whitespace-only content', () => {
    expect(truncateContent('   ', 50)).toBe('Empty content');
  });

  it('should trim content before processing', () => {
    const content = '  Trimmed content  ';
    expect(truncateContent(content, 50)).toBe('Trimmed content');
  });
});

// ============================================================================
// Format Connection Count Tests
// ============================================================================

describe('formatConnectionCount', () => {
  it('should return "No connections" for zero', () => {
    expect(formatConnectionCount(0)).toBe('No connections');
  });

  it('should return "1 connection" for one', () => {
    expect(formatConnectionCount(1)).toBe('1 connection');
  });

  it('should return plural form for multiple connections', () => {
    expect(formatConnectionCount(2)).toBe('2 connections');
    expect(formatConnectionCount(10)).toBe('10 connections');
    expect(formatConnectionCount(100)).toBe('100 connections');
  });

  it('should handle negative numbers as no connections', () => {
    expect(formatConnectionCount(-1)).toBe('No connections');
    expect(formatConnectionCount(-10)).toBe('No connections');
  });
});

// ============================================================================
// Reduced Motion Preference Tests (Requirements: 13.2)
// ============================================================================

describe('prefersReducedMotion', () => {
  const originalWindow = global.window;
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });

  it('should return false when matchMedia is not available', () => {
    // Temporarily remove matchMedia
    const mockWindow = Object.assign({}, window, { matchMedia: undefined });
    vi.stubGlobal('window', mockWindow);

    expect(prefersReducedMotion()).toBe(false);

    vi.stubGlobal('window', originalWindow);
  });

  it('should return true when user prefers reduced motion', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    expect(prefersReducedMotion()).toBe(true);
  });

  it('should return false when user does not prefer reduced motion', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    expect(prefersReducedMotion()).toBe(false);
  });
});

// ============================================================================
// Subscribe to Reduced Motion Tests (Requirements: 13.2)
// ============================================================================

describe('subscribeToReducedMotion', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('should return cleanup function when matchMedia is not available', () => {
    const mockWindow = Object.assign({}, window, { matchMedia: undefined });
    vi.stubGlobal('window', mockWindow);

    const callback = vi.fn();
    const cleanup = subscribeToReducedMotion(callback);

    expect(typeof cleanup).toBe('function');
    cleanup(); // Should not throw

    vi.stubGlobal('window', window);
  });

  it('should add event listener for preference changes', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();

    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener,
    });

    const callback = vi.fn();
    subscribeToReducedMotion(callback);

    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should remove event listener on cleanup', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();

    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener,
    });

    const callback = vi.fn();
    const cleanup = subscribeToReducedMotion(callback);

    cleanup();

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should call callback when preference changes', () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;

    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn((_event: string, handler: (event: MediaQueryListEvent) => void) => {
        changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
    });

    const callback = vi.fn();
    subscribeToReducedMotion(callback);

    // Simulate preference change - changeHandler should be defined at this point
    expect(changeHandler).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (changeHandler === null) return;
    const handler = changeHandler as (event: MediaQueryListEvent) => void;
    handler({
      matches: true,
    } as MediaQueryListEvent);

    expect(callback).toHaveBeenCalledWith(true);
  });
});

// ============================================================================
// Animation Config Tests (Requirements: 13.2)
// ============================================================================

describe('getAnimationConfig', () => {
  it('should return disabled config when reduced motion is preferred', () => {
    const config = getAnimationConfig(true);

    expect(config.enabled).toBe(false);
    expect(config.durationMultiplier).toBe(0);
    expect(config.useTransitions).toBe(false);
  });

  it('should return enabled config when reduced motion is not preferred', () => {
    const config = getAnimationConfig(false);

    expect(config.enabled).toBe(true);
    expect(config.durationMultiplier).toBe(1);
    expect(config.useTransitions).toBe(true);
  });
});

// ============================================================================
// Contrast Ratio Tests (Requirements: 35.4)
// ============================================================================

import { getContrastRatio, meetsWCAGAA, meetsWCAGAAA } from '@utils/designTokenAudit';

describe('Contrast Ratio Audit', () => {
  describe('getContrastRatio', () => {
    it('should calculate correct contrast ratio for black and white', () => {
      // Black (#000000) and White (#FFFFFF) should have maximum contrast (21:1)
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should calculate correct contrast ratio for same colors', () => {
      // Same colors should have contrast ratio of 1:1
      const ratio = getContrastRatio('#FF0000', '#FF0000');
      expect(ratio).toBeCloseTo(1, 0);
    });

    it('should return 0 for invalid colors', () => {
      const ratio = getContrastRatio('invalid', '#FFFFFF');
      expect(ratio).toBe(0);
    });
  });

  describe('meetsWCAGAA', () => {
    it('should pass for white text on dark background', () => {
      // White (#FFFFFF) on dark background (#0a0a0f) should pass WCAG AA
      const passes = meetsWCAGAA('#FFFFFF', '#0a0a0f');
      expect(passes).toBe(true);
    });

    it('should pass for cyan accent on dark background', () => {
      // Cyan (#00FFFF) on dark background (#0a0a0f) should pass WCAG AA
      const passes = meetsWCAGAA('#00FFFF', '#0a0a0f');
      expect(passes).toBe(true);
    });

    it('should pass for gold accent on dark background', () => {
      // Gold (#FFD700) on dark background (#0a0a0f) should pass WCAG AA
      const passes = meetsWCAGAA('#FFD700', '#0a0a0f');
      expect(passes).toBe(true);
    });

    it('should fail for low contrast combinations', () => {
      // Dark gray on dark background should fail
      const passes = meetsWCAGAA('#333333', '#0a0a0f');
      expect(passes).toBe(false);
    });
  });

  describe('meetsWCAGAAA', () => {
    it('should pass for white text on dark background', () => {
      // White on dark background should pass WCAG AAA (7:1)
      const passes = meetsWCAGAAA('#FFFFFF', '#0a0a0f');
      expect(passes).toBe(true);
    });

    it('should pass for cyan accent on dark background', () => {
      // Cyan on dark background should pass WCAG AAA
      const passes = meetsWCAGAAA('#00FFFF', '#0a0a0f');
      expect(passes).toBe(true);
    });
  });
});

// ============================================================================
// Text Hierarchy Contrast Tests (Requirements: 32.6, 35.4)
// ============================================================================

describe('Text Hierarchy Contrast Audit', () => {
  const darkBackground = '#0a0a0f';

  it('should have sufficient contrast for primary text (100% white)', () => {
    const passes = meetsWCAGAA('#FFFFFF', darkBackground);
    expect(passes).toBe(true);
  });

  it('should have sufficient contrast for secondary text (70% white)', () => {
    // 70% white on dark background: rgba(255, 255, 255, 0.7) ≈ #B3B3B3
    // This is an approximation - actual contrast depends on blending
    const approximateColor = '#B3B3B3';
    const passes = meetsWCAGAA(approximateColor, darkBackground);
    expect(passes).toBe(true);
  });

  it('should have sufficient contrast for tertiary text (50% white)', () => {
    // 50% white on dark background: rgba(255, 255, 255, 0.5) ≈ #808080
    const approximateColor = '#808080';
    const passes = meetsWCAGAA(approximateColor, darkBackground);
    expect(passes).toBe(true);
  });
});
