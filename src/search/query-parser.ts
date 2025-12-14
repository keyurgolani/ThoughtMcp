/**
 * Query Parser for Full-Text Search
 *
 * Parses and sanitizes user queries for PostgreSQL ts_query format.
 * Handles boolean operators, phrase queries, and special characters.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { SearchValidationError } from "./types";

/**
 * Query parser for converting natural language queries to PostgreSQL ts_query format
 */
export class QueryParser {
  private readonly maxQueryLength: number;
  // Control characters to remove: null bytes (0x00), control chars (0x01-0x1F), and DEL (0x7F)
  private readonly CONTROL_CHARS_PATTERN: RegExp;

  constructor(maxQueryLength: number = 1000) {
    this.maxQueryLength = maxQueryLength;
    // Define control character pattern explicitly to avoid eslint no-control-regex warning
    // This matches: null byte, ASCII control characters (1-31), and DEL character (127)
    this.CONTROL_CHARS_PATTERN = new RegExp(
      `${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}`,
      "g"
    );
  }

  /**
   * Parse user query to PostgreSQL ts_query format
   *
   * @param query - User query string
   * @param _language - Text search language (default: 'english') - currently unused
   * @returns Parsed ts_query string
   * @throws SearchValidationError if query is invalid
   */
  parse(query: string, _language: string = "english"): string {
    // Validate query
    this.validate(query);

    // Sanitize query
    let sanitized = this.sanitize(query);

    // Handle phrase queries first (before other operators)
    // Use placeholder to protect phrases from operator insertion
    sanitized = this.handlePhrases(sanitized);

    // Convert boolean operators (but not within phrases)
    sanitized = this.convertBooleanOperators(sanitized);

    // Restore phrase markers
    sanitized = sanitized.replace(/__PHRASE__/g, "");

    // Clean up whitespace
    sanitized = sanitized.trim().replace(/\s+/g, " ");

    return sanitized;
  }

  /**
   * Validate query syntax and constraints
   *
   * @param query - Query string to validate
   * @throws SearchValidationError if query is invalid
   */
  validate(query: string): void {
    if (!query || typeof query !== "string") {
      throw new SearchValidationError("Query must be a non-empty string", "query", query);
    }

    if (query.trim().length === 0) {
      throw new SearchValidationError("Query cannot be empty", "query", query);
    }

    if (query.length > this.maxQueryLength) {
      throw new SearchValidationError(
        `Query exceeds maximum length of ${this.maxQueryLength} characters`,
        "query",
        query
      );
    }
  }

  /**
   * Sanitize query by removing/escaping dangerous characters
   *
   * @param query - Query string to sanitize
   * @returns Sanitized query string
   */
  sanitize(query: string): string {
    // Remove null bytes and control characters using explicit pattern
    let sanitized = query.replace(this.CONTROL_CHARS_PATTERN, "");

    // Handle special programming language names (C++, C#, etc.)
    // Convert to searchable terms
    sanitized = sanitized.replace(/C\+\+/gi, "cplusplus");
    sanitized = sanitized.replace(/C#/gi, "csharp");
    sanitized = sanitized.replace(/F#/gi, "fsharp");

    // Remove potentially dangerous SQL characters (except those used in ts_query)
    // Keep: & | ! ( ) " ' - (used in boolean operators and phrases)
    // Remove: ; @ # $ % ^ * = + [ ] { } \ / < >
    sanitized = sanitized.replace(/[;@#$%^*=+[\]{}\\/<>]/g, " ");

    return sanitized;
  }

  /**
   * Convert boolean operators to ts_query format
   *
   * Handles:
   * - Implicit AND (space between words)
   * - Explicit AND (&)
   * - OR (|)
   * - NOT (!)
   * - Grouping with parentheses
   *
   * @param query - Query string with boolean operators
   * @returns Query string in ts_query format
   */
  convertBooleanOperators(query: string): string {
    let converted = query;

    // Preserve explicit operators and parentheses
    // & → & (already correct)
    // | → | (already correct)
    // ! → ! (already correct)
    // ( ) → ( ) (already correct)

    // Handle implicit AND: convert spaces between words to &
    // But preserve spaces within phrases (marked with __PHRASE__)
    // Split by operators and parentheses to process each term
    const tokens = converted.split(/([&|!()]|__PHRASE__[^_]*__PHRASE__)/);

    const processed = tokens.map((token) => {
      // Skip operators, parentheses, and phrase markers
      if (["&", "|", "!", "(", ")"].includes(token.trim()) || token.includes("__PHRASE__")) {
        return token;
      }

      // For word sequences, add implicit AND for precision
      // Using AND ensures results contain all search terms
      const words = token
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      if (words.length > 1) {
        return words.join(" & ");
      }

      return token;
    });

    converted = processed.join("");

    // Clean up multiple operators
    converted = converted.replace(/&\s*&+/g, "&");
    converted = converted.replace(/\|\s*\|+/g, "|");

    // Clean up whitespace around operators
    converted = converted.replace(/\s*([&|!()])\s*/g, " $1 ");
    converted = converted.replace(/\s+/g, " ");

    return converted.trim();
  }

  /**
   * Handle phrase queries with quotes
   *
   * Converts "phrase query" to phrase <-> query format for ts_query
   *
   * @param query - Query string with potential phrases
   * @returns Query string with phrases converted to <-> operator
   */
  handlePhrases(query: string): string {
    // Match quoted phrases
    const phraseRegex = /"([^"]+)"/g;

    return query.replace(phraseRegex, (_match, phrase) => {
      // Split phrase into words and join with <-> operator
      const words = phrase
        .trim()
        .split(/\s+/)
        .filter((w: string) => w.length > 0);

      if (words.length === 0) {
        return "";
      }

      if (words.length === 1) {
        return words[0];
      }

      // Join words with <-> for phrase matching
      // Use markers to protect from operator insertion
      return `__PHRASE__(${words.join(" <-> ")})__PHRASE__`;
    });
  }

  /**
   * Extract individual search terms from query
   *
   * Useful for highlighting and matched terms extraction
   *
   * @param query - Parsed query string
   * @returns Array of search terms
   */
  extractTerms(query: string): string[] {
    // Remove operators, parentheses, and phrase markers
    const cleaned = query.replace(/[&|!()<>-]|__PHRASE__/g, " ");

    // Split into words and remove duplicates
    const words = cleaned
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => w.toLowerCase());

    return Array.from(new Set(words));
  }
}
