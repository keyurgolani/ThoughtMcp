# Tool Selection Guide

This guide helps you choose the right ThoughtMCP tool for your specific situation. Each tool is designed for different types of problems and thinking needs.

## Quick Tool Selector

### 🤔 "I need to think through a problem or decision"

**Use: `think`**

- Best for: General reasoning, decision-making, analysis
- When: You have a question or problem and want thoughtful analysis
- Example: "Should I accept this job offer?" or "How can I improve team productivity?"

### 🧠 "I want to remember something important"

**Use: `remember`**

- Best for: Storing experiences, insights, facts, or lessons learned
- When: You have valuable information you want to recall later
- Example: Storing meeting outcomes, technical solutions, or personal insights

### 🔍 "I need to recall past experiences or knowledge"

**Use: `recall`**

- Best for: Finding relevant past experiences or stored knowledge
- When: You want to leverage previous learning for current decisions
- Example: "What did I learn about project management challenges?"

### 🔬 "I want to check if my reasoning is sound"

**Use: `analyze_reasoning`**

- Best for: Quality checking your thinking, identifying biases
- When: Making important decisions or want to improve reasoning quality
- Example: Checking a business decision for logical flaws or biases

## Advanced Tool Selection

### 📊 "I need a structured approach to a complex problem"

**Use: `analyze_systematically`**

- Best for: Complex problems needing systematic frameworks
- When: Unfamiliar problem domains or need proven methodologies
- Example: Strategic planning, process improvement, innovation challenges

**Framework Selection Guide:**

- **Scientific Method**: Well-defined problems with testable hypotheses
- **Design Thinking**: User-centered problems needing creative solutions
- **Systems Thinking**: Complex interconnected problems
- **Root Cause Analysis**: Problems with symptoms needing underlying fixes
- **Critical Thinking**: Information evaluation and argument analysis
- **Creative Problem Solving**: Innovation and breakthrough solutions needed
- **First Principles**: Need to challenge fundamental assumptions
- **Scenario Planning**: Future uncertainty and strategic planning

### 🔀 "I want multiple perspectives on a decision"

**Use: `think_parallel`**

- Best for: High-stakes decisions, strategic choices, complex trade-offs
- When: Need comprehensive analysis from different angles
- Example: Major business pivots, technology choices, investment decisions

**Stream Roles:**

- **Analytical Stream**: Logical, data-driven evaluation
- **Creative Stream**: Innovative approaches and alternatives
- **Critical Stream**: Risk assessment and assumption challenging
- **Synthetic Stream**: Integration and holistic perspective

### 🧩 "I need to break down a large, complex project"

**Use: `decompose_problem`**

- Best for: Large projects with many dependencies and constraints
- When: Planning complex initiatives or managing multiple workstreams
- Example: Product launches, system migrations, organizational changes

### 📈 "I'm dealing with uncertainty and need to weigh evidence"

**Use: `think_probabilistic`**

- Best for: Decisions under uncertainty with multiple hypotheses
- When: Need to integrate evidence and assess probabilities
- Example: Investment decisions, technology adoption, market predictions

## Memory Management Tools

### 📋 "I want to understand my memory usage"

**Use: `analyze_memory_usage`**

- Best for: Understanding what you've learned and stored
- When: Periodic review or when system feels slow
- Example: Monthly review of stored knowledge and experiences

### 🧹 "I want to optimize my memory system"

**Use: `optimize_memory`**

- Best for: Cleaning up unused memories and improving performance
- When: System performance issues or storage optimization needed
- Example: Archiving old project memories, consolidating similar concepts

### 🔄 "I need to recover something I forgot"

**Use: `recover_memory`**

- Best for: Retrieving degraded or forgotten memories
- When: You remember something existed but can't recall details
- Example: Recovering details from an important meeting or solution

### 📝 "I want to manage what gets forgotten"

**Use: `forgetting_policy`**

- Best for: Setting rules about memory retention and deletion
- When: Need control over what information is kept long-term
- Example: Automatically archiving memories older than 6 months

### 📊 "I want to see what was forgotten and why"

**Use: `forgetting_audit`**

- Best for: Understanding memory optimization decisions
- When: Need transparency in memory management
- Example: Reviewing what memories were archived and their impact

## Decision Tree: Choosing the Right Tool

### Start Here: What's your primary goal?

#### 🎯 **Immediate Problem Solving**

```
Do you have a specific question or decision?
├─ Yes, simple question → `think` (balanced mode)
├─ Yes, complex decision → `think` (deliberative mode)
└─ Yes, need multiple angles → `think_parallel`

Is it a familiar type of problem?
├─ Yes → `think` + `recall` (for past experience)
└─ No → `analyze_systematically` (for structure)
```

#### 📚 **Learning and Knowledge Management**

```
Do you want to store or retrieve information?
├─ Store experience → `remember` (episodic)
├─ Store facts/knowledge → `remember` (semantic)
├─ Find past experience → `recall`
└─ Manage memory system → memory management tools
```

#### 🔍 **Quality Assurance**

```
Do you want to improve your thinking?
├─ Check reasoning quality → `analyze_reasoning`
├─ Get structured approach → `analyze_systematically`
└─ Handle uncertainty → `think_probabilistic`
```

#### 🏗️ **Project Planning**

```
Do you have a complex project or initiative?
├─ Need to break it down → `decompose_problem`
├─ Need systematic approach → `analyze_systematically`
├─ Need multiple perspectives → `think_parallel`
└─ High uncertainty → `think_probabilistic`
```

## Tool Combinations for Common Scenarios

### 🚀 **Strategic Decision Making**

1. `recall` - Gather relevant past experience
2. `analyze_systematically` - Structure the analysis
3. `think_parallel` - Get multiple perspectives
4. `analyze_reasoning` - Check for biases
5. `remember` - Store the decision and lessons

### 🛠️ **Problem Solving Workflow**

1. `think` - Initial analysis of the problem
2. `recall` - Find relevant past solutions
3. `analyze_systematically` - Apply structured approach
4. `think` - Develop solution with context
5. `remember` - Store solution for future use

### 📈 **Project Planning Workflow**

1. `decompose_problem` - Break down the project
2. `think_probabilistic` - Assess risks and uncertainties
3. `analyze_systematically` - Apply project management framework
4. `think_parallel` - Consider different execution approaches
5. `remember` - Store planning insights

### 🎓 **Learning and Improvement**

1. `recall` - Review past experiences
2. `analyze_reasoning` - Identify improvement areas
3. `think` - Develop improvement strategies
4. `remember` - Store new insights and methods

## Choosing Thinking Modes

### When to Use Each Mode

**Intuitive Mode** (`mode: "intuitive"`)

- Quick decisions
- Familiar problems
- Time pressure
- Initial brainstorming

**Deliberative Mode** (`mode: "deliberative"`)

- Important decisions
- Complex problems
- Unfamiliar territory
- High-stakes situations

**Balanced Mode** (`mode: "balanced"`) - Default

- General use
- Mixed scenarios
- Moderate complexity
- Standard analysis

**Creative Mode** (`mode: "creative"`)

- Innovation challenges
- Brainstorming sessions
- Breaking conventional thinking
- Artistic or design problems

**Analytical Mode** (`mode: "analytical"`)

- Technical problems
- Data analysis
- Systematic evaluation
- Logical reasoning tasks

## Context and Configuration Tips

### Adding Context for Better Results

Always provide context when available:

```json
{
  "context": {
    "domain": "software-development",
    "urgency": 0.8,
    "complexity": 0.7,
    "team_size": 5,
    "timeline": "3 months"
  }
}
```

### Enabling Advanced Features

**Emotional Processing** (`enable_emotion: true`)

- Personal decisions
- Team dynamics
- User experience problems
- Stressful situations

**Metacognitive Monitoring** (`enable_metacognition: true`)

- Important decisions
- Learning scenarios
- Quality improvement
- Bias detection

**Predictive Processing** (`enable_prediction: true`)

- Future planning
- Risk assessment
- Scenario analysis
- Strategic decisions

## Common Mistakes to Avoid

### ❌ Wrong Tool Selection

**Don't use `think` for:**

- Storing information (use `remember`)
- Finding past information (use `recall`)
- Complex project planning (use `decompose_problem`)

**Don't use `analyze_systematically` for:**

- Simple questions (use `think`)
- Personal reflection (use `think` with emotion enabled)
- Quick decisions (use `think` in intuitive mode)

**Don't use `think_parallel` for:**

- Simple problems (use `think`)
- When you need speed (use `think` in intuitive mode)
- Well-understood domains (use `think` or `analyze_systematically`)

### ❌ Poor Input Quality

**Avoid vague inputs:**

```json
// ❌ Too vague
{"input": "help with project"}

// ✅ Specific and clear
{"input": "I need to decide between React and Vue for a new e-commerce site. Team has 2 junior developers, 3-month timeline, need good performance and maintainability."}
```

**Provide sufficient context:**

```json
// ❌ Missing context
{"input": "Should I refactor this code?"}

// ✅ Rich context
{
  "input": "Should I refactor this authentication module?",
  "context": {
    "domain": "software-development",
    "urgency": 0.3,
    "complexity": 0.7,
    "constraints": ["time_constraint", "team_capacity"]
  }
}
```

## Performance Optimization

### For Speed

- Use `think` in intuitive mode
- Disable metacognition for simple problems
- Use specific, clear inputs
- Avoid parallel processing for simple decisions

### For Quality

- Use deliberative mode for important decisions
- Enable metacognition and emotion processing
- Use systematic analysis for complex problems
- Combine multiple tools for comprehensive analysis

### For Learning

- Always store important insights with `remember`
- Use `recall` before making similar decisions
- Analyze your reasoning quality regularly
- Build up domain-specific knowledge over time

## Getting Started Recommendations

### For New Users

1. Start with `think` for basic questions
2. Try `remember` and `recall` to build knowledge
3. Use `analyze_reasoning` to improve thinking quality
4. Gradually explore advanced tools as needs arise

### For Experienced Users

1. Develop tool combination workflows
2. Use context and configuration effectively
3. Build domain-specific memory systems
4. Optimize for your specific use cases

### For Teams

1. Establish shared memory systems
2. Use systematic analysis for team decisions
3. Document decision-making processes
4. Share insights and lessons learned

---

_Need help with a specific scenario? Check our [Examples](../examples/) or ask in [Discussions](https://github.com/keyurgolani/ThoughtMcp/discussions)._
