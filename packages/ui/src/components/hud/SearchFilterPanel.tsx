/**
 * SearchFilterPanel Component
 *
 * HUD panel for searching and filtering memory nodes.
 * Provides text search, sector filters, threshold sliders, and search results.
 * Positioned in top-right corner with minimal footprint and collapsible design.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 27.1, 27.6
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GraphNode, MemorySectorType } from '../../types/api';
import { VALID_SECTORS } from '../../types/api';
import { filterNodes } from '../../utils/filters';
import { getSectorColor } from '../../utils/visualization';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect if the user is on macOS using userAgentData or userAgent fallback
 */
function isMacOS(): boolean {
  // Modern approach using userAgentData
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = nav.userAgentData?.platform;
  if (typeof platform === 'string' && platform.length > 0) {
    return platform.toLowerCase().includes('mac');
  }
  // Fallback to userAgent
  return navigator.userAgent.toLowerCase().includes('mac');
}

// ============================================================================
// Types
// ============================================================================

export interface SearchFilterPanelProps {
  /** All visible nodes to filter */
  nodes: GraphNode[];
  /** Current search query */
  searchQuery?: string;
  /** Current selected sectors */
  selectedSectors?: MemorySectorType[];
  /** Current minimum strength threshold */
  minStrength?: number;
  /** Current minimum salience threshold */
  minSalience?: number;
  /** Callback when search query changes */
  onSearchChange?: (query: string) => void;
  /** Callback when sector selection changes */
  onSectorChange?: (sectors: MemorySectorType[]) => void;
  /** Callback when strength threshold changes */
  onStrengthChange?: (minStrength: number) => void;
  /** Callback when salience threshold changes */
  onSalienceChange?: (minSalience: number) => void;
  /** Callback when a search result is clicked */
  onResultClick?: (nodeId: string) => void;
  /** Whether the panel is expanded */
  isExpanded?: boolean;
  /** Callback to toggle panel expansion */
  onToggleExpand?: () => void;
  /** Whether to use compact mode for minimal footprint */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Sector display names */
const SECTOR_NAMES: Record<MemorySectorType, string> = {
  episodic: 'Episodic',
  semantic: 'Semantic',
  procedural: 'Procedural',
  emotional: 'Emotional',
  reflective: 'Reflective',
};

/** Maximum number of search results to display */
const MAX_RESULTS = 10;

// ============================================================================
// Sub-Components
// ============================================================================

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Glassmorphism panel wrapper with semi-transparent background,
 * blur effect, and glowing purple borders.
 * Requirements: 23.5
 */
function GlassPanel({ children, className = '' }: GlassPanelProps): React.ReactElement {
  return (
    <div
      className={`floating-rounded-xl floating-glow ${className}`}
      style={{
        background: 'var(--theme-surface)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--theme-secondary-glow)',
        boxShadow: `
          0 0 20px var(--theme-secondary-glow),
          0 0 40px var(--theme-secondary-bg),
          inset 0 0 30px var(--theme-secondary-bg)
        `,
        borderRadius: '1rem',
      }}
    >
      {children}
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onInputRef: (el: HTMLInputElement | null) => void;
}

/**
 * Search input with keyboard shortcut indicator
 * Requirements: 7.1, 7.7
 */
function SearchInput({
  value,
  onChange,
  onFocus,
  onInputRef,
}: SearchInputProps): React.ReactElement {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className="h-4 w-4 text-ui-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        ref={onInputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onFocus={onFocus}
        placeholder="Search memories..."
        className="
          w-full pl-10 pr-16 py-2
          bg-ui-background
          border border-ui-border
          rounded-lg
          text-ui-text-primary
          text-sm
          placeholder-ui-text-muted
          focus:outline-none
          focus:border-ui-accent-primary
          focus:ring-1
          focus:ring-ui-accent-primary
          transition-colors
        "
        aria-label="Search memories"
      />
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <kbd className="px-1.5 py-0.5 text-xs bg-ui-border rounded text-ui-text-muted font-mono">
          {isMacOS() ? '⌘K' : 'Ctrl+K'}
        </kbd>
      </div>
    </div>
  );
}

interface SectorToggleProps {
  sector: MemorySectorType;
  isSelected: boolean;
  onToggle: () => void;
}

/**
 * Toggle button for a sector type
 * Requirements: 7.2
 */
function SectorToggle({ sector, isSelected, onToggle }: SectorToggleProps): React.ReactElement {
  const color = getSectorColor(sector);

  return (
    <button
      onClick={onToggle}
      className={`
        px-2 py-1 text-xs rounded-full
        transition-all duration-200
        ${
          isSelected
            ? 'ring-1 ring-offset-1 ring-offset-ui-background'
            : 'opacity-50 hover:opacity-75'
        }
      `}
      style={{
        backgroundColor: isSelected ? `${color}30` : 'transparent',
        color: color,
        borderColor: color,
        border: '1px solid',
      }}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? 'Hide' : 'Show'} ${SECTOR_NAMES[sector]} memories`}
    >
      {SECTOR_NAMES[sector]}
    </button>
  );
}

interface ThresholdSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  id: string;
}

/**
 * Slider for threshold values
 * Requirements: 7.3, 7.4
 */
function ThresholdSlider({ label, value, onChange, id }: ThresholdSliderProps): React.ReactElement {
  const percentage = Math.round(value * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="text-xs text-ui-text-secondary">
          {label}
        </label>
        <span className="text-xs text-ui-text-primary font-mono">{percentage}%</span>
      </div>
      <input
        id={id}
        type="range"
        min="0"
        max="100"
        value={percentage}
        onChange={(e) => {
          onChange(parseInt(e.target.value, 10) / 100);
        }}
        className="
          w-full h-1.5
          bg-ui-border
          rounded-full
          appearance-none
          cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-ui-accent-primary
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-125
          [&::-moz-range-thumb]:w-3
          [&::-moz-range-thumb]:h-3
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-ui-accent-primary
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer
        "
        aria-label={`${label} threshold`}
      />
    </div>
  );
}

interface SearchResultItemProps {
  node: GraphNode;
  onClick: () => void;
}

/**
 * Single search result item
 * Requirements: 7.5, 7.6
 */
function SearchResultItem({ node, onClick }: SearchResultItemProps): React.ReactElement {
  const sectorColor = getSectorColor(node.primarySector);
  const contentPreview =
    node.content.length > 80 ? node.content.substring(0, 80) + '...' : node.content;

  return (
    <button
      onClick={onClick}
      className="
        w-full p-2 text-left
        bg-ui-background/50
        hover:bg-ui-accent-primary/10
        rounded-lg
        transition-colors
        group
      "
      aria-label={`Navigate to memory: ${contentPreview}`}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: sectorColor }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ui-text-primary truncate group-hover:text-ui-accent-primary transition-colors">
            {contentPreview}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-ui-text-muted" style={{ color: sectorColor }}>
              {SECTOR_NAMES[node.primarySector]}
            </span>
            <span className="text-xs text-ui-text-muted">
              Salience: {Math.round(node.salience * 100)}%
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * SearchFilterPanel - HUD panel for searching and filtering memories
 *
 * Features:
 * - Text search with Cmd/Ctrl+K keyboard shortcut
 * - Sector type filter toggles
 * - Strength and salience threshold sliders
 * - Search results list with click-to-navigate
 * - Glassmorphism styling
 * - Compact mode for minimal footprint (Requirement 27.1, 27.6)
 * - Collapsible design to maximize viewport
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 27.1, 27.6
 */
export function SearchFilterPanel({
  nodes,
  searchQuery = '',
  selectedSectors = [...VALID_SECTORS],
  minStrength = 0,
  minSalience = 0,
  onSearchChange,
  onSectorChange,
  onStrengthChange,
  onSalienceChange,
  onResultClick,
  isExpanded = true,
  onToggleExpand,
  compact = false,
  className = '',
}: SearchFilterPanelProps): React.ReactElement {
  const inputElementRef = useRef<HTMLInputElement | null>(null);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showResults, setShowResults] = useState(false);

  // Callback ref for the input element
  const handleInputRef = useCallback((el: HTMLInputElement | null): void => {
    inputElementRef.current = el;
  }, []);

  // Sync local query with prop
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Keyboard shortcut handler (Cmd/Ctrl+K)
  // Requirements: 7.7
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const modifier = isMacOS() ? event.metaKey : event.ctrlKey;

      if (modifier && event.key === 'k') {
        event.preventDefault();
        if (inputElementRef.current !== null) {
          inputElementRef.current.focus();
        }
        setShowResults(true);
      }

      // Close results on Escape
      if (event.key === 'Escape' && showResults) {
        setShowResults(false);
        if (inputElementRef.current !== null) {
          inputElementRef.current.blur();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showResults]);

  // Handle search query change
  const handleSearchChange = useCallback(
    (value: string): void => {
      setLocalQuery(value);
      if (onSearchChange) {
        onSearchChange(value);
      }
      setShowResults(value.length > 0);
    },
    [onSearchChange]
  );

  // Handle sector toggle
  const handleSectorToggle = useCallback(
    (sector: MemorySectorType): void => {
      const isSelected = selectedSectors.includes(sector);
      let newSectors: MemorySectorType[];

      if (isSelected) {
        // Don't allow deselecting all sectors
        if (selectedSectors.length === 1) {
          return;
        }
        newSectors = selectedSectors.filter((s) => s !== sector);
      } else {
        newSectors = [...selectedSectors, sector];
      }

      if (onSectorChange) {
        onSectorChange(newSectors);
      }
    },
    [selectedSectors, onSectorChange]
  );

  // Handle result click
  const handleResultClick = useCallback(
    (nodeId: string): void => {
      if (onResultClick) {
        onResultClick(nodeId);
      }
      setShowResults(false);
      setLocalQuery('');
      if (onSearchChange) {
        onSearchChange('');
      }
    },
    [onResultClick, onSearchChange]
  );

  // Filter nodes based on current criteria
  // Requirements: 7.1, 7.2, 7.3, 7.4
  const filteredNodes = useMemo(() => {
    return filterNodes(nodes, {
      query: localQuery,
      sectors: selectedSectors,
      minStrength,
      minSalience,
    });
  }, [nodes, localQuery, selectedSectors, minStrength, minSalience]);

  // Get search results (limited)
  // Requirements: 7.5
  const searchResults = useMemo(() => {
    if (!localQuery.trim()) {
      return [];
    }
    return filteredNodes.slice(0, MAX_RESULTS);
  }, [filteredNodes, localQuery]);

  // Count of filtered nodes
  const filteredCount = filteredNodes.length;
  const totalCount = nodes.length;

  // Compact mode: show only collapsed toggle when not expanded
  // Requirements: 27.1, 27.6
  if (compact && !isExpanded) {
    return (
      <GlassPanel className={`p-2 ${className}`}>
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-2 text-ui-text-secondary hover:text-ui-accent-primary transition-colors"
          aria-label="Expand search & filter panel"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="text-xs font-medium">Search</span>
          <kbd className="px-1 py-0.5 text-xs bg-ui-border rounded text-ui-text-muted font-mono">
            {isMacOS() ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </button>
      </GlassPanel>
    );
  }

  // Panel width based on compact mode - matches RelatedMemoriesSidebar width (w-96)
  const panelWidth = compact ? 'w-96' : 'w-96';

  return (
    <GlassPanel className={`p-3 ${panelWidth} ${className}`}>
      {/* Search Input - Requirements: 7.1, 7.7 */}
      <SearchInput
        value={localQuery}
        onChange={handleSearchChange}
        onFocus={() => {
          setShowResults(localQuery.length > 0);
        }}
        onInputRef={handleInputRef}
      />

      {/* Search Results - Requirements: 7.5, 7.6 */}
      {showResults && searchResults.length > 0 && (
        <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
          <div className="text-xs text-ui-text-muted mb-1">
            {searchResults.length} of {filteredCount} results
          </div>
          {searchResults.map((node) => (
            <SearchResultItem
              key={node.id}
              node={node}
              onClick={() => {
                handleResultClick(node.id);
              }}
            />
          ))}
          {filteredCount > MAX_RESULTS && (
            <div className="text-xs text-ui-text-muted text-center py-1">
              +{filteredCount - MAX_RESULTS} more results
            </div>
          )}
        </div>
      )}

      {/* No results message */}
      {showResults && localQuery.trim() && searchResults.length === 0 && (
        <div className="mt-2 p-3 text-center text-sm text-ui-text-muted">
          No memories found matching "{localQuery}"
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <>
          {/* Sector Filters - Requirements: 7.2 */}
          <div className="mt-3">
            <div className="text-xs text-ui-text-secondary mb-1.5">Sectors</div>
            <div className="flex flex-wrap gap-1">
              {VALID_SECTORS.map((sector) => (
                <SectorToggle
                  key={sector}
                  sector={sector}
                  isSelected={selectedSectors.includes(sector)}
                  onToggle={() => {
                    handleSectorToggle(sector);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Threshold Sliders - Requirements: 7.3, 7.4 */}
          <div className="mt-3 space-y-2">
            <ThresholdSlider
              id="strength-slider"
              label="Min Strength"
              value={minStrength}
              onChange={(value) => {
                onStrengthChange?.(value);
              }}
            />
            <ThresholdSlider
              id="salience-slider"
              label="Min Salience"
              value={minSalience}
              onChange={(value) => {
                onSalienceChange?.(value);
              }}
            />
          </div>

          {/* Filter summary - compact version */}
          <div className="mt-3 pt-2 border-t border-ui-border">
            <div className="flex justify-between items-center text-xs">
              <span className="text-ui-text-secondary">Showing</span>
              <span className="text-ui-text-primary font-medium">
                {filteredCount}/{totalCount}
              </span>
            </div>
          </div>
        </>
      )}
    </GlassPanel>
  );
}

export default SearchFilterPanel;
