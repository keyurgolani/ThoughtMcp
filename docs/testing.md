# ThoughtMCP Cognitive Architecture - Testing Guide

This comprehensive guide covers testing strategies, best practices, and workflows for the ThoughtMCP cognitive architecture. Testing is mandatory and follows strict Test-Driven Development (TDD) principles.

## Testing Philosophy

**Tests are guardrails that prevent incorrect implementations.**

### Core Principles

1. **Tests First**: Write failing tests before implementation
2. **Comprehensive Coverage**: 95%+ line coverage, 90%+ branch coverage
3. **Test Behavior**: Focus on what, not how
4. **Keep Tests Simple**: Tests should be easier to understand than code
5. **Fast Feedback**: Tests should run quickly (<2 minutes for full suite)
6. **Isolated Tests**: Each test should be independent
7. **Realistic Tests**: No mocks for core functionality

## Test Organization

```
src/__tests__/
├── setup/                   # Global test setup
│   ├── global-setup.ts     # Test initialization
│   ├── global-teardown.ts  # Test cleanup
│   └── test-environment.ts # Test environment config
├── utils/                   # Test utilities
│   ├── test-database.ts    # Database test helpers
│   ├── test-fixtures.ts    # Test data factories
│   ├── mock-embeddings.ts  # Embedding mocks
│   ├── assertions.ts       # Custom assertions
│   └── test-helpers.ts     # General helpers
├── templates/               # Test templates
│   ├── unit-test.template.ts
│   ├── integration-test.template.ts
│   ├── e2e-test.template.ts
│   ├── performance-test.template.ts
│   └── accuracy-test.template.ts
├── unit/                    # Unit tests (mirrors src/ structure)
│   ├── bias/
│   ├── confidence/
│   ├── database/
│   ├── embeddings/
│   ├── emotion/
│   ├── framework/
│   ├── graph/
│   ├── memory/
│   ├── metacognitive/
│   ├── monitoring/
│   ├── reasoning/
│   ├── search/
│   ├── security/
│   ├── server/
│   ├── temporal/
│   └── utils/
├── integration/             # Integration tests
│   ├── memory-lifecycle.test.ts
│   ├── reasoning-workflow.test.ts
│   └── migration-process.test.ts
├── e2e/                     # End-to-end tests
│   └── mcp-tools.test.ts
├── performance/             # Performance tests
│   ├── embedding-generation.perf.test.ts
│   ├── memory-retrieval.perf.test.ts
│   ├── parallel-reasoning.perf.test.ts
│   └── search-operations.perf.test.ts
├── production/              # Production readiness tests
│   ├── production-environment.test.ts
│   └── production-readiness.test.ts
└── validation/              # Accuracy validation tests
    ├── accuracy-validation.test.ts
    └── framework-validation.test.ts
```

## Test Types

### 1. Unit Tests

Test individual components in isolation.

**Location**: `src/__tests__/unit/`

**Characteristics**:

- Fast execution (<100ms per test)
- No external dependencies
- Mock external services

**Example**:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { BiasPatternRecognizer } from "../../../bias/bias-pattern-recognizer";

describe("BiasPatternRecognizer", () => {
  let recognizer: BiasPatternRecognizer;

  beforeEach(() => {
    recognizer = new BiasPatternRecognizer();
  });

  it("should detect confirmation bias in reasoning chain", () => {
    const reasoning = {
      steps: [
        { type: "evidence", content: "Supporting evidence only" },
        { type: "conclusion", content: "Confirms initial hypothesis" },
      ],
    };

    const biases = recognizer.detectBiases(reasoning);

    expect(biases).toContainEqual(expect.objectContaining({ type: "confirmation" }));
  });
});
```

### 2. Integration Tests

Test interactions between components.

**Location**: `src/__tests__/integration/`

**Characteristics**:

- Moderate execution time (<1s per test)
- Uses real database (test instance)
- Tests component interactions

**Example**:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MemoryRepository } from "../../memory/memory-repository";
import { EmbeddingEngine } from "../../embeddings/embedding-engine";
import { setupTestDatabase, clearTestData } from "../utils/test-database";

describe("Memory Lifecycle Integration", () => {
  let db: DatabaseConnectionManager;
  let repo: MemoryRepository;

  beforeAll(async () => {
    db = await setupTestDatabase();
    repo = new MemoryRepository(db, new EmbeddingEngine());
  });

  afterAll(async () => {
    await clearTestData(db);
    await db.disconnect();
  });

  it("should create, retrieve, and delete memory", async () => {
    const memory = await repo.create({
      content: "Integration test memory",
      userId: "test-user",
    });

    const retrieved = await repo.retrieve(memory.id);
    expect(retrieved?.content).toBe("Integration test memory");

    await repo.delete(memory.id);
    const deleted = await repo.retrieve(memory.id);
    expect(deleted).toBeNull();
  });
});
```

### 3. End-to-End Tests

Test complete workflows from user perspective.

**Location**: `src/__tests__/e2e/`

**Characteristics**:

- Slower execution (<5s per test)
- Tests full MCP tool workflows
- Validates end-to-end functionality

### 4. Performance Tests

Validate performance requirements.

**Location**: `src/__tests__/performance/`

**Characteristics**:

- Tests latency targets (p50, p95, p99)
- Tests scalability
- Measures throughput

**Example**:

```typescript
import { describe, it, expect } from "vitest";
import { MemoryRepository } from "../../memory/memory-repository";

describe("Memory Retrieval Performance", () => {
  it("should retrieve memories within latency targets", async () => {
    const latencies: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await repo.search({ text: "test query", limit: 10 });
      latencies.push(performance.now() - start);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    expect(p50).toBeLessThan(100); // <100ms
    expect(p95).toBeLessThan(200); // <200ms
    expect(p99).toBeLessThan(500); // <500ms
  });
});
```

### 5. Accuracy Tests

Validate cognitive accuracy requirements.

**Location**: `src/__tests__/validation/`

**Characteristics**:

- Tests calibration error (±10%)
- Tests bias detection rate (>70%)
- Tests emotion detection accuracy (>75%)
- Tests framework selection accuracy (>80%)

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- memory-repository.test.ts

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

## Test Utilities

### Test Database (`src/__tests__/utils/test-database.ts`)

```typescript
import { setupTestDatabase, clearTestData, seedTestMemories } from "../utils/test-database";

// Setup test database
const db = await setupTestDatabase();

// Clear all test data
await clearTestData(db);

// Seed test memories
await seedTestMemories(db, 100);
```

### Test Fixtures (`src/__tests__/utils/test-fixtures.ts`)

```typescript
import { createTestMemory, createTestEmbedding } from "../utils/test-fixtures";

// Create test memory with defaults
const memory = createTestMemory({ content: "Custom content" });

// Create test embedding
const embedding = createTestEmbedding(768);
```

### Mock Embeddings (`src/__tests__/utils/mock-embeddings.ts`)

The mock embeddings system provides deterministic embeddings for testing without requiring a running Ollama server. It supports two modes:

1. **Cached mode**: Uses pre-computed embeddings from real Ollama server
2. **Generated mode**: Falls back to deterministic hash-based generation

```typescript
import { MockOllamaEmbeddingModel } from "../utils/mock-embeddings";

// Use mock for deterministic testing
const model = new MockOllamaEmbeddingModel({
  host: "http://localhost:11434",
  modelName: "nomic-embed-text",
  dimension: 768,
});

const embedding = await model.generate("test text");

// Check cache statistics
const stats = model.getCacheStats();
console.log(`Cache hits: ${stats.hits}, misses: ${stats.misses}`);
```

### Hybrid Embedding Model

For tests that should use real Ollama when available but fall back to mocks:

```typescript
import {
  createHybridEmbeddingModel,
  getUnitTestModel,
  getIntegrationTestModel,
} from "../utils/mock-embeddings";

// Unit tests: Always use mock (fast, deterministic)
const unitModel = getUnitTestModel();

// Integration tests: Use real Ollama if available
const { model, mode, reason } = await getIntegrationTestModel();
console.log(`Using ${mode} mode: ${reason}`);
```

### Capturing Real Ollama Embeddings

To ensure consistency between mock and real embeddings, capture real Ollama embeddings:

```bash
# Start Ollama server
ollama serve

# Pull the embedding model
ollama pull nomic-embed-text

# Capture embeddings for common test strings
npm run test:capture-embeddings
```

This generates `src/__tests__/utils/ollama-embeddings-cache.json` with pre-computed embeddings that the mock will use for matching test strings.

### Environment Variables

Control embedding behavior with environment variables:

- `USE_MOCK_EMBEDDINGS=true`: Always use mock embeddings
- `USE_REAL_OLLAMA=true`: Always use real Ollama (will fail if unavailable)
- Neither set: Auto-detect Ollama availability

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
let memory: Memory;
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
expect(memory.embeddings.episodic).toHaveLength(768);
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
});
```

## Mocking External Services

Tests must not depend on external services. Use mocks for isolation:

```typescript
// ❌ BAD: Depends on external Ollama service
const model = new OllamaEmbeddingModel({
  host: process.env.OLLAMA_HOST,
});

// ✅ GOOD: Uses deterministic mock
import { MockOllamaEmbeddingModel } from "../utils/mock-embeddings";

const model = new MockOllamaEmbeddingModel({
  host: "http://localhost:11434",
  modelName: "nomic-embed-text",
  dimension: 768,
});
```

## Troubleshooting

### Tests Failing Unexpectedly

```bash
# Clear test cache
rm -rf node_modules/.vitest
npm test

# Reset test database
npm run db:reset
npm run db:setup
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
npm run test:coverage

# Add tests for uncovered code
# Remove dead code
```

## Additional Resources

- **[Vitest Documentation](https://vitest.dev/)** - Test framework docs
- **[Test Templates](../src/__tests__/templates/)** - Example templates
- **[Development Guide](./development.md)** - Development workflow

---

**Last Updated**: December 2025
**Version**: 0.5.0
