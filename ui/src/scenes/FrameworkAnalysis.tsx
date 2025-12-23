/**
 * FrameworkAnalysis Screen
 *
 * Dedicated screen for analyzing problems using systematic thinking frameworks.
 * Supports 8 frameworks with auto-recommendation, step-by-step guidance,
 * and result visualization.
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getDefaultClient } from '../api/client';
import {
  BarChart3,
  CheckCircle2,
  CreativeProblemSolvingIcon,
  CriticalThinkingIcon,
  DesignThinkingIcon,
  FirstPrinciplesIcon,
  Puzzle,
  RootCauseAnalysisIcon,
  ScenarioPlanningIcon,
  ScientificMethodIcon,
  SystemsThinkingIcon,
} from '../components/icons/Icons';
import { useSaveAsMemory } from '../hooks/useSaveAsMemory';
import { useCognitiveStore } from '../stores/cognitiveStore';
import type { AnalyzeResponse, FrameworkStep, FrameworkType } from '../types/api';

// ============================================================================
// Types
// ============================================================================

export interface FrameworkAnalysisProps {
  /** User ID for memory operations */
  userId: string;
  /** Session ID for memory operations */
  sessionId: string;
  /** Additional CSS classes */
  className?: string;
}

interface AnalysisContext {
  background: string;
  constraints: string[];
  goals: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Framework definitions with metadata for display and recommendation
 * Requirements: 18.1
 */
export const FRAMEWORKS: Array<{
  value: FrameworkType;
  label: string;
  description: string;
  getIcon: () => React.ReactElement;
  keywords: string[];
}> = [
  {
    value: 'scientific-method',
    label: 'Scientific Method',
    description: 'Hypothesis-driven approach with observation, experimentation, and analysis',
    getIcon: () => <ScientificMethodIcon size="xl" />,
    keywords: ['test', 'hypothesis', 'experiment', 'data', 'research', 'verify', 'measure'],
  },
  {
    value: 'design-thinking',
    label: 'Design Thinking',
    description: 'Human-centered approach focusing on empathy, ideation, and prototyping',
    getIcon: () => <DesignThinkingIcon size="xl" />,
    keywords: ['user', 'design', 'prototype', 'empathy', 'creative', 'innovation', 'experience'],
  },
  {
    value: 'systems-thinking',
    label: 'Systems Thinking',
    description: 'Holistic analysis of interconnected components and feedback loops',
    getIcon: () => <SystemsThinkingIcon size="xl" />,
    keywords: ['system', 'complex', 'interconnected', 'feedback', 'holistic', 'ecosystem'],
  },
  {
    value: 'critical-thinking',
    label: 'Critical Thinking',
    description: 'Rigorous evaluation of arguments, evidence, and logical validity',
    getIcon: () => <CriticalThinkingIcon size="xl" />,
    keywords: ['evaluate', 'argument', 'logic', 'evidence', 'analyze', 'assess', 'validity'],
  },
  {
    value: 'creative-problem-solving',
    label: 'Creative Problem Solving',
    description: 'Divergent thinking to generate novel solutions and alternatives',
    getIcon: () => <CreativeProblemSolvingIcon size="xl" />,
    keywords: ['creative', 'brainstorm', 'innovative', 'novel', 'alternative', 'idea'],
  },
  {
    value: 'root-cause-analysis',
    label: 'Root Cause Analysis',
    description: 'Systematic investigation to identify underlying causes of problems',
    getIcon: () => <RootCauseAnalysisIcon size="xl" />,
    keywords: ['cause', 'why', 'root', 'investigate', 'failure', 'issue', 'problem'],
  },
  {
    value: 'first-principles',
    label: 'First Principles',
    description: 'Breaking down problems to fundamental truths and building up from there',
    getIcon: () => <FirstPrinciplesIcon size="xl" />,
    keywords: ['fundamental', 'basic', 'assumption', 'foundation', 'core', 'essential'],
  },
  {
    value: 'scenario-planning',
    label: 'Scenario Planning',
    description: 'Exploring multiple future scenarios to prepare for uncertainty',
    getIcon: () => <ScenarioPlanningIcon size="xl" />,
    keywords: ['future', 'scenario', 'plan', 'uncertainty', 'strategy', 'forecast', 'prepare'],
  },
];

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

// ============================================================================
// Problem Input Component
// Requirements: 18.1
// ============================================================================

interface ProblemInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

/**
 * Text input for the problem to analyze
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
        htmlFor="framework-problem-input"
        className="block text-sm font-medium text-ui-accent-primary mb-2"
      >
        Problem to Analyze
      </label>
      <textarea
        ref={textareaRef}
        id="framework-problem-input"
        name="framework-problem-input"
        value={value}
        onChange={(e): void => {
          onChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Describe the problem you want to analyze using a systematic framework..."
        className={`
          w-full h-40 p-3
          bg-ui-background/50 border border-ui-border rounded-lg
          text-ui-text-primary placeholder-ui-text-muted
          resize-none
          focus:outline-none focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-describedby="framework-problem-hint"
      />
      <p id="framework-problem-hint" className="mt-2 text-xs text-ui-text-muted">
        Enter a problem or question. The system will recommend an optimal framework based on your
        input. Press ⌘+Enter to analyze.
      </p>
    </GlassPanel>
  );
}

// ============================================================================
// Framework Recommendation Logic
// Requirements: 18.2
// ============================================================================

/**
 * Recommend a framework based on problem text
 * Requirements: 18.2
 */
export function recommendFramework(problemText: string): FrameworkType | null {
  if (problemText.trim().length === 0) return null;

  const lowerText = problemText.toLowerCase();
  const scores: Record<FrameworkType, number> = {
    'scientific-method': 0,
    'design-thinking': 0,
    'systems-thinking': 0,
    'critical-thinking': 0,
    'creative-problem-solving': 0,
    'root-cause-analysis': 0,
    'first-principles': 0,
    'scenario-planning': 0,
  };

  // Score each framework based on keyword matches
  for (const framework of FRAMEWORKS) {
    for (const keyword of framework.keywords) {
      if (lowerText.includes(keyword)) {
        scores[framework.value] += 1;
      }
    }
  }

  // Find the framework with the highest score
  let bestFramework: FrameworkType | null = null;
  let bestScore = 0;

  for (const [framework, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestFramework = framework as FrameworkType;
    }
  }

  // Return null if no keywords matched
  return bestScore > 0 ? bestFramework : null;
}

// ============================================================================
// Framework Selection Component
// Requirements: 18.1, 18.2
// ============================================================================

interface FrameworkSelectionProps {
  selectedFramework: FrameworkType | null;
  recommendedFramework: FrameworkType | null;
  onFrameworkChange: (framework: FrameworkType) => void;
  disabled?: boolean;
}

/**
 * Helper to detect light mode from document attribute
 */
function isLightModeActive(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme-mode') === 'light'
  );
}

/**
 * Get framework-specific accent color with light mode support
 */
function getFrameworkColor(framework: FrameworkType): string {
  const isLightMode = isLightModeActive();

  // Dark mode colors (original)
  const darkColorMap: Record<FrameworkType, string> = {
    'scientific-method': '#00FFFF',
    'design-thinking': '#9B59B6',
    'systems-thinking': '#27AE60',
    'critical-thinking': '#E74C3C',
    'creative-problem-solving': '#FFD700',
    'root-cause-analysis': '#E67E22',
    'first-principles': '#3498DB',
    'scenario-planning': '#1ABC9C',
  };

  // Light mode colors (more saturated for visibility)
  const lightColorMap: Record<FrameworkType, string> = {
    'scientific-method': '#0077B6',
    'design-thinking': '#7B2CBF',
    'systems-thinking': '#2D6A4F',
    'critical-thinking': '#C41E3A',
    'creative-problem-solving': '#D4880F',
    'root-cause-analysis': '#C65102',
    'first-principles': '#1D4ED8',
    'scenario-planning': '#0F766E',
  };

  return isLightMode ? lightColorMap[framework] : darkColorMap[framework];
}

/**
 * Framework selection UI with all 8 frameworks and auto-recommendation
 * Requirements: 18.1, 18.2
 */
function FrameworkSelection({
  selectedFramework,
  recommendedFramework,
  onFrameworkChange,
  disabled = false,
}: FrameworkSelectionProps): React.ReactElement {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-ui-accent-primary flex items-center gap-2">
          <Puzzle size={20} />
          Select Framework
        </h3>
        {recommendedFramework !== null && (
          <div className="flex items-center gap-2 bg-ui-accent-secondary/20 px-3 py-1.5 rounded-lg border border-ui-accent-secondary/30">
            <span className="text-status-warning">★</span>
            <span className="text-xs text-ui-accent-secondary">
              Recommended:{' '}
              <span className="font-semibold">
                {FRAMEWORKS.find((f) => f.value === recommendedFramework)?.label}
              </span>
            </span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FRAMEWORKS.map((framework) => {
          const isSelected = selectedFramework === framework.value;
          const isRecommended = recommendedFramework === framework.value;
          const frameworkColor = getFrameworkColor(framework.value);

          return (
            <button
              key={framework.value}
              onClick={(): void => {
                onFrameworkChange(framework.value);
              }}
              disabled={disabled}
              className={`
                p-4 rounded-xl text-left transition-all duration-normal relative group
                border-2
                ${
                  isSelected
                    ? 'text-ui-text-primary scale-[1.02]'
                    : isRecommended
                      ? 'bg-ui-accent-secondary/10 border-ui-accent-secondary/40 text-ui-text-primary'
                      : 'bg-ui-background/50 border-ui-border text-ui-text-secondary hover:bg-ui-border/30 hover:border-ui-border-hover'
                }
                ${disabled ? 'opacity-disabled cursor-not-allowed' : 'cursor-pointer hover:scale-[1.01]'}
              `}
              style={
                isSelected
                  ? {
                      borderColor: `${frameworkColor}80`,
                      background: `linear-gradient(135deg, ${frameworkColor}20, transparent)`,
                      boxShadow: `0 0 20px ${frameworkColor}30`,
                    }
                  : undefined
              }
              aria-pressed={isSelected}
              title={framework.description}
            >
              {/* Recommended badge */}
              {isRecommended && !isSelected && (
                <span className="absolute top-2 right-2 text-status-warning animate-pulse">★</span>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div
                  className="absolute top-2 right-2 w-3 h-3 rounded-full animate-pulse"
                  style={{ backgroundColor: frameworkColor }}
                />
              )}

              {/* Icon with hover effect */}
              <span
                className={`text-3xl mb-2 block transition-transform duration-normal ${!isSelected ? 'group-hover:scale-105' : ''}`}
              >
                {framework.getIcon()}
              </span>

              {/* Label */}
              <span
                className={`block text-sm font-semibold mb-1 ${isSelected ? '' : ''}`}
                style={isSelected ? { color: frameworkColor } : undefined}
              >
                {framework.label}
              </span>

              {/* Description */}
              <span className="block text-xs opacity-70 leading-relaxed line-clamp-2">
                {framework.description}
              </span>

              {/* Keywords preview */}
              <div className="mt-2 flex flex-wrap gap-1">
                {framework.keywords.slice(0, 3).map((keyword) => (
                  <span
                    key={keyword}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-ui-border/50 text-ui-text-muted"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
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
  context: AnalysisContext;
  onContextChange: (context: AnalysisContext) => void;
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
              htmlFor="framework-context-background"
              className="block text-xs text-ui-text-secondary mb-1"
            >
              Background Information
            </label>
            <textarea
              id="framework-context-background"
              name="framework-context-background"
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
              htmlFor="framework-context-constraints"
              className="block text-xs text-ui-text-secondary mb-1"
            >
              Constraints (one per line)
            </label>
            <textarea
              id="framework-context-constraints"
              name="framework-context-constraints"
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
                focus:outline-none focus:border-ui-accent-p
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
          </div>

          <div>
            <label
              htmlFor="framework-context-goals"
              className="block text-xs text-ui-text-secondary mb-1"
            >
              Goals (one per line)
            </label>
            <textarea
              id="framework-context-goals"
              name="framework-context-goals"
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
// Step-by-Step Guidance Component
// Requirements: 18.3
// ============================================================================

interface StepGuidanceProps {
  framework: FrameworkType;
  steps: FrameworkStep[];
  currentStepIndex: number;
  onStepClick: (index: number) => void;
}

/**
 * Display framework steps with structured guidance
 * Requirements: 18.3
 */
function StepGuidance({
  framework,
  steps,
  currentStepIndex,
  onStepClick,
}: StepGuidanceProps): React.ReactElement {
  const frameworkInfo = FRAMEWORKS.find((f) => f.value === framework);
  const frameworkColor = getFrameworkColor(framework);
  const completedSteps = currentStepIndex;
  const progressPercent = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{frameworkInfo?.getIcon()}</span>
        <div className="flex-1">
          <h3 className="text-base font-semibold" style={{ color: frameworkColor }}>
            {frameworkInfo?.label} Steps
          </h3>
          <p className="text-xs text-ui-text-muted">{steps.length} steps in this framework</p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-ui-text-muted mb-1">
          <span>Progress</span>
          <span>
            {completedSteps}/{steps.length} complete
          </span>
        </div>
        <div className="h-2 bg-ui-border/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-slow"
            style={{
              width: `${String(progressPercent)}%`,
              backgroundColor: frameworkColor,
              boxShadow: `0 0 10px ${frameworkColor}`,
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;

          return (
            <button
              key={index}
              onClick={(): void => {
                onStepClick(index);
              }}
              className={`
                w-full p-3 rounded-xl text-left transition-all duration-normal
                border-2 group
                ${
                  isActive
                    ? 'scale-[1.02]'
                    : isCompleted
                      ? 'status-badge-success'
                      : 'bg-ui-background/30 border-ui-border/50 hover:bg-ui-border/30 hover:border-ui-border'
                }
              `}
              style={
                isActive
                  ? {
                      borderColor: `${frameworkColor}60`,
                      background: `linear-gradient(135deg, ${frameworkColor}15, transparent)`,
                      boxShadow: `0 0 15px ${frameworkColor}20`,
                    }
                  : undefined
              }
            >
              <div className="flex items-start gap-3">
                {/* Step number indicator with animation */}
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                    transition-all duration-normal
                    ${isCompleted ? 'bg-status-success text-white shadow-glow-success' : ''}
                    ${!isActive && !isCompleted ? 'bg-ui-border/50 text-ui-text-muted group-hover:bg-ui-border' : ''}
                  `}
                  style={
                    isActive
                      ? {
                          backgroundColor: frameworkColor,
                          color: 'var(--theme-background)',
                          boxShadow: `0 0 15px ${frameworkColor}50`,
                        }
                      : undefined
                  }
                >
                  {isCompleted ? '✓' : index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <span
                    className={`
                      block text-sm font-semibold
                      ${isCompleted ? 'text-status-success' : 'text-ui-text-primary'}
                    `}
                    style={isActive ? { color: frameworkColor } : undefined}
                  >
                    {step.name}
                  </span>
                  <span className="block text-xs text-ui-text-muted mt-1 leading-relaxed line-clamp-2">
                    {step.description}
                  </span>
                </div>

                {/* Status indicator */}
                {isActive && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${frameworkColor}20`,
                      color: frameworkColor,
                    }}
                  >
                    Current
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Step Result Display Component
// Requirements: 18.4
// ============================================================================

interface StepResultDisplayProps {
  step: FrameworkStep;
  stepIndex: number;
  totalSteps: number;
}

/**
 * Display result for a single framework step
 * Requirements: 18.4
 */
function StepResultDisplay({
  step,
  stepIndex,
  totalSteps,
}: StepResultDisplayProps): React.ReactElement {
  return (
    <GlassPanel className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-ui-accent-primary">
          Step {stepIndex + 1} of {totalSteps}: {step.name}
        </h4>
      </div>
      <p className="text-xs text-ui-text-muted mb-3">{step.description}</p>
      <div className="bg-ui-background/50 p-3 rounded-lg">
        <p className="text-sm text-ui-text-primary whitespace-pre-wrap">{step.result}</p>
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Flowchart Visualization Component
// Requirements: 18.5
// ============================================================================

interface FlowchartVisualizationProps {
  steps: FrameworkStep[];
  framework: FrameworkType;
}

/**
 * Visualize framework analysis as a flowchart
 * Requirements: 18.5
 */
function FlowchartVisualization({
  steps,
  framework,
}: FlowchartVisualizationProps): React.ReactElement {
  const frameworkInfo = FRAMEWORKS.find((f) => f.value === framework);
  const frameworkColor = getFrameworkColor(framework);
  const isLightMode = isLightModeActive();

  // Theme-aware success color for START step
  const successColor = isLightMode ? 'var(--status-success)' : '#27AE60';
  const successBgLight = isLightMode ? 'var(--status-success-bg)' : 'rgba(39, 174, 96, 0.15)';
  const successBorderLight = isLightMode
    ? 'var(--status-success-border)'
    : 'rgba(39, 174, 96, 0.5)';
  const successBgDark = isLightMode ? 'var(--status-success-bg)' : 'rgba(39, 174, 96, 0.3)';
  const neutralTextColor = isLightMode ? 'var(--theme-text-muted)' : 'rgba(255, 255, 255, 0.7)';
  const neutralLabelColor = isLightMode ? 'var(--theme-text-muted)' : 'rgba(255, 255, 255, 0.5)';
  const neutralBgColor = isLightMode ? 'var(--theme-surface-sunken)' : 'rgba(100, 100, 150, 0.3)';

  return (
    <GlassPanel className="p-6">
      <h3
        className="text-base font-semibold mb-6 flex items-center gap-2"
        style={{ color: frameworkColor }}
      >
        <BarChart3 size={20} />
        {frameworkInfo?.label} Flowchart
      </h3>

      <div className="relative">
        {/* Flowchart container */}
        <div className="flex flex-col items-center space-y-1">
          {steps.map((step, index) => {
            const isFirst = index === 0;
            const isLast = index === steps.length - 1;

            return (
              <div
                key={index}
                className="flex flex-col items-center w-full max-w-lg animate-fade-in"
                style={{ animationDelay: `${String(index * 100)}ms` }}
              >
                {/* Step box with enhanced styling */}
                <div
                  className={`
                    w-full p-4 rounded-xl border-2 text-center transition-all duration-normal
                    hover:scale-[1.02] cursor-default
                    ${isFirst ? 'shadow-glow-success' : isLast ? '' : ''}
                  `}
                  style={{
                    borderColor: isFirst
                      ? successBorderLight
                      : isLast
                        ? `${frameworkColor}60`
                        : 'var(--theme-border)',
                    background: isFirst
                      ? `linear-gradient(135deg, ${successBgLight}, transparent)`
                      : isLast
                        ? `linear-gradient(135deg, ${frameworkColor}15, transparent)`
                        : 'var(--theme-surface-sunken)',
                    boxShadow: isLast ? `0 0 20px ${frameworkColor}30` : undefined,
                  }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: isFirst
                          ? successBgDark
                          : isLast
                            ? `${frameworkColor}30`
                            : neutralBgColor,
                        color: isFirst ? successColor : isLast ? frameworkColor : neutralTextColor,
                      }}
                    >
                      {index + 1}
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{
                        color: isFirst ? successColor : isLast ? frameworkColor : neutralLabelColor,
                      }}
                    >
                      {isFirst ? 'START' : isLast ? 'FINISH' : `Step ${String(index + 1)}`}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-ui-text-primary block">
                    {step.name}
                  </span>
                </div>

                {/* Arrow connector with animation */}
                {index < steps.length - 1 && (
                  <div className="flex flex-col items-center py-1">
                    <div
                      className="w-0.5 h-6 rounded-full"
                      style={{
                        background: `linear-gradient(to bottom, ${frameworkColor}40, ${frameworkColor}20)`,
                      }}
                    />
                    <svg
                      className="w-4 h-4"
                      fill={frameworkColor}
                      viewBox="0 0 24 24"
                      style={{ filter: `drop-shadow(0 0 4px ${frameworkColor}50)` }}
                    >
                      <path d="M12 16l-6-6h12l-6 6z" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Results Display Component
// Requirements: 18.4, 18.5
// ============================================================================

interface ResultsDisplayProps {
  result: AnalyzeResponse;
  currentStepIndex: number;
  onStepClick: (index: number) => void;
}

/**
 * Display framework analysis results organized by stages
 * Requirements: 18.4, 18.5
 */
function ResultsDisplay({
  result,
  currentStepIndex,
  onStepClick,
}: ResultsDisplayProps): React.ReactElement {
  return (
    <div className="space-y-4">
      {/* Two-column layout: Steps on left, Current step result on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Step navigation */}
        <div className="lg:col-span-1">
          <StepGuidance
            framework={result.framework}
            steps={result.steps}
            currentStepIndex={currentStepIndex}
            onStepClick={onStepClick}
          />
        </div>

        {/* Current step result */}
        <div className="lg:col-span-2">
          {result.steps[currentStepIndex] !== undefined && (
            <StepResultDisplay
              step={result.steps[currentStepIndex]}
              stepIndex={currentStepIndex}
              totalSteps={result.steps.length}
            />
          )}
        </div>
      </div>

      {/* Flowchart visualization */}
      <FlowchartVisualization steps={result.steps} framework={result.framework} />

      {/* Conclusion and Recommendations */}
      <GlassPanel className="p-4">
        <h3 className="text-sm font-medium text-ui-accent-primary mb-3">Conclusion</h3>
        <p className="text-sm text-ui-text-primary bg-ui-background/50 p-3 rounded-lg mb-4">
          {result.conclusion}
        </p>

        {result.recommendations.length > 0 && (
          <div>
            <h4 className="text-xs text-ui-text-secondary mb-2">Recommendations</h4>
            <ul className="space-y-1">
              {result.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-ui-text-primary flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-status-success mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 text-xs text-ui-text-muted text-right">
          Processed in {result.processingTimeMs}ms using {result.frameworkName}
        </div>
      </GlassPanel>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * FrameworkAnalysis - Dedicated screen for systematic framework analysis
 *
 * Features:
 * - Display all 8 frameworks (18.1)
 * - Auto-recommend based on problem (18.2)
 * - Step-by-step guidance (18.3)
 * - Results organized by framework stages (18.4)
 * - Flowchart visualization (18.5)
 * - Save as procedural memory (18.6)
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6
 */
export function FrameworkAnalysis({
  userId,
  sessionId,
  className = '',
}: FrameworkAnalysisProps): React.ReactElement {
  // State
  const [problem, setProblem] = useState('');
  const [selectedFramework, setSelectedFramework] = useState<FrameworkType | null>(
    'scientific-method'
  );
  const [recommendedFramework, setRecommendedFramework] = useState<FrameworkType | null>(null);
  const [context, setContext] = useState<AnalysisContext>({
    background: '',
    constraints: [],
    goals: [],
  });
  const [showContext, setShowContext] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
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
   * Update framework recommendation when problem changes
   * Requirements: 18.2
   */
  const handleProblemChange = useCallback((newProblem: string): void => {
    setProblem(newProblem);
    const recommended = recommendFramework(newProblem);
    setRecommendedFramework(recommended);

    // Auto-select recommended framework if none selected
    if (recommended !== null) {
      setSelectedFramework((current) => (current === null ? recommended : current));
    }
  }, []);

  /**
   * Generate content for saving analysis as procedural memory
   * Requirements: 18.6
   */
  const generateSaveContent = useCallback((): string => {
    if (result === null) return '';

    let content = `# ${result.frameworkName} Analysis\n\n`;
    content += `## Problem\n${problem}\n\n`;
    content += `## Framework Steps\n\n`;

    for (const [index, step] of result.steps.entries()) {
      content += `### Step ${String(index + 1)}: ${step.name}\n`;
      content += `**Description:** ${step.description}\n\n`;
      content += `**Result:**\n${step.result}\n\n`;
    }

    content += `## Conclusion\n${result.conclusion}\n\n`;

    if (result.recommendations.length > 0) {
      content += `## Recommendations\n`;
      content += result.recommendations.map((r) => `- ${r}`).join('\n');
    }

    return content;
  }, [result, problem]);

  /**
   * Handle save as procedural memory
   * Requirements: 18.6
   */
  const handleSaveAsMemory = useCallback(async () => {
    if (result === null) return;

    const content = generateSaveContent();
    // Note: The useSaveAsMemory hook saves as 'reflective' by default
    // For procedural memory, we would need to extend the hook or use the client directly
    // For now, we save as reflective with procedural tags
    await saveAsMemory(content);
  }, [result, generateSaveContent, saveAsMemory]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    if (problem.trim().length === 0) {
      setError('Please enter a problem to analyze');
      return;
    }

    if (selectedFramework === null) {
      setError('Please select a framework');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setCurrentStepIndex(0);

    const client = getDefaultClient();

    // Build context object only with non-empty values
    const contextObj: { background?: string; constraints?: string[]; goals?: string[] } = {};
    if (context.background.length > 0) {
      contextObj.background = context.background;
    }
    if (context.constraints.length > 0) {
      contextObj.constraints = context.constraints;
    }
    if (context.goals.length > 0) {
      contextObj.goals = context.goals;
    }
    const hasContext = Object.keys(contextObj).length > 0;

    try {
      const operationId = startOperation('analyze', problem);

      const request: import('../types/api').AnalyzeRequest = {
        problem,
        preferredFramework: selectedFramework,
        userId,
      };
      if (hasContext) {
        request.context = contextObj;
      }

      const response = await client.analyze(request);

      setResult(response);
      completeOperation(operationId, { type: 'analyze', data: response });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      failOperation('', message);
    } finally {
      setIsProcessing(false);
    }
  }, [
    problem,
    selectedFramework,
    context,
    userId,
    startOperation,
    completeOperation,
    failOperation,
  ]);

  /**
   * Handle clear/reset
   */
  const handleClear = useCallback(() => {
    setProblem('');
    setSelectedFramework(null);
    setRecommendedFramework(null);
    setResult(null);
    setCurrentStepIndex(0);
    setError(null);
    clearSaveError();
  }, [clearSaveError]);

  /**
   * Handle step navigation
   */
  const handleStepClick = useCallback((index: number): void => {
    setCurrentStepIndex(index);
  }, []);

  const canSubmit = problem.trim().length > 0 && selectedFramework !== null && !isProcessing;
  const hasResult = result !== null;

  return (
    <div className={`min-h-screen bg-ui-background p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ui-accent-primary flex items-center gap-2">
            <BarChart3 size={24} />
            Framework Analysis
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
          <div className="p-3 status-badge-error border rounded-lg text-sm">
            {error ?? saveError}
          </div>
        )}

        {/* Problem Input */}
        <ProblemInput
          value={problem}
          onChange={handleProblemChange}
          disabled={isProcessing}
          autoFocus
          onSubmit={(): void => {
            void handleSubmit();
          }}
        />

        {/* Framework Selection - Requirements: 18.1, 18.2 */}
        <FrameworkSelection
          selectedFramework={selectedFramework}
          recommendedFramework={recommendedFramework}
          onFrameworkChange={setSelectedFramework}
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

        {/* Results Display - Requirements: 18.3, 18.4, 18.5 */}
        {hasResult && (
          <ResultsDisplay
            result={result}
            currentStepIndex={currentStepIndex}
            onStepClick={handleStepClick}
          />
        )}
      </div>

      {/* Floating Action Button - Bottom center */}
      <button
        onClick={(): void => {
          void handleSubmit();
        }}
        disabled={!canSubmit}
        className={`fixed bottom-[5vh] left-1/2 -translate-x-1/2 z-50 w-56 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group hover:scale-105 active:scale-95 ${
          canSubmit
            ? 'bg-ui-accent-primary hover:bg-ui-accent-primary/90 text-ui-background'
            : 'bg-ui-border text-ui-text-muted cursor-not-allowed'
        }`}
        aria-label="Analyze problem"
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
            <span className="font-medium text-sm">Analyzing...</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="font-medium text-sm">Analyze Problem</span>
          </>
        )}
      </button>
    </div>
  );
}

export default FrameworkAnalysis;
