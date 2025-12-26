/**
 * MemoryPreviewModal Component Tests
 *
 * Tests for the global memory preview modal component.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryPreviewModal } from "../../../components/hud/MemoryPreviewModal";
import { useMemoryStore } from "../../../stores/memoryStore";
import { useUIStore } from "../../../stores/uiStore";
import type { Memory } from "../../../types/api";

// Mock the API client
vi.mock("../../../api/client", () => ({
  getDefaultClient: (): unknown => ({
    updateMemory: vi.fn().mockResolvedValue({}),
    deleteMemory: vi.fn().mockResolvedValue({}),
  }),
  isDemoMemoryId: (id: string): boolean => id.startsWith("demo-"),
}));

// Test user credentials
const TEST_USER_ID = "test-user";
const TEST_SESSION_ID = "test-session";

// Sample memory for testing
const mockMemory: Memory = {
  id: "test-memory-1",
  content: "Test memory content",
  primarySector: "semantic",
  salience: 0.8,
  strength: 0.9,
  createdAt: "2024-01-01T00:00:00Z",
  lastAccessed: "2024-01-01T00:00:00Z",
  accessCount: 5,
  userId: "test-user",
  sessionId: "test-session",
  metadata: {
    tags: ["test", "memory"],
    keywords: ["testing"],
  },
};

// Reset store state before each test
beforeEach(() => {
  useUIStore.setState({
    isCleanMode: false,
    hoveredPanel: null,
    visiblePanels: new Set<string>(),
    memoryPreview: {
      isOpen: false,
      memory: null,
      mode: "view",
    },
  });
  useMemoryStore.setState({
    memories: [mockMemory],
    isLoading: false,
    error: null,
    lastFetchedAt: Date.now(),
    userId: "test-user",
    isUsingDemoData: false,
  });
});

describe("MemoryPreviewModal", () => {
  describe("Rendering", () => {
    it("should not render when modal is closed", () => {
      render(<MemoryPreviewModal userId={TEST_USER_ID} sessionId={TEST_SESSION_ID} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render when modal is open with a memory", () => {
      useUIStore.getState().openMemoryPreview(mockMemory);

      render(<MemoryPreviewModal userId={TEST_USER_ID} sessionId={TEST_SESSION_ID} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Test memory content")).toBeInTheDocument();
    });

    it("should display memory details in view mode", () => {
      useUIStore.getState().openMemoryPreview(mockMemory);

      render(<MemoryPreviewModal userId={TEST_USER_ID} sessionId={TEST_SESSION_ID} />);

      expect(screen.getByText("Memory Details")).toBeInTheDocument();
      expect(screen.getByText("Test memory content")).toBeInTheDocument();
      // Semantic is inside a span with emoji, use a more flexible matcher
      expect(screen.getAllByText(/Semantic/).length).toBeGreaterThan(0);
    });
  });

  describe("Modal Actions", () => {
    it("should close modal when close button is clicked", async () => {
      useUIStore.getState().openMemoryPreview(mockMemory);

      render(<MemoryPreviewModal userId={TEST_USER_ID} sessionId={TEST_SESSION_ID} />);

      // Get all close buttons and click the first one (the X button in header)
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      const closeButton = closeButtons[0];
      expect(closeButton).toBeDefined();
      if (closeButton) {
        fireEvent.click(closeButton);
      }

      await waitFor(() => {
        expect(useUIStore.getState().memoryPreview.isOpen).toBe(false);
      });
    });

    it("should close modal when Escape key is pressed", async () => {
      useUIStore.getState().openMemoryPreview(mockMemory);

      render(<MemoryPreviewModal userId={TEST_USER_ID} sessionId={TEST_SESSION_ID} />);

      fireEvent.keyDown(window, { key: "Escape" });

      await waitFor(() => {
        expect(useUIStore.getState().memoryPreview.isOpen).toBe(false);
      });
    });
  });

  describe("UIStore Memory Preview Actions", () => {
    it("should open memory preview with correct state", () => {
      useUIStore.getState().openMemoryPreview(mockMemory);

      const state = useUIStore.getState().memoryPreview;
      expect(state.isOpen).toBe(true);
      expect(state.memory).toEqual(mockMemory);
      expect(state.mode).toBe("view");
    });

    it("should close memory preview and reset state", () => {
      useUIStore.getState().openMemoryPreview(mockMemory);
      useUIStore.getState().closeMemoryPreview();

      const state = useUIStore.getState().memoryPreview;
      expect(state.isOpen).toBe(false);
      expect(state.memory).toBeNull();
      expect(state.mode).toBe("view");
    });

    it("should switch to edit mode", () => {
      useUIStore.getState().openMemoryPreview(mockMemory);
      useUIStore.getState().switchToEditMode();

      const state = useUIStore.getState().memoryPreview;
      expect(state.mode).toBe("edit");
    });

    it("should update previewed memory", () => {
      useUIStore.getState().openMemoryPreview(mockMemory);
      useUIStore.getState().updatePreviewedMemory({ content: "Updated content" });

      const state = useUIStore.getState().memoryPreview;
      expect(state.memory?.content).toBe("Updated content");
    });
  });
});
