# ThoughtMCP Cognitive Architecture - Development Guide

This comprehensive guide covers the complete development workflow, tools, and best practices for the ThoughtMCP cognitive architecture. This guide is specifically designed for the PostgreSQL-based HMD memory system with parallel reasoning, framework selection, and metacognitive capabilities.

## Prerequisites

- **Node.js**: 18.0.0 or higher (LTS recommended)
- **npm**: 9.0.0 or higher
- **PostgreSQL**: 14.0 or higher with pgvector extension
- **Docker**: 20.10.0 or higher (for local PostgreSQL development)
- **Docker Compose**: 2.0.0 or higher
- **Git**: 2.30.0 or higher
- **TypeScript**: 5.0+ (installed via npm)
- **Vitest**: Latest (installed via npm)

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/keyurgolani/ThoughtMcp.git
cd ThoughtMcp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env.development
```

**Required Environment Variables:**

```bash
# PostgreSQL Configuration
DATABASE_URL=postgresql://thoughtmcp_dev:dev_password@localhost:5432/thoughtmcp_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=thoughtmcp_dev
DB_USER=thoughtmcp_dev
DB_PASSWORD=dev_password
DB_POOL_SIZE=20

# Embedding Configuration
EMBEDDING_MODEL=ollama/e5
EMBEDDING_DIMENSION=768
OLLAMA_HOST=http://localhost:11434

# Application Configuration
NODE_ENV=development
LOG_LEVEL=DEBUG
CACHE_TTL=300
MAX_PROCESSING_TIME=30000
```

### 4. Start PostgreSQL with Docker

```bash
docker-compose up -d
docker-compose ps
```

### 5. Verify Setup

```bash
npm run typecheck
npm run build
npm test
npm run validate
```

## Project Architecture

ThoughtMCP follows a modular architecture with clear separation of concerns:

```
src/
├── bias/                    # Bias detection and correction
│   ├── bias-correction-engine.ts
│   ├── bias-learning-system.ts
│   ├── bias-monitoring-system.ts
│   └── bias-pattern-recognizer.ts
├── confidence/              # Confidence calibration system
│   ├── calibration-learning-engine.ts
│   ├── confidence-communication.ts
│   └── multi-dimensional-assessor.ts
├── database/                # PostgreSQL persistence layer
│   ├── connection-manager.ts
│   ├── schema-migration.ts
│   └── migrations/
├── embeddings/              # Five-sector embedding system
│   ├── embedding-engine.ts
│   ├── embedding-storage.ts
│   ├── cache.ts
│   └── models/
├── emotion/                 # Emotion detection system
│   ├── circumplex-analyzer.ts
│   ├── discrete-emotion-classifier.ts
│   ├── contextual-processor.ts
│   └── trajectory-tracker.ts
├── framework/               # Dynamic framework selection
│   ├── framework-selector.ts
│   ├── framework-learning.ts
│   ├── problem-classifier.ts
│   └── frameworks/
├── graph/                   # Waypoint graph system
│   ├── graph-traversal.ts
│   └── waypoint-builder.ts
├── memory/                  # HMD memory repository
│   └── memory-repository.ts
├── metacognitive/           # Self-improvement system
│   ├── adaptive-strategy-system.ts
│   ├── performance-monitoring-system.ts
│   └── self-improvement-system.ts
├── monitoring/              # Production monitoring
│   ├── health-checker.ts
│   ├── metrics-collector.ts
│   ├── structured-logger.ts
│   └── production-monitor.ts
├── reasoning/               # Parallel reasoning streams
│   ├── orchestrator.ts
│   ├── synthesis-engine.ts
│   ├── conflict-resolution-engine.ts
│   └── streams/
├── search/                  # Multi-strategy search
│   ├── memory-search-engine.ts
│   ├── vector-search-engine.ts
│   ├── full-text-search-engine.ts
│   └── metadata-filter-engine.ts
├── security/                # Security components
│   ├── input-validator.ts
│   ├── rate-limiter.ts
│   └── secrets-manager.ts
├── server/                  # MCP server integration
│   ├── mcp-server.ts
│   └── tool-registry.ts
├── temporal/                # Temporal decay system
│   ├── decay-engine.ts
│   ├── background-scheduler.ts
│   └── sector-config.ts
└── utils/                   # Shared utilities
    ├── errors.ts
    ├── error-handler.ts
    └── logger.ts
```

## Development Workflow

### Test-Driven Development (TDD) - Mandatory

ThoughtMCP follows strict TDD principles:

1. **RED**: Write failing test defining expected behavior
2. **GREEN**: Implement minimal code to pass test
3. **REFACTOR**: Improve code while tests validate correctness

```typescript
// 1. Write failing test
describe("MemoryRepository", () => {
  it("should create memory with five-sector embeddings", async () => {
    const repo = new MemoryRepository(db, embeddingEngine);
    const memory = await repo.create({
      content: "Test memory",
      userId: "user123",
    });
    expect(memory.embeddings.episodic).toHaveLength(768);
  });
});

// 2. Implement minimal code to pass
// 3. Refactor while tests validate
```

### npm Scripts Reference

#### Development

```bash
npm run dev              # Start development server
npm run dev:docker       # Start with Docker PostgreSQL
npm run build:watch      # Watch mode compilation
```

#### Build

```bash
npm run build            # Full production build
npm run build:quick      # Quick build without validation
npm run clean            # Clean build artifacts
```

#### Testing

```bash
npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # End-to-end tests only
npm run test:coverage    # Generate coverage report
npm run test:performance # Performance tests
npm run test:accuracy    # Accuracy validation tests
```

#### Database

```bash
npm run db:setup         # Initialize database
npm run db:migrate       # Run migrations
npm run db:status        # Show migration status
npm run db:reset         # Reset database
```

#### Quality

```bash
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format with Prettier
npm run typecheck        # TypeScript type checking
npm run validate         # Full validation
```

## Coding Standards

### TypeScript

- **Strict mode enabled**: No `any` types allowed
- **Explicit return types**: All functions must declare return types
- **No unused variables**: Clean up unused code
- **Async/await**: Use async/await over raw promises

### Naming Conventions

- **Classes**: PascalCase (`MemoryRepository`, `EmbeddingEngine`)
- **Functions**: camelCase (`createMemory`, `findSimilar`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Interfaces**: PascalCase (`DatabaseConfig`, `SearchQuery`)
- **Files**: kebab-case matching class name (`memory-repository.ts`)

### Error Handling

```typescript
import { CognitiveError, DatabaseError } from "../utils/errors";

async function saveMemory(memory: Memory): Promise<void> {
  try {
    await db.query("INSERT INTO memories ...", [memory]);
  } catch (error) {
    throw new DatabaseError("Failed to save memory", { cause: error });
  }
}
```

## Git Workflow

### Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch
- **feature/\***: Feature branches
- **fix/\***: Bug fix branches

### Commit Messages

```
type(scope): brief description

- Bullet points for specific changes
- Reference issues: Fixes #123
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `perf`

## Debugging

### VS Code Debugging

Use provided debug configurations in `.vscode/launch.json`:

1. Set breakpoints in code
2. Press F5 or use Debug panel
3. Select configuration
4. Start debugging

### Database Debugging

```bash
docker-compose exec postgres psql -U thoughtmcp_dev -d thoughtmcp_dev
```

```sql
SELECT * FROM memories LIMIT 10;
EXPLAIN ANALYZE SELECT * FROM memories WHERE user_id = 'user123';
```

### Logging

```typescript
import { logger } from "./utils/logger";

logger.debug("Processing memory", { memoryId, userId });
logger.info("Memory created", { memoryId, sector });
logger.error("Database error", { error, query });
```

## Performance Targets

- **Memory retrieval**: p50 <100ms, p95 <200ms, p99 <500ms
- **Embedding generation**: <500ms for 5 sectors
- **Parallel reasoning**: <30s total, <10s per stream
- **Confidence assessment**: <100ms
- **Bias detection**: <15% overhead
- **Emotion detection**: <200ms

## Troubleshooting

### TypeScript Compilation Errors

```bash
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Test Failures

```bash
npm test -- path/to/test.ts --reporter=verbose
npm run db:reset
npm run db:setup
```

### Database Connection Issues

```bash
docker-compose ps
docker-compose logs postgres
docker-compose restart postgres
```

## Additional Resources

- **[Testing Guide](./testing.md)** - Testing documentation
- **[Database Guide](./database.md)** - PostgreSQL setup
- **[Architecture Guide](./architecture.md)** - System design
- **[API Reference](./api.md)** - API documentation

---

**Last Updated**: December 2025
**Version**: 0.5.0
