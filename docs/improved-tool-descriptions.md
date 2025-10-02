# Improved Tool Descriptions for ThoughtMCP

This document contains user-friendly tool descriptions with plain language, practical examples, and clear guidance on when to use each tool.

## Core Thinking Tools

### 1. think - Smart Problem Solving

**What it does:** Helps you think through problems like a human would - considering different angles, checking for mistakes, and providing thoughtful responses.

**When to use:**

- Making difficult decisions
- Solving complex problems
- Getting thoughtful analysis of situations
- When you need more than a quick answer

**Examples:**

**Example 1: Career Decision**

```json
{
  "tool": "think",
  "arguments": {
    "input": "Should I take a job that pays 20% more but requires 60-hour weeks?",
    "mode": "deliberative"
  }
}
```

_Result: Systematic analysis weighing salary vs. work-life balance, long-term career impact, and personal values._

**Example 2: Creative Problem**

```json
{
  "tool": "think",
  "arguments": {
    "input": "How can I make my small apartment feel more spacious?",
    "mode": "creative"
  }
}
```

_Result: Innovative ideas using lighting, mirrors, furniture arrangement, and visual tricks._

**Example 3: Quick Question**

```json
{
  "tool": "think",
  "arguments": {
    "input": "What's the best way to learn Python?",
    "mode": "intuitive"
  }
}
```

_Result: Fast, practical advice based on common learning patterns._

**Modes explained:**

- `intuitive` - Quick, instinctive responses (like System 1 thinking)
- `deliberative` - Careful, thorough analysis (like System 2 thinking)
- `creative` - Innovative, out-of-the-box solutions
- `analytical` - Logical, data-driven reasoning
- `balanced` - Mix of approaches (default, good for most cases)

---

### 2. remember - Save Important Information

**What it does:** Stores information in memory so it can be recalled later. Like writing in a smart notebook that organizes itself.

**When to use:**

- Saving insights from conversations
- Recording important facts or lessons learned
- Building knowledge over time
- Storing personal preferences or experiences

**Examples:**

**Example 1: Learning Insight**

```json
{
  "tool": "remember",
  "arguments": {
    "content": "When debugging code, always check the simplest things first - typos, missing semicolons, wrong variable names",
    "type": "semantic",
    "importance": 0.8
  }
}
```

_Stores this as general knowledge for future coding problems._

**Example 2: Personal Experience**

```json
{
  "tool": "remember",
  "arguments": {
    "content": "Had a great meeting with Sarah about the marketing campaign. She suggested focusing on social media first.",
    "type": "episodic",
    "importance": 0.6,
    "emotional_tags": ["positive", "productive"]
  }
}
```

_Stores this as a specific memory with emotional context._

**Memory types:**

- `semantic` - General knowledge, facts, concepts (like "Python is a programming language")
- `episodic` - Specific experiences, events, conversations (like "Yesterday I learned about Python")

**Importance scale:** 0.0 (forget quickly) to 1.0 (remember forever)

---

### 3. recall - Find Relevant Information

**What it does:** Searches through stored memories to find information related to your current question or situation.

**When to use:**

- Looking for past insights on a topic
- Finding related experiences or knowledge
- Building on previous conversations
- Getting context for current decisions

**Examples:**

**Example 1: Finding Related Knowledge**

```json
{
  "tool": "recall",
  "arguments": {
    "cue": "debugging programming errors",
    "max_results": 5
  }
}
```

_Finds stored tips, experiences, and knowledge about debugging._

**Example 2: Remembering Past Conversations**

```json
{
  "tool": "recall",
  "arguments": {
    "cue": "Sarah marketing campaign",
    "type": "episodic"
  }
}
```

_Finds specific memories about conversations with Sarah regarding marketing._

**Example 3: Broad Topic Search**

```json
{
  "tool": "recall",
  "arguments": {
    "cue": "productivity tips",
    "threshold": 0.3,
    "max_results": 10
  }
}
```

_Finds various memories related to productivity, even loosely related ones._

**Search types:**

- `both` - Search all memories (default)
- `semantic` - Only general knowledge
- `episodic` - Only specific experiences

---

## Analysis and Quality Tools

### 4. analyze_reasoning - Check Your Thinking

**What it does:** Reviews reasoning steps to spot mistakes, biases, and areas for improvement. Like having a thinking coach.

**When to use:**

- After making important decisions
- When you want to improve your reasoning
- To check for biases or blind spots
- For learning better thinking patterns

**Example:**

```json
{
  "tool": "analyze_reasoning",
  "arguments": {
    "reasoning_steps": [
      {
        "type": "premise",
        "content": "Remote work increases productivity",
        "confidence": 0.7
      },
      {
        "type": "conclusion",
        "content": "Therefore, all companies should go fully remote",
        "confidence": 0.8
      }
    ]
  }
}
```

_Result: Points out the logical jump, suggests considering counterarguments and individual differences._

---

### 5. analyze_systematically - Use Proven Problem-Solving Methods

**What it does:** Applies established problem-solving frameworks (like Design Thinking, Scientific Method, Root Cause Analysis) to tackle complex issues.

**When to use:**

- Complex business problems
- Technical challenges requiring structured approach
- When you need a systematic methodology
- For problems with multiple stakeholders or constraints

**Example:**

```json
{
  "tool": "analyze_systematically",
  "arguments": {
    "input": "Our app's user retention rate dropped 30% last month",
    "mode": "auto"
  }
}
```

_Result: Automatically selects Root Cause Analysis framework, systematically investigates potential causes, suggests data collection and testing strategies._

---

## Advanced Thinking Tools

### 6. think_parallel - Multiple Perspectives at Once

**What it does:** Thinks about a problem from multiple angles simultaneously - analytical, creative, critical, and synthetic perspectives working together.

**When to use:**

- Complex problems needing diverse viewpoints
- When you want comprehensive analysis
- For innovation and breakthrough thinking
- Strategic planning and decision-making

**Example:**

```json
{
  "tool": "think_parallel",
  "arguments": {
    "input": "How should we respond to a new competitor entering our market?"
  }
}
```

_Result: Analytical stream examines market data, creative stream suggests innovative responses, critical stream identifies risks, synthetic stream combines insights._

---

### 7. decompose_problem - Break Down Complex Challenges

**What it does:** Takes big, overwhelming problems and breaks them into smaller, manageable pieces with clear priorities and dependencies.

**When to use:**

- Large projects or initiatives
- Complex problems that feel overwhelming
- When you need a clear action plan
- For understanding problem structure

**Example:**

```json
{
  "tool": "decompose_problem",
  "arguments": {
    "input": "Launch a new e-commerce website in 6 months",
    "max_depth": 3
  }
}
```

_Result: Breaks down into phases (planning, development, testing, launch), identifies dependencies, suggests priority order._

---

### 8. think_probabilistic - Reasoning with Uncertainty

**What it does:** Handles uncertain situations by working with probabilities, updating beliefs based on evidence, and quantifying confidence levels.

**When to use:**

- Making decisions with incomplete information
- Risk assessment and planning
- When dealing with uncertain outcomes
- Scientific or analytical reasoning

**Example:**

```json
{
  "tool": "think_probabilistic",
  "arguments": {
    "input": "What's the likelihood our product launch will succeed given current market conditions?"
  }
}
```

_Result: Analyzes various factors, assigns probabilities, updates beliefs based on evidence, provides confidence intervals._

---

## Memory Management Tools

### 9. analyze_memory_usage - Check Memory Health

**What it does:** Analyzes how memory is being used, identifies optimization opportunities, and suggests improvements.

**When to use:**

- When memory seems cluttered or slow
- Periodic maintenance and cleanup
- Before important projects requiring clear thinking
- To understand memory patterns

**Example:**

```json
{
  "tool": "analyze_memory_usage",
  "arguments": {
    "analysis_depth": "deep",
    "include_recommendations": true
  }
}
```

_Result: Shows memory usage statistics, identifies rarely-used memories, suggests cleanup strategies._

---

### 10. optimize_memory - Clean Up Memory

**What it does:** Performs memory cleanup by removing or archiving less important memories while preserving valuable information.

**When to use:**

- When memory is getting cluttered
- To improve thinking performance
- Before starting new projects
- Regular maintenance

**Example:**

```json
{
  "tool": "optimize_memory",
  "arguments": {
    "optimization_mode": "moderate",
    "preserve_important_memories": true
  }
}
```

_Result: Safely removes low-importance memories, archives old information, improves memory efficiency._

---

### 11. recover_memory - Restore Lost Information

**What it does:** Attempts to recover memories that have been forgotten or degraded using various recovery techniques.

**When to use:**

- When you can't quite remember something important
- To recover accidentally forgotten information
- Using partial clues to reconstruct memories

**Example:**

```json
{
  "tool": "recover_memory",
  "arguments": {
    "memory_id": "mem_12345",
    "recovery_cues": [
      {
        "type": "contextual",
        "value": "meeting about budget planning"
      },
      {
        "type": "temporal",
        "value": "last Tuesday afternoon"
      }
    ]
  }
}
```

_Result: Uses contextual and temporal cues to reconstruct the forgotten memory about the budget meeting._

---

## Administrative Tools

### 12. forgetting_audit - Review Memory Changes

**What it does:** Shows a log of what memories have been forgotten, archived, or modified, with options to undo changes.

**When to use:**

- To review what information was removed
- To restore accidentally forgotten memories
- For transparency in memory management
- Compliance and audit purposes

**Example:**

```json
{
  "tool": "forgetting_audit",
  "arguments": {
    "include_summary": true,
    "query": {
      "limit": 50
    }
  }
}
```

_Result: Shows recent memory changes with summary statistics and recovery options._

---

### 13. forgetting_policy - Manage Memory Rules

**What it does:** Creates and manages rules for what types of memories should be kept, forgotten, or require permission before removal.

**When to use:**

- Setting up automatic memory management
- Creating custom retention policies
- Ensuring important information is protected
- Compliance with data retention requirements

**Example:**

```json
{
  "tool": "forgetting_policy",
  "arguments": {
    "action": "create",
    "policy_data": {
      "policy_name": "Protect Important Work Memories",
      "rules": [
        {
          "rule_name": "Keep High Importance",
          "conditions": [
            {
              "condition_type": "importance_threshold",
              "operator": "greater_than",
              "value": 0.8
            }
          ],
          "action": "deny"
        }
      ]
    }
  }
}
```

_Result: Creates a policy that prevents forgetting of high-importance memories._

---

## Tool Selection Guide

### Quick Decision Tree

**Need a quick answer?** → Use `think` with `mode: "intuitive"`

**Complex decision or analysis?** → Use `think` with `mode: "deliberative"`

**Want creative ideas?** → Use `think` with `mode: "creative"`

**Need to save information?** → Use `remember`

**Looking for past information?** → Use `recall`

**Want to check your reasoning?** → Use `analyze_reasoning`

**Complex problem needing structure?** → Use `analyze_systematically`

**Need multiple perspectives?** → Use `think_parallel`

**Big problem feels overwhelming?** → Use `decompose_problem`

**Dealing with uncertainty?** → Use `think_probabilistic`

**Memory feels cluttered?** → Use `analyze_memory_usage` then `optimize_memory`

**Can't remember something?** → Use `recover_memory`

**Need to review memory changes?** → Use `forgetting_audit`

**Want to set memory rules?** → Use `forgetting_policy`

### Common Workflows

**Learning Session:**

1. `think` (to understand new concepts)
2. `remember` (to store key insights)
3. `recall` (to connect with existing knowledge)

**Decision Making:**

1. `think` with `mode: "deliberative"`
2. `analyze_reasoning` (to check for biases)
3. `remember` (to store the decision and rationale)

**Problem Solving:**

1. `decompose_problem` (break it down)
2. `think_parallel` (multiple perspectives)
3. `analyze_systematically` (structured approach)
4. `remember` (store solution for future)

**Memory Maintenance:**

1. `analyze_memory_usage` (check health)
2. `optimize_memory` (clean up if needed)
3. `forgetting_audit` (review changes)
