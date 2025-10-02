/**
 * Parameter Validation Helpers
 *
 * Provides real-time parameter validation with helpful suggestions,
 * auto-completion, and interactive feedback for tool parameters.
 *
 * Note: This file uses 'any' types for dynamic parameter validation.
 * TODO: Refactor to use proper generic types in future iteration.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  autoComplete?: string[];
}

export interface ParameterInfo {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: any;
  enum?: any[];
  min?: number;
  max?: number;
  pattern?: string;
  examples: string[];
  tips: string[];
  common_values?: any[];
  related_parameters?: string[];
}

export interface ParameterContext {
  tool_name: string;
  current_parameters: Record<string, any>;
  user_experience_level: "beginner" | "intermediate" | "advanced";
}

export class ParameterValidationHelper {
  private parameterInfo: Map<string, Map<string, ParameterInfo>> = new Map();

  constructor() {
    this.initializeParameterInfo();
  }

  private initializeParameterInfo(): void {
    // Think tool parameters
    this.parameterInfo.set(
      "think",
      new Map([
        [
          "input",
          {
            name: "input",
            type: "string",
            description: "Your question or problem to think about",
            required: true,
            examples: [
              "How should I approach this project?",
              "What are the pros and cons of remote work?",
              "Help me decide between these two options",
            ],
            tips: [
              "Be specific about what you want to think through",
              "Include context that might be relevant",
              "Frame as a question when possible",
            ],
            common_values: [
              "How to...",
              "What is the best way to...",
              "Should I...",
              "Help me understand...",
            ],
          },
        ],
        [
          "mode",
          {
            name: "mode",
            type: "string",
            description: "How to think about it",
            required: false,
            default: "balanced",
            enum: [
              "intuitive",
              "deliberative",
              "balanced",
              "creative",
              "analytical",
            ],
            examples: [
              "balanced - for most situations",
              "creative - for brainstorming and innovation",
              "analytical - for logical, data-driven decisions",
            ],
            tips: [
              "Use 'balanced' for general thinking",
              "Use 'creative' when you need new ideas",
              "Use 'analytical' for logical problems",
              "Use 'deliberative' for important decisions",
            ],
            common_values: ["balanced", "creative", "analytical"],
            related_parameters: ["temperature", "enable_systematic_thinking"],
          },
        ],
        [
          "temperature",
          {
            name: "temperature",
            type: "number",
            description: "Creativity level",
            required: false,
            default: 0.7,
            min: 0,
            max: 2,
            examples: [
              "0.3 - focused, conservative thinking",
              "0.7 - balanced creativity (recommended)",
              "1.2 - highly creative and exploratory",
            ],
            tips: [
              "Lower values = more focused and conservative",
              "Higher values = more creative and exploratory",
              "0.7 works well for most situations",
              "Increase for brainstorming, decrease for analysis",
            ],
            common_values: [0.3, 0.5, 0.7, 1.0, 1.2],
            related_parameters: ["mode"],
          },
        ],
      ])
    );

    // Systematic thinking parameters
    this.parameterInfo.set(
      "analyze_systematically",
      new Map([
        [
          "input",
          {
            name: "input",
            type: "string",
            description: "The problem or question to analyze systematically",
            required: true,
            examples: [
              "How can we improve customer satisfaction?",
              "What's the best approach to reduce technical debt?",
              "How should we prioritize our product roadmap?",
            ],
            tips: [
              "Frame as a clear question or challenge",
              "Include relevant context and constraints",
              "Be specific about what you want to analyze",
            ],
            common_values: [
              "How can we...",
              "What is the best way to...",
              "How should we approach...",
              "What factors should we consider for...",
            ],
          },
        ],
        [
          "mode",
          {
            name: "mode",
            type: "string",
            description: "Framework selection mode",
            required: false,
            default: "auto",
            enum: ["auto", "hybrid", "manual"],
            examples: [
              "auto - system chooses best framework (recommended)",
              "hybrid - system suggests, you can override",
              "manual - you choose specific framework",
            ],
            tips: [
              "Use 'auto' for most situations",
              "Use 'hybrid' if you have framework preferences",
              "Use 'manual' only if you know specific frameworks",
            ],
            common_values: ["auto", "hybrid"],
          },
        ],
      ])
    );

    // Memory tools parameters
    this.parameterInfo.set(
      "optimize_memory",
      new Map([
        [
          "optimization_mode",
          {
            name: "optimization_mode",
            type: "string",
            description: "Cleanup level",
            required: false,
            default: "moderate",
            enum: ["conservative", "moderate", "aggressive"],
            examples: [
              "conservative - minimal changes, very safe",
              "moderate - balanced cleanup (recommended)",
              "aggressive - maximum cleanup for performance",
            ],
            tips: [
              "Start with 'moderate' for most situations",
              "Use 'conservative' if you're concerned about data loss",
              "Use 'aggressive' only when performance is critical",
            ],
            common_values: ["moderate", "conservative"],
            related_parameters: [
              "target_memory_reduction",
              "preserve_important_memories",
            ],
          },
        ],
        [
          "target_memory_reduction",
          {
            name: "target_memory_reduction",
            type: "number",
            description: "Percentage of memory to optimize",
            required: false,
            default: 0.1,
            min: 0,
            max: 0.5,
            examples: [
              "0.1 - optimize 10% (recommended)",
              "0.2 - optimize 20% (moderate)",
              "0.3 - optimize 30% (aggressive)",
            ],
            tips: [
              "Start with 10% (0.1) for safety",
              "Higher values free more space but increase risk",
              "Never exceed 50% (0.5) in a single operation",
            ],
            common_values: [0.1, 0.15, 0.2, 0.25],
          },
        ],
      ])
    );

    // Forgetting policy parameters
    this.parameterInfo.set(
      "forgetting_policy",
      new Map([
        [
          "action",
          {
            name: "action",
            type: "string",
            description: "What to do with forgetting policies",
            required: true,
            enum: [
              "list",
              "get",
              "create",
              "update",
              "delete",
              "evaluate",
              "import",
              "export",
              "list_presets",
              "use_preset",
            ],
            examples: [
              "list_presets - see easy preset options (recommended for beginners)",
              "use_preset - apply a preset policy",
              "list - see existing policies",
              "create - make a custom policy",
            ],
            tips: [
              "Start with 'list_presets' to see easy options",
              "Use 'use_preset' to apply a preset",
              "Use 'list' to see what policies you have",
              "Advanced users can 'create' custom policies",
            ],
            common_values: ["list_presets", "use_preset", "list"],
          },
        ],
        [
          "preset_id",
          {
            name: "preset_id",
            type: "string",
            description: "Easy preset to use",
            required: false,
            enum: [
              "conservative",
              "balanced",
              "aggressive",
              "minimal",
              "privacy_focused",
            ],
            examples: [
              "conservative - safest option, keeps almost everything",
              "balanced - recommended for most users",
              "aggressive - maximum performance optimization",
              "privacy_focused - enhanced security and privacy",
            ],
            tips: [
              "Use 'balanced' for most situations",
              "Use 'conservative' if you're new to memory management",
              "Use 'privacy_focused' for sensitive data",
              "Use 'aggressive' only when performance is critical",
            ],
            common_values: ["balanced", "conservative", "privacy_focused"],
            related_parameters: ["action"],
          },
        ],
      ])
    );
  }

  validateParameter(
    toolName: string,
    parameterName: string,
    value: any,
    context: ParameterContext
  ): ValidationResult {
    const toolParams = this.parameterInfo.get(toolName);
    if (!toolParams) {
      return {
        isValid: false,
        errors: [`Unknown tool: ${toolName}`],
        warnings: [],
        suggestions: [],
      };
    }

    const paramInfo = toolParams.get(parameterName);
    if (!paramInfo) {
      return {
        isValid: false,
        errors: [`Unknown parameter: ${parameterName}`],
        warnings: [],
        suggestions: this.suggestSimilarParameters(toolName, parameterName),
      };
    }

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Required validation
    if (
      paramInfo.required &&
      (value === null || value === undefined || value === "")
    ) {
      result.isValid = false;
      result.errors.push(`${parameterName} is required`);
      result.suggestions.push(...this.getSuggestions(paramInfo, context));
      return result;
    }

    // Skip further validation if value is empty and not required
    if (
      !paramInfo.required &&
      (value === null || value === undefined || value === "")
    ) {
      result.suggestions.push(`Optional parameter. ${paramInfo.description}`);
      if (paramInfo.default !== undefined) {
        result.suggestions.push(`Default value: ${paramInfo.default}`);
      }
      return result;
    }

    // Type validation
    if (!this.validateType(value, paramInfo.type)) {
      result.isValid = false;
      result.errors.push(`${parameterName} must be of type ${paramInfo.type}`);
      return result;
    }

    // Enum validation
    if (paramInfo.enum && !paramInfo.enum.includes(value)) {
      result.isValid = false;
      result.errors.push(
        `${parameterName} must be one of: ${paramInfo.enum.join(", ")}`
      );
      result.suggestions.push(
        ...paramInfo.enum.map(
          (v) => `${v} - ${this.getEnumDescription(paramInfo, v)}`
        )
      );
      return result;
    }

    // Range validation
    if (typeof value === "number") {
      if (paramInfo.min !== undefined && value < paramInfo.min) {
        result.isValid = false;
        result.errors.push(
          `${parameterName} must be at least ${paramInfo.min}`
        );
      }
      if (paramInfo.max !== undefined && value > paramInfo.max) {
        result.isValid = false;
        result.errors.push(`${parameterName} must be at most ${paramInfo.max}`);
      }
    }

    // String length validation
    if (typeof value === "string") {
      if (paramInfo.min !== undefined && value.length < paramInfo.min) {
        result.isValid = false;
        result.errors.push(
          `${parameterName} must be at least ${paramInfo.min} characters`
        );
      }
      if (paramInfo.max !== undefined && value.length > paramInfo.max) {
        result.isValid = false;
        result.errors.push(
          `${parameterName} must be at most ${paramInfo.max} characters`
        );
      }
    }

    // Pattern validation
    if (typeof value === "string" && paramInfo.pattern) {
      if (!new RegExp(paramInfo.pattern).test(value)) {
        result.isValid = false;
        result.errors.push(`${parameterName} format is invalid`);
      }
    }

    // Add warnings and suggestions for valid values
    if (result.isValid) {
      this.addContextualWarnings(result, paramInfo, value, context);
      this.addContextualSuggestions(result, paramInfo, value, context);
    }

    return result;
  }

  getParameterInfo(
    toolName: string,
    parameterName: string
  ): ParameterInfo | null {
    const toolParams = this.parameterInfo.get(toolName);
    return toolParams?.get(parameterName) || null;
  }

  getAutoComplete(
    toolName: string,
    parameterName: string,
    partialValue: string,
    _context: ParameterContext
  ): string[] {
    const paramInfo = this.getParameterInfo(toolName, parameterName);
    if (!paramInfo) return [];

    const suggestions: string[] = [];

    // Add enum values
    if (paramInfo.enum) {
      suggestions.push(
        ...paramInfo.enum.filter((v) =>
          v.toString().toLowerCase().includes(partialValue.toLowerCase())
        )
      );
    }

    // Add common values
    if (paramInfo.common_values) {
      suggestions.push(
        ...paramInfo.common_values.filter((v) =>
          v.toString().toLowerCase().includes(partialValue.toLowerCase())
        )
      );
    }

    // Add examples that match
    suggestions.push(
      ...paramInfo.examples.filter((ex) =>
        ex.toLowerCase().includes(partialValue.toLowerCase())
      )
    );

    return [...new Set(suggestions)].slice(0, 10); // Remove duplicates and limit
  }

  validateParameterCombination(
    toolName: string,
    parameters: Record<string, any>,
    context: ParameterContext
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Tool-specific combination validation
    switch (toolName) {
      case "think":
        this.validateThinkCombination(parameters, result, context);
        break;
      case "optimize_memory":
        this.validateOptimizeMemoryCombination(parameters, result, context);
        break;
      case "forgetting_policy":
        this.validateForgettingPolicyCombination(parameters, result, context);
        break;
    }

    return result;
  }

  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number" && !isNaN(value);
      case "boolean":
        return typeof value === "boolean";
      case "array":
        return Array.isArray(value);
      case "object":
        return (
          typeof value === "object" && value !== null && !Array.isArray(value)
        );
      default:
        return true;
    }
  }

  private getEnumDescription(paramInfo: ParameterInfo, value: any): string {
    const example = paramInfo.examples.find((ex) =>
      ex.includes(value.toString())
    );
    return example ? example.split(" - ")[1] || "" : "";
  }

  private getSuggestions(
    paramInfo: ParameterInfo,
    context: ParameterContext
  ): string[] {
    const suggestions: string[] = [];

    if (paramInfo.examples.length > 0) {
      suggestions.push("Examples:");
      suggestions.push(...paramInfo.examples.slice(0, 3));
    }

    if (
      context.user_experience_level === "beginner" &&
      paramInfo.tips.length > 0
    ) {
      suggestions.push("Tips:");
      suggestions.push(...paramInfo.tips.slice(0, 2));
    }

    return suggestions;
  }

  private addContextualWarnings(
    result: ValidationResult,
    paramInfo: ParameterInfo,
    value: any,
    context: ParameterContext
  ): void {
    // Add warnings based on parameter relationships
    if (paramInfo.related_parameters) {
      for (const relatedParam of paramInfo.related_parameters) {
        const relatedValue = context.current_parameters[relatedParam];
        if (relatedValue !== undefined) {
          const warning = this.checkParameterInteraction(
            paramInfo.name,
            value,
            relatedParam,
            relatedValue
          );
          if (warning) {
            result.warnings.push(warning);
          }
        }
      }
    }

    // Experience level warnings
    if (context.user_experience_level === "beginner") {
      if (paramInfo.name === "temperature" && (value < 0.3 || value > 1.2)) {
        result.warnings.push(
          "Extreme temperature values can produce unexpected results"
        );
      }
      if (paramInfo.name === "optimization_mode" && value === "aggressive") {
        result.warnings.push(
          "Aggressive mode can remove important memories - consider 'moderate' first"
        );
      }
    }
  }

  private addContextualSuggestions(
    result: ValidationResult,
    paramInfo: ParameterInfo,
    value: any,
    context: ParameterContext
  ): void {
    // Add helpful suggestions based on the current value
    if (paramInfo.name === "mode" && value === "balanced") {
      result.suggestions.push(
        "Good choice! Balanced mode works well for most situations"
      );
    }

    if (paramInfo.name === "optimization_mode" && value === "moderate") {
      result.suggestions.push(
        "Recommended setting - provides good balance of safety and performance"
      );
    }

    // Suggest related parameters
    if (
      paramInfo.related_parameters &&
      context.user_experience_level !== "advanced"
    ) {
      const unsetRelated = paramInfo.related_parameters.filter(
        (p) => context.current_parameters[p] === undefined
      );
      if (unsetRelated.length > 0) {
        result.suggestions.push(
          `Consider also setting: ${unsetRelated.join(", ")}`
        );
      }
    }
  }

  private checkParameterInteraction(
    param1: string,
    value1: any,
    param2: string,
    value2: any
  ): string | null {
    // Check for conflicting parameter combinations
    if (param1 === "mode" && param2 === "temperature") {
      if (value1 === "analytical" && value2 > 1.0) {
        return "High temperature with analytical mode may reduce logical consistency";
      }
      if (value1 === "creative" && value2 < 0.5) {
        return "Low temperature with creative mode may limit idea generation";
      }
    }

    if (
      param1 === "optimization_mode" &&
      param2 === "target_memory_reduction"
    ) {
      if (value1 === "conservative" && value2 > 0.2) {
        return "High memory reduction with conservative mode may be contradictory";
      }
      if (value1 === "aggressive" && value2 < 0.2) {
        return "Low memory reduction with aggressive mode may not provide expected benefits";
      }
    }

    return null;
  }

  private validateThinkCombination(
    parameters: Record<string, any>,
    result: ValidationResult,
    _context: ParameterContext
  ): void {
    const mode = parameters.mode;
    const temperature = parameters.temperature;
    const enableSystematic = parameters.enable_systematic_thinking;

    if (mode === "creative" && enableSystematic === false) {
      result.warnings.push(
        "Disabling systematic thinking with creative mode may limit structured creativity"
      );
    }

    if (mode === "analytical" && temperature > 1.0) {
      result.warnings.push("High temperature may reduce analytical precision");
    }
  }

  private validateOptimizeMemoryCombination(
    parameters: Record<string, any>,
    result: ValidationResult,
    context: ParameterContext
  ): void {
    const mode = parameters.optimization_mode;
    const reduction = parameters.target_memory_reduction;
    const preserveImportant = parameters.preserve_important_memories;

    if (mode === "aggressive" && preserveImportant === false) {
      result.errors.push(
        "Aggressive mode with disabled memory preservation is not recommended"
      );
    }

    if (reduction > 0.3 && context.user_experience_level === "beginner") {
      result.warnings.push(
        "High memory reduction recommended only for experienced users"
      );
    }
  }

  private validateForgettingPolicyCombination(
    parameters: Record<string, any>,
    result: ValidationResult,
    _context: ParameterContext
  ): void {
    const action = parameters.action;
    const presetId = parameters.preset_id;
    const policyId = parameters.policy_id;

    if (action === "use_preset" && !presetId) {
      result.errors.push("preset_id is required when action is 'use_preset'");
    }

    if (
      (action === "get" || action === "update" || action === "delete") &&
      !policyId
    ) {
      result.errors.push(`policy_id is required when action is '${action}'`);
    }
  }

  private suggestSimilarParameters(
    toolName: string,
    parameterName: string
  ): string[] {
    const toolParams = this.parameterInfo.get(toolName);
    if (!toolParams) return [];

    const allParams = Array.from(toolParams.keys());
    const suggestions: string[] = [];

    // Simple similarity check
    for (const param of allParams) {
      if (this.calculateSimilarity(parameterName, param) > 0.5) {
        suggestions.push(param);
      }
    }

    return suggestions.slice(0, 3);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}
