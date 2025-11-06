/**
 * Usage Wizards for Complex Operations
 *
 * Provides step-by-step guided setup for complex cognitive tools
 * with interactive parameter selection and validation.
 *
 * Note: This file uses 'any' types for flexible wizard configurations across different scenarios.
 * The wizard system needs to handle diverse configuration structures dynamically.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  type: "input" | "select" | "multiselect" | "boolean" | "range" | "info";
  parameter?: string;
  options?: Array<{
    value: any;
    label: string;
    description: string;
    recommended?: boolean;
  }>;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => string | null;
  };
  dependencies?: Array<{
    parameter: string;
    condition: "equals" | "not_equals" | "greater_than" | "less_than";
    value: any;
  }>;
  help?: {
    examples: string[];
    tips: string[];
    common_mistakes: string[];
  };
}

export interface Wizard {
  id: string;
  name: string;
  description: string;
  tool_name: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_time: string;
  steps: WizardStep[];
  presets?: Array<{
    id: string;
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
}

export interface WizardSession {
  wizard_id: string;
  current_step: number;
  parameters: Record<string, any>;
  completed_steps: string[];
  validation_errors: Record<string, string>;
  can_proceed: boolean;
  can_go_back: boolean;
  progress_percentage: number;
}

export class UsageWizardManager {
  private wizards: Map<string, Wizard> = new Map();

  constructor() {
    this.initializeWizards();
  }

  private initializeWizards(): void {
    // Systematic Thinking Wizard
    this.wizards.set("systematic_thinking", {
      id: "systematic_thinking",
      name: "Systematic Problem Analysis",
      description:
        "Step-by-step guide to analyze complex problems using structured thinking frameworks",
      tool_name: "analyze_systematically",
      difficulty: "intermediate",
      estimated_time: "5-10 minutes",
      steps: [
        {
          id: "problem_input",
          title: "Describe Your Problem",
          description:
            "What complex problem or challenge would you like to analyze systematically?",
          type: "input",
          parameter: "input",
          validation: {
            required: true,
            min: 10,
            custom: (value: string) => {
              if (value.length < 10)
                return "Please provide more detail about your problem";
              if (
                !value.includes("?") &&
                !value.toLowerCase().includes("how") &&
                !value.toLowerCase().includes("what")
              ) {
                return "Consider framing this as a question or challenge";
              }
              return null;
            },
          },
          help: {
            examples: [
              "How can we improve customer satisfaction in our mobile app?",
              "What's the best approach to reduce our team's technical debt?",
              "How should we prioritize features for our next product release?",
            ],
            tips: [
              "Be specific about the context and constraints",
              "Include what you've already tried if applicable",
              "Frame as a question when possible",
            ],
            common_mistakes: [
              "Being too vague or general",
              "Not providing enough context",
              "Asking multiple unrelated questions at once",
            ],
          },
        },
        {
          id: "domain_context",
          title: "Problem Domain",
          description: "What area or field does this problem relate to?",
          type: "select",
          parameter: "context.domain",
          options: [
            {
              value: "business",
              label: "Business & Strategy",
              description: "Business decisions, strategy, operations",
            },
            {
              value: "technology",
              label: "Technology & Engineering",
              description: "Software, systems, technical challenges",
            },
            {
              value: "personal",
              label: "Personal Development",
              description: "Career, learning, personal goals",
            },
            {
              value: "creative",
              label: "Creative & Design",
              description: "Creative projects, design challenges",
            },
            {
              value: "research",
              label: "Research & Analysis",
              description: "Research questions, data analysis",
            },
            {
              value: "management",
              label: "Management & Leadership",
              description: "Team management, leadership challenges",
            },
            {
              value: "other",
              label: "Other",
              description: "Different domain or mixed domains",
            },
          ],
          help: {
            examples: [
              "Choose 'business' for market analysis or strategic decisions",
              "Choose 'technology' for architecture or implementation challenges",
              "Choose 'personal' for career or skill development questions",
            ],
            tips: [
              "Select the most relevant domain",
              "If mixed, choose the primary focus area",
              "This helps select appropriate analysis frameworks",
            ],
            common_mistakes: [
              "Overthinking the domain selection",
              "Choosing 'other' when a specific domain fits better",
            ],
          },
        },
        {
          id: "urgency_level",
          title: "Urgency Level",
          description:
            "How urgent is this problem? This affects the depth and speed of analysis.",
          type: "range",
          parameter: "context.urgency",
          validation: { min: 0, max: 1 },
          options: [
            {
              value: 0.1,
              label: "Low Urgency",
              description: "Can take time for thorough analysis",
            },
            {
              value: 0.5,
              label: "Moderate Urgency",
              description: "Need results within reasonable timeframe",
              recommended: true,
            },
            {
              value: 0.9,
              label: "High Urgency",
              description: "Need quick but still systematic analysis",
            },
          ],
          help: {
            examples: [
              "Low: Long-term strategic planning",
              "Moderate: Quarterly planning decisions",
              "High: Crisis response or urgent deadlines",
            ],
            tips: [
              "Higher urgency = faster but less detailed analysis",
              "Lower urgency = more thorough exploration",
              "Most problems benefit from moderate urgency",
            ],
            common_mistakes: [
              "Setting everything as high urgency",
              "Not considering the real timeline constraints",
            ],
          },
        },
        {
          id: "complexity_assessment",
          title: "Problem Complexity",
          description: "How complex do you think this problem is?",
          type: "range",
          parameter: "context.complexity",
          validation: { min: 0, max: 1 },
          options: [
            {
              value: 0.2,
              label: "Simple",
              description: "Clear problem with obvious factors",
            },
            {
              value: 0.5,
              label: "Moderate",
              description: "Multiple factors but manageable",
              recommended: true,
            },
            {
              value: 0.8,
              label: "Complex",
              description: "Many interconnected factors and unknowns",
            },
          ],
          help: {
            examples: [
              "Simple: Choosing between two clear options",
              "Moderate: Multi-factor decisions with trade-offs",
              "Complex: System-wide changes with many stakeholders",
            ],
            tips: [
              "Higher complexity = more detailed framework selection",
              "When in doubt, start with moderate complexity",
              "Complexity affects analysis depth and time",
            ],
            common_mistakes: [
              "Underestimating complexity of familiar problems",
              "Overcomplicating simple decisions",
            ],
          },
        },
        {
          id: "framework_mode",
          title: "Framework Selection",
          description:
            "How would you like the analysis framework to be chosen?",
          type: "select",
          parameter: "systematic_thinking_mode",
          options: [
            {
              value: "auto",
              label: "Automatic",
              description: "Let the system choose the best framework",
              recommended: true,
            },
            {
              value: "hybrid",
              label: "Hybrid",
              description: "System suggests, you can override",
            },
            {
              value: "manual",
              label: "Manual",
              description: "You choose the specific framework",
            },
          ],
          help: {
            examples: [
              "Auto: Best for most users and situations",
              "Hybrid: Good if you have some framework preferences",
              "Manual: For experts who know specific frameworks",
            ],
            tips: [
              "Auto mode works well for most problems",
              "Hybrid gives you control while providing guidance",
              "Manual requires knowledge of thinking frameworks",
            ],
            common_mistakes: [
              "Choosing manual without framework knowledge",
              "Not trusting the automatic selection",
            ],
          },
        },
      ],
      presets: [
        {
          id: "business_decision",
          name: "Business Decision Analysis",
          description:
            "Analyze business decisions with moderate urgency and complexity",
          parameters: {
            "context.domain": "business",
            "context.urgency": 0.5,
            "context.complexity": 0.5,
            systematic_thinking_mode: "auto",
          },
        },
        {
          id: "technical_problem",
          name: "Technical Problem Solving",
          description: "Systematic approach to technical challenges",
          parameters: {
            "context.domain": "technology",
            "context.urgency": 0.4,
            "context.complexity": 0.7,
            systematic_thinking_mode: "auto",
          },
        },
        {
          id: "quick_analysis",
          name: "Quick Analysis",
          description: "Fast systematic analysis for urgent decisions",
          parameters: {
            "context.urgency": 0.8,
            "context.complexity": 0.4,
            systematic_thinking_mode: "auto",
          },
        },
      ],
    });

    // Parallel Thinking Wizard
    this.wizards.set("parallel_thinking", {
      id: "parallel_thinking",
      name: "Multi-Perspective Analysis",
      description:
        "Analyze problems from multiple viewpoints simultaneously for comprehensive insights",
      tool_name: "think_parallel",
      difficulty: "intermediate",
      estimated_time: "3-8 minutes",
      steps: [
        {
          id: "problem_input",
          title: "Problem Description",
          description:
            "What would you like to analyze from multiple perspectives?",
          type: "input",
          parameter: "input",
          validation: {
            required: true,
            min: 10,
          },
          help: {
            examples: [
              "Should we adopt a remote-first work policy?",
              "How can we improve our product's user experience?",
              "What's the best way to handle this customer complaint?",
            ],
            tips: [
              "Problems with multiple stakeholders work well",
              "Controversial or complex decisions benefit most",
              "Include context about different viewpoints if known",
            ],
            common_mistakes: [
              "Asking simple yes/no questions",
              "Problems with only one clear perspective",
            ],
          },
        },
        {
          id: "enable_coordination",
          title: "Stream Coordination",
          description:
            "Should different thinking perspectives share insights and resolve conflicts?",
          type: "boolean",
          parameter: "enable_coordination",
          options: [
            {
              value: true,
              label: "Yes (Recommended)",
              description:
                "Perspectives can influence each other for better synthesis",
              recommended: true,
            },
            {
              value: false,
              label: "No",
              description: "Keep perspectives completely independent",
            },
          ],
          help: {
            examples: [
              "Yes: For most problems where integration matters",
              "No: When you want purely independent viewpoints",
            ],
            tips: [
              "Coordination usually produces better results",
              "Independent streams good for bias detection",
              "Most users should choose 'Yes'",
            ],
            common_mistakes: ["Disabling coordination without good reason"],
          },
        },
      ],
      presets: [
        {
          id: "decision_analysis",
          name: "Decision Analysis",
          description:
            "Analyze decisions from multiple stakeholder perspectives",
          parameters: {
            enable_coordination: true,
            "context.domain": "business",
          },
        },
        {
          id: "creative_problem",
          name: "Creative Problem Solving",
          description: "Generate diverse creative solutions",
          parameters: {
            enable_coordination: true,
            "context.domain": "creative",
          },
        },
      ],
    });

    // Problem Decomposition Wizard
    this.wizards.set("problem_decomposition", {
      id: "problem_decomposition",
      name: "Problem Breakdown",
      description: "Break complex problems into manageable, prioritized pieces",
      tool_name: "decompose_problem",
      difficulty: "beginner",
      estimated_time: "3-5 minutes",
      steps: [
        {
          id: "problem_input",
          title: "Complex Problem",
          description:
            "What large or overwhelming problem would you like to break down?",
          type: "input",
          parameter: "input",
          validation: {
            required: true,
            min: 15,
            custom: (value: string) => {
              if (
                !value.toLowerCase().includes("how") &&
                !value.toLowerCase().includes("what") &&
                !value.includes("?")
              ) {
                return "Consider framing as 'How to...' or 'What is the best way to...'";
              }
              return null;
            },
          },
          help: {
            examples: [
              "How to launch a new product successfully?",
              "What's needed to migrate our system to the cloud?",
              "How can we improve team productivity and morale?",
            ],
            tips: [
              "Bigger problems work better for decomposition",
              "Include the end goal you're trying to achieve",
              "Mention key constraints or requirements",
            ],
            common_mistakes: [
              "Problems that are already too specific",
              "Not mentioning the desired outcome",
            ],
          },
        },
        {
          id: "breakdown_depth",
          title: "Breakdown Depth",
          description: "How many levels deep should we break down the problem?",
          type: "range",
          parameter: "max_depth",
          validation: { min: 1, max: 5 },
          options: [
            {
              value: 2,
              label: "Shallow (2 levels)",
              description: "Quick overview of main components",
            },
            {
              value: 3,
              label: "Moderate (3 levels)",
              description: "Good balance of detail and manageability",
              recommended: true,
            },
            {
              value: 4,
              label: "Deep (4 levels)",
              description: "Detailed breakdown for complex projects",
            },
            {
              value: 5,
              label: "Very Deep (5 levels)",
              description: "Maximum detail for very complex problems",
            },
          ],
          help: {
            examples: [
              "2 levels: Quick project planning",
              "3 levels: Most business problems",
              "4-5 levels: Large, complex initiatives",
            ],
            tips: [
              "Start with 3 levels for most problems",
              "Deeper levels provide more detail but can be overwhelming",
              "You can always run again with more depth",
            ],
            common_mistakes: [
              "Going too deep initially",
              "Using shallow depth for very complex problems",
            ],
          },
        },
        {
          id: "breakdown_strategies",
          title: "Breakdown Approach",
          description:
            "Which approaches should be used to break down the problem? (Leave empty for automatic selection)",
          type: "multiselect",
          parameter: "strategies",
          options: [
            {
              value: "functional",
              label: "Functional",
              description: "Break down by what needs to be done",
            },
            {
              value: "temporal",
              label: "Temporal",
              description: "Break down by timeline and sequence",
            },
            {
              value: "stakeholder",
              label: "Stakeholder",
              description: "Break down by who is involved",
            },
            {
              value: "component",
              label: "Component",
              description: "Break down by system parts or modules",
            },
            {
              value: "risk",
              label: "Risk",
              description: "Break down by potential risks and mitigation",
            },
            {
              value: "resource",
              label: "Resource",
              description: "Break down by required resources",
            },
          ],
          help: {
            examples: [
              "Functional: Good for process improvements",
              "Temporal: Good for project planning",
              "Stakeholder: Good for organizational changes",
            ],
            tips: [
              "Leave empty to let the system choose automatically",
              "Select 2-3 strategies for comprehensive breakdown",
              "Different strategies reveal different aspects",
            ],
            common_mistakes: [
              "Selecting too many strategies",
              "Choosing strategies that don't fit the problem type",
            ],
          },
        },
      ],
      presets: [
        {
          id: "project_planning",
          name: "Project Planning",
          description:
            "Break down projects with functional and temporal approaches",
          parameters: {
            max_depth: 3,
            strategies: ["functional", "temporal"],
          },
        },
        {
          id: "organizational_change",
          name: "Organizational Change",
          description: "Break down changes considering stakeholders and risks",
          parameters: {
            max_depth: 3,
            strategies: ["stakeholder", "risk", "temporal"],
          },
        },
        {
          id: "quick_breakdown",
          name: "Quick Breakdown",
          description: "Fast, automatic breakdown for immediate insights",
          parameters: {
            max_depth: 2,
          },
        },
      ],
    });
  }

  getAvailableWizards(): Array<{
    id: string;
    name: string;
    description: string;
    tool_name: string;
    difficulty: string;
    estimated_time: string;
  }> {
    return Array.from(this.wizards.values()).map((wizard) => ({
      id: wizard.id,
      name: wizard.name,
      description: wizard.description,
      tool_name: wizard.tool_name,
      difficulty: wizard.difficulty,
      estimated_time: wizard.estimated_time,
    }));
  }

  getWizard(wizardId: string): Wizard | null {
    return this.wizards.get(wizardId) ?? null;
  }

  startWizardSession(wizardId: string): WizardSession | null {
    const wizard = this.wizards.get(wizardId);
    if (!wizard) return null;

    return {
      wizard_id: wizardId,
      current_step: 0,
      parameters: {},
      completed_steps: [],
      validation_errors: {},
      can_proceed: false,
      can_go_back: false,
      progress_percentage: 0,
    };
  }

  validateStep(
    session: WizardSession,
    stepId: string,
    value: any
  ): string | null {
    const wizard = this.wizards.get(session.wizard_id);
    if (!wizard) return "Wizard not found";

    const step = wizard.steps.find((s) => s.id === stepId);
    if (!step) return "Step not found";

    if (step.validation) {
      const validation = step.validation;

      if (
        validation.required &&
        (value === null || value === undefined || value === "")
      ) {
        return "This field is required";
      }

      if (typeof value === "string") {
        if (validation.min && value.length < validation.min) {
          return `Minimum length is ${validation.min} characters`;
        }
        if (validation.max && value.length > validation.max) {
          return `Maximum length is ${validation.max} characters`;
        }
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          return "Invalid format";
        }
      }

      if (typeof value === "number") {
        if (validation.min && value < validation.min) {
          return `Minimum value is ${validation.min}`;
        }
        if (validation.max && value > validation.max) {
          return `Maximum value is ${validation.max}`;
        }
      }

      if (validation.custom) {
        const customError = validation.custom(value);
        if (customError) return customError;
      }
    }

    return null;
  }

  updateSession(
    session: WizardSession,
    stepId: string,
    value: any
  ): WizardSession {
    const wizard = this.wizards.get(session.wizard_id);
    if (!wizard) return session;

    const step = wizard.steps.find((s) => s.id === stepId);
    if (!step?.parameter) return session;

    // Update parameter value
    if (step.parameter.includes(".")) {
      // Handle nested parameters like "context.domain"
      const parts = step.parameter.split(".");
      session.parameters[parts[0]] ??= {};
      session.parameters[parts[0]][parts[1]] = value;
    } else {
      session.parameters[step.parameter] = value;
    }

    // Validate the step
    const error = this.validateStep(session, stepId, value);
    if (error) {
      session.validation_errors[stepId] = error;
    } else {
      delete session.validation_errors[stepId];
      if (!session.completed_steps.includes(stepId)) {
        session.completed_steps.push(stepId);
      }
    }

    // Update session state
    session.can_proceed =
      Object.keys(session.validation_errors).length === 0 &&
      session.completed_steps.length > session.current_step;
    session.can_go_back = session.current_step > 0;
    session.progress_percentage = Math.round(
      (session.completed_steps.length / wizard.steps.length) * 100
    );

    return session;
  }

  nextStep(session: WizardSession): WizardSession {
    const wizard = this.wizards.get(session.wizard_id);
    if (!wizard || !session.can_proceed) return session;

    if (session.current_step < wizard.steps.length - 1) {
      session.current_step++;
      session.can_proceed = false; // Reset until next step is validated
    }

    return session;
  }

  previousStep(session: WizardSession): WizardSession {
    if (!session.can_go_back) return session;

    if (session.current_step > 0) {
      session.current_step--;
      session.can_proceed = true; // Can always proceed from a completed step
    }

    return session;
  }

  applyPreset(session: WizardSession, presetId: string): WizardSession {
    const wizard = this.wizards.get(session.wizard_id);
    if (!wizard) return session;

    const preset = wizard.presets?.find((p) => p.id === presetId);
    if (!preset) return session;

    // Apply preset parameters
    Object.assign(session.parameters, preset.parameters);

    // Mark relevant steps as completed
    wizard.steps.forEach((step) => {
      if (
        step.parameter &&
        this.hasParameter(session.parameters, step.parameter)
      ) {
        if (!session.completed_steps.includes(step.id)) {
          session.completed_steps.push(step.id);
        }
      }
    });

    // Update session state
    session.can_proceed = true;
    session.progress_percentage = Math.round(
      (session.completed_steps.length / wizard.steps.length) * 100
    );

    return session;
  }

  private hasParameter(
    parameters: Record<string, any>,
    paramPath: string
  ): boolean {
    if (paramPath.includes(".")) {
      const parts = paramPath.split(".");
      return (
        parameters[parts[0]] && parameters[parts[0]][parts[1]] !== undefined
      );
    }
    return parameters[paramPath] !== undefined;
  }

  generateToolCall(
    session: WizardSession
  ): { tool_name: string; parameters: Record<string, any> } | null {
    const wizard = this.wizards.get(session.wizard_id);
    if (!wizard || session.progress_percentage < 100) return null;

    return {
      tool_name: wizard.tool_name,
      parameters: session.parameters,
    };
  }
}
