/**
 * Configuration management utilities
 */

import { CognitiveConfig, ProcessingMode } from '../types/core.js';

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
  memory_retrieval_threshold: 0.3
};

export class ConfigManager {
  private config: CognitiveConfig;

  constructor(overrides?: Partial<CognitiveConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...overrides };
    this.loadEnvironmentConfig();
  }

  private loadEnvironmentConfig(): void {
    // Load configuration from environment variables
    const envConfig: Partial<CognitiveConfig> = {};

    if (process.env.COGNITIVE_DEFAULT_MODE) {
      envConfig.default_mode = process.env.COGNITIVE_DEFAULT_MODE as ProcessingMode;
    }

    if (process.env.COGNITIVE_ENABLE_EMOTION) {
      envConfig.enable_emotion = process.env.COGNITIVE_ENABLE_EMOTION === 'true';
    }

    if (process.env.COGNITIVE_ENABLE_METACOGNITION) {
      envConfig.enable_metacognition = process.env.COGNITIVE_ENABLE_METACOGNITION === 'true';
    }

    if (process.env.COGNITIVE_WORKING_MEMORY_CAPACITY) {
      envConfig.working_memory_capacity = parseInt(process.env.COGNITIVE_WORKING_MEMORY_CAPACITY);
    }

    if (process.env.COGNITIVE_TEMPERATURE) {
      envConfig.temperature = parseFloat(process.env.COGNITIVE_TEMPERATURE);
    }

    if (process.env.COGNITIVE_TIMEOUT_MS) {
      envConfig.timeout_ms = parseInt(process.env.COGNITIVE_TIMEOUT_MS);
    }

    // Apply environment overrides
    this.config = { ...this.config, ...envConfig };
  }

  getConfig(): CognitiveConfig {
    return { ...this.config };
  }

  get<K extends keyof CognitiveConfig>(key: K): CognitiveConfig[K] {
    return this.config[key];
  }

  set<K extends keyof CognitiveConfig>(key: K, value: CognitiveConfig[K]): void {
    this.config[key] = value;
  }

  validateConfig(): boolean {
    const config = this.config;

    // Validate ranges
    if (config.working_memory_capacity < 1 || config.working_memory_capacity > 20) {
      throw new Error('Working memory capacity must be between 1 and 20');
    }

    if (config.temperature < 0 || config.temperature > 2) {
      throw new Error('Temperature must be between 0 and 2');
    }

    if (config.noise_level < 0 || config.noise_level > 1) {
      throw new Error('Noise level must be between 0 and 1');
    }

    if (config.attention_threshold < 0 || config.attention_threshold > 1) {
      throw new Error('Attention threshold must be between 0 and 1');
    }

    if (config.max_reasoning_depth < 1 || config.max_reasoning_depth > 50) {
      throw new Error('Max reasoning depth must be between 1 and 50');
    }

    if (config.timeout_ms < 1000 || config.timeout_ms > 300000) {
      throw new Error('Timeout must be between 1 second and 5 minutes');
    }

    return true;
  }
}