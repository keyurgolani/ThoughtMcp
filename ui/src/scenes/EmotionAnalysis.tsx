/**
 * EmotionAnalysis Screen
 *
 * Screen for analyzing emotional content of text using Circumplex model
 * (valence, arousal, dominance) and discrete emotion classification.
 *
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getDefaultClient } from '../api/client';
import { BarChart3, Heart, Target } from '../components/icons/Icons';
import { useCognitiveStore } from '../stores/cognitiveStore';
import type { DetectEmotionResponse, DiscreteEmotionResult, EmotionalTrend } from '../types/api';

// ============================================================================
// Types
// ============================================================================

export interface EmotionAnalysisProps {
  /** User ID for memory operations */
  userId: string;
  /** Session ID for memory operations */
  sessionId: string;
  /** Additional CSS classes */
  className?: string;
}

interface AnalysisResult {
  emotion: DetectEmotionResponse;
  originalText: string;
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const DISCRETE_EMOTIONS = [
  { key: 'joy', label: 'Joy', color: '#FFD700' },
  { key: 'sadness', label: 'Sadness', color: '#4169E1' },
  { key: 'anger', label: 'Anger', color: '#DC143C' },
  { key: 'fear', label: 'Fear', color: '#8B008B' },
  { key: 'disgust', label: 'Disgust', color: '#228B22' },
  { key: 'surprise', label: 'Surprise', color: '#FF8C00' },
  { key: 'pride', label: 'Pride', color: '#9370DB' },
  { key: 'shame', label: 'Shame', color: '#A0522D' },
  { key: 'guilt', label: 'Guilt', color: '#708090' },
  { key: 'gratitude', label: 'Gratitude', color: '#20B2AA' },
  { key: 'awe', label: 'Awe', color: '#00CED1' },
] as const;

const EMOTION_COLOR_MAP: Record<string, string> = Object.fromEntries(
  DISCRETE_EMOTIONS.map((e) => [e.key, e.color])
);

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

/**
 * Format a number as percentage
 */
function formatPercentage(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

/**
 * Get intensity color class - uses CSS variables for theme-aware colors
 */
function getIntensityColorClass(intensity: 'low' | 'medium' | 'high'): string {
  switch (intensity) {
    case 'high':
      return 'intensity-high';
    case 'medium':
      return 'intensity-medium';
    case 'low':
      return 'intensity-low';
  }
}

// ============================================================================
// Text Input Component
// Requirements: 21.1
// ============================================================================

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

/**
 * Text input area for emotion analysis
 * Requirements: 21.1
 */
function TextInput({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  onSubmit,
}: TextInputProps): React.ReactElement {
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
        htmlFor="emotion-text-input"
        className="block text-sm font-medium text-ui-accent-primary mb-2"
      >
        Text to Analyze
      </label>
      <textarea
        ref={textareaRef}
        id="emotion-text-input"
        name="emotion-text-input"
        value={value}
        onChange={(e): void => {
          onChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Enter text to analyze for emotional content. This can be a memory, message, journal entry, or any text you want to understand emotionally..."
        className={`
          w-full h-40 p-3
          bg-ui-background/50 border border-ui-border rounded-lg
          text-ui-text-primary placeholder-ui-text-muted
          resize-none
          focus:outline-none focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-describedby="emotion-text-hint"
      />
      <p id="emotion-text-hint" className="mt-2 text-xs text-ui-text-muted">
        The system will analyze emotional content using the Circumplex model (valence, arousal,
        dominance) and classify discrete emotions with confidence scores. Press ⌘+Enter to analyze.
      </p>
    </GlassPanel>
  );
}

// ============================================================================
// Circumplex Visualization Component
// Requirements: 21.2, 21.3
// ============================================================================

interface CircumplexWheelProps {
  valence: number;
  arousal: number;
  dominance: number;
  size?: number;
}

/**
 * 2D Emotion Wheel visualization using Circumplex model
 * Requirements: 21.2, 21.3
 *
 * The wheel displays:
 * - X-axis: Valence (negative to positive, -1 to 1)
 * - Y-axis: Arousal (low to high, -1 to 1)
 * - Point size/color: Dominance (0 to 1)
 */
function CircumplexWheel({
  valence,
  arousal,
  dominance,
  size = 300,
}: CircumplexWheelProps): React.ReactElement {
  const center = size / 2;
  const radius = (size - 80) / 2;

  // Convert valence/arousal (-1 to 1) to pixel coordinates
  const pointX = center + valence * radius;
  const pointY = center - arousal * radius; // Invert Y for screen coordinates

  // Dominance affects point size (10-24px based on 0-1)
  const pointRadius = 10 + dominance * 14;

  // Emotion quadrant labels with emojis
  const quadrants = [
    { label: 'Excited', emoji: '🤩', x: center + radius * 0.6, y: center - radius * 0.6 },
    { label: 'Happy', emoji: '😊', x: center + radius * 0.6, y: center + radius * 0.6 },
    { label: 'Calm', emoji: '😌', x: center - radius * 0.6, y: center + radius * 0.6 },
    { label: 'Sad', emoji: '😢', x: center - radius * 0.6, y: center - radius * 0.6 },
  ];

  // Calculate point color based on valence
  const pointColor =
    valence >= 0
      ? `rgba(${String(Math.round(255 - valence * 100))}, ${String(Math.round(200 + valence * 55))}, ${String(Math.round(100 + valence * 100))}, ${String(0.7 + dominance * 0.3)})`
      : `rgba(${String(Math.round(200 - valence * 55))}, ${String(Math.round(100 + valence * 100))}, ${String(Math.round(150 + valence * 50))}, ${String(0.7 + dominance * 0.3)})`;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Definitions */}
        <defs>
          {/* Radial gradient for background */}
          <radialGradient id="wheelBgGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(155, 89, 182, 0.15)" />
            <stop offset="50%" stopColor="rgba(0, 255, 255, 0.1)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>
          {/* Glow filter */}
          <filter id="emotionGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Quadrant gradients */}
          <linearGradient id="excitedGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 215, 0, 0.1)" />
            <stop offset="100%" stopColor="rgba(255, 100, 100, 0.1)" />
          </linearGradient>
          <linearGradient id="happyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(100, 255, 100, 0.1)" />
            <stop offset="100%" stopColor="rgba(255, 215, 0, 0.1)" />
          </linearGradient>
          <linearGradient id="calmGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(100, 150, 255, 0.1)" />
            <stop offset="100%" stopColor="rgba(100, 255, 200, 0.1)" />
          </linearGradient>
          <linearGradient id="sadGrad" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(100, 100, 200, 0.1)" />
            <stop offset="100%" stopColor="rgba(150, 100, 200, 0.1)" />
          </linearGradient>
        </defs>

        {/* Background circle with gradient */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="url(#wheelBgGradient)"
          stroke="rgba(0, 255, 255, 0.3)"
          strokeWidth="2"
        />

        {/* Quadrant backgrounds */}
        <path
          d={`M ${String(center)} ${String(center)} L ${String(center + radius)} ${String(center)} A ${String(radius)} ${String(radius)} 0 0 0 ${String(center)} ${String(center - radius)} Z`}
          fill="url(#excitedGrad)"
        />
        <path
          d={`M ${String(center)} ${String(center)} L ${String(center)} ${String(center + radius)} A ${String(radius)} ${String(radius)} 0 0 0 ${String(center + radius)} ${String(center)} Z`}
          fill="url(#happyGrad)"
        />
        <path
          d={`M ${String(center)} ${String(center)} L ${String(center - radius)} ${String(center)} A ${String(radius)} ${String(radius)} 0 0 0 ${String(center)} ${String(center + radius)} Z`}
          fill="url(#calmGrad)"
        />
        <path
          d={`M ${String(center)} ${String(center)} L ${String(center)} ${String(center - radius)} A ${String(radius)} ${String(radius)} 0 0 0 ${String(center - radius)} ${String(center)} Z`}
          fill="url(#sadGrad)"
        />

        {/* Grid circles */}
        {[0.25, 0.5, 0.75].map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={radius * level}
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1"
            strokeDasharray="6 4"
          />
        ))}

        {/* Axes with glow */}
        <line
          x1={center - radius}
          y1={center}
          x2={center + radius}
          y2={center}
          stroke="rgba(0, 255, 255, 0.4)"
          strokeWidth="1.5"
        />
        <line
          x1={center}
          y1={center - radius}
          x2={center}
          y2={center + radius}
          stroke="rgba(0, 255, 255, 0.4)"
          strokeWidth="1.5"
        />

        {/* Axis labels with better styling - using CSS variables for theme-aware colors */}
        <text
          x={center + radius + 12}
          y={center}
          className="text-xs font-medium"
          dominantBaseline="middle"
          style={{ fill: 'var(--status-success-text)' }}
        >
          Positive →
        </text>
        <text
          x={center - radius - 12}
          y={center}
          className="text-xs font-medium"
          dominantBaseline="middle"
          textAnchor="end"
          style={{ fill: 'var(--status-error-text)' }}
        >
          ← Negative
        </text>
        <text
          x={center}
          y={center - radius - 12}
          className="text-xs font-medium"
          textAnchor="middle"
          style={{ fill: 'var(--status-warning-text)' }}
        >
          High Energy ↑
        </text>
        <text
          x={center}
          y={center + radius + 16}
          className="text-xs font-medium"
          textAnchor="middle"
          style={{ fill: 'var(--status-info-text)' }}
        >
          ↓ Low Energy
        </text>

        {/* Quadrant labels with emojis */}
        {quadrants.map((q, i) => (
          <g key={i}>
            <text
              x={q.x}
              y={q.y - 8}
              className="fill-ui-text-secondary"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: '16px' }}
            >
              {q.emoji}
            </text>
            <text
              x={q.x}
              y={q.y + 10}
              className="text-xs fill-ui-text-muted font-medium"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {q.label}
            </text>
          </g>
        ))}

        {/* Emotion point trail (animated) */}
        <circle
          cx={pointX}
          cy={pointY}
          r={pointRadius + 15}
          fill="none"
          stroke={pointColor}
          strokeWidth="2"
          opacity="0.3"
          className="animate-pulse"
        />
        <circle
          cx={pointX}
          cy={pointY}
          r={pointRadius + 8}
          fill={pointColor}
          opacity="0.4"
          filter="url(#emotionGlow)"
        />

        {/* Main emotion point */}
        <circle
          cx={pointX}
          cy={pointY}
          r={pointRadius}
          fill={pointColor}
          stroke="white"
          strokeWidth="3"
          filter="url(#emotionGlow)"
        />

        {/* Center crosshair */}
        <circle cx={center} cy={center} r="4" fill="rgba(0, 255, 255, 0.6)" />
        <circle cx={center} cy={center} r="2" fill="white" />
      </svg>

      {/* Dimension values - compact cards with theme-aware colors */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center w-full max-w-sm">
        <div
          className="p-2 rounded-lg border transition-all"
          style={{
            borderColor:
              valence >= 0 ? 'var(--status-success-border)' : 'var(--status-error-border)',
            background: valence >= 0 ? 'var(--status-success-bg)' : 'var(--status-error-bg)',
          }}
        >
          <span className="text-xs text-ui-text-muted block">Valence</span>
          <span
            className="text-lg font-bold"
            style={{
              color: valence >= 0 ? 'var(--status-success-text)' : 'var(--status-error-text)',
            }}
          >
            {valence >= 0 ? '+' : ''}
            {valence.toFixed(2)}
          </span>
          <span
            className="text-xs block opacity-80"
            style={{
              color: valence >= 0 ? 'var(--status-success-text)' : 'var(--status-error-text)',
            }}
          >
            {valence >= 0 ? '😊 Positive' : '😔 Negative'}
          </span>
        </div>
        <div
          className="p-2 rounded-lg border transition-all"
          style={{
            borderColor:
              arousal >= 0 ? 'var(--status-warning-border)' : 'var(--status-info-border)',
            background: arousal >= 0 ? 'var(--status-warning-bg)' : 'var(--status-info-bg)',
          }}
        >
          <span className="text-xs text-ui-text-muted block">Arousal</span>
          <span
            className="text-lg font-bold"
            style={{
              color: arousal >= 0 ? 'var(--status-warning-text)' : 'var(--status-info-text)',
            }}
          >
            {arousal >= 0 ? '+' : ''}
            {arousal.toFixed(2)}
          </span>
          <span
            className="text-xs block opacity-80"
            style={{
              color: arousal >= 0 ? 'var(--status-warning-text)' : 'var(--status-info-text)',
            }}
          >
            {arousal >= 0 ? '⚡ High' : '🌙 Low'}
          </span>
        </div>
        <div
          className={`p-2 rounded-lg border transition-all ${dominance >= 0.5 ? 'border-purple-500/50 bg-purple-500/10' : 'border-purple-400/30 bg-purple-400/5'}`}
        >
          <span className="text-xs text-ui-text-muted block">Dominance</span>
          <span className="text-lg font-bold text-purple-400">{dominance.toFixed(2)}</span>
          <span className="text-xs text-purple-400/70 block">
            {dominance >= 0.5 ? '👑 Control' : '🤝 Open'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Get emotion emoji
 */
function getEmotionEmoji(emotion: string): string {
  const emojiMap: Record<string, string> = {
    joy: '😊',
    sadness: '😢',
    anger: '😠',
    fear: '😨',
    disgust: '🤢',
    surprise: '😲',
    pride: '😤',
    shame: '😳',
    guilt: '😔',
    gratitude: '🙏',
    awe: '🤩',
  };
  return emojiMap[emotion] ?? '😐';
}

interface CircumplexDisplayProps {
  result: DetectEmotionResponse;
}

/**
 * Display Circumplex analysis results
 * Requirements: 21.2, 21.3
 */
function CircumplexDisplay({ result }: CircumplexDisplayProps): React.ReactElement {
  return (
    <GlassPanel className="p-6 animate-fade-in h-full flex flex-col">
      <h3 className="text-lg font-semibold text-ui-accent-primary mb-6 flex items-center gap-2">
        <Target size={24} />
        Circumplex Model Analysis
      </h3>

      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Emotion Wheel - Centered */}
        <div className="flex-shrink-0 mb-4">
          <CircumplexWheel
            valence={result.circumplex.valence}
            arousal={result.circumplex.arousal}
            dominance={result.circumplex.dominance}
            size={200}
          />
        </div>

        {/* Interpretation */}
        <div className="w-full space-y-4">
          <div className="p-4 rounded-xl border-2 border-ui-accent-primary/30 bg-gradient-to-b from-ui-accent-primary/10 to-transparent">
            <h4 className="text-xs text-ui-text-secondary mb-2 flex items-center gap-2">
              <span>💭</span>
              Interpretation
            </h4>
            <p className="text-sm text-ui-text-primary leading-relaxed">{result.interpretation}</p>
          </div>

          {result.dominantEmotion && (
            <div
              className="p-4 rounded-xl border-2 flex items-center gap-4"
              style={{
                borderColor: `${EMOTION_COLOR_MAP[result.dominantEmotion] ?? '#00CED1'}50`,
                background: `linear-gradient(135deg, ${EMOTION_COLOR_MAP[result.dominantEmotion] ?? '#00CED1'}15, transparent)`,
              }}
            >
              <span className="text-3xl">{getEmotionEmoji(result.dominantEmotion)}</span>
              <div>
                <span className="text-xs text-ui-text-muted block">Dominant Emotion</span>
                <span
                  className="text-xl font-bold capitalize"
                  style={{ color: EMOTION_COLOR_MAP[result.dominantEmotion] ?? '#00CED1' }}
                >
                  {result.dominantEmotion}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-ui-border/30 text-xs text-ui-text-muted text-right">
        Processed in {result.processingTimeMs}ms
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Discrete Emotion Display Component
// Requirements: 21.4, 21.5
// ============================================================================

interface EmotionBarProps {
  emotion: DiscreteEmotionResult;
  maxScore: number;
}

/**
 * Single emotion bar with confidence score and intensity
 */
function EmotionBar({ emotion, maxScore }: EmotionBarProps): React.ReactElement {
  const color = EMOTION_COLOR_MAP[emotion.emotion] ?? '#00CED1';
  const widthPercent = maxScore > 0 ? (emotion.score / maxScore) * 100 : 0;
  const emoji = getEmotionEmoji(emotion.emotion);

  return (
    <div className="flex items-center gap-3 group hover:scale-[1.01] transition-transform">
      {/* Emotion label with emoji */}
      <div className="w-28 text-right flex items-center justify-end gap-2">
        <span className="text-lg group-hover:scale-110 transition-transform">{emoji}</span>
        <span className="text-sm text-ui-text-primary capitalize font-medium">
          {emotion.emotion}
        </span>
      </div>

      {/* Bar container */}
      <div className="flex-1 h-8 bg-ui-background/30 rounded-lg overflow-hidden relative border border-ui-border/30">
        {/* Bar fill with gradient */}
        <div
          className="h-full rounded-lg transition-all duration-500 relative overflow-hidden"
          style={{
            width: `${String(widthPercent)}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 15px ${color}40`,
          }}
        >
          {/* Shimmer effect */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
            style={{ backgroundSize: '200% 100%' }}
          />
        </div>

        {/* Score label */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ui-text-primary font-bold">
          {formatPercentage(emotion.score)}
        </span>
      </div>

      {/* Intensity badge with glow */}
      <div
        className={`w-20 text-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${getIntensityColorClass(emotion.intensity)} transition-all`}
        style={{
          boxShadow:
            emotion.intensity === 'high'
              ? '0 0 10px rgba(239, 68, 68, 0.3)'
              : emotion.intensity === 'medium'
                ? '0 0 10px rgba(234, 179, 8, 0.3)'
                : '0 0 10px rgba(34, 197, 94, 0.3)',
        }}
      >
        {emotion.intensity}
      </div>
    </div>
  );
}

interface DiscreteEmotionDisplayProps {
  emotions: DiscreteEmotionResult[];
}

/**
 * Display discrete emotion classification with bar chart
 * Requirements: 21.4, 21.5
 */
function DiscreteEmotionDisplay({ emotions }: DiscreteEmotionDisplayProps): React.ReactElement {
  // Sort emotions by score descending
  const sortedEmotions = [...emotions].sort((a, b) => b.score - a.score);
  const firstEmotion = sortedEmotions[0];
  const maxScore = firstEmotion !== undefined ? firstEmotion.score : 1;

  // Group by intensity for summary
  const intensityCounts = emotions.reduce(
    (acc, e) => {
      acc[e.intensity]++;
      return acc;
    },
    { low: 0, medium: 0, high: 0 }
  );

  // Get dominant emotion
  const dominantEmotion = sortedEmotions[0];

  return (
    <GlassPanel className="p-6 animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-ui-accent-primary flex items-center gap-2">
          <BarChart3 size={24} />
          Discrete Emotion Classification
        </h3>

        {/* Intensity summary with theme-aware styling */}
        <div className="flex gap-2 text-xs">
          {intensityCounts.high > 0 && (
            <span className="px-3 py-1 rounded-lg border font-medium status-badge-error">
              {intensityCounts.high} High
            </span>
          )}
          {intensityCounts.medium > 0 && (
            <span className="px-3 py-1 rounded-lg border font-medium status-badge-warning">
              {intensityCounts.medium} Medium
            </span>
          )}
          {intensityCounts.low > 0 && (
            <span className="px-3 py-1 rounded-lg border font-medium status-badge-success">
              {intensityCounts.low} Low
            </span>
          )}
        </div>
      </div>

      {/* Main content area - flex-1 to fill available space */}
      <div className="flex-1 flex flex-col">
        {/* Dominant emotion highlight */}
        {dominantEmotion && (
          <div
            className="mb-6 p-4 rounded-xl border-2 flex items-center gap-4"
            style={{
              borderColor: `${EMOTION_COLOR_MAP[dominantEmotion.emotion] ?? '#00CED1'}50`,
              background: `linear-gradient(135deg, ${EMOTION_COLOR_MAP[dominantEmotion.emotion] ?? '#00CED1'}15, transparent)`,
            }}
          >
            <span className="text-4xl">{getEmotionEmoji(dominantEmotion.emotion)}</span>
            <div>
              <span className="text-xs text-ui-text-muted block">Dominant Emotion</span>
              <span
                className="text-xl font-bold capitalize"
                style={{ color: EMOTION_COLOR_MAP[dominantEmotion.emotion] ?? '#00CED1' }}
              >
                {dominantEmotion.emotion}
              </span>
              <span className="text-sm text-ui-text-secondary ml-2">
                ({formatPercentage(dominantEmotion.score)})
              </span>
            </div>
          </div>
        )}

        {sortedEmotions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="text-5xl mb-3 block">😐</span>
              <p className="text-base text-ui-text-secondary">No discrete emotions detected</p>
              <p className="text-sm text-ui-text-muted mt-1">
                Try analyzing text with more emotional content
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEmotions.map((emotion, index) => (
              <div
                key={emotion.emotion}
                className="animate-slide-up"
                style={{ animationDelay: `${String(index * 50)}ms` }}
              >
                <EmotionBar emotion={emotion} maxScore={maxScore} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Legend with better styling */}
      <div className="mt-4 pt-4 border-t border-ui-border/30">
        <h4 className="text-xs text-ui-text-muted mb-3 font-medium">Intensity Ratings</h4>
        <div className="flex flex-wrap gap-4 text-xs text-ui-text-secondary">
          <span className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-green-400 shadow-glow-success" />
            Low: Subtle presence
          </span>
          <span className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1.5 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-yellow-400 shadow-glow-warning" />
            Medium: Moderate presence
          </span>
          <span className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-red-400 shadow-glow-error" />
            High: Strong presence
          </span>
        </div>
      </div>
    </GlassPanel>
  );
}

// ============================================================================
// Emotional Trends Component
// Requirements: 21.6
// ============================================================================

interface EmotionalTrendsProps {
  trends: EmotionalTrend[];
  analysisHistory: AnalysisResult[];
}

/**
 * Get trend icon and color - uses CSS variable classes for theme-aware colors
 */
function getTrendIndicator(trend: 'improving' | 'declining' | 'stable'): {
  icon: string;
  color: string;
  label: string;
} {
  switch (trend) {
    case 'improving':
      return { icon: '↑', color: 'trend-improving', label: 'Improving' };
    case 'declining':
      return { icon: '↓', color: 'trend-declining', label: 'Declining' };
    case 'stable':
      return { icon: '→', color: 'trend-stable', label: 'Stable' };
  }
}

/**
 * Timeline view of emotional changes with trend direction indicator
 * Requirements: 21.6
 */
function EmotionalTrends({ trends, analysisHistory }: EmotionalTrendsProps): React.ReactElement {
  // Calculate overall trend from analysis history
  const calculateOverallTrend = (): 'improving' | 'declining' | 'stable' => {
    if (analysisHistory.length < 2) return 'stable';

    const recentValences = analysisHistory.slice(-5).map((a) => a.emotion.circumplex.valence);

    const firstHalf = recentValences.slice(0, Math.floor(recentValences.length / 2));
    const secondHalf = recentValences.slice(Math.floor(recentValences.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;
    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  };

  const overallTrend = calculateOverallTrend();
  const trendIndicator = getTrendIndicator(overallTrend);

  return (
    <GlassPanel className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-ui-accent-primary">Emotional Trends</h3>

        {/* Overall trend indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ui-text-muted">Overall Trend:</span>
          <span className={`text-lg font-bold ${trendIndicator.color}`}>{trendIndicator.icon}</span>
          <span className={`text-sm ${trendIndicator.color}`}>{trendIndicator.label}</span>
        </div>
      </div>

      {analysisHistory.length === 0 ? (
        <div className="text-center py-8">
          <BarChart3 size={40} className="mx-auto mb-2 text-ui-accent-primary" />
          <p className="text-sm text-ui-text-secondary">
            Analyze multiple texts to see emotional trends over time
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Timeline visualization */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-ui-border" />

            {/* Timeline entries */}
            <div className="space-y-4">
              {analysisHistory
                .slice(-10)
                .reverse()
                .map((analysis) => {
                  const valence = analysis.emotion.circumplex.valence;
                  const arousal = analysis.emotion.circumplex.arousal;
                  const dominantEmotion = analysis.emotion.dominantEmotion;

                  return (
                    <div key={analysis.timestamp} className="relative pl-10">
                      {/* Timeline dot */}
                      <div
                        className="absolute left-2 top-2 w-4 h-4 rounded-full border-2 border-ui-accent-primary"
                        style={{
                          backgroundColor: dominantEmotion
                            ? (EMOTION_COLOR_MAP[dominantEmotion] ?? '#00CED1')
                            : '#00CED1',
                        }}
                      />

                      {/* Entry content */}
                      <div className="bg-ui-background/50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-ui-text-muted">
                            {new Date(analysis.timestamp).toLocaleString()}
                          </span>
                          {dominantEmotion && (
                            <span
                              className="text-xs px-2 py-0.5 rounded capitalize"
                              style={{
                                backgroundColor: `${EMOTION_COLOR_MAP[dominantEmotion] ?? '#00CED1'}20`,
                                color: EMOTION_COLOR_MAP[dominantEmotion] ?? '#00CED1',
                              }}
                            >
                              {dominantEmotion}
                            </span>
                          )}
                        </div>

                        {/* Mini metrics with theme-aware colors */}
                        <div className="flex gap-4 text-xs">
                          <span
                            style={{
                              color:
                                valence >= 0
                                  ? 'var(--status-success-text)'
                                  : 'var(--status-error-text)',
                            }}
                          >
                            V: {valence >= 0 ? '+' : ''}
                            {valence.toFixed(2)}
                          </span>
                          <span
                            style={{
                              color:
                                arousal >= 0
                                  ? 'var(--status-warning-text)'
                                  : 'var(--status-info-text)',
                            }}
                          >
                            A: {arousal >= 0 ? '+' : ''}
                            {arousal.toFixed(2)}
                          </span>
                        </div>

                        {/* Text preview */}
                        <p className="text-xs text-ui-text-secondary mt-2 line-clamp-2">
                          {analysis.originalText.substring(0, 100)}
                          {analysis.originalText.length > 100 ? '...' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Trend summary from API (if available) */}
          {trends.length > 0 && (
            <div className="mt-4 pt-4 border-t border-ui-border">
              <h4 className="text-xs text-ui-text-secondary mb-3">Period Trends</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {trends.map((trend, index) => {
                  const indicator = getTrendIndicator(trend.trend);
                  return (
                    <div
                      key={index}
                      className="bg-ui-background/50 p-3 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs text-ui-text-muted block">{trend.period}</span>
                        <span className="text-sm text-ui-text-primary">
                          {trend.memoryCount} memories
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold ${indicator.color}`}>
                          {indicator.icon}
                        </span>
                        <span className={`text-xs block ${indicator.color}`}>
                          {indicator.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassPanel>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * EmotionAnalysis - Screen for analyzing emotional content of text
 *
 * Features:
 * - Text input for emotion analysis (21.1)
 * - Circumplex model visualization with 2D emotion wheel (21.2, 21.3)
 * - Discrete emotion classification with bar chart (21.4, 21.5)
 * - Emotional trends timeline view (21.6)
 *
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6
 */
export function EmotionAnalysis({
  userId: _userId,
  sessionId: _sessionId,
  className = '',
}: EmotionAnalysisProps): React.ReactElement {
  // Note: userId and sessionId are available for future memory operations
  void _userId;
  void _sessionId;

  // State
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [emotionalTrends, setEmotionalTrends] = useState<EmotionalTrend[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [includeDiscrete, setIncludeDiscrete] = useState(true);

  // Cognitive store
  const startOperation = useCognitiveStore((state) => state.startOperation);
  const completeOperation = useCognitiveStore((state) => state.completeOperation);
  const failOperation = useCognitiveStore((state) => state.failOperation);

  /**
   * Handle emotion analysis submission
   */
  const handleAnalyze = useCallback(async () => {
    if (text.trim().length === 0) {
      setError('Please enter text to analyze');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const client = getDefaultClient();

    try {
      const operationId = startOperation('detect_emotion', text);

      const response = await client.detectEmotion({
        text,
        includeDiscrete,
      });

      const result: AnalysisResult = {
        emotion: response,
        originalText: text,
        timestamp: Date.now(),
      };

      setCurrentResult(result);
      setAnalysisHistory((prev) => [...prev, result]);

      // Store result in cognitive store
      completeOperation(operationId, { type: 'detect_emotion', data: response });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Emotion analysis failed';
      setError(message);
      failOperation('', message);
    } finally {
      setIsProcessing(false);
    }
  }, [text, includeDiscrete, startOperation, completeOperation, failOperation]);

  /**
   * Handle clear/reset
   */
  const handleClear = useCallback(() => {
    setText('');
    setCurrentResult(null);
    setError(null);
  }, []);

  /**
   * Handle clear history
   */
  const handleClearHistory = useCallback(() => {
    setAnalysisHistory([]);
    setEmotionalTrends([]);
  }, []);

  const canAnalyze = text.trim().length > 0 && !isProcessing;
  const hasResult = currentResult !== null;

  return (
    <div className={`min-h-screen bg-ui-background p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ui-accent-primary flex items-center gap-2">
            <Heart size={24} />
            Emotion Analysis
          </h1>
          <div className="flex gap-2">
            {analysisHistory.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 text-sm bg-ui-border/50 text-ui-text-secondary rounded-lg hover:bg-ui-border transition-colors"
              >
                Clear History
              </button>
            )}
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
          {/* Text Input - Requirements: 21.1 */}
          <TextInput
            value={text}
            onChange={setText}
            disabled={isProcessing}
            autoFocus
            onSubmit={(): void => {
              void handleAnalyze();
            }}
          />

          {/* Options */}
          <GlassPanel className="p-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="include-discrete-checkbox"
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  id="include-discrete-checkbox"
                  name="include-discrete-checkbox"
                  checked={includeDiscrete}
                  onChange={(e): void => {
                    setIncludeDiscrete(e.target.checked);
                  }}
                  disabled={isProcessing}
                  className="w-4 h-4 rounded border-ui-border bg-ui-background text-ui-accent-primary focus:ring-ui-accent-primary"
                />
                <span className="text-sm text-ui-text-primary">
                  Include discrete emotion classification
                </span>
              </label>

              <span className="text-xs text-ui-text-muted">
                {analysisHistory.length} analyses in history
              </span>
            </div>
          </GlassPanel>
        </div>

        {/* Results Section */}
        {hasResult && (
          <div className="flex flex-col lg:flex-row gap-4 items-stretch">
            {/* Circumplex Display - Requirements: 21.2, 21.3 */}
            <div className="flex-1 min-w-0">
              <CircumplexDisplay result={currentResult.emotion} />
            </div>

            {/* Discrete Emotion Display - Requirements: 21.4, 21.5 */}
            {includeDiscrete && currentResult.emotion.discreteEmotions.length > 0 && (
              <div className="flex-1 min-w-0">
                <DiscreteEmotionDisplay emotions={currentResult.emotion.discreteEmotions} />
              </div>
            )}
          </div>
        )}

        {/* Emotional Trends - Requirements: 21.6 */}
        {analysisHistory.length > 0 && (
          <EmotionalTrends trends={emotionalTrends} analysisHistory={analysisHistory} />
        )}
      </div>

      {/* Floating Action Button - Bottom center */}
      <button
        onClick={(): void => {
          void handleAnalyze();
        }}
        disabled={!canAnalyze}
        className={`fixed bottom-[5vh] left-1/2 -translate-x-1/2 z-50 w-56 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group hover:scale-105 active:scale-95 ${
          canAnalyze
            ? 'bg-ui-accent-primary hover:bg-ui-accent-primary/90 text-ui-background'
            : 'bg-ui-border text-ui-text-muted cursor-not-allowed'
        }`}
        aria-label="Analyze emotions"
        style={
          canAnalyze
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className="font-medium text-sm">Analyze Emotion</span>
          </>
        )}
      </button>
    </div>
  );
}

export default EmotionAnalysis;
