/**
 * KeywordHighlighter Component Tests
 *
 * Tests for the KeywordHighlighter component that parses memory content
 * and highlights keywords that link to other memories.
 *
 * Requirements: 40.1, 40.4
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KeywordHighlighter } from "../../../components/hud/KeywordHighlighter";
import {
  getKeywordLinkColor,
  type LinkedKeyword,
  parseContentWithKeywords,
} from "../../../utils/highlightUtils";

// ============================================================================
// Test Data
// ============================================================================

const createKeyword = (
  text: string,
  startIndex: number,
  linkType: LinkedKeyword["linkType"] = "semantic",
  linkedMemoryIds: string[] = ["mem-1"]
): LinkedKeyword => ({
  text,
  startIndex,
  endIndex: startIndex + text.length,
  linkedMemoryIds,
  linkType,
});

// ============================================================================
// getKeywordLinkColor Tests
// ============================================================================

describe("getKeywordLinkColor", () => {
  it("should return cyan for semantic links in dark mode", () => {
    expect(getKeywordLinkColor("semantic")).toBe("#00FFFF");
  });

  it("should return orange for causal links in dark mode", () => {
    expect(getKeywordLinkColor("causal")).toBe("#FF8800");
  });

  it("should return green for temporal links in dark mode", () => {
    expect(getKeywordLinkColor("temporal")).toBe("#00FF88");
  });

  it("should return purple for analogical links in dark mode", () => {
    expect(getKeywordLinkColor("analogical")).toBe("#8800FF");
  });

  it("should return bold colors for light mode", () => {
    expect(getKeywordLinkColor("semantic", true)).toBe("#0077B6");
    expect(getKeywordLinkColor("causal", true)).toBe("#D62828");
    expect(getKeywordLinkColor("temporal", true)).toBe("#2D6A4F");
    expect(getKeywordLinkColor("analogical", true)).toBe("#7B2CBF");
  });

  it("should return consistent colors for the same link type", () => {
    const linkTypes: LinkedKeyword["linkType"][] = ["semantic", "causal", "temporal", "analogical"];
    for (const linkType of linkTypes) {
      const color1 = getKeywordLinkColor(linkType);
      const color2 = getKeywordLinkColor(linkType);
      expect(color1).toBe(color2);
    }
  });

  it("should return different colors in light mode vs dark mode", () => {
    const linkTypes: LinkedKeyword["linkType"][] = ["semantic", "causal", "temporal", "analogical"];
    for (const linkType of linkTypes) {
      const darkColor = getKeywordLinkColor(linkType, false);
      const lightColor = getKeywordLinkColor(linkType, true);
      expect(darkColor).not.toBe(lightColor);
    }
  });
});

// ============================================================================
// parseContentWithKeywords Tests
// ============================================================================

describe("parseContentWithKeywords", () => {
  it("should return single text segment when no keywords provided", () => {
    const content = "Hello world";
    const segments = parseContentWithKeywords(content, []);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ type: "text", content: "Hello world" });
  });

  it("should parse content with a single keyword", () => {
    const content = "Hello world test";
    const keywords = [createKeyword("world", 6)];
    const segments = parseContentWithKeywords(content, keywords);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({ type: "text", content: "Hello " });
    expect(segments[1]?.type).toBe("keyword");
    expect(segments[1]?.content).toBe("world");
    expect(segments[2]).toEqual({ type: "text", content: " test" });
  });

  it("should parse content with multiple keywords", () => {
    const content = "The quick brown fox";
    const keywords = [createKeyword("quick", 4), createKeyword("fox", 16)];
    const segments = parseContentWithKeywords(content, keywords);

    expect(segments).toHaveLength(4);
    expect(segments[0]).toEqual({ type: "text", content: "The " });
    expect(segments[1]?.type).toBe("keyword");
    expect(segments[1]?.content).toBe("quick");
    expect(segments[2]).toEqual({ type: "text", content: " brown " });
    expect(segments[3]?.type).toBe("keyword");
    expect(segments[3]?.content).toBe("fox");
  });

  it("should handle keyword at the start of content", () => {
    const content = "Hello world";
    const keywords = [createKeyword("Hello", 0)];
    const segments = parseContentWithKeywords(content, keywords);

    expect(segments).toHaveLength(2);
    expect(segments[0]?.type).toBe("keyword");
    expect(segments[0]?.content).toBe("Hello");
    expect(segments[1]).toEqual({ type: "text", content: " world" });
  });

  it("should handle keyword at the end of content", () => {
    const content = "Hello world";
    const keywords = [createKeyword("world", 6)];
    const segments = parseContentWithKeywords(content, keywords);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ type: "text", content: "Hello " });
    expect(segments[1]?.type).toBe("keyword");
    expect(segments[1]?.content).toBe("world");
  });

  it("should skip overlapping keywords", () => {
    const content = "Hello world test";
    // 'world' and 'world test' overlap - only first should be used
    const keywords = [createKeyword("world", 6), createKeyword("world test", 6)];
    const segments = parseContentWithKeywords(content, keywords);

    expect(segments).toHaveLength(3);
    expect(segments[1]?.type).toBe("keyword");
    expect(segments[1]?.content).toBe("world");
  });

  it("should skip keywords with invalid indices", () => {
    const content = "Hello world";
    const keywords = [
      createKeyword("invalid", -1), // Negative start
      createKeyword("world", 6), // Valid
      createKeyword("overflow", 100), // Beyond content length
    ];
    const segments = parseContentWithKeywords(content, keywords);

    expect(segments).toHaveLength(2);
    expect(segments[1]?.type).toBe("keyword");
    expect(segments[1]?.content).toBe("world");
  });

  it("should skip keywords where text does not match content", () => {
    const content = "Hello world";
    const keywords = [createKeyword("wrong", 6)]; // Position says 'world' but text says 'wrong'
    const segments = parseContentWithKeywords(content, keywords);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ type: "text", content: "Hello world" });
  });

  it("should handle case-insensitive keyword matching", () => {
    const content = "Hello WORLD";
    const keywords = [createKeyword("world", 6)]; // lowercase 'world' matches 'WORLD'
    const segments = parseContentWithKeywords(content, keywords);

    expect(segments).toHaveLength(2);
    expect(segments[1]?.type).toBe("keyword");
    expect(segments[1]?.content).toBe("WORLD"); // Preserves original case
  });

  it("should sort keywords by start index", () => {
    const content = "The quick brown fox";
    // Keywords provided out of order
    const keywords = [createKeyword("fox", 16), createKeyword("quick", 4)];
    const segments = parseContentWithKeywords(content, keywords);

    expect(segments).toHaveLength(4);
    expect(segments[1]?.content).toBe("quick");
    expect(segments[3]?.content).toBe("fox");
  });
});

// ============================================================================
// KeywordHighlighter Component Tests
// ============================================================================

describe("KeywordHighlighter", () => {
  it("should render plain content when no keywords provided", () => {
    render(<KeywordHighlighter content="Hello world" linkedKeywords={[]} />);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("should render highlighted keywords with correct styling", () => {
    const content = "Hello world test";
    const keywords = [createKeyword("world", 6, "semantic")];

    render(<KeywordHighlighter content={content} linkedKeywords={keywords} />);

    const keywordElement = screen.getByRole("button", { name: /linked keyword: world/i });
    expect(keywordElement).toBeInTheDocument();
    expect(keywordElement).toHaveStyle({ color: "#00FFFF" });
    expect(keywordElement).toHaveStyle({ textDecoration: "underline" });
  });

  it("should apply correct color for causal links", () => {
    const content = "Hello world test";
    const keywords = [createKeyword("world", 6, "causal")];

    render(<KeywordHighlighter content={content} linkedKeywords={keywords} />);

    const keywordElement = screen.getByRole("button", { name: /linked keyword: world/i });
    expect(keywordElement).toHaveStyle({ color: "#FF8800" });
  });

  it("should call onKeywordClick when keyword is clicked", () => {
    const content = "Hello world test";
    const keywords = [createKeyword("world", 6)];
    const handleClick = vi.fn();

    render(
      <KeywordHighlighter
        content={content}
        linkedKeywords={keywords}
        onKeywordClick={handleClick}
      />
    );

    const keywordElement = screen.getByRole("button", { name: /linked keyword: world/i });
    fireEvent.click(keywordElement);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(keywords[0]);
  });

  it("should call onKeywordHover on mouse enter and leave", () => {
    const content = "Hello world test";
    const keywords = [createKeyword("world", 6)];
    const handleHover = vi.fn();

    render(
      <KeywordHighlighter
        content={content}
        linkedKeywords={keywords}
        onKeywordHover={handleHover}
      />
    );

    const keywordElement = screen.getByRole("button", { name: /linked keyword: world/i });

    fireEvent.mouseEnter(keywordElement);
    expect(handleHover).toHaveBeenCalledWith(keywords[0]);

    fireEvent.mouseLeave(keywordElement);
    expect(handleHover).toHaveBeenCalledWith(null);
  });

  it("should support keyboard navigation", () => {
    const content = "Hello world test";
    const keywords = [createKeyword("world", 6)];
    const handleClick = vi.fn();

    render(
      <KeywordHighlighter
        content={content}
        linkedKeywords={keywords}
        onKeywordClick={handleClick}
      />
    );

    const keywordElement = screen.getByRole("button", { name: /linked keyword: world/i });

    // Test Enter key
    fireEvent.keyDown(keywordElement, { key: "Enter" });
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Test Space key
    fireEvent.keyDown(keywordElement, { key: " " });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it("should have correct ARIA label with connection count", () => {
    const content = "Hello world test";
    const keywords = [createKeyword("world", 6, "semantic", ["mem-1", "mem-2", "mem-3"])];

    render(<KeywordHighlighter content={content} linkedKeywords={keywords} />);

    const keywordElement = screen.getByRole("button", {
      name: /linked keyword: world\. 3 connections\. press enter to navigate\./i,
    });
    expect(keywordElement).toBeInTheDocument();
  });

  it("should handle singular connection in ARIA label", () => {
    const content = "Hello world test";
    const keywords = [createKeyword("world", 6, "semantic", ["mem-1"])];

    render(<KeywordHighlighter content={content} linkedKeywords={keywords} />);

    const keywordElement = screen.getByRole("button", {
      name: /linked keyword: world\. 1 connection\. press enter to navigate\./i,
    });
    expect(keywordElement).toBeInTheDocument();
  });

  it("should render multiple keywords with different link types", () => {
    const content = "The quick brown fox";
    const keywords = [createKeyword("quick", 4, "semantic"), createKeyword("fox", 16, "causal")];

    render(<KeywordHighlighter content={content} linkedKeywords={keywords} />);

    const quickElement = screen.getByRole("button", { name: /linked keyword: quick/i });
    const foxElement = screen.getByRole("button", { name: /linked keyword: fox/i });

    expect(quickElement).toHaveStyle({ color: "#00FFFF" }); // Semantic = cyan
    expect(foxElement).toHaveStyle({ color: "#FF8800" }); // Causal = orange
  });

  it("should apply custom className", () => {
    const { container } = render(
      <KeywordHighlighter content="Hello world" linkedKeywords={[]} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should work without click and hover handlers", () => {
    const content = "Hello world test";
    const keywords = [createKeyword("world", 6)];

    // Should not throw when handlers are undefined
    render(<KeywordHighlighter content={content} linkedKeywords={keywords} />);

    const keywordElement = screen.getByRole("button", { name: /linked keyword: world/i });

    // These should not throw
    fireEvent.click(keywordElement);
    fireEvent.mouseEnter(keywordElement);
    fireEvent.mouseLeave(keywordElement);
  });

  // ============================================================================
  // Multi-Connection Badge Tests (Requirements: 40.5)
  // ============================================================================

  describe("Multi-Connection Badge", () => {
    it("should show count badge for keywords with multiple connections", () => {
      const content = "Hello world test";
      const keywords = [createKeyword("world", 6, "semantic", ["mem-1", "mem-2", "mem-3"])];

      render(<KeywordHighlighter content={content} linkedKeywords={keywords} />);

      const badge = screen.getByTestId("multi-connection-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("3");
    });

    it("should not show badge for keywords with single connection", () => {
      const content = "Hello world test";
      const keywords = [createKeyword("world", 6, "semantic", ["mem-1"])];

      render(<KeywordHighlighter content={content} linkedKeywords={keywords} />);

      expect(screen.queryByTestId("multi-connection-badge")).not.toBeInTheDocument();
    });

    it("should not show badge for keywords with exactly 2 connections", () => {
      const content = "Hello world test";
      const keywords = [createKeyword("world", 6, "semantic", ["mem-1", "mem-2"])];

      render(<KeywordHighlighter content={content} linkedKeywords={keywords} />);

      const badge = screen.getByTestId("multi-connection-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("2");
    });

    it("should style badge with link type color", () => {
      const content = "Hello world test";
      const keywords = [createKeyword("world", 6, "causal", ["mem-1", "mem-2", "mem-3"])];

      render(<KeywordHighlighter content={content} linkedKeywords={keywords} />);

      const badge = screen.getByTestId("multi-connection-badge");
      expect(badge).toHaveStyle({ color: "#FF8800" }); // Causal = orange
    });

    it("should show badges for multiple keywords with multiple connections", () => {
      const content = "The quick brown fox";
      const keywords = [
        createKeyword("quick", 4, "semantic", ["mem-1", "mem-2"]),
        createKeyword("fox", 16, "causal", ["mem-3", "mem-4", "mem-5"]),
      ];

      render(<KeywordHighlighter content={content} linkedKeywords={keywords} />);

      const badges = screen.getAllByTestId("multi-connection-badge");
      expect(badges).toHaveLength(2);
      expect(badges[0]).toHaveTextContent("2");
      expect(badges[1]).toHaveTextContent("3");
    });

    it("should have aria-hidden on badge for accessibility", () => {
      const content = "Hello world test";
      const keywords = [createKeyword("world", 6, "semantic", ["mem-1", "mem-2"])];

      render(<KeywordHighlighter content={content} linkedKeywords={keywords} />);

      const badge = screen.getByTestId("multi-connection-badge");
      expect(badge).toHaveAttribute("aria-hidden", "true");
    });
  });
});
