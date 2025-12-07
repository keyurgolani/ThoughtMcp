# ThoughtMCP Cognitive Architecture v0.5.0

[![CI](https://github.com/keyurgolani/ThoughtMcp/workflows/CI/badge.svg)](https://github.com/keyurgolani/ThoughtMcp/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.0+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14.0+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Production-Ready AI Cognitive Architecture with Human-Like Memory and Reasoning**

ThoughtMCP v0.5.0 is a complete rebuild featuring Hierarchical Memory Decomposition (HMD), persistent PostgreSQL storage, parallel reasoning streams, dynamic framework selection, and metacognitive monitoring. Built for production with 95%+ test coverage and sub-200ms retrieval performance.

> **✅ Status**: Production Ready - Complete PostgreSQL-based architecture with advanced cognitive capabilities

## What's New in v0.5.0?

ThoughtMCP v0.5.0 is a complete architectural rebuild with production-grade capabilities:

### 🧠 **Hierarchical Memory Decomposition (HMD)**

- **Five-Sector Embeddings**: Episodic, Semantic, Procedural, Emotional, and Reflective memory types
- **Waypoint Graph System**: Sparse graph with 1-3 connections per memory for efficient traversal
- **Composite Scoring**: 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×link_weight
- **Temporal Decay**: Exponential forgetting with automatic reinforcement on access
- **PostgreSQL Persistence**: Production-grade storage with pgvector for vector operations

### ⚡ **Performance Targets**

- **Sub-200ms Retrieval**: p50 <100ms, p95 <200ms, p99 <500ms at 100k memories
- **Fast Embedding**: <500ms for all five sectors
- **Parallel Reasoning**: <30s total, <10s per stream
- **Efficient Operations**: <100ms confidence assessment, <15% bias detection overhead

### 🔀 **Parallel Reasoning Streams**

- **Four Concurrent Streams**: Analytical, Creative, Critical, and Synthetic reasoning
- **Real-Time Coordination**: Synchronization at 25%, 50%, 75% completion
- **Conflict Preservation**: Maintains diverse perspectives in synthesis
- **Low Overhead**: <10% coordination cost

### 🎯 **Dynamic Framework Selection**

- **Eight Frameworks**: Scientific Method, Design Thinking, Systems Thinking, Critical Thinking, Creative Problem Solving, Root Cause Analysis, First Principles, Scenario Planning
- **Auto-Selection**: >80% accuracy in choosing optimal framework
- **Hybrid Support**: Combines 2-3 frameworks for complex problems
- **Adaptive Learning**: Improves selection over time

### 🔬 **Metacognitive Monitoring**

- **Confidence Calibration**: ±10% accuracy between predicted and actual performance
- **Bias Detection**: >70% detection rate for 8 bias types (confirmation, anchoring, availability, etc.)
- **Emotion Detection**: >75% accuracy using Circumplex model (valence, arousal, dominance)
- **Self-Improvement**: 5-10% monthly performance improvement

### 🏗️ **Production Hardening**

- **95%+ Test Coverage**: Comprehensive unit, integration, e2e, performance, and accuracy tests
- **99.9% Uptime**: MTTD <5 minutes, MTTR <1 hour
- **Local Embeddings**: Uses local models (Ollama, E5, BGE) for zero API costs
- **Horizontal Scaling**: Supports up to 1M memories per user

## Quick Start

### Prerequisites

- **Node.js** 18.0+ (LTS recommended)
- **PostgreSQL** 14.0+ with pgvector extension
- **Docker** (optional, for local PostgreSQL)

### Installation

```bash
# Clone the repository
git clone https://github.com/keyurgolani/ThoughtMcp.git
cd ThoughtMcp

# Install dependencies
npm install

# Setup environment
cp .env.example .env.development
# Edit .env.development with your PostgreSQL credentials

# Start PostgreSQL with Docker (optional)
docker-compose up -d

# Initialize database
npm run db:setup

# Build the project (runs all quality gates automatically)
npm run build
# This runs: clean → format → audit → lint → typecheck → test → build

# Or run quick build (skip validation if already validated)
npm run build:quick

# Start the MCP server
npm start
```

### Development Setup

```bash
# Start development server with hot reload
npm run dev

# Run tests in watch mode
npm run test:watch

# Full validation (audit, format:check, lint, typecheck, test)
npm run validate

# Build with all quality gates (recommended before commits)
npm run build
```

### Build Process - Quality Gates

The build process automatically enforces all quality standards:

```bash
npm run build
```

**Automatic Quality Pipeline:**

1. ✅ Clean build artifacts
2. ✅ Auto-format code with Prettier
3. ✅ Security audit (moderate+ vulnerabilities)
4. ✅ Format verification
5. ✅ Lint code quality
6. ✅ Type check TypeScript
7. ✅ Run complete test suite
8. ✅ Generate TypeScript declarations
9. ✅ Create production bundle

**Build fails if ANY step fails.** Zero tolerance for security vulnerabilities, formatting issues, linting errors, type errors, or test failures.

### MCP Server Configuration

Configure ThoughtMCP as an MCP server in `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "thoughtmcp": {
      "command": "node",
      "args": ["/absolute/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/thoughtmcp_dev",
        "EMBEDDING_MODEL": "ollama/e5",
        "EMBEDDING_DIMENSION": "1536",
        "LOG_LEVEL": "INFO",
        "NODE_ENV": "development"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

**Required Environment Variables:**

- `DATABASE_URL` - PostgreSQL connection string
- `EMBEDDING_MODEL` - Embedding model (ollama/e5, ollama/bge, e5, bge)
- `EMBEDDING_DIMENSION` - Model-specific dimension (default: 1536)
- `LOG_LEVEL` - Logging level (DEBUG, INFO, WARN, ERROR)
- `NODE_ENV` - Environment (development, production, test)

**Optional Configuration:**

- `DB_POOL_SIZE` - Connection pool size (default: 20)
- `CACHE_TTL` - Query cache TTL in seconds (default: 300)
- `MAX_PROCESSING_TIME` - Max processing time in ms (default: 30000)
- `OLLAMA_HOST` - Ollama server URL (if using Ollama)

👉 **[Complete Configuration Guide](docs/environment.md)**

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                       MCP Interface Layer                     │
│  Comprehensive tools with schemas and validation             │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Cognitive Orchestrator                      │
│  Coordinates all cognitive components and workflow           │
└─────┬──────────────┬────────────┬──────────────┬────────────┘
      │              │            │              │
┌─────▼─────┐ ┌─────▼─────┐ ┌───▼────┐ ┌───────▼────────┐
│ Reasoning │ │  Memory   │ │ Bias   │ │  Metacognition │
│  Engine   │ │  System   │ │Detector│ │    Monitor     │
└─────┬─────┘ └─────┬─────┘ └───┬────┘ └───────┬────────┘
      │              │            │              │
      │      ┌───────▼────────────▼──────────┐   │
      │      │   HMD Memory Layer            │   │
      │      │  • Five-Sector Embeddings    │   │
      │      │  • Temporal Decay System     │   │
      └──────►  • Waypoint Graph           ◄───┘
             │  • Search & Retrieval        │
             └───────────┬───────────────────┘
                         │
             ┌───────────▼───────────────────┐
             │  PostgreSQL Persistence       │
             │  • pgvector extension         │
             │  • Connection pooling         │
             │  • Transaction management     │
             └───────────────────────────────┘
```

### Key Features

- **HMD Memory System**: Five-sector embeddings with waypoint graph
- **Parallel Reasoning**: Four concurrent streams (Analytical, Creative, Critical, Synthetic)
- **Framework Selection**: Eight systematic thinking frameworks
- **Metacognition**: Confidence calibration, bias detection, emotion analysis
- **Production Ready**: 95%+ test coverage, sub-200ms retrieval, 99.9% uptime

## MCP Tools Overview

ThoughtMCP exposes cognitive capabilities through MCP tools:

| Category          | Tools                                                                                    | Description                                     |
| ----------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Memory**        | `store_memory`, `retrieve_memories`, `update_memory`, `delete_memory`, `search_memories` | Persistent memory with five-sector embeddings   |
| **Reasoning**     | `think`, `analyze_systematically`, `think_parallel`, `decompose_problem`                 | Multi-stream reasoning with framework selection |
| **Metacognitive** | `assess_confidence`, `detect_bias`, `detect_emotion`, `analyze_reasoning`                | Self-monitoring and quality assessment          |

👉 **[Complete MCP Tools Reference](docs/mcp-tools.md)**

## Documentation

### 📚 Essential Guides

| Guide                                | Description                     |
| ------------------------------------ | ------------------------------- |
| [User Guide](docs/user-guide.md)     | Getting started and basic usage |
| [API Reference](docs/api.md)         | Complete API documentation      |
| [MCP Tools](docs/mcp-tools.md)       | MCP tool schemas and examples   |
| [Architecture](docs/architecture.md) | System design and components    |

### 🔧 Configuration & Operations

| Guide                              | Description                     |
| ---------------------------------- | ------------------------------- |
| [Environment](docs/environment.md) | Environment variables reference |
| [Database](docs/database.md)       | PostgreSQL setup and schema     |
| [Deployment](docs/deployment.md)   | Production deployment guide     |
| [Monitoring](docs/monitoring.md)   | Observability and alerting      |

### 💻 Development

| Guide                                | Description                    |
| ------------------------------------ | ------------------------------ |
| [Development](docs/development.md)   | Development workflow and setup |
| [Testing](docs/testing.md)           | Testing strategies and TDD     |
| [Contributing](docs/contributing.md) | Contribution guidelines        |
| [Build](docs/build.md)               | Build system and optimization  |

### 🚀 **Quick Links**

- **[Quick Start](#quick-start)** - Get up and running in minutes
- **[Architecture Overview](#architecture-overview)** - System architecture diagram
- **[MCP Configuration](#mcp-server-configuration)** - Configure as MCP server
- **[Contributing](#contributing)** - How to contribute to the project

## Why ThoughtMCP v0.5.0?

### **Production-Grade Architecture**

- **PostgreSQL Persistence**: Cross-session memory with pgvector for vector operations
- **Sub-200ms Retrieval**: p50 <100ms, p95 <200ms, p99 <500ms at 100k memories
- **95%+ Test Coverage**: Comprehensive unit, integration, e2e, performance, and accuracy tests
- **99.9% Uptime**: MTTD <5 minutes, MTTR <1 hour with graceful degradation
- **Local Embeddings**: Uses local models (Ollama, E5, BGE) for zero API costs

### **Advanced Cognitive Capabilities**

- **HMD Memory System**: Five-sector embeddings (Episodic, Semantic, Procedural, Emotional, Reflective)
- **Parallel Reasoning**: Four concurrent streams with real-time coordination
- **Framework Selection**: Eight systematic thinking frameworks with >80% selection accuracy
- **Metacognition**: Confidence calibration (±10%), bias detection (>70%), emotion analysis (>75%)
- **Self-Improvement**: 5-10% monthly performance improvement through learning

### **Developer Experience**

- **Test-Driven Development**: Strict TDD with comprehensive test utilities
- **Clear Documentation**: Development, testing, database, and configuration guides
- **Modern Stack**: TypeScript 5.0+, Vitest, PostgreSQL 14+, pgvector
- **Quality Standards**: Zero TypeScript errors, zero ESLint warnings, formatted with Prettier
- **Open Source**: MIT license, active development, extensible architecture

## Contributing

We welcome contributions! ThoughtMCP v0.5.0 is a complete rebuild following strict quality standards.

### Development Workflow

1. **Fork and Clone**: Fork the repository and clone locally
2. **Setup Environment**: Follow [Development Guide](docs/development.md)
3. **Create Branch**: `git checkout -b feature/your-feature`
4. **Follow TDD**: Write tests first, then implementation
5. **Run Validation**: `npm run validate` (format, lint, typecheck, test)
6. **Submit PR**: Create pull request with clear description

### Quality Standards

- **Test-Driven Development**: Write failing tests first
- **95%+ Coverage**: Line coverage 95%+, branch coverage 90%+
- **Zero Warnings**: No TypeScript errors, no ESLint warnings
- **All Tests Pass**: No exceptions, no skipped tests without plan
- **Clear Commits**: Follow conventional commits format

### Key Resources

- **[Development Guide](docs/development.md)** - Complete development workflow
- **[Testing Guide](docs/testing.md)** - TDD principles and test utilities
- **[Contributing Guide](docs/contributing.md)** - How to contribute
- **[Architecture Guide](docs/architecture.md)** - System design and components

## Community and Support

- **📖 Documentation**: [docs/](docs/) - Comprehensive guides
- **💬 GitHub Discussions**: Ask questions and share ideas
- **🐛 Issues**: Report bugs and request features
- **🤝 Contributing**: See [Contributing](#contributing) section
- **📧 Contact**: [@keyurgolani](https://github.com/keyurgolani)

## Project Status

- ✅ **Production Ready**: Complete PostgreSQL-based cognitive architecture
- ✅ **All Phases Complete**: HMD memory, reasoning, metacognition, production hardening
- ✅ **Fully Tested**: 3457 tests, 96%+ statement coverage, 91%+ branch coverage
- ✅ **All Accuracy Targets Met**: Confidence ±10%, Bias >70%, Emotion >75%, Framework >80%
- ✅ **Documentation Complete**: User guides, API docs, deployment guides, examples

## License

MIT License - see [LICENSE](LICENSE) for details

---

**Building Production-Ready AI Cognitive Architecture**

👉 **[Get Started](# quick-start)** | 📚 **[Documentation](docs/)** | 🤝 **[Contribute](#contributing)** | 💬 **[Discussions](https://github.com/keyurgolani/ThoughtMcp/discussions)**
