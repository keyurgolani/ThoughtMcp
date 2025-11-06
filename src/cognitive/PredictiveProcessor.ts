/**
 * Predictive Processing Implementation
 *
 * Implements predictive processing mechanisms inspired by the predictive brain hypothesis:
 * - Top-down prediction generation based on current context
 * - Prediction error computation and model updating
 * - Bayesian belief updating mechanisms
 * - Hierarchical predictive models
 */

import {
  ComponentStatus,
  IPredictiveProcessor,
  Prediction,
} from "../interfaces/cognitive.js";
import { Context } from "../types/core.js";

// Prediction error structure
export interface PredictionError {
  magnitude: number;
  direction: "positive" | "negative";
  confidence: number;
  source: string;
  timestamp: number;
}

// Generative model for predictions
export interface GenerativeModel {
  id: string;
  parameters: Map<string, number>;
  prior_beliefs: Map<string, number>;
  confidence: number;
  last_updated: number;
  prediction_accuracy: number;
}

// Hierarchical level in predictive processing
export interface HierarchicalLevel {
  level: number;
  predictions: Prediction[];
  errors: PredictionError[];
  model: GenerativeModel;
  parent_level?: HierarchicalLevel;
  child_levels: HierarchicalLevel[];
}

// Bayesian update parameters
export interface BayesianUpdate {
  prior: number;
  likelihood: number;
  evidence: number;
  posterior: number;
  confidence_change: number;
}

/**
 * PredictiveProcessor implements predictive processing mechanisms
 * Based on the predictive brain hypothesis and hierarchical temporal memory
 */
export class PredictiveProcessor implements IPredictiveProcessor {
  private generative_models: Map<string, GenerativeModel> = new Map();
  private hierarchical_levels: HierarchicalLevel[] = [];
  private prediction_history: Prediction[] = [];
  private error_history: PredictionError[] = [];
  private max_history_size: number = 1000;
  private prediction_error_threshold: number = 0.3;
  private learning_rate: number = 0.1;
  private confidence_decay: number = 0.95;

  private status: ComponentStatus = {
    name: "PredictiveProcessor",
    initialized: false,
    active: false,
    last_activity: 0,
  };

  /**
   * Initialize the predictive processor with configuration
   */
  async initialize(config: Record<string, unknown>): Promise<void> {
    try {
      this.prediction_error_threshold =
        (config?.prediction_error_threshold as number) ?? 0.3;
      this.learning_rate = (config?.learning_rate as number) ?? 0.1;
      this.confidence_decay = (config?.confidence_decay as number) ?? 0.95;
      this.max_history_size = (config?.max_history_size as number) ?? 1000;

      // Initialize hierarchical levels
      await this.initializeHierarchicalLevels();

      // Initialize base generative models
      await this.initializeGenerativeModels();

      this.status.initialized = true;
      this.status.active = true;
      this.status.last_activity = Date.now();
    } catch (error) {
      this.status.error = `Initialization failed: ${error}`;
      throw error;
    }
  }

  /**
   * Main processing method - implements predictive processing pipeline
   */
  async process(input: unknown): Promise<{
    predictions: Prediction[];
    errors: PredictionError[];
    model_updates: GenerativeModel[];
  }> {
    if (!this.status.initialized) {
      throw new Error("PredictiveProcessor not initialized");
    }

    this.status.last_activity = Date.now();

    try {
      const context = this.extractContext(input);

      // Generate predictions from all hierarchical levels
      const predictions = this.generatePredictions(context);

      // Compute prediction errors if we have actual data
      const errors = this.computePredictionErrors(predictions, input);

      // Update models based on errors
      const updated_models = await this.updateModelsFromErrors(errors);

      // Store in history
      this.updateHistory(predictions, errors);

      return {
        predictions,
        errors,
        model_updates: updated_models,
      };
    } catch (error) {
      this.status.error = `Processing failed: ${error}`;
      throw new Error(`Processing failed: ${error}`);
    }
  }

  /**
   * Generate top-down predictions based on current context
   */
  generatePredictions(context: Context): Prediction[] {
    const predictions: Prediction[] = [];

    // Generate predictions from each hierarchical level
    this.hierarchical_levels.forEach((level) => {
      const level_predictions = this.generateLevelPredictions(level, context);
      predictions.push(...level_predictions);
    });

    // Generate predictions from generative models
    this.generative_models.forEach((model) => {
      const model_predictions = this.generateModelPredictions(model, context);
      predictions.push(...model_predictions);
    });

    // Sort by confidence and return top predictions
    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  }

  /**
   * Compute prediction error between prediction and actual input
   */
  computePredictionError(prediction: Prediction, actual: unknown): number {
    try {
      // Handle null/undefined cases
      if (
        prediction.content === null ||
        actual === null ||
        actual === undefined
      ) {
        return 1.0;
      }

      // Extract comparable features from prediction and actual
      const predicted_features = this.extractFeatures(prediction.content);
      const actual_features = this.extractFeatures(actual);

      // If no features can be extracted, return high error
      if (predicted_features.size === 0 && actual_features.size === 0) {
        return 1.0;
      }

      // Compute feature-wise errors
      const feature_errors = this.computeFeatureErrors(
        predicted_features,
        actual_features
      );

      // Aggregate into single error magnitude
      let error_magnitude = this.aggregateErrors(feature_errors);

      // Add base error for type mismatch
      const pred_type = typeof prediction.content;
      const actual_type = typeof actual;
      if (pred_type !== actual_type) {
        error_magnitude = Math.max(error_magnitude, 0.6);
      }

      // For very different content types, ensure higher error
      if (this.areContentTypesVeryDifferent(prediction.content, actual)) {
        error_magnitude = Math.max(error_magnitude, 0.7);
      }

      // Weight by prediction confidence (lower confidence = higher weighted error)
      const weighted_error = error_magnitude * (2 - prediction.confidence);

      return Math.max(0, Math.min(1, weighted_error));
    } catch {
      // If comparison fails, return maximum error
      return 1.0;
    }
  }

  /**
   * Update generative model based on prediction error
   */
  updateModel(error: number, prediction: Prediction): void {
    const model_id = this.getModelIdFromPrediction(prediction);
    const model = this.generative_models.get(model_id);

    if (!model) return;

    // Bayesian update of model parameters
    const context_key = this.getContextKey(prediction.context);
    const current_belief = model.prior_beliefs.get(context_key) ?? 0.5;

    // Compute likelihood based on error
    const likelihood = 1 - error; // Lower error = higher likelihood

    // Update belief using Bayesian rule
    const updated_belief = this.getBayesianUpdate(
      current_belief,
      likelihood,
      0.5 // Base evidence
    );

    model.prior_beliefs.set(context_key, updated_belief);

    // Update model confidence based on prediction accuracy
    const accuracy_update = 1 - error;
    model.prediction_accuracy =
      model.prediction_accuracy * 0.9 + accuracy_update * 0.1;

    // Update model confidence
    model.confidence = Math.min(
      0.95,
      model.confidence * this.confidence_decay + accuracy_update * 0.1
    );

    // Update parameters using gradient descent-like approach
    this.updateModelParameters(model, error, prediction);

    model.last_updated = Date.now();
  }

  /**
   * Perform Bayesian belief updating
   */
  getBayesianUpdate(
    prior: number,
    likelihood: number,
    evidence: number
  ): number {
    // Bayes' rule: P(H|E) = P(E|H) * P(H) / P(E)
    // Where H is hypothesis, E is evidence

    // Normalize inputs
    prior = Math.max(0.01, Math.min(0.99, prior));
    likelihood = Math.max(0.01, Math.min(0.99, likelihood));
    // Evidence normalization (for future use in more complex Bayesian calculations)
    Math.max(0.01, Math.min(0.99, evidence));

    // Compute posterior
    const numerator = likelihood * prior;
    const denominator = likelihood * prior + (1 - likelihood) * (1 - prior);

    const posterior = numerator / denominator;

    return Math.max(0.01, Math.min(0.99, posterior));
  }

  /**
   * Reset processor state
   */
  reset(): void {
    this.prediction_history = [];
    this.error_history = [];
    this.hierarchical_levels.forEach((level) => {
      level.predictions = [];
      level.errors = [];
    });
    this.status.last_activity = Date.now();
  }

  /**
   * Get current component status
   */
  getStatus(): ComponentStatus {
    return { ...this.status };
  }

  // Private helper methods

  private async initializeHierarchicalLevels(): Promise<void> {
    // Create hierarchical levels for predictive processing
    const levels = [
      {
        level: 0,
        name: "sensory",
        description: "Low-level sensory predictions",
      },
      {
        level: 1,
        name: "perceptual",
        description: "Perceptual object predictions",
      },
      {
        level: 2,
        name: "conceptual",
        description: "Conceptual and semantic predictions",
      },
      {
        level: 3,
        name: "abstract",
        description: "Abstract and causal predictions",
      },
    ];

    this.hierarchical_levels = levels.map((levelConfig) => ({
      level: levelConfig.level,
      predictions: [],
      errors: [],
      model: this.createDefaultModel(`level_${levelConfig.level}`),
      child_levels: [],
    }));

    // Link hierarchical levels
    for (let i = 0; i < this.hierarchical_levels.length - 1; i++) {
      this.hierarchical_levels[i + 1].parent_level =
        this.hierarchical_levels[i];
      this.hierarchical_levels[i].child_levels.push(
        this.hierarchical_levels[i + 1]
      );
    }
  }

  private async initializeGenerativeModels(): Promise<void> {
    // Initialize base generative models for different domains
    const model_configs = [
      { id: "linguistic", domain: "language", confidence: 0.7 },
      { id: "temporal", domain: "time", confidence: 0.6 },
      { id: "causal", domain: "causality", confidence: 0.5 },
      { id: "spatial", domain: "space", confidence: 0.6 },
    ];

    model_configs.forEach((config) => {
      const model = this.createDefaultModel(config.id);
      model.confidence = config.confidence;
      this.generative_models.set(config.id, model);
    });
  }

  private createDefaultModel(id: string): GenerativeModel {
    return {
      id,
      parameters: new Map([
        ["sensitivity", 0.5],
        ["specificity", 0.5],
        ["temporal_weight", 0.3],
        ["context_weight", 0.4],
      ]),
      prior_beliefs: new Map(),
      confidence: 0.5,
      last_updated: Date.now(),
      prediction_accuracy: 0.5,
    };
  }

  private extractContext(input: unknown): Context {
    // Extract context from input - simplified implementation
    if (typeof input === "object" && input !== null && "context" in input) {
      return (input as { context: Context }).context;
    }

    // Create default context
    return {
      session_id: "default",
      domain: "general",
      urgency: 0.5,
      complexity: 0.5,
    };
  }

  private generateLevelPredictions(
    level: HierarchicalLevel,
    context: Context
  ): Prediction[] {
    const predictions: Prediction[] = [];

    // Generate predictions based on level's model
    const model = level.model;
    const context_key = this.getContextKey(context);
    // Get prior belief for this context (currently unused but available for future enhancements)
    model.prior_beliefs.get(context_key) ?? 0.5;

    // Generate different types of predictions based on level
    switch (level.level) {
      case 0: // Sensory level
        predictions.push(...this.generateSensoryPredictions(model, context));
        break;
      case 1: // Perceptual level
        predictions.push(...this.generatePerceptualPredictions(model, context));
        break;
      case 2: // Conceptual level
        predictions.push(...this.generateConceptualPredictions(model, context));
        break;
      case 3: // Abstract level
        predictions.push(...this.generateAbstractPredictions(model, context));
        break;
    }

    return predictions;
  }

  private generateModelPredictions(
    model: GenerativeModel,
    context: Context
  ): Prediction[] {
    const predictions: Prediction[] = [];
    const context_key = this.getContextKey(context);
    const prior_belief = model.prior_beliefs.get(context_key) ?? 0.5;

    // Generate predictions based on model type
    switch (model.id) {
      case "linguistic":
        predictions.push({
          content: this.generateLinguisticPrediction(model, context),
          confidence: model.confidence * prior_belief,
          timestamp: Date.now(),
          context,
        });
        break;
      case "temporal":
        predictions.push({
          content: this.generateTemporalPrediction(model, context),
          confidence: model.confidence * prior_belief,
          timestamp: Date.now(),
          context,
        });
        break;
      case "causal":
        predictions.push({
          content: this.generateCausalPrediction(model, context),
          confidence: model.confidence * prior_belief,
          timestamp: Date.now(),
          context,
        });
        break;
      case "spatial":
        predictions.push({
          content: this.generateSpatialPrediction(model, context),
          confidence: model.confidence * prior_belief,
          timestamp: Date.now(),
          context,
        });
        break;
    }

    return predictions;
  }

  private computePredictionErrors(
    predictions: Prediction[],
    actual: unknown
  ): PredictionError[] {
    return predictions.map((prediction) => {
      const error_magnitude = this.computePredictionError(prediction, actual);

      return {
        magnitude: error_magnitude,
        direction: error_magnitude > 0.5 ? "positive" : "negative",
        confidence: prediction.confidence,
        source: this.getModelIdFromPrediction(prediction),
        timestamp: Date.now(),
      };
    });
  }

  private async updateModelsFromErrors(
    errors: PredictionError[]
  ): Promise<GenerativeModel[]> {
    const updated_models: GenerativeModel[] = [];

    errors.forEach((error) => {
      const model = this.generative_models.get(error.source);
      if (model && error.magnitude > this.prediction_error_threshold) {
        // Create a dummy prediction for the update
        const dummy_prediction: Prediction = {
          content: {},
          confidence: error.confidence,
          timestamp: error.timestamp,
          context: { session_id: "default" },
        };

        this.updateModel(error.magnitude, dummy_prediction);
        updated_models.push(model);
      }
    });

    return updated_models;
  }

  private updateHistory(
    predictions: Prediction[],
    errors: PredictionError[]
  ): void {
    // Add to history with size limit
    this.prediction_history.push(...predictions);
    this.error_history.push(...errors);

    // Trim history if too large
    if (this.prediction_history.length > this.max_history_size) {
      this.prediction_history = this.prediction_history.slice(
        -this.max_history_size
      );
    }

    if (this.error_history.length > this.max_history_size) {
      this.error_history = this.error_history.slice(-this.max_history_size);
    }
  }

  private extractFeatures(content: unknown): Map<string, number> {
    const features = new Map<string, number>();

    if (typeof content === "string") {
      // Extract linguistic features
      features.set("length", content.length / 100); // Normalized
      features.set("complexity", this.computeTextComplexity(content));
      features.set("sentiment", this.computeSentiment(content));
    } else if (typeof content === "object" && content !== null) {
      // Extract object features
      const obj = content as Record<string, unknown>;
      features.set("properties", Object.keys(obj).length / 10); // Normalized
      features.set("depth", this.computeObjectDepth(obj));
    }

    return features;
  }

  private computeFeatureErrors(
    predicted: Map<string, number>,
    actual: Map<string, number>
  ): Map<string, number> {
    const errors = new Map<string, number>();

    // Compute errors for common features
    const all_features = new Set([
      ...Array.from(predicted.keys()),
      ...Array.from(actual.keys()),
    ]);

    all_features.forEach((feature) => {
      const pred_value = predicted.get(feature) ?? 0;
      const actual_value = actual.get(feature) ?? 0;
      const error = Math.abs(pred_value - actual_value);
      errors.set(feature, error);
    });

    return errors;
  }

  private aggregateErrors(errors: Map<string, number>): number {
    if (errors.size === 0) return 0;

    const error_values = Array.from(errors.values());
    const mean_error =
      error_values.reduce((sum, error) => sum + error, 0) / error_values.length;

    return Math.max(0, Math.min(1, mean_error));
  }

  private getModelIdFromPrediction(prediction: Prediction): string {
    // Simple heuristic to determine which model generated the prediction
    if (typeof prediction.content === "string") return "linguistic";
    if (prediction.context.domain === "time") return "temporal";
    if (prediction.context.domain === "causality") return "causal";
    if (prediction.context.domain === "space") return "spatial";
    return "linguistic"; // Default
  }

  private getContextKey(context: Context): string {
    return `${context.domain ?? "general"}_${context.complexity ?? 0.5}`;
  }

  private updateModelParameters(
    model: GenerativeModel,
    error: number,
    prediction: Prediction
  ): void {
    // Update parameters using simple gradient descent
    const learning_rate = this.learning_rate * (1 - model.confidence);

    // Update sensitivity based on error
    const current_sensitivity = model.parameters.get("sensitivity") ?? 0.5;
    const sensitivity_update = current_sensitivity - learning_rate * error;
    model.parameters.set(
      "sensitivity",
      Math.max(0.1, Math.min(0.9, sensitivity_update))
    );

    // Update context weight based on prediction confidence
    const current_context_weight =
      model.parameters.get("context_weight") ?? 0.4;
    const context_update =
      current_context_weight + learning_rate * (prediction.confidence - 0.5);
    model.parameters.set(
      "context_weight",
      Math.max(0.1, Math.min(0.9, context_update))
    );
  }

  // Prediction generation methods for different levels and models

  private generateSensoryPredictions(
    model: GenerativeModel,
    _context: Context
  ): Prediction[] {
    return [
      {
        content: {
          type: "sensory",
          features: ["brightness", "contrast", "motion"],
          confidence: model.confidence,
        },
        confidence: model.confidence * 0.8,
        timestamp: Date.now(),
        context: _context,
      },
    ];
  }

  private generatePerceptualPredictions(
    model: GenerativeModel,
    _context: Context
  ): Prediction[] {
    return [
      {
        content: {
          type: "perceptual",
          objects: ["text", "pattern", "structure"],
          confidence: model.confidence,
        },
        confidence: model.confidence * 0.7,
        timestamp: Date.now(),
        context: _context,
      },
    ];
  }

  private generateConceptualPredictions(
    model: GenerativeModel,
    _context: Context
  ): Prediction[] {
    return [
      {
        content: {
          type: "conceptual",
          concepts: ["meaning", "intent", "category"],
          confidence: model.confidence,
        },
        confidence: model.confidence * 0.6,
        timestamp: Date.now(),
        context: _context,
      },
    ];
  }

  private generateAbstractPredictions(
    model: GenerativeModel,
    _context: Context
  ): Prediction[] {
    return [
      {
        content: {
          type: "abstract",
          abstractions: ["goal", "plan", "outcome"],
          confidence: model.confidence,
        },
        confidence: model.confidence * 0.5,
        timestamp: Date.now(),
        context: _context,
      },
    ];
  }

  private generateLinguisticPrediction(
    _model: GenerativeModel,
    context: Context
  ): unknown {
    return {
      type: "linguistic",
      next_word_probabilities: new Map([
        ["the", 0.15],
        ["and", 0.12],
        ["of", 0.1],
        ["to", 0.08],
      ]),
      semantic_category: context.domain ?? "general",
    };
  }

  private generateTemporalPrediction(
    _model: GenerativeModel,
    _context: Context
  ): unknown {
    return {
      type: "temporal",
      next_event_time: Date.now() + 1000, // 1 second from now
      duration_estimate: 5000, // 5 seconds
      temporal_pattern: "sequential",
    };
  }

  private generateCausalPrediction(
    _model: GenerativeModel,
    _context: Context
  ): unknown {
    return {
      type: "causal",
      likely_causes: ["user_input", "system_state", "external_event"],
      likely_effects: ["response_generation", "state_change", "learning"],
      causal_strength: _model.confidence,
    };
  }

  private generateSpatialPrediction(
    _model: GenerativeModel,
    _context: Context
  ): unknown {
    return {
      type: "spatial",
      spatial_relations: ["above", "below", "adjacent"],
      coordinate_estimates: { x: 0.5, y: 0.5, z: 0.0 },
      spatial_confidence: _model.confidence,
    };
  }

  // Utility methods for feature extraction

  private computeTextComplexity(text: string): number {
    // Simple complexity measure based on word length and sentence structure
    const words = text.split(/\s+/);
    const avg_word_length =
      words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const sentence_count = text.split(/[.!?]+/).length;
    const complexity = (avg_word_length / 10 + sentence_count / 5) / 2;
    return Math.max(0, Math.min(1, complexity));
  }

  private computeSentiment(text: string): number {
    // Simple sentiment analysis
    const positive_words = ["good", "great", "excellent", "positive", "happy"];
    const negative_words = ["bad", "terrible", "awful", "negative", "sad"];

    const words = text.toLowerCase().split(/\s+/);
    let sentiment_score = 0.5; // Neutral

    words.forEach((word) => {
      if (positive_words.includes(word)) sentiment_score += 0.1;
      if (negative_words.includes(word)) sentiment_score -= 0.1;
    });

    return Math.max(0, Math.min(1, sentiment_score));
  }

  private computeObjectDepth(obj: Record<string, unknown>): number {
    let max_depth = 0;

    const traverse = (current: unknown, depth: number): void => {
      if (depth > max_depth) max_depth = depth;

      if (typeof current === "object" && current !== null) {
        Object.values(current as Record<string, unknown>).forEach((value) => {
          traverse(value, depth + 1);
        });
      }
    };

    traverse(obj, 0);
    return Math.min(1, max_depth / 5); // Normalize to 0-1
  }

  private areContentTypesVeryDifferent(
    predicted: unknown,
    actual: unknown
  ): boolean {
    // Check if content types are fundamentally different
    const pred_type = typeof predicted;
    const actual_type = typeof actual;

    // Different primitive types
    if (pred_type !== actual_type) {
      return true;
    }

    // Both strings but very different content
    if (pred_type === "string" && actual_type === "string") {
      const pred_str = predicted as string;
      const actual_str = actual as string;

      // Very different lengths
      if (
        Math.abs(pred_str.length - actual_str.length) >
        Math.max(pred_str.length, actual_str.length) * 0.5
      ) {
        return true;
      }

      // No common words
      const pred_words = new Set(pred_str.toLowerCase().split(/\s+/));
      const actual_words = new Set(actual_str.toLowerCase().split(/\s+/));
      const intersection = new Set(
        Array.from(pred_words).filter((x) => actual_words.has(x))
      );

      if (
        intersection.size === 0 &&
        pred_words.size > 0 &&
        actual_words.size > 0
      ) {
        return true;
      }
    }

    // Both objects but very different structure
    if (
      pred_type === "object" &&
      actual_type === "object" &&
      predicted !== null &&
      actual !== null
    ) {
      const pred_keys = Object.keys(predicted as Record<string, unknown>);
      const actual_keys = Object.keys(actual as Record<string, unknown>);

      // No common keys
      const common_keys = pred_keys.filter((key) => actual_keys.includes(key));
      if (
        common_keys.length === 0 &&
        pred_keys.length > 0 &&
        actual_keys.length > 0
      ) {
        return true;
      }
    }

    return false;
  }
}
