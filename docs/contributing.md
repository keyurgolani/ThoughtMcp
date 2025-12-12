# Contributing to ThoughtMCP - Detailed Guide

> For a quick overview, see [CONTRIBUTING.md](../CONTRIBUTING.md) in the project root.

This guide provides detailed information for contributors to ThoughtMCP.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ with pgvector
- Docker and Docker Compose
- Git

## Development Setup

```bash
git clone https://github.com/keyurgolani/ThoughtMcp.git
cd ThoughtMcp
npm install
docker-compose up -d
npm run db:setup
npm run validate
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Follow TDD (Test-Driven Development)

**Always write tests first:**

1. Write failing test defining expected behavior
2. Implement minimal code to pass test
3. Refactor while tests validate correctness

### 3. Code Standards

- **No `any` types** in TypeScript
- **No `@ts-ignore`** or `eslint-disable`
- **75%+ test coverage** for lines, branches, functions, and statements
- **Zero TypeScript errors**

### 4. Run Validation

```bash
npm run validate
```

This runs: ESLint, Prettier check, TypeScript type check, and all tests with coverage.

### 5. Commit Messages

Follow conventional commits:

```
type(scope): brief description

- Detailed changes
- Reference issues: Fixes #123
```

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `perf`

### 6. Submit Pull Request

1. Push your branch
2. Create PR against `main`
3. Fill out PR template
4. Wait for review

## Project Structure

```
src/
├── bias/           # Bias detection
├── confidence/     # Confidence calibration
├── database/       # PostgreSQL layer
├── embeddings/     # Embedding system
├── emotion/        # Emotion detection
├── framework/      # Framework selection
├── graph/          # Waypoint graph
├── memory/         # Memory repository
├── metacognitive/  # Self-improvement
├── monitoring/     # Production monitoring
├── reasoning/      # Parallel reasoning
├── search/         # Search system
├── security/       # Security components
├── server/         # MCP server
├── temporal/       # Temporal decay
└── utils/          # Utilities
```

## Testing

### Run Tests

```bash
npm test                 # All local tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # E2E tests (requires containers)
npm run test:coverage    # With coverage report
```

### Test Organization

| Category    | Directory                    | Dependencies             |
| ----------- | ---------------------------- | ------------------------ |
| Unit        | `src/__tests__/unit/`        | All mocked               |
| Integration | `src/__tests__/integration/` | All mocked               |
| E2E         | `src/__tests__/e2e/`         | Real PostgreSQL + Ollama |

### Coverage Requirements

All metrics must be 75%+: lines, branches, functions, and statements.

## Adding New Features

See [Extension Guide](./extending.md) for:

- Adding new memory sectors
- Adding new reasoning frameworks
- Adding bias detection patterns
- Extending emotion detection

## Documentation

- Update relevant docs when changing functionality
- Add JSDoc comments to public APIs
- Include examples for new features

## Review Process

1. **Automated checks** must pass
2. **Code review** by maintainer
3. **Test coverage** must meet requirements
4. **Documentation** must be updated

## Getting Help

- **Issues**: Report bugs or request features
- **Discussions**: Ask questions
- **Documentation**: Check this `docs/` directory

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Version**: 0.6.0
