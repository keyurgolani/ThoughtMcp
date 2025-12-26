/**
 * Thought Logo Component
 *
 * Brain with neural network - representing cognitive processing.
 * Neural pathways connect through a central hub, symbolizing
 * thought and interconnected reasoning.
 */

import { ReactElement } from "react";

// ============================================================================
// Types
// ============================================================================

export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type LogoVariant = "default" | "glow" | "minimal" | "monochrome";

export interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  animated?: boolean;
  className?: string;
  ariaLabel?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SIZE_MAP: Record<LogoSize, number> = {
  xs: 25,
  sm: 30,
  md: 40,
  lg: 50,
  xl: 60,
  "2xl": 80,
  "3xl": 100,
};

// ============================================================================
// Logo Component
// ============================================================================

export function Logo({
  size = "md",
  variant = "default",
  animated = false,
  className = "",
  ariaLabel = "Thought Logo",
}: LogoProps): ReactElement {
  const pixelSize = SIZE_MAP[size];
  const isGlow = variant === "glow" || variant === "default";
  const isMonochrome = variant === "monochrome";

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animated ? "animate-pulse" : ""} ${className}`}
      aria-label={ariaLabel}
      role="img"
      style={
        isGlow
          ? { filter: `drop-shadow(0 0 ${String(pixelSize / 8)}px rgba(99, 102, 241, 0.5))` }
          : undefined
      }
    >
      <defs>
        {!isMonochrome && (
          <>
            <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </>
        )}
      </defs>

      {/* Brain outline - stylized cloud-like shape */}
      <path
        d="M 50 12
           C 62 12, 72 18, 76 28
           C 88 30, 92 42, 88 52
           C 92 62, 88 74, 76 78
           C 72 86, 62 90, 50 90
           C 38 90, 28 86, 24 78
           C 12 74, 8 62, 12 52
           C 8 42, 12 30, 24 28
           C 28 18, 38 12, 50 12 Z"
        fill={isMonochrome ? "currentColor" : "url(#brainGradient)"}
        opacity="0.15"
        stroke={isMonochrome ? "currentColor" : "url(#brainGradient)"}
        strokeWidth="2.5"
      />

      {/* Brain folds/lobes - curved lines inside */}
      <g
        stroke={isMonochrome ? "currentColor" : "url(#brainGradient)"}
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      >
        {/* Left hemisphere curves */}
        <path d="M 24 40 Q 32 38, 38 44" />
        <path d="M 20 55 Q 30 52, 38 56" />
        <path d="M 26 70 Q 34 66, 40 68" />

        {/* Right hemisphere curves */}
        <path d="M 76 40 Q 68 38, 62 44" />
        <path d="M 80 55 Q 70 52, 62 56" />
        <path d="M 74 70 Q 66 66, 60 68" />

        {/* Top curves */}
        <path d="M 38 22 Q 44 26, 50 24 Q 56 26, 62 22" />
      </g>

      {/* Neural pathways - connected through center */}
      <g
        stroke={isMonochrome ? "currentColor" : "url(#circuitGradient)"}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      >
        {/* Vertical pathway through center */}
        <path d="M 50 26 L 50 74">
          {animated && (
            <animate
              attributeName="stroke-opacity"
              values="0.5;1;0.5"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </path>

        {/* Horizontal pathway through center */}
        <path d="M 24 50 L 76 50">
          {animated && (
            <animate
              attributeName="stroke-opacity"
              values="0.5;1;0.5"
              dur="2s"
              begin="0.5s"
              repeatCount="indefinite"
            />
          )}
        </path>

        {/* Diagonal pathways through center */}
        <path d="M 34 32 L 50 50 L 66 68">
          {animated && (
            <animate
              attributeName="stroke-opacity"
              values="0.5;1;0.5"
              dur="2s"
              begin="1s"
              repeatCount="indefinite"
            />
          )}
        </path>
        <path d="M 66 32 L 50 50 L 34 68">
          {animated && (
            <animate
              attributeName="stroke-opacity"
              values="0.5;1;0.5"
              dur="2s"
              begin="1.5s"
              repeatCount="indefinite"
            />
          )}
        </path>
      </g>

      {/* Central neural hub */}
      <circle
        cx="50"
        cy="50"
        r="6"
        fill={isMonochrome ? "currentColor" : "url(#neuralGradient)"}
        opacity={isMonochrome ? 0.9 : 1}
      >
        {animated && <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />}
      </circle>

      {/* Neural endpoint nodes */}
      <g fill={isMonochrome ? "currentColor" : "url(#circuitGradient)"}>
        {/* Cardinal points */}
        <circle cx="50" cy="26" r="3" />
        <circle cx="50" cy="74" r="3" />
        <circle cx="24" cy="50" r="3" />
        <circle cx="76" cy="50" r="3" />
        {/* Diagonal points */}
        <circle cx="34" cy="32" r="2.5" />
        <circle cx="66" cy="32" r="2.5" />
        <circle cx="34" cy="68" r="2.5" />
        <circle cx="66" cy="68" r="2.5" />
      </g>
    </svg>
  );
}

// ============================================================================
// Logo with Text Component
// ============================================================================

export interface LogoWithTextProps extends LogoProps {
  showText?: boolean;
  textClassName?: string;
}

export function LogoWithText({
  size = "md",
  variant = "default",
  animated = false,
  showText = true,
  className = "",
  textClassName = "",
  ariaLabel = "Thought",
}: LogoWithTextProps): ReactElement {
  const isGlow = variant === "glow" || variant === "default";

  return (
    <div className={`flex items-center gap-2 ${className}`} aria-label={ariaLabel}>
      <Logo size={size} variant={variant} animated={animated} ariaLabel="" />
      {showText && (
        <span
          className={`font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent ${textClassName}`}
          style={isGlow ? { filter: "drop-shadow(0 0 8px rgba(99, 102, 241, 0.3))" } : undefined}
        >
          Thought
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Animated Logo Component
// ============================================================================

export interface AnimatedLogoProps {
  size?: LogoSize;
  className?: string;
}

export function AnimatedLogo({ size = "xl", className = "" }: AnimatedLogoProps): ReactElement {
  const pixelSize = SIZE_MAP[size];
  // Orbit radius as percentage of container - closer to logo
  const orbitRadius = 42; // percentage from center

  return (
    <div
      className={`relative ${className}`}
      style={{ width: pixelSize * 1.4, height: pixelSize * 1.4 }}
    >
      {/* Logo container - larger crux */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Logo size={size} variant="glow" />
      </div>
      {/* Orbiting beacon - smaller, closer, with pulsing glow */}
      <div
        className="absolute"
        style={{
          width: "100%",
          height: "100%",
          animation: "spin 8s linear infinite",
        }}
      >
        {/* Beacon container positioned at orbit radius */}
        <div
          className="absolute"
          style={{
            top: `${String(50 - orbitRadius)}%`,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {/* Subtle pulsing glow ring */}
          <div
            className="absolute rounded-full bg-cyan-400"
            style={{
              width: "8px",
              height: "8px",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              opacity: 0.1,
              animation: "beacon-pulse 3s ease-out infinite",
            }}
          />
          {/* Core beacon dot */}
          <div
            className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
            style={{
              width: "5px",
              height: "5px",
              boxShadow: "0 0 4px rgba(6, 182, 212, 0.6)",
              animation: "beacon-glow 3s ease-in-out infinite",
            }}
          />
        </div>
      </div>
      {/* Keyframe styles */}
      <style>{`
        @keyframes beacon-pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.15;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }
        @keyframes beacon-glow {
          0%, 100% {
            box-shadow: 0 0 3px rgba(6, 182, 212, 0.5), 0 0 6px rgba(6, 182, 212, 0.2);
          }
          50% {
            box-shadow: 0 0 5px rgba(6, 182, 212, 0.7), 0 0 10px rgba(6, 182, 212, 0.3);
          }
        }
      `}</style>
    </div>
  );
}

export default Logo;
