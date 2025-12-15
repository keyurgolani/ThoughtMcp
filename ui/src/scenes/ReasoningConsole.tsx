/**
 * ReasoningConsole Screen
 *
 * Dedicated screen for performing systematic reasoning on any topic.
 * Leverages ThoughtMCP's parallel reasoning capabilities with support for
 * multiple reasoning modes and real-time progress display.
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getDefaultClient } from '../api/client';
import { useSaveAsMemory } from '../hooks/useSaveAsMemory';
import { useCognitiveStore } from '../stores/cognitiveStore';
import type {
  BiasDetection,
  ParallelThinkResponse,
  ReasoningMode,
  StreamResult,
  ThinkResponse,
} from '../types/api';

// ============================================================================
// Types
// ============================================================================

export interface ReasoningConsoleProps {
  /** User ID for memory operations */
  userId: string;
  /** Session ID for memory operations */
  sessionId: string;
  /** Additional CSS classes */
  className?: string;
}

interface ReasoningContext {
  background: string;
  constraints: string[];
  goals: string[];
}

type ReasoningResult =
  | { type: 'single'; mode: ReasoningMode; data: ThinkResponse }
  | { type: 'parallel'; data: ParallelThinkResponse };

// ============================================================================
// Constants
// ============================================================================

const REASONING_MODES: Array<{ value: ReasoningMode; label: string; description: string }> = [
  {
    value: 'analytical',
    label: 'Analytical',
    description: 'Logical, systematic analysis with structured reasoning',
  },
  {
    value: 'creative',
    label: 'Creative',
    description: 'Innovative thinking with novel connections and ideas',
  },
  {
    value: 'critical',
    label: 'Critical',
    description: 'Skeptical evaluation identifying weaknesses and assumptions',
  },
  {
    value: 'synthetic',
    label: 'Synthetic',
    description: 'Holistic integration combining multiple perspectives',
  },
  {
    value: 'parallel',
    label: 'Parallel (All)',
    description: 'Run all four modes simultaneously for comprehensive analysis',
  },
];

const PARALLEL_STREAMS: ReasoningMode[] = ['analytical', 'creative', 'critical', 'synthetic'];

// ============================================================================
// Sub-Components
// ============================================================================

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Glassmorphism panel wrapper consistent with UI design
 * Requirements: 17.7
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

/**
 * Format a number as percentage
 */
function formatPercentage(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

/**
 * Get severity color class for bias
 */
function getSeverityColorClass(severity: number): string {
  if (severity >= 0.7) return 'text-red-400 bg-red-500/20 border-red-500/50';
  if (severity >= 0.4) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
  return 'text-green-400 bg-green-500/20 border-green-500/50';
}

// ============================================================================
// Problem Input Component
// Requirements: 17.1
// ============================================================================

interface ProblemInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

/**
 * Large text input area for entering problems or questions
 * Requirements: 17.1
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
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <GlassPanel className="p-4">
      <label
        htmlFor="problem-input"
        className="block text-sm font-medium text-ui-accent-primary mb-2"
      >
        Problem or Question
      </label>
      <div className="relative">
        <textarea
          ref={textareaRef}
          id="problem-input"
          value={value}
          onChange={(e): void => {
            onChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Enter your problem, question, or topic for reasoning analysis..."
          className={`
            w-full h-40 p-3
            bg-ui-background/50 border border-ui-border rounded-lg
            text-ui-text-primary placeholder-ui-text-muted
            resize-none font-sans text-base leading-relaxed
            transition-all duration-normal
            focus:outline-none focus:border-ui-accent-primary focus:ring-2 focus:ring-ui-accent-primary/30
            focus:shadow-glow-sm
            hover:border-ui-border-hover
            ${disabled ? 'opacity-disabled cursor-not-allowed' : ''}
          `}
          aria-describedby="problem-input-hint"
        />
        {/* Character count indicator */}
        <div className="absolute bottom-3 right-3 text-xs text-ui-text-muted">
          {value.length} characters
        </div>
      </div>
      <p
        id="problem-input-hint"
        className="mt-3 text-sm text-ui-text-secondary flex items-center gap-2"
      >
        <span className="text-ui-accent-primary">💡</span>
        Describe the problem you want to analyze. Press ⌘+Enter to start reasoning.
      </p>
    </GlassPanel>
  );
}

// ============================================================================
// Mode Selection Component
// Requirements: 17.2
// ============================================================================

interface ModeSelectionProps {
  selectedMode: ReasoningMode;
  onModeChange: (mode: ReasoningMode) => void;
  disabled?: boolean;
}

/**
 * Get mode-specific icon
 */
function getModeIcon(mode: ReasoningMode): string {
  switch (mode) {
    case 'analytical':
      return '🔬';
    case 'creative':
      return '🎨';
    case 'critical':
      return '🔍';
    case 'synthetic':
      return '🔗';
    case 'parallel':
      return '⚡';
    default:
      return '💭';
  }
}

/**
 * Get mode-specific accent color class
 */
function getModeAccentClass(mode: ReasoningMode, isSelected: boolean): string {
  if (!isSelected) return '';
  switch (mode) {
    case 'analytical':
      return 'border-[#00FFFF] bg-[rgba(0,255,255,0.15)] shadow-glow-sm';
    case 'creative':
      return 'border-[#9B59B6] bg-[rgba(155,89,182,0.15)] shadow-glow-purple-sm';
    case 'critical':
      return 'border-[#E74C3C] bg-[rgba(231,76,60,0.15)] shadow-glow-error';
    case 'synthetic':
      return 'border-[#FFD700] bg-[rgba(255,215,0,0.15)] shadow-glow-gold-sm';
    case 'parallel':
      return 'border-[#00FFFF] bg-gradient-to-br from-[rgba(0,255,255,0.15)] to-[rgba(155,89,182,0.15)] shadow-glow';
    default:
      return 'border-ui-accent-primary bg-ui-accent-primary/15';
  }
}

/**
 * Reasoning mode selection with Analytical, Creative, Critical, Synthetic, Parallel options
 * Requirements: 17.2
 */
function ModeSelection({
  selectedMode,
  onModeChange,
  disabled = false,
}: ModeSelectionProps): React.ReactElement {
  return (
    <GlassPanel className="p-6">
      <h3 className="text-base font-semibold text-ui-accent-primary mb-4 flex items-center gap-2">
        <span className="text-xl">🧠</span>
        Reasoning Mode
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {REASONING_MODES.map((mode) => {
          const isSelected = selectedMode === mode.value;
          const modeAccentClass = getModeAccentClass(mode.value, isSelected);

          return (
            <button
              key={mode.value}
              onClick={(): void => {
                onModeChange(mode.value);
              }}
              disabled={disabled}
              className={`
                p-4 rounded-lg text-left transition-all duration-normal relative overflow-hidden
                border-2 group
                ${
                  isSelected
                    ? `${modeAccentClass} text-ui-text-primary`
                    : 'bg-ui-background/50 border-ui-border text-ui-text-secondary hover:bg-ui-border/30 hover:border-ui-border-hover'
                }
                ${disabled ? 'opacity-disabled cursor-not-allowed' : 'cursor-pointer'}
                ${isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
              `}
              aria-pressed={isSelected}
              title={mode.description}
            >
              {/* Mode icon */}
              <span
                className={`text-2xl mb-2 block transition-transform duration-normal ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}
              >
                {getModeIcon(mode.value)}
              </span>
              <span
                className={`block text-sm font-semibold ${isSelected ? 'text-ui-text-primary' : ''}`}
              >
                {mode.label}
              </span>
              <span className="block text-xs opacity-70 mt-1.5 line-clamp-2 leading-relaxed">
                {mode.description}
              </span>
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current animate-pulse" />
              )}
              {/* Parallel mode special indicator */}
              {mode.value === 'parallel' && (
                <span className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-ui-accent-primary/20 text-ui-accent-primary font-medium">
                  4 streams
                </span>
              )}
            </button>
          );
        })}
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Context Input Component (Optional)
// ============================================================================

interface ContextInputProps {
  context: ReasoningContext;
  onContextChange: (context: ReasoningContext) => void;
  disabled?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

/**
 * Optional context input for background, constraints, and goals
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
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    });
  };

  const handleGoalsChange = (value: string): void => {
    onContextChange({
      ...context,
      goals: value
        .split('\n')
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
        <span className="text-ui-text-muted">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="context-background"
              className="block text-xs text-ui-text-secondary mb-1"
            >
              Background Information
            </label>
            <textarea
              id="context-background"
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
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
          </div>

          <div>
            <label
              htmlFor="context-constraints"
              className="block text-xs text-ui-text-secondary mb-1"
            >
              Constraints (one per line)
            </label>
            <textarea
              id="context-constraints"
              value={context.constraints.join('\n')}
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
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
          </div>

          <div>
            <label htmlFor="context-goals" className="block text-xs text-ui-text-secondary mb-1">
              Goals (one per line)
            </label>
            <textarea
              id="context-goals"
              value={context.goals.join('\n')}
              onChange={(e): void => {
                handleGoalsChange(e.target.value);
              }}
              disabled={disabled}
              placeholder="What do you want to achieve?"
              className={`
                w-full h-20 p-2
                bg-ui-background/50 border border-ui-border rounded
                text-sm text-ui-text-primary placeholder-ui-text-muted
                resize-none
                focus:outline-none focus:border-ui-accent-primary
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

// ============================================================================
// Parallel Reasoning Display Component
// Requirements: 17.3
// ============================================================================

interface ParallelStreamDisplayProps {
  mode: ReasoningMode;
  result: StreamResult | null;
  isProcessing: boolean;
  progress: number;
}

/**
 * Get mode-specific styling for parallel stream columns
 */
function getStreamModeStyles(mode: ReasoningMode): {
  borderColor: string;
  bgGradient: string;
  glowColor: string;
  icon: string;
} {
  switch (mode) {
    case 'analytical':
      return {
        borderColor: 'border-[rgba(0,255,255,0.5)]',
        bgGradient: 'bg-gradient-to-b from-[rgba(0,255,255,0.1)] to-transparent',
        glowColor: 'shadow-[0_0_15px_rgba(0,255,255,0.2)]',
        icon: '🔬',
      };
    case 'creative':
      return {
        borderColor: 'border-[rgba(155,89,182,0.5)]',
        bgGradient: 'bg-gradient-to-b from-[rgba(155,89,182,0.1)] to-transparent',
        glowColor: 'shadow-[0_0_15px_rgba(155,89,182,0.2)]',
        icon: '🎨',
      };
    case 'critical':
      return {
        borderColor: 'border-[rgba(231,76,60,0.5)]',
        bgGradient: 'bg-gradient-to-b from-[rgba(231,76,60,0.1)] to-transparent',
        glowColor: 'shadow-[0_0_15px_rgba(231,76,60,0.2)]',
        icon: '🔍',
      };
    case 'synthetic':
      return {
        borderColor: 'border-[rgba(255,215,0,0.5)]',
        bgGradient: 'bg-gradient-to-b from-[rgba(255,215,0,0.1)] to-transparent',
        glowColor: 'shadow-[0_0_15px_rgba(255,215,0,0.2)]',
        icon: '🔗',
      };
    default:
      return {
        borderColor: 'border-[rgba(0,255,255,0.5)]',
        bgGradient: 'bg-gradient-to-b from-[rgba(0,255,255,0.1)] to-transparent',
        glowColor: 'shadow-[0_0_15px_rgba(0,255,255,0.2)]',
        icon: '💭',
      };
  }
}

/**
 * Get mode-specific text color
 */
function getStreamTextColor(mode: ReasoningMode): string {
  switch (mode) {
    case 'analytical':
      return 'text-[#00FFFF]';
    case 'creative':
      return 'text-[#9B59B6]';
    case 'critical':
      return 'text-[#E74C3C]';
    case 'synthetic':
      return 'text-[#FFD700]';
    default:
      return 'text-[#00FFFF]';
  }
}

/**
 * Individual stream column for parallel reasoning display
 * Requirements: 17.3
 */
function ParallelStreamColumn({
  mode,
  result,
  isProcessing,
  progress,
}: ParallelStreamDisplayProps): React.ReactElement {
  const modeInfo = REASONING_MODES.find((m) => m.value === mode);
  const modeLabel = modeInfo?.label ?? mode;
  const styles = getStreamModeStyles(mode);
  const textColor = getStreamTextColor(mode);

  return (
    <div
      className={`
        flex flex-col h-full border-2 rounded-xl overflow-hidden
        ${styles.borderColor} ${styles.bgGradient}
        bg-ui-background/40 backdrop-blur-sm
        transition-all duration-normal
        ${result !== null ? styles.glowColor : ''}
      `}
    >
      {/* Header */}
      <div className={`p-4 border-b ${styles.borderColor} ${styles.bgGradient}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{styles.icon}</span>
            <h4 className={`text-sm font-semibold ${textColor}`}>{modeLabel}</h4>
          </div>
          {isProcessing && <LoadingSpinner size={18} />}
          {result !== null && !isProcessing && <span className="text-green-400 text-sm">✓</span>}
        </div>
        {/* Progress bar with glow effect */}
        {isProcessing && (
          <div className="h-1.5 bg-ui-border/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${textColor.replace('text-', 'bg-')}`}
              style={{
                width: `${String(progress)}%`,
                boxShadow: `0 0 8px currentColor`,
              }}
            />
          </div>
        )}
        {result !== null && !isProcessing && (
          <div className="h-1.5 bg-green-500/30 rounded-full overflow-hidden">
            <div className="h-full w-full bg-green-500 rounded-full" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {result !== null ? (
          <div className="space-y-4 animate-fade-in">
            {/* Analysis */}
            <div>
              <span className={`text-xs font-medium ${textColor} block mb-2`}>Analysis</span>
              <p className="text-sm text-ui-text-primary leading-relaxed bg-ui-background/30 p-3 rounded-lg">
                {result.analysis}
              </p>
            </div>

            {/* Insights */}
            {result.insights.length > 0 && (
              <div>
                <span className={`text-xs font-medium ${textColor} block mb-2`}>Insights</span>
                <ul className="space-y-2">
                  {result.insights.map((insight: string, index: number) => (
                    <li
                      key={index}
                      className="text-xs text-ui-text-secondary flex items-start gap-2 bg-ui-background/20 p-2 rounded"
                    >
                      <span className={`${textColor} mt-0.5`}>→</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confidence */}
            <div className="flex items-center justify-between pt-2 border-t border-ui-border/30">
              <span className="text-xs text-ui-text-muted">Confidence</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-ui-border/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${textColor.replace('text-', 'bg-')}`}
                    style={{ width: `${String(result.confidence * 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold ${textColor}`}>
                  {formatPercentage(result.confidence)}
                </span>
              </div>
            </div>
          </div>
        ) : isProcessing ? (
          <div className="flex flex-col items-center justify-center h-full text-ui-text-muted">
            <div className="animate-pulse mb-2">
              <span className="text-3xl opacity-50">{styles.icon}</span>
            </div>
            <span className="text-sm">Processing...</span>
            <span className="text-xs mt-1 opacity-70">{progress}%</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-ui-text-muted">
            <span className="text-3xl opacity-30 mb-2">{styles.icon}</span>
            <span className="text-sm">Waiting...</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface ParallelReasoningDisplayProps {
  result: ParallelThinkResponse | null;
  isProcessing: boolean;
  progress: number;
}

/**
 * Four concurrent stream columns with real-time progress indicators
 * Requirements: 17.3
 */
function ParallelReasoningDisplay({
  result,
  isProcessing,
  progress,
}: ParallelReasoningDisplayProps): React.ReactElement {
  const getStreamProgress = (streamIndex: number): number => {
    if (!isProcessing) return result !== null ? 100 : 0;
    const baseProgress = progress;
    const offset = streamIndex * 5;
    return Math.min(100, Math.max(0, baseProgress + offset - 10));
  };

  const completedCount = result !== null ? Object.keys(result.streams).length : 0;

  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-ui-accent-primary flex items-center gap-2">
          <span className="text-xl">⚡</span>
          Parallel Reasoning Streams
        </h3>
        <div className="flex items-center gap-3">
          {isProcessing && (
            <span className="text-sm text-ui-text-muted animate-pulse">
              Processing {PARALLEL_STREAMS.length} streams...
            </span>
          )}
          {result !== null && !isProcessing && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              <span>✓</span>
              {completedCount}/{PARALLEL_STREAMS.length} complete
            </span>
          )}
        </div>
      </div>

      {/* Overall progress indicator */}
      {isProcessing && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-ui-text-muted mb-1">
            <span>Overall Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-ui-border/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00FFFF] via-[#9B59B6] to-[#FFD700] rounded-full transition-all duration-300"
              style={{ width: `${String(progress)}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[400px]">
        {PARALLEL_STREAMS.map((mode, index) => (
          <ParallelStreamColumn
            key={mode}
            mode={mode}
            result={result?.streams[mode] ?? null}
            isProcessing={isProcessing}
            progress={getStreamProgress(index)}
          />
        ))}
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Single Mode Result Display Component
// ============================================================================

interface SingleModeResultDisplayProps {
  result: ThinkResponse;
  mode: ReasoningMode;
}

/**
 * Display result for single reasoning mode
 */
function SingleModeResultDisplay({
  result,
  mode,
}: SingleModeResultDisplayProps): React.ReactElement {
  const modeInfo = REASONING_MODES.find((m) => m.value === mode);
  const modeLabel = modeInfo?.label ?? mode;
  const styles = getStreamModeStyles(mode);
  const textColor = getStreamTextColor(mode);

  return (
    <GlassPanel className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-semibold ${textColor} flex items-center gap-2`}>
          <span className="text-2xl">{styles.icon}</span>
          {modeLabel} Analysis
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-ui-background/50 px-3 py-1.5 rounded-lg">
            <span className="text-xs text-ui-text-muted">Confidence</span>
            <div className="w-20 h-2 bg-ui-border/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${textColor.replace('text-', 'bg-')}`}
                style={{ width: `${String(result.confidence * 100)}%` }}
              />
            </div>
            <span className={`text-sm font-semibold ${textColor}`}>
              {formatPercentage(result.confidence)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Analysis Section */}
        <div className={`p-4 rounded-xl border-2 ${styles.borderColor} ${styles.bgGradient}`}>
          <h4 className={`text-sm font-semibold ${textColor} mb-3 flex items-center gap-2`}>
            <span>📝</span>
            Analysis
          </h4>
          <p className="text-sm text-ui-text-primary leading-relaxed">{result.analysis}</p>
        </div>

        {/* Insights Section */}
        {(result.insights?.length ?? 0) > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-ui-accent-primary mb-3 flex items-center gap-2">
              <span>💡</span>
              Insights
            </h4>
            <div className="grid gap-2">
              {result.insights?.map((insight: string, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-ui-background/30 rounded-lg border border-ui-border/30 hover:border-ui-accent-primary/30 transition-colors"
                >
                  <span className={`${textColor} mt-0.5 font-bold`}>→</span>
                  <span className="text-sm text-ui-text-primary">{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations Section */}
        {result.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
              <span>✅</span>
              Recommendations
            </h4>
            <div className="grid gap-2">
              {result.recommendations.map((rec, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/30"
                >
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span className="text-sm text-ui-text-primary">
                    {typeof rec === 'string' ? rec : rec.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Biases Section */}
        {(result.biases?.length ?? 0) > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
              <span>⚠️</span>
              Detected Biases
            </h4>
            <div className="grid gap-3">
              {result.biases?.map((bias: BiasDetection, index: number) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${getSeverityColorClass(bias.severity)} transition-all hover:scale-[1.01]`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold capitalize">
                      {bias.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-current/20">
                      {formatPercentage(bias.severity)}
                    </span>
                  </div>
                  <p className="text-xs opacity-90">{bias.correctionStrategy}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-ui-border/30">
          <span className="text-xs text-ui-text-muted">
            Processed in {result.processingTimeMs}ms
          </span>
          <span className={`text-xs ${textColor} opacity-70`}>{modeLabel} Mode</span>
        </div>
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Synthesized Results Display Component
// Requirements: 17.4, 17.5
// ============================================================================

interface SynthesizedResultsDisplayProps {
  result: ParallelThinkResponse;
}

/**
 * Display synthesized results with insights from each stream
 * Requirements: 17.4, 17.5
 */
function SynthesizedResultsDisplay({ result }: SynthesizedResultsDisplayProps): React.ReactElement {
  return (
    <GlassPanel className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-ui-accent-highlight flex items-center gap-2">
          <span className="text-2xl">🔮</span>
          Synthesized Results
        </h3>
        <div className="flex items-center gap-3 bg-ui-background/50 px-4 py-2 rounded-lg">
          <span className="text-xs text-ui-text-muted">Overall Confidence</span>
          <div className="w-24 h-2 bg-ui-border/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00FFFF] to-[#FFD700] rounded-full"
              style={{ width: `${String(result.overallConfidence * 100)}%` }}
            />
          </div>
          <span className="text-sm font-bold text-ui-accent-highlight">
            {formatPercentage(result.overallConfidence)}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Combined Insights */}
        {result.synthesis.combinedInsights.length > 0 && (
          <div className="p-4 rounded-xl border-2 border-ui-accent-primary/30 bg-gradient-to-b from-ui-accent-primary/10 to-transparent">
            <h4 className="text-sm font-semibold text-ui-accent-primary mb-4 flex items-center gap-2">
              <span>💡</span>
              Combined Insights
              <span className="text-xs font-normal text-ui-text-muted ml-2">
                ({result.synthesis.combinedInsights.length} insights)
              </span>
            </h4>
            <div className="grid gap-3">
              {result.synthesis.combinedInsights.map((insight: string, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-ui-background/40 rounded-lg border border-ui-accent-primary/20 hover:border-ui-accent-primary/40 transition-colors"
                >
                  <span className="text-ui-accent-primary font-bold text-lg">→</span>
                  <span className="text-sm text-ui-text-primary leading-relaxed">{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conflicts */}
        {result.synthesis.conflicts.length > 0 && (
          <div className="p-4 rounded-xl border-2 border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-transparent">
            <h4 className="text-sm font-semibold text-yellow-400 mb-4 flex items-center gap-2">
              <span>⚠️</span>
              Conflicts Between Streams
              <span className="text-xs font-normal text-ui-text-muted ml-2">
                ({result.synthesis.conflicts.length} conflicts)
              </span>
            </h4>
            <div className="grid gap-3">
              {result.synthesis.conflicts.map((conflict: string, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30"
                >
                  <span className="text-yellow-400 font-bold text-lg">⚠</span>
                  <span className="text-sm text-ui-text-primary leading-relaxed">{conflict}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {result.synthesis.recommendations.length > 0 && (
          <div className="p-4 rounded-xl border-2 border-green-500/30 bg-gradient-to-b from-green-500/10 to-transparent">
            <h4 className="text-sm font-semibold text-green-400 mb-4 flex items-center gap-2">
              <span>✅</span>
              Recommendations
              <span className="text-xs font-normal text-ui-text-muted ml-2">
                ({result.synthesis.recommendations.length} recommendations)
              </span>
            </h4>
            <div className="grid gap-3">
              {result.synthesis.recommendations.map((rec: string, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/30"
                >
                  <span className="text-green-400 font-bold text-lg">✓</span>
                  <span className="text-sm text-ui-text-primary leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-ui-border/30">
          <span className="text-xs text-ui-text-muted">
            Processed in {result.processingTimeMs}ms
          </span>
          <span className="text-xs text-ui-accent-primary opacity-70">
            Parallel Reasoning Complete
          </span>
        </div>
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ReasoningConsole - Dedicated screen for systematic reasoning
 *
 * Features:
 * - Large text input for problems/questions (17.1)
 * - Mode selection: Analytical, Creative, Critical, Synthetic, Parallel (17.2)
 * - Four concurrent stream columns with real-time progress (17.3)
 * - Synthesized results with insights (17.4, 17.5)
 * - Save reasoning session as new memory (17.6)
 * - Dark theme with glassmorphism styling (17.7)
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
 */
export function ReasoningConsole({
  userId,
  sessionId,
  className = '',
}: ReasoningConsoleProps): React.ReactElement {
  // State
  const [problem, setProblem] = useState('');
  const [selectedMode, setSelectedMode] = useState<ReasoningMode>('parallel');
  const [context, setContext] = useState<ReasoningContext>({
    background: '',
    constraints: [],
    goals: [],
  });
  const [showContext, setShowContext] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ReasoningResult | null>(null);
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
   * Generate content for saving reasoning session as memory
   * Requirements: 17.6
   */
  const generateSaveContent = useCallback((): string => {
    if (result === null) return '';

    if (result.type === 'parallel') {
      const { data } = result;
      const streamsText = PARALLEL_STREAMS.map((mode) => {
        const stream = data.streams[mode];
        return `## ${mode.charAt(0).toUpperCase() + mode.slice(1)} Analysis
${stream.analysis}
Insights: ${stream.insights.join('; ')}
Confidence: ${formatPercentage(stream.confidence)}`;
      }).join('\n\n');

      return `# Parallel Reasoning Session

## Problem
${problem}

${streamsText}

## Synthesis
Combined Insights: ${data.synthesis.combinedInsights.join('; ')}
Conflicts: ${data.synthesis.conflicts.join('; ') || 'None'}
Recommendations: ${data.synthesis.recommendations.join('; ')}

Overall Confidence: ${formatPercentage(data.overallConfidence)}`;
    } else {
      const { data, mode } = result;
      const analysisText = data.analysis ?? 'No analysis available';
      const insightsText = (data.insights ?? []).map((i: string) => `- ${i}`).join('\n');
      const recommendationsText = data.recommendations
        .map((r) => `- ${typeof r === 'string' ? r : r.description}`)
        .join('\n');
      const biasesText =
        (data.biases?.length ?? 0) > 0
          ? (data.biases ?? [])
              .map((b: BiasDetection) => `- ${b.type}: ${b.correctionStrategy}`)
              .join('\n')
          : 'None detected';

      return `# ${mode.charAt(0).toUpperCase() + mode.slice(1)} Reasoning Session

## Problem
${problem}

## Analysis
${analysisText}

## Insights
${insightsText}

## Recommendations
${recommendationsText}

## Biases Detected
${biasesText}

Confidence: ${formatPercentage(data.confidence)}`;
    }
  }, [result, problem]);

  /**
   * Handle save as memory
   * Requirements: 17.6
   */
  const handleSaveAsMemory = useCallback(async () => {
    if (result === null) return;

    const content = generateSaveContent();
    await saveAsMemory(content);
  }, [result, generateSaveContent, saveAsMemory]);

  /**
   * Simulate progress updates for parallel reasoning
   */
  useEffect(() => {
    if (!isProcessing) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev: number) => {
        if (prev >= 95) return prev;
        const increment = Math.max(1, 10 - Math.floor(prev / 10));
        return Math.min(95, prev + increment);
      });
    }, 500);

    return (): void => {
      clearInterval(interval);
    };
  }, [isProcessing]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    if (problem.trim().length === 0) {
      setError('Please enter a problem or question');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress(0);

    const client = getDefaultClient();
    const hasContext =
      context.background.length > 0 || context.constraints.length > 0 || context.goals.length > 0;
    const contextData = hasContext
      ? {
          ...(context.background.length > 0 ? { background: context.background } : {}),
          ...(context.constraints.length > 0 ? { constraints: context.constraints } : {}),
          ...(context.goals.length > 0 ? { goals: context.goals } : {}),
        }
      : undefined;

    try {
      if (selectedMode === 'parallel') {
        const operationId = startOperation('think_parallel', problem);

        // Build context string for parallel reasoning
        const contextString =
          contextData !== undefined
            ? `Background: ${contextData.background ?? ''}\nConstraints: ${(contextData.constraints ?? []).join(', ')}\nGoals: ${(contextData.goals ?? []).join(', ')}`
            : undefined;

        const response = await client.thinkParallel(
          contextString !== undefined
            ? {
                problem,
                streams: ['analytical', 'creative', 'critical', 'synthetic'],
                userId,
                timeout: 60000,
                context: contextString,
              }
            : {
                problem,
                streams: ['analytical', 'creative', 'critical', 'synthetic'],
                userId,
                timeout: 60000,
              }
        );

        setResult({ type: 'parallel', data: response });
        setProgress(100);
        completeOperation(operationId, { type: 'think_parallel', data: response });
      } else {
        const operationId = startOperation('think', problem, selectedMode);

        // Map UI mode to server mode and build context string
        const { mapReasoningModeToThinkMode } = await import('../types/api');
        const serverMode = mapReasoningModeToThinkMode(selectedMode);
        const contextString =
          contextData !== undefined
            ? `Background: ${contextData.background ?? ''}\nConstraints: ${(contextData.constraints ?? []).join(', ')}\nGoals: ${(contextData.goals ?? []).join(', ')}`
            : undefined;

        const response = await client.think(
          contextString !== undefined
            ? {
                input: problem,
                mode: serverMode,
                userId,
                context: contextString,
              }
            : {
                input: problem,
                mode: serverMode,
                userId,
              }
        );

        setResult({ type: 'single', mode: selectedMode, data: response });
        setProgress(100);
        completeOperation(operationId, { type: 'think', data: response });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reasoning failed';
      setError(message);
      failOperation('', message);
    } finally {
      setIsProcessing(false);
    }
  }, [problem, selectedMode, context, userId, startOperation, completeOperation, failOperation]);

  /**
   * Handle clear/reset
   */
  const handleClear = useCallback(() => {
    setProblem('');
    setResult(null);
    setError(null);
    setProgress(0);
    clearSaveError();
  }, [clearSaveError]);

  const canSubmit = problem.trim().length > 0 && !isProcessing;
  const hasResult = result !== null;

  return (
    <div className={`min-h-screen bg-ui-background p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ui-accent-primary flex items-center gap-2">
            <span>💭</span>
            Reasoning Console
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
                      ? 'bg-ui-border text-ui-text-muted cursor-not-allowed'
                      : 'bg-ui-accent-primary/30 hover:bg-ui-accent-primary/50 text-ui-accent-primary'
                  }
                `}
              >
                {isSaving ? 'Saving...' : 'Save as Memory'}
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

        {/* Problem Input - Requirements: 17.1 */}
        <ProblemInput
          value={problem}
          onChange={setProblem}
          disabled={isProcessing}
          autoFocus
          onSubmit={(): void => {
            void handleSubmit();
          }}
        />

        {/* Mode Selection - Requirements: 17.2 */}
        <ModeSelection
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          disabled={isProcessing}
        />

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

        {/* Parallel Reasoning Display - Requirements: 17.3 */}
        {selectedMode === 'parallel' && (isProcessing || result?.type === 'parallel') && (
          <ParallelReasoningDisplay
            result={result?.type === 'parallel' ? result.data : null}
            isProcessing={isProcessing}
            progress={progress}
          />
        )}

        {/* Single Mode Result Display */}
        {result?.type === 'single' && (
          <SingleModeResultDisplay result={result.data} mode={result.mode} />
        )}

        {/* Synthesized Results - Requirements: 17.4, 17.5 */}
        {result?.type === 'parallel' && <SynthesizedResultsDisplay result={result.data} />}
      </div>

      {/* Floating Action Button - Bottom center */}
      <button
        onClick={(): void => {
          void handleSubmit();
        }}
        disabled={!canSubmit}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-56 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group hover:scale-105 active:scale-95 ${
          canSubmit
            ? 'bg-ui-accent-primary hover:bg-ui-accent-primary/90 text-ui-background'
            : 'bg-ui-border text-ui-text-muted cursor-not-allowed'
        }`}
        aria-label="Start reasoning"
        style={
          canSubmit
            ? {
                boxShadow: '0 0 20px rgba(0, 255, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)',
              }
            : undefined
        }
      >
        {isProcessing ? (
          <>
            <LoadingSpinner size={24} />
            <span className="font-medium text-sm">Processing...</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="font-medium text-sm">Start Reasoning</span>
          </>
        )}
      </button>
    </div>
  );
}

export default ReasoningConsole;
