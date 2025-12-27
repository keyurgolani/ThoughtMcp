/**
 * CognitiveResultPanel Component
 *
 * Displays results from cognitive processing operations with styled panels
 * consistent with the UI design. Supports all cognitive result types:
 * analyze-reasoning, detect-bias, assess-confidence, detect-emotion, decompose.
 *
 * Requirements: 16.7, 16.8
 */

import { useCallback, useState } from "react";
import type { BiasDetection, DiscreteEmotionResult, SubProblem } from "../../types/api";
import { getSeverityColorClass } from "../../utils/dashboardUtils";
import { formatPercentage } from "../../utils/formatUtils";
import type {
  AnalyzeReasoningResult,
  AssessConfidenceResult,
  CognitiveResultData,
  DecomposeResult,
  DetectBiasResult,
  DetectEmotionResult,
} from "./MemoryCognitivePanel";

// ============================================================================
// Types
// ============================================================================

export interface CognitiveResultPanelProps {
  /** The cognitive result to display */
  result: CognitiveResultData;
  /** Callback to close the panel */
  onClose: () => void;
  /** Callback to save result as a new memory */
  onSaveAsMemory?: (content: string, linkedMemoryId?: string) => void;
  /** ID of the source memory (for linking) */
  sourceMemoryId?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get risk level color class
 */
function getRiskColorClass(risk: "low" | "medium" | "high"): string {
  switch (risk) {
    case "high":
      return "text-red-400";
    case "medium":
      return "text-yellow-400";
    case "low":
      return "text-green-400";
  }
}

/**
 * Get complexity color class
 */
function getComplexityColorClass(complexity: "low" | "medium" | "high"): string {
  switch (complexity) {
    case "high":
      return "text-red-400";
    case "medium":
      return "text-yellow-400";
    case "low":
      return "text-green-400";
  }
}

/**
 * Get emotion intensity color class
 */
function getIntensityColorClass(intensity: "low" | "medium" | "high"): string {
  switch (intensity) {
    case "high":
      return "text-purple-400";
    case "medium":
      return "text-blue-400";
    case "low":
      return "text-gray-400";
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ModalOverlayProps {
  children: React.ReactNode;
  onClose: () => void;
}

/**
 * Modal overlay with backdrop
 */
function ModalOverlay({ children, onClose }: ModalOverlayProps): React.ReactElement {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}

interface ModalContentProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave?: (() => void) | undefined;
  isSaving?: boolean | undefined;
}

/**
 * Modal content container with glassmorphism styling
 * Requirements: 16.7
 */
function ModalContent({
  title,
  children,
  onClose,
  onSave,
  isSaving,
}: ModalContentProps): React.ReactElement {
  return (
    <div
      className="
        bg-ui-surface
        backdrop-blur-glass
        border border-ui-border
        rounded-lg
        shadow-glow
        max-w-2xl w-full mx-4
        max-h-[80vh] overflow-hidden
        flex flex-col
      "
      style={{
        boxShadow: `
          0 0 30px rgba(0, 255, 255, 0.2),
          inset 0 0 40px rgba(0, 255, 255, 0.05)
        `,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-ui-border">
        <h2 className="text-lg font-semibold text-ui-accent-primary">{title}</h2>
        <div className="flex items-center gap-2">
          {onSave !== undefined && (
            <button
              onClick={onSave}
              disabled={isSaving === true}
              className={`
                px-3 py-1 text-sm rounded transition-colors
                ${
                  isSaving === true
                    ? "bg-ui-border text-ui-text-muted cursor-not-allowed"
                    : "bg-ui-accent-primary/30 hover:bg-ui-accent-primary/50 text-ui-accent-primary"
                }
              `}
              aria-label="Save as memory"
            >
              {isSaving === true ? "Saving..." : "Save as Memory"}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-ui-border rounded transition-colors text-ui-text-secondary hover:text-ui-text-primary"
            aria-label="Close panel"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 overflow-y-auto flex-1">{children}</div>
    </div>
  );
}

// ============================================================================
// Result Display Components
// ============================================================================

interface AnalyzeReasoningDisplayProps {
  result: AnalyzeReasoningResult;
}

/**
 * Display analyze reasoning result
 * Requirements: 16.2, 16.7
 */
function AnalyzeReasoningDisplay({ result }: AnalyzeReasoningDisplayProps): React.ReactElement {
  const { data } = result;

  return (
    <div className="space-y-6">
      {/* Quality Metrics */}
      <div>
        <h3 className="text-sm font-medium text-ui-accent-secondary mb-3">Quality Assessment</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-ui-background/50 rounded-lg">
            <span className="text-xs text-ui-text-secondary block">Coherence</span>
            <span className="text-lg font-semibold text-ui-text-primary">
              {formatPercentage(data.quality.coherence)}
            </span>
          </div>
          <div className="p-3 bg-ui-background/50 rounded-lg">
            <span className="text-xs text-ui-text-secondary block">Completeness</span>
            <span className="text-lg font-semibold text-ui-text-primary">
              {formatPercentage(data.quality.completeness)}
            </span>
          </div>
          <div className="p-3 bg-ui-background/50 rounded-lg">
            <span className="text-xs text-ui-text-secondary block">Logical Validity</span>
            <span className="text-lg font-semibold text-ui-text-primary">
              {formatPercentage(data.quality.logicalValidity)}
            </span>
          </div>
          <div className="p-3 bg-ui-background/50 rounded-lg">
            <span className="text-xs text-ui-text-secondary block">Evidence Support</span>
            <span className="text-lg font-semibold text-ui-text-primary">
              {formatPercentage(data.quality.evidenceSupport)}
            </span>
          </div>
        </div>
      </div>

      {/* Strengths */}
      {data.strengths.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-green-400 mb-2">Strengths</h3>
          <ul className="space-y-1">
            {data.strengths.map((strength: string, index: number) => (
              <li key={index} className="text-sm text-ui-text-primary flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {data.weaknesses.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-yellow-400 mb-2">Weaknesses</h3>
          <ul className="space-y-1">
            {data.weaknesses.map((weakness: string, index: number) => (
              <li key={index} className="text-sm text-ui-text-primary flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">!</span>
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-ui-accent-primary mb-2">Recommendations</h3>
          <ul className="space-y-1">
            {data.recommendations.map((rec: string, index: number) => (
              <li key={index} className="text-sm text-ui-text-primary flex items-start gap-2">
                <span className="text-ui-accent-primary mt-0.5">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Processing time */}
      <div className="text-xs text-ui-text-muted text-right">
        Processed in {data.processingTimeMs}ms
      </div>
    </div>
  );
}

interface DetectBiasDisplayProps {
  result: DetectBiasResult;
}

/**
 * Display detect bias result
 * Requirements: 16.3, 16.7
 */
function DetectBiasDisplay({ result }: DetectBiasDisplayProps): React.ReactElement {
  const { data } = result;

  return (
    <div className="space-y-6">
      {/* Overall Risk */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-ui-text-secondary">Overall Risk:</span>
        <span className={`text-lg font-semibold capitalize ${getRiskColorClass(data.overallRisk)}`}>
          {data.overallRisk}
        </span>
      </div>

      {/* Detected Biases */}
      {data.biases.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-ui-accent-secondary mb-3">Detected Biases</h3>
          <div className="space-y-3">
            {data.biases.map((bias: BiasDetection, index: number) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getSeverityColorClass(bias.severity)}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium capitalize">
                    {bias.type.replace("_", " ")} Bias
                  </span>
                  <span className="text-xs">Severity: {formatPercentage(bias.severity)}</span>
                </div>
                {bias.evidence.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs opacity-70">Evidence:</span>
                    <ul className="mt-1 space-y-1">
                      {bias.evidence.map((ev: string, evIndex: number) => (
                        <li key={evIndex} className="text-xs opacity-80">
                          • {ev}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <span className="text-xs opacity-70">Correction Strategy:</span>
                  <p className="text-xs mt-1">{bias.correctionStrategy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm text-green-400">No significant biases detected.</p>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-ui-accent-primary mb-2">Recommendations</h3>
          <ul className="space-y-1">
            {data.recommendations.map((rec: string, index: number) => (
              <li key={index} className="text-sm text-ui-text-primary flex items-start gap-2">
                <span className="text-ui-accent-primary mt-0.5">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Processing time */}
      <div className="text-xs text-ui-text-muted text-right">
        Processed in {data.processingTimeMs}ms
      </div>
    </div>
  );
}

interface AssessConfidenceDisplayProps {
  result: AssessConfidenceResult;
}

/**
 * Display assess confidence result
 * Requirements: 16.4, 16.7
 */
function AssessConfidenceDisplay({ result }: AssessConfidenceDisplayProps): React.ReactElement {
  const { data } = result;

  return (
    <div className="space-y-6">
      {/* Overall Confidence */}
      <div className="text-center p-4 bg-ui-background/50 rounded-lg">
        <span className="text-sm text-ui-text-secondary block mb-1">Overall Confidence</span>
        <span
          className={`text-3xl font-bold ${
            data.overall >= 0.7
              ? "text-green-400"
              : data.overall >= 0.4
                ? "text-yellow-400"
                : "text-red-400"
          }`}
        >
          {formatPercentage(data.overall)}
        </span>
      </div>

      {/* Dimensions */}
      <div>
        <h3 className="text-sm font-medium text-ui-accent-secondary mb-3">Confidence Dimensions</h3>
        <div className="space-y-2">
          {Object.entries(data.dimensions).map(([key, value]: [string, number]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm text-ui-text-secondary w-40 capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <div className="flex-1 h-2 bg-ui-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    value >= 0.7 ? "bg-green-400" : value >= 0.4 ? "bg-yellow-400" : "bg-red-400"
                  }`}
                  style={{ width: `${String(value * 100)}%` }}
                />
              </div>
              <span className="text-sm text-ui-text-primary w-12 text-right">
                {formatPercentage(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Interpretation */}
      {data.interpretation && (
        <div>
          <h3 className="text-sm font-medium text-ui-accent-secondary mb-2">Interpretation</h3>
          <p className="text-sm text-ui-text-primary bg-ui-background/50 p-3 rounded-lg">
            {data.interpretation}
          </p>
        </div>
      )}

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-yellow-400 mb-2">Warnings</h3>
          <ul className="space-y-1">
            {data.warnings.map((warning: string, index: number) => (
              <li key={index} className="text-sm text-ui-text-primary flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">⚠</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-ui-accent-primary mb-2">Recommendations</h3>
          <ul className="space-y-1">
            {data.recommendations.map((rec: string, index: number) => (
              <li key={index} className="text-sm text-ui-text-primary flex items-start gap-2">
                <span className="text-ui-accent-primary mt-0.5">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Processing time */}
      <div className="text-xs text-ui-text-muted text-right">
        Processed in {data.processingTimeMs}ms
      </div>
    </div>
  );
}

interface DetectEmotionDisplayProps {
  result: DetectEmotionResult;
}

/**
 * Display detect emotion result
 * Requirements: 16.5, 16.7
 */
function DetectEmotionDisplay({ result }: DetectEmotionDisplayProps): React.ReactElement {
  const { data } = result;

  return (
    <div className="space-y-6">
      {/* Circumplex Model */}
      <div>
        <h3 className="text-sm font-medium text-ui-accent-secondary mb-3">Circumplex Analysis</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-ui-background/50 rounded-lg text-center">
            <span className="text-xs text-ui-text-secondary block mb-1">Valence</span>
            <span
              className={`text-lg font-semibold ${
                data.circumplex.valence >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {data.circumplex.valence >= 0 ? "+" : ""}
              {data.circumplex.valence.toFixed(2)}
            </span>
            <span className="text-xs text-ui-text-muted block">
              {data.circumplex.valence >= 0 ? "Positive" : "Negative"}
            </span>
          </div>
          <div className="p-3 bg-ui-background/50 rounded-lg text-center">
            <span className="text-xs text-ui-text-secondary block mb-1">Arousal</span>
            <span
              className={`text-lg font-semibold ${
                data.circumplex.arousal >= 0.5 ? "text-orange-400" : "text-blue-400"
              }`}
            >
              {data.circumplex.arousal.toFixed(2)}
            </span>
            <span className="text-xs text-ui-text-muted block">
              {data.circumplex.arousal >= 0.5 ? "High Energy" : "Low Energy"}
            </span>
          </div>
          <div className="p-3 bg-ui-background/50 rounded-lg text-center">
            <span className="text-xs text-ui-text-secondary block mb-1">Dominance</span>
            <span
              className={`text-lg font-semibold ${
                data.circumplex.dominance >= 0.5 ? "text-purple-400" : "text-gray-400"
              }`}
            >
              {data.circumplex.dominance.toFixed(2)}
            </span>
            <span className="text-xs text-ui-text-muted block">
              {data.circumplex.dominance >= 0.5 ? "In Control" : "Submissive"}
            </span>
          </div>
        </div>
      </div>

      {/* Dominant Emotion */}
      {data.dominantEmotion && (
        <div className="p-4 bg-ui-accent-primary/10 border border-ui-accent-primary/30 rounded-lg text-center">
          <span className="text-xs text-ui-text-secondary block mb-1">Dominant Emotion</span>
          <span className="text-xl font-semibold text-ui-accent-primary capitalize">
            {data.dominantEmotion}
          </span>
        </div>
      )}

      {/* Discrete Emotions */}
      {data.discreteEmotions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-ui-accent-secondary mb-3">Discrete Emotions</h3>
          <div className="space-y-2">
            {[...data.discreteEmotions]
              .sort((a: DiscreteEmotionResult, b: DiscreteEmotionResult) => b.score - a.score)
              .map((emotion: DiscreteEmotionResult, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm text-ui-text-primary w-24 capitalize">
                    {emotion.emotion}
                  </span>
                  <div className="flex-1 h-2 bg-ui-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-ui-accent-secondary"
                      style={{ width: `${String(emotion.score * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-ui-text-primary w-12 text-right">
                    {formatPercentage(emotion.score)}
                  </span>
                  <span
                    className={`text-xs capitalize ${getIntensityColorClass(emotion.intensity)}`}
                  >
                    {emotion.intensity}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Interpretation */}
      {data.interpretation && (
        <div>
          <h3 className="text-sm font-medium text-ui-accent-secondary mb-2">Interpretation</h3>
          <p className="text-sm text-ui-text-primary bg-ui-background/50 p-3 rounded-lg">
            {data.interpretation}
          </p>
        </div>
      )}

      {/* Processing time */}
      <div className="text-xs text-ui-text-muted text-right">
        Processed in {data.processingTimeMs}ms
      </div>
    </div>
  );
}

interface DecomposeDisplayProps {
  result: DecomposeResult;
}

/**
 * Recursive sub-problem tree node
 */
function SubProblemNode({
  subProblem,
  depth = 0,
}: {
  subProblem: SubProblem;
  depth?: number;
}): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = subProblem.children !== undefined && subProblem.children.length > 0;

  const handleClick = (): void => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (hasChildren && (e.key === "Enter" || e.key === " ")) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={depth > 0 ? "ml-4 border-l border-ui-border pl-3" : ""}>
      <div
        className={`
          p-3 rounded-lg bg-ui-background/50 border border-ui-border
          ${hasChildren ? "cursor-pointer hover:border-ui-accent-primary/50" : ""}
        `}
        onClick={handleClick}
        role={hasChildren ? "button" : undefined}
        tabIndex={hasChildren ? 0 : undefined}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {hasChildren && (
                <span className="text-ui-accent-primary text-xs">{isExpanded ? "▼" : "▶"}</span>
              )}
              <span className="text-sm font-medium text-ui-text-primary">
                {subProblem.description}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className={`capitalize ${getComplexityColorClass(subProblem.complexity)}`}>
                {subProblem.complexity} complexity
              </span>
              <span className="text-ui-text-muted">Order: {subProblem.executionOrder}</span>
              {subProblem.dependencies.length > 0 && (
                <span className="text-ui-text-muted">
                  Deps: {subProblem.dependencies.join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">
          {subProblem.children?.map((child: SubProblem) => (
            <SubProblemNode key={child.id} subProblem={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Display decompose result
 * Requirements: 16.6, 16.7
 */
function DecomposeDisplay({ result }: DecomposeDisplayProps): React.ReactElement {
  const { data } = result;

  return (
    <div className="space-y-6">
      {/* Root Problem */}
      <div>
        <h3 className="text-sm font-medium text-ui-accent-secondary mb-2">Root Problem</h3>
        <p className="text-sm text-ui-text-primary bg-ui-background/50 p-3 rounded-lg">
          {data.rootProblem}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-ui-text-secondary">
          <span className="text-ui-accent-primary">{data.totalSubProblems}</span> sub-problems
        </span>
        <span className="text-ui-text-secondary">
          Max depth: <span className="text-ui-accent-primary">{data.maxDepth}</span>
        </span>
      </div>

      {/* Sub-problems Tree */}
      {data.subProblems.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-ui-accent-secondary mb-3">Sub-Problems</h3>
          <div className="space-y-2">
            {data.subProblems.map((subProblem: SubProblem) => (
              <SubProblemNode key={subProblem.id} subProblem={subProblem} />
            ))}
          </div>
        </div>
      )}

      {/* Suggested Order */}
      {data.suggestedOrder.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-ui-accent-secondary mb-2">Suggested Order</h3>
          <ol className="list-decimal list-inside space-y-1">
            {data.suggestedOrder.map((id: string, index: number) => (
              <li key={index} className="text-sm text-ui-text-primary">
                {id}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Processing time */}
      <div className="text-xs text-ui-text-muted text-right">
        Processed in {data.processingTimeMs}ms
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Get modal title based on result type
 */
function getModalTitle(result: CognitiveResultData): string {
  switch (result.type) {
    case "analyze-reasoning":
      return "Reasoning Analysis";
    case "detect-bias":
      return "Bias Detection";
    case "assess-confidence":
      return "Confidence Assessment";
    case "detect-emotion":
      return "Emotion Analysis";
    case "decompose":
      return "Problem Decomposition";
  }
}

/**
 * Generate content for saving as memory
 */
function generateSaveContent(result: CognitiveResultData): string {
  switch (result.type) {
    case "analyze-reasoning": {
      const { data } = result;
      return `Reasoning Analysis Results:
Quality Scores:
- Coherence: ${formatPercentage(data.quality.coherence)}
- Completeness: ${formatPercentage(data.quality.completeness)}
- Logical Validity: ${formatPercentage(data.quality.logicalValidity)}
- Evidence Support: ${formatPercentage(data.quality.evidenceSupport)}

Strengths: ${data.strengths.join("; ")}
Weaknesses: ${data.weaknesses.join("; ")}
Recommendations: ${data.recommendations.join("; ")}`;
    }
    case "detect-bias": {
      const { data } = result;
      const biasesText = data.biases
        .map((b) => `${b.type} (${formatPercentage(b.severity)}): ${b.correctionStrategy}`)
        .join("\n");
      return `Bias Detection Results:
Overall Risk: ${data.overallRisk}

Detected Biases:
${biasesText || "No significant biases detected"}

Recommendations: ${data.recommendations.join("; ")}`;
    }
    case "assess-confidence": {
      const { data } = result;
      return `Confidence Assessment Results:
Overall Confidence: ${formatPercentage(data.overall)}

Dimensions:
- Evidence Quality: ${formatPercentage(data.dimensions.evidenceQuality)}
- Reasoning Coherence: ${formatPercentage(data.dimensions.reasoningCoherence)}
- Completeness: ${formatPercentage(data.dimensions.completeness)}
- Uncertainty Level: ${formatPercentage(data.dimensions.uncertaintyLevel)}
- Bias Freedom: ${formatPercentage(data.dimensions.biasFreedom)}

Interpretation: ${data.interpretation}
Warnings: ${data.warnings.join("; ")}
Recommendations: ${data.recommendations.join("; ")}`;
    }
    case "detect-emotion": {
      const { data } = result;
      const emotionsText = data.discreteEmotions
        .map((e) => `${e.emotion}: ${formatPercentage(e.score)} (${e.intensity})`)
        .join(", ");
      return `Emotion Analysis Results:
Circumplex Model:
- Valence: ${data.circumplex.valence.toFixed(2)}
- Arousal: ${data.circumplex.arousal.toFixed(2)}
- Dominance: ${data.circumplex.dominance.toFixed(2)}

Dominant Emotion: ${data.dominantEmotion ?? "None detected"}
Discrete Emotions: ${emotionsText}

Interpretation: ${data.interpretation}`;
    }
    case "decompose": {
      const { data } = result;
      const subProblemsText = data.subProblems
        .map(
          (sp) =>
            `- ${sp.description} (${sp.complexity} complexity, order: ${String(sp.executionOrder)})`
        )
        .join("\n");
      return `Problem Decomposition Results:
Root Problem: ${data.rootProblem}
Total Sub-problems: ${String(data.totalSubProblems)}
Max Depth: ${String(data.maxDepth)}

Sub-problems:
${subProblemsText}

Suggested Order: ${data.suggestedOrder.join(" → ")}`;
    }
  }
}

/**
 * CognitiveResultPanel - Display cognitive processing results
 *
 * Features:
 * - Styled panels consistent with UI design (glassmorphism)
 * - Support for all cognitive result types
 * - Save as memory functionality
 *
 * Requirements: 16.7, 16.8
 */
export function CognitiveResultPanel({
  result,
  onClose,
  onSaveAsMemory,
  sourceMemoryId,
  className = "",
}: CognitiveResultPanelProps): React.ReactElement {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const title = getModalTitle(result);

  /**
   * Handle save as memory
   * Requirements: 16.8
   */
  const handleSaveAsMemory = useCallback(() => {
    if (onSaveAsMemory === undefined) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const content = generateSaveContent(result);
      onSaveAsMemory(content, sourceMemoryId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save as memory";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, [result, sourceMemoryId, onSaveAsMemory]);

  return (
    <ModalOverlay onClose={onClose}>
      <ModalContent
        title={title}
        onClose={onClose}
        onSave={onSaveAsMemory !== undefined ? handleSaveAsMemory : undefined}
        isSaving={isSaving}
      >
        <div className={className}>
          {/* Error display */}
          {saveError !== null && (
            <div className="mb-4 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
              {saveError}
            </div>
          )}

          {/* Result display based on type */}
          {result.type === "analyze-reasoning" && <AnalyzeReasoningDisplay result={result} />}
          {result.type === "detect-bias" && <DetectBiasDisplay result={result} />}
          {result.type === "assess-confidence" && <AssessConfidenceDisplay result={result} />}
          {result.type === "detect-emotion" && <DetectEmotionDisplay result={result} />}
          {result.type === "decompose" && <DecomposeDisplay result={result} />}
        </div>
      </ModalContent>
    </ModalOverlay>
  );
}

export default CognitiveResultPanel;
