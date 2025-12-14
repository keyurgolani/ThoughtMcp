# ThoughtMCP Architecture Guide

## Overview

ThoughtMCP v0.5.0 is a production-ready cognitive architecture featuring Hierarchical Memory Decomposition (HMD), persistent PostgreSQL storage, parallel reasoning streams, dynamic framework selection, and metacognitive monitoring.

## Design Principles

### 1. Biological Inspiration

- **HMD Memory System**: Five specialized memory sectors
- **Temporal Decay**: Exponential forgetting with reinforcement
- **Parallel Reasoning**: Four concurrent reasoning streams
- **Metacognition**: Self-monitoring and bias detection

### 2. Production-Grade Quality

- **95%+ Test Coverage**
- **Sub-200ms Retrieval** at 100k memories
- **Graceful Degradation**

### 3. Modular Design

- Clear separation of concerns
- Loose coupling through interfaces
- High cohesion within modules
- Independent testability

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       MCP Interface Layer                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Cognitive Orchestrator                     │
└─────┬──────────────┬────────────┬──────────────┬────────────┘
      │              │            │              │
┌─────▼─────┐ ┌─────▼─────┐ ┌───▼────┐ ┌───────▼────────┐
│ Reasoning │ │  Memory   │ │ Bias   │ │  Metacognition │
│  Engine   │ │  System   │ │Detector│ │    Monitor     │
└───────────┘ └───────────┘ └────────┘ └────────────────┘
                         │
             ┌───────────▼───────────────────┐
             │  PostgreSQL + pgvector        │
             └───────────────────────────────┘
```

## Component Architecture

### Memory System (src/memory/)

Core CRUD operations with five-sector embeddings.

### Embedding System (src/embeddings/)

Five-sector embedding generation:

- Episodic, Semantic, Procedural, Emotional, Reflective

### Graph System (src/graph/)

Waypoint graph with 1-3 links per memory.

### Temporal System (src/temporal/)

Exponential decay: `strength = initial × exp(-λ × time)`

### Search System (src/search/)

Multi-strategy search: vector, full-text, metadata, graph.

### Reasoning System (src/reasoning/)

Four parallel streams: Analytical, Creative, Critical, Synthetic.

### Framework System (src/framework/)

Dynamic framework selection from 5 frameworks.

### Confidence System (src/confidence/)

Five-dimensional confidence assessment with calibration.

### Bias System (src/bias/)

Detection of 8 bias types with correction strategies.

### Emotion System (src/emotion/)

Circumplex model + 11 discrete emotions.

### Metacognitive System (src/metacognitive/)

Performance monitoring and self-improvement.

### Monitoring System (src/monitoring/)

Health checks, metrics, structured logging.

### Security System (src/security/)

Input validation, rate limiting, secrets management.

### Server System (src/server/)

MCP server and tool registry.

## Data Flow

### Memory Creation

User Input → Embedding Generation → Graph Integration → PostgreSQL

### Memory Retrieval

Query → Multi-Strategy Search → Composite Scoring → Response

### Parallel Reasoning

Problem → Classification → 4 Streams → Synthesis → Response

## Performance Targets

| Metric        | Target |
| ------------- | ------ |
| Retrieval p50 | <100ms |
| Retrieval p95 | <200ms |
| Embedding gen | <500ms |
| Reasoning     | <30s   |
| Bias overhead | <15%   |

## Technology Stack

- Node.js 18+, TypeScript 5.0+
- PostgreSQL 14+ with pgvector
- Vitest, esbuild, ESLint, Prettier

## See Also

- [API Reference](./api.md)
- [Development Guide](./development.md)
- [Database Guide](./database.md)
- [Testing Guide](./testing.md)

---

**Last Updated**: December 2025
**Version**: 0.5.0
