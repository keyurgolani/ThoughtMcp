/**
 * Base Framework Abstract Class
 *
 * Provides common execution logic, step management, progress tracking,
 * adaptation mechanisms, and error handling for all thinking frameworks.
 */

import type {
  Context,
  ExecutionProgress,
  FrameworkResult,
  FrameworkStep,
  Obstacle,
  Problem,
  ProblemCharacteristics,
  StepResult,
  ThinkingFramework,
} from "./types.js";

/**
 * Execution state for framework processing
 */
interface ExecutionState {
  stepResults: StepResult[];
  allInsights: string[];
  allObstacles: Obstacle[];
  progress: ExecutionProgress;
}

/**
 * Abstract base class for all thinking frameworks
 *
 * Implements the ThinkingFramework interface with common execution logic.
 * Subclasses must implement createSteps() to define framework-specific steps.
 */
export abstract class BaseFramework implements ThinkingFramework {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly bestSuitedFor: ProblemCharacteristics[];
  public readonly steps: FrameworkStep[];
  public readonly expectedDuration?: number;
  public readonly version?: string;
  public readonly metadata?: Record<string, unknown>;

  constructor(config: {
    id: string;
    name: string;
    description: string;
    bestSuitedFor: ProblemCharacteristics[];
    expectedDuration?: number;
    version?: string;
    metadata?: Record<string, unknown>;
  }) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.bestSuitedFor = config.bestSuitedFor;
    this.expectedDuration = config.expectedDuration;
    this.version = config.version;
    this.metadata = config.metadata;
    this.steps = this.createSteps();
  }

  protected abstract createSteps(): FrameworkStep[];

  public async execute(problem: Problem, context: Context): Promise<FrameworkResult> {
    const startTime = Date.now();
    const state: ExecutionState = {
      stepResults: [],
      allInsights: [],
      allObstacles: [],
      progress: {
        currentStep: this.steps[0]?.id || "",
        completedSteps: [],
        totalSteps: this.steps.length,
        progressPercentage: 0,
        obstacles: [],
        adaptations: [],
      },
    };

    try {
      await this.executeSteps(problem, context, state);

      const overallConfidence =
        state.stepResults.reduce((sum, result) => sum + result.confidence, 0) /
        state.stepResults.length;

      return {
        frameworkId: this.id,
        frameworkName: this.name,
        success: true,
        conclusion: this.generateConclusion(state.stepResults),
        steps: state.stepResults,
        insights: state.allInsights,
        confidence: overallConfidence,
        processingTime: Date.now() - startTime,
        obstacles: state.allObstacles,
        adaptations: [],
        progress: state.progress,
        timestamp: new Date(),
      };
    } catch (error) {
      const frameworkError = error instanceof Error ? error : new Error(String(error));
      return {
        frameworkId: this.id,
        frameworkName: this.name,
        success: false,
        conclusion: "",
        steps: state.stepResults,
        insights: state.allInsights,
        confidence: 0,
        processingTime: Date.now() - startTime,
        obstacles: state.allObstacles,
        adaptations: [],
        progress: state.progress,
        error: frameworkError,
        timestamp: new Date(),
      };
    }
  }

  private async executeSteps(
    problem: Problem,
    context: Context,
    state: ExecutionState
  ): Promise<void> {
    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      state.progress.currentStep = step.id;
      state.progress.progressPercentage = Math.round((i / this.steps.length) * 100);

      try {
        await this.executeStep(step, problem, context, state);
        state.progress.completedSteps.push(step.id);
        state.progress.progressPercentage = Math.round(((i + 1) / this.steps.length) * 100);
      } catch (error) {
        this.handleStepError(step, error, state);
        if (!step.optional) {
          throw error;
        }
      }
    }
  }

  private async executeStep(
    step: FrameworkStep,
    problem: Problem,
    context: Context,
    state: ExecutionState
  ): Promise<void> {
    const validation = await step.validate(context, state.stepResults);
    if (!validation.valid) {
      const obstacle: Obstacle = {
        id: `validation-${step.id}-${Date.now()}`,
        type: "missing_information",
        description: `Step validation failed: ${validation.issues.join(", ")}`,
        severity: "medium",
        detectedAt: new Date(),
        stepId: step.id,
      };
      state.allObstacles.push(obstacle);
      state.progress.obstacles.push(obstacle);
      await this.adapt(problem, state.progress);
    }

    const stepResult = await step.execute(context, state.stepResults);
    state.stepResults.push(stepResult);

    if (stepResult.insights) {
      state.allInsights.push(...stepResult.insights);
    }
    if (stepResult.obstacles) {
      state.allObstacles.push(...stepResult.obstacles);
      state.progress.obstacles.push(...stepResult.obstacles);
    }
  }

  private handleStepError(step: FrameworkStep, error: unknown, state: ExecutionState): void {
    const stepError = error instanceof Error ? error : new Error(String(error));
    state.stepResults.push({
      stepId: step.id,
      success: false,
      output: "",
      insights: [],
      processingTime: 0,
      confidence: 0,
      error: stepError,
    });

    const obstacle: Obstacle = {
      id: `error-${step.id}-${Date.now()}`,
      type: "other",
      description: `Step execution failed: ${stepError.message}`,
      severity: "high",
      detectedAt: new Date(),
      stepId: step.id,
    };
    state.allObstacles.push(obstacle);
    state.progress.obstacles.push(obstacle);
  }

  public async adapt(_problem: Problem, _progress: ExecutionProgress): Promise<void> {
    // Default implementation: no adaptation
  }

  protected generateConclusion(stepResults: StepResult[]): string {
    const successfulSteps = stepResults.filter((result) => result.success);

    if (successfulSteps.length === 0) {
      return "Framework execution completed with no successful steps.";
    }

    const outputs = successfulSteps
      .map((result) => `${result.stepId}: ${result.output}`)
      .join("\n\n");

    return `Framework execution completed successfully.\n\n${outputs}`;
  }
}
