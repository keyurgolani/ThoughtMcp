# Basic Concepts

This guide explains the core concepts behind ThoughtMCP in simple terms. No cognitive science background required!

## The Big Picture

Think of ThoughtMCP as upgrading an AI from a simple calculator to a thoughtful advisor. Instead of just processing text once, it thinks about problems the way humans do.

## How Human Thinking Works (Simplified)

To understand ThoughtMCP, it helps to know how human thinking works:

### 1. We Have Two Thinking Systems

**System 1 (Fast Thinking)**

- Automatic and intuitive
- Like recognizing a friend's face instantly
- Good for familiar situations
- Can make mistakes with complex problems

**System 2 (Slow Thinking)**

- Deliberate and careful
- Like solving a math problem step-by-step
- Good for complex decisions
- Takes more time and energy

**ThoughtMCP Example:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "Should I buy this stock?",
    "mode": "intuitive" // Uses System 1 - fast gut reaction
  }
}
```

```json
{
  "tool": "think",
  "arguments": {
    "input": "Should I buy this stock?",
    "mode": "deliberative" // Uses System 2 - careful analysis
  }
}
```

### 2. We Learn from Experience

Humans have two types of memory:

**Episodic Memory** - Specific experiences

- "Last Tuesday, I had a great meeting with the client"
- "The last time I tried this approach, it failed"

**Semantic Memory** - General knowledge

- "Meetings work better when prepared"
- "This type of approach usually fails because..."

**ThoughtMCP Example:**

```json
{
  "tool": "remember",
  "arguments": {
    "content": "Yesterday's client meeting went well because I prepared an agenda",
    "type": "episodic" // Specific experience
  }
}
```

```json
{
  "tool": "remember",
  "arguments": {
    "content": "Client meetings are more effective with prepared agendas",
    "type": "semantic" // General principle
  }
}
```

### 3. We Check Our Own Thinking

Humans naturally monitor their own reasoning:

- "Am I being biased here?"
- "Did I consider all the options?"
- "How confident am I in this conclusion?"

**ThoughtMCP Example:**

```json
{
  "tool": "analyze_reasoning",
  "arguments": {
    "reasoning_steps": [
      {
        "type": "assumption",
        "content": "The market will continue growing",
        "confidence": 0.6
      }
    ]
  }
}
```

## The Four ThoughtMCP Tools

### 🧠 Think Tool

**What it does:** Processes questions using human-like reasoning

**Think of it like:** Having a thoughtful advisor who can switch between quick intuition and careful analysis

**Modes:**

- `intuitive` - Fast, gut-reaction responses
- `deliberative` - Slow, careful analysis
- `balanced` - Mix of both (default)
- `creative` - Emphasizes novel connections
- `analytical` - Emphasizes logical reasoning

**Example:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "My team is struggling with deadlines. What should I do?",
    "mode": "deliberative",
    "enable_emotion": true,
    "enable_metacognition": true
  }
}
```

**Response includes:**

- Systematic analysis of the problem
- Multiple perspectives considered
- Confidence level in the reasoning
- Suggestions for improvement

### 💾 Remember Tool

**What it does:** Stores experiences and knowledge for future use

**Think of it like:** Writing in a smart journal that organizes information automatically

**Types:**

- `episodic` - Specific experiences and events
- `semantic` - General knowledge and principles

**Example:**

```json
{
  "tool": "remember",
  "arguments": {
    "content": "Team productivity improved 30% after implementing daily standups",
    "type": "episodic",
    "importance": 0.8,
    "emotional_tags": ["success", "teamwork"]
  }
}
```

**What happens:**

- Information is stored with context
- Emotional significance is noted
- Importance level affects how long it's remembered
- Can be recalled later when relevant

### 🔍 Recall Tool

**What it does:** Finds relevant past experiences and knowledge

**Think of it like:** Having a research assistant who instantly finds relevant information from your past

**Example:**

```json
{
  "tool": "recall",
  "arguments": {
    "cue": "team productivity deadlines",
    "type": "both",
    "max_results": 10
  }
}
```

**Response includes:**

- Relevant past experiences
- General knowledge that applies
- Similarity scores showing relevance
- Context from when information was stored

### 🔬 Analyze Reasoning Tool

**What it does:** Checks thinking quality and identifies potential problems

**Think of it like:** Having a quality control expert review your reasoning

**Example:**

```json
{
  "tool": "analyze_reasoning",
  "arguments": {
    "reasoning_steps": [
      {
        "type": "causal_inference",
        "content": "Poor communication causes missed deadlines",
        "confidence": 0.7,
        "alternatives": ["Resource constraints", "Unclear requirements"]
      }
    ]
  }
}
```

**Response includes:**

- Quality assessment of each reasoning step
- Potential biases identified
- Suggestions for improvement
- Overall coherence score

## How the Tools Work Together

The real power comes from using the tools together:

### Example: Making a Business Decision

1. **Think** about the decision systematically
2. **Recall** relevant past experiences and knowledge
3. **Remember** the current situation for future reference
4. **Analyze** the reasoning quality before finalizing

```json
// Step 1: Initial thinking
{
  "tool": "think",
  "arguments": {
    "input": "Should we hire two junior developers or one senior developer?",
    "mode": "deliberative"
  }
}

// Step 2: Recall relevant experience
{
  "tool": "recall",
  "arguments": {
    "cue": "hiring decisions junior senior developers team productivity"
  }
}

// Step 3: Final analysis with recalled information
{
  "tool": "think",
  "arguments": {
    "input": "Based on past experience with hiring, should we hire two junior developers or one senior developer?",
    "mode": "analytical"
  }
}

// Step 4: Quality check the reasoning
{
  "tool": "analyze_reasoning",
  "arguments": {
    "reasoning_steps": [/* reasoning steps from previous think calls */]
  }
}

// Step 5: Remember the decision for future reference
{
  "tool": "remember",
  "arguments": {
    "content": "Decided to hire one senior developer because mentorship capacity was limited",
    "type": "episodic",
    "importance": 0.7
  }
}
```

## Key Benefits

### 1. Better Decision Making

- Considers multiple perspectives
- Learns from past experience
- Checks for reasoning errors
- Provides confidence levels

### 2. Continuous Learning

- Builds knowledge over time
- Remembers what works and what doesn't
- Applies lessons to new situations
- Gets smarter with use

### 3. Transparency

- Shows its reasoning process
- Explains confidence levels
- Identifies potential biases
- Suggests improvements

### 4. Adaptability

- Different thinking modes for different situations
- Configurable behavior
- Learns your preferences
- Adjusts to your domain

## Common Patterns

### Pattern 1: Problem Solving

1. Think about the problem
2. Recall similar past problems
3. Think again with additional context
4. Analyze the reasoning quality

### Pattern 2: Learning from Experience

1. Remember important experiences
2. Store general principles learned
3. Recall when facing similar situations
4. Build expertise over time

### Pattern 3: Decision Making

1. Think through options systematically
2. Recall relevant past decisions
3. Analyze reasoning for biases
4. Remember the decision and outcome

## What Makes This Different?

### Traditional AI

- Processes text once
- No memory between interactions
- No self-awareness
- Same response every time

### ThoughtMCP

- Multiple thinking processes
- Learns from experience
- Monitors its own reasoning
- Gets better over time

## Next Steps

Now that you understand the concepts:

- **[Try Examples](../examples/)** - See these concepts in action
- **[Configuration](../guides/configuration.md)** - Customize the behavior
- **[Integration](../guides/integration.md)** - Add to your applications
- **[Architecture](../architecture/)** - Understand the technical details

---

_Ready to see these concepts in action? Check out our [Examples](../examples/) section._
