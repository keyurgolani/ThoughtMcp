# Contributing to ThoughtMCP

Thank you for your interest in contributing to ThoughtMCP! This guide will help you get started.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with pgvector
- Docker and Docker Compose
- Git

### Setup

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

### 2. Follow TDD

**Always write tests first:**

1. Write failing test defining expected behavior
2. Implement minimal code to pass test
3. Refactor while tests validate correctness

### 3. Code Standards

- **No `any` types** in TypeScript
- **No `@ts-ignore`** or `eslint-disable`
- **95%+ test coverage**
- **Zero TypeScript errors**

### 4. Run Validation

```bash
npm run validate
```

This runs:

- ESLint
- Prettier check
- TypeScript type check
- All tests with coverage

### 5. Commit Messages

Follow conventional commits:

```
type(scope): brief description

- Detailed changes
- Reference issues: Fixes #123
```

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `perf`

**Examples**:

```bash
feat(memory): add five-sector embedding generation
fix(search): correct composite scoring calculation
docs(api): update MCP tool documentation
```

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
npm test                 # All tests
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:coverage    # With coverage
```

### Test Organization

- Unit tests: `src/__tests__/unit/`
- Integration tests: `src/__tests__/integration/`
- E2E tests: `src/__tests__/e2e/`

### Coverage Requirements

- Line coverage: 95%+
- Branch coverage: 90%+

## Adding New Features

### 1. Memory Sectors

See [Extension Guide](./extending.md) for adding new memory sectors.

### 2. Reasoning Frameworks

See [Extension Guide](./extending.md) for adding new frameworks.

### 3. Bias Detection Patterns

See [Extension Guide](./extending.md) for adding bias patterns.

### 4. Emotion Types

See [Extension Guide](./extending.md) for extending emotion detection.

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
- **Documentation**: Check `docs/` directory

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Last Updated**: December 2025

**Version**: 0.5.0
