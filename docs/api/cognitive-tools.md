# ThoughtMCP Cognitive Tools API Documentation

## Overview

The ThoughtMCP server provides seven core cognitive tools that implement human-like thinking processes through the Model Context Protocol (MCP). These tools enable AI systems to process information through multiple cognitive layers, maintain memory systems, perform systematic thinking analysis, and execute parallel reasoning processes.

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

## Systematic Thinking Tools

The following tools implement systematic thinking frameworks for structured problem analysis and solution development.

### 5. `analyze_systematically` - Systematic Analysis Tool

Analyze problems using systematic thinking frameworks with automatic framework selection and structured problem decomposition.

#### Schema

```json
{
  "name": "analyze_systematically",
  "description": "Analyze problems using systematic thinking frameworks with automatic framework selection and structured problem decomposition",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "The problem or question to analyze systematically"
      },
      "mode": {
        "type": "string",
        "enum": ["auto", "hybrid", "manual"],
        "default": "auto",
        "description": "Framework selection mode"
      },
      "context": {
        "type": "object",
        "description": "Contextual information for analysis",
        "properties": {
          "domain": { "type": "string" },
          "session_id": { "type": "string" },
          "urgency": { "type": "number", "minimum": 0, "maximum": 1 },
          "complexity": { "type": "number", "minimum": 0, "maximum": 1 }
        }
      }
    },
    "required": ["input"]
  }
}
```

#### Response Format

```typescript
interface SystematicAnalysisResult {
  problem_structure: ProblemStructure;
  recommended_framework: FrameworkRecommendation;
  analysis_steps: AnalysisStep[];
  confidence: number;
  processing_time_ms: number;
  alternative_approaches: AlternativeApproach[];
}

interface ProblemStructure {
  main_problem: Problem;
  sub_problems: Problem[];
  dependencies: string[];
  constraints: string[];
  stakeholders: string[];
}

interface FrameworkRecommendation {
  framework: ThinkingFramework;
  confidence: number;
  reasoning: string;
}

interface ThinkingFramework {
  type:
    | "scientific_method"
    | "design_thinking"
    | "systems_thinking"
    | "critical_thinking"
    | "creative_problem_solving"
    | "root_cause_analysis"
    | "first_principles"
    | "scenario_planning";
  name: string;
  description: string;
  steps: FrameworkStep[];
  strengths: string[];
  limitations: string[];
}
```

#### Usage Examples

**Analyze Technical Problem**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "analyze_systematically",
    arguments: {
      input:
        "How can we improve the performance of our distributed system while maintaining reliability?",
      context: {
        domain: "technology",
        complexity: 0.8,
        urgency: 0.6,
      },
    },
  },
});
```

### 6. `think_parallel` - Parallel Reasoning Tool

Process problems through parallel reasoning streams (analytical, creative, critical, synthetic) with real-time coordination and conflict resolution.

#### Schema

```json
{
  "name": "think_parallel",
  "description": "Process problems through parallel reasoning streams with real-time coordination and conflict resolution",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "The problem or question to process through parallel reasoning"
      },
      "streams": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["analytical", "creative", "critical", "synthetic"]
        },
        "default": ["analytical", "creative", "critical", "synthetic"],
        "description": "Reasoning streams to activate"
      },
      "context": {
        "type": "object",
        "description": "Contextual information for processing",
        "properties": {
          "domain": { "type": "string" },
          "session_id": { "type": "string" },
          "time_limit_ms": { "type": "number" }
        }
      }
    },
    "required": ["input"]
  }
}
```

#### Response Format

```typescript
interface ParallelReasoningResult {
  synthesized_result: SynthesizedThought;
  stream_results: StreamResult[];
  conflicts_resolved: ConflictResolution[];
  processing_time_ms: number;
  confidence: number;
}

interface StreamResult {
  stream_type: "analytical" | "creative" | "critical" | "synthetic";
  content: string;
  confidence: number;
  reasoning_steps: string[];
  unique_insights: string[];
}

interface ConflictResolution {
  conflicting_streams: string[];
  conflict_description: string;
  resolution_strategy: string;
  final_decision: string;
}
```

#### Usage Examples

**Parallel Analysis of Business Problem**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "think_parallel",
    arguments: {
      input:
        "Should we expand our product line to include AI-powered features?",
      streams: ["analytical", "creative", "critical"],
      context: {
        domain: "business",
        session_id: "strategy_session_1",
      },
    },
  },
});
```

### 7. `analyze_memory_usage` - Memory Optimization Tool

Analyze current memory usage patterns and identify optimization opportunities for selective forgetting and memory management.

#### Schema

```json
{
  "name": "analyze_memory_usage",
  "description": "Analyze current memory usage patterns and identify optimization opportunities for selective forgetting and memory management",
  "inputSchema": {
    "type": "object",
    "properties": {
      "analysis_depth": {
        "type": "string",
        "enum": ["shallow", "deep", "comprehensive"],
        "default": "deep",
        "description": "Depth of memory analysis to perform"
      },
      "include_recommendations": {
        "type": "boolean",
        "default": true,
        "description": "Whether to include optimization recommendations"
      },
      "context": {
        "type": "object",
        "description": "Contextual information for analysis",
        "properties": {
          "session_id": { "type": "string" },
          "domain": { "type": "string" },
          "time_range": { "type": "string" }
        }
      }
    }
  }
}
```

#### Response Format

```typescript
interface MemoryUsageAnalysisResult {
  memory_usage: MemoryUsageStats;
  optimization_opportunities: OptimizationOpportunity[];
  recommendations: MemoryRecommendation[];
  analysis_time_ms: number;
}

interface MemoryUsageStats {
  total_memories: number;
  episodic_memories: number;
  semantic_memories: number;
  fragmented_memories: number;
  conflicting_memories: number;
  memory_efficiency: number;
  storage_utilization: number;
}

interface OptimizationOpportunity {
  type: "compress" | "consolidate" | "archive" | "forget";
  target_memories: string[];
  estimated_benefit: {
    memory_space_freed: number;
    processing_speed_improvement: number;
    interference_reduction: number;
    focus_improvement: number;
  };
  risk_level: "low" | "medium" | "high";
  description: string;
  requires_user_consent: boolean;
}

interface MemoryRecommendation {
  category: "storage" | "retrieval" | "consolidation" | "forgetting";
  priority: "low" | "medium" | "high" | "critical";
  action: string;
  expected_impact: string;
  implementation_complexity: "simple" | "moderate" | "complex";
}
```

#### Usage Examples

**Basic Memory Analysis**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "analyze_memory_usage",
    arguments: {
      analysis_depth: "deep",
      include_recommendations: true,
      context: {
        session_id: "session_123",
        domain: "general",
      },
    },
  },
});
```

**Comprehensive Memory Optimization**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "analyze_memory_usage",
    arguments: {
      analysis_depth: "comprehensive",
      include_recommendations: true,
      context: {
        session_id: "long_running_session",
        domain: "research",
        time_range: "last_30_days",
      },
    },
  },
});
```

### 8. `decompose_problem` - Problem Decomposition Tool

Decompose complex problems into hierarchical structures with dependency mapping, priority analysis, and critical path identification using multiple decomposition strategies.

#### Schema

```json
{
  "name": "decompose_problem",
  "description": "Decompose complex problems into hierarchical structures with dependency mapping and priority analysis",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "The complex problem to decompose"
      },
      "strategy": {
        "type": "string",
        "enum": [
          "hierarchical",
          "functional",
          "temporal",
          "stakeholder",
          "risk_based"
        ],
        "default": "hierarchical",
        "description": "Decomposition strategy to use"
      },
      "max_depth": {
        "type": "number",
        "default": 4,
        "minimum": 1,
        "maximum": 8,
        "description": "Maximum decomposition depth"
      },
      "context": {
        "type": "object",
        "description": "Contextual information for decomposition",
        "properties": {
          "domain": { "type": "string" },
          "session_id": { "type": "string" },
          "constraints": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "required": ["input"]
  }
}
```

#### Response Format

```typescript
interface ProblemDecompositionResult {
  root_problem: ProblemNode;
  decomposition_tree: ProblemNode[];
  dependencies: DependencyMapping[];
  critical_path: string[];
  priority_analysis: PriorityAnalysis;
  processing_time_ms: number;
}

interface ProblemNode {
  id: string;
  title: string;
  description: string;
  level: number;
  parent_id?: string;
  children_ids: string[];
  complexity: number;
  estimated_effort: number;
  priority: number;
  risks: string[];
}

interface DependencyMapping {
  from_node_id: string;
  to_node_id: string;
  dependency_type: "prerequisite" | "parallel" | "optional";
  strength: number;
}

interface PriorityAnalysis {
  high_priority_nodes: string[];
  quick_wins: string[];
  bottlenecks: string[];
  recommendations: string[];
}
```

#### Usage Examples

**Decompose Software Development Project**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "decompose_problem",
    arguments: {
      input:
        "Build a scalable e-commerce platform with real-time inventory management",
      strategy: "functional",
      max_depth: 3,
      context: {
        domain: "software_development",
        constraints: [
          "6-month timeline",
          "team of 5 developers",
          "cloud-first architecture",
        ],
      },
    },
  },
});
```

## Systematic Thinking Integration

### Framework Selection

The `analyze_systematically` tool automatically selects the most appropriate thinking framework based on problem characteristics:

- **Scientific Method**: For hypothesis-driven problems requiring empirical validation
- **Design Thinking**: For user-centered problems requiring empathy and iteration
- **Systems Thinking**: For complex interconnected problems with multiple stakeholders
- **Critical Thinking**: For problems requiring careful evaluation of evidence and arguments
- **Creative Problem Solving**: For problems requiring innovative solutions
- **Root Cause Analysis**: For problems requiring identification of underlying causes
- **First Principles**: For problems requiring fundamental understanding
- **Scenario Planning**: For problems involving uncertainty and future planning

### Parallel Processing Benefits

The `think_parallel` tool provides several advantages:

1. **Diverse Perspectives**: Multiple reasoning streams provide different viewpoints
2. **Conflict Resolution**: Automatic identification and resolution of contradictions
3. **Enhanced Creativity**: Creative stream generates novel solutions
4. **Quality Assurance**: Critical stream identifies potential issues
5. **Synthesis**: Synthetic stream combines insights into coherent solutions

### Problem Decomposition Strategies

The `decompose_problem` tool supports multiple decomposition approaches:

- **Hierarchical**: Break down by logical sub-components
- **Functional**: Decompose by required functions or capabilities
- **Temporal**: Break down by time-based phases or stages
- **Stakeholder**: Organize by different stakeholder perspectives
- **Risk-based**: Prioritize by risk levels and mitigation strategies

### Best Practices for Systematic Thinking

1. **Start with Analysis**: Use `analyze_systematically` to understand the problem structure
2. **Apply Parallel Thinking**: Use `think_parallel` for complex decisions requiring multiple perspectives
3. **Decompose When Needed**: Use `decompose_problem` for large, complex problems
4. **Iterate and Refine**: Combine tools iteratively for comprehensive analysis
5. **Document Insights**: Store systematic thinking results in memory for future reference

### Integration with Core Tools

Systematic thinking tools work seamlessly with core cognitive tools:

- **Enhanced Think Tool**: The `think` tool automatically uses systematic thinking for complex analytical problems
- **Memory Integration**: Systematic thinking results are stored and retrieved through memory tools
- **Reasoning Analysis**: Use `analyze_reasoning` to evaluate systematic thinking quality
- **Continuous Learning**: System learns from systematic thinking patterns to improve framework selection

## Probabilistic Reasoning Tools

The following tool implements probabilistic reasoning with Bayesian belief updating and uncertainty quantification for handling uncertain information and making decisions under uncertainty.

### 9. `think_probabilistic` - Probabilistic Reasoning Tool

Process input through probabilistic reasoning with Bayesian belief updating and uncertainty quantification.

#### Schema

```json
{
  "name": "think_probabilistic",
  "description": "Process input through probabilistic reasoning with Bayesian belief updating and uncertainty quantification",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "The input text or question to process with probabilistic reasoning"
      },
      "context": {
        "type": "object",
        "description": "Contextual information for probabilistic processing",
        "properties": {
          "session_id": { "type": "string" },
          "domain": { "type": "string" },
          "urgency": { "type": "number", "minimum": 0, "maximum": 1 },
          "complexity": { "type": "number", "minimum": 0, "maximum": 1 }
        }
      },
      "enable_bayesian_updating": {
        "type": "boolean",
        "default": true,
        "description": "Whether to enable Bayesian belief updating"
      },
      "uncertainty_threshold": {
        "type": "number",
        "minimum": 0,
        "maximum": 1,
        "default": 0.1,
        "description": "Threshold for uncertainty reporting"
      },
      "max_hypotheses": {
        "type": "number",
        "minimum": 1,
        "maximum": 10,
        "default": 3,
        "description": "Maximum number of hypotheses to generate"
      },
      "evidence_weight_threshold": {
        "type": "number",
        "minimum": 0,
        "maximum": 1,
        "default": 0.3,
        "description": "Minimum weight for evidence to be considered"
      }
    },
    "required": ["input"]
  }
}
```

#### Response Format

```typescript
interface ProbabilisticReasoningResult {
  hypotheses: Hypothesis[];
  evidence_analysis: EvidenceAnalysis;
  uncertainty_assessment: UncertaintyAssessment;
  bayesian_updates: BayesianUpdate[];
  confidence: number;
  processing_time_ms: number;
  recommendations: string[];
}

interface Hypothesis {
  id: string;
  description: string;
  prior_probability: number;
  posterior_probability: number;
  evidence_support: number;
  confidence_interval: [number, number];
  supporting_evidence: string[];
  contradicting_evidence: string[];
}

interface EvidenceAnalysis {
  total_evidence_pieces: number;
  strong_evidence: number;
  weak_evidence: number;
  conflicting_evidence: number;
  evidence_quality: number;
  reliability_assessment: number;
}

interface UncertaintyAssessment {
  epistemic_uncertainty: number; // Knowledge uncertainty (0-1)
  aleatoric_uncertainty: number; // Inherent randomness (0-1)
  total_uncertainty: number; // Combined uncertainty (0-1)
  uncertainty_sources: string[];
  confidence_calibration: number;
}

interface BayesianUpdate {
  hypothesis_id: string;
  prior: number;
  likelihood: number;
  posterior: number;
  evidence_description: string;
  update_strength: number;
}
```

#### Usage Examples

**Medical Diagnosis with Uncertainty**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "think_probabilistic",
    arguments: {
      input:
        "Patient presents with fever, cough, and fatigue. What are the most likely diagnoses?",
      context: {
        domain: "medical",
        complexity: 0.7,
      },
      max_hypotheses: 5,
      uncertainty_threshold: 0.05,
    },
  },
});
```

**Investment Decision Under Uncertainty**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "think_probabilistic",
    arguments: {
      input:
        "Should we invest in renewable energy stocks given current market conditions?",
      context: {
        domain: "finance",
        urgency: 0.6,
        complexity: 0.8,
      },
      enable_bayesian_updating: true,
      evidence_weight_threshold: 0.4,
    },
  },
});
```

**Scientific Hypothesis Testing**

```typescript
const result = await client.request({
  method: "tools/call",
  params: {
    name: "think_probabilistic",
    arguments: {
      input:
        "Based on experimental data, what is the probability that our new drug is effective?",
      context: {
        domain: "research",
        complexity: 0.9,
      },
      max_hypotheses: 3,
      uncertainty_threshold: 0.01,
      evidence_weight_threshold: 0.5,
    },
  },
});
```

#### Key Features

**Bayesian Belief Updating**

- Updates probability estimates as new evidence becomes available
- Maintains prior beliefs and incorporates new information systematically
- Provides transparent reasoning about probability changes

**Uncertainty Quantification**

- Distinguishes between epistemic (knowledge) and aleatoric (inherent) uncertainty
- Provides confidence intervals for probability estimates
- Identifies sources of uncertainty for targeted information gathering

**Evidence Analysis**

- Evaluates strength and reliability of evidence
- Identifies conflicting or contradictory information
- Weights evidence based on quality and relevance

**Hypothesis Generation**

- Generates multiple competing hypotheses
- Ranks hypotheses by probability and evidence support
- Provides supporting and contradicting evidence for each hypothesis

#### Best Practices

**When to Use Probabilistic Reasoning**

- Decision making under uncertainty
- Medical diagnosis and risk assessment
- Financial and investment analysis
- Scientific hypothesis testing
- Risk management and safety analysis

**Parameter Tuning**

- Use lower `uncertainty_threshold` for high-stakes decisions
- Increase `max_hypotheses` for complex problems with many possibilities
- Adjust `evidence_weight_threshold` based on evidence quality requirements
- Enable Bayesian updating when dealing with sequential evidence

**Interpreting Results**

- Pay attention to confidence intervals, not just point estimates
- Consider both epistemic and aleatoric uncertainty
- Review evidence quality and potential biases
- Use uncertainty assessment to guide further information gathering
