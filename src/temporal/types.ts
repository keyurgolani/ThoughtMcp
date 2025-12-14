/**
 * Temporal Decay System Type Definitions
 *
 * Core types and interfaces for the temporal decay and memory lifecycle system.
 * Implements exponential decay with sector-specific rates and reinforcement mechanisms.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { MemorySector } from "../embeddings/types";

/**
 * Decay configuration with sector-specific multipliers
 */
export interface DecayConfig {
  /** Base decay rate (lambda) - default 0.02 */
  baseLambda: number;

  /** Sector-specific decay rate multipliers */
  sectorMultipliers: Record<MemorySector, number>;

  /** Strength boost applied on memory access - default 0.3 */
  reinforcementBoost: number;

  /** Minimum strength floor - default 0.1 */
  minimumStrength: number;

  /** Strength threshold for pruning candidates - default 0.2 */
  pruningThreshold: number;
}

/**
 * Sector configuration manager interface
 */
export interface SectorConfigManager {
  /** Get current decay configuration */
  getConfig(): DecayConfig;

  /** Update decay configuration */
  updateConfig(config: Partial<DecayConfig>): void;

  /** Validate configuration */
  validateConfig(config: DecayConfig): boolean;

  /** Get effective decay rate for a sector */
  getEffectiveDecayRate(sector: MemorySector): number;

  /** Reset to default configuration */
  resetToDefaults(): void;
}

/**
 * Default decay configuration
 */
export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  baseLambda: 0.02,
  sectorMultipliers: {
    [MemorySector.Episodic]: 1.5, // Fastest decay - episodic memories fade quickly
    [MemorySector.Semantic]: 0.5, // Slowest decay - facts persist longer
    [MemorySector.Procedural]: 0.7, // Moderate decay - skills fade moderately
    [MemorySector.Emotional]: 1.2, // Fast decay - emotions fade relatively quickly
    [MemorySector.Reflective]: 0.8, // Moderate-slow decay - insights persist
  },
  reinforcementBoost: 0.3,
  minimumStrength: 0.1,
  pruningThreshold: 0.2,
};

/**
 * Validation error types
 */
export enum ValidationError {
  NEGATIVE_BASE_LAMBDA = "Base lambda must be positive",
  NEGATIVE_MULTIPLIER = "Sector multipliers must be positive",
  NEGATIVE_BOOST = "Reinforcement boost must be non-negative",
  INVALID_MINIMUM_STRENGTH = "Minimum strength must be between 0 and 1",
  INVALID_PRUNING_THRESHOLD = "Pruning threshold must be between 0 and 1",
  MISSING_SECTORS = "All five sectors must have multipliers",
  THRESHOLD_TOO_LOW = "Pruning threshold must be >= minimum strength",
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Result of decay maintenance operation
 */
export interface DecayMaintenanceResult {
  processedCount: number;
  prunedCount: number;
  processingTime: number;
  errors: string[];
}

/**
 * Reinforcement event type
 */
export type ReinforcementType = "access" | "explicit" | "importance";

/**
 * Reinforcement event record
 */
export interface ReinforcementEvent {
  /** Event timestamp */
  timestamp: Date;

  /** Type of reinforcement */
  type: ReinforcementType;

  /** Strength boost applied */
  boost: number;

  /** Memory strength before reinforcement */
  strengthBefore: number;

  /** Memory strength after reinforcement */
  strengthAfter: number;
}
