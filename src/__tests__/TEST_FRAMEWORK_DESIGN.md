# ThoughtMCP Test Framework Design

## Overview

This document outlines the comprehensive test framework for the ThoughtMCP cognitive architecture rebuild. The framework supports unit, integration, end-to-end, performance, and accuracy tests with strict TDD principles.

## Test Structure

### Directory Organization

```
src/
├── __tests__/
│   ├── setup/
│   │   ├── global-setup.ts          # Test initialization
│   │   ├── global-teardown.ts       # Test cleanup
│   │   └── test-environment.ts      # Environment configuration
│   ├── utils/
│   │   ├── test-database.ts         # PostgreSQL test database management
│   │   ├── test-fixtures.ts         # Test data factories
│   │   ├── mock-embeddings.ts       # Embedding mocking utilities
│   │   ├── assertions.ts            # Custom assertions
│   │   └── test-helpers.ts          # Common test utilities
│   ├── unit/                        # Unit tests (mirror src structure)
│   ├── integration/                 # Integration tests
│   ├── e2e/                         # End-to-end tests
│   ├── performance/                 # Performance benchmarks
│   └── accuracy/                    # Accuracy validation tests
```

## Test Categories

### 1. Unit Tests (95%+ coverage target)

**Purpose**: Test individual components in isolation

**Characteristics**:

- Fast execution (<10ms per test)
- No external dependencies (database, network)
- Use mocks for dependencies
- Mirror source code structure exactly
- One test file per source file

**Naming Convention**: `{ComponentName}.test.ts`

**Example Structure**:

```typescript
describe("ComponentName", () => {
  describe("methodName", () => {
    it("should handle normal case", () => {});
    it("should handle edge case", () => {});
    it("should throw error on invalid input", () => {});
  });
});
```

### 2. Integration Tests

**Purpose**: Test component interactions and workflows

**Characteristics**:

- Test real database operations
- Test cross-component communication
- Use test database with setup/teardown
- Slower than unit tests (<1s per test)

**Naming Convention**: `{Feature}.integration.test.ts`

**Example Tests**:

- Memory creation → embedding generation → storage
- Search query → retrieval → ranking
- Reasoning workflow → confidence assessment → result

### 3. End-to-End Tests

**Purpose**: Test complete user workflows

**Characteristics**:

- Test full system behavior
- Use real database and embeddings
- Simulate user interactions
- Slowest tests (<10s per test)

**Naming Convention**: `{Workflow}.e2e.test.ts`

**Example Tests**:

- Complete memory lifecycle
- Complete reasoning workflow
- MCP tool invocation workflows

### 4. Performance Tests

**Purpose**: Validate latency and throughput targets

**Characteristics**:

- Measure execution time
- Test at scale (1k, 10k, 100k records)
- Validate p50, p95, p99 latencies
- Run separately from regular tests

**Naming Convention**: `{Component}.perf.test.ts`

**Targets**:

- Memory retrieval: p50 <100ms, p95 <200ms, p99 <500ms
- Embedding generation: <500ms for 5 sectors
- Parallel reasoning: <30s total, <10s per stream
- Confidence assessment: <100ms
- Bias detection: <15% overhead
- Emotion detection: <200ms

### 5. Accuracy Tests

**Purpose**: Validate cognitive accuracy targets

**Characteristics**:

- Test against known datasets
- Measure accuracy metrics
- Compare to baselines
- Run separately from regular tests

**Naming Convention**: `{Component}.accuracy.test.ts`

**Targets**:

- Confidence calibration: ±10%
- Bias detection: >70%
- Emotion detection: >75%
- Framework selection: >80%
- Memory retrieval relevance: >85%

## Test Utilities

### Test Database Management

**Features**:

- Create isolated test database per test suite
- Automatic schema setup and teardown
- Transaction-based test isolation
- Seed data generation
- Connection pooling for tests

**Usage**:

```typescript
const testDb = await createTestDatabase();
// Run tests
await cleanupTestDatabase(testDb);
```

### Test Fixtures

**Features**:

- Factory functions for test data
- Realistic data generation
- Customizable properties
- Relationship management

**Example**:

```typescript
const memory = createTestMemory({
  content: "Test content",
  sector: "semantic",
  strength: 0.8,
});
```

### Mock Embeddings

**Features**:

- Deterministic embedding generation
- Configurable dimensions
- Similarity control
- Fast generation for tests

**Usage**:

```typescript
const embedding = generateMockEmbedding(1536);
const similar = generateSimilarEmbedding(embedding, 0.9);
```

### Custom Assertions

**Features**:

- Domain-specific assertions
- Better error messages
- Reusable validation logic

**Examples**:

```typescript
expect(memory).toBeValidMemory();
expect(confidence).toBeCalibrated(actual, 0.1);
expect(embedding).toHaveDimension(1536);
expect(result).toMeetLatencyTarget(200);
```

## Test Configuration

### Vitest Configuration

**Key Settings**:

- TypeScript support with ES modules
- Node environment with PostgreSQL
- Coverage thresholds: 95% line, 90% branch
- Test timeouts: 10s default, 30s integration, 60s e2e
- Test isolation and cleanup
- Performance testing support
- Multiple reporters (verbose, coverage, junit)

### Environment Variables

**Test Environment**:

```
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5433/thoughtmcp_test
DB_HOST=localhost
DB_PORT=5433
DB_NAME=thoughtmcp_test
DB_USER=test
DB_PASSWORD=test
DB_POOL_SIZE=5
EMBEDDING_MODEL=mock
EMBEDDING_DIMENSION=1536
LOG_LEVEL=ERROR
```

## TDD Workflow

### Red-Green-Refactor Cycle

**1. RED - Write Failing Test**:

```typescript
describe("MemoryRepository", () => {
  it("should create memory with embeddings", async () => {
    const repo = new MemoryRepository(db, embeddingEngine);
    const memory = await repo.create({
      content: "Test memory",
      sector: "semantic",
    });

    expect(memory.id).toBeDefined();
    expect(memory.embeddings).toHaveLength(5);
  });
});
```

**2. GREEN - Implement Minimal Code**:

```typescript
class MemoryRepository {
  async create(content: MemoryContent): Promise<Memory> {
    // Minimal implementation to pass test
    const id = generateId();
    const embeddings = await this.embeddingEngine.generateAll(content);
    return { id, ...content, embeddings };
  }
}
```

**3. REFACTOR - Improve While Tests Pass**:

```typescript
class MemoryRepository {
  async create(content: MemoryContent): Promise<Memory> {
    // Improved implementation with validation, error handling
    this.validateContent(content);
    const id = this.generateMemoryId();
    const embeddings = await this.generateEmbeddings(content);
    await this.persistToDatabase(id, content, embeddings);
    return this.buildMemoryObject(id, content, embeddings);
  }
}
```

## Best Practices

### Test Quality

1. **One Assertion Per Test** (when possible)
2. **Clear Test Names** (describe what, not how)
3. **Arrange-Act-Assert** pattern
4. **No Test Interdependencies**
5. **Fast Execution** (optimize slow tests)
6. **Deterministic Results** (no flaky tests)
7. **Meaningful Assertions** (not just "truthy")

### Test Data

1. **Use Factories** (not hardcoded data)
2. **Minimal Data** (only what's needed)
3. **Realistic Data** (representative of production)
4. **Isolated Data** (no shared state)

### Mocking Strategy

1. **Mock External Dependencies** (database, network)
2. **Don't Mock What You Own** (test real code)
3. **Verify Mock Interactions** (when relevant)
4. **Reset Mocks Between Tests**

### Coverage Goals

1. **95%+ Line Coverage** (mandatory)
2. **90%+ Branch Coverage** (mandatory)
3. **100% Critical Path Coverage** (mandatory)
4. **Test Edge Cases** (error conditions, boundaries)

## Performance Testing Strategy

### Benchmarking Approach

1. **Baseline Measurement** (establish current performance)
2. **Target Validation** (verify meets requirements)
3. **Regression Detection** (catch performance degradation)
4. **Scalability Testing** (test at 1k, 10k, 100k, 1M scale)

### Metrics Collection

- **Latency**: p50, p95, p99 percentiles
- **Throughput**: operations per second
- **Resource Usage**: CPU, memory, connections
- **Scalability**: performance vs. data size

## Accuracy Testing Strategy

### Validation Approach

1. **Ground Truth Datasets** (known correct answers)
2. **Baseline Comparison** (compare to previous versions)
3. **Human Evaluation** (sample validation)
4. **Continuous Monitoring** (track over time)

### Metrics Collection

- **Accuracy**: correct predictions / total predictions
- **Precision**: true positives / (true positives + false positives)
- **Recall**: true positives / (true positives + false negatives)
- **Calibration Error**: |predicted - actual|

## CI/CD Integration

### Pre-Commit Checks

```bash
npm run lint
npm run type-check
npm test -- --run
```

### CI Pipeline

```bash
npm run lint:strict
npm run type-check
npm run build
npm run test:coverage
npm run test:integration
npm run test:e2e
```

### Quality Gates

- All tests must pass
- 95%+ line coverage
- 90%+ branch coverage
- Zero TypeScript errors
- Zero ESLint errors
- Build succeeds

## Test Templates

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ComponentName } from "../path/to/component";

describe("ComponentName", () => {
  let component: ComponentName;

  beforeEach(() => {
    component = new ComponentName();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe("methodName", () => {
    it("should handle normal case", () => {
      const result = component.methodName("input");
      expect(result).toBe("expected");
    });

    it("should throw error on invalid input", () => {
      expect(() => component.methodName(null)).toThrow();
    });
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDatabase, cleanupTestDatabase } from "../utils/test-database";

describe("Feature Integration", () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDb);
  });

  it("should complete workflow", async () => {
    // Arrange
    const input = createTestInput();

    // Act
    const result = await performWorkflow(testDb, input);

    // Assert
    expect(result).toMatchExpectedOutput();
  });
});
```

### Performance Test Template

```typescript
import { describe, it, expect } from "vitest";
import { measureLatency, validatePercentiles } from "../utils/test-helpers";

describe("Component Performance", () => {
  it("should meet latency targets", async () => {
    const latencies = await measureLatency(() => component.operation(), {
      iterations: 1000,
    });

    const percentiles = validatePercentiles(latencies);
    expect(percentiles.p50).toBeLessThan(100);
    expect(percentiles.p95).toBeLessThan(200);
    expect(percentiles.p99).toBeLessThan(500);
  });
});
```

## Troubleshooting

### Common Issues

1. **Flaky Tests**: Use deterministic data, avoid timing dependencies
2. **Slow Tests**: Optimize database operations, use mocks where appropriate
3. **Test Isolation**: Ensure proper cleanup, avoid shared state
4. **Coverage Gaps**: Identify untested branches, add edge case tests

### Debug Strategies

1. **Run Single Test**: `npm test -- path/to/test.ts`
2. **Enable Verbose Output**: `npm test -- --reporter=verbose`
3. **Debug Mode**: Use VS Code debugger with test configuration
4. **Inspect Coverage**: Review HTML coverage report

## Conclusion

This test framework provides comprehensive testing infrastructure for the ThoughtMCP cognitive architecture rebuild. It enforces TDD principles, ensures high quality through coverage targets, validates performance and accuracy requirements, and supports continuous integration workflows.
