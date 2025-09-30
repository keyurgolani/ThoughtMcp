/**
 * Configuration management utilities
 */

import { existsSync, readFileSync } from "fs";
import { join, posix } from "path";
import { CognitiveConfig, ProcessingMode } from "../types/core.js";

// Default configuration values
export const DEFAULT_CONFIG: CognitiveConfig = {
  // Processing modes
  default_mode: ProcessingMode.BALANCED,
  enable_emotion: true,
  enable_metacognition: true,
  enable_prediction: true,

  // Memory settings
  working_memory_capacity: 7, // Miller's 7±2
  episodic_memory_size: 1000,
  semantic_memory_size: 5000,
  consolidation_interval: 300000, // 5 minutes in ms

  // Neural processing
  noise_level: 0.1,
  temperature: 0.7,
  attention_threshold: 0.3,

  // Performance settings
  max_reasoning_depth: 10,
  timeout_ms: 30000, // 30 seconds
  max_concurrent_sessions: 100,

  // Thresholds
  confidence_threshold: 0.6,
  system2_activation_threshold: 0.4,
  memory_retrieval_threshold: 0.3,

  // Brain directory configuration
  brain_dir: "~/.brain", // Default to hidden directory in user's home
};

export interface ConfigSource {
  name: string;
  priority: number;
  config: Partial<CognitiveConfig>;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigManager {
  private config: CognitiveConfig;
  private config_sources: ConfigSource[] = [];
  private config_file_paths: string[] = [
    "./cognitive.config.json",
    "./config/cognitive.json",
    "~/.cognitive/config.json",
    "/etc/cognitive/config.json",
  ];

  constructor(overrides?: Partial<CognitiveConfig>) {
    this.config = { ...DEFAULT_CONFIG };
    this.loadAllConfigurations();

    // Apply constructor overrides last (highest priority)
    if (overrides) {
      this.applyConfigSource({
        name: "constructor_overrides",
        priority: 1000,
        config: overrides,
      });
    }

    // Va configuration
    this.validateConfig();
  }

  /**
   * Load configurations from all sources in priority order
   */
  private loadAllConfigurations(): void {
    // Load file-based configurations
    this.loadFileConfigurations();

    // Load environment configuration
    this.loadEnvironmentConfig();

    // Apply all configurations in priority order
    this.applyConfigSources();
  }

  /**
   * Load configuration from files
   */
  private loadFileConfigurations(): void {
    for (const file_path of this.config_file_paths) {
      try {
        const resolved_path = file_path.startsWith("~")
          ? join(process.env.HOME || "", file_path.slice(1))
          : file_path;

        if (existsSync(resolved_path)) {
          const file_content = readFileSync(resolved_path, "utf-8");
          const file_config = JSON.parse(
            file_content
          ) as Partial<CognitiveConfig>;

          this.applyConfigSource({
            name: `file:${file_path}`,
            priority: 100,
            config: file_config,
          });

          // Configuration loaded from file
        }
      } catch {
        // Failed to load configuration from file
      }
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadEnvironmentConfig(): void {
    const envConfig: Partial<CognitiveConfig> = {};

    // Processing modes
    if (process.env.COGNITIVE_DEFAULT_MODE) {
      envConfig.default_mode = process.env
        .COGNITIVE_DEFAULT_MODE as ProcessingMode;
    }

    if (process.env.COGNITIVE_ENABLE_EMOTION) {
      envConfig.enable_emotion =
        process.env.COGNITIVE_ENABLE_EMOTION === "true";
    }

    if (process.env.COGNITIVE_ENABLE_METACOGNITION) {
      envConfig.enable_metacognition =
        process.env.COGNITIVE_ENABLE_METACOGNITION === "true";
    }

    if (process.env.COGNITIVE_ENABLE_PREDICTION) {
      envConfig.enable_prediction =
        process.env.COGNITIVE_ENABLE_PREDICTION === "true";
    }

    // Memory settings
    if (process.env.COGNITIVE_WORKING_MEMORY_CAPACITY) {
      envConfig.working_memory_capacity = parseInt(
        process.env.COGNITIVE_WORKING_MEMORY_CAPACITY
      );
    }

    if (process.env.COGNITIVE_EPISODIC_MEMORY_SIZE) {
      envConfig.episodic_memory_size = parseInt(
        process.env.COGNITIVE_EPISODIC_MEMORY_SIZE
      );
    }

    if (process.env.COGNITIVE_SEMANTIC_MEMORY_SIZE) {
      envConfig.semantic_memory_size = parseInt(
        process.env.COGNITIVE_SEMANTIC_MEMORY_SIZE
      );
    }

    if (process.env.COGNITIVE_CONSOLIDATION_INTERVAL) {
      envConfig.consolidation_interval = parseInt(
        process.env.COGNITIVE_CONSOLIDATION_INTERVAL
      );
    }

    // Neural processing
    if (process.env.COGNITIVE_NOISE_LEVEL) {
      envConfig.noise_level = parseFloat(process.env.COGNITIVE_NOISE_LEVEL);
    }

    if (process.env.COGNITIVE_TEMPERATURE) {
      envConfig.temperature = parseFloat(process.env.COGNITIVE_TEMPERATURE);
    }

    if (process.env.COGNITIVE_ATTENTION_THRESHOLD) {
      envConfig.attention_threshold = parseFloat(
        process.env.COGNITIVE_ATTENTION_THRESHOLD
      );
    }

    // Performance settings
    if (process.env.COGNITIVE_MAX_REASONING_DEPTH) {
      envConfig.max_reasoning_depth = parseInt(
        process.env.COGNITIVE_MAX_REASONING_DEPTH
      );
    }

    if (process.env.COGNITIVE_TIMEOUT_MS) {
      envConfig.timeout_ms = parseInt(process.env.COGNITIVE_TIMEOUT_MS);
    }

    if (process.env.COGNITIVE_MAX_CONCURRENT_SESSIONS) {
      envConfig.max_concurrent_sessions = parseInt(
        process.env.COGNITIVE_MAX_CONCURRENT_SESSIONS
      );
    }

    // Thresholds
    if (process.env.COGNITIVE_CONFIDENCE_THRESHOLD) {
      envConfig.confidence_threshold = parseFloat(
        process.env.COGNITIVE_CONFIDENCE_THRESHOLD
      );
    }

    if (process.env.COGNITIVE_SYSTEM2_ACTIVATION_THRESHOLD) {
      envConfig.system2_activation_threshold = parseFloat(
        process.env.COGNITIVE_SYSTEM2_ACTIVATION_THRESHOLD
      );
    }

    if (process.env.COGNITIVE_MEMORY_RETRIEVAL_THRESHOLD) {
      envConfig.memory_retrieval_threshold = parseFloat(
        process.env.COGNITIVE_MEMORY_RETRIEVAL_THRESHOLD
      );
    }

    // Brain directory configuration
    if (
      process.env.COGNITIVE_BRAIN_DIR &&
      process.env.COGNITIVE_BRAIN_DIR.trim()
    ) {
      envConfig.brain_dir = process.env.COGNITIVE_BRAIN_DIR;
    }

    this.applyConfigSource({
      name: "environment",
      priority: 200,
      config: envConfig,
    });
  }

  /**
   * Apply a configuration source
   */
  private applyConfigSource(source: ConfigSource): void {
    this.config_sources.push(source);
    this.config_sources.sort((a, b) => a.priority - b.priority);
    this.applyConfigSources();
  }

  /**
   * Apply all configuration sources in priority order
   */
  private applyConfigSources(): void {
    let merged_config = { ...DEFAULT_CONFIG };

    for (const source of this.config_sources) {
      merged_config = { ...merged_config, ...source.config };
    }

    this.config = merged_config;
  }

  /**
   * Get current configuration
   */
  getConfig(): CognitiveConfig {
    return { ...this.config };
  }

  /**
   * Get specific configuration value
   */
  get<K extends keyof CognitiveConfig>(key: K): CognitiveConfig[K] {
    return this.config[key];
  }

  /**
   * Set specific configuration value
   */
  set<K extends keyof CognitiveConfig>(
    key: K,
    value: CognitiveConfig[K]
  ): void {
    this.config[key] = value;
  }

  /**
   * Update configuration with partial values
   */
  updateConfig(updates: Partial<CognitiveConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
  }

  /**
   * Get configuration sources information
   */
  getConfigSources(): ConfigSource[] {
    return [...this.config_sources];
  }

  /**
   * Add custom configuration file path
   */
  addConfigFilePath(path: string): void {
    if (!this.config_file_paths.includes(path)) {
      this.config_file_paths.push(path);
    }
  }

  /**
   * Reload configuration from all sources
   */
  reloadConfig(): void {
    this.config_sources = [];
    this.config = { ...DEFAULT_CONFIG };
    this.loadAllConfigurations();
    this.validateConfig();
  }

  /**
   * Create configuration tuning preset
   */
  createPreset(_name: string, _config: Partial<CognitiveConfig>): void {
    // This could be extended to save presets to file
    // Created preset with configuration
  }

  /**
   * Get resolved brain directory path with home directory expansion
   */
  getBrainDirectoryPath(): string {
    const brainDir = this.config.brain_dir;
    const resolved = brainDir.startsWith("~")
      ? posix.join(process.env.HOME || "", brainDir.slice(1))
      : brainDir;

    // Ensure consistent forward slashes for cross-platform compatibility
    return resolved.replace(/\\/g, "/");
  }

  /**
   * Get memory file path within the brain directory
   */
  getMemoryFilePath(): string {
    const brainPath = this.getBrainDirectoryPath();
    // Use posix.join to ensure forward slashes
    const memoryPath = posix.join(brainPath, "memory.json");

    return memoryPath;
  }

  /**
   * Get configuration for specific processing mode
   */
  getModeConfig(mode: ProcessingMode): Partial<CognitiveConfig> {
    const base_config = this.getConfig();

    switch (mode) {
      case ProcessingMode.INTUITIVE:
        return {
          ...base_config,
          system2_activation_threshold: 0.8, // Higher threshold = less System 2
          temperature: Math.min(base_config.temperature * 1.2, 2.0),
          max_reasoning_depth: Math.max(base_config.max_reasoning_depth - 3, 1),
        };

      case ProcessingMode.DELIBERATIVE:
        return {
          ...base_config,
          system2_activation_threshold: 0.2, // Lower threshold = more System 2
          temperature: Math.max(base_config.temperature * 0.8, 0.1),
          max_reasoning_depth: base_config.max_reasoning_depth + 5,
        };

      case ProcessingMode.CREATIVE:
        return {
          ...base_config,
          temperature: Math.min(base_config.temperature * 1.5, 2.0),
          noise_level: Math.min(base_config.noise_level * 1.3, 1.0),
          system2_activation_threshold: 0.6,
        };

      case ProcessingMode.ANALYTICAL:
        return {
          ...base_config,
          temperature: Math.max(base_config.temperature * 0.6, 0.1),
          noise_level: Math.max(base_config.noise_level * 0.7, 0.0),
          system2_activation_threshold: 0.3,
          max_reasoning_depth: base_config.max_reasoning_depth + 3,
        };

      case ProcessingMode.BALANCED:
      default:
        return base_config;
    }
  }

  /**
   * Validate configuration values
   */
  validateConfig(): ConfigValidationResult {
    const config = this.config;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate ranges
    if (
      config.working_memory_capacity < 1 ||
      config.working_memory_capacity > 20
    ) {
      errors.push("Working memory capacity must be between 1 and 20");
    }

    if (config.temperature < 0 || config.temperature > 2) {
      errors.push("Temperature must be between 0 and 2");
    }

    if (config.noise_level < 0 || config.noise_level > 1) {
      errors.push("Noise level must be between 0 and 1");
    }

    if (config.attention_threshold < 0 || config.attention_threshold > 1) {
      errors.push("Attention threshold must be between 0 and 1");
    }

    if (config.max_reasoning_depth < 1 || config.max_reasoning_depth > 50) {
      errors.push("Max reasoning depth must be between 1 and 50");
    }

    if (config.timeout_ms < 1000 || config.timeout_ms > 300000) {
      errors.push("Timeout must be between 1 second and 5 minutes");
    }

    if (config.confidence_threshold < 0 || config.confidence_threshold > 1) {
      errors.push("Confidence threshold must be between 0 and 1");
    }

    if (
      config.system2_activation_threshold < 0 ||
      config.system2_activation_threshold > 1
    ) {
      errors.push("System 2 activation threshold must be between 0 and 1");
    }

    if (
      config.memory_retrieval_threshold < 0 ||
      config.memory_retrieval_threshold > 1
    ) {
      errors.push("Memory retrieval threshold must be between 0 and 1");
    }

    // Memory size validations
    if (config.episodic_memory_size < 100) {
      warnings.push("Episodic memory size is quite small, may affect learning");
    }

    if (config.semantic_memory_size < 500) {
      warnings.push(
        "Semantic memory size is quite small, may affect knowledge retention"
      );
    }

    if (config.max_concurrent_sessions < 1) {
      errors.push("Max concurrent sessions must be at least 1");
    }

    // Performance warnings
    if (config.max_concurrent_sessions > 1000) {
      warnings.push("High concurrent session limit may impact performance");
    }

    if (config.consolidation_interval < 60000) {
      warnings.push("Very frequent consolidation may impact performance");
    }

    // Throw errors if validation fails
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(", ")}`);
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn("Configuration warnings:", warnings.join(", "));
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Export current configuration to JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  importConfig(json_config: string): void {
    try {
      const imported_config = JSON.parse(
        json_config
      ) as Partial<CognitiveConfig>;
      this.updateConfig(imported_config);
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }
}
