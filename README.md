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

- **Dual-Process Reasoning**: Fast intuitive responses (System 1) and careful deliberation (System 2)
- **Multiple Reasoning Modes**: Analytical, creative, critical, and synthetic thinking
- **Metacognitive Awareness**: Self-monitoring with bias detection and reasoning quality assessment
- **Systematic Problem-Solving**: Automatic framework selection (Design Thinking, Scientific Method, Root Cause Analysis, etc.)

### 💾 **Sophisticated Memory Systems**

- **Episodic Memory**: Remembers specific experiences with emotional context
- **Semantic Memory**: Stores general knowledge and concepts
- **Memory Management**: Smart forgetting, archiving, and consolidation
- **Context-Aware Retrieval**: Finds relevant memories based on similarity and associations

### 🔀 **Advanced Problem-Solving**

- **Parallel Reasoning**: Multiple reasoning streams working simultaneously
- **Problem Decomposition**: Breaks complex problems into manageable parts with dependency mapping
- **Framework Selection**: Automatically chooses optimal thinking frameworks based on problem type
- **Quality Control**: Continuous reasoning validation and improvement suggestions

### ⚡ **Production Ready**

- **789 comprehensive tests** with 79.63% coverage
- **Multiple thinking modes** for different scenarios
- **Configurable behavior** for your specific needs
- **Robust error handling** with graceful degradation

## Quick Start

### 1. Install and Setup

#### Option A: NPX (Recommended - No Installation Required)

```bash
# Use directly with npx - no installation needed
npx thoughtmcp@latest

# Or configure in your MCP client (see configuration examples below)
```

#### Option B: Local Development Setup

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

**Quick Kiro Setup (Local Development):**

```json
{
  "mcpServers": {
    "thoughtmcp": {
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

**Quick Kiro Setup (NPX - Recommended):**

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["thoughtmcp@latest"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "balanced",
        "COGNITIVE_ENABLE_EMOTION": "true",
        "COGNITIVE_ENABLE_METACOGNITION": "true",
        "COGNITIVE_WORKING_MEMORY_CAPACITY": "7",
        "COGNITIVE_EPISODIC_MEMORY_SIZE": "1000",
        "COGNITIVE_SEMANTIC_MEMORY_SIZE": "5000",
        "COGNITIVE_TEMPERATURE": "0.7",
        "COGNITIVE_TIMEOUT_MS": "30000",
        "COGNITIVE_BRAIN_DIR": "~/.brain",
        "LOG_LEVEL": "INFO"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

👉 **[Complete Integration Guide](docs/INTEGRATION.md)** | **[Environment-Specific Setup](docs/integration/agentic-environments.md)**

## MCP Server Configuration

ThoughtMCP can be configured as an MCP server using environment variables. All configuration options are optional and have sensible defaults.

### Environment Variables

| Variable                            | Default    | Description                                                                              |
| ----------------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `COGNITIVE_DEFAULT_MODE`            | `balanced` | Default thinking mode: `intuitive`, `deliberative`, `balanced`, `creative`, `analytical` |
| `COGNITIVE_ENABLE_EMOTION`          | `true`     | Enable emotional processing and somatic markers                                          |
| `COGNITIVE_ENABLE_METACOGNITION`    | `true`     | Enable self-monitoring and bias detection                                                |
| `COGNITIVE_WORKING_MEMORY_CAPACITY` | `7`        | Working memory capacity (Miller's 7±2)                                                   |
| `COGNITIVE_EPISODIC_MEMORY_SIZE`    | `1000`     | Maximum episodic memories to store                                                       |
| `COGNITIVE_SEMANTIC_MEMORY_SIZE`    | `5000`     | Maximum semantic concepts to store                                                       |
| `COGNITIVE_TEMPERATURE`             | `0.7`      | Randomness in neural processing (0.0-2.0)                                                |
| `COGNITIVE_TIMEOUT_MS`              | `30000`    | Maximum processing time per request                                                      |
| `COGNITIVE_BRAIN_DIR`               | `~/.brain` | Directory for persistent memory storage                                                  |
| `LOG_LEVEL`                         | `INFO`     | Logging level: `DEBUG`, `INFO`, `WARN`, `ERROR`                                          |

### Example Configurations

#### Kiro IDE Configuration

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["thoughtmcp@latest"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "balanced",
        "COGNITIVE_ENABLE_EMOTION": "true",
        "COGNITIVE_ENABLE_METACOGNITION": "true",
        "COGNITIVE_WORKING_MEMORY_CAPACITY": "7",
        "COGNITIVE_EPISODIC_MEMORY_SIZE": "1000",
        "COGNITIVE_SEMANTIC_MEMORY_SIZE": "5000",
        "COGNITIVE_TEMPERATURE": "0.7",
        "COGNITIVE_TIMEOUT_MS": "30000",
        "COGNITIVE_BRAIN_DIR": "~/.brain",
        "LOG_LEVEL": "INFO"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

#### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "thought": {
      "command": "npx",
      "args": ["thoughtmcp@latest"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "analytical",
        "COGNITIVE_ENABLE_EMOTION": "false",
        "COGNITIVE_TEMPERATURE": "0.5"
      }
    }
  }
}
```

#### High-Performance Configuration

```json
{
  "mcpServers": {
    "thought-fast": {
      "command": "npx",
      "args": ["thoughtmcp@latest"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "intuitive",
        "COGNITIVE_WORKING_MEMORY_CAPACITY": "5",
        "COGNITIVE_TIMEOUT_MS": "10000",
        "COGNITIVE_TEMPERATURE": "0.3",
        "LOG_LEVEL": "WARN"
      }
    }
  }
}
```

#### Creative Mode Configuration

```json
{
  "mcpServers": {
    "thought-creative": {
      "command": "npx",
      "args": ["thoughtmcp@latest"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "creative",
        "COGNITIVE_TEMPERATURE": "1.2",
        "COGNITIVE_ENABLE_EMOTION": "true",
        "COGNITIVE_WORKING_MEMORY_CAPACITY": "9"
      }
    }
  }
}
```

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

## The Complete Cognitive Toolkit

### 🧠 **Think** - Human-Like Reasoning

Process complex questions using sophisticated cognitive architecture:

- **Dual-Process Thinking**: System 1 (intuitive) and System 2 (deliberative) processing
- **Multiple Modes**: Intuitive, deliberative, creative, analytical, and balanced approaches
- **Metacognitive Monitoring**: Self-assessment with bias detection and quality control
- **Emotional Processing**: Somatic markers and emotional context integration
- **Stochastic Neural Processing**: Realistic neural noise and enhancement patterns

### 💾 **Remember** - Build Knowledge

Store experiences and insights with sophisticated memory systems:

- **Episodic Memory**: Specific experiences with emotional context and importance weighting
- **Semantic Memory**: General knowledge with concept relationships and associations
- **Memory Consolidation**: Automatic pattern extraction and knowledge integration
- **Emotional Tagging**: Rich emotional context for better recall and decision-making

### 🔍 **Recall** - Intelligent Retrieval

Retrieve past experiences and knowledge with advanced search capabilities:

- **Similarity Matching**: Vector-based semantic similarity with activation spreading
- **Context-Aware Search**: Considers current situation and emotional state
- **Cross-Memory Integration**: Searches both episodic experiences and semantic knowledge
- **Confidence Scoring**: Provides reliability metrics for retrieved information

### 🔬 **Analyze Reasoning** - Quality Assurance

Comprehensive reasoning quality assessment and improvement:

- **Bias Detection**: Identifies tunnel vision, confirmation bias, and other cognitive errors
- **Logic Validation**: Evaluates argument structure and evidence support
- **Confidence Calibration**: Assesses certainty levels and suggests evidence gathering
- **Improvement Recommendations**: Specific suggestions for better reasoning

### 🎯 **Analyze Systematically** - Framework-Based Problem Solving

Apply proven thinking frameworks automatically:

- **Auto Framework Selection**: Chooses optimal approach (Design Thinking, Scientific Method, Root Cause Analysis, etc.)
- **Structured Analysis**: Breaks problems into systematic steps with clear methodology
- **Multiple Perspectives**: Considers alternative approaches and trade-offs
- **Evidence-Based Recommendations**: Provides reasoning for framework choice and confidence levels

### 🔀 **Think Parallel** - Multi-Stream Reasoning

Process problems through multiple reasoning streams simultaneously:

- **Analytical Stream**: Logical, evidence-based reasoning with systematic evaluation
- **Creative Stream**: Innovative approaches with unconventional alternatives
- **Critical Stream**: Bias detection, assumption challenging, and quality assessment
- **Synthetic Stream**: Integration of perspectives with holistic solution development
- **Real-Time Coordination**: Streams share insights, resolve conflicts, and build consensus

### 🧩 **Decompose Problem** - Complex Problem Breakdown

Break down complex challenges into manageable, prioritized components:

- **Hierarchical Decomposition**: Multi-level problem breakdown with clear structure
- **Dependency Mapping**: Identifies relationships and constraints between sub-problems
- **Priority Ranking**: Determines optimal execution order based on impact and urgency
- **Critical Path Analysis**: Highlights bottlenecks and key dependencies for efficient execution
- **Multiple Strategies**: Functional, temporal, stakeholder, and component-based approaches

### 🧠 **Memory Management** - Advanced Memory Operations

Sophisticated memory optimization and management capabilities:

- **Memory Analysis**: Comprehensive usage analysis with optimization recommendations
- **Smart Forgetting**: Selective forgetting of low-importance and rarely-accessed memories
- **Memory Recovery**: Advanced recovery of degraded memories using associative cues
- **Policy Management**: Configurable forgetting policies with user consent controls
- **Audit Trails**: Complete forgetting audit logs with impact assessment and rollback capabilities

### 🎯 **Analyze Systematically** - Framework-Based Problem Solving

Apply proven thinking frameworks automatically:

- **Auto framework selection**: Chooses optimal approach (Design Thinking, Scientific Method, Root Cause Analysis, etc.)
- **Structured analysis**: Breaks problems into systematic steps
- **Multiple perspectives**: Considers alternative approaches
- **Evidence-based recommendations**: Provides reasoning for framework choice

### 🔀 **Think Parallel** - Multi-Stream Reasoning

Process problems through multiple reasoning streams simultaneously:

- **Analytical stream**: Logical, evidence-based reasoning
- **Creative stream**: Innovative and unconventional approaches
- **Critical stream**: Bias detection and assumption challenging
- **Synthetic stream**: Integration and holistic perspective
- **Real-time coordination**: Streams share insights and resolve conflicts

### 🧩 **Decompose Problem** - Complex Problem Breakdown

Break down complex challenges into manageable components:

- **Hierarchical decomposition**: Multi-level problem breakdown
- **Dependency mapping**: Identifies relationships between sub-problems
- **Priority ranking**: Determines optimal execution order
- **Critical path analysis**: Highlights bottlenecks and key dependencies
- **Multiple strategies**: Functional, temporal, stakeholder, and component-based approaches

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
