/**
 * CleanModePanel Component Tests
 *
 * Tests for the CleanModePanel component that transforms persistent panels
 * into floating tooltips when clean mode is enabled.
 *
 * Requirements: 46.3, 46.4
 */

import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CleanModePanel } from '../../components/hud/CleanModePanel';
import { useUIStore } from '../../stores/uiStore';

// Reset store state before each test
beforeEach(() => {
  useUIStore.setState({
    isCleanMode: false,
    hoveredPanel: null,
    visiblePanels: new Set<string>(),
  });
});

describe('CleanModePanel', () => {
  describe('Normal Mode Behavior', () => {
    it('should render children in normal mode', () => {
      render(
        <CleanModePanel panelId="test-panel">
          <div data-testid="panel-content">Panel Content</div>
        </CleanModePanel>
      );

      expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    });

    it('should always show panel in normal mode regardless of visibility settings', () => {
      render(
        <CleanModePanel panelId="test-panel" visibleInCleanMode={false}>
          <div data-testid="panel-content">Panel Content</div>
        </CleanModePanel>
      );

      expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    });
  });

  describe('Clean Mode Behavior (Requirement 46.3, 46.4)', () => {
    beforeEach(() => {
      useUIStore.setState({ isCleanMode: true });
    });

    it('should hide panel in clean mode when visibleInCleanMode is false', () => {
      const { container } = render(
        <CleanModePanel panelId="test-panel" visibleInCleanMode={false}>
          <div data-testid="panel-content">Panel Content</div>
        </CleanModePanel>
      );

      // Panel should not be rendered
      expect(container.firstChild).toBeNull();
    });

    it('should show panel in clean mode when visibleInCleanMode is true', () => {
      render(
        <CleanModePanel panelId="test-panel" visibleInCleanMode={true}>
          <div data-testid="panel-content">Panel Content</div>
        </CleanModePanel>
      );

      expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    });

    it('should render as floating tooltip when showAsTooltipInCleanMode is true', () => {
      render(
        <CleanModePanel
          panelId="test-panel"
          showAsTooltipInCleanMode={true}
          hoverTrigger={<button data-testid="trigger">Trigger</button>}
        >
          <div data-testid="panel-content">Panel Content</div>
        </CleanModePanel>
      );

      // Trigger should be visible
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
      // Panel content should be in the DOM but hidden (opacity-0)
      expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    });
  });

  describe('Panel Visibility State', () => {
    it('should respond to store visibility state in clean mode', () => {
      useUIStore.setState({
        isCleanMode: true,
        visiblePanels: new Set(['test-panel']),
      });

      render(
        <CleanModePanel panelId="test-panel" showAsTooltipInCleanMode={true}>
          <div data-testid="panel-content">Panel Content</div>
        </CleanModePanel>
      );

      // Panel should be visible when in visiblePanels
      const panelContent = screen.getByTestId('panel-content');
      expect(panelContent).toBeInTheDocument();
    });
  });

  describe('Position Classes', () => {
    it('should apply correct position classes for top-left', () => {
      useUIStore.setState({ isCleanMode: true });

      const { container } = render(
        <CleanModePanel panelId="test-panel" position="top-left" showAsTooltipInCleanMode={true}>
          <div data-testid="panel-content">Panel Content</div>
        </CleanModePanel>
      );

      const tooltip = container.querySelector('.fixed');
      expect(tooltip).toHaveClass('top-4', 'left-4');
    });

    it('should apply correct position classes for bottom-right', () => {
      useUIStore.setState({ isCleanMode: true });

      const { container } = render(
        <CleanModePanel
          panelId="test-panel"
          position="bottom-right"
          showAsTooltipInCleanMode={true}
        >
          <div data-testid="panel-content">Panel Content</div>
        </CleanModePanel>
      );

      const tooltip = container.querySelector('.fixed');
      expect(tooltip).toHaveClass('bottom-4', 'right-4');
    });
  });

  describe('Clean Mode Toggle', () => {
    it('should show panel when clean mode is toggled off', () => {
      // Start in clean mode with panel hidden
      useUIStore.setState({ isCleanMode: true });

      const { rerender } = render(
        <CleanModePanel panelId="test-panel" visibleInCleanMode={false}>
          <div data-testid="panel-content">Panel Content</div>
        </CleanModePanel>
      );

      // Panel should be hidden
      expect(screen.queryByTestId('panel-content')).not.toBeInTheDocument();

      // Toggle clean mode off
      act(() => {
        useUIStore.setState({ isCleanMode: false });
      });

      // Re-render to pick up state change
      rerender(
        <CleanModePanel panelId="test-panel" visibleInCleanMode={false}>
          <div data-testid="panel-content">Panel Content</div>
        </CleanModePanel>
      );

      // Panel should now be visible
      expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    });
  });
});
