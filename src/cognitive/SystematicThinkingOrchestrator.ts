/**
 * Systematic Thinking Orchestrator
 *
 * Coordinates systematic thinking processes using various frameworks
 * for structured problem analysis and solution development.
 */

import {
  CognitiveComponent,
  ComponentStatus,
} from "../interfaces/cognitive.js";
import {
  AlternativeApproach,
  AnalysisStep,
  FrameworkRecommendation,
  FrameworkStep,
  IDynamicFrameworkSelector,
  IProblemAnalyzer,
  ISystematicThinkingOrchestrator,
  Problem,
  SystematicAnalysisResult,
  SystematicThinkingMode,
  ThinkingFramework,
} from "../interfaces/systematic-thinking.js";
import { Context } from "../types/core.js";
import { DynamicFrameworkSelector } from "./DynamicFrameworkSelector.js";
import { ProblemAnalyzer } from "./ProblemAnalyzer.js";

export class SystematicThinkingOrchestrator
  implements ISystematicThinkingOrchestrator, CognitiveComponent
{
  private frameworkSelector: IDynamicFrameworkSelector;
  private problemAnalyzer: IProblemAnalyzer;
  private initialized: boolean = false;

  constructor() {
    this.frameworkSelector = new DynamicFrameworkSelector();
    this.problemAnalyzer = new ProblemAnalyzer();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize components
    await this.frameworkSelector.initialize();
    await this.problemAnalyzer.initialize();

    this.initialized = true;
  }

  async analyzeSystematically(
    input: string,
    _mode: SystematicThinkingMode = "auto",
    context?: Context
  ): Promise<SystematicAnalysisResult> {
    const startTime = Date.now();

    if (!this.initialized) {
      await this.initialize();
    }

    // Step 1: Convert input to problem structure
    const problem = this.parseInputToProblem(input, context);

    // Step 2: Analyze problem structure
    const problemStructure = await this.problemAnalyzer.analyzeStructure(
      problem
    );

    // Step 3: Select optimal framework
    const frameworkRecommendation =
      await this.frameworkSelector.selectFramework(
        problem,
        context || { session_id: "default", domain: problem.domain }
      );

    // Step 4: Execute systematic analysis
    const analysisSteps = await this.executeSystematicAnalysis(
      problem,
      frameworkRecommendation.framework,
      context
    );

    // Step 5: Generate alternative approaches
    const alternativeApproaches = await this.generateAlternativeApproaches(
      problem,
      frameworkRecommendation,
      context
    );

    const processingTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms

    return {
      problem_structure: problemStructure,
      recommended_framework: frameworkRecommendation,
      analysis_steps: analysisSteps,
      confidence: this.calculateOverallConfidence(
        frameworkRecommendation.confidence,
        analysisSteps
      ),
      processing_time_ms: processingTime,
      alternative_approaches: alternativeApproaches,
    };
  }

  getAvailableFrameworks(): ThinkingFramework[] {
    return this.frameworkSelector.getAvailableFrameworks();
  }

  validateFramework(framework: ThinkingFramework): boolean {
    return (
      framework.type !== undefined &&
      framework.name !== undefined &&
      framework.steps !== undefined &&
      framework.steps.length > 0
    );
  }

  reset(): void {
    // Reset any internal state if needed
    // Currently no persistent state to reset
  }

  async process(input: unknown): Promise<unknown> {
    if (typeof input === "string") {
      return this.analyzeSystematically(input, "auto");
    }

    if (typeof input === "object" && input !== null && "input" in input) {
      const inputObj = input as {
        input: string;
        mode?: SystematicThinkingMode;
        context?: Context;
      };
      return this.analyzeSystematically(
        inputObj.input,
        inputObj.mode || "auto",
        inputObj.context
      );
    }

    throw new Error("Invalid input for SystematicThinkingOrchestrator");
  }

  getStatus(): ComponentStatus {
    return {
      name: "SystematicThinkingOrchestrator",
      initialized: this.initialized,
      active: this.initialized,
      last_activity: Date.now(),
    };
  }

  private parseInputToProblem(input: string, context?: Context): Problem {
    // Extract problem characteristics from input
    const complexity = this.estimateComplexity(input);
    const uncertainty = this.estimateUncertainty(input);
    const domain = this.identifyDomain(input, context);
    const constraints = this.extractConstraints(input);
    const stakeholders = this.identifyStakeholders(input);
    const timeSensitivity = this.assessTimeSensitivity(input, context);
    const resourceRequirements = this.identifyResourceRequirements(input);

    return {
      description: input,
      domain,
      complexity,
      uncertainty,
      constraints,
      stakeholders,
      time_sensitivity: timeSensitivity,
      resource_requirements: resourceRequirements,
    };
  }

  private estimateComplexity(input: string): number {
    // Simple heuristic based on input characteristics
    let complexity = 0.3; // Base complexity

    // Check for complexity indicators
    const complexityIndicators = [
      /multiple|various|several|many/i,
      /system|network|interconnected/i,
      /complex|complicated|intricate/i,
      /interdependent|interrelated/i,
      /stakeholder|user|customer/i,
      /scalable|architecture|microservices/i, // Added technical complexity indicators
      /platform|infrastructure|distributed/i,
      /availability|performance|reliability/i,
    ];

    for (const indicator of complexityIndicators) {
      if (indicator.test(input)) {
        complexity += 0.2; // Increased from 0.15
      }
    }

    // Length-based complexity
    if (input.length > 100) complexity += 0.1; // Lowered threshold
    if (input.length > 200) complexity += 0.1;
    if (input.length > 500) complexity += 0.1;

    return Math.min(complexity, 1.0);
  }

  private estimateUncertainty(input: string): number {
    let uncertainty = 0.2; // Base uncertainty

    // Check for uncertainty indicators
    const uncertaintyIndicators = [
      /uncertain|unclear|unknown/i,
      /might|could|possibly|perhaps/i,
      /estimate|approximate|roughly/i,
      /future|predict|forecast/i,
      /risk|challenge|problem/i,
    ];

    for (const indicator of uncertaintyIndicators) {
      if (indicator.test(input)) {
        uncertainty += 0.15;
      }
    }

    return Math.min(uncertainty, 1.0);
  }

  private identifyDomain(input: string, context?: Context): string {
    // Check context first
    if (context?.domain) {
      return context.domain as string;
    }

    // Domain keywords mapping
    const domainKeywords = {
      technology:
        /software|code|system|technical|IT|computer|database|performance|server|network|infrastructure|platform|optimize|scalable|microservices|architecture/i,
      business:
        /business|strategy|market|revenue|profit|customer|share|sales|growth/i,
      science: /research|experiment|hypothesis|scientific|study|theory/i,
      design: /design|user|interface|experience|creative/i,
      education: /learn|teach|student|education|training/i,
      healthcare: /health|medical|patient|treatment|diagnosis/i,
      finance: /money|financial|investment|budget|cost/i,
    };

    for (const [domain, pattern] of Object.entries(domainKeywords)) {
      if (pattern.test(input)) {
        return domain;
      }
    }

    return "general";
  }

  private extractConstraints(input: string): string[] {
    const constraints: string[] = [];

    // Time constraints
    if (/deadline|urgent|quickly|asap|time/i.test(input)) {
      constraints.push("time_constraint");
    }

    // Budget constraints
    if (/budget|cost|cheap|expensive|money/i.test(input)) {
      constraints.push("budget_constraint");
    }

    // Resource constraints
    if (/resource|limited|shortage|capacity/i.test(input)) {
      constraints.push("resource_constraint");
    }

    // Technical constraints
    if (/technical|technology|system|platform/i.test(input)) {
      constraints.push("technical_constraint");
    }

    return constraints;
  }

  private identifyStakeholders(input: string): string[] {
    const stakeholders: string[] = [];

    const stakeholderPatterns = {
      users: /user|customer|client|end.user/i,
      team: /team|colleague|developer|engineer/i,
      management: /manager|executive|leadership|boss/i,
      external: /partner|vendor|supplier|contractor/i,
    };

    for (const [stakeholder, pattern] of Object.entries(stakeholderPatterns)) {
      if (pattern.test(input)) {
        stakeholders.push(stakeholder);
      }
    }

    return stakeholders;
  }

  private assessTimeSensitivity(input: string, context?: Context): number {
    let sensitivity = 0.3; // Base sensitivity

    // Check context for urgency
    if (
      context &&
      "urgency" in context &&
      typeof context.urgency === "number"
    ) {
      sensitivity = Math.max(sensitivity, context.urgency);
    }

    const urgencyIndicators = [
      /urgent|asap|immediately|quickly/i,
      /deadline|due|schedule/i,
      /critical|important|priority/i,
      /performance|issues|problems/i, // Added performance-related urgency
    ];

    for (const indicator of urgencyIndicators) {
      if (indicator.test(input)) {
        sensitivity += 0.2;
      }
    }

    return Math.min(sensitivity, 1.0);
  }

  private identifyResourceRequirements(input: string): string[] {
    const resources: string[] = [];

    const resourcePatterns = {
      human_resources: /people|team|staff|developer|expert/i,
      technical_resources: /server|software|tool|platform|infrastructure/i,
      financial_resources: /budget|funding|investment|money/i,
      time_resources: /time|schedule|deadline|duration/i,
      information_resources: /data|information|research|knowledge/i,
    };

    for (const [resource, pattern] of Object.entries(resourcePatterns)) {
      if (pattern.test(input)) {
        resources.push(resource);
      }
    }

    return resources;
  }

  private async executeSystematicAnalysis(
    problem: Problem,
    framework: ThinkingFramework,
    _context?: Context
  ): Promise<AnalysisStep[]> {
    const steps: AnalysisStep[] = [];

    for (const frameworkStep of framework.steps) {
      const stepStartTime = Date.now();

      // Execute each framework step
      const stepResult = await this.executeFrameworkStep(
        frameworkStep,
        problem,
        _context,
        steps
      );

      const stepProcessingTime = Date.now() - stepStartTime;

      steps.push({
        step_name: frameworkStep.name,
        description: frameworkStep.description,
        inputs: stepResult.inputs,
        outputs: stepResult.outputs,
        confidence: stepResult.confidence,
        processing_time_ms: stepProcessingTime,
      });
    }

    return steps;
  }

  private async executeFrameworkStep(
    step: FrameworkStep,
    problem: Problem,
    _context?: Context,
    previousSteps: AnalysisStep[] = []
  ): Promise<{
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    confidence: number;
  }> {
    // This is a simplified implementation
    // In a full implementation, each framework would have specific step execution logic

    const inputs = {
      problem_description: problem.description,
      step_requirements: step.inputs,
      previous_outputs: previousSteps.map((s) => s.outputs),
    };

    const outputs = {
      step_result: `Executed ${
        step.name
      } for problem: ${problem.description.substring(0, 100)}...`,
      insights: this.generateStepInsights(step, problem),
      recommendations: this.generateStepRecommendations(step, problem),
    };

    const confidence = this.calculateStepConfidence(
      step,
      problem,
      previousSteps
    );

    return { inputs, outputs, confidence };
  }

  private generateStepInsights(
    step: FrameworkStep,
    problem: Problem
  ): string[] {
    // Generate contextual insights based on the step and problem
    const insights: string[] = [];

    if (step.name.toLowerCase().includes("define")) {
      insights.push(`Problem domain identified as: ${problem.domain}`);
      insights.push(
        `Complexity level: ${(problem.complexity * 100).toFixed(0)}%`
      );
    }

    if (step.name.toLowerCase().includes("analyze")) {
      insights.push(`Key constraints: ${problem.constraints.join(", ")}`);
      insights.push(
        `Stakeholders involved: ${problem.stakeholders.join(", ")}`
      );
    }

    if (step.name.toLowerCase().includes("solution")) {
      insights.push("Multiple solution paths identified");
      insights.push("Trade-offs between speed and quality considered");
    }

    return insights;
  }

  private generateStepRecommendations(
    _step: FrameworkStep,
    problem: Problem
  ): string[] {
    const recommendations: string[] = [];

    if (problem.time_sensitivity > 0.7) {
      recommendations.push("Consider rapid prototyping approach");
      recommendations.push("Focus on minimum viable solution first");
    }

    if (problem.complexity > 0.7) {
      recommendations.push("Break down into smaller sub-problems");
      recommendations.push("Consider iterative approach");
    }

    if (problem.uncertainty > 0.7) {
      recommendations.push("Gather additional information before proceeding");
      recommendations.push("Plan for multiple scenarios");
    }

    return recommendations;
  }

  private calculateStepConfidence(
    _step: FrameworkStep,
    problem: Problem,
    previousSteps: AnalysisStep[]
  ): number {
    let confidence = 0.7; // Base confidence

    // Adjust based on problem characteristics
    if (problem.complexity < 0.5) confidence += 0.1;
    if (problem.uncertainty < 0.5) confidence += 0.1;

    // Adjust based on previous steps
    if (previousSteps.length > 0) {
      const avgPreviousConfidence =
        previousSteps.reduce((sum, s) => sum + s.confidence, 0) /
        previousSteps.length;
      confidence = (confidence + avgPreviousConfidence) / 2;
    }

    return Math.min(confidence, 1.0);
  }

  private async generateAlternativeApproaches(
    _problem: Problem,
    primaryRecommendation: FrameworkRecommendation,
    _context?: Context
  ): Promise<AlternativeApproach[]> {
    const alternatives: AlternativeApproach[] = [];

    // Get all available frameworks
    const allFrameworks = this.getAvailableFrameworks();

    // Select top 2-3 alternative frameworks
    for (const framework of allFrameworks.slice(0, 3)) {
      if (framework.type !== primaryRecommendation.framework.type) {
        alternatives.push({
          framework,
          expected_outcome: `Alternative approach using ${framework.name}`,
          trade_offs: [
            "Different time investment",
            "Alternative skill requirements",
            "Different risk profile",
          ],
          confidence: 0.6,
        });
      }
    }

    return alternatives;
  }

  private calculateOverallConfidence(
    frameworkConfidence: number,
    analysisSteps: AnalysisStep[]
  ): number {
    if (analysisSteps.length === 0) {
      return frameworkConfidence;
    }

    const avgStepConfidence =
      analysisSteps.reduce((sum, step) => sum + step.confidence, 0) /
      analysisSteps.length;

    return (frameworkConfidence + avgStepConfidence) / 2;
  }
}
