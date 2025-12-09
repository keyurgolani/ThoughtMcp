/**
 * Query Parser for Full-Text Search
 *
 * Parses and sanitizes user queries for PostgreSQL ts_query format.
 * Handles boolean operators, phrase queries, and special characters.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { SearchValidationError, type ParsedQuery } from "./types";

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
   * @returns Parsed ts_query string (for backward compatibility)
   * @throws SearchValidationError if query is invalid
   */
  parse(query: string, _language: string = "english"): string {
    return this.parseQuery(query, _language).tsQuery;
  }

  /**
   * Parse user query to structured ParsedQuery with include/exclude terms
   *
   * @param query - User query string
   * @param _language - Text search language (default: 'english') - currently unused
   * @returns ParsedQuery with tsQuery, includeTerms, and excludeTerms
   * @throws SearchValidationError if query is invalid
   */
  parseQuery(query: string, _language: string = "english"): ParsedQuery {
    // Validate query
    this.validate(query);

    // Sanitize query
    let sanitized = this.sanitize(query);

    // Extract NOT terms before conversion (handles both "NOT term" and "!term")
    const { includeTerms, excludeTerms } = this.extractNotTerms(sanitized);

    // Convert "NOT " to "!" for ts_query format (case insensitive)
    sanitized = this.convertNotOperator(sanitized);

    // Handle phrase queries first (before other operators)
    // Use placeholder to protect phrases from operator insertion
    sanitized = this.handlePhrases(sanitized);

    // Convert boolean operators (but not within phrases)
    sanitized = this.convertBooleanOperators(sanitized);

    // Restore phrase markers
    sanitized = sanitized.replace(/__PHRASE__/g, "");

    // Clean up whitespace
    sanitized = sanitized.trim().replace(/\s+/g, " ");

    return {
      tsQuery: sanitized,
      includeTerms,
      excludeTerms,
    };
  }

  /**
   * Convert "NOT " keyword to "& !" operator for ts_query format
   *
   * PostgreSQL tsquery requires NOT (!) to be preceded by an AND (&) operator
   * unless it's at the start of the query or after OR (|) or opening parenthesis.
   *
   * @param query - Query string with potential NOT keywords
   * @returns Query string with NOT converted to & !term (no space between ! and term)
   */
  private convertNotOperator(query: string): string {
    // First convert AND/OR keywords to operators to avoid treating them as words
    let result = query.replace(/\bAND\b/gi, "&");
    result = result.replace(/\bOR\b/gi, "|");

    // Now handle NOT conversions iteratively to catch all occurrences
    // Keep converting until no more changes (handles multiple NOTs)
    let previous = "";
    while (previous !== result) {
      previous = result;

      // Case 1: NOT at start of query -> !term
      result = result.replace(/^\s*NOT\s+(\S+)/gi, "!$1");

      // Case 2: After | operator -> | !term
      result = result.replace(/\|\s*NOT\s+(\S+)/gi, "| !$1");

      // Case 3: After & operator -> & !term
      result = result.replace(/&\s*NOT\s+(\S+)/gi, "& !$1");

      // Case 4: After opening parenthesis -> (!term
      result = result.replace(/\(\s*NOT\s+(\S+)/gi, "(!$1");

      // Case 5: After !term followed by NOT -> !term & !nextterm
      result = result.replace(/(!\S+)\s+NOT\s+(\S+)/gi, "$1 & !$2");

      // Case 6: Word followed by NOT (implicit AND needed) -> word & !term
      result = result.replace(/(\w+)\s+NOT\s+(\S+)/gi, "$1 & !$2");
    }

    return result;
  }

  /**
   * Extract include and exclude terms from query
   *
   * Identifies terms prefixed with NOT or ! as exclude terms.
   * All other terms are include terms.
   *
   * @param query - Sanitized query string
   * @returns Object with includeTerms and excludeTerms arrays
   */
  private extractNotTerms(query: string): { includeTerms: string[]; excludeTerms: string[] } {
    const includeTerms: string[] = [];
    const excludeTerms: string[] = [];

    // First, convert NOT to ! for consistent processing
    const normalizedQuery = query.replace(/\bNOT\s+/gi, "!");

    // Extract terms, tracking which are negated
    // Match: !term, !"phrase", or regular terms
    const termPattern = /(!?)(?:"([^"]+)"|(\S+))/g;
    let match;

    while ((match = termPattern.exec(normalizedQuery)) !== null) {
      const isNegated = match[1] === "!";
      // Get the term (either quoted phrase or single word)
      let term = (match[2] || match[3] || "").toLowerCase();

      // Remove parentheses from term
      term = term.replace(/[()]/g, "");

      // Skip operators and empty terms
      // Filter both symbol forms (&, |, !) and word forms (and, or)
      // Note: "not" is already handled separately above
      if (!term || ["&", "|", "!", "and", "or"].includes(term)) {
        continue;
      }

      // Skip if term is just "not" (the operator itself)
      if (term === "not") {
        continue;
      }

      if (isNegated) {
        // Split phrase into individual words for excludeTerms
        const words = term
          .split(/\s+/)
          .filter((w) => w.length > 0)
          .map((w) => w.replace(/[()]/g, ""));
        excludeTerms.push(...words);
      } else {
        // Split phrase into individual words for includeTerms
        const words = term
          .split(/\s+/)
          .filter((w) => w.length > 0)
          .map((w) => w.replace(/[()]/g, ""));
        includeTerms.push(...words);
      }
    }

    // Remove duplicates
    return {
      includeTerms: Array.from(new Set(includeTerms)),
      excludeTerms: Array.from(new Set(excludeTerms)),
    };
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
    // For & | ( ) - add space on both sides
    converted = converted.replace(/\s*([&|()])s*/g, " $1 ");
    // For ! - add space before but NOT after (! must be attached to term)
    converted = converted.replace(/\s*!\s*/g, " !");
    // For ) - ensure space after
    converted = converted.replace(/\)\s*/g, ") ");
    // Clean up multiple spaces
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
   * Extract individual search terms from query (excludes NOT terms)
   *
   * Useful for highlighting and matched terms extraction.
   * Only returns terms that should be matched (not negated terms).
   *
   * @param query - Original query string (not parsed)
   * @returns Array of search terms (excluding NOT terms)
   */
  extractTerms(query: string): string[] {
    // Sanitize first to handle special characters
    const sanitized = this.sanitize(query);

    // Use extractNotTerms to get only include terms
    const { includeTerms } = this.extractNotTerms(sanitized);

    return includeTerms;
  }

  /**
   * Extract all terms from a parsed ts_query string
   *
   * This extracts all terms from the ts_query format, including negated ones.
   * Used internally for backward compatibility.
   *
   * @param tsQuery - Parsed ts_query string
   * @returns Array of all terms in the query
   */
  extractAllTerms(tsQuery: string): string[] {
    // Remove operators, parentheses, and phrase markers
    const cleaned = tsQuery.replace(/[&|!()<>-]|__PHRASE__/g, " ");

    // Split into words and remove duplicates
    const words = cleaned
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => w.toLowerCase());

    return Array.from(new Set(words));
  }

  /**
   * Extract only the excluded (NOT) terms from a query
   *
   * @param query - Original query string
   * @returns Array of excluded terms
   */
  extractExcludeTerms(query: string): string[] {
    // Sanitize first to handle special characters
    const sanitized = this.sanitize(query);

    // Use extractNotTerms to get only exclude terms
    const { excludeTerms } = this.extractNotTerms(sanitized);

    return excludeTerms;
  }
}
