# ThoughtMCP Cognitive Architecture - Testing Guide

This comprehensive guide covers testing strategies, best practices, and workflows for the ThoughtMCP cognitive architecture rebuild. Testing is mandatory and follows strict Test-Driven Development (TDD) principles.

## Testing Philosophy

**Tests are guardrails that prevent hallucination and incorrect code.**

### Core Principles

1. **Tests First**: Write failing tests before implementation
2. **Comprehensive Coverage**: 95%+ line coverage, 90%+ branch coverage
3. **Test Behavior**: Focus on what, not how
4. **Keep Tests Simple**: Tests should be easier to understand than code
5. **Fast Feedback**: Tests should run quickly (<2 minutes for full suite)
6. **Isolated Tests**: Each test should be independent
7. **Realistic Tests**: No mocks for core functionality

### Quality Standards

- **All tests must pass** - No exceptions
- **Zero flaky tests** - Tests must be deterministic
- **No skipped tests without plan** - Skip only with concrete fix plan
- **Test failures are blockers** - Fix immediately or skip with plan

## Test-Driven Development (TDD)

### Red-Green-Refactor Cycle

1. **RED**: Write failing test defining expected behavior
2. **GREEN**: Implement minimal code to pass test
3. **REFACTOR**: Improve code while tests validate correctness

### TDD Workflow Example

```typescript
// 1. RED: Write failing test
describe("MemoryRepository", () => {
  it("should create memory with five-sector embeddings", async () => {
    const repo = new MemoryRepository();
    const memory = await repo.create({
      content: "Test memory",
      userId: "user123",
    });

    expect(memory.embeddings).toBeDefined();
    expect(memory.embeddings.episodic).toHaveLength(1536);
  });
});

// 2. GREEN: Implement minimal code to pass
export class MemoryRepository {
  async create(content: { content: string; userId: string }) {
    return {
      id: "mem-123",
      embeddings: {
        episodic: new Array(1536).fill(0),
        // ... other sectors
      },
    };
  }
}

// 3. REFACTOR: Improve while tests validate
export class MemoryRepository {
  constructor(
    private db: DatabaseConnectionManager,
    private embeddingEngine: EmbeddingEngine
  ) {}

  async create(content: MemoryContent): Promise<Memory> {
    const embeddings = await this.embeddingEngine.generateAllSectorEmbeddings(content);
    return await this.db.transaction(async (client) => {
      const result = await client.query(
        "INSERT INTO memories (content, user_id) VALUES ($1, $2) RETURNING *",
        [content.content, content.userId]
      );
      await this.storeEmbeddings(result.rows[0].id, embeddings);
      return result.rows[0];
    });
  }
}
```

## Test Types

### 1. Unit Tests

- Test individual components in isolation
- Fast execution (<100ms per test)
- No external dependencies
- Location: `src/__tests__/unit/` or next to source files

### 2. Integration Tests

- Test interactions between components
- Moderate execution time (<1s per test)
- Uses real database (test instance)
- Location: `src/__tests__/integration/`

### 3. End-to-End Tests

- Test complete workflows from user perspective
- Slower execution (<5s per test)
- Validates end-to-end functionality
- Location: `src/__tests__/e2e/`

### 4. Performance Tests

- Validate performance requirements
- Tests latency targets (p50, p95, p99)
- Tests scalability
- Location: `src/__tests__/performance/`

### 5. Accuracy Tests

- Validate cognitive accuracy requirements
- Tests calibration error, bias detection, etc.
- Uses labeled test data
- Location: `src/__tests__/accuracy/`

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- MemoryRepository.test.ts

# Run tests matching pattern
npm test -- --grep "embedding"

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Test categories
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # End-to-end tests only
npm run test:performance   # Performance tests
npm run test:accuracy      # Accuracy tests
```

### Test Reporters

Test output is environment-aware:

- **Local Development**: Verbose output only (clean, readable)
- **CI Environment**: Verbose + JSON + HTML (for automation and dashboards)

```bash
# Generate HTML report on-demand (local development)
npm test -- --reporter=html
open html/index.html

# Generate JSON report on-demand
npm test -- --reporter=json > test-results.json
```

## Test Utilities

### Test Database (`src/__tests__/utils/test-database.ts`)

- `setupTestDatabase()` - Initialize test database
- `clearTestData()` - Clear all test data
- `seedTestMemories(count)` - Seed test memories

### Test Fixtures (`src/__tests__/utils/test-fixtures.ts`)

- `createTestMemory(overrides)` - Create test memory
- `createTestEmbedding(dimension)` - Create test embedding

### Mock Embeddings (`src/__tests__/utils/mock-embeddings.ts`)

- `MockEmbeddingEngine` - Deterministic embedding generation

### Custom Assertions (`src/__tests__/utils/test-helpers.ts`)

- `expectValidEmbedding(embedding)` - Validate embedding format
- `expectValidMemory(memory)` - Validate memory structure

## Coverage Requirements

- **Line Coverage**: 95%+
- **Branch Coverage**: 90%+
- **Function Coverage**: 95%+
- **Statement Coverage**: 95%+

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open development/reports/coverage/index.html
```

## Best Practices

### 1. Test Naming

```typescript
// Good: Descriptive, behavior-focused
it("should create memory with five-sector embeddings");
it("should throw ValidationError for invalid user ID");

// Bad: Vague, implementation-focused
it("works");
it("test create");
```

### 2. Test Independence

```typescript
// Good: Each test is independent
beforeEach(() => {
  repo = new MemoryRepository();
});

// Bad: Tests depend on each other
let memory: Memory; // Shared state
it('should create', () => { memory = ... });
it('should retrieve', () => { repo.retrieve(memory.id) });
```

### 3. Realistic Test Data

```typescript
// Good: Realistic data
const memory = {
  content: "Met with Sarah to discuss Q4 roadmap",
  userId: "user-abc123",
  importance: 0.8,
};

// Bad: Minimal data
const memory = { content: "test", userId: "1" };
```

### 4. Clear Assertions

```typescript
// Good: Clear expectations
expect(memory.embeddings.episodic).toHaveLength(1536);
expect(memory.strength).toBeGreaterThanOrEqual(0);

// Bad: Vague assertions
expect(memory).toBeDefined();
```

### 5. Test Error Cases

```typescript
describe("MemoryRepository.create", () => {
  it("should create valid memory", async () => {
    // Happy path
  });

  it("should throw ValidationError for empty content", async () => {
    await expect(repo.create({ content: "" })).rejects.toThrow(ValidationError);
  });

  it("should handle concurrent creation gracefully", async () => {
    // Test edge case
  });
});
```

## Troubleshooting

### Tests Failing Unexpectedly

```bash
# Clear test cache
rm -rf node_modules/.vitest
npm test

# Reset test database
npm run db:test:teardown
npm run db:test:setup

# Generate HTML report for detailed analysis
npm test -- --reporter=html
open html/index.html
```

### Flaky Tests

```typescript
// Problem: Race condition
it("should process async operation", async () => {
  processAsync(); // No await!
  expect(result).toBeDefined(); // Fails randomly
});

// Solution: Proper async handling
it("should process async operation", async () => {
  await processAsync();
  expect(result).toBeDefined();
});
```

### Coverage Not Meeting Targets

```bash
# Generate detailed coverage report
npm run test:coverage -- --reporter=html

# Open report
open development/reports/coverage/index.html

# Add tests for uncovered code
# Remove dead code
```

## Additional Resources

- **[Vitest Documentation](https://vitest.dev/)** - Test framework docs
- **[Test Templates](../src/__tests__/templates/)** - Example test templates
- **[Test Utilities](../src/__tests__/utils/)** - Helper functions
- **[Development Guide](./DEVELOPMENT.md)** - Development workflow
- **[Requirements](../.kiro/specs/cognitive-architecture-complete-rebuild/requirements.md)** - Testing requirements

---

**Last Updated**: 2024-11-10
**Status**: Active - Cognitive Architecture Rebuild in Progress
