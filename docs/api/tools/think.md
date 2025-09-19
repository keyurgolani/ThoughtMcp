# Think Tool

The `think` tool processes input through human-like cognitive architecture, providing systematic reasoning with multiple processing modes.

## Overview

The think tool is the core of ThoughtMCP's cognitive capabilities. It mimics human thinking by using dual-process theory, emotional processing, and metacognitive monitoring to provide thoughtful, well-reasoned responses.

## Request Format

```typescript
interface ThinkRequest {
  input: string; // Required: The question or problem to think about
  mode?: ProcessingMode; // Optional: How to process the input
  context?: Context; // Optional: Additional context information
  enable_emotion?: boolean; // Optional: Enable emotional processing
  enable_metacogtion?: boolean; // Optional: Enable self-monitoring
  max_depth?: number; // Optional: Maximum reasoning depth
  temperature?: number; // Optional: Randomness in processing
}

type ProcessingMode =
  | "intuitive"
  | "deliberative"
  | "balanced"
  | "creative"
  | "analytical";
```

## Parameters

### Required Parameters

#### `input` (string)

The question, problem, or topic you want ThoughtMCP to think about.

**Examples:**

```json
"What are the pros and cons of remote work?"
"How should I approach this technical problem?"
"I need to make a difficult decision about my career"
```

### Optional Parameters

#### `mode` (ProcessingMode)

Controls how the input is processed. Default: `"balanced"`

| Mode           | Description                               | Use Cases                             | Response Time |
| -------------- | ----------------------------------------- | ------------------------------------- | ------------- |
| `intuitive`    | Fast, pattern-based processing (System 1) | Quick decisions, familiar problems    | 50-200ms      |
| `deliberative` | Slow, careful reasoning (System 2)        | Complex decisions, important problems | 200-1000ms    |
| `balanced`     | Mix of intuitive and deliberative         | General use, most scenarios           | 100-500ms     |
| `creative`     | Emphasizes novel connections              | Brainstorming, innovation             | 200-800ms     |
| `analytical`   | Emphasizes logical reasoning              | Technical problems, analysis          | 150-600ms     |

**Example:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "Should I invest in cryptocurrency?",
    "mode": "deliberative"
  }
}
```

#### `context` (Context)

Additional information to inform the thinking process.

```typescript
interface Context {
  domain?: string; // Subject area (e.g., "finance", "technology")
  urgency?: number; // 0-1 scale, affects processing speed
  complexity?: number; // 0-1 scale, affects depth
  session_id?: string; // Session identifier for memory
  previous_thoughts?: string[]; // Related previous thoughts
  [key: string]: any; // Additional context fields
}
```

**Example:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "Should I invest in cryptocurrency?",
    "context": {
      "domain": "personal_finance",
      "urgency": 0.3,
      "complexity": 0.8,
      "risk_tolerance": "moderate",
      "investment_experience": "beginner"
    }
  }
}
```

#### `enable_emotion` (boolean)

Whether to include emotional processing in the reasoning. Default: `true`

When enabled:

- Recognizes emotional content in the input
- Considers emotional factors in reasoning
- Provides more empathetic responses
- Uses somatic markers for decision-making

**Example:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "I'm stressed about this decision and don't know what to do",
    "enable_emotion": true
  }
}
```

#### `enable_metacognition` (boolean)

Whether to include self-monitoring of the reasoning process. Default: `true`

When enabled:

- Monitors reasoning quality
- Identifies potential biases
- Suggests improvements
- Provides confidence assessments

**Example:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "What's the best programming language?",
    "enable_metacognition": true
  }
}
```

#### `max_depth` (number)

Maximum depth of reasoning steps. Range: 1-20, Default: 10

Higher values:

- More thorough analysis
- Longer processing time
- Better quality for complex problems

Lower values:

- Faster responses
- Less detailed analysis
- Good for simple problems

**Example:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "Complex strategic business decision",
    "max_depth": 15
  }
}
```

#### `temperature` (number)

Controls randomness in processing. Range: 0-2, Default: 0.7

- **0.0-0.3**: Very focused, deterministic
- **0.3-0.7**: Balanced creativity and focus
- **0.7-1.2**: More creative and exploratory
- **1.2-2.0**: Highly creative, less focused

**Example:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "Creative solutions for team communication",
    "temperature": 1.2
  }
}
```

## Response Format

```typescript
interface ThinkResponse {
  content: {
    reasoning_path: ReasoningStep[]; // Step-by-step thinking process
    conclusion: string; // Final conclusion or answer
    confidence: number; // 0-1 confidence in the reasoning
    emotional_context?: EmotionalState; // Emotional factors (if enabled)
    metacognitive_assessment?: MetaAssessment; // Quality assessment (if enabled)
    alternatives?: Alternative[]; // Alternative perspectives considered
  };
  metadata: ResponseMetadata;
}

interface ReasoningStep {
  step: string; // Step identifier
  type: string; // Type of reasoning used
  content: string; // Step content
  confidence: number; // Confidence in this step
  duration_ms?: number; // Time spent on this step
}
```

## Response Components

### Reasoning Path

Shows the step-by-step thinking process:

```json
{
  "reasoning_path": [
    {
      "step": "problem_analysis",
      "type": "analytical",
      "content": "This is a decision-making problem requiring evaluation of multiple factors...",
      "confidence": 0.8
    },
    {
      "step": "factor_identification",
      "type": "systematic",
      "content": "Key factors include: risk tolerance, time horizon, market volatility...",
      "confidence": 0.9
    }
  ]
}
```

### Confidence Levels

Interpretation guide:

- **0.9-1.0**: Very confident, well-established reasoning
- **0.7-0.9**: Confident, good reasoning with minor uncertainty
- **0.5-0.7**: Moderate confidence, reasonable but improvable
- **0.3-0.5**: Low confidence, significant uncertainty
- **0.0-0.3**: Very uncertain, speculative

### Emotional Context (if enabled)

```json
{
  "emotional_context": {
    "detected_emotions": ["anxiety", "uncertainty"],
    "emotional_intensity": 0.6,
    "somatic_markers": {
      "positive": 0.3,
      "negative": 0.7
    },
    "emotional_factors": ["fear of loss", "desire for security"]
  }
}
```

### Metacognitive Assessment (if enabled)

```json
{
  "metacognitive_assessment": {
    "reasoning_quality": 0.8,
    "potential_biases": ["confirmation bias", "availability heuristic"],
    "suggestions": ["Consider opposing viewpoints", "Seek additional data"],
    "coherence_score": 0.85
  }
}
```

## Usage Examples

### Basic Question

```json
{
  "tool": "think",
  "arguments": {
    "input": "What are the benefits of exercise?"
  }
}
```

### Complex Decision Making

```json
{
  "tool": "think",
  "arguments": {
    "input": "I'm considering leaving my job to start a business. I have $50k saved, a stable income of $80k/year, and a family to support. The business idea is in a competitive market but I'm passionate about it.",
    "mode": "deliberative",
    "enable_emotion": true,
    "enable_metacognition": true,
    "context": {
      "domain": "career_decision",
      "urgency": 0.4,
      "complexity": 0.9,
      "family_size": 3,
      "risk_tolerance": "moderate"
    }
  }
}
```

### Creative Problem Solving

```json
{
  "tool": "think",
  "arguments": {
    "input": "How can we make our team meetings more engaging and productive?",
    "mode": "creative",
    "temperature": 1.0,
    "context": {
      "domain": "team_management",
      "team_size": 8,
      "meeting_frequency": "weekly",
      "current_issues": ["low participation", "too long", "not actionable"]
    }
  }
}
```

### Quick Intuitive Response

```json
{
  "tool": "think",
  "arguments": {
    "input": "Should I take an umbrella today?",
    "mode": "intuitive",
    "enable_metacognition": false,
    "context": {
      "weather": "cloudy",
      "forecast": "30% chance of rain"
    }
  }
}
```

## Error Handling

### Common Errors

#### Invalid Input

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Input parameter is required",
    "details": {
      "parameter": "input",
      "expected_type": "string"
    }
  }
}
```

#### Invalid Mode

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid processing mode",
    "details": {
      "parameter": "mode",
      "provided": "invalid_mode",
      "valid_options": [
        "intuitive",
        "deliberative",
        "balanced",
        "creative",
        "analytical"
      ]
    }
  }
}
```

#### Processing Timeout

```json
{
  "error": {
    "code": "TIMEOUT",
    "message": "Processing timeout exceeded",
    "details": {
      "timeout_ms": 30000,
      "suggestion": "Try reducing max_depth or using intuitive mode"
    }
  }
}
```

## Performance Optimization

### For Speed

```json
{
  "mode": "intuitive",
  "enable_metacognition": false,
  "max_depth": 5,
  "temperature": 0.3
}
```

### For Quality

```json
{
  "mode": "deliberative",
  "enable_metacognition": true,
  "max_depth": 15,
  "temperature": 0.7
}
```

### For Creativity

```json
{
  "mode": "creative",
  "temperature": 1.2,
  "max_depth": 12
}
```

## Best Practices

### Choosing the Right Mode

**Use `intuitive` when:**

- You need quick responses
- The problem is familiar
- Time is limited
- Initial brainstorming

**Use `deliberative` when:**

- The decision is important
- The problem is complex
- You need thorough analysis
- High stakes situations

**Use `balanced` when:**

- General purpose use
- Mixed complexity
- Unsure which mode to use
- Most common scenarios

**Use `creative` when:**

- Brainstorming solutions
- Innovation challenges
- Breaking conventional thinking
- Exploring possibilities

**Use `analytical` when:**

- Technical problems
- Data analysis
- Logical reasoning
- Systematic evaluation

### Context Guidelines

**Always include context for:**

- Domain-specific questions
- Personal decisions
- Complex scenarios
- Time-sensitive issues

**Useful context fields:**

- `domain`: Subject area
- `urgency`: Time pressure
- `complexity`: Problem difficulty
- `constraints`: Limitations
- `goals`: Desired outcomes

### Temperature Guidelines

- **Low (0.0-0.3)**: Factual questions, technical problems
- **Medium (0.3-0.7)**: General questions, balanced exploration
- **High (0.7-1.2)**: Creative tasks, brainstorming
- **Very High (1.2-2.0)**: Highly creative, experimental

## Integration Patterns

### Sequential Thinking

```javascript
// First, get initial thoughts
const initialThought = await think({
  input: "Should I change careers?",
  mode: "intuitive",
});

// Then, deliberate more carefully
const detailedThought = await think({
  input:
    "Should I change careers? Initial thoughts: " + initialThought.conclusion,
  mode: "deliberative",
  enable_metacognition: true,
});
```

### Context Building

```javascript
// Build context over multiple interactions
let context = { domain: "career_planning" };

const thought1 = await think({
  input: "What factors should I consider for career change?",
  context: context,
});

// Add to context
context.factors = thought1.content.conclusion;

const thought2 = await think({
  input: "How do I evaluate these factors for my situation?",
  context: context,
});
```

---

_Next: Learn about the [remember tool](remember.md) for building knowledge over time._
