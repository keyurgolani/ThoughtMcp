/**
 * LinkFilterPanel Component
 *
 * Controls for filtering and manipulating memory graph links.
 * Allows users to toggle direct vs semantic links and set similarity thresholds.
 */

import { useCallback } from "react";
import type { GraphEdgeType } from "../../utils/graphEdges";

export interface LinkFilterPanelProps {
  /** Whether to show direct links (explicit mentions, tags) */
  showDirectLinks: boolean;
  /** Whether to show semantic/similarity links */
  showSemanticLinks: boolean;
  /** Similarity threshold for semantic links (0-1) */
  similarityThreshold: number;
  /** Callback when direct links toggle changes */
  onDirectLinksChange: (show: boolean) => void;
  /** Callback when semantic links toggle changes */
  onSemanticLinksChange: (show: boolean) => void;
  /** Callback when similarity threshold changes */
  onSimilarityThresholdChange: (threshold: number) => void;
  /** Whether the panel is collapsed */
  isCollapsed?: boolean;
  /** Callback to toggle collapse state */
  onToggleCollapse?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const LINK_TYPE_INFO: Record<GraphEdgeType, { label: string; color: string; description: string }> =
  {
    mention: { label: "Mentions", color: "#E8B86D", description: "Explicit wiki-link references" },
    tag: { label: "Tags", color: "#6BA3BE", description: "Shared tag connections" },
    similarity: { label: "Semantic", color: "#8B7BB5", description: "Embedding similarity" },
  };

export function LinkFilterPanel({
  showDirectLinks,
  showSemanticLinks,
  similarityThreshold,
  onDirectLinksChange,
  onSemanticLinksChange,
  onSimilarityThresholdChange,
  isCollapsed = false,
  onToggleCollapse,
  className = "",
}: LinkFilterPanelProps): React.ReactElement {
  const handleThresholdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSimilarityThresholdChange(parseInt(e.target.value, 10) / 100);
    },
    [onSimilarityThresholdChange]
  );

  if (isCollapsed) {
    return (
      <div
        className={`floating-rounded-xl floating-glow p-2 ${className}`}
        style={{
          background: "var(--theme-surface)",
          backdropFilter: "blur(16px)",
          border: "1px solid var(--theme-secondary-glow)",
        }}
      >
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 text-ui-text-secondary hover:text-ui-accent-primary transition-colors"
          aria-label="Expand link filters"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <span className="text-xs font-medium">Links</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`floating-rounded-xl floating-glow p-3 w-64 ${className}`}
      style={{
        background: "var(--theme-surface)",
        backdropFilter: "blur(16px)",
        border: "1px solid var(--theme-secondary-glow)",
        boxShadow: "0 0 20px var(--theme-secondary-glow), 0 0 40px var(--theme-secondary-bg)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-ui-text-primary">Link Filters</h3>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 text-ui-text-muted hover:text-ui-text-primary transition-colors"
            aria-label="Collapse link filters"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Direct Links Toggle */}
      <div className="space-y-2 mb-3">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={showDirectLinks}
            onChange={(e) => { onDirectLinksChange(e.target.checked); }}
            className="w-3.5 h-3.5 rounded border-ui-border bg-ui-background text-ui-accent-primary focus:ring-ui-accent-primary/50"
          />
          <span className="text-xs text-ui-text-secondary group-hover:text-ui-text-primary transition-colors">
            Direct Links
          </span>
        </label>
        <div className="ml-5 flex gap-1">
          <span
            className="px-1.5 py-0.5 text-[10px] rounded-full"
            style={{
              backgroundColor: `${LINK_TYPE_INFO.mention.color}20`,
              color: LINK_TYPE_INFO.mention.color,
            }}
          >
            Mentions
          </span>
          <span
            className="px-1.5 py-0.5 text-[10px] rounded-full"
            style={{
              backgroundColor: `${LINK_TYPE_INFO.tag.color}20`,
              color: LINK_TYPE_INFO.tag.color,
            }}
          >
            Tags
          </span>
        </div>
      </div>

      {/* Semantic Links Toggle */}
      <div className="space-y-2 mb-3">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={showSemanticLinks}
            onChange={(e) => { onSemanticLinksChange(e.target.checked); }}
            className="w-3.5 h-3.5 rounded border-ui-border bg-ui-background text-ui-accent-primary focus:ring-ui-accent-primary/50"
          />
          <span className="text-xs text-ui-text-secondary group-hover:text-ui-text-primary transition-colors">
            Semantic Links
          </span>
        </label>
        <div className="ml-5">
          <span
            className="px-1.5 py-0.5 text-[10px] rounded-full"
            style={{
              backgroundColor: `${LINK_TYPE_INFO.similarity.color}20`,
              color: LINK_TYPE_INFO.similarity.color,
            }}
          >
            Similarity
          </span>
        </div>
      </div>

      {/* Similarity Threshold Slider */}
      {showSemanticLinks && (
        <div className="pt-2 border-t border-ui-border/30">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-ui-text-secondary">Similarity Threshold</label>
            <span className="text-xs text-ui-text-primary font-mono">
              {Math.round(similarityThreshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(similarityThreshold * 100)}
            onChange={handleThresholdChange}
            className="w-full h-1.5 bg-ui-border rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ui-accent-primary
              [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-125"
            aria-label="Similarity threshold"
          />
          <p className="text-[10px] text-ui-text-muted mt-1">
            Higher = fewer, stronger connections
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-ui-border/30">
        <p className="text-[10px] text-ui-text-muted mb-1">Link Types:</p>
        <div className="flex flex-wrap gap-1">
          {Object.entries(LINK_TYPE_INFO).map(([type, info]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-3 h-0.5 rounded" style={{ backgroundColor: info.color }} />
              <span className="text-[10px] text-ui-text-muted">{info.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LinkFilterPanel;
