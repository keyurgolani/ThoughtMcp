/**
 * Sector Configuration Manager
 *
 * Manages decay configuration with sector-specific multipliers.
 * Provides loading, caching, updating, and validation of decay configurations.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { MemorySector } from "../embeddings/types";
import { DecayConfig, DEFAULT_DECAY_CONFIG, ValidationError, ValidationResult } from "./types";

/**
 * SectorConfigManager class
 *
 * Manages sector-specific decay configuration with validation and caching.
 */
export class SectorConfigManager {
  private config: DecayConfig;

  /**
   * Create a new SectorConfigManager
   * @param initialConfig - Optional initial configuration (defaults to DEFAULT_DECAY_CONFIG)
   */
  constructor(initialConfig?: DecayConfig) {
    this.config = initialConfig ? { ...initialConfig } : { ...DEFAULT_DECAY_CONFIG };

    // Validate initial configuration
    const validation = this.validate(this.config);
    if (!validation.valid) {
      throw new Error(`Invalid initial configuration: ${validation.errors.join(", ")}`);
    }
  }

  /**
   * Get current decay configuration
   * @returns Current configuration (deep copy to prevent external mutation)
   */
  getConfig(): DecayConfig {
    return {
      ...this.config,
      sectorMultipliers: { ...this.config.sectorMultipliers },
    };
  }

  /**
   * Update decay configuration
   * @param updates - Partial configuration updates
   * @throws Error if updated configuration is invalid
   */
  updateConfig(
    updates: Partial<Omit<DecayConfig, "sectorMultipliers">> & {
      sectorMultipliers?: Partial<Record<MemorySector, number>>;
    }
  ): void {
    // Create updated configuration
    const updatedConfig: DecayConfig = {
      ...this.config,
      ...updates,
      // Handle sector multipliers specially to allow partial updates
      sectorMultipliers: updates.sectorMultipliers
        ? { ...this.config.sectorMultipliers, ...updates.sectorMultipliers }
        : { ...this.config.sectorMultipliers },
    };

    // Validate updated configuration
    const validation = this.validate(updatedConfig);
    if (!validation.valid) {
      throw new Error(`Invalid configuration update: ${validation.errors.join(", ")}`);
    }

    // Apply updates
    this.config = updatedConfig;
  }

  /**
   * Validate configuration
   * @param config - Configuration to validate
   * @returns Validation result with errors if invalid
   */
  validateConfig(config: DecayConfig): boolean {
    const result = this.validate(config);
    return result.valid;
  }

  /**
   * Get effective decay rate for a sector
   * @param sector - Memory sector
   * @returns Effective decay rate (baseLambda * sectorMultiplier)
   */
  getEffectiveDecayRate(sector: MemorySector): number {
    const multiplier = this.config.sectorMultipliers[sector];
    if (multiplier === undefined) {
      throw new Error(`No multiplier configured for sector: ${sector}`);
    }
    return this.config.baseLambda * multiplier;
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_DECAY_CONFIG };
  }

  /**
   * Internal validation method
   * @param config - Configuration to validate
   * @returns Validation result with detailed errors
   */
  private validate(config: DecayConfig): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate base lambda
    if (config.baseLambda <= 0) {
      errors.push(ValidationError.NEGATIVE_BASE_LAMBDA);
    }

    // Validate sector multipliers
    const sectors = Object.values(MemorySector);
    const configuredSectors = Object.keys(config.sectorMultipliers);

    // Check all sectors are present
    if (configuredSectors.length !== sectors.length) {
      errors.push(ValidationError.MISSING_SECTORS);
    }

    // Check all multipliers are positive
    for (const sector of sectors) {
      const multiplier = config.sectorMultipliers[sector];
      if (multiplier === undefined) {
        errors.push(ValidationError.MISSING_SECTORS);
      } else if (multiplier <= 0) {
        errors.push(ValidationError.NEGATIVE_MULTIPLIER);
      }
    }

    // Validate reinforcement boost
    if (config.reinforcementBoost < 0) {
      errors.push(ValidationError.NEGATIVE_BOOST);
    }

    // Validate minimum strength
    if (config.minimumStrength < 0 || config.minimumStrength > 1) {
      errors.push(ValidationError.INVALID_MINIMUM_STRENGTH);
    }

    // Validate pruning threshold
    if (config.pruningThreshold < 0 || config.pruningThreshold > 1) {
      errors.push(ValidationError.INVALID_PRUNING_THRESHOLD);
    }

    // Validate threshold >= minimum strength
    if (config.pruningThreshold < config.minimumStrength) {
      errors.push(ValidationError.THRESHOLD_TOO_LOW);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
