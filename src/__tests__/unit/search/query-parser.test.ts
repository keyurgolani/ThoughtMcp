/**
 * Tests for QueryParser
 *
 * Validates query parsing, sanitization, boolean operator conversion,
 * and phrase handling for full-text search.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { QueryParser } from "../../../search/query-parser";
import { SearchValidationError } from "../../../search/types";

describe("QueryParser", () => {
  let parser: QueryParser;

  beforeEach(() => {
    parser = new QueryParser();
  });

  describe("validate()", () => {
    it("should accept valid query strings", () => {
      expect(() => parser.validate("test query")).not.toThrow();
      expect(() => parser.validate("single")).not.toThrow();
    });

    it("should throw error for empty or whitespace-only string", () => {
      expect(() => parser.validate("")).toThrow(SearchValidationError);
      expect(() => parser.validate("   ")).toThrow(SearchValidationError);
    });

    it("should throw error for non-string input", () => {
      expect(() => parser.validate(null as any)).toThrow(SearchValidationError);
      expect(() => parser.validate(undefined as any)).toThrow(SearchValidationError);
      expect(() => parser.validate(123 as any)).toThrow(SearchValidationError);
    });

    it("should enforce max query length", () => {
      const shortParser = new QueryParser(10);
      expect(() => shortParser.validate("this is a very long query")).toThrow(
        SearchValidationError
      );
      expect(() => shortParser.validate("1234567890")).not.toThrow();
    });
  });

  describe("sanitize()", () => {
    it("should convert programming language names", () => {
      expect(parser.sanitize("C++ programming")).toContain("cplusplus");
      expect(parser.sanitize("C# development")).toContain("csharp");
      expect(parser.sanitize("F# functional")).toContain("fsharp");
    });

    it("should remove dangerous SQL characters", () => {
      const result = parser.sanitize("test;query@value#data$");
      expect(result).not.toContain(";");
      expect(result).not.toContain("@");
      expect(result).not.toContain("#");
      expect(result).not.toContain("$");
    });

    it("should preserve boolean operators and quotes", () => {
      const result = parser.sanitize('test & query | "phrase" ! not');
      expect(result).toContain("&");
      expect(result).toContain("|");
      expect(result).toContain('"');
      expect(result).toContain("!");
    });
  });

  describe("convertBooleanOperators()", () => {
    it("should convert implicit AND (spaces) to explicit &", () => {
      const result = parser.convertBooleanOperators("word1 word2 word3");
      expect(result).toContain("&");
    });

    it("should preserve explicit operators", () => {
      expect(parser.convertBooleanOperators("word1 & word2")).toContain("&");
      expect(parser.convertBooleanOperators("word1 | word2")).toContain("|");
      expect(parser.convertBooleanOperators("!word1")).toContain("!");
    });

    it("should preserve parentheses", () => {
      const result = parser.convertBooleanOperators("(word1 | word2) & word3");
      expect(result).toContain("(");
      expect(result).toContain(")");
    });

    it("should handle single word and empty string", () => {
      expect(parser.convertBooleanOperators("word")).toBe("word");
      expect(parser.convertBooleanOperators("")).toBe("");
    });
  });

  describe("handlePhrases()", () => {
    it("should convert quoted phrase to <-> operator", () => {
      const result = parser.handlePhrases('"test phrase"');
      expect(result).toContain("<->");
    });

    it("should handle multiple phrases", () => {
      const result = parser.handlePhrases('"first phrase" and "second phrase"');
      expect(result).toContain("<->");
    });

    it("should handle single word in quotes", () => {
      const result = parser.handlePhrases('"word"');
      expect(result).toBe("word");
    });

    it("should preserve non-quoted text", () => {
      const result = parser.handlePhrases('regular "quoted phrase" text');
      expect(result).toContain("regular");
      expect(result).toContain("text");
    });
  });

  describe("parse() - Integration", () => {
    it("should parse simple query", () => {
      const result = parser.parse("test query");
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should parse query with boolean operators", () => {
      const result = parser.parse("word1 & word2 | word3");
      expect(result).toContain("&");
      expect(result).toContain("|");
    });

    it("should parse query with phrases and NOT operator", () => {
      const result = parser.parse('"exact phrase" !excluded');
      expect(result).toContain("<->");
      expect(result).toContain("!");
    });

    it("should handle complex query with all features", () => {
      const result = parser.parse('(C++ | "design patterns") & !deprecated');
      expect(result).toContain("cplusplus");
      expect(result).toContain("<->");
      expect(result).toContain("!");
    });

    it("should throw error for invalid query", () => {
      expect(() => parser.parse("")).toThrow(SearchValidationError);
      expect(() => parser.parse("   ")).toThrow(SearchValidationError);
    });
  });

  describe("NOT Operator Handling", () => {
    it("should return ParsedQuery with includeTerms and excludeTerms", () => {
      const result = parser.parseQuery("test NOT excluded");
      expect(result.includeTerms).toBeDefined();
      expect(result.excludeTerms).toBeDefined();
    });

    it("should extract NOT terms into excludeTerms", () => {
      const result = parser.parseQuery("test NOT excluded");
      expect(result.excludeTerms).toContain("excluded");
      expect(result.includeTerms).toContain("test");
    });

    it("should handle multiple NOT operators", () => {
      const result = parser.parseQuery("test NOT bad NOT wrong");
      expect(result.excludeTerms).toContain("bad");
      expect(result.excludeTerms).toContain("wrong");
    });

    it("should handle NOT-only query", () => {
      const result = parser.parseQuery("NOT excluded");
      expect(result.excludeTerms).toContain("excluded");
      expect(result.includeTerms.length).toBe(0);
    });

    it("should handle ! operator same as NOT", () => {
      const result = parser.parseQuery("test !excluded");
      expect(result.excludeTerms).toContain("excluded");
    });
  });

  describe("Edge Cases", () => {
    it("should handle nested parentheses", () => {
      const result = parser.parse("((word1 | word2) & word3)");
      expect(result).toContain("(");
      expect(result).toContain(")");
    });

    it("should handle unicode characters", () => {
      const result = parser.parse("test 你好 query");
      expect(result).toContain("你好");
    });

    it("should handle multiple spaces between words", () => {
      const result = parser.parse("word1    word2");
      expect(result).toBeDefined();
    });

    it("should handle mixed case operators", () => {
      const result = parser.parseQuery("test AND query OR other");
      expect(result.includeTerms).toContain("test");
      expect(result.includeTerms).toContain("query");
    });
  });

  describe("extractAllTerms()", () => {
    it("should extract all terms from ts_query string", () => {
      const terms = parser.extractAllTerms("test & query | other");
      expect(terms).toContain("test");
      expect(terms).toContain("query");
      expect(terms).toContain("other");
    });

    it("should remove duplicates", () => {
      const terms = parser.extractAllTerms("test & test | test");
      expect(terms.filter((t) => t === "test").length).toBe(1);
    });

    it("should handle empty string", () => {
      const terms = parser.extractAllTerms("");
      expect(terms).toEqual([]);
    });
  });

  describe("extractExcludeTerms()", () => {
    it("should extract excluded terms from query", () => {
      const terms = parser.extractExcludeTerms("test NOT excluded");
      expect(terms).toContain("excluded");
    });

    it("should return empty array when no excluded terms", () => {
      const terms = parser.extractExcludeTerms("test query");
      expect(terms).toEqual([]);
    });
  });
});
