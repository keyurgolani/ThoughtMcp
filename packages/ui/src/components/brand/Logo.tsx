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
  // Monochome is not really supported by the PNG, but we can grayscale it
  const isMonochrome = variant === "monochrome";

  return (
    <img
      src="/logo.png"
      width={pixelSize}
      height={pixelSize}
      alt={ariaLabel}
      className={`${animated ? "animate-pulse" : ""} ${className}`}
      style={{
        filter: isGlow
          ? `drop-shadow(0 0 ${String(pixelSize / 8)}px rgba(99, 102, 241, 0.5))`
          : isMonochrome
            ? "grayscale(100%)"
            : undefined,
        // Ensure consistent sizing
        width: pixelSize,
        height: pixelSize,
      }}
    />
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
  // Logo scale factor - makes logo larger without affecting orbit
  const logoScale = 1.25;

  return (
    <div
      className={`relative ${className}`}
      style={{ width: pixelSize * 1.4, height: pixelSize * 1.4 }}
    >
      {/* Logo container - larger crux */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div style={{ transform: `scale(${String(logoScale)})` }}>
          <Logo size={size} variant="glow" />
        </div>
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
