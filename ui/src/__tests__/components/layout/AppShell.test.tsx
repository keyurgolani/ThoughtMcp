/**
 * AppShell Component Tests
 *
 * Tests for the main application shell component.
 * Requirements: 23.1, 23.5, 36.1
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell, SidebarContext, useSidebarContext } from '../../../components/layout/AppShell';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Helper component to test sidebar context
 */
function SidebarContextConsumer(): React.ReactElement {
  const context = useSidebarContext();
  return (
    <div data-testid="context-consumer">
      <span data-testid="collapsed">{String(context.collapsed)}</span>
      <span data-testid="current-route">{context.currentRoute}</span>
      <button
        data-testid="navigate-btn"
        onClick={(): void => {
          context.onNavigate('/test');
        }}
      >
        Navigate
      </button>
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('AppShell', () => {
  const defaultProps = {
    children: <div data-testid="content">Content</div>,
    currentRoute: '/explorer',
    onNavigate: vi.fn(),
    sidebarCollapsed: false,
    onToggleSidebar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.innerWidth for responsive tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render children content', () => {
      render(<AppShell {...defaultProps} />);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should render header when provided', () => {
      render(<AppShell {...defaultProps} header={<div data-testid="header">Header</div>} />);
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should render sidebar when provided', () => {
      render(<AppShell {...defaultProps} sidebar={<div data-testid="sidebar">Sidebar</div>} />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<AppShell {...defaultProps} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Sidebar Toggle', () => {
    it('should render sidebar toggle button', () => {
      render(<AppShell {...defaultProps} />);
      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should call onToggleSidebar when toggle button is clicked', () => {
      render(<AppShell {...defaultProps} />);
      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
      fireEvent.click(toggleButton);
      expect(defaultProps.onToggleSidebar).toHaveBeenCalledTimes(1);
    });

    it('should show expand label when sidebar is collapsed', () => {
      render(<AppShell {...defaultProps} sidebarCollapsed={true} />);
      const toggleButton = screen.getByRole('button', { name: /expand sidebar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should have correct aria-expanded attribute', () => {
      const { rerender } = render(<AppShell {...defaultProps} sidebarCollapsed={false} />);
      let toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      rerender(<AppShell {...defaultProps} sidebarCollapsed={true} />);
      toggleButton = screen.getByRole('button', { name: /expand sidebar/i });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should toggle sidebar on Cmd+B', () => {
      render(<AppShell {...defaultProps} />);
      fireEvent.keyDown(window, { key: 'b', metaKey: true });
      expect(defaultProps.onToggleSidebar).toHaveBeenCalledTimes(1);
    });

    it('should toggle sidebar on Ctrl+B', () => {
      render(<AppShell {...defaultProps} />);
      fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
      expect(defaultProps.onToggleSidebar).toHaveBeenCalledTimes(1);
    });

    it('should not toggle sidebar on just B key', () => {
      render(<AppShell {...defaultProps} />);
      fireEvent.keyDown(window, { key: 'b' });
      expect(defaultProps.onToggleSidebar).not.toHaveBeenCalled();
    });
  });

  describe('Sidebar Context', () => {
    it('should provide sidebar context to children', () => {
      render(<AppShell {...defaultProps} sidebar={<SidebarContextConsumer />} />);

      expect(screen.getByTestId('collapsed')).toHaveTextContent('false');
      expect(screen.getByTestId('current-route')).toHaveTextContent('/explorer');
    });

    it('should update context when collapsed state changes', () => {
      const { rerender } = render(
        <AppShell {...defaultProps} sidebar={<SidebarContextConsumer />} />
      );
      expect(screen.getByTestId('collapsed')).toHaveTextContent('false');

      rerender(
        <AppShell {...defaultProps} sidebarCollapsed={true} sidebar={<SidebarContextConsumer />} />
      );
      expect(screen.getByTestId('collapsed')).toHaveTextContent('true');
    });

    it('should call onNavigate through context', () => {
      render(<AppShell {...defaultProps} sidebar={<SidebarContextConsumer />} />);

      fireEvent.click(screen.getByTestId('navigate-btn'));
      expect(defaultProps.onNavigate).toHaveBeenCalledWith('/test');
    });
  });

  describe('Glassmorphism Styling (Requirement 23.5)', () => {
    it('should have dark background', () => {
      const { container } = render(<AppShell {...defaultProps} />);
      expect(container.firstChild).toHaveClass('bg-ui-background');
    });

    it('should have sidebar with glassmorphism styling', () => {
      render(<AppShell {...defaultProps} />);
      const sidebar = screen.getByRole('complementary', { name: /sidebar/i });
      expect(sidebar).toHaveClass('backdrop-blur-glass-medium');
      expect(sidebar).toHaveClass('bg-ui-surface/90');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AppShell {...defaultProps} />);
      expect(screen.getByRole('complementary', { name: /sidebar/i })).toBeInTheDocument();
    });

    it('should show keyboard shortcut hint when sidebar is expanded', () => {
      render(<AppShell {...defaultProps} sidebarCollapsed={false} />);
      expect(screen.getByText('⌘B')).toBeInTheDocument();
      expect(screen.getByText('to toggle')).toBeInTheDocument();
    });
  });
});

describe('useSidebarContext', () => {
  it('should return default values when used outside provider', () => {
    function TestComponent(): React.ReactElement {
      const context = useSidebarContext();
      return (
        <div>
          <span data-testid="collapsed">{String(context.collapsed)}</span>
          <span data-testid="route">{context.currentRoute}</span>
        </div>
      );
    }

    render(<TestComponent />);
    expect(screen.getByTestId('collapsed')).toHaveTextContent('false');
    expect(screen.getByTestId('route')).toHaveTextContent('');
  });

  it('should return provided values from context', () => {
    function TestComponent(): React.ReactElement {
      const context = useSidebarContext();
      return (
        <div>
          <span data-testid="collapsed">{String(context.collapsed)}</span>
          <span data-testid="route">{context.currentRoute}</span>
        </div>
      );
    }

    render(
      <SidebarContext.Provider
        value={{
          collapsed: true,
          currentRoute: '/test-route',
          onNavigate: vi.fn(),
        }}
      >
        <TestComponent />
      </SidebarContext.Provider>
    );

    expect(screen.getByTestId('collapsed')).toHaveTextContent('true');
    expect(screen.getByTestId('route')).toHaveTextContent('/test-route');
  });
});
