/**
 * Cognitive Orchestrator Implementation
 *
 * Central coordinator that manages the flow of information through cognitive components.
 * Implements the main thinking pipeline with configurable processing modes,
 * component initialization, and session management.
 */

import {
  CognitiveComponent,
  ComponentStatus,
  ICognitiveOrchestrator,
} from "../interfaces/cognitive.js";
import {
  CognitiveConfig,
  CognitiveInput,
  Context,
  EmotionalState,
  ProcessingMode,
  ReasoningStep,
  ReasoningType,
  ThoughtMetadata,
  ThoughtResult,
} from "../types/core.js";
import { ConfigManager } from "../utils/config.js";
import { getLogger } from "../utils/logger.js";
import { DualProcessController } from "./DualProcessController.js";
import { EmotionalProcessor } from "./EmotionalProcessor.js";
import { MemorySystem } from "./MemorySystem.js";
import {
  MetacognitionModule,
  MetacognitiveAssessment,
} from "./MetacognitionModule.js";
import { PredictiveProcessor } from "./PredictiveProcessor.js";
import { SensoryProcessor } from "./SensoryProcessor.js";
import { StochasticNeuralProcessor } from "./StochasticNeuralProcessor.js";
import { WorkingMemoryModule } from "./WorkingMemoryModule.js";

export interface CognitiveOrchestratorConfig {
  // Component configurations
  sensory_processor?: Record<string, unknown>;
  working_memory?: Record<string, unknown>;
  dual_process?: Record<string, unknown>;
  memory_system?: Record<string, unknown>;
  emotional_processor?: Record<string, unknown>;
  metacognition?: Record<string, unknown>;
  predictive_processor?: Record<string, unknown>;
  stochastic_processor?: Record<string, unknown>;

  // Global settings
  default_processing_mode?: ProcessingMode;
  enable_all_components?: boolean;
  session_timeout_ms?: number;
  max_concurrent_sessions?: number;
  component_timeout_ms?: number;
}

export interface SessionState {
  session_id: string;
  created_at: number;
  last_activity: number;
  context: Context;
  processing_history: ThoughtResult[];
  component_states: Map<string, unknown>;
}

/**
 * CognitiveOrchestrator coordinates all cognitive components to implement
 * human-like thinking processes through a structured pipeline
 */
export class CognitiveOrchestrator implements ICognitiveOrchestrator {
  // Core cognitive components
  private sensoryProcessor: SensoryProcessor;
  private workingMemory: WorkingMemoryModule;
  private dualProcessController: DualProcessController;
  private memorySystem: MemorySystem;
  private emotionalProcessor: EmotionalProcessor;
  private metacognitionModule: MetacognitionModule;
  private predictiveProcessor: PredictiveProcessor;
  private stochasticProcessor: StochasticNeuralProcessor;

  // Configuration management
  private configManager: ConfigManager;
  private logger = getLogger();

  // Orchestrator state
  private initialized: boolean = false;
  private lastActivity: number = 0;
  private config: CognitiveOrchestratorConfig = {};
  private currentProcessingMode: ProcessingMode = ProcessingMode.BALANCED;
  private sessions: Map<string, SessionState> = new Map();
  private componentInitializationOrder: string[] = [
    "sensoryProcessor",
    "workingMemory",
    "memorySystem",
    "emotionalProcessor",
    "predictiveProcessor",
    "stochasticProcessor",
    "metacognitionModule",
    "dualProcessController",
  ];

  constructor(config?: CognitiveOrchestratorConfig) {
    this.config = {
      default_processing_mode: ProcessingMode.BALANCED,
      enable_all_components: true,
      session_timeout_ms: 3600000, // 1 hour
      max_concurrent_sessions: 100,
      component_timeout_ms: 30000, // 30 seconds
      ...config,
    };

    // Initialize configuration manager
    this.configManager = new ConfigManager();

    // Initialize components
    this.sensoryProcessor = new SensoryProcessor();
    this.workingMemory = new WorkingMemoryModule();
    this.dualProcessController = new DualProcessController();

    // Initialize memory system with brain directory configuration
    const memoryFilePath = this.configManager.getMemoryFilePath();
    this.memorySystem = new MemorySystem({
      persistence: {
        storage_type: "file",
        file_path: memoryFilePath,
      },
      persistence_enabled: true,
      auto_save_enabled: true,
      auto_recovery_enabled: true,
    });

    this.emotionalProcessor = new EmotionalProcessor();
    this.metacognitionModule = new MetacognitionModule();
    this.predictiveProcessor = new PredictiveProcessor();
    this.stochasticProcessor = new StochasticNeuralProcessor();

    this.currentProcessingMode =
      this.config.default_processing_mode || ProcessingMode.BALANCED;
  }

  /**
   * Initialize the cognitive orchestrator and all components
   */
  async initialize(config?: Record<string, unknown>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      await this.initializeComponents();
      this.initialized = true;
      this.lastActivity = Date.now();
    } catch (error) {
      throw new Error(`Failed to initialize CognitiveOrchestrator: ${error}`);
    }
  }

  /**
   * Initialize all cognitive components in the correct order
   */
  async initializeComponents(): Promise<void> {
    const componentConfigs = {
      sensoryProcessor: this.config.sensory_processor || {},
      workingMemory: this.config.working_memory || {},
      memorySystem: this.config.memory_system || {},
      emotionalProcessor: this.config.emotional_processor || {},
      predictiveProcessor: this.config.predictive_processor || {},
      stochasticProcessor: this.config.stochastic_processor || {},
      metacognitionModule: this.config.metacognition || {},
      dualProcessController: this.config.dual_process || {},
    };

    // Initialize components in dependency order
    for (const componentName of this.componentInitializationOrder) {
      const component = this.getComponentByName(componentName);
      const componentConfig =
        componentConfigs[componentName as keyof typeof componentConfigs];

      if (component && this.config.enable_all_components) {
        try {
          await component.initialize(componentConfig);
        } catch (error) {
          throw new Error(`Failed to initialize ${componentName}: ${error}`);
        }
      }
    }
  }

  /**
   * Main thinking method - implements the cognitive processing pipeline
   */
  async think(input: CognitiveInput): Promise<ThoughtResult> {
    if (!this.initialized) {
      throw new Error("CognitiveOrchestrator not initialized");
    }

    const startTime = Date.now();
    this.lastActivity = startTime;
    const traceId = this.logger.startTrace();

    // Use traceId for logging context
    this.logger.debug(
      "CognitiveOrchestrator",
      `Processing with trace ID: ${traceId}`
    );

    this.logger.info(
      "CognitiveOrchestrator",
      "Starting cognitive processing pipeline",
      {
        input_length: input.input.length,
        mode: input.mode,
      },
      {
        session_id: input.context.session_id,
        processing_mode: input.mode,
        reasoning_step: 0,
      }
    );

    try {
      // Ensure session exists
      const session = this.getOrCreateSession(
        input.context.session_id,
        input.context
      );

      // Phase 1: Sensory Processing and Prediction Generation
      this.logger.debug(
        "CognitiveOrchestrator",
        "Phase 1: Sensory processing and prediction generation",
        {},
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
          reasoning_step: 1,
        }
      );

      const sensoryStartTime = Date.now();
      const sensoryData = await this.sensoryProcessor.process(input.input);
      const sensoryProcessingTime = Date.now() - sensoryStartTime;

      this.logger.logThoughtProcess(
        "SensoryProcessor",
        1,
        "Processed sensory input",
        0.9,
        sensoryProcessingTime,
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
        }
      );

      const predictionStartTime = Date.now();
      const predictions = this.predictiveProcessor.generatePredictions(
        input.context
      );
      const predictionProcessingTime = Date.now() - predictionStartTime;

      this.logger.logThoughtProcess(
        "PredictiveProcessor",
        1,
        "Generated predictions",
        0.8,
        predictionProcessingTime,
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
        }
      );

      // Phase 2: Memory Retrieval and Integration
      this.logger.debug(
        "CognitiveOrchestrator",
        "Phase 2: Memory retrieval and integration",
        {},
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
          reasoning_step: 2,
        }
      );

      const memoryStartTime = Date.now();
      const memoryRetrievalResult = await this.memorySystem.retrieveMemories(
        input.input,
        input.configuration.memory_retrieval_threshold || 0.3
      );
      const memoryProcessingTime = Date.now() - memoryStartTime;

      this.logger.logMemoryOperation(
        "MemorySystem",
        "retrieve",
        `Retrieved ${memoryRetrievalResult.episodic_memories.length} episodic and ${memoryRetrievalResult.semantic_concepts.length} semantic memories`,
        undefined,
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
          processing_time: memoryProcessingTime,
        }
      );

      // Phase 3: Working Memory Integration
      this.logger.debug(
        "CognitiveOrchestrator",
        "Phase 3: Working memory integration",
        {},
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
          reasoning_step: 3,
        }
      );

      const workingMemoryInput = {
        sensory_data: sensoryData,
        predictions: predictions,
        memories: memoryRetrievalResult,
        input: input.input,
      };

      const wmStartTime = Date.now();
      const workingMemoryState = await this.workingMemory.process(
        workingMemoryInput
      );
      const wmProcessingTime = Date.now() - wmStartTime;

      // Calculate working memory load (simplified)
      const wmLoad = Math.min(
        1.0,
        (workingMemoryState.active_chunks?.length || 0) / 7
      );

      this.logger.logThoughtProcess(
        "WorkingMemoryModule",
        3,
        "Integrated information into working memory",
        0.85,
        wmProcessingTime,
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
          working_memory_load: wmLoad,
        }
      );

      // Phase 4: Emotional Assessment
      this.logger.debug(
        "CognitiveOrchestrator",
        "Phase 4: Emotional assessment",
        {},
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
          reasoning_step: 4,
        }
      );

      const emotionalStartTime = Date.now();
      const emotionalContext = await this.emotionalProcessor.process(
        input.input
      );
      const emotionalProcessingTime = Date.now() - emotionalStartTime;

      this.logger.logEmotionalState(
        "EmotionalProcessor",
        "Assessed emotional context",
        {
          valence: emotionalContext.valence,
          arousal: emotionalContext.arousal,
          dominance: emotionalContext.dominance,
        },
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
          processing_time: emotionalProcessingTime,
        }
      );

      // Phase 5: Dual-Process Reasoning
      this.logger.debug(
        "CognitiveOrchestrator",
        "Phase 5: Dual-process reasoning",
        {},
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
          reasoning_step: 5,
        }
      );

      const reasoningInput: CognitiveInput = {
        ...input,
        context: {
          ...input.context,
          working_memory: workingMemoryState,
          emotional_context: emotionalContext,
          predictions: predictions,
          memories: memoryRetrievalResult,
        },
      };

      const reasoningStartTime = Date.now();
      let thoughtSequence = await this.dualProcessController.process(
        reasoningInput
      );
      const reasoningProcessingTime = Date.now() - reasoningStartTime;

      this.logger.logThoughtProcess(
        "DualProcessController",
        5,
        "Completed dual-process reasoning",
        thoughtSequence.confidence,
        reasoningProcessingTime,
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
        }
      );

      // Phase 6: Stochastic Enhancement (if enabled)
      if (input.configuration.noise_level > 0) {
        thoughtSequence = await this.applyStochasticProcessing(
          thoughtSequence,
          input.configuration
        );
      }

      // Phase 7: Metacognitive Monitoring and Adjustment
      if (input.configuration.enable_metacognition) {
        this.logger.debug(
          "CognitiveOrchestrator",
          "Phase 7: Metacognitive monitoring and adjustment",
          {},
          {
            session_id: input.context.session_id,
            processing_mode: input.mode,
            reasoning_step: 7,
          }
        );

        const metacognitiveStartTime = Date.now();
        const metacognitiveAssessment =
          await this.metacognitionModule.assessReasoning(
            thoughtSequence.reasoning_path
          );
        const metacognitiveProcessingTime = Date.now() - metacognitiveStartTime;

        const metacognitiveFlags: string[] = [];
        if (metacognitiveAssessment.should_reconsider)
          metacognitiveFlags.push("should_reconsider");
        if (metacognitiveAssessment.confidence < 0.5)
          metacognitiveFlags.push("low_confidence");
        if (metacognitiveAssessment.biases_detected.length > 0)
          metacognitiveFlags.push("biases_detected");

        this.logger.logMetacognition(
          "MetacognitionModule",
          `Metacognitive assessment completed. Confidence: ${metacognitiveAssessment.confidence.toFixed(
            2
          )}`,
          metacognitiveFlags,
          {
            session_id: input.context.session_id,
            processing_mode: input.mode,
            processing_time: metacognitiveProcessingTime,
            confidence: metacognitiveAssessment.confidence,
          }
        );

        if (metacognitiveAssessment.should_reconsider) {
          this.logger.debug(
            "CognitiveOrchestrator",
            "Applying metacognitive adjustments",
            {},
            {
              session_id: input.context.session_id,
              processing_mode: input.mode,
              metacognitive_flags: ["applying_adjustments"],
            }
          );

          // Apply metacognitive adjustments
          thoughtSequence = await this.applyMetacognitiveAdjustments(
            thoughtSequence,
            metacognitiveAssessment
          );
        }

        // Add metacognitive metadata
        thoughtSequence.metadata = {
          ...thoughtSequence.metadata,
          metacognitive_assessment: metacognitiveAssessment,
        };
      }

      // Phase 8: Memory Storage
      this.logger.debug(
        "CognitiveOrchestrator",
        "Phase 8: Memory storage",
        {},
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
          reasoning_step: 8,
        }
      );

      const storageStartTime = Date.now();
      await this.storeExperience(input, thoughtSequence, session);
      const storageProcessingTime = Date.now() - storageStartTime;

      this.logger.logMemoryOperation(
        "MemorySystem",
        "store",
        "Stored cognitive experience",
        undefined,
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
          processing_time: storageProcessingTime,
        }
      );

      // Phase 9: Finalize result and update session
      const processingTime = Date.now() - startTime;
      const finalResult = this.finalizeThoughtResult(
        thoughtSequence,
        processingTime,
        memoryRetrievalResult.episodic_memories.length +
          memoryRetrievalResult.semantic_concepts.length,
        input.mode
      );

      this.updateSession(session, finalResult);

      this.logger.info(
        "CognitiveOrchestrator",
        "Cognitive processing pipeline completed successfully",
        {
          total_processing_time: processingTime,
          final_confidence: finalResult.confidence,
          reasoning_steps: finalResult.reasoning_path.length,
        },
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
          confidence: finalResult.confidence,
          processing_time: processingTime,
        }
      );

      this.logger.endTrace();
      return finalResult;
    } catch (error) {
      this.logger.error(
        "CognitiveOrchestrator",
        `Cognitive processing failed: ${error}`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
        {
          session_id: input.context.session_id,
          processing_mode: input.mode,
          metacognitive_flags: ["error"],
        }
      );

      this.logger.endTrace();
      throw new Error(`Cognitive processing failed: ${error}`);
    }
  }

  /**
   * Process input through the cognitive pipeline (generic process method)
   */
  async process(input: unknown): Promise<unknown> {
    if (typeof input === "object" && input !== null && "input" in input) {
      return this.think(input as CognitiveInput);
    }

    // Convert simple input to CognitiveInput
    const cognitiveInput: CognitiveInput = {
      input: String(input),
      context: { session_id: "default" },
      mode: this.currentProcessingMode,
      configuration: this.getDefaultConfiguration(),
    };

    return this.think(cognitiveInput);
  }

  /**
   * Set the current processing mode
   */
  setProcessingMode(mode: ProcessingMode): void {
    this.currentProcessingMode = mode;
    this.lastActivity = Date.now();
  }

  /**
   * Get status of a specific component
   */
  getComponentStatus(componentName: string): ComponentStatus {
    const component = this.getComponentByName(componentName);
    if (!component) {
      return {
        name: componentName,
        initialized: false,
        active: false,
        last_activity: 0,
        error: "Component not found",
      };
    }

    return component.getStatus();
  }

  /**
   * Get status of all components
   */
  getAllComponentStatuses(): Record<string, ComponentStatus> {
    const statuses: Record<string, ComponentStatus> = {};

    this.componentInitializationOrder.forEach((componentName) => {
      statuses[componentName] = this.getComponentStatus(componentName);
    });

    return statuses;
  }

  /**
   * Reset the orchestrator and all components
   */
  reset(): void {
    // Reset all components
    this.sensoryProcessor.reset();
    this.workingMemory.reset();
    this.dualProcessController.reset();
    this.memorySystem.reset();
    this.emotionalProcessor.reset();
    this.metacognitionModule.reset();
    this.predictiveProcessor.reset();
    this.stochasticProcessor.reset();

    // Clear sessions
    this.sessions.clear();

    this.lastActivity = Date.now();
  }

  /**
   * Get orchestrator status
   */
  getStatus(): ComponentStatus {
    const componentStatuses = this.getAllComponentStatuses();
    const allInitialized = Object.values(componentStatuses).every(
      (status) => status.initialized
    );
    const anyActive = Object.values(componentStatuses).some(
      (status) => status.active
    );
    const errors = Object.values(componentStatuses)
      .filter((status) => status.error)
      .map((status) => `${status.name}: ${status.error}`)
      .join("; ");

    return {
      name: "CognitiveOrchestrator",
      initialized: this.initialized && allInitialized,
      active: anyActive,
      last_activity: this.lastActivity,
      ...(errors && { error: errors }),
    };
  }

  // Private helper methods

  private getComponentByName(name: string): CognitiveComponent | undefined {
    const components: Record<string, CognitiveComponent> = {
      sensoryProcessor: this.sensoryProcessor,
      workingMemory: this.workingMemory,
      dualProcessController: this.dualProcessController,
      memorySystem: this.memorySystem,
      emotionalProcessor: this.emotionalProcessor,
      metacognitionModule: this.metacognitionModule,
      predictiveProcessor: this.predictiveProcessor,
      stochasticProcessor: this.stochasticProcessor,
    };

    return components[name];
  }

  private getOrCreateSession(
    sessionId: string,
    context: Context
  ): SessionState {
    let session = this.sessions.get(sessionId);

    if (!session) {
      session = {
        session_id: sessionId,
        created_at: Date.now(),
        last_activity: Date.now(),
        context: { ...context },
        processing_history: [],
        component_states: new Map(),
      };
      this.sessions.set(sessionId, session);
    }

    // Clean up expired sessions
    this.cleanupExpiredSessions();

    return session;
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const timeout = this.config.session_timeout_ms || 3600000;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.last_activity > timeout) {
        this.sessions.delete(sessionId);
      }
    }
  }

  private async applyStochasticProcessing(
    thoughtResult: ThoughtResult,
    _config: CognitiveConfig
  ): Promise<ThoughtResult> {
    // Convert thought result to neural signal for stochastic processing
    const confidenceSignal = thoughtResult.reasoning_path.map(
      (step) => step.confidence
    );

    const neuralSignal = {
      values: confidenceSignal,
      strength: thoughtResult.confidence,
      timestamp: Date.now(),
    };

    const stochasticOutput = await this.stochasticProcessor.process(
      neuralSignal
    );

    // Apply stochastic modifications to reasoning path
    const modifiedReasoningPath = thoughtResult.reasoning_path.map(
      (step, index) => ({
        ...step,
        confidence: Math.max(
          0.1,
          Math.min(
            1.0,
            stochasticOutput.processed_signal[index] || step.confidence
          )
        ),
        metadata: {
          ...step.metadata,
          stochastic_enhancement: stochasticOutput.enhancement_applied,
          noise_level: stochasticOutput.noise_level,
        },
      })
    );

    return {
      ...thoughtResult,
      reasoning_path: modifiedReasoningPath,
      confidence: Math.max(
        0.1,
        Math.min(
          1.0,
          thoughtResult.confidence +
            stochasticOutput.processing_metadata.noise_contribution * 0.1
        )
      ),
      metadata: {
        ...thoughtResult.metadata,
        stochastic_processing: stochasticOutput,
      },
    };
  }

  private async applyMetacognitiveAdjustments(
    thoughtResult: ThoughtResult,
    assessment: MetacognitiveAssessment
  ): Promise<ThoughtResult> {
    // Add metacognitive reasoning step
    const metacognitiveStep: ReasoningStep = {
      type: ReasoningType.METACOGNITIVE,
      content: `Metacognitive assessment: ${
        assessment.reasoning
      }. Quality score: ${assessment.quality_score.toFixed(2)}`,
      confidence: assessment.confidence,
      alternatives: assessment.suggestions.map((suggestion: string) => ({
        content: suggestion,
        confidence: 0.7,
        reasoning: "Metacognitive suggestion",
      })),
      metadata: {
        assessment: assessment,
        adjustments_applied: true,
      },
    };

    // Adjust overall confidence based on metacognitive assessment
    const adjustedConfidence = Math.max(
      0.1,
      Math.min(1.0, thoughtResult.confidence * assessment.quality_score)
    );

    return {
      ...thoughtResult,
      reasoning_path: [...thoughtResult.reasoning_path, metacognitiveStep],
      confidence: adjustedConfidence,
    };
  }

  private async storeExperience(
    input: CognitiveInput,
    result: ThoughtResult,
    _session: SessionState
  ): Promise<void> {
    const experience = {
      content: {
        input: input.input,
        output: result.content,
        reasoning: result.reasoning_path,
        confidence: result.confidence,
      },
      context: input.context,
      importance: this.computeExperienceImportance(result),
      emotional_tags: this.extractEmotionalTags(result.emotional_context),
    };

    await this.memorySystem.storeExperience(experience);
  }

  private computeExperienceImportance(result: ThoughtResult): number {
    // Compute importance based on confidence, complexity, and emotional intensity
    const confidenceWeight = result.confidence * 0.4;
    const complexityWeight =
      Math.min(1.0, result.reasoning_path.length / 10) * 0.3;
    const emotionalWeight = Math.abs(result.emotional_context.valence) * 0.3;

    return Math.max(
      0.1,
      Math.min(1.0, confidenceWeight + complexityWeight + emotionalWeight)
    );
  }

  private extractEmotionalTags(emotionalContext: EmotionalState): string[] {
    const tags: string[] = [];

    if (emotionalContext.valence > 0.3) tags.push("positive");
    if (emotionalContext.valence < -0.3) tags.push("negative");
    if (emotionalContext.arousal > 0.7) tags.push("high_arousal");
    if (emotionalContext.arousal < 0.3) tags.push("low_arousal");
    if (emotionalContext.dominance > 0.7) tags.push("confident");
    if (emotionalContext.dominance < 0.3) tags.push("uncertain");

    // Add specific emotions
    if (emotionalContext.specific_emotions) {
      emotionalContext.specific_emotions.forEach(
        (intensity: number, emotion: string) => {
          if (intensity > 0.5) {
            tags.push(emotion);
          }
        }
      );
    }

    return tags;
  }

  private updateSession(session: SessionState, result: ThoughtResult): void {
    session.last_activity = Date.now();
    session.processing_history.push(result);

    // Keep history limited
    if (session.processing_history.length > 50) {
      session.processing_history = session.processing_history.slice(-50);
    }
  }

  private finalizeThoughtResult(
    result: ThoughtResult,
    processingTime: number,
    memoryRetrievals: number,
    inputMode?: ProcessingMode
  ): ThoughtResult {
    const metadata: ThoughtMetadata = {
      ...result.metadata,
      processing_time_ms: processingTime,
      components_used: [
        "SensoryProcessor",
        "WorkingMemoryModule",
        "DualProcessController",
        "MemorySystem",
        "EmotionalProcessor",
        "MetacognitionModule",
        "PredictiveProcessor",
        "StochasticNeuralProcessor",
        "CognitiveOrchestrator",
      ],
      memory_retrievals: memoryRetrievals,
      system_mode: inputMode || this.currentProcessingMode,
    };

    return {
      ...result,
      metadata,
    };
  }

  private getDefaultConfiguration(): CognitiveConfig {
    return {
      default_mode: this.currentProcessingMode,
      enable_emotion: true,
      enable_metacognition: true,
      enable_prediction: true,
      working_memory_capacity: 7,
      episodic_memory_size: 1000,
      semantic_memory_size: 5000,
      consolidation_interval: 60000,
      noise_level: 0.1,
      temperature: 1.0,
      attention_threshold: 0.3,
      max_reasoning_depth: 10,
      timeout_ms: 30000,
      max_concurrent_sessions: 100,
      confidence_threshold: 0.6,
      system2_activation_threshold: 0.7,
      memory_retrieval_threshold: 0.3,
      brain_dir: "~/.brain",
    };
  }

  /**
   * Get current session information
   */
  getSessionInfo(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear a specific session
   */
  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    active_sessions: number;
    total_sessions_created: number;
    average_processing_time: number;
    component_statuses: Record<string, ComponentStatus>;
  } {
    const activeSessions = this.getActiveSessions();
    const totalProcessingTime = activeSessions.reduce(
      (sum, session) =>
        sum +
        session.processing_history.reduce(
          (sessionSum, result) =>
            sessionSum + result.metadata.processing_time_ms,
          0
        ),
      0
    );
    const totalProcessingCount = activeSessions.reduce(
      (sum, session) => sum + session.processing_history.length,
      0
    );

    return {
      active_sessions: activeSessions.length,
      total_sessions_created: this.sessions.size,
      average_processing_time:
        totalProcessingCount > 0
          ? totalProcessingTime / totalProcessingCount
          : 0,
      component_statuses: this.getAllComponentStatuses(),
    };
  }
}
