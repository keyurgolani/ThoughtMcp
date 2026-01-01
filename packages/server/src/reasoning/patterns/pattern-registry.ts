/**
 * Pattern Registry
 *
 * Central component that loads, validates, and provides access to reasoning patterns
 * from external JSON configuration files. Supports hot-reloading, config merging,
 * and empty config bootstrapping.
 *
 * Requirements: 1.1, 1.2, 1.6
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { ZodError } from "zod";

import { Logger } from "../../utils/logger.js";
import { PatternConfigFileSchema, validatePatternConfig } from "./schemas.js";
import type {
  DomainPattern,
  PatternConfigFile,
  PatternRegistryStats,
  PatternValidationError,
  PatternValidationResult,
  PatternValidationWarning,
} from "./types.js";

/**
 * Empty config template with schema documentation
 */
const EMPTY_CONFIG_TEMPLATE: PatternConfigFile = {
  version: "1.0.0",
  domain: "example",
  description:
    "Example pattern configuration file. Replace this with your domain-specific patterns.",
  patterns: [
    {
      id: "example-pattern",
      name: "Example Pattern",
      description: "An example pattern to demonstrate the configuration structure",
      indicators: [
        {
          type: "exact",
          value: "example phrase",
          weight: 0.8,
        },
      ],
      hypotheses: [
        {
          id: "example-hypothesis",
          statement: "This is an example hypothesis for {{primarySubject}}",
          investigationSteps: ["Step 1: Investigate the issue", "Step 2: Analyze the results"],
          expectedFindings: ["Finding 1", "Finding 2"],
          relatedHypotheses: [],
          estimatedTime: "15-30 minutes",
          likelihood: 0.5,
        },
      ],
      recommendations: [
        {
          id: "example-recommendation",
          type: "diagnostic",
          action: "Perform diagnostic action for {{primarySubject}}",
          tools: ["tool1", "tool2"],
          expectedOutcome: "Expected outcome description",
          prerequisites: [],
          priority: 5,
        },
      ],
      severity: "medium",
      qualityThreshold: 0.5,
    },
  ],
  testCases: [
    {
      id: "example-test",
      input: "This is an example phrase for testing",
      expectedDomain: "example",
      expectedPatternIds: ["example-pattern"],
      minConfidence: 0.5,
    },
  ],
};

/**
 * Schema documentation README content
 *
 * Provides comprehensive documentation for the pattern configuration schema.
 * This is created alongside the example config file during bootstrap.
 *
 * Requirements: 8.5
 */
const SCHEMA_README_CONTENT = `# Reasoning Pattern Configuration Schema

This directory contains JSON configuration files that define domain-specific reasoning patterns.
Each file defines patterns for a specific domain (e.g., database, API, security).

## File Structure

Each JSON configuration file must follow this structure:

\`\`\`json
{
  "version": "1.0.0",           // Required: Semver version (e.g., "1.0.0")
  "domain": "domain-name",      // Required: Domain identifier (e.g., "database")
  "description": "...",         // Required: Human-readable description
  "patterns": [...],            // Required: Array of pattern definitions
  "testCases": [...]            // Optional: Array of test cases for validation
}
\`\`\`

## Pattern Definition

Each pattern in the \`patterns\` array must include:

\`\`\`json
{
  "id": "unique-pattern-id",    // Required: Unique identifier
  "name": "Pattern Name",       // Required: Human-readable name
  "description": "...",         // Required: What this pattern detects
  "indicators": [...],          // Required: Array of indicators (min 1)
  "negativeIndicators": [...],  // Optional: Indicators that reduce match score
  "hypotheses": [...],          // Required: Array of hypothesis templates (min 1)
  "recommendations": [...],     // Required: Array of recommendation templates (min 1)
  "severity": "medium",         // Required: "critical" | "high" | "medium" | "low"
  "qualityThreshold": 0.5       // Optional: Minimum quality score (0-1, default 0.5)
}
\`\`\`

## Indicator Definition

Indicators trigger pattern matching. Each indicator must include:

\`\`\`json
{
  "type": "exact",              // Required: "exact" | "fuzzy" | "regex"
  "value": "search phrase",     // Required: Pattern value to match
  "weight": 0.8,                // Required: Scoring weight (0-1)
  "keyTermCategory": "..."      // Optional: "domainTerms" | "actionVerbs" | "nounPhrases" | "terms"
}
\`\`\`

### Indicator Types

- **exact**: Case-insensitive exact phrase matching
- **fuzzy**: All keywords must be present (any order)
- **regex**: Regular expression pattern matching

## Hypothesis Template

Hypotheses provide testable explanations for problems:

\`\`\`json
{
  "id": "hypothesis-id",        // Required: Unique identifier
  "statement": "...",           // Required: Template with {{placeholders}}
  "investigationSteps": [...],  // Required: Array of concrete steps (min 1)
  "expectedFindings": [...],    // Required: Array of expected findings (min 1)
  "relatedHypotheses": [...],   // Optional: IDs of related hypotheses
  "estimatedTime": "15-30 min", // Required: Time estimate string
  "likelihood": 0.7             // Required: Base likelihood (0-1)
}
\`\`\`

### Template Placeholders

Use these placeholders in hypothesis statements and recommendation actions:
- \`{{primarySubject}}\`: Main subject extracted from the problem
- \`{{domainTerms}}\`: Domain-specific terms from the problem
- \`{{actionVerbs}}\`: Action verbs from the problem

## Recommendation Template

Recommendations provide actionable steps:

\`\`\`json
{
  "id": "recommendation-id",    // Required: Unique identifier
  "type": "diagnostic",         // Required: "diagnostic" | "remedial"
  "action": "...",              // Required: Template with {{placeholders}}
  "tools": [...],               // Optional: Array of relevant tools/commands
  "expectedOutcome": "...",     // Required: Expected result description
  "prerequisites": [...],       // Optional: Array of prerequisite steps
  "priority": 8,                // Required: Priority level (1-10, higher = more important)
  "documentationLinks": [...]   // Optional: Array of documentation URLs
}
\`\`\`

### Recommendation Types

- **diagnostic**: Investigation/analysis actions
- **remedial**: Fix/resolution actions

## Test Cases

Test cases validate pattern matching:

\`\`\`json
{
  "id": "test-case-id",         // Required: Unique identifier
  "input": "problem text",      // Required: Problem description to test
  "context": "...",             // Optional: Additional context
  "expectedDomain": "domain",   // Required: Expected domain match
  "expectedPatternIds": [...],  // Required: Expected pattern IDs (min 1)
  "minConfidence": 0.7          // Required: Minimum confidence score (0-1)
}
\`\`\`

## Directory Organization

Organize pattern files by category:

\`\`\`
config/reasoning-patterns/
├── README.md                   # This file
├── technical/
│   ├── database.json
│   ├── api.json
│   ├── security.json
│   └── performance.json
├── business/
│   ├── customer-engagement.json
│   └── market-analysis.json
├── operations/
│   ├── project-management.json
│   └── team-dynamics.json
└── analysis/
    ├── root-cause-analysis.json
    └── risk-assessment.json
\`\`\`

## Example Configuration

See \`example.json\` in this directory for a complete working example.

## Validation

Pattern configurations are validated on load. Invalid files are skipped with detailed error messages.
Check the server logs for validation errors and warnings.
`;

/**
 * Pattern Registry class
 *
 * Manages loading, validation, and access to reasoning patterns.
 */
export class PatternRegistry {
  /** Patterns indexed by domain */
  private patternsByDomain: Map<string, DomainPattern[]> = new Map();

  /** All patterns indexed by ID */
  private patternsById: Map<string, DomainPattern> = new Map();

  /** Config files that have been loaded */
  private loadedFiles: Set<string> = new Set();

  /** Last reload timestamp */
  private lastReloadAt: Date | null = null;

  /** Config directory path */
  private configDir: string | null = null;

  /**
   * Load patterns from a configuration directory
   *
   * Loads all JSON files from the directory and its subdirectories.
   * Later files override earlier ones for duplicate pattern IDs.
   *
   * @param configDir - Path to the configuration directory
   * @returns Promise that resolves when loading is complete
   *
   * Requirements: 1.1, 1.6
   */
  async loadPatterns(configDir: string): Promise<void> {
    this.configDir = configDir;

    // Check if directory exists
    if (!existsSync(configDir)) {
      Logger.warn(`Pattern config directory does not exist: ${configDir}`);
      await this.bootstrapEmptyConfig(configDir);
      return;
    }

    // Clear existing patterns for reload
    this.patternsByDomain.clear();
    this.patternsById.clear();
    this.loadedFiles.clear();

    // Recursively find all JSON files
    const jsonFiles = this.findJsonFiles(configDir);

    if (jsonFiles.length === 0) {
      Logger.warn(`No pattern configuration files found in: ${configDir}`);
      Logger.warn("Operating with empty pattern configuration");
      this.lastReloadAt = new Date();
      return;
    }

    // Load each file
    for (const filePath of jsonFiles) {
      await this.loadConfigFile(filePath);
    }

    this.lastReloadAt = new Date();
    Logger.info(
      `Loaded ${this.patternsById.size} patterns from ${this.loadedFiles.size} files across ${this.patternsByDomain.size} domains`
    );
  }

  /**
   * Get patterns for a specific domain
   *
   * @param domain - Domain identifier
   * @returns Array of patterns for the domain, or empty array if none
   *
   * Requirements: 1.1
   */
  getPatternsByDomain(domain: string): DomainPattern[] {
    return this.patternsByDomain.get(domain) ?? [];
  }

  /**
   * Get all registered domains
   *
   * @returns Array of domain identifiers
   */
  getDomains(): string[] {
    return Array.from(this.patternsByDomain.keys());
  }

  /**
   * Get a pattern by ID
   *
   * @param patternId - Pattern identifier
   * @returns The pattern, or undefined if not found
   */
  getPatternById(patternId: string): DomainPattern | undefined {
    return this.patternsById.get(patternId);
  }

  /**
   * Get all patterns
   *
   * @returns Array of all loaded patterns
   */
  getAllPatterns(): DomainPattern[] {
    return Array.from(this.patternsById.values());
  }

  /**
   * Validate a pattern configuration object
   *
   * @param config - Configuration object to validate
   * @returns Validation result with errors and warnings
   *
   * Requirements: 1.2
   */
  validateConfig(config: unknown): PatternValidationResult {
    const result = validatePatternConfig(config);

    if (result.success) {
      // Check for additional warnings
      const warnings = this.checkConfigWarnings(result.data);
      return {
        valid: true,
        errors: [],
        warnings,
      };
    }

    // Convert Zod errors to our format
    const errors = this.convertZodErrors(result.error);
    return {
      valid: false,
      errors,
      warnings: [],
    };
  }

  /**
   * Bootstrap empty configuration when none exists
   *
   * Creates the config directory, a README.md with schema documentation,
   * and an example configuration file.
   *
   * @param configDir - Path to the configuration directory
   *
   * Requirements: 8.1, 8.5, 8.6
   */
  async bootstrapEmptyConfig(configDir: string): Promise<void> {
    Logger.info(`Bootstrapping empty pattern configuration in: ${configDir}`);

    // Create directory structure
    mkdirSync(configDir, { recursive: true });

    // Create README.md with schema documentation (Requirement 8.5)
    const readmePath = join(configDir, "README.md");
    writeFileSync(readmePath, SCHEMA_README_CONTENT, "utf-8");
    Logger.info(`Created schema documentation: ${readmePath}`);

    // Create example config file
    const examplePath = join(configDir, "example.json");
    const configContent = JSON.stringify(EMPTY_CONFIG_TEMPLATE, null, 2);
    writeFileSync(examplePath, configContent, "utf-8");
    Logger.info(`Created example configuration file: ${examplePath}`);

    // Log warning about operating with empty patterns (Requirement 8.6)
    Logger.warn("Operating with empty pattern configuration - please add domain-specific patterns");

    this.lastReloadAt = new Date();
  }

  /**
   * Get registry statistics
   *
   * @returns Statistics about loaded patterns
   */
  getStats(): PatternRegistryStats {
    const patternsPerDomain: Record<string, number> = {};
    for (const [domain, patterns] of this.patternsByDomain) {
      patternsPerDomain[domain] = patterns.length;
    }

    const patternsWithTests = 0;
    // Count patterns that have test cases (from their source config files)
    // This is tracked during loading
    // TODO: Implement test case tracking in a future task

    return {
      totalPatterns: this.patternsById.size,
      totalDomains: this.patternsByDomain.size,
      patternsPerDomain,
      patternsWithTests,
      lastReloadAt: this.lastReloadAt,
    };
  }

  /**
   * Check if the registry has any patterns loaded
   *
   * @returns True if patterns are loaded
   */
  hasPatterns(): boolean {
    return this.patternsById.size > 0;
  }

  /**
   * Reload patterns from the config directory
   *
   * @returns Promise that resolves when reload is complete
   */
  async reload(): Promise<void> {
    if (!this.configDir) {
      throw new Error("Cannot reload: no config directory has been set");
    }
    await this.loadPatterns(this.configDir);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Recursively find all JSON files in a directory
   */
  private findJsonFiles(dir: string): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) {
      return files;
    }

    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively search subdirectories
        files.push(...this.findJsonFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Load a single configuration file
   */
  private async loadConfigFile(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, "utf-8");
      const rawConfig = JSON.parse(content);

      // Validate the configuration
      const validationResult = this.validateConfig(rawConfig);

      if (!validationResult.valid) {
        Logger.error(`Invalid pattern configuration in ${filePath}:`);
        for (const error of validationResult.errors) {
          Logger.error(`  - ${error.path}: ${error.message}`);
        }
        return;
      }

      // Log warnings
      for (const warning of validationResult.warnings) {
        Logger.warn(`Pattern config warning in ${filePath}: ${warning.path}: ${warning.message}`);
      }

      // Parse with schema to get defaults applied
      const config = PatternConfigFileSchema.parse(rawConfig);

      // Register patterns
      this.registerPatterns(config, filePath);
      this.loadedFiles.add(filePath);
    } catch (error) {
      if (error instanceof SyntaxError) {
        Logger.error(`Invalid JSON syntax in ${filePath}: ${error.message}`);
      } else {
        Logger.error(`Error loading pattern config ${filePath}:`, error);
      }
    }
  }

  /**
   * Register patterns from a config file
   *
   * Implements config merge behavior where later files override earlier ones
   * for duplicate pattern IDs. Logs warnings for overridden patterns.
   *
   * Requirements: 1.6
   */
  private registerPatterns(config: PatternConfigFile, filePath: string): void {
    const domain = config.domain;

    // Get or create domain pattern array
    let domainPatterns = this.patternsByDomain.get(domain);
    if (!domainPatterns) {
      domainPatterns = [];
      this.patternsByDomain.set(domain, domainPatterns);
    }

    for (const pattern of config.patterns) {
      // Check for duplicate pattern ID and handle override
      this.handlePatternOverride(pattern.id, domain, filePath);

      // Register pattern by ID
      this.patternsById.set(pattern.id, pattern);

      // Add to domain patterns (avoid duplicates)
      const existingIndex = domainPatterns.findIndex((p) => p.id === pattern.id);
      if (existingIndex !== -1) {
        domainPatterns[existingIndex] = pattern;
      } else {
        domainPatterns.push(pattern);
      }
    }
  }

  /**
   * Handle pattern override when a duplicate pattern ID is found
   *
   * @param patternId - Pattern identifier being registered
   * @param newDomain - Domain the pattern is being registered to
   * @param filePath - Path of the config file being loaded
   */
  private handlePatternOverride(patternId: string, newDomain: string, filePath: string): void {
    const existingPattern = this.patternsById.get(patternId);
    if (!existingPattern) {
      return;
    }

    // Find which domain the existing pattern belongs to
    const oldDomain = this.findPatternDomain(patternId);

    Logger.warn(
      `Pattern ID "${patternId}" from ${filePath} overrides existing pattern. ` +
        `Later files override earlier ones for duplicate pattern IDs.`
    );

    // Remove from old domain's pattern array
    if (!oldDomain) {
      return;
    }

    const oldDomainPatterns = this.patternsByDomain.get(oldDomain);
    if (!oldDomainPatterns) {
      return;
    }

    const index = oldDomainPatterns.findIndex((p) => p.id === patternId);
    if (index === -1) {
      return;
    }

    oldDomainPatterns.splice(index, 1);

    // Log if pattern is moving between domains
    if (oldDomain !== newDomain) {
      Logger.warn(`Pattern "${patternId}" moved from domain "${oldDomain}" to "${newDomain}"`);
    }
  }

  /**
   * Find which domain a pattern belongs to
   *
   * @param patternId - Pattern identifier to find
   * @returns Domain name or undefined if not found
   */
  private findPatternDomain(patternId: string): string | undefined {
    for (const [domain, patterns] of this.patternsByDomain) {
      if (patterns.some((p) => p.id === patternId)) {
        return domain;
      }
    }
    return undefined;
  }

  /**
   * Convert Zod errors to our validation error format
   */
  private convertZodErrors(zodError: ZodError): PatternValidationError[] {
    return zodError.errors.map((err) => ({
      code: err.code,
      message: err.message,
      path: err.path.join("."),
      value: undefined,
    }));
  }

  /**
   * Check for non-fatal warnings in a valid config
   */
  private checkConfigWarnings(config: PatternConfigFile): PatternValidationWarning[] {
    const warnings: PatternValidationWarning[] = [];

    // Check for patterns without test cases
    if (!config.testCases || config.testCases.length === 0) {
      warnings.push({
        code: "NO_TEST_CASES",
        message: "Configuration has no test cases for validation",
        path: "testCases",
      });
    }

    // Check for low quality thresholds
    for (let i = 0; i < config.patterns.length; i++) {
      const pattern = config.patterns[i];
      if (pattern.qualityThreshold !== undefined && pattern.qualityThreshold < 0.3) {
        warnings.push({
          code: "LOW_QUALITY_THRESHOLD",
          message: `Pattern has a very low quality threshold (${pattern.qualityThreshold})`,
          path: `patterns[${i}].qualityThreshold`,
        });
      }

      // Check for patterns with very few indicators
      if (pattern.indicators.length < 2) {
        warnings.push({
          code: "FEW_INDICATORS",
          message: "Pattern has only one indicator, which may lead to false positives",
          path: `patterns[${i}].indicators`,
        });
      }
    }

    return warnings;
  }
}

/**
 * Create a new PatternRegistry instance
 *
 * @returns A new PatternRegistry
 */
export function createPatternRegistry(): PatternRegistry {
  return new PatternRegistry();
}
