# ThoughtMCP Examples

This directory contains comprehensive examples demonstrating how to use the ThoughtMCP cognitive architecture server. These examples showcase all four cognitive tools and provide practical implementations for various use cases.

## Quick Start

### Prerequisites

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Build the Project**

   ```bash
   npm run build
   ```

3. **Start the ThoughtMCP Server**
   ```bash
   npm start
   ```

### Running the Examples

#### Basic Demo

Run the comprehensive demonstration of all cognitive tools:

```bash
node examples/cognitive-client.js
```

#### Performance Benchmark

Run performance benchmarks to test system capabilities:

```bash
node examples/cognitive-client.js --benchmark
```

## Example Files

### `cognitive-client.ts`

The main example client that demonstrates:

- **Connection Management**: How to connect to and disconnect from the ThoughtMCP server
- **Cognitive Thinking**: Examples of all processing modes (intuitive, deliberative, creative, analytical)
- **Memory Operations**: Storing and retrieving episodic and semantic memories
- **Reasoning Analysis**: Metacognitive analysis of reasoning processes
- **Performance Benchmarking**: Automated performance testing

### `agentic-usage-examples.md`

Comprehensive guide showing how to use ThoughtMCP in different AI development environments:

- **[Kiro IDE Examples](agentic-usage-examples.md#kiro-ide-examples)** - Code review, learning sessions, project planning
- **[Claude Desktop Examples](agentic-usage-examples.md#claude-desktop-examples)** - Research, creative writing, decision making
- **[Cursor IDE Examples](agentic-usage-examples.md#cursor-ide-examples)** - Architecture decisions, bug investigation, performance optimization
- **[Void Editor Examples](agentic-usage-examples.md#void-editor-examples)** - API design, algorithm selection
- **[Cross-Environment Patterns](agentic-usage-examples.md#cross-environment-patterns)** - Reusable patterns for any environment

## Usage Examples

### 1. Basic Thinking

```typescript
import { ThoughtMCPClient } from "./cognitive-client.js";

const client = new ThoughtMCPClient();
await client.connect();

// Simple intuitive thinking
const result = await client.cognitiveClient.client.request({
  method: "tools/call",
  params: {
    name: "think",
    arguments: {
      input: "What is the capital of France?",
      mode: "intuitive",
    },
  },
});

console.log(result.content.content);
await client.disconnect();
```

### 2. Complex Deliberative Reason

```typescript
// Complex ethical reasoning
const ethicalResult = await client.cognitiveClient.client.request({
  method: "tools/call",
  params: {
    name: "think",
    arguments: {
      input: "Should AI systems have rights? Consider multiple perspectives.",
      mode: "deliberative",
      enable_emotion: true,
      enable_metacognition: true,
      max_depth: 15,
      temperature: 0.6,
    },
  },
});

console.log("Reasoning Path:");
ethicalResult.content.reasoning_path.forEach((step, index) => {
  console.log(
    `${index + 1}. [${step.type}] ${step.content} (confidence: ${
      step.confidence
    })`
  );
});
```

### 3. Creative Problem Solving

```typescript
// Creative brainstorming
const creativeResult = await client.cognitiveClient.client.request({
  method: "tools/call",
  params: {
    name: "think",
    arguments: {
      input: "Design a revolutionary transportation system for Mars colonies",
      mode: "creative",
      temperature: 1.1,
      enable_emotion: true,
      context: {
        domain: "space_engineering",
        complexity: 0.9,
      },
    },
  },
});

console.log("Creative Solution:", creativeResult.content.content);
```

### 4. Memory Storage and Retrieval

```typescript
// Store episodic memory
await client.cognitiveClient.client.request({
  method: "tools/call",
  params: {
    name: "remember",
    arguments: {
      content:
        "Attended a fascinating lecture on quantum computing by Dr. Alice Johnson",
      type: "episodic",
      importance: 0.8,
      emotional_tags: ["curiosity", "excitement", "learning"],
      context: {
        domain: "education",
        session_id: "session_123",
      },
    },
  },
});

// Store semantic knowledge
await client.cognitiveClient.client.request({
  method: "tools/call",
  params: {
    name: "remember",
    arguments: {
      content:
        "Quantum computers use qubits that can exist in superposition states",
      type: "semantic",
      importance: 0.9,
      context: {
        domain: "quantum_physics",
      },
    },
  },
});

// Retrieve related memories
const memories = await client.cognitiveClient.client.request({
  method: "tools/call",
  params: {
    name: "recall",
    arguments: {
      cue: "quantum computing",
      type: "both",
      max_results: 5,
      threshold: 0.4,
    },
  },
});

console.log("Retrieved memories:");
memories.content.memories.forEach((memory) => {
  console.log(
    `- ${memory.content} (similarity: ${memory.similarity.toFixed(3)})`
  );
});
```

### 5. Reasoning Analysis

```typescript
// Analyze logical reasoning
const reasoningSteps = [
  {
    type: "premise",
    content: "All humans need oxygen to survive",
    confidence: 0.95,
  },
  {
    type: "premise",
    content: "Astronauts are humans",
    confidence: 0.98,
  },
  {
    type: "conclusion",
    content: "Therefore, astronauts need oxygen to survive",
    confidence: 0.93,
  },
];

const analysis = await client.cognitiveClient.client.request({
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

console.log("Reasoning Analysis:");
console.log(`Overall Quality: ${analysis.content.overall_quality}`);
console.log(`Coherence Score: ${analysis.content.coherence_score}`);
console.log(`Biases Detected: ${analysis.content.biases.length}`);

if (analysis.content.suggestions.length > 0) {
  console.log("Suggestions:");
  analysis.content.suggestions.forEach((suggestion) => {
    console.log(`- ${suggestion}`);
  });
}
```

## Advanced Usage Patterns

### 1. Contextual Conversations

```typescript
class ContextualCognitiveChat {
  private client: ThoughtMCPClient;
  private sessionId: string;
  private conversationHistory: string[] = [];

  constructor() {
    this.client = new ThoughtMCPClient();
    this.sessionId = `session_${Date.now()}`;
  }

  async initialize() {
    await this.client.connect();
  }

  async chat(message: string): Promise<string> {
    // Store the user message as episodic memory
    await this.client.cognitiveClient.client.request({
      method: "tools/call",
      params: {
        name: "remember",
        arguments: {
          content: `User said: ${message}`,
          type: "episodic",
          importance: 0.6,
          context: {
            session_id: this.sessionId,
            conversation_turn: this.conversationHistory.length,
          },
        },
      },
    });

    // Think with conversation context
    const response = await this.client.cognitiveClient.client.request({
      method: "tools/call",
      params: {
        name: "think",
        arguments: {
          input: message,
          mode: "balanced",
          context: {
            session_id: this.sessionId,
            previous_thoughts: this.conversationHistory.slice(-3), // Last 3 exchanges
          },
        },
      },
    });

    const aiResponse = response.content.content;

    // Store AI response as episodic memory
    await this.client.cognitiveClient.client.request({
      method: "tools/call",
      params: {
        name: "remember",
        arguments: {
          content: `AI responded: ${aiResponse}`,
          type: "episodic",
          importance: 0.5,
          context: {
            session_id: this.sessionId,
            conversation_turn: this.conversationHistory.length,
          },
        },
      },
    });

    this.conversationHistory.push(`User: ${message}`, `AI: ${aiResponse}`);
    return aiResponse;
  }
}

// Usage
const chat = new ContextualCognitiveChat();
await chat.initialize();

console.log(await chat.chat("Hello, I'm interested in learning about AI"));
console.log(await chat.chat("Can you explain neural networks?"));
console.log(
  await chat.chat("How do they relate to what we discussed earlier?")
);
```

### 2. Domain-Specific Expert System

```typescript
class CognitiveExpertSystem {
  private client: ThoughtMCPClient;
  private domain: string;
  private expertiseLevel: number;

  constructor(domain: string, expertiseLevel: number = 0.8) {
    this.client = new ThoughtMCPClient();
    this.domain = domain;
    this.expertiseLevel = expertiseLevel;
  }

  async initialize() {
    await this.client.connect();
    await this.loadDomainKnowledge();
  }

  private async loadDomainKnowledge() {
    // Load domain-specific knowledge into semantic memory
    const knowledgeBase = await this.getDomainKnowledge(this.domain);

    for (const knowledge of knowledgeBase) {
      await this.client.cognitiveClient.client.request({
        method: "tools/call",
        params: {
          name: "remember",
          arguments: {
            content: knowledge.content,
            type: "semantic",
            importance: knowledge.importance,
            context: {
              domain: this.domain,
              expertise_level: this.expertiseLevel,
            },
          },
        },
      });
    }
  }

  async consultExpert(query: string): Promise<ExpertResponse> {
    // Retrieve relevant domain knowledge
    const relevantKnowledge = await this.client.cognitiveClient.client.request({
      method: "tools/call",
      params: {
        name: "recall",
        arguments: {
          cue: query,
          type: "semantic",
          max_results: 10,
          threshold: 0.5,
          context: {
            domain: this.domain,
          },
        },
      },
    });

    // Think with domain expertise
    const expertThought = await this.client.cognitiveClient.client.request({
      method: "tools/call",
      params: {
        name: "think",
        arguments: {
          input: query,
          mode: "analytical",
          enable_metacognition: true,
          context: {
            domain: this.domain,
            expertise_level: this.expertiseLevel,
            previous_thoughts: relevantKnowledge.content.memories.map(
              (m) => m.content
            ),
          },
        },
      },
    });

    // Analyze the reasoning quality
    const analysis = await this.client.cognitiveClient.client.request({
      method: "tools/call",
      params: {
        name: "analyze_reasoning",
        arguments: {
          reasoning_steps: expertThought.content.reasoning_path,
          context: {
            domain: this.domain,
          },
        },
      },
    });

    return {
      answer: expertThought.content.content,
      confidence: expertThought.content.confidence,
      reasoning: expertThought.content.reasoning_path,
      quality_assessment: analysis.content,
      sources: relevantKnowledge.content.memories,
    };
  }
}

// Usage for medical expert system
const medicalExpert = new CognitiveExpertSystem("medicine", 0.9);
await medicalExpert.initialize();

const diagnosis = await medicalExpert.consultExpert(
  "Patient presents with chest pain, shortness of breath, and elevated troponin levels"
);

console.log("Expert Diagnosis:", diagnosis.answer);
console.log("Confidence:", diagnosis.confidence);
console.log("Quality Score:", diagnosis.quality_assessment.overall_quality);
```

### 3. Collaborative Problem Solving

```typescript
class CognitiveProblemSolvingTeam {
  private analysts: CognitiveExpertSystem[];
  private moderator: ThoughtMCPClient;

  constructor(domains: string[]) {
    this.analysts = domains.map((domain) => new CognitiveExpertSystem(domain));
    this.moderator = new ThoughtMCPClient();
  }

  async initialize() {
    await this.moderator.connect();
    await Promise.all(this.analysts.map((analyst) => analyst.initialize()));
  }

  async solveProblem(problem: string): Promise<CollaborativeSolution> {
    // Get perspectives from each domain expert
    const perspectives = await Promise.all(
      this.analysts.map(async (analyst, index) => {
        const response = await analyst.consultExpert(problem);
        return {
          domain: analyst.domain,
          perspective: response.answer,
          confidence: response.confidence,
          reasoning: response.reasoning,
        };
      })
    );

    // Synthesize perspectives with the moderator
    const synthesis = await this.moderator.cognitiveClient.client.request({
      method: "tools/call",
      params: {
        name: "think",
        arguments: {
          input: `Synthesize these expert perspectives on: ${problem}\n\n${perspectives
            .map((p) => `${p.domain}: ${p.perspective}`)
            .join("\n\n")}`,
          mode: "deliberative",
          enable_metacognition: true,
          max_depth: 20,
        },
      },
    });

    // Analyze the synthesis quality
    const analysis = await this.moderator.cognitiveClient.client.request({
      method: "tools/call",
      params: {
        name: "analyze_reasoning",
        arguments: {
          reasoning_steps: synthesis.content.reasoning_path,
        },
      },
    });

    return {
      problem,
      individual_perspectives: perspectives,
      synthesized_solution: synthesis.content.content,
      synthesis_confidence: synthesis.content.confidence,
      quality_assessment: analysis.content,
      consensus_level: this.calculateConsensus(perspectives),
    };
  }

  private calculateConsensus(perspectives: any[]): number {
    // Simple consensus calculation based on confidence alignment
    const avgConfidence =
      perspectives.reduce((sum, p) => sum + p.confidence, 0) /
      perspectives.length;
    const confidenceVariance =
      perspectives.reduce(
        (sum, p) => sum + Math.pow(p.confidence - avgConfidence, 2),
        0
      ) / perspectives.length;

    return Math.max(0, 1 - confidenceVariance);
  }
}

// Usage for interdisciplinary problem solving
const team = new CognitiveProblemSolvingTeam([
  "environmental_science",
  "economics",
  "technology",
  "policy",
]);

await team.initialize();

const solution = await team.solveProblem(
  "How can we reduce carbon emissions while maintaining economic growth?"
);

console.log("Collaborative Solution:", solution.synthesized_solution);
console.log("Consensus Level:", solution.consensus_level);
```

## Performance Testing

The examples include comprehensive performance testing capabilities:

### Latency Testing

```bash
# Test response times across different modes
node examples/cognitive-client.js --benchmark --test=latency
```

### Throughput Testing

```bash
# Test concurrent request handling
node examples/cognitive-client.js --benchmark --test=throughput
```

### Memory Performance Testing

```bash
# Test memory storage and retrieval performance
node examples/cognitive-client.js --benchmark --test=memory
```

### Quality Assessment Testing

```bash
# Test reasoning quality and bias detection
node examples/cognitive-client.js --benchmark --test=quality
```

## Configuration Examples

### High-Performance Configuration

```typescript
const highPerformanceConfig = {
  mode: "intuitive",
  max_depth: 6,
  temperature: 0.4,
  enable_emotion: false,
  enable_metacognition: false,
  timeout: 5000,
};
```

### High-Quality Configuration

```typescript
const highQualityConfig = {
  mode: "deliberative",
  max_depth: 15,
  temperature: 0.7,
  enable_emotion: true,
  enable_metacognition: true,
  timeout: 30000,
};
```

### Creative Configuration

```typescript
const creativeConfig = {
  mode: "creative",
  max_depth: 12,
  temperature: 1.2,
  enable_emotion: true,
  enable_metacognition: true,
  timeout: 20000,
};
```

## Error Handling Examples

```typescript
class RobustCognitiveClient {
  private client: ThoughtMCPClient;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  async thinkWithRetry(input: string, options: any = {}): Promise<any> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.client.cognitiveClient.client.request({
          method: "tools/call",
          params: {
            name: "think",
            arguments: { input, ...options },
          },
        });
      } catch (error) {
        console.warn(`Attempt ${attempt} failed:`, error.message);

        if (attempt === this.maxRetries) {
          throw new Error(
            `Failed after ${this.maxRetries} attempts: ${error.message}`
          );
        }

        // Exponential backoff
        await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

## Integration Examples

### Express.js API Integration

```typescript
import express from "express";
import { ThoughtMCPClient } from "./cognitive-client.js";

const app = express();
const cognitiveClient = new ThoughtMCPClient();

app.use(express.json());

app.post("/api/think", async (req, res) => {
  try {
    const { input, mode = "balanced", ...options } = req.body;

    const result = await cognitiveClient.cognitiveClient.client.request({
      method: "tools/call",
      params: {
        name: "think",
        arguments: { input, mode, ...options },
      },
    });

    res.json(result.content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, async () => {
  await cognitiveClient.connect();
  console.log("Cognitive API server running on port 3000");
});
```

### WebSocket Real-time Integration

```typescript
import WebSocket from "ws";
import { ThoughtMCPClient } from "./cognitive-client.js";

const wss = new WebSocket.Server({ port: 8080 });
const cognitiveClient = new ThoughtMCPClient();

wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
    try {
      const request = JSON.parse(message.toString());

      const result = await cognitiveClient.cognitiveClient.client.request({
        method: "tools/call",
        params: {
          name: request.tool,
          arguments: request.arguments,
        },
      });

      ws.send(
        JSON.stringify({
          id: request.id,
          result: result.content,
        })
      );
    } catch (error) {
      ws.send(
        JSON.stringify({
          id: request.id,
          error: error.message,
        })
      );
    }
  });
});

cognitiveClient.connect().then(() => {
  console.log("Cognitive WebSocket server running on port 8080");
});
```

## Best Practices

1. **Connection Management**: Always properly connect and disconnect from the server
2. **Error Handling**: Implement retry logic and graceful error handling
3. **Memory Management**: Use appropriate importance scores and context for memories
4. **Performance Optimization**: Choose the right processing mode for your use case
5. **Quality Assurance**: Use reasoning analysis to validate important decisions
6. **Context Utilization**: Provide relevant context for better reasoning quality

## Troubleshooting

### Common Issues

1. **Connection Timeout**: Increase timeout values or check server status
2. **High Latency**: Use faster processing modes or reduce max_depth
3. **Memory Not Persisting**: Check importance scores and consolidation settings
4. **Low Quality Responses**: Enable metacognition and use deliberative mode

### Debug Mode

Enable debug logging for detailed information:

```typescript
const debugConfig = {
  logging: {
    level: "DEBUG",
    component_timing: true,
    reasoning_steps: true,
  },
};
```

This comprehensive example suite provides everything needed to understand and effectively use the ThoughtMCP cognitive architecture in real-world applications.
