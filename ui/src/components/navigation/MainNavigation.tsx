/**
 * MainNavigation Component
 *
 * Navigation bar with links to all screens in the Memory Exploration UI.
 * Uses glassmorphism styling consistent with the dark theme design.
 * Enhanced with active state glow indicators, smooth hover transitions,
 * and subtle separators between nav items.
 *
 * Requirements: 23.1, 31.5
 */

import { Home, Layers } from 'lucide-react';
import { useCallback, useState, type ReactElement } from 'react';
import { prefersReducedMotion } from '../../utils/accessibility';
import { UserBadge } from '../auth';
import { AnimatedLogo, Logo } from '../brand/Logo';
import { ThemeSwitcher } from '../hud/ThemeSwitcher';
import {
  BiasIcon,
  DecomposeIcon,
  EmotionIcon,
  FrameworkIcon,
  MemoriesIcon,
  ReasoningIcon,
  type IconSize,
} from '../icons';

// ============================================================================
// Types
// ============================================================================

export type ScreenId =
  | 'dashboard'
  | 'memory-graph'
  | 'memory-explorer'
  | 'reasoning-console'
  | 'framework-analysis'
  | 'problem-decomposition'
  | 'confidence-bias'
  | 'emotion-analysis';

export interface NavItem {
  /** Unique screen identifier */
  id: ScreenId;
  /** Display label */
  label: string;
  /** Short label for mobile */
  shortLabel: string;
  /** Icon component getter */
  getIcon: (size: IconSize) => ReactElement;
  /** Description for tooltip */
  description: string;
}

export interface MainNavigationProps {
  /** Currently active screen */
  activeScreen: ScreenId;
  /** Callback when a navigation item is clicked */
  onNavigate: (screenId: ScreenId) => void;
  /** Whether navigation is disabled (e.g., during transition) */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Home',
    getIcon: (size) => <Home size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />,
    description: 'Overview of your knowledge base',
  },
  {
    id: 'memory-explorer',
    label: 'Memory Explorer',
    shortLabel: 'Explorer',
    getIcon: (size) => <Layers size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />,
    description: 'Search and manage memories',
  },
  {
    id: 'reasoning-console',
    label: 'Reasoning Console',
    shortLabel: 'Reasoning',
    getIcon: (size) => <ReasoningIcon size={size} />,
    description: 'Perform systematic reasoning analysis',
  },
  {
    id: 'framework-analysis',
    label: 'Framework Analysis',
    shortLabel: 'Framework',
    getIcon: (size) => <FrameworkIcon size={size} />,
    description: 'Analyze problems using thinking frameworks',
  },
  {
    id: 'problem-decomposition',
    label: 'Problem Decomposition',
    shortLabel: 'Decompose',
    getIcon: (size) => <DecomposeIcon size={size} />,
    description: 'Break down complex problems',
  },
  {
    id: 'confidence-bias',
    label: 'Confidence & Bias',
    shortLabel: 'Bias',
    getIcon: (size) => <BiasIcon size={size} />,
    description: 'Assess confidence and detect biases',
  },
  {
    id: 'emotion-analysis',
    label: 'Emotion Analysis',
    shortLabel: 'Emotion',
    getIcon: (size) => <EmotionIcon size={size} />,
    description: 'Analyze emotional content',
  },
  {
    id: 'memory-graph',
    label: 'Memory Graph',
    shortLabel: 'Graph',
    getIcon: (size) => <MemoriesIcon size={size} />,
    description: 'Explore the 3D memory graph',
  },
];

/** Icon size in pixels - consistent sizing (Requirements: 31.5) */
const ICON_SIZE = 20;

// ============================================================================
// Sub-Components
// ============================================================================

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  disabled: boolean;
  onClick: () => void;
  showSeparator: boolean;
}

/**
 * Individual navigation button with enhanced styling
 * - Active state with glow indicator
 * - Smooth hover transitions (150-200ms)
 * - Consistent icon sizing
 * - Responsive: icons only (<768px), short labels (768-1440px), full labels (>1440px)
 * Requirements: 23.1, 31.5, 47.3, 47.4, 47.5
 */
function NavButton({
  item,
  isActive,
  disabled,
  onClick,
  showSeparator,
}: NavButtonProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    if (!disabled && !isActive) {
      onClick();
    }
  }, [disabled, isActive, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isActive) {
        e.preventDefault();
        onClick();
      }
    },
    [disabled, isActive, onClick]
  );

  // Calculate dynamic styles for active state glow
  const getButtonStyle = (): React.CSSProperties => {
    if (isActive) {
      return {
        boxShadow: `
          0 0 15px rgba(0, 255, 255, 0.3),
          0 0 30px rgba(0, 255, 255, 0.15),
          inset 0 0 10px rgba(0, 255, 255, 0.1)
        `,
        background: 'rgba(0, 255, 255, 0.12)',
      };
    }
    if (isHovered && !disabled) {
      return {
        boxShadow: '0 0 10px rgba(0, 255, 255, 0.1)',
        background: 'rgba(100, 100, 150, 0.2)',
      };
    }
    return {};
  };

  return (
    <div className="flex items-center flex-shrink-0">
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
        disabled={disabled}
        title={item.description}
        aria-label={`Navigate to ${item.label}`}
        aria-current={isActive ? 'page' : undefined}
        className={`
          relative flex items-center gap-1.5
          px-2 py-1.5
          md:px-2.5 md:py-2
          xl:px-3 xl:py-2
          rounded-lg
          text-xs md:text-sm font-medium
          transition-all duration-normal ease-out
          whitespace-nowrap
          ${
            isActive
              ? 'text-ui-accent-primary border border-ui-accent-primary/50'
              : disabled
                ? 'text-ui-text-muted cursor-not-allowed opacity-50'
                : 'text-ui-text-secondary hover:text-ui-text-primary border border-transparent'
          }
          ${!disabled && !isActive ? 'cursor-pointer active:scale-95' : ''}
        `}
        style={getButtonStyle()}
      >
        {/* Active indicator - glowing dot */}
        {isActive && (
          <span
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-ui-accent-primary animate-pulse"
            style={{
              boxShadow: '0 0 8px rgba(0, 255, 255, 0.8), 0 0 16px rgba(0, 255, 255, 0.4)',
            }}
          />
        )}

        {/* Icon with consistent sizing */}
        <span
          className="flex items-center justify-center transition-transform duration-fast"
          style={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            transform: isHovered && !disabled && !isActive ? 'scale(1.1)' : 'scale(1)',
          }}
          aria-hidden="true"
        >
          {item.getIcon('lg')}
        </span>

        {/* Full label on extra-large screens (>1440px) - Requirement 47.5 */}
        <span className="hidden 2xl:inline">{item.label}</span>
        {/* Short label on large screens (1024-1440px) */}
        <span className="hidden xl:inline 2xl:hidden">{item.shortLabel}</span>
        {/* Short label on medium screens (768-1024px) */}
        <span className="hidden md:inline xl:hidden">{item.shortLabel}</span>
        {/* Icons only on small screens (<768px) - Requirement 47.4 */}
      </button>

      {/* Subtle separator between nav items - hidden on small screens */}
      {showSeparator && (
        <div
          className="h-4 w-px mx-0.5 hidden lg:block"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgba(100, 100, 150, 0.3), transparent)',
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * MainNavigation - Navigation bar with all screen links
 *
 * Features:
 * - Links to all screens (Requirement 23.1)
 * - Glassmorphism styling consistent with UI design
 * - Full-width responsive design without scrolling (Requirement 47.1, 47.2)
 * - Responsive breakpoints: icons (<768px), compact (768-1440px), full (>1440px) (Requirement 47.3, 47.4, 47.5)
 * - Keyboard accessible
 * - Active state indication with glow effect
 * - Smooth hover transitions (150-200ms)
 * - Subtle separators between nav items
 * - Consistent icon sizing (20px)
 *
 * Requirements: 23.1, 31.5, 47.1, 47.2, 47.3, 47.4, 47.5, 47.6
 */
export function MainNavigation({
  activeScreen,
  onNavigate,
  disabled = false,
  className = '',
}: MainNavigationProps): React.ReactElement {
  return (
    <nav
      aria-label="Main navigation"
      className={`
        w-full
        bg-ui-surface/85
        backdrop-blur-glass-medium
        border-b border-ui-border
        ${className}
      `}
      style={{
        boxShadow: `
          0 4px 20px rgba(0, 0, 0, 0.4),
          0 0 30px rgba(0, 255, 255, 0.05),
          inset 0 -1px 0 rgba(0, 255, 255, 0.1)
        `,
      }}
    >
      {/* Full-width container without max-width constraint (Requirement 47.1) */}
      <div className="w-full px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo/Brand with orbiting animation - clickable to navigate to dashboard */}
          <button
            onClick={() => {
              onNavigate('dashboard');
            }}
            className="flex items-center gap-3 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity duration-normal"
            aria-label="Go to Dashboard"
          >
            {/* Use AnimatedLogo (orbiting) unless reduced motion is preferred */}
            {prefersReducedMotion() ? (
              <Logo size="lg" variant="glow" />
            ) : (
              <AnimatedLogo size="md" />
            )}
            <span
              className="font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent text-lg hidden sm:block"
              style={{ filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.3))' }}
            >
              ThoughtMCP
            </span>
          </button>

          {/* Navigation Items - flex-1 to take remaining space, no overflow scroll (Requirement 47.2) */}
          <div className="flex items-center justify-end gap-0.5 flex-1 min-w-0">
            {NAV_ITEMS.map((item, index) => (
              <NavButton
                key={item.id}
                item={item}
                isActive={activeScreen === item.id}
                disabled={disabled}
                showSeparator={index < NAV_ITEMS.length - 1}
                onClick={(): void => {
                  onNavigate(item.id);
                }}
              />
            ))}

            {/* Theme Switcher - compact on mobile, full on desktop */}
            <div className="ml-2 pl-2 border-l border-ui-border/50">
              <ThemeSwitcher compact className="hidden md:block" />
              <ThemeSwitcher compact className="md:hidden" />
            </div>

            {/* User Badge - shows current username with option to switch */}
            <div className="ml-2 pl-2 border-l border-ui-border/50">
              <UserBadge />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default MainNavigation;
