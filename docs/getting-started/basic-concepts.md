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

## The Seven ThoughtMCP Tools

### Core Cognitive Tools

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

### Advanced Systematic Thinking Tools

### 🎯 Analyze Systematically Tool

**What it does:** Applies proven thinking frameworks automatically to solve problems

**Think of it like:** Having access to a library of expert problem-solving methods that are automatically selected based on your problem type

**Frameworks available:**

- Design Thinking for user-centered problems
- Scientific Method for hypothesis-driven analysis
- Root Cause Analysis for troubleshooting
- Systems Thinking for complex interconnected issues
- And more...

**Example:**

```json
{
  "tool": "analyze_systematically",
  "arguments": {
    "input": "How can we reduce customer churn in our SaaS product?",
    "mode": "auto"
  }
}
```

**Response includes:**

- Automatically selected framework (e.g., Design Thinking)
- Step-by-step analysis using that framework
- Alternative approaches considered
- Structured recommendations

### 🔀 Think Parallel Tool

**What it does:** Processes problems through multiple reasoning streams simultaneously

**Think of it like:** Having a team of experts (analytical, creative, critical, synthetic) all working on your problem at the same time, then combining their insights

**Reasoning streams:**

- **Analytical**: Logic and evidence-based reasoning
- **Creative**: Innovative and unconventional approaches
- **Critical**: Bias detection and assumption challenging
- **Synthetic**: Integration and holistic perspective

**Example:**

```json
{
  "tool": "think_parallel",
  "arguments": {
    "input": "Should we pivot our business model to subscription-based?",
    "enable_coordination": true
  }
}
```

**Response includes:**

- Insights from each reasoning stream
- Conflicts identified and resolved
- Synthesized conclusion combining all perspectives
- Confidence levels for each stream

### 🧩 Decompose Problem Tool

**What it does:** Breaks complex problems into manageable, prioritized components

**Think of it like:** Having a project manager who takes your big, overwhelming problem and creates a clear action plan with priorities and dependencies

**Decomposition strategies:**

- **Hierarchical**: Break down by logical sub-components
- **Functional**: Organize by required capabilities
- **Temporal**: Structure by time-based phases
- **Stakeholder**: Group by different perspectives

**Example:**

```json
{
  "tool": "decompose_problem",
  "arguments": {
    "input": "Launch a new AI-powered mobile app in 6 months",
    "max_depth": 3,
    "strategies": ["functional", "temporal"]
  }
}
```

**Response includes:**

- Hierarchical breakdown of the problem
- Dependencies between components
- Priority ranking of sub-problems
- Critical path analysis
- Resource requirements

## How the Tools Work Together

The real power comes from using the tools together:

### Example: Solving a Complex Business Problem

Let's say you need to "Improve customer retention for our SaaS product." Here's how you might use all the tools together:

```json
// Step 1: Break down the complex problem
{
  "tool": "decompose_problem",
  "arguments": {
    "input": "Improve customer retention for our SaaS product",
    "strategy": "functional",
    "max_depth": 3
  }
}
// Result: Problem broken into sub-components like "Analyze churn reasons", "Improve onboarding", "Enhance product value"

// Step 2: Apply systematic thinking to the main problem
{
  "tool": "analyze_systematically",
  "arguments": {
    "input": "Improve customer retention for our SaaS product",
    "mode": "auto"
  }
}
// Result: System selects Design Thinking framework, provides structured analysis

// Step 3: Get multiple perspectives through parallel reasoning
{
  "tool": "think_parallel",
  "arguments": {
    "input": "What are the most effective strategies to improve SaaS customer retention?",
    "enable_coordination": true
  }
}
// Result: Analytical, creative, critical, and synthetic perspectives combined

// Step 4: Recall relevant past experience
{
  "tool": "recall",
  "arguments": {
    "cue": "customer retention SaaS churn strategies"
  }
}
// Result: Past experiences and knowledge about retention strategies

// Step 5: Final integrated thinking with all context
{
  "tool": "think",
  "arguments": {
    "input": "Based on the systematic analysis, parallel reasoning, and past experience, what's our best retention strategy?",
    "mode": "deliberative"
  }
}

// Step 6: Quality check the reasoning
{
  "tool": "analyze_reasoning",
  "arguments": {
    "reasoning_steps": [/* reasoning steps from previous think calls */]
  }
}

// Step 7: Remember the insights for future use
{
  "tool": "remember",
  "arguments": {
    "content": "Customer retention improved most through better onboarding and proactive support outreach",
    "type": "semantic",
    "importance": 0.9
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

### Pattern 1: Simple Problem Solving

1. Think about the problem
2. Recall similar past problems
3. Think again with additional context
4. Analyze the reasoning quality

### Pattern 2: Complex Problem Solving

1. Decompose the problem into manageable parts
2. Apply systematic thinking frameworks
3. Use parallel reasoning for multiple perspectives
4. Integrate insights and analyze reasoning quality
5. Remember the solution approach for future use

### Pattern 3: Learning from Experience

1. Remember important experiences
2. Store general principles learned
3. Recall when facing similar situations
4. Build expertise over time

### Pattern 4: Strategic Decision Making

1. Decompose the decision into key factors
2. Think through options using parallel reasoning
3. Apply systematic frameworks for structured analysis
4. Recall relevant past decisions
5. Analyze reasoning for biases
6. Remember the decision and outcome

### Pattern 5: Innovation and Creativity

1. Use parallel reasoning with emphasis on creative stream
2. Apply systematic thinking with Design Thinking framework
3. Decompose innovation challenges into components
4. Think in creative mode with high temperature
5. Analyze and refine creative ideas

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
