/**
 * EdgeHoverZones Component Tests
 *
 * Tests for the EdgeHoverZones component that detects mouse position
 * near screen edges and shows panels accordingly.
 *
 * Requirements: 46.2
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeHoverZones, type EdgePanelMapping } from '../../components/hud/EdgeHoverZones';
import { useUIStore } from '../../stores/uiStore';

// Mock the UI store
vi.mock('../../stores/uiStore', () => ({
  useUIStore: vi.fn(),
}));

describe('EdgeHoverZones', () => {
  const mockShowPanel = vi.fn();
  const mockHidePanel = vi.fn();
  const mockSetHoveredPanel = vi.fn();

  const defaultPanelMappings: EdgePanelMapping[] = [
    { panelId: 'search-panel', edge: 'top' },
    { panelId: 'related-panel', edge: 'right' },
    { panelId: 'ai-tools', edge: 'bottom' },
    { panelId: 'tag-panel', edge: 'left' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default mock implementation - clean mode enabled
    (useUIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          isCleanMode: true,
          showPanel: mockShowPanel,
          hidePanel: mockHidePanel,
          setHoveredPanel: mockSetHoveredPanel,
        };
        return selector(state);
      }
    );

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render children', () => {
      render(
        <EdgeHoverZones panelMappings={defaultPanelMappings}>
          <div data-testid="child-content">Test Content</div>
        </EdgeHoverZones>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <EdgeHoverZones panelMappings={defaultPanelMappings} className="custom-class" />
      );

      const wrapper = container.querySelector('.edge-hover-zones');
      expect(wrapper).toHaveClass('custom-class');
    });

    it('should set data-clean-mode attribute', () => {
      const { container } = render(<EdgeHoverZones panelMappings={defaultPanelMappings} />);

      const wrapper = container.querySelector('.edge-hover-zones');
      expect(wrapper).toHaveAttribute('data-clean-mode', 'true');
    });
  });

  describe('Edge Detection (Requirement 46.2)', () => {
    it('should detect top edge hover and show panel', () => {
      render(<EdgeHoverZones panelMappings={defaultPanelMappings} showDelay={50} />);

      // Simulate mouse move to top edge (y = 20, within default 40px edge width)
      act(() => {
        fireEvent.mouseMove(window, { clientX: 500, clientY: 20 });
      });

      // Wait for show delay
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockShowPanel).toHaveBeenCalledWith('search-panel');
    });

    it('should detect right edge hover and show panel', () => {
      render(<EdgeHoverZones panelMappings={defaultPanelMappings} showDelay={50} />);

      // Simulate mouse move to right edge (x = 1900, within 40px of 1920 width)
      act(() => {
        fireEvent.mouseMove(window, { clientX: 1900, clientY: 500 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockShowPanel).toHaveBeenCalledWith('related-panel');
    });

    it('should detect bottom edge hover and show panel', () => {
      render(<EdgeHoverZones panelMappings={defaultPanelMappings} showDelay={50} />);

      // Simulate mouse move to bottom edge (y = 1060, within 40px of 1080 height)
      act(() => {
        fireEvent.mouseMove(window, { clientX: 500, clientY: 1060 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockShowPanel).toHaveBeenCalledWith('ai-tools');
    });

    it('should detect left edge hover and show panel', () => {
      render(<EdgeHoverZones panelMappings={defaultPanelMappings} showDelay={50} />);

      // Simulate mouse move to left edge (x = 20, within default 40px edge width)
      act(() => {
        fireEvent.mouseMove(window, { clientX: 20, clientY: 500 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockShowPanel).toHaveBeenCalledWith('tag-panel');
    });

    it('should hide panel when leaving edge zone', () => {
      render(
        <EdgeHoverZones panelMappings={defaultPanelMappings} showDelay={50} hideDelay={100} />
      );

      // Move to top edge
      act(() => {
        fireEvent.mouseMove(window, { clientX: 500, clientY: 20 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockShowPanel).toHaveBeenCalledWith('search-panel');

      // Move away from edge
      act(() => {
        fireEvent.mouseMove(window, { clientX: 500, clientY: 500 });
      });

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(mockHidePanel).toHaveBeenCalledWith('search-panel');
    });
  });

  describe('Clean Mode Integration', () => {
    it('should not detect edges when clean mode is disabled', () => {
      // Mock clean mode disabled
      (useUIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            isCleanMode: false,
            showPanel: mockShowPanel,
            hidePanel: mockHidePanel,
            setHoveredPanel: mockSetHoveredPanel,
          };
          return selector(state);
        }
      );

      render(<EdgeHoverZones panelMappings={defaultPanelMappings} showDelay={50} />);

      // Simulate mouse move to top edge
      act(() => {
        fireEvent.mouseMove(window, { clientX: 500, clientY: 20 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockShowPanel).not.toHaveBeenCalled();
    });

    it('should not detect edges when enabled prop is false', () => {
      render(
        <EdgeHoverZones panelMappings={defaultPanelMappings} enabled={false} showDelay={50} />
      );

      // Simulate mouse move to top edge
      act(() => {
        fireEvent.mouseMove(window, { clientX: 500, clientY: 20 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockShowPanel).not.toHaveBeenCalled();
    });
  });

  describe('Configurable Options', () => {
    it('should respect custom edge width', () => {
      render(
        <EdgeHoverZones panelMappings={defaultPanelMappings} edgeWidth={100} showDelay={50} />
      );

      // Move to position that would be outside default 40px but inside 100px
      act(() => {
        fireEvent.mouseMove(window, { clientX: 500, clientY: 80 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockShowPanel).toHaveBeenCalledWith('search-panel');
    });

    it('should respect custom show delay', () => {
      render(<EdgeHoverZones panelMappings={defaultPanelMappings} showDelay={500} />);

      // Move to top edge
      act(() => {
        fireEvent.mouseMove(window, { clientX: 500, clientY: 20 });
      });

      // Check before delay
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockShowPanel).not.toHaveBeenCalled();

      // Check after delay
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(mockShowPanel).toHaveBeenCalledWith('search-panel');
    });

    it('should respect custom hide delay', () => {
      render(
        <EdgeHoverZones panelMappings={defaultPanelMappings} showDelay={50} hideDelay={500} />
      );

      // Move to top edge and show panel
      act(() => {
        fireEvent.mouseMove(window, { clientX: 500, clientY: 20 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Move away from edge
      act(() => {
        fireEvent.mouseMove(window, { clientX: 500, clientY: 500 });
      });

      // Check before hide delay
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockHidePanel).not.toHaveBeenCalled();

      // Check after hide delay
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(mockHidePanel).toHaveBeenCalledWith('search-panel');
    });
  });

  describe('Timeout Management', () => {
    it('should cancel show timeout when moving away before delay', () => {
      render(<EdgeHoverZones panelMappings={defaultPanelMappings} showDelay={200} />);

      // Move to top edge
      act(() => {
        fireEvent.mouseMove(window, { clientX: 500, clientY: 20 });
      });

      // Move away before show delay completes
      act(() => {
        vi.advanceTimersByTime(100);
        fireEvent.mouseMove(window, { clientX: 500, clientY: 500 });
      });

      // Wait for original show delay to pass
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Panel should not have been shown
      expect(mockShowPanel).not.toHaveBeenCalled();
    });

    it('should cancel hide timeout when returning to edge', () => {
      render(
        <EdgeHoverZones panelMappings={defaultPanelMappings} showDelay={50} hideDelay={300} />
      );

      // Move to top edge and show panel
      act(() => {
        fireEvent.mouseMove(window, { clientX: 500, clientY: 20 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockShowPanel).toHaveBeenCalledWith('search-panel');

      // Move away from edge
      act(() => {
        fireEvent.mouseMove(window, { clientX: 500, clientY: 500 });
      });

      // Return to edge before hide delay completes
      act(() => {
        vi.advanceTimersByTime(100);
        fireEvent.mouseMove(window, { clientX: 500, clientY: 20 });
      });

      // Wait for original hide delay to pass
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Panel should not have been hidden
      expect(mockHidePanel).not.toHaveBeenCalled();
    });
  });
});
