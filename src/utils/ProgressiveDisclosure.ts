/**
 * Progressive disclosure utilities for complex tools
 * Helps users understand and use complex tools step by step
 */

export interface ToolComplexity {
  level: "simple" | "moderate" | "complex" | "expert";
  parameterCount: number;
  requiredParameters: string[];
  optionalParameters: string[];
  conceptualDifficulty: number; // 1-10
}

export interface DisclosureLevel {
  name: string;
  description: string;
  parameters: string[];
  examples: string[];
  nextSteps?: string[];
}

export interface ProgressiveGuide {
  toolName: string;
  complexity: ToolComplexity;
  levels: DisclosureLevel[];
  tips: string[];
  commonMistakes: string[];
}

export class ProgressiveDisclosure {
  private static guides: Map<string, ProgressiveGuide> = new Map();

  /**
   * Initialize progressive disclosure guides for all tools
   */
  static initialize(): void {
    this.guides.set("think", this.createThinkGuide());
    this.guides.set(
      "analyze_systematically",
      this.createSystematicThinkingGuide()
    );
    this.guides.set("think_parallel", this.createParallelThinkingGuide());
    this.guides.set(
      "think_probabilistic",
      this.createProbabilisticThinkingGuide()
    );
    this.guides.set(
      "decompose_problem",
      this.createProblemDecompositionGuide()
    );
    this.guides.set("analyze_memory_usage", this.createMemoryAnalysisGuide());
    this.guides.set("optimize_memory", this.createMemoryOptimizationGuide());
    this.guides.set("forgetting_policy", this.createForgettingPolicyGuide());
  }

  /**
   * Get progressive guide for a tool
   */
  static getGuide(toolName: string): ProgressiveGuide | null {
    return this.guides.get(toolName) || null;
  }

  /**
   * Get appropriate disclosure level based on user experience
   */
  static getDisclosureLevel(
    toolName: string,
    userLevel: "beginner" | "intermediate" | "advanced" = "beginner"
  ): DisclosureLevel | null {
    const guide = this.getGuide(toolName);
    if (!guide) return null;

    const levelIndex =
      userLevel === "beginner"
        ? 0
        : userLevel === "intermediate"
        ? Math.min(1, guide.levels.length - 1)
        : guide.levels.length - 1;

    return guide.levels[levelIndex] || null;
  }

  /**
   * Generate user-friendly tool introduction
   */
  static generateToolIntroduction(toolName: string): string {
    const guide = this.getGuide(toolName);
    if (!guide) {
      return `ℹ️ ${toolName} tool - no detailed guide available yet.`;
    }

    const complexity = guide.complexity;
    let intro = `🔧 **${toolName}** Tool Guide\n\n`;

    // Complexity indicator
    const complexityEmoji = {
      simple: "🟢",
      moderate: "🟡",
      complex: "🟠",
      expert: "🔴",
    };

    intro += `${complexityEmoji[complexity.level]} **Complexity:** ${
      complexity.level
    }\n`;
    intro += `📊 **Parameters:** ${complexity.parameterCount} total (${complexity.requiredParameters.length} required)\n\n`;

    // First level introduction
    const firstLevel = guide.levels[0];
    if (firstLevel) {
      intro += `**Getting Started:**\n${firstLevel.description}\n\n`;

      if (firstLevel.examples.length > 0) {
        intro += `**Quick Example:**\n\`\`\`\n${firstLevel.examples[0]}\n\`\`\`\n\n`;
      }
    }

    // Tips
    if (guide.tips.length > 0) {
      intro += `💡 **Pro Tips:**\n`;
      guide.tips.slice(0, 3).forEach((tip) => {
        intro += `• ${tip}\n`;
      });
      intro += `\n`;
    }

    // Common mistakes
    if (guide.commonMistakes.length > 0) {
      intro += `⚠️ **Avoid These Mistakes:**\n`;
      guide.commonMistakes.slice(0, 2).forEach((mistake) => {
        intro += `• ${mistake}\n`;
      });
    }

    return intro;
  }

  /**
   * Generate step-by-step guidance
   */
  static generateStepByStepGuide(
    toolName: string,
    targetLevel: "beginner" | "intermediate" | "advanced" = "beginner"
  ): string {
    const guide = this.getGuide(toolName);
    if (!guide) return "No step-by-step guide available.";

    let stepGuide = `📋 **Step-by-Step Guide for ${toolName}**\n\n`;

    const relevantLevels =
      targetLevel === "beginner"
        ? guide.levels.slice(0, 1)
        : targetLevel === "intermediate"
        ? guide.levels.slice(0, 2)
        : guide.levels;

    relevantLevels.forEach((level, index) => {
      stepGuide += `## Step ${index + 1}: ${level.name}\n`;
      stepGuide += `${level.description}\n\n`;

      if (level.parameters.length > 0) {
        stepGuide += `**Parameters to focus on:**\n`;
        level.parameters.forEach((param) => {
          stepGuide += `• \`${param}\`\n`;
        });
        stepGuide += `\n`;
      }

      if (level.examples.length > 0) {
        stepGuide += `**Examples:**\n`;
        level.examples.forEach((example) => {
          stepGuide += `\`\`\`\n${example}\n\`\`\`\n`;
        });
        stepGuide += `\n`;
      }

      if (level.nextSteps && level.nextSteps.length > 0) {
        stepGuide += `**Next Steps:**\n`;
        level.nextSteps.forEach((step) => {
          stepGuide += `• ${step}\n`;
        });
        stepGuide += `\n`;
      }
    });

    return stepGuide;
  }

  /**
   * Create guide for think tool
   */
  private static createThinkGuide(): ProgressiveGuide {
    return {
      toolName: "think",
      complexity: {
        level: "moderate",
        parameterCount: 7,
        requiredParameters: ["input"],
        optionalParameters: [
          "mode",
          "temperature",
          "max_depth",
          "enable_emotion",
          "enable_metacognition",
          "context",
        ],
        conceptualDifficulty: 4,
      },
      levels: [
        {
          name: "Basic Thinking",
          description:
            "Start with just your question - the system will handle the rest automatically.",
          parameters: ["input"],
          examples: [
            '{"input": "Should I take this job offer?"}',
            '{"input": "How can I improve my presentation skills?"}',
          ],
          nextSteps: [
            "Try different types of questions",
            "Experiment with the 'mode' parameter",
          ],
        },
        {
          name: "Guided Thinking",
          description:
            "Choose how you want the system to think about your problem.",
          parameters: ["input", "mode"],
          examples: [
            '{"input": "Creative solution for team communication", "mode": "creative"}',
            '{"input": "Analyze quarterly sales data", "mode": "analytical"}',
          ],
          nextSteps: [
            "Adjust thinking depth with max_depth",
            "Control creativity with temperature",
          ],
        },
        {
          name: "Advanced Thinking",
          description:
            "Fine-tune the thinking process with all available controls.",
          parameters: [
            "input",
            "mode",
            "temperature",
            "max_depth",
            "enable_emotion",
            "enable_metacognition",
          ],
          examples: [
            '{"input": "Complex strategic decision", "mode": "deliberative", "temperature": 0.3, "max_depth": 15, "enable_metacognition": true}',
          ],
        },
      ],
      tips: [
        "Start simple - just provide your question and let the system choose the best approach",
        "Use 'creative' mode for brainstorming, 'analytical' for data-driven decisions",
        "Higher temperature (0.8-1.2) = more creative, lower (0.3-0.5) = more focused",
        "Increase max_depth for complex problems, keep it low (5-8) for quick answers",
      ],
      commonMistakes: [
        "Using high temperature with analytical mode (reduces precision)",
        "Setting max_depth too high for simple questions (wastes time)",
        "Forgetting to enable metacognition for important decisions",
      ],
    };
  }

  /**
   * Create guide for systematic thinking tool
   */
  private static createSystematicThinkingGuide(): ProgressiveGuide {
    return {
      toolName: "analyze_systematically",
      complexity: {
        level: "complex",
        parameterCount: 3,
        requiredParameters: ["input"],
        optionalParameters: ["mode", "context"],
        conceptualDifficulty: 7,
      },
      levels: [
        {
          name: "Auto Framework Selection",
          description:
            "Let the system choose the best thinking framework for your problem.",
          parameters: ["input"],
          examples: [
            '{"input": "How to reduce customer churn in our SaaS product"}',
            '{"input": "Design a new employee onboarding process"}',
          ],
          nextSteps: [
            "Review which framework was selected and why",
            "Try hybrid mode for complex problems",
          ],
        },
        {
          name: "Hybrid Analysis",
          description:
            "Combine multiple thinking frameworks for comprehensive analysis.",
          parameters: ["input", "mode"],
          examples: [
            '{"input": "Strategic planning for next quarter", "mode": "hybrid"}',
          ],
          nextSteps: [
            "Add context for domain-specific analysis",
            "Compare results with single-framework approaches",
          ],
        },
      ],
      tips: [
        "Use for complex problems that benefit from structured thinking",
        "Auto mode works well for most situations",
        "Hybrid mode provides more comprehensive analysis but takes longer",
        "Provide context about your domain/industry for better framework selection",
      ],
      commonMistakes: [
        "Using systematic thinking for simple questions (overkill)",
        "Not providing enough context for domain-specific problems",
      ],
    };
  }

  /**
   * Create guide for parallel thinking tool
   */
  private static createParallelThinkingGuide(): ProgressiveGuide {
    return {
      toolName: "think_parallel",
      complexity: {
        level: "expert",
        parameterCount: 4,
        requiredParameters: ["input"],
        optionalParameters: [
          "context",
          "enable_coordination",
          "synchronization_interval",
        ],
        conceptualDifficulty: 8,
      },
      levels: [
        {
          name: "Basic Parallel Processing",
          description:
            "Run multiple reasoning streams simultaneously for comprehensive analysis.",
          parameters: ["input"],
          examples: [
            '{"input": "Evaluate the pros and cons of remote work policy"}',
          ],
          nextSteps: [
            "Enable coordination for better stream integration",
            "Adjust synchronization for different problem types",
          ],
        },
        {
          name: "Coordinated Parallel Thinking",
          description:
            "Enable real-time coordination between reasoning streams.",
          parameters: ["input", "enable_coordination"],
          examples: [
            '{"input": "Complex business strategy decision", "enable_coordination": true}',
          ],
        },
      ],
      tips: [
        "Best for complex problems requiring multiple perspectives",
        "Coordination improves result quality but increases processing time",
        "Use for important decisions where you want comprehensive analysis",
      ],
      commonMistakes: [
        "Using for simple problems (unnecessary complexity)",
        "Disabling coordination when streams need to work together",
      ],
    };
  }

  /**
   * Create guide for probabilistic thinking tool
   */
  private static createProbabilisticThinkingGuide(): ProgressiveGuide {
    return {
      toolName: "think_probabilistic",
      complexity: {
        level: "expert",
        parameterCount: 6,
        requiredParameters: ["input"],
        optionalParameters: [
          "context",
          "enable_bayesian_updating",
          "max_hypotheses",
          "uncertainty_threshold",
          "evidence_weight_threshold",
        ],
        conceptualDifficulty: 9,
      },
      levels: [
        {
          name: "Basic Probabilistic Reasoning",
          description:
            "Analyze problems with uncertainty and probability estimates.",
          parameters: ["input"],
          examples: [
            '{"input": "What are the chances our product launch will succeed?"}',
          ],
          nextSteps: [
            "Enable Bayesian updating for evidence integration",
            "Adjust hypothesis count for broader analysis",
          ],
        },
        {
          name: "Advanced Probabilistic Analysis",
          description:
            "Fine-tune probability analysis with evidence weighting and hypothesis generation.",
          parameters: ["input", "enable_bayesian_updating", "max_hypotheses"],
          examples: [
            '{"input": "Investment decision analysis", "enable_bayesian_updating": true, "max_hypotheses": 5}',
          ],
        },
      ],
      tips: [
        "Perfect for decisions involving uncertainty and risk",
        "Bayesian updating helps integrate new evidence",
        "More hypotheses = broader analysis but longer processing time",
      ],
      commonMistakes: [
        "Using for deterministic problems (no uncertainty involved)",
        "Setting too many hypotheses for simple probability questions",
      ],
    };
  }

  /**
   * Create guide for problem decomposition tool
   */
  private static createProblemDecompositionGuide(): ProgressiveGuide {
    return {
      toolName: "decompose_problem",
      complexity: {
        level: "complex",
        parameterCount: 4,
        requiredParameters: ["input"],
        optionalParameters: ["max_depth", "strategies", "context"],
        conceptualDifficulty: 6,
      },
      levels: [
        {
          name: "Auto Decomposition",
          description:
            "Break down complex problems into manageable sub-problems automatically.",
          parameters: ["input"],
          examples: ['{"input": "Launch a new mobile app successfully"}'],
          nextSteps: [
            "Adjust depth for more or less detailed breakdown",
            "Try specific decomposition strategies",
          ],
        },
        {
          name: "Controlled Decomposition",
          description: "Control the depth and strategy of problem breakdown.",
          parameters: ["input", "max_depth", "strategies"],
          examples: [
            '{"input": "Improve customer satisfaction", "max_depth": 3, "strategies": ["functional", "temporal"]}',
          ],
        },
      ],
      tips: [
        "Great for overwhelming or complex problems",
        "Start with auto mode, then refine with specific strategies",
        "Functional strategy = break by function, temporal = break by time",
      ],
      commonMistakes: [
        "Setting max_depth too high (creates too many sub-problems)",
        "Using for already simple problems",
      ],
    };
  }

  /**
   * Create guide for memory analysis tool
   */
  private static createMemoryAnalysisGuide(): ProgressiveGuide {
    return {
      toolName: "analyze_memory_usage",
      complexity: {
        level: "moderate",
        parameterCount: 3,
        requiredParameters: [],
        optionalParameters: [
          "analysis_depth",
          "context",
          "include_recommendations",
        ],
        conceptualDifficulty: 5,
      },
      levels: [
        {
          name: "Quick Memory Check",
          description: "Get a basic overview of your memory usage and health.",
          parameters: [],
          examples: ["{}"],
          nextSteps: [
            "Use 'deep' analysis for detailed insights",
            "Enable recommendations for optimization suggestions",
          ],
        },
        {
          name: "Detailed Memory Analysis",
          description:
            "Get comprehensive memory analysis with optimization recommendations.",
          parameters: ["analysis_depth", "include_recommendations"],
          examples: [
            '{"analysis_depth": "deep", "include_recommendations": true}',
          ],
        },
      ],
      tips: [
        "Run regularly to maintain memory health",
        "Deep analysis provides more insights but takes longer",
        "Always enable recommendations for actionable advice",
      ],
      commonMistakes: [
        "Running comprehensive analysis too frequently (resource intensive)",
        "Ignoring the recommendations provided",
      ],
    };
  }

  /**
   * Create guide for memory optimization tool
   */
  private static createMemoryOptimizationGuide(): ProgressiveGuide {
    return {
      toolName: "optimize_memory",
      complexity: {
        level: "complex",
        parameterCount: 6,
        requiredParameters: [],
        optionalParameters: [
          "optimization_mode",
          "target_memory_reduction",
          "preserve_important_memories",
          "enable_gradual_degradation",
          "require_user_consent",
          "context",
        ],
        conceptualDifficulty: 7,
      },
      levels: [
        {
          name: "Safe Optimization",
          description:
            "Conservative memory cleanup that preserves important memories.",
          parameters: ["optimization_mode"],
          examples: ['{"optimization_mode": "conservative"}'],
          nextSteps: [
            "Try moderate mode for more cleanup",
            "Adjust target reduction percentage",
          ],
        },
        {
          name: "Controlled Optimization",
          description:
            "Fine-tune memory optimization with specific targets and safeguards.",
          parameters: [
            "optimization_mode",
            "target_memory_reduction",
            "preserve_important_memories",
          ],
          examples: [
            '{"optimization_mode": "moderate", "target_memory_reduction": 0.2, "preserve_important_memories": true}',
          ],
        },
      ],
      tips: [
        "Start with conservative mode to be safe",
        "Always preserve important memories unless you're sure",
        "Gradual degradation is safer than immediate deletion",
      ],
      commonMistakes: [
        "Using aggressive mode without understanding the consequences",
        "Not preserving important memories",
        "Setting target reduction too high initially",
      ],
    };
  }

  /**
   * Create guide for forgetting policy tool
   */
  private static createForgettingPolicyGuide(): ProgressiveGuide {
    return {
      toolName: "forgetting_policy",
      complexity: {
        level: "expert",
        parameterCount: 5,
        requiredParameters: ["action"],
        optionalParameters: [
          "policy_id",
          "policy_data",
          "evaluation_context",
          "active_only",
        ],
        conceptualDifficulty: 9,
      },
      levels: [
        {
          name: "View Existing Policies",
          description:
            "Start by understanding what forgetting policies are already in place.",
          parameters: ["action"],
          examples: ['{"action": "list"}'],
          nextSteps: [
            "Examine specific policies with 'get' action",
            "Create simple policies for common scenarios",
          ],
        },
        {
          name: "Create Basic Policies",
          description:
            "Create simple forgetting policies for common memory management needs.",
          parameters: ["action", "policy_data"],
          examples: [
            '{"action": "create", "policy_data": {"policy_name": "cleanup_old_casual", "description": "Remove casual memories older than 30 days"}}',
          ],
          nextSteps: [
            "Test policies with evaluation",
            "Create more sophisticated rule-based policies",
          ],
        },
      ],
      tips: [
        "Start by listing existing policies to understand the system",
        "Create simple policies first, then add complexity",
        "Always test policies with evaluation before applying",
        "Use presets for common scenarios",
      ],
      commonMistakes: [
        "Creating overly complex policies initially",
        "Not testing policies before applying them",
        "Forgetting to consider policy interactions",
      ],
    };
  }
}
