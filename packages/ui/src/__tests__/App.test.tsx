import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// Mock CreateMemoryModal
vi.mock("../components/hud/CreateMemoryModal", () => ({
  CreateMemoryModal: function MockCreateMemoryModal({
    isOpen,
  }: {
    isOpen: boolean;
  }): React.ReactElement | null {
    if (!isOpen) return null;
    return <div data-testid="create-memory-modal">Create Memory Modal</div>;
  },
  default: function MockCreateMemoryModal({
    isOpen,
  }: {
    isOpen: boolean;
  }): React.ReactElement | null {
    if (!isOpen) return null;
    return <div data-testid="create-memory-modal">Create Memory Modal</div>;
  },
}));

// Mock CompactStatsBar
vi.mock("../components/hud/CompactStatsBar", () => ({
  CompactStatsBar: function MockCompactStatsBar(): React.ReactElement {
    return <div data-testid="compact-stats-bar">Stats</div>;
  },
}));

// Mock RecentMemoriesMasonry
vi.mock("../components/hud/RecentMemoriesMasonry", () => ({
  RecentMemoriesMasonry: function MockRecentMemoriesMasonry({
    memories,
    onMemoryClick,
  }: {
    memories: Array<{ id: string; content: string }>;
    onMemoryClick?: (id: string) => void;
  }): React.ReactElement {
    return (
      <div data-testid="recent-memories-masonry">
        {memories.map((m) => (
          <button key={m.id} onClick={() => onMemoryClick?.(m.id)}>
            {m.content}
          </button>
        ))}
        {memories.length === 0 && <div>No memories yet</div>}
      </div>
    );
  },
}));

import { Dashboard } from "../scenes";
import type { Memory } from "../types/api";

const TEST_USER_ID = "test-user";
const TEST_SESSION_ID = "test-session";

// mockStats removed as it was unused

const mockAvailableMemories: Memory[] = [
  {
    id: "mem-1",
    content: "First memory",
    primarySector: "semantic",
    salience: 0.8,
    strength: 0.9,
    accessCount: 1,
    userId: TEST_USER_ID,
    sessionId: TEST_SESSION_ID,
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
    metadata: {},
  },
];

describe("Dashboard", () => {
  it("renders the main dashboard sections", () => {
    render(
      <MemoryRouter>
        <Dashboard userId={TEST_USER_ID} sessionId={TEST_SESSION_ID} />
      </MemoryRouter>
    );
    expect(screen.getByTestId("compact-stats-bar")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Recent Memories/i })).toBeInTheDocument();
    expect(screen.getByTestId("recent-memories-masonry")).toBeInTheDocument();
    expect(screen.getByLabelText("Create new memory")).toBeInTheDocument();
  });

  it("opens CreateMemoryModal when New Memory button is clicked", () => {
    render(
      <MemoryRouter>
        <Dashboard userId={TEST_USER_ID} sessionId={TEST_SESSION_ID} />
      </MemoryRouter>
    );

    const newMemoryBtn = screen.getByLabelText("Create new memory");
    fireEvent.click(newMemoryBtn);

    expect(screen.getByTestId("create-memory-modal")).toBeInTheDocument();
  });

  it("renders recent memories", () => {
    render(
      <MemoryRouter>
        <Dashboard
          userId={TEST_USER_ID}
          sessionId={TEST_SESSION_ID}
          availableMemories={mockAvailableMemories}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("First memory")).toBeInTheDocument();
  });
});
