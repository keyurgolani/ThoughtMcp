/**
 * ProblemDecomposition Screen
 *
 * Dedicated screen for breaking down complex problems into manageable sub-problems.
 * Displays hierarchical decomposition with interactive tree visualization,
 * complexity estimates, and execution order.
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { getDefaultClient } from "../api/client";
import { BlockNotePreview } from "../components/hud/BlockNotePreview";
import {
  BarChart3,
  CircleDot,
  ClipboardList,
  DnaIcon,
  Link2,
  Microscope,
  RulerIcon,
  Search,
  Target,
  TreeIcon,
} from "../components/icons/Icons";
import { useSaveAsMemory } from "../hooks/useSaveAsMemory";
import { useCognitiveStore } from "../stores/cognitiveStore";
import type { DecomposeResponse, SubProblem } from "../types/api";

// ============================================================================
// Types
// ============================================================================

export interface ProblemDecompositionProps {
  /** User ID for memory operations */
  userId: string;
  /** Session ID for memory operations */
  sessionId: string;
  /** Additional CSS classes */
  className?: string;
  /** Callback when user wants to reason about a sub-problem */
  onReasonSubProblem?: (subProblem: SubProblem) => void;
  /** Callback when user wants to further decompose a sub-problem */
  onDecomposeSubProblem?: (subProblem: SubProblem) => void;
}

interface DecompositionContext {
  background: string;
  constraints: string[];
}

// ============================================================================
// Constants
// ============================================================================

const MAX_DEPTH_OPTIONS = [2, 3, 4, 5];

const COMPLEXITY_COLORS: Record<SubProblem["complexity"], string> = {
  low: "status-badge-success border",
  medium: "status-badge-warning border",
  high: "status-badge-error border",
};

const COMPLEXITY_ICONS: Record<SubProblem["complexity"], React.ReactElement> = {
  low: <CircleDot size={14} className="complexity-icon-low" />,
  medium: <CircleDot size={14} className="complexity-icon-medium" />,
  high: <CircleDot size={14} className="complexity-icon-high" />,
};

const COMPLEXITY_GLOW: Record<SubProblem["complexity"], string> = {
  low: "shadow-[0_0_10px_rgba(39,174,96,0.3)]",
  medium: "shadow-[0_0_10px_rgba(243,156,18,0.3)]",
  high: "shadow-[0_0_10px_rgba(231,76,60,0.3)]",
};

// ============================================================================
// Sub-Components
// ============================================================================

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Glassmorphism panel wrapper consistent with UI design
 */
function GlassPanel({ children, className = "" }: GlassPanelProps): React.ReactElement {
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

interface LoadingSpinnerProps {
  size?: number;
}

/**
 * Loading spinner component
 */
function LoadingSpinner({ size = 24 }: LoadingSpinnerProps): React.ReactElement {
  return (
    <svg
      className="animate-spin text-ui-accent-primary"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================================
// Problem Input Component
// Requirements: 19.1
// ============================================================================

interface ProblemInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

/**
 * Text input for the main problem
 * Requirements: 19.1
 */
function ProblemInput({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  onSubmit,
}: ProblemInputProps): React.ReactElement {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <GlassPanel className="p-4">
      <label
        htmlFor="decomposition-problem-input"
        className="block text-sm font-medium text-ui-accent-primary mb-2"
      >
        Problem to Decompose
      </label>
      <textarea
        ref={textareaRef}
        id="decomposition-problem-input"
        name="decomposition-problem-input"
        value={value}
        onChange={(e): void => {
          onChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Enter a complex problem you want to break down into manageable sub-problems..."
        className={`
          w-full h-40 p-3
          bg-ui-background/50 border border-ui-border rounded-lg
          text-ui-text-primary placeholder-ui-text-muted
          resize-none
          focus:outline-none focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        aria-describedby="decomposition-problem-hint"
      />
      <p id="decomposition-problem-hint" className="mt-2 text-xs text-ui-text-muted">
        Describe the complex problem you want to break down. The system will identify sub-problems,
        dependencies, and suggest an execution order. Press ⌘+Enter to decompose.
      </p>
    </GlassPanel>
  );
}

// ============================================================================
// Depth Selection Component
// ============================================================================

interface DepthSelectionProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * Get depth-specific icon
 */
function getDepthIcon(depth: number): React.ReactElement {
  switch (depth) {
    case 2:
      return <BarChart3 size={24} />;
    case 3:
      return <TreeIcon size="xl" />;
    case 4:
      return <Microscope size={24} />;
    case 5:
      return <DnaIcon size="xl" />;
    default:
      return <ClipboardList size={24} />;
  }
}

/**
 * Get depth-specific description
 */
function getDepthDescription(depth: number): string {
  switch (depth) {
    case 2:
      return "Quick overview";
    case 3:
      return "Balanced detail";
    case 4:
      return "Deep analysis";
    case 5:
      return "Maximum detail";
    default:
      return "";
  }
}

/**
 * Max depth selection for decomposition
 */
function DepthSelection({
  value,
  onChange,
  disabled = false,
}: DepthSelectionProps): React.ReactElement {
  return (
    <GlassPanel className="p-6">
      <h3 className="text-base font-semibold text-ui-accent-primary mb-4 flex items-center gap-2">
        <RulerIcon size="lg" />
        Maximum Decomposition Depth
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MAX_DEPTH_OPTIONS.map((depth) => {
          const isSelected = value === depth;

          return (
            <button
              key={depth}
              onClick={(): void => {
                onChange(depth);
              }}
              disabled={disabled}
              className={`
                p-4 rounded-lg text-left transition-all duration-normal relative
                border-2 group
                ${
                  isSelected
                    ? "border-ui-accent-primary bg-ui-accent-primary/15 text-ui-text-primary shadow-glow-sm"
                    : "bg-ui-background/50 border-ui-border text-ui-text-secondary hover:bg-ui-border/30 hover:border-ui-border-hover"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                ${isSelected ? "scale-[1.02]" : "hover:scale-[1.01]"}
              `}
              aria-pressed={isSelected}
            >
              {/* Depth icon */}
              <span
                className={`text-2xl mb-2 block transition-transform duration-normal origin-top-left ${isSelected ? "scale-110" : "group-hover:scale-105"}`}
              >
                {getDepthIcon(depth)}
              </span>
              <span
                className={`block text-sm font-semibold ${isSelected ? "text-ui-accent-primary" : ""}`}
              >
                {depth} levels
              </span>
              <span className="block text-xs opacity-70 mt-1.5 leading-relaxed">
                {getDepthDescription(depth)}
              </span>
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-ui-accent-primary animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ui-text-muted">
        Higher depth allows more granular decomposition but may take longer to process.
      </p>
    </GlassPanel>
  );
}

// ============================================================================
// Context Input Component (Optional)
// ============================================================================

interface ContextInputProps {
  context: DecompositionContext;
  onContextChange: (context: DecompositionContext) => void;
  disabled?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

/**
 * Optional context input for background and constraints
 */
function ContextInput({
  context,
  onContextChange,
  disabled = false,
  isExpanded,
  onToggleExpand,
}: ContextInputProps): React.ReactElement {
  const handleBackgroundChange = (value: string): void => {
    onContextChange({ ...context, background: value });
  };

  const handleConstraintsChange = (value: string): void => {
    onContextChange({
      ...context,
      constraints: value
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    });
  };

  return (
    <GlassPanel className="p-4">
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between text-sm font-medium text-ui-accent-secondary"
        aria-expanded={isExpanded}
      >
        <span>Additional Context (Optional)</span>
        <span className="text-ui-text-muted">{isExpanded ? "▼" : "▶"}</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="decomposition-context-background"
              className="block text-xs text-ui-text-secondary mb-1"
            >
              Background Information
            </label>
            <textarea
              id="decomposition-context-background"
              name="decomposition-context-background"
              value={context.background}
              onChange={(e): void => {
                handleBackgroundChange(e.target.value);
              }}
              disabled={disabled}
              placeholder="Provide relevant background context..."
              className={`
                w-full h-20 p-2
                bg-ui-background/50 border border-ui-border rounded
                text-sm text-ui-text-primary placeholder-ui-text-muted
                resize-none
                focus:outline-none focus:border-ui-accent-primary
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
            />
          </div>

          <div>
            <label
              htmlFor="decomposition-context-constraints"
              className="block text-xs text-ui-text-secondary mb-1"
            >
              Constraints (one per line)
            </label>
            <textarea
              id="decomposition-context-constraints"
              name="decomposition-context-constraints"
              value={context.constraints.join("\n")}
              onChange={(e): void => {
                handleConstraintsChange(e.target.value);
              }}
              disabled={disabled}
              placeholder="List any constraints or limitations..."
              className={`
                w-full h-20 p-2
                bg-ui-background/50 border border-ui-border rounded
                text-sm text-ui-text-primary placeholder-ui-text-muted
                resize-none
                focus:outline-none focus:border-ui-accent-primary
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
            />
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

// ============================================================================
// Tree Node Component
// Requirements: 19.2, 19.3, 19.4
// ============================================================================

interface TreeNodeProps {
  subProblem: SubProblem;
  depth: number;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onReason: (subProblem: SubProblem) => void;
  onDecompose: (subProblem: SubProblem) => void;
  expandedNodes: Set<string>;
}

/**
 * Individual tree node for sub-problem display
 * Requirements: 19.2, 19.3, 19.4
 */
function TreeNode({
  subProblem,
  depth,
  isExpanded,
  onToggleExpand,
  onReason,
  onDecompose,
  expandedNodes,
}: TreeNodeProps): React.ReactElement {
  const hasChildren = subProblem.children !== undefined && subProblem.children.length > 0;
  const complexityClass = COMPLEXITY_COLORS[subProblem.complexity];
  const complexityIcon = COMPLEXITY_ICONS[subProblem.complexity];
  const complexityGlow = COMPLEXITY_GLOW[subProblem.complexity];

  return (
    <div className="relative animate-fade-in">
      {/* Connection line from parent - enhanced with gradient */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 w-5 h-5 border-l-2 border-b-2 rounded-bl-lg"
          style={{
            marginLeft: "-1.25rem",
            marginTop: "0.75rem",
            borderColor: "rgba(0, 255, 255, 0.3)",
          }}
        />
      )}

      <div
        className={`
          p-4 rounded-xl border-2 transition-all duration-normal group
          bg-ui-background/40 backdrop-blur-sm
          hover:border-ui-accent-primary/50 hover:bg-ui-background/60
          ${isExpanded && hasChildren ? "border-ui-accent-primary/30" : "border-ui-border/50"}
        `}
      >
        {/* Header row with expand/collapse and description */}
        <div className="flex items-start gap-3">
          {/* Expand/Collapse button with animation */}
          {hasChildren && (
            <button
              onClick={(): void => {
                onToggleExpand(subProblem.id);
              }}
              className={`
                mt-0.5 p-1.5 rounded-lg transition-all duration-normal
                ${
                  isExpanded
                    ? "bg-ui-accent-primary/20 text-ui-accent-primary"
                    : "hover:bg-ui-border/50 text-ui-text-muted hover:text-ui-accent-primary"
                }
              `}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              <svg
                className={`w-4 h-4 transition-transform duration-normal ${isExpanded ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Placeholder for alignment when no children */}
          {!hasChildren && (
            <div className="w-8 h-8 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-ui-accent-primary/50" />
            </div>
          )}

          {/* Description */}
          <div className="flex-1 min-w-0">
            {subProblem.description.includes("Relevant context from previous interactions:") ? (
              <div className="text-sm text-ui-text-primary font-medium leading-relaxed">
                {/* Split and render memory context separately */}
                {(() => {
                  const contextMatch = subProblem.description.match(
                    /Relevant context from previous interactions:\s*([\s\S]*?)(?=\n\n|$)/
                  );
                  const mainDescription = subProblem.description
                    .replace(/Relevant context from previous interactions:[\s\S]*?(?=\n\n|$)/, "")
                    .trim();

                  return (
                    <>
                      {mainDescription && <p className="mb-2">{mainDescription}</p>}
                      {contextMatch && contextMatch[1] && (
                        <div className="mt-2 p-2 rounded-lg bg-ui-background/50 border border-ui-border/50">
                          <div className="text-xs text-ui-accent-secondary font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            Memory Context
                          </div>
                          <div className="text-xs">
                            <BlockNotePreview
                              content={contextMatch[1]
                                .replace(/^[\s-]*Known fact:\s*/gm, "")
                                .replace(/^[\s-]*Learned concept:\s*/gm, "")
                                .replace(/^[\s-]*Previous insight:\s*/gm, "")
                                .trim()}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-ui-text-primary font-medium leading-relaxed">
                {subProblem.description}
              </p>
            )}

            {/* Metadata row - Requirements: 19.4 - Enhanced styling */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Complexity badge with icon and glow */}
              <span
                className={`px-3 py-1 text-xs rounded-lg border font-semibold flex items-center gap-1.5 ${complexityClass} ${complexityGlow}`}
                title="Complexity estimate"
              >
                {complexityIcon}
                <span className="capitalize">{subProblem.complexity}</span>
              </span>

              {/* Execution order with enhanced styling */}
              <span
                className="px-3 py-1 text-xs rounded-lg bg-ui-accent-primary/15 text-ui-accent-primary border border-ui-accent-primary/40 font-semibold flex items-center gap-1.5"
                title="Execution order"
              >
                <ClipboardList size={12} />
                Order: {subProblem.executionOrder}
              </span>

              {/* Dependencies with tooltip */}
              {subProblem.dependencies.length > 0 && (
                <span
                  className="px-3 py-1 text-xs rounded-lg bg-ui-border/50 text-ui-text-muted border border-ui-border font-medium flex items-center gap-1.5"
                  title={`Depends on: ${subProblem.dependencies.join(", ")}`}
                >
                  <Link2 size={12} />
                  {subProblem.dependencies.length} dep
                  {subProblem.dependencies.length !== 1 ? "s" : ""}
                </span>
              )}

              {/* Children count indicator */}
              {hasChildren && (
                <span className="px-2 py-1 text-xs rounded-lg bg-ui-accent-secondary/15 text-ui-accent-secondary border border-ui-accent-secondary/30 font-medium">
                  {subProblem.children?.length} sub-tasks
                </span>
              )}
            </div>
          </div>

          {/* Action buttons - Requirements: 19.5 - Enhanced with tooltips */}
          <div className="flex gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(): void => {
                onReason(subProblem);
              }}
              className="p-2 rounded-lg hover:bg-ui-accent-primary/20 text-ui-text-muted hover:text-ui-accent-primary transition-all hover:scale-110"
              title="Reason about this sub-problem"
              aria-label="Reason about this sub-problem"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </button>
            <button
              onClick={(): void => {
                onDecompose(subProblem);
              }}
              className="p-2 rounded-lg hover:bg-ui-accent-secondary/20 text-ui-text-muted hover:text-ui-accent-secondary transition-all hover:scale-110"
              title="Further decompose this sub-problem"
              aria-label="Further decompose this sub-problem"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Children - Requirements: 19.3 (collapsible) - Enhanced with smooth animation */}
      <div
        className={`
          ml-8 mt-2 space-y-2 pl-5 overflow-hidden transition-all duration-normal
          ${hasChildren && isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}
        `}
        style={{
          borderLeft: hasChildren && isExpanded ? "2px solid rgba(0, 255, 255, 0.2)" : "none",
        }}
      >
        {subProblem.children?.map((child, index) => (
          <div key={child.id} style={{ animationDelay: `${String(index * 50)}ms` }}>
            <TreeNode
              subProblem={child}
              depth={depth + 1}
              isExpanded={expandedNodes.has(child.id)}
              onToggleExpand={onToggleExpand}
              onReason={onReason}
              onDecompose={onDecompose}
              expandedNodes={expandedNodes}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Decomposition Tree Component
// Requirements: 19.2, 19.3
// ============================================================================

interface DecompositionTreeProps {
  result: DecomposeResponse;
  onReason: (subProblem: SubProblem) => void;
  onDecompose: (subProblem: SubProblem) => void;
}

/**
 * Interactive tree visualization for problem decomposition
 * Requirements: 19.2, 19.3
 */
function DecompositionTree({
  result,
  onReason,
  onDecompose,
}: DecompositionTreeProps): React.ReactElement {
  // Track expanded nodes - all expanded by default
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const allIds = new Set<string>();
    const collectIds = (problems: SubProblem[]): void => {
      for (const p of problems) {
        allIds.add(p.id);
        if (p.children) {
          collectIds(p.children);
        }
      }
    };
    collectIds(result.subProblems);
    return allIds;
  });

  const handleToggleExpand = useCallback((id: string): void => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback((): void => {
    const allIds = new Set<string>();
    const collectIds = (problems: SubProblem[]): void => {
      for (const p of problems) {
        allIds.add(p.id);
        if (p.children) {
          collectIds(p.children);
        }
      }
    };
    collectIds(result.subProblems);
    setExpandedNodes(allIds);
  }, [result.subProblems]);

  const handleCollapseAll = useCallback((): void => {
    setExpandedNodes(new Set());
  }, []);

  // Calculate complexity distribution
  const complexityCount = { low: 0, medium: 0, high: 0 };
  const countComplexity = (problems: SubProblem[]): void => {
    for (const p of problems) {
      complexityCount[p.complexity]++;
      if (p.children) countComplexity(p.children);
    }
  };
  countComplexity(result.subProblems);

  return (
    <GlassPanel className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-ui-accent-primary flex items-center gap-2">
            <TreeIcon size="xl" />
            Problem Decomposition
          </h3>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm text-ui-text-muted">
              {result.totalSubProblems} sub-problems
            </span>
            <span className="text-sm text-ui-text-muted">•</span>
            <span className="text-sm text-ui-text-muted">Max depth: {result.maxDepth}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExpandAll}
            className="px-3 py-1.5 text-xs rounded-lg bg-ui-accent-primary/20 hover:bg-ui-accent-primary/30 text-ui-accent-primary border border-ui-accent-primary/30 transition-colors font-medium"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-3 py-1.5 text-xs rounded-lg bg-ui-border/50 hover:bg-ui-border text-ui-text-secondary transition-colors font-medium"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Complexity distribution summary */}
      <div className="mb-6 flex items-center gap-4">
        <span className="text-xs text-ui-text-muted">Complexity:</span>
        {complexityCount.low > 0 && (
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border status-badge-success">
            <CircleDot size={12} /> {complexityCount.low} Low
          </span>
        )}
        {complexityCount.medium > 0 && (
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border status-badge-warning">
            <CircleDot size={12} /> {complexityCount.medium} Medium
          </span>
        )}
        {complexityCount.high > 0 && (
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border status-badge-error">
            <CircleDot size={12} /> {complexityCount.high} High
          </span>
        )}
      </div>

      {/* Root problem - Enhanced styling */}
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-ui-accent-primary/15 to-transparent border-2 border-ui-accent-primary/40 shadow-glow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Target size={18} />
          <span className="text-xs text-ui-accent-primary font-semibold uppercase tracking-wide">
            Root Problem
          </span>
        </div>
        <div className="text-base text-ui-text-primary font-medium leading-relaxed whitespace-pre-wrap">
          {result.rootProblem.includes("Relevant context from previous interactions:") ? (
            <>
              {/* Split and render memory context separately */}
              {result.rootProblem.split("Current problem:").map((part, index) => {
                if (index === 0 && part.includes("Relevant context")) {
                  // Memory context section - use BlockNotePreview for proper formatting
                  // Strip "Known fact:" prefix and other metadata prefixes from memory content
                  const memoryContent = part
                    .replace("Relevant context from previous interactions:", "")
                    .replace(/^[\s-]*Known fact:\s*/gm, "")
                    .replace(/^[\s-]*Learned concept:\s*/gm, "")
                    .replace(/^[\s-]*Previous insight:\s*/gm, "")
                    .trim();
                  return (
                    <div
                      key="context"
                      className="mb-4 p-3 rounded-lg bg-ui-background/50 border border-ui-border/50"
                    >
                      <div className="text-xs text-ui-accent-secondary font-semibold uppercase tracking-wide mb-2 flex items-center gap-2">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Memory Context
                      </div>
                      <div className="text-sm">
                        <BlockNotePreview content={memoryContent} />
                      </div>
                    </div>
                  );
                } else if (index === 1) {
                  // Current problem section
                  return (
                    <div key="problem" className="text-base text-ui-text-primary font-medium">
                      {part.trim()}
                    </div>
                  );
                }
                return null;
              })}
            </>
          ) : (
            result.rootProblem
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="space-y-3">
        {result.subProblems.map((subProblem, index) => (
          <div key={subProblem.id} style={{ animationDelay: `${String(index * 100)}ms` }}>
            <TreeNode
              subProblem={subProblem}
              depth={0}
              isExpanded={expandedNodes.has(subProblem.id)}
              onToggleExpand={handleToggleExpand}
              onReason={onReason}
              onDecompose={onDecompose}
              expandedNodes={expandedNodes}
            />
          </div>
        ))}
      </div>

      {/* Suggested execution order - Enhanced */}
      {result.suggestedOrder.length > 0 && (
        <div className="mt-6 pt-6 border-t border-ui-border/30">
          <h4 className="text-sm font-semibold text-ui-text-secondary mb-3 flex items-center gap-2">
            <ClipboardList size={16} />
            Suggested Execution Order
          </h4>
          <div className="flex flex-wrap gap-2">
            {result.suggestedOrder.map((id, index) => (
              <span
                key={id}
                className="px-3 py-1.5 text-xs rounded-lg bg-ui-background/50 border border-ui-border/50 text-ui-text-muted font-medium flex items-center gap-2 hover:border-ui-accent-primary/30 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-ui-accent-primary/20 text-ui-accent-primary flex items-center justify-center text-[10px] font-bold">
                  {index + 1}
                </span>
                {id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Processing time */}
      <div className="mt-6 text-xs text-ui-text-muted text-right">
        Processed in {result.processingTimeMs}ms
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ProblemDecomposition - Dedicated screen for breaking down complex problems
 *
 * Features:
 * - Text input for main problem (19.1)
 * - Interactive tree visualization (19.2)
 * - Collapsible nodes (19.3)
 * - Complexity estimates and execution order (19.4)
 * - Click to further decompose or reason (19.5)
 * - Save breakdown as linked memories (19.6)
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
 */
export function ProblemDecomposition({
  userId,
  sessionId,
  className = "",
  onReasonSubProblem,
  onDecomposeSubProblem,
}: ProblemDecompositionProps): React.ReactElement {
  // State - default depth of 3
  const [problem, setProblem] = useState("");
  const [maxDepth, setMaxDepth] = useState(3);
  const [context, setContext] = useState<DecompositionContext>({
    background: "",
    constraints: [],
  });
  const [showContext, setShowContext] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DecomposeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cognitive store
  const startOperation = useCognitiveStore((state) => state.startOperation);
  const completeOperation = useCognitiveStore((state) => state.completeOperation);
  const failOperation = useCognitiveStore((state) => state.failOperation);

  // Save as memory hook
  const {
    isSaving,
    error: saveError,
    saveAsMemory,
    clearError: clearSaveError,
  } = useSaveAsMemory({
    userId,
    sessionId,
  });

  /**
   * Generate content for saving decomposition as memory
   * Requirements: 19.6
   */
  const generateSaveContent = useCallback((): string => {
    if (result === null) return "";

    const formatSubProblem = (sp: SubProblem, indent: string = ""): string => {
      let content = `${indent}- ${sp.description}\n`;
      content += `${indent}  Complexity: ${sp.complexity}, Order: ${String(sp.executionOrder)}\n`;
      if (sp.dependencies.length > 0) {
        content += `${indent}  Dependencies: ${sp.dependencies.join(", ")}\n`;
      }
      if (sp.children && sp.children.length > 0) {
        for (const child of sp.children) {
          content += formatSubProblem(child, indent + "  ");
        }
      }
      return content;
    };

    let content = `# Problem Decomposition\n\n`;
    content += `## Root Problem\n${result.rootProblem}\n\n`;
    content += `## Sub-Problems (${String(result.totalSubProblems)} total, max depth: ${String(result.maxDepth)})\n\n`;

    for (const sp of result.subProblems) {
      content += formatSubProblem(sp);
    }

    content += `\n## Suggested Execution Order\n`;
    content += result.suggestedOrder.map((id, i) => `${String(i + 1)}. ${id}`).join("\n");

    return content;
  }, [result]);

  /**
   * Handle save as memory
   * Requirements: 19.6
   */
  const handleSaveAsMemory = useCallback(async () => {
    if (result === null) return;

    const content = generateSaveContent();
    await saveAsMemory(content);
  }, [result, generateSaveContent, saveAsMemory]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    if (problem.trim().length === 0) {
      setError("Please enter a problem to decompose");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    const client = getDefaultClient();

    // Build context string from background and constraints
    const contextParts: string[] = [];
    if (context.background.length > 0) {
      contextParts.push(`Background: ${context.background}`);
    }
    if (context.constraints.length > 0) {
      contextParts.push(`Constraints: ${context.constraints.join(", ")}`);
    }
    const contextString = contextParts.length > 0 ? contextParts.join("\n") : undefined;

    try {
      const operationId = startOperation("decompose", problem);

      const request: import("../types/api").DecomposeRequest = {
        problem,
        maxDepth,
        userId,
      };
      if (contextString !== undefined) {
        request.context = contextString;
      }

      const response = await client.decompose(request);

      setResult(response);
      completeOperation(operationId, { type: "decompose", data: response });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Decomposition failed";
      setError(message);
      failOperation("", message);
    } finally {
      setIsProcessing(false);
    }
  }, [problem, maxDepth, context, userId, startOperation, completeOperation, failOperation]);

  /**
   * Handle reason about sub-problem
   * Requirements: 19.5
   */
  const handleReasonSubProblem = useCallback(
    (subProblem: SubProblem): void => {
      if (onReasonSubProblem) {
        onReasonSubProblem(subProblem);
      }
    },
    [onReasonSubProblem]
  );

  /**
   * Handle further decompose sub-problem
   * Requirements: 19.5
   */
  const handleDecomposeSubProblem = useCallback(
    (subProblem: SubProblem): void => {
      if (onDecomposeSubProblem) {
        onDecomposeSubProblem(subProblem);
      } else {
        // Default behavior: set the sub-problem as the new problem
        setProblem(subProblem.description);
        setResult(null);
      }
    },
    [onDecomposeSubProblem]
  );

  /**
   * Handle clear/reset
   */
  const handleClear = useCallback(() => {
    setProblem("");
    setResult(null);
    setError(null);
    clearSaveError();
  }, [clearSaveError]);

  const canSubmit = problem.trim().length > 0 && !isProcessing;
  const hasResult = result !== null;

  // Handle Cmd+Enter keyboard shortcut to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
        e.preventDefault();
        void handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canSubmit, handleSubmit]);

  return (
    <div className={`min-h-screen bg-ui-background p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ui-accent-primary flex items-center gap-2">
            <Search size={24} />
            Problem Decomposition
          </h1>
          {hasResult && (
            <div className="flex items-center gap-2">
              <button
                onClick={(): void => {
                  void handleSaveAsMemory();
                }}
                disabled={isSaving}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    isSaving
                      ? "bg-ui-border text-ui-text-muted cursor-not-allowed"
                      : "bg-ui-accent-primary/30 hover:bg-ui-accent-primary/50 text-ui-accent-primary"
                  }
                `}
              >
                {isSaving ? "Saving..." : "Save as Memory"}
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-ui-border hover:bg-ui-border/80 text-ui-text-secondary transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Error display */}
        {(error !== null || saveError !== null) && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error ?? saveError}
          </div>
        )}

        {/* Problem Input - Requirements: 19.1 */}
        <ProblemInput
          value={problem}
          onChange={setProblem}
          disabled={isProcessing}
          autoFocus
          onSubmit={(): void => {
            void handleSubmit();
          }}
        />

        {/* Depth Selection */}
        <DepthSelection value={maxDepth} onChange={setMaxDepth} disabled={isProcessing} />

        {/* Context Input (Optional) */}
        <ContextInput
          context={context}
          onContextChange={setContext}
          disabled={isProcessing}
          isExpanded={showContext}
          onToggleExpand={(): void => {
            setShowContext(!showContext);
          }}
        />

        {/* Submit Button */}
        {/* Decomposition Tree - Requirements: 19.2, 19.3, 19.4, 19.5 */}
        {hasResult && (
          <DecompositionTree
            result={result}
            onReason={handleReasonSubProblem}
            onDecompose={handleDecomposeSubProblem}
          />
        )}
      </div>

      {/* Floating Action Button - Bottom center */}
      <button
        onClick={(): void => {
          void handleSubmit();
        }}
        disabled={!canSubmit}
        className={`fixed bottom-[5vh] left-1/2 -translate-x-1/2 z-50 w-48 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group hover:scale-105 active:scale-95 ${
          canSubmit
            ? "bg-[#0a1628] hover:bg-[#0d1e38] text-[#00FFFF] border border-[#00FFFF]/40"
            : "bg-[#0a1628]/50 text-[#00FFFF]/30 border border-[#00FFFF]/10 cursor-not-allowed"
        }`}
        aria-label="Decompose problem"
        style={
          canSubmit
            ? {
                boxShadow: "0 0 20px rgba(0, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4)",
              }
            : undefined
        }
      >
        {isProcessing ? (
          <>
            <LoadingSpinner size={20} />
            <span className="font-semibold text-sm">Decomposing...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            <span className="font-semibold text-sm">Decompose</span>
            <kbd className="ml-1 px-2 py-1 text-xs font-medium bg-[#00FFFF]/20 text-[#00FFFF] rounded border border-[#00FFFF]/40">
              ⌘↵
            </kbd>
          </>
        )}
      </button>
    </div>
  );
}

export default ProblemDecomposition;
