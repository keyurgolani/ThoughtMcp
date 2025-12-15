/**
 * SuggestedActions Component
 *
 * Displays AI-suggested actions (explore, reason, analyze, connect) with
 * action cards showing descriptions. Clicking navigates to the relevant screen.
 * Uses glassmorphism styling consistent with the dark cosmic theme.
 *
 * Requirements: 9.1
 */

import { useMemo, type ReactElement } from 'react';
import { GlassPanel } from './GlassPanel';

// ============================================================================
// Types
// ============================================================================

/** Action types that can be suggested */
export type SuggestedActionType = 'explore' | 'reason' | 'analyze' | 'connect';

/** Suggested action data structure */
export interface SuggestedAction {
  /** Unique action ID */
  id: string;
  /** Action type */
  type: SuggestedActionType;
  /** Action title */
  title: string;
  /** Action description */
  description: string;
  /** Target memory ID (optional) */
  targetMemoryId?: string;
  /** Priority for sorting (higher = more important) */
  priority?: number;
}

export interface SuggestedActionsProps {
  /** List of suggested actions to display */
  actions: SuggestedAction[];
  /** Callback when an action is clicked */
  onActionClick?: (action: SuggestedAction) => void;
  /** Maximum number of actions to display */
  maxItems?: number;
  /** Display variant */
  variant?: 'grid' | 'list' | 'compact';
  /** Title for the section */
  title?: string;
  /** Show empty state when no actions */
  showEmptyState?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_ITEMS = 4;

/** Icons for each action type */
const ACTION_ICONS: Record<SuggestedActionType, string> = {
  explore: '🧭',
  reason: '💭',
  analyze: '🔍',
  connect: '🔗',
};

/** Labels for each action type */
const ACTION_LABELS: Record<SuggestedActionType, string> = {
  explore: 'Explore',
  reason: 'Reason',
  analyze: 'Analyze',
  connect: 'Connect',
};

/** Border colors for each action type */
const ACTION_BORDER_COLORS: Record<SuggestedActionType, string> = {
  explore: 'border-sector-semantic/40 hover:border-sector-semantic/60',
  reason: 'border-sector-procedural/40 hover:border-sector-procedural/60',
  analyze: 'border-ui-accent-primary/40 hover:border-ui-accent-primary/60',
  connect: 'border-sector-episodic/40 hover:border-sector-episodic/60',
};

/** Glow colors for each action type */
const ACTION_GLOW_COLORS: Record<SuggestedActionType, string> = {
  explore: 'group-hover:shadow-[0_0_12px_rgba(0,255,255,0.2)]',
  reason: 'group-hover:shadow-[0_0_12px_rgba(155,89,182,0.2)]',
  analyze: 'group-hover:shadow-[0_0_12px_rgba(0,255,255,0.3)]',
  connect: 'group-hover:shadow-[0_0_12px_rgba(255,215,0,0.2)]',
};

/** Background colors for action icons */
const ACTION_ICON_BG_COLORS: Record<SuggestedActionType, string> = {
  explore: 'bg-sector-semantic/10 group-hover:bg-sector-semantic/20',
  reason: 'bg-sector-procedural/10 group-hover:bg-sector-procedural/20',
  analyze: 'bg-ui-accent-primary/10 group-hover:bg-ui-accent-primary/20',
  connect: 'bg-sector-episodic/10 group-hover:bg-sector-episodic/20',
};

/** Screen routes for each action type */
export const ACTION_ROUTES: Record<SuggestedActionType, string> = {
  explore: '/explorer',
  reason: '/reasoning',
  analyze: '/confidence-bias',
  connect: '/explorer',
};

// ============================================================================
// Sub-Components
// ============================================================================

interface ActionCardProps {
  action: SuggestedAction;
  onClick: () => void;
  variant: 'grid' | 'list' | 'compact';
}

/**
 * Individual action card with glassmorphism styling
 */
function ActionCard({ action, onClick, variant }: ActionCardProps): ReactElement {
  const icon = ACTION_ICONS[action.type];
  const borderColor = ACTION_BORDER_COLORS[action.type];
  const glowColor = ACTION_GLOW_COLORS[action.type];
  const iconBgColor = ACTION_ICON_BG_COLORS[action.type];

  // Compact variant - minimal display
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className={`
          w-full p-2
          text-left
          rounded-lg
          border ${borderColor}
          bg-ui-surface/30 backdrop-blur-sm
          hover:bg-ui-surface-elevated/50
          transition-all duration-normal
          group
          focus:outline-none focus:ring-2 focus:ring-ui-accent-primary/50
        `}
        aria-label={`${action.title}: ${action.description}`}
        title={action.description}
      >
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">
            {icon}
          </span>
          <span className="text-xs text-ui-text-primary truncate group-hover:text-ui-accent-primary transition-colors">
            {action.title}
          </span>
        </div>
      </button>
    );
  }

  // List variant - horizontal layout
  if (variant === 'list') {
    return (
      <button
        onClick={onClick}
        className={`
          w-full p-3
          text-left
          rounded-lg
          border ${borderColor}
          bg-ui-surface/40 backdrop-blur-glass
          hover:bg-ui-surface-elevated/60
          transition-all duration-normal
          group ${glowColor}
          focus:outline-none focus:ring-2 focus:ring-ui-accent-primary/50
        `}
        aria-label={`${action.title}: ${action.description}`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`
              text-xl p-2 rounded-lg ${iconBgColor}
              transition-all duration-normal
              group-hover:scale-110
            `}
            aria-hidden="true"
          >
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-ui-text-primary group-hover:text-ui-accent-primary transition-colors">
              {action.title}
            </h4>
            <p className="text-xs text-ui-text-secondary truncate mt-0.5">{action.description}</p>
          </div>
          <svg
            className="w-4 h-4 text-ui-text-muted group-hover:text-ui-accent-primary transition-colors flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    );
  }

  // Grid variant (default) - card layout
  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4
        text-left
        rounded-xl
        border ${borderColor}
        bg-ui-surface/40 backdrop-blur-glass
        hover:bg-ui-surface-elevated/60
        transition-all duration-normal
        group ${glowColor}
        focus:outline-none focus:ring-2 focus:ring-ui-accent-primary/50
      `}
      aria-label={`${action.title}: ${action.description}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`
            text-2xl p-2 rounded-lg ${iconBgColor}
            transition-all duration-normal
            group-hover:scale-110
          `}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-ui-text-primary group-hover:text-ui-accent-primary transition-colors">
            {action.title}
          </h4>
          <p className="text-xs text-ui-text-secondary mt-1 line-clamp-2">{action.description}</p>
        </div>
      </div>
    </button>
  );
}

/**
 * Empty state when no suggested actions
 */
function EmptyState(): ReactElement {
  return (
    <div className="text-center py-8 px-4">
      <div className="text-4xl mb-3" aria-hidden="true">
        💡
      </div>
      <p className="text-sm text-ui-text-secondary mb-1">No suggestions available</p>
      <p className="text-xs text-ui-text-muted">
        Add more memories to get personalized suggestions
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * SuggestedActions - Display AI-suggested actions
 *
 * Features:
 * - Display AI-suggested actions (explore, reason, analyze, connect) (Requirement 9.1)
 * - Show action cards with descriptions
 * - Click to navigate to relevant screen
 * - Multiple display variants (grid, list, compact)
 * - Glassmorphism styling
 * - Priority-based sorting
 *
 * Action Types:
 * - explore: Navigate to Memory Explorer to explore memories
 * - reason: Open Reasoning Console for systematic reasoning
 * - analyze: Open Confidence & Bias Dashboard for analysis
 * - connect: Navigate to Memory Explorer to create connections
 *
 * Requirements: 9.1
 */
export function SuggestedActions({
  actions,
  onActionClick,
  maxItems = DEFAULT_MAX_ITEMS,
  variant = 'grid',
  title = 'Suggested Actions',
  showEmptyState = true,
  className = '',
}: SuggestedActionsProps): ReactElement {
  // Sort actions by priority (higher first) and limit
  const sortedActions = useMemo(() => {
    return [...actions].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)).slice(0, maxItems);
  }, [actions, maxItems]);

  // Handle action click
  const handleActionClick = (action: SuggestedAction): void => {
    onActionClick?.(action);
  };

  // Render empty state
  if (sortedActions.length === 0 && showEmptyState) {
    return (
      <div className={className}>
        {title && (
          <h3 className="text-xs font-semibold text-ui-text-muted uppercase tracking-wider mb-3">
            {title}
          </h3>
        )}
        <EmptyState />
      </div>
    );
  }

  // Render compact variant
  if (variant === 'compact') {
    return (
      <div className={className}>
        {title && (
          <h3 className="text-xs font-semibold text-ui-text-muted uppercase tracking-wider mb-2 px-1">
            {title}
          </h3>
        )}
        <div className="grid grid-cols-2 gap-2">
          {sortedActions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onClick={(): void => {
                handleActionClick(action);
              }}
              variant="compact"
            />
          ))}
        </div>
      </div>
    );
  }

  // Render list variant
  if (variant === 'list') {
    return (
      <div className={className}>
        {title && (
          <h3 className="text-xs font-semibold text-ui-text-muted uppercase tracking-wider mb-3">
            {title}
          </h3>
        )}
        <ul className="space-y-2">
          {sortedActions.map((action) => (
            <li key={action.id}>
              <ActionCard
                action={action}
                onClick={(): void => {
                  handleActionClick(action);
                }}
                variant="list"
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Render grid variant (default)
  return (
    <div className={className}>
      {title && (
        <h3 className="text-xs font-semibold text-ui-text-muted uppercase tracking-wider mb-3">
          {title}
        </h3>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sortedActions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            onClick={(): void => {
              handleActionClick(action);
            }}
            variant="grid"
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Panel Wrapper Component
// ============================================================================

export interface SuggestedActionsPanelProps extends SuggestedActionsProps {
  /** Panel variant for glassmorphism styling */
  panelVariant?: 'default' | 'glow' | 'glow-cyan';
}

/**
 * SuggestedActionsPanel - SuggestedActions wrapped in a GlassPanel
 *
 * Convenience component for use in dashboard layouts.
 */
export function SuggestedActionsPanel({
  panelVariant = 'default',
  className = '',
  ...props
}: SuggestedActionsPanelProps): ReactElement {
  return (
    <GlassPanel variant={panelVariant} size="md" className={className}>
      <SuggestedActions {...props} />
    </GlassPanel>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a default set of suggested actions
 * Useful for initial state or when no AI suggestions are available
 */
export function createDefaultSuggestedActions(): SuggestedAction[] {
  return [
    {
      id: 'default-explore',
      type: 'explore',
      title: 'Explore Memories',
      description: 'Navigate through your memory graph in 3D space',
      priority: 4,
    },
    {
      id: 'default-reason',
      type: 'reason',
      title: 'Start Reasoning',
      description: 'Use parallel reasoning to analyze problems',
      priority: 3,
    },
    {
      id: 'default-analyze',
      type: 'analyze',
      title: 'Analyze Content',
      description: 'Assess confidence and detect biases in your thinking',
      priority: 2,
    },
    {
      id: 'default-connect',
      type: 'connect',
      title: 'Create Connections',
      description: 'Link related memories to build your knowledge graph',
      priority: 1,
    },
  ];
}

/**
 * Get the route for a given action type
 */
export function getActionRoute(actionType: SuggestedActionType): string {
  return ACTION_ROUTES[actionType];
}

/**
 * Get the icon for a given action type
 */
export function getActionIcon(actionType: SuggestedActionType): string {
  return ACTION_ICONS[actionType];
}

/**
 * Get the label for a given action type
 */
export function getActionLabel(actionType: SuggestedActionType): string {
  return ACTION_LABELS[actionType];
}

export default SuggestedActions;
