# ThoughtMCP Workflow Examples

## Overview

This document provides detailed, interactive examples for common ThoughtMCP workflows. Each example includes step-by-step instructions, expected inputs/outputs, and best practices.

## Table of Contents

- [Example 1: Memory Management Workflow](#example-1-memory-management-workflow)
- [Example 2: Complex Reasoning Task](#example-2-complex-reasoning-task)
- [Example 3: Systematic Problem Solving](#example-3-systematic-problem-solving)
- [Example 4: Bias Detection and Correction](#example-4-bias-detection-and-correction)
- [Example 5: Emotional Intelligence Application](#example-5-emotional-intelligence-application)

---

## Example 1: Memory Management Workflow

### Scenario

You're building an AI assistant that remembers user preferences, project context, and past interactions to provide personalized help.

### Step 1: Store User Preferences

Store the user's communication preferences:

**Tool**: `store_memory`

```json
{
  "content": "User prefers concise, technical responses without excessive explanations. Appreciates code examples over lengthy descriptions.",
  "userId": "user-alice-123",
  "sessionId": "session-2024-001",
  "primarySector": "semantic",
  "metadata": {
    "keywords": ["preference", "communication", "style"],
    "tags": ["user-preference", "important"],
    "category": "user-profile",
    "importance": 0.9
  }
}
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "memoryId": "mem-abc123",
    "embeddingsGenerated": 5,
    "linksCreated": 2,
    "salience": 0.75,
    "strength": 1.0
  }
}
```

### Step 2: Store Project Context

Store information about the user's current project:

**Tool**: `store_memory`

```json
{
  "content": "User is building a React e-commerce application with TypeScript. Using Next.js 14 with App Router. Backend is Node.js with PostgreSQL database.",
  "userId": "user-alice-123",
  "sessionId": "session-2024-001",
  "primarySector": "episodic",
  "metadata": {
    "keywords": ["project", "react", "typescript", "nextjs", "ecommerce"],
    "tags": ["current-project", "tech-stack"],
    "category": "project-context",
    "importance": 0.85
  }
}
```

### Step 3: Store a Learning Experience

Store a procedural memory about something that worked well:

**Tool**: `store_memory`

```json
{
  "content": "When helping with React performance issues, suggesting React.memo and useMemo for expensive computations was very effective. User implemented it and saw 40% improvement.",
  "userId": "user-alice-123",
  "sessionId": "session-2024-001",
  "primarySector": "procedural",
  "metadata": {
    "keywords": ["react", "performance", "optimization", "memo"],
    "tags": ["solution", "effective"],
    "category": "best-practice",
    "importance": 0.8
  }
}
```

### Step 4: Retrieve Relevant Context

When the user asks a new question, retrieve relevant memories:

**Tool**: `retrieve_memories`

```json
{
  "userId": "user-alice-123",
  "text": "React performance optimization",
  "sectors": ["semantic", "procedural", "episodic"],
  "minStrength": 0.3,
  "limit": 5
}
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "memories": [
      {
        "id": "mem-xyz789",
        "content": "When helping with React performance issues...",
        "strength": 1.0,
        "salience": 0.82,
        "primarySector": "procedural",
        "score": 0.91
      },
      {
        "id": "mem-def456",
        "content": "User is building a React e-commerce application...",
        "strength": 1.0,
        "salience": 0.75,
        "primarySector": "episodic",
        "score": 0.78
      }
    ],
    "totalCount": 2
  }
}
```

### Step 5: Update Memory After New Learning

After a successful interaction, update or add new memories:

**Tool**: `update_memory`

```json
{
  "memoryId": "mem-xyz789",
  "userId": "user-alice-123",
  "content": "When helping with React performance issues, suggesting React.memo, useMemo, and useCallback for expensive computations was very effec Also recommended React DevTools Profiler for identifying bottlenecks.",
  "metadata": {
    "importance": 0.9
  }
}
```

### Best Practices for Memory Management

1. **Use appropriate sectors**: Match content type to sector
2. **Add meaningful metadata**: Keywords and tags improve retrieval
3. **Set importance scores**: Higher importance = slower decay
4. **Retrieve before responding**: Always check for relevant context
5. **Update memories**: Keep information current

---

## Example 2: Complex Reasoning Task

### Scenario

A user asks for help designing a scalable microservices architecture for their growing application.

### Step 1: Retrieve Relevant Context

First, check for any relevant memories:

**Tool**: `retrieve_memories`

```json
{
  "userId": "user-bob-456",
  "text": "microservices architecture scalability",
  "sectors": ["semantic", "procedural"],
  "limit": 10
}
```

### Step 2: Execute Parallel Reasoning

Use all four reasoning streams to analyze the problem:

**Tool**: `think`

```json
{
  "problem": "Design a scalable microservices architecture for an e-commerce platform that currently handles 10,000 daily users but needs to scale to 1 million users within 2 years.",
  "context": {
    "currentArchitecture": "monolithic Node.js application",
    "database": "PostgreSQL",
    "budget": "moderate",
    "team": "5 developers",
    "constraints": [
      "minimize downtime during migration",
      "maintain data consistency",
      "team has limited microservices experience"
    ]
  },
  "mode": "parallel",
  "timeout": 30000
}
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "analyticalResult": {
      "conclusion": "Decompose into 5 core services: User, Product, Order, Payment, Inventory. Use event-driven architecture with message queue for inter-service communication.",
      "reasoning": [
        "Identified bounded contexts from domain analysis",
        "Calculated service boundaries based on data ownership",
        "Estimated resource requirements per service"
      ]
    },
    "creativeResult": {
      "conclusion": "Consider serverless for variable-load services (notifications, reports). Use feature flags for gradual rollout. Implement strangler fig pattern for migration.",
      "alternatives": [
        "Hybrid approach: keep core as modular monolith, extract only high-scale services",
        "Start with 2-3 services, expand based on actual bottlenecks"
      ]
    },
    "criticalResult": {
      "conclusion": "Main risks: distributed transaction complexity, team learning curve, operational overhead. Mitigation: start small, invest in observability.",
      "risks": [
        "Data consistency across services",
        "Increased deployment complexity",
        "Network latency between services"
      ]
    },
    "syntheticResult": {
      "conclusion": "Phased approach recommended: 1) Add observability to monolith, 2) Extract first service (User), 3) Iterate based on learnings.",
      "patterns": [
        "Strangler fig pattern for gradual migration",
        "Event sourcing for audit trail",
        "CQRS for read-heavy services"
      ]
    },
    "synthesis": {
      "recommendation": "Start with a modular monolith approach, extract services incrementally based on scaling needs. Begin with User service as it has clearest boundaries.",
      "confidence": 0.82,
      "nextSteps": [
        "Map current domain boundaries",
        "Set up monitoring and observability",
        "Extract User service as pilot",
        "Establish CI/CD for microservices"
      ]
    },
    "processingTime": 12450
  }
}
```

### Step 3: Assess Confidence

Evaluate confidence in the recommendation:

**Tool**: `assess_confidence`

```json
{
  "reasoning": "Start with a modular monolith approach, extract services incrementally based on scaling needs. Begin with User service as it has clearest boundaries.",
  "evidence": [
    "Team has limited microservices experience",
    "Current system is monolithic",
    "Strangler fig pattern is proven for migrations",
    "User service has clear domain boundaries"
  ],
  "domain": "architecture"
}
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "overallConfidence": 0.78,
    "evidenceQuality": 0.82,
    "reasoningCoherence": 0.85,
    "completeness": 0.72,
    "uncertaintyLevel": "medium",
    "biasFreedom": 0.8,
    "interpretation": "Moderately high confidence. Recommendation is well-supported but some uncertainty around team execution capability.",
    "recommendations": [
      "Gather more data on team's learning capacity",
      "Consider pilot project to validate approach",
      "Plan for contingencies if migration takes longer"
    ]
  }
}
```

### Step 4: Store the Solution

Save the reasoning for future reference:

**Tool**: `store_memory`

```json
{
  "content": "For monolith-to-microservices migration with limited team experience: Recommended phased approach starting with modular monolith, then extracting services incrementally. User service is good first candidate due to clear boundaries. Key success factors: observability first, strangler fig pattern, feature flags for gradual rollout.",
  "userId": "user-bob-456",
  "sessionId": "session-2024-002",
  "primarySector": "procedural",
  "metadata": {
    "keywords": ["microservices", "migration", "architecture", "scalability"],
    "tags": ["solution", "architecture-decision"],
    "category": "technical-guidance",
    "importance": 0.85
  }
}
```

---

## Example 3: Systematic Problem Solving

### Scenario

A user reports that their application's checkout process has a 45% abandonment rate and needs help identifying the root cause.

### Step 1: Apply Root Cause Analysis Framework

**Tool**: `analyze_systematically`

```json
{
  "problem": "E-commerce checkout has 45% abandonment rate, significantly higher than industry average of 25%",
  "framework": "root-cause-analysis",
  "context": {
    "currentRate": "45%",
    "industryAverage": "25%",
    "checkoutSteps": 5,
    "paymentMethods": ["credit card", "PayPal"],
    "recentChanges": "Added mandatory account creation 2 weeks ago",
    "analytics": {
      "dropOffByStep": {
        "cart": "10%",
        "shipping": "15%",
        "account": "35%",
        "payment": "25%",
        "confirmation": "15%"
      }
    }
  }
}
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "framework": "root-cause-analysis",
    "analysis": {
      "problemStatement": "45% checkout abandonment vs 25% industry average",
      "dataAnalysis": {
        "primaryDropOff": "Account creation step (35%)",
        "correlation": "Spike coincides with mandatory account requirement",
        "pattern": "Mobile users abandon 50% more than desktop"
      },
      "rootCauses": [
        {
          "cause": "Mandatory account creation friction",
          "evidence": "35% drop-off at account step, timing matches policy change",
          "confidence": 0.92
        },
        {
          "cause": "Mobile UX issues",
          "evidence": "50% higher abandonment on mobile",
          "confidence": 0.75
        },
        {
          "cause": "Limited payment options",
          "evidence": "25% drop-off at payment, only 2 methods",
          "confidence": 0.65
        }
      ],
      "recommendations": [
        {
          "action": "Implement guest checkout option",
          "expectedImpact": "Reduce abandonment by 15-20%",
          "effort": "low",
          "priority": 1
        },
        {
          "action": "Optimize mobile checkout flow",
          "expectedImpact": "Reduce mobile abandonment by 10%",
          "effort": "medium",
          "priority": 2
        },
        {
          "action": "Add Apple Pay and Google Pay",
          "expectedImpact": "Reduce payment abandonment by 5%",
          "effort": "medium",
          "priority": 3
        }
      ]
    },
    "confidence": 0.85,
    "processingTime": 2150
  }
}
```

### Step 2: Validate with Design Thinking

Get a user-centered perspective:

**Tool**: `analyze_systematically`

```json
{
  "problem": "Users abandoning checkout at account creation step",
  "framework": "design-thinking",
  "context": {
    "userSegments": ["first-time buyers", "returning customers", "mobile users"],
    "currentFlow": "Cart → Shipping → Account Creation → Payment → Confirmation"
  }
}
```

### Step 3: Store Insights

**Tool**: `store_memory`

```json
{
  "content": "Checkout abandonment root cause: Mandatory account creation caused 35% drop-off. Solution: Implement guest checkout (priority 1), optimize mobile UX (priority 2), add more payment methods (priority 3). Expected total improvement: 25-35% reduction in abandonment.",
  "userId": "user-carol-789",
  "sessionId": "session-2024-003",
  "primarySector": "procedural",
  "metadata": {
    "keywords": ["checkout", "abandonment", "conversion", "ux"],
    "tags": ["root-cause", "solution", "ecommerce"],
    "importance": 0.9
  }
}
```

---

## Example 4: Bias Detection and Correction

### Scenario

You're helping a user make a decision about whether to continue with a project that's behind schedule and over budget.

### Step 1: Analyze the User's Reasoning

**Tool**: `detect_bias`

```json
{
  "reasoning": "We should continue with Project Alpha because we've already invested $500,000 and 8 months of development. The team has worked so hard on this. Plus, our competitor just launched something similar, so we need to ship soon. I remember the last project we cancelled ended up being a mistake.",
  "context": {
    "projectStatus": "6 months behind schedule",
    "budgetOverrun": "40%",
    "marketConditions": "competitor launched similar product",
    "teamMorale": "low due to extended timeline"
  }
}
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "biasesDetected": [
      {
        "type": "sunk_cost_fallacy",
        "severity": 0.85,
        "evidence": "Justifying continuation based on past investment ($500k, 8 months) rather than future value",
        "recommendation": "Evaluate project based on remaining cost vs expected return, ignoring sunk costs"
      },
      {
        "type": "availability_bias",
        "severity": 0.72,
        "evidence": "Referencing single past cancelled project as evidence, ignoring successful cancellations",
        "recommendation": "Review all past project decisions, not just memorable ones"
      },
      {
        "type": "anchoring_bias",
        "severity": 0.65,
        "evidence": "Competitor launch creating urgency anchor, may not reflect actual market timing needs",
        "recommendation": "Independently assess optimal launch timing based on product readiness"
      },
      {
        "type": "emotional_reasoning",
        "severity": 0.58,
        "evidence": "Team effort cited as justification ('worked so hard')",
        "recommendation": "Separate emotional investment from business decision criteria"
      }
    ],
    "overallBiasRisk": "high",
    "correctionStrategies": [
      {
        "strategy": "Pre-mortem analysis",
        "description": "Imagine the project failed - what would be the reasons?"
      },
      {
        "strategy": "Fresh perspective",
        "description": "Ask: 'If we were starting today with $0 invested, would we start this project?'"
      },
      {
        "strategy": "Devil's advocate",
        "description": "Assign someone to argue for cancellation"
      }
    ]
  }
}
```

### Step 2: Apply Corrective Reasoning

**Tool**: `think`

```json
{
  "problem": "Should we continue Project Alpha? Need unbiased analysis.",
  "context": {
    "sunkCost": "$500,000",
    "remainingCost": "$300,000",
    "expectedRevenue": "$400,000 first year",
    "competitorAdvantage": "3 months ahead",
    "teamCapacity": "could pivot to Project Beta",
    "projectBetaExpectedRevenue": "$600,000 first year"
  },
  "mode": "critical"
}
```

### Step 3: Store the Learning

**Tool**: `store_memory`

```json
{
  "content": "When evaluating struggling projects, watch for sunk cost fallacy. Key question: 'Would we start this project today with current knowledge?' Compare remaining investment vs expected return, not total investment. Consider opportunity cost of alternative projects.",
  "userId": "user-dave-012",
  "sessionId": "session-2024-004",
  "primarySector": "reflective",
  "metadata": {
    "keywords": ["decision-making", "sunk-cost", "bias", "project-evaluation"],
    "tags": ["meta-learning", "bias-awareness"],
    "importance": 0.85
  }
}
```

---

## Example 5: Emotional Intelligence Application

### Scenario

A user is expressing frustration while debugging a complex issue. You need to detect their emotional state and respond appropriately.

### Step 1: Detect Emotional State

**Tool**: `detect_emotion`

```json
{
  "text": "I've been stuck on this bug for THREE DAYS. Nothing works. I've tried everything the documentation says and it still fails. I'm starting to think this framework is just broken. Maybe I should just rewrite the whole thing from scratch.",
  "includeDiscrete": true
}
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "circumplex": {
      "valence": -0.72,
      "arousal": 0.85,
      "dominance": -0.45,
      "interpretation": "High negative emotion with high activation and low sense of control"
    },
    "discreteEmotions": [
      { "emotion": "frustration", "score": 0.92 },
      { "emotion": "anger", "score": 0.68 },
      { "emotion": "helplessness", "score": 0.55 },
      { "emotion": "determination", "score": 0.35 }
    ],
    "primaryEmotion": "frustration",
    "confidence": 0.88,
    "contextualFactors": [
      "Extended time investment (3 days)",
      "Multiple failed attempts",
      "Considering drastic action (rewrite)",
      "Externalizing blame (framework broken)"
    ],
    "suggestedApproach": "Acknowledge frustration, provide structured debugging approach, offer quick wins to restore confidence"
  }
}
```

### Step 2: Store Emotional Context

**Tool**: `store_memory`

```json
{
  "content": "User experienced high frustration during debugging session (3 days stuck). Showed signs of learned helplessness and was considering drastic solutions. Needed acknowledgment and structured approach rather than more suggestions.",
  "userId": "user-eve-345",
  "sessionId": "session-2024-005",
  "primarySector": "emotional",
  "metadata": {
    "keywords": ["frustration", "debugging", "support"],
    "tags": ["emotional-context", "user-state"],
    "importance": 0.7
  }
}
```

### Step 3: Retrieve Past Emotional Patterns

Check for patterns in user's emotional history:

**Tool**: `retrieve_memories`

```json
{
  "userId": "user-eve-345",
  "sectors": ["emotional"],
  "limit": 5
}
```

### Step 4: Store Successful Intervention

After helping the user successfully:

**Tool**: `store_memory`

```json
{
  "content": "When user is highly frustrated after extended debugging: 1) Acknowledge the difficulty first, 2) Suggest taking a short break, 3) Offer to review the problem fresh together, 4) Break down into smaller verification steps. This approach helped user find the issue (typo in config file) within 15 minutes.",
  "userId": "user-eve-345",
  "sessionId": "session-2024-005",
  "primarySector": "procedural",
  "metadata": {
    "keywords": ["debugging", "frustration", "support-technique"],
    "tags": ["effective-approach", "emotional-support"],
    "importance": 0.8
  }
}
```

---

## Tips for Effective Workflows

### Memory Management

1. **Be specific**: Store concrete, actionable information
2. **Use all sectors**: Different types of knowledge belong in different sectors
3. **Set appropriate importance**: Higher importance = longer retention
4. **Update regularly**: Keep memories current with new learnings

### Reasoning

1. **Provide context**: More context = better reasoning
2. **Use appropriate mode**: Parallel for complex, single stream for focused
3. **Check confidence**: Always assess confidence in important decisions
4. **Detect biases**: Especially for high-stakes decisions

### Emotional Intelligence

1. **Detect early**: Check emotional state at start of interactions
2. **Adapt approach**: Adjust communication style based on emotional state
3. **Store patterns**: Track emotional patterns for better future support
4. **Follow up**: Check if interventions were effective

---

## See Also

- **[User Guide](user-guide.md)** - Getting started and tool reference
- **[API Reference](api.md)** - Detailed API documentation
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions

---

**Last Updated**: December 2025
**Version**: 0.5.0
