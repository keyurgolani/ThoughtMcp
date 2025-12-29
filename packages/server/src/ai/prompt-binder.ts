import {
  ZodArray,
  ZodBoolean,
  ZodDefault,
  ZodEnum,
  ZodLiteral,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodSchema,
  ZodString,
  ZodUnion,
} from "zod";

/**
 * Binds Zod schemas to System Prompts to enforce structured output
 * Implementation of "Schema-Prompt Binding" pattern
 *
 * Uses natural language descriptions instead of full JSON schemas
 * for better compatibility with smaller LLMs (llama3.2:1b, phi4-mini, etc.)
 */
export class PromptBinder {
  /**
   * Bind a Zod schema to a system prompt template
   * Uses natural language description for better compatibility with smaller models
   *
   * @param systemPrompt - The base system prompt
   * @param schema - Zod schema defining expected output structure
   * @returns Combined prompt with output format instructions
   */
  static bindSchemaToPrompt(systemPrompt: string, schema: ZodSchema): string {
    const description = this.schemaToNaturalLanguage(schema);

    return `${systemPrompt}

OUTPUT FORMAT:
${description}

IMPORTANT: Output ONLY the JSON object. No markdown formatting, no explanation, no code blocks. Just raw JSON.
`;
  }

  /**
   * Convert Zod schema to natural language description
   * Produces human-readable format instructions that smaller LLMs can follow
   *
   * @param schema - Zod schema to convert
   * @param indent - Current indentation level
   * @returns Natural language description of the schema
   */
  static schemaToNaturalLanguage(schema: ZodSchema, indent: number = 0): string {
    const prefix = "  ".repeat(indent);

    // Handle ZodObject
    if (schema instanceof ZodObject) {
      const shape = schema.shape;
      const lines: string[] = [];

      if (indent === 0) {
        lines.push("Your response must be a JSON object with these fields:");
      }

      for (const [key, value] of Object.entries(shape)) {
        const fieldDesc = this.describeField(key, value as ZodSchema, indent + 1);
        lines.push(fieldDesc);
      }

      return lines.join("\n");
    }

    // Handle ZodArray
    if (schema instanceof ZodArray) {
      const elementDesc = this.getTypeDescription(schema.element);
      return `${prefix}array of ${elementDesc}`;
    }

    // Fallback for other types
    return `${prefix}${this.getTypeDescription(schema)}`;
  }

  /**
   * Describe a single field in natural language
   *
   * @param key - Field name
   * @param schema - Field's Zod schema
   * @param indent - Current indentation level
   * @returns Natural language description of the field
   */
  private static describeField(key: string, schema: ZodSchema, indent: number): string {
    const prefix = "  ".repeat(indent);
    const typeDesc = this.getTypeDescription(schema);
    const description = this.getSchemaDescription(schema);
    const constraints = this.getConstraints(schema);

    let line = `${prefix}- "${key}": ${typeDesc}`;

    if (description) {
      line = `${line} (${description})`;
    }

    if (constraints) {
      line = `${line} ${constraints}`;
    }

    // Handle nested objects
    if (schema instanceof ZodObject) {
      line = `${line}\n${this.describeNestedObject(schema, indent + 1)}`;
    }

    // Handle arrays of objects
    if (schema instanceof ZodArray && schema.element instanceof ZodObject) {
      line = `${line}\n${this.describeNestedObject(schema.element, indent + 1)}`;
    }

    return line;
  }

  /**
   * Describe a nested object's fields
   *
   * @param schema - ZodObject schema
   * @param indent - Current indentation level
   * @returns Description of nested fields
   */
  private static describeNestedObject(
    schema: ZodObject<Record<string, ZodSchema>>,
    indent: number
  ): string {
    const prefix = "  ".repeat(indent);
    const lines: string[] = [`${prefix}Each object has:`];

    for (const [key, value] of Object.entries(schema.shape)) {
      const zodValue = value;
      const typeDesc = this.getTypeDescription(zodValue);
      const description = this.getSchemaDescription(zodValue);
      const constraints = this.getConstraints(zodValue);

      let fieldLine = `${prefix}  - "${key}": ${typeDesc}`;
      if (description) {
        fieldLine = `${fieldLine} (${description})`;
      }
      if (constraints) {
        fieldLine = `${fieldLine} ${constraints}`;
      }
      lines.push(fieldLine);
    }

    return lines.join("\n");
  }

  /**
   * Get a human-readable type description
   *
   * @param schema - Zod schema
   * @returns Type description string
   */
  private static getTypeDescription(schema: ZodSchema): string {
    // Unwrap optional/default/nullable
    let innerSchema = schema;
    let isOptional = false;

    if (schema instanceof ZodOptional) {
      innerSchema = schema.unwrap();
      isOptional = true;
    } else if (schema instanceof ZodDefault) {
      innerSchema = schema._def.innerType;
    } else if (schema instanceof ZodNullable) {
      innerSchema = schema.unwrap();
      isOptional = true;
    }

    let typeStr = "";

    if (innerSchema instanceof ZodString) {
      typeStr = "string";
    } else if (innerSchema instanceof ZodNumber) {
      typeStr = "number";
    } else if (innerSchema instanceof ZodBoolean) {
      typeStr = "boolean";
    } else if (innerSchema instanceof ZodArray) {
      const elementType = this.getTypeDescription(innerSchema.element);
      typeStr = `array of ${elementType}`;
    } else if (innerSchema instanceof ZodObject) {
      typeStr = "object";
    } else if (innerSchema instanceof ZodEnum) {
      const values = innerSchema._def.values;
      typeStr = `one of: ${values.map((v: string) => `"${v}"`).join(", ")}`;
    } else if (innerSchema instanceof ZodUnion) {
      const options = innerSchema._def.options;
      const types = options.map((opt: ZodSchema) => this.getTypeDescription(opt));
      typeStr = types.join(" or ");
    } else if (innerSchema instanceof ZodLiteral) {
      typeStr = `"${innerSchema._def.value}"`;
    } else {
      typeStr = "value";
    }

    return isOptional ? `${typeStr} (optional)` : typeStr;
  }

  /**
   * Extract description from schema if available
   *
   * @param schema - Zod schema
   * @returns Description string or empty string
   */
  private static getSchemaDescription(schema: ZodSchema): string {
    // Access the description from the schema's definition
    const def = schema._def;
    if (def && typeof def === "object" && "description" in def) {
      return def.description as string;
    }
    return "";
  }

  /**
   * Get constraint descriptions (min, max, etc.)
   *
   * @param schema - Zod schema
   * @returns Constraint description string
   */
  private static getConstraints(schema: ZodSchema): string {
    const constraints: string[] = [];

    // Unwrap optional/default/nullable to get actual constraints
    let innerSchema = schema;
    if (schema instanceof ZodOptional) {
      innerSchema = schema.unwrap();
    } else if (schema instanceof ZodDefault) {
      innerSchema = schema._def.innerType;
    } else if (schema instanceof ZodNullable) {
      innerSchema = schema.unwrap();
    }

    if (innerSchema instanceof ZodNumber) {
      const checks = innerSchema._def.checks || [];
      for (const check of checks) {
        if (check.kind === "min") {
          constraints.push(`min: ${check.value}`);
        } else if (check.kind === "max") {
          constraints.push(`max: ${check.value}`);
        }
      }
    }

    if (innerSchema instanceof ZodString) {
      const checks = innerSchema._def.checks || [];
      for (const check of checks) {
        if (check.kind === "min") {
          constraints.push(`min length: ${check.value}`);
        } else if (check.kind === "max") {
          constraints.push(`max length: ${check.value}`);
        }
      }
    }

    return constraints.length > 0 ? `[${constraints.join(", ")}]` : "";
  }
}
