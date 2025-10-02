/**
 * Preset Configurations for Common Scenarios
 *
 * Provides ready-to-use configurations for common cognitive tasks
 * and scenarios, making it easy for users to get started quickly.
 *
 * Note: This file uses 'any' types for flexible preset configurations.
 * TODO: Refactor to use proper generic types in future iteration.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PresetConfiguration {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  use_cases: string[];
  tools: PresetTool[];
  success_tips: string[];
  common_mistakes: string[];
}

export interface PresetTool {
  tool_name: string;
  purpose: string;
  parameters: Record<string, any>;
  parameter_explanations: Record<string, string>;
  customization_options?: Array<{
    parameter: string;
    description: string;
    options: Array<{
      value: any;
      label: string;
      when_to_use: string;
    }>;
  }>;
}

export interface PresetCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  presets: string[];
}

export class PresetConfigurationManager {
  private presets: Map<string, PresetConfiguration> = new Map();
  private categories: Map<string, PresetCategory> = new Map();

  constructor() {
    this.initializeCategories();
    this.initializePresets();
  }

  private initializeCategories(): void {
    this.categories.set("decision_making", {
      id: "decision_making",
      name: "Decision Making",
      description: "Make better decisions with confidence",
      icon: "🤔",
      presets: [],
    });

    this.categories.set("problem_solving", {
      id: "problem_solving",
      name: "Problem Solving",
      description: "Tackle complex problems systematically",
      icon: "🧩",
      presets: [],
    });

    this.categories.set("creativity", {
      id: "creativity",
      name: "Creativity & Innovation",
      description: "Generate creative solutions and ideas",
      icon: "💡",
      presets: [],
    });

    this.categories.set("learning", {
      id: "learning",
      name: "Learning & Understanding",
      description: "Learn and understand complex topics",
      icon: "📚",
      presets: [],
    });

    this.categories.set("planning", {
      id: "planning",
      name: "Planning & Strategy",
      description: "Plan projects and develop strategies",
      icon: "📋",
      presets: [],
    });

    this.categories.set("analysis", {
      id: "analysis",
      name: "Analysis & Research",
      description: "Analyze information and conduct research",
      icon: "🔍",
      presets: [],
    });

    this.categories.set("memory_management", {
      id: "memory_management",
      name: "Memory Management",
      description: "Optimize and organize memory usage",
      icon: "🧠",
      presets: [],
    });
  }

  private initializePresets(): void {
    // Decision Making Presets
    this.presets.set("career_decision", {
      id: "career_decision",
      name: "Career Decision",
      description: "Make important career choices with confidence",
      category: "decision_making",
      difficulty: "beginner",
      use_cases: [
        "Job offers comparison",
        "Career path selection",
        "Skill development priorities",
        "Work-life balance decisions",
      ],
      tools: [
        {
          tool_name: "think",
          purpose: "Explore your values, goals, and constraints",
          parameters: {
            mode: "balanced",
            enable_emotion: true,
            enable_metacognition: true,
          },
          parameter_explanations: {
            mode: "Balanced mode considers both logical and intuitive factors",
            enable_emotion:
              "Career decisions involve personal values and feelings",
            enable_metacognition:
              "Important to check the quality of your reasoning",
          },
          customization_options: [
            {
              parameter: "mode",
              description: "Thinking approach for your decision",
              options: [
                {
                  value: "balanced",
                  label: "Balanced",
                  when_to_use: "Most career decisions",
                },
                {
                  value: "deliberative",
                  label: "Deliberative",
                  when_to_use: "Major life changes",
                },
                {
                  value: "analytical",
                  label: "Analytical",
                  when_to_use: "Salary/benefits focused",
                },
              ],
            },
          ],
        },
      ],
      success_tips: [
        "Consider both short-term and long-term implications",
        "Include personal values alongside practical factors",
        "Think about growth opportunities and learning",
        "Consider impact on relationships and lifestyle",
      ],
      common_mistakes: [
        "Focusing only on salary or title",
        "Not considering company culture fit",
        "Ignoring long-term career trajectory",
        "Making decisions based on fear rather than opportunity",
      ],
    });

    this.presets.set("investment_choice", {
      id: "investment_choice",
      name: "Investment Decision",
      description: "Make informed investment decisions with risk assessment",
      category: "decision_making",
      difficulty: "intermediate",
      use_cases: [
        "Stock investment decisions",
        "Real estate purchases",
        "Business investment opportunities",
        "Retirement planning choices",
      ],
      tools: [
        {
          tool_name: "think_probabilistic",
          purpose: "Assess risks, uncertainties, and potential outcomes",
          parameters: {
            enable_bayesian_updating: true,
            uncertainty_threshold: 0.2,
            max_hypotheses: 4,
          },
          parameter_explanations: {
            enable_bayesian_updating:
              "Update beliefs as you gather more information",
            uncertainty_threshold:
              "Flag high uncertainty areas for more research",
            max_hypotheses:
              "Consider multiple scenarios for better risk assessment",
          },
        },
      ],
      success_tips: [
        "Quantify risks and potential returns",
        "Consider multiple scenarios (best, worst, likely)",
        "Factor in your risk tolerance and timeline",
        "Don't invest more than you can afford to lose",
      ],
      common_mistakes: [
        "Overconfidence in predictions",
        "Ignoring downside risks",
        "Following trends without analysis",
        "Not diversifying investments",
      ],
    });

    // Problem Solving Presets
    this.presets.set("technical_problem", {
      id: "technical_problem",
      name: "Technical Problem Solving",
      description: "Systematically solve technical and engineering challenges",
      category: "problem_solving",
      difficulty: "intermediate",
      use_cases: [
        "Software bugs and issues",
        "System architecture decisions",
        "Performance optimization",
        "Technical debt resolution",
      ],
      tools: [
        {
          tool_name: "decompose_problem",
          purpose: "Break down complex technical issues into components",
          parameters: {
            max_depth: 3,
            strategies: ["component", "functional", "risk"],
          },
          parameter_explanations: {
            max_depth:
              "Three levels provide good detail without overwhelming complexity",
            strategies:
              "Component-based breakdown works well for technical systems",
          },
        },
        {
          tool_name: "analyze_systematically",
          purpose: "Apply structured problem-solving frameworks",
          parameters: {
            mode: "auto",
          },
          parameter_explanations: {
            mode: "Auto mode selects appropriate technical analysis frameworks",
          },
        },
      ],
      success_tips: [
        "Start with reproducing the problem consistently",
        "Isolate variables and test hypotheses systematically",
        "Consider both immediate fixes and long-term solutions",
        "Document your analysis for future reference",
      ],
      common_mistakes: [
        "Jumping to solutions without understanding the problem",
        "Not considering system-wide impacts",
        "Fixing symptoms instead of root causes",
        "Not testing solutions thoroughly",
      ],
    });

    this.presets.set("business_challenge", {
      id: "business_challenge",
      name: "Business Challenge",
      description: "Address business problems with stakeholder consideration",
      category: "problem_solving",
      difficulty: "intermediate",
      use_cases: [
        "Customer satisfaction issues",
        "Process improvement opportunities",
        "Market competition challenges",
        "Team productivity problems",
      ],
      tools: [
        {
          tool_name: "think_parallel",
          purpose: "Consider multiple stakeholder perspectives",
          parameters: {
            enable_coordination: true,
          },
          parameter_explanations: {
            enable_coordination:
              "Allow different perspectives to influence each other",
          },
        },
        {
          tool_name: "analyze_systematically",
          purpose: "Apply business analysis frameworks",
          parameters: {
            mode: "auto",
          },
          parameter_explanations: {
            mode: "Automatically select appropriate business frameworks",
          },
        },
      ],
      success_tips: [
        "Identify all stakeholders affected by the problem",
        "Consider both quantitative and qualitative factors",
        "Look for win-win solutions when possible",
        "Plan for implementation challenges",
      ],
      common_mistakes: [
        "Not involving key stakeholders in the analysis",
        "Focusing only on symptoms rather than causes",
        "Ignoring organizational culture and politics",
        "Not considering implementation feasibility",
      ],
    });

    // Creativity Presets
    this.presets.set("brainstorming", {
      id: "brainstorming",
      name: "Creative Brainstorming",
      description: "Generate innovative ideas and creative solutions",
      category: "creativity",
      difficulty: "beginner",
      use_cases: [
        "Product feature ideas",
        "Marketing campaign concepts",
        "Process innovation",
        "Creative project concepts",
      ],
      tools: [
        {
          tool_name: "think",
          purpose: "Generate initial creative ideas",
          parameters: {
            mode: "creative",
            temperature: 1.2,
            enable_systematic_thinking: false,
          },
          parameter_explanations: {
            mode: "Creative mode optimizes for idea generation",
            temperature:
              "High temperature increases creativity and exploration",
            enable_systematic_thinking:
              "Disabled to allow free-flowing creativity",
          },
        },
        {
          tool_name: "think_parallel",
          purpose: "Explore ideas from different creative angles",
          parameters: {
            enable_coordination: false,
          },
          parameter_explanations: {
            enable_coordination:
              "Independent streams generate more diverse ideas",
          },
        },
      ],
      success_tips: [
        "Suspend judgment during idea generation",
        "Build on others' ideas rather than criticizing",
        "Aim for quantity first, quality later",
        "Combine unrelated concepts for novel solutions",
      ],
      common_mistakes: [
        "Evaluating ideas too early in the process",
        "Sticking to familiar or safe ideas",
        "Not building on initial concepts",
        "Giving up too quickly when ideas seem impractical",
      ],
    });

    // Learning Presets
    this.presets.set("learn_technology", {
      id: "learn_technology",
      name: "Learn New Technology",
      description: "Systematically learn and master new technologies",
      category: "learning",
      difficulty: "beginner",
      use_cases: [
        "Programming languages",
        "Software frameworks",
        "Development tools",
        "Technical concepts",
      ],
      tools: [
        {
          tool_name: "decompose_problem",
          purpose: "Break down the technology into learnable components",
          parameters: {
            max_depth: 3,
            strategies: ["component", "complexity", "temporal"],
          },
          parameter_explanations: {
            strategies:
              "Component breakdown helps identify what to learn first",
          },
        },
        {
          tool_name: "think",
          purpose: "Create learning strategy and practice plan",
          parameters: {
            mode: "analytical",
            enable_systematic_thinking: true,
          },
          parameter_explanations: {
            mode: "Analytical approach for structured learning",
            enable_systematic_thinking:
              "Use learning frameworks and methodologies",
          },
        },
      ],
      success_tips: [
        "Start with fundamentals before advanced topics",
        "Practice with real projects, not just tutorials",
        "Connect new concepts to what you already know",
        "Set specific, measurable learning goals",
      ],
      common_mistakes: [
        "Trying to learn everything at once",
        "Skipping foundational concepts",
        "Not practicing enough hands-on coding",
        "Getting stuck in tutorial hell without building projects",
      ],
    });

    // Memory Management Presets
    this.presets.set("performance_optimization", {
      id: "performance_optimization",
      name: "Performance Optimization",
      description: "Optimize memory for better thinking performance",
      category: "memory_management",
      difficulty: "intermediate",
      use_cases: [
        "Slow thinking responses",
        "Memory overload",
        "System performance issues",
        "Regular maintenance",
      ],
      tools: [
        {
          tool_name: "analyze_memory_usage",
          purpose: "Assess current memory usage and identify issues",
          parameters: {
            analysis_depth: "deep",
          },
          parameter_explanations: {
            analysis_depth:
              "Deep analysis provides comprehensive optimization opportunities",
          },
        },
        {
          tool_name: "optimize_memory",
          purpose: "Execute performance-focused cleanup",
          parameters: {
            action: "execute_cleanup",
            cleanup_option: "performance_boost",
          },
          parameter_explanations: {
            cleanup_option: "Performance boost prioritizes speed over storage",
          },
        },
      ],
      success_tips: [
        "Run analysis first to understand current state",
        "Start with conservative optimization",
        "Monitor performance improvements",
        "Schedule regular maintenance",
      ],
      common_mistakes: [
        "Being too aggressive with cleanup",
        "Not backing up important memories",
        "Ignoring the analysis recommendations",
        "Not monitoring results after optimization",
      ],
    });

    // Update category preset lists
    this.categories.get("decision_making")!.presets = [
      "career_decision",
      "investment_choice",
    ];
    this.categories.get("problem_solving")!.presets = [
      "technical_problem",
      "business_challenge",
    ];
    this.categories.get("creativity")!.presets = ["brainstorming"];
    this.categories.get("learning")!.presets = ["learn_technology"];
    this.categories.get("memory_management")!.presets = [
      "performance_optimization",
    ];
  }

  getAvailableCategories(): PresetCategory[] {
    return Array.from(this.categories.values());
  }

  getPresetsByCategory(categoryId: string): PresetConfiguration[] {
    const category = this.categories.get(categoryId);
    if (!category) return [];

    return category.presets
      .map((presetId) => this.presets.get(presetId))
      .filter((preset) => preset !== undefined) as PresetConfiguration[];
  }

  getPreset(presetId: string): PresetConfiguration | null {
    return this.presets.get(presetId) || null;
  }

  getAllPresets(): PresetConfiguration[] {
    return Array.from(this.presets.values());
  }

  searchPresets(query: string): PresetConfiguration[] {
    const queryLower = query.toLowerCase();
    return Array.from(this.presets.values()).filter(
      (preset) =>
        preset.name.toLowerCase().includes(queryLower) ||
        preset.description.toLowerCase().includes(queryLower) ||
        preset.use_cases.some((useCase) =>
          useCase.toLowerCase().includes(queryLower)
        )
    );
  }

  getPresetsByDifficulty(
    difficulty: "beginner" | "intermediate" | "advanced"
  ): PresetConfiguration[] {
    return Array.from(this.presets.values()).filter(
      (preset) => preset.difficulty === difficulty
    );
  }

  customizePreset(
    presetId: string,
    customizations: Record<string, Record<string, any>>
  ): PresetConfiguration | null {
    const preset = this.presets.get(presetId);
    if (!preset) return null;

    // Create a deep copy of the preset
    const customizedPreset: PresetConfiguration = JSON.parse(
      JSON.stringify(preset)
    );
    customizedPreset.id = `${presetId}_custom_${Date.now()}`;
    customizedPreset.name = `${preset.name} (Custom)`;

    // Apply customizations
    for (const tool of customizedPreset.tools) {
      const toolCustomizations = customizations[tool.tool_name];
      if (toolCustomizations) {
        Object.assign(tool.parameters, toolCustomizations);
      }
    }

    return customizedPreset;
  }

  generateToolSequence(
    preset: PresetConfiguration,
    userInput: string
  ): Array<{
    tool_name: string;
    parameters: Record<string, any>;
    purpose: string;
  }> {
    return preset.tools.map((tool) => ({
      tool_name: tool.tool_name,
      parameters: {
        ...tool.parameters,
        input: userInput, // Add user input to each tool
      },
      purpose: tool.purpose,
    }));
  }

  getRecommendedPresets(userProfile: {
    experience_level: "beginner" | "intermediate" | "advanced";
    primary_use_cases: string[];
    preferred_complexity: "simple" | "moderate" | "complex";
  }): PresetConfiguration[] {
    const allPresets = Array.from(this.presets.values());

    return allPresets
      .filter((preset) => {
        // Filter by experience level
        if (
          userProfile.experience_level === "beginner" &&
          preset.difficulty === "advanced"
        ) {
          return false;
        }

        // Check use case alignment
        const hasMatchingUseCase = preset.use_cases.some((useCase) =>
          userProfile.primary_use_cases.some(
            (userUseCase) =>
              useCase.toLowerCase().includes(userUseCase.toLowerCase()) ||
              userUseCase.toLowerCase().includes(useCase.toLowerCase())
          )
        );

        return hasMatchingUseCase;
      })
      .sort((a, b) => {
        // Prioritize by difficulty match
        const difficultyScore = (preset: PresetConfiguration) => {
          if (preset.difficulty === userProfile.experience_level) return 3;
          if (
            userProfile.experience_level === "intermediate" &&
            preset.difficulty === "beginner"
          )
            return 2;
          if (
            userProfile.experience_level === "advanced" &&
            preset.difficulty === "intermediate"
          )
            return 2;
          return 1;
        };

        return difficultyScore(b) - difficultyScore(a);
      })
      .slice(0, 5); // Return top 5 recommendations
  }

  exportPreset(presetId: string): string | null {
    const preset = this.presets.get(presetId);
    if (!preset) return null;

    return JSON.stringify(preset, null, 2);
  }

  importPreset(presetJson: string): boolean {
    try {
      const preset: PresetConfiguration = JSON.parse(presetJson);

      // Validate preset structure
      if (
        !preset.id ||
        !preset.name ||
        !preset.tools ||
        !Array.isArray(preset.tools)
      ) {
        return false;
      }

      this.presets.set(preset.id, preset);
      return true;
    } catch {
      return false;
    }
  }
}
