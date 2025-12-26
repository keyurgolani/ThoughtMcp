import { ZodSchema } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Binds Zod schemas to System Prompts to enforce structured output
 * implementation of "Schema-Prompt Binding" pattern
 */
export class PromptBinder {
  /**
   * Bind a Zod schema to a system prompt template
   * Returns validation-ready system prompt
   */
  static bindSchemaToPrompt(systemPrompt: string, schema: ZodSchema): string {
    // @ts-ignore - Complexity is handled, schema type is compatible in practice
    const jsonSchema = zodToJsonSchema(schema, "response");
    const schemaString = JSON.stringify(jsonSchema, null, 2);

    return `${systemPrompt}

!!! CRITICAL INSTRUCTION !!!
You must output valid JSON that strictly matches this schema:
${schemaString}

Do not include markdown formatting (like \`\`\`json) in your response. Just the raw JSON object.
`;
  }
}
