# Quality Checking

**Time**: 10 minutes
**Difficulty**: Beginner
**Tools Used**: `analyze_reasoning`

## The Scenario

You want to improve the quality of reasoning and decision-making by identifying biases, logical flaws, and areas for improvement. This is like having a reasoning coach that helps you think better.

## Basic Reasoning Analysis

### Analyzing Your Own Reasoning

**Scenario**: You've made a decision and want to check if your reasoning was sound.

**Your Reasoning Steps:**

```json
{
  "tool": "analyze_reasoning",
  "arguments": {
    "reasoning_steps": [
      {
        "type": "problem_identification",
        "content": "Our website is loading slowly, affecting user experience",
        "confidence": 0.9
      },
      {
        "type": "cause_analysis",
        "content": "The problem is probably the database queries taking too long",
        "confidence": 0.6
      },
      {
        "type": "solution_proposal",
        "content": "We should add database indexes to speed up queries",
        "confidence": 0.8
      }
    ]
  }
}
```

**What the Analysis Reveals:**

```json
{
  "analysis": {
    "logical_coherence": 0.7,
    "evidence_support": 0.5,
    "bias_indicators": [
      {
        "type": "confirmation_bias",
        "severity": "moderate",
        "explanation": "Jumped to database conclusion without investigating other causes"
      }
    ],
    "reasoning_quality": "moderate",
    "improvement_suggestions": [
      "Gather performance metrics before assuming root cause",
      "Consider alternative explanations (network, frontend, CDN)",
      "Test hypothesis before implementing solution"
    ]
  }
}
```

### Analyzing Complex Decisions

**Scenario**: You're choosing between two job offers and want to check your reasoning.

**Tool Call:**

```json
{
  "tool": "analyze_reasoning",
  "arguments": {
    "reasoning_steps": [
      {
        "type": "option_identification",
        "content": "I have two job offers: Company A offers $120k with remote work, Company B offers $100k but it's a startup with equity",
        "confidence": 1.0
      },
      {
        "type": "criteria_weighting",
        "content": "Salary is most important to me right now because I have student loans",
        "confidence": 0.8
      },
      {
        "type": "risk_assessment",
        "content": "Company A is safer because it's established, startups are risky",
        "confidence": 0.7
      },
      {
        "type": "decision",
        "content": "I should choose Company A because of higher salary and lower risk",
        "confidence": 0.8
      }
    ]
  }
}
```

**Analysis Results:**

```json
{
  "analysis": {
    "logical_coherence": 0.8,
    "evidence_support": 0.6,
    "bias_indicators": [
      {
        "type": "loss_aversion",
        "severity": "mild",
        "explanation": "Overweighting risk of startup failure"
      },
      {
        "type": "anchoring_bias",
        "severity": "moderate",
        "explanation": "Anchored on salary numbers without considering total compensation"
      }
    ],
    "missing_considerations": [
      "Long-term career growth potential",
      "Learning opportunities at startup vs established company",
      "Actual equity value calculation",
      "Work-life balance differences",
      "Team and culture fit"
    ],
    "improvement_suggestions": [
      "Calculate total compensation including equity scenarios",
      "Consider 3-5 year career trajectory for each option",
      "Evaluate non-monetary factors like learning and growth",
      "Talk to current employees at both companies"
    ]
  }
}
```

## Identifying Common Biases

### Confirmation Bias

**Example Reasoning:**

```json
{
  "reasoning_steps": [
    {
      "type": "hypothesis",
      "content": "I think our users prefer the blue button design",
      "confidence": 0.7
    },
    {
      "type": "evidence_gathering",
      "content": "I asked 3 colleagues and they all agreed blue looks better",
      "confidence": 0.8
    },
    {
      "type": "conclusion",
      "content": "Blue button is definitely the right choice",
      "confidence": 0.9
    }
  ]
}
```

**Analysis Identifies:**

- **Confirmation bias**: Only sought confirming evidence
- **Small sample size**: 3 colleagues isn't representative
- **Selection bias**: Colleagues may have similar preferences
- **Missing A/B testing**: No actual user data

### Anchoring Bias

**Example Reasoning:**

```json
{
  "reasoning_steps": [
    {
      "type": "initial_estimate",
      "content": "The client mentioned their budget is around $50k for this project",
      "confidence": 0.8
    },
    {
      "type": "scope_analysis",
      "content": "Looking at the requirements, this seems like a $50k project",
      "confidence": 0.7
    },
    {
      "type": "pricing_decision",
      "content": "I'll quote $48k to be competitive",
      "confidence": 0.8
    }
  ]
}
```

**Analysis Identifies:**

- **Anchoring bias**: Influenced by client's initial number
- **Insufficient analysis**: Didn't independently estimate effort
- **Undervaluing work**: May be pricing below actual value

### Availability Heuristic

**Example Reasoning:**

```json
{
  "reasoning_steps": [
    {
      "type": "risk_assessment",
      "content": "Cloud services are unreliable because AWS had that big outage last month",
      "confidence": 0.8
    },
    {
      "type": "solution_preference",
      "content": "We should host everything on our own servers for reliability",
      "confidence": 0.7
    }
  ]
}
```

**Analysis Identifies:**

- **Availability heuristic**: Recent dramatic event skewing perception
- **Incomplete data**: Not considering overall reliability statistics
- **False comparison**: Own servers may be less reliable than cloud

## Improving Reasoning Quality

### Before Making Important Decisions

**Step 1: Document Your Reasoning**

```json
{
  "tool": "analyze_reasoning",
  "arguments": {
    "reasoning_steps": [
      // Your reasoning steps here
    ]
  }
}
```

**Step 2: Review the Analysis**

Look for:

- Identified biases
- Missing considerations
- Weak evidence
- Logical gaps

**Step 3: Improve Your Reasoning**

Address the identified issues:

- Gather missing evidence
- Consider alternative perspectives
- Challenge your assumptions
- Seek disconfirming evidence

### Iterative Improvement

**Round 1: Initial Reasoning**

```json
{
  "reasoning_steps": [
    {
      "type": "problem_analysis",
      "content": "Our app crashes frequently, users are complaining",
      "confidence": 0.9
    },
    {
      "type": "solution",
      "content": "We need to hire more developers to fix bugs faster",
      "confidence": 0.7
    }
  ]
}
```

**Analysis Result**: "Jumping to solution without root cause analysis"

**Round 2: Improved Reasoning**

```json
{
  "reasoning_steps": [
    {
      "type": "problem_analysis",
      "content": "Our app crashes frequently, users are complaining",
      "confidence": 0.9
    },
    {
      "type": "data_gathering",
      "content": "Crash logs show 80% of crashes are from one specific feature",
      "confidence": 0.9
    },
    {
      "type": "root_cause_analysis",
      "content": "The feature has a memory leak that wasn't caught in testing",
      "confidence": 0.8
    },
    {
      "type": "solution_evaluation",
      "content": "Fix the memory leak and improve testing process to catch similar issues",
      "confidence": 0.8
    }
  ]
}
```

**Analysis Result**: "Much improved - data-driven approach with root cause analysis"

## Advanced Analysis Features

### Confidence Calibration

**Tool Call:**

```json
{
  "tool": "analyze_reasoning",
  "arguments": {
    "reasoning_steps": [
      {
        "type": "prediction",
        "content": "This marketing campaign will increase sales by 25%",
        "confidence": 0.9
      }
    ],
    "context": {
      "domain": "marketing",
      "check_confidence_calibration": true
    }
  }
}
```

**Analysis Checks:**

- Is 90% confidence justified?
- What evidence supports this confidence level?
- Are you overconfident based on past predictions?

### Alternative Perspective Analysis

**Tool Call:**

```json
{
  "tool": "analyze_reasoning",
  "arguments": {
    "reasoning_steps": [
      // Your reasoning steps
    ],
    "context": {
      "generate_alternatives": true,
      "perspective_count": 3
    }
  }
}
```

**Analysis Provides:**

- Alternative interpretations of the evidence
- Different solution approaches
- Contrarian viewpoints to consider

## Try It Yourself

### Experiment 1: Bias Detection

Analyze a recent decision you made:

1. **Document your reasoning steps**
2. **Run the analysis**
3. **Identify any biases**
4. **Consider how you could have reasoned better**

### Experiment 2: Iterative Improvement

Take a current problem you're facing:

1. **Write your initial reasoning**
2. **Analyze it for flaws**
3. **Improve based on feedback**
4. **Analyze again to see improvement**

### Experiment 3: Confidence Calibration

For your next prediction:

1. **Make the prediction with confidence level**
2. **Analyze if confidence is justified**
3. **Track actual outcome**
4. **Learn about your calibration patterns**

## Common Reasoning Patterns to Analyze

### Technical Decisions

```json
{
  "reasoning_steps": [
    {
      "type": "technology_selection",
      "content": "We should use React because it's popular",
      "confidence": 0.6
    }
  ]
}
```

**Common Issues:**

- Popularity ≠ suitability
- Missing requirements analysis
- Not considering alternatives

### Business Decisions

```json
{
  "reasoning_steps": [
    {
      "type": "market_analysis",
      "content": "Our competitors are all raising prices, so we should too",
      "confidence": 0.7
    }
  ]
}
```

**Common Issues:**

- Following competitors blindly
- Not considering customer impact
- Missing differentiation opportunities

### Personal Decisions

```json
{
  "reasoning_steps": [
    {
      "type": "career_choice",
      "content": "I should take this job because it pays more",
      "confidence": 0.8
    }
  ]
}
```

**Common Issues:**

- Single-factor optimization
- Ignoring long-term consequences
- Not considering personal values

## Key Takeaways

### What Quality Analysis Provides

- **Bias identification**: Spot thinking errors
- **Gap detection**: Find missing considerations
- **Evidence evaluation**: Assess reasoning strength
- **Improvement suggestions**: Specific ways to think better

### When to Use Analysis

- **Important decisions**: High-stakes choices
- **Complex problems**: Multi-faceted issues
- **Learning moments**: After successes or failures
- **Team decisions**: Before group consensus

### Building Better Reasoning Habits

1. **Document reasoning steps** for important decisions
2. **Regularly analyze** your thinking patterns
3. **Seek disconfirming evidence** actively
4. **Consider alternative perspectives** systematically
5. **Track prediction accuracy** to improve calibration

## Next Steps

- **[Complete Workflow](complete-workflow.md)** - Use all tools together
- **[Real-World Examples](../real-world/)** - See complex applications
- **[Integration Examples](../integration/)** - Implementation patterns

---

_Ready to see all tools working together? Check out the [Complete Workflow](complete-workflow.md)._
