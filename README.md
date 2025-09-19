# ThoughtMCP - Cognitive Architecture MCP Server

> **🚀 Beta Release**: This project is now in beta! The core cognitive architecture is implemented and functional, with comprehensive real-world examples available. While the system is stable and ready for testing, some advanced features are still being refined. Breaking changes may occur before v1.0.0 release.

A Model Context Protocol (MCP) server that implements human-like cognitive architecture for enhanced AI reasoning. This system mimics biological cognitive processes through multiple processing layers, dual-process thinking, memory systems, emotional processing, and metacognitive monitoring.

## Features

- **Dual-Process Thinking**: System 1 (intuitive) and System 2 (deliberative) processing
- **Memory Systems**: Episodic and semantic memory with consolidation
- **Emotional Processing**: Somatic markers and emotional modulation of reasoning
- **Metacognitive Monitoring**: Self-awareness and bias detection
- **Predictive Processing**: Bayesian belief updating and prediction error correction
- **Stochastic Neural Processing**: Biological-like noise and variability

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

# Lint code
npm run lint
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
