/**
 * PatternRegistry Property-Based Tests
 *
 * Property tests for PatternRegistry functionality using fast-check.
 * Tests universal properties that should hold for all valid inputs.
 *
 * Property 1: Config Loading Round-Trip
 * For any valid pattern configuration object, serializing it to JSON and
 * loading it through PatternRegistry should produce an equivalent configuration
 * with all patterns accessible.
 *
 * **Validates: Requirements 1.1, 1.2, 1.5**
 */

import * as fc from "fast-check";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { createPatternRegistry } from "../../../../reasoning/patterns/pattern-registry.js";

// Helper to generate non-empty alphanumeric text (no whitespace-only strings)
const nonEmptyText = (minLen: number, maxLen: number) =>
  fc
    .array(
      fc.constantFrom(
        ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ".split("")
      ),
      {
        minLength: minLen,
        maxLength: maxLen,
      }
    )
    .map((chars) => chars.join(""))
    .filter((s) => s.trim().length >= 1 && /[a-zA-Z]/.test(s));

// Helper to generate valid identifiers (alphanumeric with dashes/underscores, starting with letter)
const validId = (maxLen: number) =>
  fc
    .tuple(
      fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")),
      fc.array(
        fc.constantFrom(
          ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-".split("")
        ),
        {
          minLength: 0,
          maxLength: maxLen - 1,
        }
      )
    )
    .map(([first, rest]) => first + rest.join(""));

// Helper to generate optional values that serialize correctly (undefined instead of null)
const optionalValue = <T>(arb: fc.Arbitrary<T>) =>
  fc.oneof({ weight: 1, arbitrary: arb }, { weight: 1, arbitrary: fc.constant(undefined) });

describe("PatternRegistry Property Tests", () => {
  /**
   * Property 1: Config Loading Round-Trip
   *
   * For any valid pattern configuration object, serializing it to JSON and
   * loading it through PatternRegistry should produce an equivalent configuration
   * with all patterns accessible.
   *
   * **Validates: Requirements 1.1, 1.2, 1.5**
   */
  describe("Property 1: Config Loading Round-Trip", () => {
    it("should load patterns that were serialized to JSON", async () => {
      // Generate arbitrary valid pattern configurations
      // Use constrained generators to ensure valid data that passes schema validation
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            version: fc.constant("1.0.0"),
            domain: validId(20),
            description: nonEmptyText(5, 100),
            patterns: fc.array(
              fc.record({
                id: validId(30),
                name: nonEmptyText(3, 50),
                description: nonEmptyText(5, 100),
                indicators: fc.array(
                  fc.record({
                    type: fc.constantFrom("exact", "fuzzy", "regex"),
                    value: nonEmptyText(3, 50),
                    weight: fc.double({ min: 0.1, max: 1, noNaN: true }),
                    // Use undefined instead of null for optional fields
                    keyTermCategory: optionalValue(
                      fc.constantFrom("domainTerms", "actionVerbs", "nounPhrases", "terms")
                    ),
                  }),
                  { minLength: 1, maxLength: 5 }
                ),
                negativeIndicators: fc.array(
                  fc.record({
                    type: fc.constantFrom("exact", "fuzzy", "regex"),
                    value: nonEmptyText(3, 50),
                    weight: fc.double({ min: 0.1, max: 1, noNaN: true }),
                  }),
                  { maxLength: 3 }
                ),
                hypotheses: fc.array(
                  fc.record({
                    id: validId(30),
                    statement: nonEmptyText(10, 100),
                    investigationSteps: fc.array(nonEmptyText(5, 50), {
                      minLength: 1,
                      maxLength: 5,
                    }),
                    expectedFindings: fc.array(nonEmptyText(5, 50), {
                      minLength: 1,
                      maxLength: 5,
                    }),
                    relatedHypotheses: fc.array(validId(30), { maxLength: 3 }),
                    estimatedTime: nonEmptyText(5, 30),
                    likelihood: fc.double({ min: 0.1, max: 1, noNaN: true }),
                  }),
                  { minLength: 1, maxLength: 3 }
                ),
                recommendations: fc.array(
                  fc.record({
                    id: validId(30),
                    type: fc.constantFrom("diagnostic", "remedial"),
                    action: nonEmptyText(10, 100),
                    tools: fc.array(nonEmptyText(3, 30), { maxLength: 5 }),
                    expectedOutcome: nonEmptyText(10, 100),
                    prerequisites: fc.array(nonEmptyText(5, 50), { maxLength: 3 }),
                    priority: fc.integer({ min: 1, max: 10 }),
                    documentationLinks: fc.array(fc.webUrl(), { maxLength: 3 }),
                  }),
                  { minLength: 1, maxLength: 3 }
                ),
                severity: fc.constantFrom("critical", "high", "medium", "low"),
                // Use undefined instead of null for optional fields
                qualityThreshold: optionalValue(fc.double({ min: 0.1, max: 1, noNaN: true })),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            testCases: fc.array(
              fc.record({
                id: validId(30),
                input: nonEmptyText(10, 100),
                context: optionalValue(nonEmptyText(5, 100)),
                expectedDomain: validId(20),
                expectedPatternIds: fc.array(validId(30), { minLength: 1, maxLength: 3 }),
                minConfidence: fc.double({ min: 0.1, max: 1, noNaN: true }),
              }),
              { maxLength: 3 }
            ),
          }),
          async (config) => {
            // Create a unique temporary directory for each test run
            const testDir = join(
              tmpdir(),
              `pattern-registry-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
            );
            mkdirSync(testDir, { recursive: true });

            try {
              // Create registry
              const registry = createPatternRegistry();

              // Write config to file - strip undefined values for JSON serialization
              const configFile = join(testDir, `${config.domain}.json`);
              writeFileSync(configFile, JSON.stringify(config), "utf-8");

              // Load patterns
              await registry.loadPatterns(testDir);

              // Verify patterns are accessible
              expect(registry.getDomains()).toContain(config.domain);

              const patterns = registry.getPatternsByDomain(config.domain);
              expect(patterns).toHaveLength(config.patterns.length);

              // Verify all patterns can be retrieved by ID
              for (const pattern of config.patterns) {
                const retrieved = registry.getPatternById(pattern.id);
                expect(retrieved).toBeDefined();
                expect(retrieved?.id).toBe(pattern.id);
              }

              return true;
            } finally {
              // Clean up test directory
              rmSync(testDir, { recursive: true, force: true });
            }
          }
        ),
        { numRuns: 20 } // Reduced for faster test runs
      );
    });
  });
});
