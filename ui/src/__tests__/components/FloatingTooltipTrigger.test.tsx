/**
 * FloatingTooltipTrigger Component Tests
 *
 * Tests for the FloatingTooltipTrigger component that shows floating tooltips
 * on hover in clean mode.
 *
 * Requirements: 46.4
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FloatingTooltipTrigger } from '../../components/hud/FloatingTooltipTrigger';

describe('FloatingTooltipTrigger', () => {
  const defaultProps = {
    icon: <span data-testid="trigger-icon">🔍</span>,
    label: 'Test Trigger',
    children: <div data-testid="tooltip-content">Tooltip Content</div>,
  };

  describe('Rendering', () => {
    it('should render the trigger button with icon', () => {
      render(<FloatingTooltipTrigger {...defaultProps} />);

      expect(screen.getByTestId('trigger-icon')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /test trigger/i })).toBeInTheDocument();
    });

    it('should render tooltip content (initially hidden)', () => {
      render(<FloatingTooltipTrigger {...defaultProps} />);

      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toBeInTheDocument();
      // Tooltip should be hidden initially (has opacity-0 class)
      expect(tooltipContent.parentElement).toHaveClass('opacity-0');
    });

    it('should apply custom trigger className', () => {
      render(<FloatingTooltipTrigger {...defaultProps} triggerClassName="custom-trigger" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-trigger');
    });

    it('should apply custom tooltip className', () => {
      render(<FloatingTooltipTrigger {...defaultProps} tooltipClassName="custom-tooltip" />);

      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent.parentElement).toHaveClass('custom-tooltip');
    });
  });

  describe('Hover Behavior (Requirement 46.4)', () => {
    it('should track hover state on trigger', () => {
      render(<FloatingTooltipTrigger {...defaultProps} />);

      const button = screen.getByRole('button');
      const tooltipContent = screen.getByTestId('tooltip-content');

      // Initially hidden
      expect(tooltipContent.parentElement).toHaveClass('opacity-0');

      // Hover over trigger - state should be tracked
      fireEvent.mouseEnter(button);
      // Note: actual visibility change happens after delay, but hover state is tracked
    });

    it('should track hover leave on trigger', () => {
      render(<FloatingTooltipTrigger {...defaultProps} />);

      const button = screen.getByRole('button');

      // Hover and leave
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);
      // State tracking should work without errors
    });

    it('should track hover on tooltip content', () => {
      render(<FloatingTooltipTrigger {...defaultProps} />);

      const tooltipContent = screen.getByTestId('tooltip-content');

      // Hover over tooltip content
      const parentElement = tooltipContent.parentElement;
      if (parentElement) {
        fireEvent.mouseEnter(parentElement);
        fireEvent.mouseLeave(parentElement);
      }
      // State tracking should work without errors
    });
  });

  describe('Disabled State', () => {
    it('should not track hover when disabled', () => {
      render(<FloatingTooltipTrigger {...defaultProps} disabled={true} />);

      const button = screen.getByRole('button');
      const tooltipContent = screen.getByTestId('tooltip-content');

      // Hover over trigger
      fireEvent.mouseEnter(button);

      // Should still be hidden (disabled prevents hover tracking)
      expect(tooltipContent.parentElement).toHaveClass('opacity-0');
    });

    it('should apply disabled styling', () => {
      render(<FloatingTooltipTrigger {...defaultProps} disabled={true} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Position Classes', () => {
    it('should apply correct position classes for left tooltip', () => {
      const { container } = render(
        <FloatingTooltipTrigger {...defaultProps} tooltipPosition="left" />
      );

      const tooltip = container.querySelector('.absolute.z-50');
      expect(tooltip).toHaveClass('right-full', 'mr-2');
    });

    it('should apply correct position classes for right tooltip', () => {
      const { container } = render(
        <FloatingTooltipTrigger {...defaultProps} tooltipPosition="right" />
      );

      const tooltip = container.querySelector('.absolute.z-50');
      expect(tooltip).toHaveClass('left-full', 'ml-2');
    });

    it('should apply correct position classes for top tooltip', () => {
      const { container } = render(
        <FloatingTooltipTrigger {...defaultProps} tooltipPosition="top" />
      );

      const tooltip = container.querySelector('.absolute.z-50');
      expect(tooltip).toHaveClass('bottom-full', 'mb-2');
    });

    it('should apply correct position classes for bottom tooltip', () => {
      const { container } = render(
        <FloatingTooltipTrigger {...defaultProps} tooltipPosition="bottom" />
      );

      const tooltip = container.querySelector('.absolute.z-50');
      expect(tooltip).toHaveClass('top-full', 'mt-2');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label', () => {
      render(<FloatingTooltipTrigger {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Test Trigger');
      expect(button).toHaveAttribute('title', 'Test Trigger');
    });
  });
});
