# ThoughtMCP

[![CI](https://github.com/keyurgolani/ThoughtMcp/workflows/CI/badge.svg)](https://github.com/keyurgolani/ThoughtMcp/actions)
[![Coverage](https://img.shields.io/badge/coverage-79.63%25-green.svg)](https://github.com/keyurgolani/ThoughtMcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.0+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**AI that thinks more like humans do.**

ThoughtMCP gives AI systems human-like thinking capabilities. Instead of just processing text, it can think systematically, remember experiences, and check its own reasoning quality.

> **🚀 Production Ready**: 789 tests, 79.63% coverage, stable API, ready for real-world use.

## What Makes It Different?

Most AI systems process text once and respond. ThoughtMCP implements multiple thinking systems inspired by cognitive science:

### 🧠 **Human-Like Thinking**

- **Fast intuitive responses** for familiar problems
- **Careful deliberation** for complex decisions
- **Creative exploration** for innovation challenges
- **Analytical reasoning** for technical problems

### 💾 **Learning Memory**

- **Remembers experiences** and learns from them
- **Builds knowledge** that improves over time
- **Recalls relevant information** when making decisions
- **Consolidates patterns** from specific cases to general principles

### 🔍 **Self-Monitoring**

- **Checks its own reasoning** for quality and biases
- **Provides confidence levels** for transparency
- **Suggests improvements** to its own thinking
- **Adapts approach** based on problem complexity

### ⚡ **Production Ready**

- **789 comprehensive tests** with 79.63% coverage
- **Multiple thinking modes** for different scenarios
- **Configurable behavior** for your specific needs
- **Robust error handling** with graceful degradation

## Quick Start

### 1. Install and Setup

```bash
# Clone the repository
git clone https://github.com/keyurgolani/ThoughtMcp.git
cd ThoughtMcp

# Install dependencies
npm install

# Build and start the server
npm run build
npm start

# Run comprehensive demo (in another terminal)
npm run example:demo

# Or run performance benchmarks
npm run example:benchmark
```

### 🤖 **Use in Your AI Environment**

ThoughtMCP works with popular AI development environments:

- **[Kiro IDE](docs/integration/agentic-environments.md#kiro-ide)** - Workspace and user-level configuration
- **[Claude Desktop](docs/integration/agentic-environments.md#claude-desktop)** - Desktop app integration
- **[Cursor IDE](docs/integration/agentic-environments.md#cursor-ide)** - VS Code-based AI coding
- **[Void Editor](docs/integration/agentic-environments.md#void-editor)** - Modern AI editor
- **[Generic MCP](docs/integration/agentic-environments.md#generic-mcp-configuration)** - Any MCP-compatible system

**Quick Kiro Setup:**

```json
{
  "mcpServers": {
    "thought-mcp": {
      "command": "node",
      "args": ["/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "balanced",
        "COGNITIVE_ENABLE_EMOTION": "true"
      }
    }
  }
}
```

👉 **[Complete Integration Guide](docs/INTEGRATION.md)** | **[Environment-Specific Setup](docs/integration/agentic-environments.md)**

### 2. Try Your First Example

Ask ThoughtMCP to help with a decision:

```json
{
  "tool": "think",
  "arguments": {
    "input": "I'm trying to decide between two job offers. One pays more but has longer hours, the other has better work-life balance but lower pay. How should I approach this decision?",
    "mode": "deliberative"
  }
}
```

**What happens:**

- Analyzes your question systematically
- Considers multiple factors and perspectives
- Provides structured reasoning with confidence levels
- Suggests ways to improve the decision-making process

### 3. Build Knowledge Over Time

Store important insights:

```json
{
  "tool": "remember",
  "arguments": {
    "content": "When choosing between job offers, work-life balance often matters more than salary for long-term satisfaction",
    "type": "semantic",
    "importance": 0.8
  }
}
```

Recall relevant knowledge:

```json
{
  "tool": "recall",
  "arguments": {
    "cue": "job decision work-life balance"
  }
}
```

## The Four Thinking Tools

### 🧠 **Think** - Systematic Reasoning

Process complex questions using human-like reasoning:

- **Intuitive mode**: Fast, gut-reaction responses
- **Deliberative mode**: Slow, careful analysis
- **Creative mode**: Innovative problem-solving
- **Analytical mode**: Logical, data-driven reasoning

### 💾 **Remember** - Build Knowledge

Store experiences and insights for future use:

- **Episodic memory**: Specific experiences and events
- **Semantic memory**: General knowledge and principles
- **Importance weighting**: Prioritize what matters most
- **Emotional tagging**: Remember how things felt

### 🔍 **Recall** - Find Relevant Information

Retrieve past experiences and knowledge when needed:

- **Similarity matching**: Find related experiences
- **Context-aware**: Consider current situation
- **Confidence scoring**: Know how relevant results are
- **Cross-memory search**: Search both experience and knowledge

### 🔬 **Analyze Reasoning** - Quality Control

Check thinking quality and identify potential problems:

- **Bias detection**: Spot common reasoning errors
- **Logic validation**: Ensure arguments are sound
- **Confidence assessment**: Evaluate certainty levels
- **Improvement suggestions**: Get better at reasoning

## Real-World Examples

See ThoughtMCP in action with practical scenarios:

- **[Customer Support Agent](docs/examples/real-world/customer-support.md)** - Solving technical problems systematically
- **[Personal Finance Advisor](docs/examples/real-world/finance-advisor.md)** - Making complex financial decisions
- **[Recipe Recommendation](docs/examples/real-world/recipe-recommendation.md)** - Personalized suggestions with constraints
- **[Study Buddy](docs/examples/real-world/study-buddy.md)** - Helping students learn effectively
- **[Travel Planning](docs/examples/real-world/travel-planner.md)** - Complex multi-constraint planning

Each example shows:

- The real-world problem
- Step-by-step tool usage
- How cognitive thinking improves outcomes
- Lessons you can apply to your own use cases

## Documentation

### 🚀 **New to ThoughtMCP?**

- **[Getting Started](docs/getting-started/)** - 5-minute tutorial and basic concepts
- **[Installation Guide](docs/getting-started/installation.md)** - Detailed setup instructions
- **[Basic Concepts](docs/getting-started/basic-concepts.md)** - How human-like thinking works
- **[Examples](docs/examples/)** - From simple to complex real-world scenarios

### 👩‍💻 **For Developers**

- **[API Reference](docs/api/)** - Complete tool documentation and schemas
- **[Integration Guide](docs/guides/integration.md)** - Add to your applications
- **[Agentic Environments](docs/integration/agentic-environments.md)** - Configure in Kiro, Claude, Cursor, Void, and more
- **[Configuration](docs/guides/configuration.md)** - Customize behavior and performance
- **[Troubleshooting](docs/guides/troubleshooting.md)** - Common issues and solutions

### 🧠 **Understanding the Architecture**

- **[Architecture Overview](docs/architecture/)** - How the cognitive system works
- **[Cognitive Components](docs/architecture/cognitive-components.md)** - Individual system details
- **[Research Background](docs/research/)** - Academic foundations and algorithms
- **[Performance Benchmarks](docs/research/benchmarks.md)** - Speed and accuracy metrics

### 🛠️ **Contributing**

- **[Development Setup](docs/development/)** - Set up for development
- **[Contributing Guide](docs/development/contributing.md)** - How to contribute effectively
- **[Architecture for Developers](docs/development/architecture.md)** - Codebase structure
- **[Testing Guide](docs/development/testing.md)** - Writing and running tests

## 📚 Documentation & Examples

### Comprehensive Documentation

- **[Complete API Reference](docs/api/cognitive-tools.md)** - Detailed documentation for all four cognitive tools
- **[Cognitive Architecture Guide](docs/architecture/cognitive-architecture-guide.md)** - Deep dive into the human-like reasoning system
- **[Performance & Benchmarking](docs/performance/benchmarking-guide.md)** - Optimization strategies and performance testing

### Practical Examples

- **[Example Applications](examples/)** - Complete working examples demonstrating all features
- **[Integration Patterns](examples/README.md#advanced-usage-patterns)** - Real-world integration examples
- **[Performance Testing](examples/README.md#performance-testing)** - Automated benchmarking tools

### Quick Links

- 🚀 **[Quick Start Guide](docs/getting-started/README.md)** - Get up and running in minutes
- 🔧 **[Configuration Guide](docs/guides/configuration.md)** - Tune the system for your needs
- 🏗️ **[Development Setup](docs/development/README.md)** - Contributing to the project

## Why Choose ThoughtMCP?

### **For AI Applications**

- **Better Decision Making**: Considers multiple perspectives and checks reasoning quality
- **Continuous Learning**: Gets smarter over time by remembering experiences
- **Transparency**: Shows reasoning process and confidence levels
- **Adaptability**: Different thinking modes for different types of problems

### **For Developers**

- **Production Ready**: 789 tests, comprehensive error handling, performance monitoring
- **Easy Integration**: Standard MCP protocol, clear API, extensive documentation
- **Configurable**: Tune behavior for your specific use case and performance needs
- **Open Source**: MIT license, active community, extensible architecture

### **For Researchers**

- **Scientifically Grounded**: Based on established cognitive science research
- **Comprehensive Implementation**: Full dual-process theory, memory systems, metacognition
- **Benchmarked Performance**: Validated against cognitive psychology principles
- **Extensible Design**: Add new cognitive components and reasoning strategies

## Community and Support

- **📖 Documentation**: Comprehensive guides from beginner to advanced
- **💬 GitHub Discussions**: Ask questions and share ideas
- **🐛 Issues**: Report bugs and request features
- **🤝 Contributing**: Join our community of contributors
- **📧 Contact**: Reach out to [@keyurgolani](https://github.com/keyurgolani)

## Project Status

- ✅ **Stable API**: All four cognitive tools fully implemented
- ✅ **Production Ready**: 789 tests with 79.63% coverage
- ✅ **Well Documented**: Comprehensive documentation for all user levels
- ✅ **Active Development**: Regular updates and community contributions
- ✅ **Open Source**: MIT license, community-driven development

---

**Ready to give your AI human-like thinking capabilities?**

👉 **[Get Started in 5 Minutes](docs/getting-started/)** | 📚 **[View Documentation](docs/)** | 🤝 **[Join Community](https://github.com/keyurgolani/ThoughtMcp/discussions)**
