# API Reference

Complete reference documentation for all ThoughtMCP tools and configuration options.

## Overview

ThoughtMCP provides four main cognitive tools through the Model Context Protocol (MCP):

- **[think](tools/think.md)** - Process input through human-like cognitive architecture
- **[remember](tools/remember.md)** - Store information in episodic or semantic memory
- **[recall](tools/recall.md)** - Retrieve memories based on cues with similarity matching
- **[analyze_reasoning](tools/analyze-reasoning.md)** - Analyze reasoning steps for quality and biases

## Quick Reference

### Tool Signatures

```typescript
// Think tool
interface ThinkRequest {
  input: string;
  mode?: "intuitive" | "deliberative" | "balanced" | "creative" | "analytical";
  context?: object;
  enable_emotion?: boolean;
  enable_metacognition?: boolean;
  max_depth?: number;
  temperature?: number;
}

// Remember tool
interface RememberRequest {
  content: string;
  type: "episodic" | "semantic";
  importance?: number;
  emotional_tags?: string[];
  context?: object;
}

// Recall tool
interface RecallRequest {
  cue: string;
  type?: "episodic" | "semantic" | "both";
  max_results?: number;
  threshold?: number;
  context?: object;
}

// Analyze reasoning tool
interface AnalyzeReasoningRequest {
  reasoning_steps: ReasoningStep[];
  context?: object;
}
```

### Response Format

All tools return responses in this format:

```typescript
interface ToolResponse {
  content: any; // Tool-specific response data
  metadata: {
    tool: string; // Tool name
    timestamp: number; // Unix timestamp
    session_id?: string; // Session identifier
    performance: {
      duration_ms: number;
      memory_usage?: number;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

## Common Parameters

### Context Object

Many tools accept an optional `context` parameter:

```typescript
interface Context {
  domain?: string; // Domain/topic area
  session_id?: string; // Session identifier
  urgency?: number; // 0-1 urgency level
  complexity?: number; // 0-1 complexity estimate
  previous_thoughts?: string[]; // Related previous thoughts
  timestamp?: number; // Context timestamp
  [key: string]: any; // Additional context fields
}
```

### Processing Modes

The `think` tool supports different processing modes:

- **`balanced`** (default): Mix of intuitive and deliberative processing
- **`intuitive`**: Fast, pattern-based processing (System 1)
- **`deliberative`**: Slow, careful reasoning (System 2)
- **`creative`**: Emphasizes novel connections and ideas
- **`analytical`**: Emphasizes logical reasoning and analysis

### Memory Types

The `remember` and `recall` tools work with two memory types:

- **`episodic`**: Specific experiences and events with temporal context
- **`semantic`**: General knowledge and concepts without specific context
- **`both`**: Search both memory types (recall only)

## Error Handling

### Error Codes

| Code                  | Description                 | Resolution                            |
| --------------------- | --------------------------- | ------------------------------------- |
| `INVALID_INPUT`       | Invalid request parameters  | Check parameter types and values      |
| `TIMEOUT`             | Processing timeout exceeded | Reduce complexity or increase timeout |
| `MEMORY_ERROR`        | Memory system error         | Check memory configuration            |
| `PROCESSING_ERROR`    | Cognitive processing error  | Retry with different parameters       |
| `CONFIGURATION_ERROR` | Invalid configuration       | Check environment variables           |

### Error Response Format

```json
{
  "content": null,
  "metadata": {
    "tool": "think",
    "timestamp": 1640995200000
  },
  "error": {
    "code": "INVALID_INPUT",
    "message": "Missing required parameter: input",
    "details": {
      "parameter": "input",
      "expected_type": "string"
    }
  }
}
```

## Rate Limits and Performance

### Default Limits

- **Request Rate**: 100 requests/minute per session
- **Concurrent Requests**: 10 per session
- **Memory Storage**: 10,000 episodic memories, 5,000 semantic concepts
- **Processing Timeout**: 30 seconds per request

### Performance Characteristics

| Tool                   | Typical Response Time | Memory Usage |
| ---------------------- | --------------------- | ------------ |
| `think` (intuitive)    | 50-200ms              | Low          |
| `think` (deliberative) | 200-1000ms            | Medium       |
| `remember`             | 10-50ms               | Low          |
| `recall`               | 50-200ms              | Medium       |
| `analyze_reasoning`    | 100-500ms             | Medium       |

### Optimization Tips

**For Speed:**

```json
{
  "mode": "intuitive",
  "enable_metacognition": false,
  "temperature": 0.3,
  "max_depth": 5
}
```

**For Quality:**

```json
{
  "mode": "deliberative",
  "enable_metacognition": true,
  "temperature": 0.7,
  "max_depth": 15
}
```

**For Memory Efficiency:**

```json
{
  "max_results": 5,
  "threshold": 0.5
}
```

## Configuration

### Environment Variables

See [Configuration Guide](../guides/configuration.md) for complete details.

**Core Settings:**

```bash
COGNITIVE_DEFAULT_MODE=balanced
COGNITIVE_ENABLE_EMOTION=true
COGNITIVE_ENABLE_METACOGNITION=true
COGNITIVE_TEMPERATURE=0.7
COGNITIVE_TIMEOUT_MS=30000
```

**Memory Settings:**

```bash
COGNITIVE_BRAIN_DIR=~/.brain
COGNITIVE_EPISODIC_MEMORY_SIZE=10000
COGNITIVE_SEMANTIC_MEMORY_SIZE=5000
```

### Runtime Configuration

Some parameters can be configured per request:

```json
{
  "tool": "think",
  "arguments": {
    "input": "Your question here",
    "temperature": 0.5, // Override default
    "max_depth": 10, // Override default
    "enable_emotion": false // Override default
  }
}
```

## Authentication and Security

### Session Management

ThoughtMCP uses session-based authentication:

```json
{
  "tool": "think",
  "arguments": {
    "input": "Your question",
    "context": {
      "session_id": "your-session-id"
    }
  }
}
```

### Data Privacy

- **Memory Isolation**: Each session has isolated memory
- **No Data Sharing**: Sessions cannot access each other's data
- **Local Storage**: All data stored locally by default
- **Encryption**: Memory files encrypted at rest (configurable)

## Versioning

ThoughtMCP follows semantic versioning:

- **Major**: Breaking API changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, backward compatible

Current version: `0.1.0`

### API Compatibility

- **v0.1.x**: Current stable API
- **v0.2.x**: Planned features (backward compatible)
- **v1.0.x**: Stable production API (future)

## SDK and Client Libraries

### Official Clients

- **Node.js**: Built-in MCP SDK support
- **Python**: Community MCP client
- **TypeScript**: Full type definitions included

### Community Clients

See [Integration Examples](../examples/integration/) for implementation patterns.

## Support and Resources

### Documentation

- **[Tool Reference](tools/)** - Detailed tool documentation
- **[Configuration](../guides/configuration.md)** - Setup and tuning
- **[Examples](../examples/)** - Usage examples
- **[Troubleshooting](../guides/troubleshooting.md)** - Common issues

### Community

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Questions and community support
- **Contributing**: See [development guide](../development/)

---

_Need detailed information about a specific tool? Check the [tools](tools/) section._
