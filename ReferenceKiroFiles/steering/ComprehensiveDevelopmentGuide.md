---
inclusion: always
---

# ThoughtMCP Development Guide

## Core Principles

### 1. Test-Driven Development (TDD)

**Mandatory red-green-refactor cycle:**

1. Write failing test defining expected behavior
2. Implement minimal code to pass test
3. Refactor while tests validate correctness

Tests are guardrails preventing incorrect implementations.

### 2. Zero Technical Debt

**Forbidden:**

- `any` type in TypeScript
- `@ts-ignore`, `@ts-expect-error`, `eslint-disable`
- Alternative file versions (-v2, -new, -old, -temp, -backup, -enhanced, -improved)
- Completing tasks with failing tests
- Ignoring failing tests
- Committing broken or untested code

**Required:**

- Fix root causes, not symptoms
- Zero TypeScript errors/warnings
- 95%+ line coverage, 90%+ branch coverage
- All tests pass before completion
- Own all discovered failures
- Refactor for quality
- Document decisions
- Proper error handling and logging

### 3. Test Failure Ownership

Tests must reflect reality:

- **Pass** - system works as expected
- **Skip** - temporary issue with explicit fix plan
- **Not implemented** - functionality doesn't exist yet

Never ignore failing tests. Fix immediately or skip with concrete plan.

## Spec Task Execution Workflow

**MANDATORY: Follow this exact process for every spec task.**

### 1. Breakdown Phase

Read the spec task from `.kiro/specs/{feature}/tasks.md` and create detailed implementation plan:

- Identify all files to create/modify (e.g., `src/memory/episodic.ts`, `tests/memory/episodic.test.ts`)
- List specific functions/classes/interfaces needed (e.g., `EpisodicMemory` class with `store()`, `retrieve()`, `update()` methods)
- Define data structures and types (e.g., `Memory` interface, `MemoryMetadata` type)
- Identify integration points with existing code (e.g., how `EpisodicMemory` connects to `MemoryStore`)
- Determine test strategy (unit tests for each method, integration tests for store interactions, e2e tests for full workflows)
- Note performance considerations (e.g., retrieval must be <100ms p50, use connection pooling)
- Document edge cases and error scenarios (e.g., duplicate memories, connection failures, invalid input)

Save breakdown to `development/reports/{task-id}-breakdown-YYYY-MM-DD.md` with concrete file paths, function signatures, and test scenarios.

### 2. Task Creation Phase

Create granular tasks in MCP tasks server using `mcp_tasks_add_task`:

**Each MCP task MUST include:**

- **Title**: Specific, actionable (e.g., "Implement EpisodicMemory class with CRUD operations")
- **Description**: Detailed action plan with:
  - Files to create/modify
  - Specific code to write
  - Integration requirements
  - Error handling approach
  - Research findings (if applicable)
- **Exit Criteria**: Measurable completion requirements:
  - "File X exists with functions Y, Z"
  - "Tests pass with 95%+ coverage"
  - "TypeScript compiles with zero errors"
  - "Integration with component A verified"
- **Dependencies**: Link tasks that must complete first
- **Priority**: Set based on criticality (1-5)

**Task granularity rules:**

- Each task = 15-30 minutes of focused work (e.g., "Implement EpisodicMemory.store() method" not "Implement memory system")
- If task takes >30 min, break it down further (e.g., split into "Create interface", "Implement core logic", "Add error handling")
- One file or one logical component per task (e.g., one task for `src/memory/episodic.ts`, separate task for `tests/memory/episodic.test.ts`)
- Tests are separate tasks dependent on implementation tasks (e.g., test task depends on implementation task completing first)

### 3. Execution Phase

Execute MCP tasks sequentially using `mcp_tasks_get_ready_tasks`:

**For each task:**

1. **Read task details** - Review title, description, exit criteria from MCP task
2. **Search existing code** - Use `grepSearch` to find related implementations, patterns, utilities in `src/`
3. **Write tests first** (TDD) - Create failing test in `tests/` mirroring source structure
4. **Implement minimal code** - Write code in `src/` to make tests pass
5. **Refactor** - Clean up code while tests validate correctness
6. **Verify exit criteria** - Check each criterion is met (run tests, check types, verify integration)
7. **Update task** - Use `mcp_tasks_update_exit_criteria` to mark each criterion as met
8. **Complete task** - Use `mcp_tasks_complete_task` only when ALL criteria met

**Never skip to next task until current task fully complete.**

### 4. Validation Phase

After ALL MCP tasks complete for the spec task:

1. **Run full validation**: `timeout 180s npm run build` - must pass all quality gates
2. **Verify spec requirements**: Check each acceptance criterion in `.kiro/specs/{feature}/requirements.md` is met
3. **Test coverage**: Run `npm run test:coverage` - verify 95%+ line, 90%+ branch
4. **Integration testing**: Run `npm run test:integration` - verify component interactions work
5. **Performance testing**: Run `npm run test:performance` - verify meets latency targets from specs
6. **Error scenarios**: Test edge cases and error handling paths manually or with tests

Save validation report to `development/reports/{task-id}-validation-YYYY-MM-DD.md`

### 5. Gap Analysis Phase

Identify and fix any gaps:

- **Missing tests**: Check coverage report, add tests for uncovered code paths in `tests/`
- **Missing error handling**: Add try-catch blocks, input validation, error logging to `src/`
- **Missing documentation**: Add JSDoc comments to all exported functions/classes in `src/`
- **Missing integration**: Wire up components in `src/index.ts` or appropriate entry points
- **Performance issues**: Profile with `npm run test:performance`, optimize if targets not met

Create additional MCP tasks for gaps using `mcp_tasks_add_task`. Execute them following phases 3-4.

### 6. Completion Phase

**CRITICAL: A spec task CANNOT be marked complete until `timeout 180s npm run build` succeeds with zero errors.**

Mark spec task complete only when:

- All MCP tasks show status "completed" in `mcp_tasks_get_list`
- **`timeout 180s npm run build` passes with zero errors** (enforces all quality gates including coverage)
- No gaps identified in phase 5
- `npm run test:coverage` shows 95%+ line, 90%+ branch
- `npm run test:performance` meets all latency targets from specs
- `npm test` passes all tests
- `npm run typecheck` shows zero errors/warnings
- Each acceptance criterion in `.kiro/specs/{feature}/requirements.md` verified

Update spec task status in `.kiro/specs/{feature}/tasks.md` by checking the box.

Save completion summary to `development/summaries/{task-id}-COMPLETE-YYYY-MM-DD.md` with:

- What was implemented
- Which spec requirements were satisfied
- Test coverage achieved
- Performance metrics achieved
- Any deviations from original plan

## General Development Workflow

**Plan → Use Tools → Reflect → Persist**

1. **PLAN** - Read `.kiro/specs/{feature}/requirements.md` and `design.md`, identify files to modify, plan TDD approach, save plans to `development/reports/`
2. **USE TOOLS** - Use `grepSearch` and `fileSearch` to find existing implementations, run `npm test`, save analysis to `development/reports/`
3. **REFLECT** - Compare output against spec requirements, verify integration points work, check performance meets targets, document findings in `development/reports/`
4. **PERSIST** - Complete implementation, update tests, run `timeout 180s npm run build`, save summary to `development/summaries/`, verify zero regressions

## File Management

**Search before creating** - Use `grepSearch` and `fileSearch` tools to check if functionality exists before creating new files.

**Never create alternative versions** - No suffixes like `-v2`, `-new`, `-old`, `-temp`, `-backup`, `-enhanced`. One canonical version per functionality. If refactoring, modify the original file.

**Protected directories:**

- `.kiro/specs/` - Never modify. Contains requirements.md, design.md, tasks.md only
- `docs/` - Permanent documentation only (BUILD.md, TESTING.md, etc.)
- Root - Essential project files only (package.json, README.md, etc.)

**Development directory structure (mandatory):**

- `development/snapshots/` - Point-in-time state captures
- `development/summaries/` - Phase completion summaries (PHASE_X_COMPLETE.md)
- `development/reports/` - Validation reports, analysis outputs
- `development/reports/coverage/` - Test coverage reports (HTML, JSON, LCOV)
- `development/scripts/` - Temporary development scripts
- `development/notes/` - Development notes, scratch work

**All test and coverage artifacts MUST be generated in `development/reports/` to keep them gitignored.**

**Never create in root/docs/specs:**

- Snapshots, summaries, reports
- Temporary scripts or helpers
- Development notes or planning docs

**Naming conventions:**

- Snapshots: `YYYY-MM-DD-<description>.md`
- Summaries: `<PHASE>_COMPLETE.md`
- Reports: `<type>-report-YYYY-MM-DD.md`
- Scripts: `<purpose>-YYYY-MM-DD.sh`
- Notes: `<topic>-notes-YYYY-MM-DD.md`

## Build Process

`npm run build` enforces all quality gates:

1. Clean artifacts
2. Format code (Prettier)
3. Security audit (moderate+ vulnerabilities)
4. Format check
5. Lint
6. Type check
7. Test suite with coverage (95%+ line, 90%+ branch)
8. Build types
9. Build bundle

Build fails if any step fails. Zero tolerance for security vulnerabilities, formatting issues, linting errors, type errors, test failures, or insufficient coverage.

Use `npm run build:quick` only when validation already passed.

## Command Execution

**Always use timeouts:**

- `timeout 180s npm run build`
- `timeout 60s npm run build:quick`
- `timeout 120s npm test`
- `timeout 60s npm run test:unit`
- `timeout 180s npm run test:integration`
- `timeout 240s npm run test:e2e`
- `timeout 180s npm run test:coverage`

**Non-interactive execution** - Use headless/non-interactive flags. Never leave commands waiting for input.

**Test output** - Local development uses clean verbose output only. HTML/JSON reports generate automatically in CI or on-demand with `--reporter=html` or `--reporter=json` flags.

## Quality Standards

**Treat warnings as errors:**

- Zero TypeScript errors/warnings
- No bypassing validations
- Fix all issues immediately

**Forbidden:** `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `any` type

## Simplicity

**KISS principle:**

- Simple solutions over complex abstractions
- Avoid unnecessary interfaces, wrappers, layers
- Use language built-ins
- No speculative generalization
- Composition over inheritance
- No premature optimization

**Naming:** Avoid prefixes like Simple, Enhanced, Basic (e.g., `UserManager` not `SimpleUserManager`)

## Architecture Requirements

**HMD Memory System:**

- Five-sector embeddings (Episodic, Semantic, Procedural, Emotional, Reflective)
- Waypoint graph with 1-3 links per memory
- Composite scoring: 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×link_weight
- Temporal decay with reinforcement

**Parallel Reasoning:**

- Four concurrent streams (Analytical, Creative, Critical, Synthetic)
- 30s total, synchronization at 25%, 50%, 75%
- Coordination overhead <10%

**Framework Selection:**

- Eight frameworks (Scientific Method, Design Thinking, Systems Thinking, Critical Thinking, Creative Problem Solving, Root Cause Analysis, First Principles, Scenario Planning)
- Selection accuracy >80%

**Performance Targets:**

- Memory retrieval: p50 <100ms, p95 <200ms, p99 <500ms
- Embedding generation: <500ms for 5 sectors
- Parallel reasoning: <30s total, <10s per stream
- Confidence assessment: <100ms
- Bias detection: <15% overhead
- Emotion detection: <200ms

## npm Scripts

**Development:**

- `npm run dev` - Start dev server with tsx
- `npm run dev:docker` - Start with Docker PostgreSQL
- `npm run build:watch` - Watch mode compilation

**Build:**

- `npm run build` - Full build with all quality gates (clean → format → audit → format:check → lint → typecheck → test → build:types → build:bundle)
- `npm run build:quick` - Quick build without validation
- `npm run build:types` - Generate TypeScript declarations
- `npm run build:bundle` - Bundle with esbuild
- `npm run clean` - Remove build artifacts

**Test:**

- `npm test` - Run all tests (verbose output locally, full reports in CI)
- `npm run test:unit` - Unit tests
- `npm run test:integration` - Integration tests
- `npm run test:e2e` - End-to-end tests
- `npm run test:watch` - Watch mode
- `npm run test:coverage` - Coverage report (95%+ line, 90%+ branch target)
- `npm run test:performance` - Performance validation
- `npm run test:accuracy` - Accuracy validation
- `npm test -- --reporter=html` - Generate HTML report on-demand (local development)
- `npm test -- --reporter=json` - Generate JSON report on-demand

**Database:**

- `npm run db:setup` - Initialize database
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed test data
- `npm run db:reset` - Reset database
- `npm run db:test:setup` - Setup test database
- `npm run db:test:teardown` - Teardown test database

**Quality:**

- `npm run audit:check` - Security audit (moderate+ vulnerabilities)
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format with Prettier
- `npm run format:check` - Check formatting
- `npm run typecheck` - TypeScript type checking
- `npm run validate` - Full validation
- `npm run validate:ci` - CI validation

**Production:**

- `npm start` - Start production server
- `npm run start:prod` - Start with NODE_ENV=production
- `npm run start:debug` - Start with debug logging

## Database Guidelines

**PostgreSQL operations:**

- Use connection pooling (default 20 connections)
- Use transactions for multi-step operations
- Proper error handling and rollback
- Use pgvector for vector operations
- Create appropriate indexes (vector, full-text, composite)

## Testing Requirements

**Organization:**

- Unit tests mirror source structure exactly
- One test file per source file
- 95%+ line coverage, 90%+ branch coverage
- Integration tests for cross-component interactions
- E2E tests for complete workflows

**Quality:**

- Update tests when changing source
- Execute tests immediately after changes
- Fix failing tests before proceeding
- Zero flaky tests
- Proper mocking
- Meaningful assertions
- Clear test names

**Mocking External Services:**

Tests must not depend on external services (databases, APIs, embedding models). Use mocks for isolation, speed, and reliability.

**Embedding Model Mocking Pattern:**

```typescript
// ❌ BAD: Depends on external Ollama service
const model = new OllamaEmbeddingModel({
  host: process.env.OLLAMA_HOST || "http://localhost:11434",
  modelName: "nomic-embed-text",
  dimension: 768,
});

// ✅ GOOD: Uses deterministic mock
import { MockOllamaEmbeddingModel } from "../../utils/mock-embeddings";

const model = new MockOllamaEmbeddingModel({
  host: "http://localhost:11434", // Accepted for compatibility but not used
  modelName: "nomic-embed-text",
  dimension: 768,
});
```

**Mock Implementation Guidelines:**

1. **Drop-in replacement** - Mock should implement same interface as real service
2. **Deterministic** - Same input always produces same output (use content hashing)
3. **Fast** - No network calls, no external dependencies
4. **Normalized** - Return properly formatted data (e.g., unit vectors for embeddings)
5. **Configurable** - Accept same configuration options as real service
6. **Cached** - Cache results for performance (optional but recommended)

**Example Mock Implementation:**

```typescript
// src/__tests__/utils/mock-embeddings.ts
export class MockOllamaEmbeddingModel {
  private readonly modelName: string;
  private readonly dimension: number;
  private cache: Map<string, number[]>;

  constructor(config: {
    host: string;
    modelName: string;
    dimension: number;
    timeout?: number;
    maxRetries?: number;
  }) {
    this.modelName = config.modelName;
    this.dimension = config.dimension;
    this.cache = new Map();
  }

  async generate(text: string): Promise<number[]> {
    // Validate input (same as real implementation)
    if (!text || typeof text !== "string") {
      throw new Error("Text must be a non-empty string");
    }

    // Check cache
    const cached = this.cache.get(text);
    if (cached !== undefined) {
      return cached;
    }

    // Generate deterministic embedding based on text hash
    const seed = this.hashString(text);
    const embedding = generateMockEmbedding(this.dimension, seed);

    // Cache result
    this.cache.set(text, embedding);

    return embedding;
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.modelName;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
```

**Test Isolation Benefits:**

- **No external dependencies** - Tests run anywhere without service setup
- **Fast execution** - No network latency (51s for 493 tests vs minutes with real services)
- **Deterministic** - Same results every time, no flaky tests
- **CI/CD friendly** - No service configuration needed in pipelines
- **TDD compliant** - Tests can be written before service is available

**When to Mock:**

- External APIs (Ollama, OpenAI, etc.)
- Databases (use test database or mock for unit tests)
- File system operations (for unit tests)
- Network calls
- Time-dependent operations (use fixed timestamps)

**When NOT to Mock:**

- Integration tests (test real interactions)
- E2E tests (test complete workflows)
- Performance tests (need real service characteristics)
- Accuracy tests (need real model outputs)

**TypeScript 'any' Type in Test Files:**

The `any` type is **forbidden in production code** (`src/` excluding `__tests__/`) but **acceptable in specific test scenarios** where type flexibility is legitimately needed. Use sparingly and only when proper typing is impractical.

**Acceptable patterns:**

1. **Mock object creation** - When creating test doubles with partial implementations:

```typescript
// ✅ GOOD: Mock with minimal interface
let mockDb: any;
let mockEmbeddingEngine: any;

mockDb = {
  query: vi.fn().mockResolvedValue({ rows: [] }),
  beginTransaction: vi.fn(),
};
```

2. **Dynamic mock behavior** - When mocking functions with varying signatures:

```typescript
// ✅ GOOD: Mock query function with dynamic parameters
client.query = vi.fn(async (sql: any, params?: any) => {
  if (sql.includes("UPDATE")) {
    throw new Error("Update failed");
  }
  return { rows: [] };
});
```

3. **Type assertion for incomplete test objects** - When testing validation of invalid inputs:

```typescript
// ✅ GOOD: Intentionally invalid object for validation testing
const invalidContent: any = {
  content: "Test",
  // Missing required fields to test validation
};
await expect(repository.create(invalidContent)).rejects.toThrow();
```

4. **Type assertion for mock objects** - When TypeScript can't infer mock structure:

```typescript
// ✅ GOOD: Assert mock as any for complex interface
const mockStorage = {
  storeEmbeddings: vi.fn(),
  retrieveEmbeddings: vi.fn(),
} as any;
```

5. **Testing invalid type inputs** - When verifying type validation:

```typescript
// ✅ GOOD: Test type validation with intentionally wrong types
await expect(model.generate(null as any)).rejects.toThrow();
await expect(model.generate(123 as any)).rejects.toThrow();
```

6. **Accessing internal state for testing** - When testing error paths requiring state manipulation:

```typescript
// ✅ GOOD: Access private property to simulate corruption
(manager as any).config.sectorMultipliers[sector] = undefined;
```

**Unacceptable patterns:**

```typescript
// ❌ BAD: Using any to avoid proper typing in test logic
function processTestData(data: any) {
  // Should be properly typed
  return data.value * 2;
}

// ❌ BAD: Using any when proper type is available
const result: any = await repository.retrieve(id); // Should use Memory type

// ❌ BAD: Using any to bypass type checking in assertions
expect(result as any).toBe(expected); // Should use proper type
```

**Guidelines:**

- Minimize `any` usage even in tests - prefer proper types when practical
- Use `any` only for mocks, invalid input testing, or accessing internals
- Never use `any` in test helper functions or utilities
- Never use `any` to avoid fixing type errors in test logic
- Document why `any` is needed if the reason isn't obvious
- Consider using `unknown` with type guards instead of `any` when possible

**Enforcement:**

- Production code (`src/` excluding `__tests__/`): Zero tolerance for `any` type
- Test code (`src/__tests__/`): Acceptable in patterns above, but minimize usage
- ESLint will flag `any` usage - ensure it matches acceptable patterns
- Code review should verify `any` usage is justified

## Validation Before Completion

**MANDATORY: Run `timeout 180s npm run build` before marking any spec task complete.**

This enforces all quality gates (security audit, formatting, linting, type checking, coverage tests, production build).

**Failure handling:**

- Fix any failure immediately
- Own all failures, even unrelated ones
- Identify root causes
- Maintain application integrity
- Zero tolerance for quality issues
- **Spec tasks cannot be marked done until build succeeds**

## Commit Messages

**Focus on business functionality, not task references.**

Structure:

```
type: brief description (50 chars)

- Business capability added/changed
- System behavior improvements
- Performance/reliability improvements
- Breaking changes (if any)
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `perf`

Example: `feat: detect circular dependencies in task graphs` not `feat: complete sub-task 5.1`

## MCP Server Testing

**Build and test workflow:**

1. Make changes in `src/`
2. Run `npm run build`
3. Update `BUILD_VERSION` in `.kiro/settings/mcp.json` to trigger restart
4. Verify server connected in MCP Server view
5. Test tools from chat
6. Check server logs for errors

**Configuration (`.kiro/settings/mcp.json`):**

```json
{
  "mcpServers": {
    "thoughtmcp": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"],
      "env": { "NODE_ENV": "development", "BUILD_VERSION": "1" },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

**Debugging:**

- Use `npm run dev` for development without building
- Use `npm run build:watch` for automatic rebuilds
- Check `dist/index.js` exists
- Verify absolute paths in config
- Review MCP Server view logs
- Requires Node.js 18+

**Current tools:**

- `placeholder` - Status during rebuild

**Future tools (post-rebuild):**

- `store_memory`, `retrieve_memories`, `analyze_reasoning`, `detect_bias`, `assess_confidence`, `detect_emotion`, `select_framework`

## MCP Tasks Integration

**Use MCP tasks server for all spec task execution.**

**List management:**

- Create one list per feature: `mcp_tasks_create_list` with title matching spec feature name
- Use projectTag to group related features (e.g., "cognitive-architecture")

**Task lifecycle:**

- Create: `mcp_tasks_add_task` with detailed description and exit criteria
- Update: `mcp_tasks_update_task` to refine during execution
- Track: `mcp_tasks_update_exit_criteria` to mark criteria as met
- Complete: `mcp_tasks_complete_task` only when all criteria verified

**Finding work:**

- Use `mcp_tasks_get_ready_tasks` to find tasks with no incomplete dependencies
- Use `mcp_tasks_search_tool` to find related tasks or research completed work
- Use `mcp_tasks_analyze_task_dependencies` to understand task relationships

**Never:**

- Complete tasks without meeting all exit criteria
- Skip dependency checks
- Work on blocked tasks
- Leave tasks in ambiguous state

## Steering Document Maintenance

**This document must evolve with the project. Update when:**

1. **New patterns emerge** - Discovered better approaches, common pitfalls, or repeated solutions
2. **Architecture changes** - New components, services, or system boundaries added
3. **Tool changes** - New npm scripts, build processes, or development tools introduced
4. **Quality issues repeat** - Same mistakes made multiple times indicate missing guidance
5. **Performance targets change** - New latency requirements or optimization strategies needed
6. **Testing strategies evolve** - New test types, coverage requirements, or testing tools adopted
7. **Integration patterns established** - New ways components interact or communicate
8. **MCP tools added** - New MCP server tools available for use
9. **Workflow improvements** - Better processes discovered through experience

**Update process:**

1. Identify what guidance is missing or outdated (e.g., "No guidance on vector embedding generation")
2. Write specific, actionable guidance (e.g., "Use OpenAI API with text-embedding-3-small model, cache embeddings in PostgreSQL")
3. Include concrete examples with file paths and commands (e.g., "See `src/embeddings/generator.ts` for implementation")
4. Remove obsolete guidance (e.g., delete sections about deprecated tools or old architecture)
5. Keep document concise - remove redundancy (e.g., don't repeat same rule in multiple sections)
6. Test guidance by following it for a task (e.g., execute a spec task using only this document as reference)
7. Commit with message: `docs: update steering - [specific change]` (e.g., `docs: update steering - add vector embedding guidelines`)

**Review triggers:**

- After completing major features
- When onboarding new patterns
- After discovering repeated issues
- Monthly during active development
- Before major refactoring efforts

**Keep it:**

- **Specific** - ThoughtMCP cognitive architecture, not generic TypeScript
- **Actionable** - Clear steps, not vague principles
- **Current** - Remove outdated guidance immediately
- **Concise** - Every word must add value
- **Tested** - Follow your own guidance

## Key Principles

1. Follow spec task execution workflow exactly - no shortcuts
2. TDD mandatory - tests first, always
3. Zero technical debt - fix, don't suppress
4. Search before creating - avoid duplication
5. Simple over complex - avoid over-engineering
6. All tests must pass - no exceptions
7. Own all discovered issues
8. Meet performance targets from specs
9. Treat warnings as errors
10. Use MCP tasks for all spec work
11. Complete exit criteria before marking tasks done
12. Update steering when patterns emerge
13. Use `development/` for temporary files
