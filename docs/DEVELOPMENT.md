# ThoughtMCP Cognitive Architecture - Development Guide

This comprehensive guide covers the complete development workflow, tools, and best practices for the ThoughtMCP cognitive architecture rebuild. This guide is specifically designed for the new PostgreSQL-based HMD memory system with parallel reasoning, framework selection, and metacognitive capabilities.

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
# Install all dependencies
npm install

# This installs:
# - TypeScript and build tools
# - Vitest test framework
# - PostgreSQL client (pg)
# - ESLint and Prettier
# - All other development dependencies
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env.development

# Edit .env.development with your settings
vim .env.development
```

**Required Environment Variables:**

```bash
# PostgreSQL Configuration (Required)
DATABASE_URL=postgresql://thoughtmcp_dev:dev_password@localhost:5432/thoughtmcp_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=thoughtmcp_dev
DB_USER=thoughtmcp_dev
DB_PASSWORD=dev_password
DB_POOL_SIZE=20

# Embedding Configuration (Required)
EMBEDDING_MODEL=ollama/e5  # Options: ollama/e5, ollama/bge, e5, bge
EMBEDDING_DIMENSION=1536   # Model-specific dimension
OLLAMA_HOST=http://localhost:11434  # If using Ollama

# Application Configuration
NODE_ENV=development
LOG_LEVEL=DEBUG  # DEBUG for development, INFO for production
CACHE_TTL=300    # Query cache TTL in seconds
MAX_PROCESSING_TIME=30000  # Max processing time in ms
```

**Legacy Variables Removed:**

- `COGNITIVE_*` variables (old configuration system)
- `DATABASE_TYPE` (SQLite no longer supported)
- `SQLITE_FILE_PATH` (SQLite no longer supported)

### 4. Start PostgreSQL with Docker

```bash
# Start PostgreSQL with pgvector extension
docker-compose up -d

# Verify database is running
docker-compose ps

# Check logs
docker-compose logs -f postgres

# Database will be automatically initialized with:
# - pgvector extension
# - Schema (memories, embeddings, links, metadata tables)
# - Indexes (vector, full-text, composite)
```

**Manual PostgreSQL Setup (Alternative):**

If you prefer to use an existing PostgreSQL instance:

```bash
# Enable pgvector extension
psql -U postgres -d thoughtmcp_dev -f scripts/db/enable-pgvector.sql

# Initialize schema
psql -U postgres -d thoughtmcp_dev -f scripts/db/init.sql

# Or use npm script
npm run db:setup
```

### 5. Verify Setup

```bash
# Type check (should have zero errors)
npm run typecheck

# Build (should complete successfully)
npm run build

# Run tests (should all pass)
npm test

# Full validation (format, lint, typecheck, test)
npm run validate
```

**Expected Output:**

```
✓ TypeScript compilation: 0 errors
✓ ESLint: 0 errors, 0 warnings
✓ Prettier: All files formatted
✓ Tests: All passing
✓ Coverage: 95%+ line, 90%+ branch
```

## Development Workflow

### Test-Driven Development (TDD) - Mandatory

ThoughtMCP follows **strict TDD principles**. Tests are guardrails that prevent hallucination and incorrect code.

**Red-Green-Refactor Cycle:**

1. **Red**: Write failing test defining expected behavior
2. **Green**: Implement minimal code to pass test
3. **Refactor**: Clean up while keeping tests green

**Example TDD Workflow:**

```bash
# 1. Create test file (mirrors source structure)
touch src/cognitive/__tests__/MemoryRepository.test.ts

# 2. Write failing test
cat > src/cognitive/__tests__/MemoryRepository.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { MemoryRepository } from '../MemoryRepository';

describe('MemoryRepository', () => {
  it('should create memory with five-sector embeddings', async () => {
    const repo = new MemoryRepository();
    const memory = await repo.create({
      content: 'Test memory',
      userId: 'user123'
    });

    expect(memory.embeddings).toBeDefined();
    expect(memory.embeddings.episodic).toHaveLength(1536);
    expect(memory.embeddings.semantic).toHaveLength(1536);
    expect(memory.embeddings.procedural).toHaveLength(1536);
    expect(memory.embeddings.emotional).toHaveLength(1536);
    expect(memory.embeddings.reflective).toHaveLength(1536);
  });
});
EOF

# 3. Run test (should fail - RED)
npm test -- MemoryRepository.test.ts
# Expected: Test fails because MemoryRepository doesn't exist

# 4. Implement minimal code to pass test (GREEN)
cat > src/cognitive/MemoryRepository.ts << 'EOF'
export class MemoryRepository {
  async create(content: { content: string; userId: string }) {
    // Minimal implementation to pass test
    return {
      id: 'mem-123',
      content: content.content,
      userId: content.userId,
      embeddings: {
        episodic: new Array(1536).fill(0),
        semantic: new Array(1536).fill(0),
        procedural: new Array(1536).fill(0),
        emotional: new Array(1536).fill(0),
        reflective: new Array(1536).fill(0)
      }
    };
  }
}
EOF

# 5. Run test (should pass - GREEN)
npm test -- MemoryRepository.test.ts
# Expected: Test passes

# 6. Refactor while keeping tests green
# - Add proper types
# - Extract embedding generation
# - Add error handling
# - Improve code quality

# 7. Verify all quality checks pass
npm run validate
```

**TDD Best Practices:**

- **Write tests first** - Always write failing tests before implementation
- **One test at a time** - Focus on one behavior per test
- **Minimal implementation** - Write just enough code to pass the test
- **Refactor continuously** - Improve code while tests validate correctness
- **Test behavior, not implementation** - Focus on what, not how
- **Keep tests simple** - Tests should be easier to understand than the code they test

**Coverage Requirements:**

- **95%+ line coverage** - Almost all code must be tested
- **90%+ branch coverage** - All decision paths must be tested
- **100% critical path coverage** - Core functionality must be fully tested

### npm Scripts Reference

#### Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Start with Docker PostgreSQL
npm run dev:docker

# Watch mode for TypeScript compilation
npm run build:watch
```

#### Build Scripts

```bash
# Full production build (TypeScript + bundling)
npm run build

# Generate TypeScript declarations only
npm run build:types

# Bundle with esbuild (assumes types exist)
npm run build:bundle

# Clean build artifacts (dist/, coverage/)
npm run clean
```

**Build Output:**

- `dist/` - Compiled JavaScript and type declarations
- `dist/index.js` - Main entry point
- `dist/index.d.ts` - TypeScript declarations

#### Test Scripts

```bash
# Run all tests (unit + integration + e2e)
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only end-to-end tests
npm run test:e2e

# Run tests in watch mode (development)
npm run test:watch

# Generate coverage report (95%+ target)
npm run test:coverage

# Run performance tests
npm run test:performance

# Run accuracy validation tests
npm run test:accuracy
```

**Test Organization:**

- `src/__tests__/` - Test files mirror source structure
- `src/__tests__/setup/` - Global test setup and teardown
- `src/__tests__/utils/` - Test utilities and helpers
- `src/__tests__/templates/` - Test templates for different types

#### Database Scripts

```bash
# Setup PostgreSQL schema and indexes
npm run db:setup

# Run database migrations
npm run db:migrate

# Seed database with test data
npm run db:seed

# Reset database to clean state
npm run db:reset

# Setup test database
npm run db:test:setup

# Teardown test database
npm run db:test:teardown
```

**Database Management:**

```bash
# Start PostgreSQL with Docker
docker-compose up -d

# Stop PostgreSQL
docker-compose down

# View logs
docker-compose logs -f postgres

# Connect to database
docker-compose exec postgres psql -U thoughtmcp_dev -d thoughtmcp_dev

# Backup database
docker-compose exec postgres pg_dump -U thoughtmcp_dev thoughtmcp_dev > backup.sql

# Restore database
docker-compose exec -T postgres psql -U thoughtmcp_dev thoughtmcp_dev < backup.sql
```

#### Quality & Validation Scripts

```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check

# TypeScript type checking
npm run typecheck

# Run all quality checks (lint + format + typecheck + test)
npm run validate

# CI validation (includes build)
npm run validate:ci
```

**Quality Standards:**

- Zero TypeScript errors and warnings
- Zero ESLint errors and warnings
- All files formatted with Prettier
- All tests passing
- 95%+ test coverage

#### Production Scripts

```bash
# Start production MCP server
npm start

# Start with production configuration
npm run start:prod

# Start with debug logging
npm run start:debug
```

## Project Structure

```
ThoughtMCP/
├── .kiro/                          # Kiro IDE configuration
│   ├── settings/                   # IDE settings
│   │   └── mcp.json               # MCP server configuration
│   ├── specs/                      # Feature specifications
│   │   └── cognitive-architecture-complete-rebuild/
│   │       ├── requirements.md    # Requirements document
│   │       ├── design.md          # Design document
│   │       └── tasks.md           # Implementation tasks
│   └── steering/                   # Development guidelines
│       └── ComprehensiveDevelopmentGuide.md
├── .vscode/                        # VS Code configuration
│   ├── settings.json              # Editor settings
│   ├── extensions.json            # Recommended extensions
│   ├── launch.json                # Debug configurations
│   └── tasks.json                 # Build tasks
├── docs/                           # Documentation
│   ├── DEVELOPMENT.md             # This file
│   ├── TESTING.md                 # Testing guide
│   ├── DATABASE.md                # Database guide
│   ├── ENVIRONMENT.md             # Environment configuration
│   ├── BUILD.md                   # Build system guide
│   └── BUILD_OPTIMIZATION.md      # Build optimization
├── scripts/                        # Utility scripts
│   ├── build.mjs                  # Build script
│   └── db/                        # Database scripts
│       ├── init.sql               # Schema initialization
│       ├── enable-pgvector.sql    # pgvector setup
│       └── migrate.sh             # Migration tool
├── src/                            # Source code
│   ├── __tests__/                 # Test files (mirrors src/ structure)
│   │   ├── setup/                 # Global test setup
│   │   │   ├── global-setup.ts   # Test initialization
│   │   │   ├── global-teardown.ts # Test cleanup
│   │   │   └── test-environment.ts # Test environment
│   │   ├── utils/                 # Test utilities
│   │   │   ├── test-database.ts  # Database test helpers
│   │   │   ├── test-fixtures.ts  # Test data factories
│   │   │   ├── mock-embeddings.ts # Embedding mocks
│   │   │   ├── assertions.ts     # Custom assertions
│   │   │   └── test-helpers.ts   # General helpers
│   │   ├── templates/             # Test templates
│   │   │   ├── unit-test.template.ts
│   │   │   ├── integration-test.template.ts
│   │   │   ├── e2e-test.template.ts
│   │   │   ├── performance-test.template.ts
│   │   │   └── accuracy-test.template.ts
│   │   └── examples/              # Example tests
│   │       ├── example-unit.test.ts
│   │       └── example-async.test.ts
│   ├── cognitive/                 # Cognitive architecture (Phase 1-9)
│   │   ├── memory/                # HMD memory system
│   │   │   ├── MemoryRepository.ts
│   │   │   ├── EmbeddingEngine.ts
│   │   │   ├── WaypointGraphBuilder.ts
│   │   │   └── TemporalDecayEngine.ts
│   │   ├── reasoning/             # Reasoning systems
│   │   │   ├── ParallelReasoningProcessor.ts
│   │   │   ├── FrameworkSelector.ts
│   │   │   └── streams/
│   │   ├── metacognition/         # Metacognitive systems
│   │   │   ├── ConfidenceAssessor.ts
│   │   │   ├── BiasDetector.ts
│   │   │   └── EmotionAnalyzer.ts
│   │   └── index.ts               # Public API
│   ├── server/                    # MCP server (Phase 11)
│   │   ├── MCPServer.ts
│   │   ├── tools/                 # MCP tool implementations
│   │   └── index.ts
│   ├── database/                  # Database layer (Phase 1)
│   │   ├── DatabaseConnectionManager.ts
│   │   ├── SchemaMigrationSystem.ts
│   │   └── index.ts
│   ├── types/                     # TypeScript types
│   │   ├── memory.ts
│   │   ├── reasoning.ts
│   │   ├── metacognition.ts
│   │   └── index.ts
│   ├── utils/                     # Utilities
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── index.ts
│   └── index.ts                   # Main entry point
├── .editorconfig                  # Editor configuration
├── .env.example                   # Environment template
├── .env.development               # Development environment (not committed)
├── .env.test                      # Test environment (not committed)
├── .eslintrc.js                   # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── .gitignore                     # Git ignore rules
├── docker-compose.yml             # Docker services (PostgreSQL)
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── vitest.config.ts               # Vitest test configuration
├── LICENSE                        # MIT license
└── README.md                      # Project overview
```

**Key Directories:**

- **`.kiro/specs/`** - Feature specifications (requirements, design, tasks)
- **`src/cognitive/`** - Core cognitive architecture implementation
- **`src/__tests__/`** - Test files (mirrors source structure exactly)
- **`src/database/`** - PostgreSQL connection and schema management
- **`src/server/`** - MCP server and tool implementations
- **`docs/`** - Comprehensive documentation
- **`scripts/`** - Build and database utility scripts

## Coding Standards

### TypeScript

- **Strict mode enabled**: No `any` types allowed
- **Explicit return types**: All functions must declare return types
- **No unused variables**: Clean up unused code
- **Prefer const**: Use `const` over `let` when possible
- **Async/await**: Use async/await over raw promises

**Good:**

```typescript
async function fetchMemory(id: string): Promise<Memory | null> {
  const result = await db.query("SELECT * FROM memories WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}
```

**Bad:**

```typescript
function fetchMemory(id: any) {
  // ❌ No 'any', no return type
  return db.query("SELECT * FROM memories WHERE id = $1", [id]).then((result) => result.rows[0]); // ❌ Use async/await
}
```

### Naming Conventions

- **Classes**: PascalCase (`MemoryRepository`, `EmbeddingEngine`)
- **Functions**: camelCase (`createMemory`, `findSimilar`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Interfaces**: PascalCase with descriptive names (`DatabaseConfig`, `SearchQuery`)
- **Files**: Match class/function name (`MemoryRepository.ts`, `utils.ts`)

### File Organization

- **One class per file**: Each class in its own file
- **Index files**: Use `index.ts` to export public API
- **Test files**: Mirror source structure in `__tests__/`
- **No alternative versions**: No `-v2`, `-new`, `-old` suffixes

### Error Handling

```typescript
// Define custom error types
class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly query?: string
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

// Use try-catch with specific error handling
async function saveMemory(memory: Memory): Promise<void> {
  try {
    await db.query("INSERT INTO memories ...", [memory]);
  } catch (error) {
    if (error instanceof DatabaseError) {
      logger.error("Database error", { error, memory });
      throw error;
    }
    throw new DatabaseError("Failed to save memory", error.message);
  }
}
```

### Comments and Documentation

```typescript
/**
 * Finds similar memories using vector similarity search.
 *
 * Uses composite scoring: 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×link_weight
 *
 * @param queryEmbedding - Query vector for similarity search
 * @param sector - Memory sector to search (episodic, semantic, etc.)
 * @param userId - User identifier for filtering
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of similar memories ranked by composite score
 * @throws {DatabaseError} If database query fails
 */
async function findSimilarMemories(
  queryEmbedding: number[],
  sector: MemorySector,
  userId: string,
  limit: number = 10
): Promise<Memory[]> {
  // Implementation
}
```

## Git Workflow

### Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/\***: Feature branches
- **fix/\***: Bug fix branches
- **docs/\***: Documentation updates

### Commit Messages

Follow conventional commits format:

```
type(scope): brief description

Detailed explanation of what changed and why.

- Bullet points for specific changes
- Reference issues: Fixes #123
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Test changes
- `docs`: Documentation
- `style`: Formatting
- `perf`: Performance improvement

**Examples:**

```bash
# Good
git commit -m "feat(memory): implement five-sector embedding generation

- Add EmbeddingEngine class with sector-specific generation
- Implement caching for performance
- Add comprehensive tests with 95% coverage

Implements requirement 2.1, 2.2, 2.3"

# Bad
git commit -m "update code"  # ❌ Too vague
git commit -m "fix bug"      # ❌ No context
```

### Pre-commit Hooks

Husky runs quality checks before commits:

```bash
# Automatically runs on git commit:
- npm run lint
- npm run type-check
- npm test (affected tests)
```

To bypass (use sparingly):

```bash
git commit --no-verify
```

## Debugging

### VS Code Debugging

Use provided debug configurations:

1. **Debug ThoughtMCP Server**: Debug main server
2. **Debug Current Test File**: Debug open test file
3. **Debug All Tests**: Debug entire test suite
4. **Debug TypeScript File**: Debug any TypeScript file

**Usage:**

1. Set breakpoints in code
2. Press F5 or use Debug panel
3. Select configuration
4. Start debugging

### Database Debugging

```bash
# Connect to database
docker-compose exec postgres psql -U thoughtmcp_dev -d thoughtmcp_dev

# View table contents
SELECT * FROM memories LIMIT 10;

# Check indexes
\di

# View query performance
EXPLAIN ANALYZE SELECT * FROM memories WHERE user_id = 'user123';

# Monitor connections
SELECT * FROM pg_stat_activity;
```

### Logging

```typescript
import { logger } from "./utils/logger";

// Use structured logging
logger.debug("Processing memory", { memoryId, userId });
logger.info("Memory created", { memoryId, sector });
logger.warn("High memory usage", { usage: "85%" });
logger.error("Database error", { error, query });
```

## Performance Optimization

### Profiling

```bash
# Profile tests
npm test -- --reporter=verbose

# Profile build
npm run build -- --diagnostics

# Profile Node.js
node --prof dist/index.js
node --prof-process isolate-*.log > profile.txt
```

### Database Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT ...;

-- Rebuild indexes
SELECT rebuild_vector_indexes();

-- Check index usage
SELECT * FROM pg_stat_user_indexes;

-- Vacuum and analyze
VACUUM ANALYZE memories;
```

## Troubleshooting

### Common Development Issues

#### TypeScript Compilation Errors

**Problem**: TypeScript compilation fails with type errors

**Solution**:

```bash
# Clean build artifacts
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript configuration
npm run typecheck

# Rebuild
npm run build
```

**Common Causes:**

- Outdated dependencies
- Corrupted node_modules
- Invalid tsconfig.json
- Missing type declarations

#### Test Failures

**Problem**: Tests failing unexpectedly

**Solution**:

```bash
# Run specific test file
npm test -- path/to/test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Check test database connection
docker-compose logs postgres

# Reset test database
npm run db:test:teardown
npm run db:test:setup

# Clear test cache
rm -rf node_modules/.vitest
npm test
```

**Common Causes:**

- Database not running
- Test database not initialized
- Stale test data
- Race conditions in async tests
- Missing test setup/teardown

#### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL

**Solution**:

```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Verify connection settings
cat .env.development

# Test connection manually
docker-compose exec postgres psql -U thoughtmcp_dev -d thoughtmcp_dev -c "SELECT 1;"

# Rebuild database container
docker-compose down
docker-compose up -d --build
```

**Common Causes:**

- PostgreSQL not started
- Wrong connection credentials
- Port already in use
- Docker not running
- Network issues

#### ESLint/Prettier Errors

**Problem**: Linting or formatting errors

**Solution**:

```bash
# Auto-fix ESLint issues
npm run lint:fix

# Format all files
npm run format

# Check specific file
npx eslint src/path/to/file.ts
npx prettier --check src/path/to/file.ts

# Verify configuration
cat .eslintrc.js
cat .prettierrc
```

**Common Causes:**

- Conflicting ESLint/Prettier rules
- Outdated configuration
- Editor not configured correctly
- Missing ESLint plugins

#### Build Performance Issues

**Problem**: Build is slow or hangs

**Solution**:

```bash
# Use development build (faster)
npm run build:dev

# Clean and rebuild
npm run clean
npm run build

# Check for large files
du -sh dist/*

# Monitor build process
npm run build -- --diagnostics
```

**Common Causes:**

- Large source files
- Too many dependencies
- Insufficient system resources
- Circular dependencies

#### Docker Issues

**Problem**: Docker containers not starting or crashing

**Solution**:

```bash
# Check Docker status
docker ps -a

# View container logs
docker-compose logs

# Restart all services
docker-compose restart

# Rebuild containers
docker-compose down
docker-compose up -d --build

# Clean volumes and rebuild
docker-compose down -v
docker-compose up -d

# Check disk space
docker system df
docker system prune
```

**Common Causes:**

- Insufficient disk space
- Port conflicts
- Corrupted volumes
- Docker daemon issues
- Resource limits exceeded

#### Memory/Performance Issues

**Problem**: High memory usage or slow performance

**Solution**:

```bash
# Profile Node.js memory
node --max-old-space-size=4096 dist/index.js

# Monitor resource usage
docker stats

# Check for memory leaks
npm run test:performance

# Optimize database queries
docker-compose exec postgres psql -U thoughtmcp_dev -d thoughtmcp_dev
# Run: EXPLAIN ANALYZE <your query>;

# Rebuild indexes
npm run db:migrate
```

**Common Causes:**

- Memory leaks
- Inefficient queries
- Too many connections
- Large result sets
- Missing indexes

### Getting Help

If you encounter issues not covered here:

1. **Check Documentation**: Review relevant docs in `docs/` directory
2. **Search Issues**: Look for similar issues on GitHub
3. **Enable Debug Logging**: Set `LOG_LEVEL=DEBUG` in `.env.development`
4. **Create Issue**: Open a GitHub issue with:
   - Error message and stack trace
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)
   - Relevant logs

**Debug Logging:**

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
npm run dev

# Or in .env.development
echo "LOG_LEVEL=DEBUG" >> .env.development
```

## Best Practices

### 1. Test-Driven Development

- Write tests first
- Keep tests simple and focused
- Aim for 95%+ coverage

### 2. Code Quality

- No `any` types
- No `@ts-ignore` or `eslint-disable`
- Fix all warnings
- Run `npm run validate` before committing

### 3. Performance

- Profile before optimizing
- Use connection pooling
- Cache expensive operations
- Monitor query performance

### 4. Security

- Never commit secrets
- Use environment variables
- Validate all inputs
- Sanitize database queries

### 5. Documentation

- Document public APIs
- Explain complex logic
- Keep README updated
- Write clear commit messages

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Vitest Documentation](https://vitest.dev/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/keyurgolani/ThoughtMcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/keyurgolani/ThoughtMcp/discussions)
- **Documentation**: Check `docs/` directory

## Development Best Practices Summary

### 1. Test-Driven Development

- Write tests first, always
- Aim for 95%+ line coverage, 90%+ branch coverage
- Tests are guardrails preventing incorrect code

### 2. Code Quality

- Zero TypeScript errors and warnings
- No `any` types, `@ts-ignore`, or `eslint-disable`
- Fix all issues immediately, don't suppress

### 3. Performance

- Profile before optimizing
- Meet all latency targets (p50 <100ms, p95 <200ms, p99 <500ms)
- Use connection pooling and caching

### 4. Security

- Never commit secrets
- Use environment variables
- Validate all inputs
- Sanitize database queries

### 5. Documentation

- Document public APIs
- Explain complex logic
- Keep documentation updated
- Write clear commit messages

### 6. Workflow

- Plan → Use Tools → Reflect → Persist
- One task at a time
- Complete implementation fully before moving on
- Run validation before committing

## Additional Resources

### Documentation

- **[Testing Guide](./TESTING.md)** - Comprehensive testing documentation
- **[Database Guide](./DATABASE.md)** - PostgreSQL and pgvector setup
- **[Environment Configuration](./ENVIRONMENT.md)** - Environment variables
- **[Build Guide](./BUILD.md)** - Build system details
- **[Build Optimization](./BUILD_OPTIMIZATION.md)** - Performance tuning

### Specifications

- **[Requirements](../.kiro/specs/cognitive-architecture-complete-rebuild/requirements.md)** - System requirements
- **[Design](../.kiro/specs/cognitive-architecture-complete-rebuild/design.md)** - Architecture design
- **[Tasks](../.kiro/specs/cognitive-architecture-complete-rebuild/tasks.md)** - Implementation plan

### External Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Vitest Documentation](https://vitest.dev/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)

## Getting Help

- **GitHub Issues**: [Report bugs and request features](https://github.com/keyurgolani/ThoughtMcp/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/keyurgolani/ThoughtMcp/discussions)
- **Documentation**: Check `docs/` directory for detailed guides
- **Specifications**: Review `.kiro/specs/` for requirements and design

---

**Last Updated**: 2024-11-10
**Status**: Active - Cognitive Architecture Rebuild in Progress
