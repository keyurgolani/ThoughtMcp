# Simple Question Answering

**Time**: 5 minutes
**Difficulty**: Beginner
**Tools Used**: `think`

## The Scenario

You want to ask ThoughtMCP a question and get a thoughtful response. This is the most basic use case - like having a conversation with a knowledgeable advisor.

## Basic Usage

### Simple Question

**Tool Call:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "What are the key factors to consider when choosing a programming language for a new project?"
  }
}
```

**What Happens:**

- ThoughtMCP analyzes the question
- Uses balanced thinking (default mode)
- Considers multiple perspectives
- Provides structured reasoning

**Expected Response Structure:**

```json
{
  "content": {
    "reasoning_path": [
      {
        "step": "problem_analysis",
        "content": "This is a decision-making question requiring systematic evaluation..."
      },
      {
        "step": "factor_identification",
        "content": "Key factors include: team expertise, project requirements, ecosystem..."
      }
    ],
    "conclusion": "Choose based on team skills, project needs, and long-term maintenance...",
    "confidence": 0.75
  }
}
```

## Different Thinking Modes

### Intuitive Mode (Fast)

**Tool Call:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "What are the key factors to consider when choosing a programming language for a new project?",
    "mode": "intuitive"
  }
}
```

**What's Different:**

- Faster response
- More gut-reaction based
- Good for familiar topics
- Less detailed analysis

**When to Use:**

- Quick decisions
- Familiar problems
- Time pressure
- Initial brainstorming

### Deliberative Mode (Careful)

**Tool Call:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "What are the key factors to consider when choosing a programming language for a new project?",
    "mode": "deliberative"
  }
}
```

**What's Different:**

- Slower, more thorough
- Step-by-step analysis
- Considers more factors
- Higher confidence in complex scenarios

**When to Use:**

- Important decisions
- Complex problems
- Unfamiliar territory
- High-stakes situations

### Creative Mode (Innovative)

**Tool Call:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "What are the key factors to consider when choosing a programming language for a new project?",
    "mode": "creative"
  }
}
```

**What's Different:**

- Emphasizes novel connections
- Considers unconventional approaches
- More exploratory thinking
- Good for innovation

**When to Use:**

- Brainstorming
- Innovation challenges
- Breaking conventional thinking
- Exploring new possibilities

### Analytical Mode (Logical)

**Tool Call:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "What are the key factors to consider when choosing a programming language for a new project?",
    "mode": "analytical"
  }
}
```

**What's Different:**

- Emphasizes logical reasoning
- Systematic evaluation
- Data-driven approach
- Structured analysis

**When to Use:**

- Technical problems
- Data analysis
- Systematic evaluation
- Logical reasoning tasks

## Adding Context and Preferences

### With Emotional Processing

**Tool Call:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "I'm stressed about choosing the right programming language for my startup. What should I consider?",
    "mode": "balanced",
    "enable_emotion": true
  }
}
```

**What's Different:**

- Recognizes emotional context (stress)
- Considers psychological factors
- More empathetic response
- Addresses emotional concerns

### With Self-Monitoring

**Tool Call:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "What are the key factors to consider when choosing a programming language for a new project?",
    "mode": "deliberative",
    "enable_metacognition": true
  }
}
```

**What's Different:**

- Monitors its own reasoning quality
- Identifies potential biases
- Suggests reasoning improvements
- Higher quality assurance

### With Context

**Tool Call:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "What programming language should I choose for my e-commerce startup with a team of 3 junior developers and a 6-month timeline?",
    "mode": "deliberative",
    "context": {
      "domain": "e-commerce",
      "team_size": 3,
      "experience_level": "junior",
      "timeline": "6 months",
      "urgency": 0.8
    }
  }
}
```

**What's Different:**

- Tailored to specific situation
- Considers all contextual factors
- More relevant recommendations
- Personalized advice

## Understanding the Response

### Response Components

**Reasoning Path:**

- Shows step-by-step thinking
- Explains the logic used
- Identifies key decision points

**Confidence Level:**

- 0.0 to 1.0 scale
- Higher = more certain
- Helps you assess reliability

**Emotional Context:**

- Emotional tone detected
- Emotional factors considered
- Empathetic elements

**Metacognitive Assessment:**

- Quality of reasoning
- Potential biases identified
- Suggestions for improvement

### Interpreting Confidence

- **0.9-1.0**: Very confident, well-established knowledge
- **0.7-0.9**: Confident, good reasoning with some uncertainty
- **0.5-0.7**: Moderate confidence, reasonable but could be improved
- **0.3-0.5**: Low confidence, significant uncertainty
- **0.0-0.3**: Very uncertain, speculative response

## Try It Yourself

### Experiment 1: Mode Comparison

Try the same question with different modes and compare:

- How do response times differ?
- Which mode gives more detailed answers?
- When would you use each mode?

### Experiment 2: Context Effects

Try these variations:

```json
// Without context
{
  "tool": "think",
  "arguments": {
    "input": "Should I learn Python or JavaScript?"
  }
}

// With context
{
  "tool": "think",
  "arguments": {
    "input": "Should I learn Python or JavaScript?",
    "context": {
      "goal": "web development",
      "experience": "beginner",
      "timeline": "3 months"
    }
  }
}
```

### Experiment 3: Emotional Processing

Compare responses with and without emotional processing:

```json
// Standard
{
  "tool": "think",
  "arguments": {
    "input": "I'm worried about making the wrong technology choice for my project"
  }
}

// With emotion
{
  "tool": "think",
  "arguments": {
    "input": "I'm worried about making the wrong technology choice for my project",
    "enable_emotion": true
  }
}
```

## Key Takeaways

### What Makes This Better Than Standard AI?

**Standard AI:**

- Single-pass processing
- Same response every time
- No reasoning transparency
- No confidence assessment

**ThoughtMCP:**

- Multiple thinking modes
- Reasoning path shown
- Confidence levels provided
- Self-monitoring capability

### When to Use Each Mode

- **Intuitive**: Quick decisions, familiar problems
- **Deliberative**: Important decisions, complex problems
- **Balanced**: General use, mixed scenarios
- **Creative**: Innovation, brainstorming
- **Analytical**: Technical problems, data analysis

### Best Practices

1. **Start with balanced mode** for general questions
2. **Use context** to get more relevant answers
3. **Enable emotion** for personal or sensitive topics
4. **Enable metacognition** for important decisions
5. **Pay attention to confidence** levels

## Next Steps

- **[Building Knowledge](building-knowledge.md)** - Learn to use memory tools
- **[Quality Checking](quality-checking.md)** - Improve reasoning quality
- **[Complete Workflow](complete-workflow.md)** - Use all tools together
- **[Real-World Examples](../real-world/)** - See complex applications

---

_Ready for the next step? Learn about [Building Knowledge](building-knowledge.md) with memory tools._
