# Contributing to ThoughtMCP

Thank you for your interest in contributing to ThoughtMCP! This guide will help you make effective contributions to our cognitive architecture project.

## Quick Start for Contributors

### 1. Set Up Your Environment

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/ThoughtMcp.git
cd ThoughtMcp

# Install and verify
npm ci
npm run dev:check:fast
```

### 2. Find Something to Work On

- **🐛 Bug Reports**: Check [GitHub Issues](https://github.com/keyurgolani/ThoughtMcp/issues) for bugs
- **✨ Feature Requests**: Look for enhancement issues
- **📚 Documentation**: Help improve our docs
- **🧪 Testing**: Add tests for better coverage
- **🔬 Research**: Contribute to cognitive architecture research

### 3. Make Your Contribution

```bash
# Create feature branch
git checkout -b feature/your-contribution

# Make changes and test
npm run dev:check

# Commit and push
git commit -m "feat: your contribution description"
git push origin feature/your-contribution
```

### 4. Submit Pull Request

Create a PR with:

- Clear description of changes
- Reference to related issues
- Screenshots if UI changes
- Test results

## Contribution Types

### 🐛 Bug Fixes

**What we need:**

- Clear reproduction steps
- Expected vs actual behavior
- System information
- Proposed fix with tests

**Example:**

```bash
# Bug fix branch
git checkout -b fix/memory-leak-consolidation

# Fix the issue
# Add regression test
# Verify fix works

git commit -m "fix(memory): resolve memory leak in consolidation process"
```

### ✨ New Features

**What we need:**

- Use case description
- Design proposal
- Implementation with tests
- Documentation updates

**Example:**

```bash
# Feature branch
git checkout -b feature/quantum-cognition

# Implement feature
# Add comprehensive tests
# Update documentation

git commit -m "feat(cognitive): add quantum cognition processing mode"
```

### 📚 Documentation

**What we need:**

- Clear, beginner-friendly explanations
- Code examples that work
- Proper cross-references
- Up-to-date information

**Example:**

```bash
# Documentation branch
git checkout -b docs/integration-examples

# Add new examples
# Update existing docs
# Test all code examples

git commit -m "docs(examples): add Python integration examples"
```

### 🧪 Testing

**What we need:**

- Increased test coverage
- Edge case testing
- Performance tests
- Integration tests

**Example:**

```bash
# Testing branch
git checkout -b test/emotional-processing

# Add missing tests
# Test edge cases
# Verify coverage improvement

git commit -m "test(emotion): add comprehensive emotional processing tests"
```

### 🔬 Research

**What we need:**

- Cognitive science validation
- Performance benchmarks
- Comparative studies
- Algorithm improvements

**Example:**

```bash
# Research branch
git checkout -b research/bias-detection-accuracy

# Implement improved algorithm
# Add validation tests
# Document research findings

git commit -m "research(metacognition): improve bias detection accuracy by 15%"
```

## Development Workflow

### 1. Issue-Driven Development

All contributions should start with an issue:

**For Bug Reports:**

```markdown
**Bug Description**
Clear description of the problem

**Reproduction Steps**

1. Step one
2. Step two
3. Expected vs actual result

**Environment**

- Node.js version
- Operating system
- ThoughtMCP version

**Additional Context**
Any other relevant information
```

**For Feature Requests:**

```markdown
**Feature Description**
What feature would you like to see?

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should it work?

**Alternatives Considered**
What other approaches did you consider?
```

### 2. Branch Strategy

```bash
main                    # Stable, production-ready
├── feature/issue-123   # New features
├── fix/issue-456      # Bug fixes
├── docs/issue-789     # Documentation
├── test/issue-012     # Testing improvements
└── research/issue-345 # Research contributions
```

### 3. Quality Standards

Every contribution must meet these standards:

#### Code Quality

- ✅ All tests pass (`npm test`)
- ✅ No TypeScript errors (`npm run type-check`)
- ✅ No ESLint warnings (`npm run lint:strict`)
- ✅ No `any` types (`npm run check:any`)
- ✅ No debug statements (`npm run check:debug`)

#### Testing

- ✅ New features have tests
- ✅ Bug fixes have regression tests
- ✅ Test coverage maintained or improved
- ✅ Integration tests for complex features

#### Documentation

- ✅ User-facing changes documented
- ✅ API changes reflected in docs
- ✅ Examples work and are tested
- ✅ Architecture changes explained

### 4. Review Process

**Automated Checks:**

- CI/CD pipeline validates all changes
- Quality gates must pass
- Performance regression tests
- Security vulnerability scans

**Human Review:**

- Maintainer review required
- Focus on architecture alignment
- Code quality and maintainability
- User experience impact

## Code Standards

### TypeScript Guidelines

**✅ Do:**

```typescript
// Use specific types
interface CognitiveInput {
  content: string;
  context?: Context;
}

// Use type guards
function isValidInput(input: unknown): input is CognitiveInput {
  return typeof input === "object" && input !== null && "content" in input;
}

// Use proper error handling
class CognitiveError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = "CognitiveError";
  }
}
```

**❌ Don't:**

```typescript
// Don't use 'any'
function process(data: any): any {
  return data.whatever;
}

// Don't ignore errors
try {
  riskyOperation();
} catch {
  // Silent failure
}

// Don't use console.log
console.log("Debug info"); // Use logger instead
```

### Testing Guidelines

**✅ Good Test Structure:**

```typescript
describe("CognitiveComponent", () => {
  let component: CognitiveComponent;

  beforeEach(() => {
    component = new CognitiveComponent(mockConfig);
  });

  describe("process method", () => {
    it("should process valid input correctly", async () => {
      // Arrange
      const input = createValidInput();

      // Act
      const result = await component.process(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should handle invalid input gracefully", async () => {
      // Arrange
      const input = createInvalidInput();

      // Act & Assert
      await expect(component.process(input)).rejects.toThrow(CognitiveError);
    });
  });
});
```

### Documentation Guidelines

**✅ Good Documentation:**

````typescript
/**
 * Processes input through the cognitive architecture
 *
 * @param input - The input to process
 * @param context - Optional context for processing
 * @returns Promise resolving to cognitive output
 *
 * @example
 * ```typescript
 * const result = await orchestrator.think(
 *   "What should I do?",
 *   { domain: "decision_making" }
 * );
 * ```
 */
async think(input: string, context?: Context): Promise<ThoughtResult> {
  // Implementation
}
````

## Cognitive Architecture Guidelines

### Component Design Principles

1. **Single Responsibility**: Each component has one clear purpose
2. **Loose Coupling**: Components interact through well-defined interfaces
3. **High Cohesion**: Related functionality grouped together
4. **Biological Inspiration**: Based on cognitive science research
5. **Performance Awareness**: Efficient algorithms and resource usage

### Implementation Patterns

**Cognitive Component Pattern:**

```typescript
interface CognitiveComponent {
  process(input: ProcessingInput): Promise<ProcessingOutput>;
  configure(config: ComponentConfig): void;
  getMetrics(): ComponentMetrics;
}

class ExampleComponent implements CognitiveComponent {
  private config: ComponentConfig;
  private metrics: ComponentMetrics;

  async process(input: ProcessingInput): Promise<ProcessingOutput> {
    const startTime = performance.now();

    try {
      const result = await this.doProcessing(input);
      this.recordSuccess(performance.now() - startTime);
      return result;
    } catch (error) {
      this.recordError(error, performance.now() - startTime);
      throw error;
    }
  }
}
```

## Getting Help

### Before Asking for Help

1. **Check Documentation**: Look through our comprehensive docs
2. **Search Issues**: See if someone else had the same problem
3. **Try Debugging**: Use our debugging tools and techniques
4. **Minimal Example**: Create a minimal reproduction case

### Where to Get Help

**GitHub Issues**: For bugs and feature requests

- Use issue templates
- Provide complete information
- Include reproduction steps

**GitHub Discussions**: For questions and ideas

- General questions about usage
- Architecture discussions
- Research collaboration
- Community support

**Code Review**: During pull request process

- Ask specific questions in PR comments
- Request feedback on approach
- Discuss implementation details

### Common Issues and Solutions

**TypeScript Compilation Errors:**

```bash
# Check for type issues
npm run type-check

# Find 'any' types
npm run check:any

# Fix common issues
npm run fix:style
```

**Test Failures:**

```bash
# Run specific test suites
npm run test:cognitive
npm run test:integration

# Debug with verbose output
npm run test -- --reporter=verbose

# Check test coverage
npm run test:coverage
```

**Performance Issues:**

```bash
# Run performance benchmarks
npm run test:performance

# Profile memory usage
node --inspect npm run dev

# Check resource usage
npm run monitor:resources
```

**Git Hook Failures:**

```bash
# Run checks manually
npm run dev:check

# Enable strict mode
export STRICT_PRECOMMIT=1

# Skip hooks temporarily (not recommended)
git commit --no-verify
```

## Recognition and Rewards

### Contributor Recognition

**GitHub Profile:**

- Listed in repository contributors
- Contribution statistics visible
- Profile linked in release notes

**Project Documentation:**

- Contributors section in README
- Acknowledgments in research papers
- Feature attribution in changelogs

**Community Recognition:**

- Highlighted in community discussions
- Speaking opportunities at conferences
- Collaboration on research publications

### Contribution Levels

**First-Time Contributors:**

- Welcome package and guidance
- Mentorship from maintainers
- Good first issue recommendations
- Recognition in contributor list

**Regular Contributors:**

- Increased review privileges
- Input on project direction
- Early access to new features
- Collaboration opportunities

**Core Contributors:**

- Commit access to repository
- Release management participation
- Architecture decision involvement
- Research collaboration leadership

## Code of Conduct

### Our Standards

**Positive Behavior:**

- Respectful and inclusive language
- Constructive feedback and criticism
- Focus on what's best for the community
- Empathy towards other contributors

**Unacceptable Behavior:**

- Harassment or discriminatory language
- Personal attacks or trolling
- Publishing private information
- Unprofessional conduct

### Enforcement

**Reporting:**

- Contact maintainers privately
- Use GitHub's reporting features
- Provide specific examples
- Expect confidential handling

**Consequences:**

- Warning for minor violations
- Temporary ban for repeated issues
- Permanent ban for severe violations
- Appeal process available

## Future Contribution Opportunities

### Planned Features

1. **Quantum Cognition**: Superposition and entanglement in thought
2. **Neuroplasticity**: Dynamic architecture adaptation
3. **Social Cognition**: Multi-agent reasoning systems
4. **Embodied Cognition**: Sensorimotor integration

### Research Areas

1. **Consciousness Modeling**: Self-awareness implementation
2. **Creative Cognition**: Enhanced innovation capabilities
3. **Emotional Intelligence**: Deeper emotional understanding
4. **Collective Intelligence**: Distributed cognitive architectures

### Community Building

1. **Documentation**: Expand and improve documentation
2. **Examples**: Create more real-world examples
3. **Tutorials**: Develop learning materials
4. **Outreach**: Present at conferences and workshops

---

**Ready to contribute?** Start with [Development Setup](setup.md) or check out [good first issues](https://github.com/keyurgolani/ThoughtMcp/labels/good%20first%20issue) on GitHub.

_Thank you for helping advance the field of cognitive AI architectures!_
