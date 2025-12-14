# Contributing to ThoughtMCP

Thank you for your interest in contributing to ThoughtMCP! This guide will help you get started quickly.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/keyurgolani/ThoughtMcp.git
cd ThoughtMcp
npm install
docker-compose up -d
npm run db:setup
npm run validate
```

## Development Workflow

1. **Create a branch**: `git checkout -b feature/your-feature`
2. **Write tests first** (TDD required)
3. **Implement your changes**
4. **Run validation**: `npm run validate`
5. **Submit a pull request**

## Code Standards

- No `any` types in TypeScript
- No `@ts-ignore` or `eslint-disable`
- 75%+ test coverage required
- Zero TypeScript errors

## Commit Messages

Follow conventional commits:

```
type(scope): brief description

- Detailed changes
- Reference issues: Fixes #123
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `perf`

## Testing

```bash
npm test                 # All local tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:coverage    # With coverage report
```

## Getting Help

- Check [docs/](docs/) for detailed guides
- Search [GitHub Issues](https://github.com/keyurgolani/ThoughtMcp/issues)
- Open a discussion for questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

For detailed development guidelines, see [docs/development.md](docs/development.md).
