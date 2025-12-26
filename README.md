# ThoughtMCP

[![CI](https://github.com/keyurgolani/ThoughtMcp/workflows/CI/badge.svg)](https://github.com/keyurgolani/ThoughtMcp/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.0+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14.0+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Production-Ready AI Cognitive Architecture with Human-Like Memory and Reasoning**

ThoughtMCP provides AI systems with persistent memory, parallel reasoning, and metacognitive capabilities through the Model Context Protocol (MCP).

## Key Features

- **Five-Sector Memory**: Episodic, Semantic, Procedural, Emotional, and Reflective memory types
- **Glass Box Observability**: Real-time visualization of internal reasoning streams (Thought Console)
- **Cognitive Personalization**: Configurable skepticism levels and thinking styles via User Profile
- **Visual Intelligence**: 3D memory graph with Semantic Zooming and Level-of-Detail (LOD)
- **Parallel Reasoning**: Four concurrent streams (Analytical, Creative, Critical, Synthetic)
- **Framework Selection**: Eight systematic thinking frameworks with >80% selection accuracy
- **Metacognition**: Confidence calibration, bias detection, emotion analysis
- **Production Ready**: 75%+ test coverage, sub-200ms retrieval, PostgreSQL persistence

## Quick Start

```bash
# Clone and install
git clone https://github.com/keyurgolani/ThoughtMcp.git
cd ThoughtMcp
npm install

# Setup environment
cp .env.example .env
docker-compose up -d
npm run db:setup

# Build and start
npm run build
npm start
```

## MCP Tools

| Category          | Tools                                                            | Description                       |
| ----------------- | ---------------------------------------------------------------- | --------------------------------- |
| **Memory**        | `remember`, `recall`, `update_memory`, `forget`, `search`        | Persistent five-sector memory     |
| **Reasoning**     | `think`, `analyze`, `ponder`, `breakdown`                        | Multi-stream reasoning            |
| **Metacognitive** | `assess_confidence`, `detect_bias`, `detect_emotion`, `evaluate` | Self-monitoring and quality check |

## MCP Configuration

```json
{
  "mcpServers": {
    "thoughtmcp": {
      "command": "node",
      "args": ["/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/thoughtmcp",
        "OLLAMA_HOST": "http://localhost:11434"
      }
    }
  }
}
```

## Web UI (Beta)

ThoughtMCP includes a web-based interface for visualizing memories and reasoning processes. The UI is currently in beta and under active development.

```bash
# Start the UI development server
cd ui
npm install
npm run dev
```

> ⚠️ **Beta Notice**: The UI is experimental and may have breaking changes between releases. Not recommended for production use yet.

## Documentation

| Guide                                | Description                     |
| ------------------------------------ | ------------------------------- |
| [User Guide](docs/user-guide.md)     | Getting started and basic usage |
| [MCP Tools](docs/mcp-tools.md)       | Tool schemas and examples       |
| [Architecture](docs/architecture.md) | System design                   |
| [Development](docs/development.md)   | Development workflow            |
| [Deployment](docs/deployment.md)     | Production deployment           |

See [docs/](docs/) for complete documentation.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details
