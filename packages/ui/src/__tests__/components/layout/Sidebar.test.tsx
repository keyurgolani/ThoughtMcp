/**
 * Sidebar Component Tests
 *
 * Tests for the collapsible navigation sidebar component.
 * Requirements: 23.1, 23.3, 36.1
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Sidebar,
  type QuickStats,
  type RecentMemoryItem,
} from "../../../components/layout/Sidebar";
import { SidebarContext } from "../../../contexts/SidebarContext";

// ============================================================================
// Test Data
// ============================================================================

const mockQuickStats: QuickStats = {
  totalMemories: 150,
  totalConnections: 320,
  memoriesThisWeek: 12,
  hubNodes: 5,
};

const mockRecentMemories: RecentMemoryItem[] = [
  {
    id: "mem-1",
    contentPreview: "Neural networks architecture overview",
    primarySector: "semantic",
    lastAccessed: Date.now() - 1000 * 60 * 5, // 5 minutes ago
  },
  {
    id: "mem-2",
    contentPreview: "Yesterday I learned about transformers",
    primarySector: "episodic",
    lastAccessed: Date.now() - 1000 * 60 * 60, // 1 hour ago
  },
  {
    id: "mem-3",
    contentPreview: "Steps to train a model effectively",
    primarySector: "procedural",
    lastAccessed: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
  },
];

// ============================================================================
// Test Utilities
// ============================================================================

interface RenderSidebarOptions {
  collapsed?: boolean;
  currentRoute?: string;
  onNavigate?: (route: string) => void;
  quickStats?: QuickStats | undefined;
  recentMemories?: RecentMemoryItem[];
  onMemoryClick?: (memoryId: string) => void;
}

function renderSidebar(options: RenderSidebarOptions = {}): ReturnType<typeof render> {
  const {
    collapsed = false,
    currentRoute = "/explorer",
    onNavigate = vi.fn(),
    quickStats,
    recentMemories = [],
    onMemoryClick,
  } = options;

  return render(
    <SidebarContext.Provider
      value={{
        collapsed,
        currentRoute,
        onNavigate,
      }}
    >
      <Sidebar
        quickStats={quickStats}
        recentMemories={recentMemories}
        onMemoryClick={onMemoryClick}
      />
    </SidebarContext.Provider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("Sidebar", () => {
  describe("Navigation Links (Requirement 23.1)", () => {
    it("should render all navigation items", () => {
      renderSidebar();

      expect(
        screen.getByRole("button", { name: /navigate to memory explorer/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /navigate to reasoning console/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /navigate to framework analysis/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /navigate to problem decomposition/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /navigate to confidence & bias/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /navigate to emotion analysis/i })
      ).toBeInTheDocument();
    });

    it("should highlight the active navigation item", () => {
      renderSidebar({ currentRoute: "/reasoning" });

      const reasoningButton = screen.getByRole("button", {
        name: /navigate to reasoning console/i,
      });
      expect(reasoningButton).toHaveClass("bg-ui-accent-primary/15");
      expect(reasoningButton).toHaveAttribute("aria-current", "page");
    });

    it("should call onNavigate when a nav item is clicked", () => {
      const onNavigate = vi.fn();
      renderSidebar({ onNavigate });

      fireEvent.click(screen.getByRole("button", { name: /navigate to reasoning console/i }));
      expect(onNavigate).toHaveBeenCalledWith("/reasoning");
    });

    it("should show full labels when expanded", () => {
      renderSidebar({ collapsed: false });

      expect(screen.getByText("Memory Explorer")).toBeInTheDocument();
      expect(screen.getByText("Reasoning Console")).toBeInTheDocument();
    });

    it("should hide labels when collapsed", () => {
      renderSidebar({ collapsed: true });

      expect(screen.queryByText("Memory Explorer")).not.toBeInTheDocument();
      expect(screen.queryByText("Reasoning Console")).not.toBeInTheDocument();
    });
  });

  describe("Quick Stats Display", () => {
    it("should display quick stats when provided", () => {
      renderSidebar({ quickStats: mockQuickStats });

      expect(screen.getByText("150")).toBeInTheDocument();
      expect(screen.getByText("320")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("should show stat labels when expanded", () => {
      renderSidebar({ quickStats: mockQuickStats, collapsed: false });

      expect(screen.getByText("Memories")).toBeInTheDocument();
      expect(screen.getByText("Connections")).toBeInTheDocument();
      expect(screen.getByText("Hub Nodes")).toBeInTheDocument();
      expect(screen.getByText("This Week")).toBeInTheDocument();
    });

    it("should hide stat labels when collapsed", () => {
      renderSidebar({ quickStats: mockQuickStats, collapsed: true });

      expect(screen.queryByText("Memories")).not.toBeInTheDocument();
      expect(screen.queryByText("Connections")).not.toBeInTheDocument();
    });

    it("should not render stats section when quickStats is undefined", () => {
      renderSidebar({ quickStats: undefined });

      expect(screen.queryByText("Quick Stats")).not.toBeInTheDocument();
    });
  });

  describe("Recent Memories List (Requirement 23.3)", () => {
    it("should display recent memories", () => {
      renderSidebar({ recentMemories: mockRecentMemories });

      expect(screen.getByText(/neural networks architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/yesterday i learned/i)).toBeInTheDocument();
    });

    it("should call onMemoryClick when a memory is clicked", () => {
      const onMemoryClick = vi.fn();
      renderSidebar({ recentMemories: mockRecentMemories, onMemoryClick });

      fireEvent.click(screen.getByRole("button", { name: /navigate to memory: neural networks/i }));
      expect(onMemoryClick).toHaveBeenCalledWith("mem-1");
    });

    it("should show relative time for memories", () => {
      renderSidebar({ recentMemories: mockRecentMemories });

      expect(screen.getByText("5m ago")).toBeInTheDocument();
      expect(screen.getByText("1h ago")).toBeInTheDocument();
      expect(screen.getByText("1d ago")).toBeInTheDocument();
    });

    it("should limit displayed memories to maxRecentMemories", () => {
      const manyMemories = Array.from({ length: 10 }, (_, i) => ({
        id: `mem-${String(i)}`,
        contentPreview: `Memory ${String(i)}`,
        primarySector: "semantic",
        lastAccessed: Date.now() - i * 1000,
      }));

      renderSidebar({ recentMemories: manyMemories });

      // Default max is 5 - count only memory buttons (not nav buttons)
      const memoryButtons = screen.getAllByRole("button", { name: /navigate to memory: memory/i });
      expect(memoryButtons).toHaveLength(5);
    });

    it("should show empty state when no recent memories", () => {
      renderSidebar({ recentMemories: [], collapsed: false });

      expect(screen.getByText("No recent memories")).toBeInTheDocument();
    });

    it("should show only icons when collapsed", () => {
      renderSidebar({ recentMemories: mockRecentMemories, collapsed: true });

      // Should not show content preview text
      expect(screen.queryByText(/neural networks architecture/i)).not.toBeInTheDocument();
    });
  });

  describe("Collapsed State (Requirement 36.1)", () => {
    it("should show section headers when expanded", () => {
      renderSidebar({ collapsed: false, quickStats: mockQuickStats });

      expect(screen.getByText("Navigation")).toBeInTheDocument();
      expect(screen.getByText("Quick Stats")).toBeInTheDocument();
      expect(screen.getByText("Recent Memories")).toBeInTheDocument();
    });

    it("should hide section headers when collapsed", () => {
      renderSidebar({ collapsed: true, quickStats: mockQuickStats });

      expect(screen.queryByText("Navigation")).not.toBeInTheDocument();
      expect(screen.queryByText("Quick Stats")).not.toBeInTheDocument();
      expect(screen.queryByText("Recent Memories")).not.toBeInTheDocument();
    });

    it("should center nav items when collapsed", () => {
      renderSidebar({ collapsed: true });

      const navButtons = screen.getAllByRole("button", { name: /navigate to/i });
      navButtons.forEach((button) => {
        expect(button).toHaveClass("justify-center");
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper navigation landmark", () => {
      renderSidebar();

      expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeInTheDocument();
    });

    it("should have proper aria-labels on memory buttons", () => {
      renderSidebar({ recentMemories: mockRecentMemories });

      const memoryButtons = screen.getAllByRole("button", { name: /navigate to memory/i });
      expect(memoryButtons.length).toBeGreaterThan(0);
    });

    it("should show tooltips on collapsed nav items", () => {
      renderSidebar({ collapsed: true });

      const explorerButton = screen.getByRole("button", { name: /navigate to memory explorer/i });
      expect(explorerButton).toHaveAttribute("title", "Memory Explorer");
    });
  });
});
