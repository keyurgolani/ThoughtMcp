# ThoughtMCP v0.5.0 Release Notes

**Release Date:** December 7, 2025

## Overview

ThoughtMCP v0.5.0 is a complete architectural rebuild delivering a production-ready AI cognitive architecture with human-like memory and reasoning capabilities. This release represents a ground-up reimplementation with PostgreSQL persistence, parallel reasoning streams, and comprehensive metacognitive monitoring.

## Key Features

### 🧠 Hierarchical Memory Decomposition (HMD)

- **Five-Sector Embeddings**: Episodic, Semantic, Procedural, Emotional, and Reflective memory types
- **Waypoint Graph System**: Sparse graph with 1-3 connections per memory for efficient traversal
- **Composite Scoring**: 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×link_weight
- **Temporal Decay**: Exponential forgetting with automatic reinforcement on access
- **PostgreSQL Persistence**: Production-grade storage with pgvector for vector operations

### ⚡ Performance

- **Sub-200ms Retrieval**: p50 <100ms, p95 <200ms, p99 <500ms at 100k memories
- **Fast Embedding**: <500ms for all five sectors
- **Parallel Reasoning**: <30s total, <10s per stream
- **Efficient Operations**: <100ms confidence assessment, <15% bias detection overhead

### 🔀 Parallel Reasoning Streams

- **Four Concurrent Streams**: Analytical, Creative, Critical, and Synthetic reasoning
- **Real-Time Coordination**: Synchronization at 25%, 50%, 75% completion
- **Conflict Preservation**: Maintains diverse perspectives in synthesis
- **Low Overhead**: <10% coordination cost

### 🎯 Dynamic Framework Selection

- **Eight Frameworks**: Scientific Method, Design Thinking, Systems Thinking, Critical Thinking, Creative Problem Solving, Root Cause Analysis, First Principles, Scenario Planning
- **Auto-Selection**: >80% accuracy in choosing optimal framework
- **Hybrid Support**: Combines 2-3 frameworks for complex problems
- **Adaptive Learning**: Improves selection over time

### 🔬 Metacognitive Monitoring

- **Confidence Calibration**: ±10% accuracy between predicted and actual performance
- **Bias Detection**: >70% detection rate for 8 bias types
- **Emotion Detection**: >75% accuracy using Circumplex model
- **Self-Improvement**: 5-10% monthly performance improvement

### 🏗️ Production Hardening

- **96%+ Test Coverage**: 3457 tests across unit, integration, e2e, performance, and accuracy
- **Zero TypeScript Errors**: Full type safety throughout
- **Security Hardening**: Input validation, rate limiting, secrets management
- **Monitoring**: Structured logging, metrics collection, health checks

## Quality Metrics

| Metric             | Target | Achieved |
| ------------------ | ------ | -------- |
| Statement Coverage | 95%+   | 96.06%   |
| Branch Coverage    | 90%+   | 91.22%   |
| Function Coverage  | 95%+   | 98.94%   |
| Test Count         | -      | 3457     |
| TypeScript Errors  | 0      | 0        |
| ESLint Errors      | 0      | 0        |

## Accuracy Targets

| Capability             | Target | Status             |
| ---------------------- | ------ | ------------------ |
| Confidence Calibration | ±10%   | ✅ Validated       |
| Bias Detection         | >70%   | ✅ Validated       |
| Emotion Detection      | >75%   | ✅ Validated       |
| Framework Selection    | >80%   | ✅ Validated       |
| Memory Retrieval       | >85%   | ✅ Validated (90%) |

## MCP Tools

All cognitive capabilities are exposed through MCP tools:

### Memory Operations

- `store_memory` - Store memories with five-sector embeddings
- `retrieve_memories` - Retrieve with composite scoring
- `update_memory` - Update memory content and metadata
- `delete_memory` - Delete with cascade options
- `search_memories` - Full-text and metadata search

### Reasoning Operations

- `think` - Human-like reasoning with multiple modes
- `analyze_systematically` - Framework-based problem solving
- `think_parallel` - Multi-stream parallel reasoning
- `decompose_problem` - Complex problem breakdown

### Metacognitive Operations

- `assess_confidence` - Multi-dimensional confidence assessment
- `detect_bias` - Real-time bias detection and correction
- `detect_emotion` - Circumplex and discrete emotion analysis
- `analyze_reasoning` - Reasoning quality assessment

## New in v0.5.0

This is the initial production-ready release of ThoughtMCP with the complete cognitive architecture:

- **PostgreSQL with pgvector**: Production-grade vector storage
- **Local embeddings**: Uses Ollama, E5, or BGE models (zero API costs)
- **Complete MCP integration**: Full tool schemas with validation
- **Comprehensive documentation**: User guides, API docs, deployment guides

## Getting Started

See [docs/user-guide.md](docs/user-guide.md) for installation and setup instructions.

## Documentation

- [User Guide](docs/user-guide.md) - Getting started and workflows
- [API Reference](docs/api.md) - Complete API documentation
- [MCP Tools](docs/mcp-tools.md) - Tool schemas and examples
- [Architecture](docs/architecture.md) - System design
- [Deployment](docs/deployment.md) - Production deployment guide
- [Development](docs/development.md) - Development workflow

## Requirements

- **Node.js**: 18.0+
- **PostgreSQL**: 14.0+ with pgvector extension
- **Embedding Model**: Ollama, E5, or BGE (local)

## Installation

```bash
npm install thoughtmcp
```

Or clone and build:

```bash
git clone https://github.com/keyurgolani/ThoughtMcp.git
cd ThoughtMcp
npm install
npm run build
```

## Acknowledgments

Thank you to all contributors who helped make this release possible.

## License

MIT License - see [LICENSE](LICENSE) for details.
