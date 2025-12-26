/**
 * ConfidenceBiasDashboard Screen
 *
 * Dashboard for assessing confidence and detecting biases in reasoning.
 * Provides multi-dimensional confidence assessment with radar chart visualization
 * and bias detection with severity-colored cards.
 *
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { getDefaultClient } from "../api/client";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Lightbulb,
  MessageCircle,
  Scale,
} from "../components/icons/Icons";
import { useCognitiveStore } from "../stores/cognitiveStore";
import type { AssessConfidenceResponse, BiasDetection, DetectBiasResponse } from "../types/api";

// ============================================================================
// Types
// ============================================================================

export interface ConfidenceBiasDashboardProps {
  /** User ID for memory operations */
  userId: string;
  /** Session ID for memory operations */
  sessionId: string;
  /** Additional CSS classes */
  className?: string;
}

interface AnalysisResult {
  confidence: AssessConfidenceResponse | null;
  bias: DetectBiasResponse | null;
  originalText: string;
}

// ============================================================================
// Constants
// ============================================================================

const CONFIDENCE_DIMENSIONS = [
  {
    key: "evidenceQuality",
    label: "Evidence Quality",
    description: "Quality and reliability of supporting evidence",
  },
  {
    key: "reasoningCoherence",
    label: "Reasoning Coherence",
    description: "Logical consistency and flow of reasoning",
  },
  {
    key: "completeness",
    label: "Completeness",
    description: "Coverage of relevant aspects and considerations",
  },
  {
    key: "uncertaintyLevel",
    label: "Uncertainty Level",
    description: "Acknowledgment and handling of uncertainties",
  },
  { key: "biasFreedom", label: "Bias Freedom", description: "Freedom from cognitive biases" },
] as const;

const BIAS_TYPE_LABELS: Record<string, string> = {
  confirmation: "Confirmation Bias",
  anchoring: "Anchoring Bias",
  availability: "Availability Bias",
  recency: "Recency Bias",
  representativeness: "Representativeness Bias",
  framing: "Framing Bias",
  sunk_cost: "Sunk Cost Bias",
  attribution: "Attribution Bias",
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

/**
 * Format a number as percentage
 */
function formatPercentage(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

import { getSeverityColorClass } from "../utils/dashboardUtils";

/**
 * Get severity label
 */
function getSeverityLabel(severity: number): string {
  if (severity >= 0.7) return "High";
  if (severity >= 0.4) return "Medium";
  return "Low";
}

/**
 * Get overall risk color class - uses CSS classes for theme-aware colors
 */
function getRiskColorClass(risk: "low" | "medium" | "high"): string {
  switch (risk) {
    case "high":
      return "status-badge-error border";
    case "medium":
      return "status-badge-warning border";
    case "low":
      return "status-badge-success border";
  }
}

// ============================================================================
// Input Area Component
// Requirements: 20.1
// ============================================================================

interface ReasoningInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

/**
 * Text input area for reasoning to analyze
 * Requirements: 20.1
 */
function ReasoningInput({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  onSubmit,
}: ReasoningInputProps): React.ReactElement {
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
        htmlFor="reasoning-input"
        className="block text-sm font-medium text-ui-accent-primary mb-2"
      >
        Reasoning to Analyze
      </label>
      <textarea
        ref={textareaRef}
        id="reasoning-input"
        name="reasoning-input"
        value={value}
        onChange={(e): void => {
          onChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Enter the reasoning, argument, or text you want to analyze for confidence and biases..."
        className={`
          w-full h-40 p-3
          bg-ui-background/50 border border-ui-border rounded-lg
          text-ui-text-primary placeholder-ui-text-muted
          resize-none
          focus:outline-none focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        aria-describedby="reasoning-input-hint"
      />
      <p id="reasoning-input-hint" className="mt-2 text-xs text-ui-text-muted">
        Provide reasoning, arguments, or analysis text. The system will assess confidence levels and
        detect potential cognitive biases. Press ⌘+Enter to analyze.
      </p>
    </GlassPanel>
  );
}

// ============================================================================
// Evidence Input Component (Optional)
// ============================================================================

interface EvidenceInputProps {
  evidence: string[];
  onEvidenceChange: (evidence: string[]) => void;
  context: string;
  onContextChange: (context: string) => void;
  disabled?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

/**
 * Optional evidence and context input
 */
function EvidenceInput({
  evidence,
  onEvidenceChange,
  context,
  onContextChange,
  disabled = false,
  isExpanded,
  onToggleExpand,
}: EvidenceInputProps): React.ReactElement {
  const handleEvidenceChange = (value: string): void => {
    onEvidenceChange(
      value
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    );
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
            <label htmlFor="evidence-input" className="block text-xs text-ui-text-secondary mb-1">
              Supporting Evidence (one per line)
            </label>
            <textarea
              id="evidence-input"
              name="evidence-input"
              value={evidence.join("\n")}
              onChange={(e): void => {
                handleEvidenceChange(e.target.value);
              }}
              disabled={disabled}
              placeholder="List supporting evidence, sources, or data points..."
              className={`
                w-full h-24 p-2
                bg-ui-background/50 border border-ui-border rounded
                text-sm text-ui-text-primary placeholder-ui-text-muted
                resize-none
                focus:outline-none focus:border-ui-accent-primary
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
            />
          </div>

          <div>
            <label htmlFor="context-input" className="block text-xs text-ui-text-secondary mb-1">
              Context
            </label>
            <textarea
              id="context-input"
              name="context-input"
              value={context}
              onChange={(e): void => {
                onContextChange(e.target.value);
              }}
              disabled={disabled}
              placeholder="Provide additional context for the analysis..."
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
// Radar Chart Component for Confidence Assessment
// Requirements: 20.2, 20.3
// ============================================================================

interface RadarChartProps {
  dimensions: {
    evidenceQuality: number;
    reasoningCoherence: number;
    completeness: number;
    uncertaintyLevel: number;
    biasFreedom: number;
  };
  size?: number;
}

/**
 * Get color based on confidence value
 */
function getConfidenceColor(value: number): string {
  if (value >= 0.7) return "#27AE60"; // Green
  if (value >= 0.4) return "#F39C12"; // Yellow
  return "#E74C3C"; // Red
}

/**
 * Radar chart visualization for five confidence dimensions
 * Requirements: 20.2, 20.3
 */
function RadarChart({ dimensions, size = 300 }: RadarChartProps): React.ReactElement {
  const center = size / 2;
  const radius = (size - 60) / 2;
  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2; // Start from top

  // Calculate points for each dimension
  const points = CONFIDENCE_DIMENSIONS.map((dim, index) => {
    const value = dimensions[dim.key];
    const angle = startAngle + index * angleStep;
    const r = radius * value;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      labelX: center + (radius + 30) * Math.cos(angle),
      labelY: center + (radius + 30) * Math.sin(angle),
      axisEndX: center + radius * Math.cos(angle),
      axisEndY: center + radius * Math.sin(angle),
      value,
      label: dim.label,
      color: getConfidenceColor(value),
    };
  });

  // Create polygon path
  const polygonPath =
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${String(p.x)} ${String(p.y)}`).join(" ") + " Z";

  // Create grid lines
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridPaths = gridLevels.map((level) => {
    const gridPoints = CONFIDENCE_DIMENSIONS.map((_, index) => {
      const angle = startAngle + index * angleStep;
      const r = radius * level;
      return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
    });
    return (
      gridPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${String(p.x)} ${String(p.y)}`).join(" ") +
      " Z"
    );
  });

  // Create axis lines
  const axisLines = CONFIDENCE_DIMENSIONS.map((_, index) => {
    const angle = startAngle + index * angleStep;
    return {
      x1: center,
      y1: center,
      x2: center + radius * Math.cos(angle),
      y2: center + radius * Math.sin(angle),
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Glow filter */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0, 255, 255, 0.3)" />
            <stop offset="100%" stopColor="rgba(155, 89, 182, 0.2)" />
          </linearGradient>
        </defs>

        {/* Background glow */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(0, 255, 255, 0.1)"
          strokeWidth="20"
          filter="url(#glow)"
        />

        {/* Grid circles with gradient opacity */}
        {gridPaths.map((path, index) => (
          <path
            key={`grid-${String(index)}`}
            d={path}
            fill="none"
            stroke={`rgba(0, 255, 255, ${String(0.05 + index * 0.03)})`}
            strokeWidth="1"
          />
        ))}

        {/* Axis lines with glow */}
        {axisLines.map((line, index) => (
          <line
            key={`axis-${String(index)}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(0, 255, 255, 0.2)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Data polygon with gradient fill and glow */}
        <path
          d={polygonPath}
          fill="url(#radarGradient)"
          stroke="rgba(0, 255, 255, 0.9)"
          strokeWidth="2"
          filter="url(#glow)"
        />

        {/* Data points with individual colors */}
        {points.map((point, index) => (
          <g key={`point-${String(index)}`}>
            {/* Outer glow */}
            <circle
              cx={point.x}
              cy={point.y}
              r="8"
              fill={point.color}
              opacity="0.3"
              filter="url(#glow)"
            />
            {/* Inner point */}
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill={point.color}
              stroke="white"
              strokeWidth="2"
            />
          </g>
        ))}

        {/* Labels with background */}
        {points.map((point, index) => (
          <g key={`label-${String(index)}`}>
            <text
              x={point.labelX}
              y={point.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-ui-text-secondary font-medium"
              style={{ fontSize: "11px" }}
            >
              {point.label.split(" ").map((word, i) => (
                <tspan key={String(i)} x={point.labelX} dy={i === 0 ? 0 : 13}>
                  {word}
                </tspan>
              ))}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend with values - enhanced styling */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs w-full max-w-md">
        {points.map((point, index) => (
          <div
            key={String(index)}
            className="flex items-center gap-2 p-2 rounded-lg bg-ui-background/30 border border-ui-border/30"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: point.color, boxShadow: `0 0 8px ${point.color}` }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-ui-text-muted block truncate">{point.label}</span>
              <span className="font-semibold" style={{ color: point.color }}>
                {formatPercentage(point.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Confidence Assessment Display Component
// Requirements: 20.2, 20.3
// ============================================================================

interface ConfidenceDisplayProps {
  result: AssessConfidenceResponse;
}

/**
 * Display confidence assessment with radar chart
 * Requirements: 20.2, 20.3
 */
function ConfidenceDisplay({ result }: ConfidenceDisplayProps): React.ReactElement {
  const overallColor = getConfidenceColor(result.overall);

  return (
    <GlassPanel className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-ui-accent-primary flex items-center gap-2">
          <BarChart3 size={24} />
          Confidence Assessment
        </h3>
        <div className="flex items-center gap-3 bg-ui-background/50 px-4 py-2 rounded-lg">
          <span className="text-sm text-ui-text-muted">Overall Score</span>
          <div className="w-24 h-2.5 bg-ui-border/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-slow"
              style={{
                width: `${String(result.overall * 100)}%`,
                backgroundColor: overallColor,
                boxShadow: `0 0 10px ${overallColor}`,
              }}
            />
          </div>
          <span className="text-xl font-bold" style={{ color: overallColor }}>
            {formatPercentage(result.overall)}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Radar Chart */}
        <div className="flex-shrink-0 flex justify-center">
          <RadarChart dimensions={result.dimensions} size={320} />
        </div>

        {/* Details */}
        <div className="flex-1 space-y-5">
          {/* Interpretation */}
          <div className="p-4 rounded-xl border-2 border-ui-accent-primary/30 bg-gradient-to-b from-ui-accent-primary/10 to-transparent">
            <h4 className="text-sm font-semibold text-ui-accent-primary mb-3 flex items-center gap-2">
              <MessageCircle size={16} />
              Interpretation
            </h4>
            <p className="text-sm text-ui-text-primary leading-relaxed">{result.interpretation}</p>
          </div>

          {/* Warnings - theme-aware colors */}
          {result.warnings.length > 0 && (
            <div
              className="p-4 rounded-xl border-2"
              style={{
                borderColor: "var(--status-warning-border)",
                background: "linear-gradient(to bottom, var(--status-warning-bg), transparent)",
              }}
            >
              <h4
                className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color: "var(--status-warning-text)" }}
              >
                <AlertCircle size={16} />
                Warnings
                <span className="text-xs font-normal text-ui-text-muted">
                  ({result.warnings.length})
                </span>
              </h4>
              <div className="space-y-2">
                {result.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-lg"
                    style={{ background: "var(--status-warning-bg)" }}
                  >
                    <span style={{ color: "var(--status-warning-text)" }} className="mt-0.5">
                      ⚠
                    </span>
                    <span className="text-sm text-ui-text-primary">{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations - theme-aware colors */}
          {result.recommendations.length > 0 && (
            <div
              className="p-4 rounded-xl border-2"
              style={{
                borderColor: "var(--status-success-border)",
                background: "linear-gradient(to bottom, var(--status-success-bg), transparent)",
              }}
            >
              <h4
                className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color: "var(--status-success-text)" }}
              >
                <CheckCircle2 size={16} />
                Recommendations
                <span className="text-xs font-normal text-ui-text-muted">
                  ({result.recommendations.length})
                </span>
              </h4>
              <div className="space-y-2">
                {result.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-lg"
                    style={{ background: "var(--status-success-bg)" }}
                  >
                    <CheckCircle2
                      size={14}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: "var(--status-success-text)" }}
                    />
                    <span className="text-sm text-ui-text-primary">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-ui-text-muted text-right pt-2">
            Processed in {result.processingTimeMs}ms
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Bias Detection Display Component
// Requirements: 20.4, 20.5, 24.2
// ============================================================================

interface BiasCardProps {
  bias: BiasDetection;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Get severity-specific styling
 */
function getSeverityStyles(severity: number): {
  bgGradient: string;
  borderGlow: string;
  icon: React.ReactElement;
} {
  if (severity >= 0.7) {
    return {
      bgGradient: "bg-gradient-to-r from-red-500/20 to-red-500/5",
      borderGlow: "shadow-[0_0_15px_rgba(231,76,60,0.3)]",
      icon: <CircleDot size={20} className="text-red-400" />,
    };
  }
  if (severity >= 0.4) {
    return {
      bgGradient: "bg-gradient-to-r from-yellow-500/20 to-yellow-500/5",
      borderGlow: "shadow-[0_0_15px_rgba(243,156,18,0.3)]",
      icon: <CircleDot size={20} className="text-yellow-400" />,
    };
  }
  return {
    bgGradient: "bg-gradient-to-r from-green-500/20 to-green-500/5",
    borderGlow: "shadow-[0_0_15px_rgba(39,174,96,0.3)]",
    icon: <CircleDot size={20} className="text-green-400" />,
  };
}

/**
 * Expandable bias card with severity coloring
 * Requirements: 20.4, 20.5, 24.2
 */
function BiasCard({ bias, isExpanded, onToggle }: BiasCardProps): React.ReactElement {
  const colorClass = getSeverityColorClass(bias.severity);
  const styles = getSeverityStyles(bias.severity);
  const labelFromMap = BIAS_TYPE_LABELS[bias.type];
  const biasLabel = labelFromMap !== undefined ? labelFromMap : bias.type;

  return (
    <div
      className={`
        rounded-xl border-2 overflow-hidden transition-all duration-normal
        ${colorClass} ${styles.bgGradient}
        ${isExpanded ? styles.borderGlow : ""}
        hover:scale-[1.01]
      `}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left group"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-4">
          <span className="text-2xl transition-transform duration-normal group-hover:scale-110">
            {styles.icon}
          </span>
          <div>
            <span className="block text-base font-semibold">{biasLabel}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs opacity-70">Severity:</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-current/20">
                {getSeverityLabel(bias.severity)}
              </span>
              <div className="w-16 h-1.5 bg-ui-border/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-current"
                  style={{ width: `${String(bias.severity * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold">{formatPercentage(bias.severity)}</span>
            </div>
          </div>
        </div>
        <span
          className={`text-ui-text-muted transition-transform duration-normal ${isExpanded ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {/* Expandable content with smooth animation */}
      <div
        className={`
          overflow-hidden transition-all duration-normal
          ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
        `}
      >
        <div className="px-4 pb-4 space-y-4 border-t border-inherit pt-4">
          {/* Evidence */}
          {bias.evidence.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-ui-text-secondary mb-2 flex items-center gap-2">
                <ClipboardList size={14} />
                Evidence
              </h5>
              <ul className="space-y-2">
                {bias.evidence.map((item: string, idx: number) => (
                  <li
                    key={String(idx)}
                    className="text-sm text-ui-text-primary flex items-start gap-2 p-2 bg-ui-background/30 rounded-lg"
                  >
                    <span className="opacity-50 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Correction Strategy */}
          <div>
            <h5 className="text-xs font-semibold text-ui-text-secondary mb-2 flex items-center gap-2">
              <Lightbulb size={14} />
              Correction Strategy
            </h5>
            <div className="p-3 bg-ui-background/40 rounded-lg border border-ui-border/30">
              <p className="text-sm text-ui-text-primary leading-relaxed">
                {bias.correctionStrategy}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BiasDisplayProps {
  result: DetectBiasResponse;
}

/**
 * Display bias detection results with severity-colored cards
 * Requirements: 20.4, 20.5
 */
function BiasDisplay({ result }: BiasDisplayProps): React.ReactElement {
  const [expandedBiases, setExpandedBiases] = useState<Set<number>>(new Set());

  const toggleBias = (index: number): void => {
    setExpandedBiases((prev: Set<number>) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const expandAll = (): void => {
    setExpandedBiases(new Set(result.biases.map((_, i) => i)));
  };

  const collapseAll = (): void => {
    setExpandedBiases(new Set());
  };

  const riskColorClass = getRiskColorClass(result.overallRisk);

  return (
    <GlassPanel className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-ui-accent-primary">Bias Detection</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ui-text-muted">Overall Risk:</span>
            <span className={`text-sm font-bold px-2 py-0.5 rounded border ${riskColorClass}`}>
              {result.overallRisk.toUpperCase()}
            </span>
          </div>
          {result.biases.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-xs text-ui-accent-secondary hover:text-ui-accent-primary"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="text-xs text-ui-accent-secondary hover:text-ui-accent-primary"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      {result.biases.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle2 size={40} className="mx-auto mb-2 text-green-400" />
          <p className="text-sm text-ui-text-secondary">No significant biases detected</p>
        </div>
      ) : (
        <div className="space-y-3">
          {result.biases.map((bias, index) => (
            <BiasCard
              key={index}
              bias={bias}
              isExpanded={expandedBiases.has(index)}
              onToggle={(): void => {
                toggleBias(index);
              }}
            />
          ))}
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-ui-border">
          <h4 className="text-xs text-green-400 mb-2">Recommendations</h4>
          <ul className="space-y-1">
            {result.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-ui-text-primary flex items-start gap-2">
                <CheckCircle2 size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 text-xs text-ui-text-muted text-right">
        Processed in {result.processingTimeMs}ms
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Re-Analysis Component
// Requirements: 20.6
// ============================================================================

interface ReAnalysisProps {
  previousResult: AnalysisResult;
  currentResult: AnalysisResult;
}

/**
 * Display improvement metrics after re-analysis
 * Requirements: 20.6
 */
function ReAnalysisMetrics({ previousResult, currentResult }: ReAnalysisProps): React.ReactElement {
  const prevConfidence = previousResult.confidence?.overall ?? 0;
  const currConfidence = currentResult.confidence?.overall ?? 0;
  const confidenceChange = currConfidence - prevConfidence;

  const prevBiasCount = previousResult.bias?.biases.length ?? 0;
  const currBiasCount = currentResult.bias?.biases.length ?? 0;
  const biasChange = currBiasCount - prevBiasCount;

  const prevRisk = previousResult.bias?.overallRisk ?? "low";
  const currRisk = currentResult.bias?.overallRisk ?? "low";
  const riskOrder = { low: 0, medium: 1, high: 2 };
  const riskImproved = riskOrder[currRisk] < riskOrder[prevRisk];

  return (
    <GlassPanel className="p-4">
      <h3 className="text-sm font-medium text-ui-accent-primary mb-4">Improvement Metrics</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Confidence Change */}
        <div className="bg-ui-background/50 p-3 rounded-lg text-center">
          <span className="text-xs text-ui-text-muted block mb-1">Confidence</span>
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg font-bold text-ui-text-primary">
              {formatPercentage(currConfidence)}
            </span>
            <span
              className={`text-sm ${confidenceChange >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {confidenceChange >= 0 ? "↑" : "↓"} {formatPercentage(Math.abs(confidenceChange))}
            </span>
          </div>
        </div>

        {/* Bias Count Change */}
        <div className="bg-ui-background/50 p-3 rounded-lg text-center">
          <span className="text-xs text-ui-text-muted block mb-1">Biases Detected</span>
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg font-bold text-ui-text-primary">{currBiasCount}</span>
            <span className={`text-sm ${biasChange <= 0 ? "text-green-400" : "text-red-400"}`}>
              {biasChange <= 0 ? "↓" : "↑"} {Math.abs(biasChange)}
            </span>
          </div>
        </div>

        {/* Risk Level Change */}
        <div className="bg-ui-background/50 p-3 rounded-lg text-center">
          <span className="text-xs text-ui-text-muted block mb-1">Risk Level</span>
          <div className="flex items-center justify-center gap-2">
            <span
              className={`text-lg font-bold px-2 py-0.5 rounded ${getRiskColorClass(currRisk)}`}
            >
              {currRisk.toUpperCase()}
            </span>
            {riskImproved && <span className="text-green-400">✓</span>}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ConfidenceBiasDashboard - Dashboard for confidence assessment and bias detection
 *
 * Features:
 * - Text input for reasoning to analyze (20.1)
 * - Radar chart for five confidence dimensions (20.2, 20.3)
 * - Severity-colored bias cards with expandable details (20.4, 20.5)
 * - Re-analysis flow with improvement metrics (20.6)
 *
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6
 */
export function ConfidenceBiasDashboard({
  userId: _userId,
  sessionId: _sessionId,
  className = "",
}: ConfidenceBiasDashboardProps): React.ReactElement {
  // Note: userId and sessionId are available for future memory operations
  void _userId;
  void _sessionId;
  // State
  const [reasoning, setReasoning] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [previousResult, setPreviousResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cognitive store
  const startOperation = useCognitiveStore((state) => state.startOperation);
  const completeOperation = useCognitiveStore((state) => state.completeOperation);
  const failOperation = useCognitiveStore((state) => state.failOperation);

  /**
   * Handle analysis submission
   */
  const handleAnalyze = useCallback(async () => {
    if (reasoning.trim().length === 0) {
      setError("Please enter reasoning to analyze");
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Save current result as previous for comparison
    if (currentResult !== null) {
      setPreviousResult(currentResult);
    }

    const client = getDefaultClient();

    try {
      const operationId = startOperation("assess_confidence", reasoning);

      // Build request objects conditionally to avoid undefined values
      const confidenceRequest: { reasoning: string; evidence?: string[]; context?: string } = {
        reasoning,
      };
      if (evidence.length > 0) {
        confidenceRequest.evidence = evidence;
      }
      if (context.length > 0) {
        confidenceRequest.context = context;
      }

      const biasRequest: { reasoning: string; context?: string } = {
        reasoning,
      };
      if (context.length > 0) {
        biasRequest.context = context;
      }

      // Run both confidence assessment and bias detection in parallel
      const [confidenceResponse, biasResponse] = await Promise.all([
        client.assessConfidence(confidenceRequest),
        client.detectBias(biasRequest),
      ]);

      const result: AnalysisResult = {
        confidence: confidenceResponse,
        bias: biasResponse,
        originalText: reasoning,
      };

      setCurrentResult(result);
      // Store confidence result in cognitive store
      completeOperation(operationId, { type: "assess_confidence", data: confidenceResponse });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      failOperation("", errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [
    reasoning,
    evidence,
    context,
    currentResult,
    startOperation,
    completeOperation,
    failOperation,
  ]);

  /**
   * Handle re-analysis with corrections applied
   * Requirements: 20.6
   */
  const handleReAnalyze = useCallback(async () => {
    await handleAnalyze();
  }, [handleAnalyze]);
  // Expose handleReAnalyze for potential future use
  void handleReAnalyze;

  /**
   * Handle clear/reset
   */
  const handleClear = useCallback(() => {
    setReasoning("");
    setEvidence([]);
    setContext("");
    setCurrentResult(null);
    setPreviousResult(null);
    setError(null);
  }, []);

  /**
   * Apply correction suggestions to the reasoning text
   */
  const handleApplyCorrections = useCallback(() => {
    if (currentResult === null || currentResult.bias === null) return;

    // Create a note about corrections to apply
    const corrections = currentResult.bias.biases
      .map((b: BiasDetection) => {
        const biasLabel = BIAS_TYPE_LABELS[b.type];
        const label = biasLabel !== undefined ? biasLabel : b.type;
        return `- ${label}: ${b.correctionStrategy}`;
      })
      .join("\n");

    const correctedReasoning = `${reasoning}\n\n[Corrections Applied]\n${corrections}`;
    setReasoning(correctedReasoning);
  }, [reasoning, currentResult]);

  const canAnalyze = reasoning.trim().length > 0 && !isProcessing;
  const hasResult = currentResult !== null;
  const showComparison = previousResult !== null && currentResult !== null;

  // Handle Cmd+Enter keyboard shortcut to analyze
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canAnalyze) {
        e.preventDefault();
        void handleAnalyze();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canAnalyze, handleAnalyze]);

  return (
    <div className={`min-h-screen bg-ui-background p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ui-accent-primary flex items-center gap-2">
            <Scale size={24} />
            Confidence & Bias Dashboard
          </h1>
          <div className="flex gap-2">
            {hasResult && (
              <button
                onClick={handleClear}
                className="px-4 py-2 text-sm bg-ui-border/50 text-ui-text-secondary rounded-lg hover:bg-ui-border transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error !== null && (
          <GlassPanel className="p-4 border-red-500/50">
            <div className="flex items-center gap-2 text-red-400">
              <span>⚠</span>
              <span className="text-sm">{error}</span>
            </div>
          </GlassPanel>
        )}

        {/* Input Section */}
        <div className="space-y-4">
          {/* Reasoning Input - Requirements: 20.1 */}
          <ReasoningInput
            value={reasoning}
            onChange={setReasoning}
            disabled={isProcessing}
            autoFocus
            onSubmit={(): void => {
              void handleAnalyze();
            }}
          />

          {/* Evidence Input (Optional) */}
          <EvidenceInput
            evidence={evidence}
            onEvidenceChange={setEvidence}
            context={context}
            onContextChange={setContext}
            disabled={isProcessing}
            isExpanded={showEvidence}
            onToggleExpand={(): void => {
              setShowEvidence(!showEvidence);
            }}
          />

          {/* Apply Corrections Button (only shown when biases detected) */}
          {hasResult && currentResult.bias !== null && currentResult.bias.biases.length > 0 && (
            <button
              onClick={handleApplyCorrections}
              disabled={isProcessing}
              className="w-full py-3 px-6 rounded-lg font-medium bg-ui-accent-secondary/20 text-ui-accent-secondary border border-ui-accent-secondary/50 hover:bg-ui-accent-secondary/30 transition-colors"
            >
              Apply Corrections
            </button>
          )}
        </div>

        {/* Results Section */}
        {hasResult && (
          <div className="space-y-4">
            {/* Improvement Metrics (if re-analysis) - Requirements: 20.6 */}
            {showComparison && (
              <ReAnalysisMetrics previousResult={previousResult} currentResult={currentResult} />
            )}

            {/* Confidence Assessment - Requirements: 20.2, 20.3 */}
            {currentResult.confidence !== null && (
              <ConfidenceDisplay result={currentResult.confidence} />
            )}

            {/* Bias Detection - Requirements: 20.4, 20.5 */}
            {currentResult.bias !== null && <BiasDisplay result={currentResult.bias} />}
          </div>
        )}
      </div>

      {/* Floating Action Button - Bottom center */}
      <button
        onClick={(): void => {
          void handleAnalyze();
        }}
        disabled={!canAnalyze}
        className={`fixed bottom-[5vh] left-1/2 -translate-x-1/2 z-50 w-48 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group hover:scale-105 active:scale-95 ${
          canAnalyze
            ? "bg-[#0a1628] hover:bg-[#0d1e38] text-[#00FFFF] border border-[#00FFFF]/40"
            : "bg-[#0a1628]/50 text-[#00FFFF]/30 border border-[#00FFFF]/10 cursor-not-allowed"
        }`}
        aria-label="Analyze"
        style={
          canAnalyze
            ? {
                boxShadow: "0 0 20px rgba(0, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4)",
              }
            : undefined
        }
      >
        {isProcessing ? (
          <>
            <LoadingSpinner size={20} />
            <span className="font-semibold text-sm">Analyzing...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="font-semibold text-sm">Analyze</span>
            <kbd className="ml-1 px-2 py-1 text-xs font-medium bg-[#00FFFF]/20 text-[#00FFFF] rounded border border-[#00FFFF]/40">
              ⌘↵
            </kbd>
          </>
        )}
      </button>
    </div>
  );
}

export default ConfidenceBiasDashboard;
