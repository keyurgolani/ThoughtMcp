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
    if (this.frameworkSelector?.initialize) {
      await this.frameworkSelector.initialize();
    }
    if (this.problemAnalyzer?.initialize) {
      await this.problemAnalyzer.initialize();
    }

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
        context ?? { session_id: "default", domain: problem.domain }
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
        inputObj.mode ?? "auto",
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
      return context.domain;
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
    // Generate contextual, actionable insights based on the step and problem
    const insights: string[] = [];
    const stepName = step.name.toLowerCase();
    const description = problem.description.toLowerCase();

    // Define/Clarify steps
    if (stepName.includes("define") ?? stepName.includes("clarify")) {
      insights.push(
        `This is a ${problem.domain} problem with ${(
          problem.complexity * 100
        ).toFixed(0)}% complexity`
      );

      if (problem.constraints.length > 0) {
        insights.push(
          `Key constraints to work within: ${problem.constraints.join(", ")}`
        );
      }

      if (problem.time_sensitivity > 0.7) {
        insights.push(
          "Time pressure detected - consider rapid iteration approaches"
        );
      }

      if (problem.stakeholders.length > 2) {
        insights.push(
          "Multiple stakeholders involved - alignment and communication will be critical"
        );
      }
    }

    // Observe/Gather/Research steps
    if (
      stepName.includes("observe") ?? stepName.includes("gather") ?? stepName.includes("research")
    ) {
      if (
        description.includes("performance") ?? description.includes("slow") ?? description.includes("issue")
      ) {
        insights.push(
          "Focus data collection on performance metrics, user behavior patterns, and system bottlenecks"
        );
      }

      if (description.includes("user") ?? description.includes("customer")) {
        insights.push(
          "Prioritize direct user feedback, usage analytics, and behavioral data"
        );
      }

      if (problem.uncertainty > 0.6) {
        insights.push(
          "High uncertainty detected - gather data from multiple sources to reduce risk"
        );
      }
    }

    // Analyze/Evaluate steps
    if (stepName.includes("analyze") ?? stepName.includes("evaluate")) {
      if (problem.complexity > 0.7) {
        insights.push(
          "Complex problem - break analysis into smaller, manageable components"
        );
      }

      if (
        description.includes("team") ?? description.includes("organization")
      ) {
        insights.push(
          "Consider both technical and human factors in your analysis"
        );
      }

      if (problem.constraints.includes("budget_constraint")) {
        insights.push(
          "Budget constraints identified - prioritize cost-effective solutions"
        );
      }
    }

    // Solution/Design/Create steps
    if (
      stepName.includes("solution") ?? stepName.includes("design") ?? stepName.includes("create") ?? stepName.includes("ideate")
    ) {
      if (problem.time_sensitivity > 0.6) {
        insights.push(
          "Time-sensitive situation - consider MVP approach and iterative improvements"
        );
      }

      if (description.includes("scale") ?? description.includes("growth")) {
        insights.push(
          "Scalability is important - design solutions that can grow with demand"
        );
      }

      if (problem.stakeholders.length > 1) {
        insights.push(
          "Multiple stakeholders - ensure solutions address different user needs"
        );
      }

      insights.push(
        "Consider both immediate fixes and long-term strategic improvements"
      );
    }

    // Test/Validate/Implement steps
    if (
      stepName.includes("test") ?? stepName.includes("validate") ?? stepName.includes("implement")
    ) {
      if (description.includes("production") ?? description.includes("live")) {
        insights.push(
          "Production environment - plan for gradual rollout and rollback procedures"
        );
      }

      if (problem.uncertainty > 0.5) {
        insights.push(
          "Uncertainty present - start with small-scale tests before full implementation"
        );
      }

      insights.push(
        "Define clear success metrics and monitoring before implementation"
      );
    }

    // Add domain-specific insights
    if (problem.domain === "technology") {
      insights.push(
        "Technical solution - consider maintainability, security, and performance implications"
      );
    } else if (problem.domain === "business") {
      insights.push(
        "Business solution - evaluate ROI, market impact, and competitive advantages"
      );
    }

    return insights.length > 0
      ? insights
      : ["Systematic approach will provide structured analysis for this step"];
  }

  private generateStepRecommendations(
    step: FrameworkStep,
    problem: Problem
  ): string[] {
    const recommendations: string[] = [];
    const stepName = step.name.toLowerCase();
    const description = problem.description.toLowerCase();

    // Time-sensitive recommendations
    if (problem.time_sensitivity > 0.7) {
      if (stepName.includes("solution") ?? stepName.includes("design")) {
        recommendations.push(
          "Time pressure: Start with the simplest solution that addresses the core problem"
        );
        recommendations.push(
          "Plan for quick wins first, then iterate with improvements"
        );
      } else if (stepName.includes("test") ?? stepName.includes("validate")) {
        recommendations.push(
          "Fast validation: Use A/B tests or user interviews for quick feedback"
        );
      } else {
        recommendations.push(
          "Time constraint: Focus on the most critical aspects of this step"
        );
      }
    }

    // Complexity management recommendations
    if (problem.complexity > 0.7) {
      if (stepName.includes("analyze") ?? stepName.includes("define")) {
        recommendations.push(
          "High complexity: Use visual tools like diagrams or flowcharts to map relationships"
        );
        recommendations.push(
          "Break this complex problem into 3-5 smaller, manageable pieces"
        );
      } else if (stepName.includes("solution")) {
        recommendations.push(
          "Complex solution space: Consider modular approaches that can be implemented incrementally"
        );
      } else {
        recommendations.push(
          "Manage complexity: Focus on one aspect at a time to avoid overwhelm"
        );
      }
    }

    // Uncertainty management recommendations
    if (problem.uncertainty > 0.7) {
      if (stepName.includes("gather") ?? stepName.includes("research")) {
        recommendations.push(
          "High uncertainty: Prioritize gathering data that reduces the biggest unknowns"
        );
        recommendations.push(
          "Look for leading indicators and early signals of trends"
        );
      } else if (stepName.includes("solution") ?? stepName.includes("plan")) {
        recommendations.push(
          "Uncertain environment: Design flexible solutions that can adapt to changing conditions"
        );
        recommendations.push(
          "Create contingency plans for the most likely alternative scenarios"
        );
      } else {
        recommendations.push(
          "Handle uncertainty: Document assumptions and plan to validate them"
        );
      }
    }

    // Stakeholder-specific recommendations
    if (problem.stakeholders.length > 2) {
      if (stepName.includes("define") ?? stepName.includes("clarify")) {
        recommendations.push(
          "Multiple stakeholders: Ensure all parties agree on problem definition before proceeding"
        );
      } else if (stepName.includes("solution")) {
        recommendations.push(
          "Stakeholder alignment: Consider how each solution affects different user groups"
        );
      } else {
        recommendations.push(
          "Communication: Keep all stakeholders informed of progress and findings"
        );
      }
    }

    // Domain-specific recommendations
    if (problem.domain === "technology") {
      if (stepName.includes("solution") ?? stepName.includes("design")) {
        recommendations.push(
          "Technical solution: Consider scalability, maintainability, and security from the start"
        );
      } else if (stepName.includes("test")) {
        recommendations.push(
          "Technical validation: Include performance testing and edge case scenarios"
        );
      }
    } else if (problem.domain === "business") {
      if (stepName.includes("analyze")) {
        recommendations.push(
          "Business analysis: Include market research and competitive analysis"
        );
      } else if (stepName.includes("solution")) {
        recommendations.push(
          "Business solution: Evaluate ROI and alignment with strategic objectives"
        );
      }
    }

    // Constraint-specific recommendations
    if (problem.constraints.includes("budget_constraint")) {
      recommendations.push(
        "Budget constraint: Prioritize high-impact, low-cost approaches"
      );
    }

    if (problem.constraints.includes("resource_constraint")) {
      recommendations.push(
        "Resource limitation: Focus on solutions that leverage existing capabilities"
      );
    }

    // Performance and quality recommendations
    if (description.includes("performance") ?? description.includes("slow")) {
      recommendations.push(
        "Performance focus: Measure current baselines before implementing changes"
      );
    }

    if (description.includes("quality") ?? description.includes("error")) {
      recommendations.push(
        "Quality improvement: Implement monitoring and feedback loops"
      );
    }

    // Ensure we always have at least one recommendation
    if (recommendations.length === 0) {
      recommendations.push(
        `Execute this ${step.name} step systematically, documenting findings for the next phase`
      );
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
