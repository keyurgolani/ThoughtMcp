/**
 * Skeleton Component
 *
 * Skeleton loaders for loading states with shimmer animation.
 * Provides various skeleton variants for different UI elements.
 *
 * Requirements: 31.6, 37.1
 */

// ============================================================================
// Types
// ============================================================================

export interface SkeletonProps {
  /** Width of the skeleton (CSS value or Tailwind class) */
  width?: string;
  /** Height of the skeleton (CSS value or Tailwind class) */
  height?: string;
  /** Whether to use rounded corners */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /** Animation variant */
  animation?: 'shimmer' | 'pulse' | 'none';
  /** Additional CSS classes */
  className?: string;
}

export interface SkeletonTextProps {
  /** Number of lines to display */
  lines?: number;
  /** Width of the last line (percentage) */
  lastLineWidth?: string;
  /** Line spacing */
  spacing?: 'tight' | 'normal' | 'loose';
  /** Additional CSS classes */
  className?: string;
}

export interface SkeletonCardProps {
  /** Whether to show header skeleton */
  showHeader?: boolean;
  /** Whether to show avatar skeleton */
  showAvatar?: boolean;
  /** Number of text lines */
  lines?: number;
  /** Whether to show footer/metadata */
  showFooter?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface SkeletonPanelProps {
  /** Panel variant */
  variant?: 'default' | 'compact' | 'detailed';
  /** Whether to show title */
  showTitle?: boolean;
  /** Number of content sections */
  sections?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Base Skeleton Component
// ============================================================================

/**
 * Skeleton - Base skeleton loader with shimmer animation
 *
 * Requirements: 31.6, 37.1
 */
export function Skeleton({
  width = 'w-full',
  height = 'h-4',
  rounded = 'md',
  animation = 'shimmer',
  className = '',
}: SkeletonProps): React.ReactElement {
  const roundedClasses: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  const animationClasses: Record<string, string> = {
    shimmer: 'skeleton',
    pulse: 'animate-pulse bg-ui-border/30',
    none: 'bg-ui-border/20',
  };

  const animationClass = animationClasses[animation] ?? 'skeleton';
  const roundedClass = roundedClasses[rounded] ?? 'rounded-md';

  return (
    <div
      className={`
        ${animationClass}
        ${width} ${height}
        ${roundedClass}
        ${className}
      `}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// Skeleton Text Component
// ============================================================================

/**
 * SkeletonText - Multiple line text skeleton
 *
 * Requirements: 31.6, 37.1
 */
export function SkeletonText({
  lines = 3,
  lastLineWidth = 'w-3/4',
  spacing = 'normal',
  className = '',
}: SkeletonTextProps): React.ReactElement {
  const spacingClasses: Record<string, string> = {
    tight: 'space-y-1',
    normal: 'space-y-2',
    loose: 'space-y-3',
  };

  const spacingClass = spacingClasses[spacing] ?? 'space-y-2';

  return (
    <div className={`${spacingClass} ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? lastLineWidth : 'w-full'} height="h-4" />
      ))}
    </div>
  );
}

// ============================================================================
// Skeleton Card Component
// ============================================================================

/**
 * SkeletonCard - Card-shaped skeleton for memory cards, etc.
 *
 * Requirements: 31.6, 37.1
 */
export function SkeletonCard({
  showHeader = true,
  showAvatar = false,
  lines = 2,
  showFooter = false,
  className = '',
}: SkeletonCardProps): React.ReactElement {
  return (
    <div
      className={`
        glass-panel p-4 space-y-4
        ${className}
      `}
      aria-hidden="true"
    >
      {showHeader && (
        <div className="flex items-center gap-3">
          {showAvatar && <Skeleton width="w-10" height="h-10" rounded="full" />}
          <div className="flex-1 space-y-2">
            <Skeleton width="w-1/3" height="h-4" />
            <Skeleton width="w-1/4" height="h-3" />
          </div>
        </div>
      )}
      <SkeletonText lines={lines} />
      {showFooter && (
        <div className="flex items-center justify-between pt-2 border-t border-ui-border/30">
          <Skeleton width="w-20" height="h-3" />
          <Skeleton width="w-16" height="h-3" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Skeleton Memory Node Component
// ============================================================================

/**
 * SkeletonMemoryNode - Skeleton for memory node cards
 *
 * Requirements: 31.6, 37.1
 */
export function SkeletonMemoryNode({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <div
      className={`
        glass-panel p-4 space-y-3
        ${className}
      `}
      aria-hidden="true"
    >
      {/* Sector badge */}
      <div className="flex items-center justify-between">
        <Skeleton width="w-20" height="h-5" rounded="full" />
        <Skeleton width="w-8" height="h-4" />
      </div>
      {/* Content */}
      <SkeletonText lines={2} lastLineWidth="w-2/3" />
      {/* Metadata */}
      <div className="flex items-center gap-4 pt-2">
        <Skeleton width="w-16" height="h-3" />
        <Skeleton width="w-16" height="h-3" />
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton List Component
// ============================================================================

/**
 * SkeletonList - List of skeleton items
 *
 * Requirements: 31.6, 37.1
 */
export function SkeletonList({
  count = 3,
  itemHeight = 'h-16',
  className = '',
}: {
  count?: number;
  itemHeight?: string;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} height={itemHeight} />
      ))}
    </div>
  );
}

// ============================================================================
// Skeleton Chart Component
// ============================================================================

/**
 * SkeletonChart - Skeleton for chart/visualization areas
 *
 * Requirements: 31.6, 37.1
 */
export function SkeletonChart({
  height = 'h-48',
  className = '',
}: {
  height?: string;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={`
        glass-panel-sunken p-4
        ${className}
      `}
      aria-hidden="true"
    >
      <Skeleton width="w-full" height={height} />
    </div>
  );
}

// ============================================================================
// Skeleton Panel Content Component
// ============================================================================

/**
 * SkeletonPanelContent - Skeleton for panel content areas
 *
 * Requirements: 31.6, 37.1
 */
export function SkeletonPanelContent({
  variant = 'default',
  showTitle = true,
  sections = 2,
  className = '',
}: SkeletonPanelProps): React.ReactElement {
  const renderSection = (index: number): React.ReactElement => {
    if (variant === 'compact') {
      return (
        <div key={index} className="space-y-2">
          <Skeleton width="w-1/4" height="h-3" />
          <Skeleton width="w-full" height="h-4" />
        </div>
      );
    }

    if (variant === 'detailed') {
      return (
        <div key={index} className="space-y-3">
          <Skeleton width="w-1/3" height="h-4" />
          <SkeletonText lines={3} lastLineWidth="w-2/3" />
          <div className="flex gap-2">
            <Skeleton width="w-16" height="h-6" rounded="full" />
            <Skeleton width="w-16" height="h-6" rounded="full" />
          </div>
        </div>
      );
    }

    // Default variant
    return (
      <div key={index} className="space-y-2">
        <Skeleton width="w-1/3" height="h-4" />
        <SkeletonText lines={2} lastLineWidth="w-3/4" />
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`} aria-hidden="true">
      {showTitle && (
        <div className="pb-2 border-b border-ui-border/30">
          <Skeleton width="w-1/2" height="h-5" />
        </div>
      )}
      {Array.from({ length: sections }).map((_, index) => renderSection(index))}
    </div>
  );
}

// ============================================================================
// Skeleton List Item Component
// ============================================================================

/**
 * SkeletonListItem - Single list item skeleton
 *
 * Requirements: 31.6, 37.1
 */
export function SkeletonListItem({
  showIcon = true,
  showSecondaryText = true,
  showAction = false,
  className = '',
}: {
  showIcon?: boolean;
  showSecondaryText?: boolean;
  showAction?: boolean;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-md bg-ui-surface/50 ${className}`}
      aria-hidden="true"
    >
      {showIcon && <Skeleton width="w-8" height="h-8" rounded="md" />}
      <div className="flex-1 space-y-1.5">
        <Skeleton width="w-3/4" height="h-4" />
        {showSecondaryText && <Skeleton width="w-1/2" height="h-3" />}
      </div>
      {showAction && <Skeleton width="w-6" height="h-6" rounded="md" />}
    </div>
  );
}

// ============================================================================
// Skeleton Search Result Component
// ============================================================================

/**
 * SkeletonSearchResult - Skeleton for search result items
 *
 * Requirements: 31.6, 37.1
 */
export function SkeletonSearchResult({
  count = 3,
  className = '',
}: {
  count?: number;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-2 rounded-md hover:bg-ui-surface/30">
          <Skeleton width="w-3" height="h-3" rounded="full" />
          <div className="flex-1 space-y-1">
            <Skeleton width="w-2/3" height="h-4" />
            <Skeleton width="w-1/3" height="h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Skeleton Cognitive Result Component
// ============================================================================

/**
 * SkeletonCognitiveResult - Skeleton for cognitive processing results
 *
 * Requirements: 31.6, 37.1
 */
export function SkeletonCognitiveResult({
  showChart = true,
  showMetrics = true,
  className = '',
}: {
  showChart?: boolean;
  showMetrics?: boolean;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`space-y-4 ${className}`} aria-hidden="true">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton width="w-1/3" height="h-5" />
        <Skeleton width="w-20" height="h-6" rounded="full" />
      </div>

      {/* Chart area */}
      {showChart && (
        <div className="glass-panel-sunken p-4">
          <Skeleton width="w-full" height="h-40" />
        </div>
      )}

      {/* Metrics */}
      {showMetrics && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="glass-panel p-3 space-y-2">
              <Skeleton width="w-1/2" height="h-3" />
              <Skeleton width="w-3/4" height="h-6" />
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      <SkeletonText lines={2} lastLineWidth="w-2/3" />
    </div>
  );
}

// ============================================================================
// Skeleton Graph Node Component (for 3D loading)
// ============================================================================

/**
 * SkeletonGraphNode - Skeleton placeholder for graph nodes during loading
 *
 * Requirements: 31.6, 37.1
 */
export function SkeletonGraphNode({
  count = 5,
  className = '',
}: {
  count?: number;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`flex flex-wrap gap-4 justify-center ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col items-center gap-2 animate-pulse"
          style={{ animationDelay: `${String(index * 100)}ms` }}
        >
          <div className="w-12 h-12 rounded-full bg-ui-accent-primary/20 animate-glow-slow" />
          <Skeleton width="w-16" height="h-3" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
