# Development Guide

Welcome to ThoughtMCP development! This guide covers everything you need to know to contribute to the project, from initial setup to advanced architecture details.

## Quick Navigation

### 🚀 Getting Started

- **[Setup](setup.md)** - Development environment setup
- **[Contributing](contributing.md)** - How to contribute effectively
- \*\*[First Contribution](first-contributiour first pull request
- **[Code Style](code-style.md)** - Coding standards and conventions

### 🏗️ Architecture for Developers

- **[Codebase Structure](architecture.md)** - How the code is organized
- **[Component Design](component-design.md)** - Individual component architecture
- **[Data Flow](data-flow.md)** - How data moves through the system
- **[Extension Points](extension-points.md)** - How to extend functionality

### 🧪 Testing and Quality

- **[Testing Guide](testing.md)** - Writing and running tests
- **[Quality Assurance](quality-assurance.md)** - Code quality standards
- **[Performance Testing](performance-testing.md)** - Benchmarking and optimization
- **[Debugging](debugging.md)** - Troubleshooting and debugging techniques

### 📦 Build and Deployment

- **[Build System](build-system.md)** - Understanding the build process
- **[Release Process](release-process.md)** - How releases are made
- **[Deployment](deployment.md)** - Production deployment strategies
- **[Monitoring](monitoring.md)** - Production monitoring and alerting

## Project Overview

### Technology Stack

**Core Technologies:**

- **TypeScript**: Primary language for type safety and developer experience
- **Node.js**: Runtime environment (18.0+ required)
- **MCP SDK**: Model Context Protocol implementation
- **Vitest**: Testing framework with excellent TypeScript support

**Development Tools:**

- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting (integrated with ESLint)
- **Husky**: Git hooks for quality assurance
- **tsx**: TypeScript execution for development

**Quality Assurance:**

- **789 Tests**: Comprehensive test suite with 79.63% coverage
- **Automated Quality Checks**: Pre-commit and pre-push hooks
- **Performance Benchmarks**: Automated performance regression detection
- **Security Audits**: Regular dependency vulnerability scanning

### Project Structure

```
ThoughtMcp/
├── src/                          # Source code
│   ├── cognitive/               # Core cognitive components
│   │   ├── CognitiveOrchestrator.ts
│   │   ├── DualProcessController.ts
│   │   ├── MemorySystem.ts
│   │   └── ...
│   ├── server/                  # MCP server implementation
│   │   └── CognitiveMCPServer.ts
│   ├── interfaces/              # TypeScript interfaces
│   ├── types/                   # Type definitions
│   ├── utils/                   # Utility functions
│   └── __tests__/              # Test files
├── docs/                        # Documentation
├── scripts/                     # Development scripts
├── .vscode/                     # VS Code configuration
├── .husky/                      # Git hooks
└── tmp/                         # Development artifacts (gitignored)
```

### Development Workflow

#### 1. Issue-Driven Development

All changes start with a GitHub issue:

- **Bug Reports**: Describe the problem and reproduction steps
- **Feature Requests**: Explain the use case and expected behavior
- **Improvements**: Suggest enhancements with rationale

#### 2. Branch Strategy

```bash
main                    # Stable, production-ready code
├── feature/issue-123   # Feature development branches
├── fix/issue-456      # Bug fix branches
└── docs/issue-789     # Documentation branches
```

#### 3. Quality Gates

Every change must pass:

- **Automated Tests**: All 789 tests must pass
- **Code Quality**: ESLint with zero warnings in strict mode
- **Type Safety**: No TypeScript `any` types allowed
- **Security**: No vulnerabilities in dependencies
- **Performance**: No significant performance regressions

#### 4. Review Process

- **Automated Checks**: CI/CD pipeline validates all changes
- **Peer Review**: Maintainer review required for all PRs
- **Documentation**: Updates to docs required for user-facing changes
- **Testing**: New features require comprehensive tests

## Development Environment

### Prerequisites

**Required:**

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher (comes with Node.js)
- **Git**: For version control

**Recommended:**

- **VS Code**: Optimized configuration provided
- **GitHub CLI**: For easier PR management
- **Docker**: For testing deployment scenarios

### Quick Setup

```bash
# Clone and setup
git clone https://github.com/keyurgolani/ThoughtMcp.git
cd ThoughtMcp
npm ci

# Verify setup
npm run dev:check:fast

# Start development
npm run dev
```

### VS Code Integration

The project includes optimized VS Code configuration:

**Extensions (recommended):**

- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- GitLens
- Thunder Client (for MCP testing)

**Tasks available:**

- `Ctrl+Shift+P` → "Tasks: Run Task"
- Development Check (Fast)
- Development Check (Full)
- Run Tests
- Build Project

**Settings:**

- Auto-format on save
- ESLint integration
- TypeScript strict mode
- Optimized for cognitive architecture development

## Key Development Concepts

### Cognitive Architecture Patterns

When developing cognitive components, follow these patterns:

#### 1. Component Interface Pattern

```typescript
interface CognitiveComponent {
  process(input: ProcessingInput): Promise<ProcessingOutput>;
  configure(config: ComponentConfig): void;
  getMetrics(): ComponentMetrics;
}
```

#### 2. Error Handling Pattern

```typescript
class CognitiveComponent {
  async process(input: ProcessingInput): Promise<ProcessingOutput> {
    try {
      // Processing logic
      return result;
    } catch (error) {
      this.logger.error("Processing failed", { error, input });
      throw new CognitiveError("PROCESSING_FAILED", error.message, { input });
    }
  }
}
```

#### 3. Performance Monitoring Pattern

```typescript
class CognitiveComponent {
  async process(input: ProcessingInput): Promise<ProcessingOutput> {
    const startTime = performance.now();

    try {
      const result = await this.doProcessing(input);

      this.performanceMonitor.recordSuccess({
        component: this.constructor.name,
        duration: performance.now() - startTime,
        inputSize: JSON.stringify(input).length,
      });

      return result;
    } catch (error) {
      this.performanceMonitor.recordError({
        component: this.constructor.name,
        duration: performance.now() - startTime,
        error: error.message,
      });
      throw error;
    }
  }
}
```

### Testing Patterns

#### Unit Test Pattern

```typescript
describe("CognitiveComponent", () => {
  let component: CognitiveComponent;

  beforeEach(() => {
    component = new CognitiveComponent(mockConfig);
  });

  describe("process", () => {
    it("should process valid input correctly", async () => {
      const input = createValidInput();
      const result = await component.process(input);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should handle invalid input gracefully", async () => {
      const input = createInvalidInput();

      await expect(component.process(input)).rejects.toThrow(CognitiveError);
    });
  });
});
```

#### Integration Test Pattern

```typescript
describe("Cognitive Pipeline Integration", () => {
  let orchestrator: CognitiveOrchestrator;

  beforeEach(async () => {
    orchestrator = await createTestOrchestrator();
  });

  it("should process complex thought completely", async () => {
    const input = "Complex decision-making scenario";
    const result = await orchestrator.think(input, testContext);

    expect(result.reasoning_path).toHaveLength.greaterThan(3);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.metacognitive_assessment).toBeDefined();
  });
});
```

## Common Development Tasks

### Adding a New Cognitive Component

1. **Create the component class**:

```typescript
// src/cognitive/NewComponent.ts
export class NewComponent implements CognitiveComponent {
  async process(input: ProcessingInput): Promise<ProcessingOutput> {
    // Implementation
  }
}
```

2. **Add comprehensive tests**:

```typescript
// src/__tests__/cognitive/NewComponent.test.ts
describe("NewComponent", () => {
  // Test cases
});
```

3. **Integrate with orchestrator**:

```typescript
// src/cognitive/CognitiveOrchestrator.ts
private newComponent: NewComponent;

constructor() {
  this.newComponent = new NewComponent(config);
}
```

4. **Update documentation**:

- Add to architecture documentation
- Update API documentation if user-facing
- Add examples if applicable

### Modifying Existing Components

1. **Understand the component's role** in the cognitive architecture
2. **Write tests first** for new behavior
3. **Make minimal changes** that don't break existing functionality
4. **Update related components** if interfaces change
5. **Verify integration** with full test suite

### Performance Optimization

1. **Profile first**: Use built-in performance monitoring
2. **Identify bottlenecks**: Focus on high-impact areas
3. **Optimize algorithms**: Improve time/space complexity
4. **Add caching**: For expensive computations
5. **Validate improvements**: Use performance benchmarks

## Debugging and Troubleshooting

### Debug Configuration

```bash
# Enable debug logging
LOG_LEVEL=DEBUG npm run dev

# Enable component-specific debugging
DEBUG=cognitive:* npm run dev

# Enable performance profiling
COGNITIVE_ENABLE_PROFILING=true npm run dev
```

### Common Issues

**TypeScript Compilation Errors:**

```bash
# Check for type issues
npm run type-check

# Find 'any' types
npm run check:any
```

**Test Failures:**

```bash
# Run specific test suites
npm run test:cognitive
npm run test:integration

# Run with verbose output
npm run test -- --reporter=verbose
```

**Performance Issues:**

```bash
# Run performance benchmarks
npm run test:performance

# Profile memory usage
node --inspect npm run dev
```

## Contributing Guidelines

### Before You Start

1. **Check existing issues** to avoid duplicate work
2. **Discuss major changes** in GitHub discussions
3. **Read the full contributing guide** at [contributing.md](contributing.md)
4. **Set up your development environment** properly

### Contribution Process

1. **Fork the repository** and create a feature branch
2. **Make your changes** following coding standards
3. **Write comprehensive tests** for new functionality
4. **Update documentation** as needed
5. **Submit a pull request** with clear description

### Code Review Checklist

- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] No TypeScript `any` types
- [ ] Performance impact assessed
- [ ] Documentation updated
- [ ] Security considerations addressed

## Getting Help

### Documentation

- **[Architecture](../architecture/)** - Technical architecture details
- **[API Reference](../api/)** - Complete API documentation
- **[Examples](../examples/)** - Usage examples and patterns

### Community

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community support
- **Code Reviews**: Learn from maintainer feedback

### Maintainer Contact

- **GitHub**: [@keyurgolani](https://github.com/keyurgolani)
- **Issues**: Tag `@keyurgolani` for urgent matters
- **Discussions**: Active in community discussions

---

_Ready to contribute? Start with [Setup](setup.md) to get your development environment ready._
