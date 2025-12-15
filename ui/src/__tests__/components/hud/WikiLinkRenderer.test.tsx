/**
 * WikiLinkRenderer Component Tests
 *
 * Tests for the WikiLinkRenderer component that parses content
 * for wiki-style [[link]] syntax and renders them as clickable elements.
 *
 * Requirements: 41.3, 41.4
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  parseContentWithWikiLinks,
  parseWikiLinks,
  WikiLinkRenderer,
} from '../../../components/hud/WikiLinkRenderer';

// ============================================================================
// parseWikiLinks Tests
// ============================================================================

describe('parseWikiLinks', () => {
  it('should return empty array for content without wiki links', () => {
    const result = parseWikiLinks('Hello world, no links here');
    expect(result).toEqual([]);
  });

  it('should parse single wiki link with display text', () => {
    const content = 'Check out [[mem-123|My Memory]] for details';
    const result = parseWikiLinks(content);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      fullMatch: '[[mem-123|My Memory]]',
      memoryId: 'mem-123',
      displayText: 'My Memory',
      startIndex: 10,
      endIndex: 31,
    });
  });

  it('should parse wiki link without display text (uses memoryId)', () => {
    const content = 'See [[memory-456]] for more';
    const result = parseWikiLinks(content);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      fullMatch: '[[memory-456]]',
      memoryId: 'memory-456',
      displayText: 'memory-456',
      startIndex: 4,
      endIndex: 18,
    });
  });

  it('should parse multiple wiki links', () => {
    const content = 'Link to [[mem-1|First]] and [[mem-2|Second]]';
    const result = parseWikiLinks(content);

    expect(result).toHaveLength(2);
    expect(result[0]?.memoryId).toBe('mem-1');
    expect(result[0]?.displayText).toBe('First');
    expect(result[1]?.memoryId).toBe('mem-2');
    expect(result[1]?.displayText).toBe('Second');
  });

  it('should handle wiki links at start and end of content', () => {
    const content = '[[start|Start]] middle [[end|End]]';
    const result = parseWikiLinks(content);

    expect(result).toHaveLength(2);
    expect(result[0]?.startIndex).toBe(0);
    expect(result[1]?.displayText).toBe('End');
  });

  it('should skip empty memory IDs', () => {
    const content = 'Invalid [[|empty]] link';
    const result = parseWikiLinks(content);

    expect(result).toHaveLength(0);
  });

  it('should trim whitespace from memory ID and display text', () => {
    const content = 'Link [[ mem-123 | My Memory ]]';
    const result = parseWikiLinks(content);

    expect(result).toHaveLength(1);
    expect(result[0]?.memoryId).toBe('mem-123');
    expect(result[0]?.displayText).toBe('My Memory');
  });

  it('should handle UUIDs as memory IDs', () => {
    const content = '[[550e8400-e29b-41d4-a716-446655440000|UUID Memory]]';
    const result = parseWikiLinks(content);

    expect(result).toHaveLength(1);
    expect(result[0]?.memoryId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});

// ============================================================================
// parseContentWithWikiLinks Tests
// ============================================================================

describe('parseContentWithWikiLinks', () => {
  it('should return single text segment when no links', () => {
    const content = 'Plain text content';
    const result = parseContentWithWikiLinks(content, []);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'text', content: 'Plain text content' });
  });

  it('should split content around wiki link', () => {
    const content = 'Before [[mem-1|Link]] after';
    const links = parseWikiLinks(content);
    const result = parseContentWithWikiLinks(content, links);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: 'text', content: 'Before ' });
    expect(result[1]?.type).toBe('wikilink');
    expect(result[1]?.content).toBe('Link');
    expect(result[2]).toEqual({ type: 'text', content: ' after' });
  });

  it('should handle wiki link at start', () => {
    const content = '[[mem-1|Start]] rest of text';
    const links = parseWikiLinks(content);
    const result = parseContentWithWikiLinks(content, links);

    expect(result).toHaveLength(2);
    expect(result[0]?.type).toBe('wikilink');
    expect(result[1]?.type).toBe('text');
  });

  it('should handle wiki link at end', () => {
    const content = 'Text before [[mem-1|End]]';
    const links = parseWikiLinks(content);
    const result = parseContentWithWikiLinks(content, links);

    expect(result).toHaveLength(2);
    expect(result[0]?.type).toBe('text');
    expect(result[1]?.type).toBe('wikilink');
  });

  it('should handle adjacent wiki links', () => {
    const content = '[[mem-1|First]][[mem-2|Second]]';
    const links = parseWikiLinks(content);
    const result = parseContentWithWikiLinks(content, links);

    expect(result).toHaveLength(2);
    expect(result[0]?.type).toBe('wikilink');
    expect(result[0]?.content).toBe('First');
    expect(result[1]?.type).toBe('wikilink');
    expect(result[1]?.content).toBe('Second');
  });
});

// ============================================================================
// WikiLinkRenderer Component Tests
// ============================================================================

describe('WikiLinkRenderer', () => {
  it('should render plain content when no wiki links present', () => {
    render(<WikiLinkRenderer content="Hello world" />);

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('should render wiki link as clickable element', () => {
    const content = 'Check [[mem-123|My Memory]] here';

    render(<WikiLinkRenderer content={content} />);

    const linkElement = screen.getByRole('button', { name: /wiki link to memory: my memory/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('tabindex', '0');
  });

  it('should call onLinkClick when wiki link is clicked (Requirements: 41.4)', () => {
    const handleClick = vi.fn();
    const content = 'Click [[mem-123|My Memory]] to navigate';

    render(<WikiLinkRenderer content={content} onLinkClick={handleClick} />);

    const linkElement = screen.getByRole('button', { name: /wiki link to memory: my memory/i });
    fireEvent.click(linkElement);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith('mem-123');
  });

  it('should call onLinkClick on Enter key press', () => {
    const handleClick = vi.fn();
    const content = 'Press Enter on [[mem-123|My Memory]]';

    render(<WikiLinkRenderer content={content} onLinkClick={handleClick} />);

    const linkElement = screen.getByRole('button', { name: /wiki link to memory: my memory/i });
    fireEvent.keyDown(linkElement, { key: 'Enter' });

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith('mem-123');
  });

  it('should call onLinkClick on Space key press', () => {
    const handleClick = vi.fn();
    const content = 'Press Space on [[mem-123|My Memory]]';

    render(<WikiLinkRenderer content={content} onLinkClick={handleClick} />);

    const linkElement = screen.getByRole('button', { name: /wiki link to memory: my memory/i });
    fireEvent.keyDown(linkElement, { key: ' ' });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render multiple wiki links', () => {
    const content = 'Link [[mem-1|First]] and [[mem-2|Second]]';

    render(<WikiLinkRenderer content={content} />);

    expect(screen.getByRole('button', { name: /wiki link to memory: first/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /wiki link to memory: second/i })
    ).toBeInTheDocument();
  });

  it('should render text between wiki links', () => {
    const content = 'Before [[mem-1|Link]] after';

    render(<WikiLinkRenderer content={content} />);

    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('after')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <WikiLinkRenderer content="Hello [[mem-1|world]]" className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should have link icon in wiki link element', () => {
    const content = 'Check [[mem-123|My Memory]]';

    render(<WikiLinkRenderer content={content} />);

    const linkElement = screen.getByTestId('wiki-link');
    const svg = linkElement.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should handle wiki link without display text', () => {
    const content = 'See [[memory-456]] for details';

    render(<WikiLinkRenderer content={content} />);

    // Should use memory ID as display text
    const linkElement = screen.getByRole('button', { name: /wiki link to memory: memory-456/i });
    expect(linkElement).toBeInTheDocument();
  });

  it('should call onLinkHover when hovering wiki link', () => {
    const handleHover = vi.fn();
    const content = 'Hover [[mem-123|My Memory]]';

    render(<WikiLinkRenderer content={content} onLinkHover={handleHover} />);

    const linkElement = screen.getByRole('button', { name: /wiki link to memory: my memory/i });

    fireEvent.mouseEnter(linkElement);
    expect(handleHover).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryId: 'mem-123',
        displayText: 'My Memory',
      })
    );

    fireEvent.mouseLeave(linkElement);
    expect(handleHover).toHaveBeenCalledWith(null);
  });

  it('should not throw when handlers are undefined', () => {
    const content = 'Click [[mem-123|My Memory]]';

    render(<WikiLinkRenderer content={content} />);

    const linkElement = screen.getByRole('button', { name: /wiki link to memory: my memory/i });

    // Should not throw
    fireEvent.click(linkElement);
    fireEvent.mouseEnter(linkElement);
    fireEvent.mouseLeave(linkElement);
    fireEvent.keyDown(linkElement, { key: 'Enter' });
  });

  it('should apply cyan color to wiki links', () => {
    const content = 'Check [[mem-123|My Memory]]';

    render(<WikiLinkRenderer content={content} />);

    const linkElement = screen.getByTestId('wiki-link');
    expect(linkElement).toHaveStyle({ color: '#00FFFF' });
  });

  it('should apply high contrast color when enabled', () => {
    const content = 'Check [[mem-123|My Memory]]';

    render(<WikiLinkRenderer content={content} highContrast={true} />);

    const linkElement = screen.getByTestId('wiki-link');
    expect(linkElement).toHaveStyle({ color: '#00E5E5' });
  });
});
