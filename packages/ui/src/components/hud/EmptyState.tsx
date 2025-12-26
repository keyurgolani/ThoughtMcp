/**
 * EmptyState Component
 *
 * Empty state components for when content is unavailable or search returns no results.
 * Provides helpful suggestions and action prompts.
 *
 * Requirements: 37.2, 37.5
 */

import { GlassPanel } from './GlassPanel';

// ============================================================================
// Types
// ============================================================================

export type EmptyStateVariant =
  | 'search'
  | 'memory-list'
  | 'cognitive-results'
  | 'graph'
  | 'generic';

export interface EmptyStateProps {
  /** Variant of empty state to display */
  variant?: EmptyStateVariant;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  /** Custom icon (React element) */
  icon?: React.ReactNode;
  /** Suggestions to display */
  suggestions?: string[];
  /** Primary action button */
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
}

export interface EmptySearchStateProps {
  /** The search query that returned no results */
  query?: string;
  /** Callback to clear search */
  onClearSearch?: () => void;
  /** Suggested search terms */
  suggestions?: string[];
  /** Callback when a suggestion is clicked */
  onSuggestionClick?: (suggestion: string) => void;
  /** Additional CSS classes */
  className?: string;
}

export interface EmptyMemoryListProps {
  /** Callback to create a new memory */
  onCreateMemory?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export interface EmptyCognitiveResultsProps {
  /** Type of cognitive operation */
  operationType?: string;
  /** Callback to start analysis */
  onStartAnalysis?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

const SearchIcon = (): React.ReactElement => (
  <svg
    className="w-12 h-12 text-ui-text-tertiary"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const MemoryIcon = (): React.ReactElement => (
  <svg
    className="w-12 h-12 text-ui-text-tertiary"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.37469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

const BrainIcon = (): React.ReactElement => (
  <svg
    className="w-12 h-12 text-ui-text-tertiary"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const GraphIcon = (): React.ReactElement => (
  <svg
    className="w-12 h-12 text-ui-text-tertiary"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
    <circle cx="5" cy="5" r="2" strokeWidth={1.5} />
    <circle cx="19" cy="5" r="2" strokeWidth={1.5} />
    <circle cx="5" cy="19" r="2" strokeWidth={1.5} />
    <circle cx="19" cy="19" r="2" strokeWidth={1.5} />
    <path
      strokeLinecap="round"
      strokeWidth={1.5}
      d="M6.5 6.5l3 3M14.5 9.5l3-3M6.5 17.5l3-3M14.5 14.5l3 3"
    />
  </svg>
);

const EmptyBoxIcon = (): React.ReactElement => (
  <svg
    className="w-12 h-12 text-ui-text-tertiary"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);

// ============================================================================
// Variant Configurations
// ============================================================================

const variantConfig: Record<
  EmptyStateVariant,
  { icon: React.ReactNode; title: string; description: string }
> = {
  search: {
    icon: <SearchIcon />,
    title: 'No results found',
    description: "Try adjusting your search terms or filters to find what you're looking for.",
  },
  'memory-list': {
    icon: <MemoryIcon />,
    title: 'No memories yet',
    description: 'Start building your memory graph by creating your first memory.',
  },
  'cognitive-results': {
    icon: <BrainIcon />,
    title: 'No analysis results',
    description: 'Run a cognitive analysis to see insights and recommendations.',
  },
  graph: {
    icon: <GraphIcon />,
    title: 'No connections',
    description: 'This memory has no connections yet. Create links to build your knowledge graph.',
  },
  generic: {
    icon: <EmptyBoxIcon />,
    title: 'Nothing here',
    description: "There's no content to display at the moment.",
  },
};

// ============================================================================
// Base Empty State Component
// ============================================================================

/**
 * EmptyState - Base empty state component
 *
 * Requirements: 37.2, 37.5
 */
export function EmptyState({
  variant = 'generic',
  title,
  description,
  icon,
  suggestions,
  primaryAction,
  secondaryAction,
  className = '',
}: EmptyStateProps): React.ReactElement {
  const config = variantConfig[variant];

  const displayTitle = title ?? config.title;
  const displayDescription = description ?? config.description;
  const displayIcon = icon ?? config.icon;

  return (
    <div
      className={`flex flex-col items-center justify-center py-8 px-4 text-center ${className}`}
      role="status"
      aria-label={displayTitle}
    >
      {/* Icon */}
      <div className="mb-4 opacity-60">{displayIcon}</div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-ui-text-primary mb-2">{displayTitle}</h3>

      {/* Description */}
      <p className="text-sm text-ui-text-secondary max-w-sm mb-4">{displayDescription}</p>

      {/* Suggestions */}
      {suggestions !== undefined && suggestions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-ui-text-tertiary mb-2">Try:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs rounded-full bg-ui-accent-primary-bg text-ui-accent-primary border border-ui-accent-primary/20"
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex gap-3 mt-2">
          {primaryAction && (
            <button onClick={primaryAction.onClick} className="btn-primary text-sm">
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button onClick={secondaryAction.onClick} className="btn-ghost text-sm">
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Empty Search State Component
// ============================================================================

/**
 * EmptySearchState - Empty state for search results
 *
 * Requirements: 37.2, 37.5
 */
export function EmptySearchState({
  query,
  onClearSearch,
  suggestions = ['episodic memories', 'recent thoughts', 'important ideas'],
  onSuggestionClick,
  className = '',
}: EmptySearchStateProps): React.ReactElement {
  return (
    <GlassPanel variant="sunken" size="md" className={className}>
      <div className="flex flex-col items-center py-6 text-center">
        <SearchIcon />

        <h3 className="text-base font-semibold text-ui-text-primary mt-4 mb-2">
          {query !== undefined && query !== '' ? `No results for "${query}"` : 'No results found'}
        </h3>

        <p className="text-sm text-ui-text-secondary max-w-xs mb-4">
          Try different keywords or adjust your filters
        </p>

        {/* Suggestions */}
        <div className="mb-4">
          <p className="text-xs text-ui-text-tertiary mb-2">Suggestions:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="px-3 py-1 text-xs rounded-full bg-ui-accent-primary-bg text-ui-accent-primary
                         border border-ui-accent-primary/20 hover:bg-ui-accent-primary-subtle
                         transition-colors cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {onClearSearch && (
          <button
            onClick={onClearSearch}
            className="text-sm text-ui-accent-primary hover:text-ui-accent-primary-muted transition-colors"
          >
            Clear search
          </button>
        )}
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Empty Memory List Component
// ============================================================================

/**
 * EmptyMemoryList - Empty state for memory list
 *
 * Requirements: 37.2, 37.5
 */
export function EmptyMemoryList({
  onCreateMemory,
  className = '',
}: EmptyMemoryListProps): React.ReactElement {
  return (
    <GlassPanel variant="default" size="lg" className={className}>
      <div className="flex flex-col items-center py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-ui-accent-primary-bg flex items-center justify-center mb-4">
          <MemoryIcon />
        </div>

        <h3 className="text-lg font-semibold text-ui-text-primary mb-2">
          Your memory graph is empty
        </h3>

        <p className="text-sm text-ui-text-secondary max-w-sm mb-6">
          Start building your cognitive landscape by creating your first memory. Memories can be
          thoughts, ideas, experiences, or any information you want to remember.
        </p>

        <div className="space-y-3">
          {onCreateMemory && (
            <button onClick={onCreateMemory} className="btn-primary">
              <span className="mr-2">+</span>
              Create First Memory
            </button>
          )}

          <div className="text-xs text-ui-text-tertiary">
            <p>Quick tips:</p>
            <ul className="mt-1 space-y-1">
              <li>• Use sectors to categorize memories</li>
              <li>• Link related memories together</li>
              <li>• Add tags for easy searching</li>
            </ul>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Empty Cognitive Results Component
// ============================================================================

/**
 * EmptyCognitiveResults - Empty state for cognitive analysis results
 *
 * Requirements: 37.2, 37.5
 */
export function EmptyCognitiveResults({
  operationType = 'analysis',
  onStartAnalysis,
  className = '',
}: EmptyCognitiveResultsProps): React.ReactElement {
  const operationLabels: Record<string, { title: string; description: string; action: string }> = {
    analysis: {
      title: 'No analysis results yet',
      description:
        'Run a cognitive analysis to gain insights about your reasoning and identify potential biases.',
      action: 'Start Analysis',
    },
    reasoning: {
      title: 'No reasoning results',
      description:
        'Submit a problem or question to see parallel reasoning streams and synthesized insights.',
      action: 'Start Reasoning',
    },
    emotion: {
      title: 'No emotion analysis',
      description: 'Analyze text to understand emotional content using the Circumplex model.',
      action: 'Analyze Emotions',
    },
    confidence: {
      title: 'No confidence assessment',
      description: 'Assess the confidence level of your reasoning across multiple dimensions.',
      action: 'Assess Confidence',
    },
    bias: {
      title: 'No bias detection results',
      description: 'Detect cognitive biases in your thinking and get correction strategies.',
      action: 'Detect Biases',
    },
    decomposition: {
      title: 'No problem decomposition',
      description:
        'Break down complex problems into manageable sub-problems with dependency mapping.',
      action: 'Decompose Problem',
    },
  };

  // Get config with fallback to analysis - use non-null assertion since we know analysis always exists
  const defaultConfig = {
    title: 'No analysis results yet',
    description:
      'Run a cognitive analysis to gain insights about your reasoning and identify potential biases.',
    action: 'Start Analysis',
  };
  const foundConfig = operationLabels[operationType];
  const config = foundConfig ?? defaultConfig;

  return (
    <GlassPanel variant="sunken" size="md" className={className}>
      <div className="flex flex-col items-center py-6 text-center">
        <div className="w-14 h-14 rounded-full bg-ui-accent-secondary-bg flex items-center justify-center mb-4">
          <BrainIcon />
        </div>

        <h3 className="text-base font-semibold text-ui-text-primary mb-2">{config.title}</h3>

        <p className="text-sm text-ui-text-secondary max-w-xs mb-4">{config.description}</p>

        {onStartAnalysis && (
          <button onClick={onStartAnalysis} className="btn-secondary text-sm">
            {config.action}
          </button>
        )}
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Empty Graph State Component
// ============================================================================

/**
 * EmptyGraphState - Empty state for graph with no connections
 *
 * Requirements: 37.2, 37.5
 */
export function EmptyGraphState({
  onCreateLink,
  className = '',
}: {
  onCreateLink?: () => void;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`flex flex-col items-center py-6 text-center ${className}`}>
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full bg-ui-accent-highlight-bg flex items-center justify-center animate-pulse-slow">
          <GraphIcon />
        </div>
        {/* Decorative connection lines */}
        <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-ui-accent-primary/20" />
        <div className="absolute -bottom-1 -right-3 w-3 h-3 rounded-full bg-ui-accent-secondary/20" />
      </div>

      <h3 className="text-base font-semibold text-ui-text-primary mb-2">No connections yet</h3>

      <p className="text-sm text-ui-text-secondary max-w-xs mb-4">
        This memory stands alone. Create links to other memories to build your knowledge graph.
      </p>

      {onCreateLink && (
        <button onClick={onCreateLink} className="btn-primary text-sm">
          Create Link
        </button>
      )}
    </div>
  );
}

export default EmptyState;
