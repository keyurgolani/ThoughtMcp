/**
 * CognitiveResultModal Component
 *
 * Modal for displaying results from cognitive tool operations.
 * Supports different result types: summarize, transform, find-similar, analyze.
 *
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */

import { useCallback } from "react";
import { getSeverityColorClass } from "../../utils/dashboardUtils";
import { formatPercentage } from "../../utils/formatUtils";
import type {
  AnalyzeResult,
  CognitiveToolResult,
  FindSimilarResult,
  SummarizeResult,
  TransformResult,
} from "./CognitiveToolsPanel";

// ============================================================================
// Types
// ============================================================================

export interface CognitiveResultModalProps {
  /** The result to display */
  result: CognitiveToolResult;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when user wants to navigate to a similar memory */
  onNavigateToMemory?: (memoryId: string) => void;
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
}

/**
 * Modal content container with glassmorphism styling
 */
function ModalContent({ title, children, onClose }: ModalContentProps): React.ReactElement {
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
        <button
          onClick={onClose}
          className="p-1 hover:bg-ui-border rounded transition-colors text-ui-text-secondary hover:text-ui-text-primary"
          aria-label="Close modal"
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

      {/* Body */}
      <div className="p-4 overflow-y-auto flex-1">{children}</div>
    </div>
  );
}

// ============================================================================
// Result Display Components
// ============================================================================

interface SummarizeResultDisplayProps {
  result: SummarizeResult;
}

/**
 * Display summarize result
 * Requirements: 9.2
 */
function SummarizeResultDisplay({ result }: SummarizeResultDisplayProps): React.ReactElement {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div>
        <h3 className="text-sm font-medium text-ui-accent-secondary mb-2">Summary</h3>
        <p className="text-sm text-ui-text-primary whitespace-pre-wrap bg-ui-background/50 p-3 rounded-lg">
          {result.summary}
        </p>
      </div>

      {/* Insights */}
      {result.insights.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-ui-accent-secondary mb-2">Key Insights</h3>
          <ul className="space-y-2">
            {result.insights.map((insight, index) => (
              <li key={index} className="text-sm text-ui-text-primary flex items-start gap-2">
                <span className="text-ui-accent-primary mt-0.5">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-ui-text-secondary">Confidence:</span>
        <span
          className={
            result.confidence >= 0.7
              ? "text-green-400"
              : result.confidence >= 0.4
                ? "text-yellow-400"
                : "text-red-400"
          }
        >
          {formatPercentage(result.confidence)}
        </span>
      </div>
    </div>
  );
}

interface TransformResultDisplayProps {
  result: TransformResult;
}

/**
 * Display transform result
 */
function TransformResultDisplay({ result }: TransformResultDisplayProps): React.ReactElement {
  return (
    <div className="space-y-4">
      {/* Mode */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-ui-text-secondary">Transform Mode:</span>
        <span className="text-ui-accent-primary capitalize">{result.mode}</span>
      </div>

      {/* Transformed content */}
      <div>
        <h3 className="text-sm font-medium text-ui-accent-secondary mb-2">Transformed Content</h3>
        <p className="text-sm text-ui-text-primary whitespace-pre-wrap bg-ui-background/50 p-3 rounded-lg">
          {result.transformed}
        </p>
      </div>
    </div>
  );
}

interface FindSimilarResultDisplayProps {
  result: FindSimilarResult;
  onNavigateToMemory?: (memoryId: string) => void;
}

/**
 * Display find similar result
 * Requirements: 9.3
 */
function FindSimilarResultDisplay({
  result,
  onNavigateToMemory,
}: FindSimilarResultDisplayProps): React.ReactElement {
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-ui-text-secondary">
          Found <span className="text-ui-accent-primary">{result.similarMemories.length}</span>{" "}
          similar memories
        </span>
        {result.highlightedNodeIds.length > 0 && (
          <span className="text-ui-text-secondary">
            <span className="text-ui-accent-secondary">{result.highlightedNodeIds.length}</span>{" "}
            visible in 3D view
          </span>
        )}
      </div>

      {/* Similar memories list */}
      {result.similarMemories.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-ui-accent-secondary">Similar Memories</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {result.similarMemories.map((memory) => (
              <div
                key={memory.id}
                className="p-3 bg-ui-background/50 rounded-lg border border-ui-border hover:border-ui-accent-primary/50 transition-colors cursor-pointer"
                onClick={() => onNavigateToMemory?.(memory.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onNavigateToMemory?.(memory.id);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs text-ui-accent-primary capitalize">
                    {memory.primarySector}
                  </span>
                  <span className="text-xs text-ui-text-secondary">
                    Score: {formatPercentage(memory.score.total)}
                  </span>
                </div>
                <p className="text-sm text-ui-text-primary line-clamp-2">{memory.content}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-ui-text-secondary">No similar memories found.</p>
      )}
    </div>
  );
}

interface AnalyzeResultDisplayProps {
  result: AnalyzeResult;
}

/**
 * Display analyze result (confidence + bias)
 * Requirements: 9.4, 9.5
 */
function AnalyzeResultDisplay({ result }: AnalyzeResultDisplayProps): React.ReactElement {
  const { confidence, bias } = result;

  return (
    <div className="space-y-6">
      {/* Confidence Assessment */}
      <div>
        <h3 className="text-sm font-medium text-ui-accent-secondary mb-3">Confidence Assessment</h3>

        {/* Overall confidence */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-ui-text-secondary text-sm">Overall:</span>
          <span
            className={`text-lg font-semibold ${confidence.overall >= 0.7 ? "text-green-400" : confidence.overall >= 0.4 ? "text-yellow-400" : "text-red-400"}`}
          >
            {formatPercentage(confidence.overall)}
          </span>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ui-text-secondary">Evidence Quality:</span>
            <span className="text-ui-text-primary">
              {formatPercentage(confidence.dimensions.evidenceQuality)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ui-text-secondary">Coherence:</span>
            <span className="text-ui-text-primary">
              {formatPercentage(confidence.dimensions.reasoningCoherence)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ui-text-secondary">Completeness:</span>
            <span className="text-ui-text-primary">
              {formatPercentage(confidence.dimensions.completeness)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ui-text-secondary">Uncertainty:</span>
            <span className="text-ui-text-primary">
              {formatPercentage(confidence.dimensions.uncertaintyLevel)}
            </span>
          </div>
          <div className="flex justify-between col-span-2">
            <span className="text-ui-text-secondary">Bias Freedom:</span>
            <span className="text-ui-text-primary">
              {formatPercentage(confidence.dimensions.biasFreedom)}
            </span>
          </div>
        </div>

        {/* Interpretation */}
        {confidence.interpretation && (
          <p className="mt-3 text-sm text-ui-text-primary bg-ui-background/50 p-2 rounded">
            {confidence.interpretation}
          </p>
        )}

        {/* Warnings */}
        {confidence.warnings.length > 0 && (
          <div className="mt-3">
            <span className="text-xs text-yellow-400">Warnings:</span>
            <ul className="mt-1 space-y-1">
              {confidence.warnings.map((warning, index) => (
                <li key={index} className="text-xs text-ui-text-secondary">
                  • {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Bias Detection */}
      <div>
        <h3 className="text-sm font-medium text-ui-accent-secondary mb-3">Bias Detection</h3>

        {/* Overall risk */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-ui-text-secondary text-sm">Overall Risk:</span>
          <span
            className={`text-sm font-semibold capitalize ${getRiskColorClass(bias.overallRisk)}`}
          >
            {bias.overallRisk}
          </span>
        </div>

        {/* Detected biases */}
        {bias.biases.length > 0 ? (
          <div className="space-y-2">
            {bias.biases.map((biasItem, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getSeverityColorClass(biasItem.severity)}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium capitalize">
                    {biasItem.type.replace("_", " ")} Bias
                  </span>
                  <span className="text-xs">Severity: {formatPercentage(biasItem.severity)}</span>
                </div>
                {biasItem.evidence.length > 0 && (
                  <p className="text-xs opacity-80 mb-2">
                    Evidence: {biasItem.evidence.join(", ")}
                  </p>
                )}
                <p className="text-xs">
                  <span className="opacity-70">Correction: </span>
                  {biasItem.correctionStrategy}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-green-400">No significant biases detected.</p>
        )}

        {/* Recommendations */}
        {bias.recommendations.length > 0 && (
          <div className="mt-3">
            <span className="text-xs text-ui-accent-primary">Recommendations:</span>
            <ul className="mt-1 space-y-1">
              {bias.recommendations.map((rec, index) => (
                <li key={index} className="text-xs text-ui-text-secondary">
                  • {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
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
function getModalTitle(result: CognitiveToolResult): string {
  switch (result.type) {
    case "summarize":
      return "Memory Summary";
    case "transform":
      return "Transformed Content";
    case "find-similar":
      return "Similar Memories";
    case "analyze":
      return "Analysis Results";
  }
}

/**
 * CognitiveResultModal - Modal for displaying cognitive tool results
 *
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */
export function CognitiveResultModal({
  result,
  onClose,
  onNavigateToMemory,
  className = "",
}: CognitiveResultModalProps): React.ReactElement {
  const title = getModalTitle(result);

  return (
    <ModalOverlay onClose={onClose}>
      <ModalContent title={title} onClose={onClose}>
        <div className={className}>
          {result.type === "summarize" && <SummarizeResultDisplay result={result} />}
          {result.type === "transform" && <TransformResultDisplay result={result} />}
          {result.type === "find-similar" && (
            <FindSimilarResultDisplay
              result={result}
              {...(onNavigateToMemory !== undefined ? { onNavigateToMemory } : {})}
            />
          )}
          {result.type === "analyze" && <AnalyzeResultDisplay result={result} />}
        </div>
      </ModalContent>
    </ModalOverlay>
  );
}

export default CognitiveResultModal;
