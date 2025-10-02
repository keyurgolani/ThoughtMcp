# Advanced Cognitive Tools

**Time**: 30 minutes
**Difficulty**: Intermediate to Advanced
**Tools Used**: `analyze_systematically`, `think_parallel`, `decompose_problem`, `think_probabilistic`, memory management tools

## Overview

ThoughtMCP includes advanced cognitive tools that provide sophisticated reasoning capabilities beyond basic thinking. These tools implement cutting-edge cognitive science research to solve complex problems systematically.

## Systematic Analysis Tools

### analyze_systematically - Framework-Based Problem Solving

Automatically selects and applies proven thinking frameworks to structure your analysis.

**Scenario**: You need to improve your team's productivity but don't know where to start.

**Tool Call:**

```json
{
  "tool": "analyze_systematically",
  "arguments": {
    "input": "Our development team is missing deadlines and seems overwhelmed. Productivity has dropped 30% over the last quarter. Team morale is low and we're getting complaints about code quality.",
    "mode": "auto"
  }
}
```

**What Happens:**

- Analyzes problem characteristics
- Selects optimal thinking framework
- Applies structured analysis steps
- Provides systematic recommendations

**Expected Response:**

```json
{
  "framework_selection": {
    "selected_framework": "Root Cause Analysis",
    "reasoning": "Multiple symptoms suggest underlying systemic issues requiring root cause identification",
    "confidence": 0.85
  },
  "systematic_analysis": {
    "problem_definition": {
      "primary_symptoms": ["missed deadlines", "low morale", "quality issues"],
      "impact_assessment": "30% productivity drop with quality degradation"
    },
    "root_cause_analysis": {
      "potential_causes": [
        {
          "category": "Process Issues",
          "causes": [
            "unclear requirements",
            "scope creep",
            "inadequate planning"
          ],
          "likelihood": 0.8
        },
        {
          "category": "Resource Constraints",
          "causes": ["understaffing", "skill gaps", "tool limitations"],
          "likelihood": 0.7
        },
        {
          "category": "Communication Problems",
          "causes": [
            "poor stakeholder communication",
            "team silos",
            "feedback delays"
          ],
          "likelihood": 0.6
        }
      ]
    },
    "recommendations": [
      {
        "priority": "high",
        "action": "Implement structured requirements gathering and change control process",
        "expected_impact": "Reduce scope creep by 60%"
      },
      {
        "priority": "medium",
        "action": "Conduct skills assessment and provide targeted training",
        "expected_impact": "Improve code quality and confidence"
      }
    ]
  }
}
```

**When to Use:**

- Complex problems with multiple factors
- Unfamiliar problem domains
- Need for structured approach
- Team decision-making scenarios

### Different Framework Examples

**Design Thinking for Innovation:**

```json
{
  "tool": "analyze_systematically",
  "arguments": {
    "input": "We need to create a new feature that helps users manage their time better, but we're not sure what they actually need.",
    "mode": "auto"
  }
}
```

**Expected Framework**: Design Thinking (Empathize → Define → Ideate → Prototype → Test)

**Scientific Method for Hypothesis Testing:**

```json
{
  "tool": "analyze_systematically",
  "arguments": {
    "input": "Our website conversion rate dropped 15% after the redesign. We need to figure out what's causing this and how to fix it.",
    "mode": "auto"
  }
}
```

**Expected Framework**: Scientific Method (Observation → Hypothesis → Experiment → Analysis → Conclusion)

## Parallel Reasoning Tools

### think_parallel - Multi-Stream Reasoning

Processes problems through multiple reasoning streams simultaneously for comprehensive analysis.

**Scenario**: You're deciding whether to pivot your startup's business model.

**Tool Call:**

```json
{
  "tool": "think_parallel",
  "arguments": {
    "input": "Should we pivot from B2B SaaS to B2C mobile app? Current B2B revenue is $50k/month but growth has stalled. We have a prototype mobile app that's getting great user feedback but no revenue model yet.",
    "enable_coordination": true,
    "context": {
      "domain": "startup-strategy",
      "urgency": 0.8,
      "complexity": 0.9
    }
  }
}
```

**What Happens:**

- **Analytical Stream**: Logical evaluation of financial data and market metrics
- **Creative Stream**: Innovative approaches and unconventional solutions
- **Critical Stream**: Risk assessment and assumption challenging
- **Synthetic Stream**: Integration of perspectives into holistic view
- **Real-time Coordination**: Streams share insights and resolve conflicts

**Expected Response:**

```json
{
  "parallel_streams": {
    "analytical_stream": {
      "analysis": "B2B revenue of $50k/month provides stability but limited growth. Mobile app has engagement metrics suggesting product-market fit but monetization uncertainty.",
      "key_metrics": {
        "b2b_runway": "18 months at current burn rate",
        "mobile_user_engagement": "4.2/5 rating, 78% daily retention",
        "pivot_cost": "$200k estimated development and marketing"
      },
      "recommendation": "Gradual transition rather than full pivot"
    },
    "creative_stream": {
      "innovative_approaches": [
        "Hybrid model: B2B enterprise version of mobile app",
        "Freemium mobile with B2B premium features",
        "White-label mobile solution for B2B customers"
      ],
      "unconventional_solutions": "Use B2B customer base to beta test mobile app features",
      "recommendation": "Explore hybrid B2B-mobile convergence"
    },
    "critical_stream": {
      "risk_assessment": {
        "pivot_risks": [
          "revenue loss",
          "team expertise mismatch",
          "market timing"
        ],
        "status_quo_risks": [
          "competitive displacement",
          "market saturation",
          "team motivation"
        ]
      },
      "assumption_challenges": [
        "Mobile app feedback may not translate to paying customers",
        "B2B growth stall might be temporary market condition"
      ],
      "recommendation": "Validate mobile monetization before full commitment"
    },
    "synthetic_stream": {
      "integrated_perspective": "The decision isn't binary pivot vs. stay. The optimal path leverages existing B2B relationships to validate and fund mobile development.",
      "holistic_solution": "Phased approach: 1) Develop mobile features for B2B customers 2) Test monetization models 3) Gradually expand to B2C based on learnings",
      "confidence": 0.78
    }
  },
  "coordination_insights": [
    "All streams agree on avoiding binary decision",
    "Creative and synthetic streams aligned on hybrid approach",
    "Critical stream's validation emphasis adopted by final recommendation"
  ],
  "final_synthesis": {
    "recommendation": "Pursue hybrid strategy with phased mobile development funded by B2B revenue",
    "rationale": "Minimizes risk while maximizing learning and optionality",
    "next_steps": [
      "Survey B2B customers about mobile needs",
      "Develop mobile MVP for enterprise use",
      "Test B2C monetization models"
    ]
  }
}
```

**When to Use:**

- Complex strategic decisions
- Need multiple perspectives
- High-stakes choices
- Creative problem-solving

## Problem Decomposition Tools

### decompose_problem - Complex Problem Breakdown

Breaks complex challenges into manageable, prioritized components with dependency mapping.

**Scenario**: You need to launch a new product in 6 months with limited resources.

**Tool Call:**

```json
{
  "tool": "decompose_problem",
  "arguments": {
    "input": "Launch new AI-powered project management tool in 6 months. Need to build MVP, acquire first 100 customers, establish support processes, and achieve $10k MRR. Team of 4 developers, $500k budget.",
    "max_depth": 3,
    "strategies": ["functional", "temporal", "resource"]
  }
}
```

**Expected Response:**

```json
{
  "problem_hierarchy": {
    "root_problem": "Launch AI project management tool (6 months, $10k MRR target)",
    "level_1_components": [
      {
        "id": "product_development",
        "title": "Product Development",
        "description": "Build and test MVP with core AI features",
        "priority": "critical",
        "estimated_effort": "4 months",
        "dependencies": []
      },
      {
        "id": "market_validation",
        "title": "Market Validation & Customer Acquisition",
        "description": "Validate product-market fit and acquire first 100 customers",
        "priority": "critical",
        "estimated_effort": "6 months",
        "dependencies": ["product_development"]
      },
      {
        "id": "business_operations",
        "title": "Business Operations Setup",
        "description": "Establish support, billing, and operational processes",
        "priority": "high",
        "estimated_effort": "2 months",
        "dependencies": ["product_development"]
      }
    ],
    "level_2_components": {
      "product_development": [
        {
          "id": "ai_engine",
          "title": "AI Engine Development",
          "description": "Core AI algorithms for project prediction and optimization",
          "priority": "critical",
          "estimated_effort": "3 months",
          "resource_requirements": ["2 ML engineers", "GPU infrastructure"]
        },
        {
          "id": "user_interface",
          "title": "User Interface",
          "description": "Intuitive dashboard and mobile-responsive design",
          "priority": "high",
          "estimated_effort": "2 months",
          "resource_requirements": ["1 frontend developer", "1 UX designer"]
        },
        {
          "id": "integration_apis",
          "title": "Integration APIs",
          "description": "Connect with popular tools (Slack, Jira, GitHub)",
          "priority": "medium",
          "estimated_effort": "1.5 months",
          "resource_requirements": ["1 backend developer"]
        }
      ]
    }
  },
  "dependency_analysis": {
    "critical_path": [
      "ai_engine → user_interface → beta_testing → customer_acquisition → revenue_generation"
    ],
    "bottlenecks": [
      {
        "component": "ai_engine",
        "reason": "Blocks all other development and testing",
        "mitigation": "Start with simpler ML models, iterate complexity"
      }
    ],
    "parallel_opportunities": [
      "UI development can start with mockups while AI engine is in progress",
      "Market research and customer interviews can run parallel to development"
    ]
  },
  "resource_allocation": {
    "team_assignments": {
      "ai_engine": ["developer_1", "developer_2"],
      "user_interface": ["developer_3"],
      "integration_apis": ["developer_4"],
      "market_validation": ["founder", "part_time_marketer"]
    },
    "budget_allocation": {
      "development": "$300k (60%)",
      "infrastructure": "$100k (20%)",
      "marketing": "$75k (15%)",
      "operations": "$25k (5%)"
    }
  },
  "risk_assessment": {
    "high_risk_components": [
      {
        "component": "ai_engine",
        "risks": ["technical complexity", "performance requirements"],
        "mitigation": "Prototype early, validate with simple models first"
      }
    ],
    "timeline_risks": [
      {
        "risk": "AI development delays",
        "probability": 0.6,
        "impact": "2-month delay",
        "mitigation": "Parallel development of non-AI features"
      }
    ]
  }
}
```

**When to Use:**

- Large, complex projects
- Resource planning needed
- Multiple dependencies
- Team coordination required

## Probabilistic Reasoning Tools

### think_probabilistic - Uncertainty and Evidence Integration

Processes problems using Bayesian reasoning with uncertainty quantification.

**Scenario**: You're evaluating whether to invest in a new technology for your company.

**Tool Call:**

```json
{
  "tool": "think_probabilistic",
  "arguments": {
    "input": "Should we adopt blockchain technology for our supply chain? Initial research suggests 40% cost reduction potential, but implementation would cost $2M and take 18 months. Some competitors are already using it successfully.",
    "enable_bayesian_updating": true,
    "max_hypotheses": 3,
    "uncertainty_threshold": 0.1
  }
}
```

**Expected Response:**

```json
{
  "hypotheses": [
    {
      "hypothesis": "Blockchain adoption will provide significant competitive advantage",
      "prior_probability": 0.3,
      "evidence_integration": [
        {
          "evidence": "Competitors showing success",
          "likelihood": 0.7,
          "weight": 0.8
        },
        {
          "evidence": "40% cost reduction potential",
          "likelihood": 0.6,
          "weight": 0.9
        },
        {
          "evidence": "High implementation cost and time",
          "likelihood": 0.9,
          "weight": 0.7
        }
      ],
      "posterior_probability": 0.52,
      "confidence_interval": [0.38, 0.66]
    },
    {
      "hypothesis": "Blockchain adoption will provide marginal benefits",
      "prior_probability": 0.5,
      "posterior_probability": 0.35,
      "confidence_interval": [0.22, 0.48]
    },
    {
      "hypothesis": "Blockchain adoption will be net negative",
      "prior_probability": 0.2,
      "posterior_probability": 0.13,
      "confidence_interval": [0.05, 0.25]
    }
  ],
  "uncertainty_analysis": {
    "key_uncertainties": [
      {
        "factor": "Actual cost reduction achievable",
        "uncertainty_level": 0.4,
        "impact_on_decision": "high"
      },
      {
        "factor": "Technology maturity and stability",
        "uncertainty_level": 0.3,
        "impact_on_decision": "medium"
      },
      {
        "factor": "Competitive response timing",
        "uncertainty_level": 0.6,
        "impact_on_decision": "medium"
      }
    ],
    "information_value": [
      {
        "information": "Pilot project results from similar company",
        "value_of_information": 0.8,
        "cost_to_obtain": "low"
      },
      {
        "information": "Detailed technical feasibility study",
        "value_of_information": 0.7,
        "cost_to_obtain": "medium"
      }
    ]
  },
  "decision_recommendation": {
    "recommended_action": "Conduct limited pilot project before full commitment",
    "reasoning": "52% probability of significant advantage justifies exploration, but high uncertainty suggests staged approach",
    "risk_mitigation": "Pilot reduces uncertainty while limiting downside exposure",
    "decision_confidence": 0.73
  },
  "bayesian_updates": {
    "if_pilot_succeeds": {
      "updated_probability": 0.78,
      "recommendation": "Proceed with full implementation"
    },
    "if_pilot_fails": {
      "updated_probability": 0.15,
      "recommendation": "Abandon blockchain approach"
    }
  }
}
```

**When to Use:**

- High-uncertainty decisions
- Multiple competing hypotheses
- Need for evidence integration
- Risk assessment scenarios

## Memory Management Tools

### analyze_memory_usage - Memory System Analysis

Analyzes memory usage patterns and identifies optimization opportunities.

**Tool Call:**

```json
{
  "tool": "analyze_memory_usage",
  "arguments": {
    "analysis_depth": "deep",
    "include_recommendations": true
  }
}
```

**Expected Response:**

```json
{
  "memory_overview": {
    "total_memories": 2847,
    "episodic_memories": 1203,
    "semantic_memories": 1644,
    "memory_health_score": 0.73,
    "storage_efficiency": 0.68
  },
  "usage_patterns": {
    "most_accessed_domains": [
      { "domain": "software-development", "access_count": 342 },
      { "domain": "project-management", "access_count": 198 },
      { "domain": "personal-productivity", "access_count": 156 }
    ],
    "least_accessed_memories": {
      "count": 847,
      "percentage": 29.8,
      "oldest_unused": "2023-08-15"
    },
    "memory_age_distribution": {
      "recent_7_days": 156,
      "last_month": 423,
      "last_quarter": 892,
      "older": 1376
    }
  },
  "optimization_opportunities": [
    {
      "type": "selective_forgetting",
      "description": "Archive 847 memories unused for 6+ months",
      "potential_benefit": "Improve retrieval speed by 23%",
      "risk_level": "low"
    },
    {
      "type": "memory_consolidation",
      "description": "Merge 156 similar semantic concepts",
      "potential_benefit": "Reduce storage by 12%, improve coherence",
      "risk_level": "medium"
    }
  ],
  "recommendations": [
    {
      "priority": "high",
      "action": "Enable automatic archiving of unused memories",
      "expected_impact": "Maintain optimal performance as memory grows"
    },
    {
      "priority": "medium",
      "action": "Increase consolidation frequency for active domains",
      "expected_impact": "Better knowledge integration and retrieval"
    }
  ]
}
```

### optimize_memory - Memory Optimization

Executes memory optimization through selective forgetting and consolidation.

**Tool Call:**

```json
{
  "tool": "optimize_memory",
  "arguments": {
    "optimization_mode": "moderate",
    "target_memory_reduction": 0.15,
    "preserve_important_memories": true,
    "require_user_consent": true
  }
}
```

**Expected Response:**

```json
{
  "optimization_plan": {
    "memories_to_archive": 427,
    "memories_to_consolidate": 89,
    "memories_to_delete": 12,
    "estimated_performance_gain": "18% faster retrieval",
    "estimated_storage_reduction": "15.2%"
  },
  "user_consent_required": [
    {
      "memory_id": "mem_12847",
      "content": "Meeting notes from Q2 planning session...",
      "reason": "High importance but old, confirm deletion",
      "recommendation": "archive"
    }
  ],
  "automatic_optimizations": [
    {
      "type": "consolidation",
      "description": "Merged 23 similar React development concepts",
      "impact": "Improved semantic coherence"
    }
  ]
}
```

### recover_memory - Memory Recovery

Attempts to recover degraded or forgotten memories using associative cues.

**Tool Call:**

```json
{
  "tool": "recover_memory",
  "arguments": {
    "memory_id": "mem_15234",
    "recovery_cues": [
      {
        "type": "semantic",
        "value": "database optimization performance",
        "strength": 0.8
      },
      {
        "type": "temporal",
        "value": "2024-03-15",
        "strength": 0.6
      },
      {
        "type": "emotional",
        "value": "frustration breakthrough",
        "strength": 0.7
      }
    ],
    "max_recovery_attempts": 5
  }
}
```

**Expected Response:**

```json
{
  "recovery_result": {
    "success": true,
    "confidence": 0.73,
    "recovered_content": "Discovered that adding composite index on (user_id, created_at) reduced query time from 2.3s to 0.12s. The breakthrough came after realizing the ORDER BY clause was causing full table scans.",
    "recovery_method": "associative_reconstruction",
    "supporting_memories": [
      "Database indexing best practices",
      "Query optimization techniques",
      "Performance debugging session notes"
    ]
  },
  "recovery_quality": {
    "completeness": 0.85,
    "accuracy_estimate": 0.78,
    "missing_elements": ["specific table names", "exact query syntax"]
  }
}
```

## Advanced Usage Patterns

### Combining Tools for Complex Analysis

**Scenario**: Strategic planning for product roadmap

```json
// Step 1: Decompose the planning challenge
{
  "tool": "decompose_problem",
  "arguments": {
    "input": "Plan product roadmap for next 18 months with 3 major features, limited engineering resources, and uncertain market conditions"
  }
}

// Step 2: Analyze each component systematically
{
  "tool": "analyze_systematically",
  "arguments": {
    "input": "Prioritize features based on customer value, technical complexity, and market timing"
  }
}

// Step 3: Use parallel reasoning for strategic decisions
{
  "tool": "think_parallel",
  "arguments": {
    "input": "Should we focus on enterprise features or consumer features first?"
  }
}

// Step 4: Apply probabilistic reasoning to uncertain outcomes
{
  "tool": "think_probabilistic",
  "arguments": {
    "input": "What's the probability each roadmap option will achieve our revenue targets?"
  }
}
```

### Memory-Enhanced Problem Solving

```json
// Step 1: Recall relevant experience
{
  "tool": "recall",
  "arguments": {
    "cue": "product roadmap planning challenges"
  }
}

// Step 2: Analyze with memory context
{
  "tool": "think_parallel",
  "arguments": {
    "input": "Current roadmap decision with context from past planning experiences"
  }
}

// Step 3: Store insights for future use
{
  "tool": "remember",
  "arguments": {
    "content": "Key lessons from roadmap planning process and outcomes"
  }
}
```

## Key Takeaways

### When to Use Advanced Tools

- **analyze_systematically**: Unfamiliar problems needing structure
- **think_parallel**: Complex decisions requiring multiple perspectives
- **decompose_problem**: Large projects with many dependencies
- **think_probabilistic**: High-uncertainty situations with evidence
- **Memory tools**: Long-term learning and optimization

### Tool Combinations

- **Systematic + Parallel**: Structure then explore perspectives
- **Decomposition + Probabilistic**: Break down then assess uncertainties
- **Memory + Any tool**: Leverage past experience for better decisions

### Best Practices

1. **Start simple**: Use basic tools before advanced ones
2. **Combine strategically**: Each tool adds specific value
3. **Consider context**: Match tool to problem characteristics
4. **Learn iteratively**: Build expertise through practice
5. **Optimize memory**: Regular maintenance improves performance

## Next Steps

- **[Complete Workflow](complete-workflow.md)** - See all tools working together
- **[Real-World Examples](../real-world/)** - Complex applications
- **[Integration Examples](../integration/)** - Implementation patterns

---

_Ready for comprehensive workflows? Check out [Complete Workflow](complete-workflow.md) to see all tools working together._
