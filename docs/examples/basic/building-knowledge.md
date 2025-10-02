# Building Knowledge

**Time**: 10 minutes
**Difficulty**: Beginner
**Tools Used**: `remember`, `recall`

## The Scenario

You want ThoughtMCP to learn from your experiences and remember important information for future use. This creates a personalized knowledge base that improves over time.

## Storing Memories

### Episodic Memory (Experiences)

Store specific experiences with context and emotional significance.

**Tool Call:**

```json
{
  "tool": "remember",
  "arguments": {
    "content": "Had a great meeting with the client today. They loved our prototype and want to move forward with the full project. Sarah from their team will be our main contact.",
    "type": "episodic",
    "importance": 0.8,
    "emotional_tags": ["satisfaction", "success", "relief"]
  }
}
```

**What Happens:**

- Stores the experience with emotional context
- Associates with current time and situation
- Tags with importance level for future retrieval
- Creates connections to related memories

**When to Use Episodic Memory:**

- Meeting outcomes
- Project milestones
- Learning experiences
- Personal insights
- Problem solutions

### Semantic Memory (Facts & Knowledge)

Store general knowledge and facts that aren't tied to specific experiences.

**Tool Call:**

```json
{
  "tool": "remember",
  "arguments": {
    "content": "React hooks were introduced in version 16.8. useState and useEffect are the most commonly used hooks for state management and side effects.",
    "type": "semantic",
    "importance": 0.7,
    "context": {
      "domain": "web-development",
      "technology": "React"
    }
  }
}
```

**What Happens:**

- Stores factual information
- Creates conceptual associations
- Links to related knowledge
- Available for future reasoning

**When to Use Semantic Memory:**

- Technical facts
- Best practices
- Definitions
- Procedures
- General knowledge

## Retrieving Memories

### Basic Recall

Find relevant memories using search cues.

**Tool Call:**

```json
{
  "tool": "recall",
  "arguments": {
    "cue": "client meeting prototype"
  }
}
```

**Expected Response:**

```json
{
  "memories": [
    {
      "content": "Had a great meeting with the client today...",
      "type": "episodic",
      "relevance_score": 0.92,
      "timestamp": "2024-01-15T14:30:00Z",
      "emotional_context": ["satisfaction", "success"]
    }
  ],
  "search_time_ms": 45,
  "total_memories_searched": 1247
}
```

### Advanced Recall with Filters

**Tool Call:**

```json
{
  "tool": "recall",
  "arguments": {
    "cue": "React hooks useState",
    "type": "semantic",
    "max_results": 5,
    "threshold": 0.6
  }
}
```

**What's Different:**

- Searches only semantic memories
- Returns up to 5 results
- Uses lower similarity threshold
- More comprehensive search

### Context-Aware Recall

**Tool Call:**

```json
{
  "tool": "recall",
  "arguments": {
    "cue": "project management challenges",
    "context": {
      "domain": "software-development",
      "urgency": 0.8
    }
  }
}
```

**What's Different:**

- Considers current context
- Prioritizes urgent situations
- Domain-specific search
- More relevant results

## Building Knowledge Over Time

### Learning from Experiences

**Scenario**: You've completed a challenging project and want to capture lessons learned.

**Step 1: Store the Experience**

```json
{
  "tool": "remember",
  "arguments": {
    "content": "Completed the e-commerce project 2 weeks late due to scope creep. Client kept adding features without adjusting timeline. Next time, need to establish change control process upfront.",
    "type": "episodic",
    "importance": 0.9,
    "emotional_tags": ["frustration", "learning", "determination"],
    "context": {
      "project_type": "e-commerce",
      "domain": "project-management"
    }
  }
}
```

**Step 2: Store the Lesson**

```json
{
  "tool": "remember",
  "arguments": {
    "content": "Always establish a formal change control process at project start. Document that scope changes require timeline and budget adjustments. Get client agreement in writing.",
    "type": "semantic",
    "importance": 0.8,
    "context": {
      "domain": "project-management",
      "category": "best-practices"
    }
  }
}
```

### Connecting Related Knowledge

**Tool Call:**

```json
{
  "tool": "remember",
  "arguments": {
    "content": "The Agile methodology emphasizes responding to change over following a plan, but this doesn't mean accepting unlimited scope creep. Change requests should still go through proper evaluation.",
    "type": "semantic",
    "importance": 0.7,
    "context": {
      "domain": "project-management",
      "methodology": "agile",
      "relates_to": "scope-management"
    }
  }
}
```

## Using Memory with Thinking

### Memory-Enhanced Reasoning

Combine recall with thinking for better decisions.

**Step 1: Recall Relevant Experience**

```json
{
  "tool": "recall",
  "arguments": {
    "cue": "project timeline scope changes"
  }
}
```

**Step 2: Think with Memory Context**

```json
{
  "tool": "think",
  "arguments": {
    "input": "A new client wants to add social media integration to our web app project. How should I handle this request?",
    "mode": "deliberative",
    "context": {
      "previous_memories": "Retrieved memories about scope creep challenges"
    }
  }
}
```

**What Happens:**

- ThoughtMCP considers past experiences
- Applies learned lessons to current situation
- Provides more informed recommendations
- Avoids repeating past mistakes

## Memory Management

### Importance Levels

Use importance to prioritize what gets remembered:

- **0.9-1.0**: Critical information, never forget
- **0.7-0.9**: Important, remember long-term
- **0.5-0.7**: Useful, remember medium-term
- **0.3-0.5**: Interesting, remember short-term
- **0.0-0.3**: Trivial, may be forgotten quickly

### Emotional Tags

Help with memory retrieval and context:

- **Positive**: "success", "satisfaction", "joy", "pride"
- **Negative**: "frustration", "disappointment", "concern"
- **Learning**: "insight", "discovery", "understanding"
- **Social**: "collaboration", "conflict", "support"

### Context Tags

Organize memories by domain and category:

```json
{
  "context": {
    "domain": "web-development",
    "technology": "React",
    "project": "e-commerce-site",
    "phase": "development"
  }
}
```

## Try It Yourself

### Experiment 1: Personal Knowledge Base

Build a knowledge base about your current project:

1. **Store project facts** (semantic memory)
2. **Store daily experiences** (episodic memory)
3. **Store lessons learned** (semantic memory)
4. **Recall information** when making decisions

### Experiment 2: Learning Loop

Create a learning loop:

1. **Try something new**
2. **Store the experience** with emotional context
3. **Extract the lesson** as semantic knowledge
4. **Apply the lesson** in future situations

### Experiment 3: Memory-Enhanced Decisions

For your next decision:

1. **Recall relevant experiences** first
2. **Think about the decision** with memory context
3. **Store the outcome** for future reference

## Common Patterns

### Project Documentation

```json
// Store project milestone
{
  "tool": "remember",
  "arguments": {
    "content": "Completed user authentication module. Used JWT tokens with refresh mechanism. Took 3 days longer than estimated due to security requirements.",
    "type": "episodic",
    "importance": 0.7,
    "context": {
      "project": "current-project",
      "module": "authentication",
      "phase": "development"
    }
  }
}

// Store technical knowledge
{
  "tool": "remember",
  "arguments": {
    "content": "JWT refresh tokens should be stored in httpOnly cookies for security. Access tokens can be in memory. Refresh token rotation prevents replay attacks.",
    "type": "semantic",
    "importance": 0.8,
    "context": {
      "domain": "security",
      "technology": "JWT"
    }
  }
}
```

### Learning from Mistakes

```json
// Store the mistake
{
  "tool": "remember",
  "arguments": {
    "content": "Deployed to production without running full test suite. Broke user registration. Had to rollback and fix. Embarrassing client call.",
    "type": "episodic",
    "importance": 0.9,
    "emotional_tags": ["embarrassment", "learning", "regret"]
  }
}

// Store the lesson
{
  "tool": "remember",
  "arguments": {
    "content": "Never deploy to production without running the complete test suite. Create deployment checklist to prevent this mistake.",
    "type": "semantic",
    "importance": 0.9,
    "context": {
      "domain": "deployment",
      "category": "best-practices"
    }
  }
}
```

## Key Takeaways

### Memory Types

- **Episodic**: Specific experiences with emotional context
- **Semantic**: General knowledge and facts
- **Both**: Work together to create rich understanding

### Best Practices

1. **Be specific** in memory content
2. **Use appropriate importance** levels
3. **Add emotional context** for better recall
4. **Include domain tags** for organization
5. **Connect related memories** through context

### Memory Benefits

- **Personalized responses** based on your experience
- **Continuous learning** from successes and failures
- **Context-aware decisions** using past knowledge
- **Improved reasoning** with relevant background

## Next Steps

- **[Quality Checking](quality-checking.md)** - Improve reasoning quality
- **[Complete Workflow](complete-workflow.md)** - Use all tools together
- **[Real-World Examples](../real-world/)** - See complex applications

---

_Ready to improve reasoning quality? Learn about [Quality Checking](quality-checking.md)._
