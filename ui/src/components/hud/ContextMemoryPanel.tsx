/**
 * ContextMemoryPanel Component
 *
 * Displays relevant memories alongside reasoning operations.
 * Shows relevance scores and allows include/exclude toggles for memory-augmented reasoning.
 *
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5
 */

import { useCallback } from 'react';
import type { ContextMemory } from '../../stores/cognitiveStore';
import { useCognitiveStore } from '../../stores/cognitiveStore';
import { getSectorColor } from '../../utils/visualization';

// ============================================================================
// Types
// ============================================================================

export interface ContextMemoryPanelProps {
  /** Callback when user clicks to navigate to a memory */
  onNavigateToMemory?: (memoryId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Glassmorphism panel wrapper
 */
function GlassPanel({ children, className = '' }: GlassPanelProps): React.ReactElement {
  return (
    <div
      className={`
        bg-ui-surface
        backdrop-blur-glass
        border border-ui-border
        rounded-lg
        shadow-glow
        ${className}
      `}
      style={{
        boxShadow: `
          0 0 20px rgba(0, 255, 255, 0.15),
          inset 0 0 30px rgba(0, 255, 255, 0.05)
        `,
      }}
    >
      {children}
    </div>
  );
}

interface RelevanceBarProps {
  score: number;
}

/**
 * Visual relevance score bar
 * Requirements: 22.2
 */
function RelevanceBar({ score }: RelevanceBarProps): React.ReactElement {
  const percentage = Math.round(score * 100);
  const barColor = score >= 0.7 ? 'bg-green-500' : score >= 0.4 ? 'bg-yellow-500' : 'bg-orange-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-ui-border rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${String(percentage)}%` }}
        />
      </div>
      <span className="text-xs text-ui-text-secondary w-8 text-right">{String(percentage)}%</span>
    </div>
  );
}

interface ContextMemoryItemProps {
  contextMemory: ContextMemory;
  onToggleInclude: (memoryId: string) => void;
  onNavigate: ((memoryId: string) => void) | undefined;
}

/**
 * Individual context memory item
 * Requirements: 22.1, 22.2, 22.3, 22.4
 */
function ContextMemoryItem({
  contextMemory,
  onToggleInclude,
  onNavigate,
}: ContextMemoryItemProps): React.ReactElement {
  const { memory, relevanceScore, isIncluded, influencedResult } = contextMemory;
  const sectorColor = getSectorColor(memory.primarySector);

  // Truncate content for preview
  const contentPreview =
    memory.content.length > 100 ? memory.content.substring(0, 100) + '...' : memory.content;

  return (
    <div
      className={`
        p-3 rounded-lg border transition-all duration-200
        ${isIncluded ? 'border-ui-accent-primary/50 bg-ui-accent-primary/10' : 'border-ui-border bg-ui-surface/50'}
        ${influencedResult === true ? 'ring-1 ring-green-500/50' : ''}
      `}
    >
      {/* Header with sector indicator and toggle */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Sector color indicator */}
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: sectorColor }}
            title={memory.primarySector}
          />
          <span className="text-xs text-ui-text-secondary capitalize">{memory.primarySector}</span>
          {/* Influence indicator */}
          {influencedResult === true && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <InfluenceIcon />
              Influenced
            </span>
          )}
        </div>
        {/* Include/Exclude toggle - Requirements: 22.3 */}
        <button
          onClick={() => {
            onToggleInclude(memory.id);
          }}
          className={`
            px-2 py-0.5 rounded text-xs font-medium transition-colors
            ${isIncluded ? 'bg-ui-accent-primary/20 text-ui-accent-primary' : 'bg-ui-border text-ui-text-muted hover:text-ui-text-primary'}
          `}
          aria-label={isIncluded ? 'Exclude from reasoning' : 'Include in reasoning'}
        >
          {isIncluded ? 'Included' : 'Excluded'}
        </button>
      </div>

      {/* Content preview */}
      <p className="text-sm text-ui-text-primary mb-2 line-clamp-2">{contentPreview}</p>

      {/* Relevance score - Requirements: 22.2 */}
      <div className="mb-2">
        <span className="text-xs text-ui-text-secondary">Relevance</span>
        <RelevanceBar score={relevanceScore} />
      </div>

      {/* Navigate button - Requirements: 22.5 */}
      {onNavigate !== undefined && (
        <button
          onClick={() => {
            onNavigate(memory.id);
          }}
          className="text-xs text-ui-accent-primary hover:text-ui-accent-secondary transition-colors flex items-center gap-1"
        >
          <NavigateIcon />
          View in Explorer
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function InfluenceIcon(): React.ReactElement {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function NavigateIcon(): React.ReactElement {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function ContextIcon(): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ContextMemoryPanel - Display relevant memories for reasoning context
 *
 * Features:
 * - Display relevant memories alongside reasoning (Requirement 22.1)
 * - Show relevance scores (Requirement 22.2)
 * - Include/exclude toggles (Requirement 22.3)
 * - Influence attribution indicators (Requirement 22.4)
 * - Navigation to memory in Explorer (Requirement 22.5)
 *
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5
 */
export function ContextMemoryPanel({
  onNavigateToMemory,
  className = '',
}: ContextMemoryPanelProps): React.ReactElement {
  // Get context memories from cognitive store
  const contextMemories = useCognitiveStore((state) => state.contextMemories);
  const toggleContextMemoryInclusion = useCognitiveStore(
    (state) => state.toggleContextMemoryInclusion
  );

  // Handle toggle include/exclude
  const handleToggleInclude = useCallback(
    (memoryId: string) => {
      toggleContextMemoryInclusion(memoryId);
    },
    [toggleContextMemoryInclusion]
  );

  // Handle navigation to memory
  const handleNavigate = useCallback(
    (memoryId: string) => {
      onNavigateToMemory?.(memoryId);
    },
    [onNavigateToMemory]
  );

  // Count included and influenced memories
  const includedCount = contextMemories.filter((cm) => cm.isIncluded).length;
  const influencedCount = contextMemories.filter((cm) => cm.influencedResult === true).length;

  // If no context memories, show empty state
  if (contextMemories.length === 0) {
    return (
      <GlassPanel className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <ContextIcon />
          <h3 className="text-sm font-semibold text-ui-accent-primary">Context Memories</h3>
        </div>
        <p className="text-xs text-ui-text-secondary text-center py-4">
          No relevant memories found for the current reasoning context.
        </p>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ContextIcon />
          <h3 className="text-sm font-semibold text-ui-accent-primary">Context Memories</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-ui-text-secondary">
          <span>{includedCount} included</span>
          {influencedCount > 0 && (
            <>
              <span>•</span>
              <span className="text-green-400">{influencedCount} influenced</span>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-ui-text-secondary mb-4">
        Relevant memories that can inform the reasoning process. Toggle inclusion to control which
        memories are used.
      </p>

      {/* Context memory list - Requirements: 22.1 */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {contextMemories.map((contextMemory) => (
          <ContextMemoryItem
            key={contextMemory.memory.id}
            contextMemory={contextMemory}
            onToggleInclude={handleToggleInclude}
            onNavigate={onNavigateToMemory !== undefined ? handleNavigate : undefined}
          />
        ))}
      </div>
    </GlassPanel>
  );
}

export default ContextMemoryPanel;
