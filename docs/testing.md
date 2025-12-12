# ThoughtMCP Cognitive Architecture - Testing Guide

This comprehensive guide covers testing strategies, best practices, and workflows for the ThoughtMCP cognitive architecture. Testing is mandatory and follows strict Test-Driven Development (TDD) principles.

## Testing Philosophy

**Tests are guardrails that prevent incorrect implementations.**

### Core Principles

1. **Tests First**: Write failing tests before implementation
2. **Comprehensive Coverage**: 75%+ coverage for lines, branches, functions, and statements
3. **Test Behavior**: Focus on what, not how
4. **Keep Tests Simple**: Tests should be easier to understand than code
5. **Fast Feedback**: Tests should run quickly (<2 minutes for full suite)
6. **Isolated Tests**: Each test should be independent
7. **Realistic Tests**: No mocks for core functionality

## Test Architecture

ThoughtMCP uses a **two-category test architecture** that separates fast local tests from slower E2E tests requiring real external dependencies.

### Test Categories

| Category    | Dependencies                  | Execution             | Typical Duration |
| ----------- | ----------------------------- | --------------------- | ---------------- |
| Local Tests | All mocked                    | Parallel (10 threads) | ~40s             |
| E2E Tests   | Real PostgreSQL + Real Ollama | Sequential            | ~60s             |

### Test Classification

Tests are classified based on their file location:

- **Local Tests (Unit)**: `src/__tests__/unit/**` - All external dependencies mocked
- **Local Tests (Integration)**: `src/__tests__/integration/**` - Module interactions with mocked external deps
- **E2E Tests**: `src/__tests__/e2e/**` - Complete workflows with real PostgreSQL and Ollama

### Execution Strategy

Local tests run in parallel with 10 threads for fast feedback. E2E tests run sequentially with real containers that are automatically started and stopped.

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Architecture                         │
├─────────────────────────────────────────────────────────────┤
│  LOCAL TESTS (npm test, npm run build)                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Unit Tests + Integration Tests                      │    │
│  │  - All external dependencies mocked                  │    │
│  │  - Parallel execution (10 threads)                   │    │
│  │  - Fast feedback (~40s)                              │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  E2E TESTS (npm run test:e2e)                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  End-to-End Tests                                    │    │
│  │  - Real PostgreSQL + Real Ollama                     │    │
│  │  - Sequential execution                              │    │
│  │  - Containers auto-start/stop                        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Test Organization

```
src/__tests__/
├── setup/                   # Test setup/teardown files
│   ├── local-setup.ts      # Local tests setup (unit + integration with mocks)
│   ├── e2e-setup.ts        # E2E tests setup (real PostgreSQL + Ollama)
│   ├── e2e-teardown.ts     # E2E tests teardown (container cleanup)
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
├── unit/                    # Local: Unit tests (mirrors src/)
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
├── integration/             # Local: Integration tests (mocked external deps)
│   ├── memory-lifecycle.test.ts
│   ├── memory-deletion.test.ts
│   ├── embedding-storage.test.ts
│   ├── graph-traversal.test.ts
│   ├── temporal-decay.test.ts
│   ├── search-integration.test.ts
│   └── reasoning-workflow.test.ts
├── e2e/                     # E2E: End-to-end tests (real dependencies)
│   └── mcp-tools.test.ts
└── production/              # Production readiness tests
    └── production-readiness.test.ts
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

### Quick Reference

```bash
# Run local tests (unit + integration with mocks)
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run E2E tests (auto-starts containers)
npm run test:e2e

# Run full QA suite (local + E2E)
npm run test:qa
```

### Test Commands

```bash
# Local tests (no external dependencies)
npm test                   # All local tests (unit + integration)
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only

# E2E tests (requires PostgreSQL + Ollama)
npm run test:e2e           # E2E tests (containers auto-start)
npm run test:qa            # Full QA: local tests + E2E tests
```

### Additional Test Commands

```bash
# Run specific test file
npm test -- memory-repository.test.ts

# Run tests matching pattern
npm test -- --grep "embedding"

# Run with coverage
npm run test:coverage
```

### Recommended Timeouts

When running tests manually, use these timeout values (2x observed execution time):

| Command                    | Timeout |
| -------------------------- | ------- |
| `npm run test:unit`        | 75s     |
| `npm run test:integration` | 30s     |
| `npm test`                 | 90s     |
| `npm run test:coverage`    | 120s    |
| `npm run test:e2e`         | 180s    |
| `npm run test:qa`          | 240s    |

Example: `timeout 90s npm test`

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

- **Line Coverage**: 75%+
- **Branch Coverage**: 75%+
- **Function Coverage**: 75%+
- **Statement Coverage**: 75%+

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

## Test Container Management

ThoughtMCP uses Docker containers for PostgreSQL (with pgvector) and Ollama during testing. The `TestContainerManager` provides automatic container lifecycle management, eliminating the need for manual container setup.

### Automatic Container Management

By default, test containers start automatically when you run tests and stop when tests complete. This is controlled by the `AUTO_START_CONTAINERS` environment variable.

```bash
# Run tests with automatic container management (default)
npm test

# Explicitly enable auto-start
AUTO_START_CONTAINERS=true npm test

# Disable auto-start (use manually started containers)
AUTO_START_CONTAINERS=false npm test
```

### How It Works

The `TestContainerManager` orchestrates container lifecycle using Docker Compose as the single source of truth:

1. **Startup Phase** (in `global-setup.ts`):
   - Checks if `AUTO_START_CONTAINERS` is enabled (default: true)
   - Verifies Docker and Docker Compose availability
   - Checks for existing running containers
   - Allocates dynamic ports if defaults are occupied
   - Starts containers via `docker compose -f docker-compose.test.yml up`
   - Waits for health checks to pass
   - Configures test environment variables

2. **Teardown Phase** (in `global-teardown.ts`):
   - Checks `KEEP_CONTAINERS_RUNNING` setting
   - Stops containers that were started by the manager
   - Releases allocated ports
   - Handles SIGINT/SIGTERM for graceful cleanup

### Docker Compose Configuration

Test containers are defined in `docker-compose.test.yml`:

```yaml
services:
  postgres-test:
    image: pgvector/pgvector:pg16
    ports:
      - "${TEST_DB_PORT:-5433}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U thoughtmcp_test"]
      interval: 5s
      timeout: 3s
      retries: 10

  ollama-test:
    image: ollama/ollama:latest
    ports:
      - "${TEST_OLLAMA_PORT:-11435}:11434"
    healthcheck:
      test: ["CMD", "ollama", "list"]
      interval: 5s
      timeout: 10s
      retries: 15
```

All configuration values use environment variable substitution, allowing customization via `.env` files.

### Dynamic Port Allocation

When default ports are occupied (e.g., development containers running), the `TestContainerManager` automatically finds available ports:

- **PostgreSQL**: Default 5433, fallback range 5434-5500
- **Ollama**: Default 11435, fallback range 11436-11500

The allocated ports are passed to Docker Compose via environment variables (`TEST_DB_PORT`, `TEST_OLLAMA_PORT`) and configured in the test environment.

### Container Reuse

If test containers are already running and healthy, the `TestContainerManager` reuses them instead of starting new ones. This speeds up repeated test runs during development.

```bash
# Start containers manually (they'll be reused by tests)
docker compose -f docker-compose.test.yml up -d

# Run tests (containers are reused)
npm test

# Containers remain running after tests
```

### Environment Variables

| Variable                    | Default           | Description                           |
| --------------------------- | ----------------- | ------------------------------------- |
| `AUTO_START_CONTAINERS`     | `true`            | Enable automatic container startup    |
| `KEEP_CONTAINERS_RUNNING`   | `false`           | Keep containers running after tests   |
| `CONTAINER_STARTUP_TIMEOUT` | `60`              | Health check timeout in seconds       |
| `PRESERVE_TEST_DATA`        | `false`           | Preserve container volumes on cleanup |
| `TEST_DB_PORT`              | `5433`            | PostgreSQL external port              |
| `TEST_OLLAMA_PORT`          | `11435`           | Ollama external port                  |
| `TEST_CONTAINER_PREFIX`     | `thoughtmcp-test` | Container name prefix                 |
| `SKIP_DB_SETUP`             | `false`           | Skip database setup (for unit tests)  |

### Manual Container Management

For scenarios where you prefer manual control over containers:

```bash
# 1. Disable auto-start
export AUTO_START_CONTAINERS=false

# 2. Start containers manually
docker compose -f docker-compose.test.yml up -d

# 3. Wait for health checks
docker compose -f docker-compose.test.yml ps

# 4. Run tests
npm test

# 5. Stop containers when done
docker compose -f docker-compose.test.yml down
```

### CI/CD Integration

In CI environments, automatic container management works out of the box:

```yaml
# GitHub Actions example
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm test # Containers start automatically
```

For CI environments with pre-configured services:

```yaml
# Using GitHub Actions services
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        ports:
          - 5433:5432
    env:
      AUTO_START_CONTAINERS: false
    steps:
      - run: npm test
```

### Troubleshooting Container Issues

**Docker not available:**

```
❌ Docker is not available for test containers
   Options:
   1. Start Docker Desktop or Docker daemon
   2. Set AUTO_START_CONTAINERS=false and start containers manually
```

**Port conflicts:**

```
Using dynamic port 5434 (default 5433 occupied)
```

The manager automatically finds available ports. Check what's using the default port:

```bash
lsof -i :5433
```

**Health check failures:**

```bash
# Check container logs
docker compose -f docker-compose.test.yml logs postgres-test
docker compose -f docker-compose.test.yml logs ollama-test

# Check container status
docker compose -f docker-compose.test.yml ps
```

**Cleanup issues:**

```bash
# Force cleanup of test containers
docker compose -f docker-compose.test.yml down -v

# Remove orphaned containers
docker compose -f docker-compose.test.yml down --remove-orphans
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
