# Contributing to ThoughtMCP

Thank you for your interest in contributing to ThoughtMCP! This project implements a human-like cognitive architecture for MCP servers and is currently in **beta**. The core functionality is stable and ready for testing, and we welcome contributions from the community to help refine and enhance the system.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Quality Standards](#code-quality-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Project Structure](#project-structure)
- [Architecture Guidelines](#architecture-guidelines)
- [Getting Help](#getting-help)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: For version control

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/ThoughtMcp.git
   cd ThoughtMcp
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/keyurgolani/ThoughtMcp.git
   ```

## Development Setup

### Initial Setup

```bash
# Install dependencies
npm ci

# Run initial quality check
npm run dev:check:fast

# Run all tests to ensure everything works
npm test
```

### Environment Configuration

1. Copy the example environment file:

   ```bash
   cp example.env .env
   ```

2. Configure any necessary environment variables in `.env`

## Development Workflow

### 1. Create a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Development Process

#### Quick Quality Checks (During Development)

```bash
# Fast check (no tests/build)
npm run dev:check:fast

# Check for TypeScript 'any' types
npm run check:any

# Check for debug statements
npm run check:debug

# Auto-fix style issues
npm run fix:style
```

#### Comprehensive Checks (Before Committing)

```bash
# Full development check
npm run dev:check

# Strict mode (recommended for main branch)
npm run dev:check:strict
```

### 3. Code Quality Standards

Our project maintains high code quality through automated checks:

#### TypeScript Standards

- ❌ Avoid `any` types - use specific types instead
- ✅ Use proper type annotations
- ✅ Enable strict TypeScript settings
- ✅ Use type guards for runtime checks

```typescript
// ❌ Bad
function process(data: any): any {
  return data.someProperty;
}

// ✅ Good
interface ProcessData {
  someProperty: string;
}

function process(data: ProcessData): string {
  return data.someProperty;
}
```

#### Code Style

- ❌ Don't commit debug statements (`console.log`, `debugger`)
- ✅ Use the logger utility for logging
- ✅ Write meaningful commit messages
- ✅ Keep functions small and focused

#### Security

- ❌ Don't commit sensitive files (`.env`, keys, certificates)
- ✅ Run security audits regularly
- ✅ Keep dependencies updated

### 4. Git Hooks

The project uses automated git hooks to maintain quality:

#### Pre-commit Hook

Automatically runs on `git commit`:

- ✅ Code style checking (ESLint)
- ✅ TypeScript type checking
- ✅ Test execution
- ✅ Security file detection
- ⚠️ 'any' type detection
- ⚠️ Debug statement detection

#### Pre-push Hook

Automatically runs on `git push`:

- ✅ Full validation suite
- ✅ Security audit
- ✅ Build performance check
- ✅ Additional strict checks for main branch

**Strict Mode**: Set `STRICT_PRECOMMIT=1` to treat warnings as errors:

```bash
export STRICT_PRECOMMIT=1
git commit
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:cognitive
npm run test:integration
npm run test:memory
```

### Writing Tests

- Write tests for all new features
- Maintain good test coverage
- Use descriptive test names
- Test edge cases and error conditions
- Follow the existing test patterns

Example test structure:

```typescript
describe("YourComponent", () => {
  describe("method", () => {
    it("should handle valid input correctly", () => {
      // Test implementation
    });

    it("should throw error for invalid input", () => {
      // Test error cases
    });
  });
});
```

## Submitting Changes

### 1. Commit Guidelines

Use conventional commit messages:

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:

```
feat(cognitive): add emotional processing module
fix(memory): resolve memory leak in consolidation
docs(readme): update installation instructions
```

### 2. Pull Request Process

1. **Ensure Quality**: All local checks pass

   ```bash
   npm run dev:check:strict
   ```

2. **Update Documentation**: Update relevant documentation

3. **Create Pull Request**:

   - Use a descriptive title
   - Provide detailed description
   - Reference related issues
   - Include screenshots if applicable

4. **Pull Request Template**:

   ```markdown
   ## Description

   Brief description of changes

   ## Type of Change

   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing

   - [ ] Tests pass locally
   - [ ] Added tests for new functionality
   - [ ] Manual testing completed

   ## Checklist

   - [ ] Code follows project style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No breaking changes (or documented)
   ```

### 3. Review Process

- All PRs require review from maintainers
- Address feedback promptly
- Keep PRs focused and reasonably sized
- Rebase on main if requested

## Project Structure

```
ThoughtMcp/
├── src/
│   ├── cognitive/          # Core cognitive components
│   ├── interfaces/         # TypeScript interfaces
│   ├── server/            # MCP server implementation
│   ├── types/             # Type definitions
│   ├── utils/             # Utility functions
│   └── __tests__/         # Test files
├── scripts/               # Development scripts
├── .vscode/              # VS Code configuration
├── .husky/               # Git hooks
└── tmp/                  # Development artifacts (gitignored)
```

## Architecture Guidelines

### Cognitive Architecture Principles

The project follows specific cognitive architecture patterns:

1. **Hierarchical Temporal Memory (HTM)**: Multi-layer processing
2. **Dual-Process Theory**: System 1 (fast) and System 2 (slow) thinking
3. **Memory Systems**: Episodic and semantic memory with consolidation
4. **Emotional Processing**: Somatic markers and emotional modulation
5. **Metacognitive Monitoring**: Self-assessment and bias detection

### Implementation Standards

- Follow the cognitive architecture patterns defined in the steering document
- Implement biologically-inspired processing where applicable
- Maintain separation of concerns between cognitive components
- Use proper error handling and logging
- Document complex algorithms and cognitive processes

### Performance Considerations

- Memory usage should be reasonable (target <2GB for full model)
- Processing latency should be 50-500ms depending on complexity
- Build time should be under 30 seconds
- Test suite should complete in under 5 minutes

## Available Development Tools

### NPM Scripts

| Script                     | Purpose                        |
| -------------------------- | ------------------------------ |
| `npm run dev:check`        | Full development quality check |
| `npm run dev:check:strict` | Strict mode quality check      |
| `npm run dev:check:fast`   | Quick check (no tests/build)   |
| `npm run lint:strict`      | ESLint with zero warnings      |
| `npm run check:any`        | Find TypeScript 'any' types    |
| `npm run check:debug`      | Find debug statements          |
| `npm run fix:style`        | Auto-fix ESLint issues         |
| `npm run security:audit`   | Security vulnerability check   |

### VS Code Integration

The project includes VS Code configuration for:

- Auto-formatting on save
- ESLint integration
- TypeScript hints
- Custom tasks for quality checks

Access tasks via `Ctrl+Shift+P` → "Tasks: Run Task"

## Getting Help

### Documentation

- Check the README.md for basic setup
- Review existing code for patterns
- Look at test files for usage examples

### Communication

- **Issues**: Use GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions and ideas
- **Security**: Report security issues privately to the maintainers

### Common Issues

**ESLint errors about 'any' types:**

```bash
npm run check:any  # Find all 'any' types
# Fix manually with proper types
```

**Security vulnerabilities:**

```bash
npm audit          # Check vulnerabilities
npm audit fix      # Auto-fix if possible
```

**Pre-commit hook failures:**

```bash
npm run dev:check  # Run same checks manually
export STRICT_PRECOMMIT=1  # Enable strict mode
```

**Build performance issues:**

```bash
npm run clean && npm run build  # Clean rebuild
```

## Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes for significant contributions
- Project documentation

Thank you for contributing to ThoughtMCP! Your efforts help advance the field of cognitive AI architectures.
