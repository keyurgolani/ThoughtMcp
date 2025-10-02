/**
 * Tool Chaining Suggestions
 *
 * Provides intelligent suggestions for chaining cognitive tools together
 * to create powerful workflows and solve complex problems step by step.
 *
 * Note: This file uses 'any' types for flexible tool chaining.
 * TODO: Refactor to use proper generic types in future iteration.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ToolChain {
  id: string;
  name: string;
  description: string;
  use_cases: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_time: string;
  steps: ChainStep[];
  success_indicators: string[];
}

export interface ChainStep {
  step_number: number;
  tool_name: string;
  purpose: string;
  description: string;
  parameters: Record<string, any>;
  parameter_templates: Record<string, string>;
  output_usage: string;
  next_step_preparation?: string;
  optional?: boolean;
}

export interface ChainSuggestion {
  chain: ToolChain;
  relevance_score: number;
  why_suggested: string;
  customization_tips: string[];
}

export interface ChainContext {
  current_tool: string;
  current_parameters: Record<string, any>;
  previous_tools: string[];
  user_goal?: string;
  domain?: string;
  complexity?: number;
}

export class ToolChainingSuggestionEngine {
  private toolChains: Map<string, ToolChain> = new Map();
  private toolRelationships: Map<string, string[]> = new Map();

  constructor() {
    this.initializeToolChains();
    this.initializeToolRelationships();
  }

  private initializeToolChains(): void {
    // Problem Analysis Chain
    this.toolChains.set("problem_analysis", {
      id: "problem_analysis",
      name: "Complete Problem Analysis",
      description:
        "Comprehensive analysis of complex problems from multiple angles",
      use_cases: [
        "Business strategy decisions",
        "Technical architecture choices",
        "Product development planning",
        "Organizational changes",
      ],
      difficulty: "intermediate",
      estimated_time: "15-25 minutes",
      steps: [
        {
          step_number: 1,
          tool_name: "decompose_problem",
          purpose: "Break down the complex problem into manageable parts",
          description:
            "Start by understanding the structure and components of your problem",
          parameters: {
            max_depth: 3,
          },
          parameter_templates: {
            input: "Use your original problem statement here",
          },
          output_usage: "Identifies key components and sub-problems to analyze",
          next_step_preparation:
            "Use the identified components to guide systematic analysis",
        },
        {
          step_number: 2,
          tool_name: "analyze_systematically",
          purpose: "Apply structured thinking frameworks to each component",
          description:
            "Systematically analyze the problem using appropriate frameworks",
          parameters: {
            mode: "auto",
          },
          parameter_templates: {
            input: "Focus on the most critical component from step 1",
          },
          output_usage:
            "Provides structured analysis and framework-based insights",
          next_step_preparation:
            "Use insights to inform multi-perspective thinking",
        },
        {
          step_number: 3,
          tool_name: "think_parallel",
          purpose: "Examine from multiple stakeholder perspectives",
          description:
            "Consider how different stakeholders view the problem and solutions",
          parameters: {
            enable_coordination: true,
          },
          parameter_templates: {
            input:
              "How should we approach [main problem] considering all stakeholders?",
          },
          output_usage: "Reveals different viewpoints and potential conflicts",
          next_step_preparation:
            "Synthesize insights for final decision-making",
        },
        {
          step_number: 4,
          tool_name: "think",
          purpose: "Synthesize insights and create action plan",
          description:
            "Combine all insights into a coherent strategy and next steps",
          parameters: {
            mode: "deliberative",
            enable_metacognition: true,
          },
          parameter_templates: {
            input:
              "Based on the analysis, what's the best approach and action plan for [problem]?",
          },
          output_usage: "Final recommendations and implementation strategy",
        },
      ],
      success_indicators: [
        "Clear understanding of problem structure",
        "Multiple perspectives considered",
        "Actionable recommendations generated",
        "Potential risks and mitigation strategies identified",
      ],
    });

    // Decision Making Chain
    this.toolChains.set("decision_making", {
      id: "decision_making",
      name: "Structured Decision Making",
      description:
        "Systematic approach to making important decisions with confidence",
      use_cases: [
        "Career decisions",
        "Investment choices",
        "Technology selection",
        "Strategic planning",
      ],
      difficulty: "beginner",
      estimated_time: "10-15 minutes",
      steps: [
        {
          step_number: 1,
          tool_name: "think",
          purpose: "Initial exploration of the decision",
          description: "Explore the decision space and identify key factors",
          parameters: {
            mode: "balanced",
            enable_emotion: true,
          },
          parameter_templates: {
            input:
              "I need to decide [your decision]. What factors should I consider?",
          },
          output_usage: "Identifies key decision factors and initial thoughts",
        },
        {
          step_number: 2,
          tool_name: "think_probabilistic",
          purpose: "Assess uncertainties and risks",
          description: "Quantify uncertainties and assess potential outcomes",
          parameters: {
            enable_bayesian_updating: true,
            max_hypotheses: 3,
          },
          parameter_templates: {
            input:
              "What are the likely outcomes and risks for [your decision]?",
          },
          output_usage: "Provides probability assessments and risk analysis",
        },
        {
          step_number: 3,
          tool_name: "think_parallel",
          purpose: "Consider multiple perspectives",
          description: "Examine the decision from different viewpoints",
          parameters: {
            enable_coordination: true,
          },
          parameter_templates: {
            input:
              "How would different people (stakeholders, experts, critics) view [your decision]?",
          },
          output_usage: "Reveals blind spots and alternative viewpoints",
        },
        {
          step_number: 4,
          tool_name: "think",
          purpose: "Make final decision with confidence",
          description: "Synthesize all analysis into a confident decision",
          parameters: {
            mode: "deliberative",
            enable_metacognition: true,
          },
          parameter_templates: {
            input:
              "Based on all analysis, what decision should I make and why?",
          },
          output_usage:
            "Final decision with clear reasoning and confidence level",
        },
      ],
      success_indicators: [
        "All major factors considered",
        "Risks and uncertainties assessed",
        "Multiple perspectives evaluated",
        "Clear decision with strong reasoning",
      ],
    });

    // Creative Problem Solving Chain
    this.toolChains.set("creative_problem_solving", {
      id: "creative_problem_solving",
      name: "Creative Problem Solving",
      description:
        "Generate innovative solutions through structured creativity",
      use_cases: [
        "Product innovation",
        "Marketing campaigns",
        "Process improvement",
        "Overcoming obstacles",
      ],
      difficulty: "intermediate",
      estimated_time: "12-20 minutes",
      steps: [
        {
          step_number: 1,
          tool_name: "think",
          purpose: "Reframe the problem creatively",
          description: "Look at the problem from new angles and reframe it",
          parameters: {
            mode: "creative",
            temperature: 1.2,
          },
          parameter_templates: {
            input:
              "How can I reframe or look at [your problem] in completely new ways?",
          },
          output_usage: "New problem framings and creative perspectives",
        },
        {
          step_number: 2,
          tool_name: "think_parallel",
          purpose: "Generate diverse solution approaches",
          description: "Create multiple solution streams simultaneously",
          parameters: {
            enable_coordination: false,
          },
          parameter_templates: {
            input:
              "What are completely different approaches to solve [reframed problem]?",
          },
          output_usage: "Diverse, independent solution approaches",
        },
        {
          step_number: 3,
          tool_name: "decompose_problem",
          purpose: "Break down promising solutions",
          description:
            "Decompose the most promising solutions into actionable steps",
          parameters: {
            max_depth: 2,
            strategies: ["functional", "resource"],
          },
          parameter_templates: {
            input:
              "How can I implement [best solution from step 2] in practice?",
          },
          output_usage: "Practical implementation roadmap",
        },
        {
          step_number: 4,
          tool_name: "think",
          purpose: "Refine and validate solutions",
          description: "Refine solutions and check for feasibility",
          parameters: {
            mode: "analytical",
            enable_metacognition: true,
          },
          parameter_templates: {
            input:
              "How can I improve and validate [chosen solution] before implementation?",
          },
          output_usage: "Refined, validated solution ready for implementation",
        },
      ],
      success_indicators: [
        "Novel problem framings discovered",
        "Multiple creative solutions generated",
        "Practical implementation plan created",
        "Solutions validated for feasibility",
      ],
    });

    // Learning and Understanding Chain
    this.toolChains.set("learning_understanding", {
      id: "learning_understanding",
      name: "Deep Learning & Understanding",
      description: "Systematically learn and understand complex topics",
      use_cases: [
        "Learning new technologies",
        "Understanding complex concepts",
        "Research and analysis",
        "Skill development",
      ],
      difficulty: "beginner",
      estimated_time: "8-15 minutes",
      steps: [
        {
          step_number: 1,
          tool_name: "decompose_problem",
          purpose: "Break down the learning topic",
          description:
            "Identify the key components and structure of what you want to learn",
          parameters: {
            max_depth: 3,
            strategies: ["component", "complexity"],
          },
          parameter_templates: {
            input:
              "What do I need to learn to understand [your topic] completely?",
          },
          output_usage: "Learning roadmap with key components and dependencies",
        },
        {
          step_number: 2,
          tool_name: "think",
          purpose: "Explore each component deeply",
          description: "Dive deep into each learning component",
          parameters: {
            mode: "analytical",
            enable_systematic_thinking: true,
          },
          parameter_templates: {
            input:
              "Help me understand [specific component from step 1] in detail",
          },
          output_usage: "Deep understanding of individual components",
        },
        {
          step_number: 3,
          tool_name: "think_parallel",
          purpose: "Connect concepts from multiple angles",
          description: "See how concepts connect and relate to each other",
          parameters: {
            enable_coordination: true,
          },
          parameter_templates: {
            input:
              "How do all the components of [your topic] connect and work together?",
          },
          output_usage:
            "Integrated understanding of relationships and connections",
        },
        {
          step_number: 4,
          tool_name: "think",
          purpose: "Test and apply understanding",
          description:
            "Validate understanding through application and examples",
          parameters: {
            mode: "balanced",
            enable_metacognition: true,
          },
          parameter_templates: {
            input:
              "How can I apply my understanding of [topic] to real situations?",
          },
          output_usage: "Practical applications and validated understanding",
        },
      ],
      success_indicators: [
        "Topic broken into learnable components",
        "Deep understanding of each component",
        "Clear connections between concepts",
        "Ability to apply knowledge practically",
      ],
    });

    // Memory Optimization Chain
    this.toolChains.set("memory_optimization", {
      id: "memory_optimization",
      name: "Smart Memory Management",
      description:
        "Optimize memory usage while preserving important information",
      use_cases: [
        "Performance improvement",
        "Storage cleanup",
        "Information organization",
        "System maintenance",
      ],
      difficulty: "intermediate",
      estimated_time: "5-10 minutes",
      steps: [
        {
          step_number: 1,
          tool_name: "analyze_memory_usage",
          purpose: "Assess current memory state",
          description:
            "Understand current memory usage patterns and identify opportunities",
          parameters: {
            analysis_depth: "deep",
          },
          parameter_templates: {},
          output_usage:
            "Detailed memory analysis and optimization opportunities",
        },
        {
          step_number: 2,
          tool_name: "forgetting_policy",
          purpose: "Set up memory management rules",
          description: "Configure policies for automatic memory management",
          parameters: {
            action: "list_presets",
          },
          parameter_templates: {},
          output_usage: "Available policy presets for memory management",
        },
        {
          step_number: 3,
          tool_name: "forgetting_policy",
          purpose: "Apply appropriate policy",
          description:
            "Select and apply the most suitable memory management policy",
          parameters: {
            action: "use_preset",
            preset_id: "balanced",
          },
          parameter_templates: {},
          output_usage: "Active memory management policy",
        },
        {
          step_number: 4,
          tool_name: "optimize_memory",
          purpose: "Execute memory optimization",
          description:
            "Perform the actual memory optimization with safety checks",
          parameters: {
            action: "preview_cleanup",
            cleanup_option: "smart_cleanup",
          },
          parameter_templates: {},
          output_usage:
            "Memory optimization results and performance improvement",
        },
      ],
      success_indicators: [
        "Memory usage analyzed and understood",
        "Appropriate policies configured",
        "Safe optimization executed",
        "Performance improvement achieved",
      ],
    });
  }

  private initializeToolRelationships(): void {
    // Define which tools work well together
    this.toolRelationships.set("think", [
      "think_parallel",
      "analyze_systematically",
      "decompose_problem",
      "think_probabilistic",
    ]);

    this.toolRelationships.set("decompose_problem", [
      "analyze_systematically",
      "think_parallel",
      "think",
    ]);

    this.toolRelationships.set("analyze_systematically", [
      "think_parallel",
      "think",
      "think_probabilistic",
    ]);

    this.toolRelationships.set("think_parallel", [
      "think",
      "analyze_systematically",
      "decompose_problem",
    ]);

    this.toolRelationships.set("think_probabilistic", [
      "think",
      "analyze_systematically",
      "think_parallel",
    ]);

    this.toolRelationships.set("optimize_memory", [
      "analyze_memory_usage",
      "forgetting_policy",
      "forgetting_audit",
    ]);

    this.toolRelationships.set("forgetting_policy", [
      "optimize_memory",
      "forgetting_audit",
      "analyze_memory_usage",
    ]);
  }

  getSuggestedChains(context: ChainContext): ChainSuggestion[] {
    const suggestions: ChainSuggestion[] = [];

    for (const chain of this.toolChains.values()) {
      const relevanceScore = this.calculateRelevance(chain, context);
      if (relevanceScore > 0.3) {
        suggestions.push({
          chain,
          relevance_score: relevanceScore,
          why_suggested: this.explainRelevance(chain, context),
          customization_tips: this.getCustomizationTips(chain, context),
        });
      }
    }

    return suggestions.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  getNextToolSuggestions(context: ChainContext): Array<{
    tool_name: string;
    purpose: string;
    confidence: number;
    parameters: Record<string, any>;
  }> {
    const suggestions: Array<{
      tool_name: string;
      purpose: string;
      confidence: number;
      parameters: Record<string, any>;
    }> = [];

    // Get tools that work well with current tool
    const relatedTools = this.toolRelationships.get(context.current_tool) || [];

    for (const toolName of relatedTools) {
      // Skip if already used recently
      if (context.previous_tools.includes(toolName)) continue;

      const suggestion = this.createToolSuggestion(toolName, context);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  getChainById(chainId: string): ToolChain | null {
    return this.toolChains.get(chainId) || null;
  }

  getAvailableChains(): Array<{
    id: string;
    name: string;
    description: string;
    difficulty: string;
    estimated_time: string;
    use_cases: string[];
  }> {
    return Array.from(this.toolChains.values()).map((chain) => ({
      id: chain.id,
      name: chain.name,
      description: chain.description,
      difficulty: chain.difficulty,
      estimated_time: chain.estimated_time,
      use_cases: chain.use_cases,
    }));
  }

  private calculateRelevance(chain: ToolChain, context: ChainContext): number {
    let score = 0;

    // Check if current tool is in the chain
    if (chain.steps.some((step) => step.tool_name === context.current_tool)) {
      score += 0.4;
    }

    // Check domain match
    if (context.domain) {
      const domainKeywords = {
        business: ["business", "strategy", "decision", "planning"],
        technology: ["technical", "system", "architecture", "implementation"],
        creative: ["creative", "innovation", "design", "solution"],
        personal: ["learning", "understanding", "development", "skill"],
      };

      const keywords =
        domainKeywords[context.domain as keyof typeof domainKeywords] || [];
      const chainText = (chain.name + " " + chain.description).toLowerCase();

      for (const keyword of keywords) {
        if (chainText.includes(keyword)) {
          score += 0.1;
        }
      }
    }

    // Check complexity match
    if (context.complexity !== undefined) {
      if (context.complexity > 0.7 && chain.difficulty === "advanced")
        score += 0.2;
      else if (context.complexity > 0.4 && chain.difficulty === "intermediate")
        score += 0.2;
      else if (context.complexity <= 0.4 && chain.difficulty === "beginner")
        score += 0.2;
    }

    // Check goal alignment
    if (context.user_goal) {
      const goalLower = context.user_goal.toLowerCase();
      const chainText = (
        chain.name +
        " " +
        chain.description +
        " " +
        chain.use_cases.join(" ")
      ).toLowerCase();

      if (goalLower.includes("decision") && chainText.includes("decision"))
        score += 0.3;
      if (goalLower.includes("problem") && chainText.includes("problem"))
        score += 0.3;
      if (goalLower.includes("creative") && chainText.includes("creative"))
        score += 0.3;
      if (goalLower.includes("learn") && chainText.includes("learning"))
        score += 0.3;
      if (goalLower.includes("memory") && chainText.includes("memory"))
        score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  private explainRelevance(chain: ToolChain, context: ChainContext): string {
    const reasons: string[] = [];

    if (chain.steps.some((step) => step.tool_name === context.current_tool)) {
      reasons.push(`Builds on your current use of ${context.current_tool}`);
    }

    if (
      context.domain &&
      chain.description.toLowerCase().includes(context.domain)
    ) {
      reasons.push(`Matches your ${context.domain} domain`);
    }

    if (context.complexity !== undefined) {
      if (context.complexity > 0.7 && chain.difficulty === "advanced") {
        reasons.push("Suitable for complex problems");
      } else if (context.complexity <= 0.4 && chain.difficulty === "beginner") {
        reasons.push("Good for straightforward problems");
      }
    }

    if (context.user_goal) {
      const goalLower = context.user_goal.toLowerCase();
      if (goalLower.includes("decision") && chain.id === "decision_making") {
        reasons.push("Specifically designed for decision making");
      }
      if (
        goalLower.includes("creative") &&
        chain.id === "creative_problem_solving"
      ) {
        reasons.push("Optimized for creative problem solving");
      }
    }

    return reasons.length > 0
      ? reasons.join("; ")
      : "General workflow that could be helpful";
  }

  private getCustomizationTips(
    _chain: ToolChain,
    context: ChainContext
  ): string[] {
    const tips: string[] = [];

    if (context.complexity !== undefined) {
      if (context.complexity > 0.7) {
        tips.push(
          "Consider increasing max_depth parameters for more thorough analysis"
        );
        tips.push("Enable metacognition for better quality control");
      } else if (context.complexity < 0.3) {
        tips.push("You might skip some steps for simpler problems");
        tips.push("Consider using presets for faster execution");
      }
    }

    if (context.domain === "business") {
      tips.push("Focus on stakeholder perspectives in parallel thinking steps");
      tips.push("Consider adding risk assessment for business decisions");
    }

    if (context.domain === "creative") {
      tips.push("Increase temperature parameters for more creative output");
      tips.push(
        "Disable coordination in parallel thinking for more diverse ideas"
      );
    }

    if (context.previous_tools.length > 3) {
      tips.push("You've used several tools - consider synthesizing insights");
      tips.push("Focus on implementation and action planning");
    }

    return tips;
  }

  private createToolSuggestion(
    toolName: string,
    _context: ChainContext
  ): {
    tool_name: string;
    purpose: string;
    confidence: number;
    parameters: Record<string, any>;
  } | null {
    const suggestions: Record<string, any> = {
      think_parallel: {
        purpose: "Examine from multiple perspectives",
        confidence: 0.8,
        parameters: { enable_coordination: true },
      },
      analyze_systematically: {
        purpose: "Apply structured thinking frameworks",
        confidence: 0.7,
        parameters: { mode: "auto" },
      },
      decompose_problem: {
        purpose: "Break down into manageable parts",
        confidence: 0.6,
        parameters: { max_depth: 3 },
      },
      think_probabilistic: {
        purpose: "Assess uncertainties and risks",
        confidence: 0.5,
        parameters: { enable_bayesian_updating: true },
      },
      think: {
        purpose: "Synthesize insights and plan next steps",
        confidence: 0.9,
        parameters: { mode: "deliberative", enable_metacognition: true },
      },
    };

    const suggestion = suggestions[toolName];
    if (!suggestion) return null;

    return {
      tool_name: toolName,
      purpose: suggestion.purpose,
      confidence: suggestion.confidence,
      parameters: suggestion.parameters,
    };
  }
}
