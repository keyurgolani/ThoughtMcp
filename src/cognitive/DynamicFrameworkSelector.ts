/**
 * Dynamic Framework Selector
 *
 * Automatically selects the most appropriate thinking framework
 * based on problem characteristics and context.
 */

import {
  FrameworkRecommendation,
  FrameworkStep,
  IDynamicFrameworkSelector,
  Problem,
  ProblemCharacteristics,
  ThinkingFramework,
  ThinkingFrameworkType,
} from "../interfaces/systematic-thinking.js";
import { Context } from "../types/core.js";

export class DynamicFrameworkSelector implements IDynamicFrameworkSelector {
  private frameworks: Map<ThinkingFrameworkType, ThinkingFramework>;

  constructor() {
    this.frameworks = new Map();
    this.initializeFrameworks();
  }

  async initialize(): Promise<void> {
    // Framework selector is initialized in constructor
  }

  async selectFramework(
    problem: Problem,
    _context: Context
  ): Promise<FrameworkRecommendation> {
    // Analyze problem characteristics
    const characteristics = this.analyzeProblemCharacteristics(problem);

    // Evaluate all frameworks
    const frameworkScores = new Map<ThinkingFramework, number>();

    for (const framework of this.frameworks.values()) {
      const score = this.evaluateFrameworkFit(framework, characteristics);
      frameworkScores.set(framework, score);
    }

    // Sort frameworks by score
    const sortedFrameworks = Array.from(frameworkScores.entries()).sort(
      ([, a], [, b]) => b - a
    );

    const bestFramework = sortedFrameworks[0][0];
    const bestScore = sortedFrameworks[0][1];

    // Get alternative frameworks (top 3 excluding the best)
    const alternatives = sortedFrameworks
      .slice(1, 4)
      .map(([framework]) => framework);

    return {
      framework: bestFramework,
      confidence: bestScore,
      reasoning: this.generateRecommendationReasoning(
        bestFramework,
        characteristics,
        bestScore
      ),
      alternative_frameworks: alternatives,
    };
  }

  analyzeProblemCharacteristics(problem: Problem): ProblemCharacteristics {
    return {
      is_well_defined: this.isWellDefined(problem),
      has_multiple_solutions: this.hasMultipleSolutions(problem),
      requires_creativity: this.requiresCreativity(problem),
      involves_systems: this.involvesSystemsThinking(problem),
      needs_evidence: this.needsEvidence(problem),
      has_causal_elements: this.hasCausalElements(problem),
      involves_scenarios: this.involvesScenarios(problem),
      requires_root_cause: this.requiresRootCause(problem),
    };
  }

  evaluateFrameworkFit(
    framework: ThinkingFramework,
    characteristics: ProblemCharacteristics
  ): number {
    let score = 0.5; // Base score

    // Framework-specific scoring logic
    switch (framework.type) {
      case "scientific_method":
        if (characteristics.needs_evidence) score += 0.3;
        if (characteristics.is_well_defined) score += 0.2;
        if (characteristics.has_causal_elements) score += 0.2;
        break;

      case "design_thinking":
        if (characteristics.requires_creativity) score += 0.3;
        if (characteristics.has_multiple_solutions) score += 0.2;
        if (!characteristics.is_well_defined) score += 0.2;
        break;

      case "systems_thinking":
        if (characteristics.involves_systems) score += 0.4;
        if (characteristics.has_causal_elements) score += 0.2;
        if (characteristics.has_multiple_solutions) score += 0.1;
        break;

      case "critical_thinking":
        if (characteristics.needs_evidence) score += 0.2;
        if (characteristics.has_multiple_solutions) score += 0.2;
        if (characteristics.is_well_defined) score += 0.1;
        break;

      case "creative_problem_solving":
        if (characteristics.requires_creativity) score += 0.4;
        if (!characteristics.is_well_defined) score += 0.2;
        if (characteristics.has_multiple_solutions) score += 0.2;
        break;

      case "root_cause_analysis":
        if (characteristics.requires_root_cause) score += 0.5; // Increased priority
        if (characteristics.has_causal_elements) score += 0.3;
        if (characteristics.is_well_defined) score += 0.1;
        break;

      case "first_principles":
        if (characteristics.is_well_defined) score += 0.2;
        if (characteristics.needs_evidence) score += 0.2;
        if (characteristics.requires_creativity) score += 0.1;
        break;

      case "scenario_planning":
        if (characteristics.involves_scenarios) score += 0.4;
        // Reduce score if root cause analysis is also needed
        if (characteristics.requires_root_cause) score -= 0.2;
        if (!characteristics.is_well_defined) score += 0.2;
        if (characteristics.has_multiple_solutions) score += 0.2;
        break;
    }

    return Math.min(score, 1.0);
  }

  createHybridFramework(
    primary: ThinkingFramework,
    supporting: ThinkingFramework[]
  ): ThinkingFramework {
    const hybridSteps: FrameworkStep[] = [...primary.steps];

    // Add selected steps from supporting frameworks
    for (const framework of supporting) {
      // Add the most relevant steps (first 2) from each supporting framework
      hybridSteps.push(...framework.steps.slice(0, 2));
    }

    return {
      type: primary.type,
      name: `Hybrid: ${primary.name} + ${supporting.length} others`,
      description: `Combined approach using ${
        primary.name
      } as primary framework with elements from ${supporting
        .map((f) => f.name)
        .join(", ")}`,
      steps: hybridSteps,
      applicability_score: primary.applicability_score,
      strengths: [
        ...primary.strengths,
        "Combines multiple perspectives",
        "Comprehensive approach",
      ],
      limitations: [
        "More complex to execute",
        "Requires more time",
        "May lack focus",
      ],
    };
  }

  getAvailableFrameworks(): ThinkingFramework[] {
    return Array.from(this.frameworks.values());
  }

  private initializeFrameworks(): void {
    // Scientific Method Framework
    this.frameworks.set("scientific_method", {
      type: "scientific_method",
      name: "Scientific Method",
      description:
        "Systematic approach using observation, hypothesis, and experimentation",
      steps: [
        {
          name: "Observe",
          description: "Gather observations and identify patterns",
          inputs: ["problem_statement", "available_data"],
          outputs: ["observations", "patterns"],
          methods: ["data_collection", "pattern_recognition"],
        },
        {
          name: "Hypothesize",
          description: "Form testable hypotheses",
          inputs: ["observations", "patterns"],
          outputs: ["hypotheses", "predictions"],
          methods: ["hypothesis_formation", "prediction_generation"],
        },
        {
          name: "Test",
          description: "Design and conduct tests",
          inputs: ["hypotheses", "predictions"],
          outputs: ["test_results", "evidence"],
          methods: ["experiment_design", "data_analysis"],
        },
        {
          name: "Conclude",
          description: "Draw conclusions and refine understanding",
          inputs: ["test_results", "evidence"],
          outputs: ["conclusions", "refined_theory"],
          methods: ["statistical_analysis", "theory_refinement"],
        },
      ],
      applicability_score: 0.8,
      strengths: ["Rigorous", "Evidence-based", "Reproducible"],
      limitations: ["Time-intensive", "Requires testable hypotheses"],
    });

    // Design Thinking Framework
    this.frameworks.set("design_thinking", {
      type: "design_thinking",
      name: "Design Thinking",
      description: "Human-centered approach to innovation and problem-solving",
      steps: [
        {
          name: "Empathize",
          description: "Understand the user and their needs",
          inputs: ["problem_context", "user_information"],
          outputs: ["user_insights", "empathy_map"],
          methods: ["user_interviews", "observation", "empathy_mapping"],
        },
        {
          name: "Define",
          description: "Define the core problem",
          inputs: ["user_insights", "empathy_map"],
          outputs: ["problem_statement", "point_of_view"],
          methods: ["problem_framing", "needs_analysis"],
        },
        {
          name: "Ideate",
          description: "Generate creative solutions",
          inputs: ["problem_statement", "point_of_view"],
          outputs: ["ideas", "solution_concepts"],
          methods: ["brainstorming", "mind_mapping", "crazy_8s"],
        },
        {
          name: "Prototype",
          description: "Build testable representations",
          inputs: ["ideas", "solution_concepts"],
          outputs: ["prototypes", "mockups"],
          methods: ["rapid_prototyping", "wireframing", "storyboarding"],
        },
        {
          name: "Test",
          description: "Test with users and iterate",
          inputs: ["prototypes", "mockups"],
          outputs: ["feedback", "insights", "iterations"],
          methods: ["user_testing", "feedback_collection", "iteration"],
        },
      ],
      applicability_score: 0.9,
      strengths: ["User-centered", "Creative", "Iterative"],
      limitations: ["Subjective", "Resource-intensive"],
    });

    // Systems Thinking Framework
    this.frameworks.set("systems_thinking", {
      type: "systems_thinking",
      name: "Systems Thinking",
      description:
        "Holistic approach to understanding complex systems and relationships",
      steps: [
        {
          name: "Map the System",
          description: "Identify system components and boundaries",
          inputs: ["problem_context", "stakeholders"],
          outputs: ["system_map", "boundaries"],
          methods: ["system_mapping", "stakeholder_analysis"],
        },
        {
          name: "Identify Relationships",
          description: "Map connections and feedback loops",
          inputs: ["system_map", "boundaries"],
          outputs: ["relationships", "feedback_loops"],
          methods: ["relationship_mapping", "causal_loop_diagrams"],
        },
        {
          name: "Find Leverage Points",
          description: "Identify high-impact intervention points",
          inputs: ["relationships", "feedback_loops"],
          outputs: ["leverage_points", "intervention_strategies"],
          methods: ["leverage_analysis", "systems_archetypes"],
        },
        {
          name: "Design Interventions",
          description: "Create systemic solutions",
          inputs: ["leverage_points", "intervention_strategies"],
          outputs: ["system_interventions", "implementation_plan"],
          methods: ["intervention_design", "systems_modeling"],
        },
      ],
      applicability_score: 0.8,
      strengths: ["Holistic", "Addresses root causes", "Long-term perspective"],
      limitations: ["Complex", "Requires systems knowledge"],
    });

    // Critical Thinking Framework
    this.frameworks.set("critical_thinking", {
      type: "critical_thinking",
      name: "Critical Thinking",
      description:
        "Analytical approach to evaluating information and arguments",
      steps: [
        {
          name: "Clarify",
          description: "Clarify the problem and key terms",
          inputs: ["problem_statement", "context"],
          outputs: ["clarified_problem", "key_definitions"],
          methods: ["problem_clarification", "definition_analysis"],
        },
        {
          name: "Gather Information",
          description: "Collect relevant and reliable information",
          inputs: ["clarified_problem", "key_definitions"],
          outputs: ["information", "sources"],
          methods: ["research", "source_evaluation", "fact_checking"],
        },
        {
          name: "Analyze Arguments",
          description: "Evaluate reasoning and evidence",
          inputs: ["information", "sources"],
          outputs: ["argument_analysis", "evidence_evaluation"],
          methods: [
            "logical_analysis",
            "bias_detection",
            "fallacy_identification",
          ],
        },
        {
          name: "Draw Conclusions",
          description: "Form well-reasoned conclusions",
          inputs: ["argument_analysis", "evidence_evaluation"],
          outputs: ["conclusions", "recommendations"],
          methods: ["logical_reasoning", "synthesis", "decision_making"],
        },
      ],
      applicability_score: 0.7,
      strengths: ["Logical", "Evidence-based", "Reduces bias"],
      limitations: ["Can be slow", "May miss creative solutions"],
    });

    // Creative Problem Solving Framework
    this.frameworks.set("creative_problem_solving", {
      type: "creative_problem_solving",
      name: "Creative Problem Solving",
      description: "Structured approach to generating innovative solutions",
      steps: [
        {
          name: "Clarify",
          description: "Understand and reframe the challenge",
          inputs: ["initial_problem", "context"],
          outputs: ["reframed_problem", "challenge_statement"],
          methods: ["problem_reframing", "why_laddering", "how_might_we"],
        },
        {
          name: "Ideate",
          description: "Generate many creative ideas",
          inputs: ["reframed_problem", "challenge_statement"],
          outputs: ["ideas", "creative_concepts"],
          methods: ["brainstorming", "scamper", "random_word", "analogies"],
        },
        {
          name: "Develop",
          description: "Strengthen and refine promising ideas",
          inputs: ["ideas", "creative_concepts"],
          outputs: ["developed_solutions", "refined_concepts"],
          methods: [
            "idea_development",
            "concept_refinement",
            "feasibility_analysis",
          ],
        },
        {
          name: "Implement",
          description: "Plan and execute the solution",
          inputs: ["developed_solutions", "refined_concepts"],
          outputs: ["implementation_plan", "action_steps"],
          methods: [
            "action_planning",
            "resource_allocation",
            "timeline_creation",
          ],
        },
      ],
      applicability_score: 0.8,
      strengths: ["Innovative", "Flexible", "Generates many options"],
      limitations: ["May lack structure", "Ideas need validation"],
    });

    // Root Cause Analysis Framework
    this.frameworks.set("root_cause_analysis", {
      type: "root_cause_analysis",
      name: "Root Cause Analysis",
      description:
        "Systematic approach to identifying underlying causes of problems",
      steps: [
        {
          name: "Define the Problem",
          description: "Clearly define what went wrong",
          inputs: ["problem_symptoms", "context"],
          outputs: ["problem_definition", "scope"],
          methods: ["problem_definition", "scope_setting"],
        },
        {
          name: "Collect Data",
          description: "Gather relevant information about the problem",
          inputs: ["problem_definition", "scope"],
          outputs: ["data", "evidence", "timeline"],
          methods: [
            "data_collection",
            "timeline_analysis",
            "evidence_gathering",
          ],
        },
        {
          name: "Identify Causes",
          description: "Use systematic methods to find root causes",
          inputs: ["data", "evidence", "timeline"],
          outputs: ["potential_causes", "cause_categories"],
          methods: ["5_whys", "fishbone_diagram", "fault_tree_analysis"],
        },
        {
          name: "Implement Solutions",
          description: "Address root causes with targeted solutions",
          inputs: ["potential_causes", "cause_categories"],
          outputs: ["solutions", "prevention_measures"],
          methods: [
            "solution_design",
            "prevention_planning",
            "monitoring_setup",
          ],
        },
      ],
      applicability_score: 0.8,
      strengths: ["Addresses root causes", "Prevents recurrence", "Systematic"],
      limitations: ["Reactive approach", "May be time-intensive"],
    });

    // First Principles Framework
    this.frameworks.set("first_principles", {
      type: "first_principles",
      name: "First Principles Thinking",
      description:
        "Break down complex problems to fundamental truths and build up from there",
      steps: [
        {
          name: "Identify Assumptions",
          description: "List all assumptions about the problem",
          inputs: ["problem_statement", "current_approach"],
          outputs: ["assumptions_list", "beliefs"],
          methods: ["assumption_identification", "belief_examination"],
        },
        {
          name: "Break Down to Fundamentals",
          description: "Reduce to basic, undeniable truths",
          inputs: ["assumptions_list", "beliefs"],
          outputs: ["fundamental_truths", "basic_principles"],
          methods: [
            "deconstruction",
            "truth_verification",
            "principle_extraction",
          ],
        },
        {
          name: "Reason Up from Basics",
          description: "Build new understanding from fundamentals",
          inputs: ["fundamental_truths", "basic_principles"],
          outputs: ["new_insights", "alternative_approaches"],
          methods: [
            "logical_construction",
            "principle_application",
            "synthesis",
          ],
        },
        {
          name: "Create Novel Solutions",
          description: "Develop innovative solutions based on first principles",
          inputs: ["new_insights", "alternative_approaches"],
          outputs: ["novel_solutions", "breakthrough_ideas"],
          methods: [
            "solution_creation",
            "innovation_development",
            "validation",
          ],
        },
      ],
      applicability_score: 0.7,
      strengths: [
        "Innovative",
        "Challenges assumptions",
        "Fundamental understanding",
      ],
      limitations: [
        "Time-intensive",
        "Requires deep thinking",
        "May miss practical constraints",
      ],
    });

    // Scenario Planning Framework
    this.frameworks.set("scenario_planning", {
      type: "scenario_planning",
      name: "Scenario Planning",
      description:
        "Explore multiple possible futures to inform decision-making",
      steps: [
        {
          name: "Define Scope",
          description: "Set the time horizon and scope of scenarios",
          inputs: ["planning_context", "decision_requirements"],
          outputs: ["scope_definition", "time_horizon"],
          methods: ["scope_setting", "horizon_definition"],
        },
        {
          name: "Identify Key Factors",
          description: "Determine critical uncertainties and driving forces",
          inputs: ["scope_definition", "time_horizon"],
          outputs: ["key_factors", "uncertainties"],
          methods: [
            "factor_identification",
            "uncertainty_analysis",
            "driving_forces",
          ],
        },
        {
          name: "Develop Scenarios",
          description: "Create plausible alternative futures",
          inputs: ["key_factors", "uncertainties"],
          outputs: ["scenarios", "storylines"],
          methods: [
            "scenario_construction",
            "storyline_development",
            "consistency_checking",
          ],
        },
        {
          name: "Assess Implications",
          description: "Analyze implications and develop strategies",
          inputs: ["scenarios", "storylines"],
          outputs: ["implications", "strategies", "contingency_plans"],
          methods: [
            "impact_analysis",
            "strategy_development",
            "contingency_planning",
          ],
        },
      ],
      applicability_score: 0.7,
      strengths: [
        "Handles uncertainty",
        "Strategic perspective",
        "Prepares for multiple futures",
      ],
      limitations: [
        "Speculative",
        "Resource-intensive",
        "May create analysis paralysis",
      ],
    });
  }

  private isWellDefined(problem: Problem): boolean {
    const description = problem.description.toLowerCase();

    // Well-defined problems have clear objectives and constraints
    const definitionIndicators = [
      /specific|clear|defined|exact/i,
      /requirement|specification|criteria/i,
      /must|should|need to/i,
    ];

    const ambiguityIndicators = [
      /unclear|vague|ambiguous|uncertain/i,
      /might|could|possibly|maybe/i,
      /explore|investigate|understand/i,
    ];

    let definitionScore = 0;
    for (const indicator of definitionIndicators) {
      if (indicator.test(description)) definitionScore++;
    }

    for (const indicator of ambiguityIndicators) {
      if (indicator.test(description)) definitionScore--;
    }

    return definitionScore > 0;
  }

  private hasMultipleSolutions(problem: Problem): boolean {
    const description = problem.description.toLowerCase();

    const multipleIndicators = [
      /alternative|option|choice|approach/i,
      /different|various|multiple/i,
      /way|method|solution|strategy/i,
    ];

    return multipleIndicators.some((indicator) => indicator.test(description));
  }

  private requiresCreativity(problem: Problem): boolean {
    const description = problem.description.toLowerCase();

    const creativityIndicators = [
      /creative|innovative|novel|original/i,
      /design|invent|create|develop/i,
      /brainstorm|ideate|imagine/i,
      /new|fresh|unique|different/i,
    ];

    return creativityIndicators.some((indicator) =>
      indicator.test(description)
    );
  }

  private involvesSystemsThinking(problem: Problem): boolean {
    const description = problem.description.toLowerCase();

    const systemsIndicators = [
      /system|network|ecosystem|infrastructure/i,
      /interconnected|integrated|holistic/i,
      /stakeholder|relationship|interaction/i,
      /complex|complicated|multifaceted/i,
    ];

    return systemsIndicators.some((indicator) => indicator.test(description));
  }

  private needsEvidence(problem: Problem): boolean {
    const description = problem.description.toLowerCase();

    const evidenceIndicators = [
      /data|evidence|research|analysis/i,
      /prove|validate|verify|test/i,
      /measure|metric|quantify/i,
      /study|investigate|examine/i,
    ];

    return evidenceIndicators.some((indicator) => indicator.test(description));
  }

  private hasCausalElements(problem: Problem): boolean {
    const description = problem.description.toLowerCase();

    const causalIndicators = [
      /cause|effect|impact|influence/i,
      /because|due to|result|consequence/i,
      /lead to|trigger|drive|affect/i,
      /why|how|what if/i,
    ];

    return causalIndicators.some((indicator) => indicator.test(description));
  }

  private involvesScenarios(problem: Problem): boolean {
    const description = problem.description.toLowerCase();

    const scenarioIndicators = [
      /scenario|future|forecast|predict/i,
      /what if|if then|possibility|potential/i,
      /plan|strategy|prepare|anticipate/i,
      /uncertain|unknown|variable/i,
    ];

    return scenarioIndicators.some((indicator) => indicator.test(description));
  }

  private requiresRootCause(problem: Problem): boolean {
    const description = problem.description.toLowerCase();

    const rootCauseIndicators = [
      /problem|issue|bug|error|failure/i,
      /why|cause|reason|source/i,
      /fix|solve|resolve|address/i,
      /prevent|avoid|stop|eliminate/i,
    ];

    return rootCauseIndicators.some((indicator) => indicator.test(description));
  }

  private generateRecommendationReasoning(
    framework: ThinkingFramework,
    characteristics: ProblemCharacteristics,
    score: number
  ): string {
    const reasons: string[] = [];

    // Start with user-friendly framework selection explanation
    reasons.push(
      `I recommend ${framework.name} because it's the best fit for your specific problem type`
    );

    // Add detailed, user-friendly reasoning based on characteristics
    if (
      characteristics.is_well_defined &&
      framework.type === "scientific_method"
    ) {
      reasons.push(
        "Your problem has clear parameters and measurable outcomes, making it perfect for systematic testing and validation"
      );
    }

    if (
      characteristics.requires_creativity &&
      framework.type === "design_thinking"
    ) {
      reasons.push(
        "This challenge needs innovative solutions and user-centered thinking - Design Thinking excels at generating creative, practical ideas"
      );
    }

    if (
      characteristics.involves_systems &&
      framework.type === "systems_thinking"
    ) {
      reasons.push(
        "Your problem involves multiple interconnected parts - Systems Thinking will help you see the big picture and find leverage points for maximum impact"
      );
    }

    if (
      characteristics.requires_root_cause &&
      framework.type === "root_cause_analysis"
    ) {
      reasons.push(
        "You're dealing with symptoms of a deeper issue - Root Cause Analysis will help you fix the real problem, not just the surface symptoms"
      );
    }

    if (framework.type === "critical_thinking") {
      reasons.push(
        "This situation requires careful evaluation of information and arguments - Critical Thinking will help you make well-reasoned decisions"
      );
    }

    if (framework.type === "creative_problem_solving") {
      reasons.push(
        "You need breakthrough solutions - Creative Problem Solving will help you think outside the box and generate innovative approaches"
      );
    }

    if (framework.type === "first_principles") {
      reasons.push(
        "This problem benefits from questioning basic assumptions - First Principles Thinking will help you build solutions from fundamental truths"
      );
    }

    if (framework.type === "scenario_planning") {
      reasons.push(
        "You're dealing with uncertainty about the future - Scenario Planning will help you prepare for multiple possible outcomes"
      );
    }

    // Add confidence explanation in user-friendly terms
    const confidenceLevel =
      score >= 0.8
        ? "very confident"
        : score >= 0.6
        ? "confident"
        : "moderately confident";
    reasons.push(
      `I'm ${confidenceLevel} (${(score * 100).toFixed(
        0
      )}%) this framework will work well for your situation`
    );

    // Add what makes this framework particularly good
    const strengthsExplanation = this.explainFrameworkStrengths(
      framework,
      characteristics
    );
    if (strengthsExplanation) {
      reasons.push(strengthsExplanation);
    }

    return reasons.join(". ");
  }

  private explainFrameworkStrengths(
    framework: ThinkingFramework,
    _characteristics: ProblemCharacteristics
  ): string {
    const explanations: string[] = [];

    switch (framework.type) {
      case "scientific_method":
        explanations.push(
          "It provides rigorous, evidence-based analysis that builds reliable conclusions"
        );
        break;
      case "design_thinking":
        explanations.push(
          "It keeps users at the center while systematically exploring creative solutions"
        );
        break;
      case "systems_thinking":
        explanations.push(
          "It reveals hidden connections and helps you intervene at the most effective points"
        );
        break;
      case "critical_thinking":
        explanations.push(
          "It helps you cut through bias and misinformation to reach sound conclusions"
        );
        break;
      case "creative_problem_solving":
        explanations.push(
          "It balances creative exploration with practical implementation planning"
        );
        break;
      case "root_cause_analysis":
        explanations.push(
          "It ensures you solve the real problem and prevent it from happening again"
        );
        break;
      case "first_principles":
        explanations.push(
          "It breaks free from conventional thinking to find truly innovative solutions"
        );
        break;
      case "scenario_planning":
        explanations.push(
          "It helps you make robust decisions that work across multiple possible futures"
        );
        break;
    }

    return explanations.join(". ");
  }
}
