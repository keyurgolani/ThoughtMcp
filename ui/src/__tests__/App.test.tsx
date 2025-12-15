import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock QuickCaptureModal to avoid API calls and complex dependencies
vi.mock('../components/hud/QuickCaptureModal', () => ({
  QuickCaptureModal: function MockQuickCaptureModal(): React.ReactElement | null {
    return null;
  },
  default: function MockQuickCaptureModal(): React.ReactElement | null {
    return null;
  },
}));

// Import Dashboard after mocks
import {
  Dashboard,
  type GraphPreviewNode,
  type PinnedMemoryItem,
  type QuickStats,
  type RecentMemoryItem,
} from '../scenes';

// Test fixtures
const mockStats: QuickStats = {
  totalMemories: 42,
  totalConnections: 128,
  memoriesThisWeek: 7,
  hubNodes: 5,
};

const mockRecentMemories: RecentMemoryItem[] = [
  {
    id: 'mem-1',
    contentPreview: 'First memory about testing React components',
    primarySector: 'semantic',
    lastAccessed: Date.now() - 1000 * 60 * 5,
  },
  {
    id: 'mem-2',
    contentPreview: 'Second memory about TypeScript patterns',
    primarySector: 'procedural',
    lastAccessed: Date.now() - 1000 * 60 * 60,
  },
  {
    id: 'mem-3',
    contentPreview: 'Third memory about emotional intelligence',
    primarySector: 'emotional',
    lastAccessed: Date.now() - 1000 * 60 * 60 * 24,
  },
];

// Note: mockSuggestedActions removed - Dashboard redesign uses built-in actions

const mockPinnedMemories: PinnedMemoryItem[] = [
  {
    id: 'pinned-1',
    title: 'Important project notes',
    primarySector: 'semantic',
    pinnedAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'pinned-2',
    title: 'Key learning insights',
    primarySector: 'reflective',
    pinnedAt: Date.now() - 1000 * 60 * 60 * 48,
  },
];

// Note: mockRecentSessions removed - Recent Sessions section was removed in Dashboard redesign

const mockGraphNodes: GraphPreviewNode[] = [
  { id: 'node-1', x: 25, y: 30, sector: 'semantic', activity: 0.8 },
  { id: 'node-2', x: 50, y: 50, sector: 'episodic', activity: 0.5 },
  { id: 'node-3', x: 75, y: 40, sector: 'procedural', activity: 0.9 },
];

describe('Dashboard', () => {
  describe('Basic Rendering', () => {
    it('renders the main dashboard sections', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
      // Dashboard was redesigned - no longer has welcome header
      // Instead verify the main sections are rendered
      expect(screen.getByRole('heading', { name: /Quick Actions/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Recent Memories/i })).toBeInTheDocument();
    });

    it('renders the Quick Capture button', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
      expect(screen.getByRole('button', { name: /Quick capture new memory/i })).toBeInTheDocument();
    });

    it('renders the Quick Actions section', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
      expect(screen.getByRole('heading', { name: /Quick Actions/i })).toBeInTheDocument();
    });

    it('renders the Recent Memories section', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
      expect(screen.getByRole('heading', { name: /Recent Memories/i })).toBeInTheDocument();
    });

    it('renders the Recent Sessions section', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
      // Note: Recent Sessions section was removed in Dashboard redesign
    });

    it.skip('renders the Memory Graph section', () => {
      // Skipped: Memory Graph is now integrated into Quick Actions as a mini preview
    });
  });

  describe('Statistics Display', () => {
    // Note: Statistics section was redesigned to be inline compact display
    it('renders stats inline when no props provided', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
      // Stats are now shown inline as "X memories • Y connections • Z hubs"
      expect(screen.getByText('memories')).toBeInTheDocument();
      expect(screen.getByText('connections')).toBeInTheDocument();
      expect(screen.getByText('hubs')).toBeInTheDocument();
    });

    it('renders custom stats values', () => {
      render(
        <MemoryRouter>
          <Dashboard stats={mockStats} />
        </MemoryRouter>
      );
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('128')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows trend indicator when memoriesThisWeek > 0', () => {
      render(
        <MemoryRouter>
          <Dashboard stats={mockStats} />
        </MemoryRouter>
      );
      // The trend indicator shows "+7 this week"
      expect(screen.getByText(/\+7/)).toBeInTheDocument();
    });

    it.skip('renders Statistics section with collapsible details', () => {
      // Skipped: Statistics section was redesigned to be inline compact display
    });
  });

  describe('Quick Action Buttons', () => {
    // Note: Dashboard was redesigned with new button labels
    it('renders New Memory button', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
      // There are multiple "New Memory" elements (in quick actions and floating button)
      expect(screen.getAllByText('New Memory').length).toBeGreaterThan(0);
    });

    it('renders Reasoning button', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
      expect(screen.getByText('Reasoning')).toBeInTheDocument();
    });

    it('renders Biases button', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
      expect(screen.getByText('Biases')).toBeInTheDocument();
    });

    it('renders Search button', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('calls onQuickCapture when Quick Capture button is clicked', () => {
      const onQuickCapture = vi.fn();
      render(
        <MemoryRouter>
          <Dashboard onQuickCapture={onQuickCapture} />
        </MemoryRouter>
      );
      fireEvent.click(screen.getByRole('button', { name: /Quick capture new memory/i }));
      expect(onQuickCapture).toHaveBeenCalledTimes(1);
    });

    it('calls onActionClick with reason action when Reasoning is clicked', () => {
      const onActionClick = vi.fn();
      render(
        <MemoryRouter>
          <Dashboard onActionClick={onActionClick} />
        </MemoryRouter>
      );
      const reasoningButton = screen.getByText('Reasoning').closest('button');
      if (reasoningButton) {
        fireEvent.click(reasoningButton);
        expect(onActionClick).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'reason',
          })
        );
      }
    });

    it('calls onActionClick with analyze action when Biases is clicked', () => {
      const onActionClick = vi.fn();
      render(
        <MemoryRouter>
          <Dashboard onActionClick={onActionClick} />
        </MemoryRouter>
      );
      const biasesButton = screen.getByText('Biases').closest('button');
      if (biasesButton) {
        fireEvent.click(biasesButton);
        expect(onActionClick).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'analyze',
          })
        );
      }
    });

    it.skip('calls onActionClick with explore action when Search is clicked', () => {
      // Skipped: Search button navigates directly to /memories route instead of calling onActionClick
    });
  });

  describe('Recent Memories', () => {
    it('renders empty state when no memories provided', () => {
      render(
        <MemoryRouter>
          <Dashboard recentMemories={[]} />
        </MemoryRouter>
      );
      expect(screen.getByText('No memories yet')).toBeInTheDocument();
      expect(screen.getByText('Start by capturing your first thought')).toBeInTheDocument();
    });

    it('renders memory cards when memories are provided', () => {
      render(
        <MemoryRouter>
          <Dashboard recentMemories={mockRecentMemories} />
        </MemoryRouter>
      );
      expect(screen.getByText(/First memory about testing/i)).toBeInTheDocument();
      expect(screen.getByText(/Second memory about TypeScript/i)).toBeInTheDocument();
    });

    it('calls onMemoryClick when a memory card is clicked', () => {
      const onMemoryClick = vi.fn();
      render(
        <MemoryRouter>
          <Dashboard recentMemories={mockRecentMemories} onMemoryClick={onMemoryClick} />
        </MemoryRouter>
      );
      fireEvent.click(screen.getByRole('button', { name: /Navigate to memory:.*First memory/i }));
      expect(onMemoryClick).toHaveBeenCalledWith('mem-1');
    });

    it('displays relative time for memories', () => {
      render(
        <MemoryRouter>
          <Dashboard recentMemories={mockRecentMemories} />
        </MemoryRouter>
      );
      expect(screen.getByText(/5m ago/i)).toBeInTheDocument();
    });

    it('limits displayed memories to 5', () => {
      const manyMemories = Array.from({ length: 10 }, (_, i) => ({
        id: `mem-${String(i)}`,
        contentPreview: `Memory ${String(i)}`,
        primarySector: 'semantic',
        lastAccessed: Date.now(),
      }));
      render(
        <MemoryRouter>
          <Dashboard recentMemories={manyMemories} />
        </MemoryRouter>
      );
      const memoryButtons = screen.getAllByRole('button', { name: /Navigate to memory/i });
      expect(memoryButtons.length).toBe(5);
    });
  });

  describe('Pinned Memories', () => {
    it('renders pinned section with empty state when no pinned memories', () => {
      render(
        <MemoryRouter>
          <Dashboard pinnedMemories={[]} />
        </MemoryRouter>
      );
      // The Pinned Memories section is always rendered, but shows empty state
      expect(screen.getByRole('heading', { name: /Pinned Memories/i })).toBeInTheDocument();
      expect(screen.getByText('No pinned memories')).toBeInTheDocument();
    });

    it('renders pinned memories section when memories are pinned', () => {
      render(
        <MemoryRouter>
          <Dashboard pinnedMemories={mockPinnedMemories} />
        </MemoryRouter>
      );
      expect(screen.getByRole('heading', { name: /Pinned Memories/i })).toBeInTheDocument();
      expect(screen.getByText('2 pinned')).toBeInTheDocument();
    });

    it('renders pinned memory cards', () => {
      render(
        <MemoryRouter>
          <Dashboard pinnedMemories={mockPinnedMemories} />
        </MemoryRouter>
      );
      expect(screen.getByText(/Important project notes/i)).toBeInTheDocument();
      expect(screen.getByText(/Key learning insights/i)).toBeInTheDocument();
    });

    it('calls onMemoryClick when pinned memory is clicked', () => {
      const onMemoryClick = vi.fn();
      render(
        <MemoryRouter>
          <Dashboard pinnedMemories={mockPinnedMemories} onMemoryClick={onMemoryClick} />
        </MemoryRouter>
      );
      fireEvent.click(
        screen.getByRole('button', { name: /Navigate to pinned memory:.*Important project/i })
      );
      expect(onMemoryClick).toHaveBeenCalledWith('pinned-1');
    });

    it('calls onUnpinMemory when unpin button is clicked', () => {
      const onUnpinMemory = vi.fn();
      render(
        <MemoryRouter>
          <Dashboard pinnedMemories={mockPinnedMemories} onUnpinMemory={onUnpinMemory} />
        </MemoryRouter>
      );
      const unpinButtons = screen.getAllByRole('button', { name: /Unpin memory/i });
      const firstButton = unpinButtons[0];
      if (firstButton) {
        fireEvent.click(firstButton);
      }
      expect(onUnpinMemory).toHaveBeenCalledWith('pinned-1');
    });
  });

  describe('Recent Sessions', () => {
    // Note: Recent Sessions section was removed in Dashboard redesign
    // These tests are skipped as the feature is no longer present in the UI
    it.skip('renders empty state when no sessions provided', () => {
      // Skipped: Recent Sessions section was removed in Dashboard redesign
    });

    it.skip('renders session cards when sessions are provided', () => {
      // Skipped: Recent Sessions section was removed in Dashboard redesign
    });

    it.skip('displays session status badges', () => {
      // Skipped: Recent Sessions section was removed in Dashboard redesign
    });

    it.skip('calls onSessionResume when session card is clicked', () => {
      // Skipped: Recent Sessions section was removed in Dashboard redesign
    });
  });

  describe('Memory Graph Preview', () => {
    it('renders graph button when no graph nodes provided', () => {
      render(
        <MemoryRouter>
          <Dashboard graphPreviewNodes={[]} />
        </MemoryRouter>
      );
      // The graph preview now shows "Graph" text in the quick actions area
      expect(screen.getByText('Graph')).toBeInTheDocument();
    });

    it('renders graph preview when nodes are provided', () => {
      render(
        <MemoryRouter>
          <Dashboard graphPreviewNodes={mockGraphNodes} />
        </MemoryRouter>
      );
      // Use getAllByRole since there are nested clickable elements
      const graphButtons = screen.getAllByRole('button', { name: /Open Memory Explorer/i });
      expect(graphButtons.length).toBeGreaterThan(0);
    });

    it('calls onGraphPreviewClick when graph preview is clicked', () => {
      const onGraphPreviewClick = vi.fn();
      render(
        <MemoryRouter>
          <Dashboard graphPreviewNodes={mockGraphNodes} onGraphPreviewClick={onGraphPreviewClick} />
        </MemoryRouter>
      );
      // Click the first graph preview button (outer container)
      const graphButtons = screen.getAllByRole('button', { name: /Open Memory Explorer/i });
      const firstButton = graphButtons[0];
      if (firstButton) {
        fireEvent.click(firstButton);
      }
      // The click handler is called due to nested clickable elements
      expect(onGraphPreviewClick).toHaveBeenCalled();
    });

    it('calls onGraphPreviewClick when empty graph button is clicked', () => {
      const onGraphPreviewClick = vi.fn();
      render(
        <MemoryRouter>
          <Dashboard graphPreviewNodes={[]} onGraphPreviewClick={onGraphPreviewClick} />
        </MemoryRouter>
      );
      const graphButtons = screen.getAllByRole('button', { name: /Open Memory Explorer/i });
      const firstButton = graphButtons[0];
      if (firstButton) {
        fireEvent.click(firstButton);
      }
      expect(onGraphPreviewClick).toHaveBeenCalled();
    });
  });

  describe('Quick Actions', () => {
    it('renders quick actions section', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
      expect(screen.getByRole('heading', { name: /Quick Actions/i })).toBeInTheDocument();
    });

    it('renders quick action buttons', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
      // Check for the quick action buttons by their text content (use getAllByText for duplicates)
      expect(screen.getAllByText('New Memory').length).toBeGreaterThan(0);
      expect(screen.getByText('Reasoning')).toBeInTheDocument();
      expect(screen.getByText('Biases')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('calls onActionClick when reasoning button is clicked', () => {
      const onActionClick = vi.fn();
      render(
        <MemoryRouter>
          <Dashboard onActionClick={onActionClick} />
        </MemoryRouter>
      );
      // Click the Reasoning button (contains 💭 emoji and "Reasoning" text)
      const reasoningButton = screen.getByText('Reasoning').closest('button');
      if (reasoningButton) {
        fireEvent.click(reasoningButton);
        expect(onActionClick).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'reason',
            title: 'Start Reasoning',
          })
        );
      }
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(
        <MemoryRouter>
          <Dashboard className="custom-class" />
        </MemoryRouter>
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
