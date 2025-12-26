/**
 * CleanModeController Component Tests
 *
 * Tests for the CleanModeController component and related hooks.
 *
 * Requirements: 46.1, 46.5
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CleanModeController } from '../../components/hud/CleanModeController';
import { useUIStore } from '../../stores/uiStore';

// Reset store state before each test
beforeEach(() => {
  useUIStore.setState({
    isCleanMode: false,
    hoveredPanel: null,
    visiblePanels: new Set<string>(),
    memoryPreview: {
      isOpen: false,
      memory: null,
      mode: 'view',
    },
  });
});

describe('CleanModeController', () => {
  describe('Rendering', () => {
    it('should render the clean mode toggle button', () => {
      render(<CleanModeController />);

      const button = screen.getByRole('button', { name: /clean mode/i });
      expect(button).toBeInTheDocument();
    });

    it('should show "Enter clean mode" label when not in clean mode', () => {
      render(<CleanModeController />);

      const button = screen.getByRole('button', { name: /enter clean mode/i });
      expect(button).toBeInTheDocument();
    });

    it('should show "Exit clean mode" label when in clean mode', () => {
      useUIStore.setState({ isCleanMode: true });
      render(<CleanModeController />);

      const button = screen.getByRole('button', { name: /exit clean mode/i });
      expect(button).toBeInTheDocument();
    });

    it('should show tooltip hint when in clean mode', () => {
      useUIStore.setState({ isCleanMode: true });
      render(<CleanModeController />);

      expect(screen.getByText(/press/i)).toBeInTheDocument();
      expect(screen.getByText('Esc')).toBeInTheDocument();
    });

    it('should not show tooltip hint when not in clean mode', () => {
      render(<CleanModeController />);

      expect(screen.queryByText(/press/i)).not.toBeInTheDocument();
    });
  });

  describe('Toggle Behavior', () => {
    it('should toggle clean mode when button is clicked', () => {
      render(<CleanModeController />);

      const button = screen.getByRole('button', { name: /enter clean mode/i });
      fireEvent.click(button);

      expect(useUIStore.getState().isCleanMode).toBe(true);
    });

    it('should toggle clean mode off when button is clicked in clean mode', () => {
      useUIStore.setState({ isCleanMode: true });
      render(<CleanModeController />);

      const button = screen.getByRole('button', { name: /exit clean mode/i });
      fireEvent.click(button);

      expect(useUIStore.getState().isCleanMode).toBe(false);
    });
  });

  describe('Keyboard Shortcut (Requirement 46.5)', () => {
    it('should toggle clean mode when Escape key is pressed', () => {
      render(<CleanModeController />);

      // Initially not in clean mode
      expect(useUIStore.getState().isCleanMode).toBe(false);

      // Press Escape
      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      // Should now be in clean mode
      expect(useUIStore.getState().isCleanMode).toBe(true);

      // Press Escape again
      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      // Should be back to normal mode
      expect(useUIStore.getState().isCleanMode).toBe(false);
    });

    it('should not toggle clean mode when Escape is pressed in an input field', () => {
      render(
        <div>
          <CleanModeController />
          <input data-testid="test-input" />
        </div>
      );

      const input = screen.getByTestId('test-input');

      // Focus the input
      input.focus();

      // Press Escape while focused on input
      act(() => {
        fireEvent.keyDown(input, { key: 'Escape' });
      });

      // Should NOT toggle clean mode
      expect(useUIStore.getState().isCleanMode).toBe(false);
    });

    it('should not toggle clean mode when other keys are pressed', () => {
      render(<CleanModeController />);

      // Press other keys
      act(() => {
        fireEvent.keyDown(window, { key: 'Enter' });
        fireEvent.keyDown(window, { key: 'Space' });
        fireEvent.keyDown(window, { key: 'a' });
      });

      // Should still not be in clean mode
      expect(useUIStore.getState().isCleanMode).toBe(false);
    });
  });

  describe('Callback', () => {
    it('should call onCleanModeChange when clean mode changes', () => {
      const onCleanModeChange = vi.fn();
      render(<CleanModeController onCleanModeChange={onCleanModeChange} />);

      // Initial call with false
      expect(onCleanModeChange).toHaveBeenCalledWith(false);

      // Toggle clean mode
      const button = screen.getByRole('button', { name: /enter clean mode/i });
      fireEvent.click(button);

      // Should be called with true
      expect(onCleanModeChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Children', () => {
    it('should render children in the toolbar', () => {
      render(
        <CleanModeController>
          <span data-testid="child-content">Custom Content</span>
        </CleanModeController>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<CleanModeController className="custom-class" />);

      const controller = container.querySelector('.clean-mode-controller');
      expect(controller).toHaveClass('custom-class');
    });

    it('should set data-clean-mode attribute', () => {
      const { container } = render(<CleanModeController />);

      const controller = container.querySelector('.clean-mode-controller');
      expect(controller).toHaveAttribute('data-clean-mode', 'false');

      // Toggle clean mode
      act(() => {
        useUIStore.getState().toggleCleanMode();
      });

      expect(controller).toHaveAttribute('data-clean-mode', 'true');
    });
  });
});

describe('UIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      isCleanMode: false,
      hoveredPanel: null,
      visiblePanels: new Set<string>(),
      memoryPreview: {
        isOpen: false,
        memory: null,
        mode: 'view',
      },
    });
  });

  describe('toggleCleanMode', () => {
    it('should toggle isCleanMode state', () => {
      expect(useUIStore.getState().isCleanMode).toBe(false);

      useUIStore.getState().toggleCleanMode();
      expect(useUIStore.getState().isCleanMode).toBe(true);

      useUIStore.getState().toggleCleanMode();
      expect(useUIStore.getState().isCleanMode).toBe(false);
    });

    it('should clear visiblePanels when toggling', () => {
      useUIStore.setState({
        visiblePanels: new Set(['panel1', 'panel2']),
      });

      useUIStore.getState().toggleCleanMode();

      expect(useUIStore.getState().visiblePanels.size).toBe(0);
    });
  });

  describe('setCleanMode', () => {
    it('should set isCleanMode to specified value', () => {
      useUIStore.getState().setCleanMode(true);
      expect(useUIStore.getState().isCleanMode).toBe(true);

      useUIStore.getState().setCleanMode(false);
      expect(useUIStore.getState().isCleanMode).toBe(false);
    });
  });

  describe('setHoveredPanel', () => {
    it('should set hoveredPanel', () => {
      useUIStore.getState().setHoveredPanel('panel1');
      expect(useUIStore.getState().hoveredPanel).toBe('panel1');
    });

    it('should add panel to visiblePanels in clean mode', () => {
      useUIStore.setState({ isCleanMode: true });

      useUIStore.getState().setHoveredPanel('panel1');

      expect(useUIStore.getState().visiblePanels.has('panel1')).toBe(true);
    });

    it('should not add panel to visiblePanels in normal mode', () => {
      useUIStore.getState().setHoveredPanel('panel1');

      expect(useUIStore.getState().visiblePanels.has('panel1')).toBe(false);
    });
  });

  describe('isPanelVisible', () => {
    it('should return true for all panels in normal mode', () => {
      expect(useUIStore.getState().isPanelVisible('any-panel')).toBe(true);
    });

    it('should return false for non-visible panels in clean mode', () => {
      useUIStore.setState({ isCleanMode: true });

      expect(useUIStore.getState().isPanelVisible('hidden-panel')).toBe(false);
    });

    it('should return true for visible panels in clean mode', () => {
      useUIStore.setState({
        isCleanMode: true,
        visiblePanels: new Set(['visible-panel']),
      });

      expect(useUIStore.getState().isPanelVisible('visible-panel')).toBe(true);
    });

    it('should return true for hovered panel in clean mode', () => {
      useUIStore.setState({
        isCleanMode: true,
        hoveredPanel: 'hovered-panel',
      });

      expect(useUIStore.getState().isPanelVisible('hovered-panel')).toBe(true);
    });
  });

  describe('showPanel / hidePanel', () => {
    it('should add panel to visiblePanels', () => {
      useUIStore.getState().showPanel('panel1');
      expect(useUIStore.getState().visiblePanels.has('panel1')).toBe(true);
    });

    it('should remove panel from visiblePanels', () => {
      useUIStore.setState({
        visiblePanels: new Set(['panel1']),
      });

      useUIStore.getState().hidePanel('panel1');
      expect(useUIStore.getState().visiblePanels.has('panel1')).toBe(false);
    });
  });
});
