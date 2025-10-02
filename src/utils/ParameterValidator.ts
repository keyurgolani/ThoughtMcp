/**
 * Enhanced parameter validation with user-friendly error messages and guidance
 */

export interface ValidationError {
  parameter: string;
  message: string;
  suggestion: string;
  examples?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationWarning {
  parameter: string;
  message: string;
  suggestion: string;
}

export class ParameterValidator {
  /**
   * Validate think tool parameters with helpful error messages
   */
  static validateThinkParameters(
    args: Record<string, unknown>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate required input parameter
    if (!args.input) {
      errors.push({
        parameter: "input",
        message: "The 'input' parameter is required",
        suggestion: "Provide your question or problem as a string",
        examples: [
          '"Should I take this job offer?"',
          '"How can I improve my presentation skills?"',
          '"What are the pros and cons of remote work?"',
        ],
      });
    } else if (typeof args.input !== "string") {
      errors.push({
        parameter: "input",
        message: "The 'input' must be text (string)",
        suggestion: "Make sure your input is enclosed in quotes",
        examples: ['"Your question here"'],
      });
    } else if (args.input.trim().length === 0) {
      errors.push({
        parameter: "input",
        message: "The 'input' cannot be empty",
        suggestion: "Provide a meaningful question or problem to think about",
        examples: ['"What should I focus on this week?"'],
      });
    }

    // Validate mode parameter
    if (args.mode !== undefined) {
      const validModes = [
        "intuitive",
        "deliberative",
        "balanced",
        "creative",
        "analytical",
      ];
      if (!validModes.includes(args.mode as string)) {
        errors.push({
          parameter: "mode",
          message: `'${args.mode}' is not a valid thinking mode`,
          suggestion: "Choose one of the available thinking modes",
          examples: [
            '"intuitive" - for quick, instinctive responses',
            '"deliberative" - for careful, thorough analysis',
            '"creative" - for innovative, out-of-the-box ideas',
            '"analytical" - for logical, data-driven reasoning',
            '"balanced" - for general-purpose thinking (default)',
          ],
        });
      }
    }

    // Validate systematic_thinking_mode
    if (args.systematic_thinking_mode !== undefined) {
      const validSystematicModes = ["auto", "hybrid", "manual"];
      if (
        !validSystematicModes.includes(args.systematic_thinking_mode as string)
      ) {
        errors.push({
          parameter: "systematic_thinking_mode",
          message: `'${args.systematic_thinking_mode}' is not a valid systematic thinking mode`,
          suggestion: "Choose how to select thinking frameworks",
          examples: [
            '"auto" - let the system choose the best framework (recommended)',
            '"hybrid" - combine multiple frameworks',
            '"manual" - specify frameworks yourself',
          ],
        });
      }
    }

    // Validate temperature
    if (args.temperature !== undefined) {
      if (typeof args.temperature !== "number") {
        errors.push({
          parameter: "temperature",
          message: "Temperature must be a number",
          suggestion: "Use a decimal number to control creativity level",
          examples: ["0.3 (focused)", "0.7 (balanced)", "1.2 (very creative)"],
        });
      } else if (args.temperature < 0 || args.temperature > 2) {
        errors.push({
          parameter: "temperature",
          message: "Temperature must be between 0 and 2",
          suggestion:
            "Lower values = more focused, higher values = more creative",
          examples: [
            "0.3 (focused thinking)",
            "0.7 (balanced)",
            "1.2 (creative thinking)",
          ],
        });
      }
    }

    // Validate max_depth
    if (args.max_depth !== undefined) {
      if (typeof args.max_depth !== "number") {
        errors.push({
          parameter: "max_depth",
          message: "Max depth must be a number",
          suggestion: "Specify how deep to think (number of reasoning steps)",
          examples: ["5 (quick)", "10 (normal)", "15 (thorough)"],
        });
      } else if (args.max_depth < 1 || args.max_depth > 20) {
        errors.push({
          parameter: "max_depth",
          message: "Max depth must be between 1 and 20",
          suggestion: "Choose thinking depth based on problem complexity",
          examples: [
            "5 for simple questions",
            "10 for normal problems",
            "15+ for complex analysis",
          ],
        });
      }
    }

    // Add helpful warnings for parameter interactions
    if (
      args.mode === "creative" &&
      args.temperature !== undefined &&
      typeof args.temperature === "number" &&
      args.temperature < 0.8
    ) {
      warnings.push({
        parameter: "temperature",
        message: "Low temperature with creative mode may limit innovation",
        suggestion:
          "Consider using temperature 1.0 or higher for creative thinking",
      });
    }

    if (
      args.mode === "analytical" &&
      args.temperature !== undefined &&
      typeof args.temperature === "number" &&
      args.temperature > 1.0
    ) {
      warnings.push({
        parameter: "temperature",
        message: "High temperature with analytical mode may reduce precision",
        suggestion:
          "Consider using temperature 0.7 or lower for analytical thinking",
      });
    }

    if (
      args.max_depth !== undefined &&
      typeof args.max_depth === "number" &&
      args.max_depth > 15 &&
      args.mode === "intuitive"
    ) {
      warnings.push({
        parameter: "max_depth",
        message: "High depth with intuitive mode may slow down quick responses",
        suggestion: "Consider using max_depth 5-8 for intuitive thinking",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate remember tool parameters
   */
  static validateRememberParameters(
    args: Record<string, unknown>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate content
    if (!args.content) {
      errors.push({
        parameter: "content",
        message: "The 'content' parameter is required",
        suggestion: "Provide the information you want to remember",
        examples: [
          '"I learned that Python is great for data analysis"',
          '"Meeting with Sarah went well, she agreed to the proposal"',
          '"The password for the staging server is stored in 1Password"',
        ],
      });
    } else if (typeof args.content !== "string") {
      errors.push({
        parameter: "content",
        message: "Content must be text (string)",
        suggestion: "Make sure your content is enclosed in quotes",
      });
    } else if (args.content.trim().length === 0) {
      errors.push({
        parameter: "content",
        message: "Content cannot be empty",
        suggestion: "Provide meaningful information to remember",
      });
    }

    // Validate type
    if (!args.type) {
      errors.push({
        parameter: "type",
        message: "The 'type' parameter is required",
        suggestion: "Specify what kind of memory this is",
        examples: [
          '"episodic" - for specific experiences, events, conversations',
          '"semantic" - for general knowledge, facts, concepts',
        ],
      });
    } else if (!["episodic", "semantic"].includes(args.type as string)) {
      errors.push({
        parameter: "type",
        message: `'${args.type}' is not a valid memory type`,
        suggestion: "Choose between episodic and semantic memory",
        examples: [
          '"episodic" - "I had lunch with John yesterday"',
          '"semantic" - "Python is a programming language"',
        ],
      });
    }

    // Validate importance
    if (args.importance !== undefined) {
      if (typeof args.importance !== "number") {
        errors.push({
          parameter: "importance",
          message: "Importance must be a number",
          suggestion: "Use a decimal between 0 and 1 to indicate importance",
          examples: ["0.3 (casual info)", "0.7 (important)", "0.9 (critical)"],
        });
      } else if (args.importance < 0 || args.importance > 1) {
        errors.push({
          parameter: "importance",
          message: "Importance must be between 0 and 1",
          suggestion: "0 = not important, 1 = extremely important",
          examples: [
            "0.3 for casual information",
            "0.7 for important facts",
            "0.9+ for critical information",
          ],
        });
      }
    }

    // Validate emotional_tags
    if (args.emotional_tags !== undefined) {
      if (!Array.isArray(args.emotional_tags)) {
        errors.push({
          parameter: "emotional_tags",
          message: "Emotional tags must be an array",
          suggestion: "Provide a list of emotions associated with this memory",
          examples: [
            '["positive", "exciting"]',
            '["concerning", "urgent"]',
            '["neutral"]',
          ],
        });
      } else {
        const invalidTags = (args.emotional_tags as unknown[]).filter(
          (tag) => typeof tag !== "string"
        );
        if (invalidTags.length > 0) {
          errors.push({
            parameter: "emotional_tags",
            message: "All emotional tags must be text",
            suggestion: "Use descriptive words for emotions",
            examples: ['"positive"', '"exciting"', '"concerning"', '"neutral"'],
          });
        }
      }
    }

    // Add helpful warnings
    if (
      args.type === "semantic" &&
      args.emotional_tags &&
      (args.emotional_tags as string[]).length > 0
    ) {
      warnings.push({
        parameter: "emotional_tags",
        message: "Emotional tags are more useful for episodic memories",
        suggestion:
          "Consider if this should be episodic memory instead, or remove emotional tags",
      });
    }

    if (args.importance === undefined) {
      warnings.push({
        parameter: "importance",
        message: "No importance specified, using default (0.5)",
        suggestion:
          "Consider setting importance: 0.3 for casual info, 0.7 for important, 0.9+ for critical",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate recall tool parameters
   */
  static validateRecallParameters(
    args: Record<string, unknown>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate cue
    if (!args.cue) {
      errors.push({
        parameter: "cue",
        message: "The 'cue' parameter is required",
        suggestion:
          "Provide keywords or description of what you're looking for",
        examples: [
          '"Python programming tips"',
          '"meeting with Sarah"',
          '"password for staging server"',
        ],
      });
    } else if (typeof args.cue !== "string") {
      errors.push({
        parameter: "cue",
        message: "Cue must be text (string)",
        suggestion: "Describe what you're trying to remember",
      });
    } else if (args.cue.trim().length === 0) {
      errors.push({
        parameter: "cue",
        message: "Cue cannot be empty",
        suggestion:
          "Provide keywords or description of what you're looking for",
      });
    }

    // Validate type
    if (args.type !== undefined) {
      const validTypes = ["episodic", "semantic", "both"];
      if (!validTypes.includes(args.type as string)) {
        errors.push({
          parameter: "type",
          message: `'${args.type}' is not a valid memory type`,
          suggestion: "Choose what type of memories to search",
          examples: [
            '"episodic" - search experiences and events',
            '"semantic" - search facts and knowledge',
            '"both" - search all memories (default)',
          ],
        });
      }
    }

    // Validate threshold
    if (args.threshold !== undefined) {
      if (typeof args.threshold !== "number") {
        errors.push({
          parameter: "threshold",
          message: "Threshold must be a number",
          suggestion: "Set how closely related results need to be (0-1)",
          examples: [
            "0.2 (loose matches)",
            "0.5 (good matches)",
            "0.8 (very similar)",
          ],
        });
      } else if (args.threshold < 0 || args.threshold > 1) {
        errors.push({
          parameter: "threshold",
          message: "Threshold must be between 0 and 1",
          suggestion: "Lower = more results, higher = more precise matches",
          examples: [
            "0.2 for broad search",
            "0.5 for balanced",
            "0.8 for precise matches",
          ],
        });
      }
    }

    // Validate max_results
    if (args.max_results !== undefined) {
      if (typeof args.max_results !== "number") {
        errors.push({
          parameter: "max_results",
          message: "Max results must be a number",
          suggestion: "Specify how many memories to return",
          examples: [
            "5 for quick overview",
            "10 for normal search",
            "20 for comprehensive",
          ],
        });
      } else if (args.max_results < 1 || args.max_results > 50) {
        errors.push({
          parameter: "max_results",
          message: "Max results must be between 1 and 50",
          suggestion: "Choose based on how many results you want to review",
          examples: ["5-10 for quick search", "20-30 for thorough search"],
        });
      }
    }

    // Add helpful warnings
    if (
      args.threshold !== undefined &&
      typeof args.threshold === "number" &&
      args.threshold > 0.8
    ) {
      warnings.push({
        parameter: "threshold",
        message: "High threshold may return very few results",
        suggestion:
          "Consider lowering threshold to 0.5-0.7 if you get no results",
      });
    }

    if (
      args.max_results !== undefined &&
      typeof args.max_results === "number" &&
      args.max_results > 20
    ) {
      warnings.push({
        parameter: "max_results",
        message: "Large number of results may be overwhelming",
        suggestion:
          "Consider starting with 10-15 results and increasing if needed",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Format validation errors into user-friendly messages
   */
  static formatValidationErrors(
    result: ValidationResult,
    toolName: string
  ): string {
    if (result.isValid) {
      return "";
    }

    let message = `❌ Parameter validation failed for '${toolName}' tool:\n\n`;

    result.errors.forEach((error, index) => {
      message += `${index + 1}. **${error.parameter}**: ${error.message}\n`;
      message += `   💡 ${error.suggestion}\n`;

      if (error.examples && error.examples.length > 0) {
        message += `   📝 Examples:\n`;
        error.examples.forEach((example) => {
          message += `      • ${example}\n`;
        });
      }
      message += `\n`;
    });

    if (result.warnings.length > 0) {
      message += `⚠️ Warnings:\n\n`;
      result.warnings.forEach((warning, index) => {
        message += `${index + 1}. **${warning.parameter}**: ${
          warning.message
        }\n`;
        message += `   💡 ${warning.suggestion}\n\n`;
      });
    }

    return message;
  }

  /**
   * Format validation warnings into user-friendly messages
   */
  static formatValidationWarnings(result: ValidationResult): string {
    if (result.warnings.length === 0) {
      return "";
    }

    let message = `⚠️ Parameter suggestions:\n\n`;

    result.warnings.forEach((warning, index) => {
      message += `${index + 1}. **${warning.parameter}**: ${warning.message}\n`;
      message += `   💡 ${warning.suggestion}\n\n`;
    });

    return message;
  }
}
