# Complete Workflow

**Time**: 20 minutes
**Difficulty**: Intermediate
**Tools Used**: `think`, `remember`, `recall`, `analyze_reasoning`

## The Scenario

You're facing a complex business decision and want to use ThoughtMCP's full cognitive capabilities. This example shows how all tools work together to provide comprehensive decision support.

**The Decision**: Should you pivot your startup's product strategy based on recent market feedback?

## Step 1: Recall Relevant Experience

Start by gathering relevant past experiences and knowledge.

**Tool Call:**

```json
{
  "tool": "recall",
  "arguments": {
    "cue": "startup pivot product strategy market feedback",
    "max_results": 5,
    "threshold": 0.4
  }
}
```

**Expected Response:**

```json
{
  "memories": [
    {
      "content": "Read case study about Instagram pivoting from Burbn to photo-sharing. Key lesson: focus on what users actually use most.",
      "type": "semantic",
      "relevance_score": 0.78
    },
    {
      "content": "Last quarter's user interviews showed 60% of users only use our core feature, ignore advanced features we spent months building.",
      "type": "episodic",
      "relevance_score": 0.85
    },
    {
      "content": "Pivot decisions should be data-driven, not emotion-driven. Need clear metrics and success criteria.",
      "type": "semantic",
      "relevance_score": 0.72
    }
  ]
}
```

## Step 2: Systematic Thinking

Use the systematic thinking tool to structure your analysis.

**Tool Call:**

```json
{
  "tool": "analyze_systematically",
  "arguments": {
    "input": "Should we pivot our startup's product strategy? We've received feedback that users love our core feature but rarely use our advanced features. Revenue is growing slowly. We have 6 months of runway left.",
    "mode": "auto"
  }
}
```

**Expected Framework Selection:**

```json
{
  "recommended_framework": {
    "framework": {
      "name": "Decision Analysis Framework",
      "type": "decision_making"
    },
    "reasoning": "This is a strategic business decision with multiple criteria and significant consequences"
  },
  "analysis_steps": [
    {
      "step": "Define Decision Criteria",
      "analysis": "Revenue impact, user satisfaction, development effort, market timing, competitive advantage"
    },
    {
      "step": "Gather Evidence",
      "analysis": "User analytics, revenue data, competitor analysis, team capacity assessment"
    },
    {
      "step": "Evaluate Options",
      "analysis": "Status quo vs. pivot to core feature vs. hybrid approach"
    }
  ]
}
```

## Step 3: Deep Thinking with Context

Now use the think tool with all the context you've gathered.

**Tool Call:**

```json
{
  "tool": "think",
  "arguments": {
    "input": "Given our situation - users love core feature but ignore advanced features, slow revenue growth, 6 months runway - should we pivot our product strategy?",
    "mode": "deliberative",
    "enable_emotion": true,
    "enable_metacognition": true,
    "context": {
      "domain": "startup-strategy",
      "urgency": 0.8,
      "complexity": 0.9,
      "previous_analysis": "Systematic analysis recommended Decision Analysis Framework",
      "relevant_memories": "Instagram pivot case study, user interview insights, pivot decision principles"
    }
  }
}
```

**Expected Response Structure:**

```json
{
  "content": "Based on the evidence and systematic analysis, a strategic pivot appears warranted...",
  "confidence": 0.75,
  "reasoning_path": [
    {
      "type": "evidence_synthesis",
      "content": "User behavior data strongly indicates product-market fit for core feature but not advanced features",
      "confidence": 0.9
    },
    {
      "type": "risk_analysis",
      "content": "With 6 months runway, the risk of continuing current strategy may exceed pivot risk",
      "confidence": 0.7
    },
    {
      "type": "strategic_recommendation",
      "content": "Recommend focused pivot: double down on core feature, sunset advanced features, reallocate development resources",
      "confidence": 0.8
    }
  ],
  "emotional_context": {
    "detected_emotions": ["anxiety", "determination"],
    "emotional_influence": "Urgency from runway pressure balanced by confidence in core feature"
  }
}
```

## Step 4: Quality Check Your Reasoning

Analyze the reasoning quality to identify any flaws or biases.

**Tool Call:**

```json
{
  "tool": "analyze_reasoning",
  "arguments": {
    "reasoning_steps": [
      {
        "type": "evidence_synthesis",
        "content": "User behavior data strongly indicates product-market fit for core feature but not advanced features",
        "confidence": 0.9
      },
      {
        "type": "risk_analysis",
        "content": "With 6 months runway, the risk of continuing current strategy may exceed pivot risk",
        "confidence": 0.7
      },
      {
        "type": "strategic_recommendation",
        "content": "Recommend focused pivot: double down on core feature, sunset advanced features, reallocate development resources",
        "confidence": 0.8
      }
    ],
    "context": {
      "domain": "startup-strategy",
      "check_for_biases": true,
      "generate_alternatives": true
    }
  }
}
```

**Analysis Results:**

```json
{
  "analysis": {
    "logical_coherence": 0.85,
    "evidence_support": 0.8,
    "bias_indicators": [
      {
        "type": "sunk_cost_fallacy",
        "severity": "mild",
        "explanation": "May be underweighting investment already made in advanced features"
      }
    ],
    "strengths": [
      "Data-driven approach using actual user behavior",
      "Considers time constraints and runway pressure",
      "Aligns with successful pivot patterns (Instagram case)"
    ],
    "improvement_suggestions": [
      "Quantify the cost of sunsetting advanced features",
      "Consider gradual pivot vs. immediate pivot",
      "Plan communication strategy for existing users of advanced features",
      "Set specific success metrics for the pivot"
    ],
    "alternative_approaches": [
      "Hybrid approach: improve advanced features based on user feedback",
      "Market repositioning: find different user segment for advanced features",
      "Acquisition strategy: sell advanced features to competitor"
    ]
  }
}
```

## Step 5: Store the Decision and Learning

Document your decision-making process for future reference.

**Store the Decision:**

```json
{
  "tool": "remember",
  "arguments": {
    "content": "Decided to pivot product strategy after systematic analysis. Key factors: 60% of users only use core feature, 6 months runway, slow revenue growth. Decision to focus on core feature and sunset advanced features.",
    "type": "episodic",
    "importance": 0.9,
    "emotional_tags": ["anxiety", "determination", "strategic"],
    "context": {
      "domain": "startup-strategy",
      "decision_type": "product-pivot",
      "date": "2024-01-15"
    }
  }
}
```

**Store the Lessons:**

```json
{
  "tool": "remember",
  "arguments": {
    "content": "Product pivot decisions should be data-driven using actual user behavior, not assumptions. Consider sunk costs but don't let them prevent necessary changes. Set clear success metrics for pivot evaluation.",
    "type": "semantic",
    "importance": 0.8,
    "context": {
      "domain": "startup-strategy",
      "category": "decision-making-principles"
    }
  }
}
```

**Store the Process:**

```json
{
  "tool": "remember",
  "arguments": {
    "content": "Effective decision process: 1) Recall relevant experience 2) Use systematic analysis 3) Deep thinking with context 4) Quality check reasoning 5) Document decision and lessons. This comprehensive approach revealed biases and improved decision quality.",
    "type": "semantic",
    "importance": 0.8,
    "context": {
      "domain": "decision-making",
      "category": "process"
    }
  }
}
```

## Complete Workflow Benefits

### What You Get from This Approach

**Compared to Standard Decision Making:**

- **More comprehensive**: Considers past experience and systematic frameworks
- **Higher quality**: Identifies and corrects biases
- **Better documented**: Creates learning for future decisions
- **More confident**: Provides confidence levels and reasoning transparency

**Compared to Single-Tool Usage:**

- **Richer context**: Memory provides relevant background
- **Structured approach**: Systematic analysis provides framework
- **Quality assurance**: Reasoning analysis catches flaws
- **Continuous learning**: Stores insights for future use

### Time Investment vs. Value

**Time Investment**: 15-20 minutes for complex decisions
**Value Gained**:

- Higher decision quality
- Reduced bias influence
- Learning for future decisions
- Confidence in reasoning process

## Advanced Workflow Patterns

### The Research Loop

For unfamiliar domains:

1. **Think** about what you need to know
2. **Recall** any relevant experience
3. **Remember** new information as you research
4. **Think again** with enhanced knowledge
5. **Analyze** your reasoning for gaps

### The Validation Loop

For high-stakes decisions:

1. **Think** through the decision
2. **Analyze** your reasoning for biases
3. **Think again** addressing identified issues
4. **Analyze** the improved reasoning
5. **Remember** the final decision and process

### The Learning Loop

For skill development:

1. **Think** about a problem
2. **Remember** your approach and outcome
3. **Recall** similar past experiences
4. **Analyze** what worked and what didn't
5. **Remember** the lessons learned

## Workflow Customization

### For Different Decision Types

**Technical Decisions:**

```json
{
  "mode": "analytical",
  "enable_emotion": false,
  "enable_metacognition": true,
  "context": {
    "domain": "technical",
    "evidence_weight": "high"
  }
}
```

**Personal Decisions:**

```json
{
  "mode": "balanced",
  "enable_emotion": true,
  "enable_metacognition": true,
  "context": {
    "domain": "personal",
    "consider_values": true
  }
}
```

**Creative Decisions:**

```json
{
  "mode": "creative",
  "enable_emotion": true,
  "enable_metacognition": false,
  "temperature": 1.2
}
```

### For Different Time Constraints

**Quick Decisions (< 5 minutes):**

1. **Recall** relevant experience
2. **Think** in intuitive mode
3. **Store** the decision

**Standard Decisions (10-15 minutes):**

1. **Recall** relevant experience
2. **Think** in balanced mode
3. **Analyze** reasoning quality
4. **Store** decision and lessons

**Critical Decisions (20+ minutes):**

1. **Recall** relevant experience
2. **Analyze systematically**
3. **Think** in deliberative mode
4. **Analyze** reasoning quality
5. **Think again** if issues found
6. **Store** comprehensive documentation

## Troubleshooting Workflows

### When Confidence is Low

If thinking results show low confidence:

1. **Gather more information**
2. **Recall** additional experiences
3. **Think** with more context
4. **Consider** using systematic analysis

### When Biases are Detected

If analysis reveals biases:

1. **Identify** the specific bias
2. **Gather** disconfirming evidence
3. **Think again** with bias awareness
4. **Analyze** the improved reasoning

### When Results Seem Off

If something doesn't feel right:

1. **Check** your input for clarity
2. **Try** a different thinking mode
3. **Add** more context
4. **Analyze** the reasoning process

## Key Takeaways

### Workflow Principles

1. **Start with memory**: Leverage past experience
2. **Structure your thinking**: Use systematic approaches
3. **Check your work**: Analyze reasoning quality
4. **Learn continuously**: Store insights for future use

### Tool Synergies

- **Memory + Thinking**: Past experience improves current reasoning
- **Systematic + Thinking**: Structure improves reasoning quality
- **Analysis + Thinking**: Quality checking prevents errors
- **All Together**: Comprehensive cognitive support

### When to Use Complete Workflow

- **High-stakes decisions**: Significant consequences
- **Complex problems**: Multiple factors and constraints
- **Unfamiliar domains**: Need for systematic approach
- **Learning opportunities**: Want to improve decision-making skills

## Next Steps

- **[Real-World Examples](../real-world/)** - See complete applications
- **[Integration Examples](../integration/)** - Implementation patterns
- **[Advanced Techniques](../advanced/)** - Expert-level usage

---

_Ready for real-world applications? Explore [Customer Support Agent](../real-world/customer-support.md) to see ThoughtMCP solving complex technical problems._
