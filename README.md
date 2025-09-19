# ThoughtMCP - Cognitive Architecture MCP Server

[![CI](https://github.com/keyurgolani/ThoughtMcp/workflows/CI/badge.svg)](https://github.com/keyurgolani/ThoughtMcp/actions)
[![Coverage](https://img.shields.io/badge/coverage-79.63%25-green.svg)](https://github.com/keyurgolani/ThoughtMcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.0+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **🚀 Release Ready**: This project is now production-ready! The cognitive architecture is fully implemented and thoroughly tested with 789 passing tests and 79.63% code coverage. The system is stable, performant, and ready for real-world deployment.

A Model Context Protocol (MCP) server that implements human-like cognitive architecture for enhanced AI reasoning. This system mimics biological cognitive processes through multiple processing layers, dual-process thinking, memory systems, emotional processing, and metacognitive monitoring.

## Features

- **Dual-Process Thinking**: System 1 (intuitive) and System 2 (deliberative) processing
- **Memory Systems**: Episodic and semantic memory with consolidation
- **Emotional Processing**: Somatic markers and emotional modulation of reasoning
- **Metacognitive Monitoring**: Self-awareness and bias detection
- **Predictive Processing**: Bayesian belief updating and prediction error correction
- **Stochastic Neural Processing**: Biological-like noise and variability
- **Performance Monitoring**: Real-time performance tracking and optimization
- **Error Handling**: Robust error handling with graceful degradation
- **Comprehensive Testing**: 789 tests with 79.63% code coverage

## Quality Metrics

- **Test Coverage**: 79.63% overall (93.15% cognitive components)
- **Test Suite**: 789 passing tests across all components
- **Performance**: 50-500ms response times under load
- **Memory Usage**: <2GB for full cognitive model
- **Build Time**: <30 seconds
- **Supported Node.js**: 18.x, 20.x, 22.x

## Installation

```bash
npm install
```

## Development

```bash
# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:cognitive      # Cognitive component tests
npm run test:integration    # Integration tests
npm run test:performance    # Performance tests
npm run test:memory         # Memory system tests

# Quality checks
npm run lint                # Code linting
npm run type-check          # TypeScript type checking
npm run dev:check           # Comprehensive development check
npm run dev:check:strict    # Strict quality validation

# Security and maintenance
npm run security:audit      # Security vulnerability check
npm run check:any           # Find TypeScript 'any' types
npm run fix:style           # Auto-fix code style issues
```

## Usage

The server implements four main cognitive tools:

### 1. Think

Process input through human-like cognitive architecture:

```json
{
  "tool": "think",
  "arguments": {
    "input": "What are the implications of artificial intelligence?",
    "mode": "deliberative",
    "enable_emotion": true,
    "enable_metacognition": true
  }
}
```

### 2. Remember

Store information in episodic or semantic memory:

```json
{
  "tool": "remember",
  "arguments": {
    "content": "AI systems can exhibit emergent behaviors",
    "type": "semantic",
    "importance": 0.8
  }
}
```

### 3. Recall

Retrieve memories based on cues:

```json
{
  "tool": "recall",
  "arguments": {
    "cue": "artificial intelligence",
    "type": "both",
    "threshold": 0.3
  }
}
```

### 4. Analyze Reasoning

Analyze reasoning steps for quality and biases:

```json
{
  "tool": "analyze_reasoning",
  "arguments": {
    "reasoning_steps": [
      {
        "type": "logical_inference",
        "content": "If A then B",
        "confidence": 0.8,
        "alternatives": []
      }
    ]
  }
}
```

## Configuration

Configure the system using environment variables:

- `COGNITIVE_DEFAULT_MODE`: Default processing mode (balanced, intuitive, deliberative, creative, analytical)
- `COGNITIVE_ENABLE_EMOTION`: Enable emotional processing (true/false)
- `COGNITIVE_ENABLE_METACOGNITION`: Enable metacognitive monitoring (true/false)
- `COGNITIVE_WORKING_MEMORY_CAPACITY`: Working memory capacity (1-20)
- `COGNITIVE_TEMPERATURE`: Stochastic processing temperature (0-2)
- `COGNITIVE_TIMEOUT_MS`: Processing timeout in milliseconds
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARN, ERROR)

## Architecture

The system is organized into three main layers:

1. **Interface Layer**: MCP server implementation with tool registration and request handling
2. **Cognitive Layer**: Core cognitive processing components that implement human-like thinking
3. **Storage Layer**: Memory systems and persistence mechanisms

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:

- Development setup and workflow
- Code quality standards
- Testing requirements
- Submission process
- Architecture guidelines

## License

MIT
