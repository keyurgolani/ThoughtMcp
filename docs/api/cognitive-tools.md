# ThoughtMCP Cognitive Tools API Documentation

## Overview

The ThoughtMCP server provides four core cognitive tools that implement human-like thinking processes through the Model Context Protocol (MCP). These tools enable AI systems to process information through multiple cognitive layers, maintain memory systems, and perform metacognitive analysis.

## Tool Specifications

### 1. `think` - Cognitive Processing Tool

The primary tool for processing input through the cognitive architecture.

#### Schema

```json
{
  "name": "think",
  "description": "Process input through human-like cognitive architecture with dual-process thinking, memory integration, and emotional processing",
chema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "The input text or question to think about"
      },
      "mode": {
        "type": "string",
        "enum": ["intuitive", "deliberative", "balanced", "creative", "analytical"],
        "default": "balanced",
        "description": "Processing mode to use"
      },
      "context": {
        "type": "object",
        "description": "Contextual information for processing",
        "properties": {
          "domain": { "type": "string" },
          "session_id": { "type": "string" },
          "urgency": { "type": "number", "minimum": 0, "maximum": 1 },
          "complexity": { "type": "number", "minimum": 0, "maximum": 1 },
          "previous_thoughts": { "type": "array", "items": { "type": "string" } }
        }
      },
      "enable_emotion": {
        "type": "boolean",
        "default": true,
        "description": "Whether to include emotional processing"
      },
      "enable_metacognition": {
        "type": "boolean",
        "default": true,
        "description": "Whether to include metacognitive monitoring"
      },
      "max_depth": {
        "type": "number",
        "default": 10,
        "minimum": 1,
        "maximum": 20,
        "description": "Maximum reasoning depth"
      },
      "temperature": {
        "type": "number",
        "default": 0.7,
        "minimum": 0,
        "maximum": 2,
        "description": "Randomness level for stochastic processing"
      }
    },
    "required": ["input"]
  }
}
```

#### Response Format

```typescript
interface ThoughtResult {
  content: string; // The main thought content
  confidence: number; // Confidence score (0-1)
  reasoning_path: ReasoningStep[]; // Step-by-step reasoning process
  emotional_context: EmotionalState; // Emotional assessment
  metadata: {
    processing_time_ms: number;
    mode_used: string;
    components_activated: string[];
    memory_retrievals: number;
    prediction_errors: number;
  };
}

interface ReasoningStep {
  type: "intuitive" | "deliberative" | "emotional" | "metacognitive";
  content: string;
  confidence: number;
  alternatives?: string[];
  biases_detected?: string[];
}

interface EmotionalState {
  valence: number; // Positive/negative emotion (-1 to 1)
  arousal: number; // Intensity of emotion (0 to 1)
  dominance: number; // Control/power feeling (0 to 1)
  specific_emotions: {
    // Specific emotion scores
    [emotion: string]: number;
  };
}
```

#### Usage Examples

**Basic Thinking**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "think",
    arguments: {
      input: "What are the implications of quantum computing for cryptography?",
    },
  },
});
```

**Deliberative Mode for Complex Problems**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "think",
    arguments: {
      input: "How should we approach the ethical challenges of AI development?",
      mode: "deliberative",
      enable_emotion: true,
      enable_metacognition: true,
      max_depth: 15,
    },
  },
});
```

**Creative Mode for Innovation**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "think",
    arguments: {
      input: "Design a sustainable city of the future",
      mode: "creative",
      temperature: 1.2,
      context: {
        domain: "urban_planning",
        complexity: 0.9,
      },
    },
  },
});
```

### 2. `remember` - Memory Storage Tool

Store information in episodic or semantic memory systems.

#### Schema

```json
{
  "name": "remember",
  "description": "Store information in episodic or semantic memory with contextual tagging",
  "inputSchema": {
    "type": "object",
    "properties": {
      "content": {
        "type": "string",
        "description": "Content to store in memory"
      },
      "type
  "type": "string",
        "enum": ["episodic", "semantic"],
        "description": "Type of memory to store in"
      },
      "importance": {
        "type": "number",
        "default": 0.5,
        "minimum": 0,
        "maximum": 1,
        "description": "Importance score for memory consolidation"
      },
      "emotional_tags": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Emotional tags for the memory"
      },
      "context": {
        "type": "object",
        "description": "Contextual information for the memory",
        "properties": {
          "domain": { "type": "string" },
          "session_id": { "type": "string" },
          "timestamp": { "type": "number" }
        }
      }
    },
    "required": ["content", "type"]
  }
}
```

#### Response Format

```typescript
interface MemoryResult {
  memory_id: string;
  stored_successfully: boolean;
  memory_type: "episodic" | "semantic";
  consolidation_scheduled: boolean;
  associations_created: number;
}
```

#### Usage Examples

**Store Episodic Memory**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "remember",
    arguments: {
      content:
        "Had an insightful discussion about machine learning with Dr. Smith",
      type: "episodic",
      importance: 0.8,
      emotional_tags: ["curiosity", "excitement", "learning"],
      context: {
        domain: "academic",
        session_id: "session_123",
      },
    },
  },
});
```

**Store Semantic Knowledge**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "remember",
    arguments: {
      content:
        "Neural networks learn through backpropagation by adjusting weights based on error gradients",
      type: "semantic",
      importance: 0.9,
      context: {
        domain: "machine_learning",
      },
    },
  },
});
```

### 3. `recall` - Memory Retrieval Tool

Retrieve memories based on cues with similarity matching.

#### Schema

```json
{
  "name": "recall",
  "description": "Retrieve memories based on cues with similarity matching",
  "inputSchema": {
    "type": "object",
    "properties": {
      "cue": {
        "type": "string",
        "description": "Search cue for memory retrieval"
      },
      "type": {
        "type": "string",
        "enum": ["episodic", "semantic", "both"],
        "default": "both",
        "description": "Type of memory to search"
      },
      "max_results": {
        "type": "number",
        "default": 10,
        "minimum": 1,
        "maximum": 50,
        "description": "Maximum number of results to return"
      },
      "threshold": {
        "type": "number",
        "default": 0.3,
        "minimum": 0,
        "maximum": 1,
        "description": "Minimum similarity threshold"
      },
      "context": {
        "type": "object",
        "description": "Context for memory search",
        "properties": {
          "domain": { "type": "string" },
          "session_id": { "type": "string" }
        }
      }
    },
    "required": ["cue"]
  }
}
```

#### Response Format

```typescript
interface RecallResult {
  memories: Memory[];
  total_found: number;
  search_time_ms: number;
  consolidation_triggered: boolean;
}

interface Memory {
  memory_id: string;
  content: string;
  type: "episodic" | "semantic";
  similarity: number;
  importance: number;
  timestamp: number;
  emotional_tags?: string[];
  context?: object;
  associations: string[];
}
```

#### Usage Examples

**Basic Memory Recall**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "recall",
    arguments: {
      cue: "machine learning discussion",
      max_results: 5,
      threshold: 0.4,
    },
  },
});
```

**Semantic Knowledge Search**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "recall",
    arguments: {
      cue: "neural networks backpropagation",
      type: "semantic",
      max_results: 10,
      threshold: 0.6,
      context: {
        domain: "machine_learning",
      },
    },
  },
});
```

### 4. `analyze_reasoning` - Metacognitive Analysis Tool

Analyze reasoning steps for coherence, biases, and quality.

#### Schema

```json
{
  "name": "analyze_reasoning",
  "description": "Analyze reasoning steps for coherence, biases, and quality with metacognitive assessment",
  "inputSchema": {
    "type": "object",
    "properties": {
      "reasoning_steps": {
        "type": "array",
        "description": "Array of reasoning steps to analyze",
        "items": {
          "type": "object",
          "properties": {
            "type": { "type": "string" },
            "content": { "type": "string" },
            "confidence": { "type": "number" },
            "alternatives": { "type": "array" }
          },
          "required": ["type", "content", "confidence"]
        }
      },
      "context": {
        "type": "object",
        "description": "Context for the analysis",
        "properties": {
          "domain": { "type": "string" },
          "session_id": { "type": "string" }
        }
      }
    },
    "required": ["reasoning_steps"]
  }
}
```

#### Response Format

```typescript
interface AnalysisResult {
  overall_quality: number; // Overall reasoning quality (0-1)
  coherence_score: number; // Logical coherence (0-1)
  completeness_score: number; // Completeness of analysis (0-1)
  confidence_calibration: number; // How well-calibrated confidence scores are (0-1)
  biases: BiasDetection[]; // Detected cognitive biases
  suggestions: string[]; // Improvement suggestions
  alternative_approaches: string[]; // Alternative reasoning strategies
  metadata: {
    analysis_time_ms: number;
    steps_analyzed: number;
    patterns_detected: string[];
  };
}

interface BiasDetection {
  bias_type: string;
  confidence: number;
  description: string;
  affected_steps: number[];
  mitigation_strategy: string;
}
```

#### Usage Examples

**Analyze Logical Reasoning**

```typescript
const reasoningSteps = [
  {
    type: "premise",
    content: "All birds can fly",
    confidence: 0.8,
  },
  {
    type: "premise",
    content: "Penguins are birds",
    confidence: 0.95,
  },
  {
    type: "conclusion",
    content: "Therefore, penguins can fly",
    confidence: 0.7,
  },
];

const result = await client.request({
  method: "tools/call",
  params: {
    name: "analyze_reasoning",
    arguments: {
      reasoning_steps: reasoningSteps,
      context: {
        domain: "logic",
      },
    },
  },
});
```

## Processing Modes

### Intuitive Mode (`"intuitive"`)

- **Use Case**: Quick responses, pattern recognition, familiar problems
- **Characteristics**: Fast processing, relies on cached patterns and heuristics
- **Typical Response Time**: 50-200ms
- **Best For**: Simple questions, routine decisions, first impressions

### Deliberative Mode (`"deliberative"`)

- **Use Case**: Complex problems requiring careful analysis
- **Characteristics**: Slow, systematic reasoning with multiple perspectives
- **Typical Response Time**: 200-1000ms
- **Best For**: Ethical dilemmas, strategic planning, novel problems

### Balanced Mode (`"balanced"`) - Default

- **Use Case**: General-purpose thinking that adapts to complexity
- **Characteristics**: Starts intuitive, escalates to deliberative as needed
- **Typical Response Time**: 100-500ms
- **Best For**: Most general queries, adaptive problem-solving

### Creative Mode (`"creative"`)

- **Use Case**: Innovation, brainstorming, artistic tasks
- **Characteristics**: High stochasticity, divergent thinking, novel connections
- **Typical Response Time**: 200-800ms
- **Best For**: Design tasks, creative writing, ideation

### Analytical Mode (`"analytical"`)

- **Use Case**: Data analysis, systematic evaluation, technical problems
- **Characteristics**: Structured reasoning, evidence-based conclusions
- **Typical Response Time**: 300-600ms
- **Best For**: Scientific analysis, technical troubleshooting, research

## Configuration Parameters

### Temperature (`temperature`)

Controls randomness in stochastic processing:

- **0.0-0.3**: Very deterministic, consistent outputs
- **0.4-0.7**: Balanced randomness (recommended)
- **0.8-1.2**: High creativity, more varied outputs
- **1.3-2.0**: Very creative but potentially incoherent

### Max Depth (`max_depth`)

Limits reasoning chain length:

- **1-5**: Simple, direct responses
- **6-10**: Standard reasoning depth (recommended)
- **11-15**: Deep analysis for complex problems
- **16-20**: Maximum depth for very complex reasoning

### Emotional Processing (`enable_emotion`)

- **true**: Includes emotional assessment and somatic markers
- **false**: Pure logical processing without emotional influence

### Metacognitive Monitoring (`enable_metacognition`)

- **true**: Monitors and adjusts reasoning quality
- **false**: Direct processing without self-monitoring

## Error Handling

### Common Error Types

1. **Input Validation Errors**

   ```json
   {
     "error": "Invalid input parameter",
     "code": "VALIDATION_ERROR",
     "details": "Temperature must be between 0 and 2"
   }
   ```

2. **Processing Timeout**

   ```json
   {
     "error": "Processing timeout exceeded",
     "code": "TIMEOUT_ERROR",
     "details": "Reasoning depth too high for given timeout"
   }
   ```

3. **Memory System Errors**
   ```json
   {
     "error": "Memory storage failed",
     "code": "MEMORY_ERROR",
     "details": "Episodic memory capacity exceeded"
   }
   ```

### Error Recovery Strategies

- **Graceful Degradation**: System falls back to simpler processing modes
- **Partial Results**: Returns best available results with error context
- **Retry Logic**: Automatic retry with adjusted parameters
- **Error Context**: Detailed error information for debugging

## Performance Considerations

### Latency Expectations

| Mode         | Typical Latency | Max Recommended |
| ------------ | --------------- | --------------- |
| Intuitive    | 50-200ms        | 300ms           |
| Deliberative | 200-1000ms      | 2000ms          |
| Balanced     | 100-500ms       | 1000ms          |
| Creative     | 200-800ms       | 1500ms          |
| Analytical   | 300-600ms       | 1200ms          |

### Memory Usage

- **Base System**: ~500MB RAM
- **Per Session**: ~10-50MB depending on memory accumulation
- **Memory Persistence**: 100MB-1GB storage depending on usage

### Optimization Tips

1. **Use Appropriate Modes**: Don't use deliberative mode for simple queries
2. **Limit Reasoning Depth**: Higher depths increase latency exponentially
3. **Batch Memory Operations**: Store multiple memories in sequence for efficiency
4. **Context Reuse**: Reuse session contexts to leverage memory associations
5. **Temperature Tuning**: Lower temperature for faster, more deterministic responses

## Integration Examples

### Basic Integration

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

class CognitiveAI {
  private client: Client;

  async initialize() {
    const transport = new StdioClientTransport({
      command: "node",
      args: ["path/to/thoughtmcp/dist/index.js"],
    });

    this.client = new Client({ name: "my-app", version: "1.0.0" }, {});
    await this.client.connect(transport);
  }

  async think(question: string, mode = "balanced") {
    return await this.client.request({
      method: "tools/call",
      params: {
        name: "think",
        arguments: { input: question, mode },
      },
    });
  }
}
```

### Advanced Integration with Memory

```typescript
class AdvancedCognitiveAI extends CognitiveAI {
  private sessionId: string;

  constructor() {
    super();
    this.sessionId = `session_${Date.now()}`;
  }

  async learnFromExperience(experience: string, importance = 0.5) {
    await this.client.request({
      method: "tools/call",
      params: {
        name: "remember",
        arguments: {
          content: experience,
          type: "episodic",
          importance,
          context: { session_id: this.sessionId },
        },
      },
    });
  }

  async thinkWithContext(question: string, relatedTopics: string[] = []) {
    // Recall relevant memories
    const memories = [];
    for (const topic of relatedTopics) {
      const recall = await this.client.request({
        method: "tools/call",
        params: {
          name: "recall",
          arguments: {
            cue: topic,
            max_results: 3,
            context: { session_id: this.sessionId },
          },
        },
      });
      memories.push(...recall.content.memories);
    }

    // Think with memory context
    return await this.client.request({
      method: "tools/call",
      params: {
        name: "think",
        arguments: {
          input: question,
          context: {
            session_id: this.sessionId,
            previous_thoughts: memories.map((m) => m.content),
          },
        },
      },
    });
  }
}
```

## Best Practices

### 1. Mode Selection

- Use **intuitive** for quick, familiar tasks
- Use **deliberative** for important, complex decisions
- Use **creative** for brainstorming and innovation
- Use **analytical** for data-driven problems
- Use **balanced** when unsure (good default)

### 2. Memory Management

- Store important experiences as episodic memories
- Extract general knowledge as semantic memories
- Use appropriate importance scores (0.7+ for important information)
- Tag memories with relevant emotional context

### 3. Context Utilization

- Maintain session IDs for coherent conversations
- Provide domain context for specialized reasoning
- Include previous thoughts for continuity
- Set appropriate urgency and complexity levels

### 4. Performance Optimization

- Monitor response times and adjust parameters
- Use lower temperatures for consistent outputs
- Limit reasoning depth for time-sensitive applications
- Batch memory operations when possible

### 5. Error Handling

- Implement retry logic with exponential backoff
- Handle graceful degradation scenarios
- Log errors with sufficient context for debugging
- Provide meaningful error messages to users
