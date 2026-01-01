# Reasoning Pattern Configuration Schema

This directory contains JSON configuration files that define domain-specific reasoning patterns.
Each file defines patterns for a specific domain (e.g., database, API, security).

## File Structure

Each JSON configuration file must follow this structure:

```json
{
  "version": "1.0.0",           // Required: Semver version (e.g., "1.0.0")
  "domain": "domain-name",      // Required: Domain identifier (e.g., "database")
  "description": "...",         // Required: Human-readable description
  "patterns": [...],            // Required: Array of pattern definitions
  "testCases": [...]            // Optional: Array of test cases for validation
}
```

## Pattern Definition

Each pattern in the `patterns` array must include:

```json
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
```

## Indicator Definition

Indicators trigger pattern matching. Each indicator must include:

```json
{
  "type": "exact",              // Required: "exact" | "fuzzy" | "regex"
  "value": "search phrase",     // Required: Pattern value to match
  "weight": 0.8,                // Required: Scoring weight (0-1)
  "keyTermCategory": "..."      // Optional: "domainTerms" | "actionVerbs" | "nounPhrases" | "terms"
}
```

### Indicator Types

- **exact**: Case-insensitive exact phrase matching
- **fuzzy**: All keywords must be present (any order)
- **regex**: Regular expression pattern matching

## Hypothesis Template

Hypotheses provide testable explanations for problems:

```json
{
  "id": "hypothesis-id",        // Required: Unique identifier
  "statement": "...",           // Required: Template with {{placeholders}}
  "investigationSteps": [...],  // Required: Array of concrete steps (min 1)
  "expectedFindings": [...],    // Required: Array of expected findings (min 1)
  "relatedHypotheses": [...],   // Optional: IDs of related hypotheses
  "estimatedTime": "15-30 min", // Required: Time estimate string
  "likelihood": 0.7             // Required: Base likelihood (0-1)
}
```

### Template Placeholders

Use these placeholders in hypothesis statements and recommendation actions:
- `{{primarySubject}}`: Main subject extracted from the problem
- `{{domainTerms}}`: Domain-specific terms from the problem
- `{{actionVerbs}}`: Action verbs from the problem

## Recommendation Template

Recommendations provide actionable steps:

```json
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
```

### Recommendation Types

- **diagnostic**: Investigation/analysis actions
- **remedial**: Fix/resolution actions

## Test Cases

Test cases validate pattern matching:

```json
{
  "id": "test-case-id",         // Required: Unique identifier
  "input": "problem text",      // Required: Problem description to test
  "context": "...",             // Optional: Additional context
  "expectedDomain": "domain",   // Required: Expected domain match
  "expectedPatternIds": [...],  // Required: Expected pattern IDs (min 1)
  "minConfidence": 0.7          // Required: Minimum confidence score (0-1)
}
```

## Directory Organization

Organize pattern files by category:

```
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
```

## Example Configuration

See `example.json` in this directory for a complete working example.

## Validation

Pattern configurations are validated on load. Invalid files are skipped with detailed error messages.
Check the server logs for validation errors and warnings.
